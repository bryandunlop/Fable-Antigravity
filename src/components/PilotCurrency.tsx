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
import { Textarea } from './ui/textarea';
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
  Database,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Send,
  Edit3,
  Trash2,
  Flag,
  Shield,
  Compass,
  Timer,
  FileText,
  X,
  Sparkles,
  Info,
  Users,
  CircleDot
} from 'lucide-react';
import { format, differenceInDays, addDays, addMonths, subDays, isAfter, subMonths, endOfMonth } from 'date-fns';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type AircraftType = 'G500' | 'G650' | 'G800';
type CurrencyStatus = 'current' | 'warning' | 'expired';
type ComplianceMethod = 'standard' | 'alternate_6mo' | 'alternate_12mo';
type CrewRole = 'PILOT' | 'FA';

interface FlightLog {
  id: string;
  date: Date;
  flightNumber: string;
  tailNumber: string;
  aircraftType: AircraftType;
  origin: string;
  destination: string;
  flightTime: number;
  landings: number;
  nightLandings: number;
  instrumentApproaches: number;
  holds: number;
  crewId: string;
  crewName: string;
  crewRole: 'PIC' | 'SIC' | 'FA';
}

interface CurrencyResult {
  status: CurrencyStatus;
  count: number;
  required: number;
  expiryDate: Date | null;
  daysRemaining: number;
  complianceMethod?: ComplianceMethod;
  notes?: string;
}

interface PilotTypeCurrency {
  aircraftType: AircraftType;
  generalCurrency: CurrencyResult;
  nightCurrency: CurrencyResult;
  nightCurrencyAlternate: CurrencyResult | null;
  nightCurrencyEffective: CurrencyResult;
  instrumentCurrency: CurrencyResult;
  holdingCurrency: CurrencyResult;
  picCheck: CurrencyResult;
  daysSinceLastFlown: number | null;
  lastFlownDate: Date | null;
  totalHoursInType: number;
  overallStatus: CurrencyStatus;
}

interface CrewMember {
  crewId: string;
  crewName: string;
  crewRole: CrewRole;
  typeCurrencies: Record<AircraftType, PilotTypeCurrency>;
  notes: CurrencyNote[];
}

