import { addDays, addHours, subDays, subHours, format } from 'date-fns';

// ============================================================
// CORE TYPES
// ============================================================

export interface Aircraft {
    tailNumber: string;
    serialNumber: string;
    modelType: string;
    totalHours: number;
    totalCycles: number;
    campSystemId: string;
    currentStatus: 'green' | 'amber' | 'red';
    lastInspection: string;
    nextScheduledMaintenance: string;
    homeBase: string;
}

export interface ATAChapter {
    code: string;
    title: string;
    subSystems: ATASubSystem[];
}

export interface ATASubSystem {
    code: string;
    title: string;
    components: string[];
}

export type SquawkStatus = 'new' | 'deferred' | 'in-work' | 'closed' | 'aog';
export type SquawkPhase = 'preflight' | 'taxi' | 'climb' | 'cruise' | 'descent' | 'approach' | 'landing' | 'postflight' | 'ground';
export type SquawkPriority = 'routine' | 'urgent' | 'aog';

export interface Squawk {
    id: string;
    aircraftTail: string;
    ataCode: string;
    ataTitle: string;
    description: string;
    reportedBy: string;
    reportedByRole: 'pilot' | 'mechanic' | 'inspector';
    reportedAt: Date;
    flightPhase: SquawkPhase;
    status: SquawkStatus;
    priority: SquawkPriority;
    melReference?: string;
    deferralId?: string;
    workOrderId?: string;
    attachments: string[];
    signatureHash?: string;
    additionalData?: Record<string, string>;
}

export type DeferralCategory = 'A' | 'B' | 'C' | 'D';

export interface MELItem {
    melId: string;
    aircraftModel: string;
    ataChapter: string;
    itemTitle: string;
    repairCategory: DeferralCategory;
    operationalProcedures: string;
    maintenanceProcedures: string;
    maxDeferralDays: number;
    isNoGo: boolean;
}

export interface Deferral {
    id: string;
    squawkId: string;
    melReference: string;
    category: DeferralCategory;
    createdAt: Date;
    expiresAt: Date;
    operationalProcedures: string;
    maintenanceProcedures: string;
    mProcedureCompleted: boolean;
    mProcedureSignedBy?: string;
    mProcedureSignedAt?: Date;
    pilotAcknowledged: boolean;
    pilotAcknowledgedAt?: Date;
    status: 'provisional' | 'active' | 'expired' | 'cleared';
    placard: string;
}

export type WOStatus = 'pending' | 'assigned' | 'in-work' | 'qc' | 'closed';
export type WOPriority = 'routine' | 'urgent' | 'aog';
export type TaskSource = 'CAMP' | 'internal';

export interface WorkOrder {
    id: string;
    woNumber: string;
    aircraftTail: string;
    title: string;
    description: string;
    status: WOStatus;
    priority: WOPriority;
    assignedTeamId: string;
    assignedTechIds: string[];
    tasks: WOTask[];
    createdAt: Date;
    dueDate: Date;
    estimatedHours: number;
    predictedHours?: number;
    scheduleRisk?: boolean;
    squawkId?: string;
    notes: string;
}

export interface WOTask {
    id: string;
    campTaskReference?: string;
    source: TaskSource;
    ataCode: string;
    description: string;
    estimatedDuration: number;
    predictedDuration?: number;
    status: 'pending' | 'in-progress' | 'complete';
    assignedTechId?: string;
    inspectorId?: string;
    isRII: boolean;
    ammReference?: string;
    handoverNote?: string;
}

export interface Technician {
    id: string;
    name: string;
    certifications: string[];
    skillLevel: 1 | 2 | 3;
    shift: 'AM' | 'PM' | 'Night';
    team: string;
    clockedIn: boolean;
    currentTaskId?: string;
    avatarInitials: string;
}

export interface TimeLog {
    id: string;
    taskId: string;
    technicianId: string;
    startTime: Date;
    endTime?: Date;
    durationMinutes?: number;
    type: 'work' | 'pause';
    pauseReason?: 'waiting-parts' | 'shift-end' | 'break' | 'tooling' | 'other';
    pauseNote?: string;
}

