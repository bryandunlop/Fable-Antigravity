import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarDays, KanbanSquare, Plus, Play, Pause, CheckCircle2, PackageSearch,
  ChevronLeft, ChevronRight, Plane, Palmtree, ClipboardList, AlertTriangle, Wrench,
} from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { transitionProject, prepReadiness, buildPlannerCalendar, aircraftAwayConflicts, plannerMonthAnchor, PLANNER_ZONE, type PlannerCampWo } from '../engine/planner';
import { newId } from '../util/id';
import type { MaintenanceProject, ProjectPauseReason, ProjectStatus } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const STATUS_LABEL: Record<ProjectStatus, string> = { PLANNING: 'Planning', IN_WORK: 'In work', PAUSED: 'Paused', CLOSED: 'Closed' };
const STATUS_CLASS: Record<ProjectStatus, string> = {
  PLANNING: 'border-[var(--gfo-daylight)] text-[var(--gfo-daylight)]',
  IN_WORK: 'bg-[var(--gfo-midnight)] text-white border-transparent',
  PAUSED: 'border-[var(--gfo-warning)] text-[var(--gfo-warning)]',
  CLOSED: 'text-muted-foreground',
};
const PAUSE_LABEL: Record<ProjectPauseReason, string> = {
  WAITING_PARTS: 'Waiting on parts (POO)', WAITING_HANGAR: 'Waiting on hangar', WAITING_VENDOR: 'Waiting on vendor',
  AIRCRAFT_AWAY: 'Aircraft away', OTHER: 'Other',
};
const DEFAULT_PREP = ['Parts ordered', 'Task cards loaded', 'Job codes loaded', 'Tooling staged'];

