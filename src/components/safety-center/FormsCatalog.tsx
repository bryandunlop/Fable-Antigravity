import { TriangleAlert, Plane, ThumbsUp, FileCheck, ChevronRight, type LucideIcon } from 'lucide-react';
import { FORM_CATALOG } from './forms';
import type { FormDef } from './types';

const ICONS: Record<string, LucideIcon> = {
  'triangle-alert': TriangleAlert, plane: Plane, 'thumbs-up': ThumbsUp, 'file-check': FileCheck,
};
const TONE_BG: Record<FormDef['tone'], string> = {
  amber: 'color-mix(in srgb, var(--gfo-warning) 22%, transparent)',
  red: 'color-mix(in srgb, var(--gfo-error) 12%, transparent)',
  gold: 'color-mix(in srgb, var(--gfo-sunrise) 24%, transparent)',
  accent: 'color-mix(in srgb, var(--accent) 12%, transparent)',
};

export function FormsCatalog({ onPick }: { onPick: (kind: FormDef['key']) => void }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-5 mb-1 px-0.5">Fill out a form</div>
      <p className="text-[13px] text-muted-foreground mb-4 px-0.5">Pick one — we route it to the safety team and you can track it under Waiting. Flight/ground risk assessments (FRAT/GRAT) live on your trip.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FORM_CATALOG.map((f) => {
          const Icon = ICONS[f.icon] ?? FileCheck;
          return (
            <button key={f.key} onClick={() => onPick(f.key)}
              className="text-left bg-card border border-border rounded-[12px] p-4 flex items-start gap-3.5 hover:border-accent hover:shadow-sm transition-all group">
              <div className="w-[42px] h-[42px] rounded-[10px] grid place-items-center shrink-0" style={{ background: TONE_BG[f.tone] }}>
                <Icon className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[15px] font-medium text-foreground">{f.name}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-accent transition-colors" />
                </div>
                <div className="text-[12.5px] text-muted-foreground mt-1 leading-snug">{f.blurb}</div>
                <div className="text-[11px] text-muted-foreground/70 mt-2">{f.time}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
