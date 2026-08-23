import { useMemo } from 'react';
import { toast } from 'sonner';
import { FileText, Printer } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { GfoPanel } from '../../gfo';
import type { Doc } from '../types';
import { useDocuments } from '../DocumentsContext';
import { classFor } from '../classes';
import { documentsRoleUniverse } from '../roles';
import { buildEffectivePages } from '../engine/effectivePages';
import { printEffectivePages } from '../util/printEffectivePages';
import { formatDateOnly } from '../../../lib/operatorDate';

/**
 * Status of contents — one page that answers "is this document current?"
 *
 * Sections, not pages. A List of Effective Pages exists because paper cannot be
 * asked what it says; ours can. Pages are a rendering artefact that moves with
 * paper size and font, while the section is the thing that actually carries a
 * revision — so this stays true however it is printed.
 */
export function EffectivePagesPanel({ doc }: { doc: Doc }) {
  const { state } = useDocuments();

  const report = useMemo(
    () =>
      buildEffectivePages(
        doc,
        classFor(doc.classId).label,
        state.revisions,
        state.amendmentResolutions ?? [],
        state.acknowledgments,
        documentsRoleUniverse().map((r) => r.role),
      ),
    [doc, state.revisions, state.amendmentResolutions, state.acknowledgments],
  );

  if (!report) return null;
  const d = (iso: string) => formatDateOnly(iso, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <GfoPanel
      title="Status of contents"
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!printEffectivePages(report)) toast.error('Allow pop-ups to print the status of contents.');
          }}
        >
          <Printer className="h-4 w-4" /> Print
        </Button>
      }
    >
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border pb-3 text-xs">
        <span>
          <strong className="text-sm">{report.sectionCount}</strong> sections
        </span>
        <span className="text-muted-foreground">
          <strong className="text-sm">{report.sectionCount - report.amendedCount}</strong> current at rev{' '}
          {report.revisionLabel}
        </span>
        {report.amendedCount > 0 && (
          <span className="text-accent">
            <strong className="text-sm">{report.amendedCount}</strong> amended by bulletin
          </span>
        )}
        {report.checksum && (
          <span className="text-muted-foreground">
            Digest <span className="font-mono text-[11px]">{report.checksum.slice(0, 8)}…</span>
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="w-[12%] py-2 pr-3 font-semibold">§</th>
              <th className="w-[44%] py-2 pr-3 font-semibold">Section</th>
              <th className="w-[12%] py-2 pr-3 font-semibold">Revision</th>
              <th className="w-[16%] py-2 pr-3 font-semibold">Effective</th>
              <th className="w-[16%] py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.sectionId} className="border-b border-border last:border-b-0">
                <td className="py-2 pr-3 text-sm tabular-nums text-muted-foreground">{row.number || '—'}</td>
                <td className="py-2 pr-3 text-sm">{row.title}</td>
                <td className="py-2 pr-3 text-sm tabular-nums">{row.revisionLabel}</td>
                <td className="py-2 pr-3 text-sm tabular-nums text-muted-foreground">{d(row.effectiveDate)}</td>
                <td className="py-2 text-sm">
                  {row.amendedBy.length > 0 ? (
                    <Badge variant="outline" className="border-accent/50 px-1.5 text-[10px] text-accent">
                      Amended · {row.amendedBy.join(', ')}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Current</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t border-border pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Acknowledgement</p>
          <p className="mt-1 text-sm">
            {report.ackRequired === 0 ? (
              <span className="text-muted-foreground">No read receipt required for this revision.</span>
            ) : (
              <>
                <strong>{report.acknowledged}</strong> of <strong>{report.ackRequired}</strong> assigned readers
                {report.acknowledged < report.ackRequired && (
                  <span className="text-muted-foreground"> · {report.ackRequired - report.acknowledged} outstanding</span>
                )}
              </>
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Approval</p>
          <p className="mt-1 text-sm">
            {report.approvedBy ? (
              <>
                Drafted by {report.authoredBy ?? 'unknown'}, approved by {report.approvedBy}
                {report.approvedOn ? `, ${d(report.approvedOn)}` : ''}.
              </>
            ) : (
              <span className="text-muted-foreground">
                <FileText className="mr-1 inline h-3.5 w-3.5" />
                Published without a recorded four-eyes approval.
              </span>
            )}
          </p>
        </div>
      </div>
    </GfoPanel>
  );
}
