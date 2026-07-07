// Seed bulletins for the demo. Moved out of ProceduralBulletins.tsx so both the
// Procedural and Flight Operations bulletin surfaces read from one persisted store.
import type { Bulletin } from './types';

export const SEED_BULLETINS: Bulletin[] = [
  {
    id: 'PB-001',
    bulletinType: 'procedural',
    title: 'G650 Winter Operations Procedures',
    content: `# Winter Operations Procedures - Gulfstream G650

## Purpose
This bulletin outlines specific procedures for operating the G650 during winter conditions including cold weather operations, anti-icing, and de-icing procedures.

## Scope
Applies to all flight operations when:
- Outside Air Temperature (OAT) is at or below 10°C (50°F)
- Frost, ice, or snow is present or forecast
- Operating on contaminated runways

## Pre-Flight Procedures

### 1. Aircraft Inspection
- Conduct thorough visual inspection for frost, ice, or snow
- Pay special attention to wing leading edges, engine inlets, pitot/static ports, flight control surfaces, and antennas

### 2. Cold Weather Engine Start
- Use GPU for starting when available
- Monitor start parameters carefully
- Allow engines to stabilize before taxi

### 3. Anti-Ice/De-Ice Systems Check
- Verify all anti-ice systems operational
- Test engine and wing anti-ice
- Check pitot heat and static port heat

## De-Icing Procedures
Reference the current Holdover Time Tables based on fluid type, precipitation type and intensity, and outside air temperature.

## Takeoff Considerations
- Ensure all ice/snow removed and note holdover time start
- Verify holdover time not expired before takeoff
- Final visual check of critical surfaces

## Revision History
- Version 1.0 - Initial Release
- Version 1.1 - Updated holdover time references

For questions or clarifications, contact the Safety Department.`,
    category: 'Flight Operations',
    roles: ['pilot', 'admin', 'lead'],
    effectiveDate: '2024-11-01',
    author: 'Chief Pilot Johnson',
    createdDate: '2024-10-15',
    lastUpdated: '2024-10-20',
    version: '1.1',
    isPinned: true,
    isArchived: false,
    requireAcknowledgment: true,
    tags: ['winter', 'de-icing', 'weather', 'G650'],
  },
  {
    id: 'PB-002',
    bulletinType: 'procedural',
    title: 'Cabin Service Standards - VIP Flights',
    content: `# VIP Flight Service Standards

## Pre-Flight Cabin Preparation
- Begin preparation minimum 2 hours before scheduled departure
- Complete all setup 30 minutes before passenger arrival
- Deep clean all surfaces, polish wood and metal, vacuum carpets, clean lavatories, ensure galley is spotless
- Configure seating per passenger preference; set up meeting table or sleep configurations as requested

## Catering Setup
- Stock per catering order and verify special dietary items
- Check expiration dates on all items
- Chill champagne and white wines; prepare coffee station

## Service Protocol
- Professional appearance and warm greeting; provide safety briefing
- Follow passenger meal preferences and present courses professionally
- Anticipate passenger needs and maintain discretion throughout the flight

## Post-Flight Procedures
- Secure all loose items and complete cabin checklist
- Ensure all passenger items removed and check for lost items

## Special Considerations
- International flights: prepare customs/immigration forms and coordinate with FBO
- High-profile passengers: enhanced discretion, photography prohibited, report security concerns immediately

For questions, contact Inflight Services Manager.`,
    category: 'Inflight Service',
    roles: ['inflight', 'admin'],
    effectiveDate: '2024-09-01',
    author: 'Inflight Services Manager Davis',
    createdDate: '2024-08-20',
    version: '2.0',
    isPinned: true,
    isArchived: false,
    requireAcknowledgment: false,
    tags: ['VIP', 'service', 'catering', 'cabin'],
  },
  {
    id: 'PB-003',
    bulletinType: 'procedural',
    title: 'Aircraft Towing Procedures - G650',
    content: `# G650 Towing Procedures

## General Safety Requirements
- Minimum 2 qualified personnel; tow supervisor must be certified
- All personnel must complete towing training; high-visibility vests required
- Approved tow bar for G650, serviceable tug with adequate capacity, wing walkers with wands

## Pre-Towing Inspection
- Parking brake released, hydraulic systems off, nose gear steering disconnect pin installed
- All doors and panels closed and secured; no personnel inside aircraft
- Tow bar inspected for damage and properly attached; safety pins installed

## Towing Procedures
- Post wing walkers at each wingtip and verify clear path
- Maintain walking pace (3 mph max); wing walkers maintain 10-foot clearance
- Gradual brake application only; ensure aircraft fully stopped before disconnecting

## Prohibited Actions
- Never tow with personnel inside the aircraft
- Never exceed 3 mph towing speed
- Never tow in high winds (>25 knots)
- Never tow without wing walkers

For questions or to report issues, contact Maintenance Supervisor.`,
    category: 'Maintenance Procedures',
    roles: ['maintenance', 'admin', 'lead'],
    effectiveDate: '2024-10-01',
    author: 'Maintenance Manager Wilson',
    createdDate: '2024-09-15',
    version: '1.0',
    isPinned: false,
    isArchived: false,
    requireAcknowledgment: false,
    tags: ['towing', 'ground-ops', 'safety', 'G650'],
  },
  {
    id: 'PB-004',
    bulletinType: 'procedural',
    title: 'Crew Rest and Duty Time Guidelines',
    content: `# Crew Rest and Duty Time Guidelines

## Purpose
Ensure all crew members receive adequate rest to maintain safety and operational effectiveness.

## Flight Crew Duty Limitations
- Maximum 14 hours duty time (may extend to 16 with adequate rest)
- Minimum 10 hours rest between duty periods
- Minimum 24 consecutive hours rest in any 7 days

## Flight Attendant Duty Limitations
- Maximum 14 hours duty time (includes pre-flight preparation)
- Minimum 9 hours rest between duty periods, including opportunity for 8 hours uninterrupted sleep

## Fatigue Reporting
- Any crew member may report fatigue with no penalty for fatigue-related duty declination
- Confidential reporting available; company supports conservative decision-making

## International Operations
- Minimum 24 hours rest after crossing 4+ time zones
- Minimum 36 hours rest after crossing 8+ time zones

Contact Safety Department with questions or concerns.`,
    category: 'Safety Procedures',
    roles: ['pilot', 'inflight', 'scheduling', 'admin', 'lead'],
    effectiveDate: '2024-08-01',
    author: 'Safety Director Thompson',
    createdDate: '2024-07-15',
    lastUpdated: '2024-09-01',
    version: '1.2',
    isPinned: true,
    isArchived: false,
    requireAcknowledgment: true,
    tags: ['fatigue', 'duty-time', 'rest', 'safety', 'crew'],
  },
  {
    id: 'PB-005',
    bulletinType: 'procedural',
    title: 'Hazmat Handling and Documentation',
    content: `# Hazardous Materials Handling Procedures

## Scope
All personnel handling, transporting, or storing hazardous materials.

## Handling Requirements
- Proper PPE required and adequate ventilation
- No smoking or open flames; proper container labeling
- Spill kits readily available

## Storage
- Separate incompatible materials with proper containment
- Restricted access and regular inspections

## Documentation
- Material Safety Data Sheets (MSDS/SDS), inventory tracking, usage logs, disposal records

## Emergency Response
- Know location of spill kits; evacuate if necessary
- Contain spill if safe to do so; notify supervisor immediately

Contact Safety or Maintenance for questions.`,
    category: 'Safety Procedures',
    roles: ['maintenance', 'admin', 'safety'],
    effectiveDate: '2024-06-01',
    author: 'Safety Officer Martinez',
    createdDate: '2024-05-10',
    version: '1.0',
    isPinned: false,
    isArchived: false,
    requireAcknowledgment: false,
    tags: ['hazmat', 'safety', 'maintenance', 'compliance'],
  },
  {
    id: 'FOB-001',
    bulletinType: 'flight-ops',
    title: 'Interim EFB Chart Update Workflow',
    content: `# Interim EFB Chart Update Workflow

> **Nonofficial process** — this bulletin documents an interim workflow ahead of the next SOP revision.

## Background
Until the next revision of the Flight Operations Manual, use this interim process for verifying EFB chart currency before the first leg of a trip.

## Procedure
1. On the day of departure, open the EFB and confirm the coverage cycle is current.
2. If an update is pending, apply it while on airport Wi-Fi before pushback.
3. Record the effective cycle in the trip brief notes.
4. If the update cannot complete before departure, notify Scheduling and carry current paper backups.

## Notes
This process will be folded into the FOM at the next revision. Report friction points to Standards.`,
    category: 'Flight Operations',
    roles: ['pilot', 'scheduling', 'admin', 'lead'],
    effectiveDate: '2025-01-15',
    author: 'Standards Captain Chen',
    createdDate: '2025-01-10',
    version: '1.0',
    isPinned: true,
    isArchived: false,
    requireAcknowledgment: true,
    tags: ['efb', 'charts', 'interim', 'standards'],
  },
  {
    id: 'FOB-002',
    bulletinType: 'flight-ops',
    title: 'Temporary FBO Change — Teterboro (KTEB)',
    content: `# Temporary FBO Change — Teterboro (KTEB)

> **Nonofficial process** — temporary operational note, not yet an SOP change.

## Summary
Effective immediately and until further notice, use the alternate FBO at KTEB for all company trips due to ramp construction at our primary FBO.

## Details
- Coordinate fuel and catering through the alternate FBO.
- Update the crew trip sheet with the alternate FBO contact.
- Ground transportation staging has moved to the north gate.

Scheduling will notify crews when the primary FBO resumes normal operations.`,
    category: 'Flight Operations',
    roles: ['pilot', 'inflight', 'scheduling', 'admin', 'lead'],
    effectiveDate: '2025-02-01',
    author: 'Scheduling Manager Reyes',
    createdDate: '2025-01-28',
    version: '1.0',
    isPinned: false,
    isArchived: false,
    requireAcknowledgment: false,
    tags: ['fbo', 'kteb', 'temporary', 'scheduling'],
  },
];
