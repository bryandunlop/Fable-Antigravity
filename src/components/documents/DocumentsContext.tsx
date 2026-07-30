import React, { createContext, useCallback, useContext, useEffect, useReducer, ReactNode } from 'react';
import type {
  Doc,
  DocRevision,
  DocAcknowledgment,
  DocComment,
  DocSuggestion,
  DocSuggestionReply,
  DocReviewRecord,
  DocumentsState,
} from './types';
import type { Signature } from '../tech-log/types';
import { classFor, docReaderPath } from './classes';
import { getSeedState } from './mockData';
import { applyPublish, promoteScheduled, currentRevision } from './engine/revisions';
import { canAuthor, validateSubmit, validateDecision, validateDirectPublish } from './engine/lifecycle';
import { rolesCanManageDocuments } from './roles';
import { computeNextReviewDate } from './engine/review';
import { isTargetRole } from './engine/acknowledgments';
import { migrateStoredState } from './engine/migrations';
import { importLegacyBulletins, isBulletinClass } from './engine/bulletinCompat';
import { contentFieldsFromMarkdown } from './engine/blocks';
import { operatorTodayIso } from '../../lib/operatorDate';
import { SYSTEM_USERS, ROLE_CATEGORIES, ADDITIONAL_ROLES, getRoleLabelByValue } from '../../lib/mockUsers';
import { resolveUserId } from '../../notifications/identity';
import { eventStore } from '../../notifications/events';

export const STORAGE_KEY = 'documents-state';
export const VERSION_KEY = 'documents-data-version';
/** D65 — bumped to move `fleetTypes` / `casMeta` off the `Doc` row and onto
 *  `DocRevision`. Both fields are optional and absent reads correctly, so this is not
 *  a broken-render risk; the bump exists so a RETURNING user's curated CAS content is
 *  carried onto its revisions by the matching step in engine/migrations.ts rather than
 *  being stranded on a field nothing reads any more. */
export const DATA_VERSION = '2026-07-30-cas-on-revision-v1';
/** Set once the legacy 'bulletins-state' store has been imported — a later
 * re-seed must never resurrect stale pre-migration bulletins (C5). */
export const BULLETINS_IMPORTED_KEY = 'documents-bulletins-imported';

/** Every login role — used to expand an 'all' audience for stored events. */
export function allAudienceRoles(): string[] {
  return [
    ...Object.values(ROLE_CATEGORIES).flat().map((r) => r.value),
    ...ADDITIONAL_ROLES.map((r) => r.id),
  ];
}

export function expandAudience(roles: string[]): string[] {
  return roles.includes('all') ? allAudienceRoles() : roles;
}

export function identityFor(userRole: string): { userId: string; userName: string } {
  const userId = resolveUserId(userRole);
  const userName = SYSTEM_USERS.find((u) => u.id === userId)?.name ?? getRoleLabelByValue(userRole);
  return { userId, userName };
}

function nowUtc(): string {
  return new Date().toISOString();
}
function todayIso(): string {
  return operatorTodayIso(); // D24: calendar days in the operator zone, not UTC (C6)
}

/** Bring one persisted revision forward to the block model. A pre-block-model
 * revision carries a `content` markdown blob and no `sections`; split it into a
 * section tree (and recompute the checksum) rather than discarding the user's
 * record. Idempotent: a revision that already has `sections` is returned as-is. */
export function migrateRevisionForward(r: unknown): unknown {
  if (!r || typeof r !== 'object') return r;
  const rev = r as Record<string, unknown>;
  if (Array.isArray(rev.sections)) return r;
  if (typeof rev.content !== 'string') return r;
  const docId = typeof rev.docId === 'string' ? rev.docId : typeof rev.id === 'string' ? rev.id : 'DOC';
  const { content, ...rest } = rev;
  return { ...rest, ...contentFieldsFromMarkdown(content as string, docId) };
}

/** True only when a persisted payload is structurally unusable (not an object, or
 * no revisions array) and must be re-seeded. Old-shaped data is NOT unusable — it
 * is migrated forward by {@link migrateRevisionForward}, never wiped. */
export function documentsStateIsUnusable(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return true;
  return !Array.isArray((parsed as { revisions?: unknown }).revisions);
}

