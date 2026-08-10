import { useEffect, useState } from 'react';
import { Download, FileLock2, WifiOff } from 'lucide-react';
import { Button } from '../../ui/button';
import type { Doc, DocRevision } from '../types';
import { displayDigest, formatBytes, provenanceLabel } from '../engine/provenance';
import { idbBlobStore } from '../store/blobStore';

/**
 * A received document: myGFO's frozen copy of bytes it did not author.
 *
 * Rendered with a plain <object> embed rather than an inline PDF renderer.
 * `react-pdf` is already a dependency and unused, but wiring its pdf.js worker
 * through Vite is a separate piece of work — and the browser's own viewer is
 * what a maintainer already trusts. Download always works as the fallback.
 */
export function ReceivedRevisionView({ doc, rev }: { doc: Doc; rev: DocRevision }) {
  const att = rev.provenance?.attachment;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!att) return;
    let url: string | null = null;
    let cancelled = false;
    void idbBlobStore.get(att.blobKey).then((stored) => {
      if (cancelled) return;
      if (!stored) { setMissing(true); return; }
      url = URL.createObjectURL(new Blob([stored.bytes], { type: stored.mimeType }));
      setObjectUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [att?.blobKey, att]);

  if (!att) return null;
  const digest = displayDigest(rev);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
        <p className="flex items-center gap-1.5 text-sm font-medium text-indigo-900 dark:text-indigo-200">
          <FileLock2 className="h-4 w-4" /> {att.filename} · {formatBytes(att.byteLength)}
        </p>
        <p className="mt-1 text-xs text-indigo-900/80 dark:text-indigo-200/80">
          {provenanceLabel(doc, rev)}
        </p>
        <p className="mt-1 font-mono text-[11px] text-indigo-900/70 dark:text-indigo-200/70" title={digest.hex}>
          SHA-256 computed by myGFO: {digest.short}…
        </p>
      </div>

      {missing ? (
        // Honest failure. The frozen record still exists; only this device's
        // cached copy is gone, and saying so beats an empty frame.
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4 shrink-0" />
          This device no longer holds the cached file. Reconnect to fetch it again — the
          revision and its digest are unchanged.
        </div>
      ) : objectUrl ? (
        <>
          <object data={objectUrl} type={att.mimeType} className="h-[70vh] w-full rounded-md border border-border">
            <p className="p-4 text-sm text-muted-foreground">
              This browser cannot display {att.mimeType} inline — download the original below.
            </p>
          </object>
          <Button size="sm" variant="outline" asChild>
            <a href={objectUrl} download={att.filename}>
              <Download className="mr-1.5 h-4 w-4" /> Download the original
            </a>
          </Button>
        </>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">Opening the frozen copy…</p>
      )}
    </div>
  );
}
