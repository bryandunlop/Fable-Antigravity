import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPanel, GfoEmptyState } from '../../gfo';
import { useDocuments } from '../DocumentsContext';
import { currentRevision, revisionsFor } from '../engine/revisions';
import { AckPanel } from '../components/AckPanel';
import { DocIdentityHeader } from '../components/DocIdentity';

export function DocReader({ userRole }: { userRole: string }) {
  const { docId } = useParams<{ docId: string }>();
  const { state } = useDocuments();

  const doc = state.docs.find((d) => d.id === docId);
  const rev = doc ? currentRevision(doc.id, state.revisions) : undefined;

  if (!doc || !rev) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents"><ArrowLeft className="mr-1.5 h-4 w-4" /> Documents</Link>
        </Button>
        <GfoEmptyState message="This document does not exist or has no published revision." />
      </div>
    );
  }

  const priorRevisions = revisionsFor(doc.id, state.revisions).filter(
    (r) => r.id !== rev.id && r.status === 'superseded',
  );
  const showChangeSummary = rev.changeSummary.trim() && priorRevisions.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/documents"><ArrowLeft className="mr-1.5 h-4 w-4" /> Documents</Link>
      </Button>

      <DocIdentityHeader doc={doc} rev={rev} />

      {showChangeSummary && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" /> What changed in rev {rev.revision}
          </p>
          <p className="text-sm text-amber-900/90 dark:text-amber-200/90">{rev.changeSummary}</p>
        </div>
      )}

      <GfoPanel>
        <article className="prose-bulletin">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{rev.content}</ReactMarkdown>
        </article>
        <AckPanel doc={doc} rev={rev} userRole={userRole} />
      </GfoPanel>
    </div>
  );
}
