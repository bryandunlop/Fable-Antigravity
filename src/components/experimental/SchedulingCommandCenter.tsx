import React, { useState } from 'react';
import { Airplane, Plane, Calendar, MapPin, Globe, Clock, Search, Filter, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, ChevronLeft, Activity, LayoutDashboard, List } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useNavigate } from 'react-router-dom';
import { SHARED_MOCK_TRIPS, AIRCRAFT } from './mockData';

interface MasterTrip {
  id: string;
  tripNumber: string;
  client: string;
  aircraft: string;
  route: string;
  departureDate: string; // ISO format for easy parsing
  durationDays: number;
  status: 'planning' | 'in-progress' | 'dispatched';
  readinessScore: number;
  criticalBlocker?: string;
  category: 'next-48' | 'this-week' | 'long-term';
}

const todayMs = new Date().getTime();
const mockTrips: MasterTrip[] = SHARED_MOCK_TRIPS.map(t => {
   const depTime = new Date(t.departureDate).getTime();
   const diffHours = (depTime - todayMs) / (1000 * 60 * 60);
   let cat: 'next-48' | 'this-week' | 'long-term' = 'long-term';
   if (diffHours <= 48) cat = 'next-48';
   else if (diffHours <= 168) cat = 'this-week';

   return { ...t, category: cat };
});

