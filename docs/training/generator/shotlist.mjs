// Final screenshot set for the training docs.
// `find` is matched as: exact-ish visible text (Playwright getByText, first match) unless prefixed 'css='.
// `n` is the callout number drawn on the image; the doc text carries the explanation.
// `pad` widens the drawn box; `place` moves the badge (tl default, tr/bl/br).

export const SHOTS = [
  // ─────────────────────────── PILOT ───────────────────────────
  { role: 'pilot', path: '/pilot-workspace', id: 'pilot-flight-hub', calls: [
    { n: 1, find: 'Domestic' }, { n: 2, find: 'Needs prep only' },
    { n: 3, find: 'IN PROGRESS' }, { n: 4, find: 'Needs prep', exact: true, place: 'tr' },
    { n: 5, find: 'css=nav a[href="/pilot-workspace"], a[href="/pilot-workspace"]' },
  ]},
  { role: 'pilot', path: '/frat', id: 'pilot-preflight', calls: [
    { n: 1, find: 'Sync MyAirOps' }, { n: 2, find: 'Pending FRATs' },
    { n: 3, find: 'Preflight Progress: 0/2 legs completed' },
    { n: 4, find: 'Request Fuel' }, { n: 5, find: 'ForeFlight' },
  ]},
  { role: 'pilot', path: '/frat/standalone', id: 'pilot-frat-form', calls: [
    { n: 1, find: 'Current Risk Score: 0' }, { n: 2, find: '25 no-go' },
    { n: 3, find: 'Flight Information' },
  ]},
  { role: 'pilot', path: '/frat/standalone', id: 'pilot-frat-form-b', scrollTo: 'Additional Notes', calls: [
    { n: 4, find: 'Save Draft' }, { n: 5, find: 'Submit FRAT' },
  ]},
  { role: 'pilot', path: '/currency-dashboard', id: 'pilot-currency', calls: [
    { n: 1, find: 'Pilots' }, { n: 2, find: '4 Expired', place: 'tr' },
    { n: 3, find: 'Expired', exact: true }, { n: 4, find: 'Regulatory Reference — 14 CFR Part 91' },
    { n: 5, find: 'Sync', exact: true, place: 'tr' },
  ]},
  { role: 'pilot', path: '/fuel-load-request', id: 'pilot-fuel', calls: [
    { n: 1, find: 'Upcoming Flights', exact: true }, { n: 2, find: 'My Requests' }, { n: 3, find: 'Select Flight' },
  ]},
  { role: 'pilot', path: '/documents', id: 'shared-documents', calls: [
    { n: 1, find: 'MY OUTSTANDING READS' }, { n: 2, find: 'My required reads' },
    { n: 3, find: 'Read & sign', place: 'tr' }, { n: 4, find: 'Overdue', place: 'tr' },
    { n: 5, find: 'Tribal knowledge' },
  ]},
  { role: 'pilot', path: '/approvals', id: 'shared-approvals', calls: [
    { n: 1, find: 'AWAITING YOUR APPROVAL · 1' }, { n: 2, find: 'Step 2 of 2', place: 'tr' },
    { n: 3, find: 'Approve', exact: true }, { n: 4, find: 'Deny', exact: true }, { n: 5, find: 'REQUESTED BY YOU' },
  ]},
  { role: 'pilot', path: '/vacation-request', id: 'shared-vacation', calls: [
    { n: 1, find: 'Submit Request' }, { n: 2, find: 'PBST Balance' },
    { n: 3, find: 'Request Type *' }, { n: 4, find: 'Apply Available PBST Days (Optional)' },
  ]},
  { role: 'pilot', path: '/', id: 'shared-dashboard', calls: [
    { n: 1, find: 'WEATHER' }, { n: 2, find: 'Fleet' }, { n: 3, find: 'Flights for Today' },
    { n: 4, find: 'NAS impact' }, { n: 5, find: 'Duty Roster' },
  ]},

  // ───────────────────────── CHIEF PILOT ─────────────────────────
  { role: 'chief-pilot', path: '/airport-evaluations/worklist', id: 'cp-airport-worklist', calls: [
    { n: 1, find: 'Awaiting your decision' }, { n: 2, find: 'Never reviewed' },
    { n: 3, find: 'Review overdue' }, { n: 4, find: 'Review intervals are a flight-department default' },
  ]},
  { role: 'chief-pilot', path: '/airport-evaluations/review', id: 'cp-airport-proposals', calls: [
    { n: 1, find: 'Awaiting your decision' }, { n: 2, find: 'Approved, ready to publish' },
  ]},
  { role: 'chief-pilot', path: '/airport-evaluations/flags', id: 'cp-airport-flags', calls: [
    { n: 1, find: 'New flag', place: 'tr' }, { n: 2, find: 'Short runway' },
    { n: 3, find: 'flags 1,017 airports' }, { n: 4, find: 'Edit' },
  ]},
  { role: 'chief-pilot', path: '/admin/airport-evaluation-officer', id: 'cp-eval-officer', calls: [
    { n: 1, find: 'Pending Review' }, { n: 2, find: 'KBOS' },
    { n: 3, find: 'Correction', exact: true }, { n: 4, find: 'FAA Data', exact: true },
  ]},
  { role: 'chief-pilot', path: '/crew-scheduling-workload', id: 'cp-access-denied', calls: [
    { n: 1, find: 'Access Denied' }, { n: 2, find: 'Your current role:' },
  ]},

  // ────────────────────── FLIGHT ATTENDANT ──────────────────────
  { role: 'inflight', path: '/upcoming-flights', id: 'fa-upcoming', calls: [
    { n: 1, find: 'catering to chase' }, { n: 2, find: 'critical allergens across these trips' },
    { n: 3, find: 'West coast rotation' }, { n: 4, find: 'Allergies on this leg' },
    { n: 5, find: 'Avoid — preference, not medical' },
  ]},
  { role: 'inflight', path: '/passenger-database', id: 'fa-passengers', calls: [
    { n: 1, find: 'Add Passenger', place: 'tr' }, { n: 2, find: 'with allergies' },
    { n: 3, find: 'Robert Johnson' }, { n: 4, find: 'birthday this month' },
  ]},
  { role: 'inflight', path: '/catering-tracker', id: 'fa-catering', calls: [
    { n: 1, find: 'Catering Companies' }, { n: 2, find: 'Hotel Partners', exact: true },
    { n: 3, find: 'Lead Time' }, { n: 4, find: 'Show only multi-airport services' },
  ]},
  { role: 'inflight', path: '/inventory-v2/trips', id: 'fa-inventory-trips', calls: [
    { n: 1, find: 'From myairops · MAO-7301' }, { n: 2, find: 'Open leg', place: 'tr' },
    { n: 3, find: 'Start Trip', place: 'tr' }, { n: 4, find: 'Not this leg?' },
  ]},
  { role: 'inflight', path: '/inventory-v2/inspections', id: 'fa-inspections', calls: [
    { n: 1, find: 'Monthly baseline audit' }, { n: 2, find: 'Score: 100%' },
    { n: 3, find: 'Inspection History' },
  ]},
  { role: 'inflight', path: '/inventory-v2/commissary', id: 'fa-commissary', calls: [
    { n: 1, find: 'on hand' }, { n: 2, find: 'below par' },
    { n: 3, find: 'Shelf A — Beverages' }, { n: 4, find: 'Add', place: 'tr' },
  ]},
  { role: 'inflight', path: '/inventory-v2/unit-requests', id: 'fa-unit-requests', calls: [
    { n: 1, find: 'New Request', place: 'tr' }, { n: 2, find: 'Guest' }, { n: 3, find: 'Non-Guest' },
  ]},
  { role: 'inflight', path: '/aircraft-inventory', id: 'fa-aircraft-inventory', calls: [
    { n: 1, find: 'Select an aircraft to begin your pre-flight inventory check.' }, { n: 2, find: 'N1PG' },
  ]},

  // ──────────────────── FLIGHT ATTENDANT MANAGER ────────────────────
  { role: 'fa-manager', path: '/inventory-v2/settings', id: 'fam-settings', calls: [
    { n: 1, find: 'Fleet' }, { n: 2, find: 'Compartments' }, { n: 3, find: 'Items' },
    { n: 4, find: 'Par Levels' }, { n: 5, find: 'Add Aircraft', place: 'tr' },
  ]},
  { role: 'fa-manager', path: '/approvals', id: 'fam-approvals', calls: [
    { n: 1, find: 'Approvals' },
  ]},
  { role: 'fa-manager', path: '/inventory-v2/inspections', id: 'fam-inspections', calls: [
    { n: 1, find: 'Inspection History' }, { n: 2, find: 'Score: 100%' },
  ]},

  // ───────────────────────── SCHEDULING ─────────────────────────
  { role: 'scheduling', path: '/scheduling-dashboard', id: 'sch-dashboard', calls: [
    { n: 1, find: 'Fleet Status' }, { n: 2, find: 'MEL / restricted', place: 'tr' },
    { n: 3, find: 'National Airspace Status' },
  ]},
  { role: 'scheduling', path: '/scheduling-dashboard', id: 'sch-dashboard-b', scrollTo: 'Quick Actions', calls: [
    { n: 4, find: 'Currency Alerts' }, { n: 5, find: 'Quick Actions' },
  ]},
  { role: 'scheduling', path: '/trip-coordination', id: 'sch-trip-coordination', calls: [
    { n: 1, find: 'New Trip', place: 'tr' }, { n: 2, find: 'Active Schedulers' },
    { n: 3, find: 'Checklist Progress' }, { n: 4, find: 'Lead: Sarah' },
  ]},
  { role: 'scheduling', path: '/passenger-forms', id: 'sch-passenger-forms', calls: [
    { n: 1, find: 'Public Form Link' }, { n: 2, find: 'Expiring Documents' },
    { n: 3, find: 'Outdated Data' }, { n: 4, find: 'Mark Reviewed', place: 'tr' },
    { n: 5, find: 'Manage Templates', place: 'tr' },
  ]},
  { role: 'scheduling', path: '/passenger-currency', id: 'sch-passenger-currency', calls: [
    { n: 1, find: '6 need action' }, { n: 2, find: 'No CRM link' },
    { n: 3, find: 'Document expiring', exact: true }, { n: 4, find: 'Mark update link sent', place: 'tr' },
    { n: 5, find: 'Show needs-action only' },
  ]},
  { role: 'scheduling', path: '/crew-scheduling-workload', id: 'sch-crew-workload', calls: [
    { n: 1, find: 'Crew Workload' },
  ]},

  // ────────────────────── SCHEDULING MANAGER ──────────────────────
  { role: 'scheduling-manager', path: '/', id: 'schm-empty-sidebar', calls: [
    { n: 1, rect: { x: 4, y: 96, w: 312, h: 880 } }, { n: 2, find: 'Good morning' },
  ]},
  { role: 'scheduling-manager', path: '/crew-scheduling-workload', id: 'schm-denied', calls: [
    { n: 1, find: 'Access Denied' }, { n: 2, find: 'Your current role:' },
  ]},

  // ──────────────────────── MAINTENANCE ────────────────────────
  { role: 'maintenance', path: '/parts-inventory', id: 'mx-parts', calls: [
    { n: 1, find: 'Sync myCMP', place: 'tr' }, { n: 2, find: 'myCMP connection: active' },
    { n: 3, find: '2 stock alerts require attention' }, { n: 4, find: 'Low Stock', place: 'tr' },
    { n: 5, find: 'Purchase Orders' },
  ]},
  { role: 'maintenance', path: '/turndown-form', id: 'mx-turndown-form', calls: [
    { n: 1, find: 'Shift Information' }, { n: 2, find: 'Facility Checklist' },
    { n: 3, find: 'Aircraft Status' }, { n: 4, find: 'Configure Form', place: 'tr' },
  ]},
  { role: 'maintenance', path: '/turndown-form', id: 'mx-turndown-form-b', scrollTo: 'Customs and Border Protection', calls: [
    { n: 5, find: 'Submit Turndown Report' }, { n: 6, find: 'Additional Tasks' },
  ]},
  { role: 'maintenance', path: '/turndown-reports', id: 'mx-turndown-reports', calls: [
    { n: 1, find: 'Filters' }, { n: 2, find: 'No reports found.' },
  ]},
  { role: 'maintenance', path: '/tech-work-analytics', id: 'mx-work-analytics', calls: [
    { n: 1, find: 'This Week' }, { n: 2, find: 'Total Hours' },
    { n: 3, find: 'Work by Category' }, { n: 4, find: 'Recent Time Entries' },
  ]},
  { role: 'maintenance', path: '/fuel-farm', id: 'mx-fuel-farm', calls: [
    { n: 1, find: 'Current Level' }, { n: 2, find: 'Record Fueling', place: 'tr' },
    { n: 3, find: 'Add Fuel', place: 'tr' }, { n: 4, find: 'Aircraft Fueling Log' },
  ]},
  { role: 'maintenance', path: '/airport-services', id: 'mx-airport-services', calls: [
    { n: 1, find: 'Expiring Airports with Upcoming Flights (Next 14 Days)' },
    { n: 2, find: 'Overdue', exact: true, place: 'tr' }, { n: 3, find: 'Airport Database' },
  ]},
  { role: 'maintenance', path: '/car-tracking', id: 'mx-vehicles', calls: [
    { n: 1, find: 'Total Cars' }, { n: 2, find: 'Check Out', place: 'tr' },
    { n: 3, find: 'Assign', exact: true, place: 'tr' }, { n: 4, find: 'Add Car', place: 'tr' },
  ]},
  { role: 'maintenance', path: '/grat/standalone', id: 'mx-grat', calls: [
    { n: 1, find: 'Current Risk Score: 0' }, { n: 2, find: '21+: High Risk' },
  ]},
  { role: 'maintenance', path: '/grat/standalone', id: 'mx-grat-b', scrollTo: 'Working Alone', calls: [
    { n: 3, find: 'Human Factors' }, { n: 4, find: 'Working Alone' },
  ]},

  // ─────────────────────── CHIEF INSPECTOR ───────────────────────
  { role: 'chief-inspector', path: '/approvals', id: 'ci-approvals', calls: [
    { n: 1, find: 'Approvals' },
  ]},
  { role: 'chief-inspector', path: '/tech-work-analytics', id: 'ci-work-analytics', calls: [
    { n: 1, find: 'All Technicians' }, { n: 2, find: 'Completion Rate' }, { n: 3, find: 'Recent Time Entries' },
  ]},

  // ─────────────────── DIRECTOR OF MAINTENANCE ───────────────────
  { role: 'dom', path: '/tech-work-analytics', id: 'dom-work-analytics', calls: [
    { n: 1, find: 'This Week' }, { n: 2, find: 'All Technicians' },
    { n: 3, find: 'Performance Metrics' }, { n: 4, find: 'Work by Category' },
  ]},
  { role: 'dom', path: '/approvals', id: 'dom-approvals', calls: [
    { n: 1, find: 'Approvals' },
  ]},
  { role: 'dom', path: '/parts-inventory', id: 'dom-parts', calls: [
    { n: 1, find: 'inventory value' }, { n: 2, find: 'Purchase Orders' }, { n: 3, find: 'Vendors' },
  ]},

  // ───────────────────────── LEAD TEAM ─────────────────────────
  { role: 'lead', path: '/lead-dashboard', id: 'lead-dashboard', calls: [
    { n: 1, find: 'Active Flights' }, { n: 2, find: 'DELAY ALERTS' },
    { n: 3, find: 'Tracked Passengers' }, { n: 5, find: 'Manager Insights', place: 'tr' },
  ]},
  { role: 'lead', path: '/lead-dashboard', id: 'lead-dashboard-b', scrollTo: 'Aircraft Status', calls: [
    { n: 4, find: 'Aircraft Status' },
  ]},
  { role: 'lead', path: '/manager-insights', id: 'lead-manager-insights', calls: [
    { n: 1, find: 'Operations Analytics' }, { n: 2, find: 'On-Time Rate' },
    { n: 3, find: 'Delay Root Causes' }, { n: 4, find: 'Top Routes by Frequency' },
  ]},
  { role: 'lead', path: '/live-metrics', id: 'lead-live-metrics', calls: [
    { n: 1, find: 'Fleet Utilization' }, { n: 2, find: 'Risk Profile (FRAT)' },
  ]},
  { role: 'lead', path: '/live-metrics', id: 'lead-live-metrics-b', scrollTo: 'Aircraft Utilization Report', calls: [
    { n: 3, find: 'Aircraft Utilization Report' }, { n: 4, find: 'Top Routes' },
  ]},
  { role: 'lead', path: '/critical-functions', id: 'lead-critical-functions', calls: [
    { n: 1, find: 'Critical Functions' }, { n: 2, find: 'Rolling Action Items' },
    { n: 3, find: 'Suggestion Box' }, { n: 4, find: 'Backup Roles' },
    { n: 5, find: 'Add Function', place: 'tr' },
  ]},
  { role: 'lead', path: '/crew-scheduling-workload', id: 'lead-crew-workload', calls: [
    { n: 1, find: 'Crew Workload' },
  ]},
];
