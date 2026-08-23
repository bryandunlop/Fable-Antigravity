// Self-contained booking-portal demo shell. Mounted at "/booking-portal/*" in
// App.tsx. The provider lives here (not hoisted): demo state resets when you
// leave the portal, which is acceptable for a shell whose whole job is to be
// clicked through — the Reset button does the same on purpose.

import { Routes, Route } from 'react-router-dom';
import { BookingPortalProvider } from './BookingPortalContext';
import PortalHome from './pages/PortalHome';
import Trips from './pages/Trips';
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

export default function BookingPortalRoutes({
  userRole,
  additionalRoles,
}: {
  userRole?: string;
  additionalRoles?: string[];
}) {
  return (
    <BookingPortalProvider userRole={userRole} additionalRoles={additionalRoles}>
      <Routes>
        <Route path="/" element={<PortalHome />} />
        <Route path="trips" element={<Trips />} />
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
    </BookingPortalProvider>
  );
}
