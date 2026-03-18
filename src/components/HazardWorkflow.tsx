import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  Save,
  Mail,
  Clock,
  FileText,
  Target,
  PlayCircle,
  PauseCircle,
  Plus,
  Trash2,
  Users,
  User,
  Paperclip,
  ChevronRight,
  MapPin,
  Calendar,
  AlertCircle,
  Eye,
  Microscope,
  UserCog,
  ShieldCheck,
  ClipboardCheck,
  Rocket,
  BookOpen,
  Activity,
  Upload,
  X,
  File,
  ThumbsUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useHazards, WORKFLOW_STAGES } from '../contexts/HazardContext';
import { useNotificationContext } from './contexts/NotificationContext';
import ProgressTracker, { PHASES } from './HazardWorkflow/ProgressTracker';
import { SYSTEM_USERS } from '../lib/mockUsers';



export default function HazardWorkflow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const onClose = () => navigate('/safety/manager-dashboard');
  const { getHazardById, updateHazard } = useHazards();
  const hazard = id ? getHazardById(id) : null;

  // -- State --
  const [currentStage, setCurrentStage] = useState(WORKFLOW_STAGES.SM_INVESTIGATION);

  // Wizard Visibility States
  const [showRiskWizard, setShowRiskWizard] = useState(false);
  const [showRCAWizard, setShowRCAWizard] = useState(false);
  const [activeAssignmentType, setActiveAssignmentType] = useState<'processOwner' | 'approver' | null>(null);
  const [showBulletinDialog, setShowBulletinDialog] = useState(false); // Bulletin Feature
  
  // Data Sharing Toggles for Assignment
  const [includeDescription, setIncludeDescription] = useState(true);
  const [includeRisk, setIncludeRisk] = useState(false);
  const [includeRCA, setIncludeRCA] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);

  // Data States (Risk, RCA, PACE)
  const [riskSeverity, setRiskSeverity] = useState(3);
  const [riskLikelihood, setRiskLikelihood] = useState(3);
  const [whyAnalysis, setWhyAnalysis] = useState(['', '', '', '', '']);
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]); // New state for uploads
  const [consolidatedPlan, setConsolidatedPlan] = useState('');
  const [sharedReportSummary, setSharedReportSummary] = useState(''); // De-identified summary for PACE team



  // Updated State Definition to match Hazard Interface
  // Updated State Definition to match Hazard Interface
  const [paceAssignments, setPaceAssignments] = useState({
    processOwner: [] as Array<{ id: string | number, type: string, value: string, customName: string, customEmail: string, customMessage: string, status: 'pending' | 'submitted', response: string }>,
    approver: [] as Array<{ id: string | number, type: string, value: string, customName: string, customEmail: string, customMessage: string, status: 'pending' | 'approved' | 'rejected' }>,
    contributors: [] as Array<{ id: string | number, type: string, value: string, customName: string, customEmail: string, customMessage?: string, status?: string }>,
    executers: [] as Array<{ id: string | number, type: string, value: string, customName: string, customEmail: string, customMessage?: string, status?: string }>
  });

  // Final Report / Closure Dialog State
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [closureReport, setClosureReport] = useState('');

  // Generate draft on open
  useEffect(() => {
    if (showClosureDialog && !closureReport) {
      const draft = `
# Final Hazard Report: ${hazard?.id || 'Ref'}
**Status:** Closed | **Date:** ${new Date().toLocaleDateString()}

## 1. Incident Overview
**Title:** ${hazard?.title}
**Reported Date:** ${hazard?.reportedDate}
**Location:** ${hazard?.location}
**Severity (Initial):** ${hazard?.severity}

**Description:**
${hazard?.description}

---

## 2. Risk Assessment
**Pre-Mitigation Risk Score:** ${riskSeverity + riskLikelihood} (${riskLikelihood} Likelihood + ${riskSeverity} Severity)

---

## 3. Investigation Findings (Root Cause)
**Root Cause (5 Whys):**
${whyAnalysis[4] || whyAnalysis[3] || 'Analysis incomplete'}

**Investigation Notes:**
${investigationNotes || 'No additional notes recorded.'}

---

## 4. Corrective Action Plan
**Process Owner:** ${paceAssignments.processOwner.map(p => p.customName).join(', ') || 'N/A'}

**Mitigation Plan:**
${paceAssignments.processOwner.map(p => p.response).filter(Boolean).join('\n---\n') || 'No mitigation recorded.'}

**Effectiveness Review:**
The mitigation has been implemented and verified for effectiveness over the monitoring period. The risk is now considered ALARP (As Low As Reasonably Practicable).

---
*Generated by Safety Management System*
      `;
      setClosureReport(draft.trim());
    }
  }, [showClosureDialog, closureReport, hazard, riskSeverity, riskLikelihood, whyAnalysis, investigationNotes, paceAssignments]);

  const handleFinalClosure = () => {
    advanceStage();
    setShowClosureDialog(false);
  };

  // Hydrate state
  useEffect(() => {
    if (hazard) {
      setCurrentStage(hazard.workflowStage || WORKFLOW_STAGES.SM_INVESTIGATION);
      if (hazard.riskAnalysis) {
        setRiskSeverity(hazard.riskAnalysis.severity);
        setRiskLikelihood(hazard.riskAnalysis.likelihood);
      }
      if (hazard.whyAnalysis && hazard.whyAnalysis.length > 0) setWhyAnalysis(hazard.whyAnalysis);
      if (hazard.whyAnalysis && hazard.whyAnalysis.length > 0) setWhyAnalysis(hazard.whyAnalysis);
      if (hazard.investigationNotes) setInvestigationNotes(hazard.investigationNotes);
      if (hazard.attachments) setAttachments(hazard.attachments.map(a => ({ name: a.name, size: a.size, type: a.type } as File))); // Mock File object reconstruction

      if (hazard.paceAssignments) {
        setPaceAssignments({
          processOwner: Array.isArray(hazard.paceAssignments.processOwner) ? hazard.paceAssignments.processOwner.map(p => ({
            id: p.id || Date.now(),
            type: p.type || 'user',
            value: p.value || '',
            customName: p.customName || '',
            customEmail: p.customEmail || '',
            customMessage: p.customMessage || '',
            status: p.status || 'pending',
            response: p.response || ''
          })) : [],
          approver: Array.isArray(hazard.paceAssignments.approver) ? hazard.paceAssignments.approver.map(a => ({
            id: a.id || Date.now(),
            type: a.type || 'user',
            value: a.value || '',
            customName: a.customName || '',
            customEmail: a.customEmail || '',
            customMessage: a.customMessage || '',
            status: a.status || 'pending'
          })) : [],
          contributors: (hazard.paceAssignments.contributors || []).map(c => ({
            id: c.id || Date.now(),
            type: c.type || 'user',
            value: c.value || '',
            customName: c.customName || '',
            customEmail: c.customEmail || '',
            customMessage: c.customMessage || '',
            status: c.status || 'pending'
          })),
          executers: (hazard.paceAssignments.executers || []).map(e => ({
            id: e.id || Date.now(),
            type: e.type || 'user',
            value: e.value || '',
            customName: e.customName || '',
            customEmail: e.customEmail || '',
            customMessage: e.customMessage || '',
            status: e.status || 'pending'
          }))
        });
      }
    }
  }, [hazard]);

  // Sample Data Injection for Collection Phase Demo
  useEffect(() => {
    if (currentStage === WORKFLOW_STAGES.MITIGATION_DEVELOPMENT && paceAssignments.processOwner.some(p => p.status === 'submitted')) {
      // Logic for "Review Proposal" button 
    } else {
      // Logic for simulate response
    }
  }, [currentStage]);

  if (!hazard) return <div className="p-8 text-center">Hazard not found</div>;



  // -- Wizard Components (Internal for simplicity) --

  const RiskWizard = () => {
    // Reference Data for the GFO Matrix
    const likelihoods = [
      { score: 0, label: '0 Rarely', def: '(Unknown to occur, but possible in the industry)' },
      { score: 1, label: '1 Unlikely', def: '(Rare, but known to occur in the aviation industry)' },
      { score: 2, label: '2 Possibly', def: '(Might happen once or twice at GFO)' },
      { score: 3, label: '3 Likely', def: '(Might occur 1-2 times per year at GFO)' },
      { score: 4, label: '4 Almost Always', def: '(Event may occur several times per year at GFO)' },
    ];

    const severities = [
      { score: 1, label: '1 Negligible' },
      { score: 2, label: '2 Minor' },
      { score: 3, label: '3 Moderate' },
      { score: 4, label: '4 Major' },
      { score: 5, label: '5 Catastrophic' },
    ];

    const severityRows = [
      { name: 'People', texts: ['Almost No Injury', 'Minor Injury', 'Serious Injury', 'Single Fatality', 'Multiple Fatalities'] },
      { name: 'Assets', texts: ['< $1K', '< $25K', '< $250K', '< $1M', '> $1M'] },
      { name: 'Environment', texts: ['Almost No Effect', 'Minor Effect', 'Moderate Effect', 'Significant Effect', 'Massive Effect'] },
      { name: 'Reputation', texts: ['Almost No Impact', 'Local Impact', 'Industry Impact', 'National Impact', 'Global Impact'] },
    ];

    const getScoreColor = (score: number) => {
      if (score <= 3) return 'bg-[#92D050]'; // Low
      if (score <= 5) return 'bg-[#FFFF00]'; // Medium
      if (score === 6) return 'bg-[#FFC000]'; // High
      return 'bg-[#FF0000] text-white'; // Very High
    };

    return (
      <Dialog open={showRiskWizard} onOpenChange={setShowRiskWizard}>
        <DialogContent className="max-w-[98vw] w-full min-h-[50vh] max-h-[96vh] overflow-y-auto p-4">
          <DialogHeader className="pb-2">
            <DialogTitle>GFO Risk Assessment Matrix</DialogTitle>
            <DialogDescription>Select the intersecting cell. (Landscape View)</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row gap-4 h-full">

            {/* Main Matrix Table - Takes up majority of space */}
            <div className="flex-1 border border-black overflow-hidden select-none text-xs">

              {/* 1. SEVERITY HEADER SECTION */}
              <div className="flex">
                <div className="w-6 shrink-0 border-b border-r border-black bg-white"></div>
                <div className="w-52 shrink-0 border-b border-r border-black bg-white"></div>
                {severities.map(s => (
                  <div key={s.score} className="flex-1 border-b border-r border-black bg-gray-100 p-1 text-center font-bold">
                    <div className="text-sm">{s.score}</div>
                    <div className="text-[10px] uppercase">{s.label.split(' ')[1]}</div>
                  </div>
                ))}
              </div>

              {/* 2. SEVERITY DEFINITION ROWS */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-white border-r border-black flex items-center justify-center z-10">
                  <span className="-rotate-90 text-sm font-bold tracking-widest text-gray-800">Severity</span>
                </div>
                <div className="pl-6">
                  {severityRows.map((row) => (
                    <div key={row.name} className="flex border-b border-black h-10">
                      <div className="w-52 shrink-0 p-1 border-r border-black font-bold text-xs flex items-center justify-center bg-white">
                        {row.name}
                      </div>
                      {row.texts.map((text, i) => (
                        <div key={i} className="flex-1 p-1 border-r border-black text-[10px] text-center flex items-center justify-center bg-white hover:bg-gray-50 leading-tight">
                          {text}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. LIKELIHOOD SECTION */}
              <div className="flex relative border-t-2 border-black">
                <div className="w-6 shrink-0 bg-white border-r border-black flex items-center justify-center">
                  <span className="-rotate-90 text-sm font-bold tracking-widest text-gray-800">Likelihood</span>
                </div>

                <div className="flex-1">
                  {likelihoods.map((l) => (
                    <div key={l.score} className="flex border-b border-black h-16">
                      <div className="w-20 shrink-0 bg-gray-200 p-1 border-r border-black flex flex-col justify-center text-center">
                        <span className="font-bold text-sm">{l.score}</span>
                        <span className="text-[10px] font-bold">{l.label.split(' ')[1]}</span>
                      </div>
                      <div className="w-32 shrink-0 p-1 bg-white border-r border-black text-[9px] italic flex items-center justify-center text-center leading-tight">
                        {l.def}
                      </div>

                      {severities.map(s => {
                        const score = l.score + s.score;
                        const isSelected = riskSeverity === s.score && riskLikelihood === l.score;
                        return (
                          <div
                            key={`${l.score}-${s.score}`}
                            className={`flex-1 border-r border-black flex items-center justify-center text-xl font-bold cursor-pointer transition-all ${getScoreColor(score)}
                                          ${isSelected ? 'ring-4 ring-blue-600 ring-inset z-20 shadow-xl' : 'hover:opacity-80'}
                                        `}
                            onClick={() => { setRiskSeverity(s.score); setRiskLikelihood(l.score); }}
                          >
                            {score}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar: Legend and Analysis (Moved to side for landscape) */}
            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
              <div className="bg-gray-50 p-4 rounded border">
                <h3 className="font-bold text-base mb-2 underline">Scoring Legend</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-bold min-w-[20px]">1-3</span>
                    <div>
                      <span className="font-bold text-green-700 block">Low (Acceptable)</span>
                      <span className="text-gray-600 text-[10px]">Maintain vigilance.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold min-w-[20px]">4-5</span>
                    <div>
                      <span className="font-bold text-yellow-700 block">Medium (Acceptable)</span>
                      <span className="text-gray-600 text-[10px]">Management/Safety Officer mitigate.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold min-w-[20px]">6</span>
                    <div>
                      <span className="font-bold text-orange-700 block">High (Undesirable)</span>
                      <span className="text-gray-600 text-[10px]">Mgmt decision required.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold min-w-[20px]">7-9</span>
                    <div>
                      <span className="font-bold text-red-700 block">Very High (Unacceptable)</span>
                      <span className="text-gray-600 text-[10px]">Operation cannot continue.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded border flex-1">
                <h3 className="font-bold text-sm mb-2">Current Selection</h3>
                <div className="text-center py-4">
                  <div className={`text-4xl font-bold mb-2 ${(riskSeverity + riskLikelihood) >= 7 ? 'text-red-700' :
                    (riskSeverity + riskLikelihood) >= 6 ? 'text-orange-600' :
                      (riskSeverity + riskLikelihood) >= 4 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                    {riskSeverity + riskLikelihood}
                  </div>
                  <div className="text-xs font-semibold">
                    Likelihood: {riskLikelihood} + Severity: {riskSeverity}
                  </div>
                </div>
                <Button className="w-full" onClick={() => setShowRiskWizard(false)}>Confirm</Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const BulletinDialog = () => {
    const [subject, setSubject] = useState(hazard?.title || '');
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState('form');
    const [isUrgent, setIsUrgent] = useState(false);

    // Structured form fields
    const [bulletinSummary, setBulletinSummary] = useState('');
    const [whatHappened, setWhatHappened] = useState('');
    const [riskLevel, setRiskLevel] = useState('Medium');
    const [correctiveActions, setCorrectiveActions] = useState('');
    const [recommendations, setRecommendations] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');

    // Auto-populate from hazard data
    useEffect(() => {
      if (showBulletinDialog && hazard) {
        setSubject(hazard.title || '');
        setBulletinSummary(`A hazard event was identified at ${hazard.location || 'an operational area'} on ${hazard.reportedDate || 'a recent date'}.`);
        setWhatHappened(hazard.description || '');
        setRiskLevel(hazard.severity || 'Medium');
        setCorrectiveActions(hazard.immediateActions || '');
      }
    }, [showBulletinDialog]);

    const handlePublish = () => {
      toast.promise(new Promise(resolve => setTimeout(resolve, 1000)), {
        loading: isUrgent ? 'Sending Urgent Bulletin...' : 'Publishing Bulletin...',
        success: isUrgent ? 'Urgent bulletin sent successfully!' : 'Bulletin published successfully!',
        error: 'Failed to publish'
      });
      setShowBulletinDialog(false);
    };

    const getRiskBadgeColor = (level: string) => {
      switch (level.toLowerCase()) {
        case 'critical': return 'bg-red-600 text-white';
        case 'high': return 'bg-red-100 text-red-800 border-red-300';
        case 'medium': return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'low': return 'bg-green-100 text-green-800 border-green-300';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const isFormComplete = subject && bulletinSummary && whatHappened && correctiveActions && selectedGroups.length > 0;

    return (
      <Dialog open={showBulletinDialog} onOpenChange={setShowBulletinDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isUrgent ? (
                <><AlertTriangle className="w-5 h-5 text-orange-600" /> Send Urgent Safety Bulletin</>
              ) : (
                <><Target className="w-5 h-5 text-red-600" /> Publish Safety Bulletin</>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete the sections below. All fields marked with * are required. The preview tab shows exactly what recipients will see.
            </DialogDescription>
          </DialogHeader>

          {/* Urgent Toggle */}
          <div className="flex items-center gap-3 py-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer border transition-all text-sm font-medium ${isUrgent
                  ? 'bg-orange-100 border-orange-300 text-orange-800'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              onClick={() => setIsUrgent(!isUrgent)}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${isUrgent ? 'text-orange-600' : 'text-gray-400'}`} />
              {isUrgent ? 'Urgent — Immediate attention' : 'Mark as Urgent'}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Fill Out Bulletin</TabsTrigger>
              <TabsTrigger value="preview">Preview Final Bulletin</TabsTrigger>
            </TabsList>

            {/* FORM TAB */}
            <TabsContent value="form" className="space-y-5 mt-4">

              {/* Subject & Recipients Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Subject Line *</Label>
                  <Input
                    value={isUrgent ? (subject.startsWith('URGENT:') ? subject : `URGENT: ${subject}`) : subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief title for the bulletin"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Recipients *</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {['R&I Team', 'Document Compliance', 'All Pilots', 'Maintenance Team', 'Ground Ops', 'Flight Attendants'].map(group => (
                      <Badge
                        key={group}
                        variant={selectedGroups.includes(group) ? 'default' : 'outline'}
                        className="cursor-pointer select-none hover:bg-gray-200 text-xs"
                        onClick={() => setSelectedGroups(prev =>
                          prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
                        )}
                      >
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. Hazard Summary */}
              <div className="space-y-1.5 p-4 bg-slate-50 rounded-lg border">
                <Label className="font-semibold text-slate-900">1. Hazard Summary *</Label>
                <p className="text-xs text-muted-foreground">Provide a brief, de-identified overview of the hazard event.</p>
                <Textarea
                  value={bulletinSummary}
                  onChange={e => setBulletinSummary(e.target.value)}
                  placeholder="A brief summary of what occurred, when, and where..."
                  className="min-h-[60px] bg-white"
                />
              </div>

              {/* 2. What Happened */}
              <div className="space-y-1.5 p-4 bg-slate-50 rounded-lg border">
                <Label className="font-semibold text-slate-900">2. Description of Event *</Label>
                <p className="text-xs text-muted-foreground">Describe the event in detail. Remove any identifying information about personnel.</p>
                <Textarea
                  value={whatHappened}
                  onChange={e => setWhatHappened(e.target.value)}
                  placeholder="Detail what happened, the sequence of events, and contributing factors..."
                  className="min-h-[100px] bg-white"
                />
              </div>

              {/* 3. Risk / Severity */}
              <div className="space-y-1.5 p-4 bg-slate-50 rounded-lg border">
                <Label className="font-semibold text-slate-900">3. Risk / Severity Level</Label>
                <div className="flex gap-2 mt-1">
                  {['Low', 'Medium', 'High', 'Critical'].map(level => (
                    <Badge
                      key={level}
                      variant="outline"
                      className={`cursor-pointer px-3 py-1 text-sm ${riskLevel === level ? getRiskBadgeColor(level) + ' ring-2 ring-offset-1 ring-gray-400' : 'hover:bg-gray-100'}`}
                      onClick={() => setRiskLevel(level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 4. Corrective Actions */}
              <div className="space-y-1.5 p-4 bg-green-50 rounded-lg border border-green-200">
                <Label className="font-semibold text-green-900">4. Corrective Actions & Mitigations *</Label>
                <p className="text-xs text-green-700">What has been done or will be done to resolve this hazard?</p>
                <Textarea
                  value={correctiveActions}
                  onChange={e => setCorrectiveActions(e.target.value)}
                  placeholder="List corrective actions taken and planned mitigations..."
                  className="min-h-[80px] bg-white border-green-200"
                />
              </div>

              {/* 5. Recommendations */}
              <div className="space-y-1.5 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="font-semibold text-blue-900">5. Recommendations & Precautions</Label>
                <p className="text-xs text-blue-700">What should personnel be aware of or do differently?</p>
                <Textarea
                  value={recommendations}
                  onChange={e => setRecommendations(e.target.value)}
                  placeholder="Precautions to take, procedures to review, awareness reminders..."
                  className="min-h-[60px] bg-white border-blue-200"
                />
              </div>

              {/* 6. Additional Notes */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">6. Additional Notes (Optional)</Label>
                <Textarea
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="Any other relevant information, references, or follow-up instructions..."
                  className="min-h-[50px]"
                />
              </div>
            </TabsContent>

            {/* PREVIEW TAB */}
            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg shadow-sm overflow-hidden">
                {/* Header */}
                <div className={`${isUrgent ? 'bg-orange-50 border-b border-orange-200' : 'bg-red-50 border-b border-red-200'} p-5`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 ${isUrgent ? 'bg-orange-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                      <AlertTriangle className={`w-6 h-6 ${isUrgent ? 'text-orange-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg ${isUrgent ? 'text-orange-900' : 'text-red-900'}`}>
                        {isUrgent ? '⚠ URGENT Safety Bulletin' : 'Safety Bulletin'}
                      </h3>
                      <p className={`text-xs ${isUrgent ? 'text-orange-700' : 'text-red-700'}`}>
                        Safety Management System • {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {isUrgent && !subject.startsWith('URGENT:') ? `URGENT: ${subject}` : subject || 'Untitled Bulletin'}
                  </h2>
                  <div className="flex gap-1 mt-2">
                    {selectedGroups.map(g => <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>)}
                    {selectedGroups.length === 0 && <span className="text-xs text-gray-400 italic">No recipients selected</span>}
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 bg-white space-y-5">
                  {/* Summary */}
                  {bulletinSummary && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">Summary</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{bulletinSummary}</p>
                    </div>
                  )}

                  {/* What Happened */}
                  {whatHappened && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">Description of Event</h4>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{whatHappened}</p>
                    </div>
                  )}

                  {/* Risk Level */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">Risk Assessment</h4>
                    <Badge variant="outline" className={`${getRiskBadgeColor(riskLevel)} text-sm px-3 py-1`}>
                      {riskLevel} Risk
                    </Badge>
                    {(riskSeverity + riskLikelihood) > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Score: {riskSeverity + riskLikelihood})
                      </span>
                    )}
                  </div>

                  {/* Corrective Actions */}
                  {correctiveActions && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-green-900 uppercase tracking-wide mb-1">
                        Corrective Actions & Mitigations
                      </h4>
                      <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">{correctiveActions}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {recommendations && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-1">
                        Recommendations & Precautions
                      </h4>
                      <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{recommendations}</p>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {additionalNotes && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">Additional Information</h4>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{additionalNotes}</p>
                    </div>
                  )}

                  {!bulletinSummary && !whatHappened && !correctiveActions && (
                    <div className="text-center py-12 text-gray-400 italic">
                      Fill out the form to see the preview...
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 border-t text-center text-xs text-gray-500">
                  Ref: {hazard?.id || 'N/A'} • Confidential Safety Reporting System • Do not distribute outside authorized channels.
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <div className="text-xs text-gray-500">
              {selectedGroups.length === 0 ? '⚠ Select at least one recipient group' : `${selectedGroups.length} group(s) selected`}
              {!isFormComplete && <span className="ml-2 text-orange-500">• Fill required fields (*)</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowBulletinDialog(false)}>Cancel</Button>
              <Button
                className={isUrgent ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}
                onClick={handlePublish}
                disabled={!isFormComplete}
              >
                <Send className="w-4 h-4 mr-2" />
                {isUrgent ? 'Send Urgent Bulletin' : 'Publish Bulletin'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent >
      </Dialog >
    );
  };

  const FinalReportDialog = () => {
    const [activeTab, setActiveTab] = useState('write');

    return (
      <Dialog open={showClosureDialog} onOpenChange={setShowClosureDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-700" />
              Finalize & Publish Hazard Report
            </DialogTitle>
            <DialogDescription>
              Review and edit the final report before closing this hazard. This document will be archived.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="write">Edit Draft</TabsTrigger>
              <TabsTrigger value="preview">Preview Report</TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="mt-4 space-y-2">
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setClosureReport('')}>Clear</Button>
              </div>
              <Textarea
                className="min-h-[500px] font-mono text-sm leading-relaxed p-4 bg-white"
                value={closureReport}
                onChange={(e) => setClosureReport(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg shadow-sm overflow-hidden bg-white min-h-[500px]">
                {/* Formal Header */}
                <div className="border-b p-6 flex justify-between items-start bg-slate-50">
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-slate-900">Safety Investigation Report</h1>
                    <p className="text-sm text-slate-500 uppercase tracking-widest mt-1">Confidential & Proprietary</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-200">FINAL</div>
                    <p className="text-xs text-gray-400 mt-1">ID: {hazard?.id}</p>
                  </div>
                </div>

                <div className="p-8 prose prose-slate max-w-none prose-headings:font-serif">
                  <div className="whitespace-pre-wrap font-serif text-slate-800">
                    {closureReport}
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-400 p-6 text-center text-xs">
                  Aviation Management System • Safety Department • Generated {new Date().toLocaleDateString()}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowClosureDialog(false)}>Cancel</Button>
            <Button className="bg-green-700 hover:bg-green-800" onClick={handleFinalClosure}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Publish & Close Hazard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const RCAWizard = () => (
    <Dialog open={showRCAWizard} onOpenChange={setShowRCAWizard}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Root Cause Analysis (5 Whys)</DialogTitle>
          <DialogDescription>Drill down to the root cause. The first question is crucial for understanding the context.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <Label className="font-bold text-blue-900 text-base mb-1 block">
              1. Why did this make sense for the person to do what they did?
            </Label>
            <p className="text-xs text-blue-700 mb-2">Consider the local rationality: What information, pressures, or context made this action seem correct at the time?</p>
            <Textarea
              value={whyAnalysis[0]}
              onChange={(e) => {
                const newWhys = [...whyAnalysis];
                newWhys[0] = e.target.value;
                setWhyAnalysis(newWhys);
              }}
              placeholder="Explain the context and reasoning..."
              className="bg-white"
            />
          </div>

          <div className="space-y-4 pl-4 border-l-2 border-gray-200">
            {whyAnalysis.slice(1).map((why, i) => {
              const index = i + 1; // 1-based index for the relevant array part
              return (
                <div key={index}>
                  <Label className="font-medium text-gray-700">
                    {index + 1}. Then why?
                  </Label>
                  <Textarea
                    value={why}
                    onChange={(e) => {
                      const newWhys = [...whyAnalysis];
                      newWhys[index] = e.target.value;
                      setWhyAnalysis(newWhys);
                    }}
                    placeholder="Drill deeper..."
                    className="mt-1 h-20"
                  />
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setShowRCAWizard(false)}>Save Analysis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const AssignmentModal = () => {
    
    // Regenerate the shared summary when toggles or hazard data changes
    useEffect(() => {
      if (activeAssignmentType !== null && hazard) {
        let draft = '';
        
        if (includeDescription) {
          draft += `**Hazard Description:**\n${hazard.description || 'N/A'}\n\n`;
        }
        
        if (includeRisk) {
          draft += `**Risk Assessment:**\nScore: ${riskSeverity + riskLikelihood} (Severity: ${riskSeverity}, Likelihood: ${riskLikelihood})\n\n`;
        }
        
        if (includeRCA) {
          draft += `**Root Cause (5 Whys):**\n${whyAnalysis[4] || whyAnalysis[3] || whyAnalysis[0] || 'N/A'}\n\n`;
        }
        
        if (includeNotes) {
          draft += `**Investigation Notes:**\n${investigationNotes || 'N/A'}\n\n`;
        }
        
        setSharedReportSummary(draft.trim());
      }
    }, [activeAssignmentType, hazard, includeDescription, includeRisk, includeRCA, includeNotes, riskSeverity, riskLikelihood, whyAnalysis, investigationNotes]);

    return (
      <Dialog open={activeAssignmentType !== null} onOpenChange={(open) => !open && setActiveAssignmentType(null)}>
        <DialogContent className="max-w-2xl bg-white shadow-2xl border-0 overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${activeAssignmentType === 'processOwner' ? 'bg-purple-500' : 'bg-blue-500'}`} />
          <DialogHeader className="pt-6 px-6">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              {activeAssignmentType === 'processOwner' ? (
                <>
                  <div className="bg-purple-100 p-2 rounded-full"><UserCog className="w-6 h-6 text-purple-600" /></div>
                  Manage Process Owners
                </>
              ) : (
                <>
                  <div className="bg-blue-100 p-2 rounded-full"><ShieldCheck className="w-6 h-6 text-blue-600" /></div>
                  Manage Approvers
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-base">
              {activeAssignmentType === 'processOwner'
                ? "Assign responsibilities for developing corrective actions. You can assign multiple owners."
                : "Designate specific roles required to approve the mitigation plan."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-6">

            {/* De-identification Banner & Shared Summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">De-identification & Information Sharing</p>
                  <p className="text-xs text-amber-700">Select which investigation details to include for the assignee. Reporter identity will be automatically omitted to preserve confidentiality.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-2 border-t border-amber-200/50">
                <div className="flex items-center space-x-2">
                  <Checkbox id="inc-desc" checked={includeDescription} onCheckedChange={(c: boolean) => setIncludeDescription(!!c)} />
                  <label htmlFor="inc-desc" className="text-sm font-medium text-amber-900 cursor-pointer">Description</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="inc-risk" checked={includeRisk} onCheckedChange={(c: boolean) => setIncludeRisk(!!c)} />
                  <label htmlFor="inc-risk" className="text-sm font-medium text-amber-900 cursor-pointer">Risk Score</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="inc-rca" checked={includeRCA} onCheckedChange={(c: boolean) => setIncludeRCA(!!c)} />
                  <label htmlFor="inc-rca" className="text-sm font-medium text-amber-900 cursor-pointer">Root Cause</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="inc-notes" checked={includeNotes} onCheckedChange={(c: boolean) => setIncludeNotes(!!c)} />
                  <label htmlFor="inc-notes" className="text-sm font-medium text-amber-900 cursor-pointer">Invest. Notes</label>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-amber-900">Preview/Edit Generated Summary text</Label>
                <Textarea
                  value={sharedReportSummary}
                  onChange={(e) => setSharedReportSummary(e.target.value)}
                  placeholder="Summary text for the assignee..."
                  className="mt-1.5 min-h-[120px] bg-white border-amber-200 focus:border-amber-400"
                />
              </div>
            </div>

            {/* List Existing assignments */}
            <div className="space-y-3">
              <Label className="uppercase text-xs font-bold text-gray-500 tracking-wider">
                Current {activeAssignmentType === 'processOwner' ? 'Owners' : 'Approvers'}
              </Label>

            {activeAssignmentType === 'processOwner' && paceAssignments.processOwner.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 italic">No process owners assigned yet.</p>
              </div>
            )}

            {activeAssignmentType === 'approver' && paceAssignments.approver.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 italic">No approvers assigned yet.</p>
              </div>
            )}

            {activeAssignmentType === 'processOwner' && paceAssignments.processOwner.map((po: any, i: number) => (
              <div key={i} className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-purple-200 transition-colors group">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                    {po.customName ? po.customName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{po.customName || 'Wait for Input'}</p>
                    <p className="text-sm text-gray-500">{po.customEmail || 'No email provided'}</p>
                    {po.customMessage && <p className="text-xs text-gray-400 mt-1 italic">"{po.customMessage}"</p>}
                  </div>
                </div>
                <Button
                  size="sm" variant="ghost" className="text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const newPo = paceAssignments.processOwner.filter((_, idx) => idx !== i);
                    setPaceAssignments({ ...paceAssignments, processOwner: newPo });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {activeAssignmentType === 'approver' && paceAssignments.approver.map((ap: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-blue-200 transition-colors group">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{ap.customName || ap.value}</p>
                    <p className="text-sm text-gray-500">{ap.customEmail || 'No email'}</p>
                  </div>
                </div>
                <Button
                  size="sm" variant="ghost" className="text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const newAp = paceAssignments.approver.filter((_, idx) => idx !== i);
                    setPaceAssignments({ ...paceAssignments, approver: newAp });
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Add New Form */}
          <div className="space-y-4">
            <Label className="uppercase text-xs font-bold text-gray-500 tracking-wider">
              Add New {activeAssignmentType === 'processOwner' ? 'Owner' : 'Approver'}
            </Label>

            {activeAssignmentType === 'processOwner' && (
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Select User (Optional)</Label>
                    <Select onValueChange={(val: string) => {
                      const user = SYSTEM_USERS.find(u => u.id === val);
                      if (user) {
                        (document.getElementById('new-po-name') as HTMLInputElement).value = user.name;
                        (document.getElementById('new-po-email') as HTMLInputElement).value = user.email;
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select from list..." /></SelectTrigger>
                      <SelectContent>
                        {SYSTEM_USERS.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.department})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input id="new-po-name" placeholder="E.g. John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input id="new-po-email" placeholder="john@example.com" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Input id="new-po-msg" placeholder="Instructions..." />
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => {
                  const nameEl = document.getElementById('new-po-name') as HTMLInputElement;
                  const emailEl = document.getElementById('new-po-email') as HTMLInputElement;
                  const msgEl = document.getElementById('new-po-msg') as HTMLInputElement;

                  if (nameEl.value) {
                    setPaceAssignments({
                      ...paceAssignments,
                      processOwner: [...paceAssignments.processOwner, {
                        id: Date.now(),
                        type: 'user',
                        value: nameEl.value,
                        customName: nameEl.value,
                        customEmail: emailEl.value,
                        customMessage: msgEl.value,
                        status: 'pending',
                        response: ''
                      }]
                    });
                    // Reset
                    nameEl.value = ''; emailEl.value = ''; msgEl.value = '';
                    toast.success('Process Owner Added');
                  } else {
                    toast.error('Name is required');
                  }
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Process Owner
                </Button>
              </div>
            )}

            {activeAssignmentType === 'approver' && (
              <div className="grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Select User (Optional)</Label>
                    <Select onValueChange={(val: string) => {
                      const user = SYSTEM_USERS.find(u => u.id === val);
                      if (user) {
                        const emailEl = document.getElementById('new-ap-email') as HTMLInputElement;
                        if (emailEl) emailEl.value = user.email;
                        
                        // Auto-select the first role mapped to the user as a suggested role
                        if (user.roles.length > 0) {
                            const hidden = document.getElementById('new-ap-role') as HTMLInputElement;
                            if (hidden) hidden.value = user.roles[0];
                        }
                        toast.info(`Selected ${user.name}. Please confirm or select their Role.`);
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select from list..." /></SelectTrigger>
                      <SelectContent>
                        {SYSTEM_USERS.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.department})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select onValueChange={(val: string) => {
                      const hidden = document.getElementById('new-ap-role') as HTMLInputElement;
                      if (hidden) hidden.value = val;
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select Role..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chief Pilot">Chief Pilot</SelectItem>
                        <SelectItem value="Director of Maintenance">Director of Maintenance</SelectItem>
                        <SelectItem value="Scheduling Manager">Scheduling Manager</SelectItem>
                        <SelectItem value="VP">VP</SelectItem>
                        <SelectItem value="Flight Attendant Manager">Flight Attendant Manager</SelectItem>
                        <SelectItem value="Medical">Medical</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" id="new-ap-role" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Optional)</Label>
                    <Input id="new-ap-email" placeholder="approver@example.com" />
                  </div>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
                  const roleEl = document.getElementById('new-ap-role') as HTMLInputElement;
                  const emailEl = document.getElementById('new-ap-email') as HTMLInputElement;

                  if (roleEl && roleEl.value) {
                    setPaceAssignments({
                      ...paceAssignments,
                      approver: [...paceAssignments.approver, {
                        id: Date.now(),
                        type: 'user',
                        value: roleEl.value,
                        customName: roleEl.value,
                        customEmail: emailEl.value,
                        customMessage: '',
                        status: 'pending'
                      }]
                    });
                    roleEl.value = ''; emailEl.value = '';
                    toast.success('Approver Added');
                  } else {
                    toast.error('Role selection is required');
                  }
                }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Approver
                </Button>
              </div>
            )}

          </div>

        </div>
        <DialogFooter className="border-t p-4 bg-gray-50">
          <Button variant="outline" onClick={() => setActiveAssignmentType(null)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  };


  const saveChanges = (stageOverride?: string) => {
    if (!id) return;

    // Mock upload formatting
    const formattedAttachments = attachments.map(file => ({
      id: file.name + Date.now(),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file), // create temporary local URL
      uploadedBy: 'Safety Manager',
      uploadedDate: new Date().toISOString()
    }));

    updateHazard(id, {
      workflowStage: stageOverride || currentStage,
      riskAnalysis: { severity: riskSeverity, likelihood: riskLikelihood },
      whyAnalysis,
      investigationNotes,
      paceAssignments: paceAssignments as any,
      finalCorrectiveAction: consolidatedPlan,
      attachments: formattedAttachments.length > 0 ? formattedAttachments : hazard?.attachments
    });
    // Only show toast if not part of a transition (optional, but keeps it less noisy)
    // toast.success('Progress saved'); 
  };

  const advanceStage = () => {
    let nextStage = '';
    const currentStageCopy = currentStage; // Capture for switch

    switch (currentStageCopy) {
      case WORKFLOW_STAGES.SUBMITTED:
        nextStage = WORKFLOW_STAGES.SM_INVESTIGATION;
        toast.success("Advanced to Safety Manager Investigation");
        break;

      case WORKFLOW_STAGES.SM_INVESTIGATION:
        if (!riskSeverity || !riskLikelihood) {
          toast.error("Please complete the Risk Assessment first.");
          return;
        }
        // 5 Whys is optional — SM can skip if not needed
        if (whyAnalysis[0].length > 0 && whyAnalysis[0].length < 5) {
          toast.warning("5 Whys analysis looks incomplete. You can still proceed.");
        }
        nextStage = WORKFLOW_STAGES.ASSIGN_MITIGATION;
        toast.success("Investigation complete. Proceed to PACE assignment.");
        break;

      case WORKFLOW_STAGES.ASSIGN_MITIGATION:
        if (paceAssignments.processOwner.length === 0) {
          toast.error("Please assign at least one Process Owner.");
          return;
        }
        nextStage = WORKFLOW_STAGES.MITIGATION_DEVELOPMENT;
        toast.success("Process Owners assigned. Waiting for Process Owner input.");
        break;

      case WORKFLOW_STAGES.MITIGATION_DEVELOPMENT:
        // Check if all process owners have responded (or at least one for now, depending on rules. Sticking to 'at least one' for progress or 'all'?)
        // Let's require at least one response for now to proceed.
        const hasResponse = paceAssignments.processOwner.some(p => p.response || p.status === 'submitted');
        if (!hasResponse) {
          toast.error("Waiting for Process Owner response.");
          return;
        }
        nextStage = WORKFLOW_STAGES.SM_REVIEW;
        toast.success("Mitigation proposal received. Reviewing...");
        break;

      case WORKFLOW_STAGES.SM_REVIEW:
        if (!consolidatedPlan) {
          toast.error("Please finalize the Corrective Action Plan.");
          return;
        }
        if (paceAssignments.approver.length === 0) {
          toast.error("Please assign at least one Approver before sending for approval.");
          return;
        }
        nextStage = WORKFLOW_STAGES.LINE_MANAGER_APPROVAL;
        toast.success("Plan finalized. Sent to Line Manager.");
        break;

      case WORKFLOW_STAGES.LINE_MANAGER_APPROVAL:
        nextStage = WORKFLOW_STAGES.EXEC_APPROVAL;
        toast.success("Line Manager Approved. Sent to Accountable Exec.");
        break;

      case WORKFLOW_STAGES.EXEC_APPROVAL:
        nextStage = WORKFLOW_STAGES.IMPLEMENTATION;
        toast.success("Executive Approved. Moving to Implementation.");
        break;

      case WORKFLOW_STAGES.IMPLEMENTATION:
        nextStage = WORKFLOW_STAGES.EFFECTIVENESS_REVIEW;
        toast.success("Implementation complete. Effectiveness review scheduled.");
        break;

      case WORKFLOW_STAGES.EFFECTIVENESS_REVIEW:
        nextStage = WORKFLOW_STAGES.CLOSED;
        toast.success("Hazard Workflow Closed.");
        break;

      default:
        break;
    }

    if (nextStage) {
      setCurrentStage(nextStage);
      saveChanges(nextStage);
    } else {
      // Just save in place if no transition
      saveChanges();
    }
  };

  const handleSimulateProcessOwnerResponse = () => {
    setPaceAssignments(prev => {
      const newOwners = [...prev.processOwner];
      if (newOwners.length > 0) {
        newOwners[0] = {
          ...newOwners[0],
          status: 'submitted',
          response: "We have updated the refueling checklist to require a secondary visual verification of the nozzle locking mechanism. All ground crew have been briefed on this change during the morning stand-up."
        };
      }
      return { ...prev, processOwner: newOwners };
    });
    toast.success("Simulated Process Owner Response received.");
  };

  // -- Main Layout --
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Wizards */}
      <RiskWizard />
      <RCAWizard />
      <BulletinDialog />
      <FinalReportDialog />
      <AssignmentModal />
      {/* PACEWizard is replaced by AssignmentModal */}

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button variant="link" onClick={() => navigate('/safety?tab=hazards')} className="text-blue-600 font-semibold p-0">
            Back to Safety Center
          </Button>
          <div className="h-6 w-px bg-gray-200 mx-2" />
          <div>
            <h1 className="text-xl font-bold flex items-center gap-3">
              {hazard?.id || 'HZ-2024-001'}
              <Badge variant={
                currentStage === WORKFLOW_STAGES.CLOSED ? 'secondary' :
                  hazard?.severity === 'Critical' ? 'destructive' : 'default'
              }>
                {currentStage}
              </Badge>
            </h1>
            <p className="text-sm text-gray-500">{hazard?.title || 'Loading...'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200" onClick={() => setShowBulletinDialog(true)}>
            <Target className="w-4 h-4 mr-2" />
            Publish Bulletin
          </Button>
          <Button variant="outline" className="text-orange-700 bg-orange-50 hover:bg-orange-100 hover:text-orange-800 border-orange-200" onClick={() => {
            setShowBulletinDialog(true);
            // The urgent flag will be handled inside BulletinDialog next render
          }}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Send Urgent Bulletin
          </Button>
          <Button variant="outline" onClick={() => saveChanges()}><Save className="w-4 h-4 mr-2" /> Save Progress</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Form & Data (Scrollable) */}
        <div className="w-2/3 overflow-y-auto p-6 space-y-8">
          <ProgressTracker
            currentStage={currentStage}
            onStageClick={(stage) => {
              setCurrentStage(stage);
              saveChanges(stage);
              toast.info(`Switched to ${stage}`);
            }}
            allowNavigation={false}
          />

          {/* 1. Report Details (Always Visible) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Report Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label className="text-xs text-gray-500">Reported By</Label>
                  <div className="font-medium text-sm flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {hazard.isAnonymous ? (
                      <span className="italic text-muted-foreground">Anonymous Submission</span>
                    ) : (
                      hazard.reportedBy
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Date</Label>
                  <div className="font-medium text-sm flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {hazard.reportedDate}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Location</Label>
                  <div className="font-medium text-sm flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {hazard.location}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Category</Label>
                  <div className="font-medium text-sm">
                    <Badge variant="outline">{hazard.category}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-xs text-gray-500 mb-1">Description</Label>
                  <div className="p-3 bg-slate-50 rounded border border-slate-100 text-sm italic">
                    "{hazard.description}"
                  </div>
                </div>
                {hazard.immediateActions && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Immediate Actions Taken</Label>
                    <p className="text-sm p-3 bg-green-50/50 rounded border border-green-100">{hazard.immediateActions}</p>
                  </div>
                )}
                {hazard.potentialConsequences && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Potential Consequences</Label>
                    <p className="text-sm text-gray-700">{hazard.potentialConsequences}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Investigation Phase (Risk & RCA) */}
          {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.SM_INVESTIGATION)) && (
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Microscope className="w-5 h-5 text-purple-600" />
                  Safety Investigation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Tools Grid - Made larger and more prominent */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Risk Matrix Card */}
                  <div
                    className={`p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:border-purple-400 hover:bg-purple-50 group ${riskSeverity + riskLikelihood > 0 ? 'bg-purple-50 border-solid border-purple-200' : 'bg-gray-50 border-gray-200'}`}
                    onClick={() => setShowRiskWizard(true)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <AlertTriangle className={`w-8 h-8 ${riskSeverity + riskLikelihood > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                      </div>
                      {(riskSeverity + riskLikelihood) > 0 && <CheckCircle className="w-6 h-6 text-green-500" />}
                    </div>
                    <h3 className="font-bold text-lg mb-1">Risk Assessment</h3>
                    <p className="text-sm text-gray-500 mb-3">Assess Severity & Likelihood (5x5 Matrix)</p>

                    {(riskSeverity + riskLikelihood) > 0 ? (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={(riskSeverity + riskLikelihood) >= 6 ? 'bg-red-500' : 'bg-yellow-500'}>
                          Score: {riskSeverity + riskLikelihood}
                        </Badge>
                        <span className="text-xs font-medium text-gray-600">
                          ({['Low', 'Medium', 'High', 'Critical'][Math.min(3, Math.floor((riskSeverity + riskLikelihood) / 3))]})
                        </span>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" className="w-full">Start Assessment</Button>
                    )}
                  </div>

                  {/* 5 Whys Card */}
                  <div
                    className={`p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 group ${whyAnalysis[0].length > 5 ? 'bg-blue-50 border-solid border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                    onClick={() => setShowRCAWizard(true)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Activity className={`w-8 h-8 ${whyAnalysis[0].length > 5 ? 'text-blue-500' : 'text-gray-400'}`} />
                      </div>
                      {whyAnalysis[0].length > 5 && <CheckCircle className="w-6 h-6 text-green-500" />}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">Root Cause Analysis</h3>
                      <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">Optional</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">Conduct 5 Whys Analysis (can be skipped)</p>

                    {whyAnalysis[0].length > 5 ? (
                      <div className="mt-2 text-sm italic text-gray-700 bg-white/50 p-2 rounded truncate">
                        "Root: {whyAnalysis[4] || whyAnalysis[3] || '...'}"
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" className="w-full">Start 5 Whys</Button>
                    )}
                  </div>
                </div>

                {/* Investigation Notes */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Investigation Notes</Label>
                  <Textarea
                    placeholder="Enter detailed investigation findings, interview notes, or observations..."
                    className="min-h-[120px]"
                    value={investigationNotes}
                    onChange={(e) => setInvestigationNotes(e.target.value)}
                  />
                </div>

                {/* Evidence Upload */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Evidence & Media</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
                        }
                      }}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-10 h-10 text-gray-400 mb-3" />
                      <span className="font-medium text-gray-700">Click to upload documents, images, or videos</span>
                      <span className="text-xs text-gray-500 mt-1">Supports MP4, JPG, PNG, PDF (Max 50MB)</span>
                    </label>
                  </div>

                  {/* File List */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded">
                              <File className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => {
                            setAttachments(prev => prev.filter((_, i) => i !== idx));
                          }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          )}

          {/* 3. Mitigation Assignment Phase */}
          {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.ASSIGN_MITIGATION)) && (
            <Card className="border-l-4 border-l-blue-500 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-blue-600" />
                  Mitigation Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="flex flex-col gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors hover:shadow-md hover:border-blue-300 group"
                  onClick={() => setActiveAssignmentType('processOwner')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-white p-2 rounded shadow-sm">
                        <UserCog className="w-5 h-5 text-blue-600" />
                      </div>
                      <h4 className="text-sm font-bold text-blue-900">Process Owners</h4>
                    </div>
                    <Badge variant="secondary" className="bg-white/50 text-blue-600 border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">Click to Manage</Badge>
                  </div>
                  {paceAssignments.processOwner.length === 0 && <p className="text-sm italic text-gray-500 text-center py-2">No Process Owners Assigned</p>}
                  {paceAssignments.processOwner.map((po, idx) => (
                    <div key={idx} className="ml-2 pl-2 border-l-2 border-blue-200">
                      <p className="text-sm font-semibold">{po.customName || po.value || 'Unknown User'}</p>
                      {po.response && (
                        <div className="mt-1 text-sm bg-white p-2 rounded border border-blue-100">
                          <span className="font-semibold text-xs text-blue-600 uppercase">Proposal:</span>
                          <p className="italic text-gray-700">{po.response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Input for assigning if in assignment stage */}
                {currentStage === WORKFLOW_STAGES.ASSIGN_MITIGATION && (
                  <div className="mt-4 pt-4 border-t border-dashed text-center">
                    <p className="text-xs text-gray-500 italic">Click on the Process Owners card above to add team members.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 4. PACE Team Approvals */}
          {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.SM_REVIEW)) && (
            <Card className="border-l-4 border-l-orange-500 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-orange-600" />
                  PACE Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="flex flex-col gap-2 p-3 bg-orange-50 rounded-lg border border-orange-100 cursor-pointer hover:bg-orange-100 transition-colors hover:shadow-md hover:border-orange-300 group"
                  onClick={() => setActiveAssignmentType('approver')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-white p-2 rounded shadow-sm">
                        <ShieldCheck className="w-5 h-5 text-orange-600" />
                      </div>
                      <h4 className="text-sm font-bold text-orange-900">Approvers</h4>
                    </div>
                    <Badge variant="secondary" className="bg-white/50 text-orange-600 border-orange-200 group-hover:bg-orange-600 group-hover:text-white transition-colors">Click to Manage</Badge>
                  </div>
                  {paceAssignments.approver.length === 0 && <p className="text-sm italic text-gray-500 text-center py-2">No Approvers Assigned</p>}
                  {paceAssignments.approver.map((ap, idx) => (
                    <div key={idx} className="ml-2 pl-2 border-l-2 border-orange-200">
                      <p className="text-sm">{ap.customName || ap.value || 'Unknown Role'}</p>
                    </div>
                  ))}
                </div>

                {/* Input for assigning if in assignment stage */}
                {currentStage === WORKFLOW_STAGES.SM_REVIEW && (
                  <div className="mt-4 pt-4 border-t border-dashed text-center">
                    <p className="text-xs text-gray-500 italic">Click on the Approvers card above to add team members.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 4. Corrective Action Plan (SM Review) */}
          {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.SM_REVIEW)) && (
            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-yellow-600" />
                  Final Corrective Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentStage === WORKFLOW_STAGES.SM_REVIEW ? (
                  <div className="space-y-3">
                    <Label>Curated Action Plan (For Approval)</Label>
                    <Textarea
                      value={consolidatedPlan}
                      onChange={(e) => setConsolidatedPlan(e.target.value)}
                      className="min-h-[120px]"
                      placeholder="Synthesize the Process Owner's mitigation and team feedback into a final plan..."
                    />
                    <p className="text-xs text-muted-foreground">This content will be sent to the Line Manager and AE for sign-off.</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded border">
                    <p className="text-sm whitespace-pre-wrap">{consolidatedPlan}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 5. Implementation & Closure */}
          {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.IMPLEMENTATION)) && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-green-600" />
                  Implementation & Effectiveness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-green-700" />
                    <span className="text-sm font-medium text-green-900">Communication Sent</span>
                  </div>
                  <Badge variant="outline" className="bg-white text-green-700">Sent</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-700" />
                    <span className="text-sm font-medium text-green-900">R&I Updated (Compliance)</span>
                  </div>
                  <Badge variant="outline" className="bg-white text-green-700">Linked</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Action Center */}
        <div className="w-1/3 bg-white border-l p-6 flex flex-col shadow-lg z-10 transition-all duration-300">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Action Center
          </h2>

          <div className="flex-1 space-y-6">
            {/* Status Card */}
            <div className="bg-slate-50 p-4 rounded-lg border">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Current Phase</p>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-800">{currentStage}</p>
              </div>
              <div className="mt-2 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${Math.max(10, ((Object.values(WORKFLOW_STAGES).indexOf(currentStage) + 1) / Object.values(WORKFLOW_STAGES).length) * 100)}%` }}
                />
              </div>
            </div>

            {/* Actions List */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Available Actions</p>

              {currentStage === WORKFLOW_STAGES.SUBMITTED && (
                <Button className="w-full" onClick={advanceStage}>
                  Review & Start Investigation
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {currentStage === WORKFLOW_STAGES.SM_INVESTIGATION && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => setShowRiskWizard(true)}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                    Perform Risk Assessment
                    {(riskSeverity + riskLikelihood) > 0 && <CheckCircle className="w-4 h-4 ml-auto text-green-500" />}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => setShowRCAWizard(true)}
                  >
                    <Microscope className="w-4 h-4 mr-2 text-purple-500" />
                    Conduct 5 Whys Analysis
                    {whyAnalysis[0].length > 5 && <CheckCircle className="w-4 h-4 ml-auto text-green-500" />}
                  </Button>
                  <Button className="w-full mt-4" onClick={advanceStage}>
                    Complete Investigation
                  </Button>
                </>
              )}

              {currentStage === WORKFLOW_STAGES.ASSIGN_MITIGATION && (
                <>
                  <p className="text-xs text-gray-500 mb-2">Assign PACE roles in the "Mitigation & PACE Team" section to the left.</p>
                  <Button className="w-full" onClick={advanceStage} disabled={paceAssignments.processOwner.length === 0}>
                    Assign PACE Team & Send
                  </Button>
                </>
              )}

              {currentStage === WORKFLOW_STAGES.MITIGATION_DEVELOPMENT && (
                <>
                  <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200 mb-3">
                    Waiting for Process Owner Response.
                  </div>
                  {paceAssignments.processOwner.some(p => p.status === 'submitted') ? (
                    <Button className="w-full" onClick={advanceStage}>
                      Review Proposal
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full border-dashed" onClick={handleSimulateProcessOwnerResponse}>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Simulate Response (Demo)
                    </Button>
                  )}
                </>
              )}

              {currentStage === WORKFLOW_STAGES.SM_REVIEW && (
                <Button className="w-full" onClick={advanceStage}>
                  Submit for Approval
                </Button>
              )}

              {(currentStage === WORKFLOW_STAGES.LINE_MANAGER_APPROVAL || currentStage === WORKFLOW_STAGES.EXEC_APPROVAL) && (
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded border border-blue-200">
                    Pending Approval from {currentStage === WORKFLOW_STAGES.LINE_MANAGER_APPROVAL ? 'Line Manager' : 'Accountable Executive'}.
                  </div>
                  <Button className="w-full" onClick={advanceStage}>
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Simulate Approval
                  </Button>
                </div>
              )}

              {currentStage === WORKFLOW_STAGES.IMPLEMENTATION && (
                <>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Info to Group
                    <CheckCircle className="w-4 h-4 ml-auto text-green-500" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Link R&I Document
                    <CheckCircle className="w-4 h-4 ml-auto text-green-500" />
                  </Button>
                  <Button className="w-full mt-4" onClick={advanceStage}>
                    Complete Implementation
                  </Button>
                </>
              )}

              {currentStage === WORKFLOW_STAGES.EFFECTIVENESS_REVIEW && (
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setShowClosureDialog(true)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Close Hazard Report
                </Button>
              )}

              {currentStage === WORKFLOW_STAGES.CLOSED && (
                <div className="text-center p-4 bg-gray-100 rounded text-gray-500">
                  Workflow Closed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}