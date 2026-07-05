import { useEffect, useMemo, useState } from 'react';
import { buildFeed } from './feed';
import { eventStore } from './events';
import { dismissalStore } from './dismissals';
import { resolveUserId } from './identity';

/** Reactive wrapper around buildFeed. Recomputes when the event/dismissal
 * stores change, on cross-tab storage events, on window focus, every 30s
 * (module stores like tech-log write localStorage directly and emit nothing),
 * and on demand via refresh(). */
export function useNotificationFeed(userRole: string, additionalRoles: string[] = []) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    const unsubs = [eventStore.subscribe(bump), dismissalStore.subscribe(bump)];
    window.addEventListener('storage', bump);
    window.addEventListener('focus', bump);
    const iv = window.setInterval(bump, 30000);
    return () => {
      unsubs.forEach(u => u());
      window.removeEventListener('storage', bump);
      window.removeEventListener('focus', bump);
      window.clearInterval(iv);
    };
  }, []);

  // Identity stays anchored on the primary role; the full role set widens the
  // lens. rolesKey is a stable string so the memo/callbacks don't rebuild on
  // every render from a fresh additionalRoles array literal.
  const userId = resolveUserId(userRole);
  const rolesKey = [userRole, ...additionalRoles].join(',');
  const roles = useMemo(
    () => [...new Set([userRole, ...additionalRoles])],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rolesKey],
  );
  const feed = useMemo(
    () => buildFeed(userRole, new Date().toISOString(), undefined, roles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rolesKey, version],
  );

  return {
    ...feed,
    userId,
    refresh: () => setVersion(v => v + 1),
    markRead: (id: string) => eventStore.markRead(userId, id),
    markUnread: (id: string) => eventStore.markUnread(userId, id),
    markAllRead: () => roles.forEach(r => eventStore.markAllRead(userId, r)),
    dismiss: (id: string) => dismissalStore.dismiss(userId, id),
    restore: (id: string) => dismissalStore.restore(userId, id),
  };
}
