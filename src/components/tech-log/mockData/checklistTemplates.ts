import type { ChecklistTemplate, ChecklistSectionDef, ChecklistItemDef, MeasurementFieldDef } from '../types';

function fld(id: string, label: string, unit: string, target?: string): MeasurementFieldDef {
  return { id, label, unit, target };
}
function chk(id: string, label: string, opts?: { reference?: string; requiredToRelease?: boolean }): ChecklistItemDef {
  return { id, kind: 'CHECK', label, reference: opts?.reference, requiredToRelease: opts?.requiredToRelease ?? true };
}
function measure(id: string, label: string, fields: MeasurementFieldDef[], opts?: { reference?: string; requiredToRelease?: boolean }): ChecklistItemDef {
  return { id, kind: 'MEASUREMENT', label, reference: opts?.reference, requiredToRelease: opts?.requiredToRelease ?? true, fields };
}
function note(id: string, label: string, opts?: { requiredToRelease?: boolean }): ChecklistItemDef {
  return { id, kind: 'NOTE', label, requiredToRelease: opts?.requiredToRelease ?? true };
}
function sec(id: string, title: string, items: ChecklistItemDef[]): ChecklistSectionDef {
  return { id, title, items };
}

const CREATED_BY = 'USR002'; // Sarah Wilson (DOM) — seed author
const CREATED_AT = '2026-06-01T00:00:00.000Z';

const G650ER_PREFLIGHT: ChecklistTemplate = {
  id: 'cl-g650er-preflight', aircraftType: 'G650ER', phase: 'PREFLIGHT', aodReference: 'AOD-13',
  version: 1, status: 'PUBLISHED', effectiveFrom: CREATED_AT, createdByOid: CREATED_BY, createdAtUtc: CREATED_AT,
  sections: [
    sec('g650er-pre-exterior', 'EXTERIOR', [
      chk('g650er-pre-ext-1', 'Remove protective covers'),
      chk('g650er-pre-ext-2', 'Aircraft exterior for general condition and cleanliness'),
    ]),
    sec('g650er-pre-cockpit', 'COCKPIT', [
      chk('g650er-pre-ckpt-1', 'First flight of the day, perform SPOST', { reference: 'EBHA 24 VDC, UPS 23 VDC' }),
      chk('g650er-pre-ckpt-2', 'Circuit breakers (LEER, REER, overhead)'),
      chk('g650er-pre-ckpt-3', 'Verify SSEC switch enabled'),
      chk('g650er-pre-ckpt-4', 'Main batteries', { reference: '>22 VDC' }),
      chk('g650er-pre-ckpt-5', 'Emer. batteries armed/ON (check INT and EXT)'),
      chk('g650er-pre-ckpt-6', 'Landing gear handle down / 3 green'),
      chk('g650er-pre-ckpt-7', 'Cabin pressure controller AUTO'),
      chk('g650er-pre-ckpt-8', 'SSPCs reset water heater group'),
      chk('g650er-pre-ckpt-9', 'Maintenance test switch OFF'),
      chk('g650er-pre-ckpt-10', 'EBHA/UPS OFF'),
      chk('g650er-pre-ckpt-11', 'Emergency batteries OFF'),
      chk('g650er-pre-ckpt-12', 'Left and right main batteries OFF'),
    ]),
    sec('g650er-pre-engines', 'ENGINES', [
      chk('g650er-pre-eng-1', 'Inlets clear and free rotation'),
    ]),
    sec('g650er-pre-oxygen', 'OXYGEN', [
      measure('g650er-pre-ox-1', 'Oxygen service', [fld('g650er-pre-ox-1-crew', 'Crew', 'PSI'), fld('g650er-pre-ox-1-pax', 'Pax', 'PSI')]),
    ]),
    sec('g650er-pre-gear', 'LANDING GEAR', [
      chk('g650er-pre-gear-1', 'Tire pressure', { reference: '215 psi' }),
      chk('g650er-pre-gear-2', 'Uplocks open'),
      chk('g650er-pre-gear-3', 'Landing gear for general condition and cleanliness'),
    ]),
    sec('g650er-pre-interior', 'INTERIOR / COMMISSARY', [
      chk('g650er-pre-int-1', 'General condition and cleanliness'),
      chk('g650er-pre-int-2', 'Ice'),
    ]),
    sec('g650er-pre-dispatch', 'DISPATCH', [
      chk('g650er-pre-disp-1', 'Remove grounding cable'),
      chk('g650er-pre-disp-2', 'Position aircraft outside'),
      chk('g650er-pre-disp-3', 'Connect NWS scissors'),
      chk('g650er-pre-disp-4', 'Parking brake SET'),
      chk('g650er-pre-disp-5', 'Remove 3 gear pins'),
      chk('g650er-pre-disp-6', 'Panels and doors locked and secured'),
      chk('g650er-pre-disp-7', 'Final walk around'),
      chk('g650er-pre-disp-8', 'Crew Brief & MX Release'),
    ]),
    sec('g650er-pre-fuel', 'FUEL', [
      measure('g650er-pre-fuel-1', 'Fuel gallons', [fld('g650er-pre-fuel-1-gal', 'Gallons', 'GAL')]),
      measure('g650er-pre-fuel-2', 'Total fuel load', [fld('g650er-pre-fuel-2-lb', 'Total load', 'LB')]),
    ]),
  ],
};

