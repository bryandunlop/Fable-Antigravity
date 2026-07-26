import type {
  TechLogState, Defect, Deferral, Signature, AuditEntry, FlightLog, MaintenanceRelease,
  WorkCard, PartUsage, LaborEntry, RecurringCheck, RecurringCheckAccomplishment,
  IntermittentFault, IntermittentFaultOccurrence, Trip, FlightBriefing,
  MaintenanceProject, TechVacation,
} from '../types';
import { SEED_AIRCRAFT, SEED_PERSONNEL, SEED_MEL_G800 } from './fleet';
import { SEED_MEL } from './mel';
import { SEED_CHECKLIST_TEMPLATES } from './checklistTemplates';
import { computeClockStart, computeRepairDue, DEFAULT_GOVERNING_TIMEZONE } from '../engine/pl25';
import { makeSignature } from '../engine/signing';
import { buildBriefingDisclosure } from '../engine/briefingDisclosure';
import { campForecast } from '../integration/campClient';

/**
 * Builds the seeded demo world. Dates are RELATIVE to "now" so the AMBER aircraft
 * stays mid-clock and the RED aircraft stays grounded whenever the demo is run or reset.
 *   N5PG -> GREEN   N6PG -> AMBER (active deferral mid-clock)   N1PG, N2PG -> RED (open defects)
 *   N3PG -> provisional G800 (no MEL approved)
 * N2PG's AOG is deliberately un-reported (no FIR) so the FIR §8 "Open an FIR?" nudge fires.
 */
