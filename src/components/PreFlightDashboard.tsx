import React from 'react';
import { useMaintenanceContext } from './contexts/MaintenanceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { CheckCircle, AlertTriangle, XCircle, ArrowRight, Shield } from 'lucide-react';

interface PreFlightDashboardProps {
    tailNumber: string;
}

export default function PreFlightDashboard({ tailNumber }: PreFlightDashboardProps) {
    const { aircraftAvailability, squawks } = useMaintenanceContext();

    const aircraft = aircraftAvailability.find(a => a.tail === tailNumber);
    const activeSquawks = squawks.filter(s => s.aircraftTail === tailNumber && s.status !== 'closed');
    const criticalSquawks = activeSquawks.filter(s => s.priority === 'critical');
    const deferredItems = activeSquawks.filter(s => s.status === 'deferred');

    if (!aircraft) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                    <h3 className="font-bold text-lg text-red-700">Aircraft Not Found</h3>
                    <p className="text-red-600">Could not load status for {tailNumber}</p>
                </CardContent>
            </Card>
        );
    }

    const isGrounded = aircraft.status === 'grounded' || criticalSquawks.length > 0;
    const isLimited = aircraft.status === 'limited' || deferredItems.length > 0;

    return (
        <div className="space-y-6">
            {/* MAIN STATUS INDICATOR */}
            <Card className={`border-l-8 ${isGrounded ? 'border-l-red-500 border-red-200 bg-red-50' :
                    isLimited ? 'border-l-yellow-500 border-yellow-200 bg-yellow-50' :
                        'border-l-green-500 border-green-200 bg-green-50'
                }`}>
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                    {isGrounded ? (
                        <>
                            <XCircle className="w-24 h-24 text-red-600 mb-4" />
                            <h1 className="text-4xl font-extrabold text-red-700 mb-2">NO-GO</h1>
                            <p className="text-red-600 font-medium">Aircraft is Grounded due to critical maintenance items.</p>
                        </>
                    ) : isLimited ? (
                        <>
                            <AlertTriangle className="w-24 h-24 text-yellow-600 mb-4" />
                            <h1 className="text-4xl font-extrabold text-yellow-700 mb-2">GO - LIMITED</h1>
                            <p className="text-yellow-600 font-medium">Airworthy with active Deferrals/MELs.</p>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-24 h-24 text-green-600 mb-4" />
                            <h1 className="text-4xl font-extrabold text-green-700 mb-2">GO</h1>
                            <p className="text-green-600 font-medium">Aircraft is fully Airworthy.</p>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ACTIVE DEFERRALS (MEL/CDL) */}
            {deferredItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-500" />
                            Active Deferrals (MEL/CDL)
                        </CardTitle>
                        <CardDescription>
                            Review these items before flight.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {deferredItems.map(item => (
                                <div key={item.id} className="p-4 border rounded-lg bg-amber-50/50 border-amber-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="border-amber-500 text-amber-700 font-bold">
                                            MEL {item.deferral?.melReference || 'N/A'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            EXP: {item.deferral?.expiryDate ? new Date(item.deferral.expiryDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-sm mb-1">{item.title || item.description || 'No Description'}</h4>
                                    {item.deferral?.operationalLimitations && item.deferral.operationalLimitations.length > 0 && (
                                        <div className="mt-2 bg-amber-100/50 p-2 rounded text-xs">
                                            <span className="font-bold text-amber-800">LIMITATIONS:</span>
                                            <ul className="list-disc list-inside mt-1 text-amber-900">
                                                {item.deferral.operationalLimitations.map((lim, idx) => (
                                                    <li key={idx}>{lim}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* CRITICAL ISSUES (IF GROUNDED) */}
            {criticalSquawks.length > 0 && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="text-red-700 flex items-center gap-2">
                            <XCircle className="w-5 h-5" />
                            Critical Grounding Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {criticalSquawks.map(item => (
                                <div key={item.id} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="destructive">CRITICAL</Badge>
                                        <span className="font-mono text-xs">{item.ataChapter}</span>
                                    </div>
                                    <p className="font-medium text-sm">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
