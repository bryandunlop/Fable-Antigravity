// Self-contained booking-portal demo shell. Mounted at "/booking-portal/*" in
// App.tsx. The provider lives here (not hoisted): demo state resets when you
// leave the portal, which is acceptable for a shell whose whole job is to be
// clicked through — the Reset button does the same on purpose.

import { Routes, Route, Navigate } from 'react-router-dom';
import { BookingPortalProvider } from './BookingPortalContext';
import PortalHome from './pages/PortalHome';
import EaHub from './pages/EaHub';
import ExecutiveCardPage from './pages/ExecutiveCard';
import Trips from './pages/Trips';
import ManifestPage from './pages/Manifest';
import EmptySeats from './pages/EmptySeats';
import Requests from './pages/Requests';
import NewRequest from './pages/NewRequest';
import SchedulingQueue from './pages/SchedulingQueue';
import Passengers from './pages/Passengers';
import Watches from './pages/Watches';
import InboxPage from './pages/InboxPage';
import CostModel from './pages/CostModel';
import CostModelDenied from './pages/CostModelDenied';
import { usePortal } from './BookingPortalContext';

/** Gated inside the provider, so the check and the tab read the same source. */
function CostModelGate() {
  return usePortal().showCostModel ? <CostModel /> : <CostModelDenied />;
}

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
  return (
    <Routes>
      <Route path="/" element={<PortalHome />} />
      {/* The EA Booking Hub — her month. */}
      <Route path="hub" element={<EaHub />} />
      {/* The executive's whole app: one card per trip. */}
      <Route path="mine" element={<ExecutiveCardPage />} />
      <Route path="trips" element={<Trips />} />
      {/* D100 — the manifest fills in over weeks; it gets its own screen per trip. */}
      <Route path="trips/:id/manifest" element={<ManifestPage />} />
      <Route path="seats" element={<EmptySeats />} />
      <Route path="requests" element={<Requests />} />
      <Route path="requests/new" element={<NewRequest />} />
      <Route path="requests/:id" element={<Requests />} />
      <Route path="queue" element={<SchedulingQueue />} />
      <Route path="passengers" element={<Passengers />} />
      <Route path="watches" element={<Watches />} />
      <Route path="inbox" element={<InboxPage />} />
      <Route path="cost-model" element={<CostModelGate />} />
    </Routes>
  );
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
