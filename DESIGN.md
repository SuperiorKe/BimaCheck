# Design System — BimaCheck

## Product Context
- **What this is:** Real-time hospi-cash claims integrity console for Kenyan insurers and SHA-style funds
- **Who it's for:** Claims adjusters and fraud investigators at a licensed insurer; B2B ops staff, not consumers
- **Space/industry:** Kenyan InsurTech / RegTech / African informal-economy fintech
- **Project type:** Operations dashboard — live claims feed, fraud rule outcomes, M-Pesa payout status
- **Memorable thing:** "This is serious software for serious work."

## Aesthetic Direction
- **Direction:** Industrial Precision — financial terminal energy, not SaaS dashboard
- **Decoration level:** Minimal — typography and data density do all the work
- **Mood:** The tool that was already running before you arrived. No decoration earns its place. Every claim ID is data. Every status is a decision. The typeface knows the difference.
- **Reference:** Bloomberg Terminal, ICU monitoring dashboards, M-Pesa transaction ledgers — not Stripe, not Brex, not a startup sales page

## Typography
- **Data / IDs / Numbers / Times:** IBM Plex Mono (400, 600) — every phone number, claim ID, timestamp, KES amount. Monospace data eliminates visual drift in live-updating tables; every digit exactly the same width.
- **UI prose / Reasons / Labels:** DM Sans (300, 400, 500, optical size 9–40) — fraud rule reasons, helper text, taglines, column headers
- **Loading:** Google Fonts — `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&display=swap`
- **Blacklisted for this project:** Inter, Roboto, Space Grotesk, system-ui as primary — "I gave up on typography" signals
- **Scale:**
  - 11px — column headers, badges, muted labels (IBM Plex Mono, uppercase, 0.06–0.1em letter-spacing)
  - 12px — data fields, reasons, secondary text
  - 13px — primary table cell text
  - 14px — body default
  - 28–32px — specimen / hero display (IBM Plex Mono 600)

## Color
- **Approach:** Restrained — one status-color per decision state, one accent for UI affordances, the rest neutrals
- **Canvas:** `#0A0C0F` — near-black with barely-perceptible blue undertone; not warm (warmth implies reassurance; this product does not reassure)
- **Surface:** `#111418` — panel/table header background
- **Raised:** `#161a22` — hover state
- **Border:** `#1E2430` — structural lines, cold
- **Text:** `#D8DDE8` — desaturated blue-white; not warm cream
- **Dim:** `#8C95A8` — secondary text
- **Muted:** `#5A6478` — column headers, helper labels, all-caps UI labels
- **Paid / Cleared:** `#00C896` — aquamarine, not traffic-light green; reads as "cleared" not "safe"; no red-green accessibility conflict against dark canvas
- **Held / Deferred:** `#E8A020` — amber-gold; held is deferred judgment, not danger; the product's most important state deserves visual weight
- **Pending:** `#4A5878` — recedes completely until decided; claims in flight are background noise
- **Failed:** `#C43F3F` — B2C transfer failures; used sparingly
- **Accent / UI:** `#4B7BFF` — interactive affordances only (buttons, selection); never used in data status columns
- **Dark mode:** This IS the dark mode. No light mode variant planned.
- **Status background washes:**
  - Held: `rgba(232,160,32,.10)`
  - Paid: `rgba(0,200,150,.09)`
  - Failed: `rgba(196,63,63,.10)`
  - Pending: transparent

## Spacing
- **Base unit:** 4px
- **Density:** Compact — this is an ops tool, not a marketing page
- **Scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
- **Table cell padding:** 11px vertical, 16px horizontal (left 20px for first column)
- **Header height:** 44px (terminal status bar)

## Layout
- **Approach:** Grid-disciplined — strict table columns, no asymmetry
- **Max content width:** 1120px
- **Border radius:** 3px on containers (surface blocks, specimens); 2px on inline elements; never `999px` pill radius on status badges
- **Header:** Single 44px bar — wordmark + separator + tagline + live stats inline. No hero section. The table is the product.

## Status Display — The Core Departure
**Left-border stripe, not pill badges.** Each table row carries a 3px left-border in its status color. No background fill on PAID or PENDING rows. HELD rows get a 10% amber wash — the most important state gets the most visual weight. The decision label text stays in its column, undecorated, IBM Plex Mono, uppercase.

This replaces the rounded pill badge (`border-radius:999px`) pattern borrowed from GitHub Issues / project management tools. A fraud decision is not a ticket. The stripe is the pattern used by industrial monitoring software — Bloomberg Terminal, ICU dashboards, SCADA consoles.

Implementation:
```css
tbody tr { border-left: 3px solid transparent; }
tbody tr.st-paid { border-left-color: #00C896; }
tbody tr.st-held { border-left-color: #E8A020; background: rgba(232,160,32,.10); }
tbody tr.st-pend { border-left-color: #4A5878; }
tbody tr.st-fail { border-left-color: #C43F3F; background: rgba(196,63,63,.10); }
```

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Live indicator:** 6px circle, `var(--paid)` color, opacity pulse 2s ease-in-out (100% → 30% → 100%) — signals feed is running without performing urgency
- **Row hover:** background transition 100ms — `var(--raised)` on hover
- **Nothing else moves.** No entrance animations, no sparklines, no decorative motion.
- **Easing:** ease-out for enters, ease-in for exits
- **Duration:** micro 50–100ms, short 150ms (hover), nothing longer in this product

## CSS Custom Properties — Implementation Reference
```css
:root {
  --canvas:  #0A0C0F;
  --surface: #111418;
  --raised:  #161a22;
  --border:  #1E2430;
  --text:    #D8DDE8;
  --dim:     #8C95A8;
  --muted:   #5A6478;
  --paid:    #00C896;
  --paid-bg: rgba(0,200,150,.09);
  --held:    #E8A020;
  --held-bg: rgba(232,160,32,.10);
  --pend:    #4A5878;
  --failed:  #C43F3F;
  --fail-bg: rgba(196,63,63,.10);
  --accent:  #4B7BFF;
  --mono: "IBM Plex Mono","Courier New",monospace;
  --sans: "DM Sans",system-ui,sans-serif;
}
```

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-02 | IBM Plex Mono for all data fields | Both Claude and Claude subagent independently chose monospace for data; cross-model signal. Financial terminal precision. |
| 2026-06-02 | Amber-gold (#E8A020) for HELD | Both voices independently chose amber. HELD is deferred judgment, not warning. The product's most important state. |
| 2026-06-02 | Aquamarine (#00C896) for PAID | Not traffic-light green. Reads as "cleared" not "safe"; avoids red-green pair. |
| 2026-06-02 | Left-border stripe replaces pill badges | Pill badges frame a fraud decision as a ticket status. Stripe is the industrial monitoring pattern. Serious software. |
| 2026-06-02 | 44px terminal header, no hero | Table is the product. Maximum screen real estate for claims. Header is the utility room. |
| 2026-06-02 | DM Sans for UI prose | Quiet geometry, doesn't compete with IBM Plex Mono data fields. Legible at 12-13px. Not overused in this category. |
| 2026-06-02 | No light mode | This IS the dark mode. Ops staff stare at it for hours; expected in financial tooling. |
