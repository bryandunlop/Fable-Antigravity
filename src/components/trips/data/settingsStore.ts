// THIN localStorage wrapper for the T-72 settings scheduling owns (D106): cutoff defaults, the
// email template + dead-man hours, crew blurbs, passenger send preferences.

import { DEFAULT_CUTOFFS, type CutoffDefaults } from '../engine/cutoffs';
import { DEFAULT_TEMPLATE, type EmailTemplate, type PassengerPref } from '../engine/briefingEmail';

export interface TripSettings {
  cutoffs: CutoffDefaults;
  email: EmailTemplate;
  /** Crew name → the line the passenger email says about them. */
  blurbs: Record<string, string>;
  passengerPrefs: PassengerPref[];
}

export const DEFAULT_SETTINGS: TripSettings = {
  cutoffs: DEFAULT_CUTOFFS,
  email: DEFAULT_TEMPLATE,
  blurbs: {
    'Capt. John Smith': 'Chief Pilot; twenty years on Gulfstreams and a very smooth landing.',
    'FO Emily Chen': 'Joined from the airlines in 2024; type-rated on the G500 and G650ER.',
    'Lena Nguyen': 'Looks after the cabin; ask her about anything you need before you board.',
  },
  passengerPrefs: [
    { name: 'A. Reyes', pref: 'never', hasFlown: true },
    { name: 'M. Osei', pref: 'never', hasFlown: true },
    { name: 'J. Lindqvist', pref: 'first', hasFlown: true },
    { name: 'S. Reyes', pref: 'every', hasFlown: false },
    { name: 'K. Tanaka', pref: 'first', hasFlown: false },
  ],
};

const KEY = 'trip-settings-state';
const VERSION_KEY = 'trip-settings-version';
const VERSION = '1';

export function loadSettings(): TripSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    if (localStorage.getItem(VERSION_KEY) !== VERSION) return DEFAULT_SETTINGS;
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<TripSettings>;
    return {
      cutoffs: { ...DEFAULT_CUTOFFS, ...(parsed.cutoffs ?? {}) },
      email: { ...DEFAULT_TEMPLATE, ...(parsed.email ?? {}) },
      blurbs: parsed.blurbs ?? DEFAULT_SETTINGS.blurbs,
      passengerPrefs: parsed.passengerPrefs ?? DEFAULT_SETTINGS.passengerPrefs,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: TripSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(s));
  localStorage.setItem(VERSION_KEY, VERSION);
}
