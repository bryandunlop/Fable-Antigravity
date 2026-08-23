/**
 * Company airport pages — the operator-authored layer (D46) and its versioning
 * discipline (D47).
 *
 * A company page holds the airport facts no vendor supplies: PPR, curfews, ops
 * notes, FBO preference, ramp and handling limits, and annotations that disagree
 * with the FAA reference data. It is an updatable ledger in the project's terms:
 * an edit publishes a new version, nothing is ever mutated in place.
 *
 * D47 is a one-way door. When a crew marks an airport reviewed, the
 * acknowledgement pins a foreign key to the exact version it saw, so
 * reconstructing "what did the ops note say on the day they flew it" is a lookup
 * rather than an inference from timestamps. Timestamp inference fails in exactly
 * the cases that matter — a backdated edit, clock skew, an edit and a review
 * landing in the same second.
 *
 * The NASR reference cycle is a SECOND, INDEPENDENT clock and is captured on the
 * acknowledgement itself. It must never be reached only by joining through the
 * company version; the two are not synchronised and conflating them silently
 * mixes up which layer was current.
 *
 * This is the storage-agnostic core, following the pattern in
 * src/scheduling/store/. The in-memory implementation is the semantic spec and
 * is what the tests run against; a Drizzle-backed implementation satisfies the
 * same interface.
 */

export interface ReferenceAnnotation {
  /** Which reference field the operator disagrees with, e.g. 'runway.01/19.lda'. */
  field: string;
  /** What FAA NASR publishes. */
  referenceValue: string;
  /** What the operator asserts instead. */
  companyValue: string;
  reviewerOid: string;
  reviewerSignoffAtUtc: string;
  note?: string;
}

export interface CompanyAirportPageContent {
  ppr: string | null;
  curfew: string | null;
  opsNotes: string | null;
  fboPreference: string | null;
  rampHandlingLimits: string | null;
  /**
   * "What we do here" — the one sentence the team wants read first (D96).
   *
   * Rendered in the airport header and on every search card, under BOTH lenses,
   * because the recommendation is the same fact whichever job you came for: it
   * names the handler AND where maintenance goes. It is the honest successor to
   * the legacy page's `suggestedSupport`, which was a free-text field nobody
   * could tell the age of.
   */
  teamRecommendation: string | null;
  /** Can an aircraft be worked where it stands? (D96) */
  onFieldCapability: string | null;
  /** Who travels to it, from where, and how long that takes. (D96) */
  mobileResponse: string | null;
  /** Local independent shops — usually the "some hands, no CRS" answer. (D96) */
  localIndependent: string | null;
  /** Our own technicians: based here, or how far away. (D96) */
  companySupport: string | null;
  /** Parts and the AOG desk that serves this station. (D96) */
  partsAndAog: string | null;
  /** GPU, air start, hangar, tow — what the ramp can actually give you. (D96) */
  groundKit: string | null;
  /** Who to phone. Free text; holds names and numbers of people outside the company. (D96) */
  stationContacts: string | null;
  referenceAnnotations: ReferenceAnnotation[];
}

/**
 * The station-support fields (D96) — the seven that replaced the legacy page's
 * star ratings, plus the recommendation that sits above them.
 *
 * They are grouped for the UI's benefit (they render as one card, in this
 * order). They are no longer a permissions boundary: as of 2026-08-22 EVERY
 * company-page field saves direct, support or not. See EDITABLE_FIELDS.
 */
export type SupportField =
  | 'teamRecommendation'
  | 'onFieldCapability'
  | 'mobileResponse'
  | 'localIndependent'
  | 'companySupport'
  | 'partsAndAog'
  | 'groundKit'
  | 'stationContacts';

export const SUPPORT_FIELDS: readonly SupportField[] = [
  'teamRecommendation',
  'onFieldCapability',
  'mobileResponse',
  'localIndependent',
  'companySupport',
  'partsAndAog',
  'groundKit',
  'stationContacts',
];

