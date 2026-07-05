import type { FeedItem } from '../types';
import { defaultStorage, type StorageLike } from '../storage';
import { buildNotifications } from '../../components/tech-log/engine/notifications';
import { STORAGE_KEY, VERSION_KEY, DATA_VERSION } from '../../components/tech-log/TechLogContext';
import { getDefaultState } from '../../components/tech-log/mockData/scenarios';
import type { Personnel, TechLogState } from '../../components/tech-log/types';
import { SYSTEM_USERS } from '../../lib/mockUsers';

// Mirrors MAINT_ROLES in TechLogContext.tsx (not exported there).
const MAINT_ROLES = ['maintenance', 'chief-inspector', 'shift-lead', 'maintenance-coordinator', 'dom'];
const PILOT_ROLES = ['pilot', 'chief-pilot'];

function readState(storage: StorageLike): TechLogState {
  // Mirrors loadInitialState() in TechLogContext.tsx, read-only (never writes).
  if (storage.getItem(VERSION_KEY) !== DATA_VERSION) return getDefaultState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? { ...getDefaultState(), ...JSON.parse(raw) } : getDefaultState();
  } catch {
    return getDefaultState();
  }
}

export function buildTechLogFeed(
  userRole: string,
  nowUtc: string,
  storage: StorageLike | null = defaultStorage(),
): FeedItem[] {
  if (!storage) return [];
  const sys = SYSTEM_USERS.find(u => u.roles?.includes(userRole));
  if (!sys) return [];
  const isMaint = (sys.roles ?? []).some(r => MAINT_ROLES.includes(r));
  const isPilot = (sys.roles ?? []).some(r => PILOT_ROLES.includes(r));
  if (!isMaint && !isPilot) return [];

  const state = readState(storage);
  const persona: Personnel = state.personnel.find(p => p.oid === sys.id) ?? {
    oid: sys.id,
    displayName: (sys as { name?: string }).name ?? sys.id,
    role: isMaint ? 'MAINTENANCE' : 'PILOT',
    riiAuthorized: false,
    riiAuthorizedAta: [],
    active: true,
  };

  return buildNotifications(state, persona, nowUtc).map(n => ({
    id: `techlog:${n.id}`,
    severity: n.severity,
    title: n.title,
    detail: n.detail,
    module: 'Tech Log',
    link: n.link,
    atUtc: n.atUtc,
  }));
}
