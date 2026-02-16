import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Plane, MapPin, Clock, Calendar, ChevronRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DailyFlightsWidget() {
    // Mock data - in a real app this would come from an API (MyAirOps/Satcom)
    const today = new Date();

    const flights = useMemo(() => [
        {
            id: 'LEG001',
            flightNumber: 'PG101',
            aircraft: 'N1PG',
            route: 'KTEB - EGLL',
            departureTime: '08:00',
            arrivalTime: '20:00',
            estimatedArrival: '19:45', // Early
            etaStatus: 'early', // early, late, on-time
            status: 'In Flight',
            passengers: 4
        },
        {
            id: 'LEG002',
            flightNumber: 'PG404',
            aircraft: 'N5PG',
            route: 'KSFO - KPHX',
            departureTime: '14:30',
            arrivalTime: '16:00',
            estimatedArrival: '16:10', // Delayed
            etaStatus: 'late',
            status: 'Scheduled',
            passengers: 2
        },
        {
            id: 'LEG003',
            flightNumber: 'PG991',
            aircraft: 'G650',
            route: 'KOPF - MYNN',
            departureTime: '10:00',
            arrivalTime: '11:15',
            estimatedArrival: '11:15', // On time
            etaStatus: 'on-time',
            status: 'Departed',
            passengers: 6
        }
    ], []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'In Flight': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
            case 'Scheduled': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400';
            case 'Departed': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400';
            case 'Delayed': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400';
        }
    };

    const getEtaColor = (status: string) => {
        switch (status) {
            case 'early': return 'text-green-600 dark:text-green-400 font-semibold';
            case 'late': return 'text-red-600 dark:text-red-400 font-semibold';
            default: return 'text-muted-foreground';
        }
    };

    return (
        <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Flights for Today
                    </CardTitle>
                    <Link to="/schedule">
                        <Badge variant="outline" className="hover:bg-accent cursor-pointer transition-colors">
                            View Schedule
                        </Badge>
                    </Link>
                </div>
                <CardDescription>
                    {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
                <div className="space-y-3">
                    {flights.map((flight) => (
                        <div
                            key={flight.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-blue-100/50 dark:bg-blue-900/20">
                                    <Plane className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        {flight.flightNumber}
                                        <span className="text-muted-foreground font-normal">• {flight.aircraft}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" />
                                        {flight.route}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <Badge variant="outline" className={`mb-1 ${getStatusColor(flight.status)} border-transparent`}>
                                    {flight.status}
                                </Badge>
                                <div className="text-xs flex flex-col items-end gap-0.5">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        Sched: {flight.arrivalTime}
                                    </div>
                                    {flight.status !== 'Scheduled' && (
                                        <div className={`flex items-center gap-1 ${getEtaColor(flight.etaStatus)}`}>
                                            <Activity className="w-3 h-3" />
                                            ETA: {flight.estimatedArrival}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {flights.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No flights scheduled for today.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
