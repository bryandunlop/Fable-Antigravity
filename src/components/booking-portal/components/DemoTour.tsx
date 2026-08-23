// A walkthrough that explains itself as it goes.
//
// It drives the real portal — real routes, real components, the real quote engine —
// rather than a set of screenshots, so what a viewer is told matches what they can
// then go and click. Steps anchor to `data-tour="..."` attributes; a step with no
// anchor is narration over whatever page it navigated to.
//
// Deliberately not a generic tour library: the value here is the script, and the
// script is specific to how a chargeback lands on an EA.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlayCircle, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../ui/utils';

export interface TourStep {
  id: string;
  title: string;
  /** Narration. Short paragraphs; this is read, not skimmed. */
  body: string[];
  /** Route to be on for this step. */
  route?: string;
  /** `data-tour` value to spotlight. */
  anchor?: string;
  /** Shown as a quiet aside — the "why", for a viewer who wants the reasoning. */
  aside?: string;
}

export const BOOKING_TOUR: TourStep[] = [
  {
    id: 'intro',
    title: 'Booking a trip, and what it costs',
    route: '/booking-portal',
    body: [
      'This is the booking portal as an executive assistant sees it. Everything here is live — the same components, the same quote engine — so anything explained can be clicked afterwards.',
      'The walkthrough follows one request end to end, then shows where the money lands and why the numbers behave the way they do.',
    ],
    aside: 'Roughly 3 minutes. Use Back and Next; nothing you do here is saved.',
  },
  {
    id: 'home',
    title: 'What an EA can see',
    route: '/booking-portal',
    body: [
      'The home view is a calendar filtered by a default-deny confidentiality projection: flights an EA is not entitled to see do not render at all, rather than rendering greyed out.',
      'Flights with a spare seat are marked. That matters later — a seat on a trip already flying is the cheapest capacity the department has.',
    ],
  },
  {
    id: 'start',
    title: 'Starting a request',
    route: '/booking-portal/requests/new',
    body: [
      'A request is demand, not a trip. It captures what the principal needs; scheduling turns it into an aircraft and a time.',
      'The form asks only what an EA can actually know months out — route, dates, who is travelling and why.',
    ],
  },
  {
    id: 'legs',
    title: 'The legs — and the flex control',
    route: '/booking-portal/requests/new',
    anchor: 'leg-fields',
    body: [
      'Route, date and departure time, and then the one control most people skip: flex.',
      'Flex is how much of a window scheduling gets to move the departure within. Give it four hours or more and the trip earns a credit, because a flexible leg can be paired with another and costs the department less to fly.',
    ],
    aside: 'Try changing flex to 4 and watch the cost estimate move.',
  },
  {
    id: 'manifest',
    title: 'The manifest, and why purpose is a field',
    route: '/booking-portal/requests/new',
    anchor: 'manifest',
    body: [
      'Each passenger carries a purpose for each leg: business, personal, entertainment or commute.',
      'This is not a reporting nicety. 14 CFR 91.501(b)(5) bars any charge for carrying a guest outside the scope of the business, so the purpose decides whether a passenger can be billed at all. Mark someone entertainment and the estimate says so.',
    ],
    aside: 'Non-business carriage is routed to SIFL imputed income, not to the cost centre.',
  },
  {
    id: 'quote',
    title: 'The cost estimate',
    route: '/booking-portal/requests/new',
    anchor: 'quote-panel',
    body: [
      'Flight time at the published rate, plus repositioning — the deadhead legs needed to get an aircraft to you and home again, billed to the trip that caused them.',
      'Showing repositioning as its own line rather than folding it into the hourly rate is deliberate: it is a real cost the requesting cost centre bears, and it is the one an EA can actually help reduce.',
    ],
  },
  {
    id: 'ceiling',
    title: 'The regulatory ceiling',
    route: '/booking-portal/requests/new',
    anchor: 'quote-ceiling',
    body: [
      'An internal chargeback is permitted by 14 CFR 91.501(b)(5), which caps it at the cost of owning, operating and maintaining the airplane. The bar shows how much of that cap this quote uses.',
      'The rule caps the top and sets no floor. Charging less — down to nothing — is unconstrained by it. That asymmetry is why every lever in this design is a credit and none of them is a surcharge.',
    ],
    aside: 'Whether the cap is tested per flight or in aggregate is an open question with counsel.',
  },
  {
    id: 'savings',
    title: 'How to lower this',
    route: '/booking-portal/requests/new',
    anchor: 'quote-savings',
    body: [
      'Credits the request has not earned yet, largest first, each with what would earn it.',
      'Every one of them is something that costs the flight department little or nothing: booking earlier makes crew and maintenance planning possible, flex lets two trips share an aircraft, and a shared deadhead was flying anyway. Cheaper for the cost centre, free for the department.',
    ],
    aside: 'This is the demand-shaping surface — it moves behaviour without a price ever moving upward.',
  },
  {
    id: 'cancel',
    title: 'If you cancel',
    route: '/booking-portal/requests/new',
    anchor: 'quote-cancel',
    body: [
      'Cancelling far out costs nothing. Cancelling inside three days costs most of the quote.',
      'A cancelled trip is an aircraft and a crew held for nobody, and it is too late to give the slot to someone else. The ladder makes early commitment the cheap option and late changes the expensive one — which is the whole planning problem, stated as a price.',
    ],
  },
  {
    id: 'submitted',
    title: 'After submitting',
    route: '/booking-portal/requests',
    body: [
      'The request joins the EA’s list and a thread opens with scheduling. Rejections, questions and post-lockout changes all live in that thread, so nothing about a trip is decided in email.',
      'The estimate travels with it. If scheduling changes the aircraft or the routing, the number changes and the EA sees why.',
    ],
  },
  {
    id: 'queue',
    title: 'The scheduling side — and what money cannot buy',
    route: '/booking-portal/queue',
    body: [
      'Scheduling clears a ranked queue at a published time. Ranking is org tier, then request time. Requestors see the decision time, never their position.',
      'Price plays no part in it. A credit can make a trip cheaper; it can never move a request up the queue or take a contended date from a higher tier. Allocation stays a scheduling decision, which is where it was ruled to belong.',
    ],
    aside: 'Letting price override tier would turn a pricing feature into an authority change.',
  },
  {
    id: 'seats',
    title: 'The cheapest capacity in the building',
    route: '/booking-portal/seats',
    body: [
      'Seats on trips that are already flying. A ride-along adds no flight hours, no crew duty and no fuel worth speaking of.',
      'Along with shared repositioning, this is capacity the department currently gives away unpriced. Filling it improves utilization without needing anyone to fly more because something got cheaper.',
    ],
  },
  {
    id: 'costmodel',
    title: 'Underneath the rate card',
    route: '/booking-portal/cost-model',
    anchor: 'cost-provenance',
    body: [
      'Everything so far took the $10,000 hourly rate as given. This page asks where that number comes from — and it opens by separating what is actually known from what is a guess, because the guess carries the argument.',
      'The framing matters more than any figure on it: these aircraft do not exist to make money, they exist to get used. A chargeback moves a dollar between two P&G cost centres and changes nothing at company level.',
    ],
    aside: 'Proof of concept. Nothing here is GFO’s accounting.',
  },
  {
    id: 'realcost',
    title: 'What an hour actually costs',
    route: '/booking-portal/cost-model',
    anchor: 'cost-headline',
    body: [
      'If most of the budget is fixed — aircraft, staff, hangar, paid whether anything flies — then one more flight hour costs the company far less than the rate charged for it.',
      'At the default guess a requestor is asked for about two and a half times what flying actually costs. That is not a revenue policy; it is a deterrent, applied to the one activity the department exists to perform.',
    ],
  },
  {
    id: 'idle',
    title: 'What an idle fleet costs',
    route: '/booking-portal/cost-model',
    anchor: 'cost-idle',
    body: [
      'Drag the demand shortfall and watch cost per hour delivered climb. Flying did not get more expensive — the same committed bill is spread across fewer trips.',
      'This is the number to put in front of a VP, rather than block hours: an owned asset sitting still is money already spent that bought nothing.',
    ],
  },
  {
    id: 'sensitivity',
    title: 'Does it hold if the guess is wrong?',
    route: '/booking-portal/cost-model',
    anchor: 'cost-sensitivity',
    body: [
      'The one question a proof of concept has to answer. The same calculation is run across every plausible fixed share, so you can see where the argument turns rather than being asked to trust it.',
      'Above roughly two-thirds fixed, the rate is a genuine deterrent and there is something worth fixing. Below it, the rate is close to cost-reflective and there is nothing to remove — at half fixed, the rate IS cost.',
    ],
    aside: 'Drag "fixed share of cost" on the left and watch the whole page move with it.',
  },
  {
    id: 'wrap',
    title: 'What this demonstrates, and what is still open',
    route: '/booking-portal',
    body: [
      'A chargeback that a requestor can see, understand and act on — itemised, capped by the regulation, and reduced only by behaviour that costs the department nothing.',
      'What is genuinely unresolved is short. What is the real fixed share of cost — that decides whether any of this is worth pursuing. Is the set half of the budget defended when corporate cuts travel. And has anyone at GFO ever actually declined a trip because of the rate, which is the cheapest possible test of whether price changes behaviour here at all.',
      'Three answers, none of which needs software, and this stops being a proof of concept.',
    ],
    aside: 'Reasoning: docs/CHARGEBACK_DEMAND_MODEL.md in the Tech Log repo.',
  },
];

