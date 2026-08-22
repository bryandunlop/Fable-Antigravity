import React from 'react';
import { ChevronRight, Phone, Truck } from 'lucide-react';
import type { FaLeg } from './faTrips';
import { allergenRollup } from './faTripRoster';
import type { RosterGuest } from './faTripRoster';

// One leg, as a brief you read top to bottom.
//
// The unit of this screen is the LEG and, within it, the ALLERGEN — not the passenger.
// A flight attendant planning a service does not walk a list of people looking each one
// up; she asks "what can never come aboard this leg". Rolling up by person repeated the
// same allergen across three rows and left her to assemble the answer herself.
//
// Styling is native-grouped rather than web-card: inset groups on the page ground,
// hairline separators, section headers in small caps, and colour carried by TEXT rather
// than by filled alert boxes. Still Montserrat, still 4px corners, still Midnight.

function Section({ title, tone, children }: {
  title: string;
  tone?: 'danger';
  children: React.ReactNode;
}) {
  return (
    <>
      <p className={`text-[11px] font-bold tracking-wider uppercase px-1 pt-5 pb-1.5 ${
        tone === 'danger' ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'
      }`}>{title}</p>
      <div className="rounded-lg bg-card divide-y overflow-hidden">{children}</div>
    </>
  );
}

function Row({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-3 min-h-11 flex items-center gap-3 ${className}`}>{children}</div>;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
function hours(leg: FaLeg): string {
  const m = Math.round((new Date(leg.arrivalUtc).getTime() - new Date(leg.departureUtc).getTime()) / 60000);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} m`;
}

/** Guest preferences in one line, or nothing. Never padded to look fuller than it is. */
function taste(g: RosterGuest): string {
  const p = g.passenger;
  if (!p) return '';
  return [p.role, ...p.food.slice(0, 2)].filter(Boolean).join(' · ');
}

export default function LegBrief({ leg, guests, onOpenGuest }: {
  leg: FaLeg;
  guests: RosterGuest[];
  onOpenGuest: (g: RosterGuest) => void;
}) {
  const roll = allergenRollup(guests);
  const notKnown = roll.flagged.length + roll.unknown.length;
  const nothingToAvoid = roll.food.length === 0 && roll.flagged.length === 0 && roll.needsMapping.length === 0;

  return (
    <div>
      <div className="flex items-baseline gap-3 px-1">
        <span className="text-3xl font-bold tracking-tight">{leg.origin.replace(/^K/, '')}</span>
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{hours(leg)}</span>
        <span className="flex-1 h-px bg-border" />
        <span className="text-3xl font-bold tracking-tight">{leg.destination.replace(/^K/, '')}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 px-1">
        Leg {leg.legNumber} · {leg.flightNumber} · {fmtDate(leg.departureUtc)} ·{' '}
        {fmtTime(leg.departureUtc)} – {fmtTime(leg.arrivalUtc)} · {guests.length} guest{guests.length === 1 ? '' : 's'}
      </p>

      {nothingToAvoid ? (
        <Section title="Nothing to cook around">
          <Row>
            <p className="text-[17px]">
              {notKnown > 0
                ? `No allergies recorded — but ${notKnown} guest${notKnown === 1 ? ' has' : 's have'} nothing on file.`
                : 'Every guest on this leg is confirmed clear.'}
            </p>
          </Row>
        </Section>
      ) : (
        <Section title="Cannot serve on this leg" tone="danger">
          {/* Unmapped prose leads the section. myairops sends dietary detail as free
              text somebody has to read; until they have, we cannot say what is safe —
              and a guest whose source text CHANGED under an old mapping is worse than
              one never mapped, because a stale allergen list looks settled. */}
          {roll.needsMapping.map((g) => {
            const note = g.passenger?.sourceNote?.dietary ?? '';
            const stale = Boolean(g.passenger?.mappedFromNote);
            return (
              <Row key={g.id}>
                <div className="flex-1 min-w-0">
                  <p className="text-[17px] font-semibold text-red-700 dark:text-red-300">
                    {stale ? 'Changed since it was mapped' : 'Not yet mapped'} — {g.displayName}
                  </p>
                  <p className="text-sm mt-1 italic">“{note}”</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stale
                      ? 'The booking desk edited this after the allergens were recorded. Read it again before you plan.'
                      : 'Straight from the booking. Somebody has to turn it into allergens.'}
                  </p>
                </div>
              </Row>
            );
          })}
          {roll.food.map((a) => (
            <Row key={a.allergen}>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-semibold text-red-700 dark:text-red-300">{a.allergen}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.carriers.join(' · ')}</p>
              </div>
            </Row>
          ))}
          {roll.flagged.length > 0 && (
            <Row>
              <div className="flex-1 min-w-0">
                <p className="text-[17px] font-semibold text-red-700 dark:text-red-300">Flagged, no detail</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {roll.flagged.map((g) => g.displayName).join(' · ')} — the booking says allergies and names none.
                </p>
              </div>
            </Row>
          )}
        </Section>
      )}

      {/* Severity is recorded nowhere upstream, so it is said once for the leg rather
          than repeated on every red row. */}
      {!nothingToAvoid && (
        <p className="text-xs text-muted-foreground px-1 pt-2">No severity is recorded anywhere. Treat every one as serious.</p>
      )}

      {(roll.unknown.length > 0 || roll.cabin.length > 0) && (
        <Section title="Worth knowing">
          {roll.unknown.length > 0 && (
            <Row>
              <div className="flex-1 min-w-0">
                <p className="text-[17px]">{roll.unknown.length} guest{roll.unknown.length === 1 ? '' : 's'} with nothing on file</p>
                <p className="text-xs text-muted-foreground mt-0.5">{roll.unknown.map((g) => g.displayName).join(' · ')} — nobody has asked.</p>
              </div>
            </Row>
          )}
          {roll.cabin.map((a) => (
            <Row key={a.allergen}>
              <div className="flex-1 min-w-0">
                <p className="text-[17px]">{a.allergen}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.carriers.join(' · ')} — cabin, not catering.</p>
              </div>
            </Row>
          ))}
        </Section>
      )}

      <Section title={`On board — ${guests.length}`}>
        {guests.map((g) => {
          const t = taste(g);
          return (
            <button key={g.id} onClick={() => onOpenGuest(g)}
              className="w-full text-left px-4 py-3 min-h-11 flex items-center gap-3 hover:bg-muted active:bg-muted">
              <div className="flex-1 min-w-0">
                <p className="text-[17px]">{g.displayName}</p>
                {t && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t}</p>}
              </div>
              <span className={`text-xs shrink-0 ${
                g.state === 'ALLERGIES' || g.state === 'FLAGGED_NO_DETAIL' || g.state === 'NEEDS_MAPPING'
                  ? 'text-red-700 dark:text-red-300 font-medium'
                : g.state === 'CONFIRMED_NONE' ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
              }`}>
                {g.state === 'ALLERGIES' ? g.passenger!.allergies.map((a) => a.allergen).join(', ')
                  : g.state === 'NEEDS_MAPPING' ? 'Needs mapping'
                  : g.state === 'FLAGGED_NO_DETAIL' ? 'Flagged'
                  : g.state === 'CONFIRMED_NONE' ? 'Clear' : 'Not asked'}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            </button>
          );
        })}
      </Section>

      {leg.catering && (
        <Section title="Catering">
          <Row>
            <div className="flex-1 min-w-0">
              <p className="text-[17px]">{leg.catering.caterer}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Truck className="w-3 h-3 shrink-0" />
                Arrives {fmtTime(leg.catering.deliveryUtc)} · {leg.catering.deliveryLocation}
              </p>
            </div>
            <a href={`tel:${leg.catering.phone.replace(/[^+\d]/g, '')}`}
              className="text-sm font-medium text-primary shrink-0 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />Call
            </a>
          </Row>
        </Section>
      )}
    </div>
  );
}