const SUPPORT_FIELD_SET: ReadonlySet<string> = new Set(SUPPORT_FIELDS);

export function isSupportField(field: string): field is SupportField {
  return SUPPORT_FIELD_SET.has(field);
}

/** An empty page — every field absent. The base a first save builds on. */
export function emptyPageContent(): CompanyAirportPageContent {
  return {
    ppr: null,
    curfew: null,
    opsNotes: null,
    fboPreference: null,
    rampHandlingLimits: null,
    teamRecommendation: null,
    onFieldCapability: null,
    mobileResponse: null,
    localIndependent: null,
    companySupport: null,
    partsAndAog: null,
    groundKit: null,
    stationContacts: null,
    referenceAnnotations: [],
  };
}

/**
 * The fields a human can confirm as still true (D54). Reference annotations are
 * excluded — they already carry their own reviewer sign-off.
 */
export type ConfirmableField =
  | 'ppr'
  | 'curfew'
  | 'opsNotes'
  | 'fboPreference'
  | 'rampHandlingLimits'
  | SupportField;

export const CONFIRMABLE_FIELDS: readonly ConfirmableField[] = [
  'ppr',
  'curfew',
  'opsNotes',
  'fboPreference',
  'rampHandlingLimits',
  ...SUPPORT_FIELDS,
];

/**
 * Every company-page field a person may write directly — which, since
 * 2026-08-22, is every text field on the page (Bryan: *"let the five older
 * fields save direct too"*).
 *
 * D96 originally relaxed only the seven station-support fields and left PPR,
 * curfew, ops notes, FBO preference and ramp limits on D46's
 * propose/approve/publish route. One card then behaved two ways depending on
 * which half of it you clicked, which is not a rule anyone could hold in their
 * head. It is now one rule: write it, it publishes, your name is on it.
 *
 * KNOWN AND ACCEPTED: `requiredApprovals` classes ppr, curfew and
 * rampHandlingLimits as SAFETY fields needing the chief pilot, on the reasoning
 * that a wrong assertion there is the one most likely to put an aircraft
 * somewhere it should not be. That gate no longer stands in the way of a direct
 * save. It still governs the proposal route, which is deliberately kept alive
 * as an opt-in second pair of eyes rather than deleted.
 *
 * `referenceAnnotations` is NOT here and must not be. An annotation contradicts
 * published FAA data — a different act from writing down what we do, and the
 * one place a reviewer still earns their keep.
 */
export const EDITABLE_FIELDS: readonly ConfirmableField[] = CONFIRMABLE_FIELDS;

const EDITABLE_FIELD_SET: ReadonlySet<string> = new Set(EDITABLE_FIELDS);

export function isEditableField(field: string): field is ConfirmableField {
  return EDITABLE_FIELD_SET.has(field);
}

/** Where an explicit confirmation came from. A publish is synthesised, never stored. */
export type ConfirmationSource = 'officer' | 'crew' | 'debrief' | 'maintenance';

/**
 * "This fact was checked and is still true on date X" (D54) — distinct from a
 * page version, which only says it was CHANGED on date X, and from an
 * acknowledgement, which says only that someone READ it.
 */
export interface FieldConfirmation {
  id: string;
  icao: string;
  field: ConfirmableField;
  confirmedBy: string;
  /** Server-stamped. Client times are advisory and are not accepted here. */
  confirmedAtUtc: string;
  source: ConfirmationSource;
  /** The version whose value was confirmed — reusing D47's pin rather than inventing a second one. */
  versionIdSeen: string;
  note?: string;
}

export interface CompanyAirportPageVersion {
  id: string;
  icao: string;
  /** Monotonic from 1, per airport. */
  version: number;
  content: CompanyAirportPageContent;
  publishedBy: string;
  /** Server-stamped. Client times are advisory and are not accepted here. */
  publishedAtUtc: string;
}

