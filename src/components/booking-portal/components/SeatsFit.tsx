// "Seats, not types."
//
// She says how many people are travelling and whether it is an overnight ocean crossing.
// She never picks a type and never picks a tail — the type appears as a fact after
// scheduling assigns one, so nothing here names a G650ER or a G500.
//
// The profile is SUGGESTED from the route and the departure time and she can always
// change it: what makes a crossing "overnight" is not settled, so the system offers an
// opinion and never a verdict.

import { fitFor, profileLabel, type MissionProfile } from '../../../fleet/capacity';
import type { ProfileSuggestion } from '../engine/missionProfile';
import { cn } from '../../ui/utils';

const PROFILES: MissionProfile[] = ['domestic', 'ocean-day', 'ocean-overnight'];

export function SeatsFit({
  seats,
  profile,
  suggestion,
  overridden,
  onProfileChange,
}: {
  seats: number;
  profile: MissionProfile;
  suggestion: ProfileSuggestion;
  overridden: boolean;
  onProfileChange: (p: MissionProfile) => void;
}) {
  const fit = fitFor(seats, profile);

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        What kind of flying
      </p>

      <div className="flex flex-wrap gap-1.5">
        {PROFILES.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onProfileChange(p)}
            aria-pressed={profile === p}
            className={cn(
              'rounded-md border px-2.5 py-1 text-xs',
              profile === p
                ? 'border-[var(--gfo-daylight,#0096FC)] bg-[color-mix(in_srgb,var(--gfo-daylight,#0096FC)_10%,transparent)] font-medium'
                : 'text-muted-foreground hover:bg-muted/40',
            )}
          >
            {profileLabel(p)}
          </button>
        ))}
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        {overridden ? (
          <>You set this. We had guessed <span className="italic">{profileLabel(suggestion.profile).toLowerCase()}</span> — {suggestion.why.toLowerCase()}.</>
        ) : (
          <>
            {suggestion.why}.
            {!suggestion.settled && ' We are guessing at the overnight part — change it if we have it wrong.'}
          </>
        )}
      </p>

      <p className="mt-2 text-sm">
        {fit.fitsOnOne ? (
          <>
            <span className="font-semibold">{seats}</span> fits on one aircraft.
          </>
        ) : (
          <>
            <span className="font-semibold">{seats}</span> needs{' '}
            <span className="font-semibold">{fit.aircraftNeeded} aircraft</span> at this profile.
          </>
        )}
      </p>

      {fit.alternatives.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          {/* Telling her only "does not fit" makes her phone scheduling to be told the
              same thing more slowly. The trade is the useful half. */}
          {fit.alternatives.map(alt => (
            <li key={alt.line}>· {alt.line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
