import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Label } from '../../ui/label';
import { useInventoryV2 } from '../InventoryV2Context';
import { STATUS_COLORS } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { toast } from 'sonner';
import { Truck, Search, Package, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { PurchaseOrder, POLineItem } from '../types';

export default function Receiving() {
  const { state, dispatch } = useInventoryV2();
  const [search, setSearch] = useState('');
  const [showAllStockrooms, setShowAllStockrooms] = useState(false);
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});

  const filteredPOs = useMemo(() => {
    let pos = state.purchaseOrders;
    if (!showAllStockrooms) {
      pos = pos.filter(po => po.stockroomId === state.selectedStockroomId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      pos = pos.filter(po =>
        po.poNumber.toLowerCase().includes(q) ||
        po.vendor.toLowerCase().includes(q)
      );
    }
    return pos;
  }, [state.purchaseOrders, state.selectedStockroomId, showAllStockrooms, search]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStockroomName = (id: string) => {
    return state.stockrooms.find(s => s.id === id)?.name ?? id;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'outstanding': return STATUS_COLORS.outstanding;
      case 'partially_received': return STATUS_COLORS.partially_received;
      case 'fully_received': return STATUS_COLORS.fully_received;
      default: return STATUS_COLORS.outstanding;
    }
  };

  const handleReceive = (po: PurchaseOrder) => {
    // Update PO line items with received quantities
    const updatedLineItems = po.lineItems.map(li => {
      const received = receivedQtys[li.id] ?? li.qtyReceived;
      return { ...li, qtyReceived: received };
    });

    const allReceived = updatedLineItems.every(li => li.qtyReceived >= li.qtyOrdered);
    const someReceived = updatedLineItems.some(li => li.qtyReceived > 0);

    const updatedPO: PurchaseOrder = {
      ...po,
      lineItems: updatedLineItems,
      status: allReceived ? 'fully_received' : someReceived ? 'partially_received' : 'outstanding',
    };

    dispatch({ type: 'UPDATE_PURCHASE_ORDER', payload: updatedPO });

    // Update stockroom quantities for received items
    updatedLineItems.forEach(li => {
      const prevReceived = po.lineItems.find(p => p.id === li.id)?.qtyReceived ?? 0;
      const newlyReceived = li.qtyReceived - prevReceived;
      if (newlyReceived > 0) {
        const existingSI = state.stockroomItems.find(
          si => si.itemId === li.itemId && si.stockroomId === po.stockroomId
        );
        if (existingSI) {
          dispatch({
            type: 'UPDATE_STOCKROOM_ITEM',
            payload: { ...existingSI, qtyOnHand: existingSI.qtyOnHand + newlyReceived },
          });
        }
      }
    });

    toast.success(`PO ${po.poNumber} updated. ${allReceived ? 'Fully received!' : 'Partially received.'}`);
    setExpandedPO(null);
    setReceivedQtys({});
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Truck className="w-6 h-6 text-purple-500" />
        <h1 className="text-2xl font-bold">Receiving</h1>
        <V2Badge />
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Find order by PO # or vendor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-stockrooms"
                checked={showAllStockrooms}
                onCheckedChange={(c: boolean) => setShowAllStockrooms(!!c)}
              />
              <Label htmlFor="all-stockrooms" className="text-sm">Show all stockrooms</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PO List */}
      <div className="space-y-3">
        {filteredPOs.map(po => {
          const statusStyle = getStatusStyle(po.status);
          const isExpanded = expandedPO === po.id;

          return (
            <Card key={po.id} className={isExpanded ? 'border-purple-500/30' : ''}>
              <CardContent className="p-0">
                {/* PO Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedPO(isExpanded ? null : po.id)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{po.poNumber}</span>
                      <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                        {statusStyle.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{po.vendor}</span>
                      <span>{formatDate(po.orderDate)}</span>
                      {showAllStockrooms && <span className="text-xs">({getStockroomName(po.stockroomId)})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{po.lineItems.length} items</Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* PO Detail */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Line items table */}
                    <div className="space-y-1">
                      <div className="grid grid-cols-[1fr_80px_80px_80px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 rounded">
                        <span>Description</span>
                        <span className="text-center">Ordered</span>
                        <span className="text-center">Received</span>
                        <span className="text-center">Remaining</span>
                      </div>
                      {po.lineItems.map(li => {
                        const received = receivedQtys[li.id] ?? li.qtyReceived;
                        const remaining = li.qtyOrdered - received;
                        return (
                          <div
                            key={li.id}
                            className="grid grid-cols-[1fr_80px_80px_80px] gap-3 px-3 py-2 rounded items-center text-sm hover:bg-muted/30"
                          >
                            <span className="font-medium">{li.description}</span>
                            <span className="text-center">{li.qtyOrdered}</span>
                            <Input
                              type="number"
                              min={0}
                              max={li.qtyOrdered}
                              value={receivedQtys[li.id] ?? li.qtyReceived}
                              onChange={e => {
                                const val = Math.min(li.qtyOrdered, Math.max(0, parseInt(e.target.value) || 0));
                                setReceivedQtys(prev => ({ ...prev, [li.id]: val }));
                              }}
                              className="h-8 text-center"
                            />
                            <span className={`text-center ${remaining > 0 ? 'text-amber-500 font-medium' : 'text-emerald-500'}`}>
                              {remaining}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      onClick={() => handleReceive(po)}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      <Check className="w-4 h-4 mr-1" /> Receive
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPOs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No purchase orders found
          </CardContent>
        </Card>
      )}
    </div>
  );
}
