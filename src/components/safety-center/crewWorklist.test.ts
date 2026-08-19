import { describe, it, expect } from 'vitest';
import { buildCrewWorklist, awaitingMyReply, daysUntil, PER_KIND_CAP, type CrewWorklistInput } from './crewWorklist';
import type { Hazard } from '../../contexts/HazardContext';
import type { Audit } from '../../contexts/AuditContext';
import type { RequiredRead } from '../documents/engine/acknowledgments';

// Fixed clock so every due label is deterministic: 2026-08-18T12:00:00Z.
const NOW = Date.parse('2026-08-18T12:00:00Z');
const ME = 'Capt. Dunlop';

const read = (id: string, title: string, ackDueDate?: string, changeSummary = ''): RequiredRead =>
  ({
    doc: { id: `d-${id}`, title } as any,
    rev: { id, docId: `d-${id}`, ackDueDate, changeSummary, effectiveDate: '2026-08-01' } as any,
  });

const hazard = (id: string, over: Partial<Hazard> = {}): Hazard =>
  ({ id, title: `Hazard ${id}`, reportedBy: ME, isAnonymous: false, messages: [], ...over } as any);

const msg = (authorRole: 'safety' | 'submitter', atUtc: string) =>
  ({ id: `m-${atUtc}`, authorRole, authorName: 'x', body: 'y', atUtc } as any);

const audit = (id: string, over: Partial<Audit> = {}): Audit =>
  ({ id, title: `Audit ${id}`, status: 'In Progress', assignedTo: 'Sarah Wilson', ...over } as any);

const input = (over: Partial<CrewWorklistInput> = {}): CrewWorklistInput =>
  ({ reads: [], hazards: [], audits: [], reporterName: ME, nowMs: NOW, ...over });

describe('daysUntil', () => {
  it('counts calendar days, not elapsed hours', () => {
    // 23:00 today is still "0 days", not "1 day", from noon today.
    expect(daysUntil('2026-08-18T23:00:00Z', NOW)).toBe(0);
    expect(daysUntil('2026-08-19T01:00:00Z', NOW)).toBe(1);
  });

  it('goes negative once the date has passed', () => {
    expect(daysUntil('2026-08-15T00:00:00Z', NOW)).toBe(-3);
  });

  it('is undefined for a missing or unparseable date', () => {
    expect(daysUntil(undefined, NOW)).toBeUndefined();
    expect(daysUntil('not a date', NOW)).toBeUndefined();
  });
});

describe('awaitingMyReply', () => {
  it('is true when the safety team spoke last on my own report', () => {
    const h = hazard('1', { messages: [msg('submitter', '2026-08-10'), msg('safety', '2026-08-16')] });
    expect(awaitingMyReply(h, ME)).toBe(true);
  });

  it('is false when I spoke last — the ball is not with me', () => {
    const h = hazard('1', { messages: [msg('safety', '2026-08-10'), msg('submitter', '2026-08-16')] });
    expect(awaitingMyReply(h, ME)).toBe(false);
  });

  it('is false with no messages at all', () => {
    expect(awaitingMyReply(hazard('1'), ME)).toBe(false);
  });

  it('is false for someone else’s report', () => {
    const h = hazard('1', { reportedBy: 'Capt. Reyes', messages: [msg('safety', '2026-08-16')] });
    expect(awaitingMyReply(h, ME)).toBe(false);
  });

  it('is false for an anonymous report — there is nobody to ask', () => {
    const h = hazard('1', { isAnonymous: true, messages: [msg('safety', '2026-08-16')] });
    expect(awaitingMyReply(h, ME)).toBe(false);
  });

  it('is false for a deleted report', () => {
    const h = hazard('1', { isDeleted: true, messages: [msg('safety', '2026-08-16')] } as any);
    expect(awaitingMyReply(h, ME)).toBe(false);
  });
});

