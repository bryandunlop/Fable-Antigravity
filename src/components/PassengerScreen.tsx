import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  MapPin, 
  Clock, 
  Wifi, 
  Coffee, 
  Utensils, 
  Car, 
  Calendar,
  Phone,
  Navigation
} from 'lucide-react';

export default function PassengerScreen() {
  const flightInfo = {
    flightNumber: 'FO001',
    aircraft: 'N123AB - Boeing 737-800',
    departure: 'LAX - Los Angeles',
    destination: 'JFK - New York',
    departureTime: '08:00 PST',
    arrivalTime: '16:30 EST',
    gate: 'A12',
    seatMap: [
      { row: 1, seats: ['1A', '1B', '1C', '1D', '1E', '1F'], class: 'First' },
      { row: 2, seats: ['2A', '2B', '2C', '2D', '2E', '2F'], class: 'First' },
      { row: 3, seats: ['3A', '3B', '3C', '3D', '3E', '3F'], class: 'Business' },
      { row: 4, seats: ['4A', '4B', '4C', '4D', '4E', '4F'], class: 'Business' },
      { row: 5, seats: ['5A', '5B', '5C', '5D', '5E', '5F'], class: 'Economy' },
      { row: 6, seats: ['6A', '6B', '6C', '6D', '6E', '6F'], class: 'Economy' },
    ]
  };

  const menuItems = [
    {
      category: 'Breakfast',
      items: [
        { name: 'Continental Breakfast', description: 'Fresh fruit, pastries, coffee', price: 'Complimentary' },
        { name: 'Hot Breakfast', description: 'Eggs, bacon, toast, orange juice', price: '$12' },
        { name: 'Vegetarian Option', description: 'Yogurt parfait, granola, berries', price: '$8' }
      ]
    },
    {
      category: 'Beverages',
      items: [
        { name: 'Coffee & Tea', description: 'Premium coffee, assorted teas', price: 'Complimentary' },
        { name: 'Soft Drinks', description: 'Coca-Cola, Sprite, Orange juice', price: 'Complimentary' },
        { name: 'Alcoholic Beverages', description: 'Wine, beer, spirits', price: '$8-15' }
      ]
    }
  ];

  const transportOptions = [
    {
      type: 'Rideshare',
      name: 'Airport Shuttle',
      eta: '5-10 min',
      cost: '$25-35',
      description: 'Shared ride to Manhattan'
    },
    {
      type: 'Taxi',
      name: 'Yellow Cab',
      eta: '2-5 min',
      cost: '$55-75',
      description: 'Direct to destination'
    },
    {
      type: 'Rental',
      name: 'Car Rental',
      eta: '15-20 min',
      cost: '$45/day',
      description: 'Hertz, Avis, Enterprise available'
    }
  ];

  const upcomingEvents = [
    {
      title: 'Business Meeting',
      time: '18:00 EST',
      location: 'Manhattan Conference Center',
      description: 'Q4 Review Meeting'
    },
    {
      title: 'Dinner Reservation',
      time: '20:00 EST',
      location: 'Le Bernardin',
      description: 'Table for 4, confirmed'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium">Flight {flightInfo.flightNumber}</h1>
              <p className="text-sm opacity-90">{flightInfo.aircraft}</p>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              In Flight
            </Badge>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-center">
              <p className="opacity-75">Departure</p>
              <p className="font-medium">{flightInfo.departure}</p>
              <p className="text-xs">{flightInfo.departureTime}</p>
            </div>
            <div className="flex-1 mx-4">
              <div className="h-px bg-white/30 relative">
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  ✈️
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="opacity-75">Arrival</p>
              <p className="font-medium">{flightInfo.destination}</p>
              <p className="text-xs">{flightInfo.arrivalTime}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        <Tabs defaultValue="flight" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="flight" className="text-xs">Flight</TabsTrigger>
            <TabsTrigger value="menu" className="text-xs">Menu</TabsTrigger>
            <TabsTrigger value="transport" className="text-xs">Transport</TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs">Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flight" className="space-y-4">
            {/* Flight Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Flight Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Current Altitude</span>
                  <span className="font-medium">35,000 ft</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Ground Speed</span>
                  <span className="font-medium">420 kts</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>ETA</span>
                  <span className="font-medium">16:30 EST (On Time)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Flight Time Remaining</span>
                  <span className="font-medium">2h 15m</span>
                </div>
              </CardContent>
            </Card>

            {/* Seat Map */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Seat Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {flightInfo.seatMap.map((row) => (
                    <div key={row.row} className="flex items-center gap-1">
                      <span className="text-xs w-6">{row.row}</span>
                      <div className="flex gap-1">
                        {row.seats.map((seat, index) => (
                          <div
                            key={seat}
                            className={`w-6 h-6 text-xs flex items-center justify-center rounded border ${
                              index === 2 ? 'mr-2' : ''
                            } ${
                              Math.random() > 0.3 
                                ? 'bg-red-100 border-red-300 text-red-700' 
                                : 'bg-green-100 border-green-300 text-green-700'
                            }`}
                          >
                            {Math.random() > 0.3 ? '●' : '○'}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs ml-2 text-muted-foreground">{row.class}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ● Occupied &nbsp;&nbsp; ○ Available
                </p>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Onboard Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Wifi className="w-4 h-4 text-green-600" />
                    <span>WiFi Available</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Coffee className="w-4 h-4 text-green-600" />
                    <span>Refreshments</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Utensils className="w-4 h-4 text-green-600" />
                    <span>Meal Service</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span>Phone Service</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="menu" className="space-y-4">
            {menuItems.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle>{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.items.map((item, index) => (
                    <div key={index} className="border-b last:border-0 pb-3 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <span className="text-sm font-medium text-green-600">{item.price}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            
            <Button className="w-full">
              Call Flight Attendant
            </Button>
          </TabsContent>
          
          <TabsContent value="transport" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Ground Transportation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transportOptions.map((option, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{option.name}</h4>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                      <Badge variant="outline">{option.type}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>ETA: {option.eta}</span>
                      <span className="font-medium">{option.cost}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      Book Now
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Your Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingEvents.map((event, index) => (
                  <div key={index} className="border-l-4 border-primary pl-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <p className="text-sm text-muted-foreground">{event.location}</p>
                      </div>
                      <span className="text-sm font-medium">{event.time}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Button className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Add to Calendar
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}