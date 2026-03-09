import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Clock, // Unused but kept for structure from original file
  CheckCircle,
  UserCheck,
  MapPin,
  // FileText,
  Target,
  AlertCircle,
  // ArrowRight,
  // CheckCheck,
  Eye,
  // XCircle,
  Send,
  TrendingUp,
  Bell,
  Upload,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from './ui/checkbox';
import { useHazards, WORKFLOW_STAGES } from '../contexts/HazardContext';


interface HazardReportingProps {
  userRole?: string;
}

export default function HazardReporting({ userRole = 'pilot' }: HazardReportingProps) {
  const { hazards, submitHazard, updateHazard, currentUserId } = useHazards();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewHazardDialog, setShowNewHazardDialog] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Auto-open new hazard dialog if query param is set
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowNewHazardDialog(true);
      // Clean up URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // New Hazard Form State
  const [newHazardTitle, setNewHazardTitle] = useState('');
  const [newHazardDescription, setNewHazardDescription] = useState('');
  const [newHazardImmediateAction, setNewHazardImmediateAction] = useState('');
  const [newHazardConsequences, setNewHazardConsequences] = useState('');
  const [newHazardLocation, setNewHazardLocation] = useState('');
  const [newHazardSeverity, setNewHazardSeverity] = useState('Medium');
  // const [newHazardCategory, setNewHazardCategory] = useState(''); // Could add select for category
  const [selectedRiskFactors, setSelectedRiskFactors] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Risk Factors state
  const riskFactors = [
    'Pressure',
    'Lack of Awareness',
    'Complacency',
    'Lack of Communications',
    'Stress',
    'Lack of Teamwork',
    'Distractions',
    'Lack of Knowledge',
    'Fatigue',
    'Lack of Assertiveness',
    'Normalization of Deviance',
    'Lack of Resources'
  ];

  // Calculate days until date
  const daysUntil = (dateString: string) => {
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Check if effectiveness review is upcoming (within 7 days)
  const isEffectivenessReviewUpcoming = (reviewDate: string | undefined) => {
    if (!reviewDate) return false;
    const days = daysUntil(reviewDate);
    return days <= 7 && days >= 0;
  };

  const getWorkflowStageColor = (stage: string) => {
    switch (stage) {
      case WORKFLOW_STAGES.SUBMITTED: return 'bg-blue-100 text-blue-800 border-blue-200';
      case WORKFLOW_STAGES.SM_INVESTIGATION: return 'bg-purple-100 text-purple-800 border-purple-200';
      case WORKFLOW_STAGES.ASSIGN_MITIGATION: return 'bg-pink-100 text-pink-800 border-pink-200';
      case WORKFLOW_STAGES.MITIGATION_DEVELOPMENT: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case WORKFLOW_STAGES.SM_REVIEW: return 'bg-violet-100 text-violet-800 border-violet-200';
      case WORKFLOW_STAGES.LINE_MANAGER_APPROVAL: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case WORKFLOW_STAGES.EXEC_APPROVAL: return 'bg-orange-100 text-orange-800 border-orange-200';
      case WORKFLOW_STAGES.IMPLEMENTATION: return 'bg-teal-100 text-teal-800 border-teal-200';
      case WORKFLOW_STAGES.EFFECTIVENESS_REVIEW: return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case WORKFLOW_STAGES.CLOSED: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getWorkflowProgress = (stage: string) => {
    const stages = Object.values(WORKFLOW_STAGES);
    const currentIndex = stages.indexOf(stage);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  const filteredHazards = hazards.filter(hazard => {
    // Visibility Check
    const isSafetyOrAdmin = userRole === 'safety' || userRole === 'admin';
    const isReporter = hazard.submitterId === currentUserId; // New check using ID
    // Fallback for legacy data (allow name match if ID is missing)
    const isLegacyReporter = !hazard.submitterId && !isSafetyOrAdmin && (hazard.reportedBy === (userRole === 'pilot' ? 'Current User' : 'Anonymous')); // Rough heuristic for legacy

    // Show if:
    // 1. User is Safety/Admin
    // 2. User is the submitter (by ID)
    // 3. Hazard is explicitly published
    const isVisible = isSafetyOrAdmin || isReporter || hazard.isPublished;

    if (!isVisible) return false;

    const matchesFilter = filter === 'all' || hazard.workflowStage.toLowerCase().replace(/\s/g, '') === filter;
    const matchesSearch = hazard.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hazard.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hazard.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hazard.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleViewDetails = (hazard: any) => {
    setSelectedHazard(hazard);
    setShowDetailsDialog(true);
  };

  const handleSubmit = () => {
    if (!newHazardTitle || !newHazardDescription) {
      toast.error('Please fill in required fields');
      return;
    }

    submitHazard({
      title: newHazardTitle,
      description: newHazardDescription,
      immediateActions: newHazardImmediateAction,
      potentialConsequences: newHazardConsequences,
      location: newHazardLocation || 'Unknown',
      severity: newHazardSeverity,
      reportedBy: isAnonymous ? 'Anonymous' : (userRole === 'pilot' ? 'John Smith (Pilot)' : `Current User (${userRole})`), // Better defaults
      category: 'Safety', // Default or add field
      riskFactors: selectedRiskFactors,
      isAnonymous
    });

    toast.success('Hazard report submitted to Safety Manager');
    setShowNewHazardDialog(false);

    // Reset form
    setNewHazardTitle('');
    setNewHazardDescription('');
    setNewHazardImmediateAction('');
    setNewHazardConsequences('');
    setNewHazardLocation('');
    setNewHazardSeverity('Medium');
    setSelectedRiskFactors([]);
    setAttachedFiles([]);
    setIsAnonymous(false);
  };

  // Get hazards with upcoming effectiveness reviews
  const upcomingReviews = hazards.filter(h =>
    h.effectivenessReviewDate && isEffectivenessReviewUpcoming(h.effectivenessReviewDate)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Hazard Reporting & Management
          </h1>
          <p className="text-muted-foreground">Track and manage safety hazards through approval workflow</p>
        </div>

        <Dialog open={showNewHazardDialog} onOpenChange={setShowNewHazardDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Report New Hazard
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report New Hazard</DialogTitle>
              <DialogDescription>
                Submit a hazard report. It will be routed through Safety → Line Manager → VP → Safety for final approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Date */}
              <div>
                <Label>Date</Label>
                <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>

              {/* Title & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title / Summary</Label>
                  <Input
                    placeholder="Brief title of hazard"
                    value={newHazardTitle}
                    onChange={(e) => setNewHazardTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="Where did this occur?"
                    value={newHazardLocation}
                    onChange={(e) => setNewHazardLocation(e.target.value)}
                  />
                </div>
              </div>

              {/* Severity Selection */}
              <div>
                <Label>Initial Severity Assessment</Label>
                <Select value={newHazardSeverity} onValueChange={setNewHazardSeverity}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Minor issue, low priority</SelectItem>
                    <SelectItem value="medium">Medium - Standard safety concern</SelectItem>
                    <SelectItem value="high">High - Significant risk, urgent attention</SelectItem>
                    <SelectItem value="critical">Critical - Immediate danger, stop operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Risk Factors */}
              <div>
                <Label>Risk Factors</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 p-4 border rounded-lg bg-gray-50">
                  {riskFactors.map((factor) => (
                    <div key={factor} className="flex items-center space-x-2">
                      <Checkbox
                        id={factor}
                        checked={selectedRiskFactors.includes(factor)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedRiskFactors([...selectedRiskFactors, factor]);
                          } else {
                            setSelectedRiskFactors(selectedRiskFactors.filter(f => f !== factor));
                          }
                        }}
                      />
                      <Label
                        htmlFor={factor}
                        className="text-sm cursor-pointer"
                      >
                        {factor}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Describe the Incident / Hazard */}
              <div>
                <Label>Describe the Incident / Hazard or potential safety issue you observed</Label>
                <Textarea
                  placeholder="Provide detailed description of what you observed..."
                  rows={4}
                  className="mt-1"
                  value={newHazardDescription}
                  onChange={(e) => setNewHazardDescription(e.target.value)}
                />
              </div>

              {/* Suggested Corrective Action / Immediate Action */}
              <div>
                <Label>Immediate Actions Taken (if any)</Label>
                <Textarea
                  placeholder="What was done immediately?"
                  rows={2}
                  className="mt-1"
                  value={newHazardImmediateAction}
                  onChange={(e) => setNewHazardImmediateAction(e.target.value)}
                />
              </div>

              {/* Potential Consequences */}
              <div>
                <Label>Potential Consequences (if ignored)</Label>
                <Textarea
                  placeholder="What could happen?"
                  rows={2}
                  className="mt-1"
                  value={newHazardConsequences}
                  onChange={(e) => setNewHazardConsequences(e.target.value)}
                />
              </div>

              {/* Attachment */}
              <div>
                <Label>Attachment</Label>
                <div className="mt-1">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => {
                        if (e.target.files) {
                          setAttachedFiles(Array.from(e.target.files));
                        }
                      }}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Drop files here to upload
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        or click to browse
                      </p>
                    </label>
                  </div>
                  {attachedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                          <Paperclip className="w-4 h-4 text-gray-600" />
                          <span className="text-sm flex-1">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Anonymous Checkbox */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="anonymous-submission"
                  checked={isAnonymous}
                  onCheckedChange={(checked: boolean) => setIsAnonymous(checked === true)}
                />
                <Label htmlFor="anonymous-submission" className="cursor-pointer">Submit Anonymously</Label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowNewHazardDialog(false);
                  setSelectedRiskFactors([]);
                  setAttachedFiles([]);
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Effectiveness Review Alert */}
      {upcomingReviews.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-orange-900">Effectiveness Reviews Due Soon</h3>
                <p className="text-sm text-orange-800 mt-1">
                  {upcomingReviews.length} hazard report{upcomingReviews.length > 1 ? 's' : ''} ha{upcomingReviews.length > 1 ? 've' : 's'} effectiveness review{upcomingReviews.length > 1 ? 's' : ''} scheduled within the next 7 days:
                </p>
                <div className="mt-2 space-y-1">
                  {upcomingReviews.map(h => (
                    <div key={h.id} className="text-sm text-orange-800 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-medium">{h.id}</span>
                      <span>- {h.title}</span>
                      <span className="text-orange-600">
                        (Due: {new Date(h.effectivenessReviewDate!).toLocaleDateString()})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Review</p>
                <p className="text-2xl">
                  {hazards.filter(h => [WORKFLOW_STAGES.SM_INVESTIGATION, WORKFLOW_STAGES.ASSIGN_MITIGATION, WORKFLOW_STAGES.MITIGATION_DEVELOPMENT, WORKFLOW_STAGES.SM_REVIEW].includes(h.workflowStage)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Line Manager</p>
                <p className="text-2xl">
                  {hazards.filter(h => h.workflowStage === WORKFLOW_STAGES.LINE_MANAGER_APPROVAL).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Exec Approval</p>
                <p className="text-2xl">
                  {hazards.filter(h => h.workflowStage === WORKFLOW_STAGES.EXEC_APPROVAL).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl">
                  {hazards.filter(h => h.severity === 'Critical').length}
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
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="text-2xl">
                  {hazards.filter(h => h.workflowStage === WORKFLOW_STAGES.CLOSED).length}
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
                  placeholder="Search by title, location, reporter, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-56">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by workflow stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.SUBMITTED.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.SUBMITTED}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.SM_INVESTIGATION.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.SM_INVESTIGATION}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.ASSIGN_MITIGATION.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.ASSIGN_MITIGATION}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.MITIGATION_DEVELOPMENT.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.MITIGATION_DEVELOPMENT}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.SM_REVIEW.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.SM_REVIEW}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.LINE_MANAGER_APPROVAL.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.LINE_MANAGER_APPROVAL}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.EXEC_APPROVAL.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.EXEC_APPROVAL}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.IMPLEMENTATION.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.IMPLEMENTATION}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.EFFECTIVENESS_REVIEW.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.EFFECTIVENESS_REVIEW}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.CLOSED.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.CLOSED}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Hazards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hazard Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Workflow Stage</TableHead>
                  <TableHead>Current Reviewer</TableHead>
                  <TableHead>Effectiveness Review</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Visible To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHazards.map((hazard) => {
                  const reviewUpcoming = hazard.effectivenessReviewDate &&
                    isEffectivenessReviewUpcoming(hazard.effectivenessReviewDate);
                  const daysToReview = hazard.effectivenessReviewDate ?
                    daysUntil(hazard.effectivenessReviewDate) : null;
                  const isSafetyOrAdmin = userRole === 'safety' || userRole === 'admin';

                  return (
                    <TableRow key={hazard.id}>
                      <TableCell className="font-medium">{hazard.id}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-start gap-2">
                          <span className="truncate">{hazard.title}</span>
                          {reviewUpcoming && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs shrink-0">
                              <Bell className="w-3 h-3 mr-1" />
                              Review in {daysToReview}d
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{hazard.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(hazard.severity)}>
                          {hazard.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={getWorkflowStageColor(hazard.workflowStage)}>
                            {hazard.workflowStage}
                          </Badge>
                          <Progress
                            value={getWorkflowProgress(hazard.workflowStage)}
                            className="h-1 w-32"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {hazard.workflowStage === WORKFLOW_STAGES.LINE_MANAGER_APPROVAL
                              ? hazard.submitterLineManager
                              : hazard.workflowStage === WORKFLOW_STAGES.EXEC_APPROVAL
                                ? 'VP Operations'
                                : hazard.workflowStage === WORKFLOW_STAGES.MITIGATION_DEVELOPMENT
                                  ? 'Process Owner'
                                  : [WORKFLOW_STAGES.SM_INVESTIGATION, WORKFLOW_STAGES.ASSIGN_MITIGATION, WORKFLOW_STAGES.SM_REVIEW].includes(hazard.workflowStage)
                                    ? 'Safety Manager'
                                    : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hazard.effectivenessReviewDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className={`text-sm ${reviewUpcoming ? 'text-orange-600 font-medium' : ''}`}>
                              {new Date(hazard.effectivenessReviewDate).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            {hazard.isAnonymous ? (
                              <span className="italic text-muted-foreground">Anonymous</span>
                            ) : (
                              hazard.reportedBy
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(hazard.reportedDate).toLocaleDateString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hazard.isPublished ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Public</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Private</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(hazard)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {isSafetyOrAdmin && !hazard.isPublished && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                updateHazard(hazard.id, { isPublished: true });
                                toast.success(`Hazard ${hazard.id} is now visible to all users.`);
                              }}
                            >
                              Publish
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedHazard && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {selectedHazard.id}: {selectedHazard.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedHazard.isAnonymous
                    ? `Anonymous submission on ${new Date(selectedHazard.reportedDate).toLocaleDateString()}`
                    : `Reported by ${selectedHazard.reportedBy} on ${new Date(selectedHazard.reportedDate).toLocaleDateString()}`}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="workflow">Action Status</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <div className="mt-1">
                        <Badge variant="outline">{selectedHazard.category}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label>Severity</Label>
                      <div className="mt-1">
                        <Badge className={getSeverityColor(selectedHazard.severity)}>
                          {selectedHazard.severity}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Location</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedHazard.location}</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label>Description</Label>
                    <p className="mt-1 text-sm">{selectedHazard.description}</p>
                  </div>

                  <div>
                    <Label>Immediate Actions Taken</Label>
                    <p className="mt-1 text-sm">{selectedHazard.immediateActions}</p>
                  </div>

                  <div>
                    <Label>Potential Consequences</Label>
                    <p className="mt-1 text-sm text-red-700 bg-red-50 p-3 rounded border border-red-200">
                      {selectedHazard.potentialConsequences}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="workflow" className="space-y-4 mt-4">
                  <div className="p-4 bg-slate-50 rounded text-center">
                    <p className="mb-2">This hazard is currently in stage:</p>
                    <Badge className={getWorkflowStageColor(selectedHazard.workflowStage) + " text-lg py-1 px-3"}>
                      {selectedHazard.workflowStage}
                    </Badge>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}