import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import NetworkStatus from './components/NetworkStatus';
import { HazardProvider } from './contexts/HazardContext';
import { MaintenanceProvider } from './components/contexts/MaintenanceContext';
import { PassengerFormProvider } from './components/contexts/PassengerFormContext';
import { FuelRequestProvider } from './components/contexts/FuelRequestContext';
import LoginScreen from './components/LoginScreen';
import PasswordGate from './components/PasswordGate';
import FleetOpsWall from './components/FleetOpsWall';
import NotFound from './components/NotFound';
import { FRONT_DOORS } from './navigation/navConfig';
import Navigation from './components/Navigation';
import RouteChrome from './components/RouteChrome';
import MobileBottomNav from './components/MobileBottomNav';
import AirportsShell, { OFFICER_ROLES } from './components/airport-info/AirportsShell';
import AircraftStatus from './components/AircraftStatus';
import FRATForm from './components/FRATForm';
import FRATReview from './components/FRATReview';
import MyFRATSubmissions from './components/MyFRATSubmissions';
import ProtectedRoute from './components/ProtectedRoute';
import MaintenanceBoard from './components/MaintenanceBoard';
import PassengerDatabase from './components/PassengerDatabase';
import PassengerMobileApp from './components/PassengerMobileApp';
import AdminUserManagement from './components/AdminUserManagement';
import AirportEvaluationOfficer from './components/AirportEvaluationOfficer';
import ScheduleCalendar from './components/ScheduleCalendar';
import { DocumentHub } from './components/documents/pages/DocumentHub';
import { DocReader } from './components/documents/pages/DocReader';
import { DocWorkbench } from './components/documents/pages/DocWorkbench';
import LeadDashboard from './components/LeadDashboard';
import ManagerInsights from './components/ManagerInsights';
import AirportServicesDatabase from './components/AirportServicesDatabase';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import MaintenanceHub from './components/MaintenanceHub';
import VacationRequest from './components/VacationRequest';
import FuelFarmTracker from './components/FuelFarmTracker';
import { SafetyCenter } from './components/safety-center';
import ApprovalsInbox from './components/approvals/ApprovalsInbox';
import WaiverManagement from './components/WaiverManagement';
import HazardReporting from './components/HazardReporting';
import HazardWorkspace from './components/hazard/HazardWorkspace';
import HazardDetailView from './components/hazard/HazardDetailView';
import InternalAuditManagement from './components/InternalAuditManagement';
import { ComplianceDashboard } from './components/documents/pages/ComplianceDashboard';
import CateringTracker from './components/CateringTracker';
import CateringOrders from './components/CateringOrders';
import RestaurantDatabase from './components/RestaurantDatabase';
import AircraftInventory from './components/AircraftInventory';
import PostFlightChecklist from './components/PostFlightChecklist';
import TurndownForm from './components/TurndownForm';
import TurndownReports from './components/TurndownReports';
import SchedulingDashboard from './components/SchedulingDashboard';
import CriticalFunctionsPlan from './components/CriticalFunctionsPlan';
import PilotCurrency from './components/PilotCurrency';
import PassengerForms from './components/PassengerForms';
import PublicPassengerForm from './components/PublicPassengerForm';
import OpsBoardPage from './components/ops/OpsBoardPage';
import AirportEvaluation from './components/AirportEvaluation';
import AirportEvaluations from './components/AirportEvaluations';
import AirportInformation from './components/airport-info/AirportInformation';
import AirportProposalQueue from './components/airport-info/AirportProposalQueue';
import AirportEvaluationWorklist from './components/airport-info/AirportEvaluationWorklist';
import FlagRuleBuilder from './components/airport-info/FlagRuleBuilder';
import { CompanyAirportProvider } from './components/airport-info/CompanyAirportContext';
import FuelLoadRequest from './components/FuelLoadRequest';
import UnifiedTasksActionItems from './components/UnifiedTasksActionItems';
import LobbyDisplay from './components/LobbyDisplay';
import UpcomingFlights from './components/UpcomingFlights';
import TechLogRoutes from './components/tech-log/TechLogRoutes';
import RampMode from './components/tech-log/pages/RampMode';
import FirRoutes from './components/fir/FirRoutes';
import BookingProfile from './components/BookingProfile';
import TripBuilderRoute from './components/trips/TripBuilderRoute';
import FlightFamily from './components/FlightFamily';
import ASAPReport from './components/ASAPReport';
import PartsInventory from './components/PartsInventory';
import TripCoordination from './components/TripCoordination';
import CrewSchedulingWorkload from './components/CrewSchedulingWorkload';
import FlightOperationsCenter from './components/FlightOperationsCenter';
import StandaloneFRATForm from './components/StandaloneFRATForm';
import StandaloneGRATForm from './components/StandaloneGRATForm';
import GRATReview from './components/GRATReview';
import FormFieldManager from './components/FormFieldManager';
import FRATFormBuilder from './components/FRATFormBuilder';
import GRATFormBuilder from './components/GRATFormBuilder';
import { DocumentsProvider } from './components/documents/DocumentsContext';
import { PassengerProvider } from './components/passengers/PassengerContext';
import FlightAttendantFlights from './components/inflight/FlightAttendantFlights';
import ItineraryBuilderV2 from './components/ItineraryBuilderV2';
import SchedulingCommandCenter from './components/scheduling-command/SchedulingCommandCenter';
import PassengerCurrencyDashboard from './components/passenger-currency/PassengerCurrencyDashboard';

