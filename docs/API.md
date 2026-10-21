# LEAF API

Base path: `/api`. In development Vite proxies `/api` to `http://localhost:4000`; in production Express serves both the API and the built frontend from one origin.

## Conventions

- **Content type:** JSON request bodies (`Content-Type: application/json`). Profile photos use `multipart/form-data`.
- **Authentication:** an `HttpOnly`, `SameSite=Lax` session cookie is set by register/login. Send cookies with `credentials: 'include'`.
- **CSRF:** every mutating request (`POST`, `PUT`, `PATCH`, `DELETE`) must include:

  ```http
  x-requested-with: leaf
  ```

  Missing or incorrect values return `403 { "code": "CSRF" }`. The bundled `src/lib/api.ts` adds it automatically.
- **Authorization:** every document endpoint is scoped to the signed-in user. Resources owned by another user return `404`, not `403`.
- **Timestamps:** ISO 8601 UTC strings.
- **IDs:** positive integers in the path. Share identifiers are 16-character URL-safe random strings.

### Success envelopes

Most endpoints wrap their payload, for example `{ "cv": { ... } }`, `{ "cvs": [ ... ] }` or `{ "profile": { ... } }`. The public endpoints under `/api/public` return the payload directly. `204 No Content` is returned for deletions and logout.

### Error shape

```json
{
  "error": "Human-readable message.",
  "code": "MACHINE_CODE",
  "details": [{ "path": "data.personal.email", "message": "Enter a valid email address." }]
}
```

`details` is present only for validation errors. Common codes:

| Code | Status | Meaning |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | No valid session |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `CSRF` | 403 | Missing `x-requested-with: leaf` |
| `NOT_FOUND` | 404 | Missing document or public resource |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `SLUG_TAKEN` | 409 | Landing address already used |
| `VALIDATION` | 400 | Zod validation failed; see `details` |
| `BAD_ID` | 400 | Invalid numeric id |
| `AI_NOT_CONFIGURED` | 503 | No `AI_API_KEY` on the server |
| `AI_LIMIT` | 429 | Daily per-user AI actions exhausted |
| `AI_RATE_LIMITED` | 429 | Provider or HTTP rate limit |
| `AI_UNAVAILABLE` | 503 | Provider unreachable after retries |
| `PDF_UNAVAILABLE` | 503 | No Chromium installed / rendering failed |
| `RATE_LIMITED` | 429 | General rate limit |
| `AUTH_RATE_LIMITED` | 429 | Auth endpoint rate limit |
| `INTERNAL` | 500 | Unexpected server error |

### Rate limits

Limits are per client IP unless stated otherwise. They apply in addition to any reverse-proxy limits.

| Scope | Limit |
| --- | --- |
| All `/api` requests | 600 per 15 minutes |
| `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` | 25 per 15 minutes |
| All `/ai/*` requests | 15 per minute |
| Public PDF downloads | 20 per minute |
| AI actions per signed-in user | `AI_DAILY_LIMIT` per UTC day (default 20) |

---

## Health

### `GET /api/health`

No authentication. Returns database and AI configuration status.

```json
{ "ok": true, "service": "leaf", "storage": "ok", "ai": "not-configured" }
```

Returns `503` if SQLite cannot be queried.

---

## Authentication

### `POST /api/auth/register`

```json
{ "name": "Maya Laurent", "email": "maya@example.com", "password": "AtLeast8Chars1" }
```

- Name 1–80 characters; valid email; password 8–128 characters with at least one letter and one number.
- Creates a user, a starter profile and a session cookie.
- Returns `201 { "user": { ... } }`. In non-production, also returns `devVerificationUrl`.

### `POST /api/auth/login`

```json
{ "email": "maya@example.com", "password": "AtLeast8Chars1" }
```

Returns `{ "user": { ... } }` and sets the session cookie.

### `POST /api/auth/logout`

Deletes the current session, clears the cookie, returns `204`.

### `GET /api/auth/me`

Returns `{ "user": { "id", "email", "name", "emailVerified", "theme", "createdAt" } }`, or `401`.

### `POST /api/auth/verify-email`

```json
{ "token": "raw-token-from-email" }
```

Marks the email verified. Tokens expire after 48 hours and are single-use.

### `POST /api/auth/resend-verification`

Authenticated. Issues a new verification email. In development the response includes `devVerificationUrl`.

### `POST /api/auth/forgot-password`

```json
{ "email": "maya@example.com" }
```

Always returns the same message to avoid account enumeration. In development, if the account exists, `devResetUrl` is included. Resets expire after one hour; older unused tokens are invalidated.

### `POST /api/auth/reset-password`

```json
{ "token": "raw-token", "password": "NewPassword1" }
```

Updates the password, consumes the token and revokes every session.

