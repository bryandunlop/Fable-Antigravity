import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  Sparkles, 
  Plane, 
  CheckCircle2, 
  XCircle, 
  Clock,
  User,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  ClipboardCheck,
  Droplet,
  Wind,
  Utensils,
  Armchair,
  Gauge,
  History,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface CleaningItem {
  id: string;
  name: string;
  zone: string;
  required: boolean;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

interface CleaningSession {
  id: string;
  aircraftId: string;
  tailNumber: string;
  sessionType: 'quick-turn' | 'overnight' | 'deep-clean' | 'detailing';
  status: 'not-started' | 'in-progress' | 'completed' | 'verified';
  startedBy?: string;
  startedAt?: string;
  completedBy?: string;
  completedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  items: CleaningItem[];
  notes?: string;
  nextCleaningDue?: string;
}

interface CleaningHistory {
  id: string;
  tailNumber: string;
  sessionType: string;
  completedBy: string;
  completedAt: string;
  duration: string;
  itemsCompleted: number;
  totalItems: number;
}

const CLEANING_ZONES = [
  { id: 'cockpit', name: 'Cockpit', icon: Gauge, color: 'blue' },
  { id: 'cabin', name: 'Cabin', icon: Armchair, color: 'purple' },
  { id: 'galley', name: 'Galley', icon: Utensils, color: 'green' },
  { id: 'lavatory', name: 'Lavatory', icon: Droplet, color: 'cyan' },
  { id: 'exterior', name: 'Exterior', icon: Wind, color: 'gray' }
];

const SESSION_TYPES = {
  'quick-turn': { name: 'Quick Turn', duration: '30 min', color: 'blue' },
  'overnight': { name: 'Overnight Clean', duration: '2 hrs', color: 'purple' },
  'deep-clean': { name: 'Deep Clean', duration: '4 hrs', color: 'orange' },
  'detailing': { name: 'Full Detailing', duration: '8 hrs', color: 'red' }
};

const DEFAULT_CLEANING_ITEMS: Omit<CleaningItem, 'id' | 'completed' | 'completedBy' | 'completedAt'>[] = [
  // Cockpit
  { name: 'Windscreen & Windows', zone: 'cockpit', required: true },
  { name: 'Instrument Panel', zone: 'cockpit', required: true },
  { name: 'Control Yokes', zone: 'cockpit', required: true },
  { name: 'Center Pedestal', zone: 'cockpit', required: true },
  { name: 'Pilot Seats', zone: 'cockpit', required: true },
  { name: 'Floor & Carpet', zone: 'cockpit', required: true },
  { name: 'Door Panels', zone: 'cockpit', required: false },
  
  // Cabin
  { name: 'Passenger Seats', zone: 'cabin', required: true },
  { name: 'Seat Belts', zone: 'cabin', required: true },
  { name: 'Cabin Windows', zone: 'cabin', required: true },
  { name: 'Side Panels', zone: 'cabin', required: true },
  { name: 'Cabin Floor & Carpet', zone: 'cabin', required: true },
  { name: 'Overhead Bins', zone: 'cabin', required: true },
  { name: 'Tables & Surfaces', zone: 'cabin', required: true },
  { name: 'Entertainment Systems', zone: 'cabin', required: false },
  { name: 'Window Shades', zone: 'cabin', required: false },
  
  // Galley
  { name: 'Countertops', zone: 'galley', required: true },
  { name: 'Coffee Maker', zone: 'galley', required: true },
  { name: 'Refrigerator', zone: 'galley', required: true },
  { name: 'Microwave/Oven', zone: 'galley', required: true },
  { name: 'Sink & Faucet', zone: 'galley', required: true },
  { name: 'Trash Receptacles', zone: 'galley', required: true },
  { name: 'Cabinets & Drawers', zone: 'galley', required: false },
  { name: 'Floor & Mats', zone: 'galley', required: true },
  
  // Lavatory
  { name: 'Toilet', zone: 'lavatory', required: true },
  { name: 'Sink & Countertop', zone: 'lavatory', required: true },
  { name: 'Mirror', zone: 'lavatory', required: true },
  { name: 'Floor', zone: 'lavatory', required: true },
  { name: 'Trash Receptacle', zone: 'lavatory', required: true },
  { name: 'Replenish Supplies', zone: 'lavatory', required: true },
  { name: 'Panels & Walls', zone: 'lavatory', required: false },
  
  // Exterior
  { name: 'Leading Edges', zone: 'exterior', required: false },
  { name: 'Fuselage Wash', zone: 'exterior', required: false },
  { name: 'Windows (External)', zone: 'exterior', required: false },
  { name: 'Landing Gear Doors', zone: 'exterior', required: false },
  { name: 'Entry Door', zone: 'exterior', required: true }
];

export default function AircraftCleaning() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CleaningSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CleaningSession | null>(null);
  const [cleaningHistory, setCleaningHistory] = useState<CleaningHistory[]>([]);
  const [currentUser] = useState('John Smith'); // Would come from auth context
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');

  // Initialize mock data
  useEffect(() => {
    const mockSessions: CleaningSession[] = [
      {
        id: '1',
        aircraftId: 'ac1',
        tailNumber: 'N650GX',
        sessionType: 'overnight',
        status: 'in-progress',
        startedBy: 'Sarah Johnson',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        items: DEFAULT_CLEANING_ITEMS.map((item, idx) => ({
          ...item,
          id: `1-${idx}`,
          completed: idx < 5,
          completedBy: idx < 5 ? 'Sarah Johnson' : undefined,
          completedAt: idx < 5 ? new Date(Date.now() - 1800000).toISOString() : undefined
        }))
      },
      {
        id: '2',
        aircraftId: 'ac2',
        tailNumber: 'N650ER',
        sessionType: 'quick-turn',
        status: 'completed',
        startedBy: 'Mike Chen',
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedBy: 'Mike Chen',
        completedAt: new Date(Date.now() - 5400000).toISOString(),
        verifiedBy: 'Captain Williams',
        verifiedAt: new Date(Date.now() - 5000000).toISOString(),
        items: DEFAULT_CLEANING_ITEMS.filter(item => item.required).map((item, idx) => ({
          ...item,
          id: `2-${idx}`,
          completed: true,
          completedBy: 'Mike Chen',
          completedAt: new Date(Date.now() - 6000000).toISOString()
        })),
        nextCleaningDue: new Date(Date.now() + 86400000).toISOString()
      }
    ];

    const mockHistory: CleaningHistory[] = [
      {
        id: 'h1',
        tailNumber: 'N650GX',
        sessionType: 'Deep Clean',
        completedBy: 'Detailing Team',
        completedAt: new Date(Date.now() - 172800000).toISOString(),
        duration: '3h 45m',
        itemsCompleted: 35,
        totalItems: 35
      },
      {
        id: 'h2',
        tailNumber: 'N650ER',
        sessionType: 'Overnight Clean',
        completedBy: 'Night Crew',
        completedAt: new Date(Date.now() - 259200000).toISOString(),
        duration: '1h 52m',
        itemsCompleted: 28,
        totalItems: 28
      }
    ];

    setSessions(mockSessions);
    setCleaningHistory(mockHistory);
  }, []);

  const calculateProgress = (items: CleaningItem[]): number => {
    if (items.length === 0) return 0;
    const completed = items.filter(item => item.completed).length;
    return Math.round((completed / items.length) * 100);
  };

  const getStatusColor = (status: CleaningSession['status']) => {
    switch (status) {
      case 'not-started': return 'gray';
      case 'in-progress': return 'blue';
      case 'completed': return 'green';
      case 'verified': return 'purple';
      default: return 'gray';
    }
  };

  const toggleItem = (sessionId: string, itemId: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id !== sessionId) return session;
      
      const updatedItems = session.items.map(item => {
        if (item.id !== itemId) return item;
        
        const newCompleted = !item.completed;
        return {
          ...item,
          completed: newCompleted,
          completedBy: newCompleted ? currentUser : undefined,
          completedAt: newCompleted ? new Date().toISOString() : undefined
        };
      });

      const allCompleted = updatedItems.every(item => item.completed);
      const anyCompleted = updatedItems.some(item => item.completed);
      
      let newStatus = session.status;
      if (allCompleted && session.status !== 'verified') {
        newStatus = 'completed';
        toast.success('Cleaning session completed!', {
          description: `All items for ${session.tailNumber} are complete`
        });
      } else if (anyCompleted && session.status === 'not-started') {
        newStatus = 'in-progress';
      }

      return {
        ...session,
        items: updatedItems,
        status: newStatus,
        completedBy: allCompleted ? currentUser : session.completedBy,
        completedAt: allCompleted ? new Date().toISOString() : session.completedAt
      };
    }));
  };

  const startNewSession = (tailNumber: string, sessionType: keyof typeof SESSION_TYPES) => {
    const requiredItems = sessionType === 'quick-turn' 
      ? DEFAULT_CLEANING_ITEMS.filter(item => item.required)
      : DEFAULT_CLEANING_ITEMS;

    const newSession: CleaningSession = {
      id: Date.now().toString(),
      aircraftId: `ac-${Date.now()}`,
      tailNumber,
      sessionType,
      status: 'not-started',
      items: requiredItems.map((item, idx) => ({
        ...item,
        id: `${Date.now()}-${idx}`,
        completed: false
      }))
    };

    setSessions(prev => [...prev, newSession]);
    setShowNewSessionDialog(false);
    toast.success('New cleaning session created', {
      description: `${SESSION_TYPES[sessionType].name} for ${tailNumber}`
    });
  };

  const verifySession = (sessionId: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id !== sessionId) return session;
      
      const allCompleted = session.items.every(item => item.completed);
      if (!allCompleted) {
        toast.error('Cannot verify', {
          description: 'All items must be completed first'
        });
        return session;
      }

      toast.success('Session verified!', {
        description: `${session.tailNumber} cleaning verified by ${currentUser}`
      });

      return {
        ...session,
        status: 'verified' as const,
        verifiedBy: currentUser,
        verifiedAt: new Date().toISOString()
      };
    }));
  };

  const filteredItems = (items: CleaningItem[]) => {
    if (selectedZone === 'all') return items;
    return items.filter(item => item.zone === selectedZone);
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-600" />
            Aircraft Cleaning Status
          </h1>
          <p className="text-gray-600 mt-2">
            Track and manage cleaning status for all Gulfstream G650s
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/aircraft-cleaning/manager-dashboard')}
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Workflow Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowHistoryDialog(true)}
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button onClick={() => navigate('/aircraft-cleaning/new-workflow')}>
            <Plane className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {/* Active Sessions Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {sessions.map(session => {
          const progress = calculateProgress(session.items);
          const requiredItems = session.items.filter(item => item.required);
          const requiredCompleted = requiredItems.filter(item => item.completed).length;
          
          return (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Plane className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {session.tailNumber}
                        <Badge variant="outline">
                          {SESSION_TYPES[session.sessionType].name}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Gulfstream G650
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={session.status === 'verified' ? 'default' : 'secondary'}
                    className={
                      session.status === 'not-started' ? 'bg-gray-100 text-gray-700' :
                      session.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      session.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }
                  >
                    {session.status === 'not-started' ? 'Not Started' :
                     session.status === 'in-progress' ? 'In Progress' :
                     session.status === 'completed' ? 'Completed' :
                     'Verified'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Overall Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {session.items.filter(i => i.completed).length} / {session.items.length} items
                    </span>
                    <span>
                      Required: {requiredCompleted} / {requiredItems.length}
                    </span>
                  </div>
                </div>

                {/* Status Info */}
                {session.startedBy && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>Started by {session.startedBy}</span>
                    {session.startedAt && (
                      <span className="text-gray-400">
                        • {formatDuration(session.startedAt)} ago
                      </span>
                    )}
                  </div>
                )}

                {session.status === 'completed' && session.completedBy && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed by {session.completedBy}</span>
                  </div>
                )}

                {session.status === 'verified' && session.verifiedBy && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verified by {session.verifiedBy}</span>
                  </div>
                )}

                {/* Next Cleaning Due */}
                {session.nextCleaningDue && (
                  <Alert>
                    <Clock className="w-4 h-4" />
                    <AlertDescription>
                      Next cleaning due: {new Date(session.nextCleaningDue).toLocaleDateString()}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedSession(session)}
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    View Checklist
                  </Button>
                  {session.status === 'completed' && (
                    <Button
                      onClick={() => verifySession(session.id)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Verify
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-gray-900 mb-2">No active cleaning sessions</h3>
              <p className="text-gray-500 mb-4">
                Start a new cleaning session to track aircraft cleaning status
              </p>
              <Button onClick={() => setShowNewSessionDialog(true)}>
                <Plane className="w-4 h-4 mr-2" />
                Start New Session
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Detailed Checklist Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Plane className="w-6 h-6" />
              {selectedSession?.tailNumber} - Cleaning Checklist
            </DialogTitle>
            <DialogDescription>
              {SESSION_TYPES[selectedSession?.sessionType || 'quick-turn'].name} • 
              Est. Duration: {SESSION_TYPES[selectedSession?.sessionType || 'quick-turn'].duration}
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6">
              {/* Progress Summary */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Progress</span>
                      <span className="font-medium">
                        {calculateProgress(selectedSession.items)}%
                      </span>
                    </div>
                    <Progress value={calculateProgress(selectedSession.items)} />
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="text-center">
                        <div className="text-2xl">{selectedSession.items.filter(i => i.completed).length}</div>
                        <div className="text-xs text-gray-500">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl">{selectedSession.items.length - selectedSession.items.filter(i => i.completed).length}</div>
                        <div className="text-xs text-gray-500">Remaining</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl">{selectedSession.items.filter(i => i.required).length}</div>
                        <div className="text-xs text-gray-500">Required</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Zone Filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedZone === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedZone('all')}
                >
                  All Items ({selectedSession.items.length})
                </Button>
                {CLEANING_ZONES.map(zone => {
                  const zoneItems = selectedSession.items.filter(item => item.zone === zone.id);
                  const Icon = zone.icon;
                  return (
                    <Button
                      key={zone.id}
                      size="sm"
                      variant={selectedZone === zone.id ? 'default' : 'outline'}
                      onClick={() => setSelectedZone(zone.id)}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {zone.name} ({zoneItems.length})
                    </Button>
                  );
                })}
              </div>

              {/* Checklist Items by Zone */}
              <div className="space-y-4">
                {CLEANING_ZONES
                  .filter(zone => 
                    selectedZone === 'all' || selectedZone === zone.id
                  )
                  .map(zone => {
                    const zoneItems = filteredItems(selectedSession.items)
                      .filter(item => item.zone === zone.id);
                    
                    if (zoneItems.length === 0) return null;

                    const Icon = zone.icon;
                    const completed = zoneItems.filter(item => item.completed).length;
                    
                    return (
                      <Card key={zone.id}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="w-5 h-5" />
                              {zone.name}
                            </div>
                            <Badge variant="secondary">
                              {completed}/{zoneItems.length}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {zoneItems.map(item => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Switch
                                checked={item.completed}
                                onCheckedChange={() => toggleItem(selectedSession.id, item.id)}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={item.completed ? 'line-through text-gray-400' : ''}>
                                    {item.name}
                                  </span>
                                  {item.required && (
                                    <Badge variant="outline" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                {item.completedBy && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                    {item.completedBy} • {new Date(item.completedAt!).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Session Notes (Optional)</Label>
                <Textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Add any notes about this cleaning session..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Session Dialog */}
      <Dialog open={showNewSessionDialog} onOpenChange={setShowNewSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Cleaning Session</DialogTitle>
            <DialogDescription>
              Select aircraft and cleaning type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {['N650GX', 'N650ER', 'N650EX'].map(tail => (
              <Card key={tail} className="p-0 overflow-hidden">
                <CardHeader className="bg-gray-50 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plane className="w-4 h-4" />
                    {tail}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  {(Object.keys(SESSION_TYPES) as Array<keyof typeof SESSION_TYPES>).map(type => (
                    <Button
                      key={type}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => startNewSession(tail, type)}
                    >
                      <span>{SESSION_TYPES[type].name}</span>
                      <span className="text-gray-500">{SESSION_TYPES[type].duration}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Cleaning History
            </DialogTitle>
            <DialogDescription>
              Past cleaning sessions and completion records
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {cleaningHistory.map(record => (
              <Card key={record.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <span>{record.tailNumber}</span>
                        <Badge variant="outline">{record.sessionType}</Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <User className="w-3 h-3 inline mr-1" />
                        {record.completedBy}
                      </div>
                      <div className="text-sm text-gray-500">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(record.completedAt).toLocaleDateString()} at{' '}
                        {new Date(record.completedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {record.duration}
                      </div>
                      <div className="text-sm text-green-600">
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        {record.itemsCompleted}/{record.totalItems} items
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}