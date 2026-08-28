# Reading Intervention Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code skill that audits 8th grade US social studies classroom copy and reports located, evidence-backed findings without ever recommending that the text be simplified.

**Architecture:** Three layers. A dependency-free Python script (`locate.py`) *locates* candidate spans and emits measurements only — no verdicts, no severities. Claude *adjudicates* those candidates against seven reference files and a reader profile, assigning one of four severities and quoting the span. A suppression lint *withholds* any finding whose remedy only shortens the text. The script never decides severity; a script can only fire on a number, and most of the relevant numbers have no defensible grade-8 norm.

**Tech Stack:** Python 3 standard library only (`re`, `json`, `sys`, `pathlib`, `argparse`, `difflib`, `unittest`). Markdown reference files. No third-party packages, no build step.

**Spec:** `docs/superpowers/specs/2026-08-27-reading-intervention-skill-design.md`

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **Standard library only.** The target machine runs Homebrew Python 3.14 under PEP 668 (externally managed). `pip install` fails outright; there is no `uv` and no `pipx`. Tests run with `python3 -m unittest`, never pytest.
- **The script never assigns severity.** `locate.py` emits locations and measurements. Any verdict, severity, or recommendation string in `locate.py` is a bug.
- **Severity vocabulary is exactly four values:** `BLOCKING`, `FINDING`, `NOTE`, `QUESTION`.
- **Never emit the words Beginning, Progressing, Proficient, or Exemplary about a text.** That four-level scale is reserved for student proficiency.
- **No ANSI escape codes anywhere in output.** Unicode box-drawing and bar glyphs only.
- **No percentages or rates in output.** Print the word list, never the coverage rate.
- **No check may emit a bare "shorten this" or "simplify this."**
- **Findings cap:** 12 per artifact.
- **FK band, grade 6–8:** `6.51 – 10.34`. Two-sided alarm; the alarm that matters is *below* 6.51.
- **Passage length, grade 8:** `400 – 1000` words (NAGB 2019 NAEP Reading Framework, Exhibit 5, p.31).
- **Silent reading rate:** `238` wpm, used as an upper bound (Brysbaert 2019).
- **Characters per line:** `80` ceiling (WCAG 2.2 SC 1.4.8), `55` measured optimum.
- **Pre-teach word count:** `5–8` — governs the *lesson*, never the passage.
- **Any edit whose span intersects a primary-source span is refused**, and the refusal is shown.

---

## File Structure

All paths are relative to `~/.claude/skills/reading-intervention/` unless stated otherwise.

| File | Responsibility |
|---|---|
| `SKILL.md` | The workflow Claude follows. Routing, modes, the adjudication procedure. |
| `reader-profile.md` | Class composition in aggregate, teacher-maintained. Includes the prior-units index. |
| `scripts/locate.py` | Layer 1. Segmentation, metrics, candidate location, G6 diff, report rendering. |
| `assets/common-5k.txt` | 5,000 most frequent English words, for vocabulary banding. |
| `references/bands.md` | Bands that exist AND bands that do not. Load-bearing. |
| `references/guardrails.md` | Seven hard rules + the suppression lint. Load-bearing. |
| `references/checks.md` | Nine families: ID, evidence, severity, scope. |
| `references/myths.md` | ~50 greppable US-history myth triggers. |
| `references/sources.md` | Verification allowlist with exact URLs. |
| `references/do-not-recommend.md` | The debunked list. |
| `references/strategy-map.md` | Findings → the thirteen existing WalkThrus. |
| `tests/` | `unittest` suite + fixture corpus. |

`locate.py` is one file rather than a package because it is a single-responsibility tool (locate, never judge) and stays under ~600 lines. If it passes 800, split `render_report` into `scripts/render.py`.

---

### Task 1: Scaffold, test harness, and segmentation

**Files:**
- Create: `~/.claude/skills/reading-intervention/scripts/locate.py`
- Create: `~/.claude/skills/reading-intervention/tests/test_segment.py`
- Create: `~/.claude/skills/reading-intervention/tests/fixtures/shays.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `segment(text: str) -> dict` returning
  `{"paragraphs": [{"n": int, "text": str}], "sentences": [{"n": int, "para": int, "text": str}], "quoted_spans": [{"para": int, "text": str, "words": int}]}`

- [ ] **Step 1: Create the directory and its own git repo**

```bash
mkdir -p ~/.claude/skills/reading-intervention/{scripts,tests/fixtures,references,assets}
cd ~/.claude/skills/reading-intervention
git init
printf '__pycache__/\n*.pyc\n' > .gitignore
```

This directory is deliberately **not** inside the `teach` repo. It gets its own history.

- [ ] **Step 2: Write the fixture**

Create `tests/fixtures/shays.md`:

```markdown
In the winter of 1786, Daniel Shays walked out of a Northampton courthouse owing money he did not have in specie.

Some 1,200 farmers marched on the Springfield Armory that January. The state had raised taxes because it owed a war debt, and it demanded payment in hard currency that almost no farmer possessed.

Jefferson, watching from Paris, was unbothered. He wrote to Madison that "a little rebellion now and then is a good thing, and as necessary in the political world as storms in the physical."

The rebellion caused the Constitution.
```

- [ ] **Step 3: Write the failing test**

Create `tests/test_segment.py`:

```python
import unittest, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "scripts"))
from locate import segment

FIXTURE = (pathlib.Path(__file__).parent / "fixtures" / "shays.md").read_text()


class TestSegment(unittest.TestCase):
    def test_counts_paragraphs(self):
        self.assertEqual(len(segment(FIXTURE)["paragraphs"]), 4)

    def test_counts_sentences(self):
        self.assertEqual(len(segment(FIXTURE)["sentences"]), 6)

    def test_sentences_carry_paragraph_number(self):
        s = segment(FIXTURE)["sentences"]
        self.assertEqual(s[0]["para"], 1)
        self.assertEqual(s[-1]["para"], 4)

    def test_finds_the_quoted_span(self):
        q = segment(FIXTURE)["quoted_spans"]
        self.assertEqual(len(q), 1)
        self.assertIn("a little rebellion now and then", q[0]["text"])
        self.assertEqual(q[0]["para"], 3)

    def test_abbreviation_does_not_split_a_sentence(self):
        out = segment("The U.S. Congress met in 1787. It adjourned.")
        self.assertEqual(len(out["sentences"]), 2)

    def test_finds_a_curly_quoted_span(self):
        # Built from escapes so this test cannot be silently normalised into a
        # straight-quote test that would pass for the wrong reason.
        ldq, rdq = "\u201c", "\u201d"
        text = (f"He wrote to Madison that {ldq}a little rebellion now and "
                f"then is a good thing{rdq} and went to dinner.")
        q = segment(text)["quoted_spans"]
        self.assertEqual(len(q), 1)
        self.assertIn("a little rebellion", q[0]["text"])

    def test_curly_quote_closes_a_sentence(self):
        ldq, rdq = "\u201c", "\u201d"
        text = (f"He wrote {ldq}a little rebellion now and then is a good "
                f"thing.{rdq} It alarmed Madison.")
        self.assertEqual(len(segment(text)["sentences"]), 2)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `ModuleNotFoundError: No module named 'locate'`

- [ ] **Step 5: Write the minimal implementation**

Create `scripts/locate.py`:

```python
"""Layer 1 of the reading-intervention skill: LOCATE ONLY.

This module finds spans and measures them. It never assigns a severity,
never emits a recommendation, and never decides whether something is a
defect. Those are Claude's job, guided by references/. A verdict string
in this file is a bug.
"""

import re

ABBREV = {
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "gen", "col", "capt",
    "rev", "hon", "gov", "pres", "sen", "rep", "vs", "etc", "no", "vol", "fig",
    "u.s", "u.k", "d.c", "a.m", "p.m", "b.c", "a.d",
}

# Curly quotes are built from escapes, never typed as literals. Teacher documents
# come out of Google Docs and Word with curly quotes, so these classes must match
# both forms -- but a literal curly character is easily normalised to a straight
# one in transit, which silently collapses ["<curly>] into ["]. Escapes keep this
# file pure ASCII and the compiled pattern correct.
LDQ = "\u201c"   # left curly double quote
RDQ = "\u201d"   # right curly double quote

_SENT_END = re.compile(rf'([.!?]["{RDQ}\')\]]*)\s+(?=[A-Z"{LDQ}(\[])')


def _split_sentences(text):
    """Split on terminal punctuation, holding abbreviations together."""
    parts, buf = [], ""
    for chunk in _SENT_END.split(text):
        buf += chunk
        if _SENT_END.fullmatch(chunk or "") or (chunk and chunk[-1] in '.!?"' + RDQ + "')]"):
            tail = re.sub(r'[^A-Za-z.]', '', buf.split()[-1] if buf.split() else "")
            if tail.lower().rstrip(".") in ABBREV:
                buf += " "
                continue
            parts.append(buf.strip())
            buf = ""
    if buf.strip():
        parts.append(buf.strip())
    return [p for p in parts if p]


_QUOTE = re.compile(rf'["{LDQ}]([^"{LDQ}{RDQ}]{{15,}})["{RDQ}]')   # doubled braces: f-string


def segment(text):
    """Return paragraphs, sentences, and quoted spans with their locations."""
    paras = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    paragraphs, sentences, quoted = [], [], []
    sn = 0
    for pi, ptext in enumerate(paras, start=1):
        paragraphs.append({"n": pi, "text": ptext})
        for s in _split_sentences(ptext):
            sn += 1
            sentences.append({"n": sn, "para": pi, "text": s})
        for m in _QUOTE.finditer(ptext):
            body = m.group(1).strip()
            quoted.append({"para": pi, "text": body, "words": len(body.split())})
    return {"paragraphs": paragraphs, "sentences": sentences, "quoted_spans": quoted}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 7 tests ... OK`

If `test_counts_sentences` fails, print `segment(FIXTURE)["sentences"]` and adjust `_split_sentences` until the six sentences are right. Do not adjust the test to match the code.

