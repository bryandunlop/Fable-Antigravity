// What each myairops operation DOES to vendor state, and whether we are allowed to call it.
//
// The working agreement's rule is "myGFO never writes to myairops". That rule is currently
// enforced by the absence of any write code — which holds exactly as long as nobody writes
// any. The booking portal and passenger app will need writes (a seat booking IS a write),
// so the rule has to become something a call site can be checked against rather than a
// convention that erodes.
//
// Hence: every myairops call is classified by effect, and a call that mutates vendor state
// is refused unless the policy explicitly grants that surface. Default policy grants
// nothing. Turning a grant on is a code change in a reviewed file, not a config toggle and
// not an accident.
//
// The same classifier backs docs/vendor/myairops-capability-matrix.md
// (scripts/myairops-capability-matrix.ts) so the document and the runtime cannot disagree.

/** The vendor APIs. `attachments` and `schedule` are published but unspecced — see the matrix. */
export type MyairopsSurface = 'booking' | 'crm' | 'maintenance' | 'attachments' | 'schedule';

export type Effect =
  | 'read'
  | 'compute'        // POST that returns a calculation and persists nothing
  | 'create'
  | 'update'
  | 'delete'
  | 'soft-delete'    // reversible: has a matching /restore
  | 'restore'
  | 'transition'     // moves an entity along a status ladder
  | 'link'
  | 'unlink'
  | 'unclassified';

/** Effects that leave vendor state unchanged. Everything else is a mutation. */
export const NON_MUTATING: ReadonlySet<Effect> = new Set<Effect>(['read', 'compute']);

/**
 * Operations whose HTTP method misrepresents their effect. Keyed `METHOD path`.
 * Only for cases confirmed against the vendor's own summary text — never a guess, because
 * a wrong entry here turns a write into something the guard waves through.
 */
const EFFECT_OVERRIDES: Readonly<Record<string, Effect>> = {
  // Returns a flight-time estimate for a route. POST because the request carries a body,
  // not because it writes: nothing is persisted. The one Booking-API POST that is safe
  // under a read-only credential.
  'POST /api/FlightTimes/calculate': 'compute',
};

/** Classifies one operation by HTTP method and path shape. Pure. */
export function classifyEffect(method: string, path: string): Effect {
  const m = method.toUpperCase();
  const override = EFFECT_OVERRIDES[`${m} ${path}`];
  if (override) return override;

  switch (m) {
    case 'GET':
      return 'read';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return /\/link\//.test(path) ? 'unlink' : 'delete';
    case 'POST':
      if (/\/softdelete$/i.test(path)) return 'soft-delete';
      if (/\/restore$/i.test(path)) return 'restore';
      if (/\/(markas|markin)[a-z]*$/i.test(path)) return 'transition';
      if (/\/(booking|cancellation|release|cancelRelease)$/i.test(path)) return 'transition';
      if (/\/link\//.test(path)) return 'link';
      return 'create';
    default:
      return 'unclassified';
  }
}

export function isMutating(effect: Effect): boolean {
  // `unclassified` is treated as mutating on purpose: an operation we could not classify
  // is one we do not understand, and the safe reading of "don't know" is "don't call it".
  return !NON_MUTATING.has(effect);
}

/**
 * Which mutating effects, on which surface, this deployment is permitted to perform.
 *
 * A grant is deliberately narrow — surface AND effect — so that (say) enabling seat
 * booking on the Booking API does not also enable deleting trips or editing CRM records.
 */
export interface MyairopsWriteGrant {
  surface: MyairopsSurface;
  effects: readonly Effect[];
  /** Why this grant exists. Required: an unexplained write grant is the thing we're guarding against. */
  justification: string;
}

export interface MyairopsPolicy {
  readonly grants: readonly MyairopsWriteGrant[];
}

/**
 * The current policy: pull-only. myGFO reads myairops and writes nothing.
 *
 * To add a write path you add a grant here, and that diff is the record of the decision.
 * Do not add one without the corresponding entry in docs/vendor/myairops-integration-asks.md
 * and a confirmed vendor-side scope — a grant here does not make the credential work; it
 * only stops this guard from refusing the call.
 */
export const PULL_ONLY_POLICY: MyairopsPolicy = { grants: [] };

export class MyairopsWriteRefused extends Error {
  constructor(
    readonly surface: MyairopsSurface,
    readonly method: string,
    readonly path: string,
    readonly effect: Effect,
  ) {
    super(
      `myairops write refused: ${method} ${path} on '${surface}' has effect '${effect}' ` +
        `and no policy grant permits it. myGFO is pull-only; see src/integration/myairops/capability.ts.`,
    );
    this.name = 'MyairopsWriteRefused';
  }
}

/**
 * Throws unless the call is non-mutating or explicitly granted.
 *
 * Call this in the transport layer — one chokepoint above the HTTP client — so the check
 * cannot be forgotten per-call-site.
 */
export function assertMyairopsCallAllowed(
  surface: MyairopsSurface,
  method: string,
  path: string,
  policy: MyairopsPolicy = PULL_ONLY_POLICY,
): void {
  const effect = classifyEffect(method, path);
  if (!isMutating(effect)) return;

  const granted = policy.grants.some(g => g.surface === surface && g.effects.includes(effect));
  if (!granted) throw new MyairopsWriteRefused(surface, method, path, effect);
}
