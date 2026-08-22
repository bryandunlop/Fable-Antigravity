import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertOctagon, AlertTriangle, Check, FileText, Loader2, Upload } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { newId } from '../util/id';
import type { AircraftType, MelItem, MelSection, PendingApproval } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { readPdfText, pageForItem, type PdfText } from '../engine/melImport/readPdf';
import { parseMelDocument, type ParseResult } from '../engine/melImport/parse';
import { checkImport, type CheckImportResult } from '../engine/melImport/checks';
import { buildImportPayload } from '../engine/melImport/apply';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

/**
 * Import a whole approved D195 MEL revision by uploading the PDF (D95).
 *
 * The screen exists to support ONE human judgement — "this file is the approved MEL" —
 * and to make everything else a machine's job. It deliberately does not ask anyone to
 * review 495 rows: the change tally is a sanity check on the attestation ("a correct
 * upload that rewrote most of the catalog would be the wrong file"), not a review queue.
 */
const TYPES: AircraftType[] = ['G650ER', 'G500', 'G800'];

type Stage =
  | { phase: 'idle' }
  | { phase: 'reading'; page: number; total: number }
  | { phase: 'error'; message: string }
  | { phase: 'read'; fileName: string; text: PdfText; parsed: ParseResult; result: CheckImportResult };

