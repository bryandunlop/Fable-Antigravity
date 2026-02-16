import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { mockDocuments, type Document } from './data/documentData';
import {
  FileText,
  Upload,
  Edit,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Search,
  Plus,
  Users,
  ArrowRight,
  MessageSquare,
  History
} from 'lucide-react';

interface DocumentManagementProps {
  userRole: string;
}

export default function DocumentManagement({ userRole }: DocumentManagementProps) {
  const navigate = useNavigate();
  const [documents] = useState<Document[]>(mockDocuments);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Document form state
  const [documentForm, setDocumentForm] = useState({
    title: '',
    type: '',
    category: '',
    description: '',
    compliance: 'Optional',
    file: null as File | null
  });

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5); // Show only first 5 for cleaner interface

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'current': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-orange-100 text-orange-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceColor = (compliance: string) => {
    switch (compliance.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'required': return 'bg-orange-100 text-orange-800';
      case 'annual': return 'bg-yellow-100 text-yellow-800';
      case 'optional': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUploadDocument = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] Document uploaded:', documentForm);
    }
    setIsUploadDialogOpen(false);
    setDocumentForm({
      title: '', type: '', category: '', description: '', compliance: 'Optional', file: null
    });
  };

  const stats = {
    total: documents.length,
    pending: 5,
    collaborations: 2,
    complianceRate: 92
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Clean Header */}
      <div className="text-center">
        <h1 className="mb-2">Document Management</h1>
        <p className="text-muted-foreground">
          Manage documents, review submissions, and track collaborative projects
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Documents</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">{stats.collaborations}</div>
            <div className="text-sm text-muted-foreground">Active Projects</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            <div className="text-sm text-muted-foreground">Compliance</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Review Queue */}
        <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-yellow-200"
          onClick={() => navigate('/document-management/queue')}>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="mb-2">Review Queue</h3>
            <p className="text-muted-foreground mb-4">
              Review pending submissions and prevent duplicates
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800">5 pending</Badge>
              <ArrowRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Active Collaborations */}
        <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-purple-200"
          onClick={() => navigate('/document-management/collaborations')}>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="mb-2">Collaborations</h3>
            <p className="text-muted-foreground mb-4">
              Multi-contributor document improvement projects
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge className="bg-purple-100 text-purple-800">2 active</Badge>
              <ArrowRight className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Upload Document */}
        <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-200"
          onClick={() => setIsUploadDialogOpen(true)}>
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="mb-2">Upload Document</h3>
            <p className="text-muted-foreground mb-4">
              Add new compliance documents to the system
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Document Search */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Document Search</CardTitle>
          <CardDescription>Find and manage your documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm && (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
                  <div className="flex-1">
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-sm text-muted-foreground">{doc.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getComplianceColor(doc.compliance)} variant="outline">
                      {doc.compliance}
                    </Badge>
                    <Badge className={getStatusColor(doc.status)}>
                      {doc.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredDocuments.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No documents found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Flight Operations Manual v2.4 Published</div>
                <div className="text-sm text-muted-foreground">Weather minimums updated • 2 hours ago</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Safety Management System collaboration started</div>
                <div className="text-sm text-muted-foreground">7 contributors joined • 4 hours ago</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Emergency oxygen procedures pending review</div>
                <div className="text-sm text-muted-foreground">Submitted by Lisa Wong • 1 day ago</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
            <DialogDescription>Add a new document to the compliance library</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={documentForm.title}
                onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                placeholder="Enter document title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Document Type</Label>
              <Select value={documentForm.type} onValueChange={(value) => setDocumentForm({ ...documentForm, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Checklist">Checklist</SelectItem>
                  <SelectItem value="Notice">Notice</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Bulletin">Bulletin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={documentForm.category} onValueChange={(value) => setDocumentForm({ ...documentForm, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Safety">Safety</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="compliance">Compliance Level</Label>
              <Select value={documentForm.compliance} onValueChange={(value) => setDocumentForm({ ...documentForm, compliance: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select compliance level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="Required">Required</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Optional">Optional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={documentForm.description}
                onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                placeholder="Enter document description"
                rows={3}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="file">Upload File</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files?.[0] || null })}
                accept=".pdf,.doc,.docx,.txt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument}>
              Upload Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}