import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Plane, AlertTriangle,
  Users, Wrench, FileCheck, Clock, DollarSign,
  CheckCircle, XCircle, Activity, Zap, Target,
  ThermometerSun, Fuel, Calendar, Award, Shield,
  Search, Bell, Menu, LayoutGrid, Settings, ChevronDown
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- Types & Interfaces ---

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  subtitle?: string;
  delay?: number;
}

interface GaugeCardProps {
  title: string;
  value: number;
  max: number;
  unit: string;
  icon: any;
  status?: 'good' | 'warning' | 'critical';
  delay?: number;
}

// --- Mock Data Generators ---

const generateMockData = () => {
  return {
    // Fleet Operations
    fleetUtilization: 87.5,
    fleetUtilizationTrend: 'up',
    activeFlights: 4,
    totalFleet: 8,
    flightHoursToday: 28.5,
    flightHoursWeek: 156.3,
    flightHoursTrend: 'up',
    onTimePerformance: 94.2,
    onTimeTrend: 'down',
    avgTurnaroundTime: 2.3,
    turnaroundTrend: 'up',
    dispatchReliability: 97.8,
    dispatchTrend: 'up',

    // Seat Availability
    flightsFullPercent: 33,
    avgOpenSeats: 2.7,
    seatAvailabilityTrend: 'stable',

    // Safety & Risk
    fratGreen: 145,
    fratYellow: 23,
    fratRed: 3,
    avgFratScore: 22.4,
    activeWeatherAlerts: 2,
    safetyReportsMonth: 5,
    daysSinceIncident: 847,
    complianceRate: 98.5,
    complianceTrend: 'up',

    // Aircraft Health
    aircraftOperational: 7,
    aircraftMaintenance: 1,
    aogHours: 0,
    openMaintenanceCritical: 2,
    openMaintenanceRoutine: 8,
    maintenanceCompletionRate: 96.3,
    maintenanceTrend: 'up',

    // Crew Readiness
    availablePilots: 12,
    availableInflight: 8,
    avgDutyTimeRemaining: 6.2,
    certsExpiring30Days: 3,
    avgCrewFlightHours: 68.5,

    // Passenger Operations
    passengerLoadFactor: 76.3,
    vipFlightsToday: 2,
    avgPassengerRating: 4.8,
    passengerRatingTrend: 'up',

    // Resource Management
    fuelEfficiencyVariance: -2.3, // negative is good (under planned)
    avgCostPerFlightHour: 4250,
    costTrend: 'down',
    fuelLoadsPending: 3,
    documentsExpiring: 7,

    // Scheduling
    scheduleAdherence: 95.8,
    scheduleAdherenceTrend: 'up',
    avgBookingLeadTime: 14.5,
    activeDelays: 1,
    crewOnDuty: 16
  };
};

const generateFlightHoursChart = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => ({
    day,
    hours: Math.floor(Math.random() * 30) + 20,
    planned: Math.floor(Math.random() * 35) + 18
  }));
};

const generateFratTrendChart = () => {
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    score: Math.random() * 10 + 18
  }));
};

const generateUtilizationByAircraft = () => {
  return [
    { tail: 'N650GA', hours: 145.5, utilization: 92 },
    { tail: 'N650GB', hours: 138.2, utilization: 88 },
    { tail: 'N650GC', hours: 142.7, utilization: 90 },
    { tail: 'N650GD', hours: 125.3, utilization: 79 },
    { tail: 'N650GE', hours: 156.8, utilization: 99 },
    { tail: 'N650GF', hours: 148.9, utilization: 94 },
    { tail: 'N650GG', hours: 132.1, utilization: 84 },
    { tail: 'N650GH', hours: 0, utilization: 0, status: 'Maintenance' }
  ];
};

const generateTopRoutes = () => {
  return [
    { route: 'KTEB - KMIA', flights: 28, hours: 56 },
    { route: 'KPBI - KTEB', flights: 24, hours: 48 },
    { route: 'KBOS - KMCO', flights: 18, hours: 36 },
    { route: 'KIAH - KJFK', flights: 16, hours: 32 },
    { route: 'KLAS - KSEA', flights: 14, hours: 35 }
  ];
};

// --- Modern Fluid Components ---

const LiquidCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <div
    className={`
      relative overflow-hidden rounded-3xl 
      bg-slate-900/40 backdrop-blur-xl 
      border border-white/5 ring-1 ring-white/10
      transition-all duration-300 ease-out
      hover:scale-[1.02] hover:shadow-[0_0_30px_-5px_var(--color-pg-blue)]/20 hover:bg-slate-800/50
      animate-in fade-in slide-in-from-bottom-4 fill-mode-forwards
      ${className}
    `}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    {children}
  </div>
);

