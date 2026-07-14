import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Download, Flame } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { GfoPageHeader, GfoPanel, GfoEmptyState } from '../../gfo';
import { GFO_STATUS_CLASS } from '../../gfo/status';
import { downloadCSV } from '../../inventory-v2/shared/exportUtils';
import { getRoleLabelByValue } from '../../../lib/mockUsers';
import { useDocuments, identityFor } from '../DocumentsContext';
import { DOC_CLASSES, classFor } from '../classes';
import { currentRevision } from '../engine/revisions';
import {
  readersFor,
  complianceSummary,
  overdueChaseList,
  complianceCsvRows,
  COMPLIANCE_CSV_HEADERS,
} from '../engine/compliance';
import { documentsRoleUniverse } from '../roles';
import { DocIdentityLine } from '../components/DocIdentity';
import { ComplianceRoster } from '../components/ComplianceRoster';
import { operatorTodayIso } from '../../../lib/operatorDate';

/** Manager compliance view: per-doc roster + overdue chase list + auditor CSV.
 * Rendered as a hub tab and standalone at /safety/compliance. */
export function ComplianceDashboard({ standalone = false }: { standalone?: boolean }) {
  const { state } = useDocuments();
  const [expanded, setExpanded] = useState<string | null>(null);
  const todayIso = operatorTodayIso();
  const universe = useMemo(() => documentsRoleUniverse(), []);

  const rows = useMemo(() => {
    const out: {
      doc: (typeof state.docs)[number];
      rev: NonNullable<ReturnType<typeof currentRevision>>;
      summary: ReturnType<typeof complianceSummary>;
    }[] = [];
    for (const doc of state.docs) {
      if (doc.isArchived) continue;
      const rev = currentRevision(doc.id, state.revisions);
      if (!rev || !rev.requireAcknowledgment || rev.ackLevel === 'none') continue;
      const readers = readersFor(doc, universe);
      out.push({ doc, rev, summary: complianceSummary(rev, readers, state.acknowledgments, todayIso) });
    }
    // Least-compliant first; docs with no target readers (N/A) sort to the end.
    return out.sort((a, b) => {
      if (a.summary.applicable !== b.summary.applicable) return a.summary.applicable ? -1 : 1;
      return a.summary.pct - b.summary.pct;
    });
  }, [state.docs, state.revisions, state.acknowledgments, universe, todayIso]);

  const chase = useMemo(
    () => overdueChaseList(state.docs, state.revisions, state.acknowledgments, universe, todayIso),
    [state.docs, state.revisions, state.acknowledgments, universe, todayIso],
  );

  const exportCsv = () => {
    downloadCSV(
      `document-compliance-${todayIso}.csv`,
      COMPLIANCE_CSV_HEADERS,
      complianceCsvRows(
        state.docs,
        state.revisions,
        state.acknowledgments,
        universe,
        (classId) => DOC_CLASSES[classId]?.label ?? classId,
        (_userId, role) => identityFor(role).userName,
      ),
    );
  };

  const body = (
    <div className="space-y-6">
      {chase.length > 0 && (
        <GfoPanel title={`Overdue chase list (${chase.length})`}>
          <ul className="divide-y divide-border">
            {chase.map(({ doc, rev, reader, ackDueDate }) => (
              <li key={`${rev.id}:${reader.userId}:${reader.role}`} className="flex items-center gap-3 py-2 text-sm">
                <Flame className="h-4 w-4 shrink-0 text-gfo-sunrise" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{identityFor(reader.role).userName}</span>
                  <span className="text-muted-foreground"> ({getRoleLabelByValue(reader.role)}) owes </span>
                  <Link to={classFor(doc.classId).readerRoute === '/documents' ? `/documents/${doc.id}` : classFor(doc.classId).readerRoute} className="underline underline-offset-2">
                    {doc.id} rev {rev.revision}
                  </Link>
                </span>
                <Badge variant="outline" className={`${GFO_STATUS_CLASS.error} shrink-0 border px-1.5 text-[10px]`}>
                  due {ackDueDate}
                </Badge>
              </li>
            ))}
          </ul>
        </GfoPanel>
      )}

      {rows.length === 0 ? (
        <GfoEmptyState message="No published documents currently require acknowledgment." />
      ) : (
        <GfoPanel
          title="Read-and-acknowledge compliance"
          action={
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
          }
        >
          <ul className="divide-y divide-border">
            {rows.map(({ doc, rev, summary }) => {
              const isOpen = expanded === rev.id;
              return (
                <li key={rev.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <DocIdentityLine doc={doc} rev={rev} />
                      {rev.ackDueDate && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Ack due {rev.ackDueDate}</p>
                      )}
                    </div>
                    {summary.overdue && (
                      <Badge variant="outline" className={`${GFO_STATUS_CLASS.error} shrink-0 border px-1.5 text-[10px]`}>
                        Overdue
                      </Badge>
                    )}
                    <div className="w-40 shrink-0">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span>{summary.applicable ? `${summary.read}/${summary.total} read` : 'no target readers'}</span>
                        <span className="font-semibold">{summary.applicable ? `${summary.pct}%` : 'N/A'}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        {summary.applicable && (
                          <div
                            className={`h-full rounded-full ${summary.pct === 100 ? 'bg-gfo-success' : 'bg-gfo-daylight'}`}
                            style={{ width: `${summary.pct}%` }}
                          />
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : rev.id)} aria-label="Expand roster">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                  {isOpen && (
                    <div className="mt-3 rounded-md border border-border bg-muted/20 p-4">
                      <ComplianceRoster rev={rev} readers={readersFor(doc, universe)} acks={state.acknowledgments} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </GfoPanel>
      )}
    </div>
  );

  if (!standalone) return body;
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <GfoPageHeader
        eyebrow="Documents"
        title="Document Compliance"
        description="Who has read what — per-document rosters, the overdue chase list, and the auditor export."
        actions={
          <Button variant="outline" asChild>
            <Link to="/documents">Document Center</Link>
          </Button>
        }
      />
      {body}
    </div>
  );
}
