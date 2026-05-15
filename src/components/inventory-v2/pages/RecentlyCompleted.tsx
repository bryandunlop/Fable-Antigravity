import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { ScrollArea } from '../../ui/scroll-area';
import { useInventoryV2 } from '../InventoryV2Context';
import { ITEMS_V2 } from '../mockData';
import { readinessColor } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { Calendar, User, Plane, Clock } from 'lucide-react';
import type { InspectionV2 } from '../types';

export default function RecentlyCompleted() {
  const { state } = useInventoryV2();
  const [selectedInspection, setSelectedInspection] = useState<InspectionV2 | null>(null);

  const completedInspections = useMemo(() =>
    state.inspections.filter(i => i.status === 'submitted' || i.status === 'restocked'),
    [state.inspections]
  );

  const byUnit = useMemo(() => {
    const grouped = new Map<string, InspectionV2>();
    completedInspections
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(insp => {
        if (!grouped.has(insp.tailNumber)) {
          grouped.set(insp.tailNumber, insp);
        }
      });
    return Array.from(grouped.values());
  }, [completedInspections]);

  const byDate = useMemo(() =>
    [...completedInspections].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [completedInspections]
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const InspectionCard = ({ inspection }: { inspection: InspectionV2 }) => (
    <Card
      className="cursor-pointer hover:border-purple-500/30 transition-colors"
      onClick={() => setSelectedInspection(inspection)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30">
            {inspection.tailNumber}
          </Badge>
          <span className={`text-sm font-bold ${readinessColor(inspection.readinessScore)}`}>
            {inspection.readinessScore}%
          </span>
        </div>
        <p className="text-sm font-medium">{inspection.aircraftType}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" /> {inspection.reportedBy}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(inspection.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatTime(inspection.date)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Recently Completed</h1>
        <V2Badge />
      </div>

      <Tabs defaultValue="by-unit">
        <TabsList>
          <TabsTrigger value="by-unit">By Unit</TabsTrigger>
          <TabsTrigger value="by-date">By Date</TabsTrigger>
        </TabsList>

        <TabsContent value="by-unit" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byUnit.map(insp => (
              <InspectionCard key={insp.id} inspection={insp} />
            ))}
          </div>
          {byUnit.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No completed inspections yet</p>
          )}
        </TabsContent>

        <TabsContent value="by-date" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byDate.map(insp => (
              <InspectionCard key={insp.id} inspection={insp} />
            ))}
          </div>
          {byDate.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No completed inspections yet</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Inspection — {selectedInspection?.tailNumber} ({selectedInspection?.aircraftType})
            </DialogTitle>
          </DialogHeader>
          {selectedInspection && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reported by</span>
                  <span className="font-medium">{selectedInspection.reportedBy}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formatDate(selectedInspection.date)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Readiness</span>
                  <span className={`font-bold ${readinessColor(selectedInspection.readinessScore)}`}>
                    {selectedInspection.readinessScore}%
                  </span>
                </div>
                {selectedInspection.topLevelNotes && (
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Notes</p>
                    <p className="bg-muted/50 rounded-lg p-3">{selectedInspection.topLevelNotes}</p>
                  </div>
                )}
                {selectedInspection.checkedItems.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Checked Items</p>
                    <div className="space-y-1">
                      {selectedInspection.checkedItems.slice(0, 20).map(ci => {
                        const item = ITEMS_V2.find(i => i.id === ci.itemId);
                        if (!item) return null;
                        const isMissing = ci.qtyInUnit < ci.requiredQty;
                        return (
                          <div
                            key={ci.itemId}
                            className={`flex items-center justify-between text-sm p-2 rounded ${isMissing ? 'bg-red-500/10' : 'bg-muted/30'}`}
                          >
                            <span className="truncate flex-1">{item.itemName}</span>
                            <span className={`font-mono ${isMissing ? 'text-red-400' : ''}`}>
                              {ci.qtyInUnit} / {ci.requiredQty}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
