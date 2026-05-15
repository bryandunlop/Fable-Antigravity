// ─── Inventory V2 — Type Definitions ────────────────────────────────────────

// Fleet
export interface FleetAircraft {
  tailNumber: string;
  type: 'G650' | 'G500';
  displayName: string;
}

// Configurable compartments (replaces hardcoded 6-area system)
export interface CompartmentDefinition {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class e.g. 'text-cyan-400'
  sortOrder: number;
}

export interface AircraftCompartmentConfig {
  aircraftType: 'G650' | 'G500';
  compartments: CompartmentDefinition[];
}

// Supply categories (the 15 standard categories)
export type SupplyCategory =
  | 'beverages'
  | 'cleaning-supplies'
  | 'coffee'
  | 'first-aid'
  | 'kitchen-supplies'
  | 'linens'
  | 'medicine'
  | 'miscellaneous'
  | 'paper-goods'
  | 'self-care'
  | 'snacks'
  | 'sweetener'
  | 'tea'
  | 'toiletries'
  | 'wine';

// UOM types
export type UnitOfMeasure = 'ea' | 'bag' | 'box' | 'pkg' | 'sleeve' | 'case' | 'bottle' | 'roll' | 'pair' | 'set';

// ─── Item Master ────────────────────────────────────────────────────────────

export interface InventoryItemV2 {
  id: string;
  itemName: string;
  description?: string;
  category: string;
  supplyCategory: SupplyCategory;
  compartmentId: string; // references CompartmentDefinition.id
  location: string;
  uom: UnitOfMeasure;
  vendorItemNumber?: string;
  internalItemNumber?: string;
  thumbnailUrl?: string;
  costPerUnit?: number;
  defaultQuantities: Partial<Record<'G650' | 'G500', number>>;
  // Runtime values (set based on selected aircraft)
  currentQuantity: number;
  requiredQuantity: number;
  needsReplenishment: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  alternateNames: string[];
}

// ─── Inspection ─────────────────────────────────────────────────────────────

export interface InspectionCheckedItem {
  itemId: string;
  requiredQty: number;
  qtyInUnit: number;
  done: boolean;
  workOrderFlag: boolean;
  notes: string;
}

export type InspectionStatus = 'in_progress' | 'submitted' | 'restocking_needed' | 'restocked';

export interface AdditionalFee {
  id: string;
  description: string;
  amount: number;
}

export interface MissingItemCharge {
  itemId: string;
  description: string;
  qtyMissing: number;
  fromCompartment: string;
  costPerUnit: number;
  total: number;
  chargeToGuest: boolean;
}

export interface InspectionV2 {
  id: string;
  tailNumber: string;
  aircraftType: 'G650' | 'G500';
  date: string;
  reportedBy: string;
  reservationId?: string;
  status: InspectionStatus;
  checkedItems: InspectionCheckedItem[];
  topLevelNotes: string;
  photos: string[];
  additionalFees: AdditionalFee[];
  missingItemCharges: MissingItemCharge[];
  readinessScore: number;
  submittedAt?: string;
}

// ─── Stockroom ──────────────────────────────────────────────────────────────

export interface Stockroom {
  id: string;
  name: string;
  location: string;
}

export interface StockroomItem {
  itemId: string;
  stockroomId: string;
  qtyOnHand: number;
  parLevel: number;
  minimumLevel: number;
  binLocation: string;
}

// ─── Pick & Restock ─────────────────────────────────────────────────────────

export interface PickListItem {
  id: string;
  inspectionId: string;
  unitTailNumber: string;
  itemId: string;
  qtyNeeded: number;
  qtyTaken: number;
  done: boolean;
}

export interface RestockListItem {
  id: string;
  inspectionId: string;
  unitTailNumber: string;
  itemId: string;
  qtyPicked: number;
  qtyNeeded: number;
  done: boolean;
  cancelled: boolean;
}

// ─── Unit Item Request ──────────────────────────────────────────────────────

export interface UnitItemRequestLine {
  itemId: string;
  qtyOnHand: number;
  qtyRequested: number;
  uom: UnitOfMeasure;
}

export interface UnitItemRequest {
  id: string;
  unitTailNumber: string;
  isGuestRequest: boolean;
  notes: string;
  status: 'open' | 'in_progress' | 'fulfilled' | 'cancelled';
  requestedBy: string;
  requestDate: string;
  items: UnitItemRequestLine[];
}

