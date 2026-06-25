import { useNavigate } from 'react-router-dom';
import { Plane, Clock, Check, RefreshCw, BellRing } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { deriveServiceability } from '../engine/serviceability';
import { currentRows } from '../engine/supersede';
import type { AogAck } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

export default function Aog() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const { refreshCampReads } = useIntegration();
  const navigate = useNavigate();
  const now = new Date().toISOString();
  const acks = state.aogAcks ?? [];

  const aog = state.aircraft
    .filter(ac => !ac.isProvisional)
    .map(ac => ({ ac, sv: deriveServiceability(ac.id, state, now) }))
    .filter(x => x.sv.status === 'RED')
    .map(({ ac, sv }) => {
      const driver = sv.drivingDefectId ? currentRows(state.defects).find(d => d.id === sv.drivingDefectId) : undefined;
      const opens = currentRows(state.defects).filter(d => d.aircraftId === ac.id && (d.status === 'OPEN' || d.status === 'DEFERRED'));
      const since = opens.map(d => d.reportedAtUtc).sort()[0];
      const hours = since ? Math.floor((Date.now() - new Date(since).getTime()) / 3600000) : 0;
      const esc: AogAck['escalationAtAck'] = hours >= 24 ? 'CRITICAL' : hours >= 4 ? 'ELEVATED' : 'MONITOR';
      const latestAck = acks.find(a => a.aircraftId === ac.id);
      return { ac, driver, since, hours, esc, latestAck };
    });

  const acknowledge = (aircraftId: string, esc: AogAck['escalationAtAck']) => {
    dispatch({
      type: 'ACK_AOG',
      payload: { aircraftId, escalationAtAck: esc, acknowledgedByOid: user.oid, acknowledgedByName: user.displayName, atUtc: new Date().toISOString(), note: `${esc} AOG acknowledged` },
    });
  };

  return (
    <TechLogShell
      title="AOG — Aircraft on Ground"
      subtitle="Grounded aircraft, derived from serviceability — with escalation, acknowledgement, and CAMP cross-check."
    >
      {aog.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No aircraft are grounded — fleet is dispatchable.</CardContent></Card>
      )}
      <div className="space-y-3">
        {aog.map(({ ac, driver, since, hours, esc, latestAck }) => (
          <Card key={ac.id} className="border-l-4 border-l-[var(--gfo-error,#EF3340)]">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-[var(--gfo-error,#EF3340)]" />
                    <span className="text-lg font-semibold">{ac.tailNumber}</span>
                    <Badge variant="outline">{ac.type}</Badge>
                    <Badge variant="destructive">{esc}</Badge>
                    {latestAck && <Badge variant="secondary">acknowledged</Badge>}
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
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => acknowledge(ac.id, esc)}>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Acknowledge
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => refreshCampReads(ac.id)}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> CAMP state
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/tech-log/aircraft/${ac.tailNumber}`)}>Work it</Button>
                </div>
              </div>
              {latestAck && (
                <div className="inline-flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                  <BellRing className="h-3.5 w-3.5" /> Acknowledged by {latestAck.acknowledgedByName} · {new Date(latestAck.atUtc).toLocaleString()} (at {latestAck.escalationAtAck})
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {acks.length > 0 && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-medium">Acknowledgement log (off-ledger)</div>
            <div className="space-y-1">
              {acks.slice(0, 10).map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2 border-b py-1 text-xs text-muted-foreground last:border-0">
                  <span>{state.aircraft.find(x => x.id === a.aircraftId)?.tailNumber ?? a.aircraftId} · {a.escalationAtAck}</span>
                  <span>{a.acknowledgedByName} · {new Date(a.atUtc).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </TechLogShell>
  );
}
