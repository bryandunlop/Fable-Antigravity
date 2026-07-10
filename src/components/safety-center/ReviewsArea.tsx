// Operations → Reviews: mounts the existing, persisted review consoles
// (FRAT review, GRAT review, waiver approvals) under one sub-nav. Wire-in per the
// parity plan — these already read/write their own stores.

import { useState } from 'react';
import FRATReview from '../FRATReview';
import GRATReview from '../GRATReview';
import WaiverManagement from '../WaiverManagement';

type Sub = 'frat' | 'grat' | 'waivers';
const TABS: { key: Sub; label: string }[] = [
  { key: 'frat', label: 'FRAT reviews' },
  { key: 'grat', label: 'GRAT reviews' },
  { key: 'waivers', label: 'Waivers' },
];

export function ReviewsArea() {
  const [sub, setSub] = useState<Sub>('frat');
  return (
    <div className="mt-4">
      <div className="flex gap-2 flex-wrap mb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`text-[13px] font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${sub === t.key ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="-mx-6">
        {sub === 'frat' && <FRATReview />}
        {sub === 'grat' && <GRATReview />}
        {sub === 'waivers' && <WaiverManagement />}
      </div>
    </div>
  );
}
