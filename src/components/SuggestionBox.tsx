import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { Mail, MessageSquare, CheckCircle, Clock, Flag, Users, Edit, Send } from 'lucide-react';

export type SuggestionStatus = 'new' | 'under-review' | 'approved' | 'implemented' | 'rejected';

interface SuggestionBoxItem {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedDate: string;
  category: string;
  targetRole: string; // Which manager should handle this
  priority: 'high' | 'medium' | 'low';
  status: SuggestionStatus;
  assignedTo?: string;
  response?: string;
  responseDate?: string;
}

const MANAGER_ROLES = ['Chief Pilot', 'Maintenance Manager', 'Inflight Manager', 'Safety Manager', 'Operations Manager'];

const SEED_SUGGESTIONS: SuggestionBoxItem[] = [
  {
    id: 'SB001',
    title: 'Improve Pre-Flight Inspection Process',
    description: 'Suggestion to add digital checklist for pre-flight inspections to reduce paperwork and improve accuracy',
    submittedBy: 'Captain Rodriguez',
    submittedDate: '2024-01-18',
    category: 'Process Improvement',
    targetRole: 'Chief Pilot',
    priority: 'medium',
    status: 'under-review',
    assignedTo: 'Chief Pilot'
  },
  {
    id: 'SB002',
    title: 'Maintenance Schedule Optimization',
    description: 'Propose using predictive analytics to optimize maintenance schedules and reduce aircraft downtime',
    submittedBy: 'John Mechanic',
    submittedDate: '2024-01-16',
    category: 'Maintenance',
    targetRole: 'Maintenance Manager',
    priority: 'high',
    status: 'approved',
    assignedTo: 'Maintenance Manager',
    response: 'Excellent suggestion. We will evaluate predictive analytics solutions.',
    responseDate: '2024-01-17'
  },
  {
    id: 'SB003',
    title: 'Passenger Service Enhancement',
    description: 'Add tablet-based entertainment system to improve passenger experience on longer flights',
    submittedBy: 'Flight Attendant Smith',
    submittedDate: '2024-01-15',
    category: 'Passenger Experience',
    targetRole: 'Inflight Manager',
    priority: 'low',
    status: 'new'
  },
  {
    id: 'SB004',
    title: 'Safety Reporting System Update',
    description: 'Modernize the hazard reporting system with mobile app integration for faster reporting',
    submittedBy: 'Safety Officer Davis',
    submittedDate: '2024-01-12',
    category: 'Safety',
    targetRole: 'Safety Manager',
    priority: 'high',
    status: 'implemented',
    assignedTo: 'Safety Manager',
    response: 'Implemented mobile reporting feature. Great suggestion!',
    responseDate: '2024-01-14'
  }
];

/** A response is required for the decisions a submitter will read. */
interface PendingAction {
  suggestion: SuggestionBoxItem;
  kind: 'request-info' | 'decline' | 'reply';
}

const ACTION_COPY: Record<PendingAction['kind'], { title: string; description: string; placeholder: string; cta: string }> = {
  'request-info': {
    title: 'Request more information',
    description: 'The suggestion stays open. What do you need from them?',
    placeholder: 'Which aircraft did you have in mind, and roughly how often does this happen?',
    cta: 'Send request',
  },
  decline: {
    title: 'Decline this suggestion',
    description: 'Someone took the trouble to raise it, so say why.',
    placeholder: 'We looked at this in Q2 — the cost per aircraft was more than the hours it saves.',
    cta: 'Decline',
  },
  reply: {
    title: 'Reply to the submitter',
    description: 'Recorded on the suggestion so anyone reading it later sees the exchange.',
    placeholder: 'Thanks — this is with the Chief Pilot and we will come back by the end of the month.',
    cta: 'Send reply',
  },
};

const todayIso = () => new Date().toISOString().split('T')[0];

/**
 * Suggestion Box — what the department has raised, routed to the manager who
 * owns it. Split out of the old three-tab CriticalFunctionsPlan page.
 *
 * Every control on this page used to be inert: the filter, both icon buttons,
 * and all three triage actions. A suggestion box that cannot be answered is
 * worse than none, because it collects goodwill and spends it.
 */
