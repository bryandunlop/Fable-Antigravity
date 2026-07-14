import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoEmptyState } from '../../gfo';
import { useDocuments } from '../DocumentsContext';
import { buildCoverage, coverageSummary } from '../engine/regCompliance';
import { type RegAuthority } from '../engine/regCatalog';

const AUTHORITIES: (RegAuthority | 'all')[] = ['all', 'FAR', 'MEL', 'OpSpec'];

/** Regulatory coverage matrix: each applicable requirement → the published
 * blocks that satisfy it, or a gap. Read-only over the ledger. */
export function ComplianceMatrix() {
  const { state } = useDocuments();
  const [authority, setAuthority] = useState<RegAuthority | 'all'>('all');

  const rows = useMemo(() => buildCoverage(state.docs, state.revisions), [state.docs, state.revisions]);
  const summary = coverageSummary(rows);
  const filtered = authority === 'all' ? rows : rows.filter((r) => r.req.authority === authority);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Requirements</p>
          <p className="text-2xl font-medium">{summary.total}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Covered</p>
          <p className="text-2xl font-medium text-emerald-600 dark:text-emerald-400">{summary.covered}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Gaps</p>
          <p className="text-2xl font-medium text-amber-700 dark:text-amber-400">{summary.gaps}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {AUTHORITIES.map((a) => (
          <Button key={a} size="sm" variant={authority === a ? 'secondary' : 'ghost'} onClick={() => setAuthority(a)}>
            {a === 'all' ? 'All' : a}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <GfoEmptyState message="No requirements for this authority." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map(({ req, by, covered }) => (
            <li key={req.id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[220px_1fr] sm:items-center">
              <div>
                <p className="text-sm font-medium">{req.ref}</p>
                <p className="text-xs text-muted-foreground">{req.authority} · {req.title}</p>
              </div>
              {covered ? (
                <div className="flex flex-wrap gap-1.5">
                  {by.map((site) => (
                    <Button key={site.blockId} asChild size="sm" variant="outline" className="h-7 gap-1 border-indigo-200 text-indigo-700 dark:border-indigo-900 dark:text-indigo-300">
                      <Link to={`/documents/${site.docId}`}>
                        <FileText className="h-3.5 w-3.5" />
                        {site.docId} {site.sectionNumber ? `§${site.sectionNumber} ` : ''}· {site.sectionTitle}
                      </Link>
                    </Button>
                  ))}
                </div>
              ) : (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" /> Gap — no coverage
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Coverage is derived from published revisions' block-level regulation links; changing a link rides the four-eyes revision.
      </p>
    </div>
  );
}
