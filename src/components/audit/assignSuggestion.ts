// Pure, testable auditor-suggestion engine shared by every audit-assignment
// surface (the unassigned tray, the inline card chip, and the create dialog).
// Kept as a plain .ts module — not .tsx — so it runs under the current vitest
// config (which excludes .tsx; see TL-11). No React, no storage, no side effects.

export interface Auditor {
  name: string;
  role: string;
}

// Demo default only: which auditor ROLE is the natural fit for an audit CATEGORY.
// This is a placeholder for a real operator/RII-qualification model (cf. Q3, the
// RII ATA-chapter/authorization list) — it is NOT a compliance claim. When a
// category has no mapped role (or nobody in the roster holds it), the suggestion
// falls back to the lightest-loaded auditor across the whole roster.
export const CATEGORY_ROLE: Record<string, string> = {
  'Safety Management': 'Safety',
  Maintenance: 'Maintenance',
  'Ground Operations': 'Maintenance',
  Documentation: 'Document Manager',
  'Flight Operations': 'Pilot',
  Training: 'Pilot',
};

// The only fields the engine reads off an audit. Real Audit (AuditContext) is a
// superset; typing the input loosely keeps this module free of a React import.
interface AuditLike {
  category?: string;
  scheduledDate?: string;
  assignedTo?: string;
}

// Count assigned audits per person for one calendar year, keyed by scheduledDate.
// Mirrors what the roster popover already displays: 'Unassigned' and audits with
// no scheduledDate (pool drafts) do not count toward anyone's load.
export function auditLoadByPerson(
  audits: AuditLike[],
  year: number,
): Record<string, number> {
  const load: Record<string, number> = {};
  for (const a of audits) {
    if (!a.assignedTo || a.assignedTo === 'Unassigned') continue;
    if (!a.scheduledDate) continue;
    const yr = new Date(a.scheduledDate + 'T00:00:00').getFullYear();
    if (yr !== year) continue;
    load[a.assignedTo] = (load[a.assignedTo] || 0) + 1;
  }
  return load;
}

// Pick the auditor the manager most likely wants: first the auditors whose role
// matches the audit's category, then the one carrying the fewest audits this
// year, with an alphabetical tie-break so the choice is stable and testable.
// Falls back to the whole roster when no role matches. Returns null if the
// roster is empty.
//
// `extraLoad` lets a batch (Auto-assign all) add picks already handed out in the
// same run to each person's load, so the batch stays balanced even for pool
// drafts that carry no scheduledDate and therefore never count via
// auditLoadByPerson. Empty for a single suggestion.
export function suggestAuditor(
  audit: AuditLike,
  roster: Auditor[],
  audits: AuditLike[],
  year: number,
  extraLoad: Record<string, number> = {},
): Auditor | null {
  if (roster.length === 0) return null;

  const load = auditLoadByPerson(audits, year);
  for (const [name, n] of Object.entries(extraLoad)) {
    load[name] = (load[name] || 0) + n;
  }
  const wantRole = audit.category ? CATEGORY_ROLE[audit.category] : undefined;

  const roleMatched = wantRole
    ? roster.filter(a => a.role === wantRole)
    : [];
  const pool = roleMatched.length > 0 ? roleMatched : roster;

  return [...pool].sort((a, b) => {
    const la = load[a.name] || 0;
    const lb = load[b.name] || 0;
    if (la !== lb) return la - lb;
    return a.name.localeCompare(b.name);
  })[0];
}
