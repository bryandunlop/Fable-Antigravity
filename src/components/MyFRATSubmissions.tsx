import React, { useState, useMemo } from 'react';
import { daysAgo } from '../lib/demoDates';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { 
  FileText, 
  Search, 
  Calendar,
  Plane,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Edit,
  Send,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  Archive
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
  // D85 (2026-08-19) — a FRAT is not approved or rejected by anybody. The crew
  // own it; the safety manager attests afterwards that they saw it. The old
  // ladder (Pending · Approved · Rejected · Requires Review) described a review
  // nobody performs, and the crew's own screen was the last place still showing
  // a pilot their assessment had been "Rejected".
  status: 'Draft' | 'Filed' | 'Seen';
  /** Written by the safety manager's attestation (see FratSeen). */
  seenByName?: string;
  seenAt?: string;
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
  formData: any; // Store original form data for editing
}

interface MyFRATSubmissionsProps {
  userRole: string;
}

export default function MyFRATSubmissions({ userRole }: MyFRATSubmissionsProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('month');

  // Get current user (in real app this would come from auth context)
  const currentUser = 'Current User'; // Would be actual authenticated user

  // Mock data for user's FRAT submissions
  const getUserSubmissions = (): FRATSubmission[] => {
    // In real app, this would fetch from API filtered by current user
    const savedSubmissions = localStorage.getItem('frat_submissions');
    const allSubmissions: FRATSubmission[] = savedSubmissions ? JSON.parse(savedSubmissions) : [];
    
    // Add comprehensive mock user submissions if none exist
    if (allSubmissions.length === 0) {
      const mockSubmissions: FRATSubmission[] = [
        {
          id: 'FRAT_USER_001',
          flightNumber: 'G650-001',
          date: daysAgo(3),
          submittedBy: currentUser,
          pilotInCommand: currentUser,
          secondInCommand: 'Captain Sarah Mitchell',
          aircraft: 'N911TK (Gulfstream G650)',
          route: 'KTEB → EGLL',
          departureTime: '22:30',
          estimatedFlightTime: '7h 45m',
          status: 'Filed',
          priority: 'Critical',
          totalScore: 21,
          maxScore: 25,
          riskLevel: 'Critical',
          submittedAt: `${daysAgo(4)}T18:45:00Z`,
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
          attachments: ['weather_brief.pdf', 'oceanic_clearance.pdf', 'alternate_planning.pdf'],
          formData: {
            flightNumber: 'G650-001',
            aircraft: 'N911TK (Gulfstream G650)',
            departure: 'KTEB',
            destination: 'EGLL',
            captainExperience: 'More than 5000 hours',
            foExperience: '3000-5000 hours',
            weatherConditions: 'Overcast/Storms',
            visibility: '1-5 miles',
            windSpeed: 'More than 20 knots',
            turbulence: 'Severe',
            timeOfDay: 'Night',
            crewFatigue: 'Tired',
            specialConsiderations: 'Transatlantic crossing with severe weather. Icing conditions forecast. Crew at end of duty period.'
          }
        },
        {
          id: 'FRAT_USER_002',
          flightNumber: 'G650-002',
          date: daysAgo(5),
          submittedBy: currentUser,
          pilotInCommand: currentUser,
          secondInCommand: 'FO Marcus Chen',
          aircraft: 'N922TK (Gulfstream G650)',
          route: 'KPBI → KTEB',
          departureTime: '14:15',
          estimatedFlightTime: '2h 45m',
          status: 'Filed',
          priority: 'Low',
          totalScore: 8,
          maxScore: 25,
          riskLevel: 'Low',
          submittedAt: `${daysAgo(5)}T12:45:00Z`,
          reviewedBy: 'Chief Pilot Robert Williams',
          reviewedAt: '2025-02-06T13:30:00Z',
          reviewComments: 'Seen by safety — standard domestic profile, no follow-up needed.',
          factors: {
            weather: 1,
            airport: 2,
            crew: 1,
            aircraft: 1,
            operation: 3
          },
          flaggedItems: [],
          attachments: ['weather_brief.pdf', 'fuel_plan.pdf'],
          formData: {
            flightNumber: 'G650-002',
            aircraft: 'N922TK (Gulfstream G650)',
            departure: 'KPBI',
            destination: 'KTEB',
            captainExperience: 'More than 5000 hours',
            foExperience: '3000-5000 hours',
            weatherConditions: 'Clear/Few clouds',
            visibility: 'Greater than 10 miles',
            windSpeed: 'Less than 10 knots',
            turbulence: 'None expected',
            timeOfDay: 'Day (sunrise to sunset)',
            crewFatigue: 'Well rested',
            specialConsiderations: 'Standard domestic operations. Excellent weather conditions.'
          }
        },
        {
          id: 'FRAT_USER_003',
          flightNumber: 'G650-003',
          date: daysAgo(6),
          submittedBy: currentUser,
          pilotInCommand: currentUser,
          secondInCommand: 'Captain Elena Rodriguez',
          aircraft: 'N933TK (Gulfstream G650)',
          route: 'KJFK → MYNN',
          departureTime: '09:45',
          estimatedFlightTime: '3h 20m',
          status: 'Filed',
          priority: 'High',
          totalScore: 16,
          maxScore: 25,
          riskLevel: 'High',
          submittedAt: `${daysAgo(6)}T07:30:00Z`,
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
          attachments: ['weather_brief.pdf', 'tropical_forecast.pdf', 'alternate_airports.pdf'],
          formData: {
            flightNumber: 'G650-003',
            aircraft: 'N933TK (Gulfstream G650)',
            departure: 'KJFK',
            destination: 'MYNN',
            captainExperience: 'More than 5000 hours',
            foExperience: '3000-5000 hours',
            weatherConditions: 'Scattered clouds',
            visibility: '5-10 miles',
            windSpeed: '10-20 knots',
            turbulence: 'Moderate',
            timeOfDay: 'Day (sunrise to sunset)',
            crewFatigue: 'Slightly tired',
            specialConsiderations: 'Caribbean routing with tropical weather monitoring required. Nassau construction ongoing.'
          }
        },
        {
          id: 'FRAT_USER_004',
          flightNumber: 'G650-004',
          date: daysAgo(7),
          submittedBy: currentUser,
          pilotInCommand: currentUser,
          aircraft: 'N944TK (Gulfstream G650)',
          route: 'KLAS → KSEA',
          departureTime: '16:30',
          estimatedFlightTime: '2h 55m',
          status: 'Filed',
          priority: 'High',
          totalScore: 19,
          maxScore: 25,
          riskLevel: 'High',
          submittedAt: `${daysAgo(7)}T14:15:00Z`,
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
          attachments: ['weather_brief.pdf', 'mountain_wave_forecast.pdf'],
          formData: {
            flightNumber: 'G650-004',
            aircraft: 'N944TK (Gulfstream G650)',
            departure: 'KLAS',
            destination: 'KSEA',
            captainExperience: '3000-5000 hours',
            foExperience: '1500-3000 hours',
            weatherConditions: 'Overcast/Storms',
            visibility: '1-5 miles',
            windSpeed: 'More than 20 knots',
            turbulence: 'Severe',
            timeOfDay: 'Day (sunrise to sunset)',
            crewFatigue: 'Very tired',
            specialConsiderations: 'Severe mountain wave activity expected. Crew fatigue concerns due to extended duty period.'
          }
        },
        {
          id: 'FRAT_DRAFT_001',
          flightNumber: 'G650-005',
          date: daysAgo(2),
          submittedBy: currentUser,
          pilotInCommand: currentUser,
          secondInCommand: 'FO Alexandra Kim',
          aircraft: 'N955TK (Gulfstream G650)',
          route: 'KORD → CYYZ',
          departureTime: '11:00',
          estimatedFlightTime: '1h 45m',
          status: 'Draft',
          priority: 'Medium',
          totalScore: 13,
          maxScore: 25,
          riskLevel: 'Medium',
          submittedAt: `${daysAgo(3)}T16:20:00Z`,
          factors: {
            weather: 3,
            airport: 2,
            crew: 2,
            aircraft: 1,
            operation: 5
          },
          flaggedItems: [
            'Snow showers forecast at Toronto',
            'International border crossing procedures'
          ],
          formData: {
            flightNumber: 'G650-005',
            aircraft: 'N955TK (Gulfstream G650)',
            departure: 'KORD',
            destination: 'CYYZ',
            captainExperience: 'More than 5000 hours',
            foExperience: '3000-5000 hours',
            weatherConditions: 'Scattered clouds',
            visibility: '5-10 miles',
            windSpeed: '10-20 knots',
            turbulence: 'Light',
            timeOfDay: 'Day (sunrise to sunset)',
            crewFatigue: 'Well rested',
            specialConsiderations: 'International flight to Toronto with potential winter weather impacts.'
          }
        },
        {
          id: 'FRAT_DRAFT_002',
          flightNumber: 'G650-006',
          date: daysAgo(1),
          submittedBy: currentUser,
          pilotInCommand: currentUser,
          aircraft: 'N966TK (Gulfstream G650)',
          route: 'KMIA → TJSJ',
          departureTime: '07:15',
          estimatedFlightTime: '2h 30m',
          status: 'Draft',
          priority: 'Low',
          totalScore: 9,
          maxScore: 25,
          riskLevel: 'Low',
          submittedAt: `${daysAgo(3)}T20:10:00Z`,
          factors: {
            weather: 2,
            airport: 2,
            crew: 1,
            aircraft: 1,
            operation: 3
          },
          flaggedItems: [],
          formData: {
            flightNumber: 'G650-006',
            aircraft: 'N966TK (Gulfstream G650)',
            departure: 'KMIA',
            destination: 'TJSJ',
            captainExperience: 'More than 5000 hours',
            foExperience: '3000-5000 hours',
            weatherConditions: 'Clear/Few clouds',
            visibility: 'Greater than 10 miles',
            windSpeed: 'Less than 10 knots',
            turbulence: 'None expected',
            timeOfDay: 'Day (sunrise to sunset)',
            crewFatigue: 'Well rested',
            specialConsiderations: 'Standard Caribbean operations to San Juan.'
          }
        },
        {
          id: 'FRAT_USER_005',
          flightNumber: 'G650-007',
          date: daysAgo(5),
          submittedBy: currentUser,
          pilotInCommand: currentUser,
          secondInCommand: 'Captain David Thompson',
          aircraft: 'N977TK (Gulfstream G650)',
          route: 'KBOS → LEMD',
          departureTime: '20:45',
          estimatedFlightTime: '6h 55m',
          status: 'Filed',
          priority: 'Medium',
          totalScore: 14,
          maxScore: 25,
          riskLevel: 'Medium',
          submittedAt: `${daysAgo(5)}T17:30:00Z`,
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
          attachments: ['weather_brief.pdf', 'oceanic_clearance.pdf', 'etops_plan.pdf'],
          formData: {
            flightNumber: 'G650-007',
            aircraft: 'N977TK (Gulfstream G650)',
            departure: 'KBOS',
            destination: 'LEMD',
            captainExperience: 'More than 5000 hours',
            foExperience: 'More than 5000 hours',
            weatherConditions: 'Scattered clouds',
            visibility: '5-10 miles',
            windSpeed: '10-20 knots',
            turbulence: 'Light',
            timeOfDay: 'Night',
            crewFatigue: 'Well rested',
            specialConsiderations: 'Transatlantic ETOPS flight to Madrid. Monitor arrival weather conditions.'
          }
        },
        {
          id: 'FRAT_USER_006',
          flightNumber: 'G650-008',
          date: '2025-01-31',
          submittedBy: currentUser,
          pilotInCommand: currentUser,
          secondInCommand: 'FO Rachel Martinez',
          aircraft: 'N988TK (Gulfstream G650)',
          route: 'PANC → RJAA',
          departureTime: '14:20',
          estimatedFlightTime: '7h 10m',
          status: 'Filed',
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
          attachments: ['weather_brief.pdf', 'pacific_routing.pdf', 'tokyo_approach.pdf'],
          formData: {
            flightNumber: 'G650-008',
            aircraft: 'N988TK (Gulfstream G650)',
            departure: 'PANC',
            destination: 'RJAA',
            captainExperience: 'More than 5000 hours',
            foExperience: '1500-3000 hours',
            weatherConditions: 'Scattered clouds',
            visibility: '5-10 miles',
            windSpeed: '10-20 knots',
            turbulence: 'Moderate',
            timeOfDay: 'Day (sunrise to sunset)',
            crewFatigue: 'Slightly tired',
            specialConsiderations: 'Trans-Pacific crossing from Anchorage to Tokyo. Extended overwater operations.'
          }
        }
      ];
      
      localStorage.setItem('frat_submissions', JSON.stringify(mockSubmissions));
      return mockSubmissions;
    }
    
    return allSubmissions.filter(submission => submission.submittedBy === currentUser);
  };

  const [submissions, setSubmissions] = useState<FRATSubmission[]>(getUserSubmissions());

  /** Legacy rows carry the retired ladder. All of it collapses to "filed" —
   *  none of those states meant anything that happened. `Seen` is derived from
   *  the attestation itself so the two can never disagree. */
  const displayStatus = (s: FRATSubmission): FRATSubmission['status'] =>
    s.status === 'Draft' ? 'Draft' : (s.seenAt ? 'Seen' : 'Filed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Seen': return 'bg-green-100 text-green-800';
      case 'Filed': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
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

  // The body of the "View submission" dialog. Rendered from both the list view and the
  // card/grid view — the grid's copy used to be an empty DialogContent, so View there
  // opened a blank modal. Takes the row's own submission so it never depends on which
  // row was clicked last.
  const renderSubmissionDialogContent = (submission: FRATSubmission) => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          FRAT Submission - {submission.flightNumber}
        </DialogTitle>
        <DialogDescription>
          View detailed Flight Risk Assessment submission for {submission.flightNumber}. Submitted on {new Date(submission.submittedAt).toLocaleString()}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Flight:</strong> {submission.flightNumber}
          </div>
          <div>
            <strong>Aircraft:</strong> {submission.aircraft}
          </div>
          <div>
            <strong>Route:</strong> {submission.route}
          </div>
          <div>
            <strong>Status:</strong> <Badge className={getStatusColor(displayStatus(submission))}>{displayStatus(submission)}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
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

        {submission.flaggedItems.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Flagged Items:</h4>
            {submission.flaggedItems.map((item, index) => (
              <Alert key={index} className="mb-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{item}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(submission => {
      const matchesSearch = 
        submission.flightNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.aircraft.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || displayStatus(submission) === statusFilter;

      // Date range filter
      const submissionDate = new Date(submission.submittedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - submissionDate.getTime()) / (1000 * 3600 * 24);
      
      let matchesDateRange = true;
      switch (dateRange) {
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
  }, [submissions, searchTerm, statusFilter, dateRange]);

  const handleDuplicateSubmission = (submission: FRATSubmission) => {
    const duplicatedData = {
      ...submission.formData,
      flightNumber: '', // Clear flight number for new submission
    };
    
    // Store the form data for editing
    localStorage.setItem('frat_edit_data', JSON.stringify(duplicatedData));
    
    // Navigate to form
    toast.success('FRAT form duplicated. Redirecting to form...');
    navigate('/frat');
  };

  const handleEditSubmission = (submission: FRATSubmission) => {
    if (displayStatus(submission) !== 'Draft') {
      toast.error('A filed FRAT is a record of the assessment you flew on — it cannot be edited.');
      return;
    }

    // Store the form data for editing
    localStorage.setItem('frat_edit_data', JSON.stringify({
      ...submission.formData,
      editingId: submission.id
    }));
    
    toast.success('Redirecting to edit form...');
    navigate('/frat');
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    const submission = submissions.find(s => s.id === submissionId);
    
    if (!submission) return;
    
    if (displayStatus(submission) !== 'Draft') {
      toast.error('Only draft submissions can be deleted');
      return;
    }

    if (window.confirm('Are you sure you want to delete this draft submission?')) {
      const updatedSubmissions = submissions.filter(s => s.id !== submissionId);
      setSubmissions(updatedSubmissions);
      localStorage.setItem('frat_submissions', JSON.stringify(updatedSubmissions));
      toast.success('Draft submission deleted');
    }
  };

  const getSubmissionStats = () => {
    const total = submissions.length;
    const drafts = submissions.filter(s => displayStatus(s) === 'Draft').length;
    const filed = submissions.filter(s => displayStatus(s) === 'Filed').length;
    const seen = submissions.filter(s => displayStatus(s) === 'Seen').length;

    return { total, drafts, pending: filed, approved: seen, rejected: 0 };
  };

  const stats = getSubmissionStats();

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            My FRAT Submissions
          </h1>
          <p className="text-muted-foreground">
            View and manage your Flight Risk Assessment submissions
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <Link to="/frat">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New FRAT Form
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      {/* The five-tile KPI strip is gone. Three of its tiles — Pending Review,
          Approved, Rejected ("Ready to fly" / "Need revision") — described a
          review nobody performs, and "Ready to fly" is the most dangerous thing
          on the page: it implies a FRAT gates dispatch. It does not. The list
          below already says what each submission is, so the counts sit beside
          the filter rather than in a row of cards. */}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search flights, routes, aircraft..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <div className="text-[13px] text-muted-foreground self-center whitespace-nowrap">
              {stats.total} filed · {stats.drafts} draft · {stats.approved} seen by safety
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Filed">Filed</SelectItem>
                <SelectItem value="Seen">Seen by safety</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="cards">Card View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My FRAT Submissions</CardTitle>
              <CardDescription>
                {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-2">No FRAT submissions found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'No submissions match your current filters.' 
                          : 'You haven\'t submitted any FRAT forms yet.'
                        }
                      </p>
                      <Link to="/frat">
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First FRAT
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    filteredSubmissions.map((submission) => (
                      <div key={submission.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <FileText className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{submission.flightNumber}</span>
                                <Badge variant="outline">{submission.aircraft}</Badge>
                                <Badge className={getStatusColor(displayStatus(submission))}>
                                  {submission.status}
                                </Badge>
                                <Badge className={getRiskLevelColor(submission.riskLevel)}>
                                  {submission.riskLevel} Risk
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {submission.route} • {new Date(submission.date).toLocaleDateString()} at {submission.departureTime}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {displayStatus(submission) === 'Draft' ? 'Saved' : 'Submitted'} {new Date(submission.submittedAt).toLocaleString()}
                              </p>
                              {submission.reviewComments && (
                                <p className="text-sm text-blue-600 mt-1">
                                  Review: {submission.reviewComments}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-4">
                              <div className="text-sm font-medium">Risk Score</div>
                              <div className="text-lg font-bold">{submission.totalScore}/{submission.maxScore}</div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                  {renderSubmissionDialogContent(submission)}
                                </DialogContent>
                              </Dialog>

                              {displayStatus(submission) === 'Draft' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSubmission(submission)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicateSubmission(submission)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>

                              {displayStatus(submission) === 'Draft' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteSubmission(submission.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions for Drafts */}
                        {displayStatus(submission) === 'Draft' && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Draft saved • Continue editing to submit
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleEditSubmission(submission)}
                                className="ml-2"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Complete & Submit
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubmissions.map((submission) => (
              <Card key={submission.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{submission.flightNumber}</CardTitle>
                    <Badge className={getStatusColor(displayStatus(submission))}>
                      {submission.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {submission.route} • {submission.aircraft}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Level</span>
                    <Badge className={getRiskLevelColor(submission.riskLevel)}>
                      {submission.riskLevel}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Score</span>
                    <span className="font-medium">{submission.totalScore}/{submission.maxScore}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm">{new Date(submission.date).toLocaleDateString()}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        {renderSubmissionDialogContent(submission)}
                      </DialogContent>
                    </Dialog>

                    {displayStatus(submission) === 'Draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditSubmission(submission)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}