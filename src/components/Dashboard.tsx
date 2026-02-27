import React from 'react';
import FleetStatusWidget from './FleetStatusWidget';
import NASImpactWidget from './NASImpactWidget';
import DailyFlightsWidget from './DailyFlightsWidget';
import DutyRosterWidget from './DutyRosterWidget';
import WeatherWidget from './WeatherWidget';
import { ExternalLink } from 'lucide-react';

const QUICK_LINKS = [
  { name: 'FltPlan.com', url: 'https://www.fltplan.com/' },
  { name: 'ForeFlight', url: 'https://plan.foreflight.com/' },
  { name: 'ARINCDirect', url: 'https://www.arincdirect.com/' },
  { name: 'FAA NOTAMs', url: 'https://notams.aim.faa.gov/notamSearch/' },
  { name: 'Aviation Weather', url: 'https://aviationweather.gov/' }
];

interface DashboardProps {
  userRole: string;
}

export default function Dashboard({ userRole }: DashboardProps) {

  // Helper to get current greeting
  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{getCurrentGreeting()}</h1>
          <p className="text-muted-foreground mt-1">
            Start your day with an overview of operations.
          </p>
        </div>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Persistent Weather Widget */}
      <WeatherWidget />

      {/* Quick Links Card */}
      <div className="glass-premium rounded-2xl p-4 flex items-center justify-between gap-4 overflow-x-auto scroolbar-hide border border-white/5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2 text-muted-foreground shrink-0 border-r border-white/10 pr-4">
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide uppercase">Quick Links</span>
        </div>
        <div className="flex items-center gap-3 flex-nowrap shrink-0">
          {QUICK_LINKS.map(link => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-foreground transition-all whitespace-nowrap group flex items-center gap-2"
            >
              {link.name}
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors opacity-50 group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-200px)] min-h-[600px]">

        {/* Top Left: Aircraft Status */}
        <div className="glass-premium rounded-2xl p-6 flex flex-col overflow-hidden relative group hover:shadow-glow-blue transition-all duration-500">
          <FleetStatusWidget compact={true} showDetailsLink={true} transparent={true} className="flex-1" />
        </div>

        {/* Top Right: NAS Impact */}
        <div className="glass-premium rounded-2xl p-6 flex flex-col overflow-hidden relative group hover:shadow-glow-orange transition-all duration-500">
          {/* Padding adjustment to match others since NAS widget has internal titles */}
          <div className="h-full">
            <NASImpactWidget compact={true} transparent={true} />
          </div>
        </div>

        {/* Bottom Left: Flights Today */}
        <div className="glass-premium rounded-2xl p-6 flex flex-col overflow-hidden relative group hover:shadow-glow-green transition-all duration-500">
          <DailyFlightsWidget />
        </div>

        {/* Bottom Right: Duty Roster */}
        <div className="glass-premium rounded-2xl p-6 flex flex-col overflow-hidden relative group hover:shadow-glow-purple transition-all duration-500">
          <DutyRosterWidget />
        </div>

      </div>
    </div>
  );
}