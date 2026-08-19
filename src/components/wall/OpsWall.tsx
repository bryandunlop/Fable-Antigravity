import React, { useMemo } from 'react';
import { useUnifiedFleetStatus, type UnifiedFleetAircraft } from '../hooks/useUnifiedFleetStatus';
import { DUTY_WINDOWS, TODAY_LEGS, type DutyWindow, type TodayLeg } from '../../services/todaysOpsMock';
import { HOME_STATION } from '../../config/station';
import { lookupAirport } from '../../services/airportCoords';
import StationWeatherStrip from '../ops-wall/StationWeatherStrip';
import { RAG_DOT } from '../ops-wall/ragColors';
import AircraftSilhouette from '../ui/AircraftSilhouette';
import WallChrome, { useWallClock } from './WallChrome';
import { hhmmToMinutes, legBlockPct, pctOnAxis } from './wallTime';

/**
 * /wall/ops — the hangar/ops-room TV (D88, promoted from the design canvas's
 * Option C): the whole day as one swimlane board per tail, with a NOW line.
 * Read-only, room-distance type, fixed dark palette (see WallChrome).
 */

const AXIS_LABELS = ['0600', '0800', '1000', '1200', '1400', '1600', '1800', '2000', '2200'];

function LaneLabel({ ac }: { ac: UnifiedFleetAircraft }) {
  const { status } = ac.airworthiness;
  return (
    <div className="flex w-[170px] shrink-0 flex-col">
      <div className="flex items-center gap-2">
        <span className={`font-mono text-2xl font-bold ${status === 'RED' ? 'text-white/50' : ''}`}>
          {ac.tailNumber}
        </span>
        <AircraftSilhouette
          type={ac.model.replace('Gulfstream ', '')}
          className={`h-5 w-auto ${status === 'RED' ? 'text-white/25' : 'text-white/40'}`}
        />
      </div>
      {status === 'RED' ? (
        <span className="text-sm font-semibold text-[#EF3340]">GROUNDED</span>
      ) : status === 'AMBER' ? (
        <span className="text-sm font-semibold text-[#F1B434]">
          MEL{ac.airworthiness.deferralClock?.category ? ` ${ac.airworthiness.deferralClock.category}` : ''}
          {ac.airworthiness.deferralClock?.daysRemaining != null
            ? ` · ${ac.airworthiness.deferralClock.daysRemaining}d left`
            : ''}
        </span>
      ) : (
        <span className="text-sm text-white/55">
          {ac.model.replace('Gulfstream ', '')} · <span className="text-[#00B140]">airworthy</span>
        </span>
      )}
    </div>
  );
}

