// Document classes are CONFIG, not code. Adding a class (checklists, training…)
// is one entry here plus seeds — every engine function and the reducer take the
// class config as data.
import type { AckLevel } from './types';

export interface DocumentClassConfig {
  id: string;
  label: string;
  labelPlural: string;
  idPrefix: string; // 'PB' | 'FOB' | 'SOP' | 'GOM' | 'TK'
  /** true ⇒ four-eyes draft→approve→publish; false ⇒ direct publish (tribal knowledge only). */
  controlled: boolean;
  /** Publisher default; class sets it, publisher may override… */
  defaultAckLevel: AckLevel;
  /** …unless locked (tribal knowledge: locked 'none'). */
  ackLevelLocked: boolean;
  /** Who may draft/create (any of the user's roles qualifies). */
  authorRoles: string[];
  /** Who may approve (controlled classes; must differ from the proposer). */
  approverRoles: string[];
  commentsEnabled: boolean;
  defaultReviewCycleDays?: number;
  categories: string[];
  /** Default ack window (days after publish) used to prefill ackDueDate. */
  defaultAckDueDays?: number;
}

/**
 * Where a document is read. D66: the Document Center is the ONLY reader, for every
 * class — so this is a function of the doc id alone, not of its class.
 *
 * This used to be a per-class `readerRoute`, which existed solely so the two bulletin
 * classes could point at their own bespoke pages. Every call site then carried the
 * same `route === '/documents' ? \`/documents/${id}\` : route` ternary, and a link to
 * a bulletin landed on a LIST rather than on the document the notification named.
 */
export function docReaderPath(docId: string): string {
  return `/documents/${docId}`;
}

const APPROVERS = ['document-manager', 'lead', 'admin'];
const BULLETIN_AUTHORS = ['admin', 'safety', 'lead', 'document-manager', 'procedural-specialist'];
/**
 * Curators per Bryan's call: document + procedural roles, lead-tier (Chief Pilot / DOM), admin —
 * plus plain `maintenance`.
 *
 * **D60 is the authority for the `'maintenance'` entry.** It specifies direct publish by any
 * maintenance user; without the plain role a line technician (`USR008`, roles `['maintenance']`)
 * got the tail page's Reference tab read-only. It only looked correct in the demo because the first
 * `maintenance` login resolves to a persona who also holds `dom`. `casCuratorRoles.test.ts` pins
 * that a `['maintenance']`-only user can author tribal knowledge.
 *
 * `'chief-pilot'` stays: Bryan considered removing it and declined.
 */
const TK_CURATORS = ['document-manager', 'procedural-specialist', 'lead', 'chief-pilot', 'dom', 'admin', 'maintenance'];

export const DOC_CLASSES: Record<string, DocumentClassConfig> = {
  'procedural-bulletin': {
    id: 'procedural-bulletin',
    label: 'Procedural Bulletin',
    labelPlural: 'Procedural Bulletins',
    idPrefix: 'PB',
    controlled: true,
    defaultAckLevel: 'initials',
    ackLevelLocked: false,
    authorRoles: BULLETIN_AUTHORS,
    approverRoles: APPROVERS,
    commentsEnabled: false,
    categories: ['Flight Operations', 'Maintenance Procedures', 'Safety Procedures', 'Inflight Service', 'Administrative'],
    defaultAckDueDays: 7,
  },
  'flight-ops-bulletin': {
    id: 'flight-ops-bulletin',
    label: 'Flight Ops Bulletin',
    labelPlural: 'Flight Ops Bulletins',
    idPrefix: 'FOB',
    controlled: true,
    defaultAckLevel: 'initials',
    ackLevelLocked: false,
    authorRoles: BULLETIN_AUTHORS,
    approverRoles: APPROVERS,
    commentsEnabled: false,
    categories: ['Flight Operations', 'Safety Procedures', 'Administrative'],
    defaultAckDueDays: 7,
  },
  sop: {
    id: 'sop',
    label: 'SOP',
    labelPlural: 'SOPs',
    idPrefix: 'SOP',
    controlled: true,
    defaultAckLevel: 'signature',
    ackLevelLocked: false,
    authorRoles: ['document-manager', 'procedural-specialist', 'safety', 'lead', 'admin'],
    approverRoles: APPROVERS,
    commentsEnabled: false,
    defaultReviewCycleDays: 365,
    categories: ['Flight Operations', 'Maintenance Procedures', 'Safety Procedures', 'Inflight Service', 'Ground Operations'],
    defaultAckDueDays: 7,
  },
  manual: {
    id: 'manual',
    label: 'Manual',
    labelPlural: 'Manuals',
    idPrefix: 'GOM',
    controlled: true,
    defaultAckLevel: 'initials',
    ackLevelLocked: false,
    authorRoles: ['document-manager', 'admin'],
    approverRoles: APPROVERS,
    commentsEnabled: false,
    defaultReviewCycleDays: 365,
    categories: ['General Operations', 'Flight Operations', 'Maintenance', 'Emergency Procedures'],
    defaultAckDueDays: 14,
  },
  'tribal-knowledge': {
    id: 'tribal-knowledge',
    label: 'Tribal Knowledge',
    labelPlural: 'Tribal Knowledge',
    idPrefix: 'TK',
    controlled: false,
    defaultAckLevel: 'none',
    ackLevelLocked: true,
    authorRoles: TK_CURATORS,
    approverRoles: [],
    commentsEnabled: true,
    defaultReviewCycleDays: 180,
    categories: ['Airports & FBOs', 'Aircraft Quirks', 'Operations', 'Maintenance', 'Cabin'],
  },
};

export const DOC_CLASS_LIST: DocumentClassConfig[] = Object.values(DOC_CLASSES);

export function classFor(classId: string): DocumentClassConfig {
  const cfg = DOC_CLASSES[classId];
  if (!cfg) throw new Error(`Unknown document class: ${classId}`);
  return cfg;
}

/** Does any of the user's roles appear in the given list? */
export function hasAnyRole(allowed: string[], userRoles: string | string[]): boolean {
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles];
  return roles.some((r) => allowed.includes(r));
}
