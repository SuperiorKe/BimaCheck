# Demo runbook (Africa's Talking Insurtech Hackathon, Nairobi, 25 June 2026)

The demo now ends on proof, not a claim. After the two live claims, the benchmark shows the
measured numbers and the audit ledger downloads. That is the evidence a claims or fraud lead
asks for.

## The 90-second script

_Repositioned 2026-06-20 around the payout wedge. Fraud detection is now table stakes in this
market: SHA runs its own engine, Old Mutual has OmiCare, Curacel sells it. The differentiator is
instant, safe payout to the feature-phone member, made defensible by named rules. Lead with that._

1. **(0-12s) The wedge.** "Everyone here can now detect fraud. SHA's own engine flagged 11 billion
   shillings of it in six months. The unsolved problem is the other side: paying the honest member
   in seconds, on a feature phone, without paying a fraudster by mistake. That is what BimaCheck
   does."
2. **(12-50s) The honest claimant, paid.** Dial the USSD shortcode on a real phone and file the
   clean claim. USSD returns "received, processing" at once. Seconds later the phone shows the
   M-Pesa "received KES 2,000" SMS and the approval SMS. "An honest member, paid in seconds, on a
   feature phone, over M-Pesa B2C, the rail the unbanked already use. No app, no bank account, no
   waiting weeks for a cheque."
3. **(50-70s) Why that speed is safe.** File the seeded twin. SMS: "under review, same member,
   44km away, 5 minutes ago." "The same engine that paid the honest claim in seconds holds this
   one for a human, with a named reason: one member, two facilities, five minutes apart. Held for
   review, never auto-denied."
4. **(70-90s) The proof a regulator accepts.** On the dashboard, press **Run benchmark**: about
   89% of fraud caught, about 5% false holds, KES 488,000 blocked per thousand claims, every catch
   tied to a named rule, each decision in under a millisecond. Then press **Download audit** and
   hold up the CSV. "Named deterministic rules, every decision showing its rule and its reason. A
   black-box model cannot show the IRA that. The audit trail is what makes instant payout safe to
   offer."

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
