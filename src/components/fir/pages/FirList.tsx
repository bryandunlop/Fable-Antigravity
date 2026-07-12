import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor, BookOpen, FilePlus2, Flag, MessagesSquare, StickyNote } from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent } from '../../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { GfoPageHeader, GfoStatCard, GfoEmptyState } from '../../gfo';
import { useTechLog, useCurrentUser } from '../../tech-log/TechLogContext';
import { useFir } from '../FirContext';
import { visibleFirs, isFirLeadership } from '../engine/access';
import { CATEGORY_LABEL, FirCategoryChip, FirStatusChip } from '../components/chips';
import type { FirCategory, FirStatus } from '../types';

type StatusTab = 'ALL' | FirStatus;
const RANGE_DAYS: Record<string, number | undefined> = { all: undefined, '7': 7, '30': 30, '90': 90 };

export function FirList({ userRole, additionalRoles = [] }: { userRole?: string; additionalRoles?: string[] }) {
  const { state: techLog } = useTechLog();
  const { state } = useFir();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [statusTab, setStatusTab] = useState<StatusTab>('ALL');
  const [aircraftFilter, setAircraftFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('all');

  const roles = [userRole ?? '', ...additionalRoles];
  const leadership = isFirLeadership(roles);
  const visible = useMemo(
    () => visibleFirs(state.firs, { oid: user?.oid ?? '', roles }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.firs, user?.oid, userRole, additionalRoles],
  );

  const counts = (s: FirStatus) => visible.filter(f => f.status === s).length;
  const tailOf = (id?: string) => (id && techLog.aircraft.find(a => a.id === id)?.tailNumber) || undefined;
  const nameOf = (oid: string, fallback?: string) =>
    techLog.personnel.find(p => p.oid === oid)?.displayName ?? fallback ?? oid;

  const filtered = visible
    .filter(f => statusTab === 'ALL' || f.status === statusTab)
    .filter(f => aircraftFilter === 'all' || f.aircraftId === aircraftFilter)
    .filter(f => categoryFilter === 'all' || f.category === categoryFilter)
    .filter(f => {
      const days = RANGE_DAYS[rangeFilter];
      return !days || Date.parse(f.eventStartUtc) >= Date.now() - days * 86400_000;
    })
    .sort((a, b) => b.openedAtUtc.localeCompare(a.openedAtUtc));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <GfoPageHeader
        eyebrow="Flight Ops"
        title="Flight Irregularity Reports"
        description="Retrospective, evidence-backed explanations of operational irregularities — why it happened, when, and what every hour was spent on."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/fir/published')}>
              <BookOpen className="mr-1.5 h-4 w-4" /> Published reports
            </Button>
            <Button size="sm" onClick={() => navigate('/fir/new')}>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Open FIR
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <GfoStatCard label="Open" value={counts('OPEN')} onClick={() => setStatusTab('OPEN')} />
        <GfoStatCard label="In review" value={counts('IN_REVIEW')} onClick={() => setStatusTab('IN_REVIEW')} />
        <GfoStatCard label="Published" value={counts('PUBLISHED')} onClick={() => setStatusTab('PUBLISHED')} />
        <GfoStatCard label="Closed internal" value={counts('CLOSED_INTERNAL')} onClick={() => setStatusTab('CLOSED_INTERNAL')} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={statusTab} onValueChange={(v: string) => setStatusTab(v as StatusTab)}>
          <TabsList>
            <TabsTrigger value="ALL">All <Badge variant="secondary" className="ml-1.5">{visible.length}</Badge></TabsTrigger>
            <TabsTrigger value="OPEN">Open</TabsTrigger>
            <TabsTrigger value="IN_REVIEW">In review</TabsTrigger>
            <TabsTrigger value="PUBLISHED">Published</TabsTrigger>
            <TabsTrigger value="CLOSED_INTERNAL">Closed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto flex flex-wrap gap-2">
          <Select value={aircraftFilter} onValueChange={setAircraftFilter}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Aircraft" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All aircraft</SelectItem>
              {techLog.aircraft.map(a => <SelectItem key={a.id} value={a.id}>{a.tailNumber}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(Object.keys(CATEGORY_LABEL) as FirCategory[]).map(c => (
                <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!leadership && (
        <p className="text-xs text-muted-foreground">Showing FIRs you opened or own. Leadership sees all reports.</p>
      )}

      {filtered.length === 0 ? (
        <GfoEmptyState
          message="No irregularity reports match."
          icon={<Flag />}
          action={
            <Button size="sm" variant="outline" onClick={() => navigate('/fir/new')}>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Open FIR
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const tail = tailOf(f.aircraftId);
            return (
              <Card
                key={f.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/fir/${f.id}`)}
              >
                <CardContent className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{f.ref}</span>
                      <FirStatusChip status={f.status} />
                      <FirCategoryChip category={f.category} />
                      {tail && <Badge variant="outline">{tail}</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{f.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Event {new Date(f.eventStartUtc).toLocaleString()}
                      {f.eventEndUtc ? ` → ${new Date(f.eventEndUtc).toLocaleString()}` : ' → ongoing'}
                      {' · '}owner {nameOf(f.ownerOid, f.ownerName)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Anchor className="h-3.5 w-3.5" />{f.anchors.length}</span>
                    <span className="inline-flex items-center gap-1"><StickyNote className="h-3.5 w-3.5" />{f.manualTimeline.length}</span>
                    <span className="inline-flex items-center gap-1"><MessagesSquare className="h-3.5 w-3.5" />{f.statements.length}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
