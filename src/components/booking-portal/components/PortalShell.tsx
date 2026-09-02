/**
 * What is left of the booking portal's chrome (D109 slice 5).
 *
 * RETIRED. The portal had a nine-tab bar and a seventeen-step guided walkthrough; every tab and ten
 * of those steps pointed at pages that are now redirects into the trips module, so clicking one
 * bounced the visitor to /trips with no explanation, and the tour dumped them there mid-walkthrough
 * with its overlay gone. Bryan, 2026-09-02: "I dont think anyone should see the old booking portal."
 *
 * The one page still served here is the executive's new-request form, reached from the fleet-week
 * ask-my-EA handoff (D99) — and that visitor never wanted the chrome anyway: "a page, not the
 * portal". So the shell is now a heading and the form, for everybody. The persona switch went with
 * the tab bar, which is a bonus: it was demo chrome sitting next to approve/decline controls that
 * read `state.persona`, not auth.
 *
 * Rebuilding the request form inside the trips module retires this file entirely — see LG-367.
 */

import { type ReactNode } from 'react';

export function PortalShell({
  title,
  meta,
  actions,
  children,
}: {
  title: string;
  meta?: ReactNode;
  /** Kept in the signature so the surviving page need not change; rendered beside the heading. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="gfo-eyebrow mb-1 text-muted-foreground">Booking Portal</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {meta && <p className="mt-0.5">{meta}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
