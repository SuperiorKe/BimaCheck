---
name: smoke
description: Drive the BimaCheck claim gauntlet end-to-end against a running server. Posts the four canonical USSD scenarios (clean->PAID, duplicate->HELD, geo-impossible->HELD, missing-admission->HELD), waits for the async worker, reads /api/claims, and asserts each claim lands in the right state with the right lead reason. Use to verify the full pipeline before a demo or after touching the engine, queue, worker, or USSD handler.
---

# /smoke — BimaCheck claim gauntlet

Verify the whole pipeline (USSD intake -> queue -> decision engine -> payout/hold -> claim state) by filing four claims that each trigger a different decision path, then asserting the final `/api/claims` state.

This is also the hackathon demo. If `/smoke` is green, the product works.

## Why a fresh DB matters

The claims store is **in-memory** (`node:sqlite` `:memory:`), so it starts empty on every `npm start` and accumulates claims for the life of the process. The decision engine evaluates each new claim against **prior claims by the same member**. That means the *order* of the four scenarios matters, and a dirty DB (claims left from earlier testing) will change the lead reason each rule produces.

**Always restart the server first** so the DB is empty and the sequence is deterministic.

## Rule ordering (why the sequence is what it is)

`decideClaim` runs rules in this order and the first to fire wins the SMS/`reason`:
`geoTimeImpossible -> missingAdmission -> duplicateClaim`.

- `geoTimeImpossible` only fires when a prior claim exists at a **different** facility within the window (it skips same-facility priors).
- `duplicateClaim` fires on a **same**-facility prior within 30 min.
- `missingAdmission` fires when the member has no seed admission at the claimed facility.

So to make each rule surface as the *lead* reason, file them in this exact order on a fresh DB:

1. seed member, KIBERA  -> clean (no priors)            -> **PAID**
2. seed member, KIBERA  -> same-facility prior          -> **HELD** (duplicate)
3. seed member, THIKA   -> different-facility prior now  -> **HELD** (geo-impossible)
4. unknown member, KIBERA -> no admission               -> **HELD** (missing admission)

## Reference facts

- Server: `http://localhost:3000`
- USSD facility menu indices: `1`=KIBERA (Kibera Clinic), `2`=THIKA (Thika Health Centre), `3`=KENYATTA (Kenyatta National Hospital)
- Seed member with admissions at KIBERA + THIKA: `+254708374149`
- Any other number is an "unknown member" with no admission on record
- Phone numbers must be URL-encoded in the form body: `+` becomes `%2B` (this matches what Africa's Talking actually sends, and the engine normalizes the `+` away when matching admissions)
- The worker is async; wait ~3s after each POST before reading state

## Steps

### 1. Ensure a fresh server

Check the server is up and the DB is empty:

```bash
curl -s http://localhost:3000/api/claims
```

If it returns `[]`, you're good. If it returns existing claims, ask the user to restart the server (`Ctrl+C` then `npm start`) so the gauntlet is deterministic. On Windows a stale `npm start` can keep holding port 3000 — if a restart "didn't take", run `npx kill-port 3000` then `npm start`. (See the dashboard-reload note in CLAUDE.md.)

### 2. Run the gauntlet

```bash
SEED="%2B254708374149"
UNKNOWN="%2B254799000001"

# 1. clean -> PAID
curl -s -X POST http://localhost:3000/ussd --data "text=1*1&phoneNumber=$SEED" >/dev/null
sleep 3
# 2. duplicate -> HELD
curl -s -X POST http://localhost:3000/ussd --data "text=1*1&phoneNumber=$SEED" >/dev/null
sleep 3
# 3. geo-impossible -> HELD
curl -s -X POST http://localhost:3000/ussd --data "text=1*2&phoneNumber=$SEED" >/dev/null
sleep 3
# 4. missing admission -> HELD
curl -s -X POST http://localhost:3000/ussd --data "text=1*1&phoneNumber=$UNKNOWN" >/dev/null
sleep 3

curl -s http://localhost:3000/api/claims
```

### 3. Assert the final state

`/api/claims` returns claims newest-first (id DESC). Assert exactly:

| id | member | facility | status | decision | reason contains |
|----|--------|----------|--------|----------|-----------------|
| 1 | +254708374149 | KIBERA | `PAID` | `APPROVED` | (null) — mpesaStatus `PAID` |
| 2 | +254708374149 | KIBERA | `HELD` | `HELD` | `Duplicate` |
| 3 | +254708374149 | THIKA | `HELD` | `HELD` | `Physically impossible` / `44km` |
| 4 | +254799000001 | KIBERA | `HELD` | `HELD` | `No hospital admission` |

Report PASS only if all four match. For any mismatch, show the actual row next to the expected row and name the likely cause:

- **#1 not PAID** -> payout path broken, or DB wasn't fresh (a prior claim made #1 look like a duplicate/geo). Check the server was restarted.
- **#2 reason is geo, not duplicate** -> a THIKA (or other non-KIBERA) prior existed before #2. DB wasn't fresh.
- **#3 not geo** -> geo rule regression, or THIKA admission/coords missing from seed.
- **#4 not missing-admission** -> `missingAdmission` regression, or the "unknown" number accidentally has a seed admission.
- **All four PAID or all four HELD** -> engine wiring broken (rules not running, or queue not draining). Check `src/worker.js` and `src/queue.js`.

### 4. (Optional) Show the dashboard

If the user wants the visual, screenshot `http://localhost:3000` — the four rows should show one aquamarine PAID stripe and three amber HELD stripes (per DESIGN.md).

## Notes

- This hits the live server, not the unit tests. For the pure-logic checks run `npm test` (engine/rules/pipeline). `/smoke` proves the HTTP + queue + worker + payout wiring that unit tests stub out.
- In offline/dry-run mode (no Daraja creds) the payout confirms immediately, so #1 still reaches `PAID`. With live creds it may sit at `APPROVED` until the `/b2c/result` callback or the 8s fallback fires — wait longer or check the dashboard.
