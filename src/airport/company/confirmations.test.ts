import { describe, expect, it } from 'vitest';

import {
  CONFIRMABLE_FIELDS,
  DEFAULT_CADENCE_DAYS,
  confirmationStates,
  fieldConfirmationState,
  lastConfirmedAt,
  pageConfirmationSummary,
  versionThatLastChanged,
  type FieldConfirmation,
} from './confirmations';
import {
  emptyPageContent,
  InMemoryCompanyAirportPageStore,
  type CompanyAirportPageContent,
  type CompanyAirportPageVersion,
  type StoreClock,
} from './pageStore';

const EMPTY: CompanyAirportPageContent = emptyPageContent();

/** A clock the test drives, so nothing depends on wall time. */
function ctx(start = '2026-01-01T12:00:00.000Z') {
  let at = start;
  let seq = 0;
  const clock: StoreClock = {
    now: () => at,
    nextId: () => `id-${++seq}`,
  };
  const store = new InMemoryCompanyAirportPageStore(clock);
  return {
    store,
    set: (iso: string) => {
      at = iso;
    },
    publish: (content: Partial<CompanyAirportPageContent>, publishedBy = 'officer-1') => {
      const current = store.getLatest('KTEB');
      return store.publish({
        icao: 'KTEB',
        content: { ...(current?.content ?? EMPTY), ...content },
        publishedBy,
        basedOnVersion: current?.version,
      });
    },
  };
}

function confirmation(
  field: FieldConfirmation['field'],
  confirmedAtUtc: string,
  versionIdSeen: string,
  extra: Partial<FieldConfirmation> = {},
): FieldConfirmation {
  return {
    id: `c-${field}-${confirmedAtUtc}`,
    icao: 'KTEB',
    field,
    confirmedBy: 'crew-1',
    confirmedAtUtc,
    source: 'crew',
    versionIdSeen,
    ...extra,
  };
}

