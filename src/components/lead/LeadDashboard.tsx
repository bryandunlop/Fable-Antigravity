import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Eye, Bookmark, BookmarkCheck, User, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { GfoPageHeader, GfoPanel, GfoStatCard } from '../gfo';
import { useOpsClock } from '../hooks/useOpsClock';
import { useUnifiedFleetStatus } from '../hooks/useUnifiedFleetStatus';
import { RAG_DOT } from '../ops-wall/ragColors';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import type { TripRecord } from '../../scheduling/store/types';
import {
  buildWeekAhead,
  buildWaitingOnYou,
  fleetExceptions,
  todaysLegs,
  tripsFlownThisMonth,
} from './leadSelectors';
import {
  getPendingTripRequests,
  getTurndownsThisMonth,
  getOnTimeLegStats,
  getTrackedPassengers,
  DEFAULT_TRACKED_PASSENGER_IDS,
  type TrackedPassenger,
} from './bookingQueueSeed';
import { getCrewRecords, expiringWithinDays, dutyHeadroom } from '../crew/crewRecords';
import { getApprovalRequests, pendingForRoles } from '../safety-center/approvalRequests';
import { actingUser } from '../safety-center/actingUser';
import { readFirState, firInProgressSummary } from '../fir/engine/select';
import { useSafetyModel } from '../safety-center/useSafetyModel';
import { useAsapReports } from '../safety-center/asapReports';
import { loadPersistedTechLogState } from '../tech-log/bridge';
import { AuditLogger } from '../../services/AuditLogger';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function daysSince(iso: string, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - Date.parse(iso)) / 86_400_000));
}

const EXPIRY_KIND_LABEL = { currency: 'Currency', medical: 'Medical', training: 'Training' } as const;

/**
 * The Lead brief — a decision-first replacement for the old wall-of-mock
 * LeadDashboard. Every region answers one leadership question from a shared
 * source (unified fleet status, the scheduling store, approvals/FIR/safety
 * selectors, crew records, booking queue seed) — no per-page literals.
 */
