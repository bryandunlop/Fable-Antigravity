import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { CheckCircle, AlertCircle, Clock, ChevronDown, ChevronRight, Calculator, FileText, Plus, Edit, Plane, Info } from 'lucide-react';
import TaxSettings from './TaxSettings';
import TaxLogicViewer from './TaxLogicViewer';
import TaxReporting from './TaxReporting';
import TripCostManager, { VariableCosts } from './TripCostManager';
import { useTaxContext, TaxProfile } from './contexts/TaxContext';
import MathExplainer from './MathExplainer';
import TaxCalendarView from './TaxCalendarView';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Users, Copy, Calendar as CalendarIcon, MapPin, TrendingUp, Printer } from 'lucide-react';
import ExecutiveSummaryReport from './ExecutiveSummaryReport';


// Types for the mock data
interface MockPassenger {
    id: string;
    name: string;
    tNumber: string;
    band: string; // 'CEO', 'Band 7', 'Standard', 'Guest'
    classification: string;
    siflAmount: number;
    secCost?: number; // Added for SEC Incremental Cost
}

interface MockTaxFlight {
    id: string;
    date: string;
    aircraft: string;
    origin: string;
    destination: string;
    taxOrigin?: string; // For fuel stop overrides
    taxDestination?: string; // For fuel stop overrides
    flightTime: string;
    description: string;
    passengers: MockPassenger[];
    status: 'Verified' | 'Pending Review' | 'Action Required';
    miles: number;
    variableCosts?: VariableCosts;
}

interface TaxTrip {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    legs: MockTaxFlight[];
    status: 'Open' | 'Closed' | 'Archived' | 'Action Required';
}

