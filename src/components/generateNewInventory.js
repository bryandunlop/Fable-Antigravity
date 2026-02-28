const fs = require('fs');

const currentContent = fs.readFileSync('inventoryData.ts', 'utf8');

// Extract all existing items
const itemRegex = /    item\(([^)]+)\),?/g;
const itemsMap = new Map();

let match;
while ((match = itemRegex.exec(currentContent)) !== null) {
    // Grab the itemName from the arguments. It's the first string argument.
    const nameMatch = match[1].match(/'([^']+)'/);
    if (nameMatch) {
        const itemName = nameMatch[1];
        itemsMap.set(itemName.toLowerCase().trim(), `    item(${match[1]}),`);
    }
}

// Define the exact Word manual order mapping based on physical locations
const wordDocOrder = [
    {
        category: 'Forward Left Closet',
        area: 'forward-lav',
        items: [
            'Nespresso Machine', 'Nespresso Pods', 'Milk Frother', 'Electric Tea Kettle', 'Coffee Carafe', 'Oat Milk',
            'Paper Hand Towels', 'Crew Trays', 'Cleaning Tub Kit', 'Wine Away', 'Hand Sanitizer', 'Disinfecting Wipes', 'Dust Cleaning Gel', 'Tide Rescue Spray', 'Alcohol Spray', 'Microfiber Cloths'
        ]
    },
    {
        category: 'Forward Right Closet',
        area: 'forward-lav',
        items: ['Celeste Wipes', 'Yellow Safety Vests', 'Ear Plugs', 'Headsets']
    },
    {
        category: 'Lower Cabinet',
        area: 'forward-lav',
        items: ['8 Liter Water Bottles']
    },
    {
        category: 'Forward Lav',
        area: 'forward-lav',
        items: [
            'Toothbrush', 'Toothpaste', 'Scope Mouthwash', 'Flossers', 'Cough Drops', 'Imodium', 'Visine Eye Drops', 'Band-Aids', 'ChapStick', 'Dramamine', 'Alka Seltzer', 'Pepto Bismol', 'Advil', 'Tylenol', 'Benadryl', 'DayQuil', 'NyQuil', 'Tide To Go Wipes', 'Tide Pen', 'Hand Lotion',
            'Puffs Box', 'Hand Towels on Rack (Aft)', 'Spare TP (Aft)', 'Toilet Paper', 'Safeguard Hand Soap', 'Pads & Tampons', 'Static Guard', 'Hot Towels', 'Lint Roller', 'Febreze', 'Extra Safeguard Hand Soap', 'Small Trash Bags (roll)'
        ]
    },
    {
        category: 'Galley Left',
        area: 'galley',
        items: [
            'Green Tea', 'Mint Tea', 'English Breakfast Tea', 'Earl Grey Tea', 'Chamomile Tea', 'Stir Sticks',
            'White Sugar', 'Sugar In The Raw', 'Sweet N Low', 'Stevia', 'Splenda',
            'Espresso Cups', 'Disposable Hot Cups', 'Hot Cup Lids', 'Frosted Disposable Cups',
            'Mandolin', 'Cooking Knives', 'Cooking Spatulas', 'Cooking Tongs', 'Meat Thermometer', 'Kitchen Shears', 'Wine Opener', 'Wine Key', 'Wine Stoppers', 'Stop Drop Wine Pourers',
            'Sponges', 'Dish Gloves', 'Dish Soap',
            'Liquid Measuring Cup', 'Whisk', 'Vegetable Peeler', 'Can Opener', 'Cheese Knives', 'Tiny Tongs', 'Demitasse Spoons', 'Serving Tongs (large)', 'Serving Spoons', 'Serving Fork', 'Dinner Knives', 'Steak Knives', 'Teaspoons', 'Salad Forks', 'Dinner Forks', 'Soup Spoons',
            'Silver Ramekins', 'Pitchers', 'Dinner Plates', 'Salad Plates', 'Bread Plates', 'Bowls',
            'Dish Tub', 'Placemats', 'Black Trash Bags', 'Orange Trash Bags'
        ]
    },
    {
        category: 'Galley Right',
        area: 'galley',
        items: [
            'Baking Sheets', 'Collapsible Dish Tub',
            'Salt & Pepper Grinders', 'Red Chili Flakes', 'Honey', 'Soy Sauce', 'Olive Oil', 'Balsamic Vinegar', 'Tabasco', 'Pens', 'Sharpie', 'Post-It Notes',
            'Regular Coffee (bags)', 'Decaf Via', 'Coffee Filters', 'Coffee Scoop',
            'Snacks', 'Grape Propel', 'Small Water Bottles',
            'Large Bamboo Plates', 'Small Bamboo Plates', 'Bamboo Bowls', 'Cocktail Napkins', 'Linen Dinner Napkins', 'Perrier', 'Coke', 'Coke Zero', 'Diet Coke', 'Sprite',
            'Gallon Slider Bags', 'Quart Slider Bags', 'Jumbo Slider Bags', 'Hot Pads', 'Mini Silicone Oven Mitts', 'Oven Mitts', 'Microwave Cooking Bags', 'Food Gloves', 'Cutting Boards', 'Silver Trays', 'Parchment Paper', 'Press N Seal', 'Non-Stick Aluminum Foil', 'My Drap Roll Napkins', 'Paper Dinner Napkins'
        ]
    },
    {
        category: 'Aft Lav',
        area: 'aft-lav',
        items: [
            'Toothbrush (Aft)', 'Toothpaste (Aft)', 'Scope (Aft)', 'Shaving Cream', 'Razors', 'Mini Toothbrushes', 'Tide Wipes (Aft)', 'Safeguard Hand Soap (Aft)', 'Puffs Box (Full Size)', 'Washcloths', 'Hand Towels (Aft)', 'Band Aids & Ointment', 'Sinex Nasal Spray', 'Visine (Aft)', 'ZzzQuil', 'NyQuil (Aft)', 'DayQuil (Aft)', 'Dramamine (Aft)', 'Tums', 'Pepto Bismol (Aft)', 'Tylenol (Aft)', 'Advil (Aft)', 'Benadryl (Aft)', 'Alka Seltzer (Aft)', 'Aspirin', 'Olay Face Cream', 'Sewing Kit', 'Emery Boards', 'Olay Melts', 'Q-Tips', 'Comb', 'Lint Roller (Aft)', 'Febreze (Aft)', 'Flossers (Aft)', 'Cough Drops (Aft)', 'ChapStick (Aft)', 'First Aid Beauty Lip Balm', 'Hand Lotion (Aft)', 'Celeste Wipes (Aft)', 'Eye Masks', 'Olay Makeup Remover Wipes', 'Tide Pen (Aft)', 'Slippers', 'Downy Wrinkle Releaser', 'Swiffer Wet Pads', 'Vacuum & Attachments', 'Dry Cleaning Bag', 'Trash Bags (Aft)', 'Rolls of Paper Towel', 'Disposable Cups & Lids', 'Dinner Napkins (Aft)', 'Cocktail Napkins (Aft)', 'Box Disposable Gloves', 'Dawn Wipes', 'Hand Sanitizer (Aft)', 'Bamboo Plates & Bowls (Aft)', 'Blankets', 'Swiffer', 'Swiffer Dry Pads', 'Seatbelt Extenders', 'Manuals', 'Yellow Safety Vests (Aft)', 'Booties', 'Luggage Tags', 'Extra Leather Wipes', 'Extra Cleaning Wipes', 'Extra Food Gloves', '20 Hand Towels (Aft Store)', 'Vacuum Head & Attachments', 'Trays (Aft)', 'Static Guard (Aft)', 'Spare TP (Aft)', 'Toilet Paper (Aft)'
        ]
    },
    {
        category: 'Credenza',
        area: 'credenza',
        items: [
            'Playing Cards', 'Batteries', 'Office Supplies', 'Printer Paper', 'Nonslip Mats', 'AV Cord Container', '3D Wine Holders', 'White Wine', 'Red Wine', 'Liquor Seals', 'USB-A Lightning Charger', 'USB-A USB-C Charger', 'Bose Headphones', 'Motion Sickness Bags', 'Safety Briefing Cards'
        ]
    },
    {
        category: 'Chiller',
        area: 'chiller',
        items: [
            'Waters (Chiller)', 'Grape Propel (Chiller)', 'Chardonnay', 'Sauvignon Blanc', 'Pinot Noir', 'Cabernet Sauvignon', 'Case Small Waters (Baggage)', 'Case Perrier (Baggage)', 'Vacuum Base', '8 Liter Water Bottles'
        ]
    }
];

