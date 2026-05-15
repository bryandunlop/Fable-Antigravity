// ─── Inventory V2 — Self-Contained Mock Data ───────────────────────────────
// Real P&G item names. No imports from existing inventoryData.ts.

import type {
  InventoryItemV2,
  InspectionV2,
  Stockroom,
  StockroomItem,
  PickListItem,
  RestockListItem,
  UnitItemRequest,
  PurchaseOrder,
  SupplyCategory,
  UnitOfMeasure,
} from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

let _id = 1;
function itemV2(
  itemName: string,
  category: string,
  supplyCategory: SupplyCategory,
  compartmentId: string,
  location: string,
  uom: UnitOfMeasure,
  g650qty: number | null,
  g500qty: number | null,
  costPerUnit: number,
  vendorItemNumber?: string,
  internalItemNumber?: string,
): InventoryItemV2 {
  const id = String(_id++);
  const dq: Partial<Record<'G650' | 'G500', number>> = {};
  if (g650qty !== null) dq['G650'] = g650qty;
  if (g500qty !== null) dq['G500'] = g500qty;
  return {
    id,
    itemName,
    description: `${category} — ${itemName}`,
    category,
    supplyCategory,
    compartmentId,
    location,
    uom,
    vendorItemNumber: vendorItemNumber ?? `VND-${id.padStart(4, '0')}`,
    internalItemNumber: internalItemNumber ?? `PG-${id.padStart(5, '0')}`,
    thumbnailUrl: undefined,
    costPerUnit,
    defaultQuantities: dq,
    currentQuantity: (g650qty ?? g500qty) ?? 0,
    requiredQuantity: (g650qty ?? g500qty) ?? 0,
    needsReplenishment: false,
    priority: 'medium',
    alternateNames: [],
  };
}

// ─── Item Master (~100 items) ───────────────────────────────────────────────

