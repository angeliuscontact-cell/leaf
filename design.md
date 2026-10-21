# LEAF Design System

> Adapted from the supplied `design.md` (Ant Design visual system) and preserved as the visual source of truth. LEAF adds a warm, editorial layer for CVs and personal sites while retaining the Ant Design tokens: blue primary, teal accent, dense enterprise clarity, 4/6/8px radii, subtle shadows and system-first typography.

- **Version:** 1.0
- **Category:** flat-platform with editorial depth
- **Foundation:** Ant Design (enterprise density, predictable controls, visible focus)
- **Brand:** LEAF — a career story that grows. The leaf mark is a quiet nod to growth; it is not used as a decorative pattern everywhere.

---

## 1. Brand principles

1. **The document is the hero.** Marketing surfaces create atmosphere; the editor and preview stay quiet so the user's words lead.
2. **Dense, never cramped.** Ant Design's information-rich rhythm, generous grouping and clear hierarchy.
3. **Light and dark are designed separately.** Dark mode is an intentional navy-slate workspace, not an inversion.
4. **Motion explains.** Scroll motion reveals structure; editor motion confirms which section changed. No animation delays typing, autosave or navigation.
5. **Accessible by default.** WCAG AA contrast, persistent labels, visible focus, keyboard paths, reduced-motion support, no colour-only meaning.

---

## 2. Colour tokens

### Light theme

| Token | Value | Usage |
| --- | --- | --- |
| `bg` | `#f5f5f5` | App and marketing canvas |
| `surface` | `#ffffff` | Cards, panels, sheets |
| `surface-strong` | `#fafafa` | Nested panels, hovered rows |
| `border` | `#d9d9d9` | Controls and separators |
| `text` | `#1f1f1f` | Primary text |
| `text-muted` | `#595959` | Secondary text |
| `primary` | `#1677ff` | Primary actions, links, active nav |
| `primary-strong` | `#0d5fd6` | Hover/pressed |
| `accent` | `#13c2c2` | Secondary emphasis, success, leaf details |
| `danger` | `#cf1322` | Destructive actions and errors |
| `warning` | `#faad14` | Caution |

### Dark theme

| Token | Value | Usage |
| --- | --- | --- |
| `bg` | `#0b1220` | App and marketing canvas |
| `surface` | `#111a2b` | Cards and panels |
| `surface-strong` | `#162238` | Nested panels |
| `border` | `#27364d` | Controls and separators |
| `text` | `#eef3fb` | Primary text |
| `text-muted` | `#9fb0c7` | Secondary text |
| `primary` | `#4c9aff` | Primary actions, links |
| `primary-strong` | `#78b6ff` | Hover |
| `accent` | `#2dd4bf` | Secondary emphasis |
| `danger` | `#ff7875` | Destructive actions |

Colour is never the only signal. Status pills pair a dot/icon with a label. Focus rings use a 2px primary outline with a 2px offset.

### Document palettes (print, independent of app theme)

Documents always render on white paper regardless of the dashboard theme. Presets:

- **Ocean:** `#1677ff` / `#0f3b66` / `#13c2c2`
- **Forest:** `#15803d` / `#1f2937` / `#84cc16`
- **Slate:** `#334155` / `#0f172a` / `#0ea5e9`
- **Berry:** `#9d174d` / `#3b0a1f` / `#f59e0b`
- **Sand:** `#b45309` / `#3f2d20` / `#0f766e`
- **Ink:** `#111827` / `#374151` / `#6b7280`

Custom colours are allowed. The preview and PDF must always use the same resolved values.

---

## 3. Typography

- **Display / UI:** `-apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif` (Inter Variable is bundled for consistent rendering and documents).
- **Editorial / document serif:** `'Source Serif 4 Variable', Georgia, serif`.
- **Mono / metadata:** `'SFMono-Regular', Consolas, monospace`.

### Scale

| Role | Size | Weight | Line-height | Notes |
| --- | --- | --- | --- | --- |
| Display | `clamp(2.75rem, 6vw, 4.5rem)` | 700 | 1.02 | Landing hero only |
| H1 | `2.25rem` | 700 | 1.1 | App page title |
| H2 | `1.5rem` | 650 | 1.2 | Section title |
| H3 | `1.125rem` | 600 | 1.35 | Card title |
| Body | `1rem` | 400 | 1.6 | Default |
| Small | `0.875rem` | 400 | 1.5 | Helper text |
| Label caps | `0.75rem` | 600 | 1.4 | `0.06em` tracking |
| Mono meta | `0.75rem` | 400 | 1.5 | Save status, counts |

Headings use tight tracking (`-0.02em`). Never centre long body copy.

---

## 4. Layout and spacing

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px (Tailwind 4px base).
- Max app content width: `1440px`; dashboard content `1180px`; marketing `1200px`.
- Sidebar: `248px` expanded, `76px` collapsed on large screens, off-canvas sheet below `1024px`.
- Radii: `4px` small controls, `6px` default (buttons/inputs), `8px` cards, `12px` modals, `999px` pills only.
- Cards: 1px border + soft shadow. Avoid stacking multiple heavy shadows.
- Forms: label above input, helper/error below, 8px between controls. No placeholder-only labels.
- Responsive: collapse multi-column editors to one column below `1100px`; preview becomes a toggleable sheet. No horizontal overflow at 320px.

