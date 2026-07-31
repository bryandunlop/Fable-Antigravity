/**
 * The sync chip in the tech-log chrome (TL-38).
 *
 * REPLACES A HARDCODED LIE. This chip previously read "Synced", always, in green, with a tooltip
 * promising that "in offline use this shows 'N entries not yet synced'". It never did — there was no
 * server and no queue, so the one indicator a technician had for whether their work had left the
 * tablet was a decoration that could not report otherwise. That is worse than having no chip: an
 * indicator which cannot show bad news trains people to stop looking at it.
 *
 * The four states are deliberately distinguishable at a glance, because the question a technician is
 * actually asking is binary — *is my morning's work safe* — and the answer has to survive being read
 * across a hangar.
 */

import { Check, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSync } from '../sync/useSync';
import { cn } from '../../ui/utils';

export function SyncStatusChip() {
  const sync = useSync();
  if (!sync) return null;

  const { summary, online, transportName } = sync;
  const queued = summary.pending + summary.inFlight;

  const provenance =
    transportName === 'local'
      ? '\n\nDemo: the stand-in server is this browser, shared across tabs. Cross-device sync needs the real backend (TL-38).'
      : '';

  if (summary.conflicts > 0) {
    return (
      <Chip
        tone="warn"
        icon={<AlertTriangle className="h-3 w-3" />}
        title={`${summary.conflicts} edit${summary.conflicts === 1 ? '' : 's'} could not be saved because the card changed on another device. Open the card to resolve — nothing has been discarded.${provenance}`}
      >
        {summary.conflicts} needs review
      </Chip>
    );
  }

  if (!online) {
    return (
      <Chip
        tone="warn"
        icon={<CloudOff className="h-3 w-3" />}
        title={`Offline. ${queued} change${queued === 1 ? '' : 's'} held on this device and will send when the connection returns. Nothing is lost.${provenance}`}
      >
        Offline{queued > 0 ? ` · ${queued}` : ''}
      </Chip>
    );
  }

  if (queued > 0) {
    return (
      <Chip
        tone="busy"
        icon={<RefreshCw className="h-3 w-3 animate-spin" />}
        title={`${queued} change${queued === 1 ? '' : 's'} not yet confirmed by the server.${provenance}`}
      >
        Saving {queued}
      </Chip>
    );
  }

  return (
    <Chip
      tone="ok"
      icon={<Check className="h-3 w-3" />}
      title={`Every change on this device has been confirmed by the server.${provenance}`}
    >
      Synced
    </Chip>
  );
}

/**
 * BAD NEWS IS NEVER HIDDEN; good news is allowed to be.
 *
 * This chip used to be `hidden sm:inline-flex` in every state, so below 640px it disappeared
 * entirely. That was survivable while the iPad was assumed to be the maintenance device. It is not
 * survivable under D72 (2026-07-31): technicians are typically on their own **phone** and their own
 * laptop — so the single indicator answering "did my morning's work leave this device" was invisible
 * on the device most likely to be holding that work, and being invisible it could not report a
 * conflict, a queue, or an offline outbox. That is precisely the defect this component was written
 * to remove, wearing a media query instead of a hardcoded string.
 *
 * The quiet state (`ok` — "Synced") therefore still yields header room on a narrow screen; nobody
 * needs telling hourly that nothing is wrong. Every other state is an unconditional `inline-flex`:
 * a conflict, unsent changes, or an offline queue read the same at 390px as at 1280px.
 */
function Chip({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'ok' | 'busy' | 'warn';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        'items-center gap-1 rounded-full border px-2 py-1 text-xs',
        tone === 'ok' ? 'hidden sm:inline-flex' : 'inline-flex',
        tone === 'ok' && 'border-[var(--gfo-success,#00B140)]/40 bg-[var(--gfo-success,#00B140)]/10 text-[var(--gfo-success,#00B140)]',
        tone === 'busy' && 'border-border bg-muted/60 text-muted-foreground',
        tone === 'warn' && 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
      )}
    >
      {icon} {children}
    </span>
  );
}
