import React, { useState } from 'react';
import { useMaintenanceContext } from './contexts/MaintenanceContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import PreFlightDashboard from './PreFlightDashboard';
import QuickSquawkForm from './QuickSquawkForm';
import { Plane, AlertTriangle, FileText } from 'lucide-react';

export default function ElectronicLogbook() {
    const { aircraftConfig } = useMaintenanceContext();

    // Default to first active aircraft or N1PG if config empty (fallback)
    const defaultTail = aircraftConfig.length > 0 ? aircraftConfig[0].tailNumber : 'N651GS';
    const [selectedTail, setSelectedTail] = useState(defaultTail);
    const [activeTab, setActiveTab] = useState('status');

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* HEADER: Aircraft Selection */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Electronic Logbook</h1>
                    <p className="text-muted-foreground">Flight Deck Portal</p>
                </div>
                <div className="w-full md:w-64">
                    <Select value={selectedTail} onValueChange={setSelectedTail}>
                        <SelectTrigger className="h-12 text-lg font-semibold bg-white">
                            <Plane className="w-5 h-5 mr-2" />
                            <SelectValue placeholder="Select Aircraft" />
                        </SelectTrigger>
                        <SelectContent>
                            {aircraftConfig.length > 0 ? (
                                aircraftConfig.filter(ac => ac.isActive).map(ac => (
                                    <SelectItem key={ac.id} value={ac.tailNumber}>{ac.tailNumber}</SelectItem>
                                ))
                            ) : (
                                // Fallbacks if context empty
                                <>
                                    <SelectItem value="N650GS">N650GS</SelectItem>
                                    <SelectItem value="N651GS">N651GS</SelectItem>
                                    <SelectItem value="N652GS">N652GS</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:h-14">
                    <TabsTrigger value="status" className="h-full text-base">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        Pre-Flight Status
                    </TabsTrigger>
                    <TabsTrigger value="report" className="h-full text-base">
                        <FileText className="w-5 h-5 mr-2" />
                        Report Issue
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="status">
                        <PreFlightDashboard tailNumber={selectedTail} />
                    </TabsContent>

                    <TabsContent value="report">
                        <QuickSquawkForm
                            tailNumber={selectedTail}
                            onSuccess={() => setActiveTab('status')} // Auto-switch back to status to see new issue
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
