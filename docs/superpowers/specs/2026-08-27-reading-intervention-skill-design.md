# Reading Intervention Skill — Design

**Date:** 2026-08-27
**Author:** Shie Benaderet, with Claude Code
**Status:** Approved design. Not yet implemented.
**Target location:** `~/.claude/skills/reading-intervention/` (outside this repo)

---

## 1. Purpose

A Claude Code skill that audits classroom copy — teacher-written and AI-generated — for an
8th grade US social studies classroom, and reports what a reader will actually have trouble
with, where, and why.

Stated goals, in the teacher's words:

- "improve everyone's level"
- "provide the appropriate scaffolds for IEP and ML students"
- "nothing feels dumbed down or disengaging"
- prefers "engaging story-telling type writing versus dry prose"
- "everything we create in terms of text has to be SIFTed for accuracy and traceable to
  verifiable sources if it involves historical figures, events, or commentaries"

## 2. Non-goals

- **Not a rewriter by default.** Report is the default mode. Revision is opt-in.
- **Not a readability scorer.** A grade-level number is a band-placement convention, never a target.
- **Not a curriculum.** It audits the artifact in front of it. It does not select texts or plan units.
- **Not a student-facing tool.** Output is for the teacher.
- **Not a substitute for reading intervention.** Wanzek et al. (2013) found extensive reading
  interventions after grade 3 produce mean effects of 0.10–0.16. The skill must never imply that
  fixing one handout does more than that.

## 3. The governing risk

This is the single most important paragraph in the spec.

Individually, every plausible check is defensible-ish. Run twelve unnormed thresholds at once
and you have specified a *passage-shaped optimum*: mid-length sentences, high connective density,
high noun repetition, agent-heavy subjects, a heading every 300 words, 5–8 glossed terms, no
detail that isn't load-bearing.

**That is a readability formula wearing citations, and it is worse than Flesch-Kincaid because
it is invisible.**

The empirical basis for resisting it: Beck, McKeown, Sinatra & Loxterman (1991) revised social
studies text for comprehensibility and the result was **longer and denser** — they added causal
clauses and named referents. Davison & Kantor (1982) is the canonical demonstration that
formula-driven rewriting produces *harder* text, because shortening a sentence usually means
deleting the connective that carried the meaning.

**The productive move is additive.** Every architectural decision below exists to enforce that.

## 4. Architecture — three layers

The central design commitment: **the deterministic script never decides severity.**
A script can only fire on a number, and §9 establishes that most of the relevant numbers have
no defensible grade-8 norm. So the script locates; the model adjudicates; a lint suppresses.

### Layer 1 — Locator (`scripts/locate.py`)

Pure Python 3, **zero imports**. Emits `candidates.json`: locations and measurements only,
no verdicts, no severities, no recommendations.

Rationale for zero dependencies: the machine runs Homebrew Python 3.14 under PEP 668
(externally managed), with no `uv` and no `pipx`. `pip install textstat` fails outright.
A bundled dependency-free analyzer works on first run, survives Python upgrades, and is
portable to a colleague's machine.

What it locates:

| Output | Notes |
|---|---|
| Span segmentation | quoted spans, attribution lines, blockquotes, directions, questions |
| Quoted spans >15 words | with surrounding attribution cluster |
| Sentences >30 words, or with 3+ subordinators | ranked; top 3 only ever surface |
| Words absent from `assets/common-5k.txt` | list, with paragraph and first-use position |
| Pronouns with no antecedent within 2 sentences | candidate dangling references |
| Paragraph pairs with a causal shift and no connective | candidate unmarked causal steps |
| Flesch-Kincaid grade | one pinned implementation, named in every report |
| Word count, paragraph count, estimated reading time | 238 wpm ceiling (Brysbaert 2019) |
| Line width, heading positions | for the access family |

### Layer 2 — Adjudicator (Claude, guided by `references/`)

Reads `candidates.json` plus the reference files plus `reader-profile.md`. Decides which
candidates are real findings. Assigns severity. Quotes the span. Names a remedy.

