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

## 3. Payout confirmation integrity (the fallback can lie)
- **What:** The 8s fallback in `requestPayout` (`src/mpesa.js`) marks a claim `PAID` and sends the "approved" SMS even when Daraja has not confirmed the transfer. The synchronous `ResponseCode 0` only means "queued". If a failure `/b2c/result` arrives after the fallback, `b2cResult` sets `mpesaStatus=FAILED` while `status` stays `PAID` (a contradiction), and the member already got an approval SMS for a payout that failed.
- **Why:** Fine for the sandbox demo (where the callback is the unreliable part), but a real risk once real money moves. Found during the go-live verification on 2026-06-14: the sandbox never delivered the result callback, so every payout was confirmed only by the fallback.
- **Options:** add a distinct `UNCONFIRMED`/`ASSUMED` state separate from `PAID`; hold the "approved" SMS until a real `ResultCode 0`; or reduce reliance on the fallback. Pairs with item 1 (production credential) before any real-money use.
- **Also unverified:** `DARAJA_SHORTCODE=6000996` (sandbox is usually `600996`) and `DARAJA_INITIATOR_NAME=BimaCheck` (sandbox is usually `testapi`) — only a delivered callback would confirm them.
- **Context:** Full deployment + findings are in `docs/DEPLOYMENT.md`.
