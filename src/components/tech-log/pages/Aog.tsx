import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Clock, Check, RefreshCw, BellRing, FileText, PlayCircle, PackageSearch, ClipboardCheck, HelpCircle, Users } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { deriveServiceability } from '../engine/serviceability';
import { currentRows } from '../engine/supersede';
import { buildDowntimeDebrief } from '../engine/debrief';
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
  // Downtime debrief (QM5/D27) — the "why is it down, what has every hour been spent on" answer.
  const [debriefFor, setDebriefFor] = useState<string | null>(null);
  const nameOf = (oid?: string) => (oid && state.personnel.find(p => p.oid === oid)?.displayName) || oid || '—';

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
                  {driver && (
                    <Button size="sm" variant={debriefFor === ac.id ? 'secondary' : 'outline'} onClick={() => setDebriefFor(debriefFor === ac.id ? null : ac.id)}>
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> Debrief
                    </Button>
                  )}
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
              {debriefFor === ac.id && driver && (() => {
                const dbf = buildDowntimeDebrief(driver.id, state, now);
                return (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold uppercase tracking-wide text-muted-foreground">Downtime debrief</span>
                      <Badge variant="outline">{dbf.elapsedHours} h elapsed{dbf.ongoing ? ' · ongoing' : ''}</Badge>
                      <Badge variant="outline"><PlayCircle className="mr-1 h-3 w-3" />in work {dbf.stateHours.IN_WORK} h</Badge>
                      <Badge variant="outline"><PackageSearch className="mr-1 h-3 w-3" />parts (POO) {dbf.stateHours.WAITING_PARTS} h</Badge>
                      <Badge variant="outline"><ClipboardCheck className="mr-1 h-3 w-3" />inspection {dbf.stateHours.WAITING_INSPECTION} h</Badge>
                      <Badge variant="outline"><HelpCircle className="mr-1 h-3 w-3" />unattributed {dbf.untaggedHours} h</Badge>
                      <Badge variant="outline"><Users className="mr-1 h-3 w-3" />labor {dbf.labor.totalHours} man-h</Badge>
                    </div>
                    <div className="space-y-1.5 border-l-2 pl-3">
                      {dbf.events.map((e, i) => (
                        <div key={i} className="text-xs">
                          <span className="tabular-nums text-muted-foreground">{new Date(e.atUtc).toLocaleString()} — </span>
                          <span className={e.kind === 'TAG' ? '' : 'font-medium'}>{e.label}</span>
                          {e.byOid && <span className="text-muted-foreground"> · {nameOf(e.byOid)}</span>}
                          {e.note && <div className="ml-4 italic text-muted-foreground">{e.note}</div>}
                        </div>
                      ))}
                      {dbf.ongoing && <div className="text-xs text-muted-foreground">… still down ({dbf.elapsedHours} h and counting)</div>}
                    </div>
                    {(dbf.labor.byTech.length > 0 || dbf.labor.whyNotes.length > 0) && (
                      <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                        <div>
                          <div className="font-medium">Man-hours</div>
                          {dbf.labor.byTech.map(t => <div key={t.techOid} className="text-muted-foreground">{nameOf(t.techOid)} — {t.hours} h</div>)}
                          <div className="mt-1 text-muted-foreground">{dbf.labor.byCategory.map(c => `${c.category.toLowerCase().replace(/_/g, ' ')} ${c.hours}h`).join(' · ')}</div>
                        </div>
                        {dbf.labor.whyNotes.length > 0 && (
                          <div>
                            <div className="font-medium">Why it took this long</div>
                            {dbf.labor.whyNotes.map((n, i) => <div key={i} className="italic text-muted-foreground">"{n.note}" — {nameOf(n.techOid)}, {n.hours} h</div>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
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
