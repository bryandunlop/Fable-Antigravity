// Canonical passenger model shared by the Passenger Database and the flight-attendant
// flight view. Previously each inflight screen redefined its own Passenger shape and
// mock array; this is the single source of truth.

export type AllergySeverity = 'Critical' | 'Moderate' | 'Mild';

export interface PassengerAllergy {
  allergen: string;
  severity: AllergySeverity;
  reaction?: string;
  medication?: string;
}

/** A photo attached to a passenger card (e.g. how they like food plated, bed setup).
 * Stored as a base64 data URL so it works with no backend, matching the demo. */
export interface PassengerPhoto {
  id: string;
  url: string; // data: URL
  caption?: string;
  addedAtUtc: string;
}

export interface Passenger {
  id: string;
  name: string;
  info: {
    email?: string;
    phone?: string;
    address?: string;
  };
  role: string;
  allergies: PassengerAllergy[];
  /** myairops' Booking API carries an allergy FLAG on the passenger, not a structured
   *  allergen list. True means the booking said "has allergies" without giving us
   *  anything a galley can act on. Distinct from `allergies` having entries: most
   *  passengers a year arrive this way, with a flag and nothing else. */
  allergyFlagged?: boolean;
  /** When someone last asked this passenger about allergies and recorded the answer.
   *  ABSENT MEANS NOBODY ASKED, which is not the same as "no allergies" — an empty
   *  `allergies` array cannot tell those two apart on its own, and rendering the
   *  empty case as safe is how a screen lies. Only a dated confirmation earns green. */
  dietaryConfirmedAtUtc?: string;
  birthday: string;
  beverage: string[];
  food: string[];
  /** Foods/things the passenger dislikes (a preference, not a medical allergy). */
  dislikes?: string[];
  passengerComfort: {
    temperature?: string;
    seating?: string;
    tvPreference?: string;
    lighting?: string;
    specialRequests?: string;
  };
  additionalNotes: string;
  flightAttendantNotes?: string;
  photos?: PassengerPhoto[];
}

