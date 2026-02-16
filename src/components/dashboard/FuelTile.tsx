import React from 'react';
import { Fuel, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';

export interface FuelData {
    currentLevel: number;
    capacity: number;
    consumption24h: number;
    consumptionRate: number;
    timeToReplenish: number;
    trend: string;
}

interface FuelTileProps {
    data: FuelData;
}

export const FuelTile: React.FC<FuelTileProps> = ({ data }) => {
    return (
        <Card className="border-l-4 border-l-yellow-500 h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-yellow-600" />
                    Fuel Farm Live
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">
                        {((data.currentLevel / data.capacity) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {data.currentLevel.toLocaleString()} / {data.capacity.toLocaleString()} gal
                    </p>
                </div>
                <Progress
                    value={(data.currentLevel / data.capacity) * 100}
                    className="h-2"
                />
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p className="text-muted-foreground">Consumption Rate</p>
                        <p className="font-medium flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-red-500" />
                            {data.consumptionRate} gal/hr
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Time to 80%</p>
                        <p className="font-medium">{data.timeToReplenish.toFixed(1)} hrs</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
