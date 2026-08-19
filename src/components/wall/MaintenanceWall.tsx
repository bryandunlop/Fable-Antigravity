import React from 'react';
import { useUnifiedFleetStatus, type UnifiedFleetAircraft } from '../hooks/useUnifiedFleetStatus';
import { TODAY_LEGS, type TodayLeg } from '../../services/todaysOpsMock';
import { HOME_STATION } from '../../config/station';
import FleetMapPanel from '../ops-wall/FleetMapPanel';
import { RAG_DOT } from '../ops-wall/ragColors';
import WallChrome, { useWallClock } from './WallChrome';
import { formatRegulatoryDeadline } from '../tech-log/util/displayZone';

/**
 * /wall/maintenance — the hangar's maintenance TV (D88).
 *
 * Two states, ruled by Bryan 2026-08-19:
 * - Open maintenance items → two columns: grounded aircraft + MEL clocks on the
 *   left, the fleet map + today's movements on the right. (The map lives HERE,
 *   not on the landing page — D88 moved it.)
 * - Clear day (no RED, no AMBER) → the map and the day's ETD/ETAs fill the whole
 *   screen behind a green all-clear chip; the two-column layout re-forms the
 *   moment a defect or MEL clock opens.
 *
 * MEL clock presentation follows the house contract (DeferralDueLine): the bar
 * owns remaining time, the text owns the due date — never both in words.
 */

function MovementRow({ leg, big = false }: { leg: TodayLeg; big?: boolean }) {
  const arrived = leg.status === 'In Flight' || leg.status === 'Departed';
  return (
    <div className={`flex items-center gap-3 ${big ? 'rounded-lg border border-white/15 bg-white/[0.04] px-6 py-4' : ''}`}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: RAG_DOT.GREEN }} />
      <span className={`font-mono font-bold ${big ? 'text-[26px]' : 'text-xl'}`}>{leg.tail}</span>
      <span className={`text-white/60 ${big ? 'text-lg' : 'text-[15px]'}`}>
        {leg.depIata} → {leg.arrIata} · {arrived ? 'ETA' : 'ETD'}{' '}
        <b className="text-white">{arrived ? leg.eta : leg.schedDep} ET</b>
        {leg.etaStatus !== 'on-time' && arrived ? ` (${leg.etaStatus})` : ''}
      </span>
    </div>
  );
}

