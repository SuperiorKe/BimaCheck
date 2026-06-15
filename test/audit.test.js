import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { insertClaim, getClaim, setDecision, __resetClaims } from '../src/db.js';
import { auditCsv } from '../src/audit.js';

beforeEach(() => __resetClaims());

test('setDecision persists the named rule, confidence, and decision time', () => {
  const id = insertClaim({ member: '254708374149', facilityCode: 'THIKA', claimType: 'hospicash', createdAt: Date.now() });
  const before = Date.now();
  setDecision(id, 'HELD', 'Physically impossible: 44km apart, 5 min apart.', 'geoTimeImpossible', 0.95);
  const c = getClaim(id);
  assert.equal(c.decision, 'HELD');
  assert.equal(c.rule, 'geoTimeImpossible');
  assert.equal(c.confidence, 0.95);
  assert.ok(c.decidedAt >= before);
});

test('auditCsv has a header row and one row per claim, with the member masked', () => {
  const id = insertClaim({ member: '254708374149', facilityCode: 'KIBERA', claimType: 'hospicash', createdAt: Date.parse('2026-06-25T09:00:00Z') });
  setDecision(id, 'APPROVED', null, null, null);
  const csv = auditCsv([getClaim(id)]);
  const rows = csv.trim().split('\r\n');
  assert.equal(rows.length, 2); // header + one claim
  assert.match(rows[0], /^"claim_id","decided_at","member"/);
  assert.match(rows[1], /"254708\*\*\*\*49"/); // masked
  assert.ok(!rows[1].includes('254708374149'), 'the raw member number must never appear');
  assert.match(rows[1], /"none \(clean\)"/); // approved claim shows no rule fired
});

test('auditCsv quotes the reason so its commas cannot break the columns', () => {
  const claim = {
    id: 7,
    createdAt: 1,
    decidedAt: 2,
    member: '254700111222',
    facilityCode: 'THIKA',
    claimType: 'hospicash',
    decision: 'HELD',
    status: 'HELD',
    rule: 'geoTimeImpossible',
    confidence: 0.95,
    reason: 'Physically impossible: Kibera and Thika, 44km apart, 5 min apart.',
    mpesaStatus: null,
  };
  const dataRow = auditCsv([claim]).trim().split('\r\n')[1];
  const cells = dataRow.match(/"(?:[^"]|"")*"/g);
  assert.equal(cells.length, 10); // exactly the ten declared columns
  assert.ok(dataRow.includes('44km apart, 5 min apart'));
});
