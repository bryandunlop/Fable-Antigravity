import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RECEIPT_TEMPLATE, MAX_LISTED_GAPS, QUOTED_FIELD_IDS,
  fillTokens, isQuotable, issueReceipt, issueReceiptOnce, manifestName,
  optionalGaps, receiptHero, renderReceipt, sectionTallies,
  type ReceiptFormTemplate, type ReceiptSubmission, type ReceiptTemplate,
} from './formReceiptEmail';

const FORM: ReceiptFormTemplate = {
  id: 'TPL-INTERNATIONAL-001',
  name: 'International Travel Form',
  version: 3,
  fields: [
    { id: 'firstName', label: 'First Name', required: true, section: 'Basic Information' },
    { id: 'middleName', label: 'Middle Name', required: true, section: 'Basic Information' },
    { id: 'lastName', label: 'Last Name', required: true, section: 'Basic Information' },
    { id: 'tNumber', label: 'T Number', required: true, section: 'Basic Information' },
    { id: 'companyEmail', label: 'Company Email', required: true, section: 'Basic Information' },
    { id: 'tripDate', label: 'Trip Date', required: true, section: 'Basic Information' },
    { id: 'dietaryRestrictions', label: 'Dietary Restrictions or Food Allergies', required: false, section: 'Basic Information' },
    { id: 'emergencyContactName', label: 'Emergency Contact - Full Name', required: true, section: 'Emergency Contact' },
    { id: 'emergencyContactPhone', label: 'Emergency Contact - Phone Number', required: true, section: 'Emergency Contact' },
    { id: 'emergencyContactLanguage', label: 'Emergency Contact Primary Language', required: false, section: 'Emergency Contact' },
    { id: 'canWalkUnassisted', label: 'Can you stand, walk, and get in and out of a chair without assistance?', required: true, section: 'Special Needs and Additional Support' },
    { id: 'otherSpecialNeeds', label: 'Do you have any other special needs of which we should be made aware?', required: false, section: 'Special Needs and Additional Support' },
    { id: 'placeOfBirth', label: 'Place of Birth (City, State, Country)', required: true, section: 'International Traveler Information' },
    { id: 'usAddress', label: 'Temporary or Permanent Address in U.S.', required: false, section: 'International Traveler Information' },
    { id: 'passportNumber', label: 'Passport Number', required: true, section: 'International Traveler Information' },
    { id: 'passportExpirationDate', label: 'Passport Expiration Date', required: true, section: 'International Traveler Information' },
    { id: 'visaNumber', label: 'Visa Number (if applicable)', required: false, section: 'International Traveler Information' },
    { id: 'visaExpirationDate', label: 'Visa Expiration Date', required: false, section: 'International Traveler Information' },
  ],
};

const RESPONSES = {
  firstName: 'Maria', middleName: 'Elena', lastName: 'Garcia',
  tNumber: 'T67890', companyEmail: 'maria.garcia@company.com', tripDate: '2026-10-14',
  emergencyContactName: 'Carlos Garcia', emergencyContactPhone: '+1 555 0134',
  canWalkUnassisted: 'Yes',
  placeOfBirth: 'Valencia, Spain', passportNumber: 'PA9931882', passportExpirationDate: '2031-04-02',
};

function submission(over: Partial<ReceiptSubmission> = {}): ReceiptSubmission {
  return {
    id: 'SUB-1042',
    passengerInfo: { name: 'Maria Garcia', email: 'maria.garcia@company.com' },
    responses: { ...RESPONSES },
    submittedAt: '2026-09-17T13:42:00.000Z',
    documentExpirations: [
      { fieldLabel: 'Passport Expiration Date', documentType: 'passport', expirationDate: '2031-04-02', daysUntilExpiration: 1658, isExpiringSoon: false, isExpired: false },
    ],
    ...over,
  };
}

const NOW = '2026-09-17T13:42:03.000Z';
const render = (s = submission(), f = FORM, t = DEFAULT_RECEIPT_TEMPLATE) => renderReceipt(s, f, t);
const allText = (s = submission(), f = FORM) => render(s, f).blocks.map((b) => b.text).join('\n');

