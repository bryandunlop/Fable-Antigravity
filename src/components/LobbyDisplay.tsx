import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  Plane,
  Clock,
  Users,
  MapPin,
  Thermometer,
  Wind,
  CloudRain,
  Sun,
  Cloud,
  Eye,
  Navigation,
  Calendar,
  Timer,
  Fuel,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  LogOut
} from 'lucide-react';

interface LobbyDisplayProps {
  onLogout: () => void;
}

export default function LobbyDisplay({ onLogout }: LobbyDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPanel, setCurrentPanel] = useState(0);
  const [currentFlightIndex, setCurrentFlightIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [nextUpdateIn, setNextUpdateIn] = useState(15);

  // Mock flight data for today's departures
  const todaysFlights = [
    {
      id: 'FLT001',
      flightNumber: 'PJ 1001',
      aircraft: {
        registration: 'N1PG',
        type: 'Gulfstream G650',
        model: 'Gulfstream G650',
        year: 2019,
        seats: 9,
        range: '2,040 nm',
        maxSpeed: '416 kts',
        image: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=400&h=300&fit=crop'
      },
      departure: {
        airport: 'KBOS',
        city: 'Boston, MA',
        time: '08:30',
        gate: 'A-12'
      },
      destination: {
        airport: 'KMIA',
        city: 'Miami, FL',
        time: '12:15',
        gate: 'B-8'
      },
      crew: {
        captain: {
          name: 'Captain Sarah Mitchell',
          photo: 'https://images.unsplash.com/photo-1494790108755-2616b9106e71?w=200&h=200&fit=crop&crop=face',
          funFact1: 'Speaks 4 languages fluently',
          funFact2: 'Has climbed Mount Kilimanjaro'
        },
        firstOfficer: {
          name: 'First Officer Mike Johnson',
          photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
          funFact1: 'Former Navy helicopter pilot',
          funFact2: 'Makes award-winning BBQ'
        },
        flightAttendant: {
          name: 'Emma Davis',
          photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
          funFact1: 'Marathon runner (2:55 PR)',
          funFact2: 'Owns a rescue dog named Jet'
        }
      },
      passengers: 6,
      status: 'On Time',
      weather: {
        departure: {
          temp: 42,
          condition: 'Partly Cloudy',
          wind: '12 kts',
          visibility: '10 SM',
          icon: 'partly-cloudy'
        },
        destination: {
          temp: 78,
          condition: 'Sunny',
          wind: '8 kts',
          visibility: '10 SM',
          icon: 'sunny'
        }
      },
      flightTime: '3h 45m',
      fuel: '2,400 lbs'
    },
    {
      id: 'FLT002',
      flightNumber: 'PJ 1002',
      aircraft: {
        registration: 'N5PG',
        type: 'Gulfstream G500',
        model: 'Gulfstream G500',
        year: 2021,
        seats: 10,
        range: '2,010 nm',
        maxSpeed: '464 kts',
        image: 'https://images.unsplash.com/photo-1569629472922-3b0ebb9a6e5a?w=400&h=300&fit=crop'
      },
      departure: {
        airport: 'KTEB',
        city: 'Teterboro, NJ',
        time: '10:15',
        gate: 'C-5'
      },
      destination: {
        airport: 'KORD',
        city: 'Chicago, IL',
        time: '12:30',
        gate: 'D-12'
      },
      crew: {
        captain: {
          name: 'Captain Robert Chen',
          photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
          funFact1: 'Published aviation photographer',
          funFact2: 'Brews his own craft beer'
        },
        firstOfficer: {
          name: 'First Officer Lisa Rodriguez',
          photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
          funFact1: 'Former NASA intern',
          funFact2: 'Competitive salsa dancer'
        },
        flightAttendant: {
          name: 'James Wilson',
          photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
          funFact1: 'Certified sommelier',
          funFact2: 'Volunteers at animal shelters'
        }
      },
      passengers: 8,
      status: 'Boarding',
      weather: {
        departure: {
          temp: 38,
          condition: 'Overcast',
          wind: '15 kts',
          visibility: '7 SM',
          icon: 'cloudy'
        },
        destination: {
          temp: 35,
          condition: 'Light Snow',
          wind: '18 kts',
          visibility: '3 SM',
          icon: 'snow'
        }
      },
      flightTime: '2h 15m',
      fuel: '1,800 lbs'
    },
    {
      id: 'FLT003',
      flightNumber: 'PJ 1003',
      aircraft: {
        registration: 'N2PG',
        type: 'Gulfstream G650',
        model: 'Gulfstream G650',
        year: 2020,
        seats: 11,
        range: '1,806 nm',
        maxSpeed: '359 kts',
        image: 'https://images.unsplash.com/photo-1583123965949-ac98e3ba3000?w=400&h=300&fit=crop'
      },
      departure: {
        airport: 'KDCA',
        city: 'Washington, DC',
        time: '14:00',
        gate: 'E-3'
      },
      destination: {
        airport: 'KATL',
        city: 'Atlanta, GA',
        time: '16:45',
        gate: 'F-7'
      },
      crew: {
        captain: {
          name: 'Captain Jennifer Adams',
          photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face',
          funFact1: 'Former air show performer',
          funFact2: 'Grows exotic orchids'
        },
        firstOfficer: {
          name: 'First Officer David Brown',
          photo: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop&crop=face',
          funFact1: 'Stand-up comedian nights',
          funFact2: 'Restores vintage motorcycles'
        }
      },
      passengers: 5,
      status: 'Delayed 15min',
      weather: {
        departure: {
          temp: 45,
          condition: 'Rain',
          wind: '22 kts',
          visibility: '5 SM',
          icon: 'rainy'
        },
        destination: {
          temp: 72,
          condition: 'Partly Cloudy',
          wind: '10 kts',
          visibility: '10 SM',
          icon: 'partly-cloudy'
        }
      },
      flightTime: '1h 45m',
      fuel: '1,200 lbs'
    }
  ];

  // Update time every second and countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setNextUpdateIn((prev) => {
        const newValue = prev - 1;
        return newValue <= 0 ? 15 : newValue; // Reset to 15 when it reaches 0
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate panels every 15 seconds
  useEffect(() => {
    const panelTimer = setInterval(() => {
      setCurrentPanel((prev) => (prev + 1) % 4); // 4 different panel types
      setNextUpdateIn(15); // Reset the countdown when panel changes
    }, 15000);
    return () => clearInterval(panelTimer);
  }, []);

  // Rotate flights every 45 seconds when showing flight details
  useEffect(() => {
    const flightTimer = setInterval(() => {
      setCurrentFlightIndex((prev) => (prev + 1) % todaysFlights.length);
    }, 45000);
    return () => clearInterval(flightTimer);
  }, [todaysFlights.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+L to show logout option
      if (event.ctrlKey && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        setShowSettings(true);
      }
      // Escape to hide settings
      if (event.key === 'Escape') {
        setShowSettings(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'partly-cloudy':
        return <Cloud className="w-8 h-8 text-gray-400" />;
      case 'cloudy':
        return <Cloud className="w-8 h-8 text-gray-600" />;
      case 'rainy':
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      case 'snow':
        return <CloudRain className="w-8 h-8 text-blue-300" />;
      default:
        return <Sun className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'On Time') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Boarding') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (status.includes('Delayed')) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const currentFlight = todaysFlights[currentFlightIndex];

  // Panel 0: Flight Overview
  const FlightOverviewPanel = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold mb-4">Today's Departures</h1>
        <p className="text-3xl text-muted-foreground">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Flight Cards */}
      <div className="grid grid-cols-1 gap-6">
        {todaysFlights.map((flight, index) => (
          <Card key={flight.id} className={`p-6 ${index === currentFlightIndex ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{flight.flightNumber}</div>
                    <div className="text-lg text-muted-foreground">{flight.aircraft.registration}</div>
                  </div>

                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{flight.departure.time}</div>
                      <div className="text-lg">{flight.departure.city}</div>
                      <div className="text-sm text-muted-foreground">{flight.departure.airport}</div>
                    </div>

                    <div className="flex flex-col items-center">
                      <Plane className="w-8 h-8 text-primary mb-2" />
                      <div className="text-sm text-muted-foreground">{flight.flightTime}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold">{flight.destination.time}</div>
                      <div className="text-lg">{flight.destination.city}</div>
                      <div className="text-sm text-muted-foreground">{flight.destination.airport}</div>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2">
                  <Badge className={getStatusColor(flight.status)}>
                    {flight.status}
                  </Badge>
                  <div className="flex items-center text-lg">
                    <Users className="w-5 h-5 mr-2" />
                    {flight.passengers} PAX
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Panel 1: Current Flight Details
  const FlightDetailsPanel = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2">{currentFlight.flightNumber}</h1>
        <p className="text-2xl text-muted-foreground">{currentFlight.aircraft.type}</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Aircraft Info */}
        <Card className="p-6">
          <CardContent className="p-0">
            <h2 className="text-3xl font-bold mb-4">Aircraft Details</h2>
            <div className="mb-6">
              <ImageWithFallback
                src={currentFlight.aircraft.image}
                alt={currentFlight.aircraft.type}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span>Registration:</span>
                <strong>{currentFlight.aircraft.registration}</strong>
              </div>
              <div className="flex justify-between text-lg">
                <span>Model:</span>
                <strong>{currentFlight.aircraft.model}</strong>
              </div>
              <div className="flex justify-between text-lg">
                <span>Year:</span>
                <strong>{currentFlight.aircraft.year}</strong>
              </div>
              <div className="flex justify-between text-lg">
                <span>Capacity:</span>
                <strong>{currentFlight.aircraft.seats} seats</strong>
              </div>
              <div className="flex justify-between text-lg">
                <span>Range:</span>
                <strong>{currentFlight.aircraft.range}</strong>
              </div>
              <div className="flex justify-between text-lg">
                <span>Max Speed:</span>
                <strong>{currentFlight.aircraft.maxSpeed}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route & Status */}
        <Card className="p-6">
          <CardContent className="p-0">
            <h2 className="text-3xl font-bold mb-6">Flight Information</h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between text-xl">
                <div className="text-center">
                  <div className="font-bold text-2xl">{currentFlight.departure.time}</div>
                  <div className="text-lg">{currentFlight.departure.city}</div>
                  <div className="text-muted-foreground">{currentFlight.departure.airport}</div>
                  <div className="text-sm text-muted-foreground">Gate {currentFlight.departure.gate}</div>
                </div>

                <div className="flex flex-col items-center">
                  <Navigation className="w-10 h-10 text-primary mb-2" />
                  <div className="text-muted-foreground">{currentFlight.flightTime}</div>
                </div>

                <div className="text-center">
                  <div className="font-bold text-2xl">{currentFlight.destination.time}</div>
                  <div className="text-lg">{currentFlight.destination.city}</div>
                  <div className="text-muted-foreground">{currentFlight.destination.airport}</div>
                  <div className="text-sm text-muted-foreground">Gate {currentFlight.destination.gate}</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-lg">
                <div className="flex items-center">
                  <Users className="w-6 h-6 mr-3 text-primary" />
                  <span>{currentFlight.passengers} Passengers</span>
                </div>
                <div className="flex items-center">
                  <Fuel className="w-6 h-6 mr-3 text-primary" />
                  <span>{currentFlight.fuel} Fuel</span>
                </div>
                <div className="flex items-center">
                  <Timer className="w-6 h-6 mr-3 text-primary" />
                  <span>{currentFlight.flightTime} Flight Time</span>
                </div>
                <div className="flex items-center">
                  {currentFlight.status === 'On Time' ?
                    <CheckCircle className="w-6 h-6 mr-3 text-green-600" /> :
                    <AlertTriangle className="w-6 h-6 mr-3 text-orange-600" />
                  }
                  <span>{currentFlight.status}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Panel 2: Crew Information
  const CrewPanel = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2">Flight Crew</h1>
        <p className="text-2xl text-muted-foreground">{currentFlight.flightNumber} - {currentFlight.aircraft.registration}</p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Captain */}
        <Card className="p-6">
          <CardContent className="p-0 text-center">
            <div className="mb-4">
              <ImageWithFallback
                src={currentFlight.crew.captain.photo}
                alt={currentFlight.crew.captain.name}
                className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
              />
            </div>
            <h3 className="text-2xl font-bold mb-2">Captain</h3>
            <p className="text-xl mb-4">{currentFlight.crew.captain.name}</p>
            <div className="space-y-2 text-lg">
              <div className="flex items-center justify-center">
                <Info className="w-5 h-5 mr-2 text-primary" />
                <span>{currentFlight.crew.captain.funFact1}</span>
              </div>
              <div className="flex items-center justify-center">
                <Info className="w-5 h-5 mr-2 text-primary" />
                <span>{currentFlight.crew.captain.funFact2}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* First Officer */}
        <Card className="p-6">
          <CardContent className="p-0 text-center">
            <div className="mb-4">
              <ImageWithFallback
                src={currentFlight.crew.firstOfficer.photo}
                alt={currentFlight.crew.firstOfficer.name}
                className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
              />
            </div>
            <h3 className="text-2xl font-bold mb-2">First Officer</h3>
            <p className="text-xl mb-4">{currentFlight.crew.firstOfficer.name}</p>
            <div className="space-y-2 text-lg">
              <div className="flex items-center justify-center">
                <Info className="w-5 h-5 mr-2 text-primary" />
                <span>{currentFlight.crew.firstOfficer.funFact1}</span>
              </div>
              <div className="flex items-center justify-center">
                <Info className="w-5 h-5 mr-2 text-primary" />
                <span>{currentFlight.crew.firstOfficer.funFact2}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flight Attendant */}
        {currentFlight.crew.flightAttendant && (
          <Card className="p-6">
            <CardContent className="p-0 text-center">
              <div className="mb-4">
                <ImageWithFallback
                  src={currentFlight.crew.flightAttendant.photo}
                  alt={currentFlight.crew.flightAttendant.name}
                  className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                />
              </div>
              <h3 className="text-2xl font-bold mb-2">Flight Attendant</h3>
              <p className="text-xl mb-4">{currentFlight.crew.flightAttendant.name}</p>
              <div className="space-y-2 text-lg">
                <div className="flex items-center justify-center">
                  <Info className="w-5 h-5 mr-2 text-primary" />
                  <span>{currentFlight.crew.flightAttendant.funFact1}</span>
                </div>
                <div className="flex items-center justify-center">
                  <Info className="w-5 h-5 mr-2 text-primary" />
                  <span>{currentFlight.crew.flightAttendant.funFact2}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  // Panel 3: Weather Information
  const WeatherPanel = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2">Weather Conditions</h1>
        <p className="text-2xl text-muted-foreground">{currentFlight.flightNumber} Route Weather</p>
      </div>

      <div className="grid grid-cols-2 gap-12">
        {/* Departure Weather */}
        <Card className="p-8">
          <CardContent className="p-0">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">Departure</h2>
              <p className="text-xl text-muted-foreground">{currentFlight.departure.city}</p>
              <p className="text-lg text-muted-foreground">{currentFlight.departure.airport}</p>
            </div>

            <div className="text-center mb-6">
              {getWeatherIcon(currentFlight.weather.departure.icon)}
            </div>

            <div className="space-y-4 text-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Thermometer className="w-6 h-6 mr-3 text-red-500" />
                  <span>Temperature</span>
                </div>
                <strong>{currentFlight.weather.departure.temp}°F</strong>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cloud className="w-6 h-6 mr-3 text-gray-500" />
                  <span>Condition</span>
                </div>
                <strong>{currentFlight.weather.departure.condition}</strong>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wind className="w-6 h-6 mr-3 text-blue-500" />
                  <span>Wind</span>
                </div>
                <strong>{currentFlight.weather.departure.wind}</strong>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="w-6 h-6 mr-3 text-green-500" />
                  <span>Visibility</span>
                </div>
                <strong>{currentFlight.weather.departure.visibility}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destination Weather */}
        <Card className="p-8">
          <CardContent className="p-0">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">Destination</h2>
              <p className="text-xl text-muted-foreground">{currentFlight.destination.city}</p>
              <p className="text-lg text-muted-foreground">{currentFlight.destination.airport}</p>
            </div>

            <div className="text-center mb-6">
              {getWeatherIcon(currentFlight.weather.destination.icon)}
            </div>

            <div className="space-y-4 text-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Thermometer className="w-6 h-6 mr-3 text-red-500" />
                  <span>Temperature</span>
                </div>
                <strong>{currentFlight.weather.destination.temp}°F</strong>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cloud className="w-6 h-6 mr-3 text-gray-500" />
                  <span>Condition</span>
                </div>
                <strong>{currentFlight.weather.destination.condition}</strong>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wind className="w-6 h-6 mr-3 text-blue-500" />
                  <span>Wind</span>
                </div>
                <strong>{currentFlight.weather.destination.wind}</strong>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="w-6 h-6 mr-3 text-green-500" />
                  <span>Visibility</span>
                </div>
                <strong>{currentFlight.weather.destination.visibility}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCurrentPanel = () => {
    switch (currentPanel) {
      case 0:
        return <FlightOverviewPanel />;
      case 1:
        return <FlightDetailsPanel />;
      case 2:
        return <CrewPanel />;
      case 3:
        return <WeatherPanel />;
      default:
        return <FlightOverviewPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-8">
        {/* Status Bar */}
        <div className="flex justify-between items-center mb-8 p-4 bg-card rounded-lg shadow-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <Plane className="w-8 h-8 text-primary mr-3" />
              <span className="text-2xl font-bold">Flight Operations Center</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-6 h-6 text-muted-foreground mr-2" />
              <span className="text-lg">
                {currentTime.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-3xl font-bold">
                {currentTime.toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-sm text-muted-foreground">Local Time</div>
            </div>

            <div className="flex space-x-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${index === currentPanel ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="transition-all duration-1000 ease-in-out">
          {renderCurrentPanel()}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-muted-foreground">
          <p className="text-lg">Information updates automatically • Next update in {nextUpdateIn} seconds</p>
          <p className="text-sm mt-2 opacity-50">Press Ctrl+Shift+L for settings</p>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-sm mx-4">
            <CardContent className="p-0 text-center">
              <h3 className="text-xl font-bold mb-4">Display Settings</h3>
              <p className="text-muted-foreground mb-6">
                Return to login screen to access other modules
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={onLogout}
                  className="flex-1 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Exit Display
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}