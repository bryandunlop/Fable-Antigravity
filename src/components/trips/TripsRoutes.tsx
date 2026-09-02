import { Route, Routes } from 'react-router-dom';
import { TripsProvider } from './TripsContext';
import TripsHome from './pages/TripsHome';
import NewTrip from './pages/NewTrip';
import TripWorkspace from './pages/TripWorkspace';
import PlacesAdmin from './pages/PlacesAdmin';
import TripSheetPage from './pages/TripSheetPage';
import EmailPage from './pages/EmailPage';
import TripSettingsPage from './pages/TripSettingsPage';

export default function TripsRoutes({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  return (
    <TripsProvider userRole={userRole} additionalRoles={additionalRoles}>
      <Routes>
        <Route path="/" element={<TripsHome />} />
        <Route path="new" element={<NewTrip />} />
        <Route path="places" element={<PlacesAdmin />} />
        <Route path="settings" element={<TripSettingsPage />} />
        <Route path=":id/sheet" element={<TripSheetPage />} />
        <Route path=":id/email" element={<EmailPage />} />
        <Route path=":id" element={<TripWorkspace />} />
      </Routes>
    </TripsProvider>
  );
}