export interface HandoverRecord {
    id: string;
    taskId: string;
    outgoingTechId: string;
    incomingTechId?: string;
    statusNote: string;
    photoUrl?: string;
    createdAt: Date;
    acknowledgedAt?: Date;
    acknowledged: boolean;
}

export interface PredictiveAlert {
    id: string;
    aircraftTail: string;
    component: string;
    ataCode: string;
    currentHours: number;
    riskThresholdHours: number;
    failureIntervalHours: number;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
    createdAt: Date;
}

// ============================================================
// DEMO DATA GENERATORS (dynamic dates)
// ============================================================

const now = new Date();

// --- FLEET ---
export const demoAircraft: Aircraft[] = [
    {
        tailNumber: 'N1PG',
        serialNumber: 'GA-5501',
        modelType: 'Gulfstream G550',
        totalHours: 8450.2,
        totalCycles: 3200,
        campSystemId: 'CAMP-G550-001',
        currentStatus: 'amber',
        lastInspection: format(subDays(now, 45), 'yyyy-MM-dd'),
        nextScheduledMaintenance: format(addDays(now, 12), 'yyyy-MM-dd'),
        homeBase: 'LUK',
    },
    {
        tailNumber: 'N2PG',
        serialNumber: 'GA-6801',
        modelType: 'Gulfstream G680',
        totalHours: 3200.8,
        totalCycles: 1100,
        campSystemId: 'CAMP-G680-002',
        currentStatus: 'green',
        lastInspection: format(subDays(now, 20), 'yyyy-MM-dd'),
        nextScheduledMaintenance: format(addDays(now, 60), 'yyyy-MM-dd'),
        homeBase: 'LUK',
    },
    {
        tailNumber: 'N3PG',
        serialNumber: 'BD-7501',
        modelType: 'Bombardier Global 7500',
        totalHours: 5100.5,
        totalCycles: 1800,
        campSystemId: 'CAMP-GL75-003',
        currentStatus: 'red',
        lastInspection: format(subDays(now, 10), 'yyyy-MM-dd'),
        nextScheduledMaintenance: format(addDays(now, 2), 'yyyy-MM-dd'),
        homeBase: 'LUK',
    },
];

// --- ATA CODE HIERARCHY ---
export const ataChapters: ATAChapter[] = [
    {
        code: '21', title: 'Air Conditioning',
        subSystems: [
            { code: '21-20', title: 'Distribution', components: ['Cabin Temp Controller', 'Pack Valve', 'Flow Control Valve'] },
            { code: '21-50', title: 'Temperature Control', components: ['Thermostat', 'Mixing Valve', 'Duct Sensor'] },
        ]
    },
    {
        code: '24', title: 'Electrical Power',
        subSystems: [
            { code: '24-20', title: 'AC Generation', components: ['Generator 1', 'Generator 2', 'GCU'] },
            { code: '24-30', title: 'DC Generation', components: ['TRU 1', 'TRU 2', 'Battery'] },
        ]
    },
    {
        code: '28', title: 'Fuel',
        subSystems: [
            { code: '28-20', title: 'Distribution', components: ['Fuel Pump A', 'Fuel Pump B', 'Crossfeed Valve'] },
            { code: '28-40', title: 'Indicating', components: ['Fuel Qty Indicator L', 'Fuel Qty Indicator R'] },
        ]
    },
    {
        code: '32', title: 'Landing Gear',
        subSystems: [
            { code: '32-10', title: 'Main Gear', components: ['Main Gear Actuator L', 'Main Gear Actuator R', 'Downlock'] },
            { code: '32-40', title: 'Wheels & Brakes', components: ['Brake Assembly L', 'Brake Assembly R', 'Anti-Skid'] },
            { code: '32-50', title: 'Steering', components: ['Nose Wheel Steering', 'Shimmy Damper'] },
        ]
    },
    {
        code: '33', title: 'Lights',
        subSystems: [
            { code: '33-10', title: 'Flight Compartment', components: ['Map Light L', 'Map Light R', 'Flood Light'] },
            { code: '33-40', title: 'Exterior', components: ['Landing Light L', 'Landing Light R', 'Nav Light L', 'Nav Light R', 'Beacon', 'Strobe L', 'Strobe R'] },
        ]
    },
    {
        code: '34', title: 'Navigation',
        subSystems: [
            { code: '34-10', title: 'Flight Environment', components: ['ADS-B Out', 'Transponder 1', 'Transponder 2'] },
            { code: '34-50', title: 'Integrated Systems', components: ['FMS 1', 'FMS 2', 'GPS Receiver'] },
        ]
    },
    {
        code: '52', title: 'Doors',
        subSystems: [
            { code: '52-10', title: 'Passenger Doors', components: ['Main Entry Door', 'Emergency Exit'] },
            { code: '52-30', title: 'Cargo Doors', components: ['Aft Baggage Door', 'Fwd Baggage Door'] },
        ]
    },
    {
        code: '73', title: 'Engine Fuel & Control',
        subSystems: [
            { code: '73-10', title: 'Fuel Distribution', components: ['Fuel Control Unit L', 'Fuel Control Unit R'] },
            { code: '73-20', title: 'Controlling', components: ['FADEC L', 'FADEC R'] },
        ]
    },
];

