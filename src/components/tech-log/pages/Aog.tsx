import { useNavigate } from 'react-router-dom';
import { Plane, Clock } from 'lucide-react';
import { useTechLog } from '../TechLogContext';
import { deriveServiceability } from '../engine/serviceability';
import { currentRows } from '../engine/supersede';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

export default function Aog() {
  const { state } = useTechLog();
  const navigate = useNavigate();
  const now = new Date().toISOString();

  const aog = state.aircraft
    .filter(ac => !ac.isProvisional)
    .map(ac => ({ ac, sv: deriveServiceability(ac.id, state, now) }))
    .filter(x => x.sv.status === 'RED')
    .map(({ ac, sv }) => {
      const driver = sv.drivingDefectId ? currentRows(state.defects).find(d => d.id === sv.drivingDefectId) : undefined;
      const opens = currentRows(state.defects).filter(d => d.aircraftId === ac.id && (d.status === 'OPEN' || d.status === 'DEFERRED'));
      const since = opens.map(d => d.reportedAtUtc).sort()[0];
      const hours = since ? Math.floor((Date.now() - new Date(since).getTime()) / 3600000) : 0;
      const esc = hours >= 24 ? 'CRITICAL' : hours >= 4 ? 'ELEVATED' : 'MONITOR';
      return { ac, driver, since, hours, esc };
    });

  return (
    <TechLogShell
      title="AOG — Aircraft on Ground"
      subtitle="Grounded aircraft, derived from serviceability. Phase-2 preview: escalation + downtime tracking."
    >
      {aog.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No aircraft are grounded — fleet is dispatchable.</CardContent></Card>
      )}
      <div className="space-y-3">
        {aog.map(({ ac, driver, since, hours, esc }) => (
          <Card key={ac.id} className="border-l-4 border-l-[var(--gfo-error,#EF3340)]">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-[var(--gfo-error,#EF3340)]" />
                  <span className="text-lg font-semibold">{ac.tailNumber}</span>
                  <Badge variant="outline">{ac.type}</Badge>
                  <Badge variant="destructive">{esc}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {driver ? `ATA ${driver.ataChapter} — ${driver.description}` : 'Grounded (see aircraft detail).'}
                </p>
                {since && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> down {hours}h · since {new Date(since).toLocaleString()}
                  </div>
                )}
              </div>
              <Button size="sm" onClick={() => navigate(`/tech-log/aircraft/${ac.tailNumber}`)}>Work it</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </TechLogShell>
  );
}
