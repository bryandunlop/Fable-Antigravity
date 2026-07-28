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
  getLatest(icao: string): CompanyAirportPageVersion | null;
  getVersion(icao: string, version: number): CompanyAirportPageVersion | null;
  getVersionById(id: string): CompanyAirportPageVersion | null;
  acknowledgementsFor(icao: string): AirportReviewAcknowledgement[];
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
}

export class InMemoryCompanyAirportPageStore implements CompanyAirportPageStore {
  protected readonly versions: CompanyAirportPageVersion[] = [];
  protected readonly acknowledgements: AirportReviewAcknowledgement[] = [];

  constructor(
    protected readonly clock: StoreClock,
    seed?: CompanyAirportPageSnapshot,
  ) {
    if (seed) {
      this.versions.push(...seed.versions.map(copyVersion));
      this.acknowledgements.push(...seed.acknowledgements.map((a) => ({ ...a })));
    }
  }

  /** A deep copy, so a caller cannot mutate stored state through the snapshot. */
  snapshot(): CompanyAirportPageSnapshot {
    return {
      versions: this.versions.map(copyVersion),
      acknowledgements: this.acknowledgements.map((a) => ({ ...a })),
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
