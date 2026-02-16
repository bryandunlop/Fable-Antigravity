import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { HazardProvider } from './contexts/HazardContext';
import { NotificationProvider } from './components/contexts/NotificationContext';
import { MaintenanceProvider } from './components/contexts/MaintenanceContext';
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
import DocumentReviewQueue from './components/DocumentReviewQueue';
import DocumentCollaborations from './components/DocumentCollaborations';
import LeadDashboard from './components/LeadDashboard';
import AirportServicesDatabase from './components/AirportServicesDatabase';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import MaintenanceHub from './components/MaintenanceHub';
import VacationRequest from './components/VacationRequest';
import FuelFarmTracker from './components/FuelFarmTracker';
import SafetyDashboard from './components/SafetyDashboard';
import WaiverManagement from './components/WaiverManagement';
import HazardReporting from './components/HazardReporting';
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
import CrewManagement from './components/CrewManagement';
import PartsInventory from './components/PartsInventory';
import TripCoordination from './components/TripCoordination';
import CrewSchedulingWorkload from './components/CrewSchedulingWorkload';
import FlightOperationsCenter from './components/FlightOperationsCenter';
import EnhancedFRATForm from './components/EnhancedFRATForm';
import EnhancedGRATForm from './components/EnhancedGRATForm';
import FormFieldManager from './components/FormFieldManager';
import FRATFormBuilder from './components/FRATFormBuilder';
import ProceduralBulletins from './components/ProceduralBulletins';
import ItineraryBuilderV2 from './components/ItineraryBuilderV2';

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
import UserSettings from './components/UserSettings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>('pilot');

  const handleLogin = (role: string) => {
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('pilot');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <NotificationProvider>
      <MaintenanceProvider>
        <FuelRequestProvider>
          <HazardProvider>

            <Router>
              <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#001a5c] to-black text-slate-200">
                <Navigation userRole={userRole} onLogout={handleLogout}>
                  <Routes>
                    <Route path="/" element={<Dashboard userRole={userRole} />} />
                    <Route path="/aircraft" element={<AircraftStatus />} />
                    <Route path="/fleet-map" element={<LiveFleetMap />} />
                    <Route path="/frat" element={<PreflightWorkflow />} />
                    <Route path="/frat/enhanced" element={<EnhancedFRATForm userRole={userRole} />} />
                    <Route path="/frat/my-submissions" element={<MyFRATSubmissions userRole={userRole} />} />
                    <Route
                      path="/frat/review"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['safety', 'admin']}>
                          <FRATReview />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/airport-evaluations" element={<AirportEvaluations />} />
                    <Route path="/pilot-currency" element={<PilotCurrency userRole={userRole} pilotId={userRole === 'pilot' ? 'P001' : undefined} />} />
                    <Route path="/fuel-load-request" element={<FuelLoadRequest />} />

                    <Route path="/aircraft-cleaning" element={<AircraftCleaning />} />
                    <Route path="/aircraft-cleaning/workflow/:id" element={<CleaningWorkflow />} />
                    <Route path="/aircraft-cleaning/manager-dashboard" element={<CleaningManagerDashboard />} />
                    <Route path="/aircraft-cleaning/new-workflow" element={<NewCleaningWorkflow />} />
                    <Route path="/maintenance" element={<MaintenanceBoard />} />
                    <Route path="/maintenance-hub" element={<MaintenanceHub />} />
                    <Route path="/grat/enhanced" element={<EnhancedGRATForm userRole={userRole} />} />
                    <Route path="/work-orders" element={<WorkOrders />} />
                    <Route path="/tech-work-analytics" element={<TechWorkAnalytics />} />
                    <Route path="/mttr-dashboard" element={<MTTRDashboard />} />
                    <Route path="/mel-cdl" element={<MELCDLManagement />} />
                    <Route path="/car-tracking" element={<CarTracking />} />
                    <Route path="/passenger-database" element={<PassengerDatabase userRole={userRole} />} />

                    <Route path="/admin" element={<AdminUserManagement />} />
                    <Route path="/admin/airport-evaluation-officer" element={<AirportEvaluationOfficer />} />
                    <Route path="/schedule" element={<ScheduleCalendar />} />
                    <Route path="/documents" element={<DocumentCenter userRole={userRole} />} />

                    {/* Document Management - Document Manager role only, others get Document Request */}
                    <Route
                      path="/document-management"
                      element={
                        userRole === 'document-manager' ?
                          <DocumentManagement userRole={userRole} /> :
                          <DocumentRequest userRole={userRole} />
                      }
                    />

                    {/* Document Review Queue - Visible to all, approval actions restricted to document manager */}
                    <Route path="/document-management/queue" element={<DocumentReviewQueue userRole={userRole} />} />

                    <Route path="/document-management/collaborations" element={<DocumentCollaborations userRole={userRole} />} />

                    <Route path="/lead-dashboard" element={<LeadDashboard />} />
                    <Route
                      path="/live-metrics"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['lead', 'admin']}>
                          <LiveMetricsDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/airport-services" element={<AirportServicesDatabase />} />
                    <Route path="/maintenance-dashboard" element={<MaintenanceDashboard />} />
                    <Route path="/vacation-request" element={<VacationRequest userRole={userRole} />} />
                    <Route path="/fuel-farm" element={<FuelFarmTracker />} />
                    <Route path="/user-safety" element={<UserSafety userRole={userRole} />} />
                    <Route path="/safety" element={<SafetyDashboard userRole={userRole} />} />
                    <Route path="/safety/waivers" element={<WaiverManagement />} />
                    <Route path="/safety/hazards" element={<HazardReporting />} />
                    <Route path="/safety/audits" element={<InternalAuditManagement />} />
                    <Route path="/safety/compliance" element={<DocumentCompliance />} />
                    <Route path="/procedural-bulletins" element={<ProceduralBulletins userRole={userRole} />} />
                    <Route
                      path="/safety/form-fields"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['safety', 'admin']}>
                          <FormFieldManager userRole={userRole} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/safety/frat-builder"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['safety', 'admin']}>
                          <FRATFormBuilder />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/safety/risk-profile"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['safety', 'admin']}>
                          <SafetyRiskProfile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/safety/manager-dashboard"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['safety', 'admin']}>
                          <SafetyManagerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/safety/hazard-workflow/:id"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['safety', 'admin', 'lead', 'maintenance', 'pilot']}>
                          <HazardWorkflow />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/safety/preflight-workflow/:id"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['safety', 'admin']}>
                          <PreflightWorkflow />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/catering-tracker" element={<CateringTracker />} />
                    <Route path="/catering-orders" element={<CateringOrders />} />
                    <Route path="/restaurant-database" element={<RestaurantDatabase userRole={userRole} />} />
                    <Route path="/aircraft-inventory" element={<AircraftInventory />} />
                    <Route path="/post-flight-checklist" element={<PostFlightChecklist userRole={userRole} />} />
                    <Route path="/turndown-form" element={<TurndownForm />} />
                    <Route path="/turndown-reports" element={<TurndownReports />} />
                    <Route path="/scheduling-dashboard" element={<SchedulingDashboard />} />
                    <Route path="/trip-coordination" element={<TripCoordination />} />
                    <Route
                      path="/crew-scheduling-workload"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['scheduling', 'admin', 'lead']}>
                          <CrewSchedulingWorkload />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/critical-functions" element={<CriticalFunctionsPlan />} />
                    <Route path="/crew-management" element={<CrewManagement />} />
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
                        <ProtectedRoute userRole={userRole} allowedRoles={['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling']}>
                          <FlightOperationsCenter />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/flight-family"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['pilot', 'inflight', 'admin', 'lead', 'safety', 'maintenance', 'scheduling', 'document-manager', 'admin-assistant']}>
                          <FlightFamily userRole={userRole} />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/booking-profile"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['admin-assistant', 'admin', 'lead']}>
                          <BookingProfile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/trip-builder/:tripId?"
                      element={
                        <ProtectedRoute userRole={userRole} allowedRoles={['admin-assistant', 'admin', 'lead']}>
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
                        <ProtectedRoute userRole={userRole} allowedRoles={['admin-assistant', 'admin', 'lead']}>
                          <ItineraryBuilderV2 />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/settings" element={<UserSettings userRole={userRole} userName="User" />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Navigation>

                {/* Mobile Bottom Navigation */}
                <MobileBottomNav userRole={userRole} />

                {/* Toast Notifications */}
                <Toaster />
              </div>
            </Router>

          </HazardProvider>
        </FuelRequestProvider>
      </MaintenanceProvider>
    </NotificationProvider>
  );
}