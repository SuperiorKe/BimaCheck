// Claims persistence + engine-context assembly, on the built-in node:sqlite.
//
// Claim status lifecycle:
//   PENDING --decide--> APPROVED --payout--> PAID
//                  \--> HELD (terminal until a human acts)
//
// facilities + admissions are static seed data (the facility-confirmed source
// of truth), loaded from JSON. Only claims are mutable, so only claims live in
// the DB. buildCtx() assembles exactly what the pure engine needs.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const facilities = JSON.parse(readFileSync(join(here, 'seed', 'facilities.json'), 'utf8'));
export const admissions = JSON.parse(readFileSync(join(here, 'seed', 'admissions.json'), 'utf8'));

const db = new DatabaseSync(process.env.DB_PATH || ':memory:');
db.exec(`
  CREATE TABLE IF NOT EXISTS claims (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    member        TEXT    NOT NULL,
    facility_code TEXT    NOT NULL,
    claim_type    TEXT    NOT NULL,
    created_at    INTEGER NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'PENDING',
    decision      TEXT,
    reason        TEXT,
    rule          TEXT,
    confidence    REAL,
    decided_at    INTEGER,
    mpesa_status  TEXT,
    conversation_id TEXT
  );
`);

function rowToClaim(row) {
  if (!row) return null;
  return {
    id: row.id,
    member: row.member,
    facilityCode: row.facility_code,
    claimType: row.claim_type,
    createdAt: row.created_at,
    status: row.status,
    decision: row.decision,
    reason: row.reason,
    rule: row.rule,
    confidence: row.confidence,
    decidedAt: row.decided_at,
    mpesaStatus: row.mpesa_status,
    conversationId: row.conversation_id,
  };
}

export function insertClaim({ member, facilityCode, claimType, createdAt }) {
  const r = db
    .prepare(`INSERT INTO claims (member, facility_code, claim_type, created_at) VALUES (?, ?, ?, ?)`)
    .run(member, facilityCode, claimType, createdAt);
  return Number(r.lastInsertRowid);
}

export function getClaim(id) {
  return rowToClaim(db.prepare(`SELECT * FROM claims WHERE id = ?`).get(id));
}

export function listClaims() {
  return db.prepare(`SELECT * FROM claims ORDER BY id DESC`).all().map(rowToClaim);
}

// Prior claims by this member, strictly before the given claim time (for duplicate/geo rules).
export function priorClaims(member, beforeTs) {
  return db
    .prepare(`SELECT * FROM claims WHERE member = ? AND created_at < ? ORDER BY created_at`)
    .all(member, beforeTs)
    .map(rowToClaim);
}

// Record the engine's decision plus the named lead rule and its confidence, and
// stamp the decision time. rule/confidence are null for a clean approval. This
// is what the audit export reads, so the regulator sees a named, timed decision.
export function setDecision(id, decision, reason, rule = null, confidence = null) {
  db.prepare(
    `UPDATE claims SET status = ?, decision = ?, reason = ?, rule = ?, confidence = ?, decided_at = ? WHERE id = ?`
  ).run(decision, decision, reason ?? null, rule ?? null, confidence ?? null, Date.now(), id);
}

// Single-shot guard: transition to PAID at most once. Returns true only for the
// call that actually made the transition, so a late B2C callback arriving after
// the 8s fallback cannot fire a second "approved" SMS or imply a second payout.
export function markPaid(id) {
  const r = db
    .prepare(`UPDATE claims SET status = 'PAID', mpesa_status = 'PAID' WHERE id = ? AND status <> 'PAID'`)
    .run(id);
  return r.changes > 0;
}

// The live B2C fallback fired but Daraja has not confirmed. Record the payout as
// ASSUMED (dispatched, unconfirmed) without claiming PAID. Never downgrades a
// confirmed payout, and is single-shot. Returns true only for the call that set
// ASSUMED.
export function markAssumed(id) {
  const r = db
    .prepare(
      `UPDATE claims SET mpesa_status = 'ASSUMED'
         WHERE id = ? AND status <> 'PAID'
           AND (mpesa_status IS NULL OR mpesa_status NOT IN ('PAID', 'ASSUMED'))`
    )
    .run(id);
  return r.changes > 0;
}

// A Daraja failure or timeout for a payout that was never confirmed. Marks it
// FAILED without contradicting a claim that already reached PAID.
export function markFailed(id) {
  const r = db
    .prepare(`UPDATE claims SET mpesa_status = 'FAILED' WHERE id = ? AND status <> 'PAID'`)
    .run(id);
  return r.changes > 0;
}

export function setMpesaStatus(id, status) {
  db.prepare(`UPDATE claims SET mpesa_status = ? WHERE id = ?`).run(status, id);
}

// Map the Daraja-assigned ConversationID to our claim, so the async result
// callback can find which claim it belongs to.
export function linkConversation(id, conversationId) {
  db.prepare(`UPDATE claims SET conversation_id = ? WHERE id = ?`).run(conversationId, id);
}

export function getClaimIdByConversation(conversationId) {
  const r = db.prepare(`SELECT id FROM claims WHERE conversation_id = ?`).get(conversationId);
  return r ? r.id : null;
}

export function buildCtx(claim) {
  return {
    facilities,
    admissions,
    priorClaims: priorClaims(claim.member, claim.createdAt),
  };
}

// Test helper only.
export function __resetClaims() {
  db.exec(`DELETE FROM claims`);
}
