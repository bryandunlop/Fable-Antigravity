import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  Search,
  Plus,
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin,
  Plane,
  Building2,
  Clock,
  FileText,
  Edit,
  Eye,
  Send,
  MessageSquare,
  ArrowLeft,
  Filter,
  Download
} from 'lucide-react';
import AirportDetail from './AirportDetail';
import SubmitCorrection from './SubmitCorrection';
import PendingApprovals from './PendingApprovals';

interface RunwayData {
  runway: string;
  tora: number;
  toda: number;
  lda: number;
  width: number;
  slope: number;
  pcn: string;
}

interface InstrumentApproach {
  runway: string;
  type: string;
  glidepath: number;
}

interface Airport {
  id: string;
  icao: string;
  name: string;
  tower: boolean;
  attendedHours: string;
  elevation: number;
  runways: RunwayData[];
  approaches: InstrumentApproach[];
  runwayLighting: string;
  mountainous: boolean;
  obstructions: string;
  firefighting: string;
  fboName: string;
  fboPhone: string;
  fboHours: string;
  fboLocation: string;
  restArea: boolean;
  jetAAvailable: boolean;
  deicingCapability: string;
  hangarSpace: string;
  opsNotes: string;
  limitations: string;
  status: 'active' | 'pending-changes' | 'denied';
  lastReviewed: string;
  reviewedBy: string;
  aircraft: string;
}

interface ChangeRequest {
  id: string;
  airportIcao: string;
  airportName: string;
  submittedBy: string;
  submittedDate: string;
  changeType: 'new-airport' | 'correction' | 'update';
  changes: any;
  reason: string;
  status: 'pending-approver' | 'pending-chief-pilot' | 'pending-scheduling' | 'approved' | 'denied';
  approverStatus?: 'approved' | 'denied';
  approverComments?: string;
  approverDate?: string;
  chiefPilotStatus?: 'approved' | 'denied';
  chiefPilotComments?: string;
  chiefPilotDate?: string;
  schedulingStatus?: 'approved' | 'denied';
  schedulingComments?: string;
  schedulingDate?: string;
  denialReason?: string;
}

