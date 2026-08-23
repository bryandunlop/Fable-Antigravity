// What this trip will cost the cost centre, itemised — and what would make it
// cheaper. The "how to lower this" block is the point of the surface, not a
// decoration: every lever there is something that costs the flight department
// little or nothing, so showing it is how demand gets shaped without a price
// ever moving upward. See docs/booking-portal/chargeback-demand-model.md.

import { CircleDollarSign, Info, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Chip, SectionLabel } from './portalUi';
import { hm, type Quote } from '../engine/quote';
import { cn } from '../../ui/utils';

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export interface Saving {
  label: string;
  amount: number;
  how: string;
}

/** Credits this request has not earned yet, largest first. */
export function savingsAvailable(quote: Quote, opts: {
  leadDays: number;
  earlyBookingDays: number;
  allFlexed: boolean;
  anySharedRepo: boolean;
}): Saving[] {
  const earned = (label: string) => quote.lines.some((l) => l.label === label);
  const out: Saving[] = [];
  if (!earned('Early-booking credit') && opts.leadDays < opts.earlyBookingDays) {
    out.push({
      label: 'Early-booking credit',
      amount: Math.round(quote.subtotal * 0.15),
      how: `book ${opts.earlyBookingDays - opts.leadDays} days earlier`,
    });
  }
  if (!opts.allFlexed) {
    out.push({
      label: 'Flex credit',
      amount: Math.round(quote.subtotal * 0.1),
      how: 'give scheduling a ±4 h window on every leg',
    });
  }
  if (!opts.anySharedRepo) {
    out.push({
      label: 'Shared repositioning',
      amount: Math.round(quote.repositioningHours * 10_000 * 0.5),
      how: 'scheduling pairs your deadhead with another trip',
    });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

export function QuotePanel({
  quote,
  savings,
  compact,
}: {
  quote: Quote;
  savings?: Saving[];
  compact?: boolean;
}) {
  const charges = quote.lines.filter((l) => l.kind === 'charge');
  const credits = quote.lines.filter((l) => l.kind === 'credit');
  const notes = quote.lines.filter((l) => l.kind === 'note');
  const ceilingPct = Math.round(quote.ceilingUsed * 100);

  return (
    <Card data-tour="quote-panel">
      <CardHeader className="py-4">
        <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
          <span className="status-badge status-info p-1.5"><CircleDollarSign className="h-4 w-4" /></span>
          Cost estimate
          {credits.length > 0 && <Chip tone="ok">{credits.length} credit{credits.length === 1 ? '' : 's'} earned</Chip>}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="space-y-1.5 text-sm">
          {charges.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between gap-3">
              <span>
                {l.label}
                <span className="block text-xs text-muted-foreground">{l.detail}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">{usd(l.amount)}</span>
            </div>
          ))}

          {credits.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between gap-3 text-[var(--gfo-ok,#00B140)]">
              <span>
                {l.label}
                <span className="block text-xs text-muted-foreground">{l.detail}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">−{usd(Math.abs(l.amount))}</span>
            </div>
          ))}

          <div className="mt-2 flex items-baseline justify-between gap-3 border-t pt-2">
            <span className="font-semibold">Estimated charge</span>
            <span className="text-lg font-bold tabular-nums">{usd(quote.total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {hm(quote.billableHours)} billable · {usd(quote.effectivePerHour)}/h effective
          </p>
        </div>

        {notes.map((l) => (
          <div key={l.label} className="flex gap-2 rounded-md border border-dashed p-2.5 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-semibold">{l.label} — {l.detail}.</span>{' '}
              <span className="text-muted-foreground">{quote.nonBusinessNote}</span>
            </span>
          </div>
        ))}

        {!compact && (
          <div data-tour="quote-ceiling">
            <SectionLabel>Against the regulatory ceiling</SectionLabel>
            <div className="h-2 w-full overflow-hidden rounded-sm bg-muted">
              <div
                className={cn('h-full', ceilingPct > 90 ? 'bg-[var(--gfo-block,#D71F2E)]' : 'bg-[var(--gfo-daylight,#0096FC)]')}
                style={{ width: `${Math.min(100, ceilingPct)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{ceilingPct}%</span> of the{' '}
              {usd(quote.ceilingPerHour)}/h cap. 14 CFR 91.501(b)(5) bars any internal charge above the cost of
              owning, operating and maintaining the airplane — it caps the top, never the bottom, so every credit
              below is unconstrained by it.
            </p>
          </div>
        )}

        {savings && savings.length > 0 && (
          <div data-tour="quote-savings">
            <SectionLabel>How to lower this</SectionLabel>
            <div className="space-y-1.5">
              {savings.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-baseline gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      {s.label}
                      <span className="block text-xs text-muted-foreground">{s.how}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    save ~{usd(s.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!compact && (
          <div data-tour="quote-cancel">
            <SectionLabel>If you cancel</SectionLabel>
            <div className="overflow-hidden rounded-md border text-xs">
              {quote.cancelSchedule.map((s, i) => (
                <div
                  key={s.daysBefore}
                  className={cn(
                    'flex items-center justify-between gap-3 px-2.5 py-1.5',
                    i > 0 && 'border-t',
                    s.amount === 0 && 'text-[var(--gfo-ok,#00B140)]',
                    s.amount === quote.total && quote.total > 0 && 'text-[var(--gfo-block,#D71F2E)]',
                  )}
                >
                  <span>{s.label}</span>
                  <span className="font-semibold tabular-nums">{s.amount === 0 ? 'no charge' : usd(s.amount)}</span>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Committing early is what lets scheduling plan crew and aircraft — so it is the cheapest thing you can do,
              and changing your mind late is the expensive one.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
