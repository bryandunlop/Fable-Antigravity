import React from 'react';
import type { WeatherCondition } from '../../services/weatherConditions';

/**
 * Weather icon set — "live glass gauge" (Bryan, 2026-07-15).
 *
 * Replaces two things: the remote <img> hotlink to api.weather.gov/icons in the
 * 7-day strip (a deprecated NWS endpoint, and a third-party request on every
 * dashboard load), and the hand-rolled inline SVG on the observation card that
 * branched on day/night alone and drew a cloud over a clear sky regardless.
 *
 * COLOUR — the palette is the whole idea. GFO's own brand axis is already a sky
 * palette (Midnight / Daylight / Sunrise, per gfo-tokens.css), so every glyph is
 * drawn from brand tokens and none of them borrows the RAG ramp. That matters
 * here specifically: these icons sit inches from the VFR/MVFR/IFR/LIFR badges,
 * where green/amber/red carry flight-category meaning. A weather glyph must
 * never look like it is making that claim. Cloud bodies are currentColor so the
 * caller themes them; the phenomenon carries the accent.
 *
 * MOTION — every animation is transform/opacity only (compositor-only, no
 * layout), small in amplitude, long in period, and switched off under
 * prefers-reduced-motion via motion-reduce:animate-none, matching the
 * convention D33 set on Button. See the keyframe block in index.css.
 *
 * GEOMETRY — 64×64 grid, and clouds are built from circles + a rect rather than
 * a bezier silhouette, which suits the P&G VIS ID's "crisp rectangles and
 * circles" line and stays legible at the 28px the outlook strip renders at.
 * (Note: EmptyStateSVGs/LoadingSpinners in this folder use a 100×100 viewBox.
 * That convention is for illustration-scale art; 64 is the icon grid here. The
 * public props — size, className — follow the folder either way.)
 */

interface WeatherIconProps {
  condition: WeatherCondition;
  /** Sun vs. moon for `clear`. Ignored by every other condition. */
  isDay?: boolean;
  size?: number;
  className?: string;
  /** Accessible label. Pass the forecast text; defaults to the condition name. */
  title?: string;
}

/** Spin has to orbit the sun's centre, not the SVG's — fill-box makes `center` mean the group's own box. */
const SPIN_ORIGIN: React.CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

/**
 * Eight rays derived from the disc they belong to, rather than a fixed path.
 *
 * They were a hardcoded path centred on (32,32), which silently broke the
 * moment `partly` moved its sun to (41,22): full-size rays kept radiating from
 * the icon's centre while a smaller disc sat up-right of them, connected to
 * nothing. The cloud covered enough of it to look plausible at 28px, which is
 * exactly why it survived a first look. Deriving the geometry makes that class
 * of drift impossible — the rays cannot be anywhere but around their own sun.
 *
 * Ratios reproduce the original path for the default r=12 (inner ≈22, outer ≈28
 * from centre) and scale down cleanly for the small partial sun.
 */
export function sunRayPath(cx: number, cy: number, r: number): string {
  const inner = r * 1.8;
  const outer = r * 2.3;
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const f = (n: number) => Number(n.toFixed(1));
    return `M${f(cx + dx * inner)} ${f(cy + dy * inner)}L${f(cx + dx * outer)} ${f(cy + dy * outer)}`;
  }).join(' ');
}

/**
 * The cloud body. Three circles and a rect, unioned by a shared solid fill —
 * no opacity inside the group, or the overlaps would show as seams.
 */
function Cloud({ className = 'text-slate-300 dark:text-slate-400', transform }: {
  className?: string;
  transform?: string;
}) {
  return (
    <g fill="currentColor" className={className} transform={transform}>
      <circle cx="23" cy="37" r="9" />
      <circle cx="41" cy="37" r="9" />
      <circle cx="32" cy="30" r="12" />
      <rect x="23" y="37" width="18" height="9" />
    </g>
  );
}

function Sun({ cx = 32, cy = 32, r = 12 }) {
  return (
    <>
      <g style={SPIN_ORIGIN} className="animate-wx-spin motion-reduce:animate-none">
        <path
          d={sunRayPath(cx, cy, r)}
          className="stroke-gfo-sunrise"
          strokeWidth={Number((r * 0.28).toFixed(2))}
          strokeLinecap="round"
        />
      </g>
      <circle cx={cx} cy={cy} r={r} className="fill-gfo-sunrise" />
    </>
  );
}

/**
 * Crescent moon, drawn as a real crescent path rather than a disc with a mask
 * carved out of it. Masks need ids, and up to eight of these render on one page
 * — duplicate ids would collide and the crescents would fight each other.
 *
 * `transform` places it; `stars` is off for the partly variant, where the moon
 * is small and half-covered and the stars just add litter.
 */
function Moon({ transform, stars = true }: { transform?: string; stars?: boolean }) {
  return (
    <g transform={transform}>
      {/* Earthshine sliver behind the crescent — a soft rim in light mode; in
          dark mode it is the same colour as the crescent and simply vanishes. */}
      <path d="M43 35A16 16 0 0 1 27 19a16.5 16.5 0 0 0-1 5 16 16 0 0 0 17 11Z" className="fill-gfo-daylight-light" />
      <path d="M42 34A16 16 0 0 1 26 18a16 16 0 1 0 16 16Z" className="fill-gfo-midnight dark:fill-gfo-daylight-light" />
      {stars && (
        <>
          <circle cx="47" cy="14" r="1.8" className="fill-gfo-sunrise animate-wx-twinkle motion-reduce:animate-none" />
          <circle cx="53" cy="22" r="1.3" className="fill-gfo-sunrise animate-wx-twinkle motion-reduce:animate-none" style={{ animationDelay: '1.2s' }} />
        </>
      )}
    </g>
  );
}

