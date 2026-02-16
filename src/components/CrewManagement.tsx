import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle,
  XCircle,
  Plane,
  User,
  Bell,
  Award,
  FileText,
  Shield,
  TrendingUp,
  Filter,
  Download,
  Plus,
  Settings,
  Globe,
  MapPin,
  BarChart3,
  Home,
  Moon,
  PieChart
} from 'lucide-react';
import { toast } from 'sonner';

interface CrewMember {
  id: string;
  name: string;
  employeeId: string;
  role: 'captain' | 'first-officer' | 'flight-attendant';
  position: string;
  currentDutyHours: number;
  maxDutyHours: number;
  restHours: number;
  minRestHours: number;
  fatigueLevelStart: number;
  fatigueLevelCurrent: number;
  status: 'available' | 'on-duty' | 'rest' | 'unavailable' | 'training';
  currentLocation: string;
  nextDutyStart?: string;

  // Currency Information
  medicalCertificate: {
    type: 'Class 1' | 'Class 2' | 'Class 3';
    number: string;
    issueDate: string;
    expiryDate: string;
    restrictions?: string;
  };

  flightReview: {
    lastCompleted: string;
    expiryDate: string;
    instructor: string;
    aircraftType: string;
  };

  instrumentProficiency: {
    lastCompleted: string;
    expiryDate: string;
    approach: string;
    instructor: string;
  };

  typeRatings: Array<{
    aircraftType: string;
    rating: string;
    checkRideDate: string;
    expiryDate: string;
    examiner: string;
  }>;

  recurrentTraining: {
    lastCompleted: string;
    expiryDate: string;
    trainingCenter: string;
    completedModules: string[];
  };

  lineChecks: Array<{
    date: string;
    examiner: string;
    aircraftType: string;
    result: 'Pass' | 'Fail';
    notes?: string;
  }>;
}

interface FlightAssignment {
  id: string;
  flightNumber: string;
  aircraft: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  captain: string;
  firstOfficer: string;
  flightAttendants: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  dutyStart: string;
  dutyEnd: string;
  departureCountry?: string;
  arrivalCountry?: string;
  overnightStops?: number;
  totalNightsAway?: number;
}

interface TravelRecord {
  id: string;
  crewId: string;
  flightId: string;
  departureDate: string;
  returnDate: string;
  destinations: Array<{
    airport: string;
    country: string;
    city: string;
    nightsStayed: number;
  }>;
  totalNightsAway: number;
  tripType: 'domestic' | 'international' | 'multi-country';
  role: 'captain' | 'first-officer' | 'flight-attendant';
}

interface CountryVisitStats {
  country: string;
  visits: number;
  totalNights: number;
  lastVisit: string;
  averageStayLength: number;
}

interface CrewTravelStats {
  crewId: string;
  crewName: string;
  totalTrips: number;
  totalNightsAway: number;
  internationalTrips: number;
  domesticTrips: number;
  countryVisits: CountryVisitStats[];
  averageNightsPerTrip: number;
  longestTripNights: number;
  shortestTripNights: number;
  mostVisitedCountry: string;
  lastTripDate: string;
  currentYear: {
    trips: number;
    nightsAway: number;
    countries: number;
  };
  lastSixMonths: {
    trips: number;
    nightsAway: number;
    countries: number;
  };
}

interface Alert {
  id: string;
  crewId: string;
  crewName: string;
  type: 'duty-limit' | 'rest-violation' | 'currency-expiry' | 'fatigue-risk' | 'medical-expiry' | 'training-due';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  expiryDate?: string;
  daysRemaining?: number;
  acknowledged: boolean;
  createdAt: string;
}

