# Scouting report &mdash; diagrams + citations + MTSS

*A working document. Everything below is a recommendation, not a commitment. Rip out what doesn't fit.*

---

## 1. What Caviglioli is actually doing

Spent time with *Dual Coding With Teachers* (2019), *Understanding How We Learn* (2018, with Weinstein & Sumeracki), and *Organise Ideas* (2020). Pulled page renders into `outputs/cav_samples/` and read the relevant chapters. Here's what I think the house style is, reduced to transferable rules:

**Palette &mdash; two colors on off-white.**
One accent (usually red or teal), plus black ink. That's it. No gradients. No drop shadows. The restraint is the point: when everything else is black-on-cream, the one accent color carries *meaning*.

**Layout &mdash; shape carries concept.**
He uses a small, reusable vocabulary:

- **Horizontal bands** for procedures and sequences (time flows left-to-right, phases stack top-to-bottom with gold row labels).
- **Concentric rings** for spatial / role arrangements (who's at the center, who's at the edge).
- **Tree / hub-and-spoke** for conceptual hierarchies (category at top, sub-concepts branching down).
- **Matrix / grid** for comparisons (2×2 or 3×3, clear axes).

Each shape is a signature. A teacher who's seen ten of these learns to read the diagram before reading any labels.

**Typography &mdash; one sans-serif, heavy.**
Bold sans for labels inside shapes. Lighter sans for captions. No serifs inside the diagrams themselves &mdash; serifs live only in the chapter titles and running body.

**Connective tissue &mdash; thin lines, plain arrows, dashed for "optional" or "silent."**
No decorative strokes. Arrow weights don't vary within a diagram. White space does more work than linework.

**Icons &mdash; silhouettes, not illustrations.**
When a person appears, it's a flat two-tone silhouette. No shading, no facial features. The point is role, not character.

### What this gives us

A discipline. If the hub's diagrams obey five rules &mdash; two colors only, one shape-per-function, bold sans inside shapes, dashed-means-silent, and no decorative noise &mdash; they'll read as a family with the rest of the site without us copying Caviglioli literally.

---

## 2. A diagram system for the hub

The hub already has a palette and a type system. The diagram system should slot in, not compete. Mapping:

