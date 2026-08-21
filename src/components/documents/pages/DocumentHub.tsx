import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart3, BedDouble, BookOpenCheck, CheckSquare, FileLock2, FilePlus2, Library, Lightbulb, Map, MessageSquareText, Pin, Search, Upload, ShieldCheck } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';
import { GfoPageHeader, GfoStatCard, GfoEmptyState } from '../../gfo';
import { useDocuments, identityFor } from '../DocumentsContext';
import { classFor, DOC_CLASS_LIST, docReaderPath } from '../classes';
import { canApprove, canAuthor } from '../engine/lifecycle';
import { currentRevision } from '../engine/revisions';
import { unacknowledgedRequiredReads } from '../engine/acknowledgments';
import { readersFor, complianceSummary, overallCompliance } from '../engine/compliance';
import { docsDueForReview } from '../engine/review';
import { openSuggestions } from '../engine/suggestions';
import { groupDocsByCategory, yearsFor, matchesYear } from '../engine/library';
import { documentsRoleUniverse, canManageDocuments } from '../roles';
import { DocIdentityLine } from '../components/DocIdentity';
import { RequiredReadsList } from '../components/RequiredReadsList';
import { InFlightBadges } from '../components/InFlightBadges';
import { ApprovalQueuePanel } from '../components/ApprovalQueuePanel';
import { SuggestionQueuePanel } from '../components/SuggestionQueuePanel';
import { TribalKnowledgePanel } from '../components/TribalKnowledgePanel';
import { CabinKnowledgePanel } from '../components/CabinKnowledgePanel';
import { ComplianceDashboard } from './ComplianceDashboard';
import { DocumentRegistry } from './DocumentRegistry';
import { DocumentEstate } from './DocumentEstate';
import { ComplianceMatrix } from '../components/ComplianceMatrix';
import { DocEditorDialog } from '../components/DocEditorDialog';
import { docxToImport } from '../engine/docxImport';
import { operatorTodayIso } from '../../../lib/operatorDate';

const LIBRARY_CLASSES = ['procedural-bulletin', 'flight-ops-bulletin', 'sop', 'manual'];

