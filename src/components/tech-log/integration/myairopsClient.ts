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

// ── Webhook receiver simulator (CloudEvents 1.0 + HMAC verification) ──
export interface CloudEvent {
  id: string;
  type: string;
  specversion: '1.0';
  source: string;
  time: string;
  datacontenttype: 'application/json';
  data: Record<string, unknown>;
}
export interface WebhookEnvelope {
  event: CloudEvent;
  verification: { signatureValid: boolean; timestampWithinWindow: boolean; duplicate: boolean };
}

let _webhookSeq = 0;
const _seenWebhookIds = new Set<string>(); // CloudEvents-id idempotency (in-memory demo)

function webhookData(eventType: string, tail: string): Record<string, unknown> {
  const last = eventType.split('.').pop();
  if (last === 'techLogged') return { tailNumber: tail, movementId: `mv-${tail}-001`, status: 'techLogged' };
  if (last === 'actualBlockTimeUpdated') return { tailNumber: tail, blockTimeHours: 2.1 };
  if (last === 'landingsUpdated') return { tailNumber: tail, landings: 1 };
  if (last === 'created') {
    return eventType.includes('deferreddefect')
      ? { tailNumber: tail, ata: '21', note: 'informational — myGFO authoritative at signature' }
      : { tailNumber: tail, entryType: 'maintenanceentry', note: 'informational' };
  }
  return { tailNumber: tail };
}

/**
 * Simulate an inbound myairops webhook. Returns a CloudEvents 1.0 envelope plus the HMAC / replay-window /
 * idempotency verification outcome. PULL-ONLY: this models RECEIVING an event — myGFO never POSTs back.
 * opts.tamper → bad signature; opts.stale → outside replay window; opts.duplicateId → reuse a CloudEvents id.
 */
export function simulateWebhook(
  eventType: typeof MYAIROPS_EVENT_TYPES[number],
  opts?: { tailNumber?: string; tamper?: boolean; stale?: boolean; duplicateId?: string },
): WebhookEnvelope {
  const id = opts?.duplicateId ?? `ce-${++_webhookSeq}-${eventType.split('.').pop()}`;
  const tail = opts?.tailNumber ?? 'N504GA';
  const event: CloudEvent = {
    id, type: eventType, specversion: '1.0', source: '/myairops/movements',
    time: new Date().toISOString(), datacontenttype: 'application/json',
    data: webhookData(eventType, tail),
  };
  const duplicate = _seenWebhookIds.has(id);
  if (!duplicate) _seenWebhookIds.add(id);
  return { event, verification: { signatureValid: !opts?.tamper, timestampWithinWindow: !opts?.stale, duplicate } };
}

export const myairopsMeta = { eventTypes: MYAIROPS_EVENT_TYPES, pullOnly: true };
