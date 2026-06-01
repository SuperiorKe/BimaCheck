// BimaCheck server: wires the routes and starts the queue worker.
import express from 'express';
import { config } from './config.js';
import { ussdHandler } from './ussd.js';
import { setHandler } from './queue.js';
import { processClaim } from './worker.js';
import { listClaims } from './db.js';

setHandler(processClaim);

const app = express();
app.use(express.urlencoded({ extended: false })); // AT posts form-encoded
app.use(express.json());

app.post('/ussd', ussdHandler);
app.get('/api/claims', (_req, res) => res.json(listClaims()));
app.get('/', (_req, res) =>
  res.type('html').send('<h1>BimaCheck</h1><p>Dashboard coming in the next layer. See <a href="/api/claims">/api/claims</a>.</p>')
);

// B2C result/timeout routes are added by the payments layer.

app.listen(config.port, () => {
  console.log(`BimaCheck listening on :${config.port}`);
});