- [ ] **Step 7: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "feat: segmentation — paragraphs, sentences, quoted spans"
```

---

### Task 2: G6 ceiling-preservation diff

The spec's second-most-important check, and pure script work. Build it early so a partial implementation is still valuable.

**Files:**
- Modify: `scripts/locate.py` (append)
- Create: `assets/common-5k.txt`
- Create: `tests/test_ceiling.py`
- Create: `tests/fixtures/shays_leveled.md`

**Interfaces:**
- Consumes: `segment()`, `_split_sentences()` from Task 1.
- Produces: `load_wordlist(path=None) -> set[str]`;
  `ceiling_diff(original: str, revision: str, wordlist=None) -> dict` returning
  `{"terms_lost": [str], "causes_original": int, "causes_revision": int, "hedges_original": int, "hedges_revision": int, "words_original": int, "words_revision": int, "concepts_original": int, "concepts_revision": int, "pattern": str}`
  where `pattern` is one of `"deletion-simplification"`, `"elaboration"`, `"mixed"`, `"unchanged"`.

- [ ] **Step 1: Vendor the word list**

```bash
cd ~/.claude/skills/reading-intervention
curl -sS https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa.txt \
  | head -5000 > assets/common-5k.txt
wc -l assets/common-5k.txt   # expect 5000
head -3 assets/common-5k.txt # expect: the / of / and
```

That list is public domain. If the URL is dead, substitute any public-domain frequency list of
≥5,000 lowercase English words, one per line, most-frequent-first, and note the substitution in a
comment at the top of `references/checks.md`.

G6 needs this list to tell a *domain term* from a merely long common word. Without it the concept
set is "words of 7+ letters," which both misses `specie` (6 letters, the canonical Tier-3 term in
this course) and admits `because`, `necessary`, and `political` as if they were domain vocabulary.

- [ ] **Step 2: Write the leveled-down fixture**

Create `tests/fixtures/shays_leveled.md` — the same content with terms stripped, causes collapsed, and hedges removed:

```markdown
In 1786, Daniel Shays left a courthouse. He owed money.

About 1,200 farmers marched on the Springfield Armory. The state had raised taxes.

Jefferson was not worried. He said a little rebellion was a good thing.

The rebellion caused the Constitution.
```

- [ ] **Step 3: Write the failing test**

Create `tests/test_ceiling.py`:

```python
import unittest, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "scripts"))
from locate import ceiling_diff

FX = pathlib.Path(__file__).parent / "fixtures"
ORIG = (FX / "shays.md").read_text()
LEVELED = (FX / "shays_leveled.md").read_text()


class TestCeilingDiff(unittest.TestCase):
    def test_flags_deletion_simplification(self):
        d = ceiling_diff(ORIG, LEVELED)
        self.assertEqual(d["pattern"], "deletion-simplification")

    def test_reports_the_lost_terms(self):
        lost = " ".join(ceiling_diff(ORIG, LEVELED)["terms_lost"]).lower()
        self.assertIn("specie", lost)
        self.assertIn("madison", lost)

    def test_counts_fewer_causes_in_the_leveled_version(self):
        d = ceiling_diff(ORIG, LEVELED)
        self.assertLess(d["causes_revision"], d["causes_original"])

    def test_word_count_dropped(self):
        d = ceiling_diff(ORIG, LEVELED)
        self.assertLess(d["words_revision"], d["words_original"])

    def test_elaboration_is_not_flagged(self):
        expanded = ORIG + (
            "\n\nThe state demanded hard currency because it had borrowed heavily "
            "during the war, and most historians argue the legislature had few "
            "alternatives once its creditors pressed for repayment in specie.\n"
        )
        self.assertEqual(ceiling_diff(ORIG, expanded)["pattern"], "elaboration")

    def test_identical_text_is_unchanged(self):
        self.assertEqual(ceiling_diff(ORIG, ORIG)["pattern"], "unchanged")

    def test_padding_that_drops_a_cause_is_mixed(self):
        base = ("The state raised taxes because it owed a war debt. "
                "Most historians agree the legislature had few alternatives.")
        padded = ("The state raised taxes. It owed a war debt. Most historians "
                  "agree the legislature had few alternatives, and the courts "
                  "continued sitting through the winter months.")
        self.assertEqual(ceiling_diff(base, padded)["pattern"], "mixed")

    def test_ordinary_words_are_not_counted_as_causes_or_hedges(self):
        # 'soften' contains 'often'; 'unlikely' contains 'likely';
        # 'insincere' contains 'since'. Substring counting scored all three.
        text = ("He hoped to soften the response. It was unlikely that Congress "
                "would act, and the apology seemed insincere.")
        d = ceiling_diff(text, text)
        self.assertEqual(d["causes_original"], 0)
        self.assertEqual(d["hedges_original"], 0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_ceiling -v
```

Expected: `ImportError: cannot import name 'ceiling_diff'`

- [ ] **Step 5: Write the implementation**

Append to `scripts/locate.py`:

```python
# --- G6: ceiling-preservation diff -------------------------------------
# Word count down AND something conceptual lost (a term, a cause, or a
# hedge)                              = deletion-simplification.
# Word count up, concepts retained, causes not reduced = elaboration.
# Anything else                       = mixed.
# Yano, Long & Ross (1994); Oh (2001); Davison & Kantor (1982).

CAUSAL = [
    "because", "therefore", "thus", "consequently", "as a result", "so that",
    "since", "hence", "led to", "resulted in", "caused", "in order to",
    "which meant", "for this reason", "owing to", "due to",
]

HEDGES = [
    "most historians", "some historians", "some scholars", "in part",
    "arguably", "the evidence suggests", "likely", "may have", "might have",
    "probably", "it is unclear", "contested", "debated", "appears to",
    "generally", "often", "tended to", "at least in part",
]

_WORD = re.compile(r"[A-Za-z][A-Za-z'\-]*")


def _phrase_re(phrases):
    """Word-boundary matcher for a phrase list.

    Bare substring counting produces false hits on ordinary words:
    'soften' contains 'often', 'unlikely' contains 'likely', 'insincere'
    contains 'since', 'disappears to' contains 'appears to'. Longest-first
    ordering keeps 'at least in part' from being counted as 'in part'.
    """
    ordered = sorted(phrases, key=len, reverse=True)
    return re.compile(r'\b(?:' + "|".join(re.escape(p) for p in ordered) + r')\b')


_CAUSAL_RE = _phrase_re(CAUSAL)
_HEDGES_RE = _phrase_re(HEDGES)


def _count_phrases(text, pattern):
    return len(pattern.findall(text.lower()))


import pathlib

_DEFAULT_WORDLIST = pathlib.Path(__file__).parent.parent / "assets" / "common-5k.txt"


def load_wordlist(path=None):
    p = pathlib.Path(path) if path else _DEFAULT_WORDLIST
    return {line.strip().lower() for line in p.read_text().splitlines() if line.strip()}


def _concept_set(text, wordlist):
    """Proxy for domain terms and named entities, with no NLP dependency.

    A concept is either a capitalised token that is not sentence-initial (a
    proper noun), or a token of 6+ letters that is NOT among the 5,000 most
    frequent English words (a domain term).

    The frequency list is what separates a domain term from a merely long
    common word. Length alone both misses `specie` -- 6 letters, and the
    canonical Tier-3 term in this course -- and admits `because`,
    `necessary`, and `political` as though they were domain vocabulary.
    """
    concepts = set()
    for sent in _split_sentences(text):
        for i, tok in enumerate(_WORD.findall(sent)):
            low = tok.lower()
            if i > 0 and tok[0].isupper():
                concepts.add(low)
            elif len(low) >= 6 and low not in wordlist:
                concepts.add(low)
    return concepts


def ceiling_diff(original, revision, wordlist=None):
    wl = wordlist if wordlist is not None else load_wordlist()
    co, cr = _concept_set(original, wl), _concept_set(revision, wl)
    wo = len(_WORD.findall(original))
    wr = len(_WORD.findall(revision))
    causes_o = _count_phrases(original, _CAUSAL_RE)
    causes_r = _count_phrases(revision, _CAUSAL_RE)
    hedges_o = _count_phrases(original, _HEDGES_RE)
    hedges_r = _count_phrases(revision, _HEDGES_RE)
    lost = sorted(co - cr)

    if wo == wr and not lost and causes_o == causes_r:
        pattern = "unchanged"
    elif wr < wo and (lost or causes_r < causes_o or hedges_r < hedges_o):
        pattern = "deletion-simplification"
    elif wr > wo and not lost and causes_r >= causes_o:
        pattern = "elaboration"
    else:
        pattern = "mixed"

    return {
        "terms_lost": lost,
        "causes_original": causes_o, "causes_revision": causes_r,
        "hedges_original": hedges_o, "hedges_revision": hedges_r,
        "words_original": wo, "words_revision": wr,
        "concepts_original": len(co), "concepts_revision": len(cr),
        "pattern": pattern,
    }
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 15 tests ... OK`

- [ ] **Step 7: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "feat: G6 ceiling-preservation diff — deletion vs elaboration"
```

---

### Task 3: Readability and length metrics

**Files:**
- Modify: `scripts/locate.py` (append)
- Create: `tests/test_metrics.py`

**Interfaces:**
- Consumes: `segment()`, `_WORD`, `_split_sentences`.
- Produces: `syllables(word: str) -> int`; `metrics(text: str) -> dict` returning
  `{"words": int, "sentences": int, "paragraphs": int, "syllables": int, "fk_grade": float, "read_minutes": float, "band": str}` where `band` is `"below"`, `"in"`, or `"above"`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_metrics.py`:

```python
import unittest, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "scripts"))
from locate import syllables, metrics

FIXTURE = (pathlib.Path(__file__).parent / "fixtures" / "shays.md").read_text()


