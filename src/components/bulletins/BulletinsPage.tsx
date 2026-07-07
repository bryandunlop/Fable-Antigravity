import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import {
  BookOpen, Plus, Search, Filter, Calendar, User, Tag, Eye, Edit, Trash2, Pin, Archive,
  Clock, X, ShieldCheck, Printer, CheckCircle2, PenLine, ClipboardCheck,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Bulletin, BulletinType } from './types';
import { useBulletins } from './BulletinContext';
import { resolveUserId } from '../../notifications/identity';
import {
  isAcknowledged, acknowledgedFor, outstandingReaders, isTargetRole, type Reader,
} from './engine/acknowledgments';

export interface BulletinsPageConfig {
  bulletinType: BulletinType;
  idPrefix: string;
  headerTitle: string;
  headerSubtitle: string;
  docLabel: string;
}

interface BulletinsPageProps {
  userRole: string;
  config: BulletinsPageConfig;
}

const CATEGORIES = [
  'Standard Operating Procedures', 'Safety Procedures', 'Maintenance Procedures',
  'Emergency Procedures', 'Flight Operations', 'Inflight Service', 'Scheduling',
  'Administrative', 'Compliance', 'Training',
];

const ROLE_OPTIONS = [
  { value: 'pilot', label: 'Pilots' },
  { value: 'inflight', label: 'Flight Attendant' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'safety', label: 'Safety' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'document-manager', label: 'Document Manager' },
  { value: 'procedural-specialist', label: 'Procedural Specialist' },
  { value: 'admin-assistant', label: 'Admin Assistant' },
  { value: 'lead', label: 'Leadership' },
  { value: 'admin', label: 'Admin' },
  { value: 'all', label: 'All Roles' },
];

const roleLabel = (role: string) => ROLE_OPTIONS.find((r) => r.value === role)?.label || role;

