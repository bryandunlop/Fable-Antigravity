import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
    Plane,
    Clock,
    MapPin,
    CheckCircle2,
    Circle,
    Timer,
    ArrowRight
} from 'lucide-react';
import { OOOITimes, calculateFlightDuration, calculateBlockTime, formatOOOITime } from '../services/satcomService';

interface OOOITimesDisplayProps {
    tailNumber: string;
    oooi: OOOITimes;
    departureAirport?: string;
    arrivalAirport?: string;
    flightStatus?: string;
    className?: string;
}

export default function OOOITimesDisplay({
    tailNumber,
    oooi,
    departureAirport,
    arrivalAirport,
    flightStatus,
    className = ''
}: OOOITimesDisplayProps) {
    const flightTime = calculateFlightDuration(oooi);
    const blockTime = calculateBlockTime(oooi);

    const isEventComplete = (time: string | null) => time !== null && time !== '';

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Plane className="w-5 h-5" />
                            {tailNumber}
                        </CardTitle>
                        <CardDescription>
                            {departureAirport && arrivalAirport ? (
                                <span className="flex items-center gap-2 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {departureAirport} <ArrowRight className="w-3 h-3" /> {arrivalAirport}
                                </span>
                            ) : (
                                'OOOI Times'
                            )}
                        </CardDescription>
                    </div>
                    {flightStatus && (
                        <Badge
                            variant={flightStatus === 'Complete' ? 'default' : 'outline'}
                            className={flightStatus === 'Complete' ? 'bg-green-500' : ''}
                        >
                            {flightStatus}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {/* OOOI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* OUT */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            {isEventComplete(oooi.out) ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <Circle className="w-4 h-4 text-gray-300" />
                            )}
                            OUT
                        </div>
                        <div className="text-2xl font-bold font-mono">
                            {formatOOOITime(oooi.out)}
                        </div>
                        <div className="text-xs text-muted-foreground">Out of Gate</div>
                    </div>

                    {/* OFF */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            {isEventComplete(oooi.off) ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <Circle className="w-4 h-4 text-gray-300" />
                            )}
                            OFF
                        </div>
                        <div className="text-2xl font-bold font-mono">
                            {formatOOOITime(oooi.off)}
                        </div>
                        <div className="text-xs text-muted-foreground">Wheels Up</div>
                    </div>

                    {/* ON */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            {isEventComplete(oooi.on) ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <Circle className="w-4 h-4 text-gray-300" />
                            )}
                            ON
                        </div>
                        <div className="text-2xl font-bold font-mono">
                            {formatOOOITime(oooi.on)}
                        </div>
                        <div className="text-xs text-muted-foreground">Wheels Down</div>
                    </div>

                    {/* IN */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            {isEventComplete(oooi.in) ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <Circle className="w-4 h-4 text-gray-300" />
                            )}
                            IN
                        </div>
                        <div className="text-2xl font-bold font-mono">
                            {formatOOOITime(oooi.in)}
                        </div>
                        <div className="text-xs text-muted-foreground">In the Gate</div>
                    </div>
                </div>

                {/* Duration Stats */}
                {(flightTime !== null || blockTime !== null) && (
                    <div className="border-t pt-4 mt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {flightTime !== null && (
                                <div className="flex items-center gap-2">
                                    <Timer className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <div className="font-medium">Flight Time</div>
                                        <div className="text-muted-foreground">
                                            {Math.floor(flightTime / 60)}h {Math.floor(flightTime % 60)}m
                                        </div>
                                    </div>
                                </div>
                            )}
                            {blockTime !== null && (
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-500" />
                                    <div>
                                        <div className="font-medium">Block Time</div>
                                        <div className="text-muted-foreground">
                                            {Math.floor(blockTime / 60)}h {Math.floor(blockTime % 60)}m
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Visual Timeline */}
                <div className="mt-6 relative">
                    <div className="flex items-center justify-between relative">
                        {/* Progress bar background */}
                        <div className="absolute left-0 right-0 top-1/2 h-2 bg-gray-200 rounded-full -translate-y-1/2" />

                        {/* Progress bar fill */}
                        <div
                            className="absolute left-0 top-1/2 h-2 bg-blue-500 rounded-full -translate-y-1/2 transition-all"
                            style={{
                                width: `${isEventComplete(oooi.in) ? '100%' :
                                        isEventComplete(oooi.on) ? '75%' :
                                            isEventComplete(oooi.off) ? '50%' :
                                                isEventComplete(oooi.out) ? '25%' : '0%'
                                    }%`
                            }}
                        />

                        {/* Milestone markers */}
                        {['out', 'off', 'on', 'in'].map((event, index) => {
                            const time = oooi[event as keyof OOOITimes];
                            const complete = isEventComplete(time);

                            return (
                                <div key={event} className="relative z-10 flex flex-col items-center">
                                    <div
                                        className={`w-4 h-4 rounded-full border-2 ${complete
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'bg-white border-gray-300'
                                            }`}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
