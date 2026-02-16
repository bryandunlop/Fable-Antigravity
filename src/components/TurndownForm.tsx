import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import {
  ClipboardList,
  CheckCircle,
  Save,
  Plane,
  Building2,
  FileText,
  Settings
} from 'lucide-react';
import { useMaintenance, AircraftStatus, CleaningStatus, TurndownReport } from './contexts/MaintenanceContext';
import { toast } from 'sonner';
import MaintenanceSettings from './MaintenanceSettings';

export default function TurndownForm() {
  const {
    submitReport,
    aircraftConfig,
    facilityCheckConfig,
    aircraftStatusConfig,
    additionalNoteConfig
  } = useMaintenance();

  const [view, setView] = useState<'form' | 'settings'>('form');
  const [showSuccess, setShowSuccess] = useState(false);

  // --- Form State ---
  const [shift, setShift] = useState<'AM' | 'PM'>('AM');
  const [technician, setTechnician] = useState('');

  // Dynamic State
  const [facilityChecks, setFacilityChecks] = useState<Record<string, boolean>>({});
  const [additionalNotes, setAdditionalNotes] = useState<Record<string, string>>({});

  const [aircraftReports, setAircraftReports] = useState<Record<string, {
    status: AircraftStatus;
    discrepancies: string;
    cleaned: CleaningStatus;
    fuelOnBoard: string;
    additionalInfo: string;
  }>>({});

  // --- Initialization ---

  // Initialize facility checks based on config
  useEffect(() => {
    const checks: Record<string, boolean> = {};
    facilityCheckConfig.forEach(fc => {
      if (fc.isActive) checks[fc.label] = false;
    });
    setFacilityChecks(prev => ({ ...checks, ...prev })); // Merge to keep existing checks if re-rendering
  }, [facilityCheckConfig]);

  // Initialize notes based on config
  useEffect(() => {
    const notes: Record<string, string> = {};
    additionalNoteConfig.forEach(an => {
      if (an.isActive) notes[an.label] = '';
    });
    setAdditionalNotes(prev => ({ ...notes, ...prev }));
  }, [additionalNoteConfig]);

  // Initialize aircraft reports
  useEffect(() => {
    setAircraftReports(prev => {
      const next = { ...prev };
      aircraftConfig.forEach(ac => {
        // If active and not already initialized, init it
        if (ac.isActive && !next[ac.tailNumber]) {
          next[ac.tailNumber] = {
            status: aircraftStatusConfig.length > 0 ? aircraftStatusConfig[0].value : 'In Service',
            discrepancies: '',
            cleaned: 'N/A',
            fuelOnBoard: '',
            additionalInfo: ''
          };
        }
      });
      return next;
    });
  }, [aircraftConfig, aircraftStatusConfig]);


  // --- Handlers ---

  const handleFacilityCheckChange = (label: string, checked: boolean) => {
    setFacilityChecks(prev => ({ ...prev, [label]: checked }));
  };

  const handleNoteChange = (label: string, text: string) => {
    setAdditionalNotes(prev => ({ ...prev, [label]: text }));
  };

  const handleAircraftReportChange = (tailNumber: string, field: string, value: any) => {
    setAircraftReports(prev => ({
      ...prev,
      [tailNumber]: {
        ...prev[tailNumber],
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!technician) {
      toast.error("Please enter the technician's name.");
      return;
    }

    const reportAircraftData = aircraftConfig
      .filter(ac => ac.isActive)
      .map(ac => ({
        tailNumber: ac.tailNumber,
        ...aircraftReports[ac.tailNumber]
      }));

    const reportData: Omit<TurndownReport, 'id' | 'submittedAt'> = {
      date: new Date().toISOString(),
      shift,
      submittedBy: technician,
      facilityChecks, // now a dynamic record
      aircraftReports: reportAircraftData,
      additionalNotes // now a dynamic record
    };

    submitReport(reportData);
    setShowSuccess(true);
    toast.success("Turndown report submitted successfully!");

    // Reset form Logic 
    // Clear Aircraft Data but keep keys
    const resetReports: Record<string, any> = {};
    aircraftConfig.forEach(ac => {
      if (ac.isActive) {
        resetReports[ac.tailNumber] = {
          status: aircraftStatusConfig.length > 0 ? aircraftStatusConfig[0].value : 'In Service',
          discrepancies: '',
          cleaned: 'N/A',
          fuelOnBoard: '',
          additionalInfo: ''
        };
      }
    });
    setAircraftReports(resetReports);

    // Clear Facility Checks
    const resetChecks = { ...facilityChecks };
    Object.keys(resetChecks).forEach(k => resetChecks[k] = false);
    setFacilityChecks(resetChecks);

    // Clear Notes
    const resetNotes = { ...additionalNotes };
    Object.keys(resetNotes).forEach(k => resetNotes[k] = '');
    setAdditionalNotes(resetNotes);

    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (view === 'settings') {
    return <MaintenanceSettings onBack={() => setView('form')} />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animation-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            Maintenance Turndown Form
          </h1>
          <p className="text-muted-foreground">Daily shift report</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setView('settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Configure Form
        </Button>
      </div>

      {showSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Report submitted successfully.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Shift & User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Shift Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={shift} onValueChange={(v: 'AM' | 'PM') => setShift(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">AM Shift</SelectItem>
                  <SelectItem value="PM">PM Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Technician Name</Label>
              <Input
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="First Last"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Dynamic Facility Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Facility Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {facilityCheckConfig.filter(fc => fc.isActive).map((fc) => (
              <div key={fc.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`check-${fc.id}`}
                  checked={facilityChecks[fc.label] || false}
                  onCheckedChange={(checked: boolean) => handleFacilityCheckChange(fc.label, checked)}
                />
                <Label htmlFor={`check-${fc.id}`}>{fc.label}</Label>
              </div>
            ))}
            {facilityCheckConfig.filter(fc => fc.isActive).length === 0 && (
              <p className="text-muted-foreground italic">No checklist items configured.</p>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Aircraft Status */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Aircraft Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aircraftConfig.filter(ac => ac.isActive).map((ac) => (
              <Card key={ac.tailNumber}>
                <CardHeader className="pb-3">
                  <CardTitle>{ac.tailNumber}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status Dropdown */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select
                      value={aircraftReports[ac.tailNumber]?.status || ''}
                      onValueChange={(v) => handleAircraftReportChange(ac.tailNumber, 'status', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {aircraftStatusConfig.filter(s => s.isActive).map(s => (
                          <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Discrepancies */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Discrepancies</Label>
                    <Input
                      value={aircraftReports[ac.tailNumber]?.discrepancies || ''}
                      onChange={(e) => handleAircraftReportChange(ac.tailNumber, 'discrepancies', e.target.value)}
                      placeholder="List any issues..."
                    />
                  </div>

                  {/* Cleaned */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cleaned By</Label>
                    <Select
                      value={aircraftReports[ac.tailNumber]?.cleaned || 'N/A'}
                      onValueChange={(v) => handleAircraftReportChange(ac.tailNumber, 'cleaned', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Apex">Apex</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Crew">Crew</SelectItem>
                        <SelectItem value="N/A">N/A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fuel */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Fuel on Board</Label>
                    <Input
                      value={aircraftReports[ac.tailNumber]?.fuelOnBoard || ''}
                      onChange={(e) => handleAircraftReportChange(ac.tailNumber, 'fuelOnBoard', e.target.value)}
                      placeholder="e.g. 12,000 lbs"
                    />
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Additional Info</Label>
                    <Textarea
                      value={aircraftReports[ac.tailNumber]?.additionalInfo || ''}
                      onChange={(e) => handleAircraftReportChange(ac.tailNumber, 'additionalInfo', e.target.value)}
                      placeholder="Notes..."
                      className="h-20"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Section 4: Dynamic Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {additionalNoteConfig.filter(an => an.isActive).map(an => (
              <div key={an.id} className="space-y-2">
                <Label>{an.label}</Label>
                <Textarea
                  value={additionalNotes[an.label] || ''}
                  onChange={(e) => handleNoteChange(an.label, e.target.value)}
                  className="h-24"
                />
              </div>
            ))}
            {additionalNoteConfig.filter(fc => fc.isActive).length === 0 && (
              <p className="text-muted-foreground italic col-span-2">No additional note fields configured.</p>
            )}
          </CardContent>
        </Card>

        {/* Submit Action */}
        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="w-full md:w-auto">
            <Save className="w-4 h-4 mr-2" />
            Submit Turndown Report
          </Button>
        </div>

      </form>
    </div>
  );
}