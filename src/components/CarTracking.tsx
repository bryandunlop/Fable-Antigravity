import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { 
  Car, 
  Plus, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plane, 
  Users,
  AlertTriangle,
  Search,
  Filter,
  Download
} from 'lucide-react';

interface CarRecord {
  id: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  status: 'available' | 'checked-in' | 'assigned' | 'maintenance';
  assignedFlight?: string;
  passengerName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
  location: string;
  lastUpdated: string;
}

interface Flight {
  id: string;
  number: string;
  departure: string;
  arrival: string;
  date: string;
  aircraft: string;
}

export default function CarTracking() {
  const [cars, setCars] = useState<CarRecord[]>([
    {
      id: '1',
      make: 'Mercedes-Benz',
      model: 'S-Class',
      color: 'Black',
      licensePlate: 'LUX-001',
      status: 'checked-in',
      assignedFlight: 'GS650-123',
      passengerName: 'Mr. Anderson',
      checkInDate: '2025-02-15 14:30',
      location: 'Terminal A - Slot 1',
      lastUpdated: '2025-02-15 14:30'
    },
    {
      id: '2',
      make: 'BMW',
      model: '7 Series',
      color: 'White',
      licensePlate: 'LUX-002',
      status: 'available',
      location: 'Terminal A - Slot 2',
      lastUpdated: '2025-02-14 16:45'
    },
    {
      id: '3',
      make: 'Audi',
      model: 'A8',
      color: 'Silver',
      licensePlate: 'LUX-003',
      status: 'assigned',
      assignedFlight: 'GS650-124',
      passengerName: 'Ms. Johnson',
      location: 'Terminal B - Slot 5',
      lastUpdated: '2025-02-15 09:15'
    },
    {
      id: '4',
      make: 'Lexus',
      model: 'LS 500',
      color: 'Blue',
      licensePlate: 'LUX-004',
      status: 'maintenance',
      notes: 'Scheduled maintenance - oil change',
      location: 'Service Bay 1',
      lastUpdated: '2025-02-13 11:20'
    }
  ]);

  const [flights] = useState<Flight[]>([
    { id: '1', number: 'GS650-123', departure: 'KJFK', arrival: 'EGLL', date: '2025-02-15', aircraft: 'N123GS' },
    { id: '2', number: 'GS650-124', departure: 'KIAH', arrival: 'LFPG', date: '2025-02-16', aircraft: 'N456GS' },
    { id: '3', number: 'GS650-125', departure: 'KLAX', arrival: 'RJTT', date: '2025-02-17', aircraft: 'N789GS' }
  ]);

  const [selectedCar, setSelectedCar] = useState<CarRecord | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCheckInOutDialogOpen, setIsCheckInOutDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [newCar, setNewCar] = useState({
    make: '',
    model: '',
    color: '',
    licensePlate: '',
    location: ''
  });

  const [assignmentData, setAssignmentData] = useState({
    flightId: '',
    passengerName: '',
    notes: ''
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'checked-in':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'maintenance':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4" />;
      case 'checked-in':
        return <Users className="h-4 w-4" />;
      case 'assigned':
        return <Plane className="h-4 w-4" />;
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleAddCar = () => {
    if (!newCar.make || !newCar.model || !newCar.color || !newCar.licensePlate || !newCar.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    const car: CarRecord = {
      id: (cars.length + 1).toString(),
      ...newCar,
      status: 'available',
      lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    setCars([...cars, car]);
    setNewCar({ make: '', model: '', color: '', licensePlate: '', location: '' });
    setIsAddDialogOpen(false);
    toast.success('Car added successfully');
  };

  const handleAssignToFlight = () => {
    if (!selectedCar || !assignmentData.flightId || !assignmentData.passengerName) {
      toast.error('Please fill in all required fields');
      return;
    }

    const flight = flights.find(f => f.id === assignmentData.flightId);
    if (!flight) {
      toast.error('Flight not found');
      return;
    }

    setCars(cars.map(car => 
      car.id === selectedCar.id 
        ? {
            ...car,
            status: 'assigned',
            assignedFlight: flight.number,
            passengerName: assignmentData.passengerName,
            notes: assignmentData.notes,
            lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ')
          }
        : car
    ));

    setAssignmentData({ flightId: '', passengerName: '', notes: '' });
    setIsAssignDialogOpen(false);
    setSelectedCar(null);
    toast.success(`Car assigned to flight ${flight.number}`);
  };

  const handleCheckInOut = (car: CarRecord, action: 'check-in' | 'check-out') => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    
    setCars(cars.map(c => 
      c.id === car.id 
        ? {
            ...c,
            status: action === 'check-in' ? 'checked-in' : 'available',
            checkInDate: action === 'check-in' ? now : c.checkInDate,
            checkOutDate: action === 'check-out' ? now : undefined,
            lastUpdated: now
          }
        : c
    ));

    toast.success(`Car ${action === 'check-in' ? 'checked in' : 'checked out'} successfully`);
  };

  const handleStatusChange = (car: CarRecord, newStatus: string) => {
    setCars(cars.map(c => 
      c.id === car.id 
        ? {
            ...c,
            status: newStatus as any,
            assignedFlight: newStatus === 'available' ? undefined : c.assignedFlight,
            passengerName: newStatus === 'available' ? undefined : c.passengerName,
            lastUpdated: new Date().toISOString().slice(0, 16).replace('T', ' ')
          }
        : c
    ));

    toast.success('Car status updated');
  };

  const filteredCars = cars.filter(car => {
    const matchesSearch = 
      car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.passengerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.assignedFlight?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || car.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: cars.length,
    available: cars.filter(c => c.status === 'available').length,
    'checked-in': cars.filter(c => c.status === 'checked-in').length,
    assigned: cars.filter(c => c.status === 'assigned').length,
    maintenance: cars.filter(c => c.status === 'maintenance').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Car Tracking</h1>
          <p className="text-muted-foreground">
            Manage passenger vehicle check-in, assignments, and tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Car
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Car</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="make">Make</Label>
                    <Input
                      id="make"
                      value={newCar.make}
                      onChange={(e) => setNewCar({ ...newCar, make: e.target.value })}
                      placeholder="Mercedes-Benz"
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={newCar.model}
                      onChange={(e) => setNewCar({ ...newCar, model: e.target.value })}
                      placeholder="S-Class"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={newCar.color}
                      onChange={(e) => setNewCar({ ...newCar, color: e.target.value })}
                      placeholder="Black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="licensePlate">License Plate</Label>
                    <Input
                      id="licensePlate"
                      value={newCar.licensePlate}
                      onChange={(e) => setNewCar({ ...newCar, licensePlate: e.target.value })}
                      placeholder="LUX-001"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newCar.location}
                    onChange={(e) => setNewCar({ ...newCar, location: e.target.value })}
                    placeholder="Terminal A - Slot 1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCar}>
                    Add Car
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-semibold">{statusCounts.all}</p>
                <p className="text-sm text-muted-foreground">Total Cars</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-semibold">{statusCounts.available}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-semibold">{statusCounts['checked-in']}</p>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plane className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-semibold">{statusCounts.assigned}</p>
                <p className="text-sm text-muted-foreground">Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-semibold">{statusCounts.maintenance}</p>
                <p className="text-sm text-muted-foreground">Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cars by make, model, plate, passenger, or flight..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cars Table */}
      <Card>
        <CardHeader>
          <CardTitle>Car Inventory ({filteredCars.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Flight Assignment</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCars.map((car) => (
                <TableRow key={car.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{car.make} {car.model}</p>
                      <p className="text-sm text-muted-foreground">{car.color}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{car.licensePlate}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(car.status)}>
                      {getStatusIcon(car.status)}
                      <span className="ml-1 capitalize">{car.status.replace('-', ' ')}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>{car.location}</TableCell>
                  <TableCell>{car.assignedFlight || '-'}</TableCell>
                  <TableCell>{car.passengerName || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{car.lastUpdated}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {car.status === 'available' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCar(car);
                              setIsAssignDialogOpen(true);
                            }}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckInOut(car, 'check-in')}
                          >
                            Check In
                          </Button>
                        </>
                      )}
                      {car.status === 'checked-in' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckInOut(car, 'check-out')}
                        >
                          Check Out
                        </Button>
                      )}
                      {car.status === 'assigned' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(car, 'available')}
                        >
                          Unassign
                        </Button>
                      )}
                      <Select
                        value={car.status}
                        onValueChange={(value) => handleStatusChange(car, value)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="checked-in">Checked In</SelectItem>
                          <SelectItem value="assigned">Assigned</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Car to Flight</DialogTitle>
          </DialogHeader>
          {selectedCar && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>Car:</strong> {selectedCar.make} {selectedCar.model} ({selectedCar.color})</p>
                <p><strong>License:</strong> {selectedCar.licensePlate}</p>
              </div>
              <div>
                <Label htmlFor="flight">Flight</Label>
                <Select value={assignmentData.flightId} onValueChange={(value) => setAssignmentData({ ...assignmentData, flightId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select flight" />
                  </SelectTrigger>
                  <SelectContent>
                    {flights.map((flight) => (
                      <SelectItem key={flight.id} value={flight.id}>
                        {flight.number} - {flight.departure} to {flight.arrival} ({flight.date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="passenger">Passenger Name</Label>
                <Input
                  id="passenger"
                  value={assignmentData.passengerName}
                  onChange={(e) => setAssignmentData({ ...assignmentData, passengerName: e.target.value })}
                  placeholder="Enter passenger name"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={assignmentData.notes}
                  onChange={(e) => setAssignmentData({ ...assignmentData, notes: e.target.value })}
                  placeholder="Any special instructions or notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignToFlight}>
                  Assign Car
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}