const TrendIndicator = ({ trend, value }: { trend: 'up' | 'down' | 'stable', value?: string }) => {
  const getColors = () => {
    if (trend === 'up') return 'text-emerald-400 bg-emerald-400/10';
    if (trend === 'down') return 'text-rose-400 bg-rose-400/10';
    return 'text-slate-400 bg-slate-400/10';
  };

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getColors()}`}>
      <Icon className="w-3.5 h-3.5" />
      {value && <span>{value}</span>}
    </div>
  );
};

const MetricCard = ({
  title, value, unit, icon: Icon, trend, trendValue, status = 'neutral', subtitle, delay
}: MetricCardProps) => {
  const getIconColor = () => {
    switch (status) {
      case 'good': return 'text-emerald-400';
      case 'warning': return 'text-[var(--color-pg-yellow)]';
      case 'critical': return 'text-rose-400';
      default: return 'text-[var(--color-pg-cyan)]';
    }
  };

  return (
    <LiquidCard delay={delay} className="p-5 flex flex-col justify-between h-full group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors ${getIconColor()}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && <TrendIndicator trend={trend} value={trendValue} />}
      </div>

      <div>
        <div className="text-3xl font-mono tracking-tight text-white mb-1">
          {value}
          {unit && <span className="ml-1.5 text-sm font-sans text-slate-400 font-normal">{unit}</span>}
        </div>
        <div className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
      </div>
    </LiquidCard>
  );
};

const GaugeCard = ({ title, value, max, unit, icon: Icon, status, delay }: GaugeCardProps) => {
  const percentage = Math.min((value / max) * 100, 100);

  const getColor = () => {
    if (status === 'good' || percentage >= 90) return 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]';
    if (status === 'warning' || percentage >= 70) return 'bg-[var(--color-pg-yellow)] shadow-[0_0_15px_rgba(254,219,0,0.4)]';
    return 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
  };

  return (
    <LiquidCard delay={delay} className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-2xl bg-white/5 text-[var(--color-pg-cyan)]">
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-sm font-medium text-slate-400">{title}</div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-3xl font-mono text-white">{value}</span>
        <span className="text-sm text-slate-500">/ {max}</span>
      </div>

      <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-right text-xs text-slate-400 mt-2">{percentage.toFixed(1)}% {unit}</div>
    </LiquidCard>
  );
};

// --- Main Dashboard Component ---

export default function LiveMetricsDashboard() {
  const [data, setData] = useState(generateMockData());
  const [flightHoursData] = useState(generateFlightHoursChart());
  const [fratTrendData] = useState(generateFratTrendChart());
  const [utilizationData] = useState(generateUtilizationByAircraft());
  const [topRoutes] = useState(generateTopRoutes());
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(generateMockData());
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOTPStatus = (value: number) => {
    if (value >= 95) return 'good';
    if (value >= 85) return 'warning';
    return 'critical';
  };

  const getComplianceStatus = (value: number) => {
    if (value >= 98) return 'good';
    if (value >= 95) return 'warning';
    return 'critical';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-xl">
          <p className="text-slate-300 text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-mono" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground pb-20">

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl">
        <div className="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-pg-blue)] to-[var(--color-pg-blue-vivid)] flex items-center justify-center shadow-[0_0_15px_var(--color-pg-blue)]">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide uppercase">P&G Global Flight Ops</h1>
                <div className="text-[10px] text-[var(--color-pg-cyan)] tracking-wider">LIVE DASHBOARD</div>
              </div>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex gap-1">
              {['Overview', 'Fleet', 'Crew', 'Maintenance', 'Schedule'].map((item, i) => (
                <button
                  key={item}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${i === 0
                    ? 'bg-white/10 text-white ring-1 ring-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              SYSTEMS NORMAL
            </div>

            <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--color-pg-yellow)] rounded-full shadow-[0_0_8px_var(--color-pg-yellow)]" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 ring-2 ring-white/5" />
          </div>
        </div>
      </nav>

      <div className="max-w-[1920px] mx-auto p-8 space-y-8">

        {/* Header Section */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-4xl font-light text-white mb-2">Fleet Overview</h2>
            <p className="text-slate-400">Real-time telemetry and operational metrics</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono text-white tracking-widest">{lastUpdate.toLocaleTimeString([], { hour12: false })}</div>
            <div className="text-sm text-slate-500 uppercase tracking-widest">Zulu Time: {new Date().toISOString().split('T')[1].split('.')[0]}Z</div>
          </div>
        </div>

        {/* Fleet Operations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Fleet Utilization"
            value={data.fleetUtilization}
            unit="%"
            icon={Target}
            trend={data.fleetUtilizationTrend as any}
            trendValue="+2.3%"
            status={data.fleetUtilization >= 85 ? 'good' : 'warning'}
            delay={100}
          />
          <MetricCard
            title="Weekly Flight Hours"
            value={data.flightHoursWeek}
            unit="hrs"
            icon={Clock}
            trend={data.flightHoursTrend as any}
            trendValue="+12.5%"
            subtitle={`${data.flightHoursToday} hrs today`}
            delay={200}
          />
          <GaugeCard
            title="Active Fleet"
            value={data.activeFlights}
            max={data.totalFleet}
            unit="active"
            icon={Plane}
            status="good"
            delay={300}
          />
          <MetricCard
            title="On-Time Perf"
            value={`${data.onTimePerformance}%`}
            icon={CheckCircle}
            trend={data.onTimeTrend as any}
            trendValue="-1.2%"
            status={getOTPStatus(data.onTimePerformance) as any}
            delay={400}
          />
          <MetricCard
            title="Seat Availability"
            value={`${data.flightsFullPercent}%`}
            subtitle="Flights Full"
            icon={Users}
            trend={data.seatAvailabilityTrend as any}
            trendValue={`Avg ${data.avgOpenSeats} Open`}
            status="good"
            delay={450}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LiquidCard className="lg:col-span-2 p-6" delay={500}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-1">Flight Hours Analysis</h3>
                <p className="text-sm text-slate-400">Past 7 days vs Planned</p>
              </div>
              <select className="bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 px-3 py-1 outline-none focus:ring-1 focus:ring-[var(--color-pg-blue)]">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flightHoursData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-pg-blue-vivid)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-pg-blue-vivid)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="hours" stroke="var(--color-pg-blue-vivid)" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                  <Area type="monotone" dataKey="planned" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} fillOpacity={1} fill="url(#colorPlanned)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </LiquidCard>

          <LiquidCard className="p-6" delay={600}>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-medium text-white">Risk Profile (FRAT)</h3>
            </div>

            <div className="relative h-[200px] flex items-center justify-center mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Low Risk', value: data.fratGreen, color: '#10b981' },
                      { name: 'Medium Risk', value: data.fratYellow, color: '#facc15' },
                      { name: 'High Risk', value: data.fratRed, color: '#f43f5e' }
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {[0, 1, 2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', 'var(--color-pg-yellow)', '#f43f5e'][index]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-mono text-white font-bold">{data.avgFratScore}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Avg Score</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                  <span className="text-sm text-slate-300">Low Risk Flights</span>
                </div>
                <span className="text-white font-mono">{data.fratGreen}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-pg-yellow)] shadow-[0_0_8px_rgba(254,219,0,0.5)]" />
                  <span className="text-sm text-slate-300">Medium Risk</span>
                </div>
                <span className="text-white font-mono">{data.fratYellow}</span>
              </div>
            </div>
          </LiquidCard>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Avg Turnaround"
            value={data.avgTurnaroundTime}
            unit="hrs"
            icon={Clock}
            trend={data.turnaroundTrend as any}
            status="good"
            delay={700}
          />
          <MetricCard
            title="Maintenance"
            value={data.maintenanceCompletionRate}
            unit="%"
            icon={Wrench}
            trend="up"
            status="good"
            subtitle="Completion Rate"
            delay={800}
          />
          <MetricCard
            title="Crew Readiness"
            value={data.availablePilots}
            unit="pilots"
            icon={Users}
            status="good"
            subtitle={`${data.availableInflight} Inflight Available`}
            delay={900}
          />
          <MetricCard
            title="Cost / Flight Hr"
            value={`$${data.avgCostPerFlightHour.toLocaleString()}`}
            icon={DollarSign}
            trend={data.costTrend as any}
            trendValue="-3.2%"
            status="good"
            delay={1000}
          />
        </div>

        {/* Maintenance & Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LiquidCard className="lg:col-span-2 p-6" delay={1100}>
            <h3 className="text-lg font-medium text-white mb-6">Aircraft Utilization Report</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilizationData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="tail" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'white', opacity: 0.05 }} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {utilizationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.utilization > 90 ? 'var(--color-pg-blue-vivid)' : 'var(--color-pg-cyan)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </LiquidCard>

          <LiquidCard className="p-0 overflow-hidden" delay={1200}>
            <div className="p-6 border-b border-white/5 bg-white/5">
              <h3 className="text-lg font-medium text-white">Top Routes</h3>
              <p className="text-sm text-slate-400">Most frequent flight paths</p>
            </div>
            <div className="divide-y divide-white/5">
              {topRoutes.map((route, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-mono w-6 text-sm">0{i + 1}</span>
                    <div>
                      <div className="text-white font-medium group-hover:text-[var(--color-pg-cyan)] transition-colors">{route.route}</div>
                      <div className="text-xs text-slate-500">{route.flights} Flights</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-300 font-mono text-sm">{route.hours}h</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white/5 border-t border-white/5 text-center">
              <button className="text-sm text-[var(--color-pg-blue-vivid)] hover:text-white transition-colors">View All Routes</button>
            </div>
          </LiquidCard>
        </div>

      </div>
    </div>
  );
}