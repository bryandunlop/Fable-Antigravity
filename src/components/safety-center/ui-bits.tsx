// Small shared presentational pieces + tone tokens for the Safety Center.
// Tones use GFO's aviation RAG, kept off the brand axis and legible in both modes.

import { PHASES, type Tone } from './types';

export function ToneStyles() {
  return (
    <style>{`
      .sc-red{background:color-mix(in srgb,var(--gfo-error) 12%,transparent);color:var(--gfo-error);}
      .sc-amber{background:color-mix(in srgb,var(--gfo-warning) 24%,transparent);color:#946f12;}
      .dark .sc-amber{color:#F1B434;}
      .sc-green{background:color-mix(in srgb,var(--gfo-success) 15%,transparent);color:#0a7d3a;}
      .dark .sc-green{color:#3ddc80;}
      .sc-accent{background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);}
      .sc-neutral{background:var(--muted);color:var(--muted-foreground);}
      .sc-stripe-red{background:var(--gfo-error);}
      .sc-stripe-amber{background:var(--gfo-warning);}
      .sc-stripe-accent{background:var(--accent);}
      .sc-stripe-none{background:var(--border);}
    `}</style>
  );
}

export function toneClass(tone: Tone): string {
  return `sc-${tone}`;
}

export function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(tone)}`}>
      {children}
    </span>
  );
}

// The five-stage lifecycle bar. Past stages muted-green, current accent (red if stalled).
export function StageBar({ phaseIndex, stalled }: { phaseIndex: number; stalled?: boolean }) {
  return (
    <span className="inline-flex gap-[3px] align-middle" aria-hidden>
      {PHASES.map((_, i) => {
        let bg = 'var(--border)';
        if (i < phaseIndex) bg = 'color-mix(in srgb, var(--gfo-success) 55%, transparent)';
        else if (i === phaseIndex) bg = stalled ? 'var(--gfo-error)' : 'var(--accent)';
        return <span key={i} style={{ width: 22, height: 5, borderRadius: 3, background: bg }} />;
      })}
    </span>
  );
}

export function TypeLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{children}</span>
  );
}

export function stageName(phaseIndex: number): string {
  return PHASES[phaseIndex] ?? '';
}
