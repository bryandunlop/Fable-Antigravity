import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import {
    ArrowLeft,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Plane,
    Users,
    Clock,
    Calendar,
    Wrench,
    Shield,
    AlertTriangle,
    CheckCircle,
    Activity,
    Fuel,
    MapPin,
    UserCheck
} from 'lucide-react';

export default function ManagerInsights() {
    const navigate = useNavigate();
    const [opsTimeframe, setOpsTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

    // ─── OPERATIONS ANALYTICS DATA ─────────────────────────────

    const flightCompletionTrend = [
        { month: 'Sep', scheduled: 62, completed: 58, cancelled: 2, delayed: 2 },
        { month: 'Oct', scheduled: 68, completed: 63, cancelled: 1, delayed: 4 },
        { month: 'Nov', scheduled: 55, completed: 52, cancelled: 1, delayed: 2 },
        { month: 'Dec', scheduled: 70, completed: 64, cancelled: 3, delayed: 3 },
        { month: 'Jan', scheduled: 65, completed: 61, cancelled: 1, delayed: 3 },
        { month: 'Feb', scheduled: 72, completed: 68, cancelled: 2, delayed: 2 },
    ];

    const delayRootCauses = [
        { cause: 'Weather', count: 18, pct: 38, color: 'bg-blue-500' },
        { cause: 'Maintenance', count: 12, pct: 25, color: 'bg-orange-500' },
        { cause: 'ATC / NAS', count: 8, pct: 17, color: 'bg-purple-500' },
        { cause: 'Crew', count: 5, pct: 11, color: 'bg-cyan-500' },
        { cause: 'Passenger', count: 4, pct: 9, color: 'bg-yellow-500' },
    ];

    const topRoutes = [
        { route: 'KTEB → KMIA', flights: 24, avgBlock: '2h 45m', onTime: 96, fuelBurn: '1,850 gal' },
        { route: 'KJFK → EGLL', flights: 18, avgBlock: '7h 15m', onTime: 89, fuelBurn: '5,200 gal' },
        { route: 'KLAS → KSFO', flights: 15, avgBlock: '1h 30m', onTime: 100, fuelBurn: '980 gal' },
        { route: 'KTEB → KORD', flights: 12, avgBlock: '2h 10m', onTime: 92, fuelBurn: '1,420 gal' },
        { route: 'KMIA → KTEB', flights: 22, avgBlock: '2h 50m', onTime: 95, fuelBurn: '1,900 gal' },
    ];

    const opsKPIs = [
        { label: 'Total Flights', value: '392', change: '+8%', trend: 'up' },
        { label: 'On-Time Rate', value: '94.2%', change: '+2.1%', trend: 'up' },
        { label: 'Cancelled', value: '10', change: '-3', trend: 'up' },
        { label: 'Avg Delay', value: '22 min', change: '-5 min', trend: 'up' },
    ];

    // ─── CREW MANAGEMENT DATA ─────────────────────────────────

    const crewMembers = [
        { name: 'Capt. John Smith', role: 'PIC', status: 'On Duty', dutyHrs: 8.5, maxDuty: 14, flightHrs30d: 62, maxFlight: 100, currencyExpires: '2025-06-15', medical: '2025-08-20', training: 'Current' },
        { name: 'FO Sarah Wilson', role: 'SIC', status: 'Available', dutyHrs: 0, maxDuty: 14, flightHrs30d: 55, maxFlight: 100, currencyExpires: '2025-04-10', medical: '2025-07-15', training: 'Current' },
        { name: 'Capt. Mike Johnson', role: 'PIC', status: 'On Duty', dutyHrs: 6.2, maxDuty: 14, flightHrs30d: 71, maxFlight: 100, currencyExpires: '2025-09-22', medical: '2025-11-01', training: 'Due Mar 15' },
        { name: 'FO Tom Anderson', role: 'SIC', status: 'Rest', dutyHrs: 0, maxDuty: 14, flightHrs30d: 48, maxFlight: 100, currencyExpires: '2025-05-30', medical: '2025-09-10', training: 'Current' },
        { name: 'Capt. David Brown', role: 'PIC', status: 'Available', dutyHrs: 0, maxDuty: 14, flightHrs30d: 38, maxFlight: 100, currencyExpires: '2025-07-01', medical: '2025-12-20', training: 'Current' },
        { name: 'FO Emily Johnson', role: 'SIC', status: 'Vacation', dutyHrs: 0, maxDuty: 14, flightHrs30d: 0, maxFlight: 100, currencyExpires: '2025-03-28', medical: '2025-06-10', training: 'Current' },
        { name: 'Emily Davis', role: 'FA', status: 'On Duty', dutyHrs: 7.0, maxDuty: 14, flightHrs30d: 58, maxFlight: 120, currencyExpires: '2025-08-15', medical: 'N/A', training: 'Current' },
        { name: 'Lisa Martinez', role: 'FA', status: 'Available', dutyHrs: 0, maxDuty: 14, flightHrs30d: 42, maxFlight: 120, currencyExpires: '2025-05-20', medical: 'N/A', training: 'Due Apr 1' },
    ];

    const expiringCerts = crewMembers.filter(c => {
        const expDate = new Date(c.currencyExpires);
        const now = new Date();
        const daysUntil = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil < 60;
    });

    const upcomingTraining = crewMembers.filter(c => c.training !== 'Current');

    const crewByStatus = {
        onDuty: crewMembers.filter(c => c.status === 'On Duty').length,
        available: crewMembers.filter(c => c.status === 'Available').length,
        rest: crewMembers.filter(c => c.status === 'Rest').length,
        vacation: crewMembers.filter(c => c.status === 'Vacation').length,
    };

    // ─── FLEET DEEP-DIVE DATA ─────────────────────────────────

    const fleetData = [
        { tail: 'N1PG', type: 'G650', hrsThisMonth: 68, hrsLastMonth: 55, ytdHrs: 720, maintCost: 42000, lastInsp: '2025-01-15', nextInsp: 'Feb 28', openSquawks: 1, status: 'Active' },
        { tail: 'N2PG', type: 'G650', hrsThisMonth: 0, hrsLastMonth: 72, ytdHrs: 680, maintCost: 85000, lastInsp: '2025-02-01', nextInsp: 'In Progress', openSquawks: 3, status: 'Maintenance' },
        { tail: 'N3PG', type: 'G500', hrsThisMonth: 45, hrsLastMonth: 38, ytdHrs: 510, maintCost: 28000, lastInsp: '2024-12-10', nextInsp: 'Mar 15', openSquawks: 0, status: 'Active' },
        { tail: 'N4PG', type: 'G500', hrsThisMonth: 52, hrsLastMonth: 49, ytdHrs: 590, maintCost: 31000, lastInsp: '2025-01-05', nextInsp: 'Mar 20', openSquawks: 1, status: 'Active' },
        { tail: 'N5PG', type: 'G500', hrsThisMonth: 61, hrsLastMonth: 58, ytdHrs: 640, maintCost: 35000, lastInsp: '2024-11-20', nextInsp: 'Feb 10', openSquawks: 2, status: 'Active' },
        { tail: 'N6PG', type: 'G650', hrsThisMonth: 42, hrsLastMonth: 35, ytdHrs: 480, maintCost: 22000, lastInsp: '2025-01-25', nextInsp: 'Apr 1', openSquawks: 0, status: 'Active' },
    ];

    const inspectionTimeline = [
        { tail: 'N5PG', type: '200hr Phase', date: 'Feb 10', daysAway: 4, priority: 'high' },
        { tail: 'N1PG', type: '100hr Inspection', date: 'Feb 28', daysAway: 22, priority: 'medium' },
        { tail: 'N3PG', type: '200hr Phase', date: 'Mar 15', daysAway: 37, priority: 'low' },
        { tail: 'N4PG', type: 'Landing Gear Service', date: 'Mar 20', daysAway: 42, priority: 'low' },
        { tail: 'N6PG', type: '300hr Inspection', date: 'Apr 1', daysAway: 54, priority: 'low' },
    ];

    const squawkHistory = [
        { tail: 'N2PG', item: 'Left engine vibration', status: 'Open', priority: 'critical', daysOpen: 3 },
        { tail: 'N2PG', item: 'APU start fault', status: 'Open', priority: 'high', daysOpen: 5 },
        { tail: 'N2PG', item: 'FMS software anomaly', status: 'Open', priority: 'medium', daysOpen: 2 },
        { tail: 'N5PG', item: 'Cabin pressure controller intermittent', status: 'Open', priority: 'high', daysOpen: 7 },
        { tail: 'N5PG', item: 'Weather radar weak returns', status: 'Open', priority: 'medium', daysOpen: 4 },
        { tail: 'N1PG', item: 'Autopilot trim runaway', status: 'Open', priority: 'high', daysOpen: 1 },
        { tail: 'N4PG', item: 'Nose wheel shimmy on landing', status: 'Open', priority: 'medium', daysOpen: 10 },
    ];

    // ─── HELPERS ───────────────────────────────────────────────

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'on duty': return 'bg-blue-100 text-blue-800';
            case 'available': return 'bg-green-100 text-green-800';
            case 'rest': return 'bg-yellow-100 text-yellow-800';
            case 'vacation': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
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

    const maxBar = Math.max(...flightCompletionTrend.map(m => m.scheduled));

    // ─── RENDER ────────────────────────────────────────────────

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigate('/lead-dashboard')}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Dashboard
                </Button>
                <div>
                    <h1>Manager Insights</h1>
                    <p className="text-muted-foreground">Deep-dive analytics and operational intelligence</p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="operations" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="operations" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Operations Analytics
                    </TabsTrigger>
                    <TabsTrigger value="crew" className="flex items-center gap-2">
                        <Users className="w-4 h-4" /> Crew Management
                    </TabsTrigger>
                    <TabsTrigger value="fleet" className="flex items-center gap-2">
                        <Plane className="w-4 h-4" /> Fleet Deep-Dive
                    </TabsTrigger>
                </TabsList>

                {/* ══════════════════════════════════════════════════════
            TAB 1: OPERATIONS ANALYTICS
            ══════════════════════════════════════════════════════ */}
                <TabsContent value="operations" className="space-y-6">

                    {/* KPI Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {opsKPIs.map((kpi, i) => (
                            <Card key={i}>
                                <CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                                    <div className="flex items-end justify-between">
                                        <span className="text-2xl font-bold">{kpi.value}</span>
                                        <span className={`text-xs flex items-center gap-0.5 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                            {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {kpi.change}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Flight Completion Trend (Bar Chart) */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Flight Completion Trend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {flightCompletionTrend.map(m => {
                                        const completionRate = Math.round((m.completed / m.scheduled) * 100);
                                        return (
                                            <div key={m.month} className="flex items-center gap-3">
                                                <span className="w-8 text-xs font-medium text-muted-foreground">{m.month}</span>
                                                <div className="flex-1 flex items-center gap-1 h-6">
                                                    <div className="h-full bg-green-400 rounded-l" style={{ width: `${(m.completed / maxBar) * 100}%` }} title={`${m.completed} completed`} />
                                                    <div className="h-full bg-orange-400" style={{ width: `${(m.delayed / maxBar) * 100}%` }} title={`${m.delayed} delayed`} />
                                                    <div className="h-full bg-red-400 rounded-r" style={{ width: `${(m.cancelled / maxBar) * 100}%` }} title={`${m.cancelled} cancelled`} />
                                                </div>
                                                <span className="w-16 text-right text-xs">
                                                    <span className="font-semibold">{completionRate}%</span>
                                                    <span className="text-muted-foreground ml-1">({m.scheduled})</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t">
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400" /> Completed</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-400" /> Delayed</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> Cancelled</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Delay Root Causes */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Delay Root Causes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {delayRootCauses.map(cause => (
                                        <div key={cause.cause}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">{cause.cause}</span>
                                                <span className="text-xs text-muted-foreground">{cause.count} delays ({cause.pct}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div className={`${cause.color} h-2.5 rounded-full transition-all`} style={{ width: `${cause.pct}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Routes Table */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Top Routes by Frequency</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-2 font-semibold text-muted-foreground">Route</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">Flights</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">Avg Block</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">On-Time %</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-right">Avg Fuel</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topRoutes.map((r, i) => (
                                            <tr key={i} className="border-b last:border-0">
                                                <td className="py-2.5 font-medium">{r.route}</td>
                                                <td className="py-2.5 text-center">{r.flights}</td>
                                                <td className="py-2.5 text-center text-muted-foreground">{r.avgBlock}</td>
                                                <td className="py-2.5 text-center">
                                                    <span className={`font-medium ${r.onTime >= 95 ? 'text-green-600' : r.onTime >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                        {r.onTime}%
                                                    </span>
                                                </td>
                                                <td className="py-2.5 text-right text-muted-foreground">{r.fuelBurn}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ══════════════════════════════════════════════════════
            TAB 2: CREW MANAGEMENT
            ══════════════════════════════════════════════════════ */}
                <TabsContent value="crew" className="space-y-6">

                    {/* Crew Status Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="border-blue-200 bg-blue-50/30">
                            <CardContent className="p-4 text-center">
                                <p className="text-2xl font-bold text-blue-700">{crewByStatus.onDuty}</p>
                                <p className="text-xs text-blue-600">On Duty</p>
                            </CardContent>
                        </Card>
                        <Card className="border-green-200 bg-green-50/30">
                            <CardContent className="p-4 text-center">
                                <p className="text-2xl font-bold text-green-700">{crewByStatus.available}</p>
                                <p className="text-xs text-green-600">Available</p>
                            </CardContent>
                        </Card>
                        <Card className="border-yellow-200 bg-yellow-50/30">
                            <CardContent className="p-4 text-center">
                                <p className="text-2xl font-bold text-yellow-700">{crewByStatus.rest}</p>
                                <p className="text-xs text-yellow-600">On Rest</p>
                            </CardContent>
                        </Card>
                        <Card className="border-purple-200 bg-purple-50/30">
                            <CardContent className="p-4 text-center">
                                <p className="text-2xl font-bold text-purple-700">{crewByStatus.vacation}</p>
                                <p className="text-xs text-purple-600">Vacation</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Crew Detail Table */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Crew Status & Duty Tracking</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-2 font-semibold text-muted-foreground">Name</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">Role</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">Status</th>
                                            <th className="pb-2 font-semibold text-muted-foreground">Duty Time</th>
                                            <th className="pb-2 font-semibold text-muted-foreground">30d Flight Hrs</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">Training</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {crewMembers.map((c, i) => {
                                            const dutyPct = (c.dutyHrs / c.maxDuty) * 100;
                                            const flightPct = (c.flightHrs30d / c.maxFlight) * 100;
                                            return (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="py-2.5 font-medium">{c.name}</td>
                                                    <td className="py-2.5 text-center">
                                                        <Badge variant="outline" className="text-xs">{c.role}</Badge>
                                                    </td>
                                                    <td className="py-2.5 text-center">
                                                        <Badge className={`${getStatusColor(c.status)} text-[10px]`}>{c.status}</Badge>
                                                    </td>
                                                    <td className="py-2.5">
                                                        {c.status === 'On Duty' ? (
                                                            <div className="flex items-center gap-2">
                                                                <Progress value={dutyPct} className={`h-1.5 w-20 ${dutyPct > 80 ? '[&>div]:bg-red-500' : ''}`} />
                                                                <span className="text-xs text-muted-foreground">{c.dutyHrs}/{c.maxDuty}h</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={flightPct} className={`h-1.5 w-20 ${flightPct > 80 ? '[&>div]:bg-orange-500' : ''}`} />
                                                            <span className="text-xs text-muted-foreground">{c.flightHrs30d}/{c.maxFlight}h</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 text-center">
                                                        {c.training === 'Current' ? (
                                                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                                        ) : (
                                                            <Badge className="bg-orange-100 text-orange-800 text-[10px]">{c.training}</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Expiring Certificates */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    Certificates Expiring Soon
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {expiringCerts.length > 0 ? (
                                    <div className="space-y-2">
                                        {expiringCerts.map((c, i) => {
                                            const daysUntil = Math.ceil((new Date(c.currencyExpires).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            return (
                                                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border bg-orange-50/50 border-orange-200">
                                                    <div>
                                                        <p className="font-medium text-sm">{c.name}</p>
                                                        <p className="text-xs text-muted-foreground">Currency expires {c.currencyExpires}</p>
                                                    </div>
                                                    <Badge className={daysUntil < 30 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                                                        {daysUntil} days
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">All certificates current</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Upcoming Training */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-blue-500" />
                                    Training Upcoming
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {upcomingTraining.length > 0 ? (
                                    <div className="space-y-2">
                                        {upcomingTraining.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border">
                                                <div>
                                                    <p className="font-medium text-sm">{c.name}</p>
                                                    <p className="text-xs text-muted-foreground">{c.role}</p>
                                                </div>
                                                <Badge className="bg-blue-100 text-blue-800 text-xs">{c.training}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">All training current</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ══════════════════════════════════════════════════════
            TAB 3: FLEET DEEP-DIVE
            ══════════════════════════════════════════════════════ */}
                <TabsContent value="fleet" className="space-y-6">

                    {/* Fleet Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Total Fleet</p>
                                <p className="text-2xl font-bold">{fleetData.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Hours This Month</p>
                                <p className="text-2xl font-bold">{fleetData.reduce((s, f) => s + f.hrsThisMonth, 0)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Open Squawks</p>
                                <p className="text-2xl font-bold text-orange-600">{squawkHistory.length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">YTD Maint. Cost</p>
                                <p className="text-2xl font-bold">${(fleetData.reduce((s, f) => s + f.maintCost, 0) / 1000).toFixed(0)}K</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Fleet Utilization Table */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Aircraft Utilization & Cost</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="pb-2 font-semibold text-muted-foreground">Tail</th>
                                            <th className="pb-2 font-semibold text-muted-foreground">Type</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">Status</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">This Month</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">Last Month</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">YTD Hours</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-right">Maint. Cost</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-center">Squawks</th>
                                            <th className="pb-2 font-semibold text-muted-foreground text-right">Next Insp.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fleetData.map(a => {
                                            const hrsChange = a.hrsThisMonth - a.hrsLastMonth;
                                            return (
                                                <tr key={a.tail} className="border-b last:border-0">
                                                    <td className="py-2.5 font-bold">{a.tail}</td>
                                                    <td className="py-2.5 text-muted-foreground">{a.type}</td>
                                                    <td className="py-2.5 text-center">
                                                        <Badge className={a.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                                                            {a.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2.5 text-center">
                                                        <span className="font-medium">{a.hrsThisMonth}h</span>
                                                        <span className={`ml-1 text-[10px] ${hrsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {hrsChange >= 0 ? '↑' : '↓'}{Math.abs(hrsChange)}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 text-center text-muted-foreground">{a.hrsLastMonth}h</td>
                                                    <td className="py-2.5 text-center font-medium">{a.ytdHrs}h</td>
                                                    <td className="py-2.5 text-right">${(a.maintCost / 1000).toFixed(0)}K</td>
                                                    <td className="py-2.5 text-center">
                                                        {a.openSquawks > 0 ? (
                                                            <Badge className="bg-orange-100 text-orange-800 text-xs">{a.openSquawks}</Badge>
                                                        ) : (
                                                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 text-right text-xs text-muted-foreground">{a.nextInsp}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Inspection Timeline */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    Upcoming Inspections
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {inspectionTimeline.map((insp, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-sm w-12">{insp.tail}</span>
                                                <div>
                                                    <p className="text-sm">{insp.type}</p>
                                                    <p className="text-xs text-muted-foreground">{insp.date}</p>
                                                </div>
                                            </div>
                                            <Badge className={getPriorityColor(insp.priority)}>
                                                {insp.daysAway}d away
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Open Squawks */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                    Open Squawks ({squawkHistory.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {squawkHistory.map((sq, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-sm w-12">{sq.tail}</span>
                                                <p className="text-sm">{sq.item}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Badge className={getPriorityColor(sq.priority)}>{sq.priority}</Badge>
                                                <span className="text-[10px] text-muted-foreground">{sq.daysOpen}d</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