import ForeFlightSyncProvider from './components/ForeFlightSyncProvider';
import ForeFlightTestUpload from './components/ForeFlightTestUpload';
import ForeFlightDiagnostics from './components/ForeFlightDiagnostics';
import AircraftCleaning from './components/AircraftCleaning';
import CleaningWorkflow from './components/CleaningWorkflow';
import CleaningManagerDashboard from './components/CleaningManagerDashboard';
import NewCleaningWorkflow from './components/NewCleaningWorkflow';
import LiveFleetMap from './components/LiveFleetMap';
import LiveMetricsDashboard from './components/LiveMetricsDashboard';
import MyAirOpsFlightList from './components/MyAirOpsFlightList';
import WorkOrders from './components/WorkOrders';
import TechWorkAnalytics from './components/TechWorkAnalytics';
import MTTRDashboard from './components/MTTRDashboard';
import MELCDLManagement from './components/MELCDLManagement';
import CarTracking from './components/CarTracking';
import SafetyRiskProfile from './components/SafetyRiskProfile';
import SafetyManagerDashboard from './components/SafetyManagerDashboard';
import HazardWorkflow from './components/HazardWorkflow';
import PreflightWorkflow from './components/PreflightWorkflow';
import TaxComplianceDashboard from './components/TaxComplianceDashboard';
import { TaxProvider } from './components/contexts/TaxContext';
import TechnicianDashboard from './components/maintenance/TechnicianDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import ElectronicLogbook from './components/ElectronicLogbook';
import { MaintenanceWorkflowProvider } from './components/maintenance-workflow/context/MaintenanceWorkflowContext';
import { SchedulingWorkspaceProvider } from './components/scheduling-workspace/SchedulingWorkspaceContext';
import { TechLogProvider } from './components/tech-log/TechLogContext';
import { SyncProvider } from './components/tech-log/sync/useSync';
import PilotWorkspace from './components/pilot-workspace/PilotWorkspace';
import AviaSyncDashboard from './components/maintenance-workflow/AviaSyncDashboard';
import MWElectronicTechLog from './components/maintenance-workflow/ElectronicTechLog';
import MWMELWorkflow from './components/maintenance-workflow/MELWorkflow';
import MWWorkOrderBoard from './components/maintenance-workflow/WorkOrderBoard';
import MWTechnicianView from './components/maintenance-workflow/TechnicianView';
import MWShiftHandover from './components/maintenance-workflow/ShiftHandover';
import MWPredictiveAnalytics from './components/maintenance-workflow/PredictiveAnalytics';
import MaintenanceTurnoverForm from './components/MaintenanceTurnoverForm';
import { AuditProvider } from './contexts/AuditContext';

