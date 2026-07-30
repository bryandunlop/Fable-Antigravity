import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CircleCheck, Lightbulb, Link as LinkIcon, Signature } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { GfoEmptyState } from '../../gfo';
import { useCurrentUser } from '../../tech-log/TechLogContext';
import { useFir } from '../FirContext';
import { CATEGORY_LABEL } from '../components/chips';
import { StatusHoursBar } from '../../tech-log/components/StatusHoursBar';

/** The published FIR as all employees read it (§7, §9): roles only, no owner
 * controls, with an optional initials acknowledgement when the report requires it. */
export function PublishedFirReader() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useFir();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [initials, setInitials] = useState('');

  const fir = state.firs.find(f => f.id === id);
  const back = (
    <Link to="/fir/published" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Published reports
    </Link>
  );

  if (!fir || fir.status !== 'PUBLISHED' || !fir.publishedRevision) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {back}
        <GfoEmptyState message="This report isn’t published." icon={<BookOpen />} />
      </div>
    );
  }

  const rev = fir.publishedRevision;
  const myAck = (fir.publishedAcks ?? []).find(a => a.oid === user?.oid);
  const acknowledge = () => {
    if (!user || initials.trim().length < 2) return;
    dispatch({ type: 'ACKNOWLEDGE_PUBLISHED', payload: { firId: fir.id, oid: user.oid, initials, atUtc: new Date().toISOString() } });
    setInitials('');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      {back}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="gfo-eyebrow">Institutional knowledge · {fir.ref}</div>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="h-3.5 w-3.5" /> Published {new Date(rev.publishedAtUtc).toLocaleDateString()} · rev {rev.revision}
            </span>
          </div>
          <h1 className="mt-1.5 text-xl font-semibold leading-tight text-primary">{rev.summary}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">{CATEGORY_LABEL[fir.category]}</Badge>
            <Badge variant="secondary">roles only</Badge>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section>
            <h2 className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">What happened</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{rev.whatHappened}</p>
          </section>

          {rev.timeline.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Timeline</h2>
              <div className="border-l-2 border-border pl-3.5">
                {rev.timeline.map((t, i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <span className="text-xs tabular-nums text-muted-foreground">{new Date(t.atUtc).toLocaleString()}</span>
                    <div className="text-sm">{t.label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* D61 §5 / D63 — the stacked bar the VP chose to embed, rendered from the snapshot
              frozen at approval. It carries its own labels, so a later change to the tech-log
              state vocabulary cannot repaint a published record. */}
          {rev.includeImpactBar && rev.impactSnapshot && (
            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Where the hours went</h2>
              <StatusHoursBar segments={rev.impactSnapshot.segments} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rev.impactSnapshot.segments.filter(s => s.hours > 0).map(s => (
                  <Badge key={s.key} variant="outline">{s.label} {s.hours} h</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {rev.impactSnapshot.elapsedHours} h elapsed
                {rev.impactSnapshot.excludedGapHours > 0
                  ? `, of which ${rev.impactSnapshot.excludedGapHours} h was logged as time nobody was working and set aside`
                  : ''}
                . Figures as at publication, {new Date(rev.impactSnapshot.capturedAtUtc).toLocaleDateString()}.
              </p>
            </section>
          )}

          {rev.lessons.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Lessons</h2>
              {rev.lessons.map((l, i) => (
                <div key={i} className="mb-1.5 flex items-start gap-2 last:mb-0">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm leading-relaxed">{l}</span>
                </div>
              ))}
            </section>
          )}

          {fir.relatedSafetyItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fir.relatedSafetyItems.map(s => (
                <span key={s} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <LinkIcon className="h-3.5 w-3.5" /> Related safety item: {s} (link only)
                </span>
              ))}
            </div>
          )}
        </div>

        {rev.ackLevel === 'initials' && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 p-4">
            {myAck ? (
              <span className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="h-4 w-4" /> Acknowledged as {myAck.initials} on {new Date(myAck.atUtc).toLocaleDateString()}
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Signature className="h-4 w-4" /> This report asks you to acknowledge you’ve read it.
                </span>
                <div className="flex items-center gap-2">
                  <Input value={initials} onChange={e => setInitials(e.target.value)} maxLength={4} placeholder="Initials"
                    className="w-20 text-center uppercase" />
                  <Button size="sm" onClick={acknowledge} disabled={initials.trim().length < 2}>Acknowledge</Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Names are removed from published reports on purpose — accountability stays with leadership in the internal record.{' '}
        <button className="underline hover:text-foreground" onClick={() => navigate('/fir/published')}>Back to all reports</button>
      </p>
    </div>
  );
}
