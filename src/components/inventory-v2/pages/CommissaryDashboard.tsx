import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { V2Badge } from '../shared/V2Badge';
import type { StockroomItem } from '../types';

// ─── Row ─────────────────────────────────────────────────────────────────────

function StockRow({
  si,
  itemName,
  label,
}: {
  si: StockroomItem;
  itemName: string;
  label: 'critical' | 'threshold';
}) {
  const navigate = useNavigate();
  const limitLabel = label === 'critical'
    ? `Minimum: ${si.minimumLevel}`
    : `Par: ${si.parLevel}`;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{itemName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {si.qtyOnHand} on hand · {limitLabel}
        </p>
      </div>
      <Button
        size="sm"
        className="h-7 shrink-0 px-3 text-xs"
        onClick={() => navigate(`/inventory-v2/receiving?itemId=${si.itemId}`)}
      >
        Restock →
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommissaryDashboard() {
  const { state } = useInventoryV2();

  const stockroomItems = state.stockroomItems.filter(
    si => si.stockroomId === state.selectedStockroomId
  );

  // At or below minimum → Critical
  const critical = stockroomItems.filter(si => si.qtyOnHand <= si.minimumLevel);

  // Above minimum but below par → Restock threshold
  const threshold = stockroomItems.filter(
    si => si.qtyOnHand > si.minimumLevel && si.qtyOnHand < si.parLevel
  );

  const okCount = stockroomItems.length - critical.length - threshold.length;

  function itemName(itemId: string) {
    return state.items.find(i => i.id === itemId)?.itemName ?? itemId;
  }

  const hasFlags = critical.length > 0 || threshold.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <OfflineBanner />

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Commissary</h1>
        <V2Badge variant="v2" size="md" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-xl">🔴</span>
            <div>
              <p className="text-2xl font-bold text-red-500">{critical.length}</p>
              <p className="text-xs text-muted-foreground">At or below minimum</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-xl">🟡</span>
            <div>
              <p className="text-2xl font-bold text-amber-500">{threshold.length}</p>
              <p className="text-xs text-muted-foreground">Below par level</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-2xl font-bold text-green-500">{okCount}</p>
              <p className="text-xs text-muted-foreground">Items OK</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert sections */}
      {!hasFlags ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14">
            <CheckCircle2 className="mb-3 h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">All items are at or above par level.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {critical.length > 0 && (
            <Card className="border-red-500/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-red-500">
                  🔴 Critical — At or Below Minimum
                  <Badge variant="destructive" className="ml-auto">{critical.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y">
                {critical.map(si => (
                  <StockRow key={si.itemId} si={si} itemName={itemName(si.itemId)} label="critical" />
                ))}
              </CardContent>
            </Card>
          )}

          {threshold.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-500">
                  🟡 Below Par Level
                  <Badge className="ml-auto bg-amber-500/20 text-amber-600 border-amber-500/30">{threshold.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y">
                {threshold.map(si => (
                  <StockRow key={si.itemId} si={si} itemName={itemName(si.itemId)} label="threshold" />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
