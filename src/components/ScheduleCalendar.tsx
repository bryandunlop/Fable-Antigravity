import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Filter, Download, User, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

export default function ScheduleCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [filterBy, setFilterBy] = useState('all');
  const [scheduleView, setScheduleView] = useState<'full' | 'my'>('full'); // Toggle between full fleet and my schedule
  const [currentUser] = useState('John Smith'); // Would come from auth context

  // Mock schedule data - In production, this would be pulled from MyAirOps API
  const scheduleData = {
    '2025-02-01': [
      { id: 'FO001', time: '08:00-16:30', route: 'LAX-JFK', aircraft: 'N123AB', crew: 'Smith, Johnson', type: 'scheduled', assignedCrew: ['John Smith', 'Emily Johnson'] },
    ],
    '2025-02-02': [
      { id: 'FO002', time: '14:15-22:45', route: 'JFK-MIA', aircraft: 'N456CD', crew: 'Brown, Wilson', type: 'scheduled', assignedCrew: ['Robert Brown', 'Sarah Wilson'] },
      { id: 'MX001', time: '09:00-17:00', route: 'Maintenance', aircraft: 'N789EF', crew: 'Wilson', type: 'maintenance', assignedCrew: ['Tom Wilson'] },
    ],
    '2025-02-03': [
      { id: 'FO003', time: '19:30-02:00+1', route: 'MIA-LAX', aircraft: 'N789EF', crew: 'Anderson, Davis', type: 'scheduled', assignedCrew: ['John Smith', 'Michael Davis'] },
      { id: 'TR001', time: '10:00-12:00', route: 'Training', aircraft: 'Simulator', crew: 'Multiple', type: 'training', assignedCrew: ['John Smith', 'Multiple'] },
    ],
    '2025-02-04': [
      { id: 'FO004', time: '06:00-14:30', route: 'LAX-SEA', aircraft: 'N321GH', crew: 'Miller, Garcia', type: 'scheduled', assignedCrew: ['David Miller', 'Sofia Garcia'] },
    ],
    '2025-02-05': [
      { id: 'FO005', time: '12:00-20:30', route: 'SEA-DEN', aircraft: 'N321GH', crew: 'Rodriguez, Lee', type: 'scheduled', assignedCrew: ['John Smith', 'Anna Lee'] },
      { id: 'MX002', time: '08:00-16:00', route: 'Inspection', aircraft: 'N456CD', crew: 'Thompson', type: 'maintenance', assignedCrew: ['Chris Thompson'] },
    ],
  };

  const currentMonth = selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  const currentYear = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    let events = scheduleData[dateKey as keyof typeof scheduleData] || [];

    // Filter by schedule view (full fleet vs my schedule)
    // In production, this would query MyAirOps API with appropriate filters
    if (scheduleView === 'my') {
      events = events.filter(event => event.assignedCrew?.includes(currentUser));
    }

    // Filter by event type
    if (filterBy === 'all') return events;
    return events.filter(event => event.type === filterBy);
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'training': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const events = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 border border-border p-1 cursor-pointer hover:bg-accent ${isToday ? 'bg-primary/5' : ''
            } ${isSelected ? 'bg-primary/10 border-primary' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
            {day}
          </div>
          <div className="space-y-1">
            {events.slice(0, 2).map((event, index) => (
              <div
                key={index}
                className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.type)}`}
              >
                {event.id}
              </div>
            ))}
            {events.length > 2 && (
              <div className="text-xs text-muted-foreground">+{events.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const renderMobileView = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const events = getEventsForDate(date);

      // In mobile view, maybe only show days with events or today?
      // For now, let's show all days but in a compact list

      if (events.length === 0 && date.toDateString() !== new Date().toDateString()) continue;

      days.push(
        <div key={day} className="flex gap-4 p-4 border rounded-lg mb-3 bg-card" onClick={() => setSelectedDate(date)}>
          <div className="flex flex-col items-center justify-center w-12 h-12 bg-muted rounded-full shrink-0">
            <span className="text-xs font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            <span className="text-lg font-bold">{day}</span>
          </div>
          <div className="flex-1 space-y-2">
            {events.length > 0 ? (
              events.map((event, idx) => (
                <div key={idx} className={`text-sm p-2 rounded ${getEventTypeColor(event.type)}`}>
                  <div className="font-semibold">{event.id} - {event.route}</div>
                  <div className="text-xs opacity-75">{event.time} | {event.aircraft}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground italic flex items-center h-full">No scheduled flights</div>
            )}
          </div>
        </div>
      );
    }

    if (days.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No events scheduled for this month.</div>;
    }

    return <div className="space-y-2">{days}</div>;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flight Schedule</h1>
          <p className="text-muted-foreground">View and manage flight assignments and inflight schedules</p>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <Button variant="outline" className="flex-1 lg:flex-none">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="flex-1 lg:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Add Flight
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col gap-4">
                {/* MyAirOps Schedule Toggle */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      MyAirOps Integration
                    </Badge>
                  </div>
                  <Tabs value={scheduleView} onValueChange={(value) => setScheduleView(value as 'full' | 'my')} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-2 md:w-auto">
                      <TabsTrigger value="full" className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span className="hidden md:inline">Full Fleet</span>
                        <span className="md:hidden">Fleet</span>
                      </TabsTrigger>
                      <TabsTrigger value="my" className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span className="hidden md:inline">My Schedule</span>
                        <span className="md:hidden">Me</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <CalendarIcon className="w-5 h-5" />
                    {monthNames[currentMonth]} {currentYear}
                  </CardTitle>

                  <div className="flex items-center gap-2">
                    <Select value={filterBy} onValueChange={setFilterBy}>
                      <SelectTrigger className="w-[110px] md:w-40">
                        <Filter className="w-4 h-4 mr-2 hidden md:inline" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="scheduled">Flights</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center rounded-md border text-card-foreground">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          const newDate = new Date(currentYear, currentMonth - 1, 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-6 bg-border" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          const newDate = new Date(currentYear, currentMonth + 1, 1);
                          setSelectedDate(newDate);
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {/* Desktop View */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-7 gap-0 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border border-border">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0">
                  {renderCalendarView()}
                </div>
              </div>

              {/* Mobile/Tablet View (List) */}
              <div className="lg:hidden">
                {renderMobileView()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Details */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>
                {selectedDate ? selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                }) : 'Select Date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{event.id}</span>
                        <Badge className={getEventTypeColor(event.type)}>
                          {event.type}
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div>⏰ {event.time}</div>
                        <div>✈️ {event.route}</div>
                        <div>🛩️ {event.aircraft}</div>
                        <div>👥 {event.crew}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No events scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Total Flights</span>
                <span className="font-medium">28</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Flight Hours</span>
                <span className="font-medium">156h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Maintenance</span>
                <span className="font-medium">8 events</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Training</span>
                <span className="font-medium">4 sessions</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}