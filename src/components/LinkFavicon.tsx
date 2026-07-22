// ─── Link favicon — site icon with monogram fallback ─────────────────────────
// Mirrors ItemThumbnail: show the site favicon, fall back to a lettered tile
// when it errors or when offline (see src/utils/favicon.ts for the source seam).
import React, { useState, useEffect } from 'react';
import { faviconUrl, linkInitials } from '../utils/favicon';

interface LinkFaviconProps {
  name: string;
  url: string;
  size?: number; // px; default 40
  className?: string;
}

export default function LinkFavicon({ name, url, size = 40, className = '' }: LinkFaviconProps) {
  const [errored, setErrored] = useState(false);

  // Reset the error state if the URL changes (e.g. after an edit).
  useEffect(() => setErrored(false), [url]);

  const src = faviconUrl(url, size * 2); // 2x for retina
  const dim = { width: size, height: size };

  if (src && !errored) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={dim}
        onError={() => setErrored(true)}
        className={`rounded-lg object-contain bg-background border border-border shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={dim}
      aria-hidden="true"
      className={`rounded-lg bg-primary/10 text-primary border border-border flex items-center justify-center font-semibold shrink-0 ${className}`}
    >
      <span style={{ fontSize: Math.round(size * 0.4) }}>{linkInitials(name)}</span>
    </div>
  );
}
