import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import {
    Plane,
    MapPin,
    Clock,
    Filter,
    Download,
    ArrowUpDown,
    Navigation,
    Radio,
    Fuel
} from 'lucide-react';
import { PositionReport } from '../services/satcomService';

interface MovementReportsProps {
    reports: PositionReport[];
    className?: string;
}

export default function MovementReports({ reports, className = '' }: MovementReportsProps) {
    const [filterTail, setFilterTail] = useState('');
    const [filterType, setFilterType] = useState<string>('all');

    // Get unique tail numbers for filtering
    const uniqueTails = Array.from(new Set(reports.map(r => r.tailNumber)));

    // Get unique movement types
    const movementTypes = Array.from(new Set(reports.map(r => r.movementReportType)));

    // Filter reports
    const filteredReports = reports.filter(report => {
        const matchesTail = !filterTail || report.tailNumber.toLowerCase().includes(filterTail.toLowerCase());
        const matchesType = filterType === 'all' || report.movementReportType === filterType;
        return matchesTail && matchesType;
    });

    // Sort by time (newest first)
    const sortedReports = [...filteredReports].sort((a, b) =>
        new Date(b.timeOfReport).getTime() - new Date(a.timeOfReport).getTime()
    );

    const getReportTypeColor = (type: string) => {
        switch (type) {
            case 'Takeoff':
                return 'bg-blue-500 dark:bg-blue-600 text-white';
            case 'Landing':
                return 'bg-green-500 dark:bg-green-600 text-white';
            case 'Departure':
                return 'bg-purple-500 dark:bg-purple-600 text-white';
            case 'Arrival':
                return 'bg-emerald-500 dark:bg-emerald-600 text-white';
            case 'Position Report':
                return 'bg-slate-500 dark:bg-slate-600 text-white';
            default:
                return 'bg-slate-400 dark:bg-slate-500 text-white';
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return {
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
    };

    const exportToCSV = () => {
        const headers = [
            'Tail Number',
            'Time',
            'Movement Type',
            'Altitude',
            'Speed',
            'Latitude',
            'Longitude',
            'Heading',
            'Fuel',
            'Departure',
            'Destination'
        ];

        const rows = sortedReports.map(report => [
            report.tailNumber,
            report.timeOfReport,
            report.movementReportType,
            report.altitude,
            report.speed,
            report.latitude,
            report.longitude,
            report.heading || '',
            report.fuelQuantity || '',
            report.departureAirport || '',
            report.destinationAirport || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `movement-reports-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Movement Reports</CardTitle>
                        <CardDescription>
                            Chronological timeline of all movement events
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-3 mt-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <Input
                            placeholder="Filter by tail number..."
                            value={filterTail}
                            onChange={(e) => setFilterTail(e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={filterType === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterType('all')}
                        >
                            All
                        </Button>
                        {movementTypes.map(type => (
                            <Button
                                key={type}
                                variant={filterType === type ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterType(type)}
                            >
                                {type}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                    {sortedReports.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No movement reports found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedReports.map((report, index) => {
                                const { time, date } = formatTime(report.timeOfReport);

                                return (
                                    <div
                                        key={`${report.tailNumber}-${report.timeOfReport}-${index}`}
                                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="text-xs text-muted-foreground">{date}</div>
                                                    <div className="text-lg font-bold font-mono">{time}</div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Plane className="w-4 h-4" />
                                                        <span className="font-semibold">{report.tailNumber}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Source: {report.source}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={getReportTypeColor(report.movementReportType)}>
                                                {report.movementReportType}
                                            </Badge>
                                        </div>

                                        {/* Flight Data Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Altitude</div>
                                                <div className="font-medium">{report.altitude.toLocaleString()} ft</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Speed</div>
                                                <div className="font-medium">{report.speed} kts</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Heading</div>
                                                <div className="font-medium flex items-center gap-1">
                                                    <Navigation className="w-3 h-3" />
                                                    {report.heading !== null ? `${report.heading}°` : 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Fuel</div>
                                                <div className="font-medium flex items-center gap-1">
                                                    <Fuel className="w-3 h-3" />
                                                    {report.fuelQuantity !== null ? `${report.fuelQuantity.toLocaleString()} lbs` : 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Route Info */}
                                        {(report.departureAirport || report.destinationAirport) && (
                                            <div className="mt-3 pt-3 border-t">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium">
                                                        {report.departureAirport || '---'}
                                                    </span>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span className="font-medium">
                                                        {report.destinationAirport || '---'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Position Coordinates */}
                                        <div className="mt-2 text-xs text-muted-foreground font-mono">
                                            {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}°
                                            {report.squawkCode && ` • Squawk: ${report.squawkCode}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Summary Footer */}
                <div className="border-t mt-4 pt-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Showing {sortedReports.length} of {reports.length} reports</span>
                        {uniqueTails.length > 0 && (
                            <span>{uniqueTails.length} aircraft</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