function useSpotlight(anchor: string | undefined, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active || !anchor) { setRect(null); return; }
    let raf = 0;
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
      if (!el) { raf = requestAnimationFrame(find); return; }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const measure = () => setRect(el.getBoundingClientRect());
      measure();
      const t = window.setTimeout(measure, 350);
      window.addEventListener('scroll', measure, true);
      window.addEventListener('resize', measure);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('scroll', measure, true);
        window.removeEventListener('resize', measure);
      };
    };
    const cleanup = find();
    return () => { cancelAnimationFrame(raf); cleanup?.(); };
  }, [anchor, active]);

  return rect;
}

// The step index lives in the URL, not in component state, and that is load-bearing:
// DemoTour renders inside PortalShell, which remounts on every route change, so a
// useState index is destroyed the moment the tour navigates. Keeping it in the query
// string also makes any step linkable — /booking-portal?tour=1&step=7.
export function DemoTour({ steps = BOOKING_TOUR }: { steps?: TourStep[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const running = params.get('tour') === '1';
  const i = Math.max(0, Math.min(steps.length - 1, Number(params.get('step') ?? '0') || 0));
  const step = steps[i];
  const rect = useSpotlight(step?.anchor, running);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, next));
      const target = steps[clamped]?.route ?? location.pathname;
      navigate(`${target}?tour=1&step=${clamped}`);
    },
    [steps, navigate, location.pathname],
  );

  const stop = useCallback(() => {
    navigate(location.pathname, { replace: true });
  }, [navigate, location.pathname]);

  // A step lives in the URL, so a link like ?tour=1&step=13 has to land on that
  // step's PAGE too — not just show its narration over whatever page you were on.
  // Without this the deep link renders the right text against the wrong screen and
  // the spotlight has nothing to point at.
  useEffect(() => {
    if (!running) return;
    const want = step?.route;
    if (want && want !== location.pathname) {
      navigate(`${want}?tour=1&step=${i}`, { replace: true });
    }
  }, [running, step, i, location.pathname, navigate]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
      if (e.key === 'ArrowRight') go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, i, go, stop]);

  if (!running) {
    return (
      <Button
        variant="outline"
        size="sm"
        data-tour="start-button"
        onClick={() => navigate('/booking-portal?tour=1&step=0')}
      >
        <PlayCircle className="mr-1.5 h-4 w-4" />
        Guided walkthrough
      </Button>
    );
  }

  const last = i === steps.length - 1;

  // Put the panel on the opposite side from whatever it is pointing at. Without this
  // the panel sits on top of the section it is narrating — which was exactly the case
  // for the cost-estimate steps, since that card lives in the right-hand column.
  const onLeft = rect ? rect.left + rect.width / 2 > window.innerWidth / 2 : false;

  return (
    <>
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-lg ring-2 ring-[var(--gfo-daylight,#0096FC)] ring-offset-2 ring-offset-background transition-all duration-300"
          style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
        />
      )}

      <div
        role="dialog"
        aria-label="Guided walkthrough"
        className={cn(
          'fixed z-[61] border bg-card shadow-lg transition-[left,right] duration-300',
          'inset-x-0 bottom-0 rounded-t-xl sm:inset-x-auto sm:bottom-5 sm:w-[380px] sm:rounded-lg',
          onLeft ? 'sm:left-5' : 'sm:right-5',
        )}
      >
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <span className="gfo-eyebrow text-muted-foreground">
            Step {i + 1} of {steps.length}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="hidden h-1 w-24 overflow-hidden rounded-sm bg-muted sm:block">
              <div
                className="h-full bg-[var(--gfo-daylight,#0096FC)] transition-all"
                style={{ width: `${((i + 1) / steps.length) * 100}%` }}
              />
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={stop} aria-label="Exit walkthrough">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[46vh] space-y-2.5 overflow-y-auto px-4 py-3.5">
          <h2 className="text-base font-semibold tracking-tight">{step.title}</h2>
          {step.body.map((para) => (
            <p key={para.slice(0, 24)} className="text-sm leading-relaxed text-muted-foreground">{para}</p>
          ))}
          {step.aside && (
            <p className="border-l-2 border-[var(--gfo-sunrise,#D1AC6B)] pl-2.5 text-xs text-muted-foreground">
              {step.aside}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t px-4 py-2.5">
          <Button variant="ghost" size="sm" onClick={() => go(i - 1)} disabled={i === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button size="sm" className="ml-auto" onClick={() => (last ? stop() : go(i + 1))}>
            {last ? 'Finish' : 'Next'}
            {!last && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
