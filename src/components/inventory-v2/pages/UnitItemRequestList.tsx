import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/alert-dialog';
import { useInventoryV2 } from '../InventoryV2Context';
import { STATUS_COLORS } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { toast } from 'sonner';
import { Send, Plus, User, Calendar, Package } from 'lucide-react';
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

const getStatusColors = (status: UnitItemRequest['status']) => {
    switch (status) {
      case 'open':        return STATUS_COLORS.open;
      case 'in_progress': return STATUS_COLORS.in_progress_req; // amber, not blue
      case 'fulfilled':   return STATUS_COLORS.fulfilled;
      case 'cancelled':   return STATUS_COLORS.cancelled;
      default:            return STATUS_COLORS.open;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Send className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Unit Item Requests</h1>
          <V2Badge />
        </div>
        <Button
          onClick={() => navigate('/inventory-v2/unit-request')}
          className="btn-aviation-primary"
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
              className={`cursor-pointer hover:border-primary/30 transition-colors ${
                request.status === 'cancelled' ? 'opacity-50 pointer-events-none' : ''
              }`}
              onClick={() => request.status !== 'cancelled' && setSelectedRequest(request)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="status-badge bg-primary/10 text-primary border-primary/30">
                    {request.unitTailNumber}
                  </Badge>
                  <Badge className={`status-badge ${statusStyle.className}`}>
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
                    <Badge className={`status-badge ${getStatusColors(selectedRequest.status).className}`}>
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
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => {
                        dispatch({
                          type: 'UPDATE_UNIT_REQUEST',
                          payload: { ...selectedRequest, status: 'in_progress' },
                        });
                        setSelectedRequest(null);
                        toast.success('Request marked in progress');
                      }}
                    >
                      Mark In Progress
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        dispatch({
                          type: 'UPDATE_UNIT_REQUEST',
                          payload: { ...selectedRequest, status: 'fulfilled' },
                        });
                        setSelectedRequest(null);
                        toast.success('Request marked fulfilled');
                      }}
                    >
                      Mark Fulfilled
                    </Button>
                  </div>
                )}
                {selectedRequest.status === 'in_progress' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        dispatch({
                          type: 'UPDATE_UNIT_REQUEST',
                          payload: { ...selectedRequest, status: 'fulfilled' },
                        });
                        setSelectedRequest(null);
                        toast.success('Request marked fulfilled');
                      }}
                    >
                      Mark Fulfilled
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10">
                          Cancel Request
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This cannot be undone. The request will be marked cancelled.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep request</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              dispatch({
                                type: 'UPDATE_UNIT_REQUEST',
                                payload: { ...selectedRequest, status: 'cancelled' },
                              });
                              setSelectedRequest(null);
                              toast.success('Request cancelled');
                            }}
                          >
                            Cancel request
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
