// MOCK myairops connector. PULL-ONLY — myGFO never writes back to myairops (CLAUDE.md NEVER rule).
// Faithful to the documented surface (OData pull + CloudEvents webhooks + HMAC verification) but
// returns FAKED data. Dev wires real OData (v2/v4 TBC) + webhook receiver later.

export const MYAIROPS_EVENT_TYPES = [
  'com.myairops.flight.movement.techLogged',
  'com.myairops.flight.movement.actualBlockTimeUpdated',
  'com.myairops.flight.movement.landingsUpdated',
  'com.myairops.deferreddefect.created',
  'com.myairops.maintenanceentry.created',
] as const;

export interface MyairopsFlightPrefill {
  tailNumber: string;
  flightDateUtc: string;
  outUtc: string; offUtc: string; onUtc: string; inUtc: string;
  blockTimeHours: number; flightTimeHours: number; landings: number;
  picName: string; sicName: string; origin: string; destination: string;
}

/** OData pull (faked). Real: GET {ODataBaseUrl}/Movements?$filter=... with token auth (TBC). */
export function odataPullLatestFlight(tailNumber: string, dateUtc: string): MyairopsFlightPrefill {
  const day = dateUtc.slice(0, 10);
  return {
    tailNumber,
    flightDateUtc: dateUtc,
    outUtc: `${day}T13:10:00.000Z`,
    offUtc: `${day}T13:27:00.000Z`,
    onUtc: `${day}T15:02:00.000Z`,
    inUtc: `${day}T15:11:00.000Z`,
    blockTimeHours: 2.0,
    flightTimeHours: 1.6,
    landings: 1,
    picName: 'Capt. John Smith',
    sicName: 'FO Emily Chen',
    origin: 'KLUK',
    destination: 'KTEB',
  };
}

/** Documented webhook verification mechanics (stub — see research/04 / GAP_REGISTER #18). */
export function webhookVerificationSpec() {
  return {
    headerTimestamp: 'x-myairops-webhook-timestamp',
    headerSignature: 'x-myairops-webhook-signature',
    format: 'sha256=hex(HMAC-SHA256(rawBody, subscriptionSecret))',
    rawBytes: true, // HMAC over the RAW request bytes, not re-serialized JSON
    timingSafeCompare: true,
    replayWindowSeconds: 300,
    idempotencyKey: 'CloudEvents id (distinct from the client UUIDv7 idempotency key)',
  };
}

export const myairopsMeta = { eventTypes: MYAIROPS_EVENT_TYPES, pullOnly: true };
