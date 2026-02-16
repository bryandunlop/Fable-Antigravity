import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Shield,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Archive,
  Users,
  FileText,
  Send
} from 'lucide-react';
import { useHazards, WORKFLOW_STAGES, Hazard } from '../contexts/HazardContext';

export default function SafetyManagerDashboard() {
  const { hazards } = useHazards();
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate days difference
  const getDaysDifference = (dateString: string) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysUntil = (dateString?: string) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Group hazards by stage
  const hazardsByStage = Object.values(WORKFLOW_STAGES).reduce((acc, stage) => {
    acc[stage] = hazards.filter(h => h.workflowStage === stage);
    return acc;
  }, {} as Record<string, Hazard[]>);

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case WORKFLOW_STAGES.SUBMITTED:
        return <AlertTriangle className="w-4 h-4" />;
      case WORKFLOW_STAGES.SM_INITIAL_REVIEW:
        return <Search className="w-4 h-4" />;
      case WORKFLOW_STAGES.ASSIGNED_CORRECTIVE_ACTION:
        return <Users className="w-4 h-4" />;
      case WORKFLOW_STAGES.SM_CA_REVIEW:
        return <FileText className="w-4 h-4" />;
      case WORKFLOW_STAGES.LINE_MANAGER_APPROVAL:
      case WORKFLOW_STAGES.EXEC_APPROVAL:
        return <CheckCircle className="w-4 h-4" />;
      case WORKFLOW_STAGES.IMPLEMENTATION_ASSIGNMENT:
      case WORKFLOW_STAGES.IMPLEMENTATION_IN_PROGRESS:
        return <PlayCircle className="w-4 h-4" />;
      case WORKFLOW_STAGES.PUBLISHED:
        return <Send className="w-4 h-4" />;
      case WORKFLOW_STAGES.EFFECTIVENESS_REVIEW:
        return <PauseCircle className="w-4 h-4" />;
      case WORKFLOW_STAGES.CLOSED:
        return <Archive className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case WORKFLOW_STAGES.SUBMITTED:
        return 'bg-red-100 text-red-800 border-red-200';
      case WORKFLOW_STAGES.SM_INITIAL_REVIEW:
      case WORKFLOW_STAGES.SM_CA_REVIEW:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case WORKFLOW_STAGES.ASSIGNED_CORRECTIVE_ACTION:
      case WORKFLOW_STAGES.IMPLEMENTATION_ASSIGNMENT:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case WORKFLOW_STAGES.LINE_MANAGER_APPROVAL:
      case WORKFLOW_STAGES.EXEC_APPROVAL:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case WORKFLOW_STAGES.IMPLEMENTATION_IN_PROGRESS:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case WORKFLOW_STAGES.PUBLISHED:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case WORKFLOW_STAGES.EFFECTIVENESS_REVIEW:
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case WORKFLOW_STAGES.CLOSED:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const needsAttention = (hazard: Hazard) => {
    // Highlight items that need immediate attention
    if (hazard.workflowStage === WORKFLOW_STAGES.SUBMITTED) return true;
    if (hazard.workflowStage === WORKFLOW_STAGES.SM_INITIAL_REVIEW && (hazard.daysInStage || 0) > 1) return true;
    if (hazard.workflowStage === WORKFLOW_STAGES.SM_CA_REVIEW) return true;
    if (hazard.severity === 'Critical') return true;
    return false;
  };

  // Stats for overview
  const stats = {
    total: hazards.length,
    needsReview: (hazardsByStage[WORKFLOW_STAGES.SUBMITTED]?.length || 0) +
      (hazardsByStage[WORKFLOW_STAGES.SM_INITIAL_REVIEW]?.length || 0) +
      (hazardsByStage[WORKFLOW_STAGES.SM_CA_REVIEW]?.length || 0),
    inProgress: (hazardsByStage[WORKFLOW_STAGES.IMPLEMENTATION_IN_PROGRESS]?.length || 0),
    awaitingApproval: (hazardsByStage[WORKFLOW_STAGES.LINE_MANAGER_APPROVAL]?.length || 0) +
      (hazardsByStage[WORKFLOW_STAGES.EXEC_APPROVAL]?.length || 0),
    effectivenessReview: (hazardsByStage[WORKFLOW_STAGES.EFFECTIVENESS_REVIEW]?.length || 0),
    closedThisMonth: (hazardsByStage[WORKFLOW_STAGES.CLOSED]?.length || 0) // Placeholder logic for "This Month"
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Safety Manager - Hazard Workflow Dashboard
          </h1>
          <p className="text-muted-foreground">Process and manage hazard reports through the approval workflow</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Active</p>
                <p className="text-2xl">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Needs Review</p>
                <p className="text-2xl text-red-700">{stats.needsReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Approval</p>
                <p className="text-2xl">{stats.awaitingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PauseCircle className="w-4 h-4 text-cyan-600" />
              <div>
                <p className="text-sm text-muted-foreground">Effectiveness Review</p>
                <p className="text-2xl">{stats.effectivenessReview}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Closed (Month)</p>
                <p className="text-2xl">{stats.closedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hazard reports by ID, title, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Stage Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
          <TabsTrigger value="all">
            All Reports
            <Badge className="ml-2 h-5 px-1.5 text-xs">{stats.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="needs-review">
            Needs Review
            <Badge className="ml-2 h-5 px-1.5 text-xs bg-red-600">{stats.needsReview}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress
            <Badge className="ml-2 h-5 px-1.5 text-xs">{stats.inProgress}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            <Badge className="ml-2 h-5 px-1.5 text-xs">{stats.awaitingApproval}</Badge>
          </TabsTrigger>
          <TabsTrigger value="effectiveness">
            Effectiveness
            <Badge className="ml-2 h-5 px-1.5 text-xs">{stats.effectivenessReview}</Badge>
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed
          </TabsTrigger>
        </TabsList>

        {/* All Reports Tab */}
        <TabsContent value="all" className="space-y-4">
          {Object.entries(hazardsByStage).map(([stage, stageHazards]) => {
            if (!stageHazards || stageHazards.length === 0) return null;

            return (
              <Card key={stage}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getStageIcon(stage)}
                    {stage}
                    <Badge className="ml-2">{stageHazards.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stageHazards.filter(h =>
                      h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      h.id.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(hazard => (
                      <div
                        key={hazard.id}
                        className={`p-4 border-2 rounded-lg hover:shadow-md transition-shadow ${needsAttention(hazard) ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono">
                                {hazard.id}
                              </Badge>
                              <Badge className={getSeverityColor(hazard.severity)} variant="outline">
                                {hazard.severity}
                              </Badge>
                              <Badge className={getStageColor(hazard.workflowStage)} variant="outline">
                                {hazard.workflowStage}
                              </Badge>
                              {needsAttention(hazard) && (
                                <Badge className="bg-red-600 text-white">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Needs Attention
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium mb-2">{hazard.title}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Location:</span>
                                <span className="ml-2">{hazard.location}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Reported:</span>
                                <span className="ml-2">{hazard.reportedDate}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Days in Stage:</span>
                                <span className="ml-2 font-medium">{hazard.daysInStage || 0}</span>
                              </div>
                              {hazard.assignedTo && (
                                <div>
                                  <span className="text-muted-foreground">Assigned:</span>
                                  <span className="ml-2">{hazard.assignedTo}</span>
                                </div>
                              )}
                            </div>
                            {hazard.workflowStage === WORKFLOW_STAGES.EFFECTIVENESS_REVIEW && hazard.effectivenessReviewDate && (
                              <div className="mt-2 p-2 bg-cyan-50 border border-cyan-200 rounded text-sm">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Effectiveness review due in {getDaysUntil(hazard.effectivenessReviewDate)} days ({hazard.effectivenessReviewDate})
                              </div>
                            )}
                          </div>
                          <Link to={`/safety/hazard-workflow/${hazard.id}`}>
                            <Button>
                              <Eye className="w-4 h-4 mr-2" />
                              Process
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Needs Review Tab */}
        <TabsContent value="needs-review" className="space-y-3">
          {[
            ...(hazardsByStage[WORKFLOW_STAGES.SUBMITTED] || []),
            ...(hazardsByStage[WORKFLOW_STAGES.SM_INITIAL_REVIEW] || []),
            ...(hazardsByStage[WORKFLOW_STAGES.SM_CA_REVIEW] || [])
          ].map(hazard => (
            <Card key={hazard.id} className="border-2 border-red-300 bg-red-50/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">{hazard.id}</Badge>
                      <Badge className={getSeverityColor(hazard.severity)} variant="outline">
                        {hazard.severity}
                      </Badge>
                      <Badge className={getStageColor(hazard.workflowStage)} variant="outline">
                        {hazard.workflowStage}
                      </Badge>
                    </div>
                    <p className="font-medium mb-2">{hazard.title}</p>
                    <p className="text-sm text-muted-foreground">{hazard.location}</p>
                  </div>
                  <Link to={`/safety/hazard-workflow/${hazard.id}`}>
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      <Eye className="w-4 h-4 mr-2" />
                      Review Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* In Progress Tab */}
        <TabsContent value="in-progress" className="space-y-3">
          {[
            ...(hazardsByStage[WORKFLOW_STAGES.ASSIGNED_CORRECTIVE_ACTION] || []),
            ...(hazardsByStage[WORKFLOW_STAGES.IMPLEMENTATION_ASSIGNMENT] || []),
            ...(hazardsByStage[WORKFLOW_STAGES.IMPLEMENTATION_IN_PROGRESS] || [])
          ].map(hazard => (
            <Card key={hazard.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">{hazard.id}</Badge>
                      <Badge className={getSeverityColor(hazard.severity)} variant="outline">
                        {hazard.severity}
                      </Badge>
                      <Badge className={getStageColor(hazard.workflowStage)} variant="outline">
                        {hazard.workflowStage}
                      </Badge>
                    </div>
                    <p className="font-medium mb-2">{hazard.title}</p>
                    <p className="text-sm text-muted-foreground">Assigned to: {hazard.assignedTo || 'Unassigned'}</p>
                  </div>
                  <Link to={`/safety/hazard-workflow/${hazard.id}`}>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      View Progress
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-3">
          {[
            ...(hazardsByStage[WORKFLOW_STAGES.LINE_MANAGER_APPROVAL] || []),
            ...(hazardsByStage[WORKFLOW_STAGES.EXEC_APPROVAL] || [])
          ].map(hazard => (
            <Card key={hazard.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">{hazard.id}</Badge>
                      <Badge className={getSeverityColor(hazard.severity)} variant="outline">
                        {hazard.severity}
                      </Badge>
                      <Badge className={getStageColor(hazard.workflowStage)} variant="outline">
                        {hazard.workflowStage}
                      </Badge>
                    </div>
                    <p className="font-medium mb-2">{hazard.title}</p>
                    <p className="text-sm text-muted-foreground">Assigned to: {hazard.assignedTo || 'Unassigned'}</p>
                  </div>
                  <Link to={`/safety/hazard-workflow/${hazard.id}`}>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      View Status
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Effectiveness Review Tab */}
        <TabsContent value="effectiveness" className="space-y-3">
          {(hazardsByStage[WORKFLOW_STAGES.EFFECTIVENESS_REVIEW] || []).map(hazard => (
            <Card key={hazard.id} className="border-cyan-200 bg-cyan-50/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">{hazard.id}</Badge>
                      <Badge className={getSeverityColor(hazard.severity)} variant="outline">
                        {hazard.severity}
                      </Badge>
                      <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200" variant="outline">
                        6-Month Review Period
                      </Badge>
                    </div>
                    <p className="font-medium mb-2">{hazard.title}</p>
                    <div className="text-sm">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Review due: {hazard.effectivenessReviewDate || 'N/A'} ({getDaysUntil(hazard.effectivenessReviewDate)} days)
                    </div>
                  </div>
                  <Link to={`/safety/hazard-workflow/${hazard.id}`}>
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Closed Tab */}
        <TabsContent value="closed" className="space-y-3">
          {(hazardsByStage[WORKFLOW_STAGES.CLOSED] || []).length > 0 ? (
            hazardsByStage[WORKFLOW_STAGES.CLOSED].map(hazard => (
              <Card key={hazard.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">{hazard.id}</Badge>
                        <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                          Closed
                        </Badge>
                      </div>
                      <p className="font-medium mb-2">{hazard.title}</p>
                      <p className="text-sm text-muted-foreground">{hazard.location}</p>
                    </div>
                    <Link to={`/safety/hazard-workflow/${hazard.id}`}>
                      <Button variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        Review Archive
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No closed hazard reports found.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}