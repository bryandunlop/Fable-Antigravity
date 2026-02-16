import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { 
  Plus, 
  Users, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Calendar,
  Activity,
  Eye,
  Share2,
  History,
  Bell,
  ArrowLeft,
  Target,
  TrendingUp,
  FileText,
  User,
  ExternalLink
} from 'lucide-react';

interface DocumentCollaborationsProps {
  userRole: string;
}

export default function DocumentCollaborations({ userRole }: DocumentCollaborationsProps) {
  const navigate = useNavigate();

  // State for dialogs
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showCompletedDetails, setShowCompletedDetails] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Simple Avatar components
  const Avatar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={`${className} rounded-full bg-gray-200 flex items-center justify-center`}>
      {children}
    </div>
  );
  
  const AvatarFallback = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <span className={className}>{children}</span>
  );

  // Mock project data
  const activeProject = {
    id: 1,
    title: "Safety Management System Overhaul",
    document: "Safety Management Manual v3.1",
    leader: "Maria Rodriguez",
    role: "Safety Director",
    startDate: "Jan 20, 2025",
    targetDate: "Feb 15, 2025",
    progress: 42,
    contributors: [
      { name: "Maria Rodriguez", role: "Safety Director", initials: "MR", status: "active" },
      { name: "John Smith", role: "Chief Pilot", initials: "JS", status: "active" },
      { name: "Tom Chen", role: "Maintenance Manager", initials: "TC", status: "active" },
      { name: "Lisa Davis", role: "Training Manager", initials: "LD", status: "active" },
      { name: "Michael Torres", role: "Quality Assurance", initials: "MT", status: "active" },
      { name: "Sarah Johnson", role: "Flight Operations", initials: "SJ", status: "active" },
      { name: "David Kim", role: "Compliance Officer", initials: "DK", status: "active" }
    ],
    sections: [
      { name: "Risk Assessment Procedures", status: "completed", assignee: "Tom Chen", completedDate: "Jan 22" },
      { name: "Incident Reporting", status: "in-progress", assignee: "Lisa Davis", dueDate: "Jan 28" },
      { name: "Training Requirements", status: "in-review", assignee: "Sarah Johnson", dueDate: "Jan 30" },
      { name: "Compliance Monitoring", status: "pending", assignee: "David Kim", dueDate: "Feb 2" },
      { name: "Emergency Procedures", status: "pending", assignee: "John Smith", dueDate: "Feb 5" },
      { name: "Documentation Standards", status: "pending", assignee: "Maria Rodriguez", dueDate: "Feb 8" }
    ],
    recentActivity: [
      { user: "Tom Chen", action: "completed Risk Assessment section", time: "2h ago", initials: "TC" },
      { user: "Lisa Davis", action: "added 3 comments to Training Requirements", time: "4h ago", initials: "LD" },
      { user: "Sarah Johnson", action: "submitted Incident Reporting for review", time: "6h ago", initials: "SJ" },
      { user: "Michael Torres", action: "approved Quality Standards section", time: "1d ago", initials: "MT" }
    ]
  };

  const completedProject = {
    id: 2,
    title: "Emergency Evacuation Procedures Update",
    document: "Emergency Procedures Manual",
    leader: "Jessica Park",
    role: "Chief Flight Attendant",
    startDate: "Jan 13, 2025",
    completedDate: "Jan 18, 2025",
    duration: "5 days",
    contributors: [
      { name: "Jessica Park", role: "Chief Flight Attendant", initials: "JP" },
      { name: "Captain Mike Wilson", role: "Training Captain", initials: "MW" },
      { name: "Dr. Amanda Chen", role: "Flight Physician", initials: "AC" },
      { name: "Robert Taylor", role: "Safety Officer", initials: "RT" }
    ],
    finalMetrics: {
      sectionsUpdated: "8/8",
      commentsResolved: "15/15",
      consensusReached: "100%"
    }
  };

  const handleViewActiveProject = () => {
    setSelectedProject(activeProject);
    setShowProjectDetails(true);
  };

  const handleViewCompletedProject = () => {
    setSelectedProject(completedProject);
    setShowCompletedDetails(true);
  };

  const handleJoinProject = () => {
    toast.success("You have joined the Safety Management System Overhaul project. You'll receive notifications for updates.");
  };

  const handleStartNewCollaboration = () => {
    toast.info("Starting a new collaboration project...");
    // Could navigate to a new collaboration setup page
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header with Back Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/document-management')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Document Management
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1>Document Collaborations</h1>
          <p className="text-muted-foreground">Multi-contributor document improvement projects</p>
        </div>
        <Button className="flex items-center gap-2" onClick={handleStartNewCollaboration}>
          <Plus className="w-4 h-4" />
          Start New Collaboration
        </Button>
      </div>

      {/* Collaboration Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Activity className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">1</div>
            <div className="text-sm text-muted-foreground">Active Projects</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">1</div>
            <div className="text-sm text-muted-foreground">Completed This Month</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold">11</div>
            <div className="text-sm text-muted-foreground">Total Contributors</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Collaborations */}
      <div className="space-y-6">
        <h2>Active Collaborations</h2>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-medium">Safety Management System Overhaul</h3>
                  <Badge className="bg-blue-100 text-blue-800">ACTIVE</Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    7 contributors
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-3">
                  Safety Management Manual v3.1 • Started by Maria Rodriguez (Safety Director)
                </p>
                <p className="text-sm mb-4">
                  Comprehensive update to align with new SMS regulations and industry best practices
                </p>
                
                {/* Contributors */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-medium">Contributors:</span>
                  <div className="flex -space-x-2">
                    <Avatar className="w-8 h-8 border-2 border-white">
                      <AvatarFallback className="text-xs">MR</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-white">
                      <AvatarFallback className="text-xs">JS</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-white">
                      <AvatarFallback className="text-xs">TC</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-white">
                      <AvatarFallback className="text-xs">LD</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-white">
                      <AvatarFallback className="text-xs bg-muted">+3</AvatarFallback>
                    </Avatar>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
                    <Plus className="w-3 h-3 mr-1" />
                    Invite
                  </Button>
                </div>
              </div>
              <div className="ml-6 text-right">
                <div className="text-xs text-muted-foreground">Started Jan 20, 2025</div>
                <div className="text-xs text-muted-foreground">Target: Feb 15, 2025</div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Overall Progress</h4>
                <Badge variant="outline" className="text-xs">5 of 12 sections complete</Badge>
              </div>
              <Progress value={42} className="mb-3" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Risk Assessment Procedures</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span>Incident Reporting</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>Training Requirements</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Recent Activity</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">TC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className="text-sm">Tom Chen completed Risk Assessment section • 2h ago</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">LD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <span className="text-sm">Lisa Davis added 3 comments to Training Requirements • 4h ago</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Target: Feb 15
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  23 comments
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  On track
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleViewActiveProject}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleJoinProject}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Join Project
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Completed */}
      <div className="space-y-4">
        <h2>Recently Completed</h2>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-medium">Emergency Evacuation Procedures Update</h3>
                  <Badge className="bg-green-100 text-green-800">COMPLETED</Badge>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    4 contributors
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-3">
                  Emergency Procedures Manual • Led by Jessica Park (Chief Flight Attendant)
                </p>
                <p className="text-sm mb-4">
                  Updated evacuation procedures based on new Gulfstream G650 configuration
                </p>
              </div>
              <div className="ml-6 text-right">
                <div className="text-xs text-muted-foreground">Completed Jan 18, 2025</div>
                <div className="text-xs text-muted-foreground">Duration: 5 days</div>
              </div>
            </div>

            {/* Success Metrics */}
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Collaboration completed successfully</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">8/8</div>
                  <div className="text-xs text-muted-foreground">Sections updated</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">15/15</div>
                  <div className="text-xs text-muted-foreground">Comments resolved</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">100%</div>
                  <div className="text-xs text-muted-foreground">Consensus reached</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Published to document center
                </span>
                <span className="flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  All stakeholders notified
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleViewCompletedProject}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Final Version
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.info("Viewing collaboration history...")}>
                  <History className="w-4 h-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Project Details Dialog */}
      <Dialog open={showProjectDetails} onOpenChange={setShowProjectDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedProject?.title}
            </DialogTitle>
            <DialogDescription>
              Led by {selectedProject?.leader} • {selectedProject?.progress}% complete
            </DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1">
                {/* Project Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Project Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Document:</strong> {selectedProject.document}</div>
                      <div><strong>Project Lead:</strong> {selectedProject.leader} ({selectedProject.role})</div>
                      <div><strong>Started:</strong> {selectedProject.startDate}</div>
                      <div><strong>Target Date:</strong> {selectedProject.targetDate}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Progress</h4>
                    <Progress value={selectedProject.progress} className="mb-2" />
                    <p className="text-sm text-muted-foreground">{selectedProject.progress}% complete</p>
                  </div>
                </div>

                <Separator />

                {/* Contributors */}
                <div>
                  <h4 className="font-medium mb-3">Contributors ({selectedProject.contributors?.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProject.contributors?.map((contributor, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{contributor.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{contributor.name}</div>
                          <div className="text-xs text-muted-foreground">{contributor.role}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Section Progress */}
                <div>
                  <h4 className="font-medium mb-3">Section Progress</h4>
                  <div className="space-y-3">
                    {selectedProject.sections?.map((section, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {section.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {section.status === 'in-progress' && <Clock className="w-4 h-4 text-yellow-500" />}
                          {section.status === 'in-review' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                          {section.status === 'pending' && <Clock className="w-4 h-4 text-muted-foreground" />}
                          <div>
                            <div className="font-medium text-sm">{section.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Assigned to {section.assignee}
                              {section.completedDate && ` • Completed ${section.completedDate}`}
                              {section.dueDate && ` • Due ${section.dueDate}`}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {section.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Recent Activity */}
                <div>
                  <h4 className="font-medium mb-3">Recent Activity</h4>
                  <div className="space-y-3">
                    {selectedProject.recentActivity?.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{activity.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm">{activity.user} {activity.action}</div>
                          <div className="text-xs text-muted-foreground">{activity.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Completed Project Details Dialog */}
      <Dialog open={showCompletedDetails} onOpenChange={setShowCompletedDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {selectedProject?.title}
            </DialogTitle>
            <DialogDescription>
              Led by {selectedProject?.leader} • Completed {selectedProject?.completedDate}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProject && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1">
                {/* Project Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Project Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Document:</strong> {selectedProject.document}</div>
                      <div><strong>Project Lead:</strong> {selectedProject.leader} ({selectedProject.role})</div>
                      <div><strong>Started:</strong> {selectedProject.startDate}</div>
                      <div><strong>Completed:</strong> {selectedProject.completedDate}</div>
                      <div><strong>Duration:</strong> {selectedProject.duration}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Final Metrics</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="font-bold text-lg text-green-800">{selectedProject.finalMetrics?.sectionsUpdated}</div>
                        <div className="text-xs text-green-600">Sections Updated</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="font-bold text-lg text-blue-800">{selectedProject.finalMetrics?.commentsResolved}</div>
                        <div className="text-xs text-blue-600">Comments Resolved</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="font-bold text-lg text-purple-800">{selectedProject.finalMetrics?.consensusReached}</div>
                        <div className="text-xs text-purple-600">Consensus Reached</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contributors */}
                <div>
                  <h4 className="font-medium mb-3">Project Contributors ({selectedProject.contributors?.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProject.contributors?.map((contributor, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{contributor.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{contributor.name}</div>
                          <div className="text-xs text-muted-foreground">{contributor.role}</div>
                        </div>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Implementation Status */}
                <div>
                  <h4 className="font-medium mb-3">Implementation Status</h4>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">Successfully Published</span>
                    </div>
                    <div className="text-sm text-green-700">
                      All updates have been published to the document center and stakeholders have been notified.
                      The new procedures are now active in fleet operations.
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => toast.info("Opening document in Document Center...")}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in Document Center
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}