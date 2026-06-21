import type { TechLogState, Defect, Deferral, Signature, AuditEntry } from '../types';
import { SEED_AIRCRAFT, SEED_PERSONNEL, SEED_MEL_G800 } from './fleet';
import { SEED_MEL } from './mel';
import { computeClockStart, computeRepairDue } from '../engine/pl25';
import { makeSignature } from '../engine/signing';

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

  const audit: AuditEntry[] = [
    { id: 'aud-seed-1', actorOid: pilot.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: 'd-n1pg', atUtc: iso(3 * H), summary: 'PIREP N1PG ATA 32 — gear indication' },
    { id: 'aud-seed-2', actorOid: pilot.oid, action: 'DEFECT_REPORTED', entityType: 'Defect', entityId: 'd-n6pg', atUtc: discN6, summary: `PIREP N6PG ATA ${melAmber.ataReference}` },
    { id: 'aud-seed-3', actorOid: dom.oid, action: 'DEFERRAL_SIGNED', entityType: 'Deferral', entityId: 'df-n6pg', atUtc: iso(2 * D + 6 * H), summary: `Deferred N6PG under MEL ${melAmber.subItemNumber} (Cat ${melAmber.category})` },
  ];

  return {
    aircraft: SEED_AIRCRAFT,
    melItems: [...SEED_MEL, ...SEED_MEL_G800],
    personnel,
    flightLogs: [],
    defects,
    deferrals,
    releases: [],
    signatures,
    audit,
    currentUserOid: 'USR001',
  };
}
