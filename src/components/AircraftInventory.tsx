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
  BarChart2, ClipboardList, Scan, Star, Pencil
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
  flightNumber: string;
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
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AREA_META: Record<AreaType, { label: string; icon: React.ElementType; color: string }> = {
  'forward-lav': { label: 'Forward Lav', icon: Droplets, color: 'text-cyan-400' },
  'galley': { label: 'Galley', icon: Coffee, color: 'text-amber-400' },
  'aft-lav': { label: 'Aft Lav', icon: Star, color: 'text-purple-400' },
  'credenza': { label: 'Credenza', icon: Package, color: 'text-emerald-400' },
  'chiller': { label: 'Chiller / Baggage', icon: Zap, color: 'text-blue-400' },
};

const AREAS: AreaType[] = ['forward-lav', 'galley', 'aft-lav', 'credenza', 'chiller'];

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

function ReadinessRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#eab308' : '#ef4444';
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-xl font-bold text-foreground">{score}%</span>
        <span className="text-[10px] text-muted-foreground tracking-wide uppercase">Ready</span>
      </div>
    </div>
  );
}

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
  onToggle,
  onAdjust,
  editMode = false,
  onHide,
  onChangeRequired,
  defaultRequired,
}: {
  item: InventoryItem;
  onToggle: (id: string) => void;
  onAdjust: (id: string, delta: number) => void;
  editMode?: boolean;
  onHide?: (id: string) => void;
  onChangeRequired?: (id: string, qty: number) => void;
  defaultRequired?: number;
}) {
  const pct = item.requiredQuantity > 0
    ? Math.min(100, Math.round((item.currentQuantity / item.requiredQuantity) * 100))
    : 100;
  const isLow = item.currentQuantity < item.requiredQuantity;

  return (
    <div className={`rounded-xl border transition-all ${editMode
      ? 'border-primary/30 bg-primary/5'
      : item.needsReplenishment
        ? 'border-orange-500/40 bg-orange-500/10'
        : isLow
          ? 'border-yellow-500/20 bg-yellow-500/5'
          : 'border-border/60 bg-muted/30'
      } p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">{item.itemName}</span>
            <Badge className={`text-[10px] px-1.5 py-0 shrink-0 ${PRIORITY_COLORS[item.priority]}`}>
              {item.priority}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{item.location}</p>
          {item.notes && <p className="text-[10px] text-muted-foreground/50 mt-0.5 italic">{item.notes}</p>}
          <StockBar current={item.currentQuantity} required={item.requiredQuantity} />
        </div>
        {editMode ? (
          <button
            onClick={() => onHide?.(item.id)}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
            title="Hide this item"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => onToggle(item.id)}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${item.needsReplenishment
              ? 'bg-orange-500/15 border-orange-500/40 text-orange-400 hover:bg-orange-500/25'
              : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {item.needsReplenishment ? 'Remove' : 'Add to list'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <Button size="sm" variant="outline"
          className="h-7 w-7 p-0 bg-muted/50 border-border hover:bg-accent"
          onClick={() => onAdjust(item.id, -1)}
          disabled={item.currentQuantity <= 0}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <span className={`text-sm font-semibold w-8 text-center ${pct < 60 ? 'text-red-400' : pct < 90 ? 'text-yellow-400' : 'text-emerald-400'}`}>
          {item.currentQuantity}
        </span>
        <Button size="sm" variant="outline"
          className="h-7 w-7 p-0 bg-muted/50 border-border hover:bg-accent"
          onClick={() => onAdjust(item.id, 1)}
        >
          <Plus className="w-3 h-3" />
        </Button>
        <span className="text-[11px] text-muted-foreground/70">/</span>
        {editMode ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={item.requiredQuantity}
              onChange={e => onChangeRequired?.(item.id, Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 h-7 text-sm text-center font-semibold bg-background border border-primary/40 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {defaultRequired !== undefined && defaultRequired !== item.requiredQuantity && (
              <button
                onClick={() => onChangeRequired?.(item.id, defaultRequired)}
                title={`Reset to default (${defaultRequired})`}
                className="p-1 text-muted-foreground/50 hover:text-primary rounded transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground/70">{item.requiredQuantity} req.</span>
        )}
        {!editMode && item.currentQuantity < item.requiredQuantity && (
          <Badge className="ml-auto text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/30">
            Need {item.requiredQuantity - item.currentQuantity}
          </Badge>
        )}
        {editMode && (
          <span className="ml-auto text-[10px] text-primary/60 italic">editing</span>
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
  onBack: () => void;
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
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold text-foreground flex-1">Shopping List</h1>
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
                      {s.reportedBy}{s.flightNumber ? ` · ${s.flightNumber}` : ''}
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
  const [flightNumber, setFlightNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [showScanMode, setShowScanMode] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customArea, setCustomArea] = useState<AreaType>('galley');
  const [customNotes, setCustomNotes] = useState('');
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [currentView, setCurrentView] = useState<'check' | 'shopping' | 'history'>('check');
  const [editMode, setEditMode] = useState(false);
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [requiredOverrides, setRequiredOverrides] = useState<Record<string, number>>({});

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
    const saved = localStorage.getItem(`inventory-overrides-${selectedTail}`);
    setRequiredOverrides(saved ? JSON.parse(saved) : {});
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
      const overrides: Record<string, number> = JSON.parse(localStorage.getItem(`inventory-overrides-${selectedTail}`) || '{}');
      setItems((parsed.items || []).map((i: InventoryItem) => overrides[i.id] !== undefined ? { ...i, requiredQuantity: overrides[i.id] } : i));
      setCustomItems(parsed.customItems || []);
      setFlightNumber(parsed.flightNumber || '');
      setAdditionalNotes(parsed.additionalNotes || '');
    } else {
      const overrides: Record<string, number> = JSON.parse(localStorage.getItem(`inventory-overrides-${selectedTail}`) || '{}');
      setItems(initItemsForAircraft(aircraft.type).map(i => overrides[i.id] !== undefined ? { ...i, requiredQuantity: overrides[i.id] } : i));
      setCustomItems([]);
      setFlightNumber('');
      setAdditionalNotes('');
    }
  }, [aircraft, selectedTail]);

  // Auto-save session
  useEffect(() => {
    if (!selectedTail || !items.length) return;
    const sessionKey = `inventory-session-${selectedTail}`;
    localStorage.setItem(sessionKey, JSON.stringify({ items, customItems, flightNumber, additionalNotes }));
  }, [items, customItems, selectedTail, flightNumber, additionalNotes]);

  const readinessScore = useMemo(() => calcReadiness(items, customItems), [items, customItems]);

  const criticalLow = useMemo(() =>
    items.filter(i => i.priority === 'critical' && i.currentQuantity < i.requiredQuantity),
    [items]
  );

  const itemsNeedingRestock = useMemo(() =>
    items.filter(i => i.needsReplenishment),
    [items]
  );

  const filteredItems = useMemo(() => {
    let result = items.filter(i => i.area === activeTab && !hiddenItems.has(i.id));
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.itemName.toLowerCase().includes(t) ||
        i.category.toLowerCase().includes(t) ||
        i.alternateNames.some(a => a.toLowerCase().includes(t))
      );
    }
    if (filterPriority !== 'all') {
      result = result.filter(i => i.priority === filterPriority);
    }
    return result;
  }, [items, activeTab, searchTerm, filterPriority, hiddenItems]);

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
      localStorage.setItem(`inventory-overrides-${selectedTail}`, JSON.stringify(next));
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
      needsReplenishment: false,
      notes: customNotes,
    };
    setCustomItems(prev => [...prev, newItem]);
    setCustomName(''); setCustomQty(1); setCustomNotes('');
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
      flightNumber,
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
    setCurrentView('shopping');
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
                  <Badge className="absolute top-2 right-2 text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                    Draft
                  </Badge>
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
                    <p className="text-xs text-muted-foreground/70">{new Date(s.date).toLocaleDateString()} · {s.reportedBy}{s.flightNumber ? ` · ${s.flightNumber}` : ''}</p>
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

  // ── Shopping List View ────────────────────────────────────────────────────
  if (currentView === 'shopping') {
    return (
      <ShoppingListView
        items={items}
        customItems={customItems}
        selectedTail={selectedTail}
        reporterName={reporterName}
        additionalNotes={additionalNotes}
        onBack={() => setCurrentView('check')}
      />
    );
  }

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
        <ReadinessRing score={readinessScore} />
      </div>

      {/* Reporter + Flight number */}
      <div className="grid grid-cols-2 gap-3 mb-5">
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
          <Label className="text-xs text-muted-foreground mb-1 block">Flight Number</Label>
          <Input
            placeholder="e.g. PGF-001"
            value={flightNumber}
            onChange={e => setFlightNumber(e.target.value)}
            className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/50 h-9"
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

      {/* Action bar */}
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
          {editMode ? 'Done' : 'Edit'}
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
                  <div className="space-y-2">
                    {areaItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onToggle={toggleReplenishment}
                        onAdjust={adjustQuantity}
                        editMode={editMode}
                        onHide={hideItem}
                        onChangeRequired={changeRequired}
                        defaultRequired={item.defaultQuantities[aircraft?.type ?? 'G650']}
                      />
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
                  filteredItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onToggle={toggleReplenishment}
                      onAdjust={adjustQuantity}
                      editMode={editMode}
                      onHide={hideItem}
                      onChangeRequired={changeRequired}
                      defaultRequired={item.defaultQuantities[aircraft?.type ?? 'G650']}
                    />
                  ))
                )}

                {/* Custom items for this area */}
                {customItems.filter(c => c.area === area).map(c => (
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

      {/* Bottom action bar */}
      <div className="mt-6 pt-4 border-t border-border/60 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm"
            className="border-border bg-muted/50 text-foreground hover:bg-accent gap-1.5"
            onClick={() => setCurrentView('history')}>
            <History className="w-4 h-4" /> History
          </Button>
          <Button variant="outline" size="sm"
            className="border-border bg-muted/50 text-foreground hover:bg-accent gap-1.5"
            onClick={generateShoppingList}>
            <ShoppingCart className="w-4 h-4" /> Shopping List
            {itemsNeedingRestock.length > 0 && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] ml-0.5">
                {itemsNeedingRestock.length}
              </Badge>
            )}
          </Button>
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Additional notes..."
            value={additionalNotes}
            onChange={e => setAdditionalNotes(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-9 py-2 text-sm resize-none w-48"
          />
          <Button
            onClick={submitInventory}
            className="bg-primary hover:bg-primary/90 text-white gap-1.5"
            disabled={!reporterName.trim()}
          >
            <FileText className="w-4 h-4" /> Submit
          </Button>
        </div>
      </div>
    </div>
  );
}