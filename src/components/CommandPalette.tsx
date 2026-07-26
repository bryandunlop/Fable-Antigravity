import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Search, FileText, Clock, Package, Plane, ClipboardCheck, Send, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { entriesForRoles, DOMAIN_LABELS } from '../navigation/navConfig';
import type { NavEntry } from '../navigation/navConfig';
import type { LucideIcon } from 'lucide-react';
import { api } from './inventory-v2/api-client';
import { useQuickLinks, searchLinks } from '../utils/quickLinks';

type Section = 'recent' | 'pages' | 'links' | 'inventory';

interface PaletteResult {
  id: string;
  title: string;
  description?: string;
  href: string;
  category: string;
  icon: LucideIcon;
  section: Section;
  external?: boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  additionalRoles?: string[];
}

const SECTION_HEADINGS: Record<Section, string> = {
  recent: 'Recent',
  pages: 'Pages',
  links: 'Links',
  inventory: 'Inventory',
};

const INVENTORY_ROLES = ['inflight', 'admin', 'commissary-manager'];

// Minimal shapes of the /api/state payload fields the palette searches.
interface InventoryData {
  items: { id: string; itemName: string; supplyCategory?: string }[];
  trips: { id: string; tailNumber: string; tripName?: string; status: string }[];
  inspections: { id: string; tailNumber: string; reportedBy?: string; date?: string }[];
  unitItemRequests: { id: string; unitTailNumber: string; status: string }[];
}

// Session-level cache; one fetch per page load, shared across palette opens.
// The payload is normalized at this seam so a missing or renamed field in
// /api/state degrades to an empty section instead of throwing during render.
let inventoryPromise: Promise<InventoryData | null> | null = null;
let inventoryWarned = false;
function loadInventoryData(): Promise<InventoryData | null> {
  if (!inventoryPromise) {
    inventoryPromise = api.state.load()
      .then((d: any): InventoryData => ({
        items: d?.items ?? [],
        trips: d?.trips ?? [],
        inspections: d?.inspections ?? [],
        unitItemRequests: d?.unitItemRequests ?? [],
      }))
      .catch((err: unknown) => {
        if (!inventoryWarned) {
          console.warn('Command palette: inventory search unavailable', err);
          inventoryWarned = true;
        }
        inventoryPromise = null;
        return null;
      });
  }
  return inventoryPromise;
}

function pageToResult(entry: NavEntry): PaletteResult {
  return {
    id: `page-${entry.path}-${entry.label}`,
    title: entry.label,
    href: entry.href ?? entry.path,
    category: DOMAIN_LABELS[entry.domain],
    icon: entry.icon ?? FileText,
    section: 'pages',
  };
}

