import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import {
  AlertTriangle,
  Search,
  Filter,
  User,
  Calendar,
  CheckCircle,
  UserCheck,
  Target,
  AlertCircle,
  Eye,
  Send,
  Bell,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useHazards, WORKFLOW_STAGES, Hazard } from '../../contexts/HazardContext';
import NewHazardDialog from './NewHazardDialog';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HazardWorkspaceProps {
  userRole?: string;
}

export default function HazardWorkspace({ userRole = 'safety' }: HazardWorkspaceProps) {
  const { hazards, currentUserId } = useHazards();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  const [showNewHazardDialog, setShowNewHazardDialog] = useState(false);

  // Helper functions matching those in old HazardReporting
  const daysUntil = (dateString: string) => {
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const isEffectivenessReviewUpcoming = (reviewDate: string | undefined) => {
    if (!reviewDate) return false;
    const days = daysUntil(reviewDate);
    return days <= 7 && days >= 0;
  };

  const upcomingReviews = hazards.filter(h =>
    h.effectivenessReviewDate && isEffectivenessReviewUpcoming(h.effectivenessReviewDate)
  );

  const getWorkflowStageColor = (stage: string) => {
    switch (stage) {
      case WORKFLOW_STAGES.SUBMITTED: return 'bg-blue-100 text-blue-800 border-blue-200';
      case WORKFLOW_STAGES.SM_INVESTIGATION: return 'bg-purple-100 text-purple-800 border-purple-200';
      case WORKFLOW_STAGES.MANAGER_APPROVAL: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case WORKFLOW_STAGES.EXEC_APPROVAL: return 'bg-orange-100 text-orange-800 border-orange-200';
      case WORKFLOW_STAGES.ASSIGN_MITIGATION: return 'bg-blue-50 text-blue-700 border-blue-100';
      case WORKFLOW_STAGES.MITIGATION_DEVELOPMENT: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case WORKFLOW_STAGES.SM_MITIGATION_REVIEW: return 'bg-violet-50 text-violet-700 border-violet-100';
      case WORKFLOW_STAGES.SM_POST_MANAGER:
      case WORKFLOW_STAGES.SM_POST_EXEC: return 'bg-amber-50 text-amber-700 border-amber-100';
      case WORKFLOW_STAGES.FINAL_REPORT: return 'bg-green-50 text-green-700 border-green-100';
      case WORKFLOW_STAGES.EFFECTIVENESS_REVIEW: return 'bg-pink-50 text-pink-700 border-pink-100';
      case WORKFLOW_STAGES.PUBLISHED: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case WORKFLOW_STAGES.CLOSED: return 'bg-slate-100 text-slate-800 border-slate-200';
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

  const isSafetyManager = userRole === 'safety' || userRole === 'admin';

  const filteredHazards = hazards.filter(hazard => {
    // Determine if mock non-SM user is assigned to this hazard (simulated assignment logic)
    const isProcessOwnerAssigned = (hazard.mitigationAssignments?.processOwner?.length ?? 0) > 0 && hazard.workflowStage === WORKFLOW_STAGES.MITIGATION_DEVELOPMENT;
    const isApproverAssigned     = (hazard.mitigationAssignments?.approver?.length ?? 0) > 0 && hazard.workflowStage === WORKFLOW_STAGES.MANAGER_APPROVAL;
    const isExecAssigned         = (hazard.mitigationAssignments?.executers?.length ?? 0) > 0 && hazard.workflowStage === WORKFLOW_STAGES.EXEC_APPROVAL;
    const isMockAssignedUser     = (userRole !== 'safety' && userRole !== 'admin') && (isProcessOwnerAssigned || isApproverAssigned || isExecAssigned);
    // Known (non-anonymous) reporters can see their own reports so they can follow up.
    const isOwnReport            = !!hazard.submitterId && hazard.submitterId === currentUserId && !hazard.isAnonymous;

    const isVisible = isSafetyManager || hazard.isPublished || isMockAssignedUser || isOwnReport;

    if (!isVisible) return false;

    let matchesFilter = true;
    if (filter === 'action') {
      matchesFilter = [
        WORKFLOW_STAGES.SUBMITTED,
        WORKFLOW_STAGES.SM_INVESTIGATION,
        WORKFLOW_STAGES.SM_MITIGATION_REVIEW,
        WORKFLOW_STAGES.SM_POST_MANAGER,
        WORKFLOW_STAGES.SM_POST_EXEC,
        WORKFLOW_STAGES.FINAL_REPORT
      ].includes(hazard.workflowStage);
    }
    else if (filter === 'awaiting-exec') matchesFilter = hazard.workflowStage === WORKFLOW_STAGES.EXEC_APPROVAL;
    else if (filter === 'due-review') matchesFilter = !!hazard.effectivenessReviewDate && new Date() >= new Date(hazard.effectivenessReviewDate) && hazard.workflowStage !== WORKFLOW_STAGES.CLOSED;
    else if (filter === 'open') matchesFilter = hazard.workflowStage !== WORKFLOW_STAGES.CLOSED && hazard.workflowStage !== WORKFLOW_STAGES.PUBLISHED;
    else if (filter !== 'all') matchesFilter = hazard.workflowStage.toLowerCase().replace(/\s/g, '') === filter;

    const matchesSearch = hazard.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hazard.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hazard.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAuditClick = (hazard: Hazard) => {
    navigate(`/safety/hazards/${hazard.id}`);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-screen flex flex-col overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-5 shrink-0 gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Hazard Workspace
          </h1>
          <p className="text-sm text-muted-foreground">Manage ongoing safety reports</p>
        </div>
        <Button onClick={() => setShowNewHazardDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Report New Hazard
        </Button>
      </div>

      <NewHazardDialog 
        open={showNewHazardDialog} 
        onOpenChange={setShowNewHazardDialog} 
        userRole={userRole}
      />

      {isSafetyManager && upcomingReviews.length > 0 && (
        <Card className="mb-5 border-orange-200 bg-orange-50 shrink-0">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-orange-900">Effectiveness Reviews Due Soon</h3>
                <div className="mt-2 space-y-1">
                  {upcomingReviews.map(h => (
                    <div key={h.id} className="text-sm text-orange-800 flex items-center gap-2 cursor-pointer hover:underline" onClick={() => handleAuditClick(h)}>
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

      {/* KPI Analytics Header */}
      {isSafetyManager && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5 shrink-0">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800 mb-1">Pending SM Action</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-red-700">
                    {hazards.filter(h => [
                      WORKFLOW_STAGES.SUBMITTED, 
                      WORKFLOW_STAGES.SM_INVESTIGATION, 
                      WORKFLOW_STAGES.SM_MITIGATION_REVIEW, 
                      WORKFLOW_STAGES.SM_POST_MANAGER, 
                      WORKFLOW_STAGES.SM_POST_EXEC, 
                      WORKFLOW_STAGES.FINAL_REPORT
                    ].includes(h.workflowStage)).length}
                  </p>
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Requires your input</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-red-100/80 text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-1">Mitigations Overdue</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-yellow-700">
                    3 {/* Mocked value for demonstration */}
                  </p>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">Past 30-day target</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-yellow-100/80 text-yellow-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">Avg Time to Closure</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-green-700">
                    4.2
                  </p>
                  <span className="text-sm font-medium text-green-700">Days</span>
                  <span className="ml-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">↓ 12% from last month</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-green-100/80 text-green-600">
                <TrendingDown className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-4 shrink-0 border-b border-slate-100">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {isSafetyManager && <span className="text-sm font-medium text-slate-500 mr-2">Quick Filters:</span>}
              <Badge variant={filter === 'open' ? 'default' : 'outline'} className={`cursor-pointer ${filter === 'open' ? 'bg-purple-600' : 'hover:bg-slate-100'}`} onClick={() => setFilter('open')}>
                Hide Closed
              </Badge>
              {isSafetyManager && (
                <>
                  <Badge variant={filter === 'action' ? 'default' : 'outline'} className={`cursor-pointer ${filter === 'action' ? 'bg-red-600' : 'hover:bg-slate-100 text-red-600 border-red-200'}`} onClick={() => setFilter('action')}>
                    ⚡ Pending My Action
                  </Badge>
                  <Badge variant={filter === 'due-review' ? 'default' : 'outline'} className={`cursor-pointer ${filter === 'due-review' ? 'bg-orange-600' : 'hover:bg-slate-100 text-orange-600 border-orange-200'}`} onClick={() => setFilter('due-review')}>
                    🕒 Due for Review
                  </Badge>
                  <Badge variant={filter === 'awaiting-exec' ? 'default' : 'outline'} className={`cursor-pointer ${filter === 'awaiting-exec' ? 'bg-orange-600' : 'hover:bg-slate-100 text-orange-600 border-orange-200'}`} onClick={() => setFilter('awaiting-exec')}>
                    Awaiting Exec
                  </Badge>
                </>
              )}
              <Badge variant={filter === 'all' ? 'default' : 'outline'} className={`cursor-pointer ${filter === 'all' ? 'bg-slate-800' : 'hover:bg-slate-100'}`} onClick={() => setFilter('all')}>
                Show All
              </Badge>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.SUBMITTED.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.SUBMITTED}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.SM_INVESTIGATION.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.SM_INVESTIGATION}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.MANAGER_APPROVAL.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.MANAGER_APPROVAL}</SelectItem>
                <SelectItem value={WORKFLOW_STAGES.CLOSED.replace(/\s/g, '').toLowerCase()}>{WORKFLOW_STAGES.CLOSED}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead className="pl-6">ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Workflow Stage</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Review Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHazards.map((hazard) => (
                <TableRow 
                  key={hazard.id} 
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleAuditClick(hazard)}
                >
                  <TableCell className="font-medium pl-6">{hazard.id}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{hazard.title}</TableCell>
                  <TableCell>
                    <div className="space-y-1.5 w-32">
                      <Badge className={getWorkflowStageColor(hazard.workflowStage)}>{hazard.workflowStage}</Badge>
                      <Progress value={getWorkflowProgress(hazard.workflowStage)} className="h-1" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[100px]">{hazard.isAnonymous ? 'Anonymous' : hazard.reportedBy}</span>
                      </div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {new Date(hazard.reportedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {hazard.effectivenessReviewDate ? (
                     <span className={`text-sm ${isEffectivenessReviewUpcoming(hazard.effectivenessReviewDate) ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                       {new Date(hazard.effectivenessReviewDate).toLocaleDateString()}
                     </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
