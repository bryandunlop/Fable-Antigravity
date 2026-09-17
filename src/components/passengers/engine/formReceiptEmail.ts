// The form-receipt email: the automatic "we have it" a passenger gets the moment their
// travel form comes back.
//
// Built in the shape of the passenger briefing email (trips/engine/briefingEmail.ts): the
// TEMPLATE is a setting scheduling edits once, the RECEIPT is rendered per submission from
// the form that was actually filled in, and the render is frozen onto the submission so a
// later wording change cannot rewrite what a passenger was already told.
//
// Two differences from the briefing email, both deliberate:
//
//  - There is no draft, no send list and no dead-man switch. A receipt is automatic by
//    definition — it is issued at the moment the form lands, or not at all.
//  - It quotes almost nothing back. These forms carry passport and visa numbers, T numbers,
//    place of birth, home address, emergency contacts and disability/medical answers. A
//    confirmation that echoed those would mirror the lot into an inbox we do not control,
//    which is the opposite of the "read through, mirror nothing" default standing over
//    passenger PII. So the receipt confirms fields BY LABEL and quotes only the short
//    allowlist below.
//
// Pure. No React, no storage.

import { formatDateOnly, OPERATOR_TIME_ZONE } from '../../../lib/operatorDate';

// ---- what the engine needs from the record --------------------------------
// Structural, not imported from PassengerFormContext: the context imports the engine, and
// the engine describing its own inputs keeps that one-way. The real FormTemplate /
// FormSubmission already satisfy these.

export interface ReceiptField {
  id: string;
  label: string;
  required: boolean;
  section?: string;
}

export interface ReceiptFormTemplate {
  id: string;
  name: string;
  version: number;
  fields: ReceiptField[];
}

