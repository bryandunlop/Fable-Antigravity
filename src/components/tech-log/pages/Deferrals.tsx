import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wrench, Clock, TimerReset, Hammer } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { currentRows } from '../engine/supersede';
import { computeRepairDue, isDeferralExpired } from '../engine/pl25';
import { CATEGORY_DAYS } from '../constants';
import { newId } from '../util/id';
import { useRaiseFixFromDeferral } from '../useRectify';
import type { Deferral } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { DeferralCreatePanel } from '../components/panels/DeferralCreatePanel';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

export default function Deferrals() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const raiseFix = useRaiseFixFromDeferral();

  const defectId = params.get('defect') ?? undefined;
  const defect = defectId ? currentRows(state.defects).find(d => d.id === defectId) : undefined;
  const aircraft = defect ? state.aircraft.find(a => a.id === defect.aircraftId) : undefined;

  const openDeferrals = currentRows(state.deferrals).filter(d => d.status !== 'CLEARED');
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';

  const extend = (d: Deferral) => {
    if (d.category === 'A' || d.category === 'D') return toast.error(`Cat ${d.category} deferrals cannot be extended.`);
    if (d.extensionUsed) return toast.error('This deferral has already used its one extension.');
    const ac = state.aircraft.find(a => a.id === d.aircraftId)!;
    const value = (CATEGORY_DAYS[d.category] ?? 0) * 2;
    const due = computeRepairDue(d.category, d.clockStartDateUtc, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: value }, { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles });
    const ext: Deferral = { ...d, id: newId('df'), supersedesId: d.id, extensionUsed: true, extensionTsUtc: new Date().toISOString(), extensionJustification: 'One-time extension (demo)', repairIntervalValue: value, repairDueDateUtc: due.repairDueDateUtc };
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: ext });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFERRAL_EXTENDED', entityType: 'Deferral', entityId: ext.id, atUtc: ext.extensionTsUtc!, summary: `Extended ${tailOf(d.aircraftId)} Cat ${d.category} deferral once` } });
    toast.success(`Cat ${d.category} deferral extended once.`);
  };

  // ===== CREATE MODE (deep-link from a defect) =====
  if (defect && aircraft) {
    return (
      <TechLogShell title={`Defer defect — ${aircraft.tailNumber}`} subtitle={`ATA ${defect.ataChapter} · ${defect.description}`}>
        <DeferralCreatePanel
          defect={defect}
          onCancel={() => navigate('/tech-log/defects')}
          onDone={(deferral) => {
            if (deferral.status === 'PENDING_PLACARD') {
              toast.warning(`Deferral pending (M)/placard — ${aircraft.tailNumber} stays GROUNDED until the gating release is signed.`);
              navigate(`/tech-log/releases?deferral=${deferral.id}&gating=1`);
            } else {
              toast.success(`${aircraft.tailNumber} dispatchable under MEL (AMBER).`);
              navigate(`/tech-log/aircraft/${aircraft.tailNumber}`);
            }
          }}
        />
      </TechLogShell>
    );
  }

  // ===== LIST MODE =====
  return (
    <TechLogShell title="MEL Deferrals" subtitle="Active and pending deferrals across the fleet.">
      <div className="space-y-3">
        {openDeferrals.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No open deferrals. Defer a defect from an aircraft's workspace.</CardContent></Card>}
        {openDeferrals.map(d => {
          const ac = state.aircraft.find(a => a.id === d.aircraftId)!;
          const mel = state.melItems.find(m => m.id === d.melItemId);
          const expired = isDeferralExpired(d, new Date().toISOString(), { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles });
          const effective = expired ? 'EXPIRED' : d.status;
          const ms = d.repairDueDateUtc ? new Date(d.repairDueDateUtc).getTime() - Date.now() : null;
          const corr = state.campCorrelation.find(c => c.mygfoEntityId === d.id);
          return (
            <Card key={d.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{tailOf(d.aircraftId)}</span>
                    <Badge variant="outline">MEL {mel?.subItemNumber ?? '—'}</Badge>
                    <Badge variant="outline">Cat {d.category}</Badge>
                    <Badge variant={effective === 'ACTIVE' ? 'secondary' : 'destructive'}>{effective}</Badge>
                    {corr?.campDiscrepancyRef && <Badge variant="outline">CAMP {corr.campDiscrepancyRef}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{mel?.title}</p>
                  {d.repairDueDateUtc && (
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> due {new Date(d.repairDueDateUtc).toLocaleDateString()} · {ms != null && ms > 0 ? `${Math.floor(ms / 86400000)}d left` : 'overdue'}
                      {d.extensionUsed && ' · extended'}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {isMaint && (
                    <Button size="sm" variant="outline" onClick={() => raiseFix(d)}>
                      <Hammer className="mr-1.5 h-4 w-4" /> Start fix
                    </Button>
                  )}
                  {effective === 'PENDING_PLACARD' && isMaint && (
                    <Button size="sm" onClick={() => navigate(`/tech-log/aircraft/${tailOf(d.aircraftId)}?tab=deferrals`)}>
                      <Wrench className="mr-1.5 h-4 w-4" /> Sign (M)/placard release
                    </Button>
                  )}
                  {effective === 'ACTIVE' && isMaint && (
                    <Button size="sm" variant="outline" onClick={() => extend(d)}>
                      <TimerReset className="mr-1.5 h-4 w-4" /> Extend
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/tech-log/aircraft/${tailOf(d.aircraftId)}`)}>View</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TechLogShell>
  );
}
