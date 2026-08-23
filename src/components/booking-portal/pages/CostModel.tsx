// Frame H — the economics under the rate card, as a page you can argue with.
//
// This is a PROOF OF CONCEPT, and the page says so in its first block. The fixed
// share of cost is a guess, not GFO's accounting, and the whole argument rests on
// it — so the page's centre of gravity is the sensitivity sweep, not the headline.
// Reasoning: docs/CHARGEBACK_DEMAND_MODEL.md in the Tech Log repo.

import { useMemo, useState } from 'react';
import { Plane, Scale, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { PortalShell } from '../components/PortalShell';
import { AsOf, Chip, SectionLabel } from '../components/portalUi';
import {
  GFO_COST_INPUTS, HOLDS_ABOVE_MULTIPLE,
  costPicture, holdingThreshold, idlePicture, sweepFixedShare,
} from '../engine/costModel';
import { cn } from '../../ui/utils';

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const musd = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

/** Tone for a deterrent multiple: near cost is good, well above it is not. */
function multipleTone(m: number): string {
  if (m >= 2) return 'text-[var(--gfo-block,#D71F2E)]';
  if (m >= HOLDS_ABOVE_MULTIPLE) return 'text-[var(--gfo-flag,#B87A0E)]';
  return 'text-[var(--gfo-ok,#00B140)]';
}

function Slider({
  label, note, value, min, max, step, fmt, onChange, tour,
}: {
  label: string; note?: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void; tour?: string;
}) {
  return (
    <div className="space-y-1" data-tour={tour}>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm text-muted-foreground">{label}</label>
        <span className="text-sm font-semibold tabular-nums">{fmt(value)}</span>
      </div>
      <input
        type="range" aria-label={label}
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--gfo-daylight,#0096FC)]"
      />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export default function CostModel() {
  const [fixedShare, setFixedShare] = useState(GFO_COST_INPUTS.fixedShare * 100);
  const [chargebackShare, setChargebackShare] = useState(GFO_COST_INPUTS.chargebackShare * 100);
  const [demandCut, setDemandCut] = useState(24);

  const inputs = useMemo(
    () => ({ ...GFO_COST_INPUTS, fixedShare: fixedShare / 100, chargebackShare: chargebackShare / 100 }),
    [fixedShare, chargebackShare],
  );
  const picture = useMemo(() => costPicture(inputs), [inputs]);
  const hoursFlown = Math.round(inputs.plannedHours * (1 - demandCut / 100));
  const idle = useMemo(() => idlePicture(hoursFlown, inputs), [hoursFlown, inputs]);
  const rows = useMemo(() => sweepFixedShare(inputs), [inputs]);
  const threshold = holdingThreshold(rows);
  const maxMultiple = Math.max(...rows.map((r) => r.deterrentMultiple));

  return (
    <PortalShell
      title="What an hour actually costs"
      meta={<AsOf>Proof of concept · every figure below is an assumption you can change</AsOf>}
    >
      <Card className="mb-4 border-l-[3px] border-l-[var(--gfo-sunrise,#D1AC6B)]" data-tour="cost-provenance">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex gap-2.5">
              <Chip tone="ok">Known</Chip>
              <p className="text-sm text-muted-foreground">
                The rate is <b className="text-foreground">$10,000 per flight hour</b>, repositioning legs
                <b className="text-foreground"> are billed</b> to the requestor, the fleet flies about
                <b className="text-foreground"> 2,500 hours a year</b>, and the chargeback is
                <b className="text-foreground"> roughly half</b> the department budget.
              </p>
            </div>
            <div className="flex gap-2.5">
              <Chip tone="flag">Guessed</Chip>
              <p className="text-sm text-muted-foreground">
                The <b className="text-foreground">fixed share of cost</b> — an estimate, not GFO's accounting —
                and therefore the budget, the full cost per hour, and what an extra hour really costs.
                The sweep below exists because this guess carries the whole argument.
              </p>
            </div>
          </div>
          <p className="border-t pt-3 text-sm text-muted-foreground">
            These aircraft do not exist to make money — <b className="text-foreground">they exist to get used</b>.
            A chargeback is an internal transfer between P&amp;G cost centres, not income, so nothing here is scored
            on the department's net. It is scored on hours flown and on what an idle fleet costs.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="lg:sticky lg:top-4">
          <CardHeader className="py-4"><CardTitle className="text-base">Assumptions</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-0">
            <Slider
              label="Fixed share of cost" value={fixedShare} min={40} max={95} step={5}
              fmt={(v) => `${v}%`} onChange={setFixedShare} tour="cost-fixedshare"
              note="THE GUESS. Aircraft, staff, building — paid whether anything flies. Drag it and watch the argument strengthen or collapse."
            />
            <Slider
              label="Chargeback share of budget" value={chargebackShare} min={10} max={100} step={5}
              fmt={(v) => `${v}%`} onChange={setChargebackShare}
              note="The rest is a set allocation that arrives regardless."
            />
            <Slider
              label="Demand shortfall" value={demandCut} min={0} max={60} step={2}
              fmt={(v) => `−${v}%`} onChange={setDemandCut}
              note="A corporate travel freeze. The fleet is paid for either way."
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card data-tour="cost-headline">
            <CardHeader className="py-4">
              <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
                <span className="status-badge status-info p-1.5"><Scale className="h-4 w-4" /></span>
                What you charge, against what it costs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <SectionLabel>An extra hour really costs</SectionLabel>
                  <p className="text-2xl font-bold tabular-nums">{usd(picture.realCostPerHour)}</p>
                  <p className="text-xs text-muted-foreground">fuel, parts, wear — the rest is already spent</p>
                </div>
                <div>
                  <SectionLabel>A business unit is charged</SectionLabel>
                  <p className="text-2xl font-bold tabular-nums">{usd(inputs.ratePerHour)}</p>
                  <p className="text-xs text-muted-foreground">the published rate, per flight hour</p>
                </div>
                <div>
                  <SectionLabel>Which is</SectionLabel>
                  <p className={cn('text-2xl font-bold tabular-nums', multipleTone(picture.deterrentMultiple))}>
                    {picture.deterrentMultiple.toFixed(1)}×
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {picture.deterrentMultiple >= HOLDS_ABOVE_MULTIPLE
                      ? 'a deterrent to the one thing the fleet is for'
                      : 'close to cost — little deterrent to remove'}
                  </p>
                </div>
              </div>
              <p className="border-t pt-3 text-sm text-muted-foreground">
                14 CFR 91.501(b)(5) caps an internal charge at the cost of owning, operating and maintaining the
                airplane — <b className="text-foreground">{usd(picture.ceilingPerHour)}/h</b> here, so the rate uses{' '}
                <b className="text-foreground">{Math.round(picture.ceilingUsed * 100)}%</b> of the cap.
                The rule caps the top and sets no floor: <b className="text-foreground">charging less is always
                permitted</b>, which is why every lever worth considering is a downward one.
              </p>
            </CardContent>
          </Card>

          <Card data-tour="cost-idle">
            <CardHeader className="py-4">
              <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
                <span className="status-badge status-warning p-1.5"><Plane className="h-4 w-4" /></span>
                What an idle fleet costs
                {idle.idleHours > 0 && <Chip tone="flag">{Math.round(idle.idleHours).toLocaleString()} h sitting</Chip>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <SectionLabel>Hours flown</SectionLabel>
                  <p className="text-xl font-bold tabular-nums">{hoursFlown.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">of {inputs.plannedHours.toLocaleString()} planned</p>
                </div>
                <div>
                  <SectionLabel>Fixed cost that bought nothing</SectionLabel>
                  <p className="text-xl font-bold tabular-nums text-[var(--gfo-block,#D71F2E)]">
                    {musd(idle.idleFixedCost)}
                  </p>
                  <p className="text-xs text-muted-foreground">spent on aircraft that did not move</p>
                </div>
                <div>
                  <SectionLabel>Cost per hour delivered</SectionLabel>
                  <p className="text-xl font-bold tabular-nums">{usd(idle.costPerHourDelivered)}</p>
                  <p className="text-xs text-muted-foreground">the same bill over fewer trips</p>
                </div>
              </div>
              <p className="border-t pt-3 text-sm text-muted-foreground">
                Flying did not get more expensive. <b className="text-foreground">{musd(picture.fixedCost)}</b> of
                fixed cost was committed before the year started; the only question was how many trips it ended up
                attached to.
              </p>
            </CardContent>
          </Card>

          <Card data-tour="cost-sensitivity">
            <CardHeader className="py-4">
              <CardTitle className="flex flex-wrap items-center gap-2.5 text-base">
                <span className="status-badge status-info p-1.5"><TrendingDown className="h-4 w-4" /></span>
                Does this hold if the guess is wrong?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="text-sm text-muted-foreground">
                The whole argument rests on one number nobody has. Here is the same question asked across every
                plausible answer — <b className="text-foreground">how many times the real cost of an hour is a
                requestor being charged?</b>
              </p>

              <div className="overflow-hidden rounded-lg border">
                {rows.map((r) => {
                  const isGuess = Math.round(r.fixedShare * 100) === Math.round(fixedShare);
                  return (
                    <div
                      key={r.fixedShare}
                      className={cn(
                        'grid grid-cols-[84px_1fr_88px_86px] items-center gap-3 border-t px-3 py-2 text-sm first:border-t-0',
                        isGuess && 'bg-muted/60 font-semibold',
                      )}
                    >
                      <span className="whitespace-nowrap">
                        {Math.round(r.fixedShare * 100)}% fixed
                      </span>
                      <span className="h-2 overflow-hidden rounded-sm bg-muted">
                        <span
                          className={cn(
                            'block h-full',
                            r.deterrentMultiple >= 2
                              ? 'bg-[var(--gfo-block,#D71F2E)]'
                              : r.deterrentMultiple >= HOLDS_ABOVE_MULTIPLE
                                ? 'bg-[var(--gfo-flag,#B87A0E)]'
                                : 'bg-[var(--gfo-ok,#00B140)]',
                          )}
                          style={{ width: `${(r.deterrentMultiple / maxMultiple) * 100}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums text-muted-foreground">
                        {usd(r.realCostPerHour)}/h
                      </span>
                      <span className={cn('text-right font-semibold tabular-nums', multipleTone(r.deterrentMultiple))}>
                        {r.deterrentMultiple.toFixed(1)}× charged
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md border border-dashed p-3 text-sm">
                <SectionLabel>The verdict this panel is for</SectionLabel>
                {threshold ? (
                  <p className="text-muted-foreground">
                    The case for changing anything rests on the rate sitting well above what an hour really costs.
                    That starts to hold at about{' '}
                    <b className="text-foreground">{Math.round(threshold.fixedShare * 100)}% fixed</b>{' '}
                    ({threshold.deterrentMultiple.toFixed(1)}× real cost) and does not hold below it.{' '}
                    <b className="text-foreground">
                      So the whole idea turns on whether GFO's fixed share is above roughly two-thirds.
                    </b>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    At no fixed share in this range does the rate sit far enough above real cost for a pricing
                    change to be worth pursuing.
                  </p>
                )}
                <p className="mt-2 text-muted-foreground">
                  Two things hold <b className="text-foreground">whatever</b> the split turns out to be: an idle
                  aircraft wastes fixed cost that was already spent, and a chargeback is an internal transfer that
                  changes nothing at company level. So the question worth taking further is not{' '}
                  <i>what should the rate be</i> — it is{' '}
                  <b className="text-foreground">
                    what is the actual fixed share, and has anyone ever declined a trip because of the rate?
                  </b>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalShell>
  );
}