describe('buildCrewWorklist', () => {
  it('is empty when nothing is owed', () => {
    expect(buildCrewWorklist(input()).tasks).toEqual([]);
  });

  it('excludes a completed audit', () => {
    const rows = buildCrewWorklist(input({
      audits: [audit('a1', { status: 'Complete' }), audit('a2', { status: 'In Progress' })],
    })).tasks;
    expect(rows.map((r) => r.sourceId)).toEqual(['a2']);
  });

  it('merges all three sources', () => {
    const rows = buildCrewWorklist(input({
      reads: [read('r1', 'Ops Manual Rev 12', '2026-08-21')],
      hazards: [hazard('h1', { messages: [msg('safety', '2026-08-16')] })],
      audits: [audit('a1', { dueDate: '2026-08-20' })],
    })).tasks;
    expect(rows.map((r) => r.kind).sort()).toEqual(['audit', 'reply', 'sign']);
  });

  it('orders dated tasks soonest-first, and puts undated ones last', () => {
    const rows = buildCrewWorklist(input({
      reads: [read('r1', 'Later read', '2026-08-25')],
      hazards: [hazard('h1', { messages: [msg('safety', '2026-08-16')] })],
      audits: [audit('a1', { dueDate: '2026-08-19' })],
    })).tasks;
    expect(rows.map((r) => r.kind)).toEqual(['audit', 'sign', 'reply']);
  });

  it('puts an overdue task ahead of everything', () => {
    const rows = buildCrewWorklist(input({
      reads: [read('r1', 'Overdue read', '2026-08-14')],
      audits: [audit('a1', { dueDate: '2026-08-19' })],
    })).tasks;
    expect(rows[0].sourceId).toBe('r1');
    expect(rows[0].due).toEqual({ label: '4 days overdue', tone: 'red' });
  });

  it('orders two undated replies oldest-question-first', () => {
    const rows = buildCrewWorklist(input({
      hazards: [
        hazard('recent', { messages: [msg('safety', '2026-08-17')] }),
        hazard('old', { messages: [msg('safety', '2026-08-02')] }),
      ],
    })).tasks;
    expect(rows.map((r) => r.sourceId)).toEqual(['old', 'recent']);
  });

  it('tones the due chip by proximity', () => {
    const at = (d: string) => buildCrewWorklist(input({ audits: [audit('a', { dueDate: d })] })).tasks[0].due;
    expect(at('2026-08-18')).toEqual({ label: 'Due today', tone: 'red' });
    expect(at('2026-08-19')).toEqual({ label: 'Due tomorrow', tone: 'red' });
    expect(at('2026-08-23')).toEqual({ label: 'Due in 5 days', tone: 'amber' });
    expect(at('2026-09-30')).toEqual({ label: 'Due in 43 days', tone: 'neutral' });
  });

  it('leaves a reply row undated rather than inventing a deadline', () => {
    const rows = buildCrewWorklist(input({
      hazards: [hazard('h1', { messages: [msg('safety', '2026-08-16')] })],
    })).tasks;
    expect(rows[0].due).toBeUndefined();
  });

  it('routes each kind to the door that can act on it', () => {
    const rows = buildCrewWorklist(input({
      reads: [read('r1', 'A read', '2026-08-21')],
      hazards: [hazard('h1', { messages: [msg('safety', '2026-08-16')] })],
      audits: [audit('a1', { dueDate: '2026-08-20' })],
    })).tasks;
    const doors = Object.fromEntries(rows.map((r) => [r.kind, r.door]));
    expect(doors).toEqual({ sign: 'reads', reply: 'reports', audit: 'audits' });
  });

  it('caps each kind so one noisy source cannot starve another', () => {
    const manyAudits = Array.from({ length: 13 }, (_, n) =>
      audit(`a${n}`, { dueDate: `2026-08-${String(n + 1).padStart(2, '0')}` }));
    const out = buildCrewWorklist(input({
      reads: [read('r1', 'A signature', '2026-09-30')],   // least urgent of all
      audits: manyAudits,
    }));
    expect(out.tasks.filter((t) => t.kind === 'audit')).toHaveLength(PER_KIND_CAP);
    // The signature survives despite being last by date — that is the point.
    expect(out.tasks.some((t) => t.kind === 'sign')).toBe(true);
    expect(out.more).toEqual([{ kind: 'audit', count: 13 - PER_KIND_CAP, door: 'audits' }]);
  });

  it('reports no overflow when nothing was truncated', () => {
    expect(buildCrewWorklist(input({ audits: [audit('a1', { dueDate: '2026-08-20' })] })).more).toEqual([]);
  });

  it('is stable — the same input yields the same order', () => {
    const i = input({
      reads: [read('r1', 'One', '2026-08-20'), read('r2', 'Two', '2026-08-20')],
    });
    expect(buildCrewWorklist(i).tasks.map((r) => r.id)).toEqual(buildCrewWorklist(i).tasks.map((r) => r.id));
  });
});
