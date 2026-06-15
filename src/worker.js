// Decision worker: the queue handler. Runs the pure engine over a claim, records
// the decision, and notifies the member.
//
//   PENDING --decideClaim--> HELD  -> held SMS (reason), stop
//                        \-> APPROVED -> payout -> approved SMS
//
// NOTE: the APPROVED branch hands off to requestPayout. In dry-run (no Daraja
// creds) that confirms immediately, so USSD -> decide -> SMS stays a complete,
// un-failable demo. In live mode a real ResultCode 0 callback confirms PAID,
// while the 8s fallback only marks the payout ASSUMED (sent, unconfirmed). The
// single-shot guards in db.js keep every path consistent.
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
