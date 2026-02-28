// Aircraft Inventory Data — G650 (N1PG, N2PG) & G500 (N5PG, N6PG)
// Generated from official Word inventory documents

export type AreaType = 'forward-lav' | 'galley' | 'aft-lav' | 'credenza' | 'chiller' | 'baggage';
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
    isHidden?: boolean;
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

    // ─── FORWARD LEFT CLOSET ───────────────────────────────────────────────────────────
    item('Nespresso Machine', 'Forward Left Closet', 'forward-lav', 'Coffee Station', null, 1, 'critical', ['coffee machine', 'espresso machine']),
    item('Nespresso Pods', 'Forward Left Closet', 'forward-lav', 'Galley Right / Coffee Station', 2, 3, 'high', ['coffee pods', 'espresso pods', 'nespresso'], 'Sleeves'),
    item('Milk Frother', 'Forward Left Closet', 'forward-lav', 'Coffee Station', null, 1, 'medium', ['frother', 'steamer']),
    item('Electric Tea Kettle', 'Forward Left Closet', 'forward-lav', 'Coffee Station', null, 1, 'high', ['kettle', 'water boiler']),
    item('Coffee Carafe', 'Forward Left Closet', 'forward-lav', 'Coffee Station', null, 1, 'medium', ['carafe', 'coffee pot']),
    item('Oat Milk', 'Forward Left Closet', 'forward-lav', 'Galley Refrigerator', null, 1, 'medium', ['milk alternative', 'dairy free']),
    item('Paper Hand Towels', 'Forward Left Closet', 'forward-lav', 'Lav Counter', 1, 1, 'high', ['hand towels', 'paper towels']),
    item('Crew Trays', 'Forward Left Closet', 'forward-lav', 'Galley Closet', null, 3, 'medium', ['trays', 'serving trays']),
    item('Cleaning Tub Kit', 'Forward Left Closet', 'forward-lav', 'Left Galley Closet', null, 1, 'high', ['cleaning supplies'], 'Microfiber cloths, Wine Away, Leather wipes, Febreze, Tide Rescue, cleaning wipes, dust gel'),
    item('Hand Sanitizer', 'Forward Left Closet', 'forward-lav', 'Lav Counter', 1, 1, 'high', ['sanitizer', 'hand gel']),
    item('Tide Rescue Spray', 'Forward Left Closet', 'forward-lav', 'Aft Lav Drawer', 1, 1, 'medium', ['stain remover spray']),

    // ─── FORWARD RIGHT CLOSET ───────────────────────────────────────────────────────────
    item('Celeste Wipes', 'Forward Right Closet', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['wipes', 'cleaning wipes']),
    item('Yellow Safety Vests', 'Forward Right Closet', 'forward-lav', 'Right Galley Closet', null, 2, 'critical', ['vests', 'safety vests']),
    item('Ear Plugs', 'Forward Right Closet', 'forward-lav', 'Aft Lav Cabinet', 1, 1, 'medium', ['earplugs']),
    item('Headsets', 'Forward Right Closet', 'forward-lav', 'Right Galley Closet', null, 2, 'critical', ['aviation headset']),

    // ─── LOWER CABINET ───────────────────────────────────────────────────────────
    item('8 Liter Water Bottles', 'Lower Cabinet', 'forward-lav', 'Galley Closet / Storage', null, 1, 'high', ['liter water', 'large water']),

    // ─── FORWARD LAV ───────────────────────────────────────────────────────────
    item('Toothbrush', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 3, 1, 'medium', ['toothbrushes']),
    item('Toothpaste', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 3, 3, 'medium', []),
    item('Scope Mouthwash', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 3, 1, 'medium', ['mouthwash', 'scope']),
    item('Flossers', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'low', ['floss', 'dental floss']),
    item('Cough Drops', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['throat drops', 'vicks']),
    item('Imodium', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', []),
    item('Visine Eye Drops', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['eye drops', 'visine']),
    item('Band-Aids', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'high', ['bandaids', 'first aid', 'bandages']),
    item('ChapStick', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 2, 1, 'low', ['lip balm', 'chapstick']),
    item('Dramamine', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['motion sickness']),
    item('Alka Seltzer', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 4, 1, 'medium', []),
    item('Pepto Bismol', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 4, 4, 'medium', ['pepto']),
    item('Advil', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 4, 1, 'high', ['ibuprofen', 'pain reliever']),
    item('Tylenol', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 4, 4, 'high', ['acetaminophen', 'pain reliever']),
    item('Benadryl', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 4, 1, 'medium', ['allergy', 'diphenhydramine']),
    item('DayQuil', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 4, 1, 'medium', ['cold medicine', 'dayquil']),
    item('NyQuil', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 2, 1, 'medium', ['nyquil', 'nighttime cold']),
    item('Tide To Go Wipes', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 4, 1, 'medium', ['tide wipes', 'stain remover']),
    item('Tide Pen', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['stain pen']),
    item('Hand Lotion', 'Forward Lav', 'forward-lav', 'Lav Counter', 1, 1, 'medium', ['lotion', 'moisturizer']),
    item('Puffs Box', 'Forward Lav', 'forward-lav', 'Lav Counter', 1, 1, 'medium', ['tissues', 'kleenex']),
    item('Toilet Paper', 'Forward Lav', 'forward-lav', 'Lav Dispenser', 1, 1, 'critical', ['tp', 'tissue']),
    item('Safeguard Hand Soap', 'Forward Lav', 'forward-lav', 'Lav Dispenser', 1, 1, 'critical', ['soap', 'hand soap']),
    item('Pads & Tampons', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'high', ['feminine products', 'hygiene']),
    item('Static Guard', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'low', ['static spray']),
    item('Hot Towels', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 5, 1, 'high', ['warm towels', 'oshibori']),
    item('Lint Roller', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'low', []),
    item('Febreze', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, 1, 'medium', ['air freshener', 'spray']),
    item('Extra Safeguard Hand Soap', 'Forward Lav', 'forward-lav', 'Lav Cabinet', 1, null, 'medium', ['backup soap']),

    // ─── GALLEY LEFT ───────────────────────────────────────────────────────────
    item('Green Tea', 'Galley Left', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['tea', 'green tea']),
    item('Mint Tea', 'Galley Left', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['peppermint tea', 'herbal tea']),
    item('English Breakfast Tea', 'Galley Left', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['black tea']),
    item('Earl Grey Tea', 'Galley Left', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['earl gray']),
    item('Chamomile Tea', 'Galley Left', 'galley', 'Galley Tea Drawer', 7, 7, 'medium', ['herbal tea', 'chamomile']),
    item('Stir Sticks', 'Galley Left', 'galley', 'Galley Drawer', 1, 1, 'medium', ['coffee stirrers']),
    item('White Sugar', 'Galley Left', 'galley', 'Galley Condiment Drawer', 12, 12, 'medium', ['sugar']),
    item('Sugar In The Raw', 'Galley Left', 'galley', 'Galley Condiment Drawer', 12, 12, 'medium', ['raw sugar', 'brown sugar']),
    item('Sweet N Low', 'Galley Left', 'galley', 'Galley Condiment Drawer', 12, 12, 'low', ['sweetener', 'pink packets']),
    item('Stevia', 'Galley Left', 'galley', 'Galley Condiment Drawer', 12, 12, 'low', ['natural sweetener']),
    item('Splenda', 'Galley Left', 'galley', 'Galley Condiment Drawer', 12, 12, 'low', ['yellow packets', 'splenda']),
    item('Espresso Cups', 'Galley Left', 'galley', 'Galley Cabinet', 4, 1, 'medium', ['demitasse cups']),
    item('Disposable Hot Cups', 'Galley Left', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['paper cups', 'hot beverage cups']),
    item('Hot Cup Lids', 'Galley Left', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['cup lids']),
    item('Frosted Disposable Cups', 'Galley Left', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['cold cups', 'disposable cups']),
    item('Mandolin', 'Galley Left', 'galley', 'Galley Equipment Drawer', 1, 1, 'low', ['slicer', 'mandoline']),
    item('Cooking Knives', 'Galley Left', 'galley', 'Galley Knife Block', 3, 1, 'high', ['kitchen knives', 'chef knife']),
    item('Cooking Spatulas', 'Galley Left', 'galley', 'Galley Utensil Drawer', 2, 1, 'medium', ['spatula']),
    item('Cooking Tongs', 'Galley Left', 'galley', 'Galley Utensil Drawer', 3, 1, 'medium', ['kitchen tongs']),
    item('Meat Thermometer', 'Galley Left', 'galley', 'Galley Utensil Drawer', 1, null, 'medium', ['thermometer']),
    item('Kitchen Shears', 'Galley Left', 'galley', 'Galley Utensil Drawer', 1, 1, 'medium', ['scissors', 'kitchen scissors']),
    item('Wine Opener', 'Galley Left', 'galley', 'Wine Service Drawer', 1, 1, 'high', ['corkscrew']),
    item('Wine Key', 'Galley Left', 'galley', 'Wine Service Drawer', 1, 1, 'medium', []),
    item('Wine Stoppers', 'Galley Left', 'galley', 'Wine Service Drawer', 4, 4, 'medium', ['wine sealer', 'bottle stopper']),
    item('Stop Drop Wine Pourers', 'Galley Left', 'galley', 'Wine Service Drawer', 1, null, 'low', ['wine pourer', 'disc pourer']),
    item('Sponges', 'Galley Left', 'galley', 'Galley Sink Cabinet', 2, 1, 'medium', ['dish sponge']),
    item('Dish Gloves', 'Galley Left', 'galley', 'Galley Sink Cabinet', 1, 1, 'medium', ['rubber gloves', 'cleaning gloves']),
    item('Dish Soap', 'Galley Left', 'galley', 'Galley Sink', 1, 1, 'high', ['dawn', 'washing up liquid']),
    item('Liquid Measuring Cup', 'Galley Left', 'galley', 'Galley Utensil Drawer', 1, 1, 'low', ['measuring cup']),
    item('Whisk', 'Galley Left', 'galley', 'Galley Utensil Drawer', 1, 1, 'low', []),
    item('Vegetable Peeler', 'Galley Left', 'galley', 'Galley Utensil Drawer', 1, 1, 'low', ['peeler']),
    item('Can Opener', 'Galley Left', 'galley', 'Galley Utensil Drawer', 1, 1, 'medium', []),
    item('Cheese Knives', 'Galley Left', 'galley', 'Galley Utensil Drawer', 4, 1, 'low', ['cheese knife', 'butter knives']),
    item('Tiny Tongs', 'Galley Left', 'galley', 'Galley Utensil Drawer', 6, 1, 'low', ['small tongs', 'sugar tongs']),
    item('Demitasse Spoons', 'Galley Left', 'galley', 'Silverware Drawer', 6, 1, 'low', ['tiny spoons', 'espresso spoons']),
    item('Serving Spoons', 'Galley Left', 'galley', 'Silverware Drawer', 4, 1, 'medium', []),
    item('Serving Fork', 'Galley Left', 'galley', 'Silverware Drawer', 1, 1, 'medium', []),
    item('Dinner Knives', 'Galley Left', 'galley', 'Silverware Drawer', 14, 12, 'high', ['knives']),
    item('Steak Knives', 'Galley Left', 'galley', 'Silverware Drawer', 14, 12, 'medium', []),
    item('Teaspoons', 'Galley Left', 'galley', 'Silverware Drawer', 14, 12, 'medium', []),
    item('Salad Forks', 'Galley Left', 'galley', 'Silverware Drawer', 14, 12, 'medium', []),
    item('Dinner Forks', 'Galley Left', 'galley', 'Silverware Drawer', 14, 12, 'high', ['forks']),
    item('Soup Spoons', 'Galley Left', 'galley', 'Silverware Drawer', 14, 12, 'medium', ['spoons']),
    item('Silver Ramekins', 'Galley Left', 'galley', 'Galley Cabinet', 1, 12, 'medium', ['ramekins', 'small bowls']),
    item('Pitchers', 'Galley Left', 'galley', 'Galley Cabinet', 2, 1, 'medium', ['water pitcher', 'creamer pitcher']),
    item('Dinner Plates', 'Galley Left', 'galley', 'Galley China Cabinet', 14, 1, 'high', ['plates']),
    item('Salad Plates', 'Galley Left', 'galley', 'Galley China Cabinet', 14, 1, 'medium', []),
    item('Bread Plates', 'Galley Left', 'galley', 'Galley China Cabinet', 14, 1, 'medium', []),
    item('Bowls', 'Galley Left', 'galley', 'Galley China Cabinet', 14, 1, 'medium', ['soup bowls']),
    item('Dish Tub', 'Galley Left', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['wash tub', 'collapsible tub']),
    item('Placemats', 'Galley Left', 'galley', 'Galley Linen Drawer', 15, 11, 'high', ['table mats']),
    item('Black Trash Bags', 'Galley Left', 'galley', 'Galley Cabinet', 10, 10, 'high', ['trash bags', 'garbage bags']),
    item('Orange Trash Bags', 'Galley Left', 'galley', 'Galley Cabinet', 2, 2, 'medium', ['biohazard bags']),
    item('Coffee Maker', 'Galley Left', 'galley', 'Coffee Station', null, 1, 'critical', ['drip coffee', 'coffee machine']),
    item('Creamer Pitcher', 'Galley Left', 'galley', 'Coffee Station', null, 1, 'medium', ['milk pitcher']),
    item('Espresso Saucers', 'Galley Left', 'galley', 'Galley Cabinet', null, 1, 'low', ['saucers']),
    item('Coffee Cups', 'Galley Left', 'galley', 'Galley Cabinet', null, 1, 'medium', ['mugs', 'coffee mugs']),

    // ─── GALLEY RIGHT ───────────────────────────────────────────────────────────
    item('Baking Sheets', 'Galley Right', 'galley', 'Galley Right / Lower Cabinet', 4, 4, 'medium', ['sheet pans', 'baking pans']),
    item('Dish Tub', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['wash tub', 'collapsible tub']),
    item('Salt & Pepper Grinders', 'Galley Right', 'galley', 'Dining Setup', 4, 6, 'high', ['salt', 'pepper', 'seasonings']),
    item('Red Chili Flakes', 'Galley Right', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', ['chili flakes', 'red pepper']),
    item('Honey', 'Galley Right', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', []),
    item('Soy Sauce', 'Galley Right', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', []),
    item('Olive Oil', 'Galley Right', 'galley', 'Galley Condiment Shelf', 1, 1, 'medium', []),
    item('Balsamic Vinegar', 'Galley Right', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', ['vinegar']),
    item('Tabasco', 'Galley Right', 'galley', 'Galley Condiment Shelf', 1, 1, 'low', ['hot sauce']),
    item('Pens', 'Galley Right', 'galley', 'Galley Right / Office Drawer', 4, 4, 'medium', ['writing pens', 'black pens']),
    item('Sharpie', 'Galley Right', 'galley', 'Galley Right / Office Drawer', 1, 1, 'low', ['marker', 'permanent marker']),
    item('Post-It Notes', 'Galley Right', 'galley', 'Galley Right / Office Drawer', 1, 1, 'low', ['sticky notes']),
    item('Decaf Via', 'Galley Right', 'galley', 'Galley Coffee Station', 10, 10, 'medium', ['decaf', 'instant decaf']),
    item('Coffee Filters', 'Galley Right', 'galley', 'Galley Coffee Station', 1, 1, 'high', ['filters']),
    item('Coffee Scoop', 'Galley Right', 'galley', 'Galley Coffee Station', 1, 1, 'medium', []),
    item('Snacks', 'Galley Right', 'galley', 'Credenza Both Ends / Snack Basket', 1, 1, 'high', ['snack basket', 'mixed snacks'], 'Keep both ends full / basket full'),
    item('Grape Propel', 'Galley Right', 'galley', 'Galley Right / Cabinet', 5, 5, 'medium', ['propel', 'flavored water']),
    item('Small Water Bottles', 'Galley Right', 'galley', 'Galley Right / Cabinet', 1, 1, 'critical', ['water', 'little waters'], 'Keep full'),
    item('Large Bamboo Plates', 'Galley Right', 'galley', 'Galley Cabinet', 6, 11, 'medium', ['bamboo plates']),
    item('Small Bamboo Plates', 'Galley Right', 'galley', 'Galley Cabinet', 6, 11, 'medium', ['small bamboo']),
    item('Bamboo Bowls', 'Galley Right', 'galley', 'Galley Cabinet', 6, 11, 'medium', ['bamboo bowls']),
    item('Cocktail Napkins', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['beverage napkins']),
    item('Linen Dinner Napkins', 'Galley Right', 'galley', 'Galley Linen Drawer', 1, 11, 'high', ['cloth napkins', 'napkins']),
    item('Perrier', 'Galley Right', 'galley', 'Galley Right / Cabinet', 8, 8, 'high', ['sparkling water', 'carbonated water']),
    item('Coke', 'Galley Right', 'galley', 'Galley Right / Cabinet', 6, 6, 'medium', ['coca cola', 'soda']),
    item('Coke Zero', 'Galley Right', 'galley', 'Galley Right / Cabinet', 6, 6, 'medium', ['coke zero sugar']),
    item('Diet Coke', 'Galley Right', 'galley', 'Galley Right / Cabinet', 6, 6, 'medium', ['diet cola']),
    item('Sprite', 'Galley Right', 'galley', 'Galley Right / Cabinet', 6, 6, 'medium', ['lemon lime soda']),
    item('Gallon Slider Bags', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['ziploc gallon']),
    item('Quart Slider Bags', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['ziploc quart']),
    item('Jumbo Slider Bags', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['jumbo ziploc']),
    item('Hot Pads', 'Galley Right', 'galley', 'Galley Cabinet', 2, 2, 'medium', ['pot holders']),
    item('Mini Silicone Oven Mitts', 'Galley Right', 'galley', 'Galley Cabinet', 2, 2, 'medium', ['oven mitts']),
    item('Oven Mitts', 'Galley Right', 'galley', 'Galley Cabinet', 2, null, 'medium', []),
    item('Microwave Cooking Bags', 'Galley Right', 'galley', 'Galley Cabinet', 4, 4, 'medium', ['cooking bags']),
    item('Food Gloves', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['serving gloves', 'food handling gloves']),
    item('Cutting Boards', 'Galley Right', 'galley', 'Galley Cabinet', 2, 1, 'medium', ['cutting board']),
    item('Silver Trays', 'Galley Right', 'galley', 'Galley Cabinet', 2, 2, 'medium', ['serving trays', 'silver tray']),
    item('Parchment Paper', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'low', []),
    item('Press N Seal', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['plastic wrap', 'cling wrap']),
    item('Non-Stick Aluminum Foil', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['foil', 'aluminum foil']),
    item('My Drap Roll Napkins', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['my drap', 'roll napkins']),
    item('Paper Dinner Napkins', 'Galley Right', 'galley', 'Galley Cabinet', 1, 1, 'medium', ['dinner napkins', 'disposable napkins']),
    item('Hot Towel Packages', 'Galley Right', 'galley', 'Galley Cabinet', null, 4, 'high', ['hot towels', 'warm towels']),
    item('Grey Dish Towels', 'Galley Right', 'galley', 'Galley Cabinet', null, 2, 'medium', ['dish towels', 'kitchen towels']),
    item('Aircraft Laptop', 'Galley Right', 'galley', 'Right Galley Closet', null, 1, 'critical', ['laptop']),
    item('QRH', 'Galley Right', 'galley', 'Right Galley Closet', null, 1, 'critical', ['quick reference handbook', 'checklist book']),
    item('Gear Pins Bag', 'Galley Right', 'galley', 'Right Galley Closet', null, 1, 'critical', ['pins', 'safety pins']),

    // ─── AFT LAV ───────────────────────────────────────────────────────────
    item('Toothbrush', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 3, 1, 'medium', ['toothbrushes']),
    item('Toothpaste', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 3, 3, 'medium', []),
    item('Shaving Cream', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 4, 1, 'medium', []),
    item('Razors', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 4, 5, 'medium', ['razers', 'disposable razors']),
    item('Mini Toothbrushes', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 4, 5, 'low', ['crest mini', 'travel toothbrush']),
    item('Safeguard Hand Soap', 'Aft Lav', 'aft-lav', 'Lav Dispenser', 1, 1, 'critical', ['soap', 'hand soap']),
    item('Puffs Box', 'Aft Lav', 'aft-lav', 'Lav Counter', 1, 1, 'medium', ['tissues', 'kleenex']),
    item('Washcloths', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', 8, 8, 'high', ['wash cloths', 'face cloths']),
    item('Band Aids & Ointment', 'Aft Lav', 'aft-lav', 'Behind Mirror', 1, 1, 'high', ['bandaids', 'first aid']),
    item('Sinex Nasal Spray', 'Aft Lav', 'aft-lav', 'Behind Mirror / Drawer', 2, 1, 'medium', ['nasal spray', 'decongestant']),
    item('ZzzQuil', 'Aft Lav', 'aft-lav', 'Behind Mirror / Drawer', 1, 1, 'medium', ['sleep aid', 'zzzquil']),
    item('NyQuil', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 2, 1, 'medium', ['nyquil', 'nighttime cold']),
    item('DayQuil', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 4, 1, 'medium', ['cold medicine', 'dayquil']),
    item('Dramamine', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 1, 1, 'medium', ['motion sickness']),
    item('Tums', 'Aft Lav', 'aft-lav', 'Behind Mirror', 3, null, 'medium', ['antacid']),
    item('Pepto Bismol', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 4, 4, 'medium', ['pepto']),
    item('Tylenol', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 4, 4, 'high', ['acetaminophen', 'pain reliever']),
    item('Advil', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 4, 1, 'high', ['ibuprofen', 'pain reliever']),
    item('Benadryl', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 4, 1, 'medium', ['allergy', 'diphenhydramine']),
    item('Alka Seltzer', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 4, 1, 'medium', []),
    item('Aspirin', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', null, 5, 'medium', []),
    item('Olay Face Cream', 'Aft Lav', 'aft-lav', 'Behind Mirror / Drawer', 4, 1, 'low', ['face moisturizer']),
    item('Sewing Kit', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'low', ['needle and thread']),
    item('Emery Boards', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 2, 5, 'low', ['nail file', 'nail boards']),
    item('Olay Melts', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 2, 1, 'low', ['cleansing melts']),
    item('Q-Tips', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'low', ['cotton swabs']),
    item('Comb', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 1, null, 'low', []),
    item('Lint Roller', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 1, 1, 'low', []),
    item('Febreze', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 1, 1, 'medium', ['air freshener', 'spray']),
    item('Flossers', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 1, 1, 'low', ['floss', 'dental floss']),
    item('Cough Drops', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 1, 1, 'medium', ['throat drops', 'vicks']),
    item('ChapStick', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 2, 1, 'low', ['lip balm', 'chapstick']),
    item('First Aid Beauty Lip Balm', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 4, 3, 'low', ['lip balm', 'fab lip balm']),
    item('Hand Lotion', 'Aft Lav', 'aft-lav', 'Lav Counter', 1, 1, 'medium', ['lotion', 'moisturizer']),
    item('Celeste Wipes', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 1, 1, 'medium', ['wipes', 'cleaning wipes']),
    item('Eye Masks', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', 1, 5, 'medium', ['sleep mask']),
    item('Olay Makeup Remover Wipes', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 2, 1, 'low', ['makeup wipes']),
    item('Tide Pen', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 1, 1, 'medium', ['stain pen']),
    item('Slippers', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', 8, 5, 'high', ['slipper sets', 'footwear']),
    item('Downy Wrinkle Releaser', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', 1, 1, 'medium', ['wrinkle spray']),
    item('Swiffer Wet Pads', 'Aft Lav', 'aft-lav', 'Aft Lav Storage', 1, 1, 'medium', ['wet pads', 'swiffer pads']),
    item('Vacuum & Attachments', 'Aft Lav', 'aft-lav', 'Aft Lav Storage', 1, null, 'high', ['hoover', 'vacuum cleaner']),
    item('Dry Cleaning Bag', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'low', ['garment bag']),
    item('Rolls of Paper Towel', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'high', ['paper towels']),
    item('Disposable Cups & Lids', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', 1, 1, 'medium', ['paper cups', 'plastic cups']),
    item('Cocktail Napkins', 'Aft Lav', 'aft-lav', 'Galley Cabinet', 1, 1, 'medium', ['beverage napkins']),
    item('Box Disposable Gloves', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', 1, null, 'medium', ['latex gloves', 'food gloves']),
    item('Dawn Wipes', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', 1, null, 'medium', ['cleaning wipes']),
    item('Hand Sanitizer', 'Aft Lav', 'aft-lav', 'Lav Counter', 1, 1, 'high', ['sanitizer', 'hand gel']),
    item('Bowls', 'Aft Lav', 'aft-lav', 'Galley China Cabinet', 14, 1, 'medium', ['soup bowls']),
    item('Blankets', 'Aft Lav', 'aft-lav', 'Aft Lav Storage', 4, 4, 'high', ['throw blankets', 'cabin blankets']),
    item('Swiffer', 'Aft Lav', 'aft-lav', 'Aft Lav Storage', 1, 1, 'medium', ['floor cleaner', 'swifer']),
    item('Swiffer Dry Pads', 'Aft Lav', 'aft-lav', 'Aft Lav Storage', 1, 1, 'medium', ['dry pads']),
    item('Seatbelt Extenders', 'Aft Lav', 'aft-lav', 'Aft Lav Storage', null, 3, 'critical', ['seatbelt extender', 'belt extender']),
    item('Manuals', 'Aft Lav', 'aft-lav', 'Aft Lav Storage', null, 1, 'critical', ['aircraft manuals', 'procedures']),
    item('Yellow Safety Vests', 'Aft Lav', 'aft-lav', 'Right Galley Closet', null, 2, 'critical', ['vests', 'safety vests']),
    item('Booties', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'low', ['shoe covers']),
    item('Luggage Tags', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', null, 1, 'low', ['bag tags']),
    item('Extra Leather Wipes', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'medium', []),
    item('Extra Cleaning Wipes', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'medium', []),
    item('Extra Food Gloves', 'Aft Lav', 'aft-lav', 'Aft Lav Cabinet', null, 1, 'medium', []),
    item('Vacuum Head & Attachments', 'Aft Lav', 'aft-lav', 'Divan / Storage', null, 1, 'high', ['vacuum']),
    item('Static Guard', 'Aft Lav', 'aft-lav', 'Lav Cabinet', 1, 1, 'low', ['static spray']),
    item('Toilet Paper', 'Aft Lav', 'aft-lav', 'Lav Dispenser', 1, 1, 'critical', ['tp', 'tissue']),
    item('Full Hand Towels & Washcloths', 'Aft Lav', 'aft-lav', 'Aft Lav Drawer', null, 1, 'high', ['extra towels']),

    // ─── CREDENZA ───────────────────────────────────────────────────────────
    item('Playing Cards', 'Credenza', 'credenza', 'Credenza', 1, 2, 'low', ['cards', 'card games'], 'Decks'),
    item('Batteries', 'Credenza', 'credenza', 'Credenza', 8, 1, 'medium', ['AA batteries', 'AAA batteries']),
    item('Office Supplies', 'Credenza', 'credenza', 'Credenza', 1, 1, 'medium', ['scissors', 'stapler', 'tape'], 'Scissors, stapler, staples, tape, white out, pens'),
    item('Printer Paper', 'Credenza', 'credenza', 'Credenza', null, 1, 'low', ['paper', 'copy paper']),
    item('Nonslip Mats', 'Credenza', 'credenza', 'Credenza', null, 1, 'medium', ['grip mats', 'non slip']),
    item('AV Cord Container', 'Credenza', 'credenza', 'Credenza', null, 1, 'high', ['hdmi cables', 'charging cords', 'av equipment'], 'HDMI cables, lightning adapters, USB-C cable, charging brick, converters'),
    item('3D Wine Holders', 'Credenza', 'credenza', 'Credenza', null, 2, 'medium', ['wine holder', 'wine rack']),
    item('White Wine', 'Credenza', 'credenza', 'Credenza Wine Storage', null, 2, 'high', ['chardonnay', 'sauvignon blanc', 'white wine'], 'Per variety'),
    item('Red Wine', 'Credenza', 'credenza', 'Credenza Wine Storage', null, 2, 'high', ['cabernet', 'pinot noir', 'red wine'], 'Per variety'),
    item('Liquor Seals', 'Credenza', 'credenza', 'Credenza / Chiller', 1, 1, 'critical', ['liquor seal', 'bottle seals']),
    item('USB-A Lightning Charger', 'Credenza', 'credenza', 'Sideledge', null, 1, 'high', ['iphone charger', 'lightning cable']),
    item('USB-A USB-C Charger', 'Credenza', 'credenza', 'Sideledge', null, 1, 'high', ['usbc charger', 'android charger']),
    item('Bose Headphones', 'Credenza', 'credenza', 'Sideledge', null, 1, 'high', ['headphones', 'bose', 'noise cancelling']),
    item('Motion Sickness Bags', 'Credenza', 'credenza', 'Each Armrest', 12, 10, 'critical', ['sick bag', 'airsick bag'], '1 per seat — 12 seats G650, 10 seats G500'),
    item('Safety Briefing Cards', 'Credenza', 'credenza', 'Each Armrest / Aft Lav', 12, 10, 'critical', ['safety card', 'briefing card'], '1 per seat — 12 seats G650, 10 seats G500'),
    item('Scotch Tape', 'Credenza', 'credenza', 'Credenza', null, 1, 'low', ['tape']),
    item('White Out', 'Credenza', 'credenza', 'Credenza', null, 1, 'low', ['correction fluid']),

    // ─── CHILLER ───────────────────────────────────────────────────────────
    item('Grape Propel', 'Chiller', 'chiller', 'Galley Right / Cabinet', 5, 5, 'medium', ['propel', 'flavored water']),
    item('Chardonnay', 'Chiller', 'chiller', 'Chiller / Wine Rack', 2, null, 'high', ['white wine', 'chard']),
    item('Sauvignon Blanc', 'Chiller', 'chiller', 'Chiller / Wine Rack', 2, null, 'high', ['white wine', 'sauv blanc']),
    item('Pinot Noir', 'Chiller', 'chiller', 'Chiller / Wine Rack', 2, null, 'high', ['red wine', 'pinot']),
    item('Cabernet Sauvignon', 'Chiller', 'chiller', 'Chiller / Wine Rack', 2, null, 'high', ['red wine', 'cab sauv', 'cabernet']),
    item('Perrier', 'Chiller', 'chiller', 'Galley Right / Cabinet', 8, 8, 'high', ['sparkling water', 'carbonated water']),
    item('Vacuum Base', 'Chiller', 'chiller', 'Baggage Compartment', null, 1, 'medium', ['vacuum base', 'vacuum body']),
    item('8 Liter Water Bottles', 'Chiller', 'chiller', 'Galley Closet / Storage', null, 1, 'high', ['liter water', 'large water']),


];
