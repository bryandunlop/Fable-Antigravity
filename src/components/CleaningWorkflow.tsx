import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import {
  Sparkles,
  Plane,
  CheckCircle2,
  Clock,
  User,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Gauge,
  Armchair,
  Utensils,
  Droplet,
  Wind,
  ClipboardCheck,
  Camera,
  FileText,
  UserCheck,
  ShieldCheck,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Workflow stages
const WORKFLOW_STAGES = {
  INITIATED: 'Session Initiated',
  PRE_INSPECTION: 'Pre-Cleaning Inspection',
  COCKPIT: 'Cockpit Cleaning',
  CABIN: 'Cabin Cleaning',
  GALLEY: 'Galley Cleaning',
  LAVATORY: 'Lavatory Cleaning',
  EXTERIOR: 'Exterior Cleaning',
  QUALITY_REVIEW: 'Quality Review',
  FINAL_VERIFICATION: 'Final Verification',
  COMPLETED: 'Completed & Logged'
};

const SESSION_TYPES = {
  'quick-turn': { name: 'Quick Turn', duration: '30 min', zones: ['cockpit', 'cabin', 'galley', 'lavatory'] },
  'overnight': { name: 'Overnight Clean', duration: '2 hrs', zones: ['cockpit', 'cabin', 'galley', 'lavatory', 'exterior'] },
  'deep-clean': { name: 'Deep Clean', duration: '4 hrs', zones: ['cockpit', 'cabin', 'galley', 'lavatory', 'exterior'] },
  'detailing': { name: 'Full Detailing', duration: '8 hrs', zones: ['cockpit', 'cabin', 'galley', 'lavatory', 'exterior'] }
};

const CLEANING_ZONES = {
  cockpit: {
    name: 'Cockpit',
    icon: Gauge,
    color: 'blue',
    items: [
      { id: 'c1', name: 'Windscreen & Windows', required: true },
      { id: 'c2', name: 'Instrument Panel', required: true },
      { id: 'c3', name: 'Control Yokes', required: true },
      { id: 'c4', name: 'Center Pedestal', required: true },
      { id: 'c5', name: 'Pilot Seats', required: true },
      { id: 'c6', name: 'Floor & Carpet', required: true },
      { id: 'c7', name: 'Door Panels', required: false }
    ]
  },
  cabin: {
    name: 'Cabin',
    icon: Armchair,
    color: 'purple',
    items: [
      { id: 'cb1', name: 'Passenger Seats', required: true },
      { id: 'cb2', name: 'Seat Belts', required: true },
      { id: 'cb3', name: 'Cabin Windows', required: true },
      { id: 'cb4', name: 'Side Panels', required: true },
      { id: 'cb5', name: 'Cabin Floor & Carpet', required: true },
      { id: 'cb6', name: 'Overhead Bins', required: true },
      { id: 'cb7', name: 'Tables & Surfaces', required: true },
      { id: 'cb8', name: 'Entertainment Systems', required: false },
      { id: 'cb9', name: 'Window Shades', required: false }
    ]
  },
  galley: {
    name: 'Galley',
    icon: Utensils,
    color: 'green',
    items: [
      { id: 'g1', name: 'Countertops', required: true },
      { id: 'g2', name: 'Coffee Maker', required: true },
      { id: 'g3', name: 'Refrigerator', required: true },
      { id: 'g4', name: 'Microwave/Oven', required: true },
      { id: 'g5', name: 'Sink & Faucet', required: true },
      { id: 'g6', name: 'Trash Receptacles', required: true },
      { id: 'g7', name: 'Cabinets & Drawers', required: false },
      { id: 'g8', name: 'Floor & Mats', required: true }
    ]
  },
  lavatory: {
    name: 'Lavatory',
    icon: Droplet,
    color: 'cyan',
    items: [
      { id: 'l1', name: 'Toilet', required: true },
      { id: 'l2', name: 'Sink & Countertop', required: true },
      { id: 'l3', name: 'Mirror', required: true },
      { id: 'l4', name: 'Floor', required: true },
      { id: 'l5', name: 'Trash Receptacle', required: true },
      { id: 'l6', name: 'Replenish Supplies', required: true },
      { id: 'l7', name: 'Panels & Walls', required: false }
    ]
  },
  exterior: {
    name: 'Exterior',
    icon: Wind,
    color: 'gray',
    items: [
      { id: 'e1', name: 'Leading Edges', required: false },
      { id: 'e2', name: 'Fuselage Wash', required: false },
      { id: 'e3', name: 'Windows (External)', required: false },
      { id: 'e4', name: 'Landing Gear Doors', required: false },
      { id: 'e5', name: 'Entry Door', required: true }
    ]
  }
};

interface CleaningWorkflowData {
  id: string;
  tailNumber: string;
  sessionType: 'quick-turn' | 'overnight' | 'deep-clean' | 'detailing';
  currentStage: string;
  initiatedBy: string;
  initiatedAt: string;
  assignedCleaner?: string;
  preInspection?: {
    notes: string;
    photos: string[];
    completedAt: string;
    completedBy: string;
  };
  zoneCompletion: {
    [key: string]: {
      items: { [itemId: string]: { completed: boolean; completedAt?: string; notes?: string } };
      completedAt?: string;
      completedBy?: string;
    };
  };
  qualityReview?: {
    reviewedBy: string;
    reviewedAt: string;
    passed: boolean;
    issues?: string;
    photos?: string[];
  };
  finalVerification?: {
    verifiedBy: string;
    verifiedAt: string;
    approved: boolean;
    notes?: string;
  };
  completedAt?: string;
}

export default function CleaningWorkflow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentUser] = useState('John Smith'); // Would come from auth
  const [userRole] = useState('maintenance'); // Would come from auth
  const [workflow, setWorkflow] = useState<CleaningWorkflowData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [preInspectionNotes, setPreInspectionNotes] = useState('');
  const [assignedCleaner, setAssignedCleaner] = useState('');
  const [qualityReviewPassed, setQualityReviewPassed] = useState(true);
  const [qualityReviewIssues, setQualityReviewIssues] = useState('');
  const [verificationApproved, setVerificationApproved] = useState(true);
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    // Mock data - would fetch from API
    setTimeout(() => {
      const mockWorkflow: CleaningWorkflowData = {
        id: id || '1',
        tailNumber: 'N650GX',
        sessionType: 'overnight',
        currentStage: WORKFLOW_STAGES.INITIATED,
        initiatedBy: 'Sarah Johnson',
        initiatedAt: new Date().toISOString(),
        zoneCompletion: {}
      };
      setWorkflow(mockWorkflow);
      setLoading(false);
    }, 500);
  }, [id]);

  const stages = Object.values(WORKFLOW_STAGES);
  const currentStageIndex = workflow ? stages.indexOf(workflow.currentStage) : 0;

  const getStageColor = (stageIndex: number): string => {
    if (stageIndex < currentStageIndex) return 'bg-green-100 text-green-800 border-green-300';
    if (stageIndex === currentStageIndex) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-600 border-gray-300';
  };

  const getStageIcon = (stageIndex: number) => {
    if (stageIndex < currentStageIndex) return <CheckCircle className="w-4 h-4" />;
    if (stageIndex === currentStageIndex) return <Clock className="w-4 h-4" />;
    return <div className="w-4 h-4 rounded-full border-2 border-current" />;
  };

  const handleAssignCleaner = () => {
    if (!assignedCleaner.trim()) {
      toast.error('Please enter cleaner name');
      return;
    }
    
    setWorkflow(prev => prev ? {
      ...prev,
      assignedCleaner,
      currentStage: WORKFLOW_STAGES.PRE_INSPECTION
    } : null);
    
    toast.success('Cleaner assigned successfully');
  };

  const handlePreInspectionComplete = () => {
    if (!preInspectionNotes.trim()) {
      toast.error('Please add inspection notes');
      return;
    }

    setWorkflow(prev => prev ? {
      ...prev,
      preInspection: {
        notes: preInspectionNotes,
        photos: [],
        completedAt: new Date().toISOString(),
        completedBy: currentUser
      },
      currentStage: WORKFLOW_STAGES.COCKPIT
    } : null);

    toast.success('Pre-inspection completed');
  };

  const handleZoneItemToggle = (zone: string, itemId: string, checked: boolean) => {
    setWorkflow(prev => {
      if (!prev) return null;

      const zoneData = prev.zoneCompletion[zone] || { items: {} };
      
      return {
        ...prev,
        zoneCompletion: {
          ...prev.zoneCompletion,
          [zone]: {
            ...zoneData,
            items: {
              ...zoneData.items,
              [itemId]: {
                completed: checked,
                completedAt: checked ? new Date().toISOString() : undefined
              }
            }
          }
        }
      };
    });
  };

  const handleZoneComplete = (zone: string) => {
    const zoneData = workflow?.zoneCompletion[zone];
    const zoneConfig = CLEANING_ZONES[zone as keyof typeof CLEANING_ZONES];
    const requiredItems = zoneConfig.items.filter(item => item.required);
    const completedRequired = requiredItems.filter(item => 
      zoneData?.items[item.id]?.completed
    );

    if (completedRequired.length < requiredItems.length) {
      toast.error('Please complete all required items before proceeding');
      return;
    }

    // Determine next stage
    const zones = SESSION_TYPES[workflow?.sessionType || 'quick-turn'].zones;
    const currentZoneIndex = zones.indexOf(zone);
    const nextZone = zones[currentZoneIndex + 1];
    
    const stageMap: { [key: string]: string } = {
      cockpit: WORKFLOW_STAGES.COCKPIT,
      cabin: WORKFLOW_STAGES.CABIN,
      galley: WORKFLOW_STAGES.GALLEY,
      lavatory: WORKFLOW_STAGES.LAVATORY,
      exterior: WORKFLOW_STAGES.EXTERIOR
    };

    const nextStage = nextZone ? stageMap[nextZone] : WORKFLOW_STAGES.QUALITY_REVIEW;

    setWorkflow(prev => prev ? {
      ...prev,
      zoneCompletion: {
        ...prev.zoneCompletion,
        [zone]: {
          ...prev.zoneCompletion[zone],
          completedAt: new Date().toISOString(),
          completedBy: currentUser
        }
      },
      currentStage: nextStage
    } : null);

    toast.success(`${zoneConfig.name} cleaning completed`);
  };

  const handleQualityReview = () => {
    if (!qualityReviewPassed && !qualityReviewIssues.trim()) {
      toast.error('Please describe the issues found');
      return;
    }

    if (!qualityReviewPassed) {
      // Return to first zone for rework
      const zones = SESSION_TYPES[workflow?.sessionType || 'quick-turn'].zones;
      const stageMap: { [key: string]: string } = {
        cockpit: WORKFLOW_STAGES.COCKPIT,
        cabin: WORKFLOW_STAGES.CABIN,
        galley: WORKFLOW_STAGES.GALLEY,
        lavatory: WORKFLOW_STAGES.LAVATORY,
        exterior: WORKFLOW_STAGES.EXTERIOR
      };

      setWorkflow(prev => prev ? {
        ...prev,
        currentStage: stageMap[zones[0]]
      } : null);

      toast.warning('Returned for rework');
      return;
    }

    setWorkflow(prev => prev ? {
      ...prev,
      qualityReview: {
        reviewedBy: currentUser,
        reviewedAt: new Date().toISOString(),
        passed: qualityReviewPassed,
        issues: qualityReviewIssues || undefined
      },
      currentStage: WORKFLOW_STAGES.FINAL_VERIFICATION
    } : null);

    toast.success('Quality review completed');
  };

  const handleFinalVerification = () => {
    if (!verificationApproved) {
      toast.error('Cannot complete workflow without approval');
      return;
    }

    setWorkflow(prev => prev ? {
      ...prev,
      finalVerification: {
        verifiedBy: currentUser,
        verifiedAt: new Date().toISOString(),
        approved: verificationApproved,
        notes: verificationNotes || undefined
      },
      currentStage: WORKFLOW_STAGES.COMPLETED,
      completedAt: new Date().toISOString()
    } : null);

    toast.success('Cleaning workflow completed!');
  };

  const calculateProgress = (): number => {
    if (!workflow) return 0;
    return Math.round((currentStageIndex / (stages.length - 1)) * 100);
  };

  const getZoneProgress = (zone: string): { completed: number; total: number; percentage: number } => {
    const zoneConfig = CLEANING_ZONES[zone as keyof typeof CLEANING_ZONES];
    const zoneData = workflow?.zoneCompletion[zone];
    
    const totalItems = zoneConfig.items.length;
    const completedItems = zoneConfig.items.filter(item => 
      zoneData?.items[item.id]?.completed
    ).length;

    return {
      completed: completedItems,
      total: totalItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Sparkles className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Loading cleaning workflow...</p>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="p-8">
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Cleaning workflow not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentStage = workflow.currentStage;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/aircraft-cleaning')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-blue-500" />
                Cleaning Workflow: {workflow.tailNumber}
              </h1>
              <p className="text-muted-foreground mt-1">
                {SESSION_TYPES[workflow.sessionType].name} • Started by {workflow.initiatedBy}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            WF-{workflow.id}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Workflow Stages Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3">
                  <Badge className={`${getStageColor(index)} px-3 py-1 flex items-center gap-2`}>
                    {getStageIcon(index)}
                    <span>{stage}</span>
                  </Badge>
                  {index < currentStageIndex && (
                    <span className="text-xs text-muted-foreground">
                      ✓ Completed
                    </span>
                  )}
                  {index === currentStageIndex && (
                    <span className="text-xs text-blue-600 font-medium">
                      ← Current Stage
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stage 1: Session Initiated */}
        {currentStage === WORKFLOW_STAGES.INITIATED && (
          <Card className="border-2 border-blue-500 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Step 1: Assign Cleaner
              </CardTitle>
              <CardDescription>
                Assign a crew member to perform the cleaning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Assigned Cleaner Name</Label>
                <Input
                  placeholder="Enter cleaner name"
                  value={assignedCleaner}
                  onChange={(e) => setAssignedCleaner(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleAssignCleaner} className="w-full">
                Assign & Continue to Pre-Inspection
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stage 2: Pre-Inspection */}
        {currentStageIndex >= stages.indexOf(WORKFLOW_STAGES.PRE_INSPECTION) && (
          <Card className={currentStage === WORKFLOW_STAGES.PRE_INSPECTION ? 'border-2 border-blue-500 shadow-lg' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Step 2: Pre-Cleaning Inspection
              </CardTitle>
              <CardDescription>
                Document initial aircraft condition before cleaning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflow.preInspection ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Completed by {workflow.preInspection.completedBy}</span>
                    <span className="text-muted-foreground">
                      {new Date(workflow.preInspection.completedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Inspection Notes:</p>
                    <p className="text-sm text-muted-foreground">{workflow.preInspection.notes}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Initial Condition Notes</Label>
                    <Textarea
                      placeholder="Document any existing issues, damage, or special attention areas..."
                      value={preInspectionNotes}
                      onChange={(e) => setPreInspectionNotes(e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <Alert>
                    <Camera className="w-4 h-4" />
                    <AlertDescription>
                      In production: Upload photos of pre-cleaning condition
                    </AlertDescription>
                  </Alert>
                  {currentStage === WORKFLOW_STAGES.PRE_INSPECTION && (
                    <Button onClick={handlePreInspectionComplete} className="w-full">
                      Complete Pre-Inspection
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cleaning Zones */}
        {SESSION_TYPES[workflow.sessionType].zones.map((zoneKey) => {
          const zone = CLEANING_ZONES[zoneKey as keyof typeof CLEANING_ZONES];
          const ZoneIcon = zone.icon;
          const stageMap: { [key: string]: string } = {
            cockpit: WORKFLOW_STAGES.COCKPIT,
            cabin: WORKFLOW_STAGES.CABIN,
            galley: WORKFLOW_STAGES.GALLEY,
            lavatory: WORKFLOW_STAGES.LAVATORY,
            exterior: WORKFLOW_STAGES.EXTERIOR
          };
          const zoneStage = stageMap[zoneKey];
          const zoneStageIndex = stages.indexOf(zoneStage);
          const isActiveStage = currentStage === zoneStage;
          const isCompleted = currentStageIndex > zoneStageIndex;
          const progress = getZoneProgress(zoneKey);

          if (currentStageIndex < zoneStageIndex) return null;

          return (
            <Card key={zoneKey} className={isActiveStage ? 'border-2 border-blue-500 shadow-lg' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ZoneIcon className={`w-5 h-5 text-${zone.color}-600`} />
                    {zone.name} Cleaning
                  </div>
                  <Badge variant={isCompleted ? 'default' : 'outline'} className="bg-gray-100">
                    {progress.completed}/{progress.total} Items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress.percentage} className="h-2" />
                
                <div className="grid gap-3">
                  {zone.items.map((item) => {
                    const isChecked = workflow.zoneCompletion[zoneKey]?.items[item.id]?.completed || false;
                    
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleZoneItemToggle(zoneKey, item.id, checked as boolean)}
                          disabled={!isActiveStage}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {item.required && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isChecked && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {isActiveStage && (
                  <Button onClick={() => handleZoneComplete(zoneKey)} className="w-full">
                    Complete {zone.name} Cleaning
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {isCompleted && workflow.zoneCompletion[zoneKey]?.completedAt && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      Completed by {workflow.zoneCompletion[zoneKey].completedBy} at{' '}
                      {new Date(workflow.zoneCompletion[zoneKey].completedAt!).toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Quality Review */}
        {currentStageIndex >= stages.indexOf(WORKFLOW_STAGES.QUALITY_REVIEW) && (
          <Card className={currentStage === WORKFLOW_STAGES.QUALITY_REVIEW ? 'border-2 border-blue-500 shadow-lg' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-600" />
                Quality Review
              </CardTitle>
              <CardDescription>
                Supervisor inspection of completed cleaning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflow.qualityReview ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {workflow.qualityReview.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {workflow.qualityReview.passed ? 'Passed' : 'Failed - Returned for Rework'}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Reviewed by {workflow.qualityReview.reviewedBy} at{' '}
                    {new Date(workflow.qualityReview.reviewedAt).toLocaleString()}
                  </div>
                  {workflow.qualityReview.issues && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">Issues Found:</p>
                      <p className="text-sm text-red-700">{workflow.qualityReview.issues}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <Checkbox
                      checked={qualityReviewPassed}
                      onCheckedChange={(checked) => setQualityReviewPassed(checked as boolean)}
                    />
                    <Label>All cleaning standards met</Label>
                  </div>
                  {!qualityReviewPassed && (
                    <div>
                      <Label>Issues Found (Required if not passed)</Label>
                      <Textarea
                        placeholder="Describe issues that need to be corrected..."
                        value={qualityReviewIssues}
                        onChange={(e) => setQualityReviewIssues(e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  )}
                  {currentStage === WORKFLOW_STAGES.QUALITY_REVIEW && (
                    <Button onClick={handleQualityReview} className="w-full">
                      {qualityReviewPassed ? 'Approve & Continue' : 'Return for Rework'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Final Verification */}
        {currentStageIndex >= stages.indexOf(WORKFLOW_STAGES.FINAL_VERIFICATION) && (
          <Card className={currentStage === WORKFLOW_STAGES.FINAL_VERIFICATION ? 'border-2 border-blue-500 shadow-lg' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                Final Verification
              </CardTitle>
              <CardDescription>
                Final sign-off and approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflow.finalVerification ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Approved & Completed</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Verified by {workflow.finalVerification.verifiedBy} at{' '}
                    {new Date(workflow.finalVerification.verifiedAt).toLocaleString()}
                  </div>
                  {workflow.finalVerification.notes && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">{workflow.finalVerification.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <Checkbox
                      checked={verificationApproved}
                      onCheckedChange={(checked) => setVerificationApproved(checked as boolean)}
                    />
                    <Label>Aircraft is clean and ready for service</Label>
                  </div>
                  <div>
                    <Label>Additional Notes (Optional)</Label>
                    <Textarea
                      placeholder="Any additional comments or observations..."
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  {currentStage === WORKFLOW_STAGES.FINAL_VERIFICATION && (
                    <Button 
                      onClick={handleFinalVerification} 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={!verificationApproved}
                    >
                      Complete Workflow
                      <CheckCircle className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Completed */}
        {currentStage === WORKFLOW_STAGES.COMPLETED && (
          <Card className="border-2 border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-green-100 rounded-full">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-800">Cleaning Workflow Completed!</h3>
                  <p className="text-green-700 mt-2">
                    {workflow.tailNumber} is clean and ready for service
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Completed at {workflow.completedAt ? new Date(workflow.completedAt).toLocaleString() : ''}
                  </p>
                </div>
                <Button onClick={() => navigate('/aircraft-cleaning')} variant="outline" className="mt-4">
                  Return to Cleaning Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}