/**
 * RAG airworthiness colours — the single GREEN/AMBER/RED vocabulary for the ops
 * wall's fleet surfaces. Kept in one place so the rail and the map can't drift.
 *
 * This is the airworthiness axis only. Weather flight-category and NAS severity
 * deliberately do NOT reuse these, so a colour never means two things at once.
 */
export const RAG_DOT: Record<string, string> = {
  GREEN: 'var(--gfo-success, #00B140)',
  AMBER: 'var(--gfo-warning, #F1B434)',
  RED: 'var(--gfo-error, #EF3340)',
};
