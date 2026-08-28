# Hospi-Cash and Micro-Insurance Market Brief: Kenya and East Africa

**Prepared for:** BimaCheck (claims-integrity layer for hospi-cash insurance)
**Date:** 14 June 2026
**Confidence level:** Medium-High. Market structure, regulation, competitor models, and fraud patterns are well sourced. Some hard numbers (member income bands, hospi-cash-specific claim volumes, BIMA Kenya current status) could not be fully verified and are flagged in the text.

---

## Executive summary

Kenya has a low insurance penetration of about 2.2 to 2.4 percent of GDP, against a global average near 7.4 percent. Around 80 percent of the workforce is informal, low and irregular income, and largely outside formal health cover. This is the "missing middle": people who earn too much for state subsidies but cannot afford a normal medical premium. Hospi-cash answers that gap because it is cheap, fixed-benefit, and pays cash to M-Pesa rather than reimbursing a hospital bill.

The product is already proven at scale. M-KOPA and Turaco put hospital cash cover (Ksh 1,000 per day of admission) onto more than one million Kenyans in twelve months from June 2024, paid straight to mobile money. The buyers of a claims tool are not the members. They are the underwriters and scheme operators (Turaco, BIMA/Milvik, Jamii, SACCO welfare funds, MFIs) who carry the fraud and operating-cost risk.

The single strongest market signal for BimaCheck is the Social Health Authority (SHA) fraud scandal. A Ministry of Health audit found Sh11 billion stolen between October 2024 and April 2025, through exactly the patterns BimaCheck is built to catch: ghost patients, duplicate claims, and admissions at facilities where care never happened. The fraud is real, large, current, and named at the highest level of government.

The regulatory clock is the wedge. The Insurance (Microinsurance) Regulations 2020 require a microinsurer to pay or reject a claim within ten calendar days and to resolve complaints within seven. A deterministic engine that clears clean claims in seconds and holds only the suspect ones, with a plain-language reason, sits exactly on that legal pressure point.

The sharpest gap: nobody is selling a thin, channel-agnostic claims-integrity layer that an underwriter or scheme operator can drop in behind their existing distribution. The incumbents either own the whole stack (Turaco, BIMA) or sell distribution and policy admin (Lami, Inclusivity, Jamii). Fraud control inside hospi-cash is treated as an internal cost line, not a bought-in product.

---

## 1. The two-sided customer

### 1a. The MEMBER (who holds the cover)

The member is an informal-sector worker. Roughly 80 percent of Kenya's workforce is informal: boda boda riders, market vendors (mama mboga), small traders, gig workers, smallholder farmers. Their defining trait is low and irregular income, which makes prepaying for healthcare hard.

**Why hospi-cash over health insurance.** They sit in the "missing middle". They earn too much to qualify for state subsidy, but not enough to fund a normal medical premium. Research on boda boda riders specifically found that premium cost is the main reason they do not join health insurance. Hospi-cash works for them because:

- It is cheap and fixed-benefit. The member knows they get a set cash amount per night admitted, not a confusing percentage of a bill.
- It pays cash to the member, not to a hospital. That cash covers the side costs that medical cover ignores: transport, food, lost daily income while they cannot work, a relative's fare.
- It bundles cleanly. M-KOPA built it into the phone at no extra cost. Jamii and Jubilee sell it for as little as Ksh 20 per week over USSD.

**Channel reality (the most important product constraint).** The member is on the low end of the device curve. The 2024 FinAccess Household Survey found 52.6 percent of Kenyans now use mobile money daily, more than double the 23.6 percent of 2021, and 34 percent of the formally included only ever use a mobile wallet. Lack of a mobile phone is the single biggest barrier to financial inclusion (64.1 percent of the excluded). For the informal hospi-cash member, assume:

- Many are on a feature phone or a low-end Android.
- USSD and SMS are the safe default. WhatsApp reaches a subset, not all.
- M-Pesa is universal and is the only payout rail that matters.

