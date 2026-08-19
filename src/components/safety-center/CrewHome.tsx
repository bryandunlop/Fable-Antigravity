// Crew home (D85 — direction A1). The worklist is the spine: it answers "what
// now". The quiet index below it answers "where is everything".
//
// This replaces D38's four-door grid. The doors are not gone — they are a list
// BELOW the answer rather than a menu INSTEAD of it, which is what Bryan asked
// for when he picked A ("it also needs a way to navigate to the different areas
// still"). The `?door=` param is unchanged, so every existing deep link and
// notification target still resolves.

import { useState } from 'react';
import {
  FileText, PenLine, ClipboardList, ClipboardCheck, BookOpen,
  MessageSquare, ChevronRight, Search,
} from 'lucide-react';
import type { CrewTask, CrewWorklist } from './crewWorklist';

export type Door = 'reports' | 'reads' | 'assessments' | 'library' | 'audits';

const KIND_ICON = {
  sign: PenLine,
  reply: MessageSquare,
  audit: ClipboardCheck,
} as const;

/** Icon-square tone carries URGENCY, not kind — consistent with the rest of the
 *  module's RAG use. An undated task (a question from safety) reads accent. */
function toneClassFor(task: CrewTask): string {
  switch (task.due?.tone) {
    case 'red': return 'sc-red';
    case 'amber': return 'sc-amber';
    case 'neutral': return 'sc-neutral';
    default: return 'sc-accent';
  }
}

function dueTextClass(tone: CrewTask['due'] extends undefined ? never : 'red' | 'amber' | 'neutral'): string {
  if (tone === 'red') return 'text-[color:var(--gfo-error-ink)]';
  if (tone === 'amber') return 'text-[color:var(--gfo-warning-ink)]';
  return 'text-muted-foreground';
}

interface IndexRow {
  door: Door;
  label: string;
  icon: typeof FileText;
  meta: string;
  /** Renders the meta in an attention ink rather than muted. */
  metaTone?: 'red' | 'amber';
}

const MORE_LABEL: Record<CrewTask['kind'], (n: number) => string> = {
  sign: (n) => `${n} more to read and sign`,
  reply: (n) => `${n} more waiting on your reply`,
  audit: (n) => `${n} more ${n === 1 ? 'audit' : 'audits'} assigned to you`,
};

interface Props {
  tasks: CrewTask[];
  more: CrewWorklist['more'];
  openReports: number;
  pendingReads: number;
  auditsDue: number;
  hasAudits: boolean;
  onOpenDoor: (d: Door) => void;
  onOpenTask: (t: CrewTask) => void;
  onSearch: (q: string) => void;
}

export function CrewHome({
  tasks, more, openReports, pendingReads, auditsDue, hasAudits, onOpenDoor, onOpenTask, onSearch,
}: Props) {
  const [q, setQ] = useState('');

  // The heading counts the whole obligation, not just the rows that fit — the
  // list is capped per kind, the number is not.
  const total = tasks.length + more.reduce((n, m) => n + m.count, 0);

  const rows: IndexRow[] = [
    {
      door: 'reports', label: 'My reports', icon: FileText,
      meta: openReports > 0 ? `${openReports} open` : 'Nothing open',
    },
    {
      door: 'reads', label: 'Read and sign', icon: PenLine,
      meta: pendingReads > 0 ? `${pendingReads} waiting` : 'All current',
      metaTone: pendingReads > 0 ? 'red' : undefined,
    },
    { door: 'assessments', label: 'My assessments', icon: ClipboardList, meta: 'FRAT · GRAT' },
    ...(hasAudits
      ? [{
          door: 'audits' as Door, label: 'My audits', icon: ClipboardCheck,
          meta: auditsDue > 0 ? `${auditsDue} due` : 'All complete',
          metaTone: auditsDue > 0 ? ('amber' as const) : undefined,
        }]
      : []),
    { door: 'library', label: 'Library', icon: BookOpen, meta: 'Lessons · newsletters' },
  ];

  return (
    <div className="mt-6 flex flex-col gap-5">

      {/* ── the worklist ── */}
      <div className="flex flex-col gap-2.5">
        <div className="text-[15px] font-semibold px-0.5">
          {total === 0
            ? <span className="text-muted-foreground font-normal">Nothing needs you right now.</span>
            : `${total} ${total === 1 ? 'thing needs' : 'things need'} you`}
        </div>

        {tasks.map((t) => {
          const Icon = KIND_ICON[t.kind];
          return (
            <button key={t.id} onClick={() => onOpenTask(t)}
              className="text-left flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3 min-h-[64px] cursor-pointer transition-all hover:border-muted-foreground/40 hover:shadow-sm active:scale-[.995] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1">
              <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${toneClassFor(t)}`}>
                <Icon className="w-[19px] h-[19px]" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium text-foreground truncate">{t.title}</span>
                {t.sub && <span className="block text-[12.5px] text-muted-foreground mt-0.5 truncate">{t.sub}</span>}
              </span>
              {t.due && (
                <span className={`text-[13px] font-semibold whitespace-nowrap ${dueTextClass(t.due.tone)}`}>
                  {t.due.label}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
            </button>
          );
        })}

        {more.map((m) => (
          <button key={`more-${m.kind}`} onClick={() => onOpenDoor(m.door)}
            className="text-left flex items-center gap-3 px-4 py-2.5 min-h-[44px] rounded-lg cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset">
            <span className="flex-1 text-[13.5px] text-muted-foreground">{MORE_LABEL[m.kind](m.count)}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          </button>
        ))}
      </div>

      {/* ── search: a way into the reports archive, which owns the real search ── */}
      <form
        onSubmit={(e) => { e.preventDefault(); onSearch(q); }}
        className="flex items-center gap-2.5 bg-card border border-border rounded-lg px-3.5 h-12"
      >
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your reports — title, tail, ref…"
          aria-label="Search your reports"
          className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
        />
      </form>

      {/* ── the quiet index ── */}
      <div className="flex flex-col gap-2.5">
        <div className="gfo-eyebrow px-0.5">Your safety, by area</div>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {rows.map(({ door, label, icon: Icon, meta, metaTone }, i) => (
            <button key={door} onClick={() => onOpenDoor(door)}
              className={`w-full text-left flex items-center gap-3 px-4 min-h-[60px] cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${i < rows.length - 1 ? 'border-b border-border' : ''}`}>
              <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-[15px] font-medium text-foreground">{label}</span>
              <span className={`text-[13px] ${
                metaTone === 'red' ? 'font-semibold text-[color:var(--gfo-error-ink)]'
                : metaTone === 'amber' ? 'font-semibold text-[color:var(--gfo-warning-ink)]'
                : 'text-muted-foreground'
              }`}>{meta}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <div className="text-[12.5px] text-muted-foreground text-center pb-1">
        Reports you file are confidential to the safety team.
      </div>
    </div>
  );
}
