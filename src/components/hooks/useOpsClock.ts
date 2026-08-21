import { useEffect, useState } from 'react';

/** UTC alongside Eastern — the operator reference zone the MEL clock is anchored to (D24). */
export function useOpsClock(): string {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const utc = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  const eastern = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  });

  return `${utc}Z · ${eastern} ET`;
}
