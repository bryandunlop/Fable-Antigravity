// What a non-lead sees at /booking-portal/cost-model.
//
// It states plainly that the page exists and who it is for, rather than pretending
// the route is absent — a viewer who followed a walkthrough link or a colleague's
// URL deserves to know why they landed here, not a dead end.

import { Lock } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { PortalShell } from '../components/PortalShell';

export default function CostModelDenied() {
  return (
    <PortalShell title="Cost model">
      <Card className="max-w-2xl">
        <CardContent className="flex gap-3 p-5">
          <span className="status-badge status-warning mt-0.5 h-fit p-1.5"><Lock className="h-4 w-4" /></span>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">This one is for the lead team.</p>
            <p className="text-muted-foreground">
              The cost model shows the department's budget, its fixed-cost base, and how the published rate compares
              with what an extra flight hour actually costs. That is a leadership and finance conversation rather
              than an operational one, so it sits behind the lead role.
            </p>
            <p className="text-muted-foreground">
              What a specific trip costs — the itemised estimate, the credits you can earn and the change fees — is on
              every request you build, and needs no special access.
            </p>
          </div>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