### `PATCH /api/auth/account`

Authenticated. Any subset of:

```json
{ "name": "Maya Laurent", "email": "new@example.com", "theme": "dark" }
```

`theme` is `light`, `dark` or `system`. Changing the email marks it unverified and sends a verification message. Returns `{ "user" }`; development may include `devVerificationUrl`.

### `POST /api/auth/change-password`

```json
{ "currentPassword": "OldPassword1", "newPassword": "NewPassword2" }
```

Keeps the current session and signs out every other session.

### `DELETE /api/auth/account`

```json
{ "password": "AtLeast8Chars1" }
```

Permanently deletes the user, their profile, documents, versions, reviews, sessions, public links and uploaded profile photo. Returns `204`.

---

## Career profile

### `GET /api/profile`

Returns the signed-in user's profile. The shape includes:

```json
{
  "profile": {
    "fullName": "", "title": "", "email": "", "phone": "", "city": "", "country": "",
    "website": "", "linkedin": "", "github": "", "summary": "", "photoUrl": "",
    "experiences": [], "education": [], "skills": [],
    "other": [{ "id": 1, "kind": "languages", "data": {}, "sortOrder": 0 }]
  }
}
```

`other[].kind` is one of `languages`, `certifications`, `projects`, `achievements`, `interests`, `references`.

### `PUT /api/profile`

Replaces the scalar profile fields. All string fields are optional in practice and default to empty. `photoUrl` must be empty, an uploaded path under `/uploads/`, or an `http(s)` URL. A non-empty `fullName` also updates the account display name.

### `POST /api/profile/items/:kind`

Adds a repeatable entry. `:kind` is `experience`, `education`, `skills` or one of the `other` kinds.

```json
// experience
{ "role": "Product Designer", "company": "Acme", "location": "Remote", "startDate": "2022", "endDate": "", "current": true, "description": "..." }
// education
{ "institution": "University", "degree": "BA", "field": "Design", "location": "", "startDate": "2018", "endDate": "2021", "details": "" }
// skills
{ "name": "Figma", "level": 4 }
// languages
{ "name": "French", "level": "Fluent" }
// certifications
{ "name": "Certified X", "issuer": "Body", "date": "2024", "url": "https://..." }
// projects
{ "name": "Project", "role": "Lead", "url": "https://...", "startDate": "", "endDate": "", "description": "" }
// achievements
{ "title": "Award", "description": "" }
// interests
{ "name": "Cycling" }
// references
{ "name": "Person", "role": "Manager", "company": "Acme", "email": "", "phone": "" }
```

Returns `201 { "profile": { ... }, "itemId": 12 }`.

### `PATCH /api/profile/items/:kind/:id`

Partial update; unspecified fields retain their current values. Returns `{ "profile" }`.

### `DELETE /api/profile/items/:kind/:id`

Deletes the entry. Returns `{ "profile" }`.

### `POST /api/profile/items/:kind/:id/move`

```json
{ "direction": -1 }
```

`direction` is `-1` (up) or `1` (down). Reorders all entries of that kind. Returns `{ "profile" }`.

### `POST /api/profile/photo`

Authenticated `multipart/form-data` with a single field named `photo`.

- PNG, JPEG or WebP.
- Maximum `UPLOAD_MAX_BYTES` (default 3 MB).
- The file is validated by magic bytes, not just the MIME type.
- The previous LEAF-uploaded photo is deleted.

Returns `201 { "url": "/uploads/<random>.<ext>", "profile": { ... } }`. Old external URLs are not deleted.

---

## CVs

A CV object contains `id`, `title`, `data` (structured content), `settings` (`template`, `primaryColor`, `secondaryColor`, `accentColor`, `font`, `density`, `showPhoto`), `shareEnabled`, `shareId`, `shareExpiresAt`, `createdAt` and `updatedAt`.

CV templates: `classic`, `modern`, `minimal`, `creative`, `academic`, `student`.

### `GET /api/cvs`

Returns `{ "cvs": [ ... ] }`, newest updated first.

### `POST /api/cvs`

```json
{
  "title": "Product designer CV",
  "template": "modern",
  "data": { "...": "optional full CVData" },
  "settings": { "primaryColor": "#1677ff", "font": "sans" }
}
```

The title, template and settings are optional. If `data` is omitted, a blank CV is created. Returns `201 { "cv", "shareUrl": null }`.

### `GET /api/cvs/:id`

Returns `{ "cv", "shareUrl" }`. `shareUrl` is `null` unless sharing is currently enabled.

### `PUT /api/cvs/:id`

Full update. Send any of `title`, `data`, `settings`; omitted values are retained. This is the autosave endpoint. Returns `{ "cv", "shareUrl" }`.

### `PATCH /api/cvs/:id`

Rename only: `{ "title": "New title" }`.

