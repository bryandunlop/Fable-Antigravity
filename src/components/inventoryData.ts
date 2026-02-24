// Aircraft Inventory Data — G650 (N1PG, N2PG) & G500 (N5PG, N6PG)
// Generated from official Word inventory documents

export type AreaType = 'forward-lav' | 'galley' | 'aft-lav' | 'credenza' | 'chiller';
export type PriorityType = 'low' | 'medium' | 'high' | 'critical';

export interface InventoryItem {
    id: string;
    itemName: string;
    category: string;
    area: AreaType;
    location: string;
    // Per aircraft-type required quantities. If a type key is absent, item doesn't apply to that aircraft.
    defaultQuantities: Partial<Record<'G650' | 'G500', number>>;
    currentQuantity: number;
    requiredQuantity: number; // set at runtime from defaultQuantities based on selected aircraft
    needsReplenishment: boolean;
    priority: PriorityType;
    notes?: string;
    lastChecked: string;
    isCustomItem?: boolean;
    alternateNames: string[];
}

export interface FleetAircraft {
    tailNumber: string;
    type: 'G650' | 'G500';
    displayName: string;
}

export const FLEET: FleetAircraft[] = [
    { tailNumber: 'N1PG', type: 'G650', displayName: 'N1PG — G650' },
    { tailNumber: 'N2PG', type: 'G650', displayName: 'N2PG — G650' },
    { tailNumber: 'N5PG', type: 'G500', displayName: 'N5PG — G500' },
    { tailNumber: 'N6PG', type: 'G500', displayName: 'N6PG — G500' },
];

// Helper to build an item quickly
let _id = 1;
const item = (
    itemName: string,
    category: string,
    area: AreaType,
    location: string,
    g650qty: number | null,
    g500qty: number | null,
    priority: PriorityType = 'medium',
    alternateNames: string[] = [],
    notes?: string
): InventoryItem => {
    const dq: Partial<Record<'G650' | 'G500', number>> = {};
    if (g650qty !== null) dq['G650'] = g650qty;
    if (g500qty !== null) dq['G500'] = g500qty;
    return {
        id: String(_id++),
        itemName,
        category,
        area,
        location,
        defaultQuantities: dq,
        currentQuantity: g650qty ?? g500qty ?? 1,
        requiredQuantity: g650qty ?? g500qty ?? 1,
        needsReplenishment: false,
        priority,
        alternateNames,
        notes,
        lastChecked: new Date().toISOString().split('T')[0],
    };
};

