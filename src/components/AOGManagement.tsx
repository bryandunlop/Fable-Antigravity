import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from "sonner";
import {
  AlertTriangle,
  Plus,
  Send,
  Paperclip,
  Image,
  Clock,
  Users,
  Plane,
  MessageSquare,
  Bell,
  CheckCircle,
  XCircle,
  Settings,
  Calendar,
  Mail,
  Phone,
  AlertCircle,
  Activity,
  FileText,
  Camera,
  Edit,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Timer,
  MapPin,
  Wrench,
  User,
  Building,
  Shield
} from 'lucide-react';

interface AOGIncident {
  id: string;
  flightNumber: string;
  aircraft: {
    registration: string;
    type: string;
    location: string;
  };
  status: 'Active' | 'Resolved' | 'In Progress' | 'Escalated';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  initiatedBy: string;
  initiatedAt: Date;
  estimatedResolution?: Date;
  assignedTeams: string[];
  assignedIndividuals: string[];
  updates: AOGUpdate[];
  attachments: AOGAttachment[];
  chatMessages: ChatMessage[];
  reminderInterval: number; // minutes
  lastReminder?: Date;
}

interface AOGUpdate {
  id: string;
  timestamp: Date;
  author: string;
  type: 'status' | 'info' | 'escalation' | 'resolution';
  content: string;
  attachments?: string[];
}

interface AOGAttachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  size: string;
}

interface ChatMessage {
  id: string;
  timestamp: Date;
  author: string;
  content: string;
  type: 'message' | 'system' | 'update';
  attachments?: AOGAttachment[];
}

