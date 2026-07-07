import { describe, it, expect } from 'vitest';
import { buildInventoryFeed } from './inventory';
import { memoryStorage } from '../storage';

const NOW = '2026-07-04T12:00:00.000Z';

function seeded(state: object) {
  const s = memoryStorage();
  s.setItem('inv-v2-state', JSON.stringify(state));
  return s;
}

describe('buildInventoryFeed', () => {
  it('derives below-minimum (critical) and below-par (warn) stock levels', () => {
    const s = seeded({
      items: [{ id: 'IT1', itemName: 'Diet Coke' }, { id: 'IT2', itemName: 'Napkins' }],
      stockroomItems: [
        { itemId: 'IT1', stockroomId: 'SR1', qtyOnHand: 2, minimumLevel: 4, parLevel: 12 },
        { itemId: 'IT2', stockroomId: 'SR1', qtyOnHand: 8, minimumLevel: 4, parLevel: 12 },
      ],
      inspections: [],
      groceryLists: [],
    });
    const items = buildInventoryFeed('commissary-manager', NOW, s);
    expect(items.map(i => [i.id, i.severity])).toEqual([
      ['inv-min:SR1:IT1', 'critical'],
      ['inv-par:SR1:IT2', 'warn'],
    ]);
    expect(items[0].title).toBe('Diet Coke critically low');
    expect(items[0].detail).toBe('2 on hand (minimum: 4)');
    expect(items[0].link).toBe('/inventory-v2/commissary');
    expect(items[1].title).toBe('Napkins below par');
  });

  it('derives restocking-needed inspections and sent grocery lists', () => {
    const s = seeded({
      items: [],
      stockroomItems: [],
      inspections: [
        { id: 'INS1', tailNumber: 'N650PR', status: 'restocking_needed' },
        { id: 'INS2', tailNumber: 'N500GA', status: 'completed' },
      ],
      groceryLists: [
        { id: 'GL1', tailNumber: 'N650PR', generatedBy: 'Mike Johnson', status: 'sent', items: [1, 2, 3] },
        { id: 'GL2', tailNumber: 'N500GA', status: 'fulfilled', items: [] },
      ],
    });
    const items = buildInventoryFeed('fa', NOW, s);
    expect(items.map(i => i.id)).toEqual(['inv-inspection:INS1', 'inv-grocery:GL1']);
    expect(items[0].severity).toBe('warn');
    expect(items[0].link).toBe('/inventory-v2/replenish');
    expect(items[1].severity).toBe('info');
    expect(items[1].detail).toBe('3 items requested');
  });

  it('self-clears when stock is restored', () => {
    const s = seeded({
      items: [{ id: 'IT1', itemName: 'Diet Coke' }],
      stockroomItems: [{ itemId: 'IT1', stockroomId: 'SR1', qtyOnHand: 20, minimumLevel: 4, parLevel: 12 }],
      inspections: [],
      groceryLists: [],
    });
    expect(buildInventoryFeed('fa', NOW, s)).toEqual([]);
  });

  it('returns nothing for roles outside the audience and on missing/corrupt storage', () => {
    expect(buildInventoryFeed('pilot', NOW, seeded({ items: [], stockroomItems: [], inspections: [], groceryLists: [] }))).toEqual([]);
    expect(buildInventoryFeed('fa', NOW, memoryStorage())).toEqual([]);
    const s = memoryStorage();
    s.setItem('inv-v2-state', 'nope');
    expect(buildInventoryFeed('fa', NOW, s)).toEqual([]);
  });

  it('tolerates grocery lists missing the items array', () => {
    const s = memoryStorage();
    s.setItem('inv-v2-state', JSON.stringify({
      items: [], stockroomItems: [], inspections: [],
      groceryLists: [{ id: 'GL9', status: 'sent' }],
    }));
    expect(buildInventoryFeed('fa', NOW, s).map(i => [i.id, i.detail])).toEqual([
      ['inv-grocery:GL9', '0 items requested'],
    ]);
  });
});
