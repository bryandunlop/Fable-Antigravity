import React from 'react';

import type { RunwayEndRecord, RunwayRecord } from '../../airport/types';

/**
 * A runway drawn to scale, with each end's declared distances underneath.
 *
 * The table this sits beside is correct but hard to read fast. Drawn to scale,
 * two things become obvious that a row of numbers hides: KTEB 01's LDA is 838 ft
 * shorter than its TORA because of a 770 ft displaced threshold, and KASE takes
 * off on 7,006 ft one way and 8,006 ft the other.
 *
 * Bars are scaled against the LONGEST runway at the airport, so runways are
 * comparable with each other rather than each filling the width.
 */

const DISTANCES = [
  { key: 'toraFt', label: 'TORA', hint: 'take-off run available' },
  { key: 'todaFt', label: 'TODA', hint: 'take-off distance available' },
  { key: 'asdaFt', label: 'ASDA', hint: 'accelerate-stop distance available' },
  { key: 'ldaFt', label: 'LDA', hint: 'landing distance available' },
] as const;

function EndDistances({
  end,
  scaleMax,
  rightToLeft,
}: {
  end: RunwayEndRecord;
  scaleMax: number;
  rightToLeft: boolean;
}) {
  const distances = end.declaredDistances;
  if (!distances) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        Departing {end.endId}
        {end.displacedThresholdFt
          ? ` · ${end.displacedThresholdFt.toLocaleString()} ft displaced threshold`
          : ''}
      </p>
      {DISTANCES.map(({ key, label, hint }) => {
        const value = distances[key];
        if (value === null) {
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="w-11 shrink-0 font-mono text-muted-foreground">{label}</span>
              <span className="text-muted-foreground italic">not published</span>
            </div>
          );
        }
        return (
          <div key={key} className="flex items-center gap-2 text-xs" title={hint}>
            <span className="w-11 shrink-0 font-mono text-muted-foreground">{label}</span>
            <div className={`flex h-2.5 flex-1 ${rightToLeft ? 'justify-end' : 'justify-start'}`}>
              <div
                className="h-full rounded-sm bg-sky-500/70"
                style={{ width: `${(value / scaleMax) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right font-mono tabular-nums">
              {value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RunwayDiagram({
  runway,
  scaleMax,
}: {
  runway: RunwayRecord;
  scaleMax: number;
}) {
  const length = runway.lengthFt ?? 0;
  const widthPct = scaleMax > 0 ? (length / scaleMax) * 100 : 100;
  const [firstEnd, secondEnd] = runway.ends;
  const anyDistances = runway.ends.some((end) => end.declaredDistances);

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-11 shrink-0" />
          <span className="flex-1">
            {firstEnd?.endId ?? ''}
            <span className="mx-1">→</span>
            <span className="float-right">
              <span className="mr-1">←</span>
              {secondEnd?.endId ?? ''}
            </span>
          </span>
          <span className="w-16 shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-11 shrink-0" />
          <div className="flex-1">
            <div
              className="relative h-6 rounded-sm border border-slate-400 bg-slate-200 dark:border-slate-500 dark:bg-slate-700"
              style={{ width: `${widthPct}%` }}
              role="img"
              aria-label={`Runway ${runway.runwayId}, ${length.toLocaleString()} feet`}
            >
              {/* Centreline */}
              <div className="absolute top-1/2 left-2 right-2 h-px -translate-y-1/2 border-t border-dashed border-slate-500 dark:border-slate-400" />
              {/* Displaced thresholds, shaded at the end they belong to */}
              {firstEnd?.displacedThresholdFt && length > 0 ? (
                <div
                  className="absolute inset-y-0 left-0 bg-amber-400/40"
                  style={{ width: `${(firstEnd.displacedThresholdFt / length) * 100}%` }}
                  title={`${firstEnd.displacedThresholdFt} ft displaced threshold on ${firstEnd.endId}`}
                />
              ) : null}
              {secondEnd?.displacedThresholdFt && length > 0 ? (
                <div
                  className="absolute inset-y-0 right-0 bg-amber-400/40"
                  style={{ width: `${(secondEnd.displacedThresholdFt / length) * 100}%` }}
                  title={`${secondEnd.displacedThresholdFt} ft displaced threshold on ${secondEnd.endId}`}
                />
              ) : null}
            </div>
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums">
            {length.toLocaleString()}
          </span>
        </div>
      </div>

      {anyDistances ? (
        <div className="space-y-3">
          {runway.ends.map((end, index) => (
            <EndDistances
              key={end.endId}
              end={end}
              scaleMax={scaleMax}
              rightToLeft={index === 1}
            />
          ))}
        </div>
      ) : (
        <p className="rounded border border-dashed p-2 text-xs text-muted-foreground">
          The FAA publishes no declared distances for this runway. The bar above is the physical
          runway length, which is not a substitute for TORA, TODA, ASDA or LDA.
        </p>
      )}

      {firstEnd?.displacedThresholdFt || secondEnd?.displacedThresholdFt ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-4 rounded-sm bg-amber-400/40" />
          displaced threshold
        </p>
      ) : null}
    </div>
  );
}
