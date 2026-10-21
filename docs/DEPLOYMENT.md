# Deployment

LEAF is a single Node.js application plus SQLite. The Express server serves the API, uploaded photos, fonts and the built frontend from one origin. This keeps session cookies, CSRF checks and share links simple and avoids a CORS layer.

## Requirements

- **Node.js 24+** (for the built-in `node:sqlite` module).
- A persistent disk for the SQLite database and uploads.
- Chrome, Edge or Chromium installed on the host for PDF generation.
- Optional: a Resend account for verification/reset email delivery.
- Optional: an OpenAI-compatible AI provider.

## Build and run

```bash
npm ci
npm run build
NODE_ENV=production PUBLIC_APP_URL=https://leaf.example.com APP_URL=https://leaf.example.com npm start
```

`npm run build` type-checks the project and writes the client to `dist/`. `npm start` runs `server/index.ts` through `tsx` and serves `dist/` when it exists.

The server listens on `PORT` (default `4000`). Put HTTPS and the public hostname in front of it with a reverse proxy.

> Do not run `npm ci --omit=dev` unless `tsx` is available at runtime. The start script uses `tsx`, which is a runtime dependency of this project.

### Minimal production environment

```env
NODE_ENV=production
PORT=4000
APP_URL=https://leaf.example.com
PUBLIC_APP_URL=https://leaf.example.com
LEAF_DB_PATH=/var/lib/leaf/leaf.db
LEAF_UPLOADS_DIR=/var/lib/leaf/uploads
SESSION_DAYS=7
TRUST_PROXY=1
ENABLE_HSTS=true

# Optional
RESEND_API_KEY=re_...
MAIL_FROM=LEAF <hello@example.com>
AI_API_KEY=...
AI_MODEL=gpt-4o-mini
CHROME_PATH=/usr/bin/chromium
```

In production the session cookie is issued with `Secure`, so **the site must be served over HTTPS**. `APP_URL` and `PUBLIC_APP_URL` must be the externally visible HTTPS origin; otherwise share links and email links point at the wrong host.

On first start LEAF creates the database, applies `server/migrations/001_init.sql`, and records it in `schema_migrations`. No separate migration command is needed.

## Reverse proxy

Example Nginx site:

```nginx
server {
    listen 443 ssl http2;
    server_name leaf.example.com;

    ssl_certificate     /etc/letsencrypt/live/leaf.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/leaf.example.com/privkey.pem;

    client_max_body_size 4m;          # profile photo limit is 3 MB by default

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 90s;        # PDF generation can take a few seconds
    }
}

server {
    listen 80;
    server_name leaf.example.com;
    return 301 https://$host$request_uri;
}
```

Notes:

- Set `TRUST_PROXY=1` behind exactly one trusted proxy so rate limits and `Secure` cookies see the real client IP/protocol. Do not expose port 4000 directly to the internet if you trust forwarded headers.
- LEAF sets its own CSP, frame, referrer, HSTS and content-type headers with `helmet`. Do not strip them in the proxy.
- The app is same-origin only. If you set `VITE_API_URL` to a different origin, you must add CORS and cookie-domain configuration yourself. The recommended deployment is one origin.
- PDFs are streamed in the response, so the proxy's buffering settings do not need special handling.

## Persistent storage

| Path | Contents | Back up? |
| --- | --- | --- |
| `LEAF_DB_PATH` | users, sessions, profile, documents, versions, reviews | **Yes** |
| `LEAF_UPLOADS_DIR` | profile photos | **Yes** |
| `dist/` | built frontend | Rebuild |
| `public/fonts/` | bundled fonts | Part of the repo |

The default paths are relative to the process working directory (`server/data/leaf.db`, `server/uploads`). For production, prefer absolute paths outside the release directory so a deploy cannot delete data.

### SQLite backup

Take a consistent backup while the app is running with `VACUUM INTO`:

```bash
node -e "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(process.env.LEAF_DB_PATH || 'server/data/leaf.db'); db.exec(\"VACUUM INTO '/var/backups/leaf-$(date +%F).db'\"); db.close()"
```

Alternatively stop the app and copy the database together with any `-wal` and `-shm` files. Also archive `LEAF_UPLOADS_DIR`. Test restores periodically.

SQLite is configured for a single application process. Do not run multiple LEAF instances against the same database file. Horizontal scaling would require replacing SQLite and moving rate limits to a shared store.

