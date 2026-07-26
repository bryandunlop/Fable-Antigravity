// ─── Quick-link add/edit dialog ──────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Building2, User } from 'lucide-react';
import { normalizeUrl, type QuickLink } from '../utils/quickLinks';

interface QuickLinkEditorProps {
  open: boolean;
  // The link being edited, or null when adding a new one.
  link: QuickLink | null;
  isAdmin: boolean;
  onSave: (name: string, url: string, scope: QuickLink['scope']) => void;
  onClose: () => void;
}

export default function QuickLinkEditor({ open, link, isAdmin, onSave, onClose }: QuickLinkEditorProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [scope, setScope] = useState<QuickLink['scope']>('personal');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [urlInvalid, setUrlInvalid] = useState(false);

  // Seed the form each time the dialog opens for a (different) link.
  useEffect(() => {
    if (!open) return;
    setName(link?.name ?? '');
    setUrl(link?.url ?? '');
    setScope(link?.scope ?? (isAdmin ? 'org' : 'personal'));
    setNameInvalid(false);
    setUrlInvalid(false);
  }, [open, link, isAdmin]);

  const submit = () => {
    const trimmedName = name.trim();
    const normalized = normalizeUrl(url);
    setNameInvalid(!trimmedName);
    setUrlInvalid(!normalized);
    if (!trimmedName || !normalized) return;
    onSave(trimmedName, normalized, isAdmin ? scope : 'personal');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{link ? 'Edit link' : 'Add link'}</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'Shared links appear for everyone; personal links stay on this device.'
              : 'Personal links stay on this device.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ql-name">Name</Label>
            <Input
              id="ql-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ForeFlight"
              aria-invalid={nameInvalid}
              className={nameInvalid ? 'ring-1 ring-destructive' : ''}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ql-url">URL</Label>
            <Input
              id="ql-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="plan.foreflight.com"
              aria-invalid={urlInvalid}
              className={urlInvalid ? 'ring-1 ring-destructive' : ''}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            {urlInvalid && <p className="text-xs text-destructive">Enter a valid web address.</p>}
          </div>

          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope('org')}
                  className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border text-sm transition-colors ${scope === 'org' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  <Building2 className="w-4 h-4" /> Shared
                </button>
                <button
                  type="button"
                  onClick={() => setScope('personal')}
                  className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border text-sm transition-colors ${scope === 'personal' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                >
                  <User className="w-4 h-4" /> Personal
                </button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>{link ? 'Save' : 'Add link'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