describe('what a receipt is allowed to quote back', () => {
  // The reason this engine exists in the shape it does. These forms carry passport and visa
  // numbers, T numbers, place of birth, home address and disability answers; a confirmation
  // that echoed them would mirror the lot into an inbox nobody here controls.
  it('never repeats a sensitive answer, only the label it belongs to', () => {
    const text = `${render().subject}\n${allText()}`;
    for (const secret of ['PA9931882', 'T67890', 'Valencia, Spain', '+1 555 0134', 'Carlos Garcia']) {
      expect(text).not.toContain(secret);
    }
    // ...while still proving we hold them.
    expect(text).toContain('International Traveler Information');
    expect(text).toContain('Emergency Contact');
  });

  it('quotes the manifest name and the trip date, which are the two a passenger can only fix by reading them', () => {
    const text = allText();
    expect(text).toContain('Maria Elena Garcia');
    expect(text).toContain('October');
    expect(text).toContain('2026');
  });

  it('is an allowlist, so a field nobody has classified is confirmed by label only', () => {
    const withNewField: ReceiptFormTemplate = {
      ...FORM,
      fields: [...FORM.fields, { id: 'greenCardNumber', label: 'Green Card Number', required: false, section: 'International Traveler Information' }],
    };
    const s = submission({ responses: { ...RESPONSES, greenCardNumber: 'GC-44417' } });
    expect(isQuotable('greenCardNumber')).toBe(false);
    expect(allText(s, withNewField)).not.toContain('GC-44417');
  });

  it('keeps the allowlist to fields that identify nobody on their own', () => {
    expect([...QUOTED_FIELD_IDS].sort()).toEqual(['firstName', 'lastName', 'middleName', 'requestDate', 'tripDate']);
  });
});

describe('manifestName', () => {
  it('joins the three name parts', () => {
    expect(manifestName(RESPONSES)).toBe('Maria Elena Garcia');
  });

  it('drops NMN — the form asks for it, so reading it back invites a correction to a placeholder', () => {
    expect(manifestName({ firstName: 'John', middleName: 'NMN', lastName: 'Smith' })).toBe('John Smith');
    expect(manifestName({ firstName: 'John', middleName: 'nmn', lastName: 'Smith' })).toBe('John Smith');
  });

  it('survives a half-filled name without stray spaces', () => {
    expect(manifestName({ firstName: 'John' })).toBe('John');
    expect(manifestName({})).toBe('');
  });
});

describe('sectionTallies', () => {
  it('counts REQUIRED answers, per section, in template order', () => {
    const t = sectionTallies(FORM, RESPONSES);
    expect(t.map((x) => x.section)).toEqual([
      'Basic Information', 'Emergency Contact', 'Special Needs and Additional Support', 'International Traveler Information',
    ]);
    // Six required fields in the section, all six in. The one optional blank is not counted
    // against it — a complete form that reads "6 of 7" sends a passenger hunting for a
    // mistake they did not make.
    expect(t[0]).toMatchObject({ answered: 6, total: 6, missingRequired: [], optionalAnswered: 0 });
  });

  it('counts an answered optional field apart, so an all-optional section still reports', () => {
    const t = sectionTallies(FORM, { ...RESPONSES, dietaryRestrictions: 'No shellfish' });
    expect(t[0]).toMatchObject({ answered: 6, total: 6, optionalAnswered: 1 });
  });

  it('names a required field left blank rather than only counting it short', () => {
    const t = sectionTallies(FORM, { ...RESPONSES, emergencyContactPhone: '' });
    const emergency = t.find((x) => x.section === 'Emergency Contact')!;
    expect(emergency.missingRequired).toEqual(['Emergency Contact - Phone Number']);
  });

  it('tallies a field with no section rather than dropping it — a manager-added field lands there', () => {
    const f: ReceiptFormTemplate = { ...FORM, fields: [...FORM.fields, { id: 'extra', label: 'Anything else', required: true }] };
    const t = sectionTallies(f, RESPONSES);
    expect(t.at(-1)).toMatchObject({ section: 'Your answers', total: 1, answered: 0, missingRequired: ['Anything else'] });
  });

  it('treats whitespace as blank', () => {
    const t = sectionTallies(FORM, { ...RESPONSES, canWalkUnassisted: '   ' });
    const needs = t.find((x) => x.section === 'Special Needs and Additional Support')!;
    expect(needs.missingRequired).toHaveLength(1);
  });
});