function getRoleBadgeColor(role: string) {
  const colors: { [key: string]: string } = {
    pilot: 'bg-blue-100 text-blue-800',
    inflight: 'bg-purple-100 text-purple-800',
    maintenance: 'bg-orange-100 text-orange-800',
    safety: 'bg-red-100 text-red-800',
    scheduling: 'bg-green-100 text-green-800',
    'procedural-specialist': 'bg-indigo-100 text-indigo-800',
    admin: 'bg-gray-100 text-gray-800',
    all: 'bg-slate-100 text-slate-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

function emptyBulletin(bulletinType: BulletinType, userName: string): Partial<Bulletin> {
  return {
    title: '', content: '', category: '', roles: [],
    effectiveDate: new Date().toISOString().split('T')[0], expirationDate: '',
    author: userName, version: '1.0', isPinned: false, isArchived: false,
    requireAcknowledgment: false, bulletinType, tags: [], images: [], videos: [], links: [],
  };
}

export default function BulletinsPage({ userRole, config }: BulletinsPageProps) {
  const { state, addBulletin, updateBulletin, deleteBulletin, togglePin, toggleArchive, acknowledge } = useBulletins();
  const userName = 'Current User';
  const currentUserId = resolveUserId(userRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Bulletin | null>(null);

  // Read-and-Initial confirm state (reset each time a bulletin is opened).
  const [ackChecked, setAckChecked] = useState(false);
  const [ackInitials, setAckInitials] = useState('');

  const [newBulletin, setNewBulletin] = useState<Partial<Bulletin>>(emptyBulletin(config.bulletinType, userName));

  // Only admin/safety/lead/document-manager/procedural-specialist can manage.
  const canManage = ['admin', 'safety', 'lead', 'document-manager', 'procedural-specialist'].includes(userRole);

  const acks = state.acknowledgments;

  const readersFor = (bulletin: Bulletin): Reader[] => {
    const roles = bulletin.roles.includes('all')
      ? ROLE_OPTIONS.map((r) => r.value).filter((v) => v !== 'all')
      : bulletin.roles;
    return Array.from(new Set(roles)).map((role) => ({ role, userId: resolveUserId(role) }));
  };

  const bulletinsOfType = useMemo(
    () => state.bulletins.filter((b) => b.bulletinType === config.bulletinType),
    [state.bulletins, config.bulletinType],
  );

  const filteredBulletins = bulletinsOfType.filter((bulletin) => {
    // Managers see every bulletin of this type; readers see only those targeting them.
    if (!canManage && !isTargetRole(bulletin, userRole)) return false;
    if (!showArchived && bulletin.isArchived) return false;
    if (selectedCategory !== 'all' && bulletin.category !== selectedCategory) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!(
        bulletin.title.toLowerCase().includes(query) ||
        bulletin.content.toLowerCase().includes(query) ||
        bulletin.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        bulletin.category.toLowerCase().includes(query)
      )) return false;
    }

    if (bulletin.expirationDate) {
      const expirationDate = new Date(bulletin.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expirationDate < today) return false;
    }
    return true;
  });

  const sortedBulletins = [...filteredBulletins].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
  });

  const nextId = () => {
    const nums = bulletinsOfType
      .map((b) => Number(b.id.replace(/^\D+-?/, '')))
      .filter((n) => !Number.isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${config.idPrefix}-${String(next).padStart(3, '0')}`;
  };

  const resetNewBulletin = () => setNewBulletin(emptyBulletin(config.bulletinType, userName));

  const handleCreateBulletin = () => {
    if (!newBulletin.title || !newBulletin.content || !newBulletin.category || !newBulletin.roles?.length) {
      toast.error('Please fill in all required fields');
      return;
    }
    const bulletin: Bulletin = {
      id: nextId(),
      bulletinType: config.bulletinType,
      title: newBulletin.title,
      content: newBulletin.content,
      category: newBulletin.category,
      roles: newBulletin.roles,
      effectiveDate: newBulletin.effectiveDate || new Date().toISOString().split('T')[0],
      expirationDate: newBulletin.expirationDate,
      author: userName,
      createdDate: new Date().toISOString().split('T')[0],
      version: newBulletin.version || '1.0',
      isPinned: newBulletin.isPinned || false,
      isArchived: false,
      requireAcknowledgment: newBulletin.requireAcknowledgment || false,
      tags: newBulletin.tags || [],
      images: newBulletin.images || [],
      videos: newBulletin.videos || [],
      links: newBulletin.links || [],
    };
    addBulletin(bulletin);
    setIsCreateDialogOpen(false);
    resetNewBulletin();
    toast.success(`${config.docLabel} created successfully`);
  };

  const handleEditBulletin = () => {
    if (!newBulletin.id || !newBulletin.title || !newBulletin.content || !newBulletin.category || !newBulletin.roles?.length) {
      toast.error('Please fill in all required fields');
      return;
    }
    const existing = state.bulletins.find((b) => b.id === newBulletin.id);
    if (!existing) return;
    updateBulletin({
      ...existing,
      title: newBulletin.title!,
      content: newBulletin.content!,
      category: newBulletin.category!,
      roles: newBulletin.roles!,
      effectiveDate: newBulletin.effectiveDate || existing.effectiveDate,
      expirationDate: newBulletin.expirationDate,
      version: newBulletin.version || existing.version,
      isPinned: newBulletin.isPinned || false,
      requireAcknowledgment: newBulletin.requireAcknowledgment || false,
      tags: newBulletin.tags || [],
      lastUpdated: new Date().toISOString().split('T')[0],
    });
    setIsCreateDialogOpen(false);
    resetNewBulletin();
    toast.success(`${config.docLabel} updated successfully`);
  };

  const handleEditClick = (bulletin: Bulletin) => {
    setNewBulletin(bulletin);
    setIsCreateDialogOpen(true);
  };

  const handleViewBulletin = (bulletin: Bulletin) => {
    setSelectedBulletin(bulletin);
    setAckChecked(false);
    setAckInitials('');
    setIsViewDialogOpen(true);
  };

  const handleConfirmAck = () => {
    if (!selectedBulletin) return;
    if (!ackChecked || ackInitials.trim().length < 2) {
      toast.error('Check the box and enter your initials to confirm.');
      return;
    }
    acknowledge(selectedBulletin, ackInitials, userRole);
    toast.success('Read & initialed — thank you.');
    setAckChecked(false);
    setAckInitials('');
  };

  const handleRoleToggle = (role: string) => {
    const currentRoles = newBulletin.roles || [];
    if (role === 'all') {
      setNewBulletin({ ...newBulletin, roles: ['all'] });
    } else {
      const updatedRoles = currentRoles.includes(role)
        ? currentRoles.filter((r) => r !== role && r !== 'all')
        : [...currentRoles.filter((r) => r !== 'all'), role];
      setNewBulletin({ ...newBulletin, roles: updatedRoles });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-muted-foreground mb-2">
            <BookOpen className="w-8 h-8" />
            {config.headerTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{config.headerSubtitle}</p>
        </div>
        {canManage && (
          <Button onClick={() => { resetNewBulletin(); setIsCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Bulletin
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search bulletins by title, content, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-64">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showArchived"
                checked={showArchived}
                onCheckedChange={(checked: boolean | 'indeterminate') => setShowArchived(checked as boolean)}
              />
              <Label htmlFor="showArchived" className="cursor-pointer">Show Archived</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulletins List */}
      <div className="space-y-4">
        {sortedBulletins.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bulletins found</p>
            </CardContent>
          </Card>
        ) : (
          sortedBulletins.map((bulletin) => {
            const mustAck = bulletin.requireAcknowledgment && isTargetRole(bulletin, userRole);
            const acked = isAcknowledged(bulletin, acks, currentUserId);
            const readers = readersFor(bulletin);
            const readCount = readers.length - outstandingReaders(bulletin, readers, acks).length;
            return (
              <Card
                key={bulletin.id}
                className={`premium-card glass-premium group ${bulletin.isPinned ? 'border-pg-accent ring-1 ring-pg-accent/10' : ''} ${bulletin.isArchived ? 'opacity-60' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {bulletin.isPinned && <Pin className="w-4 h-4 text-blue-600" />}
                        {bulletin.isArchived && <Archive className="w-4 h-4 text-gray-600" />}
                        <CardTitle className="text-xl">{bulletin.title}</CardTitle>
                        {mustAck && !acked && (
                          <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                            <PenLine className="w-3 h-3 mr-1" />
                            Action required — Read &amp; Initial
                          </Badge>
                        )}
                        {mustAck && acked && (
                          <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Read &amp; initialed
                          </Badge>
                        )}
                        {canManage && bulletin.requireAcknowledgment && (
                          <Badge variant="outline" className="text-xs">
                            <ClipboardCheck className="w-3 h-3 mr-1" />
                            {readCount}/{readers.length} read
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline">{bulletin.category}</Badge>
                        <Badge variant="secondary">v{bulletin.version}</Badge>
                        <span className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3" />
                          Effective: {new Date(bulletin.effectiveDate).toLocaleDateString()}
                        </span>
                        {bulletin.expirationDate && (
                          <span className="flex items-center gap-1 text-xs text-orange-600">
                            <Clock className="w-3 h-3" />
                            Expires: {new Date(bulletin.expirationDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3" />
                          {bulletin.author}
                        </span>
                      </CardDescription>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {bulletin.roles.map((role) => (
                          <Badge key={role} className={getRoleBadgeColor(role)}>{roleLabel(role)}</Badge>
                        ))}
                      </div>
                      {bulletin.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {bulletin.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant={mustAck && !acked ? 'default' : 'outline'} size="sm" onClick={() => handleViewBulletin(bulletin)}>
                        <Eye className="w-4 h-4 mr-2" />
                        {mustAck && !acked ? 'Read & Initial' : 'View'}
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => togglePin(bulletin.id)}>
                            <Pin className={`w-4 h-4 ${bulletin.isPinned ? 'text-blue-600' : ''}`} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toggleArchive(bulletin.id)}>
                            <Archive className={`w-4 h-4 ${bulletin.isArchived ? 'text-orange-600' : ''}`} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(bulletin)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(bulletin)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground line-clamp-2 prose-sm dark:prose-invert">
                    {bulletin.content.substring(0, 200)}...
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create / Edit Bulletin Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{newBulletin.id ? `Edit ${config.docLabel}` : `Create New ${config.docLabel}`}</DialogTitle>
            <DialogDescription>Create a reference document for specific roles</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newBulletin.title}
                onChange={(e) => setNewBulletin({ ...newBulletin, title: e.target.value })}
                placeholder="Enter bulletin title..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={newBulletin.category} onValueChange={(value: string) => setNewBulletin({ ...newBulletin, category: value })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={newBulletin.version}
                  onChange={(e) => setNewBulletin({ ...newBulletin, version: e.target.value })}
                  placeholder="1.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effectiveDate">Effective Date *</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={newBulletin.effectiveDate}
                  onChange={(e) => setNewBulletin({ ...newBulletin, effectiveDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={newBulletin.expirationDate || ''}
                  onChange={(e) => setNewBulletin({ ...newBulletin, expirationDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Applicable Roles *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {ROLE_OPTIONS.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={newBulletin.roles?.includes(role.value) || false}
                      onCheckedChange={() => handleRoleToggle(role.value)}
                    />
                    <Label htmlFor={`role-${role.value}`} className="cursor-pointer">{role.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={newBulletin.tags?.join(', ')}
                onChange={(e) => setNewBulletin({
                  ...newBulletin,
                  tags: e.target.value.split(',').map((t) => t.trim()).filter((t) => t),
                })}
                placeholder="winter, safety, maintenance..."
              />
            </div>
            <div>
              <Label htmlFor="content">Content * (Markdown supported)</Label>
              <Textarea
                id="content"
                value={newBulletin.content}
                onChange={(e) => setNewBulletin({ ...newBulletin, content: e.target.value })}
                placeholder="Enter bulletin content using Markdown formatting..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPinned"
                checked={newBulletin.isPinned}
                onCheckedChange={(checked: boolean | 'indeterminate') => setNewBulletin({ ...newBulletin, isPinned: checked as boolean })}
              />
              <Label htmlFor="isPinned" className="cursor-pointer">Pin this bulletin (appears at top of list)</Label>
            </div>
            <div className="flex items-center space-x-2 rounded-md border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 p-3">
              <Checkbox
                id="requireAck"
                checked={newBulletin.requireAcknowledgment}
                onCheckedChange={(checked: boolean | 'indeterminate') => setNewBulletin({ ...newBulletin, requireAcknowledgment: checked as boolean })}
              />
              <Label htmlFor="requireAck" className="cursor-pointer">
                <span className="font-medium">Require Read &amp; Initial</span>
                <span className="block text-xs text-muted-foreground">
                  Target-role readers must confirm they have read this bulletin. Read receipts are tracked below.
                </span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetNewBulletin(); }}>Cancel</Button>
            <Button onClick={newBulletin.id ? handleEditBulletin : handleCreateBulletin}>
              {newBulletin.id ? 'Update Bulletin' : 'Create Bulletin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Bulletin Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 gap-0 border-none bg-slate-50 dark:bg-slate-900 shadow-2xl">
          {selectedBulletin && (() => {
            const mustAck = selectedBulletin.requireAcknowledgment && isTargetRole(selectedBulletin, userRole);
            const acked = isAcknowledged(selectedBulletin, acks, currentUserId);
            const myAck = acknowledgedFor(selectedBulletin, acks).find((a) => a.userId === currentUserId);
            const readers = readersFor(selectedBulletin);
            const outstanding = outstandingReaders(selectedBulletin, readers, acks);
            const done = acknowledgedFor(selectedBulletin, acks);
            return (
              <div className="flex flex-col h-full">
                {/* Official Document Header */}
                <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pg-blue dark:bg-pg-accent rounded-lg flex items-center justify-center text-white shadow-lg shadow-pg-blue/20">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-pg-blue dark:text-white uppercase">Antigravity Aviation</h2>
                        <p className="text-xs font-semibold text-pg-accent uppercase tracking-[0.2em]">{config.docLabel}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        PUBLISHED
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">REF: {selectedBulletin.id} | VER: {selectedBulletin.version}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Department</span>
                      <p className="text-sm font-semibold">{selectedBulletin.category}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Effective Date</span>
                      <p className="text-sm font-semibold">{new Date(selectedBulletin.effectiveDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Author</span>
                      <p className="text-sm font-semibold">{selectedBulletin.author}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-semibold">Target Roles</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedBulletin.roles.map((role) => (
                          <span key={role} className="text-[10px] px-2 py-0.5 bg-pg-blue/10 text-pg-blue dark:text-pg-accent rounded-md border border-pg-blue/20">{roleLabel(role)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Content - Paper Style */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
                  <div className="max-w-3xl mx-auto bg-white dark:bg-slate-950 p-8 md:p-12 shadow-xl border border-slate-200 dark:border-slate-800 rounded-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 dark:bg-slate-900/10 pointer-events-none rotate-45 transform translate-x-16 -translate-y-16" />
                    <div className="prose-bulletin mb-12">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedBulletin.content}</ReactMarkdown>
                    </div>

                    {/* Read & Initial block (target-role readers) */}
                    {mustAck && (
                      <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
                        {acked ? (
                          <div className="flex items-center gap-2 rounded-md bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-4 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm">
                              Read &amp; initialed{myAck ? ` (${myAck.initials})` : ''} on{' '}
                              {myAck ? new Date(myAck.acknowledgedAtUtc).toLocaleString() : ''}.
                            </span>
                          </div>
                        ) : (
                          <div className="rounded-md bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 space-y-3">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                              <PenLine className="w-4 h-4" /> Acknowledgment required
                            </p>
                            <div className="flex items-start gap-2">
                              <Checkbox id="ackCheck" checked={ackChecked} onCheckedChange={(c: boolean | 'indeterminate') => setAckChecked(c as boolean)} className="mt-0.5" />
                              <Label htmlFor="ackCheck" className="cursor-pointer text-sm text-amber-900 dark:text-amber-200">
                                I have read and understood this bulletin.
                              </Label>
                            </div>
                            <div className="flex items-end gap-3">
                              <div className="w-40">
                                <Label htmlFor="ackInitials" className="text-xs">Your initials</Label>
                                <Input id="ackInitials" value={ackInitials} maxLength={4} placeholder="e.g. JS"
                                  onChange={(e) => setAckInitials(e.target.value)} />
                              </div>
                              <Button onClick={handleConfirmAck} disabled={!ackChecked || ackInitials.trim().length < 2}>
                                <PenLine className="w-4 h-4 mr-2" /> Confirm &amp; Initial
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Read receipts (managers only) */}
                    {canManage && selectedBulletin.requireAcknowledgment && (
                      <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
                        <p className="text-sm font-semibold flex items-center gap-2 mb-3">
                          <ClipboardCheck className="w-4 h-4" />
                          Read receipts — {done.length}/{readers.length} acknowledged (v{selectedBulletin.version})
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Acknowledged</p>
                            {done.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No acknowledgments yet.</p>
                            ) : (
                              <ul className="space-y-1">
                                {done.map((a) => (
                                  <li key={a.userId} className="text-sm flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="font-medium">{a.userName}</span>
                                    <span className="text-muted-foreground">· {a.initials} · {new Date(a.acknowledgedAtUtc).toLocaleDateString()}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Outstanding</p>
                            {outstanding.length === 0 ? (
                              <p className="text-xs text-emerald-600">Everyone has acknowledged.</p>
                            ) : (
                              <ul className="space-y-1">
                                {outstanding.map((r) => (
                                  <li key={r.role} className="text-sm flex items-center gap-2">
                                    <X className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{roleLabel(r.role)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-12 py-6 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <p className="text-xs text-slate-400">Last updated: {selectedBulletin.lastUpdated || selectedBulletin.createdDate}</p>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                      <Printer className="w-4 h-4" />
                      Print Document
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open: boolean) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this bulletin?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `"${pendingDelete.title}" and its read receipts will be permanently removed. This cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingDelete) {
                  deleteBulletin(pendingDelete.id);
                  toast.success('Bulletin deleted');
                  setPendingDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
