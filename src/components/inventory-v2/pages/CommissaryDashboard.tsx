import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import { OfflineBanner } from '../shared/OfflineBanner';
import { V2Badge } from '../shared/V2Badge';

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({
  alertId,
  itemId,
  itemName,
  currentQty,
  threshold,
  triggeredAt,
}: {
  alertId: string;
  itemId: string;
  itemName: string;
  currentQty: number;
  threshold: number;
  triggeredAt: string;
}) {
  const { dispatch } = useInventoryV2();
  const navigate = useNavigate();
  const ago = formatDistanceToNow(new Date(triggeredAt), { addSuffix: false });

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{itemName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {currentQty} on hand · Restock threshold: {threshold} · Triggered {ago} ago
        </p>
        <p className="mt-0.5 text-[11px] italic text-muted-foreground/70">
          Auto-resolves when qty goes above {threshold}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => navigate(`/inventory-v2/receiving?itemId=${itemId}`)}
        >
          Restock →
        </Button>
        <button
          className="text-[11px] text-muted-foreground underline hover:text-foreground"
          onClick={() => dispatch({ type: 'DISMISS_ALERT', payload: alertId })}
        >
          dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommissaryDashboard() {
  const { state } = useInventoryV2();

  const activeAlerts = state.alerts.filter(
    a =>
      a.userId === state.currentUser.id &&
      a.stockroomId === state.selectedStockroomId &&
      !a.resolvedAt &&
      !a.dismissed
  );

  const criticalAlerts = activeAlerts.filter(a => {
    const si = state.stockroomItems.find(
      s => s.itemId === a.itemId && s.stockroomId === a.stockroomId
    );
    return si && si.qtyOnHand <= si.minimumLevel;
  });

  const criticalIds = new Set(criticalAlerts.map(a => a.id));
  const thresholdAlerts = activeAlerts.filter(a => !criticalIds.has(a.id));

  const stockroomItemCount = state.stockroomItems.filter(
    si => si.stockroomId === state.selectedStockroomId
  ).length;
  const okCount = Math.max(stockroomItemCount - activeAlerts.length, 0);

  function itemName(itemId: string) {
    return state.items.find(i => i.id === itemId)?.itemName ?? itemId;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <OfflineBanner />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Commissary</h1>
          <V2Badge variant="v2" size="md" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-xl">🔴</span>
            <div>
              <p className="text-2xl font-bold text-red-500">{criticalAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Critical — at minimum</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-xl">🟡</span>
            <div>
              <p className="text-2xl font-bold text-amber-500">{thresholdAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Restock threshold</p>
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
      {activeAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14">
            <CheckCircle2 className="mb-3 h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">All items are above their restock thresholds.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Set thresholds in Settings → My Alerts to receive notifications.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {criticalAlerts.length > 0 && (
            <Card className="border-red-500/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-red-500">
                  🔴 Critical — At or Below Minimum
                  <Badge variant="destructive" className="ml-auto">{criticalAlerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y">
                {criticalAlerts.map(a => (
                  <AlertRow
                    key={a.id}
                    alertId={a.id}
                    itemId={a.itemId}
                    itemName={itemName(a.itemId)}
                    currentQty={a.currentQty}
                    threshold={a.threshold}
                    triggeredAt={a.triggeredAt}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {thresholdAlerts.length > 0 && (
            <Card className="border-amber-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-amber-500">
                  🟡 Restock Threshold
                  <Badge className="ml-auto bg-amber-500/20 text-amber-600 border-amber-500/30">{thresholdAlerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 divide-y">
                {thresholdAlerts.map(a => (
                  <AlertRow
                    key={a.id}
                    alertId={a.id}
                    itemId={a.itemId}
                    itemName={itemName(a.itemId)}
                    currentQty={a.currentQty}
                    threshold={a.threshold}
                    triggeredAt={a.triggeredAt}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
