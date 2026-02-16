import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import {
  Utensils,
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  Clock,
  Star,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Edit,
  Trash2,
  Upload,
  Globe,
  AlertTriangle,
  Hotel,
  Navigation,
  FileText,
  Image,
  Link,
  Building,
  Plane,
  Route,
  Calendar,
  Mail,
  Download
} from 'lucide-react';

interface CateringCompany {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  website?: string;
  address: string;
  primaryAirport: string; // Main airport code (4 letters)
  airportsServed: string[];
  operatingHours: string;
  leadTime: string;
  rating: number;
  notes: string;
  menuItems: MenuItem[];
  menuUploads: MenuUpload[];
  distanceFromHotels: HotelDistance[];
  lastUpdated: string;
  isMultiAirport: boolean;
  serviceRadius: number; // in miles
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  rating: 'excellent' | 'good' | 'poor';
  price?: string;
  description?: string;
  dietary?: string[];
  notes: string;
}

interface MenuUpload {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'website';
  url: string;
  uploadDate: string;
  description?: string;
}

interface HotelDistance {
  hotelName: string;
  distance: number; // in miles
  travelTime: string;
  canCater: boolean;
  deliveryFee?: string;
  notes?: string;
}

interface Hotel {
  id: string;
  name: string;
  airport: string;
  address: string;
  phone: string;
  canProvideCatering: boolean;
  cateringServices: string[];
  cateringContact?: string;
  cateringNotes?: string;
  distanceFromAirport: number;
  fridgeAvailability?: 'full' | 'room' | 'none';
}

