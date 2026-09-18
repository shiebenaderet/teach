/**
 * Builds the public Outcomes resource for teach.mrbsocialstudies.org.
 * Output: dist-site/outcomes/index.html + outcomes-{grade-7,grade-8,sti,how-to}.html + files/*.csv
 * House style: Playfair Display + Nunito, cream/gold/maroon, no em dashes in prose.
 *
 * NOT RUNNABLE AS COMMITTED. This file is kept as the record of how the pages in
 * this folder were generated, but its source inputs live outside the repo:
 *   descriptors.mjs, descriptors-g7.mjs, sti.mjs, standards.json,
 *   wa-grade7.csv, wa-grade8.csv, sti.csv
 * Drop those alongside this file before running `node build-site.mjs`, then copy
 * dist-site/outcomes/ over this folder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DESCRIPTORS as D8 } from './descriptors.mjs';
import { DESCRIPTORS_G7 as D7 } from './descriptors-g7.mjs';
import { STI } from './sti.mjs';

const STANDARDS = JSON.parse(fs.readFileSync('./standards.json', 'utf8'));
const OUT = './dist-site/outcomes';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

const IRREG = { Explaining:'explain', Judging:'judge', Analyzing:'analyze', Using:'use',
  Showing:'show', Identifying:'identify', Taking:'take', Reading:'read', Connecting:'connect',
  Building:'build', Crediting:'credit', Asking:'ask', Discussing:'discuss', Telling:'tell',
  Understanding:'understand', Weighing:'weigh', Comparing:'compare', Recognizing:'recognize',
  Tracing:'trace', Investigating:'investigate' };
const verbPhrase = name => {
  const [first, ...rest] = name.split(' ');
  return (IRREG[first] ?? first.toLowerCase()) + (rest.length ? ' ' + rest.join(' ') : '');
};

const STRAND_LABEL = { civics:'Civics', economics:'Economics', geography:'Geography',
  history:'History', skills:'Skills' };
const ORDER = ['skills','history','civics','geography','economics'];

function wsssItems(grade) {
  const bank = grade === '7' ? { ...D7, ...D8 } : D8;   // Skills entries live in D8
  const out = [];
  for (const strand of ORDER) {
    for (const std of STANDARDS.filter(s => s.strand === strand)) {
      for (const c of std.components) {
        const inScope = c.grade === grade || c.grade === 'all';
        if (!inScope || !bank[c.code]) continue;
        const e = bank[c.code], vp = verbPhrase(e.name);
        out.push({ code: c.code, strand, strandLabel: STRAND_LABEL[strand],
          group: `${std.code}: ${std.title}`, name: e.name,
          walt: 'We are learning to ' + vp, ican: 'I can ' + vp + '.',
          official: c.sub?.length ? `${c.text} ${c.sub.join('; ')}` : c.text, d: e.d });
      }
    }
  }
  return out;
}

function stiItems() {
  const gname = Object.fromEntries(STI.groups.map(g => [g.guid, g.title]));
  return STI.outcomes.map(o => {
    const vp = verbPhrase(o.name);
    return { code: o.code, strand: o.group === 'STI-BIG5' ? 'big5' : 'eq',
      strandLabel: o.group === 'STI-BIG5' ? 'Big Five' : 'Essential Question',
      group: gname[o.group], name: o.name,
      walt: 'We are learning to ' + vp, ican: 'I can ' + vp + '.',
      official: o.official, d: o.d };
  });
}

const CSS = `
:root{
  --cream:#FBF5EA; --cream-2:#F5EDDD; --surface:#FFFDF8; --ink:#2A2320; --ink-2:#5A4F47;
  --ink-3:#8B7F74; --line:#E4D8C3; --line-2:#D2C2A6;
  --maroon:#7B2D26; --maroon-soft:#F3E6E3; --gold:#B8862B; --gold-soft:#FAF0D9;
  --skills:#7B2D26; --history:#8a4a1f; --civics:#3f5470; --geography:#4a6b46; --economics:#8a6a1f;
  --big5:#7B2D26; --eq:#6a4a86;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --cream:#1A1613; --cream-2:#221D18; --surface:#241F1A; --ink:#F3EADA; --ink-2:#C9BCA9;
  --ink-3:#95877A; --line:#3A322A; --line-2:#4C4238;
  --maroon:#E39B8F; --maroon-soft:#33211E; --gold:#E0B75E; --gold-soft:#2E2519;
  --skills:#E39B8F; --history:#DCA477; --civics:#9FB4D4; --geography:#9CC79A; --economics:#DCC07A;
  --big5:#E39B8F; --eq:#BFA3DC;
}}
:root[data-theme="dark"]{
  --cream:#1A1613; --cream-2:#221D18; --surface:#241F1A; --ink:#F3EADA; --ink-2:#C9BCA9;
  --ink-3:#95877A; --line:#3A322A; --line-2:#4C4238;
  --maroon:#E39B8F; --maroon-soft:#33211E; --gold:#E0B75E; --gold-soft:#2E2519;
  --skills:#E39B8F; --history:#DCA477; --civics:#9FB4D4; --geography:#9CC79A; --economics:#DCC07A;
  --big5:#E39B8F; --eq:#BFA3DC;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--cream);color:var(--ink);font-family:Nunito,system-ui,sans-serif;line-height:1.55}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
a{color:var(--maroon)}
/* nav */
.site-nav{background:var(--surface);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
.site-nav .wrap{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}
.brand{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:17px;margin-right:0;
  text-decoration:none;color:var(--maroon)}
.brand em{font-style:italic;color:var(--gold);font-weight:400}
.brand-sep{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:17px;
  color:var(--gold);margin:0 9px}
.brand-res{color:var(--ink);margin-right:12px}
@media (max-width:480px){.brand-sep{display:none}.brand-res{flex-basis:100%;margin-right:0}}
.site-nav a.nl{font-size:14px;font-weight:700;text-decoration:none;color:var(--ink-2);
  padding:6px 11px;border-radius:999px}
.site-nav a.nl:hover{background:var(--cream-2);color:var(--ink)}
.site-nav a.nl[aria-current="page"]{background:var(--maroon);color:#fff}
/* hero */
.hero{padding:34px 0 8px}
.eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(26px,4vw,38px);font-weight:700;
  line-height:1.15;margin:6px 0 10px}
h2{font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;margin:26px 0 10px}
h3{font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:700}
.lede{font-size:16.5px;color:var(--ink-2);max-width:66ch}
p{max-width:70ch}
.body p + p{margin-top:12px}
.body ul,.body ol{margin:10px 0 10px 22px}
.body li{margin-bottom:7px;max-width:68ch}
/* buttons */
.btnrow{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 6px}
.btn{display:inline-flex;align-items:center;gap:8px;font:inherit;font-size:14.5px;font-weight:700;
  text-decoration:none;padding:11px 18px;border-radius:9px;background:var(--maroon);color:#fff;
  border:1px solid var(--maroon)}
.btn:hover{opacity:.92}
.btn.ghost{background:transparent;color:var(--maroon)}
.btn .sz{font-weight:400;opacity:.8;font-size:13px}
/* cards grid (hub) */
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:8px}
.hubcard{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px;
  text-decoration:none;color:inherit;display:block}
