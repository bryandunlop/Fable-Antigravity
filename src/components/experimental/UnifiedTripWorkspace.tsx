import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useNavigate, useLocation } from 'react-router-dom';
import { SHARED_MOCK_TRIPS, INTL_CHECKLIST_TEMPLATE } from './mockData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { 
  Plane, 
  Users, 
  MessageSquare, 
  Shield, 
  Utensils, 
  FileText, 
  RefreshCw,
  AlertTriangle,
  Send,
  CheckCircle,
  Clock,
  MapPin,
  Upload,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Info,
  ArrowRight,
  Target,
  GanttChart,
  History,
  MessageCircle,
  Eye,
  ClipboardCheck,
  Search,
  CheckCircle2,
  FileEdit,
  Plus,
  CircleDot,
  Loader2,
  OctagonAlert,
  Sparkles,
  X
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: string;
  role: 'scheduling' | 'safety' | 'inflight' | 'pilot';
  text: string;
  timestamp: string;
}

interface DocStatus {
  name: string;
  status: 'Draft' | 'Submitted' | 'Synced' | 'Error' | 'Pending';
  type: string;
  lastUpdate: string;
  author?: string;
}

type MissionItemStatus = 'requested' | 'in-work' | 'blocked' | 'ready';
type MissionItemCategory = 'dispatch' | 'crew' | 'comms' | 'ground-ops' | 'customs' | 'permits';

interface MissionLogEntry {
  status: MissionItemStatus;
  comment: string;
  timestamp: string;
  user: string;
}

interface MissionItem {
  id: string;
  title: string;
  category: MissionItemCategory;
  status: MissionItemStatus;
  assignedTo: string;
  lastComment?: string;
  history: MissionLogEntry[];
  nudged?: boolean;
}

interface LateChange {
  id: string;
  field: string;
  type: 'logistics' | 'mission';
  timestamp: string;
  comment: string;
  acknowledgedBy: string[];
}

