// The safety manager's FRAT job, as it actually is (Bryan, 2026-08-19):
//
//   "the crew are the only ones who really interact with the frat. The Safety
//    Manager just marks them complete after the flight to show that they saw it."
//
// The console this replaces under Assure was a 1,000-line approve/reject review
// workflow — Pending · Approved · Rejected · Requires Review — which describes a
// job nobody does. That matters more than the wasted screen: this demo exists so
// a professional rebuild is built from the right model, and an approval UI would
// have taught the rebuild team that safety gatekeeps every flight risk
// assessment. It does not. The crew own the FRAT; safety attests that they saw
// it afterwards.
//
// So there is exactly one action, and it is an attestation, not a decision. The
// full console still lives at /safety/frat-review for anyone who wants the
// filters and the scoring detail.

import { useEffect, useState } from 'react';
import { Check, Plane } from 'lucide-react';
import { Button } from '../ui/button';

const KEY = 'frat_submissions';

interface FratRow {
  id: string;
  status?: string;
  flightNumber?: string;
  date?: string;
  route?: string;
  aircraft?: string;
  pilotInCommand?: string;
  submittedBy?: string;
  riskLevel?: string;
  totalScore?: number;
  maxScore?: number;
  /** D85 — the attestation, and the SOURCE OF TRUTH for whether it happened.
   *  `status` is written alongside for the crew's list, but every screen derives
   *  "Seen" from `seenAt`, so a stale or hand-edited status cannot claim an
   *  attestation nobody made. */
  seenByName?: string;
  seenAt?: string;
}

function load(): FratRow[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FratRow[]) : [];
  } catch { return []; }
}

const RISK_TONE: Record<string, string> = {
  Low: 'sc-green', Medium: 'sc-amber', High: 'sc-amber', Critical: 'sc-red',
};

export function FratSeen({ actorName }: { actorName: string }) {
  const [rows, setRows] = useState<FratRow[]>([]);
  useEffect(() => { setRows(load()); }, []);

  function markSeen(id: string) {
    const next = load().map((r) => (r.id === id
      // `status: 'Seen'` is written for the crew's own list, which reads the
      // same store; `seenAt` remains the source of truth that the crew screen
      // derives from, so the two cannot drift apart.
      ? { ...r, status: 'Seen', seenByName: actorName, seenAt: new Date().toISOString() }
      : r));
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* demo storage */ }
    setRows(next);
  }

  const unseen = rows.filter((r) => !r.seenAt);
  const seen = rows.filter((r) => r.seenAt).slice(0, 12);

  return (
    <div className="mt-3 flex flex-col gap-5">
      <div className="rounded-lg px-3.5 py-2.5 text-[12.5px] leading-snug sc-accent flex items-start gap-2">
        <Plane className="w-4 h-4 shrink-0 mt-px" />
        The crew own the FRAT. Your part is to confirm you have seen each one after the flight —
        there is nothing here to approve or reject.
      </div>

      <div className="flex flex-col gap-2">
        <div className="gfo-eyebrow">Not yet seen{unseen.length > 0 ? ` · ${unseen.length}` : ''}</div>
        {unseen.length === 0 && (
          <div className="text-[13.5px] text-muted-foreground bg-card border border-border rounded-lg px-4 py-5 text-center">
            You have seen every FRAT that has been filed.
          </div>
        )}
        {unseen.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-medium">{r.route ?? r.flightNumber ?? r.id}</div>
              <div className="text-[12.5px] text-muted-foreground mt-0.5 flex gap-2 flex-wrap">
                {r.date && <span>{r.date}</span>}
                {r.aircraft && <span>· {r.aircraft}</span>}
                {r.pilotInCommand && <span>· {r.pilotInCommand}</span>}
              </div>
            </div>
            {r.riskLevel && (
              <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${RISK_TONE[r.riskLevel] ?? 'sc-neutral'}`}>
                {r.riskLevel}{r.totalScore != null ? ` · ${r.totalScore}${r.maxScore ? `/${r.maxScore}` : ''}` : ''}
              </span>
            )}
            <Button onClick={() => markSeen(r.id)} className="h-11 gap-2">
              <Check className="w-4 h-4" /> Mark seen
            </Button>
          </div>
        ))}
      </div>

      {seen.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="gfo-eyebrow opacity-70">Seen</div>
          {seen.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-lg px-4 py-2.5 flex items-center gap-3 flex-wrap">
              <Check className="w-4 h-4 text-[color:var(--gfo-success-ink)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[14px]">{r.route ?? r.flightNumber ?? r.id}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  Seen by {r.seenByName}{r.seenAt ? ` · ${new Date(r.seenAt).toLocaleDateString()}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