export function DocumentHub({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  const { state } = useDocuments();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [importPrefill, setImportPrefill] = useState<{ content: string; title: string } | undefined>(undefined);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayIso = operatorTodayIso();
  const { userId } = identityFor(userRole);
  const userRoles = [userRole, ...additionalRoles];
  const manager = canManageDocuments(userRole, additionalRoles);
  const authorCapable = DOC_CLASS_LIST.some((c) => canAuthor(c, userRoles));
  const cabinCrew = userRoles.some((r) => ['inflight', 'lead-fa', 'fa-manager', 'commissary-manager'].includes(r));

  // Seed-import a .docx into a new draft: parse to markdown, open the create editor
  // prefilled, then the author fills class/audience/ack and saves via four-eyes.
  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('That file is too large to import (max 25 MB).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImporting(true);
    try {
      const { title, markdown, warnings } = await docxToImport(await file.arrayBuffer());
      if (!markdown.trim()) {
        toast.error('No readable content found in that file.');
        return;
      }
      setImportPrefill({ content: markdown, title: title || file.name.replace(/\.docx$/i, '') });
      setCreating(true);
      if (warnings.length) toast.warning(`Imported with ${warnings.length} formatting note${warnings.length === 1 ? '' : 's'} — review the draft.`);
      else toast.success('Imported — review and complete the draft.');
    } catch {
      toast.error('Could not read that .docx file.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const universe = useMemo(() => documentsRoleUniverse(), []);

  const pendingApprovals = state.revisions.filter((r) => {
    if (r.status !== 'pending-approval') return false;
    const d = state.docs.find((x) => x.id === r.docId);
    return d ? canApprove(classFor(d.classId), userRoles) : false;
  });

  const myOutstanding = unacknowledgedRequiredReads(
    state.docs, state.revisions, state.acknowledgments, userRole, userId,
  );

  const overall = useMemo(
    () => overallCompliance(state.docs, state.revisions, state.acknowledgments, universe),
    [state.docs, state.revisions, state.acknowledgments, universe],
  );

  const reviewDue = docsDueForReview(state.docs, todayIso).length;
  const openSugs = openSuggestions(state.suggestions).length;
  const ownsDocs = state.docs.some((d) => d.ownerUserId === userId);
  const seesFeedback = manager || ownsDocs;

  const allLibraryDocs = state.docs.filter((d) => LIBRARY_CLASSES.includes(d.classId));

  const libraryDocs = allLibraryDocs
    .filter((d) => showArchived || !d.isArchived)
    .filter((d) => classFilter === 'all' || d.classId === classFilter)
    .filter((d) => matchesYear(d, state.revisions, yearFilter))
    .filter((d) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

  // Buckets: group the filtered set by category; keep all category sections
  // expanded by default regardless of which filters are active.
  const categoryGroups = useMemo(
    () => groupDocsByCategory(libraryDocs, state.revisions),
    [libraryDocs, state.revisions],
  );
  const allCategories = useMemo(
    () => [...new Set(DOC_CLASS_LIST.filter((c) => LIBRARY_CLASSES.includes(c.id)).flatMap((c) => c.categories))],
    [],
  );
  const availableYears = useMemo(() => yearsFor(allLibraryDocs, state.revisions), [allLibraryDocs, state.revisions]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <GfoPageHeader
        eyebrow="Documents"
        title="Document Center"
        description="Controlled publications, read-and-acknowledge compliance, and operational knowledge."
        actions={
          authorCapable ? (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <Upload className="mr-1.5 h-4 w-4" /> {importing ? 'Importing…' : 'Import .docx'}
              </Button>
              <Button onClick={() => { setImportPrefill(undefined); setCreating(true); }}>
                <FilePlus2 className="mr-1.5 h-4 w-4" /> New document
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GfoStatCard label="My outstanding reads" value={myOutstanding.length} accent="sunrise" />
        <GfoStatCard label="Overall compliance" value={overall.pct === null ? 'N/A' : overall.pct} unit={overall.pct === null ? undefined : '%'} accent="daylight" />
        {manager && <GfoStatCard label="Docs due for review" value={reviewDue} />}
        {manager && <GfoStatCard label="Open suggestions" value={openSugs} />}
      </div>

      {/* D75 — cabin crew land on their own shelf. A flight attendant opening the Document Center
          wants "how does the bedding go together on this tail", not the SOP library; required
          reads still win, because those are the ones with a due date. */}
      <Tabs defaultValue={myOutstanding.length > 0 ? 'my-reads' : cabinCrew ? 'cabin-knowledge' : 'library'}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="my-reads" className="gap-1.5">
            <BookOpenCheck className="h-4 w-4" /> My required reads
            {myOutstanding.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">{myOutstanding.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5">
            <Library className="h-4 w-4" /> Library
          </TabsTrigger>
          <TabsTrigger value="tribal-knowledge" className="gap-1.5">
            <Lightbulb className="h-4 w-4" /> Tribal knowledge
          </TabsTrigger>
          <TabsTrigger value="cabin-knowledge" className="gap-1.5">
            <BedDouble className="h-4 w-4" /> Cabin knowledge
          </TabsTrigger>
          {manager && (
            <TabsTrigger value="compliance" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Compliance
            </TabsTrigger>
          )}
          {manager && (
            <TabsTrigger value="coverage" className="gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Reg coverage
            </TabsTrigger>
          )}
          {manager && (
            <TabsTrigger value="sources" className="gap-1.5">
              <FileLock2 className="h-4 w-4" /> Sources
            </TabsTrigger>
          )}
          {manager && (
            <TabsTrigger value="estate" className="gap-1.5">
              <Map className="h-4 w-4" /> Estate
            </TabsTrigger>
          )}
          {pendingApprovals.length > 0 || manager ? (
            <TabsTrigger value="approvals" className="gap-1.5">
              <CheckSquare className="h-4 w-4" /> Approvals
              {pendingApprovals.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
          ) : null}
          {seesFeedback && (
            <TabsTrigger value="feedback" className="gap-1.5">
              <MessageSquareText className="h-4 w-4" /> Suggestions
              {openSugs > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">{openSugs}</Badge>
              )}
            </TabsTrigger>
          )}
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
            {availableYears.length > 0 && (
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {manager && (
              <div className="flex items-center gap-2">
                <Switch id="showArchived" checked={showArchived} onCheckedChange={setShowArchived} />
                <Label htmlFor="showArchived" className="text-xs text-muted-foreground">Archived</Label>
              </div>
            )}
          </div>

          {categoryGroups.length === 0 ? (
            <GfoEmptyState message="No documents match the current filters." />
          ) : (
            <Accordion type="multiple" defaultValue={allCategories} className="space-y-3">
              {categoryGroups.map(({ category, docs }) => (
                <AccordionItem
                  key={category}
                  value={category}
                  className="rounded-lg border border-border bg-card px-4 last:border-b"
                >
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                      {category}
                      <Badge variant="secondary" className="px-1.5 text-[10px] font-normal">{docs.length}</Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <ul className="-mx-4 divide-y divide-border border-t border-border">
                      {docs.map((doc) => {
                        const rev = currentRevision(doc.id, state.revisions);
                        const cfg = classFor(doc.classId);
                        const to = docReaderPath(doc.id);
                        const summary = rev && rev.requireAcknowledgment && rev.ackLevel !== 'none'
                          ? complianceSummary(rev, readersFor(doc, universe), state.acknowledgments, todayIso)
                          : undefined;
                        return (
                          <li key={doc.id}>
                            <Link to={to} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                              {doc.isPinned && <Pin className="h-3.5 w-3.5 shrink-0 text-gfo-daylight" />}
                              <div className="min-w-0 flex-1">
                                <DocIdentityLine doc={doc} rev={rev} />
                                {!rev && <p className="mt-0.5 text-xs text-muted-foreground">No published revision yet</p>}
                              </div>
                              {doc.isArchived && <Badge variant="outline" className="shrink-0 text-[10px]">Archived</Badge>}
                              {manager && (
                                <InFlightBadges
                                  doc={doc}
                                  revisions={state.revisions}
                                  suggestions={state.suggestions}
                                  todayIso={todayIso}
                                  className="shrink-0"
                                />
                              )}
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
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="tribal-knowledge" className="mt-4">
          <TribalKnowledgePanel userRole={userRole} additionalRoles={additionalRoles} />
        </TabsContent>

        <TabsContent value="cabin-knowledge" className="mt-4">
          <CabinKnowledgePanel userRole={userRole} additionalRoles={additionalRoles} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <ComplianceDashboard />
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <ComplianceMatrix />
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <DocumentRegistry userRole={userRole} additionalRoles={additionalRoles} />
        </TabsContent>

        <TabsContent value="estate" className="mt-4">
          <DocumentEstate />
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <ApprovalQueuePanel userRole={userRole} additionalRoles={additionalRoles} />
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <SuggestionQueuePanel userRole={userRole} additionalRoles={additionalRoles} />
        </TabsContent>
      </Tabs>

      <DocEditorDialog
        open={creating}
        onOpenChange={(o) => { setCreating(o); if (!o) setImportPrefill(undefined); }}
        mode={{ kind: 'create', prefill: importPrefill }}
        userRole={userRole}
        additionalRoles={additionalRoles}
      />
    </div>
  );
}
