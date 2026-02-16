import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plane,
  MapPin,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Lock,
  Edit,
  FileText,
  ArrowRight,
  RefreshCw,
  Cloud,
  CloudOff
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../authConfig';
import { graphService } from '../services/microsoftGraph';

interface CrewMember {
  id: string;
  name: string;
  role: string;
}

interface Flight {
  id: string;
  flightNumber: string;
  tailNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  crew: CrewMember[];
  status: 'scheduled' | 'departed' | 'arrived' | 'cancelled';
  oooi?: {
    out?: string;
    off?: string;
    on?: string;
    in?: string;
  };
}

interface FRATStatus {
  flightId: string;
  status: 'not_started' | 'draft' | 'submitted' | 'locked';
  submittedAt?: string;
  lastEditedAt?: string;
  fratId?: string;
  score?: number;
}

interface MyAirOpsFlightListProps {
  userRole: string;
  pilotId?: string;
}

export default function MyAirOpsFlightList({ userRole, pilotId }: MyAirOpsFlightListProps) {
  const navigate = useNavigate();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [fratStatuses, setFratStatuses] = useState<Map<string, FRATStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Outlook Calendar sync state
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookSyncing, setOutlookSyncing] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [msalInstance] = useState(() => new PublicClientApplication(msalConfig));
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Fetch flights from MyAirOps API
  const fetchFlights = async () => {
    setSyncing(true);
    try {
      // TODO: Replace with actual MyAirOps API endpoint
      // const response = await fetch('https://api.myairops.com/v1/flights', {
      //   headers: {
      //     'Authorization': `Bearer ${process.env.MYAIROPS_API_KEY}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // const data = await response.json();

      // Mock data for demonstration
      const mockFlights: Flight[] = [
        {
          id: 'FLT-001',
          flightNumber: 'OPS-101',
          tailNumber: 'N650GA',
          origin: 'KTEB',
          destination: 'KMIA',
          departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          arrivalTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          scheduledDeparture: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          scheduledArrival: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
          crew: [
            { id: 'P001', name: 'John Smith', role: 'Captain' },
            { id: 'P002', name: 'Sarah Johnson', role: 'First Officer' }
          ],
          status: 'scheduled'
        },
        {
          id: 'FLT-002',
          flightNumber: 'OPS-102',
          tailNumber: 'N650GB',
          origin: 'KPBI',
          destination: 'KTEB',
          departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          arrivalTime: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
          scheduledDeparture: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          scheduledArrival: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString(),
          crew: [
            { id: 'P001', name: 'John Smith', role: 'Captain' },
            { id: 'P003', name: 'Mike Davis', role: 'First Officer' }
          ],
          status: 'scheduled'
        },
        {
          id: 'FLT-003',
          flightNumber: 'OPS-103',
          tailNumber: 'N650GC',
          origin: 'KBOS',
          destination: 'KMCO',
          departureTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
          arrivalTime: new Date(Date.now() + (3 * 24 + 3) * 60 * 60 * 1000).toISOString(),
          scheduledDeparture: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          scheduledArrival: new Date(Date.now() + (3 * 24 + 3) * 60 * 60 * 1000).toISOString(),
          crew: [
            { id: 'P004', name: 'Emily Wilson', role: 'Captain' },
            { id: 'P001', name: 'John Smith', role: 'First Officer' }
          ],
          status: 'scheduled'
        },
        {
          id: 'FLT-004',
          flightNumber: 'OPS-104',
          tailNumber: 'N650GD',
          origin: 'KJFK',
          destination: 'KLAX',
          departureTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Departed 2 hours ago
          arrivalTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          scheduledDeparture: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          scheduledArrival: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          crew: [
            { id: 'P001', name: 'John Smith', role: 'Captain' },
            { id: 'P002', name: 'Sarah Johnson', role: 'First Officer' }
          ],
          status: 'departed',
          oooi: {
            out: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
            off: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          }
        },
        {
          id: 'FLT-005',
          flightNumber: 'OPS-105',
          tailNumber: 'N650GE',
          origin: 'KLAS',
          destination: 'KSEA',
          departureTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
          arrivalTime: new Date(Date.now() + (5 * 24 + 2.5) * 60 * 60 * 1000).toISOString(),
          scheduledDeparture: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          scheduledArrival: new Date(Date.now() + (5 * 24 + 2.5) * 60 * 60 * 1000).toISOString(),
          crew: [
            { id: 'P001', name: 'John Smith', role: 'Captain' },
            { id: 'P005', name: 'Robert Brown', role: 'First Officer' }
          ],
          status: 'scheduled'
        }
      ];

      setFlights(mockFlights);
      setLastSync(new Date());

      // Load FRAT statuses from localStorage
      loadFRATStatuses(mockFlights);

      toast.success('Flights synchronized successfully');
    } catch (error) {
      console.error('Error fetching flights:', error);
      toast.error('Failed to sync flights from MyAirOps');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  // Outlook Calendar Integration Functions
  const connectOutlook = async () => {
    try {
      const loginResponse = await msalInstance.loginPopup(loginRequest);
      const account = loginResponse.account;

      if (account) {
        // Get access token
        const tokenResponse = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account,
        });

        setAccessToken(tokenResponse.accessToken);
        graphService.initializeClient(tokenResponse.accessToken);
        setOutlookConnected(true);

        // Save connection state
        localStorage.setItem('outlook-connected', 'true');

        toast.success('Connected to Outlook Calendar');

        // Trigger initial sync if auto-sync is enabled
        if (autoSyncEnabled) {
          await syncWithOutlook();
        }
      }
    } catch (error) {
      console.error('Error connecting to Outlook:', error);
      toast.error('Failed to connect to Outlook');
    }
  };

  const disconnectOutlook = () => {
    setOutlookConnected(false);
    setAccessToken(null);
    setAutoSyncEnabled(false);
    localStorage.removeItem('outlook-connected');
    localStorage.removeItem('outlook-auto-sync');
    toast.success('Disconnected from Outlook');
  };

  const syncWithOutlook = async () => {
    if (!outlookConnected || !accessToken) {
      toast.error('Please connect to Outlook first');
      return;
    }

    setOutlookSyncing(true);
    try {
      // Get date range for sync (next 30 days)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      // Fetch existing calendar events
      const existingEvents = await graphService.getCalendarEvents(startDate, endDate);

      // Track synced flight IDs
      const syncedFlightIds = new Set<string>();
      let addedCount = 0;
      let updatedCount = 0;
      let removedCount = 0;

      // Add or update flights in calendar
      for (const flight of flights) {
        const flightDate = new Date(flight.departureTime);

        // Only sync future flights
        if (flightDate < startDate) continue;

        syncedFlightIds.add(flight.id);

        // Check if event already exists
        const existingEvent = existingEvents.find((event) =>
          event.subject?.includes(flight.flightNumber) &&
          event.subject?.includes(flight.tailNumber)
        );

        if (existingEvent) {
          // Update existing event
          await graphService.updateCalendarEvent(existingEvent.id, flight);
          updatedCount++;
        } else {
          // Create new event
          await graphService.createCalendarEvent(flight);
          addedCount++;
        }
      }

      // Remove events for flights that no longer exist (optional)
      if (autoSyncEnabled) {
        for (const event of existingEvents) {
          // Only remove events with MyAirOps category
          if (event.categories?.includes('MyAirOps')) {
            const stillExists = flights.some(
              (flight) =>
                event.subject?.includes(flight.flightNumber) &&
                event.subject?.includes(flight.tailNumber)
            );

            if (!stillExists) {
              await graphService.deleteCalendarEvent(event.id);
              removedCount++;
            }
          }
        }
      }

      toast.success(
        `Outlook sync complete: ${addedCount} added, ${updatedCount} updated${autoSyncEnabled ? `, ${removedCount} removed` : ''}`
      );
    } catch (error) {
      console.error('Error syncing with Outlook:', error);
      toast.error('Failed to sync with Outlook Calendar');
    } finally {
      setOutlookSyncing(false);
    }
  };

  const toggleAutoSync = () => {
    const newValue = !autoSyncEnabled;
    setAutoSyncEnabled(newValue);
    localStorage.setItem('outlook-auto-sync', newValue.toString());

    if (newValue && outlookConnected) {
      toast.success('Auto-sync enabled - flights will sync automatically');
      syncWithOutlook();
    } else if (!newValue) {
      toast.success('Auto-sync disabled');
    }
  };

  // Check for saved Outlook connection on mount
  useEffect(() => {
    const savedConnection = localStorage.getItem('outlook-connected');
    const savedAutoSync = localStorage.getItem('outlook-auto-sync');

    if (savedConnection === 'true') {
      // Attempt to restore connection
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance
          .acquireTokenSilent({
            ...loginRequest,
            account: accounts[0],
          })
          .then((response) => {
            setAccessToken(response.accessToken);
            graphService.initializeClient(response.accessToken);
            setOutlookConnected(true);

            if (savedAutoSync === 'true') {
              setAutoSyncEnabled(true);
            }
          })
          .catch(() => {
            // Token expired, user needs to reconnect
            localStorage.removeItem('outlook-connected');
          });
      }
    }
  }, [msalInstance]);

  // Auto-sync when flights change and auto-sync is enabled
  useEffect(() => {
    if (autoSyncEnabled && outlookConnected && flights.length > 0) {
      syncWithOutlook();
    }
  }, [flights, autoSyncEnabled, outlookConnected]);

  // Load FRAT statuses from localStorage
  const loadFRATStatuses = (flightList: Flight[]) => {
    const statuses = new Map<string, FRATStatus>();

    flightList.forEach(flight => {
      const savedStatus = localStorage.getItem(`frat-status-${flight.id}`);
      if (savedStatus) {
        statuses.set(flight.id, JSON.parse(savedStatus));
      } else {
        // Check if flight has departed to auto-lock
        const isDeparted = flight.status === 'departed' || (flight.oooi?.off !== undefined);
        statuses.set(flight.id, {
          flightId: flight.id,
          status: isDeparted ? 'locked' : 'not_started'
        });
      }
    });

    setFratStatuses(statuses);
  };

  // Save FRAT status to localStorage
  const saveFRATStatus = (flightId: string, status: FRATStatus) => {
    localStorage.setItem(`frat-status-${flightId}`, JSON.stringify(status));
    setFratStatuses(new Map(fratStatuses.set(flightId, status)));
  };

  useEffect(() => {
    fetchFlights();

    // Auto-sync every 5 minutes
    const interval = setInterval(fetchFlights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getTimeUntilDeparture = (departureTime: string) => {
    const now = new Date();
    const departure = new Date(departureTime);
    const hoursUntil = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntil < 0) return 'Departed';
    if (hoursUntil < 1) return `${Math.round(hoursUntil * 60)} min`;
    if (hoursUntil < 24) return `${Math.round(hoursUntil)} hrs`;
    return `${Math.round(hoursUntil / 24)} days`;
  };

  const getFRATStatusBadge = (status: FRATStatus, flight: Flight) => {
    switch (status.status) {
      case 'not_started':
        return (
          <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>FRAT Required</span>
          </div>
        );
      case 'draft':
        return (
          <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
            <Edit className="w-3 h-3" />
            <span>Draft</span>
          </div>
        );
      case 'submitted':
        return (
          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
            <CheckCircle className="w-3 h-3" />
            <span>Submitted {status.score && `(${status.score})`}</span>
          </div>
        );
      case 'locked':
        return (
          <div className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs">
            <Lock className="w-3 h-3" />
            <span>Locked</span>
          </div>
        );
    }
  };

  const handleFlightSelect = (flight: Flight) => {
    const status = fratStatuses.get(flight.id);

    if (status?.status === 'locked') {
      toast.error('This FRAT is locked - flight has already departed');
      return;
    }

    // Navigate to FRAT form with flight data
    navigate('/frat/enhanced', {
      state: {
        flight,
        fratStatus: status,
        mode: status?.status === 'submitted' ? 'edit' : 'create'
      }
    });
  };

  const getUrgencyColor = (departureTime: string, fratStatus: FRATStatus) => {
    const hoursUntil = (new Date(departureTime).getTime() - Date.now()) / (1000 * 60 * 60);

    if (fratStatus.status === 'locked') return 'border-gray-300 bg-gray-50';
    if (fratStatus.status === 'submitted') return 'border-green-300 bg-green-50';
    if (hoursUntil < 0) return 'border-red-300 bg-red-50';
    if (hoursUntil < 4 && fratStatus.status === 'not_started') return 'border-red-300 bg-red-50';
    if (hoursUntil < 12 && fratStatus.status === 'not_started') return 'border-yellow-300 bg-yellow-50';
    return 'border-blue-300 bg-white';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading flights from MyAirOps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">Upcoming Flights</h2>
          <p className="text-gray-600">Next 7 days - Select a flight to complete FRAT</p>
        </div>
        <div className="flex items-center gap-4">
          {lastSync && (
            <div className="text-sm text-gray-600">
              Last synced: {lastSync.toLocaleTimeString()}
            </div>
          )}
          <Button
            onClick={fetchFlights}
            disabled={syncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Flights
          </Button>
        </div>
      </div>

      {/* Outlook Calendar Integration */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {outlookConnected ? (
                <Cloud className="w-5 h-5 text-blue-600" />
              ) : (
                <CloudOff className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Outlook Calendar Sync
              </h3>
              <p className="text-xs text-gray-600">
                {outlookConnected
                  ? 'Connected - Flights can be synced to your calendar'
                  : 'Connect to automatically sync flights to Outlook'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {outlookConnected && (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={toggleAutoSync}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Auto-sync
                </label>
                <Button
                  onClick={syncWithOutlook}
                  disabled={outlookSyncing}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${outlookSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
                <Button
                  onClick={disconnectOutlook}
                  size="sm"
                  variant="ghost"
                >
                  Disconnect
                </Button>
              </>
            )}
            {!outlookConnected && (
              <Button
                onClick={connectOutlook}
                size="sm"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="w-4 h-4" />
                Connect Outlook
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Flight Cards */}
      <div className="grid gap-4">
        {flights.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Plane className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No upcoming flights found</p>
          </div>
        ) : (
          flights.map((flight) => {
            const status = fratStatuses.get(flight.id) || {
              flightId: flight.id,
              status: 'not_started' as const
            };

            return (
              <div
                key={flight.id}
                className={`border-2 rounded-lg p-6 transition-all hover:shadow-md cursor-pointer ${getUrgencyColor(flight.departureTime, status)}`}
                onClick={() => handleFlightSelect(flight)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <Plane className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl text-gray-900">{flight.flightNumber}</h3>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-600">{flight.tailNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4" />
                        <span>Departs in {getTimeUntilDeparture(flight.departureTime)}</span>
                      </div>
                    </div>
                  </div>
                  {getFRATStatusBadge(status, flight)}
                </div>

                {/* Route */}
                <div className="flex items-center gap-4 mb-4 bg-white p-4 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 mb-1">Origin</div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-lg text-gray-900">{flight.origin}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatDateTime(flight.departureTime)}
                    </div>
                  </div>

                  <ArrowRight className="w-6 h-6 text-gray-400" />

                  <div className="flex-1 text-right">
                    <div className="text-sm text-gray-600 mb-1">Destination</div>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-lg text-gray-900">{flight.destination}</span>
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {formatDateTime(flight.arrivalTime)}
                    </div>
                  </div>
                </div>

                {/* Crew */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Crew:</span>
                    <div className="flex gap-2">
                      {flight.crew.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-1 bg-white px-2 py-1 rounded text-xs border border-gray-200"
                        >
                          <span className="text-gray-900">{member.name}</span>
                          <span className="text-gray-500">({member.role})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {status.status === 'submitted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        handleFlightSelect(flight);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit FRAT
                    </Button>
                  )}

                  {status.status === 'not_started' && (
                    <Button
                      size="sm"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        handleFlightSelect(flight);
                      }}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Start FRAT
                    </Button>
                  )}

                  {status.status === 'locked' && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Lock className="w-4 h-4" />
                      <span>Flight departed - FRAT locked</span>
                    </div>
                  )}
                </div>

                {/* OOOI Info for departed flights */}
                {flight.oooi && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-600 flex gap-4">
                      {flight.oooi.out && (
                        <div>
                          <span className="font-medium">OUT:</span> {formatDateTime(flight.oooi.out)}
                        </div>
                      )}
                      {flight.oooi.off && (
                        <div>
                          <span className="font-medium">OFF:</span> {formatDateTime(flight.oooi.off)}
                        </div>
                      )}
                      {flight.oooi.on && (
                        <div>
                          <span className="font-medium">ON:</span> {formatDateTime(flight.oooi.on)}
                        </div>
                      )}
                      {flight.oooi.in && (
                        <div>
                          <span className="font-medium">IN:</span> {formatDateTime(flight.oooi.in)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Status Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border-2 border-red-300 rounded"></div>
            <span className="text-gray-700">Urgent - No FRAT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-300 rounded"></div>
            <span className="text-gray-700">Warning - No FRAT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
            <span className="text-gray-700">FRAT Submitted</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded"></div>
            <span className="text-gray-700">Locked (Departed)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