export function getDefaultState(referenceNowMs: number = Date.now()): TechLogState {
  const nowMs = referenceNowMs;
  const iso = (msAgo: number) => new Date(nowMs - msAgo).toISOString();
  const H = 3600000, D = 86400000;

  const personnel = SEED_PERSONNEL;
  const pilot = personnel.find(p => p.oid === 'USR001')!;
  const dom = personnel.find(p => p.oid === 'USR002')!;

  const signatures: Signature[] = [];
  const defects: Defect[] = [];
  const deferrals: Deferral[] = [];

  // --- N1PG: RED (open, untriaged airworthiness defect) ---
  const sigN1 = makeSignature({ id: 'sig-seed-d-n1pg', signedEntity: 'DEFECT', signedEntityId: 'd-n1pg', signer: pilot, intentStatement: 'seed', signedAtUtc: iso(3 * H) });
  signatures.push(sigN1);
  defects.push({
    id: 'd-n1pg', aircraftId: 'ac-n1pg', source: 'PIREP', ataChapter: '32',
    description: 'Left main landing gear unsafe indication intermittent on retraction.',
    symptom: 'GEAR amber CAS during climb', severity: 'HIGH', airworthinessAffecting: true,
    status: 'OPEN', reportedByOid: pilot.oid, reportedAtUtc: iso(3 * H), signatureId: sigN1.id,
  });

  // --- N6PG: AMBER (active deferral mid-clock; Cat C, no (M)/placard -> straight to ACTIVE) ---
  const melAmber =
    SEED_MEL.find(m => m.aircraftType === 'G500' && m.category === 'C' && !m.mProcedure) ??
    SEED_MEL.find(m => m.id === 'mel-g500-21-01-01')!;
  const discN6 = iso(2 * D + 8 * H);
  const clockStart = computeClockStart(discN6);
  const due = computeRepairDue(melAmber.category, clockStart, melAmber, { hours: 990.7, cycles: 640 });
  const sigDefN6 = makeSignature({ id: 'sig-seed-d-n6pg', signedEntity: 'DEFECT', signedEntityId: 'd-n6pg', signer: pilot, intentStatement: 'seed', signedAtUtc: discN6 });
  const sigDefrN6 = makeSignature({ id: 'sig-seed-df-n6pg', signedEntity: 'DEFERRAL', signedEntityId: 'df-n6pg', signer: dom, intentStatement: 'seed', signedAtUtc: iso(2 * D + 6 * H) });
  signatures.push(sigDefN6, sigDefrN6);
  defects.push({
    id: 'd-n6pg', aircraftId: 'ac-n6pg', source: 'PIREP', ataChapter: melAmber.ataReference,
    description: `${melAmber.title} — intermittent; deferred under MEL ${melAmber.subItemNumber}.`,
    severity: 'MEDIUM', airworthinessAffecting: true, status: 'DEFERRED',
    reportedByOid: pilot.oid, reportedAtUtc: discN6, signatureId: sigDefN6.id,
  });
  deferrals.push({
    id: 'df-n6pg', defectId: 'd-n6pg', aircraftId: 'ac-n6pg', melItemId: melAmber.id,
    governingMmelRevision: melAmber.mmelRevision, governingEffectiveDate: melAmber.effectiveDate,
    melSubItemNumber: melAmber.subItemNumber, melTitle: melAmber.title, // D36 — frozen at signing
    category: melAmber.category, dayOfDiscoveryUtc: discN6, clockStartDateUtc: clockStart,
    governingTimezone: DEFAULT_GOVERNING_TIMEZONE,
    repairDueDateUtc: due.repairDueDateUtc, usageDueThreshold: due.usageDueThreshold,
    repairIntervalUnit: due.repairIntervalUnit, repairIntervalValue: due.repairIntervalValue,
    restrictionText: melAmber.provisos ?? 'Operate per MEL provisos.',
    placardRequired: false, mProcedureRequired: false, placardInstalled: true,
    placardLocation: melAmber.placardLocation, extensionUsed: false, riiRequired: false,
    melReviewAcknowledged: true, signedByOid: dom.oid, signatureId: sigDefrN6.id, status: 'ACTIVE',
  });

  // --- N2PG: RED (fresh, un-reported AOG — no FIR yet, so the FIR §8 "Open an FIR?" nudge fires) ---
  const discN2 = iso(6 * H);
  const sigN2 = makeSignature({ id: 'sig-seed-d-n2pg', signedEntity: 'DEFECT', signedEntityId: 'd-n2pg', signer: pilot, intentStatement: 'seed', signedAtUtc: discN2 });
  signatures.push(sigN2);
  defects.push({
    id: 'd-n2pg', aircraftId: 'ac-n2pg', source: 'PIREP', ataChapter: '79',
    description: 'No. 2 engine magnetic chip detector warning — metal found on inspection, borescope required.',
    symptom: 'R ENG CHIP CAS in cruise', severity: 'CRITICAL', airworthinessAffecting: true,
    status: 'OPEN', reportedByOid: pilot.oid, reportedAtUtc: discN2, signatureId: sigN2.id,
  });

  // ── Historical ledger (for Journey Log realism + Phase-4 analytics). None of this changes the
  //    current serviceability colors: flights don't affect status, and the extra defects are all
  //    RECTIFIED (cleared) so they leave no open grounding condition. ──
  const fo = personnel.find(p => p.oid === 'USR007')!;     // FO Emily Chen
  const tech = personnel.find(p => p.oid === 'USR008')!;   // Tom Parker (A&P)
  const chiefInsp = personnel.find(p => p.oid === 'USR010')!; // Amanda Brooks (IA, RII)

  const flightLogs: FlightLog[] = [];
  const seedFlight = (i: number, acId: string, daysAgo: number, ftHours: number, opts: Partial<FlightLog> = {}) => {
    const ac = SEED_AIRCRAFT.find(a => a.id === acId)!;
    const base = nowMs - daysAgo * D;
    const outT = new Date(base).toISOString();
    const offT = new Date(base + 15 * 60000).toISOString();
    const onT = new Date(base + (15 + ftHours * 60) * 60000).toISOString();
    const inT = new Date(base + (25 + ftHours * 60) * 60000).toISOString();
    const sig = makeSignature({ id: `sig-fl-${i}`, signedEntity: 'FLIGHT_LOG', signedEntityId: `fl-seed-${i}`, signer: pilot, intentStatement: 'seed', signedAtUtc: inT });
    signatures.push(sig);
    // approximate the airframe snapshot at the time of the leg (current total less time flown since)
    const snapHours = Math.round((ac.airframeTotalHours - daysAgo * 0.4) * 10) / 10;
    flightLogs.push({
      id: `fl-seed-${i}`, aircraftId: acId, sectorSequence: i, flightDateUtc: outT,
      outUtc: outT, offUtc: offT, onUtc: onT, inUtc: inT,
      blockTime: Math.round((ftHours + 0.2) * 10) / 10, flightTime: ftHours,
      landings: 1, cycles: 1, picOid: pilot.oid, sicOid: fo.oid,
      picName: pilot.displayName, sicName: fo.displayName,   // TL-16: frozen crew names
      fuelUplift: 12000, airframeTotalHours: snapHours, airframeTotalCycles: ac.airframeTotalCycles - daysAgo,
      pdfBlobUri: `blob://mygfo-worm/journey/fl-seed-${i}.pdf`, signatureId: sig.id, ...opts,
    });
  };
  // a month of operations across the fleet (a couple of delays for dispatch-reliability)
  seedFlight(1, 'ac-n5pg', 26, 2.1);
  seedFlight(2, 'ac-n5pg', 19, 3.4, { delayCode: 'ATA-34', delayMinutes: 40, delayAtaChapter: '34' });
  seedFlight(3, 'ac-n5pg', 9, 1.8);
  seedFlight(4, 'ac-n2pg', 24, 4.6, { oilUplift: { eng1: 1, eng2: 0.5 } });
  seedFlight(5, 'ac-n2pg', 14, 2.2);
  seedFlight(6, 'ac-n2pg', 5, 3.1, { deIce: { fluidType: 'IV', fluidName: 'Type IV 100/0' } });
  seedFlight(7, 'ac-n1pg', 22, 2.9);
  seedFlight(8, 'ac-n1pg', 12, 5.2, { delayCode: 'WX-71', delayMinutes: 25 });
  seedFlight(9, 'ac-n6pg', 20, 1.5);
  seedFlight(10, 'ac-n6pg', 7, 2.7);

  // Historical RECTIFIED defects (+ their releases) — fuel for defect-trend / MTBUR / dispatch reliability.
  const releases: MaintenanceRelease[] = [];
  const histDefect = (
    i: number, acId: string, ata: string, daysAgo: number, desc: string, work: string, signer = tech,
  ) => {
    const reportedAt = iso(daysAgo * D + 6 * H);
    const clearedAt = iso(daysAgo * D);
    const dSig = makeSignature({ id: `sig-hd-${i}`, signedEntity: 'DEFECT', signedEntityId: `hd-${i}`, signer: pilot, intentStatement: 'seed', signedAtUtc: reportedAt });
    const rSig = makeSignature({ id: `sig-hr-${i}`, signedEntity: 'CRS', signedEntityId: `hr-${i}`, signer: signer, intentStatement: 'seed', signedAtUtc: clearedAt, certNumber: signer.apCertificateNumber });
    signatures.push(dSig, rSig);
    defects.push({
      id: `hd-${i}`, aircraftId: acId, source: 'PIREP', ataChapter: ata, description: desc,
      severity: 'MEDIUM', airworthinessAffecting: true, status: 'RECTIFIED',
      reportedByOid: pilot.oid, reportedAtUtc: reportedAt, rectificationText: work,
      clearedByOid: signer.oid, clearedTsUtc: clearedAt, signatureId: dSig.id,
    });
    releases.push({
      id: `hr-${i}`, aircraftId: acId, signoffType: 'DEFECT_RECTIFICATION', linkedDefectId: `hd-${i}`,
      isGatingDischarge: false, workDescription: work, completionDateUtc: clearedAt,
      returnToServiceStatement: 'The above work was performed and the aircraft is approved for return to service (14 CFR 91.417).',
      certifyingTechOid: signer.oid, apCertificateNumber: signer.apCertificateNumber ?? '', riiRequired: false,
      pdfBlobUri: `blob://mygfo-worm/crs/hr-${i}.pdf`, signatureId: rSig.id,
    });
  };
  histDefect(1, 'ac-n5pg', '34', 18, 'GPS 1 intermittent loss of position', 'Replaced GPS antenna coax; ops check good.');
  histDefect(2, 'ac-n2pg', '21', 30, 'Cabin temp control erratic', 'Recalibrated zone temp sensor; verified.');
  histDefect(3, 'ac-n1pg', '32', 44, 'Nosewheel steering stiff on taxi', 'Serviced steering accumulator; functional check normal.');
  histDefect(4, 'ac-n6pg', '34', 11, 'FMS 2 map drift', 'Loaded latest nav DB; alignment normal.');
  histDefect(5, 'ac-n5pg', '49', 60, 'APU slow to start', 'Cleaned APU fuel control; start times normal.');

  // ── Phase-3 work cards: one completed (with a rotable removal → MTBUR), one open (live execution). ──
  const workCards: WorkCard[] = [];
  const partUsages: PartUsage[] = [];
  const laborEntries: LaborEntry[] = [];

  // Completed corrective WO on N5PG: pack flow control valve replacement (rotable removal).
  {
    const completedAt = iso(15 * D);
    const wcRel = makeSignature({ id: 'sig-wc-rel-1', signedEntity: 'WORK_CARD', signedEntityId: 'rel-wc-1', signer: tech, intentStatement: 'seed', signedAtUtc: completedAt, certNumber: tech.apCertificateNumber });
    signatures.push(wcRel);
    releases.push({
      id: 'rel-wc-1', aircraftId: 'ac-n5pg', signoffType: 'WORKCARD', linkedWorkCardId: 'wc-1',
      isGatingDischarge: false, workDescription: 'WO-21-0231 — replaced pack 1 flow control valve; ops check normal.',
      completionDateUtc: completedAt,
      returnToServiceStatement: 'Work card complied with; aircraft approved for return to service (14 CFR 91.417).',
      certifyingTechOid: tech.oid, apCertificateNumber: tech.apCertificateNumber ?? '', riiRequired: false,
      pdfBlobUri: 'blob://mygfo-worm/crs/rel-wc-1.pdf', signatureId: wcRel.id,
    });
    workCards.push({
      id: 'wc-1', cardNumber: 'WC-1007', woNumber: 'WO-21-0231', aircraftId: 'ac-n5pg', title: 'Air conditioning pack valve replacement',
      ataChapter: '21', description: 'PACK 1 FAULT recurring — replace flow control valve.', source: 'CAMP', headerStatusCode: 0,
      scheduled: false, riiRequired: false, createdAtUtc: iso(17 * D), completedAtUtc: completedAt, completedReleaseId: 'rel-wc-1',
      status: 'COMPLETED',
      steps: [
        { id: 'wc1-s1', seq: 1, text: 'Remove pack 1 flow control valve', done: true },
        { id: 'wc1-s2', seq: 2, text: 'Install replacement valve', done: true },
        { id: 'wc1-s3', seq: 3, text: 'Operational test pack 1 per AMM 21-50-00', done: true },
      ],
    });
    partUsages.push({
      id: 'pu-1', workCardId: 'wc-1', aircraftId: 'ac-n5pg', ataChapter: '21', partNumber: '1159SCB300-1', description: 'Flow control valve',
      serialNumber: 'SN-FCV-44821', qty: 1, isRotable: true,
      removedPartNumber: '1159SCB300-1', removedSerialNumber: 'SN-FCV-31002', removedReason: 'Unscheduled — internal leakage',
      installedAtUtc: completedAt, addedByOid: tech.oid,
    });
    laborEntries.push(
      { id: 'lb-1', workCardId: 'wc-1', techOid: tech.oid, techName: tech.displayName, hours: 3.5, dateUtc: completedAt, description: 'R&R flow control valve' },
      { id: 'lb-2', workCardId: 'wc-1', techOid: chiefInsp.oid, techName: chiefInsp.displayName, hours: 0.5, dateUtc: completedAt, description: 'Ops check verification' },
    );
  }

  // Open scheduled WO on N2PG: MLG 600-hr functional check (RII) — ready for live execution in the demo.
  workCards.push({
    id: 'wc-2', cardNumber: 'WC-1012', woNumber: 'WO-32-0455', aircraftId: 'ac-n2pg', title: 'Main Landing Gear — 600-hr functional check',
    ataChapter: '32', description: 'Scheduled MLG retraction test, inspection, and lubrication.', source: 'CAMP', headerStatusCode: 1,
    forecastRef: 'FC-32-MLG', scheduled: true, riiRequired: true, createdAtUtc: iso(1 * D), status: 'OPEN',
    steps: [
      { id: 'wc2-s1', seq: 1, text: 'Perform MLG retraction test per AMM 32-30-00', done: false },
      { id: 'wc2-s2', seq: 2, text: 'Inspect MLG actuator and downlock for leakage/wear', done: false },
      { id: 'wc2-s3', seq: 3, text: 'Lubricate landing gear per CMM; record grease P/N', done: false, riiRequired: true },
    ],
  });

  // Corrective card on the RED N1PG gear defect — live status tags + categorized labor so the AOG
  // downtime debrief (QM5/D27) answers "why is it down and where has every hour gone" out of the box.
  workCards.push({
    id: 'wc-3', cardNumber: 'WC-1015', aircraftId: 'ac-n1pg', title: 'LMLG unsafe indication — troubleshoot & repair',
    ataChapter: '32', description: 'Corrective — intermittent gear-unsafe indication on retraction.', source: 'MANUAL', headerStatusCode: 1,
    scheduled: false, riiRequired: false, linkedDefectId: 'd-n1pg', createdAtUtc: iso(2.5 * H), status: 'IN_WORK',
    steps: [
      { id: 'wc3-s1', seq: 1, text: 'Interrogate MAU fault history; isolate sensor vs harness', done: true },
      { id: 'wc3-s2', seq: 2, text: 'Replace LMLG uplock proximity sensor', done: false },
      { id: 'wc3-s3', seq: 3, text: 'Gear swing / retraction check per AMM 32-30-00', done: false },
    ],
    statusTags: [
      { tag: 'IN_WORK', atUtc: iso(2.5 * H), byOid: tech.oid },
      { tag: 'WAITING_PARTS', atUtc: iso(1 * H), byOid: tech.oid, note: 'POO — LMLG uplock proximity sensor from Gulfstream Savannah, ETA tomorrow 10:00' },
    ],
  });
  laborEntries.push(
    { id: 'lb-3', workCardId: 'wc-3', techOid: tech.oid, techName: tech.displayName, hours: 1.5, dateUtc: iso(1 * H), description: 'Fault isolation — MAU history + harness continuity', category: 'TROUBLESHOOTING', note: 'Intermittent only under gear load; 1.5 h isolating to the uplock prox sensor with tech ops on the line' },
    { id: 'lb-4', workCardId: 'wc-3', techOid: tech.oid, techName: tech.displayName, hours: 0.5, dateUtc: iso(1 * H), description: 'Sourced replacement sensor, raised purchase order', category: 'PARTS_ORDERING' },
  );

  // ── D28 maintenance planners: packages of work per tail, staged while the aircraft is away. ──
  const ahead = (msAhead: number) => new Date(nowMs + msAhead).toISOString();
  const projects: MaintenanceProject[] = [
    {
      id: 'prj-n2pg-12mo', aircraftId: 'ac-n2pg', name: '12-Month Inspection Package',
      description: 'Annual package: due-list items FC-32-MLG + FC-05 group, plus open cabin squawks.',
      status: 'PLANNING', plannedStartUtc: ahead(10 * D), plannedEndUtc: ahead(14 * D),
      prepItems: [
        { id: 'pi-1a', text: 'Parts ordered', done: true },
        { id: 'pi-1b', text: 'Task cards loaded', done: true },
        { id: 'pi-1c', text: 'Job codes loaded', done: false },
        { id: 'pi-1d', text: 'Tooling staged', done: false },
      ],
      workCardIds: [], campWoRefs: ['WO-05-0490'],
      createdByOid: dom.oid, createdAtUtc: iso(4 * D),
      statusHistory: [{ status: 'PLANNING', atUtc: iso(4 * D), byOid: dom.oid }],
    },
    {
      id: 'prj-n5pg-batt', aircraftId: 'ac-n5pg', name: 'Main battery replacement',
      description: 'Battery reaching calendar limit — change on return to base.',
      status: 'PLANNING', plannedStartUtc: ahead(4 * D), plannedEndUtc: ahead(5 * D),
      prepItems: [
        { id: 'pi-2a', text: 'Parts ordered', done: true },
        { id: 'pi-2b', text: 'Task cards loaded', done: true },
        { id: 'pi-2c', text: 'Job codes loaded', done: true },
        { id: 'pi-2d', text: 'Tooling staged', done: true },
      ],
      workCardIds: [], campWoRefs: [],
      createdByOid: dom.oid, createdAtUtc: iso(6 * D),
      statusHistory: [{ status: 'PLANNING', atUtc: iso(6 * D), byOid: dom.oid }],
    },
    {
      id: 'prj-n6pg-sw', aircraftId: 'ac-n6pg', name: 'Avionics software + nav DB load',
      status: 'PAUSED', pauseReason: 'WAITING_PARTS', pauseNote: 'POO — data-loader cable from GAC Savannah, ETA next week',
      plannedStartUtc: iso(2 * D), plannedEndUtc: ahead(3 * D),
      prepItems: [
        { id: 'pi-3a', text: 'Parts ordered', done: true },
        { id: 'pi-3b', text: 'Task cards loaded', done: true },
      ],
      workCardIds: [], campWoRefs: [],
      createdByOid: dom.oid, createdAtUtc: iso(6 * D),
      statusHistory: [
        { status: 'PLANNING', atUtc: iso(6 * D), byOid: dom.oid },
        { status: 'IN_WORK', atUtc: iso(2 * D), byOid: tech.oid },
        { status: 'PAUSED', atUtc: iso(1 * D), byOid: tech.oid, note: 'POO — data-loader cable from GAC Savannah, ETA next week' },
      ],
    },
    {
      id: 'prj-n1pg-lmlg', aircraftId: 'ac-n1pg', name: 'LMLG sensor R&R (AOG follow-on)',
      description: 'Unplanned — wraps the AOG corrective card so leadership sees it on the plan.',
      status: 'IN_WORK', plannedStartUtc: iso(1 * D), plannedEndUtc: ahead(2 * D),
      prepItems: [{ id: 'pi-4a', text: 'Parts ordered', done: true }],
      workCardIds: ['wc-3'], campWoRefs: [],
      createdByOid: dom.oid, createdAtUtc: iso(3 * H),
      statusHistory: [
        { status: 'PLANNING', atUtc: iso(3 * H), byOid: dom.oid },
        { status: 'IN_WORK', atUtc: iso(2.5 * H), byOid: tech.oid },
      ],
    },
  ];

  // Vacation overlay (demo-local; production reads the myGFO vacation module).
  const techVacations: TechVacation[] = [
    { id: 'vac-1', techOid: tech.oid, startUtc: ahead(6 * D), endUtc: ahead(10 * D), note: 'PTO' },
    { id: 'vac-2', techOid: chiefInsp.oid, startUtc: ahead(12 * D), endUtc: ahead(16 * D), note: 'PTO' },
  ];

  // ── §17.4 recurring dispatch-gating checks. All seeded CURRENT (one DUE_SOON) so colors are unchanged.
  //    Expiry is DERIVED from the latest accomplishment — to demo grounding, add a back-dated check in-app. ──
  const recurringChecks: RecurringCheck[] = [];
  const recurringAccomplishments: RecurringCheckAccomplishment[] = [];
  const activeAc = SEED_AIRCRAFT.filter(a => !a.isProvisional);
  const CHECK_DEFS = [
    { key: 'altstatic', name: 'Altimeter & static system (91.411)', ata: '34', months: 24 },
    { key: 'xpndr', name: 'Transponder test (91.413)', ata: '34', months: 24 },
    { key: 'elt', name: 'ELT inspection & battery (91.207)', ata: '25', months: 12 },
  ];
  activeAc.forEach((ac, ai) => {
    CHECK_DEFS.forEach((def, di) => {
      const cid = `rc-${ac.id}-${def.key}`;
      // Default: accomplished ~120 days ago → comfortably current. N2PG altimeter is back-dated to DUE_SOON.
      const daysAgo = ac.id === 'ac-n2pg' && def.key === 'altstatic' ? def.months * 30 - 5 : 90 + ai * 7 + di * 3;
      const accAt = iso(daysAgo * D);
      const sig = makeSignature({ id: `sig-rc-${ac.id}-${def.key}`, signedEntity: 'RECURRING_CHECK', signedEntityId: `rca-${ac.id}-${def.key}`, signer: dom, intentStatement: 'seed', signedAtUtc: accAt, certNumber: dom.apCertificateNumber });
      signatures.push(sig);
      recurringChecks.push({ id: cid, aircraftId: ac.id, name: def.name, intervalUnit: 'MONTH', intervalValue: def.months, ataChapter: def.ata, active: true, createdAtUtc: iso((daysAgo + 1) * D) });
      recurringAccomplishments.push({ id: `rca-${ac.id}-${def.key}`, checkId: cid, aircraftId: ac.id, accomplishedAtUtc: accAt, accomplishedByOid: dom.oid, airframeHours: ac.airframeTotalHours - daysAgo * 0.3, airframeCycles: ac.airframeTotalCycles - daysAgo, signatureId: sig.id });
    });
  });

  // ── §17.1 intermittent fault (never affects serviceability) ──
  const intermittentFaults: IntermittentFault[] = [
    { id: 'if-1', aircraftId: 'ac-n5pg', ataChapter: '31', title: 'Nuisance MAINT CAS at top of descent', status: 'MONITORING', firstObservedUtc: iso(40 * D), createdByOid: pilot.oid },
  ];
  const intermittentOccurrences: IntermittentFaultOccurrence[] = [
    { id: 'ifo-1', faultId: 'if-1', aircraftId: 'ac-n5pg', observedAtUtc: iso(40 * D), observedByOid: pilot.oid, note: 'CAS appeared ~2 min, self-cleared.' },
    { id: 'ifo-2', faultId: 'if-1', aircraftId: 'ac-n5pg', observedAtUtc: iso(26 * D), observedByOid: fo.oid, note: 'Same CAS, descent into KTEB.' },
    { id: 'ifo-3', faultId: 'if-1', aircraftId: 'ac-n5pg', observedAtUtc: iso(9 * D), observedByOid: pilot.oid, note: 'Recurred; no other indications.' },
  ];

  // ── §17.5 optional trip aggregate over per-sector logs ──
  const trips: Trip[] = [
    {
      id: 'trip-1', tripNumber: 'TRIP-2041', aircraftId: 'ac-n5pg', name: 'KLUK–KTEB–KLUK round trip', status: 'CLOSED',
      flightLogIds: ['fl-seed-1', 'fl-seed-3'],
      legs: [
        { id: 'leg-1a', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB', departureTimeUtc: '2026-05-27T19:00:00Z', arrivalTimeUtc: '2026-05-27T21:10:00Z', fratStatus: 'COMPLETED', fratScore: 11, airportReviewed: true, fuelRequestId: 'fr-seed-1' },
        { id: 'leg-1b', sequence: 2, departureIcao: 'KTEB', arrivalIcao: 'KLUK', departureTimeUtc: '2026-06-13T19:00:00Z', arrivalTimeUtc: '2026-06-13T20:50:00Z', fratStatus: 'COMPLETED', fratScore: 8, airportReviewed: true },
      ],
      createdByOid: pilot.oid, createdAtUtc: iso(26 * D),
    },
    {
      id: 'trip-2', tripNumber: 'TRIP-2050', aircraftId: 'ac-n5pg', name: 'KLUK–KASE–KLUK round trip', status: 'OPEN',
      flightLogIds: [],
      legs: [
        { id: 'leg-2a', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KASE', departureTimeUtc: '2026-06-23T14:30:00Z', arrivalTimeUtc: '2026-06-23T16:35:00Z', fratStatus: 'COMPLETED', fratScore: 14, airportReviewed: true },
        { id: 'leg-2b', sequence: 2, departureIcao: 'KASE', arrivalIcao: 'KLUK', departureTimeUtc: '2026-06-24T15:00:00Z', arrivalTimeUtc: '2026-06-24T17:05:00Z', fratStatus: 'COMPLETED', fratScore: 9, airportReviewed: true },
      ],
      createdByOid: pilot.oid, createdAtUtc: iso(1 * D),
    },
    {
      id: 'trip-3', tripNumber: 'TRIP-2055', aircraftId: 'ac-n5pg', name: 'KTEB–KLUK repositioning', status: 'OPEN',
      flightLogIds: [],
      legs: [
        { id: 'leg-3a', sequence: 1, departureIcao: 'KTEB', arrivalIcao: 'KLUK', departureTimeUtc: '2026-06-23T12:00:00Z', arrivalTimeUtc: '2026-06-23T13:50:00Z', fratStatus: 'COMPLETED', fratScore: 7, airportReviewed: true },
      ],
      createdByOid: pilot.oid, createdAtUtc: iso(2 * D),
    },
    {
      id: 'trip-4', tripNumber: 'TRIP-2060', aircraftId: 'ac-n5pg', name: 'KASE–KLUK positioning (fresh)', status: 'OPEN',
      flightLogIds: [],
      legs: [
        { id: 'leg-4a', sequence: 1, departureIcao: 'KASE', arrivalIcao: 'KLUK', departureTimeUtc: '2026-06-25T15:00:00Z', arrivalTimeUtc: '2026-06-25T17:05:00Z', fratStatus: 'NOT_STARTED', airportReviewed: false },
      ],
      createdByOid: pilot.oid, createdAtUtc: iso(0),
    },
    // Released-to-preflight mirror of scheduling demo trip T-2026-0714 (N2PG, KLUK–KTEB) so the pilot
    // Flight Hub shows a live four-module board out of the box (FRAT + fuel outstanding, N2PG offered
    // to the crew via brief-1 below). Matches seedTrips.ts demo-trip-domestic.
    {
      id: 'trip-0714', tripNumber: 'T-2026-0714', aircraftId: 'ac-n2pg', name: 'KLUK–KTEB morning', status: 'OPEN',
      flightLogIds: [],
      legs: [
        { id: 'leg-0714a', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KTEB', departureTimeUtc: new Date(nowMs + 2 * D).toISOString(), arrivalTimeUtc: new Date(nowMs + 2 * D + 100 * 60000).toISOString(), fratStatus: 'NOT_STARTED', airportReviewed: false },
      ],
      createdByOid: pilot.oid, createdAtUtc: iso(0),
    },
    // Future legs for the D28 planning-calendar flight overlay. The N2PG KDAL day trip deliberately
    // lands INSIDE the 12-month-package window (+10d→+14d) so the aircraft-away warning demos.
    {
      id: 'trip-plan-a', tripNumber: 'T-2026-0721', aircraftId: 'ac-n2pg', name: 'KLUK–KDAL day trip', status: 'OPEN',
      flightLogIds: [],
      legs: [
        { id: 'leg-pa1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KDAL', departureTimeUtc: new Date(nowMs + 12 * D).toISOString(), arrivalTimeUtc: new Date(nowMs + 12 * D + 150 * 60000).toISOString(), fratStatus: 'NOT_STARTED', airportReviewed: false },
        { id: 'leg-pa2', sequence: 2, departureIcao: 'KDAL', arrivalIcao: 'KLUK', departureTimeUtc: new Date(nowMs + 12 * D + 8 * H).toISOString(), arrivalTimeUtc: new Date(nowMs + 12 * D + 8 * H + 140 * 60000).toISOString(), fratStatus: 'NOT_STARTED', airportReviewed: false },
      ],
      createdByOid: pilot.oid, createdAtUtc: iso(0),
    },
    {
      id: 'trip-plan-b', tripNumber: 'T-2026-0717', aircraftId: 'ac-n5pg', name: 'KLUK–KPBI', status: 'OPEN',
      flightLogIds: [],
      legs: [
        { id: 'leg-pb1', sequence: 1, departureIcao: 'KLUK', arrivalIcao: 'KPBI', departureTimeUtc: new Date(nowMs + 8 * D).toISOString(), arrivalTimeUtc: new Date(nowMs + 8 * D + 130 * 60000).toISOString(), fratStatus: 'NOT_STARTED', airportReviewed: false },
      ],
      createdByOid: pilot.oid, createdAtUtc: iso(0),
    },
  ];

  // ── A maintenance flight briefing on N2PG (GREEN), RELEASED and awaiting PIC acknowledgement —
  //    demonstrates the maintenance → pilot handoff out of the box. ──
  const briefRelAt = iso(2 * H);
  const briefRelSig = makeSignature({ id: 'sig-brief-1', signedEntity: 'BRIEFING', signedEntityId: 'brief-1', signer: tech, intentStatement: 'seed', signedAtUtc: briefRelAt, certNumber: tech.apCertificateNumber });
  signatures.push(briefRelSig);
  const g650erPreflight = SEED_CHECKLIST_TEMPLATES.find(t => t.aircraftType === 'G650ER' && t.phase === 'PREFLIGHT')!;
  const briefings: FlightBriefing[] = [
    {
      id: 'brief-1', aircraftId: 'ac-n2pg', preparedByOid: tech.oid, createdAtUtc: iso(3 * H), status: 'RELEASED',
      checklistInstanceId: 'cli-seed-brief-1',
      fuelPlannedLb: 18000, notes: 'Ready for the morning KLUK–KTEB leg. No open items.',
      serviceabilityAtRelease: 'GREEN', releasedAtUtc: briefRelAt, releaseSignatureId: briefRelSig.id,
    },
  ];
  const checklistInstances = [
    {
      id: 'cli-seed-brief-1', aircraftId: 'ac-n2pg', phase: 'PREFLIGHT' as const, templateId: g650erPreflight.id, templateVersion: g650erPreflight.version,
      briefingId: 'brief-1', createdAtUtc: iso(3 * H), signatureId: briefRelSig.id,
      entries: g650erPreflight.sections.flatMap(s => s.items).map(def => ({
        itemDefId: def.id, state: 'DONE' as const, startedByOid: tech.oid, startedAtUtc: iso(3 * H), completedByOid: tech.oid, completedAtUtc: iso(3 * H),
      })),
    },
  ];

  const audit: AuditEntry[] = [
    { id: 'aud-seed-1', actorOid: pilot.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: 'd-n1pg', atUtc: iso(3 * H), summary: 'PIREP N1PG ATA 32 — gear indication' },
    { id: 'aud-seed-brief', actorOid: tech.oid, action: 'BRIEFING_RELEASED', entityType: 'FlightBriefing', entityId: 'brief-1', atUtc: briefRelAt, summary: 'N2PG flight briefing released to crew' },
    { id: 'aud-seed-2', actorOid: pilot.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: 'd-n6pg', atUtc: discN6, summary: `PIREP N6PG ATA ${melAmber.ataReference}` },
    { id: 'aud-seed-3', actorOid: dom.oid, action: 'DEFERRAL_SIGNED', entityType: 'Deferral', entityId: 'df-n6pg', atUtc: iso(2 * D + 6 * H), summary: `Deferred N6PG under MEL ${melAmber.subItemNumber} (Cat ${melAmber.category})` },
    { id: 'aud-seed-4', actorOid: tech.oid, action: 'WORKCARD_COMPLETED', entityType: 'WorkCard', entityId: 'wc-1', atUtc: iso(15 * D), summary: 'N5PG WO-21-0231 complied with — pack valve replaced (RTS)' },
  ];

  // TL-16: the seeded RELEASED briefing carries a real disclosure snapshot, built from the state
  // assembled above at its release instant — so the demo exercises the frozen-content path rather
  // than the legacy "predates snapshotting" caveat.
  {
    const n2pg = SEED_AIRCRAFT.find(a => a.id === 'ac-n2pg')!;
    briefings[0].disclosureAtRelease = buildBriefingDisclosure(
      'ac-n2pg',
      { aircraft: SEED_AIRCRAFT, deferrals, defects, recurringChecks, recurringAccomplishments },
      briefRelAt,
      campForecast(n2pg.serialNumber, { hours: n2pg.airframeTotalHours, cycles: n2pg.airframeTotalCycles }, referenceNowMs)
        .filter(i => i.dueDateUtc)
        .sort((a, b) => (a.dueDateUtc ?? '').localeCompare(b.dueDateUtc ?? ''))
        .slice(0, 3)
        .map(i => ({ ref: i.ref, description: i.description, dueDateUtc: i.dueDateUtc ?? null })),
    ) ?? undefined;
    briefings[0].preparedByName = tech.displayName;
  }

  return {
    aircraft: SEED_AIRCRAFT,
    melItems: [...SEED_MEL, ...SEED_MEL_G800],
    personnel,
    flightLogs,
    defects,
    deferrals,
    releases,
    signatures,
    audit,
    workCards,
    partUsages,
    laborEntries,
    projects,
    techVacations,
    recurringChecks,
    recurringAccomplishments,
    intermittentFaults,
    intermittentOccurrences,
    trips,
    briefings,
    postflights: [],
    checklistTemplates: SEED_CHECKLIST_TEMPLATES,
    checklistInstances,
    coordinationMessages: [
      { id: 'cm-seed-1', aircraftId: 'ac-n2pg', authorOid: tech.oid, text: 'Aircraft fueled and ready for the morning KLUK–KTEB leg.', atUtc: iso(3 * H) },
    ],
    recordNotes: [],
    supersedeConflicts: [],
    pendingApprovals: [],
    dismissedNotifications: [],
    campCorrelation: [],
    integrationEvents: [],
    aogAcks: [],
    currentUserOid: 'USR001',
  };
}
