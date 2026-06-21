import { describe, it, expect } from 'vitest';
import { currentRows, latestFor } from './supersede';

describe('supersede', () => {
  it('drops a row that has been superseded', () => {
    const rows = [
      { id: 'a', supersedesId: undefined },
      { id: 'b', supersedesId: 'a' }, // b supersedes a
    ];
    expect(currentRows(rows).map(r => r.id)).toEqual(['b']);
  });

  it('keeps independent current rows', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c', supersedesId: 'b' }];
    expect(currentRows(rows).map(r => r.id).sort()).toEqual(['a', 'c']);
  });

  it('latestFor walks the chain to the head', () => {
    const rows = [{ id: 'a' }, { id: 'b', supersedesId: 'a' }, { id: 'c', supersedesId: 'b' }];
    expect(latestFor(rows, 'a')?.id).toBe('c');
  });
});
