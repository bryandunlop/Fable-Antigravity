// Self-contained booking-portal demo shell. Mounted at "/booking-portal/*" in
// App.tsx. The provider lives here (not hoisted): demo state resets when you
// leave the portal, which is acceptable for a shell whose whole job is to be
// clicked through — the Reset button does the same on purpose.

import { Routes, Route } from 'react-router-dom';
import { BookingPortalProvider } from './BookingPortalContext';
import PortalHome from './pages/PortalHome';
import EmptySeats from './pages/EmptySeats';
import Requests from './pages/Requests';
import NewRequest from './pages/NewRequest';
import RequestDetail from './pages/RequestDetail';
import SchedulingQueue from './pages/SchedulingQueue';
import Passengers from './pages/Passengers';
import Watches from './pages/Watches';
import InboxPage from './pages/InboxPage';

export default function BookingPortalRoutes() {
  return (
    <BookingPortalProvider>
      <Routes>
        <Route path="/" element={<PortalHome />} />
        <Route path="seats" element={<EmptySeats />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/new" element={<NewRequest />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="queue" element={<SchedulingQueue />} />
        <Route path="passengers" element={<Passengers />} />
        <Route path="watches" element={<Watches />} />
        <Route path="inbox" element={<InboxPage />} />
      </Routes>
    </BookingPortalProvider>
  );
}
