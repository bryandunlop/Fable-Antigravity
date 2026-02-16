import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Plane,
  Fuel,
  TrendingDown,
  TrendingUp,
  MapPin,
  Info,
  Globe,
  Star,
  Building2,
  ExternalLink,
  AlertCircle,
  Coffee,
  ArrowUp,
  ArrowDown,
  Users,
  Car,
  Radio,
  Eye,
  Timer,
  Gauge,
  Settings,
  Package,
  Clipboard,
  Edit,
  Shield,
  Home,
  BarChart3,
  Activity,
  Cloud,
  Wind,
  Thermometer
} from 'lucide-react';

interface Aircraft {
  id: string;
  registration: string;
  model: string;
  status: 'in-service' | 'in-work' | 'aog';
  location: string;
  hoursToNext: number;
  nextFlight?: {
    flightNumber: string;
    departure: string;
    destination: string;
    fuelLoad: number;
    estimatedDeparture: string;
  };
  lastCrew?: {
    captain: string;
    firstOfficer: string;
    flightAttendant?: string;
    lastFlight: string;
  };
}

interface DailyOperation {
  id: string;
  type: 'departure' | 'arrival';
  flightNumber: string;
  aircraft: string;
  time: string;
  estimatedTime?: string;
  adsbTime?: string;
  destination?: string;
  origin?: string;
  status: 'scheduled' | 'departed' | 'arrived' | 'delayed';
}

interface HangarCar {
  id: string;
  owner: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  location: string;
  checkedIn: string;
  flightAssignment?: string;
}

