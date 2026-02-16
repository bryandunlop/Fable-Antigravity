import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Plane,
  Plus,
  Search,
  Edit,
  Eye,
  MapPin,
  Clock,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Building2,
  Star,
  AlertCircle,
  Wrench,
  Users,
  Home,
  Shield
} from 'lucide-react';

interface ServiceCategory {
  name: string;
  rating: number;
  notes?: string;
  lastUpdated?: string;
  updatedBy?: string;
}

interface Contact {
  name: string;
  title: string;
  phone: string;
  email: string;
  department: string;
  isEmergency?: boolean;
}

interface ReviewInfo {
  lastReviewDate: string;
  reviewedBy: string;
  nextReviewDue: string;
  reviewStatus: 'Current' | 'Due Soon' | 'Overdue';
  reviewNotes: string;
  confidence: 'High' | 'Medium' | 'Low';
}

interface UpcomingFlight {
  flightId: string;
  date: string;
  aircraftId: string;
  departureTime: string;
  estimatedArrival: string;
  serviceRequirements: string[];
}

interface Airport {
  id: string;
  icaoCode: string;
  iataCode: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  overallRating: number;
  suggestedSupport: string;
  serviceCategories: {
    mro: ServiceCategory;
    mrt: ServiceCategory;
    momAndPop: ServiceCategory;
    fbo: ServiceCategory;
    companySupport: ServiceCategory;
  };
  contacts: Contact[];
  reviewInfo: ReviewInfo;
  upcomingFlights: UpcomingFlight[];
  operatingHours: {
    standard: string;
    weekend: string;
    emergency: string;
  };
  fees: {
    landing: string;
    parking: string;
    handling: string;
    fuel: string;
  };
  restrictions: string[];
  randomNotes: string;
}

