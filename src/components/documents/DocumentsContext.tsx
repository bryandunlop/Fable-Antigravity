import React, { createContext, useCallback, useContext, useEffect, useReducer, ReactNode } from 'react';
import type {
  Doc,
  DocRevision,
  DocAcknowledgment,
  DocComment,
  DocSuggestion,
  DocReviewRecord,
  DocumentsState,
} from './types';
import type { Signature } from '../tech-log/types';
import { classFor } from './classes';
import { getSeedState } from './mockData';
import { applyPublish, promoteScheduled, currentRevision } from './engine/revisions';
import { validateSubmit, validateDecision, validateDirectPublish } from './engine/lifecycle';
import { computeNextReviewDate } from './engine/review';
import { importLegacyBulletins, isBulletinClass } from './engine/bulletinCompat';
import { SYSTEM_USERS, ROLE_CATEGORIES, ADDITIONAL_ROLES, getRoleLabelByValue } from '../../lib/mockUsers';
import { resolveUserId } from '../../notifications/identity';
import { eventStore } from '../../notifications/events';

export const STORAGE_KEY = 'documents-state';
export const VERSION_KEY = 'documents-data-version';
export const DATA_VERSION = '2026-07-10-v1';

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
  return new Date().toISOString().slice(0, 10);
}

