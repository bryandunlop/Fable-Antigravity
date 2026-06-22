import type { Defect } from '../types';
import { currentRows } from './supersede';

export interface RepetitiveInfo {
  groupId: string;
  count: number;   // total defects in the repeat cluster (aircraft + ATA)
  index: number;   // 1-based chronological position of this defect within the cluster
}

export interface RepetitiveOptions {
  windowDays?: number; // a rolling window that must contain at least `minCount` occurrences
  minCount?: number;   // occurrences within the window to qualify as repetitive
}

const DAY_MS = 86400000;

/**
 * Detect repetitive defects (§3.1 `repetitive_defect_group_id`): the same ATA chapter on the same
 * aircraft recurring `minCount`+ times within any rolling `windowDays` window. Computed from the
 * append-only ledger (current rows) — never stored on the immutable defect.
 *
 * Returns a map keyed by defect id for every defect that belongs to a qualifying cluster.
 */
export function detectRepetitiveGroups(
  defects: Defect[],
  opts: RepetitiveOptions = {},
): Map<string, RepetitiveInfo> {
  const windowDays = opts.windowDays ?? 30;
  const minCount = opts.minCount ?? 3;
  const out = new Map<string, RepetitiveInfo>();

  // Cluster current defects by aircraft + ATA chapter.
  const clusters = new Map<string, Defect[]>();
  for (const d of currentRows(defects)) {
    const key = `${d.aircraftId}::${d.ataChapter}`;
    (clusters.get(key) ?? clusters.set(key, []).get(key)!).push(d);
  }

  for (const [key, rows] of clusters) {
    if (rows.length < minCount) continue;
    const sorted = rows.slice().sort((a, b) => a.reportedAtUtc.localeCompare(b.reportedAtUtc));
    const times = sorted.map(d => new Date(d.reportedAtUtc).getTime());

    // Rolling window: does any window of `windowDays` contain >= minCount occurrences?
    let qualifies = false;
    let lo = 0;
    for (let hi = 0; hi < times.length; hi++) {
      while (times[hi] - times[lo] > windowDays * DAY_MS) lo++;
      if (hi - lo + 1 >= minCount) {
        qualifies = true;
        break;
      }
    }
    if (!qualifies) continue;

    const [aircraftId, ata] = key.split('::');
    const groupId = `rep-${aircraftId}-${ata}`;
    sorted.forEach((d, i) => out.set(d.id, { groupId, count: sorted.length, index: i + 1 }));
  }

  return out;
}
