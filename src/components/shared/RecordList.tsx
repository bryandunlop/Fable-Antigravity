import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// The phone-first replacement for two desktop idioms that both fail at 390pt:
//
//   1. A <Table> with 5+ columns. There is no CSS that makes seven columns work on a
//      phone; horizontal scroll hides the columns that matter.
//   2. A list where every item renders every field inline ("six open detail panes").
//
// Both become: a title, a meta line, an optional trailing status, and a tap for the
// full record. Measured wins on /passenger-database — six always-expanded cards became
// six 52pt rows.
//
// The row is a button, so it is keyboard- and screen-reader-reachable for free. A
// second, separate action (edit, download) sits outside it — nesting a button inside a
// button is invalid HTML and swallows the inner click.

export interface RecordAction {
  icon: React.ElementType;
  /** Announced to assistive tech; the icon alone is not a name. */
  label: string;
  onClick: () => void;
}

export function RecordRow({
  title,
  meta,
  badges,
  trailing,
  onOpen,
  action,
}: {
  title: React.ReactNode;
  /** One line of supporting detail. Clamps to two lines on a phone, one on desktop —
   *  truncating to a single narrow line reduces most metadata to "Board Chai…". */
  meta?: React.ReactNode;
  /** Small markers that belong beside the title (photo count, birthday). */
  badges?: React.ReactNode;
  /** Status at the end of the row — a count, a state chip. Never shrinks, so KEEP IT
   *  NARROW: it wins the width fight against the title. A progress bar here clipped
   *  "FO001 · LAX → JFK" to "FO001 ·…" on /post-flight-checklist. Anything wider than a
   *  badge should be desktop-only, or belong in `meta`. */
  trailing?: React.ReactNode;
  onOpen?: () => void;
  action?: RecordAction;
}) {
  const body = (
    <>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{title}</span>
          {badges}
        </div>
        {meta && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-1">{meta}</p>}
      </div>
      {trailing}
      {onOpen && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </>
  );

  return (
    <div className="flex items-stretch">
      {onOpen ? (
        <button
          onClick={onOpen}
          className="flex-1 min-w-0 text-left px-3 py-3 min-h-[52px] hover:bg-muted active:bg-muted flex items-center gap-3"
        >
          {body}
        </button>
      ) : (
        <div className="flex-1 min-w-0 px-3 py-3 min-h-[52px] flex items-center gap-3">{body}</div>
      )}
      {action && (
        <button
          aria-label={action.label}
          onClick={action.onClick}
          className="px-3 shrink-0 border-l hover:bg-muted active:bg-muted text-muted-foreground"
        >
          <action.icon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * A closed drawer at the foot of a list, holding the records that need nothing.
 *
 * The list should answer "what is left to do", not "how did every record score".
 * A finished flight, a stocked part, a delivered catering order all still cost a
 * row, a scan and a line of screen — on a 390pt phone that is most of the screen
 * spent on work nobody has to do. They stay reachable, one tap away, and the
 * count is the reassurance that they were not lost.
 *
 * Deliberately not `<details>`: it renders its children into the DOM while
 * closed, and the rows inside are focusable buttons.
 */
export function RecordFold({
  label,
  children,
  defaultOpen = false,
}: {
  /** States what is inside AND how much of it — "12 completed", not "Show more". */
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full text-left px-3 py-3 min-h-[44px] flex items-center gap-2 bg-muted/40 hover:bg-muted active:bg-muted text-xs text-muted-foreground"
      >
        <Chevron className="w-4 h-4 shrink-0" />
        {label}
      </button>
      {open && <div className="divide-y border-t">{children}</div>}
    </div>
  );
}

/** The bordered, divided container the rows sit in. */
export default function RecordList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border rounded-lg divide-y overflow-hidden bg-card ${className}`}>{children}</div>;
}
