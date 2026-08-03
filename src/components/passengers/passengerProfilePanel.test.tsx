import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PassengerProfilePanel from './PassengerProfilePanel';
import type { Passenger } from './passengerData';

const PAX: Passenger = {
  id: 'PAX999',
  name: 'Test Passenger',
  info: {},
  role: 'Guest',
  allergies: [{ allergen: 'Shellfish', severity: 'Critical', reaction: 'Anaphylaxis', medication: 'EpiPen' }],
  birthday: '',
  beverage: [],
  food: [],
  passengerComfort: {},
  additionalNotes: 'Prefers the forward cabin.',
  flightAttendantNotes: 'Do not offer the 2019 vintage again.',
};

describe('PassengerProfilePanel — flight-attendant notes gate', () => {
  it('shows cabin-crew notes when the host says the viewer is cabin crew', () => {
    render(<PassengerProfilePanel passenger={PAX} showFlightAttendantNotes />);
    expect(screen.getByText(/Do not offer the 2019 vintage again/)).toBeTruthy();
  });

  it('hides them when the host says otherwise — the Passenger Database gates these to the inflight role', () => {
    render(<PassengerProfilePanel passenger={PAX} showFlightAttendantNotes={false} />);
    expect(screen.queryByText(/Do not offer the 2019 vintage again/)).toBeNull();
    // The general notes are not privileged and must survive the gate.
    expect(screen.getByText(/Prefers the forward cabin/)).toBeTruthy();
  });

  it('still hides the whole Notes section when the only note was the gated one', () => {
    render(
      <PassengerProfilePanel
        passenger={{ ...PAX, additionalNotes: '' }}
        showFlightAttendantNotes={false}
      />,
    );
    expect(screen.queryByText('Notes')).toBeNull();
  });

  it('renders the allergy severity, reaction and medication — the detail an FA acts on', () => {
    render(<PassengerProfilePanel passenger={PAX} />);
    expect(screen.getByText('Shellfish')).toBeTruthy();
    expect(screen.getByText('Critical')).toBeTruthy();
    expect(screen.getByText(/Anaphylaxis/)).toBeTruthy();
    expect(screen.getByText(/EpiPen/)).toBeTruthy();
  });
});