export const SEED_PASSENGERS: Passenger[] = [
  {
    id: 'PAX001',
    name: 'Robert Johnson',
    info: { email: 'robert.johnson@email.com', phone: '+1 (555) 123-4567', address: '123 Park Avenue, New York, NY 10021' },
    role: 'Board Chairman',
    allergies: [
      { allergen: 'Shellfish', severity: 'Critical', reaction: 'Anaphylaxis', medication: 'EpiPen - seat pocket' },
      { allergen: 'Tree nuts', severity: 'Moderate', reaction: 'Hives, swelling', medication: 'Benadryl' },
    ],
    birthday: '1975-03-15',
    beverage: ['Dom Pérignon', 'Macallan 18', 'Perrier', 'Espresso'],
    food: ['Wagyu Beef', 'Lobster Thermidor', 'Truffle Pasta', 'Aged Ribeye', 'French cuisine', 'Italian cuisine'],
    dislikes: ['Cilantro', 'Well-done steak', 'Sparkling water'],
    passengerComfort: {
      temperature: '72°F', seating: 'Forward-facing window seat with extra legroom',
      tvPreference: 'Action movies', lighting: 'Dimmed lighting preferred',
      specialRequests: 'Fresh orchids for cabin, Evian water only, prefers to board last for privacy',
    },
    additionalNotes: 'High-profile business executive. Values privacy and premium service. Always travels with personal security. Enjoys discussing business and golf. Prefers traditional preparations and formal service style.',
    flightAttendantNotes: 'Prefers to be addressed as "Mr. Chairman". Very particular about napkin folding.',
  },
  {
    id: 'PAX002',
    name: 'Sarah Chen',
    info: { email: 'sarah.chen@techcorp.com', phone: '+1 (555) 987-6543' },
    role: 'CEO',
    allergies: [],
    birthday: '1985-08-22',
    beverage: ['Green tea', 'Kombucha', 'Sparkling water', 'Oat milk latte'],
    food: ['Vegetarian meals', 'Quinoa bowls', 'Mediterranean salads', 'Fresh fruit', 'Japanese cuisine', 'Plant-based options'],
    dislikes: ['Red meat', 'Heavy sauces'],
    passengerComfort: {
      temperature: '70°F', seating: 'Aisle seat near power outlet',
      tvPreference: 'Documentaries', lighting: 'Bright lighting for work',
      specialRequests: 'Extra power outlets, noise-canceling headphones, minimal conversation during flight',
    },
    additionalNotes: 'Tech executive who frequently works during flights. Very punctual and prefers quiet environment. Focus on healthy, fresh food options. Environmentally conscious - prefers eco-friendly options when available.',
  },
  {
    id: 'PAX003',
    name: 'Michael Rodriguez',
    info: { email: 'mrodriguez@email.com', phone: '+1 (555) 456-7890' },
    role: 'Authorized User',
    allergies: [
      { allergen: 'Peanuts', severity: 'Critical', reaction: 'Severe breathing difficulty', medication: 'EpiPen required immediately' },
    ],
    birthday: '1990-12-03',
    beverage: ['Coffee (black)', 'Whiskey neat', 'Craft beer', 'Energy drinks'],
    food: ['Grilled meats', 'BBQ', 'Mexican cuisine', 'Cheese platters', 'Keto-friendly options', 'High-protein meals'],
    dislikes: ['Seafood', 'Tofu'],
    passengerComfort: {
      temperature: '68°F', seating: 'Window seat', tvPreference: 'Comedy shows', lighting: 'Standard lighting',
      specialRequests: 'Tour of cockpit if possible, interested in flight operations',
    },
    additionalNotes: 'Young entrepreneur, first-time private jet passenger. Very interested in the aircraft and flight operations. Strict keto diet adherence. Enjoys bold flavors and spicy food. Appreciates quality meat preparations.',
  },
  {
    id: 'PAX004',
    name: 'Emily Watson',
    info: { email: 'emily.watson@email.com', phone: '+1 (555) 234-5678' },
    role: 'Standard',
    allergies: [
      { allergen: 'Bee stings', severity: 'Moderate', reaction: 'Localized swelling', medication: 'Antihistamine' },
      { allergen: 'Latex', severity: 'Mild', reaction: 'Skin irritation', medication: 'Avoid latex gloves' },
    ],
    birthday: '1978-06-10',
    beverage: ['Oat milk latte', 'Sparkling water', 'Champagne', 'Herbal tea'],
    food: ['Seafood', 'Nordic cuisine', 'Dairy-free options', 'Modern European', 'Artisanal breads', 'Root vegetables'],
    dislikes: ['Very spicy food', 'Blue cheese'],
    passengerComfort: {
      temperature: '71°F', seating: 'Aisle seat', tvPreference: 'Drama series', lighting: 'Soft lighting',
      specialRequests: 'No latex materials anywhere, all dairy-free meal options, minimal conversation',
    },
    additionalNotes: 'Frequent business traveler with lactose intolerance. Prefers minimal conversation during flights. Appreciates innovative and artistic food presentation. Ensure all items are completely dairy-free.',
  },
  {
    id: 'PAX005',
    name: 'Daniel Whitfield',
    info: { email: 'd.whitfield@email.com', phone: '+1 (555) 345-6789' },
    role: 'Guest',
    allergies: [
      { allergen: 'Gluten', severity: 'Moderate', reaction: 'Digestive distress', medication: 'None - avoid gluten' },
    ],
    birthday: '1995-07-09',
    beverage: ['Cold brew', 'IPA', 'Still water'],
    food: ['Gluten-free options', 'Grilled chicken', 'Sushi', 'Fresh salads'],
    dislikes: ['Mushrooms', 'Olives'],
    passengerComfort: {
      temperature: '70°F', seating: 'Window seat', tvPreference: 'Sports', lighting: 'Standard lighting',
      specialRequests: 'Gluten-free meal, prefers window shades open',
    },
    additionalNotes: 'Traveling as a guest of the Chairman. Strict gluten-free diet. Enjoys sports and casual conversation.',
  },
  {
    id: 'PAX006',
    name: 'Patricia Alvarez',
    info: { email: 'p.alvarez@email.com', phone: '+1 (555) 456-1230' },
    role: 'Board Member',
    allergies: [],
    birthday: '1968-11-28',
    beverage: ['Cabernet Sauvignon', 'Sparkling water', 'Chamomile tea'],
    food: ['Mediterranean cuisine', 'Grilled fish', 'Fresh vegetables', 'Dark chocolate'],
    dislikes: ['Overly sweet desserts', 'Carbonated drinks'],
    passengerComfort: {
      temperature: '73°F', seating: 'Forward-facing aisle seat', tvPreference: 'News', lighting: 'Warm lighting',
      specialRequests: 'Prefers a blanket at cruise altitude, sparkling water on arrival',
    },
    additionalNotes: 'Long-serving board member. Warm and gracious; enjoys light conversation and Mediterranean fare.',
  },
];