export interface AirportReviewAcknowledgement {
  id: string;
  icao: string;
  /** The exact version the crew saw — D47's pinning FK. */
  companyPageVersionId: string;
  /** The reference layer's clock, captured independently of the company version. */
  nasrCycleEffDate: string | null;
  crewOid: string;
  /** Server-stamped. */
  acknowledgedAtUtc: string;
}

export interface PublishRequest {
  icao: string;
  content: CompanyAirportPageContent;
  publishedBy: string;
  /**
   * The version this edit was drafted against. Required once a page exists.
   *
   * This is a compare-and-swap, not an optimisation: retrying a rejected publish
   * with a recomputed version number would rebase a stale draft onto content the
   * author never saw.
   */
  basedOnVersion?: number;
}

export interface AcknowledgeRequest {
  icao: string;
  crewOid: string;
  nasrCycleEffDate: string | null;
}

export interface ConfirmFieldRequest {
  icao: string;
  field: ConfirmableField;
  confirmedBy: string;
  source: ConfirmationSource;
  note?: string;
}

/**
 * One person's edit to one company-page field.
 *
 * Deliberately a single field rather than a content draft: someone fixing the
 * mobile-response number should not be able to clobber the ground-kit note
 * another person wrote while they had the page open. The compare-and-swap is on
 * the page as a whole (it has to be — the store versions pages, not fields), so
 * a concurrent edit still fails loudly rather than merging silently.
 */
export interface SaveFieldRequest {
  icao: string;
  field: ConfirmableField;
  /** null clears the field. Clearing publishes but records no confirmation. */
  value: string | null;
  savedBy: string;
  /** How the author knows. Optional, and the thing the next reader actually reads. */
  note?: string;
  /** Who is writing, in the confirmation's terms. Defaults to maintenance. */
  source?: ConfirmationSource;
  /**
   * The version the author was looking at. Omit only when no page exists yet.
   * Same CAS contract as `publish` — see `PublishRequest.basedOnVersion`.
   */
  basedOnVersion?: number;
}

/**
 * A save publishes and confirms in one act, so callers get both back. The
 * confirmation is null when the save cleared the field: there is then no fact to
 * attest, and confirming one would age on the review list as if there were.
 */
export interface SaveFieldResult {
  version: CompanyAirportPageVersion;
  confirmation: FieldConfirmation | null;
}

export class NotAnEditableFieldError extends Error {
  constructor(readonly field: string) {
    super(
      `Cannot save ${field} directly: it is not a company-page text field. ` +
        'Reference annotations contradict published FAA data and keep the ' +
        'propose/approve/publish path (D46).',
    );
    this.name = 'NotAnEditableFieldError';
  }
}

export class NothingToConfirmError extends Error {
  constructor(
    readonly icao: string,
    readonly field: ConfirmableField,
  ) {
    super(
      `Cannot confirm ${field} for ${icao}: the field carries no value. ` +
        'Confirmation attests that a stated fact is still true; there is no fact here.',
    );
    this.name = 'NothingToConfirmError';
  }
}

export class StaleBaseVersionError extends Error {
  constructor(
    readonly icao: string,
    readonly expected: number | null,
    readonly received: number | undefined,
  ) {
    super(
      `Cannot publish ${icao}: draft was based on version ${received ?? 'none'}, ` +
        `but the current version is ${expected ?? 'none'}. Reload and re-apply the edit.`,
    );
    this.name = 'StaleBaseVersionError';
  }
}

export interface CompanyAirportPageStore {
  publish(request: PublishRequest): CompanyAirportPageVersion;
  /** Write one company-page field with no approver in the path (D96). */
  saveField(request: SaveFieldRequest): SaveFieldResult;
  acknowledge(request: AcknowledgeRequest): AirportReviewAcknowledgement;
  confirm(request: ConfirmFieldRequest): FieldConfirmation;
  getLatest(icao: string): CompanyAirportPageVersion | null;
  getVersion(icao: string, version: number): CompanyAirportPageVersion | null;
  getVersionById(id: string): CompanyAirportPageVersion | null;
  /** Every version for an airport, oldest first — what the confirmation engine walks. */
  versionsFor(icao: string): CompanyAirportPageVersion[];
  /** Airports that have ever had a page published. The worklist's roster. */
  icaosWithPages(): string[];
  acknowledgementsFor(icao: string): AirportReviewAcknowledgement[];
  confirmationsFor(icao: string): FieldConfirmation[];
}

