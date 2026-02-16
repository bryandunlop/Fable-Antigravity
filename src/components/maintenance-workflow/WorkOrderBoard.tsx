import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Wrench, AlertOctagon, Clock, Users, ChevronRight, ChevronDown, CheckCircle2,
    ArrowRight, BarChart3, Plane, Tag, ExternalLink, Package, AlertTriangle
} from 'lucide-react';
import { useMaintenanceWorkflow } from './context/MaintenanceWorkflowContext';
import { format, formatDistanceToNow } from 'date-fns';
import { WOStatus, WorkOrder } from './data/demoData';

const COLUMNS: { status: WOStatus; label: string; color: string }[] = [
    { status: 'pending', label: 'Pending', color: 'border-t-slate-400' },
    { status: 'assigned', label: 'Assigned', color: 'border-t-blue-400' },
    { status: 'in-work', label: 'In Work', color: 'border-t-violet-400' },
    { status: 'qc', label: 'Quality Control', color: 'border-t-amber-400' },
    { status: 'closed', label: 'Closed', color: 'border-t-emerald-400' },
];

export default function WorkOrderBoard() {
    const { workOrders, technicians, updateWorkOrderStatus } = useMaintenanceWorkflow();
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [expandedWO, setExpandedWO] = useState<string | null>(null);

    const getPriorityBadge = (priority: string) => {
        const config: Record<string, { class: string; icon: React.ReactNode }> = {
            'routine': { class: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', icon: null },
            'urgent': { class: 'border-amber-500/30 text-amber-400 bg-amber-500/10', icon: <AlertTriangle className="w-2.5 h-2.5" /> },
            'aog': { class: 'border-red-500/30 text-red-400 bg-red-500/10 animate-pulse', icon: <AlertOctagon className="w-2.5 h-2.5" /> },
        };
        const c = config[priority] || config['routine'];
        return <Badge variant="outline" className={`text-[10px] gap-1 ${c.class}`}>{c.icon}{priority.toUpperCase()}</Badge>;
    };

    const getSourceBadge = (source: string) => {
        return source === 'CAMP'
            ? <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400 bg-cyan-500/10 font-mono">CAMP</Badge>
            : <Badge variant="outline" className="text-[9px] border-white/10 text-muted-foreground">Internal</Badge>;
    };

    const renderWOCard = (wo: WorkOrder, compact = false) => {
        const isExpanded = expandedWO === wo.id && !compact;
        const assignedTechs = technicians.filter(t => wo.assignedTechIds.includes(t.id));
        const completedTasks = wo.tasks.filter(t => t.status === 'complete').length;
        const totalTasks = wo.tasks.length;

        return (
            <Card
                key={wo.id}
                className={`glass-premium transition-all hover:border-white/20 cursor-pointer ${wo.priority === 'aog' ? 'border-red-500/30 bg-red-500/[0.03]' : 'border-white/10'
                    }`}
                onClick={() => !compact && setExpandedWO(isExpanded ? null : wo.id)}
            >
                <CardContent className={compact ? 'p-3' : 'p-4'}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground">{wo.woNumber}</span>
                            {getPriorityBadge(wo.priority)}
                        </div>
                        {wo.scheduleRisk && (
                            <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400 bg-orange-500/10">
                                <BarChart3 className="w-2.5 h-2.5 mr-1" />
                                Schedule Risk
                            </Badge>
                        )}
                    </div>

                    {/* Title */}
                    <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'} mb-1`}>{wo.title}</p>

                    {/* Aircraft + Team */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Plane className="w-3 h-3" /> {wo.aircraftTail}
                        </div>
                        <span className="text-muted-foreground/50">•</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="w-3 h-3" /> {wo.assignedTeamId}
                        </div>
                    </div>

                    {/* Task Progress */}
                    <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Tasks: {completedTasks}/{totalTasks}</span>
                            <span>{wo.tasks.filter(t => t.source === 'CAMP').length} CAMP</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5">
                            <div
                                className="h-1.5 rounded-full bg-primary transition-all"
                                style={{ width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%' }}
                            />
                        </div>
                    </div>

                    {/* Time Estimate */}
                    <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Book: {wo.estimatedHours}h
                            </span>
                            {wo.predictedHours && (
                                <span className={wo.scheduleRisk ? 'text-orange-400' : 'text-muted-foreground'}>
                                    Predicted: {wo.predictedHours}h
                                </span>
                            )}
                        </div>
                        <span className="text-muted-foreground">Due {format(wo.dueDate, 'MMM d')}</span>
                    </div>

                    {/* Assigned Techs */}
                    {assignedTechs.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                            {assignedTechs.map(tech => (
                                <div key={tech.id} className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-medium text-primary" title={tech.name}>
                                    {tech.avatarInitials}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Expanded Task List */}
                    {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                            <h4 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Task Breakdown</h4>
                            {wo.tasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center ${task.status === 'complete' ? 'bg-emerald-500/20 text-emerald-400' :
                                            task.status === 'in-progress' ? 'bg-violet-500/20 text-violet-400' :
                                                'bg-white/5 text-muted-foreground'
                                        }`}>
                                        {task.status === 'complete' ? <CheckCircle2 className="w-3 h-3" /> :
                                            task.status === 'in-progress' ? <Clock className="w-3 h-3" /> :
                                                <div className="w-2 h-2 rounded-full bg-white/20" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs">{task.description}</span>
                                            {getSourceBadge(task.source)}
                                            {task.isRII && <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">RII</Badge>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-muted-foreground">ATA {task.ataCode}</span>
                                            {task.campTaskReference && (
                                                <span className="text-[10px] text-cyan-400 font-mono">{task.campTaskReference}</span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground">{task.estimatedDuration}h est</span>
                                            {task.predictedDuration && task.predictedDuration > task.estimatedDuration * 1.2 && (
                                                <span className="text-[10px] text-orange-400">{task.predictedDuration}h predicted ⚠</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {wo.notes && (
                                <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 mt-2">
                                    <span className="text-[10px] text-muted-foreground">Notes: </span>
                                    <span className="text-xs">{wo.notes}</span>
                                </div>
                            )}

                            {/* Status Change Buttons */}
                            <div className="flex gap-2 pt-2">
                                {wo.status !== 'closed' && (
                                    <>
                                        {wo.status === 'pending' && (
                                            <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); updateWorkOrderStatus(wo.id, 'assigned'); }}>
                                                Assign
                                            </Button>
                                        )}
                                        {wo.status === 'assigned' && (
                                            <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); updateWorkOrderStatus(wo.id, 'in-work'); }}>
                                                Start Work
                                            </Button>
                                        )}
                                        {wo.status === 'in-work' && (
                                            <Button size="sm" variant="outline" className="text-xs" onClick={(e) => { e.stopPropagation(); updateWorkOrderStatus(wo.id, 'qc'); }}>
                                                Send to QC
                                            </Button>
                                        )}
                                        {wo.status === 'qc' && (
                                            <Button size="sm" variant="outline" className="text-xs gap-1 border-emerald-500/30 text-emerald-400" onClick={(e) => { e.stopPropagation(); updateWorkOrderStatus(wo.id, 'closed'); }}>
                                                <CheckCircle2 className="w-3 h-3" /> Close WO
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-violet-400" />
                        Work Order Board
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Kanban-style maintenance control center with CAMP task integration</p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Kanban
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        List
                    </button>
                </div>
            </div>

            {viewMode === 'kanban' ? (
                /* Kanban Board */
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {COLUMNS.map(col => {
                        const columnWOs = workOrders.filter(w => w.status === col.status);
                        return (
                            <div key={col.status} className={`flex-1 min-w-[280px] rounded-xl bg-white/[0.02] border border-white/5 border-t-2 ${col.color}`}>
                                <div className="p-3 border-b border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold">{col.label}</span>
                                        <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground h-5 w-5 p-0 justify-center">
                                            {columnWOs.length}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-2 space-y-2 min-h-[200px]">
                                    {columnWOs.map(wo => renderWOCard(wo, true))}
                                    {columnWOs.length === 0 && (
                                        <div className="p-4 text-center text-[10px] text-muted-foreground/50">No work orders</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div className="space-y-2">
                    {workOrders.map(wo => renderWOCard(wo))}
                </div>
            )}
        </div>
    );
}