const mockTrips: TaxTrip[] = [
    {
        id: 'trip1',
        name: 'London Board Meeting',
        startDate: '2024-10-12',
        endDate: '2024-10-15',
        status: 'Closed',
        legs: [
            {
                id: '1',
                date: '2024-10-12',
                aircraft: 'N1PG',
                origin: 'JFK',
                destination: 'LHR',
                flightTime: '6.5h',
                description: 'Outbound Leg',
                passengers: [
                    { id: 'p1', name: 'Executive A', tNumber: 'T-8842', band: 'CEO', classification: 'Business', siflAmount: 0 },
                    { id: 'p2', name: 'Executive B', tNumber: 'T-1193', band: 'Band 7', classification: 'Business', siflAmount: 0 },
                    { id: 'p3', name: 'Guest 1', tNumber: 'N/A', band: 'Guest', classification: 'Personal Entertainment', siflAmount: 3540.00 }
                ],
                status: 'Verified',
                miles: 3451,
                variableCosts: { fuel: 12500, catering: 450, crew: 1200, fees: 800, supplies: 100, total: 15050 }
            },
            {
                id: '2',
                date: '2024-10-15',
                aircraft: 'N1PG',
                origin: 'LHR',
                destination: 'JFK',
                flightTime: '7.1h',
                description: 'Return Leg',
                passengers: [
                    { id: 'p1', name: 'Executive A', tNumber: 'T-8842', band: 'CEO', classification: 'Business', siflAmount: 0 },
                ],
                status: 'Verified',
                miles: 3451
            }
        ]
    },
    {
        id: 'trip2',
        name: 'Bahamas Weekend',
        startDate: '2024-07-20',
        endDate: '2024-07-22',
        status: 'Open',
        legs: [
            {
                id: '3',
                date: '2024-07-20',
                aircraft: 'N5PG',
                origin: 'MIA',
                destination: 'NAS',
                flightTime: '0.9h',
                description: 'Outbound',
                passengers: [
                    { id: 'p4', name: 'Executive C', tNumber: 'T-4421', band: 'Band 7', classification: 'Personal Entertainment', siflAmount: 1450.00 },
                    { id: 'p5', name: 'Spouse C', tNumber: 'N/A', band: 'Guest', classification: 'Personal Entertainment', siflAmount: 1450.00 }
                ],
                status: 'Pending Review',
                miles: 188
            },
            {
                id: '4',
                date: '2024-07-22',
                aircraft: 'N5PG',
                origin: 'NAS',
                destination: 'MIA',
                flightTime: '0.9h',
                description: 'Return',
                passengers: [
                    { id: 'p4', name: 'Executive C', tNumber: 'T-4421', band: 'Band 7', classification: 'Personal Entertainment', siflAmount: 1450.00 },
                    { id: 'p5', name: 'Spouse C', tNumber: 'N/A', band: 'Guest', classification: 'Personal Entertainment', siflAmount: 1450.00 }
                ],
                status: 'Pending Review',
                miles: 188
            }
        ]
    },
    {
        id: 'trip3',
        name: 'West Coast Commute',
        startDate: '2024-05-25',
        endDate: '2024-05-25',
        status: 'Closed',
        legs: [
            {
                id: '5',
                date: '2024-05-25',
                aircraft: 'N2PG',
                origin: 'TEB',
                destination: 'VNY',
                taxOrigin: 'TEB',
                taxDestination: 'VNY',
                flightTime: '5.2h',
                description: 'Commute',
                passengers: [
                    { id: 'p6', name: 'Director D', tNumber: 'T-9932', band: 'Standard', classification: 'Commuting', siflAmount: 450.00 }
                ],
                status: 'Verified',
                miles: 2454
            },
        ]
    },
    {
        id: 'trip4',
        name: 'Aspen Ski Retreat',
        startDate: '2024-01-15',
        endDate: '2024-01-18',
        status: 'Action Required',
        legs: [
            {
                id: '6',
                date: '2024-01-15',
                aircraft: 'N6PG',
                origin: 'DAL',
                destination: 'ASE',
                flightTime: '2.1h',
                description: 'Outbound',
                passengers: [
                    { id: 'p7', name: 'CEO', tNumber: 'T-0001', band: 'CEO', classification: 'Personal Entertainment', siflAmount: 0 },
                    { id: 'p8', name: 'Spouse', tNumber: 'N/A', band: 'Guest', classification: 'Personal Entertainment', siflAmount: 0 },
                    { id: 'p9', name: 'VP Ops', tNumber: 'T-4455', band: 'Band 7', classification: 'Business', siflAmount: 0 }
                ],
                status: 'Action Required',
                miles: 673
            },
            {
                id: '7',
                date: '2024-01-18',
                aircraft: 'N6PG',
                origin: 'ASE',
                destination: 'DAL',
                flightTime: '2.0h',
                description: 'Return',
                passengers: [
                    { id: 'p7', name: 'CEO', tNumber: 'T-0001', band: 'CEO', classification: 'Personal Entertainment', siflAmount: 0 },
                    { id: 'p8', name: 'Spouse', tNumber: 'N/A', band: 'Guest', classification: 'Personal Entertainment', siflAmount: 0 }
                ],
                status: 'Action Required',
                miles: 673
            }
        ]
    },
    {
        id: 'trip5',
        name: 'European Tour',
        startDate: '2023-11-05',
        endDate: '2023-11-12',
        status: 'Archived',
        legs: [
            {
                id: '8',
                date: '2023-11-05',
                aircraft: 'G650',
                origin: 'TEB',
                destination: 'LBG',
                flightTime: '7.2h',
                description: 'Transatlantic',
                passengers: [
                    { id: 'p10', name: 'Chairman', tNumber: 'T-0002', band: 'Band 7', classification: 'Business', siflAmount: 0 },
                    { id: 'p11', name: 'Guest 1', tNumber: 'N/A', band: 'Guest', classification: 'Personal Non-Entertainment', siflAmount: 0 }
                ],
                status: 'Verified',
                miles: 3635
            }
        ]
    }
];