// --- MEL LIBRARY ---
export const melLibrary: MELItem[] = [
    {
        melId: 'MEL-33-40-01',
        aircraftModel: 'Gulfstream G550',
        ataChapter: '33-40',
        itemTitle: 'Landing Light (One Side)',
        repairCategory: 'C',
        operationalProcedures: '(O) Night operations prohibited with single landing light inoperative.',
        maintenanceProcedures: '(M) Deactivate and secure associated circuit breaker. Placard "INOP" adjacent to switch.',
        maxDeferralDays: 10,
        isNoGo: false,
    },
    {
        melId: 'MEL-21-50-01',
        aircraftModel: 'Gulfstream G550',
        ataChapter: '21-50',
        itemTitle: 'Cabin Temperature Controller (One)',
        repairCategory: 'B',
        operationalProcedures: '(O) Manual temperature adjustments required. Brief crew on manual controls.',
        maintenanceProcedures: '(M) Monitor cabin temperature manually. Verify backup system operative.',
        maxDeferralDays: 3,
        isNoGo: false,
    },
    {
        melId: 'MEL-24-30-01',
        aircraftModel: 'Gulfstream G550',
        ataChapter: '24-30',
        itemTitle: 'Battery (Main)',
        repairCategory: 'A',
        operationalProcedures: '(O) N/A — Item is No-Go if both batteries inoperative.',
        maintenanceProcedures: '(M) N/A.',
        maxDeferralDays: 0,
        isNoGo: true,
    },
    {
        melId: 'MEL-34-10-01',
        aircraftModel: 'Gulfstream G550',
        ataChapter: '34-10',
        itemTitle: 'Transponder (One of Two)',
        repairCategory: 'C',
        operationalProcedures: '(O) RVSM operations prohibited. Remaining transponder must be operative.',
        maintenanceProcedures: '(M) Deactivate inoperative transponder. Verify remaining transponder test satisfactory.',
        maxDeferralDays: 10,
        isNoGo: false,
    },
    {
        melId: 'MEL-28-20-01',
        aircraftModel: 'Gulfstream G550',
        ataChapter: '28-20',
        itemTitle: 'Fuel Pump (One of System)',
        repairCategory: 'B',
        operationalProcedures: '(O) Gravity feed confirmed operative. Monitor fuel balance closely.',
        maintenanceProcedures: '(M) Verify gravity feed operative. Deactivate pump circuit breaker.',
        maxDeferralDays: 3,
        isNoGo: false,
    },
];

