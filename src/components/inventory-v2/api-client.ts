// Typed fetch wrapper for the inventory-v2 API.
// Mirrors the reducer action surface — every mutation has a matching call.
// Used by useApiSync.ts to persist optimistic local updates in the background.

const API_BASE = '/api';

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text().catch(() => res.statusText);
    console.error(`API error ${res.status} on ${path}:`, error);
    throw new Error(`API ${res.status}: ${error}`);
  }
  return res.json();
}

export const api = {
  // ─── State ────────────────────────────────────────────────────────────────
  state: {
    load: () => apiFetch('/state'),
  },

  // ─── Items ────────────────────────────────────────────────────────────────
  items: {
    create: (item: any) =>
      apiFetch('/items', { method: 'POST', body: JSON.stringify(item) }),
    update: (id: string, item: any) =>
      apiFetch(`/items/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
    delete: (id: string) =>
      apiFetch(`/items/${id}`, { method: 'DELETE' }),
  },

  // ─── Stockroom ────────────────────────────────────────────────────────────
  stockroom: {
    updateItem: (item: any) =>
      apiFetch('/stockroom/item', { method: 'PUT', body: JSON.stringify(item) }),
    bulkUpdate: (items: any[]) =>
      apiFetch('/stockroom/bulk', { method: 'PUT', body: JSON.stringify({ items }) }),
  },

  // ─── Inspections ──────────────────────────────────────────────────────────
  inspections: {
    create: (inspection: any) =>
      apiFetch('/inspections', { method: 'POST', body: JSON.stringify(inspection) }),
    update: (id: string, inspection: any) =>
      apiFetch(`/inspections/${id}`, { method: 'PUT', body: JSON.stringify(inspection) }),
  },

  // ─── Trips ────────────────────────────────────────────────────────────────
  trips: {
    create: (trip: any) =>
      apiFetch('/trips', { method: 'POST', body: JSON.stringify(trip) }),
    update: (id: string, trip: any) =>
      apiFetch(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(trip) }),
    complete: (id: string) =>
      apiFetch(`/trips/${id}/complete`, { method: 'POST' }),
    reopen: (id: string) =>
      apiFetch(`/trips/${id}/reopen`, { method: 'POST' }),
    addLeg: (tripId: string, leg: any) =>
      apiFetch(`/trips/${tripId}/legs`, { method: 'POST', body: JSON.stringify(leg) }),
    updateLeg: (tripId: string, legId: string, leg: any) =>
      apiFetch(`/trips/${tripId}/legs/${legId}`, { method: 'PUT', body: JSON.stringify(leg) }),
    setLegPhase: (tripId: string, legId: string, phase: string) =>
      apiFetch(`/trips/${tripId}/legs/${legId}/phase`, {
        method: 'POST', body: JSON.stringify({ phase }),
      }),
    addUsageEntry: (tripId: string, legId: string, entry: any) =>
      apiFetch(`/trips/${tripId}/legs/${legId}/usage`, {
        method: 'POST', body: JSON.stringify(entry),
      }),
    updateUsageEntry: (tripId: string, legId: string, entryId: string, entry: any) =>
      apiFetch(`/trips/${tripId}/legs/${legId}/usage/${entryId}`, {
        method: 'PUT', body: JSON.stringify(entry),
      }),
    removeUsageEntry: (tripId: string, legId: string, entryId: string) =>
      apiFetch(`/trips/${tripId}/legs/${legId}/usage/${entryId}`, { method: 'DELETE' }),
    addNote: (tripId: string, note: any) =>
      apiFetch(`/trips/${tripId}/notes`, { method: 'POST', body: JSON.stringify(note) }),
    addLoadItems: (tripId: string, items: any[]) =>
      apiFetch(`/trips/${tripId}/load-items`, {
        method: 'POST', body: JSON.stringify({ items }),
      }),
    addReturnItems: (tripId: string, items: any[]) =>
      apiFetch(`/trips/${tripId}/return-items`, {
        method: 'POST', body: JSON.stringify({ items }),
      }),
  },

  // ─── Grocery ──────────────────────────────────────────────────────────────
  grocery: {
    create: (list: any) =>
      apiFetch('/grocery', { method: 'POST', body: JSON.stringify(list) }),
    update: (id: string, list: any) =>
      apiFetch(`/grocery/${id}`, { method: 'PUT', body: JSON.stringify(list) }),
    send: (id: string) =>
      apiFetch(`/grocery/${id}/send`, { method: 'POST' }),
    fulfill: (id: string) =>
      apiFetch(`/grocery/${id}/fulfill`, { method: 'POST' }),
  },

  // ─── Stock (batches + thresholds + log) ───────────────────────────────────
  stock: {
    addBatch: (batch: any) =>
      apiFetch('/stock/batches', { method: 'POST', body: JSON.stringify(batch) }),
    updateBatch: (id: string, batch: any) =>
      apiFetch(`/stock/batches/${id}`, { method: 'PUT', body: JSON.stringify(batch) }),
    removeBatch: (id: string) =>
      apiFetch(`/stock/batches/${id}`, { method: 'DELETE' }),
    addAlertThreshold: (threshold: any) =>
      apiFetch('/stock/alert-thresholds', { method: 'POST', body: JSON.stringify(threshold) }),
    removeAlertThreshold: (id: string) =>
      apiFetch(`/stock/alert-thresholds/${id}`, { method: 'DELETE' }),
    addLogEntry: (entry: any) =>
      apiFetch('/stock/log', { method: 'POST', body: JSON.stringify(entry) }),
  },

  // ─── Pick/Restock ─────────────────────────────────────────────────────────
  pickRestock: {
    addPickItems: (items: any[]) =>
      apiFetch('/pick-restock/pick', { method: 'POST', body: JSON.stringify({ items }) }),
    updatePickItem: (id: string, item: any) =>
      apiFetch(`/pick-restock/pick/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
    addRestockItems: (items: any[]) =>
      apiFetch('/pick-restock/restock', { method: 'POST', body: JSON.stringify({ items }) }),
    updateRestockItem: (id: string, item: any) =>
      apiFetch(`/pick-restock/restock/${id}`, { method: 'PUT', body: JSON.stringify(item) }),
    setRestockList: (items: any[]) =>
      apiFetch('/pick-restock/restock-all', { method: 'PUT', body: JSON.stringify({ items }) }),
  },

  // ─── Requests ─────────────────────────────────────────────────────────────
  requests: {
    create: (request: any) =>
      apiFetch('/requests', { method: 'POST', body: JSON.stringify(request) }),
    update: (id: string, request: any) =>
      apiFetch(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(request) }),
  },

  // ─── Activity log ─────────────────────────────────────────────────────────
  activity: {
    add: (entry: any) =>
      apiFetch('/activity', { method: 'POST', body: JSON.stringify(entry) }),
  },

  // ─── Storage locations ────────────────────────────────────────────────────
  storageLocations: {
    create: (loc: any) =>
      apiFetch('/storage-locations', { method: 'POST', body: JSON.stringify(loc) }),
    update: (id: string, loc: any) =>
      apiFetch(`/storage-locations/${id}`, { method: 'PUT', body: JSON.stringify(loc) }),
    delete: (id: string) =>
      apiFetch(`/storage-locations/${id}`, { method: 'DELETE' }),
    reorder: (ids: string[]) =>
      apiFetch('/storage-locations/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),
  },
};
