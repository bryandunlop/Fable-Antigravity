import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { useInventoryV2 } from '../InventoryV2Context';
import { readinessColor } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { Clock, Plane, ClipboardList, ArrowRight, AlertTriangle, Plus } from 'lucide-react';

export default function InspectionHistory() {
  const navigate = useNavigate();
  const { state } = useInventoryV2();

  const inProgress = state.inspections.filter(i => i.status === 'in_progress');
  const restockNeeded = state.inspections.filter(i => i.status === 'restocking_needed');

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">My Inspections</h1>
          <V2Badge />
        </div>
        <Button
          onClick={() => navigate('/inventory-v2/inspection')}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> New Inspection
        </Button>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* In Progress Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <h2 className="text-lg font-semibold">In Progress</h2>
            <Badge variant="outline">{inProgress.length}</Badge>
          </div>
          {inProgress.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No inspections in progress
              </CardContent>
            </Card>
          ) : (
            inProgress.map(inspection => (
              <Card
                key={inspection.id}
                className="cursor-pointer hover:border-purple-500/30 transition-colors"
                onClick={() => navigate(`/inventory-v2/inspection?resume=${inspection.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
                          {inspection.tailNumber}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{inspection.aircraftType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(inspection.date)}
                      </div>
                      <p className="text-sm">{inspection.reportedBy}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${readinessColor(inspection.readinessScore)}`}>
                        {inspection.readinessScore}%
                      </p>
                      <p className="text-xs text-muted-foreground">readiness</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Restock Needed Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <h2 className="text-lg font-semibold">Restock Needed</h2>
            <Badge variant="outline">{restockNeeded.length}</Badge>
          </div>
          {restockNeeded.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                No inspections need restocking
              </CardContent>
            </Card>
          ) : (
            restockNeeded.map(inspection => (
              <Card
                key={inspection.id}
                className="cursor-pointer hover:border-purple-500/30 transition-colors"
                onClick={() => navigate(`/inventory-v2/inspection?resume=${inspection.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">
                          {inspection.tailNumber}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{inspection.aircraftType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        {formatDate(inspection.date)}
                      </div>
                      <p className="text-sm">{inspection.reportedBy}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${readinessColor(inspection.readinessScore)}`}>
                        {inspection.readinessScore}%
                      </p>
                      <p className="text-xs text-muted-foreground">readiness</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={() => navigate('/inventory-v2/recently-completed')}>
          <ClipboardList className="w-4 h-4 mr-1" /> Recent Inspections
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/inventory-v2')}>
          <ArrowRight className="w-4 h-4 mr-1" /> Inventory Dashboard
        </Button>
      </div>
    </div>
  );
}
