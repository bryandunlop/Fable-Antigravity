import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Plus, Check, ChevronRight, ChevronLeft, LayoutGrid, List } from 'lucide-react';
import { Button } from '../ui/button';
import { useNotificationFeed } from '../../notifications/useNotificationFeed';
import { eventStore } from '../../notifications/events';
import { useHazards, WORKFLOW_STAGES } from '../../contexts/HazardContext';
import { useAudits } from '../../contexts/AuditContext';
import { useSafetyModel } from './useSafetyModel';
import { ToneStyles } from './ui-bits';
import { ItemDetailSheet } from './ItemDetailSheet';
import { NotificationsPanel } from './NotificationsPanel';
import { ReportDialog, type Kind } from './ReportDialog';
import { SubmissionsArchive } from './SubmissionsArchive';
import { PublishedArea } from './PublishedArea';
import { FormManager } from './FormManager';
import { OperationsAudits, MyAudits, auditsForMe } from './AuditsArea';
import { DecideArea } from './DecideArea';
import { AsapReview } from './AsapReview';
import { RequiredReadsList } from '../documents/components/RequiredReadsList';
import { useDocuments, identityFor } from '../documents/DocumentsContext';
import { unacknowledgedRequiredReads } from '../documents/engine/acknowledgments';
import { createAsap } from './asapReports';
import { createCws } from './cwsRecognitions';
import { getFormTemplates, templateForKind, describeWithExtras, MULTI_SEP } from './formTemplates';
import { createApprovalRequest, roleLabel } from './approvalRequests';
import MyFRATSubmissions from '../MyFRATSubmissions';
import { CrewHome, type Door } from './CrewHome';
import { VerbRail } from './VerbRail';
import { VERBS, parseVerb, verbDef, verbCounts, atPhase, type VerbId, type Shape } from './verbs';
import { CaseBoard } from './CaseBoard';
import { CaseQueue } from './CaseQueue';
import { canToggle, loadOverrides, resolveShape, saveOverrides, withOverride, type ShapeOverrides } from './shapes';
import { useApprovalRequests, pendingForRoles, advancedByRoles } from './approvalRequests';
import { resolveUserId } from '../../notifications/identity';
import { buildCrewWorklist, type CrewTask } from './crewWorklist';
import type { KnowItem, SafetyItem, SafetyView } from './types';

const CURRENT_USER = { id: 'u-demo', name: 'Capt. Dunlop' };

interface Props { userRole: string; additionalRoles?: string[] }

// IA (D85, superseding D38's door grid): crew get ONE page — a Report button, a
// worklist of what actually needs them, and a quiet index of the five areas
// underneath. The doors survive as that index and keep their `?door=` param, so
// deep links and notification targets are unchanged; what changed is that the
// menu no longer stands between the crew and the answer. The manager console is
// re-navigated separately (C3). The move/waiting/done buckets survive only as
// internal derivation for counts and ordering.

