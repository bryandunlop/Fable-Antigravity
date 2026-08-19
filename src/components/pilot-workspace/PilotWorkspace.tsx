import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useMatch } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AltimeterSpinner } from '../ui/LoadingSpinners';
import { useSchedulingWorkspace } from '../scheduling-workspace/SchedulingWorkspaceContext';
import MyFlightsPanel from './MyFlightsPanel';
import FlightHub from './FlightHub';
import { initialListExpanded, readPersistedListState, writePersistedListState } from './listColumn';
import type { TripRecord } from '../../scheduling/store/types';

/**
 * The workspace is a SPLIT VIEW (D84): My Flights is a permanent column beside the open trip,
 * because pilots hold several trips at once and getting from "what do I owe" to doing it should
 * not cost a route change. The URL still carries the trip (`/pilot-workspace/trips/:tripId`), so
 * deep links, refresh and Back all behave exactly as before — only the layout changed.
 *
 * Height: the split view only works if it owns a BOUNDED height — the two columns scroll
 * independently and the detail pane pins a bottom bar. <main> is `flex-1 overflow-auto p-6 pb-20
 * md:pb-6` and renders BreadcrumbNav above the route, so the height is the viewport minus that
 * chrome, measured rather than guessed:
 *
 *   4.5625rem  app header — py-4 + a 40px control row + the 1px rule = 73px
 *   1.5rem     <main>'s p-6 top
 *   2.375rem   BreadcrumbNav — a 21.43px text-sm row plus its mb-4 = 37.43px
 *   1.5rem     <main>'s pb-6 (md and up); 5rem below md, where it reserves the phone bottom nav
 *
 * The inventory-v2 pages solve this with `-m-6 -mb-20 md:-mb-6` and subtract only the header.
 * That idiom does NOT work here and is worth the note: App wraps every route in a page-transition
 * div, so the shell is not a child of <main> and its negative bottom margin cancels nothing —
 * measured, it left 13px of page overflow, which is exactly the scroll this slice exists to remove.
 * Living inside the page gutter instead costs 24px and removes a whole class of bug.
 *
 * Pinned by a test: if the header or the breadcrumb changes height, that test should fail, not a
 * pilot's fold.
 */
const fullHeightShell =
  'flex overflow-hidden rounded-lg border border-border h-[calc(100dvh-4.5625rem-1.5rem-2.375rem-5rem)] md:h-[calc(100dvh-4.5625rem-1.5rem-2.375rem-1.5rem)]';

/** One trip's Flight Hub, resolved from the :tripId in the URL. undefined = loading, null = gone. */
function FlightHubRoute({ userRole }: { userRole: string }) {
  const { tripId } = useParams();
  const { store, tick } = useSchedulingWorkspace();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripRecord | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = tripId ? await store.getTrip(tripId) : null;
      if (!cancelled) setTrip(t);
    })();
    return () => { cancelled = true; };
  }, [store, tripId, tick]);

  if (trip === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AltimeterSpinner size={28} />
        <p className="text-muted-foreground text-sm">Loading trip…</p>
      </div>
    );
  }
  if (trip === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">That trip is no longer available.</p>
        <button onClick={() => navigate('/pilot-workspace')} className="text-sm text-primary hover:underline">
          Back to my flights
        </button>
      </div>
    );
  }
  return <FlightHub trip={trip} userRole={userRole} />;
}

/** Nothing open yet. The list is already on screen, so this only has to name what to do next. */
function NoTripSelected() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-base font-medium">Select a flight</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Your brief, your aircraft and your preflight open here, beside the list.
      </p>
    </div>
  );
}

export default function PilotWorkspace({ userRole }: { userRole: string; additionalRoles?: string[] }) {
  const { ready } = useSchedulingWorkspace();
  const navigate = useNavigate();
  // The open trip lives in the child route, but the list (which renders above it) has to highlight
  // it — so read it from the path rather than lifting state the URL already holds.
  const selectedTripId = useMatch('/pilot-workspace/trips/:tripId')?.params.tripId;
  const [expanded, setExpanded] = useState(() =>
    initialListExpanded(typeof window === 'undefined' ? 1280 : window.innerWidth, readPersistedListState()),
  );

  const toggleList = () => {
    setExpanded((prev) => {
      writePersistedListState(!prev);
      return !prev;
    });
  };

  if (!ready) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-3">
        <AltimeterSpinner size={32} />
        <p className="text-muted-foreground text-sm">Loading pilot workspace...</p>
      </div>
    );
  }

  return (
    <div className={fullHeightShell}>
      {/* My Flights never unmounts. Collapsed it becomes a 72pt tail strip rather than
          disappearing, so switching trip stays one tap either way. */}
      <aside
        className={`flex min-h-0 flex-none flex-col border-r border-border bg-card ${expanded ? 'w-80' : 'w-[72px]'}`}
      >
        <div className={`flex flex-none items-center gap-2 border-b border-border p-2 ${expanded ? '' : 'justify-center'}`}>
          <button
            type="button"
            onClick={toggleList}
            aria-label={expanded ? 'Collapse flight list' : 'Expand flight list'}
            aria-expanded={expanded}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground duration-fast"
          >
            {expanded ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </button>
          {expanded && <span className="gfo-eyebrow">My flights</span>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MyFlightsPanel
            collapsed={!expanded}
            selectedTripId={selectedTripId}
            onOpen={(t) => navigate(`/pilot-workspace/trips/${t.id}`)}
          />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Routes>
          <Route index element={<NoTripSelected />} />
          <Route path="trips/:tripId" element={<FlightHubRoute userRole={userRole} />} />
          <Route path="*" element={<Navigate to="/pilot-workspace" replace />} />
        </Routes>
      </div>
    </div>
  );
}
