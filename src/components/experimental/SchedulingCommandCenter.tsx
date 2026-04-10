import React, { useState } from 'react';
import { Airplane, Plane, Calendar, MapPin, Clock, Search, Filter, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Activity, LayoutDashboard, List } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useNavigate } from 'react-router-dom';

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

const mockTrips: MasterTrip[] = [
  { id: 't1', tripNumber: 'TRP-2025-001', client: 'Apex Corp', aircraft: 'N123GS (G650)', route: 'KATL → LFPG → OMDB', departureDate: '2025-02-15T14:00:00Z', durationDays: 3, status: 'planning', readinessScore: 85, category: 'next-48' },
  { id: 't2', tripNumber: 'TRP-2025-012', client: 'Internal / Deadhead', aircraft: 'N456XP (Challenger 350)', route: 'KTEB → KDAL', departureDate: '2025-02-16T08:00:00Z', durationDays: 1, status: 'planning', readinessScore: 100, category: 'next-48' },
  { id: 't3', tripNumber: 'TRP-2025-042', client: 'Omega Holdings', aircraft: 'N994XP (G550)', route: 'KTEB → EGGW', departureDate: '2025-03-02T10:00:00Z', durationDays: 2, status: 'planning', readinessScore: 40, criticalBlocker: 'UK eBorders DOB Missing', category: 'this-week' },
  { id: 't4', tripNumber: 'TRP-2025-081', client: 'VIP Charter', aircraft: 'N808Global (Global 7500)', route: 'VOMM → WSSS', departureDate: '2025-03-15T09:00:00Z', durationDays: 4, status: 'dispatched', readinessScore: 100, category: 'long-term' },
  { id: 't5', tripNumber: 'TRP-2025-104', client: 'Mountain Exp.', aircraft: 'N112CX (Challenger 350)', route: 'KDAL → KASE', departureDate: '2025-04-05T12:00:00Z', durationDays: 2, status: 'planning', readinessScore: 30, criticalBlocker: 'FBO Hangar Waitlisted', category: 'long-term' },
  { id: 't6', tripNumber: 'TRP-2025-115', client: 'Resort Ops', aircraft: 'N777LR (G650ER)', route: 'MMMX → MYNN', departureDate: '2025-04-12T11:00:00Z', durationDays: 1, status: 'planning', readinessScore: 15, category: 'long-term' },
];

