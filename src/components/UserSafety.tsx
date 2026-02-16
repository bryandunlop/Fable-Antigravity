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
  Shield,
  FileCheck, 
  AlertTriangle,
  Target,
  UserCheck,
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Hash,
  Send,
  FileText,
  Award,
  ThumbsUp,
  Star,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';

interface UserSafetyProps {
  userRole: string;
}

export default function UserSafety({ userRole }: UserSafetyProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showWaiverDialog, setShowWaiverDialog] = useState(false);
  const [showHazardDialog, setShowHazardDialog] = useState(false);
  const [showCWSDialog, setShowCWSDialog] = useState(false);

  // Mock data for user's safety items
  const myWaivers = [
    {
      id: 'WV-001',
      title: 'Night Flying Operations - N123AB',
      status: 'Pending Review',
      submittedDate: '2024-02-06',
      priority: 'High'
    },
    {
      id: 'WV-005',
      title: 'Extended Duty Time Request',
      status: 'Approved',
      submittedDate: '2024-01-28',
      priority: 'Medium'
    }
  ];

  const myHazardReports = [
    {
      id: 'HZ-004',
      title: 'Fuel System Leak - Fuel Farm',
      status: 'Under Investigation',
      submittedDate: '2024-02-06',
      severity: 'High'
    }
  ];

  const myAudits = [
    {
      id: 'AUD-001',
      title: 'Monthly Safety Audit - February 2024',
      status: 'Assigned',
      dueDate: '2024-02-28',
      completionRate: 60,
      checklist: [
        { id: 1, item: 'Review emergency procedures knowledge', completed: true },
        { id: 2, item: 'Demonstrate safety equipment usage', completed: true },
        { id: 3, item: 'Complete safety questionnaire', completed: false },
        { id: 4, item: 'Provide improvement suggestions', completed: false }
      ]
    }
  ];

  const myDocuments = [
    {
      id: 'DOC-001',
      title: 'Emergency Procedures Update v2.1',
      status: 'Pending',
      dueDate: '2024-02-12',
      completionCode: 'EP-241',
      description: 'Updated emergency procedures including new evacuation protocols'
    },
    {
      id: 'DOC-002',
      title: 'COVID-19 Health Protocol Update',
      status: 'Read',
      readDate: '2024-02-03',
      completionCode: 'CV-322',
      description: 'Updated health protocols for COVID-19 prevention and response'
    }
  ];

  const myCWSSubmissions = [
    {
      id: 'CWS-001',
      recognizedPerson: 'Mike Johnson',
      role: 'Pilot',
      category: 'Pre-flight Safety Check',
      date: '2024-02-08',
      location: 'Hangar 3',
      description: 'Thoroughly inspected all safety equipment and documented findings before flight',
      status: 'Acknowledged'
    },
    {
      id: 'CWS-002',
      recognizedPerson: 'Sarah Wilson',
      role: 'Maintenance',
      category: 'PPE Compliance',
      date: '2024-02-05',
      location: 'Maintenance Shop',
      description: 'Consistently wearing proper safety gear including eye protection and gloves during all maintenance tasks',
      status: 'Acknowledged'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending review': case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under investigation': case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': case 'read': return 'bg-green-100 text-green-800 border-green-200';
      case 'denied': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSubmitWaiver = () => {
    toast.success('Waiver request submitted successfully');
    setShowWaiverDialog(false);
  };

  const handleSubmitHazard = () => {
    toast.success('Hazard report submitted successfully');
    setShowHazardDialog(false);
  };

  const handleCompleteDocument = (docId: string, completionCode: string) => {
    if (!completionCode.trim()) {
      toast.error('Please enter the completion code');
      return;
    }
    toast.success(`Document ${docId} marked as read with code: ${completionCode}`);
  };

  const handleUpdateAuditItem = (auditId: string, itemId: number) => {
    toast.success('Audit item updated');
  };

  const handleSubmitCWS = () => {
    toast.success('Caught Working Safely submission sent to Safety Manager! 🌟', {
      description: 'Thank you for recognizing safe work practices.'
    });
    setShowCWSDialog(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Safety Participation
          </h1>
          <p className="text-muted-foreground">Submit reports, respond to audits, and stay compliant</p>
        </div>
        
        <div className="flex gap-2 mt-4 lg:mt-0 flex-wrap">
          <Dialog open={showCWSDialog} onOpenChange={setShowCWSDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Award className="w-4 h-4 mr-2" />
                Caught Working Safely
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Caught Working Safely Submission
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Recognize someone for working safely and following proper procedures. This submission will be sent to the Safety Manager.
                </p>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Person Being Recognized *</Label>
                    <Input placeholder="Full name" />
                  </div>
                  <div>
                    <Label>Their Role/Department *</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pilot">Pilot</SelectItem>
                        <SelectItem value="inflight">Inflight Crew</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="scheduling">Scheduling</SelectItem>
                        <SelectItem value="admin">Admin/Support</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date Observed *</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Location *</Label>
                    <Input placeholder="e.g., Hangar 3, Ramp Area, Office" />
                  </div>
                </div>
                
                <div>
                  <Label>Category of Safe Practice *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ppe-compliance">PPE Compliance</SelectItem>
                      <SelectItem value="proper-procedures">Following Proper Procedures</SelectItem>
                      <SelectItem value="hazard-identification">Hazard Identification & Reporting</SelectItem>
                      <SelectItem value="pre-flight-safety">Pre-flight Safety Checks</SelectItem>
                      <SelectItem value="ground-safety">Ground Operations Safety</SelectItem>
                      <SelectItem value="maintenance-safety">Maintenance Safety Practices</SelectItem>
                      <SelectItem value="communication">Safety Communication</SelectItem>
                      <SelectItem value="situational-awareness">Situational Awareness</SelectItem>
                      <SelectItem value="teamwork">Safety Teamwork & Coordination</SelectItem>
                      <SelectItem value="other">Other Safe Practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Description of Safe Behavior *</Label>
                  <Textarea 
                    placeholder="Describe what you observed. What specifically did this person do that demonstrated safe work practices? Be detailed and specific."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: "Observed wearing proper eye protection and gloves while performing maintenance tasks. Also took extra time to properly secure tools before climbing ladder."
                  </p>
                </div>
                
                <div>
                  <Label>Why This Matters (Optional)</Label>
                  <Textarea 
                    placeholder="Explain the impact or importance of this safe behavior"
                    rows={2}
                  />
                </div>

                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start gap-2 mb-3">
                    <Camera className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <Label>Photo Evidence (Optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        Upload a photo if appropriate and if it doesn't compromise safety or privacy
                      </p>
                    </div>
                  </div>
                  <Input type="file" accept="image/*" />
                </div>

                <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                  <div className="flex items-start gap-2">
                    <ThumbsUp className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Positive Safety Culture</p>
                      <p className="text-sm text-green-800 mt-1">
                        Recognizing safe work practices helps build a positive safety culture. Your submission will be shared with the Safety Manager and may be featured in safety communications.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmitCWS} className="bg-green-600 hover:bg-green-700">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Recognition
                  </Button>
                  <Button variant="outline" onClick={() => setShowCWSDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showWaiverDialog} onOpenChange={setShowWaiverDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileCheck className="w-4 h-4 mr-2" />
                Request Waiver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit Waiver Request</DialogTitle>
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
                    <Label>Requested Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Detailed description of the waiver request" rows={3} />
                </div>
                
                <div>
                  <Label>Justification</Label>
                  <Textarea placeholder="Why is this waiver necessary?" rows={3} />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmitWaiver}>
                    Submit Request
                  </Button>
                  <Button variant="outline" onClick={() => setShowWaiverDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showHazardDialog} onOpenChange={setShowHazardDialog}>
            <DialogTrigger asChild>
              <Button>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Hazard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Report Safety Hazard</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hazard Title</Label>
                    <Input placeholder="Brief description of the hazard" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="airport-infrastructure">Airport Infrastructure</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="weather">Weather</SelectItem>
                        <SelectItem value="wildlife">Wildlife</SelectItem>
                        <SelectItem value="fuel-system">Fuel System</SelectItem>
                        <SelectItem value="human-factors">Human Factors</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Severity</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
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
                    <Label>Location</Label>
                    <Input placeholder="Specific location of hazard" />
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Detailed description of the hazard" rows={3} />
                </div>
                
                <div>
                  <Label>Immediate Actions Taken</Label>
                  <Textarea placeholder="What immediate actions were taken?" rows={2} />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSubmitHazard}>
                    Submit Report
                  </Button>
                  <Button variant="outline" onClick={() => setShowHazardDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">CWS Submitted</p>
                <p className="text-2xl">{myCWSSubmissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">My Waivers</p>
                <p className="text-2xl">{myWaivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Hazard Reports</p>
                <p className="text-2xl">{myHazardReports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Assigned Audits</p>
                <p className="text-2xl">{myAudits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl">
                  {myDocuments.filter(d => d.status === 'Pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cws">
            <Award className="w-4 h-4 mr-1.5" />
            CWS
          </TabsTrigger>
          <TabsTrigger value="waivers">Waivers</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Safety Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 border rounded-lg bg-green-50">
                    <Award className="w-4 h-4 mt-1 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">Caught Working Safely Submitted</p>
                      <p className="text-sm text-green-700">Recognized Mike Johnson for proper pre-flight safety</p>
                      <p className="text-xs text-muted-foreground mt-1">Feb 8, 2024</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Acknowledged
                    </Badge>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <FileCheck className="w-4 h-4 mt-1 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">Waiver Request Submitted</p>
                      <p className="text-sm text-muted-foreground">Night Flying Operations - N123AB</p>
                      <p className="text-xs text-muted-foreground mt-1">Feb 6, 2024</p>
                    </div>
                    <Badge className={getStatusColor('Pending Review')}>
                      Pending Review
                    </Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <AlertTriangle className="w-4 h-4 mt-1 text-red-600" />
                    <div className="flex-1">
                      <p className="font-medium">Hazard Report Submitted</p>
                      <p className="text-sm text-muted-foreground">Fuel System Leak - Fuel Farm</p>
                      <p className="text-xs text-muted-foreground mt-1">Feb 6, 2024</p>
                    </div>
                    <Badge className={getStatusColor('Under Investigation')}>
                      Under Investigation
                    </Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Target className="w-4 h-4 mt-1 text-purple-600" />
                    <div className="flex-1">
                      <p className="font-medium">Audit Assignment Received</p>
                      <p className="text-sm text-muted-foreground">Monthly Safety Audit - February 2024</p>
                      <p className="text-xs text-muted-foreground mt-1">Feb 5, 2024</p>
                    </div>
                    <Badge className={getStatusColor('Assigned')}>
                      60% Complete
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Safety Tasks & Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 border-2 rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900">Caught Working Safely</p>
                        <p className="text-sm text-green-700">Recognize safe work practices</p>
                      </div>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setShowCWSDialog(true)}>
                        Submit
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-yellow-50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-yellow-600" />
                      <div className="flex-1">
                        <p className="font-medium">Document Review Required</p>
                        <p className="text-sm text-muted-foreground">1 document pending your review</p>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('documents')}>
                        Review
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium">Audit Response Due</p>
                        <p className="text-sm text-muted-foreground">Complete remaining audit items</p>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('audits')}>
                        Complete
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <div className="flex-1">
                        <p className="font-medium">Safety Awareness</p>
                        <p className="text-sm text-muted-foreground">Report hazards immediately</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setShowHazardDialog(true)}>
                        Report
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cws" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    My Caught Working Safely Submissions
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Recognitions you've submitted for safe work practices
                  </p>
                </div>
                <Button onClick={() => setShowCWSDialog(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Submission
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {myCWSSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {myCWSSubmissions.map((submission) => (
                    <div key={submission.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Star className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{submission.recognizedPerson}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {submission.role}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(submission.date).toLocaleDateString()}
                              </span>
                              <span>{submission.location}</span>
                            </div>
                            <Badge className="bg-green-100 text-green-800 border-green-200 mb-2">
                              {submission.category}
                            </Badge>
                            <p className="text-sm mt-2">{submission.description}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(submission.status)}>
                          {submission.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No CWS submissions yet</p>
                  <Button onClick={() => setShowCWSDialog(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Your First Recognition
                  </Button>
                </div>
              )}

              <div className="mt-6 border-t pt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ThumbsUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Why Caught Working Safely Matters</p>
                      <p className="text-sm text-blue-800 mt-1">
                        The Caught Working Safely program strengthens our safety culture by recognizing and celebrating safe behaviors. 
                        When you submit a recognition, it goes directly to the Safety Manager and may be shared in safety communications 
                        to inspire others. Your observations help identify and reinforce best practices across our operations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waivers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Waiver Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myWaivers.map((waiver) => (
                    <TableRow key={waiver.id}>
                      <TableCell className="font-medium">{waiver.id}</TableCell>
                      <TableCell>{waiver.title}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(waiver.status)}>
                          {waiver.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(waiver.priority)}>
                          {waiver.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(waiver.submittedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Audit Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {myAudits.map((audit) => (
                  <div key={audit.id} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{audit.title}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className={getStatusColor(audit.status)}>
                            {audit.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Due: {new Date(audit.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{audit.completionRate}% Complete</div>
                        <Progress value={audit.completionRate} className="w-32 mt-1" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {audit.checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 border rounded">
                          <Checkbox 
                            checked={item.completed}
                            onCheckedChange={() => handleUpdateAuditItem(audit.id, item.id)}
                          />
                          <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                            {item.item}
                          </span>
                          {item.completed && (
                            <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Document Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myDocuments.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{doc.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <Badge className={getStatusColor(doc.status)}>
                            {doc.status}
                          </Badge>
                          {doc.dueDate && (
                            <span className="text-sm text-muted-foreground">
                              Due: {new Date(doc.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {doc.readDate && (
                            <span className="text-sm text-muted-foreground">
                              Read: {new Date(doc.readDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {doc.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Hash className="w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Enter completion code"
                                className="w-40"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCompleteDocument(doc.id, (e.target as HTMLInputElement).value);
                                  }
                                }}
                              />
                            </div>
                            <Button 
                              size="sm"
                              onClick={(e) => {
                                const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                                handleCompleteDocument(doc.id, input?.value || '');
                              }}
                            >
                              Mark as Read
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {doc.completionCode}
                            </code>
                          </div>
                        )}
                      </div>
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
}