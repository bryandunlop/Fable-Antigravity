import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Target, Bell, ChevronDown, ChevronRight, Plus, Search,
  LayoutList, Table as TableIcon, PlayCircle, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { ActionItem, NewItemForm } from './ActionItems/types';
import { CHECK_IN_CADENCE_OPTIONS } from './ActionItems/constants';
import { getCheckInCompliance } from './ActionItems/checkIn';
import {
  getDaysSinceLastReport, getProgressTrend, getStallState, getStallSummary,
  isTrendFlat, bySilenceDesc, groupForChase, getOwner, ChaseAxis, StallState,
} from './ActionItems/stall';
import NewItemDialog from './ActionItems/NewItemDialog';
import ChaseRunPanel from './ActionItems/ChaseRunPanel';
import { buildRunQueue } from './ActionItems/chaseRun';
import { CheckInCadence } from './ActionItems/types';
import { useActionItems } from '../contexts/ActionItemContext';

const EMPTY_NEW_ITEM_FORM: NewItemForm = {
  title: '', description: '', module: 'Flight Operations',
  priority: 'Medium', dueDate: '', sections: [''], checkInCadence: 'weekly',
};

const STATE_LABEL: Record<StallState, string> = {
  quiet: 'Quiet', moving: 'Moving', new: 'Just started', landed: 'Landed',
};

/**
 * Reported progress across successive check-ins. A flat line reads as stuck,
 * which a 75%-full progress bar never does.
 */
