import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Star, 
  Plus, 
  Filter, 
  Search, 
  ExternalLink, 
  MessageSquare, 
  DollarSign,
  Clock,
  Phone,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Send,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { toast } from "sonner";

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  city: string;
  state: string;
  country: string;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  rating: number;
  reviewCount: number;
  description: string;
  notes: string;
  photos: string[];
  googleMapsUrl: string;
  appleMapsUrl: string;
  phone?: string;
  website?: string;
  hours: string;
  status: 'approved' | 'pending' | 'rejected';
  addedBy: string;
  addedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  tags: string[];
}

interface Review {
  id: string;
  restaurantId: string;
  userId: string;
  userName: string;
  userRole: string;
  rating: number;
  comment: string;
  date: string;
  photos: string[];
}

const cuisineTypes = [
  'American', 'Asian', 'Chinese', 'French', 'Italian', 'Japanese', 'Mexican', 
  'Mediterranean', 'Indian', 'Thai', 'Steakhouse', 'Seafood', 'BBQ', 'Fast Food',
  'Cafe', 'Breakfast', 'Fine Dining', 'Casual Dining', 'Pizza', 'Sushi'
];

const priceRanges = [
  { value: '$', label: '$ - Under $15', description: 'Budget-friendly' },
  { value: '$$', label: '$$ - $15-30', description: 'Moderate' },
  { value: '$$$', label: '$$$ - $30-60', description: 'Upscale' },
  { value: '$$$$', label: '$$$$ - $60+', description: 'Fine dining' }
];

// Mock data - in a real app, this would come from your backend
const mockRestaurants: Restaurant[] = [
  {
    id: '1',
    name: 'The Aviation Grill',
    cuisine: 'American',
    location: 'Terminal A, DFW Airport',
    city: 'Dallas',
    state: 'TX',
    country: 'USA',
    priceRange: '$$',
    rating: 4.2,
    reviewCount: 156,
    description: 'Classic American dining with a view of the runway',
    notes: 'Great for crew meals between flights. Known for their steaks and quick service.',
    photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400'],
    googleMapsUrl: 'https://maps.google.com/?q=Aviation+Grill+DFW',
    appleMapsUrl: 'maps://?q=Aviation+Grill+DFW',
    phone: '+1-469-555-0123',
    website: 'https://aviationgrill.com',
    hours: '5:00 AM - 11:00 PM',
    status: 'approved',
    addedBy: 'Captain Johnson',
    addedDate: '2024-01-15',
    approvedBy: 'Admin',
    approvedDate: '2024-01-16',
    tags: ['Airport', 'Quick Service', 'Steaks']
  },
  {
    id: '2',
    name: 'Marco\'s Italian Bistro',
    cuisine: 'Italian',
    location: '123 Main St, Miami Beach',
    city: 'Miami',
    state: 'FL',
    country: 'USA',
    priceRange: '$$$',
    rating: 4.7,
    reviewCount: 284,
    description: 'Authentic Italian cuisine in the heart of Miami Beach',
    notes: 'Excellent pasta and seafood. Reservations recommended for dinner.',
    photos: ['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400'],
    googleMapsUrl: 'https://maps.google.com/?q=Marco+Italian+Bistro+Miami',
    appleMapsUrl: 'maps://?q=Marco+Italian+Bistro+Miami',
    phone: '+1-305-555-0456',
    website: 'https://marcosmiami.com',
    hours: '11:00 AM - 10:00 PM',
    status: 'approved',
    addedBy: 'Sarah Chen',
    addedDate: '2024-02-01',
    approvedBy: 'Admin',
    approvedDate: '2024-02-02',
    tags: ['Romantic', 'Seafood', 'Wine Selection']
  },
  {
    id: '3',
    name: 'Sky High Sushi',
    cuisine: 'Japanese',
    location: 'Downtown Core, Singapore',
    city: 'Singapore',
    state: '',
    country: 'Singapore',
    priceRange: '$$$$',
    rating: 4.9,
    reviewCount: 92,
    description: 'Premium sushi experience with panoramic city views',
    notes: 'One of the best sushi places in Singapore. Expensive but worth it for special occasions.',
    photos: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400'],
    googleMapsUrl: 'https://maps.google.com/?q=Sky+High+Sushi+Singapore',
    appleMapsUrl: 'maps://?q=Sky+High+Sushi+Singapore',
    phone: '+65-6555-0789',
    hours: '6:00 PM - 12:00 AM',
    status: 'approved',
    addedBy: 'Mike Rodriguez',
    addedDate: '2024-01-20',
    approvedBy: 'Admin',
    approvedDate: '2024-01-21',
    tags: ['Fine Dining', 'City Views', 'Premium']
  },
  {
    id: '4',
    name: 'Local BBQ Joint',
    cuisine: 'BBQ',
    location: 'Airport Road, Austin',
    city: 'Austin',
    state: 'TX',
    country: 'USA',
    priceRange: '$',
    rating: 4.0,
    reviewCount: 45,
    description: 'Authentic Texas BBQ with generous portions',
    notes: 'Great value for money. Perfect for casual crew dinners.',
    photos: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'],
    googleMapsUrl: 'https://maps.google.com/?q=Local+BBQ+Austin',
    appleMapsUrl: 'maps://?q=Local+BBQ+Austin',
    phone: '+1-512-555-0321',
    hours: '11:00 AM - 9:00 PM',
    status: 'pending',
    addedBy: 'Tom Wilson',
    addedDate: '2024-03-01',
    tags: ['Casual', 'Large Portions', 'BBQ']
  }
];

