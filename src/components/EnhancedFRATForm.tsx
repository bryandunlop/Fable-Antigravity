import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Plane,
  Calendar,
  Clock,
  ArrowLeft,
  Save,
  Send,
  Users,
  MapPin,
  Cloud,
  Package,
  Wrench
} from 'lucide-react';

interface FRATItem {
  id: string;
  label: string;
  score: number;
  selected: boolean;
}

interface FRATSection {
  title: string;
  icon: React.ElementType;
  items: FRATItem[];
}

interface EnhancedFRATFormProps {
  userRole?: string;
  initialData?: any;
  onClose?: () => void;
  onSave?: (data: any) => void;
}

export default function EnhancedFRATForm({ userRole = 'pilot', initialData, onClose, onSave }: EnhancedFRATFormProps) {
  const navigate = useNavigate();
  // Use initialData or fall back to defaults
  const flightData = initialData;

  // Basic flight information
  const [flightNumber, setFlightNumber] = useState(flightData?.flightNumber || '');
  const [aircraft, setAircraft] = useState(flightData?.aircraft || 'N123GS');
  const [departure, setDeparture] = useState(flightData?.departure || '');
  const [destination, setDestination] = useState(flightData?.destination || '');
  const [flightDate, setFlightDate] = useState(flightData?.date || new Date().toISOString().split('T')[0]);
  const [departureTime, setDepartureTime] = useState(flightData?.time || '');
  const [picName, setPicName] = useState('');
  const [sicName, setSicName] = useState('');
  const [mitigationNotes, setMitigationNotes] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // FRAT Sections with all items
  const [fratSections, setFratSections] = useState<FRATSection[]>([
    {
      title: 'Pilot Qualifications',
      icon: Users,
      items: [
        { id: 'pq1', label: 'PIC with less than 200 flight hours in A/C type', score: 2, selected: false },
        { id: 'pq2', label: 'PIC with less than 50 flight hours in last 90 days', score: 1, selected: false },
        { id: 'pq3', label: 'SIC with less than 200 flight hours in A/C type', score: 1, selected: false },
        { id: 'pq4', label: 'SIC with less than 50 flight hours in the last 90 days', score: 1, selected: false },
        { id: 'pq5', label: 'Crew Reports High Stress or Major Life Event (Death, Divorce, Serious Illness)', score: 3, selected: false },
      ]
    },
    {
      title: 'Flight Crew Duty Day',
      icon: Clock,
      items: [
        { id: 'fd1', label: 'Leg extends beyond 12 hour duty day', score: 2, selected: false },
        { id: 'fd2', label: 'First leg of TRIP (select also 1st leg today)', score: 1, selected: false },
        { id: 'fd3', label: 'First leg today', score: 1, selected: false },
        { id: 'fd4', label: '2nd leg today', score: 2, selected: false },
        { id: 'fd5', label: '3rd leg today', score: 3, selected: false },
        { id: 'fd6', label: '4th leg today', score: 4, selected: false },
        { id: 'fd7', label: '5th or greater leg today', score: 5, selected: false },
        { id: 'fd8', label: 'Flight during Window of Circadian Low (WOCL)', score: 3, selected: false },
        { id: 'fd9', label: '3rd Pilot will be used on this leg', score: 0, selected: false },
      ]
    },
    {
      title: 'Departure Airport',
      icon: Plane,
      items: [
        { id: 'da1', label: 'Mountainous airport', score: 2, selected: false },
        { id: 'da2', label: 'Control tower not operational at ETD', score: 1, selected: false },
        { id: 'da3', label: "Take-off distance within 500' of available runway", score: 4, selected: false },
        { id: 'da4', label: 'Noise Sensitive Airport', score: 2, selected: false },
        { id: 'da5', label: 'Departure airport visibility less than landing minimums', score: 2, selected: false },
      ]
    },
    {
      title: 'Destination Airport',
      icon: MapPin,
      items: [
        { id: 'aa1', label: 'Control tower not operational at ETA', score: 1, selected: false },
        { id: 'aa2', label: 'Stopping distance greater than 80% of the available runway', score: 5, selected: false },
        { id: 'aa3', label: 'Only Circling Approaches available for intended runway', score: 3, selected: false },
        { id: 'aa4', label: 'No published approaches', score: 3, selected: false },
        { id: 'aa5', label: 'Approach w/o vertical guidance (best available approach)', score: 3, selected: false },
        { id: 'aa6', label: 'Mountainous airport', score: 1, selected: false },
        { id: 'aa7', label: 'Noise Sensitive Airport', score: 2, selected: false },
      ]
    },
    {
      title: 'Trip Details',
      icon: Package,
      items: [
        { id: 'td1', label: 'Nighttime Take-off or Landing', score: 2, selected: false },
        { id: 'td2', label: 'International trip (outside contiguous US48)', score: 1, selected: false },
        { id: 'td3', label: 'Leg Length less than 50 NM', score: 4, selected: false },
        { id: 'td4', label: 'Repositioning Flight (no passengers or cargo)', score: 3, selected: false },
        { id: 'td5', label: 'Pop-up trip (less than 4 hours notice)', score: 3, selected: false },
        { id: 'td6', label: 'Operation in QFE Environment', score: 4, selected: false },
        { id: 'td7', label: 'Non WGS-84 Country or Airport', score: 3, selected: false },
        { id: 'td8', label: 'Oceanic and/or Polar Ops', score: 2, selected: false },
        { id: 'td9', label: 'Extended flight over other remote terrain', score: 1, selected: false },
        { id: 'td10', label: 'Flight through HROC Region', score: 2, selected: false },
        { id: 'td11', label: 'Training Flight', score: 3, selected: false },
      ]
    },
    {
      title: 'Weather',
      icon: Cloud,
      items: [
        { id: 'wx1', label: 'No weather reporting available at the destination airport', score: 5, selected: false },
        { id: 'wx2', label: 'Surface winds > 20kts sustained (Dept or Dest)', score: 1, selected: false },
        { id: 'wx3', label: 'Crosswind Component > 10kts (Dept or Dest)', score: 2, selected: false },
        { id: 'wx4', label: 'Thunderstorms and/or heavy rain (Dept or Dest)', score: 3, selected: false },
        { id: 'wx5', label: 'Icing (moderate to severe)', score: 5, selected: false },
        { id: 'wx6', label: 'Frozen precipitation at departure and/or destination', score: 3, selected: false },
        { id: 'wx7', label: 'Ceiling and visibility at destination less than 500 ft / 1 statute miles', score: 1, selected: false },
        { id: 'wx8', label: 'Gust factor > 10kts (Dept or Dest)', score: 3, selected: false },
        { id: 'wx9', label: 'SIGMET or Convective SIGMET', score: 2, selected: false },
        { id: 'wx10', label: 'Wet runway at departure or destination', score: 2, selected: false },
        { id: 'wx11', label: 'Braking action < "Good" at departure or destination', score: 5, selected: false },
      ]
    },
    {
      title: 'Other',
      icon: Wrench,
      items: [
        { id: 'ot1', label: 'Special flight permit operation (ferry permit)', score: 3, selected: false },
        { id: 'ot2', label: 'MEL / CDL items (items related to the safety of flight)', score: 2, selected: false },
        { id: 'ot3', label: 'Special flight limitations based on AFM equipment limitations', score: 2, selected: false },
        { id: 'ot4', label: 'RAAS Inop', score: 1, selected: false },
        { id: 'ot5', label: 'TCAS Inop', score: 3, selected: false },
        { id: 'ot6', label: 'TAWS/EGPWS Inop', score: 3, selected: false },
        { id: 'ot7', label: 'Auto Throttles Inop (or not installed)', score: 2, selected: false },
        { id: 'ot8', label: 'HUD / EVS will be used', score: 0, selected: false },
      ]
    },
  ]);

  // Calculate total score
  const calculateTotalScore = () => {
    let total = 0;
    fratSections.forEach(section => {
      section.items.forEach(item => {
        if (item.selected) {
          total += item.score;
        }
      });
    });
    return total;
  };

  const totalScore = calculateTotalScore();

  // Determine risk level based on score
  const getRiskLevel = (score: number) => {
    if (score <= 10) return { level: 'low', color: 'green', label: 'Low Risk' };
    if (score <= 20) return { level: 'medium', color: 'yellow', label: 'Medium Risk' };
    return { level: 'high', color: 'red', label: 'High Risk' };
  };

  const riskLevel = getRiskLevel(totalScore);
  const mitigationRequired = totalScore > 10;

  // Toggle item selection
  const handleItemToggle = (sectionIndex: number, itemIndex: number) => {
    setFratSections(prev => {
      const newSections = [...prev];
      newSections[sectionIndex].items[itemIndex].selected = !newSections[sectionIndex].items[itemIndex].selected;
      return newSections;
    });
  };

  const [status, setStatus] = useState('draft');

  // Helper helper to calculate section score
  const getSectionScore = (section: FRATSection) => {
    return section.items.reduce((acc, item) => item.selected ? acc + item.score : acc, 0);
  };

  // Handle form submission
  const handleSubmit = (newStatus: string) => {
    setStatus(newStatus);
    const data = {
      flightNumber,
      aircraft,
      departure,
      destination,
      date: flightDate,
      time: departureTime,
      pic: picName,
      sic: sicName,
      items: fratSections,
      totalScore,
      status: newStatus
    };

    if (onSave) {
      onSave(data);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DEV] Form saved:', data);
      }
      toast.success(newStatus === 'draft' ? 'Draft saved successfully' : 'FRAT submitted successfully');
      if (newStatus === 'submitted' && onClose) {
        onClose();
      }
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Enhanced FRAT Form</h1>
            <p className="text-sm text-muted-foreground">
              Flight Risk Assessment Tool - Gulfstream G650
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => onClose ? onClose() : navigate('/frat')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Risk Score Card */}
      < Card className={`border-2 ${riskLevel.level === 'low' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
        riskLevel.level === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
          'border-red-500 bg-red-50 dark:bg-red-950'
        }`
      }>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {riskLevel.level === 'low' && <CheckCircle className="w-6 h-6 text-green-600" />}
                {riskLevel.level === 'medium' && <AlertTriangle className="w-6 h-6 text-yellow-600" />}
                {riskLevel.level === 'high' && <AlertTriangle className="w-6 h-6 text-red-600" />}
                Current Risk Score: {totalScore}
              </CardTitle>
              <CardDescription>
                Risk Level: <span className={`font-semibold ${riskLevel.level === 'low' ? 'text-green-700 dark:text-green-400' :
                  riskLevel.level === 'medium' ? 'text-yellow-700 dark:text-yellow-400' :
                    'text-red-700 dark:text-red-400'
                  }`}>{riskLevel.label}</span>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${riskLevel.level === 'low' ? 'text-green-600' :
                riskLevel.level === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                {totalScore}
              </div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            value={Math.min((totalScore / 30) * 100, 100)}
            className="h-3"
          />
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>0-10: Low Risk</span>
            <span>11-20: Medium Risk</span>
            <span>21+: High Risk</span>
          </div>
          {mitigationRequired && (
            <Alert className="mt-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Mitigation Required:</strong> This flight exceeds low risk threshold. Please document mitigation strategies below before submitting.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card >

      {/* Flight Information */}
      < Card >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Flight Information
          </CardTitle>
          <CardDescription>
            Flight details will be automatically populated from MyAirOps API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              <strong>Auto-Population:</strong> Flight information below will be automatically populated from the MyAirOps API when you select a flight from the flight list. You can manually edit any field if needed.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="flightNumber">Flight Number *</Label>
              <Input
                id="flightNumber"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="G650-001"
              />
            </div>
            <div>
              <Label htmlFor="aircraft">Aircraft *</Label>
              <Input
                id="aircraft"
                value={aircraft}
                onChange={(e) => setAircraft(e.target.value)}
                placeholder="N123GS"
              />
            </div>
            <div>
              <Label htmlFor="flightDate">Flight Date *</Label>
              <Input
                id="flightDate"
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="departure">Departure *</Label>
              <Input
                id="departure"
                value={departure}
                onChange={(e) => setDeparture(e.target.value.toUpperCase())}
                placeholder="KTEB"
                maxLength={4}
              />
            </div>
            <div>
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                placeholder="KMIA"
                maxLength={4}
              />
            </div>
            <div>
              <Label htmlFor="departureTime">Departure Time (UTC) *</Label>
              <Input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="picName">PIC Name *</Label>
              <Input
                id="picName"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Captain John Smith"
              />
            </div>
            <div>
              <Label htmlFor="sicName">SIC Name</Label>
              <Input
                id="sicName"
                value={sicName}
                onChange={(e) => setSicName(e.target.value)}
                placeholder="First Officer Jane Doe"
              />
            </div>
          </div>
        </CardContent>
      </Card >

      {/* FRAT Sections */}
      {
        fratSections.map((section, sectionIndex) => {
          const Icon = section.icon;
          const sectionScore = getSectionScore(section);
          const hasSelectedItems = section.items.some(item => item.selected);

          return (
            <Card key={sectionIndex} className={hasSelectedItems ? 'border-blue-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {section.title}
                  </CardTitle>
                  {sectionScore > 0 && (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      +{sectionScore} points
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={item.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${item.selected ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' : 'hover:bg-muted/50'
                        }`}
                    >
                      <Checkbox
                        id={item.id}
                        checked={item.selected}
                        onCheckedChange={() => handleItemToggle(sectionIndex, itemIndex)}
                        className="mt-1"
                      />
                      <div className="flex-1 flex items-center justify-between gap-4 py-1">
                        <Label
                          htmlFor={item.id}
                          className="cursor-pointer flex-1"
                        >
                          {item.label}
                        </Label>
                        <Badge
                          variant={item.selected ? "default" : "outline"}
                          className={item.score === 0 ? 'bg-gray-500' : ''}
                        >
                          {item.score === 0 ? '0' : `+${item.score}`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      }

      {/* Mitigation Notes */}
      {
        mitigationRequired && (
          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Mitigation Strategies
              </CardTitle>
              <CardDescription>
                Document how identified risks will be mitigated for this flight (optional but recommended)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={mitigationNotes}
                onChange={(e) => setMitigationNotes(e.target.value)}
                placeholder="Describe specific mitigation strategies for the risks identified above. Include any additional crew briefings, alternate airports, fuel reserves, or other safety measures..."
                rows={6}
              />
            </CardContent>
          </Card>
        )
      }

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Additional Notes
          </CardTitle>
          <CardDescription>
            Add any additional information or comments here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Enter any additional notes or comments for this flight..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end pb-8">
        <Button variant="outline" onClick={() => handleSubmit('draft')}>
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={() => handleSubmit('submitted')} className="bg-green-600 hover:bg-green-700">
          <Send className="w-4 h-4 mr-2" />
          Submit FRAT
        </Button>
      </div>
    </div >
  );
}