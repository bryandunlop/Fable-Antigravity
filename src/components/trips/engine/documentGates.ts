/**
 * Document gates — who aboard this trip is carrying a passport or visa that will not last the leg.
 *
 * Bryan chose the C plan on 2026-09-02, and answered the canvas's Q4: an expiring document does not
 * hard-stop a departure — it **refuses the freeze, and scheduling may override with a reason** that
 * is recorded on the trip. (Phase 5 slice 3, D109, LG-365.)
 *
 * THE SIX MONTHS ARE DEPARTMENT POLICY, NOT REGULATION.
 * "A passport must be valid six months beyond travel" is a widespread carrier and destination-entry
 * practice, not a rule this operator is subject to by any citation we hold. So it is a NUMBER IN
 * TRIP SETTINGS that scheduling can change, labelled as policy everywhere it is shown, and this file
 * asserts no regulatory basis for it. Bryan, 2026-09-02: "lets do a 6 month flag with a scheduling
 * override." If someone later produces GFO's written policy or a destination's entry requirement,
 * that becomes a reference note and this comment gets the citation; until then the honest statement
 * is "the department asks for six months", never "the rules require six months".
 * (CLAUDE.md: never present a rule as regulation without an `authoritative` reference note.)
 *
 * Pure. No React, no storage; the caller passes the clock, the register and the policy.
 */

import { SCHEDULING_DECIDES } from './places';
import { personById, personByName, type Person, type TravelDocument } from './people';
import type { Trip, TripLeg } from './trip';

export interface DocumentPolicy {
  /**
   * Months of passport validity the department asks for BEYOND an international leg's date.
   * Not a regulation — see the file comment. 0 disables the window; expiry is still checked.
   */
  internationalPassportMonths: number;
}

export const DEFAULT_DOCUMENT_POLICY: DocumentPolicy = { internationalPassportMonths: 6 };

export type GateKind =
  /** The document has already lapsed by the day of the leg. */
  | 'expired'
  /** Valid on the day, but short of the department's window. International passports only. */
  | 'short-validity';

export interface DocumentGate {
  personId: string;
  personName: string;
  legId: string;
  /** 0-based, so it lines up with `trip.legs`. Displayed as `legIndex + 1`. */
  legIndex: number;
  legDate: string;
  document: TravelDocument;
  kind: GateKind;
  /** A sentence a scheduler can act on, naming the date and — for policy — saying it is policy. */
  reason: string;
}

/** Stable across recomputation: person + leg + document, never an array index alone. */
export function gateKey(gate: DocumentGate): string {
  return `${gate.personId}|${gate.legId}|${gate.document.id}`;
}

