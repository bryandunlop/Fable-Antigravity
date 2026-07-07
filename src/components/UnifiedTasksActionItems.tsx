import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Progress } from './ui/progress';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  MessageSquare,
  Eye,
  Users,
  Activity,
  Target,
  TrendingUp,
  User,
  Calendar,
  UserPlus,
  Star,
  Share2,
  History,
  Edit,
  Trash2,
  CheckCheck,
  Settings,
  Gavel,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Bell
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useHazards, WORKFLOW_STAGES, Hazard } from '../contexts/HazardContext';
import { eventStore } from '../notifications/events';
import { useAudits, Audit } from '../contexts/AuditContext';
import AuditDetailDrawer from './audit/AuditDetailDrawer';

// Import existing types and utilities from ActionItems
import { ActionItemsProps, ActionItem, NewItemForm } from './ActionItems/types';
import { MOCK_ACTION_ITEMS } from './ActionItems/constants';
import { getBorderColor, formatDate, getUserActionItems, getStats } from './ActionItems/utils';

// Import Action Item dialogs
import DetailsDialog from './ActionItems/DetailsDialog';
import UpdateProgressDialog from './ActionItems/UpdateProgressDialog';

interface PersonalTask {
  id: string;
  title: string;
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate: string;
  createdDate: string;
  progress: number;
  tags: string[];
  collaborators: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
  }>;
  sections: Array<{
    name: string;
    status: 'pending' | 'in-progress' | 'completed';
    progress: number;
  }>;
  sectionsComplete: number;
  totalSections: number;
  notes?: string;
  isPersonal: true;
}

interface UnifiedTasksActionItemsProps {
  userRole: string;
}

