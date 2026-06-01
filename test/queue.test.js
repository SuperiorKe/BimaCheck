import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueue, setHandler, onIdle } from '../src/queue.js';

test('queue runs jobs in FIFO order', async () => {
  const seen = [];
  setHandler(async (j) => {
    seen.push(j);
  });
  enqueue('a');
  enqueue('b');
  enqueue('c');
  await onIdle();
  assert.deepEqual(seen, ['a', 'b', 'c']);
});

test('a throwing job is isolated; the next job still runs', async () => {
  const seen = [];
  setHandler(async (j) => {
    if (j === 'boom') throw new Error('intentional');
    seen.push(j);
  });
  enqueue('boom');
  enqueue('ok');
  await onIdle();
  assert.deepEqual(seen, ['ok']);
});
