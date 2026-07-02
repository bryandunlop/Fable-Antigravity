import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Wrench, FilePlus, Clock, ShieldAlert, CheckCircle2, CalendarClock, Plus,
  Printer, Package, PlaneTakeoff, History, TimerReset, ClipboardList, CloudDownload,
} from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { useIntegration } from '../integration/useIntegration';
import { useRectifyToWorkCard } from '../useRectify';
import { deriveServiceability } from '../engine/serviceability';
import { currentRows } from '../engine/supersede';
import { isDeferralExpired, computeRepairDue } from '../engine/pl25';
import { projectCheck } from '../engine/recurringChecks';
import { canSignPlacardDischarge } from '../engine/disposition';
import { CATEGORY_DAYS, INTENT } from '../constants';
import { WO_HEADER_STATUS } from '../integration/campTaxonomy';
import { printSignedRecord, mockPdfBlobUri } from '../util/printRecord';
import { newId } from '../util/id';
import type {
  Signature, RecurringCheck, RecurringCheckAccomplishment, RecurringIntervalUnit, Deferral,
  MaintenanceRelease, WorkCard,
} from '../types';
import { deriveCustody } from '../engine/custody';
import { lifecycleStep } from '../engine/lifecycle';
import { ServiceabilityChip } from '../components/ServiceabilityChip';
import { CustodyChip } from '../components/CustodyChip';
import { SignCeremonyDialog } from '../components/SignCeremonyDialog';
import { TechLogShell } from '../components/TechLogShell';
import { ReportDefectDialog } from '../components/panels/ReportDefectDialog';
import { BriefingPanel } from '../components/BriefingPanel';
import { PostflightPanel } from '../components/PostflightPanel';
import { DeferralCreatePanel } from '../components/panels/DeferralCreatePanel';
import { RectifyPanel } from '../components/panels/RectifyPanel';
import { GatingReleasePanel } from '../components/panels/GatingReleasePanel';
import { LifecycleStepper, type StepKey } from '../components/LifecycleStepper';
import { ActivityFeed } from '../components/ActivityFeed';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { cn } from '../../ui/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const RULE_TEXT: Record<number, string> = {
  1: 'Open airworthiness defect not covered by an active deferral',
  2: 'A deferral has reached its repair-due condition (expired)',
  3: 'An expired dispatch-gating recurring check',
  4: 'At least one active MEL deferral in force',
  5: 'No open defects and no active deferrals',
};

const CHECK_BADGE: Record<string, 'secondary' | 'destructive' | 'outline'> = { CURRENT: 'secondary', DUE_SOON: 'outline', EXPIRED: 'destructive', NEVER_DONE: 'destructive' };

type WorkspaceTab = 'workspace' | 'defects' | 'deferrals' | 'releases' | 'workcards' | 'flights' | 'audit';
const TABS: { key: WorkspaceTab; label: string }[] = [
  { key: 'defects', label: 'Defects' },
  { key: 'deferrals', label: 'Deferrals' },
  { key: 'releases', label: 'Releases' },
  { key: 'workcards', label: 'Work Cards' },
  { key: 'flights', label: 'Flights' },
  { key: 'audit', label: 'Audit' },
];

type Inline = { kind: 'defer' | 'rectify' | 'gating'; id: string } | null;

