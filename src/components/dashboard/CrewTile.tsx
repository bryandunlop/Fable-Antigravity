import React from 'react';
import { Users, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

export interface CrewData {
    onDuty: number;
    available: number;
    onRest: number;
    comingOffRest: number;
    dutyTimeWarnings: number;
}

interface CrewTileProps {
    data: CrewData;
}

export const CrewTile: React.FC<CrewTileProps> = ({ data }) => {
    return (
        <Card className="border-l-4 border-l-green-500 h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    Crew Availability
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">{data.onDuty}</p>
                        <p className="text-xs text-muted-foreground">On Duty</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded">
                        <p className="text-2xl font-bold text-blue-600">{data.available}</p>
                        <p className="text-xs text-muted-foreground">Available</p>
                    </div>
                </div>
                <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">On Rest</span>
                        <span className="font-medium">{data.onRest}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Off Rest in 4hrs</span>
                        <span className="font-medium">{data.comingOffRest}</span>
                    </div>
                </div>
                {data.dutyTimeWarnings > 0 && (
                    <Alert className="border-yellow-500 bg-yellow-50 py-2">
                        <Clock className="h-3 w-3 text-yellow-600" />
                        <AlertDescription className="text-xs text-yellow-800">
                            {data.dutyTimeWarnings} duty time warnings
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};
