---
name: deploy
description: Deploy or update BimaCheck on the live Linode VM (root@173.255.232.5, served at https://173-255-232-5.ip.linodeusercontent.com). Default mode ships the latest main to the box and restarts; provision mode stands up a cold box from scratch. Use this skill whenever the user says "deploy", "push to the VM", "update the live box", "update the server", "redeploy", "ship it live", "ship to production", or after merging code that needs to reach the live demo. The VM has NO hot reload, so any code or .env change only goes live by running this skill.
---

# /deploy — ship BimaCheck to the live VM

BimaCheck runs on a Linode VM behind a Caddy HTTPS front. The full architecture, the exact Caddyfile, and both systemd units live in `docs/DEPLOYMENT.md`. Read that file if anything here is unclear or when provisioning a fresh box.

The app has no hot reload and the claims DB is in-memory (it resets on restart), so a code or config change only goes live after a restart through this skill. That is the whole reason this skill exists: "I changed the file but the live site is the same" almost always means the box was never restarted.

## Constants

- VM: `root@173.255.232.5` (Ubuntu 24.04, Node 22.22 — runs `node:sqlite` without a flag)
- App dir: `/opt/bimacheck` · services: `bimacheck`, `caddy`
- Public URL: `https://173-255-232-5.ip.linodeusercontent.com`

Define these once per session so every command is consistent:

```bash
SSH="ssh -i $HOME/.ssh/openclaw-frankfurt -o BatchMode=yes -o ConnectTimeout=15 root@173.255.232.5"
URL="https://173-255-232-5.ip.linodeusercontent.com"
```

The deploy key (`~/.ssh/openclaw-frankfurt`, ed25519, no passphrase) is already installed on the box, so SSH is passwordless. If it is not (fresh box), see Provision step 1.

## Mode: update (default)

Ship the latest `main` and restart. Run this after pushing code to GitHub.

1. The VM pulls from GitHub, not from your laptop, so confirm your work is actually pushed first:

```bash
git log origin/main..main --oneline   # must be empty; if not, push before deploying
```

2. Pull, install, test, and restart on the VM. Test before restarting so you never put broken code in front of the demo:

```bash
$SSH 'set -e
  cd /opt/bimacheck
  git pull --ff-only
  npm install --no-audit --no-fund
  npm test 2>&1 | grep -iE "^.[[:space:]](tests|pass|fail) "
  systemctl restart bimacheck
  sleep 1
  echo "service: $(systemctl is-active bimacheck)"'
```

3. Verify the new code is actually being served, from the public side and the logs:

```bash
curl -s -m 10 -o /dev/null -w "public: HTTP %{http_code}\n" "$URL/api/claims"
$SSH "journalctl -u bimacheck -n 5 --no-pager -o cat"
```

A green test run on the VM plus an HTTP 200 from the public URL means the deploy took. If the VM tests fail, stop: fix the code and reship rather than restarting onto a broken build.

## Mode: provision (cold box)

Only for a brand-new or rebuilt VM. Follow `docs/DEPLOYMENT.md` for the annotated steps and the exact file contents; this is the checklist:

1. **Passwordless SSH.** On Windows, cache the host key and install your public key once with PuTTY's `plink -pw '<password>'`, then switch to `ssh -i ~/.ssh/openclaw-frankfurt`. The `/expose-https` skill has the reusable bootstrap.
2. `git clone https://github.com/SuperiorKe/BimaCheck.git /opt/bimacheck`, then `npm install` and `npm test`.
3. `scp` your local `.env` to `/opt/bimacheck/.env`, set `PUBLIC_CALLBACK_BASE=https://173-255-232-5.ip.linodeusercontent.com` (no trailing slash), `chmod 600`.
4. Write `/etc/systemd/system/bimacheck.service`, then `systemctl enable --now bimacheck`.
5. Install Caddy, write `/etc/caddy/Caddyfile` (bind the public IP, TLS-ALPN), write `caddy.service`, `systemctl enable --now caddy`.
6. Open inbound TCP 443 on the Linode **Cloud** firewall in the dashboard. The host ufw alone is not enough.
7. Confirm the cert issued and `curl "$URL/api/claims"` returns `[]` from the public internet.

## Gotchas

- **No hot reload.** `dashboard.js` and config are baked at module import; a restart is mandatory. Symptom: the file has your change but the page or behaviour does not.
- **In-memory DB.** Every restart wipes claims, by design. Sequences that depend on prior claims (geo, duplicate rules) need a fresh process — `/smoke` assumes this.
- **Cloud firewall vs ufw.** A connect *timeout* (not "connection refused") from outside means the Linode cloud firewall is dropping the port, not ufw. 443 must be open there.
- **Shared box.** The VM also runs Tailscale and an unrelated docker stack on :80 and many high ports. Do not touch them. Caddy binds only the public IP so it never collides.

## After deploying

Confirm the pipeline with the VM's own `npm test` (above) or `/smoke` pointed at the box. To prove the live M-Pesa payout path and the Daraja callback end to end, run `/go-live`.