.hubcard:hover{border-color:var(--line-2)}
.hubcard .n{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold)}
.hubcard h3{margin:5px 0 7px}
.hubcard p{font-size:14.5px;color:var(--ink-2)}
/* controls */
.controls{position:sticky;top:53px;z-index:10;background:var(--cream);padding:14px 0 12px;
  border-bottom:1px solid var(--line);margin-bottom:18px}
#q{width:100%;padding:12px 15px;font:inherit;font-size:15px;color:var(--ink);background:var(--surface);
  border:1px solid var(--line-2);border-radius:9px}
#q::placeholder{color:var(--ink-3)}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;align-items:center}
.filt{font:inherit;font-size:12.5px;font-weight:700;padding:5px 13px;border-radius:999px;cursor:pointer;
  background:var(--surface);color:var(--ink-2);border:1px solid var(--line-2)}
.filt[aria-pressed="true"]{background:var(--maroon);color:#fff;border-color:var(--maroon)}
.count{margin-left:auto;font-size:12.5px;color:var(--ink-3)}
/* outcome cards */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px;padding-bottom:20px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:17px 17px 13px}
.card-h{display:flex;align-items:center;gap:9px;margin-bottom:6px}
.code{font-size:12px;font-weight:700;color:var(--ink-3);letter-spacing:.03em}
.chip{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;
  border-radius:999px;border:1px solid currentColor}
