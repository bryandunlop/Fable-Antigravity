import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Plane,
    ClipboardList,
    AlertTriangle,
    Wrench,
    HardHat,
    ArrowRightLeft,
    BarChart3,
    AlertOctagon,
    CheckCircle2,
    Clock,
    ArrowRight,
    Activity,
    Shield,
    FileText,
    ChevronRight,
    Zap,
    Users,
    TrendingUp,
} from 'lucide-react';
import { useMaintenanceWorkflow } from './context/MaintenanceWorkflowContext';
import { formatDistanceToNow } from 'date-fns';

// ============================================================
// AVIASYNC DASHBOARD — Landing Page
// ============================================================

export default function AviaSyncDashboard() {
    const navigate = useNavigate();
    const { aircraft, stats, activityFeed, predictiveAlerts, workOrders, deferrals, loading } = useMaintenanceWorkflow();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading AviaSync...</p>
                </div>
            </div>
        );
    }

    const workflowSteps = [
        { label: 'Pilot Report', icon: ClipboardList, color: 'from-blue-500/20 to-blue-600/5 border-blue-500/30', iconColor: 'text-blue-400', href: '/maintenance-workflow/tech-log' },
        { label: 'MEL Assessment', icon: AlertTriangle, color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30', iconColor: 'text-amber-400', href: '/maintenance-workflow/mel' },
        { label: 'Work Order', icon: Wrench, color: 'from-violet-500/20 to-violet-600/5 border-violet-500/30', iconColor: 'text-violet-400', href: '/maintenance-workflow/work-orders' },
        { label: 'Tech Execution', icon: HardHat, color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30', iconColor: 'text-emerald-400', href: '/maintenance-workflow/technician' },
        { label: 'Shift Handover', icon: ArrowRightLeft, color: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30', iconColor: 'text-cyan-400', href: '/maintenance-workflow/handover' },
        { label: 'Analytics', icon: BarChart3, color: 'from-rose-500/20 to-rose-600/5 border-rose-500/30', iconColor: 'text-rose-400', href: '/maintenance-workflow/analytics' },
    ];

    const quickStats = [
        { label: 'Open Squawks', value: stats.openSquawks, icon: ClipboardList, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
        { label: 'Active MELs', value: stats.activeDeferrals, icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
        { label: 'In-Progress WOs', value: stats.inProgressWOs, icon: Wrench, color: 'text-violet-400', bgColor: 'bg-violet-500/10' },
        { label: 'AOG Events', value: stats.aogCount, icon: AlertOctagon, color: stats.aogCount > 0 ? 'text-red-400' : 'text-emerald-400', bgColor: stats.aogCount > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10' },
        { label: 'Techs On Shift', value: stats.techsClockedIn, icon: Users, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
        { label: 'Pending Handovers', value: stats.pendingHandovers, icon: ArrowRightLeft, color: stats.pendingHandovers > 0 ? 'text-orange-400' : 'text-emerald-400', bgColor: stats.pendingHandovers > 0 ? 'bg-orange-500/10' : 'bg-emerald-500/10' },
    ];

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'squawk': return <ClipboardList className="w-3.5 h-3.5 text-blue-400" />;
            case 'deferral': return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
            case 'work-order': return <Wrench className="w-3.5 h-3.5 text-violet-400" />;
            case 'clock': return <Clock className="w-3.5 h-3.5 text-emerald-400" />;
            case 'handover': return <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />;
            case 'sign-off': return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
            case 'alert': return <Zap className="w-3.5 h-3.5 text-rose-400" />;
            default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'green': return 'bg-emerald-500';
            case 'amber': return 'bg-amber-500';
            case 'red': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-500/30">
                            <Shield className="w-6 h-6 text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">AviaSync</h1>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Maintenance Workflow Engine</p>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-xl">
                        Closed-loop maintenance lifecycle — from pilot defect reporting through airworthiness release.
                        Powered by CAMP Systems integration and predictive analytics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1.5 text-xs border-teal-500/30 text-teal-400 bg-teal-500/5">
                        <Activity className="w-3 h-3 mr-1.5" />
                        Live Demo
                    </Badge>
                    <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-muted-foreground">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Workflow Stepper */}
            <Card className="glass-premium border-white/10 overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <FileText className="w-4 h-4 text-teal-400" />
                        <h2 className="text-sm font-semibold text-foreground">Maintenance Lifecycle</h2>
                        <span className="text-xs text-muted-foreground ml-2">Click any step to explore</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        {workflowSteps.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <React.Fragment key={step.label}>
                                    <button
                                        onClick={() => navigate(step.href)}
                                        className={`flex-1 group relative p-4 rounded-xl bg-gradient-to-b ${step.color} border transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-pointer`}
                                    >
                                        <div className="flex flex-col items-center gap-2.5">
                                            <div className={`p-2 rounded-lg bg-background/50 ${step.iconColor} group-hover:scale-110 transition-transform`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs font-medium text-foreground/90">{step.label}</span>
                                        </div>
                                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    </button>
                                    {i < workflowSteps.length - 1 && (
                                        <ArrowRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Stats + Fleet Row */}
            <div className="grid grid-cols-6 gap-3">
                {quickStats.map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="glass-premium rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                                    <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                                </div>
                            </div>
                            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Main Grid: Fleet Status + Activity + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Fleet Status */}
                <Card className="glass-premium border-white/10">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Plane className="w-4 h-4 text-teal-400" />
                                Fleet Status
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {aircraft.map(ac => (
                                <div key={ac.tailNumber} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(ac.currentStatus)} shadow-lg`} />
                                        <div>
                                            <div className="text-sm font-semibold">{ac.tailNumber}</div>
                                            <div className="text-xs text-muted-foreground">{ac.modelType}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground">{ac.totalHours.toLocaleString()} hrs</div>
                                        <div className="text-xs text-muted-foreground">{ac.totalCycles.toLocaleString()} cyc</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card className="glass-premium border-white/10">
                    <CardContent className="p-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                            <Activity className="w-4 h-4 text-teal-400" />
                            Recent Activity
                        </h3>
                        <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                            {activityFeed.slice(0, 10).map(event => (
                                <div key={event.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                                    <div className="mt-0.5 flex-shrink-0">{getActivityIcon(event.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-foreground/90 leading-relaxed">{event.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-muted-foreground">{event.actor}</span>
                                            <span className="text-[10px] text-muted-foreground/50">•</span>
                                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(event.timestamp, { addSuffix: true })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Predictive Alerts */}
                <Card className="glass-premium border-white/10">
                    <CardContent className="p-5">
                        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-teal-400" />
                            Predictive Alerts
                        </h3>
                        <div className="space-y-3">
                            {predictiveAlerts.map(alert => (
                                <div
                                    key={alert.id}
                                    className={`p-3 rounded-lg border transition-colors ${alert.severity === 'high'
                                            ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                                            : alert.severity === 'medium'
                                                ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                                                : 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold">{alert.component}</span>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] px-1.5 ${alert.severity === 'high' ? 'border-red-500/30 text-red-400' :
                                                    alert.severity === 'medium' ? 'border-amber-500/30 text-amber-400' :
                                                        'border-blue-500/30 text-blue-400'
                                                }`}
                                        >
                                            {alert.severity}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] text-muted-foreground">{alert.aircraftTail}</span>
                                        <span className="text-[10px] text-muted-foreground/50">•</span>
                                        <span className="text-[10px] text-muted-foreground">ATA {alert.ataCode}</span>
                                    </div>
                                    {/* Progress bar toward risk threshold */}
                                    <div className="w-full bg-white/5 rounded-full h-1.5 mb-1.5">
                                        <div
                                            className={`h-1.5 rounded-full transition-all ${alert.severity === 'high' ? 'bg-red-500' :
                                                    alert.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                                                }`}
                                            style={{ width: `${Math.min((alert.currentHours / alert.failureIntervalHours) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>{alert.currentHours.toLocaleString()} FH</span>
                                        <span>{alert.failureIntervalHours.toLocaleString()} FH threshold</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-3 text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"
                            onClick={() => navigate('/maintenance-workflow/analytics')}
                        >
                            View Full Analytics
                            <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* AOG Banner (if any) */}
            {stats.aogCount > 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between animate-pulse-slow">
                    <div className="flex items-center gap-3">
                        <AlertOctagon className="w-5 h-5 text-red-400" />
                        <div>
                            <span className="text-sm font-semibold text-red-400">Aircraft on Ground</span>
                            <span className="text-xs text-muted-foreground ml-2">
                                {workOrders.filter(w => w.priority === 'aog' && w.status !== 'closed').map(w => `${w.aircraftTail} — ${w.title}`).join(' | ')}
                            </span>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => navigate('/maintenance-workflow/work-orders')}
                    >
                        View AOG WO
                    </Button>
                </div>
            )}
        </div>
    );
}
