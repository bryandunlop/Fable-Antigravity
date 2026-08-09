import { useState } from 'react';
import { toast } from 'sonner';
import { FileLock2, Upload } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { useDocuments, identityFor } from '../DocumentsContext';
import { classFor } from '../classes';
import { nextDocId, nextRevisionId, currentRevision } from '../engine/revisions';
import { sha256Hex } from '../engine/hashing';
import { formatBytes, receivedPlaceholderSections } from '../engine/provenance';
import { checksumForSections } from '../engine/blocks';
import { idbBlobStore } from '../store/blobStore';
import { operatorTodayIso } from '../../../lib/operatorDate';
import type { CarriageReason, Doc, DocRevision } from '../types';

const MAX_BYTES = 50 * 1024 * 1024;

const REASONS: { value: CarriageReason; label: string; hint: string }[] = [
  {
    value: 'required-onboard',
    label: 'Must be producible onboard',
    hint: 'The D195 MEL, an FSDO LOA — something an inspector can ask for on a ramp with no connectivity.',
  },
  {
    value: 'signature-attested',
    label: 'A signature depends on its content',
    hint: 'An (O)/(M) procedure text or placard wording rendered at signing.',
  },
];

/**
 * The permanent front door for received documents (D73, as corrected).
 *
 * Microsoft Graph is not the feature — myGFO holding the document is. Graph
 * would only remove this human step, and if P&G IT never grants access, myGFO
 * still does the whole job. So this path is built once at full quality rather
 * than as an interim stopgap.
 *
 * The routing test is asked as a question, not inferred: a document is only held
 * as bytes if a signature depends on it or it must be carried. Everything else
 * is a pointer, and the dialog says so.
 */