export default function CrewManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [flightAssignments, setFlightAssignments] = useState<FlightAssignment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [travelRecords, setTravelRecords] = useState<TravelRecord[]>([]);
  const [crewTravelStats, setCrewTravelStats] = useState<CrewTravelStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('current-year');

  useEffect(() => {
    // Initialize with comprehensive mock data
    const mockCrewMembers: CrewMember[] = [
      {
        id: '1',
        name: 'Captain John Smith',
        employeeId: 'EMP001',
        role: 'captain',
        position: 'Pilot-in-Command',
        currentDutyHours: 8.5,
        maxDutyHours: 14,
        restHours: 6,
        minRestHours: 10,
        fatigueLevelStart: 2,
        fatigueLevelCurrent: 4,
        status: 'on-duty',
        currentLocation: 'KATL',
        nextDutyStart: '2025-01-02T06:00:00',

        medicalCertificate: {
          type: 'Class 1',
          number: 'FAA123456789',
          issueDate: '2024-06-15',
          expiryDate: '2025-06-15',
          restrictions: 'Must wear corrective lenses'
        },

        flightReview: {
          lastCompleted: '2024-03-20',
          expiryDate: '2025-03-20',
          instructor: 'CFI Mike Johnson',
          aircraftType: 'G650'
        },

        instrumentProficiency: {
          lastCompleted: '2024-08-10',
          expiryDate: '2025-02-10',
          approach: 'ILS/RNAV',
          instructor: 'CFII Sarah Wilson'
        },

        typeRatings: [
          {
            aircraftType: 'G650',
            rating: 'G650 Type Rating',
            checkRideDate: '2024-01-15',
            expiryDate: '2025-01-15',
            examiner: 'DPE Robert Brown'
          }
        ],

        recurrentTraining: {
          lastCompleted: '2024-09-05',
          expiryDate: '2025-09-05',
          trainingCenter: 'FlightSafety International',
          completedModules: ['CRM', 'Emergency Procedures', 'Systems Review']
        },

        lineChecks: [
          {
            date: '2024-07-22',
            examiner: 'Check Airman Davis',
            aircraftType: 'G650',
            result: 'Pass',
            notes: 'Excellent performance in all areas'
          }
        ]
      },
      {
        id: '2',
        name: 'First Officer Sarah Johnson',
        employeeId: 'EMP002',
        role: 'first-officer',
        position: 'Second-in-Command',
        currentDutyHours: 7.2,
        maxDutyHours: 14,
        restHours: 8,
        minRestHours: 10,
        fatigueLevelStart: 1,
        fatigueLevelCurrent: 3,
        status: 'on-duty',
        currentLocation: 'KATL',
        nextDutyStart: '2025-01-02T06:00:00',

        medicalCertificate: {
          type: 'Class 1',
          number: 'FAA987654321',
          issueDate: '2024-04-30',
          expiryDate: '2025-04-30'
        },

        flightReview: {
          lastCompleted: '2024-02-15',
          expiryDate: '2025-02-15',
          instructor: 'CFI Mike Johnson',
          aircraftType: 'G650'
        },

        instrumentProficiency: {
          lastCompleted: '2024-09-12',
          expiryDate: '2025-03-12',
          approach: 'ILS/RNAV/VOR',
          instructor: 'CFII Sarah Wilson'
        },

        typeRatings: [
          {
            aircraftType: 'G650',
            rating: 'G650 Type Rating',
            checkRideDate: '2024-03-08',
            expiryDate: '2025-03-08',
            examiner: 'DPE Robert Brown'
          }
        ],

        recurrentTraining: {
          lastCompleted: '2024-08-15',
          expiryDate: '2025-08-15',
          trainingCenter: 'FlightSafety International',
          completedModules: ['CRM', 'Emergency Procedures', 'Systems Review']
        },

        lineChecks: [
          {
            date: '2024-06-18',
            examiner: 'Check Airman Wilson',
            aircraftType: 'G650',
            result: 'Pass'
          }
        ]
      },
      {
        id: '3',
        name: 'Flight Attendant Maria Rodriguez',
        employeeId: 'EMP003',
        role: 'flight-attendant',
        position: 'Cabin Crew',
        currentDutyHours: 6.8,
        maxDutyHours: 12,
        restHours: 9,
        minRestHours: 9,
        fatigueLevelStart: 1,
        fatigueLevelCurrent: 2,
        status: 'available',
        currentLocation: 'KMIA',
        nextDutyStart: '2025-01-02T14:00:00',

        medicalCertificate: {
          type: 'Class 2',
          number: 'FAA555666777',
          issueDate: '2024-05-20',
          expiryDate: '2025-05-20'
        },

        flightReview: {
          lastCompleted: '2024-01-10',
          expiryDate: '2025-01-10',
          instructor: 'Training Supervisor Lopez',
          aircraftType: 'G650 Cabin Systems'
        },

        instrumentProficiency: {
          lastCompleted: 'N/A',
          expiryDate: 'N/A',
          approach: 'N/A',
          instructor: 'N/A'
        },

        typeRatings: [],

        recurrentTraining: {
          lastCompleted: '2024-09-05',
          expiryDate: '2025-09-05',
          trainingCenter: 'Corporate Aviation Training',
          completedModules: ['Safety Procedures', 'Emergency Equipment', 'Customer Service']
        },

        lineChecks: [
          {
            date: '2024-05-14',
            examiner: 'Lead Flight Attendant Chen',
            aircraftType: 'G650',
            result: 'Pass',
            notes: 'Outstanding customer service skills'
          }
        ]
      }
    ];

    setCrewMembers(mockCrewMembers);

    setFlightAssignments([
      {
        id: '1',
        flightNumber: 'GS001',
        aircraft: 'N123GS (G650)',
        departure: 'KATL',
        arrival: 'KJFK',
        departureTime: '2025-01-02T08:00:00',
        arrivalTime: '2025-01-02T10:30:00',
        duration: 2.5,
        captain: 'Captain John Smith',
        firstOfficer: 'First Officer Sarah Johnson',
        flightAttendants: ['Flight Attendant Maria Rodriguez'],
        status: 'scheduled',
        dutyStart: '2025-01-02T06:00:00',
        dutyEnd: '2025-01-02T12:00:00',
        departureCountry: 'United States',
        arrivalCountry: 'United States',
        overnightStops: 0,
        totalNightsAway: 0
      }
    ]);

    // Generate alerts based on crew data
    const generatedAlerts: Alert[] = [
      {
        id: '1',
        crewId: '3',
        crewName: 'Flight Attendant Maria Rodriguez',
        type: 'training-due',
        severity: 'high',
        message: 'Recurrent training expires in 10 days',
        expiryDate: '2025-01-10',
        daysRemaining: 10,
        acknowledged: false,
        createdAt: '2024-12-31T10:00:00'
      },
      {
        id: '2',
        crewId: '1',
        crewName: 'Captain John Smith',
        type: 'fatigue-risk',
        severity: 'medium',
        message: 'Fatigue level elevated - monitor for next duty period',
        acknowledged: false,
        createdAt: '2024-12-31T08:30:00'
      },
      {
        id: '3',
        crewId: '2',
        crewName: 'First Officer Sarah Johnson',
        type: 'currency-expiry',
        severity: 'medium',
        message: 'Flight review expires in 45 days',
        expiryDate: '2025-02-15',
        daysRemaining: 45,
        acknowledged: false,
        createdAt: '2024-12-30T14:15:00'
      }
    ];

    setAlerts(generatedAlerts);

    // Initialize travel records with comprehensive mock data
    const mockTravelRecords: TravelRecord[] = [
      {
        id: '1',
        crewId: '1',
        flightId: 'GS101',
        departureDate: '2024-12-15',
        returnDate: '2024-12-18',
        destinations: [
          { airport: 'EGLL', country: 'United Kingdom', city: 'London', nightsStayed: 2 },
          { airport: 'LFPG', country: 'France', city: 'Paris', nightsStayed: 1 }
        ],
        totalNightsAway: 3,
        tripType: 'multi-country',
        role: 'captain'
      },
      {
        id: '2',
        crewId: '1',
        flightId: 'GS102',
        departureDate: '2024-11-22',
        returnDate: '2024-11-25',
        destinations: [
          { airport: 'EDDF', country: 'Germany', city: 'Frankfurt', nightsStayed: 3 }
        ],
        totalNightsAway: 3,
        tripType: 'international',
        role: 'captain'
      },
      {
        id: '3',
        crewId: '1',
        flightId: 'GS103',
        departureDate: '2024-10-10',
        returnDate: '2024-10-14',
        destinations: [
          { airport: 'RJTT', country: 'Japan', city: 'Tokyo', nightsStayed: 4 }
        ],
        totalNightsAway: 4,
        tripType: 'international',
        role: 'captain'
      },
      {
        id: '4',
        crewId: '2',
        flightId: 'GS201',
        departureDate: '2024-12-20',
        returnDate: '2024-12-22',
        destinations: [
          { airport: 'EGLL', country: 'United Kingdom', city: 'London', nightsStayed: 2 }
        ],
        totalNightsAway: 2,
        tripType: 'international',
        role: 'first-officer'
      },
      {
        id: '5',
        crewId: '2',
        flightId: 'GS202',
        departureDate: '2024-11-08',
        returnDate: '2024-11-12',
        destinations: [
          { airport: 'LTBA', country: 'Turkey', city: 'Istanbul', nightsStayed: 2 },
          { airport: 'OMDB', country: 'United Arab Emirates', city: 'Dubai', nightsStayed: 2 }
        ],
        totalNightsAway: 4,
        tripType: 'multi-country',
        role: 'first-officer'
      },
      {
        id: '6',
        crewId: '3',
        flightId: 'GS301',
        departureDate: '2024-12-01',
        returnDate: '2024-12-05',
        destinations: [
          { airport: 'ZBAA', country: 'China', city: 'Beijing', nightsStayed: 4 }
        ],
        totalNightsAway: 4,
        tripType: 'international',
        role: 'flight-attendant'
      }
    ];

    setTravelRecords(mockTravelRecords);

    // Calculate crew travel statistics
    const calculateCrewTravelStats = (): CrewTravelStats[] => {
      return mockCrewMembers.map(crew => {
        const crewRecords = mockTravelRecords.filter(record => record.crewId === crew.id);

        const totalTrips = crewRecords.length;
        const totalNightsAway = crewRecords.reduce((sum, record) => sum + record.totalNightsAway, 0);
        const internationalTrips = crewRecords.filter(r => r.tripType === 'international' || r.tripType === 'multi-country').length;
        const domesticTrips = crewRecords.filter(r => r.tripType === 'domestic').length;

        // Calculate country visits
        const countryVisitsMap = new Map<string, { visits: number; nights: number; lastVisit: string }>();

        crewRecords.forEach(record => {
          record.destinations.forEach(dest => {
            const existing = countryVisitsMap.get(dest.country);
            if (existing) {
              existing.visits++;
              existing.nights += dest.nightsStayed;
              if (record.departureDate > existing.lastVisit) {
                existing.lastVisit = record.departureDate;
              }
            } else {
              countryVisitsMap.set(dest.country, {
                visits: 1,
                nights: dest.nightsStayed,
                lastVisit: record.departureDate
              });
            }
          });
        });

        const countryVisits: CountryVisitStats[] = Array.from(countryVisitsMap.entries()).map(([country, stats]) => ({
          country,
          visits: stats.visits,
          totalNights: stats.nights,
          lastVisit: stats.lastVisit,
          averageStayLength: stats.visits > 0 ? stats.nights / stats.visits : 0
        }));

        const mostVisitedCountry = countryVisits.reduce((max, country) =>
          country.visits > (max?.visits || 0) ? country : max, countryVisits[0])?.country || 'None';

        const currentYear = new Date().getFullYear();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const currentYearRecords = crewRecords.filter(r => new Date(r.departureDate).getFullYear() === currentYear);
        const lastSixMonthsRecords = crewRecords.filter(r => new Date(r.departureDate) >= sixMonthsAgo);

        return {
          crewId: crew.id,
          crewName: crew.name,
          totalTrips,
          totalNightsAway,
          internationalTrips,
          domesticTrips,
          countryVisits,
          averageNightsPerTrip: totalTrips > 0 ? totalNightsAway / totalTrips : 0,
          longestTripNights: crewRecords.length > 0 ? Math.max(...crewRecords.map(r => r.totalNightsAway)) : 0,
          shortestTripNights: crewRecords.length > 0 ? Math.min(...crewRecords.map(r => r.totalNightsAway)) : 0,
          mostVisitedCountry,
          lastTripDate: crewRecords.length > 0 ? crewRecords.sort((a, b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime())[0].departureDate : '',
          currentYear: {
            trips: currentYearRecords.length,
            nightsAway: currentYearRecords.reduce((sum, r) => sum + r.totalNightsAway, 0),
            countries: new Set(currentYearRecords.flatMap(r => r.destinations.map(d => d.country))).size
          },
          lastSixMonths: {
            trips: lastSixMonthsRecords.length,
            nightsAway: lastSixMonthsRecords.reduce((sum, r) => sum + r.totalNightsAway, 0),
            countries: new Set(lastSixMonthsRecords.flatMap(r => r.destinations.map(d => d.country))).size
          }
        };
      });
    };

    setCrewTravelStats(calculateCrewTravelStats());
  }, []);

  // Recalculate travel stats when crew members change
  useEffect(() => {
    if (crewMembers.length > 0 && travelRecords.length > 0) {
      const calculateStats = (): CrewTravelStats[] => {
        return crewMembers.map(crew => {
          const crewRecords = travelRecords.filter(record => record.crewId === crew.id);

          const totalTrips = crewRecords.length;
          const totalNightsAway = crewRecords.reduce((sum, record) => sum + record.totalNightsAway, 0);
          const internationalTrips = crewRecords.filter(r => r.tripType === 'international' || r.tripType === 'multi-country').length;
          const domesticTrips = crewRecords.filter(r => r.tripType === 'domestic').length;

          // Calculate country visits
          const countryVisitsMap = new Map<string, { visits: number; nights: number; lastVisit: string }>();

          crewRecords.forEach(record => {
            record.destinations.forEach(dest => {
              const existing = countryVisitsMap.get(dest.country);
              if (existing) {
                existing.visits++;
                existing.nights += dest.nightsStayed;
                if (record.departureDate > existing.lastVisit) {
                  existing.lastVisit = record.departureDate;
                }
              } else {
                countryVisitsMap.set(dest.country, {
                  visits: 1,
                  nights: dest.nightsStayed,
                  lastVisit: record.departureDate
                });
              }
            });
          });

          const countryVisits: CountryVisitStats[] = Array.from(countryVisitsMap.entries()).map(([country, stats]) => ({
            country,
            visits: stats.visits,
            totalNights: stats.nights,
            lastVisit: stats.lastVisit,
            averageStayLength: stats.visits > 0 ? stats.nights / stats.visits : 0
          }));

          const mostVisitedCountry = countryVisits.length > 0 ?
            countryVisits.reduce((max, country) =>
              country.visits > (max?.visits || 0) ? country : max, countryVisits[0])?.country || 'None' : 'None';

          const currentYear = new Date().getFullYear();
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const currentYearRecords = crewRecords.filter(r => new Date(r.departureDate).getFullYear() === currentYear);
          const lastSixMonthsRecords = crewRecords.filter(r => new Date(r.departureDate) >= sixMonthsAgo);

          return {
            crewId: crew.id,
            crewName: crew.name,
            totalTrips,
            totalNightsAway,
            internationalTrips,
            domesticTrips,
            countryVisits,
            averageNightsPerTrip: totalTrips > 0 ? totalNightsAway / totalTrips : 0,
            longestTripNights: crewRecords.length > 0 ? Math.max(...crewRecords.map(r => r.totalNightsAway)) : 0,
            shortestTripNights: crewRecords.length > 0 ? Math.min(...crewRecords.map(r => r.totalNightsAway)) : 0,
            mostVisitedCountry,
            lastTripDate: crewRecords.length > 0 ? crewRecords.sort((a, b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime())[0].departureDate : '',
            currentYear: {
              trips: currentYearRecords.length,
              nightsAway: currentYearRecords.reduce((sum, r) => sum + r.totalNightsAway, 0),
              countries: new Set(currentYearRecords.flatMap(r => r.destinations.map(d => d.country))).size
            },
            lastSixMonths: {
              trips: lastSixMonthsRecords.length,
              nightsAway: lastSixMonthsRecords.reduce((sum, r) => sum + r.totalNightsAway, 0),
              countries: new Set(lastSixMonthsRecords.flatMap(r => r.destinations.map(d => d.country))).size
            }
          };
        });
      };

      setCrewTravelStats(calculateStats());
    }
  }, [crewMembers, travelRecords]);

  const getDutyProgress = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const getFatigueLevel = (level: number) => {
    if (level <= 2) return { text: 'Low', color: 'bg-green-500' };
    if (level <= 4) return { text: 'Moderate', color: 'bg-yellow-500' };
    if (level <= 6) return { text: 'High', color: 'bg-orange-500' };
    return { text: 'Critical', color: 'bg-red-500' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'on-duty':
        return <Badge className="bg-blue-100 text-blue-800">On Duty</Badge>;
      case 'rest':
        return <Badge className="bg-yellow-100 text-yellow-800">Rest</Badge>;
      case 'training':
        return <Badge className="bg-purple-100 text-purple-800">Training</Badge>;
      case 'unavailable':
        return <Badge className="bg-red-100 text-red-800">Unavailable</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getCurrencyStatus = (expiryDate: string) => {
    if (expiryDate === 'N/A') return { status: 'n/a', days: 0, color: 'gray' };

    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysRemaining < 0) return { status: 'expired', days: daysRemaining, color: 'red' };
    if (daysRemaining <= 30) return { status: 'expiring', days: daysRemaining, color: 'orange' };
    if (daysRemaining <= 90) return { status: 'due-soon', days: daysRemaining, color: 'yellow' };
    return { status: 'current', days: daysRemaining, color: 'green' };
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
    toast.success('Alert acknowledged');
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const filteredCrewMembers = crewMembers.filter(crew => {
    const matchesRole = filterRole === 'all' || crew.role === filterRole;
    const matchesSearch = crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crew.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const totalCrew = crewMembers.length;
  const availableCrew = crewMembers.filter(c => c.status === 'available').length;
  const onDutyCrew = crewMembers.filter(c => c.status === 'on-duty').length;
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Crew Management</h1>
          <p className="text-muted-foreground">
            Comprehensive crew resource management, compliance, and currency tracking
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Crew Member
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      {activeAlerts > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {activeAlerts} active alerts require attention
            {criticalAlerts > 0 && ` (${criticalAlerts} critical)`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="duty-compliance">Duty & Compliance</TabsTrigger>
          <TabsTrigger value="currency">Currency Tracking</TabsTrigger>
          <TabsTrigger value="assignments">Flight Assignments</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Notifications</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Crew</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCrew}</div>
                <p className="text-xs text-muted-foreground">
                  {availableCrew} available • {onDutyCrew} on duty
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Flights</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {flightAssignments.filter(f => f.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {flightAssignments.filter(f => f.status === 'scheduled').length} scheduled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  {criticalAlerts} critical priority
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94%</div>
                <p className="text-xs text-muted-foreground">
                  All currency requirements
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Status Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Crew Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {crewMembers.slice(0, 5).map((crew) => {
                    const dutyProgress = getDutyProgress(crew.currentDutyHours, crew.maxDutyHours);
                    const fatigue = getFatigueLevel(crew.fatigueLevelCurrent);

                    return (
                      <div key={crew.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <User className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{crew.name}</p>
                            <p className="text-sm text-muted-foreground">{crew.position}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${fatigue.color}`}></div>
                          {getStatusBadge(crew.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">Captain John Smith assigned to GS001</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">Training reminder sent to Maria Rodriguez</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">Medical certificate renewed - Sarah Johnson</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm">Recurrent training completed - GS Team</p>
                      <p className="text-xs text-muted-foreground">2 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="duty-compliance" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search crew members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="captain">Captains</SelectItem>
                <SelectItem value="first-officer">First Officers</SelectItem>
                <SelectItem value="flight-attendant">Flight Attendants</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Duty Time & Compliance Status</CardTitle>
              <CardDescription>Monitor crew duty times and FAR compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="hidden lg:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crew Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Current Duty</TableHead>
                      <TableHead>Rest Hours</TableHead>
                      <TableHead>Fatigue Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCrewMembers.map((crew) => {
                      const dutyProgress = getDutyProgress(crew.currentDutyHours, crew.maxDutyHours);
                      const fatigue = getFatigueLevel(crew.fatigueLevelCurrent);

                      return (
                        <TableRow key={crew.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{crew.name}</p>
                              <p className="text-sm text-muted-foreground">{crew.employeeId} • {crew.currentLocation}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{crew.role.replace('-', ' ')}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{formatDuration(crew.currentDutyHours)}</span>
                                <span>{formatDuration(crew.maxDutyHours)}</span>
                              </div>
                              <Progress
                                value={dutyProgress}
                                className={`h-2 ${dutyProgress > 80 ? 'bg-red-100' : dutyProgress > 60 ? 'bg-yellow-100' : 'bg-green-100'}`}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className={crew.restHours < crew.minRestHours ? 'text-red-600' : 'text-green-600'}>
                                {formatDuration(crew.restHours)}
                              </span>
                              <span className="text-muted-foreground"> / {formatDuration(crew.minRestHours)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${fatigue.color}`}></div>
                              <span className="text-sm">{fatigue.text}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(crew.status)}</TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedCrew(crew)}>
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>{crew.name} - Duty & Compliance Details</DialogTitle>
                                  <DialogDescription>Employee ID: {crew.employeeId}</DialogDescription>
                                </DialogHeader>
                                {selectedCrew && (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Current Duty Hours</Label>
                                        <p className="text-lg font-semibold">{formatDuration(selectedCrew.currentDutyHours)}</p>
                                      </div>
                                      <div>
                                        <Label>Maximum Duty Hours</Label>
                                        <p className="text-lg">{formatDuration(selectedCrew.maxDutyHours)}</p>
                                      </div>
                                      <div>
                                        <Label>Rest Hours</Label>
                                        <p className="text-lg">{formatDuration(selectedCrew.restHours)}</p>
                                      </div>
                                      <div>
                                        <Label>Minimum Rest Required</Label>
                                        <p className="text-lg">{formatDuration(selectedCrew.minRestHours)}</p>
                                      </div>
                                    </div>

                                    <div>
                                      <Label>Fatigue Assessment</Label>
                                      <div className="mt-2 space-y-2">
                                        <div className="flex justify-between text-sm">
                                          <span>Start of Duty: {selectedCrew.fatigueLevelStart}/10</span>
                                          <span>Current: {selectedCrew.fatigueLevelCurrent}/10</span>
                                        </div>
                                        <Progress value={selectedCrew.fatigueLevelCurrent * 10} className="h-2" />
                                      </div>
                                    </div>

                                    <div>
                                      <Label>Next Duty Period</Label>
                                      <p className="text-lg">{selectedCrew.nextDutyStart ? new Date(selectedCrew.nextDutyStart).toLocaleString() : 'Not scheduled'}</p>
                                    </div>

                                    <div className="flex space-x-2 pt-4">
                                      <Button>Update Duty Status</Button>
                                      <Button variant="outline">Schedule Rest</Button>
                                      <Button variant="outline">View History</Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List View */}
              <div className="lg:hidden space-y-4">
                {filteredCrewMembers.map((crew) => {
                  const dutyProgress = getDutyProgress(crew.currentDutyHours, crew.maxDutyHours);
                  const fatigue = getFatigueLevel(crew.fatigueLevelCurrent);

                  return (
                    <div key={crew.id} className="border rounded-lg p-4 space-y-4 bg-card">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{crew.name}</h3>
                          <p className="text-sm text-muted-foreground">{crew.role.replace('-', ' ')}</p>
                        </div>
                        {getStatusBadge(crew.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block text-xs">Duty Hours</span>
                          <span className="font-medium">{formatDuration(crew.currentDutyHours)} / {formatDuration(crew.maxDutyHours)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Rest Hours</span>
                          <span className={crew.restHours < crew.minRestHours ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            {formatDuration(crew.restHours)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Duty Limits</span>
                          <span>{Math.round(dutyProgress)}%</span>
                        </div>
                        <Progress value={dutyProgress} className={`h-1.5 ${dutyProgress > 80 ? 'bg-red-100' : dutyProgress > 60 ? 'bg-yellow-100' : 'bg-green-100'}`} />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">Fatigue:</span>
                          <div className={`w-2 h-2 rounded-full ${fatigue.color}`}></div>
                          <span className="text-sm font-medium">{fatigue.text}</span>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCrew(crew)}>
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>{crew.name}</DialogTitle>
                            </DialogHeader>
                            <div className="p-4">
                              <p>Mobile Detail View Placeholder - Same details as desktop</p>
                              {/* Reuse the detailed view logic here if creating a separate component, but for now just show basic placeholder or clone the logic if strictly necessary. 
                                            Since I can't clone nice internal logic easily without huge duplication, I'll rely on the desktop dialog which is responsive enough (DialogContent is decently responsive).
                                        */}
                              <div className="grid grid-cols-1 gap-4 mt-4">
                                <div>
                                  <Label>Current Duty</Label>
                                  <div className="text-lg">{formatDuration(crew.currentDutyHours)}</div>
                                </div>
                                <div>
                                  <Label>Location</Label>
                                  <div className="text-lg">{crew.currentLocation}</div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency & Qualification Tracking</CardTitle>
              <CardDescription>Monitor medical certificates, training, and currency requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crew Member</TableHead>
                    <TableHead>Medical Certificate</TableHead>
                    <TableHead>Flight Review</TableHead>
                    <TableHead>Type Rating</TableHead>
                    <TableHead>Recurrent Training</TableHead>
                    <TableHead>Overall Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crewMembers.map((crew) => {
                    const medicalStatus = getCurrencyStatus(crew.medicalCertificate.expiryDate);
                    const flightReviewStatus = getCurrencyStatus(crew.flightReview.expiryDate);
                    const typeRatingStatus = crew.typeRatings.length > 0 ? getCurrencyStatus(crew.typeRatings[0].expiryDate) : { status: 'n/a', days: 0, color: 'gray' };
                    const trainingStatus = getCurrencyStatus(crew.recurrentTraining.expiryDate);

                    const getStatusBadgeForCurrency = (status: any) => {
                      switch (status.status) {
                        case 'expired':
                          return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
                        case 'expiring':
                          return <Badge className="bg-orange-100 text-orange-800">Expiring Soon</Badge>;
                        case 'due-soon':
                          return <Badge className="bg-yellow-100 text-yellow-800">Due Soon</Badge>;
                        case 'current':
                          return <Badge className="bg-green-100 text-green-800">Current</Badge>;
                        case 'n/a':
                          return <Badge className="bg-gray-100 text-gray-800">N/A</Badge>;
                        default:
                          return <Badge>{status.status}</Badge>;
                      }
                    };

                    const overallStatus = [medicalStatus, flightReviewStatus, typeRatingStatus, trainingStatus]
                      .filter(s => s.status !== 'n/a');
                    const hasExpired = overallStatus.some(s => s.status === 'expired');
                    const hasExpiring = overallStatus.some(s => s.status === 'expiring');

                    return (
                      <TableRow key={crew.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{crew.name}</p>
                            <p className="text-sm text-muted-foreground">{crew.role.replace('-', ' ')}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{crew.medicalCertificate.type}</p>
                            <p className="text-xs text-muted-foreground">{crew.medicalCertificate.expiryDate}</p>
                            {getStatusBadgeForCurrency(medicalStatus)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{crew.flightReview.expiryDate}</p>
                            {getStatusBadgeForCurrency(flightReviewStatus)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {crew.typeRatings.length > 0 ? (
                              <>
                                <p className="text-sm">{crew.typeRatings[0].aircraftType}</p>
                                <p className="text-xs text-muted-foreground">{crew.typeRatings[0].expiryDate}</p>
                                {getStatusBadgeForCurrency(typeRatingStatus)}
                              </>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">N/A</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{crew.recurrentTraining.expiryDate}</p>
                            {getStatusBadgeForCurrency(trainingStatus)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasExpired ? (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Action Required
                            </Badge>
                          ) : hasExpiring ? (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Attention Needed
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Current
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedCrew(crew)}>
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>{crew.name} - Currency & Qualifications</DialogTitle>
                                <DialogDescription>Complete training and currency record</DialogDescription>
                              </DialogHeader>
                              {selectedCrew && (
                                <div className="space-y-6">
                                  {/* Medical Certificate */}
                                  <div>
                                    <h4 className="font-medium mb-3">Medical Certificate</h4>
                                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                                      <div>
                                        <Label>Type</Label>
                                        <p>{selectedCrew.medicalCertificate.type}</p>
                                      </div>
                                      <div>
                                        <Label>Certificate Number</Label>
                                        <p>{selectedCrew.medicalCertificate.number}</p>
                                      </div>
                                      <div>
                                        <Label>Issue Date</Label>
                                        <p>{selectedCrew.medicalCertificate.issueDate}</p>
                                      </div>
                                      <div>
                                        <Label>Expiry Date</Label>
                                        <p>{selectedCrew.medicalCertificate.expiryDate}</p>
                                      </div>
                                      {selectedCrew.medicalCertificate.restrictions && (
                                        <div className="col-span-2">
                                          <Label>Restrictions</Label>
                                          <p>{selectedCrew.medicalCertificate.restrictions}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Type Ratings */}
                                  <div>
                                    <h4 className="font-medium mb-3">Type Ratings</h4>
                                    <div className="space-y-3">
                                      {selectedCrew.typeRatings.map((rating, index) => (
                                        <div key={index} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                                          <div>
                                            <Label>Aircraft Type</Label>
                                            <p>{rating.aircraftType}</p>
                                          </div>
                                          <div>
                                            <Label>Rating</Label>
                                            <p>{rating.rating}</p>
                                          </div>
                                          <div>
                                            <Label>Check Ride Date</Label>
                                            <p>{rating.checkRideDate}</p>
                                          </div>
                                          <div>
                                            <Label>Expiry Date</Label>
                                            <p>{rating.expiryDate}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Recent Line Checks */}
                                  <div>
                                    <h4 className="font-medium mb-3">Recent Line Checks</h4>
                                    <div className="space-y-3">
                                      {selectedCrew.lineChecks.map((check, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div>
                                            <p className="font-medium">{check.date}</p>
                                            <p className="text-sm text-muted-foreground">{check.examiner} • {check.aircraftType}</p>
                                            {check.notes && <p className="text-xs text-muted-foreground mt-1">{check.notes}</p>}
                                          </div>
                                          <Badge className={check.result === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                            {check.result}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex space-x-2 pt-4">
                                    <Button>Update Currency</Button>
                                    <Button variant="outline">Schedule Training</Button>
                                    <Button variant="outline">View Full Record</Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Flight Assignments</CardTitle>
              <CardDescription>Current and upcoming crew assignments for G650 operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="hidden lg:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flight</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Departure</TableHead>
                      <TableHead>Duty Period</TableHead>
                      <TableHead>Captain</TableHead>
                      <TableHead>First Officer</TableHead>
                      <TableHead>Flight Attendants</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flightAssignments.map((flight) => (
                      <TableRow key={flight.id}>
                        <TableCell className="font-medium">{flight.flightNumber}</TableCell>
                        <TableCell>{flight.aircraft}</TableCell>
                        <TableCell>{flight.departure} → {flight.arrival}</TableCell>
                        <TableCell>
                          {new Date(flight.departureTime).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{new Date(flight.dutyStart).toLocaleTimeString()}</p>
                            <p className="text-muted-foreground">to {new Date(flight.dutyEnd).toLocaleTimeString()}</p>
                          </div>
                        </TableCell>
                        <TableCell>{flight.captain}</TableCell>
                        <TableCell>{flight.firstOfficer}</TableCell>
                        <TableCell>
                          {flight.flightAttendants.map((fa, index) => (
                            <div key={index} className="text-sm">{fa}</div>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={flight.status === 'active' ? 'default' : 'secondary'}>
                            {flight.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Flight Assignments View */}
              <div className="lg:hidden space-y-4">
                {flightAssignments.map((flight) => (
                  <Card key={flight.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{flight.flightNumber}</h3>
                          <div className="text-sm text-muted-foreground">{flight.aircraft}</div>
                        </div>
                        <Badge variant={flight.status === 'active' ? 'default' : 'secondary'}>
                          {flight.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground block">Route</span>
                          <span className="font-medium">{flight.departure} → {flight.arrival}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Departure</span>
                          <span className="font-medium">{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="bg-muted/30 p-2 rounded text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duty Start:</span>
                          <span>{new Date(flight.dutyStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duty End:</span>
                          <span>{new Date(flight.dutyEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="text-sm space-y-1 pt-2 border-t text-xs">
                        <div className="grid grid-cols-[80px_1fr] items-center">
                          <span className="text-muted-foreground">Captain:</span>
                          <span className="truncate font-medium">{flight.captain}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] items-center">
                          <span className="text-muted-foreground">First Officer:</span>
                          <span className="truncate font-medium">{flight.firstOfficer}</span>
                        </div>
                        {flight.flightAttendants.length > 0 && (
                          <div className="grid grid-cols-[80px_1fr] items-start">
                            <span className="text-muted-foreground pt-0.5">Cabin:</span>
                            <div>
                              {flight.flightAttendants.map((fa, i) => (
                                <div key={i} className="truncate">{fa}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alerts & Notifications</CardTitle>
              <CardDescription>Critical crew alerts requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg ${alert.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-white border-orange-200'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'high' ? 'text-orange-500' :
                              'text-yellow-500'
                            }`} />
                          <span className="font-medium">{alert.crewName}</span>
                          {getSeverityBadge(alert.severity)}
                          <Badge variant="outline" className="text-xs">
                            {alert.type.replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          {alert.expiryDate && (
                            <span>Expires: {new Date(alert.expiryDate).toLocaleDateString()}</span>
                          )}
                          {alert.daysRemaining !== undefined && (
                            <span>{alert.daysRemaining} days remaining</span>
                          )}
                          <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.acknowledged && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Duty Time Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {crewTravelStats.reduce((sum, crew) => sum + crew.internationalTrips, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total international assignments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average per Crew</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {crewTravelStats.length > 0 ? Math.round(crewTravelStats.reduce((sum, crew) => sum + crew.currentYear.nightsAway, 0) / crewTravelStats.length) : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Nights away per crew member
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Travel Balance Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Travel Balance by Crew Member</CardTitle>
                <CardDescription>Nights away from base comparison for fair scheduling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {crewTravelStats.map((crew) => {
                    const maxNights = crewTravelStats.length > 0 ? Math.max(...crewTravelStats.map(c => c.currentYear.nightsAway)) : 0;
                    const percentage = maxNights > 0 ? (crew.currentYear.nightsAway / maxNights) * 100 : 0;

                    return (
                      <div key={crew.crewId} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{crew.crewName}</span>
                          <span>{crew.currentYear.nightsAway} nights</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={percentage} className="flex-1" />
                          <Badge variant={percentage > 80 ? "destructive" : percentage > 60 ? "default" : "secondary"}>
                            {crew.currentYear.trips} trips
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Country Visit Distribution</CardTitle>
                <CardDescription>Most visited destinations by crew</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    // Aggregate country visits across all crew
                    const countryTotals = new Map<string, { visits: number; nights: number; crewCount: number }>();

                    crewTravelStats.forEach(crew => {
                      crew.countryVisits.forEach(country => {
                        const existing = countryTotals.get(country.country);
                        if (existing) {
                          existing.visits += country.visits;
                          existing.nights += country.totalNights;
                          existing.crewCount++;
                        } else {
                          countryTotals.set(country.country, {
                            visits: country.visits,
                            nights: country.totalNights,
                            crewCount: 1
                          });
                        }
                      });
                    });

                    const sortedCountries = Array.from(countryTotals.entries())
                      .sort(([, a], [, b]) => b.visits - a.visits)
                      .slice(0, 8);

                    const maxVisits = sortedCountries.length > 0 ? Math.max(...sortedCountries.map(([, stats]) => stats.visits)) : 1;

                    return sortedCountries.map(([country, stats]) => (
                      <div key={country} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{country}</span>
                          <span>{stats.visits} visits • {stats.nights} nights</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={(stats.visits / maxVisits) * 100} className="flex-1" />
                          <Badge variant="outline">
                            {stats.crewCount} crew
                          </Badge>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Travel Records */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Travel Records</CardTitle>
              <CardDescription>Detailed breakdown of each crew member's travel history</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crew Member</TableHead>
                    <TableHead>Current Year Stats</TableHead>
                    <TableHead>Most Visited Country</TableHead>
                    <TableHead>Last 6 Months</TableHead>
                    <TableHead>Travel Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crewTravelStats.map((crew) => {
                    const avgNightsAllCrew = crewTravelStats.length > 0 ? crewTravelStats.reduce((sum, c) => sum + c.currentYear.nightsAway, 0) / crewTravelStats.length : 0;
                    const balanceStatus = crew.currentYear.nightsAway > avgNightsAllCrew * 1.2 ? 'high' :
                      crew.currentYear.nightsAway < avgNightsAllCrew * 0.8 ? 'low' : 'balanced';

                    return (
                      <TableRow key={crew.crewId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{crew.crewName}</p>
                            <p className="text-sm text-muted-foreground">
                              {crew.totalTrips} total trips • {crew.totalNightsAway} total nights
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Plane className="h-3 w-3" />
                              <span className="text-sm">{crew.currentYear.trips} trips</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Moon className="h-3 w-3" />
                              <span className="text-sm">{crew.currentYear.nightsAway} nights</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Globe className="h-3 w-3" />
                              <span className="text-sm">{crew.currentYear.countries} countries</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{crew.mostVisitedCountry}</p>
                            {crew.countryVisits.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {crew.countryVisits.find(c => c.country === crew.mostVisitedCountry)?.visits} visits
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">{crew.lastSixMonths.trips} trips</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">{crew.lastSixMonths.nightsAway} nights</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            balanceStatus === 'high' ? 'bg-red-100 text-red-800' :
                              balanceStatus === 'low' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                          }>
                            {balanceStatus === 'high' ? 'Above Average' :
                              balanceStatus === 'low' ? 'Below Average' : 'Balanced'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedCrew(crewMembers.find(c => c.id === crew.crewId) || null)}>
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>{crew.crewName} - Travel History</DialogTitle>
                                <DialogDescription>Complete travel record and statistics</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-6">
                                {/* Travel Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="text-center p-4 border rounded-lg">
                                    <div className="text-2xl font-bold">{crew.totalTrips}</div>
                                    <div className="text-sm text-muted-foreground">Total Trips</div>
                                  </div>
                                  <div className="text-center p-4 border rounded-lg">
                                    <div className="text-2xl font-bold">{crew.totalNightsAway}</div>
                                    <div className="text-sm text-muted-foreground">Total Nights Away</div>
                                  </div>
                                  <div className="text-center p-4 border rounded-lg">
                                    <div className="text-2xl font-bold">{crew.countryVisits.length}</div>
                                    <div className="text-sm text-muted-foreground">Countries Visited</div>
                                  </div>
                                  <div className="text-center p-4 border rounded-lg">
                                    <div className="text-2xl font-bold">{Math.round(crew.averageNightsPerTrip)}</div>
                                    <div className="text-sm text-muted-foreground">Avg Nights/Trip</div>
                                  </div>
                                </div>

                                {/* Country Breakdown */}
                                <div>
                                  <h4 className="font-medium mb-3">Country Visit Breakdown</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {crew.countryVisits.slice(0, 8).map((country) => (
                                      <div key={country.country} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                          <p className="font-medium">{country.country}</p>
                                          <p className="text-sm text-muted-foreground">
                                            Last visit: {new Date(country.lastVisit).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-medium">{country.visits} visits</p>
                                          <p className="text-sm text-muted-foreground">{country.totalNights} nights</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Recent Travel Records */}
                                <div>
                                  <h4 className="font-medium mb-3">Recent Travel Records</h4>
                                  <div className="space-y-3">
                                    {travelRecords
                                      .filter(record => record.crewId === crew.crewId)
                                      .sort((a, b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime())
                                      .slice(0, 5)
                                      .map((record) => (
                                        <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div className="flex-1">
                                            <p className="font-medium">
                                              {new Date(record.departureDate).toLocaleDateString()} - {new Date(record.returnDate).toLocaleDateString()}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {record.destinations.map(d => `${d.city}, ${d.country}`).join(' → ')}
                                            </p>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Badge variant="outline">
                                              {record.totalNightsAway} nights
                                            </Badge>
                                            <Badge variant={record.tripType === 'international' ? 'default' : 'secondary'}>
                                              {record.tripType}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Flight Assignments</CardTitle>
              <CardDescription>Current and upcoming crew assignments for G650 operations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight</TableHead>
                    <TableHead>Aircraft</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Duty Period</TableHead>
                    <TableHead>Captain</TableHead>
                    <TableHead>First Officer</TableHead>
                    <TableHead>Flight Attendants</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flightAssignments.map((flight) => (
                    <TableRow key={flight.id}>
                      <TableCell className="font-medium">{flight.flightNumber}</TableCell>
                      <TableCell>{flight.aircraft}</TableCell>
                      <TableCell>{flight.departure} → {flight.arrival}</TableCell>
                      <TableCell>
                        {new Date(flight.departureTime).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{new Date(flight.dutyStart).toLocaleTimeString()}</p>
                          <p className="text-muted-foreground">to {new Date(flight.dutyEnd).toLocaleTimeString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>{flight.captain}</TableCell>
                      <TableCell>{flight.firstOfficer}</TableCell>
                      <TableCell>
                        {flight.flightAttendants.map((fa, index) => (
                          <div key={index} className="text-sm">{fa}</div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={flight.status === 'active' ? 'default' : 'secondary'}>
                          {flight.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alerts & Notifications</CardTitle>
              <CardDescription>Critical crew alerts requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg ${alert.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-white border-orange-200'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className={`h-4 w-4 ${alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'high' ? 'text-orange-500' :
                              'text-yellow-500'
                            }`} />
                          <span className="font-medium">{alert.crewName}</span>
                          {getSeverityBadge(alert.severity)}
                          <Badge variant="outline" className="text-xs">
                            {alert.type.replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          {alert.expiryDate && (
                            <span>Expires: {new Date(alert.expiryDate).toLocaleDateString()}</span>
                          )}
                          {alert.daysRemaining !== undefined && (
                            <span>{alert.daysRemaining} days remaining</span>
                          )}
                          <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.acknowledged && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Duty Time Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                  <div className="text-3xl font-bold">76%</div>
                  <p className="text-muted-foreground">Average duty utilization</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Currency Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Medical Certificates</span>
                    <span className="font-semibold text-green-600">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Flight Reviews</span>
                    <span className="font-semibold text-green-600">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type Ratings</span>
                    <span className="font-semibold text-green-600">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recurrent Training</span>
                    <span className="font-semibold text-yellow-600">67%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fatigue Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Low Risk</span>
                    <span className="font-semibold">1 crew member</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moderate Risk</span>
                    <span className="font-semibold">2 crew members</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High Risk</span>
                    <span className="font-semibold">0 crew members</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Travel Balance Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <PieChart className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <div className="text-3xl font-bold">87%</div>
                  <p className="text-muted-foreground">Schedule fairness rating</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>International vs Domestic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>International Trips</span>
                    <span className="font-semibold text-blue-600">
                      {crewTravelStats.reduce((sum, crew) => sum + crew.internationalTrips, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domestic Trips</span>
                    <span className="font-semibold text-green-600">
                      {crewTravelStats.reduce((sum, crew) => sum + crew.domesticTrips, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Countries</span>
                    <span className="font-semibold text-purple-600">
                      {new Set(crewTravelStats.flatMap(crew => crew.countryVisits.map(c => c.country))).size}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Training Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <Award className="h-12 w-12 mx-auto text-purple-500 mb-4" />
                  <div className="text-3xl font-bold">8</div>
                  <p className="text-muted-foreground">Training events completed this month</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Travel Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Nights Away Distribution</CardTitle>
                <CardDescription>Workload balance across crew members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {crewTravelStats.map((crew, index) => {
                    const maxNights = Math.max(...crewTravelStats.map(c => c.currentYear.nightsAway));
                    const percentage = maxNights > 0 ? (crew.currentYear.nightsAway / maxNights) * 100 : 0;

                    return (
                      <div key={crew.crewId} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{crew.crewName}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{crew.currentYear.nightsAway} nights</span>
                            <Badge variant={
                              percentage > 80 ? "destructive" :
                                percentage > 60 ? "default" :
                                  "secondary"
                            }>
                              {Math.round(percentage)}%
                            </Badge>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Scheduling Recommendations</CardTitle>
                <CardDescription>AI-powered suggestions for fair workload distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    const avgNights = crewTravelStats.reduce((sum, crew) => sum + crew.currentYear.nightsAway, 0) / crewTravelStats.length;
                    const recommendations = [];

                    // Find crew with high and low travel
                    const highTravelCrew = crewTravelStats.filter(crew => crew.currentYear.nightsAway > avgNights * 1.2);
                    const lowTravelCrew = crewTravelStats.filter(crew => crew.currentYear.nightsAway < avgNights * 0.8);

                    if (highTravelCrew.length > 0) {
                      recommendations.push({
                        type: 'warning',
                        icon: AlertTriangle,
                        message: `${highTravelCrew[0].crewName} has high travel load - consider domestic assignments`,
                        priority: 'High'
                      });
                    }

                    if (lowTravelCrew.length > 0) {
                      recommendations.push({
                        type: 'info',
                        icon: Globe,
                        message: `${lowTravelCrew[0].crewName} available for international assignments`,
                        priority: 'Medium'
                      });
                    }

                    recommendations.push({
                      type: 'success',
                      icon: CheckCircle,
                      message: 'Overall travel distribution is well balanced',
                      priority: 'Low'
                    });

                    recommendations.push({
                      type: 'info',
                      icon: TrendingUp,
                      message: 'Consider rotating international routes quarterly for fairness',
                      priority: 'Medium'
                    });

                    return recommendations.map((rec, index) => {
                      const Icon = rec.icon;
                      return (
                        <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Icon className={`h-5 w-5 mt-0.5 ${rec.type === 'warning' ? 'text-orange-500' :
                            rec.type === 'success' ? 'text-green-500' :
                              'text-blue-500'
                            }`} />
                          <div className="flex-1">
                            <p className="text-sm">{rec.message}</p>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {rec.priority} Priority
                            </Badge>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}