import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    HardHat, Clock, Play, Pause, Square, ChevronRight, ChevronDown, AlertOctagon,
    CheckCircle2, Wrench, FileText, Camera, Package, AlertTriangle, User, Plane
} from 'lucide-react';
import { useMaintenanceWorkflow } from './context/MaintenanceWorkflowContext';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { WOTask, WorkOrder, TimeLog } from './data/demoData';

export default function TechnicianView() {
    const { workOrders, technicians, timeLogs, clockOn, clockOff, handovers } = useMaintenanceWorkflow();
    const [selectedTech, setSelectedTech] = useState(technicians.find(t => t.clockedIn)?.id || technicians[0]?.id || '');
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [showPauseDialog, setShowPauseDialog] = useState<string | null>(null);

    const currentTech = technicians.find(t => t.id === selectedTech);

    // Get all tasks assigned to this technician
    const myTasks = useMemo(() => {
        const tasks: { task: WOTask; wo: WorkOrder }[] = [];
        workOrders.forEach(wo => {
            wo.tasks.forEach(task => {
                if (task.assignedTechId === selectedTech || wo.assignedTechIds.includes(selectedTech)) {
                    tasks.push({ task, wo });
                }
            });
        });
        return tasks;
    }, [workOrders, selectedTech]);

    const activeLogs = useMemo(() => {
        return timeLogs.filter(tl => tl.technicianId === selectedTech && !tl.endTime && tl.type === 'work');
    }, [timeLogs, selectedTech]);

    const getElapsedTime = (startTime: Date) => {
        const mins = differenceInMinutes(new Date(), startTime);
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m`;
    };

    const getTaskStatusUI = (task: WOTask) => {
        const activeLog = activeLogs.find(l => l.taskId === task.id);
        if (activeLog) {
            return {
                label: `Working — ${getElapsedTime(activeLog.startTime)}`,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                isActive: true,
            };
        }
        switch (task.status) {
            case 'complete': return { label: 'Complete', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', isActive: false };
            case 'in-progress': return { label: 'Paused', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', isActive: false };
            default: return { label: 'Pending', color: 'text-muted-foreground bg-white/5 border-white/10', isActive: false };
        }
    };

    const getTaskTimeLogs = (taskId: string) => {
        return timeLogs.filter(tl => tl.taskId === taskId);
    };

    const getTotalWorkTime = (taskId: string) => {
        const logs = getTaskTimeLogs(taskId).filter(l => l.type === 'work');
        return logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
    };

    return (
        <div className="p-6 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <HardHat className="w-5 h-5 text-emerald-400" />
                        Technician View
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Job cards, time tracking, and task execution</p>
                </div>
            </div>

            {/* Technician Selector */}
            <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Logged in as:</span>
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                    {technicians.map(tech => (
                        <button
                            key={tech.id}
                            onClick={() => setSelectedTech(tech.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedTech === tech.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${tech.clockedIn ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                            {tech.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tech Info Bar */}
            {currentTech && (
                <div className="flex items-center gap-6 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {currentTech.avatarInitials}
                        </div>
                        <div>
                            <div className="text-sm font-semibold">{currentTech.name}</div>
                            <div className="text-[10px] text-muted-foreground">{currentTech.certifications.join(', ')} — Level {currentTech.skillLevel}</div>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-xs">
                        <span className="text-muted-foreground">Shift:</span>
                        <span className="ml-1 font-medium">{currentTech.shift}</span>
                    </div>
                    <div className="text-xs">
                        <span className="text-muted-foreground">Team:</span>
                        <span className="ml-1 font-medium">{currentTech.team}</span>
                    </div>
                    <div className="text-xs">
                        <span className="text-muted-foreground">Active Tasks:</span>
                        <span className="ml-1 font-medium">{activeLogs.length}</span>
                    </div>
                </div>
            )}

            {/* Job Cards */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Job Cards</h2>
                {myTasks.length === 0 ? (
                    <Card className="glass-premium border-white/10">
                        <CardContent className="p-8 text-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No tasks assigned</p>
                        </CardContent>
                    </Card>
                ) : (
                    myTasks.map(({ task, wo }) => {
                        const statusUI = getTaskStatusUI(task);
                        const isExpanded = expandedTask === task.id;
                        const taskLogs = getTaskTimeLogs(task.id);
                        const totalMins = getTotalWorkTime(task.id);
                        const isWorking = activeLogs.some(l => l.taskId === task.id);
                        const handoverForTask = handovers.filter(h => h.taskId === task.id);

                        return (
                            <Card
                                key={task.id}
                                className={`glass-premium transition-all ${wo.priority === 'aog' ? 'border-red-500/30 bg-red-500/[0.03]' :
                                    isWorking ? 'border-emerald-500/30 bg-emerald-500/[0.02]' :
                                        'border-white/10'
                                    } hover:border-white/20`}
                            >
                                <CardContent className="p-0">
                                    <button
                                        className="w-full flex items-center gap-4 p-4 text-left"
                                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                                    >
                                        {/* Status indicator */}
                                        <div className={`w-3 h-3 rounded-full ${isWorking ? 'bg-emerald-500 animate-pulse' : task.status === 'complete' ? 'bg-emerald-500' : 'bg-white/20'}`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-mono text-muted-foreground">{wo.woNumber}</span>
                                                <Badge variant="outline" className={`text-[10px] ${statusUI.color}`}>{statusUI.label}</Badge>
                                                {task.source === 'CAMP' && (
                                                    <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10 font-mono">CAMP</Badge>
                                                )}
                                                {task.isRII && (
                                                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">RII</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium">{task.description}</p>
                                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                                <span><Wrench className="w-3 h-3 inline mr-0.5" /> ATA {task.ataCode}</span>
                                                <span><Plane className="w-3 h-3 inline mr-0.5" /> {wo.aircraftTail}</span>
                                                {wo.priority === 'aog' && <span className="text-red-400 font-medium">⚠ AOG</span>}
                                            </div>
                                        </div>

                                        {/* Time */}
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-xs text-muted-foreground">
                                                {Math.floor(totalMins / 60)}h {totalMins % 60}m / {task.estimatedDuration}h
                                            </div>
                                            <div className="w-20 bg-white/5 rounded-full h-1 mt-1">
                                                <div
                                                    className={`h-1 rounded-full ${totalMins / 60 > task.estimatedDuration ? 'bg-red-500' : 'bg-primary'}`}
                                                    style={{ width: `${Math.min((totalMins / 60 / task.estimatedDuration) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                    </button>

                                    {/* Expanded */}
                                    {isExpanded && (
                                        <div className="border-t border-white/5 p-4 space-y-3 bg-white/[0.02]">
                                            {/* Clock Controls */}
                                            <div className="flex items-center gap-2">
                                                {!isWorking && task.status !== 'complete' && (
                                                    <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-xs" onClick={(e: React.MouseEvent) => { e.stopPropagation(); clockOn(selectedTech, task.id); }}>
                                                        <Play className="w-3 h-3" /> Clock On
                                                    </Button>
                                                )}
                                                {isWorking && (
                                                    <>
                                                        <Button size="sm" variant="outline" className="gap-2 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={(e: React.MouseEvent) => { e.stopPropagation(); clockOff(selectedTech, task.id); }}>
                                                            <Pause className="w-3 h-3" /> Pause
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="gap-2 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={(e: React.MouseEvent) => { e.stopPropagation(); clockOff(selectedTech, task.id); }}>
                                                            <Square className="w-3 h-3" /> Clock Off
                                                        </Button>
                                                    </>
                                                )}
                                            </div>

                                            {/* AMM Reference */}
                                            {task.ammReference && (
                                                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                                                    <span className="text-xs text-blue-400">AMM Reference: {task.ammReference}</span>
                                                </div>
                                            )}

                                            {/* Time Log History */}
                                            {taskLogs.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Time Log</h4>
                                                    <div className="space-y-1">
                                                        {taskLogs.map(log => (
                                                            <div key={log.id} className="flex items-center gap-3 text-[10px] p-1.5 rounded bg-white/[0.02]">
                                                                <Badge variant="outline" className={`text-[9px] ${log.type === 'work' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}`}>
                                                                    {log.type}
                                                                </Badge>
                                                                <span className="text-muted-foreground">{format(log.startTime, 'HH:mm')}</span>
                                                                <span className="text-muted-foreground">→</span>
                                                                <span className="text-muted-foreground">{log.endTime ? format(log.endTime, 'HH:mm') : 'Active'}</span>
                                                                {log.durationMinutes && <span>{Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m</span>}
                                                                {log.pauseReason && <span className="text-amber-400 italic">{log.pauseReason.replace('-', ' ')}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Handover Notes */}
                                            {handoverForTask.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Handover Notes</h4>
                                                    {handoverForTask.map(ho => (
                                                        <div key={ho.id} className="p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                                                            <p className="text-xs leading-relaxed">{ho.statusNote}</p>
                                                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                                                                <span>From: {technicians.find(t => t.id === ho.outgoingTechId)?.name}</span>
                                                                <span>•</span>
                                                                <span>{formatDistanceToNow(ho.createdAt, { addSuffix: true })}</span>
                                                                {ho.acknowledged ? (
                                                                    <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">Acknowledged</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 animate-pulse">Needs Ack</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
