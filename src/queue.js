// In-process, single-flight, FIFO job queue.
//
// One job runs at a time, in order. This guarantees claim N is fully persisted
// and decided before claim N+1 is evaluated, so the duplicate/geo rules always
// see prior claims (no read-before-write race). Each job is isolated in a
// try/catch: a failing job logs and the next job still runs — one bad Daraja
// call must never freeze the demo.
const queue = [];
let running = false;
let handler = null;
let idleResolvers = [];

export function setHandler(fn) {
  handler = fn;
}

export function enqueue(job) {
  queue.push(job);
  pump();
}

// Resolves when the queue has drained (handy for tests).
export function onIdle() {
  if (!running && queue.length === 0) return Promise.resolve();
  return new Promise((resolve) => idleResolvers.push(resolve));
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const job = queue.shift();
      try {
        await handler(job);
      } catch (err) {
        console.error('[queue] job failed:', err);
      }
    }
  } finally {
    running = false;
    const resolvers = idleResolvers;
    idleResolvers = [];
    resolvers.forEach((r) => r());
  }
}
