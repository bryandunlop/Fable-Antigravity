import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { 
  UserCheck, 
  AlertTriangle, 
  Calendar, 
  Plane,
  Clock,
  TrendingUp,
  Filter,
  Search,
  Download,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Moon,
  Navigation,
  Database
} from 'lucide-react';
import { format, differenceInDays, addDays, addMonths, subDays, isAfter } from 'date-fns';

interface FlightLog {
  id: string;
  date: Date;
  flightNumber: string;
  tailNumber: string;
  origin: string;
  destination: string;
  flightTime: number; // hours
  landings: number;
  nightLandings: number;
  instrumentApproaches: number;
  holds: number;
  isNightFlight: boolean;
  picId: string;
  picName: string;
  sicId: string;
  sicName: string;
}

interface PilotCurrency {
  pilotId: string;
  pilotName: string;
  aircraftType: string;
  lastFlown: Date;
  totalFlightTime: number;
  totalLandings90Days: number;
  nightLandings90Days: number;
  lastNightLanding: Date | null;
  instrumentApproaches180Days: number;
  lastInstrumentApproach: Date | null;
  holds180Days: number;
  lastHold: Date | null;
  lastMedical: Date;
  medicalClass: string;
  lastRecurrent: Date;
  nextRecurrent: Date;
  status: 'current' | 'warning' | 'expired';
  recentFlights: FlightLog[];
}

interface CurrencyRequirement {
  type: string;
  description: string;
  warningDays: number;
  validityDays: number;
  minimumCount?: number;
}

// Currency requirements
const currencyRequirements: CurrencyRequirement[] = [
  {
    type: 'recency',
    description: '90-day landing currency (3 landings)',
    warningDays: 30,
    validityDays: 90,
    minimumCount: 3
  },
  {
    type: 'night',
    description: 'Night currency (3 night landings)',
    warningDays: 30,
    validityDays: 90,
    minimumCount: 3
  },
  {
    type: 'instrument',
    description: 'Instrument currency (6 approaches, holds, intercepts)',
    warningDays: 60,
    validityDays: 180,
    minimumCount: 6
  },
  {
    type: 'holds',
    description: 'Holding procedures',
    warningDays: 60,
    validityDays: 180,
    minimumCount: 1
  },
  {
    type: 'recurrent',
    description: 'Recurrent training (Annual)',
    warningDays: 30,
    validityDays: 365
  }
];

interface PilotCurrencyProps {
  userRole: string;
  pilotId?: string;
}

