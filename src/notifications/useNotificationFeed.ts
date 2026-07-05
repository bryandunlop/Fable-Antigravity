import { useEffect, useMemo, useState } from 'react';
import { buildFeed } from './feed';
import { eventStore } from './events';
import { dismissalStore } from './dismissals';
import { resolveUserId } from './identity';

/** Reactive wrapper around buildFeed. Recomputes when the event/dismissal
 * stores change, on cross-tab storage events, on window focus, every 30s
 * (module stores like tech-log write localStorage directly and emit nothing),
 * and on demand via refresh(). */
export function useNotificationFeed(userRole: string) {
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

  const userId = resolveUserId(userRole);
  const feed = useMemo(
    () => buildFeed(userRole, new Date().toISOString()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userRole, version],
  );

  return {
    ...feed,
    userId,
    refresh: () => setVersion(v => v + 1),
    markRead: (id: string) => eventStore.markRead(userId, id),
    markUnread: (id: string) => eventStore.markUnread(userId, id),
    markAllRead: () => eventStore.markAllRead(userId, userRole),
    dismiss: (id: string) => dismissalStore.dismiss(userId, id),
    restore: (id: string) => dismissalStore.restore(userId, id),
  };
}
