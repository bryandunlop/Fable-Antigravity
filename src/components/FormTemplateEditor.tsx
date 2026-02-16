import React, { useState, useEffect } from 'react';
import { usePassengerForms, FormTemplate, FormField } from './contexts/PassengerFormContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import {
    Plus,
    Trash2,
    Settings,
    Save,
    MoveVertical,
    Eye,
    AlertCircle,
    Check
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export default function FormTemplateEditor() {
    const { templates, updateTemplate } = usePassengerForms();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Initialize with the first template if available
    useEffect(() => {
        if (templates.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(templates[0].id);
        }
    }, [templates, selectedTemplateId]);

    // Load template into local state for editing
    useEffect(() => {
        if (selectedTemplateId) {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (template) {
                setEditingTemplate(JSON.parse(JSON.stringify(template))); // Deep copy
                setHasUnsavedChanges(false);
            }
        }
    }, [selectedTemplateId, templates]);

    const handleTemplateChange = (update: Partial<FormTemplate>) => {
        if (!editingTemplate) return;
        setEditingTemplate({ ...editingTemplate, ...update });
        setHasUnsavedChanges(true);
        setSaveSuccess(false);
    };

    const handleFieldChange = (index: number, update: Partial<FormField>) => {
        if (!editingTemplate) return;
        const newFields = [...editingTemplate.fields];
        newFields[index] = { ...newFields[index], ...update };
        setEditingTemplate({ ...editingTemplate, fields: newFields });
        setHasUnsavedChanges(true);
        setSaveSuccess(false);
    };

    const addField = () => {
        if (!editingTemplate) return;
        const newField: FormField = {
            id: `field_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            required: false,
            section: 'Additional Information'
        };
        setEditingTemplate({
            ...editingTemplate,
            fields: [...editingTemplate.fields, newField]
        });
        setHasUnsavedChanges(true);
        setSaveSuccess(false);
    };

    const removeField = (index: number) => {
        if (!editingTemplate) return;
        const newFields = [...editingTemplate.fields];
        newFields.splice(index, 1);
        setEditingTemplate({ ...editingTemplate, fields: newFields });
        setHasUnsavedChanges(true);
        setSaveSuccess(false);
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (!editingTemplate) return;
        const newFields = [...editingTemplate.fields];
        if (direction === 'up' && index > 0) {
            [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
        } else if (direction === 'down' && index < newFields.length - 1) {
            [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
        }
        setEditingTemplate({ ...editingTemplate, fields: newFields });
        setHasUnsavedChanges(true);
        setSaveSuccess(false);
    };

    const saveChanges = () => {
        if (!editingTemplate) return;
        updateTemplate(editingTemplate.id, editingTemplate);
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    if (!editingTemplate) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="Select Template" />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasUnsavedChanges && (
                        <Alert className="py-2 bg-yellow-50 border-yellow-200 text-yellow-800">
                            <AlertCircle className="w-4 h-4 mr-2 inline" />
                            Unsaved changes
                        </Alert>
                    )}

                    {saveSuccess && (
                        <Alert className="py-2 bg-green-50 border-green-200 text-green-800">
                            <Check className="w-4 h-4 mr-2 inline" />
                            Saved successfully
                        </Alert>
                    )}
                </div>

                <Button
                    onClick={saveChanges}
                    disabled={!hasUnsavedChanges}
                    className="gap-2"
                >
                    <Save className="w-4 h-4" />
                    Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Column: General Settings */}
                <div className="col-span-12 md:col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Form Name</Label>
                                <Input
                                    value={editingTemplate.name}
                                    onChange={(e) => handleTemplateChange({ name: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    value={editingTemplate.description}
                                    onChange={(e) => handleTemplateChange({ description: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>Active</Label>
                                <Switch
                                    checked={editingTemplate.isActive}
                                    onCheckedChange={(checked: boolean) => handleTemplateChange({ isActive: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Fields */}
                <div className="col-span-12 md:col-span-8 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Form Fields</CardTitle>
                            <Button size="sm" onClick={addField} variant="outline" className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Field
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {editingTemplate.fields.map((field, index) => (
                                <Card key={field.id} className="p-4 border border-muted hover:border-primary/50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="flex flex-col gap-2 pt-2 text-muted-foreground">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                disabled={index === 0}
                                                onClick={() => moveField(index, 'up')}
                                            >
                                                <MoveVertical className="w-4 h-4 -rotate-180" />
                                            </Button>
                                        </div>

                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            <div className="col-span-2 md:col-span-1">
                                                <Label>Label</Label>
                                                <Input
                                                    value={field.label}
                                                    onChange={(e) => handleFieldChange(index, { label: e.target.value })}
                                                    className="mt-1"
                                                />
                                            </div>

                                            <div className="col-span-2 md:col-span-1">
                                                <Label>Type</Label>
                                                <Select
                                                    value={field.type}
                                                    onValueChange={(val: any) => handleFieldChange(index, { type: val })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="text">Text Input</SelectItem>
                                                        <SelectItem value="email">Email</SelectItem>
                                                        <SelectItem value="phone">Phone</SelectItem>
                                                        <SelectItem value="date">Date</SelectItem>
                                                        <SelectItem value="select">Dropdown</SelectItem>
                                                        <SelectItem value="checkbox">Checkbox</SelectItem>
                                                        <SelectItem value="textarea">Text Area</SelectItem>
                                                        <SelectItem value="number">Number</SelectItem>
                                                        <SelectItem value="file-upload">File Upload</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="col-span-2 md:col-span-1">
                                                <Label>Section</Label>
                                                <Input
                                                    value={field.section || ''}
                                                    onChange={(e) => handleFieldChange(index, { section: e.target.value })}
                                                    placeholder="General"
                                                    className="mt-1"
                                                />
                                            </div>

                                            <div className="col-span-2 md:col-span-1 flex items-center justify-between pt-6">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={field.required}
                                                        onCheckedChange={(checked: boolean) => handleFieldChange(index, { required: checked })}
                                                    />
                                                    <Label>Required</Label>
                                                </div>
                                            </div>

                                            {field.type === 'select' && (
                                                <div className="col-span-2">
                                                    <Label>Options (comma separated)</Label>
                                                    <Input
                                                        value={field.options?.join(', ') || ''}
                                                        onChange={(e) => handleFieldChange(index, {
                                                            options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                                        })}
                                                        className="mt-1"
                                                        placeholder="Option 1, Option 2, Option 3"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => removeField(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
