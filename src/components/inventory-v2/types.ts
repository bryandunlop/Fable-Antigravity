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
  reorderUrl?: string;
  barcode?: string;
  isConsumable?: boolean;     // true = depleted per use (drinks, napkins), false = durable (tools, silverware)
  posCategory?: string;       // Simplified POS grouping for Quick Tap view (e.g., 'hot-drinks', 'cold-drinks')
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

// ─── Users ──────────────────────────────────────────────────────────────────

export interface UserV2 {
  id: string;
  name: string;
  email: string;
  role: string;   // the active role selected at login (or overridden by UserSwitcher)
  roles: string[]; // full roles array from SYSTEM_USERS
  department: string;
}

// ─── Commissary Alerts ───────────────────────────────────────────────────────

export interface AlertThreshold {
  id: string;
  userId: string;
  itemId: string;
  threshold: number;
  enabled: boolean;
}

// ── Trip Workflow ──

export type LegPhase = 'pre_flight' | 'in_flight' | 'on_ground' | 'complete';

export type TripViewMode = 'quick-tap' | 'compartment' | 'category';

export interface Trip {
  id: string;
  tailNumber: string;
  aircraftType: 'G650' | 'G500';
  tripName?: string;
  tripNumber?: string;
  status: 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  legs: TripLeg[];
  notes: TripNote[];
  loadItems: TripLoadItem[];
  returnItems: TripReturnItem[];
  createdBy: string;
  createdAt: string;
}

export interface TripLeg {
  id: string;
  tripId: string;
  legNumber: number;
  origin: string;
  destination: string;
  date: string;
  paxCount: number;
  status: 'upcoming' | 'active' | 'completed';
  phase: LegPhase;
  usageLog: UsageLogEntry[];
  groceryListId?: string;
  notes: TripNote[];
}

export interface UsageLogEntry {
  id: string;
  legId: string;
  itemId: string;
  qtyUsed: number;
  loggedBy: string;
  loggedAt: string;
}

export interface GroceryList {
  id: string;
  tripId: string;
  legId?: string;
  tailNumber: string;
  status: 'draft' | 'sent' | 'fulfilled';
  items: GroceryListItem[];
  generatedAt: string;
  generatedBy: string;
  notes?: string;
}

export interface GroceryListItem {
  id: string;
  itemId: string;
  qtyNeeded: number;
  qtyFulfilled: number;
  isManual?: boolean;
  manualItemName?: string;
}

export interface TripNote {
  id: string;
  tripId: string;
  legId?: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface TripLoadItem {
  id: string;
  itemId: string;
  qty: number;
  source: 'commissary' | 'road';
  loadedBy: string;
  loadedAt: string;
  legId?: string; // undefined = pre-trip; set = mid-trip restore for that leg
}

export interface TripReturnItem {
  id: string;
  itemId: string;
  qty: number;
  returnedBy: string;
  returnedAt: string;
}

export interface StockBatch {
  id: string;
  itemId: string;
  stockroomId: string;
  quantity: number;
  expirationDate?: string;
  receivedDate: string;
  batchLabel?: string;
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
  currentUser: UserV2;
  alertThresholds: AlertThreshold[];
  pendingChanges: number;
  trips: Trip[];
  groceryLists: GroceryList[];
  stockBatches: StockBatch[];
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
  | { type: 'RESET_STATE'; payload: InventoryV2State }
  | { type: 'SET_CURRENT_USER'; payload: UserV2 }
  | { type: 'ADD_ALERT_THRESHOLD'; payload: AlertThreshold }
  | { type: 'REMOVE_ALERT_THRESHOLD'; payload: string } // threshold id
  | { type: 'INCREMENT_PENDING_CHANGES' }
  | { type: 'RESET_PENDING_CHANGES' }
  // Trip lifecycle
  | { type: 'ADD_TRIP'; payload: Trip }
  | { type: 'UPDATE_TRIP'; payload: Trip }
  | { type: 'COMPLETE_TRIP'; payload: string }
  // Leg lifecycle
  | { type: 'UPDATE_LEG'; payload: { tripId: string; leg: TripLeg } }
  | { type: 'COMPLETE_LEG'; payload: { tripId: string; legId: string } }
  | { type: 'ADVANCE_TO_NEXT_LEG'; payload: string }
  | { type: 'SET_LEG_PHASE'; payload: { tripId: string; legId: string; phase: LegPhase } }
  | { type: 'ADD_LEG_TO_TRIP'; payload: { tripId: string; leg: TripLeg } }
  // Usage tracking
  | { type: 'ADD_USAGE_LOG_ENTRY'; payload: { tripId: string; legId: string; entry: UsageLogEntry } }
  | { type: 'UPDATE_USAGE_LOG_ENTRY'; payload: { tripId: string; legId: string; entry: UsageLogEntry } }
  | { type: 'REMOVE_USAGE_LOG_ENTRY'; payload: { tripId: string; legId: string; entryId: string } }
  // Grocery lists
  | { type: 'ADD_GROCERY_LIST'; payload: GroceryList }
  | { type: 'UPDATE_GROCERY_LIST'; payload: GroceryList }
  | { type: 'SEND_GROCERY_LIST'; payload: string }
  | { type: 'FULFILL_GROCERY_LIST'; payload: string }
  // Trip notes
  | { type: 'ADD_TRIP_NOTE'; payload: { tripId: string; note: TripNote } }
  // Stock batches
  | { type: 'ADD_STOCK_BATCH'; payload: StockBatch }
  | { type: 'UPDATE_STOCK_BATCH'; payload: StockBatch }
  | { type: 'REMOVE_STOCK_BATCH'; payload: string }
  | { type: 'DISPOSE_EXPIRED_BATCH'; payload: { batchId: string; itemId: string; stockroomId: string; qty: number } }
  // Trip load & return
  | { type: 'ADD_TRIP_LOAD_ITEMS'; payload: { tripId: string; items: TripLoadItem[] } }
  | { type: 'ADD_TRIP_RETURN_ITEMS'; payload: { tripId: string; items: TripReturnItem[]; stockroomUpdates: StockroomItem[] } };
