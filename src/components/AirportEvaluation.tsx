import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import {
  Plane,
  MapPin,
  Search,
  Plus,
  Clock,
  Utensils,
  AlertTriangle,
  CheckCircle,
  Star,
  Ruler,
  Weight,
  Radio,
  Info,
  Calendar,
  Send,
  Eye
} from 'lucide-react';

interface Flight {
  id: string;
  date: string;
  time: string;
  departure: string;
  arrival: string;
  aircraft: string;
  status: string;
}

interface AirportEvaluation {
  id: string;
  icao: string;
  iata: string;
  name: string;
  city: string;
  state: string;
  country: string;
  elevation: number;
  runways: RunwayInfo[];
  taxiways: TaxiwayInfo;
  rampInfo: RampInfo;
  towerHours: TowerHours;
  restaurants: Restaurant[];
  services: AirportService[];
  specialNotes: string[];
  weather: WeatherInfo;
  fuel: FuelInfo;
  lastUpdated: string;
  updatedBy: string;
  rating: number;
  reviewCount: number;
}

interface RunwayInfo {
  designation: string;
  length: number;
  width: number;
  surface: string;
  lighting: string;
  ils: boolean;
}

interface TaxiwayInfo {
  weightLimit: number;
  psiLimit: number;
  notes: string;
}

interface RampInfo {
  weightLimit: number;
  psiLimit: number;
  spots: number;
  notes: string;
}

interface TowerHours {
  weekdays: string;
  weekends: string;
  notes: string;
}

interface Restaurant {
  name: string;
  cuisine: string;
  distance: string;
  rating: number;
  priceRange: string;
  notes: string;
}

interface AirportService {
  name: string;
  available: boolean;
  hours: string;
  contact: string;
  notes: string;
}

interface WeatherInfo {
  predominantWinds: string;
  averageVisibility: string;
  commonConditions: string[];
}

interface FuelInfo {
  jetA: boolean;
  avgas: boolean;
  supplier: string;
  hours: string;
  notes: string;
}

interface EvaluationSubmission {
  id: string;
  airportIcao: string;
  airportName: string;
  submittedBy: string;
  submittedDate: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  approver?: string;
  approvedDate?: string;
  feedback?: string;
}

