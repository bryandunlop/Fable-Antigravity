import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import {
  Shield,
  AlertTriangle,
  FileText,
  Send,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  Info,
  Calendar,
  Clock,
  Users,
  Plane,
  ExternalLink,
  Archive,
  TrendingUp,
  Target,
  Download
} from 'lucide-react';

interface ASAPReportForm {
  // Anonymous identifiers
  reportId: string;
  submissionDate: string;
  reporterType: string;

  // Incident details
  eventDate: string;
  eventTime: string;
  location: string;
  aircraftType: string;
  flightPhase: string;

  // Event classification
  eventType: string[];
  severityLevel: string;
  contributingFactors: string[];

  // Narrative (for NASA submission)
  eventDescription: string;
  consequences: string;
  recommendedActions: string;

  // System tracking (anonymized)
  trackingCategory: string;
  internalFollowupRequired: boolean;

  // Submission preferences
  submitToNASA: boolean;
  requestFollowup: boolean;
}

interface ASAPReportSummary {
  id: string;
  date: string;
  category: string;
  severity: string;
  status: string;
  nasaSubmitted: boolean;
  followupStatus?: string;
}

export default function ASAPReport({ userRole }: { userRole: string }) {
  const [activeTab, setActiveTab] = useState('submit');
  const [formData, setFormData] = useState<Partial<ASAPReportForm>>({
    reporterType: '',
    eventType: [],
    contributingFactors: [],
    severityLevel: '',
    submitToNASA: true,
    requestFollowup: false,
    internalFollowupRequired: false
  });
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(1);

  // Mock data for demonstration
  const reportSummaries: ASAPReportSummary[] = [
    {
      id: 'ASAP-2024-001',
      date: '2024-01-15',
      category: 'Ground Operations',
      severity: 'Medium',
      status: 'Under Review',
      nasaSubmitted: true,
      followupStatus: 'Pending Response'
    },
    {
      id: 'ASAP-2024-002',
      date: '2024-01-20',
      category: 'Flight Operations',
      severity: 'High',
      status: 'Resolved',
      nasaSubmitted: true,
      followupStatus: 'Completed'
    },
    {
      id: 'ASAP-2024-003',
      date: '2024-01-25',
      category: 'Maintenance',
      severity: 'Low',
      status: 'Open',
      nasaSubmitted: false
    }
  ];

  const eventTypes = [
    'Aircraft Systems',
    'Air Traffic Control',
    'Airport Operations',
    'Cabin Safety',
    'Communication',
    'Ground Operations',
    'Human Factors',
    'Maintenance',
    'Meteorology',
    'Navigation',
    'Runway Incursion',
    'Security',
    'Weight and Balance',
    'Other'
  ];

  const contributingFactors = [
    'Communication Breakdown',
    'Distraction/Interruption',
    'Fatigue',
    'Inadequate Procedures',
    'Inadequate Training',
    'Physical Environment',
    'Pressure (Time/Economic)',
    'Stress (Mental/Physical)',
    'Technology Issues',
    'Weather Conditions',
    'Workload Issues',
    'Other'
  ];

  const flightPhases = [
    'Pre-flight/Ground',
    'Taxi',
    'Takeoff',
    'Initial Climb',
    'Cruise',
    'Descent',
    'Approach',
    'Landing',
    'Post-flight'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiSelect = (field: string, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = prev[field as keyof ASAPReportForm] as string[] || [];
      if (checked) {
        return {
          ...prev,
          [field]: [...currentArray, value]
        };
      } else {
        return {
          ...prev,
          [field]: currentArray.filter(item => item !== value)
        };
      }
    });
  };

  const validateForm = () => {
    const requiredFields = [
      'reporterType',
      'eventDate',
      'location',
      'flightPhase',
      'eventType',
      'severityLevel',
      'eventDescription'
    ];

    for (const field of requiredFields) {
      const value = formData[field as keyof ASAPReportForm];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('Please complete all required fields');
      return;
    }

    // Generate anonymous report ID
    const reportId = `ASAP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    const finalReport = {
      ...formData,
      reportId,
      submissionDate: new Date().toISOString()
    };


    // In a real implementation, this would:
    // 1. Store anonymized data internally for tracking
    // 2. Submit full report to NASA ASRS if requested
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] ASAP Report Submitted:', finalReport);
    }


    if (formData.submitToNASA) {
      // Simulate NASA submission
      toast.success('Report submitted successfully to NASA ASRS and internal tracking system');
    } else {
      toast.success('Report submitted to internal tracking system');
    }

    // Reset form
    setFormData({
      reporterType: '',
      eventType: [],
      contributingFactors: [],
      severityLevel: '',
      submitToNASA: true,
      requestFollowup: false,
      internalFollowupRequired: false
    });
    setSubmissionStep(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
        return <Badge className="bg-green-500">Resolved</Badge>;
      case 'Under Review':
        return <Badge className="bg-blue-500">Under Review</Badge>;
      case 'Open':
        return <Badge className="bg-yellow-500">Open</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High':
        return 'text-red-600';
      case 'Medium':
        return 'text-yellow-600';
      case 'Low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-accent" />
          ASAP Safety Reporting
        </h1>
        <p className="text-muted-foreground">
          Aviation Safety Action Program - Confidential Safety Reporting System
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="submit">Submit Report</TabsTrigger>
          <TabsTrigger value="tracking">Report Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Safety Trends</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Submit Report Tab */}
        <TabsContent value="submit" className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Confidential Reporting:</strong> This system maintains your anonymity while enabling safety improvements.
              Reports are used for trend analysis and corrective actions, not punitive measures.
            </AlertDescription>
          </Alert>

          {submissionStep === 1 && (
            <Card className="aviation-card-featured">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  Safety Event Report - Basic Information
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Step 1 of 3: Event Details and Classification
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reporter-type">Your Role *</Label>
                    <Select value={formData.reporterType} onValueChange={(value) => handleInputChange('reporterType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pilot">Pilot</SelectItem>
                        <SelectItem value="flight-attendant">Flight Attendant</SelectItem>
                        <SelectItem value="maintenance">Maintenance Technician</SelectItem>
                        <SelectItem value="dispatcher">Dispatcher</SelectItem>
                        <SelectItem value="ground-crew">Ground Crew</SelectItem>
                        <SelectItem value="atc">Air Traffic Control</SelectItem>
                        <SelectItem value="other">Other Aviation Personnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-date">Event Date *</Label>
                    <Input
                      id="event-date"
                      type="date"
                      value={formData.eventDate || ''}
                      onChange={(e) => handleInputChange('eventDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-time">Event Time (Local)</Label>
                    <Input
                      id="event-time"
                      type="time"
                      value={formData.eventTime || ''}
                      onChange={(e) => handleInputChange('eventTime', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location/Airport *</Label>
                    <Input
                      id="location"
                      placeholder="e.g., KTEB, New York airspace"
                      value={formData.location || ''}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aircraft-type">Aircraft Type</Label>
                    <Input
                      id="aircraft-type"
                      placeholder="e.g., Gulfstream G650"
                      value={formData.aircraftType || ''}
                      onChange={(e) => handleInputChange('aircraftType', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="flight-phase">Flight Phase *</Label>
                    <Select value={formData.flightPhase} onValueChange={(value) => handleInputChange('flightPhase', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase of flight" />
                      </SelectTrigger>
                      <SelectContent>
                        {flightPhases.map((phase) => (
                          <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Event Type(s) *</Label>
                    <p className="text-sm text-muted-foreground mb-2">Select all that apply</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {eventTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`event-${type}`}
                            checked={formData.eventType?.includes(type) || false}
                            onCheckedChange={(checked) =>
                              handleMultiSelect('eventType', type, checked as boolean)
                            }
                          />
                          <Label htmlFor={`event-${type}`} className="text-sm">{type}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Severity Level *</Label>
                    <RadioGroup value={formData.severityLevel} onValueChange={(value) => handleInputChange('severityLevel', value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="severity-high" />
                        <Label htmlFor="severity-high" className="text-red-600 font-medium">High - Actual or high probability of accident/incident</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="severity-medium" />
                        <Label htmlFor="severity-medium" className="text-yellow-600 font-medium">Medium - Moderate safety concern or deviation</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="severity-low" />
                        <Label htmlFor="severity-low" className="text-green-600 font-medium">Low - Minor safety concern or procedural issue</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setSubmissionStep(2)} disabled={!formData.reporterType || !formData.eventDate || !formData.location || !formData.flightPhase || !formData.eventType?.length || !formData.severityLevel}>
                    Continue to Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {submissionStep === 2 && (
            <Card className="aviation-card-featured">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-accent" />
                  Event Description and Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Step 2 of 3: Detailed Description and Contributing Factors
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Contributing Factors</Label>
                    <p className="text-sm text-muted-foreground mb-2">Select factors that may have contributed to this event</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {contributingFactors.map((factor) => (
                        <div key={factor} className="flex items-center space-x-2">
                          <Checkbox
                            id={`factor-${factor}`}
                            checked={formData.contributingFactors?.includes(factor) || false}
                            onCheckedChange={(checked) =>
                              handleMultiSelect('contributingFactors', factor, checked as boolean)
                            }
                          />
                          <Label htmlFor={`factor-${factor}`} className="text-sm">{factor}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-description">Event Description *</Label>
                    <p className="text-sm text-muted-foreground">
                      Provide a detailed description of what happened. This information will be included in NASA submission if selected.
                    </p>
                    <Textarea
                      id="event-description"
                      rows={6}
                      placeholder="Describe the sequence of events, what you observed, actions taken, and any other relevant details..."
                      value={formData.eventDescription || ''}
                      onChange={(e) => handleInputChange('eventDescription', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consequences">Consequences/Outcomes</Label>
                    <Textarea
                      id="consequences"
                      rows={3}
                      placeholder="What were the actual or potential consequences of this event?"
                      value={formData.consequences || ''}
                      onChange={(e) => handleInputChange('consequences', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recommendations">Recommended Actions</Label>
                    <Textarea
                      id="recommendations"
                      rows={3}
                      placeholder="What actions do you recommend to prevent similar occurrences?"
                      value={formData.recommendedActions || ''}
                      onChange={(e) => handleInputChange('recommendedActions', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setSubmissionStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setSubmissionStep(3)} disabled={!formData.eventDescription?.trim()}>
                    Continue to Submission
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {submissionStep === 3 && (
            <Card className="aviation-card-featured">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-accent" />
                  Submission Options
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Step 3 of 3: Choose submission preferences and review
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <Checkbox
                      id="nasa-submission"
                      checked={formData.submitToNASA || false}
                      onCheckedChange={(checked) => handleInputChange('submitToNASA', checked)}
                    />
                    <div>
                      <Label htmlFor="nasa-submission" className="font-medium">
                        Submit to NASA Aviation Safety Reporting System (ASRS)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Recommended for all safety events. NASA ASRS provides legal protections and contributes to national aviation safety.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 border rounded-lg">
                    <Checkbox
                      id="followup-request"
                      checked={formData.requestFollowup || false}
                      onCheckedChange={(checked) => handleInputChange('requestFollowup', checked)}
                    />
                    <div>
                      <Label htmlFor="followup-request" className="font-medium">
                        Request Internal Follow-up
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Request that our safety team follow up on this report for internal corrective actions.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Anonymity and Confidentiality
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Your identity is not stored with this report</li>
                      <li>• Only statistical/trend data is kept internally</li>
                      <li>• NASA ASRS provides legal protections for reporters</li>
                      <li>• Reports are used for safety improvements, not enforcement</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Report Summary</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Reporter:</strong> {formData.reporterType}</p>
                    <p><strong>Event Date:</strong> {formData.eventDate}</p>
                    <p><strong>Location:</strong> {formData.location}</p>
                    <p><strong>Flight Phase:</strong> {formData.flightPhase}</p>
                    <p><strong>Event Types:</strong> {formData.eventType?.join(', ')}</p>
                    <p><strong>Severity:</strong> <span className={getSeverityColor(formData.severityLevel || '')}>{formData.severityLevel}</span></p>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setSubmissionStep(2)}>
                    Back
                  </Button>
                  <Button onClick={handleSubmit} className="btn-aviation-primary">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Report Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <Card className="aviation-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-accent" />
                Report Tracking
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Anonymous tracking of safety reports and their resolution status
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>NASA Status</TableHead>
                      <TableHead>Internal Status</TableHead>
                      <TableHead>Follow-up</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportSummaries.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono">{report.id}</TableCell>
                        <TableCell>{new Date(report.date).toLocaleDateString()}</TableCell>
                        <TableCell>{report.category}</TableCell>
                        <TableCell>
                          <span className={getSeverityColor(report.severity)}>
                            {report.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          {report.nasaSubmitted ? (
                            <Badge className="bg-blue-500">Submitted</Badge>
                          ) : (
                            <Badge variant="outline">Not Submitted</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          {report.followupStatus && (
                            <Badge variant="outline" className="text-xs">
                              {report.followupStatus}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety Trends Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="aviation-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Safety Trends and Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Anonymized safety data trends and insights
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Reports</p>
                        <p className="text-2xl font-bold">156</p>
                      </div>
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">This Month</p>
                        <p className="text-2xl font-bold text-blue-600">12</p>
                      </div>
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Resolved</p>
                        <p className="text-2xl font-bold text-green-600">89%</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center py-8">
                <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Detailed safety analytics and trend charts will be displayed here
                </p>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Safety Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="grid gap-6">
            <Card className="aviation-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-accent" />
                  ASAP Program Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">What is ASAP?</h4>
                  <p className="text-sm text-muted-foreground">
                    The Aviation Safety Action Program (ASAP) is a voluntary safety program that encourages
                    aviation professionals to report safety concerns without fear of retribution, when the
                    report is submitted in accordance with the program.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Program Benefits</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Protection from enforcement action for qualifying reports</li>
                    <li>• Anonymous reporting to encourage participation</li>
                    <li>• Data-driven safety improvements</li>
                    <li>• Enhanced safety culture through open reporting</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">NASA ASRS Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    Reports can be simultaneously submitted to NASA's Aviation Safety Reporting System,
                    which provides additional legal protections and contributes to national aviation safety research.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="aviation-card">
              <CardHeader>
                <CardTitle>External Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  NASA ASRS Official Website
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  FAA ASAP Program Guidance
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  ASAP Program Manual
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}