// Inventory V2
import { InventoryV2Provider } from './components/inventory-v2/InventoryV2Context';
import InspectionFormV2 from './components/inventory-v2/pages/InspectionForm';
import InspectionReviewV2 from './components/inventory-v2/pages/InspectionReview';
import AircraftInspectionsV2 from './components/inventory-v2/pages/AircraftInspections';
import ReplenishV2 from './components/inventory-v2/pages/Replenish';
import UnitItemRequestV2 from './components/inventory-v2/pages/UnitItemRequest';
import UnitItemRequestListV2 from './components/inventory-v2/pages/UnitItemRequestList';
import SettingsV2 from './components/inventory-v2/pages/Settings';
import CommissaryHome from './components/inventory-v2/pages/CommissaryHome';
import CommissaryLocation from './components/inventory-v2/pages/CommissaryLocation';
import CommissaryItemDetail from './components/inventory-v2/pages/CommissaryItemDetail';
import TripListV2 from './components/inventory-v2/pages/TripList';
import TripHomeV2 from './components/inventory-v2/pages/TripHome';
import GroceryListPageV2 from './components/inventory-v2/pages/GroceryListPage';
import ReconcileRedirect from './components/inventory-v2/pages/ReconcileRedirect';
import CommissaryKiosk from './components/inventory-v2/pages/CommissaryKiosk';
import ActivityLog from './components/inventory-v2/pages/ActivityLog';

