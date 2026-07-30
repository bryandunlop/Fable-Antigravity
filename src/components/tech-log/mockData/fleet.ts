import type { Aircraft, Personnel, MelItem } from '../types';

export const SEED_AIRCRAFT: Aircraft[] = [
  { id: 'ac-n1pg', tailNumber: 'N1PG', type: 'G650ER', serialNumber: '6260', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 2450.5, airframeTotalCycles: 980, standbyFuelLoadLb: 8000 },
  { id: 'ac-n2pg', tailNumber: 'N2PG', type: 'G650ER', serialNumber: '6264', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 2310.2, airframeTotalCycles: 905, standbyFuelLoadLb: 8000 },
  { id: 'ac-n5pg', tailNumber: 'N5PG', type: 'G500', serialNumber: '72157', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 1180.0, airframeTotalCycles: 760, standbyFuelLoadLb: 6000 },
  { id: 'ac-n6pg', tailNumber: 'N6PG', type: 'G500', serialNumber: '72175', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 990.7, airframeTotalCycles: 640, standbyFuelLoadLb: 6000 },
  { id: 'ac-n7pg', tailNumber: 'N7PG', type: 'G500', serialNumber: '72188', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 640.3, airframeTotalCycles: 410, standbyFuelLoadLb: 6000 },
  // Incoming provisional G800 (S/N 88041 known; registration TBD — editable via Admin > Fleet).
  // Expected to replace N1PG/N2PG as they come online (unconfirmed).
  { id: 'ac-g800-1', tailNumber: 'N3PG', type: 'G800', serialNumber: '88041', status: 'PROVISIONAL', isProvisional: true, homeBase: 'KLUK', airframeTotalHours: 12.0, airframeTotalCycles: 6, standbyFuelLoadLb: 8000 },
];

// Extends the app's named users (src/lib/mockUsers.ts) with A&P cert + RII authorization.
// OIDs mirror the mockUsers USR00x ids so persona switching lines up.
export const SEED_PERSONNEL: Personnel[] = [
  { oid: 'USR001', displayName: 'Capt. John Smith', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], crewDeferralAuthorized: true, placardAuthorized: true, isSupervisor: true, active: true }, // acting Chief Pilot
  { oid: 'USR007', displayName: 'FO Emily Chen', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true },
  { oid: 'USR002', displayName: 'Sarah Wilson (DOM)', role: 'MAINTENANCE', apCertificateNumber: 'AP-3490211', riiAuthorized: true, riiAuthorizedAta: ['24', '27', '32', '49'], isSupervisor: true, active: true },
  { oid: 'USR008', displayName: 'Tom Parker', role: 'MAINTENANCE', apCertificateNumber: 'AP-2810773', riiAuthorized: false, riiAuthorizedAta: [], active: true },
  { oid: 'USR009', displayName: 'Kevin Miller', role: 'MAINTENANCE', apCertificateNumber: 'AP-3155902', riiAuthorized: false, riiAuthorizedAta: [], active: true },
  { oid: 'USR010', displayName: 'Amanda Brooks (Chief Insp.)', role: 'MAINTENANCE', apCertificateNumber: 'IA-7781234', riiAuthorized: true, riiAuthorizedAta: ['24', '27', '32', '49', '52'], isSupervisor: true, active: true },
];

export const PILOT_OIDS = ['USR001', 'USR007'];
export const MAINT_OIDS = ['USR002', 'USR008', 'USR009', 'USR010'];

// Draft G800 D195 content — PENDING_FSDO. Viewable but deferrals are blocked until approved.
// Used to demo the provisional-MEL block and the type-onboarding (approve -> activate) flow.
const G800 = { aircraftType: 'G800' as const, mmelRevision: 'Draft R0', effectiveDate: '2027-01-01', approvalState: 'PENDING_FSDO' as const };
export const SEED_MEL_G800: MelItem[] = [
  { id: 'mel-g800-21-01-01', ...G800, ataReference: '21', itemNumber: '21-01', subItemNumber: '21-01-01', title: 'Cabin Pressure Control System', category: 'C', numberInstalled: 2, numberRequired: 1, mProcedure: 'Per draft G800 MEL (M) procedure.', provisos: 'Draft — pending FSDO approval.', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10 },
  { id: 'mel-g800-24-02-01', ...G800, ataReference: '24', itemNumber: '24-02', subItemNumber: '24-02-01', title: 'APU Generator', category: 'B', numberInstalled: 1, numberRequired: 0, mProcedure: 'Pull and collar APU GCU.', provisos: 'Draft — pending FSDO approval.', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 3 },
  { id: 'mel-g800-32-41-01', ...G800, ataReference: '32', itemNumber: '32-41', subItemNumber: '32-41-01', title: 'Brake Temperature Monitoring', category: 'C', numberInstalled: 2, numberRequired: 1, provisos: 'Draft — pending FSDO approval.', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 10 },
  { id: 'mel-g800-33-51-01', ...G800, ataReference: '33', itemNumber: '33-51', subItemNumber: '33-51-01', title: 'Cabin Reading Lights', category: 'D', numberInstalled: 12, numberRequired: 8, provisos: 'Draft — pending FSDO approval.', placardLocation: 'At affected seat', repairIntervalUnit: 'CALENDAR_DAY', repairIntervalValue: 120 },
  { id: 'mel-g800-34-12-01', ...G800, ataReference: '34', itemNumber: '34-12', subItemNumber: '34-12-01', title: 'Standby Attitude Indicator', category: 'A', numberInstalled: 1, numberRequired: 1, provisos: 'Draft — pending FSDO approval; per proviso.' },
];
