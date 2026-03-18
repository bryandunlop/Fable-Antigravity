import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  GripVertical,
  Copy,
  Eye,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  List,
  ToggleLeft,
  Hash,
  Clock,
  Calendar,
  Type,
  AlignLeft,
  CheckSquare,
  Download,
  Upload,
  Sliders,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';

// Field type definitions
type FieldType = 
  | 'text'           // Short text input
  | 'textarea'       // Long text area
  | 'number'         // Number input
  | 'time'           // Time picker
  | 'date'           // Date picker
  | 'datetime'       // Date and time picker
  | 'select'         // Dropdown (enumerated choice)
  | 'multiselect'    // Multiple choice dropdown
  | 'boolean'        // Yes/No choice
  | 'toggle'         // Switch toggle
  | 'checkbox'       // Checkbox
  | 'radio';         // Radio buttons

interface FieldOption {
  label: string;
  value: string;
  score?: number;  // For risk scoring
}

interface FormField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  description?: string;
  placeholder?: string;
  required: boolean;
  scoring: {
    enabled: boolean;
    weight: number;  // Points contribution to total score
  };
  options?: FieldOption[];  // For select, multiselect, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  conditionalLogic?: {
    dependsOn?: string;  // Field ID this depends on
    showWhen?: string;   // Value that triggers showing this field
  };
  helpText?: string;
  defaultValue?: string | number | boolean;
}

interface FormSection {
  id: string;
  name: string;
  title: string;
  description?: string;
  icon?: string;
  collapsed: boolean;
  fields: FormField[];
  order: number;
}

interface FormTemplate {
  id: string;
  name: string;
  type: 'GRAT';
  description: string;
  sections: FormSection[];
  scoring: {
    enabled: boolean;
    lowThreshold: number;
    mediumThreshold: number;
    highThreshold: number;
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function GRATFormBuilder() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate | null>(null);
  const [editingSection, setEditingSection] = useState<FormSection | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('sections');

  // Initialize with default template
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const savedTemplates = localStorage.getItem('grat_templates_v2');
    if (savedTemplates) {
      const parsed = JSON.parse(savedTemplates);
      setTemplates(parsed);
      const active = parsed.find((t: FormTemplate) => t.isActive);
      if (active) setCurrentTemplate(active);
    } else {
      // Create default template
      const defaultTemplate = createDefaultTemplate();
      setTemplates([defaultTemplate]);
      setCurrentTemplate(defaultTemplate);
      saveTemplates([defaultTemplate]);
    }
  };

  const saveTemplates = (templatesToSave: FormTemplate[]) => {
    localStorage.setItem('grat_templates_v2', JSON.stringify(templatesToSave));
    toast.success('GRAT Templates saved successfully');
  };