const CATEGORIES = [
    { value: 'Business', label: 'Business' },
    { value: 'Business Entertainment', label: 'Business - Entertainment' },
    { value: 'Personal Entertainment', label: 'Personal - Entertainment' },
    { value: 'Personal Non-Entertainment', label: 'Personal - Non-Entertainment' },
    { value: 'Commuting', label: 'Commuting' }
];

// SIFL Rate Logic
interface SiflRatePeriod {
    startDate: string;
    endDate: string;
    terminalCharge: number;
    rates: {
        short: number; // 0-500 miles
        medium: number; // 501-1500 miles
        long: number; // >1500 miles
    };
}

const SIFL_RATES: SiflRatePeriod[] = [
    {
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        terminalCharge: 54.30,
        rates: { short: 0.2971, medium: 0.2266, long: 0.2178 }
    },
    {
        startDate: '2024-07-01',
        endDate: '2024-12-31',
        terminalCharge: 55.10, // Slight increase for H2
        rates: { short: 0.3015, medium: 0.2300, long: 0.2210 }
    }
];

const getRateForDate = (dateStr: string): SiflRatePeriod => {
    // Default to latest if no match (mock logic)
    const date = new Date(dateStr);
    return SIFL_RATES.find(p => date >= new Date(p.startDate) && date <= new Date(p.endDate)) || SIFL_RATES[SIFL_RATES.length - 1];
};

