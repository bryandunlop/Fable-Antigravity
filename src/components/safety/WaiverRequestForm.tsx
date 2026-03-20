import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CloudUpload } from 'lucide-react';
import { toast } from 'sonner';

interface WaiverRequestFormProps {
    onSuccess: (data: any) => void;
    onCancel: () => void;
}

export default function WaiverRequestForm({ onSuccess, onCancel }: WaiverRequestFormProps) {
    const [formData, setFormData] = useState({
        title: '',
        type: '',
        manualRef: '',
        sectionRef: '',
        timing: 'before',
        date: '',
        priority: '',
        description: '',
        justification: '',
        mitigation: '',
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = () => {
        // Validation logic could go here
        if (!formData.title || !formData.type || !formData.priority || !formData.description) {
            toast.error('Please fill in all required fields');
            return;
        }

        // In a real app, this would submit to API
        console.log('Submitting waiver:', formData);
        toast.success('Waiver request submitted successfully');
        onSuccess(formData);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Waiver Title *</Label>
                    <Input
                        placeholder="Brief description of waiver request"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                    />
                </div>
                <div>
                    <Label>Type *</Label>
                    <Select value={formData.type} onValueChange={(val: string) => handleChange('type', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select waiver type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="operational">Operational</SelectItem>
                            <SelectItem value="weather">Weather</SelectItem>
                            <SelectItem value="crew-rest">Crew Rest</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Manual and Section Reference */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Manual Reference</Label>
                    <Input
                        placeholder="e.g. FOM, GOM, ERP, etc."
                        value={formData.manualRef}
                        onChange={(e) => handleChange('manualRef', e.target.value)}
                    />
                </div>
                <div>
                    <Label>Section Reference</Label>
                    <Input
                        placeholder="e.g. 1.2.4, 2.4.3"
                        value={formData.sectionRef}
                        onChange={(e) => handleChange('sectionRef', e.target.value)}
                    />
                </div>
            </div>

            {/* Timing */}
            <div className="space-y-3">
                <Label>Is this form being filled out before or after the waiver?</Label>
                <RadioGroup
                    value={formData.timing}
                    onValueChange={(val: string) => handleChange('timing', val)}
                    className="flex gap-6"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="before" id="form-r-before" />
                        <Label htmlFor="form-r-before">Before</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="after" id="form-r-after" />
                        <Label htmlFor="form-r-after">After</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Date and time of the waiver</Label>
                    <Input
                        type="datetime-local"
                        value={formData.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                    />
                </div>
                <div>
                    <Label>Priority *</Label>
                    <Select value={formData.priority} onValueChange={(val: string) => handleChange('priority', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label>Describe the waiver *</Label>
                <Textarea
                    placeholder="Detailed description of the waiver request"
                    className="min-h-[120px]"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                />
            </div>

            <div>
                <Label>Justification</Label>
                <Textarea
                    placeholder="Business justification for this waiver"
                    rows={3}
                    value={formData.justification}
                    onChange={(e) => handleChange('justification', e.target.value)}
                />
            </div>

            <div>
                <Label>Describe mitigation strategies</Label>
                <Textarea
                    placeholder="Risk assessment and mitigation measures"
                    className="min-h-[120px]"
                    value={formData.mitigation}
                    onChange={(e) => handleChange('mitigation', e.target.value)}
                />
            </div>

            {/* Attachments Drop Zone */}
            <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-background rounded-full shadow-sm group-hover:scale-110 transition-transform">
                            <CloudUpload className="w-6 h-6 text-blue-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Drop files here to upload</p>
                            <p className="text-xs text-muted-foreground">or click to browse documents</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} className="w-full sm:w-auto">
                    Submit Request
                </Button>
                <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                    Cancel
                </Button>
            </div>
        </div>
    );
}