export default function AircraftDetail() {
  const { tail } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const integration = useIntegration();
  const rectifyToWorkCard = useRectifyToWorkCard();
  const isMaint = user.role === 'MAINTENANCE';

  const tab = (params.get('tab') as WorkspaceTab) || 'workspace';
  const setTab = (t: WorkspaceTab) => setParams(prev => { const p = new URLSearchParams(prev); p.set('tab', t); p.delete('deferral'); p.delete('gating'); p.delete('defect'); return p; }, { replace: true });

  const [inline, setInline] = useState<Inline>(null);
  const [reportOpen, setReportOpen] = useState(false);
  // recurring checks
  const [accCheckId, setAccCheckId] = useState<string | null>(null);
  const [accSignOpen, setAccSignOpen] = useState(false);
  const [pendingAccId, setPendingAccId] = useState('');
  const [addCheckOpen, setAddCheckOpen] = useState(false);
  const [ckName, setCkName] = useState('');
  const [ckUnit, setCkUnit] = useState<RecurringIntervalUnit>('MONTH');
  const [ckValue, setCkValue] = useState('24');
  const [ckAta, setCkAta] = useState('');
  // work-card pull
  const [pullOpen, setPullOpen] = useState(false);
  const [pullWo, setPullWo] = useState('');
  const [woOptions, setWoOptions] = useState<{ woNumber: string; title: string; ata: string; scheduled: boolean; riiRequired: boolean }[]>([]);

  const ac = state.aircraft.find(a => a.tailNumber === tail);

  // FIX 2: `now` and step computation must precede the early return so hooks are unconditional
  const now = new Date().toISOString();
  const step = ac ? lifecycleStep(ac.id, state, now).step : undefined;

  // FIX 2: both hooks must be unconditional — placed above the `if (!ac)` guard
  const [activeStep, setActiveStep] = useState<StepKey>('PREFLIGHT');
  useEffect(() => { if (step) setActiveStep(prev => (prev === 'PREFLIGHT' ? step : prev)); }, [step]);

  // Deep-link: ?tab=deferrals&deferral=ID&gating=1 auto-opens the inline gating panel.
  useEffect(() => {
    const dfr = params.get('deferral');
    if (params.get('gating') === '1' && dfr) setInline({ kind: 'gating', id: dfr });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pullOpen || !ac) return;
    setWoOptions(integration.listWorkOrders(ac.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pullOpen]);

  if (!ac) {
    return (
      <TechLogShell title="Aircraft not found">
        <Button variant="outline" onClick={() => navigate('/tech-log')}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to fleet</Button>
      </TechLogShell>
    );
  }

  const sv = deriveServiceability(ac.id, state, now);
  const airframe = { hours: ac.airframeTotalHours, cycles: ac.airframeTotalCycles };
  const nameOf = (oid: string) => state.personnel.find(p => p.oid === oid)?.displayName ?? oid;
  const melOf = (id: string) => state.melItems.find(m => m.id === id);
  const sigById = (id?: string) => (id ? state.signatures.find(s => s.id === id) : undefined);

  const custody = deriveCustody(ac.id, state, now);
  const shownStep: StepKey = activeStep;

  // P3-1: out-of-service → run cards → return-to-service spine (derived; reuses serviceability + work cards, no new state machine).
  const spineOpenDefects = currentRows(state.defects).filter(d => d.aircraftId === ac.id && d.status === 'OPEN');
  const spineOpenCards = state.workCards.filter(w => w.aircraftId === ac.id && w.status !== 'COMPLETED');
  const spineStage: 'OUT_OF_SERVICE' | 'RESTRICTED' | 'IN_SERVICE' = sv.status === 'RED' ? 'OUT_OF_SERVICE' : sv.status === 'AMBER' ? 'RESTRICTED' : 'IN_SERVICE';
  const spineDriverDefect = sv.drivingDefectId ? currentRows(state.defects).find(d => d.id === sv.drivingDefectId) : undefined;

  const acceptedBriefing = currentRows(state.briefings).filter(b => b.aircraftId === ac.id && b.status === 'ACKNOWLEDGED').sort((a, b) => (b.acknowledgedAtUtc ?? '').localeCompare(a.acknowledgedAtUtc ?? ''))[0];

  const allDefects = currentRows(state.defects).filter(d => d.aircraftId === ac.id).sort((a, b) => b.reportedAtUtc.localeCompare(a.reportedAtUtc));
  const openDefects = allDefects.filter(d => d.status === 'OPEN' || d.status === 'DEFERRED');
  const deferrals = currentRows(state.deferrals).filter(d => d.aircraftId === ac.id && d.status !== 'CLEARED');
  const releases = currentRows(state.releases).filter(r => r.aircraftId === ac.id).sort((a, b) => b.completionDateUtc.localeCompare(a.completionDateUtc));
  const workCards = state.workCards.filter(w => w.aircraftId === ac.id).sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));
  const flights = currentRows(state.flightLogs).filter(f => f.aircraftId === ac.id).sort((a, b) => b.flightDateUtc.localeCompare(a.flightDateUtc));

  const checkProjections = state.recurringChecks
    .filter(c => c.aircraftId === ac.id)
    .map(c => projectCheck(c, state.recurringAccomplishments, now, airframe))
    .sort((a, b) => (a.state === 'EXPIRED' || a.state === 'NEVER_DONE' ? -1 : 1) - (b.state === 'EXPIRED' || b.state === 'NEVER_DONE' ? -1 : 1));

  // per-aircraft audit slice (FIX 3: include record-note ids so NOTE_PROMOTED events appear in the feed)
  const acEntityIds = new Set<string>([
    ...allDefects.map(d => d.id), ...deferrals.map(d => d.id), ...releases.map(r => r.id),
    ...workCards.map(w => w.id), ...flights.map(f => f.id), ac.id,
    ...state.recurringChecks.filter(c => c.aircraftId === ac.id).map(c => c.id),
    ...currentRows(state.recordNotes).filter(n => n.aircraftId === ac.id).map(n => n.id),
    ...state.briefings.filter(b => b.aircraftId === ac.id).map(b => b.id),
    ...state.postflights.filter(p => p.aircraftId === ac.id).map(p => p.id),
  ]);
  const auditRows = state.audit.filter(a => acEntityIds.has(a.entityId) || a.summary.includes(ac.tailNumber)).slice(0, 25);

  // ── recurring-check handlers (unchanged engine path) ──
  const accCheck = accCheckId ? state.recurringChecks.find(c => c.id === accCheckId) : undefined;
  const beginAccomplish = (checkId: string) => { setAccCheckId(checkId); setPendingAccId(newId('rca')); setAccSignOpen(true); };
  const onAccomplished = (sig: Signature) => {
    if (!accCheck) return;
    const nowIso = new Date().toISOString();
    const accomplishment: RecurringCheckAccomplishment = {
      id: pendingAccId, checkId: accCheck.id, aircraftId: ac.id, accomplishedAtUtc: nowIso,
      accomplishedByOid: user.oid, airframeHours: ac.airframeTotalHours, airframeCycles: ac.airframeTotalCycles, signatureId: sig.id,
    };
    dispatch({ type: 'ADD_SIGNATURE', payload: sig });
    dispatch({ type: 'ADD_RECURRING_ACCOMPLISHMENT', payload: accomplishment });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'RECURRING_CHECK_ACCOMPLISHED', entityType: 'RecurringCheck', entityId: accCheck.id, atUtc: nowIso, summary: `${ac.tailNumber} ${accCheck.name} accomplished` } });
    toast.success(`${accCheck.name} accomplished on ${ac.tailNumber}.`);
    setAccCheckId(null);
  };
  const addCheck = () => {
    if (!ckName.trim() || !Number(ckValue)) return toast.error('Name and interval are required.');
    const check: RecurringCheck = {
      id: newId('rc'), aircraftId: ac.id, name: ckName.trim(), intervalUnit: ckUnit, intervalValue: Number(ckValue),
      ataChapter: ckAta.trim() || undefined, active: true, createdAtUtc: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_RECURRING_CHECK', payload: check });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'RECURRING_CHECK_ADDED', entityType: 'RecurringCheck', entityId: check.id, atUtc: check.createdAtUtc, summary: `${ac.tailNumber} recurring check added: ${check.name} (due until first accomplished)` } });
    setAddCheckOpen(false); setCkName(''); setCkValue('24'); setCkAta('');
    toast.warning(`${check.name} added — due immediately until accomplished and signed.`);
  };

  const extend = (d: Deferral) => {
    if (d.category === 'A' || d.category === 'D') return toast.error(`Cat ${d.category} deferrals cannot be extended.`);
    if (d.extensionUsed) return toast.error('This deferral has already used its one extension.');
    const value = (CATEGORY_DAYS[d.category] ?? 0) * 2;
    const due = computeRepairDue(d.category, d.clockStartDateUtc, { repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: value }, airframe);
    const ext: Deferral = { ...d, id: newId('df'), supersedesId: d.id, extensionUsed: true, extensionTsUtc: new Date().toISOString(), extensionJustification: 'One-time extension (demo)', repairIntervalValue: value, repairDueDateUtc: due.repairDueDateUtc };
    dispatch({ type: 'SUPERSEDE_DEFERRAL', payload: ext });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'DEFERRAL_EXTENDED', entityType: 'Deferral', entityId: ext.id, atUtc: ext.extensionTsUtc!, summary: `Extended ${ac.tailNumber} Cat ${d.category} deferral once` } });
    toast.success(`Cat ${d.category} deferral extended once.`);
  };

  const startTriage = (defectId: string, kind: 'defer' | 'rectify') => {
    if (kind === 'defer' && ac.isProvisional) return toast.error('Deferrals are blocked on a provisional aircraft.');
    setTab('defects');
    setInline({ kind, id: defectId });
  };

  const pull = () => {
    if (!pullWo) return toast.error('Select a work order.');
    const wo = integration.pullWorkOrder(ac.id, pullWo);
    if (!wo) return toast.error('CAMP returned no detail for that work order.');
    const id = newId('wc');
    const nowIso = new Date().toISOString();
    const card: WorkCard = {
      id, cardNumber: `WC-${id.slice(-4).toUpperCase()}`, woNumber: wo.woNumber, aircraftId: ac.id,
      title: wo.title, ataChapter: wo.ata,
      description: wo.lines.filter(l => l.lineType === 'S').map(l => l.description).join('; ') || wo.title,
      source: 'CAMP', headerStatusCode: wo.headerStatusCode, scheduled: wo.scheduled, riiRequired: wo.riiRequired,
      createdAtUtc: nowIso, status: 'OPEN',
      steps: wo.lines.filter(l => l.lineType === 'T').map((l, i) => ({ id: newId('st'), seq: i + 1, text: l.description, done: false, riiRequired: wo.riiRequired && /independent inspection|\bRII\b/i.test(l.description) })),
    };
    dispatch({ type: 'ADD_WORK_CARD', payload: card });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'WORKCARD_PULLED', entityType: 'WorkCard', entityId: id, atUtc: nowIso, summary: `Pulled ${wo.woNumber} from CAMP → ${card.cardNumber} (${ac.tailNumber})` } });
    setPullOpen(false); setPullWo('');
    navigate(`/tech-log/work-cards/${id}`);
  };

  const printRelease = (r: MaintenanceRelease) => {
    const perf = sigById(r.signatureId);
    const rii = sigById(r.riiSignatureId);
    printSignedRecord({
      docTitle: r.signoffType === 'DEFERRAL' ? '(M) / Placard Discharge Release' : 'Certificate of Release to Service',
      recordType: r.isGatingDischarge ? 'Gating discharge' : r.signoffType, reference: r.id,
      aircraft: `${ac.tailNumber} · ${ac.type} · S/N ${ac.serialNumber}`,
      pdfBlobUri: r.pdfBlobUri ?? mockPdfBlobUri('crs', r.id),
      sections: [
        { heading: 'Work performed (14 CFR 91.417(a)(1)(i))', body: r.workDescription },
        { heading: 'Return to service', fields: [
          { label: 'Completed', value: new Date(r.completionDateUtc).toLocaleString() },
          { label: 'A&P / IA cert', value: r.apCertificateNumber || '—' },
          { label: 'RII required', value: r.riiRequired ? 'Yes' : 'No' },
        ], body: r.returnToServiceStatement },
      ],
      signatures: [perf, rii].filter(Boolean).map(s => ({ role: s!.signerRole, name: s!.signerName, cert: s!.certNumber, hash: s!.mockContentHash, signedAtUtc: s!.signedAtUtc, amr: s!.amr.join('+') })),
    });
  };

  const tabCount: Partial<Record<WorkspaceTab, number>> = {
    defects: openDefects.length, deferrals: deferrals.length, workcards: workCards.filter(w => w.status !== 'COMPLETED').length,
  };

  return (
    <TechLogShell
      title={`${ac.tailNumber} — ${ac.type}`}
      subtitle={`S/N ${ac.serialNumber} · ${ac.airframeTotalHours.toFixed(1)} hrs · ${ac.airframeTotalCycles} cyc · ${ac.homeBase}`}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => navigate('/tech-log')}><ArrowLeft className="mr-1.5 h-4 w-4" /> Fleet</Button>
          <Button size="sm" onClick={() => setReportOpen(true)}><FilePlus className="mr-1.5 h-4 w-4" /> Report defect</Button>
        </>
      }
    >
      {/* Status / why — always visible above the workspace tabs so the chip is in view as it changes */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              {ac.isProvisional ? <Badge variant="outline">Provisional</Badge> : <ServiceabilityChip status={sv.status} />}
              <CustodyChip state={custody.state} />
              <span className="text-sm text-muted-foreground">{RULE_TEXT[sv.governingRule]}</span>
            </div>
            {acceptedBriefing?.acknowledgedByOid && (
              <span className="text-xs text-[var(--gfo-success,#00B140)]">PIC accepted by {nameOf(acceptedBriefing.acknowledgedByOid)} · {acceptedBriefing.acknowledgedAtUtc ? new Date(acceptedBriefing.acknowledgedAtUtc).toLocaleString() : ''}</span>
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

      {/* Lifecycle stepper drives the workspace; reference data lives behind Records */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex-1">
          {tab === 'workspace' && <LifecycleStepper aircraft={ac} onSelect={(k) => { setActiveStep(k); setTab('workspace'); }} />}
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          <button onClick={() => setTab('workspace')} className={cn('rounded-md px-3 py-1.5 text-sm', tab === 'workspace' ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Workspace</button>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={cn('rounded-md px-3 py-1.5 text-sm', tab === t.key ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {t.label}{tabCount[t.key] ? <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{tabCount[t.key]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* ===== WORKSPACE (stepper-driven active panel + unified feed) ===== */}
      {tab === 'workspace' && (
        <div className="space-y-4">
          {/* ===== Maintenance spine: out-of-service → run cards → return-to-service (P3-1) ===== */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4" /> Return-to-service spine</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <div className={cn('flex-1 rounded-md border p-2 text-sm', spineStage === 'OUT_OF_SERVICE' ? 'border-[var(--gfo-error,#EF3340)] bg-[var(--gfo-error,#EF3340)]/5' : 'opacity-60')}>
                  <div className="font-medium">1 · Out of service</div>
                  <div className="text-xs text-muted-foreground">{sv.status === 'RED' ? (spineDriverDefect ? `ATA ${spineDriverDefect.ataChapter} — ${spineDriverDefect.description}` : 'grounded — see open items') : 'cleared'}</div>
                </div>
                <div className="hidden items-center text-muted-foreground sm:flex">→</div>
                <div className={cn('flex-1 rounded-md border p-2 text-sm', (spineOpenDefects.length || spineOpenCards.length) ? 'border-[var(--gfo-warning,#F1B434)] bg-[var(--gfo-warning,#F1B434)]/5' : 'opacity-60')}>
                  <div className="font-medium">2 · Work it</div>
                  <div className="text-xs text-muted-foreground">{spineOpenCards.length} work card(s) · {spineOpenDefects.length} open defect(s)</div>
                </div>
                <div className="hidden items-center text-muted-foreground sm:flex">→</div>
                <div className={cn('flex-1 rounded-md border p-2 text-sm', sv.status === 'GREEN' ? 'border-[var(--gfo-success,#00B140)] bg-[var(--gfo-success,#00B140)]/5' : 'opacity-60')}>
                  <div className="font-medium">3 · Returned to service</div>
                  <div className="text-xs text-muted-foreground">{sv.status === 'GREEN' ? 'dispatchable (GREEN)' : 'sign the release(s) to clear'}</div>
                </div>
              </div>
              {(spineOpenDefects.length > 0 || spineOpenCards.length > 0) ? (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Stands between {ac.tailNumber} and return-to-service:</div>
                  {spineOpenDefects.map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                      <span className="text-muted-foreground">Open defect · ATA {d.ataChapter} — {d.description}</span>
                      {isMaint && <Button size="sm" variant="outline" onClick={() => rectifyToWorkCard(d)}>Rectify</Button>}
                    </div>
                  ))}
                  {spineOpenCards.map(w => (
                    <div key={w.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                      <span className="text-muted-foreground">Work card {w.cardNumber ?? w.woNumber ?? w.id} — {w.title}</span>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/tech-log/work-cards/${w.id}`)}>Open card</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn('flex items-center gap-1.5 text-sm', sv.status === 'GREEN' ? 'text-[var(--gfo-success,#00B140)]' : sv.status === 'AMBER' ? 'text-[var(--gfo-warning,#F1B434)]' : 'text-[var(--gfo-error,#EF3340)]')}>
                  <CheckCircle2 className="h-4 w-4" />
                  {sv.status === 'GREEN' ? `No open maintenance — ${ac.tailNumber} is dispatchable.`
                    : sv.status === 'AMBER' ? 'Dispatchable under restriction — active deferral(s) in force.'
                    : 'Grounded — see Deferrals / Recurring checks for the driving condition.'}
                </div>
              )}
            </CardContent>
          </Card>

          {(shownStep === 'PREFLIGHT' || shownStep === 'RELEASED' || shownStep === 'ACCEPTED') && <BriefingPanel aircraft={ac} />}
          {shownStep === 'IN_SERVICE' && (
            <Card><CardContent className="p-4 text-sm text-muted-foreground">Aircraft in service with the crew. Squawks raised in flight appear in the feed below; run the Postflight step on return.</CardContent></Card>
          )}
          {shownStep === 'POSTFLIGHT' && <PostflightPanel aircraft={ac} />}

          {/* FIX 1: Recurring-checks card — dispatch-gating; an expired check grounds the aircraft RED (rule 3) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" /> Recurring checks ({checkProjections.length})</CardTitle>
              {isMaint && <Button size="sm" variant="outline" onClick={() => setAddCheckOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add check</Button>}
            </CardHeader>
            <CardContent className="space-y-2">
              {checkProjections.length === 0 && <p className="text-sm text-muted-foreground">No recurring checks defined for this aircraft.</p>}
              {checkProjections.map(p => {
                const grounding = p.state === 'EXPIRED' || p.state === 'NEVER_DONE';
                const due = p.dueUtc ? new Date(p.dueUtc).toLocaleDateString() : p.dueUsage != null ? `${p.dueUsage} ${p.check.intervalUnit === 'FLIGHT_HOUR' ? 'h' : 'cyc'}` : '—';
                const remain = p.remainingDays != null ? (p.remainingDays >= 0 ? `${p.remainingDays}d left` : `${-p.remainingDays}d overdue`) : p.remainingUsage != null ? (p.remainingUsage >= 0 ? `${p.remainingUsage} to go` : `${-p.remainingUsage} over`) : '';
                return (
                  <div key={p.check.id} className={`rounded-md border p-3 ${grounding ? 'border-[var(--gfo-error,#EF3340)]/40' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.check.name}</span>
                        {p.check.ataChapter && <Badge variant="outline">ATA {p.check.ataChapter}</Badge>}
                        <Badge variant={CHECK_BADGE[p.state]}>{p.state === 'NEVER_DONE' ? 'NEVER DONE' : p.state.replace('_', ' ')}</Badge>
                        <span className="text-xs text-muted-foreground">every {p.check.intervalValue} {p.check.intervalUnit.replace('_', ' ').toLowerCase()}</span>
                      </div>
                      {isMaint && <Button size="sm" variant={grounding ? 'default' : 'outline'} onClick={() => beginAccomplish(p.check.id)}>Accomplish &amp; sign</Button>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {p.latest ? `Last done ${new Date(p.latest.accomplishedAtUtc).toLocaleDateString()} · due ${due}${remain ? ` · ${remain}` : ''}` : 'Never accomplished — due now (grounds the aircraft until signed).'}
                    </div>
                    {grounding && <div className="mt-2 rounded bg-[var(--gfo-error,#EF3340)]/10 px-2 py-1 text-xs text-[var(--gfo-error,#EF3340)]">Expired — aircraft is RED (rule 3) until this check is re-accomplished and signed.</div>}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <ActivityFeed aircraft={ac} auditIds={acEntityIds} />
        </div>
      )}

      {/* ===== DEFECTS (with inline triage) ===== */}
      {tab === 'defects' && (
        <div className="space-y-3">
          {inline && inline.kind === 'defer' && (() => { const d = allDefects.find(x => x.id === inline.id); return d ? (
            <div className="rounded-lg border-2 border-primary/40 p-3">
              <div className="mb-2 text-sm font-medium">Defer ATA {d.ataChapter} — {d.description}</div>
              <DeferralCreatePanel defect={d} onCancel={() => setInline(null)}
                onDone={(deferral) => { if (deferral.status === 'PENDING_PLACARD') { toast.warning('Pending (M)/placard — sign the gating release to dispatch.'); setInline({ kind: 'gating', id: deferral.id }); } else { toast.success(`${ac.tailNumber} dispatchable under MEL (AMBER).`); setInline(null); } }} />
            </div>
          ) : null; })()}

          {inline && inline.kind === 'rectify' && (() => { const d = allDefects.find(x => x.id === inline.id); return d ? (
            <div className="max-w-2xl rounded-lg border-2 border-primary/40 p-3">
              <RectifyPanel defect={d} onCancel={() => setInline(null)} onDone={() => setInline(null)} />
            </div>
          ) : null; })()}

          {inline && inline.kind === 'gating' && (() => { const df = deferrals.find(x => x.id === inline.id); return df ? (
            <div className="max-w-2xl rounded-lg border-2 border-primary/40 p-3">
              <GatingReleasePanel deferral={df} onCancel={() => setInline(null)} onDone={() => setInline(null)} />
            </div>
          ) : null; })()}

          {allDefects.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No defects on this aircraft. Use “Report defect”.</CardContent></Card>}
          {allDefects.map(d => {
            const isOpen = d.status === 'OPEN' || d.status === 'DEFERRED';
            const loc = d.cabinSeat ? `Seat ${d.cabinSeat}` : d.zoneCode ? `Zone ${d.zoneCode}` : d.locationFreetext;
            return (
              <Card key={d.id} className={isOpen ? '' : 'opacity-70'}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">ATA {d.ataChapter}</Badge>
                      <Badge variant={d.status === 'OPEN' ? 'destructive' : d.status === 'DEFERRED' ? 'secondary' : 'outline'}>{d.status}</Badge>
                      <span className="text-xs text-muted-foreground">{d.severity} · {d.source}</span>
                    </div>
                    <p className="mt-1 text-sm">{d.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Reported {new Date(d.reportedAtUtc).toLocaleString()}{loc ? ` · ${loc}` : ''}</p>
                    {d.attachments?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.attachments.filter(a => a.uri.startsWith('data:')).map(a => (
                          <img key={a.id} src={a.uri} alt={a.filename} title={`${a.filename} · SHA-256 ${a.sha256.slice(0, 12)}…`} className="h-12 w-12 rounded border object-cover" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {(isMaint || user.crewDeferralAuthorized) && isOpen && d.status === 'OPEN' && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => startTriage(d.id, 'defer')}><Wrench className="mr-1.5 h-4 w-4" /> Defer (MEL)</Button>
                      {isMaint && <Button size="sm" onClick={() => rectifyToWorkCard(d)}><CheckCircle2 className="mr-1.5 h-4 w-4" /> Rectify</Button>}
                      {isMaint && <Button size="sm" variant="outline" onClick={() => startTriage(d.id, 'rectify')}>Quick CRS</Button>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== DEFERRALS ===== */}
      {tab === 'deferrals' && (
        <div className="space-y-3">
          {inline && inline.kind === 'gating' && (() => { const df = deferrals.find(x => x.id === inline.id); return df ? (
            <div className="max-w-2xl rounded-lg border-2 border-primary/40 p-3">
              <GatingReleasePanel deferral={df} onCancel={() => setInline(null)} onDone={() => setInline(null)} />
            </div>
          ) : null; })()}
          {deferrals.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No active deferrals. Defer an open defect from the Defects tab.</CardContent></Card>}
          {deferrals.map(d => {
            const expired = isDeferralExpired(d, now, airframe);
            const effective = expired ? 'EXPIRED' : d.status;
            const mel = melOf(d.melItemId);
            const ms = d.repairDueDateUtc ? new Date(d.repairDueDateUtc).getTime() - Date.now() : null;
            return (
              <Card key={d.id}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">MEL {mel?.subItemNumber ?? '—'}</Badge>
                      <Badge variant="outline">Cat {d.category}</Badge>
                      <Badge variant={effective === 'ACTIVE' ? 'secondary' : 'destructive'}>{effective}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{mel?.title}</p>
                    {d.repairDueDateUtc && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> due {new Date(d.repairDueDateUtc).toLocaleDateString()} · {ms != null && ms > 0 ? `${Math.floor(ms / 86400000)}d left` : 'overdue'}{d.extensionUsed && ' · extended'}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {effective === 'PENDING_PLACARD' && canSignPlacardDischarge(user, d) && (
                      <Button size="sm" onClick={() => setInline({ kind: 'gating', id: d.id })}><Wrench className="mr-1.5 h-4 w-4" /> {user.role === 'MAINTENANCE' ? 'Sign (M)/placard release' : 'Attest placard'}</Button>
                    )}
                    {effective === 'ACTIVE' && isMaint && (
                      <Button size="sm" variant="outline" onClick={() => extend(d)}><TimerReset className="mr-1.5 h-4 w-4" /> Extend</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== RELEASES ===== */}
      {tab === 'releases' && (
        <div className="space-y-3">
          {releases.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No releases yet for this aircraft.</CardContent></Card>}
          {releases.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{r.signoffType}</Badge>
                  {r.isGatingDischarge && <Badge variant="secondary">gating discharge</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(r.completionDateUtc).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{r.workDescription}</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">A&P {r.apCertificateNumber || '—'}</p>
                  <Button size="sm" variant="ghost" onClick={() => printRelease(r)}><Printer className="mr-1.5 h-4 w-4" /> View / Print</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ===== WORK CARDS ===== */}
      {tab === 'workcards' && (
        <div className="space-y-3">
          {isMaint && <Button size="sm" onClick={() => setPullOpen(true)}><CloudDownload className="mr-1.5 h-4 w-4" /> Pull from CAMP</Button>}
          {workCards.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No work cards for this aircraft.</CardContent></Card>}
          {workCards.map(w => {
            const done = w.steps.filter(s => s.done).length;
            return (
              <Card key={w.id} className="cursor-pointer transition-colors hover:bg-accent/40" onClick={() => navigate(`/tech-log/work-cards/${w.id}`)}>
                <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{w.cardNumber}</span>
                      <Badge variant="outline">ATA {w.ataChapter}</Badge>
                      <Badge variant={w.status === 'COMPLETED' ? 'outline' : w.status === 'IN_WORK' ? 'secondary' : 'destructive'}>{w.status}</Badge>
                    </div>
                    <p className="mt-1">{w.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{w.woNumber ? `CAMP ${w.woNumber} · ` : ''}WO: {WO_HEADER_STATUS[w.headerStatusCode] ?? w.headerStatusCode} · steps {done}/{w.steps.length}</p>
                  </div>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== FLIGHTS ===== */}
      {tab === 'flights' && (
        <div className="space-y-3">
          {flights.length === 0 && <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No journey log entries for this aircraft.</CardContent></Card>}
          {flights.map(f => {
            const trip = state.trips.find(t => t.flightLogIds.includes(f.id));
            return (
              <Card key={f.id}>
                <CardContent className="grid grid-cols-2 gap-2 p-4 text-sm md:grid-cols-5">
                  <div><div className="text-xs text-muted-foreground">Sector</div><div className="font-medium">#{f.sectorSequence}</div></div>
                  <div><div className="text-xs text-muted-foreground">Date</div><div>{f.flightDateUtc.slice(0, 10)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Block / Flight</div><div>{f.blockTime}h / {f.flightTime}h</div></div>
                  <div><div className="text-xs text-muted-foreground">Crew</div><div className="truncate">{nameOf(f.picOid)} / {nameOf(f.sicOid)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Trip</div><div>{trip ? trip.tripNumber : '—'}</div></div>
                </CardContent>
              </Card>
            );
          })}
          <Button size="sm" variant="ghost" onClick={() => navigate('/tech-log/journey')}><PlaneTakeoff className="mr-1.5 h-4 w-4" /> Open Journey Log</Button>
        </div>
      )}

      {/* ===== AUDIT ===== */}
      {tab === 'audit' && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Activity for {ac.tailNumber}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {auditRows.length === 0 && <p className="text-muted-foreground">No activity yet.</p>}
            {auditRows.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                <div><Badge variant="outline" className="mr-2">{a.action}</Badge><span className="text-muted-foreground">{a.summary}</span></div>
                <span className="shrink-0 text-xs text-muted-foreground">{nameOf(a.actorOid)} · {new Date(a.atUtc).toLocaleString()}</span>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => navigate('/tech-log/audit')}>Full fleet ledger →</Button>
          </CardContent>
        </Card>
      )}

      {/* dialogs */}
      <ReportDefectDialog open={reportOpen} onOpenChange={setReportOpen} lockTail={ac.isProvisional ? undefined : ac.tailNumber} onReported={() => setTab('defects')} />

      <Dialog open={addCheckOpen} onOpenChange={setAddCheckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Add recurring check</DialogTitle>
            <DialogDescription>A dispatch-gating check. It is due immediately (RED) until first accomplished and signed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div><Label>Name</Label><Input className="mt-1" value={ckName} onChange={e => setCkName(e.target.value)} placeholder="e.g. Pitot-static leak check" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Interval</Label><Input type="number" className="mt-1" value={ckValue} onChange={e => setCkValue(e.target.value)} /></div>
              <div>
                <Label>Unit</Label>
                <Select value={ckUnit} onValueChange={(v: string) => setCkUnit(v as RecurringIntervalUnit)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTH">Months</SelectItem>
                    <SelectItem value="CALENDAR_DAY">Days</SelectItem>
                    <SelectItem value="FLIGHT_HOUR">Flight hours</SelectItem>
                    <SelectItem value="CYCLE">Cycles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>ATA (opt)</Label><Input className="mt-1" value={ckAta} onChange={e => setCkAta(e.target.value)} placeholder="34" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCheckOpen(false)}>Cancel</Button>
            <Button onClick={addCheck}>Add check</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {accCheck && (
        <SignCeremonyDialog open={accSignOpen} onOpenChange={setAccSignOpen} signer={user} signedEntity="RECURRING_CHECK" signedEntityId={pendingAccId}
          intentStatement={INTENT.RECURRING_CHECK}
          payloadSummary={`${accCheck.name} on ${ac.tailNumber} — airframe ${ac.airframeTotalHours}h / ${ac.airframeTotalCycles} cyc.`}
          onSigned={onAccomplished} title="Sign recurring-check accomplishment" />
      )}

      <Dialog open={pullOpen} onOpenChange={setPullOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CloudDownload className="h-4 w-4" /> Pull work order — {ac.tailNumber}</DialogTitle>
            <DialogDescription>Mock GetWODetails (sandbox). The task lines become an executable work card.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Label>Open work order</Label>
            <Select value={pullWo} onValueChange={(v: string) => setPullWo(v)}>
              <SelectTrigger><SelectValue placeholder="Select a CAMP work order" /></SelectTrigger>
              <SelectContent>
                {woOptions.map(w => <SelectItem key={w.woNumber} value={w.woNumber}>{w.woNumber} · {w.title}{w.riiRequired ? ' (RII)' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullOpen(false)}>Cancel</Button>
            <Button onClick={pull}>Pull &amp; open</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