.chip-skills{color:var(--skills)} .chip-history{color:var(--history)} .chip-civics{color:var(--civics)}
.chip-geography{color:var(--geography)} .chip-economics{color:var(--economics)}
.chip-big5{color:var(--big5)} .chip-eq{color:var(--eq)}
.name{font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:700;line-height:1.3;margin-bottom:11px}
.lines{display:flex;flex-direction:column;gap:4px;margin-bottom:11px}
.line,.lvl{display:flex;gap:9px;width:100%;text-align:left;font:inherit;cursor:pointer;background:none;
  border:none;padding:6px 7px;border-radius:7px;color:inherit}
.line:hover,.lvl:hover{background:var(--gold-soft)}
.lbl{flex:none;width:44px;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  color:var(--gold);padding-top:3px}
.txt{font-size:14px;color:var(--ink-2)}
.levels{display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--line);padding-top:10px}
.num{flex:none;width:21px;height:21px;border-radius:5px;display:grid;place-items:center;
  font-family:'Playfair Display',Georgia,serif;font-size:12px;font-weight:700;
  background:var(--maroon-soft);color:var(--maroon)}
.lvl-3 .num{outline:2px solid var(--maroon);outline-offset:1px}
.lvl-name{display:block;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3)}
.lvl-txt{display:block;font-size:13.5px;color:var(--ink-2)}
.official{margin-top:10px;border-top:1px solid var(--line);padding-top:9px}
.official summary{font-size:12px;font-weight:700;color:var(--ink-3);cursor:pointer;list-style:none}
.official summary::-webkit-details-marker{display:none}
.official summary::before{content:"+ "}
.official[open] summary::before{content:"\\2212 "}
.official p{font-size:13px;color:var(--ink-2);margin-top:7px}
.official .grp{font-size:11.5px;color:var(--ink-3)}
/* callouts */
.note{background:var(--surface);border-left:4px solid var(--gold);border-radius:0 9px 9px 0;
  padding:14px 18px;margin:18px 0}
.note.strong{border-left-color:var(--maroon)}
.note h3{font-size:16px;margin-bottom:5px}
.note p{font-size:14.5px;color:var(--ink-2)}
.steps{counter-reset:s;list-style:none;margin:14px 0 0}
.steps li{counter-increment:s;position:relative;padding-left:40px;margin-bottom:16px;max-width:68ch}
.steps li::before{content:counter(s);position:absolute;left:0;top:0;width:27px;height:27px;border-radius:7px;
  background:var(--maroon);color:#fff;display:grid;place-items:center;font-weight:700;font-size:14px}
.steps h3{margin-bottom:3px}
.steps p{font-size:14.5px;color:var(--ink-2)}
table{border-collapse:collapse;margin:14px 0;font-size:14.5px;width:100%}
th,td{border:1px solid var(--line);padding:9px 12px;text-align:left}
th{background:var(--cream-2);font-weight:700}
.empty{padding:40px 0;text-align:center;color:var(--ink-3)}
#toast{position:fixed;left:50%;bottom:26px;transform:translate(-50%,16px);opacity:0;pointer-events:none;
  background:var(--ink);color:var(--cream);font-size:13px;font-weight:700;padding:9px 17px;border-radius:999px;
  transition:opacity .16s,transform .16s;z-index:30}
#toast.on{opacity:1;transform:translate(-50%,0)}
footer.site{margin-top:40px;border-top:1px solid var(--line);background:var(--surface)}
footer.site .wrap{padding-top:20px;padding-bottom:30px}
footer.site p{font-size:13px;color:var(--ink-3);margin-bottom:6px}
@media print{.site-nav,.controls,#toast,footer.site{display:none}.grid{grid-template-columns:1fr 1fr}
  .card{break-inside:avoid}}
`;

const nav = cur => `
<nav class="site-nav"><div class="wrap">
  <a class="brand" href="../">Teaching &middot; <em>Mr. B</em></a>
  <span class="brand-sep" aria-hidden="true">/</span>
  <a class="brand brand-res" href="index.html">Outcomes</a>
  <a class="nl" href="index.html"${cur==='index'?' aria-current="page"':''}>Start here</a>
  <a class="nl" href="outcomes-grade-7.html"${cur==='g7'?' aria-current="page"':''}>Grade 7</a>
  <a class="nl" href="outcomes-grade-8.html"${cur==='g8'?' aria-current="page"':''}>Grade 8</a>
  <a class="nl" href="outcomes-sti.html"${cur==='sti'?' aria-current="page"':''}>STI</a>
  <a class="nl" href="outcomes-how-to.html"${cur==='how'?' aria-current="page"':''}>How to use it</a>