export interface StoreClock {
  now: () => string;
  nextId: () => string;
}

/** Deep-copies content so neither the caller's draft nor a read-back object aliases stored state. */
function freezeContent(content: CompanyAirportPageContent): CompanyAirportPageContent {
  return {
    ppr: content.ppr,
    curfew: content.curfew,
    opsNotes: content.opsNotes,
    fboPreference: content.fboPreference,
    rampHandlingLimits: content.rampHandlingLimits,
    // Blobs written before D96 carry none of the support fields. Normalising the
    // absent ones to null here — rather than letting `undefined` through — keeps
    // "field has no value" a single condition everywhere downstream.
    teamRecommendation: content.teamRecommendation ?? null,
    onFieldCapability: content.onFieldCapability ?? null,
    mobileResponse: content.mobileResponse ?? null,
    localIndependent: content.localIndependent ?? null,
    companySupport: content.companySupport ?? null,
    partsAndAog: content.partsAndAog ?? null,
    groundKit: content.groundKit ?? null,
    stationContacts: content.stationContacts ?? null,
    referenceAnnotations: (content.referenceAnnotations ?? []).map((annotation) => ({
      ...annotation,
    })),
  };
}

function copyVersion(version: CompanyAirportPageVersion): CompanyAirportPageVersion {
  return { ...version, content: freezeContent(version.content) };
}

/** Everything the store holds — what a persistence layer round-trips. */
export interface CompanyAirportPageSnapshot {
  versions: CompanyAirportPageVersion[];
  acknowledgements: AirportReviewAcknowledgement[];
  confirmations: FieldConfirmation[];
}

export class InMemoryCompanyAirportPageStore implements CompanyAirportPageStore {
  protected readonly versions: CompanyAirportPageVersion[] = [];
  protected readonly acknowledgements: AirportReviewAcknowledgement[] = [];
  protected readonly confirmations: FieldConfirmation[] = [];

  constructor(
    protected readonly clock: StoreClock,
    seed?: CompanyAirportPageSnapshot,
  ) {
    if (seed) {
      this.versions.push(...seed.versions.map(copyVersion));
      this.acknowledgements.push(...seed.acknowledgements.map((a) => ({ ...a })));
      // Nullable on read: confirmations arrived after the first pages were
      // written, so an older stored blob has no such key.
      this.confirmations.push(...(seed.confirmations ?? []).map((c) => ({ ...c })));
    }
  }

  /** A deep copy, so a caller cannot mutate stored state through the snapshot. */
  snapshot(): CompanyAirportPageSnapshot {
    return {
      versions: this.versions.map(copyVersion),
      acknowledgements: this.acknowledgements.map((a) => ({ ...a })),
      confirmations: this.confirmations.map((c) => ({ ...c })),
    };
  }

  publish(request: PublishRequest): CompanyAirportPageVersion {
    const current = this.getLatest(request.icao);
    const currentVersion = current?.version ?? null;

    if (currentVersion !== (request.basedOnVersion ?? null)) {
      throw new StaleBaseVersionError(request.icao, currentVersion, request.basedOnVersion);
    }

    const version: CompanyAirportPageVersion = {
      id: this.clock.nextId(),
      icao: request.icao,
      version: (currentVersion ?? 0) + 1,
      content: freezeContent(request.content),
      publishedBy: request.publishedBy,
      publishedAtUtc: this.clock.now(),
    };

    this.versions.push(version);
    return copyVersion(version);
  }

