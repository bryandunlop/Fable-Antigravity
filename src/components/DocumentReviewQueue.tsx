import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { 
  Clock, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Eye, 
  Users,
  ArrowLeft,
  ThumbsUp,
  X,
  Shield,
  Send,
  FileText,
  Calendar,
  User
} from 'lucide-react';

interface DocumentReviewQueueProps {
  userRole: string;
}

export default function DocumentReviewQueue({ userRole }: DocumentReviewQueueProps) {
  const navigate = useNavigate();
  
  // Check if user can perform approval actions
  const canApprove = userRole === 'document-manager';
  
  // State for dialogs
  const [showReviewDetails, setShowReviewDetails] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');

  // Simple Avatar components
  const Avatar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={`${className} rounded-full bg-gray-200 flex items-center justify-center`}>
      {children}
    </div>
  );
  
  const AvatarFallback = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <span className={className}>{children}</span>
  );

  // Mock data for the items
  const priorityItems = [
    {
      id: 1,
      title: "Update Weather Minimums for Cat II Approaches",
      document: "Flight Operations Manual v2.3",
      submitter: "Captain Sarah Mitchell",
      submitterInitials: "SM",
      date: "Jan 25, 2025",
      description: "Propose updating weather minimums to align with new FAA regulations",
      status: "HIGH PRIORITY",
      statusColor: "yellow",
      queueNumber: "001",
      stakeholders: 5,
      deadline: "Jan 27",
      isDuplicate: true,
      comments: [
        {
          author: "Mark Davis",
          role: "Safety Manager",
          initials: "MD",
          time: "2h ago",
          content: "This aligns with our recent safety audit findings. I support this change and recommend fast-track approval."
        },
        {
          author: "Captain Jennifer Torres",
          role: "Chief Pilot",
          initials: "JT",
          time: "4h ago",
          content: "I've reviewed the proposed changes and they align perfectly with our recent training updates. This will enhance our Cat II approach safety margins significantly."
        },
        {
          author: "David Kim",
          role: "Flight Operations Manager",
          initials: "DK",
          time: "6h ago",
          content: "We need to ensure all pilots receive updated briefing materials within 48 hours of approval. I'll coordinate with the training department."
        }
      ]
    },
    {
      id: 2,
      title: "Emergency Oxygen System Checklist Update",
      document: "Emergency Procedures Manual",
      submitter: "Flight Attendant Lisa Wong",
      submitterInitials: "LW",
      date: "Jan 24, 2025",
      description: "Add new oxygen system testing procedures based on manufacturer updates",
      status: "UNDER DISCUSSION",
      statusColor: "blue",
      queueNumber: "002",
      commentCount: 12,
      approvalsNeeded: 3,
      activeParticipants: 8,
      comments: [
        {
          author: "Tom Chen",
          role: "Lead Mechanic",
          initials: "TC",
          time: "30m ago",
          content: "We need to coordinate this with our maintenance schedule. The new procedures will require additional training for our crew."
        },
        {
          author: "Dr. Jennifer Martinez",
          role: "Flight Physician",
          initials: "JM",
          time: "1h ago",
          content: "From a medical perspective, these updates are crucial for passenger safety. I fully support this implementation."
        },
        {
          author: "Captain Ryan Miller",
          role: "Training Captain",
          initials: "RM",
          time: "2h ago",
          content: "I agree with the medical assessment. We should also consider updating our emergency drill scenarios to include these new procedures."
        },
        {
          author: "Sarah Johnson",
          role: "Senior Flight Attendant",
          initials: "SJ",
          time: "3h ago",
          content: "The current oxygen system procedures are outdated. These updates will bring us in line with industry best practices and improve crew confidence during emergencies."
        },
        {
          author: "Michael Torres",
          role: "Quality Assurance Manager",
          initials: "MT",
          time: "4h ago",
          content: "I've reviewed the proposed changes against our QA standards. All modifications meet regulatory requirements and enhance safety protocols."
        }
      ]
    }
  ];

  const handleReviewDetails = (item) => {
    setSelectedItem(item);
    setShowReviewDetails(true);
  };

  const handleAddComment = (item) => {
    setSelectedItem(item);
    setNewComment('');
    setShowAddComment(true);
  };

  const handleViewDiscussion = (item) => {
    setSelectedItem(item);
    setShowDiscussion(true);
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    toast.success("Comment added successfully");
    setNewComment('');
    setShowAddComment(false);
  };

  const handleJoinDiscussion = (item) => {
    toast.success("You have joined the discussion. You'll receive notifications for updates.");
  };

  const handleApprove = (item) => {
    if (!canApprove) {
      toast.error("Only Document Managers can approve items");
      return;
    }
    setSelectedItem(item);
    setApprovalComment('');
    setShowApprovalDialog(true);
  };

  const handleReject = (item) => {
    if (!canApprove) {
      toast.error("Only Document Managers can reject items");
      return;
    }
    setSelectedItem(item);
    setRejectionComment('');
    setShowRejectionDialog(true);
  };

  const handleConfirmApproval = () => {
    if (!approvalComment.trim()) {
      toast.error("Please add a comment explaining your approval decision");
      return;
    }
    toast.success(`"${selectedItem.title}" has been approved and moved to implementation`);
    setShowApprovalDialog(false);
    setApprovalComment('');
  };

  const handleConfirmRejection = () => {
    if (!rejectionComment.trim()) {
      toast.error("Please add a comment explaining your rejection decision");
      return;
    }
    toast.error(`"${selectedItem.title}" has been rejected and returned to submitter`);
    setShowRejectionDialog(false);
    setRejectionComment('');
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
          <h1>Review Queue</h1>
          <p className="text-muted-foreground">
            {canApprove 
              ? "Manage pending submissions and prevent duplicates" 
              : "View pending submissions and track approval status"
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!canApprove && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <Eye className="w-4 h-4" />
              View Only Access
            </div>
          )}
          <Button className="flex items-center gap-2" onClick={() => navigate('/document-management')}>
            <Plus className="w-4 h-4" />
            New Submission
          </Button>
        </div>
      </div>

      {/* Role-based Information */}
      {!canApprove && (
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>View-Only Access:</strong> You can view all submissions and participate in discussions, but only the Document Manager can approve or reject proposals to move them forward in the workflow.
          </AlertDescription>
        </Alert>
      )}

      {/* Queue Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <div className="text-2xl font-bold">5</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">3</div>
            <div className="text-sm text-muted-foreground">Under Discussion</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">2</div>
            <div className="text-sm text-muted-foreground">Ready to Approve</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <div className="text-2xl font-bold">1</div>
            <div className="text-sm text-muted-foreground">Needs Attention</div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Items */}
      <div className="space-y-4">
        <h2>Priority Items</h2>
        
        {priorityItems.map((item) => (
          <Card key={item.id} className={`border-l-4 border-l-${item.statusColor}-500`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium">{item.title}</h3>
                    <Badge className={`bg-${item.statusColor}-100 text-${item.statusColor}-800`}>{item.status}</Badge>
                    <Badge variant="outline" className="text-xs">QUEUE #{item.queueNumber}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-2">
                    {item.document} • Submitted by {item.submitter}
                  </p>
                  <p className="text-sm mb-3">{item.description}</p>
                  
                  {/* Duplicate Alert */}
                  {item.isDuplicate && (
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Similar submission found:</strong> "Cat II Approach Updates" submitted 2 days ago. 
                        <Button variant="link" className="p-0 h-auto text-sm underline ml-1">
                          Compare submissions
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <Avatar className="w-10 h-10 mx-auto mb-2">
                    <AvatarFallback className="text-sm">{item.submitterInitials}</AvatarFallback>
                  </Avatar>
                  <div className="text-xs text-muted-foreground">{item.date}</div>
                </div>
              </div>

              {/* Comments Section */}
              {item.comments && item.comments.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 mb-4 border">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Comments ({item.comments.length})</span>
                  </div>
                  <div className="space-y-4">
                    {item.comments.map((comment, commentIndex) => (
                      <div key={commentIndex} className="flex items-start gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">{comment.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium">{comment.author}</span>
                            <Badge variant="outline" className="text-xs px-2 py-0">{comment.role}</Badge>
                            <span className="text-xs text-muted-foreground">{comment.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    {item.commentCount && item.commentCount > item.comments.length && (
                      <div className="text-center py-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleViewDiscussion(item)}
                        >
                          View {item.commentCount - item.comments.length} more comments...
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Active Discussion for item 2 */}
              {item.status === "UNDER DISCUSSION" && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Active Discussion ({item.activeParticipants} participants)</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    Tom Chen and {item.activeParticipants - 1} others are discussing implementation details and maintenance schedule coordination.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {item.stakeholders && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {item.stakeholders} stakeholders notified
                    </span>
                  )}
                  {item.commentCount && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {item.commentCount} comments
                    </span>
                  )}
                  {item.approvalsNeeded && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {item.approvalsNeeded} approvals needed
                    </span>
                  )}
                  {item.deadline && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Review deadline: {item.deadline}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleReviewDetails(item)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Review Details
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAddComment(item)}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Comment
                  </Button>
                  {item.status === "UNDER DISCUSSION" ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-blue-50"
                      onClick={() => handleViewDiscussion(item)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      View Full Discussion ({item.commentCount})
                    </Button>
                  ) : null}
                  {canApprove ? (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(item)}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(item)}>
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs px-2">
                      <Shield className="w-3 h-3" />
                      Approval Required
                    </Badge>
                  )}
                  {item.status === "UNDER DISCUSSION" && canApprove && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 text-orange-600 border-orange-200">
                      <Clock className="w-3 h-3" />
                      Awaiting Resolution
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Recently Approved Items - Visible to All */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium">Gulfstream G650 Pre-flight Inspection Updates</h3>
                  <Badge className="bg-green-100 text-green-800">APPROVED</Badge>
                  <Badge variant="outline" className="text-xs">QUEUE #000</Badge>
                </div>
                <p className="text-muted-foreground mb-2">
                  Flight Operations Manual v2.2 • Submitted by Captain Mike Johnson
                </p>
                <p className="text-sm mb-3">Updated pre-flight inspection procedures for enhanced safety compliance</p>
              </div>
              <div className="ml-4 text-right">
                <Avatar className="w-10 h-10 mx-auto mb-2">
                  <AvatarFallback className="text-sm">MJ</AvatarFallback>
                </Avatar>
                <div className="text-xs text-muted-foreground">Jan 23, 2025</div>
              </div>
            </div>

            {/* Comments Section for Approved Item */}
            <div className="bg-muted/30 rounded-lg p-4 mb-4 border">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Review Comments (3)</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">AL</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium">Amanda Lee</span>
                      <Badge variant="outline" className="text-xs px-2 py-0">Document Manager</Badge>
                      <span className="text-xs text-muted-foreground">Jan 23, 2025</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      After thorough review and stakeholder feedback, I'm approving this update. The enhanced pre-flight procedures will improve our safety standards across the G650 fleet.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">JS</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium">James Smith</span>
                      <Badge variant="outline" className="text-xs px-2 py-0">Chief Mechanic</Badge>
                      <span className="text-xs text-muted-foreground">Jan 22, 2025</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The maintenance team has reviewed these updates. They align well with our current maintenance protocols and will help catch potential issues earlier.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">KW</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium">Karen Williams</span>
                      <Badge variant="outline" className="text-xs px-2 py-0">Safety Officer</Badge>
                      <span className="text-xs text-muted-foreground">Jan 22, 2025</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Excellent proposal. These updates address several findings from our recent safety audits and will enhance our overall flight safety program.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Status */}
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Approved and Active</span>
              </div>
              <div className="text-sm text-green-700">
                This submission has been approved by the Document Manager and is now active in the fleet operations. 
                All pilots have been notified of the changes.
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Approved Jan 23, 2025
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  12 pilots notified
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Implementation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Details Dialog */}
      <Dialog open={showReviewDetails} onOpenChange={setShowReviewDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Review Details - {selectedItem?.title}
            </DialogTitle>
            <DialogDescription>
              Complete submission details and requirements analysis
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Document</Label>
                    <p className="text-sm text-muted-foreground">{selectedItem.document}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Queue Number</Label>
                    <p className="text-sm text-muted-foreground">#{selectedItem.queueNumber}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submitted By</Label>
                    <p className="text-sm text-muted-foreground">{selectedItem.submitter}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submission Date</Label>
                    <p className="text-sm text-muted-foreground">{selectedItem.date}</p>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedItem.description}</p>
                </div>

                {/* Impact Analysis */}
                <div>
                  <Label className="text-sm font-medium">Impact Analysis</Label>
                  <div className="bg-muted/50 rounded-lg p-4 mt-2">
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Fleet Operations: High impact on Gulfstream G650 operations</li>
                      <li>• Training Requirements: Pilot briefing required within 7 days</li>
                      <li>• Implementation Timeline: 14 days from approval</li>
                      <li>• Regulatory Compliance: Aligns with FAA regulation updates</li>
                    </ul>
                  </div>
                </div>

                {/* Stakeholders */}
                <div>
                  <Label className="text-sm font-medium">Stakeholders Notified</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">Flight Operations</Badge>
                    <Badge variant="outline">Safety Team</Badge>
                    <Badge variant="outline">Training Department</Badge>
                    <Badge variant="outline">Maintenance</Badge>
                    <Badge variant="outline">Quality Assurance</Badge>
                  </div>
                </div>

                {/* Comments */}
                {selectedItem.comments && (
                  <div>
                    <Label className="text-sm font-medium">Comments ({selectedItem.comments.length})</Label>
                    <div className="space-y-3 mt-2">
                      {selectedItem.comments.map((comment, index) => (
                        <div key={index} className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{comment.initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{comment.author}</span>
                                <span className="text-xs text-muted-foreground">{comment.role} • {comment.time}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Comment Dialog */}
      <Dialog open={showAddComment} onOpenChange={setShowAddComment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Add Comment
            </DialogTitle>
            <DialogDescription>
              Add your comment to "{selectedItem?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="comment">Your Comment</Label>
              <Textarea
                id="comment"
                placeholder="Enter your comment here..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddComment(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitComment}>
                <Send className="w-4 h-4 mr-2" />
                Submit Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discussion Dialog */}
      <Dialog open={showDiscussion} onOpenChange={setShowDiscussion}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Discussion - {selectedItem?.title}
            </DialogTitle>
            <DialogDescription>
              Active discussion with {selectedItem?.activeParticipants} participants
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 p-1">
                {selectedItem.comments?.map((comment, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="text-sm">{comment.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{comment.author}</span>
                          <Badge variant="outline" className="text-xs">{comment.role}</Badge>
                          <span className="text-xs text-muted-foreground">{comment.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Join Discussion Button */}
                <div className="flex justify-center pt-4">
                  <Button onClick={() => handleJoinDiscussion(selectedItem)} className="bg-blue-600 hover:bg-blue-700">
                    <Users className="w-4 h-4 mr-2" />
                    Join Discussion
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve Submission
            </DialogTitle>
            <DialogDescription>
              Provide approval comments for "{selectedItem?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-comment">Approval Comments *</Label>
              <Textarea
                id="approval-comment"
                placeholder="Explain your approval decision, implementation notes, and any requirements..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This comment will be part of the permanent record and visible to all stakeholders.
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Approval Actions</span>
              </div>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Document will be moved to implementation phase</li>
                <li>• All stakeholders will be notified</li>
                <li>• Training materials will be updated within 7 days</li>
                <li>• Fleet operations will receive immediate notification</li>
              </ul>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmApproval} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Implement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              Reject Submission
            </DialogTitle>
            <DialogDescription>
              Provide feedback for "{selectedItem?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-comment">Rejection Feedback *</Label>
              <Textarea
                id="rejection-comment"
                placeholder="Explain why this submission is being rejected and what changes are needed for resubmission..."
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide constructive feedback to help the submitter improve their proposal.
              </p>
            </div>
            
            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <X className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Rejection Actions</span>
              </div>
              <ul className="text-xs text-red-700 space-y-1">
                <li>• Submission will be returned to submitter</li>
                <li>• Submitter will receive detailed feedback</li>
                <li>• Item will be moved to "Needs Revision" status</li>
                <li>• Resubmission will be possible after addressing feedback</li>
              </ul>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmRejection} variant="destructive">
                <X className="w-4 h-4 mr-2" />
                Reject & Return
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}