import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Check, Shield, Info, Calculator, Users } from 'lucide-react';

export default function TaxLogicViewer() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold tracking-tight">Audit & Logic Verification</h2>
                <p className="text-muted-foreground">
                    This section documents the active business logic and formulas used by the engine to calculate SIFL and Imputed Income.
                    Use this for audit trails and verification.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-blue-500" />
                            SIFL Calculation Formula
                        </CardTitle>
                        <CardDescription>Standard Internal Revenue Service Formula</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-md border font-mono text-sm space-y-2">
                            <div className="font-semibold text-muted-foreground">Base Formula:</div>
                            <div className="text-lg">
                                (Miles × Rate) + Terminal Charge = SIFL Value
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Variable Definitions:</h4>
                            <ul className="text-sm space-y-2 text-muted-foreground">
                                <li className="flex gap-2">
                                    <Badge variant="outline">Miles</Badge>
                                    <span>Great Circle Distance (Statute Miles) between airports.</span>
                                </li>
                                <li className="flex gap-2">
                                    <Badge variant="outline">Rate</Badge>
                                    <span>IRS published rate based on date of flight (semi-annual).</span>
                                </li>
                                <li className="flex gap-2">
                                    <Badge variant="outline">Terminal Charge</Badge>
                                    <span>Fixed charge per required landing (excluding fuel stops if merged).</span>
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-panel">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-500" />
                            Control Employee Multipliers
                        </CardTitle>
                        <CardDescription>Valuation multipliers for key executives</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-sm">Control Employee (Band 7+)</AccordionTrigger>
                                <AccordionContent className="text-muted-foreground text-sm">
                                    <p className="mb-2">Employees meeting "Control" status are taxed at a premium rate.</p>
                                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                                        <span>Multiplier applied to SIFL Value:</span>
                                        <Badge className="bg-emerald-600">400% (x4.0)</Badge>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                                <AccordionTrigger className="text-sm">Non-Control Employee</AccordionTrigger>
                                <AccordionContent className="text-muted-foreground text-sm">
                                    <p className="mb-2">Standard employees or guests not classified as Control.</p>
                                    <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                                        <span>Multiplier applied to SIFL Value:</span>
                                        <Badge variant="secondary">100% (x1.0)</Badge>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card className="glass-panel md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-500" />
                            Exemption & Reduction Rules
                        </CardTitle>
                        <CardDescription>Complex logic for tax reduction eligibility</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50">
                                <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                                    <Check className="w-4 h-4" /> 50% Seating Capacity Rule
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                    If 50% or more of the aircraft's regular seating capacity is occupied by business travelers,
                                    the value of personal flights by the employee, spouse, and dependents is zero.
                                </p>
                                <div className="text-xs font-mono bg-background/50 p-2 rounded">
                                    IF (Business_Pax / Total_Seats) &ge; 0.5 <br />
                                    THEN Personal_Guest_Tax = $0.00
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50">
                                <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Security Concerns (CEO)
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                    If a bona fide business-oriented security concern exists, the valuation may be reduced.
                                    Requires consistent security study.
                                </p>
                                <div className="text-xs font-mono bg-background/50 p-2 rounded">
                                    IF Security_Study_Active = TRUE <br />
                                    THEN Multiplier = 200% (Instead of 400%)
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