Every finding must cite a located span. A finding with no span is a bug.

### Layer 3 — Suppression lint (`references/guardrails.md`)

Runs on the skill's own output before the teacher sees it. See §8.

---

## 5. On-disk layout

```
~/.claude/skills/reading-intervention/
├── SKILL.md                   the workflow
├── reader-profile.md          the class, in aggregate — teacher-maintained
├── scripts/
│   └── locate.py              pure Python, zero imports
├── references/
│   ├── checks.md              every check: ID, evidence, severity, scope
│   ├── guardrails.md          the 7 hard rules + the suppression lint
│   ├── bands.md               bands that exist AND bands that do not
│   ├── myths.md               greppable US-history myth triggers (~50 rows)
│   ├── sources.md             verification allowlist, exact URLs
│   ├── do-not-recommend.md    the debunked list
│   ├── strategy-map.md        findings → the 13 existing WalkThrus
│   └── _research/             the 200k-char evidence sweep this spec came from
└── assets/
    └── common-5k.txt          word list for vocabulary banding
```

`bands.md` carries **both** tables. The "bands that do not exist" table is load-bearing: it is
what stops a future revision from quietly inventing a target.

---

## 6. Check families — v1 scope

Thirteen families emerged from the research. Six cannot run on a single file or are the
thinnest-evidenced. **v1 ships nine.**

| ID | Family | Fires on | Scope | Flagship |
|---|---|---|---|---|
| **G** | Gate & routing | which spans are source / scaffold / task | DOC | **G6 ceiling-preservation diff** |
| **S** | Source integrity | verbatim quotes — *severity per check* | SRC | S1 character-level diff vs. repository |
| **T** | Traceability | quotes, people, dates, figures | NARR | live lookup against the allowlist |
| **C** | Coherence | unmarked causal steps, dangling referents | NARR | C1 quoted paragraph pair |
| **K** | Knowledge demand | what the passage assumes is already known | NARR | K1 assumed-knowledge locator |
| **V** | Vocabulary | load-bearing terms, glossing quality | NARR | V3 gloss with no anchor in context |
| **N** | Narrative | the seductive-detail gate | NARR | N2 on-the-causal-chain question |
| **Q** | Task & questions | questions, prompts, directions | TASK | **Q1 passage-independence probe** |
| **A** | Access & delivery | line width, contrast, TTS, alt text, suggested read-aloud stop points (ST4, folded in) | DOC | A1 accommodation/modification line |

**Scope tags:** `NARR` teacher/AI-authored prose · `SRC` verbatim primary source ·
`TASK` questions, directions, prompts, rubric language · `DOC` whole artifact ·
`UNIT` folder of unit materials.

**Deferred to v2, stated honestly:**

- **R — Representation.** Stereotype, single-story framing, erasure. A property of the *corpus*,
  not of one passage. Needs a unit folder as input.
- **X — Text-set design.** Same reason.
- **ST — Structure & signaling.** Genre-conditional and thinnest-evidenced. Only ST4
  (suggested read-aloud stop points) is clearly useful, and it is folded into the A family.

### 6.1 Q1 — the passage-independence probe

**Ship this first if only one check ships.**

One extra model call with the passage *withheld*, attempting to answer the artifact's questions
from general knowledge alone. Count how many are answerable.

No lexicon. No parser. No threshold. An unambiguous count.

Rationale: a passage can be cohesive, glossed, verbatim-faithful, narratively alive, structurally
signaled, traceably sourced and typographically clean — and if the questions can be answered
without reading it, every one of those findings was work spent on a document students will skip.

Requires a learning target (G3). If no target is declared, Q1 **refuses to run and says so.**
It does not guess a target.

### 6.2 G6 — the ceiling-preservation diff

**Ship this second.**

Given two versions of a text (original + a rewrite, or a "support version"), diff four things:

