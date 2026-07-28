/**
 * Durable storage for company airport pages (D46, D47).
 *
 * Follows the tech-log precedent rather than inventing a pattern: a `StorageLike`
 * seam so the rules are testable in node, and — the load-bearing part —
 * **synchronous writes**. Tech-log learned this the hard way: a 300 ms debounced
 * whole-blob write had its pending write cancelled by an unmount, and a signed
 * record was silently lost.
 *
 * The same reasoning applies here. A published company page version is an
 * operational assertion someone may be asked about, and under D49 it can carry a
 * ban that stops a flight. An acknowledgement is the record of a crew having read
 * it. Neither may depend on a timer that a navigation can outrun, so both persist
 * in the same call that creates them.
 *
 * This is the prototype's storage. The `CompanyAirportPageStore` interface is
 * unchanged, so a database-backed implementation drops in without touching a
 * caller — which is the point of keeping the core storage-agnostic. TL-15 and
 * TL-18 mean a real API could not be exercised today even if it were written.
 */

import type { StorageLike } from '../../notifications/storage';
import {
  InMemoryCompanyAirportPageStore,
  type AirportReviewAcknowledgement,
  type AcknowledgeRequest,
  type CompanyAirportPageSnapshot,
  type CompanyAirportPageVersion,
  type ConfirmFieldRequest,
  type FieldConfirmation,
  type PublishRequest,
  type StoreClock,
} from './pageStore';

export const COMPANY_PAGES_KEY = 'airport-company-pages';

function hydrate(storage: StorageLike): CompanyAirportPageSnapshot | undefined {
  const raw = storage.getItem(COMPANY_PAGES_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<CompanyAirportPageSnapshot>;
    // Start empty rather than throwing on corrupt storage. A page that cannot
    // render at all is worse than one that shows no company data — the FAA
    // reference layer still works, and the operator can republish.
    return {
      versions: Array.isArray(parsed.versions) ? parsed.versions : [],
      acknowledgements: Array.isArray(parsed.acknowledgements) ? parsed.acknowledgements : [],
      // Absent in blobs written before D54. Missing confirmations degrade to
      // "publish time is the last confirmation", which is the correct reading of
      // a page nobody had yet been able to confirm.
      confirmations: Array.isArray(parsed.confirmations) ? parsed.confirmations : [],
    };
  } catch {
    return undefined;
  }
}

export class PersistentCompanyAirportPageStore extends InMemoryCompanyAirportPageStore {
  constructor(
    private readonly storage: StorageLike,
    clock: StoreClock,
  ) {
    super(clock, hydrate(storage));
  }

  publish(request: PublishRequest): CompanyAirportPageVersion {
    // If publish throws — a stale basedOnVersion — nothing was appended and
    // nothing is written, so a rejected edit leaves no trace in storage.
    const version = super.publish(request);
    this.flush();
    return version;
  }

  acknowledge(request: AcknowledgeRequest): AirportReviewAcknowledgement {
    const acknowledgement = super.acknowledge(request);
    this.flush();
    return acknowledgement;
  }

  confirm(request: ConfirmFieldRequest): FieldConfirmation {
    // A confirmation is the evidence that someone checked a fact. Losing it to a
    // debounce would silently roll the field back to looking unreviewed.
    const confirmation = super.confirm(request);
    this.flush();
    return confirmation;
  }

  private flush(): void {
    try {
      this.storage.setItem(COMPANY_PAGES_KEY, JSON.stringify(this.snapshot()));
    } catch {
      // Storage full or unavailable (private browsing). The in-memory state is
      // still correct for this session; swallowing here keeps a quota error from
      // destroying a publish the user has already been told succeeded. Surfacing
      // this properly needs its own slice.
    }
  }
}