export default function TaxComplianceDashboard() {
    const [trips, setTrips] = useState<TaxTrip[]>(mockTrips);
    const [selectedFlight, setSelectedFlight] = React.useState<MockTaxFlight | null>(null);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [showExecutiveSummary, setShowExecutiveSummary] = useState(false);
    const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set(['trip1', 'trip2']));

    // Access profiles for dynamic logic
    const { profiles } = useTaxContext();

    // Helper to calculate mock SIFL with breakdown
    const getSiflBreakdown = (classification: string, miles: number, flightDate: string, passengerName: string, flightCosts?: VariableCosts, totalPax: number = 1) => {
        let rate = 0;
        let method = 'Business Exclusion';
        let multiplier = 1.0;
        let secCost = 0;
        const period = getRateForDate(flightDate);

        // Dynamic Profile Lookup
        const profile = profiles.find(p => p.name === passengerName);
        const designation = profile?.designation || 'Standard';

        if (classification === 'Commuting') {
            rate = period.rates.short;
            method = 'Commute Valuation';
            multiplier = 1.0;
        } else if (classification.includes('Personal')) {
            // Simple tier selection based on miles
            if (miles < 500) rate = period.rates.short;
            else if (miles < 1500) rate = period.rates.medium;
            else rate = period.rates.long;

            method = `SIFL Rate (${period.startDate} Period)`;

            // Logic Engine: Apply Multipliers based on Profile
            if (designation === 'Band 7' || designation === 'Board Member') {
                multiplier = 4.0;
            } else if (designation === 'CEO') {
                multiplier = 2.0; // Security study assumption
            }
        }

        const terminalCharge = classification.includes('Personal') ? period.terminalCharge : 0;

        // Rule Engine Logic
        const appliedRules: string[] = [];
        if (classification.includes('Personal')) {
            // Mock Control Employee Logic (In production, check Title/Band)
            // Ideally we'd pass the full passenger object, but for now we mock it based on assumptions or add a param
            // Let's assume for this mock that if miles > 3000 it's a Control Employee for demo purposes, or just random
            if (multiplier > 1.0) appliedRules.push(`Control Employee (${multiplier * 100}%)`);

            // Mock 50% Seating Rule
            // In reality, check if (businessSeats / totalSeats) > 0.5
            // For demo: if miles < 200, assume rule met
            if (miles < 200) {
                appliedRules.push('50% Seating Capacity Rule Met');
                // The rule exempts personal guests if over 50% business
                // adjust total? For now just visual tag.
            }
        }


        const total = (miles * rate * multiplier) + terminalCharge;

        // SEC Incremental Cost Logic
        if (flightCosts && totalPax > 0 && classification.includes('Personal')) {
            secCost = flightCosts.total / totalPax;
        }

        return { rate, method, multiplier, total, miles, terminalCharge, appliedRules, secCost };
    };

    const recalculateSifl = (classification: string, miles: number, date: string, name: string, flightCosts?: VariableCosts, totalPax: number = 1) => {
        return getSiflBreakdown(classification, miles, date, name, flightCosts, totalPax).total;
    };

    const toggleTrip = (tripId: string) => {
        const newExpanded = new Set(expandedTrips);
        if (newExpanded.has(tripId)) {
            newExpanded.delete(tripId);
        } else {
            newExpanded.add(tripId);
        }
        setExpandedTrips(newExpanded);
    };

    const handleRowClick = (flight: MockTaxFlight) => {
        // Deep copy to disconnect from state until saved
        setSelectedFlight(JSON.parse(JSON.stringify(flight)));
        setIsDialogOpen(true);
    };

    const handlePassengerChange = (passengerId: string, info: Partial<MockPassenger>) => {
        if (!selectedFlight) return;
        const updatedPassengers = selectedFlight.passengers.map(p => {
            if (p.id === passengerId) {
                const newP = { ...p, ...info };
                if (info.classification) {
                    newP.siflAmount = recalculateSifl(info.classification, selectedFlight.miles, selectedFlight.date, p.name);
                }
                return newP;
            }
            return p;
        });
        setSelectedFlight({ ...selectedFlight, passengers: updatedPassengers });
    };

    const handleRouteOverride = (field: 'taxOrigin' | 'taxDestination', value: string) => {
        if (!selectedFlight) return;
        setSelectedFlight({ ...selectedFlight, [field]: value });
    };

    const handleCostUpdate = (costs: VariableCosts) => {
        if (!selectedFlight) return;

        // Recalculate SEC cost for passengers
        const totalPax = selectedFlight.passengers.length;
        const newPassengers = selectedFlight.passengers.map(p => {
            // Re-run full breakdown which now includes SEC logic
            const breakdown = getSiflBreakdown(p.classification, selectedFlight.miles, selectedFlight.date, p.name, costs, totalPax);
            return { ...p, siflAmount: breakdown.total, secCost: breakdown.secCost };
        });

        setSelectedFlight({ ...selectedFlight, variableCosts: costs, passengers: newPassengers });
    };

    const handleBulkClassification = (classification: string) => {
        if (!selectedFlight) return;
        const totalPax = selectedFlight.passengers.length;
        const updatedPassengers = selectedFlight.passengers.map(p => {
            const breakdown = getSiflBreakdown(classification, selectedFlight.miles, selectedFlight.date, p.name, selectedFlight.variableCosts, totalPax);
            return { ...p, classification, siflAmount: breakdown.total, secCost: breakdown.secCost };
        });
        setSelectedFlight({ ...selectedFlight, passengers: updatedPassengers });
    };

    const handleSaveChanges = () => {
        if (!selectedFlight) return;

        const updatedTrips = trips.map(trip => ({
            ...trip,
            legs: trip.legs.map(leg => leg.id === selectedFlight.id ? selectedFlight : leg)
        }));

        setTrips(updatedTrips);
        setIsDialogOpen(false);
    };

    const calculateTotalSifl = (flight: MockTaxFlight) => {
        return flight.passengers.reduce((sum, p) => sum + p.siflAmount, 0);
    };

    const handleGenerateReport = () => {
        // Flatten data for CSV
        const headers = ['Trip Name', 'Date', 'Aircraft', 'Origin', 'Destination', 'Flight Time', 'Miles', 'Passenger', 'Classification', 'SIFL Amount'];
        const rows: string[] = [];

        trips.forEach(trip => {
            trip.legs.forEach(leg => {
                leg.passengers.forEach(p => {
                    rows.push([
                        `"${trip.name}"`,
                        leg.date,
                        leg.aircraft,
                        leg.taxOrigin || leg.origin,
                        leg.taxDestination || leg.destination,
                        leg.flightTime,
                        leg.miles,
                        `"${p.name}"`,
                        `"${p.classification}"`,
                        p.siflAmount.toFixed(2)
                    ].join(','));
                });
            });
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'tax_compliance_report_Q4_2024.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Tax Compliance Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage IRS SIFL and SEC Incremental Cost reporting.</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex gap-2">
                        <Button variant="secondary"><Plus className="w-4 h-4 mr-2" /> New Trip</Button>
                        <Button variant="outline"><Calculator className="w-4 h-4 mr-2" /> Run SIFL Calculator</Button>
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" onClick={() => setShowExecutiveSummary(true)} title="Print Executive Summary">
                                <Printer className="w-4 h-4" />
                            </Button>
                            <Button onClick={handleGenerateReport}><FileText className="w-4 h-4 mr-2" /> Generate CSV</Button>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="rules">Rules & Logic</TabsTrigger>
                    <TabsTrigger value="reporting">Reporting</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="glass-panel">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">12</div>
                                <p className="text-xs text-muted-foreground">Flights requiring passenger classification</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-panel">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Deadheads Unassigned</CardTitle>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">3</div>
                                <p className="text-xs text-muted-foreground">Empty legs needing owner allocation</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-panel">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Processed (Q3)</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">45</div>
                                <p className="text-xs text-muted-foreground">Flights fully classified</p>
                            </CardContent>
                        </Card>
                        <Card className="glass-panel">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Est. Imputed Income</CardTitle>
                                <Calculator className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">$12,450</div>
                                <p className="text-xs text-muted-foreground">Current quarter to date</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <Card className="glass-panel">
                                <CardHeader>
                                    <CardTitle>Trip & Flight Activity (Q4 2024)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[30px]"></TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Aircraft</TableHead>
                                                <TableHead>Dept</TableHead>
                                                <TableHead>Arr</TableHead>
                                                <TableHead className="text-right">Miles</TableHead>
                                                <TableHead>Passenger Name</TableHead>
                                                <TableHead>Purpose</TableHead>
                                                <TableHead>Multiple</TableHead>
                                                <TableHead className="text-right">SIFL Amount</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mockTrips.map((trip) => {
                                                const isExpanded = expandedTrips.has(trip.id);
                                                return (
                                                    <React.Fragment key={trip.id}>
                                                        {/* Trip Header Row */}
                                                        <TableRow className="bg-muted/20 hover:bg-muted/30 cursor-pointer" onClick={() => toggleTrip(trip.id)}>
                                                            <TableCell>
                                                                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                            </TableCell>
                                                            <TableCell colSpan={2} className="font-semibold">
                                                                {trip.name}
                                                            </TableCell>
                                                            <TableCell colSpan={6} className="text-muted-foreground text-sm">
                                                                {trip.legs.length} Legs • {trip.startDate} - {trip.endDate}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-medium">
                                                                ${trip.legs.reduce((acc, leg) => acc + calculateTotalSifl(leg), 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs">{trip.status}</Badge>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* Nested Leg Rows */}
                                                        {isExpanded && trip.legs.map((flight) => {
                                                            const isPersonal = flight.passengers.some(p => p.classification.includes('Personal') || p.classification === 'Commuting');
                                                            const totalSifl = calculateTotalSifl(flight);
                                                            const categories = Array.from(new Set(flight.passengers.map(p => p.classification)));

                                                            return (
                                                                <TableRow
                                                                    key={flight.id}
                                                                    className="hover:bg-muted/5 cursor-pointer border-l-4 border-l-transparent text-sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRowClick(flight);
                                                                    }}
                                                                >
                                                                    <TableCell></TableCell> {/* Indent */}
                                                                    <TableCell className="font-medium whitespace-nowrap pl-4">{flight.date}</TableCell>
                                                                    <TableCell>{flight.aircraft}</TableCell>
                                                                    <TableCell>{flight.taxOrigin || flight.origin} {flight.taxOrigin && <Info className="inline w-3 h-3 text-blue-500" />}</TableCell>
                                                                    <TableCell>{flight.taxDestination || flight.destination}</TableCell>
                                                                    <TableCell className="text-right font-mono text-muted-foreground">
                                                                        {flight.miles.toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex flex-col gap-1">
                                                                            {flight.passengers.map((p, i) => (
                                                                                <div key={i} className="text-xs flex items-center gap-2">
                                                                                    <span className="font-medium">{p.name}</span>
                                                                                    {p.band === 'CEO' && <Badge variant="secondary" className="h-4 px-1 text-[9px]">CEO</Badge>}
                                                                                    {p.band === 'Band 7' && <Badge variant="secondary" className="h-4 px-1 text-[9px]">B7</Badge>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {categories.map(cat => (
                                                                                <Badge key={cat} variant="outline" className={
                                                                                    cat.includes('Business') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                                        cat === 'Commuting' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                                            cat.includes('Entertainment') ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                                                                'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                                                                }>
                                                                                    {cat}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className="font-mono text-xs">
                                                                            {flight.passengers.some(p => p.band === 'CEO' && p.classification.includes('Personal')) ? '200%' : 'Standard'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono font-medium">
                                                                        {totalSifl > 0 ? (
                                                                            <span className={isPersonal ? "text-foreground" : "text-muted-foreground"}>
                                                                                ${totalSifl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                            </span>
                                                                        ) : '-'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {flight.status === 'Verified' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                                                        {flight.status === 'Pending Review' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                                                                        {flight.status === 'Action Required' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                        <div>
                            <TaxCalendarView trips={trips} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="configuration">
                    <TaxSettings />
                </TabsContent>

                <TabsContent value="rules">
                    <TaxLogicViewer />
                </TabsContent>

                <TabsContent value="reporting">
                    <TaxReporting />
                </TabsContent>
            </Tabs>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Flight Tax Details</DialogTitle>
                        <DialogDescription>
                            Review and modify tax classifications, override routes, and manage passenger details.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedFlight && (
                        <div className="mt-4 space-y-6">
                            {/* Trip Analysis Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-lg border">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Plane className="w-4 h-4" /> Flight Operations
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Date</Label>
                                            <div className="font-medium text-sm sm:text-base">{selectedFlight.date}</div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Aircraft</Label>
                                            <div className="font-medium text-sm sm:text-base">{selectedFlight.aircraft}</div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Operational Origin</Label>
                                            <div className="font-mono bg-background p-1.5 rounded text-sm">{selectedFlight.origin}</div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Operational Dest</Label>
                                            <div className="font-mono bg-background p-1.5 rounded text-sm">{selectedFlight.destination}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 md:border-l md:pl-6 border-t md:border-t-0 pt-4 md:pt-0">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-500 flex items-center gap-2">
                                        <Edit className="w-4 h-4" /> Tax Overrides
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="tax-origin" className="text-xs font-medium">Taxable Origin</Label>
                                            <Input
                                                id="tax-origin"
                                                defaultValue={selectedFlight.taxOrigin || selectedFlight.origin}
                                                className="h-9 font-mono border-blue-200 focus-visible:ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="tax-dest" className="text-xs font-medium">Taxable Destination</Label>
                                            <Input
                                                id="tax-dest"
                                                defaultValue={selectedFlight.taxDestination || selectedFlight.destination}
                                                className="h-9 font-mono border-blue-200 focus-visible:ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background p-2 rounded border border-dashed">
                                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span className="leading-tight">
                                            Use these fields to merge fuel stops. E.g., if flying A &rarr; B (Fuel) &rarr; C, set Taxable Origin to A and Taxable Dest to C on the first leg (or merge them via trip builder).
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <TripCostManager
                                    flightId={selectedFlight.id}
                                    initialCosts={selectedFlight.variableCosts}
                                    onUpdate={handleCostUpdate}
                                />
                            </div>

                            <Separator />

                            {/* Passenger Manifest Section */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold">Passenger Manifest</h3>
                                        <Badge variant="outline" className="text-muted-foreground">{selectedFlight.passengers.length} Pax</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select onValueChange={handleBulkClassification}>
                                            <SelectTrigger className="h-8 w-[180px] text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3 h-3" />
                                                    <SelectValue placeholder="Bulk Assign Class..." />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.value} value={cat.value} className="text-xs">{cat.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[200px]">Passenger</TableHead>
                                                <TableHead className="w-[200px]">Classification</TableHead>
                                                <TableHead className="text-right">SIFL Amount</TableHead>
                                                <TableHead className="text-right">SEC Cost</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedFlight.passengers.map((passenger) => {
                                                const breakdown = getSiflBreakdown(passenger.classification, selectedFlight.miles, selectedFlight.date, passenger.name, selectedFlight.variableCosts, selectedFlight.passengers.length);
                                                return (
                                                    <TableRow key={passenger.id}>
                                                        <TableCell className="font-medium">
                                                            <HoverCard>
                                                                <HoverCardTrigger asChild>
                                                                    <div className="cursor-help decoration-dotted underline-offset-4 hover:underline">
                                                                        {passenger.name}
                                                                    </div>
                                                                </HoverCardTrigger>
                                                                <HoverCardContent className="w-80">
                                                                    <div className="flex justify-between space-x-4">
                                                                        <div className="space-y-1">
                                                                            <h4 className="text-sm font-semibold">@{passenger.name}</h4>
                                                                            <p className="text-sm text-muted-foreground">
                                                                                {passenger.band} • {passenger.tNumber}
                                                                            </p>
                                                                            <div className="flex items-center pt-2">
                                                                                <MapPin className="mr-2 h-4 w-4 opacity-70" />{" "}
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    Tax Home: Dallas, TX
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center pt-1">
                                                                                <TrendingUp className="mr-2 h-4 w-4 opacity-70" />{" "}
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    YTD SIFL: $24,500
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </HoverCardContent>
                                                            </HoverCard>
                                                            <div className="text-xs text-muted-foreground font-mono">{passenger.tNumber} • {passenger.band}</div>
                                                            {passenger.band === 'CEO' && <Badge className="mt-1 h-3 text-[9px] px-1">CEO</Badge>}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={passenger.classification}
                                                                onValueChange={(val: any) => handlePassengerChange(passenger.id, { classification: val })}
                                                            >
                                                                <SelectTrigger className="h-8 w-full">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {CATEGORIES.map(cat => (
                                                                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {breakdown.appliedRules.map((rule, idx) => (
                                                                    <Badge key={idx} variant="secondary" className="text-[10px] px-1 h-4">{rule}</Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-medium">
                                                            <div className="flex items-center justify-end gap-1">
                                                                ${breakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                <MathExplainer breakdown={breakdown} passengerName={passenger.name} />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-muted-foreground">
                                                            {breakdown.secCost && breakdown.secCost > 0 ? (
                                                                <span className={breakdown.secCost > breakdown.total ? "text-amber-600 font-bold" : ""}>
                                                                    ${breakdown.secCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            ) : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 sticky bottom-0 bg-background pt-2 pb-2 -mx-6 px-6 sm:static sm:bg-transparent sm:pt-0 sm:pb-0 sm:mx-0 sm:px-0 border-t sm:border-t-0">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        {/* Added UI trigger for ExecutiveSummaryReport */}
                        <Button variant="outline" onClick={() => setShowExecutiveSummary(true)} className="px-4 w-full sm:w-auto">
                            <FileText className="w-4 h-4 mr-2" /> View Summary
                        </Button>
                        <Button onClick={handleSaveChanges} className="px-8 w-full sm:w-auto">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {showExecutiveSummary && (
                <ExecutiveSummaryReport trips={trips} onClose={() => setShowExecutiveSummary(false)} />
            )}
        </div>
    );
}