function Lane({ ac, legs }: { ac: UnifiedFleetAircraft; legs: TodayLeg[] }) {
  const { status, headline, deferralClock } = ac.airworthiness;

  if (status === 'RED') {
    return (
      <div className="relative h-full rounded-md border border-[#EF3340]/30 bg-[#EF3340]/10">
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] text-[#FF8B93]">
          {headline ?? 'Open airworthiness defect'} · maintenance release required before dispatch
        </span>
      </div>
    );
  }

  if (status === 'AMBER' && legs.length === 0) {
    return (
      <div className="relative h-full rounded-md bg-white/[0.04]">
        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] text-[#F1B434]">
          MEL{deferralClock?.category ? ` Cat ${deferralClock.category}` : ''} · {headline ?? 'deferred item'}
          {deferralClock?.daysRemaining != null && deferralClock.intervalDays != null
            ? ` · ${deferralClock.daysRemaining} of ${deferralClock.intervalDays} days left`
            : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-full rounded-md bg-white/[0.04]">
      {legs.map(leg => {
        const flying = leg.status !== 'Scheduled';
        const block = legBlockPct(leg.schedDep, leg.eta || leg.schedArr);
        return (
          <div
            key={leg.id}
            className={`absolute bottom-3 top-3 flex items-center justify-center rounded text-[15px] font-semibold ${
              flying ? 'bg-[#0096FC] text-white' : 'border-2 border-dashed border-[#7FCCFE] text-[#7FCCFE]'
            }`}
            style={{ left: `${block.leftPct}%`, width: `${Math.max(block.widthPct, 6)}%` }}
          >
            {leg.depIata} → {leg.arrIata} · {leg.pax} pax
          </div>
        );
      })}
    </div>
  );
}

export function OpsWallView({
  fleet,
  legs,
  duty,
  etMinutes,
}: {
  fleet: UnifiedFleetAircraft[];
  legs: TodayLeg[];
  duty: DutyWindow[];
  etMinutes: number;
}) {
  const grounded = fleet.filter(ac => ac.airworthiness.status === 'RED');
  const onMel = fleet.filter(ac => ac.airworthiness.status === 'AMBER');
  const dispatchable = fleet.length - grounded.length;
  const nowPct = pctOnAxis(etMinutes);
  const nowOnAxis = etMinutes >= hhmmToMinutes('06:00') && etMinutes <= hhmmToMinutes('22:00');

  return (
    <div className="flex flex-1 flex-col gap-5">
      {/* Status strip */}
      <div className="flex items-center gap-8 border-y border-white/15 py-3.5 text-[17px]">
        <span className="text-[13px] font-semibold tracking-[0.12em] text-white/55">STATUS</span>
        <span className="inline-flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full" style={{ background: RAG_DOT.GREEN }} />
          {dispatchable} dispatchable
        </span>
        {onMel.length > 0 && (
          <span className="inline-flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: RAG_DOT.AMBER }} />
            {onMel.length} on MEL (dispatchable)
          </span>
        )}
        {grounded.map(ac => (
          <span key={ac.tailNumber} className="inline-flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ background: RAG_DOT.RED }} />
            {ac.tailNumber} grounded
          </span>
        ))}
      </div>

      {/* Swimlanes */}
      <div className="flex flex-1 flex-col">
        <div className="flex justify-between pb-3 pl-[170px] font-mono text-sm text-white/45">
          {AXIS_LABELS.map(l => (
            <span key={l}>{l}</span>
          ))}
        </div>
        <div className="relative flex flex-1 flex-col gap-4 border-t border-white/15 py-5">
          {nowOnAxis && (
            <>
              <div
                className="absolute bottom-0 top-0 w-[3px] bg-[#0096FC] opacity-90"
                style={{ left: `calc(170px + ${nowPct} * (100% - 170px) / 100)` }}
              />
              <div
                className="absolute -top-1.5 font-mono text-[13px] text-[#7FCCFE]"
                style={{ left: `calc(170px + ${nowPct} * (100% - 170px) / 100 - 30px)` }}
              >
                NOW
              </div>
            </>
          )}
          {fleet.map(ac => (
            <div key={ac.tailNumber} className="flex h-[72px] items-center">
              <LaneLabel ac={ac} />
              <div className="h-full flex-1">
                <Lane ac={ac} legs={legs.filter(l => l.tail === ac.tailNumber)} />
              </div>
            </div>
          ))}

          {/* Crew duty band */}
          <div className="flex h-[56px] items-center border-t border-white/15 pt-4">
            <span className="w-[170px] shrink-0 text-sm font-semibold tracking-[0.1em] text-[#D1AC6B]">
              CREW DUTY
            </span>
            <div className="relative h-full flex-1">
              {duty.map((w, i) => {
                const band = legBlockPct(w.start, w.end);
                return (
                  <React.Fragment key={w.crew}>
                    <div
                      className="absolute h-3 rounded-full"
                      style={{
                        left: `${band.leftPct}%`,
                        width: `${band.widthPct}%`,
                        top: 6,
                        background: `rgba(209,172,107,${i === 0 ? 0.55 : 0.3})`,
                      }}
                    />
                    <div
                      className="absolute top-6 font-mono text-[13px] text-white/50"
                      style={{ left: `${Math.min(band.leftPct + i * 30, 66)}%` }}
                    >
                      {w.crew} {w.start.replace(':', '')}–{w.end.replace(':', '')}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OpsWall() {
  const { fleet } = useUnifiedFleetStatus();
  const clock = useWallClock();

  const stations = useMemo(() => {
    const destinations = fleet
      .map(ac => lookupAirport(ac.position?.arrivalAirport)?.icao)
      .filter((icao): icao is string => Boolean(icao) && icao !== HOME_STATION);
    return [HOME_STATION, ...Array.from(new Set(destinations)).slice(0, 3)];
  }, [fleet]);

  return (
    <WallChrome title="Global Flight Operations" clock={clock}>
      <OpsWallView fleet={fleet} legs={TODAY_LEGS} duty={DUTY_WINDOWS} etMinutes={clock.etMinutes} />
      <footer className="border-t border-white/15 pt-4">
        <StationWeatherStrip stations={stations} />
      </footer>
    </WallChrome>
  );
}
