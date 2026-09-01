// The opener on "new trip": her own past trips, not an empty form.
//
// An EA books the same handful of routes for the same handful of people over and over.
// Making her retype KCVG → KTEB for the ninth time is work the software should be doing;
// she changes the dates and sends it.
//
// "Just hold some days" sits beside them as a button, deliberately not a second kind of
// thing to learn. A request with no route IS an inquiry — nothing in the lifecycle needs
// a new word for it.

import { useState } from 'react';
import { CalendarPlus, RotateCcw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { pastTrips, type PastTripOption } from '../engine/likeOneOfThese';
import type { TripRequest } from '../types';

export function StartFromPast({
  requests,
  defaultDate,
  onUsePast,
  onHoldDays,
}: {
  requests: TripRequest[];
  defaultDate: string;
  onUsePast: (option: PastTripOption, startDate: string) => void;
  onHoldDays: (dates: string[]) => void;
}) {
  const options = pastTrips(requests);
  const [holdFrom, setHoldFrom] = useState(defaultDate);
  const [holdTo, setHoldTo] = useState(defaultDate);

  const holdDates = (): string[] => {
    const from = Date.parse(`${holdFrom}T00:00:00Z`);
    const to = Date.parse(`${holdTo}T00:00:00Z`);
    if (Number.isNaN(from) || Number.isNaN(to) || to < from) return [holdFrom];
    const out: string[] = [];
    for (let t = from; t <= to; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
    return out.slice(0, 31);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Like one of these?
          </p>
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing to copy yet — this will fill up as you book.
            </p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {options.map(o => (
                <li key={o.request.id}>
                  <button
                    type="button"
                    onClick={() => onUsePast(o, defaultDate)}
                    className="w-full rounded-md border px-2.5 py-2 text-left hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                      {o.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {o.legCount} leg{o.legCount === 1 ? '' : 's'}
                      {o.spanDays > 0 && ` · ${o.spanDays + 1} days`}
                      {o.timesAsked > 1 && ` · asked ${o.timesAsked}×`}
                      {' · last '}{o.lastAsked}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {options.length > 0 && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Copies the route and its shape. Passengers are not copied — who travelled last
              time is a fact about last time.
            </p>
          )}
        </div>

        <div className="border-t pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Or just hold some days
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="Hold from"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={holdFrom}
              onChange={e => setHoldFrom(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              aria-label="Hold to"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={holdTo}
              onChange={e => setHoldTo(e.target.value)}
            />
            <Button size="sm" variant="outline" onClick={() => onHoldDays(holdDates())}>
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
              Hold these days
            </Button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            No route yet — scheduling reads it as an enquiry and comes back to you. You can
            add the route later without starting again.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
