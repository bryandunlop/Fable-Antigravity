import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, CircleCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { GfoPageHeader, GfoEmptyState } from '../../gfo';
import { useFir } from '../FirContext';
import { CATEGORY_LABEL } from '../components/chips';

/** All-employees reading surface (§9): the curated, de-identified published reports.
 * Distinct from the internal /fir list, which is owner/leadership-scoped. */
export function PublishedFirList() {
  const { state } = useFir();
  const navigate = useNavigate();

  const published = useMemo(
    () =>
      state.firs
        .filter(f => f.status === 'PUBLISHED' && f.publishedRevision)
        .sort((a, b) => (b.publishedRevision!.publishedAtUtc).localeCompare(a.publishedRevision!.publishedAtUtc)),
    [state.firs],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Link to="/fir" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Irregularity Reports
      </Link>
      <GfoPageHeader
        eyebrow="Institutional knowledge"
        title="Published irregularity reports"
        description="What we learned from operational irregularities — de-identified, roles only, open to everyone."
      />

      {published.length === 0 ? (
        <GfoEmptyState message="No published reports yet." icon={<BookOpen />} />
      ) : (
        <div className="space-y-3">
          {published.map(f => {
            const rev = f.publishedRevision!;
            return (
              <Card key={f.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/fir/published/${f.id}`)}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{f.ref}</span>
                      <Badge variant="outline">{CATEGORY_LABEL[f.category]}</Badge>
                      {rev.ackLevel === 'initials' && <Badge variant="secondary">acknowledge</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-medium">{rev.summary}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <CircleCheck className="h-3.5 w-3.5" /> Published {new Date(rev.publishedAtUtc).toLocaleDateString()} · revision {rev.revision}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
