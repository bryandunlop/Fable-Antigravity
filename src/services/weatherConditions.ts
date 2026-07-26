/**
 * Weather condition tokens — the internal contract between a weather *source*
 * and a weather *icon*.
 *
 * PRIMARY SOURCE (since TL-23, 2026-07-26): the **gridpoint** forecast,
 * `GET /gridpoints/{wfo}/{x},{y}` → `properties.weather.values[]` for
 * precipitation/obscuration and `properties.skyCover.values[]` for the sky. That
 * is the only condition surface NWS publishes with an actual contract: no
 * `deprecated` flag, and every sub-field a closed enum (23 `weather`, 16
 * `coverage`, 4 `intensity`, 8 `attributes` — re-verified against
 * api.weather.gov/openapi.json on 2026-07-26). See conditionFromGridpoint below.
 *
 * The two functions further down are the LEGACY FALLBACK, kept because the
 * gridpoint fetch can fail independently of /forecast and an outlook with no
 * glyph is worse than an outlook with a best-effort one. Neither field they read
 * is a condition key we're allowed to lean on:
 *
 *   - `icon` (the URL the 7-day strip used to hotlink) is formally
 *     `deprecated: true` in NWS's own OpenAPI spec, along with the whole
 *     /icons endpoint, and has been since ~2022-06. A "keyable property to use
 *     with any icon set" was promised in 2020 and, as of 2026-07-15, still does
 *     not exist. Its URL grammar (the `,50` PoP suffix, the two-segment split)
 *     is entirely undocumented — NWS describes those path params as ".".
 *   - `shortForecast` is free text. An NWS maintainer stated outright that it
 *     "does not translate to a keyable value itself".
 *
 * And the two disagree: live sampling turned up a `tsra_sct,20` icon sitting on
 * a period whose text read "Smoke". So both paths are best-effort by nature.
 *
 * The response is to keep the guesswork behind ONE small pure boundary. Every
 * consumer downstream — icons, tests, mock data — speaks WeatherCondition, and
 * nothing else in the app knows an NWS slug exists. That boundary is what let
 * TL-23 land as an added function plus a changed precedence, touching no icon and
 * no component. See vault ref-nws-icon-deprecation.
 *
 * NOTE ON SCOPE: this drives a *planning outlook* explicitly labelled "not for
 * flight planning" (Q14 / D30), plus a decorative icon beside the METAR. It is
 * not a regulatory surface and nothing here may be relied on for dispatch.
 */

/** The nine conditions the icon set can draw. Day/night is a separate axis. */
export const WEATHER_CONDITIONS = [
  'clear', 'partly', 'cloudy', 'wind', 'fog', 'rain', 'sleet', 'snow', 'storm',
] as const;

export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];

/**
 * How consequential each condition is, low to high.
 *
 * Used to collapse a dual-segment NWS icon (two chronological halves of one
 * 12-hour period) down to a single glyph: the worse half wins. That's the same
 * call parseWindSpeedToKnots already makes when it takes the upper bound of a
 * wind range — understating the weather is the dangerous direction to be wrong
 * in, so we don't.
 */
const SEVERITY: Record<WeatherCondition, number> = {
  clear: 0, partly: 1, cloudy: 2, wind: 3, fog: 4, rain: 5, sleet: 6, snow: 7, storm: 8,
};

const worst = (a: WeatherCondition, b: WeatherCondition): WeatherCondition =>
  (SEVERITY[b] > SEVERITY[a] ? b : a);

/**
 * Wind thresholds at which a *featureless* sky becomes a wind story.
 *
 * Display heuristic only — these numbers carry NO regulatory or dispatch
 * meaning and are not derived from any limitation. They exist to decide which
 * of two pictures to draw.
 */
const WIND_ICON_SUSTAINED_KT = 20;
const WIND_ICON_GUST_KT = 30;

