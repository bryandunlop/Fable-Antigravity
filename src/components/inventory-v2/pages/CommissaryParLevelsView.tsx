// ─── Commissary Par Levels View — compact par/min tuning ──────────────────────
import React from 'react';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { useInventoryV2 } from '../InventoryV2Context';
import type { CommissaryItem } from '../commissaryUtils';

interface CommissaryParLevelsViewProps {
  groups: [string, CommissaryItem[]][];
  getGroupLabel: (key: string) => string;
}

export default function CommissaryParLevelsView({ groups, getGroupLabel }: CommissaryParLevelsViewProps) {
  const { dispatch } = useInventoryV2();

  const update = (item: CommissaryItem, field: 'parLevel' | 'minimumLevel', raw: string) => {
    const si = item.stockroom;
    if (!si) return;
    const val = Math.max(0, parseInt(raw, 10) || 0);
    if (val === si[field]) return;
    dispatch({ type: 'UPDATE_STOCKROOM_ITEM', payload: { ...si, [field]: val } });
  };

  if (groups.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground text-sm">No items match your filters.</div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([key, items]) => (
        <Card key={key} className="glass-panel overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-accent/20 flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{getGroupLabel(key)}</span>
            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          </div>

          <div className="divide-y divide-border">
            <div className="flex items-center gap-3 px-4 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="flex-1">Item</span>
              <span className="w-20 text-center">Par</span>
              <span className="w-20 text-center">Min</span>
              <span className="w-12 text-center">UOM</span>
            </div>

            {items.map(item => {
              const si = item.stockroom;
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground truncate block">{item.itemName}</span>
                    {si?.binLocation && (
                      <span className="font-mono text-[11px] text-muted-foreground">{si.binLocation}</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    defaultValue={si ? String(si.parLevel) : ''}
                    disabled={!si}
                    onBlur={e => update(item, 'parLevel', e.target.value)}
                    className="w-20 h-8 text-center"
                    aria-label={`Par level for ${item.itemName}`}
                  />
                  <Input
                    type="number"
                    min={0}
                    defaultValue={si ? String(si.minimumLevel) : ''}
                    disabled={!si}
                    onBlur={e => update(item, 'minimumLevel', e.target.value)}
                    className="w-20 h-8 text-center"
                    aria-label={`Minimum level for ${item.itemName}`}
                  />
                  <span className="w-12 text-center text-xs uppercase text-muted-foreground">{item.uom}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