### `POST /api/cvs/:id/duplicate`

Creates a copy owned by the same user without share links or versions. Returns `201 { "cv" }`.

### `DELETE /api/cvs/:id`

Deletes the CV, its versions and AI reviews. Existing public links stop working. Returns `204`.

### `POST /api/cvs/:id/share`

```json
{ "enabled": true, "expiresInDays": 30 }
```

- `expiresInDays` is `1`–`365` or `null` (no expiry). Omit it to keep the current expiry.
- Enabling creates a new opaque `shareId` if the CV was not already shared.
- Changing expiry issues a fresh link and invalidates the old one.
- `{ "enabled": false }` clears the identifier and expiry, permanently revoking the URL.

Returns `{ "cv", "shareUrl" }`. The URL is `${PUBLIC_APP_URL}/cv/<shareId>`.

### `GET /api/cvs/:id/qr`

If sharing is live, returns a 600×600 PNG QR code for the share URL. `400 NOT_SHARED` if sharing is off. `Cache-Control: no-store`.

### `GET /api/cvs/:id/pdf`

Authenticated PDF download. Optional `?inline=1` for inline display. Filename derives from the full name or title. Requires a local Chromium; otherwise `503 PDF_UNAVAILABLE`.

### `GET /api/cvs/:id/versions`

Returns up to 20 snapshots, newest first:

```json
{ "versions": [{ "id": 9, "title": "My CV", "createdAt": "2026-01-01T10:00:00.000Z" }] }
```

Snapshots are coalesced to roughly one every 20 minutes plus a forced snapshot on creation and restore.

### `POST /api/cvs/:id/versions/:versionId/restore`

Restores content and settings from a version. The current state is snapshotted first. Returns `{ "cv" }`.

---

## Cover letters

A letter contains `id`, `title`, `data`, `settings`, `createdAt` and `updatedAt`. Letter templates: `classic`, `modern`, `minimal`. Letters do not have public sharing.

### `GET /api/cover-letters`
### `POST /api/cover-letters`

```json
{
  "title": "Cover letter — Acme",
  "template": "classic",
  "data": {
    "sender": { "fullName": "", "title": "", "email": "", "phone": "", "location": "", "website": "", "photoUrl": "" },
    "recipientName": "", "recipientTitle": "", "company": "", "companyAddress": "",
    "targetRole": "", "date": "", "salutation": "Dear Hiring Manager,",
    "body": "", "closing": "Sincerely,", "signature": "", "jobDescription": ""
  }
}
```

### `GET /api/cover-letters/:id`
### `PUT /api/cover-letters/:id`

Any of `title`, `data`, `settings`.

### `PATCH /api/cover-letters/:id`

`{ "title": "..." }`.

### `POST /api/cover-letters/:id/duplicate`
### `DELETE /api/cover-letters/:id`

Removes the letter, versions and reviews.

### `GET /api/cover-letters/:id/pdf`

Same PDF semantics as CVs. Optional `?inline=1`.

---

## Landing pages

A page contains `id`, `title`, `slug`, `template`, `primaryColor`, `secondaryColor`, `accentColor`, `font`, `published`, `publishedAt`, `data`, `createdAt`, `updatedAt` and, in list/detail responses, `publicUrl`.

Landing templates: `minimal`, `modern`, `creative`, `developer`, `student`, `executive`.

### `GET /api/landing-pages`

Returns `{ "pages": [ ... ] }` with `publicUrl` for each.

### `POST /api/landing-pages`

```json
{ "title": "My professional page", "template": "modern", "data": { "...": "optional" }, "settings": {} }
```

Creates an unpublished draft. The slug is derived from the title, made unique, and stored lowercase with hyphens. Returns `201 { "page", "publicUrl" }`.

### `GET /api/landing-pages/:id`
### `PUT /api/landing-pages/:id`

Any of `title`, `slug`, `data`, `settings`.

- Slug: 3–80 lowercase letters/numbers, single hyphens, no leading/trailing hyphen.
- A duplicate slug returns `409 SLUG_TAKEN`.
- Changing a published page's slug immediately invalidates the old public address.

### `POST /api/landing-pages/:id/publish`

```json
{ "published": true }
```

Publishing makes the page publicly readable. Unpublishing keeps all content but makes the public route return `404`. Returns `{ "page", "publicUrl" }`.

### `DELETE /api/landing-pages/:id`

Deletes the page and its versions/reviews. Returns `204`.

---

## AI

See [AI.md](AI.md) for configuration, prompts and provider behaviour.

### `GET /api/ai/status`

```json
{
  "usage": { "used": 3, "limit": 20, "remaining": 17, "configured": true },
  "provider": "configured"
}
```

### `POST /api/ai/rewrite`

