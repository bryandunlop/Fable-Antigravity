import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Save, RefreshCw } from "lucide-react";
import { useTaxContext, SIFLRates } from "./contexts/TaxContext";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import PassengerProfileManager from './PassengerProfileManager';

// Mock Historical Rates for Display
const SIFL_RATES_HISTORY = [
    { period: '2024 Period 2 (Jul-Dec)', term: 55.10, s: 0.3015, m: 0.2300, l: 0.2210 },
    { period: '2024 Period 1 (Jan-Jun)', term: 54.30, s: 0.2971, m: 0.2266, l: 0.2178 },
    { period: '2023 Period 2 (Jul-Dec)', term: 52.98, s: 0.2845, m: 0.2169, l: 0.2085 },
];

export default function TaxSettings() {
    const { currentRates, updateRates } = useTaxContext();
    const [formData, setFormData] = useState<SIFLRates>(currentRates);

    const handleChange = (field: string, value: string) => {
        // ... (keep existing logic if needed, or simplify)
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent as keyof SIFLRates] as any,
                    [child]: parseFloat(value) || 0
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: field === 'effectiveDate' ? value : parseFloat(value) || 0
            }));
        }
    };

    const handleSave = () => {
        updateRates(formData);
        toast.success("SIFL Rates Updated Successfully");
    };

    return (
        <div className="space-y-6">
            {/* Historical Rates Table - NEW for visibility */}
            <Card className="glass-panel">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Historical SIFL Rates</CardTitle>
                            <CardDescription>Reference rates used for past flight calculations.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2">
                            <RefreshCw className="w-3 h-3" /> Sync IRS Data
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="p-3 text-left font-medium">Effective Period</th>
                                    <th className="p-3 text-right font-medium">Terminal Charge</th>
                                    <th className="p-3 text-right font-medium">0-500 mi</th>
                                    <th className="p-3 text-right font-medium">501-1500 mi</th>
                                    <th className="p-3 text-right font-medium">&gt; 1500 mi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {SIFL_RATES_HISTORY.map((rate, i) => (
                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                                        <td className="p-3 font-medium">{rate.period}</td>
                                        <td className="p-3 text-right font-mono">${rate.term.toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono">${rate.s.toFixed(4)}</td>
                                        <td className="p-3 text-right font-mono">${rate.m.toFixed(4)}</td>
                                        <td className="p-3 text-right font-mono">${rate.l.toFixed(4)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <PassengerProfileManager />

            <Card className="glass-panel border-blue-500/20 shadow-blue-500/5">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-blue-500">Active Rate Configuration</CardTitle>
                            <CardDescription>Manually override the currently active SIFL rates.</CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            Current Period
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Keep existing form inputs for manual editing */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="effectiveDate">Effective Date Details</Label>
                            <Input
                                id="effectiveDate"
                                type="text"
                                value={formData.effectiveDate}
                                onChange={(e) => handleChange('effectiveDate', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="terminalCharge">Terminal Charge ($)</Label>
                            <Input
                                id="terminalCharge"
                                type="number"
                                step="0.01"
                                value={formData.terminalCharge}
                                onChange={(e) => handleChange('terminalCharge', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>0 - 500 Miles</Label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={formData.mileageRates.tier1}
                                onChange={(e) => handleChange('mileageRates.tier1', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>501 - 1,500 Miles</Label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={formData.mileageRates.tier2}
                                onChange={(e) => handleChange('mileageRates.tier2', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Over 1,500 Miles</Label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={formData.mileageRates.tier3}
                                onChange={(e) => handleChange('mileageRates.tier3', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                            <Save className="w-4 h-4" /> Save Configuration
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
