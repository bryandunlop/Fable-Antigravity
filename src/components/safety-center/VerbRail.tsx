// The verb rail (D85 — "Flip 3"). Named after the job, not the container.
//
// It sits INSIDE the safety console, beside the app's own D80 icon rail. That is
// deliberate and worth watching: 72px of Midnight chrome plus this is a lot of
// rail before content. If it reads heavy at 1280, the fallback is to collapse
// this one to icons under 1280 — the same breakpoint D80 already uses.

import { VERBS, type VerbId, type VerbCount } from './verbs';

interface Props {
  active: VerbId;
  counts: Record<VerbId, VerbCount>;
  onSelect: (v: VerbId) => void;
}

function countClass(tone: VerbCount['tone'], active: boolean): string {
  if (active) return 'text-secondary-foreground';
  if (tone === 'red') return 'text-[color:var(--gfo-error-ink)]';
  if (tone === 'amber') return 'text-[color:var(--gfo-warning-ink)]';
  return 'text-muted-foreground';
}

export function VerbRail({ active, counts, onSelect }: Props) {
  return (
    <nav aria-label="Safety operations" className="flex flex-col gap-0.5">
      {VERBS.map((v, i) => {
        const on = v.id === active;
        const c = counts[v.id];
        const Icon = v.icon;
        // The rule between the daily verbs and the periodic ones.
        const startsPeriodic = v.group === 'periodic' && VERBS[i - 1]?.group === 'daily';
        return (
          <div key={v.id} className={startsPeriodic ? 'mt-3 pt-3 border-t border-border' : ''}>
            <button
              onClick={() => onSelect(v.id)}
              aria-current={on ? 'page' : undefined}
              className={`w-full flex items-center gap-2.5 h-10 px-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
                on ? 'bg-secondary text-secondary-foreground' : 'text-foreground hover:bg-muted/60'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className={`flex-1 text-left text-[14px] ${on ? 'font-semibold' : 'font-medium'}`}>{v.label}</span>
              {c.n != null && c.n > 0 && (
                <span className={`text-[12.5px] font-semibold tabular-nums ${countClass(c.tone, on)}`}>{c.n}</span>
              )}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
