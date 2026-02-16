import React, { useState } from 'react';
import { useMaintenanceContext } from './contexts/MaintenanceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Camera, FileText, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface QuickSquawkFormProps {
    tailNumber: string;
    onSuccess?: () => void;
}

// Common Pilot Squawk Codes (ATA Chapters simplified)
const COMMON_FAULTS = [
    { code: '21', label: 'Air Conditioning / Cab Temp' },
    { code: '25', label: 'Cabin Interior / Furnishings' },
    { code: '33', label: 'Lights (Int/Ext)' },
    { code: '34', label: 'Navigation / Avionics' },
    { code: '45', label: 'Central Maintenance System' },
    { code: '49', label: 'APU' },
    { code: '27', label: 'Flight Controls' },
    { code: '32', label: 'Landing Gear / Tires' },
];

export default function QuickSquawkForm({ tailNumber, onSuccess }: QuickSquawkFormProps) {
    const { addSquawk } = useMaintenanceContext();
    const [formData, setFormData] = useState({
        description: '',
        ataChapter: '',
        phase: 'inflight' as const,
        priority: 'medium' as const,
    });
    const [attachments, setAttachments] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.description) return;

        setIsSubmitting(true);

        // Simulate network delay
        setTimeout(() => {
            addSquawk({
                aircraftId: tailNumber, // Using tail as ID for simplified lookup
                aircraftTail: tailNumber,
                reportedBy: 'Capt. Pilot', // In real app, get from auth
                reportedByRole: 'Pilot',
                reportedAt: new Date(),
                squawkType: formData.phase,
                priority: formData.priority,
                status: 'open',
                ataChapter: formData.ataChapter || '00', // Default if not selected
                description: formData.description,
                requiresInspection: true,
                category: 'mechanical', // Default
                partsUsed: [],
                attachments: attachments,
                lifecycleStage: {
                    current: 'reported',
                    history: []
                },
                maintenanceActions: []
            });

            toast.success("Squawk Reported Successfully", {
                description: `Reference #${Date.now().toString().slice(-4)}`
            });

            // Reset
            setFormData({
                description: '',
                ataChapter: '',
                phase: 'inflight',
                priority: 'medium'
            });
            setAttachments([]);
            setIsSubmitting(false);
            if (onSuccess) onSuccess();
        }, 1000);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            // In a real app, upload to S3 here.
            // For demo, we just pretend.
            const fileName = e.target.files[0].name;
            setAttachments([...attachments, fileName]);
            toast.info("Photo Added", { description: fileName });
        }
    };

    return (
        <Card className="border-blue-100 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Quick Report
                </CardTitle>
                <CardDescription>
                    Report an issue for {tailNumber}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ATTACHMENTS (Top for easy access on mobile) */}
                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                        <input
                            type="file"
                            accept="image/*"
                            id="photo-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('photo-upload')?.click()}>
                            <Camera className="w-4 h-4 mr-2" />
                            Add Photo
                        </Button>
                        <div className="text-xs text-muted-foreground">
                            {attachments.length > 0 ? (
                                <div className="flex gap-2">
                                    {attachments.map((a, i) => (
                                        <Badge key={i} variant="secondary">{a}</Badge>
                                    ))}
                                </div>
                            ) : 'No photos attached'}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>What's the issue?</Label>
                        <Textarea
                            placeholder="Describe the discrepancy..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="h-24 resize-none text-base"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>System (Optional)</Label>
                            <Select
                                value={formData.ataChapter}
                                onValueChange={(v) => setFormData({ ...formData, ataChapter: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMMON_FAULTS.map(f => (
                                        <SelectItem key={f.code} value={f.code}>{f.code} - {f.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(v: any) => setFormData({ ...formData, priority: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low (Info)</SelectItem>
                                    <SelectItem value="medium">Medium (Standard)</SelectItem>
                                    <SelectItem value="high">High (Urgent)</SelectItem>
                                    <SelectItem value="critical">Critical (AOG)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                        disabled={isSubmitting || !formData.description}
                    >
                        {isSubmitting ? 'Sending...' : (
                            <>
                                <Send className="w-5 h-5 mr-2" />
                                Submit Report
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