// --- SQUAWKS ---
export const demoSquawks: Squawk[] = [
    {
        id: 'SQ-001',
        aircraftTail: 'N1PG',
        ataCode: '33-40',
        ataTitle: 'Exterior Lights - Landing Light R',
        description: 'Right landing light inoperative. Noticed during preflight walk-around. Left landing light confirmed operative.',
        reportedBy: 'Capt. Mike Wilson',
        reportedByRole: 'pilot',
        reportedAt: subHours(now, 6),
        flightPhase: 'preflight',
        status: 'deferred',
        priority: 'routine',
        melReference: 'MEL-33-40-01',
        deferralId: 'DEF-001',
        attachments: [],
    },
    {
        id: 'SQ-002',
        aircraftTail: 'N1PG',
        ataCode: '21-50',
        ataTitle: 'Temperature Control - Cabin Temp Controller',
        description: 'Aft cabin temperature not responding to controller input. Auto mode cycling between 68-78°F. Manual mode functional.',
        reportedBy: 'FO Sarah Davis',
        reportedByRole: 'pilot',
        reportedAt: subHours(now, 28),
        flightPhase: 'cruise',
        status: 'in-work',
        priority: 'urgent',
        workOrderId: 'WO-2026-003',
        attachments: [],
        additionalData: { 'tempReading': '78°F oscillating', 'autoMode': 'Cycling' },
    },
    {
        id: 'SQ-003',
        aircraftTail: 'N3PG',
        ataCode: '32-40',
        ataTitle: 'Wheels & Brakes - Brake Assembly L',
        description: 'Left main brake showing signs of excessive wear. Measured brake wear pin at 0.3" remaining (minimum 0.2"). Recommend replacement at next opportunity.',
        reportedBy: 'Capt. Tom Bradley',
        reportedByRole: 'pilot',
        reportedAt: subDays(now, 1),
        flightPhase: 'postflight',
        status: 'new',
        priority: 'urgent',
        attachments: [],
        additionalData: { 'wearPinReading': '0.3 inches', 'minimumAllowed': '0.2 inches' },
    },
    {
        id: 'SQ-004',
        aircraftTail: 'N2PG',
        ataCode: '34-10',
        ataTitle: 'Navigation - Transponder 1',
        description: 'Transponder 1 intermittent. ATC reported altitude readout dropouts on two occasions during descent. Transponder 2 operative.',
        reportedBy: 'Capt. Mike Wilson',
        reportedByRole: 'pilot',
        reportedAt: subDays(now, 3),
        flightPhase: 'descent',
        status: 'deferred',
        priority: 'routine',
        melReference: 'MEL-34-10-01',
        deferralId: 'DEF-002',
        attachments: [],
    },
    {
        id: 'SQ-005',
        aircraftTail: 'N3PG',
        ataCode: '73-20',
        ataTitle: 'Engine Fuel & Control - FADEC R',
        description: 'Right engine FADEC fault caution during climb. Engine parameters remained normal. Fault cleared on reset but reappeared on next flight.',
        reportedBy: 'FO Jake Martinez',
        reportedByRole: 'pilot',
        reportedAt: subHours(now, 4),
        flightPhase: 'climb',
        status: 'aog',
        priority: 'aog',
        workOrderId: 'WO-2026-005',
        attachments: [],
        additionalData: { 'n1': '94.2%', 'n2': '98.1%', 'egt': '712°C', 'oilPress': '52 PSI' },
    },
    {
        id: 'SQ-006',
        aircraftTail: 'N1PG',
        ataCode: '52-10',
        ataTitle: 'Doors - Main Entry Door',
        description: 'Main entry door seal slightly worn at lower hinge area. No pressurization issues noted but seal is visibly compressed.',
        reportedBy: 'Mech. Rodriguez',
        reportedByRole: 'mechanic',
        reportedAt: subDays(now, 5),
        flightPhase: 'ground',
        status: 'closed',
        priority: 'routine',
        workOrderId: 'WO-2026-001',
        attachments: [],
    },
];

