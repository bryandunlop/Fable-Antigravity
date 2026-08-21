import React from 'react';
import { Badge } from '../ui/badge';
import {
  ShieldAlert, ThumbsDown, Utensils, Coffee, FileText, Cake, Mail, Phone, MapPin,
  Thermometer, Armchair, Tv, Lightbulb, Sparkles, AlertTriangle,
} from 'lucide-react';
import type { Passenger, PassengerAllergy } from './passengerData';
import { conflictingItems } from './engine/profileEdits';

// Two categories only: allergies (medical) are red, dislikes (preference) are yellow.
// Kept identical to the flight-attendant leg view so a badge means the same thing in
// both places.
const ALLERGY_BADGE = 'bg-red-500 text-white border-red-600';
const DISLIKE_BADGE = 'bg-yellow-400 text-yellow-950 border-yellow-500';

const SEVERITY_STYLE: Record<PassengerAllergy['severity'], string> = {
  Critical: 'border-red-300 bg-red-50 text-red-900',
  Moderate: 'border-orange-300 bg-orange-50 text-orange-900',
  Mild: 'border-yellow-300 bg-yellow-50 text-yellow-900',
};

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}{title}
      </p>
      {children}
    </div>
  );
}

function Line({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="text-sm flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 mt-1 text-muted-foreground shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

function fmtBirthday(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

/** The whole passenger record, read-only. Shared by the flight-attendant trip view's
 * slide-over so an FA sees the same profile the Passenger Database owns, without
 * leaving the trip they are planning. */
export default function PassengerProfilePanel({
  passenger,
  showFlightAttendantNotes = true,
  showPhotos = true,
}: {
  passenger: Passenger;
  /** Cabin-crew notes are written for the cabin crew. The Passenger Database has always
   *  gated them to the inflight role — keep that gate rather than widening it here. */
  showFlightAttendantNotes?: boolean;
  /** Off where the host renders its own photo section with add/remove controls. */
  showPhotos?: boolean;
}) {
  const { info, passengerComfort: comfort } = passenger;
  const photos = passenger.photos ?? [];
  const dislikes = passenger.dislikes ?? [];
  const comfortLines: Array<[React.ElementType, string | undefined]> = [
    [Thermometer, comfort.temperature],
    [Armchair, comfort.seating],
    [Tv, comfort.tvPreference],
    [Lightbulb, comfort.lighting],
  ];
  const hasComfort = comfortLines.some(([, v]) => v) || !!comfort.specialRequests;

  // A favourite that names something on this person's allergy list is worse than no
  // favourite — it invites someone to serve the thing that hurts them. The editor
  // already flags it; this is the surface a crew member actually reads before service.
  const allergens = passenger.allergies.map((a) => a.allergen);
  const foodConflicts = conflictingItems(passenger.food, allergens);
  const drinkConflicts = conflictingItems(passenger.beverage, allergens);
  const conflicts = [...foodConflicts, ...drinkConflicts];

  const prefList = (items: string[], bad: string[]) =>
    items.length === 0 ? <p className="text-sm">—</p> : (
      <p className="text-sm">
        {items.map((x, i) => (
          <React.Fragment key={x}>
            {i > 0 && ', '}
            <span className={bad.includes(x) ? 'line-through text-red-700 dark:text-red-300 font-medium' : undefined}>{x}</span>
          </React.Fragment>
        ))}
      </p>
    );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-semibold">{passenger.name}</p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <Badge variant="outline" className="text-xs">{passenger.role}</Badge>
          {passenger.birthday && (
            <Badge className="bg-pink-100 text-pink-800 border-pink-200 text-xs">
              <Cake className="w-3 h-3 mr-1" />{fmtBirthday(passenger.birthday)}
            </Badge>
          )}
        </div>
      </div>

      {(info.email || info.phone || info.address) && (
        <Section title="Contact">
          <div className="space-y-1">
            {info.email && <Line icon={Mail}><a className="text-blue-700 dark:text-blue-300 hover:underline" href={`mailto:${info.email}`}>{info.email}</a></Line>}
            {info.phone && <Line icon={Phone}><a className="text-blue-700 dark:text-blue-300 hover:underline" href={`tel:${info.phone.replace(/[^+\d]/g, '')}`}>{info.phone}</a></Line>}
            {info.address && <Line icon={MapPin}>{info.address}</Line>}
          </div>
        </Section>
      )}

      <Section title="Allergies" icon={ShieldAlert}>
        {passenger.allergies.length === 0 ? (
          // An empty array is not a confirmation. Green is earned only by someone
          // asking and recording the date — otherwise this contradicted the trip
          // roster, which says "no allergy information on file" for the same person.
          passenger.dietaryConfirmedAtUtc ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              No allergies — confirmed {new Date(passenger.dietaryConfirmedAtUtc).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}.
            </p>
          ) : passenger.allergyFlagged ? (
            <p className="text-sm text-red-700 dark:text-red-300">Allergies flagged on the booking — no allergen named, no severity.</p>
          ) : (
            <p className="text-sm text-muted-foreground">No allergy information on file — nobody has recorded an answer.</p>
          )
        ) : (
          <div className="space-y-2">
            {passenger.allergies.map((a, i) => (
              <div key={i} className={`rounded-lg border p-2.5 ${SEVERITY_STYLE[a.severity]}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{a.allergen}</span>
                  <Badge className={`text-xs ${a.severity === 'Critical' ? ALLERGY_BADGE : 'bg-white border-current text-current'}`}>
                    {a.severity}
                  </Badge>
                </div>
                {a.reaction && <p className="text-xs mt-1">Reaction: {a.reaction}</p>}
                {a.medication && <p className="text-xs mt-0.5">Medication: {a.medication}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {conflicts.length > 0 && (
        <p className="rounded-lg border-2 border-red-300 dark:border-red-400/50 px-3 py-2 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-300" />
          <span>
            <span className="font-semibold text-red-800 dark:text-red-200">{conflicts.join(', ')}</span>{' '}
            {conflicts.length === 1 ? 'is' : 'are'} recorded as a favourite and also named on this
            passenger’s allergy list. Do not serve on the strength of this record — get it corrected.
          </span>
        </p>
      )}

      {dislikes.length > 0 && (
        <Section title="Dislikes" icon={ThumbsDown}>
          <div className="flex flex-wrap gap-1.5">
            {dislikes.map((d, i) => (
              <Badge key={i} className={`text-xs ${DISLIKE_BADGE}`}>{d}</Badge>
            ))}
          </div>
        </Section>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Section title="Food" icon={Utensils}>
          {prefList(passenger.food, foodConflicts)}
        </Section>
        <Section title="Beverage" icon={Coffee}>
          {prefList(passenger.beverage, drinkConflicts)}
        </Section>
      </div>

      {hasComfort && (
        <Section title="Cabin comfort" icon={Sparkles}>
          <div className="space-y-1">
            {comfortLines.map(([Icon, value], i) => value && <Line key={i} icon={Icon}>{value}</Line>)}
            {comfort.specialRequests && (
              <p className="text-sm mt-1.5 rounded border bg-muted text-foreground px-2 py-1.5">{comfort.specialRequests}</p>
            )}
          </div>
        </Section>
      )}

      {(passenger.additionalNotes || (showFlightAttendantNotes && passenger.flightAttendantNotes)) && (
        <Section title="Notes" icon={FileText}>
          {passenger.additionalNotes && <p className="text-sm">{passenger.additionalNotes}</p>}
          {showFlightAttendantNotes && passenger.flightAttendantNotes && (
            <p className="text-sm mt-1.5 text-blue-900 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
              FA note: {passenger.flightAttendantNotes}
            </p>
          )}
        </Section>
      )}

      {showPhotos && photos.length > 0 && (
        <Section title={`Photos (${photos.length})`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {photos.map((ph) => (
              <figure key={ph.id} className="border rounded overflow-hidden bg-muted m-0">
                <img src={ph.url} alt={ph.caption || `Photo of ${passenger.name}'s cabin setup`} className="w-full h-24 object-cover" />
                {ph.caption && <figcaption className="px-1.5 py-1 text-[11px] truncate" title={ph.caption}>{ph.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
