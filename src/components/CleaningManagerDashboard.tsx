import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Sparkles,
  Plane,
  Clock,
  User,
  Search,
  Plus,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Filter,
  Calendar
} from 'lucide-react';

const WORKFLOW_STAGES = {
  INITIATED: 'Session Initiated',
  PRE_INSPECTION: 'Pre-Cleaning Inspection',
  COCKPIT: 'Cockpit Cleaning',
  CABIN: 'Cabin Cleaning',
  GALLEY: 'Galley Cleaning',
  LAVATORY: 'Lavatory Cleaning',
  EXTERIOR: 'Exterior Cleaning',
  QUALITY_REVIEW: 'Quality Review',
  FINAL_VERIFICATION: 'Final Verification',
  COMPLETED: 'Completed & Logged'
};

interface WorkflowSummary {
  id: string;
  tailNumber: string;
  sessionType: string;
  currentStage: string;
  assignedCleaner?: string;
  initiatedBy: string;
  initiatedAt: string;
  progress: number;
  estimatedCompletion?: string;
}

export default function CleaningManagerDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');

  // Mock data
  const workflows: WorkflowSummary[] = [
    {
      id: '1',
      tailNumber: 'N650GX',
      sessionType: 'Overnight Clean',
      currentStage: WORKFLOW_STAGES.CABIN,
      assignedCleaner: 'Mike Chen',
      initiatedBy: 'Sarah Johnson',
      initiatedAt: new Date(Date.now() - 3600000).toISOString(),
      progress: 45,
      estimatedCompletion: new Date(Date.now() + 3600000).toISOString()
    },
    {
      id: '2',
      tailNumber: 'N650ER',
      sessionType: 'Quick Turn',
      currentStage: WORKFLOW_STAGES.QUALITY_REVIEW,
      assignedCleaner: 'Lisa Park',
      initiatedBy: 'John Smith',
      initiatedAt: new Date(Date.now() - 1800000).toISOString(),
      progress: 85
    },
    {
      id: '3',
      tailNumber: 'N650EX',
      sessionType: 'Deep Clean',
      currentStage: WORKFLOW_STAGES.PRE_INSPECTION,
      assignedCleaner: 'Tom Wilson',
      initiatedBy: 'Sarah Johnson',
      initiatedAt: new Date(Date.now() - 900000).toISOString(),
      progress: 15
    },
    {
      id: '4',
      tailNumber: 'N650GS',
      sessionType: 'Full Detailing',
      currentStage: WORKFLOW_STAGES.INITIATED,
      initiatedBy: 'Sarah Johnson',
      initiatedAt: new Date(Date.now() - 300000).toISOString(),
      progress: 5
    }
  ];

  const completedToday = 8;
  const averageDuration = '1.2 hrs';
  const activeWorkflows = workflows.filter(w => w.currentStage !== WORKFLOW_STAGES.COMPLETED).length;

  const getStageColor = (stage: string): string => {
    const stages = Object.values(WORKFLOW_STAGES);
    const stageIndex = stages.indexOf(stage);
    const totalStages = stages.length;
    const progress = (stageIndex / totalStages) * 100;

    if (progress < 25) return 'bg-red-100 text-red-800 border-red-300';
    if (progress < 50) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (progress < 75) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (progress < 100) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getSessionTypeColor = (type: string): string => {
    if (type.includes('Quick')) return 'bg-blue-100 text-blue-800';
    if (type.includes('Overnight')) return 'bg-purple-100 text-purple-800';
    if (type.includes('Deep')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.tailNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.assignedCleaner?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStage === 'all' || workflow.currentStage === filterStage;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-blue-500" />
              Cleaning Manager Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage all aircraft cleaning workflows
            </p>
          </div>
          <Button onClick={() => navigate('/aircraft-cleaning/new-workflow')} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            New Cleaning Session
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Workflows</p>
                  <p className="text-3xl font-bold text-blue-600">{activeWorkflows}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                  <p className="text-3xl font-bold text-green-600">{completedToday}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-3xl font-bold text-purple-600">{averageDuration}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality Score</p>
                  <p className="text-3xl font-bold text-orange-600">98%</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Sparkles className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by tail number or cleaner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="border rounded-md px-3 py-2 bg-background"
                >
                  <option value="all">All Stages</option>
                  {Object.values(WORKFLOW_STAGES).map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Workflows */}
        <Card>
          <CardHeader>
            <CardTitle>Active Workflows</CardTitle>
            <CardDescription>Click on any workflow to view details and manage progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredWorkflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No workflows found matching your criteria</p>
                </div>
              ) : (
                filteredWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    onClick={() => navigate(`/aircraft-cleaning/workflow/${workflow.id}`)}
                    className="p-4 border rounded-lg hover:bg-accent/5 hover:border-accent/20 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Plane className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{workflow.tailNumber}</h3>
                            <Badge variant="outline" className={getSessionTypeColor(workflow.sessionType)}>
                              {workflow.sessionType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {workflow.assignedCleaner || 'Unassigned'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Started {new Date(workflow.initiatedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStageColor(workflow.currentStage)}>
                        {workflow.currentStage}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{workflow.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${workflow.progress}%` }}
                        />
                      </div>
                    </div>

                    {workflow.estimatedCompletion && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Est. completion: {new Date(workflow.estimatedCompletion).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Distribution by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(WORKFLOW_STAGES).map(stage => {
                const count = workflows.filter(w => w.currentStage === stage).length;
                if (count === 0) return null;
                
                return (
                  <div key={stage} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={getStageColor(stage)}>
                        {count}
                      </Badge>
                      <span className="text-sm font-medium">{stage}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round((count / workflows.length) * 100)}% of total
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