1. **Domain-term and named-entity set** — terms present in the original, absent in the revision
2. **Distinct causes offered per event**
3. **Hedges and qualifiers** — "most historians", "in part", "the evidence suggests"
4. **Word count against concept count**

The discriminator:

- **Word count down + concept count flat → deletion-simplification.** Flag it.
- **Word count up + concepts retained → elaboration.** This is the good outcome.

This operationalizes "improve everyone's level" and "nothing feels dumbed down" as one
measurable comparison. It is also the clean line between *scaffolding* (added glosses, added
background, added connectives, added questions; core prose identical) and *text leveling*
(shorter sentences, removed clauses, removed vocabulary, removed content) — which is exactly
the accommodation / modification distinction in A1.

G6 runs as the **top-level gate on every recommendation the skill emits**, not only on
teacher-supplied variant sets. In `--revise` mode it runs on the skill's own output.

Evidence: Yano, Long & Ross (1994); Oh (2001); Walqui & Bunch (2019); Davison & Kantor (1982).

---

## 7. Severity vocabulary

Four values. A **disposition**, not a rating.

| Value | Meaning |
|---|---|
| **BLOCKING** | Alters the historical record or misstates fact. Must be resolved. Never auto-fixed. |
| **FINDING** | A located defect with a named remedy actionable in one edit. |
| **NOTE** | An observation with no implied defect. Low priority by construction. |
| **QUESTION** | The skill cannot decide this. It asks; the teacher answers. |

**These are never Beginning / Progressing / Proficient / Exemplary.** That four-level scale is
reserved for student proficiency, per the course's one-scale rule. The skill must not emit those
four words about a text.

Two research lenses explicitly proposed mapping severity onto the course scale. **Both proposals
are struck by name in `guardrails.md`, with a note saying why**, or a future implementer will
follow them.

Findings are capped at **12 per artifact**, ordered by measured precision.

---

## 8. Guardrails — the seven hard rules

### A. Never a bare "shorten this" or "simplify this"

These checks may never produce a length- or difficulty-reduction recommendation as their whole
content: readability alarms, sentence-length flags, syntactic-complexity flags, unknown-word
lists, nominalization and passive flags (the remedy is *name the agent*, which usually
lengthens the sentence), and vocabulary triage (the remedy is gloss / front-load / fix
coherence — **never delete or downgrade a word**).

### B. The suppression lint, stated operationally

Every finding is tested before emission:

> Does this remedy reduce word count, term count, distinct-cause count, or hedge count?

If yes, **and** it does not separately name a comprehension feature it repairs (a causal gap, a
dangling referent, an unglossed load-bearing term, an out-of-quote scaffold), **the finding is
withheld.**

In `--revise` mode: refuse any edit that lowers causal-connective count or referential
resolution while lowering the readability score, and report it as
*"score improved, comprehensibility likely worsened (Davison & Kantor, 1982)."*
Refuse any edit whose only effect is splitting a sentence at a subordinating conjunction.

### C. Chunking is a plan, not a prose property

Suggested read-aloud stop points are emitted for the teacher. The skill never says a paragraph
is too long. A 250-word rule applied to narrative history converts a story into a worksheet.

### D. The 5–8 pre-teach cap governs the lesson, never the passage

The passage's term count prints with a standing line beside it:
**"Do not remove terms to lower this number."**
The WWC figure is a conditional panel suggestion, not a ceiling.

### E. No gloss-length or gloss-rarity flags

A rarity rule makes it impossible to gloss *ratify* using *treaty* or *legislature*, and pushes
every gloss toward baby language. Keep only dictionary-syntax, circularity, and no-anchor checks.

### F. No percentages on the page

Even hedged, a coverage number becomes a target. Print the word list, not the rate.

### G. The Smarter Balanced fairness grammar rules never touch narrative prose

SBAC's fairness checklist directs that test language "avoids complex grammar, such as compound
sentences and passive voice." That is a defensible **test-item** rule — on an assessment,
linguistic complexity that is not the construct is construct-irrelevant variance. It is close to
the opposite of what the coherence literature prescribes for **instructional** prose, where
compound sentences are where *because* lives.

