import React from 'react';
import type { TripRecord } from '../../../scheduling/store/types';

export default function PreflightLegsPanel({ trip: _trip, userRole: _userRole }: { trip: TripRecord; userRole: string }) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-semibold mb-2">Preflight</h2>
      <p className="text-sm text-muted-foreground">Coming next.</p>
    </section>
  );
}
