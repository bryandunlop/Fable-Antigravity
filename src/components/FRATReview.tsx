import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  User,
  Plane,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Download,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Printer,
  Mail,
  Edit,
  Archive,
  Star,
  BarChart3,
  RefreshCw,
  SortAsc,
  SortDesc
} from 'lucide-react';

interface FRATSubmission {
  id: string;
  flightNumber: string;
  date: string;
  submittedBy: string;
  pilotInCommand: string;
  secondInCommand?: string;
  aircraft: string;
  route: string;
  departureTime: string;
  estimatedFlightTime: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Requires Review';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  totalScore: number;
  maxScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  factors: {
    weather: number;
    airport: number;
    crew: number;
    aircraft: number;
    operation: number;
  };
  flaggedItems: string[];
  attachments?: string[];
}

export default function FRATReview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('week');
  const [sortBy, setSortBy] = useState<string>('submittedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSubmission, setSelectedSubmission] = useState<FRATSubmission | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject' | ''>('');
  const [reviewComments, setReviewComments] = useState('');

  // Get FRAT submissions from localStorage (includes user submissions)
  const getSubmissions = (): FRATSubmission[] => {
    const savedSubmissions = localStorage.getItem('frat_submissions');
    let submissions: FRATSubmission[] = savedSubmissions ? JSON.parse(savedSubmissions) : [];
    
    // Add comprehensive mock submissions matching MyFRATSubmissions if none exist
    if (submissions.length === 0) {
      submissions = [
        {
          id: 'FRAT_USER_001',
          flightNumber: 'G650-001',
          date: '2025-02-08',
          submittedBy: 'Current User',
          pilotInCommand: 'Current User',
          secondInCommand: 'Captain Sarah Mitchell',
          aircraft: 'N911TK (Gulfstream G650)',
          route: 'KTEB → EGLL',
          departureTime: '22:30',
          estimatedFlightTime: '7h 45m',
          status: 'Pending',
          priority: 'Critical',
          totalScore: 21,
          maxScore: 25,
          riskLevel: 'Critical',
          submittedAt: '2025-02-07T18:45:00Z',
          factors: {
            weather: 5,
            airport: 4,
            crew: 3,
            aircraft: 2,
            operation: 7
          },
          flaggedItems: [
            'Severe icing conditions forecast over North Atlantic',
            'London Heathrow fog conditions expected',
            'Captain fatigue due to previous duty cycle',
            'First international flight for SIC this month'
          ],
          attachments: ['weather_brief.pdf', 'oceanic_clearance.pdf', 'alternate_planning.pdf']
        },
        {
          id: 'FRAT_USER_002',
          flightNumber: 'G650-002',
          date: '2025-02-06',
          submittedBy: 'Current User',
          pilotInCommand: 'Current User',
          secondInCommand: 'FO Marcus Chen',
          aircraft: 'N922TK (Gulfstream G650)',
          route: 'KPBI → KTEB',
          departureTime: '14:15',
          estimatedFlightTime: '2h 45m',
          status: 'Approved',
          priority: 'Low',
          totalScore: 8,
          maxScore: 25,
          riskLevel: 'Low',
          submittedAt: '2025-02-06T12:45:00Z',
          reviewedBy: 'Chief Pilot Robert Williams',
          reviewedAt: '2025-02-06T13:30:00Z',
          reviewComments: 'Standard domestic flight profile. Weather conditions favorable. Approved for operations.',
          factors: {
            weather: 1,
            airport: 2,
            crew: 1,
            aircraft: 1,
            operation: 3
          },
          flaggedItems: [],
          attachments: ['weather_brief.pdf', 'fuel_plan.pdf']
        },
        {
          id: 'FRAT_USER_003',
          flightNumber: 'G650-003',
          date: '2025-02-05',
          submittedBy: 'Current User',
          pilotInCommand: 'Current User',
          secondInCommand: 'Captain Elena Rodriguez',
          aircraft: 'N933TK (Gulfstream G650)',
          route: 'KJFK → MYNN',
          departureTime: '09:45',
          estimatedFlightTime: '3h 20m',
          status: 'Requires Review',
          priority: 'High',
          totalScore: 16,
          maxScore: 25,
          riskLevel: 'High',
          submittedAt: '2025-02-05T07:30:00Z',
          reviewedBy: 'Safety Manager Jennifer Park',
          reviewedAt: '2025-02-05T14:20:00Z',
          reviewComments: 'Caribbean routing approved but monitor tropical weather development. Confirm ETOPS alternate availability.',
          factors: {
            weather: 3,
            airport: 4,
            crew: 2,
            aircraft: 1,
            operation: 6
          },
          flaggedItems: [
            'Tropical storm activity in Caribbean',
            'Nassau Airport runway construction',
            'Limited maintenance facilities at destination'
          ],
          attachments: ['weather_brief.pdf', 'tropical_forecast.pdf', 'alternate_airports.pdf']
        },
        {
          id: 'FRAT_USER_004',
          flightNumber: 'G650-004',
          date: '2025-02-04',
          submittedBy: 'Current User',
          pilotInCommand: 'Current User',
          aircraft: 'N944TK (Gulfstream G650)',
          route: 'KLAS → KSEA',
          departureTime: '16:30',
          estimatedFlightTime: '2h 55m',
          status: 'Rejected',
          priority: 'High',
          totalScore: 19,
          maxScore: 25,
          riskLevel: 'High',
          submittedAt: '2025-02-04T14:15:00Z',
          reviewedBy: 'Chief Pilot Robert Williams',
          reviewedAt: '2025-02-04T15:45:00Z',
          reviewComments: 'Flight rejected due to severe mountain wave conditions and crew duty time limitations. Recommend postponement until conditions improve.',
          factors: {
            weather: 5,
            airport: 3,
            crew: 4,
            aircraft: 1,
            operation: 6
          },
          flaggedItems: [
            'Severe mountain wave activity forecast',
            'Crew approaching maximum duty time',
            'Seattle approach minimums degraded'
          ],
          attachments: ['weather_brief.pdf', 'mountain_wave_forecast.pdf']
        },
        {
          id: 'FRAT_USER_005',
          flightNumber: 'G650-007',
          date: '2025-02-02',
          submittedBy: 'Current User',
          pilotInCommand: 'Current User',
          secondInCommand: 'Captain David Thompson',
          aircraft: 'N977TK (Gulfstream G650)',
          route: 'KBOS → LEMD',
          departureTime: '20:45',
          estimatedFlightTime: '6h 55m',
          status: 'Approved',
          priority: 'Medium',
          totalScore: 14,
          maxScore: 25,
          riskLevel: 'Medium',
          submittedAt: '2025-02-02T17:30:00Z',
          reviewedBy: 'International Operations Manager Lisa Chang',
          reviewedAt: '2025-02-02T19:15:00Z',
          reviewComments: 'Transatlantic flight approved. Weather conditions acceptable for ETOPS operations. Monitor Madrid arrival conditions.',
          factors: {
            weather: 2,
            airport: 3,
            crew: 2,
            aircraft: 1,
            operation: 6
          },
          flaggedItems: [
            'ETOPS routing over North Atlantic',
            'Madrid fog potential in early morning'
          ],
          attachments: ['weather_brief.pdf', 'oceanic_clearance.pdf', 'etops_plan.pdf']
        },
        {
          id: 'FRAT_USER_006',
          flightNumber: 'G650-008',
          date: '2025-01-31',
          submittedBy: 'Current User',
          pilotInCommand: 'Current User',
          secondInCommand: 'FO Rachel Martinez',
          aircraft: 'N988TK (Gulfstream G650)',
          route: 'PANC → RJAA',
          departureTime: '14:20',
          estimatedFlightTime: '7h 10m',
          status: 'Approved',
          priority: 'High',
          totalScore: 17,
          maxScore: 25,
          riskLevel: 'High',
          submittedAt: '2025-01-31T10:45:00Z',
          reviewedBy: 'Pacific Operations Manager Tom Wilson',
          reviewedAt: '2025-01-31T12:30:00Z',
          reviewComments: 'Trans-Pacific flight approved with enhanced monitoring. Weather conditions acceptable for Pacific crossing.',
          factors: {
            weather: 3,
            airport: 4,
            crew: 2,
            aircraft: 1,
            operation: 7
          },
          flaggedItems: [
            'Pacific crossing - extended overwater',
            'Tokyo Narita high traffic density',
            'Time zone adjustment for crew'
          ],
          attachments: ['weather_brief.pdf', 'pacific_routing.pdf', 'tokyo_approach.pdf']
        }
      ];
      localStorage.setItem('frat_submissions', JSON.stringify(submissions));
    }
    
    return submissions.filter(submission => 
      submission.status !== 'Draft' // Only show submitted forms to Safety
    );
  };

  const [submissions, setSubmissions] = useState<FRATSubmission[]>([]);

  // Load submissions on component mount and set up refresh
  React.useEffect(() => {
    const loadSubmissions = () => {
      const freshSubmissions = getSubmissions();
      setSubmissions(freshSubmissions);
    };

    loadSubmissions();
    
    // Set up interval to refresh submissions every 30 seconds
    const interval = setInterval(loadSubmissions, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Requires Review': return 'bg-orange-100 text-orange-800';
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Low': return 'bg-blue-100 text-blue-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAndSortedSubmissions = useMemo(() => {
    let filtered = submissions.filter(submission => {
      const matchesSearch = 
        submission.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.aircraft.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || submission.priority === priorityFilter;

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

      return matchesSearch && matchesStatus && matchesPriority && matchesDateRange;
    });

    // Sort submissions
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'submittedAt':
          aValue = new Date(a.submittedAt);
          bValue = new Date(b.submittedAt);
          break;
        case 'flightNumber':
          aValue = a.flightNumber;
          bValue = b.flightNumber;
          break;
        case 'totalScore':
          aValue = a.totalScore;
          bValue = b.totalScore;
          break;
        case 'priority':
          const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        default:
          aValue = a[sortBy as keyof FRATSubmission];
          bValue = b[sortBy as keyof FRATSubmission];
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [submissions, searchTerm, statusFilter, priorityFilter, dateRange, sortBy, sortOrder]);

  const handleReviewSubmission = async (decision: 'approve' | 'reject') => {
    if (!selectedSubmission) return;

    // In a real app, this would make an API call
    console.log('Reviewing submission:', {
      id: selectedSubmission.id,
      decision,
      comments: reviewComments
    });

    // Update the submission status
    const updatedSubmissions = submissions.map(sub => 
      sub.id === selectedSubmission.id 
        ? {
            ...sub,
            status: decision === 'approve' ? 'Approved' as const : 'Rejected' as const,
            reviewedBy: 'Safety Officer', // Would be actual user
            reviewedAt: new Date().toISOString(),
            reviewComments
          }
        : sub
    );

    // Update both local state and localStorage
    setSubmissions(updatedSubmissions);
    
    // Get all submissions (including drafts) and update the specific one
    const allSubmissions = JSON.parse(localStorage.getItem('frat_submissions') || '[]');
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
    
    localStorage.setItem('frat_submissions', JSON.stringify(updatedAllSubmissions));

    // Show success message
    toast.success(`FRAT submission ${decision === 'approve' ? 'approved' : 'rejected'} successfully`);

    setReviewDialogOpen(false);
    setReviewDecision('');
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
            <FileText className="w-6 h-6 text-blue-500" />
            FRAT Forms Review
          </h1>
          <p className="text-muted-foreground">
            Review and approve Flight Risk Assessment Tool submissions
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search flights, pilots, routes..."
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
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
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
                <SelectItem value="flightNumber">Flight Number</SelectItem>
                <SelectItem value="totalScore">Risk Score</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* FRAT Submissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>FRAT Submissions</CardTitle>
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
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No FRAT submissions found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {submissions.length === 0 
                      ? 'No FRAT forms have been submitted yet.' 
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
                        <FileText className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{submission.flightNumber}</span>
                          <Badge variant="outline">{submission.aircraft}</Badge>
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status}
                          </Badge>
                          <Badge className={getPriorityColor(submission.priority)}>
                            {submission.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {submission.route} • {new Date(submission.date).toLocaleDateString()} at {submission.departureTime}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted by {submission.submittedBy} • {new Date(submission.submittedAt).toLocaleString()}
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
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-blue-500" />
                              FRAT Review - {submission.flightNumber}
                            </DialogTitle>
                            <DialogDescription>
                              Flight Risk Assessment submitted by {submission.submittedBy}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedSubmission && (
                            <div className="space-y-6">
                              {/* Flight Information */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-2">Flight Details</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Flight:</span>
                                      <span>{selectedSubmission.flightNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Aircraft:</span>
                                      <span>{selectedSubmission.aircraft}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Route:</span>
                                      <span>{selectedSubmission.route}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Departure:</span>
                                      <span>{new Date(selectedSubmission.date).toLocaleDateString()} at {selectedSubmission.departureTime}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Flight Time:</span>
                                      <span>{selectedSubmission.estimatedFlightTime}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-2">Crew Information</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">PIC:</span>
                                      <span>{selectedSubmission.pilotInCommand}</span>
                                    </div>
                                    {selectedSubmission.secondInCommand && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">SIC:</span>
                                        <span>{selectedSubmission.secondInCommand}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Submitted by:</span>
                                      <span>{selectedSubmission.submittedBy}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Submitted:</span>
                                      <span>{new Date(selectedSubmission.submittedAt).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Risk Assessment Scores */}
                              <div>
                                <h4 className="font-medium mb-4">Risk Assessment Breakdown</h4>
                                <div className="grid grid-cols-5 gap-4">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{selectedSubmission.factors.weather}</div>
                                    <p className="text-xs text-blue-700">Weather</p>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{selectedSubmission.factors.airport}</div>
                                    <p className="text-xs text-green-700">Airport</p>
                                  </div>
                                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">{selectedSubmission.factors.crew}</div>
                                    <p className="text-xs text-yellow-700">Crew</p>
                                  </div>
                                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">{selectedSubmission.factors.aircraft}</div>
                                    <p className="text-xs text-purple-700">Aircraft</p>
                                  </div>
                                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <div className="text-2xl font-bold text-orange-600">{selectedSubmission.factors.operation}</div>
                                    <p className="text-xs text-orange-700">Operation</p>
                                  </div>
                                </div>
                                
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">Total Risk Score:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl font-bold">{selectedSubmission.totalScore}/{selectedSubmission.maxScore}</span>
                                      <Badge className={getRiskLevelColor(selectedSubmission.riskLevel)}>
                                        {selectedSubmission.riskLevel} Risk
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Flagged Items */}
                              {selectedSubmission.flaggedItems.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                                      Flagged Risk Factors
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
                                          Approve Flight
                                        </Button>
                                        <Button
                                          onClick={() => handleReviewSubmission('reject')}
                                          variant="destructive"
                                        >
                                          <X className="w-4 h-4 mr-2" />
                                          Reject Flight
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

                              {/* Attachments */}
                              {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium mb-2">Attachments</h4>
                                    <div className="space-y-2">
                                      {selectedSubmission.attachments.map((attachment, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                                          <FileText className="w-4 h-4 text-muted-foreground" />
                                          <span className="text-sm flex-1">{attachment}</span>
                                          <Button variant="ghost" size="sm">
                                            <Download className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}
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

                  {/* Risk Factors Summary */}
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-sm font-bold text-blue-600">{submission.factors.weather}</div>
                      <p className="text-xs text-blue-700">Weather</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-sm font-bold text-green-600">{submission.factors.airport}</div>
                      <p className="text-xs text-green-700">Airport</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded">
                      <div className="text-sm font-bold text-yellow-600">{submission.factors.crew}</div>
                      <p className="text-xs text-yellow-700">Crew</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <div className="text-sm font-bold text-purple-600">{submission.factors.aircraft}</div>
                      <p className="text-xs text-purple-700">Aircraft</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <div className="text-sm font-bold text-orange-600">{submission.factors.operation}</div>
                      <p className="text-xs text-orange-700">Operation</p>
                    </div>
                  </div>

                  {/* Flagged Items Preview */}
                  {submission.flaggedItems.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-orange-600">Flagged Risk Factors:</p>
                      {submission.flaggedItems.slice(0, 2).map((item, index) => (
                        <p key={index} className="text-xs text-orange-700">• {item}</p>
                      ))}
                      {submission.flaggedItems.length > 2 && (
                        <p className="text-xs text-muted-foreground">
                          +{submission.flaggedItems.length - 2} more items
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