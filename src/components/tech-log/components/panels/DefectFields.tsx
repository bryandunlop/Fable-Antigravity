import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { Paperclip, Camera, MapPin, X, Clock, MonitorDot, BookOpen } from 'lucide-react';
// D60 — the CAS catalog is derived in the documents module (that is where the knowledge and its
// forward-migrating store live). Pure functions and a type only: no context, no store, no provider
// requirement — see `useCasCatalog` for the read side.
import {
  matchCasCatalog, catalogEntriesForMessage, CAS_PICKER_LIMIT, type CasCatalogEntry,
} from '../../../documents/engine/casKnowledge';
import { CasChip } from '../CasChip';
import { mockSha256 } from '../../engine/signing';
import { newId } from '../../util/id';
import { ENTRY_ZONE_OPTIONS, entryZone, utcFromWallTime, wallTimeFromUtc, type EntryZoneMode } from '../../util/entryZone';
import { formatRegulatoryLabel } from '../../util/displayZone';
import type { Attachment, CasColor, DefectLocationKind } from '../../types';
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
 * "Shared" means the component lives here, NOT that both dialogs render it. Three of the eight are
 * mounted by `ReportDefectDialog` alone — the correction dialog has no control for them at all.
 *
 * **Here AND rendered by both dialogs — change once, both follow:** description
 * (`DefectDescriptionField`), symptom (`DefectSymptomField`), the CAS annunciation
 * (`DefectCasField` — D57 split the old conflated "Symptom / CAS" input into those two), the CMC
 * fault code (`DefectCmcCodeField`), and free-text location notes (`DefectLocationNotesField` —
 * standalone in the correction dialog, nested inside `DefectLocationSection` in the report dialog).
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

/**
 * D57 — the narrative half of what used to be one field labeled "Symptom / CAS". That single input
 * asked for two different things at once: a free-text account of what happened, and the CAS
 * annunciation, which is a structured fact with a color. Seeds like "GEAR amber CAS during climb"
 * show the result — the annunciation buried in prose where nothing can read it. The structured half
 * moved to `DefectCasField`; this stays free text.
 */
