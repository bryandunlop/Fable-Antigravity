// The automatic half. The engine's own tests cover what a receipt SAYS; these cover that one
// is issued at all, without anybody pressing send — which is the whole point of it.
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PassengerFormProvider, usePassengerForms, type FormSubmission } from '../contexts/PassengerFormContext';

function Probe({ email, onStored }: { email: string; onStored: (s: FormSubmission) => void }) {
  const { addSubmission, templates } = usePassengerForms();
  const template = templates.find((t) => t.type === 'domestic')!;
  return (
    <button
      onClick={() =>
        onStored(
          addSubmission({
            templateId: template.id,
            templateVersion: template.version,
            formType: 'domestic',
            passengerInfo: { name: 'Ada Byron', email },
            responses: { firstName: 'Ada', middleName: 'NMN', lastName: 'Byron', tripDate: '2026-10-14', companyEmail: email },
            submittedAt: '2026-09-17T13:42:00.000Z',
            submittedVia: 'public-link',
            status: 'new',
          }),
        )
      }
    >
      file it
    </button>
  );
}

async function file(email: string): Promise<FormSubmission> {
  let stored: FormSubmission | null = null;
  render(
    <PassengerFormProvider>
      <Probe email={email} onStored={(s) => { stored = s; }} />
    </PassengerFormProvider>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'file it' }));
  return stored!;
}

describe('a form that comes back issues its own receipt', () => {
  beforeEach(() => { try { localStorage.clear(); } catch { /* ignore */ } });

  it('attaches one to the stored submission, with nobody pressing send', async () => {
    const stored = await file('ada@company.com');
    expect(stored.receipt).toBeTruthy();
    expect(stored.receipt!.email.to).toBe('ada@company.com');
    expect(stored.receipt!.sentAtUtc).not.toBeNull();
    expect(stored.receipt!.email.hero.reference).toBe(stored.id);
  });

  it('marks it unsent rather than sent when the form carried no address', async () => {
    const stored = await file('  ');
    expect(stored.receipt!.sentAtUtc).toBeNull();
    expect(stored.receipt!.blockedReason).toBe('no-address');
    // Still composed — the record of what we would have said is worth keeping.
    expect(stored.receipt!.email.blocks.length).toBeGreaterThan(0);
  });

  it('reads the name back the way it will appear, placeholder and all removed', async () => {
    const stored = await file('ada@company.com');
    const text = stored.receipt!.email.blocks.map((b) => b.text).join('\n');
    expect(text).not.toContain('NMN');
    expect(text).toContain('Ada Byron');
  });
});
