import { Routes, Route, Navigate } from 'react-router-dom';
import { TechLogProvider } from './TechLogContext';
import FleetStatus from './pages/FleetStatus';
import AircraftDetail from './pages/AircraftDetail';
import Defects from './pages/Defects';
import Deferrals from './pages/Deferrals';
import Releases from './pages/Releases';
import JourneyLog from './pages/JourneyLog';
import AdminFleet from './pages/AdminFleet';
import AdminPersonnel from './pages/AdminPersonnel';
import AdminMel from './pages/AdminMel';
import AuditTrail from './pages/AuditTrail';
import Aog from './pages/Aog';

/**
 * Self-contained eTechLog domain. Mounted at "/tech-log/*" in App.tsx.
 * One TechLogProvider wraps all sub-pages so persona + mock state are shared.
 */
export default function TechLogRoutes() {
  return (
    <TechLogProvider>
      <Routes>
        <Route path="/" element={<FleetStatus />} />
        <Route path="aircraft/:tail" element={<AircraftDetail />} />
        <Route path="journey" element={<JourneyLog />} />
        <Route path="defects" element={<Defects />} />
        <Route path="deferrals" element={<Deferrals />} />
        <Route path="releases" element={<Releases />} />
        <Route path="aog" element={<Aog />} />
        <Route path="audit" element={<AuditTrail />} />
        <Route path="admin/fleet" element={<AdminFleet />} />
        <Route path="admin/personnel" element={<AdminPersonnel />} />
        <Route path="admin/mel" element={<AdminMel />} />
        <Route path="*" element={<Navigate to="/tech-log" replace />} />
      </Routes>
    </TechLogProvider>
  );
}
