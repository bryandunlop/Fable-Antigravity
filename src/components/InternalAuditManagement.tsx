import React, { useState } from 'react';
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
import { Checkbox } from './ui/checkbox';
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  Shuffle,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

export default function InternalAuditManagement() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewAuditDialog, setShowNewAuditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [selectedRole, setSelectedRole] = useState('All Roles');

  // Mock data - in real app this would come from backend
  const audits = [
    {
      id: 'AUD-001',
      title: 'Monthly Safety Audit - February 2024',
      type: 'Scheduled',
      category: 'Safety Management',
      status: 'In Progress',
      priority: 'High',
      scheduledDate: '2024-02-15',
      dueDate: '2024-02-28',
      assignedTo: 'Sarah Wilson',
      assignedRole: 'Safety',
      assignmentType: 'Manual',
      description: 'Comprehensive monthly safety audit covering all operational areas',
      checklist: [
        { id: 1, item: 'Review incident reports from previous month', completed: true },
        { id: 2, item: 'Inspect emergency equipment', completed: true },
        { id: 3, item: 'Verify crew training records', completed: false },
        { id: 4, item: 'Check fuel handling procedures', completed: false },
        { id: 5, item: 'Review maintenance compliance', completed: false }
      ],
      findings: [],
      completionRate: 40
    },
    {
      id: 'AUD-002',
      title: 'Ground Operations Audit',
      type: 'Ad-hoc',
      category: 'Ground Operations',
      status: 'Scheduled',
      priority: 'Medium',
      scheduledDate: '2024-02-20',
      dueDate: '2024-02-25',
      assignedTo: 'Mike Johnson',
      assignedRole: 'Pilot',
      assignmentType: 'Random (Pilot)',
      description: 'Audit of ground handling procedures and equipment maintenance',
      checklist: [
        { id: 6, item: 'Inspect ground support equipment', completed: false },
        { id: 7, item: 'Review baggage handling procedures', completed: false },
        { id: 8, item: 'Check aircraft positioning protocols', completed: false },
        { id: 9, item: 'Verify safety zone compliance', completed: false }
      ],
      findings: [],
      completionRate: 0
    },
    {
      id: 'AUD-003',
      title: 'Document Control Audit',
      type: 'Compliance',
      category: 'Documentation',
      status: 'Complete',
      priority: 'Low',
      scheduledDate: '2024-01-30',
      dueDate: '2024-02-05',
      assignedTo: 'Emily Davis',
      assignedRole: 'Document Manager',
      assignmentType: 'Random (Any)',
      description: 'Audit of document management and version control processes',
      checklist: [
        { id: 10, item: 'Verify document version control', completed: true },
        { id: 11, item: 'Check distribution records', completed: true },
        { id: 12, item: 'Review archive procedures', completed: true },
        { id: 13, item: 'Validate electronic signatures', completed: true }
      ],
      findings: [
        { id: 1, description: 'Minor discrepancy in version numbering', severity: 'Low', status: 'Resolved' },
        { id: 2, description: 'Distribution list needs updating', severity: 'Medium', status: 'Open' }
      ],
      completionRate: 100
    },
    {
      id: 'AUD-004',
      title: 'Maintenance Quality Assurance Review',
      type: 'Scheduled',
      category: 'Maintenance',
      status: 'Scheduled',
      priority: 'High',
      scheduledDate: '2024-02-25',
      dueDate: '2024-03-05',
      assignedTo: 'Robert Martinez',
      assignedRole: 'Maintenance',
      assignmentType: 'Random (Maintenance)',
      description: 'Review maintenance procedures and quality assurance processes',
      checklist: [
        { id: 14, item: 'Review maintenance logs and records', completed: false },
        { id: 15, item: 'Inspect tool calibration records', completed: false },
        { id: 16, item: 'Check parts inventory management', completed: false },
        { id: 17, item: 'Verify mechanic certifications', completed: false },
        { id: 18, item: 'Review work order completion', completed: false }
      ],
      findings: [],
      completionRate: 0
    }
  ];

  // Auditors with role information
  const auditorsPool = [
    { name: 'Sarah Wilson', role: 'Safety' },
    { name: 'Mike Johnson', role: 'Pilot' },
    { name: 'Emily Davis', role: 'Document Manager' },
    { name: 'David Brown', role: 'Maintenance' },
    { name: 'Lisa Chen', role: 'Safety' },
    { name: 'Tom Anderson', role: 'Pilot' },
    { name: 'Jennifer Lee', role: 'Inflight' },
    { name: 'Robert Martinez', role: 'Maintenance' },
    { name: 'Amanda Foster', role: 'Safety' },
    { name: 'Chris Taylor', role: 'Admin' }
  ];

  const roles = ['All Roles', 'Safety', 'Pilot', 'Inflight', 'Maintenance', 'Document Manager', 'Admin'];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAudits = audits.filter(audit => {
    const matchesFilter = filter === 'all' || audit.status.toLowerCase().replace(' ', '') === filter;
    const matchesSearch = audit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRandomAssignment = (byRole = false) => {
    let availableAuditors = auditorsPool;
    
    // Filter by role if a specific role is selected
    if (byRole && selectedRole !== 'All Roles') {
      availableAuditors = auditorsPool.filter(auditor => auditor.role === selectedRole);
    }
    
    if (availableAuditors.length === 0) {
      toast.error(`No auditors available for role: ${selectedRole}`);
      return;
    }
    
    const randomAuditor = availableAuditors[Math.floor(Math.random() * availableAuditors.length)];
    const roleInfo = byRole && selectedRole !== 'All Roles' ? ` (${selectedRole} role)` : '';
    toast.success(`Audit randomly assigned to ${randomAuditor.name}${roleInfo}`);
    setShowAssignDialog(false);
  };

  const handleManualAssignment = (auditorName: string, auditorRole: string) => {
    toast.success(`Audit manually assigned to ${auditorName} (${auditorRole})`);
    setShowAssignDialog(false);
  };

  // Get auditors filtered by selected role
  const getFilteredAuditors = () => {
    if (selectedRole === 'All Roles') {
      return auditorsPool;
    }
    return auditorsPool.filter(auditor => auditor.role === selectedRole);
  };

  const generateAuditReport = (auditId: string) => {
    toast.success(`Generating PDF report for audit ${auditId}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            <Target className="w-6 h-6" />
            Internal Audit Management
          </h1>
          <p className="text-muted-foreground">Schedule, assign, and track internal audits</p>
        </div>
        
        <div className="flex gap-2 mt-4 lg:mt-0">
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserCheck className="w-4 h-4 mr-2" />
                Assign Auditor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Auditor</DialogTitle>
                <DialogDescription>
                  Assign an auditor to perform internal audit tasks. Choose random assignment (all or by role) or select manually.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Random Assignment Options */}
                <div className="space-y-3">
                  <Button onClick={() => handleRandomAssignment(false)} className="w-full">
                    <Shuffle className="w-4 h-4 mr-2" />
                    Random Assignment (Any Role)
                  </Button>
                  
                  <div className="space-y-2">
                    <Label>Random by Role</Label>
                    <div className="flex gap-2">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        onClick={() => handleRandomAssignment(true)}
                        disabled={selectedRole === 'All Roles'}
                        variant="outline"
                      >
                        <Shuffle className="w-4 h-4" />
                      </Button>
                    </div>
                    {selectedRole !== 'All Roles' && (
                      <p className="text-xs text-muted-foreground">
                        {getFilteredAuditors().length} auditor(s) available in {selectedRole} role
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or select manually
                    </span>
                  </div>
                </div>

                {/* Manual Selection */}
                <div className="space-y-2">
                  <Label>Filter by Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getFilteredAuditors().map((auditor) => (
                    <Button
                      key={auditor.name}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleManualAssignment(auditor.name, auditor.role)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{auditor.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {auditor.role}
                      </Badge>
                    </Button>
                  ))}
                </div>

                {getFilteredAuditors().length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      No auditors available for selected role
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewAuditDialog} onOpenChange={setShowNewAuditDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule New Audit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Audit</DialogTitle>
                <DialogDescription>
                  Create and schedule a new internal audit with checklist items and assignments.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Audit Title</Label>
                    <Input placeholder="Brief description of audit" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select audit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="ad-hoc">Ad-hoc</SelectItem>
                        <SelectItem value="compliance">Compliance</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safety-management">Safety Management</SelectItem>
                        <SelectItem value="ground-operations">Ground Operations</SelectItem>
                        <SelectItem value="flight-operations">Flight Operations</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="documentation">Documentation</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scheduled Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Detailed description of the audit scope" rows={3} />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={() => {
                    toast.success('Audit scheduled successfully');
                    setShowNewAuditDialog(false);
                  }}>
                    Schedule Audit
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewAuditDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl">
                  {audits.filter(a => a.status === 'Scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl">
                  {audits.filter(a => a.status === 'In Progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Complete</p>
                <p className="text-2xl">
                  {audits.filter(a => a.status === 'Complete').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl">
                  {audits.filter(a => a.status === 'Overdue').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title, ID, or auditor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="inprogress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Audits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.id}</TableCell>
                    <TableCell className="max-w-xs truncate">{audit.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{audit.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(audit.priority)}>
                        {audit.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(audit.status)}>
                        {audit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {audit.assignedTo}
                        </div>
                        {audit.assignedRole && (
                          <Badge variant="secondary" className="text-xs w-fit">
                            {audit.assignedRole}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          audit.assignmentType.includes('Random') 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }
                      >
                        {audit.assignmentType.includes('Random') ? (
                          <Shuffle className="w-3 h-3 mr-1" />
                        ) : (
                          <User className="w-3 h-3 mr-1" />
                        )}
                        {audit.assignmentType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(audit.dueDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-sm">{audit.completionRate}%</div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${audit.completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedAudit(audit)}>
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Audit Management - {audit.id}</DialogTitle>
                              <DialogDescription>
                                Manage audit checklist items, progress, and findings for this audit.
                              </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="checklist">
                              <TabsList>
                                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                                <TabsTrigger value="findings">Findings</TabsTrigger>
                                <TabsTrigger value="details">Details</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="checklist" className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <h3>Audit Checklist</h3>
                                  <div className="text-sm text-muted-foreground">
                                    Progress: {audit.completionRate}%
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  {audit.checklist.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                      <Checkbox checked={item.completed} />
                                      <div className="flex-1">
                                        <p className={item.completed ? 'line-through text-muted-foreground' : ''}>
                                          {item.item}
                                        </p>
                                      </div>
                                      {item.completed && (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="findings" className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <h3>Audit Findings</h3>
                                  <Button size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Finding
                                  </Button>
                                </div>
                                
                                {audit.findings.length > 0 ? (
                                  <div className="space-y-3">
                                    {audit.findings.map((finding) => (
                                      <div key={finding.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="font-medium">{finding.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                              <Badge className={getPriorityColor(finding.severity)}>
                                                {finding.severity}
                                              </Badge>
                                              <Badge className={getStatusColor(finding.status)}>
                                                {finding.status}
                                              </Badge>
                                            </div>
                                          </div>
                                          <Button variant="outline" size="sm">
                                            Edit
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No findings recorded yet</p>
                                  </div>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="details" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Title</Label>
                                    <p className="font-medium">{audit.title}</p>
                                  </div>
                                  <div>
                                    <Label>Type</Label>
                                    <Badge variant="outline">{audit.type}</Badge>
                                  </div>
                                  <div>
                                    <Label>Category</Label>
                                    <p className="font-medium">{audit.category}</p>
                                  </div>
                                  <div>
                                    <Label>Priority</Label>
                                    <Badge className={getPriorityColor(audit.priority)}>
                                      {audit.priority}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label>Assigned To</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="font-medium">{audit.assignedTo}</p>
                                      {audit.assignedRole && (
                                        <Badge variant="secondary" className="text-xs">
                                          {audit.assignedRole}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Assignment Type</Label>
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        audit.assignmentType.includes('Random') 
                                          ? 'bg-purple-50 text-purple-700 border-purple-200 mt-1' 
                                          : 'bg-blue-50 text-blue-700 border-blue-200 mt-1'
                                      }
                                    >
                                      {audit.assignmentType.includes('Random') ? (
                                        <Shuffle className="w-3 h-3 mr-1" />
                                      ) : (
                                        <User className="w-3 h-3 mr-1" />
                                      )}
                                      {audit.assignmentType}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Description</Label>
                                  <p>{audit.description}</p>
                                </div>
                                
                                <div className="flex gap-2 pt-4">
                                  <Button onClick={() => generateAuditReport(audit.id)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Generate Report
                                  </Button>
                                  <Button variant="outline">Update Status</Button>
                                  <Button variant="outline">Reassign</Button>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAudits.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audits match the current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}