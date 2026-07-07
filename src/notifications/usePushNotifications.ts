import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedEntry, FeedItem } from './types';
import {
  isOptedIn, setOptedIn, loadNotifiedIds, saveNotifiedIds, newNotifiables,
} from './push';

const SUPPORTED = typeof window !== 'undefined' && 'Notification' in window;

async function showOsNotification(item: FeedItem): Promise<void> {
  const options: NotificationOptions & { badge?: string } = {
    body: item.detail || '',
    tag: item.id, // re-firing the same id replaces rather than stacks
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: item.link },
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(item.title, options);
      return;
    }
  } catch {
    /* fall through to the page-level Notification */
  }
  try {
    // eslint-disable-next-line no-new
    new Notification(item.title, options);
  } catch {
    /* permission revoked between check and fire — ignore */
  }
}

/** Bridges the in-app feed to OS notifications. Fires for newly-arriving
 * critical/warn items once the user has opted in and granted permission.
 * Existing items at enable-time are baselined so we never blast a backlog. */
export function usePushNotifications(entries: FeedEntry[], userId: string) {
  const [permission, setPermission] = useState<NotificationPermission>(
    SUPPORTED ? Notification.permission : 'denied',
  );
  const [enabled, setEnabled] = useState<boolean>(() => isOptedIn());
  const baselinedRef = useRef(false);

  const enable = useCallback(async () => {
    if (!SUPPORTED) return;
    let p = Notification.permission;
    if (p === 'default') p = await Notification.requestPermission();
    setPermission(p);
    if (p === 'granted') {
      setOptedIn(true);
      setEnabled(true);
    }
  }, []);

  const disable = useCallback(() => {
    setOptedIn(false);
    setEnabled(false);
  }, []);

  useEffect(() => {
    if (!SUPPORTED || !enabled || permission !== 'granted') return;
    const known = new Set(loadNotifiedIds(userId));

    // First pass after enabling/mounting: baseline the current feed so only
    // genuinely new items (arriving later this session) interrupt the user.
    if (!baselinedRef.current) {
      baselinedRef.current = true;
      entries.forEach((e) => known.add(e.id));
      saveNotifiedIds(userId, [...known]);
      return;
    }

    const fresh = newNotifiables(entries, known);
    if (fresh.length === 0) return;
    fresh.forEach((item) => { void showOsNotification(item); });
    fresh.forEach((f) => known.add(f.id));
    saveNotifiedIds(userId, [...known]);
  }, [entries, enabled, permission, userId]);

  return { supported: SUPPORTED, permission, enabled, enable, disable };
}
