import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInventoryV2 } from '../InventoryV2Context';

export function AlertBell() {
  const { state } = useInventoryV2();
  const navigate = useNavigate();

  if (state.currentUser.role !== 'commissary-manager') return null;

  const count = state.alerts.filter(
    a => a.userId === state.currentUser.id && !a.resolvedAt && !a.dismissed
  ).length;

  return (
    <button
      onClick={() => navigate('/inventory-v2/alerts')}
      className="relative p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
      aria-label={`${count} active alerts`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
