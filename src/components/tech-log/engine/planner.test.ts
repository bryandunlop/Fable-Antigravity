import { describe, it, expect } from 'vitest';
import { transitionProject, prepReadiness, buildPlannerCalendar, aircraftAwayConflicts } from './planner';
import type { MaintenanceProject, TechVacation, Trip } from '../types';

const project = (over: Partial<MaintenanceProject> = {}): MaintenanceProject => ({
  id: 'prj-1', aircraftId: 'ac-n2pg', name: '12-Month Inspection Package',
  status: 'PLANNING',
  plannedStartUtc: '2026-08-10T00:00:00.000Z', plannedEndUtc: '2026-08-12T23:59:59.000Z',
  prepItems: [
    { id: 'pi-1', text: 'Parts ordered', done: true },
    { id: 'pi-2', text: 'Task cards loaded', done: false },
  ],
  workCardIds: [], createdByOid: 'dom1', createdAtUtc: '2026-07-09T12:00:00.000Z',
  statusHistory: [{ status: 'PLANNING', atUtc: '2026-07-09T12:00:00.000Z', byOid: 'dom1' }],
  ...over,
});

const NOW = '2026-08-10T08:00:00.000Z';

describe('maintenance project lifecycle (D28: planning → in work → paused → closed)', () => {
  it('starts a planned project (PLANNING → IN_WORK) and records history', () => {
    const r = transitionProject(project(), 'IN_WORK', 'm1', NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.project.status).toBe('IN_WORK');
    expect(r.project.statusHistory[r.project.statusHistory.length - 1]).toMatchObject({ status: 'IN_WORK', byOid: 'm1' });
  });

  it('pausing requires a reason; waiting-on-parts additionally requires a note (POO discipline)', () => {
    const inWork = project({ status: 'IN_WORK' });
    expect(transitionProject(inWork, 'PAUSED', 'm1', NOW).ok).toBe(false);
    expect(transitionProject(inWork, 'PAUSED', 'm1', NOW, { pauseReason: 'WAITING_PARTS' }).ok).toBe(false);
    const ok = transitionProject(inWork, 'PAUSED', 'm1', NOW, { pauseReason: 'WAITING_PARTS', note: 'POO — brake assemblies from GAC' });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.project.pauseReason).toBe('WAITING_PARTS');
  });

  it('resuming clears the pause fields', () => {
    const paused = project({ status: 'PAUSED', pauseReason: 'WAITING_HANGAR', pauseNote: 'bay occupied' });
    const r = transitionProject(paused, 'IN_WORK', 'm1', NOW);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.project.pauseReason).toBeUndefined(); expect(r.project.pauseNote).toBeUndefined(); }
  });

  it('cannot close while linked work cards are still open', () => {
    const r = transitionProject(project({ status: 'IN_WORK' }), 'CLOSED', 'm1', NOW, { openLinkedCards: 2 });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toMatch(/open work card/i);
  });

  it('closes cleanly and stamps closedAtUtc; CLOSED is terminal', () => {
    const r = transitionProject(project({ status: 'IN_WORK' }), 'CLOSED', 'm1', NOW, { openLinkedCards: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.project.closedAtUtc).toBe(NOW);
    expect(transitionProject(r.project, 'IN_WORK', 'm1', NOW).ok).toBe(false);
  });

  it('rejects a skip from PLANNING straight to PAUSED', () => {
    expect(transitionProject(project(), 'PAUSED', 'm1', NOW, { pauseReason: 'OTHER', note: 'x' }).ok).toBe(false);
  });
});

describe('prep readiness (parts ordered / task cards loaded — ready when aircraft comes home)', () => {
  it('reports progress and readiness', () => {
    expect(prepReadiness(project())).toEqual({ done: 1, total: 2, ready: false });
    const ready = project({ prepItems: project().prepItems.map(i => ({ ...i, done: true })) });
    expect(prepReadiness(ready)).toEqual({ done: 2, total: 2, ready: true });
  });
  it('a project with no prep items is not "ready" by absence', () => {
    expect(prepReadiness(project({ prepItems: [] })).ready).toBe(false);
  });
});

