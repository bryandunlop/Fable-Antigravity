import { describe, it, expect } from 'vitest';
import { validateCrs, validateRii, makeSignature } from './signing';
import type { Personnel } from '../types';

const tech: Personnel = { oid: 't1', displayName: 'Tom Parker', role: 'MAINTENANCE', apCertificateNumber: 'AP123', riiAuthorized: false, riiAuthorizedAta: [], active: true };
const noCert: Personnel = { ...tech, oid: 't2', apCertificateNumber: undefined };
const inspector: Personnel = { oid: 'i1', displayName: 'Amanda Brooks', role: 'MAINTENANCE', apCertificateNumber: 'IA9', riiAuthorized: true, riiAuthorizedAta: ['27', '32'], active: true };

describe('signing gates', () => {
  it('CRS rejected without A&P cert', () => {
    expect(validateCrs(noCert).ok).toBe(false);
    expect(validateCrs(tech).ok).toBe(true);
  });
  it('RII rejects performer == inspector', () => {
    expect(validateRii('i1', inspector, '27').ok).toBe(false);
  });
  it('RII rejects inspector not authorized for ATA', () => {
    expect(validateRii('t1', inspector, '24').ok).toBe(false);
  });
  it('RII accepts authorized, distinct inspector', () => {
    expect(validateRii('t1', inspector, '27').ok).toBe(true);
  });
  it('makeSignature stamps amr/authTime/hash', () => {
    const s = makeSignature({ id: 's1', signedEntity: 'CRS', signedEntityId: 'r1', signer: tech, intentStatement: 'x', signedAtUtc: '2026-06-21T00:00:00Z', certNumber: 'AP123' });
    expect(s.amr.length).toBeGreaterThan(0);
    expect(s.mockContentHash).toMatch(/^[0-9a-f]{8}$/);
    expect(s.signerName).toBe('Tom Parker');
  });
});
