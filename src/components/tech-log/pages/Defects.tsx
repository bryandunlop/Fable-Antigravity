import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FilePlus, Flag, Wrench, CheckCircle2, Paperclip, Repeat, Pencil, Eye, TriangleAlert } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { useRectifyToWorkCard } from '../useRectify';
import { currentRows } from '../engine/supersede';
import { canSupersede } from '../engine/authz';
import { detectRepetitiveGroups } from '../engine/repetitive';
import { TechLogShell } from '../components/TechLogShell';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { ReportDefectDialog } from '../components/panels/ReportDefectDialog';
import { DefectDescriptionField, DefectSymptomField, DefectLocationNotesField } from '../components/panels/DefectFields';
import { WatchlistDialog, EscalateWatchDialog } from '../components/panels/WatchlistPanel';
import { ATA_CHAPTERS, INTENT } from '../constants';
import { newId } from '../util/id';
import type { Defect, Severity } from '../types';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const STATUS_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  OPEN: 'destructive', DEFERRED: 'secondary', RECTIFIED: 'outline', CLOSED: 'outline', WATCHLISTED: 'secondary',
};

export default function Defects() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const integration = useIntegration();
  const rectifyToWorkCard = useRectifyToWorkCard();
  const tailFilter = params.get('tail') ?? undefined;

  const [formOpen, setFormOpen] = useState(params.get('new') === '1');
  // correction (supersede) state
  const [correctOrig, setCorrectOrig] = useState<Defect | null>(null);
  const [cDraft, setCDraft] = useState<Defect | null>(null);
  const [correctSignOpen, setCorrectSignOpen] = useState(false);
  const [pendingCorrectionId, setPendingCorrectionId] = useState('');
  // watch-list disposition state
  const [watchTarget, setWatchTarget] = useState<Defect | null>(null);
  const [escalateTarget, setEscalateTarget] = useState<Defect | null>(null);

  const defects = useMemo(() => {
    let list = currentRows(state.defects);
    if (tailFilter) {
      const ac = state.aircraft.find(a => a.tailNumber === tailFilter);
      list = list.filter(d => d.aircraftId === ac?.id);
    }
    return list.sort((a, b) => b.reportedAtUtc.localeCompare(a.reportedAtUtc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.defects, tailFilter]);

  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';

  // Repetitive-defect detection (§3.1) — same aircraft + ATA recurring within the window.
  const repeats = useMemo(() => detectRepetitiveGroups(state.defects), [state.defects]);
  const repeatGroups = useMemo(() => {
    const byGroup = new Map<string, { aircraftId: string; ata: string; count: number }>();
    for (const d of currentRows(state.defects)) {
      const info = repeats.get(d.id);
      if (info && !byGroup.has(info.groupId)) byGroup.set(info.groupId, { aircraftId: d.aircraftId, ata: d.ataChapter, count: info.count });
    }
    return [...byGroup.values()];
  }, [state.defects, repeats]);

  // ── correction (supersede) of a signed defect ──
  const signerOfDefect = (d: Defect) => state.signatures.find(s => s.id === d.signatureId)?.signerOid ?? '';

  const openCorrectDefect = (d: Defect) => {
    const auth = canSupersede(signerOfDefect(d), user);
    if (!auth.ok) return toast.error(auth.error ?? 'Not authorized to correct this record.');
    setCorrectOrig(d);
    setCDraft({ ...d });
    if (auth.thirdParty) toast.info(`Filing a third-party correction as ${auth.relationship}. The original signer is recorded.`);
  };

  const beginCorrectionSign = () => {
    if (!cDraft?.description.trim()) return toast.error('Description is required.');
    setPendingCorrectionId(newId('def'));
    setCorrectSignOpen(true);
  };

  const onCorrectionSigned = (sig: { id: string }) => {
    if (!correctOrig || !cDraft) return;
    const corrected: Defect = {
      ...cDraft,
      id: pendingCorrectionId,
      supersedesId: correctOrig.id,
      reportedAtUtc: correctOrig.reportedAtUtc, // keep original report time; correction fixes content
      signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'SUPERSEDE_DEFECT', payload: corrected });
    // CAMP: a correction re-pushes as EDIT, carrying the parent discrepancy ref forward (off-ledger, OQ9).
    integration.pushDiscrepancy({
      entityType: 'DEFECT', entityId: corrected.id, aircraftId: corrected.aircraftId,
      ata: corrected.ataChapter, description: corrected.description,
      technician: user.displayName, intent: 'CORRECT', supersedesEntityId: correctOrig.id,
    });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFECT_CORRECTED', entityType: 'Defect', entityId: corrected.id, atUtc: new Date().toISOString(), summary: `${tailOf(corrected.aircraftId)} ATA ${corrected.ataChapter} defect corrected (supersedes ${correctOrig.id})${signerOfDefect(correctOrig) !== user.oid ? ' — third-party correction' : ''}` } });
    toast.success('Correction signed — original retained, correction is now current.');
    setCorrectOrig(null);
    setCDraft(null);
  };

  return (
    <TechLogShell
      title={tailFilter ? `Defects — ${tailFilter}` : 'Defects'}
      subtitle="Pilot reports a squawk; maintenance triages it (defer under MEL or rectify)."
      actions={
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <FilePlus className="mr-1.5 h-4 w-4" /> Report defect
        </Button>
      }
    >
      <div className="space-y-3">
        {repeatGroups.length > 0 && (
          <Card className="border-[var(--gfo-warning,#F1B434)]/40">
            <CardContent className="flex flex-col gap-2 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium"><Repeat className="h-4 w-4" /> Repetitive defect groups</div>
              <div className="flex flex-wrap gap-2">
                {repeatGroups.map((g, i) => (
                  <Badge key={i} variant="outline" className="font-normal">
                    {tailOf(g.aircraftId)} · ATA {g.ata} · ×{g.count}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Same ATA chapter recurring on one aircraft within 30 days — candidates for deeper troubleshooting or a repetitive-inspection task.</p>
            </CardContent>
          </Card>
        )}
        {defects.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No defects logged.</CardContent></Card>
        )}
        {defects.map(d => {
          const rep = repeats.get(d.id);
          const loc = d.cabinSeat ? `Seat ${d.cabinSeat}` : d.zoneCode ? `Zone ${d.zoneCode}` : d.locationFreetext;
          return (
          <Card key={d.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{tailOf(d.aircraftId)}</span>
                  <Badge variant="outline">ATA {d.ataChapter}</Badge>
                  <Badge variant={STATUS_VARIANT[d.status]}>{d.status === 'WATCHLISTED' ? <><Eye className="mr-1 h-3 w-3" />WATCH</> : d.status}</Badge>
                  {rep && <Badge variant="destructive" title={`Repeat ${rep.index} of ${rep.count} — same ATA on this aircraft`}><Repeat className="mr-1 h-3 w-3" />repeat ×{rep.count}</Badge>}
                  {d.attachments?.length ? <Badge variant="outline"><Paperclip className="mr-1 h-3 w-3" />{d.attachments.length}</Badge> : null}
                  <span className="text-xs text-muted-foreground">{d.severity} · {d.source}</span>
                </div>
                <p className="mt-1 text-sm">{d.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reported {new Date(d.reportedAtUtc).toLocaleString()}{loc ? ` · ${loc}` : ''}
                </p>
                {d.attachments?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.attachments.filter(a => a.uri.startsWith('data:')).map(a => (
                      <img key={a.id} src={a.uri} alt={a.filename} title={`${a.filename} · ${a.sha256.slice(0, 12)}…`} className="h-14 w-14 rounded border object-cover" />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {d.status === 'OPEN' && canSupersede(signerOfDefect(d), user).ok && (
                  <Button size="sm" variant="outline" onClick={() => openCorrectDefect(d)}>
                    <Pencil className="mr-1.5 h-4 w-4" /> Correct
                  </Button>
                )}
                {isMaint && d.status === 'OPEN' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/tech-log/deferrals?defect=${d.id}`)}>
                      <Wrench className="mr-1.5 h-4 w-4" /> Defer (MEL)
                    </Button>
                    <Button size="sm" onClick={() => rectifyToWorkCard(d)}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Rectify
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/tech-log/releases?defect=${d.id}`)}>Quick CRS</Button>
                    <Button size="sm" variant="outline" onClick={() => setWatchTarget(d)}>
                      <Eye className="mr-1.5 h-4 w-4" /> Watch
                    </Button>
                  </>
                )}
                {isMaint && d.status === 'WATCHLISTED' && (
                  <>
                    <Button size="sm" onClick={() => rectifyToWorkCard(d)}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Rectify
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setEscalateTarget(d)}>
                      <TriangleAlert className="mr-1.5 h-4 w-4" /> Escalate
                    </Button>
                  </>
                )}
                {/* FIR is retrospective — any role, any defect status (even rectified) can seed one. */}
                <Button size="sm" variant="outline" onClick={() => navigate(`/fir/new?defect=${d.id}`)}>
                  <Flag className="mr-1.5 h-4 w-4" /> Open FIR
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Report defect — the one shared form. `?tail=` seeds the aircraft but does not lock it:
          this page filters by tail, it is not scoped to one aircraft the way the workspace is. */}
      <ReportDefectDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        prefill={tailFilter ? { tail: tailFilter } : undefined}
      />

      {/* Correct (supersede) a signed defect */}
      <Dialog open={!!correctOrig} onOpenChange={o => { if (!o) { setCorrectOrig(null); setCDraft(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" /> Correct defect</DialogTitle>
            <DialogDescription>The original signed defect is retained unaltered; your correction supersedes it.</DialogDescription>
          </DialogHeader>
          {cDraft && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ATA chapter</Label>
                  <Select value={cDraft.ataChapter} onValueChange={(v: string) => setCDraft({ ...cDraft, ataChapter: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ATA_CHAPTERS.map(c => <SelectItem key={c.code} value={c.code}>{c.code} · {c.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severity</Label>
                  <Select value={cDraft.severity} onValueChange={(v: string) => setCDraft({ ...cDraft, severity: v as Severity })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DefectDescriptionField value={cDraft.description} onChange={v => setCDraft({ ...cDraft, description: v })} />
              <DefectSymptomField value={cDraft.symptom ?? ''} onChange={v => setCDraft({ ...cDraft, symptom: v || undefined })} />
              <DefectLocationNotesField label="Location notes" className="mt-1" value={cDraft.locationFreetext ?? ''} onChange={v => setCDraft({ ...cDraft, locationFreetext: v || undefined })} />
              {cDraft.attachments?.length ? <p className="text-xs text-muted-foreground">{cDraft.attachments.length} attachment(s) carried over from the original and re-covered by your signature.</p> : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCorrectOrig(null); setCDraft(null); }}>Cancel</Button>
            <Button onClick={beginCorrectionSign}>Continue to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignCeremonyDialog
        open={correctSignOpen}
        onOpenChange={setCorrectSignOpen}
        signer={user}
        signedEntity="DEFECT"
        signedEntityId={pendingCorrectionId}
        intentStatement={INTENT.CORRECTION}
        payloadExtra={cDraft?.attachments?.map(a => a.sha256).join(',') || undefined}
        payloadSummary="Correction — supersedes the original signed defect, which is retained."
        onSigned={onCorrectionSigned}
        title="Sign correction"
      />

      {watchTarget && (
        <WatchlistDialog defect={watchTarget} open={!!watchTarget} onOpenChange={o => { if (!o) setWatchTarget(null); }} />
      )}
      {escalateTarget && (
        <EscalateWatchDialog defect={escalateTarget} open={!!escalateTarget} onOpenChange={o => { if (!o) setEscalateTarget(null); }} />
      )}
    </TechLogShell>
  );
}
