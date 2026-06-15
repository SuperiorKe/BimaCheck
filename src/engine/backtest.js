// Benchmark harness: measure the deterministic engine on a labelled synthetic
// dataset, so BimaCheck can state a fraud catch rate, a false-positive rate, and
// a value-blocked figure instead of a story.
//
// HONESTY MATTERS. The set is built with real imperfection: a slice of fraud the
// rules cannot see (stealth -> false negatives) and a slice of honest members the
// geo threshold wrongly flags (noise -> false positives). So the numbers are
// earned by the same decideClaim() that runs on a live claim, not rigged. These
// are synthetic-benchmark numbers; real rates come from a pilot on an insurer's
// own data.
import { performance } from 'node:perf_hooks';
import { decideClaim } from './index.js';
import { config } from '../config.js';

// Seeded PRNG (mulberry32): the same seed yields the same claims and the same
// numbers, so an insurer asking you to "run it again" sees a stable result.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN = 60 * 1000;

// A handful of real facilities. KIBERA + MOMBASA are ~440km apart (always
// geo-impossible inside the window). KIBERA + RUARAKA are ~14km apart: just over
// the 10km threshold but a plausible same-day double visit, which is how an
// honest member earns a false positive.
const BENCH_FACILITIES = {
  KIBERA: { code: 'KIBERA', name: 'Kibera Clinic', lat: -1.3133, lng: 36.7919 },
  RUARAKA: { code: 'RUARAKA', name: 'Ruaraka Health', lat: -1.2100, lng: 36.8700 },
  THIKA: { code: 'THIKA', name: 'Thika Health Centre', lat: -1.0333, lng: 37.0693 },
  MOMBASA: { code: 'MOMBASA', name: 'Mombasa General', lat: -4.0435, lng: 39.6682 },
  KISUMU: { code: 'KISUMU', name: 'Kisumu County', lat: -0.0917, lng: 34.768 },
  NAKURU: { code: 'NAKURU', name: 'Nakuru PGH', lat: -0.3031, lng: 36.08 },
};

// Build a labelled benchmark. Each episode uses a fresh member, so claims from
// one episode never affect another. Returns claims (with a stable label array),
// the facilities map, and the admission records the honest claims rely on.
export function generateBenchmark({ n = 1000, seed = 1 } = {}) {
  const rnd = mulberry32(seed);
  const facilities = BENCH_FACILITIES;
  const codes = Object.keys(facilities);
  const admissions = [];
  const claims = [];
  const labels = [];
  let memberSeq = 0;
  let clock = Date.parse('2026-06-01T08:00:00Z');

  const nextMember = () => `2547${String(10000000 + memberSeq++).slice(-8)}`;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  function add(member, facilityCode, createdAt, label, withAdmission = true) {
    if (withAdmission) admissions.push({ member, facilityCode });
    claims.push({ id: claims.length + 1, member, facilityCode, claimType: 'hospicash', createdAt });
    labels.push(label);
  }

  // Episode mix (weights drawn proportionally, not forced, so the rates emerge).
  const episodes = [
    ['honestSingle', 0.55],
    ['fraudMissing', 0.10],
    ['fraudGeo', 0.08],
    ['fraudDup', 0.07],
    ['fraudVelocity', 0.06],
    ['stealthFraud', 0.05], // fraud the rules cannot see -> false negatives
    ['honestNoise', 0.05], // legit member tripping the geo threshold -> false positives
  ];
  const totalW = episodes.reduce((s, [, w]) => s + w, 0);
  const draw = () => {
    let r = rnd() * totalW;
    for (const [name, w] of episodes) if ((r -= w) <= 0) return name;
    return 'honestSingle';
  };

  while (claims.length < n) {
    clock += (5 + Math.floor(rnd() * 55)) * MIN;
    const m = nextMember();
    switch (draw()) {
      case 'fraudMissing':
        add(m, pick(codes), clock, 'fraud', false); // no admission on record
        break;
      case 'fraudGeo':
        add(m, 'KIBERA', clock, 'honest');
        add(m, 'MOMBASA', clock + 10 * MIN, 'fraud'); // ~440km in 10 min
        break;
      case 'fraudDup': {
        const f = pick(codes);
        add(m, f, clock, 'honest');
        add(m, f, clock + 8 * MIN, 'fraud'); // same facility inside 30 min
        break;
      }
      case 'fraudVelocity': {
        const f = pick(codes);
        add(m, f, clock, 'honest');
        add(m, f, clock + 60 * MIN, 'honest'); // >30 min apart, no duplicate
        add(m, f, clock + 120 * MIN, 'fraud'); // 3rd claim in 24h -> velocity
        break;
      }
      case 'stealthFraud':
        add(m, pick(codes), clock, 'fraud'); // has admission, no anomaly -> missed
        break;
      case 'honestNoise':
        add(m, 'KIBERA', clock, 'honest');
        add(m, 'RUARAKA', clock + 25 * MIN, 'honest'); // ~14km, plausible, but flagged
        break;
      default:
        add(m, pick(codes), clock, 'honest');
    }
  }
  return { claims, labels, facilities, admissions };
}

// Run the engine over a benchmark and return the measured metrics. The engine is
// the exact decideClaim() used in production, so the numbers describe the real
// decision path.
export function runBenchmark(opts = {}) {
  const benefitKes = opts.benefitKes ?? config.benefitKes;
  const { claims, labels, facilities, admissions } = generateBenchmark(opts);

  const ordered = claims
    .map((c, i) => ({ c, label: labels[i] }))
    .sort((a, b) => a.c.createdAt - b.c.createdAt);

  const processed = [];
  const times = [];
  let caught = 0; // true positive: fraud held
  let missed = 0; // false negative: fraud approved
  let falseHolds = 0; // false positive: honest held
  let cleanPass = 0; // true negative: honest approved
  const byRule = {};

  for (const { c, label } of ordered) {
    const t = performance.now();
    const out = decideClaim(c, { facilities, admissions, priorClaims: processed });
    times.push(performance.now() - t);
    processed.push(c);

    const held = out.decision === 'HELD';
    if (label === 'fraud') {
      if (held) {
        caught++;
        const rule = out.triggered[0]?.name || 'unknown';
        byRule[rule] = (byRule[rule] || 0) + 1;
      } else {
        missed++;
      }
    } else if (held) {
      falseHolds++;
    } else {
      cleanPass++;
    }
  }

  const fraud = caught + missed;
  const honest = falseHolds + cleanPass;
  times.sort((a, b) => a - b);
  const median = times.length ? times[Math.floor(times.length / 2)] : 0;
  const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 1000) / 10);

  return {
    total: fraud + honest,
    fraud,
    honest,
    caught,
    missed,
    falseHolds,
    cleanPass,
    catchRatePct: pct(caught, fraud),
    falsePositiveRatePct: pct(falseHolds, honest),
    fraudValueBlockedKes: caught * benefitKes,
    medianDecisionMs: Math.round(median * 1000) / 1000,
    byRule,
    seed: opts.seed ?? 1,
  };
}
