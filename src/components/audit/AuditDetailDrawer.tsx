import React, { useState } from 'react';
import {
  X, BookOpen, UserCheck, Calendar, FileText, AlertCircle,
  Plus, Download, Trash2, CheckCircle2, XCircle, RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Audit, useAudits } from '../../contexts/AuditContext';
import AssignAuditorPopover from './AssignAuditorPopover';
import { toast } from 'sonner';

const STATUS_STYLES: Record<string, string> = {
  'Scheduled':   'bg-blue-100 text-blue-800 border-blue-200',
  'In Progress': 'bg-amber-100 text-amber-800 border-amber-200',
  'Complete':    'bg-green-100 text-green-800 border-green-200',
  'Overdue':     'bg-red-100 text-red-800 border-red-200',
  'Draft':       'bg-gray-100 text-gray-600 border-gray-200',
};

interface AuditDetailDrawerProps {
  audit: Audit | null;
  open: boolean;
  onClose: () => void;
}

export default function AuditDetailDrawer({ audit, open, onClose }: AuditDetailDrawerProps) {
  const { updateAudit, deleteAudit } = useAudits();
  const [showNewFinding, setShowNewFinding] = useState(false);
  const [findingForm, setFindingForm] = useState({ description: '', severity: 'Medium', status: 'Open' });

  if (!audit) return null;

  const isUnassigned = !audit.assignedTo || audit.assignedTo === 'Unassigned';
  const statusStyle = STATUS_STYLES[audit.status] ?? 'bg-gray-100 text-gray-600 border-gray-200';

  // Checklist toggle
  const toggleChecklistItem = (itemId: number, newStatus: 'Pass' | 'Fail' | 'Pending') => {
    const updated = audit.checklist.map(c =>
      c.id === itemId
        ? { ...c, status: newStatus, completed: newStatus === 'Pass' }
        : c
    );
    const passCount = updated.filter(c => c.status === 'Pass').length;
    const rate = updated.length > 0 ? Math.round((passCount / updated.length) * 100) : 0;
    const allDone = updated.every(c => c.status !== 'Pending');
    updateAudit(audit.id, {
      checklist: updated,
      completionRate: rate,
      status: allDone ? 'Complete' : rate > 0 ? 'In Progress' : 'Scheduled',
    });
  };

  // Add finding
  const saveFinding = () => {
    if (!findingForm.description.trim()) { toast.error('Enter a description'); return; }
    updateAudit(audit.id, {
      findings: [
        ...audit.findings,
        { id: Date.now(), ...findingForm },
      ],
    });
    setFindingForm({ description: '', severity: 'Medium', status: 'Open' });
    setShowNewFinding(false);
    toast.success('Finding recorded');
  };

  // Delete audit
  const handleDelete = () => {
    if (confirm(`Delete "${audit.title}"?`)) {
      deleteAudit(audit.id);
      onClose();
      toast.success('Audit deleted');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        fixed right-0 top-0 h-full w-full max-w-xl bg-background border-l shadow-2xl z-50
        flex flex-col transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Drawer Header */}
        <div className="flex items-start justify-between p-5 border-b bg-card shrink-0">
          <div className="flex-1 mr-4 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">{audit.id}</Badge>
              <Badge className={`${statusStyle} text-[10px] border`} variant="outline">{audit.status}</Badge>
              <Badge variant="secondary" className="text-[10px]">{audit.category}</Badge>
            </div>
            <h2 className="text-base font-bold leading-snug text-foreground">{audit.title}</h2>

            {/* ISBAO — large and prominent */}
            {audit.isbaoPart && (
              <div className="flex items-center gap-1.5 mt-2">
                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5">
                  {audit.isbaoPart}
                </span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Assignment CTA (shown prominently at top if unassigned) */}
        {isUnassigned ? (
          <div className="px-5 py-3 border-b bg-red-50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700">No auditor assigned</span>
              </div>
              <AssignAuditorPopover audit={audit}>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 h-8 text-white">
                  <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                  Assign Now
                </Button>
              </AssignAuditorPopover>
            </div>
          </div>
        ) : (
          <div className="px-5 py-2.5 border-b bg-muted/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                {audit.assignedTo.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-sm font-medium">{audit.assignedTo}</span>
              <Badge variant="outline" className="text-[9px] h-4">{audit.assignedRole}</Badge>
            </div>
            <AssignAuditorPopover audit={audit}>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                Reassign
              </Button>
            </AssignAuditorPopover>
          </div>
        )}

        {/* Progress Bar (if not draft/scheduled) */}
        {(audit.status === 'In Progress' || audit.status === 'Complete') && (
          <div className="px-5 py-2 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${audit.completionRate}%` }}
                />
              </div>
              <span className="text-xs font-bold text-muted-foreground shrink-0">{audit.completionRate}% complete</span>
            </div>
          </div>
        )}

        {/* Tabs — main content */}
        <div className="flex-1 overflow-hidden p-4">
          <Tabs defaultValue="checklist" className="h-full flex flex-col">
            <TabsList className="grid grid-cols-3 shrink-0">
              <TabsTrigger value="checklist">
                Checklist
                {audit.checklist.length > 0 && (
                  <span className="ml-1.5 text-[9px] bg-muted px-1 rounded">{audit.checklist.filter(c => c.status === 'Pass').length}/{audit.checklist.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="findings">
                Findings
                {audit.findings.length > 0 && (
                  <span className="ml-1.5 text-[9px] bg-muted px-1 rounded">{audit.findings.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-3 overflow-y-auto">
              {/* Checklist Tab */}
              <TabsContent value="checklist" className="m-0 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">{audit.checklist.length} requirements</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const text = prompt('New checklist item:');
                      if (text?.trim()) {
                        const updated = [...audit.checklist, { id: Date.now(), item: text.trim(), completed: false, status: 'Pending' as const }];
                        updateAudit(audit.id, { checklist: updated });
                      }
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>

                {audit.checklist.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed rounded-xl">
                    <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-30" />
                    <p className="text-xs text-muted-foreground">No checklist items</p>
                  </div>
                ) : (
                  audit.checklist.map(item => (
                    <div key={item.id} className="flex items-start gap-2 p-3 border rounded-xl hover:bg-muted/30 transition-colors">
                      {/* Three-state buttons: Pass / Reset / Fail */}
                      <div className="flex gap-1 shrink-0 mt-0.5">
                        <button
                          title="Mark Pass"
                          onClick={() => toggleChecklistItem(item.id, item.status === 'Pass' ? 'Pending' : 'Pass')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            item.status === 'Pass'
                              ? 'bg-green-100 text-green-700 ring-2 ring-green-300'
                              : 'bg-muted text-muted-foreground hover:bg-green-50 hover:text-green-600'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          title="Mark Fail"
                          onClick={() => toggleChecklistItem(item.id, item.status === 'Fail' ? 'Pending' : 'Fail')}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            item.status === 'Fail'
                              ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                              : 'bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${
                          item.status === 'Pass' ? 'line-through text-muted-foreground' :
                          item.status === 'Fail' ? 'text-red-700 font-medium' : 'font-medium'
                        }`}>
                          {item.item}
                        </p>
                        <span className={`text-[10px] ${
                          item.status === 'Pass' ? 'text-green-600' :
                          item.status === 'Fail' ? 'text-red-600' : 'text-muted-foreground'
                        }`}>{item.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Findings Tab */}
              <TabsContent value="findings" className="m-0 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">{audit.findings.length} findings recorded</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setShowNewFinding(v => !v)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Record Finding
                  </Button>
                </div>

                {showNewFinding && (
                  <div className="border border-red-200 bg-red-50/30 rounded-xl p-3 space-y-2">
                    <Textarea
                      placeholder="Describe the finding…"
                      rows={2}
                      value={findingForm.description}
                      onChange={e => setFindingForm({ ...findingForm, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={findingForm.severity} onValueChange={(v: string) => setFindingForm({ ...findingForm, severity: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={findingForm.status} onValueChange={(v: string) => setFindingForm({ ...findingForm, status: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 h-7 text-xs flex-1" onClick={saveFinding}>Save Finding</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewFinding(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {audit.findings.length === 0 && !showNewFinding ? (
                  <div className="text-center py-10 border-2 border-dashed rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No findings — audit is compliant</p>
                  </div>
                ) : (
                  audit.findings.map(f => (
                    <div key={f.id} className="relative border rounded-xl p-3 bg-red-50/20 overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400 rounded-l-xl" />
                      <p className="text-sm font-medium pl-2">{f.description}</p>
                      <div className="flex gap-2 mt-1.5 pl-2">
                        <Badge className="text-[9px] h-4 bg-muted text-muted-foreground border-0">{f.severity}</Badge>
                        <Badge className="text-[9px] h-4 bg-muted text-muted-foreground border-0">{f.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="m-0 space-y-4">
                {audit.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm leading-relaxed">{audit.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Scheduled', value: audit.scheduledDate },
                    { label: 'Due Date', value: audit.dueDate },
                    { label: 'Expiration', value: audit.expirationDate },
                    { label: 'Type', value: audit.type },
                    { label: 'Priority', value: audit.priority },
                    { label: 'Assignment', value: audit.assignmentType },
                  ].filter(r => r.value).map(({ label, value }) => (
                    <div key={label} className="bg-muted/20 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                {audit.isbaoPart && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-blue-600 uppercase font-bold">ISBAO Reference</p>
                      <p className="text-sm font-semibold text-blue-900">{audit.isbaoPart}</p>
                      {audit.protocolLink && <p className="text-[10px] text-blue-700 mt-0.5">{audit.protocolLink}</p>}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t bg-card flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.success(`Generating report for ${audit.id}…`)}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Report
          </Button>

          {audit.status !== 'Complete' && (
            <Select
              value={audit.status}
              onValueChange={(v: string) => {
                updateAudit(audit.id, { status: v });
                toast.success(`Status updated to ${v}`);
              }}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Complete">Complete</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 ml-auto"
            onClick={handleDelete}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}
