import { FlaskConical } from 'lucide-react';

/**
 * Marks weather that came from the demo seed rather than a live source.
 *
 * This is the mitigation that makes the demo fallback acceptable at all. The
 * panel it sits in renders a METAR and a flight category — the two things a
 * crew reads to decide whether a field is usable. Seeded weather wearing that
 * costume without a label is the one genuinely unsafe outcome in an otherwise
 * cosmetic feature, so the chip is not decorative and must not be made
 * conditional, dismissible, or responsive-hidden.
 *
 * Deliberately NOT tech-log's DemoBanner, for three reasons: the Dashboard
 * shouldn't take a dependency on the tech-log module; that component's claim is
 * about airworthiness records rather than weather; and its chip variant is
 * `hidden … sm:inline-flex`, which is a disclosure with an escape hatch.
 *
 * `reason` carries the underlying fetch failure so a dead /api stays
 * diagnosable from the dashboard instead of being silently papered over.
 */
export function WeatherDemoChip({ reason }: { reason?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm border border-gfo-sunrise/40 bg-gfo-sunrise/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gfo-sunrise-deep dark:text-gfo-sunrise"
      title={
        reason
          ? `Demo data — not a live observation. Live fetch failed: ${reason}`
          : 'Demo data — not a live observation.'
      }
    >
      <FlaskConical className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      Demo
    </span>
  );
}

export default WeatherDemoChip;
