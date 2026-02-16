import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  ArrowLeft,
  MapPin,
  Plane,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit,
  Download,
  Fuel,
  Snowflake,
  Home,
  Phone,
  FileText
} from 'lucide-react';

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

interface OpsNote {
  initials: string;
  date: string;
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

interface AirportDetailProps {
  airport: Airport;
  onBack: () => void;
  onSubmitCorrection: () => void;
}

export default function AirportDetail({ airport, onBack, onSubmitCorrection }: AirportDetailProps) {
  const downloadPDF = () => {
    alert(`PDF export for ${airport.icao} would be generated here with full evaluation data.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Airports
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl">{airport.icao}</h1>
              {airport.status === 'pending-changes' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">
                  <Clock className="w-4 h-4" />
                  Pending Changes
                </span>
              )}
              {airport.mountainous && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-700">
                  <AlertCircle className="w-4 h-4" />
                  Mountainous
                </span>
              )}
            </div>
            <p className="text-xl text-muted-foreground">{airport.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Last reviewed: {new Date(airport.lastReviewed).toLocaleDateString()} by {airport.reviewedBy}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={onSubmitCorrection}>
              <Edit className="w-4 h-4 mr-2" />
              Submit Correction
            </Button>
          </div>
        </div>
      </div>

      {/* Basic Airport Data */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Airport Data</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Tower</p>
            <div className="flex items-center gap-2">
              {airport.tower ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-600" />
              )}
              <span className="font-medium">{airport.tower ? 'Yes' : 'No'}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Airport Attended Hours</p>
            <p className="font-medium">{airport.attendedHours}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Airport Elevation</p>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{airport.elevation} ft</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Mountainous</p>
            <div className="flex items-center gap-2">
              {airport.mountainous ? (
                <>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Yes</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">No</span>
                </>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-muted-foreground mb-1">Aircraft Type</p>
            <p className="font-medium">{airport.aircraft}</p>
          </div>
        </div>
      </Card>

      {/* Runway Dimensions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Plane className="w-5 h-5" />
          Runway Dimensions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Runway</th>
                <th className="text-right py-2 px-3">TORA</th>
                <th className="text-right py-2 px-3">TODA</th>
                <th className="text-right py-2 px-3">LDA</th>
                <th className="text-right py-2 px-3">Width</th>
                <th className="text-right py-2 px-3">Rwy Slope</th>
                <th className="text-left py-2 px-3">PCN/Wt Bearing</th>
              </tr>
            </thead>
            <tbody>
              {airport.runways.map((runway, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-3 px-3 font-medium">{runway.runway}</td>
                  <td className="py-3 px-3 text-right">{runway.tora}</td>
                  <td className="py-3 px-3 text-right">{runway.toda}</td>
                  <td className="py-3 px-3 text-right">{runway.lda}</td>
                  <td className="py-3 px-3 text-right">{runway.width}</td>
                  <td className="py-3 px-3 text-right">{runway.slope}%</td>
                  <td className="py-3 px-3">{runway.pcn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Instrument Approaches */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Instrument Approaches</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Runway</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Glidepath (degrees)</th>
              </tr>
            </thead>
            <tbody>
              {airport.approaches.map((approach, idx) => (
                <tr key={idx} className={`border-b last:border-0 ${approach.glidepath > 3 ? 'bg-orange-50' : ''}`}>
                  <td className="py-3 px-4">{approach.runway}</td>
                  <td className="py-3 px-4">{approach.type}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {approach.glidepath > 3 && (
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      )}
                      <span className={approach.glidepath > 3 ? 'font-semibold text-orange-900' : ''}>
                        {approach.glidepath}°
                      </span>
                      {approach.glidepath > 3 && (
                        <span className="text-xs text-orange-700 font-medium">Steep</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Runway Lighting & Obstructions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Runway Lighting</h2>
          <p className="text-muted-foreground">{airport.runwayLighting}</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Obstructions / Terrain</h2>
          <p className="text-muted-foreground">{airport.obstructions}</p>
        </Card>
      </div>

      {/* Fire Fighting */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Fire Fighting Capability</h2>
        <p className="text-muted-foreground">{airport.firefighting}</p>
      </Card>

      {/* FBO & Airport Services */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">FBO & Airport Services</h2>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">FBO Name</p>
              <p className="font-medium">{airport.fboName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium">{airport.fboPhone}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Hours</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium">{airport.fboHours}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Location on Airport</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium">{airport.fboLocation}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${airport.restArea ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Home className={`w-5 h-5 ${airport.restArea ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rest Area</p>
                <p className="font-medium">{airport.restArea ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${airport.jetAAvailable ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Fuel className={`w-5 h-5 ${airport.jetAAvailable ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jet A Available</p>
                <p className="font-medium">{airport.jetAAvailable ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Snowflake className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">De-Icing</p>
                <p className="font-medium">{airport.deicingCapability}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hangar Space</p>
                <p className="font-medium">{airport.hangarSpace}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Operations Notes */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Operations Notes
        </h2>
        {airport.opsNotes ? (
          <div className="p-4 bg-accent rounded-lg">
            <p className="whitespace-pre-wrap">{airport.opsNotes}</p>
          </div>
        ) : (
          <p className="text-muted-foreground italic">No operations notes recorded</p>
        )}
      </Card>

      {/* Limitations/Restrictions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Limitations/Restrictions
        </h2>
        {airport.limitations ? (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="whitespace-pre-wrap text-orange-800">{airport.limitations}</p>
          </div>
        ) : (
          <p className="text-muted-foreground italic">No limitations or restrictions</p>
        )}
      </Card>

      {/* Approval Section */}
      <Card className="p-6 bg-green-50 border-green-200">
        <h2 className="text-xl font-semibold mb-4 text-green-900">Approval</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-green-700 mb-1">Airport Evaluation Officer</p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-medium text-green-900">Approved</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-green-700 mb-1">Chief Pilot</p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-medium text-green-900">Approved</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-green-700 mb-1">Scheduling Manager</p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="font-medium text-green-900">Approved</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}