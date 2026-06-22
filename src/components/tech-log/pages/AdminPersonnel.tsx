import { useState } from 'react';
import { toast } from 'sonner';
import { UserCog, Pencil, ShieldCheck } from 'lucide-react';
import { useTechLog, useCurrentUser } from '../TechLogContext';
import { newId } from '../util/id';
import type { Personnel } from '../types';
import { TechLogShell } from '../components/TechLogShell';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';

export default function AdminPersonnel() {
  const { state, dispatch } = useTechLog();
  const user = useCurrentUser();
  const canEdit = user.role === 'MAINTENANCE';
  const [draft, setDraft] = useState<Personnel | null>(null);
  const [ataText, setAtaText] = useState('');

  const open = (p: Personnel) => { setDraft({ ...p }); setAtaText(p.riiAuthorizedAta.join(', ')); };
  const save = () => {
    if (!draft) return;
    const ata = ataText.split(',').map(s => s.trim()).filter(Boolean);
    const updated: Personnel = { ...draft, riiAuthorizedAta: ata, riiAuthorized: draft.riiAuthorized && ata.length > 0 };
    dispatch({ type: 'EDIT_PERSONNEL', payload: updated });
    dispatch({ type: 'ADD_AUDIT', payload: { id: newId('aud'), actorOid: user.oid, action: 'PERSONNEL_EDITED', entityType: 'Personnel', entityId: updated.oid, atUtc: new Date().toISOString(), summary: `Edited ${updated.displayName} (A&P ${updated.apCertificateNumber || '—'}, RII ${updated.riiAuthorized ? ata.join('/') : 'none'})` } });
    toast.success(`Saved ${updated.displayName}.`);
    setDraft(null);
  };

  return (
    <TechLogShell title="Admin · Personnel" subtitle="A&P certificates and RII authorization — controls the CRS and dual-sign-off gates.">
      <div className="space-y-3">
        {state.personnel.map(p => (
          <Card key={p.oid}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <UserCog className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2 font-semibold">{p.displayName}<Badge variant="outline">{p.role}</Badge></div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {p.apCertificateNumber ? <span>A&P {p.apCertificateNumber}</span> : <span className="text-[var(--gfo-error,#EF3340)]">no A&P cert (cannot sign CRS)</span>}
                    {p.riiAuthorized && <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> RII: {p.riiAuthorizedAta.join(', ')}</span>}
                    {p.crewDeferralAuthorized && <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> crew-defer</span>}
                    {p.placardAuthorized && <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> placard</span>}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => open(p)}><Pencil className="mr-1.5 h-4 w-4" /> Edit</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={o => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit personnel</DialogTitle><DialogDescription>Four-eyes approval applies in production; simplified for the demo.</DialogDescription></DialogHeader>
          {draft && (
            <div className="space-y-3 text-sm">
              <div><Label>Display name</Label><Input className="mt-1" value={draft.displayName} onChange={e => setDraft({ ...draft, displayName: e.target.value })} /></div>
              <div><Label>A&P / IA certificate number</Label><Input className="mt-1" value={draft.apCertificateNumber ?? ''} onChange={e => setDraft({ ...draft, apCertificateNumber: e.target.value || undefined })} placeholder="e.g. AP-1234567" /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={draft.riiAuthorized} onChange={e => setDraft({ ...draft, riiAuthorized: e.target.checked })} /><span className="text-xs">RII authorized (independent inspector)</span></label>
              <div><Label>RII-authorized ATA chapters (comma-separated)</Label><Input className="mt-1" value={ataText} onChange={e => setAtaText(e.target.value)} placeholder="e.g. 24, 27, 32" disabled={!draft.riiAuthorized} /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.crewDeferralAuthorized} onChange={e => setDraft({ ...draft, crewDeferralAuthorized: e.target.checked })} /><span className="text-xs">Crew deferral authorized (may defer FC-deferrable MEL items)</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!draft.placardAuthorized} onChange={e => setDraft({ ...draft, placardAuthorized: e.target.checked })} /><span className="text-xs">Placard authorized (may attest a placard-only discharge)</span></label>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </TechLogShell>
  );
}
