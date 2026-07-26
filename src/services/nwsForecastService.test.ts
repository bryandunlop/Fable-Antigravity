import { describe, it, expect } from 'vitest';
import {
  fahrenheitToCelsius,
  parseWindSpeedToKnots,
  parseForecast,
  parseIso8601DurationMs,
  composeGridpointCondition,
} from './nwsForecastService';

describe('fahrenheitToCelsius', () => {
  it('converts freezing and boiling reference points', () => {
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(212)).toBe(100);
  });

  it('rounds to a whole degree for display', () => {
    // 72F = 22.22C
    expect(fahrenheitToCelsius(72)).toBe(22);
  });

  it('handles sub-zero', () => {
    expect(fahrenheitToCelsius(-40)).toBe(-40);
  });
});

describe('parseWindSpeedToKnots', () => {
  it('converts a single mph value to knots', () => {
    // 10 mph = 8.69 kt
    expect(parseWindSpeedToKnots('10 mph')).toBe(9);
  });

  it('takes the UPPER bound of a range — aviation plans for the worst case', () => {
    // "5 to 15 mph" -> 15 mph = 13.03 kt
    expect(parseWindSpeedToKnots('5 to 15 mph')).toBe(13);
  });

  it('returns null for missing or unparseable input rather than a misleading zero', () => {
    expect(parseWindSpeedToKnots('')).toBeNull();
    expect(parseWindSpeedToKnots(undefined)).toBeNull();
    expect(parseWindSpeedToKnots(null)).toBeNull();
    expect(parseWindSpeedToKnots('calm')).toBeNull();
  });
});

describe('parseForecast', () => {
  const raw = {
    properties: {
      periods: [
        {
          number: 1,
          name: 'Today',
          startTime: '2026-07-14T06:00:00-04:00',
          endTime: '2026-07-14T18:00:00-04:00',
          isDaytime: true,
          temperature: 72,
          temperatureUnit: 'F',
          windSpeed: '5 to 15 mph',
          windDirection: 'SW',
          shortForecast: 'Sunny',
          detailedForecast: 'Sunny, with a high near 72.',
          probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 10 },
          icon: 'https://api.weather.gov/icons/land/day/skc?size=medium',
        },
        {
          number: 2,
          name: 'Tonight',
          startTime: '2026-07-14T18:00:00-04:00',
          endTime: '2026-07-15T06:00:00-04:00',
          isDaytime: false,
          temperature: 55,
          temperatureUnit: 'F',
          windSpeed: '5 mph',
          windDirection: 'S',
          shortForecast: 'Clear',
          detailedForecast: 'Clear, with a low around 55.',
          probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: null },
          icon: 'https://api.weather.gov/icons/land/night/skc?size=medium',
        },
        {
          number: 3,
          name: 'Tuesday',
          startTime: '2026-07-15T06:00:00-04:00',
          endTime: '2026-07-15T18:00:00-04:00',
          isDaytime: true,
          temperature: 80,
          temperatureUnit: 'F',
          windSpeed: '10 mph',
          windDirection: 'W',
          shortForecast: 'Chance Showers',
          detailedForecast: 'A chance of showers.',
          probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 40 },
          icon: 'https://api.weather.gov/icons/land/day/rain?size=medium',
        },
      ],
    },
  };

  it('keeps only daytime periods — one column per day', () => {
    const out = parseForecast(raw);
    expect(out).toHaveLength(2);
    expect(out.map(p => p.name)).toEqual(['Today', 'Tuesday']);
  });

  it('normalizes temperature to Celsius at the boundary', () => {
    const [today] = parseForecast(raw);
    expect(today.tempC).toBe(22);
  });

  it('normalizes wind to knots at the boundary', () => {
    const [today] = parseForecast(raw);
    expect(today.windKt).toBe(13);
  });

  it('carries precipitation probability, defaulting a null value to 0', () => {
    const out = parseForecast(raw);
    expect(out[0].precipProbability).toBe(10);
    expect(out[1].precipProbability).toBe(40);
  });

  it('caps at 7 days even when NWS returns more periods', () => {
    const many = {
      properties: {
        periods: Array.from({ length: 20 }, (_, i) => ({
          number: i + 1,
          name: `Day ${i}`,
          startTime: '2026-07-14T06:00:00-04:00',
          endTime: '2026-07-14T18:00:00-04:00',
          isDaytime: true,
          temperature: 70,
          temperatureUnit: 'F',
          windSpeed: '5 mph',
          windDirection: 'N',
          shortForecast: 'Sunny',
          detailedForecast: '',
          probabilityOfPrecipitation: { value: 0 },
          icon: '',
        })),
      },
    };
    expect(parseForecast(many)).toHaveLength(7);
  });

  it('returns an empty array for malformed payloads instead of throwing', () => {
    expect(parseForecast(null)).toEqual([]);
    expect(parseForecast({})).toEqual([]);
    expect(parseForecast({ properties: {} })).toEqual([]);
    expect(parseForecast({ properties: { periods: 'nope' } })).toEqual([]);
  });

  it('returns null tempC when NWS omits the temperature — never a fabricated -18°C', () => {
    const mk = (temperature: unknown) => ({
      properties: {
        periods: [{
          number: 1, name: 'Today',
          startTime: '2026-07-14T06:00:00-04:00', endTime: '2026-07-14T18:00:00-04:00',
          isDaytime: true, temperature, temperatureUnit: 'F',
          windSpeed: '10 mph', windDirection: 'SW',
          shortForecast: 'Sunny', detailedForecast: '',
          probabilityOfPrecipitation: { value: 0 }, icon: '',
        }],
      },
    });
    // 0°F would silently become -18°C and read as a real hard-freeze forecast.
    expect(parseForecast(mk(null))[0].tempC).toBeNull();
    expect(parseForecast(mk(undefined))[0].tempC).toBeNull();
    expect(parseForecast(mk(''))[0].tempC).toBeNull();
    expect(parseForecast(mk('not-a-number'))[0].tempC).toBeNull();
  });

  it('still reports a genuine zero temperature', () => {
    const freezing = {
      properties: {
        periods: [{
          number: 1, name: 'Today',
          startTime: '2026-07-14T06:00:00-04:00', endTime: '2026-07-14T18:00:00-04:00',
          isDaytime: true, temperature: 32, temperatureUnit: 'F',
          windSpeed: '10 mph', windDirection: 'SW',
          shortForecast: 'Snow', detailedForecast: '',
          probabilityOfPrecipitation: { value: 0 }, icon: '',
        }],
      },
    };
    expect(parseForecast(freezing)[0].tempC).toBe(0);
  });

  it('converts Celsius-native payloads without double-converting', () => {
    const celsius = {
      properties: {
        periods: [{
          number: 1, name: 'Today',
          startTime: '2026-07-14T06:00:00-04:00', endTime: '2026-07-14T18:00:00-04:00',
          isDaytime: true, temperature: 22, temperatureUnit: 'C',
          windSpeed: '10 mph', windDirection: 'SW',
          shortForecast: 'Sunny', detailedForecast: '',
          probabilityOfPrecipitation: { value: 0 }, icon: '',
        }],
      },
    };
    expect(parseForecast(celsius)[0].tempC).toBe(22);
  });
});

