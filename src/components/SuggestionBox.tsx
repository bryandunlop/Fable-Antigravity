import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Mail, MessageSquare, CheckCircle, Clock, Flag, Users, Edit } from 'lucide-react';

interface SuggestionBoxItem {
  id: string;
  title: string;
  description: string;
  submittedBy: string;
  submittedDate: string;
  category: string;
  targetRole: string; // Which manager should handle this
  priority: 'high' | 'medium' | 'low';
  status: 'new' | 'under-review' | 'approved' | 'implemented' | 'rejected';
  assignedTo?: string;
  response?: string;
  responseDate?: string;
}

/**
 * Suggestion Box — what the department has raised, routed to the manager who
 * owns it. Split out of the old three-tab CriticalFunctionsPlan page.
 */
export default function SuggestionBox() {
  // Mock data for Suggestion Box
  const suggestionBoxItems: SuggestionBoxItem[] = [
    {
      id: 'SB001',
      title: 'Improve Pre-Flight Inspection Process',
      description: 'Suggestion to add digital checklist for pre-flight inspections to reduce paperwork and improve accuracy',
      submittedBy: 'Captain Rodriguez',
      submittedDate: '2024-01-18',
      category: 'Process Improvement',
      targetRole: 'Chief Pilot',
      priority: 'medium',
      status: 'under-review',
      assignedTo: 'Chief Pilot'
    },
    {
      id: 'SB002',
      title: 'Maintenance Schedule Optimization',
      description: 'Propose using predictive analytics to optimize maintenance schedules and reduce aircraft downtime',
      submittedBy: 'John Mechanic',
      submittedDate: '2024-01-16',
      category: 'Maintenance',
      targetRole: 'Maintenance Manager',
      priority: 'high',
      status: 'approved',
      assignedTo: 'Maintenance Manager',
      response: 'Excellent suggestion. We will evaluate predictive analytics solutions.',
      responseDate: '2024-01-17'
    },
    {
      id: 'SB003',
      title: 'Passenger Service Enhancement',
      description: 'Add tablet-based entertainment system to improve passenger experience on longer flights',
      submittedBy: 'Flight Attendant Smith',
      submittedDate: '2024-01-15',
      category: 'Passenger Experience',
      targetRole: 'Inflight Manager',
      priority: 'low',
      status: 'new'
    },
    {
      id: 'SB004',
      title: 'Safety Reporting System Update',
      description: 'Modernize the hazard reporting system with mobile app integration for faster reporting',
      submittedBy: 'Safety Officer Davis',
      submittedDate: '2024-01-12',
      category: 'Safety',
      targetRole: 'Safety Manager',
      priority: 'high',
      status: 'implemented',
      assignedTo: 'Safety Manager',
      response: 'Implemented mobile reporting feature. Great suggestion!',
      responseDate: '2024-01-14'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'completed': case 'implemented': return 'bg-green-500';
      case 'in-progress': case 'under-review': return 'bg-blue-500';
      case 'backup': case 'approved': return 'bg-yellow-500';
      case 'unavailable': case 'overdue': case 'rejected': return 'bg-red-500';
      case 'on-hold': case 'new': return 'bg-gray-500';
      case 'not-started': return 'bg-slate-400';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Suggestion Box
        </h1>
        <p className="text-muted-foreground">What the department has raised, routed to the manager who owns it</p>
      </div>

      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2>Suggestion Box Inbox</h2>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Managers</SelectItem>
                  <SelectItem value="Chief Pilot">Chief Pilot</SelectItem>
                  <SelectItem value="Maintenance Manager">Maintenance Manager</SelectItem>
                  <SelectItem value="Inflight Manager">Inflight Manager</SelectItem>
                  <SelectItem value="Safety Manager">Safety Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Suggestions</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {suggestionBoxItems.filter(item => item.status === 'new').length}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {suggestionBoxItems.filter(item => item.status === 'under-review').length}
                </div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Implemented</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {suggestionBoxItems.filter(item => item.status === 'implemented').length}
                </div>
                <p className="text-xs text-muted-foreground">This quarter</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <Flag className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {suggestionBoxItems.filter(item => item.priority === 'high').length}
                </div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            {suggestionBoxItems.map((suggestion) => (
              <Card key={suggestion.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {suggestion.title}
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(suggestion.priority)} mr-1`}></div>
                          {suggestion.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(suggestion.status)} mr-1`}></div>
                          {suggestion.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.targetRole}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Submitted By</Label>
                        <p>{suggestion.submittedBy}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                        <p>{formatDate(suggestion.submittedDate)}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                        <p>{suggestion.category}</p>
                      </div>
                      {suggestion.assignedTo && (
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Assigned To</Label>
                          <p>{suggestion.assignedTo}</p>
                        </div>
                      )}
                    </div>

                    {suggestion.response && (
                      <div>
                        <Label className="text-sm font-medium">Management Response</Label>
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <p className="text-sm">{suggestion.response}</p>
                          {suggestion.responseDate && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Response date: {formatDate(suggestion.responseDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {suggestion.status === 'new' && (
                      <div className="flex gap-2">
                        <Button size="sm">Accept for Review</Button>
                        <Button variant="outline" size="sm">Request More Info</Button>
                        <Button variant="destructive" size="sm">Decline</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
      </div>
    </div>
  );
}
