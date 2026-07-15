import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import {
  Target,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAudits, Audit, AUDIT_TEMPLATES } from '../contexts/AuditContext';
import AuditCalendar from './audit/AuditCalendar';
import AuditPool from './audit/AuditPool';
import AuditDetailDrawer from './audit/AuditDetailDrawer';

export default function InternalAuditManagement() {
  const { audits, addAudit, getPoolAudits } = useAudits();

  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // New Audit Dialog state
  const [showNewAuditDialog, setShowNewAuditDialog] = useState(false);
  const [prefillMonth, setPrefillMonth] = useState<number | undefined>(undefined);
  const [prefillYear, setPrefillYear] = useState<number | undefined>(undefined);

  const [newAuditForm, setNewAuditForm] = useState({
    title: '',
    type: 'Scheduled',
    category: 'Safety Management',
    priority: 'Medium',
    isbaoPart: '',
    scheduledDate: '',
    dueDate: '',
    expirationDate: '',
    protocolLink: '',
    description: '',
    useTemplate: true,
  });

  const poolAudits = getPoolAudits();

  // When opening the "Add Audit" dialog from a calendar cell, prefill the date
  const handleAddAudit = (month?: number, year?: number) => {
    setPrefillMonth(month);
    setPrefillYear(year);

    // Prefill scheduledDate if given a month+year
    if (month !== undefined && year !== undefined) {
      const paddedMonth = String(month + 1).padStart(2, '0');
      setNewAuditForm(f => ({ ...f, scheduledDate: `${year}-${paddedMonth}-01`, dueDate: `${year}-${paddedMonth}-28` }));
    } else {
      setNewAuditForm(f => ({ ...f, scheduledDate: '', dueDate: '' }));
    }
    setShowNewAuditDialog(true);
  };

  const handleAuditClick = (audit: Audit) => {
    setSelectedAudit(audit);
    setShowDrawer(true);
  };

  const handleCreateAudit = (saveToPool: boolean) => {
    const templateItems = newAuditForm.useTemplate
      ? (AUDIT_TEMPLATES[newAuditForm.category as keyof typeof AUDIT_TEMPLATES] || [])
      : [];

    addAudit({
      title: newAuditForm.title || `${newAuditForm.category} Audit`,
      type: newAuditForm.type,
      category: newAuditForm.category,
      status: saveToPool ? 'Draft' : 'Scheduled',
      priority: newAuditForm.priority,
      isbaoPart: newAuditForm.isbaoPart || undefined,
      scheduledDate: saveToPool ? undefined : (newAuditForm.scheduledDate || new Date().toISOString().split('T')[0]),
      dueDate: saveToPool ? undefined : (newAuditForm.dueDate || new Date().toISOString().split('T')[0]),
      expirationDate: newAuditForm.expirationDate || undefined,
      protocolLink: newAuditForm.protocolLink || undefined,
      assignedTo: 'Unassigned',
      assignedRole: '',
      assignmentType: 'None',
      description: newAuditForm.description,
      checklist: templateItems.map((item, idx) => ({
        id: Date.now() + idx,
        item,
        completed: false,
        status: 'Pending' as const,
      })),
      findings: [],
      completionRate: 0,
    });

    toast.success(saveToPool ? 'Audit saved to Pool' : 'Audit scheduled');
    setShowNewAuditDialog(false);
    // Reset form
    setNewAuditForm({
      title: '', type: 'Scheduled', category: 'Safety Management', priority: 'Medium',
      isbaoPart: '', scheduledDate: '', dueDate: '', expirationDate: '',
      protocolLink: '', description: '', useTemplate: true,
    });
  };

  // Summary stats
  const stats = [
    { label: 'Scheduled', count: audits.filter(a => a.status === 'Scheduled').length, color: 'text-blue-600', icon: Calendar },
    { label: 'In Progress', count: audits.filter(a => a.status === 'In Progress').length,  color: 'text-amber-600', icon: Clock },
    { label: 'Complete',   count: audits.filter(a => a.status === 'Complete').length,   color: 'text-green-600', icon: CheckCircle },
    { label: 'Overdue',    count: audits.filter(a => a.status === 'Overdue').length,    color: 'text-red-600',   icon: AlertTriangle },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto h-screen flex flex-col overflow-hidden">

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-5 shrink-0 gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Target className="w-5 h-5 text-blue-600" />
            Audit Workspace
          </h1>
          <p className="text-sm text-muted-foreground">Annual audit planning &amp; management</p>
        </div>
        <Button onClick={() => handleAddAudit()} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Schedule New Audit
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 shrink-0">
        {stats.map(({ label, count, color, icon: Icon }) => (
          <Card key={label} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted/50 border ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Pool (Drafts) Banner */}
      {poolAudits.length > 0 && (
        <div className="shrink-0 mb-4">
          <AuditPool
            poolAudits={poolAudits}
            onAuditClick={handleAuditClick}
          />
        </div>
      )}

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <AuditCalendar
          onAuditClick={handleAuditClick}
          onAddAudit={handleAddAudit}
        />
      </div>

      {/* Audit Detail Drawer */}
      <AuditDetailDrawer
        audit={selectedAudit}
        open={showDrawer}
        onClose={() => { setShowDrawer(false); setSelectedAudit(null); }}
      />

      {/* Schedule / Create Audit Dialog */}
      <Dialog open={showNewAuditDialog} onOpenChange={setShowNewAuditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {prefillMonth !== undefined
                ? `Schedule Audit — ${['January','February','March','April','May','June','July','August','September','October','November','December'][prefillMonth]} ${prefillYear}`
                : 'Schedule New Audit'
              }
            </DialogTitle>
            <DialogDescription>
              Fill in the details below, then choose to schedule it or save it to the pool.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Audit Title</Label>
                <Input
                  placeholder="e.g. Monthly Safety Audit — March"
                  value={newAuditForm.title}
                  onChange={e => setNewAuditForm({ ...newAuditForm, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Category</Label>
                <Select value={newAuditForm.category} onValueChange={(v: string) => setNewAuditForm({ ...newAuditForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(AUDIT_TEMPLATES).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priority</Label>
                <Select value={newAuditForm.priority} onValueChange={(v: string) => setNewAuditForm({ ...newAuditForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>ISBAO Reference</Label>
                <Input
                  placeholder="e.g. ISBAO Stage III §4.1"
                  value={newAuditForm.isbaoPart}
                  onChange={e => setNewAuditForm({ ...newAuditForm, isbaoPart: e.target.value })}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Date</Label>
                <Input type="date" value={newAuditForm.scheduledDate} onChange={e => setNewAuditForm({ ...newAuditForm, scheduledDate: e.target.value })} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newAuditForm.dueDate} onChange={e => setNewAuditForm({ ...newAuditForm, dueDate: e.target.value })} />
              </div>
              <div>
                <Label>Expiration Date</Label>
                <Input type="date" value={newAuditForm.expirationDate} onChange={e => setNewAuditForm({ ...newAuditForm, expirationDate: e.target.value })} />
              </div>
              <div>
                <Label>Protocol / Reference Link</Label>
                <Input placeholder="ISBAO Stage III Section..." value={newAuditForm.protocolLink} onChange={e => setNewAuditForm({ ...newAuditForm, protocolLink: e.target.value })} />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Scope and objectives..." rows={2} value={newAuditForm.description} onChange={e => setNewAuditForm({ ...newAuditForm, description: e.target.value })} />
            </div>

            {/* Template toggle */}
            <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/20">
              <div>
                <p className="text-sm font-medium">Use Category Template</p>
                <p className="text-xs text-muted-foreground">Pre-fill checklist for {newAuditForm.category}</p>
              </div>
              <Checkbox
                checked={newAuditForm.useTemplate}
                onCheckedChange={(v: boolean) => setNewAuditForm({ ...newAuditForm, useTemplate: !!v })}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleCreateAudit(false)}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Audit
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleCreateAudit(true)}>
                <Package className="w-4 h-4 mr-2" />
                Save to Pool
              </Button>
              <Button variant="ghost" onClick={() => setShowNewAuditDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}