/** Rain streaks / snow pellets, staggered so they don't fall in lockstep. */
function Precip({ kind }: { kind: 'rain' | 'snow' | 'sleet' }) {
  if (kind === 'rain') {
    return (
      <g className="stroke-gfo-daylight" strokeWidth="3.4" strokeLinecap="round">
        {[24, 32, 40].map((x, i) => (
          <path
            key={x}
            d={`M${x} 45l-2.5 8`}
            className="animate-wx-fall motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        ))}
      </g>
    );
  }
  if (kind === 'snow') {
    return (
      <g className="fill-gfo-daylight-light">
        {[[23, 49], [32, 55], [41, 49]].map(([cx, cy], i) => (
          <circle
            key={cx}
            cx={cx}
            cy={cy}
            r="3"
            className="animate-wx-fall-slow motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.7}s` }}
          />
        ))}
      </g>
    );
  }
  // Sleet — mixed. A streak and a pellet alternating says "both" in a way that
  // a third variant of either never could.
  return (
    <>
      <g className="stroke-gfo-daylight" strokeWidth="3.4" strokeLinecap="round">
        {[24, 40].map((x, i) => (
          <path
            key={x}
            d={`M${x} 45l-2.5 8`}
            className="animate-wx-fall motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </g>
      <circle cx="32" cy="52" r="3" className="fill-gfo-daylight-light animate-wx-fall-slow motion-reduce:animate-none" style={{ animationDelay: '0.25s' }} />
    </>
  );
}

const GLYPHS: Record<WeatherCondition, (isDay: boolean) => React.ReactNode> = {
  clear: isDay => (isDay ? <Sun /> : <Moon />),

  partly: isDay => (
    <>
      {/* Day and night must occupy the SAME spot — the sun sits at (41,22) r9,
          so the crescent is scaled and translated to land on it. Its own art is
          ~r16 about (32,26): 0.62 scale, then translate to bring that centre to
          the sun's. Eyeballed placement put it up-left of the cloud instead of
          behind it, and the pair read as two unrelated objects. */}
      {isDay
        ? <Sun cx={41} cy={22} r={9} />
        : <Moon transform="translate(21,6) scale(0.62)" stars={false} />}
      <Cloud transform="translate(-3,5) scale(0.9)" />
    </>
  ),

  cloudy: () => (
    <>
      {/* Back layer reads as depth; it is the same glyph, smaller and dimmer. */}
      <Cloud className="text-slate-300/45 dark:text-slate-500/45" transform="translate(9,-7) scale(0.8)" />
      <Cloud />
    </>
  ),

  rain: () => (
    <>
      <Cloud transform="translate(0,-6)" />
      <Precip kind="rain" />
    </>
  ),

  snow: () => (
    <>
      <Cloud transform="translate(0,-6)" />
      <Precip kind="snow" />
    </>
  ),

  sleet: () => (
    <>
      <Cloud transform="translate(0,-6)" />
      <Precip kind="sleet" />
    </>
  ),

  storm: () => (
    <>
      {/* Midnight body — the one place the palette goes dark on purpose. */}
      <Cloud className="text-gfo-midnight dark:text-gfo-midnight-light" transform="translate(0,-6)" />
      <path
        d="M34 40l-9 12h8l-4 11"
        className="fill-gfo-sunrise stroke-gfo-sunrise animate-wx-flicker motion-reduce:animate-none"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </>
  ),

  fog: () => (
    <>
      <Cloud transform="translate(0,-8)" />
      <g className="stroke-gfo-daylight" strokeWidth="3.4" strokeLinecap="round" opacity="0.7">
        <path d="M14 46h36" className="animate-wx-drift motion-reduce:animate-none" />
        <path d="M19 54h26" className="animate-wx-drift motion-reduce:animate-none" style={{ animationDelay: '1s' }} />
      </g>
    </>
  ),

  wind: () => (
    <g fill="none" strokeWidth="3.4" strokeLinecap="round">
      <path d="M6 24h30a6 6 0 1 0-6-6" className="stroke-slate-300 dark:stroke-slate-400 animate-wx-gust motion-reduce:animate-none" />
      <path d="M6 34h40a6 6 0 1 1-6 6" className="stroke-gfo-daylight animate-wx-gust motion-reduce:animate-none" style={{ animationDelay: '0.4s' }} />
      <path d="M6 44h22a5 5 0 1 1-5 5" className="stroke-slate-300 dark:stroke-slate-400 animate-wx-gust motion-reduce:animate-none" style={{ animationDelay: '0.8s' }} />
    </g>
  ),
};

const LABELS: Record<WeatherCondition, string> = {
  clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Cloudy', wind: 'Windy',
  fog: 'Fog', rain: 'Rain', sleet: 'Wintry mix', snow: 'Snow', storm: 'Thunderstorms',
};

export function WeatherIcon({
  condition,
  isDay = true,
  size = 64,
  className = '',
  title,
}: WeatherIconProps) {
  const label = title ?? LABELS[condition];
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {GLYPHS[condition](isDay)}
    </svg>
  );
}

export default WeatherIcon;
