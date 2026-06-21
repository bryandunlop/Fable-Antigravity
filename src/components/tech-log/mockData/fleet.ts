import type { Aircraft, Personnel } from '../types';

export const SEED_AIRCRAFT: Aircraft[] = [
  { id: 'ac-n1pg', tailNumber: 'N1PG', type: 'G650ER', serialNumber: '6260', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 2450.5, airframeTotalCycles: 980 },
  { id: 'ac-n2pg', tailNumber: 'N2PG', type: 'G650ER', serialNumber: '6264', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 2310.2, airframeTotalCycles: 905 },
  { id: 'ac-n5pg', tailNumber: 'N5PG', type: 'G500', serialNumber: '72157', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 1180.0, airframeTotalCycles: 760 },
  { id: 'ac-n6pg', tailNumber: 'N6PG', type: 'G500', serialNumber: '72175', status: 'ACTIVE', isProvisional: false, homeBase: 'KLUK', airframeTotalHours: 990.7, airframeTotalCycles: 640 },
  // Incoming provisional G800 (S/N 88041 known; registration TBD — editable via Admin > Fleet).
  // Expected to replace N1PG/N2PG as they come online (unconfirmed).
  { id: 'ac-g800-1', tailNumber: 'N3PG', type: 'G800', serialNumber: '88041', status: 'PROVISIONAL', isProvisional: true, homeBase: 'KLUK', airframeTotalHours: 12.0, airframeTotalCycles: 6 },
];

// Extends the app's named users (src/lib/mockUsers.ts) with A&P cert + RII authorization.
// OIDs mirror the mockUsers USR00x ids so persona switching lines up.
export const SEED_PERSONNEL: Personnel[] = [
  { oid: 'USR001', displayName: 'Capt. John Smith', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true },
  { oid: 'USR007', displayName: 'FO Emily Chen', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true },
  { oid: 'USR002', displayName: 'Sarah Wilson (DOM)', role: 'MAINTENANCE', apCertificateNumber: 'AP-3490211', riiAuthorized: true, riiAuthorizedAta: ['24', '27', '32', '49'], active: true },
  { oid: 'USR008', displayName: 'Tom Parker', role: 'MAINTENANCE', apCertificateNumber: 'AP-2810773', riiAuthorized: false, riiAuthorizedAta: [], active: true },
  { oid: 'USR009', displayName: 'Kevin Miller', role: 'MAINTENANCE', apCertificateNumber: 'AP-3155902', riiAuthorized: false, riiAuthorizedAta: [], active: true },
  { oid: 'USR010', displayName: 'Amanda Brooks (Chief Insp.)', role: 'MAINTENANCE', apCertificateNumber: 'IA-7781234', riiAuthorized: true, riiAuthorizedAta: ['24', '27', '32', '49', '52'], active: true },
];

export const PILOT_OIDS = ['USR001', 'USR007'];
export const MAINT_OIDS = ['USR002', 'USR008', 'USR009', 'USR010'];
