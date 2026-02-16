import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  ArrowLeft,
  Search,
  Send,
  AlertCircle,
  Plus,
  X,
  Loader2,
  CheckCircle
} from 'lucide-react';

interface Airport {
  id: string;
  icao: string;
  name: string;
  tower?: boolean;
  attendedHours?: string;
  elevation?: number;
}

interface SubmitCorrectionProps {
  onBack: () => void;
  preSelectedAirport?: Airport | null;
}

export default function SubmitCorrection({ onBack, preSelectedAirport }: SubmitCorrectionProps) {
  const [searchTerm, setSearchTerm] = useState(preSelectedAirport?.icao || '');
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(preSelectedAirport || null);
  const [changeType, setChangeType] = useState<'new-airport' | 'correction' | 'update'>('correction');
  const [reason, setReason] = useState('');
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [newChangeField, setNewChangeField] = useState('');
  const [newChangeValue, setNewChangeValue] = useState('');
  const [newAirportCode, setNewAirportCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetchingAirportData, setFetchingAirportData] = useState(false);
  const [airportDataPreview, setAirportDataPreview] = useState<any>(null);

  // Fetch airport data from FAA when ICAO code is entered
  const fetchAirportData = async (icao: string) => {
    if (icao.length !== 4) return;

    setFetchingAirportData(true);
    setAirportDataPreview(null);

    try {
      // Mock FAA Data - Supabase removed
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockResult = {
        data: {
          icao: icao,
          name: `Mock Airport (${icao})`,
          elevation: 123,
          latitude: 40.0,
          longitude: -74.0,
          timezone: 'America/New_York',
          tower: true,
          attendedHours: '0600-2200',
          towerFrequency: '118.5',
          runways: [{ designation: '01/19', length: 5000, width: 100, surface: 'Asphalt' }]
        },
        source: 'faa'
      };

      setAirportDataPreview({ ...mockResult.data, source: mockResult.source });
    } catch (error) {
      console.error('Error fetching airport data:', error);
      // Show message but still allow submission
      setAirportDataPreview({
        icao: icao,
        name: `Airport ${icao} - No FAA data available`,
        elevation: 0,
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        tower: false,
        attendedHours: 'Unknown',
        source: 'error'
      });
    } finally {
      setFetchingAirportData(false);
    }
  };

  // Mock airport search results
  const searchResults: Airport[] = [
    { id: 'apt-001', icao: 'KMMU', name: 'Morristown Municipal', elevation: 187 },
    { id: 'apt-002', icao: 'KTEB', name: 'Teterboro', elevation: 9 },
    { id: 'apt-003', icao: 'KASE', name: 'Aspen-Pitkin County', elevation: 7820 },
    { id: 'apt-004', icao: 'KVNY', name: 'Van Nuys', elevation: 802 },
  ].filter(apt =>
    apt.icao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddChange = () => {
    if (newChangeField && newChangeValue) {
      setChanges({
        ...changes,
        [newChangeField]: newChangeValue
      });
      setNewChangeField('');
      setNewChangeValue('');
    }
  };

  const handleRemoveChange = (field: string) => {
    const updatedChanges = { ...changes };
    delete updatedChanges[field];
    setChanges(updatedChanges);
  };

  const handleSubmit = async () => {
    if (!selectedAirport && changeType !== 'new-airport') {
      alert('Please select an airport');
      return;
    }
    if (!reason) {
      alert('Please provide a reason for the change');
      return;
    }
    if (changeType === 'new-airport' && !newAirportCode) {
      alert('Please enter the airport ICAO code');
      return;
    }
    if (changeType !== 'new-airport' && Object.keys(changes).length === 0) {
      alert('Please specify at least one change');
      return;
    }

    setLoading(true);
    try {
      // Mock Submission - Supabase removed
      await new Promise(resolve => setTimeout(resolve, 1500));

      setSuccess(true);
      const dataMsg = airportDataPreview && airportDataPreview.source === 'faa'
        ? '\n\nPre-filled FAA Data: Name, Elevation, Coordinates'
        : '';
      alert(`Change Request Submitted!${dataMsg}\n\nAirport: ${changeType === 'new-airport' ? newAirportCode : selectedAirport.icao}\nType: ${changeType}\n\nThis will be sent to the Airport Evaluation Officer for review.`);
      onBack();

    } catch (error) {
      console.error('Error submitting change request:', error);
      alert('Failed to submit change request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Airports
        </Button>
        <h1 className="text-2xl">Submit Airport Correction</h1>
        <p className="text-muted-foreground">
          Submit changes or corrections to airport evaluation data
        </p>
      </div>

      {/* Airport Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Select Airport</h2>

        {!selectedAirport ? (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by ICAO code or airport name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {searchTerm && (
              <div className="space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map(airport => (
                    <div
                      key={airport.id}
                      onClick={() => setSelectedAirport(airport)}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{airport.icao}</p>
                          <p className="text-sm text-muted-foreground">{airport.name}</p>
                        </div>
                        {airport.elevation && (
                          <p className="text-sm text-muted-foreground">{airport.elevation} ft</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No airports found matching "{searchTerm}"</p>
                    <p className="text-sm mt-2">You can request a new airport evaluation below</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-accent">
            <div>
              <p className="font-semibold text-lg">{selectedAirport.icao}</p>
              <p className="text-muted-foreground">{selectedAirport.name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedAirport(null);
                setSearchTerm('');
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Change Airport
            </Button>
          </div>
        )}
      </Card>

      {selectedAirport && (
        <>
          {/* Change Type */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Type of Change</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => setChangeType('correction')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${changeType === 'correction'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-semibold mb-1">Correction</p>
                <p className="text-sm text-muted-foreground">
                  Fix incorrect or outdated information
                </p>
              </button>

              <button
                onClick={() => setChangeType('update')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${changeType === 'update'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-semibold mb-1">Update</p>
                <p className="text-sm text-muted-foreground">
                  Add new operational information
                </p>
              </button>

              <button
                onClick={() => setChangeType('new-airport')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${changeType === 'new-airport'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-semibold mb-1">New Airport</p>
                <p className="text-sm text-muted-foreground">
                  Request evaluation for new airport
                </p>
              </button>
            </div>
          </Card>

          {/* New Airport Information */}
          {changeType === 'new-airport' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">New Airport Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Airport ICAO Code *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAirportCode}
                      onChange={(e) => {
                        setNewAirportCode(e.target.value.toUpperCase());
                        setAirportDataPreview(null);
                      }}
                      placeholder="e.g., KBOS, EGLL, RJTT"
                      maxLength={4}
                      className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                    />
                    <Button
                      onClick={() => fetchAirportData(newAirportCode)}
                      disabled={newAirportCode.length !== 4 || fetchingAirportData}
                      variant="outline"
                    >
                      {fetchingAirportData ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Fetch Data
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the 4-letter ICAO code and click "Fetch Data" to retrieve basic airport information from FAA
                  </p>
                </div>

                {/* Airport Data Preview */}
                {airportDataPreview && (
                  <div className={`${airportDataPreview.source === 'faa'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                    } border rounded-lg p-4`}>
                    <div className="flex items-start gap-2 mb-3">
                      {airportDataPreview.source === 'faa' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className={`font-semibold ${airportDataPreview.source === 'faa'
                            ? 'text-green-900'
                            : 'text-yellow-900'
                          }`}>
                          {airportDataPreview.source === 'faa'
                            ? `✓ Comprehensive FAA Data Retrieved for ${newAirportCode}`
                            : `Airport ${newAirportCode} - Limited Data Available`}
                        </p>
                        <p className={`text-sm ${airportDataPreview.source === 'faa'
                            ? 'text-green-800'
                            : 'text-yellow-800'
                          }`}>
                          {airportDataPreview.source === 'faa'
                            ? 'Comprehensive airport data has been fetched including runways, elevations, approaches, and tower information. This will be sent to the Airport Evaluation Officer who will verify and enhance with FBO services and operational details.'
                            : 'Limited automated data available for this airport. The Airport Evaluation Officer will manually research and create a comprehensive evaluation including all operational details.'}
                        </p>
                      </div>
                    </div>
                    {airportDataPreview.source === 'faa' && airportDataPreview.name && !airportDataPreview.name.includes('Manual Entry Required') && (
                      <div className="space-y-3">
                        {/* Basic Info */}
                        <div className="grid md:grid-cols-2 gap-3 text-sm bg-white rounded p-3">
                          <div>
                            <span className="font-medium">Name:</span> {airportDataPreview.name}
                          </div>
                          {airportDataPreview.elevation > 0 && (
                            <div>
                              <span className="font-medium">Elevation:</span> {airportDataPreview.elevation} ft MSL
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Tower:</span> {airportDataPreview.tower ? 'Yes' : 'Unknown'}
                          </div>
                          {airportDataPreview.attendedHours && (
                            <div>
                              <span className="font-medium">Tower Hours:</span> {airportDataPreview.attendedHours}
                            </div>
                          )}
                          {airportDataPreview.towerFrequency && (
                            <div>
                              <span className="font-medium">Tower Freq:</span> {airportDataPreview.towerFrequency}
                            </div>
                          )}
                          {airportDataPreview.timezone && airportDataPreview.timezone !== 'UTC' && (
                            <div>
                              <span className="font-medium">Timezone:</span> {airportDataPreview.timezone}
                            </div>
                          )}
                          {airportDataPreview.latitude && airportDataPreview.longitude && airportDataPreview.latitude !== 0 && (
                            <div className="md:col-span-2">
                              <span className="font-medium">Coordinates:</span>{' '}
                              {airportDataPreview.latitude.toFixed(4)}, {airportDataPreview.longitude.toFixed(4)}
                            </div>
                          )}
                        </div>

                        {/* Runways */}
                        {airportDataPreview.runways && airportDataPreview.runways.length > 0 && (
                          <div className="bg-white rounded p-3">
                            <p className="font-medium text-sm mb-2 text-green-900">
                              Runways ({airportDataPreview.runways.length})
                            </p>
                            <div className="space-y-2">
                              {airportDataPreview.runways.map((runway: any, idx: number) => (
                                <div key={idx} className="text-xs bg-green-50 rounded p-2 border border-green-200">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div>
                                      <span className="font-medium">RWY:</span> {runway.designation}
                                    </div>
                                    <div>
                                      <span className="font-medium">Length:</span> {runway.length.toLocaleString()} ft
                                    </div>
                                    {runway.width > 0 && (
                                      <div>
                                        <span className="font-medium">Width:</span> {runway.width} ft
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">Surface:</span> {runway.surface}
                                    </div>
                                    {runway.lighting && runway.lighting !== 'Unknown' && (
                                      <div>
                                        <span className="font-medium">Lighting:</span> {runway.lighting}
                                      </div>
                                    )}
                                    {runway.ils && (
                                      <div className="font-medium text-green-700">
                                        ✓ ILS
                                      </div>
                                    )}
                                    {runway.pcn && (
                                      <div>
                                        <span className="font-medium">PCN:</span> {runway.pcn}
                                      </div>
                                    )}
                                    {runway.le_elevation > 0 && (
                                      <div>
                                        <span className="font-medium">Elev:</span> {runway.le_elevation}/{runway.he_elevation} ft
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Approaches */}
                        {airportDataPreview.approaches && airportDataPreview.approaches.length > 0 && (
                          <div className="bg-white rounded p-3">
                            <p className="font-medium text-sm mb-2 text-green-900">
                              Instrument Approaches ({airportDataPreview.approaches.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {airportDataPreview.approaches.map((approach: any, idx: number) => (
                                <div key={idx} className="text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                  <span className="font-medium">{approach.type}</span> RWY {approach.runway}
                                  {approach.minimums && <span className="text-muted-foreground ml-1">({approach.minimums})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">New Airport Evaluation Process</p>
                      <p>
                        The Airport Evaluation Officer will research and create a comprehensive evaluation
                        for this airport including runway data, approaches, FBO services, and operational
                        considerations. This typically takes 3-5 business days.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Changes */}
          {changeType !== 'new-airport' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Specify Changes</h2>

              {/* Existing Changes */}
              {Object.keys(changes).length > 0 && (
                <div className="space-y-3 mb-4">
                  {Object.entries(changes).map(([field, value]) => (
                    <div key={field} className="flex items-start gap-3 p-3 bg-accent rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">{field}</p>
                        <p className="text-sm text-muted-foreground">{value}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChange(field)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Change */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Field Name</label>
                  <select
                    value={newChangeField}
                    onChange={(e) => setNewChangeField(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select field to change...</option>
                    <option value="attendedHours">Airport Attended Hours</option>
                    <option value="fboName">FBO Name</option>
                    <option value="fboPhone">FBO Phone Number</option>
                    <option value="fboHours">FBO Hours</option>
                    <option value="fboLocation">FBO Location</option>
                    <option value="deicingCapability">De-Icing Capability</option>
                    <option value="hangarSpace">Hangar Space</option>
                    <option value="opsNotes">Operations Notes</option>
                    <option value="limitations">Limitations/Restrictions</option>
                    <option value="firefighting">Fire Fighting Capability</option>
                    <option value="runwayLighting">Runway Lighting</option>
                    <option value="obstructions">Obstructions/Terrain</option>
                    <option value="other">Other (specify in value)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">New/Corrected Value</label>
                  <textarea
                    value={newChangeValue}
                    onChange={(e) => setNewChangeValue(e.target.value)}
                    placeholder="Enter the corrected or updated information..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <Button
                  onClick={handleAddChange}
                  variant="outline"
                  className="w-full"
                  disabled={!newChangeField || !newChangeValue}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Change
                </Button>
              </div>
            </Card>
          )}

          {/* Reason */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Reason for Change</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Why is this important?</p>
                  <p>
                    Providing detailed reasons helps approvers understand the context and urgency of your request.
                    Include source of information if applicable (e.g., NOTAM, FBO communication, personal observation).
                  </p>
                </div>
              </div>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this change is needed. Include any relevant details or sources..."
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit for Review
            </Button>
          </div>

          {/* Workflow Info */}
          <Card className="p-6 bg-gray-50">
            <h3 className="font-semibold mb-3">Approval Workflow</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                  1
                </div>
                <p>Your submission will be sent to the Airport Evaluation Officer for initial review</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                  2
                </div>
                <p>If approved, it will be sent to both the Chief Pilot and Scheduling Manager</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <p>Once both approve, the change will be applied to the database</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}