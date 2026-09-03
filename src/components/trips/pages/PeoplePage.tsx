// /people — the register (Phase 5 slice 2, D109; canvas artboard 3).
//
// Principals first, because that is the order scheduling thinks in. Forms and document state are
// on the row, so the answer to "who is not ready" is one glance rather than five clicks.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Star } from 'lucide-react';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import { personHistory, type FormStatus, type Person } from '../engine/people';

const KIND_ORDER: Record<Person['kind'], number> = { principal: 0, staff: 1, guest: 2 };

const FORM_LABEL: Record<FormStatus, string> = {
  approved: 'Forms approved',
  'in-review': 'Forms in review',
  resubmit: 'Forms need resubmitting',
  none: 'No forms on file',
};

/** Amber for "someone must act", quiet for settled. Never green for an absence. */
const FORM_TONE: Record<FormStatus, string> = {
  approved: 'text-muted-foreground',
  'in-review': 'text-muted-foreground',
  resubmit: 'text-amber-700 dark:text-amber-400',
  none: 'text-amber-700 dark:text-amber-400',
};

/** Documents lapsing inside this many days are worth saying out loud on a list row. */
const SOON_DAYS = 90;

export function documentSummary(person: Person, todayKey: string): { text: string; urgent: boolean } {
  if (person.documents.length === 0) {
    return { text: person.unverified ? 'Nobody has asked yet' : 'No documents on file', urgent: false };
  }
  const soon = new Date(Date.parse(`${todayKey}T00:00:00.000Z`) + SOON_DAYS * 86_400_000).toISOString().slice(0, 10);
  const expired = person.documents.filter(d => d.expiresOn < todayKey);
  if (expired.length > 0) return { text: `${expired.length} expired`, urgent: true };
  const lapsing = person.documents.filter(d => d.expiresOn < soon).sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  if (lapsing.length > 0) return { text: `${lapsing[0].label} expires ${lapsing[0].expiresOn}`, urgent: true };
  return { text: `${person.documents.length} on file`, urgent: false };
}

export default function PeoplePage() {
  const { people, allTrips, nowUtc } = useTripsModule();
  const navigate = useNavigate();
  const now = nowUtc();
  const todayKey = now.slice(0, 10);

  const ordered = useMemo(
    () => [...people].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name)),
    [people],
  );

  const needsSomeone = ordered.filter(
    p => p.forms.status === 'resubmit' || p.forms.status === 'none' || documentSummary(p, todayKey).urgent,
  ).length;

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 p-6">
      <GfoPageHeader
        eyebrow="Trips"
        title="People"
        description="Everyone the department flies. A person is a record — the reserve, the briefing email, the document checks and the metrics all read this one, so a rename changes a name and nothing else."
        actions={
          // D110 slice 4 (Bryan, Q4): crew workload is a People view, and the forms module is reached from here.
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/crew-scheduling-workload')}>Crew workload</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/passenger-forms')}>Passenger forms</Button>
          </div>
        }
      />

      <GfoPanel>
        <div className="mb-3 text-sm text-muted-foreground">
          {ordered.length} {ordered.length === 1 ? 'person' : 'people'}
          {needsSomeone > 0 && <span className="text-amber-700 dark:text-amber-400"> · {needsSomeone} waiting on someone</span>}
        </div>
        <ul className="divide-y divide-border">
          {ordered.map(p => {
            const docs = documentSummary(p, todayKey);
            const h = personHistory(allTrips, p, now);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/people/${p.id}`)}
                  className="flex w-full items-start gap-3 py-3 text-left hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {p.principal && <Star className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-label="Principal" />}
                      <span className="truncate font-medium text-primary">{p.name}</span>
                      <span className="gfo-eyebrow text-muted-foreground">{p.kind}</span>
                      {p.unverified && (
                        <span className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          unverified
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.ea ? `EA: ${p.ea}` : 'No EA'}
                      {p.email ? ` · ${p.email}` : ' · no email on file'}
                      {h.trips > 0 && ` · ${h.trips} ${h.trips === 1 ? 'trip' : 'trips'}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <div className={FORM_TONE[p.forms.status]}>{FORM_LABEL[p.forms.status]}</div>
                    <div className={cn('mt-0.5 flex items-center justify-end gap-1', docs.urgent ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
                      {docs.urgent && <AlertTriangle className="h-3 w-3" />}
                      {docs.text}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </GfoPanel>
    </div>
  );
}
