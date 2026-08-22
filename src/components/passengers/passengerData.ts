// Canonical passenger model shared by the Passenger Database and the flight-attendant
// flight view. Previously each inflight screen redefined its own Passenger shape and
// mock array; this is the single source of truth.

export type AllergySeverity = 'Critical' | 'Moderate' | 'Mild';

export interface PassengerAllergy {
  allergen: string;
  /** OPTIONAL because nothing upstream records it. myairops gives free text; a mapping
   *  made from that text has no severity, and inventing one would be worse than the
   *  absence. Legacy seed rows keep theirs; the screens no longer rank by it. */
  severity?: AllergySeverity;
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

/** Cabin settings a crew member records for a passenger. Named rather than inline so
 * the trip-side editor can type a draft of it. */
export interface PassengerComfort {
  temperature?: string;
  seating?: string;
  tvPreference?: string;
  lighting?: string;
  specialRequests?: string;
}

/** What myairops last told us, verbatim.
 *
 * Confirmed against the CRM OpenAPI schema (2026-08-22): a passenger carries
 * `hasAllergy: boolean` plus `PassengerNoteModel { note, noteType }`, where
 * `PassengerNoteType` is one of `DietaryAllergens | GroundTransport | Preferences`.
 * The dietary detail is therefore FREE TEXT written by whoever took the booking — not
 * a structured allergen list — so a human has to read it and map it.
 *
 * Never edited in myGFO: it is somebody else's record, kept so we can tell when it
 * changes underneath a mapping. myGFO is the source of truth for the mapping itself
 * (Bryan, 2026-08-22), and eventually for the profile outright. */
export interface PassengerSourceNote {
  /** myairops PassengerNote of type DietaryAllergens. */
  dietary?: string;
  /** myairops PassengerNote of type Preferences. Deliberately NOT auto-imported —
   *  a change is flagged and a human re-enters it. */
  preferences?: string;
  seenAtUtc: string;
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
  /** Last seen myairops text. See PassengerSourceNote. */
  sourceNote?: PassengerSourceNote;
  /** The exact DietaryAllergens text that `allergies` were mapped from. When this stops
   *  matching `sourceNote.dietary`, the mapping is stale and the guest needs re-mapping:
   *  a frozen picture that has diverged from reality must say so, never quietly stand. */
  mappedFromNote?: string;
  mappedAtUtc?: string;
  birthday: string;
  beverage: string[];
  food: string[];
  /** Foods/things the passenger dislikes (a preference, not a medical allergy). */
  dislikes?: string[];
  passengerComfort: PassengerComfort;
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
    // Mapped in July, and the booking desk has since added dairy. The mapping is not
    // merely incomplete, it is now WRONG — so the screen must stop presenting it as
    // settled rather than quietly serving a stale list.
    sourceNote: {
      dietary: 'Shellfish (anaphylactic, EpiPen) and tree nuts. Now also dairy-free.',
      seenAtUtc: '2026-08-21T00:00:00Z',
    },
    mappedFromNote: 'Shellfish (anaphylactic, EpiPen) and tree nuts.',
    mappedAtUtc: '2026-07-14T00:00:00Z',
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
    dietaryConfirmedAtUtc: '2026-08-04T00:00:00Z',
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
    dietaryConfirmedAtUtc: '2026-08-12T00:00:00Z',
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
  {
    // A booking stub, not a profile. This is the shape roughly 950 of the ~1,000
    // passengers a year arrive in: a name, a flag, and nothing a galley can act on.
    id: 'PAX007',
    name: 'Helen Marchetti',
    info: {},
    role: 'Guest',
    allergies: [],
    allergyFlagged: true,
    // Unmapped prose, exactly as a booking agent would type it: an allergen the
    // galley must act on and a preference, run together in one sentence.
    sourceNote: {
      dietary: 'Severe shellfish allergy — carries an EpiPen. Also no coriander.',
      seenAtUtc: '2026-08-19T00:00:00Z',
    },
    birthday: '',
    beverage: [],
    food: [],
    passengerComfort: {},
    additionalNotes: '',
  },
  {
    // The same stub without the flag — the neutral state. No colour, because nobody
    // has asked; not green, because we do not know.
    id: 'PAX008',
    name: 'Aditya Rao',
    info: {},
    role: 'Guest',
    allergies: [],
    birthday: '',
    beverage: [],
    food: [],
    passengerComfort: {},
    additionalNotes: '',
  },
];