export default function UnifiedTasksActionItems({ userRole }: UnifiedTasksActionItemsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('action-items');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Action Items states
  const [selectedActionItem, setSelectedActionItem] = useState<ActionItem | null>(null);
  const [isActionItemDialogOpen, setIsActionItemDialogOpen] = useState(false);
  const [isUpdateProgressDialogOpen, setIsUpdateProgressDialogOpen] = useState(false);
  const [updatingActionItem, setUpdatingActionItem] = useState<ActionItem | null>(null);

  // Waiver decision states
  const [isWaiverDecisionDialogOpen, setIsWaiverDecisionDialogOpen] = useState(false);
  const [decidingWaiverItem, setDecidingWaiverItem] = useState<ActionItem | null>(null);
  const [waiverDecision, setWaiverDecision] = useState<'approved' | 'denied' | 'in-progress' | ''>('');
  const [waiverDecisionComment, setWaiverDecisionComment] = useState('');
  const [isDecisionSubmitting, setIsDecisionSubmitting] = useState(false);
  const [waiverDecisions, setWaiverDecisions] = useState<Record<string, { decision: 'approved' | 'denied' | 'in-progress'; comment: string }>>({});

  // UpdateProgressDialog specific states
  const [updatedSections, setUpdatedSections] = useState<Array<{ name: string; status: string }>>([]);
  const [updateComment, setUpdateComment] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Personal Tasks states  
  const [isUpdatePersonalTaskProgressOpen, setIsUpdatePersonalTaskProgressOpen] = useState(false);
  const [updatingPersonalTask, setUpdatingPersonalTask] = useState<PersonalTask | null>(null);
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([
    {
      id: 'PT001',
      title: 'Review updated safety procedures manual',
      description: 'Study the new safety procedures manual and complete online certification',
      priority: 'Medium',
      status: 'In Progress',
      dueDate: '2025-09-25',
      createdDate: '2025-09-10',
      progress: 45,
      tags: ['Training', 'Safety', 'Certification'],
      collaborators: [
        { id: 'me', name: 'You', role: userRole, avatar: 'ME' }
      ],
      sections: [
        { name: 'Chapters 1-3', status: 'completed', progress: 100 },
        { name: 'Chapters 4-6', status: 'in-progress', progress: 60 },
        { name: 'Online Quiz', status: 'pending', progress: 0 },
        { name: 'Certification', status: 'pending', progress: 0 }
      ],
      sectionsComplete: 1,
      totalSections: 4,
      isPersonal: true
    },
    {
      id: 'PT002',
      title: 'Organize cockpit documentation',
      description: 'Review and organize all cockpit reference materials and checklists',
      priority: 'Low',
      status: 'Pending',
      dueDate: '2025-09-30',
      createdDate: '2025-09-12',
      progress: 0,
      tags: ['Organization', 'Documentation'],
      collaborators: [
        { id: 'me', name: 'You', role: userRole, avatar: 'ME' },
        { id: 'pilot2', name: 'Sarah Johnson', role: 'pilot', avatar: 'SJ' }
      ],
      sections: [
        { name: 'Review existing docs', status: 'pending', progress: 0 },
        { name: 'Create organization system', status: 'pending', progress: 0 },
        { name: 'Update checklist locations', status: 'pending', progress: 0 }
      ],
      sectionsComplete: 0,
      totalSections: 3,
      isPersonal: true
    }
  ]);

  const [selectedPersonalTask, setSelectedPersonalTask] = useState<PersonalTask | null>(null);
  const [isPersonalTaskDialogOpen, setIsPersonalTaskDialogOpen] = useState(false);
  const [isNewPersonalTaskDialogOpen, setIsNewPersonalTaskDialogOpen] = useState(false);
  const [isEditPersonalTaskDialogOpen, setIsEditPersonalTaskDialogOpen] = useState(false);
  const [editingPersonalTask, setEditingPersonalTask] = useState<PersonalTask | null>(null);

  // New Personal Task Form
  const [newPersonalTaskForm, setNewPersonalTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Critical' | 'High' | 'Medium' | 'Low',
    dueDate: '',
    tags: [''],
    sections: [''],
    collaborators: [] as string[]
  });

  // Available users for collaboration
  const availableUsers = [
    { id: 'pilot1', name: 'John Smith', role: 'Pilot' },
    { id: 'pilot2', name: 'Sarah Johnson', role: 'Pilot' },
    { id: 'fa1', name: 'Maria Garcia', role: 'Flight Attendant' },
    { id: 'fa2', name: 'Lisa Chen', role: 'Flight Attendant' },
    { id: 'mech1', name: 'Mike Wilson', role: 'Maintenance' },
    { id: 'sched1', name: 'David Brown', role: 'Scheduling' },
    { id: 'safety1', name: 'Jennifer Park', role: 'Safety' }
  ];

  // Simple Avatar components
  const Avatar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={`${className} rounded-full bg-gray-200 flex items-center justify-center`}>
      {children}
    </div>
  );

  const AvatarFallback = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <span className={className}>{children}</span>
  );


  // Get action items for current user
  const { hazards } = useHazards();
  const { audits } = useAudits();

  // Audit drawer state
  const [drawerAudit, setDrawerAudit] = useState<Audit | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Convert assigned audits into ActionItems
  const getAuditTasks = (): ActionItem[] => {
    // In a real app, filter by logged-in user's name.
    // For demo: show all non-Unassigned audits that aren't complete/draft.
    return audits
      .filter(a =>
        a.assignedTo &&
        a.assignedTo !== 'Unassigned' &&
        a.status !== 'Complete' &&
        a.status !== 'Draft'
      )
      .map(audit => {
        const priority: 'Critical' | 'High' | 'Medium' | 'Low' =
          audit.priority === 'High' ? 'High' :
          audit.priority === 'Low' ? 'Low' : 'Medium';

        const completedItems = audit.checklist.filter(c => c.status === 'Pass').length;
        const totalItems = audit.checklist.length;

        return {
          id: `AuditTask-${audit.id}`,
          title: `Audit Assignment: ${audit.title}`,
          description: [
            audit.isbaoPart ? `ISBAO: ${audit.isbaoPart}` : '',
            audit.description || `Complete checklist for ${audit.category} audit.`,
          ].filter(Boolean).join(' — '),
          priority,
          status: audit.status === 'In Progress' ? 'In Progress' : 'Pending',
          assignedDate: audit.scheduledDate || new Date().toISOString().split('T')[0],
          dueDate: audit.dueDate || new Date().toISOString().split('T')[0],
          assignedBy: 'Safety Manager',
          module: 'Audit',
          contributors: [
            { id: 'auditor', name: audit.assignedTo, role: audit.assignedRole || 'Auditor', avatar: audit.assignedTo.split(' ').map((n: string) => n[0]).join('') }
          ],
          sections: audit.checklist.slice(0, 4).map(c => ({
            name: c.item,
            status: c.status === 'Pass' ? 'completed' : c.status === 'Fail' ? 'in-progress' : 'pending',
          })),
          sectionsComplete: completedItems,
          totalSections: totalItems || 1,
          progress: audit.completionRate,
          // Custom field — used in TaskCard to open drawer instead of navigating
          auditId: audit.id,
          recentActivity: [] as any[],
        } as ActionItem & { auditId: string };
      });
  };

  // Derive action items from Hazard Workflow
  const getHazardTasks = (): ActionItem[] => {
    const tasks: ActionItem[] = [];

    hazards.forEach(hazard => {
      // Helper to cast priority safely
      const getPriority = (sev?: string): 'Critical' | 'High' | 'Medium' | 'Low' => {
        const p = sev || 'Medium';
        if (['Critical', 'High', 'Medium', 'Low'].includes(p)) return p as any;
        return 'Medium';
      };

      // 1. Process Owner Actions (Assignments)
      if (hazard.workflowStage === WORKFLOW_STAGES.ASSIGN_MITIGATION) {
        // In real app, check if user is the assigned process owner 
        const isProcessOwner = hazard.mitigationAssignments?.processOwner?.[0]?.value === 'Current User' ||
          (hazard.mitigationAssignments?.processOwner?.[0]?.value && userRole === 'safety'); // Fallback for demo

        if (isProcessOwner) {
          tasks.push({
            id: `HzTask-${hazard.id}-CA`,
            title: `Develop Corrective Action: ${hazard.id}`,
            description: `Hazard "${hazard.title}" requires a corrective action plan to be developed.`,
            priority: getPriority(hazard.severity),
            status: 'Pending',
            assignedDate: hazard.reportedDate,
            dueDate: '2025-02-28', // Placeholder logic 
            assignedBy: 'Safety Manager',
            module: 'Safety Management',
            contributors: [],
            sections: [
              { name: 'Root Cause Analysis', status: 'pending' },
              { name: 'Corrective Action Plan', status: 'pending' }
            ],
            sectionsComplete: 0,
            totalSections: 2,
            progress: 0,
            link: `/safety/hazards`,
            recentActivity: [] as any[]
          } as ActionItem);
        }
      }

      // 2. Approvals (Line Manager / Exec)
      if (hazard.workflowStage === WORKFLOW_STAGES.MANAGER_APPROVAL && userRole === 'lead') {
        tasks.push({
          id: `HzTask-${hazard.id}-Approve`,
          title: `Review & Approve Hazard Report: ${hazard.id}`,
          description: `Review proposed corrective actions for hazard "${hazard.title}".`,
          priority: 'High',
          status: 'Pending',
          assignedDate: hazard.reportedDate,
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          assignedBy: 'Safety Manager',
          module: 'Safety Management',
          contributors: [],
          sections: [
            { name: 'Review Plan', status: 'pending' },
            { name: 'Approval Decision', status: 'pending' }
          ],
          sectionsComplete: 0,
          totalSections: 2,
          progress: 0,
          link: `/safety/hazard-workflow/${hazard.id}`,
          recentActivity: [] as any[]
        } as ActionItem);
      }

      // 3. Execution (Implementation)
      if (hazard.workflowStage === WORKFLOW_STAGES.IMPLEMENTATION) {
        // Check if user is an executer
        const isExecuter = hazard.mitigationAssignments?.executers?.some((e: any) => e.value === 'Current User') || userRole === 'maintenance';

        if (isExecuter) {
          tasks.push({
            id: `HzTask-${hazard.id}-Exec`,
            title: `Implement Corrective Actions: ${hazard.id}`,
            description: `Execute the approved corrective actions for hazard "${hazard.title}".`,
            priority: getPriority(hazard.severity),
            status: 'In Progress',
            assignedDate: hazard.reportedDate,
            dueDate: '2025-03-15', // Fallback 
            assignedBy: hazard.mitigationAssignments?.processOwner?.[0]?.value || 'Process Owner',
            module: 'Safety Management',
            contributors: [],
            sections: [
              { name: 'Implementation', status: 'in-progress' },
              { name: 'Verification', status: 'pending' }
            ],
            sectionsComplete: 0,
            totalSections: 2,
            progress: 30, // Mock progress
            link: `/safety/hazards`,
            recentActivity: [] as any[]
          } as ActionItem);
        }
      }

      // 4. Contributors (General)
      if (hazard.mitigationAssignments?.contributors?.some((c: any) => c.value === 'Current User')) {
        tasks.push({
          id: `HzTask-${hazard.id}-Contrib`,
          title: `Contribute to Hazard Report: ${hazard.id}`,
          description: `You are listed as a contributor for hazard "${hazard.title}". Please provide input.`,
          priority: 'Low',
          status: 'Pending',
          assignedDate: hazard.reportedDate,
          dueDate: new Date().toISOString().split('T')[0],
          assignedBy: 'Safety Manager',
          module: 'Safety Management',
          contributors: [],
          sections: [],
          sectionsComplete: 0,
          totalSections: 1,
          progress: 0,
          link: `/safety/hazard-workflow/${hazard.id}`,
          recentActivity: [] as any[]
        } as ActionItem);
      }
    });

    return tasks;
  };

  // Derive action items from Waiver approval chain
  const getWaiverApprovalTasks = (): ActionItem[] => {
    const tasks: ActionItem[] = [];
    const isAdmin = userRole === 'admin' || userRole === 'safety';
    const isLeadTeam = userRole === 'lead' || userRole === 'vp';

    // Mock waiver data — in a real app this would come from shared state/context
    // Safety Manager pending waivers
    if (isAdmin) {
      const smPendingWaivers = [
        {
          id: 'WV-SD-001',
          title: 'Night Operations Waiver - KTEB',
          requestor: 'Chris Brown',
          date: '2024-02-05',
          priority: 'Medium',
          pendingRole: 'Safety Manager'
        }
      ];

      smPendingWaivers.forEach(waiver => {
        tasks.push({
          id: `WaiverTask-${waiver.id}`,
          title: `Waiver Approval: ${waiver.title}`,
          description: `${waiver.requestor} has submitted a waiver request requiring your review as ${waiver.pendingRole}.`,
          priority: (waiver.priority as 'Critical' | 'High' | 'Medium' | 'Low'),
          status: 'Pending',
          assignedDate: waiver.date,
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          assignedBy: waiver.requestor,
          module: 'Waiver Approval',
          contributors: [
            { id: 'c1', name: waiver.requestor, role: 'Requestor', avatar: waiver.requestor.split(' ').map(n => n[0]).join('') },
            { id: 'c2', name: 'Safety Manager', role: 'Reviewer', avatar: 'SM' }
          ],
          sections: [
            { name: 'Waiver Submitted', status: 'completed' },
            { name: 'Safety Manager Review', status: 'pending' },
            { name: 'Lead Team Approval', status: 'pending' }
          ],
          sectionsComplete: 1,
          totalSections: 3,
          progress: 33,
          link: '/safety',
          recentActivity: [
            { id: 1, user: { name: waiver.requestor, avatar: waiver.requestor.split(' ').map(n => n[0]).join('') }, action: 'submitted waiver request for Night Operations at KTEB. Justification: Operational necessity due to delayed inbound aircraft. Regulation: 14 CFR 91.175 — reduced visibility minimums requested.', time: '2 days ago' },
            { id: 2, user: { name: 'System', avatar: 'SY' }, action: 'routed waiver to Safety Manager for initial review.', time: '2 days ago' }
          ]
        } as ActionItem);
      });
    }

    // Lead Team pending waivers (forwarded by Safety Manager)
    if (isLeadTeam) {
      const leadPendingWaivers = [
        {
          id: 'WV-SD-002',
          title: 'Weather Minimum Waiver - KJFK',
          requestor: 'Mike Johnson',
          forwardedBy: 'Tom Anderson (Safety Manager)',
          date: '2024-02-03',
          priority: 'High',
          pendingRole: 'Chief Pilot'
        }
      ];

      leadPendingWaivers.forEach(waiver => {
        tasks.push({
          id: `WaiverTask-${waiver.id}`,
          title: `Waiver Final Approval: ${waiver.title}`,
          description: `Safety Manager has reviewed and approved this waiver from ${waiver.requestor}. Your final approval as ${waiver.pendingRole} is required.`,
          priority: (waiver.priority as 'Critical' | 'High' | 'Medium' | 'Low'),
          status: 'Pending',
          assignedDate: waiver.date,
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          assignedBy: waiver.forwardedBy,
          module: 'Waiver Approval',
          contributors: [
            { id: 'c1', name: waiver.requestor, role: 'Requestor', avatar: waiver.requestor.split(' ').map(n => n[0]).join('') },
            { id: 'c2', name: waiver.forwardedBy.split(' (')[0], role: 'Safety Manager', avatar: 'TA' }
          ],
          sections: [
            { name: 'Waiver Submitted', status: 'completed' },
            { name: 'Safety Manager Review', status: 'completed' },
            { name: 'Chief Pilot / Lead Team Approval', status: 'pending' }
          ],
          sectionsComplete: 2,
          totalSections: 3,
          progress: 66,
          link: '/safety',
          recentActivity: [
            { id: 1, user: { name: waiver.requestor, avatar: waiver.requestor.split(' ').map(n => n[0]).join('') }, action: 'submitted waiver request for Weather Minimum reduction at KJFK. Justification: Time-critical cargo delivery with weather expected to improve within 2 hours. Regulation: 14 CFR 91.175(c) — approach visibility reduced from 1 SM to ¾ SM.', time: '4 days ago' },
            { id: 2, user: { name: 'System', avatar: 'SY' }, action: 'routed waiver to Safety Manager Tom Anderson for initial review.', time: '4 days ago' },
            { id: 3, user: { name: 'Tom Anderson', avatar: 'TA' }, action: 'reviewed and approved waiver with comments: "Risk assessment shows acceptable risk level with enhanced crew briefing. Recommend approval contingent on experienced crew pairing and alternate airport within 30 minutes flight time."', time: '1 day ago' },
            { id: 4, user: { name: 'System', avatar: 'SY' }, action: 'forwarded waiver to Chief Pilot for final approval.', time: '1 day ago' }
          ]
        } as ActionItem);
      });
    }

    return tasks;
  };

  // Apply decision state to waiver tasks
  const applyWaiverDecisions = (items: ActionItem[]): ActionItem[] => {
    return items.map(item => {
      const decision = waiverDecisions[item.id];
      if (!decision || item.module !== 'Waiver Approval') return item;

      if (decision.decision === 'approved') {
        return {
          ...item,
          status: 'Completed' as const,
          progress: 100,
          sections: item.sections.map(s => ({ ...s, status: 'completed' as const })),
          sectionsComplete: item.totalSections
        };
      } else if (decision.decision === 'denied') {
        return {
          ...item,
          status: 'Completed' as const,
          progress: 100,
          sections: [
            ...item.sections.filter(s => s.status === 'completed'),
            { name: 'Decision: Denied', status: 'completed' as const }
          ],
          sectionsComplete: item.totalSections,
          totalSections: item.totalSections
        };
      } else {
        // in-progress
        return {
          ...item,
          status: 'In Progress' as const,
          progress: Math.max(item.progress, 75),
          sections: item.sections.map(s =>
            s.status === 'pending' ? { ...s, status: 'in-progress' as const } : s
          )
        };
      }
    });
  };

  const userActionItems = applyWaiverDecisions([...getUserActionItems(MOCK_ACTION_ITEMS, userRole), ...getHazardTasks(), ...getWaiverApprovalTasks(), ...getAuditTasks()]);
  const actionItemsStats = getStats(userActionItems);

  // Surface pending waiver decisions as events (publish is idempotent by id)
  useEffect(() => {
    userActionItems
      .filter(item => item.module === 'Waiver Approval' && item.status === 'Pending')
      .forEach(waiver => {
        eventStore.publish({
          id: `waiver-pending:${waiver.id}`,
          severity: 'warn',
          title: `Waiver pending your decision: ${waiver.title.replace('Waiver Final Approval: ', '').replace('Waiver Approval: ', '')}`,
          detail: waiver.description,
          module: 'Waiver Approval',
          link: '/tasks-action-items',
          audienceRoles: ['lead', 'admin'],
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get personal task stats
  const getPersonalTaskStats = () => {
    const total = personalTasks.length;
    const active = personalTasks.filter(t => t.status === 'In Progress').length;
    const completed = personalTasks.filter(t => t.status === 'Completed').length;
    const collaborativeCount = personalTasks.filter(t => t.collaborators.length > 1).length;

    return { total, active, completed, collaborativeCount };
  };

  const personalTasksStats = getPersonalTaskStats();

  // Filter functions
  // Priority ranking for sorting (lower number = higher priority = shown first)
  const priorityRank: Record<string, number> = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };

  // Check if an item needs attention (critical/high priority and still pending)
  const needsAttention = (item: ActionItem) => {
    return (item.priority === 'Critical' || item.priority === 'High') && item.status === 'Pending';
  };

  const getFilteredActionItems = () => {
    return userActionItems
      .filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || item.status.toLowerCase().replace(' ', '') === statusFilter;
        const matchesPriority = priorityFilter === 'all' || item.priority.toLowerCase() === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        // Items needing attention always come first
        const aAttention = needsAttention(a) ? 0 : 1;
        const bAttention = needsAttention(b) ? 0 : 1;
        if (aAttention !== bAttention) return aAttention - bAttention;

        // Then sort by priority
        const aPriority = priorityRank[a.priority] ?? 99;
        const bPriority = priorityRank[b.priority] ?? 99;
        if (aPriority !== bPriority) return aPriority - bPriority;

        // Newest first within same priority (by assigned date, descending)
        return (b.assignedDate || '').localeCompare(a.assignedDate || '');
      });
  };

  const getFilteredPersonalTasks = () => {
    return personalTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || task.status.toLowerCase().replace(' ', '') === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority.toLowerCase() === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  };

  // Event handlers
  const handleCreatePersonalTask = () => {
    if (!newPersonalTaskForm.title.trim() || !newPersonalTaskForm.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newTask: PersonalTask = {
      id: `PT${String(personalTasks.length + 1).padStart(3, '0')}`,
      title: newPersonalTaskForm.title,
      description: newPersonalTaskForm.description,
      priority: newPersonalTaskForm.priority,
      status: 'Pending',
      dueDate: newPersonalTaskForm.dueDate,
      createdDate: new Date().toISOString().split('T')[0],
      progress: 0,
      tags: newPersonalTaskForm.tags.filter(tag => tag.trim() !== ''),
      collaborators: [
        { id: 'me', name: 'You', role: userRole, avatar: 'ME' },
        ...newPersonalTaskForm.collaborators.map(userId => {
          const user = availableUsers.find(u => u.id === userId);
          return user ? {
            id: user.id,
            name: user.name,
            role: user.role,
            avatar: user.name.split(' ').map(n => n[0]).join('')
          } : null;
        }).filter(Boolean) as any[]
      ],
      sections: newPersonalTaskForm.sections.filter(section => section.trim() !== '').map(section => ({
        name: section,
        status: 'pending' as const,
        progress: 0
      })),
      sectionsComplete: 0,
      totalSections: newPersonalTaskForm.sections.filter(section => section.trim() !== '').length,
      isPersonal: true
    };

    setPersonalTasks([...personalTasks, newTask]);
    setNewPersonalTaskForm({
      title: '',
      description: '',
      priority: 'Medium',
      dueDate: '',
      tags: [''],
      sections: [''],
      collaborators: []
    });
    setIsNewPersonalTaskDialogOpen(false);

    toast.success('Personal Task Created', {
      description: `"${newTask.title}" has been added to your tasks.`
    });
  };

  const handleDeletePersonalTask = (taskId: string) => {
    setPersonalTasks(personalTasks.filter(task => task.id !== taskId));
    toast.success('Task Deleted', {
      description: 'Personal task has been removed.'
    });
  };

  const handleUpdatePersonalTaskProgress = (taskId: string, newProgress: number, sectionUpdates?: any[]) => {
    setPersonalTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        let updatedSections = task.sections;
        let sectionsComplete = task.sectionsComplete;

        if (sectionUpdates) {
          updatedSections = sectionUpdates;
          sectionsComplete = sectionUpdates.filter(section => section.status === 'completed').length;
        }

        return {
          ...task,
          progress: newProgress,
          sections: updatedSections,
          sectionsComplete,
          status: newProgress === 100 ? 'Completed' as const : newProgress > 0 ? 'In Progress' as const : 'Pending' as const
        };
      }
      return task;
    }));

    setIsUpdatePersonalTaskProgressOpen(false);
    setUpdatingPersonalTask(null);
    toast.success('Progress Updated', {
      description: 'Personal task progress has been updated successfully.'
    });
  };

  const handleOpenActionItemProgressDialog = (actionItem: ActionItem) => {
    setUpdatingActionItem(actionItem);
    // Initialize the sections state for the dialog
    setUpdatedSections(actionItem.sections.map(section => ({
      name: section.name,
      status: section.status
    })));
    setUpdateComment('');
    setNewSectionName('');
    setIsUpdateProgressDialogOpen(true);
  };

  const handleSubmitActionItemProgress = () => {
    if (!updateComment.trim()) {
      toast.error('Please provide a progress comment');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsUpdateProgressDialogOpen(false);
      setUpdatingActionItem(null);
      setUpdatedSections([]);
      setUpdateComment('');
      setNewSectionName('');

      toast.success('Action Item Progress Updated', {
        description: 'Progress has been updated successfully.'
      });
    }, 1000);
  };

  const addTagField = () => {
    setNewPersonalTaskForm({
      ...newPersonalTaskForm,
      tags: [...newPersonalTaskForm.tags, '']
    });
  };

  const addSectionField = () => {
    setNewPersonalTaskForm({
      ...newPersonalTaskForm,
      sections: [...newPersonalTaskForm.sections, '']
    });
  };

  const removeTagField = (index: number) => {
    const newTags = newPersonalTaskForm.tags.filter((_, i) => i !== index);
    setNewPersonalTaskForm({
      ...newPersonalTaskForm,
      tags: newTags.length > 0 ? newTags : ['']
    });
  };

  const removeSectionField = (index: number) => {
    const newSections = newPersonalTaskForm.sections.filter((_, i) => i !== index);
    setNewPersonalTaskForm({
      ...newPersonalTaskForm,
      sections: newSections.length > 0 ? newSections : ['']
    });
  };

  const updateTagField = (index: number, value: string) => {
    const newTags = [...newPersonalTaskForm.tags];
    newTags[index] = value;
    setNewPersonalTaskForm({
      ...newPersonalTaskForm,
      tags: newTags
    });
  };

  const updateSectionField = (index: number, value: string) => {
    const newSections = [...newPersonalTaskForm.sections];
    newSections[index] = value;
    setNewPersonalTaskForm({
      ...newPersonalTaskForm,
      sections: newSections
    });
  };

  const TaskCard = ({ task, isActionItem = false }: { task: ActionItem | PersonalTask, isActionItem?: boolean }) => {
    const isUrgent = isActionItem && needsAttention(task as ActionItem);

    return (
      <Card className={`border-l-4 ${getBorderColor(task.priority)} ${isUrgent ? 'ring-2 ring-red-400/50 shadow-md' : ''}`}>
        <CardContent className="p-6">
          {/* Attention Banner */}
          {isUrgent && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">Needs Your Attention</span>
              <Badge className="bg-red-600 text-white text-xs ml-auto">{(task as ActionItem).priority}</Badge>
            </div>
          )}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-medium">
                  {(task as any).auditId ? (
                    <button 
                      onClick={() => {
                        const originalAudit = audits.find(a => a.id === (task as any).auditId);
                        if (originalAudit) {
                          setDrawerAudit(originalAudit);
                          setDrawerOpen(true);
                        }
                      }}
                      className="hover:underline text-blue-600 text-left font-medium"
                    >
                      {task.title}
                    </button>
                  ) : (task as any).link ? (
                    <Link to={(task as any).link} className="hover:underline text-blue-600">
                      {task.title}
                    </Link>
                  ) : (
                    task.title
                  )}
                </h3>
                <Badge className={task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'}>
                  {task.status.toUpperCase()}
                </Badge>
                {isActionItem && (
                  <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                    {(task as ActionItem).module === 'Waiver Approval' ? 'WAIVER APPROVAL' : 'ACTION ITEM'}
                  </Badge>
                )}
                {!isActionItem && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                    PERSONAL
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {('contributors' in task) ? task.contributors.length : task.collaborators.length}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-3">
                {isActionItem
                  ? `${(task as ActionItem).module} • Assigned by ${(task as ActionItem).assignedBy}`
                  : `Personal Task • Created ${formatDate((task as PersonalTask).createdDate)}`
                }
              </p>
              <p className="text-sm mb-4">{task.description}</p>

              {/* Contributors/Collaborators */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-medium">
                  {isActionItem ? 'Contributors:' : 'Collaborators:'}
                </span>
                <div className="flex -space-x-2">
                  {(('contributors' in task) ? task.contributors : task.collaborators).map((person) => (
                    <Avatar key={person.id} className="w-8 h-8 border-2 border-white">
                      <AvatarFallback className="text-xs">{person.avatar}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {!isActionItem && (
                  <Button variant="ghost" size="sm" className="text-xs h-8 px-3">
                    <UserPlus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
            <div className="ml-6 text-right">
              <div className="text-xs text-muted-foreground">
                {isActionItem
                  ? `Started ${formatDate((task as ActionItem).assignedDate)}`
                  : `Created ${formatDate((task as PersonalTask).createdDate)}`
                }
              </div>
              <div className="text-xs text-muted-foreground">
                Target: {formatDate(task.dueDate)}
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Progress</h4>
              <Badge variant="outline" className="text-xs">
                {task.sectionsComplete} of {task.totalSections} sections complete
              </Badge>
            </div>
            <Progress value={task.progress} className="mb-3" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {task.sections.map((section, index) => (
                <div key={index} className="flex items-center gap-2">
                  {section.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {section.status === 'in-progress' && <Clock className="w-4 h-4 text-yellow-500" />}
                  {section.status === 'pending' && <MessageSquare className="w-4 h-4 text-blue-500" />}
                  <span>{section.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tags for personal tasks */}
          {!isActionItem && (task as PersonalTask).tags.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-sm mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {(task as PersonalTask).tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                Due: {formatDate(task.dueDate)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                On track
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isActionItem) {
                    setSelectedActionItem(task as ActionItem);
                    setIsActionItemDialogOpen(true);
                  } else {
                    setSelectedPersonalTask(task as PersonalTask);
                    setIsPersonalTaskDialogOpen(true);
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
              {/* Waiver items get "Make Decision", other items get "Update Progress" */}
              {isActionItem && (task as ActionItem).module === 'Waiver Approval' ? (
                waiverDecisions[(task as ActionItem).id] ? (
                  <Badge className={`text-sm py-1.5 px-3 ${waiverDecisions[(task as ActionItem).id].decision === 'approved' ? 'bg-green-600 text-white' :
                    waiverDecisions[(task as ActionItem).id].decision === 'denied' ? 'bg-red-600 text-white' :
                      'bg-blue-600 text-white'
                    }`}>
                    {waiverDecisions[(task as ActionItem).id].decision === 'approved' && <><ThumbsUp className="w-3.5 h-3.5 mr-1.5" /> Approved</>}
                    {waiverDecisions[(task as ActionItem).id].decision === 'denied' && <><ThumbsDown className="w-3.5 h-3.5 mr-1.5" /> Denied</>}
                    {waiverDecisions[(task as ActionItem).id].decision === 'in-progress' && <><ArrowRight className="w-3.5 h-3.5 mr-1.5" /> In Progress</>}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                      setDecidingWaiverItem(task as ActionItem);
                      setWaiverDecision('');
                      setWaiverDecisionComment('');
                      setIsWaiverDecisionDialogOpen(true);
                    }}
                  >
                    <Gavel className="w-4 h-4 mr-2" />
                    Make Decision
                  </Button>
                )
              ) : (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (isActionItem) {
                      handleOpenActionItemProgressDialog(task as ActionItem);
                    } else {
                      setUpdatingPersonalTask(task as PersonalTask);
                      setIsUpdatePersonalTaskProgressOpen(true);
                    }
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Update Progress
                </Button>
              )}
              {!isActionItem && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingPersonalTask(task as PersonalTask);
                    setIsEditPersonalTaskDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <AuditDetailDrawer
        audit={drawerAudit}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerAudit(null); }}
      />
      
      {/* Header */}
      <div className="text-center">
        <h1>Tasks & Action Items</h1>
        <p className="text-muted-foreground">
          Manage assigned action items and personal tasks in one unified workspace
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="action-items" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Action Items
            <Badge variant="secondary" className="ml-2">
              {actionItemsStats.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="personal-tasks" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            My Tasks
            <Badge variant="secondary" className="ml-2">
              {personalTasksStats.active}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks and action items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inprogress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Items Tab */}
        <TabsContent value="action-items" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="p-4">
                <Activity className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{actionItemsStats.active}</div>
                <div className="text-sm text-muted-foreground">Active Items</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{actionItemsStats.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold">{actionItemsStats.totalContributors}</div>
                <div className="text-sm text-muted-foreground">Contributors</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Target className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">{actionItemsStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </CardContent>
            </Card>
          </div>

          {/* Action Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2>Assigned Action Items</h2>
              {(userRole === 'lead' || userRole === 'admin') && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Action Item
                </Button>
              )}
            </div>

            {getFilteredActionItems().length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No Action Items</h3>
                  <p className="text-muted-foreground">
                    You don't have any action items assigned at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              getFilteredActionItems().map((item) => (
                <TaskCard key={item.id} task={item} isActionItem={true} />
              ))
            )}
          </div>
        </TabsContent>

        {/* Personal Tasks Tab */}
        <TabsContent value="personal-tasks" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="p-4">
                <User className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{personalTasksStats.active}</div>
                <div className="text-sm text-muted-foreground">Active Tasks</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{personalTasksStats.completed}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Share2 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold">{personalTasksStats.collaborativeCount}</div>
                <div className="text-sm text-muted-foreground">Collaborative</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Star className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">{personalTasksStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Tasks</div>
              </CardContent>
            </Card>
          </div>

          {/* Personal Tasks List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2>My Personal Tasks</h2>
              <Button onClick={() => setIsNewPersonalTaskDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Personal Task
              </Button>
            </div>

            {getFilteredPersonalTasks().length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No Personal Tasks</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first personal task to get started with personal goal tracking.
                  </p>
                  <Button onClick={() => setIsNewPersonalTaskDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Personal Task
                  </Button>
                </CardContent>
              </Card>
            ) : (
              getFilteredPersonalTasks().map((task) => (
                <TaskCard key={task.id} task={task} isActionItem={false} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* New Personal Task Dialog */}
      <Dialog open={isNewPersonalTaskDialogOpen} onOpenChange={setIsNewPersonalTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Personal Task</DialogTitle>
            <DialogDescription>
              Create a personal task to track your own goals and collaborate with others.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={newPersonalTaskForm.title}
                onChange={(e) => setNewPersonalTaskForm({
                  ...newPersonalTaskForm,
                  title: e.target.value
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your task"
                value={newPersonalTaskForm.description}
                onChange={(e) => setNewPersonalTaskForm({
                  ...newPersonalTaskForm,
                  description: e.target.value
                })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newPersonalTaskForm.priority}
                  onValueChange={(value: 'Critical' | 'High' | 'Medium' | 'Low') =>
                    setNewPersonalTaskForm({
                      ...newPersonalTaskForm,
                      priority: value
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newPersonalTaskForm.dueDate}
                  onChange={(e) => setNewPersonalTaskForm({
                    ...newPersonalTaskForm,
                    dueDate: e.target.value
                  })}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              {newPersonalTaskForm.tags.map((tag, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Enter tag"
                    value={tag}
                    onChange={(e) => updateTagField(index, e.target.value)}
                  />
                  {newPersonalTaskForm.tags.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => removeTagField(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTagField}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tag
              </Button>
            </div>

            {/* Sections */}
            <div className="space-y-2">
              <Label>Task Sections</Label>
              {newPersonalTaskForm.sections.map((section, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Enter section name"
                    value={section}
                    onChange={(e) => updateSectionField(index, e.target.value)}
                  />
                  {newPersonalTaskForm.sections.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => removeSectionField(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSectionField}>
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>

            {/* Collaborators */}
            <div className="space-y-2">
              <Label>Invite Collaborators (Optional)</Label>
              <Select
                value=""
                onValueChange={(userId: string) => {
                  if (!newPersonalTaskForm.collaborators.includes(userId)) {
                    setNewPersonalTaskForm({
                      ...newPersonalTaskForm,
                      collaborators: [...newPersonalTaskForm.collaborators, userId]
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select users to collaborate" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.filter(user =>
                    !newPersonalTaskForm.collaborators.includes(user.id)
                  ).map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} - {user.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {newPersonalTaskForm.collaborators.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-2">Selected collaborators:</p>
                  <div className="flex flex-wrap gap-2">
                    {newPersonalTaskForm.collaborators.map(userId => {
                      const user = availableUsers.find(u => u.id === userId);
                      return user ? (
                        <Badge key={userId} variant="outline" className="flex items-center gap-1">
                          {user.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => setNewPersonalTaskForm({
                              ...newPersonalTaskForm,
                              collaborators: newPersonalTaskForm.collaborators.filter(id => id !== userId)
                            })}
                          >
                            ×
                          </Button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsNewPersonalTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePersonalTask}>
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Item Dialogs */}
      {selectedActionItem && (
        <DetailsDialog
          item={selectedActionItem}
          isOpen={isActionItemDialogOpen}
          onClose={() => {
            setIsActionItemDialogOpen(false);
            setSelectedActionItem(null);
          }}
        />
      )}

      {updatingActionItem && (
        <UpdateProgressDialog
          isOpen={isUpdateProgressDialogOpen}
          onClose={() => {
            setIsUpdateProgressDialogOpen(false);
            setUpdatingActionItem(null);
          }}
          selectedItem={updatingActionItem}
          updatedSections={updatedSections}
          setUpdatedSections={setUpdatedSections}
          updateComment={updateComment}
          setUpdateComment={setUpdateComment}
          newSectionName={newSectionName}
          setNewSectionName={setNewSectionName}
          onSubmit={handleSubmitActionItemProgress}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Personal Task Progress Update Dialog */}
      {updatingPersonalTask && (
        <Dialog open={isUpdatePersonalTaskProgressOpen} onOpenChange={setIsUpdatePersonalTaskProgressOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Update Task Progress</DialogTitle>
              <DialogDescription>
                Update the progress for "{updatingPersonalTask.title}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Overall Progress */}
              <div className="space-y-3">
                <Label>Overall Progress</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Progress: {updatingPersonalTask.progress}%</span>
                    <Badge variant="outline">
                      {updatingPersonalTask.sectionsComplete} of {updatingPersonalTask.totalSections} sections complete
                    </Badge>
                  </div>
                  <Progress value={updatingPersonalTask.progress} />
                </div>
              </div>

              {/* Section Progress */}
              <div className="space-y-3">
                <Label>Section Progress</Label>
                <div className="space-y-3">
                  {updatingPersonalTask.sections.map((section, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {section.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        {section.status === 'in-progress' && <Clock className="w-5 h-5 text-yellow-500" />}
                        {section.status === 'pending' && <MessageSquare className="w-5 h-5 text-gray-400" />}
                        <span className="font-medium">{section.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={section.status}
                          onValueChange={(newStatus: 'pending' | 'in-progress' | 'completed') => {
                            const updatedSections = [...updatingPersonalTask.sections];
                            updatedSections[index] = {
                              ...section,
                              status: newStatus,
                              progress: newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? 50 : 0
                            };
                            const completedCount = updatedSections.filter(s => s.status === 'completed').length;
                            const newProgress = Math.round((completedCount / updatedSections.length) * 100);

                            setUpdatingPersonalTask({
                              ...updatingPersonalTask,
                              sections: updatedSections,
                              sectionsComplete: completedCount,
                              progress: newProgress
                            });
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Progress Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about your progress..."
                  value={updatingPersonalTask.notes || ''}
                  onChange={(e) => setUpdatingPersonalTask({
                    ...updatingPersonalTask,
                    notes: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsUpdatePersonalTaskProgressOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (updatingPersonalTask) {
                  handleUpdatePersonalTaskProgress(
                    updatingPersonalTask.id,
                    updatingPersonalTask.progress,
                    updatingPersonalTask.sections
                  );
                }
              }}>
                Update Progress
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Personal Task Details Dialog */}
      {selectedPersonalTask && (
        <Dialog open={isPersonalTaskDialogOpen} onOpenChange={setIsPersonalTaskDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPersonalTask.title}</DialogTitle>
              <DialogDescription>
                Personal Task Details • Created {formatDate(selectedPersonalTask.createdDate)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Task Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <Badge className={`mt-1 ${getBorderColor(selectedPersonalTask.priority).replace('border-l-4', 'bg')}`}>
                    {selectedPersonalTask.priority}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={`mt-1 ${selectedPersonalTask.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    selectedPersonalTask.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {selectedPersonalTask.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="mt-1">{formatDate(selectedPersonalTask.dueDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Progress</Label>
                  <div className="mt-1 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{selectedPersonalTask.progress}%</span>
                      <span>{selectedPersonalTask.sectionsComplete} of {selectedPersonalTask.totalSections} sections</span>
                    </div>
                    <Progress value={selectedPersonalTask.progress} />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedPersonalTask.description}</p>
              </div>

              {/* Tags */}
              {selectedPersonalTask.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedPersonalTask.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Collaborators */}
              <div>
                <Label className="text-sm font-medium">Collaborators</Label>
                <div className="mt-2 space-y-2">
                  {selectedPersonalTask.collaborators.map((collaborator) => (
                    <div key={collaborator.id} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">{collaborator.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{collaborator.name}</p>
                        <p className="text-xs text-muted-foreground">{collaborator.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sections */}
              <div>
                <Label className="text-sm font-medium">Task Sections</Label>
                <div className="mt-2 space-y-3">
                  {selectedPersonalTask.sections.map((section, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                      {section.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {section.status === 'in-progress' && <Clock className="w-5 h-5 text-yellow-500" />}
                      {section.status === 'pending' && <MessageSquare className="w-5 h-5 text-gray-400" />}
                      <div className="flex-1">
                        <span className="font-medium">{section.name}</span>
                        <div className="mt-1">
                          <Progress value={section.progress} className="h-2" />
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {section.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedPersonalTask.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedPersonalTask.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPersonalTaskDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setIsPersonalTaskDialogOpen(false);
                setUpdatingPersonalTask(selectedPersonalTask);
                setIsUpdatePersonalTaskProgressOpen(true);
              }}>
                Update Progress
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Waiver Decision Dialog */}
      {decidingWaiverItem && (
        <Dialog open={isWaiverDecisionDialogOpen} onOpenChange={setIsWaiverDecisionDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-600" />
                Waiver Decision
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Review and make a decision on this waiver request.
              </p>
            </DialogHeader>

            <div className="space-y-4">
              {/* Waiver Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium">{decidingWaiverItem.title}</h4>
                <p className="text-sm text-muted-foreground">{decidingWaiverItem.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={decidingWaiverItem.priority === 'High' ? 'bg-orange-100 text-orange-800' : decidingWaiverItem.priority === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                    {decidingWaiverItem.priority}
                  </Badge>
                  <Badge variant="outline">{decidingWaiverItem.status}</Badge>
                </div>
                {/* Progress sections */}
                <div className="mt-3 space-y-1">
                  {decidingWaiverItem.sections.map((section, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {section.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                      {section.status === 'pending' && <Clock className="w-3.5 h-3.5 text-gray-400" />}
                      {section.status === 'in-progress' && <Clock className="w-3.5 h-3.5 text-yellow-500" />}
                      <span className={section.status === 'completed' ? 'text-muted-foreground line-through' : ''}>{section.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Options */}
              <div>
                <Label className="text-sm font-medium block mb-3">Your Decision</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={waiverDecision === 'approved' ? 'default' : 'outline'}
                    className={waiverDecision === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-50 hover:border-green-300'}
                    onClick={() => setWaiverDecision('approved')}
                  >
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant={waiverDecision === 'denied' ? 'default' : 'outline'}
                    className={waiverDecision === 'denied' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-50 hover:border-red-300'}
                    onClick={() => setWaiverDecision('denied')}
                  >
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Deny
                  </Button>
                  <Button
                    variant={waiverDecision === 'in-progress' ? 'default' : 'outline'}
                    className={waiverDecision === 'in-progress' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-blue-50 hover:border-blue-300'}
                    onClick={() => setWaiverDecision('in-progress')}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    In Progress
                  </Button>
                </div>
              </div>

              {/* Comment */}
              <div>
                <Label className="text-sm font-medium block mb-2">Comments {waiverDecision === 'denied' ? '(required)' : '(optional)'}</Label>
                <Textarea
                  placeholder={waiverDecision === 'denied' ? 'Provide reason for denial...' : 'Add any additional notes or reasoning...'}
                  value={waiverDecisionComment}
                  onChange={(e) => setWaiverDecisionComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsWaiverDecisionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!waiverDecision || (waiverDecision === 'denied' && !waiverDecisionComment.trim()) || isDecisionSubmitting}
                className={waiverDecision === 'approved' ? 'bg-green-600 hover:bg-green-700' : waiverDecision === 'denied' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
                onClick={() => {
                  if (!waiverDecision) return;
                  setIsDecisionSubmitting(true);
                  setTimeout(() => {
                    const decisionLabel = waiverDecision === 'approved' ? 'Approved' : waiverDecision === 'denied' ? 'Denied' : 'Marked In Progress';

                    // Notify the Safety Manager
                    eventStore.publish({
                      id: `waiver-decision:${decidingWaiverItem.id}`,
                      severity: waiverDecision === 'denied' ? 'warn' : 'info',
                      title: `Waiver ${decisionLabel.toLowerCase()}: ${decidingWaiverItem.title}`,
                      detail: `The waiver request has been ${decisionLabel.toLowerCase()} by the ${userRole === 'lead' ? 'Chief Pilot' : 'VP'}.${waiverDecisionComment ? ` Comment: ${waiverDecisionComment}` : ''}`,
                      module: 'Waiver Approval',
                      link: '/tasks-action-items',
                      audienceRoles: ['safety', 'admin'],
                    });

                    // Update the waiver decision tracking state
                    setWaiverDecisions(prev => ({
                      ...prev,
                      [decidingWaiverItem.id]: {
                        decision: waiverDecision,
                        comment: waiverDecisionComment
                      }
                    }));

                    toast.success(`Waiver ${decisionLabel}`, {
                      description: `${decidingWaiverItem.title} has been ${decisionLabel.toLowerCase()}. Safety Manager and submitter have been notified.`
                    });

                    setIsDecisionSubmitting(false);
                    setIsWaiverDecisionDialogOpen(false);
                    setDecidingWaiverItem(null);
                    setWaiverDecision('');
                    setWaiverDecisionComment('');
                  }, 800);
                }}
              >
                {isDecisionSubmitting ? 'Submitting...' : 'Submit Decision'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}