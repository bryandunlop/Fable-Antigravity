// /people/:id — one person's record (Phase 5 slice 2, D109; canvas artboard 3).
//
// The trade-off written on the canvas: "the passenger data must be entered somewhere. Passenger
// forms already exist on the platform — this makes them the source rather than a parallel list."
// Bryan's Q3 answer, 2026-09-02: this record is the source; the forms module reads it.

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Star } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPageHeader, GfoPanel } from '../../gfo';
import { cn } from '../../ui/utils';
import { useTripsModule } from '../TripsContext';
import {
  personById, personHistory, renamePerson, setPrincipal, tripCarries, upsertPerson,
  type BriefingPrefValue, type Person,
} from '../engine/people';

const field = 'h-9 w-full rounded-md border border-border bg-input-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring';

const PREF_LABEL: Record<BriefingPrefValue, string> = {
  every: 'Every trip',
  first: 'Only their first trip',
  never: 'Never',
};

export default function PersonPage() {
  const { id = '' } = useParams();
  const { people, setPeople, allTrips, actor, nowUtc } = useTripsModule();
  const navigate = useNavigate();
  const now = nowUtc();
  const todayKey = now.slice(0, 10);
  const person = personById(people, id);
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const history = useMemo(() => (person ? personHistory(allTrips, person, now) : null), [allTrips, person, now]);
  const trips = useMemo(
    () => (person ? allTrips.filter(t => tripCarries(t, person) && t.status !== 'draft') : []),
    [allTrips, person],
  );

  if (!person || !history) {
    return (
      <div className="mx-auto max-w-[900px] p-6">
        <GfoPanel><p className="text-sm text-muted-foreground">No such person.</p></GfoPanel>
      </div>
    );
  }

  const isSched = actor.role === 'scheduling';
  // Re-reads the person from the register inside the updater rather than merging onto the copy
  // captured at render: two edits landing in one React batch would otherwise lose the first.
  const patch = (next: Partial<Person>) =>
    setPeople(ps => { const cur = personById(ps, person.id); return cur ? upsertPerson(ps, { ...cur, ...next }) : ps; });

  return (
    <div className="mx-auto max-w-[900px] space-y-4 p-6">
      <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" onClick={() => navigate('/people')}>
        <ArrowLeft className="h-4 w-4" /> People
      </button>

      <GfoPageHeader
        eyebrow={person.kind}
        title={person.name}
        description={person.ea ? `Booked by ${person.ea}${person.eaLevel ? ` · ${person.eaLevel} access` : ''}` : 'No EA books for this person.'}
      />

      {person.unverified && (
        <GfoPanel>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            This record was created from a name typed on a trip. Nobody has confirmed it, and the
            empty documents and forms below mean <strong>nobody has asked</strong> — not that there
            is nothing to ask.
          </p>
        </GfoPanel>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <GfoPanel title="Who they are">
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="gfo-eyebrow text-muted-foreground">Name</span>
              {isSched ? (
                <input
                  className={`${field} mt-1`} aria-label="Name"
                  value={nameDraft ?? person.name}
                  onChange={e => setNameDraft(e.target.value)}
                  onBlur={e => { setPeople(ps => renamePerson(ps, person.id, e.target.value)); setNameDraft(null); }}
                />
              ) : <div className="mt-1">{person.name}</div>}
              <span className="mt-1 block text-xs text-muted-foreground">
                Renaming is safe: the reserve, the email list, the gates and the metrics all hold the
                record, never the name.
              </span>
            </label>

            <label className="block">
              <span className="gfo-eyebrow text-muted-foreground">Email</span>
              {isSched ? (
                <input
                  className={`${field} mt-1`} aria-label="Email" defaultValue={person.email ?? ''}
                  placeholder="Nothing on file"
                  onBlur={e => { const v = e.target.value.trim(); if (v !== (person.email ?? '')) patch({ email: v || null }); }}
                />
              ) : <div className="mt-1">{person.email ?? <span className="text-muted-foreground">Nothing on file</span>}</div>}
            </label>

            <label className="block">
              <span className="gfo-eyebrow text-muted-foreground">Briefing email</span>
              {isSched ? (
                <select
                  className={`${field} mt-1`} aria-label="Briefing email preference" value={person.briefingPref}
                  onChange={e => patch({ briefingPref: e.target.value as BriefingPrefValue })}
                >
                  {(Object.keys(PREF_LABEL) as BriefingPrefValue[]).map(k => <option key={k} value={k}>{PREF_LABEL[k]}</option>)}
                </select>
              ) : <div className="mt-1">{PREF_LABEL[person.briefingPref]}</div>}
            </label>

            <div>
              <span className="gfo-eyebrow text-muted-foreground">Preferences</span>
              {isSched ? (
                <input
                  className={`${field} mt-1`} aria-label="Preferences" defaultValue={person.prefs ?? ''}
                  placeholder="Window seat · no shellfish · car at destination"
                  onBlur={e => { const v = e.target.value.trim(); if (v !== (person.prefs ?? '')) patch({ prefs: v || null }); }}
                />
              ) : <div className="mt-1">{person.prefs ?? <span className="text-muted-foreground">None recorded</span>}</div>}
            </div>

            {isSched && (
              <div className="flex items-center gap-2 pt-1">
                {person.principal ? (
                  <span className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                    <Star className="h-4 w-4" /> The aircraft is reserved for this person (D107).
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setPeople(ps => setPrincipal(ps, person.id))}>
                    Make this person the principal
                  </Button>
                )}
              </div>
            )}
          </div>
        </GfoPanel>

        <div className="space-y-4">
          <GfoPanel title="Forms">
            <p className={cn('text-sm', person.forms.status === 'resubmit' || person.forms.status === 'none' ? 'text-amber-700 dark:text-amber-400' : '')}>
              {person.forms.status === 'approved' && 'Approved.'}
              {person.forms.status === 'in-review' && 'In review.'}
              {person.forms.status === 'resubmit' && 'Needs resubmitting.'}
              {person.forms.status === 'none' && 'No forms on file — nobody has asked.'}
            </p>
            {person.forms.note && <p className="mt-1 text-sm text-muted-foreground">{person.forms.note}</p>}
          </GfoPanel>

          <GfoPanel title="History">
            <div className="text-sm text-muted-foreground">
              {history.trips} {history.trips === 1 ? 'trip' : 'trips'}
              {history.upcoming > 0 && ` · ${history.upcoming} still ahead`}
              {' · bumped '}{history.bumped}
              {' · asked scheduling '}{history.asked}{history.asked === 1 ? ' time' : ' times'}
              {history.lastFlown && ` · last flew ${history.lastFlown.title}, ${history.lastFlown.date}`}
            </div>
          </GfoPanel>
        </div>
      </div>

      <GfoPanel title="Travel documents">
        {person.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None on file. That is not the same as none existing — see above.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {person.documents.map(d => {
              const expired = d.expiresOn < todayKey;
              return (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">{d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.kind}{d.country ? ` · ${d.country}` : ''} · {d.numberMasked}</div>
                  </div>
                  <div className={cn('flex items-center gap-1.5 text-xs', expired ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
                    {expired && <AlertTriangle className="h-3.5 w-3.5" />}
                    {expired ? 'Expired' : 'Expires'} {d.expiresOn}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GfoPanel>

      <GfoPanel title="Trips">
        {trips.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trips on the record.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {trips.map(t => (
              <li key={t.id}>
                <button className="w-full py-2 text-left hover:bg-accent/40" onClick={() => navigate(`/trips/${t.id}`)}>
                  <span className="font-medium text-primary">{t.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{t.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </GfoPanel>
    </div>
  );
}
