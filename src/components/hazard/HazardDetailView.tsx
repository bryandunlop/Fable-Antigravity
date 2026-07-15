import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Hazard, useHazards, WORKFLOW_STAGES } from '../../contexts/HazardContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import {
  FileText, Activity, AlertTriangle, Microscope, UserCog,
  ShieldCheck, ClipboardCheck, Rocket, Mail, BookOpen, Clock,
  CheckCircle, ArrowRight, User, Calendar, MapPin, XCircle, Trash2, Plus, Download, Wand2, ChevronLeft,
  Database, MessageSquare, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { threadParticipant } from './engine/thread';
import { isRiskAssessed, riskScore, UNASSESSED, type RiskAxis } from './riskAssessment';

export default function HazardDetailView({ userRole = 'safety' }: { userRole?: string }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hazards, updateHazard, deleteHazard, postHazardMessage, currentUserId } = useHazards();
  
  const hazard = hazards.find(h => h.id === id);

  // -- State --
  const [currentStage, setCurrentStage] = useState(WORKFLOW_STAGES.SUBMITTED);
  const isSafetyManager = userRole === 'safety' || userRole === 'admin';
  
  // Data States
  // UNASSESSED (null), not 0: the likelihood scale legitimately starts at "0 Rarely",
  // so 0 cannot double as "unanswered". See hazard/riskAssessment.ts / TL-17.
  const [riskSeverity, setRiskSeverity] = useState<RiskAxis>(UNASSESSED);
  const [riskLikelihood, setRiskLikelihood] = useState<RiskAxis>(UNASSESSED);
  const assessed = isRiskAssessed(riskSeverity, riskLikelihood);
  const score = riskScore(riskSeverity, riskLikelihood);
  const [whyAnalysis, setWhyAnalysis] = useState(['', '', '', '', '']);
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [consolidatedPlan, setConsolidatedPlan] = useState('');
  const [mitigationAssignments, setMitigationAssignments] = useState({ processOwner: [] as any[], approver: [] as any[], contributors: [] as any[], executers: [] as any[] });
  
  // UI States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRiskWizard, setShowRiskWizard] = useState(false);
  const [showRCAWizard, setShowRCAWizard] = useState(false);
  const [activeAssignmentType, setActiveAssignmentType] = useState<'processOwner' | 'approver' | 'executive' | null>(null);
  const [sharedReportSummary, setSharedReportSummary] = useState('');
  const [includeDescription, setIncludeDescription] = useState(true);
  const [includeRCA, setIncludeRCA] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [finalReportRaw, setFinalReportRaw] = useState('');
  const [deidentifiedMitigationSummary, setDeidentifiedMitigationSummary] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreviewingReport, setIsPreviewingReport] = useState(false);
  const [showBriefingPreview, setShowBriefingPreview] = useState(false);
  const [isVerifyingPII, setIsVerifyingPII] = useState(false);
  const [piiVerified, setPiiVerified] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');

  // Mock System Users for assignments
  const SYSTEM_USERS = [
    { id: 'u1', name: 'John Smith', email: 'jsmith@gfo.com', department: 'Maintenance', roles: ['Director of Maintenance'] },
    { id: 'u2', name: 'Sarah Jenkins', email: 'sjenkins@gfo.com', department: 'Flight Ops', roles: ['Chief Pilot'] },
    { id: 'u3', name: 'Mike Davis', email: 'mdavis@gfo.com', department: 'Ground Ops', roles: ['Ground Ops Manager'] },
  ];

  // Hydrate state when hazard changes
  useEffect(() => {
    if (hazard) {
      setCurrentStage(hazard.workflowStage || WORKFLOW_STAGES.SUBMITTED);
      if (hazard.riskAnalysis) {
        setRiskSeverity(hazard.riskAnalysis.severity);
        setRiskLikelihood(hazard.riskAnalysis.likelihood);
      } else {
        setRiskSeverity(0); setRiskLikelihood(0);
      }
      setWhyAnalysis(hazard.whyAnalysis && hazard.whyAnalysis.length > 0 ? hazard.whyAnalysis : ['', '', '', '', '']);
      setInvestigationNotes(hazard.investigationNotes || '');
      setFinalReportRaw(hazard.finalReportRaw || '');
      
      if (hazard.mitigationAssignments) {
        setMitigationAssignments({
          processOwner: Array.isArray(hazard.mitigationAssignments.processOwner) ? hazard.mitigationAssignments.processOwner : [],
          approver: Array.isArray(hazard.mitigationAssignments.approver) ? hazard.mitigationAssignments.approver : [],
          contributors: Array.isArray(hazard.mitigationAssignments.contributors) ? hazard.mitigationAssignments.contributors : [],
          executers: Array.isArray(hazard.mitigationAssignments.executers) ? hazard.mitigationAssignments.executers : []
        });
      } else {
        setMitigationAssignments({ processOwner: [], approver: [], contributors: [], executers: [] });
      }
      setDeidentifiedMitigationSummary(hazard.deidentifiedMitigationSummary || '');
    }
  }, [hazard]);

  const handleExportReport = () => {
    toast.success('Generating Hazard Summary Report...');
    const reportContent = `
========================================
HAZARD REPORT: ${hazard?.id}
========================================
Title: ${hazard?.title}
Severity: ${hazard?.severity}
Date Reported: ${hazard?.reportedDate}
Status: ${hazard?.workflowStage}

-- Description --
${hazard?.description}

-- Risk Assessment --
Severity: ${hazard?.riskAnalysis?.severity ?? 'Pending'}
Likelihood: ${hazard?.riskAnalysis?.likelihood ?? 'Pending'}

Generated by Antigravity Safety Management System
========================================
    `;
    const blob = new Blob([reportContent.trim()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hazard?.id}_Summary_Report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePullContext = () => {
    let context = `--- HAZARD INVESTIGATION SUMMARY ---\n\n`;
    context += `ORIGINAL DESCRIPTION:\n${hazard?.description}\n\n`;
    
    if (hazard?.investigationNotes) {
      context += `INVESTIGATION NOTES:\n${hazard.investigationNotes}\n\n`;
    }
    
    if (hazard?.whyAnalysis?.some(w => w.trim() !== '')) {
      context += `ROOT CAUSE ANALYSIS (5 WHYS):\n`;
      hazard.whyAnalysis.forEach((w, i) => {
        if (w.trim() !== '') context += `${i + 1}. ${w}\n`;
      });
      context += `\n`;
    }
    
    if (mitigationAssignments.processOwner[0]?.response) {
      context += `PROPOSED MITIGATION (Process Owner):\n${mitigationAssignments.processOwner[0].response}\n\n`;
    }
    
    if (mitigationAssignments.approver[0]?.customMessage) {
      context += `LINE MANAGER FEEDBACK:\n${mitigationAssignments.approver[0].customMessage}\n\n`;
    }
    
    if (mitigationAssignments.executers[0]?.customMessage) {
      context += `EXECUTIVE FEEDBACK:\n${mitigationAssignments.executers[0].customMessage}\n\n`;
    }
    
    context += `--- END OF SUMMARY ---`;
    setFinalReportRaw(context);
    toast.success("All context pulled into report draft.");
  };

  if (!hazard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-slate-50 gap-4 mt-20">
        <h2 className="text-2xl font-bold">Hazard Not Found</h2>
        <Button onClick={() => navigate('/safety/hazards')}>Return to Workspace</Button>
      </div>
    );
  }

  // Secure follow-up thread: who is the viewer, and how do they send?
  const threadViewer = threadParticipant(hazard, currentUserId, isSafetyManager);
  const handleSendMessage = () => {
    if (!threadViewer || !messageDraft.trim()) return;
    const authorName = threadViewer.role === 'safety' ? 'Safety Team' : (hazard.reportedBy || 'Reporter');
    postHazardMessage(hazard.id, messageDraft, threadViewer.role, authorName);
    setMessageDraft('');
    toast.success(threadViewer.role === 'safety' ? 'Message sent to reporter.' : 'Reply sent to safety team.');
  };

  const saveChanges = (newStage?: string) => {
    const stageToSave = newStage || currentStage;
    updateHazard(hazard.id, {
      workflowStage: stageToSave,
      ...(assessed ? { riskAnalysis: { severity: riskSeverity as number, likelihood: riskLikelihood as number } } : {}),
      whyAnalysis,
      investigationNotes,
      mitigationAssignments: { ...hazard.mitigationAssignments, ...mitigationAssignments },
      finalCorrectiveAction: consolidatedPlan,
      finalReportRaw,
      deidentifiedMitigationSummary
    });
  };

  const advanceStage = () => {
    const stages = Object.values(WORKFLOW_STAGES);
    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1];
      setCurrentStage(nextStage);
      saveChanges(nextStage);
      toast.success(`Advanced to ${nextStage}`);
    }
  };

  const stageProgress = Math.max(10, ((Object.values(WORKFLOW_STAGES).indexOf(currentStage) + 1) / Object.values(WORKFLOW_STAGES).length) * 100);

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
    <>
    <div className="flex flex-col min-h-screen bg-slate-50 w-full pb-20 pt-16 lg:pt-0">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white border-b px-6 py-4 shadow-sm shrink-0">
          <div className="flex justify-between items-start max-w-7xl mx-auto">
            <div className="flex-1 pr-6 flex items-start gap-4">
              <Button variant="ghost" size="icon" className="shrink-0 mt-1" onClick={() => navigate('/safety/hazards')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold">{hazard.id}</span>
                  <Badge variant="outline" className="bg-slate-100">{hazard.workflowStage}</Badge>
                </div>
                <h1 className="text-2xl leading-tight font-bold text-slate-900">{hazard.title}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {hazard.reportedDate}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {hazard.location}</span>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {hazard.reportedBy}</span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions / Progress */}
            <div className="w-64 shrink-0 text-right space-y-2">
               <div className="text-xs font-semibold text-slate-500 uppercase">Workflow Progress ({Math.round(stageProgress)}%)</div>
               <Progress value={stageProgress} className="h-2" />
               <p className="text-sm font-medium text-blue-700 truncate">{currentStage}</p>
            </div>
          </div>
        </div>

        {/* Progress Tracker / Timeline (Safety Manager Only) */}
        {isSafetyManager && (
          <div className="bg-slate-100 border-b px-6 py-4 flex items-center justify-between shadow-inner shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {Object.values(WORKFLOW_STAGES).map((stage, i, arr) => {
                const currentIndex = Object.values(WORKFLOW_STAGES).indexOf(currentStage);
                const isCompleted = i < currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <React.Fragment key={stage}>
                    <div className={`flex flex-col items-center gap-2 ${isCurrent ? 'opacity-100' : 'opacity-50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all
                        ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : isCurrent ? 'bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-100 border-slate-300 text-slate-400'}`}>
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : i + 1}
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`w-8 h-1 ${isCompleted ? 'bg-indigo-600' : 'bg-slate-200'} mx-1 rounded`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto w-full relative">
          
          {/* Main Content Areas */}
          <div className="p-6 space-y-6 max-w-4xl mx-auto pb-40"> {/* pb-40 ensures space for sticky footer */}
              
             {/* REJECTION ALERT (FOR SM) */}
             {isSafetyManager && (mitigationAssignments.approver?.some(a => a.status === 'rejected') || mitigationAssignments.executers?.some(a => a.status === 'rejected')) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
                   <div className="bg-red-100 p-2 rounded-full">
                     <AlertTriangle className="w-5 h-5 text-red-600" />
                   </div>
                   <div className="flex-1">
                     <h4 className="font-bold text-red-900">Feedback Received: Action Plan Rejected</h4>
                     <p className="text-sm text-red-800 mt-1">
                       A reviewer (Line Manager or Executive) rejected the proposed mitigation plan.
                     </p>
                     <div className="mt-3 p-3 bg-white border border-red-100 rounded text-sm text-slate-700 italic">
                       "{mitigationAssignments.approver.find(a => a.status === 'rejected')?.customMessage || mitigationAssignments.executers.find(a => a.status === 'rejected')?.customMessage || 'No specific feedback provided.'}"
                     </div>
                     <Button 
                       size="sm" 
                       variant="outline" 
                       className="mt-3 border-red-200 text-red-700 hover:bg-red-100"
                       onClick={() => {
                          const ap = [...mitigationAssignments.approver];
                          const ex = [...mitigationAssignments.executers];
                          ap.forEach(a => { if(a.status === 'rejected') a.status = 'pending'; });
                          ex.forEach(a => { if(a.status === 'rejected') a.status = 'pending'; });
                          setMitigationAssignments({ ...mitigationAssignments, approver: ap, executers: ex });
                          saveChanges(WORKFLOW_STAGES.SM_MITIGATION_REVIEW);
                       }}
                     >
                       Acknowledge & Resume Editing
                     </Button>
                   </div>
                </div>
             )}

             {/* Secure Follow-up Thread (known submitters only) */}
             {(threadViewer || (isSafetyManager && hazard.isAnonymous)) && (
               <Card className="shadow-sm border-l-4 border-l-indigo-500">
                 <CardHeader className="pb-3">
                   <CardTitle className="flex items-center gap-2 text-base">
                     <MessageSquare className="w-4 h-4 text-indigo-600" />
                     Secure Follow-up{!hazard.isAnonymous && threadViewer ? ` — ${threadViewer.role === 'safety' ? 'Reporter' : 'Safety Team'}` : ''}
                   </CardTitle>
                   <CardDescription>
                     {hazard.isAnonymous
                       ? 'This report was submitted anonymously. A secure two-way thread is not available.'
                       : threadViewer?.role === 'safety'
                         ? 'Ask the reporter for more information. Only you and the reporter can see this thread.'
                         : 'The safety team may request more details here. Your replies are visible only to the safety team.'}
                   </CardDescription>
                 </CardHeader>
                 {!hazard.isAnonymous && (
                   <CardContent className="space-y-4">
                     <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                       {(hazard.messages?.length ?? 0) === 0 ? (
                         <p className="text-sm text-muted-foreground italic">No messages yet.</p>
                       ) : (
                         hazard.messages!.map((m) => (
                           <div key={m.id} className={`flex flex-col ${m.authorRole === threadViewer?.role ? 'items-end' : 'items-start'}`}>
                             <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.authorRole === 'safety' ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-100 border border-slate-200'}`}>
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs font-semibold">{m.authorName}</span>
                                 <Badge variant="outline" className="text-[10px] py-0">{m.authorRole === 'safety' ? 'Safety' : 'Reporter'}</Badge>
                               </div>
                               <p className="whitespace-pre-wrap">{m.body}</p>
                               <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.atUtc).toLocaleString()}</p>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                     <div className="flex flex-col gap-2">
                       <Textarea
                         value={messageDraft}
                         onChange={(e) => setMessageDraft(e.target.value)}
                         placeholder={threadViewer?.role === 'safety' ? 'Request more information from the reporter…' : 'Reply to the safety team…'}
                         className="min-h-[70px]"
                       />
                       <div className="flex justify-end">
                         <Button size="sm" disabled={!messageDraft.trim()} onClick={handleSendMessage}>
                           <Send className="w-4 h-4 mr-2" /> Send
                         </Button>
                       </div>
                     </div>
                   </CardContent>
                 )}
               </Card>
             )}

             {!isSafetyManager && (
                <div className="space-y-6">
                  <div className="p-4 bg-white border rounded-lg shadow-sm border-l-4 border-l-blue-500">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                       <FileText className="w-5 h-5 text-blue-600" />
                       Safety Manager Briefing
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{deidentifiedMitigationSummary || hazard.description}</p>
                  </div>

                  {currentStage === WORKFLOW_STAGES.MITIGATION_DEVELOPMENT && (
                    <Card className="shadow-sm">
                       <CardHeader className="bg-slate-50">
                         <CardTitle>Submit Corrective Action Plan</CardTitle>
                       </CardHeader>
                       <CardContent className="pt-4 space-y-4">
                         <Label>Proposed Mitigation Strategy</Label>
                         <Textarea 
                           className="min-h-[100px]" 
                           placeholder="Detail your plan to mitigate this hazard..."
                           onChange={(e) => {
                               const updated = [...mitigationAssignments.processOwner];
                               if(updated.length > 0) updated[0].response = e.target.value;
                               setMitigationAssignments({ ...mitigationAssignments, processOwner: updated });
                           }}
                         />
                         <Button className="w-full" onClick={() => {
                            saveChanges(WORKFLOW_STAGES.SM_MITIGATION_REVIEW);
                            toast.success("Corrective Action Plan submitted to Safety.");
                         }}>Submit Plan</Button>
                       </CardContent>
                    </Card>
                  )}

                   {currentStage === WORKFLOW_STAGES.MANAGER_APPROVAL && (
                      <Card className="shadow-sm border-l-4 border-l-orange-500">
                        <CardHeader className="bg-slate-50">
                          <CardTitle>Approval Required (Line Manager)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="p-3 bg-slate-50 border rounded text-sm">
                             <p className="font-semibold mb-1">Proposed Corrective Action:</p>
                             <p>{mitigationAssignments.processOwner[0]?.response || 'No mitigation provided.'}</p>
                          </div>
                          <Label>Feedback / Comments</Label>
                          <Textarea 
                            placeholder="Optional details... Required for rejection." 
                            onChange={(e) => {
                                const updated = [...mitigationAssignments.approver];
                                if(updated.length > 0) updated[0].customMessage = e.target.value; 
                                setMitigationAssignments({ ...mitigationAssignments, approver: updated });
                            }}
                          />
                          <div className="flex gap-2 pt-2">
                             <Button className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => {
                                const updated = [...mitigationAssignments.approver];
                                if(updated.length > 0) updated[0].status = 'approved'; 
                                setMitigationAssignments({ ...mitigationAssignments, approver: updated });
                                saveChanges(WORKFLOW_STAGES.SM_POST_MANAGER); 
                                toast.success("Line Manager Response Received.");
                             }}>Approve</Button>
                             <Button variant="destructive" className="flex-1" onClick={() => {
                                const updated = [...mitigationAssignments.approver];
                                if(updated.length > 0) updated[0].status = 'rejected'; 
                                setMitigationAssignments({ ...mitigationAssignments, approver: updated });
                                saveChanges(WORKFLOW_STAGES.SM_MITIGATION_REVIEW); 
                                toast.error("Rejected and returned to Safety Manager.");
                             }}>Reject & Return</Button>
                          </div>
                        </CardContent>
                      </Card>
                   )}

                   {currentStage === WORKFLOW_STAGES.EXEC_APPROVAL && (
                      <Card className="shadow-sm border-l-4 border-l-indigo-500">
                        <CardHeader className="bg-slate-50">
                          <CardTitle>Approval Required (Accountable Exec)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <div className="p-3 bg-slate-50 border rounded text-sm">
                             <p className="font-semibold mb-1">Proposed Corrective Action:</p>
                             <p>{mitigationAssignments.processOwner[0]?.response || 'No mitigation provided.'}</p>
                          </div>
                          <Label>Feedback / Comments</Label>
                          <Textarea 
                            placeholder="Optional details... Required for rejection." 
                            onChange={(e) => {
                                const updated = [...mitigationAssignments.executers];
                                if(updated.length > 0) updated[0].customMessage = e.target.value; 
                                setMitigationAssignments({ ...mitigationAssignments, executers: updated });
                            }}
                          />
                          <div className="flex gap-2 pt-2">
                             <Button className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => {
                                const updated = [...mitigationAssignments.executers];
                                if(updated.length > 0) updated[0].status = 'approved'; 
                                setMitigationAssignments({ ...mitigationAssignments, executers: updated });
                                saveChanges(WORKFLOW_STAGES.SM_POST_EXEC); 
                                toast.success("Executive Response Received.");
                             }}>Approve</Button>
                             <Button variant="destructive" className="flex-1" onClick={() => {
                                const updated = [...mitigationAssignments.executers];
                                if(updated.length > 0) updated[0].status = 'rejected'; 
                                setMitigationAssignments({ ...mitigationAssignments, executers: updated });
                                saveChanges(WORKFLOW_STAGES.SM_MITIGATION_REVIEW); 
                                toast.error("Rejected and returned to Safety Manager.");
                             }}>Reject & Return</Button>
                          </div>
                        </CardContent>
                      </Card>
                   )}
                </div>
             )}

             {isSafetyManager && (
               <>
              {/* 1. Report Details */}
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50/50 pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Report Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1">Description</Label>
                    <div className="p-3 bg-white rounded border text-sm text-slate-700 whitespace-pre-wrap">
                      {hazard.description}
                    </div>
                  </div>
                  {(hazard.immediateActions || hazard.potentialConsequences) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hazard.immediateActions && (
                         <div>
                           <Label className="text-xs text-slate-500 mb-1">Immediate Actions</Label>
                           <p className="text-sm p-3 bg-green-50/50 rounded border border-green-100">{hazard.immediateActions}</p>
                         </div>
                      )}
                      {hazard.potentialConsequences && (
                        <div>
                          <Label className="text-xs text-slate-500 mb-1">Potential Consequences</Label>
                          <p className="text-sm p-3 bg-red-50/50 rounded border border-red-100">{hazard.potentialConsequences}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Full Submission Details / Attachments */}
                  <div className="pt-2 border-t border-slate-100">
                    <Label className="text-xs text-slate-500 mb-1">Attachments & Evidence</Label>
                    {hazard.attachments && hazard.attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {hazard.attachments.map((att: any, idx: number) => (
                           <Badge key={idx} variant="secondary" className="bg-slate-100 hover:bg-slate-200 cursor-pointer">
                             <FileText className="w-3 h-3 mr-1" /> {att.name || 'document.pdf'}
                           </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic mt-1">No file attachments were included with this submission.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 2. Investigation Phase */}
              {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.SM_INVESTIGATION)) && (
                <Card className="shadow-sm border-l-4 border-l-purple-500">
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Microscope className="w-5 h-5 text-purple-600" />
                      Safety Investigation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Risk Matrix Preview */}
                      <div className="p-4 border rounded-lg bg-white relative shadow-sm">
                        {assessed && <CheckCircle className="w-5 h-5 text-green-500 absolute top-4 right-4" />}
                        <h4 className="font-bold mb-1 flex items-center gap-2">Risk Assessment</h4>
                        {assessed ? (
                           <p className="text-sm text-slate-600 font-medium">Risk Score: <span className={`${getScoreColor(score ?? 0)} px-2 py-0.5 rounded text-black inline-block ml-1`}>{score}</span> (S: {riskSeverity}, L: {riskLikelihood})</p>
                        ) : (
                           <p className="text-sm text-slate-500 italic">Not completed</p>
                        )}
                        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowRiskWizard(true)}>
                          {assessed ? 'Edit Matrix Assessment' : 'Start Risk Assessment'}
                        </Button>
                      </div>

                      {/* 5 Whys Preview */}
                      <div className="p-4 border rounded-lg bg-white relative shadow-sm">
                        {whyAnalysis[0].length > 5 && <CheckCircle className="w-5 h-5 text-green-500 absolute top-4 right-4" />}
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold flex items-center gap-2">Root Cause Analysis</h4>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">(Optional)</span>
                        </div>
                        {whyAnalysis[0].length > 5 ? (
                           <p className="text-sm text-slate-600 truncate italic mt-1">Root: {whyAnalysis[4] || whyAnalysis[3] || whyAnalysis[2] || whyAnalysis[1] || '...' }</p>
                        ) : (
                           <p className="text-sm text-slate-500 italic mt-1">5 Whys Analysis pending...</p>
                        )}
                        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowRCAWizard(true)}>
                          {whyAnalysis[0].length > 5 ? 'Edit Analysis' : 'Start RCA (Optional)'}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <Label>Investigation Notes</Label>
                       <Textarea 
                         placeholder="Document investigation findings here..."
                         value={investigationNotes}
                         onChange={(e) => {
                           setInvestigationNotes(e.target.value);
                           // In a real app we might debouce saveChanges() here
                         }}
                         onBlur={() => saveChanges(currentStage)}
                       />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 3. Mitigation Assignment */}
              {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.ASSIGN_MITIGATION)) && (
                <Card className="shadow-sm border-l-4 border-l-blue-500">
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserCog className="w-5 h-5 text-blue-600" />
                      Mitigation Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-600 mb-4">Identify and assign the departments or individuals responsible for implementing the corrective actions.</p>
                    
                    {currentStage === WORKFLOW_STAGES.ASSIGN_MITIGATION ? (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="uppercase text-[10px] font-bold text-slate-400 tracking-widest">Select Process Owner(s)</Label>
                            <Badge variant="outline" className="text-[10px] bg-white font-mono">Internal Directory</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {SYSTEM_USERS.map(user => {
                              const isAssigned = mitigationAssignments.processOwner.some(u => u.value === user.id);
                              return (
                                <div key={user.id} 
                                     className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer shadow-sm ${isAssigned ? 'bg-indigo-50 border-indigo-200' : 'bg-white hover:border-indigo-200 hover:shadow-md'}`}
                                     onClick={() => {
                                       if (isAssigned) {
                                         const newPo = mitigationAssignments.processOwner.filter(u => u.value !== user.id);
                                         setMitigationAssignments({ ...mitigationAssignments, processOwner: newPo });
                                       } else {
                                         const newAssignee = { id: Date.now(), type: 'user', value: user.id, customName: user.name, customEmail: user.email, status: 'pending' };
                                         setMitigationAssignments({ ...mitigationAssignments, processOwner: [...mitigationAssignments.processOwner, newAssignee] });
                                       }
                                     }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAssigned ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                      {user.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 text-xs">{user.name}</p>
                                      <p className="text-[10px] text-slate-500">{user.roles[0]}</p>
                                    </div>
                                  </div>
                                  {isAssigned && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <Separator className="bg-slate-100" />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="uppercase text-[10px] font-bold text-slate-400 tracking-widest">Assignee Briefing (De-identified)</Label>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold px-2 rounded-full"
                              onClick={() => {
                                let context = `Assigned Context:\n${hazard?.description}\n\nRoot Cause Notes: ${whyAnalysis.findLast(w => w !== '') || 'N/A'}`;
                                setDeidentifiedMitigationSummary(context);
                                toast.success("Context pulled from investigation");
                              }}
                            >
                              <Database className="w-3 h-3 mr-1" /> Pull Investigation Context
                            </Button>
                          </div>
                          <Textarea 
                             className="min-h-[120px] text-sm border-slate-200 focus:border-indigo-400 focus:ring-indigo-400 rounded-lg shadow-inner bg-slate-50/30"
                             placeholder="Draft what the process owner should know (ensure no PII is included)..."
                             value={deidentifiedMitigationSummary}
                             onChange={(e) => setDeidentifiedMitigationSummary(e.target.value)}
                          />
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-green-500" />
                            This text will be the exclusive briefing sent to the assigned user.
                          </p>
                        </div>

                        <Button 
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 shadow-lg flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98]"
                          disabled={mitigationAssignments.processOwner.length === 0}
                          onClick={() => {
                            setActiveAssignmentType('processOwner');
                            setIsVerifyingPII(true);
                            setPiiVerified(false);
                          }}
                        >
                          <FileText className="w-5 h-5" /> Preview Briefing & Send for Mitigation
                        </Button>
                      </div>
                    ) : mitigationAssignments.processOwner.length > 0 ? (
                      <div className="space-y-2">
                        {mitigationAssignments.processOwner.map((po, idx) => (
                          <div key={idx} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex justify-between items-center group">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                  {po.customName?.charAt(0) || 'U'}
                               </div>
                               <div>
                                  <p className="font-bold text-indigo-900 text-sm">{po.customName || po.value || 'Assigned User'}</p>
                                  <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-tight">{po.status || 'Pending'}</p>
                               </div>
                            </div>
                            <Badge variant="outline" className="bg-white border-indigo-200 text-indigo-700">Notified</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-8 border-2 border-dashed rounded-xl bg-slate-50 text-slate-500 italic">
                         No Process Owners assigned yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 4. Mitigation Development */}
              {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.MITIGATION_DEVELOPMENT)) && (
                <Card className="shadow-sm border-l-4 border-l-teal-500">
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardCheck className="w-5 h-5 text-teal-600" />
                      Mitigation Development
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {currentStage === WORKFLOW_STAGES.MITIGATION_DEVELOPMENT ? (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600">Waiting for assigned Process Owners to submit a Corrective Action Plan (CAP).</p>
                        <Button 
                          variant="outline" 
                          className="w-full bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                          onClick={() => {
                            if (mitigationAssignments.processOwner.length > 0) {
                              const updated = [...mitigationAssignments.processOwner];
                               updated[0].response = "Simulated Response: We have completed a comprehensive review of the ground handling SOPs. The mitigation plan includes mandatory dual-person verification for all towing operations and a revised training module for new hires. We expect these controls to reduce relevant risks by 70+%.";
                               setMitigationAssignments({ ...mitigationAssignments, processOwner: updated });
                               saveChanges(WORKFLOW_STAGES.SM_MITIGATION_REVIEW);
                               toast.success("Simulated Process Owner response received.");
                            } else {
                              toast.error("Assign a process owner first.");
                            }
                          }}
                        >
                          <Microscope className="w-4 h-4 mr-2" /> Simulate Process Owner Input
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 text-sm text-teal-900">
                         <span className="font-bold block mb-2 uppercase text-[10px] tracking-wider text-teal-700">Mitigation Response (CAP):</span>
                         <p className="italic">{mitigationAssignments.processOwner[0]?.response || "Mitigation plan received and under review."}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 5. Line Manager Approval */}
              {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.SM_MITIGATION_REVIEW)) && (
                <Card className="shadow-sm border-l-4 border-l-orange-500">
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="w-5 h-5 text-orange-600" />
                      Line Manager Approval
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {currentStage === WORKFLOW_STAGES.SM_MITIGATION_REVIEW ? (
                      <div className="space-y-6">
                        <p className="text-sm text-slate-600">Review the mitigation constraints and assign a Line Manager for approval before escalating to Executive.</p>
                        
                        <div className="space-y-3">
                          <Label className="uppercase text-[10px] font-bold text-slate-400 tracking-widest">Select Line Manager</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {SYSTEM_USERS.map(user => {
                              const isAssigned = mitigationAssignments.approver.some(u => u.value === user.id);
                              return (
                                <div key={user.id} 
                                     className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer shadow-sm ${isAssigned ? 'bg-orange-50 border-orange-200' : 'bg-white hover:border-orange-200 hover:shadow-md'}`}
                                     onClick={() => {
                                       if (isAssigned) {
                                         const newApp = mitigationAssignments.approver.filter(u => u.value !== user.id);
                                         setMitigationAssignments({ ...mitigationAssignments, approver: newApp });
                                       } else {
                                         const newAssignee = { id: Date.now(), type: 'user', value: user.id, customName: user.name, customEmail: user.email, status: 'pending' };
                                         setMitigationAssignments({ ...mitigationAssignments, approver: [...mitigationAssignments.approver, newAssignee] });
                                       }
                                     }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAssigned ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                      {user.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 text-xs">{user.name}</p>
                                      <p className="text-[10px] text-slate-500">{user.roles[0]}</p>
                                    </div>
                                  </div>
                                  {isAssigned && <CheckCircle className="w-4 h-4 text-orange-600" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="uppercase text-[10px] font-bold text-slate-400 tracking-widest">Briefing for Manager Review</Label>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-bold px-2 rounded-full"
                              onClick={() => {
                                let context = `Mitigation Proposal:\n${mitigationAssignments.processOwner[0]?.response || ''}\n\nSafety Manager Recommendation: Proposed mitigations meet operational standards. Requesting Line Manager sign-off.`;
                                setDeidentifiedMitigationSummary(context);
                                toast.success("Context pulled from mitigation");
                              }}
                            >
                              <Database className="w-3 h-3 mr-1" /> Pull Mitigation Context
                            </Button>
                          </div>
                          <Textarea 
                             className="min-h-[120px] text-sm border-slate-200 focus:border-orange-400 focus:ring-orange-400 rounded-lg shadow-inner bg-slate-50/30"
                             placeholder="Draft the briefing for the Line Manager (ensure no PII)..."
                             value={deidentifiedMitigationSummary}
                             onChange={(e) => setDeidentifiedMitigationSummary(e.target.value)}
                          />
                        </div>

                        <Button 
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 shadow-lg flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98]"
                          disabled={mitigationAssignments.approver.length === 0}
                          onClick={() => {
                            setActiveAssignmentType('approver');
                            setIsVerifyingPII(true);
                            setPiiVerified(false);
                          }}
                        >
                          <ShieldCheck className="w-5 h-5" /> Preview Briefing & Send for Approval
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mitigationAssignments.approver.length > 0 ? (
                           mitigationAssignments.approver.map((ap: any, idx: number) => (
                             <div key={idx} className="p-3 bg-orange-50 border border-orange-100 rounded-lg flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-orange-900">{ap.customName || ap.value || 'Approver'}</span>
                                  <Badge variant="outline" className={`bg-white text-orange-600 border-orange-200`}>
                                     {ap.status || 'Pending'}
                                  </Badge>
                                </div>
                                {ap.customMessage && (
                                  <div className="mt-2 text-sm text-slate-700 bg-white p-2 rounded border border-orange-100">
                                    <span className="font-semibold block mb-1">Feedback/Comments:</span>
                                    {ap.customMessage}
                                  </div>
                                )}
                             </div>
                           ))
                        ) : (
                           <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-800 italic">
                              Auto-approved (No managers assigned)
                           </div>
                        )}
                        {currentStage === WORKFLOW_STAGES.MANAGER_APPROVAL && mitigationAssignments.approver.length > 0 && (
                           <Button 
                              className="mt-2 w-full bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200" 
                              variant="outline"
                              onClick={() => {
                                 const updated = [...mitigationAssignments.approver];
                                 if(updated.length > 0) {
                                    updated[0].status = 'approved';
                                    updated[0].customMessage = 'Simulated Approval: The proposed corrective actions seem adequate and operational controls are feasible. Proceed with implementation parameters as defined.';
                                 }
                                 setMitigationAssignments({ ...mitigationAssignments, approver: updated });
                                 saveChanges(WORKFLOW_STAGES.SM_POST_MANAGER);
                                 toast.success("Simulated Line Manager approval received.");
                              }}
                           >
                              <Microscope className="w-4 h-4 mr-2" /> Simulate Line Manager Approval
                           </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 6. Executive Approval */}
              {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.SM_POST_MANAGER)) && (
                <Card className="shadow-sm border-l-4 border-l-indigo-500">
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      Accountable Executive Approval
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {currentStage === WORKFLOW_STAGES.SM_POST_MANAGER ? (
                      <div className="space-y-6">
                        <p className="text-sm text-slate-600">Line Manager input received. Synthesize the final briefing for the Accountable Executive for high-level risk sign-off.</p>
                        
                        <div className="space-y-3">
                          <Label className="uppercase text-[10px] font-bold text-slate-400 tracking-widest">Select Accountable Executive</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {SYSTEM_USERS.map(user => {
                              const isAssigned = mitigationAssignments.executers.some(u => u.value === user.id);
                              return (
                                <div key={user.id} 
                                     className={`flex items-center justify-between p-3 border rounded-xl transition-all cursor-pointer shadow-sm ${isAssigned ? 'bg-red-50 border-red-200' : 'bg-white hover:border-red-200 hover:shadow-md'}`}
                                     onClick={() => {
                                       if (isAssigned) {
                                         const newEx = mitigationAssignments.executers.filter(u => u.value !== user.id);
                                         setMitigationAssignments({ ...mitigationAssignments, executers: newEx });
                                       } else {
                                         const newAssignee = { id: Date.now(), type: 'user', value: user.id, customName: user.name, customEmail: user.email, status: 'pending' };
                                         setMitigationAssignments({ ...mitigationAssignments, executers: [...mitigationAssignments.executers, newAssignee] });
                                       }
                                     }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAssigned ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                      {user.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 text-xs">{user.name}</p>
                                      <p className="text-[10px] text-slate-500">{user.roles[0]}</p>
                                    </div>
                                  </div>
                                  {isAssigned && <CheckCircle className="w-4 h-4 text-red-600" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="uppercase text-[10px] font-bold text-slate-400 tracking-widest">Executive Risk Briefing</Label>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-2 rounded-full"
                              onClick={() => {
                                let context = `Operational Hazard Risk Assessment:\nHazard: ${hazard?.title}\nMitigation Strategy: ${mitigationAssignments.processOwner[0]?.response || ''}\nLine Manager Feedback: ${mitigationAssignments.approver[0]?.customMessage || ''}\n\nRequesting final validation and resource commitment.`;
                                setDeidentifiedMitigationSummary(context);
                                toast.success("Context pulled for Executive");
                              }}
                            >
                              <Database className="w-3 h-3 mr-1" /> Pull Full Context
                            </Button>
                          </div>
                          <Textarea 
                             className="min-h-[120px] text-sm border-slate-200 focus:border-red-400 focus:ring-red-400 rounded-lg shadow-inner bg-slate-50/30"
                             placeholder="Draft the final briefing for the Accountable Executive (ensure no PII)..."
                             value={deidentifiedMitigationSummary}
                             onChange={(e) => setDeidentifiedMitigationSummary(e.target.value)}
                          />
                        </div>

                        <Button 
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 shadow-lg flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98]"
                          disabled={mitigationAssignments.executers.length === 0}
                          onClick={() => {
                            setActiveAssignmentType('executive');
                            setIsVerifyingPII(true);
                            setPiiVerified(false);
                          }}
                        >
                          <Rocket className="w-5 h-5" /> Preview Briefing & Send to Executive
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mitigationAssignments.executers.length > 0 ? (
                           mitigationAssignments.executers.map((ex: any, idx: number) => (
                             <div key={idx} className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-indigo-900">{ex.customName || ex.value || 'Executive'}</span>
                                  <Badge variant="outline" className={`bg-white text-indigo-600 border-indigo-200`}>
                                     {ex.status || 'Pending'}
                                  </Badge>
                                </div>
                                {ex.customMessage && (
                                  <div className="mt-2 text-sm text-slate-700 bg-white p-2 rounded border border-indigo-100">
                                    <span className="font-semibold block mb-1">Feedback/Comments:</span>
                                    {ex.customMessage}
                                  </div>
                                )}
                             </div>
                           ))
                        ) : (
                           <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800 italic">
                              Auto-approved (No execs assigned)
                           </div>
                        )}
                        {currentStage === WORKFLOW_STAGES.EXEC_APPROVAL && mitigationAssignments.executers.length > 0 && (
                           <Button 
                              className="mt-2 w-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200" 
                              variant="outline"
                              onClick={() => {
                                 const updated = [...mitigationAssignments.executers];
                                 if(updated.length > 0) {
                                    updated[0].status = 'approved';
                                    updated[0].customMessage = 'Simulated Approval: VP constraints met. Safety case is sound and budget is cleared for corrective actions.';
                                 }
                                 setMitigationAssignments({ ...mitigationAssignments, executers: updated });
                                 saveChanges(WORKFLOW_STAGES.SM_POST_EXEC);
                                 toast.success("Simulated Executive approval received.");
                               }}
                            >
                               <Microscope className="w-4 h-4 mr-2" /> Simulate Executive Approval
                            </Button>
                         )}
                       </div>
                     )}
                  </CardContent>
                </Card>
              )}


              {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.FINAL_REPORT)) && (
                <Card className="shadow-sm border-l-4 border-l-cyan-500">
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-cyan-600" />
                      Final Safety Report Builder
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                     {currentStage !== WORKFLOW_STAGES.CLOSED ? (
                       <div className="space-y-4">
                         <div className="flex items-center justify-between">
                           <Label>Draft Final Report (Public Facing)</Label>
                           <div className="flex items-center gap-2">
                             <Button variant="outline" size="sm" onClick={handlePullContext}>
                               <Database className="w-4 h-4 mr-2" />
                               Pull Context from Investigation
                             </Button>
                             <Button variant="secondary" size="sm" onClick={() => setIsPreviewingReport(true)}>
                               <FileText className="w-4 h-4 mr-2" />
                               Preview Polished Report
                             </Button>
                           </div>
                         </div>
                         <Textarea 
                            value={finalReportRaw || ''}
                            placeholder={`Hazard ${hazard.id} investigated and mitigated. Ready for closure.`}
                            onChange={(e) => setFinalReportRaw(e.target.value)}
                            onBlur={() => saveChanges(currentStage)}
                         />
                       </div>
                     ) : (
                       <div className="p-4 bg-slate-100 rounded-lg text-sm whitespace-pre-wrap">
                          {finalReportRaw || 'Report drafted and finalized.'}
                       </div>
                     )}
                  </CardContent>
                </Card>
              )}
              {(Object.values(WORKFLOW_STAGES).indexOf(currentStage) >= Object.values(WORKFLOW_STAGES).indexOf(WORKFLOW_STAGES.EFFECTIVENESS_REVIEW)) && 
               hazard.effectivenessReviewDate && new Date() >= new Date(hazard.effectivenessReviewDate) && (
                <Card className="shadow-sm border-l-4 border-l-pink-500">
                  <CardHeader className="bg-slate-50/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="w-5 h-5 text-pink-600" />
                      Review for Effectiveness (6-Month)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                     {currentStage === WORKFLOW_STAGES.EFFECTIVENESS_REVIEW ? (
                       <div className="space-y-4">
                         <p className="text-sm text-slate-600">Review the applied mitigations and determine if they have been effective.</p>
                         <Textarea 
                            className="min-h-[100px]"
                            placeholder="Document your effectiveness review findings here..."
                            onChange={(e) => {
                               const notes = e.target.value;
                               updateHazard(hazard.id, { smMitigationReviewNotes: notes });
                            }}
                         />
                         <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white" onClick={() => { saveChanges(WORKFLOW_STAGES.CLOSED); toast.success("Effectiveness Review completed. Report marked as Closed."); }}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Complete Review & Close Record
                         </Button>
                       </div>
                     ) : (
                       <div className="p-4 bg-slate-100 rounded-lg text-sm text-slate-700 italic">
                          {hazard.smMitigationReviewNotes || "Effectiveness review complete and satisfactory."}
                       </div>
                     )}
                  </CardContent>
                </Card>
              )}
              </>
             )}

          </div>
        </div>

        {/* Fixed Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-md border-t p-4 shadow-[0_-8px_15px_-1px_rgba(0,0,0,0.05)]">
           <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
             {/* Delete Button (Left side) */}
             <div>
               {isSafetyManager && (
                 <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                 </Button>
               )}
             </div>

             {/* Primary Actions (Right side) */}
             <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { saveChanges(currentStage); navigate('/safety/hazards'); }}>Save & Return to Workspace</Button>
                {isSafetyManager && (
                  <Button variant="outline" onClick={handleExportReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                )}
                
                {/* Dynamic Stage Actions */}
                {isSafetyManager && (
                  <>
                    {currentStage === WORKFLOW_STAGES.SUBMITTED && (
                       <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-6" onClick={advanceStage}>Start Investigation <ArrowRight className="w-4 h-4 ml-2" /></Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.SM_INVESTIGATION && (
                       <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-6" onClick={advanceStage}>Complete Investigation & Route <ArrowRight className="w-4 h-4 ml-2" /></Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.ASSIGN_MITIGATION && (
                       <Button 
                         className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-6" 
                         disabled={mitigationAssignments.processOwner.length === 0}
                         onClick={() => {
                           setActiveAssignmentType('processOwner');
                           setIsVerifyingPII(true);
                           setPiiVerified(false);
                         }}
                       >
                         Preview & Send to Process Owners <ArrowRight className="w-4 h-4 ml-2" />
                       </Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.MITIGATION_DEVELOPMENT && (
                       <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-6" onClick={advanceStage}>Review Mitigations <ArrowRight className="w-4 h-4 ml-2" /></Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.SM_MITIGATION_REVIEW && (
                       <Button 
                         className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-6" 
                         disabled={mitigationAssignments.approver.length === 0}
                         onClick={() => {
                           setActiveAssignmentType('approver');
                           setIsVerifyingPII(true);
                           setPiiVerified(false);
                         }}
                       >
                         Preview & Request Manager Sign-off <ArrowRight className="w-4 h-4 ml-2" />
                       </Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.MANAGER_APPROVAL && (
                       <Button disabled variant="outline"><Clock className="w-4 h-4 mr-2" /> Waiting on Manager</Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.SM_POST_MANAGER && (
                       <div className="flex gap-2">
                         <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { saveChanges(WORKFLOW_STAGES.MITIGATION_DEVELOPMENT); toast.success('Sent back for Mitigation rework'); }}>
                            <ArrowRight className="w-4 h-4 rotate-180 mr-2" /> Return for Rework
                         </Button>
                         <Button 
                           className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-6" 
                           disabled={mitigationAssignments.executers.length === 0}
                           onClick={() => {
                             setActiveAssignmentType('executive');
                             setIsVerifyingPII(true);
                             setPiiVerified(false);
                           }}
                         >
                           Preview & Request Exec Sign-off <ArrowRight className="w-4 h-4 ml-2" />
                         </Button>
                       </div>
                    )}
                    {currentStage === WORKFLOW_STAGES.EXEC_APPROVAL && (
                       <Button disabled variant="outline"><Clock className="w-4 h-4 mr-2" /> Waiting on VP</Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.SM_POST_EXEC && (
                       <div className="flex gap-2">
                         <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { saveChanges(WORKFLOW_STAGES.MITIGATION_DEVELOPMENT); toast.success('Sent back for Mitigation rework'); }}>
                            <ArrowRight className="w-4 h-4 rotate-180 mr-2" /> Return for Rework
                         </Button>
                         <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-6" onClick={advanceStage}>Prepare Final Report <ArrowRight className="w-4 h-4 ml-2" /></Button>
                       </div>
                    )}
                    {currentStage === WORKFLOW_STAGES.FINAL_REPORT && (
                       <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                          const effDate = new Date();
                          effDate.setMonth(effDate.getMonth() + 6);
                          updateHazard(hazard.id, {
                             workflowStage: WORKFLOW_STAGES.PUBLISHED,
                             finalReportRaw: finalReportRaw || 'Report finalized.',
                             isPublished: true,
                             effectivenessReviewDate: effDate.toISOString().split('T')[0]
                          });
                          toast.success("Report Published! 6-month effectiveness timer started.");
                       }}>
                          <CheckCircle className="w-4 h-4 mr-2" /> Publish Report
                       </Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.PUBLISHED && (
                       <Button className="bg-pink-600 hover:bg-pink-700 text-white" onClick={() => { saveChanges(WORKFLOW_STAGES.EFFECTIVENESS_REVIEW); toast.info("Effectiveness Review Started."); }}>
                          <Clock className="w-4 h-4 mr-2" /> Start Effectiveness Review
                       </Button>
                    )}
                    {currentStage === WORKFLOW_STAGES.CLOSED && (
                       <Button disabled variant="outline"><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Closed</Button>
                    )}
                  </>
                )}
             </div>
           </div>
        </div>
      </div>
      <Dialog open={showRiskWizard} onOpenChange={setShowRiskWizard}>
         <DialogContent className="max-w-[90vw] w-[1000px] h-[90vh] flex flex-col p-6">
            <DialogHeader className="shrink-0 mb-4">
               <DialogTitle className="text-2xl flex items-center gap-3">
                 <ShieldCheck className="w-7 h-7 text-indigo-600" />
                 GFO Safety Risk Assessment Matrix
               </DialogTitle>
               <DialogDescription className="text-base text-slate-600">
                 Evaluate the operational risk using Ground Force One's official severity and likelihood criteria.
               </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto border rounded-xl border-slate-200 bg-slate-50/50 relative">
               <div className="grid grid-cols-6 gap-0 min-w-[800px]">
                  {/* Empty top-left corner */}
                  <div className="col-span-1 bg-slate-100 border-b border-r border-slate-200"></div>
                  
                  {/* Likelihood Headers */}
                  {likelihoods.map(l => (
                     <div key={l.score} className="col-span-1 p-3 text-center bg-slate-100 border-b border-r border-slate-200 last:border-r-0 hover:bg-slate-200 cursor-pointer transition-colors"
                        onClick={() => setRiskLikelihood(l.score)}
                     >
                        <div className="font-bold text-slate-800 text-[13px]">{l.label}</div>
                        <div className="text-[10px] text-slate-500 mt-1 leading-tight">{l.def}</div>
                     </div>
                  ))}

                  {/* Matrix Body */}
                  {severities.map((severity, sIdx) => (
                     <React.Fragment key={severity.score}>
                        {/* Severity Header */}
                        <div className="col-span-1 p-3 bg-slate-100 border-b border-r border-slate-200 hover:bg-slate-200 cursor-pointer transition-colors"
                             onClick={() => setRiskSeverity(severity.score)}>
                           <div className="font-bold text-slate-800 text-[13px] text-center mb-2">{severity.label}</div>
                           <div className="space-y-1.5 border-t border-slate-200 pt-2">
                              {severityRows.map((row, rIdx) => (
                                 <div key={rIdx} className="text-[10px] leading-tight">
                                    <span className="font-bold text-slate-700 block">{row.name}:</span>
                                    <span className="text-slate-600">{row.texts[sIdx]}</span>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* Interactive Matrix Cells */}
                        {likelihoods.map(likelihood => {
                           const isSelected = riskSeverity === severity.score && riskLikelihood === likelihood.score;
                           const isDimmed = (riskSeverity !== null || riskLikelihood !== null) && !isSelected && !(riskSeverity === severity.score && riskLikelihood === null) && !(riskLikelihood === likelihood.score && riskSeverity === null);
                           const cellScore = severity.score + likelihood.score;
                           const cellClass = `
                              col-span-1 border-b border-r border-slate-200 flex items-center justify-center cursor-pointer transition-all duration-200 relative
                              ${getScoreColor(cellScore)}
                              ${isSelected ? 'ring-4 ring-indigo-600 ring-inset shadow-inner scale-[0.98] z-10' : 'hover:opacity-80'}
                              ${isDimmed ? 'opacity-30 grayscale-[50%]' : ''}
                           `;
                           
                           return (
                              <div 
                                 key={`${severity.score}-${likelihood.score}`} 
                                 className={cellClass}
                                 onClick={() => {
                                    setRiskSeverity(severity.score);
                                    setRiskLikelihood(likelihood.score);
                                 }}
                              >
                                 <div className={`text-2xl font-black ${cellScore > 3 && cellScore < 7 ? 'text-slate-900' : ''}`}>
                                    {cellScore}
                                 </div>
                                 {isSelected && (
                                   <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5 shadow-md">
                                     <CheckCircle className="w-5 h-5" />
                                   </div>
                                 )}
                              </div>
                           );
                        })}
                     </React.Fragment>
                  ))}
               </div>
            </div>
            <div className="shrink-0 mt-6 grid grid-cols-2 gap-6 pb-2">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#92D050] border"></div><span className="text-sm">Low (1-3)</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FFFF00] border"></div><span className="text-sm">Medium (4-5)</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FFC000] border"></div><span className="text-sm">High (6)</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#FF0000] border"></div><span className="text-sm">Very High (7-9)</span></div>
               </div>
               <div className="text-right">
                  <Button variant="outline" className="mr-3" onClick={() => { setRiskSeverity(0); setRiskLikelihood(0); }}>Clear Selection</Button>
                  <Button 
                     size="lg"
                     disabled={riskSeverity === 0 || riskLikelihood === 0}
                     onClick={() => { setShowRiskWizard(false); saveChanges(currentStage); toast.success('Risk assessment saved'); }}
                  >
                     Confirm Risk Score ({score ?? '?'})
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>

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
               
               <div className="space-y-4 pl-4 border-l-2 border-slate-200">
                  {whyAnalysis.slice(1).map((why, i) => {
                    const index = i + 1; // 1-based index
                    return (
                      <div key={index}>
                        <Label className="font-medium text-slate-700">
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
               <Button onClick={() => { setShowRCAWizard(false); saveChanges(currentStage); }}>Save Analysis</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
      
      {/* Legacy Assignment Modal Removed - Now Inline */}


      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
         <DialogContent className="max-w-md">
            <DialogHeader>
               <DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Delete Hazard Report</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete report <strong>{hazard?.id}</strong>? This action cannot be undone.</p>
            <DialogFooter>
               <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
               <Button variant="destructive" onClick={() => { if(hazard?.id) deleteHazard(hazard.id); setShowDeleteConfirm(false); navigate('/safety/hazards'); }}>Confirm Delete</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
      <Dialog open={isPreviewingReport} onOpenChange={setIsPreviewingReport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              Safety Report Preview
            </DialogTitle>
            <DialogDescription className="text-base text-slate-500">
              Review the final published version of this safety report as it will appear in the public portal.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-white border rounded-lg overflow-hidden shadow-inner my-4">
            {/* Report Header */}
            <div className="bg-slate-900 text-white p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2 uppercase">Safety Incident Report</h2>
                  <p className="text-slate-400 font-mono text-lg">{hazard.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm uppercase tracking-widest text-slate-500 mb-1 font-bold">Status</p>
                  <Badge className="bg-green-500 text-white border-0 text-sm px-4 py-1">FINALIZED</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 border-t border-slate-700 pt-6 font-medium">
                <div>
                  <p className="text-xs uppercase text-slate-500 mb-1 font-bold tracking-wider">Occurrence Date</p>
                  <p className="text-lg">{hazard.reportedDate}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500 mb-1 font-bold tracking-wider">Location</p>
                  <p className="text-lg">{hazard.location}</p>
                </div>
              </div>
            </div>

            {/* Report Body */}
            <div className="p-10 space-y-10 bg-white">
              <section>
                <h3 className="text-sm font-bold border-b-2 border-slate-100 pb-2 mb-4 text-slate-800 uppercase tracking-[0.2em]">Incident Summary</h3>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-base">
                  {finalReportRaw || `Hazard ${hazard.id} investigated and mitigated. Ready for closure.`}
                </p>
              </section>

              <section className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 -mr-8 -mt-8 rounded-full blur-2xl"></div>
                <h3 className="text-xs font-bold pb-2 mb-3 text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-200/50">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  Risk Mitigation Strategy
                </h3>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 italic leading-relaxed text-sm">
                    {mitigationAssignments.processOwner[0]?.response || "Comprehensive mitigation plan implemented including administrative controls and operational oversight."}
                  </p>
                </div>
              </section>

              <div className="pt-10 border-t border-slate-100 flex justify-between items-end italic text-slate-400 text-xs tracking-tight">
                <div>
                  <p className="font-semibold text-slate-500 not-italic">Certified by SMS Manager</p>
                  <p>Antigravity Safety Management System</p>
                </div>
                <div className="text-right">
                  <p>Document Generated: {new Date().toLocaleDateString()}</p>
                  <p>Proprietary & Confidential Safety Information</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50/50 p-6 -m-6 mt-4 border-t gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsPreviewingReport(false)}>Close Preview</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8 h-10 shadow-md font-bold" onClick={() => {
              setIsPreviewingReport(false);
              toast.success("Preview verified. Ready for publication.");
            }}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve for Publication
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVerifyingPII} onOpenChange={setIsVerifyingPII}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
              Final Briefing Verification
            </DialogTitle>
            <DialogDescription className="text-base">
              You are about to dispatch information to a third party. Use this second chance to ensure no PII (Personally Identifiable Information) or sensitive data is included.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-6">
            {/* Left: Final Edit */}
            <div className="space-y-4">
              <div>
                 <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Edit Final Information</Label>
                 <Textarea 
                   className="min-h-[250px] mt-2 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm leading-relaxed"
                   value={deidentifiedMitigationSummary}
                   onChange={(e) => setDeidentifiedMitigationSummary(e.target.value)}
                   placeholder="Final de-identified content..."
                 />
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
                 <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                 <div className="text-xs text-amber-900 leading-normal">
                   <strong>PII Check Reminder:</strong> Remove names, phone numbers, email addresses, or specific IDs that are not strictly necessary for the recipient's context.
                 </div>
              </div>
            </div>

            {/* Right: Recipient Preview */}
            <div className="space-y-4">
               <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Recipient's Inbox Preview</Label>
               <div className="bg-slate-50 p-6 border rounded-lg h-full max-h-[400px] overflow-y-auto relative bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]">
                  <div className="bg-white p-6 border shadow-sm rounded">
                     <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                        <div>
                           <p className="text-[10px] uppercase font-bold text-indigo-600 tracking-[0.2em] mb-1">Safety Management System</p>
                           <h3 className="text-lg font-bold text-slate-900">Official Briefing</h3>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono whitespace-nowrap">{hazard?.id || 'HZ-XXX'}</Badge>
                     </div>
                     <div className="prose prose-sm prose-slate max-w-none">
                        <p className="whitespace-pre-wrap text-slate-600 leading-relaxed italic text-sm">
                           {deidentifiedMitigationSummary || "Drafting briefing..."}
                         </p>
                      </div>
                      <div className="mt-10 pt-4 border-t border-slate-100 flex justify-between items-end">
                         <div className="text-[10px] text-slate-400 font-medium">
                            Sent by Safety Manager<br/>
                            Antigravity Flight Ops
                         </div>
                         <div className="h-8 w-8 bg-indigo-50 rounded-full flex items-center justify-center opacity-30">
                            <Rocket className="w-4 h-4 text-indigo-400" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           </div>

           <div className="border-t pt-6 flex items-center justify-between">
              <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 italic transition-all hover:bg-slate-100">
                <Checkbox 
                  id="pii-verify" 
                  checked={piiVerified} 
                  onCheckedChange={(checked: boolean | "indeterminate") => setPiiVerified(checked === true)}
                  className="w-5 h-5 border-slate-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <label htmlFor="pii-verify" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  I certify that this briefing contains no PII or sensitive data.
                </label>
              </div>

              <DialogFooter className="gap-3 sm:justify-end">
                <Button variant="ghost" onClick={() => setIsVerifyingPII(false)} className="text-slate-500 font-medium">Wait, Keep Editing</Button>
                <Button 
                  disabled={!piiVerified || !deidentifiedMitigationSummary.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 font-bold shadow-lg min-w-[200px]"
                  onClick={() => {
                    setIsVerifyingPII(false);
                    setActiveAssignmentType(null);
                    saveChanges(currentStage);
                    advanceStage();
                    toast.success("Information verified and dispatched successfully!");
                  }}
                >
                  <Rocket className="w-4 h-4 mr-2" /> Dispatch Info Now
                </Button>
              </DialogFooter>
           </div>
         </DialogContent>
       </Dialog>
    </>
  );
}