export default function AOGManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [aogIncidents, setAOGIncidents] = useState<AOGIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<AOGIncident | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [newUpdate, setNewUpdate] = useState('');

  // Mock data for initial incidents
  useEffect(() => {
    const mockIncidents: AOGIncident[] = [
      {
        id: 'AOG-001',
        flightNumber: 'PJ 1001',
        aircraft: {
          registration: 'N1PG',
          type: 'Gulfstream G650',
          location: 'KBOS - Boston Logan'
        },
        status: 'Active',
        priority: 'High',
        description: 'Left engine oil pressure warning light illuminated during preflight. Oil level appears normal but pressure reading is inconsistent.',
        initiatedBy: 'Captain Sarah Mitchell',
        initiatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        estimatedResolution: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        assignedTeams: ['Maintenance', 'Scheduling', 'Safety'],
        assignedIndividuals: ['Mike Johnson - Lead Mechanic', 'Lisa Chen - Parts Manager'],
        reminderInterval: 30,
        updates: [
          {
            id: 'update-1',
            timestamp: new Date(Date.now() - 90 * 60 * 1000),
            author: 'Mike Johnson',
            type: 'info',
            content: 'Initial inspection completed. Oil pressure sensor appears to be faulty. Ordering replacement part.'
          },
          {
            id: 'update-2',
            timestamp: new Date(Date.now() - 45 * 60 * 1000),
            author: 'Lisa Chen',
            type: 'status',
            content: 'Replacement oil pressure sensor ordered. ETA 2 hours. Part number: CJ3-OPS-4472'
          }
        ],
        attachments: [
          {
            id: 'att-1',
            name: 'Engine_Warning_Light.jpg',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400&h=300&fit=crop',
            uploadedBy: 'Captain Sarah Mitchell',
            uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            size: '2.3 MB'
          }
        ],
        chatMessages: [
          {
            id: 'msg-1',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            author: 'Captain Sarah Mitchell',
            content: 'AOG initiated for oil pressure warning. Need immediate maintenance assessment.',
            type: 'message'
          },
          {
            id: 'msg-2',
            timestamp: new Date(Date.now() - 90 * 60 * 1000),
            author: 'Mike Johnson',
            content: 'En route to aircraft. ETA 15 minutes.',
            type: 'message'
          },
          {
            id: 'msg-3',
            timestamp: new Date(Date.now() - 75 * 60 * 1000),
            author: 'System',
            content: 'Maintenance team has been notified and acknowledged the AOG.',
            type: 'system'
          }
        ]
      },
      {
        id: 'AOG-002',
        flightNumber: 'PJ 1003',
        aircraft: {
          registration: 'N2PG',
          type: 'Gulfstream G650',
          location: 'KDCA - Washington Reagan'
        },
        status: 'In Progress',
        priority: 'Medium',
        description: 'Cabin door handle mechanism sticking. Door can be opened but requires excessive force.',
        initiatedBy: 'Emma Davis',
        initiatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        assignedTeams: ['Maintenance'],
        assignedIndividuals: ['David Brown - Avionics Tech'],
        reminderInterval: 60,
        updates: [
          {
            id: 'update-3',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
            author: 'David Brown',
            type: 'info',
            content: 'Door mechanism lubricated and adjusted. Testing door operation cycles.'
          }
        ],
        attachments: [],
        chatMessages: [
          {
            id: 'msg-4',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            author: 'Emma Davis',
            content: 'Cabin door is difficult to operate. May need lubrication or adjustment.',
            type: 'message'
          }
        ]
      }
    ];
    setAOGIncidents(mockIncidents);
  }, []);

  // Mock flights for selection
  const availableFlights = [
    { id: 'PJ1001', number: 'PJ 1001', aircraft: 'N1PG - Gulfstream G650', route: 'KBOS → KMIA' },
    { id: 'PJ1002', number: 'PJ 1002', aircraft: 'N5PG - Gulfstream G500', route: 'KTEB → KORD' },
    { id: 'PJ1003', number: 'PJ 1003', aircraft: 'N2PG - Gulfstream G650', route: 'KDCA → KATL' },
    { id: 'PJ1004', number: 'PJ 1004', aircraft: 'N6PG - Gulfstream G500', route: 'KLAS → KJFK' },
    { id: 'PJ1005', number: 'PJ 1005', aircraft: 'N1PG - Gulfstream G650', route: 'KPHX → KDEN' }
  ];

  // Mock teams and individuals
  const availableTeams = [
    'Maintenance',
    'Scheduling',
    'Safety',
    'Operations',
    'Dispatch',
    'Ground Services'
  ];

  const availableIndividuals = [
    'Mike Johnson - Lead Mechanic',
    'Lisa Chen - Parts Manager',
    'David Brown - Avionics Tech',
    'Sarah Williams - Inspector',
    'Tom Anderson - Scheduler',
    'Jennifer Lopez - Safety Officer',
    'Robert Smith - Operations Manager',
    'Amy Taylor - Dispatcher'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-red-100 text-red-800 border-red-200';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Escalated': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCreateAOG = () => {
    toast.success("AOG Created", {
      description: "New AOG incident has been created and notifications sent to all assigned personnel."
    });
    setShowCreateDialog(false);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedIncident) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      author: 'Current User',
      content: newMessage,
      type: 'message'
    };

    setAOGIncidents(prev =>
      prev.map(incident =>
        incident.id === selectedIncident.id
          ? { ...incident, chatMessages: [...incident.chatMessages, message] }
          : incident
      )
    );

    setNewMessage('');
    toast.success("Message sent");
  };

  const handleAddUpdate = () => {
    if (!newUpdate.trim() || !selectedIncident) return;

    const update: AOGUpdate = {
      id: `update-${Date.now()}`,
      timestamp: new Date(),
      author: 'Current User',
      type: 'info',
      content: newUpdate
    };

    setAOGIncidents(prev =>
      prev.map(incident =>
        incident.id === selectedIncident.id
          ? { ...incident, updates: [...incident.updates, update] }
          : incident
      )
    );

    setNewUpdate('');
    toast.success("Update added");
  };

  const CreateAOGDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create AOG
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New AOG Incident</DialogTitle>
          <DialogDescription>
            Report an aircraft issue and notify the appropriate teams
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flight">Flight Selection</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select flight" />
                </SelectTrigger>
                <SelectContent>
                  {availableFlights.map(flight => (
                    <SelectItem key={flight.id} value={flight.id}>
                      <div className="flex flex-col">
                        <span>{flight.number}</span>
                        <span className="text-sm text-muted-foreground">{flight.aircraft}</span>
                        <span className="text-xs text-muted-foreground">{flight.route}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Issue Description</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed description of the issue..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label>Notify Teams</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableTeams.map(team => (
                  <div key={team} className="flex items-center space-x-2">
                    <input type="checkbox" id={team} className="rounded" />
                    <Label htmlFor={team} className="text-sm">{team}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Notify Individuals</Label>
              <div className="space-y-2 mt-2">
                {availableIndividuals.map(individual => (
                  <div key={individual} className="flex items-center space-x-2">
                    <input type="checkbox" id={individual} className="rounded" />
                    <Label htmlFor={individual} className="text-sm">{individual}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder">Reminder Interval (minutes)</Label>
            <Select defaultValue="30">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
                <SelectItem value="120">Every 2 hours</SelectItem>
                <SelectItem value="240">Every 4 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Attach Photos/Documents</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload photos or drag and drop</p>
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={handleCreateAOG} className="flex-1">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Create AOG & Send Notifications
            </Button>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const AOGDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1>AOG Management</h1>
          <p className="text-muted-foreground">Monitor and manage aircraft on ground incidents</p>
        </div>
        <CreateAOGDialog />
      </div>

      {/* AOG Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Active AOGs</p>
                <p className="text-2xl font-bold">
                  {aogIncidents.filter(i => i.status === 'Active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {aogIncidents.filter(i => i.status === 'In Progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Resolved Today</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Timer className="w-8 h-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-muted-foreground">Avg Resolution</p>
                <p className="text-2xl font-bold">4.2h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active AOG Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Current AOG Incidents</CardTitle>
          <CardDescription>All active and in-progress aircraft issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aogIncidents.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3>No Active AOGs</h3>
                <p className="text-muted-foreground">All aircraft are operational</p>
              </div>
            ) : (
              aogIncidents.map(incident => (
                <Card key={incident.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedIncident(incident);
                    setActiveTab('details');
                  }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className={getPriorityColor(incident.priority)}>
                            {incident.priority}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(incident.status)}>
                            {incident.status}
                          </Badge>
                          <span className="font-medium">{incident.id}</span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Plane className="w-4 h-4 mr-1" />
                            {incident.flightNumber} - {incident.aircraft.registration}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {incident.aircraft.location}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {incident.initiatedAt.toLocaleTimeString()}
                          </div>
                        </div>

                        <p className="text-sm">{incident.description}</p>

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Initiated by: {incident.initiatedBy}</span>
                          <span>Teams: {incident.assignedTeams.join(', ')}</span>
                          <span>Updates: {incident.updates.length}</span>
                          <span>Messages: {incident.chatMessages.length}</span>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        {incident.estimatedResolution && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">ETA Resolution:</span>
                            <div>{incident.estimatedResolution.toLocaleTimeString()}</div>
                          </div>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const AOGDetails = () => {
    if (!selectedIncident) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3>No AOG Selected</h3>
          <p className="text-muted-foreground">Select an AOG incident from the dashboard to view details</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1>{selectedIncident.id}</h1>
              <Badge variant="outline" className={getPriorityColor(selectedIncident.priority)}>
                {selectedIncident.priority}
              </Badge>
              <Badge variant="outline" className={getStatusColor(selectedIncident.status)}>
                {selectedIncident.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{selectedIncident.flightNumber} - {selectedIncident.aircraft.registration}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Status
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="attachments">Files</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Incident Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm mt-1">{selectedIncident.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Aircraft</Label>
                      <p className="text-sm mt-1">{selectedIncident.aircraft.registration} - {selectedIncident.aircraft.type}</p>
                    </div>
                    <div>
                      <Label>Location</Label>
                      <p className="text-sm mt-1">{selectedIncident.aircraft.location}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Initiated By</Label>
                      <p className="text-sm mt-1">{selectedIncident.initiatedBy}</p>
                    </div>
                    <div>
                      <Label>Initiated At</Label>
                      <p className="text-sm mt-1">{selectedIncident.initiatedAt.toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedIncident.estimatedResolution && (
                    <div>
                      <Label>Estimated Resolution</Label>
                      <p className="text-sm mt-1">{selectedIncident.estimatedResolution.toLocaleString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assigned Personnel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Teams</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedIncident.assignedTeams.map(team => (
                        <Badge key={team} variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {team}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Individuals</Label>
                    <div className="space-y-2 mt-2">
                      {selectedIncident.assignedIndividuals.map(individual => (
                        <div key={individual} className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{individual}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Reminder Settings</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Every {selectedIncident.reminderInterval} minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Add Status Update</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    placeholder="Provide an update on the AOG status..."
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Paperclip className="w-4 h-4 mr-2" />
                        Attach File
                      </Button>
                      <Button variant="outline" size="sm">
                        <Camera className="w-4 h-4 mr-2" />
                        Add Photo
                      </Button>
                    </div>
                    <Button onClick={handleAddUpdate} disabled={!newUpdate.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Add Update
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Communication</CardTitle>
                <CardDescription>Real-time chat for AOG incident coordination</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 mb-4">
                  <div className="space-y-4">
                    {selectedIncident.chatMessages.map(message => (
                      <div key={message.id} className={`flex ${message.type === 'system' ? 'justify-center' : 'justify-start'}`}>
                        {message.type === 'system' ? (
                          <div className="bg-muted p-2 rounded-md text-sm text-center max-w-md">
                            <Clock className="w-4 h-4 inline mr-2" />
                            {message.content}
                          </div>
                        ) : (
                          <div className="flex space-x-3 max-w-md">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback>{message.author.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="bg-muted p-3 rounded-lg flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{message.author}</span>
                                <span className="text-xs text-muted-foreground">
                                  {message.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm">{message.content}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Files & Photos</CardTitle>
                <CardDescription>Documents and images related to this AOG incident</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedIncident.attachments.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No files attached</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedIncident.attachments.map(attachment => (
                        <Card key={attachment.id}>
                          <CardContent className="p-4">
                            {attachment.type === 'image' ? (
                              <div className="space-y-2">
                                <ImageWithFallback
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="w-full h-32 object-cover rounded"
                                />
                                <div>
                                  <p className="font-medium text-sm">{attachment.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {attachment.size} • {attachment.uploadedBy} • {attachment.uploadedAt.toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <Button size="sm" variant="outline">
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </Button>
                                  <Button size="sm" variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-8 h-8 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-sm">{attachment.name}</p>
                                    <p className="text-xs text-muted-foreground">{attachment.size}</p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {attachment.uploadedBy} • {attachment.uploadedAt.toLocaleString()}
                                </p>
                                <Button size="sm" variant="outline">
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label>Upload New Files</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <input type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" />
                      <Button variant="outline" size="sm" className="mt-2">
                        Select Files
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AOG Timeline</CardTitle>
                <CardDescription>Chronological history of all updates and communications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Incident Creation */}
                  <div className="flex space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                      <div className="w-px h-12 bg-border"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h4>AOG Incident Created</h4>
                        <span className="text-sm text-muted-foreground">
                          {selectedIncident.initiatedAt.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created by {selectedIncident.initiatedBy}
                      </p>
                      <p className="text-sm mt-2">{selectedIncident.description}</p>
                    </div>
                  </div>

                  {/* Updates */}
                  {selectedIncident.updates.map((update, index) => (
                    <div key={update.id} className="flex space-x-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Activity className="w-4 h-4 text-white" />
                        </div>
                        {index < selectedIncident.updates.length - 1 && (
                          <div className="w-px h-12 bg-border"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <h4>Status Update</h4>
                          <span className="text-sm text-muted-foreground">
                            {update.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          By {update.author}
                        </p>
                        <p className="text-sm mt-2">{update.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">AOG Dashboard</TabsTrigger>
          <TabsTrigger value="details">Incident Details</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AOGDashboard />
        </TabsContent>

        <TabsContent value="details">
          <AOGDetails />
        </TabsContent>
      </Tabs>
    </div>
  );
}