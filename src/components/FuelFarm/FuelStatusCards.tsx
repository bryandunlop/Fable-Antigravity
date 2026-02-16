import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Fuel, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { FuelFarmStatus, FuelingRecord } from './types';
import { getFuelLevelStatus, calculateTodayDispensed, calculateTodayReplenished, getTodayRecords } from './utils';

interface FuelStatusCardsProps {
  fuelFarmStatus: FuelFarmStatus;
  records: FuelingRecord[];
}

export default function FuelStatusCards({ fuelFarmStatus, records }: FuelStatusCardsProps) {
  const fuelStatus = getFuelLevelStatus(fuelFarmStatus);
  const fuelPercentage = (fuelFarmStatus.currentLevel / fuelFarmStatus.totalCapacity) * 100;
  const todayRecords = getTodayRecords(records);
  const todayDispensed = calculateTodayDispensed(records);
  const todayReplenished = calculateTodayReplenished(records);

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            Current Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={fuelStatus.color}>
                {fuelFarmStatus.currentLevel.toLocaleString()} gal
              </span>
              <Badge variant="outline" className={`${fuelStatus.bgColor} ${fuelStatus.color}`}>
                {fuelPercentage.toFixed(1)}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  fuelStatus.status === 'critical' ? 'bg-red-600' :
                  fuelStatus.status === 'low' ? 'bg-orange-600' :
                  fuelStatus.status === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: `${fuelPercentage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Capacity: {fuelFarmStatus.totalCapacity.toLocaleString()} gal
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Today Dispensed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-red-600">{todayDispensed.toLocaleString()} gal</div>
            <div className="text-xs text-muted-foreground">
              {todayRecords.filter(r => r.type === 'dispensed').length} operations
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Today Added
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div className="text-green-600">{todayReplenished.toLocaleString()} gal</div>
            <div className="text-xs text-muted-foreground">
              {todayRecords.filter(r => r.type === 'replenished').length} deliveries
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Last Updated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <div>{new Date(fuelFarmStatus.lastUpdated).toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(fuelFarmStatus.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}