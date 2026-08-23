// Content model for the myGFO role training guides.
// Every screen description here was written from the running app (mock data build),
// not from source reading — see the annotated screenshots for the matching numbers.

export const SCOPE_NOTE = [
  'This guide covers the day-to-day myGFO screens for this role. Three modules are documented separately and are deliberately not covered here: the Tech Log, Irregularity Reports (FIR), and the Scheduling Command Center. The Safety module is also out of scope — it is not in service yet.',
  'You will still see those items in your sidebar. Ignore them for the purposes of this guide.',
];

export const DEMO_NOTE =
  'Screenshots in this guide come from the myGFO prototype running on demo data. Tail numbers, names, dates and counts are illustrative — the screen layout, buttons and workflow are what matter.';

const SIGN_IN = {
  heading: 'Signing in',
  body: [
    'myGFO opens on a demo password screen. Enter the password your administrator gave you and choose Continue.',
    'On the next screen, open Select Your Role, choose your role, and choose Access Dashboard. Your role decides which pages appear in the left sidebar and where you land after sign-in — two people can be looking at the same system and see a different set of pages.',
    'If you hold more than one role, sign in under the one matching the work you are about to do. You can sign out and back in under the other role at any time using Logout at the top right.',
  ],
};

const SHARED_SECTIONS = (roleName) => [
  {
    heading: 'The Dashboard',
    body: [
      'The Dashboard is the shared home page. Every role sees the same building blocks: current weather and a seven-day planning outlook, the fleet with its serviceability, the day’s flights, national airspace impacts, and who is on shift.',
      'Treat it as a situational-awareness page, not a working page. Nothing on it is signed or filed; it tells you what is going on so you know where to go next.',
    ],
    shot: {
      id: 'shared-dashboard',
      caption: 'The Dashboard, shown for a Pilot. The panels are the same for every role.',
      calls: [
        [1, 'Weather for the home base and the stations in play, plus a seven-day outlook. The outlook is explicitly marked as a planning aid — it is not for flight planning.'],
        [2, 'The fleet, one line per tail, with a coloured serviceability dot and current location. The summary line underneath counts what is dispatchable, in flight and grounded.'],
        [3, 'Flights for today with scheduled time and live ETA. Where the ETA has moved away from schedule it is highlighted.'],
        [4, 'NAS impact — FAA ground stops, ground delays and flow programmes, with a count of how many affect your operation.'],
        [5, 'Duty Roster — who is on shift now, their function and where they are sitting.'],
      ],
    },
  },
  {
    heading: 'Document Center',
    body: [
      'The Document Center holds controlled publications and tracks who has read them. It is the same page for every role; what differs is which documents are assigned to you.',
      'My required reads is your personal queue and is the tab to work from. Each row shows the revision, the effective date, a plain-language "What changed" summary, and the acknowledgement the document demands — Read & sign, Read & initial, or Received copy. Rows that have passed their due date are marked Overdue.',
      'Open a document, read it, and complete the acknowledgement at the end. Your outstanding count at the top of the page drops as you clear the queue.',
    ],
    shot: {
      id: 'shared-documents',
      caption: 'Document Center — the My required reads queue.',
      calls: [
        [1, 'My outstanding reads — how many acknowledgements you personally owe.'],
        [2, 'Tab strip. My required reads is your queue; Library is the full controlled-document set.'],
        [3, 'The acknowledgement type this document demands. Read & sign is the strongest; Read & initial and Received copy also appear.'],
        [4, 'Overdue — the acknowledgement deadline has passed. Clear these first.'],
        [5, 'Tribal knowledge and Cabin knowledge hold non-controlled operational know-how, kept separate from the controlled library on purpose.'],
      ],
    },
  },
  {
    heading: 'Approvals',
    body: [
      `Approvals is a single inbox with two halves: requests waiting on your decision, and requests you have filed yourself. The page states which role you are acting as, because your approval authority follows your role, not your name.`,
      'Multi-step requests show their position in the chain (for example Step 2 of 2) along with what earlier approvers decided and why. Read the earlier decision before you act on yours.',
      'You can Approve, Deny, or Add a comment. Use View request details to see the full submission before deciding.',
    ],
    shot: {
      id: 'shared-approvals',
      caption: `Approvals, shown while acting as ${roleName}.`,
      calls: [
        [1, 'Awaiting your approval, with a count. This is the half you owe action on.'],
        [2, 'Where this request sits in its approval chain.'],
        [3, 'Approve — records your decision against your role.'],
        [4, 'Deny — also records against your role. Add a comment first if the reason is not obvious.'],
        [5, 'Requested by you — what you have filed, and where each request currently sits.'],
      ],
    },
  },
  {
    heading: 'Vacation and time off',
    body: [
      'Vacation Request handles vacation, payback stop days (PBST), off days and medical leave through one form.',
      'The page has four tabs: Submit Request, My Requests, Master Calendar and PBST Balance. Check PBST Balance before you file — awarded stop days carry an expiry date, and the balance panel shows how many days are left on each.',
      'On Submit Request choose the request type, set the start and end dates, and add a reason. If you want to spend awarded PBST days against the request, tick them under Apply Available PBST Days before submitting.',
    ],
    shot: {
      id: 'shared-vacation',
      caption: 'Vacation and time-off request form.',
      calls: [
        [1, 'Tab strip — Submit Request, My Requests, Master Calendar, PBST Balance.'],
        [2, 'PBST Balance shows each awarded stop day, when it was awarded and when it expires.'],
        [3, 'Request Type drives the rest of the form. Set it first.'],
        [4, 'Optionally apply awarded PBST days to this request. Expiry dates are shown so you can spend the oldest first.'],
      ],
    },
  },
];

