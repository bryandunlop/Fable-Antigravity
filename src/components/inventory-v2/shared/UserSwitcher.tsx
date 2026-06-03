import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { useInventoryV2 } from '../InventoryV2Context';
import { SYSTEM_USERS } from '../../../lib/mockUsers';

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  'inflight': { label: 'FLIGHT ATTENDANT', className: 'bg-cyan-500/20 text-cyan-300' },
  'fa-manager': { label: 'FA MANAGER', className: 'bg-cyan-500/20 text-cyan-300' },
  'lead-fa': { label: 'LEAD FA', className: 'bg-cyan-500/20 text-cyan-300' },
  'commissary-manager': { label: 'COMMISSARY', className: 'bg-indigo-500/20 text-indigo-300' },
  'admin': { label: 'ADMIN', className: 'bg-primary/20 text-primary' },
  'pilot': { label: 'PILOT', className: 'bg-blue-500/20 text-blue-300' },
  'chief-pilot': { label: 'CHIEF PILOT', className: 'bg-blue-500/20 text-blue-300' },
  'maintenance': { label: 'MAINTENANCE', className: 'bg-orange-500/20 text-orange-300' },
  'chief-inspector': { label: 'CHIEF INSPECTOR', className: 'bg-orange-500/20 text-orange-300' },
  'shift-lead': { label: 'SHIFT LEAD', className: 'bg-orange-500/20 text-orange-300' },
  'safety': { label: 'SAFETY', className: 'bg-red-500/20 text-red-300' },
  'lead': { label: 'LEAD', className: 'bg-slate-500/20 text-slate-300' },
  'vp': { label: 'VP', className: 'bg-slate-500/20 text-slate-300' },
};

function roleBadge(role: string) {
  return ROLE_BADGE[role] ?? { label: role.toUpperCase(), className: 'bg-slate-500/20 text-slate-300' };
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function UserSwitcher() {
  const { state, dispatch } = useInventoryV2();
  const { currentUser } = state;
  const badge = roleBadge(currentUser.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {initials(currentUser.name)}
          </span>
          <span className="hidden sm:inline">{currentUser.name}</span>
          <span className={`hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            {badge.label}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {SYSTEM_USERS.map(user => {
          const primaryRole = user.roles[0];
          const b = roleBadge(primaryRole);
          return (
            <DropdownMenuItem
              key={user.id}
              className="flex items-center gap-3 py-2"
              onClick={() =>
                dispatch({
                  type: 'SET_CURRENT_USER',
                  payload: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: primaryRole,
                    roles: user.roles,
                    department: user.department,
                  },
                })
              }
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-bold text-white">
                {initials(user.name)}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{user.name}</span>
                <span className={`text-[10px] font-semibold ${b.className}`}>{b.label}</span>
              </div>
              {currentUser.id === user.id && (
                <span className="ml-auto text-xs text-indigo-400">active</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