Applying it to narrative history arrives at Davison & Kantor's failure by way of an equity
document, which makes it harder to argue with and no less wrong.

### The trap this is all guarding

**The vividness detectors and the narrativity detectors are the same detectors.** Without the N2
gate, the skill will flag an identical sentence as a strength under one principle and a defect
under another — and the "harm is worst for low-prior-knowledge readers" moderator will be used to
argue for stripping detail from *introductory* passages, precisely the passages that need a way in.

---

## 9. Numeric bands

### 9.1 The bands that exist

| Measure | Grade 6–8 | Status | Source |
|---|---|---|---|
| Flesch-Kincaid | 6.51 – 10.34 | band *placement* convention | Student Achievement Partners 2015; CCSSO/NGA 2012 rev. App. A |
| Lexile | 925 – 1185 | same | same |
| Passage length, grade 8 | 400 – 1,000 words | assessment operational spec, partly item-yield driven | NAGB, *2019 NAEP Reading Framework*, Exhibit 5, p.31 |
| Silent reading rate | 238 wpm (adults; 175–300) | **upper bound** for 8th graders | Brysbaert 2019 (190 studies, 18,573 participants) |
| Pre-teach word count | 5–8; >10 counterproductive | panel suggestion, governs the *lesson* | WWC NCEE 2014-4012 Rec.1, p.15 |
| Characters per line | ≤80 ceiling; ~55 measured optimum | standard + one experiment | WCAG 2.2 SC 1.4.8; Dyson & Haselgrove 2001 |
| Line height / size | ≥1.5; never justified; ≥16px | WCAG AAA floor | W3C SC 1.4.8 |

**How the FK band is used, and only this way.** Computed on scaffold spans only — never on a
mixed document, never on a primary source. Emitted as a **two-sided alarm**:

- **below 6.51** → *possible leveling-down.* Cross-check against G6. **This is the alarm that matters here.**
- **above 10.34** → fires **only** if at least one qualitative flag also fired.
- **inside the band** → prints literally: *"In band; this number carries no further information."*

One FK implementation is pinned and named in every report. The CCSS supplement documents that
"researchers found no single answer for what the Flesch-Kincaid score was for a specific text…
Flesch-Kincaid has no caretaker." The skill never compares its number to a number produced elsewhere.

Standing caveat, printed in `bands.md`: the grade-level ground truth behind these bands is largely
expert panels whose judgments already incorporate readability formulas. The bands are a
coordination convention worth honoring; they are not proof that a text at 950L suits a given student.

### 9.2 The bands that do NOT exist

The skill must not invent one, must not print a "target," and must not print a rate:

| Measure | Why not |
|---|---|
| Mean sentence length | The "12–20 word window" was derived by inverting the FK equation. **Deleted.** |
| Causal / contrastive connective density | No norm. Optimizing it manufactures relations; in history a manufactured relation is a factual error. |
| Referential overlap | Coh-Metrix percentiles are relative to the TASA corpus (mean 288.6 words). No grade-8 cut score exists. |
| Unknown-word coverage % | 95/98% thresholds come from adult L2 studies; replications disagree; Schmitt's central finding is a **linear relationship with no cliff**. |
| Nominalization / agentless-passive rate | The ~15% figure has no source. Flag high-stakes instances; never a rate. |
| Narrativity / agent-subject ratio | No norm. |
| Left-embeddedness, modifier load, subordination depth | Coh-Metrix-motivated but non-significant against adult eye-movement data. Concretely: `heavy_sentences()` returns a `subordinators` count per sentence, and that count must stay a locator for a top-3 read-aloud list — never a rate, a threshold, or a "syntactic complexity" score. |
| Words per heading; chunk length | Conventions, not findings. |
| Gloss length; gloss word rarity | McKeown (1993) supports explanation over definition. It supports no word counts. **Deleted.** |
| Questions per passage; second-person density | No norms. |
| Excerpt length 25–300 words | House convention. Labeled as such. |

