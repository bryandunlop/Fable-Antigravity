import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { useMaintenanceContext } from './contexts/MaintenanceContext';
import { 
  Plus, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  User, 
  Calendar,
  Search,
  Filter,
  Download,
  Plane,
  Settings,
  BookOpen,
  PenTool,
  Eye,
  Edit,
  X,
  RefreshCw,
  ClipboardList
} from 'lucide-react';
import { mockTechnicians } from './WorkOrders/mockData';
import { WorkOrder, SubTask } from './WorkOrders/types';
import { createWorkOrderFromSquawk } from './WorkOrders/workOrderUtils';

interface Squawk {
  id: string;
  aircraftId: string;
  aircraftTail: string;
  logbookPage: number;
  reportedBy: string;
  reportedByRole: string;
  reportedAt: Date;
  flightNumber?: string;
  squawkType: 'preflight' | 'inflight' | 'postflight' | 'ground';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'deferred' | 'closed' | 'duplicate';
  ataChapter: string;
  description: string;
  pilotAction?: string;
  maintenanceActions: MaintenanceAction[];
  deferral?: Deferral;
  closedBy?: string;
  closedAt?: Date;
  requiresInspection: boolean;
  partsUsed: PartUsed[];
  attachments: string[];
  category: 'mechanical' | 'electrical' | 'avionics' | 'cabin' | 'exterior' | 'documentation';
  workOrderId?: string; // Link to created work order
}

interface MaintenanceAction {
  id: string;
  technicianName: string;
  technicianId: string;
  actionTaken: string;
  workOrderNumber?: string;
  startTime: Date;
  endTime?: Date;
  inspectedBy?: string;
  signedOff: boolean;
  signOffTime?: Date;
}

interface Deferral {
  melReference: string;
  deferralCategory: 'A' | 'B' | 'C' | 'D';
  expiryDate: Date;
  authorizedBy: string;
  conditions: string;
  operationalLimitations: string[];
}

interface PartUsed {
  partNumber: string;
  serialNumber?: string;
  quantity: number;
  description: string;
  location: string;
}

// Mock data
const mockSquawks: Squawk[] = [
  {
    id: 'SQ001',
    aircraftId: 'AC001',
    aircraftTail: 'N123AB',
    logbookPage: 1247,
    reportedBy: 'Captain Sarah Mitchell',
    reportedByRole: 'pilot',
    reportedAt: new Date('2025-02-05T08:15:00'),
    flightNumber: 'FLT001',
    squawkType: 'preflight',
    priority: 'high',
    status: 'in-progress',
    ataChapter: '32-41-00',
    description: 'Left main landing gear hydraulic leak observed during preflight inspection. Small puddle of fluid under aircraft.',
    pilotAction: 'Aircraft grounded. Maintenance notified.',
    maintenanceActions: [
      {
        id: 'MA001',
        technicianName: 'Mike Johnson',
        technicianId: 'TECH001',
        actionTaken: 'Inspected hydraulic lines. Found loose fitting on actuator. Tightened to specification.',
        workOrderNumber: 'WO-2025-0205',
        startTime: new Date('2025-02-05T09:00:00'),
        endTime: new Date('2025-02-05T10:30:00'),
        signedOff: false
      }
    ],
    requiresInspection: true,
    partsUsed: [],
    attachments: [],
    category: 'mechanical'
  },
  {
    id: 'SQ002',
    aircraftId: 'AC001',
    aircraftTail: 'N123AB',
    logbookPage: 1247,
    reportedBy: 'First Officer James Wilson',
    reportedByRole: 'pilot',
    reportedAt: new Date('2025-02-04T16:45:00'),
    squawkType: 'inflight',
    priority: 'medium',
    status: 'deferred',
    ataChapter: '21-31-00',
    description: 'Cabin temperature control inconsistent. Passengers complained of cold temperatures in rows 8-12.',
    pilotAction: 'Adjusted temperature settings. Issue persisted.',
    maintenanceActions: [
      {
        id: 'MA002',
        technicianName: 'Lisa Chen',
        technicianId: 'TECH002',
        actionTaken: 'Checked ECS system. Temperature sensor in zone 2 reading incorrectly. Sensor requires replacement.',
        startTime: new Date('2025-02-04T18:00:00'),
        signedOff: false
      }
    ],
    deferral: {
      melReference: '21-31-01',
      deferralCategory: 'C',
      expiryDate: new Date('2025-02-14T23:59:59'),
      authorizedBy: 'Chief Mechanic - Tom Davis',
      conditions: 'Manual temperature control acceptable for passenger comfort',
      operationalLimitations: ['Monitor cabin temperature manually', 'Brief crew on manual controls']
    },
    requiresInspection: false,
    partsUsed: [],
    attachments: [],
    category: 'mechanical'
  }
];

