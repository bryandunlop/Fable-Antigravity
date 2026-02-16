import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import {
  Calendar,
  Users,
  Plane,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Target,
  CalendarDays,
  Moon,
  Gauge,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Minus,
  Save,
  RotateCcw,
  Sliders,
  ArrowLeft,
  User,
  History,
  Brain,
  GraduationCap,
  Shield,
  Globe,
  BookOpen,
  MessageSquare,
  Package,
  Info,
  Check,
  X
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';

interface CrewMember {
  id: string;
  name: string;
  position: 'Captain' | 'First Officer' | 'Flight Attendant';
  base: string;
  status: 'active' | 'on-leave' | 'training' | 'reserve';
  excludeFromMetrics: boolean; // New field to track if excluded from calculations
  previousMonth: {
    // Flight-related metrics
    flightDays: number;
    tripDays: number;
    trips?: number;
    internationalTrips?: number;
    ronDays: number;
    positionDays: number;
    weekendDays: number;

    // Duty-related metrics
    standbyDays: number;
    miscDuty: number;
    trainingDays: number;
    otherDutyDays: number;
    totalDutyDays: number;

    // Rest-related metrics
    stopScheduled: number;
    stopWorkedDays: number;
    paybackStopDays: number;
    vacationDays: number;
    miscOffDays: number;
    totalRestDays: number;

    // Availability
    unscheduledAvailable: number;

    // Legacy fields for compatibility
    offDays: number;
    dutyHours: number;
    flightHours: number;
    countries: string[];
  };
  currentMonth: {
    // Flight-related metrics
    flightDays: number;
    tripDays: number;
    trips?: number;
    internationalTrips?: number;
    ronDays: number;
    positionDays: number;
    weekendDays: number;

    // Duty-related metrics
    standbyDays: number;
    miscDuty: number;
    trainingDays: number;
    otherDutyDays: number;
    totalDutyDays: number;

    // Rest-related metrics
    stopScheduled: number; // Total STOP days scheduled
    stopWorkedDays: number; // STOP days where crew worked
    paybackStopDays: number; // Accumulated payback STOP days
    vacationDays: number;
    miscOffDays: number;
    totalRestDays: number;

    // Availability
    unscheduledAvailable: number;

    // Legacy fields for compatibility
    offDays: number;
    dutyHours: number;
    flightHours: number;
    countries: string[];
  };
  nextMonth: {
    flightDays: number;
    tripDays: number;
    trips?: number;
    internationalTrips?: number;
    ronDays: number;
    positionDays: number;
    weekendDays: number;
    standbyDays: number;
    miscDuty: number;
    trainingDays: number;
    otherDutyDays: number;
    totalDutyDays: number;
    stopScheduled: number;
    stopWorkedDays: number;
    paybackStopDays: number;
    vacationDays: number;
    miscOffDays: number;
    totalRestDays: number;
    unscheduledAvailable: number;
    offDays: number;
    projectedDutyHours: number;
    projectedFlightHours: number;
    scheduledTrips: number;
  };
  twoMonthsOut: {
    flightDays: number;
    tripDays: number;
    trips?: number;
    internationalTrips?: number;
    ronDays: number;
    positionDays: number;
    weekendDays: number;
    standbyDays: number;
    miscDuty: number;
    trainingDays: number;
    otherDutyDays: number;
    totalDutyDays: number;
    stopScheduled: number;
    stopWorkedDays: number;
    paybackStopDays: number;
    vacationDays: number;
    miscOffDays: number;
    totalRestDays: number;
    unscheduledAvailable: number;
    offDays: number;
    projectedDutyHours: number;
    projectedFlightHours: number;
    scheduledTrips: number;
  };
  stopSchedule: {
    stopType: 'STOP-1' | 'STOP-2' | 'STOP-3' | 'STOP-4 (Flex)';
    currentCycle: number; // Which week in the 8-week cycle (1-8)
    nextStop1Date: string; // Next STOP-1 weekend
    nextFullWeekOff: string; // Next full week off (5 weekdays + STOP-1 weekend)
    paybackStopAccumulated: number;
    paybackStopUsed: number;
    paybackStopPending: number;
    paybackRequests: PaybackRequest[];
  };
  historicalAverage: {
    monthlyTripDays: number;
    monthlyRonDays: number;
    monthlyStandbyDays: number;
    monthlyDutyHours: number;
    monthlyFlightHours: number;
  };
  workloadScore: number; // 0-100, higher means more overloaded
  balanceAlert: 'none' | 'caution' | 'warning' | 'critical';
  preferences: {
    maxTripDays: number;
    maxConsecutiveDays: number;
    preferredRoutes: string[];
    unavailableDates: string[];
  };
  training: {
    medicalExpiry: string;
    recurrentExpiry: string;
    instrumentCheckExpiry: string;
    lineCheckExpiry: string;
    upcomingRequirements: string[];
    trainingHoursCompleted: number;
    trainingHoursRequired: number;
  };
  qualifications: {
    aircraftTypes: string[]; // e.g., ['G650', 'G550']
    specialAirports: string[]; // e.g., ['KTEB', 'KASE']
    languages: string[];
    internationalAuth: boolean;
    instrumentRating: boolean;
    instructorRating: boolean;
  };
  fatigue: {
    riskScore: number; // 0-100, higher means more fatigued
    consecutiveDutyDays: number;
    lastRestPeriod: number; // hours
    circadianRhythmDisruption: number; // 0-100
    timezoneCrossingCount: number;
  };
  routeFamiliarity: {
    [route: string]: {
      flights: number;
      lastFlown: string;
      familiarityScore: number; // 0-100
    };
  };
}

interface PaybackRequest {
  id: string;
  date: string; // Date of the stop day worked
  days: number; // Number of payback days earned (e.g. 2 for 1 worked)
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
}

interface WorkloadMetric {
  id: string;
  name: string;
  description: string;
  weight: number; // Number of days - represents the importance/priority in days
  enabled: boolean;
  category: 'time' | 'duty' | 'travel' | 'custom';
  unit: string;
  maxValue: number; // Used for normalization
  getValue: (crew: CrewMember, timeframe: 'current' | 'next' | 'twoMonths') => number;
}

interface MetricConfiguration {
  id: string;
  name: string;
  description: string;
  metrics: WorkloadMetric[];
  isDefault: boolean;
  createdAt: string;
  modifiedAt: string;
}

interface WorkloadSummary {
  totalCrew: number;
  activecrew: number;
  currentUtilization: number;
  projectedUtilization: number;
  imbalanceAlerts: number;
  avgTripDaysPerCrew: number;
  avgRonDaysPerCrew: number;
  avgStandbyDaysPerCrew: number;
}

export default function CrewSchedulingWorkload() {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [workloadSummary, setWorkloadSummary] = useState<WorkloadSummary | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('currentMonth');
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterBase, setFilterBase] = useState('all');
  const [sortBy, setSortBy] = useState('workloadScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'individual'>('overview');
  const [showBalanceRecommendations, setShowBalanceRecommendations] = useState(false);
  const [showMetricsConfig, setShowMetricsConfig] = useState(false);
  const [currentMetricConfig, setCurrentMetricConfig] = useState<MetricConfiguration | null>(null);
  const [savedConfigurations, setSavedConfigurations] = useState<MetricConfiguration[]>([]);
  const [newCustomMetric, setNewCustomMetric] = useState({
    name: '',
    description: '',
    weight: 5, // Default to 5 days instead of 10%
    unit: '',
    maxValue: 100
  });
  // New state for utilization visualizations
  const [selectedMonth, setSelectedMonth] = useState<'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut'>('currentMonth');
  const [utilizationView, setUtilizationView] = useState<'balance' | 'timeline'>('balance');
  const [sortUtilizationBy, setSortUtilizationBy] = useState<'overutilized' | 'underutilized' | 'name'>('overutilized');
  const [utilizationFilter, setUtilizationFilter] = useState<'all' | 'over' | 'under'>('all');
  const [dateRange, setDateRange] = useState<'3M' | '6M' | '12M'>('6M');
  const [showOutliersOnly, setShowOutliersOnly] = useState(false);
  const [previousWorkloadScores, setPreviousWorkloadScores] = useState<Record<string, number>>({});
  const [showImpactAlert, setShowImpactAlert] = useState(false);
  const [impactSummary, setImpactSummary] = useState('');
  const [showExcludedCrew, setShowExcludedCrew] = useState(false);
  const isInitialLoadRef = useRef(true);
  const configurationChangedRef = useRef(false);

  // Payback Review Logic has been moved to PaybackEarningsReview.tsx integrated in VacationRequest.tsx



  // Default metric configurations - using days instead of percentages
  const defaultMetrics: WorkloadMetric[] = [
    {
      id: 'trip-days',
      name: 'Trip Days',
      description: 'Number of days crew member is assigned to trips',
      weight: 10, // Weight now represents days instead of percentage
      enabled: true,
      category: 'time',
      unit: 'days',
      maxValue: 25,
      getValue: (crew, timeframe) => {
        switch (timeframe) {
          case 'current': return crew.currentMonth.tripDays;
          case 'next': return crew.nextMonth.tripDays;
          case 'twoMonths': return crew.twoMonthsOut.tripDays;
        }
      }
    },
    {
      id: 'duty-hours',
      name: 'Duty Hours',
      description: 'Total duty hours accumulated',
      weight: 7,  // Weight now represents days instead of percentage
      enabled: true,
      category: 'duty',
      unit: 'hours',
      maxValue: 120,
      getValue: (crew, timeframe) => {
        switch (timeframe) {
          case 'current': return crew.currentMonth.dutyHours;
          case 'next': return crew.nextMonth.projectedDutyHours;
          case 'twoMonths': return crew.twoMonthsOut.projectedDutyHours;
        }
      }
    },
    {
      id: 'ron-days',
      name: 'RON Days',
      description: 'Remain Over Night days away from base',
      weight: 5, // Weight now represents days instead of percentage
      enabled: true,
      category: 'travel',
      unit: 'days',
      maxValue: 15,
      getValue: (crew, timeframe) => {
        switch (timeframe) {
          case 'current': return crew.currentMonth.ronDays;
          case 'next': return crew.nextMonth.ronDays;
          case 'twoMonths': return crew.twoMonthsOut.ronDays;
        }
      }
    },
    {
      id: 'standby-days',
      name: 'Standby Days',
      description: 'Days on standby duty',
      weight: 3, // Weight now represents days instead of percentage
      enabled: true,
      category: 'duty',
      unit: 'days',
      maxValue: 10,
      getValue: (crew, timeframe) => {
        switch (timeframe) {
          case 'current': return crew.currentMonth.standbyDays;
          case 'next': return crew.nextMonth.standbyDays;
          case 'twoMonths': return crew.twoMonthsOut.standbyDays;
        }
      }
    }
  ];

  const createDefaultConfiguration = (): MetricConfiguration => ({
    id: 'default',
    name: 'Default Configuration',
    description: 'Standard crew workload metrics',
    metrics: defaultMetrics,
    isDefault: true,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString()
  });

  // Initialize configurations
  useEffect(() => {
    const defaultConfig = createDefaultConfiguration();
    setCurrentMetricConfig(defaultConfig);
    setSavedConfigurations([defaultConfig]);
  }, []);

  // Calculate workload score based on current metric configuration
  const calculateWorkloadScore = (crew: CrewMember, timeframe: 'current' | 'next' | 'twoMonths' = 'current'): number => {
    if (!currentMetricConfig) return 0;

    const enabledMetrics = currentMetricConfig.metrics.filter(m => m.enabled);
    const totalWeight = enabledMetrics.reduce((sum, metric) => sum + metric.weight, 0);

    if (totalWeight === 0) return 0;

    let weightedScore = 0;
    enabledMetrics.forEach(metric => {
      const value = metric.getValue(crew, timeframe);
      const normalizedValue = Math.min(value / metric.maxValue, 1); // Normalize to 0-1
      const weightedContribution = (normalizedValue * metric.weight) / totalWeight;
      weightedScore += weightedContribution;
    });

    return Math.min(weightedScore * 100, 100); // Convert to 0-100 scale
  };

  // Track when configuration changes to trigger recalculation
  useEffect(() => {
    if (!isInitialLoadRef.current && currentMetricConfig && crewMembers.length > 0) {
      configurationChangedRef.current = true;
    }
  }, [currentMetricConfig]);

  // Recalculate workload scores when configuration changes
  useEffect(() => {
    if (configurationChangedRef.current && currentMetricConfig && crewMembers.length > 0) {
      // Use a timeout to debounce the recalculation
      const timeoutId = setTimeout(() => {
        // Store previous scores for impact analysis
        const previousScores: Record<string, number> = {};
        crewMembers.forEach(crew => {
          previousScores[crew.id] = crew.workloadScore;
        });

        const updatedCrew = crewMembers.map(crew => ({
          ...crew,
          workloadScore: calculateWorkloadScore(crew, 'current')
        }));

        setCrewMembers(updatedCrew);

        // Calculate impact if we have previous scores
        if (Object.keys(previousWorkloadScores).length > 0) {
          const impactAnalysis = analyzeConfigurationImpact(previousScores, updatedCrew);
          if (impactAnalysis.significantChanges > 0) {
            setImpactSummary(impactAnalysis.summary);
            setShowImpactAlert(true);
            setTimeout(() => setShowImpactAlert(false), 5000);
          }
        }

        setPreviousWorkloadScores(previousScores);
        configurationChangedRef.current = false;
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [currentMetricConfig]);

  const analyzeConfigurationImpact = (previousScores: Record<string, number>, updatedCrew: CrewMember[]) => {
    let significantChanges = 0;
    let totalChange = 0;
    let highestIncrease = 0;
    let highestDecrease = 0;

    updatedCrew.forEach(crew => {
      const previousScore = previousScores[crew.id] || 0;
      const change = crew.workloadScore - previousScore;

      if (Math.abs(change) > 10) { // Significant change threshold
        significantChanges++;
      }

      totalChange += Math.abs(change);
      if (change > highestIncrease) highestIncrease = change;
      if (change < highestDecrease) highestDecrease = change;
    });

    const avgChange = totalChange / updatedCrew.length;

    let summary = `Configuration change affected ${significantChanges} crew members significantly. `;
    summary += `Average workload score change: ${avgChange.toFixed(1)} points. `;

    if (highestIncrease > 15) {
      summary += `Largest increase: +${highestIncrease.toFixed(1)} points. `;
    }
    if (highestDecrease < -15) {
      summary += `Largest decrease: ${highestDecrease.toFixed(1)} points.`;
    }

    return { significantChanges, summary };
  };

  // Sample data generation
  useEffect(() => {
    const generateCrewData = (): CrewMember[] => {
      const positions: ('Captain' | 'First Officer' | 'Flight Attendant')[] = ['Captain', 'First Officer', 'Flight Attendant'];
      const bases = ['LAX', 'JFK', 'MIA', 'DFW', 'ORD'];
      const names = [
        'James Rodriguez', 'Sarah Johnson', 'Michael Chen', 'Emily Davis',
        'David Wilson', 'Lisa Anderson', 'Robert Martinez', 'Jessica Taylor',
        'Christopher Brown', 'Amanda Thompson', 'Daniel Garcia', 'Michelle Lee',
        'Kevin White', 'Rachel Green', 'Steven Clark', 'Jennifer Adams'
      ];

      return names.map((name, index) => {
        const position = positions[index % positions.length];
        const base = bases[index % bases.length];

        // Historical averages
        const avgTripDays = 12 + Math.random() * 6;
        const avgRonDays = 8 + Math.random() * 4;
        const avgStandbyDays = 4 + Math.random() * 3;
        const avgDutyHours = 80 + Math.random() * 20;
        const avgFlightHours = 60 + Math.random() * 15;

        // Previous month (historical data)
        const prevTripDays = Math.round(avgTripDays + (Math.random() - 0.5) * 3);
        const prevRonDays = Math.round(avgRonDays + (Math.random() - 0.5) * 2);
        const prevStandbyDays = Math.round(avgStandbyDays + (Math.random() - 0.5) * 2);
        const prevOffDays = 30 - prevTripDays - prevStandbyDays;
        const prevDutyHours = Math.round(avgDutyHours + (Math.random() - 0.5) * 12);
        const prevFlightHours = Math.round(avgFlightHours + (Math.random() - 0.5) * 8);
        const prevFlightDays = prevTripDays - prevRonDays;
        const prevPositionDays = Math.floor(Math.random() * 3);
        const prevWeekendDays = Math.floor(prevTripDays / 7 * 2) + Math.floor(Math.random() * 2);
        const prevTrainingDays = Math.floor(Math.random() * 3);
        const prevMiscDuty = Math.floor(Math.random() * 2);
        const prevOtherDutyDays = Math.floor(Math.random() * 2);
        const prevTotalDutyDays = prevTripDays + prevStandbyDays + prevTrainingDays + prevMiscDuty + prevOtherDutyDays;
        const prevStopScheduled = 8;
        const prevStopWorked = Math.floor(Math.random() * 3);
        const prevPaybackStopDays = prevStopWorked * 2;
        const prevVacationDays = Math.floor(Math.random() * 5);
        const prevMiscOffDays = Math.floor(Math.random() * 3);
        const prevTotalRestDays = prevOffDays + prevVacationDays + prevMiscOffDays;
        const prevUnscheduledAvailable = 30 - prevTotalDutyDays - prevTotalRestDays;

        // Current month (with some variation from historical)
        const currentTripDays = Math.round(avgTripDays + (Math.random() - 0.5) * 4);
        const currentRonDays = Math.round(avgRonDays + (Math.random() - 0.5) * 2);
        const currentStandbyDays = Math.round(avgStandbyDays + (Math.random() - 0.5) * 2);
        const currentOffDays = 30 - currentTripDays - currentStandbyDays;
        const currentDutyHours = Math.round(avgDutyHours + (Math.random() - 0.5) * 15);
        const currentFlightHours = Math.round(avgFlightHours + (Math.random() - 0.5) * 10);

        // New detailed metrics for current month
        const currentFlightDays = currentTripDays - currentRonDays; // Flight days excluding RON
        const currentPositionDays = Math.floor(Math.random() * 3); // Positioning days
        const currentWeekendDays = Math.floor(currentTripDays / 7 * 2) + Math.floor(Math.random() * 2); // Approx weekend days worked
        const currentTrainingDays = Math.floor(Math.random() * 3);
        const currentMiscDuty = Math.floor(Math.random() * 2);
        const currentOtherDutyDays = Math.floor(Math.random() * 2);
        const currentTotalDutyDays = currentTripDays + currentStandbyDays + currentTrainingDays + currentMiscDuty + currentOtherDutyDays;

        // STOP schedule metrics
        const currentStopScheduled = 8; // 2 weekend days per STOP x 4 STOPs per month (every other weekend)
        const currentStopWorked = Math.floor(Math.random() * 3); // Sometimes crew works during STOP
        const currentPaybackStopDays = currentStopWorked * 2; // Each STOP worked = 2 days payback
        const currentVacationDays = Math.floor(Math.random() * 5);
        const currentMiscOffDays = Math.floor(Math.random() * 3);
        const currentTotalRestDays = currentOffDays + currentVacationDays + currentMiscOffDays;
        const currentUnscheduledAvailable = 30 - currentTotalDutyDays - currentTotalRestDays;

        // Next month projections
        const nextTripDays = Math.round(avgTripDays + (Math.random() - 0.5) * 3);
        const nextRonDays = Math.round(avgRonDays + (Math.random() - 0.5) * 2);
        const nextStandbyDays = Math.round(avgStandbyDays + (Math.random() - 0.5) * 2);
        const nextOffDays = 30 - nextTripDays - nextStandbyDays;
        const nextFlightDays = nextTripDays - nextRonDays;
        const nextPositionDays = Math.floor(Math.random() * 3);
        const nextWeekendDays = Math.floor(nextTripDays / 7 * 2) + Math.floor(Math.random() * 2);
        const nextTrainingDays = Math.floor(Math.random() * 3);
        const nextMiscDuty = Math.floor(Math.random() * 2);
        const nextOtherDutyDays = Math.floor(Math.random() * 2);
        const nextTotalDutyDays = nextTripDays + nextStandbyDays + nextTrainingDays + nextMiscDuty + nextOtherDutyDays;
        const nextStopScheduled = 8;
        const nextStopWorked = Math.floor(Math.random() * 2);
        const nextPaybackStopDays = nextStopWorked * 2;
        const nextVacationDays = Math.floor(Math.random() * 4);
        const nextMiscOffDays = Math.floor(Math.random() * 3);
        const nextTotalRestDays = nextOffDays + nextVacationDays + nextMiscOffDays;
        const nextUnscheduledAvailable = 30 - nextTotalDutyDays - nextTotalRestDays;

        // Two months out projections
        const twoMonthsTripDays = Math.round(avgTripDays + (Math.random() - 0.5) * 2);
        const twoMonthsRonDays = Math.round(avgRonDays + (Math.random() - 0.5) * 2);
        const twoMonthsStandbyDays = Math.round(avgStandbyDays + (Math.random() - 0.5) * 1);
        const twoMonthsOffDays = 30 - twoMonthsTripDays - twoMonthsStandbyDays;
        const twoMonthsFlightDays = twoMonthsTripDays - twoMonthsRonDays;
        const twoMonthsPositionDays = Math.floor(Math.random() * 2);
        const twoMonthsWeekendDays = Math.floor(twoMonthsTripDays / 7 * 2) + Math.floor(Math.random() * 2);
        const twoMonthsTrainingDays = Math.floor(Math.random() * 2);
        const twoMonthsMiscDuty = Math.floor(Math.random() * 2);
        const twoMonthsOtherDutyDays = Math.floor(Math.random() * 2);
        const twoMonthsTotalDutyDays = twoMonthsTripDays + twoMonthsStandbyDays + twoMonthsTrainingDays + twoMonthsMiscDuty + twoMonthsOtherDutyDays;
        const twoMonthsStopScheduled = 8;
        const twoMonthsStopWorked = Math.floor(Math.random() * 2);
        const twoMonthsPaybackStopDays = twoMonthsStopWorked * 2;
        const twoMonthsVacationDays = Math.floor(Math.random() * 3);
        const twoMonthsMiscOffDays = Math.floor(Math.random() * 2);
        const twoMonthsTotalRestDays = twoMonthsOffDays + twoMonthsVacationDays + twoMonthsMiscOffDays;
        const twoMonthsUnscheduledAvailable = 30 - twoMonthsTotalDutyDays - twoMonthsTotalRestDays;

        // Calculate workload score will be done by calculateWorkloadScore function
        const workloadScore = 50 + Math.random() * 40; // Temporary placeholder

        // Determine balance alert level
        let balanceAlert: 'none' | 'caution' | 'warning' | 'critical' = 'none';
        if (workloadScore > 85) balanceAlert = 'critical';
        else if (workloadScore > 75) balanceAlert = 'warning';
        else if (workloadScore > 65) balanceAlert = 'caution';

        const training = {
          medicalExpiry: new Date(Date.now() + (Math.random() * 365 + 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          recurrentExpiry: new Date(Date.now() + (Math.random() * 365 + 60) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          instrumentCheckExpiry: new Date(Date.now() + (Math.random() * 180 + 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          lineCheckExpiry: new Date(Date.now() + (Math.random() * 365 + 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          upcomingRequirements: ['Recurrent Training', 'Medical Renewal', 'Instrument Check'].filter(() => Math.random() > 0.7),
          trainingHoursCompleted: Math.floor(Math.random() * 40),
          trainingHoursRequired: 40
        };

        const qualifications = {
          aircraftTypes: ['G650', 'G550', 'G450'].filter(() => Math.random() > 0.5),
          specialAirports: ['KTEB', 'KASE', 'KJAC', 'KEGE'].filter(() => Math.random() > 0.6),
          languages: ['English', 'Spanish', 'French', 'German'].filter(() => Math.random() > 0.7),
          internationalAuth: Math.random() > 0.3,
          instrumentRating: Math.random() > 0.1,
          instructorRating: Math.random() > 0.8
        };

        const fatigue = {
          riskScore: Math.floor(Math.random() * 60 + 20), // 20-80
          consecutiveDutyDays: Math.floor(Math.random() * 5),
          lastRestPeriod: 8 + Math.random() * 8, // 8-16 hours
          circadianRhythmDisruption: Math.floor(Math.random() * 50),
          timezoneCrossingCount: Math.floor(Math.random() * 4)
        };

        const routes = ['LAX-JFK', 'MIA-LAX', 'DFW-JFK', 'ORD-MIA'];
        const routeFamiliarity: Record<string, { flights: number; lastFlown: string; familiarityScore: number }> = {};
        routes.forEach(route => {
          if (Math.random() > 0.4) {
            routeFamiliarity[route] = {
              flights: Math.floor(Math.random() * 50) + 5,
              lastFlown: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              familiarityScore: Math.floor(Math.random() * 40) + 60
            };
          }
        });

        return {
          id: `crew-${index + 1}`,
          name,
          position,
          base,
          status: Math.random() > 0.1 ? 'active' : (Math.random() > 0.5 ? 'training' : 'reserve'),
          excludeFromMetrics: Math.random() > 0.85, // 15% chance of being excluded (simulating leave/unavailable)
          previousMonth: {
            flightDays: prevFlightDays,
            tripDays: prevTripDays,
            ronDays: prevRonDays,
            positionDays: prevPositionDays,
            weekendDays: prevWeekendDays,
            standbyDays: prevStandbyDays,
            miscDuty: prevMiscDuty,
            trainingDays: prevTrainingDays,
            otherDutyDays: prevOtherDutyDays,
            totalDutyDays: prevTotalDutyDays,
            stopScheduled: prevStopScheduled,
            stopWorkedDays: prevStopWorked,
            paybackStopDays: prevPaybackStopDays,
            vacationDays: prevVacationDays,
            miscOffDays: prevMiscOffDays,
            totalRestDays: prevTotalRestDays,
            unscheduledAvailable: prevUnscheduledAvailable,
            offDays: prevOffDays,
            dutyHours: prevDutyHours,
            flightHours: prevFlightHours,
            countries: ['US', 'Canada', 'Mexico'].slice(0, Math.floor(Math.random() * 3) + 1)
          },
          currentMonth: {
            flightDays: currentFlightDays,
            tripDays: currentTripDays,
            ronDays: currentRonDays,
            positionDays: currentPositionDays,
            weekendDays: currentWeekendDays,
            standbyDays: currentStandbyDays,
            miscDuty: currentMiscDuty,
            trainingDays: currentTrainingDays,
            otherDutyDays: currentOtherDutyDays,
            totalDutyDays: currentTotalDutyDays,
            stopScheduled: currentStopScheduled,
            stopWorkedDays: currentStopWorked,
            paybackStopDays: currentPaybackStopDays,
            vacationDays: currentVacationDays,
            miscOffDays: currentMiscOffDays,
            totalRestDays: currentTotalRestDays,
            unscheduledAvailable: currentUnscheduledAvailable,
            offDays: currentOffDays,
            dutyHours: currentDutyHours,
            flightHours: currentFlightHours,
            countries: ['US', 'Canada', 'Mexico'].slice(0, Math.floor(Math.random() * 3) + 1)
          },
          nextMonth: {
            flightDays: nextFlightDays,
            tripDays: nextTripDays,
            ronDays: nextRonDays,
            positionDays: nextPositionDays,
            weekendDays: nextWeekendDays,
            standbyDays: nextStandbyDays,
            miscDuty: nextMiscDuty,
            trainingDays: nextTrainingDays,
            otherDutyDays: nextOtherDutyDays,
            totalDutyDays: nextTotalDutyDays,
            stopScheduled: nextStopScheduled,
            stopWorkedDays: nextStopWorked,
            paybackStopDays: nextPaybackStopDays,
            vacationDays: nextVacationDays,
            miscOffDays: nextMiscOffDays,
            totalRestDays: nextTotalRestDays,
            unscheduledAvailable: nextUnscheduledAvailable,
            offDays: nextOffDays,
            projectedDutyHours: Math.round(avgDutyHours + (Math.random() - 0.5) * 12),
            projectedFlightHours: Math.round(avgFlightHours + (Math.random() - 0.5) * 8),
            scheduledTrips: Math.floor(nextTripDays / 3) + Math.floor(Math.random() * 2)
          },
          twoMonthsOut: {
            flightDays: twoMonthsFlightDays,
            tripDays: twoMonthsTripDays,
            ronDays: twoMonthsRonDays,
            positionDays: twoMonthsPositionDays,
            weekendDays: twoMonthsWeekendDays,
            standbyDays: twoMonthsStandbyDays,
            miscDuty: twoMonthsMiscDuty,
            trainingDays: twoMonthsTrainingDays,
            otherDutyDays: twoMonthsOtherDutyDays,
            totalDutyDays: twoMonthsTotalDutyDays,
            stopScheduled: twoMonthsStopScheduled,
            stopWorkedDays: twoMonthsStopWorked,
            paybackStopDays: twoMonthsPaybackStopDays,
            vacationDays: twoMonthsVacationDays,
            miscOffDays: twoMonthsMiscOffDays,
            totalRestDays: twoMonthsTotalRestDays,
            unscheduledAvailable: twoMonthsUnscheduledAvailable,
            offDays: twoMonthsOffDays,
            projectedDutyHours: Math.round(avgDutyHours + (Math.random() - 0.5) * 10),
            projectedFlightHours: Math.round(avgFlightHours + (Math.random() - 0.5) * 6),
            scheduledTrips: Math.floor(twoMonthsTripDays / 3)
          },
          stopSchedule: {
            stopType: ['STOP-1', 'STOP-2', 'STOP-3', 'STOP-4 (Flex)'][index % 4] as 'STOP-1' | 'STOP-2' | 'STOP-3' | 'STOP-4 (Flex)',
            currentCycle: (index % 8) + 1,
            nextStop1Date: new Date(Date.now() + (((index % 8) + 1) * 2) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            nextFullWeekOff: new Date(Date.now() + (8 - (index % 8)) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            paybackStopAccumulated: currentPaybackStopDays + Math.floor(Math.random() * 4),
            paybackStopUsed: Math.floor(Math.random() * 2),
            paybackStopPending: Math.floor(Math.random() * 2),
            paybackRequests: Math.random() > 0.7 ? [
              {
                id: `pr-${index}-${Date.now()}`,
                date: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                days: 2,
                status: 'pending'
              }
            ] : []
          },
          historicalAverage: {
            monthlyTripDays: avgTripDays,
            monthlyRonDays: avgRonDays,
            monthlyStandbyDays: avgStandbyDays,
            monthlyDutyHours: avgDutyHours,
            monthlyFlightHours: avgFlightHours
          },
          workloadScore: Math.round(workloadScore * 100) / 100,
          balanceAlert,
          preferences: {
            maxTripDays: 18 + Math.floor(Math.random() * 4),
            maxConsecutiveDays: 6 + Math.floor(Math.random() * 2),
            preferredRoutes: ['Domestic', 'International'].slice(0, Math.floor(Math.random() * 2) + 1),
            unavailableDates: []
          },
          training,
          qualifications,
          fatigue,
          routeFamiliarity
        };
      });
    };

    const crew = generateCrewData();
    setCrewMembers(crew);

    // Generate summary - only include crew that are not excluded from metrics
    const activeCrew = crew.filter(c => c.status === 'active' && !c.excludeFromMetrics);
    const excludedCrew = crew.filter(c => c.excludeFromMetrics);
    const summary: WorkloadSummary = {
      totalCrew: crew.length,
      activecrew: activeCrew.length,
      currentUtilization: activeCrew.length > 0 ? Math.round((activeCrew.reduce((sum, c) => sum + c.currentMonth.tripDays, 0) / (activeCrew.length * 20)) * 100) : 0,
      projectedUtilization: activeCrew.length > 0 ? Math.round((activeCrew.reduce((sum, c) => sum + c.nextMonth.tripDays, 0) / (activeCrew.length * 20)) * 100) : 0,
      imbalanceAlerts: activeCrew.filter(c => c.balanceAlert !== 'none').length,
      avgTripDaysPerCrew: activeCrew.length > 0 ? Math.round(activeCrew.reduce((sum, c) => sum + c.currentMonth.tripDays, 0) / activeCrew.length * 10) / 10 : 0,
      avgRonDaysPerCrew: activeCrew.length > 0 ? Math.round(activeCrew.reduce((sum, c) => sum + c.currentMonth.ronDays, 0) / activeCrew.length * 10) / 10 : 0,
      avgStandbyDaysPerCrew: activeCrew.length > 0 ? Math.round(activeCrew.reduce((sum, c) => sum + c.currentMonth.standbyDays, 0) / activeCrew.length * 10) / 10 : 0,
    };

    setWorkloadSummary(summary);

    // Update workload scores after crew data is generated (only on initial load)
    if (currentMetricConfig && isInitialLoadRef.current) {
      const updatedCrew = crew.map(member => ({
        ...member,
        workloadScore: calculateWorkloadScore(member, 'current')
      }));
      setCrewMembers(updatedCrew);
      isInitialLoadRef.current = false;
    }
  }, []);

  // Filter and sort crew data
  const filteredCrew = crewMembers
    .filter(crew => {
      if (filterPosition !== 'all' && crew.position !== filterPosition) return false;
      if (filterBase !== 'all' && crew.base !== filterBase) return false;
      // Show excluded crew only if toggle is enabled
      if (crew.excludeFromMetrics && !showExcludedCrew) return false;
      return true;
    })
    .sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case 'workloadScore':
          aValue = a.workloadScore;
          bValue = b.workloadScore;
          break;
        case 'tripDays':
          aValue = a.currentMonth.tripDays;
          bValue = b.currentMonth.tripDays;
          break;
        case 'ronDays':
          aValue = a.currentMonth.ronDays;
          bValue = b.currentMonth.ronDays;
          break;
        case 'dutyHours':
          aValue = a.currentMonth.dutyHours;
          bValue = b.currentMonth.dutyHours;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const getWorkloadColor = (score: number) => {
    if (score >= 85) return 'text-red-600 bg-red-50';
    if (score >= 75) return 'text-orange-600 bg-orange-50';
    if (score >= 65) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getAlertBadgeVariant = (alert: string) => {
    switch (alert) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'caution': return 'outline';
      default: return 'default';
    }
  };

  // Chart data preparation - only include non-excluded crew for accurate metrics
  const activeFilteredCrew = filteredCrew.filter(c => !c.excludeFromMetrics);
  const workloadDistributionData = [
    { name: '0-50', count: activeFilteredCrew.filter(c => c.workloadScore <= 50).length, fill: '#22c55e' },
    { name: '51-65', count: activeFilteredCrew.filter(c => c.workloadScore > 50 && c.workloadScore <= 65).length, fill: '#84cc16' },
    { name: '66-75', count: activeFilteredCrew.filter(c => c.workloadScore > 65 && c.workloadScore <= 75).length, fill: '#eab308' },
    { name: '76-85', count: activeFilteredCrew.filter(c => c.workloadScore > 75 && c.workloadScore <= 85).length, fill: '#f97316' },
    { name: '86-100', count: activeFilteredCrew.filter(c => c.workloadScore > 85).length, fill: '#ef4444' }
  ];

  const monthlyTrendsData = [
    {
      month: 'Current',
      tripDays: workloadSummary?.avgTripDaysPerCrew || 0,
      ronDays: workloadSummary?.avgRonDaysPerCrew || 0,
      standbyDays: workloadSummary?.avgStandbyDaysPerCrew || 0,
    },
    {
      month: 'Next Month',
      tripDays: activeFilteredCrew.length > 0 ? activeFilteredCrew.reduce((sum, c) => sum + c.nextMonth.tripDays, 0) / activeFilteredCrew.length : 0,
      ronDays: activeFilteredCrew.length > 0 ? activeFilteredCrew.reduce((sum, c) => sum + c.nextMonth.ronDays, 0) / activeFilteredCrew.length : 0,
      standbyDays: activeFilteredCrew.length > 0 ? activeFilteredCrew.reduce((sum, c) => sum + c.nextMonth.standbyDays, 0) / activeFilteredCrew.length : 0,
    },
    {
      month: '2 Months Out',
      tripDays: activeFilteredCrew.length > 0 ? activeFilteredCrew.reduce((sum, c) => sum + c.twoMonthsOut.tripDays, 0) / activeFilteredCrew.length : 0,
      ronDays: activeFilteredCrew.length > 0 ? activeFilteredCrew.reduce((sum, c) => sum + c.twoMonthsOut.ronDays, 0) / activeFilteredCrew.length : 0,
      standbyDays: activeFilteredCrew.length > 0 ? activeFilteredCrew.reduce((sum, c) => sum + c.twoMonthsOut.standbyDays, 0) / activeFilteredCrew.length : 0,
    }
  ];

  // Generate crew utilization balance data
  const generateUtilizationBalanceData = () => {
    const monthKey = selectedMonth as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut';

    // Use configurable target average (10 days) instead of fleet average
    const targetAverage = 10;

    // Calculate actual fleet average for display purposes
    const actualFleetAverage = activeFilteredCrew.length > 0
      ? activeFilteredCrew.reduce((sum, c) => sum + (c[monthKey]?.tripDays || 0), 0) / activeFilteredCrew.length
      : 0;

    // Generate balance data for each crew member
    let balanceData = activeFilteredCrew.map(crew => {
      const tripDays = crew[monthKey]?.tripDays || 0;
      const utilizationPercent = (tripDays / 20) * 100; // Assuming 20 days is max
      const deviation = tripDays - targetAverage;
      const deviationPercent = targetAverage > 0 ? (deviation / targetAverage) * 100 : 0;

      let status: 'critical-over' | 'warning-over' | 'balanced' | 'under' | 'critical-under';
      if (deviationPercent > 20) status = 'critical-over';
      else if (deviationPercent > 10) status = 'warning-over';
      else if (deviationPercent < -20) status = 'critical-under';
      else if (deviationPercent < -10) status = 'under';
      else status = 'balanced';

      return {
        crewId: crew.id,
        crewName: crew.name,
        position: crew.position,
        utilizationPercent,
        targetAverage,
        actualFleetAverage,
        deviation,
        deviationPercent,
        status,
        tripDays: crew[monthKey]?.tripDays || 0,
        ronDays: crew[monthKey]?.ronDays || 0,
        standbyDays: crew[monthKey]?.standbyDays || 0,
      };
    });

    // Apply filter
    if (utilizationFilter === 'over') {
      balanceData = balanceData.filter(d => d.deviationPercent > 10);
    } else if (utilizationFilter === 'under') {
      balanceData = balanceData.filter(d => d.deviationPercent < -10);
    }

    // Apply sort
    if (sortUtilizationBy === 'overutilized') {
      balanceData.sort((a, b) => b.deviationPercent - a.deviationPercent);
    } else if (sortUtilizationBy === 'underutilized') {
      balanceData.sort((a, b) => a.deviationPercent - b.deviationPercent);
    } else {
      balanceData.sort((a, b) => a.crewName.localeCompare(b.crewName));
    }

    return { balanceData, targetAverage, actualFleetAverage };
  };

  // Generate utilization trend data over time
  const generateUtilizationTrendData = () => {
    const months = dateRange === '3M' ? 3 : dateRange === '6M' ? 6 : 12;
    const today = new Date();
    const trendData = [];

    // Generate historical data (mock)
    for (let i = months; i > 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const crewUtilization: Record<string, number> = {};
      let totalUtil = 0;
      let overCount = 0;
      let underCount = 0;
      let balancedCount = 0;

      activeFilteredCrew.forEach(crew => {
        // Generate mock historical utilization with some variation
        const baseUtil = 65 + Math.random() * 20;
        const util = Math.max(0, Math.min(100, baseUtil + (Math.random() - 0.5) * 30));
        crewUtilization[crew.id] = util;
        totalUtil += util;

        if (util > 80) overCount++;
        else if (util < 60) underCount++;
        else balancedCount++;
      });

      trendData.push({
        month: monthName,
        date,
        isPast: true,
        fleetAverage: activeFilteredCrew.length > 0 ? totalUtil / activeFilteredCrew.length : 0,
        crewUtilization,
        overUtilizedCount: overCount,
        underUtilizedCount: underCount,
        balancedCount,
      });
    }

    // Add current and future months using actual data
    const futureMonths = [
      { key: 'currentMonth' as const, offset: 0, label: 'Current' },
      { key: 'nextMonth' as const, offset: 1, label: 'Next' },
      { key: 'twoMonthsOut' as const, offset: 2, label: '+2 Months' },
    ];

    futureMonths.forEach(({ key, offset }) => {
      const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const crewUtilization: Record<string, number> = {};
      let totalUtil = 0;
      let overCount = 0;
      let underCount = 0;
      let balancedCount = 0;

      activeFilteredCrew.forEach(crew => {
        const tripDays = crew[key]?.tripDays || 0;
        const util = (tripDays / 20) * 100;
        crewUtilization[crew.id] = util;
        totalUtil += util;

        if (util > 80) overCount++;
        else if (util < 60) underCount++;
        else balancedCount++;
      });

      trendData.push({
        month: monthName,
        date,
        isPast: offset === 0,
        fleetAverage: activeFilteredCrew.length > 0 ? totalUtil / activeFilteredCrew.length : 0,
        crewUtilization,
        overUtilizedCount: overCount,
        underUtilizedCount: underCount,
        balancedCount,
      });
    });

    return trendData;
  };

  const utilizationBalanceData = generateUtilizationBalanceData();
  const utilizationTrendData = generateUtilizationTrendData();

  // Helper function to get color for utilization status
  const getUtilizationColor = (status: string) => {
    switch (status) {
      case 'critical-over': return '#ef4444'; // red
      case 'warning-over': return '#f97316'; // orange
      case 'balanced': return '#22c55e'; // green
      case 'under': return '#3b82f6'; // blue
      case 'critical-under': return '#1d4ed8'; // dark blue
      default: return '#6b7280'; // gray
    }
  };

  // Metric configuration functions
  const handleMetricWeightChange = (metricId: string, newWeight: number) => {
    if (!currentMetricConfig) return;

    const updatedMetrics = currentMetricConfig.metrics.map(metric =>
      metric.id === metricId ? { ...metric, weight: newWeight } : metric
    );

    const newConfig = {
      ...currentMetricConfig,
      metrics: updatedMetrics,
      modifiedAt: new Date().toISOString()
    };

    setCurrentMetricConfig(newConfig);
  };

  const toggleMetric = (metricId: string) => {
    if (!currentMetricConfig) return;

    const updatedMetrics = currentMetricConfig.metrics.map(metric =>
      metric.id === metricId ? { ...metric, enabled: !metric.enabled } : metric
    );

    const newConfig = {
      ...currentMetricConfig,
      metrics: updatedMetrics,
      modifiedAt: new Date().toISOString()
    };

    setCurrentMetricConfig(newConfig);
  };

  const addCustomMetric = () => {
    if (!currentMetricConfig || !newCustomMetric.name) return;

    const customMetric: WorkloadMetric = {
      id: `custom-${Date.now()}`,
      name: newCustomMetric.name,
      description: newCustomMetric.description,
      weight: newCustomMetric.weight,
      enabled: true,
      category: 'custom',
      unit: newCustomMetric.unit,
      maxValue: newCustomMetric.maxValue,
      getValue: () => Math.random() * newCustomMetric.maxValue // Placeholder for custom logic
    };

    const updatedMetrics = [...currentMetricConfig.metrics, customMetric];

    const newConfig = {
      ...currentMetricConfig,
      metrics: updatedMetrics,
      modifiedAt: new Date().toISOString()
    };

    setCurrentMetricConfig(newConfig);

    setNewCustomMetric({
      name: '',
      description: '',
      weight: 5, // Default to 5 days instead of 10%
      unit: '',
      maxValue: 100
    });
  };

  const removeCustomMetric = (metricId: string) => {
    if (!currentMetricConfig) return;

    const updatedMetrics = currentMetricConfig.metrics.filter(m => m.id !== metricId);

    const newConfig = {
      ...currentMetricConfig,
      metrics: updatedMetrics,
      modifiedAt: new Date().toISOString()
    };

    setCurrentMetricConfig(newConfig);
  };

  const saveConfiguration = () => {
    if (!currentMetricConfig) return;

    const configName = prompt('Enter a name for this configuration:');
    if (!configName) return;

    const newConfig: MetricConfiguration = {
      ...currentMetricConfig,
      id: `config-${Date.now()}`,
      name: configName,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    setSavedConfigurations(prev => [...prev, newConfig]);
  };

  const loadConfiguration = (config: MetricConfiguration) => {
    setCurrentMetricConfig(config);
  };

  const resetToDefaults = () => {
    const defaultConfig = createDefaultConfiguration();
    setCurrentMetricConfig(defaultConfig);
  };

  const applyPresetConfiguration = (preset: 'balanced' | 'duty-heavy' | 'travel-focused' | 'flight-focused' | 'fatigue-aware' | 'utilization') => {
    if (!currentMetricConfig) return;

    let presetConfig: MetricConfiguration | null = null;

    switch (preset) {
      case 'balanced':
        presetConfig = {
          ...currentMetricConfig,
          name: 'Balanced Configuration',
          description: 'Equal weight across all metrics',
          metrics: currentMetricConfig.metrics.map(m => ({ ...m, weight: 5 })) // Equal weight of 5 days each
        };
        break;

      case 'duty-heavy':
        presetConfig = {
          ...currentMetricConfig,
          name: 'Duty-Heavy Configuration',
          description: 'Emphasizes duty hours and standby time',
          metrics: currentMetricConfig.metrics.map(m => {
            if (m.id === 'duty-hours') return { ...m, weight: 12 };
            if (m.id === 'standby-days') return { ...m, weight: 8 };
            if (m.id === 'trip-days') return { ...m, weight: 4 };
            if (m.id === 'ron-days') return { ...m, weight: 3 };
            return { ...m, weight: 5 };
          })
        };
        break;

      case 'travel-focused':
      case 'flight-focused':
        presetConfig = {
          ...currentMetricConfig,
          name: 'Flight-focused Configuration',
          description: 'Emphasizes trip days and RON considerations',
          metrics: currentMetricConfig.metrics.map(m => {
            if (m.id === 'trip-days') return { ...m, weight: 15 };
            if (m.id === 'ron-days') return { ...m, weight: 10 };
            if (m.id === 'duty-hours') return { ...m, weight: 5 };
            return { ...m, weight: 3 };
          })
        };
        break;

      case 'fatigue-aware':
        presetConfig = {
          ...currentMetricConfig,
          name: 'Fatigue Management',
          description: 'Focuses on fatigue-inducing metrics',
          metrics: currentMetricConfig.metrics.map(m => {
            if (m.id === 'ron-days') return { ...m, weight: 15 };
            if (m.id === 'duty-hours') return { ...m, weight: 12 };
            if (m.id === 'standby-days') return { ...m, weight: 8 };
            return { ...m, weight: 4 };
          })
        };
        break;

      case 'utilization':
        presetConfig = {
          ...currentMetricConfig,
          name: 'Utilization Focused',
          description: 'Maximizes crew utilization metrics',
          metrics: currentMetricConfig.metrics.map(m => {
            if (m.id === 'trip-days') return { ...m, weight: 20 };
            if (m.id === 'duty-hours') return { ...m, weight: 15 };
            return { ...m, weight: 2 };
          })
        };
        break;
    }

    if (presetConfig) {
      setCurrentMetricConfig(presetConfig);
    }
  };

  const handleCrewSelect = (crew: CrewMember) => {
    setSelectedCrew(crew);
    setViewMode('individual');
  };

  const handleBackToOverview = () => {
    setSelectedCrew(null);
    setViewMode('overview');
  };

  // Toggle crew member exclusion from metrics
  const toggleCrewExclusion = (crewId: string) => {
    setCrewMembers(prev => prev.map(crew =>
      crew.id === crewId
        ? { ...crew, excludeFromMetrics: !crew.excludeFromMetrics }
        : crew
    ));
  };

  // Individual crew member data for charts
  const getIndividualCrewData = (crew: CrewMember) => {
    return [
      {
        period: 'Current Month',
        tripDays: crew.currentMonth.tripDays,
        ronDays: crew.currentMonth.ronDays,
        standbyDays: crew.currentMonth.standbyDays,
        dutyHours: crew.currentMonth.dutyHours,
        flightHours: crew.currentMonth.flightHours
      },
      {
        period: 'Next Month',
        tripDays: crew.nextMonth.tripDays,
        ronDays: crew.nextMonth.ronDays,
        standbyDays: crew.nextMonth.standbyDays,
        dutyHours: crew.nextMonth.projectedDutyHours,
        flightHours: crew.nextMonth.projectedFlightHours
      },
      {
        period: '2 Months Out',
        tripDays: crew.twoMonthsOut.tripDays,
        ronDays: crew.twoMonthsOut.ronDays,
        standbyDays: crew.twoMonthsOut.standbyDays,
        dutyHours: crew.twoMonthsOut.projectedDutyHours,
        flightHours: crew.twoMonthsOut.projectedFlightHours
      }
    ];
  };

  const getCrewMetricBreakdown = (crew: CrewMember) => {
    if (!currentMetricConfig) return [];

    const enabledMetrics = currentMetricConfig.metrics.filter(m => m.enabled);
    const totalWeight = enabledMetrics.reduce((sum, metric) => sum + metric.weight, 0);

    return enabledMetrics.map(metric => {
      const value = metric.getValue(crew, 'current');
      const normalizedValue = Math.min(value / metric.maxValue, 1);
      const weightedContribution = totalWeight > 0 ? (normalizedValue * metric.weight) / totalWeight * 100 : 0;

      return {
        name: metric.name,
        value: value,
        maxValue: metric.maxValue,
        weight: metric.weight,
        contribution: weightedContribution,
        unit: metric.unit
      };
    });
  };

  if (!workloadSummary) {
    return <div>Loading...</div>;
  }

  // Render individual crew view
  if (viewMode === 'individual' && selectedCrew) {
    const crewData = getIndividualCrewData(selectedCrew);
    const metricBreakdown = getCrewMetricBreakdown(selectedCrew);

    return (
      <div className="space-y-6 p-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBackToOverview}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-2">
                <User className="h-8 w-8 text-primary" />
                <span>{selectedCrew.name}</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                {selectedCrew.position} • {selectedCrew.base} • {selectedCrew.status.charAt(0).toUpperCase() + selectedCrew.status.slice(1)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Badge className={`${getWorkloadColor(selectedCrew.workloadScore)} text-lg px-4 py-2`}>
              Workload Score: {selectedCrew.workloadScore.toFixed(0)}
            </Badge>
            <Button
              variant={selectedCrew.excludeFromMetrics ? "destructive" : "outline"}
              onClick={() => toggleCrewExclusion(selectedCrew.id)}
              className="flex items-center space-x-2"
            >
              {selectedCrew.excludeFromMetrics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{selectedCrew.excludeFromMetrics ? 'Excluded from Metrics' : 'Include in Metrics'}</span>
            </Button>
          </div>
        </div>

        {/* Exclusion Alert for Individual View */}
        {selectedCrew.excludeFromMetrics && (
          <Alert className="border-orange-200 bg-orange-50">
            <EyeOff className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Excluded from Metrics:</strong> This crew member is currently excluded from all workload calculations and fleet averages.
              Their data is shown for reference only.
            </AlertDescription>
          </Alert>
        )}

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Fatigue Risk</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${selectedCrew.fatigue.riskScore > 60 ? 'text-orange-600' : selectedCrew.fatigue.riskScore > 80 ? 'text-red-600' : 'text-green-600'}`}>
                {selectedCrew.fatigue.riskScore}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedCrew.fatigue.consecutiveDutyDays} consecutive days
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Training Status</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{((selectedCrew.training.trainingHoursCompleted / selectedCrew.training.trainingHoursRequired) * 100).toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">
                {selectedCrew.training.upcomingRequirements.length} upcoming
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Trip Days</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCrew.currentMonth.tripDays}</div>
              <p className="text-xs text-muted-foreground">
                vs {selectedCrew.historicalAverage.monthlyTripDays.toFixed(1)} avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">RON Days</CardTitle>
              <Moon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCrew.currentMonth.ronDays}</div>
              <p className="text-xs text-muted-foreground">
                vs {selectedCrew.historicalAverage.monthlyRonDays.toFixed(1)} avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Standby Days</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCrew.currentMonth.standbyDays}</div>
              <p className="text-xs text-muted-foreground">
                vs {selectedCrew.historicalAverage.monthlyStandbyDays.toFixed(1)} avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Duty Hours</CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCrew.currentMonth.dutyHours}</div>
              <p className="text-xs text-muted-foreground">
                vs {selectedCrew.historicalAverage.monthlyDutyHours.toFixed(1)} avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Flight Hours</CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedCrew.currentMonth.flightHours}</div>
              <p className="text-xs text-muted-foreground">
                vs {selectedCrew.historicalAverage.monthlyFlightHours.toFixed(1)} avg
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workload Score Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Workload Score Breakdown</CardTitle>
            <CardDescription>How the overall workload score is calculated for this crew member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metricBreakdown.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{metric.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {metric.value} / {metric.maxValue} {metric.unit} • Weight: {metric.weight} days
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={(metric.value / metric.maxValue) * 100} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {metric.contribution.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exclusion Notice */}
        {crewMembers.filter(c => c.excludeFromMetrics).length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Eye className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Metrics Calculation:</strong> {crewMembers.filter(c => c.excludeFromMetrics).length} crew member(s) excluded from workload calculations.
              All averages and charts reflect only active, included crew members.
              {showExcludedCrew ? 'Excluded crew are shown with reduced opacity.' : 'Click "Show Excluded" to view them.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>3-Month Projection</CardTitle>
              <CardDescription>Current and projected workload metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={crewData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tripDays" fill="#0037B1" name="Trip Days" />
                  <Bar dataKey="ronDays" fill="#00A1DF" name="RON Days" />
                  <Bar dataKey="standbyDays" fill="#44BEEE" name="Standby Days" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duty & Flight Hours Trend</CardTitle>
              <CardDescription>Hours breakdown over 3 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={crewData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="dutyHours" stroke="#0037B1" name="Duty Hours" strokeWidth={2} />
                  <Line type="monotone" dataKey="flightHours" stroke="#00A1DF" name="Flight Hours" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Crew Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <span>Qualifications & Certifications</span>
              </CardTitle>
              <CardDescription>Current ratings and special qualifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium">Aircraft Types</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCrew.qualifications.aircraftTypes.map((aircraft, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <Plane className="h-3 w-3" />
                      <span>{aircraft}</span>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium">Special Airports</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCrew.qualifications.specialAirports.map((airport, index) => (
                    <Badge key={index} variant="outline">{airport}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-medium">Languages</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCrew.qualifications.languages.map((lang, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <Globe className="h-3 w-3" />
                      <span>{lang}</span>
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {selectedCrew.qualifications.internationalAuth && (
                  <Badge variant="secondary">International Authorization</Badge>
                )}
                {selectedCrew.qualifications.instrumentRating && (
                  <Badge variant="secondary">Instrument Rating</Badge>
                )}
                {selectedCrew.qualifications.instructorRating && (
                  <Badge variant="secondary">Flight Instructor</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span>Training & Currency</span>
              </CardTitle>
              <CardDescription>Current training status and upcoming requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Training Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedCrew.training.trainingHoursCompleted}/{selectedCrew.training.trainingHoursRequired} hrs
                  </span>
                </div>
                <Progress value={(selectedCrew.training.trainingHoursCompleted / selectedCrew.training.trainingHoursRequired) * 100} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Medical</span>
                  <span className="text-muted-foreground">{selectedCrew.training.medicalExpiry}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Recurrent</span>
                  <span className="text-muted-foreground">{selectedCrew.training.recurrentExpiry}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Instrument Check</span>
                  <span className="text-muted-foreground">{selectedCrew.training.instrumentCheckExpiry}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Line Check</span>
                  <span className="text-muted-foreground">{selectedCrew.training.lineCheckExpiry}</span>
                </div>
              </div>

              {selectedCrew.training.upcomingRequirements.length > 0 && (
                <div>
                  <span className="font-medium text-sm">Upcoming Requirements</span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedCrew.training.upcomingRequirements.map((req, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">{req}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>Route Familiarity</span>
              </CardTitle>
              <CardDescription>Experience on common routes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(selectedCrew.routeFamiliarity).map(([route, data]) => (
                <div key={route} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{route}</span>
                    <Badge variant="outline" className="text-xs">{data.flights} flights</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={data.familiarityScore} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-8">{data.familiarityScore}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last flown: {new Date(data.lastFlown).toLocaleDateString()}
                  </div>
                </div>
              ))}

              {Object.keys(selectedCrew.routeFamiliarity).length === 0 && (
                <p className="text-sm text-muted-foreground italic">No recent route history available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Fatigue Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>Fatigue Risk Analysis</span>
              </CardTitle>
              <CardDescription>Current fatigue indicators and risk factors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${selectedCrew.fatigue.riskScore > 60 ? 'text-orange-600' : 'text-green-600'}`}>
                    {selectedCrew.fatigue.riskScore}
                  </div>
                  <div className="text-sm text-muted-foreground">Risk Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{selectedCrew.fatigue.consecutiveDutyDays}</div>
                  <div className="text-sm text-muted-foreground">Consecutive Days</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Last Rest Period</span>
                  <Badge variant="outline">{selectedCrew.fatigue.lastRestPeriod.toFixed(1)} hours</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Circadian Disruption</span>
                  <Badge variant={selectedCrew.fatigue.circadianRhythmDisruption > 50 ? 'destructive' : 'outline'}>
                    {selectedCrew.fatigue.circadianRhythmDisruption}%
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Timezone Crossings</span>
                  <Badge variant="outline">{selectedCrew.fatigue.timezoneCrossingCount} this month</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preferences and Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Crew Preferences</CardTitle>
              <CardDescription>Individual preferences and limitations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Max Trip Days</span>
                <Badge variant="outline">{selectedCrew.preferences.maxTripDays} days</Badge>
              </div>
              <div className="flex justify-between">
                <span>Max Consecutive Days</span>
                <Badge variant="outline">{selectedCrew.preferences.maxConsecutiveDays} days</Badge>
              </div>
              <div>
                <span>Preferred Routes</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCrew.preferences.preferredRoutes.map((route, index) => (
                    <Badge key={index} variant="secondary">{route}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span>Recent Countries</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCrew.currentMonth.countries.map((country, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{country}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>Integrate with other systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message via FlightFamily
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <GraduationCap className="h-4 w-4 mr-2" />
                Schedule Training
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Submit ASAP Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Plane className="h-4 w-4 mr-2" />
                View Tech Log History
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="h-4 w-4 mr-2" />
                Adjust Schedule
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Next Month Projection */}
        <Card>
          <CardHeader>
            <CardTitle>Next Month Projections</CardTitle>
            <CardDescription>Scheduled and projected workload</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{selectedCrew.nextMonth.tripDays}</div>
                <div className="text-sm text-muted-foreground">Trip Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{selectedCrew.nextMonth.ronDays}</div>
                <div className="text-sm text-muted-foreground">RON Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{selectedCrew.nextMonth.scheduledTrips}</div>
                <div className="text-sm text-muted-foreground">Scheduled Trips</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{selectedCrew.nextMonth.projectedDutyHours}</div>
                <div className="text-sm text-muted-foreground">Projected Duty Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Impact Alert */}
      {showImpactAlert && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Configuration Impact:</strong> {impactSummary}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Users className="h-8 w-8 text-primary" />
            <span>Crew Workload & Travel Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Workload analysis, crew balance optimization, and travel tracking for Gulfstream G650 operations
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowMetricsConfig(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Metrics
          </Button>
          <Button variant="outline" onClick={() => setShowBalanceRecommendations(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Balance Recommendations
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="workload" className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-4">
          <TabsTrigger value="workload" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Workload Planning
          </TabsTrigger>
          <TabsTrigger value="travel" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Travel Tracking
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics & Visualizations
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Crew
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workload" className="space-y-6 overflow-x-hidden">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Total Crew</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.totalCrew}</div>
                <p className="text-xs text-muted-foreground">
                  {workloadSummary.activecrew} in metrics • {crewMembers.filter(c => c.excludeFromMetrics).length} excluded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Current Utilization</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.currentUtilization}%</div>
                <p className="text-xs text-muted-foreground">
                  {workloadSummary.projectedUtilization}% projected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Balance Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{workloadSummary.imbalanceAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  crew members need attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Avg Trip Days</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.avgTripDaysPerCrew}</div>
                <p className="text-xs text-muted-foreground">
                  per crew member
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Avg RON Days</CardTitle>
                <Moon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.avgRonDaysPerCrew}</div>
                <p className="text-xs text-muted-foreground">
                  per crew member
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Avg Standby</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.avgStandbyDaysPerCrew}</div>
                <p className="text-xs text-muted-foreground">
                  days per crew
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workload Distribution</CardTitle>
                <CardDescription>Number of crew in each workload category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={workloadDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, count }) => `${name}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3-Month Workload Trends</CardTitle>
                <CardDescription>Average workload metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="tripDays" stackId="1" stroke="#0037B1" fill="#0037B1" />
                    <Area type="monotone" dataKey="ronDays" stackId="1" stroke="#00A1DF" fill="#00A1DF" />
                    <Area type="monotone" dataKey="standbyDays" stackId="1" stroke="#44BEEE" fill="#44BEEE" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>



        </TabsContent>

        {/* Travel Tracking Tab */}
        <TabsContent value="travel" className="space-y-6">
          {/* Travel Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nights Away</CardTitle>
                <Moon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {crewMembers.reduce((sum, crew) => sum + (crew.currentMonth?.ronDays || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month across all crew
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Countries Visited</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(crewMembers.flatMap(crew => crew.currentMonth?.countries || [])).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique destinations this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">International Trips</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {crewMembers.reduce((sum, crew) => sum + (crew.currentMonth?.internationalTrips || 0), 0)}
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
                  {crewMembers.length > 0 ? Math.round(crewMembers.reduce((sum, crew) => sum + (crew.currentMonth?.ronDays || 0), 0) / crewMembers.length) : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  RON days per crew member
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
                  {crewMembers.slice(0, 10).map((crew) => {
                    const maxNights = Math.max(...crewMembers.map(c => c.currentMonth?.ronDays || 0));
                    const percentage = maxNights > 0 ? ((crew.currentMonth?.ronDays || 0) / maxNights) * 100 : 0;

                    return (
                      <div key={crew.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{crew.name}</span>
                          <span>{crew.currentMonth?.ronDays || 0} nights</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={percentage} className="flex-1" />
                          <Badge variant={percentage > 80 ? "destructive" : percentage > 60 ? "default" : "secondary"}>
                            {crew.currentMonth?.trips || 0} trips
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
                <CardDescription>Most visited destinations by crew this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    // Aggregate country visits across all crew
                    const countryTotals = new Map<string, number>();

                    crewMembers.forEach(crew => {
                      (crew.currentMonth?.countries || []).forEach(country => {
                        countryTotals.set(country, (countryTotals.get(country) || 0) + 1);
                      });
                    });

                    const sortedCountries = Array.from(countryTotals.entries())
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 8);

                    const maxVisits = sortedCountries.length > 0 ? Math.max(...sortedCountries.map(([, count]) => count)) : 1;

                    return sortedCountries.map(([country, count]) => (
                      <div key={country} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{country}</span>
                          <span>{count} visits</span>
                        </div>
                        <Progress value={(count / maxVisits) * 100} className="flex-1" />
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
              <CardDescription>Detailed breakdown of each crew member's travel activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {crewMembers.map((crew) => {
                  const avgRonAllCrew = crewMembers.length > 0 ? crewMembers.reduce((sum, c) => sum + (c.currentMonth?.ronDays || 0), 0) / crewMembers.length : 0;
                  const crewRonDays = crew.currentMonth?.ronDays || 0;
                  const balanceStatus = crewRonDays > avgRonAllCrew * 1.2 ? 'high' :
                    crewRonDays < avgRonAllCrew * 0.8 ? 'low' : 'balanced';

                  return (
                    <div key={crew.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium">{crew.name}</div>
                        <div className="text-sm text-muted-foreground">{crew.position} • {crew.base}</div>
                      </div>

                      <div className="flex items-center space-x-8">
                        <div className="text-center">
                          <div className="flex items-center space-x-2">
                            <Plane className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{crew.currentMonth?.trips || 0} trips</span>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center space-x-2">
                            <Moon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{crewRonDays} nights</span>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="flex items-center space-x-2">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{crew.currentMonth?.countries?.length || 0} countries</span>
                          </div>
                        </div>

                        <Badge className={
                          balanceStatus === 'high' ? 'bg-red-100 text-red-800' :
                            balanceStatus === 'low' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                        }>
                          {balanceStatus === 'high' ? 'Above Average' :
                            balanceStatus === 'low' ? 'Below Average' :
                              'Balanced'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics & Visualizations Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Total Crew</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.totalCrew}</div>
                <p className="text-xs text-muted-foreground">
                  {workloadSummary.activecrew} in metrics • {crewMembers.filter(c => c.excludeFromMetrics).length} excluded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Current Utilization</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.currentUtilization}%</div>
                <p className="text-xs text-muted-foreground">
                  {workloadSummary.projectedUtilization}% projected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Balance Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{workloadSummary.imbalanceAlerts}</div>
                <p className="text-xs text-muted-foreground">
                  crew members need attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Avg Trip Days</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.avgTripDaysPerCrew}</div>
                <p className="text-xs text-muted-foreground">
                  per crew member
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Avg RON Days</CardTitle>
                <Moon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.avgRonDaysPerCrew}</div>
                <p className="text-xs text-muted-foreground">
                  per crew member
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">Avg Standby</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workloadSummary.avgStandbyDaysPerCrew}</div>
                <p className="text-xs text-muted-foreground">
                  days per crew
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row - Crew Utilization Balance Tracking */}
          <div className="space-y-6">
            {/* Controls Row */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Select value={selectedMonth} onValueChange={(value: any) => setSelectedMonth(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previousMonth">Previous Month</SelectItem>
                    <SelectItem value="currentMonth">Current Month</SelectItem>
                    <SelectItem value="nextMonth">Next Month</SelectItem>
                    <SelectItem value="twoMonthsOut">Two Months Out</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 border rounded-md p-1">
                  <Button
                    variant={utilizationView === 'balance' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setUtilizationView('balance')}
                  >
                    Balance View
                  </Button>
                  <Button
                    variant={utilizationView === 'timeline' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setUtilizationView('timeline')}
                  >
                    Timeline View
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Balance View */}
            {utilizationView === 'balance' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle>Crew Utilization Balance</CardTitle>
                      <CardDescription>
                        Target: {utilizationBalanceData.targetAverage} days | Fleet Avg: {utilizationBalanceData.actualFleetAverage.toFixed(1)} days - Click crew to view details
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={sortUtilizationBy} onValueChange={(value: any) => setSortUtilizationBy(value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overutilized">Most Over-Utilized</SelectItem>
                          <SelectItem value="underutilized">Most Under-Utilized</SelectItem>
                          <SelectItem value="name">Alphabetical</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1 border rounded-md p-1">
                        <Button
                          variant={utilizationFilter === 'all' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setUtilizationFilter('all')}
                        >
                          All
                        </Button>
                        <Button
                          variant={utilizationFilter === 'over' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setUtilizationFilter('over')}
                        >
                          Over
                        </Button>
                        <Button
                          variant={utilizationFilter === 'under' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setUtilizationFilter('under')}
                        >
                          Under
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {utilizationBalanceData.balanceData.map((crew) => (
                      <div
                        key={crew.crewId}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          const crewMember = crewMembers.find(c => c.id === crew.crewId);
                          if (crewMember) handleCrewSelect(crewMember);
                        }}
                      >
                        <div className="w-40 flex-shrink-0">
                          <div className="font-medium text-sm">{crew.crewName}</div>
                          <div className="text-xs text-muted-foreground">{crew.position}</div>
                        </div>

                        <div className="flex-1 relative min-w-0">
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border z-0" />
                          <div className="relative h-8 flex items-center">
                            <div
                              className="absolute h-6 rounded transition-all"
                              style={{
                                backgroundColor: getUtilizationColor(crew.status),
                                width: `${Math.min(Math.abs(crew.deviationPercent) / 2, 50)}%`,
                                [crew.deviation >= 0 ? 'left' : 'right']: '50%',
                              }}
                            />
                          </div>
                        </div>

                        <div className="w-32 flex-shrink-0 text-right">
                          <div className="text-sm font-medium">
                            {crew.deviation >= 0 ? '+' : ''}{crew.deviation.toFixed(1)} days
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {crew.utilizationPercent.toFixed(0)}% utilized
                          </div>
                        </div>

                        <Badge
                          className="w-24 justify-center flex-shrink-0"
                          style={{
                            backgroundColor: getUtilizationColor(crew.status),
                            color: 'white',
                          }}
                        >
                          {crew.status === 'critical-over' && 'Critical'}
                          {crew.status === 'warning-over' && 'High'}
                          {crew.status === 'balanced' && 'Balanced'}
                          {crew.status === 'under' && 'Available'}
                          {crew.status === 'critical-under' && 'Low'}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {utilizationBalanceData.balanceData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No crew members match the current filter
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline View */}
            {utilizationView === 'timeline' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle>Utilization Trend Timeline</CardTitle>
                      <CardDescription>
                        Fleet average utilization over time
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border rounded-md p-1">
                        <Button
                          variant={dateRange === '3M' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setDateRange('3M')}
                        >
                          3M
                        </Button>
                        <Button
                          variant={dateRange === '6M' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setDateRange('6M')}
                        >
                          6M
                        </Button>
                        <Button
                          variant={dateRange === '12M' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setDateRange('12M')}
                        >
                          12M
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={utilizationTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{data.month}</p>
                                <p className="text-sm text-muted-foreground">
                                  Fleet Average: {data.fleetAverage.toFixed(1)}%
                                </p>
                                <div className="mt-2 text-xs space-y-1">
                                  <p className="text-green-600">✓ Balanced: {data.balancedCount}</p>
                                  <p className="text-orange-600">⚠ Over-utilized: {data.overUtilizedCount}</p>
                                  <p className="text-blue-600">↓ Under-utilized: {data.underUtilizedCount}</p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="fleetAverage"
                        stroke="#0037B1"
                        strokeWidth={3}
                        name="Fleet Average"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="mt-4 flex items-center justify-center gap-6 text-xs flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Optimal (60-80%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span>High (80-90%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>Over (&gt;90%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Under (&lt;60%)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Month Filter and Export Options */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Crew Workload Metrics Table</CardTitle>
                  <CardDescription>Comprehensive table view of all crew metrics - similar to Power BI view</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select defaultValue={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previousMonth">Previous Month</SelectItem>
                      <SelectItem value="currentMonth">Current Month</SelectItem>
                      <SelectItem value="nextMonth">Next Month</SelectItem>
                      <SelectItem value="twoMonthsOut">Two Months Out</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export to CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Comprehensive Metrics Table */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>All Crew Metrics</CardTitle>
              <CardDescription>
                {crewMembers.filter(c => !c.excludeFromMetrics).length} active crew members
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[180px] border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">Crew Member</th>
                      <th className="p-3 text-left font-medium min-w-[120px]">Position</th>

                      {/* Flight-related metrics */}
                      <th className="p-3 text-center font-medium bg-blue-50 min-w-[100px]">Flight Days</th>
                      <th className="p-3 text-center font-medium bg-blue-50 min-w-[100px]">RON Days</th>
                      <th className="p-3 text-center font-medium bg-blue-50 min-w-[110px]">Position Days</th>
                      <th className="p-3 text-center font-medium bg-blue-50 min-w-[120px]">Weekend Days</th>
                      <th className="p-3 text-center font-medium bg-blue-50 min-w-[100px]">Trip Days</th>

                      {/* Duty-related metrics */}
                      <th className="p-3 text-center font-medium bg-purple-50 min-w-[120px]">Standby Days</th>
                      <th className="p-3 text-center font-medium bg-purple-50 min-w-[100px]">Misc Duty</th>
                      <th className="p-3 text-center font-medium bg-purple-50 min-w-[120px]">Training Days</th>
                      <th className="p-3 text-center font-medium bg-purple-50 min-w-[130px]">Other Duty Days</th>
                      <th className="p-3 text-center font-medium bg-purple-100 min-w-[130px]">Total Duty Days</th>

                      {/* STOP-related metrics */}
                      <th className="p-3 text-center font-medium bg-orange-50 min-w-[130px]">STOP Scheduled</th>
                      <th className="p-3 text-center font-medium bg-orange-50 min-w-[150px]">STOP Worked Days</th>
                      <th className="p-3 text-center font-medium bg-orange-50 min-w-[150px]">Payback STOP Days</th>

                      {/* Rest-related metrics */}
                      <th className="p-3 text-center font-medium bg-green-50 min-w-[100px]">Vacation</th>
                      <th className="p-3 text-center font-medium bg-green-50 min-w-[100px]">Misc OFF</th>
                      <th className="p-3 text-center font-medium bg-green-100 min-w-[130px]">Total Rest Days</th>

                      {/* Availability */}
                      <th className="p-3 text-center font-medium bg-yellow-50 min-w-[160px]">Unscheduled Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crewMembers.filter(c => !c.excludeFromMetrics).map((crew, index) => {
                      const monthData = crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut'];
                      return (
                        <tr key={crew.id} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                          <td className={`p-3 font-medium sticky left-0 z-10 border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>{crew.name}</td>
                          <td className="p-3">
                            <Badge variant="outline">{crew.position}</Badge>
                          </td>

                          {/* Flight-related metrics */}
                          <td className="p-3 text-center bg-blue-50/30">{monthData.flightDays}</td>
                          <td className="p-3 text-center bg-blue-50/30">{monthData.ronDays}</td>
                          <td className="p-3 text-center bg-blue-50/30">{monthData.positionDays}</td>
                          <td className="p-3 text-center bg-blue-50/30">{monthData.weekendDays}</td>
                          <td className="p-3 text-center bg-blue-50/30">{monthData.tripDays}</td>

                          {/* Duty-related metrics */}
                          <td className="p-3 text-center bg-purple-50/30">{monthData.standbyDays}</td>
                          <td className="p-3 text-center bg-purple-50/30">{monthData.miscDuty}</td>
                          <td className="p-3 text-center bg-purple-50/30">{monthData.trainingDays}</td>
                          <td className="p-3 text-center bg-purple-50/30">{monthData.otherDutyDays}</td>
                          <td className="p-3 text-center bg-purple-100/50 font-semibold">{monthData.totalDutyDays}</td>

                          {/* STOP-related metrics */}
                          <td className="p-3 text-center bg-orange-50/30">{monthData.stopScheduled}</td>
                          <td className="p-3 text-center bg-orange-50/30">{monthData.stopWorkedDays}</td>
                          <td className="p-3 text-center bg-orange-50/30">{monthData.paybackStopDays}</td>

                          {/* Rest-related metrics */}
                          <td className="p-3 text-center bg-green-50/30">{monthData.vacationDays}</td>
                          <td className="p-3 text-center bg-green-50/30">{monthData.miscOffDays}</td>
                          <td className="p-3 text-center bg-green-100/50 font-semibold">{monthData.totalRestDays}</td>

                          {/* Availability */}
                          <td className="p-3 text-center bg-yellow-50/30 font-semibold">{monthData.unscheduledAvailable}</td>
                        </tr>
                      );
                    })}

                    {/* Totals Row */}
                    <tr className="border-t-2 bg-muted font-semibold">
                      <td className="p-3 sticky left-0 bg-muted z-10 border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">TOTALS</td>
                      <td className="p-3"></td>

                      {/* Flight-related totals */}
                      <td className="p-3 text-center bg-blue-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.flightDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-blue-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.ronDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-blue-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.positionDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-blue-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.weekendDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-blue-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.tripDays || 0), 0)}
                      </td>

                      {/* Duty-related totals */}
                      <td className="p-3 text-center bg-purple-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.standbyDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-purple-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.miscDuty || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-purple-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.trainingDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-purple-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.otherDutyDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-purple-200">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.totalDutyDays || 0), 0)}
                      </td>

                      {/* STOP-related totals */}
                      <td className="p-3 text-center bg-orange-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.stopScheduled || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-orange-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.stopWorkedDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-orange-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.paybackStopDays || 0), 0)}
                      </td>

                      {/* Rest-related totals */}
                      <td className="p-3 text-center bg-green-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.vacationDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-green-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.miscOffDays || 0), 0)}
                      </td>
                      <td className="p-3 text-center bg-green-200">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.totalRestDays || 0), 0)}
                      </td>

                      {/* Availability total */}
                      <td className="p-3 text-center bg-yellow-100">
                        {crewMembers.filter(c => !c.excludeFromMetrics).reduce((sum, crew) => sum + (crew[selectedTimeframe as 'previousMonth' | 'currentMonth' | 'nextMonth' | 'twoMonthsOut']?.unscheduledAvailable || 0), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* STOP Schedule Details */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>STOP Schedule Details</CardTitle>
              <CardDescription>Individual crew STOP assignments and payback status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[180px] border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]">Crew Member</th>
                      <th className="p-3 text-left font-medium">STOP Type</th>
                      <th className="p-3 text-center font-medium">Current Cycle</th>
                      <th className="p-3 text-left font-medium">Next STOP-1 Weekend</th>
                      <th className="p-3 text-left font-medium">Next Full Week Off</th>
                      <th className="p-3 text-center font-medium">Payback Accumulated</th>
                      <th className="p-3 text-center font-medium">Payback Used</th>
                      <th className="p-3 text-center font-medium">Pending Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crewMembers.filter(c => !c.excludeFromMetrics).map((crew, index) => (
                      <tr key={crew.id} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                        <td className={`p-3 font-medium sticky left-0 z-10 border-r-2 border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>{crew.name}</td>
                        <td className="p-3">
                          <Badge variant={crew.stopSchedule.stopType === 'STOP-1' ? 'default' : 'outline'}>
                            {crew.stopSchedule.stopType}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">Week {crew.stopSchedule.currentCycle} of 8</td>
                        <td className="p-3">{new Date(crew.stopSchedule.nextStop1Date).toLocaleDateString()}</td>
                        <td className="p-3">{new Date(crew.stopSchedule.nextFullWeekOff).toLocaleDateString()}</td>
                        <td className="p-3 text-center font-semibold">{crew.stopSchedule.paybackStopAccumulated} days</td>
                        <td className="p-3 text-center">{crew.stopSchedule.paybackStopUsed} days</td>
                        <td className="p-3 text-center text-orange-600 font-semibold">{crew.stopSchedule.paybackStopPending} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Crew Tab */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Crew Member Management</CardTitle>
                  <CardDescription>
                    Manage crew member inclusion in workload calculations. Crew members are automatically imported from MyAirOps.
                  </CardDescription>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium">{crewMembers.filter(c => !c.excludeFromMetrics).length} Active</div>
                  <div className="text-xs">{crewMembers.filter(c => c.excludeFromMetrics).length} Excluded</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {crewMembers.filter(c => c.excludeFromMetrics).length > 0 && (
                <Alert className="mb-4 border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>{crewMembers.filter(c => c.excludeFromMetrics).length} crew member(s)</strong> are currently excluded from workload calculations and metrics.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">Name</th>
                      <th className="p-3 text-left font-medium">Position</th>
                      <th className="p-3 text-left font-medium">Base</th>
                      <th className="p-3 text-left font-medium">Status</th>
                      <th className="p-3 text-left font-medium">Current Trip Days</th>
                      <th className="p-3 text-center font-medium">Include in Metrics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crewMembers
                      .sort((a, b) => {
                        if (a.excludeFromMetrics !== b.excludeFromMetrics) {
                          return a.excludeFromMetrics ? 1 : -1;
                        }
                        return a.name.localeCompare(b.name);
                      })
                      .map((crew) => (
                        <tr
                          key={crew.id}
                          className={`border-b transition-colors hover:bg-muted/50 ${crew.excludeFromMetrics ? 'bg-muted/30 opacity-60' : ''
                            }`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{crew.name}</div>
                              {crew.excludeFromMetrics && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  Excluded
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm">{crew.position}</td>
                          <td className="p-3 text-sm">{crew.base}</td>
                          <td className="p-3">
                            <Badge
                              variant={
                                crew.status === 'active' ? 'default' :
                                  crew.status === 'on-leave' ? 'secondary' :
                                    'outline'
                              }
                              className="text-xs"
                            >
                              {crew.status.charAt(0).toUpperCase() + crew.status.slice(1).replace('-', ' ')}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{crew.currentMonth?.tripDays || 0}</span>
                              <span className="text-muted-foreground">days</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center">
                              <Button
                                variant={crew.excludeFromMetrics ? "outline" : "default"}
                                size="sm"
                                onClick={() => toggleCrewExclusion(crew.id)}
                                className="w-32"
                              >
                                {crew.excludeFromMetrics ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Excluded
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Included
                                  </>
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  About Crew Management
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                  <li>Crew members are automatically imported from MyAirOps</li>
                  <li>Excluded crew members are not included in workload calculations, averages, or utilization metrics</li>
                  <li>Use this when crew members go on extended leave, medical leave, or are temporarily unavailable</li>
                  <li>Excluded crew data is still visible for reference but won't affect fleet metrics</li>
                  <li>Toggle crew members back to "Included" when they return to active duty</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>



      {/* Metrics Configuration Dialog */}
      <Dialog open={showMetricsConfig} onOpenChange={setShowMetricsConfig}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workload Metrics Configuration</DialogTitle>
            <DialogDescription>
              Customize how workload scores are calculated using day-based weights
            </DialogDescription>
          </DialogHeader>

          {!currentMetricConfig ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading configuration...
            </div>
          ) : (
            <div className="space-y-6">
              <Tabs defaultValue="current" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="current">Current Configuration</TabsTrigger>
                  <TabsTrigger value="presets">Quick Presets</TabsTrigger>
                  <TabsTrigger value="custom">Add Custom Metric</TabsTrigger>
                  <TabsTrigger value="manage">Manage Configurations</TabsTrigger>
                </TabsList>

                <TabsContent value="current" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Current Configuration: {currentMetricConfig.name}</Label>
                      <p className="text-sm text-muted-foreground">{currentMetricConfig.description}</p>
                    </div>

                    {currentMetricConfig.metrics.map((metric) => (
                      <Card key={metric.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Switch
                              checked={metric.enabled}
                              onCheckedChange={() => toggleMetric(metric.id)}
                            />
                            <div>
                              <Label className="text-base">{metric.name}</Label>
                              <p className="text-sm text-muted-foreground">{metric.description}</p>
                            </div>
                          </div>
                          {metric.category === 'custom' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeCustomMetric(metric.id)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {metric.enabled && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm">Weight: {metric.weight} days</Label>
                              <Slider
                                value={[metric.weight]}
                                onValueChange={([value]: number[]) => handleMetricWeightChange(metric.id, value)}
                                max={20}
                                min={1}
                                step={1}
                                className="mt-2"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>1 day</span>
                                <span>20 days</span>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Max value: {metric.maxValue} {metric.unit} | Category: {metric.category}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={resetToDefaults}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                    <Button onClick={saveConfiguration}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="presets" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-4 cursor-pointer hover:bg-muted/50" onClick={() => applyPresetConfiguration('balanced')}>
                      <h5 className="font-medium mb-2">Balanced Workload</h5>
                      <p className="text-sm text-muted-foreground">
                        Equal weight across all metrics for a balanced view of crew workload
                      </p>
                    </Card>

                    <Card className="p-4 cursor-pointer hover:bg-muted/50" onClick={() => applyPresetConfiguration('flight-focused')}>
                      <h5 className="font-medium mb-2">Flight-Focused</h5>
                      <p className="text-sm text-muted-foreground">
                        Prioritizes trip days and flight hours over other metrics
                      </p>
                    </Card>

                    <Card className="p-4 cursor-pointer hover:bg-muted/50" onClick={() => applyPresetConfiguration('fatigue-aware')}>
                      <h5 className="font-medium mb-2">Fatigue Management</h5>
                      <p className="text-sm text-muted-foreground">
                        Emphasizes RON days and consecutive duty for fatigue prevention
                      </p>
                    </Card>

                    <Card className="p-4 cursor-pointer hover:bg-muted/50" onClick={() => applyPresetConfiguration('utilization')}>
                      <h5 className="font-medium mb-2">Utilization Optimization</h5>
                      <p className="text-sm text-muted-foreground">
                        Focuses on maximizing crew utilization and minimizing standby
                      </p>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                  <Card className="p-4">
                    <h5 className="font-medium mb-4">Add Custom Metric</h5>
                    <div className="space-y-4">
                      <div>
                        <Label>Metric Name</Label>
                        <Input
                          value={newCustomMetric.name}
                          onChange={(e) => setNewCustomMetric({ ...newCustomMetric, name: e.target.value })}
                          placeholder="e.g., International Trips"
                        />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newCustomMetric.description}
                          onChange={(e) => setNewCustomMetric({ ...newCustomMetric, description: e.target.value })}
                          placeholder="Describe what this metric measures..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Weight (days)</Label>
                          <Input
                            type="number"
                            value={newCustomMetric.weight}
                            onChange={(e) => setNewCustomMetric({ ...newCustomMetric, weight: parseInt(e.target.value) || 5 })}
                            min={1}
                            max={20}
                          />
                        </div>

                        <div>
                          <Label>Unit</Label>
                          <Input
                            value={newCustomMetric.unit}
                            onChange={(e) => setNewCustomMetric({ ...newCustomMetric, unit: e.target.value })}
                            placeholder="e.g., days, hours"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Maximum Value</Label>
                        <Input
                          type="number"
                          value={newCustomMetric.maxValue}
                          onChange={(e) => setNewCustomMetric({ ...newCustomMetric, maxValue: parseInt(e.target.value) || 100 })}
                          placeholder="Maximum expected value for normalization"
                        />
                      </div>

                      <Button onClick={addCustomMetric} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Custom Metric
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="manage" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-medium">Saved Configurations</h5>
                    <div className="space-x-2">
                      <Button variant="outline" onClick={resetToDefaults}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {savedConfigurations.map((config) => (
                      <Card key={config.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{config.name}</h5>
                            <p className="text-sm text-muted-foreground">{config.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created: {new Date(config.createdAt).toLocaleDateString()}
                              {config.modifiedAt !== config.createdAt && (
                                <> • Modified: {new Date(config.modifiedAt).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                          <div className="space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadConfiguration(config)}
                              disabled={config.id === currentMetricConfig?.id}
                            >
                              {config.id === currentMetricConfig?.id ? 'Current' : 'Load'}
                            </Button>
                            {!config.isDefault && (
                              <Button variant="destructive" size="sm">
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Balance Recommendations Dialog */}
      <Dialog open={showBalanceRecommendations} onOpenChange={setShowBalanceRecommendations}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workload Balance Recommendations</DialogTitle>
            <DialogDescription>
              AI-powered recommendations to optimize crew workload distribution
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>High Priority:</strong> 3 crew members are showing critical workload scores above 85.
                Consider redistributing upcoming assignments.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">Recommended Actions:</h4>
              <ul className="space-y-2 text-sm">
                <li>• Move James Rodriguez from 3 upcoming trips to reduce workload by 15 points</li>
                <li>• Increase Sarah Johnson's RON coverage to utilize her lower current workload</li>
                <li>• Schedule additional standby crew for high-demand periods next month</li>
                <li>• Consider cross-training crew on G550 to increase scheduling flexibility</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Projected Impact</h4>
              <p className="text-sm text-muted-foreground">
                Implementing these recommendations would reduce average workload by 8.3 points
                and eliminate all critical alerts for next month.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div >
  );
}