import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Settings, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useMaintenanceContext, AircraftConfig, FacilityCheckConfig, AircraftStatusConfig, AdditionalNoteConfig } from './contexts/MaintenanceContext';
import { toast } from 'sonner';

interface MaintenanceSettingsProps {
    onBack?: () => void;
}

export default function MaintenanceSettings({ onBack }: MaintenanceSettingsProps) {
    const {
        aircraftConfig, updateAircraftConfig,
        facilityCheckConfig, updateFacilityCheckConfig,
        aircraftStatusConfig, updateAircraftStatusConfig,
        additionalNoteConfig, updateAdditionalNoteConfig
    } = useMaintenance();

    // Local state for edits
    const [localAircraft, setLocalAircraft] = useState<AircraftConfig[]>([]);
    const [localFacility, setLocalFacility] = useState<FacilityCheckConfig[]>([]);
    const [localStatus, setLocalStatus] = useState<AircraftStatusConfig[]>([]);
    const [localNotes, setLocalNotes] = useState<AdditionalNoteConfig[]>([]);

    // Sync on mount
    useEffect(() => {
        setLocalAircraft(aircraftConfig);
        setLocalFacility(facilityCheckConfig);
        setLocalStatus(aircraftStatusConfig);
        setLocalNotes(additionalNoteConfig);
    }, [aircraftConfig, facilityCheckConfig, aircraftStatusConfig, additionalNoteConfig]);

    const handleSave = () => {
        updateAircraftConfig(localAircraft);
        updateFacilityCheckConfig(localFacility);
        updateAircraftStatusConfig(localStatus);
        updateAdditionalNoteConfig(localNotes);
        toast.success("All configurations saved successfully!");
        if (onBack) onBack();
    };

    // Generic handlers for array updates
    const updateItem = <T extends { id: string }>(
        setList: React.Dispatch<React.SetStateAction<T[]>>,
        id: string,
        field: keyof T,
        value: any
    ) => {
        setList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const deleteItem = <T extends { id: string }>(
        setList: React.Dispatch<React.SetStateAction<T[]>>,
        id: string
    ) => {
        setList(prev => prev.filter(item => item.id !== id));
    };

    const addItem = <T,>(
        setList: React.Dispatch<React.SetStateAction<T[]>>,
        newItem: T
    ) => {
        setList(prev => [...prev, newItem]);
    };

    // Specific add handlers
    const addAircraft = () => addItem(setLocalAircraft, { id: `AC-${Date.now()}`, tailNumber: 'New Aircraft', isActive: true });
    const addFacility = () => addItem(setLocalFacility, { id: `FC-${Date.now()}`, label: 'New Check', isActive: true });
    const addStatus = () => addItem(setLocalStatus, { id: `AS-${Date.now()}`, value: 'New Status', isActive: true });
    const addNote = () => addItem(setLocalNotes, { id: `AN-${Date.now()}`, label: 'New Note Section', isActive: true });

    return (
        <div className="p-6 max-w-5xl mx-auto animation-fade-in space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Settings className="w-6 h-6" />
                        Configure Maintenance Form
                    </h1>
                    <p className="text-muted-foreground">Manage fleet, checklists, statuses, and form fields</p>
                </div>
                <div className="flex gap-2">
                    {onBack && (
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    )}
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FLEET CONFIGURATION */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle>Fleet Configuration</CardTitle>
                            <CardDescription>Manage tracked aircraft</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={addAircraft}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                        {localAircraft.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                                <Checkbox
                                    checked={item.isActive}
                                    onCheckedChange={(checked) => updateItem(setLocalAircraft, item.id, 'isActive', checked)}
                                />
                                <Input
                                    value={item.tailNumber}
                                    onChange={(e) => updateItem(setLocalAircraft, item.id, 'tailNumber', e.target.value)}
                                    className="flex-1"
                                />
                                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => deleteItem(setLocalAircraft, item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* FACILITY CHECKLIST */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle>Facility Checklist</CardTitle>
                            <CardDescription>Items to check each shift</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={addFacility}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                        {localFacility.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                                <Checkbox
                                    checked={item.isActive}
                                    onCheckedChange={(checked) => updateItem(setLocalFacility, item.id, 'isActive', checked)}
                                />
                                <Input
                                    value={item.label}
                                    onChange={(e) => updateItem(setLocalFacility, item.id, 'label', e.target.value)}
                                    className="flex-1"
                                />
                                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => deleteItem(setLocalFacility, item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* AIRCRAFT STATUS OPTIONS */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle>Status Options</CardTitle>
                            <CardDescription>Available status dropdown choices</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={addStatus}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                        {localStatus.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                                <Checkbox
                                    checked={item.isActive}
                                    onCheckedChange={(checked) => updateItem(setLocalStatus, item.id, 'isActive', checked)}
                                />
                                <Input
                                    value={item.value}
                                    onChange={(e) => updateItem(setLocalStatus, item.id, 'value', e.target.value)}
                                    className="flex-1"
                                />
                                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => deleteItem(setLocalStatus, item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* ADDITIONAL NOTE FIELDS */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle>Note Sections</CardTitle>
                            <CardDescription>Additional text areas on form</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={addNote}><Plus className="w-4 h-4" /></Button>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                        {localNotes.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
                                <Checkbox
                                    checked={item.isActive}
                                    onCheckedChange={(checked) => updateItem(setLocalNotes, item.id, 'isActive', checked)}
                                />
                                <Input
                                    value={item.label}
                                    onChange={(e) => updateItem(setLocalNotes, item.id, 'label', e.target.value)}
                                    className="flex-1"
                                />
                                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => deleteItem(setLocalNotes, item.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
