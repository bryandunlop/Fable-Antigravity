import { Document } from '../data/documentData';

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'updated': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'current': return 'bg-green-100 text-green-800 border-green-200';
    case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getComplianceColor = (compliance: string) => {
  switch (compliance.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'required': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'annual': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'optional': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const filterDocuments = (
  documents: Document[],
  searchTerm: string,
  typeFilter: string,
  statusFilter: string
) => {
  return documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type.toLowerCase() === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.status.toLowerCase() === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });
};

export const getDocumentStats = (documents: Document[]) => {
  return {
    total: documents.length,
    new: documents.filter(d => d.status === 'New').length,
    pending: documents.filter(d => !d.acknowledged && d.requiredFor.includes('All')).length,
    compliance: Math.round((documents.filter(d => d.acknowledged).length / documents.length) * 100)
  };
};