/* ────────────────────────────────────────────────────────────────────────────
   THE CONTRACTED PATH — gridpoint `weather` + `skyCover` (TL-23)
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The 23 `weather` values from `Gridpoint.properties.weather.values[].value[]`,
 * verbatim from api.weather.gov/openapi.json (re-read 2026-07-26), mapped onto
 * our nine. Unlike the icon slugs below this list IS a contract — a closed enum
 * in the spec, on a field with no `deprecated` flag.
 *
 * Four calls worth reading twice, all of them made to match what
 * conditionFromMetar already does for the equivalent METAR code, so the strip and
 * the observation beside it never disagree about the same phenomenon:
 *
 *  - `hail` → sleet, not storm. Matches METAR GR/GS → sleet. Hail without
 *    thunder is the icon's problem, not a severity judgement; the `tornadoes` /
 *    `large_hail` / `dry_thunderstorms` *attributes* do escalate to storm.
 *  - `ice_crystals` → sleet. Matches METAR IC → sleet.
 *  - `freezing_fog` / `ice_fog` → fog, not sleet. Nothing is falling. This is the
 *    exact bug D35 fixed on the METAR side (a bare /FZ/ read FZFG as sleet).
 *  - `volcanic_ash` → fog. Matches METAR VA → fog: an obscuration.
 *
 * `frost` is deliberately ABSENT. It is a surface phenomenon with no sky story,
 * and mapping it to anything would override a real skyCover reading — a frosty
 * overcast morning would render clear. Unmapped means "no opinion", which is
 * correct, and is also how an unrecognised future enum value behaves.
 */
const GRIDPOINT_WEATHER_TO_CONDITION: Record<string, WeatherCondition> = {
  // Convective
  thunderstorms: 'storm', water_spouts: 'storm',
  // Liquid
  drizzle: 'rain', rain: 'rain', rain_showers: 'rain',
  // Frozen / mixed / icing
  snow: 'snow', snow_showers: 'snow', blowing_snow: 'snow',
  sleet: 'sleet', freezing_drizzle: 'sleet', freezing_rain: 'sleet',
  hail: 'sleet', ice_crystals: 'sleet', freezing_spray: 'sleet',
  // Obscuration
  fog: 'fog', freezing_fog: 'fog', ice_fog: 'fog', haze: 'fog', smoke: 'fog',
  blowing_dust: 'fog', blowing_sand: 'fog', volcanic_ash: 'fog',
  // (frost: intentionally unmapped — see the doc comment)
};

/**
 * The `attributes` values that escalate a period to `storm` regardless of the
 * `weather` value they sit beside. Closed enum of 8; the other five
 * (`damaging_wind`, `flooding`, `gusty_wind`, `heavy_rain`, `small_hail`)
 * intensify something already reported and change no glyph.
 */
const STORM_ATTRIBUTES = new Set(['tornadoes', 'large_hail', 'dry_thunderstorms']);

/**
 * One entry of `properties.weather.values[].value[]`. Field names are the spec's.
 *
 * `coverage` and `intensity` are declared but deliberately NOT read, which is a
 * decision rather than an oversight. Reading `coverage` would mean deciding that
 * a `slight_chance` of thunderstorms is not worth a storm glyph — and both the
 * legacy path this replaces (`/thunder/` matches "Slight Chance Showers And
 * Thunderstorms" → storm) and this module's own stated principle (understating
 * the weather is the dangerous direction to be wrong in) say it is. Filtering on
 * probability is a product call about what an outlook glyph MEANS, not a
 * mechanical part of the enum migration, so it stays out of TL-23. If it is ever
 * taken, note that the strip already prints precipitation probability as its own
 * numeric row — the glyph is not the only place a reader learns the odds.
 */
export interface GridpointWeatherEntry {
  coverage?: string | null;
  weather?: string | null;
  intensity?: string | null;
  attributes?: string[] | null;
}

/**
 * Sky-cover percent → condition, at the octa boundaries the METAR table already
 * uses: FEW is ≤2/8 (25%) and reads clear, SCT is 3-4/8 (≤50%) and reads partly,
 * BKN/OVC is more than half the sky and reads cloudy. Same thresholds, so
 * skyCover and a cloud group describing the same sky agree.
 *
 * `skyCover` is a generic `GridpointQuantitativeValueLayer` (uom
 * `wmoUnit:percent`, confirmed live 2026-07-26) rather than a named schema
 * property, so it carries no `deprecated` flag but also no individual contract.
 * That is still strictly better than parsing an icon URL NWS has deprecated.
 */