export const DEFAULT_INVENTORY: InventoryItem[] = [

    // ─── FORWARD LAV ───────────────────────────────────────────────────────────
    item('Safeguard Hand Soap', 'Toiletries', 'forward-lav', 'Lav Dispenser', 1, 1, 'critical', ['soap', 'hand soap']),
    item('Paper Hand Towels', 'Supplies', 'forward-lav', 'Lav Counter', 1, 1, 'high', ['hand towels', 'paper towels']),
    item('Toilet Paper', 'Supplies', 'forward-lav', 'Lav Dispenser', 1, 1, 'critical', ['tp', 'tissue']),
    item('Spare Toilet Paper', 'Supplies', 'forward-lav', 'Lav Cabinet', 2, 1, 'high', ['extra tp']),
    item('Pads & Tampons', 'Feminine Products', 'forward-lav', 'Lav Cabinet', 1, 1, 'high', ['feminine products', 'hygiene']),
    item('Static Guard', 'Supplies', 'forward-lav', 'Lav Cabinet', 1, 1, 'low', ['static spray']),
    item('Febreze', 'Supplies', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['air freshener', 'spray']),
    item('Celeste Wipes', 'Supplies', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['wipes', 'cleaning wipes']),
    item('Puffs Box', 'Supplies', 'forward-lav', 'Lav Counter', 1, 1, 'medium', ['tissues', 'kleenex']),
    item('Hand Sanitizer', 'Toiletries', 'forward-lav', 'Lav Counter', 1, 1, 'high', ['sanitizer', 'hand gel']),
    item('Toothbrush', 'Amenities', 'forward-lav', 'Lav Cabinet', 3, 1, 'medium', ['toothbrushes']),
    item('Toothpaste', 'Amenities', 'forward-lav', 'Lav Cabinet', 3, 3, 'medium', []),
    item('Scope Mouthwash', 'Amenities', 'forward-lav', 'Lav Cabinet', 3, 1, 'medium', ['mouthwash', 'scope']),
    item('Flossers', 'Amenities', 'forward-lav', 'Lav Cabinet', 1, 1, 'low', ['floss', 'dental floss']),
    item('Cough Drops', 'Medications', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['throat drops', 'vicks']),
    item('Imodium', 'Medications', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', []),
    item('Visine Eye Drops', 'Medications', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['eye drops', 'visine']),
    item('Band-Aids', 'First Aid', 'forward-lav', 'Lav Cabinet', 1, 1, 'high', ['bandaids', 'first aid', 'bandages']),
    item('ChapStick', 'Amenities', 'forward-lav', 'Lav Cabinet', 2, 1, 'low', ['lip balm', 'chapstick']),
    item('Dramamine', 'Medications', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['motion sickness']),
    item('Alka Seltzer', 'Medications', 'forward-lav', 'Lav Cabinet', 4, 1, 'medium', []),
    item('Pepto Bismol', 'Medications', 'forward-lav', 'Lav Cabinet', 4, 4, 'medium', ['pepto']),
    item('Advil', 'Medications', 'forward-lav', 'Lav Cabinet', 4, 1, 'high', ['ibuprofen', 'pain reliever']),
    item('Tylenol', 'Medications', 'forward-lav', 'Lav Cabinet', 4, 4, 'high', ['acetaminophen', 'pain reliever']),
    item('Benadryl', 'Medications', 'forward-lav', 'Lav Cabinet', 4, 1, 'medium', ['allergy', 'diphenhydramine']),
    item('DayQuil', 'Medications', 'forward-lav', 'Lav Cabinet', 4, 1, 'medium', ['cold medicine', 'dayquil']),
    item('NyQuil', 'Medications', 'forward-lav', 'Lav Cabinet', 2, 1, 'medium', ['nyquil', 'nighttime cold']),
    item('Tide To Go Wipes', 'Supplies', 'forward-lav', 'Lav Cabinet', 4, 1, 'medium', ['tide wipes', 'stain remover']),
    item('Tide Pen', 'Supplies', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['stain pen']),
    item('Hand Lotion', 'Amenities', 'forward-lav', 'Lav Counter', 1, 1, 'medium', ['lotion', 'moisturizer']),
    item('Hot Towels', 'Service', 'forward-lav', 'Lav Cabinet', 5, 1, 'high', ['warm towels', 'oshibori']),
    item('Lint Roller', 'Supplies', 'forward-lav', 'Lav Cabinet', 1, 1, 'low', []),
    item('Small Trash Bags (roll)', 'Supplies', 'forward-lav', 'Under Trash Can', 1, 1, 'medium', ['trash bags', 'garbage bags']),
    item('Extra Safeguard Hand Soap', 'Toiletries', 'forward-lav', 'Lav Cabinet', 1, null, 'medium', ['backup soap']),

    // ─── GALLEY ────────────────────────────────────────────────────────────────
    // Tea & Coffee
    item('Green Tea', 'Beverages', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['tea', 'green tea']),
    item('Mint Tea', 'Beverages', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['peppermint tea', 'herbal tea']),
    item('English Breakfast Tea', 'Beverages', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['black tea']),
    item('Earl Grey Tea', 'Beverages', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['earl gray']),
    item('Chamomile Tea', 'Beverages', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['herbal tea', 'chamomile']),
    item('Nespresso Pods', 'Beverages', 'galley', 'Galley Right / Coffee Station', 2, 3, 'high', ['coffee pods', 'espresso pods', 'nespresso'], 'Sleeves'),
    item('Regular Coffee (bags)', 'Beverages', 'galley', 'Galley Coffee Station', 2, 2, 'high', ['coffee', 'ground coffee']),
    item('Decaf Via', 'Beverages', 'galley', 'Galley Coffee Station', 10, 10, 'medium', ['decaf', 'instant decaf']),
    item('Coffee Filters', 'Supplies', 'galley', 'Galley Coffee Station', 1, 1, 'high', ['filters']),
    item('Coffee Scoop', 'Equipment', 'galley', 'Galley Coffee Station', 1, 1, 'medium', []),
    item('Oat Milk', 'Beverages', 'galley', 'Galley Refrigerator', null, 1, 'medium', ['milk alternative', 'dairy free']),
    item('Stir Sticks', 'Service', 'galley', 'Galley Drawer', 1, 1, 'medium', ['coffee stirrers']),
    item('Espresso Cups', 'Glassware', 'galley', 'Galley Cabinet', 4, 1, 'medium', ['demitasse cups']),
    item('Disposable Hot Cups', 'Disposables', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['paper cups', 'hot beverage cups']),
    item('Hot Cup Lids', 'Disposables', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['cup lids']),
    item('Frosted Disposable Cups', 'Disposables', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['cold cups', 'disposable cups']),

    // Sweeteners
    item('White Sugar', 'Condiments', 'galley', 'Galley Condiment Drawer', 12, 12, 'medium', ['sugar']),
    item('Sugar In The Raw', 'Condiments', 'galley', 'Galley Condiment Drawer', 12, 12, 'medium', ['raw sugar', 'brown sugar']),
    item('Sweet N Low', 'Condiments', 'galley', 'Galley Condiment Drawer', 12, 12, 'low', ['sweetener', 'pink packets']),
    item('Stevia', 'Condiments', 'galley', 'Galley Condiment Drawer', 12, 12, 'low', ['natural sweetener']),
    item('Splenda', 'Condiments', 'galley', 'Galley Condiment Drawer', 12, 12, 'low', ['yellow packets', 'splenda']),

    // Beverages / Drinks
    item('Perrier', 'Beverages', 'galley', 'Galley Right / Cabinet', 8, 8, 'high', ['sparkling water', 'carbonated water']),
    item('Coke', 'Beverages', 'galley', 'Galley Right / Cabinet', 6, 6, 'medium', ['coca cola', 'soda']),
    item('Coke Zero', 'Beverages', 'galley', 'Galley Right / Cabinet', 6, 6, 'medium', ['coke zero sugar']),
    item('Diet Coke', 'Beverages', 'galley', 'Galley Right / Cabinet', 6, 6, 'medium', ['diet cola']),
    item('Sprite', 'Beverages', 'galley', 'Galley Right / Cabinet', 6, 6, 'medium', ['lemon lime soda']),
    item('Grape Propel', 'Beverages', 'galley', 'Galley Right / Cabinet', 5, 5, 'medium', ['propel', 'flavored water']),
    item('Small Water Bottles', 'Beverages', 'galley', 'Galley Right / Cabinet', 1, 1, 'critical', ['water', 'little waters'], 'Keep full'),

    // Condiments
    item('Olive Oil', 'Condiments', 'galley', 'Galley Condiment Shelf', 1, 1, 'medium', []),
    item('Tabasco', 'Condiments', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', ['hot sauce']),
    item('Soy Sauce', 'Condiments', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', []),
    item('Honey', 'Condiments', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', []),
    item('Balsamic Vinegar', 'Condiments', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', ['vinegar']),
    item('Red Chili Flakes', 'Condiments', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', ['chili flakes', 'red pepper']),
    item('Salt & Pepper Grinders', 'Condiments', 'galley', 'Dining Setup', 4, 6, 'high', ['salt', 'pepper', 'seasonings']),

    // Silverware & Dining (G650: 14 each, G500: 12 each)
    item('Dinner Knives', 'Silverware', 'galley', 'Silverware Drawer', 14, 12, 'high', ['knives']),
    item('Steak Knives', 'Silverware', 'galley', 'Silverware Drawer', 14, 12, 'medium', []),
    item('Dinner Forks', 'Silverware', 'galley', 'Silverware Drawer', 14, 12, 'high', ['forks']),
    item('Salad Forks', 'Silverware', 'galley', 'Silverware Drawer', 14, 12, 'medium', []),
    item('Soup Spoons', 'Silverware', 'galley', 'Silverware Drawer', 14, 12, 'medium', ['spoons']),
    item('Teaspoons', 'Silverware', 'galley', 'Silverware Drawer', 14, 12, 'medium', []),
    item('Demitasse Spoons', 'Silverware', 'galley', 'Silverware Drawer', 6, 1, 'low', ['tiny spoons', 'espresso spoons']),
    item('Serving Spoons', 'Silverware', 'galley', 'Silverware Drawer', 4, 1, 'medium', []),
    item('Serving Fork', 'Silverware', 'galley', 'Silverware Drawer', 1, 1, 'medium', []),
    item('Serving Tongs (large)', 'Silverware', 'galley', 'Galley Utensil Drawer', 2, 4, 'medium', ['tongs']),
    item('Cheese Knives', 'Silverware', 'galley', 'Galley Utensil Drawer', 4, 1, 'low', ['cheese knife', 'butter knives']),
    item('Tiny Tongs', 'Silverware', 'galley', 'Galley Utensil Drawer', 6, 1, 'low', ['small tongs', 'sugar tongs']),
    item('Silver Ramekins', 'Dinnerware', 'galley', 'Galley Cabinet', 1, 12, 'medium', ['ramekins', 'small bowls']),
    item('Dinner Plates', 'Dinnerware', 'galley', 'Galley China Cabinet', 14, 1, 'high', ['plates']),
    item('Salad Plates', 'Dinnerware', 'galley', 'Galley China Cabinet', 14, 1, 'medium', []),
    item('Bread Plates', 'Dinnerware', 'galley', 'Galley China Cabinet', 14, 1, 'medium', []),
    item('Bowls', 'Dinnerware', 'galley', 'Galley China Cabinet', 14, 1, 'medium', ['soup bowls']),
    item('Pitchers', 'Glassware', 'galley', 'Galley Cabinet', 2, 1, 'medium', ['water pitcher', 'creamer pitcher']),
    item('Placemats', 'Linens', 'galley', 'Galley Linen Drawer', 15, 11, 'high', ['table mats']),
    item('Linen Dinner Napkins', 'Linens', 'galley', 'Galley Linen Drawer', 1, 11, 'high', ['cloth napkins', 'napkins']),
    item('Paper Dinner Napkins', 'Disposables', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['dinner napkins', 'disposable napkins']),
    item('Cocktail Napkins', 'Disposables', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['beverage napkins']),
    item('My Drap Roll Napkins', 'Disposables', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['my drap', 'roll napkins']),

    // Bamboo
    item('Large Bamboo Plates', 'Dinnerware', 'galley', 'Galley Cabinet', 6, 11, 'medium', ['bamboo plates']),
    item('Small Bamboo Plates', 'Dinnerware', 'galley', 'Galley Cabinet', 6, 11, 'medium', ['small bamboo']),
    item('Bamboo Bowls', 'Dinnerware', 'galley', 'Galley Cabinet', 6, 11, 'medium', ['bamboo bowls']),

    // Cooking Equipment
    item('Baking Sheets', 'Equipment', 'galley', 'Galley Right / Lower Cabinet', 4, 4, 'medium', ['sheet pans', 'baking pans']),
    item('Cooking Knives', 'Equipment', 'galley', 'Galley Knife Block', 3, 1, 'high', ['kitchen knives', 'chef knife']),
    item('Cooking Spatulas', 'Equipment', 'galley', 'Galley Utensil Drawer', 2, 1, 'medium', ['spatula']),
    item('Cooking Tongs', 'Equipment', 'galley', 'Galley Utensil Drawer', 3, 1, 'medium', ['kitchen tongs']),
    item('Kitchen Shears', 'Equipment', 'galley', 'Galley Utensil Drawer', 1, 1, 'medium', ['scissors', 'kitchen scissors']),
    item('Meat Thermometer', 'Equipment', 'galley', 'Galley Utensil Drawer', 1, null, 'medium', ['thermometer']),
    item('Whisk', 'Equipment', 'galley', 'Galley Utensil Drawer', 1, 1, 'low', []),
    item('Vegetable Peeler', 'Equipment', 'galley', 'Galley Utensil Drawer', 1, 1, 'low', ['peeler']),
    item('Can Opener', 'Equipment', 'galley', 'Galley Utensil Drawer', 1, 1, 'medium', []),
    item('Mandolin', 'Equipment', 'galley', 'Galley Equipment Drawer', 1, 1, 'low', ['slicer', 'mandoline']),
    item('Liquid Measuring Cup', 'Equipment', 'galley', 'Galley Utensil Drawer', 1, 1, 'low', ['measuring cup']),
    item('Cutting Boards', 'Equipment', 'galley', 'Galley Cabinet', 2, 1, 'medium', ['cutting board']),
    item('Dish Tub', 'Equipment', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['wash tub', 'collapsible tub']),
    item('Hot Pads', 'Equipment', 'galley', 'Galley Cabinet', 2, 2, 'medium', ['pot holders']),
    item('Mini Silicone Oven Mitts', 'Equipment', 'galley', 'Galley Cabinet', 2, 2, 'medium', ['oven mitts']),
    item('Oven Mitts', 'Equipment', 'galley', 'Galley Cabinet', 2, null, 'medium', []),
    item('Microwave Cooking Bags', 'Supplies', 'galley', 'Galley Cabinet', 4, 4, 'medium', ['cooking bags']),
    item('Silver Trays', 'Equipment', 'galley', 'Galley Cabinet', 2, 2, 'medium', ['serving trays', 'silver tray']),

    // Wine Service
    item('Wine Opener', 'Equipment', 'galley', 'Wine Service Drawer', 1, 1, 'high', ['corkscrew']),
    item('Wine Key', 'Equipment', 'galley', 'Wine Service Drawer', 1, 1, 'medium', []),
    item('Wine Stoppers', 'Equipment', 'galley', 'Wine Service Drawer', 4, 4, 'medium', ['wine sealer', 'bottle stopper']),
    item('Stop Drop Wine Pourers', 'Equipment', 'galley', 'Wine Service Drawer', 1, null, 'low', ['wine pourer', 'disc pourer']),

    // Galley Cleaning
    item('Dish Soap', 'Cleaning', 'galley', 'Galley Sink', 1, 1, 'high', ['dawn', 'washing up liquid']),
    item('Dish Gloves', 'Cleaning', 'galley', 'Galley Sink Cabinet', 1, 1, 'medium', ['rubber gloves', 'cleaning gloves']),
    item('Sponges', 'Cleaning', 'galley', 'Galley Sink Cabinet', 2, 1, 'medium', ['dish sponge']),

    // Galley Supplies / Storage
    item('Gallon Slider Bags', 'Supplies', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['ziploc gallon']),
    item('Quart Slider Bags', 'Supplies', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['ziploc quart']),
    item('Jumbo Slider Bags', 'Supplies', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['jumbo ziploc']),
    item('Food Gloves', 'Supplies', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['serving gloves', 'food handling gloves']),
    item('Parchment Paper', 'Supplies', 'galley', 'Galley Cabinet', 1, 1, 'low', []),
    item('Press N Seal', 'Supplies', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['plastic wrap', 'cling wrap']),
    item('Non-Stick Aluminum Foil', 'Supplies', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['foil', 'aluminum foil']),
    item('Black Trash Bags', 'Supplies', 'galley', 'Galley Cabinet', 10, 10, 'high', ['trash bags', 'garbage bags']),
    item('Orange Trash Bags', 'Supplies', 'galley', 'Galley Cabinet', 2, 2, 'medium', ['biohazard bags']),
    item('Pens', 'Office', 'galley', 'Galley Right / Office Drawer', 4, 4, 'medium', ['writing pens', 'black pens']),
    item('Sharpie', 'Office', 'galley', 'Galley Right / Office Drawer', 1, 1, 'low', ['marker', 'permanent marker']),
    item('Post-It Notes', 'Office', 'galley', 'Galley Right / Office Drawer', 1, 1, 'low', ['sticky notes']),
    item('Hot Towel Packages', 'Service', 'galley', 'Galley Cabinet', null, 4, 'high', ['hot towels', 'warm towels']),
    item('Nespresso Machine', 'Equipment', 'galley', 'Coffee Station', null, 1, 'critical', ['coffee machine', 'espresso machine']),
    item('Coffee Maker', 'Equipment', 'galley', 'Coffee Station', null, 1, 'critical', ['drip coffee', 'coffee machine']),
    item('Electric Tea Kettle', 'Equipment', 'galley', 'Coffee Station', null, 1, 'high', ['kettle', 'water boiler']),
    item('Milk Frother', 'Equipment', 'galley', 'Coffee Station', null, 1, 'medium', ['frother', 'steamer']),
    item('Coffee Carafe', 'Equipment', 'galley', 'Coffee Station', null, 1, 'medium', ['carafe', 'coffee pot']),
    item('Creamer Pitcher', 'Equipment', 'galley', 'Coffee Station', null, 1, 'medium', ['milk pitcher']),
    item('Espresso Saucers', 'Glassware', 'galley', 'Galley Cabinet', null, 1, 'low', ['saucers']),
    item('Coffee Cups', 'Glassware', 'galley', 'Galley Cabinet', null, 1, 'medium', ['mugs', 'coffee mugs']),
    item('Crew Trays', 'Equipment', 'galley', 'Galley Closet', null, 3, 'medium', ['trays', 'serving trays']),
    item('Grey Dish Towels', 'Linens', 'galley', 'Galley Cabinet', null, 2, 'medium', ['dish towels', 'kitchen towels']),
    item('Cleaning Tub Kit', 'Cleaning', 'galley', 'Left Galley Closet', null, 1, 'high', ['cleaning supplies'], 'Microfiber cloths, Wine Away, Leather wipes, Febreze, Tide Rescue, cleaning wipes, dust gel'),
    item('Yellow Safety Vests', 'Safety', 'galley', 'Right Galley Closet', null, 2, 'critical', ['vests', 'safety vests']),
    item('Headsets', 'Safety', 'galley', 'Right Galley Closet', null, 2, 'critical', ['aviation headset']),
    item('Aircraft Laptop', 'Equipment', 'galley', 'Right Galley Closet', null, 1, 'critical', ['laptop']),
    item('QRH', 'Safety', 'galley', 'Right Galley Closet', null, 1, 'critical', ['quick reference handbook', 'checklist book']),
    item('Gear Pins Bag', 'Safety', 'galley', 'Right Galley Closet', null, 1, 'critical', ['pins', 'safety pins']),
    item('Scotch Tape', 'Office', 'galley', 'Credenza', null, 1, 'low', ['tape']),
    item('White Out', 'Office', 'galley', 'Credenza', null, 1, 'low', ['correction fluid']),

    // ─── AFT LAV ───────────────────────────────────────────────────────────────
    item('Safeguard Hand Soap (Aft)', 'Toiletries', 'aft-lav', 'Aft Lav Dispenser', 1, 1, 'critical', ['soap', 'hand soap']),
    item('Toothbrush (Aft)', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 4, 5, 'medium', []),
    item('Toothpaste (Aft)', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 4, 5, 'medium', []),
    item('Scope (Aft)', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 4, 5, 'medium', ['mouthwash']),
    item('Shaving Cream', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 4, 1, 'medium', []),
    item('Razors', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 4, 5, 'medium', ['razers', 'disposable razors']),
    item('Mini Toothbrushes', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 4, 5, 'low', ['crest mini', 'travel toothbrush']),
    item('Puffs Box (Full Size)', 'Supplies', 'aft-lav', 'Aft Lav Counter', 1, 1, 'medium', ['tissues']),
    item('Washcloths', 'Linens', 'aft-lav', 'Aft Lav Cabinet', 8, 8, 'high', ['wash cloths', 'face cloths']),
    item('Hand Towels (Aft)', 'Linens', 'aft-lav', 'Aft Lav Towel Bar', 2, 2, 'high', []),
    item('Full Hand Towels & Washcloths', 'Linens', 'aft-lav', 'Aft Lav Drawer', null, 1, 'high', ['extra towels']),
    item('NyQuil (Aft)', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 5, 5, 'medium', ['nighttime cold']),
    item('DayQuil (Aft)', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 5, 5, 'medium', []),
    item('Dramamine (Aft)', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 3, 2, 'medium', ['non-drowsy', 'motion sickness']),
    item('Tums', 'Medications', 'aft-lav', 'Behind Mirror', 3, null, 'medium', ['antacid']),
    item('Pepto Bismol (Aft)', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 5, 5, 'medium', []),
    item('Tylenol (Aft)', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 5, 5, 'high', []),
    item('Advil (Aft)', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 5, 5, 'high', ['ibuprofen']),
    item('Benadryl (Aft)', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 5, 5, 'medium', []),
    item('Alka Seltzer (Aft)', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 5, 5, 'medium', []),
    item('ZzzQuil', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 1, 1, 'medium', ['sleep aid', 'zzzquil']),
    item('Sinex Nasal Spray', 'Medications', 'aft-lav', 'Behind Mirror / Drawer', 2, 1, 'medium', ['nasal spray', 'decongestant']),
    item('Visine (Aft)', 'Medications', 'aft-lav', 'Behind Mirror', 2, 2, 'medium', ['eye drops']),
    item('Aspirin', 'Medications', 'aft-lav', 'Aft Lav Drawer', null, 5, 'medium', []),
    item('Band Aids & Ointment', 'First Aid', 'aft-lav', 'Behind Mirror', 1, 1, 'high', ['bandaids', 'first aid']),
    item('Olay Face Cream', 'Amenities', 'aft-lav', 'Behind Mirror / Drawer', 4, 1, 'low', ['face moisturizer']),
    item('Olay Melts', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 2, 1, 'low', ['cleansing melts']),
    item('Olay Makeup Remover Wipes', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 2, 1, 'low', ['makeup wipes']),
    item('Q-Tips', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'low', ['cotton swabs']),
    item('Sewing Kit', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'low', ['needle and thread']),
    item('Comb', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 1, null, 'low', []),
    item('Emery Boards', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 2, 5, 'low', ['nail file', 'nail boards']),
    item('ChapStick (Aft)', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 4, 1, 'low', ['lip balm']),
    item('First Aid Beauty Lip Balm', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 4, 3, 'low', ['lip balm', 'fab lip balm']),
    item('Flossers (Aft)', 'Amenities', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'low', ['floss', 'dental flossers']),
    item('Cough Drops (Aft)', 'Medications', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'medium', ['throat drops']),
    item('Hand Lotion (Aft)', 'Amenities', 'aft-lav', 'Aft Lav Counter', 1, 1, 'medium', ['lotion']),
    item('Celeste Wipes (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'medium', ['wipes']),
    item('Eye Masks', 'Amenities', 'aft-lav', 'Aft Lav Cabinet', 1, 5, 'medium', ['sleep mask']),
    item('Ear Plugs', 'Amenities', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'medium', ['earplugs']),
    item('Slippers', 'Amenities', 'aft-lav', 'Aft Lav Cabinet', 8, 5, 'high', ['slipper sets', 'footwear']),
    item('Tide Pen (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'medium', ['stain pen']),
    item('Tide Wipes (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'medium', ['tide to go']),
    item('Tide Rescue Spray', 'Supplies', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'medium', ['stain remover spray']),
    item('Downy Wrinkle Releaser', 'Supplies', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'medium', ['wrinkle spray']),
    item('Lint Roller (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'low', []),
    item('Static Guard (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Drawer', null, 1, 'low', []),
    item('Dry Cleaning Bag', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'low', ['garment bag']),
    item('Hand Sanitizer (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'high', []),
    item('Toilet Paper (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Dispenser', 1, 1, 'critical', ['tp']),
    item('Spare TP (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', null, 2, 'high', ['extra toilet paper']),
    item('Rolls of Paper Towel', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'high', ['paper towels']),
    item('Blankets', 'Cabin', 'aft-lav', 'Aft Lav Storage', 4, 4, 'high', ['throw blankets', 'cabin blankets']),
    item('Swiffer', 'Cleaning', 'aft-lav', 'Aft Lav Storage', 1, 1, 'medium', ['floor cleaner', 'swifer']),
    item('Swiffer Wet Pads', 'Cleaning', 'aft-lav', 'Aft Lav Storage', 1, 1, 'medium', ['wet pads', 'swiffer pads']),
    item('Swiffer Dry Pads', 'Cleaning', 'aft-lav', 'Aft Lav Storage', 1, 1, 'medium', ['dry pads']),
    item('Trash Bags (Aft)', 'Supplies', 'aft-lav', 'Under Trash Can', 1, 1, 'medium', ['garbage bags']),
    item('Dawn Wipes', 'Cleaning', 'aft-lav', 'Aft Lav Cabinet', 1, null, 'medium', ['cleaning wipes']),
    item('Box Disposable Gloves', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', 1, null, 'medium', ['latex gloves', 'food gloves']),
    item('Disposable Cups & Lids', 'Disposables', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'medium', ['paper cups', 'plastic cups']),
    item('Dinner Napkins (Aft)', 'Disposables', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'medium', []),
    item('Cocktail Napkins (Aft)', 'Disposables', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'medium', []),
    item('Paper Towels (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', 2, null, 'high', []),
    item('Febreze (Aft)', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'medium', ['air freshener']),
    item('Seatbelt Extenders', 'Safety', 'aft-lav', 'Aft Lav Storage', null, 3, 'critical', ['seatbelt extender', 'belt extender']),
    item('Headset (Aft)', 'Safety', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'high', ['aviation headset']),
    item('Manuals', 'Safety', 'aft-lav', 'Aft Lav Storage', null, 1, 'critical', ['aircraft manuals', 'procedures']),
    item('Yellow Safety Vests (Aft)', 'Safety', 'aft-lav', 'Aft Lav Storage', null, 3, 'critical', ['safety vests']),
    item('Booties', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'low', ['shoe covers']),
    item('Luggage Tags', 'Supplies', 'aft-lav', 'Aft Lav Drawer', null, 1, 'low', ['bag tags']),
    item('Bamboo Plates & Bowls (Aft)', 'Dinnerware', 'aft-lav', 'Aft Lav Storage', 1, 1, 'low', []),
    item('Extra Leather Wipes', 'Cleaning', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'medium', []),
    item('Extra Cleaning Wipes', 'Cleaning', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'medium', []),
    item('Extra Food Gloves', 'Supplies', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'medium', []),
    item('20 Hand Towels (Aft Store)', 'Linens', 'aft-lav', 'Aft Lav Storage', 20, null, 'high', []),
    item('Vacuum & Attachments', 'Equipment', 'aft-lav', 'Aft Lav Storage', 1, null, 'high', ['hoover', 'vacuum cleaner']),
    item('Vacuum Head & Attachments', 'Equipment', 'aft-lav', 'Divan / Storage', null, 1, 'high', ['vacuum']),
    item('Trays (Aft)', 'Equipment', 'aft-lav', 'Behind Aft Seat', 3, 3, 'medium', ['serving trays']),
    item('Hand Towels on Rack (Aft)', 'Linens', 'aft-lav', 'Aft Lav Towel Bar', null, 2, 'high', []),

    // ─── CREDENZA ──────────────────────────────────────────────────────────────
    item('Snacks', 'Food', 'credenza', 'Credenza Both Ends / Snack Basket', 1, 1, 'high', ['snack basket', 'mixed snacks'], 'Keep both ends full / basket full'),
    item('Playing Cards', 'Entertainment', 'credenza', 'Credenza', 1, 2, 'low', ['cards', 'card games'], 'Decks'),
    item('Batteries', 'Supplies', 'credenza', 'Credenza', 8, 1, 'medium', ['AA batteries', 'AAA batteries']),
    item('Office Supplies', 'Office', 'credenza', 'Credenza', 1, 1, 'medium', ['scissors', 'stapler', 'tape'], 'Scissors, stapler, staples, tape, white out, pens'),
    item('Printer Paper', 'Office', 'credenza', 'Credenza', null, 1, 'low', ['paper', 'copy paper']),
    item('Nonslip Mats', 'Supplies', 'credenza', 'Credenza', null, 1, 'medium', ['grip mats', 'non slip']),
    item('AV Cord Container', 'Equipment', 'credenza', 'Credenza', null, 1, 'high', ['hdmi cables', 'charging cords', 'av equipment'], 'HDMI cables, lightning adapters, USB-C cable, charging brick, converters'),
    item('3D Wine Holders', 'Equipment', 'credenza', 'Credenza', null, 2, 'medium', ['wine holder', 'wine rack']),
    item('White Wine', 'Beverages', 'credenza', 'Credenza Wine Storage', null, 2, 'high', ['chardonnay', 'sauvignon blanc', 'white wine'], 'Per variety'),
    item('Red Wine', 'Beverages', 'credenza', 'Credenza Wine Storage', null, 2, 'high', ['cabernet', 'pinot noir', 'red wine'], 'Per variety'),
    item('Liquor Seals', 'Service', 'credenza', 'Credenza / Chiller', 1, 1, 'critical', ['liquor seal', 'bottle seals']),
    item('USB-A Lightning Charger', 'Equipment', 'credenza', 'Sideledge', null, 1, 'high', ['iphone charger', 'lightning cable']),
    item('USB-A USB-C Charger', 'Equipment', 'credenza', 'Sideledge', null, 1, 'high', ['usbc charger', 'android charger']),
    item('Bose Headphones', 'Equipment', 'credenza', 'Sideledge', null, 1, 'high', ['headphones', 'bose', 'noise cancelling']),
    item('Motion Sickness Bags', 'Safety', 'credenza', 'Each Armrest', 1, null, 'critical', ['sick bag', 'airsick bag']),
    item('Safety Briefing Cards', 'Safety', 'credenza', 'Each Armrest / Aft Lav', 1, null, 'critical', ['safety card', 'briefing card']),

    // ─── CHILLER / BAGGAGE ─────────────────────────────────────────────────────
    item('Waters (Chiller)', 'Beverages', 'chiller', 'Chiller', 9, null, 'critical', ['water bottles', 'bottled water']),
    item('Grape Propel (Chiller)', 'Beverages', 'chiller', 'Chiller', 2, null, 'medium', ['propel']),
    item('Chardonnay', 'Wine', 'chiller', 'Chiller / Wine Rack', 2, null, 'high', ['white wine', 'chard']),
    item('Sauvignon Blanc', 'Wine', 'chiller', 'Chiller / Wine Rack', 2, null, 'high', ['white wine', 'sauv blanc']),
    item('Pinot Noir', 'Wine', 'chiller', 'Chiller / Wine Rack', 2, null, 'high', ['red wine', 'pinot']),
    item('Cabernet Sauvignon', 'Wine', 'chiller', 'Chiller / Wine Rack', 2, null, 'high', ['red wine', 'cab sauv', 'cabernet']),
    item('Case Small Waters (Baggage)', 'Beverages', 'chiller', 'Baggage Compartment', null, 1, 'critical', ['water case', 'water supply']),
    item('Case Perrier (Baggage)', 'Beverages', 'chiller', 'Baggage Compartment', null, 1, 'high', ['perrier case', 'sparkling water']),
    item('Vacuum Base', 'Equipment', 'chiller', 'Baggage Compartment', null, 1, 'medium', ['vacuum base', 'vacuum body']),
    item('8 Liter Water Bottles', 'Beverages', 'chiller', 'Galley Closet / Storage', null, 1, 'high', ['liter water', 'large water']),
];
