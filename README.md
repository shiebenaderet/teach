# Teaching

The teacher-facing companion site to [mrbsocialstudies.org](https://mrbsocialstudies.org). A slowly growing collection of research-backed classroom resources &mdash; plans, protocols, posters, references &mdash; written for colleagues, not for students.

Lives at **[teaching.mrbsocialstudies.org](https://teaching.mrbsocialstudies.org)**.

## Structure

One folder per resource. The root `index.html` is the directory that points at them.

```
teaching/
├── index.html          ← landing page / directory
├── README.md           ← you are here
├── CNAME               ← teaching.mrbsocialstudies.org
└── discussion/         ← Resource #01 — the Discussion Hub
    ├── index.html
    └── walkthrus.html
```

Every resource is a self-contained static HTML file (or small set of files) with embedded CSS and minimal inline JS. No build step, no bundler, no framework. Edit in any text editor, commit, push, Pages rebuilds.

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
- `CNAME` at the root contains exactly one line: `teaching.mrbsocialstudies.org` &mdash; no quotes, no protocol, no trailing slash.
- DNS: `teaching` CNAME pointed at `shiebenaderet.github.io` (or whichever GitHub account hosts this repo).

Pages rebuilds automatically on every push to `main`.

## License

Free to use, adapt, and share with other teachers. If a framing works in your context, consider sharing it back.

---

*Maintained by Shie Benaderet, 8th grade Social Studies, Alderwood Middle School.*
