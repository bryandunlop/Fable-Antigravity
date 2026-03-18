import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Plane,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Download,
  ChevronRight,
  ChevronDown,
  Save,
  Edit,
  Eye,
  Send,
  Users,
  ArrowRight,
  Circle,
  CheckCircle2,
  Fuel,
  X
} from 'lucide-react';
import { format, differenceInDays, parseISO, addDays, addHours, startOfDay } from 'date-fns';
import StandaloneFRATForm from './StandaloneFRATForm';
import { useFuelRequests } from './contexts/FuelRequestContext';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';

interface RunwayData {
  runway: string;
  tora: number;
  toda: number;
  lda: number;
  width: number;
  slope: number;
  pcn: string;
}

interface InstrumentApproach {
  runway: string;
  type: string;
  glidepath: number;
}

interface AirportEval {
  id: string;
  icao: string;
  name: string;
  tower: boolean;
  attendedHours: string;
  elevation: number;
  runways: RunwayData[];
  approaches: InstrumentApproach[];
  runwayLighting: string;
  mountainous: boolean;
  obstructions: string;
  firefighting: string;
  fboName: string;
  fboPhone: string;
  fboHours: string;
  fboLocation: string;
  restArea: boolean;
  jetAAvailable: boolean;
  deicingCapability: string;
  hangarSpace: string;
  opsNotes: string;
  limitations: string;
  status: 'active' | 'pending-changes' | 'denied';
  lastReviewed: string;
  reviewedBy: string;
  aircraft: string;
}

interface Leg {
  id: string;
  legNumber: number;
  departure: string;
  departureICAO: string;
  arrival: string;
  arrivalICAO: string;
  departureTime: string;
  arrivalTime: string;
  distance: number;
  duration: number;
  fratStatus: 'not-started' | 'in-progress' | 'completed';
  fratScore?: number;
  airportEvalsViewed: boolean;
  fratData?: any;
}

interface Trip {
  id: string;
  tripNumber: string;
  tailNumber: string;
  passengers: string[];
  crewMembers: string[];
  legs: Leg[];
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'in-progress' | 'completed';
  preflightStatus: 'not-started' | 'in-progress' | 'completed';
  fuelRequestId?: string; // Optional reference to trip-level fuel request
}