export default function AirportEvaluations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'submit' | 'approvals' | 'denied'>('list');
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending-changes'>('all');

  // Mock data
  const airports: Airport[] = [
    {
      id: 'apt-001',
      icao: 'KMMU',
      name: 'Morristown Municipal',
      tower: true,
      attendedHours: '0645-2230 L',
      elevation: 187,
      runways: [
        {
          runway: 'RWY05',
          tora: 5998,
          toda: 5998,
          lda: 5998,
          width: 150,
          slope: 0,
          pcn: '25/F/C/X/T DW80'
        },
        {
          runway: 'RWY23',
          tora: 5998,
          toda: 5998,
          lda: 5998,
          width: 150,
          slope: 0,
          pcn: '25/F/C/X/T DW80'
        }
      ],
      approaches: [
        { runway: 'RWY05', type: 'RNAV(GPS)', glidepath: 3.77 },
        { runway: 'RWY23', type: 'ILS', glidepath: 3 },
        { runway: 'RWY23', type: 'RNAV(GPS)', glidepath: 3 }
      ],
      runwayLighting: 'HIRL / MALSR 23 / REIL 05',
      mountainous: false,
      obstructions: 'Higher terrain to the SW thru NE quadrants',
      firefighting: 'ARFF Services available 24 hrs daily and when ATCT closed call 973.455.1953',
      fboName: 'Signature Flight Support',
      fboPhone: '973.292.1300',
      fboHours: '24 hrs',
      fboLocation: 'Ramp N off J Taxiway',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'Y (Type I & IV)',
      hangarSpace: 'Available',
      opsNotes: 'Excellent general aviation facility with professional FBO service. Signature provides reliable fuel and ground services. Airport well-maintained with good access to NYC metro area. Recommend avoiding peak business jet hours 0800-1000L and 1600-1800L due to ramp congestion.',
      limitations: '',
      status: 'active',
      lastReviewed: '2024-10-08',
      reviewedBy: 'CL350',
      aircraft: 'CL350'
    },
    {
      id: 'apt-002',
      icao: 'KTEB',
      name: 'Teterboro',
      tower: true,
      attendedHours: '24 hrs',
      elevation: 9,
      runways: [
        {
          runway: 'RWY06',
          tora: 7000,
          toda: 7000,
          lda: 7000,
          width: 150,
          slope: 0.1,
          pcn: '40/F/C/X/T DW110'
        },
        {
          runway: 'RWY24',
          tora: 7000,
          toda: 7000,
          lda: 7000,
          width: 150,
          slope: 0.1,
          pcn: '40/F/C/X/T DW110'
        },
        {
          runway: 'RWY19',
          tora: 6013,
          toda: 6013,
          lda: 6013,
          width: 150,
          slope: 0,
          pcn: '40/F/C/X/T DW110'
        },
        {
          runway: 'RWY01',
          tora: 6013,
          toda: 6013,
          lda: 6013,
          width: 150,
          slope: 0,
          pcn: '40/F/C/X/T DW110'
        }
      ],
      approaches: [
        { runway: 'RWY06', type: 'ILS', glidepath: 3 },
        { runway: 'RWY06', type: 'RNAV(GPS)', glidepath: 3 },
        { runway: 'RWY24', type: 'RNAV(GPS)', glidepath: 3 },
        { runway: 'RWY19', type: 'RNAV(GPS)', glidepath: 3 }
      ],
      runwayLighting: 'HIRL all runways / MALSR 06 / REIL 24, 19, 01',
      mountainous: false,
      obstructions: 'NYC Class B airspace overhead',
      firefighting: 'ARFF Index C - 24 hr coverage',
      fboName: 'Multiple FBOs - Meridian, Signature, Atlantic',
      fboPhone: '201.288.1775',
      fboHours: '24 hrs',
      fboLocation: 'Various ramps',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'Y (Type I, II, IV)',
      hangarSpace: 'Limited - advance notice required',
      opsNotes: 'RWK, JMS',
      limitations: 'Noise sensitive - mandatory curfew 2300-0600L. Special procedures required.',
      status: 'pending-changes',
      lastReviewed: '2024-11-20',
      reviewedBy: 'G650',
      aircraft: 'G650'
    },
    {
      id: 'apt-003',
      icao: 'KASE',
      name: 'Aspen-Pitkin County',
      tower: true,
      attendedHours: '0600-0100L',
      elevation: 7820,
      runways: [
        {
          runway: 'RWY15',
          tora: 8006,
          toda: 8006,
          lda: 7006,
          width: 100,
          slope: 0.7,
          pcn: '50/R/B/W/T'
        },
        {
          runway: 'RWY33',
          tora: 8006,
          toda: 8006,
          lda: 8006,
          width: 100,
          slope: 0.7,
          pcn: '50/R/B/W/T'
        }
      ],
      approaches: [
        { runway: 'RWY15', type: 'VOR/DME', glidepath: 3.77 },
        { runway: 'RWY33', type: 'RNAV(GPS)', glidepath: 6.5 }
      ],
      runwayLighting: 'MIRL / REIL 15, 33',
      mountainous: true,
      obstructions: 'Mountainous terrain all quadrants. High density altitude.',
      firefighting: 'ARFF Index B during tower hours',
      fboName: 'Signature Flight Support',
      fboPhone: '970.920.9000',
      fboHours: 'Tower hours',
      fboLocation: 'Main ramp',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'Y (Type I, IV)',
      hangarSpace: 'Very limited',
      opsNotes: 'MPW, TRH',
      limitations: 'Special qualification required. Steep approaches. RWY 33 VDP mandatory. High altitude operations.',
      status: 'active',
      lastReviewed: '2024-12-02',
      reviewedBy: 'G650',
      aircraft: 'G650'
    },
    {
      id: 'apt-004',
      icao: 'KVNY',
      name: 'Van Nuys',
      tower: true,
      attendedHours: '24 hrs',
      elevation: 802,
      runways: [
        {
          runway: 'RWY16L',
          tora: 8001,
          toda: 8001,
          lda: 8001,
          width: 150,
          slope: 0,
          pcn: '75/F/A/W/T'
        },
        {
          runway: 'RWY34R',
          tora: 8001,
          toda: 8001,
          lda: 8001,
          width: 150,
          slope: 0,
          pcn: '75/F/A/W/T'
        },
        {
          runway: 'RWY16R',
          tora: 4013,
          toda: 4013,
          lda: 4013,
          width: 75,
          slope: 0.1,
          pcn: '30/F/C/X/T'
        }
      ],
      approaches: [
        { runway: 'RWY16L', type: 'ILS', glidepath: 3 },
        { runway: 'RWY16L', type: 'RNAV(GPS)', glidepath: 3 },
        { runway: 'RWY34R', type: 'RNAV(GPS)', glidepath: 3 }
      ],
      runwayLighting: 'HIRL 16L/34R / MIRL 16R/34L',
      mountainous: true,
      obstructions: 'Mountains to N and NE. Class B airspace overhead.',
      firefighting: 'ARFF Index D - 24 hr',
      fboName: 'Clay Lacy Aviation',
      fboPhone: '818.989.2900',
      fboHours: '24 hrs',
      fboLocation: 'South side',
      restArea: true,
      jetAAvailable: true,
      deicingCapability: 'Y (Type I)',
      hangarSpace: 'Available with advance notice',
      opsNotes: 'DLC',
      limitations: 'Noise sensitive airport. Curfew 2200-0700L for jets over 75,000 lbs.',
      status: 'active',
      lastReviewed: '2024-11-28',
      reviewedBy: 'G650',
      aircraft: 'G650'
    }
  ];

  const changeRequests: ChangeRequest[] = [
    {
      id: 'chg-001',
      airportIcao: 'KTEB',
      airportName: 'Teterboro',
      submittedBy: 'Capt. Mike Wilson',
      submittedDate: '2024-12-04',
      changeType: 'correction',
      changes: {
        fboPhone: '201.288.1800',
        deicingCapability: 'Y (Type I, II, IV) - Updated provider'
      },
      reason: 'FBO phone number changed and new deicing provider contract',
      status: 'pending-chief-pilot',
      approverStatus: 'approved',
      approverComments: 'Verified with FBO. Changes are accurate.',
      approverDate: '2024-12-05'
    },
    {
      id: 'chg-002',
      airportIcao: 'KJAC',
      airportName: 'Jackson Hole',
      submittedBy: 'FO Sarah Davis',
      submittedDate: '2024-12-03',
      changeType: 'new-airport',
      changes: {
        fullEvaluation: true
      },
      reason: 'Requested destination for upcoming trips',
      status: 'pending-approver'
    },
    {
      id: 'chg-003',
      airportIcao: 'KSMO',
      airportName: 'Santa Monica',
      submittedBy: 'Capt. Tom Anderson',
      submittedDate: '2024-12-01',
      changeType: 'update',
      changes: {
        limitations: 'Airport closure scheduled for 2028. Long-term planning affected.'
      },
      reason: 'Important operational update regarding future closure',
      status: 'pending-scheduling',
      approverStatus: 'approved',
      approverDate: '2024-12-02',
      chiefPilotStatus: 'approved',
      chiefPilotDate: '2024-12-05'
    }
  ];

  const deniedAirports: ChangeRequest[] = [
    {
      id: 'chg-deny-001',
      airportIcao: 'KMDW',
      airportName: 'Chicago Midway',
      submittedBy: 'FO Lisa Brown',
      submittedDate: '2024-11-15',
      changeType: 'new-airport',
      changes: {},
      reason: 'Passenger request for alternative to ORD',
      status: 'denied',
      approverStatus: 'denied',
      approverComments: 'Runway length insufficient for G650 at max weight. Noise restrictions incompatible with our operations.',
      approverDate: '2024-11-16',
      denialReason: 'Runway length insufficient for G650 at max weight. Noise restrictions incompatible with our operations.'
    },
    {
      id: 'chg-deny-002',
      airportIcao: 'KBUR',
      airportName: 'Burbank',
      submittedBy: 'Capt. James Taylor',
      submittedDate: '2024-11-20',
      changeType: 'new-airport',
      changes: {},
      reason: 'Alternative LA area airport',
      status: 'denied',
      approverStatus: 'approved',
      approverDate: '2024-11-21',
      chiefPilotStatus: 'denied',
      chiefPilotComments: 'Severe noise restrictions and curfew not compatible with our typical mission profiles. VNY remains approved alternative.',
      chiefPilotDate: '2024-11-25',
      denialReason: 'Severe noise restrictions and curfew not compatible with our typical mission profiles. VNY remains approved alternative.'
    }
  ];

  const filteredAirports = airports.filter(airport => {
    const matchesSearch = airport.icao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         airport.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || airport.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleViewAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setCurrentView('detail');
  };

  const handleSubmitCorrection = (airportIcao?: string) => {
    setCurrentView('submit');
    if (airportIcao && selectedAirport?.icao === airportIcao) {
      // Keep selectedAirport for context
    }
  };

  if (currentView === 'detail' && selectedAirport) {
    return (
      <AirportDetail
        airport={selectedAirport}
        onBack={() => setCurrentView('list')}
        onSubmitCorrection={() => handleSubmitCorrection(selectedAirport.icao)}
      />
    );
  }

  if (currentView === 'submit') {
    return (
      <SubmitCorrection
        onBack={() => setCurrentView('list')}
        preSelectedAirport={selectedAirport}
      />
    );
  }

  if (currentView === 'approvals') {
    return (
      <PendingApprovals
        changeRequests={changeRequests}
        onBack={() => setCurrentView('list')}
      />
    );
  }

  if (currentView === 'denied') {
    return (
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => setCurrentView('list')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Airports
          </Button>
          <h1 className="text-2xl">Denied Airports</h1>
          <p className="text-muted-foreground">
            Airports that have been denied for operational use with denial reasons
          </p>
        </div>

        <div className="space-y-4">
          {deniedAirports.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg mb-2">No Denied Airports</h3>
              <p className="text-muted-foreground">
                All airport requests have been approved or are pending review
              </p>
            </Card>
          ) : (
            deniedAirports.map(request => (
              <Card key={request.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{request.airportIcao}</h3>
                      <span className="text-muted-foreground">•</span>
                      <span>{request.airportName}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3" />
                        Denied
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Submitted by {request.submittedBy} on {new Date(request.submittedDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-1">Denial Reason</h4>
                      <p className="text-sm text-red-800">{request.denialReason}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2">Original Request Reason</h4>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>

                {request.approverComments && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-2">Approver Comments</h4>
                    <p className="text-sm text-muted-foreground">{request.approverComments}</p>
                  </div>
                )}

                {request.chiefPilotComments && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-2">Chief Pilot Comments</h4>
                    <p className="text-sm text-muted-foreground">{request.chiefPilotComments}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Airport Evaluations</h1>
        <p className="text-muted-foreground">
          Review airport evaluations and submit corrections
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ICAO code or airport name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button onClick={() => handleSubmitCorrection()}>
          <Plus className="w-4 h-4 mr-2" />
          Submit Correction
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">Status:</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('active')}
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'pending-changes' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending-changes')}
              >
                Pending Changes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Airports</p>
              <p className="text-2xl">{airports.filter(a => a.status === 'active').length}</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setCurrentView('approvals')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Changes</p>
              <p className="text-2xl">{changeRequests.length}</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setCurrentView('denied')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Denied Airports</p>
              <p className="text-2xl">{deniedAirports.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plane className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Evaluated</p>
              <p className="text-2xl">{airports.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Airports List */}
      <div className="space-y-3">
        {filteredAirports.length === 0 ? (
          <Card className="p-12 text-center">
            <MapPin className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg mb-2">No Airports Found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try a different search term' : 'No airports match your filters'}
            </p>
          </Card>
        ) : (
          filteredAirports.map(airport => (
            <Card key={airport.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{airport.icao}</h3>
                    <span className="text-muted-foreground">•</span>
                    <span>{airport.name}</span>
                    {airport.status === 'pending-changes' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                        <Clock className="w-3 h-3" />
                        Pending Changes
                      </span>
                    )}
                    {airport.mountainous && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                        <AlertCircle className="w-3 h-3" />
                        Mountainous
                      </span>
                    )}
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Elevation:</span>
                      <span>{airport.elevation} ft</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Runways:</span>
                      <span>{airport.runways.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tower:</span>
                      <span>{airport.tower ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last Reviewed:</span>
                      <span>{new Date(airport.lastReviewed).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {airport.limitations && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-orange-900">Limitations</p>
                          <p className="text-sm text-orange-800">{airport.limitations}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAirport(airport)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAirport(airport);
                      handleSubmitCorrection(airport.icao);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Submit Correction
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}