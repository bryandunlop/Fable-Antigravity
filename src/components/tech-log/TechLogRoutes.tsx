import { Routes, Route, Navigate } from 'react-router-dom';
import PilotHome from './pages/PilotHome';
import FleetStatus from './pages/FleetStatus';
import AircraftDetail from './pages/AircraftDetail';
import WorkQueue from './pages/WorkQueue';
import Defects from './pages/Defects';
import Deferrals from './pages/Deferrals';
import Releases from './pages/Releases';
import JourneyLog from './pages/JourneyLog';
import MelBrowser from './pages/MelBrowser';
import WorkCards from './pages/WorkCards';
import WorkCardDetail from './pages/WorkCardDetail';
import Analytics from './pages/Analytics';
import Metrics from './pages/Metrics';
import Airworthiness from './pages/Airworthiness';
import ComingDue from './pages/ComingDue';
import IntermittentFaults from './pages/IntermittentFaults';
import Trips from './pages/Trips';
import TripWorkspace from './pages/TripWorkspace';
import LegDetail from './pages/LegDetail';
import AdminFleet from './pages/AdminFleet';
import AdminPersonnel from './pages/AdminPersonnel';
import AdminMel from './pages/AdminMel';
import AdminChecklists from './pages/AdminChecklists';
import AuditTrail from './pages/AuditTrail';
import Aog from './pages/Aog';
import Planners from './pages/Planners';
import Integration from './pages/Integration';

/**
 * Self-contained eTechLog domain. Mounted at "/tech-log/*" in App.tsx.
 * State comes from the single TechLogProvider hoisted above <Router> in App.tsx. This file used to
 * mount its own, which meant navigating to /fir or /pilot-workspace (which did the same) unmounted
 * the whole store and re-hydrated it from localStorage — see TL-26.
 */
export default function TechLogRoutes() {
  return (
      <Routes>
        <Route path="/" element={<PilotHome />} />
        <Route path="fleet" element={<FleetStatus />} />
        <Route path="aircraft/:tail" element={<AircraftDetail />} />
        <Route path="work-queue" element={<WorkQueue />} />
        <Route path="journey" element={<JourneyLog />} />
        <Route path="defects" element={<Defects />} />
        <Route path="deferrals" element={<Deferrals />} />
        <Route path="releases" element={<Releases />} />
        <Route path="work-cards" element={<WorkCards />} />
        <Route path="work-cards/:id" element={<WorkCardDetail />} />
        <Route path="mel" element={<MelBrowser />} />
        <Route path="analytics" element={<Analytics />} />
        {/* D61 §5 — the maintenance-time rollup is for everyone, not maintenance only. This file
            applies no role gating; that is the mechanism, and it is deliberate here. */}
        <Route path="metrics" element={<Metrics />} />
        <Route path="airworthiness/forecast" element={<ComingDue />} />
        <Route path="airworthiness/times" element={<Airworthiness view="times" />} />
        <Route path="airworthiness/adsb" element={<Airworthiness view="adsb" />} />
        <Route path="airworthiness/workorders" element={<Airworthiness view="workorders" />} />
        <Route path="intermittent" element={<IntermittentFaults />} />
        <Route path="trips" element={<Trips />} />
        <Route path="trips/:tripId" element={<TripWorkspace />} />
        <Route path="trips/:tripId/legs/:legId" element={<LegDetail />} />
        <Route path="aog" element={<Aog />} />
        <Route path="planners" element={<Planners />} />
        <Route path="audit" element={<AuditTrail />} />
        <Route path="integration" element={<Integration />} />
        <Route path="admin/fleet" element={<AdminFleet />} />
        <Route path="admin/personnel" element={<AdminPersonnel />} />
        <Route path="admin/mel" element={<AdminMel />} />
        <Route path="admin/checklists" element={<AdminChecklists />} />
        <Route path="*" element={<Navigate to="/tech-log" replace />} />
      </Routes>
  );
}
