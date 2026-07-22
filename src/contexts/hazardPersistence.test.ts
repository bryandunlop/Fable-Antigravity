import { describe, it, expect } from 'vitest';
import { dedupeHazardsById, loadStoredHazards } from './hazardPersistence';
import type { Hazard } from './HazardContext';

const hz = (id: string, over: Partial<Hazard> = {}): Hazard => ({
    id,
    title: `Hazard ${id}`,
    severity: 'Low',
    workflowStage: 'Published',
    location: 'TEB',
    reportedBy: 'Test User',
    reportedDate: '2026-07-21',
    description: 'desc',
    immediateActions: 'none',
    potentialConsequences: 'none',
    ...over,
});

describe('dedupeHazardsById', () => {
    it('keeps the first occurrence of a duplicated id (store is prepend-ordered, first = newest)', () => {
        const first = hz('HZ-010', { title: 'kept' });
        const second = hz('HZ-010', { title: 'dropped' });
        const result = dedupeHazardsById([first, hz('HZ-001'), second]);
        expect(result.map(h => h.id)).toEqual(['HZ-010', 'HZ-001']);
        expect(result[0].title).toBe('kept');
    });

    it('is a no-op on an already-unique list', () => {
        const list = [hz('HZ-001'), hz('HZ-002')];
        expect(dedupeHazardsById(list)).toEqual(list);
    });
});

describe('loadStoredHazards', () => {
    const seeds = [hz('HZ-001'), hz('HZ-002')];

    it('returns the seeds when nothing is stored', () => {
        const { hazards, changed } = loadStoredHazards(null, seeds);
        expect(hazards).toEqual(seeds);
        expect(changed).toBe(true);
    });

    it('falls back to the seeds on unparseable JSON', () => {
        const { hazards, changed } = loadStoredHazards('{not json', seeds);
        expect(hazards).toEqual(seeds);
        expect(changed).toBe(true);
    });

    it('falls back to the seeds when the stored value is not an array', () => {
        const { hazards, changed } = loadStoredHazards('{"id":"HZ-001"}', seeds);
        expect(hazards).toEqual(seeds);
        expect(changed).toBe(true);
    });

    it('repairs the observed corruption: a duplicated id in the stored array', () => {
        // Live 2026-07-21: 12 rows stored, HZ-010 present twice after two app
        // instances interleaved their load-merge-write cycles.
        const stored = [hz('HZ-010'), hz('HZ-001'), hz('HZ-002'), hz('HZ-010', { title: 'older copy' })];
        const { hazards, changed } = loadStoredHazards(JSON.stringify(stored), seeds);
        expect(hazards.map(h => h.id)).toEqual(['HZ-010', 'HZ-001', 'HZ-002']);
        expect(changed).toBe(true);
    });

    it('prepends seeds missing from the stored list', () => {
        const stored = [hz('HZ-002')];
        const { hazards, changed } = loadStoredHazards(JSON.stringify(stored), seeds);
        expect(hazards.map(h => h.id)).toEqual(['HZ-001', 'HZ-002']);
        expect(changed).toBe(true);
    });

    it('lets a stored copy win over the seed with the same id', () => {
        const stored = [hz('HZ-001', { title: 'edited by user' }), hz('HZ-002')];
        const { hazards } = loadStoredHazards(JSON.stringify(stored), seeds);
        expect(hazards.find(h => h.id === 'HZ-001')?.title).toBe('edited by user');
    });

    it('reports no change for a complete, duplicate-free store', () => {
        const stored = [hz('HZ-003'), hz('HZ-001'), hz('HZ-002')];
        const { hazards, changed } = loadStoredHazards(JSON.stringify(stored), seeds);
        expect(hazards).toEqual(stored);
        expect(changed).toBe(false);
    });

    it('returns unique ids even when the seeds themselves contain a duplicate (fresh store)', () => {
        // Shipped for a while: two different seed hazards both claimed HZ-010.
        const dupSeeds = [hz('HZ-010', { title: 'first wins' }), hz('HZ-001'), hz('HZ-010', { title: 'second' })];
        const { hazards } = loadStoredHazards(null, dupSeeds);
        expect(hazards.map(h => h.id)).toEqual(['HZ-010', 'HZ-001']);
        expect(hazards[0].title).toBe('first wins');
    });

    it('returns unique ids when duplicated seeds are both missing from the store', () => {
        const dupSeeds = [hz('HZ-010', { title: 'first wins' }), hz('HZ-001'), hz('HZ-010', { title: 'second' })];
        const stored = [hz('HZ-001')];
        const { hazards } = loadStoredHazards(JSON.stringify(stored), dupSeeds);
        expect(hazards.map(h => h.id)).toEqual(['HZ-010', 'HZ-001']);
    });

    it('drops entries without a string id', () => {
        const stored = [hz('HZ-001'), { junk: true }, null, 42, hz('HZ-002')];
        const { hazards, changed } = loadStoredHazards(JSON.stringify(stored), seeds);
        expect(hazards.map(h => h.id)).toEqual(['HZ-001', 'HZ-002']);
        expect(changed).toBe(true);
    });
});