// ─── Receiving / Purchase Orders ────────────────────────────────────────────

export interface POLineItem {
  id: string;
  itemId: string;
  description: string;
  qtyOrdered: number;
  qtyReceived: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  orderDate: string;
  stockroomId: string;
  status: 'outstanding' | 'partially_received' | 'fully_received';
  lineItems: POLineItem[];
}

// ─── Stock Log ──────────────────────────────────────────────────────────────

export interface StockLogEntry {
  id: string;
  stockroomId: string;
  addedBy: string;
  timestamp: string;
  items: { itemId: string; qtyAdded: number }[];
  notes?: string;
}

// ─── Display Settings ───────────────────────────────────────────────────────

export interface DisplaySettings {
  hideItemNamesOnPhone: boolean;
  hideDescriptions: boolean;
}

// ─── Context State ──────────────────────────────────────────────────────────

export interface InventoryV2State {
  fleet: FleetAircraft[];
  items: InventoryItemV2[];
  stockLog: StockLogEntry[];
  inspections: InspectionV2[];
  stockrooms: Stockroom[];
  stockroomItems: StockroomItem[];
  pickListItems: PickListItem[];
  restockListItems: RestockListItem[];
  unitItemRequests: UnitItemRequest[];
  purchaseOrders: PurchaseOrder[];
  compartmentConfigs: AircraftCompartmentConfig[];
  displaySettings: DisplaySettings;
  selectedStockroomId: string;
}

// ─── Context Actions ────────────────────────────────────────────────────────

export type InventoryV2Action =
  // Fleet CRUD
  | { type: 'SET_FLEET'; payload: FleetAircraft[] }
  | { type: 'ADD_FLEET_UNIT'; payload: FleetAircraft }
  | { type: 'UPDATE_FLEET_UNIT'; payload: FleetAircraft }
  | { type: 'REMOVE_FLEET_UNIT'; payload: string } // tailNumber
  // Item catalog CRUD
  | { type: 'SET_ITEMS'; payload: InventoryItemV2[] }
  | { type: 'ADD_ITEM'; payload: InventoryItemV2 }
  | { type: 'UPDATE_ITEM'; payload: InventoryItemV2 }
  | { type: 'REMOVE_ITEM'; payload: string } // itemId
  // Inspections
  | { type: 'SET_INSPECTIONS'; payload: InspectionV2[] }
  | { type: 'ADD_INSPECTION'; payload: InspectionV2 }
  | { type: 'UPDATE_INSPECTION'; payload: InspectionV2 }
  // Stockroom
  | { type: 'SET_STOCKROOM_ITEMS'; payload: StockroomItem[] }
  | { type: 'UPDATE_STOCKROOM_ITEM'; payload: StockroomItem }
  | { type: 'BULK_UPDATE_STOCKROOM'; payload: StockroomItem[] }
  // Pick & Restock
  | { type: 'SET_PICK_LIST'; payload: PickListItem[] }
  | { type: 'UPDATE_PICK_ITEM'; payload: PickListItem }
  | { type: 'ADD_PICK_ITEMS'; payload: PickListItem[] }
  | { type: 'SET_RESTOCK_LIST'; payload: RestockListItem[] }
  | { type: 'UPDATE_RESTOCK_ITEM'; payload: RestockListItem }
  // Requests
  | { type: 'ADD_UNIT_REQUEST'; payload: UnitItemRequest }
  | { type: 'UPDATE_UNIT_REQUEST'; payload: UnitItemRequest }
  // Stock log
  | { type: 'ADD_STOCK_LOG'; payload: StockLogEntry }
  // POs
  | { type: 'SET_PURCHASE_ORDERS'; payload: PurchaseOrder[] }
  | { type: 'UPDATE_PURCHASE_ORDER'; payload: PurchaseOrder }
  // Config
  | { type: 'SET_COMPARTMENT_CONFIGS'; payload: AircraftCompartmentConfig[] }
  | { type: 'SET_DISPLAY_SETTINGS'; payload: DisplaySettings }
  | { type: 'SET_SELECTED_STOCKROOM'; payload: string }
  | { type: 'RESET_STATE'; payload: InventoryV2State };