export default function AdminMelImport() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const canPropose = user.role === 'MAINTENANCE';

  const [type, setType] = useState<AircraftType>('G650ER');
  const [stage, setStage] = useState<Stage>({ phase: 'idle' });
  const [evidenceRef, setEvidenceRef] = useState('');
  const [cleared, setCleared] = useState<string[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Items an aircraft is currently dispatching on — a revision that withdraws one must say so. */
  const liveDeferralItemIds = useMemo(
    () =>
      state.deferrals
        .filter(d => d.status === 'ACTIVE' || d.status === 'PENDING_PLACARD')
        .map(d => d.melItemId),
    [state.deferrals],
  );

  const onFile = async (file: File) => {
    setStage({ phase: 'reading', page: 0, total: 0 });
    setCleared([]);
    setOpenRow(null);
    try {
      const { text } = await readPdfText(await file.arrayBuffer(), (page, total) =>
        setStage({ phase: 'reading', page, total }),
      );
      const parsed = parseMelDocument(text.lines, type);
      const result = checkImport({
        lines: text.lines,
        parsed,
        selectedType: type,
        currentCatalog: state.melItems,
        melItemIdsWithLiveDeferrals: liveDeferralItemIds,
      });
      setStage({ phase: 'read', fileName: file.name, text, parsed, result });
    } catch (e) {
      setStage({ phase: 'error', message: e instanceof Error ? e.message : 'Could not read this file.' });
    }
  };

  const read = stage.phase === 'read' ? stage : null;
  const confirms = read?.result.checks.filter(c => c.severity === 'CONFIRM') ?? [];
  const allCleared = confirms.every(c => cleared.includes(c.id));
  const canSubmit = Boolean(read) && !read!.result.blocked && allCleared && evidenceRef.trim().length > 0;

  const submit = () => {
    if (!read || !canSubmit) return;
    const { parsed, result, fileName } = read;
    const payload = buildImportPayload(result.diff, parsed.items);
    const sections = [...new Set(parsed.items.map(i => i.melSection ?? 'ONE'))] as MelSection[];
    const now = new Date().toISOString();

    const pending: PendingApproval = {
      id: newId('appr'),
      kind: 'MEL_REVISION_IMPORT',
      aircraftType: type,
      revision: parsed.revision!,
      effectiveDate: parsed.effectiveDate!,
      evidenceRef: evidenceRef.trim(),
      fileName,
      sections,
      added: payload.added,
      changed: payload.changed,
      removedIds: payload.removedIds,
      unchangedCount: payload.unchangedCount,
      stamps: payload.stamps,
      acknowledged: cleared,
      summary:
        `Import ${type} D195 ${parsed.revision} (${parsed.effectiveDate}) — ` +
        `${payload.added.length} added, ${payload.changed.length} changed, ` +
        `${payload.removedIds.length} withdrawn, ${payload.unchangedCount} unchanged`,
      proposedByOid: user.oid,
      proposedAtUtc: now,
      status: 'PENDING',
    };

    dispatch({ type: 'PROPOSE_CHANGE', payload: pending });
    dispatch({
      type: 'ADD_AUDIT',
      payload: {
        id: newId('aud'),
        actorOid: user.oid,
        action: 'MEL_REVISION_IMPORT_PROPOSED',
        entityType: 'MelItem',
        entityId: `${type}-${parsed.revision}`,
        atUtc: now,
        summary: `${pending.summary} — attested against FSDO LOA ${evidenceRef.trim()}; awaiting a separate approver`,
      },
    });
    toast.success('Attested and sent for approval.');
    setStage({ phase: 'idle' });
    setEvidenceRef('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <TechLogShell
      title="Admin · Import MEL revision"
      subtitle="Upload the approved D195 PDF. You attest the document; myGFO checks the parse. A separate approver signs before anything is written."
      actions={
        <Select value={type} onValueChange={(v: string) => { setType(v as AircraftType); setStage({ phase: 'idle' }); }}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      }
    >
      {!canPropose && (
        <Card className="mb-3"><CardContent className="p-3 text-sm text-muted-foreground">
          MEL import is a maintenance function. You are signed in as {user.role.toLowerCase()}.
        </CardContent></Card>
      )}

      <Card className="mb-3">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
          />
          <Button disabled={!canPropose || stage.phase === 'reading'} onClick={() => fileRef.current?.click()}>
            {stage.phase === 'reading'
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading…</>
              : <><Upload className="mr-2 h-4 w-4" />Choose the approved {type} MEL</>}
          </Button>
          {stage.phase === 'reading' && stage.total > 0 && (
            <span className="text-sm text-muted-foreground">page {stage.page} of {stage.total}</span>
          )}
          {read && <span className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" />{read.fileName}</span>}
        </CardContent>
      </Card>

      {stage.phase === 'error' && (
        <Card className="mb-3 border-destructive"><CardContent className="p-4 text-sm">
          <div className="mb-1 font-medium text-destructive">This file could not be read</div>
          {stage.message}
        </CardContent></Card>
      )}

      {read && (
        <>
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <Card><CardContent className="p-4">
              <div className="mb-2 text-xs text-muted-foreground">Read from the document, not the filename</div>
              <Field label="Aircraft" value={read.result.detectedAircraft.join(' / ') || 'not stated'} />
              <Field label="Revision" value={read.parsed.revision ?? '—'} />
              <Field label="Effective" value={read.parsed.effectiveDate ?? '—'} />
              <Field label="Sections found" value={[...new Set(read.parsed.items.map(i => i.melSection ?? 'ONE'))].join(' · ') || '—'} />
              <Field label="Pages read" value={`${read.text.pageCount}`} />
              <Field label="Items parsed" value={`${read.parsed.items.length}`} />
            </CardContent></Card>

            <Card><CardContent className="p-4">
              <div className="mb-2 text-xs text-muted-foreground">Checks</div>
              {read.result.checks.length === 0 && (
                <div className="flex items-start gap-2 py-1 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Every page parsed, the aircraft matches, and no column was unreadable.</span>
                </div>
              )}
              {read.result.checks.map(c => (
                <div key={c.id} className="flex items-start gap-2 py-1.5 text-sm">
                  {c.severity === 'BLOCK'
                    ? <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                  <div className="min-w-0">
                    <div className="font-medium">{c.title}</div>
                    <div className="whitespace-pre-line text-xs text-muted-foreground">{c.detail}</div>
                    {c.severity === 'CONFIRM' && (
                      <label className="mt-1 flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={cleared.includes(c.id)}
                          onChange={e => setCleared(p => e.target.checked ? [...p, c.id] : p.filter(x => x !== c.id))}
                        />
                        I have checked this against the document
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </CardContent></Card>
          </div>

          <Card className="mb-3"><CardContent className="p-4">
            <div className="mb-2 text-xs text-muted-foreground">What this revision changes</div>
            <div className="mb-1 flex flex-wrap gap-2">
              <Badge variant="outline">{read.result.diff.unchanged} unchanged</Badge>
              <Badge variant="outline">{read.result.diff.changed.length} changed</Badge>
              <Badge variant="outline">{read.result.diff.added.length} added</Badge>
              <Badge variant="outline">{read.result.diff.removed.length} withdrawn</Badge>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              A correct upload that rewrote most of the catalog would be the wrong file. This is a check on
              the attestation, not a queue to work through — nobody is asked to read every row.
            </p>
            <ChangeList read={read} openRow={openRow} setOpenRow={setOpenRow} />
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <div className="mb-2 text-xs text-muted-foreground">You are attesting to the document, not to {read.parsed.items.length} rows</div>
            <p className="mb-3 border-l-2 border-primary/40 pl-3 text-sm">
              This file is the approved D195 Minimum Equipment List for the {type},{' '}
              {read.parsed.revision ?? '—'}, dated {read.parsed.effectiveDate ?? '—'}, issued to P&amp;G under
              the Letter of Authorization below.
            </p>
            <div className="mb-3 max-w-sm">
              <Label htmlFor="loa" className="text-xs">FSDO LOA reference</Label>
              <Input id="loa" value={evidenceRef} onChange={e => setEvidenceRef(e.target.value)} placeholder="LOA-91.213-…" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!canPropose || !canSubmit} onClick={submit}>Attest and send for approval</Button>
              <span className="text-xs text-muted-foreground">
                {read.result.blocked
                  ? 'Unavailable — a blocking check is unresolved.'
                  : !allCleared
                    ? 'Confirm the flagged items above first.'
                    : !evidenceRef.trim()
                      ? 'The FSDO LOA reference is required.'
                      : 'Then the DOM approves. You cannot approve your own upload.'}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Nothing is written to the catalog until the second signature.
            </p>
          </CardContent></Card>
        </>
      )}
    </TechLogShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

/** The changed/added/withdrawn rows, each openable beside the document text it came from. */
function ChangeList({
  read,
  openRow,
  setOpenRow,
}: {
  read: Extract<Stage, { phase: 'read' }>;
  openRow: string | null;
  setOpenRow: (v: string | null) => void;
}) {
  const rows = [
    ...read.result.diff.changed.map(c => ({
      key: c.after.subItemNumber,
      label: c.fields.length === 1 ? `${c.fields[0]} changed` : `${c.fields.length} fields changed`,
      detail: c.fields.map(f => `${f}: ${fmt(c.before[f as keyof MelItem])} → ${fmt(c.after[f as keyof MelItem])}`).join('\n'),
    })),
    ...read.result.diff.added.map(m => ({ key: m.subItemNumber, label: 'New item', detail: m.title })),
    ...read.result.diff.removed.map(m => ({ key: m.subItemNumber, label: 'Withdrawn — becomes superseded', detail: m.title })),
  ];

  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Nothing in this document differs from the catalog.</p>;

  return (
    <div className="divide-y rounded-md border">
      {rows.slice(0, 40).map(r => {
        const page = pageForItem(read.text, r.key);
        return (
          <div key={r.key} className="p-2.5 text-sm">
            <button className="flex w-full items-baseline gap-3 text-left" onClick={() => setOpenRow(openRow === r.key ? null : r.key)}>
              <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{r.key}</span>
              <span className="min-w-0 flex-1">{r.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{page ? `page ${page}` : 'page unknown'}</span>
            </button>
            {openRow === r.key && (
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">{r.detail}</pre>
                <pre className="overflow-x-auto rounded bg-muted p-2 font-mono text-[11px] leading-relaxed">
                  {sourceLines(read.text, r.key).join('\n') || 'Not found in the document text.'}
                </pre>
              </div>
            )}
          </div>
        );
      })}
      {rows.length > 40 && <div className="p-2.5 text-xs text-muted-foreground">Showing 40 of {rows.length}.</div>}
    </div>
  );
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

/** The verbatim document lines a row was read from — nothing is inferred, so this is the proof. */
function sourceLines(text: PdfText, subItemNumber: string): string[] {
  const i = text.lines.findIndex(l => l.trimStart().startsWith(subItemNumber));
  return i === -1 ? [] : text.lines.slice(i, i + 6);
}
