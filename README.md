# teach

The teacher-facing companion site to [mrbsocialstudies.org](https://mrbsocialstudies.org). A slowly growing collection of research-backed classroom resources &mdash; plans, protocols, posters, references &mdash; written for colleagues, not for students.

Lives at **[teach.mrbsocialstudies.org](https://teach.mrbsocialstudies.org)**.

## Structure

One folder per resource. The root `index.html` is the directory that points at them.

```
teach/
├── index.html              ← landing page / directory
├── README.md               ← you are here
├── CNAME                   ← teach.mrbsocialstudies.org
├── discussion/             ← Resource #01 — the Discussion Hub
│   ├── index.html
│   └── walkthrus.html
├── grading/                ← Resource #02 — Zeros and the 50 Floor
│   └── index.html
└── outcomes/               ← Resource #03 — Standards Outcomes Toolkit
    ├── index.html          ← start here
    ├── outcomes-grade-7.html
    ├── outcomes-grade-8.html
    ├── outcomes-sti.html
    ├── outcomes-how-to.html
    ├── build-site.mjs      ← generator (see note below)
    └── files/              ← Canvas outcome CSVs, linked from the pages
        ├── canvas-outcomes-wa-grade7.csv
        ├── canvas-outcomes-grade8.csv
        └── canvas-outcomes-sti.csv

Resource #04 — AMS Intervention Toolkit — is not here; it has its own repo.
See "Resource #04 lives elsewhere" below.
```

Every resource is a self-contained static HTML file (or small set of files) with embedded CSS and minimal inline JS. No build step, no bundler, no framework. Edit in any text editor, commit, push, Pages rebuilds.

### Resource #04 lives elsewhere

The **AMS Intervention Toolkit** (MTSS, Tier 1/2/3) is not in this repo. It has its own
site and its own repository:

- Site: <https://shiebenaderet.github.io/ams-interventions/>
- Repo: <https://github.com/shiebenaderet/ams-interventions>

The landing page links out to it as entry 04. When a resource is good enough to stand on
its own, it gets its own repo and the directory just points at it.

### Navigation is shared

Every page carries the same crumb in the same slot, so no page is a dead end:

```
teach · Mr. B  /  <Resource>
      ↓              ↓
  always "../"   that resource's index
```

The left half is invariant across the whole site and is the way home. Each resource keeps
its own links beside it (the hub's section anchors and path badge, the toolkit's grade
tabs) because those navigate genuinely different content. The landing page is the crumb's
left half only, plus direct links to each resource.

The site is named **teach**, matching the domain. Don't reintroduce "Teaching" as a
brand label — it read as a second site and caused real confusion.

### One exception: `outcomes/` is generated

The Outcomes Toolkit pages were produced by `outcomes/build-site.mjs` from a set of
source files (`standards.json`, `descriptors*.mjs`, `sti.mjs`, and the raw `wa-*.csv`
exports) that are **not in this repo**. The script is committed as the record of how
those pages were built, but it will not run as-is — it fails on the missing imports.

The published HTML is still plain, self-contained, dependency-free static HTML, exactly
like every other resource here. Nothing on the site needs a build step to serve. If you
need to regenerate the pages, restore the source files next to `build-site.mjs`, run
`node build-site.mjs`, and copy `dist-site/outcomes/` back over the folder.

## Adding a new resource

1. Create a new top-level folder, e.g. `stems/`.
2. Put an `index.html` inside. Match the design tokens used across the site &mdash; same palette, same fonts, same quiet editorial feel. The easiest way is to copy the top of `discussion/index.html` as a starting point.
3. Add a new `.entry` card to the root `index.html`, pointing at `./your-folder/`.
4. Commit. Pages rebuilds on push.

That's it. The root `index.html` is the only file that needs to know about the full set of resources &mdash; every resource folder is otherwise independent and portable.

## Design tokens (preserve across resources)

- **Palette:** cream `#FAF6EC`, paper `#FFFEF9`, ink `#2A2018`, maroon `#8B2E2E`, gold `#B8862F`, green `#3d7a3d`, border `#E5DDC8`
- **Display type:** Playfair Display (700/900, italic for emphasis)
- **Body type:** Nunito (400&ndash;800)
- **Accents:** sticky blurred nav, subtle radial-gradient background, gold eyebrow labels, italic maroon `em` inside headings
- **Layout:** `max-width: 1120px` for sections, `~680px` for reading columns, 32px section padding

See the existing `index.html` and `discussion/*.html` for the full vocabulary.

## Principles

1. **Teachers are the audience.** Tone is practical, teacher-to-teacher, research-grounded. No marketing voice. No jargon for jargon's sake.
2. **One folder per resource.** Keeps each piece portable and decoupled. Minor duplication beats a shared framework.
3. **Print-friendly.** Every resource should include a `@media print` block that expands accordions and hides chrome so it prints cleanly.
4. **Built to grow.** The directory is meant to get longer. Don't over-engineer the landing &mdash; just add another `.entry`.

## GitHub Pages setup

- Repo: public, source = `main` branch, `/ (root)` folder.
- `CNAME` at the root contains exactly one line: `teach.mrbsocialstudies.org` &mdash; no quotes, no protocol, no trailing slash.
- DNS: `teach` CNAME pointed at `shiebenaderet.github.io` (or whichever GitHub account hosts this repo).

Pages rebuilds automatically on every push to `main`.

## License

Free to use, adapt, and share with other teachers. If a framing works in your context, consider sharing it back.

---

*Maintained by Shie Benaderet, 8th grade Social Studies, Alderwood Middle School.*
