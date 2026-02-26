import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  Package, Plus, Minus, Search, Plane, AlertTriangle, CheckCircle,
  FileText, Download, Clock, Trash2, RotateCcw, Check, X, Zap,
  ShoppingCart, Calendar, ChevronRight, ChevronLeft, History, Eye,
  Coffee, Droplets, Armchair, Settings, Filter, Edit, AlertCircle,
  BarChart2, ClipboardList, Scan, Star, Pencil, CheckSquare, PackagePlus, ListChecks, ArrowRight, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_INVENTORY, FLEET, InventoryItem, AreaType, FleetAircraft } from './inventoryData';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CheckedItem {
  itemId: string;
  currentQuantity: number;
  needsReplenishment: boolean;
}

interface InventorySession {
  id: string;
  tailNumber: string;
  aircraftType: 'G650' | 'G500';
  date: string;
  reportedBy: string;
  departure: string;
  arrival: string;
  checkedItems: CheckedItem[];
  customItems: CustomItem[];
  additionalNotes: string;
  status: 'draft' | 'submitted';
  readinessScore: number;
}

interface CustomItem {
  id: string;
  name: string;
  quantity: number;
  area: AreaType;
  needsReplenishment: boolean;
  notes?: string;
  category?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AREA_META: Record<AreaType, { label: string; icon: React.ElementType; color: string }> = {
  'forward-lav': { label: 'Forward Lav', icon: Droplets, color: 'text-cyan-400' },
  'galley': { label: 'Galley', icon: Coffee, color: 'text-amber-400' },
  'aft-lav': { label: 'Aft Lav', icon: Star, color: 'text-purple-400' },
  'credenza': { label: 'Credenza', icon: Package, color: 'text-emerald-400' },
  'chiller': { label: 'Chiller', icon: Zap, color: 'text-blue-400' },
  'baggage': { label: 'Baggage', icon: Package, color: 'text-indigo-400' },
};

const AREAS: AreaType[] = ['forward-lav', 'galley', 'aft-lav', 'credenza', 'chiller', 'baggage'];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  low: 'bg-slate-500/15 text-muted-foreground border border-slate-500/30',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function initItemsForAircraft(aircraftType: 'G650' | 'G500'): InventoryItem[] {
  return DEFAULT_INVENTORY
    .filter(item => item.defaultQuantities[aircraftType] !== undefined)
    .map(item => ({
      ...item,
      requiredQuantity: item.defaultQuantities[aircraftType]!,
      currentQuantity: item.defaultQuantities[aircraftType]!,
      needsReplenishment: false,
    }));
}

function calcReadiness(items: InventoryItem[], customItems: CustomItem[]): number {
  const allItems = [...items, ...customItems.map(c => ({
    currentQuantity: c.quantity,
    requiredQuantity: 1,
    needsReplenishment: c.needsReplenishment,
    priority: 'medium' as const,
  }))];
  if (!allItems.length) return 100;
  const stocked = allItems.filter(i => i.currentQuantity >= i.requiredQuantity).length;
  return Math.round((stocked / allItems.length) * 100);
}

function getAreaReadiness(items: InventoryItem[], area: AreaType): { stocked: number; total: number; pct: number } {
  const areaItems = items.filter(i => i.area === area);
  if (!areaItems.length) return { stocked: 0, total: 0, pct: 100 };
  const stocked = areaItems.filter(i => i.currentQuantity >= i.requiredQuantity).length;
  return { stocked, total: areaItems.length, pct: Math.round((stocked / areaItems.length) * 100) };
}

function readinessColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-400';
  if (pct >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

function stockBarColor(pct: number): string {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// Readiness ring removed per user feedback

function StockBar({ current, required }: { current: number; required: number }) {
  const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 100;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-accent rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${stockBarColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground/70 w-14 text-right shrink-0">
        {current} / {required}
      </span>
    </div>
  );
}

function AreaSummaryChip({ area, items }: { area: AreaType; items: InventoryItem[] }) {
  const { stocked, total, pct } = getAreaReadiness(items, area);
  const { label, icon: Icon, color } = AREA_META[area];
  const missing = total - stocked;
  const statusLabel = pct === 100 ? 'Ready' : pct >= 70 ? 'Low' : 'Critical';
  const statusStyle = pct === 100 ? 'text-emerald-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
      <Icon className={`w-4 h-4 ${color}`} />
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className={`text-[10px] ${statusStyle}`}>{statusLabel} · {stocked}/{total}</p>
      </div>
      {missing > 0 && (
        <Badge className="ml-auto text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
          {missing} low
        </Badge>
      )}
    </div>
  );
}

// ─── Inventory Item Card ─────────────────────────────────────────────────────

function ItemCard({
  item,
  onAdjust,
  editMode = false,
  onHide,
  onChangeRequired,
  onChangeLocation,
  defaultRequired,
}: {
  item: InventoryItem;
  onAdjust: (id: string, delta: number) => void;
  editMode?: boolean;
  onHide?: (id: string) => void;
  onChangeRequired?: (id: string, qty: number) => void;
  onChangeLocation?: (id: string, loc: string) => void;
  defaultRequired?: number;
}) {
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [tempQty, setTempQty] = useState('');

  const isEmpty = item.requiredQuantity > 0 && item.currentQuantity <= 0;
  const isHealthy = item.requiredQuantity > 0 && item.currentQuantity >= item.requiredQuantity;
  const isLow = item.requiredQuantity > 0 && item.currentQuantity > 0 && item.currentQuantity < item.requiredQuantity;

  const handleQtySubmit = () => {
    const val = parseInt(tempQty);
    if (!isNaN(val) && val >= 0) {
      const delta = val - item.currentQuantity;
      if (delta !== 0) {
        onAdjust(item.id, delta);
      }
    }
    setIsEditingQty(false);
  };

  return (
    <div className={`rounded-xl border transition-all ${editMode
      ? 'border-primary/30 bg-primary/5'
      : item.needsReplenishment
        ? 'border-orange-500/40 bg-orange-500/10'
        : isEmpty
          ? 'border-red-500/30 bg-red-500/5'
          : isLow
            ? 'border-yellow-500/30 bg-yellow-500/5'
            : isHealthy
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-border/40 bg-muted/20 opacity-80'
      } p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-base font-semibold text-foreground truncate">{item.itemName}</span>
          </div>
          {editMode ? (
            <input
              type="text"
              value={item.location || ''}
              onChange={e => onChangeLocation?.(item.id, e.target.value)}
              placeholder="Storage location..."
              className="text-xs w-full mt-1 bg-background border border-primary/40 rounded px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            item.location && <p className="text-xs text-muted-foreground/80 mt-0.5"><span className="font-medium">Loc:</span> {item.location}</p>
          )}
          {item.notes && <p className="text-[11px] text-muted-foreground/60 mt-0.5 italic">{item.notes}</p>}
          <div className="mt-2">
            <StockBar current={item.currentQuantity} required={item.requiredQuantity} />
          </div>
        </div>

        {editMode ? (
          <button
            onClick={() => onHide?.(item.id)}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
            title="Hide this item"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider pr-1">
              {item.requiredQuantity > 0 ? `Target: ${item.requiredQuantity}` : 'No Target'}
            </span>
            <div className={`flex items-center gap-1 bg-background/50 border rounded-lg p-1 transition-colors ${isEmpty
              ? 'border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
              : isLow
                ? 'border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.1)]'
                : isHealthy
                  ? 'border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                  : 'border-border/60 opacity-50'
              }`}>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 border-border text-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors"
                onClick={() => onAdjust(item.id, -1)}
                disabled={item.currentQuantity <= 0}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div
                className={`w-14 h-10 flex items-center justify-center font-bold text-xl rounded border cursor-pointer transition-colors ${isEmpty
                  ? 'text-red-500 bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                  : isLow
                    ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20'
                    : isHealthy
                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'text-foreground bg-accent/30 border-border/40 hover:bg-accent/50'
                  }`}
                onClick={() => {
                  setTempQty(item.currentQuantity.toString());
                  setIsEditingQty(true);
                }}
                title="Click to enter exact quantity"
              >
                {isEditingQty ? (
                  <input
                    type="number"
                    autoFocus
                    min={0}
                    value={tempQty}
                    onChange={(e) => setTempQty(e.target.value)}
                    onBlur={handleQtySubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQtySubmit();
                      if (e.key === 'Escape') setIsEditingQty(false);
                    }}
                    className="w-full h-full bg-transparent text-center outline-none rounded appearance-none"
                    style={{ MozAppearance: 'textfield' }}
                  />
                ) : (
                  item.currentQuantity
                )}
              </div>
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 border-border text-foreground hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-colors"
                onClick={() => onAdjust(item.id, 1)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
        {editMode ? (
          <div className="flex items-center gap-2 w-full justify-end">
            <Label className="text-xs text-muted-foreground">Default Stock:</Label>
            <input
              type="text"
              inputMode="numeric"
              value={item.requiredQuantity.toString()}
              onChange={e => {
                // Replace completely, don't just concatenate strings if they type over
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val) {
                  onChangeRequired?.(item.id, Math.max(1, parseInt(val)));
                }
              }}
              onFocus={(e) => e.target.select()}
              className="w-16 h-8 text-sm text-center font-semibold bg-background border border-primary/40 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {defaultRequired !== undefined && defaultRequired !== item.requiredQuantity && (
              <button
                onClick={() => onChangeRequired?.(item.id, defaultRequired)}
                title={`Reset to default (${defaultRequired})`}
                className="p-1 px-2 text-xs text-muted-foreground/70 bg-muted/50 hover:bg-accent hover:text-foreground rounded transition-colors"
              >
                Reset ({defaultRequired})
              </button>
            )}
            <span className="ml-2 text-[10px] text-primary/60 italic">editing</span>
          </div>
        ) : (
          <>
            <span className="text-xs text-muted-foreground/80 font-medium">Target: {item.requiredQuantity}</span>
            {item.currentQuantity < item.requiredQuantity && (
              <Badge className="ml-2 text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">
                Need {item.requiredQuantity - item.currentQuantity}
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ─── Quick Scan Mode ──────────────────────────────────────────────────────────

function QuickScanMode({
  items,
  onToggle,
  onClose,
}: {
  items: InventoryItem[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  const progress = Math.round(((idx) / items.length) * 100);

  if (!item) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center gap-6 p-6">
        <CheckCircle className="w-20 h-20 text-emerald-400" />
        <h2 className="text-2xl font-bold text-foreground">Scan Complete!</h2>
        <p className="text-muted-foreground">All {items.length} items reviewed.</p>
        <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-500 text-foreground px-8">
          Done
        </Button>
      </div>
    );
  }

  const pct = item.requiredQuantity > 0
    ? Math.min(100, Math.round((item.currentQuantity / item.requiredQuantity) * 100))
    : 100;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-accent">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground gap-1">
          <X className="w-4 h-4" /> Exit Scan
        </Button>
        <span className="text-sm text-muted-foreground">{idx + 1} / {items.length}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
      </div>

      {/* Item */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${AREA_META[item.area].color.replace('text-', 'bg-').replace('-400', '-500/20')}`}>
          {React.createElement(AREA_META[item.area].icon, { className: `w-8 h-8 ${AREA_META[item.area].color}` })}
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground/70 uppercase tracking-widest mb-1">{AREA_META[item.area].label}</p>
          <h2 className="text-2xl font-bold text-foreground mb-1">{item.itemName}</h2>
          <p className="text-sm text-muted-foreground">{item.location}</p>
        </div>

        <div className="bg-muted/50 border border-border rounded-2xl p-6 w-full max-w-sm text-center">
          <p className="text-sm text-muted-foreground mb-1">Required</p>
          <p className="text-4xl font-bold text-foreground mb-4">{item.requiredQuantity}</p>
          <div className="h-2 bg-accent rounded-full overflow-hidden mb-4">
            <div className={`h-full rounded-full ${stockBarColor(pct)}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" className="bg-muted/50 border-border h-9 w-9 p-0"
              onClick={() => { onToggle(item.id); }}>
              {item.needsReplenishment
                ? <Check className="w-4 h-4 text-emerald-400" />
                : <AlertTriangle className="w-4 h-4 text-orange-400" />}
            </Button>
            <span className="text-sm text-muted-foreground">
              {item.needsReplenishment ? 'Flagged for restock' : 'Mark needs restock'}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="grid grid-cols-2 gap-3 p-4 border-t border-border/60">
        <Button
          variant="outline"
          className="bg-muted/50 border-border text-foreground gap-2 h-14 text-base hover:bg-accent"
          onClick={() => setIdx(Math.max(0, idx - 1))}
          disabled={idx === 0}
        >
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90 text-foreground gap-2 h-14 text-base"
          onClick={() => setIdx(idx + 1)}
        >
          Next <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Shopping List View ───────────────────────────────────────────────────────

interface ManualItem { id: string; name: string; qty: number; }

function ShoppingListView({
  items, customItems, selectedTail, reporterName, additionalNotes, onBack,
}: {
  items: InventoryItem[];
  customItems: CustomItem[];
  selectedTail: string;
  reporterName: string;
  additionalNotes: string;
  onBack?: () => void;
}) {
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [manualQty, setManualQty] = useState(1);

  const needItems = items.filter(i => i.needsReplenishment || i.currentQuantity < i.requiredQuantity);
  const byArea = AREAS.reduce((acc, area) => {
    const areaItems = needItems.filter(i => i.area === area);
    if (areaItems.length) acc[area] = areaItems;
    return acc;
  }, {} as Record<AreaType, InventoryItem[]>);

  function addManual() {
    if (!manualInput.trim()) return;
    setManualItems(prev => [...prev, { id: `m-${Date.now()}`, name: manualInput.trim(), qty: manualQty }]);
    setManualInput('');
    setManualQty(1);
  }

  function copyToClipboard() {
    const lines: string[] = [`Shopping List — ${selectedTail} — ${new Date().toLocaleDateString()}`, ''];
    Object.entries(byArea).forEach(([area, aItems]) => {
      lines.push(`${AREA_META[area as AreaType].label}:`);
      aItems.forEach(i => lines.push(`  • ${i.itemName} (+${Math.max(0, i.requiredQuantity - i.currentQuantity)} needed)`));
      lines.push('');
    });
    const flaggedCustom = customItems.filter(c => c.needsReplenishment);
    if (flaggedCustom.length) {
      lines.push('Custom Items:');
      flaggedCustom.forEach(c => lines.push(`  • ${c.name} (${c.quantity} needed)`));
      lines.push('');
    }
    if (manualItems.length) {
      lines.push('Additional:');
      manualItems.forEach(m => lines.push(`  • ${m.name} ×${m.qty}`));
    }
    if (additionalNotes) lines.push(`\nNotes: ${additionalNotes}`);
    navigator.clipboard.writeText(lines.join('\n')).then(() => toast.success('Copied to clipboard!'));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        )}
        <h2 className="text-xl font-bold text-foreground flex-1">Grocery List</h2>
        <Button size="sm" variant="outline" onClick={() => window.print()} className="border-border bg-muted/50 text-foreground hover:bg-accent gap-1">
          <FileText className="w-4 h-4" /> Print
        </Button>
        <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-border bg-muted/50 text-foreground hover:bg-accent gap-1">
          <Download className="w-4 h-4" /> Copy
        </Button>
      </div>

      <div className="bg-muted/40 border border-border/60 rounded-xl p-4 mb-4">
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{selectedTail}</span> · {new Date().toLocaleDateString()} · {reporterName || '—'}
        </p>
      </div>

      {/* Auto-generated items by area */}
      {Object.entries(byArea).map(([area, areaItems]) => (
        <div key={area} className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            {React.createElement(AREA_META[area as AreaType].icon, { className: `w-4 h-4 ${AREA_META[area as AreaType].color}` })}
            <h3 className="text-sm font-semibold text-foreground">{AREA_META[area as AreaType].label}</h3>
          </div>
          <div className="space-y-1.5">
            {areaItems.map(i => (
              <div key={i.id} className="flex items-center gap-3 bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
                <Badge className={`text-[10px] ${PRIORITY_COLORS[i.priority]}`}>{i.priority}</Badge>
                <span className="text-sm text-foreground flex-1">{i.itemName}</span>
                <span className="text-sm text-orange-400 font-semibold">
                  +{Math.max(0, i.requiredQuantity - i.currentQuantity)} needed
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Flagged custom items */}
      {customItems.filter(c => c.needsReplenishment).length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Custom Items</h3>
          {customItems.filter(c => c.needsReplenishment).map(c => (
            <div key={c.id} className="flex items-center gap-3 bg-muted/40 border border-border/60 rounded-lg px-3 py-2 mb-1.5">
              <span className="text-sm text-foreground flex-1">{c.name}</span>
              <span className="text-sm text-orange-400">{c.quantity} needed</span>
            </div>
          ))}
        </div>
      )}

      {/* Manually added items */}
      {manualItems.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">Manual Additions</h3>
          <div className="space-y-1.5">
            {manualItems.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
                <Badge className="text-[10px] bg-blue-500/15 text-blue-400 border-blue-500/30">manual</Badge>
                <span className="text-sm text-foreground flex-1">{m.name}</span>
                <span className="text-sm text-orange-400 font-semibold">×{m.qty}</span>
                <button onClick={() => setManualItems(prev => prev.filter(x => x.id !== m.id))}>
                  <Trash2 className="w-4 h-4 text-red-400/50 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add manual item */}
      <div className="bg-muted/30 border border-dashed border-border rounded-xl p-4 mt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Add to list</p>
        <div className="flex gap-2">
          <Input
            placeholder="Item name..."
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addManual()}
            className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 flex-1"
          />
          <Input
            type="number" min={1} value={manualQty}
            onChange={e => setManualQty(parseInt(e.target.value) || 1)}
            className="bg-background border-border text-foreground w-20"
          />
          <Button onClick={addManual} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shrink-0">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      {additionalNotes && (
        <div className="bg-muted/40 border border-border/60 rounded-xl p-4 mt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-foreground">{additionalNotes}</p>
        </div>
      )}
    </div>
  );
}

// ─── History View ─────────────────────────────────────────────────────────────

function HistoryView({
  tailSessions, selectedTail, items, onBack,
}: {
  tailSessions: InventorySession[];
  selectedTail: string;
  items: InventoryItem[];
  onBack: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Given a session's checkedItems, find full item names from master list
  function getRestockItems(session: InventorySession) {
    return session.checkedItems
      .filter(c => c.needsReplenishment)
      .map(c => {
        const found = items.find(i => i.id === c.itemId);
        return found ? { name: found.itemName, area: found.area, needed: Math.max(0, found.requiredQuantity - c.currentQuantity) } : null;
      })
      .filter(Boolean) as { name: string; area: AreaType; needed: number }[];
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-foreground flex-1">Flight History — {selectedTail}</h1>
      </div>

      {tailSessions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No previous submissions for {selectedTail}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tailSessions.slice(0, 10).map(s => {
            const flagged = getRestockItems(s);
            const isExpanded = expandedId === s.id;
            return (
              <div key={s.id} className="bg-muted/40 border border-border/60 rounded-xl overflow-hidden">
                {/* Session header */}
                <div className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {s.reportedBy}{s.departure && s.arrival ? ` · ${s.departure} ✈️ ${s.arrival}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {flagged.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5" /> All stocked
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="flex items-center gap-1.5 text-xs bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2.5 py-1.5 rounded-lg hover:bg-orange-500/20 transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {flagged.length} missing
                        {isExpanded ? <ChevronLeft className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3 -rotate-90" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable shopping list */}
                {isExpanded && flagged.length > 0 && (
                  <div className="border-t border-border/60 px-4 pb-4 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Restock List</p>
                    <div className="space-y-1.5">
                      {flagged.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-background border border-border/60 rounded-lg px-3 py-2">
                          {React.createElement(AREA_META[item.area].icon, { className: `w-3.5 h-3.5 ${AREA_META[item.area].color} shrink-0` })}
                          <span className="text-sm text-foreground flex-1">{item.name}</span>
                          {item.needed > 0 && (
                            <span className="text-xs text-orange-400 font-semibold">+{item.needed} needed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AircraftInventory() {

  const [selectedTail, setSelectedTail] = useState<string>('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [activeTab, setActiveTab] = useState<AreaType>('forward-lav');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [reporterName, setReporterName] = useState('');
  const [departure, setDeparture] = useState('');
  const [arrival, setArrival] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showScanMode, setShowScanMode] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customArea, setCustomArea] = useState<AreaType>('galley');
  const [customCategory, setCustomCategory] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [currentView, setCurrentView] = useState<'check' | 'shopping' | 'history'>('check');
  const [mainTab, setMainTab] = useState('inventory');
  const [workflowMode, setWorkflowMode] = useState<'inflight' | 'audit'>('inflight');
  const [editMode, setEditMode] = useState(false);
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [requiredOverrides, setRequiredOverrides] = useState<Record<string, number>>({});
  const [locationOverrides, setLocationOverrides] = useState<Record<string, string>>({});

  const aircraft = useMemo(() => FLEET.find(f => f.tailNumber === selectedTail), [selectedTail]);

  // Load sessions, overrides, reporter from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('inventory-sessions-v2');
    if (saved) setSessions(JSON.parse(saved));
    const savedReporter = localStorage.getItem('inventory-reporter');
    if (savedReporter) setReporterName(savedReporter);
  }, []);

  // Load overrides per tail
  useEffect(() => {
    if (!selectedTail) return;
    const reqSaved = localStorage.getItem(`inventory-overrides-${aircraft?.type}`);
    setRequiredOverrides(reqSaved ? JSON.parse(reqSaved) : {});
    const locSaved = localStorage.getItem(`inventory-loc-overrides-${aircraft?.type}`);
    setLocationOverrides(locSaved ? JSON.parse(locSaved) : {});
  }, [selectedTail]);

  // Persist reporter name
  useEffect(() => {
    if (reporterName) localStorage.setItem('inventory-reporter', reporterName);
  }, [reporterName]);

  // Initialize items when aircraft is selected
  useEffect(() => {
    if (!aircraft) return;
    const sessionKey = `inventory-session-${selectedTail}`;
    const saved = localStorage.getItem(sessionKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      const reqOver: Record<string, number> = JSON.parse(localStorage.getItem(`inventory-overrides-${aircraft?.type}`) || '{}');
      const locOver: Record<string, string> = JSON.parse(localStorage.getItem(`inventory-loc-overrides-${aircraft?.type}`) || '{}');
      setItems((parsed.items || []).map((i: InventoryItem) => ({
        ...i,
        requiredQuantity: reqOver[i.id] !== undefined ? reqOver[i.id] : i.requiredQuantity,
        location: locOver[i.id] !== undefined ? locOver[i.id] : i.location,
      })));
      setCustomItems(parsed.customItems || []);
      setDeparture(parsed.departure || '');
      setArrival(parsed.arrival || '');
      setAdditionalNotes(parsed.additionalNotes || '');
    } else {
      const reqOver: Record<string, number> = JSON.parse(localStorage.getItem(`inventory-overrides-${aircraft?.type}`) || '{}');
      const locOver: Record<string, string> = JSON.parse(localStorage.getItem(`inventory-loc-overrides-${aircraft?.type}`) || '{}');
      setItems(initItemsForAircraft(aircraft.type).map((i: InventoryItem) => ({
        ...i,
        requiredQuantity: reqOver[i.id] !== undefined ? reqOver[i.id] : i.requiredQuantity,
        location: locOver[i.id] !== undefined ? locOver[i.id] : i.location,
      })));
      setCustomItems([]);
      setDeparture('');
      setArrival('');
      setAdditionalNotes('');
    }
  }, [aircraft, selectedTail]);

  // Auto-save session
  useEffect(() => {
    if (!selectedTail || !items.length) return;
    const sessionKey = `inventory-session-${selectedTail}`;
    localStorage.setItem(sessionKey, JSON.stringify({ items, customItems, departure, arrival, additionalNotes }));
  }, [items, customItems, selectedTail, departure, arrival, additionalNotes]);

  const readinessScore = useMemo(() => calcReadiness(items, customItems), [items, customItems]);

  const criticalLow = useMemo(() =>
    items.filter(i => i.priority === 'critical' && i.currentQuantity < i.requiredQuantity),
    [items]
  );

  const itemsNeedingRestock = useMemo(() =>
    items.filter(i => i.needsReplenishment),
    [items]
  );

  const rawFilteredItems = useMemo(() => {
    return items.filter(item => {
      // Basic search filtering
      if (searchTerm && !item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) && !item.alternateNames.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()))) return false;

      // Hidden items filtering
      if (hiddenItems.has(item.id) && !editMode) return false;

      // Priority filtering
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false;

      // Aircraft applicability filtering
      if (aircraft && !item.defaultQuantities[aircraft.type]) return false;

      return true;
    });
  }, [items, searchTerm, hiddenItems, editMode, filterPriority, aircraft]);

  const filteredItems = useMemo(() => {
    // If searchResults is active, this filteredItems will be ignored in favor of searchResults
    // Otherwise, filter by activeTab
    return rawFilteredItems.filter(item => item.area === activeTab);
  }, [rawFilteredItems, activeTab]);

  // Cross-tab search: when searchTerm is set, search ALL areas
  const searchResults = useMemo(() => {
    if (!searchTerm) return null;
    const t = searchTerm.toLowerCase();
    const matched = items.filter(i =>
      !hiddenItems.has(i.id) &&
      (filterPriority === 'all' || i.priority === filterPriority) &&
      (i.itemName.toLowerCase().includes(t) ||
        i.category.toLowerCase().includes(t) ||
        i.alternateNames.some(a => a.toLowerCase().includes(t)))
    );
    // Group by area
    return AREAS.reduce((acc, area) => {
      const areaItems = matched.filter(i => i.area === area);
      if (areaItems.length) acc[area] = areaItems;
      return acc;
    }, {} as Record<AreaType, InventoryItem[]>);
  }, [items, searchTerm, filterPriority, hiddenItems]);

  // All items for scan (current area or all)
  const scanItems = useMemo(() => items.filter(i => i.area === activeTab), [items, activeTab]);

  const hiddenInArea = useMemo(() =>
    items.filter(i => i.area === activeTab && hiddenItems.has(i.id)).length,
    [items, activeTab, hiddenItems]
  );

  function toggleReplenishment(id: string) {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, needsReplenishment: !i.needsReplenishment } : i
    ));
  }

  function adjustQuantity(id: string, delta: number) {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = Math.max(0, i.currentQuantity + delta);
      return { ...i, currentQuantity: newQty };
    }));
  }

