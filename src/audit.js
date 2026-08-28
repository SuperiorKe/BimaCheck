// Exportable decision ledger: turns claims into an IRA-defensible CSV an insurer
// can keep or hand to the regulator. One row per claim, with the named rule, the
// plain reason, the confidence, the decision time, and the payout outcome. The
// member is masked, in keeping with the Data Protection Act and the demo's
// synthetic-data rule.

const mask = (m) => {
  const s = String(m || '');
  return s.length >= 8 ? s.slice(0, 6) + '****' + s.slice(-2) : s;
};

const iso = (ts) => (ts ? new Date(Number(ts)).toISOString() : '');

// RFC 4180 cell: wrap every value in quotes and double any embedded quote, so a
// reason that contains a comma ("44km apart, 5 min apart") cannot break columns.
function cell(v) {
  const s = v == null ? '' : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export const AUDIT_COLUMNS = [
  'claim_id',
  'decided_at',
  'member',
  'facility',
  'claim_type',
  'decision',
  'rule',
  'confidence',
  'reason',
  'payout_status',
];

export function auditRow(c) {
  return [
    c.id,
    iso(c.decidedAt || c.createdAt),
    mask(c.member),
    c.facilityCode,
    c.claimType,
    c.decision || c.status || '',
    c.rule || (c.decision === 'APPROVED' ? 'none (clean)' : ''),
    c.confidence == null ? '' : c.confidence,
    c.reason || '',
    c.mpesaStatus || '',
  ];
}

export function auditCsv(claims) {
  const lines = [AUDIT_COLUMNS.map(cell).join(',')];
  for (const c of claims) lines.push(auditRow(c).map(cell).join(','));
  return lines.join('\r\n') + '\r\n';
}
