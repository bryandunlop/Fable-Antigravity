import React from 'react';

interface KeyboardShortcutBadgeProps {
  keys: string[];
  className?: string;
}

export default function KeyboardShortcutBadge({ keys, className = '' }: KeyboardShortcutBadgeProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-xs text-muted-foreground">+</span>}
          <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  );
}
