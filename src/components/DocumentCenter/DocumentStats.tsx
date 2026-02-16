import React from 'react';
import { Card, CardContent } from '../ui/card';
import { FileText, Clock, Eye, CheckCircle } from 'lucide-react';

interface DocumentStatsProps {
  stats: {
    total: number;
    new: number;
    pending: number;
    compliance: number;
  };
}

export default function DocumentStats({ stats }: DocumentStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <div>
              <p className="text-sm text-muted-foreground">New Documents</p>
              <p className="text-2xl font-bold">{stats.new}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Compliance Rate</p>
              <p className="text-2xl font-bold">{stats.compliance}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}