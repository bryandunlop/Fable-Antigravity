import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, Library, Pin, Search } from 'lucide-react';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { GfoPageHeader, GfoStatCard, GfoEmptyState } from '../../gfo';
import { useDocuments, identityFor } from '../DocumentsContext';
import { classFor, DOC_CLASS_LIST } from '../classes';
import { currentRevision } from '../engine/revisions';
import { unacknowledgedRequiredReads } from '../engine/acknowledgments';
import { readersFor, complianceSummary } from '../engine/compliance';
import { docsDueForReview } from '../engine/review';
import { openSuggestions } from '../engine/suggestions';
import { documentsRoleUniverse, canManageDocuments } from '../roles';
import { DocIdentityLine } from '../components/DocIdentity';
import { RequiredReadsList } from '../components/RequiredReadsList';
import { ReviewFlagBadge } from '../components/ReviewFlagBadge';

const LIBRARY_CLASSES = ['procedural-bulletin', 'flight-ops-bulletin', 'sop', 'manual'];

export function DocumentHub({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state } = useDocuments();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const { userId } = identityFor(userRole);
  const manager = canManageDocuments(userRole, additionalRoles);
  const universe = useMemo(() => documentsRoleUniverse(), []);

  const myOutstanding = unacknowledgedRequiredReads(
    state.docs, state.revisions, state.acknowledgments, userRole, userId,
  );

  const overallCompliance = useMemo(() => {
    const pcts: number[] = [];
    for (const doc of state.docs) {
      if (doc.isArchived) continue;
      const rev = currentRevision(doc.id, state.revisions);
      if (!rev || !rev.requireAcknowledgment || rev.ackLevel === 'none') continue;
      pcts.push(complianceSummary(rev, readersFor(doc, universe), state.acknowledgments, todayIso).pct);
    }
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 100;
  }, [state.docs, state.revisions, state.acknowledgments, universe, todayIso]);

  const reviewDue = docsDueForReview(state.docs, todayIso).length;
  const openSugs = openSuggestions(state.suggestions).length;

  const libraryDocs = state.docs
    .filter((d) => LIBRARY_CLASSES.includes(d.classId))
    .filter((d) => showArchived || !d.isArchived)
    .filter((d) => classFilter === 'all' || d.classId === classFilter)
    .filter((d) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || a.id.localeCompare(b.id));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <GfoPageHeader
        eyebrow="Documents"
        title="Document Center"
        description="Controlled publications, read-and-acknowledge compliance, and operational knowledge."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GfoStatCard label="My outstanding reads" value={myOutstanding.length} accent="sunrise" />
        <GfoStatCard label="Overall compliance" value={overallCompliance} unit="%" accent="daylight" />
        {manager && <GfoStatCard label="Docs due for review" value={reviewDue} />}
        {manager && <GfoStatCard label="Open suggestions" value={openSugs} />}
      </div>

      <Tabs defaultValue={myOutstanding.length > 0 ? 'my-reads' : 'library'}>
        <TabsList>
          <TabsTrigger value="my-reads" className="gap-1.5">
            <BookOpenCheck className="h-4 w-4" /> My required reads
            {myOutstanding.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">{myOutstanding.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5">
            <Library className="h-4 w-4" /> Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-reads" className="mt-4">
          <RequiredReadsList userRole={userRole} />
        </TabsContent>

        <TabsContent value="library" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, number, category, tags…"
                className="pl-8"
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {DOC_CLASS_LIST.filter((c) => LIBRARY_CLASSES.includes(c.id)).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.labelPlural}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {manager && (
              <div className="flex items-center gap-2">
                <Switch id="showArchived" checked={showArchived} onCheckedChange={setShowArchived} />
                <Label htmlFor="showArchived" className="text-xs text-muted-foreground">Archived</Label>
              </div>
            )}
          </div>

          {libraryDocs.length === 0 ? (
            <GfoEmptyState message="No documents match the current filters." />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {libraryDocs.map((doc) => {
                const rev = currentRevision(doc.id, state.revisions);
                const cfg = classFor(doc.classId);
                const to = cfg.readerRoute === '/documents' ? `/documents/${doc.id}` : cfg.readerRoute;
                const summary = rev && rev.requireAcknowledgment && rev.ackLevel !== 'none'
                  ? complianceSummary(rev, readersFor(doc, universe), state.acknowledgments, todayIso)
                  : undefined;
                return (
                  <li key={doc.id}>
                    <Link to={to} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                      {doc.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-gfo-daylight" />}
                      <div className="min-w-0 flex-1">
                        <DocIdentityLine doc={doc} rev={rev} />
                        <p className="mt-0.5 text-xs text-muted-foreground">{doc.category}{rev ? '' : ' · no published revision yet'}</p>
                      </div>
                      {doc.isArchived && <Badge variant="outline" className="shrink-0 text-[10px]">Archived</Badge>}
                      {manager && <ReviewFlagBadge doc={doc} todayIso={todayIso} />}
                      {manager && summary && (
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground" title="Read-and-acknowledge compliance">
                          {summary.read}/{summary.total} read
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