</div></nav>`;

const foot = `
<footer class="site"><div class="wrap">
  <p>Built for the Edmonds School District social studies team. Standards text is from the Washington
     State Social Studies Learning Standards (OSPI, 2019).</p>
  <p>The four level descriptors, WALT lines, and I can statements are local wording written for our
     4 / 3 / 2 / 1 scale. They are not published by OSPI.</p>
  <p>mrbsocialstudies.org</p>
</div></footer>`;

const head = title => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Nunito:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>`;

const SCRIPT = `
<div id="toast">Copied</div>
<script>
(function(){
  var grid=document.getElementById('grid'); if(!grid)return;
  var cards=[].slice.call(grid.children), q=document.getElementById('q'),
      count=document.getElementById('count'), empty=document.getElementById('empty'),
      toast=document.getElementById('toast'), filt='all', t;
  function apply(){
    var term=(q?q.value:'').trim().toLowerCase(), n=0;
    cards.forEach(function(c){
      var ok=(filt==='all'||c.dataset.strand===filt)&&(!term||c.dataset.search.indexOf(term)>-1);
      c.hidden=!ok; if(ok)n++;
    });
    if(count)count.textContent=n+(n===1?' outcome':' outcomes');
    if(empty)empty.hidden=n>0;
  }
  if(q)q.addEventListener('input',apply);
  [].forEach.call(document.querySelectorAll('.filt'),function(b){
    b.addEventListener('click',function(){
      filt=b.dataset.f;
      [].forEach.call(document.querySelectorAll('.filt'),function(o){o.setAttribute('aria-pressed',String(o===b));});
      apply();
    });
  });
  grid.addEventListener('click',function(e){
    var el=e.target.closest('[data-copy]'); if(!el)return;
    var text=el.getAttribute('data-copy');
    function done(){clearTimeout(t);toast.classList.add('on');t=setTimeout(function(){toast.classList.remove('on');},1100);}
    function fb(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';
      ta.style.opacity='0';document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');}catch(err){}document.body.removeChild(ta);done();}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,fb);}else{fb();}
  });
  apply();
})();
</script></body></html>`;

const LEVELS = ['Exemplary','Proficient','Progressing','Beginning'];
const card = it => `
<article class="card" data-strand="${it.strand}" data-search="${esc((it.code+' '+it.name+' '+it.official+' '+it.d.join(' ')).toLowerCase())}">
  <header class="card-h"><span class="code">${esc(it.code)}</span><span class="chip chip-${it.strand}">${esc(it.strandLabel)}</span></header>
  <h3 class="name">${esc(it.name)}</h3>
  <div class="lines">
    <button class="line" data-copy="${esc(it.walt)}"><span class="lbl">WALT</span><span class="txt">${esc(it.walt)}</span></button>
    <button class="line" data-copy="${esc(it.ican)}"><span class="lbl">I can</span><span class="txt">${esc(it.ican)}</span></button>
  </div>
  <div class="levels">
    ${it.d.map((t,i)=>`<button class="lvl lvl-${4-i}" data-copy="${esc(t)}"><span class="num">${4-i}</span>
      <span><span class="lvl-name">${LEVELS[i]}</span><span class="lvl-txt">${esc(t)}</span></span></button>`).join('')}
  </div>
  <details class="official"><summary>Official standard text</summary>
    <p>${esc(it.official)}</p><p class="grp">${esc(it.group)}</p></details>
</article>`;

function listPage({ cur, title, eyebrow, h1, lede, csv, csvLabel, filters, items, extra = '' }) {
  return head(title) + nav(cur) + `
<div class="wrap">
  <section class="hero">
    <p class="eyebrow">${eyebrow}</p>
    <h1>${h1}</h1>
    <p class="lede">${lede}</p>
    <div class="btnrow">
      <a class="btn" href="files/${csv}" download>Download ${csvLabel} <span class="sz">CSV</span></a>
      <a class="btn ghost" href="outcomes-how-to.html">How to import and use it</a>
    </div>
  </section>
  ${extra}
  <div class="controls">
    <input id="q" type="search" placeholder="Search a word, a code, or an idea" autocomplete="off">
    <div class="chips">
      <button class="filt" data-f="all" aria-pressed="true">All</button>
      ${filters.map(f=>`<button class="filt" data-f="${f[0]}" aria-pressed="false">${f[1]}</button>`).join('\n      ')}
      <span class="count" id="count"></span>
    </div>
  </div>
  <main class="grid" id="grid">${items.map(card).join('\n')}</main>
  <p class="empty" id="empty" hidden>Nothing matches that. Try a shorter word.</p>
</div>` + foot + SCRIPT;
}

