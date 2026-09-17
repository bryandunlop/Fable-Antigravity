// Scheduling's view of the confirmation email: the words on the left, a live preview on the
// right — the same arrangement as the passenger briefing email's page (trips/pages/EmailPage).
//
// The preview renders against a REAL submission, not lorem ipsum, because most of this mail
// is generated and the only way to judge the wording is to read it wrapped around an actual
// form. Edits are live in the preview and only reach the store on Save.

import { useMemo, useState } from 'react';
import { Mail, RotateCcw, Check, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { usePassengerForms, type FormSubmission } from '../contexts/PassengerFormContext';
import { useReceiptTemplate } from './receiptTemplateStore';
import {
  renderReceipt, type ReceiptBlockId, type ReceiptTemplate, type RenderedReceipt,
} from './engine/formReceiptEmail';

/** What each auto block builds itself from — so the editor explains why it has no textarea. */
const AUTO_NOTE: Partial<Record<ReceiptBlockId, string>> = {
  check: 'Built from the submission: the manifest name and the travel date — the two only the passenger can verify.',
  checklist: 'Built from the form: how many fields each section holds and how many came back. Labels only, never answers.',
  documents: 'Built from the document dates and uploads, with a warning on anything expired or expiring.',
  gaps: 'Built from the optional fields left blank.',
};

/** Shown when the demo has no submissions to preview against. */
const SAMPLE: FormSubmission = {
  id: 'SUB-SAMPLE',
  templateId: 'TPL-INTERNATIONAL-001',
  templateVersion: 1,
  formType: 'international',
  passengerInfo: { name: 'Maria Garcia', email: 'maria.garcia@company.com' },
  responses: { firstName: 'Maria', middleName: 'Elena', lastName: 'Garcia', tripDate: '2026-10-14' },
  submittedAt: new Date().toISOString(),
  submittedVia: 'public-link',
  status: 'new',
  dataAge: 0,
  isOutdated: false,
  hasExpiringDocuments: false,
};

/**
 * The mail as a passenger sees it. Shared by this panel and the submission detail on the
 * Passenger Forms page, so what scheduling previews and what was actually sent are drawn by
 * the same code.
 */
export function ReceiptPreview({ email, sentAtUtc }: { email: RenderedReceipt; sentAtUtc?: string | null }) {
  return (
    <div className="rounded-md border bg-card">
      <div className="border-b p-4 text-sm space-y-0.5">
        <div>
          <span className="text-muted-foreground">To </span>
          {email.to
            ? <span className="font-medium">{email.to}</span>
            : <span className="text-orange-600 dark:text-orange-400">no address on the form — this one cannot go</span>}
        </div>
        <div><span className="text-muted-foreground">Subject </span><span className="font-medium">{email.subject}</span></div>
        <div className="text-xs text-muted-foreground">
          Reply-to {email.replyTo}
          {sentAtUtc === null && ' · not sent'}
          {sentAtUtc ? ` · sent ${new Date(sentAtUtc).toLocaleString()}` : ''}
        </div>
      </div>

      <div className={`px-5 py-4 ${email.hero.needsAction ? 'bg-orange-500/10' : 'bg-primary text-primary-foreground'}`}>
        <div className="text-xs uppercase tracking-wide opacity-70">{email.hero.received}</div>
        <div className="mt-1 text-xl font-bold leading-tight">{email.hero.headline}</div>
        <div className="mt-1 text-sm opacity-80">Reference {email.hero.reference}</div>
      </div>

      <div className="space-y-4 p-5">
        {email.blocks.map((b) => (
          <div key={b.id}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm font-semibold text-primary">{b.title}</div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {b.source === 'auto' ? 'auto from the form' : 'template'}
              </span>
            </div>
            {b.lines ? (
              <>
                <ul className="mt-1 space-y-1">
                  {b.lines.map((l, i) => (
                    <li
                      key={i}
                      className={`text-sm leading-relaxed ${l.tone === 'warn' ? 'font-medium text-orange-600 dark:text-orange-400' : l.tone === 'info' ? 'text-muted-foreground' : ''}`}
                    >
                      {l.tone === 'warn' ? '⚠ ' : '• '}{l.text}
                    </li>
                  ))}
                </ul>
                {/* Not a list item: bulleting it made a reassurance read as one more thing to do. */}
                {b.note && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.note}</p>}
              </>
            ) : (
              <p className="mt-1 text-sm leading-relaxed">{b.text}</p>
            )}
          </div>
        ))}
      </div>

      <p className="border-t p-4 text-xs text-muted-foreground">
        Global Flight Operations · demo preview, no mail leaves myGFO.
      </p>
    </div>
  );
}

