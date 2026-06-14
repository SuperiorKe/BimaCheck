---
name: go-live
description: Wire BimaCheck from offline dry-run to live Africa's Talking + M-Pesa Daraja, and verify one real B2C payout before a demo. Walks .env setup, stands up (and proves reachable) a public HTTPS callback URL, confirms the server is not in dry-run, fires a real claim, watches the /b2c/result callback vs the 8s fallback, and uses a synthetic callback to isolate a broken endpoint from a silent provider. Use this skill whenever the user says go live, wire credentials, verify a real payout, test the Daraja callback, or take the app live for the hackathon or any real-credential test.
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

### 2. Stand up a public HTTPS callback URL — and prove it answers

Daraja calls `PUBLIC_CALLBACK_BASE/b2c/result` and `/b2c/timeout` asynchronously, so the box must be reachable from Safaricom over HTTPS.

- **Stable / production-shaped (recommended):** deploy the app on the public VM and use its HTTPS URL. Run `/deploy` (provision mode); the callback base becomes `https://173-255-232-5.ip.linodeusercontent.com`. No laptop dependency and no URL that changes under you.
- **Quick sandbox:** `ngrok http 3000` and use the `https://...ngrok-free.app` URL. Fine for a fast test, but the free URL changes on every restart, which is the number-one stale-config trap.

Set `PUBLIC_CALLBACK_BASE` with **no trailing slash**. A base ending in `/` builds `https://host//b2c/result`, which Express will not route. `config.js` strips a trailing slash defensively, but set it clean anyway.

**Before trusting the URL, prove it answers.** A dead or stale tunnel is the most common reason "the callback never came":

```bash
curl -sS -m 8 -o /dev/null -w "callback base: HTTP %{http_code}\n" "$PUBLIC_CALLBACK_BASE/api/claims"
```

`200` means good. A timeout or `000` means the URL is dead — an old ngrok session, or a firewall dropping 443. A connect *timeout* (rather than "connection refused") points at a firewall; on a cloud VM that is usually the provider's edge firewall, separate from the host ufw (see `/expose-https`). Fix this before going further, or every payout will silently fall through to the 8s fallback.

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

Two paths can confirm the payout (whichever lands first):

- **`/b2c/result` callback** from Daraja -> `confirmPayout` -> claim `PAID`. Sandbox callbacks are unreliable and often never arrive at all.
- **8s fallback timer** in `requestPayout` -> `confirmPayout` -> claim `PAID`. The safety net for when the callback never lands.

The single-shot `markPaid` guard means whichever fires first wins and the second is a no-op (no double SMS).

**Watch for the real callback.** If the app is behind the VM's Caddy, tail both logs while the claim processes:

```bash
SSH="ssh -i $HOME/.ssh/openclaw-frankfurt root@173.255.232.5"
$SSH "journalctl -u bimacheck -n 15 --no-pager -o cat | grep -i mpesa"  # expect: [mpesa] B2C requested for claim N: 0
$SSH "journalctl -u caddy -n 50 --no-pager -o cat | grep /b2c/"         # a real Daraja result POST shows here, with its client IP
```

`ResponseCode 0` plus a returned `ConversationID` means Daraja *accepted* the request (queued it), not that it paid. The verdict only comes on `/b2c/result`.

**Isolate "our endpoint" from "the provider never called."** If no `/b2c/result` arrives, POST a synthetic Daraja result to your public endpoint. If it routes through and answers, your endpoint is fine and the gap is on Safaricom's side (expected in sandbox):

```bash
curl -sS -X POST "$PUBLIC_CALLBACK_BASE/b2c/result" -H "Content-Type: application/json" \
  -d '{"Result":{"ResultCode":0,"ResultDesc":"ok","ConversationID":"<the claim conversationId>","TransactionID":"TEST"}}'
# expect: {"ResultCode":0,"ResultDesc":"received"}, and a POST /b2c/result -> 200 in the caddy log
```

Verify the claim state:

```bash
curl -s "$PUBLIC_CALLBACK_BASE/api/claims"
```

**Be honest about what `PAID` means here.** In sandbox the result callback frequently never arrives, so the claim reaches `PAID` only via the 8s fallback — which marks PAID and sends the "approved" SMS *before* Daraja confirms anything. That is fine for a demo but a real risk for live money (see `TODOS.md` item 3 and `docs/DEPLOYMENT.md`). The member-visible proof that money actually moved is the **M-Pesa "received" SMS** Safaricom sends independently; in sandbox it may not come. So treat a fallback-driven `PAID` as "dispatched and accepted", not "confirmed paid", until you see a real `ResultCode 0` on the callback.

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
- **No `/b2c/result` ever arrives; claim PAID only by the fallback** -> first run the step 2 reachability pre-check and confirm `PUBLIC_CALLBACK_BASE` has no trailing slash. Then POST the synthetic callback (step 5). If your endpoint answers but Safaricom still never calls, that is sandbox behaviour, not your bug.
- **External connect *times out* (not "refused")** -> a firewall is dropping the port. On a cloud VM this is usually the provider's edge firewall (e.g. Linode Cloud Firewall), separate from the host ufw. Open inbound 443 there. See `/expose-https`.

## Notes

- For a full pipeline check independent of credentials, run `/smoke` (works in dry-run too).
- Going live changes only the SMS and payout edges; the fraud rules and decision logic are unchanged, so a green `npm test` + green `/smoke` in dry-run means the only remaining risk at go-live is credentials and callback reachability.
