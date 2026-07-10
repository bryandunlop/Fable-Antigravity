import { useMemo, useState } from 'react';
import { Bell, Plus, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useNotificationFeed } from '../../notifications/useNotificationFeed';
import { eventStore } from '../../notifications/events';
import { useSafetyModel } from './useSafetyModel';
import { ToneStyles, TypeLabel, toneClass } from './ui-bits';
import { TrackBoard } from './TrackBoard';
import { ItemDetailSheet } from './ItemDetailSheet';
import { NotificationsPanel } from './NotificationsPanel';
import { ReportDialog, type Kind } from './ReportDialog';
import { FormsCatalog } from './FormsCatalog';
import { SubmissionsArchive } from './SubmissionsArchive';
import { PublishedReports } from './PublishedReports';
import { FormManager } from './FormManager';
import { OperationsAudits, MyAudits } from './AuditsArea';
import { FORM_CATALOG } from './forms';
import type { KnowItem, SafetyItem, SafetyView } from './types';

interface Props { userRole: string; additionalRoles?: string[] }

export default function SafetyCenter({ userRole, additionalRoles = [] }: Props) {
  const roles = [userRole, ...additionalRoles];
  const hasManagerAccess = roles.some((r) => r === 'safety' || r === 'admin');

  const [persona, setPersona] = useState<'crew' | 'manager'>(hasManagerAccess ? 'manager' : 'crew');
  const [view, setView] = useState<SafetyView>(hasManagerAccess ? 'ops' : 'my');
  const [tab, setTab] = useState<string>('move');
  const [selected, setSelected] = useState<SafetyItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [knowOpen, setKnowOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportKind, setReportKind] = useState<Kind | null>(null);
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set());

  const model = useSafetyModel();
  const feed = useNotificationFeed(userRole, additionalRoles);

  // The Know panel reads the REAL app notification feed (Safety module) merged
  // with the model's illustrative items — so a filed report shows up here and in
  // the app-wide bell.
  const knowItems: KnowItem[] = useMemo(() => {
    const real: KnowItem[] = feed.entries
      .filter((e) => e.module === 'Safety')
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
    setTab('move');
  }
  function switchView(v: SafetyView) { setView(v); setTab('move'); }
  function open(item: SafetyItem) { setSelected(item); setDetailOpen(true); }
  function toggleDone(id: string) {
    setDoneSet((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function openReport(kind: Kind | null = null) { setReportKind(kind); setReportOpen(true); }
  function handleFiled(kind: Kind) {
    const title: Record<Kind, string> = {
      hazard: 'New hazard report filed', asap: 'New ASAP report filed',
      cws: 'CWS recognition logged', waiver: 'New waiver request',
    };
    // Emits into the real notification system → appears in the app-wide bell for safety staff.
    eventStore.publish({
      id: `safety-file-${kind}-${Date.now()}`,
      severity: 'info', title: title[kind], detail: 'Awaiting triage',
      module: 'Safety', link: '/safety', audienceRoles: ['safety', 'admin'],
    });
  }

  const bucket = model[view] as Record<string, SafetyItem[]>;
  const tabs: [string, string][] = view === 'my'
    ? [['move', 'Your move'], ['waiting', 'Waiting'], ['done', 'Done'], ['audits', 'My audits'], ['forms', 'Forms'], ['published', 'Published']]
    : [['move', 'Your move'], ['track', 'Track'], ['audits', 'Audits'], ['submissions', 'Submissions'], ['formsMgr', 'Form manager'], ['published', 'Published']];

  function countFor(key: string): number | null {
    if (key === 'forms') return FORM_CATALOG.length;
    if (key === 'formsMgr' || key === 'audits') return null;
    if (key === 'submissions') return model.submissions.length;
    if (key === 'published') return model.published.length;
    return (bucket[key] || []).length;
  }

  const stalled = model.ops.track.filter((i) => i.stalled).length;
  const summary = view === 'my'
    ? [
        { n: model.my.move.length, l: 'Your move', tone: 'red' as const },
        { n: model.my.waiting.length, l: 'Waiting on others', tone: 'neutral' as const },
        { n: model.my.done.length, l: 'Done this week', tone: 'green' as const },
        { n: '100%', l: 'Docs current', tone: 'green' as const },
      ]
    : [
        { n: model.ops.move.length, l: 'Your move', tone: 'amber' as const },
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
          <div className="text-[13px] text-muted-foreground mt-0.5">
            {view === 'my' ? "What needs you, what you're waiting on, what you've done." : 'Act on what needs you; shepherd everything in motion.'}
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
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-[7px] transition-colors ${persona === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                  {p === 'crew' ? 'Crew' : 'Safety mgr'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setKnowOpen(true)} aria-label="Notifications"
            className="relative w-10 h-10 rounded-[10px] border border-muted-foreground/30 bg-card grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Bell className="w-[19px] h-[19px]" />
            <span className="absolute top-1.5 right-2 min-w-[15px] h-[15px] rounded-full bg-[color:var(--gfo-error)] text-white text-[9.5px] font-bold grid place-items-center px-[3px]">{knowItems.length}</span>
          </button>
          <Button onClick={() => openReport()} className="gap-2"><Plus className="w-4 h-4" /> Report</Button>
        </div>
      </div>

      {/* view switch (My Safety / Operations) */}
      {(persona === 'manager' || hasManagerAccess) && (
        <div className="flex gap-2 mt-4">
          {(['my', 'ops'] as SafetyView[]).map((v) => (
            <button key={v} onClick={() => switchView(v)}
              className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${view === v ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border'}`}>
              {v === 'my' ? 'My Safety' : 'Operations'}
            </button>
          ))}
        </div>
      )}

      {/* summary */}
      <div className="flex gap-3 flex-wrap my-5">
        {summary.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-[10px] px-4 py-3 min-w-[120px] flex-1">
            <div className={`text-[25px] font-semibold tracking-tight leading-none tabular-nums ${statTone[s.tone]}`}>{s.n}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {/* spine */}
      <div className="flex items-center gap-0 border-b border-border overflow-x-auto">
        {tabs.map(([key, label]) => {
          const count = countFor(key);
          const on = tab === key;
          const attn = key === 'move';
          const showStall = key === 'track' && stalled > 0;
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`relative text-[14.5px] font-semibold py-2.5 mr-5 flex items-center gap-2 whitespace-nowrap ${on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'}`}>
              {label}
              {count != null && <span className={`text-[11.5px] font-semibold rounded-full px-2 tabular-nums ${showStall ? 'sc-red' : on && attn ? 'bg-[color:var(--gfo-error)] text-white' : 'bg-muted text-muted-foreground'}`}>{count}</span>}
              {on && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded" />}
            </button>
          );
        })}
      </div>

      {/* content */}
      <div className="mt-2">
        {tab === 'move' && <MoveList items={bucket.move || []} view={view} doneSet={doneSet} onToggle={toggleDone} onOpen={open} />}
        {tab === 'waiting' && <WaitingList items={bucket.waiting || []} onOpen={open} />}
        {tab === 'track' && <TrackBoard items={bucket.track || []} onOpen={open} />}
        {tab === 'done' && <DoneList items={bucket.done || []} view={view} onOpen={open} />}
        {tab === 'audits' && (view === 'ops' ? <OperationsAudits /> : <MyAudits />)}
        {tab === 'forms' && <FormsCatalog onPick={(k) => openReport(k)} />}
        {tab === 'submissions' && <SubmissionsArchive items={model.submissions} onOpen={open} />}
        {tab === 'formsMgr' && <FormManager />}
        {tab === 'published' && <PublishedReports reports={model.published} />}
      </div>

      <ItemDetailSheet item={selected} open={detailOpen} onOpenChange={setDetailOpen} />
      <NotificationsPanel items={knowItems} open={knowOpen} onOpenChange={setKnowOpen} />
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} initialKind={reportKind} onFiled={handleFiled} />
    </div>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-5 mb-2 px-0.5">{children}</div>;
}

function MoveList({ items, view, doneSet, onToggle, onOpen }: {
  items: SafetyItem[]; view: SafetyView; doneSet: Set<string>; onToggle: (id: string) => void; onOpen: (i: SafetyItem) => void;
}) {
  if (!items.length) return <Empty big="You're all caught up." small="No actions need you right now." />;
  return (
    <>
      <GroupHeading>{view === 'my' ? "Clear these and you're done for the day" : 'Decisions waiting on you'}</GroupHeading>
      <div className="flex flex-col gap-2">
        {items.map((i) => {
          const done = doneSet.has(i.id);
          return (
            <div key={i.id} onClick={() => onOpen(i)}
              className={`flex items-center gap-3 bg-card border border-border rounded-[10px] px-4 py-3 cursor-pointer transition-all hover:border-muted-foreground/40 hover:shadow-sm ${done ? 'opacity-50' : ''}`}>
              <button onClick={(e) => { e.stopPropagation(); onToggle(i.id); }} aria-label="Mark done"
                className={`w-5 h-5 rounded-[6px] border-[1.5px] shrink-0 grid place-items-center transition-colors ${done ? 'bg-[color:var(--gfo-success)] border-[color:var(--gfo-success)] text-white' : 'border-muted-foreground/40 text-transparent hover:border-accent'}`}>
                <Check className="w-3 h-3" />
              </button>
              <div className={`flex-1 min-w-0 ${done ? 'line-through text-muted-foreground' : ''}`}>
                <div className="text-[14.5px] text-foreground">{i.title}</div>
                {i.sub && <div className="text-[11.5px] text-muted-foreground mt-0.5">{i.sub}</div>}
              </div>
              {i.due && <span className={`text-xs font-semibold whitespace-nowrap ${i.due.tone === 'red' ? 'text-[color:var(--gfo-error)]' : i.due.tone === 'amber' ? 'text-[color:var(--gfo-warning)]' : 'text-muted-foreground'}`}>{i.due.label}</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function WaitingList({ items, onOpen }: { items: SafetyItem[]; onOpen: (i: SafetyItem) => void }) {
  if (!items.length) return <Empty big="Nothing in flight." small="Items you've handed off will appear here." />;
  return (
    <>
      <GroupHeading>With other people — not your move</GroupHeading>
      <div className="flex flex-col gap-2">
        {items.map((i) => (
          <div key={i.id} onClick={() => onOpen(i)}
            className="flex items-center gap-3 bg-card border border-border rounded-[10px] px-4 py-3 cursor-pointer hover:border-muted-foreground/40 transition-colors">
            <div className="w-[26px] h-[26px] rounded-full grid place-items-center text-[10px] font-semibold text-white bg-muted-foreground shrink-0">{i.who || '··'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] text-muted-foreground">{i.title}</div>
              {i.sub && <div className="text-[11.5px] text-muted-foreground/70 mt-0.5">{i.sub}</div>}
            </div>
            <span className="text-xs font-semibold text-accent whitespace-nowrap">{i.nudge || 'View'}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function DoneList({ items, view, onOpen }: { items: SafetyItem[]; view: SafetyView; onOpen: (i: SafetyItem) => void }) {
  if (!items.length) return <Empty big="Nothing yet." small="Completed items land here." />;
  return (
    <>
      <GroupHeading>{view === 'my' ? 'What you cleared' : 'Recently closed'}</GroupHeading>
      <div className="flex flex-col gap-2">
        {items.map((i) => (
          view === 'my'
            ? (
              <div key={i.id} className="flex items-center gap-3 bg-card border border-border rounded-[10px] px-4 py-3 opacity-70">
                <div className="w-5 h-5 rounded-[6px] grid place-items-center shrink-0 sc-green"><Check className="w-3 h-3" /></div>
                <div className="flex-1 min-w-0 text-[13.5px] text-muted-foreground">{i.title}</div>
                <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">{i.when}</span>
              </div>
            )
            : (
              <div key={i.id} onClick={() => onOpen(i)}
                className="grid grid-cols-[76px_1fr_auto] gap-3.5 items-center bg-card border border-border rounded-[10px] px-4 py-3 cursor-pointer hover:border-muted-foreground/40 transition-colors">
                <TypeLabel>{i.type}</TypeLabel>
                <div className="min-w-0">
                  <div className="text-[14.5px] text-foreground truncate">{i.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{i.when}</div>
                </div>
                {i.status && <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${toneClass(i.status.tone)}`}>{i.status.label}</span>}
              </div>
            )
        ))}
      </div>
    </>
  );
}

function Empty({ big, small }: { big: string; small: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-[15px] text-foreground/70 font-medium mb-1">{big}</div>
      <div className="text-sm text-muted-foreground">{small}</div>
    </div>
  );
}
