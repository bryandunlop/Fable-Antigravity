import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import {
  TrendingUp,
  Users,
  Plane,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Wrench,
  Shield,
  Star,
  Activity,
  Zap,
  MapPin,
  AlertCircle,
  User,
  Eye,
  Navigation,
  Bookmark,
  BookmarkCheck,
  ChevronUp,
  Layers
} from 'lucide-react';
import { AuditLogger } from '../services/AuditLogger';

export default function LeadDashboard() {
  const navigate = useNavigate();
  const [highlightedPassengers, setHighlightedPassengers] = useState<string[]>(['PAX001', 'PAX003', 'PAX007']);
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null);
  const [selectedPassengerForDetails, setSelectedPassengerForDetails] = useState<any>(null);
  const [showPassengerDetailsDialog, setShowPassengerDetailsDialog] = useState(false);

  // Monitor passenger details view for auditing
  useEffect(() => {
    if (showPassengerDetailsDialog && selectedPassengerForDetails) {
      AuditLogger.log('VIEW_VIP_DETAILS', 'LeadDashboard', {
        passengerId: selectedPassengerForDetails.id,
        name: selectedPassengerForDetails.name
      });
    }
  }, [showPassengerDetailsDialog, selectedPassengerForDetails]);

  // ─── DATA ─────────────────────────────────────────────────────

  // Fleet / Aircraft
  const aircraft = [
    { tail: 'N1PG', type: 'G650', status: 'flying', route: 'KTEB → KMIA', hoursToInsp: 142, location: 'In Air' },
    { tail: 'N2PG', type: 'G650', status: 'maintenance', route: '', hoursToInsp: 0, location: 'KTEB Hangar' },
    { tail: 'N3PG', type: 'G500', status: 'available', route: '', hoursToInsp: 87, location: 'KTEB Ramp' },
    { tail: 'N4PG', type: 'G500', status: 'available', route: '', hoursToInsp: 210, location: 'KMIA FBO' },
    { tail: 'N5PG', type: 'G500', status: 'flying', route: 'KJFK → EGLL', hoursToInsp: 56, location: 'In Air' },
    { tail: 'N6PG', type: 'G650', status: 'available', route: '', hoursToInsp: 178, location: 'KLAS FBO' },
  ];

  // Today's & Upcoming Flights
  const flights = [
    {
      id: 'FLT001', date: '2025-02-06', time: '08:00', route: 'KTEB → KMIA', tail: 'N1PG', type: 'G650',
      status: 'In Air', eta: '45 min', altitude: 41000, speed: 485, paxCount: 8,
      passengers: ['PAX001', 'PAX003'],
      crew: { captain: 'John Smith', fo: 'Sarah Wilson', fa: 'Emily Davis' },
      catering: 'Light lunch service', notes: 'Board Chairman on board'
    },
    {
      id: 'FLT002', date: '2025-02-06', time: '10:30', route: 'KJFK → EGLL', tail: 'N5PG', type: 'G500',
      status: 'In Air', eta: '5h 20m', altitude: 43000, speed: 520, paxCount: 11,
      passengers: [],
      crew: { captain: 'Mike Johnson', fo: 'Tom Anderson', fa: 'Lisa Martinez' },
      catering: 'Mediterranean menu', notes: 'International flight — customs pre-cleared'
    },
    {
      id: 'FLT003', date: '2025-02-06', time: '14:00', route: 'KMIA → KTEB', tail: 'N4PG', type: 'G500',
      status: 'Scheduled', eta: '', altitude: 0, speed: 0, paxCount: 4,
      passengers: ['PAX001'],
      crew: { captain: 'David Brown', fo: 'Emily Johnson', fa: 'Mark Roberts' },
      catering: 'Pending order', notes: 'Repositioning for PAX001 return'
    },
    {
      id: 'FLT005', date: '2025-02-07', time: '09:30', route: 'KTEB → KLAS', tail: 'N6PG', type: 'G650',
      status: 'Confirmed', eta: '', altitude: 0, speed: 0, paxCount: 6,
      passengers: ['PAX003', 'PAX012'],
      crew: { captain: 'John Smith', fo: 'Sarah Wilson', fa: 'Emily Davis' },
      catering: 'Ordered — Asian fusion', notes: 'CEO trip with board member'
    },
    {
      id: 'FLT007', date: '2025-02-08', time: '16:45', route: 'KLAS → KSFO', tail: 'N6PG', type: 'G650',
      status: 'Tentative', eta: '', altitude: 0, speed: 0, paxCount: 3,
      passengers: ['PAX007'],
      crew: { captain: 'TBD', fo: 'TBD', fa: 'TBD' },
      catering: 'Not ordered', notes: 'CFO — pending confirmation'
    }
  ];

  // Delay Alerts
  const delayAlerts = [
    { id: 'DLY001', airport: 'KJFK', type: 'GDP', severity: 'medium', delay: '45 min', impact: 'FLT002 departure was delayed', affectedFlight: 'FLT002' },
    { id: 'DLY002', airport: 'KMIA', type: 'Weather', severity: 'low', delay: '15 min', impact: 'Thunderstorms clearing — FLT003 may be affected', affectedFlight: 'FLT003' },
    { id: 'DLY003', airport: 'EGLL', type: 'Capacity', severity: 'medium', delay: '30 min', impact: 'Heavy traffic — expect arrival delay for FLT002', affectedFlight: 'FLT002' },
  ];

  // Maintenance Activity
  const maintenanceActivity = [
    { id: 'WO-089', aircraft: 'N2PG', type: 'Left Engine Hot Section Inspection', tech: 'Mike Johnson', progress: 65, priority: 'critical', dueDate: 'Today' },
    { id: 'WO-090', aircraft: 'N1PG', type: '100hr Inspection', tech: 'Sarah Williams', progress: 40, priority: 'high', dueDate: 'Feb 8' },
    { id: 'WO-091', aircraft: 'N5PG', type: 'APU Service Bulletin', tech: 'Tom Anderson', progress: 80, priority: 'medium', dueDate: 'Feb 10' },
  ];

  const upcomingMaintenance = [
    { aircraft: 'N3PG', type: '200hr Phase Inspection', dueIn: '87 hrs', date: 'Feb 15' },
    { aircraft: 'N6PG', type: 'Landing Gear Service', dueIn: '178 hrs', date: 'Feb 22' },
  ];

  // VIP Passengers
  const vipPassengers = [
    { id: 'PAX001', name: 'Robert Johnson', role: 'Board Chairman', category: 'BOD', email: 'robert.johnson@email.com', phone: '+1 (555) 123-4567', preferences: 'Window seat, sparkling water, WSJ' },
    { id: 'PAX003', name: 'Michael Chen', role: 'CEO', category: 'C-Suite', email: 'michael.chen@email.com', phone: '+1 (555) 234-5678', preferences: 'Quiet cabin, green tea, no shellfish' },
    { id: 'PAX007', name: 'Jennifer Martinez', role: 'CFO', category: 'C-Suite', email: 'jennifer.martinez@email.com', phone: '+1 (555) 345-6789', preferences: 'Aisle seat, diet coke, Financial Times' },
    { id: 'PAX012', name: 'David Thompson', role: 'Board Member', category: 'BOD', email: 'david.thompson@email.com', phone: '+1 (555) 456-7890', preferences: 'Rear cabin, bourbon, privacy' },
  ];

  // KPIs
  const kpis = [
    { title: 'On-Time Performance', value: '94.2%', change: '+2.1%', trend: 'up', icon: CheckCircle, color: 'text-blue-600' },
    { title: 'Fleet Utilization', value: '87.5%', change: '-1.3%', trend: 'down', icon: Activity, color: 'text-orange-600' },
    { title: 'Safety Score', value: '9.7/10', change: '+0.2', trend: 'up', icon: Shield, color: 'text-green-600' },
    { title: 'Customer Satisfaction', value: '4.8/5', change: '+0.3', trend: 'up', icon: Star, color: 'text-yellow-600' },
  ];

  // ─── HELPERS ──────────────────────────────────────────────────

  const toggleHighlightPassenger = (passengerId: string) => {
    const isAdding = !highlightedPassengers.includes(passengerId);

    setHighlightedPassengers(prev =>
      isAdding
        ? [...prev, passengerId]
        : prev.filter(id => id !== passengerId)
    );

    AuditLogger.log(
      isAdding ? 'TRACK_VIP_PASSENGER' : 'UNTRACK_VIP_PASSENGER',
      'LeadDashboard',
      { passengerId }
    );

    toast.success(
      isAdding
        ? 'Passenger added to tracking'
        : 'Passenger removed from tracking'
    );
  };

  const getPassengerFlights = (passengerId: string) => {
    return flights.filter(f => f.passengers.includes(passengerId));
  };

  const getFlightStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in air': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'tentative': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAircraftStatusStyle = (status: string) => {
    switch (status) {
      case 'flying': return { bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500', label: 'In Flight', textColor: 'text-blue-700' };
      case 'available': return { bg: 'bg-green-50 border-green-200', dot: 'bg-green-500', label: 'Available', textColor: 'text-green-700' };
      case 'maintenance': return { bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500', label: 'Maintenance', textColor: 'text-orange-700' };
      case 'aog': return { bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', label: 'AOG', textColor: 'text-red-700' };
      default: return { bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-500', label: status, textColor: 'text-gray-700' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDelaySeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-orange-500 bg-orange-50';
      case 'low': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  // Quick stats
  const activeFlightsCount = flights.filter(f => f.status === 'In Air').length;
  const availableAircraftCount = aircraft.filter(a => a.status === 'available').length;
  const alertsCount = delayAlerts.length + maintenanceActivity.filter(m => m.priority === 'critical').length;

  // ─── RENDER ───────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1>Lead Dashboard</h1>
          <p className="text-muted-foreground">High-level operations overview</p>
        </div>
        <div className="flex items-center gap-3 mt-3 lg:mt-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/manager-insights')}>
            <Layers className="w-4 h-4 mr-1.5" />
            Manager Insights
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── SECTION 1: STATS STRIP ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900">{activeFlightsCount}</p>
            <p className="text-xs text-blue-600">Active Flights</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-200">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
            <Plane className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-900">{availableAircraftCount}</p>
            <p className="text-xs text-green-600">Aircraft Available</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-purple-50 border-purple-200">
          <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-900">{highlightedPassengers.length}</p>
            <p className="text-xs text-purple-600">Tracked Passengers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-orange-50 border-orange-200">
          <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-900">{alertsCount}</p>
            <p className="text-xs text-orange-600">Active Alerts</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: FLIGHT SCHEDULE + DELAY ALERTS ──────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Flight Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Delay Alerts */}
          {delayAlerts.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delay Alerts</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {delayAlerts.map(alert => (
                  <div key={alert.id} className={`border-l-4 rounded-r-lg p-3 ${getDelaySeverityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{alert.airport}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{alert.type}</Badge>
                        </div>
                        <p className="text-xs text-gray-600">{alert.impact}</p>
                      </div>
                      <span className="text-xs font-bold text-gray-700 shrink-0">+{alert.delay}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Flight List */}
          <div className="space-y-2">
            {flights.map(flight => {
              const isExpanded = expandedFlight === flight.id;
              const isLive = flight.status === 'In Air';
              const hasDelay = delayAlerts.some(d => d.affectedFlight === flight.id);
              const trackedPax = flight.passengers.filter(p => highlightedPassengers.includes(p));
              const trackedPaxNames = trackedPax.map(p => vipPassengers.find(v => v.id === p)?.name).filter(Boolean);

              return (
                <div
                  key={flight.id}
                  className={`border rounded-lg transition-all ${isLive ? 'border-blue-300 bg-blue-50/30' : 'hover:bg-gray-50'} ${hasDelay ? 'ring-1 ring-orange-300' : ''}`}
                >
                  {/* Flight Row */}
                  <button
                    className="w-full flex items-center gap-4 p-3 text-left cursor-pointer"
                    onClick={() => setExpandedFlight(isExpanded ? null : flight.id)}
                  >
                    {/* Time */}
                    <div className="w-14 text-center shrink-0">
                      <p className="font-bold text-sm">{flight.time}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(flight.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-gray-200 shrink-0" />

                    {/* Route & Aircraft */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{flight.route}</span>
                        {isLive && (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            LIVE
                          </span>
                        )}
                        {hasDelay && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{flight.tail} ({flight.type})</span>
                        <span>•</span>
                        <span>{flight.paxCount} pax</span>
                        {isLive && flight.eta && <><span>•</span><span>ETA {flight.eta}</span></>}
                      </div>
                    </div>

                    {/* Tracked Passengers */}
                    {trackedPaxNames.length > 0 && (
                      <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        <BookmarkCheck className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs text-purple-700 font-medium">{trackedPaxNames.join(', ')}</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <Badge className={`${getFlightStatusColor(flight.status)} shrink-0 text-xs`}>
                      {flight.status}
                    </Badge>

                    {/* Expand Icon */}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t bg-gray-50/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Crew</p>
                          <p className="font-medium text-xs">Capt. {flight.crew.captain}</p>
                          <p className="text-xs text-muted-foreground">FO: {flight.crew.fo}</p>
                          <p className="text-xs text-muted-foreground">FA: {flight.crew.fa}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Catering</p>
                          <p className="text-xs">{flight.catering}</p>
                        </div>
                        {isLive && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Flight Data</p>
                            <p className="text-xs">Alt: {flight.altitude?.toLocaleString()} ft</p>
                            <p className="text-xs">Spd: {flight.speed} kts</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Notes</p>
                          <p className="text-xs">{flight.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 3: PASSENGER TRACKING ─────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-purple-600" />
              Tracked Passengers
            </CardTitle>
            <span className="text-xs text-muted-foreground">{vipPassengers.length} total VIP passengers</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vipPassengers.map(passenger => {
              const isTracked = highlightedPassengers.includes(passenger.id);
              const paxFlights = getPassengerFlights(passenger.id);
              const nextFlight = paxFlights[0];

              return (
                <div
                  key={passenger.id}
                  className={`p-3 rounded-lg border-2 transition-all ${isTracked ? 'border-purple-300 bg-purple-50/30' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        {passenger.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{passenger.name}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{passenger.category}</Badge>
                          <span className="text-xs text-muted-foreground">{passenger.role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setSelectedPassengerForDetails(passenger);
                          setShowPassengerDetailsDialog(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleHighlightPassenger(passenger.id)}
                      >
                        {isTracked ? (
                          <BookmarkCheck className="w-3.5 h-3.5 text-purple-600" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Next Flight */}
                  {nextFlight ? (
                    <div className="flex items-center gap-2 p-2 bg-white rounded border text-xs">
                      <Plane className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-medium">{nextFlight.route}</span>
                      <span className="text-muted-foreground">
                        {new Date(nextFlight.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {nextFlight.time}
                      </span>
                      <Badge className={`${getFlightStatusColor(nextFlight.status)} text-[10px] ml-auto`}>{nextFlight.status}</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      No upcoming flights
                    </div>
                  )}
                  {paxFlights.length > 1 && (
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">+{paxFlights.length - 1} more flight{paxFlights.length > 2 ? 's' : ''}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 4: AIRCRAFT STATUS + MAINTENANCE ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Aircraft Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-green-600" />
              Aircraft Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {aircraft.map(ac => {
                const style = getAircraftStatusStyle(ac.status);
                return (
                  <div key={ac.tail} className={`p-3 rounded-lg border ${style.bg}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                        <span className="font-bold text-sm">{ac.tail}</span>
                        <span className="text-xs text-muted-foreground">{ac.type}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${style.textColor}`}>{style.label}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {ac.status === 'flying' ? ac.route : ac.location}
                      </div>
                      {ac.status !== 'maintenance' && (
                        <div className="flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Next inspection in {ac.hoursToInsp} hrs
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right: Maintenance Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              Maintenance Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Work Orders */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Active Work Orders</p>
              <div className="space-y-2">
                {maintenanceActivity.map(wo => (
                  <div key={wo.id} className="p-3 rounded-lg border bg-white">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{wo.aircraft}</span>
                        <Badge className={`${getPriorityColor(wo.priority)} text-[10px] px-1.5 py-0`}>{wo.priority}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{wo.id}</span>
                    </div>
                    <p className="text-xs mb-1.5">{wo.type}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={wo.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-muted-foreground w-8 text-right">{wo.progress}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                      <span>Tech: {wo.tech}</span>
                      <span>Due: {wo.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Upcoming Maintenance */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming</p>
              <div className="space-y-1.5">
                {upcomingMaintenance.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-gray-50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{m.aircraft}</span>
                      <span className="text-muted-foreground">{m.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{m.dueIn}</span>
                      <span>•</span>
                      <span>{m.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SECTION 5: KPI STRIP ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => {
          const IconComponent = kpi.icon;
          return (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg bg-gray-50 ${kpi.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className={`w-3 h-3 ${kpi.trend === 'down' ? 'transform rotate-180' : ''}`} />
                    {kpi.change}
                  </div>
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── PASSENGER DETAILS DIALOG ─────────────────────── */}
      <Dialog open={showPassengerDetailsDialog} onOpenChange={setShowPassengerDetailsDialog}>
        <DialogContent className="max-w-lg">
          {selectedPassengerForDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {selectedPassengerForDetails.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedPassengerForDetails.role} • {selectedPassengerForDetails.category}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{selectedPassengerForDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-medium">{selectedPassengerForDetails.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Preferences</p>
                  <p className="text-sm">{selectedPassengerForDetails.preferences}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming Flights</p>
                  <div className="space-y-2">
                    {getPassengerFlights(selectedPassengerForDetails.id).map(f => (
                      <div key={f.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div className="flex items-center gap-2">
                          <Plane className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-medium">{f.route}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {f.time}
                          </span>
                          <Badge className={`${getFlightStatusColor(f.status)} text-[10px]`}>{f.status}</Badge>
                        </div>
                      </div>
                    ))}
                    {getPassengerFlights(selectedPassengerForDetails.id).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No upcoming flights</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}