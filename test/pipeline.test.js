// Integration: USSD-persisted claim -> worker -> decision -> SMS (dry-run).
// No mocks needed: sendSms dry-runs without an API key, so we assert on the
// resulting claim state in the DB.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { insertClaim, getClaim, __resetClaims } from '../src/db.js';
import { processClaim } from '../src/worker.js';

const M = '254708374149'; // seeded with admissions at KIBERA and THIKA
const t0 = Date.parse('2026-06-25T09:00:00Z');
const min = (n) => n * 60 * 1000;

beforeEach(() => __resetClaims());

test('clean claim (admission on record, no prior) -> APPROVED + PAID', async () => {
  const id = insertClaim({ member: M, facilityCode: 'KIBERA', claimType: 'hospicash', createdAt: t0 });
  await processClaim(id);
  const c = getClaim(id);
  assert.equal(c.decision, 'APPROVED');
  assert.equal(c.status, 'PAID');
  assert.equal(c.mpesaStatus, 'PAID');
});

test('geo-impossible twin -> HELD with the geo reason', async () => {
  const id1 = insertClaim({ member: M, facilityCode: 'KIBERA', claimType: 'hospicash', createdAt: t0 });
  await processClaim(id1);
  const id2 = insertClaim({ member: M, facilityCode: 'THIKA', claimType: 'hospicash', createdAt: t0 + min(5) });
  await processClaim(id2);

  assert.equal(getClaim(id1).status, 'PAID'); // first claim still paid
  const c2 = getClaim(id2);
  assert.equal(c2.decision, 'HELD');
  assert.equal(c2.status, 'HELD');
  assert.match(c2.reason, /impossible/i);
});

test('processing an unknown claim id is a no-op (does not throw)', async () => {
  await processClaim(999999);
  assert.equal(getClaim(999999), null);
});
