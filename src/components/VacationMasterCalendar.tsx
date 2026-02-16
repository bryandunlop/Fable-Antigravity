import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Filter, Plane, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type RequestType = 'Vacation' | 'Payback Stop' | 'Off' | 'Medical';

interface ConfirmedVacation {
  id: string;
  crewMemberId: string;
  crewMemberName: string;
  position: string;
  requestType: RequestType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  confirmedDate: Date;
}

export function VacationMasterCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1)); // January 2025
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [confirmedVacations] = useState<ConfirmedVacation[]>([
    {
      id: 'vac1',
      crewMemberId: 'user1',
      crewMemberName: 'John Smith',
      position: 'Captain',
      requestType: 'Vacation',
      startDate: '2025-01-15',
      endDate: '2025-01-22',
      daysRequested: 7,
      confirmedDate: new Date('2024-12-03T15:00:00')
    },
    {
      id: 'vac2',
      crewMemberId: 'user2',
      crewMemberName: 'Mike Johnson',
      position: 'First Officer',
      requestType: 'Payback Stop',
      startDate: '2025-01-10',
      endDate: '2025-01-11',
      daysRequested: 1,
      confirmedDate: new Date('2024-12-04T10:00:00')
    },
    {
      id: 'vac3',
      crewMemberId: 'user3',
      crewMemberName: 'Sarah Williams',
      position: 'Captain',
      requestType: 'Medical',
      startDate: '2025-01-05',
      endDate: '2025-01-12',
      daysRequested: 7,
      confirmedDate: new Date('2024-12-01T11:00:00')
    },
    {
      id: 'vac4',
      crewMemberId: 'user5',
      crewMemberName: 'Jennifer Brown',
      position: 'Captain',
      requestType: 'Vacation',
      startDate: '2025-02-10',
      endDate: '2025-02-17',
      daysRequested: 7,
      confirmedDate: new Date('2024-11-28T14:00:00')
    },
    {
      id: 'vac5',
      crewMemberId: 'user6',
      crewMemberName: 'Robert Garcia',
      position: 'First Officer',
      requestType: 'Off',
      startDate: '2025-01-20',
      endDate: '2025-01-21',
      daysRequested: 2,
      confirmedDate: new Date('2024-12-05T09:00:00')
    }
  ]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1));
  };

  const getVacationsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return confirmedVacations.filter(vac => {
      const start = new Date(vac.startDate);
      const end = new Date(vac.endDate);
      const check = new Date(dateStr);
      return check >= start && check <= end;
    }).filter(vac => {
      if (positionFilter !== 'all' && vac.position !== positionFilter) return false;
      if (typeFilter !== 'all' && vac.requestType !== typeFilter) return false;
      return true;
    });
  };

  const getTypeColor = (type: RequestType) => {
    switch(type) {
      case 'Vacation': return 'bg-blue-500';
      case 'Payback Stop': return 'bg-orange-500';
      case 'Off': return 'bg-green-500';
      case 'Medical': return 'bg-red-500';
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[120px] bg-muted/30"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const vacations = getVacationsForDate(date);
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <div 
          key={day} 
          className={`min-h-[120px] border p-2 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'} hover:bg-muted/20 transition-colors`}
        >
          <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : ''}`}>
            {day}
          </div>
          <div className="space-y-1">
            {vacations.slice(0, 3).map((vac) => (
              <div 
                key={vac.id}
                className={`text-xs p-1 rounded text-white truncate ${getTypeColor(vac.requestType)}`}
                title={`${vac.crewMemberName} - ${vac.requestType}`}
              >
                {vac.crewMemberName}
              </div>
            ))}
            {vacations.length > 3 && (
              <div className="text-xs text-muted-foreground">+{vacations.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center font-medium text-sm py-2 bg-muted">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  const filteredVacations = confirmedVacations.filter(vac => {
    if (positionFilter !== 'all' && vac.position !== positionFilter) return false;
    if (typeFilter !== 'all' && vac.requestType !== typeFilter) return false;
    return true;
  });

  const getStatsByPosition = () => {
    const positions = ['Captain', 'First Officer'];
    return positions.map(pos => ({
      position: pos,
      count: confirmedVacations.filter(v => v.position === pos).length,
      totalDays: confirmedVacations.filter(v => v.position === pos).reduce((sum, v) => sum + v.daysRequested, 0)
    }));
  };

  const getStatsByType = () => {
    const types: RequestType[] = ['Vacation', 'Payback Stop', 'Off', 'Medical'];
    return types.map(type => ({
      type,
      count: confirmedVacations.filter(v => v.requestType === type).length,
      totalDays: confirmedVacations.filter(v => v.requestType === type).reduce((sum, v) => sum + v.daysRequested, 0)
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center space-x-2 mb-2">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <span>Vacation Master Calendar</span>
        </h1>
        <p className="text-muted-foreground">
          View all confirmed time off requests for Gulfstream G650 operations crew
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-700">{confirmedVacations.length}</div>
            <p className="text-sm text-blue-600">Total Confirmed</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-700">
              {confirmedVacations.filter(v => v.requestType === 'Vacation').length}
            </div>
            <p className="text-sm text-green-600">Vacation Days</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-orange-700">
              {confirmedVacations.filter(v => v.requestType === 'Payback Stop').length}
            </div>
            <p className="text-sm text-orange-600">PBST Days</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-700">
              {confirmedVacations.reduce((sum, v) => sum + v.daysRequested, 0)}
            </div>
            <p className="text-sm text-purple-600">Total Days Off</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-bold">
                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      <SelectItem value="Captain">Captain</SelectItem>
                      <SelectItem value="First Officer">First Officer</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Vacation">Vacation</SelectItem>
                      <SelectItem value="Payback Stop">Payback Stop</SelectItem>
                      <SelectItem value="Off">Off</SelectItem>
                      <SelectItem value="Medical">Medical</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <span className="text-sm font-medium">Legend:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm">Vacation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm">Payback Stop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm">Off</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm">Medical</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderCalendar()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Confirmed Time Off Requests</CardTitle>
              <CardDescription>{filteredVacations.length} requests scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredVacations.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((vac) => (
                  <div key={vac.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-1 h-16 rounded ${getTypeColor(vac.requestType)}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-medium">{vac.crewMemberName}</h4>
                          <Badge variant="outline">{vac.position}</Badge>
                          <Badge className={getTypeColor(vac.requestType).replace('bg-', 'bg-') + ' text-white'}>
                            {vac.requestType}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(vac.startDate).toLocaleDateString()} - {new Date(vac.endDate).toLocaleDateString()} 
                          <span className="mx-2">•</span>
                          {vac.daysRequested} days
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confirmed: {vac.confirmedDate.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Time Off by Position</CardTitle>
                <CardDescription>Breakdown of confirmed requests by crew position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getStatsByPosition().map((stat) => (
                    <div key={stat.position} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{stat.position}</span>
                        <span className="text-sm text-muted-foreground">
                          {stat.count} requests ({stat.totalDays} days)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(stat.totalDays / confirmedVacations.reduce((sum, v) => sum + v.daysRequested, 0)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Off by Type</CardTitle>
                <CardDescription>Breakdown of confirmed requests by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getStatsByType().filter(s => s.count > 0).map((stat) => (
                    <div key={stat.type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${getTypeColor(stat.type)}`}></div>
                          <span className="font-medium">{stat.type}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stat.count} requests ({stat.totalDays} days)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getTypeColor(stat.type)}`}
                          style={{ width: `${(stat.totalDays / confirmedVacations.reduce((sum, v) => sum + v.daysRequested, 0)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Coverage Concerns</CardTitle>
              <CardDescription>Days with multiple crew members out</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* This would be calculated based on actual dates */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div>
                    <p className="font-medium">January 10-12, 2025</p>
                    <p className="text-sm text-muted-foreground">3 crew members scheduled off</p>
                  </div>
                  <Badge variant="secondary">Monitor</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
