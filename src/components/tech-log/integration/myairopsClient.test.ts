import { describe, it, expect } from 'vitest';
import { simulateWebhook, MYAIROPS_EVENT_TYPES } from './myairopsClient';

describe('simulateWebhook (CloudEvents 1.0 + HMAC verification)', () => {
  it('produces a valid CloudEvents 1.0 envelope for a normal event', () => {
    const env = simulateWebhook(MYAIROPS_EVENT_TYPES[0]);
    expect(env.event.specversion).toBe('1.0');
    expect(env.event.type).toBe(MYAIROPS_EVENT_TYPES[0]);
    expect(env.event.datacontenttype).toBe('application/json');
    expect(env.verification).toEqual({ signatureValid: true, timestampWithinWindow: true, duplicate: false });
  });

  it('flags a tampered payload as signature-invalid', () => {
    expect(simulateWebhook(MYAIROPS_EVENT_TYPES[0], { tamper: true }).verification.signatureValid).toBe(false);
  });

  it('flags a stale timestamp as outside the replay window', () => {
    expect(simulateWebhook(MYAIROPS_EVENT_TYPES[0], { stale: true }).verification.timestampWithinWindow).toBe(false);
  });

  it('detects a duplicate CloudEvents id (idempotency)', () => {
    const first = simulateWebhook(MYAIROPS_EVENT_TYPES[1]);
    expect(first.verification.duplicate).toBe(false);
    const dup = simulateWebhook(MYAIROPS_EVENT_TYPES[1], { duplicateId: first.event.id });
    expect(dup.verification.duplicate).toBe(true);
  });
});
