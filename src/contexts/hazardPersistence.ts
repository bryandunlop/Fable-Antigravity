import type { Hazard } from './HazardContext';

// Pure load/repair logic for the 'aviation_hazards' localStorage store.
// Kept out of HazardContext.tsx so vitest (node env, *.test.ts only) can
// exercise it directly.

/** Keep the first occurrence of each id. The store is prepend-ordered
 * (newest entries are unshifted to the front), so first occurrence = newest
 * copy — the same convention buildSafetyModel uses. */
export function dedupeHazardsById(hazards: Hazard[]): Hazard[] {
    const seen = new Set<string>();
    return hazards.filter(h => {
        if (seen.has(h.id)) return false;
        seen.add(h.id);
        return true;
    });
}

const isHazardLike = (value: unknown): value is Hazard =>
    typeof value === 'object' && value !== null && typeof (value as Hazard).id === 'string';

/**
 * Parse the raw stored value, repair it (drop malformed entries and duplicate
 * ids — concurrent app instances sharing the origin can interleave their
 * load-merge-write cycles and duplicate an id), and merge in any seed hazards
 * missing from it. A stored copy always wins over the seed with the same id.
 *
 * `changed` is true when the result differs from what was stored, so the
 * caller knows to write the repaired list back.
 */
export function loadStoredHazards(
    raw: string | null,
    seeds: Hazard[]
): { hazards: Hazard[]; changed: boolean } {
    if (raw === null) return { hazards: dedupeHazardsById(seeds), changed: true };

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { hazards: seeds, changed: true };
    }
    if (!Array.isArray(parsed)) return { hazards: dedupeHazardsById(seeds), changed: true };

    const stored = dedupeHazardsById(parsed.filter(isHazardLike));
    const missingSeeds = seeds.filter(seed => !stored.some(h => h.id === seed.id));

    // The outer dedupe guards against duplicate ids inside `seeds` itself
    // (which shipped for a while: two seed hazards both claimed HZ-010) — the
    // result must be unique-by-id no matter what came in.
    return {
        hazards: dedupeHazardsById([...missingSeeds, ...stored]),
        changed: missingSeeds.length > 0 || stored.length !== parsed.length,
    };
}
