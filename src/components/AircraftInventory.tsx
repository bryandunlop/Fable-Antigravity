import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import {
  Package,
  Plus,
  Minus,
  Search,
  Plane,
  AlertTriangle,
  CheckCircle,
  FileText,
  Download,
  Clock,
  User,
  Mail,
  Trash2,
  RotateCcw,
  Check,
  X,
  Zap,
  UtensilsCrossed,
  Armchair,
  Droplets,
  ShoppingCart,
  Calendar,
  Coffee,
  Wine,
  Baby,
  Eye,
  Filter,
  Edit,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

// Enhanced Types
interface FleetConfig {
  types: string[]; // e.g., ["G650", "G500"]
  aircraft: {
    tailNumber: string; // e.g., "1PG"
    type: string;       // e.g., "G650"
  }[];
}

interface InventoryItem {
  id: string;
  category: string;
  itemName: string;
  alternateNames: string[]; // For search aliases like "coffee" instead of "Premium Coffee Pods"
  currentQuantity: number;
  requiredQuantity: number; // Used for specific reports
  defaultQuantities: Record<string, number>; // Key is aircraft type
  location: string;
  area: 'galley' | 'cabin' | 'lavatory';
  needsReplenishment: boolean;
  isCustomItem?: boolean;
  notes?: string;
  lastChecked: string;
  monthlyInventoryDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface ReplenishmentReport {
  id: string;
  aircraft: string;
  flightNumber?: string;
  date: string;
  reportedBy: string;
  items: InventoryItem[];
  customItems: { name: string; quantity: number; notes?: string; area: string; }[];
  additionalNotes?: string;
  status: 'draft' | 'submitted';
  visibleToAllFAs: boolean;
  lastModified: string;
}

interface ShoppingList {
  id: string;
  aircraft: string;
  generatedBy: string;
  generatedDate: string;
  items: {
    itemName: string;
    quantityNeeded: number;
    area: string;
    priority: string;
    notes?: string;
  }[];
  customItems: {
    name: string;
    quantity: number;
    area: string;
    notes?: string;
  }[];
  isCompleted: boolean;
}

const DEFAULT_FLEET_CONFIG: FleetConfig = {
  types: ['G650', 'G500'],
  aircraft: [
    { tailNumber: '1PG', type: 'G650' },
    { tailNumber: '2PG', type: 'G650' },
    { tailNumber: '5PG', type: 'G500' },
    { tailNumber: '6PG', type: 'G500' }
  ]
};

const DEFAULT_STANDARD_INVENTORY: InventoryItem[] = [
  // Galley Items
  {
    id: '1',
    category: 'Beverages',
    itemName: 'Premium Coffee Pods (Nespresso)',
    alternateNames: ['coffee', 'nespresso', 'coffee pods', 'espresso'],
    currentQuantity: 45,
    requiredQuantity: 50,
    defaultQuantities: { 'G650': 50, 'G500': 30 },
    location: 'Forward Galley Cabinet A',
    area: 'galley',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'medium'
  },
  {
    id: '2',
    category: 'Beverages',
    itemName: 'Evian Premium Water (750ml)',
    alternateNames: ['water', 'evian', 'bottled water', 'still water'],
    currentQuantity: 18,
    requiredQuantity: 24,
    defaultQuantities: { 'G650': 24, 'G500': 12 },
    location: 'Galley Refrigerator',
    area: 'galley',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'high'
  },
  {
    id: '3',
    category: 'Glassware',
    itemName: 'Crystal Champagne Flutes',
    alternateNames: ['champagne glasses', 'flutes', 'crystal glasses', 'wine glasses'],
    currentQuantity: 16,
    requiredQuantity: 20,
    defaultQuantities: { 'G650': 20, 'G500': 12 },
    location: 'Galley Glassware Cabinet',
    area: 'galley',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'medium'
  },
  {
    id: '4',
    category: 'Beverages',
    itemName: 'Dom Pérignon Champagne',
    alternateNames: ['champagne', 'dom perignon', 'sparkling wine', 'wine'],
    currentQuantity: 4,
    requiredQuantity: 6,
    defaultQuantities: { 'G650': 6, 'G500': 3 },
    location: 'Wine Cooler',
    area: 'galley',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'low'
  },
  {
    id: '5',
    category: 'Dining',
    itemName: 'Wedgwood Fine China Set',
    alternateNames: ['plates', 'china', 'dining plates', 'wedgwood'],
    currentQuantity: 10,
    requiredQuantity: 12,
    defaultQuantities: { 'G650': 12, 'G500': 8 },
    location: 'Galley China Storage',
    area: 'galley',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'medium'
  },
  {
    id: '6',
    category: 'Food',
    itemName: 'Raw Sugar Packets',
    alternateNames: ['sugar', 'sweetener', 'sugar packets', 'raw sugar'],
    currentQuantity: 35,
    requiredQuantity: 50,
    defaultQuantities: { 'G650': 50, 'G500': 30 },
    location: 'Galley Condiment Storage',
    area: 'galley',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'medium'
  },

  // Cabin Items
  {
    id: '7',
    category: 'Comfort',
    itemName: 'Hermès Cashmere Blankets',
    alternateNames: ['blankets', 'hermes blankets', 'cashmere', 'throws'],
    currentQuantity: 6,
    requiredQuantity: 12,
    defaultQuantities: { 'G650': 12, 'G500': 8 },
    location: 'Cabin Storage Compartment A',
    area: 'cabin',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'high'
  },
  {
    id: '8',
    category: 'Comfort',
    itemName: 'Down-Filled Comfort Pillows',
    alternateNames: ['pillows', 'cushions', 'headrest', 'comfort pillows'],
    currentQuantity: 8,
    requiredQuantity: 12,
    defaultQuantities: { 'G650': 12, 'G500': 8 },
    location: 'Cabin Storage Compartment B',
    area: 'cabin',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'medium'
  },
  {
    id: '9',
    category: 'Entertainment',
    itemName: 'Noise-Cancelling Headphones',
    alternateNames: ['headphones', 'earphones', 'audio', 'noise cancelling'],
    currentQuantity: 6,
    requiredQuantity: 8,
    defaultQuantities: { 'G650': 8, 'G500': 6 },
    location: 'Cabin Entertainment Console',
    area: 'cabin',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'medium'
  },
  {
    id: '10',
    category: 'Amenities',
    itemName: 'Luxury Amenity Kits',
    alternateNames: ['amenity kits', 'toiletries', 'comfort kits', 'travel kits'],
    currentQuantity: 8,
    requiredQuantity: 12,
    defaultQuantities: { 'G650': 12, 'G500': 8 },
    location: 'Cabin Welcome Storage',
    area: 'cabin',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'high'
  },
  {
    id: '11',
    category: 'Safety',
    itemName: 'Life Vests (Adult)',
    alternateNames: ['life vests', 'safety vests', 'flotation devices', 'life jackets'],
    currentQuantity: 12,
    requiredQuantity: 12,
    defaultQuantities: { 'G650': 12, 'G500': 12 },
    location: 'Under Seat Storage',
    area: 'cabin',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'critical'
  },

  // Lavatory Items
  {
    id: '12',
    category: 'Towels',
    itemName: 'Egyptian Cotton Towels',
    alternateNames: ['towels', 'hand towels', 'cotton towels', 'egyptian cotton'],
    currentQuantity: 12,
    requiredQuantity: 16,
    defaultQuantities: { 'G650': 16, 'G500': 10 },
    location: 'Lavatory Storage',
    area: 'lavatory',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'medium'
  },
  {
    id: '13',
    category: 'Toiletries',
    itemName: 'Premium Hand Soap',
    alternateNames: ['soap', 'hand soap', 'wash', 'cleanser'],
    currentQuantity: 4,
    requiredQuantity: 6,
    defaultQuantities: { 'G650': 6, 'G500': 4 },
    location: 'Lavatory Dispenser',
    area: 'lavatory',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'high'
  },
  {
    id: '14',
    category: 'Toiletries',
    itemName: 'Luxury Hand Lotion',
    alternateNames: ['lotion', 'hand cream', 'moisturizer', 'hand lotion'],
    currentQuantity: 3,
    requiredQuantity: 5,
    defaultQuantities: { 'G650': 5, 'G500': 3 },
    location: 'Lavatory Cabinet',
    area: 'lavatory',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'medium'
  },
  {
    id: '15',
    category: 'Supplies',
    itemName: 'Premium Toilet Paper',
    alternateNames: ['toilet paper', 'tissue', 'tp', 'bathroom tissue'],
    currentQuantity: 8,
    requiredQuantity: 12,
    defaultQuantities: { 'G650': 12, 'G500': 8 },
    location: 'Lavatory Storage Cabinet',
    area: 'lavatory',
    needsReplenishment: false,
    lastChecked: '2024-02-06',
    priority: 'critical'
  }
];

export default function AircraftInventory() {
  const [selectedAircraft, setSelectedAircraft] = useState('');
  const [currentView, setCurrentView] = useState<'inventory' | 'shopping' | 'monthly' | 'manage'>('inventory');
  const [currentReport, setCurrentReport] = useState<ReplenishmentReport | null>(null);
  const [showAddCustomItem, setShowAddCustomItem] = useState(false);
  const [showFullInventory, setShowFullInventory] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemQuantity, setCustomItemQuantity] = useState(1);
  const [customItemNotes, setCustomItemNotes] = useState('');
  const [customItemArea, setCustomItemArea] = useState<'galley' | 'cabin' | 'lavatory'>('galley');
  const [searchTerm, setSearchTerm] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [activeTab, setActiveTab] = useState('galley');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);

  // Standard Inventory State
  const [standardInventory, setStandardInventory] = useState<InventoryItem[]>(DEFAULT_STANDARD_INVENTORY);
  const [showAddStandardItem, setShowAddStandardItem] = useState(false);

  // Fleet Configuration State
  const [fleetConfig, setFleetConfig] = useState<FleetConfig>(DEFAULT_FLEET_CONFIG);
  const [newFleetType, setNewFleetType] = useState('');
  const [newTailNumber, setNewTailNumber] = useState('');
  const [newTailType, setNewTailType] = useState('G650');

  const [newStandardItem, setNewStandardItem] = useState<Partial<InventoryItem>>({
    category: 'General',
    area: 'galley',
    priority: 'medium',
    requiredQuantity: 1,
    currentQuantity: 1,
    defaultQuantities: {}
  });

  // Calculate aircraft list from fleet config
  const aircraftList = fleetConfig.aircraft.map(a => a.tailNumber).sort();

  // Load Fleet Config
  useEffect(() => {
    const savedConfig = localStorage.getItem('fleet-inventory-config');
    if (savedConfig) {
      setFleetConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Save Fleet Config
  useEffect(() => {
    localStorage.setItem('fleet-inventory-config', JSON.stringify(fleetConfig));
  }, [fleetConfig]);

  // Load Standard Inventory & Helper to ensure structure
  useEffect(() => {
    const savedStandard = localStorage.getItem('standard-inventory-base');
    if (savedStandard) {
      const parsed: InventoryItem[] = JSON.parse(savedStandard);
      // Migration: Ensure defaultQuantities exists
      const migrated = parsed.map(item => {
        if (!item.defaultQuantities) {
          return {
            ...item,
            defaultQuantities: {
              'G650': item.requiredQuantity, // Default fallback
              'G500': item.requiredQuantity  // Default fallback
            }
          };
        }
        return item;
      });
      setStandardInventory(migrated);
    }
  }, []);

  // Save Standard Inventory
  useEffect(() => {
    localStorage.setItem('standard-inventory-base', JSON.stringify(standardInventory));
  }, [standardInventory]);

  const currentInventory = currentReport?.items || [];

  // Initialize report when aircraft is selected
  useEffect(() => {
    if (selectedAircraft && !currentReport) {
      const savedReport = localStorage.getItem(`inventory-report-${selectedAircraft}`);
      if (savedReport) {
        setCurrentReport(JSON.parse(savedReport));
      } else {
        // Determine Aircraft Type
        const aircraftInfo = fleetConfig.aircraft.find(a => a.tailNumber === selectedAircraft);
        const aircraftType = aircraftInfo?.type || 'G650'; // Default to G650 is unknown

        // Map items with correct probability
        const initializedItems = standardInventory.map(item => ({
          ...item,
          // Use type-specific quantity, fallback to G650, fallback to current req
          requiredQuantity: item.defaultQuantities?.[aircraftType] ?? item.requiredQuantity,
          // Reset current quantity to 0 or some logic? (Assuming full restock for now, or copy previous)
          // Actually, let's assume it starts fully stocked or empty? 
          // Let's keep it as is from standard for now
        }));

        const newReport: ReplenishmentReport = {
          id: `report-${Date.now()}`,
          aircraft: selectedAircraft,
          flightNumber: flightNumber,
          date: new Date().toISOString().split('T')[0],
          reportedBy: reporterName,
          items: JSON.parse(JSON.stringify(initializedItems)),
          customItems: [],
          status: 'draft',
          visibleToAllFAs: true,
          lastModified: new Date().toISOString()
        };
        setCurrentReport(newReport);
      }
    }
  }, [selectedAircraft, standardInventory, flightNumber, reporterName, fleetConfig]);

  // Auto-save functionality
  useEffect(() => {
    if (currentReport) {
      const updatedReport = {
        ...currentReport,
        lastModified: new Date().toISOString()
      };
      localStorage.setItem(`inventory-report-${selectedAircraft}`, JSON.stringify(updatedReport));
    }
  }, [currentReport, selectedAircraft]);

  // Load existing shopping lists
  useEffect(() => {
    const savedLists = localStorage.getItem('aircraft-shopping-lists');
    if (savedLists) {
      setShoppingLists(JSON.parse(savedLists));
    }
  }, []);

  const toggleItemReplenishment = (itemId: string) => {
    if (!currentReport) return;

    const updatedItems = currentReport.items.map(item => {
      if (item.id === itemId) {
        return { ...item, needsReplenishment: !item.needsReplenishment };
      }
      return item;
    });

    setCurrentReport({
      ...currentReport,
      items: updatedItems
    });

    const item = currentReport.items.find(i => i.id === itemId);
    if (item) {
      toast.success(
        item.needsReplenishment
          ? `Removed ${item.itemName} from replenishment list`
          : `Added ${item.itemName} to replenishment list`
      );
    }
  };

  const updateCurrentQuantity = (itemId: string, newQuantity: number) => {
    if (!currentReport || newQuantity < 0) return;

    const updatedItems = currentReport.items.map(item => {
      if (item.id === itemId) {
        return { ...item, currentQuantity: newQuantity };
      }
      return item;
    });

    setCurrentReport({
      ...currentReport,
      items: updatedItems
    });

    const item = currentReport.items.find(i => i.id === itemId);
    if (item) {
      toast.success(`Updated ${item.itemName} current quantity to ${newQuantity}`);
    }
  };

  const quickAdjustQuantity = (itemId: string, adjustment: number) => {
    if (!currentReport) return;

    const item = currentReport.items.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = Math.max(0, item.currentQuantity + adjustment);
    updateCurrentQuantity(itemId, newQuantity);
  };

  const addCustomItem = () => {
    if (!currentReport || !customItemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    const newCustomItem = {
      name: customItemName.trim(),
      quantity: customItemQuantity,
      notes: customItemNotes.trim(),
      area: customItemArea
    };

    setCurrentReport({
      ...currentReport,
      customItems: [...currentReport.customItems, newCustomItem]
    });

    toast.success(`Added ${customItemName} to ${customItemArea} replenishment list`);

    // Reset form
    setCustomItemName('');
    setCustomItemQuantity(1);
    setCustomItemNotes('');
    setShowAddCustomItem(false);
  };

  const generateShoppingList = () => {
    if (!currentReport) {
      toast.error('No inventory data available');
      return;
    }

    const itemsNeeding = currentReport.items.filter(item => item.needsReplenishment);
    if (itemsNeeding.length === 0 && currentReport.customItems.length === 0) {
      toast.error('No items marked for replenishment');
      return;
    }

    const newShoppingList: ShoppingList = {
      id: `shopping-${Date.now()}`,
      aircraft: selectedAircraft,
      generatedBy: reporterName || 'Unknown FA',
      generatedDate: new Date().toISOString(),
      items: itemsNeeding.map(item => ({
        itemName: item.itemName,
        quantityNeeded: item.requiredQuantity - item.currentQuantity,
        area: item.area,
        priority: item.priority,
        notes: item.notes
      })),
      customItems: currentReport.customItems,
      isCompleted: false
    };

    const updatedLists = [...shoppingLists, newShoppingList];
    setShoppingLists(updatedLists);
    localStorage.setItem('aircraft-shopping-lists', JSON.stringify(updatedLists));

    toast.success('Shopping list generated successfully!');
    setCurrentView('shopping');
  };

  // Standard Inventory Management
  const addStandardItem = () => {
    if (!newStandardItem.itemName?.trim()) {
      toast.error('Item name is required');
      return;
    }

    const newItem: InventoryItem = {
      id: `std-${Date.now()}`,
      category: newStandardItem.category || 'General',
      itemName: newStandardItem.itemName,
      alternateNames: newStandardItem.alternateNames || [],
      currentQuantity: newStandardItem.currentQuantity || 0,
      requiredQuantity: newStandardItem.requiredQuantity || 1,
      location: newStandardItem.location || 'General Storage',
      area: newStandardItem.area as any || 'galley',
      needsReplenishment: false,
      lastChecked: new Date().toISOString().split('T')[0],
      priority: newStandardItem.priority as any || 'medium',
      defaultQuantities: newStandardItem.defaultQuantities || {}
    };

    setStandardInventory([...standardInventory, newItem]);
    setNewStandardItem({
      category: 'General',
      area: 'galley',
      priority: 'medium',
      requiredQuantity: 1,
      currentQuantity: 1
    });
    setShowAddStandardItem(false);
    toast.success('Added to Standard Inventory');
  };

  const removeStandardItem = (id: string) => {
    setStandardInventory(standardInventory.filter(item => item.id !== id));
    toast.success('Removed from Standard Inventory');
  };

  const updateStandardItemQuantity = (id: string, newRequired: number) => {
    // Legacy support for single update - defaulting to G650 or all?
    // Let's just update all for now for backward compat in this function
    updateStandardItemTypeQuantity(id, 'G650', newRequired);
  };

  const updateStandardItemTypeQuantity = (itemId: string, infoType: string, qty: number) => {
    setStandardInventory(standardInventory.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          defaultQuantities: {
            ...item.defaultQuantities,
            [infoType]: qty
          }
        };
      }
      return item;
    }));
  };

  // Fleet Management
  const addFleetType = () => {
    if (newFleetType && !fleetConfig.types.includes(newFleetType)) {
      setFleetConfig({
        ...fleetConfig,
        types: [...fleetConfig.types, newFleetType]
      });
      setNewFleetType('');
      toast.success(`Added Fleet Type: ${newFleetType}`);
    }
  };

  const removeFleetType = (typeToRemove: string) => {
    if (fleetConfig.aircraft.some(a => a.type === typeToRemove)) {
      toast.error(`Cannot remove ${typeToRemove} while aircraft are assigned to it.`);
      return;
    }
    setFleetConfig({
      ...fleetConfig,
      types: fleetConfig.types.filter(t => t !== typeToRemove)
    });
    toast.success(`Removed Fleet Type: ${typeToRemove}`);
  };

  const addAircraft = () => {
    if (newTailNumber && newTailType) {
      if (fleetConfig.aircraft.some(a => a.tailNumber === newTailNumber)) {
        toast.error('Tail number already exists');
        return;
      }
      setFleetConfig({
        ...fleetConfig,
        aircraft: [...fleetConfig.aircraft, { tailNumber: newTailNumber, type: newTailType }]
      });
      setNewTailNumber('');
      toast.success(`Added Aircraft: ${newTailNumber}`);
    }
  };

  const removeAircraft = (tail: string) => {
    setFleetConfig({
      ...fleetConfig,
      aircraft: fleetConfig.aircraft.filter(a => a.tailNumber !== tail)
    });
    toast.success(`Removed Aircraft: ${tail}`);
  };


  // Enhanced search that includes alternate names
  const searchItems = (items: InventoryItem[], term: string) => {
    if (!term) return items;

    const lowerTerm = term.toLowerCase();
    return items.filter(item =>
      item.itemName.toLowerCase().includes(lowerTerm) ||
      item.category.toLowerCase().includes(lowerTerm) ||
      item.location.toLowerCase().includes(lowerTerm) ||
      item.alternateNames.some(name => name.toLowerCase().includes(lowerTerm))
    );
  };

  const filterByArea = (items: InventoryItem[], area: string) => {
    return items.filter(item => item.area === area);
  };

  const filterByPriority = (items: InventoryItem[], priority: string) => {
    if (priority === 'all') return items;
    return items.filter(item => item.priority === priority);
  };

  const filteredInventory = currentReport ?
    filterByPriority(
      searchItems(currentReport.items, searchTerm),
      filterPriority
    ) : [];

  const galleryItems = filterByArea(filteredInventory, 'galley');
  const cabinItems = filterByArea(filteredInventory, 'cabin');
  const lavatoryItems = filterByArea(filteredInventory, 'lavatory');

  const itemsNeedingReplenishment = currentReport ?
    currentReport.items.filter(item => item.needsReplenishment).length : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderInventoryItem = (item: InventoryItem) => (
    <Card key={item.id} className={`aviation-card ${item.needsReplenishment ? 'border-orange-300 bg-orange-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{item.itemName}</h4>
              <Badge className={getPriorityColor(item.priority)} variant="outline">
                {item.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">{item.category}</p>
            <p className="text-xs text-muted-foreground">{item.location}</p>
            {item.alternateNames.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Also: {item.alternateNames.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
          <Switch
            checked={item.needsReplenishment}
            onCheckedChange={() => toggleItemReplenishment(item.id)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => quickAdjustQuantity(item.id, -1)}
              disabled={item.currentQuantity <= 0}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <span className="text-sm font-medium px-2">{item.currentQuantity}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => quickAdjustQuantity(item.id, 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">/ {item.requiredQuantity}</span>

          {item.currentQuantity < item.requiredQuantity && (
            <Badge variant="secondary" className="text-xs">
              Need {item.requiredQuantity - item.currentQuantity}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold mb-2">
            <Package className="w-6 h-6" />
            Gulfstream G650 - Aircraft Inventory
          </h1>
          <p className="text-muted-foreground">
            Comprehensive inventory management with shopping lists and monthly tracking
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 lg:mt-0">
          <Tabs value={currentView} onValueChange={(value: string) => setCurrentView(value as any)}>
            <TabsList>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="shopping">Shopping Lists</TabsTrigger>
              <TabsTrigger value="monthly">Monthly Review</TabsTrigger>
              <TabsTrigger value="manage" className="gap-2">
                <Settings className="w-4 h-4" />
                Manage Standard
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Quick Setup */}
      <Card className="mb-6 aviation-card">
        <CardHeader>
          <CardTitle className="text-lg">Flight Information & Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Aircraft</Label>
              <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
                <SelectTrigger>
                  <Plane className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Select G650" />
                </SelectTrigger>
                <SelectContent>
                  {aircraftList.map(aircraft => (
                    <SelectItem key={aircraft} value={aircraft}>{aircraft}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Flight Number</Label>
              <Input
                placeholder="e.g., G650-001"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
              />
            </div>

            <div>
              <Label>Your Name</Label>
              <Input
                placeholder="FA Name"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
              />
            </div>

            <div>
              <Label>Priority Filter</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateShoppingList}
                className="w-full btn-aviation-primary"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Generate List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedAircraft && currentReport && (
        <>
          {currentView === 'inventory' && (
            <>
              {/* Status Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="aviation-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Items Needing Replenishment</p>
                        <p className="text-2xl font-semibold">{itemsNeedingReplenishment + currentReport.customItems.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="aviation-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Galley Items</p>
                        <p className="text-2xl font-semibold">{galleryItems.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="aviation-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Armchair className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Cabin Items</p>
                        <p className="text-2xl font-semibold">{cabinItems.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="aviation-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Lavatory Items</p>
                        <p className="text-2xl font-semibold">{lavatoryItems.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Add Custom Item */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, category, or try 'coffee', 'sugar', 'blankets'..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Dialog open={showAddCustomItem} onOpenChange={setShowAddCustomItem}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Custom Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Item to Resupply List</DialogTitle>
                      <DialogDescription>
                        Add items that aren't in the standard inventory but need to be restocked for this aircraft.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Item Name</Label>
                        <Input
                          placeholder="Enter item name"
                          value={customItemName}
                          onChange={(e) => setCustomItemName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Quantity Needed</Label>
                        <Input
                          type="number"
                          min="1"
                          value={customItemQuantity}
                          onChange={(e) => setCustomItemQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label>Aircraft Area</Label>
                        <Select value={customItemArea} onValueChange={(value: string) => setCustomItemArea(value as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="galley">Galley</SelectItem>
                            <SelectItem value="cabin">Cabin</SelectItem>
                            <SelectItem value="lavatory">Lavatory</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          placeholder="Additional details..."
                          value={customItemNotes}
                          onChange={(e) => setCustomItemNotes(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={addCustomItem} className="flex-1">
                          Add Item
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddCustomItem(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Tabbed Inventory by Area */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="galley" className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4" />
                    Galley ({galleryItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="cabin" className="flex items-center gap-2">
                    <Armchair className="w-4 h-4" />
                    Cabin ({cabinItems.length})
                  </TabsTrigger>
                  <TabsTrigger value="lavatory" className="flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    Lavatory ({lavatoryItems.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="galley" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {galleryItems.map(renderInventoryItem)}
                  </div>
                </TabsContent>

                <TabsContent value="cabin" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cabinItems.map(renderInventoryItem)}
                  </div>
                </TabsContent>

                <TabsContent value="lavatory" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {lavatoryItems.map(renderInventoryItem)}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Custom Items Section */}
              {currentReport.customItems.length > 0 && (
                <Card className="mt-6 aviation-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Custom Items Added
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {currentReport.customItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              <Badge variant="outline">{item.area}</Badge>
                              <Badge variant="secondary">Qty: {item.quantity}</Badge>
                            </div>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updatedCustomItems = currentReport.customItems.filter((_, i) => i !== index);
                              setCurrentReport({
                                ...currentReport,
                                customItems: updatedCustomItems
                              });
                              toast.success('Custom item removed');
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {currentView === 'shopping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Shopping Lists - Visible to All FAs</h2>
                <Badge className="bg-green-100 text-green-800">
                  {shoppingLists.filter(list => !list.isCompleted).length} Active Lists
                </Badge>
              </div>

              {shoppingLists.length === 0 ? (
                <Card className="aviation-card">
                  <CardContent className="p-8 text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Shopping Lists Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate your first shopping list from the inventory tab
                    </p>
                    <Button onClick={() => setCurrentView('inventory')}>
                      Go to Inventory
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {shoppingLists.map((list) => (
                    <Card key={list.id} className="aviation-card">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <ShoppingCart className="w-5 h-5" />
                              {list.aircraft} Shopping List
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Generated by {list.generatedBy} on {new Date(list.generatedDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={list.isCompleted ? "default" : "secondary"}>
                            {list.isCompleted ? "Completed" : "Active"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium mb-2">Standard Items ({list.items.length})</h4>
                            {list.items.map((item, index) => (
                              <div key={index} className="flex items-center justify-between text-sm py-1">
                                <span>{item.itemName}</span>
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(item.priority)} variant="outline">
                                    {item.priority}
                                  </Badge>
                                  <span className="text-muted-foreground">x{item.quantityNeeded}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {list.customItems.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Custom Items ({list.customItems.length})</h4>
                              {list.customItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm py-1">
                                  <span>{item.name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{item.area}</Badge>
                                    <span className="text-muted-foreground">x{item.quantity}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant={list.isCompleted ? "secondary" : "default"}
                            onClick={() => {
                              const updatedLists = shoppingLists.map(l =>
                                l.id === list.id ? { ...l, isCompleted: !l.isCompleted } : l
                              );
                              setShoppingLists(updatedLists);
                              localStorage.setItem('aircraft-shopping-lists', JSON.stringify(updatedLists));
                              toast.success(list.isCompleted ? 'List reopened' : 'List marked complete');
                            }}
                          >
                            {list.isCompleted ? 'Reopen' : 'Mark Complete'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updatedLists = shoppingLists.filter(l => l.id !== list.id);
                              setShoppingLists(updatedLists);
                              localStorage.setItem('aircraft-shopping-lists', JSON.stringify(updatedLists));
                              toast.success('Shopping list deleted');
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'monthly' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Monthly Inventory Review</h2>
                <Button className="btn-aviation-primary">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Monthly Review
                </Button>
              </div>

              <Card className="aviation-card">
                <CardHeader>
                  <CardTitle>Complete Aircraft Inventory - {selectedAircraft}</CardTitle>
                  <p className="text-muted-foreground">
                    Comprehensive monthly review of all aircraft inventory items
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 font-medium">
                        <UtensilsCrossed className="w-5 h-5" />
                        Galley Items
                      </h3>
                      {galleryItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{item.itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{item.currentQuantity}/{item.requiredQuantity}</span>
                            <Badge className={getPriorityColor(item.priority)} variant="outline">
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 font-medium">
                        <Armchair className="w-5 h-5" />
                        Cabin Items
                      </h3>
                      {cabinItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{item.itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{item.currentQuantity}/{item.requiredQuantity}</span>
                            <Badge className={getPriorityColor(item.priority)} variant="outline">
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 font-medium">
                        <Droplets className="w-5 h-5" />
                        Lavatory Items
                      </h3>
                      {lavatoryItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{item.itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{item.currentQuantity}/{item.requiredQuantity}</span>
                            <Badge className={getPriorityColor(item.priority)} variant="outline">
                              {item.priority}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {currentView === 'manage' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Manage Standard Inventory</h2>
              <p className="text-muted-foreground">
                Configure fleet and manage standard inventory for all aircraft types.
              </p>
            </div>
            <Dialog open={showAddStandardItem} onOpenChange={setShowAddStandardItem}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Standard Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Standard Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Item Name</Label>
                    <Input
                      placeholder="e.g. Diet Coke"
                      value={newStandardItem.itemName || ''}
                      onChange={(e) => setNewStandardItem({ ...newStandardItem, itemName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Input
                        placeholder="e.g. Beverages"
                        value={newStandardItem.category || ''}
                        onChange={(e) => setNewStandardItem({ ...newStandardItem, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Area</Label>
                      <Select
                        value={newStandardItem.area}
                        onValueChange={(val: any) => setNewStandardItem({ ...newStandardItem, area: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="galley">Galley</SelectItem>
                          <SelectItem value="cabin">Cabin</SelectItem>
                          <SelectItem value="lavatory">Lavatory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {fleetConfig.types.map(type => (
                      <div key={type}>
                        <Label>Default Qty ({type})</Label>
                        <Input
                          type="number"
                          min="0"
                          defaultValue={newStandardItem.requiredQuantity || 1}
                          onChange={(e) => {
                            const newVal = parseInt(e.target.value) || 0;
                            setNewStandardItem(prev => ({
                              ...prev,
                              defaultQuantities: {
                                ...prev.defaultQuantities,
                                [type]: newVal
                              }
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <Button onClick={addStandardItem} className="w-full">
                    Add to Standard Inventory
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Fleet Configuration Section */}
          <Card className="aviation-card">
            <CardHeader>
              <CardTitle>Fleet Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Manage Types */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Aircraft Types</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="New Type (e.g. Challenger)"
                      value={newFleetType}
                      onChange={(e) => setNewFleetType(e.target.value)}
                    />
                    <Button size="sm" onClick={addFleetType}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fleetConfig.types.map(type => (
                      <Badge key={type} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                        {type}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent text-muted-foreground hover:text-destructive"
                          onClick={() => removeFleetType(type)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Manage Aircraft */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">Fleet Aircraft</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tail Number"
                      className="w-32"
                      value={newTailNumber}
                      onChange={(e) => setNewTailNumber(e.target.value)}
                    />
                    <Select value={newTailType} onValueChange={setNewTailType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fleetConfig.types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={addAircraft}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {fleetConfig.aircraft.map(a => (
                      <div key={a.tailNumber} className="flex items-center justify-between text-sm border p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Plane className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{a.tailNumber}</span>
                          <Badge variant="outline" className="text-xs">{a.type}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:text-destructive"
                          onClick={() => removeAircraft(a.tailNumber)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="aviation-card">
            <CardHeader>
              <CardTitle>Standard Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {standardInventory.map((item) => (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{item.itemName}</h4>
                        <Badge variant="outline">{item.area}</Badge>
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.location}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {fleetConfig.types.map(type => (
                        <div key={type} className="flex flex-col gap-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">{type} Qty</span>
                          <Input
                            className="w-16 h-8 text-center"
                            type="number"
                            min="0"
                            value={item.defaultQuantities?.[type] ?? item.requiredQuantity} // Fallback to current if missing
                            onChange={(e) => updateStandardItemTypeQuantity(item.id, type, parseInt(e.target.value) || 0)}
                          />
                        </div>
                      ))}

                      <div className="pl-2 border-l">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeStandardItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div >
  );
}