const mockAircraft = [
  { id: 'AC001', tail: 'N123AB', type: 'Citation XLS+', status: 'available' },
  { id: 'AC002', tail: 'N456CD', type: 'Phenom 300', status: 'maintenance' },
  { id: 'AC003', tail: 'N789EF', type: 'King Air 350', status: 'flight' }
];

interface TechLogProps {
  userRole: string;
}

export default function TechLog({ userRole }: TechLogProps) {
  // Use MaintenanceContext instead of local state
  const { squawks, addSquawk, updateSquawk, addWorkOrder, createWorkOrderFromSquawks } = useMaintenanceContext();
  
  const [selectedAircraft, setSelectedAircraft] = useState<string>('AC001');
  const [isNewSquawkOpen, setIsNewSquawkOpen] = useState(false);
  const [isMaintenanceActionOpen, setIsMaintenanceActionOpen] = useState(false);
  const [isDeferralOpen, setIsDeferralOpen] = useState(false);
  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);
  const [selectedSquawk, setSelectedSquawk] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newSquawk, setNewSquawk] = useState({
    squawkType: 'preflight',
    priority: 'medium',
    ataChapter: '',
    description: '',
    pilotAction: '',
    category: 'mechanical',
    flightNumber: ''
  });

  const [newMaintenanceAction, setNewMaintenanceAction] = useState({
    actionTaken: '',
    workOrderNumber: '',
    requiresInspection: false
  });

  const [newDeferral, setNewDeferral] = useState({
    melReference: '',
    deferralCategory: 'C',
    expiryDate: '',
    conditions: '',
    operationalLimitations: ''
  });

  const [newWorkOrder, setNewWorkOrder] = useState({
    title: '',
    estimatedHours: 2,
    category: 'minor' as 'minor' | 'major' | 'ancillary',
    type: 'unscheduled' as 'scheduled' | 'unscheduled' | 'aog',
    dueDate: ''
  });

  const getCurrentAircraft = () => {
    return mockAircraft.find(ac => ac.id === selectedAircraft);
  };

  const getFilteredSquawks = () => {
    return squawks
      .filter(squawk => squawk.aircraftId === selectedAircraft)
      .filter(squawk => filterStatus === 'all' || squawk.status === filterStatus)
      .filter(squawk => filterPriority === 'all' || squawk.priority === filterPriority)
      .filter(squawk => 
        searchTerm === '' || 
        squawk.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        squawk.ataChapter.includes(searchTerm) ||
        squawk.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'deferred': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-green-100 text-green-800';
      case 'duplicate': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitSquawk = () => {
    const aircraft = getCurrentAircraft();
    if (!aircraft) return;

    // Use addSquawk from context - it will handle lifecycle, audit trail, and notifications
    addSquawk({
      aircraftId: selectedAircraft,
      aircraftTail: aircraft.tail,
      logbookPage: Math.floor(Math.random() * 1000) + 1200,
      reportedBy: 'Current User',
      reportedByRole: userRole,
      reportedAt: new Date(),
      flightNumber: newSquawk.flightNumber || undefined,
      squawkType: newSquawk.squawkType as any,
      priority: newSquawk.priority as any,
      status: 'open',
      ataChapter: newSquawk.ataChapter,
      description: newSquawk.description,
      pilotAction: newSquawk.pilotAction || undefined,
      maintenanceActions: [],
      requiresInspection: false,
      partsUsed: [],
      attachments: [],
      category: newSquawk.category as any
    });
    
    toast.success('Squawk Reported', {
      description: 'Squawk has been logged and lifecycle tracking initiated'
    });
    
    setIsNewSquawkOpen(false);
    setNewSquawk({
      squawkType: 'preflight',
      priority: 'medium',
      ataChapter: '',
      description: '',
      pilotAction: '',
      category: 'mechanical',
      flightNumber: ''
    });
  };

  const handleAddMaintenanceAction = () => {
    if (!selectedSquawk) return;

    const action: any = {
      id: `MA${String(Date.now())}`,
      technicianName: 'Current User',
      technicianId: 'TECH001',
      actionTaken: newMaintenanceAction.actionTaken,
      workOrderNumber: newMaintenanceAction.workOrderNumber || undefined,
      startTime: new Date(),
      signedOff: false
    };

    // Use updateSquawk from context - it will handle audit trail
    updateSquawk(selectedSquawk.id, {
      status: 'in-progress',
      maintenanceActions: [...selectedSquawk.maintenanceActions, action],
      requiresInspection: newMaintenanceAction.requiresInspection
    });

    setIsMaintenanceActionOpen(false);
    setNewMaintenanceAction({
      actionTaken: '',
      workOrderNumber: '',
      requiresInspection: false
    });
  };

  const handleCreateWorkOrder = () => {
    if (!selectedSquawk) return;

    const aircraft = getCurrentAircraft();

    // Use context to create work order from single squawk
    // This automatically handles lifecycle, parts reservation, document linking, and notifications
    createWorkOrderFromSquawks([selectedSquawk.id], {
      title: newWorkOrder.title || `Repair: ${selectedSquawk.description.substring(0, 50)}${selectedSquawk.description.length > 50 ? '...' : ''}`,
      estimatedHours: newWorkOrder.estimatedHours,
      category: newWorkOrder.category,
      type: newWorkOrder.type,
      dueDate: newWorkOrder.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Hangar 1'
    });

    // Reset and close
    setIsCreateWorkOrderOpen(false);
    setNewWorkOrder({
      title: '',
      estimatedHours: 2,
      category: 'minor',
      type: 'unscheduled',
      dueDate: ''
    });
  };

  const canAddSquawk = () => {
    return ['pilot', 'maintenance', 'admin'].includes(userRole);
  };

  const canPerformMaintenance = () => {
    return ['maintenance', 'admin'].includes(userRole);
  };

  const aircraft = getCurrentAircraft();
  const filteredSquawks = getFilteredSquawks();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Electronic Tech Log
          </h1>
          <p className="text-muted-foreground">Digital aircraft maintenance logbook and squawk tracking</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockAircraft.map((ac) => (
                <SelectItem key={ac.id} value={ac.id}>
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4" />
                    <span>{ac.tail} - {ac.type}</span>
                    <Badge className={
                      ac.status === 'available' ? 'bg-green-100 text-green-800' :
                      ac.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {ac.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canAddSquawk() && (
            <Button onClick={() => setIsNewSquawkOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Report Squawk
            </Button>
          )}
        </div>
      </div>

      {/* Aircraft Info Card */}
      {aircraft && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 rounded-full p-3">
                  <Plane className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">{aircraft.tail} - {aircraft.type}</h3>
                  <p className="text-sm text-muted-foreground">
                    Active Squawks: {filteredSquawks.filter(s => s.status !== 'closed').length} | 
                    Open: {filteredSquawks.filter(s => s.status === 'open').length} | 
                    In Progress: {filteredSquawks.filter(s => s.status === 'in-progress').length} | 
                    Deferred: {filteredSquawks.filter(s => s.status === 'deferred').length}
                  </p>
                </div>
              </div>
              <Badge className={
                aircraft.status === 'available' ? 'bg-green-100 text-green-800' :
                aircraft.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }>
                {aircraft.status.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search squawks by description, ATA chapter, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Squawks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Squawk Log - {aircraft?.tail}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Squawk ID</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ATA Chapter</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSquawks.map((squawk) => (
                  <TableRow key={squawk.id}>
                    <TableCell className="font-medium">{squawk.id}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(squawk.priority)}>
                        {squawk.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge className={getStatusColor(squawk.status)}>
                          {squawk.status.replace('-', ' ').toUpperCase()}
                        </Badge>
                        {squawk.workOrderId && (
                          <Badge variant="outline" className="text-xs">
                            WO Created
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{squawk.ataChapter}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={squawk.description}>
                        {squawk.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{squawk.reportedBy}</div>
                        <div className="text-muted-foreground">{squawk.reportedByRole}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {squawk.reportedAt.toLocaleDateString()}
                        <div className="text-muted-foreground">
                          {squawk.reportedAt.toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSquawk(squawk)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canPerformMaintenance() && squawk.status !== 'closed' && !squawk.workOrderId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSquawk(squawk);
                              setIsCreateWorkOrderOpen(true);
                              setNewWorkOrder({
                                ...newWorkOrder,
                                title: `Repair: ${squawk.description.substring(0, 50)}${squawk.description.length > 50 ? '...' : ''}`,
                                type: squawk.priority === 'critical' ? 'aog' : 'unscheduled',
                                category: squawk.priority === 'critical' || squawk.priority === 'high' ? 'major' : 'minor'
                              });
                            }}
                            title="Create Work Order"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </Button>
                        )}
                        {canPerformMaintenance() && squawk.status !== 'closed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSquawk(squawk);
                              setIsMaintenanceActionOpen(true);
                            }}
                          >
                            <Wrench className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredSquawks.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No squawks found for the current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Squawk Dialog */}
      <Dialog open={isNewSquawkOpen} onOpenChange={setIsNewSquawkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report New Squawk</DialogTitle>
            <DialogDescription>
              Report a maintenance issue for {aircraft?.tail}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Squawk Type</Label>
              <Select value={newSquawk.squawkType} onValueChange={(value) => setNewSquawk({...newSquawk, squawkType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preflight">Preflight</SelectItem>
                  <SelectItem value="inflight">In-flight</SelectItem>
                  <SelectItem value="postflight">Post-flight</SelectItem>
                  <SelectItem value="ground">Ground</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newSquawk.priority} onValueChange={(value) => setNewSquawk({...newSquawk, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ATA Chapter</Label>
              <Input
                value={newSquawk.ataChapter}
                onChange={(e) => setNewSquawk({...newSquawk, ataChapter: e.target.value})}
                placeholder="e.g., 32-41-00"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newSquawk.category} onValueChange={(value) => setNewSquawk({...newSquawk, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="avionics">Avionics</SelectItem>
                  <SelectItem value="cabin">Cabin</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Flight Number (Optional)</Label>
              <Input
                value={newSquawk.flightNumber}
                onChange={(e) => setNewSquawk({...newSquawk, flightNumber: e.target.value})}
                placeholder="e.g., FLT001"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={newSquawk.description}
                onChange={(e) => setNewSquawk({...newSquawk, description: e.target.value})}
                placeholder="Detailed description of the issue..."
                rows={3}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Pilot Action Taken (Optional)</Label>
              <Textarea
                value={newSquawk.pilotAction}
                onChange={(e) => setNewSquawk({...newSquawk, pilotAction: e.target.value})}
                placeholder="Actions taken by flight crew..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewSquawkOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitSquawk}
              disabled={!newSquawk.description || !newSquawk.ataChapter}
            >
              Submit Squawk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Action Dialog */}
      <Dialog open={isMaintenanceActionOpen} onOpenChange={setIsMaintenanceActionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Maintenance Action</DialogTitle>
            <DialogDescription>
              Record maintenance action for Squawk {selectedSquawk?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Work Order Number (Optional)</Label>
              <Input
                value={newMaintenanceAction.workOrderNumber}
                onChange={(e) => setNewMaintenanceAction({...newMaintenanceAction, workOrderNumber: e.target.value})}
                placeholder="WO-2025-0205"
              />
            </div>

            <div className="space-y-2">
              <Label>Action Taken</Label>
              <Textarea
                value={newMaintenanceAction.actionTaken}
                onChange={(e) => setNewMaintenanceAction({...newMaintenanceAction, actionTaken: e.target.value})}
                placeholder="Detailed description of maintenance action performed..."
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="requiresInspection"
                checked={newMaintenanceAction.requiresInspection}
                onChange={(e) => setNewMaintenanceAction({...newMaintenanceAction, requiresInspection: e.target.checked})}
              />
              <Label htmlFor="requiresInspection">Requires inspection before return to service</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaintenanceActionOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddMaintenanceAction}
              disabled={!newMaintenanceAction.actionTaken}
            >
              Add Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Work Order Dialog */}
      <Dialog open={isCreateWorkOrderOpen} onOpenChange={setIsCreateWorkOrderOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Work Order from Squawk</DialogTitle>
            <DialogDescription>
              Create a work order for Squawk {selectedSquawk?.id} - {selectedSquawk?.aircraftTail}
            </DialogDescription>
          </DialogHeader>

          {selectedSquawk && (
            <div className="space-y-4">
              {/* Squawk Summary */}
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Squawk Details:</div>
                    <div className="text-sm">{selectedSquawk.description}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getPriorityColor(selectedSquawk.priority)}>
                        {selectedSquawk.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">ATA: {selectedSquawk.ataChapter}</Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Work Order Title</Label>
                  <Input
                    value={newWorkOrder.title}
                    onChange={(e) => setNewWorkOrder({...newWorkOrder, title: e.target.value})}
                    placeholder="Brief title for the work order"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Work Order Type</Label>
                  <Select value={newWorkOrder.type} onValueChange={(value: any) => setNewWorkOrder({...newWorkOrder, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="unscheduled">Unscheduled</SelectItem>
                      <SelectItem value="aog">AOG (Aircraft on Ground)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newWorkOrder.category} onValueChange={(value: any) => setNewWorkOrder({...newWorkOrder, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="ancillary">Ancillary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Hours</Label>
                  <Input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={newWorkOrder.estimatedHours}
                    onChange={(e) => setNewWorkOrder({...newWorkOrder, estimatedHours: parseFloat(e.target.value) || 0})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newWorkOrder.dueDate}
                    onChange={(e) => setNewWorkOrder({...newWorkOrder, dueDate: e.target.value})}
                  />
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="text-sm">
                    <strong>Note:</strong> The work order will be created with status "Pending" and can be assigned to technicians from the Work Orders or Maintenance Dashboard.
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateWorkOrderOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkOrder}
              disabled={!newWorkOrder.title}
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Create Work Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Squawk Details Dialog */}
      <Dialog open={!!selectedSquawk && !isMaintenanceActionOpen && !isCreateWorkOrderOpen} onOpenChange={() => setSelectedSquawk(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedSquawk && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Squawk Details - {selectedSquawk.id}
                </DialogTitle>
                <DialogDescription>
                  {selectedSquawk.aircraftTail} | Logbook Page {selectedSquawk.logbookPage}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Squawk Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Priority:</span>
                          <Badge className={getPriorityColor(selectedSquawk.priority)}>
                            {selectedSquawk.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge className={getStatusColor(selectedSquawk.status)}>
                            {selectedSquawk.status.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ATA Chapter:</span>
                          <span className="font-mono">{selectedSquawk.ataChapter}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Category:</span>
                          <span>{selectedSquawk.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span>{selectedSquawk.squawkType}</span>
                        </div>
                        {selectedSquawk.flightNumber && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Flight:</span>
                            <span>{selectedSquawk.flightNumber}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Reported By</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{selectedSquawk.reportedBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{selectedSquawk.reportedByRole}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>{selectedSquawk.reportedAt.toLocaleString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap">{selectedSquawk.description}</p>
                      {selectedSquawk.pilotAction && (
                        <>
                          <hr className="my-4" />
                          <div>
                            <Label className="text-sm text-muted-foreground">Pilot Action Taken:</Label>
                            <p className="mt-1 whitespace-pre-wrap">{selectedSquawk.pilotAction}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {selectedSquawk.deferral && (
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="w-5 h-5 text-yellow-600" />
                          Deferral Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">MEL Reference:</Label>
                            <p className="font-mono">{selectedSquawk.deferral.melReference}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Category:</Label>
                            <Badge className="ml-2">{selectedSquawk.deferral.deferralCategory}</Badge>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Expires:</Label>
                            <p>{selectedSquawk.deferral.expiryDate.toLocaleString()}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Authorized By:</Label>
                            <p>{selectedSquawk.deferral.authorizedBy}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Conditions:</Label>
                          <p className="mt-1">{selectedSquawk.deferral.conditions}</p>
                        </div>
                        {selectedSquawk.deferral.operationalLimitations.length > 0 && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Operational Limitations:</Label>
                            <ul className="mt-1 list-disc list-inside space-y-1">
                              {selectedSquawk.deferral.operationalLimitations.map((limitation, index) => (
                                <li key={index}>{limitation}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="maintenance" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Maintenance Actions</h3>
                    {canPerformMaintenance() && selectedSquawk.status !== 'closed' && (
                      <Button 
                        size="sm"
                        onClick={() => setIsMaintenanceActionOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Action
                      </Button>
                    )}
                  </div>

                  {selectedSquawk.maintenanceActions.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No maintenance actions recorded yet.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {selectedSquawk.maintenanceActions.map((action, index) => (
                        <Card key={action.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Action #{index + 1}</Badge>
                                {action.workOrderNumber && (
                                  <Badge variant="outline">WO: {action.workOrderNumber}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {action.signedOff ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Clock className="w-5 h-5 text-yellow-600" />
                                )}
                                <span className="text-sm">
                                  {action.signedOff ? 'Signed Off' : 'Pending Sign-off'}
                                </span>
                              </div>
                            </div>
                            
                            <p className="mb-3 whitespace-pre-wrap">{action.actionTaken}</p>
                            
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center gap-4">
                                <span>Technician: {action.technicianName}</span>
                                <span>Started: {action.startTime.toLocaleString()}</span>
                                {action.endTime && (
                                  <span>Completed: {action.endTime.toLocaleString()}</span>
                                )}
                              </div>
                              {!action.signedOff && canPerformMaintenance() && (
                                <Button size="sm" variant="outline">
                                  <PenTool className="w-4 h-4 mr-2" />
                                  Sign Off
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Activity History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b">
                          <div className="bg-blue-100 rounded-full p-2">
                            <Plus className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Squawk Reported</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedSquawk.reportedBy} reported this issue
                            </p>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {selectedSquawk.reportedAt.toLocaleString()}
                          </span>
                        </div>

                        {selectedSquawk.maintenanceActions.map((action, index) => (
                          <div key={action.id} className="flex items-center gap-3 pb-3 border-b">
                            <div className="bg-orange-100 rounded-full p-2">
                              <Wrench className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Maintenance Action #{index + 1}</p>
                              <p className="text-sm text-muted-foreground">
                                {action.technicianName} performed maintenance
                              </p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {action.startTime.toLocaleString()}
                            </span>
                          </div>
                        ))}

                        {selectedSquawk.deferral && (
                          <div className="flex items-center gap-3 pb-3 border-b">
                            <div className="bg-yellow-100 rounded-full p-2">
                              <Clock className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Item Deferred</p>
                              <p className="text-sm text-muted-foreground">
                                Deferred under MEL {selectedSquawk.deferral.melReference}
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedSquawk.status === 'closed' && (
                          <div className="flex items-center gap-3">
                            <div className="bg-green-100 rounded-full p-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Squawk Closed</p>
                              <p className="text-sm text-muted-foreground">
                                {selectedSquawk.closedBy} closed this squawk
                              </p>
                            </div>
                            {selectedSquawk.closedAt && (
                              <span className="text-sm text-muted-foreground">
                                {selectedSquawk.closedAt.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}