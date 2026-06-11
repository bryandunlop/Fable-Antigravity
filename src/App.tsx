import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import NetworkStatus from './components/NetworkStatus';
import { HazardProvider } from './contexts/HazardContext';
import { MaintenanceProvider } from './components/contexts/MaintenanceContext';
import { NotificationProvider, useNotificationContext } from './components/contexts/NotificationContext';
import { PassengerFormProvider } from './components/contexts/PassengerFormContext';
import { FuelRequestProvider } from './components/contexts/FuelRequestContext';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import Navigation from './components/Navigation';
import MobileBottomNav from './components/MobileBottomNav';
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
import DocumentCenter from './components/DocumentCenter';
import DocumentManagement from './components/DocumentManagement';
import DocumentRequest from './components/DocumentRequest';
import OfflineDocuments from './components/OfflineDocuments';
import DocumentReviewQueue from './components/DocumentReviewQueue';
import DocumentCollaborations from './components/DocumentCollaborations';
import LeadDashboard from './components/LeadDashboard';
import ManagerInsights from './components/ManagerInsights';
import AirportServicesDatabase from './components/AirportServicesDatabase';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import MaintenanceHub from './components/MaintenanceHub';
import VacationRequest from './components/VacationRequest';
import FuelFarmTracker from './components/FuelFarmTracker';
import SafetyDashboard from './components/SafetyDashboard';
import WaiverManagement from './components/WaiverManagement';
import HazardReporting from './components/HazardReporting';
import HazardWorkspace from './components/hazard/HazardWorkspace';
import HazardDetailView from './components/hazard/HazardDetailView';
import InternalAuditManagement from './components/InternalAuditManagement';
import DocumentCompliance from './components/DocumentCompliance';
import UserSafety from './components/UserSafety';
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
import AirportEvaluation from './components/AirportEvaluation';
import AirportEvaluations from './components/AirportEvaluations';
import FuelLoadRequest from './components/FuelLoadRequest';
import UnifiedTasksActionItems from './components/UnifiedTasksActionItems';
import AOGManagement from './components/AOGManagement';
import LobbyDisplay from './components/LobbyDisplay';
import UpcomingFlights from './components/UpcomingFlights';
import TechLog from './components/TechLog';
import BookingProfile from './components/BookingProfile';
import TripBuilder from './components/TripBuilder';
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
import ProceduralBulletins from './components/ProceduralBulletins';
import ItineraryBuilderV2 from './components/ItineraryBuilderV2';
import UnifiedTripWorkspace from './components/experimental/UnifiedTripWorkspace';
import SchedulingCommandCenter from './components/experimental/SchedulingCommandCenter';

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
import RecentlyCompletedV2 from './components/inventory-v2/pages/RecentlyCompleted';
import ReplenishV2 from './components/inventory-v2/pages/Replenish';
import UnitItemRequestV2 from './components/inventory-v2/pages/UnitItemRequest';
import UnitItemRequestListV2 from './components/inventory-v2/pages/UnitItemRequestList';
import SettingsV2 from './components/inventory-v2/pages/Settings';
import CommissaryHome from './components/inventory-v2/pages/CommissaryHome';
import CommissaryLocation from './components/inventory-v2/pages/CommissaryLocation';
import CommissaryItemDetail from './components/inventory-v2/pages/CommissaryItemDetail';
import AlertsPage from './components/inventory-v2/pages/AlertsPage';
import TripListV2 from './components/inventory-v2/pages/TripList';
import TripHomeV2 from './components/inventory-v2/pages/TripHome';
import GroceryListPageV2 from './components/inventory-v2/pages/GroceryListPage';
import LegReconciliationV2 from './components/inventory-v2/pages/LegReconciliation';
import CommissaryKiosk from './components/inventory-v2/pages/CommissaryKiosk';
import ActivityLog from './components/inventory-v2/pages/ActivityLog';

