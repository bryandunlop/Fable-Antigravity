import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, User, Calendar, AlertTriangle } from 'lucide-react';
import { useMaintenanceContext, MaintenanceVacationRequest } from './contexts/MaintenanceContext';

interface VacationApprovalProps {
    userRole: 'lead' | 'manager';  // In real app, derived from auth/context
}

export function MaintenanceVacationApproval({ userRole }: VacationApprovalProps) {
    const { vacationRequests, updateVacationRequestStatus, currentUser } = useMaintenanceContext();
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceVacationRequest | null>(null);
    const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'approve' | 'deny' }>({ open: false, type: 'approve' });
    const [notes, setNotes] = useState('');

    // Filter requests based on role
    const pendingRequests = vacationRequests.filter(req => {
        if (userRole === 'lead') {
            return req.status === 'pending_lead';
        } else {
            return req.status === 'pending_manager';
        }
    });

    const processedRequests = vacationRequests.filter(req => {
        if (userRole === 'lead') {
            return req.approvalChain.lead?.approverName === currentUser;
        } else {
            return req.approvalChain.manager?.approverName === currentUser;
        }
    });

    const handleAction = (request: MaintenanceVacationRequest, type: 'approve' | 'deny') => {
        setSelectedRequest(request);
        setActionDialog({ open: true, type });
        setNotes('');
    };

    const confirmAction = () => {
        if (!selectedRequest) return;

        updateVacationRequestStatus(
            selectedRequest.id,
            userRole,
            actionDialog.type === 'approve',
            'USER-ID-PLACEHOLDER', // In real app, use currentUser.id
            currentUser,
            notes
        );

        setActionDialog({ open: false, type: 'approve' });
        setSelectedRequest(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500">Approved</Badge>;
            case 'denied_by_lead':
            case 'denied_by_manager':
                return <Badge variant="destructive">Denied</Badge>;
            case 'pending_lead':
                return <Badge variant="secondary">Pending Lead</Badge>;
            case 'pending_manager':
                return <Badge className="bg-orange-500">Pending Manager</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Vacation Approvals ({userRole === 'lead' ? 'Lead' : 'Manager'})</h2>
                <p className="text-muted-foreground">Review and process time off requests.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-700">{pendingRequests.length}</div>
                        <p className="text-blue-600">Pending Your Review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{processedRequests.length}</div>
                        <p className="text-muted-foreground">Processed by You</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">Pending Review</TabsTrigger>
                    <TabsTrigger value="processed">Processed History</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4">
                    {pendingRequests.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No pending requests to review.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        pendingRequests.map(req => (
                            <Card key={req.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="flex items-center gap-2">
                                                <User className="h-5 w-5" />
                                                {req.technicianName}
                                            </CardTitle>
                                            <CardDescription>
                                                Submitted on {new Date(req.submittedAt).toLocaleDateString()}
                                            </CardDescription>
                                        </div>
                                        {getStatusBadge(req.status)}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <h4 className="font-medium text-sm text-muted-foreground mb-2">Request Details</h4>
                                            <p className="font-semibold">{req.type}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Return: {new Date(req.returnDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm text-muted-foreground mb-2">Reason</h4>
                                            <p className="text-sm bg-muted p-3 rounded-md">{req.reason}</p>
                                        </div>
                                    </div>

                                    {/* Previous Approvals if any */}
                                    {req.approvalChain.lead && userRole === 'manager' && (
                                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                                            <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4" />
                                                Recommended by Lead: {req.approvalChain.lead.approverName}
                                            </p>
                                            {req.approvalChain.lead.notes && (
                                                <p className="text-sm text-blue-600 mt-1 pl-6">"{req.approvalChain.lead.notes}"</p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleAction(req, 'deny')}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Deny Request
                                        </Button>
                                        <Button
                                            className="bg-green-600 hover:bg-green-700"
                                            onClick={() => handleAction(req, 'approve')}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            {userRole === 'lead' ? 'Recommend Approval' : 'Approve Request'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="processed">
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            {processedRequests.length > 0 ? (
                                <div className="space-y-4 text-left">
                                    {processedRequests.map(req => (
                                        <div key={req.id} className="border p-4 rounded-lg flex justify-between items-center">
                                            <div>
                                                <p className="font-medium">{req.technicianName} - {req.type}</p>
                                                <p className="text-sm text-muted-foreground">{new Date(req.startDate).toLocaleDateString()}</p>
                                            </div>
                                            {getStatusBadge(req.status)}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>No processed history available.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionDialog.type === 'approve' ? 'Approve Request' : 'Deny Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedRequest?.technicianName} - {selectedRequest?.type}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {actionDialog.type === 'approve' && userRole === 'lead' && (
                            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 flex gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                                <p className="text-sm text-yellow-800">
                                    Approving this request will forward it to the Manager for final approval.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Notes / Comments (Optional)
                            </label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any covering notes..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                        <Button
                            variant={actionDialog.type === 'deny' ? 'destructive' : 'default'}
                            onClick={confirmAction}
                            className={actionDialog.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                            Confirm {actionDialog.type === 'approve' ? 'Approval' : 'Denial'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
