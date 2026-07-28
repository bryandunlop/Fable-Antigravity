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
  referenceAnnotations: ReferenceAnnotation[];
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
  | 'rampHandlingLimits';

export const CONFIRMABLE_FIELDS: readonly ConfirmableField[] = [
  'ppr',
  'curfew',
  'opsNotes',
  'fboPreference',
  'rampHandlingLimits',
];

/** Where an explicit confirmation came from. A publish is synthesised, never stored. */
export type ConfirmationSource = 'officer' | 'crew' | 'debrief';

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
    referenceAnnotations: content.referenceAnnotations.map((annotation) => ({ ...annotation })),
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
