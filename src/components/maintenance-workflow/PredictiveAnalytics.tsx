import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    BarChart3, TrendingUp, AlertTriangle, Clock, Plane, Wrench, Activity,
    Shield, ChevronRight, Target, Zap, Timer, ArrowDown, ArrowUp
} from 'lucide-react';
import { useMaintenanceWorkflow } from './context/MaintenanceWorkflowContext';
import { format } from 'date-fns';

export default function PredictiveAnalytics() {
    const { predictiveAlerts, workOrders, timeLogs, aircraft, technicians } = useMaintenanceWorkflow();
    const [selectedTab, setSelectedTab] = useState<'alerts' | 'duration' | 'fleet'>('alerts');

    // Duration predictions — compare estimated vs predicted hours
    const durationAnalysis = useMemo(() => {
        return workOrders
            .filter(wo => wo.status !== 'closed')
            .map(wo => {
                const totalEstimated = wo.tasks.reduce((sum, t) => sum + t.estimatedDuration, 0);
                const totalPredicted = wo.tasks.reduce((sum, t) => sum + (t.predictedDuration || t.estimatedDuration), 0);
                const variance = totalPredicted - totalEstimated;
                const variancePct = totalEstimated > 0 ? (variance / totalEstimated) * 100 : 0;
                return { wo, totalEstimated, totalPredicted, variance, variancePct };
            })
            .sort((a, b) => b.variancePct - a.variancePct);
    }, [workOrders]);

    // Fleet health summary
    const fleetHealth = useMemo(() => {
        return aircraft.map(ac => {
            const acWorkOrders = workOrders.filter(w => w.aircraftTail === ac.tailNumber);
            const openWOs = acWorkOrders.filter(w => w.status !== 'closed').length;
            const aogActive = acWorkOrders.some(w => w.priority === 'aog' && w.status !== 'closed');
            const alerts = predictiveAlerts.filter(a => a.aircraftTail === ac.tailNumber);
            const highAlerts = alerts.filter(a => a.severity === 'high').length;
            return { ac, openWOs, aogActive, alerts, highAlerts };
        });
    }, [aircraft, workOrders, predictiveAlerts]);

    // Work time stats
    const workTimeStats = useMemo(() => {
        const completedLogs = timeLogs.filter(l => l.type === 'work' && l.durationMinutes);
        const totalMinutes = completedLogs.reduce((s, l) => s + (l.durationMinutes || 0), 0);
        const pauseLogs = timeLogs.filter(l => l.type === 'pause' && l.durationMinutes);
        const totalPauseMinutes = pauseLogs.reduce((s, l) => s + (l.durationMinutes || 0), 0);
        const pauseReasons = pauseLogs.reduce((acc, l) => {
            const reason = l.pauseReason || 'other';
            acc[reason] = (acc[reason] || 0) + (l.durationMinutes || 0);
            return acc;
        }, {} as Record<string, number>);
        return { totalMinutes, totalPauseMinutes, pauseReasons, logCount: completedLogs.length };
    }, [timeLogs]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', bar: 'bg-red-500' };
            case 'medium': return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', bar: 'bg-amber-500' };
            default: return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', bar: 'bg-blue-500' };
        }
    };

    const tabs = [
        { key: 'alerts', label: 'Component Alerts', icon: AlertTriangle },
        { key: 'duration', label: 'Duration Prediction', icon: Timer },
        { key: 'fleet', label: 'Fleet Health', icon: Shield },
    ] as const;

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-rose-400" />
                    Predictive Analytics
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Component failure interval flagging, task duration prediction, and fleet health overview</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="glass-premium rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-red-500/10"><AlertTriangle className="w-3.5 h-3.5 text-red-400" /></div>
                    </div>
                    <div className="text-2xl font-bold text-red-400">{predictiveAlerts.filter(a => a.severity === 'high').length}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">High-Risk Alerts</div>
                </div>
                <div className="glass-premium rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10"><Timer className="w-3.5 h-3.5 text-amber-400" /></div>
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{durationAnalysis.filter(d => d.variancePct > 15).length}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Schedule Risk WOs</div>
                </div>
                <div className="glass-premium rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10"><Clock className="w-3.5 h-3.5 text-emerald-400" /></div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{Math.floor(workTimeStats.totalMinutes / 60)}h</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total Work Logged</div>
                </div>
                <div className="glass-premium rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-violet-500/10"><Activity className="w-3.5 h-3.5 text-violet-400" /></div>
                    </div>
                    <div className="text-2xl font-bold text-violet-400">
                        {workTimeStats.totalMinutes > 0 ? Math.round((workTimeStats.totalMinutes / (workTimeStats.totalMinutes + workTimeStats.totalPauseMinutes)) * 100) : 0}%
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Wrench Time Ratio</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10 w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setSelectedTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all ${selectedTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {selectedTab === 'alerts' && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Component Failure Interval Flagging</h2>
                    <p className="text-xs text-muted-foreground">Components approaching statistically-significant failure intervals based on fleet data and OEM reliability reports.</p>
                    {predictiveAlerts.map(alert => {
                        const colors = getSeverityColor(alert.severity);
                        const progressPct = (alert.currentHours / alert.failureIntervalHours) * 100;
                        const riskPct = (alert.riskThresholdHours / alert.failureIntervalHours) * 100;

                        return (
                            <Card key={alert.id} className={`glass-premium ${colors.border} hover:border-current/40 transition-all`}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${colors.bg}`}>
                                                <Zap className={`w-4 h-4 ${colors.text}`} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">{alert.component}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {alert.aircraftTail} • ATA {alert.ataCode}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`${colors.text} ${colors.border} ${colors.bg} text-[10px]`}>
                                            {alert.severity.toUpperCase()}
                                        </Badge>
                                    </div>

                                    {/* Progress Bar with Risk Threshold Marker */}
                                    <div className="relative">
                                        <div className="w-full bg-white/5 rounded-full h-3 relative overflow-visible">
                                            <div
                                                className={`h-3 rounded-full ${colors.bar} transition-all relative`}
                                                style={{ width: `${Math.min(progressPct, 100)}%` }}
                                            />
                                            {/* Risk threshold marker */}
                                            <div
                                                className="absolute top-0 w-0.5 h-3 bg-amber-400"
                                                style={{ left: `${riskPct}%` }}
                                                title={`Risk threshold: ${alert.riskThresholdHours} FH`}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1 text-[10px]">
                                            <span className="text-muted-foreground">0 FH</span>
                                            <span className={colors.text}>{alert.currentHours.toLocaleString()} FH current</span>
                                            <span className="text-muted-foreground">{alert.failureIntervalHours.toLocaleString()} FH interval</span>
                                        </div>
                                    </div>

                                    {/* Recommendation */}
                                    <div className={`p-3 rounded-lg ${colors.bg} ${colors.border} border`}>
                                        <span className={`text-[10px] font-semibold ${colors.text} uppercase tracking-wider`}>Recommendation</span>
                                        <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{alert.recommendation}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {selectedTab === 'duration' && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Task Duration Prediction</h2>
                    <p className="text-xs text-muted-foreground">AI/ML-predicted task durations vs. book-time estimates. Schedule risk flagged when predicted exceeds estimate by &gt;15%.</p>
                    {durationAnalysis.map(({ wo, totalEstimated, totalPredicted, variance, variancePct }) => (
                        <Card key={wo.id} className={`glass-premium ${variancePct > 15 ? 'border-orange-500/20' : 'border-white/10'} transition-all hover:border-white/20`}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-muted-foreground">{wo.woNumber}</span>
                                            {wo.priority === 'aog' && <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400 bg-red-500/10">AOG</Badge>}
                                        </div>
                                        <p className="text-sm font-medium mt-0.5">{wo.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                            <Plane className="w-3 h-3" /> {wo.aircraftTail}
                                            <span>•</span>
                                            <span>{wo.tasks.length} tasks</span>
                                        </div>
                                    </div>
                                    {variancePct > 15 ? (
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-orange-400 text-xs font-medium">
                                                <ArrowUp className="w-3 h-3" />
                                                +{variancePct.toFixed(0)}%
                                            </div>
                                            <span className="text-[10px] text-orange-400">Schedule Risk</span>
                                        </div>
                                    ) : variancePct < -5 ? (
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                                <ArrowDown className="w-3 h-3" />
                                                {variancePct.toFixed(0)}%
                                            </div>
                                            <span className="text-[10px] text-emerald-400">Ahead of Schedule</span>
                                        </div>
                                    ) : (
                                        <div className="text-right text-[10px] text-muted-foreground">On Track</div>
                                    )}
                                </div>

                                {/* Book vs Predicted Bar */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between text-[10px] mb-1">
                                            <span className="text-muted-foreground">Book Time</span>
                                            <span className="font-medium">{totalEstimated}h</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-2">
                                            <div className="h-2 rounded-full bg-blue-500" style={{ width: '100%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between text-[10px] mb-1">
                                            <span className="text-muted-foreground">Predicted</span>
                                            <span className={`font-medium ${variancePct > 15 ? 'text-orange-400' : ''}`}>{totalPredicted}h</span>
                                        </div>
                                        <div className="w-full bg-white/5 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${variancePct > 15 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min((totalPredicted / totalEstimated) * 100, 150)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Per-task breakdown */}
                                <div className="mt-3 space-y-1">
                                    {wo.tasks.map(task => {
                                        const taskVar = task.predictedDuration ? task.predictedDuration - task.estimatedDuration : 0;
                                        const taskVarPct = task.estimatedDuration > 0 ? (taskVar / task.estimatedDuration) * 100 : 0;
                                        return (
                                            <div key={task.id} className="flex items-center gap-3 text-[10px] p-1.5 rounded bg-white/[0.02]">
                                                <Badge variant="outline" className={`text-[9px] font-mono ${task.source === 'CAMP' ? 'border-cyan-500/30 text-cyan-400' : 'border-white/10 text-muted-foreground'}`}>
                                                    {task.source}
                                                </Badge>
                                                <span className="flex-1 truncate">{task.description}</span>
                                                <span className="text-muted-foreground">{task.estimatedDuration}h</span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className={taskVarPct > 15 ? 'text-orange-400 font-medium' : ''}>
                                                    {task.predictedDuration || task.estimatedDuration}h
                                                </span>
                                                {taskVarPct > 15 && <span className="text-orange-400">+{taskVarPct.toFixed(0)}%</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Pause Time Analysis */}
                    <Card className="glass-premium border-white/10">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <Clock className="w-4 h-4 text-violet-400" />
                                Non-Wrench Time Breakdown
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(workTimeStats.pauseReasons).map(([reason, minutes]) => (
                                    <div key={reason} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                        <span className="text-xs capitalize">{reason.replace('-', ' ')}</span>
                                        <span className="text-xs font-medium text-amber-400">{Math.round(minutes as number)}m</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {selectedTab === 'fleet' && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fleet Health Overview</h2>
                    {fleetHealth.map(({ ac, openWOs, aogActive, alerts, highAlerts }) => (
                        <Card key={ac.tailNumber} className={`glass-premium ${aogActive ? 'border-red-500/30' : 'border-white/10'} transition-all hover:border-white/20`}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${ac.currentStatus === 'red' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            ac.currentStatus === 'amber' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        }`}>
                                        <Plane className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-bold">{ac.tailNumber}</div>
                                        <div className="text-xs text-muted-foreground">{ac.modelType} • S/N {ac.serialNumber}</div>
                                    </div>
                                    {aogActive && (
                                        <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10 animate-pulse ml-auto">
                                            AOG
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-5 gap-3">
                                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                                        <div className="text-lg font-bold">{ac.totalHours.toLocaleString()}</div>
                                        <div className="text-[10px] text-muted-foreground">Total Hours</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                                        <div className="text-lg font-bold">{ac.totalCycles.toLocaleString()}</div>
                                        <div className="text-[10px] text-muted-foreground">Total Cycles</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                                        <div className="text-lg font-bold">{openWOs}</div>
                                        <div className="text-[10px] text-muted-foreground">Open WOs</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                                        <div className={`text-lg font-bold ${highAlerts > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{highAlerts}</div>
                                        <div className="text-[10px] text-muted-foreground">High Alerts</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 text-center">
                                        <div className="text-xs font-medium">{ac.nextScheduledMaintenance}</div>
                                        <div className="text-[10px] text-muted-foreground">Next Maint.</div>
                                    </div>
                                </div>

                                {/* Alerts for this aircraft */}
                                {alerts.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {alerts.map(alert => {
                                            const colors = getSeverityColor(alert.severity);
                                            return (
                                                <div key={alert.id} className={`flex items-center gap-3 p-2 rounded-lg ${colors.bg} ${colors.border} border`}>
                                                    <Zap className={`w-3 h-3 ${colors.text} flex-shrink-0`} />
                                                    <span className="text-xs flex-1">{alert.component}</span>
                                                    <span className={`text-[10px] ${colors.text}`}>{alert.currentHours.toLocaleString()} / {alert.failureIntervalHours.toLocaleString()} FH</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
