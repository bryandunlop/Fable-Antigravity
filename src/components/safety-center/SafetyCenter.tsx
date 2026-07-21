import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Plus, Check, ChevronRight, ChevronLeft, FileText, PenLine, ClipboardList, BookOpen, ClipboardCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { useNotificationFeed } from '../../notifications/useNotificationFeed';
import { eventStore } from '../../notifications/events';
import { useHazards, WORKFLOW_STAGES } from '../../contexts/HazardContext';
import { useAudits } from '../../contexts/AuditContext';
import { useSafetyModel } from './useSafetyModel';
import { ToneStyles } from './ui-bits';
import { TrackBoard } from './TrackBoard';
import { ItemDetailSheet } from './ItemDetailSheet';
import { NotificationsPanel } from './NotificationsPanel';
import { ReportDialog, type Kind } from './ReportDialog';
import { SubmissionsArchive } from './SubmissionsArchive';
import { PublishedArea } from './PublishedArea';
import { FormManager } from './FormManager';
import { OperationsAudits, MyAudits, auditsForMe } from './AuditsArea';
import { ReviewsArea } from './ReviewsArea';
import { RequiredReadsList } from '../documents/components/RequiredReadsList';
import { useDocuments, identityFor } from '../documents/DocumentsContext';
import { unacknowledgedRequiredReads } from '../documents/engine/acknowledgments';
import { createAsap } from './asapReports';
import { createCws } from './cwsRecognitions';
import MyFRATSubmissions from '../MyFRATSubmissions';
import type { KnowItem, SafetyItem, SafetyView } from './types';

const CURRENT_USER = { id: 'u-demo', name: 'Capt. Dunlop' };

interface Props { userRole: string; additionalRoles?: string[] }

// IA (D38, four plain doors): crew gets one page — a Report button and four
// doors named after the job (My reports · Read and sign · My assessments ·
// Library). No attention-state language, no tabs behind toggles. The manager
// keeps a tabbed console under plain names. The move/waiting/done buckets
// survive only as internal derivation for counts and ordering.
type Door = 'reports' | 'reads' | 'assessments' | 'library' | 'audits';

const DOORS: { key: Door; label: string; icon: typeof FileText }[] = [
  { key: 'reports', label: 'My reports', icon: FileText },
  { key: 'reads', label: 'Read and sign', icon: PenLine },
  { key: 'assessments', label: 'My assessments', icon: ClipboardList },
  { key: 'library', label: 'Library', icon: BookOpen },
];