class TestSyllables(unittest.TestCase):
    KNOWN = {
        "rebellion": 3, "specie": 2, "the": 1, "government": 3, "ratify": 3,
        "Massachusetts": 4, "make": 1, "argue": 2, "people": 2, "little": 2,
        "free": 1, "militia": 3, "constitution": 4, "sovereignty": 4,
        "enslaved": 2, "emancipation": 5, "wanted": 2, "landed": 2,
        "marched": 1, "ratified": 3, "declared": 2,
    }

    def test_known_words(self):
        for word, expected in self.KNOWN.items():
            self.assertEqual(syllables(word), expected, msg=word)

    def test_never_returns_zero_for_a_real_word(self):
        self.assertGreaterEqual(syllables("a"), 1)

    def test_empty_string_is_zero(self):
        self.assertEqual(syllables(""), 0)


class TestMetrics(unittest.TestCase):
    def test_reports_counts(self):
        m = metrics(FIXTURE)
        self.assertEqual(m["paragraphs"], 4)
        self.assertEqual(m["sentences"], 6)
        self.assertGreater(m["words"], 60)

    def test_band_placement_at_the_boundaries(self):
        # Both bounds are inclusive. The previous version of this test asserted
        # membership in the same three literals the implementation can produce,
        # so it could not fail. This one pins the actual placement rule.
        from locate import band_for, BAND_LOW, BAND_HIGH
        self.assertEqual(band_for(BAND_LOW), "in")
        self.assertEqual(band_for(BAND_HIGH), "in")
        self.assertEqual(band_for(BAND_LOW - 0.01), "below")
        self.assertEqual(band_for(BAND_HIGH + 0.01), "above")

    def test_above_band_is_detected(self):
        dense = ("The ratification controversy precipitated extraordinary "
                 "legislative reconsideration throughout the confederation. "
                 "Philosophical disagreement among the participating "
                 "commonwealths proved considerable and persistent.")
        self.assertEqual(metrics(dense)["band"], "above")

    def test_below_band_is_detected(self):
        simple = "The dog ran. The cat sat. The sun is up. He got a hat. " * 5
        self.assertEqual(metrics(simple)["band"], "below")

    def test_reading_time_uses_238_wpm(self):
        m = metrics(FIXTURE)
        self.assertAlmostEqual(m["read_minutes"], m["words"] / 238.0, places=3)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_metrics -v
```

Expected: `ImportError: cannot import name 'syllables'`

- [ ] **Step 3: Write the implementation**

Append to `scripts/locate.py`:

```python
# --- Quantitative metrics ----------------------------------------------
# ONE pinned Flesch-Kincaid implementation, named in every report.
# The CCSS Appendix A supplement documents that "Flesch-Kincaid has no
# caretaker" and that implementations disagree, so this number is never
# compared against a number produced anywhere else.
#
# Known limitation: hiatus vowels ("idea" = 3, measured as 2). Accepted.
# Accuracy against a 22-word hand-checked list: 21/22.

FK_IMPL = "reading-intervention/locate.py v1 (stdlib heuristic syllabifier)"
BAND_LOW, BAND_HIGH = 6.51, 10.34
LEN_LOW, LEN_HIGH = 400, 1000
WPM = 238.0

VOWELS = "aeiouy"


def syllables(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    count, prev_vowel = 0, False
    for ch in w:
        is_vowel = ch in VOWELS
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    # Silent -e, but only after a consonant: "make" (1), never "specie" (2).
    if len(w) > 2 and w.endswith("e") and w[-2] not in VOWELS \
            and not w.endswith("le") and count > 1:
        count -= 1
    # Silent -ed after a non-alveolar consonant: "enslaved" (2), "wanted" (2).
    if len(w) > 3 and w.endswith("ed") and w[-3] not in VOWELS \
            and w[-3] not in "td" and count > 1:
        count -= 1
    return max(1, count)


def band_for(fk):
    """Where this number falls in the CCSS grade 6-8 band. Placement only.

    Never a target. The alarm that matters is "below": a passage under the
    band is a possible leveling-down signal, which is the opposite of what
    most readability tools warn about. Both bounds are inclusive.
    """
    if fk < BAND_LOW:
        return "below"
    if fk > BAND_HIGH:
        return "above"
    return "in"


def metrics(text):
    seg = segment(text)
    words = _WORD.findall(text)
    n_words = len(words)
    n_sents = max(1, len(seg["sentences"]))
    n_syll = sum(syllables(w) for w in words)
    fk = 0.39 * (n_words / n_sents) + 11.8 * (n_syll / max(1, n_words)) - 15.59
    fk = round(fk, 2)
    return {
        "words": n_words,
        "sentences": len(seg["sentences"]),
        "paragraphs": len(seg["paragraphs"]),
        "syllables": n_syll,
        "fk_grade": fk,
        "fk_impl": FK_IMPL,
        "read_minutes": round(n_words / WPM, 3),
        "band": band_for(fk),
        "length_in_naep_range": LEN_LOW <= n_words <= LEN_HIGH,
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 23 tests ... OK`

- [ ] **Step 5: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "feat: pinned FK implementation, length and reading-time metrics"
```

---

### Task 4: Syntactic and vocabulary candidates

**Files:**
- Modify: `scripts/locate.py` (append)
- Create: `tests/test_candidates.py`

**Interfaces:**
- Consumes: `segment()`, `_WORD` (Task 1/2); `load_wordlist()` (Task 2).
- Produces:
  `heavy_sentences(text: str, limit: int = 3) -> list[dict]` — `{"n","para","words","subordinators","text"}`, longest-first, **capped at 3**;
  `offlist_words(text: str, wordlist: set) -> list[dict]` — `{"word","para","sentence"}`, first use only;

- [ ] **Step 1: Write the failing test**

Create `tests/test_candidates.py`:

```python
import unittest, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "scripts"))
from locate import heavy_sentences, offlist_words, load_wordlist

FIXTURE = (pathlib.Path(__file__).parent / "fixtures" / "shays.md").read_text()

LONG = (
    "Although the legislature had raised taxes in order to retire the war debt "
    "that it had accumulated while the fighting continued, and although the "
    "farmers who owed those taxes had no hard currency because their own "
    "creditors demanded payment in kind, the courts continued to sit."
)


class TestHeavySentences(unittest.TestCase):
    def test_finds_a_long_multi_clause_sentence(self):
        out = heavy_sentences(LONG)
        self.assertEqual(len(out), 1)
        self.assertGreater(out[0]["words"], 30)
        self.assertGreaterEqual(out[0]["subordinators"], 3)

    def test_caps_at_three(self):
        out = heavy_sentences(" ".join([LONG] * 8))
        self.assertEqual(len(out), 3)   # 8 qualifying sentences must cap to exactly 3

    def test_short_prose_yields_nothing(self):
        self.assertEqual(heavy_sentences("The dog ran. The cat sat."), [])

    def test_returns_no_severity_or_recommendation(self):
        for cand in heavy_sentences(LONG):
            self.assertNotIn("severity", cand)
            self.assertNotIn("recommendation", cand)


class TestOfflistWords(unittest.TestCase):
    def setUp(self):
        self.wl = load_wordlist()

    def test_wordlist_loads(self):
        self.assertGreaterEqual(len(self.wl), 4900)
        self.assertIn("the", self.wl)

    def test_finds_specie(self):
        found = {w["word"] for w in offlist_words(FIXTURE, self.wl)}
        self.assertIn("specie", found)

    def test_common_words_are_not_flagged(self):
        found = {w["word"] for w in offlist_words(FIXTURE, self.wl)}
        self.assertNotIn("the", found)
        self.assertNotIn("money", found)

    def test_first_use_only(self):
        text = "The specie problem. Another specie problem. A third specie problem."
        hits = [w for w in offlist_words(text, self.wl) if w["word"] == "specie"]
        self.assertEqual(len(hits), 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_candidates -v
```

Expected: `ImportError: cannot import name 'heavy_sentences'`

- [ ] **Step 3: Write the implementation**

Append to `scripts/locate.py`:

```python
# --- Syntactic and vocabulary candidates -------------------------------
# These LOCATE. They do not judge. There is deliberately no mean-sentence-
# length output: the familiar "12-20 word window" was derived by inverting
# the Flesch-Kincaid equation, which makes it a readability target wearing
# a disclaimer. See references/bands.md.

SUBORDINATORS = {
    "because", "although", "though", "while", "whereas", "since", "unless",
    "until", "after", "before", "when", "whenever", "where", "wherever",
    "if", "that", "which", "who", "whom", "whose", "than", "as",
}

HEAVY_WORDS = 30
HEAVY_SUBS = 3
HEAVY_CAP = 3

def heavy_sentences(text, limit=HEAVY_CAP):
    """Longest, most-embedded sentences. Capped, because the guardrails
    forbid emitting a sentence-length rate or a per-sentence verdict."""
    out = []
    for s in segment(text)["sentences"]:
        toks = _WORD.findall(s["text"])
        subs = sum(1 for t in toks if t.lower() in SUBORDINATORS)
        if len(toks) > HEAVY_WORDS and subs >= HEAVY_SUBS:
            out.append({
                "n": s["n"], "para": s["para"],
                "words": len(toks), "subordinators": subs, "text": s["text"],
            })
    out.sort(key=lambda c: (-c["words"], c["n"]))
    return out[:limit]


def offlist_words(text, wordlist):
    """Words absent from the frequency list, first use only.

    Returns the list, never a rate. Coverage percentages are forbidden: the
    95/98% thresholds come from adult L2 studies and Schmitt's central
    finding is a linear relationship with no cliff.

    A capitalised token is a proper noun if it appears capitalised anywhere
    away from a sentence start. A token that ONLY ever opens a sentence is
    genuinely ambiguous without a parser, so it is returned with
    `sentence_initial_capital` set and Layer 2 decides whether it is
    vocabulary or a knowledge demand. Guessing here would be the locator
    making a judgment, which is the one thing this module must not do.
    """
    sents = segment(text)["sentences"]
    proper, lowercased = set(), set()
    for s in sents:
        for i, tok in enumerate(_WORD.findall(s["text"])):
            if i > 0 and tok[0].isupper():
                proper.add(tok.lower())
            elif tok[0].islower():
                lowercased.add(tok.lower())

    seen, out = set(), []
    for s in sents:
        toks = _WORD.findall(s["text"])
        for i, tok in enumerate(toks):
            low = tok.lower().strip("'-")
            if len(low) < 4 or low in wordlist or low in seen:
                continue
            if low in proper:
                continue                      # resolved proper noun: K family, not V
            seen.add(low)
            out.append({
                "word": low, "para": s["para"], "sentence": s["text"],
                "sentence_initial_capital": (
                    i == 0 and tok[0].isupper() and low not in lowercased),
            })
    return out
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 31 tests ... OK`

- [ ] **Step 5: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "feat: syntactic and vocabulary candidate location + 5k word list"
```

---

### Task 5: Cohesion candidates

**Files:**
- Modify: `scripts/locate.py` (append)
- Create: `tests/test_cohesion.py`

**Interfaces:**
- Consumes: `segment()`, `_WORD`, `_CAUSAL_RE` (Task 2).
- Produces:
  `dangling_pronouns(text: str) -> list[dict]` — `{"pronoun","sentence_n","para","text"}`;
  `causal_gaps(text: str) -> list[dict]` — `{"from_para","to_para","from_text","to_text"}`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_cohesion.py`:

```python
import unittest, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "scripts"))
from locate import dangling_pronouns, causal_gaps


class TestDanglingPronouns(unittest.TestCase):
    def test_flags_a_pronoun_with_no_antecedent(self):
        out = dangling_pronouns("This changed everything. The farmers marched.")
        self.assertTrue(any(d["pronoun"] == "this" for d in out))

    def test_does_not_flag_a_resolved_pronoun(self):
        text = "The legislature raised taxes. It demanded hard currency."
        self.assertEqual(dangling_pronouns(text), [])

    def test_returns_no_severity(self):
        for d in dangling_pronouns("This changed everything. Farmers marched."):
            self.assertNotIn("severity", d)


class TestCausalGaps(unittest.TestCase):
    def test_flags_an_unmarked_causal_step(self):
        text = (
            "The state demanded payment in hard currency.\n\n"
            "Farmers lost their farms at auction across the western counties.\n"
        )
        self.assertEqual(len(causal_gaps(text)), 1)

    def test_marked_causation_is_not_flagged(self):
        text = (
            "The state demanded payment in hard currency.\n\n"
            "Because almost no farmer held specie, farms went to auction.\n"
        )
        self.assertEqual(causal_gaps(text), [])

    def test_single_paragraph_yields_nothing(self):
        self.assertEqual(causal_gaps("One paragraph only."), [])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_cohesion -v
```

Expected: `ImportError: cannot import name 'dangling_pronouns'`

- [ ] **Step 3: Write the implementation**

Append to `scripts/locate.py`:

```python
# --- Cohesion candidates -----------------------------------------------
# Reports LOCATED GAPS, never a connective-density or referential-overlap
# number. No grade-8 norm exists for either, and optimising connective
# density manufactures relations -- in history, a manufactured causal
# relation is a factual error. See references/bands.md §9.2.

VAGUE_PRONOUNS = {"this", "that", "these", "those", "it", "they", "them", "such"}


OUTCOME_MARKERS = [
    "lost", "losing", "loses",
    "failed", "failing", "fails",
    "collapsed", "collapsing", "collapses",
    "rose", "rising", "rises",
    "fell", "felled", "falling", "falls",
    "died", "dying", "dies",
    "won", "winning", "wins",
    "surrendered", "surrendering", "surrenders",
    "auction", "auctioned", "auctions",
    "seized", "seizing", "seizes",
    "ended", "ending", "ends",
    "began", "beginning", "begins",
    "spread", "spreading", "spreads",
]
_OUTCOME_RE = _phrase_re(OUTCOME_MARKERS)   # 'extended' must not match 'ended' 


def dangling_pronouns(text):
    """Sentences opening with a vague pronoun, with the preceding sentence attached.

    This LOCATES; it does not decide whether the reference resolves. Four
    successive heuristics (token length, determiner adjacency, bare-plural
    subject, subject position) each traded one error class for another,
    because deciding whether an antecedent exists is a parsing judgment --
    and making it here would be Layer 1 doing Layer 2's job with string
    matching instead of a parser.

    Claude adjudicates using `previous_sentence`. A passage-opening pronoun
    carries None. On a 5,000-word teacher document this yields roughly 20
    candidates, about 5% of sentences, well inside the adjudication budget.
    """
    sents = segment(text)["sentences"]
    out = []
    for i, s in enumerate(sents):
        toks = _WORD.findall(s["text"])
        if not toks or toks[0].lower() not in VAGUE_PRONOUNS:
            continue
        out.append({
            "pronoun": toks[0].lower(),
            "sentence_n": s["n"],
            "para": s["para"],
            "text": s["text"],
            "previous_sentence": sents[i - 1]["text"] if i > 0 else None,
        })
    return out


def causal_gaps(text):
    """Adjacent paragraphs where the second states an outcome and no causal
    connective marks the step. Output is the quoted pair, for Claude to judge."""
    paras = segment(text)["paragraphs"]
    out = []
    for a, b in zip(paras, paras[1:]):
        low_b = b["text"].lower()
        if not _OUTCOME_RE.search(low_b):
            continue
        if _CAUSAL_RE.search(low_b):      # word-boundary; see _phrase_re in Task 2
            continue
        out.append({
            "from_para": a["n"], "to_para": b["n"],
            "from_text": a["text"], "to_text": b["text"],
        })
    return out
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 37 tests ... OK`

- [ ] **Step 5: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "feat: cohesion candidates — dangling referents and unmarked causal steps"
```

---

### Task 6: Access metrics, CLI, and the candidates.json contract

**Files:**
- Modify: `scripts/locate.py` (append)
- Create: `tests/test_cli.py`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces:
  `access_metrics(text: str) -> dict` — `{"max_line_chars","long_lines","headings","images_without_alt"}`;
  `analyze(text: str) -> dict` — the full `candidates.json` payload;
  `main(argv) -> int` — CLI supporting `FILE`, `--diff A B`, `--json`.

- [ ] **Step 1: Write the failing test**

Create `tests/test_cli.py`:

```python
import unittest, sys, json, subprocess, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "scripts"))
from locate import analyze, access_metrics

