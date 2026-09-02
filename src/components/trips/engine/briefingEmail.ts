// The passenger email — drafted at freeze, sent by scheduling, with a dead-man switch (D106, Q27).
//
// Bryan, 2026-09-01: weather pulled automatically, crew safety points, who the crew is, possibly a
// safety video, a catering summary if loaded — "as editable as possible from the users at the
// end", and "show a demo version even though we can't send them out." So: the TEMPLATE is a
// setting (scheduling edits the words once); the DRAFT is per trip and per recipient, rendered
// from the frozen sheet, and its blocks can be edited before sending. Sending here records the
// event and the recipients on the trip; no mail leaves the demo.
//
// The dead-man switch: if nobody sends within `deadManHours` of the draft, it goes anyway and the
// record says so, loudly. The interval and the notification are Q27; 12 h is the demo default.
//
// Pure.

import type { ForecastPeriod } from '../../../services/nwsForecastService';
import type { FrozenSheet } from './tripSheet';
import type { Actor, Trip } from './trip';
import { personById, personByName, type Person } from './people';

export type BriefingPref = 'every' | 'first' | 'never';

/**
 * LEGACY. The briefing preference now lives on the person record (`engine/people.ts`), because a
 * preference keyed by display name silently detaches the moment anyone is renamed. This shape
 * survives only so `data/peopleStore.migrateSettingsOntoPeople` can read the old settings once.
 */
export interface PassengerPref {
  name: string;
  pref: BriefingPref;
  hasFlown: boolean;
}

export type BlockId = 'when' | 'weather' | 'aboard' | 'safety' | 'crew' | 'catering';

export interface TemplateBlock {
  id: BlockId;
  title: string;
  enabled: boolean;
  /** Free text for the editable blocks. Auto blocks ignore it and render from the sheet. */
  body: string;
  /** Optional link, used by the safety block for the video. */
  link?: string;
}

export interface EmailTemplate {
  subject: string;
  blocks: TemplateBlock[];
  deadManHours: number;
}

export const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: 'Your trip to {{destination}}, {{date}}',
  deadManHours: 12,
  blocks: [
    { id: 'when', title: 'When and where', enabled: true, body: '' },
    { id: 'weather', title: 'Weather where you are going', enabled: true, body: '' },
    { id: 'aboard', title: 'Aboard the aircraft', enabled: true, body: 'The crew load your bags at the aircraft; tell your assistant about anything oversize. No spare lithium batteries in a bag that goes in the hold. Wi-Fi is available in flight.' },
    { id: 'safety', title: 'Safety', enabled: true, body: 'Please keep your seat belt fastened whenever you are seated. The crew will brief the exits and equipment before departure.', link: '' },
    { id: 'crew', title: 'Your crew', enabled: true, body: '' },
    { id: 'catering', title: 'Catering', enabled: true, body: '' },
  ],
};

export interface RenderedBlock { id: BlockId; title: string; text: string; link?: string; source: 'auto' | 'template' }

export interface RenderedEmail {
  to: string;
  subject: string;
  blocks: RenderedBlock[];
}

export interface WeatherByIcao { [icao: string]: ForecastPeriod | undefined }

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/**
 * Passengers who should get this trip's email, per their own record's preference. Lead included.
 *
 * WHO is aboard comes from the FROZEN SHEET, never from the live trip — the sheet is the record of
 * who was on the trip when it froze, and re-deriving that at send time would let a later edit
 * change who a frozen briefing was addressed to. Only the PREFERENCE is read live: whether someone
 * wants the email is a standing choice they may change up to the moment it goes.
 */
export function recipientsFor(sheet: FrozenSheet, people: Person[]): string[] {
  const names = Array.from(new Set(sheet.legs.flatMap(l => l.aboard)));
  return names.filter(n => {
    const p = personAboard(sheet, people, n);
    if (!p) return true; // unknown person: send — missing a first-timer is the worse failure
    if (p.briefingPref === 'never') return false;
    if (p.briefingPref === 'first') return !p.hasFlown;
    return true;
  });
}

