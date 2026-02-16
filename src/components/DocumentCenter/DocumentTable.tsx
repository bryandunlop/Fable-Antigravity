import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { FileText, Download, Eye, CheckCircle, Calendar } from 'lucide-react';
import { Document } from '../data/documentData';
import { getStatusColor, getComplianceColor } from '../utils/documentUtils';

interface DocumentTableProps {
  documents: Document[];
  selectedDocs: string[];
  onSelectDoc: (docId: string) => void;
  onSelectAll: () => void;
  onAcknowledge: (docId: string) => void;
}

export default function DocumentTable({
  documents,
  selectedDocs,
  onSelectDoc,
  onSelectAll,
  onAcknowledge
}: DocumentTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Library</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDocs.length === documents.length && documents.length > 0}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onCheckedChange={() => onSelectDoc(doc.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-sm text-muted-foreground">{doc.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.type}</Badge>
                  </TableCell>
                  <TableCell>{doc.category}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(doc.status)}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getComplianceColor(doc.compliance)}>
                      {doc.compliance}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{doc.size}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(doc.lastUpdated).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      {!doc.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAcknowledge(doc.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {documents.length === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No documents match the current filters.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}