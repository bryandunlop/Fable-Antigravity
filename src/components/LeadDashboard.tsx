import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Plane,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  MessageSquare,
  Target,
  Calendar,
  Fuel,
  Wrench,
  Shield,
  DollarSign,
  Coffee,
  Building2,
  Star,
  Globe,
  FileText,
  Activity,
  Zap,
  MapPin,
  PhoneCall,
  Mail,
  AlertCircle,
  User,
  Car,
  Info,
  Download,
  Filter,
  Search,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  Eye,
  Navigation,
  Edit,
  Settings,
  GripVertical,
  RotateCcw,
  Layout
} from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MaintenanceTile } from './dashboard/MaintenanceTile';
import { FuelTile } from './dashboard/FuelTile';
import { NASTile } from './dashboard/NASTile';
import { CrewTile } from './dashboard/CrewTile';
import { PerformanceTile } from './dashboard/PerformanceTile';
import { AlertsTile } from './dashboard/AlertsTile';

// Draggable Tile Component
interface DraggableTileProps {
  id: string;
  index: number;
  children: React.ReactNode;
  moveTile: (dragIndex: number, hoverIndex: number) => void;
  isCustomizeMode: boolean;
}

const DraggableTile: React.FC<DraggableTileProps> = ({ id, index, children, moveTile, isCustomizeMode }) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<
    { index: number; id: string },
    unknown,
    { handlerId: string | symbol | null }
  >({
    accept: 'tile',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveTile(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'tile',
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isCustomizeMode,
  });

  const opacity = isDragging ? 0.4 : 1;
  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity }}
      data-handler-id={handlerId as string}
      className={`relative ${isCustomizeMode ? 'cursor-move' : ''}`}
    >
      {isCustomizeMode && (
        <div className="absolute -top-2 -left-2 z-10 bg-primary text-white rounded-full p-1 shadow-lg">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      {children}
    </div>
  );
};

