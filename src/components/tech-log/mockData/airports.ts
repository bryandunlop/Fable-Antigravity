export interface AirportRunway { id: string; ldaFt: number; widthFt: number; }
export interface AirportApproach { runway: string; type: string; glidepath: number; }
export interface AirportInfo {
  icao: string;
  name: string;
  elevationFt: number;
  mountainous: boolean;
  runways: AirportRunway[];
  approaches: AirportApproach[];
  fbo: string;
  jetA: boolean;
  deice: boolean;
  limitations?: string;
}

// Focused dataset for the seeded demo trips. Home base KLUK is the P&G fuel farm.
const AIRPORTS: Record<string, AirportInfo> = {
  KLUK: {
    icao: 'KLUK', name: 'Cincinnati Lunken', elevationFt: 483, mountainous: false,
    runways: [{ id: '03L/21R', ldaFt: 6102, widthFt: 100 }, { id: '07/25', ldaFt: 5128, widthFt: 100 }],
    approaches: [{ runway: '21R', type: 'ILS', glidepath: 3.0 }],
    fbo: 'P&G fuel farm', jetA: true, deice: true,
  },
  KASE: {
    icao: 'KASE', name: 'Aspen-Pitkin County', elevationFt: 7820, mountainous: true,
    runways: [{ id: '15', ldaFt: 7006, widthFt: 100 }, { id: '33', ldaFt: 8006, widthFt: 100 }],
    approaches: [{ runway: '15', type: 'VOR/DME', glidepath: 3.77 }, { runway: '33', type: 'RNAV(GPS)', glidepath: 6.5 }],
    fbo: 'Atlantic Aviation', jetA: true, deice: false, limitations: 'Curfew 2300–0700L · special qualification required',
  },
  KTEB: {
    icao: 'KTEB', name: 'Teterboro', elevationFt: 9, mountainous: false,
    runways: [{ id: '06/24', ldaFt: 7000, widthFt: 150 }, { id: '01/19', ldaFt: 6013, widthFt: 150 }],
    approaches: [{ runway: '06', type: 'ILS', glidepath: 3.0 }],
    fbo: 'Signature Flight Support', jetA: true, deice: true, limitations: 'Noise curfew 2300–0600L',
  },
};

export function airportInfo(icao: string): AirportInfo | undefined {
  return AIRPORTS[icao];
}
