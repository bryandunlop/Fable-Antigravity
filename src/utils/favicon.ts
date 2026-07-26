// Favicon + monogram helpers for the quick-links launcher tiles.
//
// faviconUrl is the single seam for where tile icons come from. Today it uses
// Google's public favicon service (best hit-rate, zero setup). For the P&G
// production build this should move to a self-hosted / bundled set: the service
// leaks the user's link list to a third party and needs connectivity, neither
// of which suits an offline hangar iPad. The monogram fallback already covers
// the offline case; swapping the source is a one-function change here.

const FAVICON_SERVICE = 'https://www.google.com/s2/favicons';

function host(rawUrl: string): string | null {
  try {
    const h = new URL(rawUrl).hostname;
    return h || null;
  } catch {
    return null;
  }
}

export function faviconUrl(rawUrl: string, size = 64): string | null {
  const h = host(rawUrl);
  if (!h) return null;
  return `${FAVICON_SERVICE}?domain=${h}&sz=${size}`;
}

export function hostLabel(rawUrl: string): string {
  const h = host(rawUrl);
  if (!h) return rawUrl.trim();
  return h.replace(/^www\./, '');
}

// Mirrors inventory's initialsFor; kept local so the launcher owns no
// cross-module coupling for a four-line helper.
export function linkInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
