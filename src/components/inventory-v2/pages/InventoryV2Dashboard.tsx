import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { useInventoryV2 } from '../InventoryV2Context';
import { readinessColor, STATUS_COLORS, V2_THEME } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import FilterOverlay, { type FilterState, DEFAULT_FILTERS } from '../shared/FilterOverlay';
import {
  LayoutDashboard, Filter, Clock, CheckCircle, AlertTriangle,
  PackagePlus, Send, Truck, ArrowRight
} from 'lucide-react';

export default function InventoryV2Dashboard() {
  const navigate = useNavigate();
  const { state } = useInventoryV2();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hiddenPanels, setHiddenPanels] = useState<Set<string>>(new Set());

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // Filter helpers
  const matchesUnitFilter = (tailNumber: string) => {
    if (!filters.unitFilter.trim()) return true;
    const units = filters.unitFilter.split(',').map(u => u.trim().toUpperCase());
    return units.some(u => tailNumber.toUpperCase().includes(u));
  };

  const matchesUserFilter = (reportedBy: string) => {
    if (!filters.userFilter || filters.userFilter === 'everyone') return true;
    return reportedBy === filters.userFilter;
  };

  const matchesDateFilter = (dateStr: string) => {
    if (!filters.dateFrom && !filters.dateTo) return true;
    const date = new Date(dateStr).getTime();
    const from = filters.dateFrom ? new Date(filters.dateFrom + 'T00:00:00Z').getTime() : -Infinity;
    const to = filters.dateTo
      ? new Date(filters.dateTo + 'T23:59:59Z').getTime()
      : Infinity;
    return date >= from && date <= to;
  };

  // Panels data
  const inProgress = useMemo(() =>
    state.inspections.filter(i =>
      i.status === 'in_progress' &&
      matchesUnitFilter(i.tailNumber) &&
      matchesUserFilter(i.reportedBy) &&
      matchesDateFilter(i.date)
    ),
    [state.inspections, filters]
  );

  const recentlyCompleted = useMemo(() =>
    state.inspections
      .filter(i =>
        (i.status === 'submitted' || i.status === 'restocked') &&
        matchesUnitFilter(i.tailNumber) &&
        matchesUserFilter(i.reportedBy) &&
        matchesDateFilter(i.date)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10),
    [state.inspections, filters]
  );

  const restockingNeeded = useMemo(() =>
    state.inspections.filter(i =>
      i.status === 'restocking_needed' &&
      matchesUnitFilter(i.tailNumber) &&
      matchesUserFilter(i.reportedBy) &&
      matchesDateFilter(i.date)
    ),
    [state.inspections, filters]
  );

  const recentlyRestocked = useMemo(() =>
    state.inspections
      .filter(i =>
        i.status === 'restocked' &&
        matchesUnitFilter(i.tailNumber) &&
        matchesUserFilter(i.reportedBy) &&
        matchesDateFilter(i.date)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
    [state.inspections, filters]
  );

  const openRequests = useMemo(() =>
    state.unitItemRequests.filter(r =>
      r.status === 'open' &&
      matchesUnitFilter(r.unitTailNumber) &&
      matchesUserFilter(r.requestedBy) &&
      matchesDateFilter(r.requestDate)
    ),
    [state.unitItemRequests, filters]
  );

  const completedRequests = useMemo(() =>
    state.unitItemRequests.filter(r =>
      r.status === 'fulfilled' &&
      matchesUnitFilter(r.unitTailNumber) &&
      matchesUserFilter(r.requestedBy) &&
      matchesDateFilter(r.requestDate)
    ),
    [state.unitItemRequests, filters]
  );

  const panels = [
    { id: 'in-progress', title: 'Inspections In Progress', icon: Clock, count: inProgress.length, color: 'text-blue-400' },
    { id: 'recently-completed', title: 'Recently Completed', icon: CheckCircle, count: recentlyCompleted.length, color: 'text-emerald-400' },
    { id: 'restocking-needed', title: 'Restocking Needed', icon: AlertTriangle, count: restockingNeeded.length, color: 'text-amber-400' },
    { id: 'recently-restocked', title: 'Recently Restocked', icon: PackagePlus, count: recentlyRestocked.length, color: 'text-emerald-400' },
    { id: 'open-requests', title: 'Open Unit Item Requests', icon: Send, count: openRequests.length, color: 'text-blue-400' },
    { id: 'completed-requests', title: 'Completed Requests', icon: CheckCircle, count: completedRequests.length, color: 'text-emerald-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Inventory Dashboard</h1>
          <V2Badge variant="v2" size="md" />
        </div>
        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <Filter className="w-4 h-4 mr-1" /> Filters
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-blue-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{inProgress.length}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{restockingNeeded.length}</p>
            <p className="text-xs text-muted-foreground">Restock Needed</p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{openRequests.length}</p>
            <p className="text-xs text-muted-foreground">Open Requests</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{recentlyCompleted.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Panel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* In Progress */}
        {!hiddenPanels.has('in-progress') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Inspections In Progress
                <Badge variant="outline" className="ml-auto">{inProgress.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {inProgress.map(i => (
                    <div
                      key={i.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/inventory-v2/inspection?resume=${i.id}`)}
                    >
                      <div>
                        <span className="text-sm font-medium">{i.tailNumber}</span>
                        <span className="text-xs text-muted-foreground ml-2">{i.aircraftType}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{i.reportedBy}</span>
                    </div>
                  ))}
                  {inProgress.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">None</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Restocking Needed */}
        {!hiddenPanels.has('restocking-needed') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Restocking Needed
                <Badge variant="outline" className="ml-auto">{restockingNeeded.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {restockingNeeded.map(i => (
                    <div
                      key={i.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/inventory-v2/pick-list')}
                    >
                      <div>
                        <span className="text-sm font-medium">{i.tailNumber}</span>
                        <span className={`text-xs ml-2 ${readinessColor(i.readinessScore)}`}>{i.readinessScore}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(i.date)}</span>
                    </div>
                  ))}
                  {restockingNeeded.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">None</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Open Requests */}
        {!hiddenPanels.has('open-requests') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" />
                Open Unit Item Requests
                <Badge variant="outline" className="ml-auto">{openRequests.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {openRequests.map(r => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/inventory-v2/unit-requests')}
                    >
                      <div>
                        <span className="text-sm font-medium">{r.unitTailNumber}</span>
                        <Badge className="ml-2 text-[10px] bg-amber-500/15 text-amber-400">
                          {r.isGuestRequest ? 'Guest' : 'Non-Guest'}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.items.length} items</span>
                    </div>
                  ))}
                  {openRequests.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">None</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Recently Completed */}
        {!hiddenPanels.has('recently-completed') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Recently Completed
                <Badge variant="outline" className="ml-auto">{recentlyCompleted.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {recentlyCompleted.slice(0, 5).map(i => (
                    <div
                      key={i.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/inventory-v2/recently-completed')}
                    >
                      <div>
                        <span className="text-sm font-medium">{i.tailNumber}</span>
                        <span className="text-xs text-muted-foreground ml-2">{i.reportedBy}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(i.date)}</span>
                    </div>
                  ))}
                  {recentlyCompleted.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">None</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Recently Restocked */}
        {!hiddenPanels.has('recently-restocked') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-emerald-400" />
                Recently Restocked
                <Badge variant="outline" className="ml-auto">{recentlyRestocked.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {recentlyRestocked.map(i => (
                    <div key={i.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <span className="text-sm font-medium">{i.tailNumber}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(i.date)}</span>
                    </div>
                  ))}
                  {recentlyRestocked.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">None</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Completed Requests */}
        {!hiddenPanels.has('completed-requests') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Completed Requests
                <Badge variant="outline" className="ml-auto">{completedRequests.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {completedRequests.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <span className="text-sm font-medium">{r.unitTailNumber}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(r.requestDate)}</span>
                    </div>
                  ))}
                  {completedRequests.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">None</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      <FilterOverlay open={filtersOpen} onOpenChange={setFiltersOpen} filters={filters} onFiltersChange={setFilters} />
    </div>
  );
}
