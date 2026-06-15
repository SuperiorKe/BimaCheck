// M-Pesa Daraja B2C disbursement. This pays money TO the member, not STK push,
// which only collects. The result is asynchronous: Daraja calls /b2c/result
// later. Sandbox callbacks fail often, so we arm an 8s fallback.
//
// Confirmation stays honest about what is actually known:
//   real Daraja ResultCode 0   -> confirmPayout(): claim PAID, "paid" SMS.
//   8s fallback (no callback)   -> assumePayout(): payout ASSUMED (sent,
//                                  unconfirmed), "on the way" SMS, never PAID.
//   failure / timeout callback  -> markFailed(): payout FAILED, never PAID.
// markPaid(), markAssumed(), and markFailed() are single-shot guards, so a late
// callback cannot pay or notify twice, and cannot contradict a confirmed payout.
//
// No credentials configured means dry-run: confirm immediately so offline dev
// and the no-Daraja stage demo stay snappy and never block.
import {
  getClaim,
  markPaid,
  markAssumed,
  markFailed,
  setMpesaStatus,
  linkConversation,
  getClaimIdByConversation,
} from './db.js';
import { approvedMessage, initiatedMessage, sendSms } from './sms.js';
import { config } from './config.js';

const DARAJA_BASE = 'https://sandbox.safaricom.co.ke';

// Daraja B2C PartyB must be a bare MSISDN (2547XXXXXXXX). Africa's Talking sends
// the member as +254..., so strip the leading + (and any stray non-digits)
// before it reaches Safaricom, or the request is rejected with "Invalid PartyB".
// Mirrors normPhone() in engine/rules.js.
const toMsisdn = (m) => String(m || '').replace(/\D/g, '');

// Confirm a payout exactly once. Returns true only for the call that actually
// transitioned the claim to PAID (and therefore sent the approved SMS). Called
// by a real Daraja ResultCode 0 callback, and by the dry-run path.
export async function confirmPayout(claimId) {
  if (!markPaid(claimId)) return false; // already PAID, ignore the duplicate
  const claim = getClaim(claimId);
  await sendSms(claim.member, approvedMessage(claim));
  return true;
}

// Live fallback path: the 8s timer fired without a Daraja result callback yet.
// Record the payout as ASSUMED (sent, unconfirmed) and tell the member it is on
// the way. Never claim it was paid. A later result callback reconciles this to
// PAID (success) or FAILED (failure).
export async function assumePayout(claimId) {
  if (!markAssumed(claimId)) return false; // already confirmed, or already assumed
  const claim = getClaim(claimId);
  await sendSms(claim.member, initiatedMessage(claim));
  return true;
}

// Real Daraja transport: OAuth, then B2C payment request. Injectable for tests.
export async function darajaTransport(claim) {
  const basic = Buffer.from(`${config.daraja.key}:${config.daraja.secret}`).toString('base64');
  const tokenRes = await fetch(
    `${DARAJA_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${basic}` } }
  );
  const { access_token } = await tokenRes.json();
  const res = await fetch(`${DARAJA_BASE}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      InitiatorName: config.daraja.initiator,
      SecurityCredential: config.daraja.securityCredential,
      CommandID: 'BusinessPayment',
      Amount: config.benefitKes,
      PartyA: config.daraja.shortcode,
      PartyB: toMsisdn(claim.member),
      Remarks: `BimaCheck hospi-cash claim ${claim.id}`,
      QueueTimeOutURL: `${config.daraja.callbackBase}/b2c/timeout`,
      ResultURL: `${config.daraja.callbackBase}/b2c/result`,
      Occasion: `claim-${claim.id}`,
    }),
  });
  return res.json();
}

// Dispatch a B2C payout and arm the fallback. Returns the fallback timer (or
// undefined in dry-run). Confirmation happens later via /b2c/result; if no
// callback lands within fallbackMs, the timer marks the payout ASSUMED.
export async function requestPayout(claim, opts = {}) {
  const { transport = darajaTransport, fallbackMs = 8000 } = opts;
  setMpesaStatus(claim.id, 'REQUESTED');

  if (!config.daraja.key) {
    await confirmPayout(claim.id); // dry-run: no creds, confirm now
    return undefined;
  }

  try {
    const ack = await transport(claim);
    if (ack?.ConversationID) linkConversation(claim.id, ack.ConversationID);
    console.log(`[mpesa] B2C requested for claim ${claim.id}:`, ack?.ResponseCode ?? ack);
  } catch (err) {
    console.error(`[mpesa] B2C request failed for claim ${claim.id}:`, err.message);
  }

  const timer = setTimeout(() => {
    assumePayout(claim.id).catch(() => {});
  }, fallbackMs);
  if (timer.unref) timer.unref();
  return timer;
}

// POST /b2c/result: Daraja result callback. Ack immediately, then confirm or fail.
export async function b2cResult(req, res) {
  const result = req.body?.Result || {};
  res.json({ ResultCode: 0, ResultDesc: 'received' });

  const claimId = getClaimIdByConversation(result.ConversationID);
  if (claimId == null) {
    console.error('[mpesa] result for unknown ConversationID:', result.ConversationID);
    return;
  }
  if (Number(result.ResultCode) === 0) {
    await confirmPayout(claimId);
  } else {
    markFailed(claimId);
    console.error(`[mpesa] B2C failed for claim ${claimId}:`, result.ResultDesc);
  }
}

// POST /b2c/timeout: Daraja queue timeout callback.
export function b2cTimeout(req, res) {
  console.error('[mpesa] B2C queue timeout:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'received' });
}
