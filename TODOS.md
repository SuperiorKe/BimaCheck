# TODOS

Deferred work captured during /plan-eng-review (2026-06-01). Not in scope for the hackathon build; tracked for after.

## 1. Runtime RSA SecurityCredential generator (production B2C)
- **What:** Generate the Daraja B2C `SecurityCredential` at startup by RSA-encrypting the initiator password against Safaricom's public certificate, instead of the hardcoded sandbox value.
- **Why:** The hardcoded sandbox credential does not work in production. Real B2C disbursement requires the encrypted credential built from the prod cert.
- **Pros:** Unblocks real money movement; correct production path.
- **Cons:** Crypto + cert handling; classic footgun (wrong cert = opaque failures). Zero value in sandbox.
- **Context:** For the hackathon we hardcode the sandbox test `SecurityCredential` in `.env` (see BUILD_PLAN.md). Start in `src/mpesa.js`: add a `buildSecurityCredential()` that reads `DARAJA_INITIATOR_PASSWORD` + the prod cert path and RSA-encrypts (Node `crypto.publicEncrypt`).
- **Depends on:** A licensed/production Daraja account + initiator credentials.

## 2. Approach C extras — 4th rule + AT Voice callback
- **What:** (a) Add an `amountVelocity` rule (claim count/amount thresholds per member/window). (b) Add an AT Voice callback that reads the decision aloud to a feature-phone user.
- **Why:** A 4th rule deepens the fraud-detection story; a Voice callback uses more Africa's Talking rails and strengthens the inclusion/accessibility angle.
- **Pros:** First things to reach for if ahead of schedule on the day; natural v2.
- **Cons:** Stretch; not on the 90-second demo path.
- **Context:** `amountVelocity` slots into the existing ordered rule array in `src/engine/rules.js` (same `(claim, ctx) => {name, triggered, reason, confidence}` interface). Voice is a separate AT integration; keep it out of the core until USSD -> decide -> SMS -> B2C is solid.
- **Depends on:** Core demo path complete first.