BimaCheck's USSD-first, SMS-notification, M-Pesa-payout design matches this profile exactly. That is the correct call.

**Claims experience and frustration.** The member's pain is delay and opacity. When a benefit is fixed and small, a slow or silent claim is the whole failure. The good operators have made speed their selling point: Turaco markets "paid in under 3 working days" via WhatsApp; one M-KOPA/Turaco customer received Ksh 7,000 two days after claiming, straight to mobile money. The bad experience is the SHA and NHIF picture, where hospitals were owed Sh76 billion and patients were turned away or made to pay cash despite valid cover. For a member living on daily income, a claim that takes weeks defeats the purpose of the product.

### 1b. The BUYER (who pays for a tool like BimaCheck)

The buyer is whoever carries the claims risk and the operating cost. Four types:

1. **Micro-insurers and insurtech underwriters** (Turaco, BIMA/Milvik, Inclusivity Solutions). They underwrite or administer the cover and eat the fraud loss directly.
2. **Distribution-led platforms** (Lami, Jamii). They run policy admin and claims for partner insurers and compete on cost per claim.
3. **SACCOs and MFIs with welfare or benevolent funds.** Many run member welfare schemes that pay out on hospitalisation or death. These are often manual, paper-based, and have weak fraud control. Hazina Sacco, for example, runs a Benevolent Fund where members submit a nominee form plus documents, and the penalty for a fraudulent welfare claim is deduction from deposits plus a Ksh 20,000 fine. That penalty clause is evidence the fraud is real and recurring.
4. **Hospi-cash scheme operators** bundling cover into another product (lender, asset-financier, employer group).

**What they lose money on.** Three things: fraudulent claims paid out, the labour cost of manually reviewing every claim, and the regulatory and reputational cost of paying late. The microinsurance line is already loss-making at the industry level. The combined ratio for microinsurance was 102.1 percent in H1 2025 per Cytonn and IRA data, meaning claims plus costs exceeded premium revenue. Every shilling of avoidable fraud and every hour of manual review comes straight off a line that is already underwater.

**How they process claims today.** A spread. Turaco runs WhatsApp intake plus internal verification, paying within three business days. SACCO welfare funds are largely manual and paper-based. The common shape is: member notifies, a human checks documents against records, then pays. The verification step is where both the cost and the missed fraud live. There is little evidence of automated cross-checking of a claim against the member's actual admission record and prior claims, which is precisely the gap BimaCheck fills.

**How long claims take.** Best in class is two to three days (Turaco). The legal ceiling for a microinsurer is ten calendar days to pay or reject (Microinsurance Regulations 2020, Section 14). Traditional insurers operate under a 90-day general settlement window and several have been fined for breaching even that, with Invesco fined Ksh 7.9 million for late payment. The spread between "seconds" and "ten days" is the commercial space BimaCheck plays in.

---

## 2. Market size and penetration

Hard numbers, with sources. Where a figure is soft, it is flagged.

- **Insurance penetration:** 2.2 percent of GDP in H1 2025, down from 2.4 percent in 2024 (IRA and Central Bank of Kenya, via Standard and Cytonn). Global average about 7.4 percent. Kenya is among the higher-penetration markets in sub-Saharan Africa but far below global norms.
- **Microinsurance is loss-making:** combined ratio 102.1 percent in H1 2025. Total microinsurance investments about Ksh 540.6 million at end of Q2 2025 (Cytonn, IRA).
- **Informal workforce:** about 80 percent of Kenya's total workforce. More than 90 percent of informal workers do not actively contribute to the national health scheme (Standard Health; Rupha).
- **Global microinsurance reach:** about 344 million people covered in 2023, up from 294 million in 2022, but only about 11 percent of the addressable market captured. Nearly 80 percent of those covered are in Asia-Pacific (Microinsurance Network, 2024 Landscape).
- **Mobile money as the rail:** in Africa, about 15 percent of microinsurance products use mobile money (up from 12 percent in 2022), and cash-based products fell from 22 to 17 percent. Kenya is cited as a market where microinsurance pushed users onto mobile money (Microinsurance Network).
- **Hospi-cash proof point:** M-KOPA and Turaco covered more than one million Kenyans with hospital cash (Ksh 1,000 per day) in twelve months from June 2024. About 75 percent of those covered had no prior health insurance (M-KOPA newsroom; IT News Africa).
- **Adjacent scale:** M-TIBA mobile health wallet reached over five million users and enabled over Ksh 2.6 billion (about USD 24 million) in healthcare payments annually (Standard Health). This shows the M-Pesa health rail can carry serious volume.

