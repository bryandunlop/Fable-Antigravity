import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Users, Phone, MapPin, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ShiftMember {
    id: string;
    name: string;
    role: string;
    status: 'active' | 'standby' | 'busy';
    location: string;
    avatar?: string;
}

export default function DutyRosterWidget() {
    const onShift: ShiftMember[] = [
        { id: '1', name: 'Capt. James Wilson', role: 'Flight Coordinator', status: 'active', location: 'Dispatch', avatar: 'JW' },
        { id: '2', name: 'Michael Chen', role: 'Maintenance Lead', status: 'active', location: 'Hangar B', avatar: 'MC' },
        { id: '3', name: 'Sarah Connor', role: 'Ops Manager', status: 'busy', location: 'OCC', avatar: 'SC' },
    ];

    const onCall: ShiftMember[] = [
        { id: '4', name: 'Dr. Alan Grant', role: 'Medical', status: 'standby', location: 'Remote', avatar: 'AG' },
        { id: '5', name: 'Elena Fisher', role: 'Safety Officer', status: 'standby', location: 'Remote', avatar: 'EF' },
    ];

    return (
        <Card className="h-full border-none shadow-none bg-transparent">
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
                    Current shift assignments and on-call personnel
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 space-y-6">

                {/* On Shift */}
                <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Shift
                    </h4>
                    <div className="space-y-3">
                        {onShift.map((member) => (
                            <div key={member.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border border-border">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.avatar}`} />
                                        <AvatarFallback>{member.avatar}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="text-sm font-medium leading-none group-hover:text-blue-500 transition-colors">
                                            {member.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {member.role}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge variant="secondary" className="text-[10px] font-normal bg-secondary/50">
                                        {member.location}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* On Call */}
                <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        On Call
                    </h4>
                    <div className="space-y-3">
                        {onCall.map((member) => (
                            <div key={member.id} className="flex items-center justify-between group opacity-80 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border border-border">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.avatar}`} />
                                        <AvatarFallback>{member.avatar}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="text-sm font-medium leading-none">
                                            {member.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {member.role}
                                        </div>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5">
                                    Standby
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
