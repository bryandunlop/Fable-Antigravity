import React from 'react';
import { Badge } from '../ui/badge';
import {
  ShieldAlert, ThumbsDown, Utensils, Coffee, FileText, Cake, Mail, Phone, MapPin,
  Thermometer, Armchair, Tv, Lightbulb, Sparkles,
} from 'lucide-react';
import type { Passenger, PassengerAllergy } from './passengerData';

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
export default function PassengerProfilePanel({ passenger }: { passenger: Passenger }) {
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
          <p className="text-sm text-emerald-700 dark:text-emerald-300">No allergies on file.</p>
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
          <p className="text-sm">{passenger.food.length ? passenger.food.join(', ') : '—'}</p>
        </Section>
        <Section title="Beverage" icon={Coffee}>
          <p className="text-sm">{passenger.beverage.length ? passenger.beverage.join(', ') : '—'}</p>
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

      {(passenger.additionalNotes || passenger.flightAttendantNotes) && (
        <Section title="Notes" icon={FileText}>
          {passenger.additionalNotes && <p className="text-sm">{passenger.additionalNotes}</p>}
          {passenger.flightAttendantNotes && (
            <p className="text-sm mt-1.5 text-blue-900 bg-blue-50 border border-blue-100 rounded px-2 py-1.5">
              FA note: {passenger.flightAttendantNotes}
            </p>
          )}
        </Section>
      )}

      {photos.length > 0 && (
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
