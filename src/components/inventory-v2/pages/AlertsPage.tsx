import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { Button } from '../../ui/button';
import { useInventoryV2 } from '../InventoryV2Context';
import { useNotificationContext } from '../../contexts/NotificationContext';
import type { Notification } from '../../contexts/NotificationContext';

function PriorityBadge({ priority }: { priority: Notification['priority'] }) {
  if (priority === 'critical') {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-600">Critical</span>;
  }
  if (priority === 'high') {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-orange-500/15 text-orange-600">High</span>;
  }
  if (priority === 'medium') {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-yellow-500/15 text-yellow-600">Medium</span>;
  }
  return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">Low</span>;
}

function ReadBadge({ isRead }: { isRead: boolean }) {
  if (isRead) {
    return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground">Read</span>;
  }
  return <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-red-500/15 text-red-600">Unread</span>;
}

function AlertTable({ notifications }: { notifications: Notification[] }) {
  const { state } = useInventoryV2();
  const { markAsRead, deleteNotification } = useNotificationContext();
  const navigate = useNavigate();

  // Try to extract an item name from the notification title (best effort)
  function stockroomName(stockroomId: string) {
    return state.stockrooms.find(s => s.id === stockroomId)?.name ?? stockroomId;
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Bell className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No alerts to show</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Title</th>
            <th className="pb-2 font-medium">Message</th>
            <th className="pb-2 font-medium">Priority</th>
            <th className="pb-2 font-medium">When</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {notifications.map(n => (
            <tr key={n.id}>
              <td className="py-2.5 font-medium">{n.title}</td>
              <td className="py-2.5 text-muted-foreground max-w-xs">{n.message}</td>
              <td className="py-2.5"><PriorityBadge priority={n.priority} /></td>
              <td className="py-2.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
              </td>
              <td className="py-2.5"><ReadBadge isRead={n.isRead} /></td>
              <td className="py-2.5">
                <div className="flex gap-2">
                  {n.actionUrl && (
                    <Button
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => navigate(n.actionUrl!)}
                    >
                      View →
                    </Button>
                  )}
                  {!n.isRead && (
                    <button
                      className="text-[11px] text-muted-foreground underline hover:text-foreground"
                      onClick={() => markAsRead(n.id)}
                    >
                      dismiss
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlertsPage() {
  const { notifications } = useNotificationContext();

  const inventoryNotifs = notifications
    .filter(n => n.module === 'Inventory')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const active = inventoryNotifs.filter(n => !n.isRead);

  const history = inventoryNotifs.filter(n => {
    if (!n.isRead) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return new Date(n.timestamp) >= cutoff;
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">My Alerts</h1>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
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
        <TabsContent value="active" className="mt-4">
          <AlertTable notifications={active} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <AlertTable notifications={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
