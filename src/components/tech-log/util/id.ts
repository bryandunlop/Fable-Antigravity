// Client-side id generator for demo records (UUIDv7-style ordering not needed for the mock).
export function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.floor(performance.now() * 1000).toString(36);
  return `${prefix}-${rand}`;
}
