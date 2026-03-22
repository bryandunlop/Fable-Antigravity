import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import WaiverRequestForm from './safety/WaiverRequestForm';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import {
    Shield,
    FileCheck,
    AlertTriangle,
    Target,
    Award,
    Plus,
    Calendar,
    Star,
    ThumbsUp,
    Camera,
    Send,
    FileText,
    CheckCircle,
    Eye,
    BookOpen,
    ClipboardCheck,
    Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAudits, Audit } from '../contexts/AuditContext';
import AuditCard from './audit/AuditCard';
import AuditDetailDrawer from './audit/AuditDetailDrawer';

interface SafetyMyActivityProps {
    userRole: string;
}

export default function SafetyMyActivity({ userRole }: SafetyMyActivityProps) {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('overview');
    const [showWaiverDialog, setShowWaiverDialog] = useState(false);
    const [showHazardDialog, setShowHazardDialog] = useState(false);
    const [showCWSDialog, setShowCWSDialog] = useState(false);

    useEffect(() => {
        if (searchParams.get('action') === 'new-waiver') {
            setShowWaiverDialog(true);
        }
        if (searchParams.get('action') === 'new-cws') {
            setShowCWSDialog(true);
        }
    }, [searchParams]);

    // Mock data for user's safety items
    const myWaivers = [
        {
            id: 'WV-001',
            title: 'Night Flying Operations - N123AB',
            status: 'Pending Review',
            submittedDate: '2024-02-06',
            priority: 'High'
        },
        {
            id: 'WV-005',
            title: 'Extended Duty Time Request',
            status: 'Approved',
            submittedDate: '2024-01-28',
            priority: 'Medium'
        }
    ];

    const myHazardReports = [
        {
            id: 'HZ-004',
            title: 'Fuel System Leak - Fuel Farm',
            status: 'Under Investigation',
            submittedDate: '2024-02-06',
            severity: 'High'
        }
    ];

    // Real audit data — filtered to show only audits assigned to someone (for demo since no auth)
    const { audits } = useAudits();
    const [drawerAudit, setDrawerAudit] = useState<Audit | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // In a real app this would filter by the logged-in user's name.
    // For demo: show all assigned (non-Unassigned) audits so any role can see the experience.
    const myAudits = audits.filter(a => a.assignedTo && a.assignedTo !== 'Unassigned');
    const inProgressAudits = myAudits.filter(a => a.status === 'In Progress');
    const scheduledAudits = myAudits.filter(a => a.status === 'Scheduled');
    const completedAudits = myAudits.filter(a => a.status === 'Complete');

    const handleAuditClick = (audit: Audit) => {
        setDrawerAudit(audit);
        setDrawerOpen(true);
    };

    const myDocuments = [
        {
            id: 'DOC-001',
            title: 'Emergency Procedures Update v2.1',
            status: 'Pending',
            dueDate: '2024-02-12',
            completionCode: 'EP-241',
            description: 'Updated emergency procedures including new evacuation protocols'
        },
        {
            id: 'DOC-002',
            title: 'COVID-19 Health Protocol Update',
            status: 'Read',
            readDate: '2024-02-03',
            completionCode: 'CV-322',
            description: 'Updated health protocols for COVID-19 prevention and response'
        }
    ];

    const myCWSSubmissions = [
        {
            id: 'CWS-001',
            recognizedPerson: 'Mike Johnson',
            role: 'Pilot',
            category: 'Pre-flight Safety Check',
            date: '2024-02-08',
            location: 'Hangar 3',
            description: 'Thoroughly inspected all safety equipment and documented findings before flight',
            status: 'Acknowledged'
        },
        {
            id: 'CWS-002',
            recognizedPerson: 'Sarah Wilson',
            role: 'Maintenance',
            category: 'PPE Compliance',
            date: '2024-02-05',
            location: 'Maintenance Shop',
            description: 'Consistently wearing proper safety gear including eye protection and gloves during all maintenance tasks',
            status: 'Acknowledged'
        }
    ];

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending review': case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'under investigation': case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'approved': case 'read': return 'bg-green-100 text-green-800 border-green-200';
            case 'denied': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'critical': case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const handleSubmitHazard = () => {
        toast.success('Hazard report submitted successfully');
        setShowHazardDialog(false);
    };

    const handleCompleteDocument = (docId: string, completionCode: string) => {
        if (!completionCode.trim()) {
            toast.error('Please enter the completion code');
            return;
        }
        toast.success(`Document ${docId} marked as read with code: ${completionCode}`);
    };

    const handleUpdateAuditItem = (auditId: string, itemId: number) => {
        toast.success('Audit item updated');
    };

    const handleSubmitCWS = () => {
        toast.success('Caught Working Safely submission sent to Safety Manager! 🌟', {
            description: 'Thank you for recognizing safe work practices.'
        });
        setShowCWSDialog(false);
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-green-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">CWS Submitted</p>
                                <p className="text-2xl">{myCWSSubmissions.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-blue-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">My Waivers</p>
                                <p className="text-2xl">{myWaivers.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Hazard Reports</p>
                                <p className="text-2xl">{myHazardReports.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-purple-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Assigned Audits</p>
                                <p className="text-2xl">{myAudits.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-orange-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Documents</p>
                                <p className="text-2xl">
                                    {myDocuments.filter(d => d.status === 'Pending').length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-4 flex-wrap">
                <Dialog open={showCWSDialog} onOpenChange={setShowCWSDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                            <Award className="w-4 h-4 mr-2" />
                            Caught Working Safely
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-green-600" />
                                Caught Working Safely Submission
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                Recognize someone for working safely and following proper procedures. This submission will be sent to the Safety Manager.
                            </p>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Person Being Recognized *</Label>
                                    <Input placeholder="Full name" />
                                </div>
                                <div>
                                    <Label>Their Role/Department *</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pilot">Pilot</SelectItem>
                                            <SelectItem value="inflight">Flight Attendant</SelectItem>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                            <SelectItem value="safety">Safety</SelectItem>
                                            <SelectItem value="scheduling">Scheduling</SelectItem>
                                            <SelectItem value="admin">Admin/Support</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Date Observed *</Label>
                                    <Input type="date" />
                                </div>
                                <div>
                                    <Label>Location *</Label>
                                    <Input placeholder="e.g., Hangar 3, Ramp Area, Office" />
                                </div>
                            </div>

                            <div>
                                <Label>Category of Safe Practice *</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ppe-compliance">PPE Compliance</SelectItem>
                                        <SelectItem value="proper-procedures">Following Proper Procedures</SelectItem>
                                        <SelectItem value="hazard-identification">Hazard Identification & Reporting</SelectItem>
                                        <SelectItem value="pre-flight-safety">Pre-flight Safety Checks</SelectItem>
                                        <SelectItem value="ground-safety">Ground Operations Safety</SelectItem>
                                        <SelectItem value="maintenance-safety">Maintenance Safety Practices</SelectItem>
                                        <SelectItem value="communication">Safety Communication</SelectItem>
                                        <SelectItem value="situational-awareness">Situational Awareness</SelectItem>
                                        <SelectItem value="teamwork">Safety Teamwork & Coordination</SelectItem>
                                        <SelectItem value="other">Other Safe Practice</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Description of Safe Behavior *</Label>
                                <Textarea
                                    placeholder="Describe what you observed. What specifically did this person do that demonstrated safe work practices? Be detailed and specific."
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Example: "Observed wearing proper eye protection and gloves while performing maintenance tasks. Also took extra time to properly secure tools before climbing ladder."
                                </p>
                            </div>

                            <div>
                                <Label>Why This Matters (Optional)</Label>
                                <Textarea
                                    placeholder="Explain the impact or importance of this safe behavior"
                                    rows={2}
                                />
                            </div>

                            <div className="border rounded-lg p-4 bg-muted/30">
                                <div className="flex items-start gap-2 mb-3">
                                    <Camera className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <Label>Photo Evidence (Optional)</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Upload a photo if appropriate and if it doesn't compromise safety or privacy
                                        </p>
                                    </div>
                                </div>
                                <Input type="file" accept="image/*" />
                            </div>

                            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                                <div className="flex items-start gap-2">
                                    <ThumbsUp className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-green-900">Positive Safety Culture</p>
                                        <p className="text-sm text-green-800 mt-1">
                                            Recognizing safe work practices helps build a positive safety culture. Your submission will be shared with the Safety Manager and may be featured in safety communications.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={handleSubmitCWS} className="bg-green-600 hover:bg-green-700">
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit Recognition
                                </Button>
                                <Button variant="outline" onClick={() => setShowCWSDialog(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showWaiverDialog} onOpenChange={setShowWaiverDialog}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <FileCheck className="w-4 h-4 mr-2" />
                            Request Waiver
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Submit New Waiver Request</DialogTitle>
                        </DialogHeader>
                        <WaiverRequestForm
                            onSuccess={() => setShowWaiverDialog(false)}
                            onCancel={() => setShowWaiverDialog(false)}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={showHazardDialog} onOpenChange={setShowHazardDialog}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Report Hazard
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Report Safety Hazard</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Hazard Title</Label>
                                    <Input placeholder="Brief description of the hazard" />
                                </div>
                                <div>
                                    <Label>Category</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="airport-infrastructure">Airport Infrastructure</SelectItem>
                                            <SelectItem value="equipment">Equipment</SelectItem>
                                            <SelectItem value="weather">Weather</SelectItem>
                                            <SelectItem value="wildlife">Wildlife</SelectItem>
                                            <SelectItem value="fuel-system">Fuel System</SelectItem>
                                            <SelectItem value="human-factors">Human Factors</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Severity</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select severity" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="critical">Critical</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Location</Label>
                                    <Input placeholder="Specific location of hazard" />
                                </div>
                            </div>

                            <div>
                                <Label>Description</Label>
                                <Textarea placeholder="Detailed description of the hazard" rows={3} />
                            </div>

                            <div>
                                <Label>Immediate Actions Taken</Label>
                                <Textarea placeholder="What immediate actions were taken?" rows={2} />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={handleSubmitHazard}>
                                    Submit Report
                                </Button>
                                <Button variant="outline" onClick={() => setShowHazardDialog(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="waivers">Waivers</TabsTrigger>
                    <TabsTrigger value="audits">Audits</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-3 border rounded-lg bg-green-50">
                                    <Award className="w-4 h-4 mt-1 text-green-600" />
                                    <div className="flex-1">
                                        <p className="font-medium text-green-900">Caught Working Safely Submitted</p>
                                        <p className="text-sm text-green-700">Recognized Mike Johnson for proper pre-flight safety</p>
                                        <p className="text-xs text-muted-foreground mt-1">Feb 8, 2024</p>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                        Acknowledged
                                    </Badge>
                                </div>

                                <div className="flex items-start gap-3 p-3 border rounded-lg">
                                    <FileCheck className="w-4 h-4 mt-1 text-blue-600" />
                                    <div className="flex-1">
                                        <p className="font-medium">Waiver Request Submitted</p>
                                        <p className="text-sm text-muted-foreground">Night Flying Operations - N123AB</p>
                                        <p className="text-xs text-muted-foreground mt-1">Feb 6, 2024</p>
                                    </div>
                                    <Badge className={getStatusColor('Pending Review')}>
                                        Pending Review
                                    </Badge>
                                </div>

                                <div className="flex items-start gap-3 p-3 border rounded-lg">
                                    <AlertTriangle className="w-4 h-4 mt-1 text-red-600" />
                                    <div className="flex-1">
                                        <p className="font-medium">Hazard Report Submitted</p>
                                        <p className="text-sm text-muted-foreground">Fuel System Leak - Fuel Farm</p>
                                        <p className="text-xs text-muted-foreground mt-1">Feb 6, 2024</p>
                                    </div>
                                    <Badge className={getStatusColor('Under Investigation')}>
                                        Under Investigation
                                    </Badge>
                                </div>

                                <div className="flex items-start gap-3 p-3 border rounded-lg">
                                    <Target className="w-4 h-4 mt-1 text-purple-600" />
                                    <div className="flex-1">
                                        <p className="font-medium">Audit Assignment Received</p>
                                        <p className="text-sm text-muted-foreground">Monthly Safety Audit - February 2024</p>
                                        <p className="text-xs text-muted-foreground mt-1">Feb 5, 2024</p>
                                    </div>
                                    <Badge className={getStatusColor('Assigned')}>
                                        60% Complete
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="waivers" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Waiver Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myWaivers.map((waiver) => (
                                        <TableRow key={waiver.id}>
                                            <TableCell className="font-medium">{waiver.id}</TableCell>
                                            <TableCell>{waiver.title}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(waiver.status)}>
                                                    {waiver.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getPriorityColor(waiver.priority)}>
                                                    {waiver.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(waiver.submittedDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="outline" size="sm">
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audits" className="mt-6">
                    {/* Audit Detail Drawer — same component the Safety Manager uses */}
                    <AuditDetailDrawer
                        audit={drawerAudit}
                        open={drawerOpen}
                        onClose={() => { setDrawerOpen(false); setDrawerAudit(null); }}
                    />

                    {myAudits.length === 0 ? (
                        <Card>
                            <CardContent className="py-16 flex flex-col items-center text-center">
                                <Target className="w-10 h-10 text-muted-foreground opacity-20 mb-3" />
                                <p className="font-semibold text-muted-foreground">No audits assigned to you</p>
                                <p className="text-sm text-muted-foreground mt-1">The Safety Manager will assign audits to you from the Audit Workspace.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary row */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'In Progress', count: inProgressAudits.length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                                    { label: 'Scheduled', count: scheduledAudits.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                                    { label: 'Complete', count: completedAudits.length, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                                ].map(({ label, count, color, bg }) => (
                                    <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
                                        <p className={`text-2xl font-bold ${color}`}>{count}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* In Progress — shown first, most prominent */}
                            {inProgressAudits.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        In Progress
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {inProgressAudits.map(audit => (
                                            <AuditCard key={audit.id} audit={audit} onClick={handleAuditClick} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Scheduled — action needed */}
                            {scheduledAudits.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        Scheduled — Upcoming
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {scheduledAudits.map(audit => (
                                            <AuditCard key={audit.id} audit={audit} onClick={handleAuditClick} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Completed */}
                            {completedAudits.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        Completed
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2 opacity-75">
                                        {completedAudits.map(audit => (
                                            <AuditCard key={audit.id} audit={audit} onClick={handleAuditClick} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-center text-muted-foreground pb-2">
                                Click any audit card to open the checklist and record findings
                            </p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="documents" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Required Document Reviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {myDocuments.map((doc) => (
                                    <div key={doc.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-full ${doc.status === 'Read' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                                                    }`}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{doc.title}</h4>
                                                    <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                                        <span className="text-muted-foreground">Due: {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : 'N/A'}</span>
                                                        {doc.readDate && (
                                                            <span className="text-green-600 flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Read on {new Date(doc.readDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={getStatusColor(doc.status)}>
                                                {doc.status}
                                            </Badge>
                                        </div>

                                        {doc.status !== 'Read' && (
                                            <div className="mt-4 pt-4 border-t flex items-center gap-4">
                                                <div className="flex-1">
                                                    <Label className="text-xs text-muted-foreground">Enter Completion Code</Label>
                                                    <div className="flex gap-2 mt-1">
                                                        <Input
                                                            placeholder="Enter completion code"
                                                            className="w-40"
                                                            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                                if (e.key === 'Enter') {
                                                                    handleCompleteDocument(doc.id, (e.target as HTMLInputElement).value);
                                                                }
                                                            }}
                                                        />
                                                        <Button size="sm" onClick={() => {
                                                            // In real app, would get value from ref or state
                                                            handleCompleteDocument(doc.id, 'EP-241');
                                                        }}>
                                                            Mark as Read
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href="#" className="flex items-center gap-2">
                                                        <Eye className="w-4 h-4" />
                                                        View Document
                                                    </a>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