const trips: Trip[] = [{
  id: 't1', tripNumber: 'T-100', aircraftId: 'ac-n2pg', name: 'KLUK–KTEB', status: 'OPEN',
  flightLogIds: [], createdByOid: 'p1', createdAtUtc: '2026-07-01T00:00:00.000Z',
  legs: [
    { id: 'l1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB', departureTimeUtc: '2026-08-10T14:00:00.000Z', arrivalTimeUtc: '2026-08-10T16:00:00.000Z', fratStatus: 'NOT_STARTED', airportReviewed: false },
    { id: 'l2', sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KLUK', departureTimeUtc: '2026-08-20T14:00:00.000Z', arrivalTimeUtc: '2026-08-20T16:00:00.000Z', fratStatus: 'NOT_STARTED', airportReviewed: false },
  ],
}];

const vacations: TechVacation[] = [
  { id: 'v1', techOid: 'm1', startUtc: '2026-08-09T00:00:00.000Z', endUtc: '2026-08-11T23:59:59.000Z' },
];

describe('planning calendar (month grid + vacation/flight overlays)', () => {
  const weeks = buildPlannerCalendar('2026-08-01T00:00:00.000Z', { projects: [project()], trips, techVacations: vacations });

  it('builds full Sunday-start weeks covering the month', () => {
    expect(weeks.length).toBe(6);
    expect(weeks.every(w => w.length === 7)).toBe(true);
    expect(weeks[0][0].iso).toBe('2026-07-26');
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[0][6].iso).toBe('2026-08-01');
    expect(weeks[0][6].inMonth).toBe(true);
  });

  it('a project bar spans exactly its planned window', () => {
    const days = weeks.flat();
    const withPrj = days.filter(d => d.projects.some(p => p.id === 'prj-1')).map(d => d.iso);
    expect(withPrj).toEqual(['2026-08-10', '2026-08-11', '2026-08-12']);
  });

  it('a flight leg lands on its departure day (myairops overlay)', () => {
    const days = weeks.flat();
    const withLeg = days.filter(d => d.legs.length > 0).map(d => ({ iso: d.iso, label: d.legs[0].label }));
    expect(withLeg).toEqual([
      { iso: '2026-08-10', label: 'KLUK→KTEB' },
      { iso: '2026-08-20', label: 'KTEB→KLUK' },
    ]);
  });

  it('a vacation range shades each covered day', () => {
    const days = weeks.flat();
    const off = days.filter(d => d.vacations.length > 0).map(d => d.iso);
    expect(off).toEqual(['2026-08-09', '2026-08-10', '2026-08-11']);
  });
});

describe('CAMP WO overlay (scheduled in/out windows on the planning calendar)', () => {
  it('a mirrored CAMP WO renders across its scheduled window with service-center context', () => {
    const weeks = buildPlannerCalendar('2026-08-01T00:00:00.000Z', {
      projects: [], trips: [], techVacations: [],
      campWos: [{ woNumber: 'WO-24-0188', aircraftId: 'ac-n5pg', title: 'APU generator GCU inspection', startUtc: '2026-08-18T13:00:00.000Z', endUtc: '2026-08-19T22:00:00.000Z', icao: 'KSAV', serviceCenter: 'Gulfstream Savannah' }],
    });
    const days = weeks.flat();
    const withWo = days.filter(d => d.campWos.length > 0).map(d => d.iso);
    expect(withWo).toEqual(['2026-08-18', '2026-08-19']);
    expect(days.find(d => d.iso === '2026-08-18')?.campWos[0].serviceCenter).toBe('Gulfstream Savannah');
  });

  it('the overlay is optional — calendars built without campWos still work', () => {
    const weeks = buildPlannerCalendar('2026-08-01T00:00:00.000Z', { projects: [], trips: [], techVacations: [] });
    expect(weeks.flat().every(d => d.campWos.length === 0)).toBe(true);
  });
});

describe('aircraft-away conflict (planned window overlapping the flight schedule)', () => {
  it('flags legs of the same tail inside the planned window', () => {
    const hits = aircraftAwayConflicts(project(), trips);
    expect(hits).toHaveLength(1);
    expect(hits[0].label).toBe('KLUK→KTEB');
  });
  it('ignores other tails and out-of-window legs', () => {
    const other = project({ aircraftId: 'ac-n5pg' });
    expect(aircraftAwayConflicts(other, trips)).toHaveLength(0);
  });
});
