import { RULES } from './rules.js';

// Decide a claim by running every rule and collecting the red flags.
//
// Pure: same (claim, ctx) -> same decision, every time.
//
// INVARIANT: decision is 'APPROVED' or 'HELD'. Never 'DENIED'. A held claim
// goes to a human reviewer with a reason; the platform never auto-rejects and
// never carries risk. That is the whole trust proposition.
//
//   decideClaim(claim, ctx) -> {
//     decision:   'APPROVED' | 'HELD',
//     triggered:  [ruleResult, ...]   // only the flags that fired, geo first
//     reasons:    [string, ...]       // their plain-language reasons
//     leadReason: string | null       // headline reason for the SMS (geo wins)
//     evaluated:  [ruleResult, ...]   // every rule result, for the dashboard/audit
//   }
export function decideClaim(claim, ctx) {
  const evaluated = RULES.map((rule) => rule(claim, ctx));
  const triggered = evaluated.filter((r) => r.triggered);
  return {
    decision: triggered.length === 0 ? 'APPROVED' : 'HELD',
    triggered,
    reasons: triggered.map((r) => r.reason),
    leadReason: triggered.length ? triggered[0].reason : null,
    evaluated,
  };
}
