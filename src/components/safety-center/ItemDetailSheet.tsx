import { Sheet, SheetContent } from '../ui/sheet';
import { Button } from '../ui/button';
import { StageBar, StatusPill, stageName } from './ui-bits';
import type { SafetyItem, ThreadMsg } from './types';

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function Message({ m }: { m: ThreadMsg }) {
  if (m.role === 'system') {
    return (
      <div className="flex gap-3 mb-4">
        <div className="w-[30px] h-[30px] rounded-full grid place-items-center text-xs font-semibold text-white bg-muted-foreground shrink-0">◇</div>
        <div className="flex-1 rounded-lg bg-muted px-3 py-2 text-[12.5px] text-muted-foreground leading-relaxed">{m.text}</div>
      </div>
    );
  }
  const isYou = m.role === 'you';
  return (
    <div className="flex gap-3 mb-4">
      <div className={`w-[30px] h-[30px] rounded-full grid place-items-center text-[11px] font-semibold text-white shrink-0 ${isYou ? 'bg-primary' : 'bg-accent'}`}>{initials(m.who)}</div>
      <div className="flex-1">
        <div className="text-[12.5px] mb-0.5"><span className="font-semibold text-foreground">{m.who}</span><span className="text-muted-foreground ml-1.5 text-[11.5px]">{m.at}</span></div>
        <div className="text-[13.5px] text-muted-foreground leading-relaxed">{m.text}</div>
      </div>
    </div>
  );
}

export function ItemDetailSheet({
  item, open, onOpenChange, onAdvance, onOpenWorkflow,
}: {
  item: SafetyItem | null; open: boolean; onOpenChange: (v: boolean) => void;
  onAdvance?: (item: SafetyItem) => void; onOpenWorkflow?: (item: SafetyItem) => void;
}) {
  const isHazard = !!(item && item.type === 'HAZARD' && item.sourceId);
  const canAdvance = !!(onAdvance && isHazard && item && (item.bucket === 'track' || item.bucket === 'move'));
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[440px] max-w-[92vw] p-0 flex flex-col gap-0">
        {item && (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <div className="text-[11px] font-bold uppercase tracking-wide text-accent">{item.type}</div>
              <h2 className="text-lg font-semibold mt-2.5 mb-2 text-balance leading-snug">{item.title}</h2>
              <div className="flex flex-wrap gap-2 items-center text-[12.5px] text-muted-foreground">
                {item.status && <StatusPill tone={item.status.tone}>{item.status.label}</StatusPill>}
                {item.ref ? <span>{item.ref}</span> : item.sub ? <span>{item.sub}</span> : null}
              </div>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1">
              {typeof item.phaseIndex === 'number' && item.bucket === 'track' && (
                <div className="rounded-[10px] bg-muted px-3.5 py-3 mb-5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Lifecycle</div>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground flex-wrap">
                    <StageBar phaseIndex={item.phaseIndex} stalled={item.stalled} />
                    <span className="font-semibold text-foreground">{stageName(item.phaseIndex)}</span>
                    {item.ageLabel && <span> · <span className={item.stalled ? 'text-[color:var(--gfo-error)] font-semibold' : ''}>{item.ageLabel}</span></span>}
                  </div>
                </div>
              )}

              {item.fields && item.fields.length > 0 && (
                <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 mb-5">
                  {item.fields.map((f, i) => (
                    <div key={i}>
                      <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">{f.label}</div>
                      <div className="text-sm text-foreground mt-0.5">{f.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {item.thread && item.thread.length > 0 && (
                <>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Activity</div>
                  {item.thread.map((m, i) => <Message key={i} m={m} />)}
                </>
              )}
            </div>

            {isHazard && (onAdvance || onOpenWorkflow) ? (
              <div className="px-6 py-3.5 border-t border-border flex gap-2.5">
                {canAdvance && (
                  <Button variant="outline" className="flex-1" onClick={() => { onAdvance!(item); onOpenChange(false); }}>
                    {item.bucket === 'move' ? 'Triage →' : 'Advance stage →'}
                  </Button>
                )}
                {onOpenWorkflow && (
                  <Button className="flex-1" onClick={() => onOpenWorkflow(item)}>Open full workflow →</Button>
                )}
              </div>
            ) : item.actions && item.actions.length > 0 ? (
              <div className="px-6 py-3.5 border-t border-border flex gap-2.5">
                {item.actions.map((a, i) => (
                  <Button key={i} variant={a.primary ? 'default' : 'outline'} className="flex-1" onClick={() => onOpenChange(false)}>
                    {a.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
