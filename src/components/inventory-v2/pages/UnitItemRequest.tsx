import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../../ui/collapsible';
import { useInventoryV2 } from '../InventoryV2Context';
import { SUPPLY_CATEGORIES, MOCK_USERS } from '../constants';
import { V2Badge } from '../shared/V2Badge';
import { SearchableUnitSelect } from '../shared/SearchableUnitSelect';
import { toast } from 'sonner';
import { Send, Plus, Minus, Search, ChevronDown, Package, User, Users } from 'lucide-react';
import type { UnitItemRequest as UnitItemRequestType } from '../types';

export default function UnitItemRequest() {
  const navigate = useNavigate();
  const { state, dispatch } = useInventoryV2();
  const [selectedUnit, setSelectedUnit] = useState('');
  const [isGuestRequest, setIsGuestRequest] = useState(true);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [requestedItems, setRequestedItems] = useState<Record<string, number>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const filteredItems = useMemo(() => {
    if (!search.trim()) return state.items;
    const q = search.toLowerCase();
    return state.items.filter(i =>
      i.itemName.toLowerCase().includes(q) ||
      i.internalItemNumber?.toLowerCase().includes(q)
    );
  }, [search, state.items]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    SUPPLY_CATEGORIES.forEach(cat => {
      const catItems = filteredItems.filter(i => i.supplyCategory === cat.id);
      if (catItems.length > 0) groups[cat.id] = catItems;
    });
    return groups;
  }, [filteredItems]);

  const getStockroomQty = (itemId: string) => {
    const si = state.stockroomItems.find(s => s.itemId === itemId && s.stockroomId === 'sr-1');
    return si?.qtyOnHand ?? 0;
  };

  const handleQtyChange = (itemId: string, delta: number) => {
    setRequestedItems(prev => {
      const current = prev[itemId] ?? 0;
      const newQty = Math.max(0, current + delta);
      if (newQty === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const handleSubmit = () => {
    if (!selectedUnit) {
      toast.error('Please select an aircraft unit');
      return;
    }
    const items = Object.entries(requestedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = state.items.find(i => i.id === itemId)!;
        return {
          itemId,
          qtyOnHand: getStockroomQty(itemId),
          qtyRequested: qty,
          uom: item.uom,
        };
      });

    if (items.length === 0) {
      toast.error('Please request at least one item');
      return;
    }

    const request: UnitItemRequestType = {
      id: `req-${Date.now()}`,
      unitTailNumber: selectedUnit,
      isGuestRequest,
      notes,
      status: 'open',
      requestedBy: MOCK_USERS[0].name,
      requestDate: new Date().toISOString(),
      items,
    };

    dispatch({ type: 'ADD_UNIT_REQUEST', payload: request });
    toast.success('Request submitted');
    navigate('/inventory-v2/unit-requests');
  };

  const totalRequested = Object.values(requestedItems).reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Send className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">New Unit Item Request</h1>
        <V2Badge />
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Aircraft Unit</label>
              <SearchableUnitSelect value={selectedUnit} onValueChange={setSelectedUnit} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Request Type</label>
              <div className="flex gap-2">
                <Button
                  variant={isGuestRequest ? 'default' : 'outline'}
                  className={isGuestRequest ? 'btn-aviation-primary' : ''}
                  onClick={() => setIsGuestRequest(true)}
                >
                  <User className="w-4 h-4 mr-1" /> Guest Request
                </Button>
                <Button
                  variant={!isGuestRequest ? 'default' : 'outline'}
                  className={!isGuestRequest ? 'btn-aviation-primary' : ''}
                  onClick={() => setIsGuestRequest(false)}
                >
                  <Users className="w-4 h-4 mr-1" /> Non-Guest
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Describe the request..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Items by category */}
      <div className="space-y-3">
        {SUPPLY_CATEGORIES.map(cat => {
          const catItems = groupedByCategory[cat.id];
          if (!catItems || catItems.length === 0) return null;
          const isOpen = openSections[cat.id] !== false;

          return (
            <Collapsible key={cat.id} open={isOpen} onOpenChange={() => setOpenSections(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between bg-slate-800 text-white rounded-lg px-4 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    <span className="font-bold text-sm">{cat.label}</span>
                    <Badge variant="outline" className="text-white/70 border-white/30 text-xs">{catItems.length}</Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 space-y-0.5">
                  {catItems.map(item => {
                    const qty = requestedItems[item.id] ?? 0;
                    const stockQty = getStockroomQty(item.id);
                    return (
                      <div key={item.id} className="grid grid-cols-[40px_1fr_80px_60px_100px_50px] gap-2 px-4 py-2 rounded items-center text-sm hover:bg-muted/30">
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium truncate block">{item.itemName}</span>
                          <span className="text-xs text-muted-foreground">{item.internalItemNumber}</span>
                        </div>
                        <Badge variant="outline" className="text-xs justify-center">
                          On Hand: {stockQty}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQtyChange(item.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center font-mono font-bold">{qty}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQtyChange(item.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-center text-xs text-muted-foreground">qty</span>
                        <Badge className="text-xs">{item.uom}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t pt-4 pb-2 flex items-center justify-between">
        <Badge variant="outline">{totalRequested} item(s) requested</Badge>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/inventory-v2/unit-requests')}>Cancel</Button>
          <Button onClick={handleSubmit} className="btn-aviation-primary">
            <Send className="w-4 h-4 mr-1" /> Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}
