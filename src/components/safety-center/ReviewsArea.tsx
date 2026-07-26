// Operations → Reviews: mounts the persisted review consoles (FRAT review, GRAT
// review, ASAP, waiver register) under one sub-nav. FRAT/GRAT/ASAP read their own
// stores; the waiver register reads the shared approvalRequests store the
// /approvals inbox uses (D40), which is why it needs the acting role.

import { useState } from 'react';
import FRATReview from '../FRATReview';
import GRATReview from '../GRATReview';
import WaiverManagement from '../WaiverManagement';
import { AsapReview } from './AsapReview';

type Sub = 'frat' | 'grat' | 'waivers' | 'asap';
const TABS: { key: Sub; label: string }[] = [
  { key: 'frat', label: 'FRAT reviews' },
  { key: 'grat', label: 'GRAT reviews' },
  { key: 'asap', label: 'ASAP' },
  { key: 'waivers', label: 'Waivers' },
];

interface Props { userRole: string; additionalRoles?: string[] }

export function ReviewsArea({ userRole, additionalRoles = [] }: Props) {
  const [sub, setSub] = useState<Sub>('frat');
  return (
    <div className="mt-4">
      <div className="flex gap-2 flex-wrap mb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`text-[14px] font-semibold px-4 py-2 min-h-[40px] rounded-full border transition-colors ${sub === t.key ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/40'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {/* ASAP reviewer is a native Safety-Center surface; the others are the full
          existing consoles (full-width, so they get the -mx-6 bleed). */}
      {sub === 'asap' ? (
        <AsapReview />
      ) : (
        <div className="-mx-6">
          {sub === 'frat' && <FRATReview />}
          {sub === 'grat' && <GRATReview />}
          {sub === 'waivers' && <WaiverManagement userRole={userRole} additionalRoles={additionalRoles} />}
        </div>
      )}
    </div>
  );
}