/** Exported for tests. */
export function loadInitialState(): DocumentsState {
  const seedWithLegacy = (): DocumentsState => {
    const seed = getSeedState();
    // One-time migration of the legacy bulletins store: user edits + ack history
    // replace the bulletin-class seeds (ack records must never be silently lost).
    // Flagged after the first successful import so a later re-seed can never
    // resurrect stale pre-migration bulletins over edits made since (C5).
    try {
      if (localStorage.getItem(BULLETINS_IMPORTED_KEY)) return seed;
      const legacy = importLegacyBulletins(localStorage.getItem('bulletins-state'));
      if (legacy) {
        localStorage.setItem(BULLETINS_IMPORTED_KEY, nowUtc());
        const nonBulletinDocs = seed.docs.filter((d) => !isBulletinClass(d.classId));
        const bulletinDocIds = new Set(seed.docs.filter((d) => isBulletinClass(d.classId)).map((d) => d.id));
        const nonBulletinRevs = seed.revisions.filter((r) => !bulletinDocIds.has(r.docId));
        return {
          ...seed,
          docs: [...nonBulletinDocs, ...legacy.docs],
          revisions: [...nonBulletinRevs, ...legacy.revisions],
          acknowledgments: [...seed.acknowledgments, ...legacy.acknowledgments],
        };
      }
    } catch {
      /* unreadable legacy store — fall through to plain seeds */
    }
    return seed;
  };

  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(VERSION_KEY, DATA_VERSION);
    // No prior store → genuine first seed: import the legacy bulletins store ONCE.
    if (!raw) return promote(seedWithLegacy());
    const parsed = JSON.parse(raw);
    // Structurally broken → re-seed rather than crash.
    if (documentsStateIsUnusable(parsed)) return promote(seedWithLegacy());
    // Existing user data → transform forward, never wipe (C5), and do NOT
    // re-import legacy bulletins over edits (first-seed only, above):
    // 1. idempotent shape heal — pre-block-model revisions gain `sections`;
    // 2. version-keyed steps for later schema bumps (engine/migrations.ts).
    const healed = { ...parsed, revisions: (parsed.revisions as unknown[]).map(migrateRevisionForward) };
    const migrated = migrateStoredState(healed as DocumentsState, storedVersion);
    if (storedVersion !== DATA_VERSION) {
      // Persist the upgraded state now so a crash before the debounced save
      // can't leave the new version stamped over the old shape.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return promote({ ...getSeedState(), ...migrated });
  } catch {
    return getSeedState();
  }
}

/** Lazily publish 'approved' revisions whose effective date has arrived. */
function promote(state: DocumentsState): DocumentsState {
  const { docs, revisions } = promoteScheduled(state, nowUtc(), todayIso());
  return { ...state, docs, revisions };
}

export type DocumentsAction =
  | { type: 'CREATE_DOC'; payload: { doc: Doc; revision: DocRevision; actorRoles: string[] } }
  | { type: 'UPDATE_DOC_META'; payload: { doc: Doc; actorUserId: string; actorRoles: string[] } }
  | { type: 'TOGGLE_PIN'; payload: { docId: string; actorRoles: string[] } }
  | { type: 'TOGGLE_ARCHIVE'; payload: { docId: string; actorRoles: string[] } }
  | { type: 'CREATE_DRAFT'; payload: { revision: DocRevision; actorRoles: string[] } }
  | { type: 'UPDATE_DRAFT'; payload: DocRevision }
  | { type: 'WITHDRAW_DRAFT'; payload: { revisionId: string; reason: string; byUserId: string; byName: string; byRoles: string[]; atUtc: string } }
  | { type: 'SUBMIT_FOR_APPROVAL'; payload: { revisionId: string; atUtc: string } }
  | {
      type: 'DECIDE_APPROVAL';
      payload: {
        revisionId: string;
        deciderUserId: string;
        deciderName: string;
        deciderRoles: string[];
        approve: boolean;
        reason?: string;
        atUtc: string;
        today: string;
      };
    }
  | { type: 'PUBLISH_DIRECT'; payload: { revisionId: string; atUtc: string; today: string; actorRoles: string[] } }
  | { type: 'ACKNOWLEDGE'; payload: { ack: DocAcknowledgment; signature?: Signature } }
  | { type: 'ADD_COMMENT'; payload: DocComment }
  | { type: 'EDIT_COMMENT'; payload: { id: string; text: string; actorUserId: string; atUtc: string } }
  | { type: 'DELETE_COMMENT'; payload: { id: string; actorUserId: string; atUtc: string } }
  | { type: 'ADD_SUGGESTION'; payload: DocSuggestion }
  | { type: 'ADD_SUGGESTION_REPLY'; payload: DocSuggestionReply }
  | {
      type: 'RESOLVE_SUGGESTION';
      payload: { id: string; status: 'accepted' | 'declined'; note?: string; byUserId: string; byName: string; byRoles: string[]; atUtc: string };
    }
  | { type: 'COMPLETE_REVIEW'; payload: { record: DocReviewRecord; today: string; actorRoles: string[] } }
  | { type: 'PROMOTE_SCHEDULED'; payload: { atUtc: string; today: string } };

function warnNoop(reason: string | undefined): void {
  if (typeof console !== 'undefined') console.warn(`[documents] action rejected: ${reason ?? 'invalid'}`);
}

