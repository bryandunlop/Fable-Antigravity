import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../../TechLogContext';
import { ATA_CHAPTERS, INTENT } from '../../constants';
import { newId } from '../../util/id';
import type { Defect, DefectSource, Attachment, DefectLocationKind, CasColor } from '../../types';
import { SignCeremonyDialog } from '../SignCeremonyDialog';
import { useCasCatalog } from '../../../documents/hooks/useCasCatalog';
import {
  DefectDescriptionField, DefectSymptomField, DefectCasField, DefectCmcCodeField,
  DefectLocationSection, DefectAttachmentsField, OccurredAtField,
  casValueFor, casEntryIncomplete, type CasMode,
} from './DefectFields';
import { Button } from '../../../ui/button';
import { Label } from '../../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

export interface ReportPrefill {
  tail?: string;
  ata?: string;
  description?: string;
  symptom?: string;
}

/**
 * Shared "Report defect" dialog (form + attachments-signed-by-digest + structured location + sign).
 * Reused by the Defects list page, the Tail Workspace, and the Intermittent "promote to defect" path.
 * On sign it dispatches the exact same sequence as before and calls onReported(defect).
 */
export function ReportDefectDialog({
  open,
  onOpenChange,
  lockTail,
  prefill,
  onReported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lockTail?: string;           // when launched from a specific aircraft, lock the tail
  prefill?: ReportPrefill;
  onReported?: (defect: Defect) => void;
}) {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const dispatchable = state.aircraft.filter(a => !a.isProvisional);

  const [signOpen, setSignOpen] = useState(false);
  const [pendingDefectId, setPendingDefectId] = useState('');
  const [tail, setTail] = useState(lockTail ?? prefill?.tail ?? dispatchable[0]?.tailNumber ?? '');
  const [ata, setAta] = useState(prefill?.ata ?? '32');
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [symptom, setSymptom] = useState(prefill?.symptom ?? '');
  // D57: the CAS annunciation, structured and separate from the symptom narrative. The mode is what
  // makes casMessage/casColor and casObserved mutually exclusive — see `casValueFor`.
  const [casMode, setCasMode] = useState<CasMode>('NONE');
  const [casMessage, setCasMessage] = useState('');
  const [casColor, setCasColor] = useState<CasColor>('AMBER');
  // LG-99: the single code the reporter read off the CMC page. Maintenance's own troubleshooting
  // codes are a list on the work card — this is the intake hint that seeds it.
  const [cmcFaultCode, setCmcFaultCode] = useState('');
  // D56: when it was NOTICED. Defaults to now and is back-datable; the filing stamp is taken
  // separately at signing.
  const [occurredAtUtc, setOccurredAtUtc] = useState(() => new Date().toISOString());
  const [locKind, setLocKind] = useState<DefectLocationKind>('OTHER');
  const [cabinSeat, setCabinSeat] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [locFreetext, setLocFreetext] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  /** The fleet type the CAS fields were last filled against — see the reset effect below. */
  const lastFleetTypeRef = useRef<string | undefined>(undefined);

  // Re-seed from prefill/lockTail whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    const nextTail = lockTail ?? prefill?.tail ?? dispatchable[0]?.tailNumber ?? '';
    setTail(nextTail);
    // Seed the fleet-type watermark from the SAME tail this effect just chose. Reading it from
    // `selectedType` instead would leave the previous session's type in the ref for one commit and
    // fire the reset below on a freshly opened, empty form.
    lastFleetTypeRef.current = state.aircraft.find(a => a.tailNumber === nextTail)?.type;
    setAta(prefill?.ata ?? '32');
    setDescription(prefill?.description ?? '');
    setSymptom(prefill?.symptom ?? '');
    setCasMode('NONE'); setCasMessage(''); setCasColor('AMBER');
    setCmcFaultCode('');
    setOccurredAtUtc(new Date().toISOString());
    setLocKind('OTHER'); setCabinSeat(''); setZoneCode(''); setLocFreetext('');
    setAttachments([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // D60 — the CAS picker is scoped to the CHOSEN tail's fleet type and re-derives when the aircraft
  // select changes, so switching from a G650ER to a G500 re-offers that type's curated messages
  // rather than the previous one's. Empty when there is no knowledge store (the form is mounted from
  // five places and must never depend on it) — free text is D57's fallback.
  const selectedType = state.aircraft.find(a => a.tailNumber === tail)?.type;
  const casCatalogForTail = useCasCatalog(selectedType);

  /**
   * D60 fix pass — a curated CAS message and its colour belong to ONE fleet's knowledge, so they do
   * not survive a change of fleet.
   *
   * The form re-seeds only on open. Before this, a message + colour picked out of the G650ER catalog
   * stayed in the fields after the reporter changed the aircraft to a G500 and could be signed onto
   * that tail's defect: an annunciation the type does not have, at a tier borrowed from another
   * fleet. `casColor` is not decoration — the FIR safety fast path reads it
   * (`fir/engine/suggestions.ts`).
   *
   * Keyed on the fleet TYPE, not the tail. N1PG → N2PG offers the identical catalog, so there is
   * nothing stale and no reason to make the reporter retype. The MODE is deliberately left alone:
   * "Observed (no CAS)" and "None" are facts about the event, not about the fleet. Clearing the
   * message under MESSAGE therefore lands in the incomplete state `casEntryIncomplete` already
   * refuses to sign — the loud failure this file prefers to a silent drop.
   */
  useEffect(() => {
    if (!open) return;
    if (lastFleetTypeRef.current === selectedType) return;
    const from = lastFleetTypeRef.current;
    lastFleetTypeRef.current = selectedType;
    if (casMode !== 'MESSAGE') return;
    const stale = casMessage.trim();
    if (!stale && casColor === 'AMBER') return;
    setCasMessage('');
    setCasColor('AMBER');
    if (stale) {
      toast.info(
        `CAS annunciation cleared — “${stale}” was ${from ?? 'another type'} knowledge and this tail is ${selectedType ?? 'a different type'}.`,
      );
    }
    // The watermark is the guard; re-running on every CAS keystroke would only re-check it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedType]);

  // Attachment digests are folded into the signed payload (AC 120-78B).
  const attachmentPayload = attachments.map(a => a.sha256).join(',');

  const beginSign = () => {
    if (!tail || !description.trim()) return toast.error('Aircraft and description are required.');
    // D56: a future occurrence would push the MEL repair clock into the future, so reject it. One
    // minute of slack covers the current minute plus ordinary device-clock skew. (The field itself
    // can never be emptied — a half-typed value leaves the last good instant in place — so "required"
    // needs no separate check.)
    if (new Date(occurredAtUtc).getTime() > Date.now() + 60_000) {
      return toast.error('The occurrence time cannot be in the future.');
    }
    // D57: "CAS message" with nothing typed would silently record no CAS at all — and the colour
    // the reporter did pick would go with it. Say so rather than drop it.
    if (casEntryIncomplete(casMode, casMessage)) {
      return toast.error('Enter the CAS message, or choose “Observed (no CAS)”.');
    }
    setPendingDefectId(newId('def'));
    setSignOpen(true);
  };

  const onSigned = (sig: { id: string }) => {
    const ac = state.aircraft.find(a => a.tailNumber === tail)!;
    const source: DefectSource = isMaint ? 'MAREP' : 'PIREP';
    // D56: two distinct stamps. `occurredAtUtc` is user-entered (when it was noticed, back-datable);
    // this is the filing stamp, taken at the moment of signature.
    const filedAtUtc = new Date().toISOString();
    const defect: Defect = {
      id: pendingDefectId, aircraftId: ac.id, source, ataChapter: ata,
      description: description.trim(), symptom: symptom.trim() || undefined,
      ...casValueFor(casMode, casMessage, casColor),
      cmcFaultCode: cmcFaultCode.trim() || undefined,
      locationKind: locKind,
      cabinSeat: locKind === 'CABIN' ? cabinSeat.trim() || undefined : undefined,
      zoneCode: locKind === 'STRUCTURAL' ? zoneCode.trim() || undefined : undefined,
      locationFreetext: locFreetext.trim() || undefined,
      attachments: attachments.length ? attachments : undefined,
      airworthinessAffecting: null,
      status: 'OPEN', reportedByOid: user.oid,
      occurredAtUtc, reportedAtUtc: filedAtUtc, signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig as any });
    dispatch({ type: 'ADD_DEFECT', payload: defect });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: defect.id, atUtc: defect.reportedAtUtc, summary: `${source} ${tail} ATA ${ata}${attachments.length ? ` · ${attachments.length} attachment(s)` : ''}` } });
    onOpenChange(false);
    toast.success(`Defect logged on ${tail} — aircraft now grounded (RED) pending maintenance triage.`);
    onReported?.(defect);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Report defect</DialogTitle>
            <DialogDescription>Capture the observation. Maintenance determines dispatch impact.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Aircraft</Label>
                <Select value={tail} onValueChange={(v: string) => setTail(v)} disabled={!!lockTail}>
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
            <DefectDescriptionField value={description} onChange={setDescription} placeholder="What was observed?" />
            <DefectSymptomField label="Symptom (optional)" value={symptom} onChange={setSymptom} placeholder="e.g. intermittent during climb, cleared after recycle" />

            <DefectCasField
              mode={casMode} onModeChange={setCasMode}
              message={casMessage} onMessageChange={setCasMessage}
              color={casColor} onColorChange={setCasColor}
              catalog={casCatalogForTail} fleetType={selectedType}
            />

            <DefectCmcCodeField value={cmcFaultCode} onChange={setCmcFaultCode} />

            <OccurredAtField valueUtc={occurredAtUtc} onChange={setOccurredAtUtc} />

            <DefectLocationSection
              locKind={locKind} onLocKindChange={setLocKind}
              cabinSeat={cabinSeat} onCabinSeatChange={setCabinSeat}
              zoneCode={zoneCode} onZoneCodeChange={setZoneCode}
              locFreetext={locFreetext} onLocFreetextChange={setLocFreetext}
            />

            <DefectAttachmentsField attachments={attachments} setAttachments={setAttachments} />

            <p className="rounded bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
              Reported as airworthiness-affecting by default — the aircraft goes <strong>RED</strong> until maintenance defers it under the MEL or rectifies it. Pilots cannot self-clear.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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
    </>
  );
}
