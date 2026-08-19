import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Map, Plus, Trash2, User } from 'lucide-react';
import { Button } from '../ui/button';
import LinkFavicon from '../LinkFavicon';
import QuickLinkEditor from '../QuickLinkEditor';
import {
  useQuickLinks,
  saveOrgLinks,
  savePersonalLinks,
  newLinkId,
  type QuickLink,
} from '../../utils/quickLinks';

interface QuickLinksBarProps {
  userRole: string;
  className?: string;
}

/**
 * Quick links as a full-width launcher bar.
 *
 * Lifted out of Dashboard so the wall can give links their own band rather than a
 * chip in the header. Behaviour is unchanged: admins manage shared links,
 * everyone manages their own.
 */
export default function QuickLinksBar({ userRole, className = '' }: QuickLinksBarProps) {
  const { org, personal } = useQuickLinks();
  const [isEditing, setIsEditing] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);

  const isAdmin = userRole === 'admin';
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
    setEditorOpen(false);
  };

  const deleteLink = (link: QuickLink) => {
    if (!canManage(link)) return;
    if (link.scope === 'org') saveOrgLinks(org.filter(l => l.id !== link.id));
    else savePersonalLinks(personal.filter(l => l.id !== link.id));
  };

  const all = [...org, ...personal];

  const tile = (link: QuickLink) => {
    const manageable = isEditing && canManage(link);
    const body = (
      <>
        <LinkFavicon name={link.name} url={link.url} size={22} />
        <span className="max-w-[120px] truncate text-xs font-medium">{link.name}</span>
        {link.scope === 'personal' && (
          <User className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-label="Personal link" />
        )}
      </>
    );

    return (
      <div key={link.id} className="relative">
        {manageable ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            {body}
          </div>
        ) : (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-primary/30 hover:bg-secondary"
          >
            {body}
          </a>
        )}

        {manageable && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1">
            <button
              onClick={() => openEdit(link)}
              aria-label={`Edit ${link.name}`}
              className="rounded-md border border-border bg-background p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => deleteLink(link)}
              aria-label={`Delete ${link.name}`}
              className="rounded-md border border-border bg-background p-1 text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={`rounded-lg border border-border bg-muted/30 p-3 ${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Quick links
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(v => !v)}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {isEditing ? 'Done' : 'Edit'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Fixed in-app tile, not user data — D88 moved the map off the landing
            page, and this is the "view it if needed" path for every role. Kept
            out of the editable localStorage set (which is external-URL-only) so
            an edit can't delete the app's own route. */}
        <Link
          to="/fleet-map"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-primary transition-colors hover:border-primary/30 hover:bg-secondary"
        >
          <Map className="h-4 w-4" aria-hidden />
          Fleet map
        </Link>

        {all.map(tile)}

        {isEditing && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Add link
          </button>
        )}

        {all.length === 0 && !isEditing && (
          <span className="text-[11px] text-muted-foreground">
            No links yet — use Edit to add one.
          </span>
        )}
      </div>

      <QuickLinkEditor
        open={editorOpen}
        link={editingLink}
        isAdmin={isAdmin}
        onSave={handleSave}
        onClose={() => setEditorOpen(false)}
      />
    </section>
  );
}
