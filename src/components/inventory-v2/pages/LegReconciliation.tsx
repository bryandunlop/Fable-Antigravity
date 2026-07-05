import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { useInventoryV2 } from '../InventoryV2Context';
import { getOnBoardQty } from '../tripMath';
import { OfflineBanner } from '../shared/OfflineBanner';
import { V2Badge } from '../shared/V2Badge';
import { cn } from '../../ui/utils';
import type { TripNote, GroceryList } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Usage Row type ────────────────────────────────────────────────────────────

interface UsageRow {
  itemId: string;
  itemName: string;
  startedWith: number;
  usedThisLeg: number;
  remaining: number;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function LegReconciliation() {
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

  const activeLeg = trip.legs.find(l => l.status === 'active');

  if (!activeLeg) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <p className="text-muted-foreground">No active leg found for this trip.</p>
        <Button onClick={() => navigate(`/inventory-v2/trips/${tripId}`)}>Back to Trip</Button>
      </div>
    );
  }

  return (
    <LegReconciliationInner
      tripId={tripId!}
      trip={trip}
      state={state}
      dispatch={dispatch}
      navigate={navigate}
    />
  );
}

// ─── Inner Component ───────────────────────────────────────────────────────────

import type { InventoryV2State, InventoryV2Action, Trip } from '../types';