// Helper to normalize strings for comparison
const normalize = (s) => s.toLowerCase().trim();

let newArrayParts = [];
let matchedSet = new Set();

for (const group of wordDocOrder) {
    newArrayParts.push(`\n    // ─── ${group.category.toUpperCase()} ───────────────────────────────────────────────────────────`);

    for (const itemName of group.items) {
        const key = normalize(itemName);

        // Find the item
        let matchKey = key;
        if (!itemsMap.has(matchKey)) {
            for (let k of itemsMap.keys()) {
                if (k.includes(key) || key.includes(k)) {
                    matchKey = k;
                    break;
                }
            }
        }

        if (itemsMap.has(matchKey)) {
            let itemStr = itemsMap.get(matchKey);

            // The function signature is: item(itemName, category, area, location, g650qty, g500qty, priority, alternateNames, notes)
            // We want to replace the SECOND argument (category) with group.category
            // And replace the THIRD argument (area) with group.area

            const parts = itemStr.split(',');
            if (parts.length >= 4) {
                // Find the second string literal (category)
                let catIndex = itemsMap.get(matchKey).indexOf(',') + 1;
                // This is tricky because strings might contain commas.
                // Let's use a regex that matches the first 4 arguments reliably.
                itemStr = itemStr.replace(/(item\(\s*'[^']+'\s*,\s*)'[^']+'(\s*,\s*)'[^']+'/, `$1'${group.category}'$2'${group.area}'`);
            }

            newArrayParts.push(itemStr);
            matchedSet.add(matchKey);
        } else {
            console.log("NOT FOUND:", itemName);
        }
    }
}

newArrayParts.push(`\n    // ─── UNCATEGORIZED ───────────────────────────────────────────────────────────`);
// Add any items we missed
for (const [key, itemStr] of itemsMap.entries()) {
    if (!matchedSet.has(key)) {
        // Change area to 'baggage' or leave it to put it somewhere
        newArrayParts.push(itemStr);
    }
}

const newArrayStr = `export const DEFAULT_INVENTORY: InventoryItem[] = [\n${newArrayParts.join('\n')}\n];`;

const newContent = currentContent.replace(/export const DEFAULT_INVENTORY: InventoryItem\[\] = \[[\s\S]*?\];/, newArrayStr);

fs.writeFileSync('inventoryData.ts', newContent);
console.log('Saved inventoryData.ts securely.');
