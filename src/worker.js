// Decision worker: the queue handler. Runs the pure engine over a claim, records
// the decision, and notifies the member.
//
//   PENDING --decideClaim--> HELD  -> held SMS (reason), stop
//                        \-> APPROVED -> payout -> approved SMS
//
// NOTE: in this core layer the APPROVED branch marks the claim PAID and sends the
// approved SMS directly (no Daraja yet) — that makes USSD -> decide -> SMS a
// complete, un-failable demo. The payments layer will replace the marked-here
// section with a Daraja B2C request whose result callback (or 8s fallback) calls
// markPaid(); the single-shot guard already makes that safe.
import { getClaim, buildCtx, setDecision, markPaid } from './db.js';
import { decideClaim } from './engine/index.js';
import { approvedMessage, heldMessage, sendSms } from './sms.js';

export async function processClaim(claimId) {
  const claim = getClaim(claimId);
  if (!claim) return;

  const result = decideClaim(claim, buildCtx(claim));
  setDecision(claimId, result.decision, result.leadReason);

  if (result.decision === 'HELD') {
    await sendSms(claim.member, heldMessage(getClaim(claimId)));
    return;
  }

  // APPROVED — payout placeholder (replaced by Daraja B2C in the payments layer).
  if (markPaid(claimId)) {
    await sendSms(claim.member, approvedMessage(getClaim(claimId)));
  }
}
