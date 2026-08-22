import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { UserPlus, Pencil, ChevronDown } from 'lucide-react';
import { usePassengers } from '../passengers/PassengerContext';
import type { Passenger } from '../passengers/passengerData';
import PassengerProfilePanel from '../passengers/PassengerProfilePanel';
import PassengerProfileEditor from '../passengers/PassengerProfileEditor';
import { buildFaTrips } from './faTrips';
import { rosterFor, hasProfileContent } from './faTripRoster';
import type { RosterGuest } from './faTripRoster';
import LegBrief from './LegBrief';
import TripPickerSheet from './TripPickerSheet';

// The page IS the leg. You swipe between legs; there are no leg tabs, no list/deck
// toggle and no whole-trip roll-up, because a service is planned per leg — different
// people get on and off, and each leg has its own caterer.
//
// Trip switching lives behind one control in the top bar, which opens the picker sheet
// (list or calendar). That is the only navigation on the screen.

export default function FlightAttendantFlights() {
  const { passengers } = usePassengers();
  const now = useMemo(() => new Date(), []);
  const trips = useMemo(() => buildFaTrips(now), [now]);

  const [selectedId, setSelectedId] = useState(() => trips[0]?.id ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openGuest, setOpenGuest] = useState<RosterGuest | null>(null);
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const trip = trips.find((t) => t.id === selectedId) ?? trips[0];

  // A new trip starts at its first leg. Without this the pager keeps the old scroll
  // offset and lands you on leg 3 of a two-leg trip, showing nothing.
  useEffect(() => {
    setPage(0);
    if (scroller.current) scroller.current.scrollTo({ left: 0, behavior: 'auto' });
  }, [selectedId]);

  const openProfile = (g: RosterGuest, mode: 'read' | 'edit' = 'read') => { setOpenGuest(g); setEditing(mode === 'edit'); };

  const goTo = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'auto' });
    setPage(i);
  };

  if (!trip) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Upcoming trips</h1>
        <p className="text-sm text-muted-foreground mt-1">No trips assigned.</p>
      </div>
    );
  }

  const legs = trip.legs;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{trip.tripName}</h1>
          <p className="text-xs text-muted-foreground truncate">{trip.tail} · {trip.cabinCrew.join(', ')}</p>
        </div>
        <Button variant="ghost" className="shrink-0 text-primary" onClick={() => setPickerOpen(true)} aria-haspopup="dialog">
          Switch <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {legs.length > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3" role="tablist" aria-label="Legs">
          {legs.map((leg, i) => (
            <button
              key={leg.id}
              role="tab"
              onClick={() => goTo(i)}
              aria-label={`Leg ${leg.legNumber}: ${leg.origin} to ${leg.destination}`}
              aria-selected={i === page}
              className={`h-2 rounded-full transition-all duration-fast ease-gfo ${
                i === page ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* Horizontal paging with CSS scroll-snap: the swipe is the browser's own, so it
          keeps native momentum and rubber-banding instead of a hand-rolled drag. */}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
          if (i !== page) setPage(i);
        }}
        className="mt-3 flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={`${legs.length} legs, swipe to move between them`}
      >
        {legs.map((leg) => (
          <div key={leg.id} className="w-full shrink-0 snap-start">
            <LegBrief leg={leg} guests={rosterFor(trip, passengers, leg.legNumber)} onOpenGuest={openProfile} />
          </div>
        ))}
      </div>

      <TripPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        trips={trips}
        passengers={passengers}
        now={now}
        selectedId={trip.id}
        onSelect={setSelectedId}
      />

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
                    : <p className="text-sm text-muted-foreground">No allergy information on file, and no passenger record behind this booking id.</p>}

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
