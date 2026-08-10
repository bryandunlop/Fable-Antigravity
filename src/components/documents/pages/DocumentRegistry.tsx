import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileLock2, FilePlus2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoEmptyState } from '../../gfo';
import { useDocuments } from '../DocumentsContext';
import { docReaderPath } from '../classes';
import { currentRevision, revisionsFor } from '../engine/revisions';
import { displayDigest, formatBytes, originOf, provenanceLabel } from '../engine/provenance';
import { OriginBadge } from '../components/OriginBadge';
import { IngestDialog } from '../components/IngestDialog';
import { formatDateOnly } from '../../../lib/operatorDate';

/**
 * "What documents are where" — every document myGFO did not author.
 *
 * The register is the control plane. For a held document it shows the digest
 * myGFO computed itself; for a pointer it shows where the file actually lives
 * and says plainly that it is not available offline.
 *
 * There is deliberately no ageing "last verified against SharePoint" chip. That
 * existed only while the design treated myGFO as a stale cache; once myGFO is
 * the system of record there is an effective date and a review cycle, and a
 * confident in-sync indicator with no mechanism behind it is worse than none.
 */
export function DocumentRegistry({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state } = useDocuments();
  const [ingesting, setIngesting] = useState(false);

  const rows = useMemo(() => {
    return state.docs
      .map((doc) => {
        // Fall back to the newest revision so a received document still in
        // four-eyes appears here rather than vanishing until it publishes.
        const rev = currentRevision(doc.id, state.revisions) ?? revisionsFor(doc.id, state.revisions)[0];
        return { doc, rev };
      })
      .filter(({ doc, rev }) => originOf(rev) !== 'authored' || !!doc.source)
      .sort((a, b) => a.doc.title.localeCompare(b.doc.title));
  }, [state.docs, state.revisions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Documents myGFO did not author. A document is held as bytes only when a signature
          depends on its content or it must be producible onboard; everything else is a link,
          resolved where it lives.
        </p>
        <Button size="sm" onClick={() => setIngesting(true)}>
          <FilePlus2 className="mr-1.5 h-4 w-4" /> Hold a received document
        </Button>
      </div>

      {rows.length === 0 ? (
        <GfoEmptyState message="No received or linked documents yet." icon={<FileLock2 />} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map(({ doc, rev }) => {
            const att = rev?.provenance?.attachment;
            const digest = rev ? displayDigest(rev) : undefined;
            return (
              <li key={doc.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={docReaderPath(doc.id)} className="font-medium hover:underline">{doc.title}</Link>
                  <span className="text-xs text-muted-foreground">{doc.id}</span>
                  <OriginBadge rev={rev} />
                  {rev && rev.status !== 'published' && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{rev.status}</span>
                  )}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">{provenanceLabel(doc, rev)}</p>

                <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                  {att && digest?.real && (
                    <>
                      <div>
                        <dt className="inline text-muted-foreground">Frozen file: </dt>
                        <dd className="inline">{att.filename} · {formatBytes(att.byteLength)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="inline text-muted-foreground">SHA-256 (myGFO): </dt>
                        <dd className="inline font-mono" title={digest.hex}>{digest.short}…</dd>
                      </div>
                    </>
                  )}
                  {rev?.provenance?.ingestedAtUtc && (
                    <div>
                      <dt className="inline text-muted-foreground">Frozen: </dt>
                      <dd className="inline">
                        {formatDateOnly(rev.provenance.ingestedAtUtc.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}
                        {rev.provenance.ingestedByName ? ` by ${rev.provenance.ingestedByName}` : ''}
                      </dd>
                    </div>
                  )}
                  {doc.source && (
                    <div className="min-w-0">
                      <dt className="inline text-muted-foreground">Source: </dt>
                      <dd className="inline">
                        {doc.source.webUrl ? (
                          <a href={doc.source.webUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                            {doc.source.label} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : doc.source.label}
                        {doc.source.lastConfirmedAtUtc && (
                          <span className="text-muted-foreground">
                            {' '}· link confirmed {formatDateOnly(doc.source.lastConfirmedAtUtc.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}
                            {doc.source.lastConfirmedByName ? ` by ${doc.source.lastConfirmedByName}` : ''}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <IngestDialog open={ingesting} onOpenChange={setIngesting} userRole={userRole} additionalRoles={additionalRoles} />
    </div>
  );
}
