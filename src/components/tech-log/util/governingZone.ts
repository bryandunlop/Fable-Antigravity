import { DEFAULT_GOVERNING_TIMEZONE } from '../engine/pl25';

// D24: a deferral's PL-25 calendar-day clock is anchored to a governing IANA zone. Eastern is the
// ratified default; a signer may override to the aircraft's operating-local zone when needed, but
// must record why. This is the curated operating set + the override reason rule.

export interface ZoneOption {
  zone: string;   // IANA id — the value stored in Deferral.governingTimezone
  label: string;  // human label for the picker
}

export const GOVERNING_ZONE_OPTIONS: ZoneOption[] = [
  { zone: 'America/New_York', label: 'Eastern (ET) — default' },
  { zone: 'America/Chicago', label: 'Central (CT)' },
  { zone: 'America/Denver', label: 'Mountain (MT)' },
  { zone: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { zone: 'America/Anchorage', label: 'Alaska (AKT)' },
  { zone: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { zone: 'UTC', label: 'UTC' },
  { zone: 'Europe/London', label: 'London (UK)' },
  { zone: 'Europe/Paris', label: 'Central Europe (CET)' },
  { zone: 'Asia/Dubai', label: 'Gulf (Dubai)' },
  { zone: 'Asia/Tokyo', label: 'Japan (JST)' },
];

/** True when the governing zone differs from the Eastern default (i.e. it is an override). */
export function isOverride(zone: string): boolean {
  return zone !== DEFAULT_GOVERNING_TIMEZONE;
}

/** D24: an override to a non-default governing zone must carry a recorded reason. */
export function validateGoverningOverride(zone: string, reason: string): { ok: boolean; error?: string } {
  if (!isOverride(zone)) return { ok: true };
  if (!reason.trim()) return { ok: false, error: 'A reason is required to override the Eastern default governing timezone.' };
  return { ok: true };
}
