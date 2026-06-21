export function currentRows<T extends { id: string; supersedesId?: string }>(rows: T[]): T[] {
  const superseded = new Set(rows.map(r => r.supersedesId).filter(Boolean) as string[]);
  return rows.filter(r => !superseded.has(r.id));
}

export function latestFor<T extends { id: string; supersedesId?: string }>(
  rows: T[],
  originId: string,
): T | undefined {
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const head of currentRows(rows)) {
    let cur: T | undefined = head;
    while (cur) {
      if (cur.id === originId) return head;
      cur = cur.supersedesId ? byId.get(cur.supersedesId) : undefined;
    }
  }
  return byId.get(originId);
}
