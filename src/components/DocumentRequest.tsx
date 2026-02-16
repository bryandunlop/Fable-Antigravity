import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import {
  FileText,
  MessageSquare,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Search,
  Plus,
  Users,
  ArrowRight,
  History,
  Edit3,
  FileImage,
  Lightbulb,
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';

interface DocumentRequestProps {
  userRole: string;
}

interface DocumentRequest {
  id: string;
  type: 'new' | 'change' | 'update';
  title: string;
  category: string;
  description: string;
  justification: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  currentDocument?: string;
  status: 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected' | 'completed';
  submittedBy: string;
  submittedDate: string;
  estimatedHours?: number;
  affectedPersonnel?: string[];
}

export default function DocumentRequest({ userRole }: DocumentRequestProps) {
  const navigate = useNavigate();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequestType, setSelectedRequestType] = useState<'change' | 'update'>('change');

  // Mock data for requests
  const [requests] = useState<DocumentRequest[]>([
    {
      id: '1',
      type: 'new',
      title: 'Emergency Evacuation Procedures for G650',
      category: 'Safety',
      description: 'Need updated emergency evacuation procedures specific to G650 configuration',
      justification: 'Current procedures are generic and don\'t address G650-specific features',
      priority: 'high',
      deadline: '2025-02-15',
      status: 'under-review',
      submittedBy: 'Captain Mike Wilson',
      submittedDate: '2025-01-25',
      estimatedHours: 8,
      affectedPersonnel: ['Pilots', 'Flight Attendants']
    },
    {
      id: '2',
      type: 'change',
      title: 'Update Pre-flight Checklist',
      category: 'Operations',
      description: 'Add new electrical system checks to pre-flight checklist',
      justification: 'Recent service bulletin requires additional electrical checks',
      priority: 'medium',
      currentDocument: 'Pre-flight Checklist v3.2',
      status: 'approved',
      submittedBy: 'Tom Chen',
      submittedDate: '2025-01-20',
      estimatedHours: 4,
      affectedPersonnel: ['Pilots', 'Maintenance']
    },
    {
      id: '3',
      type: 'update',
      title: 'Catering Service Standards',
      category: 'Service',
      description: 'Update catering standards to include new dietary restrictions',
      justification: 'Increasing passenger requests for specialized dietary accommodations',
      priority: 'low',
      currentDocument: 'Catering Standards Manual',
      status: 'completed',
      submittedBy: 'Sarah Johnson',
      submittedDate: '2025-01-18',
      estimatedHours: 6,
      affectedPersonnel: ['Flight Attendants', 'Ground Services']
    }
  ]);

  // Request form state
  const [requestForm, setRequestForm] = useState({
    type: 'change' as 'change' | 'update',
    title: '',
    category: '',
    description: '',
    justification: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    deadline: '',
    currentDocument: '',
    estimatedComplexity: 'medium',
    affectedPersonnel: [] as string[],
    attachments: [] as File[]
  });

  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const filteredRequests = requests.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under-review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitRequest = () => {
    if (!requestForm.title || !requestForm.description || !requestForm.justification) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] Document request submitted:', requestForm);
    }
    toast.success('Document request submitted successfully! The document management team will review your request.');

    setIsRequestDialogOpen(false);
    setRequestForm({
      type: 'change',
      title: '',
      category: '',
      description: '',
      justification: '',
      priority: 'medium',
      deadline: '',
      currentDocument: '',
      estimatedComplexity: 'medium',
      affectedPersonnel: [],
      attachments: []
    });
  };

  const handlePersonnelChange = (personnel: string, checked: boolean) => {
    if (checked) {
      setRequestForm(prev => ({
        ...prev,
        affectedPersonnel: [...prev.affectedPersonnel, personnel]
      }));
    } else {
      setRequestForm(prev => ({
        ...prev,
        affectedPersonnel: prev.affectedPersonnel.filter(p => p !== personnel)
      }));
    }
  };

  const stats = {
    totalRequests: requests.length,
    pending: requests.filter(r => ['submitted', 'under-review'].includes(r.status)).length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length
  };

  const getCurrentUserName = (role: string): string => {
    const nameMap: Record<string, string> = {
      'pilot': 'Captain John Smith',
      'inflight': 'Sarah Johnson',
      'maintenance': 'Tom Chen',
      'admin': 'Maria Rodriguez',
      'safety': 'Dr. Lisa Davis',
      'scheduling': 'Michael Torres',
      'admin-assistant': 'Jessica Park'
    };
    return nameMap[role] || 'Team Member';
  };

  const handleViewRequest = (request: DocumentRequest) => {
    setSelectedRequest(request);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-2 text-primary">Document Request Center</h1>
        <p className="text-muted-foreground">
          Request new documents, changes, or updates from the document management team
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="aviation-card text-center">
          <CardContent className="p-4">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-accent" />
            <div className="text-2xl font-bold text-primary">{stats.totalRequests}</div>
            <div className="text-sm text-muted-foreground">Total Requests</div>
          </CardContent>
        </Card>
        <Card className="aviation-card text-center">
          <CardContent className="p-4">
            <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold text-primary">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Under Review</div>
          </CardContent>
        </Card>
        <Card className="aviation-card text-center">
          <CardContent className="p-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-primary">{stats.approved}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card className="aviation-card text-center">
          <CardContent className="p-4">
            <FileText className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
            <div className="text-2xl font-bold text-primary">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* New Section - Streamlined Request Types */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-secondary/5 p-8 rounded-2xl border border-border/30">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-primary mb-3">New Section</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Submit requests for document modifications and updates to keep our aviation documentation current and compliant
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Document Change Request */}
            <div
              className="group relative cursor-pointer transform transition-all duration-300 hover:scale-[1.02]"
              onClick={() => {
                setSelectedRequestType('change');
                setRequestForm(prev => ({ ...prev, type: 'change' }));
                setIsRequestDialogOpen(true);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
              <Card className="relative h-full overflow-hidden border-2 border-secondary/20 group-hover:border-secondary/40 bg-gradient-to-br from-white via-secondary/5 to-secondary/10 aviation-shadow group-hover:aviation-shadow-xl transition-all duration-300">
                <CardContent className="p-8 h-full flex flex-col">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-secondary via-secondary/90 to-secondary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 aviation-shadow-lg">
                      <Edit3 className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-primary group-hover:text-secondary transition-colors duration-300">
                      Document Change
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Request modifications, revisions, or corrections to existing documents and procedures. Perfect for content updates, policy changes, and procedural improvements.
                    </p>
                  </div>

                  <div className="mt-auto">
                    <div className="bg-gradient-to-r from-secondary to-secondary/90 text-white px-6 py-4 rounded-xl font-medium group-hover:shadow-lg transition-all duration-300 request-button-glow text-center">
                      <Edit3 className="w-5 h-5 mr-2 inline" />
                      Request Document Changes
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Document Update Request */}
            <div
              className="group relative cursor-pointer transform transition-all duration-300 hover:scale-[1.02]"
              onClick={() => {
                setSelectedRequestType('update');
                setRequestForm(prev => ({ ...prev, type: 'update' }));
                setIsRequestDialogOpen(true);
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
              <Card className="relative h-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/40 bg-gradient-to-br from-white via-primary/5 to-primary/10 aviation-shadow group-hover:aviation-shadow-xl transition-all duration-300">
                <CardContent className="p-8 h-full flex flex-col">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 aviation-shadow-lg">
                      <History className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-primary group-hover:text-primary/80 transition-colors duration-300">
                      Document Update
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Request version updates to bring current documents up to date with latest regulations, standards, and best practices in aviation operations.
                    </p>
                  </div>

                  <div className="mt-auto">
                    <div className="bg-gradient-to-r from-primary to-primary/90 text-white px-6 py-4 rounded-xl font-medium group-hover:shadow-lg transition-all duration-300 request-button-glow text-center">
                      <History className="w-5 h-5 mr-2 inline" />
                      Request Document Update
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 rounded-2xl border border-border/30 aviation-shadow">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              <p className="text-sm text-muted-foreground font-medium">
                Select a request type above to begin the document assistance process
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Guidelines */}
      <Card className="aviation-card bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <AlertCircle className="w-5 h-5 text-accent" />
            Request Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Before Submitting:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check if similar document already exists</li>
                <li>• Clearly explain the business need</li>
                <li>• Identify all affected personnel</li>
                <li>• Provide realistic timeline expectations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Response Times:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <span className="text-red-600">Urgent:</span> 1-2 business days</li>
                <li>• <span className="text-orange-600">High:</span> 3-5 business days</li>
                <li>• <span className="text-yellow-600">Medium:</span> 1-2 weeks</li>
                <li>• <span className="text-blue-600">Low:</span> 2-4 weeks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Requests */}
      <Card className="aviation-card">
        <CardHeader>
          <CardTitle className="text-primary">My Document Requests</CardTitle>
          <CardDescription>Track your submitted requests and their status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 aviation-focus"
            />
          </div>

          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg hover:bg-accent/5 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-primary">{request.title}</h4>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('-', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(request.priority)} variant="outline">
                        {request.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(request.submittedDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {request.submittedBy}
                      </span>
                      {request.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due: {new Date(request.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewRequest(request)}
                    className="hover:bg-accent/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                {request.affectedPersonnel && request.affectedPersonnel.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">Affects:</span>
                    {request.affectedPersonnel.map((personnel, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {personnel}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredRequests.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {searchTerm ? `No requests found matching "${searchTerm}"` : 'No document requests submitted yet'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="request-form-description">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {requestForm.type === 'change' ? 'Request Document Change' : 'Request Document Update'}
            </DialogTitle>
            <DialogDescription id="request-form-description">
              Provide detailed information about your document request. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Request Type */}
            <div className="space-y-3">
              <Label>Request Type *</Label>
              <RadioGroup
                value={requestForm.type}
                onValueChange={(value) => setRequestForm(prev => ({ ...prev, type: value as any }))}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="change" id="change" />
                  <Label htmlFor="change">Document Change</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <Label htmlFor="update">Document Update</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  value={requestForm.title}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a clear, descriptive title"
                  className="aviation-focus"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={requestForm.category} onValueChange={(value) => setRequestForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="aviation-focus">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Service">Passenger Service</SelectItem>
                    <SelectItem value="Administrative">Administrative</SelectItem>
                    <SelectItem value="Emergency">Emergency Procedures</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level *</Label>
                <Select value={requestForm.priority} onValueChange={(value) => setRequestForm(prev => ({ ...prev, priority: value as any }))}>
                  <SelectTrigger className="aviation-focus">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Can wait 2-4 weeks</SelectItem>
                    <SelectItem value="medium">Medium - Needed within 1-2 weeks</SelectItem>
                    <SelectItem value="high">High - Needed within 3-5 days</SelectItem>
                    <SelectItem value="urgent">Urgent - Needed within 1-2 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label htmlFor="deadline">Target Completion Date</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={requestForm.deadline}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className="aviation-focus"
                />
              </div>
            </div>

            {/* Current Document (always show since we only have change/update) */}
            {(requestForm.type === 'change' || requestForm.type === 'update') && (
              <div className="space-y-2">
                <Label htmlFor="currentDoc">Current Document Reference</Label>
                <Input
                  id="currentDoc"
                  value={requestForm.currentDocument}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, currentDocument: e.target.value }))}
                  placeholder="e.g., Flight Operations Manual v2.4, Section 3.2"
                  className="aviation-focus"
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description *</Label>
              <Textarea
                id="description"
                value={requestForm.description}
                onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide a detailed description of what you need..."
                rows={4}
                className="aviation-focus"
              />
            </div>

            {/* Justification */}
            <div className="space-y-2">
              <Label htmlFor="justification">Business Justification *</Label>
              <Textarea
                id="justification"
                value={requestForm.justification}
                onChange={(e) => setRequestForm(prev => ({ ...prev, justification: e.target.value }))}
                placeholder="Explain why this document is needed and how it will benefit operations..."
                rows={3}
                className="aviation-focus"
              />
            </div>

            {/* Affected Personnel */}
            <div className="space-y-3">
              <Label>Affected Personnel Groups</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Pilots', 'Flight Attendants', 'Maintenance', 'Ground Operations', 'Scheduling', 'Safety', 'Management', 'Administrative'].map((group) => (
                  <div key={group} className="flex items-center space-x-2">
                    <Checkbox
                      id={group}
                      checked={requestForm.affectedPersonnel.includes(group)}
                      onCheckedChange={(checked) => handlePersonnelChange(group, checked as boolean)}
                    />
                    <Label htmlFor={group} className="text-sm">{group}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* File Attachments */}
            <div className="space-y-2">
              <Label htmlFor="attachments">Supporting Documents (Optional)</Label>
              <Input
                id="attachments"
                type="file"
                multiple
                onChange={(e) => setRequestForm(prev => ({ ...prev, attachments: Array.from(e.target.files || []) }))}
                accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                className="aviation-focus"
              />
              <p className="text-xs text-muted-foreground">
                Upload any supporting documents, references, or examples (max 10MB per file)
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitRequest} className="btn-aviation-primary">
              <Send className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Request Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl" aria-describedby="view-request-description">
          <DialogHeader>
            <DialogTitle className="text-primary">Request Details</DialogTitle>
            <DialogDescription id="view-request-description">
              View complete information for this document request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Request Type</Label>
                  <p className="capitalize">{selectedRequest.type.replace('-', ' ')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <p>{selectedRequest.category}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Title</Label>
                <p className="font-medium">{selectedRequest.title}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedRequest.description}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Justification</Label>
                <p className="text-sm">{selectedRequest.justification}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Priority</Label>
                  <Badge className={getPriorityColor(selectedRequest.priority)}>
                    {selectedRequest.priority} priority
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status.replace('-', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted By</Label>
                  <p className="text-sm">{selectedRequest.submittedBy}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Submitted Date</Label>
                  <p className="text-sm">{new Date(selectedRequest.submittedDate).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedRequest.deadline && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Target Deadline</Label>
                  <p className="text-sm">{new Date(selectedRequest.deadline).toLocaleDateString()}</p>
                </div>
              )}

              {selectedRequest.currentDocument && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Document Reference</Label>
                  <p className="text-sm">{selectedRequest.currentDocument}</p>
                </div>
              )}

              {selectedRequest.affectedPersonnel && selectedRequest.affectedPersonnel.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Affected Personnel</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedRequest.affectedPersonnel.map((personnel, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {personnel}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.estimatedHours && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Estimated Hours</Label>
                  <p className="text-sm">{selectedRequest.estimatedHours} hours</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}