### Public page composition

- Hero: asymmetric two-column, layered CV sheets, subtle 3D, clear CTA pair. On mobile the copy comes first; 3D is replaced by a static layered composition.
- Section rhythm: 96–128px vertical padding desktop, 64–80px mobile.
- Bento feature grid, 1/2/3 columns.
- Template showcase uses genuine rendered CV sheets, not screenshots.
- FAQ accordion with real buttons and `aria-expanded`.

---

## 5. Components

### Buttons

- Primary: `#1677ff` background, white text, 6px radius, 40px min height, 600 weight. Hover darkens; active translates 1px; focus ring visible.
- Secondary: surface background, border, ink text. Accent button limited to a single secondary CTA.
- Ghost: transparent, hover surface-strong. Destructive ghost uses danger.
- Icon buttons: 32–36px square, tooltip via `aria-label` and `title`.
- Loading: spinner replaces leading icon and text remains, `aria-busy`.

### Inputs

- 40px min height, 6px radius, `1px` border, white/surface background.
- Focus: 2px primary ring; error: danger border + text; success: accent only when useful.
- Textareas resize vertically; no auto-growing inside autosave surfaces (avoids layout shifts).
- Colour inputs pair a swatch with a text hex value.

### Cards

- White/surface, 8px radius, 1px border, `shadow-card`.
- Document cards include a real first-page preview, title, updated time, status pill, and a focused action menu.
- Hover raises by 2px only on pointers; no motion for reduced-motion users.

### Modals and sheets

- 12px radius, max width `560px` (small) / `880px` (large), 24px padding, backdrop `rgba(9, 18, 32, .48)` with 4px blur.
- Focus trap, Escape closes, labelled by title, body scroll locked, return focus to trigger.
- Mobile uses full-width bottom sheets for action menus.

### Navigation

- Marketing: transparent over hero, solid surface with 1px border after scroll. Logo, links, theme toggle, login, primary CTA.
- Dashboard: left sidebar with 8px grouped items, active state tinted primary, icons 18px. Mobile: top bar + slide-over sidebar.
- Editor: sticky toolbar with save state, undo/redo, preview/download; section rail.

### Toasts

- Bottom-right desktop, top-center mobile; 8px radius; icon + message; auto-dismiss after 4s; errors persist 7s; announce with `role=status`/`alert`.

---

## 6. 3D and motion

- **Landing 3D:** one lazy-loaded Three.js scene with 3 layered CV sheets, subtle paper lighting, shadows and particles. Pixel ratio capped at 1.5; animation pauses off-screen; mobile uses a static layered CSS fallback; WebGL failure falls back gracefully.
- **Scroll:** GSAP ScrollTrigger for section reveals, a slow hero parallax, and horizontal template drift. Reveals are 420ms, 80ms stagger, opacity + 16px translate + optional 8px blur. Reverse-safe: content remains visible if animations are disabled or interrupted.
- **Editor motion:** selecting a field highlights the matching preview section for 1.6s and scrolls it into view inside the preview pane; newly added items slide in; removed items fade. Motion is tied to real content changes only.
- **Autosave:** 900ms debounce; status transitions `Saving…` → `Saved`/`Couldn't save`; save state never blocks typing.
- **Reduced motion:** `prefers-reduced-motion: reduce` removes smooth scrolling, parallax, 3D auto-motion and non-essential transitions; all functionality remains.

---

## 7. Accessibility

- Landmarks: header/nav/main/footer, one H1 per page.
- Keyboard: every action reachable; skip link; visible focus; Escape closes overlays; arrow keys in menus/tabs where appropriate.
- Form errors: textual, linked with `aria-describedby`, focus moves to first invalid field on submit.
- Colour contrast meets WCAG AA (4.5:1 body, 3:1 large text/UI).
- Images have alt text; decorative 3D is `aria-hidden`.
- Live regions for save state and toast messages.
- `lang="en"`, meaningful page titles, no autoplay media.
- Public CV pages expose a clear "Download PDF" link and owner attribution; shared links can be revoked.

---

## 8. Content voice

- Direct, warm, professional. Short sentences. No hype about AI replacing judgement.
- Say “suggestion”, not “guaranteed improvement”; never imply AI invented facts.
- Empty states explain the next action and offer one primary button.
- Errors say what happened, what remains safe, and what to do next.
- Avoid fake metrics and testimonials. Marketing uses product truths.

---

## 9. Implementation notes

- Tokens are implemented as CSS variables in `src/index.css`: `--canvas`, `--surface`, `--ink`, `--muted`, `--line`, `--accent`, `--primary`. Tailwind maps them to `bg-canvas`, `text-ink`, etc.
- Dark mode uses the `.dark` class plus `data-theme-mode` on `<html>`. Preferences: `light`, `dark`, `system`; persisted locally and on the user record when signed in.
- Document rendering uses its own scoped CSS inside a same-origin iframe so app themes never leak into exports.
- A4 is the canonical document size (210 × 297mm). The preview uses the same HTML/CSS as the server PDF.
- Do not use the brand leaf as a bullet icon in documents. Documents belong to the user, not to LEAF.
