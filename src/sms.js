// Africa's Talking SMS client + the two message templates (single source).
// Dry-run when no API key is set: logs instead of sending, so the whole
// pipeline is testable and demoable offline before credentials are wired.
import { config } from './config.js';

export function approvedMessage(claim) {
  return `BimaCheck: Claim #${claim.id} APPROVED. KES ${config.benefitKes} paid to your M-Pesa. Admission confirmed, no anomalies.`;
}

// Sent when the B2C payout was dispatched but Daraja has not yet confirmed it
// (the 8s fallback path). Honest: the payout is on the way, not yet landed.
export function initiatedMessage(claim) {
  return `BimaCheck: Claim #${claim.id} APPROVED. Payout of KES ${config.benefitKes} sent to your M-Pesa, awaiting confirmation. You will get an M-Pesa SMS when it arrives.`;
}

export function heldMessage(claim) {
  return `BimaCheck: Claim #${claim.id} received and UNDER REVIEW. Reason: ${claim.reason}`;
}

export async function sendSms(to, message) {
  if (!config.at.apiKey) {
    console.log(`[sms:dry-run] -> ${to}: ${message}`);
    return { dryRun: true, to, message };
  }
  const res = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: config.at.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      username: config.at.username,
      to,
      message,
      ...(config.at.shortcode ? { from: config.at.shortcode } : {}),
    }),
  });
  return res.json();
}
