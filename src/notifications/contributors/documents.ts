import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';
import { resolveUserId } from '../identity';
import type { DocumentsState } from '../../components/documents/types';
import { DOC_CLASSES, docReaderPath } from '../../components/documents/classes';
import { unacknowledgedRequiredReads, isOverdue } from '../../components/documents/engine/acknowledgments';
import { docsDueForReview } from '../../components/documents/engine/review';
import { canApprove } from '../../components/documents/engine/lifecycle';
import { isBulletinClass } from '../../components/documents/engine/bulletinCompat';

const STORAGE_KEY = 'documents-state';
const OWNER_CHASE_ROLES = ['document-manager', 'admin'];

/** Derived documents feed (replaces the legacy bulletins contributor):
 *  - required reads the user owes (bulletin classes keep the legacy derived-id
 *    format so prior dismissals survive the unification)
 *  - docs overdue for periodic review (owner + document-manager)
 *  - open suggestions on docs you own (or all, for document-manager)
 *  - revisions pending your approval (excluding your own submissions)
 * All items derive from the persisted store, so they clear themselves. */
export function buildDocumentsFeed(
  userRole: string,
  _nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!storage) return [];
  let state: DocumentsState;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.docs) || !Array.isArray(parsed.revisions)) return [];
    state = {
      docs: parsed.docs,
      revisions: parsed.revisions,
      acknowledgments: Array.isArray(parsed.acknowledgments) ? parsed.acknowledgments : [],
      comments: [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      reviews: [],
      signatures: [],
    };
  } catch {
    return [];
  }

  const userId = resolveUserId(userRole);
  const todayIso = _nowUtc.slice(0, 10);
  const items: FeedItem[] = [];

  // 1. Required reads the user still owes.
  for (const { doc, rev } of unacknowledgedRequiredReads(
    state.docs, state.revisions, state.acknowledgments, userRole, userId,
  )) {
    const overdue = isOverdue(rev, todayIso);
    const legacy = isBulletinClass(doc.classId);
    items.push({
      id: legacy ? `bulletin-ack:${doc.id}:${rev.revision}` : `doc-ack:${doc.id}:${rev.id}`,
      severity: overdue ? 'critical' : 'warn',
      title: `Action required: read & ${rev.ackLevel === 'signature' ? 'sign' : 'initial'} "${doc.title}"`,
      detail: `${DOC_CLASSES[doc.classId]?.label ?? 'Document'} ${doc.id} · rev ${rev.revision}${
        rev.ackDueDate ? `${overdue ? ' · OVERDUE since' : ' · due'} ${rev.ackDueDate}` : ''
      }`,
      module: 'Documents',
      link: docReaderPath(doc.id),
    });
  }

  // 2. Docs overdue/due-soon for periodic review — owner + document chase roles.
  const chaser = OWNER_CHASE_ROLES.includes(userRole);
  for (const doc of docsDueForReview(state.docs, todayIso)) {
    if (!chaser && doc.ownerUserId !== userId) continue;
    items.push({
      id: `doc-review:${doc.id}:${doc.nextReviewDate}`,
      severity: doc.nextReviewDate && doc.nextReviewDate < todayIso ? 'warn' : 'info',
      title: `Periodic review due: ${doc.title}`,
      detail: `${doc.id} · next review ${doc.nextReviewDate}`,
      module: 'Documents',
      link: docReaderPath(doc.id),
    });
  }

  // 3. Open suggestions on docs you own (document-manager sees all).
  const openByDoc = new Map<string, number>();
  for (const s of state.suggestions) {
    if (s.status !== 'open') continue;
    openByDoc.set(s.docId, (openByDoc.get(s.docId) ?? 0) + 1);
  }
  for (const [docId, count] of openByDoc) {
    const doc = state.docs.find((d) => d.id === docId);
    if (!doc) continue;
    if (!chaser && doc.ownerUserId !== userId) continue;
    items.push({
      id: `doc-suggestions:${docId}:${count}`,
      severity: 'info',
      title: `${count} open suggestion${count === 1 ? '' : 's'} on ${doc.title}`,
      detail: `${doc.id} — reader feedback awaiting the document owner`,
      module: 'Documents',
      link: '/documents',
    });
  }

  // 4. Revisions pending your approval (four-eyes: never your own).
  for (const rev of state.revisions) {
    if (rev.status !== 'pending-approval') continue;
    const doc = state.docs.find((d) => d.id === rev.docId);
    if (!doc) continue;
    const cfg = DOC_CLASSES[doc.classId];
    if (!cfg || !canApprove(cfg, userRole) || rev.authorUserId === userId) continue;
    items.push({
      id: `doc-approval:${rev.id}`,
      severity: 'warn',
      title: `Approval requested: ${doc.title}`,
      detail: `${doc.id} rev ${rev.revision} · submitted by ${rev.authorName}`,
      module: 'Documents',
      link: '/documents',
    });
  }

  return items;
}
