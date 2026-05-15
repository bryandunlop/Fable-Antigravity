import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Button } from '../../ui/button';
import { useInventoryV2 } from '../InventoryV2Context';
import type { CommissaryAlert } from '../types';

function StatusBadge({ alert }: { alert: Pick<CommissaryAlert, 'resolvedAt' | 'dismissed'> }) {
  if (alert.dismissed) {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-500/20 text-slate-400">Dismissed</span>;
  }
  if (alert.resolvedAt) {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-400">Resolved</span>;
  }
  return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-red-500/20 text-red-400">Active</span>;
}

function AlertTable({ alerts }: { alerts: CommissaryAlert[] }) {
  const { state, dispatch } = useInventoryV2();
  const navigate = useNavigate();

  function itemName(itemId: string) {
    return state.items.find(i => i.id === itemId)?.itemName ?? itemId;
  }

  function stockroomName(stockroomId: string) {
    return state.stockrooms.find(s => s.id === stockroomId)?.name ?? stockroomId;
  }

  if (alerts.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No alerts to show.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-xs text-slate-500">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 font-medium">Stockroom</th>
            <th className="pb-2 text-right font-medium">On Hand</th>
            <th className="pb-2 text-right font-medium">Threshold</th>
            <th className="pb-2 font-medium">Triggered</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {alerts.map(a => (
            <tr key={a.id} className="text-slate-300">
              <td className="py-2.5 font-medium text-slate-100">{itemName(a.itemId)}</td>
              <td className="py-2.5 text-slate-400">{stockroomName(a.stockroomId)}</td>
              <td className="py-2.5 text-right">{a.currentQty}</td>
              <td className="py-2.5 text-right">{a.threshold}</td>
              <td className="py-2.5 text-xs text-slate-400">
                {formatDistanceToNow(new Date(a.triggeredAt), { addSuffix: true })}
              </td>
              <td className="py-2.5"><StatusBadge alert={a} /></td>
              <td className="py-2.5">
                {!a.resolvedAt && !a.dismissed && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-6 bg-indigo-600 px-2 text-[11px] hover:bg-indigo-500"
                      onClick={() => navigate(`/inventory-v2/receiving?itemId=${a.itemId}`)}
                    >
                      Restock →
                    </Button>
                    <button
                      className="text-[11px] text-slate-500 underline hover:text-slate-300"
                      onClick={() => dispatch({ type: 'DISMISS_ALERT', payload: a.id })}
                    >
                      dismiss
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlertsPage() {
  const { state } = useInventoryV2();
  const navigate = useNavigate();

  const myAlerts = state.alerts
    .filter(a => a.userId === state.currentUser.id)
    .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());

  const active = myAlerts.filter(a => !a.resolvedAt && !a.dismissed);

  const history = myAlerts.filter(a => {
    if (!a.resolvedAt && !a.dismissed) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const compareDate = a.resolvedAt ? new Date(a.resolvedAt) : new Date(a.triggeredAt);
    return compareDate >= cutoff;
  });

  return (
    <div className="min-h-screen bg-[#0f1117] p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/inventory-v2/commissary')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Bell className="h-5 w-5 text-slate-400" />
          <h1 className="text-lg font-semibold text-slate-100">My Alerts</h1>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active
              {active.length > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {active.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History (30d)</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <AlertTable alerts={active} />
          </TabsContent>
          <TabsContent value="history">
            <AlertTable alerts={history} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