export function DefectSymptomField({ value, onChange, label = 'Symptom', placeholder }: {
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
 * LG-99 — the CMC/MAU fault code as the reporter read it off the maintenance-computer page.
 *
 * `Defect.cmcFaultCode` was added to the type by an earlier slice of this batch and shipped with
 * **zero writers and zero readers**: the field existed, nothing could set it, and the work card's
 * "start from the code the pilot reported" hint therefore had nothing to start from. This is that
 * missing input.
 *
 * ONE code here, a LIST on the work card. That is not an oversight to be tidied up later — they are
 * different facts. This is what the crew saw on one page at one moment; `WorkCard.cmcFaultCodes` is
 * what maintenance interrogated out of the box afterwards, which is routinely several codes.
 *
 * Hand-typed (D22). Nothing in this build sources a fault code from CAMP.
 */
export function DefectCmcCodeField({ value, onChange, label = 'CMC fault code (optional)', placeholder = 'e.g. 32-3120-04' }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor="defect-cmc-code">{label}</Label>
      <Input
        id="defect-cmc-code"
        className="mt-1"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/** Which of the three CAS states the reporter is describing (D57). */
export type CasMode = 'NONE' | 'MESSAGE' | 'OBSERVED';

const CAS_MODES: { mode: CasMode; label: string }[] = [
  { mode: 'NONE', label: 'None' },
  { mode: 'MESSAGE', label: 'CAS message' },
  { mode: 'OBSERVED', label: 'Observed (no CAS)' },
];

const CAS_COLORS: { value: CasColor; label: string }[] = [
  { value: 'WHITE', label: 'White' },
  { value: 'CYAN', label: 'Cyan' },
  { value: 'AMBER', label: 'Amber' },
  { value: 'RED', label: 'Red' },
];

/** The CAS half of a defect record. Never violates the D57 mutual exclusion — see `casValueFor`. */
export interface CasValue {
  casMessage: string | undefined;
  casColor: CasColor | undefined;
  casObserved: boolean | undefined;
}

/**
 * The single place the D57 mutual exclusion is enforced: `casMessage`+`casColor` and `casObserved`
 * are alternatives, and neither is required. "Observed (no CAS)" is a third STATE — the defect was
 * seen with no annunciation at all — not a fifth color, so it carries no message and no color.
 *
 * All three keys are ALWAYS present (possibly `undefined`) so that spreading the result over an
 * existing defect clears the branch not taken. The correction dialog does exactly that: without it,
 * correcting a mis-entered CAS message to "observed" would leave the old message behind and produce
 * a row claiming the crew both saw an annunciation and saw none.
 *
 * A blank message under `MESSAGE` yields no CAS rather than a colored empty one; the dialogs refuse
 * to sign in that state so it is never a silent drop.
 */
export function casValueFor(mode: CasMode, message: string, color: CasColor): CasValue {
  if (mode === 'OBSERVED') return { casMessage: undefined, casColor: undefined, casObserved: true };
  const trimmed = message.trim();
  if (mode === 'MESSAGE' && trimmed) return { casMessage: trimmed, casColor: color, casObserved: undefined };
  return { casMessage: undefined, casColor: undefined, casObserved: undefined };
}

/** True when the reporter chose "CAS message" but typed none — block signing rather than drop it. */
export const casEntryIncomplete = (mode: CasMode, message: string) => mode === 'MESSAGE' && !message.trim();

/** Recover the mode from a stored defect, for the correction dialog's initial state. */
export const casModeOf = (d: { casMessage?: string; casObserved?: boolean }): CasMode =>
  d.casMessage ? 'MESSAGE' : d.casObserved ? 'OBSERVED' : 'NONE';

/**
 * D57 — the structured CAS annunciation: a segmented choice between the three states, with the
 * message + color inputs revealed only under "CAS message".
 *
 * D60 — the message input is now fed by the per-fleet CAS catalog when one is available: a
 * type-scoped, substring-filtered list of curated messages, picking one of which fills in the
 * message AND its colour. The shape follows the MEL picker in `DeferralCreatePanel` (the in-module
 * precedent for a fleet-typed filtered list, cap included) rather than inventing a combobox — the
 * repo has exactly one `role="combobox"` and it is hard-wired to inventory state.
 *
 * **Free entry stays, and stays first-class.** The catalog will be incomplete for a long time, and a
 * pilot must be able to record an annunciation nobody has curated yet — that is what a defect report
 * is for. `catalog` is optional; with none the field is exactly the free-text control D57 shipped.
 * The picker is an aid to intake, never a constraint on it.
 *
 * The three states are **pressed toggles in a `role="group"`**, not a radiogroup — the same pattern
 * `DisplayZoneToggle` uses in `TechLogShell`. This was a hand-rolled `role="radiogroup"` of
 * `role="radio"` buttons, which announces "radio button, 1 of 3" and thereby promises arrow-key
 * navigation and a single tab stop; it had neither a key handler nor roving `tabIndex`, so the
 * arrow keys did nothing and all three sat in the tab order. `aria-pressed` makes no such promise
 * and needs no keyboard machinery beyond the button's own. Mutual exclusion is unchanged — it comes
 * from `mode` being one value, not from the ARIA role.
 */
export function DefectCasField({
  mode, onModeChange, message, onMessageChange, color, onColorChange, catalog = [], fleetType,
}: {
  mode: CasMode;
  onModeChange: (m: CasMode) => void;
  message: string;
  onMessageChange: (v: string) => void;
  color: CasColor;
  onColorChange: (c: CasColor) => void;
  /** D60 — curated messages for this tail's fleet type. Empty ⇒ free text only. */
  catalog?: CasCatalogEntry[];
  /** Display only, so the list says whose knowledge it is. */
  fleetType?: string;
}) {
  const [query, setQuery] = useState('');
  // Filter over the WHOLE catalog, then cap what is drawn. Search therefore reaches an entry past
  // the cap; the cap is a rendering limit, not a search limit, and the list says so below.
  const filtered = matchCasCatalog(catalog, query, Number.MAX_SAFE_INTEGER);
  const matches = filtered.slice(0, CAS_PICKER_LIMIT);
  // When the typed message IS a curated one, offer the entries that explain it. Read-only for the
  // pilot: "what maintenance knows about this message", not a second place to record the defect.
  //
  // ALL of them, not the first. A CAS message is not a key in the catalog (see
  // `catalogEntriesForMessage`) — an uncontrolled direct-publish class has no approval step where a
  // duplicate would be caught. Linking to whichever one sorted first would make the pointer depend
  // on doc-id order, which the reader has no way to know about.
  const known = catalogEntriesForMessage(catalog, message);

  /**
   * D60 fix pass — the colour follows the message, in BOTH directions.
   *
   * `casColor` is not decoration: `fir/engine/suggestions.ts` reads it on the safety fast path, and
   * `casValueFor` writes it straight onto a signed defect. Before this, `pick()` wrote a curated
   * colour and nothing took it back when the message was then hand-edited to a *different*
   * annunciation — so one entry's tier rode onto another entry's message. The converse was also
   * true: a message TYPED to exactly match a curated entry got the "what maintenance knows" deep
   * link but not the curated colour, so the form knew the right answer and declined to use it.
   *
   * The rule: **while the message matches a catalog entry the colour is that entry's; otherwise it
   * is whatever the reporter last chose in the select.** `manualColor` remembers that choice, so
   * editing a curated message away hands the reporter their own colour back instead of inventing
   * one — silently resetting an explicitly chosen RED to the AMBER default would be the same class
   * of bug pointing the other way. Adoption fires only when the message moves to a DIFFERENT entry,
   * so a reporter who deliberately overrides the tier on a curated message keeps their override.
   *
   * Free entry is untouched: a message no entry curates changes no colour by itself, which is
   * D60's stated position that the catalog is an aid to intake and never a constraint on it. So is
   * D57's mutual exclusion — this only ever moves `color`, and `casValueFor` remains the one place
   * `casMessage`/`casColor` and `casObserved` are made alternatives.
   */
  const manualColor = useRef(color);
  useEffect(() => {
    // Outside MESSAGE mode there is no curated colour in play, so whatever is held IS the
    // reporter's. This also re-baselines the ref when a parent resets the form without remounting.
    if (mode !== 'MESSAGE') manualColor.current = color;
  }, [mode, color]);

  const chooseColor = (c: CasColor) => {
    manualColor.current = c;
    onColorChange(c);
  };

  const changeMessage = (next: string) => {
    onMessageChange(next);
    const before = catalogEntriesForMessage(catalog, message);
    const after = catalogEntriesForMessage(catalog, next);
    if (after.length) {
      // Only when the curators AGREE. Two entries for one annunciation at different tiers is a
      // curation defect, and picking one of them to write onto a signed record would be the engine
      // guessing on a safety field — `casColor` feeds the FIR fast path. Left to the reporter.
      const agreed = after.every((e) => e.casColor === after[0].casColor) ? after[0].casColor : undefined;
      if (agreed && before[0]?.docId !== after[0].docId && agreed !== color) onColorChange(agreed);
      return;
    }
    // The message just stopped being the curated one whose colour is on screen — give the
    // reporter's own colour back rather than leave another annunciation's tier behind.
    if (before.length && color !== manualColor.current) onColorChange(manualColor.current);
  };

  const pick = (entry: CasCatalogEntry) => {
    onMessageChange(entry.casMessage);
    onColorChange(entry.casColor);
  };

  return (
    <div className="rounded-md border p-3">
      <Label className="flex items-center gap-1.5"><MonitorDot className="h-3.5 w-3.5" /> CAS annunciation</Label>
      <div role="group" aria-label="CAS annunciation" className="mt-2 inline-flex rounded-md border p-0.5">
        {CAS_MODES.map(o => (
          <button
            key={o.mode}
            type="button"
            aria-pressed={mode === o.mode}
            onClick={() => onModeChange(o.mode)}
            className={
              'rounded px-2.5 py-1 text-xs transition-colors ' +
              (mode === o.mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      {mode === 'MESSAGE' && (
        <>
          <div className="mt-2 flex gap-2">
            <Input
              aria-label="CAS message"
              placeholder="CAS message, e.g. R ENG CHIP"
              value={message}
              onChange={e => changeMessage(e.target.value)}
            />
            <select
              aria-label="CAS color"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={color}
              onChange={e => chooseColor(e.target.value as CasColor)}
            >
              {CAS_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {catalog.length > 0 && (
            <div className="mt-2 rounded-md border bg-muted/20 p-2">
              {/* The header used to print `catalog.length` beside a list capped at
                  CAS_PICKER_LIMIT, so a 26th curated message was invisible AND uncounted — the
                  number claimed the list was complete. Shown/total is stated instead, and the cap
                  is called out under the list when it bites. */}
              <Label htmlFor="cas-catalog-search" className="text-xs">
                Or pick from {fleetType ? `${fleetType} ` : ''}curated messages
                {filtered.length === catalog.length
                  ? ` (${matches.length} of ${catalog.length})`
                  : ` (${matches.length} of ${filtered.length} matching · ${catalog.length} curated)`}
              </Label>
              <Input
                id="cas-catalog-search"
                className="mt-1"
                placeholder="Filter by message, entry title or CMC code…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                {matches.map(e => (
                  <button
                    key={e.docId}
                    type="button"
                    onClick={() => pick(e)}
                    className={
                      'flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs hover:bg-accent/40 ' +
                      (e.casMessage === message ? 'border-primary bg-accent/40' : '')
                    }
                  >
                    <CasChip message={e.casMessage} color={e.casColor} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{e.title}</span>
                  </button>
                ))}
                {matches.length === 0 && (
                  <p className="p-1 text-xs text-muted-foreground">
                    Nothing curated matches — type it in above; the catalog is not the limit of what you can report.
                  </p>
                )}
              </div>
              {filtered.length > matches.length && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Showing the first {matches.length} of {filtered.length} matches — narrow the filter to
                  reach the rest. Filtering searches every curated entry, not just these.
                </p>
              )}
            </div>
          )}

          {known.length > 0 && (
            <div className="mt-2 space-y-1 text-xs">
              {known.map(entry => (
                <p key={entry.docId}>
                  <Link to={`/documents/${entry.docId}`} className="inline-flex items-center gap-1 underline">
                    <BookOpen className="h-3.5 w-3.5" /> What maintenance knows about {entry.casMessage}
                  </Link>
                  {known.length > 1 && <span className="text-muted-foreground"> — {entry.title}</span>}
                </p>
              ))}
              <p className="text-muted-foreground">
                Reference only; it does not change what you report.{' '}
                {known.length > 1
                  ? `${known.length} entries curate this message, so the colour is left to you — record what the flight deck showed.`
                  : 'The colour above is the curated one for this message; change it if the flight deck showed something else.'}
              </p>
            </div>
          )}
        </>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {mode === 'OBSERVED'
          ? 'Recorded as seen with no annunciation at all — that is a fact about the defect, not a missing field.'
          : 'Optional. Record the annunciation as the crew saw it; "Observed (no CAS)" says there was none.'}
      </p>
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
