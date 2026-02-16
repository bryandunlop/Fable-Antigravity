import React, { useState } from 'react';
import { usePassengerForms } from './contexts/PassengerFormContext';
import type { FormSubmission } from './contexts/PassengerFormContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Settings
} from 'lucide-react';
import FormTemplateEditor from './FormTemplateEditor';

export default function PassengerForms() {
  const {
    submissions,
    getNewSubmissions,
    getExpiringDocuments,
    getOutdatedData,
    updateSubmission,
    newSubmissionCount,
    expiringDocumentCount,
    outdatedDataCount
  } = usePassengerForms();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Debug logging
  console.log('[PassengerForms] Loaded with submissions:', submissions.length);
  console.log('[PassengerForms] New count:', newSubmissionCount);
  console.log('[PassengerForms] Expiring count:', expiringDocumentCount);
  console.log('[PassengerForms] Outdated count:', outdatedDataCount);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'new': { color: 'bg-blue-500', label: 'New' },
      'reviewed': { color: 'bg-yellow-500', label: 'Reviewed' },
      'entered-myairops': { color: 'bg-green-500', label: 'Entered in MyAirOps' },
      'archived': { color: 'bg-gray-500', label: 'Archived' },
      'decommissioned': { color: 'bg-red-500', label: 'Decommissioned' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleMarkAsReviewed = (submissionId: string) => {
    updateSubmission(submissionId, {
      status: 'reviewed',
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Current User' // In production, use actual user ID
    });
  };

  const handleMarkAsEntered = (submissionId: string) => {
    updateSubmission(submissionId, {
      status: 'entered-myairops',
      enteredAt: new Date().toISOString(),
      enteredBy: 'Current User' // In production, use actual user ID
    });
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/public/passenger-form`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const renderSubmissionsTable = (submissionsList: FormSubmission[]) => {
    if (submissionsList.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No submissions found</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Passenger</TableHead>
              <TableHead>Form Type</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Alerts</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissionsList.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{submission.passengerInfo.name}</p>
                    <p className="text-sm text-muted-foreground">{submission.passengerInfo.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {submission.formType === 'domestic' && 'Domestic'}
                    {submission.formType === 'international' && 'International'}
                    {submission.formType === 'sponsored-trip' && 'Sponsored Trip'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p>{formatDate(submission.submittedAt)}</p>
                    <p className="text-xs text-muted-foreground">{submission.dataAge} days ago</p>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(submission.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {submission.status === 'new' && (
                      <Badge className="bg-blue-500">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        New
                      </Badge>
                    )}
                    {submission.hasExpiringDocuments && (
                      <Badge className="bg-orange-500">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Expiring
                      </Badge>
                    )}
                    {submission.isOutdated && (
                      <Badge className="bg-red-500">
                        <Clock className="w-3 h-3 mr-1" />
                        Outdated
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {submission.status === 'new' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsReviewed(submission.id)}
                      >
                        Mark Reviewed
                      </Button>
                    )}
                    {submission.status === 'reviewed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsEntered(submission.id)}
                      >
                        Mark Entered
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <FileText className="w-8 h-8" />
              Passenger Forms Management
              <Badge variant="outline" className="ml-2 text-xs">v2.0 - Updated</Badge>
            </h1>
            <p className="text-muted-foreground">Manage passenger form submissions and templates</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Submissions</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{newSubmissionCount}</div>
            <p className="text-xs text-muted-foreground">Needs review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Documents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringDocumentCount}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outdated Data</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outdatedDataCount}</div>
            <p className="text-xs text-muted-foreground">Older than 2 years</p>
          </CardContent>
        </Card>
      </div>

      {/* Public Link Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Public Form Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              value={`${window.location.origin}/public/passenger-form`}
              readOnly
              className="flex-1"
            />
            <Button onClick={copyPublicLink} variant="outline">
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Share this link with employees to fill out passenger forms. No login required.
          </p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All Submissions ({submissions.length})
          </TabsTrigger>
          <TabsTrigger value="new">
            New ({newSubmissionCount})
            {newSubmissionCount > 0 && (
              <Badge className="ml-2 bg-blue-500">{newSubmissionCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Documents ({expiringDocumentCount})
            {expiringDocumentCount > 0 && (
              <Badge className="ml-2 bg-orange-500">{expiringDocumentCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outdated">
            Outdated ({outdatedDataCount})
            {outdatedDataCount > 0 && (
              <Badge className="ml-2 bg-red-500">{outdatedDataCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Settings className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSubmissionsTable(submissions)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                New Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertDescription>
                  These submissions have not been reviewed yet. Review them and mark as reviewed or enter them into MyAirOps.
                </AlertDescription>
              </Alert>
              {renderSubmissionsTable(getNewSubmissions())}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Expiring Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-orange-500 bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription>
                  These passengers have documents (passports, visas, etc.) expiring within 30 days. Contact them to update their information.
                </AlertDescription>
              </Alert>
              {renderSubmissionsTable(getExpiringDocuments())}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outdated" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-500" />
                Outdated Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-red-500 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription>
                  These submissions are older than 2 years and have been automatically decommissioned. Contact passengers to submit updated information.
                </AlertDescription>
              </Alert>
              {renderSubmissionsTable(getOutdatedData())}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <FormTemplateEditor />
        </TabsContent>
      </Tabs>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <Card className="max-w-3xl w-full max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Submission Details</CardTitle>
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Passenger Info */}
              <div>
                <h3 className="font-semibold mb-2">Passenger Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p>{selectedSubmission.passengerInfo.name}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p>{selectedSubmission.passengerInfo.email}</p>
                  </div>
                  {selectedSubmission.passengerInfo.phone && (
                    <div>
                      <Label>Phone</Label>
                      <p>{selectedSubmission.passengerInfo.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="font-semibold mb-2">Status</h3>
                <div className="flex gap-2">
                  {getStatusBadge(selectedSubmission.status)}
                  {selectedSubmission.hasExpiringDocuments && (
                    <Badge className="bg-orange-500">Documents Expiring Soon</Badge>
                  )}
                  {selectedSubmission.isOutdated && (
                    <Badge className="bg-red-500">Data Outdated</Badge>
                  )}
                </div>
              </div>

              {/* Document Expirations */}
              {selectedSubmission.documentExpirations && selectedSubmission.documentExpirations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Document Expirations</h3>
                  <div className="space-y-2">
                    {selectedSubmission.documentExpirations.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{doc.fieldLabel}</p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {formatDate(doc.expirationDate)}
                          </p>
                        </div>
                        <div>
                          {doc.isExpired ? (
                            <Badge className="bg-red-500">Expired</Badge>
                          ) : doc.isExpiringSoon ? (
                            <Badge className="bg-orange-500">{doc.daysUntilExpiration} days</Badge>
                          ) : (
                            <Badge variant="outline">{doc.daysUntilExpiration} days</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Responses */}
              <div>
                <h3 className="font-semibold mb-2">Form Responses</h3>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {Object.entries(selectedSubmission.responses).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2 gap-4 p-2 border-b">
                      <Label className="font-medium">{key}</Label>
                      <p className="text-sm">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                {selectedSubmission.status === 'new' && (
                  <Button onClick={() => {
                    handleMarkAsReviewed(selectedSubmission.id);
                    setSelectedSubmission(null);
                  }}>
                    Mark as Reviewed
                  </Button>
                )}
                {selectedSubmission.status === 'reviewed' && (
                  <Button onClick={() => {
                    handleMarkAsEntered(selectedSubmission.id);
                    setSelectedSubmission(null);
                  }}>
                    Mark as Entered in MyAirOps
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}