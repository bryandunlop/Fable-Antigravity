import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Users, Phone, MapPin, Clock, Laptop, Headphones, Wrench, Shield, Plane } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AltimeterSpinner } from './ui/LoadingSpinners';

interface ShiftMember {
    id: string;
    name: string;
    code: string; // OData code e.g. FCA, MXE
    status: 'active' | 'standby' | 'busy' | 'rest' | 'off';
    location: string;
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
    'MXL': { label: 'Maintenance Late', time: '15:30 - 00:00', type: 'maintenance' },
    'MXF': { label: 'Maintenance Flex', time: 'Varies', type: 'maintenance' },
    'MXW': { label: 'Maintenance Weekend', time: 'Varies', type: 'maintenance' },
    'OCL': { label: 'Varies', time: 'Varies', type: 'other' },
    'WFH': { label: 'Work From Home', time: 'Varies', type: 'other' },
};

export default function DutyRosterWidget() {
    const [isLoading, setIsLoading] = useState(true);
    const [members, setMembers] = useState<ShiftMember[]>([]);

    useEffect(() => {
        // Simulated fetch from MyAirOps
        const fetchRoster = async () => {
            setIsLoading(true);
            try {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1200));
                
                const mockMembers: ShiftMember[] = [
                    { id: '1', name: 'James Wilson', code: 'FCA', status: 'active', location: 'Dispatch', avatar: 'JW' },
                    { id: '2', name: 'Michael Chen', code: 'MXE', status: 'active', location: 'Hangar B', avatar: 'MC' },
                    { id: '3', name: 'Sarah Connor', code: 'FCM', status: 'busy', location: 'OCC Desk 1', avatar: 'SC' },
                    { id: '4', name: 'Robert Fixit', code: 'MXL', status: 'active', location: 'Hangar A', avatar: 'RF' },
                    { id: '5', name: 'Elena Fisher', code: 'WFH', status: 'active', location: 'Remote', avatar: 'EF' },
                    { id: '6', name: 'Alan Grant', code: 'OCL', status: 'standby', location: 'On Call', avatar: 'AG' },
                ];
                setMembers(mockMembers);
            } catch (error) {
                console.error("Failed to fetch roster:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoster();
    }, []);

    const getShiftDetails = (code: string): ShiftDefinition => {
        return SHIFT_DEFINITIONS[code] || { label: code, time: 'Unknown', type: 'other' };
    };

    const getRoleIcon = (type: string, code: string) => {
        if (code === 'WFH') return <Laptop className="w-4 h-4" />;
        switch (type) {
            case 'pilot': return <Plane className="w-4 h-4" />;
            case 'maintenance': return <Wrench className="w-4 h-4" />;
            case 'ops': return <Headphones className="w-4 h-4" />;
            case 'management': return <Shield className="w-4 h-4" />;
            default: return <Users className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'standby': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'busy': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            default: return 'text-slate-400';
        }
    };

    const activeShift = members.filter(m => m.code !== 'OCL' && m.code !== 'WFH');
    const onCallRemote = members.filter(m => m.code === 'OCL' || m.code === 'WFH');

    return (
        <Card className="h-full border-none shadow-none bg-transparent flex flex-col">
            <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Users className="w-5 h-5 text-emerald-500" />
                        Duty Roster
                    </CardTitle>
                    <Link to="/crew-management">
                        <Badge variant="outline" className="hover:bg-accent cursor-pointer transition-colors">
                            View All
                        </Badge>
                    </Link>
                </div>
                <CardDescription>
                    Current shift assignments from MyAirOps
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground animate-fade-in space-y-4">
                        <AltimeterSpinner size={40} />
                        <span className="text-sm font-medium">Loading Roster...</span>
                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        {/* Active Shift */}
                        <div>
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Shift
                            </h4>
                            <div className="space-y-4">
                                {activeShift.map((member) => {
                                    const details = getShiftDetails(member.code);
                                    return (
                                        <div key={member.id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.avatar}`} />
                                                    <AvatarFallback>{member.avatar}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-semibold leading-none group-hover:text-blue-500 transition-colors">
                                                        {member.name}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                                                        {getRoleIcon(details.type, member.code)}
                                                        {details.label} <span className="opacity-60 text-[9px]">({member.code})</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <Badge className={`text-[9px] font-medium px-1.5 h-4 ${getStatusColor(member.status)}`} variant="outline">
                                                    {member.status.toUpperCase()}
                                                </Badge>
                                                <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    {member.location}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* On Call & Remote */}
                        <div>
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                On Call / Remote
                            </h4>
                            <div className="space-y-4">
                                {onCallRemote.map((member) => {
                                    const details = getShiftDetails(member.code);
                                    return (
                                        <div key={member.id} className="flex items-center justify-between group opacity-90 hover:opacity-100 transition-opacity">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-border">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.avatar}`} />
                                                    <AvatarFallback>{member.avatar}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="text-sm font-semibold leading-none">
                                                        {member.name}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                                                        {getRoleIcon(details.type, member.code)}
                                                        {details.label} <span className="opacity-60 text-[9px]">({member.code})</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <Badge 
                                                    variant="outline" 
                                                    className={`text-[9px] font-medium px-1.5 h-4 ${member.code === 'WFH' ? 'border-blue-500/30 text-blue-600 bg-blue-500/5' : 'border-amber-500/30 text-amber-600 bg-amber-500/5'}`}
                                                >
                                                    {member.code === 'WFH' ? 'REMOTE' : 'STANDBY'}
                                                </Badge>
                                                <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {details.time}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
