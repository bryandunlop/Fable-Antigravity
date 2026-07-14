import { describe, it, expect } from 'vitest';
import {
  fahrenheitToCelsius,
  parseWindSpeedToKnots,
  parseForecast,
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