// --- DEFERRALS ---
export const demoDeferrals: Deferral[] = [
    {
        id: 'DEF-001',
        squawkId: 'SQ-001',
        melReference: 'MEL-33-40-01',
        category: 'C',
        createdAt: subHours(now, 5),
        expiresAt: addDays(now, 9),
        operationalProcedures: '(O) Night operations prohibited with single landing light inoperative.',
        maintenanceProcedures: '(M) Deactivate and secure associated circuit breaker. Placard "INOP" adjacent to switch.',
        mProcedureCompleted: true,
        mProcedureSignedBy: 'Tech. Rodriguez',
        mProcedureSignedAt: subHours(now, 4),
        pilotAcknowledged: true,
        pilotAcknowledgedAt: subHours(now, 3),
        status: 'active',
        placard: 'RIGHT LANDING LIGHT — INOP',
    },
    {
        id: 'DEF-002',
        squawkId: 'SQ-004',
        melReference: 'MEL-34-10-01',
        category: 'C',
        createdAt: subDays(now, 3),
        expiresAt: addDays(now, 7),
        operationalProcedures: '(O) RVSM operations prohibited. Remaining transponder must be operative.',
        maintenanceProcedures: '(M) Deactivate inoperative transponder. Verify remaining transponder test satisfactory.',
        mProcedureCompleted: true,
        mProcedureSignedBy: 'Tech. Kim',
        mProcedureSignedAt: subDays(now, 2),
        pilotAcknowledged: true,
        pilotAcknowledgedAt: subDays(now, 2),
        status: 'active',
        placard: 'XPDR 1 — INOP / NO RVSM',
    },
];

// --- TECHNICIANS ---
export const demoTechnicians: Technician[] = [
    { id: 'TECH-001', name: 'Carlos Rodriguez', certifications: ['A&P', 'IA'], skillLevel: 3, shift: 'AM', team: 'Airframe', clockedIn: true, currentTaskId: 'TASK-003', avatarInitials: 'CR' },
    { id: 'TECH-002', name: 'James Kim', certifications: ['A&P'], skillLevel: 2, shift: 'AM', team: 'Avionics', clockedIn: true, currentTaskId: 'TASK-005', avatarInitials: 'JK' },
    { id: 'TECH-003', name: 'Maria Santos', certifications: ['A&P', 'IA'], skillLevel: 3, shift: 'PM', team: 'Airframe', clockedIn: false, avatarInitials: 'MS' },
    { id: 'TECH-004', name: 'David Chen', certifications: ['A&P'], skillLevel: 2, shift: 'PM', team: 'Powerplant', clockedIn: false, avatarInitials: 'DC' },
    { id: 'TECH-005', name: 'Ryan Taylor', certifications: ['A&P'], skillLevel: 1, shift: 'AM', team: 'Airframe', clockedIn: true, avatarInitials: 'RT' },
];

