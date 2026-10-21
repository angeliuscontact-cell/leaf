# Known limitations

This is a complete prototype, not a production-hardened SaaS. The following limitations are intentional or known, and are useful when evaluating or deploying it.

## Infrastructure

- **One process and one SQLite file.** LEAF is not designed for multiple app instances against the same database. Horizontal scaling would require a networked database and shared rate-limit/session storage. SQLite is durable for a single-node deployment but is not a high-concurrency database.
- **Rate limits are in memory.** General, auth, AI and public-PDF limits reset when the process restarts and are per instance. `trust proxy` must be configured correctly or all clients may share one proxy IP.
- **No automatic backups.** Database and uploads must be backed up by the operator (see [DEPLOYMENT.md](DEPLOYMENT.md)).
- **No object storage or CDN.** Profile photos are written to a local directory and served by Express. Multi-node or ephemeral-disk deployments need external storage.
- **No built-in TLS.** Terminate HTTPS at a reverse proxy. Production cookies are `Secure`, so the app will not authenticate correctly over plain HTTP.
- **No container image or infrastructure-as-code** is supplied; deployment steps are documented but not automated.
- **No job queue.** PDFs are rendered synchronously with a per-process limit of two concurrent browsers/pages. Heavy download traffic will queue or time out.
- **Email depends on Resend.** Without `RESEND_API_KEY`, verification and reset links only appear in API logs/development responses. There is no SMTP adapter.
- **No payment, billing, plans, teams or multi-tenancy.** All core workflows are free. There is no organization/role model; each account is an isolated individual workspace.

## Accounts and security

- **Email verification is not enforced.** New users receive a verification link and a reminder, but can use every feature without verifying. It is a trust signal, not an authorization gate.
- **No OAuth/social login, MFA, passkeys or session-management UI.** Password change revokes other sessions; there is no list of active devices.
- **Password reset requires working email delivery** unless you use the development-only returned links.
- **No CSRF token beyond the custom-header check and `SameSite=Lax` cookie.** This is effective for the bundled browser client but assumes same-origin deployment and no XSS.
- **CSP allows inline styles** (`style-src 'unsafe-inline'`) because document HTML uses inline style attributes. Scripts are restricted to self, but the style policy is not nonce-based.
- **No encryption at rest** beyond any disk-level encryption provided by the host.
- **No virus/malware scanning.** Uploads are size-limited and validated by magic bytes as PNG/JPEG/WebP, then re-served as images. There is no image re-encoding, metadata stripping or AV scan.
- **Uploaded photos are publicly readable by URL.** Filenames are random and unguessable, and not linked from private pages, but `/uploads/<name>` does not require authentication. Do not upload sensitive images.
- **External photo URLs are allowed** and are rendered in public pages/PDFs. A third-party image host could track viewers; LEAF does not proxy or validate image contents.
- **Account deletion is immediate and irreversible.** It removes database rows and the one LEAF-managed profile photo, but cannot remove backups, CDN copies or external images.
- **No data export/portability endpoint.** Documents can be downloaded as PDFs individually; there is no ZIP/JSON account export.
- **No admin console, moderation tools or abuse reporting workflow.**

## AI

- **AI is optional and unconfigured by default.** Manual editing, local reviews, sharing and PDFs work without it.
- **Prompt guardrails are not a factual guarantee.** A language model can still produce unsupported wording. Every suggestion requires user review, and the UI does not auto-apply rewrites.
- **AI output is English-oriented.** Prompts instruct the model to preserve the user's language, but reviews, tone labels and the local fallback are written in English. The deterministic local review is heuristic and English-centric.
- **No streaming.** Responses arrive as complete JSON; long drafts can take several seconds.
- **No token/cost accounting.** Only a per-user daily action count is tracked; provider billing must be monitored separately.
- **Provider portability is limited to the OpenAI chat-completions shape.** Streaming, tool calls, JSON-schema modes and provider-specific features are not used.
- **Review history is read-only.** There is no UI to delete individual AI reviews; deleting a document or the account removes associated reviews.
- **Job-description matching is keyword-based in local mode.** AI mode is better at relevance but is not an ATS simulation.

