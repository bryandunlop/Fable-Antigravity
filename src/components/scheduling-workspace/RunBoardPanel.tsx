import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RefreshCw, AlertTriangle, Clock, ListChecks } from 'lucide-react';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import { evaluateTriggers } from '../../scheduling/engine';
import type { TaskInstance, TaskAction } from '../../scheduling/engine';
import {
  StatusBadge, AckBadge, TaskActionButtons, formatDueTime, urgencyTextClassName, type RowUrgency,
} from './taskRowHelpers';

interface RunBoardPanelProps {
  userRole: string;
}

function computeOfficeRunDate(nowIso: string, officeTzOffsetMinutes: number): string {
  const d = new Date(new Date(nowIso).getTime() + officeTzOffsetMinutes * 60000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function RunBoardPanel({ userRole }: RunBoardPanelProps) {
  const { service, store, tick, bump, nowUtc, officeTzOffsetMinutes } = useSchedulingWorkspace();
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const runDate = useMemo(
    () => computeOfficeRunDate(nowUtc(), officeTzOffsetMinutes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    store.listRecurringInstances(runDate).then((rows) => {
      if (cancelled) return;
      setInstances(rows);
      if (rows.length > 0) setHasGenerated(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [store, runDate, tick]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await service.generateRunBoard(nowUtc());
      setHasGenerated(true);
      bump();
    } finally {
      setGenerating(false);
    }
  }

  async function handleAction(instanceId: string, action: TaskAction) {
    await service.applyAction(instanceId, action, userRole, nowUtc());
    bump();
  }

  const triggers = useMemo(() => evaluateTriggers(instances, nowUtc()), [instances, nowUtc]);
  const urgencyFor = (inst: TaskInstance): RowUrgency => {
    if (inst.status === 'done' || inst.status === 'n_a') return 'settled';
    if (triggers.overdue.some((t) => t.id === inst.id)) return 'overdue';
    if (triggers.dueSoon.some((t) => t.id === inst.id)) return 'dueSoon';
    return 'upcoming';
  };

  const grouped = useMemo(() => {
    const byCategory = new Map<string, TaskInstance[]>();
    for (const inst of instances) {
      const list = byCategory.get(inst.category) ?? [];
      list.push(inst);
      byCategory.set(inst.category, list);
    }
    for (const list of byCategory.values()) list.sort((a, b) => a.order - b.order);
    return Array.from(byCategory.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [instances]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Run-board</CardTitle>
          <CardDescription>Recurring daily checklist for {runDate} (office-local)</CardDescription>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          {hasGenerated ? "Refresh today's run-board" : "Generate today's run-board"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Overdue</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-amber-500" /> Due soon (2h)</span>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : instances.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No run-board generated for today yet.</p>
            <p className="text-sm">Click "Generate today's run-board" to instantiate recurring tasks.</p>
          </div>
        ) : (
          grouped.map(([category, rows]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold capitalize text-foreground">{category.replace(/-/g, ' ')}</h3>
              <div className="space-y-2">
                {rows.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between gap-4 border rounded-md p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{inst.title}</span>
                        <StatusBadge status={inst.status} />
                        {inst.requiresAck && <AckBadge ackState={inst.ackState} />}
                      </div>
                      <div className={`text-xs mt-1 ${urgencyTextClassName(urgencyFor(inst))}`}>
                        Owner: {inst.ownerRole} · Due {formatDueTime(inst.dueAtUtc)}
                      </div>
                    </div>
                    <TaskActionButtons instance={inst} onAction={(a) => handleAction(inst.id, a)} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