export function conditionFromSkyCoverPercent(percent: number): WeatherCondition {
  if (percent <= 25) return 'clear';
  if (percent <= 50) return 'partly';
  return 'cloudy';
}

/**
 * Resolves one composed gridpoint period to a condition.
 *
 * Precedence mirrors conditionFromMetar exactly: present weather beats sky (rain
 * under an overcast is a rain report), and among concurrent weather entries the
 * worse wins — gridpoint really does return `thunderstorms` and `rain_showers` in
 * the same interval, which is the whole reason /forecast's single glyph had to be
 * composed for us before.
 *
 * Wind is the last resort, and only over an otherwise featureless sky, for the
 * same reason the wind_* icon slugs are read that way: the strip already prints
 * wind in knots as its own row, so spending the glyph on it too would say one
 * thing twice and the sky not at all.
 *
 * Returns null — never a guess — when there is no weather entry we recognise AND
 * no sky-cover reading. The caller decides what an absent condition means.
 */
export function conditionFromGridpoint(input: {
  weather?: GridpointWeatherEntry[] | null;
  skyCoverPercent?: number | null;
  windKt?: number | null;
}): WeatherCondition | null {
  const fromWeather = (input.weather ?? [])
    .map((e): WeatherCondition | undefined => {
      if ((e.attributes ?? []).some(a => STORM_ATTRIBUTES.has(a))) return 'storm';
      return e.weather ? GRIDPOINT_WEATHER_TO_CONDITION[e.weather] : undefined;
    })
    .filter((c): c is WeatherCondition => c !== undefined);

  if (fromWeather.length) return fromWeather.reduce(worst);

  const cover = input.skyCoverPercent;
  if (cover === null || cover === undefined || !Number.isFinite(cover)) return null;

  const sky = conditionFromSkyCoverPercent(cover);
  return sky === 'clear' && (input.windKt ?? 0) >= WIND_ICON_SUSTAINED_KT ? 'wind' : sky;
}

/* ────────────────────────────────────────────────────────────────────────────
   THE LEGACY FALLBACK — deprecated `icon` + free-text `shortForecast`
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * The complete 35-slug vocabulary published by GET https://api.weather.gov/icons
 * (read 2026-07-15), mapped onto our nine.
 *
 * Three mappings are deliberate and worth reading twice:
 *
 *  - `hot` / `cold` → clear. These encode TEMPERATURE, not sky; NWS returns
 *    `hot` on periods whose text says "Sunny".
 *  - `few` → clear, not partly. NWS's own description is "a few clouds", but it
 *    returns `few` for the text "Sunny". Their naming, not ours.
 *  - `wind_bkn` / `wind_ovc` → cloudy (and `wind_sct` → partly), while
 *    `wind_skc` / `wind_few` → wind. The icon carries the most notable thing
 *    about the day; wind only becomes that thing when the sky isn't. The strip
 *    already prints wind speed in knots as its own row, so spending the glyph
 *    on it too would say one thing twice and the sky not at all.
 *
 * `tsra` = HIGH cloud cover and `tsra_hi` = LOW cloud cover — the `_hi` suffix
 * describes the icon's sky imagery, not storm intensity. Both are storms to us,
 * so the inversion can't bite here, but don't "fix" it later thinking it's a typo.
 */
const SLUG_TO_CONDITION: Record<string, WeatherCondition> = {
  // Sky
  skc: 'clear', few: 'clear', sct: 'partly', bkn: 'cloudy', ovc: 'cloudy',
  hot: 'clear', cold: 'clear',
  // Sky + wind
  wind_skc: 'wind', wind_few: 'wind',
  wind_sct: 'partly', wind_bkn: 'cloudy', wind_ovc: 'cloudy',
  // Liquid
  rain: 'rain', rain_showers: 'rain', rain_showers_hi: 'rain',
  // Frozen / mixed
  snow: 'snow', blizzard: 'snow',
  rain_snow: 'sleet', rain_sleet: 'sleet', snow_sleet: 'sleet', sleet: 'sleet',
  fzra: 'sleet', rain_fzra: 'sleet', snow_fzra: 'sleet',
  // Convective / tropical
  tsra: 'storm', tsra_sct: 'storm', tsra_hi: 'storm',
  tornado: 'storm', hurricane: 'storm', tropical_storm: 'storm',
  // Obscuration
  fog: 'fog', haze: 'fog', smoke: 'fog', dust: 'fog',
};

