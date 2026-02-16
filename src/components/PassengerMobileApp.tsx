import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Avatar } from './ui/avatar';
import { 
  Plane, 
  Calendar, 
  MapPin, 
  Clock, 
  User,
  Home,
  List,
  Settings,
  ChevronRight,
  Wifi,
  Coffee,
  Car,
  Hotel,
  Video,
  Phone,
  Mail,
  Download,
  Share2,
  Bell,
  FileText,
  Building2,
  MessageSquare,
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  CheckCircle2
} from 'lucide-react';

type TabType = 'home' | 'trips' | 'messages' | 'profile';

interface Message {
  id: string;
  content: string;
  author: string;
  authorRole: string;
  timestamp: string;
  isMe: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: string;
  name: string;
  role: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  status: 'online' | 'offline';
}

interface Flight {
  id: string;
  flightNumber: string;
  aircraft: string;
  tailNumber: string;
  departure: {
    airport: string;
    code: string;
    time: string;
    date: string;
    fbo?: string;
  };
  arrival: {
    airport: string;
    code: string;
    time: string;
    date: string;
    fbo?: string;
  };
  status: 'scheduled' | 'boarding' | 'in-flight' | 'completed';
  passengers: string[];
  crewPIC: string;
  crewSIC: string;
  flightAttendant?: string;
}

interface ItineraryEvent {
  id: string;
  type: 'flight' | 'hotel' | 'meeting' | 'ground-transport' | 'meal';
  title: string;
  date: string;
  time: string;
  location: string;
  details?: string;
  icon: React.ReactNode;
}

interface PassengerMobileAppProps {
  onLogout?: () => void;
}

