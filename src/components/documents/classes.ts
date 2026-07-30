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
  /**
   * D64 — may this class's revisions carry `fleetTypes`, i.e. appear on a tail page?
   *
   * Config rather than a hard-coded class id, because two classes now need it for opposite
   * reasons: tribal knowledge because it IS the shelf, and `sop` because D64 rules that a
   * procedure performed on the aircraft (a chart or navigation-database load) stays controlled
   * and the shelf links out to it. Before this flag `fleetTypes` was written only when
   * `cfg.id === 'tribal-knowledge'`, so a fleet-scoped SOP had no authoring path at all and
   * D64's split existed on paper only.
   *
   * This is the widening D65's hinge assumption anticipated. It is safe because `fleetTypes` is
   * read off the revision and never copied onto the `Doc` (it is not part of `proposedMeta`), so
   * it rides the controlled draft→approve→publish path as ordinary revision content and touches
   * no approval logic.
   */
  fleetScoped?: boolean;
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

/**
 * D64 — the Ship Notes shelf's section headings, in display order.
 *
 * These are `Doc.category` values, not a new axis: the editor's category picker IS the section
 * picker, so no schema and no migration of the block tree. The order here is the order on the tail
 * page — a reader's own section is expanded first (see `shipNoteSections`), but the list itself is
 * stable so the shelf does not reshuffle between tails.
 *
 * D64 ruled these are what you are DOING, not who you are. That is why 'Maintenance' is absent:
 * it is a department, which is the audience axis this decision deliberately moved away from.
 */
export const SHIP_NOTE_SECTIONS = [
  'Messages & faults',
  'Loading & updates',
  'Cabin & connectivity',
  'Quirks & field notes',
] as const;

export type ShipNoteSection = (typeof SHIP_NOTE_SECTIONS)[number];

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
    fleetScoped: true,
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
    // Two general-library categories (an airport note carries no fleetTypes and so never reaches a
    // tail page), then the aircraft shelf's own vocabulary. 'Maintenance', 'Cabin' and
    // 'Aircraft Quirks' are RETIRED — the first two are departments rather than topics, and the
    // third is simply the old name for 'Quirks & field notes'. All three migrate forward
    // (engine/migrations); keeping them alongside the new names would be two categories for one
    // idea, which is how a picker starts lying about where things go.
    categories: ['Airports & FBOs', 'Operations', ...SHIP_NOTE_SECTIONS],
    fleetScoped: true,
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
