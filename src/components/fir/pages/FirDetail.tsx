import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Archive, ArrowLeft, Anchor, Flag, Plus, UserRoundPen } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { GfoEmptyState, GfoPanel } from '../../gfo';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { useFir } from '../FirContext';
import { canSeeFir, isFirLeadership, visibleStatements } from '../engine/access';
import { buildImpactSnapshot, defectDebriefs, deriveSystemEntries, impactDiverged, impactSegments, mergeTimeline } from '../engine/timeline';
import { StatusHoursBar } from '../../tech-log/components/StatusHoursBar';
import { FirCategoryChip, FirStatusChip } from '../components/chips';
import { StatementsTab } from '../components/StatementsTab';
import { NarrativeTab } from '../components/NarrativeTab';
import { ImpactTab } from '../components/ImpactTab';
import { PublishTab } from '../components/PublishTab';
import { canCloseInternal } from '../engine/lifecycle';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function FirDetail({ userRole, additionalRoles = [] }: { userRole?: string; additionalRoles?: string[] }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: techLog } = useTechLog();
  const { state, dispatch } = useFir();
  const user = useCurrentUser();
  const now = useMemo(() => new Date().toISOString(), []);

  const [entryAt, setEntryAt] = useState(() => toLocalInput(new Date().toISOString()));
  const [entryLabel, setEntryLabel] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [newOwnerOid, setNewOwnerOid] = useState('');

  const fir = state.firs.find(f => f.id === id);
  const roles = [userRole ?? '', ...additionalRoles];
  const leadership = isFirLeadership(roles);

  const back = (
    <Link to="/fir" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Irregularity Reports
    </Link>
  );

  if (!fir) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {back}
        <GfoEmptyState message="No such irregularity report." icon={<Flag />} />
      </div>
    );
  }
  if (!canSeeFir(fir, { oid: user?.oid ?? '', roles })) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {back}
        <GfoEmptyState message="This internal FIR is visible to its owner and the leadership tier." icon={<Flag />} />
      </div>
    );
  }

  const nameOf = (oid?: string, fallback?: string) =>
    (oid && techLog.personnel.find(p => p.oid === oid)?.displayName) || fallback || oid || '—';
  const tail = fir.aircraftId ? techLog.aircraft.find(a => a.id === fir.aircraftId)?.tailNumber : undefined;

  const debriefs = defectDebriefs(fir, techLog, now);
  const merged = mergeTimeline(deriveSystemEntries(fir, techLog, now), fir.manualTimeline);
  const ongoing = debriefs.some(d => d.ongoing) || !fir.eventEndUtc;

  // The stacked bar (now a shared component — the work card and the metrics page render the same
  // one, so the three cannot drift).
  const segments = impactSegments(debriefs);
  const elapsedHours = Math.round(debriefs.reduce((s, d) => s + d.elapsedHours, 0) * 10) / 10;
  const excludedGapHours = Math.round(debriefs.reduce((s, d) => s + d.excludedGapHours, 0) * 10) / 10;
  // D61 §4 — the downtime a report stands behind is elapsed LESS the gaps whoever entered the time
  // chose not to count (the Friday-to-Monday where contract maintenance left with no replacement).
  const countedDowntimeHours = Math.round(debriefs.reduce((s, d) => s + d.countedDowntimeHours, 0) * 10) / 10;
  const derivedDowntimeHours = debriefs.length ? countedDowntimeHours : undefined;
  const publishedSnapshot = fir.publishedRevision?.impactSnapshot;
  /** D63 — published and draft may visibly disagree, and that is the evidence a correction landed
   *  after approval. Surface it rather than hiding it. */
  const publishedDowntime = publishedSnapshot?.downtimeHours ?? publishedSnapshot?.elapsedHours;
  const liveDowntime = fir.impact.downtimeHours ?? derivedDowntimeHours;

  /**
   * Divergence must mean **somebody corrected the logged time**, not "the clock moved".
   *
   * Two ways the first cut was wrong. It fired for any report published while its event was still
   * ongoing, because elapsed keeps climbing on its own — so the notice asserting a retrospective
   * correction had landed appeared when nothing had been corrected, and a notice that cries wolf is
   * one nobody reads. And it compared the downtime SCALAR only, so a re-labelling that moved hours
   * between states without changing the total — exactly what happens when a tech reclassifies a
   * stretch as waiting-on-contract-mx — was surfaced nowhere.
   *
   * So: composition is compared always (it cannot drift with wall clock), and the scalar only once
   * the event is closed.
   */
  const snapshotDiverged = impactDiverged(publishedSnapshot, segments, liveDowntime, ongoing);

  // Access split (§7): owner/opener/leadership assemble & see everything; a requestee
  // gets a scoped view (timeline + their own statement only — no narrative/impact).
  const viewer = { oid: user?.oid ?? '', roles };
  const isOwner = user?.oid === fir.ownerOid;
  const fullAccess = leadership || isOwner || user?.oid === fir.openedByOid;
  const canAssemble = fir.status === 'OPEN' && fullAccess;
  const canRequest = (leadership || isOwner) && fir.status === 'OPEN';
  const statementCount = visibleStatements(fir, viewer).length;

  const addEntry = () => {
    if (!entryLabel.trim() || !user) return;
    dispatch({
      type: 'ADD_MANUAL_ENTRY',
      payload: {
        firId: fir.id,
        entry: {
          source: 'MANUAL',
          atUtc: new Date(entryAt).toISOString(),
          label: entryLabel.trim(),
          note: entryNote.trim() || undefined,
          byOid: user.oid,
        },
      },
    });
    setEntryLabel('');
    setEntryNote('');
  };

  const reassign = () => {
    if (!newOwnerOid || !user) return;
    dispatch({
      type: 'REASSIGN_OWNER',
      payload: {
        firId: fir.id,
        newOwnerOid,
        newOwnerName: nameOf(newOwnerOid),
        byOid: user.oid,
        byName: user.displayName,
        atUtc: new Date().toISOString(),
      },
    });
    setReassigning(false);
    setNewOwnerOid('');
  };

  const closeInternal = () => {
    if (!user) return;
    dispatch({
      type: 'CLOSE_INTERNAL',
      payload: { firId: fir.id, byOid: user.oid, byName: user.displayName, byRoles: roles, atUtc: new Date().toISOString() },
    });
  };
  const canClose = canCloseInternal(fir, viewer);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="gfo-eyebrow mb-1">{fir.ref}</div>
          <h1 className="text-2xl font-semibold leading-tight text-primary">{fir.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <FirStatusChip status={fir.status} />
            <FirCategoryChip category={fir.category} />
            {tail && <Badge variant="outline">{tail}</Badge>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Event {new Date(fir.eventStartUtc).toLocaleString()}
            {fir.eventEndUtc ? ` → ${new Date(fir.eventEndUtc).toLocaleString()}` : ' → ongoing'}
            {' · '}owner {nameOf(fir.ownerOid, fir.ownerName)}
            {' · '}opened by {nameOf(fir.openedByOid, fir.openedByName)}, {new Date(fir.openedAtUtc).toLocaleString()}
          </p>
        </div>
        {fir.status === 'OPEN' && (leadership || user?.oid === fir.ownerOid) && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setReassigning(true)}>
              <UserRoundPen className="mr-1.5 h-4 w-4" /> Reassign owner
            </Button>
            {canClose && (
              <Button size="sm" variant="outline" onClick={closeInternal}>
                <Archive className="mr-1.5 h-4 w-4" /> Close internal
              </Button>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="statements">
            Statements{statementCount > 0 && <Badge variant="secondary" className="ml-1.5">{statementCount}</Badge>}
          </TabsTrigger>
          {fullAccess && <TabsTrigger value="narrative">Narrative</TabsTrigger>}
          {fullAccess && <TabsTrigger value="impact">Impact</TabsTrigger>}
          {fullAccess && <TabsTrigger value="publish">Publish</TabsTrigger>}
        </TabsList>

        <TabsContent value="statements" className="mt-4">
          <StatementsTab
            fir={fir}
            viewer={viewer}
            canRequest={canRequest}
            personnel={techLog.personnel}
            dispatch={dispatch}
            nameOf={nameOf}
          />
        </TabsContent>

        {fullAccess && (
          <TabsContent value="narrative" className="mt-4">
            <NarrativeTab fir={fir} canEdit={canAssemble} dispatch={dispatch} />
          </TabsContent>
        )}

        {fullAccess && (
          <TabsContent value="impact" className="mt-4">
            <ImpactTab fir={fir} canEdit={canAssemble} derivedDowntimeHours={derivedDowntimeHours} publishedSnapshot={publishedSnapshot} dispatch={dispatch} />
          </TabsContent>
        )}

        {fullAccess && (
          <TabsContent value="publish" className="mt-4">
            <PublishTab
              fir={fir}
              viewer={viewer}
              leadership={leadership}
              personnel={techLog.personnel}
              timeline={merged}
              /* D63 — recompute at the CLICK, not from the render-time `debriefs`. `now` is
                 memoised at mount, so on an ongoing event a reviewer who opened the report at 09:00
                 and approved at 14:00 froze 09:00 figures under a `capturedAtUtc` claiming 14:00 —
                 the published revision then showed "figures as at publication" over numbers five
                 hours stale. The whole value of a frozen figure is that it was true at the instant
                 it was stamped. `impactSegments` runs inside `buildImpactSnapshot`, so the stored
                 bar is recomputed with it. */
              impactSnapshot={() => {
                const at = new Date().toISOString();
                const fresh = defectDebriefs(fir, techLog, at);
                const freshDowntime = fir.impact.downtimeHours
                  ?? (fresh.length
                    ? Math.round(fresh.reduce((s, d) => s + d.countedDowntimeHours, 0) * 10) / 10
                    : undefined);
                return buildImpactSnapshot(fresh, freshDowntime, at);
              }}
              barSegments={segments}
              user={user ? { oid: user.oid, displayName: user.displayName } : undefined}
              nameOf={nameOf}
              dispatch={dispatch}
              onViewPublished={() => navigate(`/fir/published/${fir.id}`)}
            />
          </TabsContent>
        )}

        <TabsContent value="timeline" className="mt-4 space-y-4">
          {debriefs.length > 0 && (
            <GfoPanel title="Where the hours went">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">{elapsedHours} h elapsed{ongoing ? ' · ongoing' : ''}</Badge>
                {segments.filter(s => s.hours > 0).map(s => (
                  <Badge key={s.key} variant="outline">{s.label} {s.hours} h</Badge>
                ))}
                {excludedGapHours > 0 && (
                  <Badge variant="outline" className="border-dashed">{excludedGapHours} h excluded by the enterer</Badge>
                )}
              </div>
              <StatusHoursBar segments={segments} className="mt-3" />
              {excludedGapHours > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Downtime counted for this report is {countedDowntimeHours} h — the {excludedGapHours} h of logged gap
                  time whoever entered it set aside is shown, not counted.
                </p>
              )}
              {snapshotDiverged && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  The published revision froze downtime at {publishedDowntime} h; the tech log now reads {liveDowntime} h.
                  A correction landed after approval — publish a new revision if the report should carry the new figure.
                </p>
              )}
            </GfoPanel>
          )}

          <GfoPanel title="Timeline">
            {fir.anchors.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Evidence anchors:</span>
                {fir.anchors.map((a, i) => (
                  <Badge key={i} variant="secondary"><Anchor className="mr-1 h-3 w-3" />{a.kind} · {a.refId}</Badge>
                ))}
              </div>
            )}
            {merged.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timeline yet — anchor evidence or add the first entry below.</p>
            ) : (
              <div className="space-y-1.5 border-l-2 pl-3">
                {merged.map((e, i) => (
                  <div key={i} className="text-xs">
                    <span className="tabular-nums text-muted-foreground">{new Date(e.atUtc).toLocaleString()} — </span>
                    <span className={e.source === 'MANUAL' ? 'font-medium' : ''}>{e.label}</span>
                    {e.byOid && <span className="text-muted-foreground"> · {nameOf(e.byOid)}</span>}
                    {e.source === 'SYSTEM' ? (
                      <span className="ml-1.5 rounded border border-border px-1 py-px text-[10px] uppercase tracking-wide text-muted-foreground">system</span>
                    ) : (
                      <span className="ml-1.5 rounded bg-muted px-1 py-px text-[10px] uppercase tracking-wide text-muted-foreground">note</span>
                    )}
                    {e.note && <div className="ml-4 italic text-muted-foreground">{e.note}</div>}
                  </div>
                ))}
                {ongoing && <div className="text-xs text-muted-foreground">… event ongoing</div>}
              </div>
            )}

            {canAssemble && (
              <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-4 md:grid-cols-[200px_1fr_auto]">
                <div>
                  <Label htmlFor="fir-entry-at" className="text-xs">When</Label>
                  <Input id="fir-entry-at" type="datetime-local" className="mt-1 h-9" value={entryAt}
                    onChange={e => setEntryAt(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="fir-entry-label" className="text-xs">What happened</Label>
                  <Input id="fir-entry-label" className="mt-1 h-9" value={entryLabel}
                    onChange={e => setEntryLabel(e.target.value)}
                    placeholder="e.g. Vendor ETA slipped 48 h — freight weather hold" />
                  <Input className="mt-2 h-9" value={entryNote} onChange={e => setEntryNote(e.target.value)}
                    placeholder="Optional context note" />
                </div>
                <div className="flex items-end">
                  <Button size="sm" onClick={addEntry} disabled={!entryLabel.trim()}>
                    <Plus className="mr-1.5 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            )}
          </GfoPanel>

          {fir.audit.length > 0 && (
            <GfoPanel title="Activity">
              <div className="space-y-1">
                {fir.audit.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 border-b py-1 text-xs text-muted-foreground last:border-0">
                    <span>{a.kind.replace(/_/g, ' ').toLowerCase()}{a.detail ? ` — ${a.detail}` : ''}</span>
                    <span>{nameOf(a.byOid, a.byName)} · {new Date(a.atUtc).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </GfoPanel>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={reassigning} onOpenChange={setReassigning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign owner</DialogTitle>
            <DialogDescription>
              One accountable owner assembles the report. Reassignment is recorded in the FIR's activity log.
            </DialogDescription>
          </DialogHeader>
          <Select value={newOwnerOid} onValueChange={setNewOwnerOid}>
            <SelectTrigger><SelectValue placeholder="Select new owner" /></SelectTrigger>
            <SelectContent>
              {techLog.personnel.filter(p => p.active && p.oid !== fir.ownerOid).map(p => (
                <SelectItem key={p.oid} value={p.oid}>{p.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReassigning(false)}>Cancel</Button>
            <Button size="sm" onClick={reassign} disabled={!newOwnerOid}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
