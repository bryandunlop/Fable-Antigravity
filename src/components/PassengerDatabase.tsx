import React, { useState, useMemo, useRef } from 'react';
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
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  Edit,
  Eye,
  Star,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  Coffee,
  Utensils,
  AlertTriangle,
  ShieldAlert,
  AlertCircle,
  Clock,
  User,
  Cake,
  Wine,
  Save,
  X,
  FileText,
  Trash2,
  Camera,
  Image as ImageIcon,
  ThumbsDown
} from 'lucide-react';
import { usePassengers } from './passengers/PassengerContext';
import type { Passenger } from './passengers/passengerData';
import { fileToDataUrl, makePhoto } from './passengers/photoUtil';

interface PassengerDatabaseProps {
  userRole?: string;
}

// Passenger type is imported from the shared passengers module.

export default function PassengerDatabase({ userRole = 'pilot' }: PassengerDatabaseProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allergyFilter, setAllergyFilter] = useState('all');
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [isAddingPassenger, setIsAddingPassenger] = useState(false);
  const [isEditingPassenger, setIsEditingPassenger] = useState(false);
  const [isPassengerDetailOpen, setIsPassengerDetailOpen] = useState(false);

  // Passengers come from the shared store (persisted, shared with the FA flight view).
  const { passengers, addPassenger, updatePassenger, addPhoto, removePhoto } = usePassengers();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoCaption, setPendingPhotoCaption] = useState('');
  const matchesAllergy = (passenger: Passenger) => {
    if (allergyFilter === 'all') return true;
    if (allergyFilter === 'none') return passenger.allergies.length === 0;
    if (allergyFilter === 'has') return passenger.allergies.length > 0;
    if (allergyFilter === 'critical') return passenger.allergies.some(a => a.severity === 'Critical');
    return true;
  };

  const matchesRole = true;

  const filteredPassengers = passengers.filter(passenger => {
    const matchesSearch =
      passenger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.info.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      passenger.food.some(item => item.toLowerCase().includes(searchTerm.toLowerCase())) ||
      passenger.beverage.some(item => item.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch && matchesAllergy(passenger);
  });

  const getRoleColor = (role: string) => {
    if (['CEO', 'CFO', 'President', 'Sector CEO', 'Board Chairman', 'Board Member', 'Board of Directors'].includes(role)) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (role === 'Standard') {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Allergies are medical → always red. Dislikes (a preference) render yellow.
  const getAllergySeverityColor = (_severity: string) => 'bg-red-500 text-white border-red-600';

  const getAllergySeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <ShieldAlert className="w-3 h-3" />;
      case 'Moderate': return <AlertTriangle className="w-3 h-3" />;
      case 'Mild': return <AlertCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const hasAllergies = (passenger: Passenger) => passenger.allergies.length > 0;

  const [newPassengerForm, setNewPassengerForm] = useState<Partial<Passenger>>({
    name: '',
    info: { email: '', phone: '', address: '' },
    role: 'Standard',
    allergies: [],
    birthday: '',
    beverage: [],
    food: [],
    passengerComfort: {
      temperature: '70°F',
      seating: '',
      tvPreference: '',
      lighting: '',
      specialRequests: ''
    },
    additionalNotes: '',
    flightAttendantNotes: ''
  });

  const handleAddPassenger = () => {
    if (!newPassengerForm.name?.trim()) {
      toast.error('Please enter passenger name');
      return;
    }

    const newPassenger: Passenger = {
      id: `PAX${String(passengers.length + 1).padStart(3, '0')}`,
      name: newPassengerForm.name!,
      info: newPassengerForm.info || {},
      role: newPassengerForm.role || 'Standard',
      allergies: newPassengerForm.allergies || [],
      birthday: newPassengerForm.birthday || '',
      beverage: newPassengerForm.beverage || [],
      food: newPassengerForm.food || [],
      dislikes: newPassengerForm.dislikes || [],
      passengerComfort: newPassengerForm.passengerComfort || {},
      additionalNotes: newPassengerForm.additionalNotes || '',
      flightAttendantNotes: newPassengerForm.flightAttendantNotes || ''
    };

    addPassenger(newPassenger);
    setNewPassengerForm({
      name: '',
      info: { email: '', phone: '', address: '' },
      role: 'Standard',
      allergies: [],
      birthday: '',
      beverage: [],
      food: [],
      passengerComfort: { temperature: '70°F', seating: '', tvPreference: '', lighting: '', specialRequests: '' },
      additionalNotes: '',
      flightAttendantNotes: ''
    });
    setIsAddingPassenger(false);

    toast.success('Passenger Added', {
      description: `${newPassenger.name} has been added to the database.`
    });
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedPassenger) return;
    try {
      const url = await fileToDataUrl(file);
      addPhoto(selectedPassenger.id, makePhoto(url, pendingPhotoCaption, new Date().toISOString()));
      setPendingPhotoCaption('');
      toast.success('Photo added to passenger card');
    } catch {
      toast.error('Could not add photo');
    }
  };

  const PassengerForm = ({ passenger, onClose, isEditing = false }: {
    passenger?: Passenger;
    onClose: () => void;
    isEditing?: boolean;
  }) => {
    const [formData, setFormData] = useState<Partial<Passenger>>(
      passenger || newPassengerForm
    );

    const handleSave = () => {
      if (isEditing && passenger) {
        // Update existing passenger
        updatePassenger({ ...(formData as Passenger), id: passenger.id });
        toast.success('Passenger Updated');
        setIsEditingPassenger(false);
      } else {
        // Add new passenger
        setNewPassengerForm(formData);
        handleAddPassenger();
      }
      onClose();
    };

    const updateArrayField = (field: 'beverage' | 'food' | 'dislikes', value: string) => {
      const items = value.split(',').map(s => s.trim()).filter(s => s);
      setFormData({
        ...formData,
        [field]: items
      });
    };

    const addAllergy = () => {
      setFormData({
        ...formData,
        allergies: [
          ...(formData.allergies || []),
          { allergen: '', severity: 'Mild', reaction: '', medication: '' }
        ]
      });
    };

    const removeAllergy = (index: number) => {
      const newAllergies = [...(formData.allergies || [])];
      newAllergies.splice(index, 1);
      setFormData({ ...formData, allergies: newAllergies });
    };

    const updateAllergyItem = (index: number, field: keyof Passenger['allergies'][0], value: string) => {
      const newAllergies = [...(formData.allergies || [])];
      newAllergies[index] = { ...newAllergies[index], [field]: value };
      setFormData({ ...formData, allergies: newAllergies });
    };

    return (
      <div className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
            <TabsTrigger value="basic">Name & Info</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="birthday">Birthday</TabsTrigger>
            <TabsTrigger value="beverage">Beverage</TabsTrigger>
            <TabsTrigger value="food">Food</TabsTrigger>
            <TabsTrigger value="comfort">Comfort</TabsTrigger>
            {userRole === 'inflight' && (
              <TabsTrigger value="fa-notes" className="text-blue-600">FA Notes</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter passenger full name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="passenger@email.com"
                      value={formData.info?.email || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        info: { ...formData.info, email: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+1 (555) 000-0000"
                      value={formData.info?.phone || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        info: { ...formData.info, phone: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Full address"
                    value={formData.info?.address || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      info: { ...formData.info, address: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Passenger Role</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    value={['CEO', 'CFO', 'Sector CEO', 'President', 'Board of Directors'].includes(formData.role || '') ? formData.role : 'Custom'}
                    onValueChange={(value: string) => {
                      if (value === 'Custom') {
                        setFormData({ ...formData, role: formData.role === 'Standard' ? '' : formData.role || '' });
                      } else {
                        setFormData({ ...formData, role: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CEO">CEO</SelectItem>
                      <SelectItem value="CFO">CFO</SelectItem>
                      <SelectItem value="Sector CEO">Sector CEO</SelectItem>
                      <SelectItem value="President">President</SelectItem>
                      <SelectItem value="Board of Directors">Board of Directors</SelectItem>
                      <SelectItem value="Custom">Custom / Other</SelectItem>
                    </SelectContent>
                  </Select>

                  {(!['CEO', 'CFO', 'Sector CEO', 'President', 'Board of Directors'].includes(formData.role || '') || formData.role === '') && (
                    <Input
                      placeholder="Enter custom role..."
                      value={formData.role || ''}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="allergies" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label className="text-red-600 font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Allergies (Critical Safety Information)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    List all known allergies with severity levels.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAllergy} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Allergy
                </Button>
              </div>

              <div className="space-y-3">
                {formData.allergies?.map((allergy, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start bg-red-50/50 p-3 rounded-md border border-red-100">
                    <div className="col-span-3">
                      <Label className="text-xs mb-1 block">Allergen</Label>
                      <Input
                        placeholder="e.g. Peanuts"
                        value={allergy.allergen}
                        onChange={(e) => updateAllergyItem(index, 'allergen', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs mb-1 block">Severity</Label>
                      <Select
                        value={allergy.severity}
                        onValueChange={(value: 'Critical' | 'Moderate' | 'Mild') => updateAllergyItem(index, 'severity', value)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Critical">Critical</SelectItem>
                          <SelectItem value="Moderate">Moderate</SelectItem>
                          <SelectItem value="Mild">Mild</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs mb-1 block">Reaction</Label>
                      <Input
                        placeholder="Reaction"
                        value={allergy.reaction || ''}
                        onChange={(e) => updateAllergyItem(index, 'reaction', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs mb-1 block">Medication</Label>
                      <Input
                        placeholder="Meds"
                        value={allergy.medication || ''}
                        onChange={(e) => updateAllergyItem(index, 'medication', e.target.value)}
                        className="bg-white"
                      />
                    </div>
                    <div className="col-span-1 pt-6 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAllergy(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!formData.allergies || formData.allergies.length === 0) && (
                  <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                    <p>No allergies recorded</p>
                    <Button type="button" variant="link" onClick={addAllergy}>Add one now</Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="birthday" className="space-y-4">
            <div>
              <Label htmlFor="birthday" className="flex items-center gap-2">
                <Cake className="w-4 h-4" />
                Birthday
              </Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday || ''}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Used for special celebrations and personalized service during flights.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="beverage" className="space-y-4">
            <div>
              <Label htmlFor="beverage" className="flex items-center gap-2">
                <Wine className="w-4 h-4" />
                Beverage Preferences
              </Label>
              <Textarea
                id="beverage"
                placeholder="Enter beverages separated by commas&#10;Example: Dom Pérignon, Macallan 18, Perrier, Espresso"
                rows={4}
                value={formData.beverage?.join(', ') || ''}
                onChange={(e) => updateArrayField('beverage', e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="food" className="space-y-4">
            <div>
              <Label htmlFor="food" className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Food Preferences
              </Label>
              <Textarea
                id="food"
                placeholder="Enter food preferences separated by commas&#10;Example: Wagyu Beef, Lobster Thermidor, French cuisine, Italian cuisine"
                rows={4}
                value={formData.food?.join(', ') || ''}
                onChange={(e) => updateArrayField('food', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dislikes" className="flex items-center gap-2">
                <ThumbsDown className="w-4 h-4" />
                Dislikes
              </Label>
              <Textarea
                id="dislikes"
                placeholder="Foods/things the passenger dislikes, separated by commas&#10;Example: Cilantro, Well-done steak"
                rows={3}
                value={formData.dislikes?.join(', ') || ''}
                onChange={(e) => updateArrayField('dislikes', e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="comfort" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Personal preferences, behavioral notes, special instructions..."
                  rows={4}
                  value={formData.additionalNotes || ''}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Temperature Preference</Label>
                  <Input
                    placeholder="e.g., 72°F"
                    value={formData.passengerComfort?.temperature || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      passengerComfort: { ...formData.passengerComfort, temperature: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Seating Preference</Label>
                  <Input
                    placeholder="e.g., Window seat, aisle seat"
                    value={formData.passengerComfort?.seating || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      passengerComfort: { ...formData.passengerComfort, seating: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>TV Preference</Label>
                  <Input
                    placeholder="e.g., Action movies, Comedy shows, Drama series"
                    value={formData.passengerComfort?.tvPreference || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      passengerComfort: { ...formData.passengerComfort, tvPreference: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Lighting Preference</Label>
                  <Input
                    placeholder="e.g., Dimmed, Bright, Natural"
                    value={formData.passengerComfort?.lighting || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      passengerComfort: { ...formData.passengerComfort, lighting: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div>
                <Label>Special Requests</Label>
                <Textarea
                  placeholder="Any special requests or accommodations..."
                  rows={3}
                  value={formData.passengerComfort?.specialRequests || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    passengerComfort: { ...formData.passengerComfort, specialRequests: e.target.value }
                  })}
                />
              </div>
            </div>
          </TabsContent>

          {userRole === 'inflight' && (
            <TabsContent value="fa-notes" className="space-y-4">
              <div>
                <Label htmlFor="faNotes" className="flex items-center gap-2 text-blue-600 font-semibold">
                  <FileText className="w-4 h-4" />
                  Flight Attendant Private Notes
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  These notes are ONLY visible to Flight Attendant members. Use this for sensitive service preferences or behavioral notes.
                </p>
                <Textarea
                  id="faNotes"
                  placeholder="Enter private notes visible only to flight attendants..."
                  rows={6}
                  value={formData.flightAttendantNotes || ''}
                  onChange={(e) => setFormData({ ...formData, flightAttendantNotes: e.target.value })}
                  className="bg-blue-50 border-blue-200"
                />
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} className="flex-1 flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isEditing ? 'Update Passenger' : 'Add Passenger'}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </div>
      </div >
    );
  };

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Passenger Management
          </h1>
          <p className="text-muted-foreground">
            Manage passengers and view upcoming inflight trips.
          </p>
        </div>
      </div>

      <div className="space-y-6 mt-0">
        <div className="flex justify-end">
          <Dialog open={isAddingPassenger} onOpenChange={setIsAddingPassenger}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Passenger
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Passenger</DialogTitle>
                <DialogDescription>
                  Enter passenger details and preferences for personalized service
                </DialogDescription>
              </DialogHeader>
              <PassengerForm onClose={() => setIsAddingPassenger(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Passengers</p>
                  <p className="text-2xl font-bold">{passengers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Executives</p>
                  <p className="text-2xl font-bold text-red-700">
                    {passengers.filter(p => ['CEO', 'CFO', 'President', 'Sector CEO'].includes(p.role || '')).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-700 font-medium">Custom Roles</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {passengers.filter(p => !['CEO', 'CFO', 'President', 'Sector CEO', 'Standard'].includes(p.role || '')).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-700 font-medium">Has Allergies</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {passengers.filter(p => hasAllergies(p)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Cake className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-700 font-medium">This Month Birthdays</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {passengers.filter(p => {
                      if (!p.birthday) return false;
                      const birthMonth = new Date(p.birthday).getMonth();
                      const currentMonth = new Date().getMonth();
                      return birthMonth === currentMonth;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search passengers by name, email, food, or beverage preferences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">


            <Select value={allergyFilter} onValueChange={setAllergyFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Allergies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="any">Has Allergies</SelectItem>
                <SelectItem value="none">No Allergies</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Passengers List */}
        <div className="space-y-4">
          {filteredPassengers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">No passengers found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Start by adding your first passenger.'}
                </p>
                <Button onClick={() => setIsAddingPassenger(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Passenger
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredPassengers.map((passenger) => (
              <Card
                key={passenger.id}
                className={`${hasAllergies(passenger)
                  ? 'border-orange-300 border-2 bg-orange-50'
                  : ''
                  }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-lg">{passenger.name}</h3>

                        <Badge className={getRoleColor(passenger.role)}>
                          {passenger.role}
                        </Badge>
                        {hasAllergies(passenger) && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            ALLERGY
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        {/* Contact Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span>{passenger.info.email || 'No email'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{passenger.info.phone || 'No phone'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium">Role:</span>
                            <span>{passenger.role}</span>
                          </div>
                        </div>

                        {/* Birthday */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Cake className="w-3 h-3 text-purple-600" />
                            <span className="font-medium text-purple-700">Birthday</span>
                          </div>
                          {passenger.birthday ? (
                            <div className="text-xs text-purple-600">
                              {new Date(passenger.birthday).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not provided</span>
                          )}
                        </div>

                        {/* Allergies */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-3 h-3 text-orange-600" />
                            <span className="font-medium text-orange-700">Allergies</span>
                          </div>
                          {passenger.allergies.length > 0 ? (
                            <div className="space-y-1">
                              {passenger.allergies.slice(0, 2).map((allergy, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  {getAllergySeverityIcon(allergy.severity)}
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                    {allergy.allergen} - {allergy.severity}
                                  </Badge>
                                </div>
                              ))}
                              {passenger.allergies.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{passenger.allergies.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-green-600">No known allergies</span>
                          )}
                        </div>

                        {/* Beverages */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Wine className="w-3 h-3 text-blue-600" />
                            <span className="font-medium">Beverages</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {passenger.beverage.slice(0, 3).join(', ')}
                            {passenger.beverage.length > 3 && `... +${passenger.beverage.length - 3} more`}
                          </div>
                        </div>

                        {/* Food */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Utensils className="w-3 h-3 text-green-600" />
                            <span className="font-medium">Food</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {passenger.food.slice(0, 3).join(', ')}
                            {passenger.food.length > 3 && `... +${passenger.food.length - 3} more`}
                          </div>
                        </div>

                        {/* Comfort */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Heart className="w-3 h-3 text-purple-600" />
                            <span className="font-medium">Comfort</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {passenger.passengerComfort.temperature}, {passenger.passengerComfort.seating}
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3 h-3 text-gray-600" />
                            <span className="font-medium">Notes</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {passenger.additionalNotes ?
                              (passenger.additionalNotes.length > 50 ?
                                passenger.additionalNotes.substring(0, 50) + '...' :
                                passenger.additionalNotes
                              ) :
                              'No additional notes'
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPassenger(passenger);
                          setIsPassengerDetailOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPassenger(passenger);
                          setIsEditingPassenger(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* View Details Dialog */}
      <Dialog open={isPassengerDetailOpen} onOpenChange={setIsPassengerDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Passenger Details - {selectedPassenger?.name}</DialogTitle>
          </DialogHeader>
          {selectedPassenger && (
            <div className="space-y-4">
              {/* Full passenger details display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>Email: {selectedPassenger.info.email || 'Not provided'}</div>
                    <div>Phone: {selectedPassenger.info.phone || 'Not provided'}</div>
                    <div>Address: {selectedPassenger.info.address || 'Not provided'}</div>

                    <div>Role: {selectedPassenger.role}</div>
                    <div>Birthday: {selectedPassenger.birthday ? new Date(selectedPassenger.birthday).toLocaleDateString() : 'Not provided'}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Allergies</h4>
                  {selectedPassenger.allergies.length > 0 ? (
                    <div className="space-y-2">
                      {selectedPassenger.allergies.map((allergy, index) => (
                        <Card key={index} className="p-3 border-orange-200 bg-orange-50">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-3 h-3 text-orange-600" />
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              {allergy.severity}
                            </Badge>
                            <span className="font-medium">{allergy.allergen}</span>
                          </div>
                          {allergy.reaction && <div className="text-sm">Reaction: {allergy.reaction}</div>}
                          {allergy.medication && <div className="text-sm">Medication: {allergy.medication}</div>}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-green-600">No known allergies</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Beverage Preferences</h4>
                  <div className="text-sm">
                    {selectedPassenger.beverage.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {selectedPassenger.beverage.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No preferences specified</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Food Preferences</h4>
                  <div className="text-sm">
                    {selectedPassenger.food.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {selectedPassenger.food.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No preferences specified</p>
                    )}
                  </div>
                </div>
              </div>

              {(selectedPassenger.dislikes?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <ThumbsDown className="w-4 h-4 text-yellow-600" /> Dislikes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPassenger.dislikes!.map((d, index) => (
                        <Badge key={index} className="bg-yellow-400 text-yellow-950 border-yellow-500">{d}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Passenger Comfort</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Temperature: {selectedPassenger.passengerComfort.temperature || 'Not specified'}</div>
                  <div>Seating: {selectedPassenger.passengerComfort.seating || 'Not specified'}</div>
                  <div>TV Preference: {selectedPassenger.passengerComfort.tvPreference || 'Not specified'}</div>
                  <div>Lighting: {selectedPassenger.passengerComfort.lighting || 'Not specified'}</div>
                </div>
                {selectedPassenger.passengerComfort.specialRequests && (
                  <div className="mt-2">
                    <div className="font-medium text-sm">Special Requests:</div>
                    <div className="text-sm">{selectedPassenger.passengerComfort.specialRequests}</div>
                  </div>
                )}
              </div>

              {selectedPassenger.additionalNotes && (
                <div>
                  <h4 className="font-medium mb-2">Additional Notes</h4>
                  <p className="text-sm">{selectedPassenger.additionalNotes}</p>
                </div>
              )}

              <Separator />

              {/* Photos — cabin setup references (plating, bed setup, etc.) */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Photos
                  </h4>
                  <div className="flex items-center gap-2">
                    <Input
                      value={pendingPhotoCaption}
                      onChange={(e) => setPendingPhotoCaption(e.target.value)}
                      placeholder="Caption (e.g. bed setup)"
                      className="h-8 w-48"
                    />
                    <Button size="sm" variant="outline" onClick={() => photoInputRef.current?.click()}>
                      <Camera className="w-4 h-4 mr-1" /> Add Photo
                    </Button>
                  </div>
                </div>
                {(() => {
                  const live = passengers.find(p => p.id === selectedPassenger.id);
                  const photos = live?.photos ?? [];
                  return photos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No photos yet. Add cabin setup references — how they like food plated, bed setup, etc.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {photos.map(ph => (
                        <div key={ph.id} className="relative group border rounded-lg overflow-hidden bg-slate-50">
                          <img src={ph.url} alt={ph.caption || 'Passenger photo'} className="w-full h-28 object-cover" />
                          {ph.caption && <div className="px-2 py-1 text-xs truncate" title={ph.caption}>{ph.caption}</div>}
                          <button
                            className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove photo"
                            onClick={() => { removePhoto(selectedPassenger.id, ph.id); toast.success('Photo removed'); }}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoFile} />
              </div>
            </div>
          )}

          {userRole === 'inflight' && selectedPassenger && selectedPassenger.flightAttendantNotes && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Flight Attendant Notes
                <Badge variant="outline" className="ml-auto border-blue-200 text-blue-700 bg-white">Private</Badge>
              </h4>
              <p className="text-sm text-blue-900 whitespace-pre-wrap">{selectedPassenger.flightAttendantNotes}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Passenger Dialog */}
      <Dialog open={isEditingPassenger} onOpenChange={setIsEditingPassenger}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Passenger - {selectedPassenger?.name}</DialogTitle>
            <DialogDescription>
              Update passenger details and preferences
            </DialogDescription>
          </DialogHeader>
          {selectedPassenger && (
            <PassengerForm
              passenger={selectedPassenger}
              onClose={() => setIsEditingPassenger(false)}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}