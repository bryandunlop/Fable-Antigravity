import React from 'react';
import type { TripRecord } from '../../../scheduling/store/types';

export default function AircraftAcceptancePanel({ trip: _trip }: { trip: TripRecord }) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-semibold mb-2">Aircraft &amp; acceptance</h2>
      <p className="text-sm text-muted-foreground">Coming next.</p>
    </section>
  );
}