**Device split (the product-critical number).** A clean national feature-phone vs smartphone split for the informal hospi-cash member could not be verified to a single figure I trust. The defensible position from FinAccess 2024: a large share of low-income Kenyans transact only through a mobile wallet, mobile money is daily and near-universal, and lack of a phone is the top exclusion barrier. Treat the hospi-cash member as feature-phone or low-end Android, USSD and SMS safe, smartphone and WhatsApp not guaranteed. Do not assume app reach for this segment.

**Protection gap.** The gap is the 80 percent informal workforce largely outside formal cover, the 90 percent of informal workers not contributing to the national scheme, and a microinsurance market that has captured only a sliver of its addressable base. The gap is enormous and well documented. The constraint has never been demand for a fixed cash benefit; it is cost-to-serve, trust, and claims friction.

---

## 3. Claims fraud in this market

Fraud in Kenyan insurance is large, named, and current. The strongest, most recent evidence comes from the public health funds, and it maps almost one-to-one onto what BimaCheck catches.

### The numbers

- **Medical segment:** AKI estimates Kenya loses up to Ksh 33 billion to insurance fraud in the medical segment alone, citing weak systems and collusion.
- **Motor (for scale):** industry estimates put roughly 30 percent of motor claims as fraudulent, costing 8 to 10 percent of all motor claims paid. Motor tops the IRA fraud caseload.
- **Reported cases:** fraud cases reported to the Insurance Fraud Investigation Unit fell 15.6 percent to 184 in 2024, from 218 in 2023. Note the gap between 184 formally reported cases and a Ksh 33 billion loss estimate. Most fraud is never reported, which is the whole problem and the whole opportunity.
- **SHA scandal (the headline):** a Ministry of Health audit found Sh11 billion stolen from the Social Health Authority between October 2024 and April 2025. SHA submitted 1,188 fraud investigation files to the DCI, suspended 85 facilities, rejected claims worth Ksh 10.6 billion, and placed Ksh 3 billion under review.

### The fraud types, mapped to BimaCheck

| Fraud pattern (reported in Kenya) | Source signal | Caught by BimaCheck today? |
|---|---|---|
| Duplicate / multiple claims on one event | SHA "duplicate claims"; NHIF single case codes used to claim multiple benefits | Yes. Duplicate-claim rule. |
| Claim at a facility where the member was never admitted / ghost facilities | SHA ghost patients, ghost hospitals, fake procedures never performed | Yes. Facility-mismatch rule (no admission record at that facility). |
| One member claiming at two places impossibly far apart | Implied by ghost-patient and multi-facility billing; classic geo-impossible signature | Yes. Haversine geo-time-impossible rule. |
| Upcoding (admitting when not warranted, billing a costlier code) | SHA upcoding; AKI medical upcoding | No. BimaCheck is fixed-benefit hospi-cash, so upcoding is largely out of scope by product design. |
| Phantom billing (procedure never done) | AKI phantom billing; SHA all-caesarean maternity claims | Partial. Caught only where there is no admission record at all; not where an admission is real but the procedure is inflated. |
| Collusion (agent, facility, or staff registered as patients) | SHA registered healthcare workers as patients; AKI agent theft, adding non-members | Not directly. Requires identity and enrolment checks BimaCheck does not yet run. |
| Amount / velocity anomalies (too many claims too fast) | Implied across schemes | Not yet. Noted in your own TODOS as a planned fourth rule (amountVelocity). |

