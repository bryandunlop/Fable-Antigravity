import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { DollarSign, Fuel, Utensils, Plane, Receipt } from 'lucide-react';

export interface VariableCosts {
    fuel: number;
    catering: number;
    crew: number;
    fees: number; // Landing/Parking/Handling
    supplies: number;
    total: number;
}

interface TripCostManagerProps {
    flightId: string;
    initialCosts?: VariableCosts;
    onUpdate: (costs: VariableCosts) => void;
}

export default function TripCostManager({ flightId, initialCosts, onUpdate }: TripCostManagerProps) {
    const [costs, setCosts] = useState<VariableCosts>(initialCosts || {
        fuel: 0,
        catering: 0,
        crew: 0,
        fees: 0,
        supplies: 0,
        total: 0
    });

    useEffect(() => {
        if (initialCosts) {
            setCosts(initialCosts);
        }
    }, [initialCosts]);

    const handleChange = (field: keyof VariableCosts, value: string) => {
        const numValue = parseFloat(value) || 0;
        const newCosts = { ...costs, [field]: numValue };

        // Recalculate total
        newCosts.total = newCosts.fuel + newCosts.catering + newCosts.crew + newCosts.fees + newCosts.supplies;

        setCosts(newCosts);
        onUpdate(newCosts);
    };

    return (
        <Card className="bg-muted/10 border-dashed">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    SEC Incremental Cost Inputs
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1.5"><Fuel className="w-3 h-3" /> Fuel Cost</Label>
                        <div className="relative">
                            <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">$</span>
                            <Input
                                type="number"
                                className="pl-6 h-8 text-sm"
                                placeholder="0.00"
                                value={costs.fuel || ''}
                                onChange={(e) => handleChange('fuel', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1.5"><Utensils className="w-3 h-3" /> Catering</Label>
                        <div className="relative">
                            <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">$</span>
                            <Input
                                type="number"
                                className="pl-6 h-8 text-sm"
                                placeholder="0.00"
                                value={costs.catering || ''}
                                onChange={(e) => handleChange('catering', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1.5"><Plane className="w-3 h-3" /> Crew Travel</Label>
                        <div className="relative">
                            <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">$</span>
                            <Input
                                type="number"
                                className="pl-6 h-8 text-sm"
                                placeholder="0.00"
                                value={costs.crew || ''}
                                onChange={(e) => handleChange('crew', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1.5"><Receipt className="w-3 h-3" /> Fees (Landing/Pax)</Label>
                        <div className="relative">
                            <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">$</span>
                            <Input
                                type="number"
                                className="pl-6 h-8 text-sm"
                                placeholder="0.00"
                                value={costs.fees || ''}
                                onChange={(e) => handleChange('fees', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <Separator className="bg-emerald-500/20" />

                <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Variable Cost</span>
                    <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">
                        ${costs.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