export function documentsReducer(state: DocumentsState, action: DocumentsAction): DocumentsState {
  switch (action.type) {
    case 'CREATE_DOC': {
      const { doc, revision, actorRoles } = action.payload;
      // C12: enforce the authoring gate in the reducer, not just the UI.
      if (!canAuthor(classFor(doc.classId), actorRoles)) {
        warnNoop(`creating a ${classFor(doc.classId).label} requires an authoring role`);
        return state;
      }
      if (state.docs.some((d) => d.id === doc.id)) {
        warnNoop(`doc ${doc.id} already exists`);
        return state;
      }
      return { ...state, docs: [doc, ...state.docs], revisions: [...state.revisions, revision] };
    }
    case 'UPDATE_DOC_META': {
      // C1: meta writes are role-gated, and the identity fields of a live
      // controlled doc (title/category/audience) may only change by riding a
      // revision through four-eyes (see DocRevision.proposedMeta/applyPublish).
      const { doc: next, actorRoles } = action.payload;
      const existing = state.docs.find((d) => d.id === next.id);
      if (!existing) {
        warnNoop(`no doc ${next.id} to update`);
        return state;
      }
      const cfg = classFor(existing.classId);
      if (!canAuthor(cfg, actorRoles)) {
        warnNoop(`doc meta changes require an authoring role for ${cfg.label}`);
        return state;
      }
      if (next.classId !== existing.classId) {
        warnNoop('a document cannot change class');
        return state;
      }
      const hasBeenPublished = state.revisions.some(
        (r) => r.docId === existing.id && (r.status === 'published' || r.status === 'superseded'),
      );
      if (cfg.controlled && hasBeenPublished) {
        const sameRoles =
          next.roles.length === existing.roles.length && next.roles.every((r, i) => r === existing.roles[i]);
        if (next.title !== existing.title || next.category !== existing.category || !sameRoles) {
          warnNoop('identity fields of a published controlled doc must ride a revision (four-eyes)');
          return state;
        }
      }
      return { ...state, docs: state.docs.map((d) => (d.id === next.id ? next : d)) };
    }
    case 'TOGGLE_PIN': {
      // C12: pin/archive are library curation — shared with the bulletins surface,
      // so the manage gate is enforced here in the reducer, not just the UI.
      const { docId, actorRoles } = action.payload;
      if (!rolesCanManageDocuments(actorRoles)) {
        warnNoop('pinning a document requires a document manager');
        return state;
      }
      return {
        ...state,
        docs: state.docs.map((d) => (d.id === docId ? { ...d, isPinned: !d.isPinned } : d)),
      };
    }
    case 'TOGGLE_ARCHIVE': {
      const { docId, actorRoles } = action.payload;
      if (!rolesCanManageDocuments(actorRoles)) {
        warnNoop('archiving a document requires a document manager');
        return state;
      }
      return {
        ...state,
        docs: state.docs.map((d) => (d.id === docId ? { ...d, isArchived: !d.isArchived } : d)),
      };
    }
    case 'CREATE_DRAFT': {
      const { revision: rev, actorRoles } = action.payload;
      const parent = state.docs.find((d) => d.id === rev.docId);
      if (!parent) {
        warnNoop(`no doc ${rev.docId} for draft`);
        return state;
      }
      // C12: a new revision may only be drafted by an author of the doc's class.
      if (!canAuthor(classFor(parent.classId), actorRoles)) {
        warnNoop(`drafting a ${classFor(parent.classId).label} revision requires an authoring role`);
        return state;
      }
      if (state.revisions.some((r) => r.id === rev.id)) {
        warnNoop(`revision ${rev.id} already exists`);
        return state;
      }
      return { ...state, revisions: [...state.revisions, rev] };
    }
    case 'UPDATE_DRAFT': {
      const rev = action.payload;
      const existing = state.revisions.find((r) => r.id === rev.id);
      if (!existing || (existing.status !== 'draft' && existing.status !== 'rejected')) {
        warnNoop('only a draft/rejected revision can be edited');
        return state;
      }
      // Editing a rejected revision returns it to draft.
      return {
        ...state,
        revisions: state.revisions.map((r) => (r.id === rev.id ? { ...rev, status: 'draft' } : r)),
      };
    }
    case 'WITHDRAW_DRAFT': {
      // C7 withdrawal ceremony: withdraw is a *tombstone*, not a hard delete — the
      // revision is retained with status 'withdrawn' + who/when/reason, and the doc is
      // never dropped. A reason is required, and only an author of the doc's class or a
      // document manager may withdraw.
      const p = action.payload;
      const existing = state.revisions.find((r) => r.id === p.revisionId);
      if (!existing || (existing.status !== 'draft' && existing.status !== 'rejected' && existing.status !== 'pending-approval')) {
        warnNoop('only a draft, rejected, or pending revision can be withdrawn');
        return state;
      }
      if (!p.reason || !p.reason.trim()) {
        warnNoop('a withdrawal reason is required');
        return state;
      }
      const parent = state.docs.find((d) => d.id === existing.docId);
      const authorized =
        rolesCanManageDocuments(p.byRoles) || (!!parent && canAuthor(classFor(parent.classId), p.byRoles));
      if (!authorized) {
        warnNoop('withdrawing a revision requires a document manager or an author of the doc');
        return state;
      }
      // finding-2 (Bryan 2026-07-14): a never-published doc whose SOLE revision is
      // withdrawn was never a controlled record — remove it cleanly rather than leaving
      // an uneditable tombstone. The tombstone ceremony below applies once the doc has
      // published (or has other revisions to keep it reachable).
      const neverPublished = !state.revisions.some(
        (r) => r.docId === existing.docId && (r.status === 'published' || r.status === 'superseded'),
      );
      const isOnlyRevision = !state.revisions.some(
        (r) => r.docId === existing.docId && r.id !== p.revisionId,
      );
      if (neverPublished && isOnlyRevision) {
        return {
          ...state,
          revisions: state.revisions.filter((r) => r.id !== p.revisionId),
          docs: state.docs.filter((d) => d.id !== existing.docId),
        };
      }
      return {
        ...state,
        revisions: state.revisions.map((r) =>
          r.id === p.revisionId
            ? {
                ...r,
                status: 'withdrawn' as const,
                withdrawnAtUtc: p.atUtc,
                withdrawnByUserId: p.byUserId,
                withdrawnByName: p.byName,
                withdrawalReason: p.reason.trim(),
              }
            : r,
        ),
      };
    }
    case 'SUBMIT_FOR_APPROVAL': {
      const rev = state.revisions.find((r) => r.id === action.payload.revisionId);
      if (!rev) return state;
      const hasPrior = state.revisions.some(
        (r) => r.docId === rev.docId && (r.status === 'published' || r.status === 'superseded'),
      );
      const v = validateSubmit(rev, hasPrior);
      if (!v.ok) {
        warnNoop(v.error);
        return state;
      }
      return {
        ...state,
        revisions: state.revisions.map((r) =>
          r.id === rev.id
            ? { ...r, status: 'pending-approval', submittedAtUtc: action.payload.atUtc, rejectionReason: undefined }
            : r,
        ),
      };
    }
    case 'DECIDE_APPROVAL': {
      const p = action.payload;
      const rev = state.revisions.find((r) => r.id === p.revisionId);
      if (!rev) return state;
      const doc = state.docs.find((d) => d.id === rev.docId);
      if (!doc) return state;
      const v = validateDecision(classFor(doc.classId), rev, p.deciderUserId, p.deciderRoles);
      if (!v.ok) {
        warnNoop(v.error);
        return state;
      }
      if (!p.approve) {
        return {
          ...state,
          revisions: state.revisions.map((r) =>
            r.id === rev.id
              ? {
                  ...r,
                  status: 'rejected',
                  decidedAtUtc: p.atUtc,
                  decidedByUserId: p.deciderUserId,
                  decidedByName: p.deciderName,
                  rejectionReason: p.reason ?? '',
                }
              : r,
          ),
        };
      }
      const decided = state.revisions.map((r) =>
        r.id === rev.id
          ? {
              ...r,
              status: rev.effectiveDate > p.today ? ('approved' as const) : r.status,
              decidedAtUtc: p.atUtc,
              decidedByUserId: p.deciderUserId,
              decidedByName: p.deciderName,
              rejectionReason: undefined,
            }
          : r,
      );
      if (rev.effectiveDate > p.today) {
        // Scheduled: promoted to published when the effective date arrives.
        return { ...state, revisions: decided };
      }
      const published = applyPublish({ docs: state.docs, revisions: decided }, rev.id, p.atUtc, p.today);
      return { ...state, ...published };
    }
    case 'PUBLISH_DIRECT': {
      const p = action.payload;
      const rev = state.revisions.find((r) => r.id === p.revisionId);
      if (!rev) return state;
      const doc = state.docs.find((d) => d.id === rev.docId);
      if (!doc) return state;
      // LG-112, closed by the D60 fix pass. This case used to take NO actorRoles, so the only thing
      // standing between an unauthorized caller and a published revision was CREATE_DOC /
      // CREATE_DRAFT refusing to make the draft first — an indirect gate that says nothing about
      // this action. Direct publish skips four-eyes entirely; it carries its own gate now, the same
      // C12 discipline as every other authority check in this reducer.
      if (!canAuthor(classFor(doc.classId), p.actorRoles)) {
        warnNoop(`publishing a ${classFor(doc.classId).label} requires an authoring role`);
        return state;
      }
      const v = validateDirectPublish(classFor(doc.classId), rev);
      if (!v.ok) {
        warnNoop(v.error);
        return state;
      }
      const published = applyPublish({ docs: state.docs, revisions: state.revisions }, rev.id, p.atUtc, p.today);
      return { ...state, ...published };
    }
    case 'ACKNOWLEDGE': {
      const { ack, signature } = action.payload;
      // C2: this is compliance evidence — guard it like one.
      const rev = state.revisions.find((r) => r.id === ack.revisionId);
      if (!rev || rev.status !== 'published') {
        warnNoop('acknowledgments are recorded against a published revision only');
        return state;
      }
      const doc = state.docs.find((d) => d.id === ack.docId);
      if (!doc || !isTargetRole(doc, ack.role)) {
        warnNoop('acknowledger is not in the document audience');
        return state;
      }
      if (ack.level !== rev.ackLevel) {
        warnNoop(`ack level '${ack.level}' does not match the required '${rev.ackLevel}'`);
        return state;
      }
      if (ack.level === 'initials' && !ack.initials?.trim()) {
        warnNoop('initials are required for an initials-level ack');
        return state;
      }
      if (ack.level === 'signature' && (!ack.signatureId || !signature)) {
        warnNoop('a signature record is required for a signature-level ack');
        return state;
      }
      // Append-with-supersede: a prior (revision, user) record is flagged, never
      // dropped — its signature row stays intact for the audit trail.
      const acknowledgments = state.acknowledgments.map((x) =>
        x.revisionId === ack.revisionId && x.userId === ack.userId && !x.superseded
          ? { ...x, superseded: true }
          : x,
      );
      return {
        ...state,
        acknowledgments: [...acknowledgments, ack],
        signatures: signature ? [...state.signatures, signature] : state.signatures,
      };
    }
    case 'ADD_COMMENT': {
      const doc = state.docs.find((d) => d.id === action.payload.docId);
      if (!doc || !classFor(doc.classId).commentsEnabled) {
        warnNoop('comments are not enabled for this document class');
        return state;
      }
      return { ...state, comments: [...state.comments, action.payload] };
    }
    case 'EDIT_COMMENT':
    case 'DELETE_COMMENT': {
      // D60 audit finding: comment authors could not correct or withdraw their own
      // field notes. Both mutations are AUTHOR-ONLY and the check lives HERE, not in
      // the thread UI — the same C12 discipline every other gate in this reducer
      // follows. Note the class gate is `commentsEnabled`, not `classId ===
      // 'tribal-knowledge'`: tribal knowledge is the only comment-enabled class
      // today, so this changes nothing else, but the gate is structural and any
      // future comment-enabled class inherits it.
      const p = action.payload;
      const existing = state.comments.find((c) => c.id === p.id);
      if (!existing) {
        warnNoop(`no comment ${p.id}`);
        return state;
      }
      const doc = state.docs.find((d) => d.id === existing.docId);
      if (!doc || !classFor(doc.classId).commentsEnabled) {
        warnNoop('comments are not enabled for this document class');
        return state;
      }
      if (existing.authorUserId !== p.actorUserId) {
        warnNoop('only the author may edit or withdraw their own comment');
        return state;
      }
      if (existing.deletedAtUtc) {
        warnNoop('a withdrawn comment cannot be changed');
        return state;
      }
      const next: DocComment =
        action.type === 'DELETE_COMMENT'
          // The TEXT SURVIVES a withdrawal. Clearing it, as this did, is a delete wearing the word
          // "tombstone": the record can no longer say what was withdrawn, and someone may already
          // have acted on what it said. Withdrawing is the author saying "do not rely on this" —
          // which the mark communicates — not "this was never written". Same append-only discipline
          // as `DocSuggestionReply`. Readers get `isLiveComment` to exclude it from counts.
          ? { ...existing, deletedAtUtc: p.atUtc }
          : { ...existing, text: (action.payload as { text: string }).text.trim(), editedAtUtc: p.atUtc };
      if (action.type === 'EDIT_COMMENT') {
        const text = (action.payload as { text: string }).text.trim();
        if (!text) {
          warnNoop('a comment cannot be edited to empty — withdraw it instead');
          return state;
        }
        // Re-saving the same text must not stamp "edited": that would claim a
        // revision the author never made.
        if (text === existing.text) return state;
      }
      return { ...state, comments: state.comments.map((c) => (c.id === p.id ? next : c)) };
    }
    case 'ADD_SUGGESTION': {
      // Any reader may file a suggestion (no role gate), but it must target a
      // real doc + revision — structural guard, C12.
      const sug = action.payload;
      const doc = state.docs.find((d) => d.id === sug.docId);
      const revExists = state.revisions.some((r) => r.id === sug.revisionId && r.docId === sug.docId);
      if (!doc || !revExists) {
        warnNoop(`suggestion targets a missing doc/revision (${sug.docId}/${sug.revisionId})`);
        return state;
      }
      return { ...state, suggestions: [...state.suggestions, sug] };
    }
    case 'ADD_SUGGESTION_REPLY': {
      const target = state.suggestions.find((s) => s.id === action.payload.suggestionId);
      if (!target || target.status !== 'open') {
        warnNoop('cannot reply to a missing or already-resolved suggestion');
        return state;
      }
      return { ...state, suggestionReplies: [...state.suggestionReplies, action.payload] };
    }
    case 'RESOLVE_SUGGESTION': {
      const p = action.payload;
      const sug = state.suggestions.find((s) => s.id === p.id);
      if (!sug) return state;
      // C12: only a document manager or an author of the doc's class may accept/decline
      // a suggestion — mirrors the reader UI's canManage={manager || author} gate.
      const sugDoc = state.docs.find((d) => d.id === sug.docId);
      const authorized =
        rolesCanManageDocuments(p.byRoles) || (!!sugDoc && canAuthor(classFor(sugDoc.classId), p.byRoles));
      if (!authorized) {
        warnNoop('resolving a suggestion requires a document manager or an author of the doc');
        return state;
      }
      return {
        ...state,
        suggestions: state.suggestions.map((s) =>
          s.id === p.id && s.status === 'open'
            ? {
                ...s,
                status: p.status,
                resolutionNote: p.note,
                resolvedByUserId: p.byUserId,
                resolvedByName: p.byName,
                resolvedAtUtc: p.atUtc,
              }
            : s,
        ),
      };
    }
    case 'COMPLETE_REVIEW': {
      const { record, today, actorRoles } = action.payload;
      const doc = state.docs.find((d) => d.id === record.docId);
      if (!doc) return state;
      // C12: completing a periodic review is a manager action (UI shows it to managers only).
      if (!rolesCanManageDocuments(actorRoles)) {
        warnNoop('completing a review requires a document manager');
        return state;
      }
      const cycle = doc.reviewCycleDays ?? classFor(doc.classId).defaultReviewCycleDays;
      return {
        ...state,
        reviews: [...state.reviews, record],
        docs: state.docs.map((d) =>
          d.id === doc.id && cycle ? { ...d, nextReviewDate: computeNextReviewDate(today, cycle) } : d,
        ),
      };
    }
    case 'PROMOTE_SCHEDULED': {
      // C3: publish 'approved' (scheduled) revisions whose effective date has
      // arrived. Runs mid-session (not only at load) — see the provider effect.
      const { atUtc, today } = action.payload;
      const { docs, revisions } = promoteScheduled(state, atUtc, today);
      if (docs === state.docs && revisions === state.revisions) return state;
      return { ...state, docs, revisions };
    }
    default:
      return state;
  }
}

