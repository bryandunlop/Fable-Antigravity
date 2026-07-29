import type { DefectSource } from '../types';
import { cn } from '../../ui/utils';

/**
 * The reporter's own narrative of a defect (LG-108) — `Defect.symptom`.
 *
 * WHY THIS EXISTS AS A COMPONENT. `symptom` had been captured by the report form since the field
 * roster was written and rendered by literally nothing — no list, no print path, no FIR. D57 is
 * what made the gap visible: splitting the structured CAS annunciation out of the old conflated
 * "Symptom / CAS" input left `symptom` holding exactly the part a CAS message cannot carry — "started
 * as a flicker on taxi, went solid after rotation" — and that was the half nobody could read.
 *
 * It is an ATOM rather than three copies of a `<p>` because there is **no defect detail route** in
 * this app: a defect is rendered as a card in two forked places (the Defects list and the aircraft
 * workspace's Defects tab), and now a third (the work-card header a tech reads before
 * troubleshooting). `CasChip` is the precedent — the two defect renderers had already drifted, and
 * one shared atom is what keeps a wording or emphasis change from landing on only one of them.
 *
 * ATTRIBUTION IS DERIVED, NOT ASSUMED. The narrative is usually the pilot's, and calling it out as
 * such is the point — it is testimony, distinct from the structured facts beside it. But a `MAREP`
 * is written by maintenance, and labelling that "the pilot's account" would put a false attribution
 * on a record whose value is precisely that a named person said it. So the label follows
 * `Defect.source`.
 *
 * Renders nothing for an absent or blank narrative, so call sites need no conditional.
 */
export function SymptomNote({ symptom, source, className }: {
  symptom?: string;
  source?: DefectSource;
  className?: string;
}) {
  const text = symptom?.trim();
  if (!text) return null;
  const label = source === 'MAREP' ? 'Reported account' : "Pilot's account";
  return (
    <p
      data-testid="symptom-note"
      className={cn('mt-1 border-l-2 pl-2 text-xs italic text-muted-foreground', className)}
    >
      <span className="font-medium not-italic">{label}:</span> {text}
    </p>
  );
}
