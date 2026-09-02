import { describe, expect, it } from 'vitest';
import { createDraft, newLeg, submitItinerary, assignTail, setCrew, setPassengers, setCatering, type Actor } from './trip';
import { buildSheet } from './tripSheet';
import { SEED_PLACES } from './places';
import { DEFAULT_TEMPLATE, recipientsFor, renderEmail, draftEmail, sendEmail, autoSendIfDue, emailState, editDraftBlock } from './briefingEmail';
import { SEED_PEOPLE, personByName, upsertPerson, type Person } from './people';

const EA: Actor = { name: 'Dana Whitfield', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const T = '2026-10-11T13:20:00.000Z';
const CTX = { places: SEED_PLACES, blurbs: { 'Capt. John Smith': 'Twenty years on Gulfstreams.' } };

function trip() {
  let t = createDraft({ title: 'Seattle plant visit', leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 3, by: EA, nowUtc: '2026-09-01T00:00:00.000Z',
    legs: [
      newLeg({ from: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, to: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' }, date: '2026-10-14', timing: { kind: 'depart', departLocal: '09:20', flexHours: 0 } }),
      newLeg({ from: { placeName: 'Seattle', placeId: 'pl-sea', airport: 'KBFI' }, to: { placeName: 'Cincinnati', placeId: 'pl-cvg', airport: 'KLUK' }, date: '2026-10-16', timing: { kind: 'depart', departLocal: '16:00', flexHours: 0 } }),
    ] });
  t = submitItinerary(t, EA, '2026-09-02T00:00:00.000Z');
  t = assignTail(t, 'N5PG', SCHED, '2026-09-03T00:00:00.000Z');
  t = setCrew(t, { pic: 'Capt. John Smith', sic: 'FO Emily Chen', fa: 'Lena Nguyen' }, SCHED, '2026-09-03T00:00:00.000Z');
  t = setPassengers(t, ['A. Reyes', 'S. Reyes', 'K. Tanaka'], EA, '2026-09-04T00:00:00.000Z');
  t = setCatering(t, t.legs[0].id, 'Light breakfast, no shellfish', EA, '2026-09-05T00:00:00.000Z');
  return t;
}
// The preferences the old `passengerPrefs` setting carried now live on the person record; the
// seed already holds exactly these three (never / every / first-and-has-flown).
const PEOPLE: Person[] = SEED_PEOPLE;
const NOBODY: Person[] = [];
const WX = { KBFI: { number: 1, name: 'Wednesday', startTime: T, tempC: 14, windKt: 8, windDirection: 'NW', shortForecast: 'Mostly Cloudy', detailedForecast: '', precipProbability: 20, icon: '' } };

describe('who gets it', () => {
  it('honours every / first-trip-only / never; unknown people are sent to', () => {
    const sheet = buildSheet(trip(), CTX, T, SCHED);
    expect(recipientsFor(sheet, PEOPLE)).toEqual(['S. Reyes']);
    expect(recipientsFor(sheet, NOBODY)).toEqual(['A. Reyes', 'S. Reyes', 'K. Tanaka']);
  });

  it('follows a person renamed AFTER the sheet froze, via the ids frozen beside the names', () => {
    // The trip resolves its passengers to ids, so the frozen sheet carries both.
    const withIds = { ...trip(), passengerIds: ['P-REYES', 'P-SREYES', 'P-TANAKA'] };
    const sheet = buildSheet(withIds, CTX, T, SCHED);
    expect(sheet.legs[0].aboardIds).toEqual(['P-REYES', 'P-SREYES', 'P-TANAKA']);
    expect(recipientsFor(sheet, PEOPLE)).toEqual(['S. Reyes']);

    // Now actually rename them. The sheet still says "S. Reyes"; the record says "Sam Reyes".
    // A name lookup would miss and fall through to the send-anyway default; the id must not.
    const s = personByName(PEOPLE, 'S. Reyes')!;
    const renamed = upsertPerson(PEOPLE, { ...s, name: 'Sam Reyes', briefingPref: 'never' });
    expect(personByName(renamed, 'S. Reyes')).toBeUndefined();
    expect(recipientsFor(sheet, renamed)).toEqual([]);
  });
});

describe('the email reads the frozen sheet', () => {
  it('when/where, weather, crew and catering are auto blocks; aboard and safety are template words', () => {
    const e = renderEmail(buildSheet(trip(), CTX, T, SCHED), 'S. Reyes', DEFAULT_TEMPLATE, WX);
    expect(e.subject).toBe('Your trip to Seattle, Wednesday, October 14');
    const ids = e.blocks.map(b => b.id);
    expect(ids).toEqual(['when', 'weather', 'aboard', 'safety', 'crew', 'catering']);
    expect(e.blocks.find(b => b.id === 'when')!.text).toContain('30 minutes before 09:20 EDT');
    expect(e.blocks.find(b => b.id === 'weather')!.text).toContain('mostly cloudy, around 14°C');
    expect(e.blocks.find(b => b.id === 'crew')!.text).toContain('Captain Capt. John Smith — Twenty years on Gulfstreams.');
    expect(e.blocks.find(b => b.id === 'catering')!.text).toBe('Leg 1: Light breakfast, no shellfish.');
    expect(e.blocks.find(b => b.id === 'safety')!.source).toBe('template');
  });
  it('a disabled block is left out; no weather means no weather block, not an empty one', () => {
    const tpl = { ...DEFAULT_TEMPLATE, blocks: DEFAULT_TEMPLATE.blocks.map(b => (b.id === 'aboard' ? { ...b, enabled: false } : b)) };
    const e = renderEmail(buildSheet(trip(), CTX, T, SCHED), 'S. Reyes', tpl, {});
    expect(e.blocks.map(b => b.id)).toEqual(['when', 'safety', 'crew', 'catering']);
  });
});

describe('drafted at freeze, sent by scheduling, or by the dead-man switch', () => {
  it('drafts with the recipients and a 12 h timer; scheduling sends; the EA cannot', () => {
    let t = draftEmail(trip(), buildSheet(trip(), CTX, T, SCHED), DEFAULT_TEMPLATE, PEOPLE, WX, SCHED, T);
    expect(emailState(t, T)).toEqual({ state: 'drafted', hoursLeft: 12 });
    expect(t.events.at(-1)).toMatchObject({ kind: 'email-drafted', recipients: ['S. Reyes'] });
    expect(sendEmail(t, EA, T)).toBe(t);
    t = sendEmail(t, SCHED, '2026-10-11T15:00:00.000Z');
    expect(emailState(t, '2026-10-11T16:00:00.000Z')).toMatchObject({ state: 'sent', auto: false });
    expect(t.events.at(-1)).toMatchObject({ kind: 'email-sent', auto: false, recipients: ['S. Reyes'] });
    // a second send is a no-op
    expect(sendEmail(t, SCHED, '2026-10-11T17:00:00.000Z')).toBe(t);
  });
  it('the dead-man switch fires at the timer and says unreviewed; not a minute before', () => {
    const t = draftEmail(trip(), buildSheet(trip(), CTX, T, SCHED), DEFAULT_TEMPLATE, PEOPLE, WX, SCHED, T);
    expect(autoSendIfDue(t, '2026-10-12T01:19:00.000Z')).toBe(t);
    const fired = autoSendIfDue(t, '2026-10-12T01:20:00.000Z');
    expect(emailState(fired, '2026-10-12T02:00:00.000Z')).toMatchObject({ state: 'sent', auto: true });
    expect(fired.events.at(-1)).toMatchObject({ kind: 'email-sent', auto: true, by: { role: 'system' } });
  });
  it('scheduling can edit a block for one recipient before sending; a sent draft is immutable', () => {
    let t = draftEmail(trip(), buildSheet(trip(), CTX, T, SCHED), DEFAULT_TEMPLATE, PEOPLE, WX, SCHED, T);
    t = editDraftBlock(t, 'S. Reyes', 'safety', 'Watch the step at the cabin door.');
    expect((t.emailDraft as { emails: { blocks: { id: string; text: string }[] }[] }).emails[0].blocks.find(b => b.id === 'safety')!.text).toBe('Watch the step at the cabin door.');
    const sent = sendEmail(t, SCHED, T);
    expect(editDraftBlock(sent, 'S. Reyes', 'safety', 'changed')).toBe(sent);
  });
});
