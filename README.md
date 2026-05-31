# BimaCheck

Trustworthy instant hospi-cash payout for the informal sector, built for the Africa's Talking Insurtech Hackathon (Nairobi, 25 Jun 2026).

A member files a hospi-cash claim over **USSD**. A deterministic decision engine validates it against a facility admission feed and runs named fraud rules. Clean claims trigger an instant **M-Pesa B2C** payout to the member; suspicious claims are held for human review with a plain-language reason (flagged, never auto-denied). Positioned as RegTech sold to licensed insurers / SHA-style funds: we carry no risk and sell no policy.

The product is fast, trustworthy payout for honest claimants. Fraud scoring is the mechanism that makes instant payout safe to offer.

## Why it matters

KES ~11bn was lost from Kenya's SHA fund to claims fraud in six months. Insurers respond by making everyone wait, so honest claimants pay the price for fraudsters. BimaCheck pays the honest ones in seconds and holds the suspicious ones, on a feature phone, over rails the unbanked already use.

## Stack

- Node.js — Africa's Talking USSD + SMS, M-Pesa Daraja **B2C** (disbursement)
- SQLite / flat seed file for the facility admission feed
- Plain HTML dashboard (insurer view)

## Status

Design phase. The full design doc lives in [`docs/DESIGN.md`](docs/DESIGN.md). Next step: `/plan-eng-review` to lock architecture and the on-day build order.

## Key design decisions

- **Payout is B2C, not STK push.** STK push collects money from a phone; it cannot disburse. B2C sends money to the member.
- **Deterministic named rules, not ML.** Every decision returns a rule name + plain reason + confidence. Auditable and IRA-defensible.
- **Validated against a facility admission record**, never paid on a member's bare self-report.
- **Flagged != denied.** Suspicious claims route to human review. The platform never auto-denies and never carries risk.
