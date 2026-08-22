import { useMemo } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckSquare, History, MessageSquareText, PencilLine, Users } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { GfoPanel, GfoEmptyState } from '../../gfo';
import { useDocuments, identityFor, publishWithdrawnEvent } from '../DocumentsContext';
import { classFor, docReaderPath } from '../classes';
import { canAuthor } from '../engine/lifecycle';
import { canManageDocuments, documentsRoleUniverse } from '../roles';
import { currentRevision, revisionsFor } from '../engine/revisions';
import { docInFlight } from '../engine/workbench';
import { readersFor } from '../engine/compliance';
import { DocIdentityHeader } from '../components/DocIdentity';
import { InFlightBadges } from '../components/InFlightBadges';
import { SuggestionTriageList } from '../components/SuggestionTriageList';
import { WorkingDraftPanel } from '../components/WorkingDraftPanel';
import { ApprovalQueuePanel } from '../components/ApprovalQueuePanel';
import { EffectivePagesPanel } from '../components/EffectivePagesPanel';
import { ReviewPanel } from '../components/ReviewPanel';
import { ComplianceRoster } from '../components/ComplianceRoster';
import { RevisionTimeline } from '../components/RevisionTimeline';
import { operatorTodayIso } from '../../../lib/operatorDate';

const TABS = ['suggestions', 'draft', 'approval', 'review', 'history'] as const;
type TabId = (typeof TABS)[number];

/**
 * Everything happening to ONE document, in one place.
 *
 * Before this, a maintainer's view was split across four surfaces that did not
 * know about each other: the hub's Feedback tab, the hub's Approvals tab, the
 * reader's inline pins, and the reader's revision history. None of them could
 * answer "what is in flight on the GOM right now".
 *
 * It is a route rather than a tab inside DocReader for two reasons: the reader
 * is the reader of record and must stay free of authoring chrome, and a route is
 * deep-linkable — which is how the hub's cross-document queues send a maintainer
 * to the actual work instead of duplicating its actions.
 */
export function DocWorkbench({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { docId } = useParams<{ docId: string }>();
  const [params, setParams] = useSearchParams();
  const { state, withdrawDraft } = useDocuments();

  const todayIso = operatorTodayIso();
  const userRoles = [userRole, ...additionalRoles];
  const manager = canManageDocuments(userRole, additionalRoles);

  const doc = state.docs.find((d) => d.id === docId);
  const author = doc ? canAuthor(classFor(doc.classId), userRoles) : false;
  const canManage = manager || author;

  const allRevs = useMemo(() => (doc ? revisionsFor(doc.id, state.revisions) : []), [doc, state.revisions]);
  const rev = doc ? currentRevision(doc.id, state.revisions) : undefined;
  const flight = doc ? docInFlight(doc, state.revisions, state.suggestions, todayIso) : undefined;

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents"><ArrowLeft className="mr-1.5 h-4 w-4" /> Documents</Link>
        </Button>
        <GfoEmptyState message="This document does not exist." />
      </div>
    );
  }

  // Managing is an authoring act. A reader who follows a link here is sent to
  // the document itself rather than shown an empty shell they cannot act on.
  if (!canManage) return <Navigate to={docReaderPath(doc.id)} replace />;

  const requested = params.get('tab');
  const tab: TabId = TABS.includes(requested as TabId)
    ? (requested as TabId)
    : flight?.openSuggestionCount
      ? 'suggestions'
      : flight?.workingDraft
        ? 'draft'
        : 'history';

  const headerRev = rev ?? allRevs[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/documents"><ArrowLeft className="mr-1.5 h-4 w-4" /> Documents</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={docReaderPath(doc.id)}><BookOpen className="mr-1.5 h-4 w-4" /> Read the document</Link>
        </Button>
      </div>

      {headerRev ? (
        <div className="space-y-2">
          <DocIdentityHeader doc={doc} rev={headerRev} />
          <InFlightBadges doc={doc} revisions={state.revisions} suggestions={state.suggestions} todayIso={todayIso} />
        </div>
      ) : (
        <GfoEmptyState message="This document has no revisions yet." />
      )}

      <Tabs value={tab} onValueChange={(v: string) => setParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="suggestions" className="gap-1.5">
            <MessageSquareText className="h-4 w-4" /> Suggestions
            {!!flight?.openSuggestionCount && (
              <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">{flight.openSuggestionCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="draft" className="gap-1.5">
            <PencilLine className="h-4 w-4" /> Working draft
            {!!flight?.stagedCount && (
              <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">{flight.stagedCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-1.5">
            <CheckSquare className="h-4 w-4" /> Approval
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5">
            <Users className="h-4 w-4" /> Review &amp; receipts
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <SuggestionTriageList
            doc={doc}
            userRole={userRole}
            additionalRoles={additionalRoles}
            canManage={canManage}
            highlightId={params.get('suggestion') ?? undefined}
          />
        </TabsContent>

        <TabsContent value="draft" className="mt-4">
          <WorkingDraftPanel doc={doc} userRole={userRole} additionalRoles={additionalRoles} />
        </TabsContent>

        <TabsContent value="approval" className="mt-4">
          {flight?.pendingApproval ? (
            <ApprovalQueuePanel userRole={userRole} additionalRoles={additionalRoles} docId={doc.id} />
          ) : (
            <GfoEmptyState message="Nothing is waiting on approval for this document." icon={<CheckSquare />} />
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4 space-y-4">
          <ReviewPanel doc={doc} userRole={userRole} additionalRoles={additionalRoles} />
          <EffectivePagesPanel doc={doc} />
          {rev && rev.requireAcknowledgment && rev.ackLevel !== 'none' && (
            <GfoPanel title="Read receipts" action={<Users className="h-4 w-4 text-muted-foreground" />}>
              <ComplianceRoster
                rev={rev}
                readers={readersFor(doc, documentsRoleUniverse())}
                acks={state.acknowledgments}
              />
            </GfoPanel>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <RevisionTimeline
            revisions={allRevs}
            canManage={canManage}
            suggestions={state.suggestions}
            onWithdraw={(revisionId, reason) => {
              const target = allRevs.find((r) => r.id === revisionId);
              withdrawDraft(revisionId, reason, userRole, additionalRoles);
              if (target?.status === 'pending-approval') {
                publishWithdrawnEvent(doc, target, identityFor(userRole).userName);
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