**Read on coverage.** BimaCheck's three rules hit the three most concrete, most provable fraud types in the SHA and NHIF record: duplicates, ghost-facility claims, and geographically impossible claims. These are the frauds a deterministic engine can prove without a human judgement call, which is exactly why they are the right first three. The frauds it does not catch (upcoding, real-admission-inflated-procedure, collusion, velocity) are either out of scope for a fixed-benefit product or are the natural roadmap. Be honest with buyers about this boundary. The honesty is a selling point, because it pairs with "never auto-denies".

---

## 4. Existing players and tools (competitive map)

| Player | What they do | Distribution model | Channel | Claims integrity / fraud handling | Relationship to BimaCheck |
|---|---|---|---|---|---|
| **Turaco** | Micro-insurance incl. hospital cash (Ksh 1,000/day). Underwrites/administers, fast claims. ~$2/month products. | Embedded via partners: M-KOPA, Sun King, One Acre Fund, Tugende, VisionFund. | WhatsApp + toll-free for claims; partner channels for sale. | "Internal verification", pays within 3 business days. No public evidence of an automated deterministic fraud engine. | Sell into, or compete on the verification step. Likely the single best design partner: real hospi-cash volume, real claims cost, M-Pesa payout already. |
| **BIMA / Milvik** | Life, health, hospital cash, personal accident for mass market. 7M+ customers, 20M lives across 6 countries Asia and Africa. ~2,000 call-centre agents. | Agent + call-centre led, MNO partnerships. | Phone, agent, M-Pesa payout. | Quick-claims marketing; agent-mediated. Heavy human verification cost. | Sell into. Their cost base is agents and call centres; an automated integrity layer attacks exactly that cost. Note: could not verify current Kenya operating status; confirm before pitching. |
| **Jamii (Jamii Africa)** | Mobile policy admin + low-cost health/life/disability cover. Cut admin cost up to 95 percent. | MNO + insurer partnerships (Jubilee, Vodacom TZ; Safaricom/M-Pesa in Kenya as Imarisha Jamii). | USSD-native, M-Pesa integrated. Cover from Ksh 20/week. | Platform-level admin; fraud control not publicly detailed. | Closest channel twin (USSD + M-Pesa). Complement: they own enrolment and admin, BimaCheck owns claims integrity. |
| **Lami** | White-label insurance-as-a-service API. Banks, fintechs, marketplaces embed cover. Connected to 15+ African insurers. | API / embedded, B2B2C. | API into partner apps. | Routes claims to insurers; not a fraud engine. | Complement / integration target. BimaCheck could be a fraud module behind Lami's claims flow. |
| **Inclusivity Solutions** | Embedded insurance platform (ASPin): policy admin, premium collection, claims via open API. ~$5.8M raised. | MNO and bank partnerships, embedded. | App / API; mobile. | Claims processing in-platform; deterministic fraud layer not evidenced. | Complement / integration target, similar to Lami. |
| **Pula** | Index-based agri insurance for smallholder farmers. | Bundled with inputs, governments, lenders. | Mobile, agronomic data. | Index-based, so claims are parametric (weather data), little classic claims fraud. | Out of lane. Different fraud surface. Useful only as a model of parametric payout. |
| **MicroEnsure / MIC Global** | Mass-market insurance, 40M+ customers across Africa, Asia, Caribbean. | MNO and partner distribution. | Mobile, agent. | Scale player; fraud handling not publicly detailed. | Potential sell-into at scale; harder to reach as a first partner. |
| **Linda Jamii (historical)** | Safaricom + Britam + Changamka micro health product for the uninsured. | MNO-led. | Mobile / M-Pesa. | Largely wound down; cited as a cautionary tale on micro health economics. | Lesson, not a competitor. Shows micro health is hard; fixed-benefit hospi-cash is the more durable shape. |
| **SACCO / MFI welfare and benevolent funds** | In-house member welfare paying on hospitalisation or death. | Member-direct. | Paper, branch, manual. | Weak. Manual document checks; fraud penalty clauses (e.g. Hazina Sacco Ksh 20,000 fine) prove the problem. | Strong sell-into. Underserved, fraud-exposed, no incumbent tool, and they already hold the member relationship. |

