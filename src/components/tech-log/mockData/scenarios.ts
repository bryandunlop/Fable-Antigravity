import type {
  TechLogState, Defect, Deferral, Signature, AuditEntry, FlightLog, MaintenanceRelease,
  WorkCard, PartUsage, LaborEntry, RecurringCheck, RecurringCheckAccomplishment,
  IntermittentFault, IntermittentFaultOccurrence, Trip, FlightBriefing,
} from '../types';
import { SEED_AIRCRAFT, SEED_PERSONNEL, SEED_MEL_G800 } from './fleet';
import { SEED_MEL } from './mel';
import { computeClockStart, computeRepairDue } from '../engine/pl25';
import { makeSignature } from '../engine/signing';
import { DEFAULT_PREFLIGHT_CHECKLIST } from '../constants';

/**
 * Builds the seeded demo world. Dates are RELATIVE to "now" so the AMBER aircraft
 * stays mid-clock and the RED aircraft stays grounded whenever the demo is run or reset.
 *   N5PG, N2PG -> GREEN   N6PG -> AMBER (active deferral mid-clock)   N1PG -> RED (open defect)
 *   N3PG -> provisional G800 (no MEL approved)
 */
export function getDefaultState(): TechLogState {
  const nowMs = Date.now();
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
    category: melAmber.category, dayOfDiscoveryUtc: discN6, clockStartDateUtc: clockStart,
    repairDueDateUtc: due.repairDueDateUtc, usageDueThreshold: due.usageDueThreshold,
    repairIntervalUnit: due.repairIntervalUnit, repairIntervalValue: due.repairIntervalValue,
    restrictionText: melAmber.provisos ?? 'Operate per MEL provisos.',
    placardRequired: false, mProcedureRequired: false, placardInstalled: true,
    placardLocation: melAmber.placardLocation, extensionUsed: false, riiRequired: false,
    melReviewAcknowledged: true, signedByOid: dom.oid, signatureId: sigDefrN6.id, status: 'ACTIVE',
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
      { id: 'lb-1', workCardId: 'wc-1', techOid: tech.oid, hours: 3.5, dateUtc: completedAt, description: 'R&R flow control valve' },
      { id: 'lb-2', workCardId: 'wc-1', techOid: chiefInsp.oid, hours: 0.5, dateUtc: completedAt, description: 'Ops check verification' },
    );
  }

  // Open scheduled WO on N2PG: MLG 600-hr functional check (RII) — ready for live execution in the demo.
  workCards.push({
    id: 'wc-2', cardNumber: 'WC-1012', woNumber: 'WO-32-0455', aircraftId: 'ac-n2pg', title: 'Main Landing Gear — 600-hr functional check',
    ataChapter: '32', description: 'Scheduled MLG retraction test, inspection, and lubrication.', source: 'CAMP', headerStatusCode: 1,
    scheduled: true, riiRequired: true, createdAtUtc: iso(1 * D), status: 'OPEN',
    steps: [
      { id: 'wc2-s1', seq: 1, text: 'Perform MLG retraction test per AMM 32-30-00', done: false },
      { id: 'wc2-s2', seq: 2, text: 'Inspect MLG actuator and downlock for leakage/wear', done: false },
      { id: 'wc2-s3', seq: 3, text: 'Lubricate landing gear per CMM; record grease P/N', done: false, riiRequired: true },
    ],
  });

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
    { id: 'trip-1', tripNumber: 'TRIP-2041', aircraftId: 'ac-n5pg', name: 'KLUK–KTEB–KLUK round trip', status: 'CLOSED', flightLogIds: ['fl-seed-1', 'fl-seed-3'], createdByOid: pilot.oid, createdAtUtc: iso(26 * D) },
  ];

  // ── A maintenance flight briefing on N2PG (GREEN), RELEASED and awaiting PIC acknowledgement —
  //    demonstrates the maintenance → pilot handoff out of the box. ──
  const briefRelAt = iso(2 * H);
  const briefRelSig = makeSignature({ id: 'sig-brief-1', signedEntity: 'BRIEFING', signedEntityId: 'brief-1', signer: tech, intentStatement: 'seed', signedAtUtc: briefRelAt, certNumber: tech.apCertificateNumber });
  signatures.push(briefRelSig);
  const briefings: FlightBriefing[] = [
    {
      id: 'brief-1', aircraftId: 'ac-n2pg', preparedByOid: tech.oid, createdAtUtc: iso(3 * H), status: 'RELEASED',
      checklist: DEFAULT_PREFLIGHT_CHECKLIST.map((c, i) => ({ id: `brc-${i}`, text: c.text, mandatory: c.mandatory, done: true, source: 'TEMPLATE' as const })),
      fuelPlannedLb: 18000, notes: 'Ready for the morning KLUK–KTEB leg. No open items.',
      serviceabilityAtRelease: 'GREEN', releasedAtUtc: briefRelAt, releaseSignatureId: briefRelSig.id,
    },
  ];

  const audit: AuditEntry[] = [
    { id: 'aud-seed-1', actorOid: pilot.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: 'd-n1pg', atUtc: iso(3 * H), summary: 'PIREP N1PG ATA 32 — gear indication' },
    { id: 'aud-seed-brief', actorOid: tech.oid, action: 'BRIEFING_RELEASED', entityType: 'FlightBriefing', entityId: 'brief-1', atUtc: briefRelAt, summary: 'N2PG flight briefing released to crew' },
    { id: 'aud-seed-2', actorOid: pilot.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: 'd-n6pg', atUtc: discN6, summary: `PIREP N6PG ATA ${melAmber.ataReference}` },
    { id: 'aud-seed-3', actorOid: dom.oid, action: 'DEFERRAL_SIGNED', entityType: 'Deferral', entityId: 'df-n6pg', atUtc: iso(2 * D + 6 * H), summary: `Deferred N6PG under MEL ${melAmber.subItemNumber} (Cat ${melAmber.category})` },
    { id: 'aud-seed-4', actorOid: tech.oid, action: 'WORKCARD_COMPLETED', entityType: 'WorkCard', entityId: 'wc-1', atUtc: iso(15 * D), summary: 'N5PG WO-21-0231 complied with — pack valve replaced (RTS)' },
  ];

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
    recurringChecks,
    recurringAccomplishments,
    intermittentFaults,
    intermittentOccurrences,
    trips,
    briefings,
    postflights: [],
    dismissedNotifications: [],
    campCorrelation: [],
    integrationEvents: [],
    currentUserOid: 'USR001',
  };
}
