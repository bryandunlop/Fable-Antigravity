import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, Clock, CheckCircle, ArrowRight, Plane } from 'lucide-react';

interface TechLogSummaryProps {
  userRole: string;
}

// Mock data for demonstration
const mockSquawkSummary = {
  totalOpen: 3,
  critical: 1,
  high: 1,
  medium: 1,
  inProgress: 2,
  deferredCount: 1,
  recentSquawks: [
    {
      id: 'SQ001',
      aircraftTail: 'N123AB',
      priority: 'high',
      status: 'in-progress',
      description: 'Left main landing gear hydraulic leak',
      reportedAt: new Date('2025-02-05T08:15:00'),
      ataChapter: '32-41-00'
    },
    {
      id: 'SQ002',
      aircraftTail: 'N123AB',
      priority: 'medium',
      status: 'deferred',
      description: 'Cabin temperature control inconsistent',
      reportedAt: new Date('2025-02-04T16:45:00'),
      ataChapter: '21-31-00'
    },
    {
      id: 'SQ003',
      aircraftTail: 'N456CD',
      priority: 'low',
      status: 'open',
      description: 'Reading light inoperative in seat 3A',
      reportedAt: new Date('2025-02-04T14:30:00'),
      ataChapter: '33-41-00'
    }
  ]
};

export default function TechLogSummary({ userRole }: TechLogSummaryProps) {
  const { totalOpen, critical, high, medium, inProgress, deferredCount, recentSquawks } = mockSquawkSummary;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'deferred': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="w-4 h-4" />;
      case 'in-progress': return <Clock className="w-4 h-4" />;
      case 'deferred': return <Clock className="w-4 h-4" />;
      case 'closed': return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Show different content based on user role
  if (!['pilot', 'maintenance', 'admin', 'lead'].includes(userRole)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Tech Log Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-medium text-red-900">{totalOpen}</p>
              <p className="text-sm text-red-700">Open Squawks</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-2xl font-medium text-blue-900">{inProgress}</p>
              <p className="text-sm text-blue-700">In Progress</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-medium text-yellow-900">{deferredCount}</p>
              <p className="text-sm text-yellow-700">Deferred</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-2xl font-medium text-orange-900">{critical + high}</p>
              <p className="text-sm text-orange-700">High Priority</p>
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium">Priority Breakdown</h4>
          <div className="flex flex-wrap gap-2">
            {critical > 0 && (
              <Badge className="bg-red-100 text-red-800 border-red-200">
                {critical} Critical
              </Badge>
            )}
            {high > 0 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                {high} High
              </Badge>
            )}
            {medium > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                {medium} Medium
              </Badge>
            )}
          </div>
        </div>

        {/* Recent Squawks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Recent Squawks</h4>
            <Link to="/tech-log">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {recentSquawks.slice(0, 3).map((squawk) => (
              <div key={squawk.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {squawk.id}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Plane className="w-3 h-3 mr-1" />
                        {squawk.aircraftTail}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(squawk.priority)}`}>
                        {squawk.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">{squawk.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>ATA {squawk.ataChapter}</span>
                      <span>•</span>
                      <span>{squawk.reportedAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(squawk.status)}
                    <Badge className={`text-xs ${getStatusColor(squawk.status)}`}>
                      {squawk.status.replace('-', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Link to="/tech-log" className="flex-1">
            <Button className="w-full" variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              View Tech Log
            </Button>
          </Link>
          {['pilot', 'maintenance'].includes(userRole) && (
            <Link to="/tech-log" className="flex-1">
              <Button className="w-full">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report Squawk
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}