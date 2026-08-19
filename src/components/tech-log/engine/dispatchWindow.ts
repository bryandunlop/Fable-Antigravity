/**
 * ONE boundary before ETD, shared by everything that has one (Bryan, 2026-08-19).
 *
 * Three separate clocks had grown up independently — the home-base fuel-farm lock at 4h, the
 * prep/day-of pane switch at 12h, and (before it was deleted) a dead phase helper at 24h. Three
 * numbers meant three different answers to "when does this flight stop being planning and start
 * being a departure", none of them the operator's.
 *
 * T-4h is the real one, because it is the only one with an operational consequence already built:
 * past it the fuel farm will not take a request. Aligning the pane switch to it makes the two panes
 * mean something concrete rather than something arbitrary —
 *
 *   PREP    (> T-4h)  everything is still actionable, including fuel. The matrix is the instrument.
 *   DAY-OF  (<= T-4h) the last reversible thing has closed. The countdown is the instrument.
 *
 * This replaced a 12h guess whose stated justification was that day-of should surface the fuel lock
 * while it could still be acted on. That was backwards: fuel is PREP work, it belongs in the prep
 * matrix (which shows its lock time in the cell), and a day-of queue whose most urgent item for
 * eight hours is a prep task is a queue about the wrong thing.
 *
 * Sites read this constant BY NAME rather than sharing one symbol outright, so if a ruling ever
 * moves one of them — the Chief Pilot could reasonably set a different pane switch than the fuel
 * farm's lock — that divergence is a one-line change at the site, and visible.
 */
export const T_MINUS_COMMIT_HOURS = 4;
