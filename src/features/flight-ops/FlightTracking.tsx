import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import OOOITimesDisplay from '../../components/OOOITimesDisplay';
import MovementReports from '../../components/MovementReports';
import {
    getMovementEvents,
    getPositionData,
    extractOOOITimes,
    initSatcomService,
    MovementEvent,
    PositionReport
} from '../../services/satcomService';
import {
    Plane,
    RefreshCw,
    Settings,
    MapPin,
    Activity,
    Loader2,
    CheckCircle2,
    Circle
} from 'lucide-react';

export default function FlightTracking() {
    const [movementEvents, setMovementEvents] = useState<MovementEvent[]>([]);
    const [positionReports, setPositionReports] = useState<PositionReport[]>([]);
    const [selectedTail, setSelectedTail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Initialize service with mock data (can be updated with real API key)
    useEffect(() => {
        initSatcomService('', true); // Empty key, use mock data
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch movement events (OOOI times)
            const movements = await getMovementEvents({
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
                endDate: new Date().toISOString()
            });
            setMovementEvents(movements);

            // Fetch position reports
            const positions = await getPositionData({
                startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
                endDate: new Date().toISOString(),
                pageNumber: 1,
                pageSize: 100
            });
            setPositionReports(positions.items);

            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to fetch flight tracking data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const uniqueTails = Array.from(new Set([
        ...movementEvents.map(m => m.tailNumber),
        ...positionReports.map(p => p.tailNumber)
    ]));

    const selectedMovement = selectedTail
        ? movementEvents.find(m => m.tailNumber === selectedTail)
        : null;

    const selectedPositions = selectedTail
        ? positionReports.filter(p => p.tailNumber === selectedTail)
        : positionReports;

    // Get flight status summary
    const activeFlights = movementEvents.filter(m => m.flightStatus !== 'Complete').length;
    const completedFlights = movementEvents.filter(m => m.flightStatus === 'Complete').length;
    const totalReports = positionReports.length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Flight Tracking</h1>
                    <p className="text-muted-foreground">Real-time flight monitoring with OOOI times and movement reports</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        Updated: {lastUpdate.toLocaleTimeString()}
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        variant={autoRefresh ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        <Activity className="w-4 h-4 mr-2" />
                        Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Aircraft</p>
                                <p className="text-2xl font-bold">{uniqueTails.length}</p>
                            </div>
                            <Plane className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Flights</p>
                                <p className="text-2xl font-bold">{activeFlights}</p>
                            </div>
                            <Circle className="w-8 h-8 text-green-500 fill-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold">{completedFlights}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-gray-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Position Reports</p>
                                <p className="text-2xl font-bold">{totalReports}</p>
                            </div>
                            <MapPin className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Aircraft List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Aircraft</CardTitle>
                        <CardDescription>Select aircraft to view details</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px]">
                            <div className="space-y-2">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : uniqueTails.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No aircraft data available</p>
                                    </div>
                                ) : (
                                    uniqueTails.map(tail => {
                                        const movement = movementEvents.find(m => m.tailNumber === tail);
                                        const isActive = movement?.flightStatus !== 'Complete';

                                        return (
                                            <button
                                                key={tail}
                                                onClick={() => setSelectedTail(tail)}
                                                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedTail === tail
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'hover:bg-accent border-border'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Plane className={`w-4 h-4 ${isActive ? 'text-green-500' : ''}`} />
                                                        <span className="font-semibold">{tail}</span>
                                                    </div>
                                                    {isActive && (
                                                        <Badge variant="secondary" className="text-xs bg-green-500">
                                                            Active
                                                        </Badge>
                                                    )}
                                                </div>
                                                {movement && (
                                                    <div className="text-xs mt-1 opacity-90">
                                                        {movement.departureAirport} → {movement.destinationAirport}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Details Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {loading ? (
                        <Card>
                            <CardContent className="flex items-center justify-center py-24">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </CardContent>
                        </Card>
                    ) : selectedMovement ? (
                        <>
                            {/* OOOI Times */}
                            <OOOITimesDisplay
                                tailNumber={selectedMovement.tailNumber}
                                oooi={extractOOOITimes(selectedMovement)}
                                departureAirport={selectedMovement.departureAirport}
                                arrivalAirport={selectedMovement.destinationAirport}
                                flightStatus={selectedMovement.flightStatus}
                            />

                            {/* Fuel Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Fuel Data</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-sm text-muted-foreground mb-1">Fuel Out</div>
                                            <div className="text-xl font-bold">
                                                {selectedMovement.fuelOut ? `${selectedMovement.fuelOut.toLocaleString()} ${selectedMovement.fuelWeightUnits}` : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground mb-1">Fuel Off</div>
                                            <div className="text-xl font-bold">
                                                {selectedMovement.fuelOff ? `${selectedMovement.fuelOff.toLocaleString()} ${selectedMovement.fuelWeightUnits}` : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground mb-1">Fuel On</div>
                                            <div className="text-xl font-bold">
                                                {selectedMovement.fuelOn ? `${selectedMovement.fuelOn.toLocaleString()} ${selectedMovement.fuelWeightUnits}` : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground mb-1">Fuel In</div>
                                            <div className="text-xl font-bold">
                                                {selectedMovement.fuelIn ? `${selectedMovement.fuelIn.toLocaleString()} ${selectedMovement.fuelWeightUnits}` : 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Position Reports for this aircraft */}
                            {selectedPositions.length > 0 && (
                                <MovementReports reports={selectedPositions} />
                            )}
                        </>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                                <Plane className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold mb-2">Select an Aircraft</h3>
                                <p className="text-sm text-muted-foreground">
                                    Choose an aircraft from the list to view OOOI times and movement reports
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* All Movement Reports Tab */}
            {!selectedTail && positionReports.length > 0 && (
                <MovementReports reports={positionReports} />
            )}
        </div>
    );
}
