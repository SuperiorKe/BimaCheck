# Deployment & Go-Live Runbook

How BimaCheck was taken from offline dry-run to a live, public HTTPS deployment on a Linode VM, and how to operate, reproduce, and harden it. Written 2026-06-14.

## What is live now

- Public URL: **https://173-255-232-5.ip.linodeusercontent.com** (live dashboard, real Let's Encrypt cert).
- Host: Linode VM `ubuntu-us-east`, `173.255.232.5`, US-Newark, Ubuntu 24.04.4, Node v22.22.2.
- App: systemd service `bimacheck` on `127.0.0.1:3000`.
- HTTPS front: systemd service `caddy`, bound to the public IP on 443, Let's Encrypt cert via TLS-ALPN.

## Architecture (live)

```
                 Internet (Safaricom Daraja, Africa's Talking, browsers)
                                     |
                       Linode Cloud Firewall (inbound: 22, 443)
                                     |
                  Caddy  (binds 173.255.232.5:443 only, LE cert via TLS-ALPN-01)
                                     |  reverse_proxy
                            127.0.0.1:3000  BimaCheck (Express)
                                     |
              POST /ussd      GET /api/claims, /      POST /b2c/result, /b2c/timeout
```

### Why this shape (VM constraints)

This is a shared, busy box. The deployment had to work around three things without disturbing them:

1. **Port 80 is taken** by an unrelated docker stack (`ecommerce-frontend`, plus `cartorders/auth/products` services on 3030, 8001-8004, 8080-8082, 5433-5436, 6379-6382). So Caddy cannot use the ACME HTTP-01 challenge. It uses **TLS-ALPN-01** on 443 instead (`disable_http_challenge`).
2. **Port 443 is partly used by Tailscale**, but only on the tailnet IP (`100.111.251.30`). So Caddy binds **only the public IP** (`bind 173.255.232.5`) to avoid the conflict.
3. **No domain.** We use Linode's auto-generated rDNS hostname `173-255-232-5.ip.linodeusercontent.com`, which forward-resolves to the IP, so Let's Encrypt can issue a cert for it. No domain purchase needed.