// --- WORK ORDERS ---
export const demoWorkOrders: WorkOrder[] = [
    {
        id: 'WO-2026-001',
        woNumber: 'WO-2026-001',
        aircraftTail: 'N1PG',
        title: 'Main Entry Door Seal Replacement',
        description: 'Replace worn door seal at lower hinge area per squawk SQ-006.',
        status: 'closed',
        priority: 'routine',
        assignedTeamId: 'Airframe',
        assignedTechIds: ['TECH-001'],
        createdAt: subDays(now, 4),
        dueDate: subDays(now, 2),
        estimatedHours: 3.0,
        predictedHours: 3.5,
        squawkId: 'SQ-006',
        notes: 'Completed on schedule. New P/N 5501-1234 installed.',
        tasks: [
            { id: 'TASK-001', source: 'internal', ataCode: '52-10', description: 'Remove and replace main entry door seal', estimatedDuration: 3.0, predictedDuration: 3.5, status: 'complete', assignedTechId: 'TECH-001', isRII: false, ammReference: '52-10-00' },
        ],
    },
    {
        id: 'WO-2026-002',
        woNumber: 'WO-2026-002',
        aircraftTail: 'N1PG',
        title: '100 Hour Inspection Package',
        description: 'Scheduled 100 hour inspection per CAMP due list.',
        status: 'assigned',
        priority: 'routine',
        assignedTeamId: 'Airframe',
        assignedTechIds: ['TECH-001', 'TECH-005'],
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 5),
        estimatedHours: 16.0,
        predictedHours: 18.5,
        scheduleRisk: true,
        notes: 'CAMP due items bundled. Parts pre-ordered.',
        tasks: [
            { id: 'TASK-002', campTaskReference: 'CAMP-88901', source: 'CAMP', ataCode: '05-10', description: '100 Hour General Visual Inspection', estimatedDuration: 4.0, predictedDuration: 4.8, status: 'pending', isRII: true, inspectorId: 'TECH-001', ammReference: '05-10-00' },
            { id: 'TASK-003', campTaskReference: 'CAMP-88902', source: 'CAMP', ataCode: '32-40', description: '100hr Brake Assembly Inspection', estimatedDuration: 2.0, predictedDuration: 2.2, status: 'in-progress', assignedTechId: 'TECH-001', isRII: false, ammReference: '32-40-00' },
            { id: 'TASK-004', campTaskReference: 'CAMP-88903', source: 'CAMP', ataCode: '28-20', description: '100hr Fuel Filter Replacement', estimatedDuration: 1.5, predictedDuration: 1.5, status: 'pending', isRII: false, ammReference: '28-20-00' },
            { id: 'TASK-006', source: 'internal', ataCode: '25-10', description: 'Install new cabin WiFi antenna (owner request)', estimatedDuration: 2.0, status: 'pending', isRII: false },
        ],
    },
    {
        id: 'WO-2026-003',
        woNumber: 'WO-2026-003',
        aircraftTail: 'N1PG',
        title: 'Cabin Temp Controller Troubleshoot',
        description: 'Investigate and repair aft cabin temperature controller per squawk SQ-002.',
        status: 'in-work',
        priority: 'urgent',
        assignedTeamId: 'Avionics',
        assignedTechIds: ['TECH-002'],
        createdAt: subHours(now, 24),
        dueDate: addDays(now, 1),
        estimatedHours: 4.0,
        predictedHours: 5.2,
        scheduleRisk: true,
        squawkId: 'SQ-002',
        notes: 'Temp controller PCB may need replacement.',
        tasks: [
            { id: 'TASK-005', source: 'internal', ataCode: '21-50', description: 'Troubleshoot cabin temp controller - aft zone', estimatedDuration: 2.0, predictedDuration: 2.8, status: 'in-progress', assignedTechId: 'TECH-002', isRII: false, ammReference: '21-50-00', handoverNote: 'Controller removed, testing PCB on bench. Connector pins look corroded.' },
        ],
    },
    {
        id: 'WO-2026-004',
        woNumber: 'WO-2026-004',
        aircraftTail: 'N2PG',
        title: 'Transponder 1 Repair',
        description: 'R&R Transponder 1 per MEL deferral DEF-002. Part on order.',
        status: 'pending',
        priority: 'routine',
        assignedTeamId: 'Avionics',
        assignedTechIds: [],
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 5),
        estimatedHours: 3.0,
        predictedHours: 3.0,
        squawkId: 'SQ-004',
        notes: 'Replacement transponder on order from Collins. ETA 3 days.',
        tasks: [
            { id: 'TASK-007', source: 'internal', ataCode: '34-10', description: 'Remove and replace Transponder 1', estimatedDuration: 2.0, predictedDuration: 2.0, status: 'pending', isRII: true, ammReference: '34-10-01' },
            { id: 'TASK-008', source: 'internal', ataCode: '34-10', description: 'Transponder functional test & certification', estimatedDuration: 1.0, predictedDuration: 1.0, status: 'pending', isRII: true, ammReference: '34-10-01' },
        ],
    },
    {
        id: 'WO-2026-005',
        woNumber: 'WO-2026-005',
        aircraftTail: 'N3PG',
        title: 'FADEC Fault Investigation — AOG',
        description: 'Right engine FADEC recurring fault. Aircraft grounded until resolved.',
        status: 'in-work',
        priority: 'aog',
        assignedTeamId: 'Powerplant',
        assignedTechIds: ['TECH-002'],
        createdAt: subHours(now, 3),
        dueDate: addDays(now, 0),
        estimatedHours: 8.0,
        predictedHours: 10.5,
        scheduleRisk: true,
        squawkId: 'SQ-005',
        notes: 'AOG — All resources prioritized. Gulfstream tech support contacted.',
        tasks: [
            { id: 'TASK-009', source: 'internal', ataCode: '73-20', description: 'FADEC fault code download and analysis', estimatedDuration: 1.5, predictedDuration: 2.0, status: 'in-progress', assignedTechId: 'TECH-002', isRII: false, ammReference: '73-20-00' },
            { id: 'TASK-010', source: 'internal', ataCode: '73-20', description: 'FADEC wiring harness inspection', estimatedDuration: 3.0, predictedDuration: 4.0, status: 'pending', isRII: true, ammReference: '73-20-00' },
            { id: 'TASK-011', source: 'internal', ataCode: '73-20', description: 'Engine ground run and FADEC verification', estimatedDuration: 2.0, predictedDuration: 2.5, status: 'pending', isRII: true, ammReference: '73-20-00' },
        ],
    },
];

