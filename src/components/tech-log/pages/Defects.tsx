import { useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FilePlus, AlertTriangle, Wrench, CheckCircle2, Paperclip, Camera, MapPin, X, Repeat, Pencil } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { useRectifyToWorkCard } from '../useRectify';
import { currentRows } from '../engine/supersede';
import { canSupersede } from '../engine/authz';
import { mockSha256 } from '../engine/signing';
import { detectRepetitiveGroups } from '../engine/repetitive';
import { TechLogShell } from '../components/TechLogShell';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { ATA_CHAPTERS, INTENT } from '../constants';
import { newId } from '../util/id';
import type { Defect, Severity, DefectSource, Attachment, DefectLocationKind } from '../types';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const STATUS_VARIANT: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  OPEN: 'destructive', DEFERRED: 'secondary', RECTIFIED: 'outline', CLOSED: 'outline',
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
  const [signOpen, setSignOpen] = useState(false);
  const [pendingDefectId, setPendingDefectId] = useState<string>('');
  // correction (supersede) state
  const [correctOrig, setCorrectOrig] = useState<Defect | null>(null);
  const [cDraft, setCDraft] = useState<Defect | null>(null);
  const [correctSignOpen, setCorrectSignOpen] = useState(false);
  const [pendingCorrectionId, setPendingCorrectionId] = useState('');

  // form state
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);
  const [tail, setTail] = useState(tailFilter ?? dispatchable[0]?.tailNumber ?? '');
  const [ata, setAta] = useState('32');
  const [severity, setSeverity] = useState<Severity>('HIGH');
  const [description, setDescription] = useState('');
  const [symptom, setSymptom] = useState('');
  // structured location (§17.2)
  const [locKind, setLocKind] = useState<DefectLocationKind>('OTHER');
  const [cabinSeat, setCabinSeat] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [locFreetext, setLocFreetext] = useState('');
  // attachments (signed-by-digest)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // Downscale an image to a small JPEG data URL so attachments survive reload within localStorage quota.
  const fileToThumb = (file: File): Promise<string | undefined> =>
    new Promise(resolve => {
      if (!file.type.startsWith('image/')) return resolve(undefined);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 480;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(undefined);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(undefined);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const added: Attachment[] = [];
    for (const file of Array.from(files)) {
      const thumb = await fileToThumb(file);
      added.push({
        id: newId('att'),
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        bytes: file.size,
        // mock SHA-256 over identifying metadata (real impl hashes the bytes)
        sha256: mockSha256(`${file.name}|${file.size}|${file.lastModified}`),
        uri: thumb ?? `blob://mygfo/attach/${file.name}`,
        capturedAtUtc: new Date().toISOString(),
      });
    }
    setAttachments(a => [...a, ...added]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const resetForm = () => {
    setDescription(''); setSymptom('');
    setLocKind('OTHER'); setCabinSeat(''); setZoneCode(''); setLocFreetext('');
    setAttachments([]);
  };

  // Attachment digests are folded into the signed payload (AC 120-78B).
  const attachmentPayload = attachments.map(a => a.sha256).join(',');

  const beginSign = () => {
    if (!tail || !description.trim()) {
      toast.error('Aircraft and description are required.');
      return;
    }
    setPendingDefectId(newId('def'));
    setSignOpen(true);
  };

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

  const onSigned = (sig: { id: string }) => {
    const ac = state.aircraft.find(a => a.tailNumber === tail)!;
    const source: DefectSource = isMaint ? 'MAREP' : 'PIREP';
    const defect: Defect = {
      id: pendingDefectId, aircraftId: ac.id, source, ataChapter: ata,
      description: description.trim(), symptom: symptom.trim() || undefined, severity,
      locationKind: locKind,
      cabinSeat: locKind === 'CABIN' ? cabinSeat.trim() || undefined : undefined,
      zoneCode: locKind === 'STRUCTURAL' ? zoneCode.trim() || undefined : undefined,
      locationFreetext: locFreetext.trim() || undefined,
      attachments: attachments.length ? attachments : undefined,
      airworthinessAffecting: null, // conservative default = grounding; only maintenance can clear via release/deferral
      status: 'OPEN', reportedByOid: user.oid, reportedAtUtc: new Date().toISOString(),
      signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'ADD_DEFECT', payload: defect });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: defect.id, atUtc: defect.reportedAtUtc, summary: `${source} ${tail} ATA ${ata} — ${severity}${attachments.length ? ` · ${attachments.length} attachment(s)` : ''}` } });
    setFormOpen(false);
    resetForm();
    toast.success(`Defect logged on ${tail} — aircraft now grounded (RED) pending maintenance triage.`);
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
                  <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
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
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Report defect dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Report defect</DialogTitle>
            <DialogDescription>Capture the observation. Maintenance determines dispatch impact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aircraft</Label>
                <Select value={tail} onValueChange={(v: string) => setTail(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dispatchable.map(a => <SelectItem key={a.id} value={a.tailNumber}>{a.tailNumber} · {a.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ATA chapter</Label>
                <Select value={ata} onValueChange={(v: string) => setAta(v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ATA_CHAPTERS.map(c => <SelectItem key={c.code} value={c.code}>{c.code} · {c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1" value={description} onChange={e => setDescription(e.target.value)} placeholder="What was observed?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Symptom / CAS (optional)</Label>
                <Input className="mt-1" value={symptom} onChange={e => setSymptom(e.target.value)} placeholder="e.g. GEAR amber CAS" />
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={severity} onValueChange={(v: string) => setSeverity(v as Severity)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Severity[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Structured location (§17.2) */}
            <div className="rounded-md border p-3">
              <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Select value={locKind} onValueChange={(v: string) => setLocKind(v as DefectLocationKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OTHER">General / system</SelectItem>
                    <SelectItem value="CABIN">Cabin (LOPA seat)</SelectItem>
                    <SelectItem value="STRUCTURAL">Structural (zone)</SelectItem>
                  </SelectContent>
                </Select>
                {locKind === 'CABIN' && <Input placeholder="Seat, e.g. 12A" value={cabinSeat} onChange={e => setCabinSeat(e.target.value)} />}
                {locKind === 'STRUCTURAL' && <Input placeholder="Zone, e.g. WING-L-STA-340" value={zoneCode} onChange={e => setZoneCode(e.target.value)} />}
              </div>
              <Input className="mt-2" placeholder="Location notes (optional)" value={locFreetext} onChange={e => setLocFreetext(e.target.value)} />
            </div>

            {/* Attachments — folded into the signed payload by SHA-256 */}
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Photos / attachments</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Camera className="mr-1.5 h-4 w-4" /> Add
                </Button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => onFiles(e.target.files)} />
              </div>
              {attachments.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No attachments. Each photo's SHA-256 digest is covered by your signature.</p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {attachments.map(a => (
                    <div key={a.id} className="relative rounded-md border p-1">
                      {a.uri.startsWith('data:') ? (
                        <img src={a.uri} alt={a.filename} className="h-20 w-full rounded object-cover" />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">{a.contentType}</div>
                      )}
                      <button type="button" onClick={() => setAttachments(list => list.filter(x => x.id !== a.id))}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 shadow" title="Remove">
                        <X className="h-3 w-3" />
                      </button>
                      <div className="mt-1 truncate text-[10px] text-muted-foreground" title={a.filename}>{a.filename}</div>
                      <div className="truncate font-mono text-[9px] text-muted-foreground" title={a.sha256}>{a.sha256.slice(0, 16)}…</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
              Reported as airworthiness-affecting by default — the aircraft goes <strong>RED</strong> until maintenance defers it under the MEL or rectifies it. Pilots cannot self-clear.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={beginSign}>Continue to sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SignCeremonyDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        signer={user}
        signedEntity="DEFECT"
        signedEntityId={pendingDefectId}
        intentStatement={INTENT.PILOT_DEFECT}
        payloadExtra={attachmentPayload || undefined}
        payloadSummary={attachments.length ? `Covers ${attachments.length} attachment(s) by SHA-256 digest — the signature is invalid if a photo is altered.` : undefined}
        onSigned={onSigned}
        title="Sign defect report"
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
              <div><Label>Description</Label><Textarea className="mt-1" value={cDraft.description} onChange={e => setCDraft({ ...cDraft, description: e.target.value })} /></div>
              <div><Label>Symptom / CAS</Label><Input className="mt-1" value={cDraft.symptom ?? ''} onChange={e => setCDraft({ ...cDraft, symptom: e.target.value || undefined })} /></div>
              <div><Label>Location notes</Label><Input className="mt-1" value={cDraft.locationFreetext ?? ''} onChange={e => setCDraft({ ...cDraft, locationFreetext: e.target.value || undefined })} /></div>
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
    </TechLogShell>
  );
}
