import { Fragment, useState } from 'react';
import {
  Undo2, Check, Eye, EyeOff, Globe, Lightbulb, Lock, Plus, Send, ShieldCheck, Trash2,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import { GfoPanel } from '../../gfo';
import type { Personnel } from '../../tech-log/types';
import type { FirAction } from '../reducer';
import type { FirImpactSnapshot, FirPublishedDraft, FirTimelineEntry, FlightIrregularityReport } from '../types';
import { StatusHoursBar, type BarSegment } from '../../tech-log/components/StatusHoursBar';
import { isDraftComplete } from '../engine/lifecycle';
import { applyRedaction, detectNames, hasUnredactedRosterNames } from '../engine/redaction';

const EMPTY_DRAFT: FirPublishedDraft = { summary: '', whatHappened: '', timeline: [], lessons: [], ackLevel: 'none' };

interface Props {
  fir: FlightIrregularityReport;
  viewer: { oid: string; roles: string[] };
  leadership: boolean;
  personnel: Personnel[];
  timeline: FirTimelineEntry[]; // merged SYSTEM + MANUAL (internal), source for the curated subset
  /** D63 — evaluated at the instant of approval, never earlier: a revision must carry the figures
   *  that were true when it was approved, not the ones showing when curation started. */
  impactSnapshot: () => FirImpactSnapshot;
  /** The live bar, for the curator's preview of what "include the bar" will publish. */
  barSegments: BarSegment[];
  user?: { oid: string; displayName?: string };
  nameOf: (oid?: string, fallback?: string) => string;
  dispatch: React.Dispatch<FirAction>;
  onViewPublished: () => void;
}

/** Split internal prose around detected names, highlighting them so the curator sees
 * exactly what must become a role in the published copy. */
function Highlighted({ text, personnel }: { text: string; personnel: Personnel[] }) {
  if (!text) return <span className="text-muted-foreground">No internal narrative yet.</span>;
  const hits = detectNames(text, personnel);
  if (!hits.length) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let cursor = 0;
  hits.forEach((h, i) => {
    const at = text.indexOf(h.text, cursor);
    if (at < 0) return;
    if (at > cursor) out.push(<Fragment key={`t${i}`}>{text.slice(cursor, at)}</Fragment>);
    out.push(
      <mark key={`m${i}`} className="rounded-sm bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200">
        {h.text}
      </mark>,
    );
    cursor = at + h.text.length;
  });
  out.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  return <>{out}</>;
}

export function PublishTab({ fir, viewer, leadership, personnel, timeline, impactSnapshot, barSegments, user, nameOf, dispatch, onViewPublished }: Props) {
  const draft = fir.pendingPublished ?? EMPTY_DRAFT;
  const patch = (p: Partial<FirPublishedDraft>) =>
    dispatch({ type: 'UPDATE_PUBLISHED_DRAFT', payload: { firId: fir.id, draft: { ...draft, ...p } } });

  const [note, setNote] = useState('');
  const [lesson, setLesson] = useState('');

  const combined = `${draft.summary}\n${draft.whatHappened}`;
  const nameHits = detectNames(combined, personnel);
  const rosterNamesRemain = hasUnredactedRosterNames(combined, personnel);
  const complete = isDraftComplete(draft);

  const replaceName = (name: string, phrase: string) =>
    patch({ summary: applyRedaction(draft.summary, name, phrase), whatHappened: applyRedaction(draft.whatHappened, name, phrase) });

  const toggleTimeline = (e: FirTimelineEntry) => {
    const on = draft.timeline.some(t => t.atUtc === e.atUtc && t.label === e.label);
    patch({
      timeline: on
        ? draft.timeline.filter(t => !(t.atUtc === e.atUtc && t.label === e.label))
        : [...draft.timeline, { atUtc: e.atUtc, label: e.label }].sort((a, b) => a.atUtc.localeCompare(b.atUtc)),
    });
  };
  const timelinePicked = (e: FirTimelineEntry) => draft.timeline.some(t => t.atUtc === e.atUtc && t.label === e.label);

  // ── PUBLISHED ────────────────────────────────────────────────────────────
  if (fir.status === 'PUBLISHED' && fir.publishedRevision) {
    const rev = fir.publishedRevision;
    return (
      <GfoPanel title="Published">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" /> Revision {rev.revision} · approved by {nameOf(rev.approvedByOid)} · {new Date(rev.publishedAtUtc).toLocaleString()}
        </div>
        <p className="mt-3 text-sm">{rev.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onViewPublished}><Eye className="mr-1.5 h-4 w-4" /> View public version</Button>
          {leadership && (
            <Button size="sm" variant="outline" onClick={() => user && dispatch({ type: 'REOPEN_FIR', payload: { firId: fir.id, byOid: user.oid, byName: user.displayName, byRoles: viewer.roles, atUtc: new Date().toISOString() } })}>
              <Undo2 className="mr-1.5 h-4 w-4" /> Reopen for a new revision
            </Button>
          )}
        </div>
      </GfoPanel>
    );
  }

  // ── CLOSED_INTERNAL ──────────────────────────────────────────────────────
  if (fir.status === 'CLOSED_INTERNAL') {
    return (
      <GfoPanel title="Closed internal">
        <p className="text-sm text-muted-foreground">This report is retained for leadership and was not published company-wide.</p>
        {leadership && (
          <Button size="sm" variant="outline" className="mt-3" onClick={() => user && dispatch({ type: 'REOPEN_FIR', payload: { firId: fir.id, byOid: user.oid, byName: user.displayName, byRoles: viewer.roles, atUtc: new Date().toISOString() } })}>
            <Undo2 className="mr-1.5 h-4 w-4" /> Reopen
          </Button>
        )}
      </GfoPanel>
    );
  }

  // ── IN_REVIEW ────────────────────────────────────────────────────────────
  if (fir.status === 'IN_REVIEW') {
    const isReviewer = leadership && viewer.oid !== fir.reviewSubmittedByOid;
    const decide = (type: 'APPROVE_PUBLISH' | 'REQUEST_CHANGES') => {
      if (!user) return;
      const base = { firId: fir.id, byOid: user.oid, byName: user.displayName, byRoles: viewer.roles, atUtc: new Date().toISOString() };
      if (type === 'APPROVE_PUBLISH') dispatch({ type, payload: { ...base, impactSnapshot: impactSnapshot() } });
      else dispatch({ type, payload: { ...base, note } });
      setNote('');
    };
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          In review — submitted by {nameOf(fir.reviewSubmittedByOid)}.{' '}
          {isReviewer ? 'You are reviewing; the author cannot self-approve.' : 'Awaiting a leadership approver other than the submitter.'}
        </div>
        <PublishedPreview draft={draft} barSegments={barSegments} />
        {isReviewer && (
          <GfoPanel title="Confirm before publishing">
            <ul className="mb-3 space-y-1.5 text-sm">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> No individual is named — roles only throughout</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> No protected safety-report content pulled in (link-only boundary)</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Reads fairly — not a blame narrative</li>
            </ul>
            <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Note to the owner (required if requesting changes)" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => decide('APPROVE_PUBLISH')}><Check className="mr-1.5 h-4 w-4" /> Approve and publish</Button>
              <Button size="sm" variant="outline" onClick={() => decide('REQUEST_CHANGES')} disabled={!note.trim()}>
                <Undo2 className="mr-1.5 h-4 w-4" /> Request changes
              </Button>
            </div>
          </GfoPanel>
        )}
      </div>
    );
  }

  // ── OPEN: curation editor ────────────────────────────────────────────────
  const submit = () => {
    if (!user || !complete) return;
    dispatch({ type: 'SUBMIT_FOR_REVIEW', payload: { firId: fir.id, byOid: user.oid, byName: user.displayName, atUtc: new Date().toISOString() } });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Curate the internal report into a roles-only version for all employees. Names are stripped here; a separate leadership reviewer confirms it before it publishes.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Acknowledgement</span>
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            {(['none', 'initials'] as const).map(lvl => (
              <button key={lvl} type="button" onClick={() => patch({ ackLevel: lvl })}
                className={`px-3 py-1.5 text-sm ${draft.ackLevel === lvl ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                {lvl === 'none' ? 'None' : 'Initials'}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={submit} disabled={!complete} title={!complete ? 'Add a summary and what-happened first' : undefined}>
            <Send className="mr-1.5 h-4 w-4" /> Submit for review
          </Button>
        </div>
      </div>

      {nameHits.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/40 dark:bg-amber-500/10">
          <EyeOff className="h-4 w-4 text-amber-700 dark:text-amber-300" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            {nameHits.length} name{nameHits.length === 1 ? '' : 's'} in the draft — replace with roles
          </span>
          {nameHits.map((h, i) => (
            <button key={i} type="button" onClick={() => replaceName(h.text, h.suggestion)}
              className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-200"
              title={h.source === 'HEURISTIC' ? 'Possible name (not on roster) — review' : undefined}>
              {h.text} → {h.suggestion}{h.source === 'HEURISTIC' ? ' ?' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GfoPanel title="Internal (source)" className="bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><Lock className="h-3 w-3" /> names visible</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed"><Highlighted text={fir.narrative} personnel={personnel} /></p>
          {fir.impact.costNote && <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">Impact: {fir.impact.costNote}</p>}
          {fir.narrative && (
            <Button size="sm" variant="ghost" className="mt-2 h-7 px-2 text-xs" onClick={() => patch({ whatHappened: draft.whatHappened || fir.narrative })}>
              Copy as starting point →
            </Button>
          )}
        </GfoPanel>

        <div className="space-y-3 rounded-xl border border-primary/30 bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-primary"><Globe className="h-3 w-3" /> published draft · roles only</div>
          <div>
            <Label htmlFor="pub-summary" className="text-xs">Summary</Label>
            <Textarea id="pub-summary" rows={2} className="mt-1" value={draft.summary}
              onChange={e => patch({ summary: e.target.value })}
              placeholder="One-line what and outcome — no names, no tail number." />
          </div>
          <div>
            <Label htmlFor="pub-what" className="text-xs">What happened</Label>
            <Textarea id="pub-what" rows={6} className="mt-1" value={draft.whatHappened}
              onChange={e => patch({ whatHappened: e.target.value })}
              placeholder="The account in roles only — the PIC, the assigned technician, the vendor's AOG desk." />
          </div>
        </div>
      </div>

      <GfoPanel title="Curated timeline">
        <p className="mb-2 text-xs text-muted-foreground">Pick what publishes — times and labels only, no names.</p>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline entries to curate yet.</p>
        ) : (
          <div className="space-y-1">
            {timeline.map((e, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-2.5 rounded px-1 py-1 text-xs hover:bg-muted/40">
                <Checkbox checked={timelinePicked(e)} onCheckedChange={() => toggleTimeline(e)} />
                <span className="w-36 shrink-0 tabular-nums text-muted-foreground">{new Date(e.atUtc).toLocaleString()}</span>
                <span>{e.label}</span>
                {e.source === 'MANUAL' && <Badge variant="secondary" className="ml-1">note</Badge>}
              </label>
            ))}
          </div>
        )}
      </GfoPanel>

      <GfoPanel title="Lessons">
        {draft.lessons.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {draft.lessons.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">{l}</span>
                <button type="button" onClick={() => patch({ lessons: draft.lessons.filter((_, j) => j !== i) })} aria-label="Remove lesson">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input value={lesson} onChange={e => setLesson(e.target.value)} placeholder="What should the fleet take away?"
            onKeyDown={e => { if (e.key === 'Enter' && lesson.trim()) { patch({ lessons: [...draft.lessons, lesson.trim()] }); setLesson(''); } }} />
          <Button size="sm" variant="outline" disabled={!lesson.trim()} onClick={() => { patch({ lessons: [...draft.lessons, lesson.trim()] }); setLesson(''); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
      </GfoPanel>

      <GfoPanel title="Where the hours went">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox checked={draft.includeImpactBar === true}
            onCheckedChange={(v: boolean | 'indeterminate') => patch({ includeImpactBar: v === true })} />
          Publish the stacked downtime bar with this report
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          Hours only — no tail number, no names. The figures freeze at the moment the report is approved,
          so a later tech-log correction cannot move an approved report's numbers.
        </p>
        {draft.includeImpactBar && (
          <div className="mt-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {barSegments.filter(s => s.hours > 0).map(s => (
                <Badge key={s.key} variant="outline">{s.label} {s.hours} h</Badge>
              ))}
            </div>
            <StatusHoursBar segments={barSegments} />
            {barSegments.every(s => s.hours <= 0) && (
              <p className="text-xs text-muted-foreground">No attributed hours to show yet.</p>
            )}
          </div>
        )}
      </GfoPanel>

      {rosterNamesRemain && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <EyeOff className="h-3.5 w-3.5" /> A known name is still in the draft — resolve the chips above before submitting.
        </p>
      )}
    </div>
  );
}

/** Read-only render of a curated draft — used in the review gate and the submitter's view. */
function PublishedPreview({ draft, barSegments }: { draft: FirPublishedDraft; barSegments: BarSegment[] }) {
  return (
    <GfoPanel title="Published draft">
      <p className="text-sm font-medium">{draft.summary || <span className="text-muted-foreground">No summary</span>}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm">{draft.whatHappened}</p>
      {draft.timeline.length > 0 && (
        <div className="mt-3 border-l-2 pl-3">
          {draft.timeline.map((t, i) => (
            <div key={i} className="text-xs"><span className="tabular-nums text-muted-foreground">{new Date(t.atUtc).toLocaleString()} — </span>{t.label}</div>
          ))}
        </div>
      )}
      {draft.includeImpactBar && (
        <div className="mt-3">
          <div className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Where the hours went</div>
          <StatusHoursBar segments={barSegments} />
        </div>
      )}
      {draft.lessons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {draft.lessons.map((l, i) => <li key={i} className="flex items-start gap-2 text-sm"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{l}</li>)}
        </ul>
      )}
      <div className="mt-3 text-xs text-muted-foreground">Acknowledgement: {draft.ackLevel === 'initials' ? 'initials required' : 'none'}</div>
    </GfoPanel>
  );
}