export default function MaintenanceBoard() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);

  const aircraft: Aircraft[] = [
    {
      id: 'AC001',
      registration: 'N1PG',
      model: 'Gulfstream G650',
      status: 'in-service',
      location: 'Hangar 1',
      hoursToNext: 15.5,
      nextFlight: {
        flightNumber: 'FO045',
        departure: 'KJFK',
        destination: 'KBOS',
        fuelLoad: 12500,
        estimatedDeparture: '14:30'
      },
      lastCrew: {
        captain: 'Captain Sarah Johnson',
        firstOfficer: 'FO Michael Chen',
        flightAttendant: 'FA Jessica Williams',
        lastFlight: 'FO044 - KBOS to KJFK'
      }
    },
    {
      id: 'AC002',
      registration: 'N5PG',
      model: 'Gulfstream G500',
      status: 'in-work',
      location: 'Hangar 2',
      hoursToNext: 8.2,
      nextFlight: {
        flightNumber: 'FO046',
        departure: 'KJFK',
        destination: 'EGLL',
        fuelLoad: 18500,
        estimatedDeparture: '20:15'
      },
      lastCrew: {
        captain: 'Captain James Rodriguez',
        firstOfficer: 'FO Amanda White',
        flightAttendant: 'FA David Martinez',
        lastFlight: 'FO043 - EGLL to KJFK'
      }
    },
    {
      id: 'AC003',
      registration: 'N2PG',
      model: 'Gulfstream G650',
      status: 'aog',
      location: 'Hangar 3',
      hoursToNext: 2.1,
      nextFlight: {
        flightNumber: 'FO047',
        departure: 'KJFK',
        destination: 'KORD',
        fuelLoad: 11000,
        estimatedDeparture: '08:00'
      },
      lastCrew: {
        captain: 'Captain Robert Thompson',
        firstOfficer: 'FO Lisa Davis',
        flightAttendant: 'FA Mark Johnson',
        lastFlight: 'FO042 - KORD to KJFK'
      }
    }
  ];

  const dailyOperations: DailyOperation[] = [
    {
      id: 'OP001',
      type: 'departure',
      flightNumber: 'FO045',
      aircraft: 'N1PG',
      time: '14:30',
      destination: 'KBOS',
      status: 'scheduled'
    },
    {
      id: 'OP002',
      type: 'arrival',
      flightNumber: 'FO044',
      aircraft: 'N5PG',
      time: '16:45',
      estimatedTime: '16:52',
      adsbTime: '16:48',
      origin: 'EGLL',
      status: 'arrived'
    },
    {
      id: 'OP003',
      type: 'departure',
      flightNumber: 'FO046',
      aircraft: 'N5PG',
      time: '20:15',
      destination: 'EGLL',
      status: 'scheduled'
    },
    {
      id: 'OP004',
      type: 'arrival',
      flightNumber: 'FO043',
      aircraft: 'N2PG',
      time: '22:30',
      estimatedTime: '22:45',
      origin: 'KORD',
      status: 'delayed'
    }
  ];

  const hangarCars: HangarCar[] = [
    {
      id: 'CAR001',
      owner: 'Johnson Family',
      make: 'Mercedes-Benz',
      model: 'S-Class',
      color: 'Black',
      licensePlate: 'NY-JET-1',
      location: 'Bay 3',
      checkedIn: '2025-02-01 14:30',
      flightAssignment: 'FO045'
    },
    {
      id: 'CAR002',
      owner: 'Smith Corporate',
      make: 'BMW',
      model: 'X7',
      color: 'White',
      licensePlate: 'CT-EXEC-2',
      location: 'Bay 1',
      checkedIn: '2025-02-01 09:15',
      flightAssignment: 'FO046'
    },
    {
      id: 'CAR003',
      owner: 'Davis Family',
      make: 'Audi',
      model: 'Q8',
      color: 'Silver',
      licensePlate: 'NJ-VIP-3',
      location: 'Bay 5',
      checkedIn: '2025-02-01 11:45'
    },
    {
      id: 'CAR004',
      owner: 'Wilson Trust',
      make: 'Range Rover',
      model: 'Autobiography',
      color: 'Navy Blue',
      licensePlate: 'NY-PRIV-4',
      location: 'Bay 2',
      checkedIn: '2025-02-01 16:20',
      flightAssignment: 'FO047'
    }
  ];

  // Mock fuel farm data - in real app this would come from the fuel tracker
  const fuelFarmData = {
    currentLevel: 8550,
    totalCapacity: 10000,
    monthlyUsage: 2750,
    lastUpdated: '2024-02-06T16:30:00',
    status: 'good' // good, medium, low, critical
  };

  const maintenanceTasks = [
    {
      id: 'MT-001',
      aircraft: 'N1PG',
      type: 'Scheduled',
      task: '100-hour inspection',
      priority: 'High',
      status: 'In Progress',
      assignedTo: 'John Smith',
      estimatedHours: 8,
      actualHours: 4.5,
      dueDate: '2025-02-15',
      startDate: '2025-02-01',
      description: 'Comprehensive 100-hour inspection including engine, avionics, and structural checks',
      comments: 'Engine oil pressure slightly low, investigating'
    },
    {
      id: 'MT-002',
      aircraft: 'N5PG',
      type: 'Unscheduled',
      task: 'Cabin pressure warning repair',
      priority: 'Critical',
      status: 'Assigned',
      assignedTo: 'Mike Johnson',
      estimatedHours: 6,
      actualHours: 0,
      dueDate: '2025-02-05',
      startDate: '2025-02-03',
      description: 'Investigate and repair cabin pressure warning light malfunction',
      comments: 'Reported by crew after FO002 arrival'
    },
    {
      id: 'MT-003',
      aircraft: 'N2PG',
      type: 'Scheduled',
      task: 'Landing gear actuator replacement',
      priority: 'Critical',
      status: 'In Progress',
      assignedTo: 'Sarah Wilson',
      estimatedHours: 12,
      actualHours: 10,
      dueDate: '2025-02-06',
      startDate: '2025-01-28',
      description: 'Replace main landing gear actuator assembly - AIRCRAFT AOG',
      comments: 'Parts arrived, installation in progress. Aircraft grounded.'
    },
    {
      id: 'MT-004',
      aircraft: 'N6PG',
      type: 'Scheduled',
      task: 'Avionics software update',
      priority: 'Medium',
      status: 'Pending',
      assignedTo: 'Unassigned',
      estimatedHours: 4,
      actualHours: 0,
      dueDate: '2025-02-20',
      startDate: null,
      description: 'Update flight management system software to latest version',
      comments: 'Waiting for software release from manufacturer'
    }
  ];

  const filteredTasks = maintenanceTasks.filter(task => {
    const matchesFilter = filter === 'all' || task.status.toLowerCase().replace(' ', '') === filter;
    const matchesSearch = task.aircraft.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.task.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getAircraftStatusColor = (status: string) => {
    switch (status) {
      case 'in-service': return 'bg-green-500';
      case 'in-work': return 'bg-yellow-500';
      case 'aog': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAircraftStatusBadge = (status: string) => {
    switch (status) {
      case 'in-service': return <Badge className="bg-green-100 text-green-800 border-green-200">In Service</Badge>;
      case 'in-work': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In Work</Badge>;
      case 'aog': return <Badge className="bg-red-100 text-red-800 border-red-200">AOG</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getOperationStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600';
      case 'departed': return 'text-green-600';
      case 'arrived': return 'text-green-600';
      case 'delayed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in progress': case 'inprogress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusStats = () => {
    const stats = {
      pending: maintenanceTasks.filter(t => t.status === 'Pending').length,
      assigned: maintenanceTasks.filter(t => t.status === 'Assigned').length,
      inProgress: maintenanceTasks.filter(t => t.status === 'In Progress').length,
      completed: maintenanceTasks.filter(t => t.status === 'Completed').length,
    };
    return stats;
  };

  const stats = getStatusStats();

  const getFuelFarmStatusColor = () => {
    const percentage = (fuelFarmData.currentLevel / fuelFarmData.totalCapacity) * 100;
    if (percentage < 20) return { color: 'text-red-600', bgColor: 'bg-red-600', status: 'Critical' };
    if (percentage < 40) return { color: 'text-orange-600', bgColor: 'bg-orange-600', status: 'Low' };
    if (percentage < 70) return { color: 'text-yellow-600', bgColor: 'bg-yellow-600', status: 'Medium' };
    return { color: 'text-green-600', bgColor: 'bg-green-600', status: 'Good' };
  };

  const fuelStatus = getFuelFarmStatusColor();
  const fuelPercentage = (fuelFarmData.currentLevel / fuelFarmData.totalCapacity) * 100;

  // Mock fuel load requests for next 3 days
  const fuelLoadRequests = [
    {
      id: 'FLR001',
      flightNumber: 'FO045',
      tailNumber: 'N1PG',
      aircraft: 'Gulfstream G650',
      departure: 'KTEB',
      arrival: 'KPBI',
      date: '2024-01-20',
      time: '08:00',
      fuelRequested: 4.2, // thousands of pounds
      priority: 'normal',
      requestedBy: 'Captain Rodriguez',
      status: 'pending',
      notes: 'Standard fuel load for route. Weather looks good.'
    },
    {
      id: 'FLR002',
      flightNumber: 'FO046',
      tailNumber: 'N5PG',
      aircraft: 'Gulfstream G500',
      departure: 'KPBI',
      arrival: 'KIAH',
      date: '2024-01-20',
      time: '14:30',
      fuelRequested: 8.5, // thousands of pounds
      priority: 'urgent',
      requestedBy: 'Captain Smith',
      status: 'acknowledged',
      notes: 'Need extra fuel due to possible headwinds and weather delays.'
    },
    {
      id: 'FLR003',
      flightNumber: 'FO047',
      tailNumber: 'N2PG',
      aircraft: 'Gulfstream G650',
      departure: 'KIAH',
      arrival: 'KBOS',
      date: '2024-01-21',
      time: '09:15',
      fuelRequested: 6.8, // thousands of pounds
      priority: 'critical',
      requestedBy: 'Captain Johnson',
      status: 'in-progress',
      notes: 'Last minute passenger change - need full fuel load for extended range.'
    }
  ];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // GRATS (Ground Risk Assessment Tool) Data
  interface GRATSAssessment {
    id: string;
    date: string;
    shift: 'AM' | 'PM';
    score: number;
    maxScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: {
      weather: number;
      equipment: number;
      personnel: number;
      timePressure: number;
      complexity: number;
    };
    notes: string;
    assessedBy: string;
  }

  const gratsData: GRATSAssessment[] = [
    // Today's assessments
    {
      id: 'GRATS-001',
      date: '2025-02-08',
      shift: 'AM',
      score: 12,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 2,
        equipment: 3,
        personnel: 2,
        timePressure: 3,
        complexity: 2
      },
      notes: 'Clear weather, full crew complement, routine operations scheduled',
      assessedBy: 'Chief Technician - Mike Johnson'
    },
    {
      id: 'GRATS-002',
      date: '2025-02-08',
      shift: 'PM',
      score: 18,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 4,
        equipment: 4,
        personnel: 3,
        timePressure: 4,
        complexity: 3
      },
      notes: 'Evening operations with tight turnaround, minor equipment issues',
      assessedBy: 'Shift Supervisor - Sarah Wilson'
    },
    // Previous 6 days
    {
      id: 'GRATS-003',
      date: '2025-02-07',
      shift: 'AM',
      score: 15,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 3,
        equipment: 3,
        personnel: 3,
        timePressure: 3,
        complexity: 3
      },
      notes: 'Normal operations',
      assessedBy: 'Chief Technician - Mike Johnson'
    },
    {
      id: 'GRATS-004',
      date: '2025-02-07',
      shift: 'PM',
      score: 22,
      maxScore: 50,
      riskLevel: 'medium',
      factors: {
        weather: 5,
        equipment: 4,
        personnel: 4,
        timePressure: 5,
        complexity: 4
      },
      notes: 'Light rain, increased workload',
      assessedBy: 'Shift Supervisor - Sarah Wilson'
    },
    {
      id: 'GRATS-005',
      date: '2025-02-06',
      shift: 'AM',
      score: 10,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 2,
        equipment: 2,
        personnel: 2,
        timePressure: 2,
        complexity: 2
      },
      notes: 'Excellent conditions, routine day',
      assessedBy: 'Chief Technician - Mike Johnson'
    },
    {
      id: 'GRATS-006',
      date: '2025-02-06',
      shift: 'PM',
      score: 16,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 3,
        equipment: 3,
        personnel: 3,
        timePressure: 4,
        complexity: 3
      },
      notes: 'Standard evening ops',
      assessedBy: 'Shift Supervisor - Sarah Wilson'
    },
    {
      id: 'GRATS-007',
      date: '2025-02-05',
      shift: 'AM',
      score: 25,
      maxScore: 50,
      riskLevel: 'medium',
      factors: {
        weather: 6,
        equipment: 5,
        personnel: 4,
        timePressure: 5,
        complexity: 5
      },
      notes: 'Fog delays, equipment testing required',
      assessedBy: 'Chief Technician - Mike Johnson'
    },
    {
      id: 'GRATS-008',
      date: '2025-02-05',
      shift: 'PM',
      score: 20,
      maxScore: 50,
      riskLevel: 'medium',
      factors: {
        weather: 4,
        equipment: 4,
        personnel: 4,
        timePressure: 4,
        complexity: 4
      },
      notes: 'Weather improving, catching up on schedule',
      assessedBy: 'Shift Supervisor - Sarah Wilson'
    },
    {
      id: 'GRATS-009',
      date: '2025-02-04',
      shift: 'AM',
      score: 13,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 3,
        equipment: 2,
        personnel: 3,
        timePressure: 3,
        complexity: 2
      },
      notes: 'Smooth start to the week',
      assessedBy: 'Chief Technician - Mike Johnson'
    },
    {
      id: 'GRATS-010',
      date: '2025-02-04',
      shift: 'PM',
      score: 17,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 3,
        equipment: 4,
        personnel: 3,
        timePressure: 4,
        complexity: 3
      },
      notes: 'Minor delays, all resolved',
      assessedBy: 'Shift Supervisor - Sarah Wilson'
    },
    {
      id: 'GRATS-011',
      date: '2025-02-03',
      shift: 'AM',
      score: 14,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 3,
        equipment: 3,
        personnel: 2,
        timePressure: 3,
        complexity: 3
      },
      notes: 'Routine operations',
      assessedBy: 'Chief Technician - Mike Johnson'
    },
    {
      id: 'GRATS-012',
      date: '2025-02-03',
      shift: 'PM',
      score: 19,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 4,
        equipment: 4,
        personnel: 3,
        timePressure: 4,
        complexity: 4
      },
      notes: 'Busy afternoon, managed well',
      assessedBy: 'Shift Supervisor - Sarah Wilson'
    },
    {
      id: 'GRATS-013',
      date: '2025-02-02',
      shift: 'AM',
      score: 11,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 2,
        equipment: 2,
        personnel: 2,
        timePressure: 3,
        complexity: 2
      },
      notes: 'Good conditions all around',
      assessedBy: 'Chief Technician - Mike Johnson'
    },
    {
      id: 'GRATS-014',
      date: '2025-02-02',
      shift: 'PM',
      score: 15,
      maxScore: 50,
      riskLevel: 'low',
      factors: {
        weather: 3,
        equipment: 3,
        personnel: 3,
        timePressure: 3,
        complexity: 3
      },
      notes: 'Standard operations',
      assessedBy: 'Shift Supervisor - Sarah Wilson'
    }
  ];

  const getGRATSRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGRATSRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 border-green-600';
      case 'medium': return 'text-yellow-600 border-yellow-600';
      case 'high': return 'text-orange-600 border-orange-600';
      case 'critical': return 'text-red-600 border-red-600';
      default: return 'text-gray-600 border-gray-600';
    }
  };

  // Get today's GRATS
  const todayGRATS = gratsData.filter(g => g.date === '2025-02-08');
  const amGRATS = todayGRATS.find(g => g.shift === 'AM');
  const pmGRATS = todayGRATS.find(g => g.shift === 'PM');

  // Calculate 7-day average
  const last7DaysGRATS = gratsData.slice(0, 14); // 7 days * 2 shifts
  const averageScore = last7DaysGRATS.reduce((sum, g) => sum + g.score, 0) / last7DaysGRATS.length;
  const averagePercentage = (averageScore / 50) * 100;

  // Prepare chart data for 7-day trend
  const chartData = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date('2025-02-08');
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayData = gratsData.filter(g => g.date === dateStr);
    const amData = dayData.find(g => g.shift === 'AM');
    const pmData = dayData.find(g => g.shift === 'PM');

    chartData.unshift({
      date: dateStr,
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      am: amData?.score || 0,
      pm: pmData?.score || 0,
      average: ((amData?.score || 0) + (pmData?.score || 0)) / 2
    });
  }

  const getFuelPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'urgent': return 'bg-orange-500 text-white';
      case 'normal': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getFuelRequestStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1>Maintenance Status Board</h1>
          <p className="text-muted-foreground">G650 Fleet Management & Operations</p>
        </div>

        <div className="flex items-center gap-4 mt-4 lg:mt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Saturday, February 2, 2025
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clipboard className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Tasks</p>
                <p className="text-2xl font-bold">{maintenanceTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-green-700 font-medium">In Service</p>
                <p className="text-2xl font-bold text-green-700">
                  {aircraft.filter(a => a.status === 'in-service').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700 font-medium">In Work</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {aircraft.filter(a => a.status === 'in-work').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-red-700 font-medium">AOG</p>
                <p className="text-2xl font-bold text-red-700">
                  {aircraft.filter(a => a.status === 'aog').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Cars in Hangar</p>
                <p className="text-2xl font-bold">{hangarCars.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hours Today</p>
                <p className="text-2xl font-bold">6.5</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="aircraft" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger value="aircraft">Aircraft Status</TabsTrigger>
          <TabsTrigger value="operations">Daily Operations</TabsTrigger>
          <TabsTrigger value="grats">GRATS</TabsTrigger>
          <TabsTrigger value="cars">Hangar Cars</TabsTrigger>
          <TabsTrigger value="fuel">Fuel Management</TabsTrigger>
          <TabsTrigger value="tasks">Work Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="aircraft" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>G650 Fleet Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {aircraft.map((plane) => (
                      <Card
                        key={plane.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${plane.status === 'aog' ? 'border-red-500 border-2 bg-red-50' :
                          plane.status === 'in-work' ? 'border-yellow-300 border-2 bg-yellow-50' : ''
                          }`}
                        onClick={() => setSelectedAircraft(plane)}
                      >
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getAircraftStatusColor(plane.status)}`}></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{plane.registration}</h4>
                                {getAircraftStatusBadge(plane.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{plane.model}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {plane.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Timer className="w-3 h-3" />
                                  {plane.hoursToNext}h to next
                                </div>
                              </div>
                            </div>
                          </div>

                          {plane.nextFlight && (
                            <div className="mt-4 sm:mt-0 sm:text-right text-sm">
                              <div className="font-medium">{plane.nextFlight.flightNumber}</div>
                              <div className="text-muted-foreground">
                                {plane.nextFlight.departure} → {plane.nextFlight.destination}
                              </div>
                              <div className="flex items-center gap-1 justify-start sm:justify-end mt-1">
                                <Fuel className="w-3 h-3" />
                                {plane.nextFlight.fuelLoad.toLocaleString()} lbs
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Aircraft Details Panel */}
            <div className="lg:col-span-1">
              {selectedAircraft ? (
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plane className="w-5 h-5" />
                      {selectedAircraft.registration}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getAircraftStatusColor(selectedAircraft.status)}`}></div>
                      {getAircraftStatusBadge(selectedAircraft.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedAircraft.status === 'aog' && (
                      <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-bold text-red-700">AIRCRAFT ON GROUND</span>
                        </div>
                        <div className="text-sm text-red-700">
                          Immediate attention required. Next flight in {selectedAircraft.hoursToNext} hours.
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-2">Aircraft Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span>{selectedAircraft.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span>{selectedAircraft.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hours to Next:</span>
                          <span>{selectedAircraft.hoursToNext}h</span>
                        </div>
                      </div>
                    </div>

                    {selectedAircraft.nextFlight && (
                      <div>
                        <h4 className="font-medium mb-2">Next Flight</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Flight:</span>
                            <span>{selectedAircraft.nextFlight.flightNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Route:</span>
                            <span>{selectedAircraft.nextFlight.departure} → {selectedAircraft.nextFlight.destination}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Departure:</span>
                            <span>{selectedAircraft.nextFlight.estimatedDeparture}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fuel Load:</span>
                            <span>{selectedAircraft.nextFlight.fuelLoad.toLocaleString()} lbs</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedAircraft.lastCrew && (
                      <div>
                        <h4 className="font-medium mb-2">Previous Crew</h4>
                        <div className="text-sm text-muted-foreground mb-2">
                          {selectedAircraft.lastCrew.lastFlight}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {selectedAircraft.lastCrew.captain}
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {selectedAircraft.lastCrew.firstOfficer}
                          </div>
                          {selectedAircraft.lastCrew.flightAttendant && (
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3" />
                              {selectedAircraft.lastCrew.flightAttendant}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <Users className="w-3 h-3 mr-1" />
                          Contact Previous Crew
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="sticky top-20">
                  <CardContent className="p-8 text-center">
                    <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Select an aircraft to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Flight Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyOperations.map((operation) => (
                  <Card key={operation.id} className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          {operation.type === 'departure' ? (
                            <ArrowUp className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-4 h-4 text-green-600" />
                          )}
                          <div>
                            <div className="font-medium">{operation.flightNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {operation.aircraft} - {operation.type === 'departure' ? 'TO' : 'FROM'} {operation.destination || operation.origin}
                            </div>
                          </div>
                        </div>

                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Scheduled: {operation.time}</span>
                          </div>
                          {operation.estimatedTime && (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Gauge className="w-3 h-3" />
                              <span>ETA: {operation.estimatedTime}</span>
                            </div>
                          )}
                          {operation.adsbTime && (
                            <div className="flex items-center gap-2 text-green-600">
                              <Radio className="w-3 h-3" />
                              <span>ADSB: {operation.adsbTime}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getOperationStatusColor(operation.status)}
                        >
                          {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
                        </Badge>
                        {operation.status === 'arrived' && (
                          <Button variant="outline" size="sm">
                            <Eye className="w-3 h-3 mr-1" />
                            View Crew
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grats" className="space-y-6">
          {/* GRATS Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* AM GRATS */}
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  AM GRATS
                </CardTitle>
              </CardHeader>
              <CardContent>
                {amGRATS ? (
                  <div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-4xl font-bold">{amGRATS.score}</span>
                      <span className="text-muted-foreground mb-1">/ {amGRATS.maxScore}</span>
                    </div>
                    <Badge variant="outline" className={getGRATSRiskBadgeColor(amGRATS.riskLevel)}>
                      {amGRATS.riskLevel.toUpperCase()} RISK
                    </Badge>
                    <div className="mt-3 text-sm text-muted-foreground">
                      Assessed by: {amGRATS.assessedBy}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No assessment yet</div>
                )}
              </CardContent>
            </Card>

            {/* PM GRATS */}
            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  PM GRATS
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pmGRATS ? (
                  <div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-4xl font-bold">{pmGRATS.score}</span>
                      <span className="text-muted-foreground mb-1">/ {pmGRATS.maxScore}</span>
                    </div>
                    <Badge variant="outline" className={getGRATSRiskBadgeColor(pmGRATS.riskLevel)}>
                      {pmGRATS.riskLevel.toUpperCase()} RISK
                    </Badge>
                    <div className="mt-3 text-sm text-muted-foreground">
                      Assessed by: {pmGRATS.assessedBy}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">No assessment yet</div>
                )}
              </CardContent>
            </Card>

            {/* 7-Day Average */}
            <Card className="border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  7-Day Average
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-4xl font-bold">{averageScore.toFixed(1)}</span>
                  <span className="text-muted-foreground mb-1">/ 50</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${averagePercentage < 40 ? 'bg-green-500' :
                      averagePercentage < 60 ? 'bg-yellow-500' :
                        averagePercentage < 80 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                    style={{ width: `${averagePercentage}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {averagePercentage.toFixed(0)}% risk level
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 7-Day Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                7-Day GRATS Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chartData.map((day, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{day.dateLabel}</span>
                      <span className="text-muted-foreground">Avg: {day.average.toFixed(1)}</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-blue-600">AM: {day.am}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(day.am / 50) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-purple-600">PM: {day.pm}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(day.pm / 50) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's Detailed Assessments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AM Assessment Details */}
            {amGRATS && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      AM Assessment Details
                    </span>
                    <Badge className={getGRATSRiskColor(amGRATS.riskLevel)}>
                      {amGRATS.riskLevel.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Risk Factors</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Cloud className="w-3 h-3" />
                            Weather Conditions
                          </span>
                          <span>{amGRATS.factors.weather} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(amGRATS.factors.weather / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Equipment Status
                          </span>
                          <span>{amGRATS.factors.equipment} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(amGRATS.factors.equipment / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Personnel Factors
                          </span>
                          <span>{amGRATS.factors.personnel} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(amGRATS.factors.personnel / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Time Pressure
                          </span>
                          <span>{amGRATS.factors.timePressure} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(amGRATS.factors.timePressure / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            Operation Complexity
                          </span>
                          <span>{amGRATS.factors.complexity} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(amGRATS.factors.complexity / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground">{amGRATS.notes}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Assessment
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-3 h-3 mr-1" />
                      View History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PM Assessment Details */}
            {pmGRATS && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-600" />
                      PM Assessment Details
                    </span>
                    <Badge className={getGRATSRiskColor(pmGRATS.riskLevel)}>
                      {pmGRATS.riskLevel.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Risk Factors</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Cloud className="w-3 h-3" />
                            Weather Conditions
                          </span>
                          <span>{pmGRATS.factors.weather} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(pmGRATS.factors.weather / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" />
                            Equipment Status
                          </span>
                          <span>{pmGRATS.factors.equipment} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(pmGRATS.factors.equipment / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Personnel Factors
                          </span>
                          <span>{pmGRATS.factors.personnel} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(pmGRATS.factors.personnel / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Time Pressure
                          </span>
                          <span>{pmGRATS.factors.timePressure} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(pmGRATS.factors.timePressure / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            Operation Complexity
                          </span>
                          <span>{pmGRATS.factors.complexity} / 10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${(pmGRATS.factors.complexity / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground">{pmGRATS.notes}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Assessment
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-3 h-3 mr-1" />
                      View History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  New AM Assessment
                </Button>
                <Button className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  New PM Assessment
                </Button>
                <Button className="w-full" variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View All History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cars" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cars Currently in Hangar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hangarCars.map((car) => (
                  <Card key={car.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Car className="w-6 h-6 text-blue-600" />
                        <div>
                          <div className="font-medium">{car.make} {car.model}</div>
                          <div className="text-sm text-muted-foreground">{car.color} • {car.licensePlate}</div>
                          <div className="text-sm text-muted-foreground">Owner: {car.owner}</div>
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1 justify-end mb-1">
                          <MapPin className="w-3 h-3" />
                          {car.location}
                        </div>
                        <div className="text-muted-foreground">
                          Checked in: {new Date(car.checkedIn).toLocaleString()}
                        </div>
                        {car.flightAssignment && (
                          <Badge variant="outline" className="mt-1">
                            Flight: {car.flightAssignment}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/car-tracking" className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Manage Car Tracking
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel" className="space-y-6">
          {/* Fuel Farm Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="w-5 h-5" />
                Fuel Farm Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Level</span>
                    <span className={`text-sm ${fuelStatus.color}`}>{fuelStatus.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={fuelStatus.color}>
                      {fuelFarmData.currentLevel.toLocaleString()} gal
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {fuelPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${fuelStatus.bgColor}`}
                      style={{ width: `${fuelPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Capacity: {fuelFarmData.totalCapacity.toLocaleString()} gal
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2 text-red-600">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm">Monthly Usage</span>
                  </div>
                  <span className="text-xl">{fuelFarmData.monthlyUsage.toLocaleString()} gal</span>
                  <span className="text-xs text-muted-foreground">February 2024</span>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Last Updated</span>
                  </div>
                  <span className="text-sm">{new Date(fuelFarmData.lastUpdated).toLocaleDateString()}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(fuelFarmData.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {fuelStatus.status === 'Critical' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">CRITICAL: Immediate fuel replenishment required</span>
                  </div>
                </div>
              )}

              {fuelStatus.status === 'Low' && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">LOW: Schedule fuel replenishment soon</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/fuel-farm" className="flex items-center gap-2">
                    <Fuel className="w-4 h-4" />
                    View Fuel Tracker
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fuel Load Requests Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="w-5 h-5" />
                Fuel Load Requests - Next 3 Days
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upcoming flights requiring fuel service
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fuelLoadRequests.map((request) => (
                  <Card key={request.id} className="p-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{request.flightNumber}</h4>
                          <Badge className={getFuelPriorityColor(request.priority)}>
                            {request.priority}
                          </Badge>
                          <Badge className={getFuelRequestStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <Plane className="w-3 h-3" />
                            {request.tailNumber} ({request.aircraft})
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            {request.departure} → {request.arrival}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {formatDate(request.date)} at {request.time}
                          </div>
                          <div className="flex items-center gap-2">
                            <Fuel className="w-3 h-3" />
                            {request.fuelRequested}k lbs
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          <p><strong>Requested by:</strong> {request.requestedBy}</p>
                          {request.notes && (
                            <p><strong>Notes:</strong> {request.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {request.status === 'pending' && (
                          <Button size="sm">
                            Acknowledge
                          </Button>
                        )}
                        {request.status === 'acknowledged' && (
                          <Button size="sm" asChild>
                            <Link
                              to={`/fuel-farm?tailNumber=${encodeURIComponent(request.tailNumber)}&aircraft=${encodeURIComponent(request.aircraft)}&fuelAmount=${request.fuelRequested}&autoOpen=true`}
                            >
                              Start Fueling
                            </Link>
                          </Button>
                        )}
                        {request.status === 'in-progress' && (
                          <Button size="sm" variant="outline">
                            Mark Complete
                          </Button>
                        )}
                        {request.status === 'completed' && (
                          <Button size="sm" variant="outline" disabled>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by aircraft, task, or technician..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="inprogress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Tasks Table */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task ID</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Task Description</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id} className={task.aircraft === 'N789EF' ? 'bg-red-50' : ''}>
                        <TableCell className="font-medium">{task.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Plane className="w-4 h-4 text-muted-foreground" />
                            {task.aircraft}
                            {task.aircraft === 'N789EF' && (
                              <Badge className="bg-red-500 text-white text-xs">AOG</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {task.task}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.assignedTo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {task.actualHours}h / {task.estimatedHours}h
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${Math.min((task.actualHours / task.estimatedHours) * 100, 100)}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Maintenance Task Details - {task.id}</DialogTitle>
                                  <DialogDescription>
                                    Review detailed information, progress, and notes for this maintenance task.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <Label>Aircraft</Label>
                                      <p className="font-medium">{task.aircraft}</p>
                                    </div>
                                    <div>
                                      <Label>Task Type</Label>
                                      <p className="font-medium">{task.type}</p>
                                    </div>
                                    <div>
                                      <Label>Priority</Label>
                                      <Badge className={getPriorityColor(task.priority)}>
                                        {task.priority}
                                      </Badge>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <Badge className={getStatusColor(task.status)}>
                                        {task.status}
                                      </Badge>
                                    </div>
                                    <div>
                                      <Label>Assigned To</Label>
                                      <p className="font-medium">{task.assignedTo}</p>
                                    </div>
                                    <div>
                                      <Label>Due Date</Label>
                                      <p className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Description</Label>
                                    <p>{task.description}</p>
                                  </div>

                                  <div>
                                    <Label>Comments</Label>
                                    <p className="text-muted-foreground">{task.comments}</p>
                                  </div>

                                  <div className="flex gap-2 pt-4">
                                    <Button variant="outline">Update Status</Button>
                                    <Button variant="outline">Add Comment</Button>
                                    <Button>Log Hours</Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button variant="outline" size="sm">
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredTasks.length === 0 && (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No maintenance tasks match the current filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}