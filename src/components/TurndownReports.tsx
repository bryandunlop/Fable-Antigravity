import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import {
  FileText,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Plane
} from 'lucide-react';
import { useMaintenanceContext, TurndownReport } from './contexts/MaintenanceContext';

export default function TurndownReports() {
  const { reports, aircraftStatusConfig } = useMaintenanceContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'AM' | 'PM'>('all');
  const [selectedReport, setSelectedReport] = useState<TurndownReport | null>(null);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch =
        report.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.aircraftReports.some(ar =>
          ar.tailNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ar.discrepancies.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesDate = !dateFilter || report.date.startsWith(dateFilter);
      const matchesShift = shiftFilter === 'all' || report.shift === shiftFilter;

      return matchesSearch && matchesDate && matchesShift;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, searchTerm, dateFilter, shiftFilter]);

  const getStatusSummary = (report: TurndownReport) => {
    // This depends on status text which is now dynamic.
    // We'll define "Good" as "In Service" and everything else as "Attention" for simplicity
    // Or we can just show counts.

    // Naively assume "In Service" is the good one, or check if it contains "Service"
    const inServiceCount = report.aircraftReports.filter(a => a.status === 'In Service').length;
    const otherCount = report.aircraftReports.length - inServiceCount;

    return (
      <div className="flex gap-2">
        <Badge variant="outline" className="border-green-500 text-green-600">{inServiceCount} In Service</Badge>
        {otherCount > 0 && <Badge variant="secondary">{otherCount} Other</Badge>}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Turndown Reports
          </h1>
          <p className="text-muted-foreground">History of shift reports and fleet status</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Technician, Tail Number, or Issue..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Shift</Label>
            <Select value={shiftFilter} onValueChange={(v: any) => setShiftFilter(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Fleet Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No reports found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.shift}</Badge>
                    </TableCell>
                    <TableCell>{report.submittedBy}</TableCell>
                    <TableCell>{getStatusSummary(report)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle>Report Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedReport.date).toLocaleDateString()} - {selectedReport.shift} Shift - {selectedReport.submittedBy}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </CardHeader>
            <ScrollArea className="flex-1">
              <CardContent className="space-y-6 p-6">
                {/* Facility Checks */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Facility Checklist
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(selectedReport.facilityChecks || {}).map(([label, checked]) => (
                      <CheckItem key={label} label={label} checked={checked} />
                    ))}
                    {Object.keys(selectedReport.facilityChecks || {}).length === 0 && (
                      <p className="text-sm text-muted-foreground">No checks recorded.</p>
                    )}
                  </div>
                </div>

                {/* Aircraft Reports */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Plane className="w-4 h-4" /> Aircraft Reports
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedReport.aircraftReports.map((ar) => (
                      <div key={ar.tailNumber} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold">{ar.tailNumber}</span>
                          <Badge variant={ar.status === 'In Service' ? 'default' : 'secondary'}>
                            {ar.status}
                          </Badge>
                        </div>
                        {ar.discrepancies && (
                          <div className="text-sm bg-red-50 text-red-700 p-2 rounded">
                            <strong>Discrepancies:</strong> {ar.discrepancies}
                          </div>
                        )}
                        <div className="text-sm grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Cleaned:</span> {ar.cleaned}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fuel:</span> {ar.fuelOnBoard || '--'}
                          </div>
                        </div>
                        {ar.additionalInfo && (
                          <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                            {ar.additionalInfo}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Notes (Dynamic) */}
                {selectedReport.additionalNotes && Object.keys(selectedReport.additionalNotes).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Additional Notes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {Object.entries(selectedReport.additionalNotes).map(([label, text]) => (
                        text ? (
                          <NoteBlock key={label} title={label} content={text} />
                        ) : null
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback for legacy static notes if any (during transition) */}
                {/* @ts-ignore - for backward compatibility during dev if needed */}
                {(selectedReport.additionalTasks || selectedReport.stockroomNotes) && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    <p>Legacy notes detected.</p>
                  </div>
                )}

              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, checked }: { label: string, checked: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded border ${checked ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
      {checked ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}
      <span className={checked ? 'text-green-900 font-medium' : 'text-gray-500'}>{label}</span>
    </div>
  );
}

function NoteBlock({ title, content }: { title: string, content: string }) {
  return (
    <div className="border rounded p-3">
      <span className="font-medium block mb-1 text-xs uppercase text-muted-foreground">{title}</span>
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}