import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { 
  FileText, 
  Search, 
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Download,
  MessageSquare,
  Printer,
  RefreshCw,
  SortAsc,
  SortDesc,
  Wrench
} from 'lucide-react';
import { GRATSubmission } from './StandaloneGRATForm';

export default function GRATReview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('week');
  const [sortBy, setSortBy] = useState<string>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSubmission, setSelectedSubmission] = useState<GRATSubmission | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewComments, setReviewComments] = useState('');

  // Get GRAT submissions from localStorage
  const getSubmissions = (): GRATSubmission[] => {
    const savedSubmissions = localStorage.getItem('grat_submissions');
    let submissions: GRATSubmission[] = savedSubmissions ? JSON.parse(savedSubmissions) : [];

    // Seed sample data if none exist
    if (submissions.length === 0) {
      const today = new Date();
      const d = (daysAgo: number) => new Date(today.getTime() - daysAgo * 86400000).toISOString();
      submissions = [
        {
          id: 'GRAT_SAMPLE_001',
          technicianName: 'Marcus Rivera',
          taskDate: d(1).split('T')[0],
          startTime: '08:30',
          status: 'Requires Review',
          totalScore: 22,
          maxScore: 60,
          riskLevel: 'High',
          submittedAt: d(1),
          mitigationNotes: 'Working with a second technician. Safety briefing completed. Fall protection in-use.',
          additionalNotes: 'Engine APU maintenance at night shift.',
          flaggedItems: ['Working Temperatures Below 32F', 'Unscheduled Maintenance', 'Engine/APU Maintenance', 'Work during WOCL (0200-0600 Local)', 'Working Alone']
        },
        {
          id: 'GRAT_SAMPLE_002',
          technicianName: 'Jordan Lee',
          taskDate: d(3).split('T')[0],
          startTime: '10:00',
          status: 'Approved',
          totalScore: 8,
          maxScore: 60,
          riskLevel: 'Low',
          submittedAt: d(3),
          reviewedBy: 'Safety Manager',
          reviewedAt: d(2),
          reviewComments: 'Low risk, routine inspection. Approved for operations.',
          mitigationNotes: '',
          additionalNotes: 'Pre-flight inspection only.',
          flaggedItems: ['Inspection: Pre and Post Flight']
        },
        {
          id: 'GRAT_SAMPLE_003',
          technicianName: 'Sarah Thompson',
          taskDate: d(5).split('T')[0],
          startTime: '07:00',
          status: 'Pending',
          totalScore: 13,
          maxScore: 60,
          riskLevel: 'Medium',
          submittedAt: d(5),
          mitigationNotes: 'Two-person team assigned. Supervisor oversight required.',
          additionalNotes: 'Hydraulic system maintenance during scheduled window.',
          flaggedItems: ['Hydraulic Maintenance', 'Ladder or Maintenance Platform Use', 'Duty Time 8 to 12 hours']
        },
        {
          id: 'GRAT_SAMPLE_004',
          technicianName: 'David Kim',
          taskDate: d(10).split('T')[0],
          startTime: '14:00',
          status: 'Closed',
          totalScore: 6,
          maxScore: 60,
          riskLevel: 'Low',
          submittedAt: d(10),
          reviewedBy: 'Safety Manager',
          reviewedAt: d(9),
          reviewComments: 'Routine fuel servicing. All checks complete.',
          closedBy: 'Safety Manager',
          closedAt: d(8),
          mitigationNotes: '',
          additionalNotes: 'Standard fuel servicing, no anomalies.',
          flaggedItems: ['Servicing: Fuel']
        },
        {
          id: 'GRAT_SAMPLE_005',
          technicianName: 'Aisha Patel',
          taskDate: d(2).split('T')[0],
          startTime: '09:15',
          status: 'Requires Review',
          totalScore: 21,
          maxScore: 60,
          riskLevel: 'High',
          submittedAt: d(2),
          mitigationNotes: 'Peer review required. Second tech on standby. Local thunderstorm window passed.',
          additionalNotes: 'Aircraft jacking for landing gear inspection.',
          flaggedItems: ['Local Thunderstorms', 'Aircraft Jacking', 'Electrical System Maintenance', 'Hydraulic Maintenance', 'Contract Aircraft Mx Personnel']
        }
      ];
      localStorage.setItem('grat_submissions', JSON.stringify(submissions));
    }

    // Filter out drafts
    return submissions.filter(submission =>
      submission.status !== 'Draft'
    );
  };

  const [submissions, setSubmissions] = useState<GRATSubmission[]>([]);

  // Load submissions on component mount and set up refresh
  React.useEffect(() => {
    const loadSubmissions = () => {
      const freshSubmissions = getSubmissions();
      setSubmissions(freshSubmissions);
    };

    loadSubmissions();
    const interval = setInterval(loadSubmissions, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Requires Review': return 'bg-orange-100 text-orange-800';
      case 'Closed': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAndSortedSubmissions = useMemo(() => {
    let filtered = submissions.filter(submission => {
      const matchesSearch = 
        submission.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;

      // Date range filter
      const submissionDate = new Date(submission.submittedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - submissionDate.getTime()) / (1000 * 3600 * 24);
      
      let matchesDateRange = true;
      switch (dateRange) {
        case 'today':
          matchesDateRange = daysDiff < 1;
          break;
        case 'week':
          matchesDateRange = daysDiff < 7;
          break;
        case 'month':
          matchesDateRange = daysDiff < 30;
          break;
        case 'all':
          matchesDateRange = true;
          break;
      }

      return matchesSearch && matchesStatus && matchesDateRange;
    });

    // Sort submissions
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'submittedAt':
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
        case 'totalScore':
          aValue = a.totalScore;
          bValue = b.totalScore;
          break;
        case 'technicianName':
          aValue = a.technicianName;
          bValue = b.technicianName;
          break;
        default:
          aValue = a[sortBy as keyof GRATSubmission];
          bValue = b[sortBy as keyof GRATSubmission];
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [submissions, searchTerm, statusFilter, dateRange, sortBy, sortOrder]);

  const handleMarkAsClosed = (submissionId: string) => {
    const closedAt = new Date().toISOString();
    const closedBy = 'Safety Manager'; // In production, get from auth context

    const updated = submissions.map(sub =>
      sub.id === submissionId
        ? { ...sub, status: 'Closed' as const, closedBy, closedAt }
        : sub
    );
    setSubmissions(updated);

    const allSubmissions = JSON.parse(localStorage.getItem('grat_submissions') || '[]');
    const updatedAll = allSubmissions.map((sub: any) =>
      sub.id === submissionId ? { ...sub, status: 'Closed', closedBy, closedAt } : sub
    );
    localStorage.setItem('grat_submissions', JSON.stringify(updatedAll));
    toast.success('GRAT submission closed. Audit trail recorded.');
  };

  const handleReviewSubmission = async (decision: 'approve' | 'reject') => {
    if (!selectedSubmission) return;

    // Update the submission status
    const updatedSubmissions = submissions.map(sub => 
      sub.id === selectedSubmission.id 
        ? {
            ...sub,
            status: decision === 'approve' ? 'Approved' as const : 'Rejected' as const,
            reviewedBy: 'Safety Officer',
            reviewedAt: new Date().toISOString(),
            reviewComments
          }
        : sub
    );

    setSubmissions(updatedSubmissions);
    
    // Get all submissions (including drafts) and update the specific one
    const allSubmissions = JSON.parse(localStorage.getItem('grat_submissions') || '[]');
    const updatedAllSubmissions = allSubmissions.map((sub: any) => 
      sub.id === selectedSubmission.id 
        ? {
            ...sub,
            status: decision === 'approve' ? 'Approved' : 'Rejected',
            reviewedBy: 'Safety Officer',
            reviewedAt: new Date().toISOString(),
            reviewComments
          }
        : sub
    );
    
    localStorage.setItem('grat_submissions', JSON.stringify(updatedAllSubmissions));

    toast.success(`GRAT submission ${decision === 'approve' ? 'approved' : 'rejected'} successfully`);

    setReviewDialogOpen(false);
    setReviewComments('');
    setSelectedSubmission(null);
  };

  const getSubmissionStats = () => {
    const total = submissions.length;
    const pending = submissions.filter(s => s.status === 'Pending' || s.status === 'Requires Review').length;
    const approved = submissions.filter(s => s.status === 'Approved').length;
    const rejected = submissions.filter(s => s.status === 'Rejected').length;
    const highRisk = submissions.filter(s => s.riskLevel === 'High' || s.riskLevel === 'Critical').length;

    return { total, pending, approved, rejected, highRisk };
  };

  const stats = getSubmissionStats();

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-blue-500" />
            GRAT Forms Review
          </h1>
          <p className="text-muted-foreground">
            Review and approve Ground Risk Assessment Tool submissions
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const freshSubmissions = getSubmissions();
              setSubmissions(freshSubmissions);
              toast.success('Submissions refreshed');
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print Summary
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Ready for operations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              Needs revision
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.highRisk}</div>
            <p className="text-xs text-muted-foreground">
              Elevated risk factors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search technician, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Requires Review">Requires Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submittedAt">Submission Date</SelectItem>
                <SelectItem value="technicianName">Technician</SelectItem>
                <SelectItem value="totalScore">Risk Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* GRAT Submissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>GRAT Submissions</CardTitle>
              <CardDescription>
                {filteredAndSortedSubmissions.length} of {submissions.length} submissions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {filteredAndSortedSubmissions.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No GRAT submissions found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {submissions.length === 0 
                      ? 'No GRAT forms have been submitted yet.' 
                      : 'No submissions match your current filters.'
                    }
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const freshSubmissions = getSubmissions();
                      setSubmissions(freshSubmissions);
                      toast.success('Submissions refreshed');
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              ) : (
                filteredAndSortedSubmissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Wrench className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{submission.technicianName}</span>
                          <Badge variant="outline">{submission.id}</Badge>
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Task Date: {new Date(submission.taskDate).toLocaleDateString()} at {submission.startTime}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted: {new Date(submission.submittedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">Risk Score</div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{submission.totalScore}/{submission.maxScore}</span>
                          <Badge className={getRiskLevelColor(submission.riskLevel)}>
                            {submission.riskLevel}
                          </Badge>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        {/* Mark as Closed button — only for reviewed/approved submissions not already closed */}
                        {(submission.status === 'Approved' || submission.status === 'Requires Review' || submission.status === 'Pending') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-400 text-gray-700 hover:bg-gray-100"
                            onClick={() => {
                              if (window.confirm(`Mark GRAT for ${submission.technicianName} as Closed? This will be recorded in the audit trail.`)) {
                                handleMarkAsClosed(submission.id);
                              }
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Closed
                          </Button>
                        )}
                        {submission.status === 'Closed' && submission.closedAt && (
                          <span className="text-xs text-muted-foreground">
                            Closed {new Date(submission.closedAt).toLocaleDateString()}
                          </span>
                        )}
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Wrench className="w-5 h-5 text-blue-500" />
                              GRAT Review - {submission.id}
                            </DialogTitle>
                            <DialogDescription>
                              Ground Risk Assessment submitted by {submission.technicianName}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedSubmission && (
                            <div className="space-y-6">
                              {/* Task Information */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">Maintenance Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">ID:</span>
                                      <span>{selectedSubmission.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Technician:</span>
                                      <span>{selectedSubmission.technicianName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Task Date:</span>
                                      <span>{new Date(selectedSubmission.taskDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Start Time:</span>
                                      <span>{selectedSubmission.startTime}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Submission Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Status:</span>
                                      <Badge className={getStatusColor(selectedSubmission.status)}>{selectedSubmission.status}</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Submitted:</span>
                                      <span>{new Date(selectedSubmission.submittedAt).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Risk Level:</span>
                                      <Badge className={getRiskLevelColor(selectedSubmission.riskLevel)}>{selectedSubmission.riskLevel}</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Score:</span>
                                      <span>{selectedSubmission.totalScore} / {selectedSubmission.maxScore}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Flagged Items */}
                              {selectedSubmission.flaggedItems.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                                      Flagged Risk Factors ({selectedSubmission.flaggedItems.length})
                                    </h4>
                                    <div className="space-y-2">
                                      {selectedSubmission.flaggedItems.map((item, index) => (
                                        <Alert key={index} className="border-orange-200 bg-orange-50">
                                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                                          <AlertDescription className="text-orange-800">
                                            {item}
                                          </AlertDescription>
                                        </Alert>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Notes */}
                              {selectedSubmission.mitigationNotes && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium mb-2">Mitigation Strategies</h4>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <p className="text-sm">{selectedSubmission.mitigationNotes}</p>
                                    </div>
                                  </div>
                                </>
                              )}

                              {selectedSubmission.additionalNotes && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium mb-2">Additional Notes</h4>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <p className="text-sm">{selectedSubmission.additionalNotes}</p>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Review Comments */}
                              {selectedSubmission.reviewComments && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium mb-2">Review Comments</h4>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <p className="text-sm">{selectedSubmission.reviewComments}</p>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Reviewed by {selectedSubmission.reviewedBy} on {selectedSubmission.reviewedAt ? new Date(selectedSubmission.reviewedAt).toLocaleString() : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              )}

                              {/* Review Actions */}
                              {(selectedSubmission.status === 'Pending' || selectedSubmission.status === 'Requires Review') && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium mb-4">Review Decision</h4>
                                    <div className="space-y-4">
                                      <Textarea
                                        placeholder="Add review comments..."
                                        value={reviewComments}
                                        onChange={(e) => setReviewComments(e.target.value)}
                                        rows={3}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => handleReviewSubmission('approve')}
                                          className="bg-green-600 hover:bg-green-700"
                                        >
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Approve Task
                                        </Button>
                                        <Button
                                          onClick={() => handleReviewSubmission('reject')}
                                          variant="destructive"
                                        >
                                          <X className="w-4 h-4 mr-2" />
                                          Reject Task
                                        </Button>
                                        <Button variant="outline">
                                          <MessageSquare className="w-4 h-4 mr-2" />
                                          Request Clarification
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Flagged Items Preview */}
                  {submission.flaggedItems.length > 0 && (
                    <div className="space-y-1 mt-3 pt-3 border-t">
                      <p className="text-sm font-medium text-orange-600">Flagged Risk Factors:</p>
                      {submission.flaggedItems.slice(0, 3).map((item, index) => (
                        <p key={index} className="text-xs text-orange-700">• {item}</p>
                      ))}
                      {submission.flaggedItems.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{submission.flaggedItems.length - 3} more items
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
