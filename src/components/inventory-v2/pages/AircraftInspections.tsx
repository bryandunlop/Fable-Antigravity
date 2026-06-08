// ─── Aircraft Inspections — Unified Audit + History Page ──────────────────
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, ChevronDown, Calendar, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../ui/collapsible';
import { useInventoryV2 } from '../InventoryV2Context';
import { V2Badge } from '../shared/V2Badge';
import { getCompartmentsForAircraft } from '../compartmentConfig';
import type { InspectionV2 } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function recencyColor(dateStr: string | undefined): string {
  if (!dateStr) return 'bg-red-500/15 text-red-400';
  const days = daysSince(dateStr);
  if (days <= 30) return 'bg-emerald-500/15 text-emerald-400';
  if (days <= 60) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

function readinessColor(score: number): string {
  if (score >= 95) return 'bg-emerald-500/15 text-emerald-400';
  if (score >= 80) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ─── Component ────────────────────────────────────────────────────────────

export default function AircraftInspections() {
  const navigate = useNavigate();
  const { state } = useInventoryV2();
  const [filterTail, setFilterTail] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group inspections by aircraft for card stats
  const inspectionsByTail = useMemo(() => {
    const map: Record<string, InspectionV2[]> = {};
    state.fleet.forEach(a => { map[a.tailNumber] = []; });
    state.inspections.forEach(i => {
      if (map[i.tailNumber]) map[i.tailNumber].push(i);
    });
    return map;
  }, [state.inspections, state.fleet]);

  const lastInspection = (tail: string): InspectionV2 | undefined => {
    const sorted = (inspectionsByTail[tail] ?? [])
      .filter(i => i.status !== 'in_progress')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return sorted[0];
  };

  const yearCount = (tail: string): number => {
    const year = new Date().getFullYear();
    return (inspectionsByTail[tail] ?? []).filter(i => new Date(i.date).getFullYear() === year).length;
  };

  const inProgressForTail = (tail: string): InspectionV2 | undefined =>
    (inspectionsByTail[tail] ?? []).find(i => i.status === 'in_progress');

  const historyInspections = useMemo(() => {
    let list = state.inspections
      .filter(i => i.status !== 'in_progress')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (filterTail !== 'all') {
      list = list.filter(i => i.tailNumber === filterTail);
    }
    return list;
  }, [state.inspections, filterTail]);

  const handleCardClick = (tail: string) => {
    const inProg = inProgressForTail(tail);
    if (inProg) {
      navigate(`/inventory-v2/inspection?resume=${inProg.id}`);
    } else {
      navigate(`/inventory-v2/inspection?tail=${tail}`);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardCheck className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Aircraft Inspections</h1>
        <V2Badge />
      </div>
      <p className="text-sm text-muted-foreground -mt-4">Monthly baseline audit — verify what's on the aircraft matches system records</p>

      {/* Aircraft Cards — 2×2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {state.fleet.map(aircraft => {
          const last = lastInspection(aircraft.tailNumber);
          const count = yearCount(aircraft.tailNumber);
          const inProg = inProgressForTail(aircraft.tailNumber);

          return (
            <Card
              key={aircraft.tailNumber}
              className="glass-premium glass-premium-hover cursor-pointer transition-all duration-300"
              onClick={() => handleCardClick(aircraft.tailNumber)}
            >
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xl font-bold text-foreground">{aircraft.tailNumber}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{aircraft.type}</div>
                  </div>
                  {inProg ? (
                    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">
                      In Progress
                    </Badge>
                  ) : (
                    <Badge className={`${recencyColor(last?.date)} text-xs border-0`}>
                      {last ? `Last: ${formatDate(last.date)}` : 'Never inspected'}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  {count} inspection{count !== 1 ? 's' : ''} this year
                </div>
                {last && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Score: <span className={`font-medium ${last.readinessScore >= 95 ? 'text-emerald-400' : last.readinessScore >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{last.readinessScore}%</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Inspection History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Inspection History</h2>
          <div className="flex gap-2">
            {['all', ...state.fleet.map(a => a.tailNumber)].map(tail => (
              <button
                key={tail}
                onClick={() => setFilterTail(tail)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  filterTail === tail
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {tail === 'all' ? 'All' : tail}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {historyInspections.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                No completed inspections found
              </CardContent>
            </Card>
          ) : (
            historyInspections.map(inspection => {
              const isExpanded = expandedId === inspection.id;
              const missingItems = inspection.checkedItems.filter(ci => ci.qtyInUnit < ci.requiredQty);
              const itemsMap = new Map(state.items.map(i => [i.id, i]));
              const compartments = getCompartmentsForAircraft(state.compartmentConfigs, inspection.aircraftType);

              // Group checked items by compartment
              const byCompartment = new Map<string, typeof inspection.checkedItems>();
              inspection.checkedItems.forEach(ci => {
                const item = itemsMap.get(ci.itemId);
                const cid = item?.compartmentId ?? 'other';
                if (!byCompartment.has(cid)) byCompartment.set(cid, []);
                byCompartment.get(cid)!.push(ci);
              });

              return (
                <Collapsible key={inspection.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : inspection.id)}>
                  <Card className="glass-panel overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {inspection.tailNumber} — {formatDate(inspection.date)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {inspection.reportedBy} · {inspection.checkedItems.length} items checked
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${readinessColor(inspection.readinessScore)} text-xs border-0`}>
                            {inspection.readinessScore}%
                            {missingItems.length > 0 && ` — ${missingItems.length} missing`}
                          </Badge>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border/40">
                        {inspection.topLevelNotes && (
                          <p className="text-xs text-muted-foreground italic px-4 pt-3">{inspection.topLevelNotes}</p>
                        )}

                        {/* Compartment-grouped items */}
                        {compartments.map(comp => {
                          const items = byCompartment.get(comp.id);
                          if (!items || items.length === 0) return null;
                          const missing = items.filter(ci => ci.qtyInUnit < ci.requiredQty);
                          return (
                            <div key={comp.id} className="px-4 pt-3">
                              <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                {missing.length > 0 && <AlertTriangle className="w-3 h-3 text-red-400" />}
                                {comp.label}
                                <span className="text-muted-foreground/50">({items.length})</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {items.map(ci => {
                                  const item = itemsMap.get(ci.itemId);
                                  const isMissing = ci.qtyInUnit < ci.requiredQty;
                                  return (
                                    <Badge
                                      key={ci.itemId}
                                      variant="outline"
                                      className={`text-xs ${isMissing ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-muted/40 border-border/50 text-muted-foreground'}`}
                                    >
                                      {isMissing ? (
                                        <><AlertTriangle className="w-2.5 h-2.5 mr-1" />{item?.itemName ?? ci.itemId}: {ci.qtyInUnit}/{ci.requiredQty}</>
                                      ) : (
                                        <><CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-400" />{item?.itemName ?? ci.itemId}</>
                                      )}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {inspection.additionalFees.length > 0 && (
                          <div className="px-4 pt-3">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Additional Fees</div>
                            {inspection.additionalFees.map(fee => (
                              <div key={fee.id} className="text-xs text-muted-foreground">
                                {fee.description} — ${fee.amount.toFixed(2)}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="px-4 py-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {inspection.submittedAt ? `Submitted ${formatDateTime(inspection.submittedAt)}` : `Started ${formatDateTime(inspection.date)}`}
                          <span>· Status: {inspection.status.replaceAll('_', ' ')}</span>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