**The shape of the competitive field.** Two camps. Full-stack operators (Turaco, BIMA, MicroEnsure) who own distribution, underwriting, and claims, and treat fraud as an internal cost. Platform enablers (Lami, Inclusivity, Jamii) who sell distribution and policy admin and route claims to insurers. In neither camp is "deterministic claims integrity" sold as a discrete, bought-in product. That is the open lane.

---

## 5. Product gaps and opportunity

Concrete white space, not generic advice.

1. **A drop-in claims-integrity layer sold as a module, not a platform.** Every incumbent either owns the whole stack or sells distribution. None sells fraud control as a thin layer an operator can put behind their existing flow. A SACCO welfare fund, a Jamii, or a Turaco partner could route a claim through BimaCheck's decision engine and get APPROVE-and-pay or HOLD-with-reason, without changing their distribution. This is the wedge.

2. **The SACCO and MFI welfare fund segment is wide open.** They carry real hospitalisation and death payouts, run manual paper checks, have documented fraud (penalty clauses are the proof), and have no insurtech incumbent fighting for them. They already hold the member, the phone number, and the M-Pesa relationship. They are smaller and slower to sell to than a Turaco, but there is no competitor in the room.

3. **"Cleared in seconds, held with a reason, never auto-denied" is a regulatory product, not just a UX choice.** The Microinsurance Regulations 2020 require pay-or-reject within ten days, complaint resolution within seven, and plain-language policy communication. A tool that pays clean claims instantly and produces a written, plain-language hold reason for the rest is selling regulatory compliance and audit trail, not only speed. Frame it that way to the buyer.

4. **Deterministic, explainable, offline-capable beats AI-black-box here.** The market is moving to AI fraud detection in motor. For hospi-cash on feature phones, a deterministic rule engine that can run with no credentials in dry-run, explains every decision in plain language, and never silently denies is the more trustable and more sellable shape for a regulator and a low-trust member base. Lean into "deterministic and explainable" as a deliberate stance against opaque AI scoring.

5. **The fraud roadmap is already mapped by the SHA audit.** The frauds BimaCheck does not yet catch (velocity/amount anomalies, real-admission-inflated claims, collusion via identity checks) are exactly the next ones the public record names. The amountVelocity rule in your TODOS is the obvious next build, and the SHA "1,188 files" story is the proof the demand is there.

6. **Cross-scheme duplicate detection is a defensible long game.** Today the engine checks a member's claims within one scheme. The real fraud frontier is one person or one facility claiming across multiple schemes. A shared, privacy-respecting integrity layer that several small operators feed into would catch what no single operator can see alone. That is a network-effect moat, and it is the reason to start with the underserved SACCO segment where no incumbent owns the data.

---

## 6. Regulatory and partner landscape

### IRA rules that matter for BimaCheck

From the Insurance (Microinsurance) Regulations 2020 (Kenya Law, LN 26 of 2020):