export default function AirportEvaluation() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAirport, setSelectedAirport] = useState<AirportEvaluation | null>(null);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);

  // Mock upcoming flights data
  const upcomingFlights: Flight[] = [
    {
      id: 'FL001',
      date: '2024-01-20',
      time: '08:00',
      departure: 'KTEB',
      arrival: 'KPBI',
      aircraft: 'N1PG',
      status: 'confirmed'
    },
    {
      id: 'FL002',
      date: '2024-01-20',
      time: '14:30',
      departure: 'KPBI',
      arrival: 'KIAH',
      aircraft: 'N456CD',
      status: 'confirmed'
    },
    {
      id: 'FL003',
      date: '2024-01-21',
      time: '09:15',
      departure: 'KIAH',
      arrival: 'KBOS',
      aircraft: 'N789EF',
      status: 'pending'
    }
  ];

  // Mock airport evaluations data
  const airportEvaluations: AirportEvaluation[] = [
    {
      id: 'KTEB',
      icao: 'KTEB',
      iata: 'TEB',
      name: 'Teterboro Airport',
      city: 'Teterboro',
      state: 'NJ',
      country: 'USA',
      elevation: 9,
      runways: [
        {
          designation: '01/19',
          length: 7000,
          width: 150,
          surface: 'Asphalt',
          lighting: 'HIRL',
          ils: true
        },
        {
          designation: '06/24',
          length: 6013,
          width: 150,
          surface: 'Asphalt',
          lighting: 'MIRL',
          ils: false
        }
      ],
      taxiways: {
        weightLimit: 120000,
        psiLimit: 250,
        notes: 'All taxiways support heavy aircraft operations'
      },
      rampInfo: {
        weightLimit: 120000,
        psiLimit: 250,
        spots: 45,
        notes: 'Multiple FBO options available'
      },
      towerHours: {
        weekdays: '06:00-24:00',
        weekends: '06:00-24:00',
        notes: 'Class D airspace, very busy during peak hours'
      },
      restaurants: [
        {
          name: 'The Metropolitan Cafe',
          cuisine: 'American',
          distance: '0.5 miles',
          rating: 4.5,
          priceRange: '$$$',
          notes: 'Popular with aviation personnel, good steaks'
        },
        {
          name: 'Sanzari\'s New Bridge Inn',
          cuisine: 'Italian',
          distance: '2.1 miles',
          rating: 4.2,
          priceRange: '$$$$',
          notes: 'Upscale dining, excellent for client entertainment'
        }
      ],
      services: [
        {
          name: 'Customs',
          available: true,
          hours: '24/7',
          contact: '(201) 288-1846',
          notes: 'Prior notification required for international arrivals'
        },
        {
          name: 'Catering',
          available: true,
          hours: '05:00-22:00',
          contact: 'Multiple providers',
          notes: 'Excellent catering options available'
        }
      ],
      specialNotes: [
        'Very busy airport - expect delays during peak hours',
        'NYC TFR frequently active - check NOTAMs',
        'Ground crews are professional and experienced with large aircraft',
        'Parking can be limited during peak times - reserve in advance'
      ],
      weather: {
        predominantWinds: '220° at 8-12 knots',
        averageVisibility: '10+ miles',
        commonConditions: ['Clear', 'Few clouds', 'Occasional fog in winter mornings']
      },
      fuel: {
        jetA: true,
        avgas: true,
        supplier: 'Multiple FBOs',
        hours: '24/7',
        notes: 'Competitive pricing, multiple suppliers'
      },
      lastUpdated: '2024-01-15',
      updatedBy: 'Captain Rodriguez',
      rating: 4.6,
      reviewCount: 23
    },
    {
      id: 'KPBI',
      icao: 'KPBI',
      iata: 'PBI',
      name: 'Palm Beach International Airport',
      city: 'West Palm Beach',
      state: 'FL',
      country: 'USA',
      elevation: 19,
      runways: [
        {
          designation: '10L/28R',
          length: 10008,
          width: 150,
          surface: 'Asphalt',
          lighting: 'HIRL',
          ils: true
        },
        {
          designation: '10R/28L',
          length: 6934,
          width: 150,
          surface: 'Asphalt',
          lighting: 'MIRL',
          ils: true
        }
      ],
      taxiways: {
        weightLimit: 200000,
        psiLimit: 350,
        notes: 'Excellent taxiway system, well maintained'
      },
      rampInfo: {
        weightLimit: 200000,
        psiLimit: 350,
        spots: 35,
        notes: 'Modern GA facilities, excellent FBO services'
      },
      towerHours: {
        weekdays: '05:00-01:00',
        weekends: '05:00-01:00',
        notes: 'Class C airspace, moderate traffic'
      },
      restaurants: [
        {
          name: 'The Breakers',
          cuisine: 'Fine Dining',
          distance: '8.2 miles',
          rating: 4.8,
          priceRange: '$$$$$',
          notes: 'World-class resort dining, perfect for VIP passengers'
        },
        {
          name: 'City Cellar Wine Bar',
          cuisine: 'Mediterranean',
          distance: '5.5 miles',
          rating: 4.4,
          priceRange: '$$$',
          notes: 'Great wine selection, upscale atmosphere'
        }
      ],
      services: [
        {
          name: 'Customs',
          available: true,
          hours: '24/7',
          contact: '(561) 471-7235',
          notes: 'Excellent international services'
        },
        {
          name: 'Ground Transportation',
          available: true,
          hours: '24/7',
          contact: 'Multiple providers',
          notes: 'Luxury car services readily available'
        }
      ],
      specialNotes: [
        'Popular destination for high-net-worth passengers',
        'Excellent weather year-round',
        'Multiple high-end FBOs with excellent service',
        'Easy access to Worth Avenue shopping district'
      ],
      weather: {
        predominantWinds: '090° at 6-10 knots',
        averageVisibility: '10+ miles',
        commonConditions: ['Clear', 'Scattered clouds', 'Afternoon thunderstorms in summer']
      },
      fuel: {
        jetA: true,
        avgas: true,
        supplier: 'Signature Flight Support, Atlantic Aviation',
        hours: '24/7',
        notes: 'Premium fuel services, quick turnarounds'
      },
      lastUpdated: '2024-01-12',
      updatedBy: 'Captain Smith',
      rating: 4.8,
      reviewCount: 31
    }
  ];

  // Mock submission data
  const evaluationSubmissions: EvaluationSubmission[] = [
    {
      id: 'SUB001',
      airportIcao: 'KTEB',
      airportName: 'Teterboro Airport',
      submittedBy: 'Captain Wilson',
      submittedDate: '2024-01-18',
      category: 'Restaurant',
      title: 'New Restaurant Recommendation',
      description: 'Discovered excellent Italian restaurant within walking distance of FBO',
      status: 'pending'
    },
    {
      id: 'SUB002',
      airportIcao: 'KPBI',
      airportName: 'Palm Beach International',
      submittedBy: 'Captain Johnson',
      submittedDate: '2024-01-15',
      category: 'Special Notes',
      title: 'Construction Update',
      description: 'Runway 10L/28R construction affecting taxi times during 14:00-16:00',
      status: 'approved',
      approver: 'Chief Pilot',
      approvedDate: '2024-01-16',
      feedback: 'Added to special notes section'
    }
  ];

  // Get unique airports from upcoming flights
  const upcomingAirports = Array.from(new Set([
    ...upcomingFlights.map(f => f.departure),
    ...upcomingFlights.map(f => f.arrival)
  ]));

  // Filter airports based on search
  const filteredAirports = airportEvaluations.filter(airport =>
    airport.icao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.iata.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    airport.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          <Plane className="w-6 h-6" />
          Airport Evaluations
        </h1>
        <p className="text-muted-foreground">Access detailed airport information and evaluations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">Upcoming Flights</TabsTrigger>
          <TabsTrigger value="search">Search Airports</TabsTrigger>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedAirport}>
            {selectedAirport ? `${selectedAirport.icao} Details` : 'Airport Details'}
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Flights Tab */}
        <TabsContent value="upcoming" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Your Upcoming Flights
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click on any airport to view detailed evaluation information
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingFlights.map((flight) => (
                    <Card key={flight.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{flight.id}</Badge>
                            <span className="font-medium">
                              {flight.departure} → {flight.arrival}
                            </span>
                            <Badge variant={flight.status === 'confirmed' ? 'default' : 'secondary'}>
                              {flight.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(flight.date)} at {flight.time} • {flight.aircraft}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const airport = airportEvaluations.find(a => a.icao === flight.departure);
                              if (airport) {
                                setSelectedAirport(airport);
                                setActiveTab('details');
                              }
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View {flight.departure}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const airport = airportEvaluations.find(a => a.icao === flight.arrival);
                              if (airport) {
                                setSelectedAirport(airport);
                                setActiveTab('details');
                              }
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View {flight.arrival}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Access - Upcoming Airports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {upcomingAirports.map((icao) => {
                    const airport = airportEvaluations.find(a => a.icao === icao);
                    return (
                      <Button
                        key={icao}
                        variant="outline"
                        className="h-20 flex flex-col gap-1"
                        onClick={() => {
                          if (airport) {
                            setSelectedAirport(airport);
                            setActiveTab('details');
                          }
                        }}
                      >
                        <MapPin className="w-5 h-5" />
                        <span className="font-medium">{icao}</span>
                        <span className="text-xs text-muted-foreground">
                          {airport?.name || 'Evaluation Pending'}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Search Airports Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Airport Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by ICAO, IATA, airport name, or city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Submit Evaluation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Submit New Evaluation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Airport ICAO Code</Label>
                        <Input placeholder="e.g., KJFK" />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="runway">Runway Information</SelectItem>
                            <SelectItem value="taxiway">Taxiway/Ramp Limits</SelectItem>
                            <SelectItem value="restaurant">Restaurant Recommendation</SelectItem>
                            <SelectItem value="service">Airport Services</SelectItem>
                            <SelectItem value="notes">Special Notes</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Title</Label>
                        <Input placeholder="Brief description of your submission" />
                      </div>
                      <div>
                        <Label>Details</Label>
                        <Textarea
                          placeholder="Provide detailed information about your evaluation or update..."
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1">
                          <Send className="w-4 h-4 mr-2" />
                          Submit for Approval
                        </Button>
                        <Button variant="outline" onClick={() => setShowSubmissionDialog(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-4">
                {filteredAirports.map((airport) => (
                  <Card key={airport.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{airport.icao} / {airport.iata}</h3>
                            <Badge variant="secondary">{airport.country}</Badge>
                            <div className="flex items-center gap-1">
                              {renderStars(airport.rating)}
                              <span className="text-sm text-muted-foreground ml-1">
                                ({airport.reviewCount})
                              </span>
                            </div>
                          </div>
                          <h4 className="font-medium mb-1">{airport.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {airport.city}, {airport.state}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Elevation: {airport.elevation} ft</span>
                            <span>Runways: {airport.runways.length}</span>
                            <span>Updated: {formatDate(airport.lastUpdated)}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedAirport(airport);
                            setActiveTab('details');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredAirports.length === 0 && searchTerm && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">No airports found</h3>
                      <p className="text-muted-foreground mb-4">
                        No airports match your search criteria. You can submit a new evaluation for this airport.
                      </p>
                      <Button onClick={() => setShowSubmissionDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Submit New Evaluation
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Submissions Tab */}
        <TabsContent value="submissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                My Evaluation Submissions
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your submitted evaluations and their approval status
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {evaluationSubmissions.map((submission) => (
                  <Card key={submission.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{submission.title}</h4>
                            <Badge variant="outline">{submission.airportIcao}</Badge>
                            <Badge
                              variant={
                                submission.status === 'approved' ? 'default' :
                                  submission.status === 'rejected' ? 'destructive' : 'secondary'
                              }
                            >
                              {submission.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {submission.status === 'rejected' && <AlertTriangle className="w-3 h-3 mr-1" />}
                              {submission.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                              {submission.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {submission.airportName} • {submission.category}
                          </p>
                          <p className="text-sm mb-2">{submission.description}</p>
                          <div className="text-xs text-muted-foreground">
                            Submitted: {formatDate(submission.submittedDate)}
                            {submission.approvedDate && (
                              <span> • Approved: {formatDate(submission.approvedDate)}</span>
                            )}
                          </div>
                          {submission.feedback && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <strong>Feedback:</strong> {submission.feedback}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Airport Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {selectedAirport && (
            <>
              {/* Header Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h2>{selectedAirport.icao} / {selectedAirport.iata}</h2>
                        <Badge variant="secondary">{selectedAirport.country}</Badge>
                        <div className="flex items-center gap-1">
                          {renderStars(selectedAirport.rating)}
                          <span className="text-sm text-muted-foreground ml-1">
                            {selectedAirport.rating} ({selectedAirport.reviewCount} reviews)
                          </span>
                        </div>
                      </div>
                      <h3 className="font-medium mb-1">{selectedAirport.name}</h3>
                      <p className="text-muted-foreground">
                        {selectedAirport.city}, {selectedAirport.state} • Elevation: {selectedAirport.elevation} ft
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Last updated: {formatDate(selectedAirport.lastUpdated)}</p>
                      <p>By: {selectedAirport.updatedBy}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Runway Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ruler className="w-5 h-5" />
                      Runway Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedAirport.runways.map((runway, index) => (
                        <div key={index} className="p-3 border rounded">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">Runway {runway.designation}</h4>
                            {runway.ils && <Badge variant="secondary">ILS</Badge>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Length: {runway.length.toLocaleString()} ft</div>
                            <div>Width: {runway.width} ft</div>
                            <div>Surface: {runway.surface}</div>
                            <div>Lighting: {runway.lighting}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Weight Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Weight className="w-5 h-5" />
                      Weight & PSI Limits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 border rounded">
                        <h4 className="font-medium mb-2">Taxiways</h4>
                        <div className="text-sm space-y-1">
                          <div>Weight Limit: {selectedAirport.taxiways.weightLimit.toLocaleString()} lbs</div>
                          <div>PSI Limit: {selectedAirport.taxiways.psiLimit} PSI</div>
                          <div className="text-muted-foreground">{selectedAirport.taxiways.notes}</div>
                        </div>
                      </div>
                      <div className="p-3 border rounded">
                        <h4 className="font-medium mb-2">Ramp</h4>
                        <div className="text-sm space-y-1">
                          <div>Weight Limit: {selectedAirport.rampInfo.weightLimit.toLocaleString()} lbs</div>
                          <div>PSI Limit: {selectedAirport.rampInfo.psiLimit} PSI</div>
                          <div>Parking Spots: {selectedAirport.rampInfo.spots}</div>
                          <div className="text-muted-foreground">{selectedAirport.rampInfo.notes}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tower Hours */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Radio className="w-5 h-5" />
                      Tower Hours & Operations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Weekdays</Label>
                        <p className="text-sm">{selectedAirport.towerHours.weekdays}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Weekends</Label>
                        <p className="text-sm">{selectedAirport.towerHours.weekends}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Notes</Label>
                        <p className="text-sm text-muted-foreground">{selectedAirport.towerHours.notes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Fuel Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plane className="w-5 h-5" />
                      Fuel Services
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {selectedAirport.fuel.jetA && <Badge>Jet A</Badge>}
                        {selectedAirport.fuel.avgas && <Badge variant="secondary">AvGas</Badge>}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Supplier</Label>
                        <p className="text-sm">{selectedAirport.fuel.supplier}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Hours</Label>
                        <p className="text-sm">{selectedAirport.fuel.hours}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Notes</Label>
                        <p className="text-sm text-muted-foreground">{selectedAirport.fuel.notes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Restaurants */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Utensils className="w-5 h-5" />
                    Nearby Restaurants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedAirport.restaurants.map((restaurant, index) => (
                      <div key={index} className="p-4 border rounded">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{restaurant.name}</h4>
                          <Badge variant="outline">{restaurant.priceRange}</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1">
                            {renderStars(restaurant.rating)}
                            <span className="text-muted-foreground">({restaurant.rating})</span>
                          </div>
                          <div>{restaurant.cuisine} • {restaurant.distance}</div>
                          <div className="text-muted-foreground">{restaurant.notes}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Special Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Special Notes & Considerations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedAirport.specialNotes.map((note, index) => (
                      <Alert key={index}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{note}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Airport Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedAirport.services.map((service, index) => (
                      <div key={index} className="p-4 border rounded">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{service.name}</h4>
                          <Badge variant={service.available ? 'default' : 'secondary'}>
                            {service.available ? 'Available' : 'Not Available'}
                          </Badge>
                        </div>
                        {service.available && (
                          <div className="space-y-1 text-sm">
                            <div>Hours: {service.hours}</div>
                            <div>Contact: {service.contact}</div>
                            <div className="text-muted-foreground">{service.notes}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}