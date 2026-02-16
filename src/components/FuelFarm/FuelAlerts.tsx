import React from 'react';
import { Card, CardContent } from '../ui/card';
import { AlertTriangle } from 'lucide-react';
import { FuelStatusInfo } from './types';

interface FuelAlertsProps {
  fuelStatus: FuelStatusInfo;
}

export default function FuelAlerts({ fuelStatus }: FuelAlertsProps) {
  if (fuelStatus.status === 'critical') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span>CRITICAL FUEL LEVEL: Immediate replenishment required</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fuelStatus.status === 'low') {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="w-5 h-5" />
            <span>LOW FUEL LEVEL: Schedule replenishment soon</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}