export const ITEMS_V2: InventoryItemV2[] = [
  // ── Beverages ──
  itemV2('Fiji Water 500ml', 'Water', 'beverages', 'fwd-galley', 'Galley Drawer 1', 'bottle', 12, 8, 2.50, 'FW-500', 'PG-10001'),
  itemV2('San Pellegrino 250ml', 'Sparkling Water', 'beverages', 'fwd-galley', 'Galley Drawer 1', 'bottle', 8, 6, 3.00),
  itemV2('Coca-Cola 12oz', 'Soft Drink', 'beverages', 'chiller', 'Chiller Shelf 1', 'ea', 6, 4, 1.50),
  itemV2('Diet Coke 12oz', 'Soft Drink', 'beverages', 'chiller', 'Chiller Shelf 1', 'ea', 6, 4, 1.50),
  itemV2('Sprite 12oz', 'Soft Drink', 'beverages', 'chiller', 'Chiller Shelf 1', 'ea', 4, 4, 1.50),
  itemV2('Ginger Ale 12oz', 'Soft Drink', 'beverages', 'chiller', 'Chiller Shelf 2', 'ea', 4, 4, 1.50),
  itemV2('Orange Juice 10oz', 'Juice', 'beverages', 'chiller', 'Chiller Shelf 2', 'bottle', 4, 4, 3.50),
  itemV2('Cranberry Juice 10oz', 'Juice', 'beverages', 'chiller', 'Chiller Shelf 2', 'bottle', 4, 2, 3.50),
  itemV2('Tonic Water', 'Mixer', 'beverages', 'fwd-galley', 'Galley Drawer 2', 'bottle', 4, 4, 2.00),
  itemV2('Club Soda', 'Mixer', 'beverages', 'fwd-galley', 'Galley Drawer 2', 'bottle', 4, 4, 1.75),

  // ── Cleaning Supplies ──
  itemV2('Lysol Wipes (Canister)', 'Disinfectant', 'cleaning-supplies', 'baggage', 'Baggage Bin A', 'ea', 2, 2, 5.99),
  itemV2('Glass Cleaner Spray', 'Cleaner', 'cleaning-supplies', 'baggage', 'Baggage Bin A', 'bottle', 1, 1, 4.50),
  itemV2('Stainless Steel Cleaner', 'Cleaner', 'cleaning-supplies', 'baggage', 'Baggage Bin A', 'bottle', 1, 1, 6.00),
  itemV2('Microfiber Cloth Pack', 'Cleaning Cloth', 'cleaning-supplies', 'baggage', 'Baggage Bin B', 'pkg', 2, 2, 8.00),
  itemV2('Trash Bags (Small)', 'Waste', 'cleaning-supplies', 'fwd-galley', 'Under Counter', 'roll', 2, 2, 3.50),
  itemV2('Sponges (3-pack)', 'Cleaning', 'cleaning-supplies', 'fwd-galley', 'Under Counter', 'pkg', 1, 1, 2.50),

  // ── Coffee ──
  itemV2('Nespresso Capsules — Intenso', 'Coffee', 'coffee', 'fwd-galley', 'Galley Drawer 3', 'sleeve', 3, 2, 7.50, 'NSP-INT'),
  itemV2('Nespresso Capsules — Lungo', 'Coffee', 'coffee', 'fwd-galley', 'Galley Drawer 3', 'sleeve', 3, 2, 7.50, 'NSP-LNG'),
  itemV2('Nespresso Capsules — Decaf', 'Coffee', 'coffee', 'fwd-galley', 'Galley Drawer 3', 'sleeve', 2, 1, 7.50, 'NSP-DCF'),
  itemV2('Coffee Stir Sticks', 'Accessory', 'coffee', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 3.00),
  itemV2('Half & Half Creamers', 'Creamer', 'coffee', 'chiller', 'Chiller Door', 'box', 2, 1, 4.50),
  itemV2('Descaling Solution', 'Maintenance', 'coffee', 'baggage', 'Baggage Bin C', 'bottle', 1, 1, 12.00),

  // ── First Aid ──
  itemV2('Adhesive Bandages (Assorted)', 'Bandage', 'first-aid', 'fwd-lav', 'Lav Cabinet', 'box', 1, 1, 6.00),
  itemV2('Antiseptic Wipes', 'Antiseptic', 'first-aid', 'fwd-lav', 'Lav Cabinet', 'box', 1, 1, 5.00),
  itemV2('Disposable Gloves (Nitrile)', 'PPE', 'first-aid', 'fwd-lav', 'Lav Cabinet', 'box', 1, 1, 12.00),
  itemV2('Ice Pack (Instant)', 'Cold Pack', 'first-aid', 'baggage', 'First Aid Kit', 'ea', 2, 2, 3.00),
  itemV2('Burn Cream', 'Ointment', 'first-aid', 'fwd-lav', 'Lav Cabinet', 'ea', 1, 1, 8.00),

  // ── Kitchen Supplies ──
  itemV2('Cocktail Napkins (White)', 'Napkin', 'kitchen-supplies', 'fwd-galley', 'Galley Drawer 4', 'pkg', 4, 3, 2.50),
  itemV2('Dinner Napkins (Linen)', 'Napkin', 'kitchen-supplies', 'credenza', 'Credenza Top Drawer', 'ea', 8, 6, 5.00),
  itemV2('Plastic Wrap Roll', 'Wrap', 'kitchen-supplies', 'fwd-galley', 'Under Counter', 'roll', 1, 1, 4.00),
  itemV2('Aluminum Foil Roll', 'Wrap', 'kitchen-supplies', 'fwd-galley', 'Under Counter', 'roll', 1, 1, 4.50),
  itemV2('Toothpicks (Box)', 'Accessory', 'kitchen-supplies', 'fwd-galley', 'Galley Drawer 4', 'box', 1, 1, 2.00),
  itemV2('Wine Opener / Corkscrew', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Drawer 5', 'ea', 1, 1, 15.00),
  itemV2('Can Opener', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Drawer 5', 'ea', 1, 1, 8.00),
  itemV2('Serving Tongs', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Drawer 5', 'ea', 2, 1, 6.00),
  itemV2('Ice Scoop', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Drawer 5', 'ea', 1, 1, 4.00),

  // ── Linens ──
  itemV2('Hand Towels (White)', 'Towel', 'linens', 'fwd-lav', 'Lav Shelf', 'ea', 8, 6, 4.00),
  itemV2('Hand Towels (White) — Aft', 'Towel', 'linens', 'aft-lav', 'Lav Shelf', 'ea', 6, 4, 4.00),
  itemV2('Blankets (Cashmere)', 'Blanket', 'linens', 'credenza', 'Credenza Lower', 'ea', 4, 4, 85.00),
  itemV2('Pillowcases', 'Pillow', 'linens', 'credenza', 'Credenza Lower', 'ea', 4, 4, 12.00),
  itemV2('Pillows (Down)', 'Pillow', 'linens', 'baggage', 'Baggage Bin D', 'ea', 4, 4, 45.00),
  itemV2('Seat Protectors', 'Cover', 'linens', 'main-cabin', 'Overhead Bin', 'ea', 8, null, 15.00),

  // ── Medicine ──
  itemV2('Tylenol Extra Strength', 'Pain Relief', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 2, 2, 5.00),
  itemV2('Advil (Ibuprofen)', 'Pain Relief', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 2, 2, 5.50),
  itemV2('Benadryl', 'Allergy', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, 1, 6.00),
  itemV2('Pepto-Bismol Tablets', 'Stomach', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, 1, 4.50),
  itemV2('Dramamine (Motion Sickness)', 'Motion Sickness', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, 1, 5.00),
  itemV2('Tums Antacid', 'Stomach', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, 1, 3.50),

  // ── Miscellaneous ──
  itemV2('Shoe Shine Kit', 'Amenity', 'miscellaneous', 'aft-lav', 'Lav Drawer', 'ea', 2, 2, 8.00),
  itemV2('Sewing Kit', 'Amenity', 'miscellaneous', 'aft-lav', 'Lav Drawer', 'ea', 2, 2, 3.00),
  itemV2('Earplugs (Foam)', 'Amenity', 'miscellaneous', 'credenza', 'Credenza Top Drawer', 'pair', 8, 6, 1.00),
  itemV2('Eye Mask (Sleep)', 'Amenity', 'miscellaneous', 'credenza', 'Credenza Top Drawer', 'ea', 6, 4, 3.00),
  itemV2('Deck of Playing Cards', 'Entertainment', 'miscellaneous', 'credenza', 'Credenza Top Drawer', 'ea', 2, 1, 5.00),
  itemV2('Pen (Blue — P&G Logo)', 'Office', 'miscellaneous', 'credenza', 'Credenza Top Drawer', 'ea', 6, 4, 2.00),
  itemV2('Notepad (P&G Branded)', 'Office', 'miscellaneous', 'credenza', 'Credenza Top Drawer', 'ea', 4, 3, 3.00),

  // ── Paper Goods ──
  itemV2('Facial Tissues (Kleenex Box)', 'Tissue', 'paper-goods', 'fwd-lav', 'Lav Counter', 'box', 2, 2, 3.00),
  itemV2('Facial Tissues — Aft', 'Tissue', 'paper-goods', 'aft-lav', 'Lav Counter', 'box', 2, 1, 3.00),
  itemV2('Toilet Paper Roll', 'Tissue', 'paper-goods', 'fwd-lav', 'Lav Cabinet', 'roll', 4, 3, 2.00),
  itemV2('Toilet Paper Roll — Aft', 'Tissue', 'paper-goods', 'aft-lav', 'Lav Cabinet', 'roll', 3, 2, 2.00),
  itemV2('Paper Towel Roll', 'Towel', 'paper-goods', 'fwd-galley', 'Galley Drawer 6', 'roll', 2, 2, 3.50),
  itemV2('Disposable Cups (8oz Clear)', 'Cup', 'paper-goods', 'fwd-galley', 'Galley Drawer 6', 'sleeve', 2, 2, 4.00),
  itemV2('Disposable Plates (Appetizer)', 'Plate', 'paper-goods', 'fwd-galley', 'Galley Drawer 6', 'pkg', 1, 1, 6.00),

  // ── Self-Care ──
  itemV2('Hand Lotion (Travel)', 'Skincare', 'self-care', 'fwd-lav', 'Lav Counter', 'ea', 2, 2, 8.00),
  itemV2('Hand Lotion — Aft', 'Skincare', 'self-care', 'aft-lav', 'Lav Counter', 'ea', 2, 1, 8.00),
  itemV2('Lip Balm', 'Skincare', 'self-care', 'fwd-lav', 'Lav Drawer', 'ea', 4, 3, 3.00),
  itemV2('Hand Sanitizer (Travel)', 'Sanitizer', 'self-care', 'fwd-galley', 'Galley Counter', 'ea', 2, 2, 4.00),
  itemV2('Wet Wipes (Individual)', 'Wipe', 'self-care', 'fwd-galley', 'Galley Drawer 4', 'pkg', 2, 2, 3.00),
  itemV2('Breath Mints', 'Freshener', 'self-care', 'credenza', 'Credenza Top Drawer', 'ea', 4, 3, 2.50),

  // ── Snacks ──
  itemV2('Mixed Nuts (Premium)', 'Nut', 'snacks', 'fwd-galley', 'Galley Drawer 7', 'bag', 4, 3, 6.00),
  itemV2('Granola Bars (Variety)', 'Bar', 'snacks', 'fwd-galley', 'Galley Drawer 7', 'box', 2, 1, 8.00),
  itemV2('Dark Chocolate Bar', 'Chocolate', 'snacks', 'fwd-galley', 'Galley Drawer 7', 'ea', 4, 3, 4.50),
  itemV2('Dried Fruit Mix', 'Fruit', 'snacks', 'fwd-galley', 'Galley Drawer 7', 'bag', 2, 2, 5.00),
  itemV2('Pretzels (Snack Pack)', 'Cracker', 'snacks', 'fwd-galley', 'Galley Drawer 7', 'bag', 3, 2, 3.00),
  itemV2('Cheese Crackers', 'Cracker', 'snacks', 'fwd-galley', 'Galley Drawer 7', 'box', 2, 1, 4.00),

  // ── Sweetener ──
  itemV2('Sugar Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 3.00),
  itemV2('Splenda Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 4.00),
  itemV2('Honey Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 5.00),
  itemV2('Stevia Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 4.50),

  // ── Tea ──
  itemV2('English Breakfast Tea', 'Black Tea', 'tea', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 5.00),
  itemV2('Earl Grey Tea', 'Black Tea', 'tea', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 5.00),
  itemV2('Green Tea', 'Green Tea', 'tea', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 5.00),
  itemV2('Chamomile Tea', 'Herbal Tea', 'tea', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 5.50),
  itemV2('Peppermint Tea', 'Herbal Tea', 'tea', 'fwd-galley', 'Galley Drawer 3', 'box', 1, 1, 5.50),

  // ── Toiletries ──
  itemV2('Toothbrush (Sealed)', 'Dental', 'toiletries', 'fwd-lav', 'Lav Drawer', 'ea', 4, 3, 2.00),
  itemV2('Toothpaste (Travel)', 'Dental', 'toiletries', 'fwd-lav', 'Lav Drawer', 'ea', 4, 3, 3.00),
  itemV2('Mouthwash (Mini)', 'Dental', 'toiletries', 'fwd-lav', 'Lav Drawer', 'ea', 4, 2, 2.50),
  itemV2('Deodorant (Travel)', 'Personal', 'toiletries', 'aft-lav', 'Lav Drawer', 'ea', 2, 2, 4.00),
  itemV2('Razor (Disposable)', 'Shaving', 'toiletries', 'aft-lav', 'Lav Drawer', 'ea', 2, 2, 3.00),
  itemV2('Shaving Cream (Travel)', 'Shaving', 'toiletries', 'aft-lav', 'Lav Drawer', 'ea', 2, 1, 4.00),
  itemV2('Cotton Swabs', 'Cotton', 'toiletries', 'fwd-lav', 'Lav Drawer', 'box', 1, 1, 2.50),
  itemV2('Hair Ties', 'Hair', 'toiletries', 'aft-lav', 'Lav Drawer', 'pkg', 1, 1, 2.00),
  itemV2('Hand Soap (Dispenser Refill)', 'Soap', 'toiletries', 'fwd-lav', 'Lav Cabinet', 'bottle', 1, 1, 6.00),
  itemV2('Hand Soap Refill — Aft', 'Soap', 'toiletries', 'aft-lav', 'Lav Cabinet', 'bottle', 1, 1, 6.00),

  // ── Wine ──
  itemV2('Chardonnay (Half Bottle)', 'White Wine', 'wine', 'chiller', 'Chiller Shelf 3', 'bottle', 2, 2, 18.00),
  itemV2('Sauvignon Blanc (Half Bottle)', 'White Wine', 'wine', 'chiller', 'Chiller Shelf 3', 'bottle', 2, 1, 16.00),
  itemV2('Pinot Noir (Half Bottle)', 'Red Wine', 'wine', 'credenza', 'Credenza Wine Rack', 'bottle', 2, 2, 22.00),
  itemV2('Cabernet Sauvignon (Half Bottle)', 'Red Wine', 'wine', 'credenza', 'Credenza Wine Rack', 'bottle', 2, 1, 25.00),
  itemV2('Prosecco (187ml)', 'Sparkling', 'wine', 'chiller', 'Chiller Shelf 3', 'bottle', 4, 2, 8.00),
  itemV2('Champagne (Half Bottle)', 'Sparkling', 'wine', 'chiller', 'Chiller Shelf 3', 'bottle', 2, null, 35.00),
];

// ─── Stockrooms ─────────────────────────────────────────────────────────────

export const STOCKROOMS: Stockroom[] = [
  { id: 'sr-1', name: 'Main Stockroom', location: 'Hangar 1 — Building A' },
  { id: 'sr-2', name: 'Hangar A Supply Room', location: 'Hangar A — Room 102' },
  { id: 'sr-3', name: 'FBO Pantry', location: 'FBO Terminal — Kitchen' },
  { id: 'sr-4', name: 'Aircraft Supply Closet', location: 'Hangar 1 — Gate Area' },
];

// ─── Stockroom Items (for Main Stockroom) ───────────────────────────────────

function generateStockroomItems(): StockroomItem[] {
  const bins = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'D3', 'E1', 'E2', 'F1', 'F2'];
  return ITEMS_V2.map((item, i) => ({
    itemId: item.id,
    stockroomId: 'sr-1',
    qtyOnHand: Math.floor(Math.random() * 20) + 3,
    parLevel: Math.max((item.defaultQuantities.G650 ?? item.defaultQuantities.G500 ?? 2) * 3, 6),
    minimumLevel: Math.max((item.defaultQuantities.G650 ?? item.defaultQuantities.G500 ?? 1) * 1, 2),
    binLocation: bins[i % bins.length],
  }));
}

export const STOCKROOM_ITEMS: StockroomItem[] = generateStockroomItems();

// ─── Mock Inspections ───────────────────────────────────────────────────────

export const MOCK_INSPECTIONS: InspectionV2[] = [
  // In-progress inspections
  {
    id: 'insp-1',
    tailNumber: 'N5PG',
    aircraftType: 'G500',
    date: '2026-05-14T08:30:00Z',
    reportedBy: 'Sarah Mitchell',
    status: 'in_progress',
    checkedItems: ITEMS_V2.filter(i => i.defaultQuantities.G500).slice(0, 20).map(i => ({
      itemId: i.id,
      requiredQty: i.defaultQuantities.G500!,
      qtyInUnit: Math.max(0, i.defaultQuantities.G500! - Math.floor(Math.random() * 3)),
      done: Math.random() > 0.6,
      workOrderFlag: false,
      notes: '',
    })),
    topLevelNotes: '',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 72,
  },
  {
    id: 'insp-2',
    tailNumber: 'N1PG',
    aircraftType: 'G650',
    date: '2026-05-14T07:15:00Z',
    reportedBy: 'James Cooper',
    status: 'in_progress',
    checkedItems: ITEMS_V2.filter(i => i.defaultQuantities.G650).slice(0, 15).map(i => ({
      itemId: i.id,
      requiredQty: i.defaultQuantities.G650!,
      qtyInUnit: i.defaultQuantities.G650!,
      done: Math.random() > 0.4,
      workOrderFlag: false,
      notes: '',
    })),
    topLevelNotes: 'Starting pre-flight check',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 95,
  },
  {
    id: 'insp-3',
    tailNumber: 'N6PG',
    aircraftType: 'G500',
    date: '2026-05-13T14:00:00Z',
    reportedBy: 'Maria Rodriguez',
    status: 'in_progress',
    checkedItems: [],
    topLevelNotes: '',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 0,
  },
  // Restocking needed
  {
    id: 'insp-4',
    tailNumber: 'N2PG',
    aircraftType: 'G650',
    date: '2026-05-13T09:00:00Z',
    reportedBy: 'Emily Parker',
    status: 'restocking_needed',
    checkedItems: ITEMS_V2.filter(i => i.defaultQuantities.G650).slice(0, 30).map(i => ({
      itemId: i.id,
      requiredQty: i.defaultQuantities.G650!,
      qtyInUnit: Math.max(0, i.defaultQuantities.G650! - Math.floor(Math.random() * 4)),
      done: true,
      workOrderFlag: Math.random() > 0.9,
      notes: '',
    })),
    topLevelNotes: 'Post-flight inspection. Several items low after TETERBORO trip.',
    photos: [],
    additionalFees: [{ id: 'fee-1', description: 'Wine stain cleaning', amount: 75.00 }],
    missingItemCharges: [],
    readinessScore: 68,
    submittedAt: '2026-05-13T10:30:00Z',
  },
  {
    id: 'insp-5',
    tailNumber: 'N5PG',
    aircraftType: 'G500',
    date: '2026-05-12T16:00:00Z',
    reportedBy: 'Sarah Mitchell',
    status: 'restocking_needed',
    checkedItems: ITEMS_V2.filter(i => i.defaultQuantities.G500).slice(5, 25).map(i => ({
      itemId: i.id,
      requiredQty: i.defaultQuantities.G500!,
      qtyInUnit: Math.max(0, i.defaultQuantities.G500! - 2),
      done: true,
      workOrderFlag: false,
      notes: '',
    })),
    topLevelNotes: 'Multiple items depleted after back-to-back flights.',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 55,
    submittedAt: '2026-05-12T17:00:00Z',
  },
  // Completed / restocked
  {
    id: 'insp-6',
    tailNumber: 'N1PG',
    aircraftType: 'G650',
    date: '2026-05-11T08:00:00Z',
    reportedBy: 'Michael Brown',
    status: 'restocked',
    checkedItems: ITEMS_V2.filter(i => i.defaultQuantities.G650).slice(0, 25).map(i => ({
      itemId: i.id,
      requiredQty: i.defaultQuantities.G650!,
      qtyInUnit: i.defaultQuantities.G650!,
      done: true,
      workOrderFlag: false,
      notes: '',
    })),
    topLevelNotes: 'All items fully stocked after restock.',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 100,
    submittedAt: '2026-05-11T09:30:00Z',
  },
  {
    id: 'insp-7',
    tailNumber: 'N6PG',
    aircraftType: 'G500',
    date: '2026-05-10T10:00:00Z',
    reportedBy: 'Lisa Johnson',
    status: 'submitted',
    checkedItems: ITEMS_V2.filter(i => i.defaultQuantities.G500).slice(0, 20).map(i => ({
      itemId: i.id,
      requiredQty: i.defaultQuantities.G500!,
      qtyInUnit: i.defaultQuantities.G500!,
      done: true,
      workOrderFlag: false,
      notes: '',
    })),
    topLevelNotes: 'Pre-flight complete. All items in order.',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 100,
    submittedAt: '2026-05-10T11:00:00Z',
  },
  {
    id: 'insp-8',
    tailNumber: 'N2PG',
    aircraftType: 'G650',
    date: '2026-05-09T07:00:00Z',
    reportedBy: 'Amanda Taylor',
    status: 'submitted',
    checkedItems: ITEMS_V2.filter(i => i.defaultQuantities.G650).slice(0, 30).map(i => ({
      itemId: i.id,
      requiredQty: i.defaultQuantities.G650!,
      qtyInUnit: Math.max(0, i.defaultQuantities.G650! - (Math.random() > 0.8 ? 1 : 0)),
      done: true,
      workOrderFlag: false,
      notes: '',
    })),
    topLevelNotes: 'Minor shortages noted, within acceptable range.',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 93,
    submittedAt: '2026-05-09T08:30:00Z',
  },
  // More completed inspections
  {
    id: 'insp-9',
    tailNumber: 'N1PG',
    aircraftType: 'G650',
    date: '2026-05-08T09:00:00Z',
    reportedBy: 'Chris Anderson',
    status: 'submitted',
    checkedItems: [],
    topLevelNotes: 'Routine check — everything good.',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 98,
    submittedAt: '2026-05-08T10:00:00Z',
  },
  {
    id: 'insp-10',
    tailNumber: 'N5PG',
    aircraftType: 'G500',
    date: '2026-05-07T11:00:00Z',
    reportedBy: 'Robert Wilson',
    status: 'restocked',
    checkedItems: [],
    topLevelNotes: 'Full restock after heavy weekend usage.',
    photos: [],
    additionalFees: [],
    missingItemCharges: [],
    readinessScore: 100,
    submittedAt: '2026-05-07T13:00:00Z',
  },
];

// ─── Mock Pick List Items ───────────────────────────────────────────────────

export const MOCK_PICK_LIST: PickListItem[] = [
  // Items needed from insp-4 (N2PG restocking_needed)
  { id: 'pl-1', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '1', qtyNeeded: 4, qtyTaken: 0, done: false },
  { id: 'pl-2', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '17', qtyNeeded: 2, qtyTaken: 0, done: false },
  { id: 'pl-3', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '37', qtyNeeded: 3, qtyTaken: 0, done: false },
  { id: 'pl-4', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '50', qtyNeeded: 1, qtyTaken: 0, done: false },
  { id: 'pl-5', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '65', qtyNeeded: 2, qtyTaken: 0, done: false },
  // Items needed from insp-5 (N5PG restocking_needed)
  { id: 'pl-6', inspectionId: 'insp-5', unitTailNumber: 'N5PG', itemId: '7', qtyNeeded: 2, qtyTaken: 0, done: false },
  { id: 'pl-7', inspectionId: 'insp-5', unitTailNumber: 'N5PG', itemId: '19', qtyNeeded: 1, qtyTaken: 0, done: false },
  { id: 'pl-8', inspectionId: 'insp-5', unitTailNumber: 'N5PG', itemId: '30', qtyNeeded: 3, qtyTaken: 0, done: false },
  { id: 'pl-9', inspectionId: 'insp-5', unitTailNumber: 'N5PG', itemId: '42', qtyNeeded: 2, qtyTaken: 0, done: false },
];

// ─── Mock Restock List Items ────────────────────────────────────────────────

export const MOCK_RESTOCK_LIST: RestockListItem[] = [];

// ─── Mock Unit Item Requests ────────────────────────────────────────────────

export const MOCK_UNIT_REQUESTS: UnitItemRequest[] = [
  {
    id: 'req-1',
    unitTailNumber: 'N1PG',
    isGuestRequest: true,
    notes: 'VIP guest requested specific sparkling water brand and extra pillows.',
    status: 'open',
    requestedBy: 'Sarah Mitchell',
    requestDate: '2026-05-14T06:00:00Z',
    items: [
      { itemId: '2', qtyOnHand: 12, qtyRequested: 6, uom: 'bottle' },
      { itemId: '41', qtyOnHand: 8, qtyRequested: 2, uom: 'ea' },
      { itemId: '39', qtyOnHand: 6, qtyRequested: 2, uom: 'ea' },
    ],
  },
  {
    id: 'req-2',
    unitTailNumber: 'N5PG',
    isGuestRequest: false,
    notes: 'Restocking cleaning supplies after deep clean.',
    status: 'open',
    requestedBy: 'David Chen',
    requestDate: '2026-05-13T14:00:00Z',
    items: [
      { itemId: '11', qtyOnHand: 5, qtyRequested: 4, uom: 'ea' },
      { itemId: '12', qtyOnHand: 3, qtyRequested: 2, uom: 'bottle' },
      { itemId: '14', qtyOnHand: 4, qtyRequested: 3, uom: 'pkg' },
    ],
  },
  {
    id: 'req-3',
    unitTailNumber: 'N2PG',
    isGuestRequest: true,
    notes: 'Passenger has specific tea preference — need Earl Grey and Chamomile stocked.',
    status: 'open',
    requestedBy: 'Emily Parker',
    requestDate: '2026-05-12T09:00:00Z',
    items: [
      { itemId: '80', qtyOnHand: 4, qtyRequested: 3, uom: 'box' },
      { itemId: '82', qtyOnHand: 3, qtyRequested: 2, uom: 'box' },
      { itemId: '68', qtyOnHand: 10, qtyRequested: 4, uom: 'bag' },
    ],
  },
];

// ─── Mock Purchase Orders ───────────────────────────────────────────────────

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-0512',
    vendor: 'Sysco Aviation Supply',
    orderDate: '2026-05-10T00:00:00Z',
    stockroomId: 'sr-1',
    status: 'outstanding',
    lineItems: [
      { id: 'pol-1', itemId: '1', description: 'Fiji Water 500ml', qtyOrdered: 48, qtyReceived: 0 },
      { id: 'pol-2', itemId: '2', description: 'San Pellegrino 250ml', qtyOrdered: 36, qtyReceived: 0 },
      { id: 'pol-3', itemId: '7', description: 'Orange Juice 10oz', qtyOrdered: 24, qtyReceived: 0 },
      { id: 'pol-4', itemId: '10', description: 'Club Soda', qtyOrdered: 24, qtyReceived: 0 },
    ],
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-0498',
    vendor: 'AirChef Supply Co.',
    orderDate: '2026-05-08T00:00:00Z',
    stockroomId: 'sr-1',
    status: 'outstanding',
    lineItems: [
      { id: 'pol-5', itemId: '17', description: 'Nespresso Capsules — Intenso', qtyOrdered: 20, qtyReceived: 0 },
      { id: 'pol-6', itemId: '18', description: 'Nespresso Capsules — Lungo', qtyOrdered: 20, qtyReceived: 0 },
      { id: 'pol-7', itemId: '19', description: 'Nespresso Capsules — Decaf', qtyOrdered: 10, qtyReceived: 0 },
      { id: 'pol-8', itemId: '21', description: 'Half & Half Creamers', qtyOrdered: 12, qtyReceived: 0 },
    ],
  },
  {
    id: 'po-3',
    poNumber: 'PO-2026-0485',
    vendor: 'World Duty Free',
    orderDate: '2026-05-05T00:00:00Z',
    stockroomId: 'sr-1',
    status: 'partially_received',
    lineItems: [
      { id: 'pol-9', itemId: '91', description: 'Chardonnay (Half Bottle)', qtyOrdered: 12, qtyReceived: 12 },
      { id: 'pol-10', itemId: '93', description: 'Pinot Noir (Half Bottle)', qtyOrdered: 12, qtyReceived: 6 },
      { id: 'pol-11', itemId: '94', description: 'Cabernet Sauvignon (Half Bottle)', qtyOrdered: 8, qtyReceived: 0 },
      { id: 'pol-12', itemId: '95', description: 'Prosecco (187ml)', qtyOrdered: 24, qtyReceived: 24 },
    ],
  },
  {
    id: 'po-4',
    poNumber: 'PO-2026-0472',
    vendor: 'Aviation Provisions Inc.',
    orderDate: '2026-05-03T00:00:00Z',
    stockroomId: 'sr-1',
    status: 'outstanding',
    lineItems: [
      { id: 'pol-13', itemId: '37', description: 'Hand Towels (White)', qtyOrdered: 40, qtyReceived: 0 },
      { id: 'pol-14', itemId: '39', description: 'Blankets (Cashmere)', qtyOrdered: 8, qtyReceived: 0 },
      { id: 'pol-15', itemId: '41', description: 'Pillows (Down)', qtyOrdered: 8, qtyReceived: 0 },
    ],
  },
  {
    id: 'po-5',
    poNumber: 'PO-2026-0461',
    vendor: 'SkyClean Products',
    orderDate: '2026-05-01T00:00:00Z',
    stockroomId: 'sr-2',
    status: 'outstanding',
    lineItems: [
      { id: 'pol-16', itemId: '11', description: 'Lysol Wipes (Canister)', qtyOrdered: 20, qtyReceived: 0 },
      { id: 'pol-17', itemId: '12', description: 'Glass Cleaner Spray', qtyOrdered: 10, qtyReceived: 0 },
      { id: 'pol-18', itemId: '14', description: 'Microfiber Cloth Pack', qtyOrdered: 15, qtyReceived: 0 },
    ],
  },
];
