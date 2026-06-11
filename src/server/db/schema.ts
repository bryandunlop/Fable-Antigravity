// src/server/db/schema.ts
import {
  pgTable,
  text,
  integer,
  boolean,
  real,
  timestamp,
  jsonb,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const aircraftTypeEnum = pgEnum('aircraft_type', ['G650', 'G500']);
export const uomEnum = pgEnum('uom', [
  'ea', 'bag', 'box', 'pkg', 'sleeve', 'case', 'bottle', 'roll', 'pair', 'set',
]);
export const supplyCategoryEnum = pgEnum('supply_category', [
  'beverages', 'cleaning-supplies', 'coffee', 'first-aid', 'kitchen-supplies',
  'linens', 'medicine', 'miscellaneous', 'paper-goods', 'self-care', 'snacks',
  'sweetener', 'tea', 'toiletries', 'wine',
]);
export const inspectionStatusEnum = pgEnum('inspection_status', [
  'in_progress', 'submitted', 'restocking_needed', 'restocked',
]);
export const tripStatusEnum = pgEnum('trip_status', ['active', 'completed', 'cancelled']);
export const legStatusEnum = pgEnum('leg_status', ['upcoming', 'active', 'completed']);
export const legPhaseEnum = pgEnum('leg_phase', ['pre_flight', 'in_flight', 'on_ground', 'complete']);
export const groceryStatusEnum = pgEnum('grocery_status', ['draft', 'sent', 'fulfilled']);
export const requestStatusEnum = pgEnum('request_status', ['open', 'in_progress', 'fulfilled', 'cancelled']);
export const poStatusEnum = pgEnum('po_status', ['outstanding', 'partially_received', 'fully_received']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'critical']);
export const loadSourceEnum = pgEnum('load_source', ['commissary', 'road']);
export const activityActionEnum = pgEnum('activity_action', [
  'inspection_started', 'inspection_submitted', 'inspection_restocked',
  'stock_added', 'stock_adjusted', 'batch_disposed',
  'trip_created', 'trip_completed', 'leg_started', 'leg_completed',
  'grocery_list_generated', 'grocery_list_sent', 'grocery_list_fulfilled',
  'request_created', 'request_fulfilled', 'request_cancelled',
  'kiosk_transaction',
  'item_created', 'item_updated', 'item_deleted',
  'load_extras', 'restore_stock', 'return_to_baseline',
]);
export const activityModuleEnum = pgEnum('activity_module', [
  'inspection', 'stockroom', 'trip', 'request', 'commissary', 'system',
]);
export const storageLocationTypeEnum = pgEnum('storage_location_type', [
  'shelf', 'cabinet', 'rack', 'closet', 'other',
]);

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  roles: jsonb('roles').$type<string[]>().notNull().default([]),
  department: text('department').notNull().default(''),
  status: text('status').notNull().default('Active'),
});

// ─── Fleet ──────────────────────────────────────────────────────────────────

export const fleet = pgTable('fleet', {
  tailNumber: text('tail_number').primaryKey(),
  type: aircraftTypeEnum('type').notNull(),
  displayName: text('display_name').notNull(),
});

// ─── Items ──────────────────────────────────────────────────────────────────

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  itemName: text('item_name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  supplyCategory: supplyCategoryEnum('supply_category').notNull(),
  compartmentId: text('compartment_id').notNull(),
  location: text('location').notNull(),
  uom: uomEnum('uom').notNull(),
  vendorItemNumber: text('vendor_item_number'),
  internalItemNumber: text('internal_item_number'),
  thumbnailUrl: text('thumbnail_url'),
  costPerUnit: real('cost_per_unit'),
  defaultQuantities: jsonb('default_quantities').$type<Partial<Record<'G650' | 'G500', number>>>().notNull().default({}),
  alternateNames: jsonb('alternate_names').$type<string[]>().notNull().default([]),
  reorderUrl: text('reorder_url'),
  barcode: text('barcode'),
  isConsumable: boolean('is_consumable'),
  posCategory: text('pos_category'),
  vendor: text('vendor'),
});

// ─── Storage Locations ──────────────────────────────────────────────────────

