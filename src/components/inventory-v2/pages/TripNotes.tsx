import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import type { TripNote } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const MS_PER_MINUTE = 60_000;
  const MS_PER_HOUR = 3_600_000;
  const MS_PER_DAY = 86_400_000;
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
  if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TripNotes() {
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

  return (
    <TripNotesInner
      tripId={tripId!}
      trip={trip}
      initialLegId={activeLeg?.id ?? 'trip-wide'}
      state={state}
      dispatch={dispatch}
      navigate={navigate}
    />
  );
}

// ─── Inner Component ───────────────────────────────────────────────────────────

import type { InventoryV2State, InventoryV2Action, Trip } from '../types';

function TripNotesInner({
  tripId,
  trip,
  initialLegId,
  state,
  dispatch,
  navigate,
}: {
  tripId: string;
  trip: Trip;
  initialLegId: string;
  state: InventoryV2State;
  dispatch: (action: InventoryV2Action) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [noteText, setNoteText] = useState('');
  const [selectedLegId, setSelectedLegId] = useState<string>(initialLegId);

  // ─── Collect all notes, newest first ─────────────────────────────────────

  const allNotes = useMemo(() => {
    const notes: TripNote[] = [
      ...trip.notes,
      ...trip.legs.flatMap(l => l.notes),
    ];
    return notes.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [trip]);

  // ─── Add note ─────────────────────────────────────────────────────────────

  function handleAddNote() {
    if (!noteText.trim()) return;
    const note: TripNote = {
      id: `tn-${crypto.randomUUID()}`,
      tripId: trip.id,
      legId: selectedLegId === 'trip-wide' ? undefined : selectedLegId,
      text: noteText.trim(),
      author: state.currentUser.name,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TRIP_NOTE', payload: { tripId: trip.id, note } });
    setNoteText('');
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto p-6 pb-48">
      <OfflineBanner />

      {/* Back button */}
      <button
        onClick={() => navigate(`/inventory-v2/trips/${tripId}`)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft size={16} /> Back to Trip
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Trip Notes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {trip.tailNumber} · {trip.tripName} ({trip.tripNumber})
        </p>
      </div>

      {/* Notes feed */}
      <div className="space-y-3">
        {allNotes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notes yet. Add one to keep your crew informed.</p>
          </div>
        ) : (
          allNotes.map(note => {
            const leg = note.legId
              ? trip.legs.find(l => l.id === note.legId)
              : undefined;

            return (
              <Card key={note.id} className="bg-slate-900/60 border-slate-700">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{note.author}</span>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {leg ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Leg {leg.legNumber}: {leg.origin} → {leg.destination}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-500/20 text-slate-400 border border-slate-500/30">
                          Trip-wide
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(note.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">{note.text}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Sticky add-note form */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 p-4 space-y-3 z-10">
        <Textarea
          placeholder="Add a note..."
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          className="min-h-[60px] bg-slate-900 border-slate-700 resize-none"
          rows={2}
        />
        <div className="flex items-center gap-3">
          <Select value={selectedLegId} onValueChange={setSelectedLegId}>
            <SelectTrigger className="w-52 bg-slate-900 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trip-wide">Trip-wide</SelectItem>
              {trip.legs.map(leg => (
                <SelectItem key={leg.id} value={leg.id}>
                  Leg {leg.legNumber}: {leg.origin} → {leg.destination}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="flex-1"
            disabled={!noteText.trim()}
            onClick={handleAddNote}
          >
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}