  saveField(request: SaveFieldRequest): SaveFieldResult {
    if (!isEditableField(request.field)) {
      throw new NotAnEditableFieldError(request.field);
    }

    const current = this.getLatest(request.icao);
    const version = this.publish({
      icao: request.icao,
      // Spread the CURRENT content, not a caller-supplied draft: the caller only
      // ever names one field, so nothing they were not looking at can move.
      content: { ...(current?.content ?? emptyPageContent()), [request.field]: request.value },
      publishedBy: request.savedBy,
      basedOnVersion: request.basedOnVersion,
    });

    // Publishing a value is already a confirmation (see confirmations.ts), but
    // recording an explicit one carries the author's note and the source, which
    // is what the change record shows and what a synthesised publish cannot.
    const confirmation =
      request.value === null
        ? null
        : this.confirm({
            icao: request.icao,
            field: request.field,
            confirmedBy: request.savedBy,
            source: request.source ?? 'maintenance',
            note: request.note,
          });

    return { version, confirmation };
  }

  acknowledge(request: AcknowledgeRequest): AirportReviewAcknowledgement {
    const current = this.getLatest(request.icao);
    if (!current) {
      throw new Error(
        `Cannot acknowledge ${request.icao}: no published company page exists for it.`,
      );
    }

    const acknowledgement: AirportReviewAcknowledgement = {
      id: this.clock.nextId(),
      icao: request.icao,
      companyPageVersionId: current.id,
      nasrCycleEffDate: request.nasrCycleEffDate,
      crewOid: request.crewOid,
      acknowledgedAtUtc: this.clock.now(),
    };

    this.acknowledgements.push(acknowledgement);
    return { ...acknowledgement };
  }

  confirm(request: ConfirmFieldRequest): FieldConfirmation {
    const current = this.getLatest(request.icao);
    if (!current) {
      throw new Error(
        `Cannot confirm ${request.field} for ${request.icao}: no published company page exists for it.`,
      );
    }
    // Confirming an empty field would assert that nothing is still nothing, and
    // would then age on the worklist as if it were a fact needing review.
    if (current.content[request.field] === null) {
      throw new NothingToConfirmError(request.icao, request.field);
    }

    const confirmation: FieldConfirmation = {
      id: this.clock.nextId(),
      icao: request.icao,
      field: request.field,
      confirmedBy: request.confirmedBy,
      confirmedAtUtc: this.clock.now(),
      source: request.source,
      versionIdSeen: current.id,
      note: request.note,
    };

    this.confirmations.push(confirmation);
    return { ...confirmation };
  }

  versionsFor(icao: string): CompanyAirportPageVersion[] {
    return this.versions
      .filter((version) => version.icao === icao)
      .sort((a, b) => a.version - b.version)
      .map(copyVersion);
  }

  icaosWithPages(): string[] {
    return [...new Set(this.versions.map((version) => version.icao))].sort();
  }

  confirmationsFor(icao: string): FieldConfirmation[] {
    return this.confirmations
      .filter((confirmation) => confirmation.icao === icao)
      .map((confirmation) => ({ ...confirmation }));
  }

  getLatest(icao: string): CompanyAirportPageVersion | null {
    const found = this.versions
      .filter((version) => version.icao === icao)
      .reduce<CompanyAirportPageVersion | null>(
        (latest, version) => (latest && latest.version > version.version ? latest : version),
        null,
      );
    return found ? copyVersion(found) : null;
  }

  getVersion(icao: string, version: number): CompanyAirportPageVersion | null {
    const found = this.versions.find((v) => v.icao === icao && v.version === version);
    return found ? copyVersion(found) : null;
  }

  getVersionById(id: string): CompanyAirportPageVersion | null {
    const found = this.versions.find((v) => v.id === id);
    return found ? copyVersion(found) : null;
  }

  acknowledgementsFor(icao: string): AirportReviewAcknowledgement[] {
    return this.acknowledgements
      .filter((acknowledgement) => acknowledgement.icao === icao)
      .map((acknowledgement) => ({ ...acknowledgement }));
  }
}
