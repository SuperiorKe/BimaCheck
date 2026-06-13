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
import { confirmPayout, requestPayout, b2cResult, b2cTimeout, darajaTransport } from '../src/mpesa.js';

const M = '254708374149';
beforeEach(() => __resetClaims());

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

test('CRITICAL: late result-callback after the fallback does not pay/notify twice', async () => {
  const id = approvedClaim();
  // 8s fallback fired first and confirmed
  assert.equal(await confirmPayout(id), true);
  // the real Daraja result callback arrives afterwards
  linkConversation(id, 'CONV-LATE');
  await b2cResult({ body: { Result: { ResultCode: 0, ConversationID: 'CONV-LATE' } } }, mockRes());
  assert.equal(getClaim(id).status, 'PAID');
  // a further confirm still does nothing — single-shot held
  assert.equal(await confirmPayout(id), false);
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