## Documents and PDFs

- **PDF export requires a locally installed Chromium browser.** If none is available, the endpoint returns `503 PDF_UNAVAILABLE`; there is no serverless PDF fallback.
- **PDF layout is generated by Chromium from A4 CSS.** Entries avoid mid-entry breaks, but very long entries or unusual content can still produce awkward pagination. There is no manual page-break control in the editor.
- **Only bundled Inter and Source Serif 4 fonts** are used. Custom font uploads are not supported.
- **No DOCX or plain-text export.** Output is the live web view and PDF.
- **CV versions are capped at 20 and coalesced.** Snapshots are taken roughly every 20 minutes while editing plus forced snapshots on create/restore. They are not a full revision history, and restore replaces current content.
- **Cover letters are versioned in the database but have no version-history UI.** Only CVs expose restore controls.
- **No real-time collaboration.** Two tabs editing the same document use last-write-wins autosave; there is no conflict detection or live merge.
- **Autosave depends on the network.** Failures preserve local state and offer retry, but closing the tab before a successful save can lose the latest edits.
- **Date fields are free text.** There is no date picker or automatic duration calculation.
- **Document palettes are independent of app theme by design.** Dark mode does not create dark PDFs, which is intentional but may surprise users expecting themed exports.

## Sharing and public pages

- **Cover letters cannot be shared publicly.** Only CVs and landing pages have public routes.
- **CV share links are revocable but not password-protected.** Anyone with the URL can view the CV and download its PDF until expiry or revocation.
- **Expiry is day-granular.** Options are 1–365 days; links are checked against a timestamp, but there is no scheduled cleanup job.
- **Landing pages use a global `/p/<slug>` namespace and no custom domains.** Slugs must be unique across all users. Changing a published slug immediately breaks the old address.
- **Published pages go live on autosave.** There is no separate draft/review workflow; unpublishing is the only way to hide edits, and publishing exposes the current saved content.
- **Landing pages are indexable.** Only shared CVs are marked `noindex`. Public personal sites rely on normal page metadata.
- **No analytics, comments, contact form or spam protection.** Contact is a `mailto:` link; there is no server-side message delivery.
- **The landing page is a single page.** There is no multi-page site builder, blog or CMS.
- **3D/motion is decorative.** The marketing home animates a WebGL sheet only on large screens with WebGL2 and motion enabled; everywhere else it shows a static layered CV, and the "Now showing" stage caption is omitted because there are no animated beats to announce. The sheet is a condensed rendering of the page's story, not a live document. Landing tilt/reveals are disabled under `prefers-reduced-motion`.
- **QR codes encode the public share URL only.** They are generated as PNG and are not tracked or customizable beyond the fixed style.

## Accessibility and browser support

- **No formal WCAG audit or screen-reader test matrix.** Dialogs, labels, focus states, skip links and reduced-motion paths are implemented, but third-party assistive-technology testing has not been performed.
- **Modern evergreen browsers only.** The app relies on modern CSS, `structuredClone`, `AbortSignal.timeout`, `node:sqlite` on the server and ES2020 output. Internet Explorer and older Safari versions are unsupported.
- **The document preview is an iframe.** It is labelled, but complex document navigation inside the iframe may be awkward for keyboard/screen-reader users.
- **Colour contrast of user-chosen document palettes is not validated.** The editor offers presets, but custom hex colours can produce low-contrast documents or PDFs.

## Product scope

- **No template marketplace or custom template editor.** Six CV, three letter and six landing templates are built in.
- **No automatic translation.** Documents can be written in any language, but the interface is English.
- **No calendar, reminders, application tracker or interview preparation.**
- **The demo persona and content are fictional.** `npm run seed` is intended for local evaluation, not production.
- **No browser-based screenshot test suite.** The API tests are comprehensive and E2E covers main workflows, but there is no pixel-diff visual regression suite.
