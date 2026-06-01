import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ussdHandler } from '../src/ussd.js';
import { listClaims, __resetClaims } from '../src/db.js';
import { setHandler } from '../src/queue.js';

// Swallow enqueued jobs so the background pump has a no-op handler in this file.
setHandler(async () => {});

function mockRes() {
  return {
    body: '',
    headers: {},
    set(k, v) {
      this.headers[k] = v;
    },
    send(s) {
      this.body = s;
      return this;
    },
  };
}

beforeEach(() => __resetClaims());

test('empty text -> root menu (CON)', () => {
  const res = mockRes();
  ussdHandler({ body: { text: '', phoneNumber: '254700000001' } }, res);
  assert.match(res.body, /^CON/);
  assert.match(res.body, /hospi-cash/i);
});

test('text="1" -> facility menu (CON, lists facilities)', () => {
  const res = mockRes();
  ussdHandler({ body: { text: '1', phoneNumber: '254700000001' } }, res);
  assert.match(res.body, /^CON/);
  assert.match(res.body, /Kibera/);
});

test('valid facility -> END and a PENDING claim is persisted', () => {
  const res = mockRes();
  ussdHandler({ body: { text: '1*1', phoneNumber: '254700000001' } }, res);
  assert.match(res.body, /^END/);
  const claims = listClaims();
  assert.equal(claims.length, 1);
  assert.equal(claims[0].status, 'PENDING'); // handler did not block on decision/SMS
  assert.equal(claims[0].member, '254700000001');
});

test('invalid facility index -> END invalid', () => {
  const res = mockRes();
  ussdHandler({ body: { text: '1*99', phoneNumber: '254700000001' } }, res);
  assert.match(res.body, /^END/);
  assert.match(res.body, /invalid/i);
  assert.equal(listClaims().length, 0);
});
