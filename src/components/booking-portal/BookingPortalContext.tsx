// Demo-shell state for the booking portal. In-memory only, by design: the
// point of the shell is to click through the flows and argue with them, not to
// persist anything. Reset = the "Reset demo" button (re-seeds fixtures).

import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import type { Persona, PortalState, Purpose, RequestLeg, TripRequest } from './types';
import { canTransition, inboxItem, routeLabel } from './engine/lifecycle';
import { initialPortalState, EA_NAME, SCHEDULER_NAME } from './mockData';

export type PortalAction =
  | { type: 'SET_PERSONA'; persona: Persona }
  | { type: 'RESET_DEMO' }
  | { type: 'SUBMIT_REQUEST'; legs: RequestLeg[]; principalId: string; extras: string[]; note?: string; fromWatchId?: string }
  | { type: 'APPROVE_REQUEST'; id: string }
  | { type: 'CONFIRM_REQUEST'; id: string }
  | { type: 'DECLINE_REQUEST'; id: string; reason: string }
  | { type: 'RESUBMIT_REQUEST'; id: string }
  | { type: 'POST_MESSAGE'; id: string; text: string }
  | { type: 'CREATE_WATCH'; kind: 'fleet' | 'route'; label: string; detail: string }
  | { type: 'CANCEL_WATCH'; id: string }
  | { type: 'SIMULATE_FREE'; id: string }
  | { type: 'ASK_SEAT'; flightId: string; passengerId: string; purpose: Purpose }
  | { type: 'DECIDE_SEAT'; id: string; approve: boolean }
  | { type: 'WITHDRAW_SEAT'; id: string }
  | { type: 'RELEASE_SEAT'; id: string }
  | { type: 'MARK_INBOX_READ'; id: string };

function nowIso(): string {
  return new Date().toISOString();
}

function updateRequest(state: PortalState, id: string, patch: (r: TripRequest) => TripRequest): PortalState {
  return { ...state, requests: state.requests.map((r) => (r.id === id ? patch(r) : r)) };
}

