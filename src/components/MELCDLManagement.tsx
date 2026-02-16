import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Plus,
  Plane,
  Shield,
  Search
} from 'lucide-react';
import { useMaintenanceContext } from './contexts/MaintenanceContext';
import { toast } from 'sonner';
import DeferralDialog from './maintenance/DeferralDialog';
import { Input } from './ui/input';

export default function MELCDLManagement() {
  const { squawks, updateSquawk } = useMaintenanceContext();

  const [isDeferralDialogOpen, setIsDeferralDialogOpen] = useState(false);
  const [isSquawkSelectorOpen, setIsSquawkSelectorOpen] = useState(false);
  const [selectedSquawkId, setSelectedSquawkId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get all deferred squawks
  const deferredSquawks = squawks.filter(s => s.status === 'deferred' && s.deferral);

  // Filter open squawks for selection
  const openSquawks = squawks.filter(s =>
    s.status === 'open' &&
    (s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.aircraftTail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.ataChapter.includes(searchTerm))
  );

  // Calculate days remaining for each deferral
  const calculateDaysRemaining = (expiryDateString: string) => {
    const now = new Date();
    const expiry = new Date(expiryDateString);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Get alert status based on days remaining
  const getAlertStatus = (daysRemaining: number): 'ok' | 'warning' | 'critical' | 'expired' => {
    if (daysRemaining < 0) return 'expired';
    if (daysRemaining <= 2) return 'critical';
    if (daysRemaining <= 5) return 'warning';
    return 'ok';
  };

  // Categorize deferrals
  const categorization = {
    expired: deferredSquawks.filter(s => calculateDaysRemaining(s.deferral!.expiresAt) < 0),
    critical: deferredSquawks.filter(s => {
      const days = calculateDaysRemaining(s.deferral!.expiresAt);
      return days >= 0 && days <= 2;
    }),
    warning: deferredSquawks.filter(s => {
      const days = calculateDaysRemaining(s.deferral!.expiresAt);
      return days > 2 && days <= 5;
    }),
    ok: deferredSquawks.filter(s => calculateDaysRemaining(s.deferral!.expiresAt) > 5)
  };

  const handleCreateDeferral = (squawkId: string) => {
    setSelectedSquawkId(squawkId);
    setIsSquawkSelectorOpen(false);
    setIsDeferralDialogOpen(true);
  };

  const handleExtendDeferral = (squawk: any) => {
    const currentExpiry = new Date(squawk.deferral.expiresAt);

    // Determine extension based on category
    const extensionDays = {
      'A': 1,
      'B': 3,
      'C': 10,
      'D': 120
    }[squawk.deferral.category as 'A' | 'B' | 'C' | 'D'] || 10;

    currentExpiry.setDate(currentExpiry.getDate() + extensionDays);

    updateSquawk(squawk.id, {
      deferral: {
        ...squawk.deferral,
        expiresAt: currentExpiry.toISOString()
      },
      notes: `Deferral extended by ${extensionDays} days`
    });

    toast.success('Deferral Extended', {
      description: `Extended by ${extensionDays} days`
    });
  };

  const handleClearDeferral = (squawk: any) => {
    updateSquawk(squawk.id, {
      status: 'closed',
      closedAt: new Date(),
      closedBy: 'Current User', // Should ideally come from context
      deferral: undefined, // Or move to history
      notes: 'Deferral cleared and squawk closed.'
    });

    toast.success('Deferral Cleared', {
      description: `Squawk ${squawk.id} repaired and returned to service`
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'A': return 'bg-red-100 text-red-800 border-red-200';
      case 'B': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertBadge = (status: string) => {
    switch (status) {
      case 'expired': return <Badge className="bg-red-100 text-red-800">EXPIRED</Badge>;
      case 'critical': return <Badge className="bg-orange-100 text-orange-800">CRITICAL</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">WARNING</Badge>;
      default: return <Badge className="bg-green-100 text-green-800">OK</Badge>;
    }
  };

  const DeferralCard = ({ squawk }: { squawk: any }) => {
    const daysRemaining = calculateDaysRemaining(squawk.deferral.expiresAt);
    const alertStatus = getAlertStatus(daysRemaining);

    return (
      <Card className={`
        ${alertStatus === 'expired' ? 'border-red-500 bg-red-50' : ''}
        ${alertStatus === 'critical' ? 'border-orange-500 bg-orange-50' : ''}
        ${alertStatus === 'warning' ? 'border-yellow-500 bg-yellow-50' : ''}
      `}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm">{squawk.id}</span>
                <Badge className={getCategoryColor(squawk.deferral.category)}>
                  Category {squawk.deferral.category}
                </Badge>
                {getAlertBadge(alertStatus)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Plane className="w-3 h-3" />
                <span>{squawk.aircraftTail}</span>
                <span>•</span>
                <span>ATA {squawk.ataChapter}</span>
              </div>
              <p className="text-sm mb-2 font-medium">{squawk.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-3 bg-white/50 p-2 rounded-md">
            <div>
              <span className="text-muted-foreground block text-xs uppercase">MEL Reference</span>
              <span className="font-mono font-medium">{squawk.deferral.melItemId}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase">Authorized By</span>
              <span className="font-medium">{squawk.deferral.deferredBy}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase">Expires</span>
              <span className="font-medium">
                {new Date(squawk.deferral.expiresAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase">Remaining</span>
              <span className={`font-medium ${daysRemaining < 0 ? 'text-red-600' :
                  daysRemaining <= 2 ? 'text-orange-600' :
                    'text-green-600'
                }`}>
                {daysRemaining < 0 ? `Expired ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days`}
              </span>
            </div>
          </div>

          {squawk.deferral.limitations && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Operational Limitations</p>
              <div className="text-sm bg-amber-50 text-amber-900 p-2 rounded border border-amber-100">
                {squawk.deferral.limitations}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end mt-4 pt-2 border-t border-black/5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExtendDeferral(squawk)}
              disabled={daysRemaining < 0}
            >
              <Clock className="w-3 h-3 mr-1" />
              Extend
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => handleClearDeferral(squawk)}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Clear Deferral
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MEL/CDL Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage active deferrals across the fleet
          </p>
        </div>
        <Button onClick={() => setIsSquawkSelectorOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Deferral
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Expired', count: categorization.expired.length, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
          { label: 'Critical (≤48h)', count: categorization.critical.length, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: 'Warning (3-5d)', count: categorization.warning.length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
          { label: 'Good Standing', count: categorization.ok.length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
        ].map((stat, i) => (
          <Card key={i} className={`${stat.bg} ${stat.border}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${stat.color}`}>{stat.label}</p>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.count}</p>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Active ({deferredSquawks.length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({categorization.expired.length})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({categorization.critical.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {deferredSquawks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No active deferrals</div>
          ) : (
            deferredSquawks.map(s => <DeferralCard key={s.id} squawk={s} />)
          )}
        </TabsContent>
        <TabsContent value="expired" className="space-y-4">
          {categorization.expired.map(s => <DeferralCard key={s.id} squawk={s} />)}
        </TabsContent>
        <TabsContent value="critical" className="space-y-4">
          {categorization.critical.map(s => <DeferralCard key={s.id} squawk={s} />)}
        </TabsContent>
      </Tabs>

      {/* Squawk Selection Dialog */}
      <Dialog open={isSquawkSelectorOpen} onOpenChange={setIsSquawkSelectorOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Squawk to Defer</DialogTitle>
            <DialogDescription>Choose an open squawk to initiate the MEL deferral process.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center border rounded-md px-3 mb-4">
            <Search className="w-4 h-4 text-muted-foreground mr-2" />
            <Input
              className="border-0 focus-visible:ring-0"
              placeholder="Search by tail, ATA, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {openSquawks.map(s => (
                <div key={s.id} className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer flex justify-between items-center group" onClick={() => handleCreateDeferral(s.id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{s.aircraftTail}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{s.id}</span>
                      <Badge className={s.priority === 'critical' ? 'bg-red-500' : 'bg-slate-500'}>{s.priority}</Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{s.description}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
                    Select <Shield className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ))}
              {openSquawks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No matching open squawks found.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Actual Deferral Dialog */}
      {selectedSquawkId && (
        <DeferralDialog
          open={isDeferralDialogOpen}
          onOpenChange={setIsDeferralDialogOpen}
          squawkId={selectedSquawkId}
          onComplete={() => {
            setIsDeferralDialogOpen(false);
            setSelectedSquawkId(null);
            toast.success('Deferral Process Completed');
          }}
        />
      )}
    </div>
  );
}