export default function PreflightWorkflow() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [selectedLeg, setSelectedLeg] = useState<{ tripId: string; legId: string } | null>(null);
  const [currentView, setCurrentView] = useState<'trips' | 'frat' | 'airport-evals'>('trips');
  const [fuelRequestModalOpen, setFuelRequestModalOpen] = useState(false);
  const [selectedTripForFuel, setSelectedTripForFuel] = useState<Trip | null>(null);
  const [fuelAmount, setFuelAmount] = useState('');
  const [fuelPriority, setFuelPriority] = useState<'normal' | 'urgent' | 'critical'>('normal');
  const [fuelNotes, setFuelNotes] = useState('');

  const { createFuelRequest, getFuelRequestsForTrip, fuelRequests } = useFuelRequests();

  // Airport evaluation data (from AirportEvaluations component)
  const airportEvaluations: AirportEval[] = [
    {
      id: 'apt-001',
      icao: 'KMMU',
      name: 'Morristown Municipal',
      tower: true,
      attendedHours: '0645-2230 L',
      elevation: 187,
      runways: [
        { runway: 'RWY05', tora: 5998, toda: 5998, lda: 5998, width: 150, slope: 0, pcn: '25/F/C/X/T DW80' },
        { runway: 'RWY23', tora: 5998, toda: 5998, lda: 5998, width: 150, slope: 0, pcn: '25/F/C/X/T DW80' }
      ],
      approaches: [
        { runway: 'RWY05', type: 'RNAV(GPS)', glidepath: 3.77 },
        { runway: 'RWY23', type: 'ILS', glidepath: 3 },
        { runway: 'RWY23', type: 'RNAV(GPS)', glidepath: 3 }
      ],
      runwayLighting: 'HIRL / MALSR 23 / REIL 05',
      mountainous: false,
      obstructions: 'Higher terrain to the SW thru NE quadrants',
      firefighting: 'ARFF Services available 24 hrs daily and when ATCT closed call 973.455.1953',
      fboName: 'Signature Flight Support',
      fboPhone: '973.292.1300',
      fboHours: '24 hrs',
      fboLocation: 'Ramp N off J Taxiway',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'Y (Type I & IV)',
      hangarSpace: 'Available',
      opsNotes: 'Excellent general aviation facility with professional FBO service. Signature provides reliable fuel and ground services. Airport well-maintained with good access to NYC metro area. Recommend avoiding peak business jet hours 0800-1000L and 1600-1800L due to ramp congestion.',
      limitations: '',
      status: 'active',
      lastReviewed: '2024-10-08',
      reviewedBy: 'CL350',
      aircraft: 'CL350'
    },
    {
      id: 'apt-002',
      icao: 'KTEB',
      name: 'Teterboro',
      tower: true,
      attendedHours: '24 hrs',
      elevation: 9,
      runways: [
        { runway: 'RWY06', tora: 7000, toda: 7000, lda: 7000, width: 150, slope: 0.1, pcn: '40/F/C/X/T DW110' },
        { runway: 'RWY24', tora: 7000, toda: 7000, lda: 7000, width: 150, slope: 0.1, pcn: '40/F/C/X/T DW110' },
        { runway: 'RWY19', tora: 6013, toda: 6013, lda: 6013, width: 150, slope: 0, pcn: '40/F/C/X/T DW110' },
        { runway: 'RWY01', tora: 6013, toda: 6013, lda: 6013, width: 150, slope: 0, pcn: '40/F/C/X/T DW110' }
      ],
      approaches: [
        { runway: 'RWY06', type: 'ILS', glidepath: 3 },
        { runway: 'RWY06', type: 'RNAV(GPS)', glidepath: 3 },
        { runway: 'RWY24', type: 'RNAV(GPS)', glidepath: 3 },
        { runway: 'RWY19', type: 'RNAV(GPS)', glidepath: 3 }
      ],
      runwayLighting: 'HIRL all runways / MALSR 06 / REIL 24, 19, 01',
      mountainous: false,
      obstructions: 'NYC Class B airspace overhead',
      firefighting: 'ARFF Index C - 24 hr coverage',
      fboName: 'Multiple FBOs - Meridian, Signature, Atlantic',
      fboPhone: '201.288.1775',
      fboHours: '24 hrs',
      fboLocation: 'Various ramps',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'Y (Type I, II, IV)',
      hangarSpace: 'Limited - advance notice required',
      opsNotes: 'RWK, JMS',
      limitations: 'Noise sensitive - mandatory curfew 2300-0600L. Special procedures required.',
      status: 'pending-changes',
      lastReviewed: '2024-11-20',
      reviewedBy: 'G650',
      aircraft: 'G650'
    },
    {
      id: 'apt-003',
      icao: 'KASE',
      name: 'Aspen-Pitkin County',
      tower: true,
      attendedHours: '0600-0100L',
      elevation: 7820,
      runways: [
        { runway: 'RWY15', tora: 8006, toda: 8006, lda: 7006, width: 100, slope: 0.7, pcn: '50/R/B/W/T' },
        { runway: 'RWY33', tora: 8006, toda: 8006, lda: 8006, width: 100, slope: 0.7, pcn: '50/R/B/W/T' }
      ],
      approaches: [
        { runway: 'RWY15', type: 'VOR/DME', glidepath: 3.77 },
        { runway: 'RWY33', type: 'RNAV(GPS)', glidepath: 6.5 }
      ],
      runwayLighting: 'MIRL / REIL 15, 33',
      mountainous: true,
      obstructions: 'Mountainous terrain all quadrants. High density altitude.',
      firefighting: 'ARFF Index B during tower hours',
      fboName: 'Signature Flight Support',
      fboPhone: '970.920.9000',
      fboHours: 'Tower hours',
      fboLocation: 'Main ramp',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'Y (Type I, IV)',
      hangarSpace: 'Very limited',
      opsNotes: 'MPW, TRH',
      limitations: 'Special qualification required. Steep approaches. RWY 33 VDP mandatory. High altitude operations.',
      status: 'active',
      lastReviewed: '2024-12-02',
      reviewedBy: 'G650',
      aircraft: 'G650'
    },
    {
      id: 'apt-004',
      icao: 'KTMB',
      name: 'Miami Executive',
      tower: true,
      attendedHours: '0700-2200L',
      elevation: 8,
      runways: [
        { runway: 'RWY09', tora: 5001, toda: 5001, lda: 5001, width: 100, slope: 0, pcn: '30/F/C/X/T' },
        { runway: 'RWY27', tora: 5001, toda: 5001, lda: 5001, width: 100, slope: 0, pcn: '30/F/C/X/T' }
      ],
      approaches: [
        { runway: 'RWY09', type: 'RNAV(GPS)', glidepath: 3 },
        { runway: 'RWY27', type: 'RNAV(GPS)', glidepath: 3 }
      ],
      runwayLighting: 'MIRL',
      mountainous: false,
      obstructions: 'None significant',
      firefighting: 'ARFF Index A during tower hours',
      fboName: 'Banyan Air Service',
      fboPhone: '954.491.3170',
      fboHours: '24 hrs',
      fboLocation: 'Main ramp',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'N',
      hangarSpace: 'Available',
      opsNotes: 'Excellent South Florida facility. Banyan provides top-tier service.',
      limitations: '',
      status: 'active',
      lastReviewed: '2024-11-15',
      reviewedBy: 'G650',
      aircraft: 'G650'
    },
    {
      id: 'apt-005',
      icao: 'KSJC',
      name: 'San Jose International',
      tower: true,
      attendedHours: '24 hrs',
      elevation: 62,
      runways: [
        { runway: 'RWY30L', tora: 11000, toda: 11000, lda: 11000, width: 150, slope: 0, pcn: '75/F/A/W/T' },
        { runway: 'RWY30R', tora: 10000, toda: 10000, lda: 10000, width: 150, slope: 0, pcn: '75/F/A/W/T' }
      ],
      approaches: [
        { runway: 'RWY30L', type: 'ILS', glidepath: 3 },
        { runway: 'RWY30R', type: 'ILS', glidepath: 3 }
      ],
      runwayLighting: 'HIRL',
      mountainous: false,
      obstructions: 'Class C airspace',
      firefighting: 'ARFF Index E - 24 hr',
      fboName: 'Signature Flight Support',
      fboPhone: '408.467.1900',
      fboHours: '24 hrs',
      fboLocation: 'North side',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'Y (Type I, IV)',
      hangarSpace: 'Available',
      opsNotes: 'Major commercial airport with excellent FBO services.',
      limitations: '',
      status: 'active',
      lastReviewed: '2024-11-28',
      reviewedBy: 'G650',
      aircraft: 'G650'
    }
  ];

  const getAirportEval = (icao: string): AirportEval | undefined => {
    return airportEvaluations.find(apt => apt.icao === icao);
  };

  // Load trips from MyAirOps (mock data for now)
  // All dates are computed relative to today so trips always appear in the demo
  useEffect(() => {
    const base = startOfDay(new Date());
    const d = (offsetDays: number, hour: number) =>
      addHours(addDays(base, offsetDays), hour).toISOString();

    const mockTrips: Trip[] = [
      {
        id: 'trip-001',
        tripNumber: 'T-2024-156',
        tailNumber: 'N1PG',
        passengers: ['John Smith (BOD)', 'Sarah Johnson (C-Suite, CFO)'],
        crewMembers: ['Capt. Mike Wilson', 'FO Sarah Davis', 'FA Jessica Martinez'],
        startDate: d(2, 8),
        endDate: d(4, 18),
        status: 'upcoming',
        preflightStatus: 'in-progress',
        legs: [
          {
            id: 'leg-001',
            legNumber: 1,
            departure: 'Teterboro',
            departureICAO: 'KTEB',
            arrival: 'Miami Executive',
            arrivalICAO: 'KTMB',
            departureTime: d(2, 8),
            arrivalTime: d(2, 11.5),
            distance: 1090,
            duration: 210,
            fratStatus: 'completed',
            fratScore: 12,
            airportEvalsViewed: true
          },
          {
            id: 'leg-002',
            legNumber: 2,
            departure: 'Miami Executive',
            departureICAO: 'KTMB',
            arrival: 'San Jose Intl',
            arrivalICAO: 'KSJC',
            departureTime: d(3, 14),
            arrivalTime: d(3, 19.75),
            distance: 2580,
            duration: 345,
            fratStatus: 'in-progress',
            airportEvalsViewed: false
          },
          {
            id: 'leg-003',
            legNumber: 3,
            departure: 'San Jose Intl',
            departureICAO: 'KSJC',
            arrival: 'Teterboro',
            arrivalICAO: 'KTEB',
            departureTime: d(4, 10),
            arrivalTime: d(4, 18.25),
            distance: 2565,
            duration: 315,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          }
        ]
      },
      {
        id: 'trip-002',
        tripNumber: 'T-2024-157',
        tailNumber: 'N2PG',
        passengers: ['David Chen (Authorized User)', 'Emily Roberts (Standard)'],
        crewMembers: ['Capt. Tom Anderson', 'FO Lisa Brown'],
        startDate: d(1, 6),
        endDate: d(1, 16),
        status: 'upcoming',
        preflightStatus: 'not-started',
        legs: [
          {
            id: 'leg-004',
            legNumber: 1,
            departure: 'Westchester County',
            departureICAO: 'KHPN',
            arrival: 'Aspen-Pitkin County',
            arrivalICAO: 'KASE',
            departureTime: d(1, 6),
            arrivalTime: d(1, 10.5),
            distance: 1750,
            duration: 270,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          },
          {
            id: 'leg-005',
            legNumber: 2,
            departure: 'Aspen-Pitkin County',
            departureICAO: 'KASE',
            arrival: 'Westchester County',
            arrivalICAO: 'KHPN',
            departureTime: d(1, 12),
            arrivalTime: d(1, 16.5),
            distance: 1750,
            duration: 270,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          }
        ]
      },
      {
        id: 'trip-003',
        tripNumber: 'T-2024-158',
        tailNumber: 'N1PG',
        passengers: ['Robert Williams (C-Suite, CEO)'],
        crewMembers: ['Capt. James Taylor', 'FO Maria Garcia', 'FA Robert Lee'],
        startDate: d(4, 9),
        endDate: d(7, 20),
        status: 'upcoming',
        preflightStatus: 'not-started',
        legs: [
          {
            id: 'leg-006',
            legNumber: 1,
            departure: 'Teterboro',
            departureICAO: 'KTEB',
            arrival: 'London Luton',
            arrivalICAO: 'EGGW',
            departureTime: d(4, 21),
            arrivalTime: d(5, 9.5),
            distance: 3465,
            duration: 450,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          },
          {
            id: 'leg-007',
            legNumber: 2,
            departure: 'London Luton',
            departureICAO: 'EGGW',
            arrival: 'Teterboro',
            arrivalICAO: 'KTEB',
            departureTime: d(7, 11),
            arrivalTime: d(7, 14.25),
            distance: 3465,
            duration: 435,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          }
        ]
      },
      {
        id: 'trip-004',
        tripNumber: 'T-2024-159',
        tailNumber: 'N5PG',
        passengers: ['Michael Brown (BOD)', 'Jennifer Davis (C-Suite, COO)', 'Amanda White (Authorized User)'],
        crewMembers: ['Capt. Robert Chen', 'FO Kevin Martinez', 'FA Laura Thompson'],
        startDate: d(-1, 10),
        endDate: d(-1, 22),
        status: 'upcoming',
        preflightStatus: 'completed',
        legs: [
          {
            id: 'leg-008',
            legNumber: 1,
            departure: 'Van Nuys',
            departureICAO: 'KVNY',
            arrival: 'Scottsdale',
            arrivalICAO: 'KSDL',
            departureTime: d(-1, 10),
            arrivalTime: d(-1, 11.75),
            distance: 335,
            duration: 105,
            fratStatus: 'completed',
            fratScore: 8,
            airportEvalsViewed: true
          },
          {
            id: 'leg-009',
            legNumber: 2,
            departure: 'Scottsdale',
            departureICAO: 'KSDL',
            arrival: 'Van Nuys',
            arrivalICAO: 'KVNY',
            departureTime: d(-1, 20),
            arrivalTime: d(-1, 21.83),
            distance: 335,
            duration: 110,
            fratStatus: 'completed',
            fratScore: 9,
            airportEvalsViewed: true
          }
        ]
      },
      {
        id: 'trip-005',
        tripNumber: 'T-2024-160',
        tailNumber: 'N1PG',
        passengers: ['Patricia Moore (Standard, Notes: VIP Guest)', 'Thomas Anderson (Authorized User)'],
        crewMembers: ['Capt. Daniel Park', 'FO Michelle Lee'],
        startDate: d(3, 14),
        endDate: d(4, 18),
        status: 'upcoming',
        preflightStatus: 'in-progress',
        legs: [
          {
            id: 'leg-010',
            legNumber: 1,
            departure: 'Dallas Love Field',
            departureICAO: 'KDAL',
            arrival: 'Chicago Executive',
            arrivalICAO: 'KPWK',
            departureTime: d(3, 14),
            arrivalTime: d(3, 16.5),
            distance: 800,
            duration: 150,
            fratStatus: 'completed',
            fratScore: 11,
            airportEvalsViewed: true
          },
          {
            id: 'leg-011',
            legNumber: 2,
            departure: 'Chicago Executive',
            departureICAO: 'KPWK',
            arrival: 'Boston Logan',
            arrivalICAO: 'KBOS',
            departureTime: d(4, 8),
            arrivalTime: d(4, 10.75),
            distance: 850,
            duration: 165,
            fratStatus: 'in-progress',
            airportEvalsViewed: false
          },
          {
            id: 'leg-012',
            legNumber: 3,
            departure: 'Boston Logan',
            departureICAO: 'KBOS',
            arrival: 'Dallas Love Field',
            arrivalICAO: 'KDAL',
            departureTime: d(4, 15),
            arrivalTime: d(4, 18.25),
            distance: 1550,
            duration: 195,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          }
        ]
      },
      {
        id: 'trip-006',
        tripNumber: 'T-2024-161',
        tailNumber: 'N2PG',
        passengers: ['Christopher Taylor (BOD)', 'Lisa Martinez (C-Suite, CTO)'],
        crewMembers: ['Capt. Andrew Wilson', 'FO Rebecca Johnson', 'FA Michael Davis'],
        startDate: d(5, 6),
        endDate: d(7, 20),
        status: 'upcoming',
        preflightStatus: 'not-started',
        legs: [
          {
            id: 'leg-013',
            legNumber: 1,
            departure: 'Seattle Boeing Field',
            departureICAO: 'KBFI',
            arrival: 'Jackson Hole',
            arrivalICAO: 'KJAC',
            departureTime: d(5, 6),
            arrivalTime: d(5, 8.25),
            distance: 625,
            duration: 135,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          },
          {
            id: 'leg-014',
            legNumber: 2,
            departure: 'Jackson Hole',
            departureICAO: 'KJAC',
            arrival: 'Denver Centennial',
            arrivalICAO: 'KAPA',
            departureTime: d(6, 10),
            arrivalTime: d(6, 11.5),
            distance: 415,
            duration: 90,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          },
          {
            id: 'leg-015',
            legNumber: 3,
            departure: 'Denver Centennial',
            departureICAO: 'KAPA',
            arrival: 'Seattle Boeing Field',
            arrivalICAO: 'KBFI',
            departureTime: d(7, 17),
            arrivalTime: d(7, 19.75),
            distance: 1025,
            duration: 165,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          }
        ]
      },
      {
        id: 'trip-007',
        tripNumber: 'T-2024-162',
        tailNumber: 'N5PG',
        passengers: ['Elizabeth Clark (Authorized User)', 'James Rodriguez (Standard)'],
        crewMembers: ['Capt. Steven Harris', 'FO Nicole Brown'],
        startDate: d(0, 9),
        endDate: d(0, 17),
        status: 'upcoming',
        preflightStatus: 'not-started',
        legs: [
          {
            id: 'leg-016',
            legNumber: 1,
            departure: 'Atlanta Dekalb-Peachtree',
            departureICAO: 'KPDK',
            arrival: 'Orlando Executive',
            arrivalICAO: 'KORL',
            departureTime: d(0, 9),
            arrivalTime: d(0, 10.75),
            distance: 410,
            duration: 105,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          },
          {
            id: 'leg-017',
            legNumber: 2,
            departure: 'Orlando Executive',
            departureICAO: 'KORL',
            arrival: 'Atlanta Dekalb-Peachtree',
            arrivalICAO: 'KPDK',
            departureTime: d(0, 15),
            arrivalTime: d(0, 16.83),
            distance: 410,
            duration: 110,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          }
        ]
      },
      {
        id: 'trip-008',
        tripNumber: 'T-2024-163',
        tailNumber: 'N1PG',
        passengers: ['William Turner (C-Suite, CEO)', 'Mary Wilson (BOD)', 'Jessica Lewis (C-Suite, CFO)'],
        crewMembers: ['Capt. Christopher Moore', 'FO Amanda Taylor', 'FA David Anderson'],
        startDate: d(5, 18),
        endDate: d(10, 14),
        status: 'upcoming',
        preflightStatus: 'not-started',
        legs: [
          {
            id: 'leg-018',
            legNumber: 1,
            departure: 'New York JFK',
            departureICAO: 'KJFK',
            arrival: 'Paris Le Bourget',
            arrivalICAO: 'LFPB',
            departureTime: d(5, 18),
            arrivalTime: d(6, 6.75),
            distance: 3625,
            duration: 465,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          },
          {
            id: 'leg-019',
            legNumber: 2,
            departure: 'Paris Le Bourget',
            departureICAO: 'LFPB',
            arrival: 'Geneva',
            arrivalICAO: 'LSGG',
            departureTime: d(8, 10),
            arrivalTime: d(8, 11.5),
            distance: 255,
            duration: 90,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          },
          {
            id: 'leg-020',
            legNumber: 3,
            departure: 'Geneva',
            departureICAO: 'LSGG',
            arrival: 'New York JFK',
            arrivalICAO: 'KJFK',
            departureTime: d(10, 4),
            arrivalTime: d(10, 12.5),
            distance: 3800,
            duration: 510,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          }
        ]
      },
      {
        id: 'trip-009',
        tripNumber: 'T-2024-164',
        tailNumber: 'N2PG',
        passengers: ['Richard Walker (Authorized User)'],
        crewMembers: ['Capt. Patricia Garcia', 'FO Brian Martinez'],
        startDate: d(0, 12),
        endDate: d(0, 20),
        status: 'upcoming',
        preflightStatus: 'completed',
        legs: [
          {
            id: 'leg-021',
            legNumber: 1,
            departure: 'Las Vegas Henderson',
            departureICAO: 'KHND',
            arrival: 'Santa Monica',
            arrivalICAO: 'KSMO',
            departureTime: d(0, 12),
            arrivalTime: d(0, 13.25),
            distance: 210,
            duration: 75,
            fratStatus: 'completed',
            fratScore: 7,
            airportEvalsViewed: true
          },
          {
            id: 'leg-022',
            legNumber: 2,
            departure: 'Santa Monica',
            departureICAO: 'KSMO',
            arrival: 'Las Vegas Henderson',
            arrivalICAO: 'KHND',
            departureTime: d(0, 18),
            arrivalTime: d(0, 19.33),
            distance: 210,
            duration: 80,
            fratStatus: 'completed',
            fratScore: 8,
            airportEvalsViewed: true
          }
        ]
      },
      {
        id: 'trip-010',
        tripNumber: 'T-2024-165',
        tailNumber: 'N5PG',
        passengers: ['Nancy King (Standard, Notes: First time flyer)', 'Kevin Wright (Authorized User)', 'Sandra Lopez (Standard)'],
        crewMembers: ['Capt. Matthew Scott', 'FO Jennifer Young', 'FA Christopher Allen'],
        startDate: d(3, 15),
        endDate: d(4, 22),
        status: 'upcoming',
        preflightStatus: 'in-progress',
        legs: [
          {
            id: 'leg-023',
            legNumber: 1,
            departure: 'Houston Hobby',
            departureICAO: 'KHOU',
            arrival: 'Phoenix Deer Valley',
            arrivalICAO: 'KDVT',
            departureTime: d(3, 15),
            arrivalTime: d(3, 17.75),
            distance: 970,
            duration: 165,
            fratStatus: 'completed',
            fratScore: 13,
            airportEvalsViewed: true
          },
          {
            id: 'leg-024',
            legNumber: 2,
            departure: 'Phoenix Deer Valley',
            departureICAO: 'KDVT',
            arrival: 'San Diego Montgomery',
            arrivalICAO: 'KMYF',
            departureTime: d(4, 9),
            arrivalTime: d(4, 10.5),
            distance: 300,
            duration: 90,
            fratStatus: 'in-progress',
            airportEvalsViewed: false
          },
          {
            id: 'leg-025',
            legNumber: 3,
            departure: 'San Diego Montgomery',
            departureICAO: 'KMYF',
            arrival: 'Houston Hobby',
            arrivalICAO: 'KHOU',
            departureTime: d(4, 18),
            arrivalTime: d(4, 22.25),
            distance: 1230,
            duration: 195,
            fratStatus: 'not-started',
            airportEvalsViewed: false
          }
        ]
      }
    ];

    // Show all trips — dates are always relative to today
    setTrips(mockTrips);
  }, []);

  const toggleTripExpanded = (tripId: string) => {
    const newExpanded = new Set(expandedTrips);
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId);
    } else {
      newExpanded.add(tripId);
    }
    setExpandedTrips(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ComponentType<any> }> = {
      'not-started': { color: 'bg-gray-100 text-gray-700', icon: Circle },
      'in-progress': { color: 'bg-blue-100 text-blue-700', icon: Clock },
      'completed': { color: 'bg-green-100 text-green-700', icon: CheckCircle2 }
    };
    const config = statusConfig[status] || statusConfig['not-started'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
      </span>
    );
  };

  const getFratScoreColor = (score: number) => {
    if (score <= 10) return 'text-green-600';
    if (score <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const startFratForLeg = (tripId: string, legId: string) => {
    setSelectedLeg({ tripId, legId });
    setCurrentView('frat');
  };

  const viewAirportEvals = (tripId: string, legId: string) => {
    setSelectedLeg({ tripId, legId });
    setCurrentView('airport-evals');
  };

  const exportToPDF = (trip: Trip) => {
    // Generate comprehensive PDF content summary
    const completedLegs = trip.legs.filter(leg => leg.fratStatus === 'completed');
    const uniqueAirports = new Set<string>();
    trip.legs.forEach(leg => {
      uniqueAirports.add(leg.departureICAO);
      uniqueAirports.add(leg.arrivalICAO);
    });

    const airportList = Array.from(uniqueAirports).map(icao => {
      const airport = getAirportEval(icao);
      return airport ? `${icao} - ${airport.name}` : icao;
    }).join('\n    • ');

    const fuelRequest = getTripFuelRequest(trip.id);
    const fuelInfo = fuelRequest
      ? `\n\n📋 FUEL REQUEST:\n  • Amount: ${fuelRequest.fuelRequestedPounds} lbs (~${Math.round(fuelRequest.fuelRequestedPounds / 6.7)} gal)\n  • Priority: ${fuelRequest.priority.toUpperCase()}\n  • Status: ${fuelRequest.status}${fuelRequest.pilotNotes ? `\n  • Notes: ${fuelRequest.pilotNotes}` : ''}`
      : '';

    const fratSummary = completedLegs.length > 0
      ? `\n\n📊 FRAT SCORES:\n${completedLegs.map(leg => `  • Leg ${leg.legNumber} (${leg.departureICAO}-${leg.arrivalICAO}): ${leg.fratScore} ${leg.fratScore! <= 10 ? '✅ Low Risk' : leg.fratScore! <= 15 ? '⚠️ Medium Risk' : '🔴 High Risk'}`).join('\n')}`
      : '\n\n⚠️ No FRAT forms completed yet';

    alert(`📄 PDF EXPORT FOR ${trip.tripNumber}\n\nThis will generate a comprehensive preflight package including:\n\n✈️ TRIP SUMMARY:\n  • Aircraft: ${trip.tailNumber}\n  • Dates: ${format(parseISO(trip.startDate), 'MMM d')} - ${format(parseISO(trip.endDate), 'MMM d, yyyy')}\n  • Crew: ${trip.crewMembers.join(', ')}\n  • Passengers: ${trip.passengers.length}\n  • Legs: ${trip.legs.length}${fratSummary}\n\n🏢 AIRPORT EVALUATIONS (${uniqueAirports.size} airports):\n    • ${airportList}${fuelInfo}\n\n📱 The PDF will be generated and ready to share from your iOS device.\n\n⚠️ Note: Actual PDF generation will be implemented with a PDF library (e.g., jsPDF or react-pdf).`);

    // TODO: Implement actual PDF generation using jsPDF or similar library
    // This would create a professional PDF with:
    // - Cover page with trip details
    // - FRAT summary table
    // - Detailed FRAT forms for each leg
    // - Airport evaluation pages for each unique airport
    // - Fuel request details (if exists)
    console.log('PDF export requested for:', trip.tripNumber);
  };

  const pushToForeFlight = (trip: Trip) => {
    // This would use ForeFlight API to push the PDF
    console.log('Pushing to ForeFlight:', trip.tripNumber);
    alert(`Integration with ForeFlight API will push the preflight package for ${trip.tripNumber}. Feature coming soon!`);
  };

  const getDaysUntilTrip = (startDate: string) => {
    const today = new Date();
    const tripDate = parseISO(startDate);
    const days = differenceInDays(tripDate, today);

    if (days < 0) return 'In Progress';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  const openFuelRequestModal = (trip: Trip) => {
    setSelectedTripForFuel(trip);
    setFuelRequestModalOpen(true);
    setFuelAmount('');
    setFuelPriority('normal');
    setFuelNotes('');
  };

  const handleFuelRequestSubmit = () => {
    if (!selectedTripForFuel) return;

    const fuelPounds = parseFloat(fuelAmount);
    if (isNaN(fuelPounds) || fuelPounds <= 0) {
      toast.error('Please enter a valid fuel amount');
      return;
    }

    const firstLeg = selectedTripForFuel.legs[0];
    if (!firstLeg) {
      toast.error('Trip has no legs');
      return;
    }

    createFuelRequest({
      tripId: selectedTripForFuel.id,
      legId: firstLeg.id, // Use first leg for scheduling
      flightNumber: selectedTripForFuel.tripNumber,
      tailNumber: selectedTripForFuel.tailNumber,
      departure: firstLeg.departure,
      departureICAO: firstLeg.departureICAO,
      arrival: firstLeg.arrival,
      arrivalICAO: firstLeg.arrivalICAO,
      departureTime: firstLeg.departureTime,
      fuelRequestedPounds: fuelPounds,
      priority: fuelPriority,
      pilotNotes: fuelNotes,
      requestedBy: 'Current Pilot' // In production, get from auth context
    });

    setFuelRequestModalOpen(false);
    setSelectedTripForFuel(null);
  };

  const getTripFuelRequest = (tripId: string) => {
    const requests = getFuelRequestsForTrip(tripId);
    return requests.length > 0 ? requests[0] : null;
  };

  const getFuelRequestStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      'pending': { color: 'bg-yellow-100 text-yellow-700', label: 'Fuel Pending' },
      'acknowledged': { color: 'bg-blue-100 text-blue-700', label: 'Fuel Ack' },
      'sent-to-fuel-farm': { color: 'bg-purple-100 text-purple-700', label: 'At Fuel Farm' },
      'fueling': { color: 'bg-orange-100 text-orange-700', label: 'Fueling' },
      'completed': { color: 'bg-green-100 text-green-700', label: 'Fueled' },
      'cancelled': { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' }
    };
    const config = statusConfig[status] || statusConfig['pending'];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
        <Fuel className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (currentView === 'frat' && selectedLeg) {
    const trip = trips.find(t => t.id === selectedLeg.tripId);
    const leg = trip?.legs.find(l => l.id === selectedLeg.legId);

    return (
      <div className="space-y-6">
        <StandaloneFRATForm
          initialData={{
            flightNumber: trip?.tripNumber,
            aircraft: trip?.tailNumber,
            departure: leg?.departureICAO,
            destination: leg?.arrivalICAO,
            date: leg?.departureTime.split('T')[0],
            time: leg?.departureTime.split('T')[1].substring(0, 5),
            pic: trip?.crewMembers.find(c => c.includes('Capt'))
          }}
          onClose={() => setCurrentView('trips')}
          onSave={(data) => {
            console.log('FRAT Saved', data);
            // Here we would actually update the trip/leg state
            if (data.status === 'submitted') {
              // Update local state to show completed
              const updatedTrips = trips.map(t => {
                if (t.id === selectedLeg.tripId) {
                  return {
                    ...t,
                    legs: t.legs.map(l => {
                      if (l.id === selectedLeg.legId) {
                        return { ...l, fratStatus: 'completed' as const, fratScore: data.totalScore };
                      }
                      return l;
                    })
                  };
                }
                return t;
              });
              setTrips(updatedTrips);
              setCurrentView('trips');
            }
          }}
        />
      </div>
    );
  }

  if (currentView === 'airport-evals' && selectedLeg) {
    const trip = trips.find(t => t.id === selectedLeg.tripId);
    const leg = trip?.legs.find(l => l.id === selectedLeg.legId);
    const departureAirport = leg ? getAirportEval(leg.departureICAO) : null;
    const arrivalAirport = leg ? getAirportEval(leg.arrivalICAO) : null;

    const renderAirportCard = (airport: AirportEval | null, icao: string, name: string) => {
      if (!airport) {
        return (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold">{name}</h3>
                <p className="text-sm text-muted-foreground">{icao}</p>
              </div>
            </div>
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Airport evaluation not available</p>
              <p className="text-sm mt-1">Contact operations for airport information</p>
            </div>
          </Card>
        );
      }

      return (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold">{airport.name}</h3>
                <p className="text-sm text-muted-foreground">{airport.icao}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {airport.mountainous && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                  <AlertCircle className="w-3 h-3" />
                  Mountainous
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Elevation</p>
                <p className="font-medium">{airport.elevation} ft</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tower</p>
                <p className="font-medium">{airport.tower ? `Yes (${airport.attendedHours})` : 'No'}</p>
              </div>
            </div>

            {/* Runways */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Runways</h4>
              <div className="space-y-2">
                {airport.runways.map((rwy, idx) => (
                  <div key={idx} className="text-xs bg-accent/30 p-2 rounded">
                    <div className="font-semibold mb-1">{rwy.runway}</div>
                    <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                      <div>TORA: {rwy.tora}'</div>
                      <div>LDA: {rwy.lda}'</div>
                      <div>Width: {rwy.width}'</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{airport.runwayLighting}</p>
            </div>

            {/* Approaches */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Instrument Approaches</h4>
              <div className="flex flex-wrap gap-2">
                {airport.approaches.map((appr, idx) => (
                  <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {appr.runway} {appr.type}
                  </span>
                ))}
              </div>
            </div>

            {/* FBO Information */}
            <div className="bg-accent/20 p-3 rounded-lg">
              <h4 className="text-sm font-semibold mb-2">FBO Information</h4>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> {airport.fboName}</p>
                <p><span className="text-muted-foreground">Phone:</span> {airport.fboPhone}</p>
                <p><span className="text-muted-foreground">Hours:</span> {airport.fboHours}</p>
                <p><span className="text-muted-foreground">Location:</span> {airport.fboLocation}</p>
              </div>
            </div>

            {/* Services */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className={`w-3 h-3 ${airport.jetAAvailable ? 'text-green-600' : 'text-gray-400'}`} />
                <span>Jet A Available</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className={`w-3 h-3 ${airport.deicingCapability !== 'N' ? 'text-green-600' : 'text-gray-400'}`} />
                <span>Deicing: {airport.deicingCapability}</span>
              </div>
            </div>

            {/* Operational Notes */}
            {airport.opsNotes && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Operational Notes</h4>
                <p className="text-sm text-blue-800">{airport.opsNotes}</p>
              </div>
            )}

            {/* Limitations */}
            {airport.limitations && (
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-orange-900 mb-1">Limitations</h4>
                    <p className="text-sm text-orange-800">{airport.limitations}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Obstructions */}
            {airport.obstructions && (
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">Obstructions:</span> {airport.obstructions}
              </div>
            )}
          </div>
        </Card>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => setCurrentView('trips')}
              className="mb-2"
            >
              <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
              Back to Trips
            </Button>
            <h1 className="text-2xl">Airport Evaluations - Leg {leg?.legNumber}</h1>
            <p className="text-muted-foreground">
              {leg?.departure} ({leg?.departureICAO}) & {leg?.arrival} ({leg?.arrivalICAO})
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {renderAirportCard(departureAirport || null, leg?.departureICAO || '', leg?.departure || '')}
          {renderAirportCard(arrivalAirport || null, leg?.arrivalICAO || '', leg?.arrival || '')}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => window.open('/airport-evaluations', '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            View Full Airport Database
          </Button>
          <Button onClick={() => {
            // Mark airport evals as viewed
            const updatedTrips = trips.map(t => {
              if (t.id === selectedLeg.tripId) {
                return {
                  ...t,
                  legs: t.legs.map(l => {
                    if (l.id === selectedLeg.legId) {
                      return { ...l, airportEvalsViewed: true };
                    }
                    return l;
                  })
                };
              }
              return t;
            });
            setTrips(updatedTrips);
            setCurrentView('trips');
            toast.success('Airport evaluations marked as reviewed');
          }}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Reviewed & Return
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl">Preflight Workflow</h1>
          <p className="text-muted-foreground">
            Complete FRAT forms and review airport evaluations for upcoming trips
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Sync MyAirOps
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plane className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Trips</p>
              <p className="text-2xl">{trips.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending FRATs</p>
              <p className="text-2xl">
                {trips.reduce((sum, trip) =>
                  sum + trip.legs.filter(leg => leg.fratStatus !== 'completed').length, 0
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl">
                {trips.reduce((sum, trip) =>
                  sum + trip.legs.filter(leg => leg.fratStatus === 'completed').length, 0
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Legs</p>
              <p className="text-2xl">
                {trips.reduce((sum, trip) => sum + trip.legs.length, 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Trips List */}
      <div className="space-y-4">
        {trips.length === 0 ? (
          <Card className="p-12 text-center">
            <Plane className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg mb-2">No Upcoming Trips</h3>
            <p className="text-muted-foreground">
              Trips will appear here 7 days before departure
            </p>
          </Card>
        ) : (
          trips.map(trip => {
            const isExpanded = expandedTrips.has(trip.id);
            const completedLegs = trip.legs.filter(leg => leg.fratStatus === 'completed').length;
            const totalLegs = trip.legs.length;

            return (
              <Card key={trip.id} className="overflow-hidden">
                {/* Trip Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleTripExpanded(trip.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <h3 className="text-lg font-semibold">{trip.tripNumber}</h3>
                        {getStatusBadge(trip.preflightStatus)}
                        {getTripFuelRequest(trip.id) && getFuelRequestStatusBadge(getTripFuelRequest(trip.id)!.status)}
                        <span className="text-sm text-muted-foreground">
                          {getDaysUntilTrip(trip.startDate)}
                        </span>
                      </div>

                      <div className="ml-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4 text-muted-foreground" />
                          <span>{trip.tailNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{format(parseISO(trip.startDate), 'MMM d')} - {format(parseISO(trip.endDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{trip.legs.length} {trip.legs.length === 1 ? 'leg' : 'legs'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{trip.passengers.length} {trip.passengers.length === 1 ? 'passenger' : 'passengers'}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="ml-8 mt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            Preflight Progress: {completedLegs}/{totalLegs} legs completed
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${(completedLegs / totalLegs) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      {!getTripFuelRequest(trip.id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openFuelRequestModal(trip)}
                        >
                          <Fuel className="w-4 h-4 mr-2" />
                          Request Fuel
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPDF(trip)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pushToForeFlight(trip)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        ForeFlight
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Legs */}
                {isExpanded && (
                  <div className="border-t bg-accent/20">
                    <div className="p-6 space-y-3">
                      {/* Crew & Passengers */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4 pb-4 border-b">
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Crew Members
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {trip.crewMembers.map((crew, idx) => (
                              <li key={idx}>• {crew}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Passengers
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {trip.passengers.map((pax, idx) => (
                              <li key={idx}>• {pax}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Legs */}
                      {trip.legs.map((leg, idx) => (
                        <Card key={leg.id} className="p-4 bg-background">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-semibold text-muted-foreground">
                                  Leg {leg.legNumber}
                                </span>
                                {getStatusBadge(leg.fratStatus)}
                                {leg.fratScore && (
                                  <span className={`text-sm font-semibold ${getFratScoreColor(leg.fratScore)}`}>
                                    FRAT Score: {leg.fratScore}
                                  </span>
                                )}
                              </div>

                              <div className="grid md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground mb-1">Route</p>
                                  <p className="font-medium">
                                    {leg.departure} ({leg.departureICAO}) → {leg.arrival} ({leg.arrivalICAO})
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Departure</p>
                                  <p className="font-medium">
                                    {format(parseISO(leg.departureTime), 'MMM d, HH:mm')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Duration</p>
                                  <p className="font-medium">
                                    {Math.floor(leg.duration / 60)}h {leg.duration % 60}m • {leg.distance} nm
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              {leg.fratStatus === 'not-started' && (
                                <>
                                  <Button
                                    onClick={() => startFratForLeg(trip.id, leg.id)}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Start FRAT
                                  </Button>
                                  <Button
                                    onClick={() => viewAirportEvals(trip.id, leg.id)}
                                    variant="outline"
                                  >
                                    <MapPin className="w-4 h-4 mr-2" />
                                    Airport Evals
                                  </Button>
                                </>
                              )}
                              {leg.fratStatus === 'in-progress' && (
                                <>
                                  <Button
                                    onClick={() => startFratForLeg(trip.id, leg.id)}
                                    variant="outline"
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Continue FRAT
                                  </Button>
                                  <Button
                                    onClick={() => viewAirportEvals(trip.id, leg.id)}
                                    variant="outline"
                                  >
                                    <MapPin className="w-4 h-4 mr-2" />
                                    Airport Evals
                                  </Button>
                                </>
                              )}
                              {leg.fratStatus === 'completed' && (
                                <>
                                  <Button
                                    onClick={() => startFratForLeg(trip.id, leg.id)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View FRAT
                                  </Button>
                                  <Button
                                    onClick={() => viewAirportEvals(trip.id, leg.id)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <MapPin className="w-4 h-4 mr-2" />
                                    {leg.airportEvalsViewed ? 'Review' : 'View'} Airport Evals
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Fuel Request Modal */}
      <Dialog open={fuelRequestModalOpen} onOpenChange={setFuelRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Fuel Load</DialogTitle>
            <DialogDescription>
              Submit a fuel load request for trip {selectedTripForFuel?.tripNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fuel-amount">Fuel Amount (pounds)</Label>
              <Input
                id="fuel-amount"
                type="number"
                placeholder="Enter fuel amount in pounds"
                value={fuelAmount}
                onChange={(e) => setFuelAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Estimated: {fuelAmount ? Math.round(parseFloat(fuelAmount) / 6.7) : 0} gallons
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-priority">Priority</Label>
              <Select value={fuelPriority} onValueChange={(value: any) => setFuelPriority(value)}>
                <SelectTrigger id="fuel-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-notes">Notes (Optional)</Label>
              <Input
                id="fuel-notes"
                placeholder="Additional notes for maintenance"
                value={fuelNotes}
                onChange={(e) => setFuelNotes(e.target.value)}
              />
            </div>

            {selectedTripForFuel && (
              <div className="bg-accent/50 p-3 rounded-lg text-sm">
                <p className="font-semibold mb-1">Trip Details:</p>
                <p>Aircraft: {selectedTripForFuel.tailNumber}</p>
                <p>First Departure: {selectedTripForFuel.legs[0]?.departure} ({selectedTripForFuel.legs[0]?.departureICAO})</p>
                <p>Departure Time: {selectedTripForFuel.legs[0] && format(parseISO(selectedTripForFuel.legs[0].departureTime), 'MMM d, yyyy HH:mm')}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFuelRequestModalOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleFuelRequestSubmit}>
              <Fuel className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