/** "12 Oct 2026" — a date the way a person reads one, from a date-only string, in no time zone. */
function readableDate(dateOnly: string): string {
  const [y, m, d] = dateOnly.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

/**
 * `months` after a "YYYY-MM-DD" date, as a date string.
 *
 * Calendar months, clamped at the end of a short month: six months after 31 August is 28 February,
 * not 3 March. Deliberately not 180 days — the policy is spoken in months and a reader checking our
 * arithmetic against a calendar must get the same answer we did.
 */
export function addMonths(dateOnly: string, months: number): string {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** The people aboard this leg, resolved through ids where the trip has them. */
function aboard(trip: Trip, leg: TripLeg, people: Person[]): Person[] {
  if (leg.positioning) return [];
  if (trip.passengerIds?.length) {
    return trip.passengerIds.map(id => personById(people, id)).filter((p): p is Person => !!p);
  }
  return trip.passengerNames.map(n => personByName(people, n)).filter((p): p is Person => !!p);
}

/** Does this leg touch a non-US field? Same test the manifest and the names cutoff use. */
function legIsInternational(leg: TripLeg): boolean {
  const intl = (a: string | null | undefined) => !!a && a !== SCHEDULING_DECIDES && !a.startsWith('K');
  return intl(leg.from.airport) || intl(leg.to.airport);
}

/**
 * Every document problem this trip has, one entry per person per leg per document.
 *
 * A person with NO documents raises nothing here. That is deliberate and it is not the same as
 * "cleared": an empty list means nobody asked (see `Person.unverified`), and answering "is this
 * person cleared to fly" needs someone to have asked. This function answers only "does anything on
 * file run out too soon", and a gate it does not raise must never be read as a clearance.
 */
export function documentGates(
  trip: Trip,
  people: Person[],
  policy: DocumentPolicy,
  _nowUtc: string,
): DocumentGate[] {
  const out: DocumentGate[] = [];

  trip.legs.forEach((leg, legIndex) => {
    if (!leg.date) return;                       // no date, nothing to measure against
    // ONLY international legs raise document gates. A US-domestic leg needs neither passport nor
    // visa, so checking documents against it produces pure noise — A. Reyes's lapsed China visa
    // would have gated a Cincinnati-to-Boston hop, and a gate that cries wolf is a gate people
    // learn to click past. Per LEG, not per trip: a domestic leg inside an international trip is
    // still a domestic leg.
    if (!legIsInternational(leg)) return;
    // The window is measured from the LEG, never from today: a trip eight months out whose passport
    // expires the week after it is not saved by the fact that today is comfortably far away.
    const windowEnd = policy.internationalPassportMonths > 0
      ? addMonths(leg.date, policy.internationalPassportMonths)
      : null;

    for (const person of aboard(trip, leg, people)) {
      for (const document of person.documents) {
        // An `id` document is neither a passport nor a visa — it crosses no border, so it gates no leg.
        if (document.kind === 'id') continue;
        const expired = document.expiresOn < leg.date;
        const short = !expired
          && document.kind === 'passport'
          && windowEnd !== null
          && document.expiresOn < windowEnd;
        if (!expired && !short) continue;
        out.push({
          personId: person.id,
          personName: person.name,
          legId: leg.id,
          legIndex,
          legDate: leg.date,
          document,
          kind: expired ? 'expired' : 'short-validity',
          reason: expired
            ? `${document.label} expired ${readableDate(document.expiresOn)}, before leg ${legIndex + 1} on ${readableDate(leg.date)}.`
              // We cannot tell which country a leg enters from its ICAO alone, so a visa is raised
              // on any international leg. Say so, rather than let a scheduler wonder why a China
              // visa is blocking a London trip — the override with a reason is exactly the answer.
              + (document.kind === 'visa' ? ' If this leg does not enter that country, override with a reason.' : '')
            : `${document.label} expires ${readableDate(document.expiresOn)} — inside the ${policy.internationalPassportMonths} months beyond travel the department asks for on international legs (department policy, not a regulation).`,
        });
      }
    }
  });

  return out;
}

/**
 * The gates nobody has overridden. These are what refuse the freeze.
 *
 * An override clears a gate only while the two facts it was decided about still hold — the leg's
 * date and the document's expiry. Move the leg, or correct the document, and the gate comes back
 * unresolved: the decision was made about the situation as it stood, and a changed situation has
 * not been decided about by anyone.
 */
export function blockingGates(trip: Trip, gates: DocumentGate[]): DocumentGate[] {
  const cleared = new Map((trip.gateOverrides ?? []).map(o => [o.gateKey, o]));
  return gates.filter(g => {
    const o = cleared.get(gateKey(g));
    if (!o) return true;
    return o.legDate !== g.legDate || o.documentExpiresOn !== g.document.expiresOn;
  });
}

/** What an override of this gate is a decision about. Pass to `overrideGate`. */
export function gateFacts(gate: DocumentGate): { legDate: string; documentExpiresOn: string } {
  return { legDate: gate.legDate, documentExpiresOn: gate.document.expiresOn };
}

/** The override still standing over this gate, or undefined when it has gone stale or never existed. */
export function liveOverrideFor(trip: Trip, gate: DocumentGate) {
  const o = (trip.gateOverrides ?? []).find(x => x.gateKey === gateKey(gate));
  if (!o) return undefined;
  return o.legDate === gate.legDate && o.documentExpiresOn === gate.document.expiresOn ? o : undefined;
}

/** One line per person for a summary strip: "S. Reyes — passport expired". */
export function gateSummary(gates: DocumentGate[]): string[] {
  const byPerson = new Map<string, DocumentGate[]>();
  for (const g of gates) {
    const list = byPerson.get(g.personName);
    if (list) list.push(g); else byPerson.set(g.personName, [g]);
  }
  return [...byPerson.entries()].map(([name, list]) =>
    `${name} — ${list[0].kind === 'expired' ? `${list[0].document.label} expired` : `${list[0].document.label} short of the policy window`}`,
  );
}
