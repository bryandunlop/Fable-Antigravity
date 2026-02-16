import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  MapPin,
  Database,
  FileText,
  Send,
  Edit,
  Plus,
  Trash2,
  CheckCheck,
  ChevronRight
} from 'lucide-react';

interface AirportSubmission {
  id: string;
  submittedBy: string;
  submittedDate: string;
  icao: string;
  type: 'new-airport' | 'correction' | 'update';
  reason: string;
  status: 'pending' | 'in-review' | 'approved' | 'rejected';
  faaData?: {
    icao: string;
    name: string;
    elevation: number;
    latitude: number;
    longitude: number;
    timezone: string;
    tower: boolean;
    attendedHours: string;
    source: 'faa' | 'template' | 'none';
    towerFrequency?: string;
    runways?: any[];
    approaches?: any[];
  };
  changes?: Record<string, string>;
}

export default function AirportEvaluationOfficer() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedSubmission, setSelectedSubmission] = useState<AirportSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [enhancedData, setEnhancedData] = useState<any>({});
  const [runways, setRunways] = useState<any[]>([]);
  const [approaches, setApproaches] = useState<any[]>([]);
  const [newRunway, setNewRunway] = useState({ designation: '', length: '', width: '', surface: '', lighting: '', ils: false });
  const [newApproach, setNewApproach] = useState({ runway: '', type: '', minimums: '' });

  // Mock submissions
  const [submissions, setSubmissions] = useState<AirportSubmission[]>([
    {
      id: 'SUB-001',
      submittedBy: 'Captain Sarah Mitchell',
      submittedDate: '2024-12-06T14:30:00Z',
      icao: 'KBOS',
      type: 'new-airport',
      reason: 'Frequent client requests to Boston area. Need comprehensive evaluation for G650 operations including runway analysis, FBO services, and any operational restrictions.',
      status: 'pending',
      faaData: {
        icao: 'KBOS',
        name: 'General Edward Lawrence Logan International Airport',
        elevation: 20,
        latitude: 42.3656,
        longitude: -71.0096,
        timezone: 'America/New_York',
        tower: true,
        attendedHours: '24/7',
        source: 'faa'
      }
    },
    {
      id: 'SUB-002',
      submittedBy: 'First Officer James Torres',
      submittedDate: '2024-12-06T10:15:00Z',
      icao: 'TJSJ',
      type: 'new-airport',
      reason: 'New route to San Juan for winter season. Client requested operational assessment.',
      status: 'pending',
      faaData: {
        icao: 'TJSJ',
        name: 'Luis Muñoz Marín International Airport',
        elevation: 9,
        latitude: 18.4394,
        longitude: -66.0018,
        timezone: 'America/Puerto_Rico',
        tower: true,
        attendedHours: '24/7',
        source: 'faa'
      }
    },
    {
      id: 'SUB-003',
      submittedBy: 'Captain Mike Anderson',
      submittedDate: '2024-12-05T16:45:00Z',
      icao: 'KSNA',
      type: 'new-airport',
      reason: 'Expansion to Orange County. No FAA data available, needs full manual research.',
      status: 'in-review',
      faaData: {
        icao: 'KSNA',
        name: 'Airport KSNA - No FAA data available',
        elevation: 0,
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        tower: false,
        attendedHours: 'Unknown',
        source: 'none'
      }
    },
    {
      id: 'SUB-004',
      submittedBy: 'First Officer Lisa Chen',
      submittedDate: '2024-12-04T09:20:00Z',
      icao: 'KTEB',
      type: 'correction',
      reason: 'FBO changed phone number and hours. Signature Flight Support now open 05:00-23:00 local instead of 06:00-22:00.',
      status: 'pending',
      changes: {
        fboPhone: '+1 (201) 288-1700',
        fboHours: '05:00-23:00 Local (7 days)'
      }
    }
  ]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleReviewSubmission = (submission: AirportSubmission) => {
    setSelectedSubmission(submission);
    setView('detail');
    setReviewNotes('');
    setRunways([]);
    setApproaches([]);
    setEnhancedData({});
    
    // Pre-populate with FAA data if available
    if (submission.faaData && submission.faaData.source === 'faa') {
      setEnhancedData({
        name: submission.faaData.name,
        elevation: submission.faaData.elevation,
        latitude: submission.faaData.latitude,
        longitude: submission.faaData.longitude,
        timezone: submission.faaData.timezone,
        towerHours: {
          weekdays: submission.faaData.attendedHours,
          weekends: submission.faaData.attendedHours
        }
      });
    }
  };

  const handleAddRunway = () => {
    if (newRunway.designation && newRunway.length) {
      setRunways([...runways, {
        ...newRunway,
        length: parseInt(newRunway.length),
        width: parseInt(newRunway.width) || 0
      }]);
      setNewRunway({ designation: '', length: '', width: '', surface: '', lighting: '', ils: false });
    }
  };

  const handleRemoveRunway = (index: number) => {
    setRunways(runways.filter((_, i) => i !== index));
  };

  const handleAddApproach = () => {
    if (newApproach.runway && newApproach.type) {
      setApproaches([...approaches, newApproach]);
      setNewApproach({ runway: '', type: '', minimums: '' });
    }
  };

  const handleApprove = () => {
    if (!selectedSubmission) return;
    
    const confirmMsg = selectedSubmission.type === 'new-airport'
      ? `Approve new airport evaluation for ${selectedSubmission.icao}?\n\nThis will send the evaluation to:\n• Chief Pilot\n• Scheduling Manager\n\nfor final approval before adding to the database.`
      : `Approve changes to ${selectedSubmission.icao}?\n\nThis will send to Chief Pilot and Scheduling Manager for approval.`;
    
    if (confirm(confirmMsg)) {
      alert(`✓ Approved!\n\nSubmission ID: ${selectedSubmission.id}\nAirport: ${selectedSubmission.icao}\n\nNext Step: Awaiting approval from Chief Pilot and Scheduling Manager`);
      setView('list');
      setSelectedSubmission(null);
    }
  };

  const handleReject = () => {
    if (!selectedSubmission) return;
    if (!reviewNotes) {
      alert('Please provide rejection notes explaining why this submission is being rejected.');
      return;
    }
    
    if (confirm(`Reject submission for ${selectedSubmission.icao}?\n\nThe submitter will be notified with your notes.`)) {
      alert(`✗ Rejected\n\nSubmission ID: ${selectedSubmission.id}\nNotification sent to: ${selectedSubmission.submittedBy}`);
      setView('list');
      setSelectedSubmission(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Pending Review</span>;
      case 'in-review':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">In Review</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rejected</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'new-airport':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">New Airport</span>;
      case 'correction':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Correction</span>;
      case 'update':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Update</span>;
      default:
        return null;
    }
  };

  if (view === 'detail' && selectedSubmission) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={() => setView('list')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Submissions
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl">Review Airport Submission</h1>
              <p className="text-muted-foreground">
                Submission {selectedSubmission.id} - {selectedSubmission.icao}
              </p>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(selectedSubmission.status)}
              {getTypeBadge(selectedSubmission.type)}
            </div>
          </div>
        </div>

        {/* Submission Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Submission Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Submitted By</p>
                <p className="font-medium">{selectedSubmission.submittedBy}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Submitted</p>
                <p className="font-medium">{formatDate(selectedSubmission.submittedDate)}</p>
                <p className="text-xs text-muted-foreground">{formatTimeSince(selectedSubmission.submittedDate)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Reason for Request</p>
              <p className="p-3 bg-gray-50 rounded-lg">{selectedSubmission.reason}</p>
            </div>
          </CardContent>
        </Card>

        {/* FAA API Data (if available) */}
        {selectedSubmission.faaData && selectedSubmission.type === 'new-airport' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                FAA API Data Retrieved
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedSubmission.faaData.source === 'faa' ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-900 mb-1">
                          ✓ Automated Data Successfully Retrieved
                        </p>
                        <p className="text-sm text-green-800">
                          Basic airport information was fetched from AirportDB.io/FAA APIs. Use this as a starting point
                          and enhance with detailed operational data below.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">ICAO Code</p>
                      <p className="font-medium text-lg">{selectedSubmission.faaData.icao}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Airport Name</p>
                      <p className="font-medium">{selectedSubmission.faaData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Elevation</p>
                      <p className="font-medium">{selectedSubmission.faaData.elevation} ft MSL</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Timezone</p>
                      <p className="font-medium">{selectedSubmission.faaData.timezone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Coordinates</p>
                      <p className="font-medium">
                        {selectedSubmission.faaData.latitude.toFixed(4)}, {selectedSubmission.faaData.longitude.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tower Operations</p>
                      <p className="font-medium">{selectedSubmission.faaData.attendedHours}</p>
                    </div>
                    {selectedSubmission.faaData.towerFrequency && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tower Frequency</p>
                        <p className="font-medium">{selectedSubmission.faaData.towerFrequency}</p>
                      </div>
                    )}
                  </div>

                  {/* Runway Data from FAA */}
                  {selectedSubmission.faaData.runways && selectedSubmission.faaData.runways.length > 0 && (
                    <div className="bg-white border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-green-900">
                          ✓ Runways Auto-Retrieved ({selectedSubmission.faaData.runways.length})
                        </h4>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">From FAA API</span>
                      </div>
                      <div className="space-y-3">
                        {selectedSubmission.faaData.runways.map((runway: any, idx: number) => (
                          <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="grid md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Runway</p>
                                <p className="font-semibold text-base">{runway.designation}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Dimensions</p>
                                <p className="font-medium">{runway.length?.toLocaleString()} x {runway.width} ft</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Surface</p>
                                <p className="font-medium">{runway.surface}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Lighting</p>
                                <p className="font-medium">{runway.lighting}</p>
                              </div>
                              {runway.pcn && (
                                <div>
                                  <p className="text-xs text-muted-foreground">PCN</p>
                                  <p className="font-medium">{runway.pcn}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs text-muted-foreground">ILS</p>
                                <p className="font-medium">{runway.ils ? '✓ Yes' : 'No'}</p>
                              </div>
                              {runway.le_elevation > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Runway Elevations</p>
                                  <p className="font-medium">{runway.le_elevation} / {runway.he_elevation} ft</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approach Data from FAA */}
                  {selectedSubmission.faaData.approaches && selectedSubmission.faaData.approaches.length > 0 && (
                    <div className="bg-white border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-blue-900">
                          ✓ Instrument Approaches Auto-Retrieved ({selectedSubmission.faaData.approaches.length})
                        </h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">From FAA API</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedSubmission.faaData.approaches.map((approach: any, idx: number) => (
                          <div key={idx} className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                            <span className="font-semibold">{approach.type}</span> RWY {approach.runway}
                            {approach.minimums && <span className="text-muted-foreground ml-1">({approach.minimums})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Additional Research Required</p>
                        <p>
                          Please research and add: Runway details, PCN numbers, instrument approaches, FBO information,
                          fuel services, handling capabilities, and any operational restrictions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-yellow-900 mb-1">
                        No Automated Data Available
                      </p>
                      <p className="text-sm text-yellow-800 mb-3">
                        Airport {selectedSubmission.icao} was not found in public APIs. Complete manual research
                        required using FAA charts, airport website, FBO contacts, and NOTAMs.
                      </p>
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">Research Sources:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>FAA Airport Diagrams & Charts</li>
                          <li>Airport website and operations manual</li>
                          <li>FBO direct contact for services</li>
                          <li>NOTAMs for current restrictions</li>
                          <li>AIM and regional supplements</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Existing Data Changes (for corrections/updates) */}
        {selectedSubmission.changes && Object.keys(selectedSubmission.changes).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Requested Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(selectedSubmission.changes).map(([field, value]) => (
                  <div key={field} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="font-medium text-sm text-orange-900 mb-1">{field}</p>
                    <p className="text-sm text-orange-800">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Airport Evaluation Form (for new airports) */}
        {selectedSubmission.type === 'new-airport' && (
          <>
            {/* Runway Data */}
            <Card>
              <CardHeader>
                <CardTitle>Runway Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {runways.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {runways.map((runway, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 grid md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="font-medium">Runway:</span> {runway.designation}
                            </div>
                            <div>
                              <span className="font-medium">Dimensions:</span> {runway.length} x {runway.width} ft
                            </div>
                            <div>
                              <span className="font-medium">Surface:</span> {runway.surface}
                            </div>
                            <div>
                              <span className="font-medium">Lighting:</span> {runway.lighting}
                            </div>
                            <div>
                              <span className="font-medium">ILS:</span> {runway.ils ? 'Yes' : 'No'}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRunway(idx)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="font-medium mb-3">Add Runway</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Designation (e.g., 04/22)"
                      value={newRunway.designation}
                      onChange={(e) => setNewRunway({ ...newRunway, designation: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Length (ft)"
                      value={newRunway.length}
                      onChange={(e) => setNewRunway({ ...newRunway, length: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Width (ft)"
                      value={newRunway.width}
                      onChange={(e) => setNewRunway({ ...newRunway, width: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <select
                      value={newRunway.surface}
                      onChange={(e) => setNewRunway({ ...newRunway, surface: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="">Surface Type...</option>
                      <option value="Asphalt">Asphalt</option>
                      <option value="Concrete">Concrete</option>
                      <option value="Asphalt/Concrete">Asphalt/Concrete</option>
                      <option value="Gravel">Gravel</option>
                    </select>
                    <select
                      value={newRunway.lighting}
                      onChange={(e) => setNewRunway({ ...newRunway, lighting: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="">Lighting...</option>
                      <option value="HIRL">HIRL (High Intensity)</option>
                      <option value="MIRL">MIRL (Medium Intensity)</option>
                      <option value="LIRL">LIRL (Low Intensity)</option>
                      <option value="None">None</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ils"
                        checked={newRunway.ils}
                        onChange={(e) => setNewRunway({ ...newRunway, ils: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="ils" className="text-sm">ILS Available</label>
                    </div>
                  </div>
                  <Button onClick={handleAddRunway} variant="outline" className="mt-3 w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Runway
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instrument Approaches */}
            <Card>
              <CardHeader>
                <CardTitle>Instrument Approaches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {approaches.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {approaches.map((approach, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 border rounded-lg flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium">{approach.type}</span> to Runway {approach.runway}
                          {approach.minimums && ` - ${approach.minimums}`}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setApproaches(approaches.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="font-medium mb-3">Add Approach</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Runway (e.g., 04)"
                      value={newApproach.runway}
                      onChange={(e) => setNewApproach({ ...newApproach, runway: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <select
                      value={newApproach.type}
                      onChange={(e) => setNewApproach({ ...newApproach, type: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      <option value="">Approach Type...</option>
                      <option value="ILS">ILS</option>
                      <option value="RNAV (GPS)">RNAV (GPS)</option>
                      <option value="RNAV (RNP)">RNAV (RNP)</option>
                      <option value="VOR">VOR</option>
                      <option value="NDB">NDB</option>
                      <option value="LOC">LOC</option>
                      <option value="Visual">Visual</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Minimums (optional)"
                      value={newApproach.minimums}
                      onChange={(e) => setNewApproach({ ...newApproach, minimums: e.target.value })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                  <Button onClick={handleAddApproach} variant="outline" className="mt-3 w-full" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Approach
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* FBO & Services */}
            <Card>
              <CardHeader>
                <CardTitle>FBO & Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">FBO Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Signature Flight Support"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">FBO Phone</label>
                    <input
                      type="tel"
                      placeholder="+1 (XXX) XXX-XXXX"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">FBO Hours</label>
                    <input
                      type="text"
                      placeholder="e.g., 24/7 or 06:00-22:00 Local"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Fuel Availability</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" />
                        <span className="text-sm">Jet-A</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" />
                        <span className="text-sm">Avgas</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Services Available</label>
                  <div className="grid md:grid-cols-3 gap-2">
                    {['De-icing', 'Hangar', 'Catering', 'Customs', 'Ground Transport', 'Maintenance'].map(service => (
                      <label key={service} className="flex items-center gap-2">
                        <input type="checkbox" className="w-4 h-4" />
                        <span className="text-sm">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operational Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Operational Notes & Restrictions</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  placeholder="Enter any operational considerations, restrictions, noise abatement procedures, special requirements, NOTAMs, terrain concerns, etc."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* Review Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any notes about your review, additional research needed, or reasons for rejection..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setView('list')}>
            Save Draft
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReject} className="text-red-600 border-red-300 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCheck className="w-4 h-4 mr-2" />
              Approve & Send to Chief Pilot
            </Button>
          </div>
        </div>

        {/* Workflow Preview */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ChevronRight className="w-5 h-5" />
              Next Steps After Approval
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                  1
                </div>
                <p className="text-blue-900">Evaluation sent to <strong>Chief Pilot</strong> for review</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                  2
                </div>
                <p className="text-blue-900">Simultaneously sent to <strong>Scheduling Manager</strong> for review</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <p className="text-blue-900">Once both approve, airport is added to database and available for operations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Airport Evaluation Officer</h1>
        <p className="text-muted-foreground">
          Review and process airport evaluation requests and corrections
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{submissions.filter(s => s.status === 'pending').length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Review</p>
                <p className="text-2xl font-bold">{submissions.filter(s => s.status === 'in-review').length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Airports</p>
                <p className="text-2xl font-bold">{submissions.filter(s => s.type === 'new-airport').length}</p>
              </div>
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With FAA Data</p>
                <p className="text-2xl font-bold">
                  {submissions.filter(s => s.faaData && s.faaData.source === 'faa').length}
                </p>
              </div>
              <Database className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {submissions
              .filter(s => s.status === 'pending' || s.status === 'in-review')
              .map(submission => (
                <div
                  key={submission.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleReviewSubmission(submission)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{submission.icao}</h3>
                        {getTypeBadge(submission.type)}
                        {getStatusBadge(submission.status)}
                        {submission.faaData && submission.faaData.source === 'faa' && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            FAA Data
                          </span>
                        )}
                      </div>
                      {submission.faaData && submission.faaData.source === 'faa' && (
                        <p className="text-sm text-muted-foreground mb-1">{submission.faaData.name}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">{submission.reason}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Submitted by {submission.submittedBy}</span>
                    <span>•</span>
                    <span>{formatTimeSince(submission.submittedDate)}</span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}