import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    AlertTriangle, CheckCircle2, Clock, Shield, ChevronRight, ChevronDown,
    FileText, Bell, Plane, X, Check
} from 'lucide-react';
import { useMaintenanceWorkflow } from './context/MaintenanceWorkflowContext';
import { format, differenceInDays } from 'date-fns';

export default function MELWorkflow() {
    const { deferrals, squawks, aircraft, melLibrary } = useMaintenanceWorkflow();
    const [expandedDeferral, setExpandedDeferral] = useState<string | null>(null);
    const [selectedAircraft, setSelectedAircraft] = useState('all');

    const filteredDeferrals = selectedAircraft === 'all'
        ? deferrals
        : deferrals.filter(d => {
            const squawk = squawks.find(s => s.id === d.squawkId);
            return squawk?.aircraftTail === selectedAircraft;
        });

    const getCategoryInfo = (cat: string) => {
        const info: Record<string, { label: string; days: string; color: string }> = {
            'A': { label: 'Category A', days: 'As specified', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
            'B': { label: 'Category B', days: '3 calendar days', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
            'C': { label: 'Category C', days: '10 calendar days', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' },
            'D': { label: 'Category D', days: '120 calendar days', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
        };
        return info[cat] || info['C'];
    };

    const getDaysRemaining = (expiresAt: Date) => {
        const days = differenceInDays(expiresAt, new Date());
        if (days < 0) return { text: 'EXPIRED', color: 'text-red-400', urgent: true };
        if (days <= 1) return { text: `${days}d remaining`, color: 'text-red-400', urgent: true };
        if (days <= 3) return { text: `${days}d remaining`, color: 'text-amber-400', urgent: false };
        return { text: `${days}d remaining`, color: 'text-emerald-400', urgent: false };
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    MEL / CDL Management
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Digital Minimum Equipment List — deferral lifecycle, (O)/(M) procedures, and placard tracking</p>
            </div>

            {/* Aircraft Filter */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10 w-fit">
                <button
                    onClick={() => setSelectedAircraft('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedAircraft === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                >
                    All Aircraft
                </button>
                {aircraft.map(ac => (
                    <button
                        key={ac.tailNumber}
                        onClick={() => setSelectedAircraft(ac.tailNumber)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedAircraft === ac.tailNumber ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                    >
                        {ac.tailNumber}
                    </button>
                ))}
            </div>

            {/* MEL Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
                {['A', 'B', 'C', 'D'].map(cat => {
                    const info = getCategoryInfo(cat);
                    const count = deferrals.filter(d => d.category === cat && d.status === 'active').length;
                    return (
                        <div key={cat} className={`p-4 rounded-xl border ${info.color} bg-opacity-5`}>
                            <div className="text-2xl font-bold">{count}</div>
                            <div className="text-xs font-medium mt-0.5">{info.label}</div>
                            <div className="text-[10px] text-muted-foreground">{info.days}</div>
                        </div>
                    );
                })}
            </div>

            {/* Active Deferrals */}
            <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Deferrals</h2>
                {filteredDeferrals.length === 0 ? (
                    <Card className="glass-premium border-white/10">
                        <CardContent className="p-8 text-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No active deferrals</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredDeferrals.map(deferral => {
                        const squawk = squawks.find(s => s.id === deferral.squawkId);
                        const catInfo = getCategoryInfo(deferral.category);
                        const daysInfo = getDaysRemaining(deferral.expiresAt);
                        const isExpanded = expandedDeferral === deferral.id;

                        return (
                            <Card key={deferral.id} className={`glass-premium transition-all hover:border-white/20 ${daysInfo.urgent ? 'border-red-500/30' : 'border-white/10'}`}>
                                <CardContent className="p-0">
                                    <button
                                        className="w-full flex items-center gap-4 p-4 text-left"
                                        onClick={() => setExpandedDeferral(isExpanded ? null : deferral.id)}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${catInfo.color}`}>
                                            {deferral.category}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-xs font-mono text-muted-foreground">{deferral.melReference}</span>
                                                <Badge variant="outline" className={`text-[10px] ${catInfo.color}`}>
                                                    {catInfo.label}
                                                </Badge>
                                                {deferral.status === 'active' && deferral.mProcedureCompleted && deferral.pilotAcknowledged && (
                                                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                                                        <Check className="w-2.5 h-2.5 mr-1" /> Fully Active
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium">{deferral.placard}</p>
                                            {squawk && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{squawk.aircraftTail} — {squawk.ataTitle}</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className={`text-xs font-medium ${daysInfo.color}`}>{daysInfo.text}</div>
                                            <div className="text-[10px] text-muted-foreground">Expires {format(deferral.expiresAt, 'MMM d')}</div>
                                        </div>
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-white/5 p-4 space-y-4 bg-white/[0.02]">
                                            {/* Procedures */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                                                        <span className="text-xs font-semibold text-blue-400">(O) Operational Procedures</span>
                                                    </div>
                                                    <p className="text-xs text-foreground/80 leading-relaxed">{deferral.operationalProcedures}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                                                        <span className="text-xs font-semibold text-amber-400">(M) Maintenance Procedures</span>
                                                    </div>
                                                    <p className="text-xs text-foreground/80 leading-relaxed">{deferral.maintenanceProcedures}</p>
                                                </div>
                                            </div>

                                            {/* Workflow Status */}
                                            <div className="flex items-center gap-6 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                                                <div className="flex items-center gap-2">
                                                    {deferral.mProcedureCompleted ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    ) : (
                                                        <Clock className="w-4 h-4 text-amber-400" />
                                                    )}
                                                    <div className="text-xs">
                                                        <span className="text-muted-foreground">(M) Procedure: </span>
                                                        <span className={deferral.mProcedureCompleted ? 'text-emerald-400' : 'text-amber-400'}>
                                                            {deferral.mProcedureCompleted ? `Signed by ${deferral.mProcedureSignedBy}` : 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="w-px h-4 bg-white/10" />
                                                <div className="flex items-center gap-2">
                                                    {deferral.pilotAcknowledged ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    ) : (
                                                        <Bell className="w-4 h-4 text-amber-400 animate-pulse" />
                                                    )}
                                                    <div className="text-xs">
                                                        <span className="text-muted-foreground">Pilot Ack: </span>
                                                        <span className={deferral.pilotAcknowledged ? 'text-emerald-400' : 'text-amber-400'}>
                                                            {deferral.pilotAcknowledged ? 'Acknowledged' : 'Awaiting pilot'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Placard */}
                                            <div className="p-3 rounded-lg border-2 border-dashed border-amber-500/40 bg-amber-500/5 text-center">
                                                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">{deferral.placard}</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* MEL Library Reference */}
            <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">MEL Library Reference</h2>
                <div className="grid grid-cols-1 gap-2">
                    {melLibrary.map(item => (
                        <div key={item.melId} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                            <Badge variant="outline" className={`text-[10px] w-8 justify-center ${getCategoryInfo(item.repairCategory).color}`}>
                                {item.repairCategory}
                            </Badge>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-muted-foreground">{item.melId}</span>
                                    <span className="text-xs">•</span>
                                    <span className="text-xs font-medium">{item.itemTitle}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">ATA {item.ataChapter} — {item.aircraftModel}</span>
                            </div>
                            <div className="text-right">
                                {item.isNoGo ? (
                                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">NO-GO</Badge>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground">{item.maxDeferralDays} day max</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
