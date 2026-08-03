import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  Plane, Users, ShieldAlert, Cake, Utensils, ThumbsDown, ChevronRight, Clock,
  ArrowRight, Phone, Truck, AlertTriangle, CheckCircle2, Image as ImageIcon,
} from 'lucide-react';
import { usePassengers } from '../passengers/PassengerContext';
import type { Passenger } from '../passengers/passengerData';
import PassengerProfilePanel from '../passengers/PassengerProfilePanel';
import { getFlightPassengers } from '../passengers/engine/flights';
import { legMenuPlan, tripWindow, groundMinutes, formatGround } from './engine/menuPlan';
import type { LegAllergen, LegMenuPlan } from './engine/menuPlan';
import { buildFaTrips } from './faTrips';
import type { CateringStatus, FaCateringOrder, FaLeg, FaTrip } from './faTrips';

const ALLERGY_BADGE = 'bg-red-500 text-white border-red-600';
const DISLIKE_BADGE = 'bg-yellow-400 text-yellow-950 border-yellow-500';

const SEVERITY_ROW: Record<LegAllergen['severity'], string> = {
  // These rows carry an explicit light fill, so they also carry explicit dark text —
  // inheriting text-foreground would render white-on-cream in the dark theme.
  Critical: 'border-red-300 bg-red-50 text-red-950',
  Moderate: 'border-orange-300 bg-orange-50 text-orange-950',
  Mild: 'border-yellow-300 bg-yellow-50 text-yellow-950',
};

