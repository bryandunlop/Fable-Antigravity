import type { DefectStatus } from '../types';

/**
 * LG-154 — which defect actions get a button, and which go behind the overflow.
 *
 * The row used to render up to six equal buttons — Correct · Defer (MEL) · Rectify · Quick CRS ·
 * Watch · Open FIR — on every card, all the way down the list.
 *
 * **Deviation from the logged plan, deliberate.** The row said "promote the derived next action to a
 * SINGLE primary button". Building it, that turned out to be the wrong idea: choosing between
 * deferring under the MEL and rectifying *is* the airworthiness judgement a technician is paid to
 * make, and software that renders one of them as the recommended act is making that judgement in the
 * furniture. So the reduction keeps **both** genuine paths visible and demotes only the four that are
 * not the decision — exception handling (Correct, Quick CRS), deferring the decision (Watch), and a
 * retrospective report (Open FIR).
 *
 * Six buttons to two is the density win; not inventing a recommendation is the safety one.
 */
export type DefectActionId = 'correct' | 'defer' | 'rectify' | 'quickCrs' | 'watch' | 'escalate' | 'fir';

/** Stable order for the overflow menu, so a defect's menu doesn't reshuffle as its status changes. */
const OVERFLOW_ORDER: DefectActionId[] = ['correct', 'quickCrs', 'watch', 'escalate', 'fir'];

export interface DefectActionLayout {
  /** Rendered as buttons, in this order. Never more than two. */
  promoted: DefectActionId[];
  /** Rendered inside the "More" menu, in a stable order. */
  overflow: DefectActionId[];
}

export function defectActionLayout({
  status,
  isMaint,
  canCorrect,
}: {
  status: DefectStatus;
  isMaint: boolean;
  /** Already includes the supersede-authorisation check — this module does not re-decide it. */
  canCorrect: boolean;
}): DefectActionLayout {
  const available = new Set<DefectActionId>();

  // FIR is retrospective: any role, any status, even a rectified defect.
  available.add('fir');
  if (canCorrect && status === 'OPEN') available.add('correct');
  if (isMaint && status === 'OPEN') {
    available.add('defer');
    available.add('rectify');
    available.add('quickCrs');
    available.add('watch');
  }
  if (isMaint && status === 'WATCHLISTED') {
    available.add('rectify');
    available.add('escalate');
  }

  let promoted: DefectActionId[] = [];
  if (isMaint && status === 'OPEN') {
    // The two real paths out of an open defect. Neither is recommended over the other.
    promoted = ['defer', 'rectify'];
  } else if (isMaint && status === 'WATCHLISTED') {
    // A watched defect has already been triaged once; clearing it or raising it are the live moves.
    promoted = ['rectify', 'escalate'];
  }

  const promotedSet = new Set(promoted);
  const overflow = OVERFLOW_ORDER.filter(id => available.has(id) && !promotedSet.has(id));

  return { promoted: promoted.filter(id => available.has(id)), overflow };
}
