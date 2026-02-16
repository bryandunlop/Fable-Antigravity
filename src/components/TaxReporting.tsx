import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { FileDown, Calendar, Filter } from 'lucide-react';
import { useTaxContext } from "./contexts/TaxContext";

export default function TaxReporting() {
    const { profiles } = useTaxContext();
    const [reportType, setReportType] = useState('monthly');
    const [selectedYear, setSelectedYear] = useState('2024');
    const [selectedMonth, setSelectedMonth] = useState('10');

    // Mock SIFL Aggregation
    const generateReportData = () => {
        // In a real app, this would query the backend based on filters
        // Here we mock the aggregated totals for the selected period
        return profiles.map(profile => ({
            name: profile.name,
            designation: profile.designation,
            flights: Math.floor(Math.random() * 5) + 1,
            totalMiles: Math.floor(Math.random() * 5000) + 500,
            siflValue: (Math.random() * 2000) + 500 * (profile.designation === 'CEO' ? 2 : profile.designation === 'Band 7' ? 4 : 1)
        }));
    };

    const reportData = generateReportData();

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="glass-panel col-span-4 p-4 flex gap-4 items-end">
                    <div className="space-y-2 flex-1">
                        <label className="text-sm font-medium">Report Type</label>
                        <Select value={reportType} onValueChange={setReportType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">Monthly Detail</SelectItem>
                                <SelectItem value="annual">Annual Summary</SelectItem>
                                <SelectItem value="audit">IRS Audit Export</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 w-32">
                        <label className="text-sm font-medium">Year</label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2024">2024</SelectItem>
                                <SelectItem value="2023">2023</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {reportType === 'monthly' && (
                        <div className="space-y-2 w-40">
                            <label className="text-sm font-medium">Month</label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="01">January</SelectItem>
                                    <SelectItem value="02">February</SelectItem>
                                    <SelectItem value="03">March</SelectItem>
                                    <SelectItem value="07">July</SelectItem>
                                    <SelectItem value="10">October</SelectItem>
                                    <SelectItem value="12">December</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <FileDown className="w-4 h-4" /> Export CSV
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <FileDown className="w-4 h-4" /> Export PDF
                    </Button>
                </Card>
            </div>

            <Card className="glass-panel">
                <CardHeader>
                    <CardTitle>Report Preview: {reportType === 'monthly' ? `October 2024` : `Annual 2024`}</CardTitle>
                    <CardDescription>
                        Imputed Income Summary by Executive for the selected period.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Executive</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead className="text-right">Taxable Flights</TableHead>
                                <TableHead className="text-right">Total Miles</TableHead>
                                <TableHead className="text-right">Total SIFL Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((row, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{row.name}</TableCell>
                                    <TableCell>{row.designation}</TableCell>
                                    <TableCell className="text-right">{row.flights}</TableCell>
                                    <TableCell className="text-right">{row.totalMiles.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">
                                        ${row.siflValue.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