```json
{
  "action": "improve",
  "text": "Responsible for making dashboards.",
  "context": "Product designer CV summary",
  "tone": "confident"
}
```

- `action`: `improve`, `grammar`, `concise`, `professional`, `achievement`, `summary`.
- `tone`: `formal`, `confident`, `concise`, `enthusiastic`.
- `text` 1–8000 characters; `context` up to 3000.
- Returns `{ "text": "...", "usage": { ... } }`. The text is shown as an editable suggestion; it is never saved automatically.

### `POST /api/ai/skills`

```json
{ "role": "Product designer", "existing": ["Figma"], "jobDescription": "" }
```

Returns `{ "skills": ["..."], "usage": { ... } }`. Skills are ideas to verify, not claims added to the document.

### `POST /api/ai/review`

```json
{ "docType": "cv", "docId": 12, "jobDescription": "" }
```

`docType` is `cv`, `cover_letter` or `landing`; the document must belong to the caller. Returns:

```json
{
  "review": {
    "summary": "...",
    "score": 82,
    "critical": [{ "section": "Contact", "message": "...", "severity": "high" }],
    "improvements": [],
    "optional": [],
    "missing": [],
    "source": "ai"
  },
  "usage": { ... }
}
```

### `POST /api/ai/local-review`

Same request body as `/review`. Runs the deterministic local structural check, does not call a provider, does not consume the AI daily limit, and saves a history entry with `source: "local"`. Use this when AI is not configured or fails.

### `POST /api/ai/cover-letter-draft`

```json
{ "docId": 4, "tone": "confident", "instructions": "Focus on design systems." }
```

Returns `{ "body": "paragraphs...", "usage": { ... } }`. The body is an editable suggestion; the editor does not overwrite existing text without confirmation.

### `GET /api/ai/reviews`

Returns the caller's 10 most recent saved reviews with `id`, `docType`, `docId`, `source`, `createdAt` and the parsed `review`.

---

## Public resources

These routes require no session. They return `Cache-Control: no-store` and are safe to link from outside the app. CV routes also send `X-Robots-Tag: noindex, nofollow`.

### `GET /api/public/cvs/:shareId`

Returns the rendered, standalone document HTML:

```json
{
  "title": "Maya Laurent — Product Designer",
  "ownerName": "Maya Laurent",
  "html": "<!doctype html>...",
  "shareId": "AbCdEfGhIjKlMnOp",
  "expiresAt": null,
  "pdfUrl": "/api/public/cvs/AbCdEfGhIjKlMnOp/pdf",
  "updatedAt": "2026-01-01T10:00:00.000Z"
}
```

Returns `404` if sharing is disabled, the link was revoked or the link expired. Share IDs must match `[A-Za-z0-9_-]{10,40}`.

### `GET /api/public/cvs/:shareId/pdf`

Public PDF download for a live share link. Optional `?inline=1`. Same PDF-browser requirement as the authenticated route.

### `GET /api/public/pages/:slug`

Only published pages are returned:

```json
{
  "title": "Maya Laurent — Product Designer",
  "slug": "maya-laurent",
  "template": "modern",
  "primaryColor": "#1677ff",
  "secondaryColor": "#0f3b66",
  "accentColor": "#13c2c2",
  "font": "sans",
  "data": { "...": "landing data" },
  "ownerName": "Maya Laurent",
  "publishedAt": "2026-01-01T10:00:00.000Z",
  "cvShareId": "AbCdEfGhIjKlMnOp",
  "cvShareUrl": "https://leaf.example.com/cv/AbCdEfGhIjKlMnOp",
  "updatedAt": "2026-01-01T10:00:00.000Z"
}
```

`cvShareId`/`cvShareUrl` are non-null only when the linked CV (if any) is currently shared and unexpired.

---

## Dashboard

### `GET /api/dashboard`

One aggregate call for the overview screen:

```json
{
  "cvs": [], "letters": [], "landingPages": [],
  "activities": [],
  "profileCompletion": { "percent": 64, "missing": [] },
  "counts": { "cvs": 2, "letters": 1, "landings": 1, "publishedLandings": 0 },
  "ai": { "used": 0, "limit": 20, "remaining": 20, "configured": false }
}
```

---

## Database schema

The canonical schema is `server/migrations/001_init.sql`. Migrations run automatically at startup and are recorded in `schema_migrations`. Tables:

`schema_migrations`, `users`, `sessions`, `password_resets`, `profiles`, `profile_experiences`, `profile_education`, `profile_skills`, `profile_other_entries`, `cvs`, `cover_letters`, `landing_pages`, `document_versions`, `ai_usage`, `ai_reviews`, `activities`.

All child tables use `ON DELETE CASCADE` from `users`, except session/token tables which are also cascaded. See the SQL file for indexes and uniqueness constraints.