interface PassengerAlert {
  id: string;
  name: string;
  type: 'added' | 'removed';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_META: Record<MissionItemCategory, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  'dispatch': { label: 'Dispatch & Planning', icon: FileEdit, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'crew': { label: 'Crew Logistics', icon: Users, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'comms': { label: 'Communications', icon: MessageSquare, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  'ground-ops': { label: 'Handling & Services', icon: MapPin, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  'customs': { label: 'Customs & APIS', icon: Shield, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  'permits': { label: 'Permits & Authorizations', icon: FileText, color: 'text-amber-600', bgColor: 'bg-amber-50' },
};

const CATEGORY_ORDER: MissionItemCategory[] = ['dispatch', 'crew', 'comms', 'ground-ops', 'customs', 'permits'];


const COMMENT_PRESETS = [
  "Awaiting vendor response",
  "Confirmed via phone/email",
  "Document uploaded & verified",
  "Issue: missing document",
  "Handover initiated",
  "Pending FBO confirmation",
];

export interface TripData {
  tripId: string;
  route: string;
  tail: string;
  date: string;
  isMissionConfirmed: boolean;
  messages: Message[];
  docs: DocStatus[];
  missionItems: MissionItem[];
  lateChanges: LateChange[];
  passengerAlerts: PassengerAlert[];
  readinessScore: number;
  daysUntilDeparture: number;
}

export const MOCK_TRIPS: TripData[] = SHARED_MOCK_TRIPS.map(meta => {
  const isMissionConfirmed = meta.status === 'dispatched';
  const displayDate = new Date(meta.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const daysUntilDeparture = Math.floor((new Date(meta.departureDate).getTime() - new Date().getTime()) / 86400000);
  return {
    tripId: meta.tripNumber,
    route: meta.route,
    tail: meta.aircraft,
    date: displayDate,
    isMissionConfirmed: isMissionConfirmed,
    readinessScore: meta.readinessScore,
    daysUntilDeparture: daysUntilDeparture,
    messages: [
      { id: '1', sender: 'System Log', role: 'scheduling', text: `Mission file opened. INTL checklist actively tracked.`, timestamp: '08:00 AM' }
    ],
    docs: [
      { name: 'Flight Plan Package', status: 'Pending', type: 'Performance', lastUpdate: '-' },
      { name: 'Overflight Clearances', status: isMissionConfirmed ? 'Synced' : 'Pending', type: 'Performance', lastUpdate: '-' }
    ],
    // The checklist is generated once in mockData.ts (shared with the command center's run board)
    // so item statuses, readiness %, and blockers agree everywhere. History is synthesized for
    // blocked items only — the mock has no real event trail.
    missionItems: meta.checklist.map(item => ({
      id: item.id,
      title: item.title,
      category: item.category,
      status: item.status,
      assignedTo: item.assignedTo,
      lastComment: item.lastComment,
      nudged: item.nudged,
      history: item.status === 'blocked' && item.lastComment
        ? [{ status: 'blocked' as MissionItemStatus, comment: item.lastComment, timestamp: '09:00 AM', user: 'System' }]
        : [],
    })),
    lateChanges: [],
    passengerAlerts: []
  };
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UnifiedTripWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTripId, setActiveTripId] = useState(location.state?.tripId || 'TRP-2025-001');
  const [activeRole, setActiveRole] = useState<'scheduling' | 'safety' | 'inflight' | 'pilot'>('scheduling');
  
  // Feature State
  const [isMissionConfirmed, setIsMissionConfirmed] = useState(false);
  
  // Nudge Dialog State (Pilot → Scheduling)
  const [isNudgeDialogOpen, setIsNudgeDialogOpen] = useState(false);
  const [nudgeCategory, setNudgeCategory] = useState('');
  const [nudgeComment, setNudgeComment] = useState('');

  // Add Item State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<MissionItemCategory>('other');
  const [newItemAssignee, setNewItemAssignee] = useState('');
  const [showCannedItems, setShowCannedItems] = useState(true);

  // Quick Note Popover State
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Local state for the active trip
  const [messages, setMessages] = useState<Message[]>([]);
  const [docs, setDocs] = useState<DocStatus[]>([]);
  const [missionItems, setMissionItems] = useState<MissionItem[]>([]);
  const [lateChanges, setLateChanges] = useState<LateChange[]>([]);
  const [passengerAlerts, setPassengerAlerts] = useState<PassengerAlert[]>([]);

  const activeTrip = useMemo(() => MOCK_TRIPS.find(t => t.tripId === activeTripId) || MOCK_TRIPS[0], [activeTripId]);

  React.useEffect(() => {
    setIsMissionConfirmed(activeTrip.isMissionConfirmed);
    setMessages(activeTrip.messages);
    setDocs(activeTrip.docs);
    setMissionItems(activeTrip.missionItems);
    setLateChanges(activeTrip.lateChanges);
    setPassengerAlerts(activeTrip.passengerAlerts);
  }, [activeTrip]);

  // ─── Derived State ──────────────────────────────────────────────────────────

  const readyCount = missionItems.filter(i => i.status === 'ready').length;
  const blockedItems = missionItems.filter(i => i.status === 'blocked');
  const totalItems = missionItems.length;
  const allReady = readyCount === totalItems && totalItems > 0;
  const hasBlocked = blockedItems.length > 0;

  const categorizedItems = useMemo(() => {
    const map: Partial<Record<MissionItemCategory, MissionItem[]>> = {};
    for (const item of missionItems) {
      if (item.status === 'blocked') continue; // blocked items shown separately
      if (!map[item.category]) map[item.category] = [];
      map[item.category]!.push(item);
    }
    return map;
  }, [missionItems]);

  const getCategoryReadiness = (cat: MissionItemCategory) => {
    const items = missionItems.filter(i => i.category === cat);
    if (items.length === 0) return 100;
    const readyItems = items.filter(i => i.status === 'ready').length;
    return Math.round((readyItems / items.length) * 100);
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender: activeRole === 'scheduling' ? 'Sarah Miller' : activeRole === 'pilot' ? 'Capt. Johnson' : activeRole === 'inflight' ? 'Inflight Lead' : 'Safety Officer',
      role: activeRole,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const postSystemLog = (text: string) => {
    const chatMsg: Message = {
      id: Date.now().toString(),
      sender: 'System Log',
      role: 'scheduling',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(m => [...m, chatMsg]);
  };

  const updateItemStatus = (itemId: string, newStatus: MissionItemStatus, comment?: string) => {
    setMissionItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;

      const logComment = comment || `Status changed to ${newStatus}`;
      const newLog: MissionLogEntry = {
        status: newStatus,
        comment: logComment,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        user: 'Sarah M. (Scheduling)',
      };

      postSystemLog(`📋 ${item.title} → ${newStatus.toUpperCase()}${comment ? `: "${comment}"` : ''}`);

      // Trigger late change for significant moves
      if (newStatus === 'blocked') {
        setLateChanges(lc => [{
          id: Date.now().toString(),
          field: `${item.title} → BLOCKED`,
          type: 'logistics',
          timestamp: 'Just now',
          comment: logComment,
          acknowledgedBy: [],
        }, ...lc]);
      }

      return {
        ...item,
        status: newStatus,
        lastComment: logComment,
        history: [newLog, ...item.history],
        nudged: newStatus === 'ready' ? false : item.nudged,
      };
    }));

    toast.success(`Updated: ${newStatus.replace('-', ' ').toUpperCase()}`);
  };

  const addComment = (itemId: string, comment: string) => {
    if (!comment.trim()) return;
    setMissionItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newLog: MissionLogEntry = {
        status: item.status,
        comment,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        user: 'Sarah M. (Scheduling)',
      };
      postSystemLog(`💬 Note on ${item.title}: "${comment}"`);
      return { ...item, lastComment: comment, history: [newLog, ...item.history] };
    }));
    setActiveNoteId(null);
    setNoteText('');
    toast.success('Comment added');
  };

  const addNewItem = (title: string, category: MissionItemCategory, assignee: string) => {
    if (!title.trim()) return;
    const newItem: MissionItem = {
      id: `m${Date.now()}`,
      title: title.trim(),
      category,
      status: 'requested',
      assignedTo: assignee || 'Unassigned',
      history: [],
    };
    setMissionItems(prev => [...prev, newItem]);
    postSystemLog(`➕ New item added: ${title.trim()}`);
    setNewItemTitle('');
    setNewItemAssignee('');
    setIsAddItemOpen(false);
    toast.success('Item added to checklist');
  };

  const addCannedItem = (canned: { title: string; category: MissionItemCategory }) => {
    addNewItem(canned.title, canned.category, '');
  };

  const loadIntlTemplate = () => {
    const newItems: MissionItem[] = INTL_CHECKLIST_TEMPLATE.map((ci, i) => ({
      id: `m-intl-${Date.now()}-${i}`,
      title: ci.title,
      category: ci.category,
      status: 'requested',
      assignedTo: 'Unassigned',
      history: [],
    }));
    setMissionItems(prev => [...prev, ...newItems]);
    postSystemLog(`📋 INTL Checklist Template Loaded`);
    setIsAddItemOpen(false);
    toast.success('INTL Checklist applied');
  };

  const triggerNudge = () => {
    if (!nudgeComment.trim()) return;
    const catMap: Record<string, MissionItemCategory> = {
      'Permits & Slots': 'permits',
      'Ground Ops': 'ground-ops',
      'Customs & Immig.': 'customs',
      'Fuel Coordination': 'fuel',
    };
    const cat = catMap[nudgeCategory];
    if (cat) {
      setMissionItems(prev => prev.map(item => {
        if (item.category === cat && item.status !== 'ready') return { ...item, nudged: true };
        return item;
      }));
    }
    const nudgeMsg: Message = {
      id: Date.now().toString(),
      sender: 'Capt. Johnson',
      role: 'pilot',
      text: `🔔 Nudge (${nudgeCategory}): ${nudgeComment}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(m => [...m, nudgeMsg]);
    setIsNudgeDialogOpen(false);
    setNudgeComment('');
    toast.info(`Priority nudge sent to Scheduling for ${nudgeCategory}`);
  };

  const acknowledgeLateChange = (changeId: string) => {
    setLateChanges(prev => prev.map(lc => {
      if (lc.id === changeId) {
        const roleName = activeRole.charAt(0).toUpperCase() + activeRole.slice(1);
        if (!lc.acknowledgedBy.includes(roleName)) {
          return { ...lc, acknowledgedBy: [...lc.acknowledgedBy, roleName] };
        }
      }
      return lc;
    }));
    toast.success('Change acknowledged');
  };

  // ─── Sub-Components ─────────────────────────────────────────────────────────

  // ── Scheduling: Compact Readiness Strip ──

  const ReadinessSummary = () => {
    const statusCounts = {
      blocked: missionItems.filter(i => i.status === 'blocked').length,
      inWork: missionItems.filter(i => i.status === 'in-work').length,
      requested: missionItems.filter(i => i.status === 'requested').length,
      ready: readyCount,
    };

    return (
      <div className="mb-8 p-6 bg-white rounded-[2rem] shadow-xl border border-slate-100 relative overflow-hidden">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Progress Ring + Fraction */}
          <div className="flex items-center gap-6">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke={allReady ? '#10b981' : hasBlocked ? '#f43f5e' : '#0f172a'}
                  strokeWidth="3"
                  strokeDasharray={`${(readyCount / Math.max(totalItems, 1)) * 88} 88`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black text-slate-900 tabular-nums">{readyCount}/{totalItems}</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Mission Readiness</h3>
              <div className="flex items-center gap-3 mt-1.5">
                {statusCounts.blocked > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    <OctagonAlert className="h-3 w-3" /> {statusCounts.blocked} Blocked
                  </span>
                )}
                {statusCounts.inWork > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    <Loader2 className="h-3 w-3" /> {statusCounts.inWork} In Work
                  </span>
                )}
                {statusCounts.requested > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    <CircleDot className="h-3 w-3" /> {statusCounts.requested} New
                  </span>
                )}
                {statusCounts.ready > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> {statusCounts.ready} Ready
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Approve Button */}
          <Button
            onClick={() => setIsMissionConfirmed(!isMissionConfirmed)}
            disabled={hasBlocked}
            className={`h-12 px-8 font-black rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-95 text-sm ${
              isMissionConfirmed
                ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-400 hover:bg-emerald-100 shadow-emerald-100'
                : hasBlocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-slate-950 text-white hover:bg-slate-800'
            }`}
          >
            {isMissionConfirmed ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> HANDOVER COMPLETE</>
            ) : hasBlocked ? (
              <><OctagonAlert className="h-4 w-4 mr-2" /> RESOLVE BLOCKS FIRST</>
            ) : (
              'APPROVE FOR HANDOVER'
            )}
          </Button>
        </div>

        {/* Bottom: Segmented bar */}
        <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden flex">
          {statusCounts.ready > 0 && <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${(statusCounts.ready / totalItems) * 100}%` }} />}
          {statusCounts.inWork > 0 && <div className="h-full bg-blue-400 transition-all duration-700" style={{ width: `${(statusCounts.inWork / totalItems) * 100}%` }} />}
          {statusCounts.requested > 0 && <div className="h-full bg-slate-300 transition-all duration-700" style={{ width: `${(statusCounts.requested / totalItems) * 100}%` }} />}
          {statusCounts.blocked > 0 && <div className="h-full bg-rose-400 transition-all duration-700" style={{ width: `${(statusCounts.blocked / totalItems) * 100}%` }} />}
        </div>
      </div>
    );
  };

  // ── Scheduling: Checklist Item Row ──

  const ChecklistItemRow = ({ item }: { item: MissionItem }) => {
    const isReady = item.status === 'ready';
    const isBlocked = item.status === 'blocked';
    const isInWork = item.status === 'in-work';
    const isNew = item.status === 'requested';

    const statusIcon = isReady ? (
      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
        <Check className="h-4 w-4 text-white" strokeWidth={3} />
      </div>
    ) : isBlocked ? (
      <div className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center shadow-md shadow-rose-200 flex-shrink-0 animate-pulse">
        <OctagonAlert className="h-4 w-4 text-white" />
      </div>
    ) : isInWork ? (
      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-md shadow-blue-200 flex-shrink-0">
        <Loader2 className="h-4 w-4 text-white animate-spin" />
      </div>
    ) : (
      <div className="w-7 h-7 rounded-full border-2 border-slate-300 flex items-center justify-center flex-shrink-0 group-hover/row:border-slate-400 transition-colors">
        <CircleDot className="h-3.5 w-3.5 text-slate-300 group-hover/row:text-slate-400 transition-colors" />
      </div>
    );

    return (
      <div id={item.id} className={`group/row flex items-start gap-4 px-5 py-4 rounded-2xl border transition-all ${
        isReady
          ? 'bg-emerald-50/30 border-emerald-100 opacity-60 hover:opacity-90'
          : isBlocked
            ? 'bg-rose-50 border-rose-200 shadow-md shadow-rose-100/50'
            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
      }`}>
        {statusIcon}

        <div className="flex-1 min-w-0">
          {/* Title + Assignee */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm font-bold leading-tight ${isReady ? 'text-slate-500 line-through decoration-emerald-400 decoration-2' : 'text-slate-900'}`}>
                {item.title}
              </span>
              {item.nudged && !isReady && (
                <Badge className="bg-amber-500 text-white text-[8px] px-1.5 h-4 font-black animate-pulse flex-shrink-0">
                  PILOT REQUEST
                </Badge>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-400 flex-shrink-0 uppercase tracking-wider">{item.assignedTo}</span>
          </div>

          {/* Last comment */}
          {item.lastComment && (
            <p className={`text-[11px] mt-1.5 leading-relaxed ${isBlocked ? 'text-rose-700 font-bold' : 'text-slate-500 italic'}`}>
              "{item.lastComment}"
            </p>
          )}

          {/* Comment History (expandable for non-ready items) */}
          {item.history.length > 1 && !isReady && (
            <Collapsible>
              <CollapsibleTrigger className="text-[10px] font-bold text-blue-500 hover:text-blue-700 mt-1.5 flex items-center gap-1 transition-colors">
                <History className="h-3 w-3" /> {item.history.length} updates
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1.5 border-l-2 border-slate-100 pl-3 ml-1">
                  {item.history.map((log, i) => (
                    <div key={i} className="text-[10px] text-slate-500">
                      <span className="font-bold text-slate-600">{log.user}</span>
                      <span className="mx-1">·</span>
                      <span className="text-slate-400">{log.timestamp}</span>
                      <p className="text-slate-500 italic mt-0.5">"{log.comment}"</p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Action Buttons */}
          {!isReady && (
            <div className="flex items-center gap-2 mt-3">
              {/* Status Actions */}
              {isNew && (
                <button
                  onClick={() => updateItemStatus(item.id, 'in-work', 'Work started')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all active:scale-95"
                >
                  <ArrowRight className="h-3 w-3" /> Start
                </button>
              )}
              {(isNew || isInWork) && (
                <button
                  onClick={() => updateItemStatus(item.id, 'ready', 'Verified and confirmed')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all active:scale-95"
                >
                  <Check className="h-3 w-3" strokeWidth={3} /> Mark Ready
                </button>
              )}
              {isBlocked && (
                <button
                  onClick={() => updateItemStatus(item.id, 'in-work', 'Issue resolved, back in work')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all active:scale-95"
                >
                  <ArrowRight className="h-3 w-3" /> Resolve
                </button>
              )}
              {!isBlocked && (
                <button
                  onClick={() => updateItemStatus(item.id, 'blocked', 'Issue flagged')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-all active:scale-95"
                >
                  <OctagonAlert className="h-3 w-3" /> Flag Issue
                </button>
              )}

              {/* Add Note */}
              <Popover open={activeNoteId === item.id} onOpenChange={(open) => {
                setActiveNoteId(open ? item.id : null);
                if (!open) setNoteText('');
              }}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-all active:scale-95 ml-auto">
                    <MessageCircle className="h-3 w-3" /> Note
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8} className="w-80 rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
                  <div className="p-4 border-b bg-slate-50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Quick Presets</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMENT_PRESETS.map(preset => (
                        <button
                          key={preset}
                          onClick={() => setNoteText(preset)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                            noteText === preset
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full h-20 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 resize-none transition-all"
                      autoFocus
                    />
                    <Button
                      onClick={() => addComment(item.id, noteText)}
                      disabled={!noteText.trim()}
                      className="w-full mt-2 bg-slate-900 text-white rounded-xl font-black text-xs h-9 hover:bg-slate-800 transition-all active:scale-95"
                    >
                      Add Note
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Scheduling: Category Group ──

  const CategoryGroup = ({ category, items }: { category: MissionItemCategory; items: MissionItem[] }) => {
    const meta = CATEGORY_META[category];
    const readyItems = items.filter(i => i.status === 'ready').length;
    const allDone = readyItems === items.length && items.length > 0;
    const Icon = meta.icon;

    return (
      <Collapsible defaultOpen={!allDone}>
        <div className={`rounded-2xl border transition-all ${allDone ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100'}`}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-4 group/cat cursor-pointer hover:bg-slate-50/50 rounded-2xl transition-all">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl ${meta.bgColor} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${meta.color}`} />
              </div>
              <span className="text-sm font-black text-slate-800 tracking-tight">{meta.label}</span>
              <span className={`text-xs font-black tabular-nums ${allDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                {readyItems}/{items.length}
              </span>
              {allDone && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 group-hover/cat:text-slate-600 transition-transform [[data-state=closed]_&]:rotate-[-90deg] duration-200" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-2">
              {items.map(item => <ChecklistItemRow key={item.id} item={item} />)}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  // ── Scheduling: Add Item Panel ──

  const AddItemPanel = () => (
    <div className="mt-6">
      {!isAddItemOpen ? (
        <button
          onClick={() => setIsAddItemOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all group"
        >
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" /> Add Checklist Item
        </button>
      ) : (
        <div className="border-2 border-slate-200 rounded-2xl p-6 bg-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Add Item</h4>
            <button onClick={() => { setIsAddItemOpen(false); setShowCannedItems(true); }} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Master Templates */}
          <Button 
            onClick={loadIntlTemplate}
            className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-all font-black text-[10px] uppercase tracking-wider h-10 mb-4"
          >
            <FileText className="h-4 w-4 mr-2" /> Load INTL Master Checklist
          </Button>

          {/* Toggle: Canned vs Custom */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => setShowCannedItems(true)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${showCannedItems ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}
            >
              Quick Add
            </button>
            <button
              onClick={() => setShowCannedItems(false)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${!showCannedItems ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}
            >
              Custom
            </button>
          </div>

          {showCannedItems ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {CATEGORY_ORDER.filter(c => c !== 'other').map(cat => {
                const catItems = INTL_CHECKLIST_TEMPLATE.filter(ci => ci.category === cat);
                const meta = CATEGORY_META[cat];
                const existingTitles = missionItems.map(m => m.title.toLowerCase());
                return (
                  <div key={cat}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5">{meta.label}</p>
                    {catItems.map(ci => {
                      const alreadyAdded = existingTitles.some(t => t.includes(ci.title.toLowerCase().split(' ')[0]));
                      return (
                        <button
                          key={ci.title}
                          onClick={() => !alreadyAdded && addCannedItem(ci)}
                          disabled={alreadyAdded}
                          className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                            alreadyAdded
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-700 font-medium hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          <span>{ci.title}</span>
                          {alreadyAdded ? (
                            <span className="text-[9px] font-black text-slate-300">ADDED</span>
                          ) : (
                            <Plus className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Item title..."
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
                autoFocus
              />
              <div className="flex gap-2">
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as MissionItemCategory)}
                  className="flex-1 px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl outline-none font-bold text-slate-600"
                >
                  {CATEGORY_ORDER.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newItemAssignee}
                  onChange={(e) => setNewItemAssignee(e.target.value)}
                  placeholder="Assignee..."
                  className="flex-1 px-3 py-2.5 text-xs bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium"
                />
              </div>
              <Button
                onClick={() => addNewItem(newItemTitle, newItemCategory, newItemAssignee)}
                disabled={!newItemTitle.trim()}
                className="w-full bg-slate-900 text-white rounded-xl font-black text-xs h-10 hover:bg-slate-800 transition-all active:scale-95"
              >
                Add to Checklist
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Scheduling: Full Checklist View ──

  const SchedulingChecklist = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-5 w-5 text-slate-400" />
          <h4 className="text-lg font-black text-slate-900 tracking-tight">Trip Coordination Checklist</h4>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {totalItems} items · {readyCount} complete
        </span>
      </div>

      {/* Blocked Items — Always at Top */}
      {blockedItems.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <OctagonAlert className="h-4 w-4 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">
              Blocked — Requires Attention ({blockedItems.length})
            </span>
          </div>
          <div className="space-y-2">
            {blockedItems.map(item => <ChecklistItemRow key={item.id} item={item} />)}
          </div>
        </div>
      )}

      {/* Category Groups */}
      <div className="space-y-3">
        {CATEGORY_ORDER.map(cat => {
          const items = categorizedItems[cat];
          if (!items || items.length === 0) return null;
          return <CategoryGroup key={cat} category={cat} items={items} />;
        })}
      </div>

      {/* Add Item */}
      <AddItemPanel />
    </div>
  );

  // ── Pilot: Verified Logistics Feed ──

  const VerifiedLogisticsList = ({ filter }: { filter?: MissionItemCategory[] }) => {
    const readyItems = missionItems.filter(item => 
      item.status === 'ready' && (!filter || filter.includes(item.category))
    );

    return (
      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-8">
        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-6">Verified Logistics Feed</h4>
        <div className="space-y-4">
          {readyItems.map(item => (
            <div key={item.id} className="p-5 border border-slate-100 rounded-[1.5rem] bg-emerald-50/20 group hover:border-emerald-200 transition-all">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Check className="h-5 w-5" />
                     </div>
                     <span className="text-sm font-black text-slate-800">{item.title}</span>
                  </div>
                  <Badge variant="outline" className="border-emerald-200 text-emerald-600 font-black text-[9px] px-2 shadow-sm">VERIFIED</Badge>
               </div>
               {item.lastComment && (
                 <p className="text-[11px] font-bold text-emerald-700 italic border-l-2 border-emerald-200 pl-3 py-1 opacity-80 leading-relaxed">
                   "{item.lastComment}"
                 </p>
               )}
            </div>
          ))}
          {readyItems.length === 0 && (
            <div className="text-center py-10 opacity-40">
               <Target className="h-10 w-10 mx-auto mb-3 text-slate-300" />
               <p className="text-sm font-bold">No verified items yet.</p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // ── Pilot: Pending Requests ──

  const PendingRequestsList = () => {
    const nudgedItems = missionItems.filter(item => item.nudged && item.status !== 'ready');

    return (
      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-slate-900 text-white p-8">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-black tracking-tight">Pending Coordination</h4>
          <Badge className="bg-amber-500 text-white font-black">{nudgedItems.length} Active</Badge>
        </div>
        <div className="space-y-4">
          {nudgedItems.map(item => (
            <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                     <Clock className="h-5 w-5" />
                  </div>
                  <div>
                     <p className="text-sm font-black text-white leading-none">{item.title}</p>
                     <p className="text-[10px] uppercase font-black tracking-widest text-amber-400 mt-2">Waiting for Ground</p>
                  </div>
               </div>
               <Badge variant="outline" className="border-white/20 text-white/40 text-[9px]">PINGED</Badge>
            </div>
          ))}
          {nudgedItems.length === 0 && (
            <div className="text-center py-6 opacity-30">
               <p className="text-xs font-bold">No items currently flagged for follow-up.</p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // ── Safety Oversight Dashboard ──

  const SafetyOversightDashboard = () => {
    return (
      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white p-8">
        <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Safety & Compliance Oversight</h4>
        <div className="grid grid-cols-2 gap-8">
           <div className="space-y-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilot-Generated Reports</p>
              {docs.filter(d => d.type === 'Safety' || d.type === 'Crew').map(doc => (
                 <div key={doc.name} className="p-6 border border-slate-100 rounded-[2rem] bg-slate-50 group hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-between mb-4">
                       <span className="text-lg font-black text-slate-900">{doc.name}</span>
                       <Badge className={`${
                         doc.status === 'Submitted' ? 'bg-emerald-500' : 
                         doc.status === 'Draft' ? 'bg-amber-500' : 'bg-slate-400'
                       } text-white font-black px-3`}>
                         {doc.status.toUpperCase()}
                       </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-500">{doc.author}</span>
                       </div>
                       <span className="text-[10px] font-bold text-slate-400 italic">Updated {doc.lastUpdate}</span>
                    </div>
                    {doc.status === 'Submitted' && (
                       <Button size="sm" className="w-full mt-4 bg-slate-900 text-white rounded-xl font-black">
                         REVIEW NOW
                       </Button>
                    )}
                 </div>
              ))}
           </div>
           
           <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
              <h5 className="text-sm font-black uppercase tracking-widest text-blue-400 mb-6">Expert Analysis Tools</h5>
              <div className="space-y-4">
                 <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-white/10 hover:bg-white/5 text-white bg-transparent">
                    <Shield className="h-5 w-5 mr-3 text-sky-400" /> Security Intelligence Feed
                 </Button>
                 <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-white/10 hover:bg-white/5 text-white bg-transparent">
                    <Plane className="h-5 w-5 mr-3 text-emerald-400" /> Airport Compliance Matrix
                 </Button>
                 <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-white/10 hover:bg-white/5 text-white bg-transparent">
                    <AlertTriangle className="h-5 w-5 mr-3 text-rose-400" /> Emergency Response Plan
                 </Button>
              </div>
           </div>
        </div>
      </Card>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/50 -m-6 font-sans">
      {/* Navigation & Context Switcher for Active Trip */}
      <div className="w-80 flex-shrink-0 border-r bg-white flex flex-col shadow-lg z-20">
        <div className="p-6 border-b bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                title="Return to Master List"
                onClick={() => navigate('/experimental/scheduling-command')}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors -ml-2"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h2 className="text-2xl font-black tracking-tighter text-slate-900">{activeTripId}</h2>
            </div>
            <Badge variant="outline" className={`font-black px-3 transition-colors ${isMissionConfirmed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              {isMissionConfirmed ? 'GO' : 'PLAN'}
            </Badge>
          </div>
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl rounded-2xl relative overflow-hidden">
             
            <CardContent className="p-4 relative z-10">
               <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold opacity-60 uppercase text-[9px] tracking-widest">Route</span>
                    <span className="font-black">{activeTrip.route} ({activeTrip.date})</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                    <Plane className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold opacity-60 uppercase text-[9px] tracking-widest">Tail</span>
                    <span className="font-black">{activeTrip.tail}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
          <div className="px-6 py-4 border-b flex items-center justify-between bg-white text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>Trip Command Chat</span>
            <div className="flex -space-x-1.5">
               {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white" />)}
            </div>
          </div>
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1.5 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        msg.sender === 'System Log' ? 'text-blue-600' :
                        msg.role === 'pilot' ? 'text-sky-600' : 
                        msg.role === 'scheduling' ? 'text-slate-900' : 
                        msg.role === 'inflight' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {msg.sender}
                      </span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl text-[13px] shadow-sm border ${
                    msg.role === activeRole && msg.sender !== 'System Log' ? 'bg-slate-900 text-white border-slate-800' : 
                    msg.sender === 'System Log' ? 'bg-blue-50 border-blue-100 text-blue-900 italic font-medium' :
                    'bg-white text-slate-700 border-slate-100'
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-6 border-t bg-white">
            <div className="relative group">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Message crew..." 
                className="w-full pl-4 pr-12 py-4 text-sm bg-slate-100 border-transparent rounded-[1.5rem] focus:bg-white focus:ring-2 focus:ring-slate-900 transition-all outline-none"
              />
              <button onClick={handleSendMessage} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-all">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-slate-50/50">
        <header className="h-24 border-b bg-white flex items-center justify-between px-10 shadow-sm relative z-10 transition-all">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3 py-1.5 bg-slate-100 rounded-[1.5rem] px-2 border border-slate-200 shadow-inner">
              <div className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-200">Lens</div>
              <div className="flex gap-1">
                {(['scheduling', 'pilot', 'inflight', 'safety'] as const).map(role => (
                  <button 
                    key={role}
                    onClick={() => setActiveRole(role)}
                    className={`px-6 py-2.5 text-xs rounded-xl transition-all font-black uppercase tracking-widest ${
                      activeRole === role 
                        ? 'bg-white shadow-xl text-slate-900 scale-105 ring-1 ring-slate-200/50' 
                        : 'text-slate-400 hover:text-slate-700 hover:bg-white/50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right">
             <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-slate-400" />
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">T-Minus Departure</p>
                   <p className="text-2xl font-black text-slate-900 tabular-nums">02:45:18</p>
                </div>
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-10 pt-8 relative scroll-smooth">
           {/* Late Change Banner (Shared) */}
           <div className="space-y-5 mb-8">
            {lateChanges.map(change => {
               const acknowledged = change.acknowledgedBy.includes(activeRole.charAt(0).toUpperCase() + activeRole.slice(1));
               return (
                 <div key={change.id} className={`p-6 border-2 rounded-[2rem] flex items-center justify-between transition-all shadow-lg overflow-hidden relative ${
                   acknowledged ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
                 }`}>
                   <div className="flex items-center gap-6 relative z-10">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${acknowledged ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                         <AlertTriangle className="h-7 w-7" />
                      </div>
                      <div>
                         <div className="flex items-center gap-3 mb-1">
                            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${acknowledged ? 'text-emerald-900' : 'text-amber-900'}`}>Critical Mission Change</h3>
                            <Badge className={change.type === 'mission' ? 'bg-rose-500' : 'bg-slate-900'} >{change.type.toUpperCase()}</Badge>
                         </div>
                         <p className={`text-lg font-black italic tracking-tight ${acknowledged ? 'text-emerald-950/70' : 'text-amber-950'}`}>{change.field}</p>
                         <div className="flex items-center gap-2 mt-1">
                            <MessageCircle className="h-3 w-3 text-slate-400" />
                            <p className="text-xs font-bold text-slate-600 italic">"{change.comment}"</p>
                         </div>
                      </div>
                   </div>
                   {!acknowledged && (
                     <Button onClick={() => acknowledgeLateChange(change.id)} size="lg" className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black px-8 h-14 text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-95 relative z-10">
                        <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-400" />
                        ACKNOWLEDGE
                     </Button>
                   )}
                 </div>
               );
            })}
          </div>

          {/* ── SCHEDULING LENS ── */}
          {activeRole === 'scheduling' && (
            <>
              {(() => {
                const isBehind = !activeTrip.missionItems.some(i => i.status === 'blocked') && activeTrip.readinessScore < 100 && activeTrip.readinessScore > 0 && ((activeTrip.readinessScore < 90 && activeTrip.daysUntilDeparture < 1) || (activeTrip.readinessScore < 50 && activeTrip.daysUntilDeparture < 3));
                const isTwoWeekTrigger = activeTrip.daysUntilDeparture <= 14 && activeTrip.daysUntilDeparture > 5 && activeTrip.readinessScore < 80;
                const hasCriticalBlocker = activeTrip.missionItems.some(i => i.status === 'blocked');
                const showAction = hasCriticalBlocker || isBehind || isTwoWeekTrigger;
                
                let urgentItem = activeTrip.missionItems.find(i => i.status === 'blocked') || activeTrip.missionItems.find(i => i.status === 'in-work') || activeTrip.missionItems.find(i => i.status === 'requested');
                
                if (isTwoWeekTrigger && !hasCriticalBlocker) {
                   const commsItem = activeTrip.missionItems.find(i => i.title.includes('Email Crew & Pax Info'));
                   if (commsItem) urgentItem = commsItem;
                }

                const handleScroll = (id: string) => {
                   const el = document.getElementById(id);
                   if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2');
                      setTimeout(() => el.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2'), 2500);
                   }
                };

                return showAction && urgentItem && (
                   <div className="mb-6 p-6 bg-amber-50 border-2 border-amber-400 rounded-[2rem] shadow-lg shadow-amber-500/10 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                         <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                         </span>
                         <h3 className="text-amber-900 font-black tracking-tight text-lg uppercase">Immediate Action Required</h3>
                      </div>
                      <p className="text-amber-800 text-sm font-bold opacity-80 mb-3">
                         {hasCriticalBlocker ? "Critical blocker detected. Immediate resolution required below:" : "This trip is falling behind the target timeline. Outstanding trigger item:"}
                      </p>
                      <div 
                         onClick={() => handleScroll(urgentItem.id)}
                         className="bg-white px-5 py-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group/alertbox"
                      >
                         <span className="font-black text-amber-900">{urgentItem.title}</span>
                         <Badge className="bg-amber-500 flex items-center gap-2 px-3 py-1.5 transition-colors group-hover/alertbox:bg-amber-600">
                            JUMP TO ACTION <ArrowRight className="h-3 w-3" />
                         </Badge>
                      </div>
                   </div>
                );
              })()}
              <ReadinessSummary />
              <SchedulingChecklist />
            </>
          )}

          {/* ── NON-SCHEDULING LENSES: Shared Readiness Dashboard ── */}
          {activeRole !== 'scheduling' && (
            <div className="mb-12 p-10 bg-white rounded-[3.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group/readiness">
               <div className="flex items-center justify-between mb-10 relative z-10">
                  <div>
                     <h3 className="text-3xl font-black text-slate-950 tracking-tighter">Unified Mission Readiness</h3>
                     <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                       <Target className="h-4 w-4 text-blue-500" /> Ground Logistics & Tactical Feed
                     </p>
                  </div>
               </div>
               <div className="grid grid-cols-4 gap-12 relative z-10">
                  {[
                    { label: 'Permits & Slots', icon: FileText, cat: 'permits' as const },
                    { label: 'Ground Ops', icon: MapPin, cat: 'ground-ops' as const },
                    { label: 'Customs & Immig.', icon: Shield, cat: 'customs' as const },
                    { label: 'Fuel Coordination', icon: Utensils, cat: 'fuel' as const }
                  ].map((item, i) => (
                    <div key={i} className="space-y-6">
                       <div 
                         className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.1em] cursor-pointer group/item"
                         onClick={() => { if (activeRole === 'pilot') { setNudgeCategory(item.label); setIsNudgeDialogOpen(true); } }}
                       >
                          <span className="flex items-center gap-3">
                             <item.icon className="h-5 w-5 text-slate-300 group-hover/item:text-blue-600 transition-colors" />
                             {item.label}
                          </span>
                          <span className={getCategoryReadiness(item.cat) === 100 ? 'text-emerald-500' : 'text-slate-900'}>
                             {getCategoryReadiness(item.cat)}%
                          </span>
                       </div>
                       <div className="h-5 rounded-full bg-slate-100 overflow-hidden shadow-inner border border-slate-100">
                          <div className={`h-full transition-all duration-1000 ${getCategoryReadiness(item.cat) === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-slate-900'}`} style={{ width: `${getCategoryReadiness(item.cat)}%` }} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* ── PILOT LENS ── */}
          {activeRole === 'pilot' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 grid grid-cols-2 gap-12">
                <div className="space-y-12">
                   <Card className="rounded-[3.5rem] border-none shadow-2xl bg-gradient-to-br from-blue-800 to-slate-950 text-white p-12 relative overflow-hidden group/efb">
                      <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover/efb:scale-175 duration-1000">
                        <Plane className="h-64 w-64" />
                      </div>
                      <h3 className="text-5xl font-black italic tracking-tighter mb-4">EFB MISSION FOLDER</h3>
                      <p className="text-blue-300 text-lg font-bold mb-12 uppercase tracking-[0.2em] flex items-center gap-3">
                         <RefreshCw className="h-5 w-5 animate-spin-slow" /> ForeFlight Sync Active
                      </p>
                      <div className="space-y-4 mb-12">
                        {docs.map((doc, i) => (
                           <div key={i} className={`p-5 rounded-3xl border-2 flex items-center justify-between transition-all ${doc.status === 'Synced' ? 'bg-white/10 border-white/10' : 'bg-white/5 border-white/5 opacity-60'}`}>
                              <span className="text-xl font-black tracking-tight">{doc.name}</span>
                              <Badge className={`${doc.status === 'Synced' ? 'bg-emerald-500' : 'bg-blue-400'} text-white font-black px-4`}>{doc.status.toUpperCase()}</Badge>
                           </div>
                        ))}
                      </div>
                      <Button className="w-full h-20 rounded-[2rem] bg-white text-slate-950 font-black text-2xl shadow-2xl hover:bg-blue-50 transition-all active:scale-95">
                         PUSH TO COCKPIT
                      </Button>
                   </Card>
                   
                   <Card className="rounded-[3.5rem] border-none shadow-2xl bg-white p-12">
                      <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Safety Documentation</h4>
                      <div className="space-y-6">
                        {docs.filter(d => d.type === 'Safety' || d.type === 'Crew').map(doc => (
                           <div key={doc.name} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group">
                              <div>
                                 <p className="text-lg font-black text-slate-950">{doc.name}</p>
                                 <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{doc.lastUpdate ? `Last Edit: ${doc.lastUpdate}` : 'Not Started'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                 {doc.status === 'Draft' ? (
                                    <Button variant="outline" className="rounded-xl border-slate-200 font-black h-12 px-6">
                                       <FileEdit className="h-4 w-4 mr-2" /> RESUME DRAFT
                                    </Button>
                                 ) : doc.status === 'Submitted' ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-2 border-emerald-100 px-4 py-2 font-black rounded-xl">SUBMITTED</Badge>
                                 ) : (
                                    <Button className="rounded-xl bg-slate-900 text-white font-black h-12 px-6">START NOW</Button>
                                 )}
                              </div>
                           </div>
                        ))}
                      </div>
                   </Card>
                </div>

                <div className="space-y-12">
                   <VerifiedLogisticsList />
                   <PendingRequestsList />
                </div>
             </div>
          )}

          {/* ── INFLIGHT LENS ── */}
          {activeRole === 'inflight' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 grid grid-cols-2 gap-12">
                <Card className="rounded-[3.5rem] border-none shadow-2xl bg-white p-12">
                   <div className="flex items-center gap-6 mb-10">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-lg">
                         <Utensils className="h-8 w-8" />
                      </div>
                      <h4 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Cabin Readiness</h4>
                   </div>
                   <div className="space-y-6 flex-1">
                      {['Premium Catering Ordered', 'Passenger Amenities Staged', 'Cabin Safety Check', 'Alcohol Inventory Sync'].map((item, i) => (
                         <div key={i} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[2rem] group hover:bg-slate-100 transition-all cursor-pointer">
                            <span className="text-xl font-black text-slate-800 tracking-tight">{item}</span>
                            <div className="w-10 h-10 rounded-full border-4 border-slate-200 group-hover:border-emerald-500 transition-all flex items-center justify-center">
                               {i < 2 && <Check className="h-6 w-6 text-emerald-500" />}
                            </div>
                         </div>
                      ))}
                   </div>
                </Card>
                <div className="space-y-12">
                   <VerifiedLogisticsList filter={['catering', 'other']} />
                   <Card className="rounded-[3.5rem] border-none shadow-2xl bg-indigo-950 text-white p-12 overflow-hidden relative">
                      <div className="absolute bottom-0 right-0 p-12 opacity-10">
                         <Users className="h-40 w-40" />
                      </div>
                      <h4 className="text-2xl font-black tracking-tight mb-8">Passenger Watch (T-24H)</h4>
                      <div className="space-y-4">
                         {passengerAlerts.map(alert => (
                           <div key={alert.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between">
                              <span className="text-lg font-black">{alert.name}</span>
                              <Badge className={alert.type === 'added' ? 'bg-emerald-500' : 'bg-rose-500'}>{alert.type.toUpperCase()}</Badge>
                           </div>
                         ))}
                      </div>
                   </Card>
                </div>
             </div>
          )}

          {/* ── SAFETY LENS ── */}
          {activeRole === 'safety' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <SafetyOversightDashboard />
             </div>
          )}
        </main>
      </div>

      {/* DIALOGS */}

      {/* Nudge Dialog (Pilot → Scheduling) */}
      <Dialog open={isNudgeDialogOpen} onOpenChange={setIsNudgeDialogOpen}>
         <DialogContent className="sm:max-w-xl rounded-[3rem] border-none p-12 shadow-2xl">
            <DialogHeader>
               <div className="w-20 h-20 bg-amber-100 rounded-[2rem] flex items-center justify-center mb-8 text-amber-600 shadow-inner">
                  <Bell className="h-10 w-10" />
               </div>
               <DialogTitle className="text-4xl font-black text-slate-950 tracking-tighter uppercase italic">Logistics Nudge</DialogTitle>
               <DialogDescription className="text-lg font-bold text-slate-400">
                  Requesting update on <span className="text-amber-600">{nudgeCategory}</span> from Ground Scheduling.
               </DialogDescription>
            </DialogHeader>
            <div className="py-8">
               <textarea 
                  value={nudgeComment}
                  onChange={(e) => setNudgeComment(e.target.value)}
                  placeholder="e.g., Need to verify departure slots for latest crew rest calculations..."
                  className="w-full h-40 p-8 bg-slate-100 border-none rounded-[2.5rem] focus:ring-4 focus:ring-amber-500/10 text-xl font-bold text-slate-900 outline-none shadow-inner transition-all"
               />
            </div>
            <DialogFooter className="flex-col gap-4">
               <Button onClick={triggerNudge} disabled={!nudgeComment.trim()} className="w-full bg-slate-950 text-white rounded-[2rem] font-black h-20 shadow-2xl text-2xl hover:bg-slate-800 transition-all">
                  SEND PRIORITY NUDGE
               </Button>
               <Button variant="ghost" onClick={() => setIsNudgeDialogOpen(false)} className="w-full rounded-2xl font-black text-slate-400 uppercase tracking-widest h-10">
                  Dismiss
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
