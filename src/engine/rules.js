// Deterministic fraud rules for BimaCheck claim decisioning.
//
// Every rule has the SAME shape (DRY):
//   (claim, ctx) => { name, triggered, reason, confidence }
// `triggered: true` means a red flag is present, which pushes the claim to HELD.
// Rules are PURE: all data (admissions, prior claims, thresholds) arrives via
// `ctx`, so they touch no DB and no network and are trivially unit-tested.
// We deliberately use named deterministic rules, NOT a black-box model: every
// decision is explainable and auditable, which is the right call for a regulated
// auto-approve path.
//
//   ctx = {
//     facilities:  { [code]: { code, name, lat, lng } },
//     admissions:  [ { member, facilityCode } ],            // seeded source of truth
//     priorClaims: [ { member, facilityCode, claimType, createdAt } ], // before this claim
//     thresholds:  { dupWindowMin, geoMinKm, geoWindowMin }, // optional, defaults below
//   }
//   claim = { member, facilityCode, claimType, createdAt }  // createdAt: epoch ms

export const DEFAULT_THRESHOLDS = { dupWindowMin: 30, geoMinKm: 10, geoWindowMin: 30 };

const MIN_MS = 60 * 1000;

function thresholds(ctx) {
  return { ...DEFAULT_THRESHOLDS, ...(ctx.thresholds || {}) };
}

// Great-circle distance between two { lat, lng } points, in kilometres.
export function haversineKm(a, b) {
  const R = 6371; // earth mean radius, km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const normPhone = (n) => String(n || '').replace(/^\+/, '');

// RED FLAG: no hospital admission on record for this member at the claimed facility.
export function missingAdmission(claim, ctx) {
  const found = (ctx.admissions || []).some(
    (a) => normPhone(a.member) === normPhone(claim.member) && a.facilityCode === claim.facilityCode
  );
  const name = ctx.facilities?.[claim.facilityCode]?.name || claim.facilityCode;
  return {
    name: 'missingAdmission',
    triggered: !found,
    reason: found ? null : `No hospital admission on record for this member at ${name}.`,
    confidence: 0.9,
  };
}

// RED FLAG: same member billing the same facility for the same claim type twice
// inside the duplicate window (the classic double-bill of one admission).
export function duplicateClaim(claim, ctx) {
  const windowMs = thresholds(ctx).dupWindowMin * MIN_MS;
  const dup = (ctx.priorClaims || []).find(
    (p) =>
      p.member === claim.member &&
      p.facilityCode === claim.facilityCode &&
      p.claimType === claim.claimType &&
      Math.abs(claim.createdAt - p.createdAt) <= windowMs
  );
  return {
    name: 'duplicateClaim',
    triggered: Boolean(dup),
    reason: dup
      ? `Duplicate: this member already claimed at this facility ${Math.round(
          Math.abs(claim.createdAt - dup.createdAt) / MIN_MS
        )} min ago.`
      : null,
    confidence: 0.85,
  };
}

// RED FLAG (hero): same member claiming at two facilities too far apart to have
// physically reached both within the elapsed time. "Kibera and Thika at once."
export function geoTimeImpossible(claim, ctx) {
  const { geoMinKm, geoWindowMin } = thresholds(ctx);
  const windowMs = geoWindowMin * MIN_MS;
  const here = ctx.facilities?.[claim.facilityCode];
  // Defensive: missing coordinates -> cannot evaluate. Do not throw, do not flag.
  if (!here || here.lat == null || here.lng == null) {
    return { name: 'geoTimeImpossible', triggered: false, reason: null, confidence: 0 };
  }
  for (const p of ctx.priorClaims || []) {
    if (p.member !== claim.member) continue;
    if (p.facilityCode === claim.facilityCode) continue;
    if (Math.abs(claim.createdAt - p.createdAt) > windowMs) continue;
    const there = ctx.facilities?.[p.facilityCode];
    if (!there || there.lat == null || there.lng == null) continue;
    const km = haversineKm(here, there);
    if (km > geoMinKm) {
      const mins = Math.round(Math.abs(claim.createdAt - p.createdAt) / MIN_MS);
      return {
        name: 'geoTimeImpossible',
        triggered: true,
        reason: `Physically impossible: member filed at ${there.name || p.facilityCode} and ${here.name || claim.facilityCode}, ${Math.round(km)}km apart, ${mins} min apart.`,
        confidence: 0.95,
      };
    }
  }
  return { name: 'geoTimeImpossible', triggered: false, reason: null, confidence: 0.95 };
}

// Order matters: geo leads, because it is the most legible reason when several fire.
export const RULES = [geoTimeImpossible, missingAdmission, duplicateClaim];
