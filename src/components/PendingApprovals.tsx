import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  User,
  Send,
  Eye,
  Filter
} from 'lucide-react';

interface ChangeRequest {
  id: string;
  airportIcao: string;
  airportName: string;
  submittedBy: string;
  submittedDate: string;
  changeType: 'new-airport' | 'correction' | 'update';
  changes: any;
  reason: string;
  status: 'pending-approver' | 'pending-chief-pilot' | 'pending-scheduling' | 'approved' | 'denied';
  approverStatus?: 'approved' | 'denied';
  approverComments?: string;
  approverDate?: string;
  chiefPilotStatus?: 'approved' | 'denied';
  chiefPilotComments?: string;
  chiefPilotDate?: string;
  schedulingStatus?: 'approved' | 'denied';
  schedulingComments?: string;
  schedulingDate?: string;
}

interface PendingApprovalsProps {
  changeRequests: ChangeRequest[];
  onBack: () => void;
}

export default function PendingApprovals({ changeRequests, onBack }: PendingApprovalsProps) {
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [userRole, setUserRole] = useState<'approver' | 'chief-pilot' | 'scheduling'>('approver');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deny'>('approve');
  const [comments, setComments] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'my-pending'>('my-pending');

  const handleAction = (request: ChangeRequest, action: 'approve' | 'deny') => {
    setSelectedRequest(request);
    setActionType(action);
    setShowCommentModal(true);
  };

  const submitAction = () => {
    if (!selectedRequest) return;

    const roleText = userRole === 'approver' ? 'Airport Evaluation Officer' : 
                     userRole === 'chief-pilot' ? 'Chief Pilot' : 'Scheduling Manager';
    
    if (actionType === 'approve') {
      alert(`Approved by ${roleText}\n\nAirport: ${selectedRequest.airportIcao}\n${comments ? `Comments: ${comments}` : ''}\n\nThis will move to the next approval step.`);
    } else {
      if (!comments) {
        alert('Please provide a reason for denial');
        return;
      }
      alert(`Denied by ${roleText}\n\nAirport: ${selectedRequest.airportIcao}\nReason: ${comments}\n\n${userRole === 'approver' ? 'The request has been denied.' : 'This will be sent back to the Airport Evaluation Officer for review.'}`);
    }

    setShowCommentModal(false);
    setComments('');
    setSelectedRequest(null);
  };

  const getStatusBadge = (request: ChangeRequest) => {
    const statusConfig = {
      'pending-approver': { 
        color: 'bg-yellow-100 text-yellow-700', 
        icon: Clock, 
        text: 'Pending Approver' 
      },
      'pending-chief-pilot': { 
        color: 'bg-blue-100 text-blue-700', 
        icon: Clock, 
        text: 'Pending Chief Pilot' 
      },
      'pending-scheduling': { 
        color: 'bg-purple-100 text-purple-700', 
        icon: Clock, 
        text: 'Pending Scheduling' 
      },
      'approved': { 
        color: 'bg-green-100 text-green-700', 
        icon: CheckCircle, 
        text: 'Approved' 
      },
      'denied': { 
        color: 'bg-red-100 text-red-700', 
        icon: XCircle, 
        text: 'Denied' 
      }
    };

    const config = statusConfig[request.status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.text}
      </span>
    );
  };

  const getChangeTypeBadge = (type: string) => {
    const typeConfig = {
      'new-airport': { color: 'bg-blue-100 text-blue-700', text: 'New Airport' },
      'correction': { color: 'bg-orange-100 text-orange-700', text: 'Correction' },
      'update': { color: 'bg-purple-100 text-purple-700', text: 'Update' }
    };

    const config = typeConfig[type] || typeConfig['correction'];

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const canApprove = (request: ChangeRequest) => {
    if (userRole === 'approver' && request.status === 'pending-approver') return true;
    if (userRole === 'chief-pilot' && request.status === 'pending-chief-pilot') return true;
    if (userRole === 'scheduling' && request.status === 'pending-scheduling') return true;
    return false;
  };

  const filteredRequests = filterStatus === 'my-pending' 
    ? changeRequests.filter(r => canApprove(r))
    : changeRequests;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Airports
        </Button>
        <h1 className="text-2xl">Pending Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve airport evaluation changes
        </p>
      </div>

      {/* Role Selector (Demo purposes) */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-4">
          <User className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-1">Your Role (Demo Mode)</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={userRole === 'approver' ? 'default' : 'outline'}
                onClick={() => setUserRole('approver')}
              >
                Airport Eval Officer
              </Button>
              <Button
                size="sm"
                variant={userRole === 'chief-pilot' ? 'default' : 'outline'}
                onClick={() => setUserRole('chief-pilot')}
              >
                Chief Pilot
              </Button>
              <Button
                size="sm"
                variant={userRole === 'scheduling' ? 'default' : 'outline'}
                onClick={() => setUserRole('scheduling')}
              >
                Scheduling Manager
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Filter className="w-5 h-5 text-muted-foreground" />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filterStatus === 'my-pending' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('my-pending')}
          >
            My Pending ({changeRequests.filter(r => canApprove(r)).length})
          </Button>
          <Button
            size="sm"
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
          >
            All Requests ({changeRequests.length})
          </Button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg mb-2">No Pending Approvals</h3>
            <p className="text-muted-foreground">
              {filterStatus === 'my-pending' 
                ? 'You have no pending requests requiring your approval'
                : 'All requests have been processed'
              }
            </p>
          </Card>
        ) : (
          filteredRequests.map(request => (
            <Card key={request.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{request.airportIcao}</h3>
                    <span className="text-muted-foreground">•</span>
                    <span>{request.airportName}</span>
                    {getChangeTypeBadge(request.changeType)}
                    {getStatusBadge(request)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Submitted by {request.submittedBy} on {new Date(request.submittedDate).toLocaleDateString()}
                  </div>
                </div>

                {canApprove(request) && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAction(request, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(request, 'deny')}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Deny
                    </Button>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="mb-4 p-4 bg-accent rounded-lg">
                <p className="text-sm font-semibold mb-1">Reason for Change</p>
                <p className="text-sm text-muted-foreground">{request.reason}</p>
              </div>

              {/* Changes Details */}
              {request.changeType !== 'new-airport' && Object.keys(request.changes).length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">Requested Changes:</p>
                  <div className="space-y-2">
                    {Object.entries(request.changes).map(([field, value]) => (
                      <div key={field} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <p className="font-medium text-blue-900">{field}</p>
                        <p className="text-blue-700 mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Timeline */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">Approval Timeline</p>
                <div className="space-y-3">
                  {/* Approver */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      request.approverStatus === 'approved' ? 'bg-green-100' :
                      request.approverStatus === 'denied' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      {request.approverStatus === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : request.approverStatus === 'denied' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Airport Evaluation Officer</p>
                      {request.approverStatus && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {request.approverStatus === 'approved' ? 'Approved' : 'Denied'} on {request.approverDate}
                          </p>
                          {request.approverComments && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{request.approverComments}"
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Chief Pilot */}
                  {request.approverStatus === 'approved' && (
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        request.chiefPilotStatus === 'approved' ? 'bg-green-100' :
                        request.chiefPilotStatus === 'denied' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        {request.chiefPilotStatus === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : request.chiefPilotStatus === 'denied' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Chief Pilot</p>
                        {request.chiefPilotStatus && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              {request.chiefPilotStatus === 'approved' ? 'Approved' : 'Denied'} on {request.chiefPilotDate}
                            </p>
                            {request.chiefPilotComments && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                "{request.chiefPilotComments}"
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Scheduling */}
                  {request.approverStatus === 'approved' && (
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        request.schedulingStatus === 'approved' ? 'bg-green-100' :
                        request.schedulingStatus === 'denied' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        {request.schedulingStatus === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : request.schedulingStatus === 'denied' ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Scheduling Manager</p>
                        {request.schedulingStatus && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              {request.schedulingStatus === 'approved' ? 'Approved' : 'Denied'} on {request.schedulingDate}
                            </p>
                            {request.schedulingComments && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                "{request.schedulingComments}"
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'approve' ? 'Approve' : 'Deny'} Change Request
            </h3>
            
            <div className="mb-4 p-3 bg-accent rounded-lg">
              <p className="text-sm font-medium">{selectedRequest.airportIcao} - {selectedRequest.airportName}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedRequest.reason}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Comments {actionType === 'deny' && <span className="text-red-600">*</span>}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  actionType === 'approve' 
                    ? 'Optional: Add any comments or notes...'
                    : 'Required: Provide a detailed reason for denial...'
                }
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {actionType === 'deny' && userRole !== 'approver' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    This will be sent back to the Airport Evaluation Officer with your comments for review.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCommentModal(false);
                  setComments('');
                  setSelectedRequest(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={submitAction}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <Send className="w-4 h-4 mr-2" />
                {actionType === 'approve' ? 'Approve' : 'Deny'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
