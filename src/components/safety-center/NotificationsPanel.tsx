import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../ui/sheet';
import { TriangleAlert, FileText, Check, Clock, type LucideIcon } from 'lucide-react';
import type { KnowItem } from './types';

const ICONS: Record<string, LucideIcon> = {
  'triangle-alert': TriangleAlert,
  'file-text': FileText,
  check: Check,
  clock: Clock,
};

const ICON_BG: Record<KnowItem['tone'], string> = {
  haz: 'color-mix(in srgb, var(--gfo-warning) 22%, transparent)',
  ok: 'color-mix(in srgb, var(--gfo-success) 15%, transparent)',
  doc: 'color-mix(in srgb, var(--accent) 12%, transparent)',
  info: 'var(--muted)',
};

const PROMO_CLASS: Record<KnowItem['promo'], string> = {
  do: 'sc-accent',
  track: 'sc-amber',
  fyi: 'sc-neutral',
};

export function NotificationsPanel({
  items, open, onOpenChange,
}: { items: KnowItem[]; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] max-w-[92vw] p-0 flex flex-col gap-0">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          {/* SheetTitle renders an h2 — visible heading doubles as the Radix
              accessible name, which was missing entirely (LG-30). */}
          <SheetTitle className="text-[17px] font-semibold">Notifications</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-0.5">Things that happened — promoted to a task only when they need you.</SheetDescription>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {items.map((n) => {
            const Icon = ICONS[n.icon] ?? Clock;
            return (
              <div key={n.id} className="px-6 py-3 border-b border-border flex gap-3">
                <div className="w-[30px] h-[30px] rounded-lg grid place-items-center shrink-0" style={{ background: ICON_BG[n.tone] }}>
                  <Icon className="w-[15px] h-[15px] text-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] text-foreground leading-snug">{n.text}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-1">{n.at}</div>
                  <span className={`inline-block text-[11px] font-medium mt-1.5 px-2 py-0.5 rounded-full ${PROMO_CLASS[n.promo]}`}>
                    {n.promo === 'fyi' ? '' : '→ '}{n.promoLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