export default function FormReceiptEmailPanel() {
  const { submissions, templates } = usePassengerForms();
  const { template: stored, saveReceiptTemplate, resetReceiptTemplate } = useReceiptTemplate();
  const [draft, setDraft] = useState<ReceiptTemplate>(stored);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const previewable = submissions.length ? submissions : [SAMPLE];
  const [previewId, setPreviewId] = useState<string>(previewable[0].id);
  const subject = previewable.find((s) => s.id === previewId) ?? previewable[0];

  const email = useMemo(() => {
    const form = templates.find((t) => t.id === subject.templateId);
    return renderReceipt(subject, form ?? { id: '', name: 'Travel form', version: 0, fields: [] }, draft);
  }, [subject, templates, draft]);

  function edit(fn: (t: ReceiptTemplate) => ReceiptTemplate) {
    setDraft(fn);
    setDirty(true);
    setSaved(false);
  }
  const setBlock = (id: ReceiptBlockId, patch: Partial<ReceiptTemplate['blocks'][number]>) =>
    edit((t) => ({ ...t, blocks: t.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));

  function save() {
    saveReceiptTemplate(draft);
    setDirty(false);
    setSaved(true);
  }
  function reset() {
    setDraft(resetReceiptTemplate());
    setDirty(false);
    setSaved(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold"><Mail className="h-5 w-5" />Confirmation email</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Goes out on its own the moment a form comes back — there is no send button and nobody
            has to remember. Editing here changes the next passenger's mail; a receipt already
            issued keeps the words it was sent with.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="flex items-center gap-1 text-sm text-green-600"><Check className="h-4 w-4" />Saved</span>}
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" />Restore defaults</Button>
          <Button size="sm" onClick={save} disabled={!dirty}>Save changes</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── the words ── */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="receipt-subject">Subject</Label>
            <Input id="receipt-subject" value={draft.subject} onChange={(e) => edit((t) => ({ ...t, subject: e.target.value }))} />
            <p className="text-xs text-muted-foreground">
              Tokens: <code>{'{{formName}}'}</code> <code>{'{{firstName}}'}</code> <code>{'{{name}}'}</code> <code>{'{{reference}}'}</code>.
              An empty one takes its comma with it.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receipt-replyto">Reply-to</Label>
            <Input id="receipt-replyto" value={draft.replyTo} onChange={(e) => edit((t) => ({ ...t, replyTo: e.target.value }))} />
          </div>

          {draft.blocks.map((b) => {
            const auto = AUTO_NOTE[b.id];
            return (
              <div key={b.id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Input
                    className="h-8 max-w-[18rem] font-medium"
                    value={b.title}
                    aria-label={`${b.id} heading`}
                    onChange={(e) => setBlock(b.id, { title: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    {auto && <Badge variant="outline" className="text-[10px]">auto</Badge>}
                    <Switch checked={b.enabled} aria-label={`${b.title} on`} onCheckedChange={(v: boolean) => setBlock(b.id, { enabled: v })} />
                  </div>
                </div>
                {auto ? (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Lock className="mt-0.5 h-3 w-3 shrink-0" />{auto}
                  </p>
                ) : (
                  <Textarea
                    rows={3}
                    value={b.body}
                    aria-label={`${b.title} text`}
                    onChange={(e) => setBlock(b.id, { body: e.target.value })}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── the preview ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="receipt-preview-pick">Previewing against</Label>
            <select
              id="receipt-preview-pick"
              className="h-8 max-w-[60%] truncate rounded border bg-background px-2 text-sm"
              value={previewId}
              onChange={(e) => setPreviewId(e.target.value)}
            >
              {previewable.map((s) => (
                <option key={s.id} value={s.id}>{s.passengerInfo.name} · {s.formType}</option>
              ))}
            </select>
          </div>
          <ReceiptPreview email={email} />
        </div>
      </div>
    </div>
  );
}