const G650ER_POSTFLIGHT: ChecklistTemplate = {
  id: 'cl-g650er-postflight', aircraftType: 'G650ER', phase: 'POSTFLIGHT', aodReference: 'AOD-14',
  version: 1, status: 'PUBLISHED', effectiveFrom: CREATED_AT, createdByOid: CREATED_BY, createdAtUtc: CREATED_AT,
  sections: [
    sec('g650er-post-cockpit', 'COCKPIT', [
      note('g650er-post-ckpt-1', 'APU hours', { requiredToRelease: false }),
      chk('g650er-post-ckpt-2', 'Update hours in MyCAMP'),
      chk('g650er-post-ckpt-3', 'Cockpit condition'),
      chk('g650er-post-ckpt-4', 'Cockpit switches'),
      chk('g650er-post-ckpt-5', 'Exterior and emergency lights for operation'),
      chk('g650er-post-ckpt-6', "Pull SSPC's (water heater group)"),
    ]),
    sec('g650er-post-arrival', 'ARRIVAL', [
      chk('g650er-post-arr-1', 'Gear pins installed'),
      chk('g650er-post-arr-2', 'Check log can'),
      measure('g650er-post-arr-3', 'Engine oil', [
        fld('g650er-post-arr-3-lh', 'LH ENG', 'US QTS'), fld('g650er-post-arr-3-rh', 'RH ENG', 'US QTS'), fld('g650er-post-arr-3-apu', 'APU', 'US QTS'),
      ]),
      chk('g650er-post-arr-4', 'Ground cable and static wick covers'),
      chk('g650er-post-arr-5', 'Put away'),
      chk('g650er-post-arr-6', 'International return'),
      measure('g650er-post-arr-7', 'Oxygen', [fld('g650er-post-arr-7-crew', 'Crew', 'PSI'), fld('g650er-post-arr-7-pax', 'Passenger', 'PSI')]),
    ]),
    sec('g650er-post-cabin', 'CABIN', [
      chk('g650er-post-cab-1', 'Galley and cabin for general operation and condition'),
      chk('g650er-post-cab-2', 'Cabin fire extinguishers'),
      chk('g650er-post-cab-3', 'First aid kit and defib', { reference: 'check defib for voice prompt' }),
    ]),
    sec('g650er-post-fwd', 'FWD FUSELAGE AND NLG', [
      chk('g650er-post-fwd-1', 'EVS lens and radome'),
      chk('g650er-post-fwd-2', 'NLG strut extension, tires, doors, overtravel indicator, and taxi light condition'),
      chk('g650er-post-fwd-3', 'Landing gear blowdown bottle', { reference: '3000 psi' }),
    ]),
    sec('g650er-post-wings', 'WINGS', [
      chk('g650er-post-wing-1', 'Set flaps to 10 degrees'),
      chk('g650er-post-wing-2', 'LH wing condition'),
      chk('g650er-post-wing-3', 'RH wing condition'),
    ]),
    sec('g650er-post-mlg', 'MLG', [
      chk('g650er-post-mlg-1', 'LH MLG condition'),
      chk('g650er-post-mlg-2', 'LH wheel well and hyd accumulators', { reference: '700 psi' }),
      chk('g650er-post-mlg-3', 'RH MLG condition'),
      chk('g650er-post-mlg-4', 'RH wheel well and hyd accumulators', { reference: '700 psi' }),
    ]),
    sec('g650er-post-engpylon', 'ENGINES AND PYLONS', [
      chk('g650er-post-engpy-1', 'LH engine, pylon, cowling, and exhaust'),
      chk('g650er-post-engpy-2', 'RH engine, pylon, cowling, and exhaust'),
    ]),
    sec('g650er-post-tail', 'TAIL EXTERIOR', [
      chk('g650er-post-tail-1', 'General condition and cleanliness'),
      chk('g650er-post-tail-2', 'Static dischargers'),
    ]),
    sec('g650er-post-aft', 'AFT EQUIPMENT BAY', [
      chk('g650er-post-aft-1', 'General condition and cleanliness'),
      chk('g650er-post-aft-2', 'LH and RH accumulators', { reference: '1200 psi' }),
      chk('g650er-post-aft-3', 'Aux power relay box and EBHA PDB circuit breakers'),
      measure('g650er-post-aft-4', 'Service replenishers', [fld('g650er-post-aft-4-hyd', 'Hydraulic', 'PINT'), fld('g650er-post-aft-4-eng', 'Engine', 'PINT')]),
      chk('g650er-post-aft-5', 'Batteries secure (LH, RH, and EBHA)'),
      chk('g650er-post-aft-6', 'Access door and ladder secure'),
    ]),
    sec('g650er-post-sumps', 'SUMPS AND STRUTS', [
      chk('g650er-post-sump-1', 'Wipe struts (5606) and side braces (LD-4)'),
      chk('g650er-post-sump-2', 'Drain fuel sumps and plenums'),
    ]),
    sec('g650er-post-closeup', 'CLOSE UP', [
      chk('g650er-post-close-1', 'Service potable water'),
      note('g650er-post-close-2', 'LAV serviced and cleaned'),
      chk('g650er-post-close-3', 'Set flaps to 0 degrees'),
      chk('g650er-post-close-4', 'Install smart probe covers, TAT covers, and foam protection covers'),
      chk('g650er-post-close-5', 'Interior and exterior cleaning review', { reference: 'REF AOD-20' }),
      chk('g650er-post-close-6', 'Check exterior for sealant and paint touch up as required'),
    ]),
  ],
};

