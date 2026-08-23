import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { GfoEmptyState } from '../../gfo';
import { useDocuments } from '../DocumentsContext';
import { classFor, docReaderPath } from '../classes';
import { isTargetRole } from '../engine/acknowledgments';
import { searchDocuments, type SearchHit } from '../engine/search';

/**
 * Library-wide search (Phase 3 of the document-centre plan).
 *
 * The hub's own box filters the document LIST by title and tags — a different
 * job, kept as it was. This searches inside the content, which is the thing
 * nobody could do: "where does it say that?"
 *
 * Scope filters are post-hoc, not an up-front picker. People search broadly and
 * narrow after seeing results; making them choose a class first asks a question
 * they cannot answer yet.
 */
export function SearchPanel({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state } = useDocuments();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Search must not become a way to read documents your role cannot open.
  const roles = [userRole, ...additionalRoles];
  const visible = useMemo(
    () => state.docs.filter((d) => roles.some((r) => isTargetRole(d, r))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.docs, userRole, additionalRoles.join(',')],
  );

  const result = useMemo(
    () => searchDocuments(query, visible, state.revisions, state.amendmentResolutions ?? []),
    [query, visible, state.revisions, state.amendmentResolutions],
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of result.hits) m.set(h.classId, (m.get(h.classId) ?? 0) + 1);
    return m;
  }, [result.hits]);

  const shown = classFilter === 'all' ? result.hits : result.hits.filter((h) => h.classId === classFilter);
  const widened = [...result.expandedFrom.entries()];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-border px-3 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every document…"
          aria-label="Search document content"
          className="h-11 border-0 px-0 text-base shadow-none focus-visible:ring-0"
        />
      </div>

      {query.trim().length < 2 ? (
        <p className="pt-2 text-sm text-muted-foreground">
          Searches the words inside every current document — manuals, SOPs, bulletins, tribal and
          cabin knowledge. Superseded revisions are never returned, and an amended section is
          searched as it now reads.
        </p>
      ) : result.hits.length === 0 ? (
        <GfoEmptyState message={`Nothing in the library matches “${query.trim()}”.`} icon={<Search />} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {result.hits.length} {result.hits.length === 1 ? 'result' : 'results'} in {result.docCount}{' '}
              {result.docCount === 1 ? 'document' : 'documents'}
            </span>
            <span className="h-3 w-px bg-border" aria-hidden="true" />
            <Button
              size="sm"
              variant={classFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setClassFilter('all')}
            >
              All {result.hits.length}
            </Button>
            {[...counts.entries()].map(([id, n]) => (
              <Button
                key={id}
                size="sm"
                variant={classFilter === id ? 'default' : 'outline'}
                onClick={() => setClassFilter(id)}
              >
                {classFor(id).labelPlural} {n}
              </Button>
            ))}
          </div>

          {widened.length > 0 && (
            <p className="rounded-md border border-accent/40 bg-secondary px-3 py-2 text-xs leading-relaxed text-primary">
              Also matched{' '}
              {widened.map(([typed, also], i) => (
                <span key={typed}>
                  {i > 0 && '; '}
                  <strong>{typed}</strong> → <em>{also.join(', ')}</em>
                </span>
              ))}
              .
            </p>
          )}

          <ul>
            {shown.map((hit) => (
              <Hit key={`${hit.docId}:${hit.sectionId}`} hit={hit} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Hit({ hit }: { hit: SearchHit }) {
  return (
    <li className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="px-1.5 text-[10px] text-muted-foreground">
          {classFor(hit.classId).label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {hit.docTitle} · rev {hit.revisionLabel}
        </span>
        {hit.amendedBy && (
          <Badge variant="outline" className="border-accent/50 px-1.5 text-[10px] text-accent">
            Amended
          </Badge>
        )}
      </div>
      <Link
        to={docReaderPath(hit.docId)}
        className="mt-1.5 block text-[15px] font-semibold text-primary hover:underline"
      >
        {hit.sectionLabel}
      </Link>
      <p className="mt-1 text-sm leading-relaxed">
        {hit.snippet.map((run, i) =>
          run.match ? (
            <mark key={i} className="rounded-sm bg-chart-3/25 px-0.5 text-foreground">
              {run.text}
            </mark>
          ) : (
            <span key={i}>{run.text}</span>
          ),
        )}
      </p>
      {hit.amendedBy && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          This section is amended by {hit.amendedBy} — the snippet shows the wording that governs.
        </p>
      )}
    </li>
  );
}
