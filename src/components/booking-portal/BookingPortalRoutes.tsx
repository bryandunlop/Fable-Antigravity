// Self-contained booking-portal demo shell. Mounted at "/booking-portal/*" in
// App.tsx. The provider lives here (not hoisted): demo state resets when you
// leave the portal, which is acceptable for a shell whose whole job is to be
// clicked through — the Reset button does the same on purpose.

import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { BookingPortalProvider } from './BookingPortalContext';
import NewRequest from './pages/NewRequest';
import { usePortal } from './BookingPortalContext';

/**
 * D99 — an executive visitor gets exactly one page: the new-request form the
 * fleet-week handoff lands on. Every other portal path redirects there, so the
 * un-role-gated persona switch and the scheduler surfaces are unreachable.
 */
function ScopedRoutes() {
  if (usePortal().executiveScope) {
    return (
      <Routes>
        <Route path="requests/new" element={<NewRequest />} />
        {/* Absolute target: a relative "requests/new" resolves against the splat
            and self-appends forever (…/queue/requests/new/requests/new/…). */}
        <Route path="*" element={<Navigate to="/booking-portal/requests/new" replace />} />
      </Routes>
    );
  }
  /**
   * RETIRED (D109 slice 5). Bryan, 2026-09-02: "I dont think anyone should see the old booking
   * portal." Every scheduling-facing screen here has a better home in the trips module, and the
   * duplication — two queues, two manifests, two passenger lists, over two data models — is the
   * thing Phase 5 exists to end. The paths stay as REDIRECTS rather than 404s because they are in
   * people's history and bookmarks, and a dead link teaches nobody where the page went.
   *
   * The one screen still served is `requests/new`: it is the executive's front door via the
   * fleet-week ask-my-EA handoff (D99), not a portal destination, and rebuilding it inside trips is
   * its own piece of work — see [[LG-367]].
   *
   * The cost model retires with the portal and is NOT rehomed (Bryan, same message: "Lets not do the
   * cost model right now"). It comes back if someone asks for it.
   */
  return (
    <Routes>
      <Route path="requests/new" element={<NewRequest />} />
      <Route path="queue" element={<Navigate to="/trips" replace />} />
      <Route path="trips" element={<Navigate to="/trips" replace />} />
      <Route path="trips/:id/manifest" element={<ManifestRedirect />} />
      <Route path="passengers" element={<Navigate to="/people" replace />} />
      <Route path="watches" element={<Navigate to="/trips/watches" replace />} />
      <Route path="seats" element={<Navigate to="/fleet-schedule" replace />} />
      <Route path="*" element={<Navigate to="/trips" replace />} />
    </Routes>
  );
}

/** `/booking-portal/trips/:id/manifest` → the same trip's People tab in the trips module. */
function ManifestRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/trips/${id}` : '/trips'} replace />;
}

export default function BookingPortalRoutes({
  userRole,
  additionalRoles,
}: {
  userRole?: string;
  additionalRoles?: string[];
}) {
  return (
    <BookingPortalProvider userRole={userRole} additionalRoles={additionalRoles}>
      <ScopedRoutes />
    </BookingPortalProvider>
  );
}