## Chromium for PDFs

`playwright-core` does **not** download a browser. Install Chrome/Edge/Chromium on the host or container, or point `CHROME_PATH` at an executable.

Auto-detected locations include:

```text
Windows:
  C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
  C:\Program Files\Microsoft\Edge\Application\msedge.exe
  C:\Program Files\Google\Chrome\Application\chrome.exe

Linux:
  /usr/bin/google-chrome
  /usr/bin/chromium
  /usr/bin/chromium-browser
  /usr/bin/microsoft-edge

macOS:
  /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
  /Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge
```

On a minimal Debian/Ubuntu host, a typical install is `apt-get install chromium` (or Google Chrome) plus its font dependencies. Verify after deployment by downloading a CV PDF; a missing browser returns `503 PDF_UNAVAILABLE` while the rest of the app continues to work. The process keeps one reusable browser and allows two concurrent PDF renders.

## Email

Without `RESEND_API_KEY`, LEAF logs verification and password-reset messages to the API console and returns development links from the API. This is convenient locally but **not appropriate for production**: users cannot receive verification or reset emails.

To enable delivery:

1. Create a Resend API key.
2. Verify your sending domain in Resend.
3. Set `RESEND_API_KEY` and `MAIL_FROM` (for example `LEAF <hello@example.com>`).
4. Restart and test registration, resend verification and forgot-password.

Mail failures are logged; registration still succeeds because the account and session are created before the verification email is attempted. The user can resend from Settings.

## AI

See [AI.md](AI.md). Keep the provider key server-side. For public demos, lower `AI_DAILY_LIMIT` or leave `AI_API_KEY` empty. Manual editing, local reviews, sharing and PDFs are unaffected.

## Process management

Run one process under a supervisor that restarts on failure and forwards `SIGTERM` (handled with a graceful shutdown that closes the database and PDF browser).

Example systemd unit:

```ini
[Unit]
Description=LEAF
After=network.target

[Service]
Type=simple
User=leaf
WorkingDirectory=/opt/leaf
EnvironmentFile=/opt/leaf/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
```

A `pm2 start npm --name leaf -- start` setup also works. Ensure the service user can write the database directory and uploads directory.

## Health checks

Use `GET /api/health`. It returns `200` only when SQLite is reachable:

```json
{ "ok": true, "service": "leaf", "storage": "ok", "ai": "configured" }
```

It does not prove that Chromium or the AI provider is working. Add an authenticated smoke test or a periodic PDF export for deeper checks.

## Deployment checklist

- [ ] Node 24+ on the host
- [ ] `npm ci && npm run build` succeeds
- [ ] `NODE_ENV=production`
- [ ] `APP_URL` and `PUBLIC_APP_URL` use the public HTTPS origin
- [ ] HTTPS terminates at the proxy; `TRUST_PROXY` matches the topology
- [ ] `LEAF_DB_PATH` and `LEAF_UPLOADS_DIR` are absolute and persistent
- [ ] Database + uploads backups scheduled and restore-tested
- [ ] Chromium/Chrome installed; a real PDF downloads successfully
- [ ] Resend configured and a verification email received (if accounts are public)
- [ ] AI key configured or intentionally omitted; daily limit reviewed
- [ ] `GET /api/health` monitored
- [ ] Share links open at the public origin; revocation returns 404
- [ ] No `.env`, database, WAL files or uploads in source control

## CI notes

The included test suites:

```bash
npm test
npm run test:e2e
```

`npm test` needs no browser for most cases but **does generate a real PDF**, so CI needs Chrome/Edge/Chromium or a skip/override if that is unavailable. The API tests point the database at `:memory:` and uploads at `tests/tmp/uploads`.

`npm run test:e2e` launches its own API and Vite processes, uses a temporary SQLite database under `tests/tmp`, and drives the installed Edge/Chrome through `playwright-core`. Set `E2E_BASE_URL` to test an already-running deployment instead. CI images must include a Chromium browser and its system libraries. Set `CHROME_PATH` when the browser is not in a standard location.

## Updating

1. Back up the database and uploads.
2. Deploy the new source and run `npm ci && npm run build`.
3. Restart the process. Pending migrations run automatically and are recorded.
4. Check `/api/health`, then open a document, a shared CV and a PDF.

There is currently one migration. Future migrations should be additive and idempotent; SQLite migrations that rewrite tables should be tested against a copy of production data first.