describe('the section-by-section block', () => {
  it('says a complete section is complete, with no fraction to misread', () => {
    const lines = render().blocks.find((b) => b.id === 'checklist')!.lines!;
    expect(lines.map((l) => l.text)).toContain('Basic Information — everything we need.');
    expect(lines.every((l) => l.tone === 'ok')).toBe(true);
  });

  it('names what is missing instead of reporting a shortfall', () => {
    const s = submission({ responses: { ...RESPONSES, emergencyContactPhone: '' } });
    const line = render(s).blocks.find((b) => b.id === 'checklist')!.lines!
      .find((l) => l.text.startsWith('Emergency Contact'))!;
    expect(line.tone).toBe('warn');
    expect(line.text).toBe('Emergency Contact — still needed: Emergency Contact - Phone Number.');
  });

  it('stays silent about a section that is entirely optional and entirely blank', () => {
    const f: ReceiptFormTemplate = {
      ...FORM,
      fields: [...FORM.fields, { id: 'extra', label: 'Anything else', required: false, section: 'Extras' }],
    };
    expect(render(submission(), f).blocks.find((b) => b.id === 'checklist')!.text).not.toContain('Extras');
  });

  it('reports an all-optional section that someone did fill in', () => {
    const f: ReceiptFormTemplate = {
      ...FORM,
      fields: [...FORM.fields, { id: 'extra', label: 'Anything else', required: false, section: 'Extras' }],
    };
    const s = submission({ responses: { ...RESPONSES, extra: 'I get airsick' } });
    expect(render(s, f).blocks.find((b) => b.id === 'checklist')!.text).toContain('Extras — received.');
  });
});

describe('the check block', () => {
  it('carries the manifest name and the travel date', () => {
    const lines = render().blocks.find((b) => b.id === 'check')!.lines!;
    expect(lines[0].text).toContain('Maria Elena Garcia');
    expect(lines[1].text).toContain('October 14, 2026');
  });

  it('does not repeat what the headline already said', () => {
    // The form, the time it landed and the reference are in the hero. Saying them again below
    // is the block filling space.
    const block = render().blocks.find((b) => b.id === 'check')!;
    expect(block.text).not.toContain('SUB-1042');
    expect(block.text).not.toContain('received');
  });

  it('is dropped when there is no name and no date to check', () => {
    const s = submission({ responses: { companyEmail: 'x@y.com' } });
    expect(render(s).blocks.some((b) => b.id === 'check')).toBe(false);
  });
});

describe('the headline', () => {
  it('says there is nothing to do when the form is complete and the documents are good', () => {
    const hero = receiptHero(submission(), FORM);
    expect(hero.headline).toBe('We have everything. Nothing more to do.');
    expect(hero.needsAction).toBe(false);
    expect(hero.reference).toBe('SUB-1042');
    expect(hero.received).toContain('International Travel Form');
    expect(hero.received).toContain('ET');
  });

  it('turns into a request when a required answer is missing', () => {
    const hero = receiptHero(submission({ responses: { ...RESPONSES, placeOfBirth: '' } }), FORM);
    expect(hero.headline).toBe('We have your form — one thing still needs you.');
    expect(hero.needsAction).toBe(true);
  });

  it('counts a document we cannot fly on alongside the blanks', () => {
    const s = submission({
      responses: { ...RESPONSES, placeOfBirth: '' },
      documentExpirations: [
        { fieldLabel: 'Passport Expiration Date', documentType: 'passport', expirationDate: '2026-01-04', daysUntilExpiration: -256, isExpiringSoon: false, isExpired: true },
      ],
    });
    expect(receiptHero(s, FORM).headline).toBe('We have your form — 2 things still need you.');
  });
});

