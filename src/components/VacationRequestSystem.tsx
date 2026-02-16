import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, MessageSquare, Bell, Plane, Plus, Edit2 } from 'lucide-react';

type RequestType = 'Vacation' | 'Payback Stop' | 'Off' | 'Medical';
type RequestStatus = 'pending_scheduling' | 'denied_by_scheduling' | 'tentative_scheduling' | 'pending_manager' | 'denied_by_manager' | 'tentative_manager' | 'approved_awaiting_confirmation' | 'confirmed';

interface Comment {
  id: string;
  author: string;
  role: 'submitter' | 'scheduling' | 'manager';
  comment: string;
  timestamp: Date;
}

interface VacationRequest {
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

interface PaybackStopDay {
  id: string;
  awardedDate: Date;
  expirationDate: Date;
  daysRemaining: number;
  reason: string;
  used: boolean;
}

interface CrewMember {
  id: string;
  name: string;
  position: string;
  paybackStopBalance: number;
  paybackStopDays: PaybackStopDay[];
  manager: string;
}

export function VacationRequestSystem() {
  const [activeTab, setActiveTab] = useState('submit');
  const [currentUser] = useState<CrewMember>({
    id: 'user1',
    name: 'John Smith',
    position: 'Captain',
    paybackStopBalance: 3,
    manager: 'Chief Pilot - Sarah Johnson',
    paybackStopDays: [
      {
        id: 'pbst1',
        awardedDate: new Date('2024-10-15'),
        expirationDate: new Date('2025-01-13'),
        daysRemaining: 39,
        reason: 'Worked STOP-1 on October 15',
        used: false
      },
      {
        id: 'pbst2',
        awardedDate: new Date('2024-11-20'),
        expirationDate: new Date('2025-02-18'),
        daysRemaining: 75,
        reason: 'Worked STOP-2 on November 20',
        used: false
      }
    ]
  });

  const [requests, setRequests] = useState<VacationRequest[]>([
    {
      id: 'req1',
      submitterId: 'user1',
      submitterName: 'John Smith',
      submitterPosition: 'Captain',
      requestType: 'Vacation',
      startDate: '2025-01-15',
      endDate: '2025-01-22',
      daysRequested: 7,
      status: 'pending_scheduling',
      comments: [
        {
          id: 'c1',
          author: 'John Smith',
          role: 'submitter',
          comment: 'Requesting vacation for family trip to Hawaii.',
          timestamp: new Date('2024-12-01T10:00:00')
        }
      ],
      submittedDate: new Date('2024-12-01T10:00:00'),
      lastModified: new Date('2024-12-01T10:00:00')
    },
    {
      id: 'req2',
      submitterId: 'user2',
      submitterName: 'Mike Johnson',
      submitterPosition: 'First Officer',
      requestType: 'Payback Stop',
      startDate: '2025-01-10',
      endDate: '2025-01-11',
      daysRequested: 1,
      status: 'tentative_scheduling',
      schedulingApproval: 'tentative',
      comments: [
        {
          id: 'c2',
          author: 'Mike Johnson',
          role: 'submitter',
          comment: 'Using PBST day from November STOP coverage.',
          timestamp: new Date('2024-12-02T14:00:00')
        },
        {
          id: 'c3',
          author: 'Scheduling - Tom Brown',
          role: 'scheduling',
          comment: 'Marked as tentative - need to check coverage during this period.',
          timestamp: new Date('2024-12-03T09:00:00')
        }
      ],
      submittedDate: new Date('2024-12-02T14:00:00'),
      lastModified: new Date('2024-12-03T09:00:00')
    }
  ]);

  const [newRequest, setNewRequest] = useState({
    requestType: '' as RequestType | '',
    startDate: '',
    endDate: '',
    comments: ''
  });

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmitRequest = () => {
    if (!newRequest.requestType || !newRequest.startDate || !newRequest.endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const daysRequested = calculateDays(newRequest.startDate, newRequest.endDate);

    const request: VacationRequest = {
      id: `req${Date.now()}`,
      submitterId: currentUser.id,
      submitterName: currentUser.name,
      submitterPosition: currentUser.position,
      requestType: newRequest.requestType as RequestType,
      startDate: newRequest.startDate,
      endDate: newRequest.endDate,
      daysRequested,
      status: 'pending_scheduling',
      comments: newRequest.comments ? [{
        id: `c${Date.now()}`,
        author: currentUser.name,
        role: 'submitter',
        comment: newRequest.comments,
        timestamp: new Date()
      }] : [],
      submittedDate: new Date(),
      lastModified: new Date()
    };

    setRequests([...requests, request]);
    setNewRequest({ requestType: '', startDate: '', endDate: '', comments: '' });
    
    // Would trigger notification to scheduling here
    alert('Request submitted! Scheduling has been notified.');
  };

  const getStatusBadge = (status: RequestStatus) => {
    const statusConfig = {
      pending_scheduling: { label: 'Pending Scheduling', variant: 'default' as const, color: 'bg-blue-500' },
      denied_by_scheduling: { label: 'Denied by Scheduling', variant: 'destructive' as const, color: 'bg-red-500' },
      tentative_scheduling: { label: 'Tentative - Scheduling', variant: 'secondary' as const, color: 'bg-yellow-500' },
      pending_manager: { label: 'Pending Manager', variant: 'default' as const, color: 'bg-purple-500' },
      denied_by_manager: { label: 'Denied by Manager', variant: 'destructive' as const, color: 'bg-red-500' },
      tentative_manager: { label: 'Tentative - Manager', variant: 'secondary' as const, color: 'bg-orange-500' },
      approved_awaiting_confirmation: { label: 'Approved - Awaiting Confirmation', variant: 'outline' as const, color: 'bg-green-400' },
      confirmed: { label: 'Confirmed', variant: 'default' as const, color: 'bg-green-500' }
    };

    return <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>;
  };

  const getExpirationAlert = (daysRemaining: number) => {
    if (daysRemaining <= 3) {
      return { severity: 'error', message: `URGENT: Only ${daysRemaining} days remaining!` };
    } else if (daysRemaining <= 7) {
      return { severity: 'warning', message: `${daysRemaining} days remaining` };
    }
    return null;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center space-x-2 mb-2">
          <Calendar className="h-8 w-8 text-primary" />
          <span>Vacation & Time Off Request System</span>
        </h1>
        <p className="text-muted-foreground">
          Submit and track vacation, payback stop, off days, and medical leave requests
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="submit">Submit Request</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          <TabsTrigger value="pbst-balance">PBST Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-6">
          {/* Payback Stop Balance Summary */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Payback Stop Day Balance</span>
                <Badge className="text-lg px-4 py-2">{currentUser.paybackStopBalance} Days Available</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentUser.paybackStopDays.filter(p => !p.used).map((pbst) => {
                  const alert = getExpirationAlert(pbst.daysRemaining);
                  return (
                    <div key={pbst.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium">{pbst.reason}</p>
                        <p className="text-sm text-muted-foreground">
                          Awarded: {pbst.awardedDate.toLocaleDateString()} | Expires: {pbst.expirationDate.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {alert && (
                          <div className={`flex items-center gap-2 px-3 py-1 rounded ${
                            alert.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">{alert.message}</span>
                          </div>
                        )}
                        <Badge variant="outline">{pbst.daysRemaining} days left</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Submit New Request Form */}
          <Card>
            <CardHeader>
              <CardTitle>Submit New Request</CardTitle>
              <CardDescription>Choose request type and provide details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestType">Request Type *</Label>
                  <Select value={newRequest.requestType} onValueChange={(value: RequestType) => setNewRequest({...newRequest, requestType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select request type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vacation">Vacation</SelectItem>
                      <SelectItem value="Payback Stop">Payback Stop (PBST)</SelectItem>
                      <SelectItem value="Off">Off Day</SelectItem>
                      <SelectItem value="Medical">Medical Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Days Requested</Label>
                  <Input 
                    value={calculateDays(newRequest.startDate, newRequest.endDate) || ''} 
                    disabled 
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input 
                    id="startDate"
                    type="date" 
                    value={newRequest.startDate}
                    onChange={(e) => setNewRequest({...newRequest, startDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input 
                    id="endDate"
                    type="date" 
                    value={newRequest.endDate}
                    onChange={(e) => setNewRequest({...newRequest, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments / Reason</Label>
                <Textarea 
                  id="comments"
                  placeholder="Provide any additional details or reason for this request..."
                  value={newRequest.comments}
                  onChange={(e) => setNewRequest({...newRequest, comments: e.target.value})}
                  rows={4}
                />
              </div>

              {newRequest.requestType === 'Payback Stop' && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Note:</strong> This will deduct 1 day from your Payback Stop balance ({currentUser.paybackStopBalance} available). 
                    Make sure to submit within 91 days of being awarded the PBST day.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setNewRequest({ requestType: '', startDate: '', endDate: '', comments: '' })}>
                  Clear
                </Button>
                <Button onClick={handleSubmitRequest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-4">
          {requests.filter(r => r.submitterId === currentUser.id).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No requests submitted yet</p>
              </CardContent>
            </Card>
          ) : (
            requests.filter(r => r.submitterId === currentUser.id).map((request) => (
              <Card key={request.id} className={request.status.includes('denied') ? 'border-red-300' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        {request.requestType}
                        {getStatusBadge(request.status)}
                      </CardTitle>
                      <CardDescription>
                        {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()} 
                        ({request.daysRequested} days)
                      </CardDescription>
                    </div>
                    {request.status.includes('denied') && (
                      <Button size="sm" variant="outline">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Modify & Resubmit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Comments Thread */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4" />
                      <span>Comments & Communication</span>
                    </div>
                    {request.comments.map((comment) => (
                      <div key={comment.id} className={`p-3 rounded-lg border-l-4 ${
                        comment.role === 'submitter' ? 'bg-blue-50 border-blue-500' :
                        comment.role === 'scheduling' ? 'bg-purple-50 border-purple-500' :
                        'bg-orange-50 border-orange-500'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {comment.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                    ))}
                  </div>

                  {/* Approval Timeline */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Approval Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          request.schedulingApproval ? 'bg-green-500 text-white' : 'bg-gray-300'
                        }`}>
                          {request.schedulingApproval ? <CheckCircle className="h-4 w-4" /> : '1'}
                        </div>
                        <span className="text-sm">Scheduling</span>
                      </div>
                      <div className="h-0.5 w-12 bg-gray-300" />
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          request.managerApproval ? 'bg-green-500 text-white' : 'bg-gray-300'
                        }`}>
                          {request.managerApproval ? <CheckCircle className="h-4 w-4" /> : '2'}
                        </div>
                        <span className="text-sm">Manager</span>
                      </div>
                      <div className="h-0.5 w-12 bg-gray-300" />
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          request.status === 'confirmed' ? 'bg-green-500 text-white' : 'bg-gray-300'
                        }`}>
                          {request.status === 'confirmed' ? <CheckCircle className="h-4 w-4" /> : '3'}
                        </div>
                        <span className="text-sm">Confirmed</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="pbst-balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payback Stop Day Details</CardTitle>
              <CardDescription>Track all awarded PBST days and expiration dates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-green-700">{currentUser.paybackStopBalance}</div>
                      <p className="text-sm text-green-600">Available Days</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-blue-700">
                        {currentUser.paybackStopDays.filter(p => !p.used).length}
                      </div>
                      <p className="text-sm text-blue-600">Active Awards</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold text-orange-700">
                        {currentUser.paybackStopDays.filter(p => !p.used && p.daysRemaining <= 30).length}
                      </div>
                      <p className="text-sm text-orange-600">Expiring Soon</p>
                    </CardContent>
                  </Card>
                </div>

                {currentUser.paybackStopDays.map((pbst) => {
                  const alert = getExpirationAlert(pbst.daysRemaining);
                  return (
                    <Card key={pbst.id} className={pbst.used ? 'opacity-50' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium">{pbst.reason}</h4>
                              {pbst.used ? (
                                <Badge variant="secondary">Used</Badge>
                              ) : (
                                <Badge variant="default">Available</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Awarded</p>
                                <p className="font-medium">{pbst.awardedDate.toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Expires</p>
                                <p className="font-medium">{pbst.expirationDate.toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Days Until Expiration</p>
                                <p className="font-medium">{pbst.daysRemaining} days</p>
                              </div>
                            </div>
                          </div>
                          {!pbst.used && alert && (
                            <Alert className={`ml-4 w-64 ${
                              alert.severity === 'error' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
                            }`}>
                              <AlertTriangle className={`h-4 w-4 ${
                                alert.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                              }`} />
                              <AlertDescription className={
                                alert.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                              }>
                                {alert.message}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        {!pbst.used && pbst.daysRemaining > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                pbst.daysRemaining <= 3 ? 'bg-red-500' :
                                pbst.daysRemaining <= 7 ? 'bg-yellow-500' :
                                pbst.daysRemaining <= 30 ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${(pbst.daysRemaining / 91) * 100}%` }}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
