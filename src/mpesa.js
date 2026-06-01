// M-Pesa Daraja B2C disbursement (pays money TO the member — NOT STK push,
// which only collects). The result is asynchronous: Daraja calls /b2c/result
// later. Sandbox callbacks fail often, so we also arm an 8s fallback. BOTH the
// callback and the fallback route through confirmPayout(), whose single-shot
// markPaid guard guarantees the approved SMS fires at most once even if a late
// callback lands after the fallback already ran.
//
// No credentials configured => dry-run: confirm immediately so offline dev and
// the no-Daraja demo stay snappy and never block.
import {
  getClaim,
  markPaid,
  setMpesaStatus,
  linkConversation,
  getClaimIdByConversation,
} from './db.js';
import { approvedMessage, sendSms } from './sms.js';
import { config } from './config.js';

const DARAJA_BASE = 'https://sandbox.safaricom.co.ke';

// Confirm a payout exactly once. Returns true only for the call that actually
// transitioned the claim to PAID (and therefore sent the approved SMS).
export async function confirmPayout(claimId) {
  if (!markPaid(claimId)) return false; // already PAID — ignore the duplicate
  const claim = getClaim(claimId);
  await sendSms(claim.member, approvedMessage(claim));
  return true;
}

// Real Daraja transport: OAuth, then B2C payment request. Injectable for tests.
async function darajaTransport(claim) {
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
      PartyB: claim.member,
      Remarks: `BimaCheck hospi-cash claim ${claim.id}`,
      QueueTimeOutURL: `${config.daraja.callbackBase}/b2c/timeout`,
      ResultURL: `${config.daraja.callbackBase}/b2c/result`,
      Occasion: `claim-${claim.id}`,
    }),
  });
  return res.json();
}

// Dispatch a B2C payout and arm the fallback. Returns the fallback timer (or
// undefined in dry-run). Confirmation happens later via /b2c/result or the timer.
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
    confirmPayout(claim.id).catch(() => {});
  }, fallbackMs);
  if (timer.unref) timer.unref();
  return timer;
}

// POST /b2c/result — Daraja result callback. Ack immediately, then confirm/fail.
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
    setMpesaStatus(claimId, 'FAILED');
    console.error(`[mpesa] B2C failed for claim ${claimId}:`, result.ResultDesc);
  }
}

// POST /b2c/timeout — Daraja queue timeout callback.
export function b2cTimeout(req, res) {
  console.error('[mpesa] B2C queue timeout:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'received' });
}
