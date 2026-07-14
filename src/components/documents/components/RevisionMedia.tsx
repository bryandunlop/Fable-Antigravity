import type { DocRevision } from '../types';
import { ExternalLink, Film } from 'lucide-react';

type MediaCarrier = Pick<DocRevision, 'images' | 'videos' | 'links'>;

export function hasRevisionMedia(rev: MediaCarrier): boolean {
  return !!(rev.images?.length || rev.videos?.length || rev.links?.length);
}

/** Renders revision-level media (images / videos / links) carried over from a migrated
 * legacy bulletin. The block-based body renderer ignores these sidecar fields, so without
 * this a migrated bulletin silently loses its media on the /documents surface (C13). */
export function RevisionMedia({ rev }: { rev: MediaCarrier }) {
  if (!hasRevisionMedia(rev)) return null;
  return (
    <div className="mt-6 space-y-4 border-t border-border pt-4">
      {!!rev.images?.length && (
        <div className="space-y-3">
          {rev.images.map((img, i) => (
            <figure key={i} className="space-y-1">
              <img src={img.url} alt={img.caption ?? ''} className="max-w-full rounded-md border border-border" />
              {img.caption && <figcaption className="text-xs text-muted-foreground">{img.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      {!!rev.videos?.length && (
        <ul className="space-y-1">
          {rev.videos.map((v, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <Film className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                {v.title ?? v.url}
              </a>
              {v.platform && v.platform !== 'other' && (
                <span className="text-xs text-muted-foreground">({v.platform})</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {!!rev.links?.length && (
        <ul className="space-y-1">
          {rev.links.map((l, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                {l.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
