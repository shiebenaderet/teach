# `teach` — project guide

The teacher-facing site at **[teach.mrbsocialstudies.org](https://teach.mrbsocialstudies.org)**.
Read this before changing anything; then read `discussion/index.html` and
`outcomes/index.html`, which establish the visual language and tone.

---

## Context

I'm Shie Benaderet, 8th grade Social Studies teacher at Alderwood Middle School. I maintain a
small ecosystem of GitHub Pages sites under `mrbsocialstudies.org` — the main public site at the
apex domain, plus `ss8`, `scotus`, and `current`, each for a different audience. This repo,
`teach`, is the **teacher-facing** companion: research-backed classroom resources aimed at me and
fellow educators, not at students.

The site is named **teach**, matching its domain. It used to call itself "Teaching" in the nav
brand and page titles, which read as a second site and caused real confusion. Don't reintroduce
that label.

## Current state

Four resources are live. Three live in this repo; the fourth has its own.

```
teach/
├── index.html              ← landing page / directory (the only file that knows them all)
├── README.md
├── CNAME                   ← teach.mrbsocialstudies.org
├── discussion/             ← 01 · Discussion Hub
│   ├── index.html
│   └── walkthrus.html
├── grading/                ← 02 · Zeros and the 50 Floor
│   └── index.html
└── outcomes/               ← 03 · Standards Outcomes Toolkit
    ├── index.html
    ├── outcomes-grade-7.html
    ├── outcomes-grade-8.html
    ├── outcomes-sti.html
    ├── outcomes-how-to.html
    ├── build-site.mjs      ← generator; NOT runnable here (see below)
    └── files/              ← Canvas outcome CSVs
```

**04 · AMS Intervention Toolkit** is not in this repo — it's at
<https://shiebenaderet.github.io/ams-interventions/> (repo: `shiebenaderet/ams-interventions`).
The landing page links out to it. When a resource outgrows a single folder, it gets its own repo
and the directory just points at it.

**05 · GLAD sentence-stem poster** is listed as pending, but only half of it is: the stems already
exist as WalkThru 04 in `discussion/walkthrus.html#glad-stems`. What's missing is the large-format
printable. Don't rebuild the stems from scratch.

## Navigation — a site-wide invariant

Every page carries the same crumb in the same slot, so no page is a dead end:

```
teach · Mr. B  /  <Resource>
      ↓                ↓
 always "../"    that resource's index
```

The left half is invariant across the whole site and is the route home. Each resource keeps its own
links beside the crumb — the hub's section anchors and path badge, the toolkit's grade tabs —
because those navigate genuinely different content. The landing page is the crumb's left half only,
plus direct links to each resource.

Class names differ by resource (`.nav-brand`/`.nav-crumb` on the landing and discussion pages,
`.brand`/`.brand-sep`/`.brand-res` in `outcomes/` and `grading/`). That's deliberate — each file is
self-contained. Keep the *shape* consistent, not the selectors.

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

`outcomes/` runs slightly different values (`--maroon: #7B2D26`, `--cream: #FBF5EA`) and is the only
resource with a full dark-mode palette. Known drift, deliberately left alone; reconcile only on
purpose.

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
- Internal links between `discussion/index.html` and `discussion/walkthrus.html` are relative (`href="walkthrus.html"`). They work because both files sit in the same folder. The hub is `discussion/index.html`; walkthrus' "Back to the hub" correctly points at `index.html`, its sibling — not the top-level landing.
- The `CNAME` file at root contains exactly one line: `teach.mrbsocialstudies.org`. No quotes, no trailing slash, no `https://`. Don't rename or move it.
- The hub links out to many external resources (videos, articles, books). If one rots, just update the link — don't remove the resource entry.
- **`outcomes/build-site.mjs` will not run here.** Its inputs (`standards.json`, `descriptors*.mjs`, `sti.mjs`, `wa-*.csv`) live outside the repo. It's committed as the record of how those pages were generated. If you edit an outcomes page by hand, mirror the change in the generator or the next rebuild silently reverts it.
- **Grid tracks must collapse below 400px.** Use `minmax(min(380px, 100%), 1fr)`, never a bare `minmax(380px, 1fr)` — a fixed minimum wider than the available column causes sideways scroll on a phone. This bit `.strategy-grid` once already.
- The landing page's "Source on GitHub" link must point at `shiebenaderet/teach`. It once pointed at `shiebenaderet/Teaching`, an empty private repo, and 404'd for every visitor.

## Verifying a change

No build step and no test suite, so verification is manual but should be actual, not assumed:

1. Serve the repo (`python3 -m http.server`) rather than opening `file://` — folder URLs like `/outcomes/` only resolve over HTTP.
2. Every relative `href`/`src` must resolve. Check folder links (`./outcomes/`) land on a real `index.html`.
3. Every sub-page must have a link that resolves to the site root, and carry the crumb.
4. No horizontal overflow at 400px viewport width. Measure `documentElement.scrollWidth`; don't eyeball it.
5. `discussion/index.html`: the path selector must still set `body[data-path]`, update the nav badge, and persist to `localStorage`.
6. `@media print` present on every page.
7. GitHub Pages serves the **`main`** branch. Work on a feature branch is not live; merge to `main` and confirm the Pages build reports `built` at your commit.

## Future additions

- **GLAD sentence-stem printable** — the stems exist (WalkThru 04); only the large-format poster is missing
- **Parent communication templates** (`parent-comms/`) — drafts and damage-control examples, teacher-to-teacher
- **Unit planning templates** (`planning/`) — the skeleton I use for unit design

When any of these gets built, the top-level `index.html` gets a new card and that's it.

---

*Questions while working? Read `discussion/index.html` and `outcomes/index.html` first — the design
vocabulary is consistent and intentional.*
