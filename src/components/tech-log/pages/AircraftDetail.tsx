import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, AlertTriangle, Wrench, FilePlus, ClipboardList, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { deriveServiceability } from '../engine/serviceability';
import { currentRows } from '../engine/supersede';
import { isDeferralExpired } from '../engine/pl25';
import { ServiceabilityChip } from '../components/ServiceabilityChip';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { TechLogShell } from '../components/TechLogShell';
import { INTENT } from '../constants';
import { newId } from '../util/id';
import type { Signature } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

const RULE_TEXT: Record<number, string> = {
  1: 'Open airworthiness defect not covered by an active deferral',
  2: 'A deferral has reached its repair-due condition (expired)',
  3: 'An expired dispatch-gating recurring check',
  4: 'At least one active MEL deferral in force',
  5: 'No open defects and no active deferrals',
};

export default function AircraftDetail() {
  const { tail } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const isMaint = user.role === 'MAINTENANCE';
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [pendingAcceptId, setPendingAcceptId] = useState('');

  const ac = state.aircraft.find(a => a.tailNumber === tail);
  if (!ac) {
    return (
      <TechLogShell title="Aircraft not found">
        <Button variant="outline" onClick={() => navigate('/tech-log')}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to fleet
        </Button>
      </TechLogShell>
    );
  }

  const now = new Date().toISOString();
  const sv = deriveServiceability(ac.id, state, now);
  const defects = currentRows(state.defects).filter(d => d.aircraftId === ac.id && d.status !== 'CLOSED' && d.status !== 'RECTIFIED');
  const deferrals = currentRows(state.deferrals).filter(d => d.aircraftId === ac.id && d.status !== 'CLEARED');
  const airframe = { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles };
  const auditRows = state.audit.filter(a => defects.some(d => d.id === a.entityId) || deferrals.some(d => d.id === a.entityId)).slice(0, 8);
  const lastAcceptance = state.signatures.filter(s => s.signedEntity === 'ACCEPTANCE' && s.signedEntityId === ac.id).slice(-1)[0];

  const beginAccept = () => { setPendingAcceptId(newId('acc')); setAcceptOpen(true); };
  const onAccepted = (sig: Signature) => {
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'AIRCRAFT_ACCEPTED', entityType: 'Aircraft', entityId: ac.id, atUtc: new Date().toISOString(), summary: `${ac.tailNumber} accepted for flight by PIC ${user.displayName}` } });
    toast.success(`${ac.tailNumber} accepted for flight by ${user.displayName}.`);
  };

  return (
    <TechLogShell
      title={`${ac.tailNumber} — ${ac.type}`}
      subtitle={`S/N ${ac.serialNumber} · ${ac.airframeTotalHours.toFixed(1)} hrs · ${ac.airframeTotalCycles} cyc · ${ac.homeBase}`}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => navigate('/tech-log')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Fleet
          </Button>
          <Button size="sm" onClick={() => navigate(`/tech-log/defects?tail=${ac.tailNumber}&new=1`)}>
            <FilePlus className="mr-1.5 h-4 w-4" /> Report defect
          </Button>
          {isMaint && (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/tech-log/deferrals?tail=${ac.tailNumber}`)}>
              <ClipboardList className="mr-1.5 h-4 w-4" /> Deferrals
            </Button>
          )}
          {!isMaint && !ac.isProvisional && sv.status !== 'RED' && (
            <Button size="sm" variant="secondary" onClick={beginAccept}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Accept (PIC)
            </Button>
          )}
        </>
      }
    >
      {/* Status / why */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              {ac.isProvisional ? <Badge variant="outline">Provisional</Badge> : <ServiceabilityChip status={sv.status} />}
              <span className="text-sm text-muted-foreground">{RULE_TEXT[sv.governingRule]}</span>
            </div>
            {lastAcceptance && (
              <span className="text-xs text-[var(--gfo-success,#00B140)]">PIC accepted by {lastAcceptance.signerName} · {new Date(lastAcceptance.signedAtUtc).toLocaleString()}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">as of {new Date(now).toLocaleString()}</div>
        </CardContent>
      </Card>

      {ac.isProvisional && (
        <Card className="mb-4 border-muted-foreground/30">
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <span>This G800 is in onboarding. Its D195 MEL is <strong>pending FSDO approval</strong>, so deferrals cannot be created against it yet.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Open defects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" /> Open defects ({defects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {defects.length === 0 && <p className="text-sm text-muted-foreground">No open defects.</p>}
            {defects.map(d => (
              <div key={d.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">ATA {d.ataChapter} · {d.severity}</span>
                  <Badge variant={d.status === 'OPEN' ? 'destructive' : 'secondary'}>{d.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Deferrals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" /> MEL deferrals ({deferrals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deferrals.length === 0 && <p className="text-sm text-muted-foreground">No active deferrals.</p>}
            {deferrals.map(d => {
              const expired = isDeferralExpired(d, now, airframe);
              const effective = expired ? 'EXPIRED' : d.status;
              const mel = state.melItems.find(m => m.id === d.melItemId);
              const ms = d.repairDueDateUtc ? new Date(d.repairDueDateUtc).getTime() - Date.now() : null;
              return (
                <div key={d.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">MEL {mel?.subItemNumber ?? '—'} · Cat {d.category}</span>
                    <Badge variant={effective === 'ACTIVE' ? 'secondary' : 'destructive'}>{effective}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{mel?.title}</p>
                  {d.repairDueDateUtc && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      due {new Date(d.repairDueDateUtc).toLocaleDateString()} ·{' '}
                      {ms != null && ms > 0 ? `${Math.floor(ms / 86400000)}d left` : 'overdue'}
                    </div>
                  )}
                  {effective === 'PENDING_PLACARD' && (
                    <div className="mt-2 rounded bg-[var(--gfo-error,#EF3340)]/10 px-2 py-1 text-xs text-[var(--gfo-error,#EF3340)]">
                      Awaiting (M)/placard release — aircraft stays grounded until signed.
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Audit */}
      {auditRows.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {auditRows.map(a => (
              <div key={a.id} className="flex justify-between gap-3 border-b py-1 last:border-0">
                <span className="text-muted-foreground">{a.summary}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.atUtc).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <SignCeremonyDialog
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        signer={user}
        signedEntity="ACCEPTANCE"
        signedEntityId={pendingAcceptId}
        intentStatement={INTENT.ACCEPTANCE}
        onSigned={onAccepted}
        title="Crew acceptance (PIC)"
      />
    </TechLogShell>
  );
}
