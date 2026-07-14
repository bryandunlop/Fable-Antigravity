import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Check, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useNotificationFeed } from '../../notifications/useNotificationFeed';
import { eventStore } from '../../notifications/events';
import { useHazards, WORKFLOW_STAGES } from '../../contexts/HazardContext';
import { useAudits } from '../../contexts/AuditContext';
import { useSafetyModel } from './useSafetyModel';
import { ToneStyles, TypeLabel, toneClass } from './ui-bits';
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

// IA note (iPad / low-tech-comfort pass): crew gets 3 tabs + one Report button —
// Home is a single scrolling page (needs you → waiting → done) so nothing hides
// behind tab-hunting. The manager gets 5 tabs, daily work first, setup last.
export default function SafetyCenter({ userRole, additionalRoles = [] }: Props) {
  const roles = [userRole, ...additionalRoles];
  const hasManagerAccess = roles.some((r) => r === 'safety' || r === 'admin');

  const [persona, setPersona] = useState<'crew' | 'manager'>(hasManagerAccess ? 'manager' : 'crew');
  const [view, setView] = useState<SafetyView>(hasManagerAccess ? 'ops' : 'my');
  const [tab, setTab] = useState<string>(hasManagerAccess ? 'inbox' : 'home');
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
  const auditsDue = auditsForMe(audits).filter((a) => a.status !== 'Complete').length;
  const needsYou = model.my.move.length + pendingInitials + auditsDue;

  // The Know panel reads the REAL app notification feed (Safety module) merged
  // with the model's illustrative items — so a filed report shows up here and in
  // the app-wide bell.
  const knowItems: KnowItem[] = useMemo(() => {
    const real: KnowItem[] = feed.entries
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
    return [...real, ...model.know];
  }, [feed.entries, model.know]);

  function choosePersona(p: 'crew' | 'manager') {
    setPersona(p);
    setView(p === 'manager' ? 'ops' : 'my');
    setTab(p === 'manager' ? 'inbox' : 'home');
  }
  function switchView(v: SafetyView) { setView(v); setTab(v === 'ops' ? 'inbox' : 'home'); }
  function open(item: SafetyItem) { setSelected(item); setDetailOpen(true); }
  function toggleDone(id: string) {
    setDoneSet((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function openReport(kind: Kind | null = null) { setReportKind(kind); setReportOpen(true); }

  function handleFiled(kind: Kind, values: Record<string, string>) {
    if (kind === 'hazard') {
      // Persist a real hazard — it lands in Track / Submissions and submitHazard
      // itself notifies safety staff.
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
    navigate(view === 'ops' ? `/safety/hazard-workflow/${item.sourceId}` : `/safety/hazards/${item.sourceId}`);
  }

  const stalled = model.ops.track.filter((i) => i.stalled).length;

  const tabs: [string, string][] = view === 'my'
    ? [['home', 'Home'], ['records', 'My records'], ['library', 'Library']]
    : [['inbox', 'Inbox'], ['track', 'Track'], ['reviews', 'Reviews'], ['audits', 'Audits'], ['manage', 'Manage']];

  function countFor(key: string): number | null {
    if (key === 'home') return needsYou;
    if (key === 'inbox') return model.ops.move.length;
    if (key === 'track') return model.ops.track.length;
    return null;
  }

  const summary = view === 'my'
    ? [
        { n: needsYou, l: 'Need you today', tone: needsYou > 0 ? ('red' as const) : ('green' as const) },
        { n: model.my.waiting.length, l: 'Waiting on others', tone: 'neutral' as const },
        { n: model.my.done.length, l: 'Done this week', tone: 'green' as const },
        { n: pendingInitials === 0 ? '100%' : `${pendingInitials} due`, l: 'Sign-offs current', tone: pendingInitials === 0 ? ('green' as const) : ('red' as const) },
      ]
    : [
        { n: model.ops.move.length, l: 'In your inbox', tone: 'amber' as const },
        { n: stalled, l: 'Stalled >30d', tone: 'red' as const },
        { n: model.ops.track.length, l: 'Open in Track', tone: 'neutral' as const },
        { n: 12, l: 'Closed this week', tone: 'green' as const },
      ];

  const statTone: Record<string, string> = {
    red: 'text-[color:var(--gfo-error)]', amber: 'text-[color:var(--gfo-warning)]',
    green: 'text-[color:var(--gfo-success)]', neutral: 'text-foreground',
  };

  return (
    <div className="max-w-[1080px] mx-auto px-6 py-6" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <ToneStyles />

      {/* header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight m-0">{view === 'my' ? 'My Safety' : 'Safety Operations'}</h1>
          <div className="text-[13.5px] text-muted-foreground mt-0.5">
            {view === 'my' ? 'One button to report anything. Everything that needs you is right here.' : 'Act on what needs you; shepherd everything in motion.'}
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          {/* demo persona toggle */}
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Preview as</span>
            <div className="flex bg-muted rounded-[9px] p-[3px] gap-[3px]">
              {(['crew', 'manager'] as const).map((p) => (
                <button key={p} onClick={() => choosePersona(p)}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-[7px] transition-colors ${persona === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  {p === 'crew' ? 'Crew' : 'Safety mgr'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setKnowOpen(true)} aria-label="Notifications"
            className="relative w-11 h-11 rounded-[11px] border border-muted-foreground/30 bg-card grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Bell className="w-[21px] h-[21px]" />
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] rounded-full bg-[color:var(--gfo-error)] text-white text-[10px] font-bold grid place-items-center px-1">{knowItems.length}</span>
          </button>
          <Button onClick={() => openReport()} className="gap-2 h-11 px-5 text-[14.5px]"><Plus className="w-[18px] h-[18px]" /> Report</Button>
        </div>
      </div>

      {/* view switch (My Safety / Operations) */}
      {(persona === 'manager' || hasManagerAccess) && (
        <div className="flex gap-2 mt-4">
          {(['my', 'ops'] as SafetyView[]).map((v) => (
            <button key={v} onClick={() => switchView(v)}
              className={`text-[14px] font-semibold px-4 py-2 min-h-[40px] rounded-full border transition-colors ${view === v ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border'}`}>
              {v === 'my' ? 'My Safety' : 'Operations'}
            </button>
          ))}
        </div>
      )}

      {/* summary */}
      <div className="flex gap-3 flex-wrap my-5">
        {summary.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-[12px] px-4 py-3.5 min-w-[130px] flex-1">
            <div className={`text-[26px] font-semibold tracking-tight leading-none tabular-nums ${statTone[s.tone]}`}>{s.n}</div>
            <div className="text-[12.5px] text-muted-foreground mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {/* spine */}
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
        {tabs.map(([key, label]) => {
          const count = countFor(key);
          const on = tab === key;
          const attn = key === 'home' || key === 'inbox';
          const showStall = key === 'track' && stalled > 0;
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`relative text-[15px] font-semibold py-3 mr-6 min-h-[48px] flex items-center gap-2 whitespace-nowrap ${on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
              {label}
              {count != null && count > 0 && <span className={`text-[12px] font-semibold rounded-full px-2 py-0.5 tabular-nums ${showStall ? 'sc-red' : attn ? 'bg-[color:var(--gfo-error)] text-white' : 'bg-muted text-muted-foreground'}`}>{count}</span>}
              {on && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-accent rounded" />}
            </button>
          );
        })}
      </div>

      {/* content */}
      <div className="mt-2">
        {/* ── Crew ── */}
        {tab === 'home' && (
          <>
            {needsYou === 0
              ? <Empty big="You're all caught up." small="Nothing needs you right now. Anything you file shows up under Waiting until the safety team resolves it." />
              : (
                <>
                  <SectionHeading>Needs you today</SectionHeading>
                  {pendingInitials > 0 && <RequiredReadsList userRole={userRole} />}
                  <div className="mt-2"><MyAudits dueOnly /></div>
                  <div className="mt-2"><MoveList items={model.my.move} view="my" heading={null} doneSet={doneSet} onToggle={toggleDone} onOpen={open} /></div>
                </>
              )}
            <SectionHeading className="mt-8">Waiting on others — no action needed</SectionHeading>
            <WaitingList items={model.my.waiting} heading={null} onOpen={open} />
            <SectionHeading className="mt-8">Done this week</SectionHeading>
            <DoneList items={model.my.done} view="my" heading={null} onOpen={open} />
          </>
        )}
        {tab === 'records' && <MyRecords userRole={userRole} submissions={model.submissions} onOpen={open} />}
        {tab === 'library' && <PublishedArea view="my" reports={model.published} />}

        {/* ── Manager ── */}
        {tab === 'inbox' && <MoveList items={model.ops.move} view="ops" heading="Decisions waiting on you" doneSet={doneSet} onToggle={toggleDone} onOpen={open} />}
        {tab === 'track' && <TrackBoard items={model.ops.track} onOpen={open} />}
        {tab === 'reviews' && <ReviewsArea />}
        {tab === 'audits' && <OperationsAudits />}
        {tab === 'manage' && <ManageArea submissions={model.submissions} published={model.published} onOpen={open} />}
      </div>

      <ItemDetailSheet item={selected} open={detailOpen} onOpenChange={setDetailOpen} onAdvance={advanceHazard} onOpenWorkflow={openWorkflow} />
      <NotificationsPanel items={knowItems} open={knowOpen} onOpenChange={setKnowOpen} />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} initialKind={reportKind} onFiled={handleFiled} />
    </div>
  );
}

// ── crew: My records (everything you've filed or been assigned) ─────────────
function MyRecords({ userRole, submissions, onOpen }: { userRole: string; submissions: SafetyItem[]; onOpen: (i: SafetyItem) => void }) {
  const [sub, setSub] = useState<'reports' | 'assessments' | 'audits'>('reports');
  const mine = submissions.filter((s) => s.submittedBy === CURRENT_USER.name || s.submittedBy === 'You');
  return (
    <div className="mt-4">
      <SubChips
        value={sub}
        onChange={(v) => setSub(v as typeof sub)}
        options={[['reports', 'My reports'], ['assessments', 'My risk assessments'], ['audits', 'My audits']]}
      />
      {sub === 'reports' && (
        <>
          <p className="text-[13.5px] text-muted-foreground mt-3 px-0.5">Everything you've filed — tap one to see its status and the safety team's replies.</p>
          <SubmissionsArchive items={mine} onOpen={onOpen} />
        </>
      )}
      {sub === 'assessments' && <div className="-mx-6"><MyFRATSubmissions userRole={userRole} /></div>}
      {sub === 'audits' && <MyAudits />}
    </div>
  );
}

// ── manager: Manage (the occasional stuff, out of the daily path) ───────────
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

function MoveList({ items, view, heading, doneSet, onToggle, onOpen }: {
  items: SafetyItem[]; view: SafetyView; heading?: string | null; doneSet: Set<string>; onToggle: (id: string) => void; onOpen: (i: SafetyItem) => void;
}) {
  if (!items.length) {
    if (heading === null) return null; // Home renders its own empty state
    return <Empty big="You're all caught up." small="No actions need you right now." />;
  }
  return (
    <>
      {heading !== null && <SectionHeading>{heading ?? (view === 'my' ? "Clear these and you're done for the day" : 'Decisions waiting on you')}</SectionHeading>}
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

function WaitingList({ items, heading, onOpen }: { items: SafetyItem[]; heading?: string | null; onOpen: (i: SafetyItem) => void }) {
  if (!items.length) {
    if (heading === null) return <div className="text-[13.5px] text-muted-foreground px-0.5 py-3">Nothing in flight — items you file appear here while the safety team works them.</div>;
    return <Empty big="Nothing in flight." small="Items you've handed off will appear here." />;
  }
  return (
    <>
      {heading !== null && <SectionHeading>{heading ?? 'With other people — not your move'}</SectionHeading>}
      <div className="flex flex-col gap-2">
        {items.map((i) => (
          <button key={i.id} onClick={() => onOpen(i)}
            className="w-full text-left flex items-center gap-3 bg-card border border-border rounded-[12px] px-4 py-3.5 min-h-[56px] cursor-pointer hover:border-muted-foreground/40 transition-colors active:scale-[.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1">
            <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-semibold text-white bg-muted-foreground shrink-0">{i.who || '··'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] text-muted-foreground">{i.title}</div>
              {i.sub && <div className="text-[12.5px] text-muted-foreground/70 mt-0.5">{i.sub}</div>}
            </div>
            <span className="text-[13px] font-semibold text-accent whitespace-nowrap">{i.nudge || 'View'}</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
          </button>
        ))}
      </div>
    </>
  );
}

function DoneList({ items, view, heading, onOpen }: { items: SafetyItem[]; view: SafetyView; heading?: string | null; onOpen: (i: SafetyItem) => void }) {
  if (!items.length) {
    if (heading === null) return <div className="text-[13.5px] text-muted-foreground px-0.5 py-3">Nothing completed yet this week.</div>;
    return <Empty big="Nothing yet." small="Completed items land here." />;
  }
  return (
    <>
      {heading !== null && <SectionHeading>{heading ?? (view === 'my' ? 'What you cleared' : 'Recently closed')}</SectionHeading>}
      <div className="flex flex-col gap-2">
        {items.map((i) => (
          view === 'my'
            ? (
              <div key={i.id} className="flex items-center gap-3 bg-card border border-border rounded-[12px] px-4 py-3.5 min-h-[52px] opacity-70">
                <div className="w-6 h-6 rounded-[7px] grid place-items-center shrink-0 sc-green"><Check className="w-3.5 h-3.5" /></div>
                <div className="flex-1 min-w-0 text-[14px] text-muted-foreground">{i.title}</div>
                <span className="text-[12px] text-muted-foreground whitespace-nowrap">{i.when}</span>
              </div>
            )
            : (
              <button key={i.id} onClick={() => onOpen(i)}
                className="w-full text-left grid grid-cols-[76px_1fr_auto] gap-3.5 items-center bg-card border border-border rounded-[12px] px-4 py-3.5 min-h-[56px] cursor-pointer hover:border-muted-foreground/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1">
                <TypeLabel>{i.type}</TypeLabel>
                <div className="min-w-0">
                  <div className="text-[14.5px] text-foreground truncate">{i.title}</div>
                  <div className="text-[12.5px] text-muted-foreground mt-0.5">{i.when}</div>
                </div>
                {i.status && <span className={`text-[12px] font-medium rounded-full px-3 py-1.5 ${toneClass(i.status.tone)}`}>{i.status.label}</span>}
              </button>
            )
        ))}
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
