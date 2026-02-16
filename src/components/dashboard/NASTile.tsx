import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';

export interface NASData {
    activeDelays: number;
    weatherAlerts: number;
    tfrs: number;
    affectedFlights: number;
    alerts: {
        airport: string;
        type: string;
        severity: string;
        delay: string;
        impact: string;
    }[];
}

interface NASTileProps {
    data: NASData;
}

export const NASTile: React.FC<NASTileProps> = ({ data }) => {
    return (
        <Card className="border-l-4 border-l-red-500 h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    NAS & Weather Alerts
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-1 text-center">
                    <div className="p-2 bg-red-50 rounded">
                        <p className="text-xl font-bold text-red-600">{data.activeDelays}</p>
                        <p className="text-xs text-muted-foreground">Delays</p>
                    </div>
                    <div className="p-2 bg-orange-50 rounded">
                        <p className="text-xl font-bold text-orange-600">{data.weatherAlerts}</p>
                        <p className="text-xs text-muted-foreground">Weather</p>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded">
                        <p className="text-xl font-bold text-yellow-600">{data.tfrs}</p>
                        <p className="text-xs text-muted-foreground">TFRs</p>
                    </div>
                </div>
                {data.affectedFlights > 0 && (
                    <Alert className="border-orange-500 bg-orange-50 py-2">
                        <Info className="h-3 w-3 text-orange-600" />
                        <AlertDescription className="text-xs text-orange-800">
                            {data.affectedFlights} flights affected
                        </AlertDescription>
                    </Alert>
                )}
                <div className="space-y-1">
                    {data.alerts.slice(0, 2).map((alert, idx) => (
                        <div key={idx} className="text-xs p-2 bg-muted/50 rounded">
                            <div className="flex justify-between">
                                <span className="font-medium">{alert.airport}</span>
                                <Badge variant="outline" className="text-xs h-4 px-1">{alert.type}</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1">{alert.impact}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
