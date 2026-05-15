import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet';
import { useInventoryV2 } from '../InventoryV2Context';
import { STATUS_COLORS } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { toast } from 'sonner';
import { Send, Plus, User, Calendar, Package, Check } from 'lucide-react';
import type { UnitItemRequest } from '../types';

export default function UnitItemRequestList() {
  const navigate = useNavigate();
  const { state, dispatch } = useInventoryV2();
  const [selectedRequest, setSelectedRequest] = useState<UnitItemRequest | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const getItem = (itemId: string) => state.items.find(i => i.id === itemId);

  const handleFulfill = (request: UnitItemRequest) => {
    dispatch({
      type: 'UPDATE_UNIT_REQUEST',
      payload: { ...request, status: 'fulfilled' },
    });
    setSelectedRequest(null);
    toast.success('Request marked as fulfilled');
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'open': return STATUS_COLORS.open;
      case 'fulfilled': return STATUS_COLORS.fulfilled;
      case 'cancelled': return STATUS_COLORS.cancelled;
      default: return STATUS_COLORS.open;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Send className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold">Unit Item Requests</h1>
          <V2Badge />
        </div>
        <Button
          onClick={() => navigate('/inventory-v2/unit-request')}
          className="bg-purple-500 hover:bg-purple-600 text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> New Request
        </Button>
      </div>

      {/* Request Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.unitItemRequests.map(request => {
          const statusStyle = getStatusColors(request.status);
          return (
            <Card
              key={request.id}
              className="cursor-pointer hover:border-purple-500/30 transition-colors"
              onClick={() => setSelectedRequest(request)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30">
                    {request.unitTailNumber}
                  </Badge>
                  <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                    {statusStyle.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={request.isGuestRequest ? 'default' : 'outline'} className={request.isGuestRequest ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : ''}>
                    {request.isGuestRequest ? 'Guest' : 'Non-Guest'}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" /> {request.items.length} items
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {request.requestedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(request.requestDate)}
                  </span>
                </div>
                {request.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{request.notes}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {state.unitItemRequests.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No unit item requests yet
          </CardContent>
        </Card>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Request — {selectedRequest.unitTailNumber}
                  <Badge className={selectedRequest.isGuestRequest ? 'bg-amber-500/15 text-amber-400' : ''}>
                    {selectedRequest.isGuestRequest ? 'Guest' : 'Non-Guest'}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested by</span>
                    <span className="font-medium">{selectedRequest.requestedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{formatDate(selectedRequest.requestDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className={`${getStatusColors(selectedRequest.status).bg} ${getStatusColors(selectedRequest.status).text}`}>
                      {getStatusColors(selectedRequest.status).label}
                    </Badge>
                  </div>
                </div>
                {selectedRequest.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted/50 rounded-lg p-3">{selectedRequest.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium mb-2">Items ({selectedRequest.items.length})</p>
                  <div className="space-y-2">
                    {selectedRequest.items.map(line => {
                      const item = getItem(line.itemId);
                      return (
                        <div key={line.itemId} className="flex items-center justify-between p-2 rounded bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{item?.itemName ?? 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">On hand: {line.qtyOnHand}</p>
                          </div>
                          <Badge>{line.qtyRequested} {line.uom}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {selectedRequest.status === 'open' && (
                  <Button
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => handleFulfill(selectedRequest)}
                  >
                    <Check className="w-4 h-4 mr-1" /> Mark Fulfilled
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