  const createDefaultTemplate = (): FormTemplate => ({
    id: 'default-grat',
    name: 'Standard GRAT Form',
    type: 'GRAT',
    description: 'Default Ground Risk Assessment Tool',
    sections: [
      {
        id: 'mx-info',
        name: 'maintenance-information',
        title: 'Maintenance Information',
        description: 'Basic task details',
        collapsed: false,
        order: 1,
        fields: [
          {
            id: 'technician',
            name: 'technicianName',
            label: 'Technician Name',
            type: 'text',
            required: true,
            scoring: { enabled: false, weight: 0 }
          },
          {
            id: 'task-date',
            name: 'taskDate',
            label: 'Task Date',
            type: 'date',
            required: true,
            scoring: { enabled: false, weight: 0 }
          }
        ]
      },
      {
        id: 'human-factors',
        name: 'human-factors',
        title: 'Human Factors',
        description: 'Personnel and psychological factors',
        collapsed: false,
        order: 2,
        fields: [
          {
            id: 'duty-time',
            name: 'dutyTime',
            label: 'Duty Time',
            type: 'select',
            required: true,
            scoring: { enabled: true, weight: 10 },
            options: [
              { label: '8 hours or less', value: '8-less', score: 1 },
              { label: '8 to 12 hours', value: '8-12', score: 2 },
              { label: 'Over 12 hours', value: '12+', score: 5 }
            ]
          },
          {
            id: 'working-alone',
            name: 'workingAlone',
            label: 'Working Alone',
            type: 'boolean',
            required: true,
            scoring: { enabled: true, weight: 10 },
            options: [
              { label: 'Yes', value: 'true', score: 5 },
              { label: 'No', value: 'false', score: 0 }
            ]
          }
        ]
      }
    ],
    scoring: {
      enabled: true,
      lowThreshold: 10,
      mediumThreshold: 19,
      highThreshold: 24
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true
  });

  const handleAddSection = () => {
    setEditingSection({
      id: `section-${Date.now()}`,
      name: '',
      title: '',
      description: '',
      collapsed: false,
      order: currentTemplate ? currentTemplate.sections.length + 1 : 1,
      fields: []
    });
    setShowSectionDialog(true);
  };

  const handleEditSection = (section: FormSection) => {
    setEditingSection({ ...section });
    setShowSectionDialog(true);
  };

  const handleSaveSection = () => {
    if (!editingSection || !currentTemplate) return;

    const updatedSections = currentTemplate.sections.some(s => s.id === editingSection.id)
      ? currentTemplate.sections.map(s => s.id === editingSection.id ? editingSection : s)
      : [...currentTemplate.sections, editingSection];

    const updatedTemplate = {
      ...currentTemplate,
      sections: updatedSections,
      updatedAt: new Date().toISOString()
    };

    setCurrentTemplate(updatedTemplate);
    const updatedTemplates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    setShowSectionDialog(false);
    setEditingSection(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!currentTemplate) return;
    if (!confirm('Are you sure you want to delete this section?')) return;

    const updatedSections = currentTemplate.sections.filter(s => s.id !== sectionId);
    const updatedTemplate = {
      ...currentTemplate,
      sections: updatedSections,
      updatedAt: new Date().toISOString()
    };

    setCurrentTemplate(updatedTemplate);
    const updatedTemplates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  const handleAddField = (sectionId: string) => {
    setEditingField({
      id: `field-${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      required: false,
      scoring: { enabled: false, weight: 0 }
    });
    setShowFieldDialog(true);
  };

  const handleEditField = (sectionId: string, field: FormField) => {
    setEditingField({ ...field });
    setShowFieldDialog(true);
  };

  const handleSaveField = (sectionId: string) => {
    if (!editingField || !currentTemplate) return;

    const updatedSections = currentTemplate.sections.map(section => {
      if (section.id === sectionId) {
        const fieldExists = section.fields.some(f => f.id === editingField.id);
        const updatedFields = fieldExists
          ? section.fields.map(f => f.id === editingField.id ? editingField : f)
          : [...section.fields, editingField];
        
        return { ...section, fields: updatedFields };
      }
      return section;
    });

    const updatedTemplate = {
      ...currentTemplate,
      sections: updatedSections,
      updatedAt: new Date().toISOString()
    };

    setCurrentTemplate(updatedTemplate);
    const updatedTemplates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    setShowFieldDialog(false);
    setEditingField(null);
  };

  const handleDeleteField = (sectionId: string, fieldId: string) => {
    if (!currentTemplate) return;
    if (!confirm('Are you sure you want to delete this field?')) return;

    const updatedSections = currentTemplate.sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          fields: section.fields.filter(f => f.id !== fieldId)
        };
      }
      return section;
    });

    const updatedTemplate = {
      ...currentTemplate,
      sections: updatedSections,
      updatedAt: new Date().toISOString()
    };

    setCurrentTemplate(updatedTemplate);
    const updatedTemplates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  const getFieldTypeIcon = (type: FieldType) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'textarea': return <AlignLeft className="h-4 w-4" />;
      case 'number': return <Hash className="h-4 w-4" />;
      case 'time': return <Clock className="h-4 w-4" />;
      case 'date':
      case 'datetime': return <Calendar className="h-4 w-4" />;
      case 'select':
      case 'multiselect': return <List className="h-4 w-4" />;
      case 'boolean': return <CheckSquare className="h-4 w-4" />;
      case 'toggle': return <ToggleLeft className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const exportTemplate = () => {
    if (!currentTemplate) return;
    const dataStr = JSON.stringify(currentTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${currentTemplate.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success('Template exported successfully');
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!currentTemplate) return;
    const sections = [...currentTemplate.sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    [sections[index], sections[newIndex]] = [sections[newIndex], sections[index]];
    sections.forEach((section, idx) => section.order = idx + 1);

    const updatedTemplate = {
      ...currentTemplate,
      sections,
      updatedAt: new Date().toISOString()
    };

    setCurrentTemplate(updatedTemplate);
    const updatedTemplates = templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  if (!currentTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Loading form builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Wrench className="h-8 w-8 text-primary" />
            <span>GRAT Form Builder</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure form sections, fields, and risk scoring for Ground Risk Assessment Tools
          </p>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Form
          </Button>
          <Button variant="outline" onClick={exportTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => saveTemplates(templates)}>
            <Save className="h-4 w-4 mr-2" />
            Save All
          </Button>
        </div>
      </div>

      {/* Current Template Info */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{currentTemplate.name}</CardTitle>
              <CardDescription>{currentTemplate.description}</CardDescription>
            </div>
            <Badge variant={currentTemplate.isActive ? "default" : "secondary"}>
              {currentTemplate.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Type</Label>
              <p className="font-medium">{currentTemplate.type}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Sections</Label>
              <p className="font-medium">{currentTemplate.sections.length}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Total Fields</Label>
              <p className="font-medium">
                {currentTemplate.sections.reduce((sum, s) => sum + s.fields.length, 0)}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Scoring</Label>
              <p className="font-medium">
                {currentTemplate.scoring.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sections">Form Sections</TabsTrigger>
          <TabsTrigger value="scoring">Scoring Configuration</TabsTrigger>
          <TabsTrigger value="settings">Template Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Form Sections</h2>
            <Button onClick={handleAddSection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>

          <div className="space-y-4">
            {currentTemplate.sections
              .sort((a, b) => a.order - b.order)
              .map((section, index) => (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex flex-col space-y-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSection(index, 'up')}
                            disabled={index === 0}
                            className="h-6 w-6 p-0"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSection(index, 'down')}
                            disabled={index === currentTemplate.sections.length - 1}
                            className="h-6 w-6 p-0"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{section.title}</span>
                            <Badge variant="outline">
                              {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                            </Badge>
                          </CardTitle>
                          {section.description && (
                            <CardDescription>{section.description}</CardDescription>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddField(section.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Field
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSection(section)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {section.fields.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        {section.fields.map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center space-x-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              {getFieldTypeIcon(field.type)}
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{field.label}</span>
                                  {field.required && (
                                    <Badge variant="secondary" className="text-xs">Required</Badge>
                                  )}
                                  {field.scoring.enabled && (
                                    <Badge variant="outline" className="text-xs">
                                      <Sliders className="h-3 w-3 mr-1" />
                                      {field.scoring.weight}pt
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Type: {field.type}
                                  {field.options && ` • ${field.options.length} options`}
                                </p>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditField(section.id, field)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteField(section.id, field.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}

            {currentTemplate.sections.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No sections yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Get started by adding your first form section
                    </p>
                    <Button onClick={handleAddSection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Scoring Configuration</CardTitle>
              <CardDescription>
                Configure how the total risk score is calculated and categorized
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Risk Scoring</Label>
                  <p className="text-sm text-muted-foreground">
                    Calculate total risk score from field responses
                  </p>
                </div>
                <Switch
                  checked={currentTemplate.scoring.enabled}
                  onCheckedChange={(checked: boolean) => {
                    const updatedTemplate = {
                      ...currentTemplate,
                      scoring: { ...currentTemplate.scoring, enabled: checked },
                      updatedAt: new Date().toISOString()
                    };
                    setCurrentTemplate(updatedTemplate);
                  }}
                />
              </div>

              {currentTemplate.scoring.enabled && (
                <>
                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Risk Level Thresholds</h3>
                    <p className="text-sm text-muted-foreground">
                      Define the score ranges for each risk level
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Low Risk (0 - ?)</Label>
                        <Input
                          type="number"
                          value={currentTemplate.scoring.lowThreshold}
                          onChange={(e) => {
                            const updatedTemplate = {
                              ...currentTemplate,
                              scoring: {
                                ...currentTemplate.scoring,
                                lowThreshold: parseInt(e.target.value) || 0
                              },
                              updatedAt: new Date().toISOString()
                            };
                            setCurrentTemplate(updatedTemplate);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Score 0 to {currentTemplate.scoring.lowThreshold}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Medium Risk (? - ?)</Label>
                        <Input
                          type="number"
                          value={currentTemplate.scoring.mediumThreshold}
                          onChange={(e) => {
                            const updatedTemplate = {
                              ...currentTemplate,
                              scoring: {
                                ...currentTemplate.scoring,
                                mediumThreshold: parseInt(e.target.value) || 0
                              },
                              updatedAt: new Date().toISOString()
                            };
                            setCurrentTemplate(updatedTemplate);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Score {currentTemplate.scoring.lowThreshold + 1} to{' '}
                          {currentTemplate.scoring.mediumThreshold}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>High Risk (? +)</Label>
                        <Input
                          type="number"
                          value={currentTemplate.scoring.highThreshold}
                          onChange={(e) => {
                            const updatedTemplate = {
                              ...currentTemplate,
                              scoring: {
                                ...currentTemplate.scoring,
                                highThreshold: parseInt(e.target.value) || 0
                              },
                              updatedAt: new Date().toISOString()
                            };
                            setCurrentTemplate(updatedTemplate);
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Score {currentTemplate.scoring.mediumThreshold + 1} and above
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium">Scoring Fields Summary</h3>
                    <div className="space-y-2">
                      {currentTemplate.sections.map((section) => {
                        const scoringFields = section.fields.filter(f => f.scoring.enabled);
                        if (scoringFields.length === 0) return null;

                        return (
                          <div key={section.id} className="border rounded-lg p-4">
                            <h4 className="font-medium mb-2">{section.title}</h4>
                            <div className="space-y-1">
                              {scoringFields.map((field) => (
                                <div key={field.id} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{field.label}</span>
                                  <Badge variant="outline">{field.scoring.weight} points</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Template Settings</CardTitle>
              <CardDescription>Configure general template properties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={currentTemplate.name}
                  onChange={(e) => {
                    const updatedTemplate = {
                      ...currentTemplate,
                      name: e.target.value,
                      updatedAt: new Date().toISOString()
                    };
                    setCurrentTemplate(updatedTemplate);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={currentTemplate.description}
                  onChange={(e) => {
                    const updatedTemplate = {
                      ...currentTemplate,
                      description: e.target.value,
                      updatedAt: new Date().toISOString()
                    };
                    setCurrentTemplate(updatedTemplate);
                  }}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Form Type</Label>
                <div className="p-2 border rounded-md bg-muted text-muted-foreground">
                  GRAT (Ground Risk Assessment Tool)
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Type is fixed for this builder.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Active Template</Label>
                  <p className="text-sm text-muted-foreground">
                    This template will be used for new submissions
                  </p>
                </div>
                <Switch
                  checked={currentTemplate.isActive}
                  onCheckedChange={(checked: boolean) => {
                    const updatedTemplate = {
                      ...currentTemplate,
                      isActive: checked,
                      updatedAt: new Date().toISOString()
                    };
                    setCurrentTemplate(updatedTemplate);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection?.fields.length ? 'Edit' : 'Add'} Section
            </DialogTitle>
            <DialogDescription>
              Configure the section details
            </DialogDescription>
          </DialogHeader>

          {editingSection && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Section Title *</Label>
                <Input
                  value={editingSection.title}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, title: e.target.value })
                  }
                  placeholder="e.g., Maintenance Tasks"
                />
              </div>

              <div className="space-y-2">
                <Label>Section Name (ID) *</Label>
                <Input
                  value={editingSection.name}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, name: e.target.value })
                  }
                  placeholder="e.g., maintenance-tasks"
                />
                <p className="text-xs text-muted-foreground">
                  Used for internal identification (lowercase, no spaces)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingSection.description || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, description: e.target.value })
                  }
                  placeholder="Brief description of this section"
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSectionDialog(false);
                setEditingSection(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSection}
              disabled={!editingSection?.title || !editingSection?.name}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Dialog */}
      <FieldEditorDialog
        open={showFieldDialog}
        field={editingField}
        onClose={() => {
          setShowFieldDialog(false);
          setEditingField(null);
        }}
        onSave={(field) => {
          setEditingField(field);
          const sectionId = currentTemplate?.sections.find(s =>
            s.fields.some(f => f.id === field.id) || 
            (editingField && !currentTemplate.sections.some(s => s.fields.some(f => f.id === editingField.id)))
          )?.id || currentTemplate?.sections[0]?.id;
          
          if (sectionId) {
            handleSaveField(sectionId);
          }
        }}
        onFieldChange={setEditingField}
      />
    </div>
  );
}

// Separate component for field editing dialog
interface FieldEditorDialogProps {
  open: boolean;
  field: FormField | null;
  onClose: () => void;
  onSave: (field: FormField) => void;
  onFieldChange: (field: FormField) => void;
}

function FieldEditorDialog({ open, field, onClose, onSave, onFieldChange }: FieldEditorDialogProps) {
  if (!field) return null;

  const needsOptions = ['select', 'multiselect', 'radio'].includes(field.type);

  const addOption = () => {
    const newOption: FieldOption = {
      label: '',
      value: '',
      score: 0
    };
    onFieldChange({
      ...field,
      options: [...(field.options || []), newOption]
    });
  };

  const updateOption = (index: number, updates: Partial<FieldOption>) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = { ...newOptions[index], ...updates };
    onFieldChange({ ...field, options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = field.options?.filter((_, i) => i !== index);
    onFieldChange({ ...field, options: newOptions });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {field.id.startsWith('field-') ? 'Add' : 'Edit'} Field
          </DialogTitle>
          <DialogDescription>
            Configure the field properties and behavior
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Label *</Label>
                <Input
                  value={field.label}
                  onChange={(e) => onFieldChange({ ...field, label: e.target.value })}
                  placeholder="e.g., Tech Experience"
                />
              </div>

              <div className="space-y-2">
                <Label>Field Name (ID) *</Label>
                <Input
                  value={field.name}
                  onChange={(e) => onFieldChange({ ...field, name: e.target.value })}
                  placeholder="e.g., techExperience"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Field Type *</Label>
              <Select
                value={field.type}
                onValueChange={(value: FieldType) => onFieldChange({ ...field, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Input</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="datetime">Date & Time</SelectItem>
                  <SelectItem value="select">Dropdown (Select)</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="boolean">Yes/No (Boolean)</SelectItem>
                  <SelectItem value="toggle">Toggle Switch</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="radio">Radio Buttons</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={field.description || ''}
                onChange={(e) => onFieldChange({ ...field, description: e.target.value })}
                placeholder="Help text for this field"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => onFieldChange({ ...field, placeholder: e.target.value })}
                placeholder="Placeholder text"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Required Field</Label>
                <p className="text-xs text-muted-foreground">Must be filled before submission</p>
              </div>
              <Switch
                checked={field.required}
                onCheckedChange={(checked: boolean) => onFieldChange({ ...field, required: checked })}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Risk Scoring</Label>
                  <p className="text-xs text-muted-foreground">
                    Include this field in total risk calculation
                  </p>
                </div>
                <Switch
                  checked={field.scoring.enabled}
                  onCheckedChange={(checked: boolean) =>
                    onFieldChange({
                      ...field,
                      scoring: { ...field.scoring, enabled: checked }
                    })
                  }
                />
              </div>

              {field.scoring.enabled && (
                <div className="space-y-2">
                  <Label>Maximum Points</Label>
                  <Input
                    type="number"
                    value={field.scoring.weight}
                    onChange={(e) =>
                      onFieldChange({
                        ...field,
                        scoring: {
                          ...field.scoring,
                          weight: parseInt(e.target.value) || 0
                        }
                      })
                    }
                    placeholder="e.g., 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum points this field can contribute to total score
                  </p>
                </div>
              )}
            </div>

            {needsOptions && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Options</Label>
                    <Button size="sm" onClick={addOption}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {field.options?.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={option.label}
                          onChange={(e) =>
                            updateOption(index, { label: e.target.value })
                          }
                          placeholder="Label"
                          className="flex-1"
                        />
                        <Input
                          value={option.value}
                          onChange={(e) =>
                            updateOption(index, { value: e.target.value })
                          }
                          placeholder="Value"
                          className="flex-1"
                        />
                        {field.scoring.enabled && (
                          <Input
                            type="number"
                            value={option.score || 0}
                            onChange={(e) =>
                              updateOption(index, {
                                score: parseInt(e.target.value) || 0
                              })
                            }
                            placeholder="Score"
                            className="w-20"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(field)}
            disabled={!field.label || !field.name}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
