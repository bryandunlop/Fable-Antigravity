import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  FileCheck, 
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
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

export default function WaiverManagement() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewWaiverDialog, setShowNewWaiverDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedWaiver, setSelectedWaiver] = useState(null);

  // Mock data - in real app this would come from backend
  const waivers = [
    {
      id: 'WV-001',
      title: 'Night Flying Operations - N123AB',
      type: 'Operational',
      priority: 'High',
      status: 'Pending Review',
      submittedBy: 'John Smith',
      submittedDate: '2024-02-06',
      expirationDate: '2024-03-06',
      description: 'Request for night flying operations approval for aircraft N123AB on route LAX-DEN',
      justification: 'Urgent passenger medical transport required outside normal operating hours',
      riskAssessment: 'Medium risk - experienced crew, good weather conditions, familiar route',
      assignedTo: 'Unassigned',
      approvers: ['Safety Manager', 'Operations Manager'],
      duties: []
    },
    {
      id: 'WV-002',
      title: 'Minimum Weather Deviation - N456CD',
      type: 'Weather',
      priority: 'Critical',
      status: 'Under Review',
      submittedBy: 'Sarah Wilson',
      submittedDate: '2024-02-05',
      expirationDate: '2024-02-07',
      description: 'Request to operate below standard weather minimums for emergency medical evacuation',
      justification: 'Life-threatening medical emergency requiring immediate transport',
      riskAssessment: 'High risk - marginal weather, but life safety priority',
      assignedTo: 'Mike Johnson',
      approvers: ['Chief Pilot', 'Safety Manager'],
      duties: [
        { id: 1, task: 'Weather monitoring every 15 minutes', assignedTo: 'Dispatch', status: 'Pending' },
        { id: 2, task: 'Alternate airport confirmation', assignedTo: 'Operations', status: 'Complete' }
      ]
    },
    {
      id: 'WV-003',
      title: 'Extended Duty Time - Crew 404',
      type: 'Crew Rest',
      priority: 'Medium',
      status: 'Approved',
      submittedBy: 'David Brown',
      submittedDate: '2024-02-04',
      expirationDate: '2024-02-05',
      description: 'Extension of flight duty period for crew due to mechanical delay',
      justification: 'Mechanical issue caused extended ground time, crew requests duty extension',
      riskAssessment: 'Low risk - crew well rested, short extension requested',
      assignedTo: 'Emily Davis',
      approvers: ['Chief Pilot'],
      duties: [
        { id: 3, task: 'Crew fatigue monitoring', assignedTo: 'Chief Pilot', status: 'Complete' }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under review': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'denied': return 'bg-red-100 text-red-800 border-red-200';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredWaivers = waivers.filter(waiver => {
    const matchesFilter = filter === 'all' || waiver.status.toLowerCase().replace(' ', '') === filter;
    const matchesSearch = waiver.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         waiver.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         waiver.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleApproveWaiver = (waiverId: string) => {
    toast.success(`Waiver ${waiverId} approved successfully`);
    setShowReviewDialog(false);
  };

  const handleDenyWaiver = (waiverId: string) => {
    toast.success(`Waiver ${waiverId} denied`);
    setShowReviewDialog(false);
  };

  const handleAssignDuty = (waiverIndex: number, dutyIndex: number, assignee: string) => {
    toast.success(`Duty assigned to ${assignee}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            <FileCheck className="w-6 h-6" />
            Waiver Request Management
          </h1>
          <p className="text-muted-foreground">Review and approve operational waiver requests</p>
        </div>
        
        <Dialog open={showNewWaiverDialog} onOpenChange={setShowNewWaiverDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Waiver Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit New Waiver Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Waiver Title</Label>
                  <Input placeholder="Brief description of waiver request" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select waiver type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="weather">Weather</SelectItem>
                      <SelectItem value="crew-rest">Crew Rest</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expiration Date</Label>
                  <Input type="date" />
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Detailed description of the waiver request" rows={3} />
              </div>
              
              <div>
                <Label>Justification</Label>
                <Textarea placeholder="Business justification for this waiver" rows={3} />
              </div>
              
              <div>
                <Label>Risk Assessment</Label>
                <Textarea placeholder="Risk assessment and mitigation measures" rows={3} />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => {
                  toast.success('Waiver request submitted successfully');
                  setShowNewWaiverDialog(false);
                }}>
                  Submit Request
                </Button>
                <Button variant="outline" onClick={() => setShowNewWaiverDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl">
                  {waivers.filter(w => w.status === 'Pending Review').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl">
                  {waivers.filter(w => w.status === 'Under Review').length}
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
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl">
                  {waivers.filter(w => w.status === 'Approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Denied</p>
                <p className="text-2xl">
                  {waivers.filter(w => w.status === 'Denied').length}
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
                  placeholder="Search by title, ID, or submitter..."
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
                <SelectItem value="pendingreview">Pending Review</SelectItem>
                <SelectItem value="underreview">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Waivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Waiver Requests</CardTitle>
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
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaivers.map((waiver) => (
                  <TableRow key={waiver.id}>
                    <TableCell className="font-medium">{waiver.id}</TableCell>
                    <TableCell className="max-w-xs truncate">{waiver.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{waiver.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(waiver.priority)}>
                        {waiver.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(waiver.status)}>
                        {waiver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {waiver.submittedBy}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {new Date(waiver.submittedDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(waiver.expirationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {waiver.assignedTo === 'Unassigned' ? (
                        <Badge variant="outline">Unassigned</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-muted-foreground" />
                          {waiver.assignedTo}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedWaiver(waiver)}>
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Waiver Request Review - {waiver.id}</DialogTitle>
                            </DialogHeader>
                            <Tabs defaultValue="details">
                              <TabsList>
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="duties">Duties</TabsTrigger>
                                <TabsTrigger value="approvals">Approvals</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="details" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Title</Label>
                                    <p className="font-medium">{waiver.title}</p>
                                  </div>
                                  <div>
                                    <Label>Type</Label>
                                    <Badge variant="outline">{waiver.type}</Badge>
                                  </div>
                                  <div>
                                    <Label>Priority</Label>
                                    <Badge className={getPriorityColor(waiver.priority)}>
                                      {waiver.priority}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label>Status</Label>
                                    <Badge className={getStatusColor(waiver.status)}>
                                      {waiver.status}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Description</Label>
                                  <p>{waiver.description}</p>
                                </div>
                                
                                <div>
                                  <Label>Justification</Label>
                                  <p>{waiver.justification}</p>
                                </div>
                                
                                <div>
                                  <Label>Risk Assessment</Label>
                                  <p>{waiver.riskAssessment}</p>
                                </div>
                                
                                <div className="flex gap-2 pt-4">
                                  <Button onClick={() => handleApproveWaiver(waiver.id)} className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button onClick={() => handleDenyWaiver(waiver.id)} variant="destructive">
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Deny
                                  </Button>
                                  <Button variant="outline">Request More Info</Button>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="duties" className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <h3>Assigned Duties</h3>
                                  <Button size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Duty
                                  </Button>
                                </div>
                                
                                {waiver.duties.length > 0 ? (
                                  <div className="space-y-3">
                                    {waiver.duties.map((duty) => (
                                      <div key={duty.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <p className="font-medium">{duty.task}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                              <span className="text-sm text-muted-foreground">Assigned to:</span>
                                              <Badge variant="outline">{duty.assignedTo}</Badge>
                                              <Badge className={duty.status === 'Complete' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                                {duty.status}
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
                                    <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No duties assigned yet</p>
                                  </div>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="approvals" className="space-y-4">
                                <div>
                                  <h3>Required Approvers</h3>
                                  <div className="space-y-2 mt-4">
                                    {waiver.approvers.map((approver, index) => (
                                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-2">
                                          <UserCheck className="w-4 h-4" />
                                          <span>{approver}</span>
                                        </div>
                                        <Badge variant="outline">Pending</Badge>
                                      </div>
                                    ))}
                                  </div>
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

          {filteredWaivers.length === 0 && (
            <div className="text-center py-8">
              <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No waiver requests match the current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}