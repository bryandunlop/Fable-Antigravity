import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    ClipboardList, AlertTriangle, Plane, Clock, Search, Plus, ChevronRight, ChevronDown,
    CheckCircle2, AlertOctagon, Wrench, Filter, FileText, Send, X
} from 'lucide-react';
import { useMaintenanceWorkflow } from './context/MaintenanceWorkflowContext';
import { formatDistanceToNow, format } from 'date-fns';
import { Squawk, SquawkPhase } from './data/demoData';

export default function ElectronicTechLog() {
    const { squawks, aircraft, ataChapters, melLibrary, submitSquawk, updateSquawkStatus, applyDeferral } = useMaintenanceWorkflow();
    const [selectedAircraft, setSelectedAircraft] = useState(aircraft[0]?.tailNumber || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showNewSquawk, setShowNewSquawk] = useState(false);
    const [expandedSquawk, setExpandedSquawk] = useState<string | null>(null);

    // New squawk form
    const [newSquawk, setNewSquawk] = useState({
        ataChapter: '',
        ataSubSystem: '',
        component: '',
        description: '',
        flightPhase: 'ground' as SquawkPhase,
        priority: 'routine' as 'routine' | 'urgent' | 'aog',
    });

    const filteredSquawks = useMemo(() => {
        return squawks.filter(s => {
            if (selectedAircraft && s.aircraftTail !== selectedAircraft) return false;
            if (statusFilter !== 'all' && s.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return s.description.toLowerCase().includes(q) || s.ataCode.includes(q) || s.ataTitle.toLowerCase().includes(q);
            }
            return true;
        });
    }, [squawks, selectedAircraft, statusFilter, searchQuery]);

    const selectedChapter = ataChapters.find(c => c.code === newSquawk.ataChapter);
    const selectedSubSystem = selectedChapter?.subSystems.find(s => s.code === newSquawk.ataSubSystem);

    const getStatusBadge = (status: string) => {
        const config: Record<string, { class: string; label: string }> = {
            'new': { class: 'border-blue-500/30 text-blue-400 bg-blue-500/10', label: 'New' },
            'deferred': { class: 'border-amber-500/30 text-amber-400 bg-amber-500/10', label: 'Deferred (MEL)' },
            'in-work': { class: 'border-violet-500/30 text-violet-400 bg-violet-500/10', label: 'In Work' },
            'closed': { class: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', label: 'Closed' },
            'aog': { class: 'border-red-500/30 text-red-400 bg-red-500/10', label: 'AOG' },
        };
        const c = config[status] || config['new'];
        return <Badge variant="outline" className={`text-[10px] ${c.class}`}>{c.label}</Badge>;
    };

    const getPriorityDot = (priority: string) => {
        const colors: Record<string, string> = { routine: 'bg-emerald-500', urgent: 'bg-amber-500', aog: 'bg-red-500 animate-pulse' };
        return <div className={`w-2 h-2 rounded-full ${colors[priority] || 'bg-gray-500'}`} />;
    };

    const handleSubmitSquawk = () => {
        if (!newSquawk.description || !newSquawk.ataSubSystem) return;
        const subSystem = selectedChapter?.subSystems.find(s => s.code === newSquawk.ataSubSystem);
        submitSquawk({
            aircraftTail: selectedAircraft,
            ataCode: newSquawk.ataSubSystem,
            ataTitle: `${selectedChapter?.title} - ${subSystem?.title}${newSquawk.component ? ` - ${newSquawk.component}` : ''}`,
            description: newSquawk.description,
            reportedBy: 'Demo Pilot',
            reportedByRole: 'pilot',
            flightPhase: newSquawk.flightPhase,
            priority: newSquawk.priority,
        });
        setShowNewSquawk(false);
        setNewSquawk({ ataChapter: '', ataSubSystem: '', component: '', description: '', flightPhase: 'ground', priority: 'routine' });
    };

    const handleMELLookup = (squawk: Squawk) => {
        const melMatch = melLibrary.find(m => m.ataChapter === squawk.ataCode);
        if (melMatch && !melMatch.isNoGo) {
            applyDeferral(squawk.id, melMatch);
        }
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-blue-400" />
                        Electronic Tech Log
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">ATA-coded defect reporting with automated MEL assessment</p>
                </div>
                <Button onClick={() => setShowNewSquawk(!showNewSquawk)} className="gap-2 bg-blue-600 hover:bg-blue-500">
                    <Plus className="w-4 h-4" />
                    Report Defect
                </Button>
            </div>

            {/* Aircraft Selector + Filters */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                    {aircraft.map(ac => (
                        <button
                            key={ac.tailNumber}
                            onClick={() => setSelectedAircraft(ac.tailNumber)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedAircraft === ac.tailNumber
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }`}
                        >
                            {ac.tailNumber}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search squawks..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 bg-white/5 border-white/10"
                    />
                </div>
                <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                    {['all', 'new', 'deferred', 'in-work', 'aog'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                }`}
                        >
                            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* New Squawk Form */}
            {showNewSquawk && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Plus className="w-4 h-4 text-blue-400" />
                                New Defect Report — {selectedAircraft}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowNewSquawk(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* ATA Hierarchy Selector */}
                        <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">1. ATA System Selection (Hierarchical Fault Tree)</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {/* Chapter */}
                                <div>
                                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Chapter</Label>
                                    <select
                                        value={newSquawk.ataChapter}
                                        onChange={e => setNewSquawk({ ...newSquawk, ataChapter: e.target.value, ataSubSystem: '', component: '' })}
                                        className="w-full h-9 px-3 text-xs rounded-md bg-background border border-white/10 text-foreground"
                                    >
                                        <option value="">Select system...</option>
                                        {ataChapters.map(ch => (
                                            <option key={ch.code} value={ch.code}>{ch.code} — {ch.title}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Sub-system */}
                                <div>
                                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Sub-System</Label>
                                    <select
                                        value={newSquawk.ataSubSystem}
                                        onChange={e => setNewSquawk({ ...newSquawk, ataSubSystem: e.target.value, component: '' })}
                                        className="w-full h-9 px-3 text-xs rounded-md bg-background border border-white/10 text-foreground"
                                        disabled={!selectedChapter}
                                    >
                                        <option value="">Select sub-system...</option>
                                        {selectedChapter?.subSystems.map(ss => (
                                            <option key={ss.code} value={ss.code}>{ss.code} — {ss.title}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Component */}
                                <div>
                                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Component</Label>
                                    <select
                                        value={newSquawk.component}
                                        onChange={e => setNewSquawk({ ...newSquawk, component: e.target.value })}
                                        className="w-full h-9 px-3 text-xs rounded-md bg-background border border-white/10 text-foreground"
                                        disabled={!selectedSubSystem}
                                    >
                                        <option value="">Select component...</option>
                                        {selectedSubSystem?.components.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Phase + Priority */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">2. Phase of Flight</Label>
                                <select
                                    value={newSquawk.flightPhase}
                                    onChange={e => setNewSquawk({ ...newSquawk, flightPhase: e.target.value as SquawkPhase })}
                                    className="w-full h-9 px-3 text-xs rounded-md bg-background border border-white/10 text-foreground"
                                >
                                    {['preflight', 'taxi', 'climb', 'cruise', 'descent', 'approach', 'landing', 'postflight', 'ground'].map(p => (
                                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1 block">Priority</Label>
                                <select
                                    value={newSquawk.priority}
                                    onChange={e => setNewSquawk({ ...newSquawk, priority: e.target.value as 'routine' | 'urgent' | 'aog' })}
                                    className="w-full h-9 px-3 text-xs rounded-md bg-background border border-white/10 text-foreground"
                                >
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="aog">AOG</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">3. Defect Description</Label>
                            <textarea
                                value={newSquawk.description}
                                onChange={e => setNewSquawk({ ...newSquawk, description: e.target.value })}
                                placeholder="Describe the defect with as much detail as possible..."
                                className="w-full h-24 px-3 py-2 text-xs rounded-md bg-background border border-white/10 text-foreground resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowNewSquawk(false)}>Cancel</Button>
                            <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500" onClick={handleSubmitSquawk} disabled={!newSquawk.description || !newSquawk.ataSubSystem}>
                                <Send className="w-3.5 h-3.5" />
                                Submit Squawk
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Squawk List */}
            <div className="space-y-2">
                {filteredSquawks.length === 0 ? (
                    <Card className="glass-premium border-white/10">
                        <CardContent className="p-8 text-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No squawks match your filters</p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredSquawks.map(squawk => (
                        <Card
                            key={squawk.id}
                            className={`glass-premium border-white/10 transition-all hover:border-white/20 ${squawk.priority === 'aog' ? 'border-red-500/30 bg-red-500/[0.03]' : ''
                                }`}
                        >
                            <CardContent className="p-0">
                                {/* Main Row */}
                                <button
                                    className="w-full flex items-center gap-4 p-4 text-left"
                                    onClick={() => setExpandedSquawk(expandedSquawk === squawk.id ? null : squawk.id)}
                                >
                                    {getPriorityDot(squawk.priority)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-mono text-muted-foreground">{squawk.id}</span>
                                            <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
                                                ATA {squawk.ataCode}
                                            </Badge>
                                            {getStatusBadge(squawk.status)}
                                        </div>
                                        <p className="text-sm font-medium truncate">{squawk.ataTitle}</p>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">{squawk.description}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-xs text-muted-foreground">{squawk.reportedBy}</div>
                                        <div className="text-[10px] text-muted-foreground/70">{formatDistanceToNow(squawk.reportedAt, { addSuffix: true })}</div>
                                        <div className="text-[10px] text-muted-foreground/50 mt-0.5">{squawk.flightPhase}</div>
                                    </div>
                                    {expandedSquawk === squawk.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                </button>

                                {/* Expanded Detail */}
                                {expandedSquawk === squawk.id && (
                                    <div className="border-t border-white/5 p-4 bg-white/[0.02] space-y-3">
                                        <div className="grid grid-cols-3 gap-4 text-xs">
                                            <div>
                                                <span className="text-muted-foreground">Aircraft:</span>
                                                <span className="ml-2 font-medium">{squawk.aircraftTail}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Phase:</span>
                                                <span className="ml-2 font-medium capitalize">{squawk.flightPhase}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Reported:</span>
                                                <span className="ml-2 font-medium">{format(squawk.reportedAt, 'MMM d, HH:mm')}</span>
                                            </div>
                                        </div>

                                        {squawk.additionalData && (
                                            <div className="p-2 rounded bg-white/[0.03] border border-white/5">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Smart Form Data</span>
                                                <div className="grid grid-cols-2 gap-2 mt-1">
                                                    {Object.entries(squawk.additionalData).map(([key, val]) => (
                                                        <div key={key} className="text-xs">
                                                            <span className="text-muted-foreground">{key}:</span>
                                                            <span className="ml-1 font-mono">{val}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {squawk.melReference && (
                                            <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                                                <span className="text-[10px] text-amber-400 font-medium">MEL Reference: {squawk.melReference}</span>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-1">
                                            {squawk.status === 'new' && (
                                                <>
                                                    <Button size="sm" variant="outline" className="text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => handleMELLookup(squawk)}>
                                                        <AlertTriangle className="w-3 h-3" />
                                                        MEL Lookup
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-xs gap-1.5 border-violet-500/30 text-violet-400 hover:bg-violet-500/10" onClick={() => updateSquawkStatus(squawk.id, 'in-work')}>
                                                        <Wrench className="w-3 h-3" />
                                                        Create Work Order
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-xs gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => updateSquawkStatus(squawk.id, 'aog')}>
                                                        <AlertOctagon className="w-3 h-3" />
                                                        Declare AOG
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