export interface ReceiptDocumentExpiration {
  fieldLabel: string;
  documentType: string;
  /** Date-only, YYYY-MM-DD. */
  expirationDate: string;
  daysUntilExpiration: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

export interface ReceiptSubmission {
  id: string;
  passengerInfo: { name: string; email: string };
  responses: Record<string, unknown>;
  submittedAt: string;
  documentExpirations?: ReceiptDocumentExpiration[];
  uploadedDocuments?: { documentName: string; fileName: string }[];
}

// ---- the template ---------------------------------------------------------

export type ReceiptBlockId =
  | 'thanks' | 'check' | 'checklist' | 'documents' | 'gaps' | 'next' | 'privacy' | 'contact';

export interface ReceiptTemplateBlock {
  id: ReceiptBlockId;
  title: string;
  enabled: boolean;
  /** Free text for the editable blocks. Auto blocks render from the submission and ignore it. */
  body: string;
}

export interface ReceiptTemplate {
  /** Tokens: {{formName}} {{firstName}} {{name}} {{reference}}. */
  subject: string;
  blocks: ReceiptTemplateBlock[];
  /** The address a reply goes to. A display address, never a credential. */
  replyTo: string;
}

/** Blocks rendered from the submission; their `body` is ignored, as in the briefing email. */
const AUTO_BLOCKS: ReceiptBlockId[] = ['check', 'checklist', 'documents', 'gaps'];

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplate = {
  subject: 'We have your {{formName}}, {{firstName}}',
  replyTo: 'scheduling@company.com',
  blocks: [
    { id: 'thanks', title: 'Thank you', enabled: true, body: 'Thank you for filling this in. This is the only confirmation we send, so keep it if you like — everything below is what reached us.' },
    { id: 'check', title: 'Please check these', enabled: true, body: '' },
    { id: 'checklist', title: 'Section by section', enabled: true, body: '' },
    { id: 'documents', title: 'Your documents', enabled: true, body: '' },
    { id: 'gaps', title: 'Still blank', enabled: true, body: '' },
    { id: 'next', title: 'What happens next', enabled: true, body: 'Scheduling checks your form within one business day. You only hear from us again if something is missing or a document needs renewing — no news is good news, and there is nothing for you to chase.' },
    // True of this system, not a nicety: a submission passes 730 days and is retired
    // automatically, which is why we come back and ask rather than fly on stale data.
    { id: 'privacy', title: 'How we hold it', enabled: true, body: 'Your answers stay inside flight operations and are used to build the manifest and look after you on board. We keep them for two years, then retire them and ask you to confirm afresh. We never put passport or visa numbers in an email.' },
    { id: 'contact', title: 'Questions', enabled: true, body: 'Reply to this message and it reaches scheduling. If it is urgent, call the flight department directly.' },
  ],
};

// ---- what a receipt may quote back ----------------------------------------

/**
 * The only response values a receipt repeats back. An ALLOWLIST, not a denylist, on purpose:
 * the form templates are editable (`updateTemplate`), so a denylist would quietly start
 * leaking the day someone adds "Green Card Number" — the new field would simply not be on
 * the list of things to hide. An allowlist fails the safe way: an unknown field is confirmed
 * by its label and nothing more.
 *
 * What is on it earns its place by being worth checking: a name misspelt against a passport
 * and a wrong trip date are the two mistakes that strand someone at a gate, and neither is
 * worth anything to a stranger reading the mail.
 */
export const QUOTED_FIELD_IDS: readonly string[] = ['firstName', 'middleName', 'lastName', 'tripDate', 'requestDate'];

export const isQuotable = (fieldId: string): boolean => QUOTED_FIELD_IDS.includes(fieldId);

/** Most optional blanks we list before summarising the rest as a count. */
export const MAX_LISTED_GAPS = 4;

// ---- render ---------------------------------------------------------------

export type ReceiptTone = 'ok' | 'info' | 'warn';

export interface ReceiptLine {
  text: string;
  tone: ReceiptTone;
}

export interface RenderedReceiptBlock {
  id: ReceiptBlockId;
  title: string;
  /** Always present — the plain-text form of the block, and what an editor edits. */
  text: string;
  /** Present on the list-shaped auto blocks; the preview renders these instead of `text`. */
  lines?: ReceiptLine[];
  /** A sentence under the list. It is not a list item and must not be bulleted as one. */
  note?: string;
  source: 'auto' | 'template';
}

export interface ReceiptHero {
  /** The one line that matters: whether they are done, or we still need something. */
  headline: string;
  /** 'International Travel Form · received Wed, 17 Sep 09:42 ET' */
  received: string;
  /** The submission id — what anyone quotes when they chase it. */
  reference: string;
  /** True when the headline is a request rather than a reassurance. */
  needsAction: boolean;
}

export interface RenderedReceipt {
  /** Null when we hold no address for them; the receipt is composed but cannot go. */
  to: string | null;
  subject: string;
  hero: ReceiptHero;
  blocks: RenderedReceiptBlock[];
  replyTo: string;
  /** The form template this was rendered against — point-in-time, like the briefing email's sheet version. */
  formVersion: number;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim());
const answered = (responses: Record<string, unknown>, id: string): boolean => str(responses[id]).length > 0;

/** 'Wed, 17 Sep 09:42 ET' — an instant, shown in the operator's zone (D24). */
export function formatReceivedEt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const s = d.toLocaleString('en-US', {
    timeZone: OPERATOR_TIME_ZONE,
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return `${s} ET`;
}

/**
 * The name as it will be typed onto the manifest.
 *
 * 'NMN' is dropped: the form asks for it explicitly ("Enter NMN if no middle name"), and a
 * receipt reading "Maria NMN Garcia" invites the passenger to correct a placeholder that is
 * doing its job.
 */
export function manifestName(responses: Record<string, unknown>): string {
  const middle = str(responses.middleName);
  return [str(responses.firstName), middle.toUpperCase() === 'NMN' ? '' : middle, str(responses.lastName)]
    .filter(Boolean)
    .join(' ');
}

/** Fill {{tokens}}, then tidy the punctuation an empty token leaves behind. */
export function fillTokens(text: string, tokens: Record<string, string>): string {
  return text
    .replace(/\{\{(\w+)\}\}/g, (_m, k: string) => tokens[k] ?? '')
    .replace(/\s*,\s*(?=,|$)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface SectionTally {
  section: string;
  /** REQUIRED fields answered, out of the required fields in the section. */
  answered: number;
  total: number;
  /** Labels of required fields left blank — scheduling's chase, not a nicety. */
  missingRequired: string[];
  /** Counted apart, so an all-optional section still reports as received. */
  optionalAnswered: number;
}

/**
 * Section-by-section proof that we have it, without repeating a single answer.
 *
 * The tally is over REQUIRED fields only. Counting optional blanks against the total makes a
 * perfectly good form read "6 of 7" — a passenger reads that as a problem, goes looking for
 * what they got wrong, and finds nothing. What they did not fill in that they could have is
 * the gaps block's job, said once, in the register of "no hurry".
 *
 * Fields with no `section` are tallied under 'Your answers' rather than dropped: a
 * manager-added field lands there by default, and a receipt that silently omitted it would
 * tell the passenger we hold less than we do.
 */
export function sectionTallies(form: ReceiptFormTemplate, responses: Record<string, unknown>): SectionTally[] {
  const order: string[] = [];
  const by = new Map<string, SectionTally>();
  for (const f of form.fields) {
    const key = f.section || 'Your answers';
    if (!by.has(key)) { by.set(key, { section: key, answered: 0, total: 0, missingRequired: [], optionalAnswered: 0 }); order.push(key); }
    const tally = by.get(key)!;
    const got = answered(responses, f.id);
    if (f.required) {
      tally.total += 1;
      if (got) tally.answered += 1;
      else tally.missingRequired.push(f.label);
    } else if (got) {
      tally.optionalAnswered += 1;
    }
  }
  return order.map((k) => by.get(k)!);
}

/** Labels of OPTIONAL fields left blank, in template order. */
export function optionalGaps(form: ReceiptFormTemplate, responses: Record<string, unknown>): string[] {
  return form.fields.filter((f) => !f.required && !answered(responses, f.id)).map((f) => f.label);
}

/**
 * The two things worth a second of the passenger's attention.
 *
 * The form, the time it landed and the reference are in the headline above; repeating them
 * here was the block saying nothing twice. What belongs here is what only they can check —
 * quoted deliberately (see QUOTED_FIELD_IDS), because a name that does not match the
 * passport and a wrong travel date are the two mistakes nobody downstream can catch.
 */
function checkLines(submission: ReceiptSubmission): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  const name = manifestName(submission.responses);
  if (name) lines.push({ text: `The name going on the manifest: ${name}. Tell us now if that is not exactly what your passport says.`, tone: 'info' });
  const tripDate = str(submission.responses.tripDate) || str(submission.responses.requestDate);
  if (tripDate) lines.push({ text: `Travelling ${formatDateOnly(tripDate, { day: 'numeric', month: 'long', year: 'numeric' })}.`, tone: 'info' });
  return lines;
}

function checklistLines(form: ReceiptFormTemplate, responses: Record<string, unknown>): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  for (const t of sectionTallies(form, responses)) {
    if (t.missingRequired.length) {
      // Naming what is missing beats a fraction: "2 of 3" sends someone hunting.
      lines.push({ text: `${t.section} — still needed: ${t.missingRequired.join(', ')}.`, tone: 'warn' });
    } else if (t.total > 0) {
      lines.push({ text: `${t.section} — everything we need.`, tone: 'ok' });
    } else if (t.optionalAnswered > 0) {
      // A section with nothing required in it: say we have it rather than report "all 0".
      lines.push({ text: `${t.section} — received.`, tone: 'ok' });
    }
    // A section that is entirely optional and entirely blank says nothing here; the gaps
    // block already names those fields.
  }
  return lines;
}

function documentLines(submission: ReceiptSubmission): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  for (const doc of submission.documentExpirations ?? []) {
    // The label, the type and the expiry — never the number. Expiry earns its place for the
    // same reason the name does: a mistyped one grounds you at the border, and it identifies
    // nobody on its own.
    const on = formatDateOnly(doc.expirationDate, { day: 'numeric', month: 'long', year: 'numeric' });
    if (doc.isExpired) {
      lines.push({ text: `${doc.fieldLabel} — expired ${on}. We cannot file a manifest against it; please send us a current one.`, tone: 'warn' });
    } else if (doc.isExpiringSoon) {
      lines.push({ text: `${doc.fieldLabel} — expires ${on}, ${doc.daysUntilExpiration} ${doc.daysUntilExpiration === 1 ? 'day' : 'days'} away. If that is before you travel we will need the renewal.`, tone: 'warn' });
    } else {
      lines.push({ text: `${doc.fieldLabel} — expires ${on}.`, tone: 'ok' });
    }
  }
  for (const up of submission.uploadedDocuments ?? []) {
    lines.push({ text: `Uploaded: ${up.documentName || up.fileName}.`, tone: 'ok' });
  }
  return lines;
}

const GAPS_NOTE = 'None of these hold anything up. Send them to scheduling if they apply to you.';

function gapLines(form: ReceiptFormTemplate, responses: Record<string, unknown>): ReceiptLine[] {
  const gaps = optionalGaps(form, responses);
  if (!gaps.length) return [];
  const shown = gaps.slice(0, MAX_LISTED_GAPS);
  const rest = gaps.length - shown.length;
  const lines: ReceiptLine[] = shown.map((label) => ({ text: label, tone: 'info' as const }));
  if (rest > 0) lines.push({ text: `and ${rest} other${rest === 1 ? '' : 's'}.`, tone: 'info' });
  return lines;
}

/**
 * The headline: whether they are done.
 *
 * A receipt that always reads "all set" is worth nothing the one time it is not true, so the
 * headline is derived — a missing required answer or a document we cannot fly on turns it
 * into a request, and the preview colours it accordingly.
 */
export function receiptHero(submission: ReceiptSubmission, form: ReceiptFormTemplate): ReceiptHero {
  const missingRequired = sectionTallies(form, submission.responses).flatMap((t) => t.missingRequired);
  const badDocs = (submission.documentExpirations ?? []).filter((d) => d.isExpired || d.isExpiringSoon);
  const asks = missingRequired.length + badDocs.length;
  const headline = asks === 0
    ? 'We have everything. Nothing more to do.'
    : asks === 1
      ? 'We have your form — one thing still needs you.'
      : `We have your form — ${asks} things still need you.`;
  return {
    headline,
    received: `${form.name || 'Travel form'} · received ${formatReceivedEt(submission.submittedAt)}`,
    reference: submission.id,
    needsAction: asks > 0,
  };
}

export function renderReceipt(
  submission: ReceiptSubmission,
  form: ReceiptFormTemplate,
  template: ReceiptTemplate,
): RenderedReceipt {
  const responses = submission.responses;
  const subject = fillTokens(template.subject, {
    formName: form.name || 'travel form',
    firstName: str(responses.firstName),
    name: manifestName(responses) || submission.passengerInfo.name,
    reference: submission.id,
  });

  const blocks: RenderedReceiptBlock[] = [];
  for (const b of template.blocks) {
    if (!b.enabled) continue;
    if (!AUTO_BLOCKS.includes(b.id)) {
      if (b.body.trim()) blocks.push({ id: b.id, title: b.title, text: b.body.trim(), source: 'template' });
      continue;
    }
    const lines =
      b.id === 'check' ? checkLines(submission)
        : b.id === 'checklist' ? checklistLines(form, responses)
          : b.id === 'documents' ? documentLines(submission)
            : gapLines(form, responses);
    // An auto block with nothing to say is dropped rather than rendered empty — a heading
    // over a blank is how a receipt starts looking automated.
    if (!lines.length) continue;
    const note = b.id === 'gaps' ? GAPS_NOTE : undefined;
    blocks.push({
      id: b.id,
      title: b.title,
      text: [...lines.map((l) => l.text), note].filter(Boolean).join(' '),
      lines,
      note,
      source: 'auto',
    });
  }

  return {
    to: submission.passengerInfo.email.trim() || null,
    subject,
    hero: receiptHero(submission, form),
    blocks,
    replyTo: template.replyTo,
    formVersion: form.version,
  };
}

// ---- issuing --------------------------------------------------------------

export interface FormReceipt {
  /** When the receipt was composed. UTC; the server re-stamps this for real. */
  issuedAtUtc: string;
  /** Null when it could not go. A receipt that was never sent must not read as sent. */
  sentAtUtc: string | null;
  blockedReason: 'no-address' | null;
  /**
   * The rendered mail, frozen. Editing the template later changes what the NEXT passenger
   * reads, never what this one was told — the same point-in-time rule the briefing email
   * follows by freezing its render into the draft.
   */
  email: RenderedReceipt;
}

/** A submission whose form template we can no longer find still gets a receipt — reference
 *  and reassurance, with the sections and gaps simply absent. Silence would be worse. */
const unknownForm = (name: string): ReceiptFormTemplate => ({ id: '', name, version: 0, fields: [] });

export function issueReceipt(
  submission: ReceiptSubmission,
  form: ReceiptFormTemplate | undefined,
  template: ReceiptTemplate,
  nowUtc: string,
): FormReceipt {
  const email = renderReceipt(submission, form ?? unknownForm('Travel form'), template);
  const sendable = email.to !== null;
  return {
    issuedAtUtc: nowUtc,
    sentAtUtc: sendable ? nowUtc : null,
    blockedReason: sendable ? null : 'no-address',
    email,
  };
}

/**
 * One receipt per submission, ever.
 *
 * The receipt is the record of what the passenger was told. Re-issuing on a re-render would
 * let today's template quietly replace yesterday's words, and a resubmitted form would tell
 * them twice that we have it.
 */
export function issueReceiptOnce(
  existing: FormReceipt | undefined | null,
  submission: ReceiptSubmission,
  form: ReceiptFormTemplate | undefined,
  template: ReceiptTemplate,
  nowUtc: string,
): FormReceipt {
  return existing ?? issueReceipt(submission, form, template, nowUtc);
}
