import React from 'react';
import FleetStatusWidget from './FleetStatusWidget';
import NASImpactWidget from './NASImpactWidget';
import DailyFlightsWidget from './DailyFlightsWidget';
import DutyRosterWidget from './DutyRosterWidget';
import WeatherWidget from './WeatherWidget';
import { HOME_STATION } from '../config/station';
import { ExternalLink, Edit2, Plus, Trash2, X, Check, User, Building2 } from 'lucide-react';
import { useState } from 'react';
import { GfoPageHeader } from './gfo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FirLeadershipChip } from './fir/components/FirLeadershipChip';
import {
  useQuickLinks,
  saveOrgLinks,
  savePersonalLinks,
  normalizeUrl,
  newLinkId,
  type QuickLink,
} from '../utils/quickLinks';

const DRAFT_ID = '__draft__';

interface DashboardProps {
  userRole: string;
}
export default function Dashboard({ userRole }: DashboardProps) {
  const { org, personal } = useQuickLinks();
  const [isEditingLinks, setIsEditingLinks] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editScope, setEditScope] = useState<QuickLink['scope']>('personal');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [urlInvalid, setUrlInvalid] = useState(false);

  const isAdmin = userRole === 'admin';
  const allLinks = [...org, ...personal];
  // Admin manages org links; everyone manages their own personal links.
  const canManage = (link: QuickLink) => isAdmin || link.scope === 'personal';

  const closeEdit = () => {
    setEditingId(null);
    setNameInvalid(false);
    setUrlInvalid(false);
  };

  const handleAddNewLink = () => {
    setEditName('');
    setEditUrl('');
    setEditScope(isAdmin ? 'org' : 'personal');
    setNameInvalid(false);
    setUrlInvalid(false);
    setEditingId(DRAFT_ID);
  };

  const startEditing = (link: QuickLink) => {
    setEditName(link.name);
    setEditUrl(link.url);
    setEditScope(link.scope);
    setNameInvalid(false);
    setUrlInvalid(false);
    setEditingId(link.id);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const name = editName.trim();
    const url = normalizeUrl(editUrl);
    setNameInvalid(!name);
    setUrlInvalid(!url);
    if (!name || !url) return;
    const scope = isAdmin ? editScope : 'personal';
    if (editingId === DRAFT_ID) {
      const link: QuickLink = { id: newLinkId(), name, url, scope };
      if (scope === 'org') saveOrgLinks([...org, link]);
      else savePersonalLinks([...personal, link]);
    } else {
      const original = allLinks.find(l => l.id === editingId);
      if (!original || !canManage(original)) return;
      const updated: QuickLink = { ...original, name, url, scope };
      if (original.scope === scope) {
        if (scope === 'org') saveOrgLinks(org.map(l => (l.id === editingId ? updated : l)));
        else savePersonalLinks(personal.map(l => (l.id === editingId ? updated : l)));
      } else if (scope === 'org') {
        savePersonalLinks(personal.filter(l => l.id !== editingId));
        saveOrgLinks([...org, updated]);
      } else {
        saveOrgLinks(org.filter(l => l.id !== editingId));
        savePersonalLinks([...personal, updated]);
      }
    }
    closeEdit();
  };

  const deleteLink = (link: QuickLink) => {
    if (!canManage(link)) return;
    if (link.scope === 'org') saveOrgLinks(org.filter(l => l.id !== link.id));
    else savePersonalLinks(personal.filter(l => l.id !== link.id));
    if (editingId === link.id) closeEdit();
  };

  const editRow = (
    <div className="flex items-center gap-1 bg-muted border border-border rounded-lg p-1 z-10 shadow-lg">
      <Input
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        placeholder="Name"
        aria-invalid={nameInvalid}
        className={`h-7 w-24 text-xs bg-transparent border-none px-2 ${nameInvalid ? 'ring-1 ring-destructive focus-visible:ring-1 focus-visible:ring-destructive' : 'focus-visible:ring-1 focus-visible:ring-ring'}`}
      />
      <Input
        value={editUrl}
        onChange={(e) => setEditUrl(e.target.value)}
        placeholder="URL"
        aria-invalid={urlInvalid}
        className={`h-7 w-40 text-xs bg-transparent border-none px-2 ${urlInvalid ? 'ring-1 ring-destructive focus-visible:ring-1 focus-visible:ring-destructive' : 'focus-visible:ring-1 focus-visible:ring-ring'}`}
      />
      {isAdmin && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
          title={editScope === 'org' ? 'Org link — everyone sees it. Click to make personal.' : 'Personal link — only this browser. Click to make org.'}
          onClick={() => setEditScope(editScope === 'org' ? 'personal' : 'org')}
        >
          {editScope === 'org' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-6 w-6 text-gfo-success hover:text-gfo-success hover:bg-muted" onClick={saveEdit}>
        <Check className="w-3 h-3" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={closeEdit}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );

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

      {/* Quick Links Card */}
      <div className="glass-premium rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-4 md:border-r border-border md:pr-4">
          <div className="flex items-center gap-2 text-muted-foreground shrink-0">
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-wide uppercase">Quick Links</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isEditingLinks) closeEdit();
              setIsEditingLinks(!isEditingLinks);
            }}
            className={`h-7 px-2 text-xs transition-colors ${isEditingLinks ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {isEditingLinks ? 'Done' : <span className="flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</span>}
          </Button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1 pb-1 md:pb-0">
          {allLinks.map(link => (
            <div key={link.id} className="relative shrink-0 group flex items-center">
              {editingId === link.id ? (
                editRow
              ) : (
                <div className="flex items-center">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm px-4 py-2 rounded-lg bg-muted border border-border hover:bg-secondary hover:border-primary/30 text-foreground transition-all flex items-center gap-2 ${isEditingLinks && canManage(link) ? 'rounded-r-none border-r-0' : ''}`}
                    onClick={(e) => isEditingLinks && e.preventDefault()}
                  >
                    {link.name}
                    {link.scope === 'personal' && (
                      <User className="w-3 h-3 text-muted-foreground opacity-60" aria-label="Personal link" />
                    )}
                    {!isEditingLinks && <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors opacity-50 group-hover:opacity-100" />}
                  </a>
                  {isEditingLinks && canManage(link) && (
                    <div className="flex items-center h-full border border-border border-l-0 rounded-r-lg bg-muted overflow-hidden">
                      <button
                        onClick={() => startEditing(link)}
                        className="px-2 h-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border-r border-border"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteLink(link)}
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
          {isEditingLinks && editingId === DRAFT_ID && (
            <div className="relative shrink-0 flex items-center">{editRow}</div>
          )}
          {isEditingLinks && editingId !== DRAFT_ID && (
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
