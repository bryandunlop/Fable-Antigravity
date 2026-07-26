// Passenger data-currency policy (LG-21). The 2-year window is Bryan's stated
// operating policy; configurable here, pending formal ratification. The real
// currency signal will be myGFO's own "passenger confirmed" timestamp once the
// outreach loop exists — until then the CRM record-modified date is an ADVISORY
// proxy (it moves when anyone edits the record for any reason).

export const STALE_AFTER_DAYS = 730;

export const STALE_AFTER_MS = STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
