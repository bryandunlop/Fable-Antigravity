import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Wrench, TimerReset, Hammer } from 'lucide-react';
import { useTechLog, useCurrentUser, useDisplayZone } from '../TechLogContext';
import { formatRegulatoryCompact } from '../util/displayZone';
import { currentRows } from '../engine/supersede';
import { isDeferralExpired } from '../engine/pl25';
import { useRaiseFixFromDeferral } from '../useRectify';
import type { Deferral } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { DeferralCreatePanel } from '../components/panels/DeferralCreatePanel';
import { ExtendDeferralDialog } from '../components/panels/ExtendDeferralDialog';
import { DeferralDueLine } from '../components/DeferralDueLine';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

export default function Deferrals() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useTechLog();
  const { displayZone } = useDisplayZone();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const raiseFix = useRaiseFixFromDeferral();

  const defectId = params.get('defect') ?? undefined;
  const defect = defectId ? currentRows(state.defects).find(d => d.id === defectId) : undefined;
  const aircraft = defect ? state.aircraft.find(a => a.id === defect.aircraftId) : undefined;

  const openDeferrals = currentRows(state.deferrals).filter(d => d.status !== 'CLEARED');
  const tailOf = (id: string) => state.aircraft.find(a => a.id === id)?.tailNumber ?? '—';

  // One-tap extension (DOM 2026-07-09) — a fully signed, authorized supersede (TL-1), never an inline edit.
  const [extendFor, setExtendFor] = useState<Deferral | null>(null);
  const extendable = (d: Deferral) => d.category !== 'A' && d.category !== 'D' && !d.extensionUsed;

  // ===== CREATE MODE (deep-link from a defect) =====
  if (defect && aircraft) {
    return (
      <TechLogShell title={`Defer defect — ${aircraft.tailNumber}`} subtitle={`ATA ${defect.ataChapter} · ${defect.description}`}>
        {/* keyed by defect: the panel seeds regulatory state (D56 day of discovery) from the prop at
            mount, so a different defect must get a fresh panel, not the last one's. */}
        <DeferralCreatePanel
          key={defect.id}
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
          const expired = isDeferralExpired(d, new Date().toISOString(), { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles });
          const effective = expired ? 'EXPIRED' : d.status;
          const corr = state.campCorrelation.find(c => c.mygfoEntityId === d.id);
          return (
            <Card key={d.id}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{tailOf(d.aircraftId)}</span>
                    {/* TL-16: the MEL identity frozen on the signed deferral (D36), never a live
                        MelItem join — EDIT_MEL_ITEM replaces a row in place under the same id, so a
                        later revision would repaint this signed row. Absent snapshot reads as
                        absent; it is never backfilled from melItems. */}
                    <Badge variant="outline">MEL {d.melSubItemNumber ?? 'not recorded'}</Badge>
                    <Badge variant="outline">Cat {d.category}</Badge>
                    <Badge variant={effective === 'ACTIVE' ? 'secondary' : 'destructive'}>{effective}</Badge>
                    {corr?.campDiscrepancyRef && <Badge variant="outline">CAMP {corr.campDiscrepancyRef}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{d.melTitle ?? 'MEL item not recorded'}</p>
                  {d.repairDueDateUtc && (
                    <DeferralDueLine
                      clockStartUtc={d.clockStartDateUtc}
                      repairDueUtc={d.repairDueDateUtc}
                      category={d.category}
                      dueLabel={`due ${formatRegulatoryCompact(d.repairDueDateUtc, displayZone, d.governingTimezone)}`}
                      extended={d.extensionUsed}
                    />
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
                  {effective === 'ACTIVE' && isMaint && extendable(d) && (
                    <Button size="sm" variant="outline" onClick={() => setExtendFor(d)}>
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
      {extendFor && (
        <ExtendDeferralDialog
          deferral={extendFor}
          ataChapter={currentRows(state.defects).find(x => x.id === extendFor.defectId)?.ataChapter}
          open
          onOpenChange={(o) => { if (!o) setExtendFor(null); }}
        />
      )}
    </TechLogShell>
  );
}
