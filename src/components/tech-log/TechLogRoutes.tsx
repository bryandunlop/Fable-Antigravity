import { Routes, Route, Navigate } from 'react-router-dom';
import { TechLogProvider } from './TechLogContext';
import FleetStatus from './pages/FleetStatus';
import AircraftDetail from './pages/AircraftDetail';
import Defects from './pages/Defects';
import Deferrals from './pages/Deferrals';
import Releases from './pages/Releases';

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
        <Route path="defects" element={<Defects />} />
        <Route path="deferrals" element={<Deferrals />} />
        <Route path="releases" element={<Releases />} />
        <Route path="*" element={<Navigate to="/tech-log" replace />} />
      </Routes>
    </TechLogProvider>
  );
}