export default function PassengerMobileApp({ onLogout }: PassengerMobileAppProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if passenger has an active trip (flight within 24 hours before or after)
  const hasActiveTrip = true; // In production, this would check actual flight dates

  // Mock passenger data
  const passengerInfo = {
    name: 'Robert Chen',
    label: 'C-Suite',
    role: 'Chief Executive Officer',
    email: 'r.chen@company.com',
    phone: '+1 (555) 123-4567',
    avatar: 'RC'
  };

  // Mock upcoming flights
  const upcomingFlights: Flight[] = [
    {
      id: 'F001',
      flightNumber: 'FO 450',
      aircraft: 'Gulfstream G650',
      tailNumber: 'N650GS',
      departure: {
        airport: 'Teterboro',
        code: 'KTEB',
        time: '09:00',
        date: 'Nov 13',
        fbo: 'Signature Flight Support'
      },
      arrival: {
        airport: 'Miami Opa-Locka',
        code: 'KOPF',
        time: '12:15',
        date: 'Nov 13',
        fbo: 'Sheltair'
      },
      status: 'scheduled',
      passengers: ['Robert Chen', 'Sarah Johnson'],
      crewPIC: 'Capt. Michael Stone',
      crewSIC: 'FO Jennifer Adams',
      flightAttendant: 'Jessica Martinez'
    },
    {
      id: 'F002',
      flightNumber: 'FO 451',
      aircraft: 'Gulfstream G650',
      tailNumber: 'N650GS',
      departure: {
        airport: 'Miami Opa-Locka',
        code: 'KOPF',
        time: '16:00',
        date: 'Nov 15',
        fbo: 'Sheltair'
      },
      arrival: {
        airport: 'Teterboro',
        code: 'KTEB',
        time: '19:20',
        date: 'Nov 15',
        fbo: 'Signature Flight Support'
      },
      status: 'scheduled',
      passengers: ['Robert Chen'],
      crewPIC: 'Capt. Michael Stone',
      crewSIC: 'FO David Park'
    }
  ];

  // Mock conversations for Flight Family
  const conversations: Conversation[] = [
    {
      id: 'crew',
      name: 'Flight Crew',
      role: 'Your crew for FO 450',
      avatar: '👨‍✈️',
      lastMessage: 'Looking forward to your flight!',
      timestamp: '10:30 AM',
      unread: 2,
      status: 'online'
    },
    {
      id: 'pic',
      name: 'Capt. Michael Stone',
      role: 'Pilot in Command',
      avatar: '👨‍✈️',
      lastMessage: 'Weather looks perfect for departure',
      timestamp: '10:15 AM',
      unread: 0,
      status: 'online'
    },
    {
      id: 'fa',
      name: 'Jessica Martinez',
      role: 'Flight Attendant',
      avatar: '✈️',
      lastMessage: 'Any special catering requests?',
      timestamp: '9:45 AM',
      unread: 1,
      status: 'online'
    },
    {
      id: 'scheduling',
      name: 'Scheduling Team',
      role: 'Trip coordination',
      avatar: '📅',
      lastMessage: 'Your ground transport is confirmed',
      timestamp: '9:00 AM',
      unread: 0,
      status: 'online'
    }
  ];

  // Mock messages for active conversation
  const conversationMessages: { [key: string]: Message[] } = {
    crew: [
      {
        id: '1',
        content: 'Good morning Mr. Chen! We\'re all set for tomorrow\'s flight to Miami.',
        author: 'Capt. Michael Stone',
        authorRole: 'Pilot in Command',
        timestamp: '8:30 AM',
        isMe: false,
        status: 'read'
      },
      {
        id: '2',
        content: 'Thank you! What time should I arrive at the FBO?',
        author: 'Robert Chen',
        authorRole: 'Passenger',
        timestamp: '8:45 AM',
        isMe: true,
        status: 'read'
      },
      {
        id: '3',
        content: 'We recommend arriving 15 minutes prior to departure at 8:45 AM.',
        author: 'Capt. Michael Stone',
        authorRole: 'Pilot in Command',
        timestamp: '8:46 AM',
        isMe: false,
        status: 'read'
      },
      {
        id: '4',
        content: 'Perfect, see you then!',
        author: 'Robert Chen',
        authorRole: 'Passenger',
        timestamp: '8:47 AM',
        isMe: true,
        status: 'read'
      },
      {
        id: '5',
        content: 'Looking forward to your flight!',
        author: 'Jessica Martinez',
        authorRole: 'Flight Attendant',
        timestamp: '10:30 AM',
        isMe: false,
        status: 'delivered'
      }
    ],
    pic: [
      {
        id: '1',
        content: 'Hello Mr. Chen, I wanted to give you a quick weather update for tomorrow.',
        author: 'Capt. Michael Stone',
        authorRole: 'Pilot in Command',
        timestamp: '10:00 AM',
        isMe: false,
        status: 'read'
      },
      {
        id: '2',
        content: 'Weather looks perfect for departure. Clear skies, light winds.',
        author: 'Capt. Michael Stone',
        authorRole: 'Pilot in Command',
        timestamp: '10:15 AM',
        isMe: false,
        status: 'delivered'
      }
    ],
    fa: [
      {
        id: '1',
        content: 'Good morning! I\'m preparing the cabin for your flight tomorrow.',
        author: 'Jessica Martinez',
        authorRole: 'Flight Attendant',
        timestamp: '9:30 AM',
        isMe: false,
        status: 'read'
      },
      {
        id: '2',
        content: 'Any special catering requests?',
        author: 'Jessica Martinez',
        authorRole: 'Flight Attendant',
        timestamp: '9:45 AM',
        isMe: false,
        status: 'delivered'
      }
    ],
    scheduling: [
      {
        id: '1',
        content: 'Good morning Mr. Chen! Your trip itinerary has been finalized.',
        author: 'Sarah Wilson',
        authorRole: 'Scheduling Coordinator',
        timestamp: '8:00 AM',
        isMe: false,
        status: 'read'
      },
      {
        id: '2',
        content: 'Your ground transport is confirmed for 7:30 AM pickup.',
        author: 'Sarah Wilson',
        authorRole: 'Scheduling Coordinator',
        timestamp: '9:00 AM',
        isMe: false,
        status: 'read'
      }
    ]
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && activeConversation) {
      // In production, this would send the message to the backend
      setNewMessage('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (activeConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation]);

  // Mock itinerary with flights and events
  const itinerary: ItineraryEvent[] = [
    {
      id: 'E1',
      type: 'ground-transport',
      title: 'Car Service Pickup',
      date: 'Nov 13',
      time: '07:30 AM',
      location: 'Manhattan Office',
      details: 'Black SUV • Driver: James Wilson',
      icon: <Car className="h-4 w-4" />
    },
    {
      id: 'F1',
      type: 'flight',
      title: 'Departure to Miami',
      date: 'Nov 13',
      time: '09:00 AM',
      location: 'KTEB → KOPF',
      details: 'Gulfstream G650 • N650GS',
      icon: <Plane className="h-4 w-4" />
    },
    {
      id: 'E2',
      type: 'hotel',
      title: 'Four Seasons Miami',
      date: 'Nov 13',
      time: '02:00 PM',
      location: '1435 Brickell Ave',
      details: 'Ocean View Suite • Conf #: FS789456',
      icon: <Hotel className="h-4 w-4" />
    },
    {
      id: 'E3',
      type: 'meeting',
      title: 'Board Meeting',
      date: 'Nov 14',
      time: '10:00 AM',
      location: 'Miami Convention Center',
      details: 'Room 401 • Virtual hybrid option',
      icon: <Video className="h-4 w-4" />
    },
    {
      id: 'E4',
      type: 'meal',
      title: 'Dinner Reservation',
      date: 'Nov 14',
      time: '07:00 PM',
      location: 'Zuma Miami',
      details: 'Table for 4 • Conf #: ZM1234',
      icon: <Coffee className="h-4 w-4" />
    },
    {
      id: 'F2',
      type: 'flight',
      title: 'Return to Teterboro',
      date: 'Nov 15',
      time: '04:00 PM',
      location: 'KOPF → KTEB',
      details: 'Gulfstream G650 • N650GS',
      icon: <Plane className="h-4 w-4" />
    }
  ];

  const getStatusColor = (status: Flight['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'boarding': return 'bg-yellow-500';
      case 'in-flight': return 'bg-green-500';
      case 'completed': return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: Flight['status']) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'boarding': return 'Boarding';
      case 'in-flight': return 'In Flight';
      case 'completed': return 'Completed';
    }
  };

  return (
    <div className="relative mx-auto w-[430px] bg-black rounded-[3rem] shadow-2xl overflow-hidden" style={{ height: '932px' }}>
      {/* iOS Notch */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-8 bg-black rounded-b-3xl z-50" />
      
      {/* Status Bar */}
      <div className="absolute top-0 left-0 right-0 h-12 flex items-start justify-between px-8 pt-3 text-white z-40">
        <div className="text-sm">9:41</div>
        <div className="flex items-center gap-1 text-xs">
          <Wifi className="h-3 w-3" />
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white rounded-sm" />
            <div className="w-1 h-3 bg-white rounded-sm" />
            <div className="w-1 h-3 bg-white/60 rounded-sm" />
            <div className="w-1 h-3 bg-white/30 rounded-sm" />
          </div>
          <div className="w-6 h-3 border border-white rounded-sm relative ml-1">
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-1 bg-white" style={{ right: '-2px' }} />
            <div className="absolute left-0.5 top-1/2 transform -translate-y-1/2 w-3 h-1.5 bg-white rounded-sm" />
          </div>
        </div>
      </div>

      {/* App Content */}
      <div className="relative h-full pt-12 pb-24 bg-gradient-to-br from-slate-50 to-slate-100">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {activeTab === 'home' && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl">Welcome back,</h1>
                    <h2 className="text-2xl">{passengerInfo.name.split(' ')[0]}</h2>
                  </div>
                  <div className="relative">
                    <button className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                      {passengerInfo.avatar}
                    </button>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                  </div>
                </div>

                {/* Unread Messages Banner */}
                {hasActiveTrip && conversations.filter(c => c.unread > 0).length > 0 && (
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <MessageSquare className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <div className="font-medium">New Messages</div>
                          <div className="text-sm opacity-90">
                            {conversations.filter(c => c.unread > 0).length} unread conversation{conversations.filter(c => c.unread > 0).length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  </button>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: <Calendar className="h-5 w-5" />, label: 'Schedule', tab: 'trips' as TabType },
                    { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', tab: 'messages' as TabType, badge: hasActiveTrip ? 3 : 0 },
                    { icon: <Phone className="h-5 w-5" />, label: 'Contact', tab: null },
                    { icon: <Bell className="h-5 w-5" />, label: 'Alerts', tab: null }
                  ].map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => action.tab && setActiveTab(action.tab)}
                      className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm active:scale-95 transition-transform relative"
                    >
                      <div className="text-blue-600">{action.icon}</div>
                      <span className="text-xs text-gray-600">{action.label}</span>
                      {action.badge && action.badge > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                          {action.badge}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Next Flight Card */}
                {upcomingFlights.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg">Next Flight</h3>
                      <Badge className="bg-blue-500 text-white">Upcoming</Badge>
                    </div>
                    <div 
                      className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl shadow-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                      onClick={() => setSelectedFlight(upcomingFlights[0].id)}
                    >
                      <div className="p-6 space-y-4 text-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm opacity-90">Flight {upcomingFlights[0].flightNumber}</div>
                            <div className="text-lg mt-1">{upcomingFlights[0].tailNumber}</div>
                            <div className="text-sm opacity-75 mt-1">{upcomingFlights[0].aircraft}</div>
                          </div>
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Plane className="h-6 w-6" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="text-3xl">{upcomingFlights[0].departure.code}</div>
                            <div className="text-xs opacity-75 mt-1">{upcomingFlights[0].departure.time}</div>
                            <div className="text-xs opacity-75">{upcomingFlights[0].departure.date}</div>
                          </div>
                          
                          <div className="flex-1 mx-4 flex flex-col items-center">
                            <div className="w-full h-0.5 bg-white/30 relative">
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full" />
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full" />
                              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <Plane className="h-4 w-4 rotate-90" />
                              </div>
                            </div>
                            <div className="text-xs opacity-75 mt-2">3h 15m</div>
                          </div>

                          <div className="text-center">
                            <div className="text-3xl">{upcomingFlights[0].arrival.code}</div>
                            <div className="text-xs opacity-75 mt-1">{upcomingFlights[0].arrival.time}</div>
                            <div className="text-xs opacity-75">{upcomingFlights[0].arrival.date}</div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <div className="text-xs opacity-75">Departure</div>
                            <div className="text-sm mt-1">{upcomingFlights[0].departure.airport}</div>
                            <div className="text-xs opacity-75 mt-0.5">{upcomingFlights[0].departure.fbo}</div>
                          </div>
                          <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                            <div className="text-xs opacity-75">Arrival</div>
                            <div className="text-sm mt-1">{upcomingFlights[0].arrival.airport}</div>
                            <div className="text-xs opacity-75 mt-0.5">{upcomingFlights[0].arrival.fbo}</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button className="flex-1 bg-white text-blue-600 hover:bg-white/90">
                            <Download className="h-4 w-4 mr-2" />
                            Trip Details
                          </Button>
                          <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* All Flights */}
                {upcomingFlights.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg">All Flights</h3>
                      <button className="text-sm text-blue-600">View All</button>
                    </div>
                    {upcomingFlights.slice(1).map((flight) => (
                      <div 
                        key={flight.id}
                        className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-transform"
                        onClick={() => setSelectedFlight(flight.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-sm text-gray-500">Flight {flight.flightNumber}</div>
                            <div className="font-medium">{flight.tailNumber}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {flight.departure.date}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="text-2xl">{flight.departure.code}</div>
                            <div className="text-xs text-gray-500 mt-1">{flight.departure.time}</div>
                          </div>
                          <div className="flex-1 mx-4">
                            <div className="h-px bg-gray-200 relative">
                              <Plane className="h-3 w-3 text-gray-400 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl">{flight.arrival.code}</div>
                            <div className="text-xs text-gray-500 mt-1">{flight.arrival.time}</div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Crew Information */}
                <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Your Crew</h3>
                    {hasActiveTrip && (
                      <button
                        onClick={() => setActiveTab('messages')}
                        className="text-sm text-blue-600 flex items-center gap-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: upcomingFlights[0].crewPIC, role: 'Pilot in Command', icon: '👨‍✈️' },
                      { name: upcomingFlights[0].crewSIC, role: 'Second in Command', icon: '👨‍✈️' },
                      ...(upcomingFlights[0].flightAttendant ? [{ name: upcomingFlights[0].flightAttendant, role: 'Flight Attendant', icon: '✈️' }] : [])
                    ].map((crew, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-lg">
                          {crew.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{crew.name}</div>
                          <div className="text-sm text-gray-500">{crew.role}</div>
                        </div>
                        <button className="text-blue-600">
                          <Phone className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'trips' && (
              <>
                {/* Header */}
                <div>
                  <h1 className="text-2xl">My Itinerary</h1>
                  <p className="text-gray-500 mt-1">Your upcoming schedule</p>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  {itinerary.map((event, idx) => (
                    <div key={event.id} className="relative">
                      {idx !== itinerary.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-200" />
                      )}
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          event.type === 'flight' 
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                            : 'bg-white border-2 border-gray-200 text-gray-600'
                        } shadow-sm`}>
                          {event.icon}
                        </div>
                        <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 mb-2">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium">{event.title}</div>
                              <div className="text-sm text-gray-500 mt-1">{event.details}</div>
                            </div>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {event.date}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </div>
                          </div>
                          {event.type === 'flight' && (
                            <Button variant="outline" size="sm" className="w-full mt-3">
                              View Flight Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Export Options */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="font-medium mb-4">Export Itinerary</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Calendar
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'profile' && (
              <>
                {/* Header */}
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl mx-auto shadow-xl">
                    {passengerInfo.avatar}
                  </div>
                  <div>
                    <h2 className="text-2xl">{passengerInfo.name}</h2>
                    <Badge className="mt-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
                      {passengerInfo.label} - {passengerInfo.role}
                    </Badge>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-2xl shadow-sm divide-y">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="font-medium">{passengerInfo.email}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Phone</div>
                        <div className="font-medium">{passengerInfo.phone}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Company</div>
                        <div className="font-medium">Executive Aviation Corp</div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-3">
                  <h3 className="text-lg">Travel Preferences</h3>
                  <div className="bg-white rounded-2xl shadow-sm divide-y">
                    {[
                      { label: 'Meal Preferences', value: 'No red meat' },
                      { label: 'Seat Preference', value: 'Forward facing' },
                      { label: 'Beverage', value: 'Sparkling water' },
                      { label: 'Temperature', value: '72°F' }
                    ].map((pref, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-500">{pref.label}</div>
                          <div className="font-medium mt-1">{pref.value}</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-3">
                  <h3 className="text-lg">Settings</h3>
                  <div className="bg-white rounded-2xl shadow-sm divide-y">
                    {[
                      { icon: <Bell className="h-5 w-5" />, label: 'Notifications', badge: '3 Active' },
                      { icon: <FileText className="h-5 w-5" />, label: 'Documents', badge: null },
                      { icon: <Settings className="h-5 w-5" />, label: 'App Settings', badge: null }
                    ].map((item, idx) => (
                      <button key={idx} className="w-full p-4 flex items-center justify-between text-left">
                        <div className="flex items-center gap-3">
                          <div className="text-gray-400">{item.icon}</div>
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">{item.badge}</Badge>
                          )}
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Demo Controls */}
                {onLogout && (
                  <div className="space-y-3">
                    <h3 className="text-lg">Demo Controls</h3>
                    <Button 
                      variant="outline" 
                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={onLogout}
                    >
                      Change User
                    </Button>
                  </div>
                )}

                <Button variant="outline" className="w-full">
                  Sign Out
                </Button>
              </>
            )}

            {activeTab === 'messages' && (
              <>
                {!hasActiveTrip ? (
                  /* No Active Trip Message */
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl mb-2">No Active Trip</h3>
                      <p className="text-gray-500 text-sm">
                        Flight Family messaging is available when you have an active trip
                      </p>
                    </div>
                  </div>
                ) : activeConversation ? (
                  /* Active Conversation View */
                  <div className="flex flex-col h-full">
                    {/* Conversation Header */}
                    <div className="bg-white border-b border-gray-200 p-4">
                      <button 
                        onClick={() => setActiveConversation(null)}
                        className="flex items-center gap-3 w-full"
                      >
                        <ChevronRight className="h-6 w-6 text-gray-600 rotate-180" />
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg">
                            {conversations.find(c => c.id === activeConversation)?.avatar}
                          </div>
                          <div className="text-left">
                            <div className="font-medium">
                              {conversations.find(c => c.id === activeConversation)?.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              Online
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                      {conversationMessages[activeConversation]?.map((message) => (
                        <div 
                          key={message.id} 
                          className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[75%] ${message.isMe ? 'order-2' : 'order-1'}`}>
                            {!message.isMe && (
                              <div className="text-xs text-gray-500 mb-1 ml-1">
                                {message.author}
                              </div>
                            )}
                            <div className={`rounded-2xl px-4 py-2 ${
                              message.isMe 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md' 
                                : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                            }`}>
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <div className={`text-xs text-gray-400 mt-1 flex items-center gap-1 ${
                              message.isMe ? 'justify-end' : 'justify-start'
                            }`}>
                              <span>{message.timestamp}</span>
                              {message.isMe && message.status === 'read' && (
                                <CheckCircle2 className="h-3 w-3 text-blue-500" />
                              )}
                              {message.isMe && message.status === 'delivered' && (
                                <CheckCircle2 className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="bg-white border-t border-gray-200 p-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-500 hover:text-gray-700">
                          <Paperclip className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-gray-500 hover:text-gray-700">
                          <ImageIcon className="h-5 w-5" />
                        </button>
                        <div className="flex-1 relative">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            className="pr-10 rounded-full bg-gray-100 border-0"
                          />
                          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700">
                            <Smile className="h-5 w-5" />
                          </button>
                        </div>
                        <button 
                          onClick={handleSendMessage}
                          className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Conversations List */
                  <>
                    <div>
                      <h1 className="text-2xl">Flight Family</h1>
                      <p className="text-gray-500 mt-1">Stay connected with your crew</p>
                    </div>

                    {/* Active Trip Badge */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm opacity-90">Active Trip</div>
                          <div className="font-medium mt-1">Flight FO 450 - Nov 13</div>
                          <div className="text-xs opacity-75 mt-1">KTEB → KOPF</div>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <Plane className="h-6 w-6" />
                        </div>
                      </div>
                    </div>

                    {/* Conversations */}
                    <div className="space-y-3">
                      <h3 className="text-sm text-gray-500 uppercase tracking-wider">Messages</h3>
                      {conversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => setActiveConversation(conversation.id)}
                          className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer active:scale-[0.98] transition-transform"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-lg">
                                {conversation.avatar}
                              </div>
                              {conversation.status === 'online' && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                              )}
                              {conversation.unread > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                                  {conversation.unread}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium">{conversation.name}</div>
                                <div className="text-xs text-gray-500">{conversation.timestamp}</div>
                              </div>
                              <div className="text-sm text-gray-500 truncate">{conversation.lastMessage}</div>
                              <div className="text-xs text-gray-400 mt-1">{conversation.role}</div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Info */}
                    <div className="bg-blue-50 rounded-2xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bell className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-blue-900 mb-1">
                            Quick Communication
                          </div>
                          <p className="text-sm text-blue-700">
                            Reach out to your crew and scheduling team anytime during your trip. Response times are typically under 5 minutes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* iOS Bottom Tab Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50">
        <div className="grid grid-cols-4 gap-0 py-2 pb-6">
          {[
            { id: 'home' as TabType, icon: <Home className="h-6 w-6" />, label: 'Home' },
            { id: 'trips' as TabType, icon: <List className="h-6 w-6" />, label: 'Itinerary' },
            { id: 'messages' as TabType, icon: <MessageSquare className="h-6 w-6" />, label: 'Messages', badge: hasActiveTrip ? 3 : 0 },
            { id: 'profile' as TabType, icon: <User className="h-6 w-6" />, label: 'Profile' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                    {tab.badge}
                  </div>
                )}
              </div>
              <span className="text-xs whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* iOS Home Indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-900 rounded-full" />
    </div>
  );
}
