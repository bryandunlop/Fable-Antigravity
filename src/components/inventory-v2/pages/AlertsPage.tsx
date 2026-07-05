import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Button } from '../../ui/button';
import { useInventoryV2 } from '../InventoryV2Context';
import { useNotificationFeed } from '../../../notifications/useNotificationFeed';
import type { FeedEntry, FeedSeverity } from '../../../notifications/types';

function SeverityBadge({ severity }: { severity: FeedSeverity }) {
  if (severity === 'critical') {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-600">Critical</span>;
  }
  if (severity === 'warn') {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-600">Warning</span>;
  }
  return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">Info</span>;
}

function AlertTable({
  entries,
  onClear,
}: {
  entries: FeedEntry[];
  onClear: (entry: FeedEntry) => void;
}) {
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Bell className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No alerts to show</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Title</th>
            <th className="pb-2 font-medium">Detail</th>
            <th className="pb-2 font-medium">Severity</th>
            <th className="pb-2 font-medium">When</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map(e => (
            <tr key={e.id}>
              <td className="py-2.5 font-medium">{e.title}</td>
              <td className="py-2.5 text-muted-foreground max-w-xs">{e.detail}</td>
              <td className="py-2.5"><SeverityBadge severity={e.severity} /></td>
              <td className="py-2.5 text-xs text-muted-foreground">
                {e.atUtc ? formatDistanceToNow(new Date(e.atUtc), { addSuffix: true }) : 'live'}
              </td>
              <td className="py-2.5">
                <div className="flex gap-2">
                  <Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => navigate(e.link)}>
                    View →
                  </Button>
                  <button
                    className="text-[11px] text-muted-foreground underline hover:text-foreground"
                    onClick={() => onClear(e)}
                  >
                    {e.kind === 'derived' ? 'dismiss' : 'mark read'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlertsPage() {
  const { state } = useInventoryV2();
  const { entries, markRead, dismiss } = useNotificationFeed(state.currentUser.role);

  const inventory = entries.filter(e => e.module === 'Inventory');
  const active = inventory.filter(e => e.kind === 'derived' || !e.isRead);
  const history = inventory.filter(e => e.kind === 'event' && e.isRead);

  const clear = (entry: FeedEntry) => {
    if (entry.kind === 'derived') dismiss(entry.id);
    else markRead(entry.id);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">My Alerts</h1>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {active.length > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {active.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <AlertTable entries={active} onClear={clear} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <AlertTable entries={history} onClear={clear} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
