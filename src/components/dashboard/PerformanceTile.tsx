import React from 'react';
import { Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';

export interface PerformanceData {
    flightsScheduled: number;
    flightsCompleted: number;
    onTimeRate: number;
    currentPassengers: number;
    completionRate: number;
}

interface PerformanceTileProps {
    data: PerformanceData;
}

export const PerformanceTile: React.FC<PerformanceTileProps> = ({ data }) => {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Today's Performance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{data.flightsCompleted}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold">{data.flightsScheduled}</p>
                        <p className="text-xs text-muted-foreground">Scheduled</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{data.onTimeRate}%</p>
                        <p className="text-xs text-muted-foreground">On-Time</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{data.currentPassengers}</p>
                        <p className="text-xs text-muted-foreground">Passengers</p>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span>Daily Completion</span>
                        <span className="font-medium">{data.completionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={data.completionRate} className="h-2" />
                </div>
            </CardContent>
        </Card>
    );
};
