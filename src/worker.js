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
import { getClaim, buildCtx, setDecision } from './db.js';
import { decideClaim } from './engine/index.js';
import { heldMessage, sendSms } from './sms.js';
import { requestPayout } from './mpesa.js';

export async function processClaim(claimId) {
  const claim = getClaim(claimId);
  if (!claim) return;

  const result = decideClaim(claim, buildCtx(claim));
  setDecision(claimId, result.decision, result.leadReason);

  if (result.decision === 'HELD') {
    await sendSms(claim.member, heldMessage(getClaim(claimId)));
    return;
  }

  // APPROVED — request the B2C payout. Confirmation (PAID + approved SMS) happens
  // via the Daraja result callback or the 8s fallback; both are single-shot.
  await requestPayout(getClaim(claimId));
}