interface CurrencyNote {
  id: string;
  authorName: string;
  content: string;
  isUrgent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PilotCurrencyProps {
  userRole: string;
  pilotId?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const AIRCRAFT_TYPES: AircraftType[] = ['G500', 'G650', 'G800'];

const AIRCRAFT_LABELS: Record<AircraftType, string> = {
  G500: 'Gulfstream G500',
  G650: 'Gulfstream G650',
  G800: 'Gulfstream G800',
};

// ═══════════════════════════════════════════════════════════════
// CALCULATION HELPERS
// ═══════════════════════════════════════════════════════════════

function endOfCalendarMonthPlus(date: Date, monthsToAdd: number): Date {
  const target = addMonths(date, monthsToAdd);
  return endOfMonth(target);
}

function calculateGeneralCurrency(flights: FlightLog[], now: Date): CurrencyResult {
  const windowStart = subDays(now, 90);
  const qualifying = flights
    .filter(f => f.date >= windowStart && f.crewRole === 'PIC' && f.landings > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const landingDates: Date[] = [];
  qualifying.forEach(f => {
    for (let i = 0; i < f.landings; i++) landingDates.push(f.date);
  });

  const total = landingDates.length;

  if (total >= 3) {
    const thirdOldest = landingDates[total - 3];
    const expiryDate = addDays(thirdOldest, 90);
    const daysRemaining = differenceInDays(expiryDate, now);
    return {
      status: daysRemaining <= 30 || total === 3 ? 'warning' : 'current',
      count: total, required: 3, expiryDate, daysRemaining: Math.max(0, daysRemaining)
    };
  }
  return { status: 'expired', count: total, required: 3, expiryDate: null, daysRemaining: 0 };
}

function calculateNightCurrencyStandard(flights: FlightLog[], now: Date): CurrencyResult {
  const windowStart = subDays(now, 90);
  const qualifying = flights
    .filter(f => f.date >= windowStart && f.crewRole === 'PIC' && f.nightLandings > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const nightDates: Date[] = [];
  qualifying.forEach(f => {
    for (let i = 0; i < f.nightLandings; i++) nightDates.push(f.date);
  });

  const total = nightDates.length;

  if (total >= 3) {
    const thirdOldest = nightDates[total - 3];
    const expiryDate = addDays(thirdOldest, 90);
    const daysRemaining = differenceInDays(expiryDate, now);
    return {
      status: daysRemaining <= 30 || total === 3 ? 'warning' : 'current',
      count: total, required: 3, expiryDate, daysRemaining: Math.max(0, daysRemaining),
      complianceMethod: 'standard'
    };
  }
  return { status: 'expired', count: total, required: 3, expiryDate: null, daysRemaining: 0, complianceMethod: 'standard' };
}

function calculateNightCurrencyAlternate(allFlights: FlightLog[], now: Date): CurrencyResult | null {
  // Simplified: check Option A — 3 night landings in ANY multi-crew turbine in 6 months
  const sixMonthCutoff = subMonths(now, 6);
  const qualifying = allFlights
    .filter(f => f.date >= sixMonthCutoff && f.crewRole === 'PIC' && f.nightLandings > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const nightDates: Date[] = [];
  qualifying.forEach(f => {
    for (let i = 0; i < f.nightLandings; i++) nightDates.push(f.date);
  });

  const total = nightDates.length;

  if (total >= 3) {
    const thirdOldest = nightDates[total - 3];
    const expiryDate = endOfCalendarMonthPlus(thirdOldest, 6);
    const daysRemaining = differenceInDays(expiryDate, now);
    return {
      status: daysRemaining <= 60 ? 'warning' : 'current',
      count: total, required: 3, expiryDate, daysRemaining: Math.max(0, daysRemaining),
      complianceMethod: 'alternate_6mo',
      notes: '§ 61.57(e) — 3 night landings in any multi-crew turbine (6-month window)'
    };
  }
  return null;
}

function calculateInstrumentCurrency(flights: FlightLog[], now: Date): CurrencyResult {
  const windowStart = subMonths(now, 6);
  const qualifying = flights
    .filter(f => f.date >= windowStart && f.instrumentApproaches > 0);

  const total = qualifying.reduce((sum, f) => sum + f.instrumentApproaches, 0);

  if (total >= 6) {
    const approachDates: Date[] = [];
    qualifying.sort((a, b) => a.date.getTime() - b.date.getTime())
      .forEach(f => { for (let i = 0; i < f.instrumentApproaches; i++) approachDates.push(f.date); });
    
    const sixthOldest = approachDates[approachDates.length - 6];
    const expiryDate = endOfCalendarMonthPlus(sixthOldest, 6);
    const daysRemaining = differenceInDays(expiryDate, now);
    return {
      status: daysRemaining <= 60 ? 'warning' : 'current',
      count: total, required: 6, expiryDate, daysRemaining: Math.max(0, daysRemaining)
    };
  }
  return { status: 'expired', count: total, required: 6, expiryDate: null, daysRemaining: 0 };
}

function calculateHoldingCurrency(flights: FlightLog[], now: Date): CurrencyResult {
  const windowStart = subMonths(now, 6);
  const qualifying = flights
    .filter(f => f.date >= windowStart && f.holds > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const total = qualifying.reduce((sum, f) => sum + f.holds, 0);

  if (total >= 1) {
    const oldestHold = qualifying[0].date;
    const expiryDate = endOfCalendarMonthPlus(oldestHold, 6);
    const daysRemaining = differenceInDays(expiryDate, now);
    return {
      status: daysRemaining <= 60 ? 'warning' : 'current',
      count: total, required: 1, expiryDate, daysRemaining: Math.max(0, daysRemaining)
    };
  }
  return { status: 'expired', count: total, required: 1, expiryDate: null, daysRemaining: 0 };
}

function getOverallStatus(statuses: CurrencyStatus[]): CurrencyStatus {
  if (statuses.includes('expired')) return 'expired';
  if (statuses.includes('warning')) return 'warning';
  return 'current';
}

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

function generateMockData(): { pilots: CrewMember[]; fas: CrewMember[]; logs: FlightLog[] } {
  const now = new Date();

  const mockLogs: FlightLog[] = [
    // ── John Smith (P001) — G650 & G500 flights ──
    { id: 'FL001', date: subDays(now, 5), flightNumber: 'OPS-101', tailNumber: 'N650GA', aircraftType: 'G650', origin: 'KTEB', destination: 'KMIA', flightTime: 2.8, landings: 1, nightLandings: 0, instrumentApproaches: 2, holds: 1, crewId: 'P001', crewName: 'John Smith', crewRole: 'PIC' },
    { id: 'FL002', date: subDays(now, 12), flightNumber: 'OPS-102', tailNumber: 'N650GA', aircraftType: 'G650', origin: 'KMIA', destination: 'KPBI', flightTime: 0.8, landings: 1, nightLandings: 1, instrumentApproaches: 1, holds: 0, crewId: 'P001', crewName: 'John Smith', crewRole: 'PIC' },
    { id: 'FL003', date: subDays(now, 25), flightNumber: 'OPS-103', tailNumber: 'N650GB', aircraftType: 'G650', origin: 'KTEB', destination: 'KBOS', flightTime: 1.2, landings: 1, nightLandings: 0, instrumentApproaches: 2, holds: 1, crewId: 'P001', crewName: 'John Smith', crewRole: 'PIC' },
    { id: 'FL004', date: subDays(now, 45), flightNumber: 'OPS-104', tailNumber: 'N650GA', aircraftType: 'G650', origin: 'KBOS', destination: 'KSFO', flightTime: 5.5, landings: 1, nightLandings: 1, instrumentApproaches: 1, holds: 0, crewId: 'P001', crewName: 'John Smith', crewRole: 'PIC' },
    { id: 'FL005', date: subDays(now, 78), flightNumber: 'OPS-105', tailNumber: 'N650GC', aircraftType: 'G650', origin: 'KSFO', destination: 'KLAX', flightTime: 1.3, landings: 1, nightLandings: 0, instrumentApproaches: 2, holds: 1, crewId: 'P001', crewName: 'John Smith', crewRole: 'PIC' },
    { id: 'FL006', date: subDays(now, 65), flightNumber: 'OPS-106', tailNumber: 'N500GA', aircraftType: 'G500', origin: 'KTEB', destination: 'KORD', flightTime: 2.1, landings: 1, nightLandings: 1, instrumentApproaches: 1, holds: 0, crewId: 'P001', crewName: 'John Smith', crewRole: 'PIC' },
    { id: 'FL007', date: subDays(now, 70), flightNumber: 'OPS-107', tailNumber: 'N500GA', aircraftType: 'G500', origin: 'KORD', destination: 'KDFW', flightTime: 2.4, landings: 1, nightLandings: 0, instrumentApproaches: 2, holds: 1, crewId: 'P001', crewName: 'John Smith', crewRole: 'PIC' },
    { id: 'FL008', date: subDays(now, 82), flightNumber: 'OPS-108', tailNumber: 'N500GA', aircraftType: 'G500', origin: 'KDFW', destination: 'KTEB', flightTime: 3.1, landings: 1, nightLandings: 1, instrumentApproaches: 1, holds: 0, crewId: 'P001', crewName: 'John Smith', crewRole: 'PIC' },

    // ── Sarah Johnson (P002) — G650 flights ──
    { id: 'FL009', date: subDays(now, 2), flightNumber: 'OPS-201', tailNumber: 'N650GB', aircraftType: 'G650', origin: 'KPBI', destination: 'KTEB', flightTime: 2.5, landings: 1, nightLandings: 1, instrumentApproaches: 2, holds: 1, crewId: 'P002', crewName: 'Sarah Johnson', crewRole: 'PIC' },
    { id: 'FL010', date: subDays(now, 8), flightNumber: 'OPS-202', tailNumber: 'N650GB', aircraftType: 'G650', origin: 'KTEB', destination: 'KMCO', flightTime: 2.8, landings: 1, nightLandings: 1, instrumentApproaches: 2, holds: 1, crewId: 'P002', crewName: 'Sarah Johnson', crewRole: 'PIC' },
    { id: 'FL011', date: subDays(now, 18), flightNumber: 'OPS-203', tailNumber: 'N650GC', aircraftType: 'G650', origin: 'KMCO', destination: 'KATL', flightTime: 1.2, landings: 1, nightLandings: 0, instrumentApproaches: 1, holds: 0, crewId: 'P002', crewName: 'Sarah Johnson', crewRole: 'PIC' },
    { id: 'FL012', date: subDays(now, 35), flightNumber: 'OPS-204', tailNumber: 'N650GA', aircraftType: 'G650', origin: 'KATL', destination: 'KDFW', flightTime: 2.0, landings: 1, nightLandings: 1, instrumentApproaches: 1, holds: 0, crewId: 'P002', crewName: 'Sarah Johnson', crewRole: 'PIC' },

    // ── Mike Davis (P003) — G650 flights (EXPIRED) ──
    { id: 'FL016', date: subDays(now, 110), flightNumber: 'OPS-301', tailNumber: 'N650GD', aircraftType: 'G650', origin: 'KJFK', destination: 'KLAX', flightTime: 5.5, landings: 1, nightLandings: 0, instrumentApproaches: 1, holds: 0, crewId: 'P003', crewName: 'Mike Davis', crewRole: 'PIC' },
    { id: 'FL017', date: subDays(now, 120), flightNumber: 'OPS-302', tailNumber: 'N650GD', aircraftType: 'G650', origin: 'KLAX', destination: 'KLAS', flightTime: 1.0, landings: 1, nightLandings: 1, instrumentApproaches: 0, holds: 0, crewId: 'P003', crewName: 'Mike Davis', crewRole: 'PIC' },
    { id: 'FL018', date: subDays(now, 140), flightNumber: 'OPS-303', tailNumber: 'N650GD', aircraftType: 'G650', origin: 'KLAS', destination: 'KJFK', flightTime: 4.8, landings: 1, nightLandings: 0, instrumentApproaches: 2, holds: 1, crewId: 'P003', crewName: 'Mike Davis', crewRole: 'PIC' },

    // ── Tom Williams (P004) — Only G500 ──
    { id: 'FL019', date: subDays(now, 10), flightNumber: 'OPS-401', tailNumber: 'N500GA', aircraftType: 'G500', origin: 'KTEB', destination: 'KIAD', flightTime: 0.9, landings: 1, nightLandings: 0, instrumentApproaches: 1, holds: 1, crewId: 'P004', crewName: 'Tom Williams', crewRole: 'PIC' },
    { id: 'FL020', date: subDays(now, 20), flightNumber: 'OPS-402', tailNumber: 'N500GA', aircraftType: 'G500', origin: 'KIAD', destination: 'KBWI', flightTime: 0.4, landings: 1, nightLandings: 0, instrumentApproaches: 2, holds: 0, crewId: 'P004', crewName: 'Tom Williams', crewRole: 'PIC' },
    { id: 'FL021', date: subDays(now, 40), flightNumber: 'OPS-403', tailNumber: 'N500GA', aircraftType: 'G500', origin: 'KBWI', destination: 'KTEB', flightTime: 0.8, landings: 1, nightLandings: 1, instrumentApproaches: 2, holds: 1, crewId: 'P004', crewName: 'Tom Williams', crewRole: 'PIC' },
    { id: 'FL022', date: subDays(now, 55), flightNumber: 'OPS-404', tailNumber: 'N500GA', aircraftType: 'G500', origin: 'KTEB', destination: 'KPHL', flightTime: 0.5, landings: 1, nightLandings: 1, instrumentApproaches: 1, holds: 0, crewId: 'P004', crewName: 'Tom Williams', crewRole: 'PIC' },

    // ── FA: Emily Torres (FA001) ──
    { id: 'FL023', date: subDays(now, 3), flightNumber: 'OPS-101', tailNumber: 'N650GA', aircraftType: 'G650', origin: 'KTEB', destination: 'KMIA', flightTime: 2.8, landings: 0, nightLandings: 0, instrumentApproaches: 0, holds: 0, crewId: 'FA001', crewName: 'Emily Torres', crewRole: 'FA' },
    { id: 'FL024', date: subDays(now, 45), flightNumber: 'OPS-106', tailNumber: 'N500GA', aircraftType: 'G500', origin: 'KTEB', destination: 'KORD', flightTime: 2.1, landings: 0, nightLandings: 0, instrumentApproaches: 0, holds: 0, crewId: 'FA001', crewName: 'Emily Torres', crewRole: 'FA' },

    // ── FA: Rachel Kim (FA002) ──
    { id: 'FL025', date: subDays(now, 8), flightNumber: 'OPS-201', tailNumber: 'N650GB', aircraftType: 'G650', origin: 'KPBI', destination: 'KTEB', flightTime: 2.5, landings: 0, nightLandings: 0, instrumentApproaches: 0, holds: 0, crewId: 'FA002', crewName: 'Rachel Kim', crewRole: 'FA' },
  ];

  const mockNotes: Record<string, CurrencyNote[]> = {
    'P001': [
      { id: 'N001', authorName: 'Jane Doe (Scheduling)', content: 'Needs sim session before Asia trip in May — coordinating with CAE for G650 type.', isUrgent: true, createdAt: subDays(now, 3), updatedAt: subDays(now, 3) },
      { id: 'N002', authorName: 'Jane Doe (Scheduling)', content: 'G500 currency expiring soon — scheduling a local pattern flight for next week.', isUrgent: false, createdAt: subDays(now, 1), updatedAt: subDays(now, 1) },
    ],
    'P003': [
      { id: 'N003', authorName: 'Jane Doe (Scheduling)', content: 'Mike returning from medical leave — schedule currency rides on G650 before end of month.', isUrgent: true, createdAt: subDays(now, 5), updatedAt: subDays(now, 5) },
    ],
  };

  const picChecks: Record<string, Record<AircraftType, { date: Date }>> = {
    'P001': { G500: { date: subDays(now, 200) }, G650: { date: subDays(now, 60) }, G800: { date: subDays(now, 400) } },
    'P002': { G500: { date: subDays(now, 30) }, G650: { date: subDays(now, 30) }, G800: { date: subDays(now, 400) } },
    'P003': { G500: { date: subDays(now, 400) }, G650: { date: subDays(now, 400) }, G800: { date: subDays(now, 400) } },
    'P004': { G500: { date: subDays(now, 90) }, G650: { date: subDays(now, 400) }, G800: { date: subDays(now, 400) } },
  };

  const pilotIds = ['P001', 'P002', 'P003', 'P004'];
  const pilotNames: Record<string, string> = { P001: 'John Smith', P002: 'Sarah Johnson', P003: 'Mike Davis', P004: 'Tom Williams' };
  const faIds = ['FA001', 'FA002'];
  const faNames: Record<string, string> = { FA001: 'Emily Torres', FA002: 'Rachel Kim' };

  const buildPilot = (crewId: string): CrewMember => {
    const typeCurrencies = {} as Record<AircraftType, PilotTypeCurrency>;
    const allFlightsForPilot = mockLogs.filter(f => f.crewId === crewId);

    AIRCRAFT_TYPES.forEach(type => {
      const typeFlights = allFlightsForPilot.filter(f => f.aircraftType === type);
      const general = calculateGeneralCurrency(typeFlights, now);
      const nightStandard = calculateNightCurrencyStandard(typeFlights, now);
      const nightAlternate = calculateNightCurrencyAlternate(allFlightsForPilot, now);
      
      const statusPriority: Record<string, number> = { current: 3, warning: 2, expired: 1 };
      const nightEffective = nightAlternate && (statusPriority[nightAlternate.status] || 0) > (statusPriority[nightStandard.status] || 0) 
        ? nightAlternate 
        : nightStandard;

      const instrument = calculateInstrumentCurrency(typeFlights, now);
      const holding = calculateHoldingCurrency(typeFlights, now);

      const checkInfo = picChecks[crewId]?.[type];
      let picCheck: CurrencyResult;
      if (checkInfo) {
        const expiryDate = endOfCalendarMonthPlus(checkInfo.date, 12);
        const daysRemaining = differenceInDays(expiryDate, now);
        picCheck = {
          status: daysRemaining < 0 ? 'expired' : daysRemaining <= 60 ? 'warning' : 'current',
          count: 1, required: 1, expiryDate,
          daysRemaining: Math.max(0, daysRemaining),
          notes: daysRemaining < 0 ? 'Expired' : `Due ${format(expiryDate, 'MMM yyyy')}`
        };
      } else {
        picCheck = { status: 'expired', count: 0, required: 1, expiryDate: null, daysRemaining: 0, notes: 'No record' };
      }

      const lastFlight = typeFlights.length > 0 ? typeFlights.reduce((latest, f) => f.date > latest.date ? f : latest) : null;
      const daysSinceLastFlown = lastFlight ? differenceInDays(now, lastFlight.date) : null;
      const totalHours = typeFlights.reduce((sum, f) => sum + f.flightTime, 0);

      const overallStatus = getOverallStatus([
        general.status, nightEffective.status, instrument.status, holding.status, picCheck.status
      ]);

      typeCurrencies[type] = {
        aircraftType: type,
        generalCurrency: general,
        nightCurrency: nightStandard,
        nightCurrencyAlternate: nightAlternate,
        nightCurrencyEffective: nightEffective,
        instrumentCurrency: instrument,
        holdingCurrency: holding,
        picCheck,
        daysSinceLastFlown,
        lastFlownDate: lastFlight?.date || null,
        totalHoursInType: Math.round(totalHours * 10) / 10,
        overallStatus,
      };
    });

    return {
      crewId,
      crewName: pilotNames[crewId],
      crewRole: 'PILOT',
      typeCurrencies,
      notes: mockNotes[crewId] || [],
    };
  };

  const buildFA = (crewId: string): CrewMember => {
    const typeCurrencies = {} as Record<AircraftType, PilotTypeCurrency>;
    const allFlightsForFA = mockLogs.filter(f => f.crewId === crewId);

    AIRCRAFT_TYPES.forEach(type => {
      const typeFlights = allFlightsForFA.filter(f => f.aircraftType === type);
      const lastFlight = typeFlights.length > 0 ? typeFlights.reduce((latest, f) => f.date > latest.date ? f : latest) : null;
      const daysSinceLastFlown = lastFlight ? differenceInDays(now, lastFlight.date) : null;
      const totalHours = typeFlights.reduce((sum, f) => sum + f.flightTime, 0);

      const daysStatus: CurrencyStatus = daysSinceLastFlown === null ? 'expired' : daysSinceLastFlown > 90 ? 'expired' : daysSinceLastFlown > 30 ? 'warning' : 'current';

      const emptyResult: CurrencyResult = { status: 'current', count: 0, required: 0, expiryDate: null, daysRemaining: 0 };
      typeCurrencies[type] = {
        aircraftType: type,
        generalCurrency: emptyResult,
        nightCurrency: emptyResult,
        nightCurrencyAlternate: null,
        nightCurrencyEffective: emptyResult,
        instrumentCurrency: emptyResult,
        holdingCurrency: emptyResult,
        picCheck: emptyResult,
        daysSinceLastFlown,
        lastFlownDate: lastFlight?.date || null,
        totalHoursInType: Math.round(totalHours * 10) / 10,
        overallStatus: daysStatus,
      };
    });

    return {
      crewId,
      crewName: faNames[crewId],
      crewRole: 'FA',
      typeCurrencies,
      notes: [],
    };
  };

  const pilots = pilotIds.map(buildPilot);
  const fas = faIds.map(buildFA);

  return { pilots, fas, logs: mockLogs };
}

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENTS
// ═══════════════════════════════════════════════════════════════

const StatusDot = ({ status }: { status: CurrencyStatus }) => {
  const colors = {
    current: 'bg-emerald-500 shadow-emerald-500/50',
    warning: 'bg-amber-500',
    expired: 'bg-red-500 animate-pulse',
  };
  return <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${colors[status]}`} />;
};

const StatusBadge = ({ status, label }: { status: CurrencyStatus; label?: string }) => {
  const styles = {
    current: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
    expired: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400',
  };
  const icons = {
    current: <CheckCircle className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    expired: <XCircle className="w-3 h-3" />,
  };
  const labels = { current: 'Current', warning: 'Due Soon', expired: 'Expired' };
  return (
    <Badge className={`${styles[status]} border text-xs gap-1 font-medium`}>
      {icons[status]}
      {label || labels[status]}
    </Badge>
  );
};

const CurrencyCell = ({ result, showCount = true }: { result: CurrencyResult; showCount?: boolean }) => {
  const colors = {
    current: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    expired: 'text-red-600 dark:text-red-400',
  };
  return (
    <div className="flex items-center gap-2">
      <StatusDot status={result.status} />
      <div>
        {showCount && (
          <span className={`text-sm font-semibold ${colors[result.status]}`}>
            {result.count}/{result.required}
          </span>
        )}
        {result.daysRemaining > 0 && (
          <span className="text-xs text-muted-foreground ml-1">({result.daysRemaining}d)</span>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PilotCurrency({ userRole, pilotId }: PilotCurrencyProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedPilotNotes, setExpandedPilotNotes] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pilots' | 'flight-attendants'>('pilots');
  const [showDevSpec, setShowDevSpec] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReturnType<typeof generateMockData> | null>(null);

  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteUrgent, setNewNoteUrgent] = useState(false);

  const isScheduling = userRole === 'scheduling' || userRole === 'admin';
  const isPilotView = userRole === 'pilot' && pilotId;

  // Determine which aircraft a pilot/FA is active on
  const getActiveTypes = (member: CrewMember): AircraftType[] => {
    return AIRCRAFT_TYPES.filter(type => {
      const tc = member.typeCurrencies[type];
      if (member.crewRole === 'FA') {
        return tc.daysSinceLastFlown !== null || tc.totalHoursInType > 0;
      }
      return tc.totalHoursInType > 0 || tc.daysSinceLastFlown !== null || tc.picCheck.status !== 'expired' || tc.lastFlownDate !== null;
    });
  };

  // Determine the overall status for a dashboard user (worst status among active types)
  const getWorstStatus = (member: CrewMember): CurrencyStatus => {
    const activeTypes = getActiveTypes(member);
    if (activeTypes.length === 0) return 'expired';
    const statuses = activeTypes.map(t => member.typeCurrencies[t].overallStatus);
    if (statuses.includes('expired')) return 'expired';
    if (statuses.includes('warning')) return 'warning';
    return 'current';
  };

  useEffect(() => {
    setTimeout(() => {
      setData(generateMockData());
      setLastSync(new Date());
      setLoading(false);
    }, 800);
  }, []);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setData(generateMockData());
      setLastSync(new Date());
      setSyncing(false);
      toast.success('Flight logs synchronized from MyAirOps');
    }, 1500);
  };

  const filteredPilots = useMemo(() => {
    if (!data) return [];
    const crew = activeTab === 'pilots' ? data.pilots : data.fas;
    return crew.filter(member => {
      const matchesSearch = member.crewName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || getWorstStatus(member) === statusFilter;
      const matchesPilotView = !isPilotView || member.crewId === pilotId;
      return matchesSearch && matchesStatus && matchesPilotView;
    });
  }, [data, searchTerm, statusFilter, activeTab, isPilotView, pilotId]);

  const summaryStats = useMemo(() => {
    if (!data) return { total: 0, current: 0, warning: 0, expired: 0 };
    const crew = activeTab === 'pilots' ? data.pilots : data.fas;
    
    // We only aggregate stats for the active tab (using worst status approach)
    let current = 0;
    let warning = 0;
    let expired = 0;

    crew.forEach(member => {
      const status = getWorstStatus(member);
      if (status === 'current') current++;
      if (status === 'warning') warning++;
      if (status === 'expired') expired++;
    });

    return { total: crew.length, current, warning, expired };
  }, [data, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto text-blue-500" />
          <p className="text-muted-foreground">Syncing flight data from MyAirOps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">

      {/* ══════ HEADER — NEW BUILD BANNER ══════ */}
      <div className="relative">
        <div className="absolute -top-2 -right-2 z-10">
          <div className="bg-gfo-midnight text-white px-4 py-1.5 rounded-full text-xs font-medium tracking-wider shadow-sm flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            V2 — NEW BUILD
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left: Title */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gfo-midnight flex items-center justify-center shadow-sm">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-aviation-gradient">Currency Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
              Part 91 • Unified View • Auto-synced from MyAirOps
            </p>
          </div>

          {/* Developer scaffolding on a pilot-facing screen — the three-stop
              violet/indigo gradient, font-extrabold and white sweep-on-hover
              were a "Massive Developer CTA". De-flashed onto the brand here;
              whether it belongs in front of pilots at all is a separate call
              (flagged 2026-07-14, D33). */}
          <div className="flex justify-center mt-2 lg:mt-0 max-w-sm mx-auto">
            <Button
              size="lg"
              variant="secondary"
              className="gap-3 px-8 py-6 text-base w-full"
              onClick={() => setShowDevSpec(!showDevSpec)}
            >
              <FileText className="w-5 h-5" />
              <span>Developer Readme &amp; Spec</span>
            </Button>
          </div>

          {/* Right: Sync Controls */}
          <div className="flex items-center lg:justify-end gap-3 flex-wrap mt-2 lg:mt-0 lg:pr-6">
            {lastSync && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full">
                <Database className="w-3.5 h-3.5" />
                Synced {format(lastSync, 'HH:mm')}
              </div>
            )}
            <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm" className="gap-2 rounded-full">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
        </div>
      </div>

      {/* ══════ DEV SPEC DRAWER ══════ */}
      {showDevSpec && (
        <Card className="border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-lg mb-6 animate-in slide-in-from-top-2 duration-300">
          <CardHeader className="pb-3 border-b border-indigo-500/10 mb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <FileText className="w-5 h-5" />
                Backend Developer Handoff Readme
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowDevSpec(false)}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex flex-col md:flex-row gap-4">
               <div className="flex-1 space-y-4">
                 <Alert className="border-indigo-200 dark:border-indigo-800 bg-white/50 dark:bg-slate-900/50">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <AlertDescription className="text-sm leading-relaxed">
                      <p className="font-semibold mb-1 text-foreground">1. Frontend Math Reference</p>
                      This layout contains live math parsing for 90-day, 6-month, and 12-month calendar windows. 
                      You can use functions inside <code className="bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded text-xs text-indigo-800 dark:text-indigo-300">PilotCurrency.tsx</code> as direct pseudocode to replicate the exact interval logic on the server.
                    </AlertDescription>
                 </Alert>
                 
                 <Alert className="border-indigo-200 dark:border-indigo-800 bg-white/50 dark:bg-slate-900/50">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <AlertDescription className="text-sm leading-relaxed">
                      <p className="font-semibold mb-1 text-foreground">2. Formal API Specification</p>
                      The complete backend schema, OData table integration strategy from MyAirOps, and exact JSON request/response mappings are fully documented.
                      
                      <div className="mt-4">
                        <a 
                          href="https://github.com/bryandunlop/Antigravity-Aviation-Management-System/blob/main/backend_designs/PilotCurrencyApiSpec.md" 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-xs font-bold transition-all shadow-sm hover:shadow-md"
                        >
                          <FileText className="w-4 h-4" />
                          View PilotCurrencyApiSpec.md on GitHub
                        </a>
                      </div>
                    </AlertDescription>
                 </Alert>
               </div>
               
               <div className="flex-1">
                 <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 h-full flex flex-col justify-center shadow-inner">
                   <h4 className="text-slate-300 text-xs font-bold mb-4 flex items-center justify-between border-b border-slate-800 pb-2">
                     <span className="uppercase tracking-wider">Crucial Math Intervals (Part 91)</span>
                     <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">Reference</span>
                   </h4>
                   <ul className="space-y-3 text-slate-400 text-xs font-mono">
                     <li className="flex justify-between items-center"><span className="text-emerald-400">General / Night</span> <span className="bg-slate-900 px-2 py-1 rounded">Rolling 90 Days</span></li>
                     <li className="flex justify-between items-center"><span className="text-amber-400">Inst. Approaches</span> <span className="bg-slate-900 px-2 py-1 rounded">6 Calendar Months Lookback</span></li>
                     <li className="flex justify-between items-center"><span className="text-amber-400">Holds</span> <span className="bg-slate-900 px-2 py-1 rounded">6 Calendar Months Lookback</span></li>
                     <li className="flex justify-between items-center"><span className="text-blue-400">Alternate Night</span> <span className="bg-slate-900 px-2 py-1 rounded">6 / 12 Month Target</span></li>
                     <li className="flex justify-between items-center"><span className="text-violet-400">61.58 PIC Check</span> <span className="bg-slate-900 px-2 py-1 rounded">End of 12th Calendar Month</span></li>
                   </ul>
                 </div>
               </div>
             </div>
          </CardContent>
        </Card>
      )}

      {/* ══════ CREW TYPE TABS & SUMMARY STATS ══════ */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'pilots' | 'flight-attendants')} className="w-full max-w-md">
          <TabsList className="w-full">
            <TabsTrigger value="pilots" className="gap-2 flex-1">
              <Plane className="w-4 h-4" /> Pilots
            </TabsTrigger>
            <TabsTrigger value="flight-attendants" className="gap-2 flex-1">
              <Users className="w-4 h-4" /> Flight Attendants
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Unified Summary Pills */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-500/20 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            {summaryStats.current} Current
          </div>
          <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-500/20 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            {summaryStats.warning} Due Soon
          </div>
          <div className="flex items-center gap-1.5 bg-red-500/10 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-red-500/20 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {summaryStats.expired} Expired
          </div>
        </div>
      </div>

      {/* ══════ CRITICAL ALERT ══════ */}
      {summaryStats.expired > 0 && (
        <Alert className="border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            <strong>Critical:</strong> {summaryStats.expired} crew member(s) have expired or non-current training items. Review immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* ══════ FILTERS ══════ */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 rounded-full" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-full">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Overall</SelectItem>
            <SelectItem value="current">🟢 Current</SelectItem>
            <SelectItem value="warning">🟡 Due Soon</SelectItem>
            <SelectItem value="expired">🔴 Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ══════ MAIN TABLE — PILOTS ══════ */}
      {activeTab === 'pilots' && (
        <Card className="overflow-hidden border-border/50 shadow-md">
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plane className="w-4 h-4" />
              Pilot Currency Directory (All Assigned Types)
              <Badge variant="secondary" className="ml-2 text-xs">{filteredPilots.length} pilots</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-14 pl-6">Type</TableHead>
                    <TableHead className="text-center w-32">Status</TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>General</span>
                        <span className="text-[10px] text-muted-foreground font-normal">90d</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Night</span>
                        <span className="text-[10px] text-muted-foreground font-normal">90d / Alt</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Inst. Appr.</span>
                        <span className="text-[10px] text-muted-foreground font-normal">6mo</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Holds</span>
                        <span className="text-[10px] text-muted-foreground font-normal">6mo</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>61.58</span>
                        <span className="text-[10px] text-muted-foreground font-normal">12mo</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Last Flown</TableHead>
                    <TableHead className="text-center">Hrs in Type</TableHead>
                    <TableHead className="text-center w-20">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPilots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                        No pilots found matching filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPilots.map((pilot) => {
                      const activeTypes = getActiveTypes(pilot);
                      const worstStatus = getWorstStatus(pilot);
                      const isExpandedNotes = expandedPilotNotes === pilot.crewId;
                      
                      return (
                        <React.Fragment key={pilot.crewId}>
                          {/* ──── PILOT HEADER ROW ──── */}
                          <TableRow className={`font-semibold bg-muted/40 border-t-2 border-t-muted transition-colors hover:bg-muted/50 ${worstStatus === 'expired' ? 'bg-red-50/40 dark:bg-red-950/20' : ''}`}>
                            <TableCell colSpan={2} className="pl-6">
                              <div className="flex items-center justify-between">
                                <span className="text-base tracking-tight">{pilot.crewName}</span>
                                <StatusBadge status={worstStatus} label="Overall" />
                              </div>
                            </TableCell>
                            <TableCell colSpan={7}></TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full justify-center px-0 hover:bg-card/50"
                                onClick={() => setExpandedPilotNotes(isExpandedNotes ? null : pilot.crewId)}
                              >
                                {pilot.notes.length > 0 ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <MessageSquare className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold">{pilot.notes.length}</span>
                                    {pilot.notes.some(n => n.isUrgent) && <Flag className="w-3 h-3 text-red-500" />}
                                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpandedNotes ? 'rotate-180' : ''}`} />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-muted-foreground opacity-50 hover:opacity-100 transition-opacity">
                                    <MessageSquare className="w-4 h-4" />
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpandedNotes ? 'rotate-180' : ''}`} />
                                  </div>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* ──── AIRCRAFT ROWS ──── */}
                          {activeTypes.length === 0 ? (
                            <TableRow className="bg-card">
                              <TableCell colSpan={10} className="pl-6 text-sm text-muted-foreground italic text-center py-4">
                                No active aircraft assignments found for this pilot.
                              </TableCell>
                            </TableRow>
                          ) : (
                            activeTypes.map(type => {
                              const tc = pilot.typeCurrencies[type];
                              return (
                                <TableRow key={`${pilot.crewId}-${type}`} className="bg-card hover:bg-muted/30 transition-colors">
                                  <TableCell className="pl-6">
                                    <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                                      <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                                      {type}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <StatusBadge status={tc.overallStatus} />
                                  </TableCell>
                                  <TableCell className="text-center"><CurrencyCell result={tc.generalCurrency} /></TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <CurrencyCell result={tc.nightCurrencyEffective} />
                                      {tc.nightCurrencyEffective.complianceMethod && tc.nightCurrencyEffective.complianceMethod !== 'standard' && (
                                        <span className="text-[9px] bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400 px-1 rounded font-bold uppercase tracking-wider">ALT</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center"><CurrencyCell result={tc.instrumentCurrency} /></TableCell>
                                  <TableCell className="text-center"><CurrencyCell result={tc.holdingCurrency} /></TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <StatusDot status={tc.picCheck.status} />
                                      <span className={`text-xs font-medium ${tc.picCheck.status === 'current' ? 'text-emerald-600 dark:text-emerald-400' : tc.picCheck.status === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {tc.picCheck.expiryDate ? format(tc.picCheck.expiryDate, 'MMM yy') : '—'}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {tc.daysSinceLastFlown !== null ? (
                                      <span className={`text-sm font-medium ${tc.daysSinceLastFlown > 90 ? 'text-red-600 dark:text-red-400' : tc.daysSinceLastFlown > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                                        {tc.daysSinceLastFlown}d
                                      </span>
                                    ) : <span className="text-muted-foreground text-sm">—</span>}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="text-sm font-semibold">{tc.totalHoursInType}h</span>
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              )
                            })
                          )}

                          {/* ──── EXPANDED NOTES SECTION ──── */}
                          {isExpandedNotes && (
                            <TableRow className="bg-card">
                              <TableCell colSpan={10} className="p-0 border-b-2">
                                <div className="p-4 bg-muted/10 border-t border-border shadow-inner" onClick={(e) => e.stopPropagation()}>
                                  <div className="max-w-3xl ml-6">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4" />
                                      Scheduling Notes for {pilot.crewName}
                                    </h3>

                                    {/* Existing notes */}
                                    <div className="space-y-2 mb-3">
                                      {pilot.notes.length === 0 && (
                                        <p className="text-sm text-muted-foreground italic">No historical notes found.</p>
                                      )}
                                      {pilot.notes.map(note => (
                                        <div key={note.id} className={`p-3 rounded-lg border text-sm ${note.isUrgent ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 shadow-sm' : 'border-border bg-card'}`}>
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                              {note.isUrgent && (
                                                <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] mb-1.5 gap-1 font-bold uppercase tracking-wider">
                                                  <Flag className="w-3 h-3" /> Urgent
                                                </Badge>
                                              )}
                                              <p className="leading-relaxed">{note.content}</p>
                                              <p className="text-xs text-muted-foreground mt-2 font-medium">
                                                {note.authorName} • {format(note.createdAt, 'MMM d, yyyy HH:mm')}
                                              </p>
                                            </div>
                                            {isScheduling && (
                                              <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-500 transition-colors" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Add note */}
                                    {isScheduling && (
                                      <div className="flex gap-2">
                                        <Textarea 
                                          placeholder={`Add a new note for ${pilot.crewName.split(' ')[0]}...`}
                                          value={newNoteContent}
                                          onChange={(e) => setNewNoteContent(e.target.value)}
                                          className="text-sm min-h-[60px] bg-card"
                                        />
                                        <div className="flex flex-col gap-1.5">
                                          <Button 
                                            size="sm" 
                                            disabled={!newNoteContent.trim()}
                                            onClick={() => {
                                              toast.success('Note added successfully');
                                              setNewNoteContent('');
                                              setNewNoteUrgent(false);
                                            }}
                                            className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                          >
                                            <Send className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant={newNoteUrgent ? 'destructive' : 'outline'}
                                            size="sm"
                                            onClick={() => setNewNoteUrgent(!newNoteUrgent)}
                                            className="gap-1 bg-card"
                                            title="Mark as urgent"
                                          >
                                            <Flag className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════ MAIN TABLE — FLIGHT ATTENDANTS ══════ */}
      {activeTab === 'flight-attendants' && (
        <Card className="overflow-hidden border-border/50 shadow-md">
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Flight Attendant Currency Directory
              <Badge variant="secondary" className="ml-2 text-xs">{filteredPilots.length} FAs</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-14 pl-6">Type</TableHead>
                    <TableHead className="text-center w-32">Status</TableHead>
                    <TableHead className="text-center">Days Since Last Flown</TableHead>
                    <TableHead className="text-center">Last Flown Date</TableHead>
                    <TableHead className="text-center">Total Hours</TableHead>
                    <TableHead className="text-center w-20">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPilots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        No flight attendants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPilots.map((fa) => {
                      const activeTypes = getActiveTypes(fa);
                      const worstStatus = getWorstStatus(fa);
                      const isExpandedNotes = expandedPilotNotes === fa.crewId;

                      return (
                        <React.Fragment key={fa.crewId}>
                          {/* ──── FA HEADER ROW ──── */}
                          <TableRow className={`font-semibold bg-muted/40 border-t-2 border-t-muted transition-colors hover:bg-muted/50 ${worstStatus === 'expired' ? 'bg-red-50/40 dark:bg-red-950/20' : ''}`}>
                            <TableCell colSpan={2} className="pl-6">
                              <div className="flex items-center justify-between">
                                <span className="text-base tracking-tight">{fa.crewName}</span>
                                <StatusBadge status={worstStatus} label="Overall" />
                              </div>
                            </TableCell>
                            <TableCell colSpan={3}></TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full justify-center px-0 hover:bg-card/50"
                                onClick={() => setExpandedPilotNotes(isExpandedNotes ? null : fa.crewId)}
                              >
                                {fa.notes.length > 0 ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <MessageSquare className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold">{fa.notes.length}</span>
                                    {fa.notes.some(n => n.isUrgent) && <Flag className="w-3 h-3 text-red-500" />}
                                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpandedNotes ? 'rotate-180' : ''}`} />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-muted-foreground opacity-50 hover:opacity-100 transition-opacity">
                                    <MessageSquare className="w-4 h-4" />
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpandedNotes ? 'rotate-180' : ''}`} />
                                  </div>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* ──── AIRCRAFT ROWS ──── */}
                          {activeTypes.length === 0 ? (
                            <TableRow className="bg-card">
                              <TableCell colSpan={6} className="pl-6 text-sm text-muted-foreground italic text-center py-4">
                                No active aircraft assignments found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            activeTypes.map(type => {
                              const tc = fa.typeCurrencies[type];
                              return (
                                <TableRow key={`${fa.crewId}-${type}`} className="bg-card hover:bg-muted/30 transition-colors">
                                  <TableCell className="pl-6">
                                    <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                                      <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                                      {type}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {tc.daysSinceLastFlown !== null ? (
                                      <StatusBadge status={tc.overallStatus} />
                                    ) : (
                                      <StatusBadge status="expired" label="No Record" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {tc.daysSinceLastFlown !== null ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <StatusDot status={tc.overallStatus} />
                                        <span className={`font-semibold ${tc.overallStatus === 'current' ? 'text-emerald-600 dark:text-emerald-400' : tc.overallStatus === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                                          {tc.daysSinceLastFlown} days
                                        </span>
                                      </div>
                                    ) : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell className="text-center text-sm font-medium">
                                    {tc.lastFlownDate ? format(tc.lastFlownDate, 'MMM d, yyyy') : '—'}
                                  </TableCell>
                                  <TableCell className="text-center text-sm font-semibold">
                                    {tc.totalHoursInType}h
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              )
                            })
                          )}

                          {/* ──── EXPANDED NOTES SECTION ──── */}
                          {isExpandedNotes && (
                            <TableRow className="bg-card">
                              <TableCell colSpan={6} className="p-0 border-b-2">
                                <div className="p-4 bg-muted/10 border-t border-border shadow-inner" onClick={(e) => e.stopPropagation()}>
                                  <div className="max-w-3xl ml-6">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4" />
                                      Scheduling Notes for {fa.crewName}
                                    </h3>

                                    <div className="space-y-2 mb-3">
                                      {fa.notes.length === 0 && (
                                        <p className="text-sm text-muted-foreground italic">No historical notes found.</p>
                                      )}
                                      {/* Mapping logic similar to pilots */}
                                      {fa.notes.map(note => (
                                        <div key={note.id} className={`p-3 rounded-lg border text-sm ${note.isUrgent ? 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20 shadow-sm' : 'border-border bg-card'}`}>
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                              {note.isUrgent && (
                                                <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[10px] mb-1.5 gap-1 font-bold uppercase tracking-wider">
                                                  <Flag className="w-3 h-3" /> Urgent
                                                </Badge>
                                              )}
                                              <p className="leading-relaxed">{note.content}</p>
                                              <p className="text-xs text-muted-foreground mt-2 font-medium">
                                                {note.authorName} • {format(note.createdAt, 'MMM d, yyyy HH:mm')}
                                              </p>
                                            </div>
                                            {isScheduling && (
                                              <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                  <Edit3 className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-500 transition-colors" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {isScheduling && (
                                      <div className="flex gap-2">
                                        <Textarea 
                                          placeholder={`Add a new note for ${fa.crewName.split(' ')[0]}...`}
                                          value={newNoteContent}
                                          onChange={(e) => setNewNoteContent(e.target.value)}
                                          className="text-sm min-h-[60px] bg-card"
                                        />
                                        <div className="flex flex-col gap-1.5">
                                          <Button 
                                            size="sm" 
                                            disabled={!newNoteContent.trim()}
                                            onClick={() => {
                                              toast.success('Note added successfully');
                                              setNewNoteContent('');
                                              setNewNoteUrgent(false);
                                            }}
                                            className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                          >
                                            <Send className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant={newNoteUrgent ? 'destructive' : 'outline'}
                                            size="sm"
                                            onClick={() => setNewNoteUrgent(!newNoteUrgent)}
                                            className="gap-1 bg-card"
                                            title="Mark as urgent"
                                          >
                                            <Flag className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════ REGULATORY REFERENCE FOOTER ══════ */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Regulatory Reference — 14 CFR Part 91</p>
              <p>
                <strong>§ 61.57(a)</strong> General: 3 T/O & landings in 90 days •{' '}
                <strong>§ 61.57(b)</strong> Night: 3 full-stop landings at night in 90 days •{' '}
                <strong>§ 61.57(c)</strong> Instrument: 6 approaches + holds in 6 calendar months •{' '}
                <strong>§ 61.57(e)</strong> Alternate night: Multi-crew turbine, 1500+ hrs, 6mo/12mo options •{' '}
                <strong>§ 61.58</strong> PIC proficiency check: 12/24 calendar months
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}