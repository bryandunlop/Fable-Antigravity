import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Upload, Download, Plus, FileEdit, PenTool } from 'lucide-react';
import { mockDocuments, type Document } from './data/documentData';
import { filterDocuments, getDocumentStats } from './utils/documentUtils';
import DocumentStats from './DocumentCenter/DocumentStats';
import DocumentFilters from './DocumentCenter/DocumentFilters';
import DocumentTable from './DocumentCenter/DocumentTable';
import DigitalSignature from './DigitalSignature';

interface DocumentCenterProps {
  userRole?: string;
}

export default function DocumentCenter({ userRole = 'pilot' }: DocumentCenterProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // New state for enhanced features
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [selectedDocumentForSignature, setSelectedDocumentForSignature] = useState<Document | null>(null);

  const filteredDocuments = filterDocuments(mockDocuments, searchTerm, typeFilter, statusFilter);
  const stats = getDocumentStats(mockDocuments);

  const handleSelectDoc = (docId: string) => {
    setSelectedDocs(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === filteredDocuments.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDocuments.map(doc => doc.id));
    }
  };

  const acknowledgeDocument = (docId: string) => {
    const document = mockDocuments.find(doc => doc.id === docId);
    if (document) {
      setSelectedDocumentForSignature(document);
      setIsSignatureDialogOpen(true);
    }
  };

  const handleDigitalSignature = (signatureData: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV] Document digitally signed:', signatureData);
    }
    // Update document acknowledgment status in real app
  };



  const handleGeneralProposalSubmission = () => {
    navigate('/document-management');
  };

  const getUserInfo = () => ({
    name: 'Current User', // Would be actual user data from context/auth
    role: userRole.charAt(0).toUpperCase() + userRole.slice(1),
    email: 'user@airline.com'
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1>Document Center</h1>
          <p className="text-muted-foreground">Access manuals, procedures, and compliance documents</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGeneralProposalSubmission}
          >
            <FileEdit className="w-4 h-4 mr-2" />
            Propose Changes
          </Button>
          <Button variant="outline" disabled={selectedDocs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Download ({selectedDocs.length})
          </Button>
        </div>
      </div>

      <DocumentStats stats={stats} />

      {/* Quick Guide for Document Requests */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium mb-2 text-blue-900">💡 How to Submit Document Requests</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <div className="bg-blue-100 rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center font-medium">1</div>
            <div>
              <strong>Request Changes:</strong> Use "Propose Changes" button above to navigate to the Document Request Center for all document modification and update requests
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-blue-100 rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center font-medium">2</div>
            <div>
              <strong>Track Progress:</strong> All your requests are tracked in the Document Request Center with real-time status updates and notifications
            </div>
          </div>
        </div>
      </div>

      <DocumentFilters
        searchTerm={searchTerm}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        onSearchChange={setSearchTerm}
        onTypeFilterChange={setTypeFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <DocumentTable
        documents={filteredDocuments}
        selectedDocs={selectedDocs}
        onSelectDoc={handleSelectDoc}
        onSelectAll={handleSelectAll}
        onAcknowledge={acknowledgeDocument}
      />

      {/* Digital Signature Dialog */}
      {selectedDocumentForSignature && (
        <DigitalSignature
          isOpen={isSignatureDialogOpen}
          onClose={() => {
            setIsSignatureDialogOpen(false);
            setSelectedDocumentForSignature(null);
          }}
          onSign={handleDigitalSignature}
          document={{
            id: selectedDocumentForSignature.id,
            title: selectedDocumentForSignature.title,
            type: selectedDocumentForSignature.type,
            compliance: selectedDocumentForSignature.compliance
          }}
          userInfo={getUserInfo()}
        />
      )}


    </div>
  );
}