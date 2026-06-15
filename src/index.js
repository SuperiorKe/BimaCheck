// BimaCheck server: wires the routes and starts the queue worker.
import express from 'express';
import { config } from './config.js';
import { ussdHandler } from './ussd.js';
import { setHandler } from './queue.js';
import { processClaim } from './worker.js';
import { listClaims } from './db.js';
import { b2cResult, b2cTimeout } from './mpesa.js';
import { runBenchmark } from './engine/backtest.js';
import { dashboardHtml } from './dashboard.js';

setHandler(processClaim);

const app = express();
app.use(express.urlencoded({ extended: false })); // AT posts form-encoded
app.use(express.json());

app.post('/ussd', ussdHandler);
app.post('/b2c/result', b2cResult);
app.post('/b2c/timeout', b2cTimeout);
app.get('/api/claims', (_req, res) => res.json(listClaims()));
// On-demand fraud benchmark: runs the live engine over a labelled synthetic set
// and returns measured catch rate, false-positive rate, value blocked, latency.
app.get('/api/backtest', (req, res) => {
  const n = Math.min(Math.max(Number(req.query.n) || 1000, 100), 5000);
  const seed = Number(req.query.seed) || 1;
  res.json(runBenchmark({ n, seed }));
});
app.get('/', (_req, res) => res.type('html').send(dashboardHtml));

app.listen(config.port, () => {
  console.log(`BimaCheck listening on :${config.port}`);
});
