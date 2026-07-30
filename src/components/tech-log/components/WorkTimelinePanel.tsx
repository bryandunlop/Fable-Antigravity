import { useState } from 'react';
import { toast } from 'sonner';
import { History, Hourglass, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import type { StatusTagEvent, WorkCard, WorkCardStatusTag, WorkGapReason } from '../types';
import {
  GAP_REASON_LABELS, STATUS_TAG_LABELS, STATUS_TAG_ORDER,
  statusDurations, writeStatusTimeline,
} from '../engine/statusTags';
import { StatusHoursBar, segmentsFromStateHours } from './StatusHoursBar';

const pad = (n: number) => String(n).padStart(2, '0');
/** UTC ISO → the value a `datetime-local` input wants, in the viewer's own zone. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const NOTE_REQUIRED: WorkCardStatusTag[] = ['WAITING_PARTS', 'WAITING_OTHER'];

interface Row {
  key: string;                 // stable React key; NOT persisted
  tag: WorkCardStatusTag;
  localAt: string;             // raw input text — converted to UTC ISO at commit, never per keystroke
  note: string;
  gapReason: WorkGapReason;
  include: boolean;
  byOid: string;
  partsOrderId?: string;
}

let rowSeq = 0;
const nextKey = () => `row-${++rowSeq}`;

const toRows = (tags: StatusTagEvent[] | undefined, fallbackOid: string): Row[] =>
  (tags ?? []).map(t => ({
    key: nextKey(),
    tag: t.tag,
    localAt: toLocalInput(t.atUtc),
    note: t.note ?? '',
    gapReason: t.gapReason ?? 'END_OF_SHIFT',
    include: t.includeInTotals !== false,
    byOid: t.byOid || fallbackOid,
    partsOrderId: t.partsOrderId,
  }));

interface Props {
  card: WorkCard;
  canEdit: boolean;
  user: { oid: string; displayName?: string };
  nameOf: (oid: string) => string;
  onSave: (card: WorkCard) => void;
}

/**
 * D61's **primary** time-entry surface: an editable timeline a technician reconstructs after the
 * event or at end of shift. Bryan: *"they wont enter it time of and the system needs to be flexible
 * enough to allow this."* The one-tap chips elsewhere on this page are the convenience path.
 *
 * Available on a complied-with card too (D62) — the tech who signs the CRS at 0200 writes up the
 * day at 0900 — with every edit stamped into the card's time-edit trail below.
 */
export function WorkTimelinePanel({ card, canEdit, user, nameOf, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const durations = statusDurations(card, new Date().toISOString());
  const counted = Object.values(durations.hours).reduce((a, b) => a + b, 0);
  const audit = card.timeAudit ?? [];

  const begin = () => {
    setRows(toRows(card.statusTags, user.oid));
    setEditing(true);
  };
  const cancel = () => { setEditing(false); setRows([]); };

  const patch = (key: string, p: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));

  const addRow = () => {
    const last = rows[rows.length - 1];
    const base = last ? new Date(`${last.localAt}:00`) : new Date();
    if (last && !Number.isNaN(base.getTime())) base.setHours(base.getHours() + 1);
    setRows(rs => [...rs, {
      key: nextKey(),
      tag: rs.some(r => r.tag === 'IN_WORK') ? 'GAP' : 'IN_WORK',
      localAt: toLocalInput(base.toISOString()),
      note: '', gapReason: 'END_OF_SHIFT', include: true, byOid: user.oid,
    }]);
  };

  const save = () => {
    const events: StatusTagEvent[] = [];
    for (const r of rows) {
      const at = new Date(`${r.localAt}`);
      if (Number.isNaN(at.getTime())) return toast.error('One of the spans has no start time.');
      events.push({
        tag: r.tag,
        atUtc: at.toISOString(),
        byOid: r.byOid || user.oid,
        note: r.note.trim() || undefined,
        gapReason: r.tag === 'GAP' ? r.gapReason : undefined,
        includeInTotals: r.tag === 'GAP' ? r.include : undefined,
        partsOrderId: r.partsOrderId,
      });
    }
    const result = writeStatusTimeline(card, events, { oid: user.oid, name: user.displayName }, new Date().toISOString());
    if (!result.ok) return toast.error(result.error);
    onSave(result.card);
    setEditing(false);
    setRows([]);
    toast.success('Time history saved.');
  };

  const segments = segmentsFromStateHours(durations.hours);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2"><Hourglass className="h-4 w-4" /> Time attribution</span>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" onClick={begin}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> {card.statusTags?.length ? 'Edit timeline' : 'Enter the timeline'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{Math.round(counted * 10) / 10} h counted</Badge>
          {segments.filter(s => s.hours > 0).map(s => (
            <Badge key={s.key} variant="outline">{s.label} {s.hours} h</Badge>
          ))}
          {durations.excludedGapHours > 0 && (
            <Badge variant="outline" className="border-dashed">
              {durations.excludedGapHours} h excluded by the enterer
            </Badge>
          )}
          {durations.openTag && (
            <span className="text-xs text-muted-foreground">accruing now: {STATUS_TAG_LABELS[durations.openTag]}</span>
          )}
        </div>
        <StatusHoursBar segments={segments} />
        {!card.statusTags?.length && (
          <p className="text-xs text-muted-foreground">
            No time logged yet. This is normally written up after the event or at end of shift — not tapped as you go.
          </p>
        )}

        {!editing && (card.statusTags ?? []).length > 0 && (
          <div className="space-y-1 border-l-2 pl-3">
            {(card.statusTags ?? []).map((t, i) => (
              <div key={i} className="text-xs">
                <span className="tabular-nums text-muted-foreground">{new Date(t.atUtc).toLocaleString()} — </span>
                <span className="font-medium">{STATUS_TAG_LABELS[t.tag]}</span>
                {t.tag === 'GAP' && t.gapReason && (
                  <span className="text-muted-foreground"> · {GAP_REASON_LABELS[t.gapReason]}</span>
                )}
                {t.tag === 'GAP' && t.includeInTotals === false && (
                  <Badge variant="outline" className="ml-1.5 border-dashed text-[10px]">not counted</Badge>
                )}
                <span className="text-muted-foreground"> · {nameOf(t.byOid)}</span>
                {t.note && <div className="ml-4 italic text-muted-foreground">{t.note}</div>}
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              Reconstruct the spans — each row starts a state and runs until the next one.
              {card.status === 'COMPLETED' && ' This card is complied with; the edit is recorded below with your name against it.'}
            </p>
            {rows.map((r, i) => (
              <div key={r.key} className="grid grid-cols-1 gap-2 rounded-md border p-2 md:grid-cols-[1fr_200px_auto]">
                <div>
                  <Label className="text-xs" htmlFor={`tl-state-${r.key}`}>State</Label>
                  <Select value={r.tag} onValueChange={(v: string) => patch(r.key, { tag: v as WorkCardStatusTag })}>
                    <SelectTrigger id={`tl-state-${r.key}`} className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_TAG_ORDER.map(t => <SelectItem key={t} value={t}>{STATUS_TAG_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs" htmlFor={`tl-at-${r.key}`}>Started</Label>
                  <Input id={`tl-at-${r.key}`} type="datetime-local" className="mt-1 h-9"
                    value={r.localAt}
                    onChange={e => patch(r.key, { localAt: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <Button size="icon" variant="ghost" aria-label={`Remove span ${i + 1}`}
                    onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {r.tag === 'GAP' && (
                  <>
                    <div>
                      <Label className="text-xs" htmlFor={`tl-reason-${r.key}`}>Why was nobody working?</Label>
                      <Select value={r.gapReason} onValueChange={(v: string) => patch(r.key, { gapReason: v as WorkGapReason })}>
                        <SelectTrigger id={`tl-reason-${r.key}`} className="mt-1 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(GAP_REASON_LABELS) as WorkGapReason[]).map(g => (
                            <SelectItem key={g} value={g}>{GAP_REASON_LABELS[g]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end md:col-span-2">
                      <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs">
                        <Checkbox checked={r.include} onCheckedChange={(v: boolean | 'indeterminate') => patch(r.key, { include: v === true })} />
                        Count this gap in the totals
                      </label>
                    </div>
                  </>
                )}

                <div className="md:col-span-3">
                  <Label className="text-xs" htmlFor={`tl-note-${r.key}`}>
                    {NOTE_REQUIRED.includes(r.tag) ? 'Note (required)' : 'Note'}
                  </Label>
                  <Input id={`tl-note-${r.key}`} className="mt-1 h-9" value={r.note}
                    onChange={e => patch(r.key, { note: e.target.value })}
                    placeholder={
                      r.tag === 'WAITING_PARTS' ? 'What part, ordered from whom (the POO record)'
                        : r.tag === 'WAITING_OTHER' ? 'What is being waited on'
                          : r.tag === 'GAP' ? 'Optional — e.g. contract shop left Friday, no replacement crew'
                            : 'Optional context'
                    } />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={addRow}><Plus className="mr-1.5 h-4 w-4" /> Add span</Button>
              <Button size="sm" onClick={save}><Save className="mr-1.5 h-4 w-4" /> Save timeline</Button>
              <Button size="sm" variant="ghost" onClick={cancel}><X className="mr-1.5 h-4 w-4" /> Cancel</Button>
            </div>
          </div>
        )}

        {audit.length > 0 && (
          <details className="rounded-md border p-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              <History className="mr-1 inline h-3.5 w-3.5" />
              Time-history edits ({audit.length})
            </summary>
            <div className="mt-2 space-y-1">
              {audit.map((a, i) => (
                <div key={i} className="border-b py-1 text-xs text-muted-foreground last:border-0">
                  <div>
                    {/* The FROZEN name wins, exactly as Deferral.melTitle and
                        CrewActionCompliance.byName do (TL-16): this row is provenance on a card a
                        signed release points at, and a live Personnel join lets a rename — or a
                        tech leaving the roster — repaint who edited it. The old
                        `nameOf(a.byOid) || a.byName` could never reach the fallback, because
                        `nameOf` returns the raw oid on a miss rather than undefined, so the frozen
                        snapshot was unreachable code and the trail resolved live. */}
                    {a.byName ?? nameOf(a.byOid)} · {new Date(a.atUtc).toLocaleString()}
                    {a.afterCompletion && (
                      <Badge variant="outline" className="ml-1.5 text-[10px]">after the card was signed off</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 break-all font-mono text-[10px]">
                    <div>before: {a.before ?? '(no time history)'}</div>
                    <div>after: {a.after}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
