// ─── Item Thumbnail — picture with initials fallback ──────────────────────────
import React, { useState, useEffect } from 'react';
import { initialsFor } from '../commissaryUtils';

interface ItemThumbnailProps {
  name: string;
  url?: string;
  size?: number; // px; default 40
  className?: string;
}

export default function ItemThumbnail({ name, url, size = 40, className = '' }: ItemThumbnailProps) {
  const [errored, setErrored] = useState(false);

  // Reset the error state if the URL changes (e.g. after an edit).
  useEffect(() => setErrored(false), [url]);

  const dim = { width: size, height: size };
  const showImg = !!url && url.trim() !== '' && !errored;

  if (showImg) {
    return (
      <img
        src={url}
        alt={name}
        style={dim}
        onError={() => setErrored(true)}
        className={`rounded-md object-cover border border-border shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={dim}
      aria-label={name}
      className={`rounded-md bg-muted text-muted-foreground border border-border flex items-center justify-center font-semibold shrink-0 ${className}`}
    >
      <span style={{ fontSize: Math.round(size * 0.36) }}>{initialsFor(name)}</span>
    </div>
  );
}