interface Ctx {
  state: DocumentsState;
  createDoc: (doc: Doc, revision: DocRevision, actorRoles: string[]) => void;
  updateDocMeta: (doc: Doc, userRole: string, additionalRoles?: string[]) => void;
  togglePin: (docId: string, actorRoles: string[]) => void;
  toggleArchive: (docId: string, actorRoles: string[]) => void;
  createDraft: (revision: DocRevision, actorRoles: string[]) => void;
  updateDraft: (revision: DocRevision) => void;
  withdrawDraft: (revisionId: string, reason: string, userRole: string, additionalRoles?: string[]) => void;
  submitForApproval: (revisionId: string) => void;
  decideApproval: (input: {
    revisionId: string;
    deciderRoles: string[];
    deciderRole: string;
    approve: boolean;
    reason?: string;
  }) => void;
  /** Uncontrolled classes only. Role-gated in the reducer (LG-112) — pass the ACTOR's roles. */
  publishDirect: (revisionId: string, actorRoles: string[]) => void;
  /** Lightweight checkbox+initials acknowledgment. */
  acknowledgeInitials: (doc: Doc, rev: DocRevision, initials: string, userRole: string) => void;
  /** High-consequence acknowledgment via the shared sign ceremony. */
  acknowledgeSignature: (doc: Doc, rev: DocRevision, signature: Signature, userRole: string) => void;
  addComment: (docId: string, text: string, userRole: string) => void;
  /** Author-only; stamps `editedAtUtc` (reducer-enforced, never a silent rewrite). */
  editComment: (commentId: string, text: string, userRole: string) => void;
  /** Author-only; tombstones the row rather than dropping it. */
  deleteComment: (commentId: string, userRole: string) => void;
  addSuggestion: (input: {
    doc: Doc;
    rev: DocRevision;
    sectionRef?: string;
    blockId?: string;
    proposedChange: string;
    rationale: string;
    userRole: string;
  }) => void;
  resolveSuggestion: (id: string, status: 'accepted' | 'declined', note: string | undefined, userRole: string, additionalRoles?: string[]) => void;
  addSuggestionReply: (suggestionId: string, text: string, userRole: string) => void;
  completeReview: (docId: string, outcome: DocReviewRecord['outcome'], note: string | undefined, userRole: string, additionalRoles?: string[]) => void;
}