// ── pages ──────────────────────────────────────────────────────────────────
const g7 = wsssItems('7'), g8 = wsssItems('8'), sti = stiItems();
const wsssFilters = [['skills','Skills'],['history','History'],['civics','Civics'],
  ['geography','Geography'],['economics','Economics']];

fs.mkdirSync(path.join(OUT,'files'), { recursive: true });

fs.writeFileSync(path.join(OUT,'outcomes-grade-7.html'), listPage({
  cur:'g7', title:'Grade 7 Outcomes, Washington State History', eyebrow:'Grade 7, Washington State History',
  h1:'Grade 7 Outcomes', csv:'canvas-outcomes-wa-grade7.csv', csvLabel:'Grade 7 outcomes',
  lede:`The ${g7.length} Washington State Social Studies Learning Standards in scope for 7th grade Washington State History, each with a WALT, an I can statement, and the four levels of our proficiency scale written in student language. Click any line to copy it.`,
  filters: wsssFilters, items: g7 }));

fs.writeFileSync(path.join(OUT,'outcomes-grade-8.html'), listPage({
  cur:'g8', title:'Grade 8 Outcomes, United States History', eyebrow:'Grade 8, United States History',
  h1:'Grade 8 Outcomes', csv:'canvas-outcomes-grade8.csv', csvLabel:'Grade 8 outcomes',
  lede:`The ${g8.length} Washington State Social Studies Learning Standards in scope for 8th grade United States History, each with a WALT, an I can statement, and the four levels of our proficiency scale written in student language. Click any line to copy it.`,
  filters: wsssFilters, items: g8 }));

const stiNote = `
<div class="note strong">
  <h3>About this set</h3>
  <p>These outcomes come from the John McCoy (lulila&scaron;) Since Time Immemorial: Tribal Sovereignty in
     Washington State curriculum, published by the OSPI Office of Native Education in partnership with
     Washington&rsquo;s federally recognized tribes and licensed
     <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Teaching it is required in all
     Washington common schools under RCW 28A.320.170. The
     <a href="https://ospi.k12.wa.us/student-success/resources-subject-area/john-mccoy-lulilas-time-immemorial-tribal-sovereignty-washington-state">curriculum
     itself lives at OSPI</a> and is free.</p>
  <p>The Big Five are the outcomes OSPI sets for the end of middle school. The five Essential Questions
     frame inquiry across a unit rather than grading a single task, so treat them as unit level.</p>
  <p>The four level descriptors below are local wording, not OSPI&rsquo;s. STI is place based by design, so
     the strongest version of these names the tribes nearest our schools. Talk with your building or
     district STI lead before using them to grade.</p>
</div>`;

fs.writeFileSync(path.join(OUT,'outcomes-sti.html'), listPage({
  cur:'sti', title:'Since Time Immemorial Outcomes', eyebrow:'Tribal sovereignty, all middle school grades',
  h1:'Since Time Immemorial Outcomes', csv:'canvas-outcomes-sti.csv', csvLabel:'STI outcomes',
  lede:'The five Big Five middle school outcomes and the five Essential Questions, each with a WALT, an I can statement, and four levels in student language. Import these as their own group so they stay separate from the state standards.',
  filters: [['big5','Big Five'],['eq','Essential Questions']], items: sti, extra: stiNote }));