export default function LeadDashboard({
  userRole = 'lead',
  additionalRoles = [],
}: {
  userRole?: string;
  additionalRoles?: string[];
}) {
  const navigate = useNavigate();
  const clock = useOpsClock();
  const { fleet, dispatchable, inFlight } = useUnifiedFleetStatus();
  const { store, ready, tick, nowUtc } = useSchedulingWorkspace();
  const { name: viewerName, id: viewerUserId } = actingUser(userRole);
  const asap = useAsapReports();
  const safety = useSafetyModel(viewerName);

  const [trips, setTrips] = useState<TripRecord[]>([]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    store.listTrips().then(rows => { if (!cancelled) setTrips(rows); });
    return () => { cancelled = true; };
  }, [store, ready, tick]);

  const now = nowUtc();
  const nowMs = Date.parse(now);

  // ── Derivations (all pure; sources shared with the rest of the app) ──
  const grounded = fleet.filter(a => a.airworthiness.status === 'RED').length;
  const exceptions = useMemo(() => fleetExceptions(fleet), [fleet]);
  const week = useMemo(() => buildWeekAhead(trips, dispatchable, now), [trips, dispatchable, now]);
  const tightDay = week.find(d => d.oversubscribed);
  const legs = useMemo(() => todaysLegs(trips, now), [trips, now]);

  const pendingRequests = useMemo(() => getPendingTripRequests(now), [now]);
  const turndowns = useMemo(() => getTurndownsThisMonth(now), [now]);
  const roles = useMemo(() => [userRole, ...additionalRoles], [userRole, additionalRoles]);
  const waiting = useMemo(() => {
    const approvals = pendingForRoles(getApprovalRequests(), roles, viewerUserId);
    const firs = readFirState(localStorage).firs.filter(f => f.status === 'IN_REVIEW');
    return buildWaitingOnYou({ pendingRequests, approvals, firsInReview: firs });
  }, [roles, viewerUserId, pendingRequests]);

  const crew = useMemo(() => getCrewRecords(now), [now]);
  const expiring = useMemo(() => expiringWithinDays(crew, 60, now), [crew, now]);
  const tightestCrew = dutyHeadroom(crew).filter(h => h.dutyHoursUsed > 0)[0];

  const firSummary = useMemo(() => firInProgressSummary(readFirState(localStorage).firs), []);
  const openSafetyCases = safety.ops.move.length + safety.ops.track.length;
  const asapUnderReview = asap.reports.filter(r => r.status === 'Under review').length;
  const safetyTotal = firSummary.count + openSafetyCases + asapUnderReview;

  const fleetHours = useMemo(
    () => loadPersistedTechLogState().aircraft.reduce((sum, ac) => sum + (ac.airframeTotalHours ?? 0), 0),
    [],
  );
  const flownThisMonth = useMemo(() => tripsFlownThisMonth(trips, now), [trips, now]);
  const onTime = getOnTimeLegStats();
  const monthName = new Date(nowMs).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });

  // ── Tracked passengers (behavior carried over from the old page) ──
  const passengers = useMemo(() => getTrackedPassengers(), []);
  const [trackedIds, setTrackedIds] = useState<string[]>(DEFAULT_TRACKED_PASSENGER_IDS);
  const [detailsPax, setDetailsPax] = useState<TrackedPassenger | null>(null);

  useEffect(() => {
    if (detailsPax) {
      AuditLogger.log('VIEW_VIP_DETAILS', 'LeadDashboard', { passengerId: detailsPax.id, name: detailsPax.name });
    }
  }, [detailsPax]);

  function toggleTracked(passengerId: string) {
    const isAdding = !trackedIds.includes(passengerId);
    setTrackedIds(prev => (isAdding ? [...prev, passengerId] : prev.filter(id => id !== passengerId)));
    AuditLogger.log(isAdding ? 'TRACK_VIP_PASSENGER' : 'UNTRACK_VIP_PASSENGER', 'LeadDashboard', { passengerId });
    toast.success(isAdding ? 'Passenger added to tracking' : 'Passenger removed from tracking');
  }

  const dateLine = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = viewerName.split(' ')[0];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 p-6">
      {/* ── Header ── */}
      <GfoPageHeader
        eyebrow={`Lead team · ${dateLine}`}
        title={`${greetingFor(new Date().getHours())}, ${firstName}`}
        actions={
          <>
            <span className="font-mono text-xs text-muted-foreground">{clock}</span>
            <Button variant="outline" size="sm" onClick={() => navigate('/manager-insights')}>
              <Layers className="mr-1.5 h-4 w-4" />
              Manager Insights
            </Button>
          </>
        }
      />

      {/* ── Fleet strip ── */}
      <GfoPanel className="py-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex flex-wrap items-center gap-3">
            {fleet.map(ac => (
              <span key={ac.tailNumber} className="flex items-center gap-1.5 text-sm font-medium text-primary">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: RAG_DOT[ac.airworthiness.status] }}
                  aria-label={ac.airworthiness.status}
                />
                {ac.tailNumber}
              </span>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {dispatchable} dispatchable · {inFlight} in flight · {grounded} grounded
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {exceptions.map(pill => (
              <span
                key={`${pill.tailNumber}-${pill.kind}`}
                className={`status-badge ${pill.kind === 'grounded' ? 'status-error' : 'status-warning'}`}
              >
                {pill.tailNumber}{' '}
                {pill.kind === 'grounded'
                  ? `grounded — ${pill.headline ?? 'open defect'}`
                  : `deferral ${pill.daysRemaining}d — ${pill.headline ?? 'MEL clock'}`}
              </span>
            ))}
          </div>
          <button
            onClick={() => navigate('/tech-log')}
            className="ml-auto flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Tech Log <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </GfoPanel>

      {/* ── Week ahead + Waiting on you ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GfoPanel title="Week ahead" className="lg:col-span-2">
          <div className="grid grid-cols-7 gap-2">
            {week.map(day => (
              <div
                key={day.dateUtc}
                className={`rounded-lg border p-2 text-center ${
                  day.oversubscribed ? 'status-warning' : 'border-border bg-card'
                }`}
              >
                <div className="gfo-eyebrow text-muted-foreground">{day.dateLabel}</div>
                <div className="gfo-numeric mt-1 text-2xl text-primary">{day.tripCount}</div>
                <div className="text-[11px] text-muted-foreground">of {day.tailsAvailable} tails</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {tightDay
              ? `${tightDay.dateLabel} is the tight day — ${tightDay.tripCount} trips against ${tightDay.tailsAvailable} dispatchable tails.`
              : 'Demand fits the dispatchable fleet on every day this week.'}
          </p>
        </GfoPanel>

        <GfoPanel title="Waiting on you">
          {waiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing needs your decision right now.</p>
          ) : (
            <ul className="space-y-2">
              {waiting.map(item => (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    onClick={() => navigate(item.target)}
                    className="w-full rounded-lg border border-border bg-card p-2.5 text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="gfo-eyebrow text-muted-foreground">
                      {item.kind === 'trip-request' ? 'Trip request' : item.kind === 'approval' ? 'Approval' : 'FIR publish gate'}
                      {' · '}waiting {daysSince(item.sinceUtc, nowMs)}d
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-primary">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.detail}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
            {turndowns.length} turndowns this month · {turndowns.filter(t => t.reason === 'availability').length} for availability
          </p>
        </GfoPanel>
      </div>

      {/* ── People readiness + Safety picture ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GfoPanel title="People readiness">
          <p className="text-sm text-muted-foreground">
            {tightestCrew
              ? `Tightest duty headroom today: ${tightestCrew.name} — ${tightestCrew.headroomHours} h left of ${tightestCrew.dutyLimitHours} h.`
              : 'No crew on duty right now.'}
          </p>
          <ul className="mt-3 space-y-1.5">
            {expiring.map(item => (
              <li key={`${item.record.id}-${item.kind}`} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-primary">{item.record.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{EXPIRY_KIND_LABEL[item.kind]}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {new Date(item.expiresUtc).toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })}
                  {' · '}{item.daysUntil}d
                </span>
              </li>
            ))}
            {expiring.length === 0 && (
              <li className="text-sm text-muted-foreground">Nothing expires in the next 60 days.</li>
            )}
          </ul>
          <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
            Expiries within 60 days, from the shared crew readiness record.
          </p>
        </GfoPanel>

        <GfoPanel title="Safety picture">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="gfo-numeric text-4xl text-primary">{safetyTotal}</span>
              <div className="space-y-0.5 pt-1 text-sm text-muted-foreground">
                <div>{firSummary.count} FIR in progress</div>
                <div>{openSafetyCases} open safety cases</div>
                <div>{asapUnderReview} ASAP under review</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/safety')}>
              Safety Center
            </Button>
          </div>
        </GfoPanel>
      </div>

      {/* ── Today's flights + Tracked passengers ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GfoPanel title="Today's flights" className="lg:col-span-2">
          {legs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No legs departing today.</p>
          ) : (
            <ul className="divide-y divide-border">
              {legs.map(l => {
                const enRoute = fleet.find(a => a.tailNumber === l.tail)?.flightStatus === 'in-flight';
                return (
                  <li key={`${l.tripId}-${l.departureTimeUtc}`} className="flex items-center gap-4 py-2">
                    <span className="w-14 font-mono text-sm tabular-nums text-primary">
                      {new Date(l.departureTimeUtc).toISOString().slice(11, 16)}Z
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
                      {l.from} → {l.to}
                    </span>
                    <span className="text-xs text-muted-foreground">{l.tail} · {l.paxCount} pax</span>
                    {enRoute && (
                      <span className="status-badge status-info flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        En route
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </GfoPanel>

        <GfoPanel title="Tracked passengers">
          <ul className="space-y-2">
            {passengers.map(pax => {
              const isTracked = trackedIds.includes(pax.id);
              return (
                <li
                  key={pax.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-primary">{pax.name}</div>
                    <div className="text-xs text-muted-foreground">{pax.role} · {pax.category}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailsPax(pax)}>
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleTracked(pax.id)}>
                      {isTracked ? (
                        <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </GfoPanel>
      </div>

      {/* ── Month stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GfoStatCard
          label="Airframe hours · fleet total"
          value={fleetHours.toLocaleString('en-US', { maximumFractionDigits: 1 })}
          unit="h"
        />
        <GfoStatCard
          label={`Trips flown · ${monthName}`}
          value={flownThisMonth}
          trend={{ direction: 'flat', label: `${turndowns.length} turndowns`, tone: 'neutral' }}
        />
        <GfoStatCard
          label="Legs on time"
          value={`${onTime.onTimeLegs}/${onTime.totalLegs}`}
          trend={{ direction: 'flat', label: `${onTime.weatherDelays} weather delays`, tone: 'neutral' }}
        />
      </div>

      {/* ── Passenger details dialog (audited) ── */}
      <Dialog open={detailsPax !== null} onOpenChange={open => { if (!open) setDetailsPax(null); }}>
        <DialogContent className="max-w-lg">
          {detailsPax && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {detailsPax.name}
                </DialogTitle>
                <DialogDescription>
                  {detailsPax.role} · {detailsPax.category}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{detailsPax.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{detailsPax.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Preferences</p>
                  <p className="text-sm">{detailsPax.preferences}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