export const storageLocations = pgTable('storage_locations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: storageLocationTypeEnum('type').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  thumbnailUrl: text('thumbnail_url'),
});

// ─── Stockrooms ─────────────────────────────────────────────────────────────

export const stockrooms = pgTable('stockrooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
});

export const stockroomItems = pgTable('stockroom_items', {
  itemId: text('item_id').notNull().references(() => items.id),
  stockroomId: text('stockroom_id').notNull().references(() => stockrooms.id),
  qtyOnHand: integer('qty_on_hand').notNull().default(0),
  parLevel: integer('par_level').notNull().default(0),
  minimumLevel: integer('minimum_level').notNull().default(0),
  binLocation: text('bin_location').notNull().default(''),
  locationId: text('location_id'),
}, (t) => [
  primaryKey({ columns: [t.itemId, t.stockroomId] }),
]);

// ─── Inspections ────────────────────────────────────────────────────────────

export const inspections = pgTable('inspections', {
  id: text('id').primaryKey(),
  tailNumber: text('tail_number').notNull(),
  aircraftType: aircraftTypeEnum('aircraft_type').notNull(),
  date: text('date').notNull(),
  reportedBy: text('reported_by').notNull(),
  reservationId: text('reservation_id'),
  status: inspectionStatusEnum('status').notNull(),
  checkedItems: jsonb('checked_items').$type<Array<{
    itemId: string; requiredQty: number; qtyInUnit: number;
    done: boolean; workOrderFlag: boolean; notes: string;
  }>>().notNull().default([]),
  topLevelNotes: text('top_level_notes').notNull().default(''),
  photos: jsonb('photos').$type<string[]>().notNull().default([]),
  additionalFees: jsonb('additional_fees').$type<Array<{
    id: string; description: string; amount: number;
  }>>().notNull().default([]),
  missingItemCharges: jsonb('missing_item_charges').$type<Array<{
    itemId: string; description: string; qtyMissing: number;
    fromCompartment: string; costPerUnit: number; total: number; chargeToGuest: boolean;
  }>>().notNull().default([]),
  readinessScore: real('readiness_score').notNull().default(0),
  submittedAt: text('submitted_at'),
});

// ─── Pick & Restock ─────────────────────────────────────────────────────────

export const pickListItems = pgTable('pick_list_items', {
  id: text('id').primaryKey(),
  inspectionId: text('inspection_id').notNull(),
  unitTailNumber: text('unit_tail_number').notNull(),
  itemId: text('item_id').notNull(),
  qtyNeeded: integer('qty_needed').notNull(),
  qtyTaken: integer('qty_taken').notNull().default(0),
  done: boolean('done').notNull().default(false),
});

export const restockListItems = pgTable('restock_list_items', {
  id: text('id').primaryKey(),
  inspectionId: text('inspection_id').notNull(),
  unitTailNumber: text('unit_tail_number').notNull(),
  itemId: text('item_id').notNull(),
  qtyPicked: integer('qty_picked').notNull().default(0),
  qtyNeeded: integer('qty_needed').notNull(),
  done: boolean('done').notNull().default(false),
  cancelled: boolean('cancelled').notNull().default(false),
});

// ─── Unit Item Requests ─────────────────────────────────────────────────────

export const unitItemRequests = pgTable('unit_item_requests', {
  id: text('id').primaryKey(),
  unitTailNumber: text('unit_tail_number').notNull(),
  isGuestRequest: boolean('is_guest_request').notNull().default(false),
  notes: text('notes').notNull().default(''),
  status: requestStatusEnum('status').notNull(),
  requestedBy: text('requested_by').notNull(),
  requestDate: text('request_date').notNull(),
  items: jsonb('items').$type<Array<{
    itemId: string; qtyOnHand: number; qtyRequested: number; uom: string;
  }>>().notNull().default([]),
});

// ─── Trips ──────────────────────────────────────────────────────────────────

export const trips = pgTable('trips', {
  id: text('id').primaryKey(),
  tailNumber: text('tail_number').notNull(),
  aircraftType: aircraftTypeEnum('aircraft_type').notNull(),
  tripName: text('trip_name'),
  tripNumber: text('trip_number'),
  status: tripStatusEnum('status').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  baselineConfirmedAt: text('baseline_confirmed_at'),
  lastEditedBy: text('last_edited_by'),
  lastEditedAt: text('last_edited_at'),
});