export function portalReducer(state: PortalState, action: PortalAction): PortalState {
  const at = nowIso();
  switch (action.type) {
    case 'SET_PERSONA':
      return { ...state, persona: action.persona };

    case 'RESET_DEMO':
      return initialPortalState();

    case 'SUBMIT_REQUEST': {
      const id = `R-${state.nextRequestNumber}`;
      const request: TripRequest = {
        id,
        status: 'pending', // draft → requested → pending collapsed for the demo submit
        tier: state.passengers.find((p) => p.id === action.principalId)?.kind === 'principal' ? 1 : 2,
        principalId: action.principalId,
        requestedBy: `${EA_NAME} (EA)`,
        createdAt: at,
        legs: action.legs,
        extras: action.extras,
        note: action.note,
        messages: [],
        fromWatchId: action.fromWatchId,
      };
      return {
        ...state,
        requests: [request, ...state.requests],
        nextRequestNumber: state.nextRequestNumber + 1,
        watches: action.fromWatchId
          ? state.watches.map((w) => (w.id === action.fromWatchId ? { ...w, prefillRequestId: id } : w))
          : state.watches,
      };
    }

    case 'APPROVE_REQUEST': {
      const target = state.requests.find((r) => r.id === action.id);
      if (!target || !canTransition(target.status, 'approved')) return state;
      const next = updateRequest(state, action.id, (r) => ({ ...r, status: 'approved' }));
      return {
        ...next,
        inbox: [
          inboxItem('decision', `${action.id} approved — scheduling is placing it on the schedule.`, false, at),
          ...next.inbox,
        ],
      };
    }

    case 'CONFIRM_REQUEST': {
      const target = state.requests.find((r) => r.id === action.id);
      if (!target || !canTransition(target.status, 'confirmed')) return state;
      const next = updateRequest(state, action.id, (r) => ({ ...r, status: 'confirmed' }));
      return {
        ...next,
        inbox: [
          inboxItem('decision', `${action.id} confirmed — ${routeLabel(target)} is on the schedule.`, false, at),
          ...next.inbox,
        ],
      };
    }

    case 'DECLINE_REQUEST': {
      const target = state.requests.find((r) => r.id === action.id);
      if (!target || !canTransition(target.status, 'declined')) return state;
      const next = updateRequest(state, action.id, (r) => ({ ...r, status: 'declined', declineReason: action.reason }));
      return {
        ...next,
        inbox: [
          inboxItem('decision', `${action.id} declined — "${action.reason}" Edit & resubmit.`, true, at),
          ...next.inbox,
        ],
      };
    }

    case 'RESUBMIT_REQUEST': {
      const target = state.requests.find((r) => r.id === action.id);
      if (!target || !canTransition(target.status, 'draft')) return state;
      // Resubmit reopens the SAME request (design: not a new one) and puts it
      // straight back in the queue for the demo.
      return updateRequest(state, action.id, (r) => ({
        ...r,
        status: 'pending',
        declineReason: undefined,
        createdAt: at,
      }));
    }

    case 'POST_MESSAGE': {
      const author = state.persona === 'ea' ? `Dana (EA)` : SCHEDULER_NAME;
      return updateRequest(state, action.id, (r) => ({
        ...r,
        messages: [
          ...r.messages,
          { id: `M-${at}`, from: state.persona, author, at, text: action.text },
        ],
      }));
    }

    case 'CREATE_WATCH':
      return {
        ...state,
        watches: [
          { id: `W-${at}`, kind: action.kind, label: action.label, detail: action.detail, status: 'watching' },
          ...state.watches,
        ],
      };

    case 'CANCEL_WATCH':
      return { ...state, watches: state.watches.filter((w) => w.id !== action.id) };

    case 'SIMULATE_FREE': {
      const watch = state.watches.find((w) => w.id === action.id);
      if (!watch || watch.status !== 'watching') return state;
      return {
        ...state,
        watches: state.watches.map((w) =>
          w.id === action.id
            ? { ...w, status: 'freed', freedNote: 'An aircraft freed up in your window. Dates now open for request.' }
            : w,
        ),
        inbox: [
          inboxItem('watch', `${watch.label} — freed. Pre-filled request ready.`, true, at),
          ...state.inbox,
        ],
      };
    }

    case 'ASK_SEAT': {
      const passenger = state.passengers.find((p) => p.id === action.passengerId);
      return {
        ...state,
        seatAsks: [
          {
            id: `S-${at}`,
            flightId: action.flightId,
            passengerId: action.passengerId,
            purpose: action.purpose,
            status: 'requested',
            firstFlight: passenger ? !passenger.hasFlown : false,
            createdAt: at,
          },
          ...state.seatAsks,
        ],
      };
    }

    case 'DECIDE_SEAT': {
      const ask = state.seatAsks.find((s) => s.id === action.id);
      if (!ask || ask.status !== 'requested') return state;
      const flight = state.flights.find((f) => f.id === ask.flightId);
      const passenger = state.passengers.find((p) => p.id === ask.passengerId);
      if (!action.approve) {
        return {
          ...state,
          seatAsks: state.seatAsks.filter((s) => s.id !== action.id),
          inbox: [
            inboxItem('decision', `Seat ask for ${passenger?.name ?? '—'} on ${flight ? `${flight.from} → ${flight.to}` : '—'} was not cleared.`, true, at),
            ...state.inbox,
          ],
        };
      }
      return {
        ...state,
        seatAsks: state.seatAsks.map((s) => (s.id === action.id ? { ...s, status: 'confirmed' } : s)),
        flights: state.flights.map((f) =>
          f.id === ask.flightId ? { ...f, seatsOpen: Math.max(0, f.seatsOpen - 1) } : f,
        ),
        inbox: [
          inboxItem('decision', `Seat confirmed — ${passenger?.name ?? '—'} on ${flight ? `${flight.from} → ${flight.to}` : '—'}. Itinerary to follow.${ask.firstFlight ? ' Travel form sent automatically.' : ''}`, false, at),
          ...state.inbox,
        ],
      };
    }

    case 'WITHDRAW_SEAT':
      return { ...state, seatAsks: state.seatAsks.filter((s) => s.id !== action.id) };

    case 'RELEASE_SEAT': {
      const ask = state.seatAsks.find((s) => s.id === action.id);
      if (!ask || ask.status !== 'confirmed') return state;
      return {
        ...state,
        seatAsks: state.seatAsks.map((s) => (s.id === action.id ? { ...s, status: 'released' } : s)),
        flights: state.flights.map((f) =>
          f.id === ask.flightId ? { ...f, seatsOpen: f.seatsOpen + 1 } : f,
        ),
      };
    }

    case 'MARK_INBOX_READ':
      return {
        ...state,
        inbox: state.inbox.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      };

    default:
      return state;
  }
}