/**
 * Pulls a condition out of a deprecated NWS icon URL.
 *
 * Handles `/icons/{set}/{timeOfDay}/{first}[/{second}]?size=…`, where each
 * segment may carry an undocumented `,NN` probability suffix. Two segments =
 * two halves of the period; the worse half wins.
 *
 * Returns null — never a guess — when the URL isn't an NWS icon or the slug
 * isn't one we know.
 */
export function conditionFromNwsIconUrl(iconUrl: string): WeatherCondition | null {
  if (!iconUrl) return null;

  const marker = '/icons/';
  const path = iconUrl.split('?')[0];
  const at = path.indexOf(marker);
  if (at === -1) return null;

  // {set}/{timeOfDay}/{first}[/{second}] — drop set + timeOfDay, keep the slugs.
  const slugs = path.slice(at + marker.length).split('/').filter(Boolean).slice(2);

  const found = slugs
    .map(s => SLUG_TO_CONDITION[s.split(',')[0].toLowerCase()])
    .filter((c): c is WeatherCondition => c !== undefined);

  return found.length ? found.reduce(worst) : null;
}

/**
 * Keyword patterns for `shortForecast`, in resolution order.
 *
 * The order is doing real work and is NOT alphabetical or arbitrary:
 *
 *  1. More consequential before less, so a composed "X then Y" string resolves
 *     to its more significant half ("Partly Sunny then Chance Showers And
 *     Thunderstorms" → storm).
 *  2. More specific before less, where one pattern is a substring of another.
 *     Two traps live here: "Partly Cloudy" contains "cloudy", so `partly` must
 *     precede `cloudy`; and "Rain And Snow" would match both `rain` and `snow`,
 *     so the mixed-precip patterns must precede both.
 *
 * `wind` sits below the sky patterns on purpose — see the wind_* note above.
 * "Mostly Cloudy and Breezy" is a cloudy day; "Sunny and Breezy" is a windy one.
 */
const TEXT_PATTERNS: Array<[RegExp, WeatherCondition]> = [
  [/tornado|hurricane|tropical storm|thunder|t-?storm/i, 'storm'],
  [/freezing (rain|drizzle)|sleet|ice pellets|wintry|rain and snow|snow and rain|rain\/snow|snow\/rain/i, 'sleet'],
  [/blizzard|snow|flurr/i, 'snow'],
  [/rain|shower|drizzle/i, 'rain'],
  [/fog|mist|haze|smoke|dust|sand/i, 'fog'],
  [/partly (sunny|cloudy)|mostly sunny|scattered clouds|few clouds/i, 'partly'],
  [/mostly cloudy|overcast|cloudy/i, 'cloudy'],
  [/wind|breezy|blustery/i, 'wind'],
  [/sunny|clear|fair|hot|cold/i, 'clear'],
];

/**
 * Best-effort read of NWS's free-text summary. Returns null when nothing matches
 * rather than inventing a condition.
 */
export function conditionFromShortForecast(text: string): WeatherCondition | null {
  if (!text) return null;
  for (const [pattern, condition] of TEXT_PATTERNS) {
    if (pattern.test(text)) return condition;
  }
  return null;
}