- **Section 14(1) — claims clock:** a microinsurer must pay or reject a claim within ten calendar days of notification, with written reasons for rejection. Up to ten more days only with Authority approval for reasonable cause. This is the legal pressure point BimaCheck relieves.
- **Section 17(2) — complaints:** must be resolved within seven calendar days. A held claim with a clear reason feeds this directly.
- **Section 5(d)-(e) — what counts as microinsurance:** daily premium cap of Ksh 40, sum insured cap of Ksh 500,000. Hospi-cash sits comfortably inside this.
- **Section 5(f) — fixed-sum design:** benefits are paid as an agreed fixed sum regardless of actual loss. This is the legal definition of hospi-cash and the reason the product is simple to adjudicate by rule.
- **Sections 11-12 — plain language:** policy documents must use clear, plain language. BimaCheck's plain-language hold reasons align with this consumer-protection requirement.
- **Section 18 and 21 — distribution:** microinsurers may appoint trained intermediaries without separate Authority registration; commission capped at 15 percent of premium. Relevant to how a partner distributes, less so to the integrity layer itself.
- **General market context:** non-micro insurers work under a 90-day settlement window and have been fined for late payment (Invesco, Ksh 7.9 million). The regulator is actively pushing to fast-track claims, which is tailwind for a speed-and-compliance tool.

One caveat: BimaCheck is a tool sold to a licensed underwriter or scheme, not an underwriter itself. It does not need a microinsurance licence. It needs to help the licensed buyer meet these timelines and keep a clean audit trail. Position as infrastructure to the licensed party, not as a regulated insurer.

### Africa's Talking as the rails

Africa's Talking provides the USSD, SMS, Voice, and Airtime rails across Africa over 2G, which is the only technology that reaches the feature-phone member reliably. It actively backs insurtech, including the very hackathon this product targets. M-Pesa via Safaricom is the payout and trust layer. Building on Africa's Talking plus Daraja B2C is the correct, last-mile-reaching stack for this segment. It is also the lowest-friction integration story for a buyer who is already on these rails.

### Realistic first design partners (ranked)

1. **A hospi-cash operator with live M-Pesa payout volume.** Turaco is the clearest target: real hospi-cash book (1M+ lives via M-KOPA), real claims cost, M-Pesa payout already, and a verification step that is currently human. Hardest to land, highest validation.
2. **A SACCO or MFI welfare/benevolent fund.** Underserved, fraud-exposed, no incumbent, owns the member and the phone number. Easier to reach, faster to a pilot, lower deal value, but the cleanest place to prove the wedge and start a cross-scheme data network.
3. **A USSD-native micro-insurer.** Jamii (Imarisha Jamii) is the closest channel twin. They already run USSD plus M-Pesa, so BimaCheck slots behind their claims flow with minimal integration.
4. **A platform enabler as an integration route to many.** Lami or Inclusivity Solutions could carry BimaCheck as a fraud module to all their downstream insurers at once. Higher leverage, slower sales cycle.

Best first move: prove the engine on one SACCO welfare fund (fast, no incumbent, real fraud), and use that proof to open the Turaco-class conversation.

---

## Sources