// ── hub ────────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(OUT,'index.html'), head('Standards Outcomes Toolkit') + nav('index') + `
<div class="wrap">
  <section class="hero">
    <p class="eyebrow">Edmonds School District, Social Studies</p>
    <h1>Standards Outcomes Toolkit</h1>
    <p class="lede">Every middle school social studies standard, ready to import into Canvas as an outcome,
      with the proficiency levels rewritten so students can read them. Each outcome also carries a WALT and
      an I can statement, so the objective on your slide, the criteria on your handout, and the row in your
      rubric all say the same sentence.</p>
    <div class="btnrow">
      <a class="btn" href="outcomes-how-to.html">Start with the how to</a>
    </div>
  </section>

  <div class="cards">
    <a class="hubcard" href="outcomes-grade-7.html"><span class="n">${g7.length} outcomes</span>
      <h3>Grade 7</h3><p>Washington State History, plus the shared social studies skills.</p></a>
    <a class="hubcard" href="outcomes-grade-8.html"><span class="n">${g8.length} outcomes</span>
      <h3>Grade 8</h3><p>United States History to 1877, plus the shared social studies skills.</p></a>
    <a class="hubcard" href="outcomes-sti.html"><span class="n">${sti.length} outcomes</span>
      <h3>Since Time Immemorial</h3><p>Tribal sovereignty. The Big Five and the five Essential Questions.</p></a>
    <a class="hubcard" href="outcomes-how-to.html"><span class="n">5 steps</span>
      <h3>How to use it</h3><p>Import the CSV, attach outcomes to a rubric, and grade without breaking your scale.</p></a>
  </div>

  <div class="body">
    <h2>What is in each file</h2>
    <p>Every outcome imports with our district scale already set: four levels worth 4, 3, 2 and 1 points,
      mastery at 3, calculated by highest score. That last setting matters. A student&rsquo;s mastery is the best
      they have shown all year, so an early 2 never drags down a later 3.</p>
    <h2>Why the wording is different</h2>
    <p>The official standard text is written for adults. It is still in every outcome, in the description
      field and behind the Official standard text toggle on each card, but the four levels a student
      actually reads are in plain language. Level 3 is the target, so it doubles as the success criterion
      you put in front of them before they start.</p>
    <table>
      <tr><th>Level</th><th>What it means</th><th>Score entered</th><th>Letter</th></tr>
      <tr><td>4 Exemplary</td><td>Exceeds the standard at this time</td><td>97</td><td>A</td></tr>
      <tr><td>3 Proficient</td><td>Meets the standard at this time</td><td>87</td><td>B+</td></tr>
      <tr><td>2 Progressing</td><td>Approaching the standard at this time</td><td>77</td><td>C+</td></tr>
      <tr><td>1 Beginning</td><td>Below the standard at this time</td><td>67</td><td>D+</td></tr>
    </table>
    <p>These are even ten point steps against the Edmonds grade scale adopted this year, so combinations stay
      predictable and no rounding cliff decides a letter. A 4 and a 3 average to 92, an A minus. Two 3s stay at
      87. A 3 and a 2 give 82, a B minus. Two 2s give 77. The floor is a D plus rather than an F, because a 1
      means beginning, which is partial learning and not the absence of it.</p>
    <p>The score column is a conversion you type, not something Canvas does for you. The how to page explains
      how to keep Canvas from doing its own math and breaking it.</p>
  </div>
