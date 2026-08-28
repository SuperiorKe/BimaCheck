# BimaCheck

Trustworthy instant hospi-cash payout for the informal sector, built for the Africa's Talking Insurtech Hackathon (Nairobi, 25 Jun 2026).

A member files a hospi-cash claim over **USSD**. A deterministic decision engine validates it against a facility admission feed and runs named fraud rules. Clean claims trigger an instant **M-Pesa B2C** payout to the member; suspicious claims are held for human review with a plain-language reason (flagged, never auto-denied). Positioned as RegTech sold to licensed insurers / SHA-style funds: we carry no risk and sell no policy.

The product is fast, trustworthy payout for honest claimants. Fraud scoring is the mechanism that makes instant payout safe to offer.

## Why it matters

KES ~11bn was lost from Kenya's SHA fund to claims fraud in six months. Insurers respond by making everyone wait, so honest claimants pay the price for fraudsters. BimaCheck pays the honest ones in seconds and holds the suspicious ones, on a feature phone, over rails the unbanked already use.

## Stack

- Node.js 24 + Express 5 — Africa's Talking USSD + SMS, M-Pesa Daraja **B2C** (disbursement)
- Built-in `node:sqlite` for the claims store (zero native build); JSON seed for facilities/admissions
- Built-in `node:test` for tests; plain HTML dashboard (insurer view), no framework

## Status

Feature-complete, with the evidence layer added: a fraud benchmark that reports measured metrics and an exportable decision ledger. USSD intake → decision engine → SMS, with M-Pesa B2C payout, an insurer dashboard, a Run benchmark panel (`GET /api/backtest`), and a Download audit ledger (`GET /api/audit.csv`). 46 tests passing. Design and architecture live in [`docs/DESIGN.md`](docs/DESIGN.md) and [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md); the demo runbook is in [`docs/DEMO.md`](docs/DEMO.md).

## Running it

Requires **Node 24+** (uses built-in `node:sqlite`, `node:test`, and `process.loadEnvFile`).

```bash
npm install
npm test                 # 34 tests
cp .env.example .env      # leave blank for offline dry-run; fill for live AT + Daraja
npm start                 # http://localhost:3000  (dashboard)
```

With no credentials set, SMS and payout run in **dry-run** (logged, not sent), so the full flow works offline.

Try it locally (server running, in another terminal):

```bash
# clean claim at Kibera -> APPROVED -> PAID
curl -s -X POST localhost:3000/ussd --data "text=1*1&phoneNumber=254708374149"
# fraud twin at Thika -> HELD (geo-impossible)
curl -s -X POST localhost:3000/ussd --data "text=1*2&phoneNumber=254708374149"
curl -s localhost:3000/api/claims
```

### Day-of checklist (going live)

1. AT sandbox USSD shortcode + API key from the on-site AT team → set `AT_API_KEY`, `AT_USERNAME`, `AT_SHORTCODE`.
2. Daraja sandbox → set `DARAJA_CONSUMER_KEY/SECRET/SHORTCODE`, `DARAJA_INITIATOR_NAME`, and the sandbox `DARAJA_SECURITY_CREDENTIAL`.
3. Deploy to an HTTPS box (Render/Railway/Fly) and set `PUBLIC_CALLBACK_BASE` to it — Daraja B2C callbacks need a public HTTPS URL (ngrok is blocked).
4. Use a **Daraja sandbox test MSISDN** as the demo recipient; an arbitrary real number won't receive a sandbox B2C payment.
5. Verify one real B2C payout end-to-end before the demo. If the sandbox won't cooperate, the dry-run path still gives a complete demo (see `docs/DESIGN.md` contingency).

## Key design decisions

- **Payout is B2C, not STK push.** STK push collects money from a phone; it cannot disburse. B2C sends money to the member.
- **Deterministic named rules, not ML.** Every decision returns a rule name + plain reason + confidence. Auditable and IRA-defensible.
- **Validated against a facility admission record**, never paid on a member's bare self-report.
- **Flagged != denied.** Suspicious claims route to human review. The platform never auto-denies and never carries risk.
