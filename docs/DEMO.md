# Demo runbook (Africa's Talking Insurtech Hackathon, Nairobi, 25 June 2026)

The demo now ends on proof, not a claim. After the two live claims, the benchmark shows the
measured numbers and the audit ledger downloads. That is the evidence a claims or fraud lead
asks for.

## The 90-second script

1. **(0-15s) The problem.** "KES 11 billion vanished from Kenya's SHA fund to claims fraud in
   six months. Insurers respond by making everyone wait, so honest people pay for fraudsters.
   We fix both."
2. **(15-50s) The honest claimant, paid.** Dial the USSD shortcode on a real phone and file the
   clean claim. USSD returns "received, processing" at once. Seconds later the phone shows the
   M-Pesa "received KES 2,000" SMS plus the approval SMS. "Honest claimant, paid in seconds, on
   a feature phone, over M-Pesa B2C, the correct disbursement rail."
3. **(50-70s) The fraudster, held.** File the seeded twin. SMS: "under review, same member,
   44km away, 5 minutes ago." "Not denied. Held for a human, with a reason we can defend to the
   regulator. Human in the loop, never auto-deny."
4. **(70-90s) The evidence.** On the dashboard, press **Run benchmark**: about 89% of fraud
   caught, about 5% false holds, KES 488,000 blocked per thousand claims, decisions in under a
   millisecond, every catch tied to a named rule. Then press **Download audit** and hold up the
   CSV. "Deterministic, auditable, IRA-defensible. We measure the catch rate and we can prove
   every single decision. That is what a black-box model cannot give a regulator."

## The line for the insurer in the room

"I would value 20 minutes on your claims process. I want to show what this does on your real
data, and learn where it would have to fit." The deliverable of the day is that conversation,
not the prize.

## Endpoints (for the live walk-through)

- `GET /` insurer dashboard (claims table, Run benchmark, Download audit)
- `POST /ussd` member claim intake
- `GET /api/claims` claims JSON (the dashboard polls this)
- `GET /api/backtest?n=1000&seed=1` measured metrics on a labelled synthetic set
- `GET /api/audit.csv` the decision ledger as a CSV download

## Day-before checklist

- [ ] `npm test` green (46 tests)
- [ ] `/smoke` four-scenario gauntlet passes against a running server
- [ ] Decide live B2C or dry-run for the stage (dry-run recommended; it always completes)
- [ ] Verify `DARAJA_SHORTCODE` (currently 6000996, the sandbox is usually 600996) and
      `DARAJA_INITIATOR_NAME` against the Africa's Talking dashboard
- [ ] Backup video recorded, full end to end (USSD intake, both SMS branches, the received-money SMS)
- [ ] Run benchmark and Download audit both work on the live URL
- [ ] 90-second script rehearsed out loud, twice

## Honesty note

The benchmark numbers are measured on a labelled synthetic set, not real claims. Say so. Real
rates come from a pilot on an insurer's own data. Claiming otherwise breaks the trust the whole
pitch rests on.
