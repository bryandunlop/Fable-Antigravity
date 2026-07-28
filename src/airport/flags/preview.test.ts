import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { previewMatches, type AirportFacts, type FlagRule } from './rules';

/**
 * The rule preview, against the real 2,128-airport bundle.
 *
 * A rule builder without a match count is how a rule set goes bad quietly: you
 * write "short runway" meaning a handful of tight fields, it flags fourteen
 * hundred, and crews learn to ignore flags. These assertions are on real FAA
 * data, so they also catch the facts file drifting out of shape.
 */

const facts: Record<string, AirportFacts> = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../public/airport-data/facts.json'), 'utf8'),
).facts;

function rule(group: FlagRule['group']): FlagRule {
  return {
    id: 'preview',
    label: 'preview',
    severity: 'caution',
    appliesTo: [],
    showOnPilotWorkspace: true,
    group,
  };
}

describe('previewMatches over the real bundle', () => {
  it('counts against every airport in the set', () => {
    const result = previewMatches(
      rule({ combine: 'AND', conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 6000 }] }),
      facts,
    );

    expect(result.total).toBeGreaterThan(2000);
  });

  it('narrows as the threshold tightens', () => {
    const under6000 = previewMatches(
      rule({ combine: 'AND', conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 6000 }] }),
      facts,
    ).matched.length;
    const under5500 = previewMatches(
      rule({ combine: 'AND', conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 5500 }] }),
      facts,
    ).matched.length;

    expect(under5500).toBeLessThan(under6000);
    expect(under6000).toBeGreaterThan(0);
  });

  it('flags no airport shorter than the 5,000 ft floor the bundle was cut at', () => {
    const impossible = previewMatches(
      rule({ combine: 'AND', conditions: [{ field: 'longestRunwayFt', operator: 'lt', value: 5000 }] }),
      facts,
    );

    expect(impossible.matched).toEqual([]);
  });

  it('finds the majority that publish no declared distances', () => {
    const unpublished = previewMatches(
      rule({ combine: 'AND', conditions: [{ field: 'hasDeclaredDistances', operator: 'isFalse' }] }),
      facts,
    );

    // Measured at 26.6% published, so most of the set should match. If this ever
    // inverts, something has started inventing distances.
    expect(unpublished.matched.length).toBeGreaterThan(unpublished.total / 2);
  });

  it('finds KTEB with an AND of two real conditions', () => {
    const result = previewMatches(
      rule({
        combine: 'AND',
        conditions: [
          { field: 'stateCode', operator: 'eq', value: 'NJ' },
          { field: 'towerTypeCode', operator: 'isNotEmpty' },
        ],
      }),
      facts,
    );

    expect(result.matched).toContain('TEB');
  });

  it('treats an unknown fact as unknown, not as zero', () => {
    // "shortest LDA under 20000 ft" is true of every airport that publishes an
    // LDA at all. If null were read as 0 it would match all 2,128.
    const withLda = previewMatches(
      rule({ combine: 'AND', conditions: [{ field: 'shortestLdaFt', operator: 'lt', value: 20000 }] }),
      facts,
    );

    expect(withLda.matched.length).toBeGreaterThan(0);
    expect(withLda.matched.length).toBeLessThan(withLda.total / 2);
  });

  it('publishing declared distances does not guarantee an LDA among them', () => {
    // 689 airports publish some declared distance; 682 publish an LDA. Seven
    // publish a take-off distance and no landing distance. A rule written on LDA
    // must not be assumed to cover everything hasDeclaredDistances covers.
    const withLda = previewMatches(
      rule({ combine: 'AND', conditions: [{ field: 'shortestLdaFt', operator: 'isNotEmpty' }] }),
      facts,
    ).matched.length;
    const anyPublished = previewMatches(
      rule({ combine: 'AND', conditions: [{ field: 'hasDeclaredDistances', operator: 'isTrue' }] }),
      facts,
    ).matched.length;

    expect(withLda).toBeLessThan(anyPublished);
    expect(withLda).toBeGreaterThan(anyPublished * 0.9);
  });
});