export default function SchedulingCommandCenter() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tactical' | 'planning'>('tactical');
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);

  // ─── Calendar Generation logic ───
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const navigateToWorkspace = (tripId: string) => {
    navigate('/experimental/unified-trip', { state: { tripId } });
  };

  const filteredTrips = mockTrips.filter(t => {
    // If actionRequiredOnly is true, we only show trips whose readiness < 100 or which have a critical blocker
    if (actionRequiredOnly) {
      if (t.readinessScore === 100 && !t.criticalBlocker) return false;
    }
    // and match search
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!t.tripNumber.toLowerCase().includes(s) && !t.client.toLowerCase().includes(s) && !t.aircraft.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  const sortTrips = (trips: MasterTrip[]) => trips.sort((a, b) => {
    if (a.criticalBlocker && !b.criticalBlocker) return -1;
    if (!a.criticalBlocker && b.criticalBlocker) return 1;
    return a.readinessScore - b.readinessScore;
  });

  const next48Trips = sortTrips(filteredTrips.filter(t => t.category === 'next-48'));
  const thisWeekTrips = sortTrips(filteredTrips.filter(t => t.category === 'this-week'));
  const longTermTrips = sortTrips(filteredTrips.filter(t => t.category === 'long-term'));

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 -m-6 font-sans">
      
      {/* Header */}
      <header className="h-24 bg-slate-950 text-white flex items-center justify-between px-10 shadow-lg relative z-20">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-4">
             <Activity className="h-8 w-8 text-blue-500" />
             MASTER SCHEDULING COMMAND
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-1 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> 
             MyAirOps API Sync Active
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
             <Switch id="action-req" checked={actionRequiredOnly} onCheckedChange={setActionRequiredOnly} className="data-[state=checked]:bg-rose-500" />
             <label htmlFor="action-req" className="text-xs font-bold uppercase tracking-widest text-white cursor-pointer select-none">Action Required</label>
          </div>
          
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
             <button 
               onClick={() => setViewMode('tactical')}
               className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'tactical' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
             >
                <LayoutDashboard className="h-4 w-4" /> Tactical
             </button>
             <button 
               onClick={() => setViewMode('planning')}
               className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'planning' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
             >
                <List className="h-4 w-4" /> Planning
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-10 flex flex-col gap-10">
        
        {viewMode === 'planning' ? (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-8 pb-4 border-b">
                <h2 className="text-2xl font-black text-slate-900">Long-Term Range Planning (8-90 Days)</h2>
                <Badge className="bg-slate-100 text-slate-600 px-4 py-1 text-sm font-black">{filteredTrips.length} Trips Listed</Badge>
             </div>
             <Table>
                <TableHeader>
                   <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 h-12">Trip ID</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Date</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Route</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Client / Tail</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Blocks/Tasks</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredTrips.map(trip => {
                      const isReady = trip.readinessScore === 100;
                      const isBlocked = !!trip.criticalBlocker;
                      return (
                         <TableRow key={trip.id} onClick={() => navigateToWorkspace(trip.tripId)} className="cursor-pointer hover:bg-slate-50 transition-colors group">
                            <TableCell className="font-black text-slate-900 py-4">{trip.tripNumber}</TableCell>
                            <TableCell className="font-bold text-slate-500 py-4">{new Date(trip.departureDate).toLocaleDateString()}</TableCell>
                            <TableCell className="py-4">
                               <div className="flex items-center gap-2 font-bold text-slate-700">
                                  <MapPin className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                  <span className="truncate max-w-[200px]">{trip.route}</span>
                               </div>
                            </TableCell>
                            <TableCell className="py-4">
                               <div className="flex flex-col">
                                  <span className="font-bold text-slate-900">{trip.client}</span>
                                  <span className="text-[10px] font-black text-slate-400">{trip.aircraft}</span>
                               </div>
                            </TableCell>
                            <TableCell className="py-4">
                               {isBlocked ? <Badge className="bg-rose-100 text-rose-700 px-3">BLOCKED</Badge> : isReady ? <Badge className="bg-emerald-100 text-emerald-700 px-3">READY</Badge> : <Badge className="bg-amber-100 text-amber-700 px-3">IN-WORK</Badge>}
                            </TableCell>
                            <TableCell className="py-4">
                               {isBlocked ? (
                                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {trip.criticalBlocker}</span>
                               ) : (
                                  <span className={`text-xs font-black ${isReady ? 'text-emerald-500' : 'text-slate-400'}`}>{trip.readinessScore}% Ready</span>
                               )}
                            </TableCell>
                         </TableRow>
                      );
                   })}
                   {filteredTrips.length === 0 && (
                     <TableRow className="hover:bg-transparent">
                       <TableCell colSpan={6} className="h-64 text-center text-slate-500 font-bold">
                         <div className="flex flex-col items-center justify-center gap-3">
                           <CheckCircle2 className="h-12 w-12 text-slate-300" />
                           <p>No trips match this filter criteria.</p>
                         </div>
                       </TableCell>
                     </TableRow>
                   )}
                </TableBody>
             </Table>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-10">
            {/* ─── MACRO CALENDAR ─── */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4">
                        <Calendar className="h-6 w-6 text-blue-500" />
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                     </h2>
                  </div>
                  <div className="flex gap-4 items-center">
                     <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                        <button onClick={prevMonth} className="px-3 py-1.5 hover:bg-white rounded-lg transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 hover:bg-white rounded-lg transition-colors text-xs font-black uppercase tracking-widest text-slate-600">Today</button>
                        <button onClick={nextMonth} className="px-3 py-1.5 hover:bg-white rounded-lg transition-colors"><ChevronRight className="h-4 w-4" /></button>
                     </div>
                  </div>
               </div>
               
               <div className="bg-slate-50/50">
                  <div className="grid grid-cols-7 border-b border-slate-100">
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-r border-slate-100 last:border-0">
                           {day}
                        </div>
                     ))}
                  </div>

                  <div className="grid grid-cols-7 border-b border-slate-100">
                     {/* Padding for first week */}
                     {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 border-r border-slate-100 last:border-0 border-b border-slate-100" />
                     ))}

                     {/* Days of month */}
                     {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);

                        // Find trips departing on this specific date
                        const dayTrips = filteredTrips.filter(t => {
                           const d = new Date(t.departureDate);
                           return d.getFullYear() === cellDate.getFullYear() && 
                                  d.getMonth() === cellDate.getMonth() && 
                                  d.getDate() === cellDate.getDate();
                        });

                        return (
                           <div key={dayNum} className="min-h-[120px] bg-white border-r border-b border-slate-100 p-2 relative group hover:bg-slate-50 transition-colors">
                              <span className="text-xs font-black text-slate-300 absolute top-2 right-2 group-hover:text-slate-500 transition-colors">{dayNum}</span>
                              <div className="mt-6 flex flex-col gap-1.5">
                                 {dayTrips.map(trip => {
                                    const isBlocked = !!trip.criticalBlocker;
                                    const daysUntilDeparture = Math.floor((new Date(trip.departureDate).getTime() - todayMs) / 86400000);
                                    const isAirborne = trip.readinessScore === 100 && daysUntilDeparture <= 0;
                                    const isReady = trip.readinessScore === 100 && !isAirborne;
                                    const isUninteracted = trip.readinessScore === 0 && !isBlocked;
                                    const isBehind = !isBlocked && !isReady && !isAirborne && !isUninteracted && ((trip.readinessScore < 90 && daysUntilDeparture < 1) || (trip.readinessScore < 50 && daysUntilDeparture < 3));
                                    
                                    const isTwoWeekTrigger = daysUntilDeparture <= 14 && daysUntilDeparture > 5 && trip.readinessScore < 80;

                                    let styleLayer = "bg-blue-500 text-white border border-transparent"; // Default 'On Track'
                                    if (isBlocked) {
                                       styleLayer = "bg-rose-500 text-white border border-transparent";
                                    } else if (isAirborne) {
                                       styleLayer = "bg-indigo-600 text-white border border-transparent shadow-[0_0_10px_rgba(79,70,229,0.5)]";
                                    } else if (isReady) {
                                       styleLayer = "bg-emerald-500 text-white border border-transparent";
                                    } else if (isTwoWeekTrigger || isBehind) {
                                       styleLayer = "bg-amber-50 text-amber-900 border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-[pulse_2s_ease-in-out_infinite]";
                                    } else if (isUninteracted) {
                                       styleLayer = "bg-slate-100 border border-dashed border-slate-400 text-slate-500 hover:border-slate-500 hover:bg-slate-200";
                                    }
                                    
                                    return (
                                       <div 
                                          key={trip.id} 
                                          onClick={() => navigateToWorkspace(trip.tripId)}
                                          className={`px-2 py-1.5 rounded-md ${styleLayer} text-[9px] font-black tracking-widest flex items-center justify-between cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all relative`}
                                          title={trip.tripNumber}
                                       >
                                          <div className="flex items-center gap-1 min-w-0 truncate">
                                             {(trip as any).isInternational ? <Globe className="h-2.5 w-2.5 shrink-0" /> : <MapPin className="h-2.5 w-2.5 shrink-0" />}
                                             <span className="truncate">{trip.route}</span>
                                          </div>
                                          <span className="opacity-80 ml-1.5 shrink-0">{trip.aircraft.split(' ')[0]}</span>
                                       </div>
                                    )
                                 })}
                              </div>
                           </div>
                        );
                     })}

                     {/* Padding for end of grid */}
                     {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }).map((_, i) => (
                        <div key={`empty-end-${i}`} className="min-h-[120px] bg-slate-50/30 border-r border-slate-100 border-b border-slate-100 last:border-0" />
                     ))}
                  </div>
               </div>
            </div>

            {/* ─── ACTIVE FLIGHT DRAWER (INBOX STYLE) ─── */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-4">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 className="text-xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                    Master Dispatch Grid
                    {actionRequiredOnly && <Badge className="bg-rose-500 animate-pulse text-[10px]">ACTION REQUIRED</Badge>}
                  </h2>
                  <div className="flex gap-2 text-sm font-bold text-slate-500">
                     <span className="bg-slate-200 px-3 py-1 rounded-full">{filteredTrips.length} Total Flights</span>
                     <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full">{filteredTrips.filter(t => t.criticalBlocker).length} Blocked</span>
                  </div>
               </div>
               
               <div className="overflow-auto max-h-[600px]">
                 <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                       <TableRow>
                          <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Flight</TableHead>
                          <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Date</TableHead>
                          <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Aircraft</TableHead>
                          <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Route</TableHead>
                          <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400 text-center">Status</TableHead>
                          <TableHead className="font-black text-xs uppercase tracking-widest text-slate-400">Readiness</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                       {/* Sort all filtered trips: Blockers top, then chronological */}
                       {filteredTrips.sort((a,b) => {
                          if (a.criticalBlocker && !b.criticalBlocker) return -1;
                          if (!a.criticalBlocker && b.criticalBlocker) return 1;
                          return new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime();
                       }).map(trip => {
                          const isBlocked = !!trip.criticalBlocker;
                          const daysUntilDeparture = Math.floor((new Date(trip.departureDate).getTime() - todayMs) / 86400000);
                          const isAirborne = trip.readinessScore === 100 && daysUntilDeparture <= 0;
                          const isReady = trip.readinessScore === 100 && !isAirborne;
                          const isUninteracted = trip.readinessScore === 0 && !isBlocked;
                          const isBehind = !isBlocked && !isReady && !isAirborne && !isUninteracted && ((trip.readinessScore < 90 && daysUntilDeparture < 1) || (trip.readinessScore < 50 && daysUntilDeparture < 3));
                          
                          return (
                            <TableRow 
                               key={trip.id} 
                               className={`cursor-pointer transition-colors group ${isBlocked ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}
                               onClick={() => navigateToWorkspace(trip.tripId)}
                            >
                               <TableCell>
                                  <div className="font-black text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{trip.tripNumber}</div>
                                  <div className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{trip.client}</div>
                               </TableCell>
                               <TableCell>
                                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                                     <Calendar className="h-3 w-3 text-slate-400" />
                                     {new Date(trip.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}
                                  </div>
                               </TableCell>
                               <TableCell className="font-black text-slate-900 border-r border-slate-100 flex items-center gap-2">
                                  {trip.aircraft}
                                  {(trip as any).isInternational && <Badge className="text-[8px] px-1 bg-fuchsia-100 text-fuchsia-700 font-bold tracking-widest border-fuchsia-200 uppercase">INTL</Badge>}
                               </TableCell>
                               <TableCell>
                                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 max-w-[200px] truncate" title={trip.route}>
                                     <MapPin className="h-3 w-3 text-slate-400" />
                                     {trip.route}
                                  </div>
                               </TableCell>
                               <TableCell className="text-center">
                                  {isBlocked ? (
                                     <Badge className="bg-rose-100 text-rose-700 px-3 py-1 font-black uppercase tracking-widest text-[9px] hover:bg-rose-200">
                                        Blocked
                                     </Badge>
                                  ) : isAirborne ? (
                                     <Badge className="bg-indigo-100 text-indigo-700 px-3 py-1 font-black uppercase tracking-widest text-[9px] hover:bg-indigo-200 border-indigo-300">
                                        Airborne
                                     </Badge>
                                  ) : isReady ? (
                                     <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1 font-black uppercase tracking-widest text-[9px] hover:bg-emerald-200">
                                        Ready
                                     </Badge>
                                  ) : isBehind ? (
                                     <Badge className="bg-amber-100 text-amber-700 px-3 py-1 font-black uppercase tracking-widest text-[9px] hover:bg-amber-200">
                                        Behind
                                     </Badge>
                                  ) : isUninteracted ? (
                                     <Badge className="bg-slate-100 text-slate-500 border border-dashed border-slate-300 px-3 py-1 font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 hover:border-slate-400">
                                        Uninteracted
                                     </Badge>
                                  ) : (
                                     <Badge className="bg-blue-100 text-blue-700 px-3 py-1 font-black uppercase tracking-widest text-[9px] hover:bg-blue-200">
                                        On Track
                                     </Badge>
                                  )}
                               </TableCell>
                               <TableCell>
                                  {isBlocked ? (
                                     <div className="flex items-center gap-2 text-rose-600 text-xs font-bold w-full max-w-[200px]">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{trip.criticalBlocker}</span>
                                     </div>
                                  ) : isAirborne ? (
                                     <div className="flex items-center gap-2 text-indigo-600 text-xs font-black">
                                        <Plane className="h-4 w-4" /> Airborne
                                     </div>
                                  ) : isReady ? (
                                     <div className="flex items-center gap-2 text-emerald-600 text-xs font-black">
                                        <CheckCircle2 className="h-4 w-4" /> Cleared
                                     </div>
                                  ) : (
                                     <div className="flex items-center gap-3 w-full max-w-[150px]">
                                        <div className="h-1.5 flex-1 rounded-full overflow-hidden bg-slate-200">
                                           <div className={`h-full ${isBehind ? 'bg-amber-400' : 'bg-blue-400'}`} style={{ width: `${trip.readinessScore}%` }} />
                                        </div>
                                        <span className={`text-[10px] font-black w-8 text-right ${isBehind ? 'text-amber-500' : 'text-blue-500'}`}>{trip.readinessScore}%</span>
                                     </div>
                                  )}
                               </TableCell>
                            </TableRow>
                          );
                       })}
                    </TableBody>
                 </Table>
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
