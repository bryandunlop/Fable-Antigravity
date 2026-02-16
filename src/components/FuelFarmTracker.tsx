import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Plus, Plane, Download, FileText, ArrowLeft, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { FuelingRecord, FuelFarmStatus, NewRecordForm } from './FuelFarm/types';
import { FUEL_TYPES, TECHNICIANS, MOCK_RECORDS } from './FuelFarm/constants';
import { calculateGallonsChanged, validateFuelRecord, getFuelLevelStatus } from './FuelFarm/utils';
import { generateMonthlyReport, getAvailableMonths } from './FuelFarm/pdfExport';
import FuelStatusCards from './FuelFarm/FuelStatusCards';
import RecordTable from './FuelFarm/RecordTable';
import FuelAlerts from './FuelFarm/FuelAlerts';

export default function FuelFarmTracker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState<FuelingRecord[]>([]);
  const [fuelFarmStatus, setFuelFarmStatus] = useState<FuelFarmStatus>({
    totalCapacity: 10000,
    currentLevel: 7500,
    lastUpdated: new Date().toISOString(),
    fuelType: 'Jet A-1'
  });
  const [showNewRecordDialog, setShowNewRecordDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedExportMonth, setSelectedExportMonth] = useState('');
  const [recordType, setRecordType] = useState<'dispensed' | 'replenished'>('dispensed');
  const [newRecord, setNewRecord] = useState<NewRecordForm>({
    tailNumber: '',
    startingGallons: '',
    endingGallons: '',
    technician: '',
    notes: '',
    fuelType: 'Jet A-1'
  });

  useEffect(() => {
    setRecords(MOCK_RECORDS);
    setFuelFarmStatus(prev => ({
      ...prev,
      currentLevel: MOCK_RECORDS[MOCK_RECORDS.length - 1]?.currentTotal || 7500,
      lastUpdated: MOCK_RECORDS[MOCK_RECORDS.length - 1]?.dateTime || new Date().toISOString()
    }));
  }, []);

  // Handle auto-population from maintenance board
  useEffect(() => {
    const tailNumber = searchParams.get('tailNumber');
    const aircraft = searchParams.get('aircraft');
    const fuelAmount = searchParams.get('fuelAmount');
    const autoOpen = searchParams.get('autoOpen');

    if (tailNumber || aircraft || fuelAmount) {
      setRecordType('dispensed');
      setNewRecord(prev => ({
        ...prev,
        tailNumber: tailNumber || '',
        startingGallons: fuelFarmStatus.currentLevel.toString(),
        notes: aircraft ? `Fueling ${aircraft} - Requested: ${fuelAmount}k lbs` : prev.notes
      }));

      // Auto-open the dialog if requested
      if (autoOpen === 'true') {
        setShowNewRecordDialog(true);
      }
    }
  }, [searchParams, fuelFarmStatus.currentLevel]);

  const handleSubmitRecord = () => {
    if (!newRecord.startingGallons || !newRecord.endingGallons || !newRecord.technician) {
      toast.error('Please fill in all required fields');
      return;
    }

    const startGal = parseFloat(newRecord.startingGallons);
    const endGal = parseFloat(newRecord.endingGallons);
    const gallonsChanged = Math.abs(endGal - startGal);

    const validationError = validateFuelRecord(recordType, startGal, endGal, newRecord.tailNumber, fuelFarmStatus.totalCapacity);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const record: FuelingRecord = {
      id: Date.now().toString(),
      type: recordType,
      tailNumber: recordType === 'dispensed' ? newRecord.tailNumber : undefined,
      startingGallons: startGal,
      endingGallons: endGal,
      gallonsChanged,
      dateTime: new Date().toISOString(),
      technician: newRecord.technician,
      notes: newRecord.notes,
      fuelType: newRecord.fuelType,
      currentTotal: endGal
    };

    setRecords(prev => [...prev, record]);
    setFuelFarmStatus(prev => ({ ...prev, currentLevel: endGal, lastUpdated: record.dateTime }));
    setNewRecord({ tailNumber: '', startingGallons: '', endingGallons: '', technician: '', notes: '', fuelType: 'Jet A-1' });
    setShowNewRecordDialog(false);
    
    // Clear URL parameters after successful submission
    if (searchParams.has('tailNumber') || searchParams.has('aircraft') || searchParams.has('fuelAmount')) {
      setSearchParams({});
    }
    
    const action = recordType === 'dispensed' ? 'dispensed' : 'added';
    toast.success(`Successfully recorded ${gallonsChanged} gallons ${action}`);
  };

  const handleExportPDF = () => {
    if (!selectedExportMonth) {
      toast.error('Please select a month to export');
      return;
    }

    const [year, month] = selectedExportMonth.split('-');
    generateMonthlyReport(records, fuelFarmStatus, month, year);
    setShowExportDialog(false);
    toast.success('Monthly report generated successfully');
  };

  const fuelStatus = getFuelLevelStatus(fuelFarmStatus);
  const availableMonths = getAvailableMonths(records);
  
  // Check if coming from maintenance board
  const isFromMaintenanceBoard = searchParams.has('tailNumber') || searchParams.has('aircraft');
  const aircraftFromMaintenance = searchParams.get('aircraft');
  const tailNumberFromMaintenance = searchParams.get('tailNumber');

  const handleCancelRecord = () => {
    setShowNewRecordDialog(false);
    setNewRecord({ tailNumber: '', startingGallons: '', endingGallons: '', technician: '', notes: '', fuelType: 'Jet A-1' });
    
    // Clear URL parameters when canceling
    if (searchParams.has('tailNumber') || searchParams.has('aircraft') || searchParams.has('fuelAmount')) {
      setSearchParams({});
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {isFromMaintenanceBoard && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm text-blue-800">
              <strong>Auto-populated from Maintenance Board:</strong> Recording fuel for {aircraftFromMaintenance} ({tailNumberFromMaintenance})
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/maintenance')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Maintenance
          </Button>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1>Fuel Farm Tracker</h1>
          <p className="text-muted-foreground">Monitor fuel farm inventory and aircraft fueling operations</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />Export Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Export Monthly Report
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="exportMonth">Select Month</Label>
                  <Select value={selectedExportMonth} onValueChange={setSelectedExportMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose month to export" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map(monthYear => {
                        const [year, month] = monthYear.split('-');
                        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        });
                        return (
                          <SelectItem key={monthYear} value={monthYear}>
                            {monthName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  This will generate a PDF-ready report with fuel dispensing operations, replenishments, and monthly summaries.
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleExportPDF} className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showNewRecordDialog} onOpenChange={setShowNewRecordDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" onClick={() => setRecordType('dispensed')}>
                <TrendingDown className="w-4 h-4" />Record Fueling
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showNewRecordDialog} onOpenChange={setShowNewRecordDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2" onClick={() => setRecordType('replenished')}>
                <TrendingUp className="w-4 h-4" />Add Fuel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {recordType === 'dispensed' ? 'Record Aircraft Fueling' : 'Record Fuel Farm Replenishment'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {recordType === 'dispensed' && (
                  <div>
                    <Label htmlFor="tailNumber">Tail Number *</Label>
                    <Input
                      id="tailNumber"
                      placeholder="e.g., N123AB"
                      value={newRecord.tailNumber}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, tailNumber: e.target.value }))}
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startingGallons">Starting Gallons *</Label>
                    <Input
                      id="startingGallons"
                      type="number"
                      placeholder={fuelFarmStatus.currentLevel.toString()}
                      value={newRecord.startingGallons}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, startingGallons: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endingGallons">Ending Gallons *</Label>
                    <Input
                      id="endingGallons"
                      type="number"
                      value={newRecord.endingGallons}
                      onChange={(e) => setNewRecord(prev => ({ ...prev, endingGallons: e.target.value }))}
                    />
                  </div>
                </div>
                {newRecord.startingGallons && newRecord.endingGallons && (
                  <div className="text-sm text-muted-foreground">
                    {recordType === 'dispensed' ? 'Gallons Dispensed' : 'Gallons Added'}: {calculateGallonsChanged(newRecord.startingGallons, newRecord.endingGallons)}
                  </div>
                )}
                <div>
                  <Label htmlFor="technician">Technician *</Label>
                  <Select value={newRecord.technician} onValueChange={(value) => setNewRecord(prev => ({ ...prev, technician: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {TECHNICIANS.map(tech => (
                        <SelectItem key={tech.value} value={tech.value}>{tech.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <Select value={newRecord.fuelType} onValueChange={(value) => setNewRecord(prev => ({ ...prev, fuelType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(fuel => (
                        <SelectItem key={fuel.value} value={fuel.value}>{fuel.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes or observations..."
                    value={newRecord.notes}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmitRecord} className="flex-1">
                    Record {recordType === 'dispensed' ? 'Fueling' : 'Replenishment'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelRecord}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <FuelStatusCards fuelFarmStatus={fuelFarmStatus} records={records} />
      <FuelAlerts fuelStatus={fuelStatus} />

      <Tabs defaultValue="recent-activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="dispensing-log">Aircraft Fueling Log</TabsTrigger>
          <TabsTrigger value="replenishment-log">Fuel Farm Deliveries</TabsTrigger>
        </TabsList>

        <TabsContent value="recent-activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Fuel Farm Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <RecordTable records={records.slice().reverse()} limit={10} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispensing-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aircraft Fueling Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Tail Number</TableHead>
                    <TableHead>Gallons Dispensed</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.filter(record => record.type === 'dispensed').slice().reverse().map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div>{new Date(record.dateTime).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(record.dateTime).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Plane className="w-3 h-3" />
                          {record.tailNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600">{record.gallonsChanged.toLocaleString()} gal</span>
                      </TableCell>
                      <TableCell>{record.technician}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {record.notes || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="replenishment-log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fuel Farm Replenishment Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Gallons Added</TableHead>
                    <TableHead>Previous Level</TableHead>
                    <TableHead>New Level</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.filter(record => record.type === 'replenished').slice().reverse().map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div>{new Date(record.dateTime).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(record.dateTime).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">+{record.gallonsChanged.toLocaleString()} gal</span>
                      </TableCell>
                      <TableCell>{record.startingGallons.toLocaleString()} gal</TableCell>
                      <TableCell>{record.endingGallons.toLocaleString()} gal</TableCell>
                      <TableCell>{record.technician}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {record.notes || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}