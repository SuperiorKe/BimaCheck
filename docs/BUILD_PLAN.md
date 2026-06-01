# BimaCheck — Build Plan (locked via /plan-eng-review, 2026-06-01)

The architecture and on-day build order. Source of truth for problem/scope is [`DESIGN.md`](DESIGN.md).

## Locked decisions
- **Runtime:** Node (reuse Mama Mboga AT + state-machine patterns).
- **HTTP framework:** Express.
- **Data store:** better-sqlite3 (synchronous; file-backed or in-memory).
- **Member identity:** AT `phoneNumber` (no member-ID entry step).
- **Async:** in-process **single-flight FIFO** queue (sequential; guarantees claim N sees claim N-1 for duplicate/geo rules).
- **Payout:** Daraja **B2C** disbursement (NOT STK push). SecurityCredential: hardcode the sandbox test value in `.env` (no runtime RSA generator).
- **Test runner:** node:test (built into Node 24, zero install).
- **Decisions:** deterministic named rules, never ML. Outcomes: APPROVE | HOLD. Never DENY.

## Module layout
```
src/
  index.js        Express app, route wiring (/ussd, /b2c/result, /b2c/timeout, /, /api/claims), start
  config.js       env: AT key/username, Daraja key/secret/shortcode/SecurityCredential, PUBLIC_CALLBACK_BASE
  db.js           better-sqlite3 init, schema, seed loader
  seed/
    facilities.json   { code, name, lat, lng }
    admissions.json   { member_msisdn, facility_code, admitted_at }
  ussd.js         POST /ussd: parse text levels, persist claim (PENDING), enqueue, return END
  queue.js        in-process single-flight FIFO runner; per-job try/catch isolation
  engine/
    rules.js      admissionMatch, duplicateInWindow, geoTimeImpossible, haversine (+ amountVelocity if time)
    index.js      decideClaim(claim, ctx) -> { decision, triggered:[{name,reason,confidence}] }
  mpesa.js        b2cPayout(); POST /b2c/result + /b2c/timeout; 8s fallback w/ single-shot PENDING->PAID guard
  sms.js          AT SMS client; approved + held templates (single source)
  dashboard.js    GET / (table) + GET /api/claims (json) — cut-first
test/
  rules.test.js   ***  each rule + edge cases
  engine.test.js  decideClaim orchestration + invariants
  pipeline.test.js integration: ussd -> decide -> notify (mpesa/sms mocked)
```

Rule interface (DRY): every rule is `(claim, ctx) => { name, triggered, reason, confidence }`. Engine maps an ordered array, collects triggered, surfaces geo reason first.

## Runtime data flow
```
phone --USSD--> AT gateway --POST /ussd--> ussd.js [THIN <10s, no I/O]
                                             persist PENDING -> queue.push -> "END processing"
                                                      |
                                       in-process single-flight FIFO
                                                      v
                                          engine.decideClaim
                                   admissionMatch / duplicateInWindow / geoTimeImpossible
                                                      |
                              APPROVE -----------------+----------------- HOLD
                                 |                                          |
                       mpesa.b2cPayout(member)                      sms.send(held + reason)
                                 |                                  claim=HELD
                   /b2c/result --+-- 8s timeout (no callback)
                   claim=PAID         scripted success:
                   sms approved       sms approved (single-shot guard)
                   (single-shot)      member already has M-Pesa's own SMS
```

## USSD state machine
```
text=""      -> CON "BimaCheck\n1. File hospi-cash claim"
text="1"     -> CON "Select facility:\n1. Kibera Clinic\n2. Thika Health\n..."
text="1*<n>" -> END "Claim received, processing. SMS coming shortly."  (persist + enqueue)
```

## Fraud demo seeding
Seed member M (a sandbox test MSISDN) with admissions at BOTH Kibera (A) and Thika (B), ~22 min apart.
- Dial 1 at A: admissionMatch OK, no prior claim -> APPROVE -> paid.
- Dial 2 at B: admissionMatch also OK (seeded), but geoTimeImpossible vs claim 1 (40km in 22min) -> HELD with geo reason.
Both claims look individually valid; they are physically impossible together. Geo is the unambiguous hero.

## On-day build order (solo)
0. **Pre-day / first 30 min:** `npm init`, install express + better-sqlite3; `.env` from sandbox creds; deploy HTTPS callback box (Render/Railway/Fly); **verify B2C sandbox end-to-end** (see Assignment in DESIGN.md). Gate for the contingency decision.
1. Scaffold: index.js, config.js, db.js + seed JSON.
2. **Decision engine FIRST** (rules.js + engine/index.js + tests). Pure, zero external deps, fully testable offline. This is the senior signal.
3. USSD intake: ussd.js + queue.js. Assert handler returns fast (no I/O).
4. SMS notify: sms.js. **Checkpoint: USSD -> decide -> SMS is now a complete, un-failable demo.**
5. B2C payout: mpesa.js + result/timeout routes + 8s fallback + single-shot guard. The risky stretch.
6. Dashboard (cut-first).
7. Rehearse 90s script; record FULL end-to-end backup video.

## Parallel lanes (for subagents / git worktrees)
```
Lane 0 (foundation, must finish first): config.js, db.js, seed/  [shared]
Lane A (engine):     rules.js, engine/index.js, rules.test.js, engine.test.js   [pure, independent]
Lane B (telephony):  ussd.js, queue.js, sms.js                                   [needs Lane 0 schema]
Lane C (payments):   mpesa.js, /b2c routes, fallback, guard                      [needs Lane 0 schema]
Integration (last):  index.js route wiring + pipeline.test.js
```
Launch A + B + C in parallel after Lane 0. CONFLICT FLAG: B and C both add routes to `index.js` — wire all routes in the final integration step, or have each lane export a router and mount them once, to avoid merge conflicts.

## Failure modes
| # | Failure | Mitigation | Tested? | Silent? |
|---|---------|-----------|---------|---------|
| 1 | I/O in USSD handler -> >10s timeout | thin handler + enqueue | yes (budget spy) | no |
| 2 | B2C result callback never arrives | 8s scripted-success fallback; member gets M-Pesa SMS regardless | yes (E2E) | no |
| 3 | **Late callback after fallback -> double SMS** | single-shot PENDING->PAID transition | **yes (CRITICAL test)** | guarded |
| 4 | Concurrent claims -> geo rule misses prior | single-flight FIFO queue | yes (FIFO test) | no |
| 5 | Bad job throws -> queue frozen | per-job try/catch isolation | yes | no |
| 6 | Daraja sandbox fully down | full E2E backup video + STK-collection contingency (DESIGN.md) | n/a | no |

No remaining unaddressed critical gap: failure #3 is the one critical mode and is covered by both a guard and a test in this plan.

## NOT in scope
- Runtime RSA SecurityCredential generator (production only).
- CI/CD + artifact distribution (demo, not a shipped artifact; token lacks `workflow` scope).
- amount/velocity 4th rule (add only if time).
- AT Voice callback (Approach C extra).
- Auth, multi-tenancy, real KYC, real PII (synthetic seed data only).

## What already exists
- Mama Mboga (separate repo): AT client setup, USSD `text`-parse state machine, SMS send. Lift patterns, not files.
- This repo: README, DESIGN.md, .gitignore (already excludes .env, *.pem, *.key).
