import React, { useState } from 'react';
import { useMaintenanceContext } from './contexts/MaintenanceContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
    Users,
    Calendar,
    ClipboardList,
    BarChart3,
    Plus,
    Trash2,
    UserPlus,
    Briefcase,
    Clock,
    ArrowRight
} from 'lucide-react';
import { Technician } from './contexts/MaintenanceContext';
import { Link } from 'react-router-dom';
import TurndownForm from './TurndownForm';

export default function ResourceManagement() {
    const {
        technicians,
        addTechnician,
        removeTechnician,
        updateTechnician,
        workOrders,
        assignTechnicianToJob
    } = useMaintenanceContext();

    const [isAddTechOpen, setIsAddTechOpen] = useState(false);
    const [newTech, setNewTech] = useState<Partial<Technician>>({
        name: '',
        role: 'Mechanic',
        email: '',
        status: 'on-shift',
        skills: [],
        shift: 'AM'
    });

    const handleAddTechnician = () => {
        if (newTech.name && newTech.email) {
            addTechnician({
                id: `TECH-${Date.now()}`,
                name: newTech.name,
                role: newTech.role as any,
                email: newTech.email,
                status: 'off-shift', // Default to off-shift
                skills: newTech.skills || [],
                shift: newTech.shift as any || 'AM'
            });
            setIsAddTechOpen(false);
            setNewTech({ name: '', role: 'Mechanic', email: '', skills: [], shift: 'AM' });
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, techId: string) => {
        e.dataTransfer.setData('techId', techId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, workOrderId: string) => {
        e.preventDefault();
        const techId = e.dataTransfer.getData('techId');
        if (techId) {
            assignTechnicianToJob(techId, workOrderId);
        }
    };

    // Simple Heatmap Calculation
    const getTechLoad = (techId: string) => {
        // Determine load based on assigned ACTIVE work orders
        const assignments = workOrders.filter(wo =>
            wo.assignedTo.includes(techId) &&
            (wo.status === 'in-progress' || wo.status === 'assigned')
        ).length;
        return assignments;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Resource Management</h2>
                    <p className="text-muted-foreground">Manage technicians, shifts, and assignments</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link to="/maintenance/technician">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Technician Dashboard
                        </Link>
                    </Button>
                    <Dialog open={isAddTechOpen} onOpenChange={setIsAddTechOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Technician
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Technician</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input
                                        value={newTech.name}
                                        onChange={e => setNewTech({ ...newTech, name: e.target.value })}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        value={newTech.email}
                                        onChange={e => setNewTech({ ...newTech, email: e.target.value })}
                                        placeholder="john@hangar.next"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Select
                                            value={newTech.role}
                                            onValueChange={v => setNewTech({ ...newTech, role: v as any })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Lead">Lead Support</SelectItem>
                                                <SelectItem value="Mechanic">Mechanic</SelectItem>
                                                <SelectItem value="Avionics">Avionics</SelectItem>
                                                <SelectItem value="Inspector">Inspector</SelectItem>
                                                <SelectItem value="Apprentice">Apprentice</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Shift</Label>
                                        <Select
                                            value={newTech.shift}
                                            onValueChange={v => setNewTech({ ...newTech, shift: v as any })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AM">AM (Day)</SelectItem>
                                                <SelectItem value="PM">PM (Swing)</SelectItem>
                                                <SelectItem value="Night">Night</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button onClick={handleAddTechnician} className="w-full">Create Profile</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="roster" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="roster">
                        <Users className="w-4 h-4 mr-2" />
                        Roster
                    </TabsTrigger>
                    <TabsTrigger value="scheduler">
                        <Calendar className="w-4 h-4 mr-2" />
                        Scheduler
                    </TabsTrigger>
                    <TabsTrigger value="handover">
                        <ClipboardList className="w-4 h-4 mr-2" />
                        Handover
                    </TabsTrigger>
                    <TabsTrigger value="capacity">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Capacity
                    </TabsTrigger>
                </TabsList>

                {/* ROSTER TAB */}
                <TabsContent value="roster" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {technicians.map(tech => (
                            <Card key={tech.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border-2 border-primary/10">
                                                <AvatarFallback>{tech.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-bold">{tech.name}</h3>
                                                <p className="text-sm text-muted-foreground">{tech.role} • {tech.shift} Shift</p>
                                            </div>
                                        </div>
                                        <Badge variant={tech.status === 'on-shift' ? 'default' : 'secondary'}>
                                            {tech.status.replace('-', ' ')}
                                        </Badge>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <div className="flex flex-wrap gap-1">
                                            {tech.skills.map(skill => (
                                                <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                                            ))}
                                        </div>
                                        {tech.currentJobId && (
                                            <div className="text-xs bg-blue-50 text-blue-700 p-2 rounded mt-2">
                                                Working on: {tech.currentJobId}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => updateTechnician(tech.id, {
                                                status: tech.status === 'on-shift' ? 'off-shift' : 'on-shift'
                                            })}
                                        >
                                            Toggle Shift
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => removeTechnician(tech.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* SCHEDULER TAB */}
                <TabsContent value="scheduler" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                        {/* Left: Available Technicians */}
                        <Card className="col-span-1 border-r bg-muted/20">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Available Technicians
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">Drag to assign</p>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="space-y-3">
                                        {technicians.filter(t => t.status === 'on-shift').map(tech => (
                                            <div
                                                key={tech.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, tech.id)}
                                                className="bg-white p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:border-primary transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>{tech.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-medium text-sm">{tech.name}</div>
                                                        <div className="text-xs text-muted-foreground">{tech.role}</div>
                                                    </div>
                                                </div>
                                                {getTechLoad(tech.id) > 0 && (
                                                    <Badge variant="secondary" className="text-xs">{getTechLoad(tech.id)} tasks</Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* Right: Work Orders */}
                        <Card className="col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4" />
                                    Active Work Orders
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">Drop technician to assign</p>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[500px]">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled').map(wo => (
                                            <div
                                                key={wo.id}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, wo.id)}
                                                className={`p-4 rounded-lg border-2 border-dashed ${wo.status === 'in-progress' ? 'border-primary/20 bg-primary/5' : 'border-muted bg-white'}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge variant="outline">{wo.id}</Badge>
                                                    <Badge className={wo.priority === 'critical' ? 'bg-red-500' : 'bg-blue-500'}>{wo.priority}</Badge>
                                                </div>
                                                <h4 className="font-medium text-sm mb-1 line-clamp-1" title={wo.title}>{wo.title}</h4>
                                                <p className="text-xs text-muted-foreground mb-3">{wo.aircraft} • {wo.estimatedHours}h est</p>

                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Assigned Crew:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {wo.assignedTo.length === 0 ? (
                                                            <span className="text-xs italic text-muted-foreground">Unassigned - Drop tech here</span>
                                                        ) : (
                                                            wo.assignedTo.map(techId => {
                                                                const tech = technicians.find(t => t.id === techId);
                                                                return (
                                                                    <Badge key={techId} variant="secondary" className="flex items-center gap-1">
                                                                        {tech ? tech.name : techId}
                                                                    </Badge>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* HANDOVER TAB */}
                <TabsContent value="handover" className="space-y-4">
                    <TurndownForm />
                </TabsContent>

                {/* CAPACITY TAB */}
                <TabsContent value="capacity" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Technician Capacity Heatmap</CardTitle>
                            <p className="text-sm text-muted-foreground">Current workload distribution</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {technicians.map(tech => {
                                    const load = getTechLoad(tech.id);
                                    const capacity = 3; // Let's say 3 concurrent tasks is max
                                    const percentage = Math.min((load / capacity) * 100, 100);
                                    let color = 'bg-green-500';
                                    if (percentage > 60) color = 'bg-yellow-500';
                                    if (percentage >= 100) color = 'bg-red-500';

                                    return (
                                        <div key={tech.id} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">{tech.name}</span>
                                                <span className="text-muted-foreground">{load} active tasks</span>
                                            </div>
                                            <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                                                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                                            </div>
                                        </div>
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
