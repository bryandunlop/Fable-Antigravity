// Atlassian Document Format helpers.
//
// Jira Cloud v3 rejects a plain string where v2 accepted one, so every field we
// send as prose (issue description, comment body) has to be built as ADF. Keeping
// this in one file means the real client and the mock produce byte-identical
// payloads — the payload preview in the triage view is therefore honest.

import type { AdfDocument, AdfNode } from './types';

function paragraph(text: string): AdfNode {
  // ADF has no empty text node: a blank paragraph carries no `content` at all.
  return text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' };
}

function heading(text: string, level = 3): AdfNode {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}

function bulletList(items: string[]): AdfNode {
  return {
    type: 'bulletList',
    content: items.map((text) => ({
      type: 'listItem',
      content: [paragraph(text)],
    })),
  };
}

/** Wrap plain prose (possibly multi-line) as an ADF document. */
export function adfFromText(text: string): AdfDocument {
  return { type: 'doc', version: 1, content: text.split('\n').map(paragraph) };
}

/**
 * The description we actually file: the reporter's prose, then a labelled block
 * of the context the app captured for them. The context block is the whole reason
 * an in-app reporter beats an email — a developer triaging this should never have
 * to ask "which screen were you on".
 */
export function adfIssueDescription(prose: string, context: Record<string, string>): AdfDocument {
  const entries = Object.entries(context).filter(([, v]) => v !== '' && v != null);
  const content: AdfNode[] = prose.split('\n').map(paragraph);
  if (entries.length > 0) {
    content.push({ type: 'rule' });
    content.push(heading('Captured context'));
    content.push(bulletList(entries.map(([k, v]) => `${k}: ${v}`)));
  }
  return { type: 'doc', version: 1, content };
}

/** Flatten an ADF document back to readable text (mock storage + tests + preview). */
export function adfToPlainText(doc: AdfDocument): string {
  const walk = (nodes: AdfNode[] | undefined): string[] =>
    (nodes ?? []).flatMap((n) => (n.text ? [n.text] : walk(n.content)));
  return walk(doc.content).join('\n');
}
