import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, MapPin, Plane, RefreshCw, Search } from 'lucide-react';

import { airportReference } from '../../airport/referenceClient';
import type { AirportIndexEntry, AirportRecord } from '../../airport/types';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { ProvenanceChip } from './ProvenanceChip';
import { ProposeChangeDialog } from './ProposeChangeDialog';
import AirportReferenceDetail from './AirportReferenceDetail';
import { LensSwitch } from './LensSwitch';
import { SupportCardFact, TeamRecommendation } from './StationSupport';
import { defaultLensForRole, type AirportLens } from '../../airport/lens';

/**
 * Airport Information — the reference layer on real FAA NASR data (D45, D48).
 *
 * 2,128 US airports with a hard-surfaced runway of 5,000 ft or more, served from
 * a static bundle rather than the API, so the page works while TL-18 and TL-15
 * are open.
 */

const PAGE_SIZE = 40;

interface AirportInformationProps {
  /** Who is proposing. Real identity lands with auth; the demo role switcher supplies it today. */
  currentUserOid?: string;
  /** Picks the opening lens (D96). It is a default, never a gate — both lenses stay reachable. */
  userRole?: string;
  additionalRoles?: string[];
}

export default function AirportInformation({
  currentUserOid = 'demo-user',
  userRole,
  additionalRoles = [],
}: AirportInformationProps) {
  // Initialised from role once rather than derived every render: a technician
  // who switches to the crew view must stay there while they browse.
  const [lens, setLens] = useState<AirportLens>(() =>
    defaultLensForRole(userRole, additionalRoles),
  );
  const [proposing, setProposing] = useState(false);
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [selected, setSelected] = useState<AirportRecord | null>(null);
  const [loadingAirport, setLoadingAirport] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    airportReference
      .loadIndex()
      .then((index) => {
        if (cancelled) return;
        setEffectiveDate(index.effectiveDate);
        setTotalCount(index.count);
        setIndexLoaded(true);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const results = useMemo(
    () => (indexLoaded ? airportReference.search(query) : []),
    [indexLoaded, query],
  );

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query]);

  const openAirport = async (entry: AirportIndexEntry) => {
    setLoadingAirport(entry.id);
    const record = await airportReference.loadAirport(entry.id);
    setLoadingAirport(null);
    if (record) setSelected(record);
    else setLoadError(`No reference record found for ${entry.id}.`);
  };

  if (selected) {
    return (
      <>
        <AirportReferenceDetail
          airport={selected}
          onBack={() => setSelected(null)}
          onSubmitCorrection={() => setProposing(true)}
          currentUserOid={currentUserOid}
          lens={lens}
          onLensChange={setLens}
        />
        <ProposeChangeDialog
          icao={selected.icaoId ?? selected.id}
          airportName={selected.name}
          currentUserOid={currentUserOid}
          open={proposing}
          onOpenChange={setProposing}
        />
      </>
    );
  }

  if (loadError) {
    return (
      <Card className="flex items-start gap-3 border-destructive/40 p-6">
        <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
        <div>
          <h2 className="font-medium">Airport reference data unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => setAttempt((n) => n + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Airport information</h1>
          <p className="mt-1 text-muted-foreground">
            US airports with a hard-surfaced runway of 5,000 ft or more.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ProvenanceChip
            source="reference"
            detail={effectiveDate ? `cycle ${effectiveDate}` : undefined}
          />
          {indexLoaded ? (
            <span className="text-xs text-muted-foreground">
              {totalCount.toLocaleString()} airports
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[18rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by ICAO, FAA identifier, name or city — KTEB, ASE, Aspen"
            className="pl-9"
            disabled={!indexLoaded}
          />
        </div>
        <LensSwitch value={lens} onChange={setLens} />
      </div>

      {!indexLoaded ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading airport reference data…
        </div>
      ) : results.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>No airport matches “{query}”.</p>
          <p className="mt-1 text-sm">
            This directory covers US airports only, and only those with a hard-surfaced runway of
            5,000 ft or more.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {results.length.toLocaleString()} {results.length === 1 ? 'airport' : 'airports'}
          </p>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {results.slice(0, visible).map((entry) => (
              <Card
                key={entry.id}
                className="cursor-pointer p-4 transition-colors hover:bg-accent"
                onClick={() => void openAirport(entry)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-medium">{entry.icaoId ?? entry.id}</span>
                      {entry.icaoId ? (
                        <span className="text-xs text-muted-foreground">FAA {entry.id}</span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm">{entry.name}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[entry.city, entry.stateCode].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {lens === 'maintenance' ? (
                      <SupportCardFact icao={entry.icaoId ?? entry.id} />
                    ) : (
                      <div className="text-right">
                        <p className="flex items-center justify-end gap-1 text-sm tabular-nums">
                          <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                          {entry.longestRunwayFt.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">longest ft</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* The team's recommendation rides every search result, both
                    lenses — it is the answer most searches are really after. */}
                <TeamRecommendation icao={entry.icaoId ?? entry.id} compact />
                {loadingAirport === entry.id ? (
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading…
                  </p>
                ) : null}
              </Card>
            ))}
          </div>

          {visible < results.length ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                Show more ({(results.length - visible).toLocaleString()} remaining)
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
