import { describe, it, expect } from 'vitest';
import {
  conditionFromNwsIconUrl,
  conditionFromShortForecast,
  conditionFromForecastPeriod,
  conditionFromMetar,
  WEATHER_CONDITIONS,
  type WeatherCondition,
} from './weatherConditions';

describe('conditionFromNwsIconUrl', () => {
  it('reads the slug out of a single-condition icon URL', () => {
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/skc?size=medium')).toBe('clear');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/night/bkn?size=medium')).toBe('cloudy');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/tsra?size=medium')).toBe('storm');
  });

  it('strips the probability-of-precipitation suffix', () => {
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/rain,70?size=medium')).toBe('rain');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/tsra_sct,50')).toBe('storm');
  });

  it('takes the MORE SEVERE half of a dual-condition icon', () => {
    // NWS splits a 12h period into two chronological halves. We plan against
    // the worse one — same principle as parseWindSpeedToKnots' upper bound.
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/bkn/tsra_sct,50')).toBe('storm');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/night/tsra_sct,30/bkn')).toBe('storm');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/skc/rain,40')).toBe('rain');
  });

  it('maps hot/cold to clear — they encode temperature, not sky', () => {
    // Confirmed against live NWS data: `hot` is returned alongside shortForecast
    // "Sunny". Treating it as its own sky state would be wrong.
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/hot?size=medium')).toBe('clear');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/cold?size=medium')).toBe('clear');
  });

  it('keeps the sky story for windy-sky slugs, but lets wind win a bare sky', () => {
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/wind_bkn')).toBe('cloudy');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/wind_ovc')).toBe('cloudy');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/wind_sct')).toBe('partly');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/wind_skc')).toBe('wind');
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/wind_few')).toBe('wind');
  });

  it('returns null rather than guessing on junk input', () => {
    expect(conditionFromNwsIconUrl('')).toBeNull();
    expect(conditionFromNwsIconUrl('https://example.com/not-an-icon.png')).toBeNull();
    expect(conditionFromNwsIconUrl('https://api.weather.gov/icons/land/day/notareal')).toBeNull();
  });

  it('covers every slug the live /icons endpoint publishes', () => {
    // The full 35-slug vocabulary, verbatim from GET https://api.weather.gov/icons
    // (2026-07-15). If NWS adds a slug this test still passes — the point is that
    // none of the 35 known ones fall through to null.
    const slugs = [
      'skc', 'few', 'sct', 'bkn', 'ovc', 'wind_skc', 'wind_few', 'wind_sct',
      'wind_bkn', 'wind_ovc', 'snow', 'rain_snow', 'rain_sleet', 'snow_sleet',
      'fzra', 'rain_fzra', 'snow_fzra', 'sleet', 'rain', 'rain_showers',
      'rain_showers_hi', 'tsra', 'tsra_sct', 'tsra_hi', 'tornado', 'hurricane',
      'tropical_storm', 'dust', 'smoke', 'haze', 'hot', 'cold', 'blizzard', 'fog',
    ];
    for (const slug of slugs) {
      const got = conditionFromNwsIconUrl(`https://api.weather.gov/icons/land/day/${slug}`);
      expect(got, `slug "${slug}" fell through to null`).not.toBeNull();
      expect(WEATHER_CONDITIONS).toContain(got as WeatherCondition);
    }
  });
});

