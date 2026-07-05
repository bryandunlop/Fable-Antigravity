import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Shield,
  Wrench,
  Package,
  MapPin,
  FileText,
  RotateCcw,
  X,
} from 'lucide-react';
import { ClearSkiesSVG } from './ui/EmptyStateSVGs';
import { useNotificationFeed } from '../notifications/useNotificationFeed';
import type { FeedEntry, FeedSeverity } from '../notifications/types';

interface NotificationCenterProps {
  userRole: string;
  additionalRoles?: string[];
}

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Tech Log': Wrench,
  'Audit Management': Shield,
  'Safety Systems': AlertTriangle,
  'Inventory': Package,
  'Trip Coordination': MapPin,
  'Waiver Approval': FileText,
};

const SEVERITY_TEXT: Record<FeedSeverity, string> = {
  critical: 'text-red-500',
  warn: 'text-amber-500',
  info: 'text-blue-500',
};

const SEVERITY_BORDER: Record<FeedSeverity, string> = {
  critical: 'border-l-4 border-l-red-500',
  warn: 'border-l-4 border-l-amber-400',
  info: '',
};

const SEVERITY_BADGE: Record<FeedSeverity, string> = {
  critical: 'bg-red-500 text-white',
  warn: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
};

function timeAgo(atUtc?: string): string | null {
  if (!atUtc) return null;
  const diffMin = Math.floor((Date.now() - new Date(atUtc).getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function NotificationCenter({ userRole, additionalRoles }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [showDismissed, setShowDismissed] = useState(false);

  const { entries, dismissed, counts, refresh, markRead, markUnread, markAllRead, dismiss, restore } =
    useNotificationFeed(userRole, additionalRoles);

  const visible = entries.filter(e => {
    if (filter === 'unread') return e.kind === 'event' && !e.isRead;
    if (filter === 'critical') return e.severity === 'critical';
    return true;
  });

  const openEntry = (entry: FeedEntry) => {
    if (entry.kind === 'event' && !entry.isRead) markRead(entry.id);
    navigate(entry.link);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) refresh();
  };

  const renderRow = (entry: FeedEntry, last: boolean, inDismissedView: boolean) => {
    const Icon = MODULE_ICONS[entry.module] ?? Bell;
    const unreadEvent = entry.kind === 'event' && !entry.isRead;
    const ago = timeAgo(entry.atUtc);
    return (
      <div key={entry.id} className="group">
        <div
          className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${unreadEvent ? 'bg-blue-50/50' : ''} ${inDismissedView ? 'opacity-60' : SEVERITY_BORDER[entry.severity]}`}
          onClick={() => openEntry(entry)}
        >
          <div className="flex items-start gap-3">
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${SEVERITY_TEXT[entry.severity]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm ${unreadEvent ? 'font-medium' : 'font-normal'}`}>{entry.title}</p>
                    {unreadEvent && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                  </div>
                  {entry.detail && <p className="text-sm text-muted-foreground mb-2">{entry.detail}</p>}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs ${SEVERITY_BADGE[entry.severity]}`}>{entry.severity}</Badge>
                    <Badge variant="outline" className="text-xs">{entry.module}</Badge>
                    {ago && <span className="text-xs text-muted-foreground">{ago}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {inDismissedView ? (
                    <Button
                      variant="ghost" size="sm" className="p-1 h-auto" title="Restore"
                      onClick={e => { e.stopPropagation(); restore(entry.id); }}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  ) : entry.kind === 'derived' ? (
                    <Button
                      variant="ghost" size="sm" className="p-1 h-auto" title="Dismiss"
                      onClick={e => { e.stopPropagation(); dismiss(entry.id); }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  ) : entry.isRead ? (
                    <Button
                      variant="ghost" size="sm" className="p-1 h-auto" title="Mark as unread"
                      onClick={e => { e.stopPropagation(); markUnread(entry.id); }}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost" size="sm" className="p-1 h-auto" title="Mark as read"
                      onClick={e => { e.stopPropagation(); markRead(entry.id); }}
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {!last && <Separator />}
      </div>
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2 hover:bg-accent">
          <Bell className="w-5 h-5" />
          {counts.attention > 0 && (
            <Badge
              className={`absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs ${counts.critical > 0 ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}
            >
              {counts.attention > 99 ? '99+' : counts.attention}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" sideOffset={8}>
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <div className="flex items-center gap-2">
                {counts.unread > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs" title="Mark all events as read">
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} title="Close notifications">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {counts.critical > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {counts.critical} critical item{counts.critical !== 1 ? 's' : ''} requiring attention
                  </span>
                </div>
              </div>
            )}

            <Tabs value={filter} onValueChange={(value: string) => setFilter(value as 'all' | 'unread' | 'critical')} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="text-xs">All ({counts.total})</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">Unread ({counts.unread})</TabsTrigger>
                <TabsTrigger value="critical" className="text-xs">Critical ({counts.critical})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {showDismissed ? (
                dismissed.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">
                    <p className="text-sm">Nothing dismissed</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {dismissed.map((e, i) => renderRow(e, i === dismissed.length - 1, true))}
                  </div>
                )
              ) : visible.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center h-full animate-fade-in">
                  <ClearSkiesSVG size={80} className="mb-4 opacity-70" />
                  <p className="font-medium text-foreground">No notifications to display</p>
                  <p className="text-xs mt-1">
                    {filter === 'unread' ? 'All caught up!' : filter === 'critical' ? 'No critical items' : 'Check back later for updates'}
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {visible.map((e, i) => renderRow(e, i === visible.length - 1, false))}
                </div>
              )}
            </ScrollArea>
            <div className="border-t px-4 py-2">
              <button
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => setShowDismissed(v => !v)}
              >
                {showDismissed ? '← Back to feed' : `Dismissed (${dismissed.length})`}
              </button>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