describe('the documents block', () => {
  it('gives the expiry and the type, never the number', () => {
    const lines = render().blocks.find((b) => b.id === 'documents')!.lines!;
    expect(lines[0].text).toContain('Passport Expiration Date');
    expect(lines[0].text).toContain('April');
    expect(lines[0].text).toContain('2031');
    expect(lines[0].tone).toBe('ok');
  });

  it('formats a date-only expiry without the zone shift that renders 2 April as 1 April', () => {
    // LG-117: `new Date('2031-04-02')` is UTC midnight, so a naive toLocaleDateString drops a
    // day west of Greenwich. A passport that expires a day earlier than it does is exactly the
    // kind of thing a receipt is meant to let someone catch.
    const lines = render().blocks.find((b) => b.id === 'documents')!.lines!;
    expect(lines[0].text).toContain('April 2, 2031');
  });

  it('warns on an expired document and says what it blocks', () => {
    const s = submission({
      documentExpirations: [
        { fieldLabel: 'Passport Expiration Date', documentType: 'passport', expirationDate: '2026-01-04', daysUntilExpiration: -256, isExpiringSoon: false, isExpired: true },
      ],
    });
    const line = render(s).blocks.find((b) => b.id === 'documents')!.lines![0];
    expect(line.tone).toBe('warn');
    expect(line.text).toContain('expired');
    expect(line.text).toContain('manifest');
  });

  it('warns on one expiring soon, with the days left', () => {
    const s = submission({
      documentExpirations: [
        { fieldLabel: 'Visa Expiration Date', documentType: 'visa', expirationDate: '2026-09-29', daysUntilExpiration: 12, isExpiringSoon: true, isExpired: false },
      ],
    });
    const line = render(s).blocks.find((b) => b.id === 'documents')!.lines![0];
    expect(line.tone).toBe('warn');
    expect(line.text).toContain('12 days');
  });

  it('lists what was uploaded by name', () => {
    const s = submission({ uploadedDocuments: [{ documentName: 'Passport scan', fileName: 'passport.pdf' }] });
    expect(render(s).blocks.find((b) => b.id === 'documents')!.text).toContain('Passport scan');
  });
});

describe('the gaps block', () => {
  it('lists the optional blanks by label', () => {
    expect(optionalGaps(FORM, RESPONSES)).toEqual([
      'Dietary Restrictions or Food Allergies',
      'Emergency Contact Primary Language',
      'Do you have any other special needs of which we should be made aware?',
      'Temporary or Permanent Address in U.S.',
      'Visa Number (if applicable)',
      'Visa Expiration Date',
    ]);
  });

  it('caps the list and counts the rest, so a long form does not read as a demand', () => {
    const lines = render().blocks.find((b) => b.id === 'gaps')!.lines!;
    const listed = lines.filter((l) => !l.text.startsWith('and '));
    expect(listed).toHaveLength(MAX_LISTED_GAPS);
    expect(lines.some((l) => l.text === 'and 2 others.')).toBe(true);
  });

  it('keeps the reassurance out of the list — bulleted, it reads as one more thing to do', () => {
    const block = render().blocks.find((b) => b.id === 'gaps')!;
    expect(block.note).toBe('None of these hold anything up. Send them to scheduling if they apply to you.');
    expect(block.lines!.some((l) => l.text.startsWith('None of these'))).toBe(false);
    // ...but the plain-text form still carries it.
    expect(block.text).toContain('None of these hold anything up.');
  });

  it('is dropped entirely when nothing optional is blank — a heading over a blank is how a receipt starts looking automated', () => {
    const full = Object.fromEntries(FORM.fields.map((f) => [f.id, f.id.includes('Date') ? '2026-10-14' : 'x']));
    expect(render(submission({ responses: full })).blocks.some((b) => b.id === 'gaps')).toBe(false);
  });
});

describe('the template half', () => {
  it('renders the editable blocks from their body, and marks which half each block came from', () => {
    const blocks = render().blocks;
    expect(blocks.find((b) => b.id === 'next')!.source).toBe('template');
    expect(blocks.find((b) => b.id === 'checklist')!.source).toBe('auto');
    expect(blocks.find((b) => b.id === 'privacy')!.text).toContain('two years');
  });

  it('omits a block scheduling switched off', () => {
    const t: ReceiptTemplate = {
      ...DEFAULT_RECEIPT_TEMPLATE,
      blocks: DEFAULT_RECEIPT_TEMPLATE.blocks.map((b) => (b.id === 'privacy' ? { ...b, enabled: false } : b)),
    };
    expect(render(submission(), FORM, t).blocks.some((b) => b.id === 'privacy')).toBe(false);
  });

  it('ignores the body of an auto block, as the briefing email does', () => {
    const t: ReceiptTemplate = {
      ...DEFAULT_RECEIPT_TEMPLATE,
      blocks: DEFAULT_RECEIPT_TEMPLATE.blocks.map((b) => (b.id === 'checklist' ? { ...b, body: 'SHOULD NOT APPEAR' } : b)),
    };
    expect(render(submission(), FORM, t).blocks.find((b) => b.id === 'checklist')!.text).not.toContain('SHOULD NOT APPEAR');
  });

  it('fills the subject tokens', () => {
    expect(render().subject).toBe('We have your International Travel Form, Maria');
  });
});

