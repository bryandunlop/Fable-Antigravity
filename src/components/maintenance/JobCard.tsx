import React from 'react';
import {
    Plane,
    MapPin,
    FileText,
    AlertTriangle,
    BookOpen,
    Wrench,
    QrCode,
    Mic,
    Camera
} from 'lucide-react';
import { JobCard as JobCardType, PauseReason } from '../../types/maintenance';
import { JobCardTimer } from './JobCardTimer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';

interface JobCardProps {
    job: JobCardType;
    onUpdateStatus: (status: JobCardType['status'], pauseReason?: PauseReason) => void;
}

export default function JobCard({ job, onUpdateStatus }: JobCardProps) {

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'AOG': return 'bg-red-600 hover:bg-red-700 text-white border-red-700 animate-pulse';
            case 'CRITICAL': return 'bg-orange-500 hover:bg-orange-600 text-white';
            case 'DEFERRAL': return 'bg-blue-500 hover:bg-blue-600 text-white';
            default: return 'bg-slate-500 text-white';
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">

            {/* Header - High Contrast for Mechanics */}
            <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl border border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="text-slate-400 border-slate-600">
                                WO #{job.workOrderNumber}
                            </Badge>
                            <Badge className={getPriorityColor(job.priority)}>
                                {job.priority}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                            <Plane className="w-8 h-8 text-blue-400" />
                            <h1 className="text-4xl font-black tracking-tight">{job.aircraftTailNumber}</h1>
                        </div>
                    </div>

                    <div className="text-right">
                        {/* Placeholder for now - would initiate AMM view */}
                        <Button variant="outline" className="text-slate-200 border-slate-600 hover:bg-slate-800">
                            <BookOpen className="w-4 h-4 mr-2" />
                            AMM {job.ammReference || 'N/A'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Task Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* active Job Labor Log */}
                    <JobCardTimer
                        workOrderId={job.id}
                    />

                    {/* Task Description */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Task Instructions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <h3 className="text-xl font-bold">{job.title}</h3>
                            <p className="text-slate-600 leading-relaxed">
                                {job.description}
                            </p>

                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                                <div className="text-sm text-yellow-800">
                                    <span className="font-bold">Safety Note:</span> Ensure aircraft primary power is OFF before proceeding with battery capacity check.
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Steps / checklist placeholder */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Steps</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                                        <div className="w-6 h-6 rounded border-2 border-slate-300 flex items-center justify-center shrink-0 cursor-pointer hover:border-blue-500">
                                            {/* Checkbox placeholder */}
                                        </div>
                                        <div className="text-slate-700">
                                            Step {step}: Perform visual inspection of battery casing for cracks or leakage.
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar: Entry & Consumables */}
                <div className="space-y-6">

                    {/* Action Log / Corrective Action */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Corrective Action</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Textarea
                                    placeholder="Describe work performed..."
                                    className="min-h-[150px] pr-10 resize-none"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute right-2 bottom-2 text-slate-400 hover:text-blue-600"
                                >
                                    <Mic className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" className="w-full">
                                    <Camera className="w-4 h-4 mr-2" />
                                    Add Photo
                                </Button>
                                <Button variant="outline" className="w-full">
                                    <Wrench className="w-4 h-4 mr-2" />
                                    Tools
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Parts Consumed */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Parts</span>
                                <Button variant="ghost" size="sm">
                                    <QrCode className="w-4 h-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-center text-slate-500 py-8 border-2 border-dashed rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                                Scan Part QR or Click to Add
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