// ─── Wrapper: bridges NotificationContext into InventoryV2Provider ───────────
// Must live outside App so it's a stable component reference, but it's defined
// here because it needs to be inside the module scope where InventoryV2Provider
// is imported. It reads from NotificationProvider (which wraps all routes).
function InventoryRouteWrapper({ children, userRole }: { children: React.ReactNode; userRole: string }) {
  const { addNotification } = useNotificationContext();
  return (
    <InventoryV2Provider userRole={userRole} addNotification={addNotification}>
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
      <NotificationProvider>
        <MaintenanceProvider>
          <HazardProvider>
            <AuditProvider>
              <PassengerFormProvider>
                <ForeFlightSyncProvider>
                <Router>
                  <Routes>
                    {/* Public Routes - No Authentication Required */}
                    <Route path="/public/passenger-form" element={<PublicPassengerForm />} />
                    <Route
                      path="/commissary-kiosk"
                      element={
                        <InventoryRouteWrapper userRole="commissary-kiosk">
                          <CommissaryKiosk />
                        </InventoryRouteWrapper>
                      }
                    />

                    {/* Login Route */}
                    <Route path="/login" element={
                      isAuthenticated ? (
                        <Navigate to="/" replace />
                      ) : (
                        <LoginScreen onLogin={handleLogin} />
                      )
                    } />

                    {/* Protected Routes - Authentication Required */}
                    <Route path="/*" element={
                      !isAuthenticated ? (
                        <Navigate to="/login" replace />
                      ) : (
                        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
                          <Navigation userRole={userRole} additionalRoles={additionalRoles} onLogout={handleLogout}>
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out h-full">
                              <Routes>
                                <Route path="/" element={userRole === 'maintenance-workflow' ? <Navigate to="/maintenance-workflow" replace /> : <Dashboard userRole={userRole} />} />
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
                                <Route path="/airport-evaluations" element={<AirportEvaluations />} />
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
                                <Route path="/documents" element={<DocumentCenter userRole={userRole} />} />

                                {/* Document Management - Document Manager & DMS Manager role only, others get Document Request */}
                                <Route
                                  path="/document-management"
                                  element={
                                    ['document-manager', 'dms-manager'].includes(userRole) ?
                                      <DocumentManagement userRole={userRole} /> :
                                      <DocumentRequest userRole={userRole} />
                                  }
                                />

                                <Route
                                  path="/dms/offline"
                                  element={
                                    <ProtectedRoute userRole={userRole} additionalRoles={additionalRoles} allowedRoles={['dms-manager', 'admin']}>
                                      <OfflineDocuments />
                                    </ProtectedRoute>
                                  }
                                />

                                {/* Document Review Queue - Visible to all, approval actions restricted to document manager */}
                                <Route path="/document-management/queue" element={<DocumentReviewQueue userRole={userRole} />} />

                                <Route path="/document-management/collaborations" element={<DocumentCollaborations userRole={userRole} />} />

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
                                <Route path="/user-safety" element={<UserSafety userRole={userRole} />} />
                                <Route path="/safety" element={<SafetyDashboard userRole={userRole} />} />
                                <Route path="/safety/waivers" element={<WaiverManagement />} />
                                <Route path="/safety/hazards" element={<HazardWorkspace userRole={userRole} />} />
                                <Route path="/safety/hazards/:id" element={<HazardDetailView userRole={userRole} />} />
                                <Route path="/safety/audits" element={<InternalAuditManagement />} />
                                <Route path="/safety/compliance" element={<DocumentCompliance />} />
                                <Route path="/procedural-bulletins" element={<ProceduralBulletins userRole={userRole} />} />
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
                                <Route path="/inventory-v2/inspection/:id/review" element={<InventoryRouteWrapper userRole={userRole}><InspectionReviewV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/inspections" element={<InventoryRouteWrapper userRole={userRole}><AircraftInspectionsV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/recently-completed" element={<InventoryRouteWrapper userRole={userRole}><RecentlyCompletedV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/replenish" element={<InventoryRouteWrapper userRole={userRole}><ReplenishV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/unit-request" element={<InventoryRouteWrapper userRole={userRole}><UnitItemRequestV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/unit-requests" element={<InventoryRouteWrapper userRole={userRole}><UnitItemRequestListV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/settings" element={<InventoryRouteWrapper userRole={userRole}><SettingsV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/commissary" element={<InventoryRouteWrapper userRole={userRole}><CommissaryHome /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/commissary/location/:locationId" element={<InventoryRouteWrapper userRole={userRole}><CommissaryLocation /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/commissary/item/:itemId" element={<InventoryRouteWrapper userRole={userRole}><CommissaryItemDetail /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/alerts" element={<InventoryRouteWrapper userRole={userRole}><AlertsPage /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/trips" element={<InventoryRouteWrapper userRole={userRole}><TripListV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/trips/:tripId" element={<InventoryRouteWrapper userRole={userRole}><TripHomeV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/trips/:tripId/grocery-list" element={<InventoryRouteWrapper userRole={userRole}><GroceryListPageV2 /></InventoryRouteWrapper>} />
                                <Route path="/inventory-v2/trips/:tripId/reconcile" element={<InventoryRouteWrapper userRole={userRole}><LegReconciliationV2 /></InventoryRouteWrapper>} />
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
                                <Route path="/critical-functions" element={<CriticalFunctionsPlan />} />
                                <Route path="/parts-inventory" element={<PartsInventory />} />
                                <Route path="/passenger-forms" element={<PassengerForms />} />
                                <Route path="/tasks-action-items" element={<UnifiedTasksActionItems userRole={userRole} />} />
                                <Route path="/aog-management" element={<AOGManagement />} />
                                <Route path="/upcoming-flights" element={<UpcomingFlights userRole={userRole} />} />
                                <Route path="/tech-log" element={<TechLog userRole={userRole} />} />
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
                                      <TripBuilder
                                        onSave={() => { }}
                                        onCancel={() => window.history.back()}
                                      />
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
                                <Route path="/experimental/scheduling-command" element={<SchedulingCommandCenter />} />
                                <Route path="/experimental/unified-trip" element={<UnifiedTripWorkspace />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                              </Routes>
                            </div>
                          </Navigation>

                          {/* Mobile Bottom Navigation */}
                          <MobileBottomNav userRole={userRole} />

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
              </ForeFlightSyncProvider>
            </PassengerFormProvider>
            </AuditProvider>
          </HazardProvider>
        </MaintenanceProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}