function loadInitialState(): DocumentsState {
  const seedWithLegacy = (): DocumentsState => {
    const seed = getSeedState();
    // One-time migration of the legacy bulletins store: user edits + ack history
    // replace the bulletin-class seeds (ack records must never be silently lost).
    try {
      const legacy = importLegacyBulletins(localStorage.getItem('bulletins-state'));
      if (legacy) {
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
    if (localStorage.getItem(VERSION_KEY) !== DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      return promote(seedWithLegacy());
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return promote(raw ? { ...getSeedState(), ...JSON.parse(raw) } : seedWithLegacy());
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
  | { type: 'CREATE_DOC'; payload: { doc: Doc; revision: DocRevision } }
  | { type: 'UPDATE_DOC_META'; payload: Doc }
  | { type: 'TOGGLE_PIN'; payload: string }
  | { type: 'TOGGLE_ARCHIVE'; payload: string }
  | { type: 'CREATE_DRAFT'; payload: DocRevision }
  | { type: 'UPDATE_DRAFT'; payload: DocRevision }
  | { type: 'WITHDRAW_DRAFT'; payload: string }
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
  | { type: 'PUBLISH_DIRECT'; payload: { revisionId: string; atUtc: string; today: string } }
  | { type: 'ACKNOWLEDGE'; payload: { ack: DocAcknowledgment; signature?: Signature } }
  | { type: 'ADD_COMMENT'; payload: DocComment }
  | { type: 'ADD_SUGGESTION'; payload: DocSuggestion }
  | {
      type: 'RESOLVE_SUGGESTION';
      payload: { id: string; status: 'accepted' | 'declined'; note?: string; byUserId: string; byName: string; atUtc: string };
    }
  | { type: 'COMPLETE_REVIEW'; payload: { record: DocReviewRecord; today: string } };

function warnNoop(reason: string | undefined): void {
  if (typeof console !== 'undefined') console.warn(`[documents] action rejected: ${reason ?? 'invalid'}`);
}

export function documentsReducer(state: DocumentsState, action: DocumentsAction): DocumentsState {
  switch (action.type) {
    case 'CREATE_DOC': {
      const { doc, revision } = action.payload;
      if (state.docs.some((d) => d.id === doc.id)) {
        warnNoop(`doc ${doc.id} already exists`);
        return state;
      }
      return { ...state, docs: [doc, ...state.docs], revisions: [...state.revisions, revision] };
    }
    case 'UPDATE_DOC_META':
      return { ...state, docs: state.docs.map((d) => (d.id === action.payload.id ? action.payload : d)) };
    case 'TOGGLE_PIN':
      return {
        ...state,
        docs: state.docs.map((d) => (d.id === action.payload ? { ...d, isPinned: !d.isPinned } : d)),
      };
    case 'TOGGLE_ARCHIVE':
      return {
        ...state,
        docs: state.docs.map((d) => (d.id === action.payload ? { ...d, isArchived: !d.isArchived } : d)),
      };
    case 'CREATE_DRAFT': {
      const rev = action.payload;
      if (!state.docs.some((d) => d.id === rev.docId)) {
        warnNoop(`no doc ${rev.docId} for draft`);
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
      const existing = state.revisions.find((r) => r.id === action.payload);
      if (!existing || (existing.status !== 'draft' && existing.status !== 'rejected' && existing.status !== 'pending-approval')) {
        warnNoop('only a draft or pending revision can be withdrawn');
        return state;
      }
      const remaining = state.revisions.filter((r) => r.id !== action.payload);
      // A doc with no remaining revisions disappears with its last draft.
      const stillHasRevs = remaining.some((r) => r.docId === existing.docId);
      return {
        ...state,
        revisions: remaining,
        docs: stillHasRevs ? state.docs : state.docs.filter((d) => d.id !== existing.docId),
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
      // One ack per (revision, user): replace any prior record.
      const kept = state.acknowledgments.filter(
        (x) => !(x.revisionId === ack.revisionId && x.userId === ack.userId),
      );
      return {
        ...state,
        acknowledgments: [...kept, ack],
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
    case 'ADD_SUGGESTION':
      return { ...state, suggestions: [...state.suggestions, action.payload] };
    case 'RESOLVE_SUGGESTION': {
      const p = action.payload;
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
      const { record, today } = action.payload;
      const doc = state.docs.find((d) => d.id === record.docId);
      if (!doc) return state;
      const cycle = doc.reviewCycleDays ?? classFor(doc.classId).defaultReviewCycleDays;
      return {
        ...state,
        reviews: [...state.reviews, record],
        docs: state.docs.map((d) =>
          d.id === doc.id && cycle ? { ...d, nextReviewDate: computeNextReviewDate(today, cycle) } : d,
        ),
      };
    }
    default:
      return state;
  }
}

interface Ctx {
  state: DocumentsState;
  createDoc: (doc: Doc, revision: DocRevision) => void;
  updateDocMeta: (doc: Doc) => void;
  togglePin: (docId: string) => void;
  toggleArchive: (docId: string) => void;
  createDraft: (revision: DocRevision) => void;
  updateDraft: (revision: DocRevision) => void;
  withdrawDraft: (revisionId: string) => void;
  submitForApproval: (revisionId: string) => void;
  decideApproval: (input: {
    revisionId: string;
    deciderRoles: string[];
    deciderRole: string;
    approve: boolean;
    reason?: string;
  }) => void;
  publishDirect: (revisionId: string) => void;
  /** Lightweight checkbox+initials acknowledgment. */
  acknowledgeInitials: (doc: Doc, rev: DocRevision, initials: string, userRole: string) => void;
  /** High-consequence acknowledgment via the shared sign ceremony. */
  acknowledgeSignature: (doc: Doc, rev: DocRevision, signature: Signature, userRole: string) => void;
  addComment: (docId: string, text: string, userRole: string) => void;
  addSuggestion: (input: {
    doc: Doc;
    rev: DocRevision;
    sectionRef?: string;
    proposedChange: string;
    rationale: string;
    userRole: string;
  }) => void;
  resolveSuggestion: (id: string, status: 'accepted' | 'declined', note: string | undefined, userRole: string) => void;
  completeReview: (docId: string, outcome: DocReviewRecord['outcome'], note: string | undefined, userRole: string) => void;
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
      proposedChange: input.proposedChange.trim(),
      rationale: input.rationale.trim(),
      status: 'open',
      createdAtUtc: nowUtc(),
    };
    dispatch({ type: 'ADD_SUGGESTION', payload: suggestion });
  }, []);

  const resolveSuggestion = useCallback<Ctx['resolveSuggestion']>((id, status, note, userRole) => {
    const { userId, userName } = identityFor(userRole);
    dispatch({
      type: 'RESOLVE_SUGGESTION',
      payload: { id, status, note, byUserId: userId, byName: userName, atUtc: nowUtc() },
    });
  }, []);

  const completeReview = useCallback<Ctx['completeReview']>((docId, outcome, note, userRole) => {
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
      },
    });
  }, []);

  const value: Ctx = {
    state,
    createDoc: useCallback((doc, revision) => dispatch({ type: 'CREATE_DOC', payload: { doc, revision } }), []),
    updateDocMeta: useCallback((doc) => dispatch({ type: 'UPDATE_DOC_META', payload: doc }), []),
    togglePin: useCallback((id) => dispatch({ type: 'TOGGLE_PIN', payload: id }), []),
    toggleArchive: useCallback((id) => dispatch({ type: 'TOGGLE_ARCHIVE', payload: id }), []),
    createDraft: useCallback((r) => dispatch({ type: 'CREATE_DRAFT', payload: r }), []),
    updateDraft: useCallback((r) => dispatch({ type: 'UPDATE_DRAFT', payload: r }), []),
    withdrawDraft: useCallback((id) => dispatch({ type: 'WITHDRAW_DRAFT', payload: id }), []),
    submitForApproval,
    decideApproval,
    publishDirect: useCallback((revisionId) => {
      dispatch({ type: 'PUBLISH_DIRECT', payload: { revisionId, atUtc: nowUtc(), today: todayIso() } });
    }, []),
    acknowledgeInitials,
    acknowledgeSignature,
    addComment,
    addSuggestion,
    resolveSuggestion,
    completeReview,
  };

  return <DocumentsContext.Provider value={value}>{children}</DocumentsContext.Provider>;
}

export function useDocuments(): Ctx {
  const c = useContext(DocumentsContext);
  if (!c) throw new Error('useDocuments must be used within DocumentsProvider');
  return c;
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
    link: classFor(doc.classId).readerRoute === '/documents' ? `/documents/${doc.id}` : classFor(doc.classId).readerRoute,
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
