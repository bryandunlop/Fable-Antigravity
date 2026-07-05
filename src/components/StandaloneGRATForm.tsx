import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { eventStore } from '../notifications/events';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Wrench,
  Calendar,
  Clock,
  ArrowLeft,
  Save,
  Send,
  Users,
  Cloud,
  Package,
  Truck,
  HardHat,
  Settings,
  Sliders
} from 'lucide-react';

export interface GRATItem {
  id: string;
  label: string;
  score: number;
  selected: boolean;
}

export interface GRATSection {
  title: string;
  icon: React.ElementType;
  items: GRATItem[];
}

export interface GRATSubmission {
  id: string;
  technicianName: string;
  taskDate: string;
  startTime: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Requires Review' | 'Closed';
  totalScore: number;
  maxScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  mitigationNotes?: string;
  additionalNotes?: string;
  flaggedItems: string[];
  closedBy?: string;
  closedAt?: string;
}


interface StandaloneGRATFormProps {
  userRole: string;
  userName?: string;
}

export default function StandaloneGRATForm({ userRole, userName = 'Current User' }: StandaloneGRATFormProps) {
  const navigate = useNavigate();

  // Basic maintenance information - auto-populated
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
  const [technicianName] = useState(userName);
  const [mitigationNotes, setMitigationNotes] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // GRAT Sections with all items
  const [gratSections, setGratSections] = useState<GRATSection[]>([
    {
      title: 'General Outlook',
      icon: Cloud,
      items: [
        { id: 'go1', label: 'Hangar Facility Mx', score: 1, selected: false },
        { id: 'go2', label: 'Lack of Time Available', score: 3, selected: false },
        { id: 'go3', label: 'Concurrent Activities', score: 2, selected: false },
        { id: 'go4', label: 'Working Temperatures over 90F', score: 2, selected: false },
        { id: 'go5', label: 'Local Thunderstorms', score: 2, selected: false },
        { id: 'go6', label: 'High Winds', score: 2, selected: false },
        { id: 'go7', label: 'Rain or Wet Conditions', score: 2, selected: false },
        { id: 'go8', label: 'Snow', score: 4, selected: false },
        { id: 'go9', label: 'Ice', score: 4, selected: false },
        { id: 'go10', label: 'Working Temperatures Below 32F', score: 3, selected: false },
      ]
    },
    {
      title: 'Human Factors',
      icon: Users,
      items: [
        { id: 'hf1', label: 'Duty Time 8 hours or less', score: 1, selected: false },
        { id: 'hf2', label: 'Duty Time 8 to 12 hours', score: 2, selected: false },
        { id: 'hf3', label: 'Work during WOCL (0200-0600 Local)', score: 3, selected: false },
        { id: 'hf4', label: 'Off-Duty Res: 8 Hours or less', score: 3, selected: false },
        { id: 'hf5', label: 'Off-Duty Res: 8 - 12 Hours', score: 2, selected: false },
        { id: 'hf6', label: 'Working Alone', score: 5, selected: false },
        { id: 'hf7', label: 'Working Alone with Emergency Notification Procedure in use.', score: 0, selected: false },
        { id: 'hf8', label: 'Contract Aircraft Mx Personnel', score: 2, selected: false },
        { id: 'hf9', label: 'Contract Aircraft Cleaners', score: 1, selected: false },
        { id: 'hf10', label: 'Contract Facility Mx Personnel (Not JLL)', score: 1, selected: false },
        { id: 'hf11', label: 'Visitor Group at Hangar', score: 2, selected: false },
        { id: 'hf12', label: 'Personnel Health: Minor Sickness', score: 1, selected: false },
        { id: 'hf13', label: 'Personnel Health: Emotional/Family Concerns', score: 3, selected: false },
      ]
    },
    {
      title: 'General Conditions Activities',
      icon: Package,
      items: [
        { id: 'gc1', label: 'Servicing: Fuel', score: 1, selected: false },
        { id: 'gc2', label: 'Servicing: Oxygen', score: 1, selected: false },
        { id: 'gc3', label: 'Inspection: Pre and Post Flight', score: 2, selected: false },
        { id: 'gc4', label: 'Inspection: Scheduled', score: 1, selected: false },
        { id: 'gc5', label: 'Unscheduled Maintenance', score: 2, selected: false },
        { id: 'gc6', label: 'Removal of Large/Complex Panels or Fairings', score: 1, selected: false },
        { id: 'gc7', label: 'Electrical System Maintenance', score: 2, selected: false },
        { id: 'gc8', label: 'Fuel System Maintenance', score: 2, selected: false },
        { id: 'gc9', label: 'Engine/APU Maintenance', score: 2, selected: false },
        { id: 'gc10', label: 'Hydraulic Maintenance', score: 2, selected: false },
        { id: 'gc11', label: 'Pneumatic System Maintenance', score: 1, selected: false },
        { id: 'gc12', label: 'Ladder or Maintenance Platform Use', score: 3, selected: false },
        { id: 'gc13', label: 'Fall Protection', score: 2, selected: false },
        { id: 'gc14', label: 'Fall Protection (Lone Worker)', score: 10, selected: false },
        { id: 'gc15', label: 'Aircraft Jacking', score: 3, selected: false },
        { id: 'gc16', label: 'Focused Maintenance Area', score: 3, selected: false },
        { id: 'gc17', label: 'Hazardous Equipment', score: 3, selected: false },
        { id: 'gc18', label: 'Hazardous Materials', score: 3, selected: false },
      ]
    },
    {
      title: 'Ramp, Hangar, GSE',
      icon: Truck,
      items: [
        { id: 'rh1', label: 'Passenger, Cargo, Luggage Handling', score: 2, selected: false },
        { id: 'rh2', label: 'Ramp Area: Visitor Aircraft', score: 1, selected: false },
        { id: 'rh3', label: 'Ramp Area: Aircraft Moving Under Power', score: 1, selected: false },
        { id: 'rh4', label: 'Maintenance Engine Run and Taxi Operations', score: 5, selected: false },
        { id: 'rh5', label: 'Ramp Area: Passenger Vehicles', score: 2, selected: false },
        { id: 'rh6', label: 'TSA/ Customs Operations', score: 3, selected: false },
        { id: 'rh7', label: 'Hangar: Visitor Aircraft in Hangar', score: 3, selected: false },
        { id: 'rh8', label: 'Hangar: Other Obstructions', score: 3, selected: false },
        { id: 'rh9', label: 'GSE: GPU', score: 1, selected: false },
        { id: 'rh10', label: 'GSE: Hydraulic Mule', score: 2, selected: false },
        { id: 'rh11', label: 'Power Tools', score: 2, selected: false },
        { id: 'rh12', label: 'Aircraft Towing', score: 2, selected: false },
      ]
    },
    {
      title: 'Aircraft Technician Qualifications and Experience',
      icon: HardHat,
      items: [
        { id: 'at1', label: 'Aircraft technician, less than 6 months time in service with GFO', score: 1, selected: false },
        { id: 'at2', label: 'Aircraft technician, less than 6 months time in service with GFO assisting critical maintenance task', score: 2, selected: false },
        { id: 'at3', label: 'Aircraft technician, less than 2 years total experience, assisting/performing maintenance task', score: 2, selected: false },
        { id: 'at4', label: 'Aircraft technician, less than 6 months time in service on G500', score: 2, selected: false },
      ]
    },
  ]);

  // Calculate total score
  const calculateTotalScore = () => {
    let total = 0;
    gratSections.forEach(section => {
      section.items.forEach(item => {
        if (item.selected) {
          total += item.score;
        }
      });
    });
    return total;
  };

  const totalScore = calculateTotalScore();

  // Determine risk level based on score
  const getRiskLevel = (score: number) => {
    if (score >= 25) return { level: 'no-go', color: 'black', label: 'No-Go' };
    if (score >= 20) return { level: 'high', color: 'red', label: 'High Risk' };
    if (score >= 11) return { level: 'medium', color: 'yellow', label: 'Medium Risk' };
    return { level: 'low', color: 'green', label: 'Low Risk' };
  };

  const riskLevel = getRiskLevel(totalScore);
  const mitigationRequired = totalScore >= 20;

  // Toggle item selection
  const handleItemToggle = (sectionIndex: number, itemIndex: number) => {
    setGratSections(prev => {
      const newSections = [...prev];
      newSections[sectionIndex].items[itemIndex].selected = !newSections[sectionIndex].items[itemIndex].selected;
      return newSections;
    });
  };

  // Handle form submission
  const handleSubmit = (status: 'draft' | 'submitted') => {
    if (!taskDate || !startTime || !technicianName) {
      toast.error('Please fill in all required fields');
      return;
    }

    const flaggedItems = gratSections.flatMap(section =>
      section.items.filter(item => item.selected).map(item => item.label)
    );

    const submissionId = `GRAT_${Date.now()}`;

    let finalStatus: GRATSubmission['status'] = status === 'draft' ? 'Draft' : 'Pending';

    if (status === 'submitted') {
      if (totalScore >= 25) {
        toast.error('NO GO: Ground risk score is 25 or above. Task rejected automatically.');
        finalStatus = 'Rejected';
      } else if (totalScore >= 20) {
        if (!mitigationNotes.trim()) {
          toast.error('Required: Please provide Mitigation Strategies for scores 20-24.');
          return;
        }
        finalStatus = 'Requires Review';
        
        // Dispatched Notification
        eventStore.publish({
          id: `grat-review:${submissionId}`,
          severity: 'warn',
          title: 'Submitted GRAT needs approval',
          detail: `Task by ${technicianName} has a GRAT score of ${totalScore}. Approval required from Scheduling Manager and Director of Maintenance or Chief Inspector.`,
          module: 'Safety Systems',
          link: '/grat/review',
          audienceRoles: ['maintenance', 'safety', 'admin', 'lead'],
        });
      } else if (totalScore >= 11) {
        finalStatus = 'Requires Review';
      } else {
        finalStatus = 'Approved';
      }
    }

    const submission: GRATSubmission = {
      id: submissionId,
      technicianName,
      taskDate,
      startTime,
      status: finalStatus,
      totalScore,
      maxScore: 60, // Arbitrary max based on summing all if needed, but not critical
      riskLevel: riskLevel.level === 'low' ? 'Low' : riskLevel.level === 'medium' ? 'Medium' : 'High',
      submittedAt: new Date().toISOString(),
      mitigationNotes,
      additionalNotes,
      flaggedItems
    };

    const savedSubmissions = localStorage.getItem('grat_submissions');
    const existingSubmissions: GRATSubmission[] = savedSubmissions ? JSON.parse(savedSubmissions) : [];
    existingSubmissions.push(submission);
    localStorage.setItem('grat_submissions', JSON.stringify(existingSubmissions));

    if (finalStatus === 'Rejected') {
      toast.error('Task rejected and saved.');
      navigate('/maintenance-hub');
      return;
    }

    toast.success(`GRAT ${status === 'draft' ? 'saved as draft' : 'submitted successfully'}`);

    if (status === 'submitted') {
      navigate('/maintenance-hub');
    }
  };

  // Get section score
  const getSectionScore = (section: GRATSection) => {
    return section.items.reduce((sum, item) => item.selected ? sum + item.score : sum, 0);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wrench className="w-8 h-8" />
            Standalone GRAT
          </h1>
          <p className="text-sm text-muted-foreground">
            Ground Risk Assessment Tool - Gulfstream G650
          </p>
        </div>
        <div className="flex gap-2">
          {(userRole === 'safety' || userRole === 'admin') && (
            <>
              <Link to="/grat/form-builder">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Form Builder
                </Button>
              </Link>
              <Link to="/grat/form-fields">
                <Button variant="outline" size="sm">
                  <Sliders className="w-4 h-4 mr-2" />
                  Field Manager
                </Button>
              </Link>
            </>
          )}
          <Button variant="outline" onClick={() => navigate('/maintenance-hub')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Risk Score Card */}
      <Card className={`border-2 ${riskLevel.level === 'low' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
          riskLevel.level === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
            'border-red-500 bg-red-50 dark:bg-red-950'
        }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {riskLevel.level === 'low' && <CheckCircle className="w-6 h-6 text-green-600" />}
                {riskLevel.level === 'medium' && <AlertTriangle className="w-6 h-6 text-yellow-600" />}
                {riskLevel.level === 'high' && <AlertTriangle className="w-6 h-6 text-red-600" />}
                Current Risk Score: {totalScore}
              </CardTitle>
              <CardDescription>
                Risk Level: <span className={`font-semibold ${riskLevel.level === 'low' ? 'text-green-700 dark:text-green-400' :
                    riskLevel.level === 'medium' ? 'text-yellow-700 dark:text-yellow-400' :
                      'text-red-700 dark:text-red-400'
                  }`}>{riskLevel.label}</span>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${riskLevel.level === 'low' ? 'text-green-600' :
                  riskLevel.level === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                }`}>
                {totalScore}
              </div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            value={Math.min((totalScore / 30) * 100, 100)}
            className="h-3"
          />
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>0-10: Low Risk</span>
            <span>11-20: Medium Risk</span>
            <span>21+: High Risk</span>
          </div>
          {mitigationRequired && (
            <Alert className="mt-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <strong>Mitigation Required:</strong> This maintenance task exceeds low risk threshold. Please document mitigation strategies below before submitting.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Task Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Submission Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Technician</p>
                <p className="font-medium">{technicianName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{new Date(taskDate).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-medium">{startTime}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRAT Sections */}
      {gratSections.map((section, sectionIndex) => {
        const Icon = section.icon;
        const sectionScore = getSectionScore(section);
        const hasSelectedItems = section.items.some(item => item.selected);

        return (
          <Card key={sectionIndex} className={hasSelectedItems ? 'border-blue-500' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {section.title}
                </CardTitle>
                {sectionScore > 0 && (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    +{sectionScore} points
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={item.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${item.selected ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' : 'hover:bg-muted/50'
                      }`}
                  >
                    <Checkbox
                      id={item.id}
                      checked={item.selected}
                      onCheckedChange={() => handleItemToggle(sectionIndex, itemIndex)}
                      className="mt-1"
                    />
                    <div className="flex-1 flex items-center justify-between gap-4">
                      <Label
                        htmlFor={item.id}
                        className="cursor-pointer flex-1"
                      >
                        {item.label}
                      </Label>
                      <Badge
                        variant={item.selected ? "default" : "outline"}
                        className={item.score === 0 ? 'bg-gray-500' : ''}
                      >
                        {item.score === 0 ? '0' : `+${item.score}`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Mitigation Notes */}
      {mitigationRequired && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Mitigation Strategies
            </CardTitle>
            <CardDescription>
              Document how identified risks will be mitigated for this maintenance task (optional but recommended)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={mitigationNotes}
              onChange={(e) => setMitigationNotes(e.target.value)}
              placeholder="Describe specific mitigation strategies for the risks identified above. Include any additional safety briefings, equipment checks, personnel support, or other safety measures..."
              rows={6}
            />
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Additional Notes
          </CardTitle>
          <CardDescription>
            Add any additional information or comments here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Enter any additional notes or comments for this maintenance task..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end pb-8">
        <Button variant="outline" onClick={() => handleSubmit('draft')}>
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button onClick={() => handleSubmit('submitted')} className="bg-green-600 hover:bg-green-700">
          <Send className="w-4 h-4 mr-2" />
          Submit GRAT
        </Button>
      </div>
    </div>
  );
}