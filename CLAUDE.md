# Cowork handoff — `teach` repo

Copy-paste this whole document into a Cowork chat (or keep it in the repo as `HANDOFF.md` for future you / future contributors). It contains everything needed to pick up development without prior context.

---

## Context

I'm Shie Benaderet, 8th grade Social Studies teacher at Alderwood Middle School. I maintain a small ecosystem of GitHub Pages sites under `mrbsocialstudies.org` — `ams` (the main site), `ss8`, `scotus`, `current`, each for a different audience. This repo, `teach`, is the **teacher-facing** companion: a growing collection of research-backed classroom resources aimed at me and fellow educators, not at students.

It lives at `teach.mrbsocialstudies.org`.

The repo is designed to grow. The first resource is a Discussion Hub. Future tenants will likely include a GLAD sentence-stem poster, an MTSS intervention toolkit, and other pedagogy references. Each resource gets its own subfolder; the root `index.html` is the directory.

## Current state

The repo is initialized on GitHub and contains the Discussion Hub files. Target folder structure:

```
teach/
├── README.md                ← repo-level
├── index.html               ← top-level landing page
├── CNAME                    ← contains: teach.mrbsocialstudies.org
└── discussion/
    ├── index.html           ← the Discussion Hub (exists, works)
    └── walkthrus.html       ← the WalkThrus reference page (exists, works)
```

**Read these first** before doing anything: `discussion/index.html` and `discussion/walkthrus.html`. They establish the visual language, typography, palette, and tone for the whole repo. Anything new should feel like it belongs to the same family.

## What I need you to do

### Task 1 — Build the top-level `index.html`

This is the landing page for `teach.mrbsocialstudies.org`. It should:

- Introduce the site in one paragraph (teacher-facing research-backed resources, companion to `ams.mrbsocialstudies.org`)
- Introduce me briefly — 8th grade Social Studies teacher, Alderwood MS — in my own voice, not marketing-speak
- List the Discussion Hub as the first (currently only) resource, with a short description and a clear link to `/discussion/`
- Include a "more coming" note or empty state so it's obvious the site is meant to grow
- Link out to my other sites for context: `ss8.mrbsocialstudies.org`, `scotus.mrbsocialstudies.org`, `current.mrbsocialstudies.org`
- Match the brand (see design system below) but feel distinct from the Discussion Hub — this is a directory, not another hub. Lean lighter, more editorial, more whitespace. Think "journal's table of contents" not "product landing."

Single HTML file, embedded CSS, no build step. Same no-framework approach as the Discussion Hub.

### Task 2 — Rewrite the top-level `README.md`

The current README describes only the Discussion Hub. Replace it with a repo-level README that:

- Describes `teach` as a multi-resource teacher-facing site
- Documents the folder-per-resource pattern (each resource is self-contained in its own subfolder)
- Explains how to add a new resource (drop a folder at root, add it to the top-level `index.html`)
- Points to the GitHub Pages setup and CNAME
- Keeps the tone practical and short

Delete `discussion/README.md` if it exists — the repo-level README replaces it.

## Design system — tokens to preserve across everything

### Palette (CSS custom properties, already in use)
```css
--cream: #FAF6EC;        /* page background */
--cream-dark: #F2ECD9;   /* alternate section background */
--paper: #FFFEF9;        /* cards */
--ink: #2A2018;          /* primary text */
--ink-muted: #665A4B;    /* secondary text */
--ink-subtle: #8B7F6F;   /* tertiary / metadata */
--maroon: #8B2E2E;       /* primary accent, links */
--maroon-dark: #6B1F1F;  /* link hover */
--gold: #B8862F;         /* secondary accent, eyebrows, numerals */
--gold-light: #E5CF8F;
--gold-pale: #F2E8C9;
--green: #3d7a3d;        /* used for "signs it's working" and "start here" */
--border: #E5DDC8;
```

### Typography
- **Display:** Playfair Display (700/900, italic for numerals and emphasis)
- **Body:** Nunito (400–800 weights)
- Google Fonts imports:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,600&family=Nunito:ital,wght@0,400;0,600;0,700;0,800&display=swap" rel="stylesheet">
  ```

### Consistent patterns
- Sticky semi-transparent nav with backdrop-filter blur
- Subtle radial gradients in the body background for warmth
- 32px section padding, `max-width: 1120px` content containers
- Eyebrow labels: 13px, uppercase, letter-spacing 0.14em, gold
- `em` inside headings is italic + maroon (used consistently for emphasis)
- Generous whitespace; avoid decorative noise; editorial feel over product feel

## Architectural principles

1. **Folder per resource.** Each new resource (poster, toolkit, reference) lives in its own top-level subfolder with its own `index.html`. This keeps things portable and prevents coupling.

2. **Top-level `index.html` is the directory.** It's the only file that knows about all resources. Adding a new resource = creating the folder + adding a card to the directory.

3. **Self-contained HTML.** Each resource is a single HTML file with embedded CSS and minimal inline JS. No shared stylesheets, no bundler, no dependencies beyond Google Fonts. Minor duplication is fine; the simplicity is worth it.

4. **Audience is teachers.** Tone is practical, research-grounded, teacher-to-teacher. No jargon for jargon's sake. No marketing voice.

5. **Print-friendly.** Every resource should include a `@media print` block that expands accordions and hides chrome, so teachers can print a WalkThru or poster without fuss.

## Maintenance notes — don't break these

- `discussion/index.html` uses `localStorage` inside a try/catch to remember the selected path. Don't wrap it in anything that breaks the try/catch.
- Internal links between `discussion/index.html` and `discussion/walkthrus.html` are relative (`href="walkthrus.html"`). They work because both files sit in the same folder.
- The `CNAME` file at root contains exactly one line: `teach.mrbsocialstudies.org`. No quotes, no trailing slash, no `https://`. Don't rename or move it.
- The hub links out to many external resources (videos, articles, books). If one rots, just update the link — don't remove the resource entry.

## Verify when done

1. Open `teach/index.html` locally — it should render, look on-brand, and link correctly to `/discussion/`.
2. Open `discussion/index.html` — still works, path selector still works, links to `walkthrus.html` still work.
3. Open `discussion/walkthrus.html` — still works, "Back to the hub" link resolves to `../index.html` **NOT** the hub's internal index. Actually — check this: if the existing back-link in `walkthrus.html` points to `index.html`, it now resolves to the new top-level landing, not the hub. That's probably wrong. The back-link should point to the hub, which is now at `index.html` in the same folder (still `index.html` from walkthrus's perspective since they're siblings). Verify this still works as expected.
4. Commit with a clear message (`Add top-level landing + rewritten README`) and push. GitHub Pages rebuilds automatically.

## Future additions (not urgent — just context for design decisions)

Likely next resources, in rough priority order:

- **GLAD sentence-stem poster** (`stems/`) — printable, color-coded by discourse skill, large-format
- **MTSS intervention toolkit** (`mtss/`) — Tier 1/2/3 guide I've built before, needs a home
- **Parent communication templates** (`parent-comms/`) — drafts and damage-control examples, teacher-to-teacher
- **Unit planning templates** (`planning/`) — the skeleton I use for unit design

When any of these gets built, the top-level `index.html` gets a new card and that's it.

---

*Questions while working? Read the existing `discussion/index.html` and `discussion/walkthrus.html` first — the answers are usually in there. The design vocabulary is consistent and intentional.*