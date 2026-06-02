---
name: go-live
description: Wire BimaCheck from offline dry-run to live Africa's Talking + M-Pesa Daraja, and verify one real B2C payout before a demo. Walks .env setup, ngrok/public callback, confirms the server sees credentials (not dry-run), fires a real claim, and watches for the /b2c/result callback or the 8s fallback. Use when taking the app live for the hackathon or any real-credential test.
---

# /go-live — wire credentials and verify a real payout

Take BimaCheck from offline dry-run to live Africa's Talking (USSD + SMS) and M-Pesa Daraja (B2C disbursement), then prove one real payout end-to-end before the demo.

The whole flow already works offline (SMS logs, B2C confirms immediately). Going live means: real keys in `.env`, a public HTTPS URL for Daraja callbacks, and one verified real B2C transfer.

## What "live" actually requires

Two independent integrations, either can be live or dry-run on its own:

- **SMS (Africa's Talking):** dry-runs (logs to console) when `AT_API_KEY` is empty. Set the key to send real SMS.
- **B2C payout (Daraja):** dry-runs (calls `confirmPayout` immediately) when `DARAJA_CONSUMER_KEY` is empty. Set the keys to make a real transfer.

The decision engine, queue, and USSD handler are identical in both modes. Going live changes only the SMS and payout edges.

## Steps

### 1. Populate .env

`cp .env.example .env` if it doesn't exist, then fill in (leave a key blank to keep that edge in dry-run):

```
# Africa's Talking
AT_USERNAME=sandbox
AT_API_KEY=<sandbox API key>
AT_SHORTCODE=                       # blank is fine for sandbox

# M-Pesa Daraja (sandbox)
DARAJA_CONSUMER_KEY=<app consumer key>
DARAJA_CONSUMER_SECRET=<app consumer secret>
DARAJA_SHORTCODE=600996             # sandbox B2C test shortcode
DARAJA_INITIATOR_NAME=testapi
DARAJA_SECURITY_CREDENTIAL=<sandbox-provided encrypted credential string>
PUBLIC_CALLBACK_BASE=<public HTTPS base, e.g. https://xxxx.ngrok-free.app or a cloud box>
```

Config is loaded at startup via `process.loadEnvFile()` in `src/config.js`, so **any .env change needs a server restart** to take effect.

### 2. Stand up a public HTTPS callback URL

Daraja calls `PUBLIC_CALLBACK_BASE/b2c/result` and `/b2c/timeout` asynchronously, so the box must be reachable from Safaricom.

- **Sandbox:** ngrok works. Run `ngrok http 3000` and use the `https://...ngrok-free.app` URL.
- **Production:** Safaricom blocks ngrok. Use a pre-provisioned HTTPS host (Render/Railway/Fly) per the README day-of checklist.

The USSD webhook (`/ussd`) also needs to be reachable by AT — point AT's USSD callback at `PUBLIC_CALLBACK_BASE/ussd`.

### 3. Restart and confirm the server is NOT in dry-run

After editing `.env`, restart (`Ctrl+C` then `npm start`; if the port is stuck, `npx kill-port 3000` first — see CLAUDE.md). Then confirm the server actually picked up the credentials. Watch the startup logs and the behavior of the next claim:

- If `AT_API_KEY` is set, SMS sends hit the AT API instead of logging `[sms:dry-run]`.
- If `DARAJA_CONSUMER_KEY` is set, a payout logs `[mpesa] B2C requested for claim N:` (with a `ResponseCode`) instead of confirming instantly.

A quick way to tell which mode each edge is in: file one claim and read the console. `[sms:dry-run]` means SMS is still offline; an immediate `confirmPayout` with no `[mpesa] B2C requested` line means Daraja is still offline.

### 4. Use a Daraja sandbox test MSISDN as the recipient

In sandbox, an arbitrary real phone number will **not** receive a B2C payment. Use a Safaricom-provided sandbox test MSISDN as the demo recipient (the member's `phoneNumber` on the claim). This is the single most common reason a "live" demo silently fails to pay.

### 5. Fire one real claim and verify the payout

File a clean claim that will APPROVE (seed member at a facility they have an admission for):

```bash
curl -s -X POST http://localhost:3000/ussd --data "text=1*1&phoneNumber=%2B254708374149"
```

Then watch for the payout to confirm. Two paths can confirm it (whichever lands first):

- **`/b2c/result` callback** from Daraja -> `confirmPayout` -> claim `PAID`. Sandbox callbacks fail often.
- **8s fallback timer** in `requestPayout` -> `confirmPayout` -> claim `PAID`. This is the safety net when the callback never arrives.

The single-shot `markPaid` guard means whichever fires first wins and the second is a no-op (no double SMS, no implied double payout).

Verify the claim reached `PAID`:

```bash
curl -s http://localhost:3000/api/claims
```

The member-visible signal that money actually moved is the **M-Pesa "received" SMS** that Safaricom sends independently of our app. In sandbox that may not arrive; trust the `PAID` state + the `[mpesa] B2C requested` log + a `ResultCode 0` on the callback.

### 6. Report go-live status

Tell the user which edges are live vs dry-run, whether the public callback URL is reachable, and whether the verified claim reached `PAID`:

- SMS: live / dry-run
- Daraja B2C: live / dry-run
- Callback URL: `<url>` reachable? (Daraja logged a result, or only the fallback fired)
- Verified payout: claim N reached `PAID` via callback / fallback

## Failure playbook

- **Claim sits at `APPROVED`, never `PAID`** -> payout dispatched but neither callback nor fallback confirmed. Check `[mpesa]` logs for an error; confirm `PUBLIC_CALLBACK_BASE` is reachable; the 8s fallback should still catch it, so a permanent `APPROVED` means `confirmPayout` is erroring.
- **`Unexpected token '<'` in Daraja logs** -> the sandbox returned an HTML error page instead of JSON, usually bad/missing credentials or wrong shortcode. Recheck `DARAJA_CONSUMER_KEY/SECRET` and `DARAJA_SECURITY_CREDENTIAL`.
- **No SMS received but logs show a send** -> sandbox SMS only delivers to numbers registered in the AT sandbox simulator. Use a registered test number.
- **No payment received but claim is `PAID`** -> expected in sandbox with an arbitrary recipient; use a Daraja sandbox test MSISDN (step 4).
- **USSD session dies** -> the `/ussd` handler must return within ~10s. It does no Daraja/SMS I/O by design (that runs in the background worker), so a slow USSD response means something is doing I/O on the request path that shouldn't be.

## Notes

- For a full pipeline check independent of credentials, run `/smoke` (works in dry-run too).
- Going live changes only the SMS and payout edges; the fraud rules and decision logic are unchanged, so a green `npm test` + green `/smoke` in dry-run means the only remaining risk at go-live is credentials and callback reachability.