export default function AirportServicesDatabase() {
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [isAddingAirport, setIsAddingAirport] = useState(false);

  const airports: Airport[] = [
    {
      id: 'APT001',
      icaoCode: 'KJFK',
      iataCode: 'JFK',
      name: 'John F. Kennedy International Airport',
      city: 'New York',
      country: 'United States',
      timezone: 'EST',
      overallRating: 4,
      suggestedSupport: 'Excellent for VIP operations - use Jet Aviation FBO',
      serviceCategories: {
        mro: { name: 'MRO', rating: 5, notes: 'Full service capabilities available 24/7', lastUpdated: '2025-01-25', updatedBy: 'Tech Johnson' },
        mrt: { name: 'MRT', rating: 4, notes: 'Good response times, reliable service', lastUpdated: '2025-01-20', updatedBy: 'Tech Williams' },
        momAndPop: { name: 'Mom and Pop', rating: 3, notes: 'Limited options but friendly service', lastUpdated: '2025-01-15', updatedBy: 'Tech Johnson' },
        fbo: { name: 'FBO', rating: 5, notes: 'Jet Aviation - premium service, excellent facilities', lastUpdated: '2025-01-25', updatedBy: 'Tech Rodriguez' },
        companySupport: { name: 'Company Support', rating: 4, notes: 'Strong company relationships, priority handling', lastUpdated: '2025-01-22', updatedBy: 'Tech Davis' }
      },
      contacts: [
        { name: 'Michael Johnson', title: 'FBO Manager', phone: '+1 (718) 244-4444', email: 'mjohnson@jetaviation.com', department: 'FBO Operations' },
        { name: 'Sarah Williams', title: 'Maintenance Chief', phone: '+1 (718) 244-5555', email: 'swilliams@jfkmaint.com', department: 'Maintenance', isEmergency: true },
        { name: 'David Chen', title: 'Ground Services', phone: '+1 (718) 244-6666', email: 'dchen@gategroup.com', department: 'Ground Operations' }
      ],
      reviewInfo: {
        lastReviewDate: '2025-01-25',
        reviewedBy: 'Captain James Rodriguez',
        nextReviewDue: '2025-04-25',
        reviewStatus: 'Current',
        reviewNotes: 'All services operating at high standards. New Jet Aviation lounge completed. Highly recommend for VVIP operations.',
        confidence: 'High'
      },
      upcomingFlights: [
        {
          flightId: 'FO045',
          date: '2025-02-05',
          aircraftId: 'N1PG (G650)',
          departureTime: '14:30',
          estimatedArrival: '18:45',
          serviceRequirements: ['Fuel', 'Catering', 'Ground Power']
        }
      ],
      operatingHours: {
        standard: '24/7',
        weekend: '24/7',
        emergency: '24/7'
      },
      fees: {
        landing: '$8.50/1000 lbs',
        parking: '$15/day',
        handling: '$125 flat',
        fuel: 'Current market + $0.25'
      },
      restrictions: ['Slot controlled', 'Prior approval required'],
      randomNotes: 'Major international gateway. Excellent facilities but can be congested during peak hours. Allow extra time for slot coordination. VIP lounge access available through Jet Aviation. Customs/Immigration processing very efficient for business aviation.'
    },
    {
      id: 'APT002',
      icaoCode: 'KBOS',
      iataCode: 'BOS',
      name: 'Boston Logan International Airport',
      city: 'Boston',
      country: 'United States',
      timezone: 'EST',
      overallRating: 3,
      suggestedSupport: 'Use Signature FBO - adequate for most operations',
      serviceCategories: {
        mro: { name: 'MRO', rating: 3, notes: 'Limited heavy maintenance, refer to nearby facilities', lastUpdated: '2024-12-15', updatedBy: 'Tech Martinez' },
        mrt: { name: 'MRT', rating: 3, notes: 'Basic maintenance response, slower on weekends', lastUpdated: '2024-12-10', updatedBy: 'Tech Johnson' },
        momAndPop: { name: 'Mom and Pop', rating: 2, notes: 'Very limited local options available', lastUpdated: '2024-11-20', updatedBy: 'Tech Davis' },
        fbo: { name: 'FBO', rating: 4, notes: 'Signature Flight Support - reliable service', lastUpdated: '2025-01-10', updatedBy: 'Tech Williams' },
        companySupport: { name: 'Company Support', rating: 3, notes: 'Moderate company presence, standard service', lastUpdated: '2024-12-20', updatedBy: 'Tech Rodriguez' }
      },
      contacts: [
        { name: 'Lisa Thompson', title: 'FBO Supervisor', phone: '+1 (617) 561-1800', email: 'lthompson@signatureflight.com', department: 'FBO Operations' },
        { name: 'Robert Martinez', title: 'Line Maintenance Lead', phone: '+1 (617) 561-1850', email: 'rmartinez@bosmaint.com', department: 'Maintenance' }
      ],
      reviewInfo: {
        lastReviewDate: '2024-11-15',
        reviewedBy: 'First Officer Amanda White',
        nextReviewDue: '2025-02-15',
        reviewStatus: 'Due Soon',
        reviewNotes: 'Services adequate but limited maintenance capabilities. Catering quality variable. Weather operations can be challenging.',
        confidence: 'Medium'
      },
      upcomingFlights: [
        {
          flightId: 'FO038',
          date: '2025-02-08',
          aircraftId: 'N5PG (G500)',
          departureTime: '09:15',
          estimatedArrival: '12:30',
          serviceRequirements: ['Fuel', 'Light Maintenance Check']
        }
      ],
      operatingHours: {
        standard: '05:00-24:00',
        weekend: '06:00-23:00',
        emergency: '24/7'
      },
      fees: {
        landing: '$7.25/1000 lbs',
        parking: '$12/day',
        handling: '$95 flat',
        fuel: 'Current market + $0.20'
      },
      restrictions: ['Weather-sensitive operations'],
      randomNotes: 'Good backup option for NYC area. Weather can significantly impact operations, especially in winter. Limited heavy maintenance capabilities - plan accordingly. Ground handling generally efficient but can slow during airline rush periods.'
    },
    {
      id: 'APT003',
      icaoCode: 'EGLL',
      iataCode: 'LHR',
      name: 'London Heathrow Airport',
      city: 'London',
      country: 'United Kingdom',
      timezone: 'GMT',
      overallRating: 5,
      suggestedSupport: 'Premium location - use Harrods Aviation for VIP service',
      serviceCategories: {
        mro: { name: 'MRO', rating: 4, notes: 'Comprehensive maintenance available but expensive', lastUpdated: '2024-10-10', updatedBy: 'Tech Davies' },
        mrt: { name: 'MRT', rating: 5, notes: 'Excellent response times, highly skilled technicians', lastUpdated: '2024-10-08', updatedBy: 'Tech Mitchell' },
        momAndPop: { name: 'Mom and Pop', rating: 4, notes: 'Some excellent local services available', lastUpdated: '2024-09-25', updatedBy: 'Tech Davies' },
        fbo: { name: 'FBO', rating: 5, notes: 'Harrods Aviation - luxury service, exceptional facilities', lastUpdated: '2024-10-10', updatedBy: 'Tech Johnson' },
        companySupport: { name: 'Company Support', rating: 5, notes: 'Excellent company relationships, priority service', lastUpdated: '2024-10-05', updatedBy: 'Tech Williams' }
      },
      contacts: [
        { name: 'James Mitchell', title: 'Terminal Manager', phone: '+44 20 8745 7777', email: 'jmitchell@harrodsaviation.com', department: 'FBO Operations' },
        { name: 'Emma Davies', title: 'Maintenance Director', phone: '+44 20 8745 8888', email: 'edavies@lhrmaint.com', department: 'Maintenance', isEmergency: true }
      ],
      reviewInfo: {
        lastReviewDate: '2024-10-10',
        reviewedBy: 'Captain Sarah Johnson',
        nextReviewDue: '2025-01-10',
        reviewStatus: 'Overdue',
        reviewNotes: 'Excellent facilities but very expensive. Brexit procedures may add delays. Service quality remains world-class.',
        confidence: 'Low'
      },
      upcomingFlights: [
        {
          flightId: 'FO052',
          date: '2025-02-12',
          aircraftId: 'N2PG (G650)',
          departureTime: '11:00',
          estimatedArrival: '22:30',
          serviceRequirements: ['Fuel', 'Catering', 'Customs Clearance']
        }
      ],
      operatingHours: {
        standard: '24/7',
        weekend: '24/7',
        emergency: '24/7'
      },
      fees: {
        landing: '£12.50/1000 kg',
        parking: '£45/day',
        handling: '£250 flat',
        fuel: 'Current market + £0.15'
      },
      restrictions: ['Slot controlled', 'Noise restrictions 23:00-06:00', 'Brexit documentation required'],
      randomNotes: 'World-class facilities but extremely expensive. Slot coordination essential - book well in advance. Allow extra time for post-Brexit procedures. Excellent for high-profile passengers. Harrods Aviation provides unmatched luxury service including dedicated customs/immigration processing.'
    }
  ];

  const filteredAirports = airports.filter(airport => {
    const matchesSearch =
      airport.icaoCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airport.iataCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airport.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airport.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRegion = regionFilter === 'all' ||
      (regionFilter === 'na' && airport.country === 'United States') ||
      (regionFilter === 'eu' && airport.country === 'United Kingdom') ||
      (regionFilter === 'asia' && ['Japan', 'China', 'Singapore'].includes(airport.country));

    const matchesRating = ratingFilter === 'all' ||
      (ratingFilter === '5' && airport.overallRating === 5) ||
      (ratingFilter === '4' && airport.overallRating === 4) ||
      (ratingFilter === '3' && airport.overallRating === 3) ||
      (ratingFilter === '2' && airport.overallRating <= 2);

    return matchesSearch && matchesRegion && matchesRating;
  });

  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'Current': return 'bg-green-100 text-green-800 border-green-200';
      case 'Due Soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'bg-green-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const renderStarRating = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''} ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            onClick={interactive && onChange ? () => onChange(i + 1) : undefined}
          />
        ))}
      </div>
    );
  };

  const hasUpcomingFlights = (airport: Airport) => {
    return airport.upcomingFlights.some(flight =>
      new Date(flight.date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
  };

  const needsUrgentReview = (airport: Airport) => {
    return airport.reviewInfo.reviewStatus === 'Overdue' && hasUpcomingFlights(airport);
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'MRO': return <Wrench className="w-4 h-4" />;
      case 'MRT': return <Shield className="w-4 h-4" />;
      case 'Mom and Pop': return <Home className="w-4 h-4" />;
      case 'FBO': return <Building2 className="w-4 h-4" />;
      case 'Company Support': return <Users className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const AirportForm = ({ airport, onClose }: { airport?: Airport; onClose: () => void }) => {
    const [formData, setFormData] = useState<Partial<Airport>>(airport || {
      icaoCode: '',
      iataCode: '',
      name: '',
      city: '',
      country: '',
      timezone: '',
      overallRating: 3,
      suggestedSupport: '',
      serviceCategories: {
        mro: { name: 'MRO', rating: 3, notes: '' },
        mrt: { name: 'MRT', rating: 3, notes: '' },
        momAndPop: { name: 'Mom and Pop', rating: 3, notes: '' },
        fbo: { name: 'FBO', rating: 3, notes: '' },
        companySupport: { name: 'Company Support', rating: 3, notes: '' }
      },
      contacts: [],
      operatingHours: {
        standard: '',
        weekend: '',
        emergency: ''
      },
      fees: {
        landing: '',
        parking: '',
        handling: '',
        fuel: ''
      },
      restrictions: [],
      randomNotes: ''
    });

    const updateServiceRating = (category: string, rating: number) => {
      if (formData.serviceCategories) {
        const currentCategories = formData.serviceCategories;
        const categoryKey = category as keyof typeof currentCategories;

        setFormData({
          ...formData,
          serviceCategories: {
            ...currentCategories,
            [categoryKey]: {
              ...currentCategories[categoryKey],
              rating
            }
          }
        });
      }
    };

    return (
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="ratings">Service Ratings</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>ICAO Code</Label>
                <Input
                  placeholder="KJFK"
                  value={formData.icaoCode || ''}
                  onChange={(e) => setFormData({ ...formData, icaoCode: e.target.value })}
                />
              </div>
              <div>
                <Label>IATA Code</Label>
                <Input
                  placeholder="JFK"
                  value={formData.iataCode || ''}
                  onChange={(e) => setFormData({ ...formData, iataCode: e.target.value })}
                />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input
                  placeholder="EST"
                  value={formData.timezone || ''}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Airport Name</Label>
              <Input
                placeholder="John F. Kennedy International Airport"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  placeholder="New York"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  placeholder="United States"
                  value={formData.country || ''}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Overall Rating</Label>
              <div className="flex items-center gap-2">
                {renderStarRating(formData.overallRating || 3, true, (rating) =>
                  setFormData({ ...formData, overallRating: rating })
                )}
                <span className="text-sm text-muted-foreground">({formData.overallRating || 3}/5)</span>
              </div>
            </div>

            <div>
              <Label>Suggested Support (Tech Notes)</Label>
              <Input
                placeholder="Recommended FBO, special considerations, etc."
                value={formData.suggestedSupport || ''}
                onChange={(e) => setFormData({ ...formData, suggestedSupport: e.target.value })}
              />
            </div>
          </TabsContent>

          <TabsContent value="ratings" className="space-y-6">
            {formData.serviceCategories && Object.entries(formData.serviceCategories).map(([key, category]) => (
              <div key={key} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  {getServiceIcon(category.name)}
                  <h4 className="font-medium">{category.name}</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label>Rating</Label>
                    <div className="flex items-center gap-2">
                      {renderStarRating(category.rating, true, (rating) =>
                        updateServiceRating(key as any, rating)
                      )}
                      <span className="text-sm text-muted-foreground">({category.rating}/5)</span>
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder={`Notes about ${category.name} services...`}
                      value={category.notes || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        serviceCategories: {
                          ...formData.serviceCategories!,
                          [key]: {
                            ...category,
                            notes: e.target.value
                          }
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <div>
              <Label>Key Contacts</Label>
              <Textarea
                rows={6}
                placeholder="Format: Name|Title|Phone|Email|Department|Emergency (one per line)&#10;Example: John Smith|FBO Manager|+1-555-0123|john@fbo.com|Operations|false"
                value={formData.contacts?.map(c => `${c.name}|${c.title}|${c.phone}|${c.email}|${c.department}|${c.isEmergency || false}`).join('\n') || ''}
                onChange={(e) => {
                  const contacts = e.target.value.split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                      const [name, title, phone, email, department, isEmergency] = line.split('|');
                      return {
                        name: name?.trim() || '',
                        title: title?.trim() || '',
                        phone: phone?.trim() || '',
                        email: email?.trim() || '',
                        department: department?.trim() || '',
                        isEmergency: isEmergency?.trim() === 'true'
                      };
                    });
                  setFormData({ ...formData, contacts });
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <div>
              <Label>Operating Hours</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Standard Hours</Label>
                  <Input
                    placeholder="24/7 or 06:00-22:00"
                    value={formData.operatingHours?.standard || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      operatingHours: { weekend: '', emergency: '', ...(formData.operatingHours || {}), standard: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Weekend Hours</Label>
                  <Input
                    placeholder="24/7 or 08:00-20:00"
                    value={formData.operatingHours?.weekend || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      operatingHours: { standard: '', emergency: '', ...(formData.operatingHours || {}), weekend: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Emergency Hours</Label>
                  <Input
                    placeholder="24/7 or On-call"
                    value={formData.operatingHours?.emergency || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      operatingHours: { standard: '', weekend: '', ...(formData.operatingHours || {}), emergency: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Fees Structure</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Landing Fee</Label>
                  <Input
                    placeholder="$8.50/1000 lbs"
                    value={formData.fees?.landing || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      fees: { parking: '', handling: '', fuel: '', ...(formData.fees || {}), landing: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Parking Fee</Label>
                  <Input
                    placeholder="$15/day"
                    value={formData.fees?.parking || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      fees: { landing: '', handling: '', fuel: '', ...(formData.fees || {}), parking: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Handling Fee</Label>
                  <Input
                    placeholder="$125 flat"
                    value={formData.fees?.handling || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      fees: { landing: '', parking: '', fuel: '', ...(formData.fees || {}), handling: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-sm">Fuel Pricing</Label>
                  <Input
                    placeholder="Market + $0.25"
                    value={formData.fees?.fuel || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      fees: { landing: '', parking: '', handling: '', ...(formData.fees || {}), fuel: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Restrictions & Limitations</Label>
              <Input
                placeholder="Slot controlled, Noise restrictions, etc. (comma separated)"
                value={formData.restrictions?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  restrictions: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
              />
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <div>
              <Label>Random Information & Notes</Label>
              <Textarea
                rows={8}
                placeholder="Any additional information, special considerations, tips, warnings, local knowledge, etc..."
                value={formData.randomNotes || ''}
                onChange={(e) => setFormData({ ...formData, randomNotes: e.target.value })}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 border-t">
          <Button className="flex-1">Save Airport</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1>Airport Services Database</h1>
          <p className="text-muted-foreground">Star-rated airport services tracking for G650 operations</p>
        </div>

        <Dialog open={isAddingAirport} onOpenChange={setIsAddingAirport}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Airport
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Add New Airport</DialogTitle>
              <DialogDescription>
                Create a new airport services profile with star ratings for MRO, MRT, Mom & Pop, FBO, and Company Support.
              </DialogDescription>
            </DialogHeader>
            <AirportForm onClose={() => setIsAddingAirport(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Airports</p>
                <p className="text-2xl font-bold">{airports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700 font-medium">5-Star Airports</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {airports.filter(a => a.overallRating === 5).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-green-700 font-medium">Current Reviews</p>
                <p className="text-2xl font-bold text-green-700">
                  {airports.filter(a => a.reviewInfo.reviewStatus === 'Current').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700 font-medium">Due Soon</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {airports.filter(a => a.reviewInfo.reviewStatus === 'Due Soon').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-red-700 font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-700">
                  {airports.filter(a => a.reviewInfo.reviewStatus === 'Overdue').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Flights</p>
                <p className="text-2xl font-bold">
                  {airports.reduce((sum, a) => sum + a.upcomingFlights.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by ICAO, IATA, name, or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="na">North America</SelectItem>
                <SelectItem value="eu">Europe</SelectItem>
                <SelectItem value="asia">Asia Pacific</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">≤2 Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Airports Grid/List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Airport Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAirports.map((airport) => (
                  <Card
                    key={airport.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${needsUrgentReview(airport)
                      ? 'border-red-500 border-2 bg-red-50'
                      : airport.reviewInfo.reviewStatus === 'Overdue'
                        ? 'border-red-300 border-2 bg-red-50'
                        : airport.reviewInfo.reviewStatus === 'Due Soon'
                          ? 'border-yellow-300 border-2 bg-yellow-50'
                          : ''
                      }`}
                    onClick={() => setSelectedAirport(airport)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header Section */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium">{airport.icaoCode} ({airport.iataCode})</h4>
                              <div className="flex items-center gap-1">
                                {renderStarRating(airport.overallRating)}
                                <span className="text-sm text-muted-foreground ml-1">({airport.overallRating}/5)</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{airport.name}</p>
                            <p className="text-sm text-muted-foreground">{airport.city}, {airport.country}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getReviewStatusColor(airport.reviewInfo.reviewStatus)}>
                              {airport.reviewInfo.reviewStatus}
                            </Badge>
                          </div>
                        </div>

                        {/* Suggested Support */}
                        <div className="mb-3 p-2 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-700">TECH SUPPORT RECOMMENDATION</span>
                          </div>
                          <p className="text-sm text-blue-700">{airport.suggestedSupport}</p>
                        </div>

                        {/* Upcoming Flights Alert */}
                        {hasUpcomingFlights(airport) && (
                          <div className="mb-3 p-2 rounded-lg bg-orange-50 border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-orange-600" />
                              <span className="text-sm font-semibold text-orange-700">UPCOMING FLIGHTS</span>
                            </div>
                            <div className="space-y-1">
                              {airport.upcomingFlights.slice(0, 2).map((flight, i) => (
                                <div key={i} className="text-xs text-orange-700">
                                  {flight.flightId} - {new Date(flight.date).toLocaleDateString()} at {flight.departureTime}
                                  <span className="ml-2 italic">({flight.serviceRequirements.join(', ')})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Service Ratings Summary */}
                        <div className="mb-3 p-2 rounded-lg bg-green-50 border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">SERVICE RATINGS</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(airport.serviceCategories).map(([key, service]) => (
                              <div key={key} className="flex items-center justify-between">
                                <span>{service.name}:</span>
                                <div className="flex items-center gap-1">
                                  {renderStarRating(service.rating)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Review Information */}
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Eye className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-700">LAST REVIEW</span>
                          </div>
                          <div className="text-xs text-gray-700">
                            <div>{new Date(airport.reviewInfo.lastReviewDate).toLocaleDateString()} by {airport.reviewInfo.reviewedBy}</div>
                            <div>Next Due: {new Date(airport.reviewInfo.nextReviewDue).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-5xl">
                            <DialogHeader>
                              <DialogTitle>Edit Airport - {airport.icaoCode} {airport.name}</DialogTitle>
                              <DialogDescription>
                                Update airport services, star ratings, and operational information.
                              </DialogDescription>
                            </DialogHeader>
                            <AirportForm airport={airport} onClose={() => { }} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {filteredAirports.length === 0 && (
                <div className="text-center py-8">
                  <Plane className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No airports match the current filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Airport Details */}
        <div className="lg:col-span-1">
          {selectedAirport ? (
            <Card className={`sticky top-20 ${needsUrgentReview(selectedAirport) ? 'border-red-500' : ''}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {selectedAirport.icaoCode} ({selectedAirport.iataCode})
                  {needsUrgentReview(selectedAirport) && (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {renderStarRating(selectedAirport.overallRating)}
                  <span className="text-sm text-muted-foreground">({selectedAirport.overallRating}/5)</span>
                </div>
                <div className="flex gap-2">
                  <Badge className={getReviewStatusColor(selectedAirport.reviewInfo.reviewStatus)}>
                    {selectedAirport.reviewInfo.reviewStatus}
                  </Badge>
                  <Badge className={getConfidenceColor(selectedAirport.reviewInfo.confidence)}>
                    {selectedAirport.reviewInfo.confidence}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Urgent Review Warning */}
                {needsUrgentReview(selectedAirport) && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-bold text-red-700">URGENT REVIEW NEEDED</span>
                    </div>
                    <div className="text-sm text-red-700">
                      Review is overdue with upcoming flights scheduled. Update information immediately.
                    </div>
                  </div>
                )}

                <Tabs defaultValue="services" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="contacts">Contacts</TabsTrigger>
                    <TabsTrigger value="operations">Operations</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="services" className="space-y-3">
                    <div>
                      <Label className="text-xs">Location</Label>
                      <div className="text-sm space-y-1">
                        <div>{selectedAirport.name}</div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {selectedAirport.city}, {selectedAirport.country}
                        </div>
                        <div>Timezone: {selectedAirport.timezone}</div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Tech Support Recommendation</Label>
                      <div className="text-sm bg-blue-50 p-2 rounded mt-1">
                        {selectedAirport.suggestedSupport}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Service Category Ratings</Label>
                      <div className="space-y-2 mt-1">
                        {Object.entries(selectedAirport.serviceCategories).map(([key, service]) => (
                          <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              {getServiceIcon(service.name)}
                              <span className="font-medium text-sm">{service.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {renderStarRating(service.rating)}
                              <span className="text-xs text-muted-foreground">({service.rating}/5)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedAirport.upcomingFlights.length > 0 && (
                      <div>
                        <Label className="text-xs text-blue-600">Upcoming Flights</Label>
                        <div className="space-y-1 mt-1">
                          {selectedAirport.upcomingFlights.map((flight, i) => (
                            <div key={i} className="p-2 bg-blue-50 rounded text-sm">
                              <div className="font-medium">{flight.flightId}</div>
                              <div className="text-xs text-blue-700">
                                {flight.aircraftId} - {new Date(flight.date).toLocaleDateString()} at {flight.departureTime}
                              </div>
                              <div className="text-xs text-blue-600">
                                Needs: {flight.serviceRequirements.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="contacts" className="space-y-3">
                    {selectedAirport.contacts.map((contact, i) => (
                      <div key={i} className={`p-3 rounded border ${contact.isEmergency ? 'bg-red-50 border-red-200' : 'bg-muted'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm">{contact.name}</div>
                          {contact.isEmergency && (
                            <Badge variant="destructive" className="text-xs">Emergency</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>{contact.title}</div>
                          <div>{contact.department}</div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="operations" className="space-y-3">
                    <div>
                      <Label className="text-xs">Operating Hours</Label>
                      <div className="text-sm space-y-1">
                        <div>Standard: {selectedAirport.operatingHours.standard}</div>
                        <div>Weekend: {selectedAirport.operatingHours.weekend}</div>
                        <div>Emergency: {selectedAirport.operatingHours.emergency}</div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Fees</Label>
                      <div className="text-sm space-y-1">
                        <div>Landing: {selectedAirport.fees.landing}</div>
                        <div>Parking: {selectedAirport.fees.parking}</div>
                        <div>Handling: {selectedAirport.fees.handling}</div>
                        <div>Fuel: {selectedAirport.fees.fuel}</div>
                      </div>
                    </div>

                    {selectedAirport.restrictions.length > 0 && (
                      <div>
                        <Label className="text-xs text-red-600">Restrictions</Label>
                        <div className="space-y-1 mt-1">
                          {selectedAirport.restrictions.map((restriction, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700">
                              {restriction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">Review Information</Label>
                      <div className="text-sm space-y-1">
                        <div>Last: {new Date(selectedAirport.reviewInfo.lastReviewDate).toLocaleDateString()}</div>
                        <div>By: {selectedAirport.reviewInfo.reviewedBy}</div>
                        <div>Next Due: {new Date(selectedAirport.reviewInfo.nextReviewDue).toLocaleDateString()}</div>
                        {selectedAirport.reviewInfo.reviewNotes && (
                          <div className="text-xs bg-muted p-2 rounded italic mt-2">
                            "{selectedAirport.reviewInfo.reviewNotes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-3">
                    <div>
                      <Label className="text-xs">Random Information & Notes</Label>
                      <div className="text-sm bg-muted p-3 rounded mt-1">
                        {selectedAirport.randomNotes || 'No additional notes available.'}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Service Category Details</Label>
                      <div className="space-y-2 mt-1">
                        {Object.entries(selectedAirport.serviceCategories).map(([key, service]) => (
                          service.notes && (
                            <div key={key} className="p-2 bg-muted rounded">
                              <div className="flex items-center gap-2 mb-1">
                                {getServiceIcon(service.name)}
                                <span className="font-medium text-sm">{service.name}</span>
                                {renderStarRating(service.rating)}
                              </div>
                              <div className="text-xs text-muted-foreground italic">{service.notes}</div>
                              {service.lastUpdated && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Updated: {service.lastUpdated} by {service.updatedBy}
                                </div>
                              )}
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="sticky top-20">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select an airport to view details</p>
                <p className="text-sm text-muted-foreground mt-2">Click on any airport card to see detailed service ratings and information</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}