/**
 * Resolves one forecast period to a condition.
 *
 * `condition` first (TL-23): parseForecast composes it from the gridpoint enums
 * whenever the gridpoint layers came back, and that is the only contracted input
 * of the three. It stays optional because the gridpoint fetch fails independently
 * of /forecast, and because the demo seed has no gridpoint behind it.
 *
 * Then text, then icon — text first because `icon` is the deprecated one of the
 * two, so leading with it would put the removable field on the critical path.
 *
 * ⚠ The glyph and the tooltip can now disagree, and that is the cost of the
 * migration. Text-first used to be justified partly by the tooltip showing
 * `shortForecast`, so keying off the text kept picture and words in step. Putting
 * the contracted field on top gives that up: NWS's own prose and its own gridpoint
 * contradict each other in live data (the "Partly Sunny" period whose icon slug
 * read `bkn`, sampled 2026-07-26), and this now believes the contract. The right
 * follow-up is to show the DERIVED condition's label next to the NWS text so a
 * reader sees both, rather than to reintroduce the free-text regex as arbiter.
 *
 * Falls back to `cloudy`, never `clear`: when we don't know, we don't get to
 * imply good weather. Same instinct as parseTempC returning null rather than a
 * 0 that renders as a hard freeze.
 */
export function conditionFromForecastPeriod(
  period: { condition?: WeatherCondition | null; icon?: string; shortForecast?: string },
): WeatherCondition {
  return (
    period.condition ??
    conditionFromShortForecast(period.shortForecast ?? '') ??
    conditionFromNwsIconUrl(period.icon ?? '') ??
    'cloudy'
  );
}

/**
 * METAR present-weather codes, most consequential first.
 *
 * The `FZ` descriptor must be bound to a precipitation type. A bare /FZ/ also
 * matches FZFG — freezing fog — which is an obscuration with nothing falling
 * out of it, and which would otherwise draw animated sleet on a perfectly still
 * winter morning. Requiring FZRA/FZDZ lets FZFG fall through to the fog bucket
 * where it belongs. (The free-text table above already got this right with
 * /freezing (rain|drizzle)/; this is the same discipline in METAR codes.)
 */
const METAR_WX_PATTERNS: Array<[RegExp, WeatherCondition]> = [
  [/TS/, 'storm'],                              // incl. TSRA, +TSRA, TSGR, VCTS
  [/FZ(RA|DZ)|PL|GS|GR|RASN|SNRA|IC/, 'sleet'], // freezing rain/drizzle, ice pellets, hail, mixed
  [/SN|SG/, 'snow'],                            // incl. SHSN, BLSN, DRSN
  [/RA|DZ/, 'rain'],                            // incl. SHRA, -DZ
  [/FG|BR|HZ|FU|DU|SA|VA|PY/, 'fog'],           // fog (incl. FZFG/BCFG/MIFG), mist, haze, smoke, dust, sand, ash
];

/** Cloud-cover groups, least to most sky. */
const COVER_TO_CONDITION: Record<string, WeatherCondition> = {
  SKC: 'clear', CLR: 'clear', NSC: 'clear', NCD: 'clear', CAVOK: 'clear',
  FEW: 'clear',
  SCT: 'partly',
  BKN: 'cloudy', OVC: 'cloudy', VV: 'cloudy',
};

/**
 * Resolves an observation to a condition.
 *
 * Present weather beats cloud cover (rain under an overcast is a rain report,
 * not a cloud report), and among cloud layers the worst wins — a FEW/OVC report
 * is overcast.
 *
 * Defaults to `clear` on an empty report, which looks like it contradicts
 * conditionFromForecastPeriod's cloudy default but doesn't: a METAR with no sky
 * group is a positive observation of no cloud, whereas a forecast period we
 * couldn't parse is missing data. Absence of evidence vs. evidence of absence.
 */
export function conditionFromMetar(metar: {
  wxString?: string;
  clouds?: Array<{ cover: string }>;
  wspd?: number;
  wgst?: number;
}): WeatherCondition {
  const wx = (metar.wxString ?? '').toUpperCase();
  for (const [pattern, condition] of METAR_WX_PATTERNS) {
    if (pattern.test(wx)) return condition;
  }

  const sky = (metar.clouds ?? [])
    .map(c => COVER_TO_CONDITION[(c.cover ?? '').toUpperCase()])
    .filter((c): c is WeatherCondition => c !== undefined)
    .reduce<WeatherCondition>(worst, 'clear');

  const windy =
    (metar.wspd ?? 0) >= WIND_ICON_SUSTAINED_KT || (metar.wgst ?? 0) >= WIND_ICON_GUST_KT;

  return windy && sky === 'clear' ? 'wind' : sky;
}
