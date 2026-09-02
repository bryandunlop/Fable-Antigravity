import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '../ui/button';
import { FeedbackDialog } from './FeedbackDialog';
import { getCurrentPerson } from '../../lib/currentUser';

/**
 * The global front door. Lives in the top-bar utility cluster beside Theme and
 * Reset, so it is reachable from every screen without leaving the task — which is
 * the whole point: feedback written later is feedback written vaguer, or not at all.
 */
export function FeedbackButton({ userRole }: { userRole: string }) {
  const [open, setOpen] = useState(false);
  // Identity comes from the one demo-persona resolver, so a report is attributed
  // the same way every other module attributes work. Entra replaces this in one place.
  const reporter = getCurrentPerson(userRole)?.name ?? 'Unknown user';
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Report a bug or suggest an idea"
        title="Report a bug or suggest an idea"
        className="flex items-center gap-2 h-10 px-3 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden lg:inline text-sm">Feedback</span>
      </Button>
      <FeedbackDialog open={open} onOpenChange={setOpen} userRole={userRole} reporter={reporter} />
    </>
  );
}
