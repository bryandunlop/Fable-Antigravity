// What the app knows about where the reporter was standing.
//
// Split out from the dialog so it is testable in node and so there is exactly one
// definition of "the context we send" — the payload preview in the triage view
// and the real send path must never diverge.

import { matchEntry, NAV_ENTRIES } from '../../navigation/navConfig';
import type { FeedbackContext } from './types';

/** Version stamp shown on reports. Bumped with a release; not read at runtime. */
export const APP_VERSION = '2026.9.1';

export interface CaptureEnv {
  pathname: string;
  role: string;
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
}

export function captureContext(env: CaptureEnv): FeedbackContext {
  const entry = matchEntry(env.pathname, NAV_ENTRIES);
  return {
    route: env.pathname,
    screen: entry?.label ?? 'Unknown screen',
    role: env.role,
    appVersion: APP_VERSION,
    viewport:
      env.viewportWidth && env.viewportHeight
        ? `${Math.round(env.viewportWidth)}x${Math.round(env.viewportHeight)}`
        : 'unknown',
    userAgent: env.userAgent ?? 'unknown',
  };
}

/** Default product area for a report, from the screen the reporter was on. */
export function defaultArea(context: FeedbackContext): string {
  return context.screen === 'Unknown screen' ? 'Other' : context.screen;
}