---

## 10. Report format

Unicode box-drawing and bar glyphs only. **No ANSI escape codes** — Claude Code renders replies
as markdown, so escapes print as literal garbage. Meaning is carried by shape and position, which
also survives being pasted into a doc, an email, or a Canvas comment.

Three labeled sections, always, per the CCSS three-part model (quantitative + qualitative +
reader-and-task):

```
╭─ READING CHECK ─────────────── shays.md ─╮
│ 612 words · 6 ¶ · ~2.6 min silent read   │
╰──────────────────────────────────────────╯

  BAND    6.51 ├──────────●──────┤ 10.34
                          8.2  ✓ in band
          In band. This number carries no
          further information.
          ▲ the alarm here is BELOW 6.51
            (possible leveling-down)

  LENGTH  400 ├─────●──────────┤ 1000   ok
              612 w · NAEP gr-8 spec

  1 BLOCKING · 4 FINDING · 3 NOTE · 2 QUESTION

  ── LOCATED FINDINGS ──────────────────────
  ✗ BLOCKING
    S1  ¶4   quote altered from original
             "publick" → "public"
  ⚑ FINDING
    C1  ¶2→3 causal step unmarked
    V3  ¶1   "specie" — no anchor in context
    T2  ¶6   "1,200 farmers" unattributed

  ── FOR YOU TO DECIDE ─────────────────────
  ?  QUESTION
    N2  ¶3   is the tavern detail on the causal
             chain, or is it colour?
```

The three sections are **BAND PLACEMENT** (everything above the first rule),
**LOCATED FINDINGS**, and **FOR YOU TO DECIDE**. They are always present and always in
this order, even when a section is empty — an empty *FOR YOU TO DECIDE* is information.

Only two measures get a scale, and both have real sources. Everything else is a **located
finding** — a quoted span, a named feature, and what a reader has to do there.

---

## 11. Modes

| Invocation | Behaviour |
|---|---|
| *(automatic)* | Quick pass on any student-facing copy generated in session. **No lookups**, so only the BLOCKING checks that need none: in-quote insertions (S2), unmarked elisions (S3), and myth-trigger hits asserted as fact (T7). **S4 is deliberately excluded** — §6's Family S severities were later corrected to be per-check, and S4 (missing provenance fields) is a FINDING, not BLOCKING, so it does not belong in a BLOCKING-only pass. Any quotation present but unverifiable without a fetch is reported as `quote present, unverified — run /reading-check` rather than passed silently. Seconds. |
| `/reading-check FILE` | Full report with live verification. |
| `--scaffold` | Builds support **around** the text. Never inside it. |
| `--revise` | Applies fixes. Runs the suppression lint and G6 against its own output. |
| `--sift` | Verification pass only. |
| `--diff A B` | Ceiling-preservation comparison between two versions. |

The two-speed trigger keeps the skill habitual without making every turn expensive. Nothing that
costs a live lookup happens unasked.

---

## 12. SIFT layer

### 12.1 Tiering by risk class

**Verified live** — fabrication-prone and cheaply checkable: quotations (verbatim, real source),
named people (real, role correct), dates, offices, titles, and numbers with a documented value.

**Flagged for teacher judgment** — contested, not settleable by lookup: causal claims, motive
assigned to a group, known textbook myths (by name), and prose that flattens a live debate into
settled fact.

A claim is **TRACED** only with a resolving URL from the allowlist **fetched in that run**, plus
an exact-substring match (whitespace and curly quotes normalized; archaic spelling and
capitalization preserved).

### 12.2 Allowlist highlights (`references/sources.md` carries the full table)

Founders Online · Monticello *Spurious Quotations* (checked **first** for any Jefferson
attribution) · Avalon Project · National Archives / DocsTeach · Chronicling America ·
Smithsonian NK360° · **OSPI, John McCoy (lulilaš) Since Time Immemorial** (Washington State
Indigenous history and treaty rights — legally required in WA) · **Densho** (Japanese American
incarceration, Seattle) · JACL *Power of Words* · SPLC *Teaching Hard History* ·
American Historical Association · Gilder Lehrman · American Yawp Reader.

