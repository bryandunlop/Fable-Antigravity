import React from 'react';
import { Plane, Wrench } from 'lucide-react';

import { LENS_LABEL, type AirportLens } from '../../airport/lens';
import { cn } from '../ui/utils';

/**
 * The lens switch (D96). Two buttons, always both visible, so the current state
 * is never invisible — a lens that quietly changed what you were reading would
 * be worse than no lens at all.
 *
 * Segmented control rather than a dropdown: there are exactly two, and both need
 * to be one tap away on an iPad.
 */
export function LensSwitch({
  value,
  onChange,
  className = '',
}: {
  value: AirportLens;
  onChange: (lens: AirportLens) => void;
  className?: string;
}) {
  const options: { lens: AirportLens; Icon: typeof Plane }[] = [
    { lens: 'pilot', Icon: Plane },
    { lens: 'maintenance', Icon: Wrench },
  ];

  return (
    <div
      className={cn('inline-flex gap-1 rounded-md border bg-card p-1', className)}
      role="group"
      aria-label="Airport view"
    >
      {options.map(({ lens, Icon }) => {
        const active = value === lens;
        return (
          <button
            key={lens}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(lens)}
            className={cn(
              // 44px so it stays a real target on the iPad, which is where a
              // crew reads this.
              'inline-flex h-11 items-center gap-2 rounded px-4 text-sm transition-colors duration-fast ease-gfo',
              active
                ? 'bg-primary font-medium text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {LENS_LABEL[lens]}
          </button>
        );
      })}
    </div>
  );
}