export const tripLegs = pgTable('trip_legs', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  legNumber: integer('leg_number').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  date: text('date').notNull(),
  paxCount: integer('pax_count').notNull().default(0),
  status: legStatusEnum('status').notNull(),
  phase: legPhaseEnum('phase').notNull(),
  groceryListId: text('grocery_list_id'),
});

export const usageLogEntries = pgTable('usage_log_entries', {
  id: text('id').primaryKey(),
  legId: text('leg_id').notNull().references(() => tripLegs.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  qtyUsed: integer('qty_used').notNull(),
  loggedBy: text('logged_by').notNull(),
  loggedAt: text('logged_at').notNull(),
});

export const tripNotes = pgTable('trip_notes', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  legId: text('leg_id'),
  text: text('text').notNull(),
  author: text('author').notNull(),
  createdAt: text('created_at').notNull(),
});

export const tripLoadItems = pgTable('trip_load_items', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  qty: integer('qty').notNull(),
  source: loadSourceEnum('source').notNull(),
  loadedBy: text('loaded_by').notNull(),
  loadedAt: text('loaded_at').notNull(),
  legId: text('leg_id'),
});

export const tripReturnItems = pgTable('trip_return_items', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  qty: integer('qty').notNull(),
  returnedBy: text('returned_by').notNull(),
  returnedAt: text('returned_at').notNull(),
});

// ─── Grocery Lists ──────────────────────────────────────────────────────────

export const groceryLists = pgTable('grocery_lists', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  legId: text('leg_id'),
  tailNumber: text('tail_number').notNull(),
  status: groceryStatusEnum('status').notNull(),
  generatedAt: text('generated_at').notNull(),
  generatedBy: text('generated_by').notNull(),
  notes: text('notes'),
});

export const groceryListItems = pgTable('grocery_list_items', {
  id: text('id').primaryKey(),
  groceryListId: text('grocery_list_id').notNull().references(() => groceryLists.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(),
  qtyNeeded: integer('qty_needed').notNull(),
  qtyFulfilled: integer('qty_fulfilled').notNull().default(0),
  isManual: boolean('is_manual').notNull().default(false),
  manualItemName: text('manual_item_name'),
});

// ─── Stock Log ──────────────────────────────────────────────────────────────

export const stockLogEntries = pgTable('stock_log_entries', {
  id: text('id').primaryKey(),
  stockroomId: text('stockroom_id').notNull(),
  addedBy: text('added_by').notNull(),
  timestamp: text('timestamp').notNull(),
  items: jsonb('items').$type<Array<{ itemId: string; qtyAdded: number }>>().notNull().default([]),
  notes: text('notes'),
});

// ─── Stock Batches ──────────────────────────────────────────────────────────

export const stockBatches = pgTable('stock_batches', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  stockroomId: text('stockroom_id').notNull(),
  quantity: integer('quantity').notNull(),
  expirationDate: text('expiration_date'),
  receivedDate: text('received_date').notNull(),
  batchLabel: text('batch_label'),
});

// ─── Alert Thresholds ───────────────────────────────────────────────────────

export const alertThresholds = pgTable('alert_thresholds', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemId: text('item_id').notNull(),
  threshold: integer('threshold').notNull(),
  enabled: boolean('enabled').notNull().default(true),
});

// ─── Activity Log ───────────────────────────────────────────────────────────

export const activityLog = pgTable('activity_log', {
  id: text('id').primaryKey(),
  timestamp: text('timestamp').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  action: activityActionEnum('action').notNull(),
  module: activityModuleEnum('module').notNull(),
  description: text('description').notNull(),
  metadata: jsonb('metadata').$type<Record<string, string | number>>(),
});

// ─── Display Settings ───────────────────────────────────────────────────────

export const displaySettings = pgTable('display_settings', {
  userId: text('user_id').primaryKey().references(() => users.id),
  hideItemNamesOnPhone: boolean('hide_item_names_on_phone').notNull().default(false),
  hideDescriptions: boolean('hide_descriptions').notNull().default(false),
});
