// ─── V2 Badge — Purple "NEW" / "V2" indicator ──────────────────────────────

import React from 'react';

interface V2BadgeProps {
  variant?: 'new' | 'v2' | 'beta';
  size?: 'sm' | 'md';
  className?: string;
}

export function V2Badge({ variant = 'new', size = 'sm', className = '' }: V2BadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-0.5';

  const label = variant === 'new' ? 'NEW' : variant === 'v2' ? 'V2' : 'BETA';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full bg-purple-500 text-white tracking-wider uppercase ${sizeClasses} ${className}`}
    >
      {label}
    </span>
  );
}

export function V2Dot({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full bg-purple-500 ${className}`} />
  );
}
