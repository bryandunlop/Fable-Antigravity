import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    ArrowRightLeft, CheckCircle2, Clock, AlertTriangle, Camera, ChevronRight,
    ChevronDown, FileText, User, Shield, ArrowRight
} from 'lucide-react';
import { useMaintenanceWorkflow } from './context/MaintenanceWorkflowContext';
import { format, formatDistanceToNow } from 'date-fns';

export default function ShiftHandover() {
    const { handovers, technicians, workOrders, submitHandover, acknowledgeHandover } = useMaintenanceWorkflow();
    const [expandedHandover, setExpandedHandover] = useState<string | null>(null);
    const [newHandoverTaskId, setNewHandoverTaskId] = useState('');
    const [newHandoverNote, setNewHandoverNote] = useState('');
    const [selectedTech, setSelectedTech] = useState(technicians[0]?.id || '');

    const pendingHandovers = handovers.filter(h => !h.acknowledged);
    const completedHandovers = handovers.filter(h => h.acknowledged);

    // Get all in-progress tasks for creating handovers
    const inProgressTasks = workOrders.flatMap(wo =>
        wo.tasks
            .filter(t => t.status === 'in-progress')
            .map(t => ({ task: t, wo }))
    );

    const handleSubmit = () => {
        if (!newHandoverTaskId || !newHandoverNote) return;
        submitHandover(newHandoverTaskId, selectedTech, newHandoverNote);
        setNewHandoverTaskId('');
        setNewHandoverNote('');
    };

    return (
        <div className="p-6 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                    Shift Handover Protocol
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Structured digital handover to mitigate the "5/40" problem — 40% of incidents occur during 5% of handover time</p>
            </div>

            {/* The 5/40 Info Banner */}
            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-semibold text-cyan-400 mb-1">5/40 Shift Handover Protocol</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Research shows 40% of maintenance incidents occur during the 5% of time dedicated to shift handovers.
                            This system requires status notes for every open task, optional photo evidence, and incoming technician acknowledgment
                            to establish a clear chain of custody.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create New Handover */}
                <Card className="glass-premium border-white/10">
                    <CardContent className="p-5 space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            Submit Handover
                        </h3>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Outgoing Technician</label>
                            <select
                                value={selectedTech}
                                onChange={e => setSelectedTech(e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-md bg-background border border-white/10 text-foreground"
                            >
                                {technicians.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.shift} Shift)</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Task</label>
                            <select
                                value={newHandoverTaskId}
                                onChange={e => setNewHandoverTaskId(e.target.value)}
                                className="w-full h-9 px-3 text-xs rounded-md bg-background border border-white/10 text-foreground"
                            >
                                <option value="">Select in-progress task...</option>
                                {inProgressTasks.map(({ task, wo }) => (
                                    <option key={task.id} value={task.id}>{wo.woNumber} — {task.description}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Status Note (Required)</label>
                            <textarea
                                value={newHandoverNote}
                                onChange={e => setNewHandoverNote(e.target.value)}
                                placeholder="Describe current state, what's been done, what's remaining, any safety concerns..."
                                className="w-full h-28 px-3 py-2 text-xs rounded-md bg-background border border-white/10 text-foreground resize-none"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="text-xs gap-1.5" disabled>
                                <Camera className="w-3 h-3" /> Attach Photo
                            </Button>
                            <span className="text-[10px] text-muted-foreground">(Photo attachment for production use)</span>
                        </div>

                        <Button
                            className="w-full gap-2 bg-cyan-600 hover:bg-cyan-500 text-xs"
                            onClick={handleSubmit}
                            disabled={!newHandoverTaskId || !newHandoverNote}
                        >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> Submit Handover Record
                        </Button>
                    </CardContent>
                </Card>

                {/* Pending Acknowledgments */}
                <Card className="glass-premium border-white/10">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                Awaiting Acknowledgment
                            </h3>
                            <Badge variant="outline" className={`text-[10px] ${pendingHandovers.length > 0 ? 'border-amber-500/30 text-amber-400 bg-amber-500/10 animate-pulse' : 'border-emerald-500/30 text-emerald-400'}`}>
                                {pendingHandovers.length}
                            </Badge>
                        </div>

                        {pendingHandovers.length === 0 ? (
                            <div className="p-6 text-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">All handovers acknowledged</p>
                            </div>
                        ) : (
                            pendingHandovers.map(ho => {
                                const outgoingTech = technicians.find(t => t.id === ho.outgoingTechId);
                                const task = workOrders.flatMap(w => w.tasks).find(t => t.id === ho.taskId);
                                const wo = workOrders.find(w => w.tasks.some(t => t.id === ho.taskId));

                                return (
                                    <div key={ho.id} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-xs font-medium">{outgoingTech?.name}</span>
                                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-xs text-amber-400">Incoming Tech</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(ho.createdAt, { addSuffix: true })}</span>
                                        </div>
                                        {wo && <div className="text-[10px] text-muted-foreground">{wo.woNumber} — {task?.description}</div>}
                                        <div className="p-2 rounded bg-white/[0.03] border border-white/5">
                                            <p className="text-xs leading-relaxed">{ho.statusNote}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-xs"
                                            onClick={() => acknowledgeHandover(ho.id, selectedTech)}
                                        >
                                            <CheckCircle2 className="w-3 h-3" /> Acknowledge & Accept
                                        </Button>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Completed Handovers Timeline */}
            <Card className="glass-premium border-white/10">
                <CardContent className="p-5">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        Handover History
                    </h3>
                    <div className="space-y-3">
                        {completedHandovers.map(ho => {
                            const outgoingTech = technicians.find(t => t.id === ho.outgoingTechId);
                            const incomingTech = ho.incomingTechId ? technicians.find(t => t.id === ho.incomingTechId) : null;
                            const task = workOrders.flatMap(w => w.tasks).find(t => t.id === ho.taskId);
                            const wo = workOrders.find(w => w.tasks.some(t => t.id === ho.taskId));

                            return (
                                <div key={ho.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-xs mb-1">
                                            <span className="font-medium">{outgoingTech?.name}</span>
                                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                            <span className="font-medium text-emerald-400">{incomingTech?.name || 'Unknown'}</span>
                                        </div>
                                        {wo && <div className="text-[10px] text-muted-foreground mb-1">{wo.woNumber} — {task?.description}</div>}
                                        <p className="text-xs text-muted-foreground/80 leading-relaxed">{ho.statusNote}</p>
                                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                            <span>Submitted: {format(ho.createdAt, 'MMM d, HH:mm')}</span>
                                            {ho.acknowledgedAt && <span>Acknowledged: {format(ho.acknowledgedAt, 'HH:mm')}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
