import React from 'react';
import { Wrench, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';

export interface MaintenanceData {
    workOrdersActive: number;
    techsOnDuty: number;
    aogAircraft: number;
    criticalSquawks: number;
    activeWorkOrders: {
        id: string;
        aircraft: string;
        type: string;
        technician: string;
        progress: number;
        priority: string;
    }[];
}

interface MaintenanceTileProps {
    data: MaintenanceData;
}

export const MaintenanceTile: React.FC<MaintenanceTileProps> = ({ data }) => {
    return (
        <Card className="border-l-4 border-l-orange-500 h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-orange-600" />
                    Maintenance Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-orange-50 rounded">
                        <p className="text-2xl font-bold text-orange-600">{data.workOrdersActive}</p>
                        <p className="text-xs text-muted-foreground">Active WOs</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">{data.techsOnDuty}</p>
                        <p className="text-xs text-muted-foreground">Techs On Duty</p>
                    </div>
                </div>
                {data.aogAircraft > 0 && (
                    <Alert className="border-red-500 bg-red-50 py-2">
                        <AlertCircle className="h-3 w-3 text-red-600" />
                        <AlertDescription className="text-xs text-red-800">
                            {data.aogAircraft} AOG Aircraft
                        </AlertDescription>
                    </Alert>
                )}
                <div className="space-y-1">
                    {data.activeWorkOrders.slice(0, 2).map((wo) => (
                        <div key={wo.id} className="text-xs p-2 bg-muted/50 rounded">
                            <div className="flex justify-between mb-1">
                                <span className="font-medium">{wo.aircraft}</span>
                                <span className="text-muted-foreground">{wo.progress}%</span>
                            </div>
                            <Progress value={wo.progress} className="h-1" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
