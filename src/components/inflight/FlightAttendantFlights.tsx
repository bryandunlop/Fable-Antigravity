import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  Users, ShieldAlert, Utensils, ChevronRight, ChevronLeft, Clock, Truck, Phone,
  List, GalleryHorizontal, UserPlus, Pencil,
} from 'lucide-react';
import { usePassengers } from '../passengers/PassengerContext';
import type { Passenger } from '../passengers/passengerData';
import PassengerProfilePanel from '../passengers/PassengerProfilePanel';
import PassengerProfileEditor from '../passengers/PassengerProfileEditor';
import { tripWindow } from './engine/menuPlan';
import { buildFaTrips } from './faTrips';
import type { FaCateringOrder, FaTrip } from './faTrips';
import { rosterFor, summarise, splitAllergens, legByNumber, bandKind, hasProfileContent } from './faTripRoster';
import type { RosterGuest } from './faTripRoster';

// This screen is a BRIEFING: who is on the trip, and what they cannot eat. It does not
// build menus and does not place orders — GFO has no such capability, so catering is
// reference only (who, phone, when, where) and carries no status ladder or deadline.
//
// THREE COLOURS, NO SEVERITY, NO YELLOW (Bryan, 2026-08-20). Nothing upstream records
// critical/moderate, so every allergy gets one red weight and says so out loud. Green is
// earned only by a dated confirmation. Everything else is neutral — not green, so absence
// never reads as safe; not an alarm either, because roughly nineteen guests in twenty
// arrive with no record and an alarm on almost every row teaches the crew to stop looking.

const VIEW_KEY = 'fa-trip-view';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
/** Human countdown to a departure. Past departures read "departed". */
function untilDeparture(iso: string, now: Date): string {
  if (!iso) return '';
  const mins = Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
  if (mins <= 0) return 'departed';
  if (mins < 60) return `in ${mins} m`;
  if (mins < 48 * 60) return `in ${Math.round(mins / 60)} h`;
  return `in ${Math.round(mins / (60 * 24))} d`;
}

/** The one place a dietary state becomes pixels. Every surface on this screen renders
 *  through it so a colour cannot come to mean two things in two components. */
function DietaryBand({ guest, className = '' }: { guest: RosterGuest; className?: string }) {
  const base = `rounded border px-2 py-1.5 text-xs leading-snug ${className}`;
  const red = `${base} border-red-200 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-100`;
  const neutral = `${base} bg-muted/40 text-muted-foreground`;
  const kind = bandKind(guest);

  if (kind === 'ALLERGY') {
    const { food, nonFood } = splitAllergens(guest.passenger!.allergies.map((a) => a.allergen));
    return (
      <div className={red}>
        <p className="font-semibold">Allergies: {food.join(', ')}</p>
        <p className="mt-0.5">No severity is recorded — treat as serious.</p>
        {nonFood.length > 0 && (
          // Named, not dropped: real allergies, just not the galley's problem, and
          // mixing them into a food list dilutes the list that matters.
          <p className="mt-0.5 opacity-80">Cabin, not catering: {nonFood.join(', ')}.</p>
        )}
      </div>
    );
  }

  if (kind === 'FLAGGED') {
    return (
      <div className={red}>
        <p className="font-semibold">Allergies flagged — no detail on the booking</p>
        <p className="mt-0.5">No allergen named and no severity. Ask before service.</p>
      </div>
    );
  }

  if (kind === 'CABIN_ONLY') {
    const { nonFood } = splitAllergens(guest.passenger!.allergies.map((a) => a.allergen));
    return (
      <div className={neutral}>
        <p className="font-medium">Nothing recorded for the galley</p>
        <p className="mt-0.5">Cabin, not catering: {nonFood.join(', ')}.</p>
      </div>
    );
  }

  if (kind === 'CONFIRMED_NONE') {
    return (
      <div className={`${base} border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-950/40 dark:text-emerald-100`}>
        <p className="font-semibold">No allergies — confirmed {fmtDay(guest.passenger!.dietaryConfirmedAtUtc!)}</p>
      </div>
    );
  }

  return (
    <div className={neutral}>
      <p className="font-medium">No allergy information on file</p>
      {!guest.passenger && <p className="mt-0.5">No passenger record for this booking id.</p>}
    </div>
  );
}

