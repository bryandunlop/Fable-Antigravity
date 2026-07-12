import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { useUnifiedFleetStatus } from './hooks/useUnifiedFleetStatus';
import { ServiceabilityChip } from './tech-log/components/ServiceabilityChip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Plane,
  CheckCircle,
  ChevronRight,
  Loader2,
  Fuel,
  Edit2,
  AlertTriangle
} from 'lucide-react';

interface FleetStatusWidgetProps {
  showDetailsLink?: boolean;
  className?: string;
  transparent?: boolean;
}

const RAG_DOT: Record<string, string> = {
  GREEN: 'var(--gfo-success, #00B140)',
  AMBER: 'var(--gfo-warning, #F1B434)',
  RED: 'var(--gfo-error, #EF3340)',
};

// Display-only fuel override (demo affordance until the fuel-request spine lands).
// Airworthiness has NO override: it is the derived tech-log projection, never editable here.
const useFuelOverrides = () => {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const updateFuel = (tailNumber: string, fuel: number) => {
    setOverrides(prev => ({ ...prev, [tailNumber]: fuel }));
  };
  return { overrides, updateFuel };
};

export default function FleetStatusWidget({
  showDetailsLink = true,
  className = "",
  transparent = false
}: FleetStatusWidgetProps) {
  const { fleet, dispatchable, inFlight, satcomLoading, satcomError, isRefreshing } = useUnifiedFleetStatus();
  const { overrides, updateFuel } = useFuelOverrides();

  return (
    <Card className={`relative overflow-hidden ${transparent ? 'bg-transparent border-none shadow-none' : 'hover:shadow-lg transition-shadow'} ${className}`}>
      <CardHeader className="px-0 pt-0 pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 font-semibold">
            <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Fleet Status
            {isRefreshing && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          </CardTitle>
          {showDetailsLink && (
            <Link to="/aircraft">
              <Button variant="ghost" size="sm" className="h-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 space-y-3">
        {/* Fleet Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
            <Plane className="w-4 h-4 text-green-600 dark:text-green-400" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">In Flight</div>
              <div className="font-semibold text-green-700 dark:text-green-400">{inFlight}/{fleet.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Dispatchable</div>
              <div className="font-semibold text-blue-700 dark:text-blue-400">{dispatchable}/{fleet.length}</div>
            </div>
          </div>
        </div>

        {/* Aircraft list — airworthiness from the tech-log derived projection */}
        <div className="space-y-2 pt-2">
          {fleet.map(ac => {
            const fuel = overrides[ac.tailNumber] !== undefined ? overrides[ac.tailNumber] : ac.fuelRemaining;
            const aw = ac.airworthiness;
            const reason =
              aw.status === 'RED'
                ? `${aw.openAffectingDefects} open defect${aw.openAffectingDefects === 1 ? '' : 's'}`
                : aw.status === 'AMBER'
                  ? `${aw.activeDeferrals} active deferral${aw.activeDeferrals === 1 ? '' : 's'}`
                  : null;
            return (
              <div key={ac.tailNumber} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 group/item">
                <Link to={`/tech-log/fleet?filter=${aw.status}`} className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RAG_DOT[aw.status] }} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground block leading-none mb-1">{ac.tailNumber}</span>
                    <span className="text-[10px] text-muted-foreground flex flex-col gap-0.5">
                      {reason && <span>{reason}</span>}
                      {fuel ? (
                        <span className="flex items-center gap-1">
                          <Fuel className="w-3 h-3" />
                          {fuel.toLocaleString()} lbs
                        </span>
                      ) : (
                        <span>{ac.location ?? 'No position feed'}</span>
                      )}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Edit2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <h4 className="font-medium leading-none">Fuel on board - {ac.tailNumber}</h4>
                          <p className="text-xs text-muted-foreground">
                            Display override only. Airworthiness is derived from the tech log and cannot be edited here.
                          </p>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                          <Label htmlFor={`fuel-${ac.tailNumber}`}>Fuel (lbs)</Label>
                          <Input
                            id={`fuel-${ac.tailNumber}`}
                            type="number"
                            defaultValue={fuel}
                            className="col-span-2 h-8"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFuel(ac.tailNumber, parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <ServiceabilityChip status={aw.status} pulse={false} />
                </div>
              </div>
            );
          })}
        </div>

        {(satcomError || satcomLoading) && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
            {satcomError ? <AlertTriangle className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
            {satcomError ? 'Position feed unavailable - showing airworthiness only' : 'Connecting to position feed...'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
