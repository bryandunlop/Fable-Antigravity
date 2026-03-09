import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SafetyMyActivity from './SafetyMyActivity';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import {
  Shield,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  FileText,
  Target,
  Settings,
  CheckCircle,
  UserCheck,
  ClipboardList,
  Sliders,
  Award,
  Plus,
  MapPin,
  Calendar,
  User,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Send,
  Clock,
  Star,
  ArrowRight,
  MessageSquare,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from './ui/dropdown-menu';
import { useHazards, WORKFLOW_STAGES, HAZARD_CATEGORIES, SEVERITY_LEVELS } from '../contexts/HazardContext';
import { toast } from 'sonner';

interface SafetyDashboardProps {
  userRole?: string;
}

export default function SafetyDashboard({ userRole = 'pilot' }: SafetyDashboardProps) {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHazard, setSelectedHazard] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showWaiverDetailDialog, setShowWaiverDetailDialog] = useState(false);
  const [selectedWaiverDetail, setSelectedWaiverDetail] = useState<any>(null);
  const [waiverComment, setWaiverComment] = useState('');
  const [forwardToRole, setForwardToRole] = useState('');

  // New States for Hazard Reports
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [selectedBulletin, setSelectedBulletin] = useState<any>(null);

  useEffect(() => {
    // Check if we need to switch tabs or open dialogs based on query params
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }

    // Pass action params to My Activity if relevant
    const actionParam = searchParams.get('action');
    if (actionParam && (actionParam === 'new-waiver' || actionParam === 'new-cws')) {
      setActiveTab('my-activity');
    }
  }, [searchParams]);

  // Mock data - in real app this would come from backend
  const safetyStats = {
    pendingWaivers: 3,
    openHazards: 7,
    pendingAudits: 2,
    fratReviewsNeeded: 4,
    complianceRate: 94.2,
    myHazardReports: 2,
    myAsapReports: 1,
    cwsRecognitions: 12,
    totalWaivers: 15,
    completedAudits: 8
  };

  const isAdmin = userRole === 'admin' || userRole === 'safety';

  // Recent Activity
  const recentActivity = [
    {
      id: 1,
      type: 'hazard',
      title: 'Runway Surface Contamination',
      submittedBy: 'John Smith',
      date: '2024-02-06',
      status: 'Open',
      priority: 'High'
    },
    {
      id: 2,
      type: 'cws',
      title: 'Excellent Pre-Flight Inspection',
      submittedBy: 'Sarah Wilson',
      recognizedPerson: 'Mike Johnson',
      date: '2024-02-06',
      status: 'Approved'
    },
    {
      id: 3,
      type: 'waiver',
      title: 'Night Operations Waiver - KTEB',
      submittedBy: 'Chris Brown',
      date: '2024-02-05',
      status: 'Pending Review',
      priority: 'Medium'
    },
    {
      id: 4,
      type: 'asap',
      title: 'ASAP Report #2024-045',
      submittedBy: 'Anonymous',
      date: '2024-02-05',
      status: 'Under Review'
    }
  ];

  // CWS Recognitions
  const cwsRecognitions = [
    {
      id: 1,
      recognizedPerson: 'Mike Johnson',
      submittedBy: 'Sarah Wilson',
      behavior: 'Thorough pre-flight inspection in challenging weather conditions',
      date: '2024-02-06',
      status: 'Approved'
    },
    {
      id: 2,
      recognizedPerson: 'Emily Davis',
      submittedBy: 'John Smith',
      behavior: 'Proactive communication during maintenance coordination',
      date: '2024-02-05',
      status: 'Approved'
    },
    {
      id: 3,
      recognizedPerson: 'Robert Martinez',
      submittedBy: 'Chris Brown',
      behavior: 'Excellent adherence to SOP during abnormal situation',
      date: '2024-02-04',
      status: 'Pending'
    }
  ];

  // Lead Team roles the Safety Manager can forward waivers to
  const leadTeamRoles = [
    'VP',
    'Chief Pilot',
    'Scheduling Manager',
    'Director of Maintenance',
    'Flight Attendant Manager'
  ];

  // Waiver Requests — rich model with approval chain
  const [waiverRequests, setWaiverRequests] = useState([
    {
      id: 1,
      title: 'Night Operations Waiver - KTEB',
      type: 'Operational',
      requestor: 'Chris Brown',
      airport: 'KTEB',
      date: '2024-02-05',
      validUntil: '2024-03-05',
      status: 'Pending Review',
      priority: 'Medium',
      manual: 'FOM',
      section: '4.2.1',
      timing: 'Before',
      waiverDateTime: '2024-02-08 21:00',
      description: 'Request for night flying operations approval for aircraft N1PG on route TEB-MIA due to charter client scheduling requirements.',
      justification: 'Charter client requires late-evening departure to accommodate board meeting schedule. Crew is Part 135 night-current and route is familiar.',
      mitigationStrategies: 'Additional fuel reserves loaded. Alternate airports (KPBI, KFLL) briefed with current weather. Crew has recent night currency — PIC logged 12 night landings in past 30 days. Dispatch monitoring route weather through departure.',
      attachments: ['Night_Currency_Log_CBrown.pdf', 'Route_Weather_Brief_02082024.pdf'],
      approvalChain: [
        { step: 1, role: 'Submitter', name: 'Chris Brown', status: 'submitted', date: '2024-02-05 09:15', comment: 'Requesting waiver for night ops on Feb 8th charter.' },
        { step: 2, role: 'Safety Manager', name: '', status: 'pending', date: '', comment: '' },
        { step: 3, role: '', name: '', status: 'waiting', date: '', comment: '' }
      ]
    },
    {
      id: 2,
      title: 'Weather Minimum Waiver - KJFK',
      type: 'Weather',
      requestor: 'Mike Johnson',
      airport: 'KJFK',
      date: '2024-02-03',
      validUntil: '2024-02-10',
      status: 'Approved',
      priority: 'High',
      manual: 'GOM',
      section: '2.4.3',
      timing: 'Before',
      waiverDateTime: '2024-02-03 10:00',
      description: 'Request to operate with reduced visibility minimums for approach into KJFK RWY 31L during winter weather event.',
      justification: 'Critical passenger transport — CEO needs to reach NYC for emergency board meeting. CAT III ILS available, crew CAT III certified.',
      mitigationStrategies: 'CAT III ILS approach to RWY 31L. PIC and SIC both CAT III qualified and current. Alternate KTEB briefed with VFR conditions forecast. Enhanced dispatch monitoring of JFK weather every 15 minutes. Go/No-Go decision point at KJFK 200nm out.',
      attachments: ['CAT_III_Cert_MJohnson.pdf', 'JFK_Weather_Brief.pdf', 'Alternate_Analysis_KTEB.pdf'],
      approvalChain: [
        { step: 1, role: 'Submitter', name: 'Mike Johnson', status: 'submitted', date: '2024-02-03 07:30', comment: 'Urgent — need weather minimum waiver for JFK approach.' },
        { step: 2, role: 'Safety Manager', name: 'Tom Anderson', status: 'approved', date: '2024-02-03 08:45', comment: 'Crew qualifications verified. CAT III current. Approved with condition: alternate airport must have VFR conditions.' },
        { step: 3, role: 'Chief Pilot', name: 'James Taylor', status: 'approved', date: '2024-02-03 09:20', comment: 'Concur with Safety Manager. Crew is well qualified for this approach. Approved.' }
      ]
    },
    {
      id: 3,
      title: 'Crew Rest Waiver',
      type: 'Crew Rest',
      requestor: 'Sarah Wilson',
      airport: 'N/A',
      date: '2024-02-01',
      validUntil: '2024-02-08',
      status: 'Denied',
      priority: 'Low',
      manual: 'FOM',
      section: '6.1.2',
      timing: 'After',
      waiverDateTime: '2024-02-01 18:00',
      description: 'Request to extend flight duty period by 2 hours for crew returning from KASE repositioning leg.',
      justification: 'Mechanical delay caused 3-hour ground hold at Aspen. Crew requests FDP extension to complete repositioning to home base.',
      mitigationStrategies: 'Short repositioning leg (1.5 hrs). Crew self-reported as rested and fit. Captain has 8+ hours of sleep prior to duty day. No further flights after repositioning.',
      attachments: ['Crew_Fatigue_SelfAssessment.pdf'],
      approvalChain: [
        { step: 1, role: 'Submitter', name: 'Sarah Wilson', status: 'submitted', date: '2024-02-01 16:00', comment: 'Requesting 2-hour FDP extension for repositioning.' },
        { step: 2, role: 'Safety Manager', name: 'Tom Anderson', status: 'approved', date: '2024-02-01 16:30', comment: 'Short leg, crew self-reports rested. Forwarding to Chief Pilot for final approval.' },
        { step: 3, role: 'Chief Pilot', name: 'James Taylor', status: 'denied', date: '2024-02-01 17:15', comment: 'Denied. Crew has been on duty for 11+ hours with mechanical delay stress. Safety concern outweighs repositioning convenience. Crew should overnight at KASE.' }
      ]
    }
  ]);

  // Waiver action handlers
  const handleOpenWaiverDetail = (waiver: any) => {
    setSelectedWaiverDetail(waiver);
    setWaiverComment('');
    setForwardToRole('');
    setShowWaiverDetailDialog(true);
  };

  const handleWaiverApprove = () => {
    if (!selectedWaiverDetail) return;
    setWaiverRequests(prev => prev.map(w => {
      if (w.id !== selectedWaiverDetail.id) return w;
      const chain = [...w.approvalChain];
      const pendingIdx = chain.findIndex(s => s.status === 'pending');
      if (pendingIdx === -1) return w;
      const currentStep = chain[pendingIdx];

      // Safety Manager approves and forwards to Lead Team
      if (currentStep.role === 'Safety Manager') {
        chain[pendingIdx] = {
          ...currentStep,
          name: 'Current User',
          status: 'approved',
          date: new Date().toLocaleString(),
          comment: waiverComment || 'Approved.'
        };
        // Set next step to the chosen Lead Team role
        if (chain[pendingIdx + 1] && forwardToRole) {
          chain[pendingIdx + 1] = {
            ...chain[pendingIdx + 1],
            role: forwardToRole,
            status: 'pending'
          };
        }
        const allApproved = chain.every(s => s.status === 'approved' || s.status === 'submitted');
        return { ...w, approvalChain: chain, status: allApproved ? 'Approved' : 'Under Review' };
      } else {
        // Lead Team final approval
        chain[pendingIdx] = {
          ...currentStep,
          name: 'Current User',
          status: 'approved',
          date: new Date().toLocaleString(),
          comment: waiverComment || 'Approved.'
        };
        return { ...w, approvalChain: chain, status: 'Approved' };
      }
    }));
    setShowWaiverDetailDialog(false);
    toast.success('Waiver approved successfully');
  };

  const handleWaiverDeny = () => {
    if (!selectedWaiverDetail) return;
    setWaiverRequests(prev => prev.map(w => {
      if (w.id !== selectedWaiverDetail.id) return w;
      const chain = [...w.approvalChain];
      const pendingIdx = chain.findIndex(s => s.status === 'pending');
      if (pendingIdx === -1) return w;
      chain[pendingIdx] = {
        ...chain[pendingIdx],
        name: 'Current User',
        status: 'denied',
        date: new Date().toLocaleString(),
        comment: waiverComment || 'Denied.'
      };
      return { ...w, approvalChain: chain, status: 'Denied' };
    }));
    setShowWaiverDetailDialog(false);
    toast.error('Waiver denied');
  };

  // Check if current role can act on this waiver
  const canActOnWaiver = (waiver: any) => {
    if (!isAdmin) return false;
    const pendingStep = waiver.approvalChain.find((s: any) => s.status === 'pending');
    return !!pendingStep;
  };

  const getPendingStep = (waiver: any) => {
    return waiver.approvalChain.find((s: any) => s.status === 'pending');
  };

  // Audit Schedule
  const audits = [
    {
      id: 1,
      title: 'Monthly Safety Audit - February',
      auditor: 'Safety Team',
      scheduledDate: '2024-02-15',
      area: 'Flight Operations',
      status: 'Scheduled',
      findings: 0
    },
    {
      id: 2,
      title: 'Maintenance Records Audit',
      auditor: 'John Smith',
      scheduledDate: '2024-02-10',
      area: 'Maintenance',
      status: 'In Progress',
      findings: 2
    },
    {
      id: 3,
      title: 'Document Compliance Review',
      auditor: 'Sarah Wilson',
      scheduledDate: '2024-01-28',
      area: 'All Departments',
      status: 'Completed',
      findings: 3
    }
  ];

  const { hazards, updateHazard } = useHazards();

  const publishedHazards = useMemo(() => {
    return hazards.filter(h => {
      if (h.workflowStage !== WORKFLOW_STAGES.PUBLISHED) return false;

      const matchesSearch = h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || h.category === categoryFilter;
      const matchesSeverity = severityFilter === 'All' || h.severity === severityFilter;

      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [hazards, searchTerm, categoryFilter, severityFilter]);

  const pendingHazards = useMemo(() => {
    return isAdmin
      ? hazards.filter(h => h.workflowStage !== WORKFLOW_STAGES.PUBLISHED && h.workflowStage !== WORKFLOW_STAGES.CLOSED)
      : hazards.filter(h => h.workflowStage !== WORKFLOW_STAGES.PUBLISHED && h.workflowStage !== WORKFLOW_STAGES.CLOSED && h.reportedBy === 'Current User');
  }, [hazards, isAdmin]);

  const handlePublish = (id: string) => {
    updateHazard(id, { workflowStage: WORKFLOW_STAGES.PUBLISHED });
  };


  // ASAP Reports
  const asapReports = [
    {
      id: 1,
      reportNumber: '2024-045',
      date: '2024-02-05',
      flightPhase: 'Approach',
      status: 'Under Review'
    },
    {
      id: 2,
      reportNumber: '2024-042',
      date: '2024-02-01',
      flightPhase: 'Cruise',
      status: 'Closed'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': case 'pending': case 'pending review': case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned': case 'in progress': case 'under review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': case 'completed': case 'resolved': case 'closed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'denied': case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Safety Center
          </h1>
          <p className="text-muted-foreground">Comprehensive safety management system</p>
        </div>

        <div className="flex gap-2 mt-4 lg:mt-0">
          {isAdmin && (
            <>
              <Link to="/safety/frat-builder">
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Form Builder
                </Button>
              </Link>
              <Link to="/safety/form-fields">
                <Button variant="outline">
                  <Sliders className="w-4 h-4 mr-2" />
                  Field Manager
                </Button>
              </Link>
            </>
          )}
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto">
          <TabsTrigger value="overview" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="hazards" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Hazards</span>
            {safetyStats.openHazards > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs">{safetyStats.openHazards}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="asap" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">ASAP</span>
          </TabsTrigger>
          <TabsTrigger value="cws" className="gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">CWS</span>
          </TabsTrigger>
          <TabsTrigger value="waivers" className="gap-2">
            <FileCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Waivers</span>
            {isAdmin && safetyStats.pendingWaivers > 0 && (
              <Badge className="ml-1 h-5 px-1.5 text-xs">{safetyStats.pendingWaivers}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-activity" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">My Activity</span>
          </TabsTrigger>
          <TabsTrigger value="audits" className="gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Audits</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <UserCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="frat-review" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              <span className="hidden sm:inline">FRAT</span>
              {safetyStats.fratReviewsNeeded > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs">{safetyStats.fratReviewsNeeded}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Open Hazards</p>
                    <p className="text-2xl">{safetyStats.openHazards}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">CWS This Month</p>
                    <p className="text-2xl">{safetyStats.cwsRecognitions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Waivers</p>
                        <p className="text-2xl">{safetyStats.pendingWaivers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Audits</p>
                        <p className="text-2xl">{safetyStats.pendingAudits}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">FRAT Reviews</p>
                        <p className="text-2xl">{safetyStats.fratReviewsNeeded}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Compliance</p>
                        <p className="text-2xl">{safetyStats.complianceRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Report Hazard
                </CardTitle>
                <CardDescription>Submit a safety hazard or incident report</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setActiveTab('hazards')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Hazard Report
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-900 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Caught Working Safely
                </CardTitle>
                <CardDescription>Recognize safe behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" onClick={() => setActiveTab('cws')}>
                  <Star className="w-4 h-4 mr-2" />
                  Submit CWS Recognition
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Safety Manager Tools */}
          {isAdmin && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-purple-900 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Safety Manager Tools
                </CardTitle>
                <CardDescription>Risk assessment and hazard workflow management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/safety/manager-dashboard">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <Shield className="w-4 h-4 mr-2" />
                    Hazard Workflow Dashboard
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Process hazard reports through the complete approval workflow with GFO Risk Matrix, 5 Why's analysis, and P-A-C-E assignments
                </p>
                <Link to="/safety/risk-profile">
                  <Button className="w-full" variant="outline">
                    <Target className="w-4 h-4 mr-2" />
                    Create Safety Risk Profile
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  Comprehensive risk assessment with severity/likelihood matrix and mitigation planning
                </p>
              </CardContent>
            </Card>
          )}

          {/* Review & Deidentify Dialog */}
          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Review & Deidentify Hazard</DialogTitle>
                <DialogDescription>
                  Edit hazard details before publishing to remove any personally identifiable information (PII).
                </DialogDescription>
              </DialogHeader>
              {selectedHazard && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="id">ID</Label>
                      <Input id="id" value={selectedHazard.id} disabled />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="reporter">Reported By (Public)</Label>
                      <Input
                        id="reporter"
                        value={selectedHazard.reportedBy}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={selectedHazard.title}
                      onChange={(e) => updateHazard(selectedHazard.id, { title: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      value={selectedHazard.description}
                      onChange={(e) => updateHazard(selectedHazard.id, { description: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={selectedHazard.location}
                      onChange={(e) => updateHazard(selectedHazard.id, { location: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="correctiveAction">Corrective Actions / Details</Label>
                    <Textarea
                      id="correctiveAction"
                      rows={2}
                      placeholder="Add details about resolution or corrective actions..."
                      value={selectedHazard.correctiveActionDetails || ''}
                      onChange={(e) => updateHazard(selectedHazard.id, { correctiveActionDetails: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
                <Button onClick={() => {
                  handlePublish(selectedHazard.id);
                  setShowReviewDialog(false);
                }}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publish Now
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          {/* Safety Newsletter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Safety Newsletter
                  </CardTitle>
                  <CardDescription>Monthly safety updates and communications</CardDescription>
                </div>
                {isAdmin && (
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Newsletter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Featured Newsletter */}
                <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50/50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge className="bg-blue-600 text-white mb-2">Latest Issue</Badge>
                      <h3 className="text-xl">February 2024 Safety Newsletter</h3>
                      <p className="text-sm text-muted-foreground mt-1">Published: February 1, 2024</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">🎯 This Month's Focus: Winter Operations</h4>
                      <p className="text-sm text-muted-foreground">
                        As we continue through winter operations, we're highlighting best practices for cold weather operations,
                        de-icing procedures, and winter weather decision-making.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                      <div className="p-3 bg-white rounded border">
                        <Award className="w-5 h-5 text-green-600 mb-2" />
                        <p className="text-sm font-medium">CWS Highlights</p>
                        <p className="text-xs text-muted-foreground mt-1">12 recognitions this month for exceptional safety practices</p>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mb-2" />
                        <p className="text-sm font-medium">Safety Trends</p>
                        <p className="text-xs text-muted-foreground mt-1">3 hazard reports addressed with corrective actions</p>
                      </div>
                      <div className="p-3 bg-white rounded border">
                        <Target className="w-5 h-5 text-purple-600 mb-2" />
                        <p className="text-sm font-medium">Training Updates</p>
                        <p className="text-xs text-muted-foreground mt-1">New winter ops module available in training center</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">📋 Key Safety Reminders</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Pre-flight inspections should include thorough checks for ice and snow accumulation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Review de-icing holdover times before each flight in winter conditions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Ensure proper cold weather starting procedures are followed</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6 pt-4 border-t">
                    <Button variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      View Full Newsletter
                    </Button>
                  </div>
                </div>

                {/* Previous Newsletters */}
                <div>
                  <h4 className="font-medium mb-3">Previous Issues</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">January 2024 Safety Newsletter</p>
                          <p className="text-xs text-muted-foreground">Year-end safety review and 2024 goals</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">December 2023 Safety Newsletter</p>
                          <p className="text-xs text-muted-foreground">Holiday travel safety and year-end recognition</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hazard Reporting Tab */}
        <TabsContent value="hazards" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hazard Report Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Submit Hazard Report
                </CardTitle>
                <CardDescription>Report safety hazards and incidents anonymously or with attribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/safety/hazards">
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Open Hazard Report Form
                  </Button>
                </Link>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-2">Anonymous Reporting Available</p>
                  <p className="text-sm text-blue-700">
                    You can submit hazard reports anonymously. All submissions are reviewed and deidentified by the Safety Manager before being published.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the comprehensive 12-factor risk assessment form to report safety hazards and incidents.
                </p>
              </CardContent>
            </Card>

            {/* ASAP Report Card (Moved from Separate Tab for better access if needed, or keep original grid) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Submit ASAP Report
                </CardTitle>
                <CardDescription>Aviation Safety Action Program - Confidential Reporting</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/asap-report">
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Open ASAP Report Form
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground mt-4">
                  ASAP reports are submitted confidentially and reviewed by the safety team.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Published Hazard Reports - Full Width */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Published Hazard Reports</CardTitle>
                  <CardDescription>Finalized & deidentified safety bulletins</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search reports by title, ID, or location..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="w-4 h-4 mr-2" />
                          Filter
                          {(categoryFilter !== 'All' || severityFilter !== 'All') && (
                            <Badge variant="secondary" className="ml-2 px-1 py-0 text-[10px] rounded-full">
                              {+(categoryFilter !== 'All') + +(severityFilter !== 'All')}
                            </Badge>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end">
                        <DropdownMenuLabel>Filter Reports</DropdownMenuLabel>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Category</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={categoryFilter === 'All'} onCheckedChange={() => setCategoryFilter('All')}>
                          All Categories
                        </DropdownMenuCheckboxItem>
                        {HAZARD_CATEGORIES.slice(0, 5).map(cat => (
                          <DropdownMenuCheckboxItem key={cat} checked={categoryFilter === cat} onCheckedChange={() => setCategoryFilter(cat)}>
                            {cat}
                          </DropdownMenuCheckboxItem>
                        ))}

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Severity</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={severityFilter === 'All'} onCheckedChange={() => setSeverityFilter('All')}>
                          All Severities
                        </DropdownMenuCheckboxItem>
                        {SEVERITY_LEVELS.map(sev => (
                          <DropdownMenuCheckboxItem key={sev} checked={severityFilter === sev} onCheckedChange={() => setSeverityFilter(sev)}>
                            {sev}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {publishedHazards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publishedHazards.map((report) => (
                    <div key={report.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {report.id}
                            </Badge>
                            <Badge className={getPriorityColor(report.severity)} variant="outline">
                              {report.severity}
                            </Badge>
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                            Finalized
                          </Badge>
                        </div>
                        <p className="font-semibold text-base line-clamp-1">{report.title}</p>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {report.location}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Published: {report.workflowHistory?.find(h => h.stage === WORKFLOW_STAGES.PUBLISHED)?.date || 'Feb 1, 2024'}
                        </p>
                        <div className="mt-3 p-3 bg-accent/30 rounded border min-h-[4rem]">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Corrective Actions:</p>
                          <p className="text-sm line-clamp-2">{report.correctiveActionDetails || 'Pre-mitigation assessment complete. Corrective actions implemented.'}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => setSelectedBulletin(report)}>
                          <FileText className="w-4 h-4 mr-2 text-blue-600" />
                          View Safety Bulletin
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-accent/10">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground font-medium">No reports matching your search</p>
                  <Button variant="link" onClick={() => setSearchTerm('')}>Clear search</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Safety Manager Review Section */}
          {isAdmin && (
            <Card className="mt-6 border-2 border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <Shield className="w-5 h-5" />
                  Pending Hazard Submissions (Safety Manager Only)
                </CardTitle>
                <CardDescription>Review, deidentify, and publish hazard reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingHazards.map((submission) => (
                    <div key={submission.id} className="p-4 border-2 border-orange-200 rounded-lg bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                              {submission.workflowStage}
                            </Badge>
                            <Badge className={getPriorityColor(submission.severity)} variant="outline">
                              {submission.severity} Severity
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Submitted by:</span>
                              <span className="ml-2 font-medium">
                                {submission.reportedBy}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Date:</span>
                              <span className="ml-2">{submission.reportedDate}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Location:</span>
                              <span className="ml-2">{submission.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded border mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Description:</p>
                        <p className="text-sm">{submission.description}</p>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                          onClick={() => navigate(`/safety/hazard-workflow/${submission.id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Review & Deidentify
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ASAP Report Tab */}
        <TabsContent value="asap" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASAP Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Submit ASAP Report
                </CardTitle>
                <CardDescription>Aviation Safety Action Program - Confidential Reporting</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/asap-report">
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Open ASAP Report Form
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground mt-4">
                  ASAP reports are submitted confidentially and reviewed by the safety team.
                </p>
              </CardContent>
            </Card>

            {/* ASAP Reports List */}
            <Card>
              <CardHeader>
                <CardTitle>My ASAP Reports</CardTitle>
                <CardDescription>Your submitted reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {asapReports.map((report) => (
                    <div key={report.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">Report #{report.reportNumber}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{report.date}</span>
                            <span>•</span>
                            <span>{report.flightPhase}</span>
                          </div>
                          <Badge className={`${getStatusColor(report.status)} mt-2`} variant="outline">
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CWS Tab */}
        <TabsContent value="cws" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CWS Submission Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Recognize Safe Behavior
                </CardTitle>
                <CardDescription>Submit a Caught Working Safely recognition</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/user-safety?action=new-cws">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Star className="w-4 h-4 mr-2" />
                    Submit CWS Recognition
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground mt-4">
                  Recognize colleagues who demonstrate safe work practices and adherence to procedures.
                </p>
              </CardContent>
            </Card>

            {/* Recent CWS */}
            <Card>
              <CardHeader>
                <CardTitle>Recent CWS Recognitions</CardTitle>
                <CardDescription>{safetyStats.cwsRecognitions} recognitions this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cwsRecognitions.map((cws) => (
                    <div key={cws.id} className="p-3 border rounded-lg bg-green-50/50">
                      <div className="flex items-start gap-3">
                        <Award className="w-5 h-5 text-green-600 mt-1" />
                        <div className="flex-1">
                          <p className="font-medium">{cws.recognizedPerson}</p>
                          <p className="text-sm text-muted-foreground mt-1">{cws.behavior}</p>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <span>Submitted by {cws.submittedBy}</span>
                            <span>•</span>
                            <span>{cws.date}</span>
                          </div>
                          <Badge className={`${getStatusColor(cws.status)} mt-2`} variant="outline">
                            {cws.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Waivers Tab */}
        <TabsContent value="waivers" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg">Waiver Management</h2>
              <p className="text-sm text-muted-foreground">Review and manage waiver requests</p>
            </div>
            <Link to="/user-safety?action=new-waiver">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Request Waiver
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Waiver Requests</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="Search waivers..." className="w-64" />
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {waiverRequests.map((waiver) => (
                  <div key={waiver.id} className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer" onClick={() => handleOpenWaiverDetail(waiver)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{waiver.title}</p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Requestor:</span>
                            <span className="ml-2">{waiver.requestor}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Airport:</span>
                            <span className="ml-2">{waiver.airport}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Submitted:</span>
                            <span className="ml-2">{waiver.date}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valid Until:</span>
                            <span className="ml-2">{waiver.validUntil}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge className={getStatusColor(waiver.status)} variant="outline">
                            {waiver.status}
                          </Badge>
                          <Badge className={getPriorityColor(waiver.priority)} variant="outline">
                            {waiver.priority}
                          </Badge>
                          <Badge variant="outline">{waiver.type}</Badge>
                        </div>
                        {/* Approval chain preview */}
                        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                          {waiver.approvalChain.map((step: any, idx: number) => (
                            <React.Fragment key={idx}>
                              <span className={`flex items-center gap-1 ${step.status === 'approved' ? 'text-green-600' :
                                step.status === 'denied' ? 'text-red-600' :
                                  step.status === 'pending' ? 'text-yellow-600 font-medium' :
                                    step.status === 'submitted' ? 'text-blue-600' : ''
                                }`}>
                                {step.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                                {step.status === 'denied' && <XCircle className="w-3 h-3" />}
                                {step.status === 'pending' && <Clock className="w-3 h-3" />}
                                {step.status === 'submitted' && <Send className="w-3 h-3" />}
                                {step.status === 'waiting' && <Clock className="w-3 h-3 opacity-30" />}
                                {step.role || 'Lead Team'}
                              </span>
                              {idx < waiver.approvalChain.length - 1 && (
                                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleOpenWaiverDetail(waiver); }}>
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Waiver Detail Dialog */}
          <Dialog open={showWaiverDetailDialog} onOpenChange={setShowWaiverDetailDialog}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              {selectedWaiverDetail && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileCheck className="w-5 h-5" />
                      {selectedWaiverDetail.title}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2 pt-1">
                      <Badge className={getStatusColor(selectedWaiverDetail.status)} variant="outline">
                        {selectedWaiverDetail.status}
                      </Badge>
                      <Badge className={getPriorityColor(selectedWaiverDetail.priority)} variant="outline">
                        {selectedWaiverDetail.priority}
                      </Badge>
                      <Badge variant="outline">{selectedWaiverDetail.type}</Badge>
                    </DialogDescription>
                  </DialogHeader>

                  {/* Waiver Details */}
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Requestor</Label>
                        <p className="font-medium flex items-center gap-1 mt-1"><User className="w-4 h-4" /> {selectedWaiverDetail.requestor}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Airport</Label>
                        <p className="font-medium mt-1">{selectedWaiverDetail.airport}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Manual Reference</Label>
                        <p className="font-medium mt-1">{selectedWaiverDetail.manual}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Section</Label>
                        <p className="font-medium mt-1">{selectedWaiverDetail.section}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Waiver Date & Time</Label>
                        <p className="font-medium flex items-center gap-1 mt-1"><Calendar className="w-4 h-4" /> {selectedWaiverDetail.waiverDateTime}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Submitted</Label>
                        <p className="font-medium flex items-center gap-1 mt-1"><Clock className="w-4 h-4" /> {selectedWaiverDetail.timing === 'Before' ? 'Before the waiver' : 'After the waiver'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Submission Date</Label>
                        <p className="font-medium mt-1">{selectedWaiverDetail.date}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Valid Until</Label>
                        <p className="font-medium mt-1">{selectedWaiverDetail.validUntil}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-muted-foreground">Description of Waiver</Label>
                      <p className="mt-1 text-sm">{selectedWaiverDetail.description}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Justification</Label>
                      <p className="mt-1 text-sm">{selectedWaiverDetail.justification}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Mitigation Strategies</Label>
                      <p className="mt-1 text-sm">{selectedWaiverDetail.mitigationStrategies}</p>
                    </div>
                    {selectedWaiverDetail.attachments && selectedWaiverDetail.attachments.length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">Attachments</Label>
                        <div className="mt-2 space-y-1">
                          {selectedWaiverDetail.attachments.map((file: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-accent/30 rounded border">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-700 hover:underline cursor-pointer">{file}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Approval Timeline */}
                    <div className="border-t pt-4">
                      <h3 className="font-medium flex items-center gap-2 mb-4">
                        <ClipboardList className="w-4 h-4" />
                        Approval Chain
                      </h3>
                      <div className="space-y-0">
                        {selectedWaiverDetail.approvalChain.map((step: any, idx: number) => (
                          <div key={idx} className="flex gap-3">
                            {/* Timeline line */}
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${step.status === 'approved' ? 'bg-green-500' :
                                step.status === 'denied' ? 'bg-red-500' :
                                  step.status === 'pending' ? 'bg-yellow-500' :
                                    step.status === 'submitted' ? 'bg-blue-500' :
                                      'bg-gray-200 text-gray-500'
                                }`}>
                                {step.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                                {step.status === 'denied' && <XCircle className="w-4 h-4" />}
                                {step.status === 'pending' && <Clock className="w-4 h-4" />}
                                {step.status === 'submitted' && <Send className="w-4 h-4" />}
                                {step.status === 'waiting' && <span>{step.step}</span>}
                              </div>
                              {idx < selectedWaiverDetail.approvalChain.length - 1 && (
                                <div className={`w-0.5 h-full min-h-[2rem] ${step.status === 'approved' || step.status === 'submitted' ? 'bg-green-300' :
                                  step.status === 'denied' ? 'bg-red-300' : 'bg-gray-200'
                                  }`} />
                              )}
                            </div>
                            {/* Step content */}
                            <div className={`flex-1 pb-4 ${step.status === 'waiting' ? 'opacity-40' : ''
                              }`}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{step.role || 'Lead Team (Pending Assignment)'}</span>
                                {step.name && <span className="text-xs text-muted-foreground">— {step.name}</span>}
                              </div>
                              {step.date && (
                                <p className="text-xs text-muted-foreground mt-0.5">{step.date}</p>
                              )}
                              {step.comment && (
                                <div className="mt-2 p-3 bg-accent/50 rounded-lg border text-sm">
                                  <MessageSquare className="w-3 h-3 inline mr-1.5 text-muted-foreground" />
                                  {step.comment}
                                </div>
                              )}
                              {step.status === 'pending' && (
                                <Badge className="mt-2 bg-yellow-100 text-yellow-800 border-yellow-200" variant="outline">Awaiting Review</Badge>
                              )}
                              {step.status === 'waiting' && (
                                <p className="text-xs text-muted-foreground mt-1">Waiting for previous step</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Section — only if there's a pending step and user is admin */}
                    {canActOnWaiver(selectedWaiverDetail) && (() => {
                      const pendingStep = getPendingStep(selectedWaiverDetail);
                      const isSafetyManagerStep = pendingStep?.role === 'Safety Manager';
                      return (
                        <div className="border-t pt-4 space-y-3">
                          <h3 className="font-medium">Your Decision</h3>
                          {isSafetyManagerStep && (
                            <div>
                              <Label>Forward to Lead Team Role</Label>
                              <Select value={forwardToRole} onValueChange={setForwardToRole}>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select who to forward for final approval" />
                                </SelectTrigger>
                                <SelectContent>
                                  {leadTeamRoles.map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div>
                            <Label>Comment</Label>
                            <Textarea
                              className="mt-1"
                              rows={3}
                              placeholder="Add your review comments..."
                              value={waiverComment}
                              onChange={(e) => setWaiverComment(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleWaiverApprove}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={isSafetyManagerStep && !forwardToRole}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {isSafetyManagerStep ? 'Approve & Forward' : 'Approve'}
                            </Button>
                            <Button onClick={handleWaiverDeny} variant="destructive">
                              <XCircle className="w-4 h-4 mr-2" />
                              Deny
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Audits Tab */}
        <TabsContent value="audits" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg">Internal Audits</h2>
              <p className="text-sm text-muted-foreground">Schedule and manage safety audits</p>
            </div>
            {isAdmin && (
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Audit
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Audit Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {audits.map((audit) => (
                  <div key={audit.id} className="p-4 border rounded-lg hover:bg-accent/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{audit.title}</p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Auditor:</span>
                            <span className="ml-2">{audit.auditor}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <span className="ml-2">{audit.scheduledDate}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Area:</span>
                            <span className="ml-2">{audit.area}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Findings:</span>
                            <span className="ml-2">{audit.findings}</span>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(audit.status)} mt-3`} variant="outline">
                          {audit.status}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Document Compliance Tracking
              </CardTitle>
              <CardDescription>Monitor document acknowledgments and compliance rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/safety/compliance">
                <Button className="w-full">
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Compliance Dashboard
                </Button>
              </Link>
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-semibold text-green-900">{safetyStats.complianceRate}%</p>
                <p className="text-sm text-green-700 mt-1">Overall Compliance Rate</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FRAT Review Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="frat-review" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  FRAT Outcomes Review
                </CardTitle>
                <CardDescription>Review flight risk assessment submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/frat/review">
                  <Button className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Open FRAT Review Dashboard
                  </Button>
                </Link>
                <div className="mt-6">
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div>
                      <p className="font-medium text-blue-900">Pending Reviews</p>
                      <p className="text-sm text-blue-700">FRAT submissions awaiting approval</p>
                    </div>
                    <div className="text-3xl font-semibold text-blue-900">
                      {safetyStats.fratReviewsNeeded}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* View Bulletin Dialog */}
      <Dialog open={!!selectedBulletin} onOpenChange={(open) => !open && setSelectedBulletin(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedBulletin && (
            <div className="space-y-6">
              <div className="bg-red-50 border-b border-red-100 p-6 -mx-6 -mt-6 rounded-t-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-red-900">Safety Bulletin</h3>
                    <p className="text-sm text-red-700 font-medium">Ref: {selectedBulletin.id}</p>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mt-4 leading-tight">
                  {selectedBulletin.title}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border">
                <div>
                  <p className="text-muted-foreground mb-1">Date</p>
                  <p className="font-medium flex items-center gap-2"><Calendar className="w-4 h-4" /> {selectedBulletin.reportedDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Location</p>
                  <p className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> {selectedBulletin.location}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Category</p>
                  <Badge variant="outline">{selectedBulletin.category}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Severity / Risk Level</p>
                  <Badge variant="outline" className={getPriorityColor(selectedBulletin.severity)}>{selectedBulletin.severity}</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2 border-b pb-2">Description of Event</h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedBulletin.description}
                </p>
              </div>

              {selectedBulletin.immediateActions && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 border-b pb-2">Immediate Actions Taken</h4>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedBulletin.immediateActions}
                  </p>
                </div>
              )}

              <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
                <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Final Corrective Actions & Mitigations
                </h4>
                <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">
                  {selectedBulletin.correctiveActionDetails || selectedBulletin.finalCorrectiveAction || 'Corrective actions have been implemented and verified. Operating procedures have been updated as necessary to prevent recurrence.'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 border-t pt-4">
            <Button onClick={() => setSelectedBulletin(null)}>Close Bulletin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}