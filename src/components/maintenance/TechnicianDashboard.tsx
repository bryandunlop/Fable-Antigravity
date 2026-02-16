import React, { useState } from 'react';
import { JobCard as JobCardType, PauseReason } from '../../types/maintenance';
import JobCard from './JobCard';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plane, Clock, Calendar, ArrowRight, LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '../ui/button';

// Mock Data
const MOCK_JOBS: JobCardType[] = [
    {
        id: '1',
        workOrderNumber: 'WO-2025-001',
        aircraftTailNumber: 'N123GA',
        title: 'Main Battery Capacity Test',
        ataChapter: '24-30',
        priority: 'ROUTINE',
        status: 'PENDING',
        estimatedHours: 4.0,
        actualHours: 0,
        description: 'Perform annual capacity check of main ship batteries per AMM Chapter 24. Record final voltage readings.',
        ammReference: '24-30-00',
    },
    {
        id: '2',
        workOrderNumber: 'WO-2025-004',
        aircraftTailNumber: 'N450AF',
        title: 'Hydraulic Leak - L/H Landing Gear',
        ataChapter: '32-10',
        priority: 'AOG',
        status: 'IN_PROGRESS',
        estimatedHours: 2.5,
        actualHours: 0.5,
        lastStartedAt: new Date().toISOString(),
        description: 'Pilot reported fluid on strut. Inspect for leaks and replace seals as required.',
        ammReference: '32-10-05',
    },
    {
        id: '3',
        workOrderNumber: 'WO-2025-009',
        aircraftTailNumber: 'N999BB',
        title: 'Avionics Fan Noise',
        ataChapter: '21-20',
        priority: 'DEFERRAL',
        status: 'PAUSED',
        pauseReason: 'WAITING_PARTS',
        pauseNotes: 'Fan P/N 123-456 on order. ETA 24hrs.',
        estimatedHours: 1.5,
        actualHours: 0.2,
        description: 'Investigate loud hum from avionics bay cooling fan.',
        ammReference: '21-20-00',
    }
];

export default function TechnicianDashboard() {
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobs, setJobs] = useState<JobCardType[]>(MOCK_JOBS);

    const handleUpdateStatus = (jobId: string, status: JobCardType['status'], pauseReason?: PauseReason) => {
        setJobs(jobs.map(j => {
            if (j.id !== jobId) return j;
            return { ...j, status, pauseReason };
        }));
    };

    const activeJob = jobs.find(j => j.id === activeJobId);

    if (activeJob) {
        return (
            <div className="min-h-screen bg-slate-50">
                <div className="p-4 border-b bg-white sticky top-0 z-10 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setActiveJobId(null)}>
                        &larr; Back to Dashboard
                    </Button>
                    <div className="font-semibold text-slate-700">Technician View</div>
                </div>
                <div className="p-6">
                    <JobCard
                        job={activeJob}
                        onUpdateStatus={(status, reason) => handleUpdateStatus(activeJob.id, status, reason)}
                    />
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'AOG': return 'text-red-600 bg-red-50 border-red-200';
            case 'COMPLETED': return 'text-green-600 bg-green-50 border-green-200';
            case 'PAUSED': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 p-6">

            {/* Dashboard Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Today's Tasks</h1>
                    <p className="text-slate-500">Welcome back, Bryan. You have {jobs.filter(j => j.status !== 'COMPLETED').length} active assignments.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Overview
                    </Button>
                    <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job) => (
                    <Card
                        key={job.id}
                        className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-l-4 border-l-transparent hover:border-l-blue-500 overflow-hidden relative"
                        onClick={() => setActiveJobId(job.id)}
                    >
                        {job.priority === 'AOG' && (
                            <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                AOG PRIORITY
                            </div>
                        )}

                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <Badge variant="outline" className="font-mono text-xs text-slate-400">
                                    {job.workOrderNumber}
                                </Badge>
                                {job.status === 'IN_PROGRESS' && (
                                    <span className="flex h-3 w-3 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                    </span>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Plane className="w-4 h-4 text-slate-400" />
                                    <span className="font-bold text-slate-900">{job.aircraftTailNumber}</span>
                                </div>
                                <h3 className="font-bold text-lg leading-tight text-slate-800 line-clamp-2">
                                    {job.title}
                                </h3>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>Est: {job.estimatedHours}h</span>
                                </div>
                                {job.status === 'PAUSED' && (
                                    <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                                        Paused: {job.pauseReason === 'WAITING_PARTS' ? 'Parts' : 'Other'}
                                    </Badge>
                                )}
                            </div>

                            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                                <Badge className={`${getStatusColor(job.status)} border rounded-full px-3`}>
                                    {job.status.replace('_', ' ')}
                                </Badge>
                                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
