import React from 'react';
import { Zap, Wrench, AlertTriangle, Fuel, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export interface AlertData {
    id: string;
    time: string;
    type: string;
    severity: string;
    message: string;
    action: string;
}

interface AlertsTileProps {
    alerts: AlertData[];
}

export const AlertsTile: React.FC<AlertsTileProps> = ({ alerts }) => {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    Recent Alerts
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-2 rounded-lg border text-xs ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                                alert.severity === 'medium' ? 'bg-orange-50 border-orange-200' :
                                    'bg-yellow-50 border-yellow-200'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {alert.type === 'maintenance' && <Wrench className="w-3 h-3" />}
                                    {alert.type === 'weather' && <AlertTriangle className="w-3 h-3" />}
                                    {alert.type === 'fuel' && <Fuel className="w-3 h-3" />}
                                    {alert.type === 'crew' && <Users className="w-3 h-3" />}
                                    <span className="font-medium">{alert.message}</span>
                                </div>
                                <span className="text-muted-foreground whitespace-nowrap ml-2">{alert.time}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                                {alert.action}
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