export default function Planners() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { listWorkOrders } = useIntegration();
  const isMaint = user.role === 'MAINTENANCE';
  const nameOf = (oid: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid;
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';

  const [view, setView] = useState<'board' | 'calendar'>('board');
  const [tailFilter, setTailFilter] = useState('ALL');
  const [showVacations, setShowVacations] = useState(true);
  const [showFlights, setShowFlights] = useState(true);
  const [showCampWos, setShowCampWos] = useState(true);
  const [month, setMonth] = useState(() => plannerMonthAnchor(new Date().toISOString())); // first-of-month in the operator zone (D24/TL-4)

  // pause dialog
  const [pauseFor, setPauseFor] = useState<MaintenanceProject | null>(null);
  const [pauseReason, setPauseReason] = useState<ProjectPauseReason>('WAITING_PARTS');
  const [pauseNote, setPauseNote] = useState('');

  // new-project dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [nAircraft, setNAircraft] = useState('');
  const [nName, setNName] = useState('');
  const [nDesc, setNDesc] = useState('');
  const [nStart, setNStart] = useState('');
  const [nEnd, setNEnd] = useState('');
  const [nWoRefs, setNWoRefs] = useState('');

  const projects = tailFilter === 'ALL' ? state.projects : state.projects.filter(p => p.aircraftId === tailFilter);
  const openLinkedCards = (p: MaintenanceProject) =>
    state.workCards.filter(w => p.workCardIds.includes(w.id) && w.status !== 'COMPLETED').length;

  const audit = (action: string, p: MaintenanceProject, summary: string) =>
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action, entityType: 'MaintenanceProject', entityId: p.id, atUtc: new Date().toISOString(), summary } });

  const doTransition = (p: MaintenanceProject, to: ProjectStatus, opts: { pauseReason?: ProjectPauseReason; note?: string } = {}) => {
    const r = transitionProject(p, to, user.oid, new Date().toISOString(), { ...opts, openLinkedCards: to === 'CLOSED' ? openLinkedCards(p) : 0 });
    if (!r.ok) return toast.error(r.error);
    dispatch({ type: 'EDIT_PROJECT', payload: r.project });
    audit('PROJECT_' + to, r.project, `${tailOf(p.aircraftId)} planner "${p.name}" → ${STATUS_LABEL[to]}${opts.note ? ` — ${opts.note}` : ''}`);
    setPauseFor(null); setPauseNote('');
    toast.success(`${p.name} → ${STATUS_LABEL[to]}.`);
  };

  const togglePrep = (p: MaintenanceProject, itemId: string) => {
    if (!isMaint || p.status === 'CLOSED') return;
    const next = { ...p, prepItems: p.prepItems.map(i => (i.id === itemId ? { ...i, done: !i.done } : i)) };
    dispatch({ type: 'EDIT_PROJECT', payload: next });
    const r = prepReadiness(next);
    if (r.ready) toast.success(`${p.name} — prep complete, ready to execute on arrival.`);
  };

  const createProject = () => {
    if (!nAircraft || !nName.trim() || !nStart || !nEnd) return toast.error('Aircraft, name, and the planned window are required.');
    if (new Date(nEnd) < new Date(nStart)) return toast.error('The planned end cannot precede the start.');
    const now = new Date().toISOString();
    const p: MaintenanceProject = {
      id: newId('prj'), aircraftId: nAircraft, name: nName.trim(), description: nDesc.trim() || undefined,
      status: 'PLANNING', plannedStartUtc: `${nStart}T00:00:00.000Z`, plannedEndUtc: `${nEnd}T23:59:59.000Z`,
      prepItems: DEFAULT_PREP.map(text => ({ id: newId('pi'), text, done: false })),
      workCardIds: [], campWoRefs: nWoRefs.split(',').map(s => s.trim()).filter(Boolean),
      createdByOid: user.oid, createdAtUtc: now,
      statusHistory: [{ status: 'PLANNING', atUtc: now, byOid: user.oid }],
    };
    dispatch({ type: 'ADD_PROJECT', payload: p });
    audit('PROJECT_CREATED', p, `${tailOf(p.aircraftId)} planner created: "${p.name}" (${nStart} → ${nEnd})`);
    setCreateOpen(false); setNAircraft(''); setNName(''); setNDesc(''); setNStart(''); setNEnd(''); setNWoRefs('');
    toast.success('Planner created — in planning.');
  };

  // Mirror open CAMP work orders (with their scheduled in/out window + service center) for the
  // calendar overlay. Fetched once per tail set; only refetched when the fleet/filter changes.
  //
  // This is an EFFECT, not a useMemo, and that is the whole of TL-7. listWorkOrders opens a CAMP
  // session and writes an ADD_INTEGRATION_EVENT to the tech-log reducer for every tail it reads —
  // it is a side effect, not a computation. Running it inside a memo dispatched into
  // TechLogProvider *during* this component's render, which is exactly what React's
  // "Cannot update a component while rendering a different component" warning describes.
  // Deriving it in an effect is the fix, not a suppression: the fetch now happens after commit.
  const [campWos, setCampWos] = useState<PlannerCampWo[]>([]);
  useEffect(() => {
    const tails = state.aircraft.filter(a => !a.isProvisional && (tailFilter === 'ALL' || a.id === tailFilter));
    setCampWos(tails.flatMap(ac => listWorkOrders(ac.id).map(w => ({
      woNumber: w.woNumber, aircraftId: ac.id, title: w.title,
      startUtc: w.scheduledInUtc, endUtc: w.scheduledOutUtc, icao: w.icao, serviceCenter: w.serviceCenter,
    }))));
    // listWorkOrders is re-created every render (it closes over the reducer), so it cannot be a
    // dep without refetching forever. The fleet + filter are what actually change the result.
    // ADD_INTEGRATION_EVENT does not replace state.aircraft, so the dispatch cannot re-trigger us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.aircraft, tailFilter]);

  const weeks = useMemo(
    () => buildPlannerCalendar(month, {
      projects,
      trips: tailFilter === 'ALL' ? state.trips : state.trips.filter(t => t.aircraftId === tailFilter),
      techVacations: state.techVacations,
      campWos: showCampWos ? campWos : [],
    }),
    [month, projects, state.trips, state.techVacations, tailFilter, campWos, showCampWos],
  );
  const monthLabel = new Date(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: PLANNER_ZONE });
  const shiftMonth = (dir: number) => setMonth(plannerMonthAnchor(month, dir));

  return (
    <TechLogShell
      title="Maintenance Planners"
      subtitle="Plan packages of work per tail while the aircraft is away — parts ordered, task cards loaded, ready to execute on arrival."
      actions={
        <>
          <Button size="sm" variant={view === 'board' ? 'secondary' : 'outline'} onClick={() => setView('board')}><KanbanSquare className="mr-1.5 h-4 w-4" /> Board</Button>
          <Button size="sm" variant={view === 'calendar' ? 'secondary' : 'outline'} onClick={() => setView('calendar')}><CalendarDays className="mr-1.5 h-4 w-4" /> Calendar</Button>
          {isMaint && <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New planner</Button>}
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={tailFilter} onValueChange={setTailFilter}>
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All tails</SelectItem>
            {state.aircraft.filter(a => !a.isProvisional).map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber}</SelectItem>)}
          </SelectContent>
        </Select>
        {view === 'calendar' && (
          <>
            <Button size="sm" variant={showVacations ? 'secondary' : 'outline'} onClick={() => setShowVacations(v => !v)}>
              <Palmtree className="mr-1.5 h-3.5 w-3.5" /> Vacations
            </Button>
            <Button size="sm" variant={showFlights ? 'secondary' : 'outline'} onClick={() => setShowFlights(v => !v)}>
              <Plane className="mr-1.5 h-3.5 w-3.5" /> Flight schedule
            </Button>
            <Button size="sm" variant={showCampWos ? 'secondary' : 'outline'} onClick={() => setShowCampWos(v => !v)}>
              <Wrench className="mr-1.5 h-3.5 w-3.5" /> CAMP work orders
            </Button>
            <div className="ml-auto flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="w-36 text-center text-sm font-medium">{monthLabel}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </>
        )}
      </div>

      {view === 'board' && (
        <div className="space-y-5">
          {state.aircraft.filter(a => !a.isProvisional && (tailFilter === 'ALL' || a.id === tailFilter)).map(ac => {
            const prjs = projects.filter(p => p.aircraftId === ac.id).sort((a, b) => a.plannedStartUtc.localeCompare(b.plannedStartUtc));
            return (
              <div key={ac.id}>
                <div className="mb-2 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{ac.tailNumber}</span>
                  <Badge variant="outline">{ac.type}</Badge>
                  <span className="text-xs text-muted-foreground">{prjs.filter(p => p.status !== 'CLOSED').length} active planner(s)</span>
                </div>
                {prjs.length === 0 && <Card><CardContent className="p-4 text-sm text-muted-foreground">Nothing planned for this tail.</CardContent></Card>}
                <div className="space-y-2">
                  {prjs.map(p => {
                    const ready = prepReadiness(p);
                    const away = aircraftAwayConflicts(p, state.trips);
                    return (
                      <Card key={p.id} className={p.status === 'CLOSED' ? 'opacity-60' : ''}>
                        <CardContent className="flex flex-col gap-3 p-4">
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{p.name}</span>
                                <Badge variant="outline" className={STATUS_CLASS[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                                {p.status === 'PAUSED' && p.pauseReason && (
                                  <Badge variant="outline" className={STATUS_CLASS.PAUSED}><PackageSearch className="mr-1 h-3 w-3" />{PAUSE_LABEL[p.pauseReason]}</Badge>
                                )}
                                {ready.ready && p.status !== 'CLOSED' && (
                                  <Badge variant="outline" className="border-[var(--gfo-custody-crew)] text-[var(--gfo-custody-crew)]"><CheckCircle2 className="mr-1 h-3 w-3" />Ready to execute</Badge>
                                )}
                                {p.campWoRefs?.map(r => <Badge key={r} variant="outline">CAMP {r}</Badge>)}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(p.plannedStartUtc).toLocaleDateString(undefined, { timeZone: PLANNER_ZONE })} → {new Date(p.plannedEndUtc).toLocaleDateString(undefined, { timeZone: PLANNER_ZONE })}
                                {p.description ? ` · ${p.description}` : ''}
                              </p>
                              {p.pauseNote && <p className="mt-1 border-l-2 pl-2 text-xs italic text-muted-foreground">{p.pauseNote}</p>}
                              {away.length > 0 && p.status !== 'CLOSED' && (
                                <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--gfo-warning)]">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Aircraft scheduled away in this window: {away.map(l => l.label).join(', ')}
                                </p>
                              )}
                            </div>
                            {isMaint && p.status !== 'CLOSED' && (
                              <div className="flex shrink-0 flex-wrap gap-2">
                                {(p.status === 'PLANNING' || p.status === 'PAUSED') && (
                                  <Button size="sm" onClick={() => doTransition(p, 'IN_WORK')}><Play className="mr-1.5 h-3.5 w-3.5" /> {p.status === 'PAUSED' ? 'Resume' : 'Start work'}</Button>
                                )}
                                {p.status === 'IN_WORK' && (
                                  <Button size="sm" variant="outline" onClick={() => { setPauseFor(p); setPauseReason('WAITING_PARTS'); setPauseNote(''); }}><Pause className="mr-1.5 h-3.5 w-3.5" /> Pause</Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => doTransition(p, 'CLOSED')}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Close</Button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap gap-2">
                              {p.prepItems.map(i => (
                                <button
                                  key={i.id}
                                  type="button"
                                  disabled={!isMaint || p.status === 'CLOSED'}
                                  onClick={() => togglePrep(p, i.id)}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${i.done ? 'border-[var(--gfo-daylight)] text-[var(--gfo-daylight)]' : 'text-muted-foreground hover:bg-muted'}`}
                                >
                                  <CheckCircle2 className={`h-3 w-3 ${i.done ? '' : 'opacity-30'}`} /> {i.text}
                                </button>
                              ))}
                              <span className="self-center text-[11px] text-muted-foreground">prep {ready.done}/{ready.total}</span>
                            </div>
                            {p.workCardIds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {p.workCardIds.map(id => {
                                  const wc = state.workCards.find(w => w.id === id);
                                  return wc ? (
                                    <Button key={id} size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate(`/tech-log/work-cards/${id}`)}>
                                      <ClipboardList className="mr-1 h-3 w-3" /> {wc.cardNumber}{wc.status === 'COMPLETED' ? ' ✓' : ''}
                                    </Button>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'calendar' && (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-px text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border">
              {weeks.flat().map(day => (
                <div key={day.iso} className={`min-h-24 space-y-1 bg-background p-1.5 ${day.inMonth ? '' : 'opacity-40'}`}>
                  <div className="text-right text-[11px] text-muted-foreground">{Number(day.iso.slice(8, 10))}</div>
                  {day.projects.map(p => (
                    <div
                      key={p.id}
                      title={`${tailOf(p.aircraftId)} — ${p.name} (${STATUS_LABEL[p.status]})`}
                      className={`truncate rounded border px-1 py-0.5 text-[10px] leading-tight ${STATUS_CLASS[p.status]} ${p.status === 'IN_WORK' ? '' : 'bg-background'}`}
                    >
                      {tailOf(p.aircraftId)} · {p.name}
                    </div>
                  ))}
                  {showCampWos && day.campWos.map((w, i) => (
                    <div key={i} title={`CAMP ${w.woNumber} — ${w.title}${w.serviceCenter ? ` @ ${w.serviceCenter}` : ''}`} className="flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[10px] text-[var(--gfo-info,#0096FC)]">
                      <Wrench className="h-2.5 w-2.5 shrink-0" /> {tailOf(w.aircraftId)} {w.woNumber}
                    </div>
                  ))}
                  {showFlights && day.legs.map((l, i) => (
                    <div key={i} title={`${l.tripNumber} · ${new Date(l.atUtc).toLocaleTimeString(undefined, { timeZone: PLANNER_ZONE, hour: '2-digit', minute: '2-digit' })} ET`} className="flex items-center gap-1 truncate rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                      <Plane className="h-2.5 w-2.5 shrink-0" /> {tailOf(l.aircraftId)} {l.label}
                    </div>
                  ))}
                  {showVacations && day.vacations.map(v => (
                    <div key={v.id} title={v.note ?? 'Vacation'} className="flex items-center gap-1 truncate rounded border border-dashed px-1 py-0.5 text-[10px] text-muted-foreground">
                      <Palmtree className="h-2.5 w-2.5 shrink-0" /> {nameOf(v.techOid).split(' ')[0]} off
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Overlays: <Palmtree className="inline h-3 w-3" /> technician vacations (myGFO ops) · <Plane className="inline h-3 w-3" /> flight schedule (myairops, read-only) · <Wrench className="inline h-3 w-3" /> CAMP work orders (scheduled in/out window + service center, read-only). Planner bars colored by status.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pause dialog — reason + note (POO discipline carried over from work cards) */}
      <Dialog open={!!pauseFor} onOpenChange={(o) => { if (!o) setPauseFor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pause className="h-4 w-4" /> Pause planner — {pauseFor?.name}</DialogTitle>
            <DialogDescription>Why is this package waiting? The reason (and hours in it) feed the downtime and planning reports.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label>Reason</Label>
              <Select value={pauseReason} onValueChange={(v: string) => setPauseReason(v as ProjectPauseReason)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAUSE_LABEL) as ProjectPauseReason[]).map(r => <SelectItem key={r} value={r}>{PAUSE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note{pauseReason === 'WAITING_PARTS' ? ' (required — what part, from whom)' : ' (optional)'}</Label>
              <Input className="mt-1" placeholder="e.g. POO — brake assemblies from GAC Savannah, ETA next Tue" value={pauseNote} onChange={e => setPauseNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseFor(null)}>Cancel</Button>
            <Button onClick={() => pauseFor && doTransition(pauseFor, 'PAUSED', { pauseReason, note: pauseNote })}><Pause className="mr-1.5 h-4 w-4" /> Pause</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New planner dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> New maintenance planner</DialogTitle>
            <DialogDescription>A package of upcoming work for one tail — planned while the aircraft is away so it's ready on arrival.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label>Aircraft</Label>
              <Select value={nAircraft} onValueChange={setNAircraft}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select tail" /></SelectTrigger>
                <SelectContent>{state.aircraft.filter(a => !a.isProvisional).map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber} · {a.type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input className="mt-1" placeholder="e.g. 12-Month Inspection Package" value={nName} onChange={e => setNName(e.target.value)} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea className="mt-1" rows={2} placeholder="Scope, due-list items, known discrepancies covered…" value={nDesc} onChange={e => setNDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Planned start</Label><Input type="date" className="mt-1" value={nStart} onChange={e => setNStart(e.target.value)} /></div>
              <div><Label>Planned end</Label><Input type="date" className="mt-1" value={nEnd} onChange={e => setNEnd(e.target.value)} /></div>
            </div>
            <div>
              <Label>CAMP work orders (optional, comma-separated)</Label>
              <Input className="mt-1" placeholder="WO-05-0490, WO-32-0455" value={nWoRefs} onChange={e => setNWoRefs(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Standard prep checklist is added automatically: {DEFAULT_PREP.join(' · ')}.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createProject}><Plus className="mr-1.5 h-4 w-4" /> Create planner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