  function hideItem(id: string) {
    setHiddenItems(prev => new Set([...prev, id]));
  }

  function restoreHidden() {
    setHiddenItems(new Set());
  }

  function changeRequired(id: string, qty: number) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, requiredQuantity: qty } : i));
    setRequiredOverrides(prev => {
      const next = { ...prev, [id]: qty };
      localStorage.setItem(`inventory-overrides-${aircraft?.type}`, JSON.stringify(next));
      return next;
    });
  }

  function changeLocation(id: string, loc: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, location: loc } : i));
    setLocationOverrides(prev => {
      const next = { ...prev, [id]: loc };
      localStorage.setItem(`inventory-loc-overrides-${aircraft?.type}`, JSON.stringify(next));
      return next;
    });
  }

  function resetArea() {
    if (!aircraft) return;
    setItems(prev => prev.map(i => {
      if (i.area !== activeTab) return i;
      return {
        ...i,
        currentQuantity: i.defaultQuantities[aircraft.type] ?? i.requiredQuantity,
        needsReplenishment: false,
      };
    }));
    toast.success(`${AREA_META[activeTab].label} reset to full stock`);
  }

  function addCustomItem() {
    if (!customName.trim()) { toast.error('Item name required'); return; }
    const newItem: CustomItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      quantity: customQty,
      area: customArea,
      category: customCategory.trim() || 'Custom',
      needsReplenishment: false,
      notes: customNotes,
    };
    setCustomItems(prev => [...prev, newItem]);
    setCustomName(''); setCustomQty(1); setCustomCategory(''); setCustomNotes('');
    setShowAddCustom(false);
    toast.success(`Added ${newItem.name}`);
  }

  function submitInventory() {
    if (!reporterName.trim()) { toast.error('Enter your name first'); return; }
    if (!selectedTail) { toast.error('Select an aircraft first'); return; }
    const session: InventorySession = {
      id: `session-${Date.now()}`,
      tailNumber: selectedTail,
      aircraftType: aircraft!.type,
      date: new Date().toISOString(),
      reportedBy: reporterName,
      departure,
      arrival,
      checkedItems: items.map(i => ({ itemId: i.id, currentQuantity: i.currentQuantity, needsReplenishment: i.needsReplenishment })),
      customItems,
      additionalNotes,
      status: 'submitted',
      readinessScore,
    };
    const updated = [session, ...sessions].slice(0, 20);
    setSessions(updated);
    localStorage.setItem('inventory-sessions-v2', JSON.stringify(updated));
    localStorage.removeItem(`inventory-session-${selectedTail}`);
    toast.success('Inventory submitted!');
    setCurrentView('history');
  }

  function generateShoppingList() {
    const flagged = items.filter(i => i.needsReplenishment || i.currentQuantity < i.requiredQuantity);
    if (!flagged.length && !customItems.filter(c => c.needsReplenishment).length) {
      toast.info('No items flagged for restock'); return;
    }
    setMainTab('grocery');
  }

  // ── No aircraft selected ──────────────────────────────────────────────────
  if (!selectedTail) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-7 h-7 text-primary" /> Aircraft Inventory
          </h1>
          <p className="text-muted-foreground mt-1">Select an aircraft to begin your pre-flight inventory check.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {FLEET.map(ac => {
            const sessionKey = `inventory-session-${ac.tailNumber}`;
            const hasDraft = !!localStorage.getItem(sessionKey);
            return (
              <button
                key={ac.tailNumber}
                onClick={() => setSelectedTail(ac.tailNumber)}
                className="group relative rounded-2xl border border-border bg-muted/40 p-5 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                {hasDraft && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-10" onClick={e => e.stopPropagation()}>
                    <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Draft
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Clear draft for ${ac.tailNumber}?`)) {
                          localStorage.removeItem(sessionKey);
                          setSessions([...sessions]);
                          toast.success('Draft cleared');
                        }
                      }}
                      className="p-1 hover:bg-amber-500/20 bg-background/50 backdrop-blur rounded-full text-amber-500/70 hover:text-amber-500 transition-colors border border-amber-500/20"
                      title="Clear draft"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <Plane className="w-8 h-8 text-primary mb-3" />
                <p className="text-xl font-bold text-foreground">{ac.tailNumber}</p>
                <p className="text-sm text-muted-foreground">{ac.type}</p>
              </button>
            );
          })}
        </div>

        {sessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Submissions</h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-4 bg-muted/40 border border-border/60 rounded-xl px-4 py-3">
                  <Plane className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.tailNumber} — {s.aircraftType}</p>
                    <p className="text-xs text-muted-foreground/70">{new Date(s.date).toLocaleDateString()} · {s.reportedBy}{s.departure && s.arrival ? ` · ${s.departure} ✈️ ${s.arrival}` : ''}</p>
                  </div>
                  <span className={`text-sm font-bold ${readinessColor(s.readinessScore)}`}>{s.readinessScore}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main View Logic ───────────────────────────────────────────────────────

  // ── History View ──────────────────────────────────────────────────────────
  if (currentView === 'history') {
    const tailSessions = sessions.filter(s => s.tailNumber === selectedTail);
    return (
      <HistoryView
        tailSessions={tailSessions}
        selectedTail={selectedTail}
        items={items}
        onBack={() => setCurrentView('check')}
      />
    );
  }

  // ── Main Check View ───────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-5xl mx-auto">
      {showScanMode && (
        <QuickScanMode items={scanItems} onToggle={toggleReplenishment} onClose={() => setShowScanMode(false)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedTail('')} className="p-1 hover:bg-muted/50 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold text-foreground">{selectedTail}</h1>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">{aircraft?.type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <div className="flex items-center justify-between mb-5">
          <TabsList className="h-14 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="inventory" className="flex gap-2 text-base px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-full">
              <ClipboardList className="w-5 h-5" /> Inventory Check
            </TabsTrigger>
            <TabsTrigger value="grocery" className="flex gap-2 text-base px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-full">
              <ShoppingCart className="w-5 h-5" /> Grocery List
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm"
            className="border-border bg-muted/50 text-foreground hover:bg-accent gap-1.5"
            onClick={() => setCurrentView('history')}>
            <History className="w-4 h-4" /> History
          </Button>
        </div>

        <TabsContent value="inventory" className="mt-0">
          {/* Reporter + Departure/Arrival */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Your Name</Label>
              <Input
                placeholder="Flight Attendant Name"
                value={reporterName}
                onChange={e => setReporterName(e.target.value)}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50 h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Departure</Label>
              <Input
                placeholder="e.g. TEB"
                value={departure}
                onChange={e => setDeparture(e.target.value)}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50 h-9 uppercase"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Arrival</Label>
              <Input
                placeholder="e.g. VNY"
                value={arrival}
                onChange={e => setArrival(e.target.value)}
                className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50 h-9 uppercase"
              />
            </div>
          </div>

          {/* Critical alert banner */}
          {criticalLow.length > 0 && (
            <div className="mb-5 bg-destructive/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300 mb-0.5">⚠ Critical items below threshold</p>
                <p className="text-xs text-red-400/80">{criticalLow.map(i => i.itemName).join(' · ')}</p>
              </div>
            </div>
          )}

          {/* Area summary chips */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
            {AREAS.map(area => (
              <button key={area} onClick={() => setActiveTab(area)} className="text-left">
                <AreaSummaryChip area={area} items={items} />
              </button>
            ))}
          </div>

          {/* Filters Grid */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50 h-9 text-sm"
              />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32 bg-muted/50 border-border text-foreground h-9 text-sm">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline"
              className="bg-muted/50 border-border text-foreground hover:bg-accent gap-1.5 h-9"
              onClick={() => setShowScanMode(true)}>
              <Scan className="w-3.5 h-3.5" /> Quick Scan
            </Button>
            <Button size="sm" variant="outline"
              className="bg-muted/50 border-border text-muted-foreground hover:bg-accent gap-1 h-9"
              onClick={resetArea}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => setEditMode(e => !e)}
              className={`gap-1.5 h-9 transition-all ${editMode
                ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20'
                : 'bg-muted/50 border-border text-muted-foreground hover:bg-accent'
                }`}>
              <Pencil className="w-3.5 h-3.5" />
              <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                Editing Defaults
              </Badge>
            </Button>
          </div>
          {editMode && (
            <div className="mb-3 flex items-center gap-2 text-xs text-primary/80 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span>Edit mode — change required quantities or hide items. Changes save automatically.</span>
              {hiddenInArea > 0 && (
                <button onClick={restoreHidden} className="ml-auto text-xs underline text-primary hover:text-primary/80 shrink-0">
                  Restore {hiddenInArea} hidden
                </button>
              )}
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as AreaType)}>
            {/* Custom tab bar — bigger, theme-safe */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
              {AREAS.map(area => {
                const { pct } = getAreaReadiness(items, area);
                const { label, icon: Icon, color } = AREA_META[area];
                const isActive = activeTab === area;
                return (
                  <button
                    key={area}
                    onClick={() => setActiveTab(area)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border shrink-0 ${isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : color}`} />
                    {label}
                    {pct < 100 && (
                      <span className={`text-xs font-bold ml-0.5 ${isActive ? 'text-primary-foreground/80' : readinessColor(pct)}`}>
                        {pct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cross-tab search results — shown instead of tab panels when searching */}
            {searchResults ? (
              <div className="space-y-5 mt-0">
                {Object.keys(searchResults).length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground/50">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No items match "{searchTerm}"</p>
                  </div>
                ) : (
                  Object.entries(searchResults).map(([area, areaItems]) => (
                    <div key={area}>
                      <div className="flex items-center gap-2 mb-2">
                        {React.createElement(AREA_META[area as AreaType].icon, { className: `w-4 h-4 ${AREA_META[area as AreaType].color}` })}
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{AREA_META[area as AreaType].label}</span>
                        <span className="text-xs text-muted-foreground/50">({areaItems.length})</span>
                      </div>
                      <div className="space-y-6">
                        {Object.entries(
                          areaItems.reduce((acc, item) => {
                            acc[item.category] = acc[item.category] || [];
                            acc[item.category].push(item);
                            return acc;
                          }, {} as Record<string, InventoryItem[]>)
                        ).map(([category, catItems]) => (
                          <div key={category}>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b border-border/40">
                              {category}
                            </h4>
                            <div className="space-y-2">
                              {catItems.map(item => (
                                <ItemCard
                                  key={item.id}
                                  item={item}
                                  onAdjust={adjustQuantity}
                                  editMode={editMode}
                                  onHide={hideItem}
                                  onChangeRequired={changeRequired}
                                  onChangeLocation={changeLocation}
                                  defaultRequired={item.defaultQuantities[aircraft?.type ?? 'G650']}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>{AREAS.map(area => (
                <TabsContent key={area} value={area} className="mt-0">
                  <div className="space-y-2">
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground/50">
                        <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No items match your filters</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(
                          // Group normal Items and Custom Items into the same dictionary
                          (() => {
                            const grouped = filteredItems.reduce((acc, item) => {
                              acc[item.category] = acc[item.category] || { normal: [], custom: [] };
                              acc[item.category].normal.push(item);
                              return acc;
                            }, {} as Record<string, { normal: InventoryItem[], custom: CustomItem[] }>);

                            customItems.filter(c => c.area === area).forEach(c => {
                              const cat = c.category || 'Custom';
                              if (!grouped[cat]) grouped[cat] = { normal: [], custom: [] };
                              grouped[cat].custom.push(c);
                            });

                            return grouped;
                          })()
                        ).map(([category, { normal, custom }]) => (
                          <div key={category}>
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b border-border/40">
                              {category}
                            </h4>
                            <div className="space-y-2">
                              {normal.map(item => (
                                <ItemCard
                                  key={item.id}
                                  item={item}
                                  onAdjust={adjustQuantity}
                                  editMode={editMode}
                                  onHide={hideItem}
                                  onChangeRequired={changeRequired}
                                  onChangeLocation={changeLocation}
                                  defaultRequired={item.defaultQuantities[aircraft?.type ?? 'G650']}
                                />
                              ))}
                              {custom.map(c => (
                                <div key={c.id} className={`rounded-xl border p-3 ${c.needsReplenishment ? 'border-orange-500/30 bg-orange-500/5' : 'border-border/60 bg-muted/30'}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Badge className="text-[10px] bg-blue-500/15 text-blue-400 border-blue-500/30">Custom</Badge>
                                      <span className="text-sm text-foreground">{c.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">Qty: {c.quantity}</span>
                                      <Switch
                                        checked={c.needsReplenishment}
                                        onCheckedChange={() => setCustomItems(prev => prev.map(ci =>
                                          ci.id === c.id ? { ...ci, needsReplenishment: !ci.needsReplenishment } : ci
                                        ))}
                                      />
                                      <button onClick={() => setCustomItems(prev => prev.filter(ci => ci.id !== c.id))}>
                                        <Trash2 className="w-4 h-4 text-red-500/50 hover:text-red-500" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => { setCustomArea(area); setShowAddCustom(true); }}
                      className="w-full border border-dashed border-border rounded-xl p-3 text-sm text-muted-foreground/70 hover:border-border hover:text-muted-foreground transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add custom item
                    </button>
                  </div>
                </TabsContent>
              ))}</>)}
          </Tabs>

          {/* Add custom item modal */}
          {showAddCustom && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end md:items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm">
                <h3 className="text-base font-semibold text-foreground mb-4">Add Custom Item</h3>
                <div className="space-y-3">
                  <Input placeholder="Item name" value={customName} onChange={e => setCustomName(e.target.value)}
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50" />
                  <div className="flex gap-2">
                    <Input type="number" min={1} value={customQty} onChange={e => setCustomQty(parseInt(e.target.value) || 1)}
                      className="bg-muted/50 border-border text-foreground w-24" />
                    <Select value={customArea} onValueChange={(v: string) => setCustomArea(v as AreaType)}>
                      <SelectTrigger className="flex-1 bg-muted/50 border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AREAS.map(a => <SelectItem key={a} value={a}>{AREA_META[a].label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Category (e.g. Snacks)" list="category-suggestions" value={customCategory} onChange={e => setCustomCategory(e.target.value)}
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50" />
                  <datalist id="category-suggestions">
                    {Array.from(new Set(DEFAULT_INVENTORY.map(i => i.category))).map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <Input placeholder="Notes (optional)" value={customNotes} onChange={e => setCustomNotes(e.target.value)}
                    className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50" />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1 border-border bg-muted/50 text-foreground" onClick={() => setShowAddCustom(false)}>Cancel</Button>
                  <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={addCustomItem}>Add</Button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom action bar now purely a 'Needed mode tools' wrapper for resetting or exporting */}
          <div className="mt-6 pt-4 border-t border-border/60">
            {/* Bottom bar reserved for future main actions */}
          </div>
        </TabsContent>

        <TabsContent value="grocery" className="mt-0">
          <ShoppingListView
            items={items}
            customItems={customItems}
            selectedTail={selectedTail}
            reporterName={reporterName}
            additionalNotes={additionalNotes}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}