describe('parseIso8601DurationMs', () => {
  it('parses the forms NWS actually emits on gridpoint layers', () => {
    expect(parseIso8601DurationMs('PT1H')).toBe(3600000);
    expect(parseIso8601DurationMs('PT7H')).toBe(7 * 3600000);
    expect(parseIso8601DurationMs('P1DT1H')).toBe(86400000 + 3600000);
    expect(parseIso8601DurationMs('PT30M')).toBe(1800000);
    expect(parseIso8601DurationMs('P1W')).toBe(604800000);
  });

  it('refuses years and months rather than approximating them', () => {
    // Neither is a fixed length. A guessed 30-day month would smear one gridpoint
    // value across a week of day columns; null lets the caller drop the interval.
    expect(parseIso8601DurationMs('P1M')).toBeNull();
    expect(parseIso8601DurationMs('P1Y')).toBeNull();
  });

  it('returns null on malformed input', () => {
    expect(parseIso8601DurationMs('')).toBeNull();
    expect(parseIso8601DurationMs('P')).toBeNull();
    expect(parseIso8601DurationMs('PT')).toBeNull();
    expect(parseIso8601DurationMs('1H')).toBeNull();
    expect(parseIso8601DurationMs('PT1X')).toBeNull();
  });
});

describe('composeGridpointCondition', () => {
  const DAY = { startMs: Date.parse('2026-07-14T10:00:00Z'), endMs: Date.parse('2026-07-14T22:00:00Z'), windKt: 5 };
  const wx = (validTime: string, value: any[]) => ({ validTime, value });
  const sky = (validTime: string, value: number | null) => ({ validTime, value });

  it('returns undefined when there are no gridpoint layers at all', () => {
    expect(composeGridpointCondition(null, DAY)).toBeUndefined();
    expect(composeGridpointCondition({}, DAY)).toBeUndefined();
  });

  it('reads the contracted weather enum in preference to sky cover', () => {
    const got = composeGridpointCondition({
      weather: { values: [wx('2026-07-14T12:00:00Z/PT2H', [{ coverage: 'likely', weather: 'rain_showers', intensity: 'light', attributes: [] }])] },
      skyCover: { values: [sky('2026-07-14T10:00:00Z/PT12H', 5)] },
    }, DAY);
    // Rain under a clear-ish sky is a rain report, not a sky report — same
    // precedence conditionFromMetar uses.
    expect(got).toBe('rain');
  });

  it('takes the worst of concurrent weather entries in one interval', () => {
    // Gridpoint really does return thunderstorms + rain_showers together.
    const got = composeGridpointCondition({
      weather: { values: [wx('2026-07-14T12:00:00Z/PT2H', [
        { coverage: 'slight_chance', weather: 'rain_showers', intensity: 'light', attributes: [] },
        { coverage: 'slight_chance', weather: 'thunderstorms', intensity: null, attributes: [] },
      ])] },
    }, DAY);
    expect(got).toBe('storm');
  });

  it('ignores intervals that do not overlap the period', () => {
    const got = composeGridpointCondition({
      weather: { values: [wx('2026-07-15T12:00:00Z/PT2H', [{ weather: 'snow', attributes: [] }])] },
      skyCover: { values: [sky('2026-07-14T10:00:00Z/PT12H', 90)] },
    }, DAY);
    expect(got).toBe('cloudy');
  });

  it('drops an interval whose duration cannot be parsed', () => {
    const got = composeGridpointCondition({
      weather: { values: [wx('2026-07-14T12:00:00Z/P1M', [{ weather: 'thunderstorms', attributes: [] }])] },
      skyCover: { values: [sky('2026-07-14T10:00:00Z/PT12H', 10)] },
    }, DAY);
    expect(got).toBe('clear');
  });

  it('escalates on a storm attribute even when the weather value would not', () => {
    const got = composeGridpointCondition({
      weather: { values: [wx('2026-07-14T12:00:00Z/PT2H', [{ weather: 'rain', attributes: ['tornadoes'] }])] },
    }, DAY);
    expect(got).toBe('storm');
  });

  it('weights sky cover by overlap duration, not by interval count', () => {
    // One clear hour and eleven overcast hours is an overcast day. An unweighted
    // mean of the two intervals would read 50% and draw "partly".
    const got = composeGridpointCondition({
      skyCover: { values: [
        sky('2026-07-14T10:00:00Z/PT1H', 0),
        sky('2026-07-14T11:00:00Z/PT11H', 95),
      ] },
    }, DAY);
    expect(got).toBe('cloudy');
  });

  it('counts only the overlapping slice of an interval that straddles the period edge', () => {
    const got = composeGridpointCondition({
      // 10h of clear inside the window, plus 10h of overcast that is almost all outside it.
      skyCover: { values: [
        sky('2026-07-14T10:00:00Z/PT10H', 0),
        sky('2026-07-14T20:00:00Z/PT10H', 100),
      ] },
    }, DAY);
    // 10h @ 0 + 2h @ 100 = 16.7% → clear. Unclipped it would be 50% → partly.
    expect(got).toBe('clear');
  });

  it('promotes a featureless sky to wind, but only when the sky has no story', () => {
    const clear = { values: [sky('2026-07-14T10:00:00Z/PT12H', 5)] };
    expect(composeGridpointCondition({ skyCover: clear }, { ...DAY, windKt: 25 })).toBe('wind');
    expect(composeGridpointCondition({ skyCover: clear }, { ...DAY, windKt: 5 })).toBe('clear');
    const overcast = { values: [sky('2026-07-14T10:00:00Z/PT12H', 95)] };
    expect(composeGridpointCondition({ skyCover: overcast }, { ...DAY, windKt: 25 })).toBe('cloudy');
  });
});

