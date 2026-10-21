# LEAF

LEAF is a full-stack career-studio application for building a CV, a matching cover letter and a personal landing page from one career profile. It includes live document previews, AI writing assistance, real PDF export, revocable public links and QR codes.

The interface follows the LEAF design system in `design.md`: a calm editorial layout, blue/teal accents, document-first typography and a light/dark application theme that never changes the appearance of exported documents.

## What works

- **Accounts** — register, sign in, sign out, email verification, password reset, password change, account deletion, light/dark/system theme.
- **Career profile** — personal details, photo upload, experience, education, skills, languages, certifications, projects, achievements, interests and references. One profile seeds every document.
- **CV builder** — six templates, live A4 preview, autosave with retry, undo/redo, section ordering/hiding, accent colours, typography and density controls, photo support, AI rewrite, AI review, version history, PDF download.
- **Cover letters** — three layouts, profile import, live preview, job description, AI draft/rewrite/review, PDF download.
- **Personal sites** — six landing templates, smooth scroll reveals and pointer-tilt portrait; editable sections, public address, publish/unpublish, linked shared CV and a PDF download button.
- **Sharing** — per-document opaque links, optional 7/30/90-day expiry, QR code PNG, instant revocation. Shared CV pages are `noindex, nofollow`.
- **AI assistant** — scratchpad rewriting, skill ideas, document reviews with a job description, review history. The provider is server-side only.
- **Without AI** — every editor, PDF, public page and local structural review works with no AI key. AI failures never block manual work.
- **Accessibility** — keyboard-operable dialogs, skip links, labelled fields, visible focus, reduced-motion fallbacks for the marketing and landing animations.

## Stack

| Area | Choice |
| --- | --- |
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS, React Router, Framer Motion, Three.js |
| Backend | Node.js 24, Express 4, Zod, `node:sqlite` |
| Database | SQLite with plain SQL migrations |
| PDF | Chromium (Chrome or Edge) through `playwright-core` — real text and links, no screenshots |
| Email | Resend when configured; console output otherwise |
| Auth | Opaque session cookies, scrypt password hashes, hashed one-time tokens |

Node **24 or newer** is required because persistence uses the built-in `node:sqlite` module. No database server is needed.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux

# 3. Start the API and Vite together
npm run dev
```

Open <http://localhost:5173>. The API listens on <http://localhost:4000> and Vite proxies `/api` and `/uploads` to it.

The SQLite database and migrations are created automatically on first start. No manual schema step is required.

### Optional demo data

```bash
npm run seed
```

This creates or resets **only** the demo account:

- Email: `demo@leaf.app`
- Password: `LeafDemo123`
- Shared CV: `demo@leaf.app` → CVs → Share
- Personal site: <http://localhost:5173/p/maya-laurent>

Override `SEED_EMAIL` / `SEED_PASSWORD` in `.env` if you prefer other credentials.

### A PDF browser is required

PDF export and the “Download PDF” buttons use a locally installed Chromium browser. LEAF auto-detects Chrome or Edge in the standard locations. If it cannot find one, set `CHROME_PATH` to the executable:

```env
CHROME_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

No `playwright install` download is needed — `playwright-core` drives the installed browser.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run API (tsx watch) and Vite concurrently |
| `npm run dev:api` | Run only the API with restart-on-change |
| `npm run dev:web` | Run only the Vite app |
| `npm run build` | Type-check the whole project and build `dist/` |
| `npm start` | Run the API; serves `dist/` when it exists |
| `npm run seed` | Create/reset the demo account and sample content |
| `npm test` | API integration tests (Vitest + Supertest) |
| `npm run test:e2e` | Browser end-to-end tests (Playwright + installed Edge/Chrome) |
| `npm run fonts` | Copy bundled font files into `public/fonts` |

## Configuration

All server configuration is read in `server/env.ts`. `.env.example` documents every variable. The important ones:

| Variable | Default | Notes |
| --- | --- | --- |
| `NODE_ENV` | `development` | Set `production` when serving the built app |
| `PORT` | `4000` | API port |
| `APP_URL` | `http://localhost:5173` | Browser origin in development |
| `PUBLIC_APP_URL` | `APP_URL` | Canonical origin used in share links and emails |
| `LEAF_DB_PATH` | `server/data/leaf.db` | Persist this file |
| `LEAF_UPLOADS_DIR` | `server/uploads` | Persist this directory |
| `AI_API_KEY` | empty | Any OpenAI-compatible provider; empty disables AI |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Must expose `POST /chat/completions` |
| `AI_MODEL` | `gpt-4o-mini` | Provider model ID |
| `AI_DAILY_LIMIT` | `20` | Per user, per UTC day |
| `RESEND_API_KEY` | empty | Empty logs mail to the console |
| `MAIL_FROM` | `LEAF <onboarding@resend.dev>` | Verified Resend sender |
| `CHROME_PATH` | auto-detect | Chromium executable for PDFs |
| `TRUST_PROXY` | `0` | Set `1` behind one trusted reverse proxy |
| `ENABLE_HSTS` | production | Only enable on HTTPS |