// --- TIME LOGS ---
export const demoTimeLogs: TimeLog[] = [
    { id: 'TL-001', taskId: 'TASK-001', technicianId: 'TECH-001', startTime: subDays(now, 3), endTime: subDays(subHours(now, 20), 2), durationMinutes: 195, type: 'work' },
    { id: 'TL-002', taskId: 'TASK-003', technicianId: 'TECH-001', startTime: subHours(now, 3), type: 'work' },
    { id: 'TL-003', taskId: 'TASK-005', technicianId: 'TECH-002', startTime: subHours(now, 8), endTime: subHours(now, 5), durationMinutes: 180, type: 'work' },
    { id: 'TL-004', taskId: 'TASK-005', technicianId: 'TECH-002', startTime: subHours(now, 5), endTime: subHours(now, 4), durationMinutes: 60, type: 'pause', pauseReason: 'waiting-parts', pauseNote: 'Waiting for bench test equipment from avionics shop' },
    { id: 'TL-005', taskId: 'TASK-005', technicianId: 'TECH-002', startTime: subHours(now, 4), type: 'work' },
    { id: 'TL-006', taskId: 'TASK-009', technicianId: 'TECH-002', startTime: subHours(now, 2), type: 'work' },
];

// --- HANDOVER RECORDS ---
export const demoHandovers: HandoverRecord[] = [
    {
        id: 'HO-001',
        taskId: 'TASK-005',
        outgoingTechId: 'TECH-002',
        incomingTechId: 'TECH-004',
        statusNote: 'Controller removed from aircraft. PCB on bench in avionics shop. Connector pins at P3 show green corrosion — need cleaning or replacement. Test with multimeter before reassembly.',
        createdAt: subHours(now, 5),
        acknowledgedAt: subHours(now, 4),
        acknowledged: true,
    },
    {
        id: 'HO-002',
        taskId: 'TASK-009',
        outgoingTechId: 'TECH-002',
        statusNote: 'FADEC download complete. 3 recurring fault codes: F-7201, F-7203, F-7210. All point to wiring harness zone 4. Cowling removed starboard side. Waiting for borescope from tooling.',
        createdAt: subHours(now, 1),
        acknowledged: false,
    },
];

