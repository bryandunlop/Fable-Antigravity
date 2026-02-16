import React, { useState } from 'react';
import { useMaintenanceContext } from '../contexts/MaintenanceContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Clock, Plus, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';

interface JobLaborLogProps {
    workOrderId: string;
    onUpdate?: () => void;
}

export function JobCardTimer({ workOrderId, onUpdate }: JobLaborLogProps) {
    const { workOrders, technicians, addLaborEntry } = useMaintenanceContext();
    const workOrder = workOrders.find(w => w.id === workOrderId);
    const laborLog = workOrder?.laborLog || [];

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        technicianId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        notes: ''
    });

    if (!workOrder) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
        const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

        let durationMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);
        if (durationMinutes < 0) durationMinutes += 24 * 60; // Handle overnight shimmy if needed, though simple date handling assumes same day for now.

        const tech = technicians.find(t => t.id === formData.technicianId);

        addLaborEntry(workOrderId, {
            technicianId: formData.technicianId,
            technicianName: tech?.name || 'Unknown',
            startTime: startDateTime,
            endTime: endDateTime,
            durationMinutes: durationMinutes,
            notes: formData.notes
        });

        setIsDialogOpen(false);
        setFormData({
            technicianId: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            startTime: '',
            endTime: '',
            notes: ''
        });
        if (onUpdate) onUpdate();
    };

    const totalMinutes = laborLog.reduce((acc, log) => acc + log.durationMinutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(2);

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Labor Log
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Total Actual Hours: <span className="font-bold text-slate-900">{totalHours} hrs</span>
                        </p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="w-4 h-4 mr-1" />
                                Log Time
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Labor Entry</DialogTitle>
                                <DialogDescription>Record time spent on this task.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Technician</Label>
                                    <Select
                                        value={formData.technicianId}
                                        onValueChange={(v) => setFormData({ ...formData, technicianId: v })}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Technician" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {technicians.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Date</Label>
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Input
                                            type="time"
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Time</Label>
                                        <Input
                                            type="time"
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Notes (Optional)</Label>
                                    <Textarea
                                        placeholder="Brief description of work performed..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>

                                <Button type="submit" className="w-full">Save Entry</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {laborLog.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Technician</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="text-right">Hours</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {laborLog.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium text-xs">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-muted-foreground" />
                                            {log.technicianName}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {format(new Date(log.startTime), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(log.startTime), 'HH:mm')} - {format(new Date(log.endTime), 'HH:mm')}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-xs">
                                        {(log.durationMinutes / 60).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No labor recorded yet.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