/** A one-line taste of the profile, or an honest blank. Never invented, never padded. */
function preferenceLine(p: Passenger | null): string {
  if (!p) return '';
  const bits = [p.food.slice(0, 3).join(', '), p.beverage.slice(0, 2).join(', ')].filter(Boolean);
  return bits.join(' · ');
}

function LegTabs({ trip, value, onChange }: {
  trip: FaTrip;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const cell = (label: string, count: number, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 min-w-0 min-h-11 rounded-md px-1 flex flex-col items-center justify-center text-xs transition-colors duration-fast ease-gfo ${
        active ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      <span className="truncate max-w-full">{label}</span>
      <span className="text-[11px] opacity-80">{count}</span>
    </button>
  );

  const allCount = new Set(trip.legs.flatMap((l) => l.passengerIds)).size;

  return (
    <div className="rounded-lg border bg-card p-1 flex gap-0.5" role="group" aria-label="Filter by leg">
      {cell('All', allCount, value === null, () => onChange(null))}
      {trip.legs.map((l) =>
        cell(`Leg ${l.legNumber}`, l.passengerIds.length, value === l.legNumber, () => onChange(l.legNumber)),
      )}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: 'list' | 'deck'; onChange: (v: 'list' | 'deck') => void }) {
  const btn = (v: 'list' | 'deck', Icon: React.ElementType, label: string) => (
    <button
      onClick={() => onChange(v)}
      aria-label={label}
      aria-pressed={value === v}
      className={`w-10 h-8 flex items-center justify-center transition-colors duration-fast ease-gfo ${
        value === v ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
  return (
    <div className="flex rounded-md border overflow-hidden shrink-0 divide-x">
      {btn('list', List, 'List view')}
      {btn('deck', GalleryHorizontal, 'Card view')}
    </div>
  );
}

function GuestRow({ guest, showLegs, onOpen }: {
  guest: RosterGuest;
  showLegs: boolean;
  onOpen: () => void;
}) {
  const pref = preferenceLine(guest.passenger);
  return (
    <button
      onClick={onOpen}
      className="w-full text-left px-3 py-3 min-h-[52px] flex items-start gap-3 hover:bg-muted active:bg-muted"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium text-sm">{guest.displayName}</span>
          {showLegs && guest.legNumbers.map((n) => (
            <Badge key={n} variant="outline" className="text-[11px] px-1.5 py-0">L{n}</Badge>
          ))}
        </div>
        {guest.passenger && <p className="text-xs text-muted-foreground mt-0.5">{guest.passenger.role}</p>}
        <DietaryBand guest={guest} className="mt-1.5" />
        {pref
          ? <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{pref}</p>
          : <p className="text-xs text-muted-foreground mt-1.5">No profile yet.</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
    </button>
  );
}

function GuestDeck({ guests, showLegs, onOpen }: {
  guests: RosterGuest[];
  showLegs: boolean;
  onOpen: (g: RosterGuest, mode?: 'read' | 'edit') => void;
}) {
  const [i, setI] = useState(0);
  // Clamp rather than reset: changing the leg filter shortens the deck, and snapping
  // back to the first card every time would lose the reader's place on a re-render.
  const idx = Math.min(i, Math.max(guests.length - 1, 0));
  const g = guests[idx];
  if (!g) return null;

  const p = g.passenger;
  const chips = (label: string, items: string[]) => items.length > 0 && (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {items.map((x) => <span key={x} className="rounded border bg-muted/40 px-2 py-1 text-xs">{x}</span>)}
      </div>
    </div>
  );

  return (
    <div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-lg font-semibold">{g.displayName}</h3>
            {showLegs && g.legNumbers.map((n) => <Badge key={n} variant="outline" className="text-[11px] px-1.5 py-0">L{n}</Badge>)}
          </div>
          {p && <p className="text-xs text-muted-foreground mt-0.5">{p.role}</p>}

          <DietaryBand guest={g} className="mt-3" />

          {hasProfileContent(p) ? (
            <>
              {chips('Food', p!.food)}
              {chips('Drink', p!.beverage)}
              {chips('Avoid', p!.dislikes ?? [])}
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-3">No profile yet — nothing recorded beyond the booking.</p>
          )}

          <Button variant="outline" className="w-full h-11 mt-4"
            onClick={() => onOpen(g, hasProfileContent(p) ? 'read' : 'edit')}>
            {hasProfileContent(p) ? 'Open profile' : <><UserPlus className="w-4 h-4" /> Start a profile</>}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-4 mt-3">
        <Button variant="outline" size="icon" className="rounded-full h-11 w-11"
          aria-label="Previous guest" disabled={idx === 0} onClick={() => setI(idx - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">{idx + 1} of {guests.length}</span>
        <Button variant="outline" size="icon" className="rounded-full h-11 w-11"
          aria-label="Next guest" disabled={idx >= guests.length - 1} onClick={() => setI(idx + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/** Catering, reference only. Nothing here can be changed from this screen, so nothing
 *  here is dressed as an action: no status chip, no cut-off, no ordering language. */
function CateringReference({ order }: { order: FaCateringOrder }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Utensils className="w-3.5 h-3.5" /> Catering — for reference
      </p>
      <p className="text-sm font-semibold mt-1.5">{order.caterer}</p>
      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground flex items-center gap-1 shrink-0"><Truck className="w-3 h-3" />Arrives</dt>
          <dd className="text-right m-0">{fmtTime(order.deliveryUtc)} · {order.deliveryLocation}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground flex items-center gap-1 shrink-0"><Phone className="w-3 h-3" />Contact</dt>
          <dd className="text-right m-0">
            {order.contactPerson} ·{' '}
            <a className="text-blue-700 dark:text-blue-300 hover:underline" href={`tel:${order.phone.replace(/[^+\d]/g, '')}`}>{order.phone}</a>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function TripRoster({ trip, passengers, now, onOpenGuest }: {
  trip: FaTrip;
  passengers: Passenger[];
  now: Date;
  onOpenGuest: (g: RosterGuest, mode?: 'read' | 'edit') => void;
}) {
  const [legFilter, setLegFilter] = useState<number | null>(null);
  const [view, setView] = useState<'list' | 'deck'>(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'deck' ? 'deck' : 'list'; } catch { return 'list'; }
  });
  const setViewPersisted = (v: 'list' | 'deck') => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode — the toggle still works, it just forgets */ }
  };

  const guests = useMemo(() => rosterFor(trip, passengers, legFilter), [trip, passengers, legFilter]);
  const summary = useMemo(() => summarise(guests), [guests]);
  const leg = legByNumber(trip, legFilter);
  const window = tripWindow(trip);
  const foodAllergens = splitAllergens(summary.allergens).food;
  const uncovered = summary.flaggedNoDetail + summary.noInfo;

  return (
    <Card>
      <CardHeader className="pb-3">
        {/* Trip number, countdown and the view toggle share the top line; the trip NAME
            gets its own. Run together they wrapped to four lines on a 375pt phone —
            the right-hand cluster is ~170pt of a 327pt row, which leaves the title no
            room to be a title. */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-semibold truncate">{trip.tripNumber}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">{untilDeparture(trip.legs[0]?.departureUtc ?? '', now)}</Badge>
            <ViewToggle value={view} onChange={setViewPersisted} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{trip.tripName}</p>
        <p className="text-xs text-muted-foreground">
          {trip.tail} · {trip.aircraftType}
          {window && <> · {fmtDate(window.startUtc)} – {fmtDate(window.endUtc)}</>}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
          <Users className="w-3 h-3 shrink-0" /><span className="truncate">{trip.cabinCrew.join(', ')}</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <LegTabs trip={trip} value={legFilter} onChange={setLegFilter} />

        {leg && (
          <p className="text-xs text-muted-foreground">
            {leg.flightNumber} · {leg.origin} → {leg.destination} · {fmtDate(leg.departureUtc)} ·{' '}
            {fmtTime(leg.departureUtc)}–{fmtTime(leg.arrivalUtc)} · {untilDeparture(leg.departureUtc, now)}
          </p>
        )}

        {/* One attention band, and it states its own coverage: a no-list that does not
            say how much of the manifest it missed invites being read as complete. */}
        {(foodAllergens.length > 0 || summary.flaggedNoDetail > 0) && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-100 px-3 py-2 text-sm">
            <p className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {foodAllergens.length > 0
                  ? <><span className="font-semibold">Allergies {legFilter === null ? 'on this trip' : 'on this leg'}:</span> {foodAllergens.join(' · ')}</>
                  : <span className="font-semibold">One guest is flagged with allergies and no detail.</span>}
              </span>
            </p>
            {uncovered > 0 && (
              <p className="text-xs mt-1.5">
                Covers {summary.total - uncovered} of {summary.total} guests — {uncovered} with nothing usable on file.
              </p>
            )}
          </div>
        )}

        {view === 'list' ? (
          <div className="border rounded-lg divide-y overflow-hidden bg-card">
            {guests.map((g) => (
              <GuestRow key={g.id} guest={g} showLegs={legFilter === null} onOpen={() => onOpenGuest(g)} />
            ))}
          </div>
        ) : (
          <GuestDeck guests={guests} showLegs={legFilter === null} onOpen={onOpenGuest} />
        )}

        {leg?.catering && <CateringReference order={leg.catering} />}
      </CardContent>
    </Card>
  );
}

export default function FlightAttendantFlights() {
  const { passengers } = usePassengers();
  const now = useMemo(() => new Date(), []);
  const trips = useMemo(() => buildFaTrips(now), [now]);
  const [openGuest, setOpenGuest] = useState<RosterGuest | null>(null);
  const [editing, setEditing] = useState(false);

  const open = (g: RosterGuest, mode: 'read' | 'edit' = 'read') => { setOpenGuest(g); setEditing(mode === 'edit'); };

  // No padding of our own: Navigation's <main> already pads (p-6 pb-20 md:pb-6).
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Upcoming trips</h1>
        <p className="text-sm text-muted-foreground mt-1">Who is on board, and what they cannot eat.</p>
      </div>

      {trips.map((trip) => (
        <TripRoster key={trip.id} trip={trip} passengers={passengers} now={now} onOpenGuest={open} />
      ))}

      {/* A centred modal, not a side sheet: used one-handed on an iPhone and two-handed
          on an iPad, where a right-edge panel is the far corner of the screen. */}
      <Dialog open={!!openGuest} onOpenChange={(o: boolean) => { if (!o) { setOpenGuest(null); setEditing(false); } }}>
        <DialogContent className="sm:max-w-xl">
          {openGuest && (
            <>
              <DialogHeader className={openGuest.passenger && !editing ? 'sr-only' : undefined}>
                <DialogTitle className={openGuest.passenger && !editing ? undefined : 'text-lg'}>
                  {editing
                    ? (hasProfileContent(openGuest.passenger) ? `Editing ${openGuest.displayName}` : `New profile — ${openGuest.displayName}`)
                    : openGuest.passenger ? 'Passenger profile' : openGuest.displayName}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? 'Preferences and cabin notes. Allergies come from the booking and are locked.'
                    : openGuest.passenger
                      ? `${openGuest.passenger.name} · ${openGuest.passenger.role}`
                      : 'On the manifest, with no passenger record behind the booking id.'}
                </DialogDescription>
              </DialogHeader>

              {editing ? (
                <PassengerProfileEditor
                  passenger={openGuest.passenger}
                  manifestId={openGuest.id}
                  displayName={openGuest.displayName}
                  onDone={() => { setEditing(false); setOpenGuest(null); }}
                />
              ) : (
                <>
                  {openGuest.passenger
                    ? <PassengerProfilePanel passenger={openGuest.passenger} />
                    : <DietaryBand guest={openGuest} className="mt-2" />}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-12" onClick={() => { setOpenGuest(null); setEditing(false); }}>Close</Button>
                    <Button className="flex-1 h-12" onClick={() => setEditing(true)}>
                      {hasProfileContent(openGuest.passenger)
                        ? <><Pencil className="w-4 h-4" /> Edit</>
                        : <><UserPlus className="w-4 h-4" /> Start a profile</>}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
