import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHtml } from '../src/dashboard.js';

test('dashboard is a self-contained HTML page that polls the claims API', () => {
  assert.match(dashboardHtml, /^<!doctype html>/i);
  assert.match(dashboardHtml, /BimaCheck/);
  assert.match(dashboardHtml, /\/api\/claims/);
  assert.match(dashboardHtml, /setInterval/); // auto-refresh

  // Self-contained except for the Google Fonts CDN (DESIGN.md typography, loaded
  // with display=swap so content renders immediately and falls back to system
  // fonts if the CDN is slow or blocked). No external scripts or images.
  assert.ok(!/\bsrc=/.test(dashboardHtml), 'nothing with a src attribute (no external scripts/images/iframes)');
  const externalHrefs = [...dashboardHtml.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(
    externalHrefs.every((h) => /^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(h)),
    'the only external hrefs are the Google Fonts CDN'
  );
});
