import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { generateBenchmark, runBenchmark } from '../src/engine/backtest.js';

test('generateBenchmark is deterministic for a given seed', () => {
  const a = generateBenchmark({ n: 200, seed: 7 });
  const b = generateBenchmark({ n: 200, seed: 7 });
  assert.deepEqual(a.labels, b.labels);
  assert.deepEqual(
    a.claims.map((c) => `${c.member}|${c.facilityCode}|${c.createdAt}`),
    b.claims.map((c) => `${c.member}|${c.facilityCode}|${c.createdAt}`)
  );
});

test('runBenchmark returns honest, well-formed metrics', () => {
  const r = runBenchmark({ n: 1000, seed: 1 });
  assert.ok(r.total >= 1000, `total ${r.total}`);
  assert.ok(r.fraud > 0 && r.honest > 0);
  // counts reconcile with the fraud/honest totals
  assert.equal(r.caught + r.missed, r.fraud);
  assert.equal(r.falseHolds + r.cleanPass, r.honest);
  // rates land in a believable band, not a rigged 100/0
  assert.ok(r.catchRatePct > 50 && r.catchRatePct < 100, `catch ${r.catchRatePct}`);
  assert.ok(r.falsePositiveRatePct > 0 && r.falsePositiveRatePct < 25, `fp ${r.falsePositiveRatePct}`);
  // the set deliberately holds fraud the rules miss and honest claims they flag
  assert.ok(r.missed > 0, 'expected some missed (stealth) fraud');
  assert.ok(r.falseHolds > 0, 'expected some false holds (noise)');
  // value blocked ties exactly to caught fraud and the benefit
  assert.equal(r.fraudValueBlockedKes, r.caught * config.benefitKes);
  assert.ok(r.medianDecisionMs >= 0);
});

test('runBenchmark attributes every catch to a named rule', () => {
  const r = runBenchmark({ n: 1000, seed: 1 });
  const named = ['geoTimeImpossible', 'missingAdmission', 'duplicateClaim', 'amountVelocity'];
  const tally = Object.entries(r.byRule);
  assert.ok(tally.length > 0);
  let sum = 0;
  for (const [name, count] of tally) {
    assert.ok(named.includes(name), `unexpected rule ${name}`);
    sum += count;
  }
  assert.equal(sum, r.caught); // every caught fraud maps to exactly one named rule
});
