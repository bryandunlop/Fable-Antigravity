import React from 'react';
import FleetStatusWidget from './FleetStatusWidget';
import NASImpactWidget from './NASImpactWidget';
import DailyFlightsWidget from './DailyFlightsWidget';
import DutyRosterWidget from './DutyRosterWidget';
import WeatherWidget from './WeatherWidget';
import { ExternalLink, Edit2, Plus, Trash2, X, Check } from 'lucide-react';
import { useState } from 'react';
import { GfoPageHeader } from './gfo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FirLeadershipChip } from './fir/components/FirLeadershipChip';

const DEFAULT_LINKS = [
  { id: '1', name: 'FltPlan.com', url: 'https://www.fltplan.com/' },
  { id: '2', name: 'ForeFlight', url: 'https://plan.foreflight.com/' },
  { id: '3', name: 'ARINCDirect', url: 'https://www.arincdirect.com/' },
  { id: '4', name: 'FAA NOTAMs', url: 'https://notams.aim.faa.gov/notamSearch/' },
  { id: '5', name: 'Aviation Weather', url: 'https://aviationweather.gov/' }
];

interface DashboardProps {
  userRole: string;
}
export default function Dashboard({ userRole }: DashboardProps) {
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const isAdmin = userRole === 'admin';

  const handleAddNewLink = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setLinks([...links, { id: newId, name: 'New Link', url: 'https://' }]);
    startEditing(newId, 'New Link', 'https://');
  };

  const startEditing = (id: string, name: string, url: string) => {
    setEditingId(id);
    setEditName(name);
    setEditUrl(url);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setLinks(links.map(l => l.id === editingId ? { ...l, name: editName, url: editUrl } : l));
    setEditingId(null);
  };

  const deleteLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
    if (editingId === id) setEditingId(null);
  };

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
      <GfoPageHeader
        eyebrow="Global Flight Operations"
        title={getCurrentGreeting()}
        description="Start your day with an overview of operations."
        actions={
          <span className="gfo-eyebrow text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        }
      />

      {/* Persistent Weather Widget */}
      <WeatherWidget />

      {/* Quick Links Card */}
      <div className="glass-premium rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-4 md:border-r border-border md:pr-4">
          <div className="flex items-center gap-2 text-muted-foreground shrink-0">
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide uppercase">Quick Links</span>
          </div>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingLinks(!isEditingLinks)}
              className={`h-7 px-2 text-xs transition-colors ${isEditingLinks ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {isEditingLinks ? 'Done' : <span className="flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</span>}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 overflow-x-auto scroolbar-hide flex-1 pb-1 md:pb-0">
          {links.map(link => (
            <div key={link.id} className="relative shrink-0 group flex items-center">
              {editingId === link.id ? (
                <div className="flex items-center gap-1 bg-muted border border-border rounded-lg p-1 z-10 shadow-xl">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    className="h-7 w-24 text-xs bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring px-2"
                  />
                  <Input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="URL"
                    className="h-7 w-40 text-xs bg-transparent border-none focus-visible:ring-1 focus-visible:ring-ring px-2"
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-gfo-success hover:text-gfo-success hover:bg-muted" onClick={saveEdit}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setEditingId(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm px-4 py-2 rounded-lg bg-muted border border-border hover:bg-secondary hover:border-primary/30 text-foreground transition-all flex items-center gap-2 ${isEditingLinks ? 'rounded-r-none border-r-0' : ''}`}
                    onClick={(e) => isEditingLinks && e.preventDefault()}
                  >
                    {link.name}
                    {!isEditingLinks && <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors opacity-50 group-hover:opacity-100" />}
                  </a>
                  {isEditingLinks && (
                    <div className="flex items-center h-full border border-border border-l-0 rounded-r-lg bg-muted overflow-hidden">
                      <button
                        onClick={() => startEditing(link.id, link.name, link.url)}
                        className="px-2 h-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border-r border-border"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="px-2 h-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {isEditingLinks && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNewLink}
              className="h-[38px] rounded-lg border-dashed border-border bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 gap-1"
            >
              <Plus className="w-4 h-4" /> Add Link
            </Button>
          )}
        </div>
      </div>

      {/* Leadership-only: FIRs in progress (renders nothing for other roles) */}
      <FirLeadershipChip roles={[userRole]} className="mb-6" />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-200px)] min-h-[600px]">

        {/* Top Left: Aircraft Status */}
        <div className="glass-premium rounded-lg p-6 flex flex-col overflow-hidden relative group transition-all duration-500 opacity-0 animate-slide-up [animation-delay:100ms]">
          <FleetStatusWidget compact={true} showDetailsLink={true} transparent={true} className="flex-1" />
        </div>

        {/* Top Right: NAS Impact */}
        <div className="glass-premium rounded-lg p-6 flex flex-col overflow-hidden relative group transition-all duration-500 opacity-0 animate-slide-up [animation-delay:200ms]">
          {/* Padding adjustment to match others since NAS widget has internal titles */}
          <div className="h-full">
            <NASImpactWidget compact={true} transparent={true} />
          </div>
        </div>

        {/* Bottom Left: Flights Today */}
        <div className="glass-premium rounded-lg p-6 flex flex-col overflow-hidden relative group transition-all duration-500 opacity-0 animate-slide-up [animation-delay:300ms]">
          <DailyFlightsWidget />
        </div>

        {/* Bottom Right: Duty Roster */}
        <div className="glass-premium rounded-lg p-6 flex flex-col overflow-hidden relative group transition-all duration-500 opacity-0 animate-slide-up [animation-delay:400ms]">
          <DutyRosterWidget />
        </div>

      </div>
    </div>
  );
}