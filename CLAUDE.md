# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install deps
npm test             # run all 34 tests (node:test, no watch mode)
npm start            # start server at http://localhost:3000

# run a single test file
node --test test/rules.test.js
node --test test/engine.test.js
node --test test/pipeline.test.js

# quick curl demo (server must be running)
curl -s -X POST localhost:3000/ussd --data "text=1*1&phoneNumber=254708374149"
curl -s localhost:3000/api/claims
```

Requires **Node 24+** — uses `node:sqlite`, `node:test`, and `process.loadEnvFile` (all built-in, zero native build).

## Architecture

BimaCheck is a hospi-cash claims processor for the Africa's Talking Insurtech Hackathon. A USSD caller files a claim; a background worker runs deterministic fraud rules and either pays the member via M-Pesa B2C or holds the claim with a plain-language reason. Nothing auto-denies.

### Data flow

```
POST /ussd  ->  ussd.js (THIN, <10s, no I/O)
                  insertClaim(PENDING) + enqueue(claimId) -> "END processing"
                                    |
                        single-flight FIFO queue (queue.js)
                                    v
                           worker.js: processClaim(id)
                             decideClaim(claim, buildCtx(claim))
                                    |
                      HELD ----------+---------- APPROVED
                        |                            |
                 sendSms (held + reason)     requestPayout (mpesa.js)
                 claim=HELD                     |
                                     /b2c/result callback  OR  8s fallback
                                     confirmPayout() [single-shot markPaid guard]
                                     sendSms (approved)
                                     claim=PAID
```

### Module map

| File | Role |
|------|------|
| `src/index.js` | Express app, route wiring, queue init |
| `src/config.js` | All env vars with defaults; `process.loadEnvFile()` at startup |
| `src/db.js` | `node:sqlite` in-memory claims store + seed loader; exports `buildCtx()` |
| `src/ussd.js` | AT USSD webhook — thin state machine, no I/O |
| `src/queue.js` | In-process FIFO queue; `onIdle()` for test synchronisation |
| `src/worker.js` | Queue handler: decide → payout or hold |
| `src/engine/rules.js` | Three pure fraud rules + `haversineKm`; all testable with no deps |
| `src/engine/index.js` | `decideClaim(claim, ctx)` — maps rules, returns `APPROVED\|HELD` |
| `src/mpesa.js` | Daraja B2C: `requestPayout`, `confirmPayout`, `/b2c/result`, `/b2c/timeout` |
| `src/sms.js` | AT SMS client; dry-runs (logs) when no `AT_API_KEY` |
| `src/dashboard.js` | Self-contained HTML page served at `GET /`; polls `/api/claims` |
| `src/seed/` | Static JSON: `facilities.json` (lat/lng) and `admissions.json` (source of truth) |

### Decision engine

Every rule has the shape `(claim, ctx) => { name, triggered, reason, confidence }` and is **pure** — all data arrives via `ctx`, no DB or network access inside rules. `ctx` is assembled by `db.buildCtx()` and contains `facilities`, `admissions`, and `priorClaims`.

Rule order matters (`RULES` array in `rules.js`): `geoTimeImpossible` runs first so it wins `leadReason` (used in the SMS) when multiple rules fire.

**Claim status lifecycle:** `PENDING` → `APPROVED` → `PAID` (or `PENDING` → `HELD`). The `markPaid()` DB call is a single-shot guard (`status <> 'PAID'` predicate) — prevents a double SMS if the Daraja result callback arrives after the 8-second fallback has already confirmed the payout.

### Offline / dry-run

No credentials required to run the full demo flow:
- SMS dry-runs when `AT_API_KEY` is empty (logs to console).
- B2C dry-runs when `DARAJA_CONSUMER_KEY` is empty (calls `confirmPayout` immediately).

### Key invariants

- The USSD handler (`/ussd`) does **no** Daraja or SMS I/O — it must return within ~10s or AT kills the session.
- The queue is single-flight FIFO so claim N is fully decided before claim N+1 evaluates — the geo and duplicate rules need to see prior claims.
- `decideClaim` returns `APPROVED` or `HELD` only — never `DENIED`.
- Seed member `254708374149` has admissions at both `KIBERA` and `THIKA` (~40km apart) to enable the geo-impossible fraud demo.

## Environment

Copy `.env.example` to `.env`. All credentials default to empty (offline/dry-run). For live operation set `AT_API_KEY`, Daraja keys, and `PUBLIC_CALLBACK_BASE` (a pre-provisioned HTTPS box — Safaricom blocks ngrok).

## Deferred work

See `TODOS.md` for post-hackathon items: runtime RSA `SecurityCredential` generator for production Daraja, a 4th `amountVelocity` rule, and AT Voice callbacks.

## Design System

Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that does not match `DESIGN.md`.
