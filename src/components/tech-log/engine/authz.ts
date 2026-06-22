import type { Personnel } from '../types';

export interface SupersedeAuth {
  ok: boolean;
  thirdParty: boolean;       // true when a supervisor corrects someone else's record
  relationship?: string;     // recorded on the correction (e.g. "Supervisor (DOM/Chief)")
  error?: string;
}

/**
 * Who may create a superseding (correction) row — CLAUDE.md SE-1 / Open Question #5.
 * A correction may be filed only by:
 *   • the original signer (self-correction), or
 *   • a designated supervisor (Chief Pilot / DOM / Chief Inspector), flagged as a third-party
 *     correction that records the corrector's relationship to the original.
 * The coarse pilot/maint role gate is NOT sufficient on its own.
 */
export function canSupersede(originalSignerOid: string, corrector: Personnel): SupersedeAuth {
  if (corrector.oid === originalSignerOid) {
    return { ok: true, thirdParty: false };
  }
  if (corrector.isSupervisor) {
    return { ok: true, thirdParty: true, relationship: `Supervisor (${corrector.role})` };
  }
  return {
    ok: false,
    thirdParty: false,
    error: 'Only the original signer or a designated supervisor (Chief Pilot / DOM) may file a correction.',
  };
}