export default function SafetyCenter({ userRole, additionalRoles = [] }: Props) {
  const roles = useMemo(() => [userRole, ...additionalRoles], [userRole, additionalRoles]);
  const hasManagerAccess = roles.some((r) => r === 'safety' || r === 'admin');

  const [view, setView] = useState<SafetyView>(hasManagerAccess ? 'ops' : 'my');
  const [searchParams, setSearchParams] = useSearchParams();
  const door = (searchParams.get('door') as Door | null);
  const [selected, setSelected] = useState<SafetyItem | null>(null);
  const [asapId, setAsapId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [knowOpen, setKnowOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKind, setReportKind] = useState<Kind | null>(null);
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());

  const model = useSafetyModel();
  const feed = useNotificationFeed(userRole, additionalRoles);
  const { hazards, submitHazard, updateHazard } = useHazards();
  const { audits } = useAudits();
  const { requests: approvalRequests } = useApprovalRequests();
  // Read-and-sign is served by the one Documents compliance engine (TL-6 / D29),
  // not a Safety-Center-local store. Required reads are role-targeted; the demo's
  // crew user resolves to a representative id per role.
  const { state: docsState } = useDocuments();
  const { userId: docsUserId } = identityFor(userRole);
  const navigate = useNavigate();

  // Read-and-sign is role-targeted and recomputed from the Documents engine, so
  // it is memoized here rather than re-derived per consumer — the crew worklist
  // and the index row both read this one list.
  const requiredReads = useMemo(
    () => unacknowledgedRequiredReads(
      docsState.docs, docsState.revisions, docsState.acknowledgments, userRole, docsUserId,
    ),
    [docsState.docs, docsState.revisions, docsState.acknowledgments, userRole, docsUserId],
  );

  const pendingInitials = requiredReads.length;
  const myAudits = useMemo(() => auditsForMe(audits), [audits]);
  const hasAudits = myAudits.length > 0;
  const auditsDue = myAudits.filter((a) => a.status !== 'Complete').length;
  const openReports = model.my.waiting.length + model.my.move.length;

  // The crew worklist (D85). `nowMs` is passed in rather than read inside the
  // builder so the derivation stays pure and fixture-testable.
  const crewTasks = useMemo(
    () => buildCrewWorklist({
      reads: requiredReads,
      hazards: hazards || [],
      // MY audits, not every audit — `auditsForMe` is the same filter the index
      // row counts with. Passing the raw list put unassigned pool audits on a
      // crew member's worklist and made the two numbers disagree on screen.
      audits: myAudits,
      reporterName: CURRENT_USER.name,
      nowMs: Date.now(),
    }),
    [requiredReads, hazards, myAudits],
  );

  /** A worklist row opens the door that can act on it. Reply rows additionally
   *  carry the hazard id so the archive can scroll to it. */
  function openCrewTask(t: CrewTask) {
    if (t.kind === 'reply') setSearchParams({ door: 'reports', item: t.sourceId });
    else openDoor(t.door);
  }

  // The bell reads the real app notification feed (Safety module) — a filed
  // report shows up here and in the app-wide bell.
  const knowItems: KnowItem[] = useMemo(() => {
    return feed.entries
      .filter((e) => e.module.toLowerCase().includes('safety'))
      .map((e) => ({
        id: e.id,
        icon: e.severity === 'critical' ? 'triangle-alert' : e.severity === 'warn' ? 'file-text' : 'clock',
        tone: (e.severity === 'critical' ? 'haz' : e.severity === 'warn' ? 'doc' : 'info') as KnowItem['tone'],
        text: e.title,
        at: e.atUtc ? new Date(e.atUtc).toLocaleDateString() : 'just now',
        promo: 'fyi' as const,
        promoLabel: e.detail || 'Safety',
      }));
  }, [feed.entries]);

  function switchView(v: SafetyView) { setView(v); setSearchParams({}, { replace: true }); }
  function openDoor(d: Door | null) {
    if (d) setSearchParams({ door: d });
    else setSearchParams({});
  }
  // ASAP has its own detail surface, and must keep it: the sheet carries the
  // confidentiality banner and the de-identification step, and the generic
  // detail sheet has neither. Routing an ASAP card into the generic sheet would
  // quietly drop both.
  function open(item: SafetyItem) {
    if (item.type === 'ASAP' && item.sourceId) { setAsapId(item.sourceId); return; }
    setSelected(item);
    setDetailOpen(true);
  }
  function toggleDone(id: string) {
    setDoneSet((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function openReport(kind: Kind | null = null) { setReportKind(kind); setReportOpen(true); }

  const KIND_LABEL: Record<Kind, string> = { hazard: 'Hazard', asap: 'ASAP', cws: 'Recognition', waiver: 'Waiver' };
  function subjectTitleFor(kind: Kind, values: Record<string, string>): string {
    if (kind === 'waiver') return (values.request || '').trim().slice(0, 70) || 'Waiver request';
    if (kind === 'asap') return `ASAP — ${(values.airport || 'event').trim()}`;
    if (kind === 'cws') return `Recognition — ${(values.who || 'a colleague').trim()}`;
    return (values.title || 'Report').trim();
  }

  // If the template carries an approval chain (D39), create an ApprovalRequest
  // and ping the first approver's inbox. Hazard is excluded (own workflow).
  // Returns true when the form was routed for approval.
  function routeForApproval(kind: Kind, values: Record<string, string>, template: ReturnType<typeof templateForKind>, subjectTitle: string): boolean {
    const chain = template?.approvalChain ?? [];
    if (kind === 'hazard' || !chain.length) return false;
    const fieldLabels = Object.fromEntries((template!.fields).map((f) => [f.id, f.label]));
    createApprovalRequest({
      formKind: kind, formLabel: KIND_LABEL[kind], subjectTitle,
      values, fieldLabels,
      requestedByRole: userRole, requestedByName: CURRENT_USER.name,
      chainRoles: chain,
    });
    const first = chain[0];
    eventStore.publish({
      id: `approval-${kind}-${Date.now()}`,
      severity: 'info', title: `Approval needed: ${subjectTitle}`, detail: `Awaiting ${roleLabel(first)}`,
      module: 'Safety', link: '/approvals', audienceRoles: [first, 'admin'],
    });
    return true;
  }

  // Values arrive keyed by the template's field ids. Well-known ids map onto
  // real store columns (KNOWN_IDS); anything the safety manager added to the
  // template is appended to the description via describeWithExtras. A form whose
  // template has an approval chain is additionally routed for sign-off; waivers
  // have no store, so the approval request IS their record.
  function handleFiled(kind: Kind, values: Record<string, string>) {
    const template = templateForKind(getFormTemplates(), kind);
    const withExtras = (base: string) => (template ? describeWithExtras(template, values, kind, base) : base);

    if (kind === 'hazard') {
      // Persist a real hazard — it lands in the reporter's My reports and the
      // manager's New reports queue; submitHazard itself notifies safety staff.
      const desc = (values.description || '').trim();
      const anonymous = values.anonymous === 'true';
      submitHazard({
        title: (values.title || '').trim() || (desc ? desc.slice(0, 60) : 'Reported hazard'),
        description: withExtras(desc || '(no description provided)'),
        location: (values.location || '').trim() || 'Unspecified',
        category: (values.category || '').trim() || 'Other',
        severity: (values.severity || '').trim() || 'Medium',
        reportedBy: anonymous ? 'Anonymous' : 'Capt. Dunlop',
        immediateActions: (values.immediate || '').trim(),
        potentialConsequences: (values.consequences || '').trim(),
        suggestedCorrectiveAction: (values.corrective || '').trim() || undefined,
        riskFactors: values.riskFactors ? values.riskFactors.split(MULTI_SEP) : undefined,
        isAnonymous: anonymous,
      });
      return;
    }

    const subjectTitle = subjectTitleFor(kind, values);

    if (kind === 'asap') {
      // Persist a confidential ASAP report — it lands in the ASAP reviewer queue.
      createAsap({
        phase: values.phase || 'Approach',
        airport: (values.airport || '').trim() || '—',
        description: withExtras((values.description || '').trim() || '(no description provided)'),
        contributing: (values.contributingFactors || '').trim(),
        severity: (values.severity || '').trim() || 'Medium',
      });
      eventStore.publish({
        id: `asap-file-${Date.now()}`,
        severity: 'info', title: 'New ASAP report filed', detail: 'Confidential — awaiting review',
        module: 'Safety', link: '/safety', audienceRoles: ['safety', 'admin'],
      });
    } else if (kind === 'cws') {
      // Persist a recognition — it appears on the Recognitions wall.
      createCws({
        recognized: (values.who || '').trim(),
        forWhat: withExtras((values.description || '').trim()),
        submittedBy: CURRENT_USER.name,
      });
      eventStore.publish({
        id: `cws-file-${Date.now()}`, severity: 'info',
        title: `Recognition logged: ${(values.who || 'a colleague').trim()}`, detail: 'Caught Working Safely',
        module: 'Safety', link: '/safety', audienceRoles: ['safety', 'admin', 'lead'],
      });
    }

    const routed = routeForApproval(kind, values, template, subjectTitle);

    // Waiver with no chain configured has no store at all — fall back to a notice.
    if (!routed && kind === 'waiver') {
      eventStore.publish({
        id: `safety-file-${kind}-${Date.now()}`,
        severity: 'info', title: 'New waiver request', detail: 'Awaiting review',
        module: 'Safety', link: '/safety', audienceRoles: ['safety', 'admin'],
      });
    }
  }

  const STAGE_ORDER = Object.values(WORKFLOW_STAGES);
  function advanceHazard(item: SafetyItem) {
    if (!item.sourceId || !item.rawStage) return;
    const i = STAGE_ORDER.indexOf(item.rawStage);
    const next = i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : item.rawStage;
    updateHazard(item.sourceId, { workflowStage: next, daysInStage: 0 });
  }
  // Opens the full, proven hazard workflow (risk matrix, 5-Whys, assignment,
  // approval chain, final report) for the SM — or the reporter's detail view.
  function openWorkflow(item: SafetyItem) {
    if (item.type !== 'HAZARD' || !item.sourceId) return;
    setDetailOpen(false);
    navigate(hasManagerAccess && view === 'ops' ? `/safety/hazard-workflow/${item.sourceId}` : `/safety/hazards/${item.sourceId}`);
  }

  // Manager navigation is by VERB now (D85). The counts live in verbs.ts so the
  // rail's numbers are a pure function of the model rather than a switch here.
  const verb = parseVerb(searchParams.get('verb'));
  // D85 — the Decide count must match the Decide list, and both exclude a step
  // addressed to somebody else.
  const viewerUserId = resolveUserId(userRole);
  const counts = useMemo(
    () => verbCounts({
      move: model.ops.move,
      track: model.ops.track,
      pendingApprovals: pendingForRoles(approvalRequests, roles, viewerUserId).length,
      auditsOpen: audits.filter((a) => a.status !== 'Complete').length,
    }),
    [model.ops.move, model.ops.track, approvalRequests, roles, viewerUserId, audits],
  );

  // Shape overrides are a per-verb preference: turning Mitigate into a board
  // must not turn Triage into one. Read once on mount — a preference does not
  // need to react to another tab.
  const [shapeOverrides, setShapeOverrides] = useState<ShapeOverrides>(() => loadOverrides());
  const shape = resolveShape(verb, shapeOverrides);
  function chooseShape(next: Shape) {
    setShapeOverrides((prev) => {
      const updated = withOverride(prev, verb, next);
      saveOverrides(updated);
      return updated;
    });
  }

  function selectVerb(v: VerbId) {
    setSearchParams(v === VERBS[0].id ? {} : { verb: v });
  }

  const doorTitle: Record<Door, string> = {
    reports: 'My reports', reads: 'Read and sign', assessments: 'My assessments', library: 'Library', audits: 'My audits',
  };

  return (
    // The crew page is one reading column and stays at 1080. The console puts a
    // 188px rail inside the same container, so capping it at 1080 spent 40% of a
    // 1280 window on chrome (measured) and left 168px per board column — too
    // narrow for the cards C4 will put there.
    <div className={`${view === 'ops' ? 'max-w-[1560px]' : 'max-w-[1080px]'} mx-auto px-6 py-6`}>
      <ToneStyles />

      {/* header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight m-0">Safety</h1>
          <div className="text-[13.5px] text-muted-foreground mt-0.5">
            {view === 'my' ? 'See something? One button reports it.' : 'Act on what needs you; shepherd every open case.'}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <button onClick={() => setKnowOpen(true)} aria-label="Notifications"
            className="relative w-11 h-11 rounded-lg border border-muted-foreground/30 bg-card grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Bell className="w-[21px] h-[21px]" />
            {knowItems.length > 0 && <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] rounded-full bg-[color:var(--gfo-error)] text-white text-[10px] font-bold grid place-items-center px-1">{knowItems.length}</span>}
          </button>
          <Button onClick={() => openReport()} className="gap-2 h-11 px-5 text-[14.5px]"><Plus className="w-[18px] h-[18px]" /> Report</Button>
        </div>
      </div>

      {/* view switch — only users with safety-manager access ever see it */}
      {hasManagerAccess && (
        <div className="flex gap-2 mt-4">
          {(['my', 'ops'] as SafetyView[]).map((v) => (
            <button key={v} onClick={() => switchView(v)}
              className={`text-[14px] font-semibold px-4 py-2 min-h-[40px] rounded-full border transition-colors ${view === v ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border'}`}>
              {v === 'my' ? 'My safety' : 'Operations'}
            </button>
          ))}
        </div>
      )}

      {/* ── Crew: worklist over a quiet index (D85 · A1) ── */}
      {view === 'my' && !door && (
        <CrewHome
          tasks={crewTasks.tasks}
          more={crewTasks.more}
          openReports={openReports}
          pendingReads={pendingInitials}
          auditsDue={auditsDue}
          hasAudits={hasAudits}
          onOpenDoor={openDoor}
          onOpenTask={openCrewTask}
          onSearch={(q) => setSearchParams(q.trim() ? { door: 'reports', q: q.trim() } : { door: 'reports' })}
        />
      )}

      {/* ── Crew: inside a door ── */}
      {view === 'my' && door && (
        <div className="mt-5">
          <button onClick={() => openDoor(null)}
            className="flex items-center gap-1 text-[14px] font-semibold text-muted-foreground hover:text-foreground min-h-[44px] transition-colors">
            <ChevronLeft className="w-4.5 h-4.5" /> Safety
          </button>
          <h2 className="text-[19px] font-semibold tracking-tight mt-1 mb-1">{doorTitle[door]}</h2>

          {door === 'reports' && (
            <>
              <p className="text-[13.5px] text-muted-foreground mt-1 px-0.5">Everything you've filed — tap one to see its status and the safety team's replies.</p>
              <SubmissionsArchive items={model.submissions.filter((s) => s.submittedBy === CURRENT_USER.name || s.submittedBy === 'You')} onOpen={open} initialQuery={searchParams.get('q') ?? ''} />
            </>
          )}
          {door === 'reads' && <div className="mt-3"><RequiredReadsList userRole={userRole} /></div>}
          {door === 'assessments' && <div className="-mx-6 mt-2"><MyFRATSubmissions userRole={userRole} /></div>}
          {door === 'library' && <PublishedArea view="my" reports={model.published} />}
          {door === 'audits' && <div className="mt-3"><MyAudits /></div>}
        </div>
      )}

      {/* ── Manager console: a rail of verbs (D85 · Flip 3) ── */}
      {view === 'ops' && (
        <div className="flex gap-6 mt-5 items-start">
          <div className="w-[188px] shrink-0 sticky top-6 hidden md:block">
            <VerbRail active={verb} counts={counts} onSelect={selectVerb} />
          </div>

          {/* Below md the rail would eat the whole column, so it becomes a
              horizontal scroller of the same verbs. */}
          <div className="md:hidden -mx-6 px-6 overflow-x-auto mb-3">
            <div className="flex gap-2 w-max">
              {VERBS.map((v) => (
                <button key={v.id} onClick={() => selectVerb(v.id)}
                  className={`flex items-center gap-2 h-10 px-4 rounded-full border text-[14px] whitespace-nowrap transition-colors ${
                    v.id === verb ? 'bg-secondary text-secondary-foreground border-secondary font-semibold'
                                  : 'bg-card text-muted-foreground border-border'}`}>
                  {v.label}
                  {counts[v.id].n != null && counts[v.id].n! > 0 && (
                    <span className="text-[12px] font-semibold tabular-nums">{counts[v.id].n}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-4 flex-wrap">
              <div>
                <h2 className="text-[19px] font-semibold tracking-tight m-0">{verbDef(verb).label}</h2>
                <div className="text-[13.5px] text-muted-foreground mt-0.5">{verbDef(verb).blurb}</div>
              </div>
              <div className="flex-1" />
              {canToggle(verb) && <ShapeToggle verb={verb} shape={shape} onChoose={chooseShape} />}
            </div>

            {/* Each verb opens the shape its job deserves; the toggle is an
                override, and only appears where there is something to switch to. */}
            {verb === 'triage' && (shape === 'board'
              ? <CaseBoard items={model.ops.move} onOpen={open} />
              : <CaseQueue items={model.ops.move} doneSet={doneSet} onToggle={toggleDone} onOpen={open}
                  emptySmall="No new reports need you right now." />)}
            {verb === 'decide' && <DecideArea userRole={userRole} additionalRoles={additionalRoles} actorName={CURRENT_USER.name} />}
            {verb === 'investigate' && (shape === 'board'
              ? <CaseBoard items={atPhase(model.ops.track, 1)} onOpen={open} />
              : <CaseQueue items={atPhase(model.ops.track, 1)} doneSet={doneSet} onToggle={toggleDone} onOpen={open}
                  emptyBig="Nothing under investigation." emptySmall="No case is at that stage right now." />)}
            {verb === 'mitigate' && (shape === 'board'
              ? <CaseBoard items={atPhase(model.ops.track, 2)} onOpen={open} />
              : <CaseQueue items={atPhase(model.ops.track, 2)} doneSet={doneSet} onToggle={toggleDone} onOpen={open}
                  emptyBig="No mitigations in flight." emptySmall="Nothing is waiting on a corrective action." />)}
            {verb === 'assure' && <OperationsAudits />}
            {verb === 'publish' && <PublishedArea view="ops" reports={model.published} />}
            {verb === 'records' && <RecordsArea submissions={model.submissions} onOpen={open} />}
          </div>
        </div>
      )}

      <AsapReview selectedId={asapId} onSelectedIdChange={setAsapId} hideList />
      <ItemDetailSheet item={selected} open={detailOpen} onOpenChange={setDetailOpen} onAdvance={advanceHazard} onOpenWorkflow={openWorkflow} />
      <NotificationsPanel items={knowItems} open={knowOpen} onOpenChange={setKnowOpen} />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} initialKind={reportKind} onFiled={handleFiled} />
    </div>
  );
}

// Records: every record ever filed, plus the form setup behind them. The
// "Communications" panel that used to live here is its own verb now (Publish),
// which is the whole point of navigating by job — publishing a lesson is not the
// same errand as looking up an old submission.
function RecordsArea({ submissions, onOpen }: { submissions: SafetyItem[]; onOpen: (i: SafetyItem) => void }) {
  const [sub, setSub] = useState<'records' | 'forms'>('records');
  return (
    <div className="mt-4">
      <SubChips
        value={sub}
        onChange={(v) => setSub(v as typeof sub)}
        options={[['records', 'All records'], ['forms', 'Form setup']]}
      />
      {sub === 'records' && <SubmissionsArchive items={submissions} onOpen={onOpen} />}
      {sub === 'forms' && <FormManager />}
    </div>
  );
}

function ShapeToggle({ verb, shape, onChoose }: { verb: VerbId; shape: Shape; onChoose: (s: Shape) => void }) {
  const options = verbDef(verb).shapes;
  const ICON: Partial<Record<Shape, typeof List>> = { queue: List, board: LayoutGrid };
  const LABEL: Partial<Record<Shape, string>> = { queue: 'Queue', board: 'Board' };
  return (
    <div className="flex border border-border rounded-md overflow-hidden bg-card h-9" role="group" aria-label="View as">
      {options.map((o) => {
        const Icon = ICON[o] ?? List;
        const on = o === shape;
        return (
          <button key={o} onClick={() => onChoose(o)} aria-pressed={on}
            className={`flex items-center gap-1.5 px-3.5 text-[13px] transition-colors cursor-pointer ${
              on ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground font-medium'}`}>
            <Icon className="w-[15px] h-[15px]" />
            {LABEL[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

function SubChips({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)}
          className={`text-[14px] font-semibold px-4 py-2 min-h-[40px] rounded-full border transition-colors ${value === key ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}