export function IngestDialog({
  open,
  onOpenChange,
  doc,
  userRole,
  additionalRoles = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Supplied to add a revision to an existing received document; omitted to create one. */
  doc?: Doc;
  userRole: string;
  additionalRoles?: string[];
}) {
  const { state, createDoc, ingestReceivedRevision } = useDocuments();
  const [file, setFile] = useState<File | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [title, setTitle] = useState(doc?.title ?? '');
  const [revision, setRevision] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(operatorTodayIso());
  const [reason, setReason] = useState<CarriageReason>('required-onboard');
  const [sourceLabel, setSourceLabel] = useState('');
  const [category, setCategory] = useState('Airworthiness');

  const cfg = classFor('received-document');
  const { userId, userName } = identityFor(userRole);

  const reset = () => {
    setFile(null); setSha(null); setRevision(''); setSourceLabel('');
    if (!doc) setTitle('');
  };

  const pick = async (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      toast.error(`That file is ${formatBytes(picked.size)} — the limit is ${formatBytes(MAX_BYTES)}.`);
      return;
    }
    setHashing(true);
    try {
      // Hash before anything else. The digest is the claim; everything the
      // maintainer types afterwards is metadata about bytes already pinned.
      const bytes = await picked.arrayBuffer();
      setSha(await sha256Hex(bytes));
      setFile(picked);
      if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ''));
    } catch {
      toast.error('Could not read that file.');
    } finally {
      setHashing(false);
    }
  };

  const freeze = async () => {
    if (!file || !sha) { toast.error('Choose a file first.'); return; }
    if (!title.trim()) { toast.error('Give the document a title.'); return; }
    if (!revision.trim()) { toast.error('Name the revision, as the issuer numbers it.'); return; }

    const targetDoc: Doc = doc ?? {
      id: nextDocId(cfg, state.docs),
      classId: 'received-document',
      title: title.trim(),
      category,
      roles: ['all'],
      ownerUserId: userId,
      ownerName: userName,
      tags: [],
      isPinned: false,
      isArchived: false,
      reviewCycleDays: cfg.defaultReviewCycleDays,
      createdDate: operatorTodayIso(),
    };

    const blobKey = `${targetDoc.id}-${sha.slice(0, 16)}`;
    await idbBlobStore.put({
      key: blobKey,
      bytes: await file.arrayBuffer(),
      mimeType: file.type || 'application/octet-stream',
      filename: file.name,
    });

    const nowUtc = new Date().toISOString();
    const attachment = {
      blobKey,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      byteLength: file.size,
      sha256: sha,
    };
    const provenance = {
      origin: 'received-copy' as const,
      attachment,
      ingestedAtUtc: nowUtc,
      ingestedByUserId: userId,
      ingestedByName: userName,
      sourceLabel: sourceLabel.trim() || undefined,
      carriageReason: reason,
    };
    const sections = receivedPlaceholderSections(targetDoc.id, attachment, provenance);
    const hasPrior = !!currentRevision(targetDoc.id, state.revisions);

    const rev: DocRevision = {
      id: doc ? nextRevisionId(targetDoc.id, state.revisions) : `${targetDoc.id}-r1`,
      docId: targetDoc.id,
      revision: revision.trim(),
      status: 'draft',
      sections,
      changeSummary: hasPrior ? `Received ${file.name} — a new set of bytes from the issuer.` : '',
      effectiveDate,
      authorUserId: userId,
      authorName: userName,
      requireAcknowledgment: true,
      ackLevel: cfg.defaultAckLevel,
      mockChecksum: checksumForSections(sections),
      provenance,
    };

    if (doc) {
      ingestReceivedRevision(rev, userRole, additionalRoles);
    } else {
      // A brand-new received document still enters as a draft and rides
      // four-eyes; createDoc is the only way to bring the identity row with it.
      createDoc(targetDoc, rev, [userRole, ...additionalRoles]);
    }
    toast.success('Frozen as a draft — it publishes once a second pair of eyes approves it.');
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileLock2 className="h-5 w-5" /> {doc ? `New revision of ${doc.title}` : 'Hold a received document'}
          </DialogTitle>
          <DialogDescription>
            myGFO computes its own SHA-256 over the bytes you upload, freezes them, and caches
            them for offline reading. Hold a document this way only when a signature depends on
            its content or it must be producible onboard — otherwise link to it instead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ingest-file">File</Label>
            <Input
              id="ingest-file"
              type="file"
              accept=".pdf,.docx,application/pdf"
              className="mt-1"
              disabled={hashing}
              onChange={(e) => void pick(e.target.files?.[0])}
            />
            {hashing && <p className="mt-1 text-xs text-muted-foreground">Hashing…</p>}
            {file && sha && (
              <p className="mt-1.5 rounded-md bg-muted/50 p-2 font-mono text-[11px] break-all">
                {file.name} · {formatBytes(file.size)}
                <br />
                SHA-256 {sha}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ingest-title">Title</Label>
              <Input id="ingest-title" className="mt-1" value={title} disabled={!!doc}
                onChange={(e) => setTitle(e.target.value)} placeholder="D195 MEL" />
            </div>
            <div>
              <Label htmlFor="ingest-rev">Revision, as the issuer numbers it</Label>
              <Input id="ingest-rev" className="mt-1" value={revision}
                onChange={(e) => setRevision(e.target.value)} placeholder="15" />
            </div>
            <div>
              <Label htmlFor="ingest-eff">Effective date</Label>
              <Input id="ingest-eff" type="date" className="mt-1" value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            {!doc && (
              <div>
                <Label htmlFor="ingest-cat">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="ingest-cat" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cfg.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label>Why is myGFO holding the bytes?</Label>
            <div className="mt-1 space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer gap-2 rounded-md border p-2.5 text-sm ${
                    reason === r.value ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="carriage-reason"
                    className="mt-1"
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  <span>
                    <span className="font-medium">{r.label}</span>
                    <span className="block text-xs text-muted-foreground">{r.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="ingest-source">Where did it come from?</Label>
            <Textarea
              id="ingest-source"
              className="mt-1"
              rows={2}
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="P&G SharePoint — Flight Ops / MEL, or: FSDO letter received 2 Jun 2026"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => void freeze()} disabled={!file || !sha || hashing}>
              <Upload className="mr-1.5 h-4 w-4" /> Freeze as a draft revision
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
