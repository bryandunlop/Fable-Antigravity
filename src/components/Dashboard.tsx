import React from 'react';
import FleetStatusWidget from './FleetStatusWidget';
import NASImpactWidget from './NASImpactWidget';
import DailyFlightsWidget from './DailyFlightsWidget';
import DutyRosterWidget from './DutyRosterWidget';
import WeatherWidget from './WeatherWidget';
import { HOME_STATION } from '../config/station';
import { ExternalLink, Edit2, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { GfoPageHeader } from './gfo';
import { Button } from './ui/button';
import { FirLeadershipChip } from './fir/components/FirLeadershipChip';
import LinkFavicon from './LinkFavicon';
import QuickLinkEditor from './QuickLinkEditor';
import { hostLabel } from '../utils/favicon';
import {
  useQuickLinks,
  saveOrgLinks,
  savePersonalLinks,
  newLinkId,
  type QuickLink,
} from '../utils/quickLinks';

interface DashboardProps {
  userRole: string;
}
export default function Dashboard({ userRole }: DashboardProps) {
  const { org, personal } = useQuickLinks();
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  // The link being edited, or null when the editor is adding a new one.
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  const isAdmin = userRole === 'admin';
  // Admin manages org links; everyone manages their own personal links.
  const canManage = (link: QuickLink) => isAdmin || link.scope === 'personal';

  const openAdd = () => {
    setEditingLink(null);
    setEditorOpen(true);
  };

  const openEdit = (link: QuickLink) => {
    if (!canManage(link)) return;
    setEditingLink(link);
    setEditorOpen(true);
  };

  const closeEditor = () => setEditorOpen(false);

  const handleSave = (name: string, url: string, scope: QuickLink['scope']) => {
    if (editingLink === null) {
      const link: QuickLink = { id: newLinkId(), name, url, scope };
      if (scope === 'org') saveOrgLinks([...org, link]);
      else savePersonalLinks([...personal, link]);
    } else {
      const original = editingLink;
      if (!canManage(original)) return;
      const updated: QuickLink = { ...original, name, url, scope };
      if (original.scope === scope) {
        if (scope === 'org') saveOrgLinks(org.map(l => (l.id === original.id ? updated : l)));
        else savePersonalLinks(personal.map(l => (l.id === original.id ? updated : l)));
      } else if (scope === 'org') {
        savePersonalLinks(personal.filter(l => l.id !== original.id));
        saveOrgLinks([...org, updated]);
      } else {
        saveOrgLinks(org.filter(l => l.id !== original.id));
        savePersonalLinks([...personal, updated]);
      }
    }
    closeEditor();
  };

  const deleteLink = (link: QuickLink) => {
    if (!canManage(link)) return;
    if (link.scope === 'org') saveOrgLinks(org.filter(l => l.id !== link.id));
    else savePersonalLinks(personal.filter(l => l.id !== link.id));
  };

  const tile = (link: QuickLink) => {
    const manageable = isEditingLinks && canManage(link);
    const body = (
      <>
        <LinkFavicon name={link.name} url={link.url} size={40} />
        <div className="text-sm font-medium leading-tight line-clamp-1 w-full">{link.name}</div>
        <div className="text-xs text-muted-foreground line-clamp-1 w-full">{hostLabel(link.url)}</div>
      </>
    );
    return (
      <div key={link.id} className="relative group">
        {manageable ? (
          <div className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-muted/40 border border-border">
            {body}
          </div>
        ) : (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center gap-2 p-3 rounded-xl bg-muted/40 border border-border hover:bg-secondary hover:border-primary/30 transition-all"
          >
            {body}
          </a>
        )}

        {link.scope === 'personal' && !manageable && (
          <span
            className="absolute top-1.5 left-1.5 text-muted-foreground/70"
            title="Personal link — only on this device"
          >
            <User className="w-3 h-3" />
          </span>
        )}

        {manageable && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
            <button
              onClick={() => openEdit(link)}
              aria-label={`Edit ${link.name}`}
              className="p-1 rounded-md bg-background/90 border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => deleteLink(link)}
              aria-label={`Delete ${link.name}`}
              className="p-1 rounded-md bg-background/90 border border-border text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const gridClass = 'grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3';

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
      <WeatherWidget icaoId={HOME_STATION} />

      {/* Quick Links launcher */}
      <div className="glass-premium rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide uppercase">Quick Links</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingLinks(v => !v)}
            className={`h-7 px-2 text-xs transition-colors ${isEditingLinks ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {isEditingLinks ? 'Done' : <span className="flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</span>}
          </Button>
        </div>

        {org.length > 0 && (
          <div className="space-y-2">
            {personal.length > 0 && (
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Shared</p>
            )}
            <div className={gridClass}>{org.map(tile)}</div>
          </div>
        )}

        {personal.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Personal</p>
            <div className={gridClass}>{personal.map(tile)}</div>
          </div>
        )}

        {isEditingLinks && (
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" /> Add link
          </button>
        )}
      </div>

      <QuickLinkEditor
        open={editorOpen}
        link={editingLink}
        isAdmin={isAdmin}
        onSave={handleSave}
        onClose={closeEditor}
      />

      {/* Leadership-only: FIRs in progress (renders nothing for other roles) */}
      <FirLeadershipChip roles={[userRole]} className="mb-6" />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-200px)] min-h-[600px]">

        {/* Top Left: Aircraft Status */}
        <div className="glass-premium rounded-lg p-6 flex flex-col overflow-hidden relative group transition-all duration-500 opacity-0 animate-slide-up [animation-delay:100ms]">
          <FleetStatusWidget showDetailsLink={true} transparent={true} className="flex-1" />
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
