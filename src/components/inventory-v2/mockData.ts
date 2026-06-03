// ─── Inventory V2 — Self-Contained Mock Data ───────────────────────────────
// Real P&G item names sourced from AC Inventory G500.docx and G650 Stock Inventory.docx

import type {
  InventoryItemV2,
  InspectionV2,
  Stockroom,
  StockroomItem,
  StockBatch,
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
  isConsumable?: boolean,
  posCategory?: string,
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
    ...(isConsumable !== undefined && { isConsumable }),
    ...(posCategory !== undefined && { posCategory }),
  };
}

// ─── Item Master ─────────────────────────────────────────────────────────────
// Compartments: fwd-lav, fwd-galley, aft-galley, aft-lav, credenza, baggage
// G500 uses fwd-galley (renamed from 'galley') so shared items appear in both aircraft views
// Items with null G650/G500 qty are aircraft-specific

export const ITEMS_V2: InventoryItemV2[] = [

  // ── Beverages ──────────────────────────────────────────────────────────────
  // ID 1
  itemV2('Perrier 330ml', 'Sparkling Water', 'beverages', 'aft-galley', 'Galley Right', 'ea', 8, 8, 2.50, undefined, undefined, true, 'cold-drinks'),
  // ID 2
  itemV2('Coca-Cola', 'Soft Drink', 'beverages', 'aft-galley', 'Galley Right', 'ea', 6, 6, 1.50, undefined, undefined, true, 'cold-drinks'),
  // ID 3
  itemV2('Coke Zero', 'Soft Drink', 'beverages', 'aft-galley', 'Galley Right', 'ea', 6, 6, 1.50, undefined, undefined, true, 'cold-drinks'),
  // ID 4
  itemV2('Diet Coke', 'Soft Drink', 'beverages', 'aft-galley', 'Galley Right', 'ea', 6, 6, 1.50, undefined, undefined, true, 'cold-drinks'),
  // ID 5
  itemV2('Sprite', 'Soft Drink', 'beverages', 'aft-galley', 'Galley Right', 'ea', 6, 6, 1.50, undefined, undefined, true, 'cold-drinks'),
  // ID 6
  itemV2('Grape Propel', 'Sports Drink', 'beverages', 'aft-galley', 'Galley Right', 'ea', 5, 5, 2.00, undefined, undefined, true, 'cold-drinks'),
  // ID 7
  itemV2('Small Water Bottles', 'Water', 'beverages', 'baggage', 'Galley Closet', 'case', 1, 1, 18.00, undefined, undefined, true, 'cold-drinks'),
  // ID 8
  itemV2('Liter Water Bottles', 'Water', 'beverages', 'baggage', 'Lower Cabinet', 'ea', 8, 8, 3.00, undefined, undefined, true, 'cold-drinks'),
  // ID 9
  itemV2('Oat Milk', 'Milk', 'beverages', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 4.50, undefined, undefined, true, 'cold-drinks'),

  // ── Coffee ─────────────────────────────────────────────────────────────────
  // ID 10
  itemV2('Nespresso Pods', 'Coffee', 'coffee', 'fwd-galley', 'Galley Left', 'sleeve', 4, 3, 8.00, undefined, undefined, true, 'hot-drinks'),
  // ID 11
  itemV2('Regular Coffee', 'Coffee', 'coffee', 'aft-galley', 'Galley Right', 'bag', 2, 2, 12.00, undefined, undefined, true, 'hot-drinks'),
  // ID 12
  itemV2('Decaf Via', 'Coffee', 'coffee', 'aft-galley', 'Galley Right', 'box', 10, 10, 2.00, undefined, undefined, true, 'hot-drinks'),
  // ID 13
  itemV2('Coffee Filters', 'Coffee', 'coffee', 'fwd-galley', 'Galley Left', 'box', 1, 1, 3.00, undefined, undefined, true, 'hot-drinks'),

  // ── Tea ────────────────────────────────────────────────────────────────────
  // ID 14
  itemV2('Green Tea', 'Tea', 'tea', 'fwd-galley', 'Galley Left', 'box', 7, 7, 5.00, undefined, undefined, true, 'hot-drinks'),
  // ID 15
  itemV2('Mint Tea', 'Tea', 'tea', 'fwd-galley', 'Galley Left', 'box', 7, 7, 5.00, undefined, undefined, true, 'hot-drinks'),
  // ID 16
  itemV2('English Breakfast Tea', 'Tea', 'tea', 'fwd-galley', 'Galley Left', 'box', 7, 7, 5.00, undefined, undefined, true, 'hot-drinks'),
  // ID 17
  itemV2('Earl Grey Tea', 'Tea', 'tea', 'fwd-galley', 'Galley Left', 'box', 7, 7, 5.00, undefined, undefined, true, 'hot-drinks'),
  // ID 18
  itemV2('Chamomile Tea', 'Tea', 'tea', 'fwd-galley', 'Galley Left', 'box', 7, 7, 5.00, undefined, undefined, true, 'hot-drinks'),
  // ID 19
  itemV2('Stir Sticks', 'Accessory', 'coffee', 'fwd-galley', 'Galley Left', 'box', 1, 1, 3.00, undefined, undefined, true, 'hot-drinks'),

  // ── Sweeteners ─────────────────────────────────────────────────────────────
  // ID 20
  itemV2('White Sugar Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Left', 'box', 12, 12, 4.00, undefined, undefined, true, 'hot-drinks'),
  // ID 21
  itemV2('Sugar in the Raw Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Left', 'box', 12, 12, 4.00, undefined, undefined, true, 'hot-drinks'),
  // ID 22
  itemV2('Sweet N Low Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Left', 'box', 12, 12, 3.50, undefined, undefined, true, 'hot-drinks'),
  // ID 23
  itemV2('Stevia Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Left', 'box', 12, 12, 4.50, undefined, undefined, true, 'hot-drinks'),
  // ID 24
  itemV2('Splenda Packets', 'Sweetener', 'sweetener', 'fwd-galley', 'Galley Left', 'box', 12, 12, 4.00, undefined, undefined, true, 'hot-drinks'),

  // ── Medicine ───────────────────────────────────────────────────────────────
  // ID 25
  itemV2('Advil', 'Pain Relief', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 4, 4, 6.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 26
  itemV2('Tylenol', 'Pain Relief', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 4, 4, 5.50, undefined, undefined, true, 'medicine-amenities'),
  // ID 27
  itemV2('Pepto Bismol', 'Stomach', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 4, 4, 5.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 28
  itemV2('Benadryl', 'Allergy', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 4, 4, 6.50, undefined, undefined, true, 'medicine-amenities'),
  // ID 29
  itemV2('Cough Drops', 'Cold & Flu', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, 1, 4.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 30
  itemV2('Band-Aids', 'First Aid', 'first-aid', 'fwd-lav', 'Lav Cabinet', 'box', 1, 1, 5.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 31  (G650 only)
  itemV2('Dramamine', 'Motion Sickness', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, null, 5.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 32  (G650 only)
  itemV2('Imodium', 'Stomach', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, null, 8.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 33  (G650 only)
  itemV2('Visine', 'Eye Care', 'medicine', 'fwd-lav', 'Lav Cabinet', 'ea', 1, null, 7.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 34  (G650 only)
  itemV2('Alka Seltzer', 'Stomach', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 4, null, 5.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 35  (G650 only)
  itemV2('DayQuil', 'Cold & Flu', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 4, null, 7.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 36  (G650 only)
  itemV2('NyQuil', 'Cold & Flu', 'medicine', 'fwd-lav', 'Lav Cabinet', 'pkg', 2, null, 7.00, undefined, undefined, true, 'medicine-amenities'),

  // ── Toiletries — Forward Lav ───────────────────────────────────────────────
  // ID 37
  itemV2('Toothbrush', 'Dental', 'toiletries', 'fwd-lav', 'Lav Cabinet', 'ea', 3, 3, 2.50, undefined, undefined, true, 'medicine-amenities'),
  // ID 38
  itemV2('Toothpaste', 'Dental', 'toiletries', 'fwd-lav', 'Lav Cabinet', 'ea', 3, 3, 3.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 39
  itemV2('Scope Mouthwash', 'Dental', 'toiletries', 'fwd-lav', 'Lav Cabinet', 'ea', 3, 3, 3.50, undefined, undefined, true, 'medicine-amenities'),
  // ID 40
  itemV2('Flossers', 'Dental', 'toiletries', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, 1, 3.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 41
  itemV2('Safeguard Hand Soap', 'Soap', 'toiletries', 'fwd-lav', 'Lav Counter', 'bottle', 1, 1, 5.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 42
  itemV2('Pads and Tampons', 'Feminine Care', 'self-care', 'fwd-lav', 'Lav Cabinet', 'pkg', 1, 1, 8.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 43
  itemV2('Static Guard', 'Personal Care', 'self-care', 'fwd-lav', 'Lav Cabinet', 'ea', 1, 1, 5.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 44
  itemV2('Hot Towels', 'Amenity', 'linens', 'fwd-lav', 'Lav Counter', 'pkg', 5, 4, 8.00, undefined, undefined, true, 'paper-supplies'),
  // ID 45
  itemV2('Toilet Paper', 'Paper', 'paper-goods', 'fwd-lav', 'Lav Cabinet', 'roll', 3, 2, 2.00, undefined, undefined, true, 'paper-supplies'),
  // ID 46
  itemV2('Square Puffs Box', 'Tissue', 'paper-goods', 'fwd-lav', 'Lav Counter', 'box', 1, 1, 4.00, undefined, undefined, true, 'paper-supplies'),
  // ID 47
  itemV2('Paper Hand Towels', 'Paper', 'paper-goods', 'fwd-lav', 'Lav Counter', 'pkg', 2, 1, 3.50, undefined, undefined, true, 'paper-supplies'),
  // ID 48
  itemV2('Febreze', 'Freshener', 'cleaning-supplies', 'fwd-lav', 'Lav Cabinet', 'bottle', 1, 1, 6.00, undefined, undefined, true, 'cleaning'),
  // ID 49
  itemV2('Hand Sanitizer', 'Sanitizer', 'self-care', 'fwd-lav', 'Lav Counter', 'bottle', 1, 1, 4.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 50
  itemV2('Celeste Wipes', 'Wipes', 'cleaning-supplies', 'fwd-lav', 'Lav Counter', 'pkg', 1, 1, 7.00, undefined, undefined, true, 'cleaning'),
  // ID 51  (G650 only)
  itemV2('Lint Roller', 'Personal Care', 'self-care', 'fwd-lav', 'Lav Cabinet', 'ea', 1, null, 4.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 52  (G650 only)
  itemV2('Hand Lotion', 'Skincare', 'self-care', 'fwd-lav', 'Lav Counter', 'ea', 1, null, 6.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 53  (G650 only)
  itemV2('Tide to Go Wipes', 'Stain Remover', 'cleaning-supplies', 'fwd-lav', 'Lav Cabinet', 'pkg', 4, null, 4.00, undefined, undefined, true, 'cleaning'),
  // ID 54  (G650 only)
  itemV2('Tide Pen', 'Stain Remover', 'cleaning-supplies', 'fwd-lav', 'Lav Cabinet', 'ea', 1, null, 4.00, undefined, undefined, true, 'cleaning'),
  // ID 55  (G650 only)
  itemV2('Chapstick', 'Lip Care', 'self-care', 'fwd-lav', 'Lav Cabinet', 'ea', 2, null, 3.00, undefined, undefined, true, 'medicine-amenities'),

  // ── Toiletries — Aft Lav (G650 only) ──────────────────────────────────────
  // ID 56
  itemV2('Shaving Cream', 'Shaving', 'toiletries', 'aft-lav', 'Lav Cabinet', 'ea', 4, null, 4.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 57
  itemV2('Disposable Razors', 'Shaving', 'toiletries', 'aft-lav', 'Lav Cabinet', 'ea', 4, null, 2.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 58
  itemV2('Scope Mouthwash — Aft', 'Dental', 'toiletries', 'aft-lav', 'Lav Cabinet', 'ea', 4, null, 3.50, undefined, undefined, true, 'medicine-amenities'),
  // ID 59
  itemV2('Toothbrush — Aft', 'Dental', 'toiletries', 'aft-lav', 'Lav Cabinet', 'ea', 4, null, 2.50, undefined, undefined, true, 'medicine-amenities'),
  // ID 60
  itemV2('Toothpaste — Aft', 'Dental', 'toiletries', 'aft-lav', 'Lav Cabinet', 'ea', 4, null, 3.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 61
  itemV2('Mini Toothbrushes', 'Dental', 'toiletries', 'aft-lav', 'Lav Cabinet', 'ea', 4, null, 2.00, undefined, undefined, true, 'medicine-amenities'),
  // ID 62
  itemV2('Safeguard Hand Soap — Aft', 'Soap', 'toiletries', 'aft-lav', 'Lav Counter', 'bottle', 1, null, 5.00, undefined, undefined, true, 'medicine-amenities'),

  // ── Cleaning Supplies — Galley ─────────────────────────────────────────────
  // ID 63
  itemV2('Leather Wipes', 'Cleaning', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'pkg', 1, 1, 8.00, undefined, undefined, true, 'cleaning'),
  // ID 64
  itemV2('Wine Away', 'Stain Remover', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'bottle', 1, 1, 10.00, undefined, undefined, true, 'cleaning'),
  // ID 65
  itemV2('Disinfecting Wipes', 'Cleaning', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 5.00, undefined, undefined, true, 'cleaning'),
  // ID 66
  itemV2('Dust Cleaning Gel', 'Cleaning', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 8.00, undefined, undefined, true, 'cleaning'),
  // ID 67
  itemV2('Tide Rescue', 'Stain Remover', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'bottle', 1, 1, 12.00, undefined, undefined, true, 'cleaning'),
  // ID 68
  itemV2('Alcohol Spray', 'Sanitizer', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'bottle', 1, 1, 6.00, undefined, undefined, true, 'cleaning'),
  // ID 69
  itemV2('Microfiber Cloths', 'Cleaning', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'ea', 2, 2, 5.00, undefined, undefined, true, 'cleaning'),
  // ID 70
  itemV2('Paper Towel Rolls', 'Paper', 'paper-goods', 'fwd-galley', 'Galley Left', 'roll', 2, 2, 3.50, undefined, undefined, true, 'paper-supplies'),
  // ID 71
  itemV2('Dish Soap', 'Cleaning', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'bottle', 1, 1, 4.00, undefined, undefined, true, 'cleaning'),
  // ID 72
  itemV2('Sponges', 'Cleaning', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'ea', 2, 1, 3.00, undefined, undefined, true, 'cleaning'),
  // ID 73
  itemV2('Dish Gloves', 'Cleaning', 'cleaning-supplies', 'fwd-galley', 'Galley Left', 'pair', 1, 1, 4.00, undefined, undefined, true, 'cleaning'),
  // ID 74
  itemV2('Black Trash Bags', 'Waste', 'cleaning-supplies', 'aft-galley', 'Under Counter', 'roll', 10, 10, 6.00, undefined, undefined, true, 'cleaning'),
  // ID 75
  itemV2('Orange Trash Bags', 'Waste', 'cleaning-supplies', 'aft-galley', 'Under Counter', 'roll', 2, 2, 4.00, undefined, undefined, true, 'cleaning'),
  // ID 76
  itemV2('Small Trash Bag Roll', 'Waste', 'cleaning-supplies', 'fwd-lav', 'Under Trash Can', 'roll', 1, 1, 3.50, undefined, undefined, true, 'cleaning'),

  // ── Kitchen Tools ──────────────────────────────────────────────────────────
  // ID 77
  itemV2('Wine Opener', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 15.00, undefined, undefined, false),
  // ID 78
  itemV2('Wine Key', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 12.00, undefined, undefined, false),
  // ID 79
  itemV2('Wine Stoppers', 'Accessory', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'set', 4, 4, 8.00, undefined, undefined, false),
  // ID 80
  itemV2('Can Opener', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 8.00, undefined, undefined, false),
  // ID 81
  itemV2('Vegetable Peeler', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 6.00, undefined, undefined, false),
  // ID 82
  itemV2('Mandolin Slicer', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 35.00, undefined, undefined, false),
  // ID 83
  itemV2('Kitchen Shears', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 12.00, undefined, undefined, false),
  // ID 84
  itemV2('Whisk', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 8.00, undefined, undefined, false),
  // ID 85
  itemV2('Liquid Measuring Cup', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 10.00, undefined, undefined, false),
  // ID 86
  itemV2('Cooking Spatulas', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 2, 1, 8.00, undefined, undefined, false),
  // ID 87
  itemV2('Cooking Tongs', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 3, 1, 8.00, undefined, undefined, false),
  // ID 88
  itemV2('Serving Tongs', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 2, 4, 6.00, undefined, undefined, false),
  // ID 89
  itemV2('Small Serving Tongs', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 6, 1, 5.00, undefined, undefined, false),
  // ID 90
  itemV2('Cheese Knives Set', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'set', 4, 1, 20.00, undefined, undefined, false),
  // ID 91
  itemV2('Serving Spoons', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 4, 1, 6.00, undefined, undefined, false),
  // ID 92
  itemV2('Serving Fork', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, 1, 6.00, undefined, undefined, false),
  // ID 93
  itemV2('Kitchen Knives Set', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'set', 3, 1, 45.00, undefined, undefined, false),
  // ID 94  (G650 only)
  itemV2('Demitasse Spoons', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 6, null, 4.00, undefined, undefined, false),
  // ID 95  (G650 only)
  itemV2('Meat Thermometer', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 1, null, 15.00, undefined, undefined, false),
  // ID 96
  itemV2('Hot Pads', 'Tool', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 2, 2, 6.00, undefined, undefined, false),
  // ID 97
  itemV2('Mini Silicone Oven Mitts', 'Tool', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 2, 2, 8.00, undefined, undefined, false),
  // ID 98  (G650 only)
  itemV2('Oven Mitts', 'Tool', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 2, null, 10.00, undefined, undefined, false),
  // ID 99
  itemV2('Baking Sheets', 'Tool', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 4, 4, 12.00, undefined, undefined, false),
  // ID 100
  itemV2('Cutting Boards', 'Tool', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 2, 1, 15.00, undefined, undefined, false),
  // ID 101
  itemV2('Collapsible Dish Tub', 'Tool', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 1, 1, 12.00, undefined, undefined, false),

  // ── Silverware ─────────────────────────────────────────────────────────────
  // ID 102
  itemV2('Dinner Forks', 'Silverware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, 12, 8.00, undefined, undefined, false),
  // ID 103
  itemV2('Salad Forks', 'Silverware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, 12, 8.00, undefined, undefined, false),
  // ID 104
  itemV2('Dinner Knives', 'Silverware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, 12, 8.00, undefined, undefined, false),
  // ID 105  (G650 only)
  itemV2('Steak Knives', 'Silverware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, null, 10.00, undefined, undefined, false),
  // ID 106
  itemV2('Teaspoons', 'Silverware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, 12, 6.00, undefined, undefined, false),
  // ID 107
  itemV2('Soup Spoons', 'Silverware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, 12, 6.00, undefined, undefined, false),

  // ── Dishware ───────────────────────────────────────────────────────────────
  // ID 108  (G650 only — G500 uses bamboo)
  itemV2('Dinner Plates', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, null, 25.00, undefined, undefined, false),
  // ID 109  (G650 only)
  itemV2('Salad Plates', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, null, 20.00, undefined, undefined, false),
  // ID 110  (G650 only)
  itemV2('Bread Plates', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, null, 18.00, undefined, undefined, false),
  // ID 111  (G650 only)
  itemV2('Dinner Bowls', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 14, null, 20.00, undefined, undefined, false),
  // ID 112
  itemV2('Silver Ramekins', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 6, 12, 8.00, undefined, undefined, false),
  // ID 113
  itemV2('Large Bamboo Plates', 'Dishware', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 6, 11, 12.00, undefined, undefined, false),
  // ID 114
  itemV2('Small Bamboo Plates', 'Dishware', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 6, 11, 10.00, undefined, undefined, false),
  // ID 115
  itemV2('Bamboo Bowls', 'Dishware', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 6, 11, 10.00, undefined, undefined, false),
  // ID 116  (G500 only — in red box)
  itemV2('Wine Glasses', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Left Galley Closet', 'ea', null, 3, 30.00, undefined, undefined, false),
  // ID 117
  itemV2('Espresso Cups', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 4, 4, 15.00, undefined, undefined, false),
  // ID 118  (G500 only)
  itemV2('Espresso Saucers', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', null, 4, 12.00, undefined, undefined, false),
  // ID 119
  itemV2('Pitchers', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 2, 1, 15.00, undefined, undefined, false),
  // ID 120  (G650 only)
  itemV2('Placemats', 'Linen', 'linens', 'fwd-galley', 'Galley Left', 'ea', 15, null, 8.00, undefined, undefined, false),
  // ID 121
  itemV2('Crew Trays', 'Tool', 'kitchen-supplies', 'fwd-galley', 'Galley Left', 'ea', 3, 3, 20.00, undefined, undefined, false),
  // ID 122
  itemV2('Large Silver Tray', 'Tool', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 1, 1, 35.00, undefined, undefined, false),
  // ID 123
  itemV2('Small Silver Tray', 'Tool', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 1, 1, 25.00, undefined, undefined, false),

  // ── Napkins / Paper Goods ──────────────────────────────────────────────────
  // ID 124
  itemV2('Cocktail Napkins', 'Napkin', 'paper-goods', 'aft-galley', 'Galley Right', 'pkg', 1, 1, 5.00, undefined, undefined, true, 'paper-supplies'),
  // ID 125
  itemV2('Paper Dinner Napkins', 'Napkin', 'paper-goods', 'aft-galley', 'Galley Right', 'pkg', 1, 1, 5.00, undefined, undefined, true, 'paper-supplies'),
  // ID 126  (G500 only)
  itemV2('Linen Napkins', 'Napkin', 'linens', 'credenza', 'Credenza Drawer', 'ea', null, 11, 8.00, undefined, undefined, true, 'paper-supplies'),
  // ID 127
  itemV2('My Drap Roll', 'Napkin', 'paper-goods', 'aft-galley', 'Galley Right', 'roll', 1, 1, 12.00, undefined, undefined, true, 'paper-supplies'),
  // ID 128
  itemV2('Disposable Hot Beverage Cups', 'Cup', 'paper-goods', 'fwd-galley', 'Galley Left', 'pkg', 1, 1, 6.00, undefined, undefined, true, 'paper-supplies'),
  // ID 129
  itemV2('Hot Beverage Cup Lids', 'Cup', 'paper-goods', 'fwd-galley', 'Galley Left', 'pkg', 1, 1, 4.00, undefined, undefined, true, 'paper-supplies'),
  // ID 130  (G650 only)
  itemV2('Frosted Disposable Cups', 'Cup', 'paper-goods', 'aft-galley', 'Galley Right', 'pkg', 1, null, 5.00, undefined, undefined, true, 'paper-supplies'),

  // ── Food Storage / Prep ────────────────────────────────────────────────────
  // ID 131
  itemV2('Gallon Slider Bags', 'Storage', 'paper-goods', 'aft-galley', 'Galley Right', 'box', 1, 1, 4.50, undefined, undefined, true, 'paper-supplies'),
  // ID 132
  itemV2('Quart Slider Bags', 'Storage', 'paper-goods', 'aft-galley', 'Galley Right', 'box', 1, 1, 3.50, undefined, undefined, true, 'paper-supplies'),
  // ID 133
  itemV2('Jumbo Slider Bags', 'Storage', 'paper-goods', 'aft-galley', 'Galley Right', 'box', 1, 1, 5.00, undefined, undefined, true, 'paper-supplies'),
  // ID 134
  itemV2('Microwave Cooking Bags', 'Storage', 'paper-goods', 'aft-galley', 'Galley Right', 'ea', 4, 4, 2.00, undefined, undefined, true, 'paper-supplies'),
  // ID 135
  itemV2('Food Gloves', 'Food Safety', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'box', 1, 1, 5.00, undefined, undefined, true, 'paper-supplies'),
  // ID 136
  itemV2('Parchment Paper', 'Baking', 'paper-goods', 'aft-galley', 'Galley Right', 'roll', 1, 1, 5.00, undefined, undefined, true, 'paper-supplies'),
  // ID 137
  itemV2('Press n Seal', 'Storage', 'paper-goods', 'aft-galley', 'Galley Right', 'roll', 1, 1, 5.00, undefined, undefined, true, 'paper-supplies'),
  // ID 138
  itemV2('Nonstick Aluminum Foil', 'Storage', 'paper-goods', 'aft-galley', 'Galley Right', 'roll', 1, 1, 4.50, undefined, undefined, true, 'paper-supplies'),

  // ── Condiments ─────────────────────────────────────────────────────────────
  // ID 139
  itemV2('Olive Oil', 'Condiment', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'bottle', 1, 1, 8.00, undefined, undefined, true, 'snacks'),
  // ID 140
  itemV2('Tabasco', 'Condiment', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'bottle', 1, 1, 4.00, undefined, undefined, true, 'snacks'),
  // ID 141
  itemV2('Soy Sauce', 'Condiment', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'bottle', 1, 1, 4.50, undefined, undefined, true, 'snacks'),
  // ID 142
  itemV2('Honey', 'Condiment', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'bottle', 1, 1, 6.00, undefined, undefined, true, 'snacks'),
  // ID 143
  itemV2('Balsamic Vinegar', 'Condiment', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'bottle', 1, 1, 8.00, undefined, undefined, true, 'snacks'),
  // ID 144
  itemV2('Red Chili Flakes', 'Condiment', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'ea', 1, 1, 4.00, undefined, undefined, true, 'snacks'),
  // ID 145
  itemV2('Salt and Pepper Grinders', 'Condiment', 'kitchen-supplies', 'aft-galley', 'Galley Right', 'set', 4, 6, 12.00, undefined, undefined, true, 'snacks'),

  // ── Safety / Operational ───────────────────────────────────────────────────
  // ID 146
  itemV2('Yellow Safety Vests', 'Safety', 'miscellaneous', 'baggage', 'Right Galley Closet', 'ea', 2, 2, 20.00, undefined, undefined, false),
  // ID 147
  itemV2('Headsets', 'Equipment', 'miscellaneous', 'baggage', 'Right Galley Closet', 'ea', 1, 2, 50.00, undefined, undefined, false),
  // ID 148  (G650 only)
  itemV2('Ear Protection', 'Safety', 'miscellaneous', 'baggage', 'Right Galley Closet', 'ea', 1, null, 8.00, undefined, undefined, false),
  // ID 149  (G500 only)
  itemV2('Gear Pins Bag', 'Equipment', 'miscellaneous', 'baggage', 'Right Galley Closet', 'ea', null, 1, 25.00, undefined, undefined, false),

  // ── Office / Miscellaneous ─────────────────────────────────────────────────
  // ID 150
  itemV2('Post It Notes', 'Office', 'miscellaneous', 'credenza', 'Credenza Drawer', 'ea', 1, 2, 4.00, undefined, undefined, false),
  // ID 151
  itemV2('Black Pens', 'Office', 'miscellaneous', 'credenza', 'Credenza Drawer', 'ea', 4, 4, 1.00, undefined, undefined, false),
  // ID 152
  itemV2('Sharpie', 'Office', 'miscellaneous', 'credenza', 'Credenza Drawer', 'ea', 1, 1, 2.00, undefined, undefined, false),
  // ID 153  (G500 only)
  itemV2('Printer Paper', 'Office', 'paper-goods', 'credenza', 'Credenza Shelf', 'pkg', null, 1, 8.00, undefined, undefined, true, 'paper-supplies'),
  // ID 154  (G500 only)
  itemV2('Scissors', 'Office', 'miscellaneous', 'credenza', 'Credenza Drawer', 'ea', null, 1, 8.00, undefined, undefined, false),
  // ID 155  (G500 only)
  itemV2('Scotch Tape', 'Office', 'miscellaneous', 'credenza', 'Credenza Drawer', 'ea', null, 1, 3.00, undefined, undefined, false),
  // ID 156  (G500 only)
  itemV2('Playing Cards', 'Entertainment', 'miscellaneous', 'credenza', 'Credenza Drawer', 'ea', null, 2, 5.00, undefined, undefined, false),
  // ID 157  (G500 only)
  itemV2('Batteries', 'Equipment', 'miscellaneous', 'credenza', 'Credenza Shelf', 'pkg', null, 1, 8.00, undefined, undefined, false),
  // ID 158  (G500 only)
  itemV2('Creamer Pitcher', 'Dishware', 'kitchen-supplies', 'fwd-galley', 'Galley Cabinets', 'ea', null, 1, 15.00, undefined, undefined, false),
  // ID 159  (G500 only)
  itemV2('Wine Holders (3D Printed)', 'Accessory', 'miscellaneous', 'credenza', 'Credenza', 'ea', null, 2, 15.00, undefined, undefined, false),

  // ── Snacks ─────────────────────────────────────────────────────────────────
  // ID 160
  itemV2('Snack Assortment', 'Snacks', 'snacks', 'aft-galley', 'Galley Right', 'ea', 1, 1, 25.00, undefined, undefined, true, 'snacks'),
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
  // Items needed for insp-4 (N2PG G650, restocking_needed)
  { id: 'pl-1', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '1',  qtyNeeded: 4, qtyTaken: 0, done: false },   // Perrier
  { id: 'pl-2', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '10', qtyNeeded: 2, qtyTaken: 0, done: false },   // Nespresso Pods
  { id: 'pl-3', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '25', qtyNeeded: 2, qtyTaken: 0, done: false },   // Advil
  { id: 'pl-4', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '37', qtyNeeded: 3, qtyTaken: 0, done: false },   // Toothbrush
  { id: 'pl-5', inspectionId: 'insp-4', unitTailNumber: 'N2PG', itemId: '44', qtyNeeded: 2, qtyTaken: 0, done: false },   // Hot Towels
  // Items needed for insp-5 (N5PG G500, restocking_needed)
  { id: 'pl-6', inspectionId: 'insp-5', unitTailNumber: 'N5PG', itemId: '4',  qtyNeeded: 6, qtyTaken: 0, done: false },   // Diet Coke
  { id: 'pl-7', inspectionId: 'insp-5', unitTailNumber: 'N5PG', itemId: '14', qtyNeeded: 7, qtyTaken: 0, done: false },   // Green Tea
  { id: 'pl-8', inspectionId: 'insp-5', unitTailNumber: 'N5PG', itemId: '26', qtyNeeded: 4, qtyTaken: 0, done: false },   // Tylenol
  { id: 'pl-9', inspectionId: 'insp-5', unitTailNumber: 'N5PG', itemId: '63', qtyNeeded: 1, qtyTaken: 0, done: false },   // Leather Wipes
];

// ─── Mock Restock List Items ────────────────────────────────────────────────

export const MOCK_RESTOCK_LIST: RestockListItem[] = [];

// ─── Mock Unit Item Requests ────────────────────────────────────────────────

export const MOCK_UNIT_REQUESTS: UnitItemRequest[] = [
  {
    id: 'req-1',
    unitTailNumber: 'N1PG',
    isGuestRequest: true,
    notes: 'VIP guest requested extra sparkling water and hot towels.',
    status: 'open',
    requestedBy: 'Sarah Mitchell',
    requestDate: '2026-05-14T06:00:00Z',
    items: [
      { itemId: '1',  qtyOnHand: 8, qtyRequested: 4, uom: 'ea' },   // Perrier
      { itemId: '44', qtyOnHand: 5, qtyRequested: 2, uom: 'pkg' },  // Hot Towels
      { itemId: '10', qtyOnHand: 4, qtyRequested: 2, uom: 'sleeve' }, // Nespresso Pods
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
      { itemId: '65', qtyOnHand: 2, qtyRequested: 2, uom: 'ea' },   // Disinfecting Wipes
      { itemId: '71', qtyOnHand: 1, qtyRequested: 2, uom: 'bottle' }, // Dish Soap
      { itemId: '69', qtyOnHand: 1, qtyRequested: 2, uom: 'ea' },   // Microfiber Cloths
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
      { itemId: '17', qtyOnHand: 4, qtyRequested: 7, uom: 'box' },  // Earl Grey Tea
      { itemId: '18', qtyOnHand: 3, qtyRequested: 7, uom: 'box' },  // Chamomile Tea
      { itemId: '6',  qtyOnHand: 5, qtyRequested: 5, uom: 'ea' },   // Grape Propel
    ],
  },
];

// ─── Stock Batches ──────────────────────────────────────────────────────────

function generateStockBatches(): StockBatch[] {
  const batches: StockBatch[] = [];
  let batchId = 1;
  const perishableCategories: SupplyCategory[] = ['beverages', 'snacks', 'coffee', 'tea', 'wine'];

  ITEMS_V2.forEach(item => {
    const si = STOCKROOM_ITEMS.find(s => s.itemId === item.id && s.stockroomId === 'sr-1');
    if (!si) return;
    const qty = si.qtyOnHand;
    const isPerishable = perishableCategories.includes(item.supplyCategory);

    if (isPerishable && qty > 0) {
      const batchCount = qty > 6 ? 3 : 2;
      const perBatch = Math.floor(qty / batchCount);
      const remainder = qty - perBatch * batchCount;

      batches.push({
        id: `batch-${batchId++}`,
        itemId: item.id,
        stockroomId: 'sr-1',
        quantity: perBatch + remainder,
        expirationDate: '2026-11-15',
        receivedDate: '2026-05-01',
        batchLabel: `LOT-${item.id.padStart(3, '0')}-A`,
      });

      batches.push({
        id: `batch-${batchId++}`,
        itemId: item.id,
        stockroomId: 'sr-1',
        quantity: perBatch,
        expirationDate: '2026-05-29',
        receivedDate: '2026-04-15',
        batchLabel: `LOT-${item.id.padStart(3, '0')}-B`,
      });

      if (batchCount === 3) {
        batches.push({
          id: `batch-${batchId++}`,
          itemId: item.id,
          stockroomId: 'sr-1',
          quantity: perBatch,
          expirationDate: '2026-05-18',
          receivedDate: '2026-03-01',
          batchLabel: `LOT-${item.id.padStart(3, '0')}-C`,
        });
      }
    } else if (qty > 0) {
      batches.push({
        id: `batch-${batchId++}`,
        itemId: item.id,
        stockroomId: 'sr-1',
        quantity: qty,
        receivedDate: '2026-04-01',
      });
    }
  });

  return batches;
}

export const STOCK_BATCHES = generateStockBatches();

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
      { id: 'pol-1', itemId: '1',  description: 'Perrier 330ml',    qtyOrdered: 48, qtyReceived: 0 },
      { id: 'pol-2', itemId: '2',  description: 'Coca-Cola',        qtyOrdered: 36, qtyReceived: 0 },
      { id: 'pol-3', itemId: '4',  description: 'Diet Coke',        qtyOrdered: 36, qtyReceived: 0 },
      { id: 'pol-4', itemId: '6',  description: 'Grape Propel',     qtyOrdered: 24, qtyReceived: 0 },
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
      { id: 'pol-5', itemId: '10', description: 'Nespresso Pods',   qtyOrdered: 20, qtyReceived: 0 },
      { id: 'pol-6', itemId: '11', description: 'Regular Coffee',   qtyOrdered: 10, qtyReceived: 0 },
      { id: 'pol-7', itemId: '12', description: 'Decaf Via',        qtyOrdered: 50, qtyReceived: 0 },
      { id: 'pol-8', itemId: '14', description: 'Green Tea',        qtyOrdered: 20, qtyReceived: 0 },
    ],
  },
  {
    id: 'po-3',
    poNumber: 'PO-2026-0485',
    vendor: 'Aviation Provisions Inc.',
    orderDate: '2026-05-05T00:00:00Z',
    stockroomId: 'sr-1',
    status: 'partially_received',
    lineItems: [
      { id: 'pol-9',  itemId: '37', description: 'Toothbrush',      qtyOrdered: 24, qtyReceived: 24 },
      { id: 'pol-10', itemId: '44', description: 'Hot Towels',      qtyOrdered: 20, qtyReceived: 10 },
      { id: 'pol-11', itemId: '25', description: 'Advil',           qtyOrdered: 12, qtyReceived: 0  },
      { id: 'pol-12', itemId: '26', description: 'Tylenol',         qtyOrdered: 12, qtyReceived: 0  },
    ],
  },
  {
    id: 'po-4',
    poNumber: 'PO-2026-0472',
    vendor: 'SkyClean Products',
    orderDate: '2026-05-03T00:00:00Z',
    stockroomId: 'sr-2',
    status: 'outstanding',
    lineItems: [
      { id: 'pol-13', itemId: '65', description: 'Disinfecting Wipes',  qtyOrdered: 20, qtyReceived: 0 },
      { id: 'pol-14', itemId: '69', description: 'Microfiber Cloths',   qtyOrdered: 20, qtyReceived: 0 },
      { id: 'pol-15', itemId: '64', description: 'Wine Away',           qtyOrdered: 10, qtyReceived: 0 },
    ],
  },
];
