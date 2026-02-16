import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle, XCircle, Clock, MessageSquare, AlertTriangle, User, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

export type RequestType = 'Vacation' | 'Payback Stop' | 'Off' | 'Medical';
export type RequestStatus = 'pending_scheduling' | 'denied_by_scheduling' | 'tentative_scheduling' | 'pending_manager' | 'denied_by_manager' | 'tentative_manager' | 'approved_awaiting_confirmation' | 'confirmed';

export interface Comment {
  id: string;
  author: string;
  role: 'submitter' | 'scheduling' | 'manager';
  comment: string;
  timestamp: Date;
}

export interface VacationRequest {
  id: string;
  submitterId: string;
  submitterName: string;
  submitterPosition: string;
  requestType: RequestType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: RequestStatus;
  comments: Comment[];
  schedulingApproval?: 'approved' | 'tentative' | 'denied';
  managerApproval?: 'approved' | 'tentative' | 'denied';
  submittedDate: Date;
  lastModified: Date;
}

export interface VacationSchedulingApprovalsProps {
  requests: VacationRequest[];
  onUpdateRequests: (updatedRequests: VacationRequest[]) => void;
}

export function VacationSchedulingApprovals({ requests, onUpdateRequests }: VacationSchedulingApprovalsProps) {

  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [schedulingComment, setSchedulingComment] = useState('');
  const [actionType, setActionType] = useState<'approved' | 'tentative' | 'denied' | null>(null);

  const [notifications] = useState([
    { id: 'n1', message: 'New vacation request from John Smith', time: '2 hours ago', unread: true },
    { id: 'n2', message: 'Mike Johnson submitted Payback Stop request', time: '5 hours ago', unread: true },
    { id: 'n3', message: 'Manager approved Sarah Williams medical leave', time: '1 day ago', unread: false }
  ]);

  const handleSchedulingAction = (request: VacationRequest, action: 'approved' | 'tentative' | 'denied') => {
    setSelectedRequest(request);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const confirmSchedulingAction = () => {
    if (!selectedRequest || !actionType) return;

    const newComment: Comment = {
      id: `c${Date.now()}`,
      author: 'Scheduling - Tom Brown',
      role: 'scheduling',
      comment: schedulingComment || `Request marked as ${actionType}`,
      timestamp: new Date()
    };

    const updatedRequest = {
      ...selectedRequest,
      schedulingApproval: actionType,
      comments: [...selectedRequest.comments, newComment],
      status: (
        actionType === 'denied' ? 'denied_by_scheduling' :
          actionType === 'tentative' ? 'pending_manager' :
            'approved_awaiting_confirmation'
      ) as RequestStatus,
      lastModified: new Date()
    };

    setRequests(requests.map(r => r.id === selectedRequest.id ? updatedRequest : r));
    setActionDialogOpen(false);
    setSchedulingComment('');
    setActionType(null);

    // Would trigger notification here
    if (actionType === 'denied') {
      alert(`Request denied. ${selectedRequest.submitterName} has been notified.`);
    } else if (actionType === 'tentative') {
      alert(`Request marked as tentative. Manager has been notified for review.`);
    } else {
      alert(`Request approved. Awaiting final confirmation to add to calendar.`);
    }
  };

  const handleConfirmToCalendar = (request: VacationRequest) => {
    setSelectedRequest(request);
    setConfirmDialogOpen(true);
  };

  const confirmAddToCalendar = () => {
    if (!selectedRequest) return;

    const updatedRequest = {
      ...selectedRequest,
      status: 'confirmed' as RequestStatus,
      lastModified: new Date()
    };

    setRequests(requests.map(r => r.id === selectedRequest.id ? updatedRequest : r));
    setConfirmDialogOpen(false);

    alert(`Request confirmed and added to Vacation Master Calendar. ${selectedRequest.submitterName} has been notified.`);
  };

  const getStatusBadge = (status: RequestStatus) => {
    const statusConfig = {
      pending_scheduling: { label: 'Pending Review', variant: 'default' as const },
      denied_by_scheduling: { label: 'Denied', variant: 'destructive' as const },
      tentative_scheduling: { label: 'Tentative', variant: 'secondary' as const },
      pending_manager: { label: 'With Manager', variant: 'default' as const },
      denied_by_manager: { label: 'Denied by Manager', variant: 'destructive' as const },
      tentative_manager: { label: 'Tentative - Manager', variant: 'secondary' as const },
      approved_awaiting_confirmation: { label: 'Ready to Confirm', variant: 'outline' as const },
      confirmed: { label: 'Confirmed', variant: 'default' as const }
    };

    return <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>;
  };

  const pendingRequests = requests.filter(r => r.status === 'pending_scheduling');
  const tentativeRequests = requests.filter(r => r.status === 'tentative_scheduling' || r.status === 'pending_manager' || r.status === 'tentative_manager');
  const awaitingConfirmation = requests.filter(r => r.status === 'approved_awaiting_confirmation');
  const confirmedRequests = requests.filter(r => r.status === 'confirmed');

  return (
    <div className="space-y-6 p-6">
      {/* Header with Notifications */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center space-x-2 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <span>Vacation Request Approvals - Scheduling</span>
          </h1>
          <p className="text-muted-foreground">
            Review and approve vacation, payback stop, and time off requests
          </p>
        </div>

        <Card className="w-64">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Recent Notifications
              {notifications.filter(n => n.unread).length > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {notifications.filter(n => n.unread).length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 3).map((notif) => (
              <div key={notif.id} className={`text-xs p-2 rounded ${notif.unread ? 'bg-blue-50 border border-blue-200' : 'bg-muted'}`}>
                <p className={notif.unread ? 'font-medium' : ''}>{notif.message}</p>
                <p className="text-muted-foreground mt-1">{notif.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-700">{pendingRequests.length}</div>
                <p className="text-sm text-blue-600">Pending Review</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-yellow-700">{tentativeRequests.length}</div>
                <p className="text-sm text-yellow-600">Tentative / With Manager</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-orange-700">{awaitingConfirmation.length}</div>
                <p className="text-sm text-orange-600">Awaiting Confirmation</p>
              </div>
              <CheckCircle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-700">{confirmedRequests.length}</div>
                <p className="text-sm text-green-600">Confirmed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tentative">
            Tentative / In Progress
            {tentativeRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{tentativeRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmation">
            Awaiting Confirmation
            {awaitingConfirmation.length > 0 && (
              <Badge variant="outline" className="ml-2">{awaitingConfirmation.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <User className="h-5 w-5" />
                        {request.submitterName}
                        <Badge variant="outline">{request.submitterPosition}</Badge>
                        {getStatusBadge(request.status)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <strong>{request.requestType}</strong> | {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()} ({request.daysRequested} days)
                      </CardDescription>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted: {request.submittedDate.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Comments */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comments
                    </Label>
                    {request.comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">{comment.timestamp.toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button
                      onClick={() => handleSchedulingAction(request, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSchedulingAction(request, 'tentative')}
                      className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Mark Tentative
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleSchedulingAction(request, 'denied')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Deny
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="tentative" className="space-y-4">
          {tentativeRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tentative requests</p>
              </CardContent>
            </Card>
          ) : (
            tentativeRequests.map((request) => (
              <Card key={request.id} className="border-yellow-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <User className="h-5 w-5" />
                        {request.submitterName}
                        <Badge variant="outline">{request.submitterPosition}</Badge>
                        {getStatusBadge(request.status)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <strong>{request.requestType}</strong> | {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()} ({request.daysRequested} days)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      {request.status === 'pending_manager' && 'Sent to manager for review'}
                      {request.status === 'tentative_scheduling' && 'Marked as tentative - awaiting additional review'}
                      {request.status === 'tentative_manager' && 'Manager marked as tentative - weekly review on Wednesdays at 12pm'}
                    </AlertDescription>
                  </Alert>

                  {/* Comments */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comment History
                    </Label>
                    {request.comments.map((comment) => (
                      <div key={comment.id} className={`p-3 rounded-lg border-l-4 ${comment.role === 'submitter' ? 'bg-blue-50 border-blue-500' :
                        comment.role === 'scheduling' ? 'bg-purple-50 border-purple-500' :
                          'bg-orange-50 border-orange-500'
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">{comment.timestamp.toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="confirmation" className="space-y-4">
          {awaitingConfirmation.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No requests awaiting confirmation</p>
              </CardContent>
            </Card>
          ) : (
            awaitingConfirmation.map((request) => (
              <Card key={request.id} className="border-green-300 bg-green-50/30">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3">
                        <User className="h-5 w-5" />
                        {request.submitterName}
                        <Badge variant="outline">{request.submitterPosition}</Badge>
                        {getStatusBadge(request.status)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <strong>{request.requestType}</strong> | {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()} ({request.daysRequested} days)
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleConfirmToCalendar(request)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm & Add to Calendar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>Approved by all parties.</strong> Click "Confirm & Add to Calendar" to finalize and notify the crew member.
                    </AlertDescription>
                  </Alert>

                  {/* Approval Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-white rounded-lg border">
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduling Approval</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Approved</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Manager Approval</p>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Approved</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Full Comment History
                    </Label>
                    {request.comments.map((comment) => (
                      <div key={comment.id} className={`p-3 rounded-lg border-l-4 ${comment.role === 'submitter' ? 'bg-blue-50 border-blue-500' :
                        comment.role === 'scheduling' ? 'bg-purple-50 border-purple-500' :
                          'bg-orange-50 border-orange-500'
                        }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">{comment.timestamp.toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          {confirmedRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No confirmed requests yet</p>
              </CardContent>
            </Card>
          ) : (
            confirmedRequests.map((request) => (
              <Card key={request.id} className="border-green-500 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    {request.submitterName}
                    <Badge variant="outline">{request.submitterPosition}</Badge>
                    {getStatusBadge(request.status)}
                  </CardTitle>
                  <CardDescription>
                    <strong>{request.requestType}</strong> | {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()} ({request.daysRequested} days)
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' && 'Approve Request'}
              {actionType === 'tentative' && 'Mark as Tentative'}
              {actionType === 'denied' && 'Deny Request'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && `${selectedRequest.submitterName} - ${selectedRequest.requestType} (${selectedRequest.daysRequested} days)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === 'denied' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Required:</strong> Please provide a reason for denial. The crew member will be notified with your comments.
                </AlertDescription>
              </Alert>
            )}

            {actionType === 'tentative' && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  This request will be sent to the crew member&apos;s manager for review.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="schedulingComment">
                {actionType === 'denied' ? 'Reason for Denial *' : 'Comments (Optional)'}
              </Label>
              <Textarea
                id="schedulingComment"
                placeholder={
                  actionType === 'denied' ? 'Please explain why this request is being denied...' :
                    actionType === 'tentative' ? 'Add any notes or concerns for manager review...' :
                      'Add any additional comments...'
                }
                value={schedulingComment}
                onChange={(e) => setSchedulingComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionDialogOpen(false);
              setSchedulingComment('');
              setActionType(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={confirmSchedulingAction}
              disabled={actionType === 'denied' && !schedulingComment.trim()}
              className={
                actionType === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                  actionType === 'denied' ? 'bg-red-600 hover:bg-red-700' :
                    ''
              }
            >
              Confirm {actionType === 'approved' ? 'Approval' : actionType === 'tentative' ? 'Tentative' : 'Denial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm to Calendar Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm and Add to Master Calendar</DialogTitle>
            <DialogDescription>
              {selectedRequest && `${selectedRequest.submitterName} - ${selectedRequest.requestType}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                This request has been approved by all parties. Confirming will:
                <ul className="list-disc ml-6 mt-2">
                  <li>Add the time off to the Vacation Master Calendar</li>
                  <li>Update crew availability in the scheduling system</li>
                  <li>Send a confirmation notification to the crew member</li>
                  {selectedRequest?.requestType === 'Payback Stop' && (
                    <li>Deduct 1 day from the crew member&apos;s PBST balance</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>

            {selectedRequest && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Request Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Start Date:</span>
                    <p className="font-medium">{new Date(selectedRequest.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">End Date:</span>
                    <p className="font-medium">{new Date(selectedRequest.endDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days:</span>
                    <p className="font-medium">{selectedRequest.daysRequested} days</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{selectedRequest.requestType}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAddToCalendar}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm & Add to Calendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