A separate **Linode Cloud Firewall** (distinct from the host's ufw) fronts the VM and by default allowed only SSH (22). It drops packets silently, so a blocked port shows as a connect *timeout*, not "refused". Port 443 had to be opened there manually (see step 6). The host ufw already allowed 80/443.

## Reproduce the deployment

### 0. Access (passwordless SSH)

The deploy key is `~/.ssh/openclaw-frankfurt` (ed25519, no passphrase), installed in the VM's `root` authorized_keys. On Windows, the initial key install used PuTTY's `plink -pw` once; thereafter everything uses OpenSSH key auth:

```bash
ssh -i ~/.ssh/openclaw-frankfurt root@173.255.232.5
```

### 1. Clone and install

```bash
git clone https://github.com/SuperiorKe/BimaCheck.git /opt/bimacheck
cd /opt/bimacheck
npm install --no-fund --no-audit
npm test          # 35/35 pass on Node 22.22 (node:sqlite runs without a flag)
```

### 2. Configuration (`/opt/bimacheck/.env`)

Copy your real `.env` to the VM (over scp, so secrets stay out of any log) and set the callback base to the public hostname with **no trailing slash**:

```bash
scp -i ~/.ssh/openclaw-frankfurt .env root@173.255.232.5:/opt/bimacheck/.env
ssh -i ~/.ssh/openclaw-frankfurt root@173.255.232.5 \
  'sed -i "s#^PUBLIC_CALLBACK_BASE=.*#PUBLIC_CALLBACK_BASE=https://173-255-232-5.ip.linodeusercontent.com#" /opt/bimacheck/.env; chmod 600 /opt/bimacheck/.env'
```

The app loads `.env` via `process.loadEnvFile()` at startup, so any change needs a service restart. `config.js` strips a trailing slash from `PUBLIC_CALLBACK_BASE` defensively, but set it clean anyway.

### 3. App service (`/etc/systemd/system/bimacheck.service`)

```ini
[Unit]
Description=BimaCheck hospi-cash claims processor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/bimacheck
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now bimacheck
curl -s localhost:3000/api/claims    # [] = up
```

### 4. Caddy (HTTPS front)

```bash
curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=amd64" -o /usr/local/bin/caddy
chmod +x /usr/local/bin/caddy
```

`/etc/caddy/Caddyfile`:

```caddyfile
{
    email superiorwech@gmail.com
    http_port 8090
    auto_https disable_redirects
}

173-255-232-5.ip.linodeusercontent.com {
    bind 173.255.232.5
    log
    reverse_proxy 127.0.0.1:3000
    tls {
        issuer acme {
            disable_http_challenge
        }
    }
}
```

`/etc/systemd/system/caddy.service`:

```ini
[Unit]
Description=Caddy HTTPS front for BimaCheck
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
Restart=on-failure
RestartSec=3
User=root
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

```bash
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl daemon-reload && systemctl enable --now caddy
```

### 5. Open 443 on the Linode Cloud Firewall

Dashboard: Networking → Firewalls → the firewall attached to this Linode → add inbound rule **Accept / TCP / 443 / sources `0.0.0.0/0` and `::/0`**. This is the edge firewall; it cannot be changed from inside the VM. Without it, ACME and the callback time out.

### 6. Verify

```bash
# from anywhere on the internet:
curl -s https://173-255-232-5.ip.linodeusercontent.com/api/claims     # [] with HTTP 200, valid cert
```

## Verifying a payout (the go-live last mile)

Fire one clean claim and watch the logs:

```bash
ssh -i ~/.ssh/openclaw-frankfurt root@173.255.232.5
curl -s -X POST https://173-255-232-5.ip.linodeusercontent.com/ussd --data "text=1*1&phoneNumber=%2B254708374149"
journalctl -u bimacheck -f          # expect: [mpesa] B2C requested for claim N: 0
journalctl -u caddy -f | grep /b2c/ # the real Daraja result callback would show here
```

To prove our own callback endpoint is reachable and routes correctly (independent of Safaricom), POST a synthetic Daraja result to the public URL:

```bash
curl -s -X POST https://173-255-232-5.ip.linodeusercontent.com/b2c/result \
  -H "Content-Type: application/json" \
  -d '{"Result":{"ResultCode":0,"ResultDesc":"ok","ConversationID":"<the claim conversationId>","TransactionID":"TEST"}}'
# expect: {"ResultCode":0,"ResultDesc":"received"}, and a POST /b2c/result -> 200 in caddy log
```

### What we observed (2026-06-14, sandbox)

- B2C request **accepted**: `ResponseCode 0`, real ConversationID returned. The PartyB fix (bare MSISDN) works.
- The real `/b2c/result` callback **never arrived** (0 hits in 5+ minutes), even though the endpoint is provably reachable (Let's Encrypt validated over 443, and a synthetic POST from a browser IP returned 200). This is Daraja **sandbox** behaviour; sandbox result callbacks are unreliable.
- The claim reached `PAID` via the **8s fallback**, not the callback.

## Fixes that came out of this work (now in the repo)

- `fix(mpesa)`: B2C `PartyB` is sent as a bare MSISDN (`254...`, not `+254...`). Daraja rejected every payout with `400.002.02 Invalid PartyB` before this.
- `fix(config)`: strip trailing slash from `PUBLIC_CALLBACK_BASE` so callback URLs are not `https://host//b2c/result` (which Express would not route).
- `test`: pipeline and mpesa suites force dry-run so a local `.env` cannot leak live creds into tests.

## Open issues (see `TODOS.md`)

- **The 8s fallback can lie in live mode.** It marks `PAID` and sends the "approved" SMS before Daraja confirms. A later failure callback sets `mpesaStatus=FAILED` while `status` stays `PAID`. Fine for sandbox, a real risk for production money.
- **Unverified credentials.** `DARAJA_SHORTCODE=6000996` (sandbox is usually `600996`) and `DARAJA_INITIATOR_NAME=BimaCheck` (sandbox is usually `testapi`). Only a delivered callback would confirm these.

## Operations

```bash
# update to latest main and restart
ssh -i ~/.ssh/openclaw-frankfurt root@173.255.232.5 \
  'cd /opt/bimacheck && git pull --ff-only && npm install --no-audit --no-fund && systemctl restart bimacheck'

# logs
journalctl -u bimacheck -n 50 --no-pager
journalctl -u caddy -n 50 --no-pager

# the in-memory claims DB resets on every restart (by design)
```

## Security (do before/after demos)

- **443 is public with no auth** on the dashboard, `/ussd`, `/api/claims`, and `/b2c/result`. Anyone with the URL can file claims or POST fake callbacks. Close or scope the firewall rule when not demoing.
- **Rotate the root password** and prefer key-only SSH (`PasswordAuthentication no`). A deploy key is already installed.
- The box also runs Tailscale and an unrelated docker stack. Leave those alone.

## Going to production

Sandbox cannot complete a real payout. For real money you need: a production Daraja app (real shortcode, real `InitiatorName` + a matching RSA-encrypted `SecurityCredential`, see the TODOS item), the production base URL in `src/mpesa.js` instead of `sandbox.safaricom.co.ke`, AT live SMS credentials, and the payout-confirmation integrity fix so a fallback never reports an unconfirmed payout as paid.