/**
 * The department's cost structure — budget, fixed cost, and the fact the rate sits
 * well above what an hour really costs — is a leadership and finance conversation,
 * not an operational one. Bryan's ruling, 2026-08-23: lead team only. The EA and
 * scheduling personas price trips; they do not see what the department spends.
 */
export const COST_MODEL_ROLES = ['lead', 'admin'];

export function canSeeCostModel(userRole?: string, additionalRoles: string[] = []): boolean {
  return [userRole, ...additionalRoles].some((r) => !!r && COST_MODEL_ROLES.includes(r));
}

/**
 * The per-person grant that unlocks the FULL schedule on availability surfaces.
 *
 * Bryan, 2026-08-31: "we should have a select view that we can enable for certain executives to
 * see the full schedule." It is a role a named person is given, not a rank — a CEO does not get
 * it automatically and an EA can be given it. Operators hold it implicitly.
 *
 * What it unlocks is the operating picture (every committed trip, every downtime window with its
 * type and return date, hold labels) — NOT operator access. Defect text, work orders, vendors and
 * crew names stay withheld; see src/availability/engine/disclosure.ts.
 */
export const FULL_SCHEDULE_ROLES = ['full-schedule', 'scheduling', 'admin', 'lead'];

export function canSeeFullSchedule(userRole?: string, additionalRoles: string[] = []): boolean {
  return [userRole, ...additionalRoles].some((r) => !!r && FULL_SCHEDULE_ROLES.includes(r));
}

/** Roles that operate the portal — everyone else who can reach it is a visitor. */
export const PORTAL_OPERATOR_ROLES = ['admin-assistant', 'scheduling', 'admin', 'lead'];

/**
 * D99 — an executive reaches the portal only as the landing zone for the
 * fleet-week ask-my-EA handoff. They get the request form and nothing else:
 * no persona switch (the persona toggle is demo chrome, not auth — flipping
 * it to 'scheduling' unlocks approve/decline), no queue, no other tabs. A
 * user who ALSO holds an operator role is an operator, not a visitor.
 */
export function isExecutiveVisitor(userRole?: string, additionalRoles: string[] = []): boolean {
  const roles = [userRole, ...additionalRoles].filter((r): r is string => !!r);
  return roles.includes('executive') && !roles.some((r) => PORTAL_OPERATOR_ROLES.includes(r));
}

const PortalContext = createContext<{
  state: PortalState;
  dispatch: React.Dispatch<PortalAction>;
  /** Whether this viewer may see the department's economics. */
  showCostModel: boolean;
  /** D99: viewer is an executive visitor — request form only, no portal chrome. */
  executiveScope: boolean;
} | null>(null);

export function BookingPortalProvider({
  children,
  userRole,
  additionalRoles,
}: {
  children: ReactNode;
  userRole?: string;
  additionalRoles?: string[];
}) {
  const [state, dispatch] = useReducer(portalReducer, undefined, initialPortalState);
  const showCostModel = canSeeCostModel(userRole, additionalRoles);
  const executiveScope = isExecutiveVisitor(userRole, additionalRoles);
  const value = useMemo(
    () => ({ state, dispatch, showCostModel, executiveScope }),
    [state, showCostModel, executiveScope],
  );
  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used inside BookingPortalProvider');
  return ctx;
}
