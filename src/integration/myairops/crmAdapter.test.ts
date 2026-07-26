import { describe, it, expect } from 'vitest';
import { mapCrmContactToSnapshot, type CrmContact } from './crmAdapter';

function contact(overrides: Partial<CrmContact> = {}): CrmContact {
  return {
    id: 502,
    fullName: 'Dana Whitfield',
    firstNames: 'Dana',
    lastName: 'Whitfield',
    primaryEmail: 'dana.whitfield@example.com',
    primaryTelephone: '+1 513 555 0142',
    isPassenger: true,
    lastModifiedDate: '2023-05-04T10:00:00.000Z',
    idDocuments: [
      {
        id: 9001,
        idDocumentType: { id: 1, name: 'Passport' },
        number: '541998210',
        expiryDate: '2027-01-15T00:00:00.000Z',
        isPreferred: true,
      },
    ],
    ...overrides,
  } as CrmContact;
}

describe('mapCrmContactToSnapshot', () => {
  it('maps identity, advisory freshness, and documents', () => {
    const s = mapCrmContactToSnapshot(contact());
    expect(s.crmContactId).toBe(502);
    expect(s.fullName).toBe('Dana Whitfield');
    expect(s.email).toBe('dana.whitfield@example.com');
    expect(s.isPassenger).toBe(true);
    expect(s.lastModifiedUtc).toBe('2023-05-04T10:00:00.000Z');
    expect(s.documents).toHaveLength(1);
    expect(s.documents[0]).toMatchObject({
      id: 9001, kind: 'Passport', expiresUtc: '2027-01-15T00:00:00.000Z', isPreferred: true,
    });
  });

  it('masks document numbers to a 3-char tail', () => {
    const s = mapCrmContactToSnapshot(contact());
    expect(s.documents[0].numberTail).toBe('…210');
    expect(s.documents[0].numberTail).not.toContain('541998');
  });

  it('accepts string ids (the vendor schema allows integer-or-string)', () => {
    const s = mapCrmContactToSnapshot(contact({ id: '502' as unknown as number }));
    expect(s.crmContactId).toBe(502);
  });

  it('treats a missing lastModifiedDate as unknown freshness, not fresh', () => {
    const s = mapCrmContactToSnapshot(contact({ lastModifiedDate: null }));
    expect(s.lastModifiedUtc).toBeNull();
  });

  it('rejects a contact with no usable id', () => {
    expect(() => mapCrmContactToSnapshot(contact({ id: null as unknown as number }))).toThrow(/invalid id/);
  });
});