describe('parseForecast — gridpoint envelope (TL-23)', () => {
  const period = {
    number: 1, name: 'Today',
    startTime: '2026-07-14T06:00:00-04:00', endTime: '2026-07-14T18:00:00-04:00',
    isDaytime: true, temperature: 72, temperatureUnit: 'F',
    windSpeed: '10 mph', windDirection: 'SW',
    // Text and icon deliberately disagree with the gridpoint, so the assertions
    // below can only pass via the contracted field.
    shortForecast: 'Sunny', detailedForecast: '',
    probabilityOfPrecipitation: { value: 0 },
    icon: 'https://api.weather.gov/icons/land/day/skc?size=medium',
  };
  const forecast = { properties: { periods: [period] } };

  it('composes the condition from the gridpoint enums when the envelope carries them', () => {
    const got = parseForecast({
      forecast,
      gridpoint: {
        weather: { values: [{ validTime: '2026-07-14T14:00:00Z/PT2H', value: [{ weather: 'thunderstorms', attributes: [] }] }] },
        skyCover: { values: [{ validTime: '2026-07-14T10:00:00Z/PT12H', value: 10 }] },
      },
    });
    expect(got[0].condition).toBe('storm');
  });

  it('leaves condition undefined when the gridpoint half failed, so the legacy path still runs', () => {
    expect(parseForecast({ forecast, gridpoint: null })[0].condition).toBeUndefined();
  });

  it('still parses a bare NWS forecast payload — the envelope is additive', () => {
    const got = parseForecast(forecast);
    expect(got).toHaveLength(1);
    expect(got[0].tempC).toBe(22);
    expect(got[0].condition).toBeUndefined();
  });
});
