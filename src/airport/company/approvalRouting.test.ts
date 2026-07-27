import { describe, expect, it } from 'vitest';

import { requiredApprovals } from './approvalRouting';

describe('requiredApprovals', () => {
  it('routes an ops-notes-only change to the officer alone', () => {
    expect(requiredApprovals(['opsNotes'])).toEqual(['airport-evaluator']);
  });

  it.each([['fboPreference'], ['opsNotes']])(
    'treats %s as a standard field',
    (field) => {
      expect(requiredApprovals([field])).toEqual(['airport-evaluator']);
    },
  );

  it.each([['ppr'], ['curfew'], ['rampHandlingLimits'], ['referenceAnnotations']])(
    'requires the chief pilot for safety field %s',
    (field) => {
      expect(requiredApprovals([field])).toEqual(['airport-evaluator', 'chief-pilot']);
    },
  );

  it('routes a mixed proposal down the safety path', () => {
    // The gate is a property of the proposal's field set, not of the submitter's
    // intent — one safety field pulls the whole proposal onto the safety path.
    expect(requiredApprovals(['opsNotes', 'fboPreference', 'curfew'])).toEqual([
      'airport-evaluator',
      'chief-pilot',
    ]);
  });

  it('does not duplicate the chief pilot when several safety fields change', () => {
    expect(requiredApprovals(['ppr', 'curfew', 'rampHandlingLimits'])).toEqual([
      'airport-evaluator',
      'chief-pilot',
    ]);
  });

  it('requires the officer even when nothing was changed', () => {
    expect(requiredApprovals([])).toEqual(['airport-evaluator']);
  });

  it('treats an unrecognised field as a safety field', () => {
    // Fail closed. A field added later that nobody classified must not slip
    // through on the single-approval path by default.
    expect(requiredApprovals(['somethingAddedLater'])).toEqual([
      'airport-evaluator',
      'chief-pilot',
    ]);
  });
});
