import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Paperclip, Camera, MapPin, X, Clock } from 'lucide-react';
import { mockSha256 } from '../../engine/signing';
import { newId } from '../../util/id';
import { ENTRY_ZONE_OPTIONS, entryZone, utcFromWallTime, wallTimeFromUtc, type EntryZoneMode } from '../../util/entryZone';
import { formatRegulatoryLabel } from '../../util/displayZone';
import type { Attachment, DefectLocationKind } from '../../types';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';

/**
 * *Some* of the field internals of a defect record, as small shared pieces.
 *
 * Both places that write defect content compose these: `ReportDefectDialog` (a new signed defect)
 * and the correction/supersede dialog on the Defects page (a superseding insert over an existing
 * one). They used to be hand-rolled copies of each other, so every field change had to be made
 * more than once and the copies drifted.
 *
 * "Shared" means the component lives here, NOT that both dialogs render it. Three of the six are
 * mounted by `ReportDefectDialog` alone — the correction dialog has no control for them at all.
 *
 * **Here AND rendered by both dialogs — change once, both follow:** description
 * (`DefectDescriptionField`), symptom/CAS (`DefectSymptomField`), and free-text location notes
 * (`DefectLocationNotesField` — standalone in the correction dialog, nested inside
 * `DefectLocationSection` in the report dialog).
 *
 * **Here but rendered by `ReportDefectDialog` ONLY:** the occurrence timestamp (`OccurredAtField`),
 * the structured-location box (`DefectLocationSection`), and attachments
 * (`DefectAttachmentsField`). A correction cannot restate when the defect was noticed — the
 * occurrence instant is carried forward from the superseded row — so do not describe these as
 * something "both dialogs follow".
 *
 * **NOT here — still hand-rolled separately in each dialog:** the aircraft select (report dialog
 * only), and the ATA chapter select (written out twice). Changing the ATA select means editing
 * `ReportDefectDialog.tsx` *and* the correction dialog in `pages/Defects.tsx`. Grep before you
 * assume a defect field lives in this file — an earlier version of this comment claimed everything
 * was shared, which was not true and was one removed-field away from shipping a dialog bound to a
 * property that no longer existed.
 */

export function DefectDescriptionField({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>Description</Label>
      <Textarea className="mt-1" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function DefectSymptomField({ value, onChange, label = 'Symptom / CAS', placeholder }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/**
 * D56 — when the problem was *noticed*, which is not when the report is *filed*. Defaults to now and
 * is back-datable, because a defect seen at 2330Z and written up the next morning otherwise starts
 * its MEL repair clock a full calendar day late (`DeferralCreatePanel` defaults the PL-25 day of
 * discovery from this value).
 *
 * The digits are typed in one of three zones — UTC, Eastern, or the device's own — and stored as a
 * UTC instant. Switching the zone is a LENS, not a re-interpretation: the stored instant is
 * unchanged and the digits re-render, mirroring how `displayZone.ts` treats the same instant on the
 * read side. The UTC readback under the field makes that unambiguous.
 */
export function OccurredAtField({ valueUtc, onChange }: {
  valueUtc: string;
  onChange: (utcIso: string) => void;
}) {
  const [mode, setMode] = useState<EntryZoneMode>('UTC');
  const zone = entryZone(mode);

  return (
    <div>
      <Label htmlFor="defect-occurred-at" className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> When was it noticed?
      </Label>
      <div className="mt-1 flex gap-2">
        <Input
          id="defect-occurred-at"
          type="datetime-local"
          value={wallTimeFromUtc(valueUtc, zone)}
          onChange={e => {
            // A half-typed value parses to null; keep the last good instant rather than storing junk.
            const utc = utcFromWallTime(e.target.value, zone);
            if (utc) onChange(utc);
          }}
        />
        <select
          aria-label="Occurrence entry timezone"
          className="rounded-md border bg-background px-2 py-1 text-sm"
          value={mode}
          onChange={e => setMode(e.target.value as EntryZoneMode)}
        >
          {ENTRY_ZONE_OPTIONS.map(o => <option key={o.mode} value={o.mode}>{o.label}</option>)}
        </select>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Stored as {formatRegulatoryLabel(valueUtc, 'UTC', 'UTC')}. Back-date it if the problem was seen
        earlier — this, not the filing time, starts the MEL repair clock if the defect is deferred.
      </p>
    </div>
  );
}

/**
 * Free-text location notes. Inside the full Location box the placeholder is the label, so `label`
 * is optional; the correction dialog shows the field on its own and labels it.
 */
export function DefectLocationNotesField({ value, onChange, label, className, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}) {
  const input = <Input className={className} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
  return label ? <div><Label>{label}</Label>{input}</div> : input;
}

/** Structured location (§17.2) — kind, the kind-specific identifier, and free-text notes. */
export function DefectLocationSection({
  locKind, onLocKindChange,
  cabinSeat, onCabinSeatChange,
  zoneCode, onZoneCodeChange,
  locFreetext, onLocFreetextChange,
}: {
  locKind: DefectLocationKind;
  onLocKindChange: (v: DefectLocationKind) => void;
  cabinSeat: string;
  onCabinSeatChange: (v: string) => void;
  zoneCode: string;
  onZoneCodeChange: (v: string) => void;
  locFreetext: string;
  onLocFreetextChange: (v: string) => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location</Label>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Select value={locKind} onValueChange={(v: string) => onLocKindChange(v as DefectLocationKind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OTHER">General / system</SelectItem>
            <SelectItem value="CABIN">Cabin (LOPA seat)</SelectItem>
            <SelectItem value="STRUCTURAL">Structural (zone)</SelectItem>
          </SelectContent>
        </Select>
        {locKind === 'CABIN' && <Input placeholder="Seat, e.g. 12A" value={cabinSeat} onChange={e => onCabinSeatChange(e.target.value)} />}
        {locKind === 'STRUCTURAL' && <Input placeholder="Zone, e.g. WING-L-STA-340" value={zoneCode} onChange={e => onZoneCodeChange(e.target.value)} />}
      </div>
      <DefectLocationNotesField className="mt-2" placeholder="Location notes (optional)" value={locFreetext} onChange={onLocFreetextChange} />
    </div>
  );
}

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

/**
 * Photos / attachments. Digests only are folded into the signed payload (AC 120-78B) — the caller
 * owns the attachment list so it can build that payload, which is why this takes the state setter
 * rather than a plain value/onChange pair.
 */
export function DefectAttachmentsField({ attachments, setAttachments }: {
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
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
  );
}
