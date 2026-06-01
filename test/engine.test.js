import test from 'node:test';
import assert from 'node:assert/strict';
import { decideClaim } from '../src/engine/index.js';

const FAC = {
  KIBERA: { code: 'KIBERA', name: 'Kibera Clinic', lat: -1.3133, lng: 36.7919 },
  THIKA: { code: 'THIKA', name: 'Thika Health Centre', lat: -1.0333, lng: 37.0693 },
};
const M = '254708374149';
const t0 = Date.parse('2026-06-25T09:00:00Z');
const min = (n) => n * 60 * 1000;
const claim = (over) => ({ member: M, claimType: 'hospicash', createdAt: t0, ...over });

test('decideClaim: APPROVED when nothing fires (the clean first claim)', () => {
  const ctx = {
    facilities: FAC,
    admissions: [{ member: M, facilityCode: 'KIBERA' }],
    priorClaims: [],
  };
  const out = decideClaim(claim({ facilityCode: 'KIBERA' }), ctx);
  assert.equal(out.decision, 'APPROVED');
  assert.equal(out.triggered.length, 0);
  assert.equal(out.leadReason, null);
});

test('decideClaim: HELD on the geo conflict (the fraud twin)', () => {
  const ctx = {
    facilities: FAC,
    admissions: [
      { member: M, facilityCode: 'KIBERA' },
      { member: M, facilityCode: 'THIKA' },
    ],
    priorClaims: [claim({ facilityCode: 'KIBERA' })],
  };
  const out = decideClaim(claim({ facilityCode: 'THIKA', createdAt: t0 + min(5) }), ctx);
  assert.equal(out.decision, 'HELD');
  assert.match(out.leadReason, /impossible/i);
});

test('decideClaim: geo reason leads when multiple rules fire', () => {
  // No admission seeded at THIKA (missingAdmission fires) AND geo conflict vs KIBERA claim.
  const ctx = {
    facilities: FAC,
    admissions: [{ member: M, facilityCode: 'KIBERA' }],
    priorClaims: [claim({ facilityCode: 'KIBERA' })],
  };
  const out = decideClaim(claim({ facilityCode: 'THIKA', createdAt: t0 + min(5) }), ctx);
  assert.equal(out.decision, 'HELD');
  assert.ok(out.triggered.length >= 2, `expected >=2 flags, got ${out.triggered.length}`);
  assert.match(out.leadReason, /impossible/i); // geo leads
});

test('decideClaim: never returns DENIED (invariant)', () => {
  const ctx = { facilities: FAC, admissions: [], priorClaims: [] };
  const out = decideClaim(claim({ facilityCode: 'KIBERA' }), ctx);
  assert.ok(out.decision === 'APPROVED' || out.decision === 'HELD');
  assert.notEqual(out.decision, 'DENIED');
});