**Cheap, high-yield pre-check** for any famous-figure quotation: search the exact quoted string
plus `spurious` or `misattributed` alongside the attributed name. A hit on Monticello's spurious
list — or the *absence* of any Founders Online hit for a founder quotation — is a reportable
finding on its own.

**Standing distinction:** verification establishes that words were really said, not that they were
accurate or fair. The Mississippi Declaration of Causes is a verbatim primary source *and* a
white-supremacist document. A resolved URL never implies endorsement; provenance and perspective
are separate outputs.

### 12.3 Myth checklist

~50 greppable trigger patterns across four eras, each with a correction and an authority.
Highest-consequence category is slavery / Civil War / Lost Cause. Includes both directions of
error — `Emancipation Proclamation freed the slaves` **and** the overcorrection
`did not free a single slave` are both reportable.

Note the Underground Railroad **quilt code** entry: rejected by both Underground Railroad and
quilt historians, absent from every memoir, diary and 1930s WPA interview, first appearing in
print in 1999 — and unusually common in middle school materials.

---

## 13. Reader profile

`reader-profile.md`, teacher-maintained, in aggregate. Lives in `~/.claude/skills/`, which is
outside this repo — so it is never served by GitHub Pages regardless of `.gitignore` state.

Holds: reading range and median, ML proficiency spread and home languages, IEP reading-goal
types (comprehension vs. decoding — the distinction that decides which supports are relevant,
per the simple view of reading), 504 accommodations in play, and a **prior-units index** of what
the class has and has not yet been taught.

The prior-units index is what makes K1 (assumed-knowledge locator) actionable rather than a
list of every proper noun. Without it, K1 prints the list and calls nothing a defect.

---

## 14. Findings route to existing strategies

`strategy-map.md` connects each family to the thirteen WalkThrus already documented in
`discussion/walkthrus.html`. No new strategy vocabulary is invented — the course already
retired one redundant scale (A/B/C tiers plus a ★–★★★★ support rating) and should not acquire another.

Representative routes (the full table in `strategy-map.md` covers all nine families):

| Family | Routes to |
|---|---|
| K — knowledge demand | Knowledge primer; See · Think · Wonder opener |
| Q — weak or passage-independent questions | Quick-Write → Turn-and-Talk before writing |
| N — contested or flattened framing | Structured Academic Controversy |
| C — causal gap | I Used to Think… Now I Think… |
| V — vocabulary load | GLAD Sentence Stems (as *vocabulary*, never as warrant — see §16) |

---

## 15. Verification plan

The skill is testable against artifacts that already exist:

1. **`discussion_engagement_strategies.md`** — a long, citation-dense, teacher-facing document.
   Known to contain at least two overstated warrants (§16). A good end-to-end test of the T family.
2. **A Canvas assignment page** produced by `canvas-assignment-formatter` — tests the A family
   and the TASK scope.
3. **A primary-source handout** with a known-good original in one of the allowlist repositories —
   tests S1's character-level diff, including whether it catches silent modernization
   (`publick` → `public`).
4. **A deliberately leveled-down rewrite** of a passage — tests G6. Should report
   deletion-simplification.
5. **A passage with questions answerable from general knowledge** — tests Q1.

Each check ships with the artifact that demonstrates it firing and the artifact that demonstrates
it correctly *not* firing.

---

## 16. Corrections to existing course documents

Surfaced by the verification pass. Recorded here because traceability is the course standard,
not to relitigate published work.

- **Project GLAD.** `discussion_engagement_strategies.md` states GLAD "benefits all students,
  not only multilingual learners, especially in vocabulary acquisition." Deussen et al. (2014)
  Year 1 found EL comprehension **b = 6.87, p = 0.099 (non-significant)**; vocabulary *g* = 0.21;
  writing "ideas" *g* = 0.32. The widely-circulated "*g* = 0.46 at intermediate proficiency"
  figure **is not in that report** — the Year 1 report contains no proficiency-level subgroup
  analysis at all.