</div>` + foot + SCRIPT);

// ── how to ─────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(OUT,'outcomes-how-to.html'), head('How to use the outcomes') + nav('how') + `
<div class="wrap">
  <section class="hero">
    <p class="eyebrow">Canvas setup</p>
    <h1>How to use it</h1>
    <p class="lede">Importing takes a few minutes once per course. After that, attaching outcomes to an
      assignment takes about thirty seconds.</p>
    <div class="btnrow">
      <a class="btn" href="files/canvas-outcomes-wa-grade7.csv" download>Grade 7 CSV</a>
      <a class="btn" href="files/canvas-outcomes-grade8.csv" download>Grade 8 CSV</a>
      <a class="btn" href="files/canvas-outcomes-sti.csv" download>STI CSV</a>
    </div>
  </section>

  <div class="body">
    <h2>Part 1. Import the outcomes</h2>
    <ol class="steps">
      <li><h3>Download the file for your grade</h3>
        <p>Use the buttons above. Do not open it in Excel and re-save it, because Excel can change how the
          file is encoded and Canvas will reject it. Download it and leave it alone.</p></li>
      <li><h3>Go to Outcomes in your course</h3>
        <p>Course navigation, then Outcomes. Look for Import, either as a button or under the three dot menu
          depending on your Canvas version.</p></li>
      <li><h3>Upload and wait</h3>
        <p>Canvas processes the file in the background and emails you when it finishes. The outcomes arrive
          grouped by strand, so Skills, History, Civics, Geography and Economics each become a folder.</p></li>
      <li><h3>Turn on the Learning Mastery Gradebook</h3>
        <p>Settings, then Feature Options, then enable Learning Mastery Gradebook. Without this you can
          attach outcomes but never see the data they produce. It is the whole payoff, so do not skip it.</p></li>
      <li><h3>Check one outcome</h3>
        <p>Open any outcome. You should see four ratings worth 4, 3, 2 and 1 points, with mastery at 3 and
          the calculation method set to highest score. If Proficient is worth anything other than 3, stop and
          re-import, because every proficient student would otherwise show as below mastery.</p></li>
    </ol>

    <div class="note">
      <h3>A number you can ignore</h3>
      <p>Each outcome lists its ratings with a small index down the left side that counts 3, 2, 1, 0. That is
        just Canvas numbering the rows from zero. The points are the column on the right. As long as
        Proficient says 3 points, you are set.</p>
    </div>

    <h2>Part 2. Attach outcomes to an assignment</h2>
    <ol class="steps">
      <li><h3>Add a rubric to the assignment</h3>
        <p>Open the assignment, scroll past the description, and choose Add Rubric. Do this before you grade
          anyone. Once an outcome row has been used to assess a student, Canvas will not let you remove or
          swap it.</p></li>
      <li><h3>Use Find Outcome, not a new criterion</h3>
        <p>In the rubric editor choose Find Outcome and pick the standards this task actually assesses. Two
          is usually plenty. Each one arrives as a row with the four levels already built. You cannot edit
          the wording inside a rubric, which is why the wording lives on the outcome itself.</p></li>
      <li><h3>Set Scoring to Unscored</h3>
        <p>This removes the points total from the top of the rubric so nobody reads it as the grade. The
          outcome ratings still record either way, because they come from which level you click.</p></li>
      <li><h3>Leave two checkboxes alone</h3>
        <p>Leave Use this rubric for assignment grading unchecked, or Canvas will compute the score from
          rubric points and a 3 becomes 75 percent. Leave Don&rsquo;t post to Learning Mastery Gradebook
          unchecked too. It is a double negative, and checking it turns off the tracking you just set up.</p></li>
      <li><h3>Grade in SpeedGrader</h3>
        <p>Click one level per outcome, save, then type the score in the grade box: 97 for a 4, 87 for a 3,
          77 for a 2, 67 for a 1. Average them when a task carries two outcomes. The rubric records mastery,
          you record the grade, and the two never fight.</p></li>
    </ol>

    <div class="note">
      <h3>Why the score is typed by hand</h3>
      <p>Our scale does not divide evenly. If Canvas scored a two row rubric out of 8 points, a student who
        met the standard on both would earn 6 of 8, which is 75 percent, a C. Meeting the standard should
        not be a C. Typing the score keeps meeting the standard at an 87, a B plus on the Edmonds scale.</p>
    </div>

    <h2>Part 3. Use the language with students</h2>
    <div class="body">
      <p>Each outcome carries three lines you can copy straight off the grade pages.</p>
      <ul>
        <li>The <strong>WALT</strong> goes on your slide or board at the start of the lesson.</li>
        <li>The <strong>I can</strong> statement goes on the handout or in the assignment description.</li>
        <li><strong>Level 3</strong> is the success criterion. Show it before students start, not after.</li>
      </ul>
      <p>These lines are deliberately task neutral, so the same outcome works for a monument project in
        September and a document based question in March. Name the specific task on your handout, not in
        the outcome.</p>
    </div>
  </div>
</div>` + foot + SCRIPT);

// CSVs alongside the pages
for (const f of ['canvas-outcomes-wa-grade7.csv','canvas-outcomes-sti.csv']) {
  fs.copyFileSync(path.join('.', f.replace('canvas-outcomes-wa-grade7.csv','wa-grade7.csv')
                              .replace('canvas-outcomes-sti.csv','sti.csv')),
                  path.join(OUT,'files',f));
}
fs.copyFileSync('./wa-grade8.csv', path.join(OUT,'files','canvas-outcomes-grade8.csv'));

console.log('built pages:', fs.readdirSync(OUT).join(', '));
console.log('files:', fs.readdirSync(path.join(OUT,'files')).join(', '));
console.log('counts -> g7:', g7.length, 'g8:', g8.length, 'sti:', sti.length);