// --- PREDICTIVE ALERTS ---
export const demoPredictiveAlerts: PredictiveAlert[] = [
    {
        id: 'PA-001',
        aircraftTail: 'N1PG',
        component: 'Fuel Pump A',
        ataCode: '28-20',
        currentHours: 1150,
        riskThresholdHours: 1200,
        failureIntervalHours: 1350,
        severity: 'high',
        recommendation: 'Schedule Fuel Pump A replacement during upcoming 100hr inspection window. Historical data shows rising failure rate above 1,200 FH for this pump type.',
        createdAt: subDays(now, 1),
    },
    {
        id: 'PA-002',
        aircraftTail: 'N1PG',
        component: 'Starter Generator L',
        ataCode: '24-20',
        currentHours: 3800,
        riskThresholdHours: 4000,
        failureIntervalHours: 4500,
        severity: 'medium',
        recommendation: 'Monitor starter generator brush wear at next inspection. Component entering wear-out phase based on fleet data.',
        createdAt: subDays(now, 3),
    },
    {
        id: 'PA-003',
        aircraftTail: 'N3PG',
        component: 'APU Bleed Valve',
        ataCode: '49-10',
        currentHours: 2200,
        riskThresholdHours: 2500,
        failureIntervalHours: 3000,
        severity: 'low',
        recommendation: 'No immediate action. Trending within normal reliability envelope. Reassess at 2,400 FH.',
        createdAt: subDays(now, 5),
    },
];

// --- ACTIVITY FEED ---
export interface ActivityEvent {
    id: string;
    type: 'squawk' | 'deferral' | 'work-order' | 'clock' | 'handover' | 'sign-off' | 'alert';
    description: string;
    actor: string;
    aircraftTail?: string;
    timestamp: Date;
}

export const demoActivityFeed: ActivityEvent[] = [
    { id: 'EV-01', type: 'squawk', description: 'FADEC fault reported on N3PG — AOG declared', actor: 'FO Jake Martinez', aircraftTail: 'N3PG', timestamp: subHours(now, 4) },
    { id: 'EV-02', type: 'work-order', description: 'WO-2026-005 created: FADEC Fault Investigation (AOG)', actor: 'Maint. Control', aircraftTail: 'N3PG', timestamp: subHours(now, 3) },
    { id: 'EV-03', type: 'clock', description: 'Clocked ON to FADEC fault code download', actor: 'James Kim', aircraftTail: 'N3PG', timestamp: subHours(now, 2) },
    { id: 'EV-04', type: 'deferral', description: 'MEL applied: Right Landing Light (Cat C, 9 days)', actor: 'Tech. Rodriguez', aircraftTail: 'N1PG', timestamp: subHours(now, 5) },
    { id: 'EV-05', type: 'sign-off', description: 'Pilot acknowledged MEL deferral for landing light', actor: 'Capt. Mike Wilson', aircraftTail: 'N1PG', timestamp: subHours(now, 3) },
    { id: 'EV-06', type: 'handover', description: 'Shift handover: Cabin temp controller status to PM shift', actor: 'James Kim', aircraftTail: 'N1PG', timestamp: subHours(now, 5) },
    { id: 'EV-07', type: 'clock', description: 'Clocked ON to 100hr Brake Assembly Inspection', actor: 'Carlos Rodriguez', aircraftTail: 'N1PG', timestamp: subHours(now, 3) },
    { id: 'EV-08', type: 'alert', description: 'Predictive Alert: Fuel Pump A approaching high-failure interval', actor: 'AviaSync Engine', aircraftTail: 'N1PG', timestamp: subDays(now, 1) },
    { id: 'EV-09', type: 'sign-off', description: 'WO-2026-001 closed: Door seal replacement complete', actor: 'Carlos Rodriguez', aircraftTail: 'N1PG', timestamp: subDays(now, 2) },
    { id: 'EV-10', type: 'work-order', description: '100 Hour Inspection Package assigned to AM Shift', actor: 'Maint. Control', aircraftTail: 'N1PG', timestamp: subDays(now, 2) },
];
