import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHtml } from '../src/dashboard.js';

test('dashboard is a self-contained HTML page that polls the claims API', () => {
  assert.match(dashboardHtml, /^<!doctype html>/i);
  assert.match(dashboardHtml, /BimaCheck/);
  assert.match(dashboardHtml, /\/api\/claims/);
  assert.match(dashboardHtml, /setInterval/); // auto-refresh
  assert.ok(!/src=|href="http/.test(dashboardHtml), 'should have no external assets');
});
