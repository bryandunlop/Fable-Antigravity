import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Shield,
  AlertTriangle,
  Upload,
  X,
  Save,
  Send,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';

interface RiskProfileProps {
  onSave?: (data: any) => void;
  onSubmit?: (data: any) => void;
}

export default function SafetyRiskProfile({ onSave, onSubmit }: RiskProfileProps) {
  const [status, setStatus] = useState('Initial Submission');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [underlyingCircumstances, setUnderlyingCircumstances] = useState<'yes' | 'no' | ''>('');
  const [circumstancesDetails, setCircumstancesDetails] = useState('');
  const [severity, setSeverity] = useState<string>('');
  const [likelihood, setLikelihood] = useState<string>('');
  const [mitigationStrategies, setMitigationStrategies] = useState<string[]>(['']);
  const [similarEvents, setSimilarEvents] = useState('');
  const [reviewSchedule, setReviewSchedule] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  // Risk matrix calculation
  const calculateRiskLevel = (sev: string, like: string): { level: string; color: string } => {
    const matrix: { [key: string]: { [key: string]: string } } = {
      'Catastrophic': {
        'Rarely': 'Medium Risk',
        'Unlikely': 'High Risk',
        'Possibly': 'High Risk',
        'Likely': 'High Risk',
        'Almost Always': 'High Risk'
      },
      'Major': {
        'Rarely': 'Low Risk',
        'Unlikely': 'Medium Risk',
        'Possibly': 'High Risk',
        'Likely': 'High Risk',
        'Almost Always': 'High Risk'
      },
      'Moderate': {
        'Rarely': 'Low Risk',
        'Unlikely': 'Medium Risk',
        'Possibly': 'Medium Risk',
        'Likely': 'High Risk',
        'Almost Always': 'High Risk'
      },
      'Minor': {
        'Rarely': 'Low Risk',
        'Unlikely': 'Low Risk',
        'Possibly': 'Medium Risk',
        'Likely': 'Medium Risk',
        'Almost Always': 'High Risk'
      },
      'Negligible': {
        'Rarely': 'Low Risk',
        'Unlikely': 'Low Risk',
        'Possibly': 'Low Risk',
        'Likely': 'Low Risk',
        'Almost Always': 'Medium Risk'
      }
    };

    const riskLevel = sev && like ? matrix[sev]?.[like] || '' : '';
    
    const colorMap: { [key: string]: string } = {
      'Low Risk': 'bg-green-100 text-green-800 border-green-300',
      'Medium Risk': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'High Risk': 'bg-red-100 text-red-800 border-red-300'
    };

    return {
      level: riskLevel,
      color: colorMap[riskLevel] || 'bg-gray-100 text-gray-800 border-gray-300'
    };
  };

  const riskResult = calculateRiskLevel(severity, likelihood);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addMitigationStrategy = () => {
    setMitigationStrategies([...mitigationStrategies, '']);
  };

  const updateMitigationStrategy = (index: number, value: string) => {
    const updated = [...mitigationStrategies];
    updated[index] = value;
    setMitigationStrategies(updated);
  };

  const removeMitigationStrategy = (index: number) => {
    setMitigationStrategies(mitigationStrategies.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const data = {
      status,
      title,
      tags,
      underlyingCircumstances,
      circumstancesDetails,
      severity,
      likelihood,
      riskLevel: riskResult.level,
      mitigationStrategies: mitigationStrategies.filter(s => s.trim()),
      similarEvents,
      reviewSchedule,
      attachments
    };
    onSave?.(data);
  };

  const handleSubmit = () => {
    const data = {
      status: 'Under Review',
      title,
      tags,
      underlyingCircumstances,
      circumstancesDetails,
      severity,
      likelihood,
      riskLevel: riskResult.level,
      mitigationStrategies: mitigationStrategies.filter(s => s.trim()),
      similarEvents,
      reviewSchedule,
      attachments
    };
    onSubmit?.(data);
  };

  // Risk Matrix Component
  const RiskMatrix = () => {
    const severityLevels = ['Catastrophic', 'Major', 'Moderate', 'Minor', 'Negligible'];
    const likelihoodLevels = ['Rarely', 'Unlikely', 'Possibly', 'Likely', 'Almost Always'];

    const getCellColor = (sev: string, like: string) => {
      const risk = calculateRiskLevel(sev, like);
      const isSelected = sev === severity && like === likelihood;
      
      if (isSelected) {
        return 'ring-4 ring-blue-500 ' + risk.color;
      }
      
      if (risk.level === 'Low Risk') return 'bg-green-100 hover:bg-green-200';
      if (risk.level === 'Medium Risk') return 'bg-yellow-100 hover:bg-yellow-200';
      if (risk.level === 'High Risk') return 'bg-red-100 hover:bg-red-200';
      return 'bg-gray-100';
    };

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50"></th>
              {likelihoodLevels.map(level => (
                <th key={level} className="border p-2 bg-gray-50 text-xs font-medium">
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {severityLevels.map(sev => (
              <tr key={sev}>
                <td className="border p-2 bg-gray-50 text-xs font-medium">{sev}</td>
                {likelihoodLevels.map(like => {
                  const risk = calculateRiskLevel(sev, like);
                  return (
                    <td
                      key={`${sev}-${like}`}
                      className={`border p-3 text-center cursor-pointer transition-all ${getCellColor(sev, like)}`}
                      onClick={() => {
                        setSeverity(sev);
                        setLikelihood(like);
                      }}
                    >
                      <span className="text-xs font-medium">{risk.level.replace(' Risk', '')}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Safety Risk Profile
          </h1>
          <p className="text-muted-foreground">Comprehensive risk assessment and mitigation planning</p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 border-blue-300" variant="outline">
          {status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Identification</CardTitle>
          <CardDescription>Identify and categorize the operational risk or hazard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Please identify a risk or hazard related to your operations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Categorize the hazards / risks</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter tags... Example: Operational, Human, Security...."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Underlying Circumstances */}
          <div className="space-y-3">
            <Label>Are there underlying circumstances that may be causing the hazard? *</Label>
            <RadioGroup value={underlyingCircumstances} onValueChange={(value: 'yes' | 'no') => setUnderlyingCircumstances(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="circumstances-yes" />
                <Label htmlFor="circumstances-yes" className="font-normal cursor-pointer">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="circumstances-no" />
                <Label htmlFor="circumstances-no" className="font-normal cursor-pointer">No</Label>
              </div>
            </RadioGroup>
            {underlyingCircumstances === 'yes' && (
              <Textarea
                placeholder="Please describe the underlying circumstances..."
                value={circumstancesDetails}
                onChange={(e) => setCircumstancesDetails(e.target.value)}
                rows={3}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Severity and Likelihood Assessment</CardTitle>
          <CardDescription>
            To discern the range of consequences that can result from a hazard, select the appropriate severity and likelihood
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dropdowns for Severity and Likelihood */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Catastrophic">Catastrophic</SelectItem>
                  <SelectItem value="Major">Major</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Minor">Minor</SelectItem>
                  <SelectItem value="Negligible">Negligible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Likelihood *</Label>
              <Select value={likelihood} onValueChange={setLikelihood}>
                <SelectTrigger>
                  <SelectValue placeholder="Select likelihood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Almost Always">Almost Always</SelectItem>
                  <SelectItem value="Likely">Likely</SelectItem>
                  <SelectItem value="Possibly">Possibly</SelectItem>
                  <SelectItem value="Unlikely">Unlikely</SelectItem>
                  <SelectItem value="Rarely">Rarely</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Risk Matrix */}
          <div className="space-y-3">
            <Label>Risk Level Matrix</Label>
            <p className="text-sm text-muted-foreground">
              Click on a cell to select severity and likelihood, or use the dropdowns above
            </p>
            <RiskMatrix />
          </div>

          {/* Calculated Risk Level */}
          {riskResult.level && (
            <div className="p-4 border-2 rounded-lg bg-accent/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Calculated Risk Level</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on {severity} severity and {likelihood} likelihood
                  </p>
                </div>
                <Badge className={`${riskResult.color} text-lg px-4 py-2`} variant="outline">
                  {riskResult.level}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mitigation and Review</CardTitle>
          <CardDescription>Identify mitigation strategies and review schedule</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mitigation Strategies */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Please identify as many mitigation strategies as possible *</Label>
              <Button type="button" onClick={addMitigationStrategy} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Strategy
              </Button>
            </div>
            <div className="space-y-3">
              {mitigationStrategies.map((strategy, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    placeholder={`Mitigation strategy ${index + 1}...`}
                    value={strategy}
                    onChange={(e) => updateMitigationStrategy(index, e.target.value)}
                    rows={2}
                  />
                  {mitigationStrategies.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMitigationStrategy(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Similar Events */}
          <div className="space-y-2">
            <Label>Similar Events and Hazards</Label>
            <Textarea
              placeholder="Describe any similar events or hazards that have occurred..."
              value={similarEvents}
              onChange={(e) => setSimilarEvents(e.target.value)}
              rows={3}
            />
          </div>

          {/* Review Schedule */}
          <div className="space-y-2">
            <Label>How (and how often) do you intend to review the mitigation strategies for effectiveness? *</Label>
            <Textarea
              placeholder="Example: Monthly review during safety meetings, quarterly effectiveness assessment..."
              value={reviewSchedule}
              onChange={(e) => setReviewSchedule(e.target.value)}
              rows={3}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <Label>Attachments</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-accent/50 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drop files here to upload</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={handleSubmit}>
          <Send className="w-4 h-4 mr-2" />
          Submit for Review
        </Button>
      </div>
    </div>
  );
}
