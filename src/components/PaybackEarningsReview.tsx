import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, CheckCircle, Calendar, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface PaybackRequest {
    id: string;
    date: string; // Date of the stop day worked
    days: number; // Number of payback days earned (e.g. 1 for 1 worked)
    status: 'pending' | 'approved' | 'rejected';
    reason?: string;
}

export interface CrewMember {
    id: string;
    name: string;
    position: string;
    stopSchedule: {
        paybackStopAccumulated: number;
        paybackRequests: PaybackRequest[];
    };
}

export interface PaybackEarningsReviewProps {
    crewMembers: CrewMember[];
    onApprove: (crewId: string, requestId: string) => void;
    onReject: (crewId: string, requestId: string) => void;
}

export function PaybackEarningsReview({ crewMembers, onApprove, onReject }: PaybackEarningsReviewProps) {
    // Local state moved to parent VacationRequest.tsx

    const handleApprovePayback = (crewId: string, requestId: string) => {
        onApprove(crewId, requestId);
    };

    const handleRejectPayback = (crewId: string, requestId: string) => {
        onReject(crewId, requestId);
    };

    const pendingRequestsCount = crewMembers.reduce((acc, crew) =>
        acc + crew.stopSchedule.paybackRequests.filter(r => r.status === 'pending').length, 0
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Payback Stop Earnings</h2>
                    <p className="text-muted-foreground">Review and approve accrued payback days for crew members working over scheduled stops.</p>
                </div>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="py-3 px-6 flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-700">{pendingRequestsCount}</div>
                            <div className="text-xs text-blue-600 font-medium">Pending Review</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {pendingRequestsCount === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">All caught up!</p>
                        <p>No pending payback requests to review.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {crewMembers.flatMap(crew =>
                        crew.stopSchedule.paybackRequests.filter(r => r.status === 'pending').map(request => ({
                            crew,
                            request
                        }))
                    ).map(({ crew, request }) => (
                        <Card key={request.id}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{crew.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs font-normal">{crew.position}</Badge>
                                                <span>•</span>
                                                <span className="text-xs">Current Bank: {crew.stopSchedule.paybackStopAccumulated} days</span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Pending Review</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <Calendar className="h-4 w-4" />
                                            Stop Day Worked: {new Date(request.date).toLocaleDateString()}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Earned <span className="font-medium text-foreground">{request.days} Payback Days</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                            onClick={() => handleRejectPayback(crew.id, request.id)}
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                        <Button
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleApprovePayback(crew.id, request.id)}
                                        >
                                            <Check className="h-4 w-4 mr-2" />
                                            Approve Credits
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
