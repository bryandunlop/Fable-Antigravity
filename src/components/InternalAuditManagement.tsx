import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { 
  Target, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  UserCheck,
  Shuffle,
  Download,
  Trash2,
  ArrowRight,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useAudits, Audit, AUDIT_TEMPLATES } from '../contexts/AuditContext';

export default function InternalAuditManagement() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewAuditDialog, setShowNewAuditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('All Roles');
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState('');

  const [newAuditForm, setNewAuditForm] = useState({
    title: '',
    type: 'Scheduled',
    category: 'Safety Management',
    priority: 'Medium',
    scheduledDate: '',
    dueDate: '',
    description: '',
    useTemplate: true,
    initialAssignment: 'None'
  });

  const { audits, addAudit, updateAudit, deleteAudit } = useAudits();
  const currentAudit = audits.find(a => a.id === activeAuditId);

  // Auditors with role information
  const auditorsPool = [
    { name: 'Sarah Wilson', role: 'Safety' },
    { name: 'Mike Johnson', role: 'Pilot' },
    { name: 'Emily Davis', role: 'Document Manager' },
    { name: 'David Brown', role: 'Maintenance' },
    { name: 'Lisa Chen', role: 'Safety' },
    { name: 'Tom Anderson', role: 'Pilot' },
    { name: 'Jennifer Lee', role: 'Inflight' },
    { name: 'Robert Martinez', role: 'Maintenance' },
    { name: 'Amanda Foster', role: 'Safety' },
    { name: 'Chris Taylor', role: 'Admin' }
  ];

  const roles = ['All Roles', 'Safety', 'Pilot', 'Inflight', 'Maintenance', 'Document Manager', 'Admin'];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'complete': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAudits = audits.filter(audit => {
    const matchesFilter = filter === 'all' || audit.status.toLowerCase().replace(' ', '') === filter;
    const matchesSearch = audit.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleRandomAssignment = (byRole = false) => {
    let availableAuditors = auditorsPool;
    
    // Filter by role if a specific role is selected
    if (byRole && selectedRole !== 'All Roles') {
      availableAuditors = auditorsPool.filter(auditor => auditor.role === selectedRole);
    }
    
    if (!selectedAudit) {
      toast.error('No audit selected for assignment');
      return;
    }
    
    if (availableAuditors.length === 0) {
      toast.error(`No auditors available for role: ${selectedRole}`);
      return;
    }
    
    const randomAuditor = availableAuditors[Math.floor(Math.random() * availableAuditors.length)];
    const roleInfo = byRole && selectedRole !== 'All Roles' ? ` (${selectedRole} role)` : '';
    
    updateAudit(selectedAudit.id, {
      assignedTo: randomAuditor.name,
      assignedRole: randomAuditor.role,
      assignmentType: byRole ? `Random (${selectedRole})` : 'Random (Any)'
    });
    
    toast.success(`Audit ${selectedAudit.id} assigned to ${randomAuditor.name}${roleInfo}`);
    setShowAssignDialog(false);
  };

  const handleManualAssignment = (auditorName: string, auditorRole: string) => {
    if (!selectedAudit) {
      toast.error('No audit selected for assignment');
      return;
    }

    updateAudit(selectedAudit.id, {
      assignedTo: auditorName,
      assignedRole: auditorRole,
      assignmentType: 'Manual'
    });

    toast.success(`Audit ${selectedAudit.id} manually assigned to ${auditorName} (${auditorRole})`);
    setShowAssignDialog(false);
    setAssignmentSearchTerm('');
  };

  const handleRoleAssignment = (roleName: string) => {
    if (!selectedAudit) {
      toast.error('No audit selected for assignment');
      return;
    }

    updateAudit(selectedAudit.id, {
      assignedTo: `Any ${roleName}`,
      assignedRole: roleName,
      assignmentType: 'Role (Team)'
    });

    toast.success(`Audit ${selectedAudit.id} assigned to the ${roleName} team`);
    setShowAssignDialog(false);
  };

  const getRecommendedRole = (category: string) => {
    switch (category) {
      case 'Safety Management': return 'Safety';
      case 'Flight Operations': return 'Pilot';
      case 'Maintenance': return 'Maintenance';
      case 'Documentation': return 'Document Manager';
      case 'Training': return 'Safety';
      case 'Ground Operations': return 'Safety';
      default: return 'Safety';
    }
  };

  const generateAuditReport = (auditId: string) => {
    toast.success(`Generating PDF report for audit ${auditId}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-screen flex flex-col overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 shrink-0">
        <div>
          <h1 className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Audit Workspace
          </h1>
          <p className="text-muted-foreground">Comprehensive internal audit hub</p>
        </div>
        
        <div className="flex gap-2 mt-4 lg:mt-0">
          <Button onClick={() => setShowNewAuditDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule New Audit
          </Button>
          
          <Dialog open={showAssignDialog} onOpenChange={(open) => {
            if (!open) setSelectedAudit(null);
            setShowAssignDialog(open);
          }}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Assign Auditor: {selectedAudit?.id}
                </DialogTitle>
                <DialogDescription>
                  {selectedAudit?.title}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="recommended" className="mt-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="recommended">Smart Assign</TabsTrigger>
                  <TabsTrigger value="individual">Individual</TabsTrigger>
                  <TabsTrigger value="team">Team / Role</TabsTrigger>
                </TabsList>

                {/* Smart / Quick Assign Tab */}
                <TabsContent value="recommended" className="space-y-4 pt-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Recommended for {selectedAudit?.category}
                    </h4>
                    <p className="text-xs text-blue-700 mb-4">
                      Based on the audit category, we recommend assigning this to the <strong>{getRecommendedRole(selectedAudit?.category || '')}</strong> team.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={() => handleRandomAssignment(true)} 
                        className="w-full justify-between bg-blue-600 hover:bg-blue-700 text-white"
                        onMouseEnter={() => setSelectedRole(getRecommendedRole(selectedAudit?.category || ''))}
                      >
                        <div className="flex items-center gap-2 text-left">
                          <Shuffle className="w-4 h-4" />
                          <div>
                            <p className="font-medium">Random {getRecommendedRole(selectedAudit?.category || '')}</p>
                            <p className="text-[10px] opacity-90">Pick a random individual from recommended role</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => handleRoleAssignment(getRecommendedRole(selectedAudit?.category || ''))}
                        className="w-full justify-between border-blue-200 text-blue-800 hover:bg-blue-100"
                      >
                        <div className="flex items-center gap-2 text-left">
                          <UserCheck className="w-4 h-4" />
                          <div>
                            <p className="font-medium">Assign to Team</p>
                            <p className="text-[10px] opacity-90">Any member of the {getRecommendedRole(selectedAudit?.category || '')} team can pick this up</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Other Quick Actions</span>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    onClick={() => handleRandomAssignment(false)}
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Random Assignment (Any Role)
                  </Button>
                </TabsContent>

                {/* Individual Selection Tab */}
                <TabsContent value="individual" className="space-y-4 pt-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Search people..." 
                      className="pl-9"
                      value={assignmentSearchTerm}
                      onChange={(e) => setAssignmentSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {auditorsPool
                      .filter(a => 
                        a.name.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) || 
                        a.role.toLowerCase().includes(assignmentSearchTerm.toLowerCase())
                      )
                      .map((auditor) => (
                        <Button
                          key={auditor.name}
                          variant="ghost"
                          className="w-full justify-between h-auto py-2 px-3 hover:bg-muted group"
                          onClick={() => handleManualAssignment(auditor.name, auditor.role)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                              {auditor.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">{auditor.name}</p>
                              <p className="text-[10px] text-muted-foreground">{auditor.role}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                            Assign
                          </Badge>
                        </Button>
                      ))}
                    
                    {auditorsPool.filter(a => 
                      a.name.toLowerCase().includes(assignmentSearchTerm.toLowerCase()) || 
                      a.role.toLowerCase().includes(assignmentSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-xs text-muted-foreground">No matching people found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Team / Role Tab */}
                <TabsContent value="team" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 gap-2">
                    {roles.filter(r => r !== 'All Roles').map((role) => (
                      <Button
                        key={role}
                        variant="outline"
                        className="w-full justify-between h-12"
                        onClick={() => handleRoleAssignment(role)}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="p-2 rounded bg-muted">
                            <Shield className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{role} Team</p>
                            <p className="text-[10px] text-muted-foreground">Any member of {role}</p>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewAuditDialog} onOpenChange={setShowNewAuditDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule New Audit</DialogTitle>
                <DialogDescription>
                  Create a new audit with template-based checklist and initial assignment.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Audit Title</Label>
                      <Input placeholder="e.g. Monthly Safety Audit - March" value={newAuditForm.title} onChange={e => setNewAuditForm({ ...newAuditForm, title: e.target.value })} />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newAuditForm.type} onValueChange={(v: string) => setNewAuditForm({ ...newAuditForm, type: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="Ad-hoc">Ad-hoc</SelectItem>
                          <SelectItem value="Compliance">Compliance</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={newAuditForm.category} onValueChange={(v: string) => setNewAuditForm({ ...newAuditForm, category: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(AUDIT_TEMPLATES).map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold border-b pb-2">Templates & Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 border p-3 rounded-lg justify-between">
                      <div className="space-y-0.5">
                        <Label>Use Category Template</Label>
                        <p className="text-[10px] text-muted-foreground">Pre-fill checklist items for {newAuditForm.category}</p>
                      </div>
                      <Checkbox 
                        checked={newAuditForm.useTemplate} 
                        onCheckedChange={(checked: boolean) => setNewAuditForm({ ...newAuditForm, useTemplate: !!checked })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={newAuditForm.priority} onValueChange={(v: string) => setNewAuditForm({ ...newAuditForm, priority: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Scheduled Date</Label>
                    <Input type="date" value={newAuditForm.scheduledDate} onChange={e => setNewAuditForm({ ...newAuditForm, scheduledDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={newAuditForm.dueDate} onChange={e => setNewAuditForm({ ...newAuditForm, dueDate: e.target.value })} />
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Scope and objectives of the audit..." rows={2} value={newAuditForm.description} onChange={e => setNewAuditForm({ ...newAuditForm, description: e.target.value })} />
                </div>
                
                <div className="flex gap-2 pt-4 sticky bottom-0 bg-background py-2 border-t">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => {
                    const templateItems = newAuditForm.useTemplate 
                      ? (AUDIT_TEMPLATES[newAuditForm.category as keyof typeof AUDIT_TEMPLATES] || [])
                      : [];
                    
                    addAudit({
                      title: newAuditForm.title || `${newAuditForm.category} Audit`,
                      type: newAuditForm.type,
                      category: newAuditForm.category,
                      status: 'Scheduled',
                      priority: newAuditForm.priority,
                      scheduledDate: newAuditForm.scheduledDate || new Date().toISOString().split('T')[0],
                      dueDate: newAuditForm.dueDate || new Date().toISOString().split('T')[0],
                      assignedTo: 'Unassigned',
                      assignedRole: '',
                      assignmentType: 'None',
                      description: newAuditForm.description,
                      checklist: templateItems.map((item, idx) => ({ id: Date.now() + idx, item, completed: false })),
                      findings: [],
                      completionRate: 0
                    });
                    toast.success('Audit created and template loaded');
                    setShowNewAuditDialog(false);
                    setNewAuditForm({ 
                      title: '', type: 'Scheduled', category: 'Safety Management', 
                      priority: 'Medium', scheduledDate: '', dueDate: '', 
                      description: '', useTemplate: true, initialAssignment: 'None' 
                    });
                  }}>
                    Create Audit
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewAuditDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl">
                  {audits.filter(a => a.status === 'Scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl">
                  {audits.filter(a => a.status === 'In Progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Complete</p>
                <p className="text-2xl">
                  {audits.filter(a => a.status === 'Complete').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl">
                  {audits.filter(a => a.status === 'Overdue').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex overflow-hidden border rounded-xl bg-muted/20">
        {/* Left Sidebar - Audit List */}
        <div className="w-full lg:w-80 border-r flex flex-col bg-background">
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Find audits..." 
                className="pl-9 h-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full h-9">
                <Filter className="w-3 h-3 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="inprogress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredAudits.length > 0 ? (
              <div className="divide-y">
                {filteredAudits.map((audit) => (
                  <button
                    key={audit.id}
                    onClick={() => setActiveAuditId(audit.id)}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition-colors relative ${
                      activeAuditId === audit.id ? 'bg-muted border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{audit.id}</span>
                      <Badge className={`${getPriorityColor(audit.priority)} text-[9px] h-4 py-0`} variant="outline">
                        {audit.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold truncate mb-1">{audit.title}</p>
                    <div className="flex items-center justify-between mt-2">
                       <Badge className={`${getStatusColor(audit.status)} text-[10px] h-4`}>
                        {audit.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {audit.dueDate}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                <p className="text-xs text-muted-foreground">No audits found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Content - Unified Management Workspace */}
        <div className="flex-1 flex flex-col bg-background">
          {currentAudit ? (
            <>
              <div className="p-6 border-b bg-card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono text-xs">{currentAudit.id}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{currentAudit.category}</Badge>
                    </div>
                    <h2 className="text-xl font-bold">{currentAudit.title}</h2>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => generateAuditReport(currentAudit.id)}>
                      <Download className="w-4 h-4 mr-2" />
                      Report
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => {
                      if (confirm('Are you sure you want to delete this audit?')) {
                        deleteAudit(currentAudit.id);
                        setActiveAuditId(null);
                        toast.success('Audit deleted');
                      }
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-muted/30 p-2 rounded-lg text-center">
                     <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                     <Badge className={`${getStatusColor(currentAudit.status)} mt-1`}>{currentAudit.status}</Badge>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg text-center">
                     <p className="text-[10px] text-muted-foreground uppercase">Auditor</p>
                     <p className="text-xs font-semibold mt-1 truncate">{currentAudit.assignedTo}</p>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg text-center">
                     <p className="text-[10px] text-muted-foreground uppercase">Progress</p>
                     <div className="flex items-center justify-center gap-2 mt-1">
                        <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[60px]">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${currentAudit.completionRate}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold">{currentAudit.completionRate}%</span>
                     </div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg text-center">
                     <p className="text-[10px] text-muted-foreground uppercase">Due Date</p>
                     <p className="text-xs font-semibold mt-1">{currentAudit.dueDate}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-6">
                <Tabs defaultValue="checklist" className="h-full flex flex-col">
                  <TabsList className="grid w-80 grid-cols-3 shrink-0">
                    <TabsTrigger value="checklist">Checklist</TabsTrigger>
                    <TabsTrigger value="findings">Findings</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 mt-4 overflow-y-auto pr-2">
                    <TabsContent value="checklist" className="m-0 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold">Audit Checklist Items</h3>
                        <Button size="sm" variant="ghost" className="h-8 text-xs">
                          <Plus className="w-3 h-3 mr-1" /> Add Requirement
                        </Button>
                      </div>
                      
                      {currentAudit.checklist.length > 0 ? (
                        <div className="grid gap-2">
                          {currentAudit.checklist.map((item) => (
                            <div key={item.id} className="group flex items-start gap-4 p-4 border rounded-xl hover:border-blue-200 hover:bg-blue-50/20 transition-all">
                              <Checkbox 
                                checked={item.completed} 
                                onCheckedChange={(checked: boolean) => {
                                  const updatedChecklist = currentAudit.checklist.map(c => 
                                    c.id === item.id ? { ...c, completed: !!checked } : c
                                  );
                                  const completedCount = updatedChecklist.filter(c => c.completed).length;
                                  const rate = Math.round((completedCount / updatedChecklist.length) * 100);
                                  updateAudit(currentAudit.id, { 
                                    checklist: updatedChecklist,
                                    completionRate: rate,
                                    status: rate === 100 ? 'Complete' : rate > 0 ? 'In Progress' : 'Scheduled'
                                  });
                                }}
                              />
                              <div className="flex-1 pt-0.5">
                                <p className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                                  {item.item}
                                </p>
                              </div>
                              {item.completed && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl">
                          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                          <p className="text-sm text-muted-foreground">No checklist items defined</p>
                          <Button variant="outline" size="sm" className="mt-4">Load Default Template</Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="findings" className="m-0 space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Observed Findings</h3>
                        <Button size="sm" className="bg-red-50 text-red-600 hover:bg-red-100 border-red-100 border">
                          <Plus className="w-3 h-3 mr-1" /> New Finding
                        </Button>
                      </div>

                      {currentAudit.findings.length > 0 ? (
                        <div className="space-y-3">
                          {currentAudit.findings.map((finding) => (
                            <div key={finding.id} className="border rounded-xl p-4 bg-red-50/20 relative overflow-hidden group">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400"></div>
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">{finding.description}</p>
                                  <div className="flex gap-2">
                                    <Badge className={`${getPriorityColor(finding.severity)} text-[10px] h-4`} variant="outline">
                                      {finding.severity}
                                    </Badge>
                                    <Badge className={`${getStatusColor(finding.status)} text-[10px] h-4`} variant="outline">
                                      {finding.status}
                                    </Badge>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed">
                          <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                          <p className="text-sm text-muted-foreground">No findings recorded. Audit is compliant.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="details" className="m-0 space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-6">
                           <div className="space-y-2">
                             <Label className="text-muted-foreground">Audit Description</Label>
                             <p className="text-sm leading-relaxed">{currentAudit.description}</p>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                               <Label className="text-muted-foreground">Scheduled On</Label>
                               <p className="text-sm font-medium">{currentAudit.scheduledDate}</p>
                             </div>
                             <div className="space-y-1">
                               <Label className="text-muted-foreground">Deadline</Label>
                               <p className="text-sm font-medium text-red-600">{currentAudit.dueDate}</p>
                             </div>
                           </div>
                         </div>
                         
                         <div className="bg-muted/20 p-6 rounded-xl space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <UserCheck className="w-4 h-4" /> Personnel & Assignment
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-sm p-2 bg-background rounded-lg border">
                                <span className="text-muted-foreground">Primary Auditor</span>
                                <span className="font-medium">{currentAudit.assignedTo}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm p-2 bg-background rounded-lg border">
                                <span className="text-muted-foreground">Department</span>
                                <Badge variant="outline">{currentAudit.category}</Badge>
                              </div>
                              <div className="flex justify-between items-center text-sm p-2 bg-background rounded-lg border">
                                <span className="text-muted-foreground">Method</span>
                                <span className="font-medium text-[10px]">{currentAudit.assignmentType}</span>
                              </div>
                              <Button variant="outline" className="w-full h-8 text-xs mt-2" onClick={() => {
                                setSelectedAudit(currentAudit);
                                setShowAssignDialog(true);
                              }}>
                                Reassign Auditor
                              </Button>
                            </div>
                         </div>
                       </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Target className="w-10 h-10 text-muted-foreground opacity-30" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">Audit Workspace</h2>
              <p className="text-muted-foreground max-w-sm mb-8">
                Select an audit from the left sidebar to view details, update checklists, and record findings.
              </p>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowNewAuditDialog(true)}>
                <Plus className="w-4 h-4 mr-2" /> Schedule First Audit
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}