const G500_PREFLIGHT: ChecklistTemplate = {
  id: 'cl-g500-preflight', aircraftType: 'G500', phase: 'PREFLIGHT', aodReference: 'AOD-24',
  version: 1, status: 'PUBLISHED', effectiveFrom: CREATED_AT, createdByOid: CREATED_BY, createdAtUtc: CREATED_AT,
  sections: [
    sec('g500-pre-fuel', 'FUEL', [
      measure('g500-pre-fuel-1', 'Fuel gallons', [fld('g500-pre-fuel-1-gal', 'Gallons', 'GAL')]),
      measure('g500-pre-fuel-2', 'Fuel pounds', [fld('g500-pre-fuel-2-lb', 'Total load', 'LB')]),
    ]),
    sec('g500-pre-exterior', 'EXTERIOR', [
      chk('g500-pre-ext-1', 'Remove protective covers'),
      chk('g500-pre-ext-2', 'Aircraft exterior for general condition and cleanliness'),
    ]),
    sec('g500-pre-cockpit', 'COCKPIT', [
      chk('g500-pre-ckpt-1', 'First flight of the day, perform SPOST', { reference: 'EBHA 24 VDC, UPS 23 VDC' }),
      chk('g500-pre-ckpt-2', 'Circuit breakers (LEER, REER, overhead)'),
      chk('g500-pre-ckpt-3', 'Verify SSEC switch enabled'),
      chk('g500-pre-ckpt-4', 'Main batteries', { reference: '>22 VDC' }),
      chk('g500-pre-ckpt-5', 'Emer. batteries armed/ON (check INT and EXT)'),
      chk('g500-pre-ckpt-6', 'Landing gear handle down / 3 green'),
      chk('g500-pre-ckpt-7', 'Cabin pressure controller AUTO'),
      chk('g500-pre-ckpt-8', 'SSPCs reset water heater group'),
      chk('g500-pre-ckpt-9', 'Maintenance test switch OFF'),
      chk('g500-pre-ckpt-10', 'EBHA and UPS batteries OFF'),
      chk('g500-pre-ckpt-11', 'Emergency batteries OFF'),
      chk('g500-pre-ckpt-12', 'Left and right main batteries OFF'),
    ]),
    sec('g500-pre-engines', 'ENGINES', [
      chk('g500-pre-eng-1', 'Inlets clear and free rotation'),
    ]),
    sec('g500-pre-oxygen', 'OXYGEN', [
      measure('g500-pre-ox-1', 'Oxygen service', [fld('g500-pre-ox-1-crew', 'Crew', 'PSI'), fld('g500-pre-ox-1-pax', 'Pax', 'PSI')], { reference: '1500 psi domestic, 1800 psi international' }),
    ]),
    sec('g500-pre-gear', 'LANDING GEAR', [
      chk('g500-pre-gear-1', 'Tire pressure', { reference: 'NLG 182, MLG 223' }),
      chk('g500-pre-gear-2', 'Landing gear for general condition and cleanliness'),
    ]),
    sec('g500-pre-interior', 'INTERIOR / COMMISSARY', [
      chk('g500-pre-int-1', 'Cabin interior for general condition and cleanliness'),
      chk('g500-pre-int-2', 'Ice'),
    ]),
    sec('g500-pre-dispatch', 'DISPATCH', [
      chk('g500-pre-disp-1', 'Remove grounding cable'),
      chk('g500-pre-disp-2', 'Position aircraft outside'),
      chk('g500-pre-disp-3', 'Parking brake set'),
      chk('g500-pre-disp-4', 'NWS and TPMS connected'),
      chk('g500-pre-disp-5', 'Gear pins removed', { reference: 'qty. 3' }),
      chk('g500-pre-disp-6', 'Panels locked and secured'),
      chk('g500-pre-disp-7', 'Final walk around'),
      chk('g500-pre-disp-8', 'Crew Brief & MX Release'),
    ]),
  ],
};

