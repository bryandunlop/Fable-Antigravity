import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Plus, 
  Trash2, 
  Edit, 
  GripVertical, 
  AlertTriangle,
  CheckCircle,
  Eye,
  Copy,
  Settings,
  FileText,
  Activity,
  Save,
  RotateCcw,
  Download,
  Upload,
  Shield,
  FileCheck,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

interface FieldOption {
  value: string;
  label: string;
  points?: number;
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'slider' | 'date' | 'email';
  required: boolean;
  options?: FieldOption[];
  minValue?: number;
  maxValue?: number;
  pointsPerValue?: number;
  helpText?: string;
  category?: string;
  order: number;
}

type FormType = 'FRAT' | 'GRAT' | 'Hazard' | 'ASAP' | 'Waiver' | 'Audit';

interface FormTemplate {
  id: string;
  name: string;
  type: FormType;
  fields: FormField[];
  maxScore?: number;
  scoringRules?: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
    criticalRisk: number;
  };
  lastModified: string;
  modifiedBy: string;
  description?: string;
}

export default function FormFieldManager({ userRole }: { userRole: string }) {
  const [selectedFormType, setSelectedFormType] = useState<FormType>('FRAT');
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // FRAT Template
  const [fratTemplate, setFratTemplate] = useState<FormTemplate>({
    id: 'FRAT-TEMPLATE-001',
    name: 'Flight Risk Assessment Tool',
    type: 'FRAT',
    description: 'Comprehensive pre-flight risk assessment',
    fields: [
      {
        id: 'field-1',
        label: 'Weather Conditions',
        type: 'select',
        required: true,
        category: 'Environmental',
        order: 1,
        helpText: 'Assess current and forecast weather conditions',
        options: [
          { value: 'vfr-clear', label: 'VFR - Clear', points: 0 },
          { value: 'vfr-marginal', label: 'VFR - Marginal', points: 2 },
          { value: 'ifr-good', label: 'IFR - Good Conditions', points: 4 },
          { value: 'ifr-challenging', label: 'IFR - Challenging', points: 6 },
          { value: 'severe', label: 'Severe Weather', points: 10 }
        ]
      },
      {
        id: 'field-2',
        label: 'Airport Familiarity',
        type: 'select',
        required: true,
        category: 'Experience',
        order: 2,
        helpText: 'PIC experience at destination airport',
        options: [
          { value: 'highly-familiar', label: 'Highly Familiar (10+ times)', points: 0 },
          { value: 'familiar', label: 'Familiar (5-9 times)', points: 1 },
          { value: 'some-experience', label: 'Some Experience (2-4 times)', points: 3 },
          { value: 'limited', label: 'Limited (1 time)', points: 5 },
          { value: 'new', label: 'New Airport', points: 7 }
        ]
      },
      {
        id: 'field-3',
        label: 'Crew Rest',
        type: 'select',
        required: true,
        category: 'Fatigue',
        order: 3,
        helpText: 'Hours of rest in last 24 hours',
        options: [
          { value: 'adequate-10plus', label: '10+ hours', points: 0 },
          { value: 'good-8to10', label: '8-10 hours', points: 1 },
          { value: 'moderate-6to8', label: '6-8 hours', points: 3 },
          { value: 'limited-4to6', label: '4-6 hours', points: 6 },
          { value: 'minimal', label: 'Less than 4 hours', points: 10 }
        ]
      },
      {
        id: 'field-4',
        label: 'Flight Duration',
        type: 'select',
        required: true,
        category: 'Operational',
        order: 4,
        options: [
          { value: 'short', label: 'Short (0-2 hours)', points: 0 },
          { value: 'medium', label: 'Medium (2-4 hours)', points: 1 },
          { value: 'long', label: 'Long (4-6 hours)', points: 3 },
          { value: 'extended', label: 'Extended (6+ hours)', points: 5 }
        ]
      },
      {
        id: 'field-5',
        label: 'Night Operations',
        type: 'radio',
        required: true,
        category: 'Operational',
        order: 5,
        options: [
          { value: 'day', label: 'Day Flight', points: 0 },
          { value: 'night', label: 'Night Flight', points: 2 }
        ]
      }
    ],
    maxScore: 50,
    scoringRules: {
      lowRisk: 10,
      mediumRisk: 20,
      highRisk: 30,
      criticalRisk: 40
    },
    lastModified: '2025-02-08T10:30:00',
    modifiedBy: 'Safety Manager - John Smith'
  });

  // GRAT Template
  const [gratTemplate, setGratTemplate] = useState<FormTemplate>({
    id: 'GRAT-TEMPLATE-001',
    name: 'Ground Risk Assessment Tool',
    type: 'GRAT',
    description: 'Ground operations risk assessment (AM/PM)',
    fields: [
      {
        id: 'gfield-1',
        label: 'Weather Conditions',
        type: 'select',
        required: true,
        category: 'Environmental',
        order: 1,
        helpText: 'Ground weather conditions',
        options: [
          { value: 'clear', label: 'Clear/Good', points: 0 },
          { value: 'rain', label: 'Rain', points: 2 },
          { value: 'ice-snow', label: 'Ice/Snow', points: 4 },
          { value: 'severe', label: 'Severe Weather', points: 6 }
        ]
      },
      {
        id: 'gfield-2',
        label: 'Equipment Status',
        type: 'select',
        required: true,
        category: 'Equipment',
        order: 2,
        options: [
          { value: 'all-operational', label: 'All Equipment Operational', points: 0 },
          { value: 'minor-issues', label: 'Minor Issues', points: 2 },
          { value: 'significant-issues', label: 'Significant Issues', points: 5 },
          { value: 'critical-issues', label: 'Critical Issues', points: 8 }
        ]
      },
      {
        id: 'gfield-3',
        label: 'Personnel Factors',
        type: 'select',
        required: true,
        category: 'Personnel',
        order: 3,
        helpText: 'Staff availability and experience',
        options: [
          { value: 'full-experienced', label: 'Full Staff - Experienced', points: 0 },
          { value: 'full-mixed', label: 'Full Staff - Mixed Experience', points: 2 },
          { value: 'reduced', label: 'Reduced Staff', points: 4 },
          { value: 'minimal', label: 'Minimal Staff', points: 6 }
        ]
      },
      {
        id: 'gfield-4',
        label: 'Time Pressure',
        type: 'select',
        required: true,
        category: 'Operational',
        order: 4,
        options: [
          { value: 'none', label: 'No Time Pressure', points: 0 },
          { value: 'moderate', label: 'Moderate Pressure', points: 2 },
          { value: 'significant', label: 'Significant Pressure', points: 4 },
          { value: 'critical', label: 'Critical Time Constraint', points: 6 }
        ]
      },
      {
        id: 'gfield-5',
        label: 'Operation Complexity',
        type: 'select',
        required: true,
        category: 'Operational',
        order: 5,
        options: [
          { value: 'routine', label: 'Routine Operation', points: 0 },
          { value: 'moderate', label: 'Moderate Complexity', points: 2 },
          { value: 'complex', label: 'Complex Operation', points: 4 },
          { value: 'highly-complex', label: 'Highly Complex', points: 6 }
        ]
      }
    ],
    maxScore: 50,
    scoringRules: {
      lowRisk: 10,
      mediumRisk: 20,
      highRisk: 30,
      criticalRisk: 40
    },
    lastModified: '2025-02-08T14:45:00',
    modifiedBy: 'Safety Manager - John Smith'
  });

  // Hazard Report Template
  const [hazardTemplate, setHazardTemplate] = useState<FormTemplate>({
    id: 'HAZARD-TEMPLATE-001',
    name: 'Hazard Report Form',
    type: 'Hazard',
    description: 'Report and document safety hazards',
    fields: [
      {
        id: 'hfield-1',
        label: 'Hazard Location',
        type: 'text',
        required: true,
        category: 'Identification',
        order: 1,
        helpText: 'Where was the hazard identified?'
      },
      {
        id: 'hfield-2',
        label: 'Date of Discovery',
        type: 'date',
        required: true,
        category: 'Identification',
        order: 2
      },
      {
        id: 'hfield-3',
        label: 'Hazard Category',
        type: 'select',
        required: true,
        category: 'Classification',
        order: 3,
        options: [
          { value: 'aircraft', label: 'Aircraft/Equipment' },
          { value: 'environmental', label: 'Environmental' },
          { value: 'procedural', label: 'Procedural' },
          { value: 'personnel', label: 'Personnel/Human Factors' },
          { value: 'facility', label: 'Facility/Infrastructure' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        id: 'hfield-4',
        label: 'Severity Level',
        type: 'select',
        required: true,
        category: 'Classification',
        order: 4,
        options: [
          { value: 'critical', label: 'Critical - Immediate Action Required' },
          { value: 'high', label: 'High - Prompt Action Required' },
          { value: 'medium', label: 'Medium - Action Required' },
          { value: 'low', label: 'Low - Monitoring Required' }
        ]
      },
      {
        id: 'hfield-5',
        label: 'Hazard Description',
        type: 'textarea',
        required: true,
        category: 'Details',
        order: 5,
        helpText: 'Provide detailed description of the hazard'
      },
      {
        id: 'hfield-6',
        label: 'Potential Consequences',
        type: 'textarea',
        required: true,
        category: 'Details',
        order: 6,
        helpText: 'What could happen if this hazard is not addressed?'
      },
      {
        id: 'hfield-7',
        label: 'Suggested Corrective Actions',
        type: 'textarea',
        required: false,
        category: 'Recommendations',
        order: 7,
        helpText: 'Your recommendations for addressing this hazard'
      }
    ],
    lastModified: '2025-02-08T10:00:00',
    modifiedBy: 'Safety Manager - John Smith'
  });

  // ASAP Report Template
  const [asapTemplate, setAsapTemplate] = useState<FormTemplate>({
    id: 'ASAP-TEMPLATE-001',
    name: 'ASAP Report Form',
    type: 'ASAP',
    description: 'Aviation Safety Action Program reporting',
    fields: [
      {
        id: 'afield-1',
        label: 'Event Date',
        type: 'date',
        required: true,
        category: 'Event Details',
        order: 1
      },
      {
        id: 'afield-2',
        label: 'Event Time',
        type: 'text',
        required: true,
        category: 'Event Details',
        order: 2,
        helpText: 'Local time (HHMM format)'
      },
      {
        id: 'afield-3',
        label: 'Aircraft Registration',
        type: 'text',
        required: true,
        category: 'Event Details',
        order: 3
      },
      {
        id: 'afield-4',
        label: 'Location',
        type: 'text',
        required: true,
        category: 'Event Details',
        order: 4,
        helpText: 'Airport code or location where event occurred'
      },
      {
        id: 'afield-5',
        label: 'Event Category',
        type: 'select',
        required: true,
        category: 'Classification',
        order: 5,
        options: [
          { value: 'procedure', label: 'Procedural Deviation' },
          { value: 'regulation', label: 'Regulatory Deviation' },
          { value: 'communication', label: 'Communication Issue' },
          { value: 'navigation', label: 'Navigation Error' },
          { value: 'maintenance', label: 'Maintenance Related' },
          { value: 'weather', label: 'Weather Related' },
          { value: 'atc', label: 'ATC Related' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        id: 'afield-6',
        label: 'Event Description',
        type: 'textarea',
        required: true,
        category: 'Narrative',
        order: 6,
        helpText: 'Describe what happened in detail'
      },
      {
        id: 'afield-7',
        label: 'Contributing Factors',
        type: 'textarea',
        required: true,
        category: 'Narrative',
        order: 7,
        helpText: 'What factors contributed to this event?'
      },
      {
        id: 'afield-8',
        label: 'Actions Taken',
        type: 'textarea',
        required: true,
        category: 'Narrative',
        order: 8,
        helpText: 'What actions were taken during or after the event?'
      },
      {
        id: 'afield-9',
        label: 'Suggestions for Prevention',
        type: 'textarea',
        required: false,
        category: 'Recommendations',
        order: 9,
        helpText: 'How can similar events be prevented in the future?'
      }
    ],
    lastModified: '2025-02-08T11:00:00',
    modifiedBy: 'Safety Manager - John Smith'
  });

  // Waiver Management Template
  const [waiverTemplate, setWaiverTemplate] = useState<FormTemplate>({
    id: 'WAIVER-TEMPLATE-001',
    name: 'Waiver Request Form',
    type: 'Waiver',
    description: 'Request operational waivers and exemptions',
    fields: [
      {
        id: 'wfield-1',
        label: 'Requester Name',
        type: 'text',
        required: true,
        category: 'Request Information',
        order: 1
      },
      {
        id: 'wfield-2',
        label: 'Requester Email',
        type: 'email',
        required: true,
        category: 'Request Information',
        order: 2
      },
      {
        id: 'wfield-3',
        label: 'Waiver Type',
        type: 'select',
        required: true,
        category: 'Classification',
        order: 3,
        options: [
          { value: 'operational', label: 'Operational Procedure' },
          { value: 'training', label: 'Training Requirement' },
          { value: 'currency', label: 'Currency Requirement' },
          { value: 'equipment', label: 'Equipment Requirement' },
          { value: 'scheduling', label: 'Scheduling/Rest Requirement' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        id: 'wfield-4',
        label: 'Urgency Level',
        type: 'select',
        required: true,
        category: 'Classification',
        order: 4,
        options: [
          { value: 'routine', label: 'Routine (7+ days)' },
          { value: 'expedited', label: 'Expedited (3-7 days)' },
          { value: 'urgent', label: 'Urgent (1-2 days)' },
          { value: 'emergency', label: 'Emergency (Immediate)' }
        ]
      },
      {
        id: 'wfield-5',
        label: 'Regulation/Procedure Being Waived',
        type: 'textarea',
        required: true,
        category: 'Details',
        order: 5,
        helpText: 'Specify the regulation, SOP, or procedure'
      },
      {
        id: 'wfield-6',
        label: 'Reason for Waiver',
        type: 'textarea',
        required: true,
        category: 'Details',
        order: 6,
        helpText: 'Explain why this waiver is necessary'
      },
      {
        id: 'wfield-7',
        label: 'Duration of Waiver',
        type: 'text',
        required: true,
        category: 'Details',
        order: 7,
        helpText: 'How long should this waiver be effective?'
      },
      {
        id: 'wfield-8',
        label: 'Risk Mitigation Plan',
        type: 'textarea',
        required: true,
        category: 'Safety',
        order: 8,
        helpText: 'How will risks be mitigated during the waiver period?'
      },
      {
        id: 'wfield-9',
        label: 'Alternative Actions Considered',
        type: 'textarea',
        required: false,
        category: 'Safety',
        order: 9,
        helpText: 'What alternatives were considered?'
      }
    ],
    lastModified: '2025-02-08T12:00:00',
    modifiedBy: 'Safety Manager - John Smith'
  });

  // Internal Audit Template
  const [auditTemplate, setAuditTemplate] = useState<FormTemplate>({
    id: 'AUDIT-TEMPLATE-001',
    name: 'Internal Audit Form',
    type: 'Audit',
    description: 'Safety management system internal audits',
    fields: [
      {
        id: 'aufield-1',
        label: 'Audit Date',
        type: 'date',
        required: true,
        category: 'Audit Information',
        order: 1
      },
      {
        id: 'aufield-2',
        label: 'Lead Auditor',
        type: 'text',
        required: true,
        category: 'Audit Information',
        order: 2
      },
      {
        id: 'aufield-3',
        label: 'Audit Team Members',
        type: 'textarea',
        required: false,
        category: 'Audit Information',
        order: 3,
        helpText: 'List additional audit team members'
      },
      {
        id: 'aufield-4',
        label: 'Audit Type',
        type: 'select',
        required: true,
        category: 'Classification',
        order: 4,
        options: [
          { value: 'sms', label: 'Safety Management System' },
          { value: 'operational', label: 'Operational Procedures' },
          { value: 'maintenance', label: 'Maintenance Procedures' },
          { value: 'training', label: 'Training Program' },
          { value: 'documentation', label: 'Documentation Review' },
          { value: 'compliance', label: 'Regulatory Compliance' },
          { value: 'special', label: 'Special Audit' }
        ]
      },
      {
        id: 'aufield-5',
        label: 'Department/Area Audited',
        type: 'text',
        required: true,
        category: 'Classification',
        order: 5
      },
      {
        id: 'aufield-6',
        label: 'Audit Scope',
        type: 'textarea',
        required: true,
        category: 'Details',
        order: 6,
        helpText: 'Define the scope and objectives of this audit'
      },
      {
        id: 'aufield-7',
        label: 'Standards/References',
        type: 'textarea',
        required: true,
        category: 'Details',
        order: 7,
        helpText: 'List applicable regulations, standards, and procedures'
      },
      {
        id: 'aufield-8',
        label: 'Findings Summary',
        type: 'textarea',
        required: true,
        category: 'Results',
        order: 8,
        helpText: 'Summarize audit findings'
      },
      {
        id: 'aufield-9',
        label: 'Observations',
        type: 'textarea',
        required: true,
        category: 'Results',
        order: 9,
        helpText: 'Detailed observations and evidence'
      },
      {
        id: 'aufield-10',
        label: 'Non-Conformances',
        type: 'textarea',
        required: false,
        category: 'Results',
        order: 10,
        helpText: 'List any non-conformances identified'
      },
      {
        id: 'aufield-11',
        label: 'Recommendations',
        type: 'textarea',
        required: true,
        category: 'Results',
        order: 11,
        helpText: 'Recommendations for improvement'
      },
      {
        id: 'aufield-12',
        label: 'Overall Compliance Rating',
        type: 'select',
        required: true,
        category: 'Results',
        order: 12,
        options: [
          { value: 'excellent', label: 'Excellent - Full Compliance' },
          { value: 'satisfactory', label: 'Satisfactory - Minor Issues' },
          { value: 'needs-improvement', label: 'Needs Improvement - Moderate Issues' },
          { value: 'unsatisfactory', label: 'Unsatisfactory - Major Issues' }
        ]
      }
    ],
    lastModified: '2025-02-08T13:00:00',
    modifiedBy: 'Safety Manager - John Smith'
  });

  // Template management
  const templates = {
    FRAT: { template: fratTemplate, setTemplate: setFratTemplate },
    GRAT: { template: gratTemplate, setTemplate: setGratTemplate },
    Hazard: { template: hazardTemplate, setTemplate: setHazardTemplate },
    ASAP: { template: asapTemplate, setTemplate: setAsapTemplate },
    Waiver: { template: waiverTemplate, setTemplate: setWaiverTemplate },
    Audit: { template: auditTemplate, setTemplate: setAuditTemplate }
  };

  const currentTemplate = templates[selectedFormType].template;
  const setCurrentTemplate = templates[selectedFormType].setTemplate;

  const [newField, setNewField] = useState<Partial<FormField>>({
    label: '',
    type: 'text',
    required: true,
    category: '',
    options: []
  });

  const [newOption, setNewOption] = useState({ value: '', label: '', points: 0 });

  const handleAddOption = () => {
    if (newOption.label && newOption.value) {
      setNewField({
        ...newField,
        options: [...(newField.options || []), { ...newOption }]
      });
      setNewOption({ value: '', label: '', points: 0 });
      toast.success('Option added');
    }
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...(newField.options || [])];
    updatedOptions.splice(index, 1);
    setNewField({ ...newField, options: updatedOptions });
  };

  const handleSaveField = () => {
    if (!newField.label) {
      toast.error('Field label is required');
      return;
    }

    if ((newField.type === 'select' || newField.type === 'radio') && (!newField.options || newField.options.length === 0)) {
      toast.error('At least one option is required for this field type');
      return;
    }

    const fieldToSave: FormField = {
      id: editingField?.id || `field-${Date.now()}`,
      label: newField.label!,
      type: newField.type as FormField['type'],
      required: newField.required || true,
      category: newField.category || 'General',
      order: editingField?.order || currentTemplate.fields.length + 1,
      helpText: newField.helpText,
      options: newField.options,
      minValue: newField.minValue,
      maxValue: newField.maxValue,
      pointsPerValue: newField.pointsPerValue
    };

    let updatedFields;
    if (editingField) {
      updatedFields = currentTemplate.fields.map(f => 
        f.id === editingField.id ? fieldToSave : f
      );
      toast.success('Field updated successfully');
    } else {
      updatedFields = [...currentTemplate.fields, fieldToSave];
      toast.success('Field added successfully');
    }

    setCurrentTemplate({
      ...currentTemplate,
      fields: updatedFields,
      lastModified: new Date().toISOString(),
      modifiedBy: 'Safety Manager - Current User'
    });

    setNewField({
      label: '',
      type: 'text',
      required: true,
      category: '',
      options: []
    });
    setEditingField(null);
    setIsEditing(false);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setNewField({
      label: field.label,
      type: field.type,
      required: field.required,
      category: field.category,
      helpText: field.helpText,
      options: field.options || [],
      minValue: field.minValue,
      maxValue: field.maxValue,
      pointsPerValue: field.pointsPerValue
    });
    setIsEditing(true);
  };

  const handleDeleteField = (fieldId: string) => {
    const updatedFields = currentTemplate.fields.filter(f => f.id !== fieldId);
    setCurrentTemplate({
      ...currentTemplate,
      fields: updatedFields,
      lastModified: new Date().toISOString()
    });
    toast.success('Field deleted successfully');
  };

  const handleDuplicateField = (field: FormField) => {
    const newField: FormField = {
      ...field,
      id: `field-${Date.now()}`,
      label: `${field.label} (Copy)`,
      order: currentTemplate.fields.length + 1
    };
    setCurrentTemplate({
      ...currentTemplate,
      fields: [...currentTemplate.fields, newField],
      lastModified: new Date().toISOString()
    });
    toast.success('Field duplicated successfully');
  };

  const handleReorderField = (fieldId: string, direction: 'up' | 'down') => {
    const index = currentTemplate.fields.findIndex(f => f.id === fieldId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === currentTemplate.fields.length - 1)
    ) {
      return;
    }

    const newFields = [...currentTemplate.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    // Update order numbers
    newFields.forEach((field, idx) => {
      field.order = idx + 1;
    });

    setCurrentTemplate({
      ...currentTemplate,
      fields: newFields,
      lastModified: new Date().toISOString()
    });
  };

  const calculateMaxScore = () => {
    let maxScore = 0;
    currentTemplate.fields.forEach(field => {
      if (field.options && field.options.length > 0) {
        const maxPoints = Math.max(...field.options.map(opt => opt.points || 0));
        maxScore += maxPoints;
      }
    });
    return maxScore;
  };

  const handleUpdateScoringRules = (rules: NonNullable<FormTemplate['scoringRules']>) => {
    setCurrentTemplate({
      ...currentTemplate,
      scoringRules: rules,
      lastModified: new Date().toISOString()
    });
    toast.success('Scoring rules updated');
  };

  const handleExportTemplate = () => {
    const dataStr = JSON.stringify(currentTemplate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${currentTemplate.type}_template_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Template exported successfully');
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const hasScoring = (formType: FormType) => {
    return formType === 'FRAT' || formType === 'GRAT';
  };

  // Only allow safety and admin roles to access this
  if (userRole !== 'safety' && userRole !== 'admin') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2>Access Restricted</h2>
            <p className="text-muted-foreground">
              Form field management is only available to Safety and Admin roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1>Form Field Manager</h1>
          <p className="text-muted-foreground">
            Customize safety and operational form fields
          </p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 lg:mt-0">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </Button>
          <Button variant="outline" onClick={handleExportTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Export Template
          </Button>
          <Button>
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Form Type Selector */}
      <Tabs value={selectedFormType} onValueChange={(value) => setSelectedFormType(value as FormType)}>
        <TabsList className="grid w-full grid-cols-6 max-w-5xl">
          <TabsTrigger value="FRAT">
            <FileText className="w-4 h-4 mr-2" />
            FRAT
          </TabsTrigger>
          <TabsTrigger value="GRAT">
            <Activity className="w-4 h-4 mr-2" />
            GRAT
          </TabsTrigger>
          <TabsTrigger value="Hazard">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Hazard
          </TabsTrigger>
          <TabsTrigger value="ASAP">
            <Shield className="w-4 h-4 mr-2" />
            ASAP
          </TabsTrigger>
          <TabsTrigger value="Waiver">
            <FileCheck className="w-4 h-4 mr-2" />
            Waiver
          </TabsTrigger>
          <TabsTrigger value="Audit">
            <Target className="w-4 h-4 mr-2" />
            Audit
          </TabsTrigger>
        </TabsList>

        {(['FRAT', 'GRAT', 'Hazard', 'ASAP', 'Waiver', 'Audit'] as FormType[]).map((formType) => (
          <TabsContent key={formType} value={formType} className="space-y-6">
            <FormEditor
              template={templates[formType].template}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              editingField={editingField}
              newField={newField}
              setNewField={setNewField}
              newOption={newOption}
              setNewOption={setNewOption}
              handleAddOption={handleAddOption}
              handleRemoveOption={handleRemoveOption}
              handleSaveField={handleSaveField}
              handleEditField={handleEditField}
              handleDeleteField={handleDeleteField}
              handleDuplicateField={handleDuplicateField}
              handleReorderField={handleReorderField}
              handleUpdateScoringRules={handleUpdateScoringRules}
              calculateMaxScore={calculateMaxScore}
              previewMode={previewMode}
              getRiskLevelColor={getRiskLevelColor}
              hasScoring={hasScoring(formType)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface FormEditorProps {
  template: FormTemplate;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  editingField: FormField | null;
  newField: Partial<FormField>;
  setNewField: (field: Partial<FormField>) => void;
  newOption: { value: string; label: string; points: number };
  setNewOption: (option: { value: string; label: string; points: number }) => void;
  handleAddOption: () => void;
  handleRemoveOption: (index: number) => void;
  handleSaveField: () => void;
  handleEditField: (field: FormField) => void;
  handleDeleteField: (fieldId: string) => void;
  handleDuplicateField: (field: FormField) => void;
  handleReorderField: (fieldId: string, direction: 'up' | 'down') => void;
  handleUpdateScoringRules: (rules: NonNullable<FormTemplate['scoringRules']>) => void;
  calculateMaxScore: () => number;
  previewMode: boolean;
  getRiskLevelColor: (level: string) => string;
  hasScoring: boolean;
}

function FormEditor({
  template,
  isEditing,
  setIsEditing,
  editingField,
  newField,
  setNewField,
  newOption,
  setNewOption,
  handleAddOption,
  handleRemoveOption,
  handleSaveField,
  handleEditField,
  handleDeleteField,
  handleDuplicateField,
  handleReorderField,
  handleUpdateScoringRules,
  calculateMaxScore,
  previewMode,
  getRiskLevelColor,
  hasScoring
}: FormEditorProps) {
  const [scoringRules, setScoringRules] = useState(template.scoringRules || {
    lowRisk: 10,
    mediumRisk: 20,
    highRisk: 30,
    criticalRisk: 40
  });

  return (
    <>
      {/* Template Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{template.name}</CardTitle>
              <CardDescription>
                {template.description}
              </CardDescription>
              <CardDescription className="mt-1">
                Last modified: {new Date(template.lastModified).toLocaleString()} by {template.modifiedBy}
              </CardDescription>
            </div>
            {hasScoring && (
              <Badge variant="outline" className="text-lg px-4 py-2">
                Max Score: {calculateMaxScore()}
              </Badge>
            )}
          </div>
        </CardHeader>

        {/* Scoring Rules - Only for FRAT and GRAT */}
        {hasScoring && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Low Risk</span>
                </div>
                <Input
                  type="number"
                  value={scoringRules.lowRisk}
                  onChange={(e) => setScoringRules({ ...scoringRules, lowRisk: parseInt(e.target.value) })}
                  className="mt-2"
                  disabled={previewMode}
                />
                <p className="text-xs text-muted-foreground mt-1">0 - {scoringRules.lowRisk} points</p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium">Medium Risk</span>
                </div>
                <Input
                  type="number"
                  value={scoringRules.mediumRisk}
                  onChange={(e) => setScoringRules({ ...scoringRules, mediumRisk: parseInt(e.target.value) })}
                  className="mt-2"
                  disabled={previewMode}
                />
                <p className="text-xs text-muted-foreground mt-1">{scoringRules.lowRisk + 1} - {scoringRules.mediumRisk} points</p>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium">High Risk</span>
                </div>
                <Input
                  type="number"
                  value={scoringRules.highRisk}
                  onChange={(e) => setScoringRules({ ...scoringRules, highRisk: parseInt(e.target.value) })}
                  className="mt-2"
                  disabled={previewMode}
                />
                <p className="text-xs text-muted-foreground mt-1">{scoringRules.mediumRisk + 1} - {scoringRules.highRisk} points</p>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium">Critical Risk</span>
                </div>
                <Input
                  type="number"
                  value={scoringRules.criticalRisk}
                  onChange={(e) => setScoringRules({ ...scoringRules, criticalRisk: parseInt(e.target.value) })}
                  className="mt-2"
                  disabled={previewMode}
                />
                <p className="text-xs text-muted-foreground mt-1">{scoringRules.highRisk + 1}+ points</p>
              </div>
            </div>

            {!previewMode && (
              <Button 
                onClick={() => handleUpdateScoringRules(scoringRules)} 
                className="mt-4"
                variant="outline"
              >
                Update Scoring Rules
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Current Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Form Fields ({template.fields.length})</CardTitle>
            {!previewMode && (
              <Button onClick={() => setIsEditing(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Field
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {template.fields.sort((a, b) => a.order - b.order).map((field, index) => (
              <Card key={field.id} className="p-4">
                <div className="flex items-start gap-4">
                  {!previewMode && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReorderField(field.id, 'up')}
                        disabled={index === 0}
                      >
                        <GripVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{field.label}</h4>
                          {field.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                          {field.category && <Badge variant="outline" className="text-xs bg-blue-50">{field.category}</Badge>}
                        </div>
                        {field.helpText && (
                          <p className="text-sm text-muted-foreground mt-1">{field.helpText}</p>
                        )}
                      </div>
                      
                      {!previewMode && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateField(field)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditField(field)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteField(field.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="text-sm">
                      <Badge variant="outline" className="mb-2">{field.type}</Badge>
                      
                      {field.options && field.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {field.options.map((option, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                              <span>{option.label}</span>
                              {option.points !== undefined && (
                                <Badge variant="secondary">{option.points} pts</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Field Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Add New Field'}</DialogTitle>
            <DialogDescription>
              {editingField ? 'Modify the field properties below' : 'Create a new form field'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field Label *</Label>
                <Input
                  value={newField.label || ''}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g., Weather Conditions"
                />
              </div>

              <div>
                <Label>Field Type *</Label>
                <Select
                  value={newField.type}
                  onValueChange={(value) => setNewField({ ...newField, type: value as FormField['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Input</SelectItem>
                    <SelectItem value="textarea">Text Area</SelectItem>
                    <SelectItem value="number">Number Input</SelectItem>
                    <SelectItem value="select">Dropdown Select</SelectItem>
                    <SelectItem value="radio">Radio Buttons</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="date">Date Picker</SelectItem>
                    <SelectItem value="email">Email Input</SelectItem>
                    <SelectItem value="slider">Slider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input
                  value={newField.category || ''}
                  onChange={(e) => setNewField({ ...newField, category: e.target.value })}
                  placeholder="e.g., Environmental, Operational"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={newField.required}
                  onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
                />
                <Label>Required Field</Label>
              </div>
            </div>

            <div>
              <Label>Help Text</Label>
              <Textarea
                value={newField.helpText || ''}
                onChange={(e) => setNewField({ ...newField, helpText: e.target.value })}
                placeholder="Provide guidance for users filling out this field"
                rows={2}
              />
            </div>

            {/* Options for select and radio fields */}
            {(newField.type === 'select' || newField.type === 'radio') && (
              <div className="space-y-3">
                <Label>Options *</Label>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Value (e.g., vfr-clear)"
                    value={newOption.value}
                    onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                  />
                  <Input
                    placeholder="Label (e.g., VFR - Clear)"
                    value={newOption.label}
                    onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                  />
                  {hasScoring && (
                    <Input
                      type="number"
                      placeholder="Points"
                      value={newOption.points}
                      onChange={(e) => setNewOption({ ...newOption, points: parseInt(e.target.value) || 0 })}
                      className="w-24"
                    />
                  )}
                  <Button onClick={handleAddOption} type="button">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {newField.options && newField.options.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-3">
                    {newField.options.map((option, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{option.label}</span>
                          <span className="text-xs text-muted-foreground">({option.value})</span>
                          {option.points !== undefined && (
                            <Badge variant="secondary" className="text-xs">{option.points} pts</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(idx)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setEditingField(null);
              setNewField({
                label: '',
                type: 'text',
                required: true,
                category: '',
                options: []
              });
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveField}>
              {editingField ? 'Update Field' : 'Add Field'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}