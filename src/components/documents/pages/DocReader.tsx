import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, AlertTriangle, FilePlus2, PencilLine, History } from 'lucide-react';
import { Button } from '../../ui/button';
import { GfoPanel, GfoEmptyState } from '../../gfo';
import { useDocuments } from '../DocumentsContext';
import { classFor } from '../classes';
import { canAuthor } from '../engine/lifecycle';
import { currentRevision, revisionsFor } from '../engine/revisions';
import { canManageDocuments } from '../roles';
import { AckPanel } from '../components/AckPanel';
import { DocIdentityHeader } from '../components/DocIdentity';
import { DocEditorDialog, type EditorMode } from '../components/DocEditorDialog';
import { RevisionTimeline } from '../components/RevisionTimeline';
import { ReviewPanel } from '../components/ReviewPanel';

export function DocReader({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { docId } = useParams<{ docId: string }>();
  const { state } = useDocuments();
  const [editor, setEditor] = useState<EditorMode | null>(null);

  const doc = state.docs.find((d) => d.id === docId);
  const rev = doc ? currentRevision(doc.id, state.revisions) : undefined;
  const allRevs = doc ? revisionsFor(doc.id, state.revisions) : [];

  const userRoles = [userRole, ...additionalRoles];
  const manager = canManageDocuments(userRole, additionalRoles);
  const author = doc ? canAuthor(classFor(doc.classId), userRoles) : false;
  const editableRev = allRevs.find((r) => r.status === 'draft' || r.status === 'rejected');

  if (!doc || (!rev && !author && !manager)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents"><ArrowLeft className="mr-1.5 h-4 w-4" /> Documents</Link>
        </Button>
        <GfoEmptyState message="This document does not exist or has no published revision." />
      </div>
    );
  }

  const headerRev = rev ?? allRevs[0];
  const priorRevisions = allRevs.filter((r) => r.id !== headerRev?.id && r.status === 'superseded');
  const showChangeSummary = rev && rev.changeSummary.trim() && priorRevisions.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/documents"><ArrowLeft className="mr-1.5 h-4 w-4" /> Documents</Link>
        </Button>
        {author && (
          <div className="flex items-center gap-2">
            {editableRev && (
              <Button size="sm" variant="secondary" onClick={() => setEditor({ kind: 'edit-draft', doc, rev: editableRev })}>
                <PencilLine className="mr-1.5 h-4 w-4" /> Edit draft (rev {editableRev.revision})
              </Button>
            )}
            {rev && !editableRev && (
              <Button size="sm" variant="secondary" onClick={() => setEditor({ kind: 'revise', doc, baseRev: rev })}>
                <FilePlus2 className="mr-1.5 h-4 w-4" /> New revision
              </Button>
            )}
          </div>
        )}
      </div>

      {headerRev && <DocIdentityHeader doc={doc} rev={headerRev} />}

      {showChangeSummary && rev && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/10">
          <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5" /> What changed in rev {rev.revision}
          </p>
          <p className="text-sm text-amber-900/90 dark:text-amber-200/90">{rev.changeSummary}</p>
        </div>
      )}

      {rev ? (
        <GfoPanel>
          <article className="prose-bulletin">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rev.content}</ReactMarkdown>
          </article>
          <AckPanel doc={doc} rev={rev} userRole={userRole} />
        </GfoPanel>
      ) : (
        <GfoEmptyState message="No published revision yet — see the revision history below." />
      )}

      {manager && <ReviewPanel doc={doc} userRole={userRole} />}

      {(manager || author) && allRevs.length > 0 && (
        <GfoPanel title="Revision history" action={<History className="h-4 w-4 text-muted-foreground" />}>
          <RevisionTimeline revisions={allRevs} />
        </GfoPanel>
      )}

      {editor && (
        <DocEditorDialog
          open={!!editor}
          onOpenChange={(o) => { if (!o) setEditor(null); }}
          mode={editor}
          userRole={userRole}
          additionalRoles={additionalRoles}
        />
      )}
    </div>
  );
}