export const DOCS = [
  // ══════════════════════════════════ PILOT ══════════════════════════════════
  {
    key: 'pilot', file: '01-Pilot', kind: 'base',
    title: 'Pilot', roleLabel: 'Pilot',
    purpose: 'Everything a line pilot does in myGFO: reading your trips, working preflight, filing risk assessments, requesting fuel, keeping your currency visible, and clearing your required reading.',
    audience: [
      'Line pilots flying the G650ER, G500 and G800 fleet.',
      'Also the base document for the Chief Pilot — read this first, then the Chief Pilot supplement.',
    ],
    frontDoor: 'Flight Hub (Pilot Workspace)',
    frontDoorNote: 'After sign-in you land on the Flight Hub. It is the page to start every day on.',
    nav: [
      ['Flight Hub', 'Flight Ops', 'Your trips, leg by leg, with what each one still needs'],
      ['Preflight', 'Flight Ops', 'Trip-by-trip preflight progress and FRAT completion'],
      ['Standalone FRAT', 'Flight Ops', 'File a flight risk assessment outside a trip'],
      ['FRAT Submissions', 'Flight Ops', 'Your own FRAT history: drafts, pending, approved, rejected'],
      ['Airports', 'Flight Ops', 'Airport directory, company pages and operational flags'],
      ['Fuel Requests', 'Flight Ops', 'Submit and track fuel load requests'],
      ['Dashboard', 'Home', 'Weather, fleet, today’s flights, airspace, duty roster'],
      ['My Tasks', 'Home', 'Action items assigned to you and your own tasks'],
      ['Approvals', 'Home', 'Requests waiting on you, and ones you filed'],
      ['Pilot Currency', 'Home', 'Your currency against 14 CFR Part 91 minimums'],
      ['Schedule Calendar', 'Scheduling', 'Month view of fleet and personal assignments'],
      ['Vacation Request', 'Scheduling', 'Vacation, PBST, off days, medical leave'],
      ['Flight Calendar', 'Inflight', 'Your assignments with passenger manifests'],
      ['Aircraft Cleaning', 'Maintenance', 'Cleaning workflow status by tail'],
      ['Document Center', 'Documents', 'Controlled publications and your required reads'],
    ],
    sections: [
      SIGN_IN,
      {
        heading: 'Flight Hub — your day starts here',
        body: [
          'Flight Hub answers one question: what do my trips still need from me? Trips are grouped by urgency — In Progress, This Week, Next 2 Weeks — and each card carries a row of readiness chips.',
          'The chips are the point of the page. Each names a prerequisite (FRAT, Fuel, aircraft serviceability, Sched) and shows whether it is satisfied. A chip with a count beside it, such as FRAT · 2, means that many items are still outstanding on that trip. A red Grounded chip means the assigned tail is not currently dispatchable.',
          'Trips needing work carry a NEEDS PREP badge. The filter buttons across the top narrow the list to Domestic, Int’l or DASSP trips, and Needs prep only hides everything already squared away.',
        ],
        shot: {
          id: 'pilot-flight-hub',
          caption: 'Flight Hub, filtered to show all trips.',
          calls: [
            [1, 'Trip-type filters — Domestic, Int’l, DASSP. International and DASSP trips carry extra prerequisites.'],
            [2, 'Needs prep only — the fastest way to see just the trips still owing you work.'],
            [3, 'Urgency grouping. In Progress is live now; This Week and Next 2 Weeks follow.'],
            [4, 'NEEDS PREP — this trip has outstanding prerequisites. The chips underneath say which.'],
            [5, 'Flight Hub in the sidebar, highlighted as the current page.'],
          ],
        },
      },
      {
        heading: 'Working preflight',
        body: [
          'Preflight is the working view behind those Flight Hub chips. It lists your active trips with a progress bar reading "Preflight Progress: n/m legs completed", so you can see at a glance how far through a multi-leg trip you are.',
          'The counters across the top summarise your whole workload: Active Trips, Pending FRATs, Completed and Total Legs.',
          'Each trip row carries three actions. Request Fuel opens a fuel load request pre-filled for that trip. Export PDF produces a preflight package. ForeFlight pushes the trip to ForeFlight.',
          'Sync MyAirOps at the top right pulls the current trip and crew assignments from myairops. myGFO reads from myairops and never writes back to it, so a correction made here does not reach myairops — it has to be made there.',
        ],
        shot: {
          id: 'pilot-preflight',
          caption: 'Preflight Workflow, listing active trips and their completion.',
          calls: [
            [1, 'Sync MyAirOps — refreshes trips and crew from myairops. Pull only; nothing is written back.'],
            [2, 'Workload counters across all your trips.'],
            [3, 'Per-trip progress: how many legs are preflighted out of the total.'],
            [4, 'Request Fuel — opens a fuel load request already tied to this trip.'],
            [5, 'ForeFlight — pushes the trip across to ForeFlight.'],
          ],
        },
      },
      {
        heading: 'Filing a FRAT',
        body: [
          'The Flight Risk Assessment Tool scores a flight’s risk from a set of weighted factors. Most FRATs are filed from inside a trip; Standalone FRAT files one against a flight that is not on a trip yet.',
          'The score band sits at the top of the form and updates live as you answer. The bands are printed on the form: 0–10 low, 11–19 medium, 20 requires mitigation, and 25 is a no-go. Watch the running total as you work rather than waiting until the end.',
          'Flight Information auto-populates from myairops once you pick a flight. Every field stays editable — if the pulled data is wrong, correct it here, and remember the correction does not flow back to myairops.',
          'The remaining groups (Pilot Qualifications, Flight Crew Duty Day, Departure Airport, Destination Airport, Trip Details, Weather, Other) each contribute points.',
        ],
        shot: {
          id: 'pilot-frat-form',
          caption: 'Standalone FRAT — the top of the form, with the live score band.',
          calls: [
            [1, 'Live risk score and level. It recalculates as you answer.'],
            [2, 'The score bands, printed on the form. 20 requires mitigation; 25 is a no-go.'],
            [3, 'Flight Information — auto-populated from myairops, and editable.'],
          ],
        },
      },
      {
        heading: null,
        body: [
          'At the foot of the form, Save Draft parks an incomplete assessment in your FRAT Submissions list; Submit FRAT files it for review. Add anything the scoring factors do not capture under Additional Notes before you submit.',
        ],
        shot: {
          id: 'pilot-frat-form-b',
          caption: 'The foot of the FRAT form.',
          calls: [
            [4, 'Save Draft — keeps an incomplete FRAT in your submissions list to finish later.'],
            [5, 'Submit FRAT — files the assessment for review.'],
          ],
        },
      },
      {
        heading: 'Tracking your FRAT submissions',
        body: [
          'FRAT Submissions is your own history, split by state: Drafts, Pending Review, Approved and Rejected. A rejected FRAT needs revision and resubmission — it does not clear itself.',
          'Filters for status and time period sit above the list, and the list can be shown as a list or as cards.',
        ],
      },
      {
        heading: 'Requesting fuel',
        body: [
          'Fuel Requests has two tabs: Upcoming Flights, which is where you raise a request, and My Requests, which tracks the ones you have already filed.',
          'Choose the flight from Select Flight and the form pulls in its details, then specify the fuel requirement. Raising the request from the Preflight page instead pre-selects the flight for you.',
        ],
        shot: {
          id: 'pilot-fuel',
          caption: 'Fuel Load Requests — raising a new request.',
          calls: [
            [1, 'Upcoming Flights — the tab to raise a new request from.'],
            [2, 'My Requests — the ones you have already filed, with their status.'],
            [3, 'Select Flight — pick the flight and the request is tied to it.'],
          ],
        },
      },
      {
        heading: 'Your currency',
        body: [
          'The Currency Dashboard tracks crew against 14 CFR Part 91 minimums. It has a tab for Pilots and one for Flight Attendants, and the counters at the top right summarise the population as Current, Due Soon or Expired.',
          'Currency is tracked per aircraft type, so one pilot can be current on one type and expired on another — the row expands to a line per type. Each column shows achieved against required with the look-back window underneath: General 90d, Night 90d/Alt, Inst. Appr. 6mo, Holds 6mo, and the 61.58 proficiency check at 12mo. An ALT badge marks the alternate night-currency provision.',
          'The regulatory reference is printed at the foot of the page so you can check the rule behind each column without leaving it.',
          'Data auto-syncs from myairops; Sync forces a refresh. If a number here looks wrong, the fix belongs in myairops.',
        ],
        shot: {
          id: 'pilot-currency',
          caption: 'Currency Dashboard, showing per-type currency for one pilot.',
          calls: [
            [1, 'Pilots / Flight Attendants tabs.'],
            [2, 'Population summary — Current, Due Soon, Expired.'],
            [3, 'Per-type status. Expired on one type does not mean expired on another.'],
            [4, 'The Part 91 rule behind each column, printed on the page.'],
            [5, 'Sync — forces a refresh from myairops.'],
          ],
        },
      },
      ...SHARED_SECTIONS('Pilot'),
      {
        heading: 'Other pages in your sidebar',
        body: [
          'Schedule Calendar gives a month view with Full Fleet and My Schedule toggles, plus monthly totals for flights, hours, maintenance events and training.',
          'Flight Calendar lists your assignments with passenger manifests, flagging critical allergies and passenger birthdays on each leg.',
          'Airports is the airport directory — every US airport with a hard-surfaced runway of 5,000 ft or more, drawn from FAA NASR data, with company pages and operational flags layered on top.',
          'Aircraft Cleaning shows cleaning workflow progress by tail, with required-item counts and who started and completed each workflow.',
          'My Tasks carries action items assigned to you alongside your own tasks, each with section-by-section progress.',
        ],
      },
    ],
  },

  // ═══════════════════════════════ CHIEF PILOT ═══════════════════════════════
  {
    key: 'chief-pilot', file: '02-Chief-Pilot', kind: 'supplement', base: 'Pilot',
    title: 'Chief Pilot', roleLabel: 'Chief Pilot',
    purpose: 'The oversight work that sits on top of the Pilot role: approving airport company pages, maintaining the rules that flag airports, processing airport evaluation requests, and acting as an approver.',
    audience: [
      'Chief Pilot and Assistant Chief Pilot.',
      'Read the Pilot guide first. Everything in it applies to you; this document covers only what is additional.',
    ],
    frontDoor: 'Flight Hub (Pilot Workspace)',
    frontDoorNote: 'You land on the Flight Hub, exactly as a line pilot does. Your additional work sits behind the Airports tab strip and the Approvals page.',
    nav: [
      ['Airports · Needs review', 'Flight Ops', 'Company pages that are overdue, never reviewed, or awaiting you'],
      ['Airports · Proposals', 'Flight Ops', 'Proposed page edits awaiting your decision, and approved pages ready to publish'],
      ['Airports · Rules & flags', 'Flight Ops', 'The rules that flag airports from FAA reference data'],
      ['Airport Evaluation Officer', 'Admin', 'Incoming requests for new airport evaluations and corrections'],
      ['Approvals', 'Home', 'Requests routed to you as Chief Pilot'],
    ],
    sections: [
      {
        heading: 'What is different about your sign-in',
        body: [
          'Sign in by choosing Chief Pilot in the role picker. Your sidebar looks like a pilot’s, because it is — the extra Chief Pilot work is reached through the tab strip on the Airports page rather than through separate sidebar rows.',
          'Open Airports from the Flight Ops group and you get four tabs: Directory, Needs review, Proposals, and Rules & flags. The last three are yours.',
        ],
      },
      {
        heading: 'The airport worklist',
        body: [
          'Needs review is the queue of company pages wanting attention, split four ways: awaiting your decision, approved but not yet published, never reviewed, and review overdue.',
          'The page derives everything from the company pages themselves — there is no separate queue to keep in step, so a page cannot be quietly waiting somewhere you are not looking.',
          'Note the line at the foot: review intervals are a flight-department default, between 90 days and a year depending on the field. They are a department standard, not a regulatory deadline.',
        ],
        shot: {
          id: 'cp-airport-worklist',
          caption: 'Airport worklist. All four counters are at zero in this demo build.',
          calls: [
            [1, 'Awaiting your decision — proposals sitting on you.'],
            [2, 'Never reviewed — a company page exists but nobody has reviewed it.'],
            [3, 'Review overdue — past its review interval.'],
            [4, 'Review intervals are a department default, not a regulatory requirement.'],
          ],
        },
      },
      {
        heading: 'Approving page proposals',
        body: [
          'Proposals is where crew-submitted edits to airport company pages come to you. It has two lists: awaiting your decision, and approved and ready to publish.',
          'Approval and publication are separate steps on purpose. Approving a page records that you accept the content; publishing pushes it to the crews. A page can sit approved-but-unpublished, and the worklist counts those separately so they do not get lost.',
        ],
        shot: {
          id: 'cp-airport-proposals',
          caption: 'Airport page review, with both lists empty.',
          calls: [
            [1, 'Awaiting your decision.'],
            [2, 'Approved, ready to publish — approved content that crews cannot see yet.'],
          ],
        },
      },
      {
        heading: 'Rules and flags',
        body: [
          'Rules & flags is the highest-leverage page you own. A flag is a rule evaluated against FAA reference data that marks airports for crews — for example Short runway, High elevation, or No declared distances published.',
          'Each flag carries a severity (caution or info), the surface it shows on, and the advisory text crews will read. Before you save, the page tells you how many of the 2,128 airports in the directory the rule currently matches, so you can see the blast radius of a change before you make it.',
          'Write the advisory text as the instruction you want a crew to act on. "Density altitude will bite. Recheck takeoff and climb performance." is useful; "high airport" is not.',
        ],
        shot: {
          id: 'cp-airport-flags',
          caption: 'Airport flags, with the match count shown against each rule.',
          calls: [
            [1, 'New flag — define a new rule.'],
            [2, 'The flag name, its severity, and where it surfaces to crews.'],
            [3, 'How many airports this rule matches right now. Check this before saving a change.'],
            [4, 'Edit — change the rule or its advisory text.'],
          ],
        },
      },
      {
        heading: 'Airport evaluation requests',
        body: [
          'Airport Evaluation Officer, in the Admin group, is the intake queue for crew requests: new airports the department has not evaluated, and corrections to existing entries.',
          'Counters at the top break the queue into Pending Review, In Review, New Airports and With FAA Data. That last one matters — a request with FAA data behind it can be evaluated from published reference data, while one without needs full manual research. The queue tells you which is which before you pick up the work.',
          'Each request shows who submitted it and how long it has been waiting.',
        ],
        shot: {
          id: 'cp-eval-officer',
          caption: 'Airport Evaluation Officer intake queue.',
          calls: [
            [1, 'Queue state counters.'],
            [2, 'A new-airport request, with the requester’s justification.'],
            [3, 'Correction requests sit in the same queue as new airports.'],
            [4, 'FAA Data — published reference data exists for this field. Requests without it need manual research.'],
          ],
        },
      },
      {
        heading: 'Approvals as Chief Pilot',
        body: [
          'The Approvals page works exactly as described in the Pilot guide, but the requests routed to you are different — the page records your decision against the Chief Pilot role, not against you personally.',
          'Where a request has already been through another approver, their decision and reasoning are shown above the buttons. Read it before you decide.',
        ],
      },
      {
        heading: 'A limit worth knowing',
        body: [
          'Crew Workload, in the Scheduling group, is not open to the Chief Pilot role. Opening it returns Access Denied — the page is restricted to the scheduling, admin and lead roles.',
          'This is worth knowing before you go looking for crew workload data during a rostering conversation: today it has to come from Scheduling or from a Lead Team member.',
        ],
        shot: {
          id: 'cp-access-denied',
          caption: 'Crew Workload is not available to the Chief Pilot role.',
          calls: [
            [1, 'The access-denied message, naming the roles that do have access.'],
            [2, 'The role you are currently acting as.'],
          ],
        },
      },
    ],
  },

  // ═══════════════════════════ FLIGHT ATTENDANT ═══════════════════════════
  {
    key: 'inflight', file: '03-Flight-Attendant', kind: 'base',
    title: 'Flight Attendant', roleLabel: 'Flight Attendant',
    purpose: 'Cabin work in myGFO: reading your trips and the allergies on each leg, managing passenger records and catering, running aircraft inventory and inspections, and keeping the commissary stocked.',
    audience: [
      'Cabin crew.',
      'Also the base document for the Flight Attendant Manager — read this first, then the manager supplement.',
    ],
    frontDoor: 'Dashboard',
    frontDoorNote: 'You land on the Dashboard. Upcoming Trips, at the top of the Inflight group, is the page to work from.',
    nav: [
      ['Upcoming Trips', 'Inflight', 'Your trips leg by leg, with allergies and catering per leg'],
      ['Passenger Database', 'Inflight', 'Passenger records: preferences, allergies, birthdays'],
      ['Catering Tracker', 'Inflight', 'Caterers and hotel partners, with lead times and coverage'],
      ['Post-Flight Checklist', 'Inflight', 'Flight reset procedures, per flight'],
      ['Aircraft Inventory', 'Inflight', 'Pre-flight inventory check by tail'],
      ['Aircraft Cleaning', 'Inflight', 'Cleaning workflow status'],
      ['Trips', 'Inventory', 'Trip-linked inventory: what was requested and stocked'],
      ['Inspections', 'Inventory', 'Monthly baseline audit against system records'],
      ['Commissary', 'Inventory', 'Stock room by shelf, with par levels and expiry'],
      ['Replenish', 'Inventory', 'Restock list generated from inspection shortfalls'],
      ['Unit Requests', 'Inventory', 'Requests for items to be added to a unit'],
      ['Dashboard', 'Home', 'Weather, fleet, today’s flights, airspace, duty roster'],
      ['My Tasks', 'Home', 'Action items assigned to you and your own tasks'],
      ['Approvals', 'Home', 'Requests waiting on you, and ones you filed'],
      ['Vacation Request', 'Scheduling', 'Vacation, PBST, off days, medical leave'],
      ['Document Center', 'Documents', 'Controlled publications and your required reads'],
    ],
    sections: [
      SIGN_IN,
      {
        heading: 'Upcoming Trips — allergies first',
        body: [
          'Upcoming Trips is your working page. It shows your assigned trips broken down leg by leg: who is on board, every allergen to plan the menu around, and the catering order for each leg.',
          'The summary strip counts trips, legs, passengers, and how many catering orders still need chasing. Below it, a banner counts critical allergens across all the trips shown, and each leg then lists its own.',
          'The allergy panel is the part to read carefully. Allergens are graded — Critical entries name the reaction and the response (for example "critical, Anaphylaxis · EpiPen - seat pocket"), while Moderate entries are graded lower. Underneath, a separate Avoid list holds preferences that are explicitly not medical.',
          'Keep that distinction. The Avoid list is about service quality; the allergy list is about passenger safety, and the two are deliberately not mixed.',
        ],
        shot: {
          id: 'fa-upcoming',
          caption: 'Upcoming trips, showing leg 1 with its allergy panel.',
          calls: [
            [1, 'Catering still to chase across the trips shown.'],
            [2, 'Critical allergens across all these trips. Each leg lists its own below.'],
            [3, 'A trip, with tail, dates, routing and who is crewing it.'],
            [4, 'Allergies on this leg, graded Critical or Moderate, each naming the reaction and the response.'],
            [5, 'Avoid — preference, not medical. Kept separate from the allergy list on purpose.'],
          ],
        },
      },
      {
        heading: 'Passenger records',
        body: [
          'Passenger Database holds the standing record for each passenger: their role or relationship to the company, food and drink preferences, allergies and birthdays.',
          'The counters at the top tell you how many passengers are on file, how many have allergies recorded, and whose birthday falls this month. A numeric badge on a passenger row indicates recorded allergies.',
          'This is the source the trip allergy panels draw from, so it is worth keeping accurate. Add Passenger creates a new record.',
        ],
        shot: {
          id: 'fa-passengers',
          caption: 'Passenger Management.',
          calls: [
            [1, 'Add Passenger — create a new standing record.'],
            [2, 'How many passengers have allergies recorded.'],
            [3, 'A passenger record: role, food preferences, drink preferences.'],
            [4, 'Birthdays falling this month.'],
          ],
        },
      },
      {
        heading: 'Catering and hotels',
        body: [
          'Catering Tracker holds the caterers and hotel partners the department uses, on two tabs.',
          'Each caterer entry carries the operational facts you need when placing an order: the contact, the lead time, the service radius, operating hours, a rating, and free-text notes on how they actually perform. Lead time is the field to check first — a three-hour caterer and a six-hour caterer are not interchangeable on a short turn.',
          'Caterers covering more than one airport are marked Multi-Airport and list the fields they serve. Show only multi-airport services filters the list down to those.',
        ],
        shot: {
          id: 'fa-catering',
          caption: 'Catering Tracker, on the Catering Companies tab.',
          calls: [
            [1, 'Catering Companies tab.'],
            [2, 'Hotel Partners tab.'],
            [3, 'Lead Time — check this before committing to an order on a short turn.'],
            [4, 'Filter to caterers covering more than one airport.'],
          ],
        },
      },
      {
        heading: 'Trip inventory',
        body: [
          'The Inventory group tracks what is physically on each aircraft. Trips is the trip-linked view: each tail shows its current leg pulled from myairops, how many items were requested, and its last stocking score.',
          'Where a tail has an active leg you get Open leg. Where it does not, Start Trip begins a trip-linked inventory session. If the leg shown is not the one you are working, Not this leg? lets you correct the association.',
        ],
        shot: {
          id: 'fa-inventory-trips',
          caption: 'Inventory — Trips, one card per tail.',
          calls: [
            [1, 'The leg pulled from myairops, with its reference.'],
            [2, 'Open leg — work the inventory for the active leg.'],
            [3, 'Start Trip — begin a session on a tail with no active trip.'],
            [4, 'Not this leg? — correct the leg association.'],
          ],
        },
      },
      {
        heading: 'Inspections',
        body: [
          'Inspections is the monthly baseline audit: verifying that what is physically on the aircraft matches what the system says should be there.',
          'Each tail shows when it was last inspected, how many inspections it has had this year, and its score. Inspection History below lists past inspections with who did them, how many items were checked, and the resulting score — a score below 100% carries the shortfall alongside it, for example "93% — 3 missing".',
          'Missing items found during an inspection feed the Replenish list.',
        ],
        shot: {
          id: 'fa-inspections',
          caption: 'Aircraft Inspections.',
          calls: [
            [1, 'What the inspection is for — verifying the aircraft against system records.'],
            [2, 'Per-tail score and inspection count for the year.'],
            [3, 'Inspection History — who inspected, how many items, and the score.'],
          ],
        },
      },
      {
        heading: 'Commissary',
        body: [
          'Commissary is the stock room, organised by physical location — shelves, the medicine cabinet, the wine rack, the linen closet. That grouping is deliberate: it matches the walk you actually do when checking stock.',
          'The header carries the totals: item count and value on hand, then how many items are below par and how many are expiring. Each location repeats those counts for itself, so you can see which shelf needs attention without opening it.',
          'Below par means the count has fallen under the par level set for that item; par levels are maintained in Inventory Settings by the Flight Attendant Manager or Commissary Manager.',
        ],
        shot: {
          id: 'fa-commissary',
          caption: 'Commissary stock room, grouped by physical location.',
          calls: [
            [1, 'Item count and value on hand across the stock room.'],
            [2, 'How many items are below par, and how many are expiring.'],
            [3, 'A storage location, with its own low and expiring counts.'],
            [4, 'Add — record new stock.'],
          ],
        },
      },
      {
        heading: 'Replenish and unit requests',
        body: [
          'Replenish is the restock list, and it is generated rather than typed: complete an inspection with missing items and the shortfall appears here. If the page says there is nothing to replenish, no inspection has produced a shortfall yet. It also supports barcode scanning.',
          'Unit Requests is for asking that specific items be added to a unit. Each request is tagged Guest or Non-Guest — a guest request traces to a passenger need ("VIP guest requested extra sparkling water and hot towels"), a non-guest request is operational ("restocking cleaning supplies after deep clean"). Requests show who raised them, when, and how many items are involved.',
        ],
        shot: {
          id: 'fa-unit-requests',
          caption: 'Unit Item Requests.',
          calls: [
            [1, 'New Request.'],
            [2, 'Guest — the request traces to a passenger need.'],
            [3, 'Non-Guest — an operational restock.'],
          ],
        },
      },
      {
        heading: 'Pre-flight inventory and post-flight reset',
        body: [
          'Aircraft Inventory, in the Inflight group, is the pre-flight check. Pick the tail you are working and step through its inventory.',
          'Post-Flight Checklist covers the flight reset. Select a flight from Recent Flights and its checklist opens, showing how many items remain and how many are done. The checklist is shared, so more than one crew member can work it.',
        ],
        shot: {
          id: 'fa-aircraft-inventory',
          caption: 'Aircraft Inventory — choose a tail to begin.',
          calls: [
            [1, 'Start by selecting the aircraft you are checking.'],
            [2, 'The fleet, by tail and type.'],
          ],
        },
      },
      ...SHARED_SECTIONS('Flight Attendant'),
    ],
  },

  // ═══════════════════════ FLIGHT ATTENDANT MANAGER ═══════════════════════
  {
    key: 'fa-manager', file: '04-Flight-Attendant-Manager', kind: 'supplement', base: 'Flight Attendant',
    title: 'Flight Attendant Manager', roleLabel: 'Flight Attendant Manager',
    purpose: 'The oversight work that sits on top of cabin operations: maintaining the inventory baseline that every aircraft is measured against, reviewing inspection performance, and acting as an approver.',
    audience: [
      'Flight Attendant Manager, and Commissary Manager where the two are held together.',
      'Read the Flight Attendant guide first for the underlying cabin workflows.',
    ],
    frontDoor: 'Dashboard',
    frontDoorNote: 'You land on the Dashboard. Your work sits in the Inventory group and on the Approvals page.',
    nav: [
      ['Trips', 'Inventory', 'Trip-linked inventory across the fleet'],
      ['Inspections', 'Inventory', 'Inspection scores and history across the fleet'],
      ['Commissary', 'Inventory', 'Stock room by shelf, with par levels and expiry'],
      ['Inventory Settings', 'Inventory', 'Fleet, compartments, items and par levels'],
      ['Approvals', 'Home', 'Requests routed to you as Flight Attendant Manager'],
      ['Document Center', 'Documents', 'Controlled publications and your required reads'],
    ],
    gapNote: [
      'Your sidebar is narrower than a Flight Attendant’s. The Inflight pages — Upcoming Trips, Passenger Database, Catering Tracker, Post-Flight Checklist — are not currently granted to the Flight Attendant Manager role, so you will not see them while signed in as manager.',
      'If you need those pages, sign in under the Flight Attendant role. This is a role-permission gap that has been raised with the project team, not something you are doing wrong.',
    ],
    sections: [
      {
        heading: 'What is different about your sign-in',
        body: [
          'Choose Flight Attendant Manager in the role picker. You land on the Dashboard, and your sidebar carries the Inventory group, Approvals and the Document Center.',
        ],
      },
      {
        heading: 'Inventory Settings — the baseline you own',
        body: [
          'Inventory Settings is the page that matters most in this role, because it defines the standard everything else is scored against. It has four tabs.',
          'Fleet lists the aircraft inventory is tracked for. Compartments defines the storage locations within each aircraft. Items is the catalogue of everything that can be stocked. Par Levels sets the target quantity for each item.',
          'Par levels are the lever. Every "below par" count a flight attendant sees on the Commissary page, and every shortfall that lands on the Replenish list, is measured against the numbers set here. Raise a par level and you will generate restocking work; set one too low and the aircraft will run short in service. Change them deliberately.',
        ],
        shot: {
          id: 'fam-settings',
          caption: 'Inventory Settings, on the Fleet tab.',
          calls: [
            [1, 'Fleet — the aircraft inventory is tracked for.'],
            [2, 'Compartments — storage locations within each aircraft.'],
            [3, 'Items — the catalogue of stockable items.'],
            [4, 'Par Levels — the target quantities everything else is scored against.'],
            [5, 'Add Aircraft — bring another tail into inventory tracking.'],
          ],
        },
      },
      {
        heading: 'Reviewing inspection performance',
        body: [
          'The Inspections page shows the same data a flight attendant sees, but you are reading it differently — across the fleet and over time rather than for the tail in front of you.',
          'Inspection History is where the signal is. Look for tails whose score keeps dropping, items that go missing repeatedly, and gaps where a tail has not been inspected. A recurring shortfall on one item usually means the par level is wrong rather than that stock keeps vanishing — and that is a fix you make in Inventory Settings.',
        ],
        shot: {
          id: 'fam-inspections',
          caption: 'Inspection history across the fleet.',
          calls: [
            [1, 'Inspection History — who inspected, how many items, and the score.'],
            [2, 'Per-tail score. Watch the trend across inspections, not the single number.'],
          ],
        },
      },
      {
        heading: 'Approvals as Flight Attendant Manager',
        body: [
          'Approvals behaves as described in the Flight Attendant guide. The difference is which requests route to you: your decision is recorded against the Flight Attendant Manager role.',
          'Where cabin knowledge documents require a second approver, the system will not let the author approve their own submission — a submission needs a different approver to clear it.',
        ],
        shot: {
          id: 'fam-approvals',
          caption: 'The Approvals inbox, acting as Flight Attendant Manager.',
          calls: [
            [1, 'The page states the role you are acting as. Approval authority follows the role.'],
          ],
        },
      },
    ],
  },

  // ═════════════════════════════ SCHEDULING ═════════════════════════════
  {
    key: 'scheduling', file: '05-Scheduling', kind: 'base',
    title: 'Scheduling', roleLabel: 'Scheduling',
    purpose: 'Day-to-day scheduling work in myGFO: reading fleet serviceability and airspace impact, coordinating trips, and keeping passenger forms and passenger data current enough to fly.',
    audience: [
      'Schedulers and flight coordinators.',
      'Also the base document for the Scheduling Manager — read this first, then the manager supplement.',
    ],
    frontDoor: 'Scheduling workspace',
    frontDoorNote: 'Scheduling Dashboard, in the Scheduling group, is the page this guide starts from.',
    nav: [
      ['Crew Workload', 'Scheduling', 'Crew workload and travel'],
      ['Scheduling Dashboard', 'Scheduling', 'Fleet status, airspace, currency alerts, next 24 hours'],
      ['Trip Coordination', 'Scheduling', 'Trips in planning, with checklists and a lead scheduler'],
      ['Passenger Forms', 'Scheduling', 'Passenger form submissions and templates'],
      ['Passenger Forms · Data Currency', 'Scheduling', 'Manifest passengers whose data or documents are stale'],
      ['Vacation Request', 'Scheduling', 'Vacation, PBST, off days, medical leave'],
      ['Dashboard', 'Home', 'Weather, fleet, today’s flights, airspace, duty roster'],
      ['My Tasks', 'Home', 'Action items assigned to you and your own tasks'],
      ['Approvals', 'Home', 'Requests waiting on you, and ones you filed'],
      ['Pilot Currency', 'Home', 'Crew currency — read this before you crew a trip'],
      ['Document Center', 'Documents', 'Controlled publications and your required reads'],
    ],
    sections: [
      SIGN_IN,
      {
        heading: 'Scheduling Dashboard',
        body: [
          'The Scheduling Dashboard is the situational page for crewing decisions. Fleet Status is the part to read first: every tail with its fuel state and a serviceability verdict — Serviceable, Grounded, or MEL / restricted — and, where relevant, the count of open defects or active deferrals behind that verdict.',
          'MEL / restricted is not the same as Grounded. A tail on an active deferral can fly, but it flies with a restriction, and that restriction may bear on the trip you are about to build.',
          'National Airspace Status carries live FAA ground stops, delays and flow programmes, each with a cause and a start time. Flight Impact Alerts below maps those onto your actual legs so you can see which flights are affected rather than which airports are.',
        ],
        shot: {
          id: 'sch-dashboard',
          caption: 'Scheduling Dashboard — fleet status and airspace.',
          calls: [
            [1, 'Fleet Status — per-tail serviceability, fuel, and open defects or deferrals.'],
            [2, 'MEL / restricted — dispatchable, but with a restriction attached.'],
            [3, 'National Airspace Status — ground stops, delays and flow programmes, with causes.'],
          ],
        },
      },
      {
        heading: null,
        body: [
          'Further down the page, Currency Alerts names crew whose currency is about to lapse — read it before you assign, not after. Quick Actions gives one-click routes to Send Forms and Check Currency.',
        ],
        shot: {
          id: 'sch-dashboard-b',
          caption: 'Scheduling Dashboard — currency alerts and quick actions.',
          calls: [
            [4, 'Currency Alerts — crew approaching or past a currency limit.'],
            [5, 'Quick Actions — Send Forms and Check Currency.'],
          ],
        },
      },
      {
        heading: 'Trip Coordination',
        body: [
          'Trip Coordination tracks trips being built. Each trip carries a priority (standard, vip, urgent), a state (planning, confirmed), the client, and counts of legs, passengers and outstanding tasks.',
          'Two things make this page work as a team tool. Checklist Progress shows how complete the trip’s task list is, so a trip at 0% two days out is visible without opening it. And each trip names a lead scheduler alongside the others working it, so there is never ambiguity about who owns it.',
          'Active Schedulers, down the left, shows who is working which trip right now and when colleagues were last active — useful before you pick up a trip someone else may already be in.',
        ],
        shot: {
          id: 'sch-trip-coordination',
          caption: 'Trip Coordination.',
          calls: [
            [1, 'New Trip.'],
            [2, 'Active Schedulers — who is working what, right now.'],
            [3, 'Checklist Progress — how complete this trip’s task list is.'],
            [4, 'The named lead scheduler for the trip.'],
          ],
        },
      },
      {
        heading: 'Passenger Forms',
        body: [
          'Passenger Forms manages the forms passengers submit and the templates behind them. Counters break the queue into new submissions needing review, documents expiring within 30 days, and data older than two years.',
          'Public Form Link is the workhorse. Copy it and send it to a passenger or an assistant — no login is required to complete the form, which is what makes it usable with people outside the company.',
          'Work the queue with the row actions: Mark Reviewed on a new submission, Mark Entered once the data is in. Manage Templates edits the forms themselves.',
        ],
        shot: {
          id: 'sch-passenger-forms',
          caption: 'Passenger Forms Management.',
          calls: [
            [1, 'Public Form Link — a no-login link you can send outside the company.'],
            [2, 'Documents expiring within 30 days.'],
            [3, 'Data older than two years.'],
            [4, 'Row actions — Mark Reviewed, Mark Entered.'],
            [5, 'Manage Templates.'],
          ],
        },
      },
      {
        heading: 'Passenger Data Currency',
        body: [
          'Data Currency crosses upcoming-trip manifests against CRM freshness and answers one question: is every passenger booked on an upcoming trip actually documented well enough to fly? The policy is stated on the page — records updated within two years, travel documents valid through the end of the trip.',
          'Passengers are grouped by trip and flagged three ways. Info stale means the CRM record has not been updated in over two years. Document expiring means the passport expires before the trip ends. No CRM link is the most serious: the passenger is on the manifest with no linked CRM record at all, so identity and documents cannot be verified.',
          'Show needs-action only strips out everyone who is already current. Mark update link sent records that you have chased a passenger.',
          'Read the advisory on the page carefully. Freshness uses the CRM record-modified date as a proxy — it moves on any edit, not only on the passenger confirming their details, so a "current" record is evidence rather than proof. The outreach buttons record your intent locally: the automatic email and any write-back to myairops are deliberately not wired, because myGFO reads from myairops and never writes to it.',
        ],
        shot: {
          id: 'sch-passenger-currency',
          caption: 'Passenger Data Currency, grouped by trip.',
          calls: [
            [1, 'How many passengers on upcoming trips need action.'],
            [2, 'No CRM link — on the manifest with no linked record. Identity and documents unverifiable.'],
            [3, 'Document expiring — passport expires before the trip ends.'],
            [4, 'Mark update link sent — records your outreach. It does not send an email.'],
            [5, 'Show needs-action only.'],
          ],
        },
      },
      {
        heading: 'Crew Workload and currency',
        body: [
          'Crew Workload covers crew workload and travel. It is restricted to the scheduling, admin and lead roles — the Chief Pilot cannot open it, so if a Chief Pilot asks for workload data it has to come from you.',
          'Pilot Currency, in the Home group, is the same Currency Dashboard described in the Pilot guide. Read it before you crew a trip: currency is tracked per aircraft type, so a pilot current on one type may be expired on another, and the row expands to a line per type to show exactly that.',
        ],
        shot: {
          id: 'sch-crew-workload',
          caption: 'Crew Workload, open under the Scheduling role.',
          calls: [
            [1, 'Crew Workload — available to scheduling, admin and lead roles only.'],
          ],
        },
      },
      ...SHARED_SECTIONS('Scheduling'),
    ],
  },

  // ═══════════════════════ SCHEDULING MANAGER ═══════════════════════
  {
    key: 'scheduling-manager', file: '06-Scheduling-Manager', kind: 'supplement', base: 'Scheduling',
    title: 'Scheduling Manager', roleLabel: 'Scheduling Manager',
    purpose: 'What the Scheduling Manager role can and cannot currently do in myGFO, and how to work around the gap until the role is granted its pages.',
    audience: [
      'Scheduling Manager and Lead Scheduler.',
      'Read the Scheduling guide first — in practice you will be doing that work under the Scheduling role.',
    ],
    frontDoor: 'Dashboard',
    frontDoorNote: 'You land on the Dashboard with an empty sidebar. See the note below before going further.',
    nav: [],
    gapNote: [
      'The Scheduling Manager role currently has no pages assigned to it. Signing in as Scheduling Manager gives you the Dashboard and an empty sidebar, and the scheduling pages return Access Denied because they are restricted to the scheduling, admin and lead roles.',
      'Until this is fixed, do your scheduling work signed in under the Scheduling role. This document records the gap and will be replaced with a full supplement once the role is granted its pages.',
    ],
    sections: [
      {
        heading: 'The current state of this role',
        body: [
          'Choosing Scheduling Manager in the role picker signs you in successfully — the role exists and is selectable. What it does not have is any assigned pages.',
          'You land on the Dashboard, which every role can see, and the sidebar beneath it is empty. There is no Scheduling group, no Approvals, no Document Center.',
        ],
        shot: {
          id: 'schm-empty-sidebar',
          caption: 'Signed in as Scheduling Manager: the Dashboard loads, the sidebar is empty.',
          calls: [
            [1, 'The sidebar, with no navigation items assigned to this role.'],
            [2, 'The Dashboard renders normally — it is available to every role.'],
          ],
        },
      },
      {
        heading: 'What happens if you navigate directly',
        body: [
          'Reaching a scheduling page by URL does not work around the gap. The page loads its breadcrumb and then returns Access Denied, naming the roles that do have access — scheduling, admin and lead — and the role you are currently acting as.',
          'This is the permission system behaving correctly. The problem is that Scheduling Manager was never added to those permitted lists.',
        ],
        shot: {
          id: 'schm-denied',
          caption: 'Crew Workload, opened as Scheduling Manager.',
          calls: [
            [1, 'Access Denied, naming the roles that do have access.'],
            [2, 'The role you are currently acting as.'],
          ],
        },
      },
      {
        heading: 'What to do in the meantime',
        body: [
          'Sign in under the Scheduling role and work from the Scheduling guide. That role has the full set of scheduling pages: Scheduling Dashboard, Trip Coordination, Passenger Forms, Passenger Data Currency, Crew Workload, Pilot Currency, Approvals and the Document Center.',
          'The one thing you lose by doing this is the distinction between manager and scheduler. Any approval you action will be recorded against the Scheduling role rather than against Scheduling Manager. If that distinction matters for a particular decision, hold it until the role is fixed rather than recording it under the wrong authority.',
        ],
      },
      {
        heading: 'What this role should eventually cover',
        body: [
          'For planning purposes, the manager-level work this supplement will document once the role is granted its pages:',
        ],
        bullets: [
          'Approvals routed to Scheduling Manager, recorded against that authority.',
          'Crew Workload read across the whole scheduling team rather than one desk.',
          'Trip Coordination oversight — which trips are behind on their checklists, and who is carrying the load.',
          'Passenger Forms and Data Currency backlog: whether outreach is actually keeping pace with upcoming trips.',
        ],
      },
    ],
  },

  // ═════════════════════════════ MAINTENANCE ═════════════════════════════
  {
    key: 'maintenance', file: '07-Maintenance', kind: 'base',
    title: 'Maintenance', roleLabel: 'Maintenance',
    purpose: 'Day-to-day maintenance work in myGFO outside the Tech Log: parts and procurement, the daily shift turndown, ground risk assessment, fuel farm, vehicles, airport services and work analytics.',
    audience: [
      'Maintenance technicians and maintenance coordinators.',
      'Also the base document for the Chief Inspector and the Director of Maintenance — read this first, then the relevant supplement.',
    ],
    frontDoor: 'Maintenance workspace',
    frontDoorNote: 'This guide starts from Parts Inventory in the Maintenance group.',
    nav: [
      ['Parts Inventory', 'Maintenance', 'Stock, purchase orders, vendors and alerts, synced with myCMP'],
      ['Work Analytics', 'Maintenance', 'Technician hours, work orders and completion metrics'],
      ['Turndown Reports', 'Maintenance', 'History of daily shift reports'],
      ['Turndown Form', 'Maintenance', 'File the daily shift report'],
      ['Vehicles', 'Maintenance', 'Passenger vehicle check-in, assignment and tracking'],
      ['Airport Services', 'Maintenance', 'Star-rated airport services, with evaluation expiry'],
      ['Fuel Farm Tracker', 'Maintenance', 'Fuel farm inventory and fuelling operations'],
      ['GRAT', 'Maintenance', 'Ground risk assessment before a maintenance task'],
      ['Aircraft Cleaning', 'Maintenance', 'Cleaning workflow status by tail'],
      ['Dashboard', 'Home', 'Weather, fleet, today’s flights, airspace, duty roster'],
      ['My Tasks', 'Home', 'Action items assigned to you and your own tasks'],
      ['Approvals', 'Home', 'Requests waiting on you, and ones you filed'],
      ['Vacation Request', 'Scheduling', 'Vacation, PBST, off days, medical leave'],
      ['Document Center', 'Documents', 'Controlled publications and your required reads'],
    ],
    sections: [
      SIGN_IN,
      {
        heading: 'Parts and procurement',
        body: [
          'Parts Inventory is the stock and procurement page, integrated with myCMP. The connection state and the time of the last sync are printed at the top — check them before trusting a stock figure, and use Sync myCMP to refresh.',
          'Five tabs organise the page: Inventory, Purchase Orders, Vendors, Stock Alerts and Analytics. The counters give parts on file, how many are in stock, total inventory value, how many are low or out of stock, and how many orders are awaiting delivery.',
          'Each part line carries its part number, description, current count against minimum, and location down to the shelf. Parts are badged Low Stock or Out of Stock, and serial-tracked parts are marked as such — those cannot be treated as interchangeable units.',
          'A banner appears when stock alerts need attention. Work them from the Stock Alerts tab.',
        ],
        shot: {
          id: 'mx-parts',
          caption: 'Parts & Inventory Management.',
          calls: [
            [1, 'Sync myCMP — refresh from myCMP.'],
            [2, 'Connection state and last sync time. Check this before trusting a stock figure.'],
            [3, 'Stock alerts needing attention.'],
            [4, 'Stock badges — Low Stock and Out of Stock, with count against minimum.'],
            [5, 'Tab strip — Inventory, Purchase Orders, Vendors, Stock Alerts, Analytics.'],
          ],
        },
      },
      {
        heading: 'The daily turndown',
        body: [
          'Turndown Form is the daily shift report and the most-used page in this role. It has four parts.',
          'Shift Information records which shift (AM or PM) and who is reporting. Facility Checklist covers the fixed end-of-shift items — commissary dishwasher started, international garbage on arrivals, hangar close up, fuel farm inspection, tool sign-out checked.',
          'Aircraft Status is the substance: one block per tail, each recording status (In Service, Away, Not in Service), any discrepancies, who cleaned it, and fuel on board. Fill a block for every tail, including the ones with nothing to report — a blank block and an aircraft with no issues look identical to the next shift otherwise.',
          'Additional Notes, Additional Tasks, Stockroom, Additional Facility Information and Customs and Border Protection close the form out.',
          'Configure Form, at the top right, edits the checklist items themselves rather than filling them in.',
        ],
        shot: {
          id: 'mx-turndown-form',
          caption: 'Maintenance Turndown Form — shift information, facility checklist and aircraft status.',
          calls: [
            [1, 'Shift Information — which shift, and who is reporting.'],
            [2, 'Facility Checklist — the fixed end-of-shift items.'],
            [3, 'Aircraft Status — one block per tail.'],
            [4, 'Configure Form — edits the checklist itself, not this shift’s answers.'],
          ],
        },
      },
      {
        heading: null,
        body: [
          'The form closes with free-text sections and the submit button. Everything above has to be complete before you submit — the report is what the next shift reads.',
        ],
        shot: {
          id: 'mx-turndown-form-b',
          caption: 'The foot of the turndown form.',
          calls: [
            [5, 'Submit Turndown Report.'],
            [6, 'Free-text sections: additional tasks, stockroom, facility information, customs.'],
          ],
        },
      },
      {
        heading: 'Reading past turndowns',
        body: [
          'Turndown Reports is the history: past shift reports with their date, shift, technician and fleet status, filterable by date and shift and searchable.',
          'This is the page to open when you come on shift. If it reads "No reports found", no turndown has been filed for the filter you have set — widen the date range before concluding nothing was reported.',
        ],
        shot: {
          id: 'mx-turndown-reports',
          caption: 'Turndown Reports, with no reports matching the current filter.',
          calls: [
            [1, 'Filters — date, shift and search.'],
            [2, 'An empty result means nothing matched the filter, not necessarily that nothing was filed.'],
          ],
        },
      },
      {
        heading: 'Ground risk assessment',
        body: [
          'GRAT scores the risk of a maintenance task before you start it, the way a FRAT scores a flight. The running score and band sit at the top and update as you tick factors: 0–10 low, 11–20 medium, 21 and above high.',
          'Factors are grouped into General Outlook (facility and weather), Human Factors, General Conditions Activities (the work itself) and Ramp, Hangar, GSE. Each carries its point value on the row, so you can see what is driving the score.',
        ],
        shot: {
          id: 'mx-grat',
          caption: 'Standalone GRAT — the running score and the first factor group.',
          calls: [
            [1, 'Live risk score and level.'],
            [2, 'The bands, printed on the form.'],
          ],
        },
      },
      {
        heading: null,
        body: [
          'Human Factors is the group to read most carefully, because the heaviest weightings in the whole form live there and in the activities below it. Working Alone scores +5 on its own; the same work with an emergency notification procedure in use scores 0. Fall Protection scores +2, but Fall Protection (Lone Worker) scores +10 — the single largest factor on the form.',
          'The pattern is deliberate: the form is telling you that working alone is what makes a task dangerous, and that the mitigation is not to work faster but to not be alone, or to have a procedure in place if you are.',
        ],
        shot: {
          id: 'mx-grat-b',
          caption: 'GRAT — Human Factors, where the heaviest weightings sit.',
          calls: [
            [3, 'Human Factors — duty time, work during the window of circadian low, rest, and who else is on site.'],
            [4, 'Working Alone scores +5; with an emergency notification procedure in use it scores 0.'],
          ],
        },
      },
      {
        heading: 'Fuel farm',
        body: [
          'Fuel Farm Tracker monitors fuel farm inventory and fuelling operations. The header gives the current level in gallons and as a percentage of capacity, what has been dispensed and added today, and when the figures were last updated.',
          'Record Fueling logs fuel dispensed to an aircraft; Add Fuel logs a delivery into the farm. Every entry records start and end gallons, the amount, the technician and the resulting running total, so the tank level is auditable line by line rather than just asserted.',
          'Three tabs split the history: Recent Activity, Aircraft Fueling Log and Fuel Farm Deliveries.',
        ],
        shot: {
          id: 'mx-fuel-farm',
          caption: 'Fuel Farm Tracker.',
          calls: [
            [1, 'Current level, as gallons and as a percentage of capacity.'],
            [2, 'Record Fueling — fuel dispensed to an aircraft.'],
            [3, 'Add Fuel — a delivery into the farm.'],
            [4, 'The logs, with start/end gallons and a running total on every entry.'],
          ],
        },
      },
      {
        heading: 'Airport services',
        body: [
          'Airport Services holds star-rated service information for the airports the fleet uses, and tracks when each evaluation expires.',
          'The banner at the top is the working part: it lists airports that have flights in the next 14 days and whose evaluations are expiring or already overdue. That crossing of expiry against upcoming flights is what makes it actionable — an overdue evaluation for a field nobody is flying to can wait, one with a flight on Friday cannot.',
          'Each upcoming flight lists what it needs at that field — fuel, catering, ground power, customs clearance, light maintenance.',
        ],
        shot: {
          id: 'mx-airport-services',
          caption: 'Airport Services Database.',
          calls: [
            [1, 'Airports with flights in the next 14 days whose evaluations are expiring or overdue.'],
            [2, 'Overdue evaluations.'],
            [3, 'Airport Database — the full set, with service ratings.'],
          ],
        },
      },
      {
        heading: 'Vehicles',
        body: [
          'Vehicles tracks the passenger cars: check-in and check-out, assignment to a flight and passenger, current location down to the parking slot, and vehicles out for service.',
          'Counters give total cars, available, checked in, assigned and in maintenance. Row actions follow the state — Check Out on a checked-in car, Assign and Check In on an available one, Unassign on an assigned one.',
        ],
        shot: {
          id: 'mx-vehicles',
          caption: 'Car Tracking.',
          calls: [
            [1, 'Fleet counters by state.'],
            [2, 'Check Out — release a checked-in vehicle.'],
            [3, 'Assign — tie a vehicle to a flight and passenger.'],
            [4, 'Add Car.'],
          ],
        },
      },
      {
        heading: 'Work analytics',
        body: [
          'Work Analytics tracks technician hours and work orders across a chosen period, filterable by technician.',
          'The counters give total hours, total work orders, and how many are completed and in progress. Work by Category splits the effort into Major, Minor and Ancillary. Performance Metrics gives average completion time, hours per work order and completion rate. Recent Time Entries lists individual entries with technician, work order, duration and notes.',
        ],
        shot: {
          id: 'mx-work-analytics',
          caption: 'Technician Work Analytics.',
          calls: [
            [1, 'Period selector.'],
            [2, 'Headline counters for the period.'],
            [3, 'Work by Category — Major, Minor, Ancillary.'],
            [4, 'Recent Time Entries, with notes.'],
          ],
        },
      },
      ...SHARED_SECTIONS('Maintenance'),
    ],
  },

  // ═══════════════════════════ CHIEF INSPECTOR ═══════════════════════════
  {
    key: 'chief-inspector', file: '08-Chief-Inspector', kind: 'supplement', base: 'Maintenance',
    title: 'Chief Inspector', roleLabel: 'Chief Inspector',
    purpose: 'The inspection and quality oversight that sits on top of the Maintenance role: acting as an approver, and reading work analytics and turndown history as quality evidence rather than as workload.',
    audience: [
      'Chief Inspector and Shift Lead.',
      'Read the Maintenance guide first. Everything in it applies to you; this covers what is additional.',
    ],
    frontDoor: 'Dashboard',
    frontDoorNote: 'You land on the Dashboard, with the full Maintenance sidebar beneath it.',
    nav: [
      ['Approvals', 'Home', 'Requests routed to you as Chief Inspector'],
      ['Work Analytics', 'Maintenance', 'Technician hours and completion, read as quality evidence'],
      ['Turndown Reports', 'Maintenance', 'Shift report history'],
      ['Parts Inventory', 'Maintenance', 'Stock, with attention to serial-tracked parts'],
      ['Document Center', 'Documents', 'Controlled publications and your required reads'],
    ],
    gapNote: [
      'The Chief Inspector role currently carries the same page set as the Maintenance role, plus Approvals. There is no dedicated inspection or RII surface yet.',
      'The operator-defined list of ATA chapters requiring a Required Inspection Item is an open question on the project, and RII enforcement is not meaningful until that list exists. Until then, RII discipline is procedural rather than enforced by the system.',
    ],
    sections: [
      {
        heading: 'What is different about your sign-in',
        body: [
          'Choose Chief Inspector in the role picker. You land on the Dashboard and your sidebar carries the full Maintenance group — Parts Inventory, Work Analytics, Turndown Reports and Form, Vehicles, Airport Services, Fuel Farm, GRAT and Aircraft Cleaning — plus Approvals and the Document Center.',
          'The pages are the same ones described in the Maintenance guide. What changes is what you are looking for in them.',
        ],
      },
      {
        heading: 'Approvals as Chief Inspector',
        body: [
          'Approvals is the surface that is genuinely yours. Requests routed to the Chief Inspector arrive here, and your decision is recorded against that role rather than against your name.',
          'For multi-step requests, the decisions of earlier approvers and their reasoning are shown above the buttons. Read them before deciding — your step exists because someone wanted a second judgement, not a second signature.',
        ],
        shot: {
          id: 'ci-approvals',
          caption: 'The Approvals inbox, acting as Chief Inspector.',
          calls: [
            [1, 'The page states the role you are acting as. Approval authority follows the role, not the person.'],
          ],
        },
      },
      {
        heading: 'Reading work analytics as quality evidence',
        body: [
          'Work Analytics is presented as a workload page, but for this role it is quality evidence. The same numbers answer a different question.',
          'Filter by technician and read the pattern rather than the total. Completion rate against average completion time is the pairing that matters: work closing fast with a low completion rate suggests items being reopened. Recent Time Entries carries free-text notes, and those notes are often where a recurring defect first becomes visible — the same symptom described three different ways across three shifts.',
          'Work by Category tells you where the effort actually went, which is worth checking against where the department believes it went.',
        ],
        shot: {
          id: 'ci-work-analytics',
          caption: 'Work Analytics, filtered across all technicians.',
          calls: [
            [1, 'Technician filter — read one technician, or the whole shop.'],
            [2, 'Completion rate. Read it alongside average completion time, not on its own.'],
            [3, 'Recent Time Entries — the free-text notes are where recurring defects surface.'],
          ],
        },
      },
      {
        heading: 'Turndown history and parts',
        body: [
          'Turndown Reports is your record of what each shift reported, filterable by date, shift and technician. Read consecutive reports on the same tail: a discrepancy that appears, disappears without a recorded rectification, and then reappears is the pattern worth pulling on.',
          'On Parts Inventory, serial-tracked parts are the ones that concern you. They are badged as serial tracked, and unlike consumables they cannot be treated as interchangeable — the specific unit matters to the airworthiness record.',
        ],
      },
    ],
  },

  // ══════════════════════ DIRECTOR OF MAINTENANCE ══════════════════════
  {
    key: 'dom', file: '09-Director-of-Maintenance', kind: 'supplement', base: 'Maintenance',
    title: 'Director of Maintenance', roleLabel: 'Director of Maintenance',
    purpose: 'Department-level oversight on top of the Maintenance role: approvals recorded against DOM authority, shop performance, and procurement exposure.',
    audience: [
      'Director of Maintenance.',
      'Read the Maintenance guide first for the underlying pages. This covers how you read them differently.',
    ],
    frontDoor: 'Maintenance workspace',
    frontDoorNote: 'Your sidebar is the full Maintenance set. This guide covers the pages you will actually live in.',
    nav: [
      ['Approvals', 'Home', 'Requests routed to you as Director of Maintenance'],
      ['Work Analytics', 'Maintenance', 'Shop capacity, throughput and completion'],
      ['Parts Inventory', 'Maintenance', 'Inventory value, purchase orders and vendors'],
      ['Turndown Reports', 'Maintenance', 'Shift report history across the department'],
      ['Vehicles', 'Maintenance', 'Vehicle fleet state'],
      ['Airport Services', 'Maintenance', 'Evaluation expiry against upcoming flights'],
      ['Document Center', 'Documents', 'Controlled publications and your required reads'],
    ],
    sections: [
      {
        heading: 'What is different about your sign-in',
        body: [
          'Choose Director of Maintenance in the role picker. Your sidebar is the full Maintenance set, and Approvals carries your department-level authority.',
          'The pages are the ones described in the Maintenance guide. This supplement covers what you are reading them for.',
        ],
      },
      {
        heading: 'Approvals as Director of Maintenance',
        body: [
          'Requests routed to the DOM arrive in the Approvals inbox and your decision is recorded against that authority.',
          'Two rules are enforced by the system rather than left to discipline, and they are worth knowing because they will occasionally block you. A release to service cannot be committed by a signer with no A&P certificate number on file. And on work requiring a required inspection, the same person cannot be both the performer and the inspector.',
          'If either blocks a sign-off, the fix is the underlying record — a missing certificate number, or a second person — not a workaround.',
        ],
        shot: {
          id: 'dom-approvals',
          caption: 'The Approvals inbox, acting as Director of Maintenance.',
          calls: [
            [1, 'The page states the role you are acting as. Your decision is recorded against DOM authority.'],
          ],
        },
      },
      {
        heading: 'Shop performance',
        body: [
          'Work Analytics is your capacity and throughput view. Set the period, then read the shop as a whole before filtering to individuals.',
          'Performance Metrics is the section that answers management questions: average completion time, hours per work order, and completion rate. Work by Category shows the Major / Minor / Ancillary split — if ancillary work is consuming a growing share, that is a resourcing conversation rather than a performance one.',
          'Filtering by technician shows individual load, which is useful for spotting an unbalanced shop. Be careful reading it as productivity: a technician carrying the difficult work will show worse raw numbers than one carrying routine items.',
        ],
        shot: {
          id: 'dom-work-analytics',
          caption: 'Work Analytics across the department.',
          calls: [
            [1, 'Period selector — set this before reading anything else.'],
            [2, 'Technician filter. Start with All Technicians.'],
            [3, 'Performance Metrics — completion time, hours per work order, completion rate.'],
            [4, 'Work by Category — where the effort actually went.'],
          ],
        },
      },
      {
        heading: 'Procurement exposure',
        body: [
          'On Parts Inventory the counters carry your commercial picture: total inventory value, how many parts are low or out of stock, and how many orders are awaiting delivery.',
          'Purchase Orders and Vendors are the tabs to work from at department level. An out-of-stock part with no purchase order behind it is the exposure worth finding — the Stock Alerts tab surfaces those.',
          'The myCMP connection state and last sync time are printed at the top of the page. A stale sync means the figures below it are stale too; check it before quoting a number.',
        ],
        shot: {
          id: 'dom-parts',
          caption: 'Parts Inventory, read at department level.',
          calls: [
            [1, 'Total inventory value.'],
            [2, 'Purchase Orders — what is on order and when it lands.'],
            [3, 'Vendors.'],
          ],
        },
      },
      {
        heading: 'Departmental record',
        body: [
          'Turndown Reports gives you the department’s daily record, filterable by date, shift and technician. Read it for consistency of reporting as much as for content — a shift that files thin reports is a gap in the record, and the next shift inherits it.',
          'Airport Services matters at your level for the same reason it matters to a technician, but with the budget attached: overdue evaluations against upcoming flights are commitments the department has already made without the supporting assessment.',
        ],
      },
    ],
  },

  // ═════════════════════════════ LEAD TEAM ═════════════════════════════
  {
    key: 'lead', file: '10-Lead-Team', kind: 'base',
    title: 'Lead Team', roleLabel: 'Lead Team',
    purpose: 'The management view of the operation: the leadership dashboard, deep-dive analytics, live operational metrics, and the critical functions register that records who covers what.',
    audience: [
      'Department leadership and VPs.',
      'A standalone guide — it does not depend on any other role document.',
    ],
    frontDoor: 'Dashboard',
    frontDoorNote: 'You land on the shared Dashboard. Lead Dashboard, in the Admin group, is your page.',
    nav: [
      ['Lead Dashboard', 'Admin', 'High-level operations overview with delay alerts and VIP tracking'],
      ['Manager Insights', 'Admin', 'Deep-dive analytics: on-time rate, delay causes, route performance'],
      ['Live Metrics', 'Admin', 'Real-time fleet, crew, maintenance and schedule telemetry'],
      ['Critical Functions', 'Admin', 'Critical function register, rolling action items, suggestion box'],
      ['Crew Workload', 'Scheduling', 'Crew workload and travel'],
      ['Pilot Currency', 'Home', 'Crew currency against Part 91 minimums'],
      ['Turndown Reports', 'Maintenance', 'Maintenance shift report history'],
      ['Dashboard', 'Home', 'Weather, fleet, today’s flights, airspace, duty roster'],
      ['My Tasks', 'Home', 'Action items assigned to you and your own tasks'],
      ['Approvals', 'Home', 'Requests waiting on you, and ones you filed'],
      ['Document Center', 'Documents', 'Controlled publications and your required reads'],
    ],
    sections: [
      SIGN_IN,
      {
        heading: 'Lead Dashboard',
        body: [
          'The Lead Dashboard is the operational picture at leadership level: active flights, aircraft available, tracked passengers and active alerts, with the day’s schedule beneath.',
          'Delay Alerts is the part that earns the page. Each entry names the station, the cause type (ground delay programme, weather, capacity), the affected flight, and the delay in minutes. That is enough to answer a question from the top of the company without calling anyone.',
          'Tracked Passengers lists the VIPs — board members and C-suite — with their current flight and its state. Where someone has more flights in the period, the card says so.',
        ],
        shot: {
          id: 'lead-dashboard',
          caption: 'Lead Dashboard.',
          calls: [
            [1, 'Headline counters: active flights, aircraft available, tracked passengers, active alerts.'],
            [2, 'Delay Alerts — station, cause, affected flight and delay in minutes.'],
            [3, 'Tracked Passengers — VIPs with their current flight and its state.'],
            [4, 'Manager Insights — the route through to deep-dive analytics.'],
          ],
        },
      },
      {
        heading: null,
        body: [
          'Aircraft Status, further down, gives the fleet by tail with its state, location, and hours to next inspection. Hours to next inspection is the number to watch: it is the constraint that will decide which tail is available next week.',
        ],
        shot: {
          id: 'lead-dashboard-b',
          caption: 'Lead Dashboard — fleet status with hours to next inspection.',
          calls: [
            [5, 'Aircraft Status — state, location, and hours to next inspection per tail.'],
          ],
        },
      },
      {
        heading: 'Manager Insights',
        body: [
          'Manager Insights is the analytical page, on three tabs: Operations Analytics, Crew Management and Fleet Deep-Dive.',
          'The headline metrics carry period-on-period movement — total flights, on-time rate, cancellations and average delay, each with its change. Flight Completion Trend plots completed against delayed and cancelled by month.',
          'Delay Root Causes is the most useful panel on the page, splitting delays by cause with counts and percentages: weather, maintenance, ATC/NAS, crew and passenger. It separates what the department controls from what it does not, which is the distinction that makes an on-time figure actionable.',
          'Top Routes by Frequency gives per-route flights, average block time, on-time percentage and average fuel.',
        ],
        shot: {
          id: 'lead-manager-insights',
          caption: 'Manager Insights — Operations Analytics.',
          calls: [
            [1, 'Tab strip — Operations Analytics, Crew Management, Fleet Deep-Dive.'],
            [2, 'Headline metrics with period-on-period movement.'],
            [3, 'Delay Root Causes — separates what the department controls from what it does not.'],
            [4, 'Top Routes by Frequency, with block time, on-time rate and fuel.'],
          ],
        },
      },
      {
        heading: 'Live Metrics',
        body: [
          'Live Metrics is the real-time telemetry board, with tabs for Overview, Fleet, Crew, Maintenance and Schedule, and a Zulu clock running in the header.',
          'The Overview carries fleet utilisation, weekly flight hours, active fleet, on-time performance and seat availability, each with its movement. Risk Profile (FRAT) aggregates submitted flight risk assessments into an average score and a low/medium split — it is the one panel that reads the department’s risk posture as a trend rather than one flight at a time.',
          'Below that sit turnaround time, maintenance completion rate, crew readiness and cost per flight hour.',
        ],
        shot: {
          id: 'lead-live-metrics',
          caption: 'Live Metrics — Overview.',
          calls: [
            [1, 'Fleet utilisation and the headline telemetry, each with movement.'],
            [2, 'Risk Profile (FRAT) — aggregated risk posture across submitted assessments.'],
          ],
        },
      },
      {
        heading: null,
        body: [
          'Further down, Aircraft Utilization Report compares hours by tail, and Top Routes ranks the most frequent paths with flights and hours.',
        ],
        shot: {
          id: 'lead-live-metrics-b',
          caption: 'Live Metrics — utilisation by tail and top routes.',
          calls: [
            [3, 'Aircraft Utilization Report — hours by tail.'],
            [4, 'Top Routes, with flights and hours.'],
          ],
        },
      },
      {
        heading: 'Critical Functions',
        body: [
          'Critical Functions is the register of what the department cannot afford to have uncovered, and it is the page on this list with the longest shelf life. It has three tabs: Critical Functions, Rolling Action Items and Suggestion Box.',
          'Each function records a priority and state, the primary role that owns it, the people currently assigned, the backup roles, tagged personnel, a due date, a review date, a reminder setting, and the procedures the function covers.',
          'Backup Roles is the field that makes the register worth keeping. A function with a named primary and no viable backup is a single point of failure, and this is the page where that becomes visible before it becomes a problem. Review dates and reminders exist so the register is revisited rather than written once.',
        ],
        shot: {
          id: 'lead-critical-functions',
          caption: 'Critical Functions & Leadership Management.',
          calls: [
            [1, 'Critical Functions — the register itself.'],
            [2, 'Rolling Action Items.'],
            [3, 'Suggestion Box.'],
            [4, 'Backup Roles — a function with no viable backup is a single point of failure.'],
            [5, 'Add Function.'],
          ],
        },
      },
      {
        heading: 'Crew workload and currency',
        body: [
          'Crew Workload is open to the Lead Team role, and it is worth knowing that the Chief Pilot cannot open it — if a Chief Pilot needs workload data, it comes from Scheduling or from you.',
          'Pilot Currency gives crew currency against Part 91 minimums, tracked per aircraft type. At your level the counters at the top are the reading: how many crew are current, due soon and expired. An expired count is a dispatch constraint, not just a training one.',
        ],
        shot: {
          id: 'lead-crew-workload',
          caption: 'Crew Workload, open under the Lead Team role.',
          calls: [
            [1, 'Crew Workload — available to scheduling, admin and lead roles.'],
          ],
        },
      },
      ...SHARED_SECTIONS('Lead Team'),
    ],
  },
];