describe('conditionFromShortForecast', () => {
  it('matches the common NWS phrasings', () => {
    expect(conditionFromShortForecast('Sunny')).toBe('clear');
    expect(conditionFromShortForecast('Mostly Clear')).toBe('clear');
    expect(conditionFromShortForecast('Partly Cloudy')).toBe('partly');
    expect(conditionFromShortForecast('Mostly Sunny')).toBe('partly');
    expect(conditionFromShortForecast('Mostly Cloudy')).toBe('cloudy');
    expect(conditionFromShortForecast('Overcast')).toBe('cloudy');
    expect(conditionFromShortForecast('Chance Rain Showers')).toBe('rain');
    expect(conditionFromShortForecast('Patchy Fog')).toBe('fog');
    expect(conditionFromShortForecast('Slight Chance Snow Showers')).toBe('snow');
  });

  it('does not let "Partly Cloudy" fall into the generic cloudy bucket', () => {
    // "partly cloudy" contains the substring "cloudy" — ordering is load-bearing.
    expect(conditionFromShortForecast('Partly Cloudy')).toBe('partly');
    expect(conditionFromShortForecast('Partly Cloudy then Slight Chance Showers')).toBe('rain');
  });

  it('takes the worst condition out of a composed "then" string', () => {
    expect(conditionFromShortForecast('Partly Sunny then Chance Showers And Thunderstorms')).toBe('storm');
    expect(conditionFromShortForecast('Chance Rain Showers then Patchy Fog')).toBe('rain');
  });

  it('reads a wintry mix as sleet, not plain snow or rain', () => {
    expect(conditionFromShortForecast('Wintry Mix')).toBe('sleet');
    expect(conditionFromShortForecast('Freezing Rain')).toBe('sleet');
    expect(conditionFromShortForecast('Rain And Snow')).toBe('sleet');
    expect(conditionFromShortForecast('Chance Ice Pellets')).toBe('sleet');
  });

  it('lets wind win only when the sky has no story of its own', () => {
    expect(conditionFromShortForecast('Sunny and Breezy')).toBe('wind');
    expect(conditionFromShortForecast('Mostly Cloudy and Breezy')).toBe('cloudy');
    expect(conditionFromShortForecast('Partly Cloudy and Windy')).toBe('partly');
  });

  it('returns null on text it cannot read', () => {
    expect(conditionFromShortForecast('')).toBeNull();
    expect(conditionFromShortForecast('Areas Of Blowing Volcanic Ash')).toBeNull();
  });
});

describe('conditionFromForecastPeriod', () => {
  it('prefers shortForecast over the deprecated icon field', () => {
    // NWS marks `icon` deprecated (openapi.json, deprecated: true) and the two
    // fields are independently derived — they demonstrably disagree in live data.
    // The tooltip shows the TEXT, so the icon must agree with the text, not with
    // NWS's own icon choice.
    const got = conditionFromForecastPeriod({
      icon: 'https://api.weather.gov/icons/land/day/tsra_sct,20?size=medium',
      shortForecast: 'Smoke',
    });
    expect(got).toBe('fog');
  });

  it('falls back to the icon slug when the text is unreadable', () => {
    const got = conditionFromForecastPeriod({
      icon: 'https://api.weather.gov/icons/land/day/rain,70?size=medium',
      shortForecast: '',
    });
    expect(got).toBe('rain');
  });

  it('defaults to cloudy — never to clear — when neither field resolves', () => {
    // Defaulting to good weather is the dangerous direction to be wrong in,
    // matching parseWindSpeedToKnots (upper bound) and parseTempC (null, not 0).
    expect(conditionFromForecastPeriod({ icon: '', shortForecast: '' })).toBe('cloudy');
    expect(conditionFromForecastPeriod({})).toBe('cloudy');
  });
});

