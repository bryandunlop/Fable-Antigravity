import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Send, Loader2 } from 'lucide-react';
import { ActionItem } from './types';
import { ROLE_OPTIONS } from './constants';

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ActionItem | null;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: string;
  setInviteRole: (role: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function InviteDialog({
  isOpen,
  onClose,
  item,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  onSubmit,
  isSubmitting
}: InviteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Contributor</DialogTitle>
          <DialogDescription>
            Send an invitation to a colleague to collaborate on this action item.
          </DialogDescription>
        </DialogHeader>
        
        {item && (
          <div className="space-y-4">
            <div className="pb-3 border-b">
              <p className="text-sm text-muted-foreground">
                Invite someone to collaborate on "{item.title}"
              </p>
            </div>
            
            <div>
              <Label htmlFor="invite-email" className="text-sm font-medium mb-2 block">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="invite-role" className="text-sm font-medium mb-2 block">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={!inviteEmail.trim() || !inviteRole.trim() || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}