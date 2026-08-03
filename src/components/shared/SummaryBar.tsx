import React from 'react';

// The phone-first replacement for a row of stat cards.
//
// A grid of four or five Cards, each with a label and a 2xl numeral, is a desktop
// dashboard idiom. On a 390pt phone the grid collapses to one card per row and the
// summary becomes a screen and a half of chrome standing between the user and the
// content they opened the page for. Measured on /passenger-database before this
// existed: five cards, ~180px each, before the first passenger.
//
// The same numbers read fine as one wrapping line.

export interface SummaryItem {
  /** What the number counts, e.g. "legs", "with allergies". Rendered after the value. */
  label: string;
  value: number | string;
  icon?: React.ElementType;
  /** `alert` colours the item red — reserve it for something the user must act on. */
  tone?: 'default' | 'alert';
  /** Drop the item entirely when the value is 0. Use for exception counts ("2 to
   *  chase") where zero is the happy path and saying "0" is noise. */
  hideWhenZero?: boolean;
}

export default function SummaryBar({ items, className = '' }: { items: SummaryItem[]; className?: string }) {
  const shown = items.filter((i) => !(i.hideWhenZero && (i.value === 0 || i.value === '0')));
  if (shown.length === 0) return null;

  return (
    <div className={`rounded-lg border bg-card px-3 py-2 text-sm flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
      {shown.map((item) => {
        const Icon = item.icon;
        const alert = item.tone === 'alert';
        return (
          <span
            key={item.label}
            className={`flex items-center gap-1 ${alert ? 'text-red-700 dark:text-red-300 font-medium' : ''}`}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 shrink-0 ${alert ? '' : 'text-muted-foreground'}`} />}
            <span className={alert ? '' : 'font-semibold'}>{item.value}</span> {item.label}
          </span>
        );
      })}
    </div>
  );
}
