import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle, XCircle, Clock, MessageSquare, AlertTriangle, User, Shield, Bell } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export type RequestType = 'Vacation' | 'Payback Stop' | 'Off' | 'Medical';
export type RequestStatus = 'pending_manager' | 'denied_by_manager' | 'tentative_manager' | 'approved_awaiting_confirmation';

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
  schedulingApproval: 'tentative';
  managerApproval?: 'approved' | 'tentative' | 'denied';
  submittedDate: Date;
  lastModified: Date;
  pbstExpirationOverride?: {
    originalExpiration: Date;
    newExpiration: Date;
    reason: string;
    overriddenBy: string;
    overrideDate: Date;
  };
}

interface PaybackStopDay {
  id: string;
  crewMemberId: string;
  crewMemberName: string;
  awardedDate: Date;
  expirationDate: Date;
  daysRemaining: number;
  reason: string;
  used: boolean;
}

export interface VacationManagerReviewProps {
  requests: VacationRequest[];
  onUpdateRequests: (updatedRequests: VacationRequest[]) => void;
}

export function VacationManagerReview({ requests, onUpdateRequests }: VacationManagerReviewProps) {

  const [pbstDays, setPbstDays] = useState<PaybackStopDay[]>([
    {
      id: 'pbst1',
      crewMemberId: 'user6',
      crewMemberName: 'Robert Garcia',
      awardedDate: new Date('2024-09-15'),
      expirationDate: new Date('2024-12-14'),
      daysRemaining: 9,
      reason: 'Worked STOP-1 on September 15',
      used: false
    },
    {
      id: 'pbst2',
      crewMemberId: 'user7',
      crewMemberName: 'Amanda Davis',
      awardedDate: new Date('2024-09-10'),
      expirationDate: new Date('2024-12-09'),
      daysRemaining: 4,
      reason: 'Worked STOP-2 on September 10',
      used: false
    }
  ]);

  const [selectedRequest, setSelectedRequest] = useState<VacationRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [managerComment, setManagerComment] = useState('');
  const [actionType, setActionType] = useState<'approved' | 'tentative' | 'denied' | null>(null);
  const [selectedPbst, setSelectedPbst] = useState<PaybackStopDay | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [newExpirationDate, setNewExpirationDate] = useState('');

  const handleManagerAction = (request: VacationRequest, action: 'approved' | 'tentative' | 'denied') => {
    setSelectedRequest(request);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const confirmManagerAction = () => {
    if (!selectedRequest || !actionType) return;

    const newComment: Comment = {
      id: `c${Date.now()}`,
      author: 'Chief Pilot - Sarah Johnson',
      role: 'manager',
      comment: managerComment || `Request marked as ${actionType}`,
      timestamp: new Date()
    };

    const updatedRequest = {
      ...selectedRequest,
      managerApproval: actionType,
      comments: [...selectedRequest.comments, newComment],
      status: (
        actionType === 'denied' ? 'denied_by_manager' :
          actionType === 'tentative' ? 'tentative_manager' :
            'approved_awaiting_confirmation'
      ) as RequestStatus,
      lastModified: new Date()
    };

    onUpdateRequests(requests.map(r => r.id === selectedRequest.id ? updatedRequest : r));
    setActionDialogOpen(false);
    setManagerComment('');
    setActionType(null);

    if (actionType === 'denied') {
      alert(`Request denied. ${selectedRequest.submitterName} has been notified.`);
    } else if (actionType === 'tentative') {
      alert('Request marked as tentative. You and scheduling will receive weekly reminders on Wednesdays at 12pm to review tentative requests.');
    } else {
      alert(`Request approved. Scheduling has been notified to confirm and add to calendar.`);
    }
  };

  const handleOverrideExpiration = (pbst: PaybackStopDay) => {
    setSelectedPbst(pbst);
    setOverrideDialogOpen(true);
  };

  const confirmOverride = () => {
    if (!selectedPbst || !overrideReason.trim() || !newExpirationDate) {
      alert('Please provide both a new expiration date and reason for override');
      return;
    }

    const updatedPbst = {
      ...selectedPbst,
      expirationDate: new Date(newExpirationDate),
      daysRemaining: Math.ceil((new Date(newExpirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    };

    setPbstDays(pbstDays.map(p => p.id === selectedPbst.id ? updatedPbst : p));
    setOverrideDialogOpen(false);
    setOverrideReason('');
    setNewExpirationDate('');
    setSelectedPbst(null);

    alert(`PBST expiration extended for ${selectedPbst.crewMemberName}. Crew member has been notified.`);
  };

  const getStatusBadge = (status: RequestStatus) => {
    const statusConfig = {
      pending_manager: { label: 'Pending Your Review', variant: 'default' as const },
      denied_by_manager: { label: 'Denied', variant: 'destructive' as const },
      tentative_manager: { label: 'Marked Tentative', variant: 'secondary' as const },
      approved_awaiting_confirmation: { label: 'Approved', variant: 'outline' as const }
    };

    return <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>;
  };

  const pendingRequests = requests.filter(r => r.status === 'pending_manager');
  const tentativeRequests = requests.filter(r => r.status === 'tentative_manager');
  const expiringPbst = pbstDays.filter(p => !p.used && p.daysRemaining <= 30);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center space-x-2 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <span>Vacation Manager Review - Chief Pilot</span>
        </h1>
        <p className="text-muted-foreground">
          Review and approve crew vacation requests and manage PBST expirations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-700">{pendingRequests.length}</div>
                <p className="text-sm text-blue-600">Pending Your Review</p>
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
                <p className="text-sm text-yellow-600">Marked Tentative</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-orange-700">{expiringPbst.length}</div>
                <p className="text-sm text-orange-600">PBST Expiring Soon</p>
              </div>
              <Bell className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Tentative Reminder */}
      {tentativeRequests.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Bell className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Weekly Reminder:</strong> You have {tentativeRequests.length} tentative request(s) pending final approval.
            You will receive a reminder every Wednesday at 12pm until these are resolved.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tentative">
            Tentative
            {tentativeRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{tentativeRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pbst">
            PBST Management
            {expiringPbst.length > 0 && (
              <Badge variant="destructive" className="ml-2">{expiringPbst.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No requests pending your review</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <Card key={request.id} className="border-blue-300">
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
                  {/* Scheduling Status */}
                  <Alert className="border-purple-200 bg-purple-50">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-800">
                      <strong>Scheduling Review:</strong> Marked as Tentative - Manager approval needed
                    </AlertDescription>
                  </Alert>

                  {/* Comments Thread */}
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

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button
                      onClick={() => handleManagerAction(request, 'approved')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleManagerAction(request, 'tentative')}
                      className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Mark Tentative
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleManagerAction(request, 'denied')}
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
            <>
              <Alert className="border-yellow-200 bg-yellow-50">
                <Bell className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Reminder Schedule:</strong> Every Wednesday at 12pm, you and scheduling will receive a notification to review all tentative requests.
                </AlertDescription>
              </Alert>

              {tentativeRequests.map((request) => (
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

                    {/* Review Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Button
                        onClick={() => handleManagerAction(request, 'approved')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Now
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleManagerAction(request, 'denied')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Deny
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="pbst" className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>PBST Policy:</strong> Crew members have 91 days to submit a request after being awarded a Payback Stop day.
              As manager, you can override expiration dates with a documented reason.
            </AlertDescription>
          </Alert>

          {pbstDays.filter(p => !p.used).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No PBST days to manage</p>
              </CardContent>
            </Card>
          ) : (
            pbstDays.filter(p => !p.used).sort((a, b) => a.daysRemaining - b.daysRemaining).map((pbst) => (
              <Card key={pbst.id} className={pbst.daysRemaining <= 7 ? 'border-red-300 bg-red-50/30' : pbst.daysRemaining <= 30 ? 'border-yellow-300' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3">
                        <User className="h-5 w-5" />
                        {pbst.crewMemberName}
                        {pbst.daysRemaining <= 3 && (
                          <Badge variant="destructive" className="animate-pulse">URGENT: {pbst.daysRemaining} days left</Badge>
                        )}
                        {pbst.daysRemaining > 3 && pbst.daysRemaining <= 7 && (
                          <Badge variant="destructive">{pbst.daysRemaining} days left</Badge>
                        )}
                        {pbst.daysRemaining > 7 && pbst.daysRemaining <= 30 && (
                          <Badge variant="secondary">{pbst.daysRemaining} days left</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {pbst.reason}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleOverrideExpiration(pbst)}
                    >
                      Override Expiration
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Awarded Date</p>
                      <p className="font-medium">{pbst.awardedDate.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expiration Date</p>
                      <p className="font-medium">{pbst.expirationDate.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Remaining</p>
                      <p className={`font-medium ${pbst.daysRemaining <= 7 ? 'text-red-600' : pbst.daysRemaining <= 30 ? 'text-yellow-600' : ''}`}>
                        {pbst.daysRemaining} days
                      </p>
                    </div>
                  </div>

                  {pbst.daysRemaining <= 7 && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>{pbst.daysRemaining <= 3 ? 'URGENT: ' : ''}Expiring soon!</strong> Crew member has been notified.
                        Consider extending the deadline if circumstances warrant.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div
                      className={`h-2 rounded-full ${pbst.daysRemaining <= 3 ? 'bg-red-500' :
                        pbst.daysRemaining <= 7 ? 'bg-orange-500' :
                          pbst.daysRemaining <= 30 ? 'bg-yellow-500' :
                            'bg-green-500'
                        }`}
                      style={{ width: `${(pbst.daysRemaining / 91) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Manager Action Dialog */}
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

            {actionType === 'approved' && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  This request will be sent back to scheduling for final confirmation and calendar entry.
                </AlertDescription>
              </Alert>
            )}

            {actionType === 'tentative' && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  You will receive weekly reminders every Wednesday at 12pm until this is approved or denied.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="managerComment">
                {actionType === 'denied' ? 'Reason for Denial *' : 'Comments (Optional)'}
              </Label>
              <Textarea
                id="managerComment"
                placeholder={
                  actionType === 'denied' ? 'Please explain why this request is being denied...' :
                    actionType === 'tentative' ? 'Explain why this is tentative and what you need before final approval...' :
                      'Add any additional comments...'
                }
                value={managerComment}
                onChange={(e) => setManagerComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionDialogOpen(false);
              setManagerComment('');
              setActionType(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={confirmManagerAction}
              disabled={actionType === 'denied' && !managerComment.trim()}
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

      {/* PBST Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override PBST Expiration</DialogTitle>
            <DialogDescription>
              {selectedPbst && `${selectedPbst.crewMemberName} - Awarded ${selectedPbst.awardedDate.toLocaleDateString()}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Manager Override:</strong> You are extending the 91-day policy deadline.
                A documented reason is required for audit purposes.
              </AlertDescription>
            </Alert>

            {selectedPbst && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Current Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current Expiration:</span>
                    <p className="font-medium">{selectedPbst.expirationDate.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days Remaining:</span>
                    <p className={`font-medium ${selectedPbst.daysRemaining <= 7 ? 'text-red-600' : ''}`}>
                      {selectedPbst.daysRemaining} days
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newExpiration">New Expiration Date *</Label>
              <Input
                id="newExpiration"
                type="date"
                value={newExpirationDate}
                onChange={(e) => setNewExpirationDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="overrideReason">Reason for Override *</Label>
              <Textarea
                id="overrideReason"
                placeholder="Explain why you are extending this deadline (e.g., crew member was on medical leave, operational requirements, etc.)..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setOverrideDialogOpen(false);
              setOverrideReason('');
              setNewExpirationDate('');
              setSelectedPbst(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={confirmOverride}
              disabled={!overrideReason.trim() || !newExpirationDate}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
