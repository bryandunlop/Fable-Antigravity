import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Calculator } from 'lucide-react';
import { Separator } from "./ui/separator";

interface MathExplainerProps {
    breakdown: {
        rate: number;
        miles: number;
        multiplier: number;
        terminalCharge: number;
        total: number;
        method: string;
        secCost?: number;
    };
    passengerName: string;
}

export default function MathExplainer({ breakdown, passengerName }: MathExplainerProps) {
    const baseCost = breakdown.miles * breakdown.rate;
    const multipliedCost = baseCost * breakdown.multiplier;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-muted-foreground hover:text-blue-500">
                    <Calculator className="w-3 h-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-blue-500" />
                        SIFL Calculation Logic
                    </DialogTitle>
                    <DialogDescription>
                        Detailed breakdown for <strong>{passengerName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Method Badge */}
                    <div className="flex justify-center">
                        <span className="bg-muted px-3 py-1 rounded-full text-xs font-medium border">
                            Method: {breakdown.method}
                        </span>
                    </div>

                    <div className="space-y-2 text-sm">
                        {/* Step 1: Base Mileage */}
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Mileage Charge</span>
                            <span>{breakdown.miles.toLocaleString()} mi × ${breakdown.rate.toFixed(4)}/mi</span>
                        </div>
                        <div className="flex justify-end font-mono text-muted-foreground border-b border-dashed pb-1">
                            = ${baseCost.toFixed(2)}
                        </div>

                        {/* Step 2: Multiplier (if applicable) */}
                        {breakdown.multiplier !== 1 && (
                            <>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-blue-600 font-medium">Multiplier Applied</span>
                                    <span className="text-blue-600">× {breakdown.multiplier * 100}%</span>
                                </div>
                                <div className="flex justify-end font-mono text-muted-foreground border-b border-dashed pb-1">
                                    = ${multipliedCost.toFixed(2)}
                                </div>
                            </>
                        )}

                        {/* Step 3: Terminal Charge */}
                        <div className="flex justify-between items-center pt-1">
                            <span className="text-muted-foreground">Terminal Charge</span>
                            <span>+ ${breakdown.terminalCharge.toFixed(2)}</span>
                        </div>

                        {/* Total */}
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center font-bold text-lg">
                            <span>Total SIFL</span>
                            <span className="font-mono">${breakdown.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* SEC Logic Note (if applicable) */}
                    {breakdown.secCost !== undefined && breakdown.secCost > 0 && (
                        <div className="mt-4 pt-3 border-t bg-amber-50/50 -mx-6 px-6 pb-2">
                            <div className="flex justify-between items-center text-amber-700 text-sm font-medium mb-1">
                                <span>SEC Incremental Cost</span>
                                <span className="font-mono">${breakdown.secCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <p className="text-[10px] text-amber-600/80">
                                Calculated as: Total Flight Variable Costs ÷ Total Passengers
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
