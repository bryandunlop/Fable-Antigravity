import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Bell, Package, PackagePlus, ClipboardList, RefreshCw, Settings } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useInventoryV2 } from '../InventoryV2Context';
import { UserSwitcher } from '../shared/UserSwitcher';
import { AlertBell } from '../shared/AlertBell';
import { OfflineBanner } from '../shared/OfflineBanner';
import { Button } from '../../ui/button';

// ─── Sidebar Link ─────────────────────────────────────────────────────────────

function SidebarLink({
  icon: Icon,
  label,
  to,
  active,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  active?: boolean;
  badge?: number;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
        active
          ? 'bg-indigo-600 text-white font-semibold'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Alert Row ────────────────────────────────────────────────────────────────

function AlertRow({
  alertId,
  itemName,
  currentQty,
  threshold,
  triggeredAt,
}: {
  alertId: string;
  itemName: string;
  currentQty: number;
  threshold: number;
  triggeredAt: string;
}) {
  const { dispatch } = useInventoryV2();
  const navigate = useNavigate();
  const ago = formatDistanceToNow(new Date(triggeredAt), { addSuffix: false });

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{itemName}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {currentQty} on hand · Restock threshold: {threshold} · Triggered {ago} ago
        </p>
        <p className="mt-1 text-[10px] italic text-slate-500">
          Auto-resolves when qty goes above {threshold}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Button
          size="sm"
          className="h-7 bg-indigo-600 px-2.5 text-xs hover:bg-indigo-500"
          onClick={() => navigate(`/inventory-v2/receiving?itemId=${alertId}`)}
        >
          Restock →
        </Button>
        <button
          className="text-[10px] text-slate-500 underline hover:text-slate-300"
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
  const navigate = useNavigate();

  const activeAlerts = state.alerts.filter(
    a => a.userId === state.currentUser.id && !a.resolvedAt && !a.dismissed
  );

  const criticalAlerts = activeAlerts.filter(a => {
    const si = state.stockroomItems.find(
      s => s.itemId === a.itemId && s.stockroomId === a.stockroomId
    );
    return si && si.qtyOnHand <= si.minimumLevel;
  });

  const thresholdAlerts = activeAlerts.filter(a => !criticalAlerts.includes(a));

  const stockroomItemCount = state.stockroomItems.filter(
    si => si.stockroomId === state.selectedStockroomId
  ).length;
  const okCount = Math.max(stockroomItemCount - activeAlerts.length, 0);

  function itemName(itemId: string) {
    return state.items.find(i => i.id === itemId)?.itemName ?? itemId;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1117]">
      <OfflineBanner />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/[0.06] bg-[#1a1d2e] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-sm">✈</div>
          <span className="text-sm font-semibold text-slate-200">myGFO Inventory</span>
        </div>
        <div className="flex items-center gap-3">
          <AlertBell />
          <UserSwitcher />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="flex w-44 shrink-0 flex-col gap-1 border-r border-white/[0.06] bg-[#131520] p-2">
          <SidebarLink icon={Home} label="Commissary Home" to="/inventory-v2/commissary" active />
          <SidebarLink icon={Bell} label="My Alerts" to="/inventory-v2/alerts" badge={activeAlerts.length} />
          <SidebarLink icon={Package} label="Stockroom Count" to="/inventory-v2/stockroom" />
          <SidebarLink icon={PackagePlus} label="Add to Stock" to="/inventory-v2/receiving" />
          <div className="my-1 border-t border-white/[0.06]" />
          <SidebarLink icon={ClipboardList} label="New Inspection" to="/inventory-v2/inspection" />
          <SidebarLink icon={RefreshCw} label="Pick List" to="/inventory-v2/pick-list" />
          <div className="my-1 border-t border-white/[0.06]" />
          <SidebarLink icon={Settings} label="Settings" to="/inventory-v2/settings" />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4">
          {/* Summary cards */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <span className="text-xl">🔴</span>
              <div>
                <p className="text-lg font-bold text-red-300">{criticalAlerts.length}</p>
                <p className="text-[10px] text-slate-400">Critical — at minimum</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <span className="text-xl">🟡</span>
              <div>
                <p className="text-lg font-bold text-amber-300">{thresholdAlerts.length}</p>
                <p className="text-[10px] text-slate-400">Restock threshold</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-lg font-bold text-green-300">{okCount}</p>
                <p className="text-[10px] text-slate-400">Items OK</p>
              </div>
            </div>
          </div>

          {/* Alert sections */}
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="mb-3 h-10 w-10 text-green-400" />
              <p className="text-sm font-medium text-slate-300">
                All items are above their restock thresholds.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {criticalAlerts.length > 0 && (
                <section>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
                    🔴 Critical — At or Below Minimum
                  </p>
                  <div className="divide-y divide-white/[0.05] overflow-hidden rounded-lg border border-red-500/40 bg-[#1a1d2e]">
                    {criticalAlerts.map(a => (
                      <AlertRow
                        key={a.id}
                        alertId={a.id}
                        itemName={itemName(a.itemId)}
                        currentQty={a.currentQty}
                        threshold={a.threshold}
                        triggeredAt={a.triggeredAt}
                      />
                    ))}
                  </div>
                </section>
              )}
              {thresholdAlerts.length > 0 && (
                <section>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    🟡 Restock Threshold
                  </p>
                  <div className="divide-y divide-white/[0.05] overflow-hidden rounded-lg border border-amber-500/30 bg-[#1a1d2e]">
                    {thresholdAlerts.map(a => (
                      <AlertRow
                        key={a.id}
                        alertId={a.id}
                        itemName={itemName(a.itemId)}
                        currentQty={a.currentQty}
                        threshold={a.threshold}
                        triggeredAt={a.triggeredAt}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
