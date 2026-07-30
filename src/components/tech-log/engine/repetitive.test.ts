import { describe, it, expect } from 'vitest';
import { detectRepetitiveGroups } from './repetitive';
import type { Defect } from '../types';

const d = (id: string, aircraftId: string, ata: string, daysAgo: number): Defect => {
  const at = new Date(Date.UTC(2026, 5, 21) - daysAgo * 86400000).toISOString();
  return {
    id, aircraftId, source: 'PIREP', ataChapter: ata, description: 'x',
    airworthinessAffecting: true, status: 'OPEN', reportedByOid: 'u',
    occurredAtUtc: at, reportedAtUtc: at, signatureId: 's',
  };
};

describe('repetitive-defect detection (§3.1)', () => {
  it('flags 3 same-ATA defects on one aircraft within the window as a group', () => {
    const defects = [d('a', 'ac1', '34', 2), d('b', 'ac1', '34', 10), d('c', 'ac1', '34', 20)];
    const groups = detectRepetitiveGroups(defects);
    expect(groups.size).toBe(3);
    expect(groups.get('a')?.count).toBe(3);
    expect(groups.get('a')?.groupId).toBe('rep-ac1-34');
  });

  it('does not group only two occurrences', () => {
    const groups = detectRepetitiveGroups([d('a', 'ac1', '34', 2), d('b', 'ac1', '34', 10)]);
    expect(groups.size).toBe(0);
  });

  it('does not group across different aircraft or ATA', () => {
    const groups = detectRepetitiveGroups([d('a', 'ac1', '34', 2), d('b', 'ac2', '34', 5), d('c', 'ac1', '21', 8)]);
    expect(groups.size).toBe(0);
  });

  it('does not group occurrences spread beyond the rolling window', () => {
    const groups = detectRepetitiveGroups([d('a', 'ac1', '34', 2), d('b', 'ac1', '34', 40), d('c', 'ac1', '34', 90)]);
    expect(groups.size).toBe(0);
  });

  it('assigns chronological index within the group', () => {
    const groups = detectRepetitiveGroups([d('a', 'ac1', '34', 2), d('b', 'ac1', '34', 10), d('c', 'ac1', '34', 20)]);
    // c is oldest (20d ago) → index 1; a is newest → index 3
    expect(groups.get('c')?.index).toBe(1);
    expect(groups.get('a')?.index).toBe(3);
  });
});
