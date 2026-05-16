import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ClipboardList, ShoppingCart, FileText, Plane, CheckCircle2, Users, Calendar, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { V2Badge } from '../shared/V2Badge';
import { TRIP_STATUS_COLORS } from '../constants';
import { cn } from '../../ui/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TripHome() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useInventoryV2();

  const trip = state.trips.find(t => t.id === tripId);

  if (!trip) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <p className="text-muted-foreground">Trip not found.</p>
        <Button onClick={() => navigate('/inventory-v2/trips')}>Back to Trips</Button>
      </div>
    );
  }

  // ─── Derived values ───────────────────────────────────────────────────────

  const activeLegIndex = trip.legs.findIndex(l => l.status === 'active');
  const activeLeg = activeLegIndex !== -1 ? trip.legs[activeLegIndex] : null;

  const tripColors = TRIP_STATUS_COLORS[trip.status];

  // Day X of Y
  const MS_PER_DAY = 86400000;
  const startMs = new Date(trip.startDate).getTime();
  let totalDays: number;
  if (trip.endDate) {
    totalDays = Math.floor((new Date(trip.endDate).getTime() - startMs) / MS_PER_DAY) + 1;
  } else if (trip.legs.length > 0) {
    const lastLegDate = trip.legs[trip.legs.length - 1].date;
    totalDays = Math.floor((new Date(lastLegDate).getTime() - startMs) / MS_PER_DAY) + 1;
  } else {
    totalDays = 1;
  }
  // Timezone-safe: use local midnight instead of Date.now()
  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const rawDayX = Math.floor((todayMs - startMs) / MS_PER_DAY) + 1;
  const dayX = Math.max(1, Math.min(rawDayX, totalDays));

  // Leg N of M
  const totalLegs = trip.legs.length;
  const completedLegs = trip.legs.filter(l => l.status === 'completed').length;
  const legN = activeLeg ? activeLeg.legNumber : completedLegs;

  // Active leg items used
  const activeItemsUsed = activeLeg
    ? activeLeg.usageLog.reduce((sum, e) => sum + e.qtyUsed, 0)
    : 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <OfflineBanner />

      {/* Back button */}
      <button
        onClick={() => navigate('/inventory-v2/trips')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft size={16} /> All Trips
      </button>

      {/* Trip header card */}
      <Card className="bg-slate-900/60 border-slate-700">
        <CardContent className="p-5 space-y-3">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono text-xs">
              <Plane className="mr-1 h-3 w-3" />
              {trip.tailNumber}
            </Badge>
            <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs">
              {trip.aircraftType}
            </Badge>
            <Badge className={`${tripColors.bg} ${tripColors.text} border ${tripColors.border} text-xs`}>
              {tripColors.label}
            </Badge>
          </div>

          {/* Trip name + number */}
          <div>
            <h1 className="text-2xl font-bold leading-tight">{trip.tripName}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{trip.tripNumber}</p>
          </div>

          {/* Day / Leg progress */}
          <p className="text-sm text-muted-foreground">
            Day {dayX} of {totalDays} &middot; Leg {legN} of {totalLegs}
          </p>
        </CardContent>
      </Card>

      {/* Current leg card */}
      {activeLeg ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-5 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Current Leg</p>
            <h2 className="text-lg font-bold">
              Leg {activeLeg.legNumber}: {activeLeg.origin} → {activeLeg.destination}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {formatDate(activeLeg.date)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={13} />
                {activeLeg.paxCount} pax
              </span>
              <span className="flex items-center gap-1">
                <Package size={13} />
                {activeItemsUsed} items used
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-700 bg-slate-800/40">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              {completedLegs === totalLegs && totalLegs > 0
                ? 'All legs completed. Trip is ready to close out.'
                : 'No active leg. Waiting for first leg to begin.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 2×2 Action button grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Quick Count */}
        <Card
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('quick-count')}
        >
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <ClipboardList size={22} className="text-blue-400" />
            </div>
            <div className="font-semibold text-sm">Quick Count</div>
            <div className="text-xs text-muted-foreground">Mark items used</div>
          </CardContent>
        </Card>

        {/* Grocery List */}
        <Card
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('grocery-list')}
        >
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-xl bg-green-500/20">
              <ShoppingCart size={22} className="text-green-400" />
            </div>
            <div className="font-semibold text-sm">Grocery List</div>
            <div className="text-xs text-muted-foreground">Manage supply requests</div>
          </CardContent>
        </Card>

        {/* Trip Notes */}
        <Card
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('notes')}
        >
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <FileText size={22} className="text-purple-400" />
            </div>
            <div className="font-semibold text-sm">Trip Notes</div>
            <div className="text-xs text-muted-foreground">Log observations</div>
          </CardContent>
        </Card>

        {/* End Leg / Start Next */}
        <Card
          className="cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate('reconcile')}
        >
          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-xl bg-amber-500/20">
              <Plane size={22} className="text-amber-400" />
            </div>
            <div className="font-semibold text-sm">End Leg / Start Next</div>
            <div className="text-xs text-muted-foreground">Reconcile &amp; advance</div>
          </CardContent>
        </Card>
      </div>

      {/* Leg timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flight Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {trip.legs.map((leg) => {
            const totalUsed = leg.usageLog.reduce((sum, e) => sum + e.qtyUsed, 0);
            return (
              <div
                key={leg.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 border-b last:border-0',
                  leg.status === 'upcoming' ? 'opacity-50' : ''
                )}
              >
                {/* Circle indicator */}
                <div className="mt-0.5 shrink-0">
                  {leg.status === 'completed' && (
                    <CheckCircle2 className="text-emerald-400" size={20} />
                  )}
                  {leg.status === 'active' && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-slate-950">
                      {leg.legNumber}
                    </div>
                  )}
                  {leg.status === 'upcoming' && (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center text-xs text-slate-500">
                      {leg.legNumber}
                    </div>
                  )}
                </div>

                {/* Leg info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    Leg {leg.legNumber}: {leg.origin} → {leg.destination}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {leg.status === 'completed' && (
                      <>{formatDate(leg.date)} &middot; {leg.paxCount} pax &middot; {totalUsed} items used</>
                    )}
                    {leg.status === 'active' && (
                      <>In progress &middot; {leg.paxCount} pax</>
                    )}
                    {leg.status === 'upcoming' && (
                      <>{formatDate(leg.date)} &middot; {leg.paxCount} pax</>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Complete Trip button — only when active leg is the last leg */}
      {activeLeg && activeLegIndex === trip.legs.length - 1 && (
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            dispatch({ type: 'COMPLETE_TRIP', payload: trip.id });
            navigate('/inventory-v2/trips');
          }}
        >
          Complete Trip
        </Button>
      )}
    </div>
  );
}