// ─── Wrapper: bridges into InventoryV2Provider ───────────────────────────────
// Must live outside App so it's a stable component reference, but it's defined
// here because it needs to be inside the module scope where InventoryV2Provider
// is imported.
function InventoryRouteWrapper({ children, userRole }: { children: React.ReactNode; userRole: string }) {
  return (
    <InventoryV2Provider userRole={userRole}>
      {children}
    </InventoryV2Provider>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>('pilot');
  const [additionalRoles, setAdditionalRoles] = useState<string[]>([]);

  const handleLogin = (role: string, extraRoles: string[]) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setAdditionalRoles(extraRoles);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('pilot');
    setAdditionalRoles([]);
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MaintenanceProvider>
          <HazardProvider>
            <AuditProvider>
              <PassengerFormProvider>
                <ForeFlightSyncProvider>
                <DocumentsProvider>
                <PassengerProvider>
                {/* TL-26 — ONE TechLogProvider, hoisted here with the other cross-cutting stores.
                    It used to be mounted four times on sibling route subtrees (/tech-log/*, /fir/*,
                    /pilot-workspace/*, and ramp mode in the outer tree), so every crossing between
                    them fully unmounted one instance and mounted another: the outgoing provider's
                    cleanup cancelled its pending 300 ms write, and the incoming one re-read the now
                    stale blob during render and wrote it back — silently losing a just-signed
                    record. Hoisting removes the remount entirely. Ramp mode's route STAYS in the
                    outer chrome-less tree (its lockdown is the point); only the provider moved. */}
                {/* Hoisted with the other cross-cutting stores, for the same reason TL-26 hoisted
                    TechLogProvider: the airport page and its review queue are sibling routes, and a
                    provider mounted per-subtree would remount between them and lose in-flight
                    proposals. */}
                <CompanyAirportProvider>
                {/* D60 fix pass — `additionalRoles` is the rest of the session's role set. Tech-log
                    surfaces that gate on authority (the tail page's CAS Reference tab) read it via
                    `useLoginRoles`; deriving roles from the resolved persona instead handed every
                    login with no `SYSTEM_USERS` entry the fallback persona's `chief-pilot`. */}
                <TechLogProvider userRole={userRole} additionalRoles={additionalRoles}>
                {/* TL-38 — the sync runtime (outbox, send loop, presence heartbeat). INSIDE
                    TechLogProvider because it reads and dispatches tech-log state, and hoisted to the
                    same level for the same TL-26 reason: a provider that unmounts on navigation would
                    drop the outbox, which is the one structure whose entire job is to survive. */}
                <SyncProvider>
                <Router>
                  <Routes>
                    {/* Public Routes - No Authentication Required */}
                    <Route path="/public/passenger-form" element={<PublicPassengerForm />} />
                    {/* The Work Ledger window — read-only project board, reached only via the
                        login-footer credit (design §7). Public outer route so the pre-login
                        door works; the demo's real gate is Vercel SSO. */}
                    <Route path="/ops" element={<OpsBoardPage />} />
                    <Route
                      path="/commissary-kiosk"
                      element={
                        <InventoryRouteWrapper userRole="commissary-kiosk">
                          <CommissaryKiosk />
                        </InventoryRouteWrapper>
                      }
                    />

                    {/* D36 ramp mode — authenticated, but mounted OUT here, above the <Navigation>
                        wrapper, for the same reason /commissary-kiosk is: the whole point of the
                        screen is that an inspector holding the iPad cannot navigate off it. Inside
                        the protected /* branch it inherits the global sidebar, breadcrumb and
                        Logout, and the lockdown is decorative. It reads the single hoisted
                        TechLogProvider above <Router> (TL-26) — it used to mount its own, which
                        meant a read-only screen could still clobber the tab that did the signing. */}
                    <Route path="/tech-log/aircraft/:tail/ramp" element={
                      !isAuthenticated ? <Navigate to="/login" replace /> : <RampMode />
                    } />

                    {/* Login Route — lands each role at its workspace front door */}
                    <Route path="/login" element={
                      isAuthenticated ? (
                        <Navigate to={FRONT_DOORS[userRole] ?? '/'} replace />
                      ) : (
                        <PasswordGate>
                          <LoginScreen onLogin={handleLogin} />
                        </PasswordGate>
                      )
                    } />

                    {/* Protected Routes - Authentication Required */}
                    <Route path="/*" element={
                      !isAuthenticated ? (
                        <Navigate to="/login" replace />
                      ) : (
                        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
                          {/* Scroll reset + per-view tab title for every route (LG-19 Wave 1) */}
                          <RouteChrome userRole={userRole} additionalRoles={additionalRoles} />
                          <Navigation userRole={userRole} additionalRoles={additionalRoles} onLogout={handleLogout}>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full">
                              <Routes>
                                {/* Front doors moved to the login redirect — the ops wall stays reachable for every role
                                    (maintenance-workflow keeps its redirect: its persona can't use the home screen). */}
                                <Route path="/" element={
                                  userRole === 'maintenance-workflow' ? <Navigate to="/maintenance-workflow" replace />
                                    : <FleetOpsWall userRole={userRole} />
                                } />
                                <Route path="/aircraft" element={<AircraftStatus />} />
                                <Route path="/fleet-map" element={<LiveFleetMap />} />
                                <Route path="/frat" element={
                                  <FuelRequestProvider>
                                    <PreflightWorkflow />
                                  </FuelRequestProvider>
                                } />
                                <Route path="/frat/standalone" element={<StandaloneFRATForm userRole={userRole} />} />
                                <Route path="/frat/my-submissions" element={<MyFRATSubmissions userRole={userRole} />} />
                                <Route
                                  path="/frat/review"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <FRATReview />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route path="/airport-evaluations" element={<AirportsShell userRole={userRole} additionalRoles={additionalRoles}><AirportInformation currentUserOid={userRole} /></AirportsShell>} />
                                <Route
                                  path="/airport-evaluations/flags"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={OFFICER_ROLES}>
                                      <AirportsShell userRole={userRole} additionalRoles={additionalRoles}><FlagRuleBuilder /></AirportsShell>
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/airport-evaluations/review"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={OFFICER_ROLES}>
                                      <AirportsShell userRole={userRole} additionalRoles={additionalRoles}>
                                        <AirportProposalQueue
                                          role={userRole === 'chief-pilot' ? 'chief-pilot' : 'airport-evaluator'}
                                          currentUserOid={userRole}
                                        />
                                      </AirportsShell>
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/airport-evaluations/worklist"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={OFFICER_ROLES}>
                                      <AirportsShell userRole={userRole} additionalRoles={additionalRoles}>
                                        <AirportEvaluationWorklist
                                          role={userRole === 'chief-pilot' ? 'chief-pilot' : 'airport-evaluator'}
                                          currentUserOid={userRole}
                                        />
                                      </AirportsShell>
                                    </ProtectedRoute>
                                  }
                                />
                                {/* The previous mock-backed directory, kept reachable while the
                                    editorial screens it owns are rewired onto real state (D46). */}
                                <Route path="/airport-evaluations/legacy" element={<AirportEvaluations />} />
                                <Route path="/currency-dashboard" element={<PilotCurrency userRole={userRole} pilotId={userRole === 'pilot' ? 'P001' : undefined} />} />
                                <Route path="/fuel-load-request" element={<FuelLoadRequest />} />

                                <Route path="/foreflight-test-upload" element={<ForeFlightTestUpload />} />
                                <Route path="/foreflight-diagnostics" element={<ForeFlightDiagnostics />} />
                                <Route path="/aircraft-cleaning" element={<AircraftCleaning />} />
                                <Route path="/aircraft-cleaning/workflow/:id" element={<CleaningWorkflow />} />
                                <Route path="/aircraft-cleaning/manager-dashboard" element={<CleaningManagerDashboard />} />
                                <Route path="/aircraft-cleaning/new-workflow" element={<NewCleaningWorkflow />} />
                                <Route path="/maintenance" element={<MaintenanceBoard />} />
                                <Route path="/maintenance-hub" element={
                                  <ErrorBoundary>
                                    <MaintenanceHub />
                                  </ErrorBoundary>
                                } />
                                <Route path="/maintenance/technician" element={<TechnicianDashboard />} />
                                <Route path="/pilot/elb" element={<ElectronicLogbook />} />
                                <Route path="/grat/standalone" element={<StandaloneGRATForm userRole={userRole} />} />
                                <Route
                                  path="/grat/review"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <GRATReview />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/grat/form-builder"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <GRATFormBuilder />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/grat/form-fields"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <FormFieldManager userRole={userRole} />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route path="/work-orders" element={<WorkOrders />} />
                                <Route path="/tech-work-analytics" element={<TechWorkAnalytics />} />
                                <Route path="/mttr-dashboard" element={<MTTRDashboard />} />
                                <Route path="/maintenance-turnover" element={<MaintenanceTurnoverForm />} />
                                <Route path="/mel-cdl" element={<MELCDLManagement />} />
                                <Route path="/car-tracking" element={<CarTracking />} />
                                <Route path="/passenger-database" element={<PassengerDatabase userRole={userRole} />} />

                                <Route path="/admin" element={<AdminUserManagement />} />
                                <Route
                                  path="/admin/airport-evaluation-officer"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['admin', 'airport-evaluator']}>
                                      <AirportEvaluationOfficer />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route path="/schedule" element={<ScheduleCalendar />} />
                                {/* Unified document-compliance hub (legacy document surfaces deleted 2026-07-11) */}
                                <Route path="/documents" element={<DocumentHub userRole={userRole} additionalRoles={additionalRoles} />} />
                                <Route path="/documents/:docId" element={<DocReader userRole={userRole} additionalRoles={additionalRoles} />} />
                                <Route path="/documents/:docId/manage" element={<DocWorkbench userRole={userRole} additionalRoles={additionalRoles} />} />

                                <Route
                                  path="/lead-dashboard"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['lead', 'admin']}>
                                      <LeadDashboard />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/manager-insights"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['lead', 'admin']}>
                                      <ManagerInsights />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/live-metrics"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['lead', 'admin']}>
                                      <LiveMetricsDashboard />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route path="/airport-services" element={<AirportServicesDatabase />} />
                                <Route path="/maintenance-dashboard" element={<MaintenanceDashboard />} />
                                <Route path="/vacation-request" element={<VacationRequest userRole={userRole} additionalRoles={additionalRoles} />} />
                                <Route path="/fuel-farm" element={<FuelFarmTracker />} />
                                <Route path="/safety" element={<SafetyCenter userRole={userRole} additionalRoles={additionalRoles} />} />
                                <Route path="/approvals" element={<ApprovalsInbox userRole={userRole} additionalRoles={additionalRoles} />} />
                                <Route path="/safety/waivers" element={<WaiverManagement userRole={userRole} additionalRoles={additionalRoles} />} />
                                <Route path="/safety/hazards" element={<HazardWorkspace userRole={userRole} />} />
                                <Route path="/safety/hazards/:id" element={<HazardDetailView userRole={userRole} />} />
                                <Route path="/safety/audits" element={<InternalAuditManagement />} />
                                <Route path="/safety/compliance" element={<ComplianceDashboard standalone />} />
                                {/* D66 — one place, all documents. Bulletins read in the Document
                                    Center like every other class; these two paths survive only so
                                    bookmarks and pre-D66 notification links land somewhere real. */}
                                <Route path="/procedural-bulletins" element={<Navigate to="/documents" replace />} />
                                <Route path="/flight-operations-bulletins" element={<Navigate to="/documents" replace />} />
                                <Route
                                  path="/safety/form-fields"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <FormFieldManager userRole={userRole} />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/safety/frat-builder"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <FRATFormBuilder />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/safety/grat-builder"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <GRATFormBuilder />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/safety/risk-profile"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <SafetyRiskProfile />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/safety/manager-dashboard"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <SafetyManagerDashboard />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/safety/hazard-workflow/:id"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <HazardWorkflow />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/safety/preflight-workflow/:id"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['safety', 'admin']}>
                                      <FuelRequestProvider>
                                        <PreflightWorkflow />
                                      </FuelRequestProvider>
                                    </ProtectedRoute>
                                  }
                                />
                                <Route path="/catering-tracker" element={<CateringTracker />} />
                                <Route path="/catering-orders" element={<CateringOrders />} />
                                {/* <Route path="/restaurant-database" element={<RestaurantDatabase userRole={userRole} />} /> */}
                                <Route path="/aircraft-inventory" element={<AircraftInventory />} />

                                {/* ─── Inventory V2 Routes ─── */}
                                <Route path="/inventory-v2" element={<Navigate to="/inventory-v2/inspections" replace />} />
                                <Route path="/inventory-v2/inspection" element={<InventoryRouteWrapper userRole={userRole}><InspectionFormV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/inspection/review" element={<InventoryRouteWrapper userRole={userRole}><InspectionReviewV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/inspections" element={<InventoryRouteWrapper userRole={userRole}><AircraftInspectionsV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/replenish" element={<InventoryRouteWrapper userRole={userRole}><ReplenishV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/unit-request" element={<InventoryRouteWrapper userRole={userRole}><UnitItemRequestV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/unit-requests" element={<InventoryRouteWrapper userRole={userRole}><UnitItemRequestListV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/settings" element={<InventoryRouteWrapper userRole={userRole}><SettingsV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/commissary" element={<InventoryRouteWrapper userRole={userRole}><CommissaryHome /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/commissary/location/:locationId" element={<InventoryRouteWrapper userRole={userRole}><CommissaryLocation /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/commissary/item/:itemId" element={<InventoryRouteWrapper userRole={userRole}><CommissaryItemDetail /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/trips" element={<InventoryRouteWrapper userRole={userRole}><TripListV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/trips/:tripId" element={<InventoryRouteWrapper userRole={userRole}><TripHomeV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/trips/:tripId/grocery-list" element={<InventoryRouteWrapper userRole={userRole}><GroceryListPageV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/trips/:tripId/reconcile" element={<ReconcileRedirect />} />
                                <Route path="/inventory-v2/activity-log" element={<InventoryRouteWrapper userRole={userRole}><ActivityLog /></InventoryRouteWrapper>} />
                                <Route path="/post-flight-checklist" element={<PostFlightChecklist userRole={userRole} />} />
                                <Route path="/turndown-form" element={<TurndownForm />} />
                                <Route path="/turndown-reports" element={<TurndownReports />} />
                                <Route path="/scheduling-dashboard" element={<SchedulingDashboard />} />
                                <Route path="/trip-coordination" element={<TripCoordination />} />
                                <Route
                                  path="/crew-scheduling-workload"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['scheduling', 'admin', 'lead']}>
                                      <CrewSchedulingWorkload />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/scheduling-command"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['scheduling', 'admin']}>
                                      <SchedulingWorkspaceProvider>
                                        <SchedulingCommandCenter userRole={userRole} additionalRoles={additionalRoles} />
                                      </SchedulingWorkspaceProvider>
                                    </ProtectedRoute>
                                  }
                                />
                                {/* Retired: the tabbed workspace folded into the command-center hub. */}
                                <Route path="/scheduling-workspace" element={<Navigate to="/scheduling-command" replace />} />
                                <Route
                                  path="/passenger-currency"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['scheduling', 'admin']}>
                                      <PassengerCurrencyDashboard />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/pilot-workspace/*"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['pilot', 'chief-pilot', 'admin']}>
                                      <SchedulingWorkspaceProvider>
                                        {/* TL-26: reads the hoisted TechLogProvider. */}
                                        <PilotWorkspace userRole={userRole} additionalRoles={additionalRoles} />
                                      </SchedulingWorkspaceProvider>
                                    </ProtectedRoute>
                                  }
                                />
                                <Route path="/critical-functions" element={<CriticalFunctionsPlan />} />
                                <Route path="/parts-inventory" element={<PartsInventory />} />
                                <Route path="/passenger-forms" element={<PassengerForms />} />
                                <Route path="/tasks-action-items" element={<UnifiedTasksActionItems userRole={userRole} />} />
                                <Route path="/upcoming-flights" element={userRole === 'inflight' ? <FlightAttendantFlights /> : <UpcomingFlights userRole={userRole} />} />
                                <Route path="/tech-log/*" element={<TechLogRoutes />} />
                                <Route path="/fir/*" element={<FirRoutes userRole={userRole} additionalRoles={additionalRoles} />} />
                                <Route path="/asap-report" element={<ASAPReport userRole={userRole} />} />
                                <Route
                                  path="/flight-operations-center"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling']}>
                                      <FlightOperationsCenter />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/tax-compliance"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['tax', 'admin']}>
                                      <TaxProvider>
                                        <TaxComplianceDashboard />
                                      </TaxProvider>
                                    </ProtectedRoute>
                                  }
                                />
                                {/* <Route
                                  path="/flight-family"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager', 'admin-assistant']}>
                                      <FlightFamily userRole={userRole} />
                                    </ProtectedRoute>
                                  }
                                /> */}
                                <Route
                                  path="/booking-profile"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['admin-assistant', 'admin', 'lead']}>
                                      <BookingProfile />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/trip-builder/:tripId?"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['admin-assistant', 'admin', 'lead']}>
                                      {/* onSave was an empty function and onCancel used
                                          window.history.back(), which exits the app when the
                                          builder was reached by deep link (LG-19). */}
                                      <TripBuilderRoute />
                                    </ProtectedRoute>
                                  }
                                />
                                <Route
                                  path="/itinerary-builder"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['admin-assistant', 'admin', 'lead']}>
                                      <ItineraryBuilderV2 />
                                    </ProtectedRoute>
                                  }
                                />
                                {/* AviaSync Maintenance Workflow Routes */}
                                <Route path="/maintenance-workflow" element={
                                  <MaintenanceWorkflowProvider><AviaSyncDashboard /></MaintenanceWorkflowProvider>
                                } />
                                <Route path="/maintenance-workflow/tech-log" element={
                                  <MaintenanceWorkflowProvider><MWElectronicTechLog /></MaintenanceWorkflowProvider>
                                } />
                                <Route path="/maintenance-workflow/mel" element={
                                  <MaintenanceWorkflowProvider><MWMELWorkflow /></MaintenanceWorkflowProvider>
                                } />
                                <Route path="/maintenance-workflow/work-orders" element={
                                  <MaintenanceWorkflowProvider><MWWorkOrderBoard /></MaintenanceWorkflowProvider>
                                } />
                                <Route path="/maintenance-workflow/technician" element={
                                  <MaintenanceWorkflowProvider><MWTechnicianView /></MaintenanceWorkflowProvider>
                                } />
                                <Route path="/maintenance-workflow/handover" element={
                                  <MaintenanceWorkflowProvider><MWShiftHandover /></MaintenanceWorkflowProvider>
                                } />
                                <Route path="/maintenance-workflow/analytics" element={
                                  <MaintenanceWorkflowProvider><MWPredictiveAnalytics /></MaintenanceWorkflowProvider>
                                } />
                                <Route path="/experimental/scheduling-command" element={<Navigate to="/scheduling-command" replace />} />
                                {/* Real 404 — broken links are visible bugs, not silent redirects */}
                                <Route path="*" element={<NotFound />} />
                              </Routes>
                            </div>
                          </Navigation>

                          {/* Mobile Bottom Navigation */}
                          <MobileBottomNav userRole={userRole} additionalRoles={additionalRoles} onLogout={handleLogout} />

                          {/* Network Status Banner */}
                          <NetworkStatus />

                          {/* Toast Notifications */}
                          <Toaster
                            position="top-right"
                            toastOptions={{
                              className: 'bg-card/90 backdrop-blur-xl border border-border/50 text-foreground shadow-lg rounded-xl',
                              classNames: {
                                title: 'font-semibold',
                                description: 'text-muted-foreground text-sm',
                              }
                            }}
                          />
                        </div>
                      )
                    } />
                  </Routes>
                </Router>
                </SyncProvider>
                </TechLogProvider>
                </CompanyAirportProvider>
                </PassengerProvider>
                </DocumentsProvider>
              </ForeFlightSyncProvider>
            </PassengerFormProvider>
            </AuditProvider>
          </HazardProvider>
        </MaintenanceProvider>
    </ThemeProvider>
  );
}