const G500_POSTFLIGHT: ChecklistTemplate = {
  id: 'cl-g500-postflight', aircraftType: 'G500', phase: 'POSTFLIGHT', aodReference: 'AOD-25',
  version: 1, status: 'PUBLISHED', effectiveFrom: CREATED_AT, createdByOid: CREATED_BY, createdAtUtc: CREATED_AT,
  sections: [
    sec('g500-post-arrival', 'ARRIVAL', [
      chk('g500-post-arr-1', 'LDG pins installed'),
      chk('g500-post-arr-2', 'Check log can'),
      measure('g500-post-arr-3', 'Engine oils', [
        fld('g500-post-arr-3-lh', 'L/H engine', 'PINT'), fld('g500-post-arr-3-rh', 'R/H engine', 'PINT'), fld('g500-post-arr-3-apu', 'APU', 'PINT'),
      ]),
      chk('g500-post-arr-4', 'Ground cable, and static wick covers on wings'),
      note('g500-post-arr-5', 'Put away'),
      measure('g500-post-arr-6', 'Oxygen', [fld('g500-post-arr-6-crew', 'Crew', 'PSI'), fld('g500-post-arr-6-pax', 'Passenger', 'PSI')]),
    ]),
    sec('g500-post-cockpit', 'COCKPIT', [
      note('g500-post-ckpt-1', 'APU hours', { requiredToRelease: false }),
      chk('g500-post-ckpt-2', 'Update APU hours in MyCAMP'),
      chk('g500-post-ckpt-3', 'Cockpit condition & switches'),
      chk('g500-post-ckpt-4', 'Exterior and emergency lights for operation'),
      chk('g500-post-ckpt-5', "Pull SSPC's (water heater group)"),
    ]),
    sec('g500-post-cabin', 'CABIN', [
      chk('g500-post-cab-1', 'Galley and cabin for general operation and condition'),
      chk('g500-post-cab-2', 'Cabin and LAV fire extinguishers'),
      chk('g500-post-cab-3', 'First aid kit, and defib', { reference: 'check for voice prompt' }),
    ]),
    sec('g500-post-fwd', 'FWD FUSELAGE AND NLG', [
      chk('g500-post-fwd-1', 'EVS lens and radome'),
      chk('g500-post-fwd-2', 'NLG strut extension, tires, doors, overtravel indicator, and taxi light condition'),
      chk('g500-post-fwd-3', 'Landing gear blowdown bottle', { reference: '3000 psi' }),
    ]),
    sec('g500-post-wings', 'WINGS', [
      chk('g500-post-wing-1', 'Set flaps to 10 degrees'),
      chk('g500-post-wing-2', 'LH wing'),
      chk('g500-post-wing-3', 'RH wing'),
    ]),
    sec('g500-post-mlg', 'MLG AND WHEELS', [
      chk('g500-post-mlg-1', 'L/H MLG'),
      chk('g500-post-mlg-2', 'L/H wheel well general area, and hydraulic accumulators', { reference: '700 psi' }),
      chk('g500-post-mlg-3', 'R/H MLG'),
      chk('g500-post-mlg-4', 'R/H wheel well general area, and hydraulic accumulators', { reference: '700 psi' }),
    ]),
    sec('g500-post-engpylon', 'ENGINES AND PYLONS', [
      chk('g500-post-engpy-1', 'L/H engine inlet, pylon, cowling and exhaust area'),
      chk('g500-post-engpy-2', 'R/H engine inlet, pylon, cowling and exhaust area'),
    ]),
    sec('g500-post-tail', 'TAIL EXTERIOR', [
      chk('g500-post-tail-1', 'General condition and cleanliness'),
      chk('g500-post-tail-2', 'Static dischargers', { reference: '7 horiz, 1 tail cone' }),
      chk('g500-post-tail-3', 'Access door and ladder secure'),
    ]),
    sec('g500-post-aft', 'AFT EQUIPMENT BAY', [
      chk('g500-post-aft-1', 'General condition and cleanliness'),
      chk('g500-post-aft-2', 'L/H and R/H accumulators', { reference: '1200 psi' }),
      chk('g500-post-aft-3', 'Aux power relay box & EBHA PDB circuit breakers checked'),
      measure('g500-post-aft-4', 'Service replenishers', [fld('g500-post-aft-4-hyd', 'Hydraulic (LD-4)', 'PINT'), fld('g500-post-aft-4-eng', 'Engine (2380)', 'PINT')]),
      chk('g500-post-aft-5', 'Batteries secure (LH, RH & EBHA)'),
    ]),
    sec('g500-post-sumps', 'SUMPS AND STRUTS', [
      chk('g500-post-sump-1', 'Wipe struts (5606) & side braces (LD-4)'),
      chk('g500-post-sump-2', 'Drain fuel sumps and plenums'),
    ]),
    sec('g500-post-closeup', 'CLOSE UP', [
      chk('g500-post-close-1', 'Service potable water'),
      note('g500-post-close-2', 'LAV serviced and cleaned'),
      chk('g500-post-close-3', 'Set flaps to 0 degrees'),
      chk('g500-post-close-4', 'Install smart probe covers, TAT covers, and foam protection covers'),
      chk('g500-post-close-5', 'Interior and exterior cleaning review', { reference: 'REF AOD-20' }),
      chk('g500-post-close-6', 'Check exterior for sealant and paint touch up as required'),
    ]),
  ],
};

export const SEED_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  G650ER_PREFLIGHT, G650ER_POSTFLIGHT, G500_PREFLIGHT, G500_POSTFLIGHT,
];
