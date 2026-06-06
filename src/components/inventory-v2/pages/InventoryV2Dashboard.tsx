import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
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
  PackagePlus, Send, Truck, ArrowRight, Plane, ChevronRight,
  ClipboardCheck, CheckCircle2, Sun, Moon, Eye, EyeOff, Search, History,
} from 'lucide-react';
import { OfflineBanner } from '../shared/OfflineBanner';
import { formatDate } from '../shared/dateUtils';
import { InventorySearchDialog, useInventorySearch } from '../shared/InventorySearchDialog';

const HIDDEN_PANELS_KEY = 'inv-v2-hidden-panels';

function loadHiddenPanels(): Set<string> {
  try {
    const saved = localStorage.getItem(HIDDEN_PANELS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch { return new Set(); }
}

export default function InventoryV2Dashboard() {
  const navigate = useNavigate();
  const { state } = useInventoryV2();
  const { theme, setTheme } = useTheme();
  const activeTrips = state.trips.filter(t => t.status === 'active');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useInventorySearch();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hiddenPanels, setHiddenPanels] = useState<Set<string>>(loadHiddenPanels);

  useEffect(() => {
    localStorage.setItem(HIDDEN_PANELS_KEY, JSON.stringify([...hiddenPanels]));
  }, [hiddenPanels]);

  function togglePanel(id: string) {
    setHiddenPanels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      <OfflineBanner />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Inventory Dashboard</h1>
          <V2Badge variant="v2" size="md" />
        </div>
        <div className="flex items-center gap-2">
          {hiddenPanels.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => setHiddenPanels(new Set())}>
              <Eye className="w-4 h-4 mr-1" />
              Show all ({hiddenPanels.size} hidden)
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/inventory-v2/activity-log')}>
            <History className="w-4 h-4 mr-1" /> Activity
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
            <Search className="w-4 h-4 mr-1" /> Search
            <kbd className="ml-1 text-xs text-muted-foreground bg-muted px-1 rounded">⌘K</kbd>
          </Button>
          <Button variant="outline" onClick={() => setFiltersOpen(true)}>
            <Filter className="w-4 h-4 mr-1" /> Filters
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Active Trips */}
      {activeTrips.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plane size={16} className="text-amber-400" />
              Active Trips
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeTrips.map(trip => {
              const activeLeg = trip.legs.find(l => l.status === 'active');
              const itemsUsed = activeLeg?.usageLog.reduce((sum, e) => sum + e.qtyUsed, 0) ?? 0;
              return (
                <div
                  key={trip.id}
                  className="flex items-center justify-between px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => navigate(`/inventory-v2/trips/${trip.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded text-xs font-semibold border border-amber-500/30">
                      {trip.tailNumber}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{trip.tripName || trip.tailNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {activeLeg ? `Leg ${activeLeg.legNumber}: ${activeLeg.origin} → ${activeLeg.destination}` : 'No active leg'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    {itemsUsed > 0 && (
                      <span className="text-xs text-blue-400">{itemsUsed} items used</span>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card
          className="border-blue-500/20 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => document.getElementById('panel-in-progress')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{inProgress.length}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card
          className="border-amber-500/20 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => document.getElementById('panel-restocking-needed')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-400">{restockingNeeded.length}</p>
            <p className="text-xs text-muted-foreground">Restock Needed</p>
          </CardContent>
        </Card>
        <Card
          className="border-primary/20 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => document.getElementById('panel-open-requests')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">{openRequests.length}</p>
            <p className="text-xs text-muted-foreground">Open Requests</p>
          </CardContent>
        </Card>
        <Card
          className="border-emerald-500/20 cursor-pointer hover:bg-muted/40 transition-colors"
          onClick={() => document.getElementById('panel-recently-completed')?.scrollIntoView({ behavior: 'smooth' })}
        >
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
          <Card id="panel-in-progress">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Inspections In Progress
                <Badge variant="outline" className="ml-auto">{inProgress.length}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => togglePanel('in-progress')}>
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
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
                  {inProgress.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <ClipboardCheck className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No inspections in progress</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Restocking Needed */}
        {!hiddenPanels.has('restocking-needed') && (
          <Card id="panel-restocking-needed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Restocking Needed
                <Badge variant="outline" className="ml-auto">{restockingNeeded.length}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => togglePanel('restocking-needed')}>
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {restockingNeeded.map(i => (
                    <div
                      key={i.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/inventory-v2/replenish')}
                    >
                      <div>
                        <span className="text-sm font-medium">{i.tailNumber}</span>
                        <span className={`text-xs ml-2 ${readinessColor(i.readinessScore)}`}>{i.readinessScore}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(i.date)}</span>
                    </div>
                  ))}
                  {restockingNeeded.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">All aircraft fully stocked</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Open Requests */}
        {!hiddenPanels.has('open-requests') && (
          <Card id="panel-open-requests">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" />
                Open Unit Item Requests
                <Badge variant="outline" className="ml-auto">{openRequests.length}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => togglePanel('open-requests')}>
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
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
                  {openRequests.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Send className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No open requests</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Recently Completed */}
        {!hiddenPanels.has('recently-completed') && (
          <Card id="panel-recently-completed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Recently Completed
                <Badge variant="outline" className="ml-auto">{recentlyCompleted.length}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => togglePanel('recently-completed')}>
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
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
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium shrink-0">{i.tailNumber}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{i.reportedBy}</span>
                        {i.photos.length > 0 && (
                          <div className="flex items-center gap-0.5 ml-1">
                            {i.photos.slice(0, 3).map((photo, idx) => (
                              <img key={idx} src={photo} alt="" className="w-6 h-6 rounded object-cover border border-border" />
                            ))}
                            {i.photos.length > 3 && (
                              <span className="text-xs text-muted-foreground ml-0.5">+{i.photos.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(i.date)}</span>
                    </div>
                  ))}
                  {recentlyCompleted.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No recent inspections</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Recently Restocked */}
        {!hiddenPanels.has('recently-restocked') && (
          <Card id="panel-recently-restocked">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-emerald-400" />
                Recently Restocked
                <Badge variant="outline" className="ml-auto">{recentlyRestocked.length}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => togglePanel('recently-restocked')}>
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {recentlyRestocked.map(i => (
                    <div
                      key={i.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/inventory-v2/recently-completed')}
                    >
                      <span className="text-sm font-medium">{i.tailNumber}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(i.date)}</span>
                    </div>
                  ))}
                  {recentlyRestocked.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <PackagePlus className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No recent restocks</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Completed Requests */}
        {!hiddenPanels.has('completed-requests') && (
          <Card id="panel-completed-requests">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Completed Requests
                <Badge variant="outline" className="ml-auto">{completedRequests.length}</Badge>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => togglePanel('completed-requests')}>
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {completedRequests.map(r => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/inventory-v2/unit-requests')}
                    >
                      <span className="text-sm font-medium">{r.unitTailNumber}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(r.requestDate)}</span>
                    </div>
                  ))}
                  {completedRequests.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No completed requests</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      <FilterOverlay open={filtersOpen} onOpenChange={setFiltersOpen} filters={filters} onFiltersChange={setFilters} />
      <InventorySearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
