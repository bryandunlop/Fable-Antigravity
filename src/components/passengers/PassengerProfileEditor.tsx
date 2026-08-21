import React, { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Info, Lock, Plus, X, AlertTriangle, Check } from 'lucide-react';
import { usePassengers } from './PassengerContext';
import type { Passenger, PassengerComfort } from './passengerData';
import {
  draftFrom, addItem, removeItem, conflictingItems, isDirty, applyDraft, newPassengerFrom,
} from './engine/profileEdits';
import type { ProfileDraft } from './engine/profileEdits';

// Editing a profile from the trip screen, because that is the only moment the crew is
// actually with the passenger. Allergies are deliberately NOT editable here — see
// engine/profileEdits.ts for why.

function ChipGroup({ label, items, onAdd, onRemove, conflicts = [], placeholder }: {
  label: string;
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  /** Entries that name something this passenger is allergic to. */
  conflicts?: string[];
  placeholder: string;
}) {
  const [value, setValue] = useState('');
  const commit = () => { onAdd(value); setValue(''); };

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {items.map((x) => {
          const bad = conflicts.includes(x);
          return (
            <span
              key={x}
              className={`inline-flex items-center gap-1 rounded border pl-2 pr-1 min-h-9 text-xs ${
                bad
                  ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-100'
                  : 'bg-muted/40'
              }`}
            >
              <span className={bad ? 'line-through' : undefined}>{x}</span>
              <button
                type="button"
                aria-label={`Remove ${x}`}
                onClick={() => onRemove(x)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        <Input
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          placeholder={placeholder}
          aria-label={`Add to ${label.toLowerCase()}`}
          className="h-11"
        />
        <Button type="button" variant="outline" className="h-11 shrink-0" onClick={commit} disabled={!value.trim()}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
    </div>
  );
}

function ComfortField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <Input
        value={value ?? ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        aria-label={label}
        className="h-11"
      />
    </div>
  );
}

export default function PassengerProfileEditor({ passenger, manifestId, displayName, onDone }: {
  /** Null when the manifest id has no record at all — the editor then creates one. */
  passenger: Passenger | null;
  manifestId: string;
  displayName: string;
  onDone: () => void;
}) {
  const { addPassenger, updatePassenger } = usePassengers();
  const original = useMemo(() => draftFrom(passenger), [passenger]);
  const [draft, setDraft] = useState<ProfileDraft>(original);

  const allergens = passenger?.allergies.map((a) => a.allergen) ?? [];
  const lockedFlag = Boolean(passenger?.allergyFlagged);
  const foodConflicts = conflictingItems(draft.food, allergens);
  const drinkConflicts = conflictingItems(draft.beverage, allergens);
  const dirty = isDirty(draft, original);

  const set = (patch: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setComfort = (k: keyof PassengerComfort, v: string) =>
    setDraft((d) => ({ ...d, passengerComfort: { ...d.passengerComfort, [k]: v } }));

  const canConfirmNone = allergens.length === 0 && !lockedFlag;

  const save = () => {
    if (passenger) updatePassenger(applyDraft(passenger, draft));
    else addPassenger(newPassengerFrom(manifestId, displayName, draft));
    onDone();
  };

  return (
    <div className="space-y-4">
      {/* Easy thing to get wrong silently: this is the shared passenger record, not a
          per-trip note. Say so before anything is typed, not in a toast afterwards. */}
      <p className="rounded-lg border border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-400/40 dark:bg-sky-950/40 dark:text-sky-100 px-3 py-2 text-xs flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Saves to <span className="font-semibold">{displayName}</span>’s profile everywhere — not just this trip.</span>
      </p>

      <div className="rounded-lg border bg-muted/40 px-3 py-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          {allergens.length > 0
            ? `Allergies — ${allergens.join(', ')}`
            : lockedFlag ? 'Allergies flagged — no detail'
            : passenger ? 'No allergies recorded' : 'No allergy information on file'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {passenger ? 'Comes from the booking and cannot be changed here.' : 'Nothing came with this booking, and it cannot be entered here.'}{' '}
          <button type="button" className="underline hover:text-foreground" onClick={() => window.alert(
            'Raise it with scheduling so the booking is corrected upstream — myGFO reads myairops, it never writes back.',
          )}>Report a discrepancy</button>
        </p>
      </div>

      {canConfirmNone && (
        // The only route to the green state. An empty allergy list is not a confirmation,
        // so somebody has to actually ask — and the record keeps the date they did.
        <div className="rounded-lg border px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {draft.dietaryConfirmedAtUtc ? 'Confirmed with the passenger' : 'Not confirmed with the passenger'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {draft.dietaryConfirmedAtUtc
                ? `Recorded ${new Date(draft.dietaryConfirmedAtUtc).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}.`
                : 'Only tick this if you have asked them.'}
            </p>
          </div>
          <Button
            type="button"
            variant={draft.dietaryConfirmedAtUtc ? 'secondary' : 'outline'}
            className="h-11 w-full sm:w-auto shrink-0"
            onClick={() => set({
              dietaryConfirmedAtUtc: draft.dietaryConfirmedAtUtc
                ? undefined
                : new Date(new Date().toISOString().slice(0, 10)).toISOString(),
            })}
          >
            {draft.dietaryConfirmedAtUtc ? <><Check className="w-4 h-4" /> Confirmed</> : 'Confirm none'}
          </Button>
        </div>
      )}

      {(foodConflicts.length > 0 || drinkConflicts.length > 0) && (
        <p className="rounded-lg border-2 border-red-300 dark:border-red-400/50 px-3 py-2 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-300" />
          <span>
            <span className="font-semibold text-red-800 dark:text-red-200">
              {[...foodConflicts, ...drinkConflicts].join(', ')}
            </span>{' '}
            names something on this passenger’s allergy list. A favourite that contradicts an allergy
            is worse than no favourite — remove it, or get the booking corrected.
          </span>
        </p>
      )}

      <ChipGroup label="Food" items={draft.food} conflicts={foodConflicts} placeholder="Add a food they like"
        onAdd={(v) => set({ food: addItem(draft.food, v) })}
        onRemove={(v) => set({ food: removeItem(draft.food, v) })} />

      <ChipGroup label="Drink" items={draft.beverage} conflicts={drinkConflicts} placeholder="Add a drink they like"
        onAdd={(v) => set({ beverage: addItem(draft.beverage, v) })}
        onRemove={(v) => set({ beverage: removeItem(draft.beverage, v) })} />

      <ChipGroup label="Avoid — preference, not medical" items={draft.dislikes} placeholder="Add something they dislike"
        onAdd={(v) => set({ dislikes: addItem(draft.dislikes, v) })}
        onRemove={(v) => set({ dislikes: removeItem(draft.dislikes, v) })} />

      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cabin</p>
        <ComfortField label="Temperature" value={draft.passengerComfort.temperature} onChange={(v) => setComfort('temperature', v)} />
        <ComfortField label="Seating" value={draft.passengerComfort.seating} onChange={(v) => setComfort('seating', v)} />
        <ComfortField label="Lighting" value={draft.passengerComfort.lighting} onChange={(v) => setComfort('lighting', v)} />
        <ComfortField label="Screen" value={draft.passengerComfort.tvPreference} onChange={(v) => setComfort('tvPreference', v)} />
        <ComfortField label="Special requests" value={draft.passengerComfort.specialRequests} onChange={(v) => setComfort('specialRequests', v)} />
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes from the cabin crew</p>
        <Textarea
          value={draft.flightAttendantNotes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set({ flightAttendantNotes: e.target.value })}
          aria-label="Notes from the cabin crew"
          rows={4}
          className="mt-1.5"
          placeholder="What you learned on this trip"
        />
      </div>

      {/* DialogContent is `p-6` and scrolls internally. Sticky pins to the CONTENT box,
          not the padding box, so `bottom-0` parked the bar 24px short of the bottom and
          left a strip of the form scrolling through the gap underneath it. The negative
          offset plus the matching padding makes the bar cover that strip. */}
      <div className="flex gap-2 sticky bottom-[-24px] bg-background border-t -mx-6 px-6 pt-3 -mb-6 pb-6">
        <Button variant="outline" className="flex-1 h-12" onClick={onDone}>Cancel</Button>
        <Button className="flex-[2] h-12" onClick={save} disabled={!dirty}>
          {passenger ? 'Save to profile' : 'Create profile'}
        </Button>
      </div>
    </div>
  );
}