describe('fillTokens', () => {
  it('tidies the comma an empty token leaves behind', () => {
    expect(fillTokens('We have your {{formName}}, {{firstName}}', { formName: 'travel form', firstName: '' }))
      .toBe('We have your travel form');
  });

  it('leaves an unknown token as nothing rather than printing the braces', () => {
    expect(fillTokens('Hello {{nobody}} there', {})).toBe('Hello there');
  });
});

describe('issuing', () => {
  it('sends to the address on the form', () => {
    const r = issueReceipt(submission(), FORM, DEFAULT_RECEIPT_TEMPLATE, NOW);
    expect(r.email.to).toBe('maria.garcia@company.com');
    expect(r.sentAtUtc).toBe(NOW);
    expect(r.blockedReason).toBeNull();
  });

  it('composes but does not claim to send when we hold no address', () => {
    // The submitter is not always the passenger — a scheduler entering a form on someone's
    // behalf may have no address for them. A receipt marked sent that never went is worse
    // than one that says plainly it could not go.
    const r = issueReceipt(submission({ passengerInfo: { name: 'Maria Garcia', email: '  ' } }), FORM, DEFAULT_RECEIPT_TEMPLATE, NOW);
    expect(r.email.to).toBeNull();
    expect(r.sentAtUtc).toBeNull();
    expect(r.blockedReason).toBe('no-address');
    expect(r.email.blocks.length).toBeGreaterThan(0);
  });

  it('still issues one when the form template has gone, with the reference intact', () => {
    const r = issueReceipt(submission(), undefined, DEFAULT_RECEIPT_TEMPLATE, NOW);
    expect(r.email.hero.reference).toBe('SUB-1042');
    expect(r.email.blocks.some((b) => b.id === 'checklist')).toBe(false);
    expect(r.email.blocks.some((b) => b.id === 'next')).toBe(true);
  });

  it('records the form version it was rendered against', () => {
    expect(issueReceipt(submission(), FORM, DEFAULT_RECEIPT_TEMPLATE, NOW).email.formVersion).toBe(3);
  });

  it('issues once and only once — the receipt is the record of what the passenger was told', () => {
    const first = issueReceiptOnce(undefined, submission(), FORM, DEFAULT_RECEIPT_TEMPLATE, NOW);
    const later: ReceiptTemplate = { ...DEFAULT_RECEIPT_TEMPLATE, subject: 'Rewritten subject' };
    const again = issueReceiptOnce(first, submission(), FORM, later, '2026-09-18T09:00:00.000Z');
    expect(again).toBe(first);
    expect(again.email.subject).toBe('We have your International Travel Form, Maria');
    expect(again.issuedAtUtc).toBe(NOW);
  });

  it('freezes the words, so editing the template changes the next passenger and not this one', () => {
    const issued = issueReceipt(submission(), FORM, DEFAULT_RECEIPT_TEMPLATE, NOW);
    const edited: ReceiptTemplate = {
      ...DEFAULT_RECEIPT_TEMPLATE,
      blocks: DEFAULT_RECEIPT_TEMPLATE.blocks.map((b) => (b.id === 'next' ? { ...b, body: 'Now we take three weeks.' } : b)),
    };
    const next = issueReceipt(submission({ id: 'SUB-1043' }), FORM, edited, NOW);
    expect(next.email.blocks.find((b) => b.id === 'next')!.text).toBe('Now we take three weeks.');
    expect(issued.email.blocks.find((b) => b.id === 'next')!.text).toContain('one business day');
  });
});
