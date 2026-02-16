import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { 
  Plane, 
  MapPin, 
  Users, 
  Calendar, 
  Hotel, 
  Car, 
  Coffee, 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Save,
  Send
} from 'lucide-react';
import { format, addMinutes } from 'date-fns';

interface TripBuilderProps {
  tripId?: string;
  onSave: (trip: any) => void;
  onCancel: () => void;
  isReadOnly?: boolean;
}

interface ItineraryItem {
  id: string;
  type: 'flight' | 'meeting' | 'hotel' | 'transportation' | 'meal' | 'activity';
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  notes?: string;
  confirmed: boolean;
  vendor?: string;
  cost?: number;
  confirmationNumber?: string;
}

interface Passenger {
  id: string;
  name: string;
  email: string;
  phone: string;
  dietaryRestrictions?: string;
  specialRequests?: string;
  emergencyContact?: string;
}

export default function TripBuilder({ tripId, onSave, onCancel, isReadOnly = false }: TripBuilderProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);
  
  const [tripData, setTripData] = useState({
    tripName: 'Executive Meeting - Miami',
    clientName: 'TechCorp Inc.',
    departureDate: new Date('2025-02-15T08:00:00'),
    returnDate: new Date('2025-02-17T18:00:00'),
    status: 'draft' as const,
    lockoutDays: 3,
    estimatedCost: 0,
    notes: ''
  });

  // Check for incoming itinerary data from Itinerary Builder
  useEffect(() => {
    const itineraryData = localStorage.getItem('itinerary_to_trip');
    if (itineraryData) {
      try {
        const parsed = JSON.parse(itineraryData);
        
        // Convert itinerary events to trip itinerary items
        const convertedItems: ItineraryItem[] = parsed.events.map((event: any) => {
          const startDateTime = new Date(`${event.date}T${event.startTime}`);
          const endDateTime = event.endTime 
            ? new Date(`${event.date}T${event.endTime}`)
            : addMinutes(startDateTime, 60);
          
          return {
            id: event.id,
            type: event.type === 'ground-transport' ? 'transportation' : event.type === 'dining' ? 'meal' : event.type,
            title: event.title,
            description: event.notes || '',
            startTime: startDateTime,
            endTime: endDateTime,
            location: event.location,
            notes: event.notes,
            confirmed: false,
            vendor: event.contactName,
            confirmationNumber: event.confirmationNumber
          };
        });
        
        setItinerary(convertedItems);
        setTripData({
          tripName: parsed.title,
          clientName: parsed.travelerName,
          departureDate: new Date(parsed.startDate),
          returnDate: new Date(parsed.endDate),
          status: 'draft',
          lockoutDays: 3,
          estimatedCost: 0,
          notes: parsed.description || ''
        });
        
        // Clear the localStorage after importing
        localStorage.removeItem('itinerary_to_trip');
        
        // Show success message
        import('sonner').then(({ toast }) => {
          toast.success('Itinerary imported successfully!');
        });
      } catch (error) {
        console.error('Error importing itinerary:', error);
      }
    }
  }, []);

  const [passengers, setPassengers] = useState<Passenger[]>([
    {
      id: 'p1',
      name: 'John Smith',
      email: 'john@techcorp.com',
      phone: '+1-555-0123',
      dietaryRestrictions: 'No allergies',
      specialRequests: 'Prefers aisle seat'
    }
  ]);

  const [itinerary, setItinerary] = useState<ItineraryItem[]>([
    {
      id: 'i1',
      type: 'flight',
      title: 'Departure Flight',
      description: 'LAX to MIA',
      startTime: new Date('2025-02-15T08:00:00'),
      endTime: new Date('2025-02-15T13:30:00'),
      location: 'LAX Terminal 4',
      notes: 'Aircraft: Citation X, N123AB',
      confirmed: true,
      vendor: 'Flight Operations',
      cost: 25000
    },
    {
      id: 'i2',
      type: 'transportation',
      title: 'Airport Transfer',
      description: 'MIA to Four Seasons',
      startTime: new Date('2025-02-15T14:00:00'),
      endTime: new Date('2025-02-15T14:45:00'),
      location: 'Miami International Airport',
      confirmed: false,
      vendor: 'Elite Transportation',
      cost: 150
    },
    {
      id: 'i3',
      type: 'hotel',
      title: 'Four Seasons Miami',
      description: '2 Ocean View Suites',
      startTime: new Date('2025-02-15T15:00:00'),
      endTime: new Date('2025-02-17T11:00:00'),
      location: '1435 Brickell Ave, Miami, FL',
      confirmed: true,
      vendor: 'Four Seasons',
      cost: 1200,
      confirmationNumber: 'FS789456'
    }
  ]);

  const [newItem, setNewItem] = useState({
    type: 'meeting' as const,
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    notes: '',
    vendor: '',
    cost: '',
    confirmationNumber: ''
  });

  const [newPassenger, setNewPassenger] = useState({
    name: '',
    email: '',
    phone: '',
    dietaryRestrictions: '',
    specialRequests: '',
    emergencyContact: ''
  });

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'hotel': return <Hotel className="w-4 h-4" />;
      case 'transportation': return <Car className="w-4 h-4" />;
      case 'meeting': return <Building className="w-4 h-4" />;
      case 'meal': return <Coffee className="w-4 h-4" />;
      case 'activity': return <Calendar className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'flight': return 'bg-blue-100 text-blue-800';
      case 'hotel': return 'bg-purple-100 text-purple-800';
      case 'transportation': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-orange-100 text-orange-800';
      case 'meal': return 'bg-yellow-100 text-yellow-800';
      case 'activity': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddItem = () => {
    if (!newItem.title || !newItem.startTime || !newItem.endTime) return;

    const item: ItineraryItem = {
      id: `item-${Date.now()}`,
      type: newItem.type,
      title: newItem.title,
      description: newItem.description,
      startTime: new Date(newItem.startTime),
      endTime: new Date(newItem.endTime),
      location: newItem.location,
      notes: newItem.notes,
      confirmed: false,
      vendor: newItem.vendor || undefined,
      cost: newItem.cost ? parseFloat(newItem.cost) : undefined,
      confirmationNumber: newItem.confirmationNumber || undefined
    };

    setItinerary([...itinerary, item].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));
    setNewItem({
      type: 'meeting',
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      notes: '',
      vendor: '',
      cost: '',
      confirmationNumber: ''
    });
    setIsAddItemOpen(false);
  };

  const handleAddPassenger = () => {
    if (!newPassenger.name || !newPassenger.email) return;

    const passenger: Passenger = {
      id: `passenger-${Date.now()}`,
      ...newPassenger
    };

    setPassengers([...passengers, passenger]);
    setNewPassenger({
      name: '',
      email: '',
      phone: '',
      dietaryRestrictions: '',
      specialRequests: '',
      emergencyContact: ''
    });
    setIsAddPassengerOpen(false);
  };

  const getTotalCost = () => {
    return itinerary.reduce((total, item) => total + (item.cost || 0), 0);
  };

  const getConfirmedItems = () => {
    return itinerary.filter(item => item.confirmed).length;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>{tripData.tripName}</h1>
          <p className="text-muted-foreground">
            {tripData.clientName} • {format(tripData.departureDate, 'MMM dd')} - {format(tripData.returnDate, 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={() => onSave({ tripData, passengers, itinerary })}>
                <Save className="w-4 h-4 mr-1" />
                Save Trip
              </Button>
              <Button>
                <Send className="w-4 h-4 mr-1" />
                Submit for Review
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className="bg-yellow-100 text-yellow-800">
                {tripData.status}
              </Badge>
              <div className="text-sm space-x-4">
                <span>{passengers.length} passengers</span>
                <span>{itinerary.length} itinerary items</span>
                <span>{getConfirmedItems()}/{itinerary.length} confirmed</span>
                <span className="font-medium">${getTotalCost().toLocaleString()} estimated cost</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Trip locks for editing {tripData.lockoutDays} days before departure
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="passengers">Passengers</TabsTrigger>
          <TabsTrigger value="logistics">Logistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trip Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tripName">Trip Name</Label>
                    <Input
                      id="tripName"
                      value={tripData.tripName}
                      onChange={(e) => setTripData({...tripData, tripName: e.target.value})}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      value={tripData.clientName}
                      onChange={(e) => setTripData({...tripData, clientName: e.target.value})}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="departureDate">Departure</Label>
                    <Input
                      id="departureDate"
                      type="datetime-local"
                      value={format(tripData.departureDate, "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => setTripData({...tripData, departureDate: new Date(e.target.value)})}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div>
                    <Label htmlFor="returnDate">Return</Label>
                    <Input
                      id="returnDate"
                      type="datetime-local"
                      value={format(tripData.returnDate, "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => setTripData({...tripData, returnDate: new Date(e.target.value)})}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Trip Notes</Label>
                  <Textarea
                    id="notes"
                    value={tripData.notes}
                    onChange={(e) => setTripData({...tripData, notes: e.target.value})}
                    placeholder="Special instructions, preferences, or notes about this trip..."
                    disabled={isReadOnly}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trip Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Trip Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Duration</span>
                    <span className="font-medium">
                      {Math.ceil((tripData.returnDate.getTime() - tripData.departureDate.getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Passengers</span>
                    <span className="font-medium">{passengers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Itinerary Items</span>
                    <span className="font-medium">{itinerary.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Confirmed</span>
                    <span className="font-medium text-green-600">{getConfirmedItems()}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Estimated Cost</span>
                    <span className="font-medium">${getTotalCost().toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Status Indicators */}
                <div className="space-y-2 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Trip details complete</span>
                  </div>
                  {passengers.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Passengers added</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span>No passengers added</span>
                    </div>
                  )}
                  {getConfirmedItems() === itinerary.length && itinerary.length > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>All items confirmed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      <span>{itinerary.length - getConfirmedItems()} items need confirmation</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="itinerary" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trip Itinerary</CardTitle>
                  <CardDescription>Manage flights, hotels, meetings, and activities</CardDescription>
                </div>
                {!isReadOnly && (
                  <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Itinerary Item</DialogTitle>
                        <DialogDescription>
                          Add a new item to the trip itinerary
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Item Type</Label>
                            <Select value={newItem.type} onValueChange={(value: any) => setNewItem({...newItem, type: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="flight">Flight</SelectItem>
                                <SelectItem value="hotel">Hotel</SelectItem>
                                <SelectItem value="transportation">Transportation</SelectItem>
                                <SelectItem value="meeting">Meeting</SelectItem>
                                <SelectItem value="meal">Meal</SelectItem>
                                <SelectItem value="activity">Activity</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="itemTitle">Title</Label>
                            <Input
                              id="itemTitle"
                              value={newItem.title}
                              onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                              placeholder="e.g., Board Meeting, Hotel Check-in"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="itemDescription">Description</Label>
                          <Input
                            id="itemDescription"
                            value={newItem.description}
                            onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                            placeholder="Brief description of the item"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="itemStartTime">Start Time</Label>
                            <Input
                              id="itemStartTime"
                              type="datetime-local"
                              value={newItem.startTime}
                              onChange={(e) => setNewItem({...newItem, startTime: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="itemEndTime">End Time</Label>
                            <Input
                              id="itemEndTime"
                              type="datetime-local"
                              value={newItem.endTime}
                              onChange={(e) => setNewItem({...newItem, endTime: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="itemLocation">Location</Label>
                          <Input
                            id="itemLocation"
                            value={newItem.location}
                            onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                            placeholder="Address or location details"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="itemVendor">Vendor (Optional)</Label>
                            <Input
                              id="itemVendor"
                              value={newItem.vendor}
                              onChange={(e) => setNewItem({...newItem, vendor: e.target.value})}
                              placeholder="Hotel name, airline, etc."
                            />
                          </div>
                          <div>
                            <Label htmlFor="itemCost">Cost (Optional)</Label>
                            <Input
                              id="itemCost"
                              type="number"
                              value={newItem.cost}
                              onChange={(e) => setNewItem({...newItem, cost: e.target.value})}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="itemNotes">Notes</Label>
                          <Textarea
                            id="itemNotes"
                            value={newItem.notes}
                            onChange={(e) => setNewItem({...newItem, notes: e.target.value})}
                            placeholder="Additional notes or special instructions"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddItem}>
                          Add Item
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {itinerary.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getItemIcon(item.type)}
                          <h4 className="font-medium">{item.title}</h4>
                          <Badge className={getItemColor(item.type)}>
                            {item.type}
                          </Badge>
                          {item.confirmed ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Confirmed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Time:</span>
                            <p>{format(item.startTime, 'MMM dd, HH:mm')} - {format(item.endTime, 'HH:mm')}</p>
                          </div>
                          <div>
                            <span className="font-medium">Location:</span>
                            <p>{item.location}</p>
                          </div>
                          <div>
                            {item.vendor && (
                              <>
                                <span className="font-medium">Vendor:</span>
                                <p>{item.vendor}</p>
                              </>
                            )}
                            {item.cost && (
                              <>
                                <span className="font-medium">Cost:</span>
                                <p>${item.cost.toLocaleString()}</p>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {item.notes && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Notes:</span>
                            <p className="text-muted-foreground">{item.notes}</p>
                          </div>
                        )}
                        
                        {item.confirmationNumber && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Confirmation:</span>
                            <p className="text-muted-foreground">{item.confirmationNumber}</p>
                          </div>
                        )}
                      </div>
                      
                      {!isReadOnly && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="passengers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Passengers</CardTitle>
                  <CardDescription>Manage passenger information and preferences</CardDescription>
                </div>
                {!isReadOnly && (
                  <Dialog open={isAddPassengerOpen} onOpenChange={setIsAddPassengerOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Passenger
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Passenger</DialogTitle>
                        <DialogDescription>
                          Add a new passenger to this trip
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="passengerName">Full Name</Label>
                          <Input
                            id="passengerName"
                            value={newPassenger.name}
                            onChange={(e) => setNewPassenger({...newPassenger, name: e.target.value})}
                            placeholder="John Smith"
                          />
                        </div>
                        <div>
                          <Label htmlFor="passengerEmail">Email</Label>
                          <Input
                            id="passengerEmail"
                            type="email"
                            value={newPassenger.email}
                            onChange={(e) => setNewPassenger({...newPassenger, email: e.target.value})}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="passengerPhone">Phone</Label>
                          <Input
                            id="passengerPhone"
                            value={newPassenger.phone}
                            onChange={(e) => setNewPassenger({...newPassenger, phone: e.target.value})}
                            placeholder="+1-555-0123"
                          />
                        </div>
                        <div>
                          <Label htmlFor="passengerDietary">Dietary Restrictions</Label>
                          <Input
                            id="passengerDietary"
                            value={newPassenger.dietaryRestrictions}
                            onChange={(e) => setNewPassenger({...newPassenger, dietaryRestrictions: e.target.value})}
                            placeholder="Vegetarian, No nuts, etc."
                          />
                        </div>
                        <div>
                          <Label htmlFor="passengerRequests">Special Requests</Label>
                          <Textarea
                            id="passengerRequests"
                            value={newPassenger.specialRequests}
                            onChange={(e) => setNewPassenger({...newPassenger, specialRequests: e.target.value})}
                            placeholder="Seating preferences, accessibility needs, etc."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddPassengerOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddPassenger}>
                          Add Passenger
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {passengers.map((passenger) => (
                  <Card key={passenger.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{passenger.name}</h4>
                          <p className="text-sm text-muted-foreground">{passenger.email}</p>
                        </div>
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Phone:</span>
                          <p className="text-muted-foreground">{passenger.phone}</p>
                        </div>
                        
                        {passenger.dietaryRestrictions && (
                          <div>
                            <span className="font-medium">Dietary:</span>
                            <p className="text-muted-foreground">{passenger.dietaryRestrictions}</p>
                          </div>
                        )}
                        
                        {passenger.specialRequests && (
                          <div>
                            <span className="font-medium">Requests:</span>
                            <p className="text-muted-foreground">{passenger.specialRequests}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Logistics</CardTitle>
              <CardDescription>Additional settings and coordination details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Scheduling Coordination</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoNotify">Auto-notify scheduling on changes</Label>
                      <Switch id="autoNotify" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="requireApproval">Require approval for major changes</Label>
                      <Switch id="requireApproval" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lockoutReminder">Send lockout reminders</Label>
                      <Switch id="lockoutReminder" defaultChecked />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Trip Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="lockoutDays">Lockout Period</Label>
                      <Select 
                        value={tripData.lockoutDays.toString()}
                        onValueChange={(value) => setTripData({...tripData, lockoutDays: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Day Before</SelectItem>
                          <SelectItem value="2">2 Days Before</SelectItem>
                          <SelectItem value="3">3 Days Before</SelectItem>
                          <SelectItem value="5">5 Days Before</SelectItem>
                          <SelectItem value="7">7 Days Before</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Communication Log</h4>
                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Trip Created</span>
                      <span className="text-xs text-muted-foreground">2 hours ago</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Trip created and initial itinerary added</p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Message to Scheduling</span>
                      <span className="text-xs text-muted-foreground">1 hour ago</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Requested aircraft availability confirmation</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}