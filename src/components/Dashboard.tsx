import React from 'react';
import FleetStatusWidget from './FleetStatusWidget';
import NASImpactWidget from './NASImpactWidget';
import DailyFlightsWidget from './DailyFlightsWidget';
import DutyRosterWidget from './DutyRosterWidget';
import WeatherWidget from './WeatherWidget';

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