- Standard, insurance penetration slips: https://www.standardmedia.co.ke/business/article/2001547715/insurance-penetration-slips-as-firms-target-underserved-groups
- Cytonn, Kenya Listed Insurance H1 2025: https://cytonn.com/topicals/kenya-listed-insurance-7
- Cytonn, Kenya Listed Insurance FY 2024: https://cytonn.com/topicals/kenya-listed-insurance-3
- Capital Business, IRA on penetration: https://www.capitalfm.co.ke/business/2025/07/insurance-penetration-key-to-sector-growth-ira-says/
- 2024 FinAccess Household Survey main report (CBK): https://www.centralbank.go.ke/wp-content/uploads/2024/12/2024-FINACCESS-HOUSEHOLD-SURVEY-MAIN-REPORT.pdf
- FSD Kenya, 2024 FinAccess key insights: https://www.fsdkenya.org/blogs-publications/2024-finaccess-household-survey-key-insights-into-kenyas-financial-landscape/
- AKI / IRA fraud reporting (Eastleigh Voice on IRA report): https://eastleighvoice.co.ke/business/214199/motor-vehicle-insurance-tops-fraud-cases-in-kenya-ira-report
- Business Now, insurance fraud economic threat (Ksh 33bn medical): https://businessnow.co.ke/why-insurance-fraud-is-an-economic-threat-to-kenya/
- AKI Information Paper on Insurance Fraud (PDF, image-based, not machine-readable on fetch): https://www.akinsure.com/content/uploads/documents/Information_Paper_on_Insurance_Fraud.pdf
- Daily Nation, Sh11bn stolen from SHA in six months: https://nation.africa/kenya/news/fake-claims-real-theft-sh11-billion-stolen-from-sha-in-six-months-5340278
- AllAfrica, audit fake claims cost SHA Sh11bn: https://allafrica.com/stories/202601280372.html
- Money254, Duale on Ksh11bn SHA fraud: https://www.money254.co.ke/post/ksh11-billion-stolen-through-fake-sha-claims---health-cs-news
- M-KOPA newsroom, 1M Kenyans hospital cash: https://www.m-kopa.com/newsroom/m-kopa-and-turaco-insurance-provide-free-insurance-coverage-to-more-than-1-million-kenyans
- IT News Africa, M-KOPA and Turaco 1M in one year: https://www.itnewsafrica.com/2025/04/m-kopa-and-turaco-deliver-hospital-cash-insurance-to-over-1-million-kenyans-in-one-year/
- Turaco terms and conditions (WhatsApp claims, 3 business days): https://www.turaco.insure/terms-condition
- BIMA / Milvik corporate: https://www.bimamobile.com/home/
- Lami (TechCrunch): https://techcrunch.com/2021/05/04/kenyas-lami-raises-1-8m-to-scale-api-insurance-platform-across-africa/
- Inclusivity Solutions vs Lami (CB Insights): https://www.cbinsights.com/compare/inclusivity-solutions-vs-lami-1
- Jamii / Imarisha Jamii and Linda Jamii (Safaricom press release): https://www.safaricom.co.ke/media-center-landing/press-releases/safaricom-britam-and-changamka-have-partnered-to-launch-linda-jamii-a-micro-insurance-medical-product-targeting-kenya-s-uninsured
- Insurance (Microinsurance) Regulations 2020 (Kenya Law): https://new.kenyalaw.org/akn/ke/act/ln/2020/26/eng@2020-03-06
- Business Daily, IRA fast-track claims: https://www.businessdailyafrica.com/bd/corporate/companies/insurance-regulator-seeks-to-fast-track-claims-payment-4829290
- Business Daily, nine insurers fined for late claims: https://www.businessdailyafrica.com/bd/economy/regulator-fines-nine-insurers-late-payment-of-claims-3676972
- Standard Health, private sector micro-insurance / informal sector: https://www.standardmedia.co.ke/health/health-science/article/2001545329/private-sector-bets-on-micro-insurance-to-close-healthcare-access-gap
- Microinsurance Network, 2024 Landscape: https://microinsurancenetwork.org/posts/the-2024-landscape-of-microinsurance-busting-myths-on-microinsurance
- Hazina Sacco Members Welfare Fund: https://www.hazinasacco.or.ke/services/members-welfare-fund
- Africa's Talking insurtech community / rails: https://community.africastalking.com/

### Flagged uncertainties

- A single trustworthy national feature-phone vs smartphone split for the informal hospi-cash member was not found. The device profile above is inferred from FinAccess 2024 mobile-money and exclusion data.
- BIMA/Milvik's current Kenya operating status was not verified. Confirm before treating them as a live target.
- The AKI Information Paper on Insurance Fraud PDF is image-based and did not parse on fetch; the Ksh 33bn medical-fraud figure is sourced from secondary reporting (Business Now) citing AKI, not read directly from the AKI paper.
- Hospi-cash-specific claim volumes and fraud rates (as opposed to medical and motor aggregates) are not separately reported in the sources found. The fraud-type mapping uses the SHA and NHIF record as the closest available proxy for the same patterns.