ROOT = pathlib.Path(__file__).parent.parent
FIXTURE = ROOT / "tests" / "fixtures" / "shays.md"


def _all_keys(obj):
    """Every dict key in a nested payload, recursively."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _all_keys(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _all_keys(v)


class TestAccessMetrics(unittest.TestCase):
    def test_flags_a_long_line(self):
        m = access_metrics("x" * 120 + "\nshort\n")
        self.assertEqual(m["max_line_chars"], 120)
        self.assertEqual(len(m["long_lines"]), 1)

    def test_finds_an_image_without_alt(self):
        m = access_metrics('![](pic.png) and ![a map](map.png)')
        self.assertEqual(m["images_without_alt"], 1)

    def test_collects_headings(self):
        m = access_metrics("# Title\n\ntext\n\n## Part One\n")
        self.assertEqual(len(m["headings"]), 2)


class TestAnalyze(unittest.TestCase):
    def test_payload_has_every_section(self):
        out = analyze(FIXTURE.read_text())
        for key in ("metrics", "quoted_spans", "heavy_sentences",
                    "offlist_words", "dangling_pronouns", "causal_gaps",
                    "access", "schema_version"):
            self.assertIn(key, out)

    def test_payload_has_no_verdict_keys(self):
        """The architectural guard: locate.py locates, it never judges.

        Checks KEYS and the metrics block only. Scanning the whole JSON blob
        would false-positive the moment a passage contains the word "note" or
        "beginning", because analyze() echoes the source text in `paragraphs`.
        """
        keys = {k.lower() for k in _all_keys(analyze(FIXTURE.read_text()))}
        for banned in ("severity", "verdict", "recommendation", "finding",
                       "priority", "rating"):
            self.assertNotIn(banned, keys, msg=f"locate.py emitted key {banned!r}")

    def test_metrics_block_carries_no_verdict_strings(self):
        m = analyze(FIXTURE.read_text())["metrics"]
        strings = " ".join(str(v) for v in m.values()).lower()
        for banned in ("blocking", "should", "simplify", "shorten",
                       "beginning", "progressing", "proficient", "exemplary"):
            self.assertNotIn(banned, strings, msg=banned)

    def test_band_is_a_position_not_a_judgment(self):
        self.assertIn(analyze(FIXTURE.read_text())["metrics"]["band"],
                      {"below", "in", "above"})


class TestCLI(unittest.TestCase):
    def _run(self, *args):
        return subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "locate.py"), *args],
            capture_output=True, text=True,
        )

    def test_emits_valid_json(self):
        r = self._run(str(FIXTURE), "--json")
        self.assertEqual(r.returncode, 0, msg=r.stderr)
        self.assertIn("metrics", json.loads(r.stdout))

    def test_diff_mode(self):
        r = self._run("--diff", str(FIXTURE),
                      str(ROOT / "tests" / "fixtures" / "shays_leveled.md"), "--json")
        self.assertEqual(r.returncode, 0, msg=r.stderr)
        self.assertEqual(json.loads(r.stdout)["pattern"], "deletion-simplification")

    def test_missing_file_exits_nonzero(self):
        self.assertNotEqual(self._run("no-such-file.md", "--json").returncode, 0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_cli -v
```

Expected: `ImportError: cannot import name 'access_metrics'`

- [ ] **Step 3: Write the implementation**

Append to `scripts/locate.py`:

```python
# --- Access metrics and the CLI ----------------------------------------

import json
import sys
import argparse

SCHEMA_VERSION = 1
LINE_CEILING = 80        # WCAG 2.2 SC 1.4.8
LINE_OPTIMUM = 55        # Dyson & Haselgrove 2001

_IMG = re.compile(r'!\[([^\]]*)\]\([^)]+\)')
_HEADING = re.compile(r'^(#{1,6})\s+(.+)$', re.M)


def access_metrics(text):
    lines = text.splitlines()
    long_lines = [
        {"line": i, "chars": len(ln)}
        for i, ln in enumerate(lines, start=1) if len(ln) > LINE_CEILING
    ]
    return {
        "max_line_chars": max((len(ln) for ln in lines), default=0),
        "line_ceiling": LINE_CEILING,
        "line_optimum": LINE_OPTIMUM,
        "long_lines": long_lines,
        "headings": [{"level": len(m.group(1)), "text": m.group(2)}
                     for m in _HEADING.finditer(text)],
        "images_without_alt": sum(1 for m in _IMG.finditer(text) if not m.group(1).strip()),
    }


def analyze(text, wordlist=None):
    """The full candidates payload. Locations and measurements only."""
    wl = wordlist if wordlist is not None else load_wordlist()
    seg = segment(text)
    return {
        "schema_version": SCHEMA_VERSION,
        "metrics": metrics(text),
        "paragraphs": seg["paragraphs"],
        "quoted_spans": seg["quoted_spans"],
        "heavy_sentences": heavy_sentences(text),
        "offlist_words": offlist_words(text, wl),
        "dangling_pronouns": dangling_pronouns(text),
        "causal_gaps": causal_gaps(text),
        "access": access_metrics(text),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(
        prog="locate.py",
        description="Locate candidate spans in classroom copy. Emits no verdicts.",
    )
    ap.add_argument("file", nargs="?", help="text or markdown file to analyse")
    ap.add_argument("--diff", nargs=2, metavar=("ORIGINAL", "REVISION"),
                    help="G6 ceiling-preservation diff between two versions")
    ap.add_argument("--json", action="store_true",
                    help="emit JSON on stdout (currently the only format; "
                         "Task 12's report renderer branches on this)")
    args = ap.parse_args(argv)

    try:
        if args.diff:
            a, b = (pathlib.Path(p).read_text() for p in args.diff)
            payload = ceiling_diff(a, b)
        elif args.file:
            payload = analyze(pathlib.Path(args.file).read_text())
        else:
            ap.print_help()
            return 2
    except (OSError, UnicodeDecodeError) as exc:
        # UnicodeDecodeError is a ValueError, NOT an OSError. A Word export, a
        # Latin-1 file, or anything with a UTF-16 BOM hits it, and those are
        # exactly the files a teacher points this at.
        print(f"locate.py: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 47 tests ... OK`

`test_payload_contains_no_severities` is the architectural guard for this whole plan. If it fails, `locate.py` has started making judgments and the three-layer split has been violated. Fix `locate.py`, never the test.

- [ ] **Step 5: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "feat: access metrics, analyze() payload, and CLI"
```

---

### Task 7: bands.md and guardrails.md — the load-bearing reference files

Build these before any other reference file. Everything downstream must obey them.

**Files:**
- Create: `references/bands.md`
- Create: `references/guardrails.md`
- Create: `tests/test_references.py`

**Interfaces:**
- Consumes: nothing.
- Produces: two reference files that `SKILL.md` (Task 11) loads on every run.

- [ ] **Step 1: Write the failing test**

Create `tests/test_references.py`:

```python
import unittest, pathlib

REF = pathlib.Path(__file__).parent.parent / "references"


class TestBands(unittest.TestCase):
    def setUp(self):
        self.text = (REF / "bands.md").read_text()

    def test_has_both_tables(self):
        self.assertIn("bands that exist", self.text.lower())
        self.assertIn("do not exist", self.text.lower())

    def test_names_the_deleted_measures(self):
        low = self.text.lower()
        for measure in ("mean sentence length", "connective density",
                        "unknown-word coverage", "gloss", "nominalization"):
            self.assertIn(measure, low, msg=measure)

    def test_carries_the_exact_fk_band(self):
        self.assertIn("6.51", self.text)
        self.assertIn("10.34", self.text)

    def test_states_the_alarm_direction(self):
        self.assertIn("below", self.text.lower())


class TestGuardrails(unittest.TestCase):
    def setUp(self):
        self.text = (REF / "guardrails.md").read_text()

    def test_has_seven_rules(self):
        self.assertEqual(self.text.count("### Rule "), 7)

    def test_forbids_bare_simplify(self):
        self.assertIn("shorten this", self.text.lower())

    def test_cites_davison_and_kantor(self):
        self.assertIn("Davison", self.text)

    def test_strikes_the_proficiency_scale_mapping(self):
        low = self.text.lower()
        self.assertIn("proficient", low)
        self.assertIn("struck", low)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_references -v
```

Expected: `FileNotFoundError: .../references/bands.md`

- [ ] **Step 3: Write `references/bands.md`**

Copy §9.1 and §9.2 of the spec verbatim — both tables, the "how the FK band is used" paragraph, and the standing circularity caveat. Then append:

```markdown
## Why the second table exists

Specs normally list capabilities. This file spends half its length listing
refusals, because every measure in the second table is available, computable,
and plausible-sounding, and each carries a threshold with no grade-8 norm
behind it.

Run twelve unnormed thresholds at once and you have specified a
passage-shaped optimum: mid-length sentences, high connective density, high
noun repetition, agent-heavy subjects, a heading every 300 words, 5–8 glossed
terms, no detail that isn't load-bearing. That is a readability formula
wearing citations, and it is worse than Flesch-Kincaid because it is invisible.

Without this table written down, a future revision adds them back one at a
time, each individually defensible, and reassembles exactly that failure.
```

- [ ] **Step 4: Write `references/guardrails.md`**

Copy §8 of the spec, with each of the seven rules under a `### Rule A` … `### Rule G` heading so the test can count them. Include verbatim:

- Rule A: never a bare "shorten this" or "simplify this," with the full list of checks it binds
- Rule B: the suppression lint, stated operationally, including the exact refusal string
  `"score improved, comprehensibility likely worsened (Davison & Kantor, 1982)"`
- Rule C: chunking is a plan, not a prose property
- Rule D: the 5–8 pre-teach cap governs the lesson, with the standing line
  `"Do not remove terms to lower this number."`
- Rule E: no gloss-length or gloss-rarity flags
- Rule F: no percentages on the page
- Rule G: the Smarter Balanced fairness grammar rules never touch narrative prose

Then add the struck-proposals section:

```markdown
## Struck by name

Two research lenses proposed mapping severity onto the course's four-level
proficiency scale — the storytelling lens's text-structure principle, and the
background-knowledge lens's Kaefer principle ("a same-day primer is evidence
the passage can now be read at Beginning/Progressing").

**Both are struck.** They violate the one-scale rule that the course already
paid for once, when it retired an A/B/C tier system plus a separate ★–★★★★
support rating for being three overlapping scales students had to learn.

They are recorded here rather than deleted silently, because an implementer
who rediscovers them without this note will follow them.

## The trap all seven rules guard

The vividness detectors and the narrativity detectors are the same detectors.
Without the N2 gate, the skill flags an identical sentence as a strength under
one principle and a defect under another — and the "harm is worst for
low-prior-knowledge readers" moderator gets used to argue for stripping detail
from introductory passages, precisely the passages that need a way in.
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 55 tests ... OK`

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "docs: bands.md and guardrails.md — the load-bearing references"
```

---

### Task 8: checks.md — the nine families

**Files:**
- Create: `references/checks.md`
- Modify: `tests/test_references.py` (append a `TestChecks` class)

**Interfaces:**
- Consumes: `references/bands.md`, `references/guardrails.md`.
- Produces: the check catalogue `SKILL.md` adjudicates against. Every check has a stable ID (`G1`, `S1`, `Q1`, …) used verbatim in report output.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_references.py`:

```python
class TestChecks(unittest.TestCase):
    def setUp(self):
        self.text = (REF / "checks.md").read_text()

    def test_all_nine_families_present(self):
        for fam in ("Family G", "Family S", "Family T", "Family C", "Family K",
                    "Family V", "Family N", "Family Q", "Family A"):
            self.assertIn(fam, self.text, msg=fam)

    def test_flagship_checks_documented(self):
        self.assertIn("Q1", self.text)
        self.assertIn("G6", self.text)

    def test_source_family_is_blocking(self):
        idx = self.text.index("Family S")
        self.assertIn("BLOCKING", self.text[idx:idx + 2000])

    def test_carries_the_unverified_source_todos(self):
        for name in ("Kleijn", "Hebert", "Dexter"):
            self.assertIn(name, self.text, msg=name)

    def test_deferred_families_are_named(self):
        self.assertIn("v2", self.text)
        self.assertIn("Representation", self.text)
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_references -v
```

Expected: `FileNotFoundError: .../references/checks.md`

- [ ] **Step 3: Write `references/checks.md`**

Source material: `references/_research/research-synthesis.md` §1, which already contains the full check tables. Transcribe families G, S, T, C, K, V, N, Q, A. For each check give: ID, what it measures, how it is computed or judged, severity when it fires, evidence (author + year), and scope tag (`NARR` / `SRC` / `TASK` / `DOC`).

Required structure per family:

```markdown
## Family S — Primary-source integrity

All checks in this family are **BLOCKING**. Any proposed edit whose span
intersects a `SRC` span is refused, and the refusal is shown.

| ID | Check | Computed / judged | Severity | Evidence | Scope |
|----|-------|-------------------|----------|----------|-------|
| S1 | Verbatim diff | Retrieve repository text; character-level diff, normalising only whitespace and curly quotes. Report every substitution including `publick` → `public`. | BLOCKING | Caulfield 2019; NARA | SRC |
| … | | | | | |
```

Give `Q1` and `G6` their own prose subsections, copied from spec §6.1 and §6.2, including the rule that **Q1 refuses to run and says so when no learning target is declared** — it does not guess a target.

End the file with:

```markdown
## Unverified sources — do not print a figure from these

The research sweep could not verify these against full text. **The skill must
not print a figure from any of them until someone reads the paper.**

- **Kleijn, Pander Maat & Sanders (2019)** — load-bearing for C10. **C10 must
  not ship as a FINDING until verified.**
- **Hebert et al. (2016)** — the "largest effects for students with or at risk
  of disabilities" claim is *not* in the abstract. This is precisely the claim
  this course would lean on.
- **Dexter & Hughes (2011)** — the ES = .91 figure is not in the abstract.
- Sundararajan & Adesope (2020) · Murphy et al. (2009) · Agarwal, Nunes &
  Blunt (2021) · Dunlosky et al. (2013) · Rosenshine, Meister & Chapman (1996) ·
  Cervetti, Wright & Hwang (2016) · Wineburg & McGrew (2019) — per-group
  percentages are paywalled; cite qualitatively or use Breakstone et al. (2021).

A tool that audits other people's sourcing has no standing if its own reference
files carry unverified numbers.

## Deferred to v2

- **R — Representation** and **X — Text-set design.** Both are properties of a
  unit corpus, not of one passage. They need directory input.
- **ST — Structure & signaling.** Genre-conditional and thinnest-evidenced.
  Only ST4 (suggested read-aloud stop points) is clearly useful, and it is
  folded into Family A.
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 60 tests ... OK`

- [ ] **Step 5: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "docs: checks.md — nine families with IDs, evidence, and scope"
```

---

### Task 9: myths.md and sources.md — the SIFT data

**Files:**
- Create: `references/myths.md`
- Create: `references/sources.md`
- Modify: `tests/test_references.py` (append `TestMyths`, `TestSources`)

**Interfaces:**
- Consumes: nothing.
- Produces: the greppable trigger table and the verification allowlist that Family T consults.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_references.py`:

```python
class TestMyths(unittest.TestCase):
    def setUp(self):
        self.text = (REF / "myths.md").read_text()

    def test_has_at_least_forty_triggers(self):
        rows = [ln for ln in self.text.splitlines()
                if ln.startswith("|") and "---" not in ln]
        self.assertGreaterEqual(len(rows), 40)

    def test_covers_both_directions_of_the_emancipation_error(self):
        low = self.text.lower()
        self.assertIn("freed the slaves", low)
        self.assertIn("did not free a single slave", low)

    def test_includes_the_quilt_code(self):
        self.assertIn("quilt", self.text.lower())

    def test_every_row_names_an_authority(self):
        for ln in self.text.splitlines():
            if ln.startswith("|") and "---" not in ln and "Trigger" not in ln:
                self.assertGreaterEqual(len(ln.split("|")), 5, msg=ln)


class TestSources(unittest.TestCase):
    def setUp(self):
        self.text = (REF / "sources.md").read_text()

    def test_includes_core_repositories(self):
        for host in ("founders.archives.gov", "avalon.law.yale.edu",
                     "docsteach.org", "loc.gov", "monticello.org"):
            self.assertIn(host, self.text, msg=host)

    def test_includes_washington_state_required_sources(self):
        self.assertIn("ospi.k12.wa.us", self.text)
        self.assertIn("densho.org", self.text)

    def test_states_the_provenance_perspective_distinction(self):
        self.assertIn("endorsement", self.text.lower())

    def test_defines_what_traced_means(self):
        self.assertIn("TRACED", self.text)
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_references -v
```

Expected: `FileNotFoundError: .../references/myths.md`

- [ ] **Step 3: Write `references/myths.md`**

Transcribe §5 of `references/_research/research-synthesis.md` — all four era sections, ~50 rows. Columns: `Trigger patterns | Correction | Authority`.

Preserve these specifically, they are the highest-value rows:

- `states' rights` as *the* cause with no named right → the seceding states named it themselves; route to the Mississippi and Georgia declarations on Avalon
- `Emancipation Proclamation freed the slaves` → applied only to areas in rebellion
- `did not free a single slave` → **overcorrection, equally reportable**
- `quilt code` + `Underground Railroad` → no memoir, diary, or 1930s WPA interview mentions it; enters print in 1999; unusually common in middle school materials
- `loyal slaves` · `servants` · `plantation hands` → euphemism
- `slaves` as a noun where `enslaved people` is available → **advisory, not error**
- Confederate monuments erected `after the war` → the wave is 1890s onward

- [ ] **Step 4: Write `references/sources.md`**

Transcribe §6 of the synthesis — the full routing table with exact URLs. Open with the definition:

```markdown
A claim is **TRACED** only with a resolving URL from this list **fetched in
this run**, plus an exact-substring match (whitespace and curly quotes
normalised; archaic spelling and capitalisation preserved).
```

Include the Washington-specific entries — OSPI *Since Time Immemorial* (legally required in WA) and Densho — and close with:

```markdown
## Cheap, high-yield pre-check

For any famous-figure quotation, search the exact quoted string plus
`spurious` or `misattributed` alongside the attributed name. A hit on
Monticello's spurious list — or the *absence* of any Founders Online hit for a
founder quotation — is a reportable finding on its own.

## Provenance is not endorsement

Verification establishes that words were really said, not that they were
accurate or fair. The Mississippi Declaration of Causes is a verbatim primary
source *and* a white-supremacist document. A resolved URL never implies
endorsement. Provenance and perspective are separate outputs.
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 68 tests ... OK`

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "docs: myths.md and sources.md — SIFT triggers and verification allowlist"
```

---

### Task 10: do-not-recommend.md, strategy-map.md, reader-profile.md

**Files:**
- Create: `references/do-not-recommend.md`
- Create: `references/strategy-map.md`
- Create: `reader-profile.md`
- Modify: `tests/test_references.py` (append `TestDoNotRecommend`, `TestStrategyMap`)

**Interfaces:**
- Consumes: nothing.
- Produces: the refusal list, the routing table to existing WalkThrus, and the teacher-maintained profile template.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_references.py`:

```python
class TestDoNotRecommend(unittest.TestCase):
    def setUp(self):
        self.text = (REF / "do-not-recommend.md").read_text()

    def test_names_the_debunked_items(self):
        low = self.text.lower()
        for item in ("opendyslexic", "learning styles", "sans forgetica",
                     "colored overlays", "quilt", "craap", "growth mindset"):
            self.assertIn(item, low, msg=item)

    def test_names_the_cascading_text_inversion(self):
        low = self.text.lower()
        self.assertIn("cascading", low)
        self.assertIn("no interaction", low)

    def test_separates_brands_from_practices(self):
        self.assertIn("practices", self.text.lower())


class TestStrategyMap(unittest.TestCase):
    def setUp(self):
        self.text = (REF / "strategy-map.md").read_text()

    def test_routes_to_existing_walkthrus(self):
        for move in ("See", "Think", "Wonder", "Quick-Write",
                     "Turn-and-Talk", "Structured Academic Controversy"):
            self.assertIn(move, self.text, msg=move)

    def test_forbids_inventing_new_strategy_names(self):
        self.assertIn("walkthrus.html", self.text)

    def test_covers_all_nine_families(self):
        for fam in "GSTCKVNQA":
            self.assertIn(f"**{fam}**", self.text, msg=fam)
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_references -v
```

Expected: `FileNotFoundError: .../references/do-not-recommend.md`

- [ ] **Step 3: Write `references/do-not-recommend.md`**

Transcribe §7.1–7.4 of the synthesis. Structure as four sections:

1. **Refuse to generate these even if asked** — dyslexia fonts (pooled *g* = −0.04, CI straddling zero; 15 studies, 688 readers; Azzarello et al. 2026), Sans Forgetica / perceptual disfluency, coloured overlays, learning styles, **cascading / phrase-boundary formatting as an IEP or ML scaffold** (Tate et al. 2019: *no interaction* with SPED or EL status; benefit landed on students already near grade level), the Underground Railroad quilt code, "stories are 22× more memorable," "12 exposures to learn a word," CRAAP test and domain-suffix heuristics, growth-mindset language as a scaffold.
2. **Brands with weak program-level evidence — cite the practice, never the brand** — SIOP, Project GLAD, QTEL, UDL/CAST, sentence frames, Krashen's comprehensible input, Beck's three tiers as *printed labels*, Muhammad's HILL, Hammond's *CRT and the Brain* (refuse the neuroscience framing specifically).
3. **Frameworks usable as vocabulary, never as warrant** — SIFT itself, Willingham's four Cs, DOK, Bloom-adjacent verb taxonomies, WIDA Key Language Uses, ACT's RSVP dimensions, Walqui's six scaffold types, Caviglioli's layout advice.
4. **Figures to state carefully or not at all** — Reisman (2012) is quasi-experimental with 236 11th graders, **not an RCT**, and there is no WWC intervention report for Reading Like a Historian; the randomized 8th-grade US-history evidence is PACT at *g* = 0.17. CORI is *d* ≈ 0.26 in this context, not 0.91. Formative assessment is *d* = 0.20 (Kingston & Nash 2011), not 0.4–0.7. Morphology instruction does **not** show comprehension effects (Goodwin & Ahn 2013). Choice does not improve learning (*d* = 0.10, non-significant). Recht & Leslie (1988) excluded students below the 30th percentile — precisely this course's IEP population.

Close with the calibration line:

```markdown
## Calibration for the whole enterprise

Wanzek et al. (2013) found extensive reading interventions after grade 3
(19 studies) produced mean effects of **0.10 to 0.16**, with no significant
differences by group size, hours, or grade level. The skill must never imply
that fixing one handout does more than that.
```

- [ ] **Step 4: Write `references/strategy-map.md`**

Open with the constraint, then the table for all nine families:

```markdown
Findings route to strategies that **already exist** in
`~/Developer/teach/discussion/walkthrus.html`. Do not invent new strategy
names. The course retired one redundant scale already (A/B/C tiers plus a
separate ★–★★★★ support rating) for being three overlapping systems students
had to learn. A parallel strategy vocabulary is the same mistake.

| Family | Finding shape | Routes to |
|---|---|---|
| **G** | routing / ceiling loss | (no strategy — report to teacher) |
| **S** | source altered | (no strategy — BLOCKING, fix the text) |
| **T** | claim untraced | (no strategy — verify or attribute) |
| **C** | causal gap | I Used to Think… Now I Think… |
| **K** | assumed knowledge | knowledge primer + See · Think · Wonder |
| **V** | vocabulary load | GLAD Sentence Stems *(as vocabulary, never as warrant — see do-not-recommend.md §2)* |
| **N** | contested or flattened framing | Structured Academic Controversy |
| **Q** | passage-independent questions | Quick-Write → Turn-and-Talk before writing |
| **A** | delivery / access | Exit Tickets for the formative check |
```

- [ ] **Step 5: Write `reader-profile.md`**

A template with every field commented, and a header stating it is teacher-maintained and lives outside the `teach` repo:

```markdown
# Reader Profile — maintained by Shie Benaderet

This file lives in `~/.claude/skills/`, **outside** the `teach` repo, so it is
never served by GitHub Pages regardless of `.gitignore` state. Aggregate only;
no individual student is named.

Refresh each fall.

## Class
- Course / grade:
- Sections:

## Reading
- Range:
- Median:

## Multilingual learners
- WIDA levels present:
- Home languages:

## IEP reading goals
- Comprehension-goal students (approx.):
- Decoding-goal students (approx.):

> The comprehension/decoding split decides which supports are relevant at all
> (the simple view of reading, Gough & Tunmer). Without it, K and V findings
> route the same way for two populations that need opposite things.

## 504 / accommodations in play
-

## Prior-units index — what has and has not been taught yet
- Taught so far:
- NOT yet taught:

> This index is what makes K1 actionable rather than a list of every proper
> noun. Without it, K1 prints the list and calls nothing a defect.
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 74 tests ... OK`

- [ ] **Step 7: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "docs: do-not-recommend, strategy-map, and reader-profile template"
```

---

### Task 11: SKILL.md — the workflow

**Files:**
- Create: `SKILL.md`
- Create: `tests/test_skill_md.py`

**Interfaces:**
- Consumes: every reference file, `scripts/locate.py`.
- Produces: the frontmatter `name` / `description` that governs when Claude invokes the skill, and the adjudication procedure.

- [ ] **Step 1: Write the failing test**

Create `tests/test_skill_md.py`:

```python
import unittest, pathlib, re

SKILL = pathlib.Path(__file__).parent.parent / "SKILL.md"


class TestSkillMd(unittest.TestCase):
    def setUp(self):
        self.text = SKILL.read_text()

    def test_has_frontmatter_with_name_and_description(self):
        m = re.match(r"^---\n(.*?)\n---\n", self.text, re.S)
        self.assertIsNotNone(m, "SKILL.md needs YAML frontmatter")
        self.assertIn("name: reading-intervention", m.group(1))
        self.assertIn("description:", m.group(1))

    def test_description_covers_the_trigger_cases(self):
        fm = re.match(r"^---\n(.*?)\n---\n", self.text, re.S).group(1).lower()
        for cue in ("reading", "passage", "scaffold", "readab"):
            self.assertIn(cue, fm, msg=cue)

    def test_documents_all_modes(self):
        for mode in ("--scaffold", "--revise", "--sift", "--diff"):
            self.assertIn(mode, self.text, msg=mode)

    def test_loads_the_guardrails_before_adjudicating(self):
        gi, ai = self.text.index("guardrails.md"), self.text.index("Adjudicat")
        self.assertLess(gi, ai, "guardrails must be loaded before adjudication")

    def test_states_the_four_severities_and_no_others(self):
        for sev in ("BLOCKING", "FINDING", "NOTE", "QUESTION"):
            self.assertIn(sev, self.text, msg=sev)
        for banned in ("Progressing", "Exemplary"):
            self.assertNotIn(f"severity: {banned}", self.text)

    def test_caps_findings_at_twelve(self):
        self.assertIn("12", self.text)

    def test_forbids_ansi(self):
        self.assertIn("ANSI", self.text)
        self.assertNotIn("\x1b[", self.text)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_skill_md -v
```

Expected: `FileNotFoundError: .../SKILL.md`

- [ ] **Step 3: Write `SKILL.md`**

Frontmatter, written so the two-speed trigger works — the description must fire both on explicit requests and on student-facing copy being generated:

```markdown
---
name: reading-intervention
description: Audit classroom copy for middle school social studies readers — readability, coherence, vocabulary load, knowledge demands, question quality, scaffolds for IEP and multilingual students, and source verification for historical claims. Use this skill whenever a reading passage, handout, primary-source excerpt, assignment text, or any student-facing prose is written, revised, or reviewed, even if the user does not say "reading level" — and whenever the user asks whether a text is accessible, too hard, too easy, well sourced, or appropriately scaffolded. Also use it to build scaffolds around an existing text, or to compare two versions of a passage for loss of rigor.
---
```

Body sections, in this order:

1. **What this skill will not do** — never recommends shortening or simplifying; never edits inside a primary source; never assigns a proficiency level to a text. State this first so it frames everything after.
2. **Step 0: load the guardrails.** Read `references/guardrails.md` and `references/bands.md` before anything else. This must appear before the adjudication section — the test enforces the ordering.
3. **Step 1: route.** Determine teach-or-assess (G2). If undeclared, ask **once, at the top**. Determine scope (single file vs. unit). Read `reader-profile.md`.
4. **Step 2: locate.** Run `python3 scripts/locate.py FILE --json`. Note that this emits candidates, never findings.
5. **Step 3: adjudicate.** For each candidate, consult `references/checks.md`. Assign exactly one of `BLOCKING` / `FINDING` / `NOTE` / `QUESTION`. Quote the span. Name the remedy. **Cap at 12**, ordered by measured precision.
6. **Step 4: verify (Family T).** Tier by risk class. Live-verify quotations, named people, dates, offices, titles, and documented figures against `references/sources.md`. Flag causation, motive, and myth-checklist hits for teacher judgment. Grep `references/myths.md`.
7. **Step 5: run the suppression lint.** Guardrail Rule B, applied to every finding before emission.
8. **Step 6: render.** Three sections, always, in order: BAND PLACEMENT, LOCATED FINDINGS, FOR YOU TO DECIDE. Unicode only; **no ANSI escape codes** — Claude Code renders replies as markdown and escapes print as literal garbage.
9. **Modes** — the table from spec §11, including `--scaffold`, `--revise`, `--sift`, `--diff`, and the automatic quick pass with its lookup-free BLOCKING subset.
10. **Q1 — the passage-independence probe.** Withhold the passage; attempt the questions from general knowledge alone; count. Requires a declared learning target; **refuse and say so if absent.**
11. **The refusal template**, verbatim:

```markdown
Refused: this edit's span intersects a primary source.
Scaffolding goes around the source, never inside it.
Proposed instead: <sibling-element remedy>
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 81 tests ... OK`

- [ ] **Step 5: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "feat: SKILL.md — routing, adjudication, verification, and modes"
```

---

### Task 12: The report renderer

**Files:**
- Modify: `scripts/locate.py` (append)
- Create: `tests/test_render.py`

**Interfaces:**
- Consumes: `metrics()`, `BAND_LOW`, `BAND_HIGH`, `LEN_LOW`, `LEN_HIGH`.
- Produces: `render_report(filename: str, metrics: dict, findings: list[dict]) -> str`, where each finding is `{"id": str, "severity": str, "location": str, "summary": str}`. Rendering is deterministic so the display is identical run to run; the *findings* come from Claude.

- [ ] **Step 1: Write the failing test**

Create `tests/test_render.py`:

```python
import unittest, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "scripts"))
from locate import render_report, metrics

FIXTURE = (pathlib.Path(__file__).parent / "fixtures" / "shays.md").read_text()

FINDINGS = [
    {"id": "S1", "severity": "BLOCKING", "location": "¶4",
     "summary": 'quote altered from original "publick" → "public"'},
    {"id": "C1", "severity": "FINDING", "location": "¶2→3",
     "summary": "causal step unmarked"},
    {"id": "N2", "severity": "QUESTION", "location": "¶3",
     "summary": "is the tavern detail on the causal chain, or is it colour?"},
]


class TestRender(unittest.TestCase):
    def setUp(self):
        self.out = render_report("shays.md", metrics(FIXTURE), FINDINGS)

    def test_contains_no_ansi_escapes(self):
        self.assertNotIn("\x1b", self.out)

    def test_has_all_three_sections(self):
        self.assertIn("LOCATED FINDINGS", self.out)
        self.assertIn("FOR YOU TO DECIDE", self.out)
        self.assertIn("BAND", self.out)

    def test_questions_go_in_the_decide_section(self):
        decide = self.out.split("FOR YOU TO DECIDE")[1]
        self.assertIn("N2", decide)
        self.assertNotIn("S1", decide)

    def test_shows_the_severity_tally(self):
        self.assertIn("1 BLOCKING", self.out)

    def test_names_the_fk_implementation(self):
        self.assertIn("locate.py v1", self.out)

    def test_empty_findings_still_renders_both_sections(self):
        out = render_report("x.md", metrics(FIXTURE), [])
        self.assertIn("LOCATED FINDINGS", out)
        self.assertIn("FOR YOU TO DECIDE", out)

    def test_caps_at_twelve_findings(self):
        many = [dict(FINDINGS[1], id=f"C{i}") for i in range(20)]
        out = render_report("x.md", metrics(FIXTURE), many)
        self.assertLessEqual(sum(1 for ln in out.splitlines() if ln.strip().startswith("⚑")), 12)

    def test_never_emits_proficiency_words(self):
        for banned in ("Beginning", "Progressing", "Proficient", "Exemplary"):
            self.assertNotIn(banned, self.out)

    def test_glyphs_are_the_exact_codepoints(self):
        # Written as escapes on purpose. A literal glyph here could be silently
        # normalised in transit alongside the one in locate.py, and the test
        # would then pass while the report printed the wrong character.
        from locate import GLYPH
        self.assertEqual(GLYPH["BLOCKING"], "\u2717")
        self.assertEqual(GLYPH["FINDING"], "\u2691")
        self.assertEqual(GLYPH["NOTE"], "\u00b7")
        self.assertEqual(GLYPH["QUESTION"], "?")

    def test_box_uses_the_exact_drawing_characters(self):
        for codepoint in ("\u256d", "\u256e", "\u2570", "\u256f",
                          "\u2502", "\u2500", "\u251c", "\u2524", "\u25cf"):
            self.assertIn(codepoint, self.out, msg=repr(codepoint))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_render -v
```

Expected: `ImportError: cannot import name 'render_report'`

- [ ] **Step 3: Write the implementation**

Append to `scripts/locate.py`:

```python
# --- Report rendering ---------------------------------------------------
# Unicode box-drawing only. NO ANSI escape codes: Claude Code renders
# replies as markdown, so escapes print as literal garbage. Meaning is
# carried by shape and position, which also survives being pasted into a
# document, an email, or a Canvas comment.

GLYPH = {"BLOCKING": "✗", "FINDING": "⚑", "NOTE": "·", "QUESTION": "?"}
FINDINGS_CAP = 12
_BAR_W = 18


def _scale(value, low, high, width=_BAR_W):
    """Position of `value` on a low-high track, clamped to the track."""
    if high <= low:
        return 0
    pos = int(round((value - low) / (high - low) * (width - 1)))
    return max(0, min(width - 1, pos))


def _track(value, low, high, label):
    slot = _scale(value, low, high)
    bar = "".join("●" if i == slot else "─" for i in range(_BAR_W))
    return f"  {label:<7} {low} ├{bar}┤ {high}"


def render_report(filename, m, findings):
    lines = []
    # Size the box to its widest line so all three rows align, whatever the
    # filename length. A fixed-width header leaves the box open on long names.
    title = f"READING CHECK ── {filename}"
    stats = (f"{m['words']} words · {m['paragraphs']} ¶ · "
             f"~{m['read_minutes']:.1f} min silent read")
    w = max(len(title), len(stats)) + 2      # inner width, one pad space each side
    lines.append("╭" + (" " + title + " ").ljust(w, "─") + "╮")
    lines.append("│" + (" " + stats).ljust(w) + "│")
    lines.append("╰" + "─" * w + "╯")
    lines.append("")

    lines.append(_track(m["fk_grade"], BAND_LOW, BAND_HIGH, "BAND"))
    lines.append(f"          {m['fk_grade']}  ·  {m['band']} band")
    if m["band"] == "in":
        lines.append("          In band. This number carries no further information.")
    elif m["band"] == "below":
        lines.append("          ▲ BELOW band — possible leveling-down. Cross-check G6.")
    else:
        lines.append("          Above band. Reported only alongside a qualitative flag.")
    lines.append(f"          {m['fk_impl']}")
    lines.append("")
    lines.append(_track(m["words"], LEN_LOW, LEN_HIGH, "LENGTH"))
    lines.append(f"          {m['words']} w · NAEP grade-8 spec")
    lines.append("")

    tally = {k: sum(1 for f in findings if f["severity"] == k) for k in GLYPH}
    lines.append("  " + " · ".join(f"{tally[k]} {k}" for k in
                                   ("BLOCKING", "FINDING", "NOTE", "QUESTION")))
    lines.append("")

    located = [f for f in findings if f["severity"] != "QUESTION"][:FINDINGS_CAP]
    questions = [f for f in findings if f["severity"] == "QUESTION"]

    lines.append("  ── LOCATED FINDINGS ─────────────────────")
    if not located:
        lines.append("     none")
    for f in located:
        lines.append(f"  {GLYPH[f['severity']]} {f['id']:<4} {f['location']:<7} {f['summary']}")
    lines.append("")
    lines.append("  ── FOR YOU TO DECIDE ────────────────────")
    if not questions:
        lines.append("     none")
    for f in questions:
        lines.append(f"  ? {f['id']:<4} {f['location']:<7} {f['summary']}")

    return "\n".join(lines)
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 91 tests ... OK`

- [ ] **Step 5: Eyeball the output**

```bash
cd ~/.claude/skills/reading-intervention && python3 - <<'PY'
import sys, pathlib
sys.path.insert(0, "scripts")
from locate import render_report, metrics
t = pathlib.Path("tests/fixtures/shays.md").read_text()
print(render_report("shays.md", metrics(t), [
    {"id":"S1","severity":"BLOCKING","location":"¶4","summary":'quote altered: "publick" → "public"'},
    {"id":"C1","severity":"FINDING","location":"¶2→3","summary":"causal step unmarked"},
    {"id":"N2","severity":"QUESTION","location":"¶3","summary":"tavern detail on the causal chain?"},
]))
PY
```

Check that all three box rows are the same width and the `●` sits where the number says it should. Try a long filename too (`discussion_engagement_strategies.md`) — the box is sized to its widest row, so it must still close.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "feat: deterministic report renderer, Unicode only"
```

---

### Task 13: End-to-end verification against real artifacts

Spec §15. Every check ships with an artifact that demonstrates it firing **and** one that demonstrates it correctly not firing.

**Files:**
- Create: `tests/fixtures/questions_independent.md`
- Create: `tests/fixtures/source_modernized.md`
- Create: `tests/test_end_to_end.py`

**Interfaces:**
- Consumes: `analyze()`, `ceiling_diff()`, `render_report()`.
- Produces: the regression suite that guards the architecture.

- [ ] **Step 1: Write the fixtures**

`tests/fixtures/questions_independent.md` — a passage whose questions are answerable without it:

```markdown
Shays' Rebellion began in western Massachusetts in 1786.

## Questions
1. What is a rebellion?
2. Why do governments collect taxes?
3. In what country is Massachusetts located?
```

`tests/fixtures/source_modernized.md` — a quotation with silent modernization:

```markdown
Jefferson wrote that "a little rebellion now and then is a good thing, and as necessary in the political world as storms in the public world."
```

- [ ] **Step 2: Write the failing test**

Create `tests/test_end_to_end.py`:

```python
import unittest, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "scripts"))
from locate import analyze, ceiling_diff, render_report, metrics

FX = pathlib.Path(__file__).parent / "fixtures"


class TestEndToEnd(unittest.TestCase):
    def test_every_fixture_analyses_without_error(self):
        for f in FX.glob("*.md"):
            with self.subTest(fixture=f.name):
                out = analyze(f.read_text())
                self.assertIn("metrics", out)

    def test_leveled_fixture_is_below_band(self):
        m = metrics((FX / "shays_leveled.md").read_text())
        self.assertLess(m["fk_grade"], metrics((FX / "shays.md").read_text())["fk_grade"])

    def test_ceiling_diff_is_directional(self):
        orig = (FX / "shays.md").read_text()
        lev = (FX / "shays_leveled.md").read_text()
        self.assertEqual(ceiling_diff(orig, lev)["pattern"], "deletion-simplification")
        self.assertNotEqual(ceiling_diff(lev, orig)["pattern"], "deletion-simplification")

    def test_modernized_source_quote_is_locatable(self):
        out = analyze((FX / "source_modernized.md").read_text())
        self.assertEqual(len(out["quoted_spans"]), 1)
        self.assertIn("storms in the", out["quoted_spans"][0]["text"])

    def test_question_fixture_exposes_its_questions(self):
        text = (FX / "questions_independent.md").read_text()
        self.assertIn("Questions", text)
        self.assertEqual(len(analyze(text)["access"]["headings"]), 1)

    def test_rendered_report_is_pure_unicode(self):
        out = render_report("x.md", metrics((FX / "shays.md").read_text()), [])
        out.encode("utf-8")
        self.assertNotIn("\x1b", out)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest tests.test_end_to_end -v
```

Expected: `FileNotFoundError` for the new fixtures.

- [ ] **Step 4: Create the fixtures from Step 1, then re-run**

```bash
cd ~/.claude/skills/reading-intervention && python3 -m unittest discover -s tests -v
```

Expected: `Ran 97 tests ... OK`

- [ ] **Step 5: Run the skill by hand against a real document**

```bash
cd ~/.claude/skills/reading-intervention
python3 scripts/locate.py ~/Developer/teach/discussion_engagement_strategies.md --json | head -40
```

That document is known to contain at least two overstated warrants (spec §16: the Project GLAD effect sizes and the Hammond neuroscience framing). Confirm the Family T candidates surface. This is the end-to-end test that matters.

- [ ] **Step 6: Commit**

```bash
cd ~/.claude/skills/reading-intervention
git add -A
git commit -m "test: end-to-end verification fixtures and regression suite"
```

---

## Verification

Full suite, from a clean shell:

```bash
cd ~/.claude/skills/reading-intervention
python3 -m unittest discover -s tests -v
```

Expected: **98 tests, OK**, with zero third-party imports anywhere.

Confirm the dependency constraint holds:

```bash
cd ~/.claude/skills/reading-intervention
grep -rnE '^\s*(import|from)\s+' scripts/ tests/ \
  | grep -vE '(re|json|sys|pathlib|argparse|difflib|unittest|subprocess|locate)\b' \
  || echo "stdlib only — confirmed"
```

Confirm the architectural guard:

```bash
cd ~/.claude/skills/reading-intervention
python3 -m unittest tests.test_cli.TestAnalyze.test_payload_contains_no_severities -v
```

If that test ever fails, `locate.py` has started making judgments and the three-layer split has been violated.

## Deferred

- **v2:** Families R (representation) and X (text-set design), which need a unit folder rather than a single file; a `--unit` mode; integration with `canvas-assignment-formatter` so a Canvas page can be audited in place.
- **Blocked on source verification:** check C10 must not ship as a `FINDING` until Kleijn, Pander Maat & Sanders (2019) is read in full. `references/checks.md` carries the full list.