export default function CommandPalette({ isOpen, onClose, userRole, additionalRoles = [] }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const navigate = useNavigate();
  const { org, personal } = useQuickLinks();

  const hasInventoryAccess =
    INVENTORY_ROLES.includes(userRole) || additionalRoles.some(r => INVENTORY_ROLES.includes(r));

  // Lazy-load inventory data the first time the palette opens
  useEffect(() => {
    if (isOpen && hasInventoryAccess && !inventory) {
      let cancelled = false;
      loadInventoryData().then(data => {
        if (!cancelled && data) setInventory(data);
      });
      return () => { cancelled = true; };
    }
  }, [isOpen, hasInventoryAccess, inventory]);

  const visibleEntries = entriesForRoles(userRole, additionalRoles).filter(e => e.searchable !== false && !e.hidden);
  const searchTerm = query.toLowerCase().trim();

  // Recent sections — only when not searching. Stored paths are exact manifest
  // section paths, so an exact match against the role-visible entries doubles
  // as the access filter (prefix matching could mislabel after a role switch).
  const recentResults: PaletteResult[] = [];
  if (isOpen && !searchTerm) {
    try {
      const recents: string[] = JSON.parse(localStorage.getItem('nav-recents') ?? '[]');
      for (const path of recents) {
        const entry = visibleEntries.find(e => e.path === path);
        if (entry) {
          recentResults.push({
            id: `recent-${path}`,
            title: entry.label,
            href: path,
            category: DOMAIN_LABELS[entry.domain],
            icon: Clock,
            section: 'recent',
          });
        }
      }
    } catch {
      // corrupted localStorage — show no recents
    }
  }

  const pageResults: PaletteResult[] = visibleEntries
    .filter(e => {
      if (!searchTerm) return true;
      return (
        e.label.toLowerCase().includes(searchTerm) ||
        DOMAIN_LABELS[e.domain].toLowerCase().includes(searchTerm) ||
        (e.keywords ?? []).some(k => k.toLowerCase().includes(searchTerm))
      );
    })
    .slice(0, 8)
    .map(pageToResult);

  const inventoryResults: PaletteResult[] = [];
  if (inventory && searchTerm.length >= 2) {
    inventory.items
      .filter(i => i.itemName.toLowerCase().includes(searchTerm))
      .slice(0, 3)
      .forEach(i => inventoryResults.push({
        id: `inv-item-${i.id}`, title: i.itemName, description: i.supplyCategory,
        href: '/inventory-v2/commissary', category: 'Item', icon: Package, section: 'inventory',
      }));
    inventory.trips
      .filter(t => `${t.tailNumber} ${t.tripName ?? ''}`.toLowerCase().includes(searchTerm))
      .slice(0, 3)
      .forEach(t => inventoryResults.push({
        id: `inv-trip-${t.id}`, title: `${t.tailNumber}${t.tripName ? ` — ${t.tripName}` : ''}`,
        description: t.status === 'active' ? 'Active trip' : 'Trip',
        href: `/inventory-v2/trips/${t.id}`, category: 'Trip', icon: Plane, section: 'inventory',
      }));
    inventory.inspections
      .filter(i => `${i.tailNumber} ${i.reportedBy ?? ''}`.toLowerCase().includes(searchTerm))
      .slice(0, 3)
      .forEach(i => inventoryResults.push({
        id: `inv-insp-${i.id}`, title: `${i.tailNumber} inspection`, description: i.date,
        // No per-inspection review route exists (only the parameterless review step
        // inside the form flow), so land on the inspections list rather than a 404.
        href: '/inventory-v2/inspections', category: 'Inspection', icon: ClipboardCheck, section: 'inventory',
      }));
    inventory.unitItemRequests
      .filter(r => (r.status === 'open' || r.status === 'in_progress') && r.unitTailNumber.toLowerCase().includes(searchTerm))
      .slice(0, 3)
      .forEach(r => inventoryResults.push({
        id: `inv-req-${r.id}`, title: `${r.unitTailNumber} request`, description: r.status,
        href: '/inventory-v2/unit-requests', category: 'Request', icon: Send, section: 'inventory',
      }));
  }

  // External quick links (shared store with the dashboard card). A short list
  // when browsing; more room when the user is actually searching.
  const linkResults: PaletteResult[] = searchLinks([...org, ...personal], searchTerm)
    .slice(0, searchTerm ? 6 : 4)
    .map(l => {
      let host = l.url;
      try {
        host = new URL(l.url).hostname;
      } catch {
        // unparseable stored url — show it raw
      }
      return {
        id: `link-${l.id}`,
        title: l.name,
        description: host,
        href: l.url,
        category: l.scope === 'org' ? 'Org link' : 'Personal',
        icon: ExternalLink,
        section: 'links' as const,
        external: true,
      };
    });

  const filteredResults: PaletteResult[] = [...recentResults, ...pageResults, ...linkResults, ...inventoryResults];

  const handleSelect = (result: PaletteResult) => {
    if (result.external) {
      window.open(result.href, '_blank', 'noopener,noreferrer');
    } else {
      navigate(result.href);
    }
    onClose();
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredResults.length === 0) return;
      setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredResults.length === 0) return;
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults.length > 0 && filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex]);
      }
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-2xl" aria-describedby="command-palette-description">
        <DialogTitle className="sr-only">
          Global Search
        </DialogTitle>
        <DialogDescription id="command-palette-description" className="sr-only">
          Search pages, inventory records, and quick links. Use arrow keys to navigate and Enter to select.
        </DialogDescription>

        <div className="border-b">
          <div className="flex items-center px-4 py-3">
            <Search className="w-4 h-4 text-muted-foreground mr-3" />
            <Input
              placeholder="Search pages, links, items, trips..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filteredResults.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredResults.map((result, index) => {
                const Icon = result.icon;
                const isFirstOfSection = index === 0 || filteredResults[index - 1].section !== result.section;
                return (
                  <React.Fragment key={result.id}>
                    {isFirstOfSection && (
                      <div className="px-3 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {SECTION_HEADINGS[result.section]}
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                        }`}
                      onClick={() => handleSelect(result)}
                    >
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {result.category}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      </DialogContent>
    </Dialog>
  );
}