export function MaintenanceWallView({
  fleet,
  legs,
}: {
  fleet: UnifiedFleetAircraft[];
  legs: TodayLeg[];
}) {
  const grounded = fleet.filter(ac => ac.airworthiness.status === 'RED');
  const onMel = fleet.filter(ac => ac.airworthiness.status === 'AMBER');
  const clearDay = grounded.length === 0 && onMel.length === 0;

  if (clearDay) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="relative flex-1 overflow-hidden rounded-lg border border-white/15 bg-white/[0.04]">
          <span className="absolute left-6 top-5 z-[500] text-[15px] font-semibold tracking-[0.12em] text-white/55">
            FLEET
          </span>
          <FleetMapPanel fleet={fleet} homeBase={HOME_STATION} theme="dark" className="h-full min-h-[420px]" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          {legs.map(leg => (
            <MovementRow key={leg.id} leg={leg} big />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid flex-1 grid-cols-[3fr_2fr] gap-8">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-white/55">GROUNDED</h2>
          {grounded.length === 0 && <p className="text-[15px] text-white/40">No grounded aircraft</p>}
          {grounded.map(ac => (
            <div key={ac.tailNumber} className="rounded-lg border border-[#EF3340]/35 bg-[#EF3340]/10 px-7 py-6">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-4xl font-bold">{ac.tailNumber}</span>
                <span className="text-lg text-white/60">{ac.model.replace('Gulfstream ', '')} · {ac.location ?? '—'}</span>
                <span className="ml-auto text-lg font-bold tracking-wide text-[#FF8B93]">RED · NOT DISPATCHABLE</span>
              </div>
              <p className="mt-2 text-[22px] leading-snug">{ac.airworthiness.headline ?? 'Open airworthiness defect'}</p>
              <p className="mt-2 text-[15px] text-white/65">
                {ac.airworthiness.ataChapter ? `ATA ${ac.airworthiness.ataChapter} · ` : ''}
                Awaiting: inspection &amp; maintenance release
              </p>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-white/55">MEL CLOCKS</h2>
          {onMel.length === 0 && <p className="text-[15px] text-white/40">No open deferrals</p>}
          {onMel.map(ac => {
            const clock = ac.airworthiness.deferralClock;
            const pct =
              clock?.daysRemaining != null && clock.intervalDays
                ? Math.max(0, Math.min(100, Math.round(((clock.intervalDays - clock.daysRemaining) / clock.intervalDays) * 100)))
                : 0;
            return (
              <div key={ac.tailNumber} className="rounded-lg border border-[#F1B434]/35 bg-[#F1B434]/[0.07] px-7 py-6">
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-4xl font-bold">{ac.tailNumber}</span>
                  <span className="text-lg text-white/60">{ac.model.replace('Gulfstream ', '')} · {ac.location ?? '—'}</span>
                  <span className="ml-auto text-lg font-bold tracking-wide text-[#F1B434]">
                    MEL{clock?.category ? ` CAT ${clock.category}` : ''} · DISPATCHABLE
                  </span>
                </div>
                <p className="mt-2 text-[22px] leading-snug">{ac.airworthiness.headline ?? 'Deferred item'}</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1B434]/20">
                    <div className="h-full bg-[#F1B434]" style={{ width: `${pct}%` }} />
                  </div>
                  {clock?.repairDueDateUtc && (
                    <span className="shrink-0 text-lg font-semibold text-[#F1B434]">
                      {/* House deadline idiom (LG-195): a midnight boundary reads as the previous
                          day at 23:59 — PL-25's own phrasing — via formatRegulatoryDeadline. */}
                      expires {formatRegulatoryDeadline(clock.repairDueDateUtc, 'GOVERNING', clock.governingTimezone)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <div className="flex flex-col gap-6">
        <section className="flex flex-1 flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-white/55">FLEET MAP</h2>
          <div className="relative flex-1 overflow-hidden rounded-lg border border-white/15 bg-white/[0.04]">
            <FleetMapPanel fleet={fleet} homeBase={HOME_STATION} theme="dark" className="h-full min-h-[380px]" />
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-white/55">MOVEMENTS TODAY</h2>
          <div className="flex flex-col gap-3.5 rounded-lg border border-white/15 bg-white/[0.04] px-6 py-5">
            {legs.length === 0 && <p className="text-[15px] text-white/40">No flights today</p>}
            {legs.map(leg => (
              <MovementRow key={leg.id} leg={leg} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function MaintenanceWall() {
  const { fleet } = useUnifiedFleetStatus();
  const clock = useWallClock();
  const clearDay = fleet.every(ac => ac.airworthiness.status === 'GREEN');

  return (
    <WallChrome
      title="Maintenance · KLUK"
      clock={clock}
      headerExtra={
        clearDay ? (
          <span className="inline-flex items-center gap-2.5 rounded-full border border-[#00B140]/45 bg-[#00B140]/10 px-5 py-2 text-base font-semibold text-[#00B140]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#00B140]" />
            No open maintenance items · fleet clean
          </span>
        ) : undefined
      }
    >
      <MaintenanceWallView fleet={fleet} legs={TODAY_LEGS} />
      <footer className="flex items-center justify-between border-t border-white/15 pt-4 text-[15px] text-white/55">
        <span>Serviceability is the tech-log derived projection · this screen re-forms when a defect or MEL clock opens</span>
      </footer>
    </WallChrome>
  );
}
