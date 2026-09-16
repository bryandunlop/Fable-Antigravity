import React, { useEffect, useState } from 'react';
import { HOME_STATION } from '../../config/station';
import { formatDateOnly, operatorTodayIso } from '../../lib/operatorDate';
import { getRoleLabelByValue } from '../../lib/mockUsers';
import {
  useFuelPrice,
  saveFuelPrice,
  canEditFuelPrice,
  parsePriceInput,
  daysSinceEffective,
  isStale,
  MIN_PRICE,
  MAX_PRICE,
} from '../../utils/fuelPrice';

/**
 * The posted Lunken jet-A price, on the wall where everyone lands.
 *
 * The number itself is a copy of FuelerLinx, so the tile refuses to show it
 * bare: the day it took effect and the person who keyed it sit under it, and
 * once the copy is older than the weekly update it says so rather than
 * presenting a stale figure with the same confidence as a fresh one. A pilot
 * sizing an uplift off a three-week-old price is the failure this is built to
 * prevent.
 *
 * Scheduling owns the value (they already carry the recurring Monday task to
 * update it in FuelerLinx); everyone else reads it.
 */
export default function FuelPriceTile({
  userRole,
  additionalRoles = [],
  className = '',
}: {
  userRole: string;
  additionalRoles?: string[];
  className?: string;
}) {
  const price = useFuelPrice();
  const canEdit = canEditFuelPrice(userRole, additionalRoles);

  // Staleness is a function of the clock, not of the value, so a tile rendered
  // once would still read "6 days old" on the morning it turned eight. The ops
  // wall is a leave-it-open surface, so re-evaluate on return to the tab and on
  // a slow tick rather than trusting the mount.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 15 * 60 * 1000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stale = isStale(price, now);
  const age = daysSinceEffective(price, now);

  function startEditing() {
    setDraft(price.pricePerGallon.toFixed(2));
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function commit() {
    const parsed = parsePriceInput(draft);
    if (parsed === null) {
      setError(`Enter a price per gallon between $${MIN_PRICE.toFixed(2)} and $${MAX_PRICE.toFixed(2)}.`);
      return;
    }
    const now = new Date();
    saveFuelPrice({
      pricePerGallon: parsed,
      // The price takes effect the day it is keyed; the clock that decides
      // staleness runs off this, not off setAt.
      effectiveDate: operatorTodayIso(now),
      setBy: getRoleLabelByValue(userRole) || userRole,
      setAt: now.toISOString(),
    });
    setEditing(false);
    setError(null);
  }

  return (
    <section
      className={`rounded-lg border border-border bg-card p-3 ${className}`}
      aria-label={`${HOME_STATION} fuel price`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Lunken fuel</h2>
        <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {HOME_STATION}
        </span>
      </div>

      {editing ? (
        <div className="mt-2">
          <label htmlFor="fuel-price-input" className="text-xs text-muted-foreground">
            Price per gallon
          </label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <input
              id="fuel-price-input"
              type="text"
              inputMode="decimal"
              autoFocus
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') cancel();
              }}
              className="w-24 rounded border border-border bg-background px-2 py-1 text-sm"
              aria-invalid={error !== null}
              aria-describedby={error ? 'fuel-price-error' : undefined}
            />
            <button
              type="button"
              onClick={commit}
              className="rounded border border-border px-2 py-1 text-xs font-medium hover:bg-accent"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p id="fuel-price-error" role="alert" className="mt-1 text-xs text-[color:var(--gfo-error,#EF3340)]">
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="mt-1 text-2xl font-medium leading-none">
            ${price.pricePerGallon.toFixed(2)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/gal</span>
          </p>

          <p className="mt-1.5 text-xs text-muted-foreground">
            Set {formatDateOnly(price.effectiveDate, { month: 'short', day: 'numeric' })} by {price.setBy}
          </p>

          {stale && (
            <p className="mt-1.5 text-xs text-[color:var(--gfo-warning,#F1B434)]">
              {Number.isNaN(age) ? 'No effective date' : `${age} days old`} — check FuelerLinx before
              you price an uplift.
            </p>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={startEditing}
              className="mt-2 rounded border border-border px-2 py-1 text-xs font-medium hover:bg-accent"
            >
              Update price
            </button>
          )}
        </>
      )}
    </section>
  );
}
