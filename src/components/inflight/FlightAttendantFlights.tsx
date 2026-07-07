import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Plane, Users, ShieldAlert, AlertTriangle, Cake, Utensils, ThumbsDown,
  ChevronDown, ChevronRight, Clock, MapPin, Coffee, FileText, Image as ImageIcon,
} from 'lucide-react';
import { usePassengers } from '../passengers/PassengerContext';
import type { Passenger } from '../passengers/passengerData';
import { getFlightPassengers, flightAllergyAlerts } from '../passengers/engine/flights';
import { buildFaFlights } from './faFlights';

// Two categories only: allergies (medical) are red, dislikes (preference) are yellow.
const ALLERGY_BADGE = 'bg-red-500 text-white border-red-600';
const DISLIKE_BADGE = 'bg-yellow-400 text-yellow-950 border-yellow-500';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function isBirthdaySoon(birthday: string, dep: string): boolean {
  if (!birthday) return false;
  const b = new Date(birthday);
  const d = new Date(dep);
  return b.getMonth() === d.getMonth() && Math.abs(b.getDate() - d.getDate()) <= 3;
}

function PassengerRow({ passenger, departureUtc }: { passenger: Passenger; departureUtc: string }) {
  const [open, setOpen] = useState(false);
  const photos = passenger.photos ?? [];
  return (
    <div className="border rounded-lg bg-white">
      <button className="w-full flex items-start justify-between gap-3 p-3 text-left hover:bg-slate-50" onClick={() => setOpen(v => !v)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <span className="font-medium">{passenger.name}</span>
            <Badge variant="outline" className="text-xs">{passenger.role}</Badge>
            {isBirthdaySoon(passenger.birthday, departureUtc) && (
              <Badge className="bg-pink-100 text-pink-800 border-pink-200 text-xs"><Cake className="w-3 h-3 mr-1" />Birthday</Badge>
            )}
            {photos.length > 0 && (
              <Badge variant="outline" className="text-xs"><ImageIcon className="w-3 h-3 mr-1" />{photos.length}</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
            {passenger.allergies.map((a, i) => (
              <Badge key={`al-${i}`} className={`text-xs ${ALLERGY_BADGE}`}>
                <ShieldAlert className="w-3 h-3" /><span className="ml-1">{a.allergen}</span>
              </Badge>
            ))}
            {(passenger.dislikes ?? []).map((d, i) => (
              <Badge key={`dl-${i}`} className={`text-xs ${DISLIKE_BADGE}`}>
                <ThumbsDown className="w-3 h-3" /><span className="ml-1">{d}</span>
              </Badge>
            ))}
            {passenger.allergies.length === 0 && (passenger.dislikes ?? []).length === 0 && (
              <span className="text-xs text-emerald-600">No allergies or dislikes</span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 ml-6 space-y-3 text-sm">
          {passenger.allergies.length > 0 && (
            <div className="space-y-1">
              {passenger.allergies.map((a, i) => (
                <div key={i} className="text-xs">
                  <span className="font-medium">{a.allergen}</span> ({a.severity})
                  {a.reaction ? ` — ${a.reaction}` : ''}{a.medication ? ` · ${a.medication}` : ''}
                </div>
              ))}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1"><Utensils className="w-3 h-3" /> Food</p>
              <p className="text-xs">{passenger.food.length ? passenger.food.join(', ') : '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1"><Coffee className="w-3 h-3" /> Beverage</p>
              <p className="text-xs">{passenger.beverage.length ? passenger.beverage.join(', ') : '—'}</p>
            </div>
          </div>
          {passenger.passengerComfort?.specialRequests && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Special requests</p>
              <p className="text-xs">{passenger.passengerComfort.specialRequests}</p>
            </div>
          )}
          {(passenger.additionalNotes || passenger.flightAttendantNotes) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1"><FileText className="w-3 h-3" /> Notes</p>
              {passenger.additionalNotes && <p className="text-xs">{passenger.additionalNotes}</p>}
              {passenger.flightAttendantNotes && (
                <p className="text-xs mt-1 text-blue-800 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                  FA: {passenger.flightAttendantNotes}
                </p>
              )}
            </div>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map(ph => (
                <div key={ph.id} className="border rounded overflow-hidden bg-slate-50">
                  <img src={ph.url} alt={ph.caption || 'Passenger photo'} className="w-full h-20 object-cover" />
                  {ph.caption && <div className="px-1.5 py-0.5 text-[10px] truncate" title={ph.caption}>{ph.caption}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FlightAttendantFlights() {
  const { passengers } = usePassengers();
  const legs = useMemo(() => buildFaFlights(new Date()), []);

  const legsWithPax = legs.map(leg => ({ leg, pax: getFlightPassengers(leg.passengerIds, passengers) }));
  const uniquePaxIds = new Set(legs.flatMap(l => l.passengerIds));
  const allPax = getFlightPassengers([...uniquePaxIds], passengers);
  const totalAllergies = allPax.reduce((n, p) => n + p.allergies.length, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Plane className="w-6 h-6 text-blue-600" />
          My Upcoming Flights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your assigned flights and the passengers on each — allergies, preferences, notes, and cabin photos in one place.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Upcoming legs</p>
          <p className="text-2xl font-bold">{legs.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Passengers</p>
          <p className="text-2xl font-bold">{uniquePaxIds.size}</p>
        </CardContent></Card>
        <Card className={totalAllergies > 0 ? 'border-red-200 bg-red-50/50' : ''}><CardContent className="p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Allergy alerts</p>
          <p className={`text-2xl font-bold ${totalAllergies > 0 ? 'text-red-700' : ''}`}>{totalAllergies}</p>
        </CardContent></Card>
      </div>

      {/* Legs */}
      <div className="space-y-5">
        {legsWithPax.map(({ leg, pax }) => {
          const alerts = flightAllergyAlerts(pax);
          return (
            <Card key={leg.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{leg.flightNumber}</span>
                      <span className="text-muted-foreground font-normal text-base flex items-center gap-1">
                        <MapPin className="w-4 h-4" />{leg.origin} → {leg.destination}
                      </span>
                      <Badge variant="outline">{leg.tail}</Badge>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(leg.departureUtc)} · {fmtTime(leg.departureUtc)}–{fmtTime(leg.arrivalUtc)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{leg.cabinCrew.join(', ')}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="w-fit">{pax.length} pax</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Medical alerts */}
                {alerts.length > 0 && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-sm font-semibold text-orange-900 flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Medical / allergy alerts
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {alerts.map((a, i) => (
                        <Badge key={i} className={`text-xs ${ALLERGY_BADGE}`}>
                          <ShieldAlert className="w-3 h-3" />
                          <span className="ml-1">{a.allergen} — {a.passengers.join(', ')}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Catering */}
                {leg.cateringNotes && (
                  <div className="text-sm flex items-start gap-2">
                    <Utensils className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <span><span className="font-medium">Catering:</span> {leg.cateringNotes}</span>
                  </div>
                )}

                {/* Passengers */}
                <div className="space-y-2">
                  {pax.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No passengers listed for this leg.</p>
                  ) : (
                    pax.map(p => <PassengerRow key={p.id} passenger={p} departureUtc={leg.departureUtc} />)
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