/**
 * The record behind a name frozen on the sheet.
 *
 * By ID first, using the ids frozen beside the names, so a rename between freeze and send still
 * resolves. The name lookup is only the fallback for sheets frozen before ids existed — and it is
 * the path that quietly fails after a rename, which is exactly why the ids are frozen.
 */
export function personAboard(sheet: FrozenSheet, people: Person[], name: string): Person | undefined {
  for (const leg of sheet.legs) {
    const i = leg.aboard.indexOf(name);
    const id = i >= 0 ? leg.aboardIds?.[i] : undefined;
    if (id) return personById(people, id);
  }
  return personByName(people, name);
}

/** The address the briefing would go to, for the preview header. Null when we hold none. */
export function emailAddressFor(sheet: FrozenSheet, people: Person[], name: string): string | null {
  return personAboard(sheet, people, name)?.email ?? null;
}

export function renderEmail(sheet: FrozenSheet, to: string, template: EmailTemplate, weather: WeatherByIcao): RenderedEmail {
  const first = sheet.legs[0];
  const destination = first?.to.place || first?.to.label.split(' · ')[0] || 'your destination';
  const subject = template.subject.replace('{{destination}}', destination).replace('{{date}}', first ? longDate(first.date + 'T00:00:00Z') : '');

  const blocks: RenderedBlock[] = [];
  for (const b of template.blocks) {
    if (!b.enabled) continue;
    switch (b.id) {
      case 'when': {
        if (!first) break;
        const lines = sheet.legs.filter(l => l.aboard.includes(to)).map(l => {
          const be = l.from.wall ? `Please be at ${l.from.label} 30 minutes before ${l.from.wall}.` : `Please be at ${l.from.label} 30 minutes before departure.`;
          const arr = l.to.wall ? ` You arrive ${l.to.label} at ${l.to.wall}${l.dayShift ? ' the next day' : ''}.` : '';
          return `Leg ${l.n}, ${longDate(l.date + 'T00:00:00Z')}: ${be}${arr}${l.planned ? ' Times are planning times until scheduling confirms them.' : ''}`;
        });
        blocks.push({ id: b.id, title: b.title, text: lines.join(' '), source: 'auto' });
        break;
      }
      case 'weather': {
        const parts = sheet.legs.map(l => {
          const w = l.to.icao ? weather[l.to.icao] : undefined;
          if (!w) return null;
          const temp = w.tempC === null ? '' : `, around ${Math.round(w.tempC)}°C`;
          return `${l.to.place || l.to.label.split(' · ')[0]}: ${w.shortForecast.toLowerCase()}${temp}${w.precipProbability ? `, ${w.precipProbability}% chance of precipitation` : ''}.`;
        }).filter((x): x is string => !!x);
        if (parts.length) blocks.push({ id: b.id, title: b.title, text: parts.join(' '), source: 'auto' });
        break;
      }
      case 'crew': {
        if (!sheet.crew.length) break;
        const who = sheet.crew.map(c => `${c.role === 'PIC' ? 'Captain' : c.role === 'SIC' ? 'First Officer' : 'Flight attendant'} ${c.name}${c.blurb ? ` — ${c.blurb}` : ''}`);
        blocks.push({ id: b.id, title: b.title, text: who.join(' '), source: 'auto' });
        break;
      }
      case 'catering': {
        const c = sheet.legs.filter(l => l.catering).map(l => `Leg ${l.n}: ${l.catering}`);
        if (c.length) blocks.push({ id: b.id, title: b.title, text: c.join('. ') + '.', source: 'auto' });
        break;
      }
      default:
        if (b.body.trim()) blocks.push({ id: b.id, title: b.title, text: b.body, link: b.link || undefined, source: 'template' });
    }
  }
  return { to, subject, blocks };
}

export interface EmailDraft {
  sheetVersion: number;
  draftedAtUtc: string;
  autoSendAtUtc: string;
  recipients: string[];
  /** Per-recipient rendered emails; blocks editable before send. */
  emails: RenderedEmail[];
  sentAtUtc: string | null;
  sentBy: string | null;
  auto: boolean;
}

