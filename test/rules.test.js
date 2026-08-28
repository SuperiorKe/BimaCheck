import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineKm,
  missingAdmission,
  duplicateClaim,
  geoTimeImpossible,
  amountVelocity,
} from '../src/engine/rules.js';

const FAC = {
  KIBERA: { code: 'KIBERA', name: 'Kibera Clinic', lat: -1.3133, lng: 36.7919 },
  THIKA: { code: 'THIKA', name: 'Thika Health Centre', lat: -1.0333, lng: 37.0693 },
  NEARK: { code: 'NEARK', name: 'Near Kibera', lat: -1.3140, lng: 36.7950 }, // ~0.4km from Kibera
  NOGEO: { code: 'NOGEO', name: 'No Coords', lat: null, lng: null },
};
const M = '254708374149';
const t0 = Date.parse('2026-06-25T09:00:00Z');
const min = (n) => n * 60 * 1000;
const claim = (over) => ({ member: M, claimType: 'hospicash', createdAt: t0, ...over });

// --- haversine ---
test('haversineKm: 1 degree of longitude at equator is ~111km', () => {
  const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(Math.abs(d - 111.19) < 0.5, `expected ~111.19, got ${d}`);
});

test('haversineKm: Kibera to Thika is >10km', () => {
  const d = haversineKm(FAC.KIBERA, FAC.THIKA);
  assert.ok(d > 10 && d < 60, `expected ~40km, got ${d}`);
});

// --- missingAdmission ---
test('missingAdmission: triggers when no admission record exists', () => {
  const r = missingAdmission(claim({ facilityCode: 'KIBERA' }), { facilities: FAC, admissions: [] });
  assert.equal(r.triggered, true);
  assert.match(r.reason, /No hospital admission/);
});

test('missingAdmission: clean when an admission exists', () => {
  const ctx = { facilities: FAC, admissions: [{ member: M, facilityCode: 'KIBERA' }] };
  const r = missingAdmission(claim({ facilityCode: 'KIBERA' }), ctx);
  assert.equal(r.triggered, false);
  assert.equal(r.reason, null);
});

// --- duplicateClaim ---
test('duplicateClaim: triggers for same member+facility+type inside window', () => {
  const ctx = {
    facilities: FAC,
    priorClaims: [claim({ facilityCode: 'KIBERA' })],
  };
  const r = duplicateClaim(claim({ facilityCode: 'KIBERA', createdAt: t0 + min(5) }), ctx);
  assert.equal(r.triggered, true);
});

test('duplicateClaim: clean outside the window', () => {
  const ctx = { facilities: FAC, priorClaims: [claim({ facilityCode: 'KIBERA' })] };
  const r = duplicateClaim(claim({ facilityCode: 'KIBERA', createdAt: t0 + min(45) }), ctx);
  assert.equal(r.triggered, false);
});

test('duplicateClaim: clean at a different facility', () => {
  const ctx = { facilities: FAC, priorClaims: [claim({ facilityCode: 'KIBERA' })] };
  const r = duplicateClaim(claim({ facilityCode: 'THIKA', createdAt: t0 + min(5) }), ctx);
  assert.equal(r.triggered, false);
});

test('duplicateClaim: clean with no prior claims', () => {
  const r = duplicateClaim(claim({ facilityCode: 'KIBERA' }), { facilities: FAC, priorClaims: [] });
  assert.equal(r.triggered, false);
});

// --- geoTimeImpossible (hero) ---
test('geoTimeImpossible: triggers for far facilities within the window', () => {
  const ctx = { facilities: FAC, priorClaims: [claim({ facilityCode: 'KIBERA' })] };
  const r = geoTimeImpossible(claim({ facilityCode: 'THIKA', createdAt: t0 + min(10) }), ctx);
  assert.equal(r.triggered, true);
  assert.match(r.reason, /impossible/i);
});

test('geoTimeImpossible: clean when enough time has elapsed', () => {
  const ctx = { facilities: FAC, priorClaims: [claim({ facilityCode: 'KIBERA' })] };
  const r = geoTimeImpossible(claim({ facilityCode: 'THIKA', createdAt: t0 + min(45) }), ctx);
  assert.equal(r.triggered, false);
});

test('geoTimeImpossible: clean for a nearby facility', () => {
  const ctx = { facilities: FAC, priorClaims: [claim({ facilityCode: 'KIBERA' })] };
  const r = geoTimeImpossible(claim({ facilityCode: 'NEARK', createdAt: t0 + min(10) }), ctx);
  assert.equal(r.triggered, false);
});

test('geoTimeImpossible: defensive when coordinates are missing (no throw, no flag)', () => {
  const ctx = { facilities: FAC, priorClaims: [claim({ facilityCode: 'KIBERA' })] };
  const r = geoTimeImpossible(claim({ facilityCode: 'NOGEO', createdAt: t0 + min(10) }), ctx);
  assert.equal(r.triggered, false);
});

// --- amountVelocity ---
test('amountVelocity: triggers on the 3rd claim from one member within the window', () => {
  const ctx = {
    facilities: FAC,
    priorClaims: [
      claim({ facilityCode: 'KIBERA', createdAt: t0 - min(30) }),
      claim({ facilityCode: 'THIKA', createdAt: t0 - min(10) }),
    ],
  };
  const r = amountVelocity(claim({ facilityCode: 'NEARK' }), ctx);
  assert.equal(r.triggered, true);
  assert.match(r.reason, /velocity/i);
});

test('amountVelocity: clean with one prior claim in the window', () => {
  const ctx = { facilities: FAC, priorClaims: [claim({ facilityCode: 'KIBERA', createdAt: t0 - min(10) })] };
  const r = amountVelocity(claim({ facilityCode: 'THIKA' }), ctx);
  assert.equal(r.triggered, false);
});

test('amountVelocity: clean when prior claims fall outside the window', () => {
  const ctx = {
    facilities: FAC,
    priorClaims: [
      claim({ facilityCode: 'KIBERA', createdAt: t0 - min(2000) }),
      claim({ facilityCode: 'THIKA', createdAt: t0 - min(3000) }),
    ],
  };
  const r = amountVelocity(claim({ facilityCode: 'NEARK' }), ctx);
  assert.equal(r.triggered, false);
});