describe('conditionFromMetar', () => {
  it('reads present-weather codes ahead of cloud cover', () => {
    expect(conditionFromMetar({ wxString: '-RA BR', clouds: [{ cover: 'OVC' }] })).toBe('rain');
    expect(conditionFromMetar({ wxString: 'SN', clouds: [{ cover: 'BKN' }] })).toBe('snow');
    expect(conditionFromMetar({ wxString: 'BR', clouds: [{ cover: 'SCT' }] })).toBe('fog');
  });

  it('puts thunderstorms above everything else in the same report', () => {
    expect(conditionFromMetar({ wxString: 'TSRA', clouds: [{ cover: 'BKN' }] })).toBe('storm');
    expect(conditionFromMetar({ wxString: '+TSRA GR', clouds: [{ cover: 'OVC' }] })).toBe('storm');
  });

  it('reads freezing and mixed precipitation as sleet', () => {
    expect(conditionFromMetar({ wxString: 'FZRA' })).toBe('sleet');
    expect(conditionFromMetar({ wxString: 'FZDZ' })).toBe('sleet');
    expect(conditionFromMetar({ wxString: '+FZRA' })).toBe('sleet');
    expect(conditionFromMetar({ wxString: 'PL' })).toBe('sleet');
    expect(conditionFromMetar({ wxString: 'RASN' })).toBe('sleet');
  });

  it('reads FREEZING FOG as fog, not sleet — nothing is falling', () => {
    // A bare /FZ/ swallowed FZFG into the sleet bucket and drew animated
    // precipitation on a still winter morning. The descriptor has to be bound
    // to a precip type.
    expect(conditionFromMetar({ wxString: 'FZFG' })).toBe('fog');
    expect(conditionFromMetar({ wxString: 'FZFG', clouds: [{ cover: 'OVC' }] })).toBe('fog');
  });

  it('handles the descriptor-prefixed fog family', () => {
    expect(conditionFromMetar({ wxString: 'BCFG' })).toBe('fog');  // patches of fog
    expect(conditionFromMetar({ wxString: 'MIFG' })).toBe('fog');  // shallow fog
    expect(conditionFromMetar({ wxString: 'PRFG' })).toBe('fog');  // partial fog
  });

  it('handles descriptor-prefixed precipitation', () => {
    expect(conditionFromMetar({ wxString: 'SHSN' })).toBe('snow');   // snow showers
    expect(conditionFromMetar({ wxString: 'BLSN' })).toBe('snow');   // blowing snow
    expect(conditionFromMetar({ wxString: 'SHRA' })).toBe('rain');   // rain showers
    expect(conditionFromMetar({ wxString: '-DZ' })).toBe('rain');    // light drizzle
    expect(conditionFromMetar({ wxString: 'VCTS' })).toBe('storm');  // thunderstorm in vicinity
    expect(conditionFromMetar({ wxString: 'TSGR' })).toBe('storm');  // thunderstorm with hail
  });

  it('derives the sky from cloud cover when nothing else is reported', () => {
    expect(conditionFromMetar({ clouds: [{ cover: 'CLR' }] })).toBe('clear');
    expect(conditionFromMetar({ clouds: [{ cover: 'FEW' }] })).toBe('clear');
    expect(conditionFromMetar({ clouds: [{ cover: 'SCT' }] })).toBe('partly');
    expect(conditionFromMetar({ clouds: [{ cover: 'BKN' }] })).toBe('cloudy');
    expect(conditionFromMetar({ clouds: [{ cover: 'OVC' }] })).toBe('cloudy');
  });

  it('takes the worst layer when several are reported', () => {
    expect(conditionFromMetar({ clouds: [{ cover: 'FEW' }, { cover: 'OVC' }] })).toBe('cloudy');
    expect(conditionFromMetar({ clouds: [{ cover: 'FEW' }, { cover: 'SCT' }] })).toBe('partly');
  });

  it('shows wind only when the sky is unremarkable', () => {
    expect(conditionFromMetar({ clouds: [{ cover: 'CLR' }], wspd: 24 })).toBe('wind');
    expect(conditionFromMetar({ clouds: [{ cover: 'CLR' }], wspd: 8, wgst: 32 })).toBe('wind');
    // A busy sky keeps its own story; the knots are already displayed as a number.
    expect(conditionFromMetar({ clouds: [{ cover: 'OVC' }], wspd: 24 })).toBe('cloudy');
    expect(conditionFromMetar({ wxString: 'RA', wspd: 24 })).toBe('rain');
    // Below the threshold, calm-ish wind changes nothing.
    expect(conditionFromMetar({ clouds: [{ cover: 'CLR' }], wspd: 8 })).toBe('clear');
  });

  it('defaults to clear on an empty report rather than inventing cloud', () => {
    // Unlike the forecast, an empty METAR sky group means the observer saw no
    // cloud — CLR/SKC is a positive observation, not an absence of data.
    expect(conditionFromMetar({})).toBe('clear');
  });
});