- **Hammond (2015).** No efficacy trials located. The pedagogical advice can stand on other
  grounds; the neuroscience framing ("amygdala in threat mode") should be dropped.
- **Sentence frames.** Goldenberg (2013): "no published data at all about their effects on ELs'
  learning." Usable as practice; not as warrant.
- **Reisman (2012)** is a quasi-experimental control design with 236 11th graders, **not an RCT**,
  and there is no WWC intervention report for Reading Like a Historian. The randomized, 8th-grade,
  US-history evidence is **PACT**, with a content-acquisition effect of *g* = 0.17.

## 17. Do-not-recommend list

`references/do-not-recommend.md`. The skill refuses to generate these even if asked:

Dyslexia-specific fonts (pooled *g* = −0.04, CI straddling zero; 15 studies, 688 readers —
Azzarello et al. 2026) · Sans Forgetica / perceptual disfluency · coloured overlays ·
learning styles · **chunked / cascading / phrase-boundary formatting as an IEP or ML scaffold**
(the IES-funded RCT with 7th–8th graders found *no interaction* with SPED or EL status; the
modest benefit landed on students already near grade level — Tate et al. 2019) ·
the Underground Railroad quilt code · "stories are 22× more memorable" and related untraceable
storytelling statistics · "it takes 12 (or 17) exposures to learn a word" · CRAAP-test and
domain-suffix source evaluation (this is exactly the vertical reading that fooled the historians
in Wineburg & McGrew 2019) · growth-mindset language as a scaffold.

Plus §7.2–7.4 of the research: program *brands* with weak program-level evidence whose
*practices* may still be cited (SIOP, GLAD, QTEL, UDL/CAST), frameworks usable as vocabulary but
never as warrant (SIFT itself, Willingham's four Cs, DOK, WIDA Key Language Uses), and a list of
figures that must be stated carefully or not at all.

---

## 18. Deferred to v2

- **R — Representation** and **X — Text-set design.** Both are properties of a unit corpus.
  Requires directory input.
- A **`--unit`** mode taking a folder.
- Integration with `canvas-assignment-formatter` so a Canvas page can be audited in place.

## 19. Open items

Ten sources in the research carry figures that were not independently verified against full text.
`references/checks.md` must carry these as TODOs, and **the skill must not print a figure from
them until someone reads the paper**: Kleijn, Pander Maat & Sanders (2019) — load-bearing for
C10, which must not ship as a FINDING until verified · Sundararajan & Adesope (2020) ·
Dexter & Hughes (2011) · Murphy et al. (2009) · Agarwal, Nunes & Blunt (2021) ·
Dunlosky et al. (2013) · Rosenshine, Meister & Chapman (1996) · Cervetti, Wright & Hwang (2016) ·
Hebert et al. (2016) — the "largest effects for students with disabilities" claim is *not* in the
abstract, and is precisely the claim this course would rely on · Wineburg & McGrew (2019) —
per-group percentages are paywalled; cite qualitatively or use Breakstone et al. (2021).

## 20. Evidence provenance

This design derives from a 13-agent research sweep (10 evidence lenses, an adversarial skeptic
pass, a completeness critic, and a synthesis) producing 135 sourced principles. Agents performed
live retrieval rather than citing from memory, downloading and reading the IES practice guides,
WWC 4–9, the 2019 NAEP Reading Framework, the CCSS Appendix A supplement, Delgado et al.'s
print-vs-screen meta-analysis, McKeown, Brysbaert, Kim et al., Patall et al., and
Graham & Hebert's *Writing to Read*.

Full output is preserved at
`~/.claude/skills/reading-intervention/references/_research/` as
`research-synthesis.md` (102k), `research-debunk.md` (34k), and `research-gaps.md` (64k).
