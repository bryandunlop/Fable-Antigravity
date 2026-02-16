import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useMaintenanceContext, MaintenanceRequestType, MaintenanceVacationRequest } from './contexts/MaintenanceContext';

export function MaintenanceVacationRequestForm() {
    const { submitVacationRequest, vacationRequests, currentUser } = useMaintenanceContext();
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

    // Form State
    const [requestType, setRequestType] = useState<MaintenanceRequestType>('Vacation');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    // Derived State
    // This is a simplification. In a real app we'd get the current user's ID from auth context
    // For now, we'll assume currentUser is the technician name, and we simulate an ID
    const currentTechId = 'TECH-001'; // Hardcoded for demo, normally from auth
    const currentTechName = currentUser; // From MaintenanceContext

    const myRequests = vacationRequests.filter(req => req.technicianName === currentTechName);

    const calculateDays = (start: string, end: string) => {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    const handleSubmit = () => {
        if (!startDate || !endDate || !reason) return;

        // Calculate return date (next day after end date)
        const end = new Date(endDate);
        const returnDate = new Date(end);
        returnDate.setDate(end.getDate() + 1);

        submitVacationRequest({
            technicianId: currentTechId,
            technicianName: currentTechName,
            type: requestType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            returnDate: returnDate,
            reason
        });

        // Reset form
        setStartDate('');
        setEndDate('');
        setReason('');
        setRequestType('Vacation');
        setActiveTab('history');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
            case 'denied_by_lead':
            case 'denied_by_manager':
                return <Badge variant="destructive">Denied</Badge>;
            case 'pending_lead':
                return <Badge variant="secondary">Pending Lead</Badge>;
            case 'pending_manager':
                return <Badge className="bg-orange-500 hover:bg-orange-600">Pending Manager</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Time Off Requests</h2>
                    <p className="text-muted-foreground">Submit and track your vacation and time off requests.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === 'submit' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('submit')}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Request
                    </Button>
                    <Button
                        variant={activeTab === 'history' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('history')}
                    >
                        <Clock className="mr-2 h-4 w-4" />
                        My History
                    </Button>
                </div>
            </div>

            {activeTab === 'submit' ? (
                <Card>
                    <CardHeader>
                        <CardTitle>New Vacation Request</CardTitle>
                        <CardDescription>
                            Requests passed to Lead for initial review, then to Manager for final approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Request Type</Label>
                                <Select
                                    value={requestType}
                                    onValueChange={(v) => setRequestType(v as MaintenanceRequestType)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Vacation">Vacation</SelectItem>
                                        <SelectItem value="Sick">Sick</SelectItem>
                                        <SelectItem value="Personal">Personal</SelectItem>
                                        <SelectItem value="Jury Duty">Jury Duty</SelectItem>
                                        <SelectItem value="Bereavement">Bereavement</SelectItem>
                                        <SelectItem value="Comp Time">Comp Time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Duration</Label>
                                <div className="flex items-center h-10 px-3 border rounded-md bg-muted text-muted-foreground">
                                    {calculateDays(startDate, endDate)} days
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Reason / Notes</Label>
                            <Textarea
                                placeholder="Please provide details about your request..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSubmit} disabled={!startDate || !endDate || !reason}>
                                Submit Request
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {myRequests.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground">
                                No request history found.
                            </CardContent>
                        </Card>
                    ) : (
                        myRequests.map((req) => (
                            <Card key={req.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {req.type}
                                            {getStatusBadge(req.status)}
                                        </CardTitle>
                                        <span className="text-sm text-muted-foreground">
                                            Submitted on {new Date(req.submittedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Dates</p>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm font-medium text-muted-foreground">Reason</p>
                                            <p>{req.reason}</p>
                                        </div>
                                    </div>

                                    {/* Approval Chain Visualization */}
                                    <div className="border-t pt-4 mt-4">
                                        <p className="text-sm font-medium mb-3">Approval Status</p>
                                        <div className="flex items-center gap-4">
                                            {/* Lead Step */}
                                            <div className="flex items-center gap-2">
                                                <div className={`
                          h-8 w-8 rounded-full flex items-center justify-center
                          ${req.approvalChain.lead?.approved
                                                        ? 'bg-green-100 text-green-600'
                                                        : req.status === 'denied_by_lead'
                                                            ? 'bg-red-100 text-red-600'
                                                            : 'bg-muted text-muted-foreground'}
                        `}>
                                                    {req.approvalChain.lead?.approved
                                                        ? <CheckCircle className="h-5 w-5" />
                                                        : req.status === 'denied_by_lead'
                                                            ? <XCircle className="h-5 w-5" />
                                                            : <span className="font-bold">1</span>}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Lead Review</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {req.approvalChain.lead
                                                            ? `Reviewed by ${req.approvalChain.lead.approverName}`
                                                            : 'Pending'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="h-px w-12 bg-border" />

                                            {/* Manager Step */}
                                            <div className="flex items-center gap-2">
                                                <div className={`
                          h-8 w-8 rounded-full flex items-center justify-center
                          ${req.approvalChain.manager?.approved
                                                        ? 'bg-green-100 text-green-600'
                                                        : req.status === 'denied_by_manager'
                                                            ? 'bg-red-100 text-red-600'
                                                            : 'bg-muted text-muted-foreground'}
                        `}>
                                                    {req.approvalChain.manager?.approved
                                                        ? <CheckCircle className="h-5 w-5" />
                                                        : req.status === 'denied_by_manager'
                                                            ? <XCircle className="h-5 w-5" />
                                                            : <span className="font-bold">2</span>}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Manager Approval</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {req.approvalChain.manager
                                                            ? `Reviewed by ${req.approvalChain.manager.approverName}`
                                                            : 'Pending'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