## Project structure

```text
├─ server/
│  ├─ index.ts              # HTTP entry point and graceful shutdown
│  ├─ app.ts                # middleware, security, rate limits, static hosting
│  ├─ auth.ts               # sessions, password hashing, ownership helpers
│  ├─ ai.ts                 # provider client, prompts, usage limits, local review
│  ├─ pdf.ts                # Chromium PDF renderer and browser detection
│  ├─ db.ts                 # node:sqlite connection and migrations
│  ├─ migrations/001_init.sql
│  ├─ routes/               # auth, profile, cvs, letters, landings, ai, public
│  └─ seed.ts               # demo data
├─ shared/
│  ├─ types.ts              # shared API/document types
│  ├─ defaults.ts           # blank and sample documents
│  ├─ templates.ts          # template and colour metadata
│  ├─ profile.ts            # profile → document conversion
│  └─ renderDocument.ts     # single HTML/CSS renderer for preview + PDF
├─ src/
│  ├─ pages/                # public, auth and dashboard screens
│  ├─ components/           # editors, previews, landing renderer, UI primitives
│  ├─ context/              # auth, theme, toast
│  └─ lib/                  # API client, utilities, metadata
├─ tests/
│  ├─ api.test.ts           # integration and real-PDF tests
│  ├─ e2e.mjs               # browser workflows
│  └─ setup.ts
├─ docs/
│  ├─ API.md
│  ├─ AI.md
│  ├─ DEPLOYMENT.md
│  └─ KNOWN_LIMITATIONS.md
├─ design.md                # supplied visual/design specification
└─ .env.example
```

## Security and privacy

- Sessions are opaque random tokens in `HttpOnly`, `SameSite=Lax` cookies; only the token hash is stored.
- Passwords use Node's `scrypt` with per-password salts. Login uses a dummy hash for unknown emails to reduce timing leaks.
- Every mutating `/api` request requires the `x-requested-with: leaf` header (CSRF defence) in addition to the session cookie.
- All document reads and writes are scoped by `user_id`; another user's ID returns 404.
- Verification and reset tokens are random, hashed at rest, single-use and expiring.
- Uploads are limited by size, MIME filter and magic-byte validation, stored under random names, and removed when replaced or when the account is deleted.
- Public CV access requires sharing to be enabled and not expired. Revoking deletes the identifier, so the old URL is permanently dead.
- `helmet` sets CSP, frame, referrer and HSTS headers in production. Auth, AI and public-PDF endpoints have separate rate limits.
- AI content is always returned as an editable suggestion. Prompts forbid inventing facts and treat document text as data, not instructions.

See [docs/API.md](docs/API.md), [docs/AI.md](docs/AI.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

## Testing

```bash
npm test          # API: auth, ownership, sharing, uploads, real PDF generation
npm run test:e2e  # browser: register → build → share → public → publish → theme
```

The API suite uses an in-memory SQLite database and a temporary uploads directory, and generates a real PDF through the installed browser. The E2E suite starts its own API and Vite servers unless `E2E_BASE_URL` points at an already-running app. See `docs/DEPLOYMENT.md` for CI notes.

## Design notes

- `shared/renderDocument.ts` is the single source of truth for CV and letter HTML. The editor iframe, public shared CV and server PDF all use it, so preview and export cannot drift.
- Document palettes are stored with each document and rendered with `color-scheme: light`; application dark mode never alters a document or PDF.
- The marketing home is a scroll-driven paper: the page's own sections are the only input, and reading one moves the camera to the matching passage, wipes the highlight in and turns the card. `src/components/marketing/story.ts` is the single source for that copy — the sections and the drawn sheet (`storySheet.ts`) both read it, so the card and the page cannot drift.
- The sheet loads Three.js lazily and falls back to a static layered CV when WebGL2, a large screen or motion is unavailable. Personal landing pages use CSS 3D pointer tilt and `IntersectionObserver` reveals, both disabled under `prefers-reduced-motion`.
- Editors save after a short debounce and retry failures without discarding local edits. Version snapshots are coalesced to avoid noise.

## License and demo content

This is a prototype project. The sample persona “Maya Laurent” and all demo copy are fictional. No payment gateway is integrated; every core workflow and both PDF download paths are free.
