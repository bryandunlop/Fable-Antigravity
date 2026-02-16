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
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Send,
  Eye,
  Download,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentCompliance() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Mock data - in real app this would come from backend
  const documents = [
    {
      id: 'DOC-001',
      title: 'Emergency Procedures Update v2.1',
      type: 'Procedure',
      category: 'Safety',
      status: 'Active',
      version: '2.1',
      distributedDate: '2024-02-05',
      dueDate: '2024-02-12',
      totalRecipients: 25,
      readConfirmations: 18,
      completionCode: 'EP-241',
      distributionGroups: ['All Staff', 'Flight Crew'],
      individualRecipients: ['safety.manager@company.com'],
      description: 'Updated emergency procedures including new evacuation protocols',
      recipients: [
        { id: 1, name: 'John Smith', role: 'Captain', email: 'j.smith@company.com', status: 'Read', readDate: '2024-02-06', completionCode: 'EP-241' },
        { id: 2, name: 'Sarah Wilson', role: 'First Officer', email: 's.wilson@company.com', status: 'Read', readDate: '2024-02-07', completionCode: 'EP-241' },
        { id: 3, name: 'Mike Johnson', role: 'Flight Attendant', email: 'm.johnson@company.com', status: 'Pending', readDate: null, completionCode: null },
        { id: 4, name: 'Emily Davis', role: 'Maintenance', email: 'e.davis@company.com', status: 'Read', readDate: '2024-02-08', completionCode: 'EP-241' }
      ]
    },
    {
      id: 'DOC-002',
      title: 'COVID-19 Health Protocol Update',
      type: 'Policy',
      category: 'Health & Safety',
      status: 'Active',
      version: '3.2',
      distributedDate: '2024-02-01',
      dueDate: '2024-02-08',
      totalRecipients: 15,
      readConfirmations: 15,
      completionCode: 'CV-322',
      distributionGroups: ['Flight Crew', 'Cabin Crew'],
      individualRecipients: [],
      description: 'Updated health protocols for COVID-19 prevention and response',
      recipients: [
        { id: 5, name: 'David Brown', role: 'Captain', email: 'd.brown@company.com', status: 'Read', readDate: '2024-02-02', completionCode: 'CV-322' },
        { id: 6, name: 'Lisa Chen', role: 'First Officer', email: 'l.chen@company.com', status: 'Read', readDate: '2024-02-03', completionCode: 'CV-322' }
      ]
    },
    {
      id: 'DOC-003',
      title: 'Fuel Handling Safety Guidelines',
      type: 'Guideline',
      category: 'Operations',
      status: 'Pending Distribution',
      version: '1.5',
      distributedDate: null,
      dueDate: '2024-02-15',
      totalRecipients: 0,
      readConfirmations: 0,
      completionCode: 'FH-151',
      distributionGroups: ['Ground Crew', 'Maintenance'],
      individualRecipients: ['fuel.supervisor@company.com'],
      description: 'Comprehensive guidelines for safe fuel handling procedures',
      recipients: []
    }
  ];

  const userGroups = [
    'All Staff',
    'Flight Crew',
    'Cabin Crew',
    'Ground Crew',
    'Maintenance',
    'Management',
    'Safety Team'
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending distribution': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReadStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'read': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesFilter = filter === 'all' || doc.status.toLowerCase().replace(' ', '') === filter;
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.completionCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDistributeDocument = (documentId: string) => {
    toast.success(`Document ${documentId} distributed successfully`);
    setShowDistributeDialog(false);
  };

  const generateComplianceReport = (documentId: string) => {
    toast.success(`Generating compliance report for document ${documentId}`);
  };

  const sendReminder = (documentId: string) => {
    toast.success(`Reminder sent for document ${documentId}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            <UserCheck className="w-6 h-6" />
            Document Compliance Tracking
          </h1>
          <p className="text-muted-foreground">Manage document distribution and track reading compliance</p>
        </div>
        
        <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
          <DialogTrigger asChild>
            <Button>
              <Send className="w-4 h-4 mr-2" />
              Distribute Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Distribute Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Document Title</Label>
                  <Input placeholder="Document title" />
                </div>
                <div>
                  <Label>Version</Label>
                  <Input placeholder="e.g., 1.0" />
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
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="policy">Policy</SelectItem>
                      <SelectItem value="health-safety">Health & Safety</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" />
                </div>
              </div>
              
              <div>
                <Label>Completion Code</Label>
                <Input placeholder="e.g., DOC-123 (auto-generated if empty)" />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Brief description of the document" rows={2} />
              </div>
              
              <div>
                <Label>Distribution Groups</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {userGroups.map((group) => (
                    <div key={group} className="flex items-center space-x-2">
                      <Checkbox id={group} />
                      <Label htmlFor={group} className="text-sm">{group}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Individual Recipients (Email)</Label>
                <Textarea 
                  placeholder="Enter email addresses separated by commas"
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleDistributeDocument('NEW')}>
                  <Send className="w-4 h-4 mr-2" />
                  Distribute Now
                </Button>
                <Button variant="outline" onClick={() => setShowDistributeDialog(false)}>
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
              <FileText className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Documents</p>
                <p className="text-2xl">
                  {documents.filter(d => d.status === 'Active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Distribution</p>
                <p className="text-2xl">
                  {documents.filter(d => d.status === 'Pending Distribution').length}
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
                <p className="text-sm text-muted-foreground">Total Recipients</p>
                <p className="text-2xl">
                  {documents.reduce((sum, d) => sum + d.totalRecipients, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Read Confirmations</p>
                <p className="text-2xl">
                  {documents.reduce((sum, d) => sum + d.readConfirmations, 0)}
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
                  placeholder="Search by title, ID, or completion code..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pendingdistribution">Pending Distribution</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Document Distribution Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completion Code</TableHead>
                  <TableHead>Distributed</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.id}</TableCell>
                    <TableCell className="max-w-xs truncate">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.version}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {doc.completionCode}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.distributedDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {new Date(doc.distributedDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not distributed</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="text-sm">{doc.totalRecipients}</div>
                        <div className="text-xs text-muted-foreground">recipients</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-32">
                        <div className="flex justify-between text-sm">
                          <span>{doc.readConfirmations}/{doc.totalRecipients}</span>
                          <span>{doc.totalRecipients > 0 ? Math.round((doc.readConfirmations / doc.totalRecipients) * 100) : 0}%</span>
                        </div>
                        <Progress 
                          value={doc.totalRecipients > 0 ? (doc.readConfirmations / doc.totalRecipients) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedDocument(doc)}>
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Document Compliance Details - {doc.id}</DialogTitle>
                            </DialogHeader>
                            <Tabs defaultValue="recipients">
                              <TabsList>
                                <TabsTrigger value="recipients">Recipients</TabsTrigger>
                                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="recipients" className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <h3>Recipient Status</h3>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => sendReminder(doc.id)}>
                                      Send Reminder
                                    </Button>
                                    <Button size="sm" onClick={() => generateComplianceReport(doc.id)}>
                                      <Download className="w-4 h-4 mr-2" />
                                      Export Report
                                    </Button>
                                  </div>
                                </div>
                                
                                {doc.recipients.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Name</TableHead>
                                          <TableHead>Role</TableHead>
                                          <TableHead>Email</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Read Date</TableHead>
                                          <TableHead>Code Used</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {doc.recipients.map((recipient) => (
                                          <TableRow key={recipient.id}>
                                            <TableCell className="font-medium">{recipient.name}</TableCell>
                                            <TableCell>{recipient.role}</TableCell>
                                            <TableCell>{recipient.email}</TableCell>
                                            <TableCell>
                                              <Badge className={getReadStatusColor(recipient.status)}>
                                                {recipient.status}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
                                              {recipient.readDate ? (
                                                <div className="flex items-center gap-2">
                                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                                  {new Date(recipient.readDate).toLocaleDateString()}
                                                </div>
                                              ) : (
                                                <span className="text-muted-foreground">-</span>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {recipient.completionCode ? (
                                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                                  {recipient.completionCode}
                                                </code>
                                              ) : (
                                                <span className="text-muted-foreground">-</span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No recipients assigned yet</p>
                                  </div>
                                )}
                              </TabsContent>
                              
                              <TabsContent value="distribution" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Distribution Groups</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {doc.distributionGroups.map((group) => (
                                        <Badge key={group} variant="outline">
                                          <Users className="w-3 h-3 mr-1" />
                                          {group}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Individual Recipients</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {doc.individualRecipients.length > 0 ? (
                                        doc.individualRecipients.map((email) => (
                                          <Badge key={email} variant="outline">
                                            {email}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-sm text-muted-foreground">None</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Description</Label>
                                  <p>{doc.description}</p>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <Label>Distributed Date</Label>
                                    <p className="font-medium">
                                      {doc.distributedDate ? new Date(doc.distributedDate).toLocaleDateString() : 'Not distributed'}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Due Date</Label>
                                    <p className="font-medium">
                                      {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : 'No due date'}
                                    </p>
                                  </div>
                                  <div>
                                    <Label>Completion Code</Label>
                                    <code className="text-sm bg-gray-100 px-2 py-1 rounded font-medium">
                                      {doc.completionCode}
                                    </code>
                                  </div>
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="compliance" className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <Card>
                                    <CardContent className="p-4 text-center">
                                      <div className="text-2xl font-bold text-green-600">{doc.readConfirmations}</div>
                                      <div className="text-sm text-muted-foreground">Completed</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="p-4 text-center">
                                      <div className="text-2xl font-bold text-yellow-600">{doc.totalRecipients - doc.readConfirmations}</div>
                                      <div className="text-sm text-muted-foreground">Pending</div>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="p-4 text-center">
                                      <div className="text-2xl font-bold text-blue-600">
                                        {doc.totalRecipients > 0 ? Math.round((doc.readConfirmations / doc.totalRecipients) * 100) : 0}%
                                      </div>
                                      <div className="text-sm text-muted-foreground">Compliance Rate</div>
                                    </CardContent>
                                  </Card>
                                </div>
                                
                                <div>
                                  <Label>Compliance Progress</Label>
                                  <div className="mt-2">
                                    <Progress 
                                      value={doc.totalRecipients > 0 ? (doc.readConfirmations / doc.totalRecipients) * 100 : 0} 
                                      className="h-4"
                                    />
                                    <div className="flex justify-between text-sm text-muted-foreground mt-1">
                                      <span>{doc.readConfirmations} of {doc.totalRecipients} completed</span>
                                      <span>
                                        {doc.totalRecipients > 0 ? Math.round((doc.readConfirmations / doc.totalRecipients) * 100) : 0}%
                                      </span>
                                    </div>
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

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents match the current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}