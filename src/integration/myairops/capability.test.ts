import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import {
  classifyEffect,
  isMutating,
  assertMyairopsCallAllowed,
  MyairopsWriteRefused,
  PULL_ONLY_POLICY,
  type Effect,
  type MyairopsPolicy,
} from './capability';

const SCHEMA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'schemas');

interface VendorOp { method: string; path: string; summary: string }

function opsFrom(file: string): VendorOp[] {
  const doc = JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8')) as {
    paths: Record<string, Record<string, { summary?: string }>>;
  };
  const ops: VendorOp[] = [];
  for (const [path, methods] of Object.entries(doc.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      ops.push({ method: method.toUpperCase(), path, summary: op.summary ?? '' });
    }
  }
  return ops;
}

const SURFACES = [
  { surface: 'booking', file: 'booking.json' },
  { surface: 'crm', file: 'crm.json' },
  { surface: 'maintenance', file: 'maintenance.json' },
] as const;

describe('classifyEffect', () => {
  it('reads GETs', () => {
    expect(classifyEffect('GET', '/api/Trips')).toBe('read');
    expect(classifyEffect('GET', '/api/TripLegs/{id}/passengerbookings')).toBe('read');
  });

  it('treats the flight-time calculator as non-mutating despite being a POST', () => {
    // The single override. If this ever regresses to 'create', a read-only credential
    // path loses its only usable POST and route estimation silently breaks.
    expect(classifyEffect('POST', '/api/FlightTimes/calculate')).toBe('compute');
    expect(isMutating(classifyEffect('POST', '/api/FlightTimes/calculate'))).toBe(false);
  });

  it('separates the soft-delete lifecycle from hard deletes', () => {
    expect(classifyEffect('POST', '/api/Contact/{id}/softdelete')).toBe('soft-delete');
    expect(classifyEffect('POST', '/api/Contact/{id}/restore')).toBe('restore');
    expect(classifyEffect('DELETE', '/api/Trips/{id}')).toBe('delete');
  });

  it('recognises status-ladder transitions', () => {
    expect(classifyEffect('POST', '/api/Trips/{id}/markasbooked')).toBe('transition');
    expect(classifyEffect('POST', '/api/Trips/{id}/markinprogress')).toBe('transition');
    expect(classifyEffect('POST', '/api/Trips/{id}/booking')).toBe('transition');
    expect(classifyEffect('POST', '/api/Trips/{id}/cancellation')).toBe('transition');
    expect(classifyEffect('POST', '/api/MaintenanceEntries/{id}/release')).toBe('transition');
  });

  it('recognises link and unlink', () => {
    expect(classifyEffect('POST', '/api/Passengers/{id}/link/{clientId}')).toBe('link');
    expect(classifyEffect('DELETE', '/api/Passengers/{id}/link/{clientId}')).toBe('unlink');
  });

  it('treats a booking POST as a create, not a transition', () => {
    // /passengerbookings is a collection POST — the seat booking the portal will need.
    expect(classifyEffect('POST', '/api/TripLegs/{id}/passengerbookings')).toBe('create');
  });

  it('classifies an unknown method as unclassified, and unclassified as mutating', () => {
    expect(classifyEffect('TRACE', '/api/Trips')).toBe('unclassified');
    // "Don't know" must read as "don't call it" — never as safe.
    expect(isMutating('unclassified')).toBe(true);
  });
});

describe('every published operation is classified', () => {
  for (const { surface, file } of SURFACES) {
    it(`${surface}: no operation falls through to unclassified`, () => {
      const unknown = opsFrom(file)
        .filter(o => classifyEffect(o.method, o.path) === 'unclassified')
        .map(o => `${o.method} ${o.path}`);
      expect(unknown).toEqual([]);
    });
  }
});

describe('pull-only policy', () => {
  for (const { surface, file } of SURFACES) {
    it(`${surface}: allows every GET`, () => {
      for (const op of opsFrom(file).filter(o => o.method === 'GET')) {
        expect(() => assertMyairopsCallAllowed(surface, op.method, op.path)).not.toThrow();
      }
    });

    it(`${surface}: refuses every mutating operation`, () => {
      const mutating = opsFrom(file).filter(o => isMutating(classifyEffect(o.method, o.path)));
      expect(mutating.length).toBeGreaterThan(0);
      for (const op of mutating) {
        expect(() => assertMyairopsCallAllowed(surface, op.method, op.path)).toThrow(MyairopsWriteRefused);
      }
    });
  }

  it('refuses trip deletion even when the same surface is granted seat booking', () => {
    // The grant is surface AND effect. Enabling the portal's seat booking must not
    // quietly enable deleting trips on the same API.
    const policy: MyairopsPolicy = {
      grants: [{ surface: 'booking', effects: ['create'], justification: 'seat booking (test)' }],
    };
    expect(() =>
      assertMyairopsCallAllowed('booking', 'POST', '/api/TripLegs/{id}/passengerbookings', policy),
    ).not.toThrow();
    expect(() => assertMyairopsCallAllowed('booking', 'DELETE', '/api/Trips/{id}', policy)).toThrow(
      MyairopsWriteRefused,
    );
  });

  it('does not let a grant on one surface leak to another', () => {
    const policy: MyairopsPolicy = {
      grants: [{ surface: 'booking', effects: ['create'], justification: 'seat booking (test)' }],
    };
    expect(() => assertMyairopsCallAllowed('crm', 'POST', '/api/Contact', policy)).toThrow(
      MyairopsWriteRefused,
    );
  });

  it('names the offending operation and effect when it refuses', () => {
    try {
      assertMyairopsCallAllowed('booking', 'DELETE', '/api/Trips/{id}');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MyairopsWriteRefused);
      const e = err as MyairopsWriteRefused;
      expect(e.effect satisfies Effect).toBe('delete');
      expect(e.message).toContain('DELETE /api/Trips/{id}');
      expect(e.message).toContain('pull-only');
    }
  });

  it('ships with no write grants', () => {
    // The default posture is the working agreement's. A diff that adds a grant here
    // should be the thing a reviewer sees.
    expect(PULL_ONLY_POLICY.grants).toEqual([]);
  });
});