| Caviglioli convention | Hub token | Use for |
|---|---|---|
| Accent color (his red) | `--maroon` (#8B2E2E) | The *active / arguing / speaking* role |
| Black ink | `--ink` (#2A2018) | The *listening / observing / default* role |
| Off-white background | `--cream` / `--paper` | Canvas |
| Row labels (his gold-ish) | `--gold` (#B8862F) | Phase numbers, eyebrow labels, teacher marker |
| Dashed strokes | `--ink` at 1.2px, `3 4` dasharray | Silent pairings, optional transitions |
| Bold sans inside shapes | Nunito 700/800 | Labels, step numerals |
| Italic serif for numerals | Playfair Display italic | Step numbers (`01 Prep`) |

**Shape choices per WalkThru:**

- Fishbowl (#09) &rarr; concentric rings.
- Structured Academic Controversy (#10) &rarr; horizontal bands (5 phases).
- Socratic Seminar (#11) &rarr; concentric rings with *text* at the center (replace the speaker dot with a document icon &mdash; the text is what everyone circles).
- Jigsaw &rarr; horizontal bands with regrouping arrows between rows.
- Think-Pair-Share &rarr; single band with two dots that duplicate, then merge.
- Chalk Talk &rarr; matrix grid (the board itself).
- Harkness &rarr; hub-and-spoke, lines connecting student to student.

Two prototypes in `diagrams-preview.html` &mdash; Fishbowl (concentric) + SAC (bands). If those read right, the others fall out of the same two templates.

**Build note.** Inline SVG inside each WalkThru `<section>`. No external images. `role="img"` with an `aria-label` so screen readers get the gist. All colors are hard-coded hex *or* reference CSS custom properties via `fill="var(--maroon)"` &mdash; both work in modern browsers and keep the diagram responsive to future palette tweaks.

---

## 3. Citations we can pull to strengthen existing methods

Read through the non-Caviglioli shelf (Wiliam's *Embedded Formative Assessment*, Lemov's *Teach Like a Champion*, Willingham's *Why Don't Students Like School?*, Hattie's *Visible Learning for Teachers*, Sherrington's *Rosenshine's Principles in Action*, Nuthall's *The Hidden Lives of Learners*). For each existing hub method, here's a citation or two that earns its place:

### Discussion in general &mdash; top-level hub claim
- **EEF Dialogic Teaching study (2017)** &mdash; reported roughly 2 months' additional progress in English, science, and maths across upper primary. Useful for the hub's opening paragraph.
- **Nuthall, *The Hidden Lives of Learners* (2007)** &mdash; his transcripts show that roughly a third of what students learn in a classroom they learn from each other, not the teacher. The single best citation for "why discussion, not lecture."

### Fishbowl (#09)
- **Nuthall (2007)** &mdash; the observation that silent students in structured peer talk still learn measurable content from the surrounding dialogue. Supports the "outer ring is actually working" claim.
- **Fiorella & Mayer, *Learning as a Generative Activity* (2015)** &mdash; the *generative act of explaining* drives retention; Fishbowl exposes observers to multiple peer-generated explanations.

### Structured Academic Controversy (#10)
- **D. & R. Johnson, *Creative Controversy* (1995)** &mdash; the foundational SAC research. Consistent finding: students exposed to structured controversy outperform peers in both content mastery and perspective-taking, specifically because of the *switch* step.
- **Kuhn, *The Skills of Argument* (1991)** &mdash; the cognitive demand of having to argue a position you don't hold is the mechanism. Cite once, in the WalkThru's "Why it works" box.

### Socratic Seminar (#11)
- **Bargh & Schul, "On the cognitive benefits of teaching" (1980)** &mdash; three-phase model (preparation, performance, review) maps cleanly onto Socratic prep/seminar/debrief. The preparation phase is where the learning happens, not the seminar itself.
- **Adler's *Paideia Proposal* (1982)** &mdash; original articulation. Worth a footnote, not a full citation.

### Think-Pair-Share
- **Lyman (1981)** &mdash; origin citation.
- **Rowe, "Wait-time: Slowing down may be a way of speeding up" (1986)** &mdash; the three-second rule. TPS is wait-time with a scaffold; pair this citation with the pause-length guidance in the WalkThru.

### Jigsaw
- **Aronson et al., *The Jigsaw Classroom* (1978)** &mdash; original study. Still cited because it still holds up.
- **Hattie (2023 meta-synthesis)** &mdash; jigsaw effect size around 1.20 across studies, placing it in Hattie's top tier. Worth calling out explicitly.

### Chalk Talk / Silent Discussion
- **Bargh & Schul (1980)** again &mdash; the act of writing to be read is itself generative.
- **Graham & Hebert, *Writing to Read* (2010)** &mdash; meta-analysis showing writing about content improves reading comprehension of that content. Supports silent-discussion protocols generally.

### Cold Call (if we add it)
- **Lemov, *Teach Like a Champion 3.0* (2021), Technique 34** &mdash; the source. Tone matters; the WalkThru should emphasize the "warm" in "warm cold call."

### As a theoretical anchor for the whole hub
- **Bruner's three modes of representation** &mdash; enactive (doing), iconic (picturing), symbolic (naming). Every WalkThru that pairs a step list (symbolic) with a diagram (iconic) and student action (enactive) is doing Brunerian work. Not every hub page needs to cite this, but the **about / why this exists** page should. It justifies the diagram system's existence as much as any individual citation.

### Effect-size housekeeping
I'd push back against leaning too heavily on Hattie's single-number effect sizes in the hub's user-facing copy &mdash; they're contested, context-sensitive, and often misread. Use them when the number is genuinely striking (jigsaw 1.20, classroom discussion ~0.82) and skip them when they'd just be decoration.

---

## 4. MTSS &mdash; what Shie already built at ams-interventions

Reviewed the existing site at `shiebenaderet.github.io/ams-interventions/`. Notes:

**What's there.**
A full Panorama-framework-based toolkit. Three tier pages (Tier 1 universal supports, Tier 2 targeted, Tier 3 intensive). Intervention detail pages sit under each tier. Layout is clean and functional &mdash; sidebar nav, card-based intervention list, per-intervention detail pages with sections for "What it is / When to use / How to implement / Data to collect."

**What's different stylistically from `teach`.**
Different palette (cooler, more institutional blues/grays), different typography (system-default-ish, not Playfair+Nunito), more dashboard feel than editorial feel. Which was the right call for that context &mdash; it was compiled from building notes, so it reads like an internal reference tool.

**Porting into `teach/mtss/`: two options.**

1. **Restyle + move.** Clone the content into `teach/mtss/` and retheme it in the hub's visual language. Pros: it becomes discoverable alongside the Discussion Hub, the whole teach.mrbsocialstudies.org ecosystem feels unified. Cons: more work, and the cooler institutional palette actually serves MTSS content well &mdash; MTSS is rightly less "editorial" and more "clinical."

2. **Link, don't move.** Leave it where it is on its own GitHub Pages subdomain. Add an `.entry` card on the `teach` landing page that links out to `ams-interventions`, framed as "an adjacent resource." Pros: zero duplication, respects the fact that the two things have different rhetorical registers. Cons: breaks the folder-per-resource pattern that CLAUDE.md commits to.

**Recommendation: option 2 with an escape hatch.** Add a `teach/mtss/index.html` that's a single-page "about this resource + link out" page. That way the directory pattern is preserved, there's a home for an eventual full port inside `teach`, and the existing site stays alive and undisrupted. If usage patterns later suggest a full migration, the folder is already there.

**One diagram that would earn its keep in MTSS.**
A tier triangle is the obvious one &mdash; but the obvious one is often wrong. More useful: a horizontal-band diagram showing *movement between tiers over time* for one student, annotated with the decision points. That's the thing the Panorama framework is actually about &mdash; tiers aren't identities, they're provisional placements. Worth building when the resource ships.

---

## 5. Roadmap

If we want to ship this, here's the order:

1. **Lock the diagram system.** Review `diagrams-preview.html`. If Fishbowl + SAC read right, we have our vocabulary.
2. **Retrofit the existing WalkThrus.** Add inline SVGs to WalkThru #09 (Fishbowl) and #10 (SAC) first. Those prove the pattern in situ.
3. **Extend to the other WalkThrus.** Socratic Seminar (#11) is next because its diagram is Fishbowl + one text node. Jigsaw and TPS after.
4. **Update citations in `walkthrus.html`.** Add a "Research" pull-quote in each WalkThru's right rail, pulling from the inventory above. Keep each to one or two sources &mdash; more would tip editorial into academic.
5. **Ship an `mtss/` stub.** Single-page redirect + description, per §4 above.

Steps 1&ndash;2 are maybe a half-day of work. Steps 3&ndash;5 are each their own sit-down.

---

## 6. Files in this folder

- `SCOUTING.md` &mdash; this document.
- `diagrams-preview.html` &mdash; hub-styled page with the two prototype SVGs (Fishbowl + SAC). Open it to see the diagrams in context.

Both files live under `/_scout/`, which is intentionally *not* linked from the public hub. Move or delete once the work is shipped or abandoned.

---

*Shie &mdash; read the preview first, then this. The diagrams will make the recommendations concrete in about thirty seconds, where this report takes ten minutes.*
