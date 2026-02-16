import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import {
  Mail,
  Send,
  Clock,
  Users,
  Settings,
  Check,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Bell,
  Calendar,
  FileText,
  User
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'document-distribution' | 'acknowledgment-reminder' | 'proposal-submitted' | 'proposal-approved' | 'proposal-rejected';
  variables: string[];
}

interface EmailNotification {
  id: string;
  type: string;
  recipients: string[];
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduledFor?: Date;
  sentAt?: Date;
  documentId?: string;
  proposalId?: string;
  createdBy: string;
}

interface EmailNotificationSystemProps {
  userRole: string;
}

const mockEmailTemplates: EmailTemplate[] = [
  {
    id: 'template-001',
    name: 'Document Distribution',
    subject: 'New Document Assigned: {{documentTitle}}',
    content: `Dear {{recipientName}},

A new document has been assigned to you for review and acknowledgment.

Document Details:
- Title: {{documentTitle}}
- Type: {{documentType}}
- Compliance Level: {{complianceLevel}}
- Due Date: {{dueDate}}

Please log into the Flight Operations system to review and acknowledge this document.

Access the document here: {{documentLink}}

If you have any questions, please contact the document management team.

Best regards,
Flight Operations Team`,
    type: 'document-distribution',
    variables: ['recipientName', 'documentTitle', 'documentType', 'complianceLevel', 'dueDate', 'documentLink']
  },
  {
    id: 'template-002',
    name: 'Acknowledgment Reminder',
    subject: 'Reminder: {{documentTitle}} Acknowledgment Required',
    content: `Dear {{recipientName}},

This is a reminder that you have a pending document acknowledgment.

Document: {{documentTitle}}
Due Date: {{dueDate}}
Days Overdue: {{daysOverdue}}

Please complete your acknowledgment as soon as possible to maintain compliance.

Access the document here: {{documentLink}}

If you need assistance, please contact your supervisor or the training department.

Best regards,
Flight Operations Team`,
    type: 'acknowledgment-reminder',
    variables: ['recipientName', 'documentTitle', 'dueDate', 'daysOverdue', 'documentLink']
  },
  {
    id: 'template-003',
    name: 'Document Proposal Submitted',
    subject: 'New Document Proposal: {{proposalTitle}}',
    content: `Dear Document Management Team,

A new document proposal has been submitted for your review.

Proposal Details:
- Title: {{proposalTitle}}
- Document: {{documentTitle}}
- Proposed By: {{proposerName}} ({{proposerRole}})
- Urgency: {{urgencyLevel}}
- Submitted: {{submissionDate}}

Description: {{proposalDescription}}

Please review the proposal in the document management system.

Access proposal here: {{proposalLink}}

Best regards,
Flight Operations System`,
    type: 'proposal-submitted',
    variables: ['proposalTitle', 'documentTitle', 'proposerName', 'proposerRole', 'urgencyLevel', 'submissionDate', 'proposalDescription', 'proposalLink']
  }
];

const mockNotifications: EmailNotification[] = [
  {
    id: 'notif-001',
    type: 'document-distribution',
    recipients: ['john.smith@airline.com', 'sarah.wilson@airline.com'],
    subject: 'New Document Assigned: Weather Minimums Update',
    content: 'Document distribution notification content...',
    status: 'sent',
    sentAt: new Date('2025-01-28T10:30:00'),
    documentId: 'DOC004',
    createdBy: 'Document Manager'
  },
  {
    id: 'notif-002',
    type: 'proposal-submitted',
    recipients: ['doc.manager@airline.com'],
    subject: 'New Document Proposal: Update Weather Minimums for Cat II',
    content: 'Proposal notification content...',
    status: 'sent',
    sentAt: new Date('2025-01-25T14:15:00'),
    proposalId: 'PROP001',
    createdBy: 'Captain Sarah Mitchell'
  },
  {
    id: 'notif-003',
    type: 'acknowledgment-reminder',
    recipients: ['mike.johnson@airline.com'],
    subject: 'Reminder: Training Module - CRM Acknowledgment Required',
    content: 'Reminder notification content...',
    status: 'scheduled',
    scheduledFor: new Date('2025-01-30T09:00:00'),
    documentId: 'DOC005',
    createdBy: 'System Automated'
  }
];