const mockReviews: Review[] = [
  {
    id: '1',
    restaurantId: '1',
    userId: 'user1',
    userName: 'Captain Smith',
    userRole: 'pilot',
    rating: 4,
    comment: 'Great food and quick service. Perfect for layovers.',
    date: '2024-02-15',
    photos: []
  },
  {
    id: '2',
    restaurantId: '1',
    userId: 'user2',
    userName: 'Lisa Johnson',
    userRole: 'inflight',
    rating: 5,
    comment: 'Love the view of the runway while dining. Steaks are excellent!',
    date: '2024-02-20',
    photos: []
  },
  {
    id: '3',
    restaurantId: '2',
    userId: 'user3',
    userName: 'Mike Chen',
    userRole: 'maintenance',
    rating: 5,
    comment: 'Best Italian food in Miami. The seafood pasta is incredible.',
    date: '2024-02-25',
    photos: []
  }
];

interface RestaurantDatabaseProps {
  userRole?: string;
}

export default function RestaurantDatabase({ userRole = 'pilot' }: RestaurantDatabaseProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [showAdminPending, setShowAdminPending] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState<Partial<Restaurant>>({
    cuisine: '',
    priceRange: '$$',
    photos: [],
    tags: []
  });
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    photos: []
  });

  const isAdmin = userRole === 'admin' || userRole === 'lead';
  const canAddRestaurants = ['pilot', 'maintenance', 'inflight', 'admin', 'lead'].includes(userRole);

  // Get unique locations from restaurants
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(restaurants.map(r => `${r.city}, ${r.state || r.country}`))];
    return uniqueLocations.filter(Boolean);
  }, [restaurants]);

  // Filter and sort restaurants
  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants.filter(restaurant => {
      // Admin can see pending restaurants
      if (!isAdmin && restaurant.status !== 'approved') return false;
      
      const matchesSearch = searchTerm === '' || 
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCuisine = selectedCuisine === 'all' || restaurant.cuisine === selectedCuisine;
      const matchesLocation = selectedLocation === 'all' || 
        `${restaurant.city}, ${restaurant.state || restaurant.country}` === selectedLocation;
      const matchesPriceRange = selectedPriceRange === 'all' || restaurant.priceRange === selectedPriceRange;
      
      return matchesSearch && matchesCuisine && matchesLocation && matchesPriceRange;
    });

    // Sort restaurants
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'priceRange':
          const priceOrder = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };
          return priceOrder[a.priceRange] - priceOrder[b.priceRange];
        case 'newest':
          return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [restaurants, searchTerm, selectedCuisine, selectedLocation, selectedPriceRange, sortBy, isAdmin]);

  const pendingRestaurants = restaurants.filter(r => r.status === 'pending');

  const handleAddRestaurant = () => {
    if (!newRestaurant.name || !newRestaurant.cuisine || !newRestaurant.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    const restaurant: Restaurant = {
      id: Date.now().toString(),
      name: newRestaurant.name!,
      cuisine: newRestaurant.cuisine!,
      location: newRestaurant.location!,
      city: newRestaurant.city || '',
      state: newRestaurant.state || '',
      country: newRestaurant.country || 'USA',
      priceRange: newRestaurant.priceRange as '$' | '$$' | '$$$' | '$$$$',
      rating: 0,
      reviewCount: 0,
      description: newRestaurant.description || '',
      notes: newRestaurant.notes || '',
      photos: newRestaurant.photos || [],
      googleMapsUrl: newRestaurant.googleMapsUrl || '',
      appleMapsUrl: newRestaurant.appleMapsUrl || '',
      phone: newRestaurant.phone,
      website: newRestaurant.website,
      hours: newRestaurant.hours || '',
      status: isAdmin ? 'approved' : 'pending',
      addedBy: userRole === 'pilot' ? 'Captain User' : 'Current User',
      addedDate: new Date().toISOString().split('T')[0],
      approvedBy: isAdmin ? 'Admin' : undefined,
      approvedDate: isAdmin ? new Date().toISOString().split('T')[0] : undefined,
      tags: newRestaurant.tags || []
    };

    setRestaurants([...restaurants, restaurant]);
    setNewRestaurant({ cuisine: '', priceRange: '$$', photos: [], tags: [] });
    setShowAddDialog(false);
    toast.success(isAdmin ? 'Restaurant added successfully!' : 'Restaurant suggestion submitted for approval');
  };

  const handleApproveRestaurant = (restaurantId: string) => {
    setRestaurants(restaurants.map(r => 
      r.id === restaurantId 
        ? { ...r, status: 'approved' as const, approvedBy: 'Admin', approvedDate: new Date().toISOString().split('T')[0] }
        : r
    ));
    toast.success('Restaurant approved successfully!');
  };

  const handleRejectRestaurant = (restaurantId: string) => {
    setRestaurants(restaurants.map(r => 
      r.id === restaurantId 
        ? { ...r, status: 'rejected' as const }
        : r
    ));
    toast.success('Restaurant rejected');
  };

  const handleAddReview = (restaurantId: string) => {
    if (!newReview.comment.trim()) {
      toast.error('Please add a comment');
      return;
    }

    const review: Review = {
      id: Date.now().toString(),
      restaurantId,
      userId: 'current-user',
      userName: userRole === 'pilot' ? 'Captain User' : 'Current User',
      userRole,
      rating: newReview.rating,
      comment: newReview.comment,
      date: new Date().toISOString().split('T')[0],
      photos: newReview.photos
    };

    setReviews([...reviews, review]);
    
    // Update restaurant rating
    const restaurantReviews = [...reviews, review].filter(r => r.restaurantId === restaurantId);
    const avgRating = restaurantReviews.reduce((sum, r) => sum + r.rating, 0) / restaurantReviews.length;
    
    setRestaurants(restaurants.map(r => 
      r.id === restaurantId 
        ? { ...r, rating: Math.round(avgRating * 10) / 10, reviewCount: restaurantReviews.length }
        : r
    ));

    setNewReview({ rating: 5, comment: '', photos: [] });
    toast.success('Review added successfully!');
  };

  const getRestaurantReviews = (restaurantId: string) => {
    return reviews.filter(r => r.restaurantId === restaurantId);
  };

  const renderStars = (rating: number, size = 'small') => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="mb-2">Restaurant Database</h1>
          <p className="text-muted-foreground">
            Curated restaurant recommendations for flight crews
          </p>
        </div>
        
        <div className="flex gap-3">
          {isAdmin && pendingRestaurants.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowAdminPending(!showAdminPending)}
              className="relative"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Pending Approval
              <Badge variant="destructive" className="ml-2">
                {pendingRestaurants.length}
              </Badge>
            </Button>
          )}
          
          {canAddRestaurants && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="btn-aviation-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Restaurant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Restaurant</DialogTitle>
                  <DialogDescription>
                    Submit a new restaurant recommendation for approval by the admin team.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Restaurant Name *</Label>
                      <Input
                        id="name"
                        value={newRestaurant.name || ''}
                        onChange={(e) => setNewRestaurant({...newRestaurant, name: e.target.value})}
                        placeholder="Enter restaurant name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cuisine">Cuisine Type *</Label>
                      <Select value={newRestaurant.cuisine} onValueChange={(value) => setNewRestaurant({...newRestaurant, cuisine: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cuisine" />
                        </SelectTrigger>
                        <SelectContent>
                          {cuisineTypes.map(cuisine => (
                            <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={newRestaurant.location || ''}
                      onChange={(e) => setNewRestaurant({...newRestaurant, location: e.target.value})}
                      placeholder="Street address or location description"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newRestaurant.city || ''}
                        onChange={(e) => setNewRestaurant({...newRestaurant, city: e.target.value})}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={newRestaurant.state || ''}
                        onChange={(e) => setNewRestaurant({...newRestaurant, state: e.target.value})}
                        placeholder="State/Province"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={newRestaurant.country || 'USA'}
                        onChange={(e) => setNewRestaurant({...newRestaurant, country: e.target.value})}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priceRange">Price Range</Label>
                      <Select value={newRestaurant.priceRange} onValueChange={(value) => setNewRestaurant({...newRestaurant, priceRange: value as any})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priceRanges.map(range => (
                            <SelectItem key={range.value} value={range.value}>
                              {range.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="hours">Hours</Label>
                      <Input
                        id="hours"
                        value={newRestaurant.hours || ''}
                        onChange={(e) => setNewRestaurant({...newRestaurant, hours: e.target.value})}
                        placeholder="e.g., 11:00 AM - 10:00 PM"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newRestaurant.description || ''}
                      onChange={(e) => setNewRestaurant({...newRestaurant, description: e.target.value})}
                      placeholder="Brief description of the restaurant"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes for Crew</Label>
                    <Textarea
                      id="notes"
                      value={newRestaurant.notes || ''}
                      onChange={(e) => setNewRestaurant({...newRestaurant, notes: e.target.value})}
                      placeholder="Special notes, recommendations, or tips for flight crews"
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="googleMaps">Google Maps URL</Label>
                      <Input
                        id="googleMaps"
                        value={newRestaurant.googleMapsUrl || ''}
                        onChange={(e) => setNewRestaurant({...newRestaurant, googleMapsUrl: e.target.value})}
                        placeholder="https://maps.google.com/..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="appleMaps">Apple Maps URL</Label>
                      <Input
                        id="appleMaps"
                        value={newRestaurant.appleMapsUrl || ''}
                        onChange={(e) => setNewRestaurant({...newRestaurant, appleMapsUrl: e.target.value})}
                        placeholder="maps://..."
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newRestaurant.phone || ''}
                        onChange={(e) => setNewRestaurant({...newRestaurant, phone: e.target.value})}
                        placeholder="+1-555-123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={newRestaurant.website || ''}
                        onChange={(e) => setNewRestaurant({...newRestaurant, website: e.target.value})}
                        placeholder="https://restaurant.com"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRestaurant} className="btn-aviation-primary">
                      {isAdmin ? 'Add Restaurant' : 'Submit for Approval'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Admin Pending Approval Section */}
      {isAdmin && showAdminPending && pendingRestaurants.length > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium">{restaurant.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {restaurant.cuisine} • {restaurant.location}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Added by {restaurant.addedBy} on {new Date(restaurant.addedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRestaurant(restaurant)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveRestaurant(restaurant.id)}
                      className="btn-aviation-primary"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectRestaurant(restaurant.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="cuisine">Cuisine</Label>
              <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
                <SelectTrigger>
                  <SelectValue placeholder="All cuisines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cuisines</SelectItem>
                  {cuisineTypes.map(cuisine => (
                    <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priceRange">Price Range</Label>
              <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                <SelectTrigger>
                  <SelectValue placeholder="All prices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  {priceRanges.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sortBy">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="priceRange">Price</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restaurant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRestaurants.map((restaurant) => (
          <Card key={restaurant.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <div onClick={() => setSelectedRestaurant(restaurant)}>
              {restaurant.photos.length > 0 && (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  <img
                    src={restaurant.photos[0]}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium truncate">{restaurant.name}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    {restaurant.priceRange}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {restaurant.cuisine}
                  </Badge>
                  {restaurant.status === 'pending' && (
                    <Badge variant="outline" className="text-xs text-yellow-600">
                      Pending
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">
                    {restaurant.location}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  {renderStars(restaurant.rating)}
                  <span className="text-xs text-muted-foreground">
                    {restaurant.reviewCount} reviews
                  </span>
                </div>
                
                {restaurant.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {restaurant.notes}
                  </p>
                )}
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchTerm || selectedCuisine !== 'all' || selectedLocation !== 'all' || selectedPriceRange !== 'all' 
              ? 'No restaurants match your current filters.' 
              : 'No restaurants available.'}
          </div>
          {canAddRestaurants && (
            <Button 
              className="mt-4 btn-aviation-primary"
              onClick={() => setShowAddDialog(true)}
            >
              Add the first restaurant
            </Button>
          )}
        </div>
      )}

      {/* Restaurant Detail Dialog */}
      {selectedRestaurant && (
        <Dialog open={!!selectedRestaurant} onOpenChange={() => setSelectedRestaurant(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedRestaurant.name}
                {selectedRestaurant.status === 'pending' && (
                  <Badge variant="outline" className="text-yellow-600">
                    Pending Approval
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                View detailed restaurant information, reviews, and leave your own feedback.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Restaurant Info</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({getRestaurantReviews(selectedRestaurant.id).length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-4">
                {selectedRestaurant.photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedRestaurant.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${selectedRestaurant.name} photo ${index + 1}`}
                        className="aspect-video object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{selectedRestaurant.cuisine}</Badge>
                          <span>{selectedRestaurant.priceRange}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{selectedRestaurant.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{selectedRestaurant.hours || 'Hours not specified'}</span>
                        </div>
                        {selectedRestaurant.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{selectedRestaurant.phone}</span>
                          </div>
                        )}
                        {selectedRestaurant.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <a 
                              href={selectedRestaurant.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Website
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Rating</h4>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedRestaurant.rating, 'large')}
                        <span className="text-sm text-muted-foreground">
                          ({selectedRestaurant.reviewCount} reviews)
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Maps</h4>
                      <div className="flex gap-2">
                        {selectedRestaurant.googleMapsUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedRestaurant.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Google Maps
                            </a>
                          </Button>
                        )}
                        {selectedRestaurant.appleMapsUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedRestaurant.appleMapsUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Apple Maps
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedRestaurant.description || 'No description available.'}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Crew Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedRestaurant.notes || 'No special notes.'}
                      </p>
                    </div>
                    
                    {selectedRestaurant.tags.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedRestaurant.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium mb-2">Added By</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedRestaurant.addedBy} on {new Date(selectedRestaurant.addedDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="reviews" className="space-y-4">
                {/* Add Review Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Your Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Rating</Label>
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setNewReview({...newReview, rating: star})}
                            className="p-0 bg-transparent border-none"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= newReview.rating 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="reviewComment">Your Review</Label>
                      <Textarea
                        id="reviewComment"
                        value={newReview.comment}
                        onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                        placeholder="Share your experience with this restaurant..."
                        rows={3}
                      />
                    </div>
                    
                    <Button 
                      onClick={() => handleAddReview(selectedRestaurant.id)}
                      className="btn-aviation-primary"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Post Review
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Reviews List */}
                <div className="space-y-4">
                  {getRestaurantReviews(selectedRestaurant.id).map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {review.userName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{review.userName}</span>
                              <Badge variant="outline" className="text-xs">
                                {review.userRole}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.date).toLocaleDateString()}
                              </span>
                            </div>
                            {renderStars(review.rating)}
                            <p className="mt-2 text-sm">{review.comment}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {getRestaurantReviews(selectedRestaurant.id).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No reviews yet. Be the first to review this restaurant!
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}