export default function SchedulingCommandCenter() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tactical' | 'planning'>('tactical');
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);

  // ─── Timeline Generation logic ───
  // We mock a timeline window of 14 days. In a real app we'd map absolute dates.
  const timelineDays = Array.from({ length: 14 }, (_, i) => `Day +${i}`);

  const navigateToWorkspace = (tripId: string) => {
    // In our static prototype, we are just rendering UnifiedTripWorkspace with hardcoded options 
    // inside the UnifiedTripWorkspace itself, but we navigate to the route.
    navigate(`/experimental/unified-trip`);
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

  const next48Trips = filteredTrips.filter(t => t.category === 'next-48');
  const thisWeekTrips = filteredTrips.filter(t => t.category === 'this-week');
  const longTermTrips = filteredTrips.filter(t => t.category === 'long-term');

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
            {/* ─── MACRO TIMELINE ─── */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
               <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                  <div>
                     <h2 className="text-xl font-black text-slate-900">7-Day Tactical Horizon</h2>
                     <p className="text-sm font-bold text-slate-400">Grouped by MyAirOps Logistics Master</p>
                  </div>
                  <div className="flex gap-4">
                     <Badge className="bg-emerald-100 text-emerald-800 font-black">Ready</Badge>
                     <Badge className="bg-amber-100 text-amber-800 font-black">In-Work</Badge>
                     <Badge className="bg-rose-100 text-rose-800 font-black">Blocked</Badge>
                  </div>
               </div>
               
               <div className="p-6 overflow-x-auto">
                  <div className="min-w-[800px]">
                     {/* Timeline Header (Days) */}
                     <div className="grid grid-cols-[250px_1fr] gap-4 mb-4">
                        <div className="font-black text-xs text-slate-400 uppercase tracking-widest pt-2">Trip Summary</div>
                        <div className="grid grid-cols-7 gap-1">
                           {timelineDays.slice(0, 7).map(day => (
                             <div key={day} className="text-[10px] font-black text-slate-400 border-l border-slate-200 pl-2 uppercase">
                               {day}
                             </div>
                           ))}
                        </div>
                     </div>

                     {/* Timeline Rows (Trips) */}
                     <div className="space-y-3">
                        {filteredTrips.map((trip, idx) => {
                           // Mock horizontal position / width purely for visual prototype
                           const offsetClass = `col-start-${(idx % 5) + 1}`;
                           const spanClass = `col-span-${Math.min(trip.durationDays + 1, 7)}`;
                           const isBlocked = !!trip.criticalBlocker;
                           const statusColor = isBlocked ? 'bg-rose-500' : trip.readinessScore === 100 ? 'bg-emerald-500' : 'bg-amber-400';

                           return (
                             <div key={trip.id} className="grid grid-cols-[250px_1fr] gap-4 items-center group cursor-pointer" onClick={() => navigateToWorkspace(trip.tripId)}>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:border-slate-300 transition-all">
                                   <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-black text-slate-900">{trip.tripNumber}</span>
                                      <span className="text-[10px] font-bold text-slate-500">{trip.aircraft.split(' ')[0]}</span>
                                   </div>
                                   <p className="text-xs font-bold text-slate-400 truncate">{trip.route}</p>
                                </div>
                                
                                <div className="grid grid-cols-7 gap-1 h-12 relative rounded-xl bg-slate-50/50">
                                   <div className={`${offsetClass} ${spanClass} h-full rounded-xl ${statusColor} text-white p-2 text-[10px] font-black tracking-widest flex items-center shadow-md relative overflow-hidden transition-all group-hover:scale-[1.02] group-hover:shadow-lg`}>
                                      <div className="absolute inset-0 bg-white/20 w-1/2 skew-x-12 translate-x-[-150%] group-hover:translate-x-[250%] transition-transform duration-1000" />
                                      <span className="truncate relative z-10">{trip.client}</span>
                                   </div>
                                </div>
                             </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
            </div>

            {/* ─── ACTIVE FLIGHT DRAWER (INBOX STYLE) ─── */}
            <div>
               <h2 className="text-2xl font-black tracking-tighter text-slate-900 mb-6 flex items-center gap-3">
                 Mission Triage Queue 
                 {actionRequiredOnly && <Badge className="bg-rose-500 animate-pulse text-[10px]">FILTERED</Badge>}
               </h2>
               
               <div className="grid grid-cols-3 gap-8">
                  {/* Next 48 Hours */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                           <Clock className="h-4 w-4" /> Next 48 Hours
                        </h3>
                        <Badge className="bg-slate-200 text-slate-600">{next48Trips.length}</Badge>
                     </div>
                     {next48Trips.map(trip => (
                       <TripCard key={trip.id} trip={trip} onClick={() => navigateToWorkspace(trip.tripId)} />
                     ))}
                     {next48Trips.length === 0 && (
                       <div className="p-6 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold text-sm">
                         Clear
                       </div>
                     )}
                  </div>

                  {/* This Week */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                           <Calendar className="h-4 w-4" /> Upcoming This Week
                        </h3>
                        <Badge className="bg-slate-200 text-slate-600">{thisWeekTrips.length}</Badge>
                     </div>
                     {thisWeekTrips.map(trip => (
                       <TripCard key={trip.id} trip={trip} onClick={() => navigateToWorkspace(trip.tripId)} />
                     ))}
                     {thisWeekTrips.length === 0 && (
                       <div className="p-6 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold text-sm">
                         Clear
                       </div>
                     )}
                  </div>

                  {/* Long Term */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                           <Plane className="h-4 w-4" /> Long-Term / Int'l
                        </h3>
                        <Badge className="bg-slate-200 text-slate-600">{longTermTrips.length}</Badge>
                     </div>
                     {longTermTrips.map(trip => (
                       <TripCard key={trip.id} trip={trip} onClick={() => navigateToWorkspace(trip.tripId)} />
                     ))}
                     {longTermTrips.length === 0 && (
                       <div className="p-6 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold text-sm">
                         Clear
                       </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function TripCard({ trip, onClick }: { trip: MasterTrip, onClick: () => void }) {
  const isReady = trip.readinessScore === 100;
  const isBlocked = !!trip.criticalBlocker;

  return (
    <Card 
      onClick={onClick}
      className={`rounded-3xl border-2 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
         isBlocked ? 'border-rose-200 bg-rose-50' :
         isReady ? 'border-emerald-200 bg-emerald-50 opacity-80' : 
         'border-slate-100 bg-white shadow-sm'
      }`}
    >
      <CardContent className="p-5">
         <div className="flex items-start justify-between mb-4">
            <div>
               <h4 className="font-black text-lg text-slate-900 leading-none">{trip.tripNumber}</h4>
               <p className="text-xs font-bold text-slate-500 mt-1">{trip.client}</p>
            </div>
            {isBlocked && (
              <div className="bg-rose-100 text-rose-600 p-2 rounded-xl">
                 <AlertTriangle className="h-4 w-4" />
              </div>
            )}
            {isReady && !isBlocked && <Badge className="bg-emerald-500 hover:bg-emerald-600 px-3">READY</Badge>}
         </div>
         
         <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
               <MapPin className="h-4 w-4 text-slate-400" />
               <span className="truncate">{trip.route}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
               <Calendar className="h-4 w-4 text-slate-400" />
               <span>{new Date(trip.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
            </div>
         </div>

         {isBlocked ? (
            <div className="bg-rose-100 p-3 rounded-xl border border-rose-200">
               <p className="text-[10px] font-black uppercase tracking-widest text-rose-800 mb-1">Critical Blocker</p>
               <p className="text-xs font-bold text-rose-900">{trip.criticalBlocker}</p>
            </div>
         ) : (
            <div>
               <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Readiness Pipeline</span>
                  <span className={`text-[10px] font-black ${isReady ? 'text-emerald-600' : 'text-slate-600'}`}>{trip.readinessScore}%</span>
               </div>
               <div className="h-2 rounded-full overflow-hidden bg-slate-200 shadow-inner">
                  <div 
                    className={`h-full ${isReady ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                    style={{ width: `${trip.readinessScore}%` }} 
                  />
               </div>
            </div>
         )}
      </CardContent>
    </Card>
  );
}