export default function SafetyCenter({ userRole, additionalRoles = [] }: Props) {
  const roles = [userRole, ...additionalRoles];
  const hasManagerAccess = roles.some((r) => r === 'safety' || r === 'admin');

  const [view, setView] = useState<SafetyView>(hasManagerAccess ? 'ops' : 'my');
  const [tab, setTab] = useState<string>('inbox');
  const [searchParams, setSearchParams] = useSearchParams();
  const door = (searchParams.get('door') as Door | null);
  const [selected, setSelected] = useState<SafetyItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [knowOpen, setKnowOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKind, setReportKind] = useState<Kind | null>(null);
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());

  const model = useSafetyModel();
  const feed = useNotificationFeed(userRole, additionalRoles);
  const { submitHazard, updateHazard } = useHazards();
  const { audits } = useAudits();
  // Read-and-sign is served by the one Documents compliance engine (TL-6 / D29),
  // not a Safety-Center-local store. Required reads are role-targeted; the demo's
  // crew user resolves to a representative id per role.
  const { state: docsState } = useDocuments();
  const { userId: docsUserId } = identityFor(userRole);
  const navigate = useNavigate();

  const pendingInitials = unacknowledgedRequiredReads(
    docsState.docs,
    docsState.revisions,
    docsState.acknowledgments,
    userRole,
    docsUserId,
  ).length;
  const myAudits = auditsForMe(audits);
  const hasAudits = myAudits.length > 0;
  const auditsDue = myAudits.filter((a) => a.status !== 'Complete').length;
  const openReports = model.my.waiting.length + model.my.move.length;
  const needsYou = model.my.move.length + pendingInitials + auditsDue;

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

  function switchView(v: SafetyView) { setView(v); setTab('inbox'); setSearchParams({}, { replace: true }); }
  function openDoor(d: Door | null) {
    if (d) setSearchParams({ door: d });
    else setSearchParams({});
  }
  function open(item: SafetyItem) { setSelected(item); setDetailOpen(true); }
  function toggleDone(id: string) {
    setDoneSet((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function openReport(kind: Kind | null = null) { setReportKind(kind); setReportOpen(true); }

  function handleFiled(kind: Kind, values: Record<string, string>) {
    if (kind === 'hazard') {
      // Persist a real hazard — it lands in the reporter's My reports and the
      // manager's New reports queue; submitHazard itself notifies safety staff.
      const desc = (values.what || '').trim();
      const severity = values.risk === 'high' ? 'High' : values.risk === 'low' ? 'Low' : 'Medium';
      submitHazard({
        title: desc ? desc.slice(0, 60) : 'Reported hazard',
        description: desc || '(no description provided)',
        location: (values.where || '').trim() || 'Unspecified',
        category: 'Other',
        severity,
        reportedBy: 'Capt. Dunlop',
        immediateActions: '',
        potentialConsequences: '',
        isAnonymous: false,
      });
      return;
    }
    if (kind === 'asap') {
      // Persist a confidential ASAP report — it lands in the ASAP reviewer queue.
      createAsap({
        phase: values.phase || 'Approach',
        airport: (values.airport || '').trim() || '—',
        description: (values.what || '').trim() || '(no description provided)',
        contributing: (values.contributing || '').trim(),
        severity: 'Medium',
      });
      eventStore.publish({
        id: `asap-file-${Date.now()}`,
        severity: 'info', title: 'New ASAP report filed', detail: 'Confidential — awaiting review',
        module: 'Safety', link: '/safety', audienceRoles: ['safety', 'admin'],
      });
      return;
    }
    if (kind === 'cws') {
      // Persist a recognition — it appears on the Recognitions wall.
      createCws({ recognized: (values.who || '').trim(), forWhat: (values.forWhat || '').trim(), submittedBy: CURRENT_USER.name });
      eventStore.publish({
        id: `cws-file-${Date.now()}`, severity: 'info',
        title: `Recognition logged: ${(values.who || 'a colleague').trim()}`, detail: 'Caught Working Safely',
        module: 'Safety', link: '/safety', audienceRoles: ['safety', 'admin', 'lead'],
      });
      return;
    }
    // Waiver doesn't have a store wired yet (later phase) — notify for now.
    eventStore.publish({
      id: `safety-file-${kind}-${Date.now()}`,
      severity: 'info', title: 'New waiver request', detail: 'Awaiting review',
      module: 'Safety', link: '/safety', audienceRoles: ['safety', 'admin'],
    });
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

  const stalled = model.ops.track.filter((i) => i.stalled).length;

  const opsTabs: [string, string][] = [
    ['inbox', 'New reports'], ['track', 'Open cases'], ['reviews', 'Reviews'], ['audits', 'Audits'], ['manage', 'Admin'],
  ];

  function countFor(key: string): number | null {
    if (key === 'inbox') return model.ops.move.length;
    if (key === 'track') return model.ops.track.length;
    return null;
  }

  const doorSub: Record<Door, string> = {
    reports: openReports > 0 ? `${openReports} open · with the safety team` : 'Nothing open right now',
    reads: pendingInitials > 0 ? `${pendingInitials} waiting for your initials` : 'All current',
    assessments: 'FRAT and GRAT history',
    library: 'Lessons, newsletters, recognitions',
    audits: 'Audits assigned to you',
  };
  const doorTitle: Record<Door, string> = {
    reports: 'My reports', reads: 'Read and sign', assessments: 'My assessments', library: 'Library', audits: 'My audits',
  };

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-6" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <ToneStyles />

      {/* header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight m-0">Safety</h1>
          <div className="text-[13.5px] text-muted-foreground mt-0.5">
            {view === 'my' ? 'See something? One button reports it. Everything else is behind a door named for the job.' : 'Act on what needs you; shepherd every open case.'}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <button onClick={() => setKnowOpen(true)} aria-label="Notifications"
            className="relative w-11 h-11 rounded-[11px] border border-muted-foreground/30 bg-card grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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

      {/* ── Crew: one page, four doors ── */}
      {view === 'my' && !door && (
        <div className="mt-6">
          {needsYou === 0
            ? <div className="text-[14px] text-muted-foreground mb-4 px-0.5">Nothing needs you right now.</div>
            : <div className="text-[14px] text-foreground mb-4 px-0.5 font-medium">{needsYou} {needsYou === 1 ? 'thing needs' : 'things need'} you — the doors below show where.</div>}

          {/* Audits keep a persistent entry point whenever the user has any —
              due ones get the amber banner, otherwise a quiet row — so audit
              history stays reachable when nothing is due. */}
          {hasAudits && (
            <button onClick={() => openDoor('audits')}
              className={`w-full text-left flex items-center gap-3 bg-card border rounded-[12px] px-4 py-3.5 min-h-[56px] mb-4 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${auditsDue > 0 ? 'border-[color:var(--gfo-warning)]/50 hover:border-[color:var(--gfo-warning)]' : 'border-border hover:border-muted-foreground/40'}`}>
              <ClipboardCheck className={`w-5 h-5 shrink-0 ${auditsDue > 0 ? 'text-[color:var(--gfo-warning)]' : 'text-muted-foreground'}`} />
              <div className="flex-1 text-[14.5px] text-foreground">
                {auditsDue > 0
                  ? <>Audits assigned to you — <span className="font-semibold">{auditsDue} due</span></>
                  : <>My audits — <span className="text-muted-foreground">all complete</span></>}
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DOORS.map(({ key, label, icon: Icon }) => {
              const attention = (key === 'reads' && pendingInitials > 0);
              return (
                <button key={key} onClick={() => openDoor(key)}
                  className="text-left bg-card border border-border rounded-[12px] px-5 py-5 min-h-[104px] cursor-pointer hover:border-muted-foreground/40 hover:shadow-sm transition-all active:scale-[.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1">
                  <div className="flex items-start justify-between">
                    <Icon className="w-[22px] h-[22px] text-muted-foreground" />
                    <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <div className="text-[16px] font-semibold text-foreground mt-2.5">{label}</div>
                  <div className={`text-[13px] mt-0.5 ${attention ? 'text-[color:var(--gfo-error)] font-medium' : 'text-muted-foreground'}`}>{doorSub[key]}</div>
                </button>
              );
            })}
          </div>
        </div>
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
              <SubmissionsArchive items={model.submissions.filter((s) => s.submittedBy === CURRENT_USER.name || s.submittedBy === 'You')} onOpen={open} />
            </>
          )}
          {door === 'reads' && <div className="mt-3"><RequiredReadsList userRole={userRole} /></div>}
          {door === 'assessments' && <div className="-mx-6 mt-2"><MyFRATSubmissions userRole={userRole} /></div>}
          {door === 'library' && <PublishedArea view="my" reports={model.published} />}
          {door === 'audits' && <div className="mt-3"><MyAudits /></div>}
        </div>
      )}

      {/* ── Manager console ── */}
      {view === 'ops' && (
        <>
          <div className="flex gap-3 flex-wrap my-5">
            {[
              { n: model.ops.move.length, l: 'New reports', tone: 'amber' },
              { n: stalled, l: 'Stalled >30d', tone: 'red' },
              { n: model.ops.track.length, l: 'Open cases', tone: 'neutral' },
              { n: model.ops.done.length, l: 'Closed', tone: 'green' },
            ].map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-[12px] px-4 py-3.5 min-w-[130px] flex-1">
                <div className={`text-[26px] font-semibold tracking-tight leading-none tabular-nums ${STAT_TONE[s.tone]}`}>{s.n}</div>
                <div className="text-[12.5px] text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
            {opsTabs.map(([key, label]) => {
              const count = countFor(key);
              const on = tab === key;
              const showStall = key === 'track' && stalled > 0;
              return (
                <button key={key} onClick={() => setTab(key)}
                  className={`relative text-[15px] font-semibold py-3 mr-6 min-h-[48px] flex items-center gap-2 whitespace-nowrap ${on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
                  {label}
                  {count != null && count > 0 && <span className={`text-[12px] font-semibold rounded-full px-2 py-0.5 tabular-nums ${showStall ? 'sc-red' : key === 'inbox' ? 'bg-[color:var(--gfo-error)] text-white' : 'bg-muted text-muted-foreground'}`}>{count}</span>}
                  {on && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-accent rounded" />}
                </button>
              );
            })}
          </div>

          <div className="mt-2">
            {tab === 'inbox' && <MoveList items={model.ops.move} heading="Decisions waiting on you" doneSet={doneSet} onToggle={toggleDone} onOpen={open} />}
            {tab === 'track' && <TrackBoard items={model.ops.track} onOpen={open} />}
            {tab === 'reviews' && <ReviewsArea />}
            {tab === 'audits' && <OperationsAudits />}
            {tab === 'manage' && <ManageArea submissions={model.submissions} published={model.published} onOpen={open} />}
          </div>
        </>
      )}

      <ItemDetailSheet item={selected} open={detailOpen} onOpenChange={setDetailOpen} onAdvance={advanceHazard} onOpenWorkflow={openWorkflow} />
      <NotificationsPanel items={knowItems} open={knowOpen} onOpenChange={setKnowOpen} />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} initialKind={reportKind} onFiled={handleFiled} />
    </div>
  );
}

const STAT_TONE: Record<string, string> = {
  red: 'text-[color:var(--gfo-error)]', amber: 'text-[color:var(--gfo-warning)]',
  green: 'text-[color:var(--gfo-success)]', neutral: 'text-foreground',
};

// ── manager: Admin (the occasional stuff, out of the daily path) ────────────
function ManageArea({ submissions, published, onOpen }: { submissions: SafetyItem[]; published: import('./types').PublishedReport[]; onOpen: (i: SafetyItem) => void }) {
  const [sub, setSub] = useState<'records' | 'comms' | 'forms'>('records');
  return (
    <div className="mt-4">
      <SubChips
        value={sub}
        onChange={(v) => setSub(v as typeof sub)}
        options={[['records', 'All records'], ['comms', 'Communications'], ['forms', 'Form setup']]}
      />
      {sub === 'records' && <SubmissionsArchive items={submissions} onOpen={onOpen} />}
      {sub === 'comms' && <PublishedArea view="ops" reports={published} />}
      {sub === 'forms' && <FormManager />}
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

function SectionHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[12px] uppercase tracking-wider text-muted-foreground font-semibold mt-5 mb-2.5 px-0.5 ${className}`}>{children}</div>;
}

function MoveList({ items, heading, doneSet, onToggle, onOpen }: {
  items: SafetyItem[]; heading?: string | null; doneSet: Set<string>; onToggle: (id: string) => void; onOpen: (i: SafetyItem) => void;
}) {
  if (!items.length) {
    return <Empty big="You're all caught up." small="No new reports need you right now." />;
  }
  return (
    <>
      {heading !== null && <SectionHeading>{heading ?? 'Decisions waiting on you'}</SectionHeading>}
      <div className="flex flex-col gap-2">
        {items.map((i) => {
          const done = doneSet.has(i.id);
          return (
            // A clickable row that also contains a checkbox button, so it stays a
            // div with an explicit button role + keyboard handler (a <button> can't
            // nest the checkbox <button>).
            <div key={i.id} role="button" tabIndex={0} onClick={() => onOpen(i)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(i); } }}
              className={`flex items-center gap-3 bg-card border border-border rounded-[12px] pl-2 pr-4 py-2.5 min-h-[60px] cursor-pointer transition-all hover:border-muted-foreground/40 hover:shadow-sm active:scale-[.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${done ? 'opacity-50' : ''}`}>
              {/* 44px hit area around a 24px checkbox */}
              <button onClick={(e) => { e.stopPropagation(); onToggle(i.id); }} aria-label={done ? 'Mark not done' : 'Mark done'}
                className="w-11 h-11 grid place-items-center shrink-0 rounded-[10px] hover:bg-muted/60 transition-colors">
                <span className={`w-6 h-6 rounded-[7px] border-2 grid place-items-center transition-colors ${done ? 'bg-[color:var(--gfo-success)] border-[color:var(--gfo-success)] text-white' : 'border-muted-foreground/40 text-transparent'}`}>
                  <Check className="w-3.5 h-3.5" />
                </span>
              </button>
              <div className={`flex-1 min-w-0 ${done ? 'line-through text-muted-foreground' : ''}`}>
                <div className="text-[15px] text-foreground">{i.title}</div>
                {i.sub && <div className="text-[12.5px] text-muted-foreground mt-0.5">{i.sub}</div>}
              </div>
              {i.due && <span className={`text-[13px] font-semibold whitespace-nowrap ${i.due.tone === 'red' ? 'text-[color:var(--gfo-error)]' : i.due.tone === 'amber' ? 'text-[color:var(--gfo-warning)]' : 'text-muted-foreground'}`}>{i.due.label}</span>}
              <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
            </div>
          );
        })}
      </div>
    </>
  );
}

function Empty({ big, small }: { big: string; small: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-[16px] text-foreground/70 font-medium mb-1">{big}</div>
      <div className="text-[14px] text-muted-foreground max-w-md mx-auto">{small}</div>
    </div>
  );
}