export const emailDraftOf = (trip: Trip): EmailDraft | null => (trip.emailDraft as EmailDraft | null) ?? null;

/** Made at freeze. A newer sheet replaces an UNSENT draft; a sent one stays as the record. */
export function draftEmail(trip: Trip, sheet: FrozenSheet, template: EmailTemplate, people: Person[], weather: WeatherByIcao, by: Actor, nowUtc: string): Trip {
  const existing = emailDraftOf(trip);
  if (existing?.sentAtUtc) return trip;
  const recipients = recipientsFor(sheet, people);
  const draft: EmailDraft = {
    sheetVersion: sheet.version,
    draftedAtUtc: nowUtc,
    autoSendAtUtc: new Date(Date.parse(nowUtc) + template.deadManHours * 3_600_000).toISOString(),
    recipients,
    emails: recipients.map(r => renderEmail(sheet, r, template, weather)),
    sentAtUtc: null,
    sentBy: null,
    auto: false,
  };
  const events = [...trip.events, { id: `ev-${Date.now().toString(36)}-${trip.events.length}`, kind: 'email-drafted' as const, at: nowUtc, by, version: sheet.version, recipients }];
  return { ...trip, emailDraft: draft, events };
}

/** Scheduling edits a block's words for this trip only. */
export function editDraftBlock(trip: Trip, to: string, blockId: BlockId, text: string): Trip {
  const d = emailDraftOf(trip);
  if (!d || d.sentAtUtc) return trip;
  const emails = d.emails.map(e => (e.to === to ? { ...e, blocks: e.blocks.map(b => (b.id === blockId ? { ...b, text } : b)) } : e));
  return { ...trip, emailDraft: { ...d, emails } };
}

export function setDraftRecipients(trip: Trip, recipients: string[]): Trip {
  const d = emailDraftOf(trip);
  if (!d || d.sentAtUtc) return trip;
  return { ...trip, emailDraft: { ...d, recipients, emails: d.emails.filter(e => recipients.includes(e.to)) } };
}

/** Scheduling presses send. Demo: the record is the send. */
export function sendEmail(trip: Trip, by: Actor, nowUtc: string): Trip {
  const d = emailDraftOf(trip);
  if (!d || d.sentAtUtc || by.role !== 'scheduling' || d.recipients.length === 0) return trip;
  const events = [...trip.events, { id: `ev-${Date.now().toString(36)}-${trip.events.length}`, kind: 'email-sent' as const, at: nowUtc, by, recipients: d.recipients, auto: false }];
  return { ...trip, emailDraft: { ...d, sentAtUtc: nowUtc, sentBy: by.name, auto: false }, events };
}

/** The dead-man switch. Fires once the timer has passed and nobody sent it; the record says "unreviewed". */
export function autoSendIfDue(trip: Trip, nowUtc: string): Trip {
  const d = emailDraftOf(trip);
  if (!d || d.sentAtUtc || d.recipients.length === 0 || d.autoSendAtUtc > nowUtc) return trip;
  const by: Actor = { name: 'Dead-man switch', role: 'system' };
  const events = [...trip.events, { id: `ev-${Date.now().toString(36)}-${trip.events.length}`, kind: 'email-sent' as const, at: nowUtc, by, recipients: d.recipients, auto: true }];
  return { ...trip, emailDraft: { ...d, sentAtUtc: nowUtc, sentBy: by.name, auto: true }, events };
}

export type EmailState = { state: 'none' } | { state: 'drafted'; hoursLeft: number } | { state: 'sent'; auto: boolean; at: string };

export function emailState(trip: Trip, nowUtc: string): EmailState {
  const d = emailDraftOf(trip);
  if (!d) return { state: 'none' };
  if (d.sentAtUtc) return { state: 'sent', auto: d.auto, at: d.sentAtUtc };
  return { state: 'drafted', hoursLeft: Math.max(0, (Date.parse(d.autoSendAtUtc) - Date.parse(nowUtc)) / 3_600_000) };
}
