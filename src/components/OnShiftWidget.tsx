import React from 'react';
import { CardContent, CardHeader, CardTitle } from './ui/card';
import { LiquidCard } from './LiquidCard';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
    Users,
    Phone,
    Clock,
    MapPin,
    Plane,
    Wrench,
    Shield,
    Briefcase,
    Headphones,
    Laptop
} from 'lucide-react';

interface ShiftMember {
    id: string;
    name: string;
    code: string; // OData code e.g. FCA, MXE
    status: 'active' | 'standby' | 'rest' | 'busy' | 'off';
    location: string; // Can be inferred or manually set
    avatar?: string;
}

// OData Shift Code Definition
interface ShiftDefinition {
    label: string;
    time: string;
    type: 'ops' | 'maintenance' | 'pilot' | 'management' | 'other';
}

const SHIFT_DEFINITIONS: Record<string, ShiftDefinition> = {
    'FCA': { label: 'Flight Coordinator AM', time: '06:00 - 14:30', type: 'ops' },
    'FCM': { label: 'Flight Coordinator Mid', time: '08:00 - 16:30', type: 'ops' },
    'FCP': { label: 'Flight Coordinator PM', time: '09:30 - 18:00', type: 'ops' },
    'MXE': { label: 'Maintenance Early', time: '07:00 - 16:00', type: 'maintenance' },
    'MXD': { label: 'Maintenance Day', time: '07:30 - 16:00', type: 'maintenance' },
    'MAD': { label: 'Maintenance Day', time: '07:30 - 16:00', type: 'maintenance' },
    'MXL': { label: 'Maintenance Late', time: '15:30 - 00:00', type: 'maintenance' },
    'MAL': { label: 'Maintenance Late', time: '15:30 - 00:00', type: 'maintenance' },
    'MXF': { label: 'Maintenance Flex', time: 'Varies', type: 'maintenance' },
    'MXW': { label: 'Maintenance Weekend', time: 'Varies', type: 'maintenance' },
    'OCL': { label: 'On Call', time: 'Varies', type: 'other' },
    'WFH': { label: 'Work from Home', time: 'Varies', type: 'other' },
};

export default function OnShiftWidget() {
    // Mock Data using OData codes
    const mockMembers: ShiftMember[] = [
        {
            id: '1',
            name: 'Capt. James Wilson',
            code: 'FCA',
            status: 'active',
            location: 'Dispatch Center',
            avatar: 'JW'
        },
        {
            id: '2',
            name: 'Michael Chen',
            code: 'MXE',
            status: 'active',
            location: 'Hangar B',
            avatar: 'MC'
        },
        {
            id: '3',
            name: 'Sarah Connor',
            code: 'FCM',
            status: 'busy',
            location: 'OCC Desk 1',
            avatar: 'SC'
        },
        {
            id: '4',
            name: 'Robert Fixit',
            code: 'MXL',
            status: 'rest', // Should be filtered out
            location: 'Home',
            avatar: 'RF'
        },
        {
            id: '5',
            name: 'Elena Fisher',
            code: 'WFH',
            status: 'active',
            location: 'Remote',
            avatar: 'EF'
        },
        {
            id: '6',
            name: 'Dr. Alan Grant',
            code: 'OCL',
            status: 'standby',
            location: 'Remote',
            avatar: 'AG'
        }
    ];

    // Helper to categorize
    const getShiftDetails = (code: string): ShiftDefinition => {
        // Default fallback
        return SHIFT_DEFINITIONS[code] || { label: code, time: 'Unknown', type: 'other' };
    };

    const getRoleIcon = (type: string) => {
        switch (type) {
            case 'pilot': return <Plane className="w-4 h-4" />;
            case 'maintenance': return <Wrench className="w-4 h-4" />;
            case 'ops': return <Headphones className="w-4 h-4" />;
            case 'management': return <Shield className="w-4 h-4" />;
            case 'other': return <Users className="w-4 h-4" />; // Or Laptop for WFH maybe
            default: return <Users className="w-4 h-4" />;
        }
    };

    // WFH override
    const getIconForMember = (member: ShiftMember, type: string) => {
        if (member.code === 'WFH') return <Laptop className="w-4 h-4" />;
        return getRoleIcon(type);
    }


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'standby': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'busy': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
            case 'rest': return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
            case 'off': return 'text-slate-600 bg-slate-600/10 border-slate-600/20';
            default: return 'text-slate-400';
        }
    };

    // Filter lists
    // Logic: Exclude 'off' and 'rest' statuses.
    // "On Shift" are those NOT OCL.
    // "On Call" are those WITH OCL.
    // We filter FIRST by active status, THEN split.
    const activeMembers = mockMembers.filter(m => m.status !== 'off' && m.status !== 'rest');

    // On Shift = Active members NOT On Call
    const onShift = activeMembers.filter(m => m.code !== 'OCL');

    // On Call = Active members WITH On Call code
    const onCall = activeMembers.filter(m => m.code === 'OCL');

    return (
        <LiquidCard delay={600} className="col-span-1 lg:col-span-2">
            <CardHeader className="border-b border-white/5 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Users className="w-5 h-5 text-[var(--color-pg-cyan)]" />
                        Duty Roster
                    </CardTitle>
                    <Badge variant="outline" className="text-xs border-white/10 bg-white/5">
                        Updated: Just now
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                    {/* On Shift Section */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Scheduled Shift</h3>
                        </div>

                        <div className="space-y-4">
                            {onShift.map((member) => {
                                const details = getShiftDetails(member.code);

                                return (
                                    <div key={member.id} className="flex items-center gap-4 group">
                                        <Avatar className="h-10 w-10 border border-white/10">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.avatar}`} />
                                            <AvatarFallback className="bg-slate-800 text-slate-200">{member.avatar}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-white truncate">{member.name}</p>
                                                <Badge className={`text-[10px] h-5 px-1.5 ${getStatusColor(member.status)}`}>
                                                    {member.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    {getIconForMember(member, details.type)}
                                                    {details.label} <span className="text-slate-600">({member.code})</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {member.location}
                                                </span>
                                                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {details.time}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* On Call Section */}
                    <div className="p-6 space-y-4 bg-white/[0.02]">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">On Call / Standby</h3>
                        </div>

                        <div className="space-y-4">
                            {onCall.map((member) => {
                                const details = getShiftDetails(member.code);

                                return (
                                    <div key={member.id} className="flex items-center gap-4 group">
                                        <Avatar className="h-10 w-10 border border-white/10 opacity-80">
                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.avatar}`} />
                                            <AvatarFallback className="bg-slate-800 text-slate-200">{member.avatar}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-slate-200 truncate">{member.name}</p>
                                                <Badge className={`text-[10px] h-5 px-1.5 ${getStatusColor(member.status)}`}>
                                                    {member.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    {getIconForMember(member, details.type)}
                                                    {details.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    On Call
                                                </span>
                                                <span className="text-[11px] text-slate-600 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {details.time}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {onCall.length === 0 && (
                                <p className="text-sm text-slate-500 italic">No personnel currently on call.</p>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </LiquidCard>
    );
}
