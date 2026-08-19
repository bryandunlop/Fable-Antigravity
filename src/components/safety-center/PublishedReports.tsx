import { useMemo, useState } from 'react';
import { Search, BookOpen, Lightbulb } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../ui/sheet';
import type { PublishedReport } from './types';

export function PublishedReports({ reports }: { reports: PublishedReport[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<PublishedReport | null>(null);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return reports;
    return reports.filter((r) => [r.title, r.category, r.summary, r.ref].join(' ').toLowerCase().includes(n));
  }, [reports, q]);

  return (
    <div className="mt-4">
      <p className="text-[13px] text-muted-foreground mb-4 px-0.5">De-identified lessons learned, shared across the department. Every closed hazard that carries a lesson ends up here.</p>

      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 h-10 mb-4">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search published reports…"
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><div className="text-[15px] text-foreground/70 font-medium mb-1">No matches.</div></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <button key={r.id} onClick={() => setOpen(r)}
              className="text-left bg-card border border-border rounded-lg p-4 hover:border-accent hover:shadow-sm transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                  <BookOpen className="w-4 h-4 text-accent" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">{r.category}</span>
                <span className="text-[11px] text-muted-foreground ml-auto">{r.publishedDate}</span>
              </div>
              <div className="text-[15px] font-medium text-foreground leading-snug text-balance">{r.title}</div>
              <div className="text-[12.5px] text-muted-foreground mt-1.5 leading-snug line-clamp-3">{r.summary}</div>
              <div className="text-[11px] text-accent font-medium mt-2.5">Read lesson →</div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!open} onOpenChange={(v: boolean) => { if (!v) setOpen(null); }}>
        <SheetContent side="right" className="w-[480px] max-w-[92vw] p-0 flex flex-col gap-0">
          {open && (
            <>
              <div className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                  <span className="uppercase tracking-wide text-accent font-bold">Published report</span>
                  <span>· {open.category}</span>
                  <span className="ml-auto">{open.publishedDate}</span>
                </div>
                {/* SheetTitle renders an h2, so the visible heading doubles as the Radix
                    accessible name — no sr-only duplicate needed (LG-30). */}
                <SheetTitle className="text-lg font-semibold mt-2.5 leading-snug text-balance">{open.title}</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-1">{open.ref} · de-identified</SheetDescription>
              </div>
              <div className="px-6 py-5 overflow-y-auto flex-1">
                <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Summary</div>
                <p className="text-[14px] text-foreground leading-relaxed mb-5">{open.summary}</p>
                {open.whatHappened && (
                  <>
                    <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">What happened</div>
                    <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-5">{open.whatHappened}</p>
                  </>
                )}
                {open.lessons.length > 0 && (
                  <>
                    <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold mb-2.5">
                      <Lightbulb className="w-3.5 h-3.5" /> Lessons
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {open.lessons.map((l, i) => (
                        <div key={i} className="flex gap-2.5 text-[13.5px] text-foreground leading-snug">
                          <span className="text-accent font-semibold shrink-0">{i + 1}.</span>
                          <span>{l}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
