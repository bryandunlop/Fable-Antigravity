import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { useSchedulingWorkspace } from './SchedulingWorkspaceContext';
import { parseTemplate } from '../../scheduling/store';
import type {
  ChecklistTemplate, DueRule, Weekday, AppliesTo, AirportEndpoint, AirportMatch, ReTrigger,
} from '../../scheduling/engine';
import {
  DUE_RULE_KINDS, LEAF_KINDS, defaultDueRule, slugifyTaskId, bumpedTemplatePayload, publishTaskIds,
  draftFromDef, defFromDraft,
  type ConditionBuilder, type LeafCondition, type LeafKind, type DraftTask,
} from './templateEditor';

// ─── Due-rule fields ───────────────────────────────────────────────────────────────────────────

const WEEKDAYS: Weekday[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function DueRuleFields({ rule, onChange, triggerType, idPrefix }: {
  rule: DueRule;
  onChange: (r: DueRule) => void;
  triggerType: ChecklistTemplate['triggerType'];
  idPrefix: string;
}) {
  const kinds = DUE_RULE_KINDS.filter(k => k.scope === 'both' || k.scope === triggerType);
  const num = (v: string) => Math.max(0, Number(v) || 0);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[220px]">
        <Label htmlFor={`${idPrefix}-kind`} className="text-xs">Timing</Label>
        <Select value={rule.kind} onValueChange={(k: string) => onChange(defaultDueRule(k as DueRule['kind']))}>
          <SelectTrigger id={`${idPrefix}-kind`} className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {kinds.map(k => <SelectItem key={k.kind} value={k.kind}>{k.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {rule.kind === 'dayOfTimeLocal' && (
        <div><Label className="text-xs">Time (office local)</Label>
          <Input className="mt-1 w-28" type="time" value={rule.time} onChange={e => onChange({ ...rule, time: e.target.value })} /></div>
      )}
      {rule.kind === 'weekday' && (
        <>
          <div><Label className="text-xs">Day</Label>
            <Select value={rule.day} onValueChange={(d: string) => onChange({ ...rule, day: d as Weekday })}>
              <SelectTrigger className="mt-1 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{WEEKDAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Period</Label>
            <Select value={rule.period ?? 'AM'} onValueChange={(p: string) => onChange({ ...rule, period: p as 'AM' | 'PM' })}>
              <SelectTrigger className="mt-1 w-20"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="AM">AM</SelectItem><SelectItem value="PM">PM</SelectItem></SelectContent>
            </Select></div>
        </>
      )}
      {rule.kind === 'dayOfMonth' && (
        <>
          <div><Label className="text-xs">Day</Label>
            <Input className="mt-1 w-20" type="number" min={1} max={31} value={rule.day} onChange={e => onChange({ ...rule, day: num(e.target.value) })} /></div>
          <div><Label className="text-xs">When</Label>
            <Select value={rule.when} onValueChange={(w: string) => onChange({ ...rule, when: w as typeof rule.when })}>
              <SelectTrigger className="mt-1 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="before">before</SelectItem>
                <SelectItem value="onOrBefore">on or before</SelectItem>
                <SelectItem value="around">around</SelectItem>
              </SelectContent>
            </Select></div>
        </>
      )}
      {rule.kind === 'quarterWeek' && (
        <div><Label className="text-xs">Week of quarter</Label>
          <Input className="mt-1 w-20" type="number" min={1} max={13} value={rule.week} onChange={e => onChange({ ...rule, week: num(e.target.value) })} /></div>
      )}
      {rule.kind === 'annualDate' && (
        <>
          <div><Label className="text-xs">Month</Label>
            <Input className="mt-1 w-20" type="number" min={1} max={12} value={rule.month} onChange={e => onChange({ ...rule, month: num(e.target.value) })} /></div>
          <div><Label className="text-xs">Day</Label>
            <Input className="mt-1 w-20" type="number" min={1} max={31} value={rule.day} onChange={e => onChange({ ...rule, day: num(e.target.value) })} /></div>
        </>
      )}
      {rule.kind === 'hoursBeforeEtd' && (
        <div><Label className="text-xs">Hours</Label>
          <Input className="mt-1 w-24" type="number" min={0} value={rule.hours} onChange={e => onChange({ ...rule, hours: num(e.target.value) })} /></div>
      )}
      {rule.kind === 'businessDaysBeforeEtd' && (
        <div><Label className="text-xs">Business days</Label>
          <Input className="mt-1 w-24" type="number" min={0} value={rule.days} onChange={e => onChange({ ...rule, days: num(e.target.value) })} /></div>
      )}
      {rule.kind === 'monthsBeforeEtd' && (
        <div><Label className="text-xs">Months</Label>
          <Input className="mt-1 w-24" type="number" min={0} value={rule.months} onChange={e => onChange({ ...rule, months: num(e.target.value) })} /></div>
      )}
    </div>
  );
}

// ─── Condition fields (per-trip templates only) ────────────────────────────────────────────────

function ConditionFields({ builder, onChange }: { builder: ConditionBuilder; onChange: (b: ConditionBuilder) => void }) {
  if (builder.mode === 'custom') {
    return (
      <p className="text-xs text-muted-foreground border rounded-md p-2">
        This task carries a nested custom condition the form editor can't represent — it is preserved
        unchanged on publish. <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onChange({ mode: 'always' })}>Replace with a new condition</Button>
      </p>
    );
  }
  const leaves = builder.mode === 'always' ? [] : builder.leaves;
  const mode = builder.mode === 'always' ? 'allOf' : builder.mode;

  const setLeaves = (next: LeafCondition[], nextMode: 'allOf' | 'anyOf' = mode) =>
    onChange(next.length === 0 ? { mode: 'always' } : { mode: nextMode, leaves: next });
  const updateLeaf = (i: number, patch: Partial<LeafCondition>) =>
    setLeaves(leaves.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Applies when</Label>
        {leaves.length > 1 && (
          <Select value={mode} onValueChange={(m: string) => setLeaves(leaves, m as 'allOf' | 'anyOf')}>
            <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="allOf">ALL of these</SelectItem>
              <SelectItem value="anyOf">ANY of these</SelectItem>
            </SelectContent>
          </Select>
        )}
        {leaves.length === 0 && <span className="text-xs text-muted-foreground">always (every trip of this type)</span>}
      </div>
      {leaves.map((leaf, i) => {
        const meta = LEAF_KINDS.find(k => k.kind === leaf.kind)!;
        return (
          <div key={i} className="flex flex-wrap items-center gap-2 border rounded-md p-2">
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <Checkbox checked={leaf.negate} onCheckedChange={(v: boolean | 'indeterminate') => updateLeaf(i, { negate: v === true })} /> NOT
            </label>
            <Select value={leaf.kind} onValueChange={(k: string) => updateLeaf(i, { kind: k as LeafKind, value: k === 'tripType' ? 'international' : '' })}>
              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAF_KINDS.map(k => <SelectItem key={k.kind} value={k.kind}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {meta.param === 'tripType' && (
              <Select value={leaf.value || 'international'} onValueChange={(v: string) => updateLeaf(i, { value: v })}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="domestic">domestic</SelectItem>
                  <SelectItem value="international">international</SelectItem>
                  <SelectItem value="dca_dassp">DCA/DASSP</SelectItem>
                </SelectContent>
              </Select>
            )}
            {meta.param === 'number' && (
              <Input className="h-8 w-24 text-xs" type="number" min={0} placeholder={meta.paramLabel} value={leaf.value}
                onChange={e => updateLeaf(i, { value: e.target.value })} />
            )}
            {meta.param === 'text' && (
              <Input className="h-8 w-40 text-xs" placeholder={meta.paramLabel} value={leaf.value}
                onChange={e => updateLeaf(i, { value: e.target.value })} />
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2" onClick={() => setLeaves(leaves.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setLeaves([...leaves, { kind: 'tripType', value: 'international', negate: false }])}>
        <Plus className="h-3 w-3 mr-1" /> Add condition
      </Button>
    </div>
  );
}

// ─── Per-airport + re-flag fields (per-trip templates only) ──────────────────────────────────────

const RE_TRIGGERS: { value: ReTrigger; label: string }[] = [
  { value: 'legScheduleChange', label: 'Leg date/time change' },
  { value: 'aircraftChange', label: 'Aircraft change' },
  { value: 'passengerChange', label: 'Passenger added' },
];

function PerAirportReflagFields({ appliesTo, reTriggerOn, onChange }: {
  appliesTo?: AppliesTo;
  reTriggerOn: ReTrigger[];
  onChange: (patch: { appliesTo?: AppliesTo; reTriggerOn?: ReTrigger[] }) => void;
}) {
  const endpoint: AirportEndpoint = appliesTo?.endpoint ?? 'both';
  const prefixExcept = (m: AirportMatch): string[] => (m.kind === 'prefix' ? m.except ?? [] : []);
  const setMatch = (airport: AirportMatch) => onChange({ appliesTo: { endpoint, airport } });

  return (
    <div className="space-y-2 border rounded-md p-2">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-xs">Applies to</Label>
        <Select
          value={appliesTo ? 'perAirport' : 'trip'}
          onValueChange={(v: string) => onChange({ appliesTo: v === 'perAirport' ? { endpoint: 'both', airport: { kind: 'exact', icao: '' } } : undefined })}
        >
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="trip">Whole trip (one item)</SelectItem>
            <SelectItem value="perAirport">Per airport (each leg)</SelectItem>
          </SelectContent>
        </Select>
        {appliesTo && (
          <>
            <Select value={endpoint} onValueChange={(e: string) => onChange({ appliesTo: { endpoint: e as AirportEndpoint, airport: appliesTo.airport } })}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="departure">Departure</SelectItem>
                <SelectItem value="arrival">Arrival</SelectItem>
                <SelectItem value="both">Dep + Arr</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={appliesTo.airport.kind}
              onValueChange={(k: string) => setMatch(k === 'exact' ? { kind: 'exact', icao: '' } : { kind: 'prefix', prefix: '' })}
            >
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exact ICAO</SelectItem>
                <SelectItem value="prefix">ICAO prefix</SelectItem>
              </SelectContent>
            </Select>
            {appliesTo.airport.kind === 'exact' ? (
              <Input className="h-8 w-28 text-xs" placeholder="KBOS" value={appliesTo.airport.icao}
                onChange={(e) => setMatch({ kind: 'exact', icao: e.target.value.toUpperCase() })} />
            ) : (
              <>
                <Input className="h-8 w-20 text-xs" placeholder="K" value={appliesTo.airport.prefix}
                  onChange={(e) => setMatch({ kind: 'prefix', prefix: e.target.value.toUpperCase(), ...(prefixExcept(appliesTo.airport).length ? { except: prefixExcept(appliesTo.airport) } : {}) })} />
                <Input className="h-8 w-40 text-xs" placeholder="except (KLUK, …)"
                  value={prefixExcept(appliesTo.airport).join(', ')}
                  onChange={(e) => {
                    const except = e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
                    const prefix = appliesTo.airport.kind === 'prefix' ? appliesTo.airport.prefix : '';
                    setMatch({ kind: 'prefix', prefix, ...(except.length ? { except } : {}) });
                  }} />
              </>
            )}
          </>
        )}
      </div>
      <div>
        <Label className="text-xs">Re-flag a completed item when</Label>
        <div className="flex flex-wrap gap-3 mt-1">
          {RE_TRIGGERS.map((rt) => (
            <label key={rt.value} className="flex items-center gap-1.5 text-xs">
              <Checkbox
                checked={reTriggerOn.includes(rt.value)}
                onCheckedChange={(v: boolean | 'indeterminate') => onChange({ reTriggerOn: v === true ? [...reTriggerOn, rt.value] : reTriggerOn.filter((x) => x !== rt.value) })}
              />
              {rt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── The editor dialog ─────────────────────────────────────────────────────────────────────────

/**
 * No-code checklist editor: add/remove/reorder items, set timing (DueRule), triggers (Condition),
 * owner, ack, handoff, and escalation — all as form controls. Publishing writes a NEW template
 * version through parseTemplate; in-flight trips keep the version they were opened under (the
 * engine pins templateVersion at instantiation) and new trips pick up the change.
 */
export function TemplateEditorDialog({
  template,
  open,
  onOpenChange,
}: {
  template: ChecklistTemplate;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { store, bump } = useSchedulingWorkspace();
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTasks(template.taskDefinitions.slice().sort((a, b) => a.order - b.order).map(draftFromDef));
      setError(null);
    }
  }, [open, template]);

  const update = (i: number, patch: Partial<DraftTask>) =>
    setTasks(prev => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const move = (i: number, dir: -1 | 1) =>
    setTasks(prev => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const remove = (i: number) => setTasks(prev => prev.filter((_, j) => j !== i));
  const addTask = () =>
    setTasks(prev => [...prev, {
      id: slugifyTaskId('new task', new Set(prev.map(t => t.id))),
      title: '', description: '', ownerRole: 'scheduling', category: 'ops', requiresAck: false,
      dueRule: defaultDueRule(template.triggerType === 'per_trip' ? 'hoursBeforeEtd' : 'dayOfTimeLocal'),
      condition: { mode: 'always' },
      handoffEnabled: false, handoffKind: 'role', handoffValue: '', handoffChannel: 'inbox',
      escalationEnabled: false, escalationDeadline: defaultDueRule('dayOfTimeLocal'),
      escalationNotifyRole: 'scheduling', escalationReason: '',
      appliesTo: undefined, reTriggerOn: [],
    }]);

  async function handlePublish() {
    setError(null);
    if (tasks.length === 0) return setError('A checklist needs at least one item.');
    if (tasks.some(t => !t.title.trim())) return setError('Every item needs a title.');
    setSaving(true);
    try {
      // New tasks get an id from their final title; existing ids are stable across versions,
      // and are reserved up front so a reordered new task can never collide with one.
      const ids = publishTaskIds(tasks);
      const defs = tasks.map((t, i) => defFromDraft({ ...t, id: ids[i] }, i + 1));
      const next = parseTemplate(bumpedTemplatePayload(template, defs));
      await store.saveTemplate(next);
      bump();
      toast.success(`Published ${template.name} v${next.version} — new trips use it; in-flight trips keep v${template.version}.`);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit checklist — {template.name}</DialogTitle>
          <DialogDescription>
            Publishing creates <strong>v{template.version + 1}</strong>. Trips already opened keep v{template.version}
            {' '}(their checklists are pinned); new {template.triggerType === 'per_trip' ? 'trips' : 'run-board days'} pick up the change. No code involved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {tasks.map((t, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === tasks.length - 1} onClick={() => move(i, 1)} title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground w-5">{i + 1}.</span>
                    <Input placeholder="Item title" value={t.title} onChange={e => update(i, { title: e.target.value })} />
                    <Button variant="ghost" size="sm" onClick={() => remove(i)} title="Remove item"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <Input placeholder="Description (optional)" value={t.description} onChange={e => update(i, { description: e.target.value })} />
                  <div className="flex flex-wrap items-end gap-3">
                    <div><Label className="text-xs">Owner role</Label>
                      <Input className="mt-1 w-36" value={t.ownerRole} onChange={e => update(i, { ownerRole: e.target.value })} /></div>
                    <div><Label className="text-xs">Category</Label>
                      <Input className="mt-1 w-32" value={t.category} onChange={e => update(i, { category: e.target.value })} /></div>
                    <label className="flex items-center gap-2 pb-2 text-sm">
                      <Checkbox checked={t.requiresAck} onCheckedChange={(v: boolean | 'indeterminate') => update(i, { requiresAck: v === true })} />
                      Requires acknowledgement
                    </label>
                  </div>
                  <DueRuleFields rule={t.dueRule} onChange={r => update(i, { dueRule: r })} triggerType={template.triggerType} idPrefix={`task-${i}`} />

                  {template.triggerType === 'per_trip' && (
                    <ConditionFields builder={t.condition} onChange={b => update(i, { condition: b })} />
                  )}
                  {template.triggerType === 'per_trip' && (
                    <PerAirportReflagFields
                      appliesTo={t.appliesTo}
                      reTriggerOn={t.reTriggerOn}
                      onChange={(patch) => update(i, patch)}
                    />
                  )}

                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={t.handoffEnabled} onCheckedChange={(v: boolean | 'indeterminate') => update(i, { handoffEnabled: v === true })} />
                      Hands off on completion
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={t.escalationEnabled} onCheckedChange={(v: boolean | 'indeterminate') => update(i, { escalationEnabled: v === true })} />
                      Escalate if unacknowledged
                    </label>
                  </div>
                  {t.handoffEnabled && (
                    <div className="flex flex-wrap items-end gap-2 border rounded-md p-2">
                      <Select value={t.handoffKind} onValueChange={(k: string) => update(i, { handoffKind: k as DraftTask['handoffKind'] })}>
                        <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="role">role</SelectItem><SelectItem value="dept">dept</SelectItem><SelectItem value="person">person</SelectItem></SelectContent>
                      </Select>
                      <Input className="h-8 w-44 text-xs" placeholder="target, e.g. pilot" value={t.handoffValue} onChange={e => update(i, { handoffValue: e.target.value })} />
                      <Select value={t.handoffChannel} onValueChange={(c: string) => update(i, { handoffChannel: c as DraftTask['handoffChannel'] })}>
                        <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="inbox">inbox</SelectItem><SelectItem value="teams">teams</SelectItem><SelectItem value="email">email</SelectItem></SelectContent>
                      </Select>
                    </div>
                  )}
                  {t.escalationEnabled && (
                    <div className="space-y-2 border rounded-md p-2">
                      <DueRuleFields rule={t.escalationDeadline} onChange={r => update(i, { escalationDeadline: r })} triggerType={template.triggerType} idPrefix={`esc-${i}`} />
                      <div className="flex flex-wrap items-end gap-2">
                        <div><Label className="text-xs">Notify role</Label>
                          <Input className="mt-1 h-8 w-36 text-xs" value={t.escalationNotifyRole} onChange={e => update(i, { escalationNotifyRole: e.target.value })} /></div>
                        <div className="flex-1 min-w-[200px]"><Label className="text-xs">Reason (shown in the escalation event)</Label>
                          <Input className="mt-1 h-8 text-xs" value={t.escalationReason} onChange={e => update(i, { escalationReason: e.target.value })} /></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addTask}><Plus className="h-4 w-4 mr-2" /> Add item</Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Separator />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePublish} disabled={saving}>
            {saving ? 'Publishing…' : `Publish v${template.version + 1}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
