import type { ReactNode } from 'react';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';

// Sky/blue = inline suggestions. Amber stays the revision-diff lane; never the
// CAMP RAG (green/yellow/red) or custody (gold/blue) palettes.
export function BlockSuggestGutter({
  openCount, canSeePins, active, onSuggest, onOpenThread, onClose, children,
}: {
  openCount: number;
  canSeePins: boolean;
  active: boolean;
  onSuggest: () => void;
  onOpenThread: () => void;
  onClose: () => void;
  children?: ReactNode; // the active composer or thread panel
}) {
  return (
    <div className="absolute right-0 top-1">
      {/* Controlled popover portals the panel out of the reader's scroll container
          so it never clips near the bottom of a long document (collision-flips). */}
      <Popover open={active} onOpenChange={(o: boolean) => { if (!o) onClose(); }}>
        <PopoverAnchor asChild>
          <div className="flex flex-col items-center gap-1">
            {canSeePins && openCount > 0 && (
              <button
                type="button"
                onClick={onOpenThread}
                aria-label={`${openCount} open suggestion${openCount === 1 ? '' : 's'}`}
                className="flex h-6 min-w-6 items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-1.5 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{openCount}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onSuggest}
              aria-label="Suggest an edit"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-sky-300 bg-background text-sky-600 opacity-0 transition group-hover:opacity-100 focus:opacity-100 dark:border-sky-800 dark:text-sky-400"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </PopoverAnchor>
        {children && (
          <PopoverContent align="start" side="left" sideOffset={8} className="w-80 border-sky-200 dark:border-sky-900">
            {children}
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
