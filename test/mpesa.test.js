import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import {
  insertClaim,
  getClaim,
  setDecision,
  linkConversation,
  getClaimIdByConversation,
  __resetClaims,
} from '../src/db.js';
import { confirmPayout, assumePayout, requestPayout, b2cResult, b2cTimeout, darajaTransport } from '../src/mpesa.js';

const M = '254708374149';
beforeEach(() => {
  __resetClaims();
  // Force offline/dry-run regardless of a local .env; individual tests opt into
  // the live branch by setting config.daraja.key themselves.
  config.daraja.key = '';
  config.at.apiKey = '';
});

function approvedClaim() {
  const id = insertClaim({ member: M, facilityCode: 'KIBERA', claimType: 'hospicash', createdAt: Date.now() });
  setDecision(id, 'APPROVED', null);
  return id;
}
function mockRes() {
  return { body: null, json(o) { this.body = o; return this; } };
}

test('confirmPayout is single-shot: pays once, second call is a no-op', async () => {
  const id = approvedClaim();
  assert.equal(await confirmPayout(id), true);
  assert.equal(getClaim(id).status, 'PAID');
  assert.equal(await confirmPayout(id), false);
});

test('CRITICAL: 8s fallback assumes (not PAID); a confirming callback promotes to PAID once', async () => {
  const id = approvedClaim();
  linkConversation(id, 'CONV-LATE');
  // The 8s fallback fires before any Daraja callback: the payout is ASSUMED, not paid.
  assert.equal(await assumePayout(id), true);
  let c = getClaim(id);
  assert.equal(c.status, 'APPROVED');      // never claims PAID on an unconfirmed payout
  assert.equal(c.mpesaStatus, 'ASSUMED');
  // The real Daraja result callback then confirms the transfer.
  await b2cResult({ body: { Result: { ResultCode: 0, ConversationID: 'CONV-LATE' } } }, mockRes());
  c = getClaim(id);
  assert.equal(c.status, 'PAID');
  assert.equal(c.mpesaStatus, 'PAID');
  // A duplicate late callback cannot pay or notify twice.
  assert.equal(await confirmPayout(id), false);
});

test('CRITICAL: an assumed payout that later FAILS is marked FAILED, never PAID', async () => {
  const id = approvedClaim();
  linkConversation(id, 'CONV-ASSUME-FAIL');
  assert.equal(await assumePayout(id), true);
  assert.equal(getClaim(id).mpesaStatus, 'ASSUMED');
  await b2cResult(
    { body: { Result: { ResultCode: 1, ResultDesc: 'cancelled', ConversationID: 'CONV-ASSUME-FAIL' } } },
    mockRes()
  );
  const c = getClaim(id);
  assert.notEqual(c.status, 'PAID');       // the contradiction the old fallback caused is gone
  assert.equal(c.mpesaStatus, 'FAILED');
});

test('a failure callback never downgrades an already-confirmed PAID claim', async () => {
  const id = approvedClaim();
  linkConversation(id, 'CONV-PAID-THEN-FAIL');
  assert.equal(await confirmPayout(id), true); // confirmed paid
  await b2cResult(
    { body: { Result: { ResultCode: 1, ResultDesc: 'late failure', ConversationID: 'CONV-PAID-THEN-FAIL' } } },
    mockRes()
  );
  const c = getClaim(id);
  assert.equal(c.status, 'PAID');
  assert.equal(c.mpesaStatus, 'PAID');     // markFailed guard refuses to contradict
});

test('b2cResult success -> claim PAID', async () => {
  const id = approvedClaim();
  linkConversation(id, 'CONV-OK');
  await b2cResult({ body: { Result: { ResultCode: 0, ConversationID: 'CONV-OK' } } }, mockRes());
  assert.equal(getClaim(id).status, 'PAID');
});

test('b2cResult failure -> mpesa FAILED, not paid', async () => {
  const id = approvedClaim();
  linkConversation(id, 'CONV-FAIL');
  await b2cResult(
    { body: { Result: { ResultCode: 1, ResultDesc: 'insufficient funds', ConversationID: 'CONV-FAIL' } } },
    mockRes()
  );
  const c = getClaim(id);
  assert.notEqual(c.status, 'PAID');
  assert.equal(c.mpesaStatus, 'FAILED');
});

test('b2cResult for unknown ConversationID is ignored (no throw)', async () => {
  const res = mockRes();
  await b2cResult({ body: { Result: { ResultCode: 0, ConversationID: 'NOPE' } } }, res);
  assert.deepEqual(res.body, { ResultCode: 0, ResultDesc: 'received' });
});

test('requestPayout (with creds) dispatches via transport, links conversation, arms fallback', async () => {
  const id = approvedClaim();
  const prevKey = config.daraja.key;
  config.daraja.key = 'test-key'; // force the live (non-dry-run) branch
  let called = false;
  const timer = await requestPayout(getClaim(id), {
    transport: async () => {
      called = true;
      return { ConversationID: 'CONV-X', ResponseCode: '0' };
    },
    fallbackMs: 50,
  });
  config.daraja.key = prevKey;

  assert.equal(called, true);
  assert.equal(getClaim(id).mpesaStatus, 'REQUESTED');
  assert.equal(getClaimIdByConversation('CONV-X'), id);
  clearTimeout(timer); // don't let the 50ms fallback fire after the test
});

test('darajaTransport sends PartyB as a bare MSISDN, stripping the + AT prepends', async () => {
  const id = insertClaim({ member: '+254708374149', facilityCode: 'KIBERA', claimType: 'hospicash', createdAt: Date.now() });
  setDecision(id, 'APPROVED', null);

  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    if (String(url).includes('/oauth/')) return { json: async () => ({ access_token: 'tok' }) };
    return { json: async () => ({ ConversationID: 'CONV-Z', ResponseCode: '0' }) };
  };
  try {
    await darajaTransport(getClaim(id));
  } finally {
    globalThis.fetch = realFetch;
  }

  const payReq = calls.find((c) => c.url.includes('/b2c/'));
  const body = JSON.parse(payReq.opts.body);
  assert.equal(body.PartyB, '254708374149'); // not +254708374149 -> avoids 400.002.02 Invalid PartyB
});

test('requestPayout (no creds) dry-runs and confirms immediately', async () => {
  const id = approvedClaim();
  await requestPayout(getClaim(id)); // config has no daraja.key in tests
  assert.equal(getClaim(id).status, 'PAID');
});

test('b2cTimeout acknowledges', () => {
  const res = mockRes();
  b2cTimeout({ body: {} }, res);
  assert.match(JSON.stringify(res.body), /received/i);
});
