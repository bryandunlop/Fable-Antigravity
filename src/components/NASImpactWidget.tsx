import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, Clock, MapPin, Activity, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useFlightNASImpact } from './hooks/useFlightNASImpact';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface NASImpactWidgetProps {
    compact?: boolean;
    className?: string;
    transparent?: boolean;
}

export default function NASImpactWidget({
    compact = false,
    className = "",
    transparent = false
}: NASImpactWidgetProps) {
    const { impactData, loading, error, refetch } = useFlightNASImpact();
    const nasData = impactData.nasData;

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-8 ${className}`}>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading NAS status...
                </div>
            </div>
        );
    }

    if (error || !nasData) {
        return (
            <div className={`flex items-center justify-center p-4 text-red-500 ${className}`}>
                <AlertCircle className="w-4 h-4 mr-2" />
                Unable to load NAS data
            </div>
        );
    }

    const hasActiveIssues =
        nasData.groundStops.length > 0 ||
        nasData.groundDelays.length > 0 ||
        nasData.airspaceFlowPrograms.length > 0;

    return (
        <Card className={`h-full border-none shadow-none bg-transparent ${className}`}>
            <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Activity className="w-5 h-5 text-orange-500" />
                        National Airspace Status
                    </CardTitle>
                    {hasActiveIssues && (
                        <div className="flex items-center gap-1.5 opacity-80">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                            </span>
                            <span className="text-xs font-medium text-orange-500 uppercase tracking-wider">Active</span>
                        </div>
                    )}
                </div>
                <CardDescription>
                    Real-time FAA delays, ground stops, and flow programs.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col min-h-0">

                    {!hasActiveIssues && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 mx-6 mb-6 bg-green-500/5 rounded-2xl border border-green-500/10">
                            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">All Systems Normal</h3>
                            <p className="text-sm text-green-600/80 dark:text-green-500/80 mt-1 max-w-[200px]">
                                No major delays or ground stops reported in the National Airspace System.
                            </p>
                        </div>
                    )}

                    {hasActiveIssues && (
                        <Tabs defaultValue="stops" className="flex-1 flex flex-col min-h-0 px-6 pb-6">
                            <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted/50 flex-none">
                                <TabsTrigger value="stops" className="text-xs">
                                    Stops ({nasData.groundStops.length})
                                </TabsTrigger>
                                <TabsTrigger value="delays" className="text-xs">
                                    Delays ({nasData.groundDelays.length})
                                </TabsTrigger>
                                <TabsTrigger value="programs" className="text-xs">
                                    Programs ({nasData.airspaceFlowPrograms.length})
                                </TabsTrigger>
                            </TabsList>

                            <ScrollArea className="flex-1 -mr-4 pr-4">
                                <TabsContent value="stops" className="mt-0 space-y-3">
                                    {nasData.groundStops.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">No active ground stops.</p>
                                    )}
                                    {nasData.groundStops.map((stop, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="destructive" className="font-bold text-xs">
                                                        {stop.airport}
                                                    </Badge>
                                                    <span className="text-sm font-medium text-red-700 dark:text-red-400">Ground Stop</span>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-white/50">
                                                    {stop.severity} Priority
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                {stop.reason}
                                            </p>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Started: {stop.startTime}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>

                                <TabsContent value="delays" className="mt-0 space-y-3">
                                    {nasData.groundDelays.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">No active ground delays.</p>
                                    )}
                                    {nasData.groundDelays.map((delay, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-bold border-orange-200 text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400">
                                                        {delay.airport}
                                                    </Badge>
                                                    <span className="text-sm font-medium text-foreground">
                                                        {delay.averageDelay} min
                                                    </span>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${delay.trend === 'Increasing' ? 'bg-red-100 text-red-700 border-red-200' :
                                                    delay.trend === 'Decreasing' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        'bg-slate-100 text-slate-700 border-slate-200'
                                                    }`}>
                                                    {delay.trend}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {delay.reason}
                                            </p>
                                        </div>
                                    ))}
                                </TabsContent>

                                <TabsContent value="programs" className="mt-0 space-y-3">
                                    {nasData.airspaceFlowPrograms.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-8">No active flow programs.</p>
                                    )}
                                    {nasData.airspaceFlowPrograms.map((prog, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${prog.impact === 'High' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                                <span className="text-sm font-medium text-foreground truncate">{prog.name}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                                {prog.reason}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {prog.affectedAirports.map(apt => (
                                                    <Badge key={apt} variant="secondary" className="text-[10px] px-1.5 h-5 font-mono">
                                                        {apt}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
