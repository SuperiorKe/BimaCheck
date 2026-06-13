// ═══════════════════════════════════════════════════════
//  NDUTA'S GARDEN — CONFIGURATION
//  Fill in your details here. Never commit this file with
//  real keys if the repo is public.
// ═══════════════════════════════════════════════════════

const CONFIG = {
  // ── Identity ──────────────────────────────────────────
  her_name:    'Nduta',
  your_name:   'SuperiorKe',

  // ── The day you became a couple ───────────────────────
  start_date:  '2026-06-12',

  // ── Supabase ──────────────────────────────────────────
  // Get these from: supabase.com → your project → Settings → API
  supabase_url:   'YOUR_SUPABASE_URL',
  supabase_anon:  'YOUR_SUPABASE_ANON_KEY',

  // ── Anthropic (AI love letters) ────────────────────────
  // Get this from: console.anthropic.com → API Keys
  // NOTE: This key is visible in browser source. Fine for a
  // private personal project — never share the URL publicly.
  anthropic_key:  'YOUR_ANTHROPIC_API_KEY',

  // ── Time-locked surprises (seeds) ─────────────────────
  // Add sealed messages that bloom on specific dates.
  // 'unlocks_at' is an ISO date string.
  seeds: [
    {
      id: 'seed_1',
      label: 'A promise',
      unlocks_at: '2026-07-12',   // 1 month anniversary
      message: 'One month in and I am more sure of you than ever. Here is what I promise you going forward…',
    },
    {
      id: 'seed_2',
      label: 'Your birthday surprise',
      unlocks_at: '2026-12-25',   // change to her actual birthday
      message: 'Happy birthday, Nduta. I wrote this months ago just for today…',
    },
  ],
};
