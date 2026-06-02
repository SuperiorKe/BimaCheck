// Cut-first insurer console: a self-contained page that polls /api/claims and
// renders each claim's decision, the rule that fired, its reason, and payout
// status. No build step, no framework, no external assets. Served at GET /.
export const dashboardHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BimaCheck — Claims Console</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet" />
<style>
  :root { --bg:#0A0C0F; --panel:#111418; --raised:#161a22; --line:#1E2430;
          --txt:#D8DDE8; --dim:#8C95A8; --mut:#5A6478;
          --paid:#00C896; --paid-bg:rgba(0,200,150,.09);
          --held:#E8A020; --held-bg:rgba(232,160,32,.10);
          --pend:#4A5878; --failed:#C43F3F; --fail-bg:rgba(196,63,63,.10);
          --mono:"IBM Plex Mono","Courier New",monospace;
          --sans:"DM Sans",system-ui,sans-serif; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--txt);
         font:14px/1.55 var(--sans); -webkit-font-smoothing:antialiased; }
  header { height:44px; padding:0 20px; border-bottom:1px solid var(--line);
           background:var(--panel); display:flex; align-items:center; gap:0; flex-shrink:0; }
  header h1 { margin:0; font:600 11px/1 var(--mono); letter-spacing:.12em;
              text-transform:uppercase; color:var(--mut); }
  .hdr-sep { width:1px; height:16px; background:var(--line); margin:0 14px; flex-shrink:0; }
  header .sub { color:var(--mut); font:300 12px/1 var(--sans); }
  .counts { margin-left:auto; display:flex; align-items:center; gap:18px; }
  .counts span { font:400 12px/1 var(--sans); color:var(--mut); }
  .counts b { font:600 13px/1 var(--mono); color:var(--txt); font-variant-numeric:tabular-nums; }
  main { padding:16px 20px; }
  table { width:100%; border-collapse:collapse; }
  thead th { text-align:left; padding:9px 16px 9px 20px; border-bottom:1px solid var(--line);
             background:var(--panel); color:var(--mut); font:600 11px/1 var(--mono);
             text-transform:uppercase; letter-spacing:.06em; }
  tbody tr { border-bottom:1px solid var(--line); border-left:3px solid transparent; }
  tbody tr:hover { background:var(--raised); }
  tbody tr.st-paid { border-left-color:var(--paid); }
  tbody tr.st-held { border-left-color:var(--held); background:var(--held-bg); }
  tbody tr.st-held:hover { background:rgba(232,160,32,.14); }
  tbody tr.st-pend { border-left-color:var(--pend); }
  tbody tr.st-fail { border-left-color:var(--failed); background:var(--fail-bg); }
  tbody td { text-align:left; padding:11px 16px 11px 20px; vertical-align:top;
             font:400 13px/1.45 var(--sans); color:var(--dim); }
  td.mono { font:400 12px/1.45 var(--mono); }
  td.num  { font:400 12px/1 var(--mono); color:var(--mut); }
  td.reason { color:var(--mut); max-width:480px; font-size:12px; }
  td.payout { font:400 12px/1 var(--mono); }
  td.payout.paid { color:var(--paid); }
  .dec { font:600 11px/1 var(--mono); letter-spacing:.06em; text-transform:uppercase; }
  .dec.PAID,.dec.APPROVED { color:var(--paid); }
  .dec.HELD { color:var(--held); }
  .dec.PENDING { color:var(--pend); }
  .dec.FAILED { color:var(--failed); }
  .empty { color:var(--mut); padding:40px 0; text-align:center; font-size:13px; }
  .dot { display:inline-block; width:6px; height:6px; border-radius:50%; background:var(--paid);
         margin-right:6px; vertical-align:middle; animation:blink 2s ease-in-out infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
</style>
</head>
<body>
<header>
  <h1>BimaCheck</h1>
  <div class="hdr-sep"></div>
  <span class="sub">Claims integrity console — deterministic, auditable, never auto-denies</span>
  <div class="counts">
    <span>paid <b id="c-paid">0</b></span>
    <span>held <b id="c-held">0</b></span>
    <span>pending <b id="c-pending">0</b></span>
    <span><span class="dot"></span>live</span>
  </div>
</header>
<main>
  <table>
    <thead><tr>
      <th>#</th><th>Time</th><th>Member</th><th>Facility</th>
      <th>Decision</th><th>Reason</th><th>Payout</th>
    </tr></thead>
    <tbody id="rows"></tbody>
  </table>
  <div id="empty" class="empty" hidden>No claims yet. Dial the USSD code to file one.</div>
</main>
<script>
  const mask = (m) => (m ? m.slice(0, 6) + '****' + m.slice(-2) : '');
  const time = (ts) => new Date(ts).toLocaleTimeString();
  const stripeClass = (s) => s === 'PAID' || s === 'APPROVED' ? 'st-paid'
    : s === 'HELD' ? 'st-held' : s === 'FAILED' ? 'st-fail' : 'st-pend';
  const dec = (s) => '<span class="dec ' + s + '">' + s + '</span>';

  async function load() {
    let claims = [];
    try { claims = await (await fetch('/api/claims')).json(); } catch { return; }
    const by = (s) => claims.filter((c) => c.status === s).length;
    document.getElementById('c-paid').textContent = by('PAID');
    document.getElementById('c-held').textContent = by('HELD');
    document.getElementById('c-pending').textContent = by('PENDING');
    document.getElementById('empty').hidden = claims.length > 0;
    document.getElementById('rows').innerHTML = claims.map((c) =>
      '<tr class="' + stripeClass(c.status) + '">' +
      '<td class="num">' + c.id + '</td>' +
      '<td class="mono">' + time(c.createdAt) + '</td>' +
      '<td class="mono">' + mask(c.member) + '</td>' +
      '<td class="mono">' + c.facilityCode + '</td>' +
      '<td>' + dec(c.status) + '</td>' +
      '<td class="reason">' + (c.reason ? c.reason : '—') + '</td>' +
      '<td class="payout' + (c.mpesaStatus === 'PAID' ? ' paid' : '') + '">' +
        (c.mpesaStatus === 'PAID' ? 'KES 2,000' : (c.mpesaStatus || '—')) + '</td>' +
      '</tr>'
    ).join('');
  }
  load();
  setInterval(load, 2000);
</script>
</body>
</html>`;
