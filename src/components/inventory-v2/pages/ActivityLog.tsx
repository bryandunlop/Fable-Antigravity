import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ClipboardCheck, Package, Plane, FileText,
  ShoppingCart, AlertCircle, Settings, Filter, Search, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { formatRelativeTime, formatDate } from '../shared/dateUtils';
import { cn } from '../../ui/utils';
import type { ActivityLogEntry, ActivityModule } from '../types';
import { downloadCSV } from '../shared/exportUtils';

const MODULE_ICONS: Record<ActivityModule, React.ReactNode> = {
  inspection: <ClipboardCheck className="w-4 h-4" />,
  stockroom: <Package className="w-4 h-4" />,
  trip: <Plane className="w-4 h-4" />,
  request: <FileText className="w-4 h-4" />,
  commissary: <ShoppingCart className="w-4 h-4" />,
  system: <Settings className="w-4 h-4" />,
};

const MODULE_COLORS: Record<ActivityModule, string> = {
  inspection: 'text-blue-400 bg-blue-500/10',
  stockroom: 'text-emerald-400 bg-emerald-500/10',
  trip: 'text-amber-400 bg-amber-500/10',
  request: 'text-purple-400 bg-purple-500/10',
  commissary: 'text-orange-400 bg-orange-500/10',
  system: 'text-muted-foreground bg-muted',
};

const MODULES: ActivityModule[] = ['inspection', 'stockroom', 'trip', 'request', 'commissary', 'system'];

function groupByDate(entries: ActivityLogEntry[]): [string, ActivityLogEntry[]][] {
  const map = new Map<string, ActivityLogEntry[]>();
  for (const entry of entries) {
    const day = entry.timestamp.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(entry);
  }
  return [...map.entries()];
}

function formatDayHeader(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (iso === today.toISOString().slice(0, 10)) return 'Today';
  if (iso === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function ActivityLog() {
  const navigate = useNavigate();
  const { state } = useInventoryV2();

  const [moduleFilter, setModuleFilter] = useState<ActivityModule | 'all'>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [search, setSearch] = useState('');

  const users = useMemo(() => {
    const names = new Set(state.activityLog.map(e => e.userName));
    return [...names].sort();
  }, [state.activityLog]);

  const filtered = useMemo(() => {
    return state.activityLog.filter(e => {
      if (moduleFilter !== 'all' && e.module !== moduleFilter) return false;
      if (userFilter !== 'all' && e.userName !== userFilter) return false;
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [state.activityLog, moduleFilter, userFilter, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  function handleExport() {
    downloadCSV('activity-log.csv', ['Timestamp', 'User', 'Action', 'Module', 'Description'], filtered.map(e => [
      formatDate(e.timestamp),
      e.userName,
      e.action,
      e.module,
      e.description,
    ]));
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      <OfflineBanner />

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/inventory-v2/inspections')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <h1 className="text-2xl font-bold ml-2">Activity Log</h1>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} entries</span>
        <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModuleFilter('all')}
                className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors', moduleFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}
              >
                All
              </button>
              {MODULES.map(m => (
                <button
                  key={m}
                  onClick={() => setModuleFilter(m)}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors', moduleFilter === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search descriptions..."
                className="pl-9"
              />
            </div>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground"
            >
              <option value="all">All users</option>
              {users.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No activity matches your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, entries]) => (
            <div key={day}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {formatDayHeader(day)}
              </h2>
              <Card>
                <CardContent className="p-0 divide-y">
                  {entries.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', MODULE_COLORS[entry.module])}>
                        {MODULE_ICONS[entry.module]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{entry.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.userName} · {formatRelativeTime(entry.timestamp)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0 capitalize">
                        {entry.module}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