export default function SuggestionBox() {
  const [suggestions, setSuggestions] = useState<SuggestionBoxItem[]>(SEED_SUGGESTIONS);
  const [roleFilter, setRoleFilter] = useState('all');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [responseText, setResponseText] = useState('');
  const [reassigning, setReassigning] = useState<SuggestionBoxItem | null>(null);

  const visible = roleFilter === 'all'
    ? suggestions
    : suggestions.filter(item => item.targetRole === roleFilter);

  const update = (id: string, changes: Partial<SuggestionBoxItem>) =>
    setSuggestions(prev => prev.map(item => (item.id === id ? { ...item, ...changes } : item)));

  const accept = (suggestion: SuggestionBoxItem) => {
    update(suggestion.id, { status: 'under-review', assignedTo: suggestion.targetRole });
    toast.success('Accepted for review', {
      description: `"${suggestion.title}" is now with the ${suggestion.targetRole}.`,
    });
  };

  const implement = (suggestion: SuggestionBoxItem) => {
    update(suggestion.id, { status: 'implemented', responseDate: todayIso() });
    toast.success('Marked implemented', { description: `"${suggestion.title}" is done.` });
  };

  const submitResponse = () => {
    if (!pending || !responseText.trim()) return;
    const { suggestion, kind } = pending;

    update(suggestion.id, {
      response: responseText.trim(),
      responseDate: todayIso(),
      // Asking a question keeps it open; declining closes it; a reply changes nothing.
      ...(kind === 'decline' ? { status: 'rejected' as SuggestionStatus } : {}),
    });

    toast.success(kind === 'decline' ? 'Declined' : kind === 'request-info' ? 'Request sent' : 'Reply sent', {
      description: `${suggestion.submittedBy} will see your response on the suggestion.`,
    });
    setPending(null);
    setResponseText('');
  };

  const reassign = (suggestion: SuggestionBoxItem, role: string) => {
    update(suggestion.id, { targetRole: role, assignedTo: suggestion.assignedTo ? role : undefined });
    setReassigning(null);
    toast.success('Rerouted', { description: `"${suggestion.title}" now sits with the ${role}.` });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'implemented': return 'bg-green-500';
      case 'under-review': return 'bg-blue-500';
      case 'approved': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      case 'new': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Suggestion Box
        </h1>
        <p className="text-muted-foreground">What the department has raised, routed to the manager who owns it</p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2>Suggestion Box Inbox</h2>
          <Select value={roleFilter} onValueChange={(value: string) => setRoleFilter(value)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All managers</SelectItem>
              {MANAGER_ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Suggestions</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{suggestions.filter(i => i.status === 'new').length}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{suggestions.filter(i => i.status === 'under-review').length}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Implemented</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{suggestions.filter(i => i.status === 'implemented').length}</div>
              <p className="text-xs text-muted-foreground">This quarter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unanswered</CardTitle>
              <Flag className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {suggestions.filter(i => i.status === 'new' && !i.response).length}
              </div>
              <p className="text-xs text-muted-foreground">Nobody has replied</p>
            </CardContent>
          </Card>
        </div>

        {visible.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">Nothing for this manager</h3>
              <p className="text-muted-foreground">Clear the filter to see the rest of the inbox.</p>
            </CardContent>
          </Card>
        ) : (
        <div className="grid gap-4">
          {visible.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {suggestion.title}
                      <Badge variant="outline" className="text-xs">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(suggestion.priority)} mr-1`}></div>
                        {suggestion.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(suggestion.status)} mr-1`}></div>
                        {suggestion.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{suggestion.targetRole}</Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Reply to the submitter"
                      title="Reply to the submitter"
                      onClick={() => { setPending({ suggestion, kind: 'reply' }); setResponseText(''); }}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Route to a different manager"
                      title="Route to a different manager"
                      onClick={() => setReassigning(suggestion)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Submitted By</Label>
                      <p>{suggestion.submittedBy}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                      <p>{formatDate(suggestion.submittedDate)}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                      <p>{suggestion.category}</p>
                    </div>
                    {suggestion.assignedTo && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Assigned To</Label>
                        <p>{suggestion.assignedTo}</p>
                      </div>
                    )}
                  </div>

                  {suggestion.response && (
                    <div>
                      <Label className="text-sm font-medium">Management Response</Label>
                      <div className="mt-2 p-3 bg-muted rounded-lg">
                        <p className="text-sm">{suggestion.response}</p>
                        {suggestion.responseDate && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Response date: {formatDate(suggestion.responseDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {suggestion.status === 'new' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => accept(suggestion)}>Accept for Review</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setPending({ suggestion, kind: 'request-info' }); setResponseText(''); }}
                      >
                        Request More Info
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setPending({ suggestion, kind: 'decline' }); setResponseText(''); }}
                      >
                        Decline
                      </Button>
                    </div>
                  )}

                  {suggestion.status === 'under-review' && (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => implement(suggestion)}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Implemented
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setPending({ suggestion, kind: 'decline' }); setResponseText(''); }}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </div>

      {/* Every decision a submitter reads carries a written reason. */}
      {pending && (
        <Dialog open onOpenChange={open => { if (!open) { setPending(null); setResponseText(''); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{ACTION_COPY[pending.kind].title}</DialogTitle>
              <DialogDescription>{ACTION_COPY[pending.kind].description}</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="suggestion-response" className="text-sm font-medium mb-2 block">
                To {pending.suggestion.submittedBy} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="suggestion-response"
                rows={4}
                placeholder={ACTION_COPY[pending.kind].placeholder}
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setPending(null); setResponseText(''); }}>Cancel</Button>
              <Button
                variant={pending.kind === 'decline' ? 'destructive' : 'default'}
                disabled={!responseText.trim()}
                onClick={submitResponse}
              >
                <Send className="w-4 h-4 mr-2" />
                {ACTION_COPY[pending.kind].cta}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {reassigning && (
        <Dialog open onOpenChange={open => { if (!open) setReassigning(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Route to a different manager</DialogTitle>
              <DialogDescription>
                "{reassigning.title}" currently sits with the {reassigning.targetRole}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {MANAGER_ROLES.filter(role => role !== reassigning.targetRole).map(role => (
                <Button key={role} variant="outline" onClick={() => reassign(reassigning, role)}>
                  <Users className="w-4 h-4 mr-2" />
                  {role}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