function LegReconciliationInner({
  tripId,
  trip,
  state,
  dispatch,
  navigate,
}: {
  tripId: string;
  trip: Trip;
  state: InventoryV2State;
  dispatch: (action: InventoryV2Action) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  const activeLeg = trip.legs.find(l => l.status === 'active')!;
  const aircraftType = trip.aircraftType;

  const activeLegIndex = trip.legs.findIndex(l => l.status === 'active');
  const isLastLeg = activeLegIndex === trip.legs.length - 1;

  // ─── Compute usage rows ────────────────────────────────────────────────────

  const usageRows = useMemo<UsageRow[]>(() => {
    // On board when this leg began = par + loads − usage through the previous
    // leg (shared math with TripHome, so the numbers always agree).
    const prevLeg = activeLegIndex > 0 ? trip.legs[activeLegIndex - 1] : null;
    return activeLeg.usageLog.map(entry => {
      const itemDef = state.items.find(i => i.id === entry.itemId);
      const par = itemDef?.defaultQuantities[aircraftType] ?? 0;

      const startedWith = getOnBoardQty(trip, entry.itemId, par, {
        upToLegId: prevLeg ? prevLeg.id : null,
      });
      const usedThisLeg = entry.qtyUsed;

      return {
        itemId: entry.itemId,
        itemName: itemDef?.itemName ?? entry.itemId,
        startedWith,
        usedThisLeg,
        remaining: startedWith - usedThisLeg,
      };
    });
  }, [activeLeg.usageLog, state.items, trip, activeLegIndex, aircraftType]);

  const totalItemsUsed = usageRows.reduce((sum, r) => sum + r.usedThisLeg, 0);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleCompleteLeg() {
    if (discrepancyNote.trim()) {
      const note: TripNote = {
        id: `tn-${crypto.randomUUID()}`,
        tripId: trip.id,
        legId: activeLeg.id,
        text: `⚠️ Discrepancy: ${discrepancyNote.trim()}`,
        author: state.currentUser.name,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_TRIP_NOTE', payload: { tripId: trip.id, note } });
    }

    if (isLastLeg) {
      // Hand off to TripHome's single Complete Trip flow (confirm dialog, undo
      // toast, What's-Next) — leg completion happens there, not here.
      navigate(`/inventory-v2/trips/${trip.id}?confirmComplete=1`);
    } else {
      // ADVANCE_TO_NEXT_LEG completes the active leg itself; dispatching
      // COMPLETE_LEG first left no active leg for its reducer to find, so the
      // next leg was never activated.
      dispatch({ type: 'ADVANCE_TO_NEXT_LEG', payload: trip.id });
      navigate(`/inventory-v2/trips/${trip.id}`);
    }
  }

  function handleGenerateGroceryList() {
    // A list for this leg may already exist (e.g. created from TripHome's
    // Grocery List button) — reuse it instead of creating a duplicate.
    const existing = state.groceryLists.find(
      g => g.tripId === trip.id && g.legId === activeLeg.id
    );
    if (existing) {
      navigate(`/inventory-v2/trips/${trip.id}/grocery-list`);
      return;
    }

    const newList: GroceryList = {
      id: `gl-${crypto.randomUUID()}`,
      tripId: trip.id,
      legId: activeLeg.id,
      tailNumber: trip.tailNumber,
      status: 'draft',
      items: usageRows.map(row => ({
        id: crypto.randomUUID(),
        itemId: row.itemId,
        qtyNeeded: row.usedThisLeg,
        qtyFulfilled: 0,
      })),
      generatedAt: new Date().toISOString(),
      generatedBy: state.currentUser.name,
    };
    dispatch({ type: 'ADD_GROCERY_LIST', payload: newList });
    navigate(`/inventory-v2/trips/${trip.id}/grocery-list`);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      <OfflineBanner />

      {/* Back button */}
      <button
        onClick={() => navigate(`/inventory-v2/trips/${tripId}`)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={16} /> Back to Trip
      </button>

      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">End Leg</h1>
        <V2Badge variant="v2" size="md" />
      </div>

      {/* Leg summary card */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-amber-400 font-semibold tracking-wide">Current Leg</p>
            <p className="text-lg font-bold mt-1">
              Leg {activeLeg.legNumber}: {activeLeg.origin} → {activeLeg.destination}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate(activeLeg.date)} · {activeLeg.paxCount} passengers
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-blue-400">{totalItemsUsed}</p>
            <p className="text-xs text-muted-foreground">items used</p>
          </div>
        </CardContent>
      </Card>

      {/* Usage table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usageRows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              No items logged on this leg.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Item</th>
                  <th className="text-center px-3 py-2 font-medium">Started With</th>
                  <th className="text-center px-3 py-2 font-medium">Used</th>
                  <th className="text-center px-3 py-2 font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {usageRows.map(row => (
                  <tr key={row.itemId} className="border-b border-slate-800/50 last:border-0">
                    <td className="px-4 py-3 font-medium">{row.itemName}</td>
                    <td className="px-3 py-3 text-center text-muted-foreground">{row.startedWith}</td>
                    <td className="px-3 py-3 text-center text-blue-400 font-semibold">{row.usedThisLeg}</td>
                    <td className="px-3 py-3 text-center">{row.remaining}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Discrepancy section */}
      <Card className="border-slate-700">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm"
          onClick={() => setShowDiscrepancy(prev => !prev)}
        >
          <span className="text-muted-foreground">Flag a discrepancy?</span>
          <ChevronDown
            size={16}
            className={cn('text-muted-foreground transition-transform', showDiscrepancy && 'rotate-180')}
          />
        </button>
        {showDiscrepancy && (
          <CardContent className="pt-0 pb-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              If actual counts differ from expected, note it here. This adds a leg note tagged as a discrepancy.
            </p>
            <textarea
              className="w-full min-h-[60px] bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm resize-none"
              placeholder="e.g. 2 Fiji Waters missing — not sure where they went"
              value={discrepancyNote}
              onChange={e => setDiscrepancyNote(e.target.value)}
            />
          </CardContent>
        )}
      </Card>

      {/* Action buttons */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={handleGenerateGroceryList}>
          🛒 Generate Grocery List from This Leg
        </Button>

        {isLastLeg ? (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={handleCompleteLeg}
          >
            ✈️ Continue to Complete Trip
          </Button>
        ) : (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            onClick={handleCompleteLeg}
          >
            Complete Leg &amp; Start Next →
          </Button>
        )}
      </div>
    </div>
  );
}