const DocumentsContext = createContext<Ctx | undefined>(undefined);

let seq = 0;
function localId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(documentsReducer, undefined, loadInitialState);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* storage full/unavailable — ignore for the demo */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state]);

  // C3: a scheduled ('approved', future-effective) revision must publish mid-session,
  // not only at the next reload — and must fire its required-read announcement when it
  // does. Re-check on tab-visible / window-focus and on a light interval; event ids
  // dedupe, so a repeated fire is harmless. (The durable 'what you owe' feed is derived
  // from state, so it also picks the revision up the moment it flips to published.)
  useEffect(() => {
    const check = () => {
      const today = todayIso();
      const due = state.revisions.filter((r) => r.status === 'approved' && r.effectiveDate <= today);
      if (due.length === 0) return;
      dispatch({ type: 'PROMOTE_SCHEDULED', payload: { atUtc: nowUtc(), today } });
      for (const rev of due) {
        const doc = state.docs.find((d) => d.id === rev.docId);
        if (doc) publishRequiredReadEvent(doc, rev);
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, [state.revisions, state.docs]);

  const submitForApproval = useCallback((revisionId: string) => {
    dispatch({ type: 'SUBMIT_FOR_APPROVAL', payload: { revisionId, atUtc: nowUtc() } });
  }, []);

  const decideApproval = useCallback<Ctx['decideApproval']>((input) => {
    const { userId, userName } = identityFor(input.deciderRole);
    dispatch({
      type: 'DECIDE_APPROVAL',
      payload: {
        revisionId: input.revisionId,
        deciderUserId: userId,
        deciderName: userName,
        deciderRoles: input.deciderRoles,
        approve: input.approve,
        reason: input.reason,
        atUtc: nowUtc(),
        today: todayIso(),
      },
    });
  }, []);

  const acknowledgeInitials = useCallback<Ctx['acknowledgeInitials']>((doc, rev, initials, userRole) => {
    const { userId, userName } = identityFor(userRole);
    dispatch({
      type: 'ACKNOWLEDGE',
      payload: {
        ack: {
          docId: doc.id,
          revisionId: rev.id,
          revision: rev.revision,
          userId,
          userName,
          role: userRole,
          level: 'initials',
          initials: initials.trim().toUpperCase(),
          acknowledgedAtUtc: nowUtc(),
        },
      },
    });
  }, []);

  const acknowledgeSignature = useCallback<Ctx['acknowledgeSignature']>((doc, rev, signature, userRole) => {
    const { userId, userName } = identityFor(userRole);
    dispatch({
      type: 'ACKNOWLEDGE',
      payload: {
        ack: {
          docId: doc.id,
          revisionId: rev.id,
          revision: rev.revision,
          userId,
          userName,
          role: userRole,
          level: 'signature',
          signatureId: signature.id,
          acknowledgedAtUtc: signature.signedAtUtc,
        },
        signature,
      },
    });
  }, []);

  const addComment = useCallback<Ctx['addComment']>((docId, text, userRole) => {
    const { userId, userName } = identityFor(userRole);
    dispatch({
      type: 'ADD_COMMENT',
      payload: {
        id: localId('cmt'),
        docId,
        authorUserId: userId,
        authorName: userName,
        role: userRole,
        text: text.trim(),
        createdAtUtc: nowUtc(),
      },
    });
  }, []);

  const editComment = useCallback<Ctx['editComment']>((commentId, text, userRole) => {
    const { userId } = identityFor(userRole);
    dispatch({ type: 'EDIT_COMMENT', payload: { id: commentId, text, actorUserId: userId, atUtc: nowUtc() } });
  }, []);

  const deleteComment = useCallback<Ctx['deleteComment']>((commentId, userRole) => {
    const { userId } = identityFor(userRole);
    dispatch({ type: 'DELETE_COMMENT', payload: { id: commentId, actorUserId: userId, atUtc: nowUtc() } });
  }, []);

  const addSuggestion = useCallback<Ctx['addSuggestion']>((input) => {
    const { userId, userName } = identityFor(input.userRole);
    const suggestion: DocSuggestion = {
      id: localId('sug'),
      docId: input.doc.id,
      revisionId: input.rev.id,
      docTitle: input.doc.title,
      authorUserId: userId,
      authorName: userName,
      role: input.userRole,
      sectionRef: input.sectionRef,
      blockId: input.blockId,
      proposedChange: input.proposedChange.trim(),
      rationale: input.rationale.trim(),
      status: 'open',
      createdAtUtc: nowUtc(),
    };
    dispatch({ type: 'ADD_SUGGESTION', payload: suggestion });
  }, []);

  const addSuggestionReply = useCallback<Ctx['addSuggestionReply']>((suggestionId, text, userRole) => {
    const { userId, userName } = identityFor(userRole);
    dispatch({
      type: 'ADD_SUGGESTION_REPLY',
      payload: {
        id: localId('sgr'),
        suggestionId,
        authorUserId: userId,
        authorName: userName,
        role: userRole,
        text: text.trim(),
        createdAtUtc: nowUtc(),
      },
    });
  }, []);

  const resolveSuggestion = useCallback<Ctx['resolveSuggestion']>((id, status, note, userRole, additionalRoles = []) => {
    const { userId, userName } = identityFor(userRole);
    dispatch({
      type: 'RESOLVE_SUGGESTION',
      payload: { id, status, note, byUserId: userId, byName: userName, byRoles: [userRole, ...additionalRoles], atUtc: nowUtc() },
    });
  }, []);

  const completeReview = useCallback<Ctx['completeReview']>((docId, outcome, note, userRole, additionalRoles = []) => {
    const { userId, userName } = identityFor(userRole);
    dispatch({
      type: 'COMPLETE_REVIEW',
      payload: {
        record: {
          id: localId('rev'),
          docId,
          reviewedByUserId: userId,
          reviewedByName: userName,
          reviewedAtUtc: nowUtc(),
          outcome,
          note,
        },
        today: todayIso(),
        actorRoles: [userRole, ...additionalRoles],
      },
    });
  }, []);

  const value: Ctx = {
    state,
    createDoc: useCallback((doc, revision, actorRoles) => dispatch({ type: 'CREATE_DOC', payload: { doc, revision, actorRoles } }), []),
    updateDocMeta: useCallback((doc, userRole, additionalRoles = []) => {
      const { userId } = identityFor(userRole);
      dispatch({
        type: 'UPDATE_DOC_META',
        payload: { doc, actorUserId: userId, actorRoles: [userRole, ...additionalRoles] },
      });
    }, []),
    togglePin: useCallback((id, actorRoles) => dispatch({ type: 'TOGGLE_PIN', payload: { docId: id, actorRoles } }), []),
    toggleArchive: useCallback((id, actorRoles) => dispatch({ type: 'TOGGLE_ARCHIVE', payload: { docId: id, actorRoles } }), []),
    createDraft: useCallback((r, actorRoles) => dispatch({ type: 'CREATE_DRAFT', payload: { revision: r, actorRoles } }), []),
    updateDraft: useCallback((r) => dispatch({ type: 'UPDATE_DRAFT', payload: r }), []),
    withdrawDraft: useCallback((revisionId, reason, userRole, additionalRoles = []) => {
      const { userId, userName } = identityFor(userRole);
      dispatch({
        type: 'WITHDRAW_DRAFT',
        payload: { revisionId, reason, byUserId: userId, byName: userName, byRoles: [userRole, ...additionalRoles], atUtc: nowUtc() },
      });
    }, []),
    submitForApproval,
    decideApproval,
    publishDirect: useCallback((revisionId, actorRoles) => {
      dispatch({ type: 'PUBLISH_DIRECT', payload: { revisionId, atUtc: nowUtc(), today: todayIso(), actorRoles } });
    }, []),
    acknowledgeInitials,
    acknowledgeSignature,
    addComment,
    editComment,
    deleteComment,
    addSuggestion,
    resolveSuggestion,
    addSuggestionReply,
    completeReview,
  };

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments(): Ctx {
  const c = useContext(DocumentsContext);
  if (!c) throw new Error('useDocuments must be used within DocumentsProvider');
  return c;
}

/**
 * Non-throwing read, for surfaces where the knowledge store is an ENHANCEMENT rather
 * than a dependency (D60's CAS picker on the defect form). The defect form is mounted
 * from five places and must keep working with no documents store at all — free text is
 * D57's declared fallback — so a missing provider degrades the picker instead of
 * crashing the intake form for a signed record.
 */
export function useDocumentsOptional(): Ctx | undefined {
  return useContext(DocumentsContext);
}

/** Publish the point-in-time notification events for a revision that just went live.
 * Kept outside the reducer (side effect) — callers invoke after a successful publish. */
export function publishRequiredReadEvent(doc: Doc, rev: DocRevision): void {
  if (!rev.requireAcknowledgment || rev.ackLevel === 'none') return;
  eventStore.publish({
    id: `doc-published:${rev.id}`,
    severity: 'warn',
    title: `New required read: ${doc.title}`,
    detail: `${doc.id} rev ${rev.revision} — read & ${rev.ackLevel === 'signature' ? 'sign' : 'initial'} required`,
    module: 'Documents',
    link: docReaderPath(doc.id),
    audienceRoles: expandAudience(doc.roles),
  });
}

export function publishApprovalRequestedEvent(doc: Doc, rev: DocRevision): void {
  eventStore.publish({
    id: `doc-approval-requested:${rev.id}`,
    severity: 'info',
    title: `Approval requested: ${doc.title}`,
    detail: `${doc.id} rev ${rev.revision} submitted by ${rev.authorName}`,
    module: 'Documents',
    link: '/documents',
    audienceRoles: classFor(doc.classId).approverRoles,
  });
}

/** C7: tell the approver pool that a revision awaiting their decision was pulled. */
export function publishWithdrawnEvent(doc: Doc, rev: DocRevision, byName: string): void {
  eventStore.publish({
    id: `doc-withdrawn:${rev.id}`,
    severity: 'info',
    title: `Approval request withdrawn: ${doc.title}`,
    detail: `${doc.id} rev ${rev.revision} was withdrawn by ${byName}`,
    module: 'Documents',
    link: '/documents',
    audienceRoles: classFor(doc.classId).approverRoles,
  });
}

export function publishSuggestionFiledEvent(doc: Doc, byName: string): void {
  eventStore.publish({
    id: `doc-suggestion:${doc.id}:${Date.now().toString(36)}`,
    severity: 'info',
    title: `Suggestion filed on ${doc.title}`,
    detail: `${doc.id} — feedback from ${byName}`,
    module: 'Documents',
    link: '/documents',
    audienceRoles: ['document-manager', 'admin'],
  });
}