export default function PilotCurrency({ userRole, pilotId }: PilotCurrencyProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aircraftFilter, setAircraftFilter] = useState('all');
  const [selectedPilot, setSelectedPilot] = useState<PilotCurrency | null>(null);
  const [pilotCurrencies, setPilotCurrencies] = useState<PilotCurrency[]>([]);
  const [flightLogs, setFlightLogs] = useState<FlightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Check if user is pilot (viewing own data) or scheduling (can view all)
  const isPilotView = userRole === 'pilot' && pilotId;
  const canViewAll = userRole === 'scheduling' || userRole === 'admin' || userRole === 'lead';

  // Fetch flight logs from MyAirOps API
  const fetchFlightLogs = async () => {
    setSyncing(true);
    try {
      // TODO: Replace with actual MyAirOps API endpoint
      // const response = await fetch('https://api.myairops.com/v1/flight-logs', {
      //   headers: {
      //     'Authorization': `Bearer ${process.env.MYAIROPS_API_KEY}`,
      //     'Content-Type': 'application/json'
      //   },
      //   params: {
      //     startDate: subDays(new Date(), 365).toISOString(), // Last year
      //     endDate: new Date().toISOString()
      //   }
      // });
      // const data = await response.json();

      // Mock flight log data
      const mockFlightLogs: FlightLog[] = [
        // Recent flights for John Smith (P001)
        {
          id: 'FL-001',
          date: subDays(new Date(), 5),
          flightNumber: 'OPS-101',
          tailNumber: 'N650GA',
          origin: 'KTEB',
          destination: 'KMIA',
          flightTime: 2.8,
          landings: 1,
          nightLandings: 0,
          instrumentApproaches: 2,
          holds: 1,
          isNightFlight: false,
          picId: 'P001',
          picName: 'John Smith',
          sicId: 'P002',
          sicName: 'Sarah Johnson'
        },
        {
          id: 'FL-002',
          date: subDays(new Date(), 12),
          flightNumber: 'OPS-102',
          tailNumber: 'N650GA',
          origin: 'KMIA',
          destination: 'KPBI',
          flightTime: 0.8,
          landings: 1,
          nightLandings: 1,
          instrumentApproaches: 1,
          holds: 0,
          isNightFlight: true,
          picId: 'P001',
          picName: 'John Smith',
          sicId: 'P002',
          sicName: 'Sarah Johnson'
        },
        {
          id: 'FL-003',
          date: subDays(new Date(), 25),
          flightNumber: 'OPS-103',
          tailNumber: 'N650GB',
          origin: 'KTEB',
          destination: 'KBOS',
          flightTime: 1.2,
          landings: 1,
          nightLandings: 0,
          instrumentApproaches: 2,
          holds: 1,
          isNightFlight: false,
          picId: 'P001',
          picName: 'John Smith',
          sicId: 'P003',
          sicName: 'Mike Davis'
        },
        {
          id: 'FL-004',
          date: subDays(new Date(), 45),
          flightNumber: 'OPS-104',
          tailNumber: 'N650GA',
          origin: 'KBOS',
          destination: 'KSFO',
          flightTime: 5.5,
          landings: 1,
          nightLandings: 1,
          instrumentApproaches: 1,
          holds: 0,
          isNightFlight: true,
          picId: 'P001',
          picName: 'John Smith',
          sicId: 'P002',
          sicName: 'Sarah Johnson'
        },
        {
          id: 'FL-005',
          date: subDays(new Date(), 78),
          flightNumber: 'OPS-105',
          tailNumber: 'N650GC',
          origin: 'KSFO',
          destination: 'KLAX',
          flightTime: 1.3,
          landings: 1,
          nightLandings: 0,
          instrumentApproaches: 2,
          holds: 1,
          isNightFlight: false,
          picId: 'P001',
          picName: 'John Smith',
          sicId: 'P003',
          sicName: 'Mike Davis'
        },
        // Flights for Sarah Johnson (P002)
        {
          id: 'FL-006',
          date: subDays(new Date(), 2),
          flightNumber: 'OPS-201',
          tailNumber: 'N650GB',
          origin: 'KPBI',
          destination: 'KTEB',
          flightTime: 2.5,
          landings: 1,
          nightLandings: 1,
          instrumentApproaches: 2,
          holds: 1,
          isNightFlight: true,
          picId: 'P002',
          picName: 'Sarah Johnson',
          sicId: 'P001',
          sicName: 'John Smith'
        },
        {
          id: 'FL-007',
          date: subDays(new Date(), 18),
          flightNumber: 'OPS-202',
          tailNumber: 'N650GB',
          origin: 'KTEB',
          destination: 'KMCO',
          flightTime: 2.8,
          landings: 1,
          nightLandings: 0,
          instrumentApproaches: 1,
          holds: 0,
          isNightFlight: false,
          picId: 'P002',
          picName: 'Sarah Johnson',
          sicId: 'P003',
          sicName: 'Mike Davis'
        },
        {
          id: 'FL-008',
          date: subDays(new Date(), 35),
          flightNumber: 'OPS-203',
          tailNumber: 'N650GC',
          origin: 'KMCO',
          destination: 'KATL',
          flightTime: 1.2,
          landings: 1,
          nightLandings: 1,
          instrumentApproaches: 2,
          holds: 1,
          isNightFlight: true,
          picId: 'P002',
          picName: 'Sarah Johnson',
          sicId: 'P001',
          sicName: 'John Smith'
        },
        {
          id: 'FL-009',
          date: subDays(new Date(), 55),
          flightNumber: 'OPS-204',
          tailNumber: 'N650GA',
          origin: 'KATL',
          destination: 'KDFW',
          flightTime: 2.0,
          landings: 1,
          nightLandings: 0,
          instrumentApproaches: 1,
          holds: 0,
          isNightFlight: false,
          picId: 'P002',
          picName: 'Sarah Johnson',
          sicId: 'P003',
          sicName: 'Mike Davis'
        },
        // Old flights for Mike Johnson (P003) - expired currency
        {
          id: 'FL-010',
          date: subDays(new Date(), 110),
          flightNumber: 'OPS-301',
          tailNumber: 'N650GD',
          origin: 'KJFK',
          destination: 'KLAX',
          flightTime: 5.5,
          landings: 1,
          nightLandings: 0,
          instrumentApproaches: 1,
          holds: 0,
          isNightFlight: false,
          picId: 'P003',
          picName: 'Mike Johnson',
          sicId: 'P001',
          sicName: 'John Smith'
        }
      ];

      setFlightLogs(mockFlightLogs);
      calculatePilotCurrencies(mockFlightLogs);
      setLastSync(new Date());
      toast.success('Flight logs synchronized from MyAirOps');
    } catch (error) {
      console.error('Error fetching flight logs:', error);
      toast.error('Failed to sync flight logs from MyAirOps');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  // Calculate pilot currencies from flight logs
  const calculatePilotCurrencies = (logs: FlightLog[]) => {
    const now = new Date();
    const pilots = new Map<string, PilotCurrency>();

    // Mock medical and recurrent data (in production, this would come from API)
    const pilotInfo: Record<string, { medical: Date; medicalClass: string; recurrent: Date }> = {
      P001: {
        medical: subDays(now, 200),
        medicalClass: 'First Class',
        recurrent: subDays(now, 60)
      },
      P002: {
        medical: subDays(now, 30),
        medicalClass: 'First Class',
        recurrent: subDays(now, 20)
      },
      P003: {
        medical: subDays(now, 400),
        medicalClass: 'Second Class',
        recurrent: subDays(now, 450)
      }
    };

    // Process each flight log
    logs.forEach(log => {
      // Process PIC
      if (!pilots.has(log.picId)) {
        const info = pilotInfo[log.picId] || {
          medical: subDays(now, 180),
          medicalClass: 'First Class',
          recurrent: subDays(now, 180)
        };

        pilots.set(log.picId, {
          pilotId: log.picId,
          pilotName: log.picName,
          aircraftType: 'G650',
          lastFlown: log.date,
          totalFlightTime: 0,
          totalLandings90Days: 0,
          nightLandings90Days: 0,
          lastNightLanding: null,
          instrumentApproaches180Days: 0,
          lastInstrumentApproach: null,
          holds180Days: 0,
          lastHold: null,
          lastMedical: info.medical,
          medicalClass: info.medicalClass,
          lastRecurrent: info.recurrent,
          nextRecurrent: addMonths(info.recurrent, 12),
          status: 'current',
          recentFlights: []
        });
      }

      const pilot = pilots.get(log.picId)!;

      // Update last flown date
      if (isAfter(log.date, pilot.lastFlown)) {
        pilot.lastFlown = log.date;
      }

      // Add to recent flights
      pilot.recentFlights.push(log);

      // Calculate currency within time windows
      const daysSinceFlight = differenceInDays(now, log.date);

      // 90-day currency
      if (daysSinceFlight <= 90) {
        pilot.totalLandings90Days += log.landings;
        pilot.nightLandings90Days += log.nightLandings;
      }

      // 180-day instrument currency
      if (daysSinceFlight <= 180) {
        pilot.instrumentApproaches180Days += log.instrumentApproaches;
        pilot.holds180Days += log.holds;
      }

      // Track last occurrences
      if (log.nightLandings > 0) {
        if (!pilot.lastNightLanding || isAfter(log.date, pilot.lastNightLanding)) {
          pilot.lastNightLanding = log.date;
        }
      }

      if (log.instrumentApproaches > 0) {
        if (!pilot.lastInstrumentApproach || isAfter(log.date, pilot.lastInstrumentApproach)) {
          pilot.lastInstrumentApproach = log.date;
        }
      }

      if (log.holds > 0) {
        if (!pilot.lastHold || isAfter(log.date, pilot.lastHold)) {
          pilot.lastHold = log.date;
        }
      }

      // Calculate total flight time
      pilot.totalFlightTime += log.flightTime;

      // Process SIC (similar logic but as SIC time)
      if (log.sicId && !pilots.has(log.sicId)) {
        const info = pilotInfo[log.sicId] || {
          medical: subDays(now, 180),
          medicalClass: 'First Class',
          recurrent: subDays(now, 180)
        };

        pilots.set(log.sicId, {
          pilotId: log.sicId,
          pilotName: log.sicName,
          aircraftType: 'G650',
          lastFlown: log.date,
          totalFlightTime: 0,
          totalLandings90Days: 0,
          nightLandings90Days: 0,
          lastNightLanding: null,
          instrumentApproaches180Days: 0,
          lastInstrumentApproach: null,
          holds180Days: 0,
          lastHold: null,
          lastMedical: info.medical,
          medicalClass: info.medicalClass,
          lastRecurrent: info.recurrent,
          nextRecurrent: addMonths(info.recurrent, 12),
          status: 'current',
          recentFlights: []
        });
      }
    });

    // Determine overall status for each pilot
    const pilotArray = Array.from(pilots.values()).map(pilot => {
      const statuses: string[] = [];

      // Check landing currency
      if (pilot.totalLandings90Days < 3) {
        statuses.push('expired');
      } else if (pilot.lastFlown && differenceInDays(now, pilot.lastFlown) > 60) {
        statuses.push('warning');
      }

      // Check night currency
      if (pilot.nightLandings90Days < 3) {
        statuses.push('warning');
      }

      // Check instrument currency
      if (pilot.instrumentApproaches180Days < 6) {
        statuses.push('warning');
      }

      // Check recurrent training
      const daysSinceRecurrent = differenceInDays(now, pilot.lastRecurrent);
      if (daysSinceRecurrent > 365) {
        statuses.push('expired');
      } else if (daysSinceRecurrent > 335) {
        statuses.push('warning');
      }

      // Determine overall status
      if (statuses.includes('expired')) {
        pilot.status = 'expired';
      } else if (statuses.includes('warning')) {
        pilot.status = 'warning';
      } else {
        pilot.status = 'current';
      }

      // Sort recent flights by date (most recent first)
      pilot.recentFlights.sort((a, b) => b.date.getTime() - a.date.getTime());

      return pilot;
    });

    setPilotCurrencies(pilotArray);
  };

  useEffect(() => {
    fetchFlightLogs();

    // Auto-sync every 10 minutes
    const interval = setInterval(fetchFlightLogs, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredPilots = useMemo(() => {
    let pilotsToShow = pilotCurrencies;
    
    // Role-based filtering: pilots only see their own data
    if (isPilotView && pilotId) {
      pilotsToShow = pilotCurrencies.filter(pilot => pilot.pilotId === pilotId);
    }
    // Scheduling and admins can see all pilots
    else if (!canViewAll) {
      // If not pilot view and not allowed to view all, return empty
      pilotsToShow = [];
    }
    
    return pilotsToShow.filter(pilot => {
      const matchesSearch = pilot.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pilot.aircraftType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || pilot.status === statusFilter;
      const matchesAircraft = aircraftFilter === 'all' || pilot.aircraftType === aircraftFilter;
      
      return matchesSearch && matchesStatus && matchesAircraft;
    });
  }, [pilotCurrencies, searchTerm, statusFilter, aircraftFilter, isPilotView, pilotId, canViewAll]);

  const getCurrencyStatus = (pilot: PilotCurrency, requirement: CurrencyRequirement) => {
    const now = new Date();
    let lastDate: Date | null = null;
    let count = 0;
    let daysRemaining = 0;

    switch (requirement.type) {
      case 'recency':
        lastDate = pilot.lastFlown;
        count = pilot.totalLandings90Days;
        daysRemaining = 90 - differenceInDays(now, lastDate);
        break;
      case 'night':
        lastDate = pilot.lastNightLanding;
        count = pilot.nightLandings90Days;
        if (lastDate) {
          daysRemaining = 90 - differenceInDays(now, lastDate);
        }
        break;
      case 'instrument':
        lastDate = pilot.lastInstrumentApproach;
        count = pilot.instrumentApproaches180Days;
        if (lastDate) {
          daysRemaining = 180 - differenceInDays(now, lastDate);
        }
        break;
      case 'holds':
        lastDate = pilot.lastHold;
        count = pilot.holds180Days;
        if (lastDate) {
          daysRemaining = 180 - differenceInDays(now, lastDate);
        }
        break;
      case 'recurrent':
        lastDate = pilot.lastRecurrent;
        count = 1;
        daysRemaining = 365 - differenceInDays(now, lastDate);
        break;
      default:
        return { status: 'unknown', daysRemaining: 0, message: 'Unknown', count: 0 };
    }

    // Check if meets minimum count requirement
    const meetsMinimum = !requirement.minimumCount || count >= requirement.minimumCount;

    if (!lastDate || !meetsMinimum || daysRemaining <= 0) {
      return { status: 'expired', daysRemaining: 0, message: 'Expired', count };
    } else if (daysRemaining <= requirement.warningDays) {
      return { status: 'warning', daysRemaining, message: `${daysRemaining} days left`, count };
    } else {
      return { status: 'current', daysRemaining, message: `Current (${count})`, count };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'current':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Current</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'expired':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Calculate summary statistics
  const summaryStats = {
    totalPilots: pilotCurrencies.length,
    currentPilots: pilotCurrencies.filter(p => p.status === 'current').length,
    warningPilots: pilotCurrencies.filter(p => p.status === 'warning').length,
    expiredPilots: pilotCurrencies.filter(p => p.status === 'expired').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading flight logs from MyAirOps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2">
              <UserCheck className="w-6 h-6" />
              Pilot Currency Dashboard
            </h1>
            <p className="text-muted-foreground">Auto-synced from MyAirOps API • Real-time currency tracking</p>
          </div>
          <div className="flex items-center gap-4">
            {lastSync && (
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Last synced: {format(lastSync, 'HH:mm:ss')}
              </div>
            )}
            <Button
              onClick={fetchFlightLogs}
              disabled={syncing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync from MyAirOps
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Live Dashboard</TabsTrigger>
          <TabsTrigger value="flight-logs">Flight Logs</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
        </TabsList>

        {/* Live Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pilots</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalPilots}</div>
                <p className="text-xs text-muted-foreground">Active in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current</CardTitle>
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summaryStats.currentPilots}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryStats.totalPilots > 0 
                    ? ((summaryStats.currentPilots / summaryStats.totalPilots) * 100).toFixed(0) 
                    : 0}% of fleet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{summaryStats.warningPilots}</div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expired</CardTitle>
                <div className="h-4 w-4 rounded-full bg-red-500"></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summaryStats.expiredPilots}</div>
                <p className="text-xs text-muted-foreground">Not current</p>
              </CardContent>
            </Card>
          </div>

          {/* Critical Alerts */}
          {summaryStats.expiredPilots > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Critical Alert:</strong> {summaryStats.expiredPilots} pilot(s) have expired currency and are not eligible for flight duties.
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Pilots</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aircraft">Aircraft Type</Label>
                  <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by aircraft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Aircraft</SelectItem>
                      <SelectItem value="G650">Gulfstream G650</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pilot Currency Table */}
          <Card>
            <CardHeader>
              <CardTitle>Pilot Currency Status (Auto-calculated from MyAirOps)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pilot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Flown</TableHead>
                      <TableHead>Landings (90d)</TableHead>
                      <TableHead>Night (90d)</TableHead>
                      <TableHead>Instrument (180d)</TableHead>
                      <TableHead>Recurrent</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPilots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No pilots found matching filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPilots.map((pilot) => {
                        const recencyStatus = getCurrencyStatus(pilot, currencyRequirements.find(r => r.type === 'recency')!);
                        const nightStatus = getCurrencyStatus(pilot, currencyRequirements.find(r => r.type === 'night')!);
                        const instrumentStatus = getCurrencyStatus(pilot, currencyRequirements.find(r => r.type === 'instrument')!);
                        const recurrentStatus = getCurrencyStatus(pilot, currencyRequirements.find(r => r.type === 'recurrent')!);
                        
                        return (
                          <TableRow key={pilot.pilotId}>
                            <TableCell className="font-medium">{pilot.pilotName}</TableCell>
                            <TableCell>{getStatusBadge(pilot.status)}</TableCell>
                            <TableCell>{format(pilot.lastFlown, 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className={getStatusColor(recencyStatus.status)}>
                                  {recencyStatus.count}/3
                                </span>
                                {recencyStatus.status === 'expired' && <XCircle className="w-4 h-4 text-red-600" />}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Moon className="w-4 h-4 text-blue-600" />
                                <span className={getStatusColor(nightStatus.status)}>
                                  {nightStatus.count}/3
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-purple-600" />
                                <span className={getStatusColor(instrumentStatus.status)}>
                                  {instrumentStatus.count}/6
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={getStatusColor(recurrentStatus.status)}>
                                {format(pilot.nextRecurrent, 'MMM yyyy')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedPilot(pilot)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flight Logs Tab */}
        <TabsContent value="flight-logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" />
                Recent Flight Logs from MyAirOps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Flight #</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>PIC</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Ldgs</TableHead>
                      <TableHead>Night</TableHead>
                      <TableHead>Appr</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flightLogs.slice(0, 20).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(log.date, 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="font-medium">{log.flightNumber}</TableCell>
                        <TableCell>{log.tailNumber}</TableCell>
                        <TableCell>{log.origin} → {log.destination}</TableCell>
                        <TableCell>{log.picName}</TableCell>
                        <TableCell>{log.flightTime.toFixed(1)}h</TableCell>
                        <TableCell>{log.landings}</TableCell>
                        <TableCell>
                          {log.nightLandings > 0 && (
                            <div className="flex items-center gap-1">
                              <Moon className="w-4 h-4 text-blue-600" />
                              {log.nightLandings}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{log.instrumentApproaches}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>FAA Currency Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currencyRequirements.map((requirement, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h3 className="font-medium">{requirement.description}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Valid for {requirement.validityDays} days • Warning at {requirement.warningDays} days
                      {requirement.minimumCount && ` • Minimum: ${requirement.minimumCount}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pilot Detail Modal */}
      {selectedPilot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Currency Details - {selectedPilot.pilotName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Aircraft Type</Label>
                  <p>{selectedPilot.aircraftType}</p>
                </div>
                <div>
                  <Label>Overall Status</Label>
                  {getStatusBadge(selectedPilot.status)}
                </div>
                <div>
                  <Label>Last Flown</Label>
                  <p>{format(selectedPilot.lastFlown, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <Label>Total Flight Time (All Time)</Label>
                  <p>{selectedPilot.totalFlightTime.toFixed(1)} hours</p>
                </div>
              </div>

              <div>
                <Label className="text-lg mb-4">Currency Status</Label>
                <div className="space-y-3 mt-2">
                  {currencyRequirements.map((req, index) => {
                    const status = getCurrencyStatus(selectedPilot, req);
                    return (
                      <div key={index} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                        <div>
                          <span className="text-sm font-medium">{req.description}</span>
                          {req.minimumCount && (
                            <p className="text-xs text-muted-foreground">
                              Count: {status.count}/{req.minimumCount}
                            </p>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${getStatusColor(status.status)}`}>
                          {status.message}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-lg mb-4">Recent Flights (from MyAirOps)</Label>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                  {selectedPilot.recentFlights.slice(0, 10).map((flight) => (
                    <div key={flight.id} className="p-3 border rounded text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{flight.flightNumber} • {flight.tailNumber}</div>
                          <div className="text-muted-foreground">{flight.origin} → {flight.destination}</div>
                        </div>
                        <div className="text-right">
                          <div>{format(flight.date, 'MMM dd, yyyy')}</div>
                          <div className="text-muted-foreground">{flight.flightTime.toFixed(1)}h</div>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span>Ldgs: {flight.landings}</span>
                        {flight.nightLandings > 0 && (
                          <span className="flex items-center gap-1">
                            <Moon className="w-3 h-3" /> Night: {flight.nightLandings}
                          </span>
                        )}
                        {flight.instrumentApproaches > 0 && (
                          <span>Appr: {flight.instrumentApproaches}</span>
                        )}
                        {flight.holds > 0 && (
                          <span>Holds: {flight.holds}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setSelectedPilot(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}