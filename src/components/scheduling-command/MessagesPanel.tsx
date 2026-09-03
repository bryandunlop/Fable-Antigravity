/**
 * The dedicated space for outstanding admin messages (LG-398, Bryan, 2026-09-03): every message an
 * EA has sent on a live booking that scheduling has not answered, oldest first. Click one and the
 * trip opens on its Record, where the reply goes.
 */
import { Card } from '../ui/card';
import { MessageSquare } from 'lucide-react';
import { outstandingAcrossTrips } from '../trips/engine/adminMessages';
import { routeLabel, type Trip } from '../trips/engine/trip';

export function MessagesPanel({ trips, nowUtc, onOpenTrip }: { trips: Trip[]; nowUtc: string; onOpenTrip: (tripId: string) => void }) {
  const rows = outstandingAcrossTrips(trips, nowUtc);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between border-b px-5 py-3.5">
        <h2 className="text-base font-semibold">Messages <span className="text-sm font-normal text-muted-foreground">· from the admins · unanswered · oldest first</span></h2>
        <span className="text-xs text-muted-foreground">{rows.length === 0 ? 'Nothing waiting' : `${rows.length} waiting`}</span>
      </div>
      {rows.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">Every message from an EA has an answer.</p>}
      <ul>
        {rows.map(({ trip, message, ageHours }) => {
          const days = Math.floor(ageHours / 24);
          const age = ageHours < 1 ? 'just now' : days >= 1 ? `${days}d` : `${Math.floor(ageHours)}h`;
          return (
            <li key={message.id}>
              <button onClick={() => onOpenTrip(trip.id)} className="grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-3 border-t border-border/50 px-5 py-3 text-left hover:bg-muted/40">
                <MessageSquare className="mt-0.5 h-4 w-4 text-[var(--gfo-warning-ink,#8A6200)]" />
                <span className="min-w-0">
                  <span className="block text-sm"><span className="font-medium">{message.by.name}</span> <span className="text-muted-foreground">on</span> <span className="font-medium">{trip.title}</span> <span className="text-muted-foreground">· {routeLabel(trip)}{trip.tail ? ` · ${trip.tail}` : ''}</span></span>
                  <span className="mt-0.5 block truncate text-sm text-foreground/90">{message.kind === 'question' ? `Asked: ${message.text}` : message.text}</span>
                </span>
                <span className="text-xs text-muted-foreground">{age}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