const CATERING_BADGE: Record<CateringStatus, string> = {
  'Not ordered': 'bg-red-100 text-red-900 border-red-200',
  Ordered: 'bg-amber-100 text-amber-900 border-amber-200',
  Confirmed: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  Delivered: 'bg-slate-200 text-slate-900 border-slate-300',
  Issue: 'bg-red-500 text-white border-red-600',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtDateTime(iso: string) {
  return `${fmtDate(iso)} ${fmtTime(iso)}`;
}
function isBirthdaySoon(birthday: string, dep: string): boolean {
  if (!birthday) return false;
  const b = new Date(birthday);
  const d = new Date(dep);
  return b.getMonth() === d.getMonth() && Math.abs(b.getDate() - d.getDate()) <= 3;
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

/** Every allergy on the leg in one list — the menu-planning block. Kept separate from
 * the per-passenger rows on purpose: an FA ordering food needs the union, not a badge
 * scattered across three accordion headers. */
function AllergyRollup({ plan }: { plan: LegMenuPlan }) {
  if (plan.allergens.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> No allergies on this leg.
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-sm font-semibold flex items-center gap-2 mb-2 flex-wrap">
        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
        Allergies on this leg
        <span className="font-normal text-muted-foreground">
          {plan.allergens.length} allergen{plan.allergens.length === 1 ? '' : 's'}
          {plan.criticalCount > 0 && ` · ${plan.criticalCount} critical`}
        </span>
      </p>
      <ul className="space-y-1.5 list-none p-0 m-0">
        {plan.allergens.map((a) => (
          <li key={a.allergen} className={`rounded border p-2 ${SEVERITY_ROW[a.severity]}`}>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-medium text-sm">{a.allergen}</span>
              <Badge className={`text-xs ${a.severity === 'Critical' ? ALLERGY_BADGE : 'bg-white border-current text-current'}`}>
                {a.severity}
              </Badge>
            </div>
            <ul className="mt-1 space-y-0.5 list-none p-0 m-0">
              {a.carriers.map((c, i) => (
                <li key={i} className="text-xs">
                  {c.name} — {c.severity.toLowerCase()}
                  {c.reaction ? `, ${c.reaction}` : ''}
                  {c.medication ? ` · ${c.medication}` : ''}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {plan.dislikes.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <ThumbsDown className="w-3.5 h-3.5 shrink-0" /> Avoid — preference, not medical
          </p>
          {/* One wrapping line each, chip + names, rather than a single pill carrying
              both: "Overly sweet desserts · Patricia Alvarez" is wider than a phone. */}
          <ul className="space-y-1 list-none p-0 m-0">
            {plan.dislikes.map((d) => (
              <li key={d.item} className="text-xs flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Badge className={`text-xs max-w-full whitespace-normal text-left ${DISLIKE_BADGE}`}>
                  {d.item}
                </Badge>
                <span className="text-muted-foreground min-w-0 break-words">{d.passengers.join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CateringBlock({ order, now }: { order: FaCateringOrder; now: Date }) {
  const deadlinePassed = new Date(order.orderDeadlineUtc).getTime() < now.getTime();
  const needsAction = order.status === 'Not ordered' || order.status === 'Issue';
  // Attention is carried by the border, not a fill — this block mixes muted labels with
  // body text, and a light fill would strand the muted ones in the dark theme.
  return (
    <div className={`rounded-lg border bg-card p-3 ${needsAction ? 'border-2 border-red-400' : ''}`}>
      {/* Service is the heading, caterer the second line. Run together they made a
          three-line title on a phone with the icon orphaned beside it. */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold flex items-center gap-2 min-w-0">
          <Utensils className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{order.service}</span>
        </p>
        <Badge className={`text-xs shrink-0 ${CATERING_BADGE[order.status]}`}>{order.status}</Badge>
      </div>
      {/* Caterer gets the full width on its own line — sharing the title row squeezed
          "Air Culinaire Worldwide — Teterboro" into three words-per-line on a phone. */}
      <p className="text-xs text-muted-foreground mt-0.5">{order.caterer}</p>

      <dl className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs m-0">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
          <dt className="text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" />Delivery</dt>
          <dd className="text-left sm:text-right m-0 text-foreground">{fmtTime(order.deliveryUtc)} · {order.deliveryLocation}</dd>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
          <dt className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Order cut-off</dt>
          <dd className={`text-left sm:text-right m-0 ${deadlinePassed ? 'text-red-700 dark:text-red-300 font-medium' : ''}`}>
            {fmtDateTime(order.orderDeadlineUtc)}{deadlinePassed ? ' · passed' : ''}
          </dd>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2 sm:col-span-2">
          <dt className="text-muted-foreground flex items-center gap-1 shrink-0"><Phone className="w-3 h-3" />Contact</dt>
          <dd className="text-left sm:text-right m-0">
            {order.contactPerson} ·{' '}
            <a className="text-blue-700 dark:text-blue-300 hover:underline" href={`tel:${order.phone.replace(/[^+\d]/g, '')}`}>{order.phone}</a>
            {order.email && <> · <a className="text-blue-700 dark:text-blue-300 hover:underline" href={`mailto:${order.email}`}>{order.email}</a></>}
          </dd>
        </div>
      </dl>

      {order.items.length > 0 ? (
        <ul className="mt-2.5 pt-2.5 border-t space-y-1 list-none p-0">
          {order.items.map((it, i) => (
            <li key={i} className="text-xs flex justify-between gap-3">
              <span>
                <span className="text-muted-foreground mr-1.5">{it.quantity}×</span>{it.name}
                {it.note && <span className="text-muted-foreground"> — {it.note}</span>}
              </span>
              {/* Category is a desktop nicety; on a phone it fought the item note for
                  the same line and left both ragged. */}
              <span className="hidden sm:inline text-muted-foreground shrink-0">{it.category}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 pt-2.5 border-t text-xs text-red-800 dark:text-red-300 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> No menu on the order yet
          {deadlinePassed ? ' — cut-off has passed, call the caterer.' : '.'}
        </p>
      )}

      {order.specialInstructions && (
        <p className="mt-2 text-xs rounded border border-amber-200 bg-amber-50 text-amber-900 px-2 py-1.5">
          {order.specialInstructions}
        </p>
      )}
    </div>
  );
}

function PassengerTable({ pax, departureUtc, onOpen }: {
  pax: Passenger[];
  departureUtc: string;
  onOpen: (p: Passenger) => void;
}) {
  if (pax.length === 0) return <p className="text-sm text-muted-foreground">No passengers listed for this leg.</p>;
  return (
    <div className="border rounded-lg divide-y overflow-hidden bg-card">
      {pax.map((p) => (
        <button
          key={p.id}
          onClick={() => onOpen(p)}
          className="w-full text-left px-3 py-3 min-h-[52px] hover:bg-muted active:bg-muted flex items-center gap-3"
        >
          {/* The name stays on one line and truncates. Left to wrap it broke into two
              lines on a phone and pushed the role out from under the allergy badge. */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">{p.name}</span>
              {isBirthdaySoon(p.birthday, departureUtc) && (
                <Badge className="bg-pink-100 text-pink-800 border-pink-200 text-xs shrink-0"><Cake className="w-3 h-3 mr-1" />Birthday</Badge>
              )}
              {(p.photos?.length ?? 0) > 0 && (
                <Badge variant="outline" className="text-xs shrink-0"><ImageIcon className="w-3 h-3 mr-1" />{p.photos!.length}</Badge>
              )}
            </div>
            {/* Two lines on a phone, one on desktop: truncated to a single narrow line
                the preview read "Board Chairman · W…", which tells the FA nothing. */}
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-1">
              {[p.role, p.food.join(', '), p.beverage.join(', ')].filter(Boolean).join(' · ')}
            </p>
          </div>
          {p.allergies.length > 0 && (
            <Badge className={`text-xs shrink-0 ${ALLERGY_BADGE}`}>
              <ShieldAlert className="w-3 h-3 mr-1" />{p.allergies.length}
            </Badge>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}

function LegSection({ leg, prev, pax, now, onOpenPassenger }: {
  leg: FaLeg;
  prev?: FaLeg;
  pax: Passenger[];
  now: Date;
  onOpenPassenger: (p: Passenger) => void;
}) {
  const plan = useMemo(() => legMenuPlan(pax), [pax]);
  return (
    <div>
      {prev && (
        <p className="text-xs text-muted-foreground py-2 pl-1">
          {formatGround(groundMinutes(prev, leg))} on the ground at {prev.destination}
        </p>
      )}
      <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground font-normal">Leg {leg.legNumber}</span>
            {leg.flightNumber}
            <span className="font-normal flex items-center gap-1">
              {leg.origin} <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" /> {leg.destination}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {fmtDate(leg.departureUtc)} · {fmtTime(leg.departureUtc)}–{fmtTime(leg.arrivalUtc)} · {pax.length} pax · {untilDeparture(leg.departureUtc, now)}
          </p>
        </div>

        <AllergyRollup plan={plan} />
        {leg.catering && <CateringBlock order={leg.catering} now={now} />}
        <PassengerTable pax={pax} departureUtc={leg.departureUtc} onOpen={onOpenPassenger} />
      </div>
    </div>
  );
}

/** The trip as a single line: TEB → LAX → LAS → TEB, with ground time between. */
function RouteStrip({ trip }: { trip: FaTrip }) {
  if (trip.legs.length === 0) return null;
  return (
    <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap text-sm">
      <span className="font-medium">{trip.legs[0].origin}</span>
      {trip.legs.map((leg, i) => (
        <React.Fragment key={leg.id}>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium">{leg.destination}</span>
          {i < trip.legs.length - 1 && (
            <span className="text-xs text-muted-foreground">{formatGround(groundMinutes(leg, trip.legs[i + 1]))}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function FlightAttendantFlights() {
  const { passengers } = usePassengers();
  const now = useMemo(() => new Date(), []);
  const trips = useMemo(() => buildFaTrips(now), [now]);
  const [openPax, setOpenPax] = useState<Passenger | null>(null);

  const allLegs = trips.flatMap((t) => t.legs);
  const uniquePaxIds = new Set(allLegs.flatMap((l) => l.passengerIds));
  const allPax = getFlightPassengers([...uniquePaxIds], passengers);
  const criticalAllergens = legMenuPlan(allPax).criticalCount;
  const cateringToChase = allLegs.filter(
    (l) => l.catering && (l.catering.status === 'Not ordered' || l.catering.status === 'Issue'),
  ).length;

  // No padding of our own: the layout shell already pads (Navigation's <main> is
  // p-6 pb-20 md:pb-6). Doubling it cost 32px of a 390pt phone and was what made every
  // heading wrap.
  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Plane className="w-6 h-6 text-blue-600" />
          Upcoming trips
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your assigned trips, leg by leg — who is on board, every allergy to plan the menu around, and the catering order for each leg.
        </p>
      </div>

      {/* One compact line, not four dashboard tiles. On a phone those tiles were a
          whole screen of chrome standing between the FA and the first trip. */}
      <div className="rounded-lg border bg-card px-3 py-2 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
        <span><span className="font-semibold">{trips.length}</span> trip{trips.length === 1 ? '' : 's'}</span>
        <span><span className="font-semibold">{allLegs.length}</span> legs</span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold">{uniquePaxIds.size}</span> pax
        </span>
        {cateringToChase > 0 && (
          <span className="flex items-center gap-1 text-red-700 dark:text-red-300 font-medium">
            <Utensils className="w-3.5 h-3.5" />{cateringToChase} catering to chase
          </span>
        )}
      </div>

      {criticalAllergens > 0 && (
        <p className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-900 px-3 py-2 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {criticalAllergens} critical allergen{criticalAllergens === 1 ? '' : 's'} across these trips. Each leg lists its own below.
        </p>
      )}

      <div className="space-y-6">
        {trips.map((trip) => {
          const window = tripWindow(trip);
          return (
            <Card key={trip.id}>
              <CardHeader className="pb-3">
                {/* Title and countdown share the top line; everything else is one
                    wrapping meta run. Five stacked rows on a phone was mostly labels. */}
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base sm:text-lg min-w-0">
                    {trip.tripNumber}{' '}
                    <span className="text-muted-foreground font-normal">{trip.tripName}</span>
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0">
                    {untilDeparture(trip.legs[0]?.departureUtc ?? '', now)}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 flex items-center gap-x-4 gap-y-1 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">{trip.tail}</Badge>{trip.aircraftType}
                  </span>
                  {window && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />{fmtDate(window.startUtc)} – {fmtDate(window.endUtc)}
                    </span>
                  )}
                  <span className="flex items-center gap-1 min-w-0">
                    <Users className="w-3 h-3 shrink-0" /><span className="truncate">{trip.cabinCrew.join(', ')}</span>
                  </span>
                </p>
                <RouteStrip trip={trip} />
              </CardHeader>
              <CardContent className="space-y-1">
                {trip.legs.map((leg, i) => (
                  <LegSection
                    key={leg.id}
                    leg={leg}
                    prev={i > 0 ? trip.legs[i - 1] : undefined}
                    pax={getFlightPassengers(leg.passengerIds, passengers)}
                    now={now}
                    onOpenPassenger={setOpenPax}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* A centred modal, not a side sheet: this is used one-handed on an iPhone and
          two-handed on an iPad, where a right-edge panel is the far corner of the
          screen. DialogContent is already height-capped and scrolls internally. */}
      <Dialog open={!!openPax} onOpenChange={(o: boolean) => { if (!o) setOpenPax(null); }}>
        <DialogContent className="sm:max-w-xl">
          {openPax && (
            <>
              {/* The panel leads with the name and role, so this header is for
                  assistive tech only — no visible duplicate. */}
              <DialogHeader className="sr-only">
                <DialogTitle>Passenger profile</DialogTitle>
                <DialogDescription>{openPax.name} · {openPax.role}</DialogDescription>
              </DialogHeader>
              <PassengerProfilePanel passenger={openPax} />
              <Button variant="outline" className="w-full h-12" onClick={() => setOpenPax(null)}>Close</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