function Sparkline({ values, width = 44 }: { values: number[]; width?: number }) {
  if (values.length < 2) return <div style={{ width }} className="shrink-0" />;
  const height = 14;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const flat = max === min;
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = flat ? height / 2 : height - 2 - ((value - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" strokeWidth="1.5"
        className={flat ? 'stroke-muted-foreground' : 'stroke-green-500'} />
    </svg>
  );
}

/**
 * Rolling Action Items — the lead team's project tracker, sized for a VP's
 * admin holding twenty or more at once.
 *
 * The default view groups by OWNER rather than by project, because that is how
 * the work is actually done: one owner with three stalled projects is one
 * conversation, and a project-ranked list would make an admin start it three
 * times. The table view is the same set at maximum density, for sorting,
 * scanning and bulk edits.
 */
export default function RollingActionItems() {
  const {
    actionItems, addActionItem, updateActionItem, setCheckInCadence,
    nudge, nudgeMany, closeActionItem, reopenActionItem,
  } = useActionItems();

  const [view, setView] = useState<'chase' | 'table'>('chase');
  const [axis, setAxis] = useState<ChaseAxis>('owner');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<StallState | 'all'>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [newItemForm, setNewItemForm] = useState<NewItemForm>(EMPTY_NEW_ITEM_FORM);
  const [isCreating, setIsCreating] = useState(false);
  /** Non-null while a chase run is in progress — the snapshot it walks. */
  const [runQueue, setRunQueue] = useState<string[] | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const summary = getStallSummary(actionItems, today);

  const counts = actionItems.reduce((acc, item) => {
    const state = getStallState(item, today);
    acc[state] = (acc[state] ?? 0) + 1;
    return acc;
  }, {} as Record<StallState, number>);

  const term = search.trim().toLowerCase();
  const visible = actionItems.filter(item => {
    if (stateFilter !== 'all' && getStallState(item, today) !== stateFilter) return false;
    if (!term) return true;
    return (
      item.title.toLowerCase().includes(term) ||
      item.module.toLowerCase().includes(term) ||
      item.contributors.some(c => c.name.toLowerCase().includes(term))
    );
  });

  const groups = groupForChase(visible, today, axis);
  const rows = [...visible].sort(bySilenceDesc(today));
  const quietIds = actionItems.filter(item => getStallState(item, today) === 'quiet').map(item => item.id);

  const toggleGroup = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleRow = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllRows = () =>
    setSelected(prev => (prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id))));

  const chase = (ids: string[], who: string) => {
    if (!ids.length) return;
    nudgeMany(ids);
    toast.success(ids.length === 1 ? 'Nudge Sent' : `${ids.length} Nudges Sent`, {
      description: `${who} will see a status request on their task list.`,
    });
  };

  /** Move a person to the head of the contributor list — they become the owner. */
  const reassign = (id: string, personName: string) => {
    const item = actionItems.find(candidate => candidate.id === id);
    if (!item) return;

    const existing = item.contributors.find(c => c.name === personName);
    const incoming = existing ?? {
      id: `${id}-owner-${personName.replace(/\s+/g, '-').toLowerCase()}`,
      name: personName,
      role: 'Owner',
      avatar: personName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(),
    };

    updateActionItem(id, {
      contributors: [
        { ...incoming, role: 'Owner' },
        ...item.contributors.filter(c => c.name !== personName),
      ],
    });
    // Otherwise the new owner inherits a quiet project in silence and hears
    // nothing until the next check-in window — which is the failure the whole
    // surface exists to prevent. Handing it over IS the ask.
    nudge(id);
    toast.success('Reassigned', {
      description: `${personName} now owns "${item.title}" and has a status request on their task list.`,
    });
  };

  const closeProject = (id: string, reason: string) => {
    const item = actionItems.find(candidate => candidate.id === id);
    closeActionItem(id, reason, 'Lead Team');
    toast.success('Closed', {
      description: `"${item?.title ?? 'Project'}" closed at ${item?.progress ?? 0}% — ${reason}`,
      action: { label: 'Undo', onClick: () => reopenActionItem(id) },
    });
  };

  const reopen = (item: ActionItem) => {
    reopenActionItem(item.id);
    toast.success('Reopened', { description: `"${item.title}" is back on the board.` });
  };

  const slowCadence = (id: string, cadence: CheckInCadence) => {
    setCheckInCadence(id, cadence);
    toast.success('Cadence Slowed', { description: `Status reports now ${cadence}.` });
  };

  const handleCreate = () => {
    if (!newItemForm.title.trim() || !newItemForm.description.trim()) return;
    setIsCreating(true);
    addActionItem(newItemForm, 'Lead Team');
    setIsCreating(false);
    setShowAdd(false);
    setNewItemForm(EMPTY_NEW_ITEM_FORM);
    toast.success('Action Item Created', {
      description: 'It is on the Rolling list and on its owner’s Tasks & Action Items.',
    });
  };

  const filterChip = (value: StallState | 'all', label: string, count: number, tone?: string) => (
    <button
      key={value}
      onClick={() => setStateFilter(stateFilter === value ? 'all' : value)}
      className={`text-sm px-3 py-1 rounded-md border transition-colors ${
        stateFilter === value ? 'border-primary bg-primary/10 text-primary' : `border-border ${tone ?? 'text-muted-foreground'} hover:bg-muted`
      }`}
    >
      {label} {count}
    </button>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2">
            <Target className="w-6 h-6" />
            Rolling Action Items
          </h1>
          <p className="text-muted-foreground">
            {actionItems.length} projects, ranked by silence. Every item here is the same record its
            owner sees on their Tasks &amp; Action Items list.
          </p>
        </div>
        <div className="flex gap-2">
          {/* A list is a standing obligation; a run is a task you can finish. */}
          <Button
            variant="outline"
            disabled={quietIds.length === 0}
            onClick={() => setRunQueue(buildRunQueue(actionItems, today))}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start chase run ({quietIds.length})
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Action Item
          </Button>
        </div>
      </div>

      {runQueue ? (
        <ChaseRunPanel
          queue={runQueue}
          allItems={actionItems}
          today={today}
          onNudge={id => nudge(id)}
          onReassign={reassign}
          onSlowCadence={slowCadence}
          onClose={closeProject}
          onExit={() => setRunQueue(null)}
        />
      ) : (
      <>

      {/* Controls — one row, because at this density a header of metric tiles
          would push the first project below the fold. */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={`Search ${actionItems.length} projects, owners, modules…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setView('chase')}
            aria-pressed={view === 'chase'}
            className={`flex items-center gap-2 px-3 py-2 text-sm ${view === 'chase' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            <LayoutList className="w-4 h-4" />
            Chase list
          </button>
          <button
            onClick={() => setView('table')}
            aria-pressed={view === 'table'}
            className={`flex items-center gap-2 px-3 py-2 text-sm ${view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            <TableIcon className="w-4 h-4" />
            Table
          </button>
        </div>

        {view === 'chase' && (
          <Select value={axis} onValueChange={(value: string) => setAxis(value as ChaseAxis)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Group by owner</SelectItem>
              <SelectItem value="module">Group by module</SelectItem>
              <SelectItem value="status">Group by status</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          disabled={quietIds.length === 0}
          onClick={() => chase(quietIds, 'Every owner with a quiet project')}
        >
          <Bell className="w-4 h-4 mr-2" />
          Nudge all quiet ({quietIds.length})
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filterChip('quiet', 'Quiet', counts.quiet ?? 0, 'text-red-600')}
        {filterChip('moving', 'Moving', counts.moving ?? 0)}
        {filterChip('new', 'Just started', counts.new ?? 0)}
        {filterChip('landed', 'Landed', counts.landed ?? 0)}
        <span className="text-sm text-muted-foreground ml-2">
          {summary.reported} of {summary.owed} check-ins filed this cycle ({summary.rate}%)
          {summary.longestSilence > 0 && ` · worst silence ${summary.longestSilence}d`}
        </span>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Nothing matches</h3>
            <p className="text-muted-foreground">
              {actionItems.length === 0
                ? 'Add an action item to start tracking a project.'
                : 'Clear the search or the filter to see the rest.'}
            </p>
          </CardContent>
        </Card>
      ) : view === 'chase' ? (
        <div className="space-y-3">
          {groups.map(group => {
            const isCollapsed = collapsed[group.key];
            const groupQuietIds = group.items
              .filter(item => getStallState(item, today) === 'quiet')
              .map(item => item.id);

            return (
              <Card key={group.key} className={group.quietCount > 0 ? 'border-red-200' : ''}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 ${group.quietCount > 0 ? 'bg-red-50 dark:bg-red-950/30' : ''}`}
                >
                  <button
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.label}`}
                    className="text-muted-foreground"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <span className="font-medium flex-1 min-w-0 truncate">{group.label}</span>
                  {group.quietCount > 0 ? (
                    <span className="text-sm text-red-600 whitespace-nowrap">
                      {group.quietCount} quiet · worst {group.worstSilence}d
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {group.items.length} {group.items.length === 1 ? 'project' : 'projects'} · all reporting
                    </span>
                  )}
                  {groupQuietIds.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => chase(groupQuietIds, group.label)}>
                      <Bell className="w-4 h-4 mr-2" />
                      Nudge all
                    </Button>
                  )}
                </div>

                {!isCollapsed && (
                  <CardContent className="p-0 divide-y border-t">
                    {group.items.map(item => {
                      const silence = getDaysSinceLastReport(item, today) ?? 0;
                      const state = getStallState(item, today);
                      const nudged = item.checkIn?.lastNudgedOn;
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 pl-11">
                          <span className="flex-1 min-w-0 truncate text-sm">
                            {item.title}
                            {item.closure && (
                              <span className="text-muted-foreground"> · closed at {item.closure.progressAtClose}%: {item.closure.reason}</span>
                            )}
                          </span>
                          {axis !== 'owner' && (
                            <span className="text-sm text-muted-foreground w-32 truncate text-right">
                              {getOwner(item)?.name ?? '—'}
                            </span>
                          )}
                          <Sparkline values={getProgressTrend(item)} />
                          <span className="text-sm text-muted-foreground w-12 text-right">{item.progress}%</span>
                          <span
                            className={`text-sm w-14 text-right ${state === 'quiet' ? 'text-red-600' : 'text-muted-foreground'}`}
                          >
                            {state === 'landed' ? 'done' : silence === 0 ? 'today' : `${silence}d`}
                          </span>
                          {state === 'landed' ? (
                            <Button size="sm" variant="ghost" onClick={() => reopen(item)}>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Reopen
                            </Button>
                          ) : nudged ? (
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              <Bell className="w-3 h-3 mr-1" />
                              Nudged
                            </Badge>
                          ) : state === 'quiet' ? (
                            <Button size="sm" variant="ghost" onClick={() => { nudge(item.id); toast.success('Nudge Sent'); }}>
                              <Bell className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="w-9" />
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-b">
              <span className="text-sm text-primary flex-1">{selected.size} selected</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { chase([...selected], 'Their owners'); setSelected(new Set()); }}
              >
                <Bell className="w-4 h-4 mr-2" />
                Nudge
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            </div>
          )}
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="w-10 p-3">
                    <Checkbox
                      checked={selected.size > 0 && selected.size === rows.length}
                      onCheckedChange={toggleAllRows}
                      aria-label="Select all projects"
                    />
                  </th>
                  <th className="text-left font-medium p-3">Project</th>
                  <th className="text-left font-medium p-3 w-40">Owner</th>
                  <th className="text-left font-medium p-3 w-24">Silent</th>
                  <th className="text-left font-medium p-3 w-32">Trend</th>
                  <th className="text-left font-medium p-3 w-28">Cadence</th>
                  <th className="text-left font-medium p-3 w-24">Cycle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(item => {
                  const silence = getDaysSinceLastReport(item, today) ?? 0;
                  const state = getStallState(item, today);
                  const trend = getProgressTrend(item);
                  const compliance = getCheckInCompliance(item, today);
                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3">
                        <Checkbox
                          checked={selected.has(item.id)}
                          onCheckedChange={() => toggleRow(item.id)}
                          aria-label={`Select ${item.title}`}
                        />
                      </td>
                      <td className="p-3">
                        <div className="truncate max-w-[280px]">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.module}</div>
                      </td>
                      <td className="p-3 text-muted-foreground truncate">{getOwner(item)?.name ?? '—'}</td>
                      <td className={`p-3 ${state === 'quiet' ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {state === 'landed' ? '—' : silence === 0 ? 'today' : `${silence}d`}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Sparkline values={trend} width={36} />
                          <span className="text-muted-foreground">
                            {isTrendFlat(item) ? `flat ${item.progress}%` : `${trend[0]} → ${item.progress}%`}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{item.checkIn?.cadence ?? 'none'}</td>
                      <td className="p-3 text-muted-foreground">
                        {compliance ? `${compliance.reported}/${compliance.total}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      </>
      )}

      <NewItemDialog
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); setNewItemForm(EMPTY_NEW_ITEM_FORM); }}
        newItemForm={newItemForm}
        setNewItemForm={setNewItemForm}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />
    </div>
  );
}
