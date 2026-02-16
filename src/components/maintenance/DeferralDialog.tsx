
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useMaintenanceContext, MELCategory } from '../contexts/MaintenanceContext';
import { AlertTriangle, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface DeferralDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    squawkId: string;
    onComplete?: () => void;
}

export default function DeferralDialog({ open, onOpenChange, squawkId, onComplete }: DeferralDialogProps) {
    const { deferSquawk, getDeferralExpiry, currentUser } = useMaintenanceContext();
    const [melRef, setMelRef] = useState('');
    const [category, setCategory] = useState<MELCategory>('C');
    const [limitations, setLimitations] = useState('');
    const [expiry, setExpiry] = useState<Date>(new Date());

    useEffect(() => {
        setExpiry(getDeferralExpiry(category));
    }, [category, getDeferralExpiry]);

    const handleDefer = () => {
        if (!melRef || !limitations) return;

        deferSquawk(squawkId, melRef, category, limitations, currentUser);
        onOpenChange(false);
        if (onComplete) onComplete();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Defer Squawk per MEL
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>MEL Reference Item</Label>
                        <Input
                            placeholder="e.g. 32-41-01"
                            value={melRef}
                            onChange={(e) => setMelRef(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={(v: MELCategory) => setCategory(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A">Cat A (Custom)</SelectItem>
                                    <SelectItem value="B">Cat B (3 Days)</SelectItem>
                                    <SelectItem value="C">Cat C (10 Days)</SelectItem>
                                    <SelectItem value="D">Cat D (120 Days)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Expiry Date</Label>
                            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted text-stone-700">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{format(expiry, 'MMM dd, yyyy')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Operational Limitations / Placards</Label>
                        <Textarea
                            placeholder="Describe any operational limitations or placards installed..."
                            className="h-24"
                            value={limitations}
                            onChange={(e) => setLimitations(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleDefer} className="bg-amber-600 hover:bg-amber-700">
                        Confirm Deferral
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