export default function LeadDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [highlightedPassengers, setHighlightedPassengers] = useState<string[]>(['PAX001', 'PAX003', 'PAX007']);
  const [selectedPassengerForDetails, setSelectedPassengerForDetails] = useState<any>(null);
  const [showPassengerDetailsDialog, setShowPassengerDetailsDialog] = useState(false);
  const [showFinancialInputDialog, setShowFinancialInputDialog] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);

  // Default tile order
  const defaultTileOrder = [
    'maintenance',
    'fuel',
    'nas',
    'crew',
    'performance',
    'alerts'
  ];

  // Load tile order from localStorage or use default
  const [tileOrder, setTileOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leadDashboardTileOrder');
      return saved ? JSON.parse(saved) : defaultTileOrder;
    }
    return defaultTileOrder;
  });

  // Save tile order to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('leadDashboardTileOrder', JSON.stringify(tileOrder));
    }
  }, [tileOrder]);

  // Executive KPIs - High-level metrics
  const executiveKPIs = [
    {
      title: 'Revenue This Month',
      value: '$2.4M',
      change: '+12.3%',
      trend: 'up',
      target: '$2.8M',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'On-Time Performance',
      value: '94.2%',
      change: '+2.1%',
      trend: 'up',
      target: '95%',
      icon: CheckCircle,
      color: 'text-blue-600'
    },
    {
      title: 'Fleet Utilization',
      value: '87.5%',
      change: '-1.3%',
      trend: 'down',
      target: '90%',
      icon: Activity,
      color: 'text-orange-600'
    },
    {
      title: 'Safety Score',
      value: '9.7/10',
      change: '+0.2',
      trend: 'up',
      target: '9.8/10',
      icon: Shield,
      color: 'text-green-600'
    },
    {
      title: 'Customer Satisfaction',
      value: '4.8/5',
      change: '+0.3',
      trend: 'up',
      target: '4.9/5',
      icon: Star,
      color: 'text-yellow-600'
    },
    {
      title: 'Operational Efficiency',
      value: '92.1%',
      change: '+4.2%',
      trend: 'up',
      target: '95%',
      icon: Zap,
      color: 'text-purple-600'
    }
  ];

  // Fleet Status Summary
  const fleetStatus = {
    totalAircraft: 12,
    available: 10,
    inMaintenance: 2,
    utilization: 87.5,
    averageAge: 8.2,
    nextMaintenance: '3 days',
    fleetHours: {
      thisMonth: 1247,
      lastMonth: 1156,
      yearToDate: 14582
    }
  };

  // Operational Metrics
  const operationalMetrics = {
    flights: {
      scheduled: 68,
      completed: 61,
      cancelled: 2,
      delayed: 5,
      completionRate: 89.7
    },
    maintenance: {
      scheduled: 8,
      completed: 6,
      overdue: 1,
      critical: 1,
      complianceRate: 98.2
    },
    fuel: {
      consumed: 42500, // gallons
      cost: 187250, // dollars
      efficiency: 6.2, // gallons per hour
      farmLevel: 8550,
      farmCapacity: 10000
    },
    crew: {
      totalCrew: 45,
      available: 42,
      onVacation: 3,
      training: 2,
      availabilityRate: 93.3
    }
  };

  // Financial Overview
  const [financialData, setFinancialData] = useState({
    revenue: {
      thisMonth: 2400000,
      lastMonth: 2150000,
      yearToDate: 28500000,
      target: 32000000
    },
    expenses: {
      fuel: 187250,
      maintenance: 145000,
      crew: 320000,
      insurance: 85000,
      other: 120000
    },
    profitMargin: 28.5,
    costPerFlightHour: 2850
  });

  // Temp state for financial input form
  const [financialFormData, setFinancialFormData] = useState({
    revenueThisMonth: '2400000',
    revenueLastMonth: '2150000',
    revenueYearToDate: '28500000',
    revenueTarget: '32000000',
    expenseFuel: '187250',
    expenseMaintenance: '145000',
    expenseCrew: '320000',
    expenseInsurance: '85000',
    expenseOther: '120000',
    profitMargin: '28.5',
    costPerFlightHour: '2850'
  });

  // Live Operations Data - Simulated real-time data
  const [liveOpsData, setLiveOpsData] = useState({
    activeFlights: {
      inAir: 3,
      departing: 2,
      arriving: 1,
      flights: [
        { id: 'FLT001', tail: 'N1PG', route: 'KTEB → KMIA', status: 'In Air', eta: '45 min', altitude: 41000, speed: 485, passengers: 8 },
        { id: 'FLT002', tail: 'N5PG', route: 'KJFK → EGLL', status: 'In Air', eta: '5h 20m', altitude: 43000, speed: 520, passengers: 11 },
        { id: 'FLT003', tail: 'N2PG', route: 'KLAS → KSFO', status: 'In Air', eta: '1h 10m', altitude: 39000, speed: 465, passengers: 12 }
      ]
    },
    maintenance: {
      workOrdersActive: 4,
      techsOnDuty: 8,
      aogAircraft: 1,
      criticalSquawks: 2,
      activeWorkOrders: [
        { id: 'WO-2025-089', aircraft: 'N2PG', type: 'Engine Inspection', technician: 'Mike Johnson', progress: 65, priority: 'critical' },
        { id: 'WO-2025-090', aircraft: 'N1PG', type: '100hr Inspection', technician: 'Sarah Williams', progress: 40, priority: 'high' },
        { id: 'WO-2025-091', aircraft: 'N5PG', type: 'APU Service', technician: 'Tom Anderson', progress: 80, priority: 'medium' },
        { id: 'WO-2025-092', aircraft: 'N6PG', type: 'Avionics Update', technician: 'David Brown', progress: 25, priority: 'low' }
      ]
    },
    fuelFarm: {
      currentLevel: 8550,
      capacity: 10000,
      consumption24h: 4250,
      consumptionRate: 177, // gallons per hour
      timeToReplenish: 8.2, // hours
      trend: 'decreasing'
    },
    nasStatus: {
      activeDelays: 3,
      weatherAlerts: 2,
      tfrs: 1,
      affectedFlights: 2,
      alerts: [
        { airport: 'KJFK', type: 'GDP', severity: 'medium', delay: '45 min', impact: 'FLT002 departure delayed' },
        { airport: 'KMIA', type: 'Weather', severity: 'low', delay: '15 min', impact: 'Thunderstorms clearing' },
        { airport: 'EGLL', type: 'Capacity', severity: 'medium', delay: '30 min', impact: 'High traffic volume' }
      ]
    },
    crew: {
      onDuty: 12,
      available: 8,
      onRest: 15,
      comingOffRest: 4,
      dutyTimeWarnings: 2
    },
    recentAlerts: [
      { id: 'ALT001', time: '2 min ago', type: 'maintenance', severity: 'critical', message: 'N2PG - Engine inspection overdue', action: 'Schedule now' },
      { id: 'ALT002', time: '15 min ago', type: 'weather', severity: 'medium', message: 'KMIA - Thunderstorms approaching', action: 'Monitor' },
      { id: 'ALT003', time: '28 min ago', type: 'fuel', severity: 'medium', message: 'Fuel farm below 90% capacity', action: 'Schedule delivery' },
      { id: 'ALT004', time: '45 min ago', type: 'crew', severity: 'low', message: 'Crew member duty time at 80%', action: 'Plan relief' }
    ],
    todayPerformance: {
      flightsScheduled: 8,
      flightsCompleted: 5,
      onTimeRate: 100,
      currentPassengers: 14,
      completionRate: 62.5
    }
  });

  // Auto-refresh live data
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
      // Simulate data updates with small variations
      setLiveOpsData(prev => ({
        ...prev,
        fuelFarm: {
          ...prev.fuelFarm,
          currentLevel: prev.fuelFarm.currentLevel - Math.floor(Math.random() * 50),
          consumptionRate: 177 + Math.floor(Math.random() * 20) - 10
        },
        todayPerformance: {
          ...prev.todayPerformance,
          flightsCompleted: prev.todayPerformance.flightsCompleted + (Math.random() > 0.7 ? 1 : 0)
        }
      }));
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled]);

  // Move tile function
  const moveTile = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...tileOrder];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    setTileOrder(newOrder);
  };

  // Reset to default layout
  const resetLayout = () => {
    setTileOrder(defaultTileOrder);
    toast.success('Dashboard layout reset to default');
  };

  // Safety & Compliance
  const safetyMetrics = {
    incidents: {
      total: 3,
      resolved: 2,
      pending: 1,
      severity: { low: 2, medium: 1, high: 0 }
    },
    compliance: {
      documents: { current: 142, expiring: 8, overdue: 2 },
      training: { current: 89, expiring: 6, overdue: 1 },
      audits: { passed: 12, pending: 2, failed: 0 }
    },
    certificates: {
      pilot: { current: 24, expiring: 3 },
      aircraft: { current: 12, expiring: 1 },
      maintenance: { current: 8, expiring: 2 }
    }
  };

  // Service Quality Metrics
  const serviceQuality = {
    airports: {
      reviewed: 15,
      current: 12,
      dueSoon: 2,
      overdue: 1,
      averageRating: 4.3
    },
    catering: {
      orders: 45,
      satisfied: 42,
      complaints: 1,
      satisfactionRate: 95.6
    },
    passenger: {
      totalPassengers: 186,
      vipServices: 23,
      specialRequests: 8,
      satisfactionScore: 4.8
    }
  };

  // Critical Alerts
  const criticalAlerts = [
    {
      id: 'ALERT001',
      type: 'maintenance',
      severity: 'critical',
      title: 'N2PG - Engine inspection overdue',
      description: 'Aircraft grounded until inspection complete',
      timeAgo: '2 hours ago',
      actionRequired: 'Schedule inspection immediately'
    },
    {
      id: 'ALERT002',
      type: 'safety',
      severity: 'high',
      title: 'Airport EGLL - Service review overdue',
      description: 'Upcoming flight scheduled, review needed',
      timeAgo: '4 hours ago',
      actionRequired: 'Update service evaluation'
    },
    {
      id: 'ALERT003',
      type: 'fuel',
      severity: 'medium',
      title: 'Fuel farm level at 85%',
      description: 'Consider scheduling replenishment',
      timeAgo: '6 hours ago',
      actionRequired: 'Schedule fuel delivery'
    },
    {
      id: 'ALERT004',
      type: 'compliance',
      severity: 'high',
      title: '3 pilot certificates expiring this month',
      description: 'Renewal required for continued operations',
      timeAgo: '1 day ago',
      actionRequired: 'Process renewals'
    }
  ];

  // Upcoming Events
  const upcomingEvents = [
    {
      date: '2025-02-06',
      time: '08:00',
      type: 'flight',
      title: 'FLT001 - KTEB to KJFK',
      aircraft: 'N1PG',
      priority: 'high'
    },
    {
      date: '2025-02-06',
      time: '14:30',
      type: 'maintenance',
      title: '100-hour inspection - N5PG',
      technician: 'Mike Johnson',
      priority: 'critical'
    },
    {
      date: '2025-02-07',
      time: '10:00',
      type: 'training',
      title: 'Recurrent training - Crew B',
      instructor: 'Sarah Wilson',
      priority: 'medium'
    },
    {
      date: '2025-02-08',
      time: '16:00',
      type: 'audit',
      title: 'Safety audit - Maintenance operations',
      auditor: 'FAA Inspector',
      priority: 'high'
    }
  ];

  // VIP Passengers Database
  const vipPassengers = [
    {
      id: 'PAX001',
      name: 'Robert Johnson',
      classification: { category: 'BOD', notes: 'Board Chairman' },
      email: 'robert.johnson@email.com',
      phone: '+1 (555) 123-4567'
    },
    {
      id: 'PAX003',
      name: 'Michael Chen',
      classification: { category: 'C-Suite', role: 'CEO' },
      email: 'michael.chen@email.com',
      phone: '+1 (555) 234-5678'
    },
    {
      id: 'PAX007',
      name: 'Jennifer Martinez',
      classification: { category: 'C-Suite', role: 'CFO' },
      email: 'jennifer.martinez@email.com',
      phone: '+1 (555) 345-6789'
    },
    {
      id: 'PAX012',
      name: 'David Thompson',
      classification: { category: 'BOD', notes: 'Board Member' },
      email: 'david.thompson@email.com',
      phone: '+1 (555) 456-7890'
    }
  ];

  // Passenger Flight Tracking
  const passengerFlights = [
    {
      flightId: 'FLT001',
      date: '2025-02-08',
      time: '14:00',
      route: 'KTEB → KMIA',
      aircraft: 'N1PG (G650)',
      status: 'Scheduled',
      passengers: ['PAX001', 'PAX003'],
      duration: '2h 45m',
      departure: { airport: 'KTEB', city: 'Teterboro, NJ', terminal: 'Atlantic Aviation' },
      arrival: { airport: 'KMIA', city: 'Miami, FL', terminal: 'Signature Flight Support' },
      crew: { captain: 'John Smith', firstOfficer: 'Sarah Wilson', flightAttendant: 'Emily Davis' },
      catering: 'Ordered - Light lunch service',
      notes: 'VIP PAX001 - Board Chairman'
    },
    {
      flightId: 'FLT003',
      date: '2025-02-10',
      time: '09:30',
      route: 'KJFK → EGLL',
      aircraft: 'N5PG (G500)',
      status: 'Confirmed',
      passengers: ['PAX007'],
      duration: '7h 15m',
      departure: { airport: 'KJFK', city: 'New York, NY', terminal: 'Jet Aviation' },
      arrival: { airport: 'EGLL', city: 'London, UK', terminal: 'Signature Flight Support' },
      crew: { captain: 'Mike Johnson', firstOfficer: 'Tom Anderson', flightAttendant: 'Lisa Martinez' },
      catering: 'Ordered - Mediterranean menu',
      notes: 'PAX007 - CFO'
    },
    {
      flightId: 'FLT005',
      date: '2025-02-12',
      time: '16:45',
      route: 'KLAS → KSFO',
      aircraft: 'N2PG (G650)',
      status: 'Tentative',
      passengers: ['PAX001', 'PAX012'],
      duration: '1h 30m',
      departure: { airport: 'KLAS', city: 'Las Vegas, NV', terminal: 'Atlantic Aviation' },
      arrival: { airport: 'KSFO', city: 'San Francisco, CA', terminal: 'Signature Flight Support' },
      crew: { captain: 'David Brown', firstOfficer: 'Emily Johnson', flightAttendant: 'Mark Roberts' },
      catering: 'Pending order',
      notes: 'Board members trip'
    },
    {
      flightId: 'FLT007',
      date: '2025-02-15',
      time: '11:00',
      route: 'KMIA → KTEB',
      aircraft: 'N1PG (G650)',
      status: 'Scheduled',
      passengers: ['PAX003'],
      duration: '2h 50m',
      departure: { airport: 'KMIA', city: 'Miami, FL', terminal: 'Signature Flight Support' },
      arrival: { airport: 'KTEB', city: 'Teterboro, NJ', terminal: 'Atlantic Aviation' },
      crew: { captain: 'John Smith', firstOfficer: 'Sarah Wilson', flightAttendant: 'Emily Davis' },
      catering: 'Ordered - Asian vegetarian',
      notes: 'CEO return flight'
    }
  ];

  // Performance Trends (last 12 months)
  const performanceTrends = {
    onTimePerformance: [88, 91, 89, 92, 90, 94, 93, 95, 92, 94, 96, 94],
    fleetUtilization: [82, 85, 88, 87, 89, 85, 90, 88, 87, 89, 86, 88],
    safetyScore: [9.2, 9.4, 9.3, 9.5, 9.6, 9.4, 9.7, 9.5, 9.6, 9.8, 9.7, 9.7],
    customerSatisfaction: [4.2, 4.4, 4.3, 4.5, 4.4, 4.6, 4.7, 4.5, 4.6, 4.7, 4.8, 4.8]
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <Wrench className="w-4 h-4" />;
      case 'safety': return <Shield className="w-4 h-4" />;
      case 'fuel': return <Fuel className="w-4 h-4" />;
      case 'compliance': return <FileText className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Financial data handlers
  const handleOpenFinancialInput = () => {
    // Pre-populate form with current values
    setFinancialFormData({
      revenueThisMonth: String(financialData.revenue.thisMonth),
      revenueLastMonth: String(financialData.revenue.lastMonth),
      revenueYearToDate: String(financialData.revenue.yearToDate),
      revenueTarget: String(financialData.revenue.target),
      expenseFuel: String(financialData.expenses.fuel),
      expenseMaintenance: String(financialData.expenses.maintenance),
      expenseCrew: String(financialData.expenses.crew),
      expenseInsurance: String(financialData.expenses.insurance),
      expenseOther: String(financialData.expenses.other),
      profitMargin: String(financialData.profitMargin),
      costPerFlightHour: String(financialData.costPerFlightHour)
    });
    setShowFinancialInputDialog(true);
  };

  const handleSaveFinancialData = () => {
    // Parse and update financial data
    setFinancialData({
      revenue: {
        thisMonth: parseFloat(financialFormData.revenueThisMonth) || 0,
        lastMonth: parseFloat(financialFormData.revenueLastMonth) || 0,
        yearToDate: parseFloat(financialFormData.revenueYearToDate) || 0,
        target: parseFloat(financialFormData.revenueTarget) || 0
      },
      expenses: {
        fuel: parseFloat(financialFormData.expenseFuel) || 0,
        maintenance: parseFloat(financialFormData.expenseMaintenance) || 0,
        crew: parseFloat(financialFormData.expenseCrew) || 0,
        insurance: parseFloat(financialFormData.expenseInsurance) || 0,
        other: parseFloat(financialFormData.expenseOther) || 0
      },
      profitMargin: parseFloat(financialFormData.profitMargin) || 0,
      costPerFlightHour: parseFloat(financialFormData.costPerFlightHour) || 0
    });

    setShowFinancialInputDialog(false);
    toast.success('Financial data updated successfully');
  };

  // Passenger tracking helpers
  const toggleHighlightPassenger = (passengerId: string) => {
    setHighlightedPassengers(prev =>
      prev.includes(passengerId)
        ? prev.filter(id => id !== passengerId)
        : [...prev, passengerId]
    );
    toast.success(
      highlightedPassengers.includes(passengerId)
        ? 'Passenger removed from tracking'
        : 'Passenger added to tracking'
    );
  };

  const getPassengerFlights = (passengerId: string) => {
    return passengerFlights.filter(flight => flight.passengers.includes(passengerId));
  };

  const getHighlightedPassengersWithFlights = () => {
    return highlightedPassengers.map(passengerId => {
      const passenger = vipPassengers.find(p => p.id === passengerId);
      const flights = getPassengerFlights(passengerId);
      return { passenger, flights };
    }).filter(item => item.passenger);
  };

  const getFlightStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'tentative': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get tile by ID
  const getTileById = (id: string) => {
    switch (id) {
      case 'maintenance': return <MaintenanceTile data={liveOpsData.maintenance} />;
      case 'fuel': return <FuelTile data={liveOpsData.fuelFarm} />;
      case 'nas': return <NASTile data={liveOpsData.nasStatus} />;
      case 'crew': return <CrewTile data={liveOpsData.crew} />;
      case 'performance': return <PerformanceTile data={liveOpsData.todayPerformance} />;
      case 'alerts': return <AlertsTile alerts={liveOpsData.recentAlerts} />;
      default: return null;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1>Executive Dashboard</h1>
            <p className="text-muted-foreground">Comprehensive operations overview and key performance indicators</p>
          </div>

          <div className="flex gap-2 mt-4 lg:mt-0">
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setIsAutoRefreshEnabled(!isAutoRefreshEnabled);
                toast.success(isAutoRefreshEnabled ? 'Auto-refresh disabled' : 'Auto-refresh enabled');
              }}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isAutoRefreshEnabled ? 'animate-spin' : ''}`} />
              {isAutoRefreshEnabled ? 'Live' : 'Paused'}
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Live Operations Center */}
        <div className="mb-6 space-y-4">
          {/* Live Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-5 h-5 text-primary" />
                {isAutoRefreshEnabled && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                )}
              </div>
              <div>
                <h2 className="flex items-center gap-2">
                  Live Operations Center
                  {isAutoRefreshEnabled && (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Live
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Last updated: {lastRefresh.toLocaleTimeString()} {isAutoRefreshEnabled && '• Auto-refresh: 30s'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLastRefresh(new Date())}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Now
              </Button>
              <Button
                variant={isCustomizeMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsCustomizeMode(!isCustomizeMode);
                  toast.success(isCustomizeMode ? 'Customize mode disabled' : 'Customize mode enabled - Drag tiles to reorder');
                }}
              >
                <Layout className="w-4 h-4 mr-2" />
                {isCustomizeMode ? 'Done' : 'Customize'}
              </Button>
              {isCustomizeMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetLayout}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Active Flights Section */}
          <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-blue-600" />
                  Active Flight Operations
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    <Navigation className="w-3 h-3 mr-1" />
                    {liveOpsData.activeFlights.inAir} In Air
                  </Badge>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {liveOpsData.activeFlights.departing} Departing
                  </Badge>
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    {liveOpsData.activeFlights.arriving} Arriving
                  </Badge>
                  {(() => {
                    const flights = liveOpsData.activeFlights.flights as any[];
                    let totalOpenSeats = 0;
                    let fullFlightsCount = 0;

                    flights.forEach(flight => {
                      const capacity = flight.tail.includes('G650') || flight.tail.includes('N1PG') || flight.tail.includes('N2PG') ? 12 : 11; // Basic mapping based on existing data
                      const open = Math.max(0, capacity - (flight.passengers || 0));
                      totalOpenSeats += open;
                      if (open === 0) fullFlightsCount++;
                    });

                    const percentFull = Math.round((fullFlightsCount / flights.length) * 100);
                    const avgOpen = (totalOpenSeats / flights.length).toFixed(1);

                    return (
                      <>
                        <Badge variant="outline" className="ml-2">
                          {percentFull}% Full
                        </Badge>
                        <Badge variant="outline">
                          Avg Open: {avgOpen}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {liveOpsData.activeFlights.flights.map((flight) => (
                  <div key={flight.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{flight.id}</p>
                        <p className="text-xs text-muted-foreground">{flight.tail}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        {flight.status}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{flight.route}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">ETA</p>
                        <p className="font-medium">{flight.eta}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Altitude</p>
                        <p className="font-medium">{flight.altitude.toLocaleString()} ft</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Speed</p>
                        <p className="font-medium">{flight.speed} kts</p>
                      </div>
                    </div>
                    {(() => {
                      const capacity = flight.tail.includes('G650') || flight.tail.includes('N1PG') || flight.tail.includes('N2PG') ? 12 : 11;
                      const open = Math.max(0, capacity - ((flight as any).passengers || 0));
                      return (
                        <div className="mt-2 text-xs text-center border-t pt-2">
                          <span className={open === 0 ? "font-bold text-red-600" : "text-green-600"}>
                            {open === 0 ? "Flight Full" : `${open} Open Seats`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tileOrder.slice(0, 4).map((tileId, index) => (
              <DraggableTile
                key={tileId}
                id={tileId}
                index={index}
                moveTile={moveTile}
                isCustomizeMode={isCustomizeMode}
              >
                {getTileById(tileId)}
              </DraggableTile>
            ))}
          </div>

          {/* Today's Performance & Recent Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tileOrder.slice(4, 6).map((tileId, index) => (
              <DraggableTile
                key={tileId}
                id={tileId}
                index={index + 4}
                moveTile={moveTile}
                isCustomizeMode={isCustomizeMode}
              >
                {getTileById(tileId)}
              </DraggableTile>
            ))}
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.filter(alert => alert.severity === 'critical').length > 0 && (
          <Alert className="mb-6 border-red-500 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Critical Alerts:</strong> {criticalAlerts.filter(alert => alert.severity === 'critical').length} items require immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Executive KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {executiveKPIs.map((kpi, index) => {
            const IconComponent = kpi.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-gray-50 ${kpi.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                      <TrendingUp className={`w-3 h-3 ${kpi.trend === 'down' ? 'transform rotate-180' : ''}`} />
                      {kpi.change}
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-bold mb-1">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.title}</p>
                    <p className="text-xs text-muted-foreground">Target: {kpi.target}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="vip-passengers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="vip-passengers">VIP Passengers</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="fleet">Fleet</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="safety">Safety</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* VIP Passengers Tab */}
          <TabsContent value="vip-passengers" className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Tracked Passengers</p>
                      <p className="text-2xl">{highlightedPassengers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Upcoming Flights</p>
                      <p className="text-2xl">
                        {passengerFlights.filter(f => highlightedPassengers.some(p => f.passengers.includes(p))).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total VIP Passengers</p>
                      <p className="text-2xl">{vipPassengers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Highlighted Passengers with Flight Tracking */}
            <div className="space-y-4">
              {getHighlightedPassengersWithFlights().map(({ passenger, flights }: any) => (
                <Card key={passenger.id} className="border-2 border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{passenger.name}</h3>
                            <Badge className="bg-primary text-primary-foreground">
                              {passenger.classification.category}
                              {passenger.classification.role && ` - ${passenger.classification.role}`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {passenger.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <PhoneCall className="w-3 h-3" />
                              {passenger.phone}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleHighlightPassenger(passenger.id)}
                      >
                        <BookmarkCheck className="w-4 h-4 mr-2 text-primary" />
                        Tracking
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Upcoming Flights */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Plane className="w-4 h-4 text-primary" />
                          Upcoming Flights ({flights.length})
                        </h4>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Flight
                        </Button>
                      </div>

                      {flights.length > 0 ? (
                        <div className="space-y-3">
                          {flights.map((flight: any) => (
                            <Card key={flight.flightId} className="border-l-4 border-l-primary">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-start gap-3">
                                    <Navigation className="w-5 h-5 text-primary mt-1" />
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-semibold">{flight.flightId}</h5>
                                        <Badge className={getFlightStatusColor(flight.status)}>
                                          {flight.status}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {flight.route} • {flight.aircraft}
                                      </p>
                                      {(() => {
                                        const getCapacity = (aircraft: string) => {
                                          if (aircraft.includes('G650')) return 12;
                                          if (aircraft.includes('G500')) return 11;
                                          return 12; // Default fallback
                                        };
                                        const capacity = getCapacity(flight.aircraft);
                                        const openSeats = capacity - flight.passengers.length;
                                        return (
                                          <Badge variant="outline" className={`mt-1 ${openSeats < 3 ? 'text-orange-600 border-orange-200 bg-orange-50' : 'text-green-600 border-green-200 bg-green-50'}`}>
                                            <Users className="w-3 h-3 mr-1" />
                                            {openSeats} Open Seat{openSeats !== 1 ? 's' : ''}
                                          </Badge>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    setSelectedPassengerForDetails({ passenger, flight });
                                    setShowPassengerDetailsDialog(true);
                                  }}>
                                    <Eye className="w-4 h-4 mr-1" />
                                    Details
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Date & Time</p>
                                    <p className="font-medium">
                                      {new Date(flight.date).toLocaleDateString()} {flight.time}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Duration</p>
                                    <p className="font-medium">{flight.duration}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Departure</p>
                                    <p className="font-medium">{flight.departure.city}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Arrival</p>
                                    <p className="font-medium">{flight.arrival.city}</p>
                                  </div>
                                </div>

                                {flight.notes && (
                                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                    <Info className="w-3 h-3 inline mr-1" />
                                    {flight.notes}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No upcoming flights scheduled</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {highlightedPassengers.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <BookmarkCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No Passengers Tracked</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add passengers to track their flights and preferences
                    </p>
                    <Button onClick={() => {
                      setHighlightedPassengers(['PAX001', 'PAX003', 'PAX007']);
                      toast.success('Sample passengers added to tracking');
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Sample Passengers
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* All VIP Passengers - Quick Add */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All VIP Passengers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Upcoming Flights</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vipPassengers.map((passenger) => {
                      const isTracked = highlightedPassengers.includes(passenger.id);
                      const passengerFlightCount = getPassengerFlights(passenger.id).length;

                      return (
                        <TableRow key={passenger.id} className={isTracked ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{passenger.name}</p>
                                <p className="text-xs text-muted-foreground">{passenger.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {passenger.classification.category}
                              {passenger.classification.role && ` - ${passenger.classification.role}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span className="text-muted-foreground truncate max-w-32">{passenger.email}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <PhoneCall className="w-3 h-3" />
                                <span className="text-muted-foreground">{passenger.phone}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {passengerFlightCount > 0 ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                <Plane className="w-3 h-3 mr-1" />
                                {passengerFlightCount} flight{passengerFlightCount > 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">No flights</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={isTracked ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleHighlightPassenger(passenger.id)}
                            >
                              {isTracked ? (
                                <>
                                  <BookmarkCheck className="w-4 h-4 mr-1" />
                                  Tracking
                                </>
                              ) : (
                                <>
                                  <Bookmark className="w-4 h-4 mr-1" />
                                  Track
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Flight Operations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5" />
                    Flight Operations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completion Rate</span>
                    <span className="font-bold">{operationalMetrics.flights.completionRate}%</span>
                  </div>
                  <Progress value={operationalMetrics.flights.completionRate} className="h-2" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Scheduled</p>
                      <p className="font-bold">{operationalMetrics.flights.scheduled}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-bold text-green-600">{operationalMetrics.flights.completed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cancelled</p>
                      <p className="font-bold text-red-600">{operationalMetrics.flights.cancelled}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Delayed</p>
                      <p className="font-bold text-orange-600">{operationalMetrics.flights.delayed}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Maintenance Operations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Compliance Rate</span>
                    <span className="font-bold">{operationalMetrics.maintenance.complianceRate}%</span>
                  </div>
                  <Progress value={operationalMetrics.maintenance.complianceRate} className="h-2" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Scheduled</p>
                      <p className="font-bold">{operationalMetrics.maintenance.scheduled}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-bold text-green-600">{operationalMetrics.maintenance.completed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Overdue</p>
                      <p className="font-bold text-red-600">{operationalMetrics.maintenance.overdue}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Critical</p>
                      <p className="font-bold text-red-600">{operationalMetrics.maintenance.critical}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fuel Operations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fuel className="w-5 h-5" />
                    Fuel Operations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Farm Level</span>
                    <span className="font-bold">{((operationalMetrics.fuel.farmLevel / operationalMetrics.fuel.farmCapacity) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(operationalMetrics.fuel.farmLevel / operationalMetrics.fuel.farmCapacity) * 100} className="h-2" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Consumed</p>
                      <p className="font-bold">{operationalMetrics.fuel.consumed.toLocaleString()} gal</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-bold">{formatCurrency(operationalMetrics.fuel.cost)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Efficiency</p>
                      <p className="font-bold">{operationalMetrics.fuel.efficiency} gal/hr</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Farm Level</p>
                      <p className="font-bold">{operationalMetrics.fuel.farmLevel.toLocaleString()} gal</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Crew Operations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Crew Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Availability Rate</span>
                    <span className="font-bold">{operationalMetrics.crew.availabilityRate}%</span>
                  </div>
                  <Progress value={operationalMetrics.crew.availabilityRate} className="h-2" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Crew</p>
                      <p className="font-bold">{operationalMetrics.crew.totalCrew}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Available</p>
                      <p className="font-bold text-green-600">{operationalMetrics.crew.available}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">On Vacation</p>
                      <p className="font-bold text-blue-600">{operationalMetrics.crew.onVacation}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Training</p>
                      <p className="font-bold text-orange-600">{operationalMetrics.crew.training}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Fleet Tab */}
          <TabsContent value="fleet" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5" />
                    Fleet Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{fleetStatus.totalAircraft}</p>
                      <p className="text-sm text-muted-foreground">Total Aircraft</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{fleetStatus.available}</p>
                      <p className="text-sm text-muted-foreground">Available</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{fleetStatus.inMaintenance}</p>
                      <p className="text-sm text-muted-foreground">In Maintenance</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Fleet Utilization</span>
                      <span className="font-bold">{fleetStatus.utilization}%</span>
                    </div>
                    <Progress value={fleetStatus.utilization} className="h-2" />

                    <div className="pt-2 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Average Fleet Age</span>
                        <span className="font-medium">{fleetStatus.averageAge} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Maintenance Due</span>
                        <span className="font-medium">{fleetStatus.nextMaintenance}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Flight Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-xl font-bold">{fleetStatus.fleetHours.thisMonth.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-600">+{((fleetStatus.fleetHours.thisMonth - fleetStatus.fleetHours.lastMonth) / fleetStatus.fleetHours.lastMonth * 100).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">vs last month</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Last Month</p>
                        <p className="text-xl font-bold">{fleetStatus.fleetHours.lastMonth.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Previous</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 border rounded-lg bg-blue-50">
                      <div>
                        <p className="text-sm text-muted-foreground">Year to Date</p>
                        <p className="text-xl font-bold text-blue-600">{fleetStatus.fleetHours.yearToDate.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-600">Target: 18,000</p>
                        <p className="text-xs text-muted-foreground">{((fleetStatus.fleetHours.yearToDate / 18000) * 100).toFixed(1)}% complete</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            {/* Financial Data Input Button */}
            <div className="flex justify-end">
              <Button onClick={handleOpenFinancialInput}>
                <Plus className="w-4 h-4 mr-2" />
                Update Financial Data
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Revenue Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(financialData.revenue.thisMonth)}</p>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-xs text-green-600">+{(((financialData.revenue.thisMonth - financialData.revenue.lastMonth) / financialData.revenue.lastMonth) * 100).toFixed(1)}%</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{formatCurrency(financialData.revenue.yearToDate)}</p>
                      <p className="text-sm text-muted-foreground">Year to Date</p>
                      <p className="text-xs text-muted-foreground">Target: {formatCurrency(financialData.revenue.target)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>YTD Progress</span>
                      <span className="font-bold">{((financialData.revenue.yearToDate / financialData.revenue.target) * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={(financialData.revenue.yearToDate / financialData.revenue.target) * 100} className="h-2" />
                  </div>

                  <div className="pt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Profit Margin</span>
                      <span className="font-bold text-green-600">{financialData.profitMargin}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost per Flight Hour</span>
                      <span className="font-medium">{formatCurrency(financialData.costPerFlightHour)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Expense Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {Object.entries(financialData.expenses).map(([category, amount]) => {
                      const total = Object.values(financialData.expenses).reduce((sum, val) => sum + val, 0);
                      const percentage = ((amount / total) * 100).toFixed(1);
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{category}</span>
                            <span className="font-medium">{formatCurrency(amount)} ({percentage}%)</span>
                          </div>
                          <Progress value={parseFloat(percentage)} className="h-2" />
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between font-bold">
                      <span>Total Expenses</span>
                      <span>{formatCurrency(Object.values(financialData.expenses).reduce((sum, val) => sum + val, 0))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent value="safety" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Safety Incidents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-green-600">{safetyMetrics.incidents.total}</p>
                    <p className="text-sm text-muted-foreground">Total Incidents</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Resolved</span>
                      <Badge className="bg-green-100 text-green-800">{safetyMetrics.incidents.resolved}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending</span>
                      <Badge className="bg-orange-100 text-orange-800">{safetyMetrics.incidents.pending}</Badge>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2 text-sm">
                    <p className="font-medium">Severity Breakdown:</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Low</span>
                        <span>{safetyMetrics.incidents.severity.low}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Medium</span>
                        <span>{safetyMetrics.incidents.severity.medium}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>High</span>
                        <span>{safetyMetrics.incidents.severity.high}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Documents</span>
                        <span>{safetyMetrics.compliance.documents.current} current, {safetyMetrics.compliance.documents.expiring} expiring</span>
                      </div>
                      <Progress value={(safetyMetrics.compliance.documents.current / (safetyMetrics.compliance.documents.current + safetyMetrics.compliance.documents.expiring + safetyMetrics.compliance.documents.overdue)) * 100} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Training</span>
                        <span>{safetyMetrics.compliance.training.current} current, {safetyMetrics.compliance.training.expiring} expiring</span>
                      </div>
                      <Progress value={(safetyMetrics.compliance.training.current / (safetyMetrics.compliance.training.current + safetyMetrics.compliance.training.expiring + safetyMetrics.compliance.training.overdue)) * 100} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Audits</span>
                        <span>{safetyMetrics.compliance.audits.passed} passed, {safetyMetrics.compliance.audits.pending} pending</span>
                      </div>
                      <Progress value={(safetyMetrics.compliance.audits.passed / (safetyMetrics.compliance.audits.passed + safetyMetrics.compliance.audits.pending)) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Certificates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Pilot Certificates</span>
                        <Badge variant="outline">{safetyMetrics.certificates.pilot.current}</Badge>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">{safetyMetrics.certificates.pilot.expiring} expiring soon</p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Aircraft Certificates</span>
                        <Badge variant="outline">{safetyMetrics.certificates.aircraft.current}</Badge>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">{safetyMetrics.certificates.aircraft.expiring} expiring soon</p>
                    </div>

                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Maintenance Certificates</span>
                        <Badge variant="outline">{safetyMetrics.certificates.maintenance.current}</Badge>
                      </div>
                      <p className="text-xs text-orange-600 mt-1">{safetyMetrics.certificates.maintenance.expiring} expiring soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Service Tab */}
          <TabsContent value="service" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Airport Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{serviceQuality.airports.reviewed}</p>
                    <p className="text-sm text-muted-foreground">Airports Reviewed</p>
                    <p className="text-xs text-muted-foreground">Avg Rating: {serviceQuality.airports.averageRating}/5</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Current</span>
                      <Badge className="bg-green-100 text-green-800">{serviceQuality.airports.current}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Due Soon</span>
                      <Badge className="bg-yellow-100 text-yellow-800">{serviceQuality.airports.dueSoon}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Overdue</span>
                      <Badge className="bg-red-100 text-red-800">{serviceQuality.airports.overdue}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coffee className="w-5 h-5" />
                    Catering Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Satisfaction Rate</span>
                    <span className="font-bold">{serviceQuality.catering.satisfactionRate}%</span>
                  </div>
                  <Progress value={serviceQuality.catering.satisfactionRate} className="h-2" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Orders</p>
                      <p className="font-bold">{serviceQuality.catering.orders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Satisfied</p>
                      <p className="font-bold text-green-600">{serviceQuality.catering.satisfied}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Complaints</p>
                      <p className="font-bold text-red-600">{serviceQuality.catering.complaints}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Success Rate</p>
                      <p className="font-bold">{serviceQuality.catering.satisfactionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Passenger Experience
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{serviceQuality.passenger.satisfactionScore}/5</p>
                    <p className="text-sm text-muted-foreground">Satisfaction Score</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Passengers</span>
                      <span className="font-medium">{serviceQuality.passenger.totalPassengers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VIP Services</span>
                      <span className="font-medium">{serviceQuality.passenger.vipServices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Special Requests</span>
                      <span className="font-medium">{serviceQuality.passenger.specialRequests}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Critical Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Critical Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {criticalAlerts.map((alert) => (
                    <div key={alert.id} className={`p-4 border rounded-lg ${getAlertColor(alert.severity)}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getAlertIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge className={`${alert.severity === 'critical' ? 'bg-red-500 text-white' :
                              alert.severity === 'high' ? 'bg-orange-500 text-white' :
                                'bg-yellow-500 text-white'}`}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">{alert.timeAgo}</span>
                            <Button size="sm" variant="outline">
                              {alert.actionRequired}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()} at {event.time}
                          </p>
                        </div>
                        <Badge className={`${event.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          event.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                          {event.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.aircraft && <span>Aircraft: {event.aircraft}</span>}
                        {event.technician && <span>Technician: {event.technician}</span>}
                        {event.instructor && <span>Instructor: {event.instructor}</span>}
                        {event.auditor && <span>Auditor: {event.auditor}</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Financial Data Input Dialog */}
        <Dialog open={showFinancialInputDialog} onOpenChange={setShowFinancialInputDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Update Financial Data
              </DialogTitle>
              <DialogDescription>
                Enter current financial metrics for the dashboard. All amounts should be in USD.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Revenue Section */}
              <div className="p-4 border rounded-lg bg-green-50/50">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Revenue Data
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">This Month Revenue ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.revenueThisMonth}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, revenueThisMonth: e.target.value })}
                      placeholder="2400000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Last Month Revenue ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.revenueLastMonth}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, revenueLastMonth: e.target.value })}
                      placeholder="2150000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Year to Date Revenue ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.revenueYearToDate}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, revenueYearToDate: e.target.value })}
                      placeholder="28500000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Annual Revenue Target ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.revenueTarget}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, revenueTarget: e.target.value })}
                      placeholder="32000000"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Expenses Section */}
              <div className="p-4 border rounded-lg bg-orange-50/50">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  Operating Expenses
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Fuel Expenses ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.expenseFuel}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, expenseFuel: e.target.value })}
                      placeholder="187250"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Maintenance Expenses ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.expenseMaintenance}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, expenseMaintenance: e.target.value })}
                      placeholder="145000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Crew Expenses ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.expenseCrew}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, expenseCrew: e.target.value })}
                      placeholder="320000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Insurance Expenses ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.expenseInsurance}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, expenseInsurance: e.target.value })}
                      placeholder="85000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Other Expenses ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.expenseOther}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, expenseOther: e.target.value })}
                      placeholder="120000"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Performance Metrics */}
              <div className="p-4 border rounded-lg bg-blue-50/50">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Performance Metrics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Profit Margin (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={financialFormData.profitMargin}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, profitMargin: e.target.value })}
                      placeholder="28.5"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Cost per Flight Hour ($)</label>
                    <Input
                      type="number"
                      value={financialFormData.costPerFlightHour}
                      onChange={(e) => setFinancialFormData({ ...financialFormData, costPerFlightHour: e.target.value })}
                      placeholder="2850"
                    />
                  </div>
                </div>
              </div>

              {/* Summary Preview */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-3">Preview Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Expenses</p>
                    <p className="font-bold text-lg">
                      {formatCurrency(
                        parseFloat(financialFormData.expenseFuel || '0') +
                        parseFloat(financialFormData.expenseMaintenance || '0') +
                        parseFloat(financialFormData.expenseCrew || '0') +
                        parseFloat(financialFormData.expenseInsurance || '0') +
                        parseFloat(financialFormData.expenseOther || '0')
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Net Revenue</p>
                    <p className="font-bold text-lg text-green-600">
                      {formatCurrency(
                        parseFloat(financialFormData.revenueThisMonth || '0') -
                        (parseFloat(financialFormData.expenseFuel || '0') +
                          parseFloat(financialFormData.expenseMaintenance || '0') +
                          parseFloat(financialFormData.expenseCrew || '0') +
                          parseFloat(financialFormData.expenseInsurance || '0') +
                          parseFloat(financialFormData.expenseOther || '0'))
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setShowFinancialInputDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveFinancialData}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Financial Data
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Passenger Flight Details Dialog */}
        <Dialog open={showPassengerDetailsDialog} onOpenChange={setShowPassengerDetailsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedPassengerForDetails && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-primary" />
                    Flight Details - {selectedPassengerForDetails.flight.flightId}
                  </DialogTitle>
                  <DialogDescription>
                    Complete flight information for {selectedPassengerForDetails.passenger.name}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Passenger Info */}
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Passenger Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedPassengerForDetails.passenger.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Classification</p>
                        <Badge className="bg-primary text-primary-foreground">
                          {selectedPassengerForDetails.passenger.classification.category}
                          {selectedPassengerForDetails.passenger.classification.role &&
                            ` - ${selectedPassengerForDetails.passenger.classification.role}`}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedPassengerForDetails.passenger.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedPassengerForDetails.passenger.phone}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Flight Information */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Flight Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Flight Number</p>
                        <p className="font-medium text-lg">{selectedPassengerForDetails.flight.flightId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge className={getFlightStatusColor(selectedPassengerForDetails.flight.status)}>
                          {selectedPassengerForDetails.flight.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Route</p>
                        <p className="font-medium">{selectedPassengerForDetails.flight.route}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Aircraft</p>
                        <p className="font-medium">{selectedPassengerForDetails.flight.aircraft}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date & Time</p>
                        <p className="font-medium">
                          {new Date(selectedPassengerForDetails.flight.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} at {selectedPassengerForDetails.flight.time}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">{selectedPassengerForDetails.flight.duration}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Departure & Arrival */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-900">
                        <MapPin className="w-4 h-4" />
                        Departure
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-blue-700">Airport</p>
                          <p className="font-medium text-blue-900">{selectedPassengerForDetails.flight.departure.airport}</p>
                        </div>
                        <div>
                          <p className="text-blue-700">Location</p>
                          <p className="font-medium text-blue-900">{selectedPassengerForDetails.flight.departure.city}</p>
                        </div>
                        <div>
                          <p className="text-blue-700">Terminal</p>
                          <p className="font-medium text-blue-900">{selectedPassengerForDetails.flight.departure.terminal}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-900">
                        <MapPin className="w-4 h-4" />
                        Arrival
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-green-700">Airport</p>
                          <p className="font-medium text-green-900">{selectedPassengerForDetails.flight.arrival.airport}</p>
                        </div>
                        <div>
                          <p className="text-green-700">Location</p>
                          <p className="font-medium text-green-900">{selectedPassengerForDetails.flight.arrival.city}</p>
                        </div>
                        <div>
                          <p className="text-green-700">Terminal</p>
                          <p className="font-medium text-green-900">{selectedPassengerForDetails.flight.arrival.terminal}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Crew Information */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Flight Crew
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Captain</p>
                        <p className="font-medium">{selectedPassengerForDetails.flight.crew.captain}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">First Officer</p>
                        <p className="font-medium">{selectedPassengerForDetails.flight.crew.firstOfficer}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Flight Attendant</p>
                        <p className="font-medium">{selectedPassengerForDetails.flight.crew.flightAttendant}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Catering & Notes */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Coffee className="w-4 h-4" />
                        Catering Status
                      </h4>
                      <p className="text-sm p-3 bg-muted/50 rounded">{selectedPassengerForDetails.flight.catering}</p>
                    </div>

                    {selectedPassengerForDetails.flight.notes && (
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Flight Notes
                        </h4>
                        <Alert className="border-blue-200 bg-blue-50">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-blue-800">
                            {selectedPassengerForDetails.flight.notes}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => toast.success('Flight details exported')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Details
                    </Button>
                    <Button variant="outline" onClick={() => toast.success('Notification sent to crew')}>
                      <PhoneCall className="w-4 h-4 mr-2" />
                      Notify Crew
                    </Button>
                    <Button variant="outline" onClick={() => setShowPassengerDetailsDialog(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}