export default function CateringTracker() {
  const [searchTerm, setSearchTerm] = useState('');
  const [airportFilter, setAirportFilter] = useState('');
  const [showMultiAirportOnly, setShowMultiAirportOnly] = useState(false);
  const [showNewCatererDialog, setShowNewCatererDialog] = useState(false);
  const [showMenuUploadDialog, setShowMenuUploadDialog] = useState(false);
  const [showHotelDialog, setShowHotelDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('caterers');
  const [selectedCaterer, setSelectedCaterer] = useState<string | null>(null);

  // Form state for new entries
  const [newCatererAirports, setNewCatererAirports] = useState<string>('');
  const [newCatererPrimaryAirport, setNewCatererPrimaryAirport] = useState<string>('');
  const [newHotelAirport, setNewHotelAirport] = useState('');
  const [newHotelFridge, setNewHotelFridge] = useState<'full' | 'room' | 'none'>('none');

  // Mock data - enhanced with new features
  const cateringCompanies: CateringCompany[] = [
    {
      id: '1',
      name: 'Sky Gourmet International',
      contactPerson: 'Maria Rodriguez',
      phone: '+1 (310) 555-0123',
      email: 'maria@skygourmet.com',
      website: 'https://skygourmet.com',
      address: '123 Airport Blvd, Los Angeles, CA 90045',
      primaryAirport: 'KLAX',
      airportsServed: ['KLAX', 'KBUR', 'KLGB'],
      operatingHours: '24/7',
      leadTime: '4 hours',
      rating: 4.2,
      notes: 'Premium catering service with worldwide presence. Excellent for last-minute orders.',
      isMultiAirport: true,
      serviceRadius: 25,
      menuItems: [
        {
          id: '1',
          name: 'Grilled Atlantic Salmon',
          category: 'Main Course',
          rating: 'good',
          price: '$32',
          description: 'Fresh salmon with lemon herb butter',
          dietary: ['Gluten-Free'],
          notes: 'Always fresh, well-seasoned'
        },
        {
          id: '2',
          name: 'Caesar Salad Supreme',
          category: 'Salad',
          rating: 'excellent',
          price: '$18',
          description: 'Crisp romaine with house-made dressing',
          dietary: ['Vegetarian'],
          notes: 'Outstanding presentation and taste'
        }
      ],
      menuUploads: [
        {
          id: '1',
          name: 'Full Menu 2024',
          type: 'pdf',
          url: '/menus/sky-gourmet-2024.pdf',
          uploadDate: '2024-01-15',
          description: 'Complete catering menu with pricing'
        },
        {
          id: '2',
          name: 'Dietary Options Guide',
          type: 'image',
          url: '/menus/dietary-guide.jpg',
          uploadDate: '2024-02-01',
          description: 'Visual guide to dietary accommodations'
        }
      ],
      distanceFromHotels: [
        {
          hotelName: 'Hilton LAX',
          distance: 2.1,
          travelTime: '8 mins',
          canCater: true,
          deliveryFee: '$15',
          notes: 'Preferred catering partner'
        },
        {
          hotelName: 'Marriott LAX',
          distance: 1.8,
          travelTime: '6 mins',
          canCater: true,
          deliveryFee: '$12',
          notes: 'Quick delivery, reliable'
        },
        {
          hotelName: 'Westin LAX',
          distance: 3.2,
          travelTime: '12 mins',
          canCater: true,
          deliveryFee: '$20'
        }
      ],
      lastUpdated: '2024-02-15'
    },
    {
      id: '2',
      name: 'Elite Catering Solutions',
      contactPerson: 'James Chen',
      phone: '+1 (310) 555-0456',
      email: 'james@elitecatering.com',
      website: 'https://elitecatering.com',
      address: '456 Catering Way, El Segundo, CA 90245',
      primaryAirport: 'KLAX',
      airportsServed: ['KLAX'],
      operatingHours: '6:00 AM - 10:00 PM',
      leadTime: '6 hours',
      rating: 4.8,
      notes: 'Ultra-premium service, excellent for VIP flights. Higher cost but exceptional quality.',
      isMultiAirport: false,
      serviceRadius: 15,
      menuItems: [
        {
          id: '3',
          name: 'Wagyu Beef Tenderloin',
          category: 'Main Course',
          rating: 'excellent',
          price: '$85',
          description: 'Grade A5 Wagyu with truffle butter',
          dietary: ['Gluten-Free'],
          notes: 'Outstanding quality and presentation'
        }
      ],
      menuUploads: [
        {
          id: '3',
          name: 'VIP Menu Collection',
          type: 'website',
          url: 'https://elitecatering.com/vip-menu',
          uploadDate: '2024-02-10',
          description: 'Interactive online menu with customization'
        }
      ],
      distanceFromHotels: [
        {
          hotelName: 'Hilton LAX',
          distance: 4.5,
          travelTime: '15 mins',
          canCater: true,
          deliveryFee: '$25'
        }
      ],
      lastUpdated: '2024-02-12'
    },
    {
      id: '3',
      name: 'Metropolitan Catering NYC',
      contactPerson: 'Sarah Williams',
      phone: '+1 (718) 555-0789',
      email: 'sarah@metrocatering.com',
      address: '789 Terminal Drive, Jamaica, NY 11430',
      primaryAirport: 'KJFK',
      airportsServed: ['KJFK', 'KLGA', 'KEWR'],
      operatingHours: '5:00 AM - 11:00 PM',
      leadTime: '3 hours',
      rating: 3.9,
      notes: 'Good variety, quick turnaround. Quality can vary during peak hours.',
      isMultiAirport: true,
      serviceRadius: 35,
      menuItems: [
        {
          id: '4',
          name: 'NY Strip Steak',
          category: 'Main Course',
          rating: 'good',
          price: '$42',
          description: 'Prime NY strip with seasonal vegetables',
          notes: 'Cooked well, good flavor'
        }
      ],
      menuUploads: [
        {
          id: '4',
          name: 'NYC Regional Menu',
          type: 'pdf',
          url: '/menus/metro-nyc-2024.pdf',
          uploadDate: '2024-01-20'
        }
      ],
      distanceFromHotels: [
        {
          hotelName: 'Crowne Plaza JFK',
          distance: 1.2,
          travelTime: '5 mins',
          canCater: true,
          deliveryFee: '$10'
        }
      ],
      lastUpdated: '2024-02-10'
    }
  ];

  const hotels: Hotel[] = [
    {
      id: '1',
      name: 'Hilton LAX',
      airport: 'KLAX',
      address: '5711 W Century Blvd, Los Angeles, CA 90045',
      phone: '+1 (310) 410-4000',
      canProvideCatering: true,
      cateringServices: ['Continental Breakfast', 'Business Lunch', 'Gala Dinner'],
      cateringContact: 'Events Team - events@hiltonlax.com',
      cateringNotes: 'Can accommodate dietary restrictions. 48-hour notice preferred.',
      distanceFromAirport: 1.2,
      fridgeAvailability: 'full'
    },
    {
      id: '2',
      name: 'Marriott LAX',
      airport: 'KLAX',
      address: '5855 W Century Blvd, Los Angeles, CA 90045',
      phone: '+1 (310) 641-5700',
      canProvideCatering: true,
      cateringServices: ['Grab & Go', 'Meeting Packages', 'Reception Catering'],
      cateringContact: 'Catering Dept - catering@marriottlax.com',
      cateringNotes: 'Excellent for crew meals. Quick service available.',
      distanceFromAirport: 0.8,
      fridgeAvailability: 'room'
    },
    {
      id: '3',
      name: 'Crowne Plaza JFK',
      airport: 'KJFK',
      address: '151-20 Baisley Blvd, Jamaica, NY 11434',
      phone: '+1 (718) 659-0200',
      canProvideCatering: false,
      cateringServices: [],
      distanceFromAirport: 2.1,
      fridgeAvailability: 'none'
    }
  ];



  // Validation function for 4-letter airport codes
  const validateAirportCode = (code: string): boolean => {
    return /^[A-Z]{4}$/.test(code.toUpperCase());
  };

  // Format airport code input
  const formatAirportCode = (value: string): string => {
    return value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  };

  // Filter catering companies
  const filteredCaterers = cateringCompanies.filter(caterer => {
    const matchesSearch =
      caterer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caterer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caterer.primaryAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caterer.airportsServed.some(airport =>
        airport.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesAirport = !airportFilter ||
      caterer.airportsServed.some(airport =>
        airport.toUpperCase().includes(airportFilter.toUpperCase())
      ) || caterer.primaryAirport.toUpperCase().includes(airportFilter.toUpperCase());

    const matchesMultiAirport = !showMultiAirportOnly || caterer.isMultiAirport;

    return matchesSearch && matchesAirport && matchesMultiAirport;
  });

  // Filter hotels
  const filteredHotels = hotels.filter(hotel => {
    const matchesSearch =
      hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.airport.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAirport = !airportFilter ||
      hotel.airport.toUpperCase().includes(airportFilter.toUpperCase());

    return matchesSearch && matchesAirport;
  });

  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'excellent': return <Star className="w-3 h-3" />;
      case 'good': return <ThumbsUp className="w-3 h-3" />;
      case 'poor': return <ThumbsDown className="w-3 h-3" />;
      default: return null;
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-red-600" />;
      case 'image': return <Image className="w-4 h-4 text-blue-600" />;
      case 'website': return <Globe className="w-4 h-4 text-green-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Utensils className="w-6 h-6 text-primary" />
            Hotel
          </h1>
          <p className="text-muted-foreground">
            Comprehensive hotel and catering management with menu uploads, hotel partnerships, and coverage tracking
          </p>
        </div>

        <div className="flex gap-2 mt-4 lg:mt-0">
          <Dialog open={showHotelDialog} onOpenChange={setShowHotelDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Hotel className="w-4 h-4 mr-2" />
                Add Hotel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Hotel Partner</DialogTitle>
                <DialogDescription>
                  Add a hotel that can provide catering services
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hotel Name</Label>
                    <Input placeholder="Hotel name" />
                  </div>
                  <div>
                    <Label>Airport Code (4 letters) *</Label>
                    <Input
                      placeholder="e.g., KLAX"
                      value={newHotelAirport}
                      onChange={(e) => setNewHotelAirport(formatAirportCode(e.target.value))}
                      maxLength={4}
                      className={!validateAirportCode(newHotelAirport) && newHotelAirport.length > 0 ? 'border-red-500' : ''}
                    />
                    {newHotelAirport.length > 0 && !validateAirportCode(newHotelAirport) && (
                      <p className="text-sm text-red-600 mt-1">Must be exactly 4 letters (e.g., KLAX)</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input placeholder="Full hotel address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input placeholder="+1 (555) 123-4567" />
                  </div>
                  <div>
                    <Label>Distance from Airport</Label>
                    <Input placeholder="e.g., 1.2 miles" />
                  </div>
                </div>
                <div>
                  <Label>Fridge Availability</Label>
                  <Select value={newHotelFridge} onValueChange={(value: any) => setNewHotelFridge(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fridge type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Size Fridge</SelectItem>
                      <SelectItem value="room">Room Fridge</SelectItem>
                      <SelectItem value="none">None/Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Can Provide Catering?</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Catering Services</Label>
                  <Textarea placeholder="List available catering services..." rows={2} />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      if (!validateAirportCode(newHotelAirport)) {
                        toast.error('Please enter a valid 4-letter airport code');
                        return;
                      }
                      toast.success('Hotel added successfully');
                      setShowHotelDialog(false);
                      setNewHotelAirport('');
                      setNewHotelFridge('none');
                    }}
                    disabled={!validateAirportCode(newHotelAirport)}
                  >
                    Add Hotel
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowHotelDialog(false);
                    setNewHotelAirport('');
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewCatererDialog} onOpenChange={setShowNewCatererDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Caterer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Catering Company</DialogTitle>
                <DialogDescription>
                  Add a new catering company with complete service information
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="service">Service Area</TabsTrigger>
                  <TabsTrigger value="menus">Menus</TabsTrigger>
                  <TabsTrigger value="hotels">Hotel Distance</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Company Name *</Label>
                      <Input placeholder="Catering company name" />
                    </div>
                    <div>
                      <Label>Primary Airport Code *</Label>
                      <Input
                        placeholder="e.g., KLAX"
                        value={newCatererPrimaryAirport}
                        onChange={(e) => setNewCatererPrimaryAirport(formatAirportCode(e.target.value))}
                        maxLength={4}
                        className={!validateAirportCode(newCatererPrimaryAirport) && newCatererPrimaryAirport.length > 0 ? 'border-red-500' : ''}
                      />
                      {newCatererPrimaryAirport.length > 0 && !validateAirportCode(newCatererPrimaryAirport) && (
                        <p className="text-sm text-red-600 mt-1">Must be exactly 4 letters (e.g., KLAX)</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Contact Person</Label>
                      <Input placeholder="Primary contact name" />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input placeholder="contact@caterer.com" type="email" />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input placeholder="https://company.com" />
                    </div>
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Input placeholder="Full business address" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Operating Hours</Label>
                      <Input placeholder="e.g., 6:00 AM - 10:00 PM" />
                    </div>
                    <div>
                      <Label>Lead Time Required</Label>
                      <Input placeholder="e.g., 4 hours" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="service" className="space-y-4 mt-4">
                  <div>
                    <Label>Airports Served *</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Enter 4-letter airport codes separated by commas (e.g., KLAX, KBUR, KLGB)
                    </p>
                    <Input
                      placeholder="KLAX, KBUR, KLGB"
                      value={newCatererAirports}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z,\s]/g, '');
                        setNewCatererAirports(value);
                      }}
                    />
                    {newCatererAirports && (
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground mb-1">Preview:</div>
                        <div className="flex flex-wrap gap-1">
                          {newCatererAirports.split(',').map((code, index) => {
                            const trimmedCode = code.trim();
                            const isValid = validateAirportCode(trimmedCode);
                            return trimmedCode ? (
                              <Badge
                                key={index}
                                variant={isValid ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {trimmedCode}
                                {!isValid && trimmedCode.length > 0 && " ❌"}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Service Radius</Label>
                    <Input placeholder="Service radius in miles" type="number" />
                  </div>

                  <div>
                    <Label>Service Notes</Label>
                    <Textarea placeholder="Additional service area information..." rows={3} />
                  </div>
                </TabsContent>

                <TabsContent value="menus" className="space-y-4 mt-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Upload Menu Documents</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Menu Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select menu type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF Document</SelectItem>
                            <SelectItem value="image">Image File</SelectItem>
                            <SelectItem value="website">Website Link</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Menu Name</Label>
                        <Input placeholder="e.g., Full Menu 2024" />
                      </div>

                      <div>
                        <Label>File/URL</Label>
                        <div className="flex gap-2">
                          <Input placeholder="Upload file or enter URL" />
                          <Button variant="outline" size="sm">
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Input placeholder="Brief description of menu contents" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="hotels" className="space-y-4 mt-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Hotel Partnership Information</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Hotel Name</Label>
                        <Input placeholder="Partner hotel name" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Distance</Label>
                          <Input placeholder="e.g., 2.1 miles" />
                        </div>
                        <div>
                          <Label>Travel Time</Label>
                          <Input placeholder="e.g., 8 mins" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Can Cater to Hotel?</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Delivery Fee</Label>
                          <Input placeholder="e.g., $15" />
                        </div>
                      </div>

                      <div>
                        <Label>Partnership Notes</Label>
                        <Textarea placeholder="Special arrangements, preferred partner status, etc." rows={2} />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    if (!validateAirportCode(newCatererPrimaryAirport)) {
                      toast.error('Please enter a valid primary airport code');
                      return;
                    }

                    const airportCodes = newCatererAirports.split(',').map(code => code.trim());
                    const invalidCodes = airportCodes.filter(code => code && !validateAirportCode(code));

                    if (invalidCodes.length > 0) {
                      toast.error('Please enter valid 4-letter airport codes');
                      return;
                    }

                    if (airportCodes.filter(code => code).length === 0) {
                      toast.error('Please enter at least one airport code');
                      return;
                    }

                    toast.success('Catering company added successfully');
                    setShowNewCatererDialog(false);
                    setNewCatererAirports('');
                    setNewCatererPrimaryAirport('');
                  }}
                  disabled={!newCatererPrimaryAirport || !validateAirportCode(newCatererPrimaryAirport) || !newCatererAirports || newCatererAirports.split(',').some(code => code.trim() && !validateAirportCode(code.trim()))}
                >
                  Add Caterer
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowNewCatererDialog(false);
                  setNewCatererAirports('');
                  setNewCatererPrimaryAirport('');
                }}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by company name, contact, or airport code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-48">
                <div className="relative">
                  <Plane className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter by airport (4 letters)"
                    value={airportFilter}
                    onChange={(e) => setAirportFilter(formatAirportCode(e.target.value))}
                    className="pl-10"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showMultiAirportOnly}
                  onChange={(e) => setShowMultiAirportOnly(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show only multi-airport services</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="caterers">Catering Companies</TabsTrigger>
          <TabsTrigger value="hotels">Hotel Partners</TabsTrigger>

        </TabsList>

        {/* Catering Companies Tab */}
        <TabsContent value="caterers" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredCaterers.map((caterer) => (
              <Card key={caterer.id} className="h-fit">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        {caterer.name}
                        {caterer.isMultiAirport && (
                          <Badge variant="secondary" className="text-xs">
                            <Route className="w-3 h-3 mr-1" />
                            Multi-Airport
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          Primary: {caterer.primaryAirport}
                        </Badge>
                        <div className="flex gap-1">
                          {caterer.airportsServed.map(airport => (
                            <Badge key={airport} variant="outline" className="text-xs">
                              {airport}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{caterer.rating}/5.0</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="details">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="menus">Menus</TabsTrigger>
                      <TabsTrigger value="hotels">Hotels</TabsTrigger>
                      <TabsTrigger value="menu-items">Items</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Contact</div>
                          <div className="font-medium">{caterer.contactPerson}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Lead Time</div>
                          <div className="font-medium">{caterer.leadTime}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Phone</div>
                          <div className="font-medium">{caterer.phone}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Service Radius</div>
                          <div className="font-medium">{caterer.serviceRadius} miles</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground text-sm">Hours</div>
                        <div className="font-medium">{caterer.operatingHours}</div>
                      </div>

                      {caterer.website && (
                        <div>
                          <div className="text-muted-foreground text-sm">Website</div>
                          <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                            <a href={caterer.website} target="_blank" rel="noopener noreferrer">
                              <Globe className="w-3 h-3 mr-1" />
                              Visit Website
                            </a>
                          </Button>
                        </div>
                      )}

                      <div>
                        <div className="text-muted-foreground text-sm">Notes</div>
                        <div className="text-sm">{caterer.notes}</div>
                      </div>
                    </TabsContent>

                    <TabsContent value="menus" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Menu Documents</h4>
                          <Dialog open={showMenuUploadDialog} onOpenChange={setShowMenuUploadDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add Menu
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Menu Document</DialogTitle>
                                <DialogDescription>
                                  Upload or add a menu document for this catering provider.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Menu Type</Label>
                                  <Select>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pdf">PDF Document</SelectItem>
                                      <SelectItem value="image">Image File</SelectItem>
                                      <SelectItem value="website">Website Link</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Menu Name</Label>
                                  <Input placeholder="e.g., Lunch Menu 2024" />
                                </div>
                                <div>
                                  <Label>File/URL</Label>
                                  <div className="flex gap-2">
                                    <Input placeholder="Upload file or enter URL" />
                                    <Button variant="outline" size="sm">
                                      <Upload className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-4">
                                  <Button onClick={() => {
                                    toast.success('Menu uploaded successfully');
                                    setShowMenuUploadDialog(false);
                                  }}>
                                    Add Menu
                                  </Button>
                                  <Button variant="outline" onClick={() => setShowMenuUploadDialog(false)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {caterer.menuUploads.map((menu) => (
                          <div key={menu.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {getFileTypeIcon(menu.type)}
                              <div>
                                <div className="font-medium text-sm">{menu.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {menu.description} • {new Date(menu.uploadDate).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" asChild>
                                <a href={menu.url} target="_blank" rel="noopener noreferrer">
                                  {menu.type === 'website' ? <ExternalLink className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                                </a>
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="hotels" className="mt-4">
                      <div className="space-y-3">
                        <h4 className="font-medium">Hotel Partnerships</h4>
                        {caterer.distanceFromHotels.map((hotel, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium text-sm flex items-center gap-2">
                                {hotel.hotelName}
                                {hotel.canCater && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Utensils className="w-3 h-3 mr-1" />
                                    Catering Available
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {hotel.distance} miles • {hotel.travelTime}
                                {hotel.deliveryFee && ` • Delivery: ${hotel.deliveryFee}`}
                              </div>
                              {hotel.notes && (
                                <div className="text-xs text-muted-foreground mt-1">{hotel.notes}</div>
                              )}
                            </div>
                            <Button variant="outline" size="sm">
                              <Navigation className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="menu-items" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Menu Items</h4>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Item
                          </Button>
                        </div>

                        {caterer.menuItems.map((item) => (
                          <div key={item.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{item.name}</span>
                                  <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                  {item.price && (
                                    <Badge variant="secondary" className="text-xs">{item.price}</Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={getRatingColor(item.rating)}>
                                    {getRatingIcon(item.rating)}
                                    <span className="ml-1">{item.rating}</span>
                                  </Badge>
                                  {item.dietary && item.dietary.length > 0 && (
                                    <div className="flex gap-1">
                                      {item.dietary.map((diet, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {diet}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {item.description && (
                                  <p className="text-sm text-muted-foreground mb-1">{item.description}</p>
                                )}

                                {item.notes && (
                                  <p className="text-xs text-muted-foreground">{item.notes}</p>
                                )}
                              </div>
                              <Button variant="outline" size="sm">
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCaterers.length === 0 && (
            <div className="text-center py-12">
              <Utensils className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No caterers found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or add a new catering company.
              </p>
              <Button onClick={() => setShowNewCatererDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Caterer
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Hotel Partners Tab */}
        <TabsContent value="hotels" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredHotels.map((hotel) => (
              <Card key={hotel.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant="outline">{hotel.airport}</Badge>
                        {hotel.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 mt-2">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {hotel.distanceFromAirport} miles from airport
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-muted-foreground text-sm">Phone</div>
                      <div className="text-sm font-medium">{hotel.phone}</div>
                    </div>

                    <div>
                      <div className="text-muted-foreground text-sm">Address</div>
                      <div className="text-sm">{hotel.address}</div>
                    </div>

                    <div>
                      <div className="text-muted-foreground text-sm">Catering Available</div>
                      <div className="flex items-center gap-1 mt-1">
                        {hotel.canProvideCatering ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Utensils className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground text-sm">Fridge Availability</div>
                      <div className="flex items-center gap-1 mt-1">
                        {hotel.fridgeAvailability === 'full' && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <div className="mr-1">❄️</div>
                            Full Size Fridge
                          </Badge>
                        )}
                        {hotel.fridgeAvailability === 'room' && (
                          <Badge variant="outline">
                            <div className="mr-1">🧊</div>
                            Room Fridge
                          </Badge>
                        )}
                        {(!hotel.fridgeAvailability || hotel.fridgeAvailability === 'none') && (
                          <span className="text-sm text-muted-foreground">None/Unknown</span>
                        )}
                      </div>
                    </div>

                    {hotel.canProvideCatering && (
                      <>
                        <div>
                          <div className="text-muted-foreground text-sm">Services</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hotel.cateringServices.map((service, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {hotel.cateringContact && (
                          <div>
                            <div className="text-muted-foreground text-sm">Catering Contact</div>
                            <div className="text-sm">{hotel.cateringContact}</div>
                          </div>
                        )}

                        {hotel.cateringNotes && (
                          <div>
                            <div className="text-muted-foreground text-sm">Notes</div>
                            <div className="text-sm">{hotel.cateringNotes}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredHotels.length === 0 && (
            <div className="text-center py-12">
              <Hotel className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No hotels found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or add a new hotel partner.
              </p>
              <Button onClick={() => setShowHotelDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Hotel Partner
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Coverage Map Tab */}

      </Tabs>
    </div>
  );
}