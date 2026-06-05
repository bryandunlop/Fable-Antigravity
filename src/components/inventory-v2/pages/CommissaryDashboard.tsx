import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShoppingCart, ExternalLink, MonitorSmartphone, AlertCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { V2Badge } from '../shared/V2Badge';
import type { StockroomItem } from '../types';
import { formatRelativeTime } from '../shared/dateUtils';

// ─── Row ─────────────────────────────────────────────────────────────────────

function StockRow({
  si,
  itemName,
  label,
  reorderUrl,
}: {
  si: StockroomItem;
  itemName: string;
  label: 'critical' | 'threshold';
  reorderUrl?: string;
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
      <div className="flex items-center gap-2 shrink-0">
        {reorderUrl && (
          <a
            href={reorderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Reorder
          </a>
        )}
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => navigate(`/inventory-v2/receiving?itemId=${si.itemId}`)}
        >
          Restock →
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommissaryDashboard() {
  const { state, dispatch } = useInventoryV2();
  const sentLists = state.groceryLists.filter(gl => gl.status === 'sent');

  const stockroomItems = state.stockroomItems.filter(
    si => si.stockroomId === 'sr-1'
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

  function itemReorderUrl(itemId: string) {
    return state.items.find(i => i.id === itemId)?.reorderUrl;
  }

  const hasFlags = critical.length > 0 || threshold.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      <OfflineBanner />

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Commissary</h1>
        <V2Badge variant="v2" size="md" />
        <a
          href="/commissary-kiosk"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <MonitorSmartphone className="w-4 h-4" />
          Launch Kiosk
          <ExternalLink className="w-3 h-3 opacity-50" />
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-500">{critical.length}</p>
              <p className="text-xs text-muted-foreground">At or below minimum</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-amber-500">{threshold.length}</p>
              <p className="text-xs text-muted-foreground">Below par level</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/40 bg-green-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
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
                  <AlertCircle className="w-4 h-4" />
                  Critical — At or Below Minimum
                  <Badge variant="destructive" className="ml-auto">{critical.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y">
                {critical.map(si => (
                  <StockRow key={si.itemId} si={si} itemName={itemName(si.itemId)} label="critical" reorderUrl={itemReorderUrl(si.itemId)} />
                ))}
              </CardContent>
            </Card>
          )}

          {threshold.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                  Below Par Level
                  <Badge className="ml-auto bg-amber-500/20 text-amber-600 border-amber-500/30">{threshold.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y">
                {threshold.map(si => (
                  <StockRow key={si.itemId} si={si} itemName={itemName(si.itemId)} label="threshold" reorderUrl={itemReorderUrl(si.itemId)} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Grocery List Requests */}
      {sentLists.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart size={16} className="text-blue-400" />
              Grocery List Requests
              <span className="ml-auto text-xs font-normal text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">
                {sentLists.length} pending
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sentLists.map(gl => {
              const trip = state.trips.find(t => t.id === gl.tripId);
              return (
                <div key={gl.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded text-xs font-semibold border border-amber-500/30">
                        {gl.tailNumber}
                      </span>
                      <span className="text-sm font-semibold">{trip?.tripName ?? 'Unknown Trip'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {gl.generatedBy} · {gl.items.length} items · {formatRelativeTime(gl.generatedAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 shrink-0 px-3 text-xs bg-emerald-600 hover:bg-emerald-500"
                    onClick={() => dispatch({ type: 'FULFILL_GROCERY_LIST', payload: gl.id })}
                  >
                    Mark Fulfilled
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
