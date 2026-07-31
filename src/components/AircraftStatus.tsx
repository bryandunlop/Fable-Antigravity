import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Link } from 'react-router-dom';
import { useUnifiedFleetStatus } from './hooks/useUnifiedFleetStatus';
import { ServiceabilityChip } from './tech-log/components/ServiceabilityChip';
import {
  Plane,
  Wrench,
  Sparkles,
  FileText,
  Loader2,
  AlertTriangle,
  Fuel,
  MapPin,
  Gauge
} from 'lucide-react';

const FLIGHT_STATUS_LABEL: Record<string, string> = {
  'in-flight': 'In Flight',
  'taxi': 'Taxiing',
  'on-ground': 'On Ground',
  'parked': 'Parked',
  'unknown': 'No position feed',
};

export default function AircraftStatus() {
  const { fleet, dispatchable, satcomLoading, satcomError, isRefreshing } = useUnifiedFleetStatus();

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Plane className="w-8 h-8 text-blue-600" />
            Aircraft Status
            {isRefreshing && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground ml-2" />}
          </h1>
          <p className="text-muted-foreground mt-2">
            Airworthiness derived from the tech log ({dispatchable}/{fleet.length} dispatchable), with live position overlay
          </p>
        </div>
      </div>

      {satcomError && (
        <div className="flex items-center gap-2 p-3 border border-amber-200 rounded-lg bg-amber-50 text-amber-800 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Position feed unavailable — showing airworthiness only.
        </div>
      )}

      {/* Per-tail airworthiness cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {fleet.map(ac => {
          const aw = ac.airworthiness;
          const reasonParts: string[] = [];
          if (aw.openAffectingDefects > 0) {
            reasonParts.push(`${aw.openAffectingDefects} open defect${aw.openAffectingDefects === 1 ? '' : 's'}`);
          }
          if (aw.activeDeferrals > 0) {
            reasonParts.push(`${aw.activeDeferrals} active deferral${aw.activeDeferrals === 1 ? '' : 's'}`);
          }
          const reason = reasonParts.length > 0 ? reasonParts.join(' · ') : 'No open defects';

          return (
            <Card key={ac.tailNumber} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{ac.tailNumber}</CardTitle>
                    <CardDescription>{ac.model}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {/* LG-143 — a provisional tail gets the badge INSTEAD of a RAG chip, never
                        alongside it. deriveServiceability has no notion of isProvisional, so a
                        clean tail in onboarding reads GREEN and rendered a green "Serviceable" chip
                        next to the badge saying its MEL is not approved yet. */}
                    {aw.isProvisional
                      ? <Badge variant="outline">Provisional</Badge>
                      : <ServiceabilityChip status={aw.status} />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{reason}</p>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    {satcomLoading
                      ? 'Connecting to position feed...'
                      : ac.location ?? FLIGHT_STATUS_LABEL[ac.flightStatus]}
                  </div>
                  {ac.flightStatus === 'in-flight' && ac.position && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="w-4 h-4 shrink-0" />
                      {ac.position.altitude.toLocaleString()} ft · {ac.position.groundSpeed} kts
                    </div>
                  )}
                  {ac.fuelRemaining !== undefined && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Fuel className="w-4 h-4 shrink-0" />
                      {ac.fuelRemaining.toLocaleString()} lbs
                    </div>
                  )}
                  {ac.unacknowledgedAlerts > 0 && (
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {ac.unacknowledgedAlerts} unacknowledged alert{ac.unacknowledgedAlerts === 1 ? '' : 's'}
                    </div>
                  )}
                </div>

                <Link to={`/tech-log/fleet?filter=${aw.status}`}>
                  <Button variant="outline" size="sm" className="w-full mt-1">
                    Open in Tech Log
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Access Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Cleaning Management
            </CardTitle>
            <CardDescription>Track and manage aircraft cleaning status</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/aircraft-cleaning">
              <Button className="w-full">
                Go to Cleaning Tracker
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="w-5 h-5 text-blue-600" />
              Maintenance Hub
            </CardTitle>
            <CardDescription>View work orders and maintenance status</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/maintenance-hub">
              <Button className="w-full">
                Go to Maintenance
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-green-600" />
              Tech Log
            </CardTitle>
            <CardDescription>Report squawks and discrepancies</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/tech-log">
              <Button className="w-full">
                Go to Tech Log
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