describe('per-field confirmation (D54)', () => {
  describe('versionThatLastChanged', () => {
    it('is the version that introduced the value, not the newest version', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      t.set('2026-03-01T12:00:00.000Z');
      t.publish({ opsNotes: 'Watch the taxiway' });

      const versions = t.store.snapshot().versions;
      expect(versionThatLastChanged(versions, 'ppr')?.id).toBe(v1.id);
    });

    it('follows a field when its value is edited', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      t.set('2026-03-01T12:00:00.000Z');
      const v2 = t.publish({ ppr: 'PPR 48h' });

      const versions = t.store.snapshot().versions;
      expect(versionThatLastChanged(versions, 'ppr')?.id).toBe(v2.id);
    });

    it('is null for a field that never carried a value', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;
      expect(versionThatLastChanged(versions, 'curfew')).toBeNull();
    });

    it('treats clearing a value as a change, so a cleared field is not stale forever', () => {
      const t = ctx();
      t.publish({ opsNotes: 'Old note' });
      t.set('2026-03-01T12:00:00.000Z');
      const v2 = t.publish({ opsNotes: null });

      const versions = t.store.snapshot().versions;
      expect(versionThatLastChanged(versions, 'opsNotes')?.id).toBe(v2.id);
    });
  });

  describe('lastConfirmedAt — publishing a value is itself a confirmation', () => {
    it('falls back to the publish time when nobody has confirmed since', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;

      expect(lastConfirmedAt(versions, [], 'ppr')).toEqual({
        atUtc: v1.publishedAtUtc,
        by: 'officer-1',
        via: 'publish',
      });
    });

    it('prefers a later explicit confirmation over the publish time', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;
      const confirmations = [confirmation('ppr', '2026-04-01T09:00:00.000Z', v1.id)];

      expect(lastConfirmedAt(versions, confirmations, 'ppr')).toEqual({
        atUtc: '2026-04-01T09:00:00.000Z',
        by: 'crew-1',
        via: 'crew',
      });
    });

    it('ignores a confirmation of a value that has since been edited', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const confirmations = [confirmation('ppr', '2026-02-01T09:00:00.000Z', v1.id)];

      // The PPR is edited after the crew confirmed the old wording. Their
      // confirmation attests the old value and must not vouch for the new one.
      t.set('2026-03-01T12:00:00.000Z');
      const v2 = t.publish({ ppr: 'PPR 48h' });
      const versions = t.store.snapshot().versions;

      expect(lastConfirmedAt(versions, confirmations, 'ppr')).toEqual({
        atUtc: v2.publishedAtUtc,
        by: 'officer-1',
        via: 'publish',
      });
    });

    it('keeps a confirmation alive when a DIFFERENT field was edited', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const confirmations = [confirmation('ppr', '2026-02-01T09:00:00.000Z', v1.id)];

      t.set('2026-03-01T12:00:00.000Z');
      t.publish({ opsNotes: 'Unrelated' });
      const versions = t.store.snapshot().versions;

      // This is the whole point of per-field rather than per-page (D54).
      expect(lastConfirmedAt(versions, confirmations, 'ppr')?.via).toBe('crew');
    });

    it('is null for a field with no value', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;
      expect(lastConfirmedAt(versions, [], 'curfew')).toBeNull();
    });

    it('lets a confirmation stamped at the publish instant still count', () => {
      // Not hypothetical: any path that publishes and confirms without an
      // intervening tick — a seed, a batch import, a fast double-click — lands
      // both on the same millisecond, and a strict comparison threw the
      // confirmation away.
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const confirmations = [confirmation('ppr', v1.publishedAtUtc, v1.id)];

      expect(lastConfirmedAt(t.store.snapshot().versions, confirmations, 'ppr')?.via).toBe('crew');
    });

    it('takes the newest of several confirmations', () => {
      const t = ctx();
      const v1 = t.publish({ opsNotes: 'Note' });
      const versions = t.store.snapshot().versions;
      const confirmations = [
        confirmation('opsNotes', '2026-05-01T09:00:00.000Z', v1.id, { confirmedBy: 'later' }),
        confirmation('opsNotes', '2026-03-01T09:00:00.000Z', v1.id, { confirmedBy: 'earlier' }),
      ];

      expect(lastConfirmedAt(versions, confirmations, 'opsNotes')?.by).toBe('later');
    });
  });

  describe('fieldConfirmationState', () => {
    it('is not-applicable for a field with no value', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      const state = fieldConfirmationState(
        t.store.snapshot().versions,
        [],
        'curfew',
        '2026-06-01',
      );
      expect(state.status).toBe('not-applicable');
      expect(state.dueDateIso).toBeNull();
    });

    it('is ok well inside the cadence', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      const state = fieldConfirmationState(
        t.store.snapshot().versions,
        [],
        'ppr',
        '2026-02-01',
      );
      expect(state.status).toBe('ok');
      // ppr cadence is 180 days from the 2026-01-01 publish.
      expect(state.dueDateIso).toBe('2026-06-30');
    });

    it('is due-soon inside the 30-day warning window', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;

      expect(fieldConfirmationState(versions, [], 'ppr', '2026-06-01').status).toBe('due-soon');
    });

    it('is overdue on the due date itself, not the day after', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;

      expect(fieldConfirmationState(versions, [], 'ppr', '2026-06-29').status).toBe('due-soon');
      expect(fieldConfirmationState(versions, [], 'ppr', '2026-06-30').status).toBe('overdue');
    });

    it('uses a per-field cadence — an FBO contact ages faster than a curfew', () => {
      const t = ctx();
      t.publish({ fboPreference: 'Signature', curfew: '2300-0600 local' });
      const versions = t.store.snapshot().versions;

      // 120 days after publication: the FBO (90d) is overdue, the curfew (365d) is fine.
      expect(fieldConfirmationState(versions, [], 'fboPreference', '2026-05-01').status).toBe(
        'overdue',
      );
      expect(fieldConfirmationState(versions, [], 'curfew', '2026-05-01').status).toBe('ok');
      expect(DEFAULT_CADENCE_DAYS.fboPreference).toBeLessThan(DEFAULT_CADENCE_DAYS.curfew);
    });

    it('honours a cadence override', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;

      expect(
        fieldConfirmationState(versions, [], 'ppr', '2026-02-01', { ppr: 7 }).status,
      ).toBe('overdue');
    });

    it('resets the clock when a field is confirmed', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;
      const confirmations = [confirmation('ppr', '2026-06-20T09:00:00.000Z', v1.id)];

      expect(fieldConfirmationState(versions, [], 'ppr', '2026-07-01').status).toBe('overdue');
      expect(fieldConfirmationState(versions, confirmations, 'ppr', '2026-07-01').status).toBe(
        'ok',
      );
    });

    it('compares in the operator zone, not UTC', () => {
      const t = ctx();
      // 00:30Z on 2 Jan is still 1 Jan (19:30) in the operator zone. Counting the
      // confirmation as a day later would flip due dates early — the bug
      // src/lib/operatorDate.ts exists to prevent.
      t.set('2026-01-02T00:30:00.000Z');
      t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;

      expect(fieldConfirmationState(versions, [], 'ppr', '2026-06-30').dueDateIso).toBe(
        '2026-06-30',
      );
    });
  });

  describe('pageConfirmationSummary', () => {
    it('reports no-page when nothing was ever published', () => {
      const summary = pageConfirmationSummary([], [], '2026-06-01');
      expect(summary.status).toBe('no-page');
      expect(summary.neverConfirmed).toBe(true);
    });

    it('takes the worst field status', () => {
      const t = ctx();
      t.publish({ fboPreference: 'Signature', curfew: '2300-0600 local' });
      const versions = t.store.snapshot().versions;

      // FBO overdue at 120 days, curfew still ok.
      expect(pageConfirmationSummary(versions, [], '2026-05-01').status).toBe('overdue');
    });

    it('ignores fields with no value when scoring the page', () => {
      const t = ctx();
      t.publish({ curfew: '2300-0600 local' });
      const versions = t.store.snapshot().versions;

      // Only the curfew is present, and at 120 days it is inside its 365-day cadence.
      expect(pageConfirmationSummary(versions, [], '2026-05-01').status).toBe('ok');
    });

    it('flags never-confirmed until a human confirms something', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;

      expect(pageConfirmationSummary(versions, [], '2026-02-01').neverConfirmed).toBe(true);

      const confirmations = [confirmation('ppr', '2026-01-15T09:00:00.000Z', v1.id)];
      expect(pageConfirmationSummary(versions, confirmations, '2026-02-01').neverConfirmed).toBe(
        false,
      );
    });

    it('goes back to never-confirmed when the only confirmed field is cleared', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const confirmations = [confirmation('ppr', '2026-01-15T09:00:00.000Z', v1.id)];
      expect(
        pageConfirmationSummary(t.store.snapshot().versions, confirmations, '2026-02-01')
          .neverConfirmed,
      ).toBe(false);

      // The PPR is dropped and a fresh curfew authored. Nothing on the page as
      // it now stands has ever been checked by a human — reading confirmation
      // HISTORY would wrongly report this page as reviewed and drop it off the
      // officer's board entirely.
      t.set('2026-03-01T12:00:00.000Z');
      t.publish({ ppr: null, curfew: '2300-0600 local' });

      expect(
        pageConfirmationSummary(t.store.snapshot().versions, confirmations, '2026-04-01')
          .neverConfirmed,
      ).toBe(true);
    });

    it('goes back to never-confirmed when the confirmed field is edited', () => {
      const t = ctx();
      const v1 = t.publish({ ppr: 'PPR 24h' });
      const confirmations = [confirmation('ppr', '2026-01-15T09:00:00.000Z', v1.id)];

      t.set('2026-03-01T12:00:00.000Z');
      t.publish({ ppr: 'PPR 48h' });

      // Their confirmation attests the old wording; nobody has checked the new one.
      expect(
        pageConfirmationSummary(t.store.snapshot().versions, confirmations, '2026-04-01')
          .neverConfirmed,
      ).toBe(true);
    });

    it('reports the oldest confirmed field as the page-level date', () => {
      const t = ctx();
      t.publish({ curfew: '2300-0600 local' });
      t.set('2026-04-01T12:00:00.000Z');
      t.publish({ ppr: 'PPR 24h' });
      const versions = t.store.snapshot().versions;

      const summary = pageConfirmationSummary(versions, [], '2026-05-01');
      // The curfew, published in January, governs — not the newer PPR.
      expect(summary.oldestConfirmedAtUtc).toBe('2026-01-01T12:00:00.000Z');
    });

    it('counts the fields that need attention', () => {
      const t = ctx();
      t.publish({ fboPreference: 'Signature', ppr: 'PPR 24h', curfew: '2300-0600' });
      const versions = t.store.snapshot().versions;

      const summary = pageConfirmationSummary(versions, [], '2026-07-01');
      // fbo (90d) and ppr (180d) are past due at ~181 days; curfew (365d) is not.
      expect(summary.overdueFields).toEqual(expect.arrayContaining(['fboPreference', 'ppr']));
      expect(summary.overdueFields).not.toContain('curfew');
    });
  });

  describe('confirmationStates', () => {
    it('returns one state per confirmable field, in a stable order', () => {
      const t = ctx();
      t.publish({ ppr: 'PPR 24h' });
      const states = confirmationStates(t.store.snapshot().versions, [], '2026-02-01');

      expect(states.map((s) => s.field)).toEqual([...CONFIRMABLE_FIELDS]);
    });
  });
});
