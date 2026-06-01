// Cut-first insurer console: a self-contained page that polls /api/claims and
// renders each claim's decision, the rule that fired, its reason, and payout
// status. No build step, no framework, no external assets. Served at GET /.
export const dashboardHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BimaCheck — Claims Console</title>
<style>
  :root { --bg:#0f1115; --panel:#171a21; --line:#262b35; --txt:#e6e9ef; --mut:#8b93a3;
          --green:#1f9d5c; --amber:#c98a16; --red:#c0392b; --grey:#3a4150; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--txt);
         font:15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
  header { padding:20px 28px; border-bottom:1px solid var(--line); display:flex;
           align-items:baseline; gap:16px; flex-wrap:wrap; }
  header h1 { margin:0; font-size:20px; letter-spacing:.2px; }
  header .sub { color:var(--mut); font-size:13px; }
  .counts { margin-left:auto; display:flex; gap:18px; font-size:13px; color:var(--mut); }
  .counts b { color:var(--txt); font-variant-numeric:tabular-nums; }
  main { padding:20px 28px; }
  table { width:100%; border-collapse:collapse; }
  th,td { text-align:left; padding:11px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--mut); font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.4px; }
  td.reason { color:var(--mut); max-width:520px; }
  .num { font-variant-numeric:tabular-nums; color:var(--mut); }
  .pill { display:inline-block; padding:2px 9px; border-radius:999px; font-size:12px; font-weight:600; }
  .PAID,.APPROVED { background:rgba(31,157,92,.16); color:#5bd99a; }
  .HELD { background:rgba(201,138,22,.16); color:#e7b75a; }
  .PENDING { background:rgba(120,130,150,.16); color:#aab2c2; }
  .FAILED { background:rgba(192,57,43,.18); color:#ef7c70; }
  .empty { color:var(--mut); padding:40px 0; text-align:center; }
  .dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--green);
         margin-right:6px; vertical-align:middle; animation:blink 1.6s infinite; }
  @keyframes blink { 50% { opacity:.3; } }
</style>
</head>
<body>
<header>
  <h1>BimaCheck</h1>
  <span class="sub">Claims integrity console — deterministic, auditable, never auto-denies</span>
  <div class="counts">
    <span><span class="dot"></span>live</span>
    <span>paid <b id="c-paid">0</b></span>
    <span>held <b id="c-held">0</b></span>
    <span>pending <b id="c-pending">0</b></span>
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
  const pill = (s) => '<span class="pill ' + s + '">' + s + '</span>';

  async function load() {
    let claims = [];
    try { claims = await (await fetch('/api/claims')).json(); } catch { return; }
    const by = (s) => claims.filter((c) => c.status === s).length;
    document.getElementById('c-paid').textContent = by('PAID');
    document.getElementById('c-held').textContent = by('HELD');
    document.getElementById('c-pending').textContent = by('PENDING');
    document.getElementById('empty').hidden = claims.length > 0;
    document.getElementById('rows').innerHTML = claims.map((c) =>
      '<tr>' +
      '<td class="num">' + c.id + '</td>' +
      '<td class="num">' + time(c.createdAt) + '</td>' +
      '<td>' + mask(c.member) + '</td>' +
      '<td>' + c.facilityCode + '</td>' +
      '<td>' + pill(c.status) + '</td>' +
      '<td class="reason">' + (c.reason ? c.reason : '—') + '</td>' +
      '<td>' + (c.mpesaStatus ? pill(c.mpesaStatus) : '—') + '</td>' +
      '</tr>'
    ).join('');
  }
  load();
  setInterval(load, 2000);
</script>
</body>
</html>`;
