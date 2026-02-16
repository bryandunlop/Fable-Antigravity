import React from 'react';
import { Calendar } from "./ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface TaxTrip {
    legs: {
        date: string;
        status: string;
    }[];
}

interface TaxCalendarViewProps {
    trips: TaxTrip[];
}

export default function TaxCalendarView({ trips }: TaxCalendarViewProps) {
    // 1. Flatten all legs to get dates and statuses
    const flightDates = trips.flatMap(t => t.legs.map(l => ({ date: new Date(l.date), status: l.status })));

    // 2. Identify Action Required Dates vs Verified Dates
    const actionRequiredDates = flightDates
        .filter(f => f.status === 'Action Required' || f.status === 'Pending Review')
        .map(f => f.date);

    const verifiedDates = flightDates
        .filter(f => f.status === 'Verified')
        .map(f => f.date);

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Compliance Calendar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
                <Calendar
                    mode="multiple"
                    selected={[]}
                    className="rounded-md border shadow"
                    modifiers={{
                        action: actionRequiredDates,
                        verified: verifiedDates
                    }}
                    modifiersStyles={{
                        action: { color: 'red', fontWeight: 'bold', textDecoration: 'underline decoration-red-500' },
                        verified: { color: 'green', fontWeight: 'bold' }
                    }}
                />

                <div className="flex gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                        <span>Verified</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        <span>Action Needed</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
