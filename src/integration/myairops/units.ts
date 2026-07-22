// Unit boundary for myairops values (working-agreement invariant: convert at the
// system boundary, never inland). Booking-API leg durations are INTEGER MINUTES
// (blockTime/flyingTime/missionTime); myGFO stores hours. There is deliberately
// no hoursToMinutes here — myGFO never writes to myairops (pull-only).

export function minutesToHours(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error(`minutesToHours: invalid minutes '${minutes}'`);
  }
  return minutes / 60;
}