export default function EmailNotificationSystem({ userRole }: EmailNotificationSystemProps) {
  const [activeTab, setActiveTab] = useState('notifications');
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [composeForm, setComposeForm] = useState({
    recipients: '',
    subject: '',
    content: '',
    scheduleFor: '',
    templateId: ''
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    enableDistributionEmails: true,
    enableReminderEmails: true,
    enableProposalEmails: true,
    reminderInterval: '3', // days
    maxReminders: '3',
    fromEmail: 'flightops@airline.com',
    fromName: 'Flight Operations',
    smtpServer: 'smtp.airline.com',
    smtpPort: '587'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSendEmail = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] Sending email:', composeForm);
    }
    setIsComposeDialogOpen(false);
    setComposeForm({
      recipients: '',
      subject: '',
      content: '',
      scheduleFor: '',
      templateId: ''
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = mockEmailTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setComposeForm({
        ...composeForm,
        templateId,
        subject: template.subject,
        content: template.content
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email Notification System</h2>
          <p className="text-muted-foreground">
            Manage automated notifications for document distribution and compliance
          </p>
        </div>
        <Button
          onClick={() => setIsComposeDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Compose Email
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sent</p>
                    <p className="text-2xl font-bold">1,247</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="text-2xl font-bold">1,235</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="text-2xl font-bold">23</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockNotifications.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{notification.subject}</span>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>To: {notification.recipients.join(', ')}</p>
                        <p>
                          {notification.status === 'sent' && notification.sentAt &&
                            `Sent: ${notification.sentAt.toLocaleString()}`
                          }
                          {notification.status === 'scheduled' && notification.scheduledFor &&
                            `Scheduled: ${notification.scheduledFor.toLocaleString()}`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {notification.status === 'scheduled' && (
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Email Templates</h3>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {mockEmailTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">Subject: {template.subject}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{template.type.replace('-', ' ')}</Badge>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Variables:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-mono line-clamp-3">{template.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Document Distribution Emails</Label>
                  <p className="text-sm text-muted-foreground">Send emails when documents are distributed</p>
                </div>
                <Switch
                  checked={emailSettings.enableDistributionEmails}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, enableDistributionEmails: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Acknowledgment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Send reminder emails for pending acknowledgments</p>
                </div>
                <Switch
                  checked={emailSettings.enableReminderEmails}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, enableReminderEmails: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Proposal Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send emails for document proposals</p>
                </div>
                <Switch
                  checked={emailSettings.enableProposalEmails}
                  onCheckedChange={(checked) =>
                    setEmailSettings({ ...emailSettings, enableProposalEmails: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reminder Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reminder Interval (days)</Label>
                  <Select value={emailSettings.reminderInterval} onValueChange={(value) =>
                    setEmailSettings({ ...emailSettings, reminderInterval: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Maximum Reminders</Label>
                  <Select value={emailSettings.maxReminders} onValueChange={(value) =>
                    setEmailSettings({ ...emailSettings, maxReminders: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 reminder</SelectItem>
                      <SelectItem value="3">3 reminders</SelectItem>
                      <SelectItem value="5">5 reminders</SelectItem>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Server</Label>
                  <Input
                    value={emailSettings.smtpServer}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpServer: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMTP Port</Label>
                  <Input
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                  />
                </div>
              </div>
              <Button className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Successful Deliveries</span>
                    <span className="font-medium">98.9%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bounce Rate</span>
                    <span className="font-medium">0.8%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Open Rate</span>
                    <span className="font-medium">87.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Click Rate</span>
                    <span className="font-medium">65.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Avg. Acknowledgment Time</span>
                    <span className="font-medium">2.3 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical Doc Response</span>
                    <span className="font-medium">4.2 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proposal Response</span>
                    <span className="font-medium">1.8 days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Compose Email Dialog */}
      <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Compose Email Notification</DialogTitle>
            <DialogDescription>
              Send a custom email notification or use a template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email Template (Optional)</Label>
              <Select value={composeForm.templateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template or compose manually" />
                </SelectTrigger>
                <SelectContent>
                  {mockEmailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recipients</Label>
              <Textarea
                value={composeForm.recipients}
                onChange={(e) => setComposeForm({ ...composeForm, recipients: e.target.value })}
                placeholder="Enter email addresses separated by commas"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={composeForm.subject}
                onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                placeholder="Email subject line"
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={composeForm.content}
                onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
                placeholder="Email content"
                rows={8}
              />
            </div>

            <div className="space-y-2">
              <Label>Schedule For (Optional)</Label>
              <Input
                type="datetime-local"
                value={composeForm.scheduleFor}
                onChange={(e) => setComposeForm({ ...composeForm, scheduleFor: e.target.value })}
              />
            </div>

            {selectedTemplate && (
              <Alert>
                <Bell className="w-4 h-4" />
                <AlertDescription>
                  Template variables will be automatically replaced when sent: {
                    selectedTemplate.variables.map(v => `{{${v}}}`).join(', ')
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {composeForm.scheduleFor ? 'Schedule Email' : 'Send Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}