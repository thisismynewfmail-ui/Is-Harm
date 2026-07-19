/* =============================================================================
   THE RAPE GANG INQUIRY — CASE FILE
   Shared site script. Fetches assets/data.json once, builds the chrome
   (nav / progress / reveal / count-ups), then dispatches to a per-page
   renderer keyed on <body data-page="...">.
   ========================================================================== */
'use strict';
const RGI = window.RGI = window.RGI || {};
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- helpers */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}
function listify(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
function textOf(v) { return listify(v).join('; '); }
function byId(id) { return document.getElementById(id); }
function getQ() { return (new URLSearchParams(location.search).get('q') || '').trim(); }
RGI.el = el; RGI.listify = listify; RGI.textOf = textOf;

/* ---------------------------------------------------------------- tooltip */
let tooltip;
function showTip(target, title, value) {
  if (!tooltip) { tooltip = el('div'); tooltip.id = 'tooltip'; tooltip.setAttribute('role', 'status'); document.body.appendChild(tooltip); }
  tooltip.replaceChildren(el('div', 'tv', value), el('div', null, title));
  tooltip.style.display = 'block';
  const r = target.getBoundingClientRect(), t = tooltip.getBoundingClientRect();
  let x = r.left + r.width / 2 - t.width / 2;
  x = Math.max(8, Math.min(x, innerWidth - t.width - 8));
  let y = r.top - t.height - 8;
  if (y < 8) y = r.bottom + 8;
  tooltip.style.left = x + 'px'; tooltip.style.top = y + 'px';
}
function hideTip() { if (tooltip) tooltip.style.display = 'none'; }
RGI.showTip = showTip; RGI.hideTip = hideTip;

/* ---------------------------------------------------------------- charts */
function buildTable(rows, valueHead, total) {
  const scroll = el('div', 'table-scroll');
  const tbl = el('table', 'data-table');
  const thead = el('thead'); const hr = el('tr');
  hr.append(el('th', null, 'Category'), el('th', null, valueHead));
  thead.appendChild(hr); tbl.appendChild(thead);
  const tb = el('tbody');
  rows.forEach(r => {
    const tr = el('tr');
    tr.append(el('td', null, r.label), el('td', 'num', String(r.value) + (total ? ' of ' + total : '')));
    tb.appendChild(tr);
  });
  tbl.appendChild(tb); scroll.appendChild(tbl);
  return scroll;
}
function chartCard(o) {
  const card = el('div', 'chart-card');
  const head = el('div', 'chart-head');
  head.appendChild(el('h3', null, o.title));
  const toggle = el('button', 'view-toggle', 'Table view');
  toggle.setAttribute('aria-pressed', 'false');
  head.appendChild(toggle);
  card.appendChild(head);
  if (o.sub) card.appendChild(el('div', 'chart-sub', o.sub));
  const body = el('div'); card.appendChild(body);
  if (o.foot) card.appendChild(el('div', 'chart-foot', o.foot));
  const max = Math.max(...o.rows.map(r => r.value), 1);
  const unit = o.unit || '';
  function drawChart() {
    body.replaceChildren();
    if (o.kind === 'columns') {
      const c = el('div', 'colchart'); const labels = el('div', 'colchart-labels');
      o.rows.forEach(r => {
        const col = el('div', 'col'); col.tabIndex = 0; col.setAttribute('role', 'img');
        col.setAttribute('aria-label', r.label + ': ' + r.value + ' ' + unit);
        col.append(el('div', 'colval', String(r.value)));
        const fill = el('div', 'colfill');
        const h = Math.max(4, (r.value / max) * 130) + 'px';
        if (REDUCED) fill.style.height = h; else { fill.style.height = '0px'; requestAnimationFrame(() => requestAnimationFrame(() => fill.style.height = h)); }
        col.appendChild(fill);
        const on = () => showTip(col, r.label, r.value + ' ' + unit);
        col.addEventListener('pointerenter', on); col.addEventListener('focus', on);
        col.addEventListener('pointerleave', hideTip); col.addEventListener('blur', hideTip);
        c.appendChild(col); labels.appendChild(el('span', null, r.label));
      });
      body.append(c, labels);
    } else {
      const w = el('div', 'hbar-axis');
      o.rows.forEach(r => {
        const row = el('div', 'hbar-row'); row.tabIndex = 0; row.setAttribute('role', 'img');
        row.setAttribute('aria-label', r.label + ': ' + r.value + ' ' + unit);
        row.appendChild(el('div', 'hbar-label', r.label));
        const track = el('div', 'hbar-track'); const fill = el('div', 'hbar-fill');
        const wd = ((r.value / max) * 78) + '%';
        if (REDUCED) fill.style.width = wd; else { fill.style.width = '0%'; requestAnimationFrame(() => requestAnimationFrame(() => fill.style.width = wd)); }
        track.append(fill, el('span', 'hbar-val', String(r.value)));
        row.appendChild(track);
        const on = () => showTip(row, r.label, r.value + ' ' + unit);
        row.addEventListener('pointerenter', on); row.addEventListener('focus', on);
        row.addEventListener('pointerleave', hideTip); row.addEventListener('blur', hideTip);
        w.appendChild(row);
      });
      body.appendChild(w);
    }
  }
  let showing = false;
  toggle.addEventListener('click', () => {
    showing = !showing;
    toggle.textContent = showing ? 'Chart view' : 'Table view';
    toggle.setAttribute('aria-pressed', String(showing));
    if (showing) body.replaceChildren(buildTable(o.rows, unit, o.total)); else drawChart();
  });
  drawChart();
  return card;
}
function meterList(rows) {
  const box = el('div');
  rows.forEach(r => {
    const total = r.total || Math.max(...rows.map(x => x.value), 1);
    const row = el('div', 'meter-row');
    const top = el('div', 'meter-top');
    top.append(el('span', 'ml', r.label), el('span', 'mv', r.value + (r.total ? ' of ' + r.total : '')));
    const track = el('div', 'meter-track'); const fill = el('div', 'meter-fill');
    const w = (r.value / total * 100) + '%';
    if (REDUCED) fill.style.width = w; else { fill.style.width = '0%'; requestAnimationFrame(() => requestAnimationFrame(() => fill.style.width = w)); }
    track.appendChild(fill);
    row.append(top, track); box.appendChild(row);
  });
  return box;
}
RGI.chartCard = chartCard; RGI.buildTable = buildTable; RGI.meterList = meterList;

/* ---------------------------------------------------------------- record cards */
function fld(label, value) {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  const f = el('div', 'field'); f.append(el('div', 'fl', label), el('div', 'fv', textOf(value))); return f;
}
function chipFld(label, values, cls) {
  const arr = listify(values); if (!arr.length) return null;
  const f = el('div', 'field'); f.appendChild(el('div', 'fl', label));
  const c = el('div', 'chips'); arr.forEach(v => c.appendChild(el('span', 'chip ' + (cls || ''), v)));
  f.appendChild(c); return f;
}
function collapsibleCard(headParts, fields) {
  const c = el('div', 'rec-card');
  const head = el('button', 'rec-head'); head.setAttribute('aria-expanded', 'false');
  headParts.forEach(p => head.appendChild(p));
  head.append(el('span', 'chev', '›'));
  c.appendChild(head);
  const body = el('div', 'rec-body');
  fields.forEach(f => f && body.appendChild(f));
  c.appendChild(body);
  head.addEventListener('click', () => { const o = c.classList.toggle('open'); head.setAttribute('aria-expanded', String(o)); });
  return c;
}
RGI.fld = fld; RGI.chipFld = chipFld; RGI.collapsibleCard = collapsibleCard;

function victimCard(v) {
  const head = [el('span', 'badge id', v.id || '—'), el('span', 'name', v.pseudonym || v.role || 'Unnamed'), el('span', 'badge grp', v._group)];
  if (v.cause_of_death || v.age_at_death) head.push(el('span', 'badge dead', 'died'));
  const bits = [];
  if (v.gender) bits.push(v.gender);
  if (v.age_at_first_abuse != null) bits.push('First abused: ' + v.age_at_first_abuse);
  if (v.abuse_period) bits.push(v.abuse_period);
  if (bits.length) head.push(el('span', 'meta', bits.join(' · ')));
  return collapsibleCard(head, [
    fld('Role / context', v.role),
    fld('Locations associated', v.location_associated),
    chipFld('Abuse documented', v.abuse_types, 'accent'),
    fld('Perpetrators, as described in the report', v.perpetrator_demographics),
    fld('Perpetrator notes', v.perpetrator_notes),
    chipFld('Institutions that failed them', v.institutions_failed_by),
    fld('Injuries & conditions recorded', v.injuries_conditions),
    fld('Outcome', v.outcome || v.status),
    fld('Death recorded', v.cause_of_death ? textOf(v.cause_of_death) + (v.age_at_death ? ' (aged ' + v.age_at_death + ')' : '') : null),
    fld('Published account', v.published_book),
    chipFld('Report cross-reference tags', v.cross_references, 'ref'),
  ]);
}
function perpCard(x) {
  const st = x.status || 'Unknown';
  const convicted = /convicted|guilty/i.test(st) && !/not convicted/i.test(st);
  const head = [el('span', 'badge id', x.id), el('span', 'name', x.name),
    el('span', convicted ? 'badge crit' : 'badge grp', st)];
  if (x.location_associated) head.push(el('span', 'meta', textOf(x.location_associated)));
  return collapsibleCard(head, [
    fld('Role', x.role || x.former_role || textOf(x.former_roles)),
    fld('Case', x.case), fld('Conviction', x.conviction), fld('Sentence', x.sentence),
    fld('Sentencing judge', x.sentencing_judge), fld('Police force', x.force),
    fld('Allegations recorded', x.allegations), fld('Notes from the report', x.notes),
    chipFld('Report cross-reference tags', x.cross_references, 'ref'),
  ]);
}
RGI.victimCard = victimCard; RGI.perpCard = perpCard;

/* ---------------------------------------------------------------- flat arrays (mirror build order) */
function flats(D) {
  const FV = [];
  [['hearing', 'Hearing witness'], ['appendix', 'Appendix I record'], ['other', 'Also named']]
    .forEach(([k, g]) => D.victims[k].forEach(v => FV.push(Object.assign({}, v, { _group: g }))));
  const AUTH = [];
  [['politicians_and_public_officials', 'Politician / official'], ['whistleblowers_campaigners', 'Whistleblower / campaigner'],
   ['experts_and_researchers', 'Expert / researcher'], ['inquiry_personnel', 'Inquiry personnel']]
    .forEach(([k, g]) => D.authorities[k].forEach(a => AUTH.push(Object.assign({}, a, { _group: g }))));
  const INST = [];
  Object.entries(D.institutions).forEach(([k, items]) => items.forEach(x => INST.push(Object.assign({}, x, { _group: k }))));
  const LAW = [];
  ['inquiries_reports', 'key_legislation', 'government_programs', 'police_operations']
    .forEach(k => D.programs[k].forEach(x => LAW.push(Object.assign({}, x, { _group: k }))));
  return { FV, AUTH, INST, LAW };
}

/* ---------------------------------------------------------------- generic filterable list */
function filterList(container, records, opts) {
  const { placeholder, cardFn, selects = [], countNoun = 'records', initialQ = '' } = opts;
  const filters = el('div', 'filter-row');
  const search = el('input'); search.type = 'search'; search.placeholder = placeholder;
  search.setAttribute('aria-label', placeholder); search.value = initialQ;
  filters.appendChild(search);
  const selEls = selects.map(s => {
    const sel = el('select');
    sel.append(new Option(s.all, ''), ...s.options.map(o => new Option(o.label, o.value)));
    filters.appendChild(sel); return { sel, test: s.test };
  });
  const count = el('div', 'result-count');
  const list = el('div');
  container.append(filters, count, list);
  function apply() {
    const q = search.value.trim().toLowerCase();
    list.replaceChildren(); let n = 0;
    records.forEach(r => {
      for (const { sel, test } of selEls) if (sel.value && !test(r, sel.value)) return;
      if (q && !JSON.stringify(r).toLowerCase().includes(q)) return;
      list.appendChild(cardFn(r)); n++;
    });
    count.textContent = n + ' of ' + records.length + ' ' + countNoun + ' shown';
  }
  search.addEventListener('input', apply);
  selEls.forEach(({ sel }) => sel.addEventListener('change', apply));
  apply();
  return { apply, search };
}
RGI.filterList = filterList;

/* ---------------------------------------------------------------- chrome */
function buildChrome() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '✕' : '☰';
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); toggle.textContent = '☰'; toggle.setAttribute('aria-expanded', 'false');
    }));
  }
  const bar = byId('progress');
  if (bar) {
    let t = false;
    addEventListener('scroll', () => {
      if (t) return; t = true;
      requestAnimationFrame(() => { const m = document.documentElement.scrollHeight - innerHeight; bar.style.width = (m > 0 ? scrollY / m * 100 : 0) + '%'; t = false; });
    }, { passive: true });
  }
  if (!REDUCED) {
    const ro = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }), { threshold: 0.08 });
    document.querySelectorAll('.finding,.tl-item,.stat-big,.quote-card,.fail-card,.chart-card,.export-card,.memorial,.law-item,.demand,.index-card,.tile').forEach(n => { n.classList.add('reveal'); ro.observe(n); });
  }
}
function countUps() {
  if (REDUCED) return;
  function run(node, ms) {
    const m = node.textContent.match(/^([\d,]+)(.*)$/s); if (!m) return;
    const target = parseInt(m[1].replace(/,/g, ''), 10), suf = m[2];
    node.textContent = '0' + suf;
    const io = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return; io.disconnect();
      const start = performance.now();
      (function tick(now) {
        const t = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - t, 3);
        node.textContent = Math.round(target * e).toLocaleString('en-GB') + suf;
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    }, { threshold: 0.4 });
    io.observe(node);
  }
  document.querySelectorAll('.count').forEach(n => run(n, 1800));
}
function heroVoice(D) {
  const hv = byId('heroVoice'); if (!hv) return;
  const pool = D.quotes.filter(q => q.type === 'quote' && q.text.length > 60 && q.text.length < 220).map(q => q.text.replace(/^"|"$/g, ''));
  if (!pool.length) return;
  let i = 0;
  function show() { hv.textContent = '“' + pool[i % pool.length] + '”'; hv.classList.add('on'); i++; }
  show();
  if (!REDUCED && pool.length > 1) setInterval(() => { hv.classList.remove('on'); setTimeout(show, 1200); }, 9000);
}
function ticker(D) {
  const t = byId('ticker'); if (!t) return;
  const names = D.locations.local_authority_districts_full_list;
  for (let r = 0; r < 2; r++) names.forEach(d => t.appendChild(el('span', null, d)));
}
function memorialNode(D) {
  const box = el('div', 'memorial'); box.setAttribute('role', 'note');
  box.appendChild(el('div', 'mem-k', 'In memory'));
  const names = el('div', 'names');
  D.expanded.dead.forEach((d, i) => { names.append(document.createTextNode((d.name || '').replace(/ /g, ' ') + ', ' + (d.age || '?') + '.')); names.appendChild(el('br')); });
  box.appendChild(names);
  box.appendChild(el('p', null, 'These girls in this file did not live to see it. The report records their deaths as the end point of grooming, rape, and the failure of every institution that should have intervened. Their records stay here with the others — because being counted was the thing they were denied.'));
  return box;
}
RGI.memorialNode = memorialNode;

/* ================================================================ PAGES */
const PAGES = {};

PAGES.home = (D) => {
  ticker(D); heroVoice(D);
  // numbers
  const ng = byId('numGrid');
  if (ng) {
    const e = D.expanded, a = D.aggregates;
    const stats = [
      ['250,000+', 's8', 'Children. Minimum. The figure the report puts on the record — and calls "probably higher." Cited from Hansard Vol. 797, 14 May 2019.'],
      ['149', 's4', 'Towns and districts. Roughly 40% of the map of the United Kingdom.'],
      ['71', 's3', 'Years of evidence. 1955 to 2026. It has not stopped.'],
      [a.institutions[0].value + '/' + a.victimTotal, 's5', 'Victim records in this file that name the police as the institution that failed them.'],
      [String(e.perpNotConvicted), 's4', 'Individuals named in the file with no conviction recorded. Named, documented — and free.'],
      [String(e.dead.length), 's7', 'Girls in this file who did not live to read it. One died at twelve. One died at thirty-three, alone.'],
      ['20,000+', 's5', 'Citizens who paid for this inquiry themselves — because, the report records, the state would not.'],
    ];
    stats.forEach(([v, span, l]) => {
      const t = el('div', 'stat-big ' + span);
      const vv = el('div', 'v'); vv.append(spanCount(v));
      t.append(vv, el('div', 'l', l)); ng.appendChild(t);
    });
  }
  // findings
  const fg = byId('findingGrid');
  if (fg) FINDINGS.forEach(([k, html], i) => {
    const c = el('div', 'finding');
    c.append(el('span', 'fnum', String(i + 1).padStart(2, '0')), el('span', 'fk', k));
    const p = el('p'); p.innerHTML = html; c.appendChild(p); fg.appendChild(c);
  });
  // section index
  const ix = byId('indexGrid');
  if (ix) SECTION_INDEX.forEach(([href, k, title, desc]) => {
    const a = el('a', 'index-card'); a.href = href;
    a.append(el('span', 'ic-k', k), el('h3', null, title), el('p', null, desc), el('span', 'go', 'Open →'));
    ix.appendChild(a);
  });
  // the web
  const canvas = byId('webCanvas');
  if (canvas && RGI.initWeb) RGI.initWeb(D);
};

function spanCount(text) { const s = el('span', 'count', text); return s; }

PAGES.victims = (D) => {
  const { FV } = flats(D);
  const e = D.expanded, a = D.aggregates;
  const host = byId('vizHost');
  if (host) {
    const grid = el('div', 'chart-grid');
    grid.append(
      chartCard({ title: 'Age at first abuse', kind: 'columns', unit: 'records', rows: a.ages, sub: 'Across all ' + a.victimTotal + ' victim records; earliest age where a range is given', foot: 'Most recorded first contact came between 13 and 15 — but the records reach down to infancy. Sit with that.' }),
      chartCard({ title: 'What was done to them', kind: 'hbar', unit: 'records', total: a.victimTotal, rows: e.abuseFull, sub: 'Victim records documenting each category of abuse', foot: 'Grouped from the report’s own labels; a record can appear in several categories.' }),
      chartCard({ title: 'Injuries & conditions recorded', kind: 'hbar', unit: 'records', total: a.victimTotal, rows: e.injuries, sub: 'Grouped medical harm documented in the records', foot: 'Children as young as 13 were treated for multiple sexually transmitted infections and then, the report finds, sent back.' }),
      chartCard({ title: 'Who did it — as the report describes them', kind: 'hbar', unit: 'records', total: a.victimTotal, rows: e.perpProfile, sub: 'Victim records mentioning each perpetrator description', foot: 'Reproduces the report’s own descriptions; a record can mention several. Grouping is disclosed under Data & method.' }),
      chartCard({ title: 'Institutions that failed them', kind: 'hbar', unit: 'records', total: a.victimTotal, rows: a.institutions, sub: 'Victim records citing each institution as having failed them', foot: 'Police are cited in ' + a.institutions[0].value + ' of ' + a.victimTotal + ' records — the first place a child turns, and the first place she was turned away.' }),
      chartCard({ title: 'By group & gender', kind: 'hbar', unit: 'records', total: a.victimTotal, rows: e.victimGroups.concat(e.victimGender.map(r => ({ label: 'Gender: ' + r.label, value: r.value }))), sub: 'How the records break down', foot: 'The Inquiry heard from girls, boys, women and men of all backgrounds; the overwhelming majority of records are of girls.' }),
    );
    host.appendChild(grid);
    const fh = byId('flagHost');
    if (fh) { fh.appendChild(el('h3', 'group-h', 'The scale of specific harms — records out of ' + a.victimTotal)); fh.appendChild(meterList(e.victimFlags)); }
    const mh = byId('memorialHost'); if (mh) mh.appendChild(memorialNode(D));
  }
  const listHost = byId('recordHost');
  if (listHost) {
    const INST = { 'Police': ['police'], 'Social services': ['social'], 'NHS & health services': ['nhs', 'gp', 'camhs', 'hospital', 'medical', 'health'], 'Schools & education': ['school', 'teacher', 'education', 'college'], 'Children’s homes & care': ["children's home", 'care home', 'secure unit', 'foster', 'care staff'], 'Government & councils': ['government', 'council', 'housing'], 'Courts & CPS': ['cps', 'court', 'justice', 'judge', 'prosecution'] };
    filterList(listHost, FV, {
      placeholder: 'Search records — name, place, anything…', cardFn: victimCard, countNoun: 'records', initialQ: getQ(),
      selects: [
        { all: 'All groups', options: [{ label: 'Hearing witnesses', value: 'Hearing witness' }, { label: 'Appendix I records', value: 'Appendix I record' }, { label: 'Also named', value: 'Also named' }], test: (v, val) => v._group === val },
        { all: 'Failed by: any institution', options: a.institutions.map(r => ({ label: 'Failed by: ' + r.label, value: r.label })), test: (v, val) => { const ks = INST[val] || [val.toLowerCase()]; const s = listify(v.institutions_failed_by).join(' ').toLowerCase(); return ks.some(k => s.includes(k)); } },
      ],
    });
  }
  // connections mini-explorer
  const conn = byId('connHost');
  if (conn) {
    const pills = el('div', 'pill-row'), out = el('div');
    conn.append(pills, out);
    function show(i) {
      pills.querySelectorAll('.pill').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      const x = D.xref[i]; out.replaceChildren();
      const g = el('div', 'chart-grid');
      [['Locations', x.locations], ['Institutions cited', x.institutions], ['Perpetrators described', x.perpetrators_associated]].forEach(([h, items]) => {
        const c = el('div', 'chart-card'); c.appendChild(el('h3', 'group-h', h + ' (' + listify(items).length + ')'));
        const ul = el('ul'); ul.style.listStyle = 'none'; listify(items).forEach(it => { const li = el('li', null, it); li.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--grid);font-size:.88rem;color:var(--ink-2);'; ul.appendChild(li); }); c.appendChild(ul); g.appendChild(c);
      });
      out.appendChild(g);
    }
    D.xref.forEach((x, i) => { const b = el('button', 'pill', x.person); b.setAttribute('aria-pressed', String(i === 0)); b.addEventListener('click', () => show(i)); pills.appendChild(b); });
    show(0);
  }
};

PAGES.perpetrators = (D) => {
  const e = D.expanded, a = D.aggregates;
  const host = byId('vizHost');
  if (host) {
    const tiles = byId('tileHost');
    if (tiles) [[e.perpTotal, 'individuals named in Section 2'], [e.perpNotConvicted, 'with no conviction recorded'], [e.perpWithConviction, 'convicted or pleaded guilty'], [e.perpPolice, 'serving or former police officers']].forEach(([v, l]) => { const t = el('div', 'tile'); t.append(el('div', 'v', String(v)), el('div', 'l', l)); tiles.appendChild(t); });
    const grid = el('div', 'chart-grid');
    grid.append(
      chartCard({ title: 'By recorded status', kind: 'hbar', unit: 'individuals', total: e.perpTotal, rows: a.perpStatus, sub: 'The ' + e.perpTotal + ' individuals in the perpetrator section, grouped by status', foot: '“Not convicted” means named in testimony or evidence with no conviction recorded — an allegation, not a legal finding. It also means: still out there.' }),
      chartCard({ title: 'Gang profile, by convicted-location', kind: 'hbar', unit: 'locations', rows: e.gangProfileTally, sub: 'Perpetrator profile the report records for each conviction location', foot: 'From the report’s gang-convictions-by-location summary. Reproduces its own descriptions.' }),
    );
    host.appendChild(grid);
  }
  const listHost = byId('recordHost');
  if (listHost) {
    const statuses = [...new Set(D.perpetrators.map(x => x.status || 'Unknown'))].sort();
    filterList(listHost, D.perpetrators, {
      placeholder: 'Search perpetrators — name, case, place…', cardFn: perpCard, countNoun: 'perpetrators', initialQ: getQ(),
      selects: [{ all: 'All statuses', options: statuses.map(s => ({ label: s, value: s })), test: (x, val) => (x.status || 'Unknown') === val }],
    });
  }
  const gh = byId('gangHost');
  if (gh) {
    gh.appendChild(el('h3', 'group-h', 'Gang convictions by location — the report’s summary'));
    const scroll = el('div', 'table-scroll'); const tbl = el('table', 'data-table');
    const thead = el('thead'), hr = el('tr'); hr.append(el('th', null, 'Location'), el('th', null, 'Perpetrator profile, as recorded by the report')); thead.appendChild(hr); tbl.appendChild(thead);
    const tb = el('tbody'); D.gangSummary.forEach(g => { const tr = el('tr'); tr.append(el('td', null, g.location), el('td', null, g.profile)); tb.appendChild(tr); }); tbl.appendChild(tb);
    scroll.appendChild(tbl); const card = el('div', 'chart-card'); card.appendChild(scroll); gh.appendChild(card);
  }
};

PAGES.enablers = (D) => {
  const summaries = {}; (D.testimonySummaries || []).forEach(s => summaries[s.name.toLowerCase()] = s.key_points);
  const groups = [['politicians_and_public_officials', 'Politicians & public officials', 'Those the report accuses of denial, delay or cover-up.'],
    ['whistleblowers_campaigners', 'Whistleblowers & campaigners', 'Those who tried to raise the alarm — and what was done to them for it.'],
    ['experts_and_researchers', 'Experts & researchers', 'Those who gave the Inquiry specialist evidence.'],
    ['inquiry_personnel', 'Inquiry personnel', 'The team that took the testimony.']];
  const pills = byId('pillHost'), list = byId('recordHost');
  function authCard(x) {
    const head = []; if (x.id) head.push(el('span', 'badge id', x.id)); head.push(el('span', 'name', x.name));
    if (x.party) head.push(el('span', 'badge grp', x.party)); if (x.role) head.push(el('span', 'meta', x.role));
    const fields = [fld('Allegations recorded by the report', x.allegations), fld('Testimony', x.testimony), fld('Notes', x.notes)];
    const kp = summaries[(x.name || '').toLowerCase()];
    if (kp) { const f = el('div', 'field'); f.appendChild(el('div', 'fl', 'Hearing summary — key points (Section 8)')); const ul = el('ul'); ul.style.paddingLeft = '18px'; kp.forEach(pt => { const li = el('li', null, pt); li.style.cssText = 'font-size:.88rem;color:var(--ink-2);margin:4px 0;'; ul.appendChild(li); }); f.appendChild(ul); fields.push(f); }
    if (!fields.some(Boolean)) fields.push(fld('Record', 'No further detail recorded.'));
    return collapsibleCard(head, fields);
  }
  function show(key) {
    pills.querySelectorAll('.pill').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === key)));
    list.replaceChildren(); D.authorities[key].forEach(x => list.appendChild(authCard(x)));
  }
  groups.forEach(([key, label], i) => { const b = el('button', 'pill', label + ' (' + D.authorities[key].length + ')'); b.dataset.k = key; b.setAttribute('aria-pressed', String(i === 0)); b.addEventListener('click', () => show(key)); pills.appendChild(b); });
  show(groups[0][0]);
};

PAGES.institutions = (D) => {
  const a = D.aggregates;
  const ch = byId('chargeHost');
  const labels = { police_forces: 'Police forces', nhs_services: 'NHS & health', social_care: 'Social care', education: 'Schools', taxi_licensing: 'Taxi licensing', government_organisations: 'Government', childrens_homes: 'Children’s homes' };
  if (ch) {
    const grid = el('div', 'fail-grid');
    Object.entries(D.institutions).forEach(([key, items]) => {
      const c = el('div', 'fail-card');
      const h = el('h3', null, labels[key] || key); h.appendChild(el('span', 'cnt', items.length + ' examined')); c.appendChild(h);
      const ul = el('ul');
      function li(x) { const li = el('li'); li.appendChild(el('strong', null, x.name)); li.appendChild(document.createTextNode(x.failures || x.notes || '')); return li; }
      items.slice(0, 4).forEach(x => ul.appendChild(li(x))); c.appendChild(ul);
      if (items.length > 4) { const more = el('button', 'view-toggle', 'Show all ' + items.length); more.style.marginTop = '12px'; more.addEventListener('click', () => { ul.replaceChildren(); items.forEach(x => ul.appendChild(li(x))); more.remove(); }); c.appendChild(more); }
      grid.appendChild(c);
    });
    ch.appendChild(grid);
  }
  const vh = byId('vizHost');
  if (vh) vh.appendChild(chartCard({ title: 'Institutions named across victim records', kind: 'hbar', unit: 'records', total: a.victimTotal, rows: a.institutions, sub: 'How many victim records cite each arm of the state', foot: 'The charge sheet above is qualitative; this is the count.' }));
};

PAGES.voices = (D) => {
  const mh = byId('memorialHost'); if (mh) mh.appendChild(memorialNode(D));
  const grid = byId('quoteGrid'), moreBtn = byId('moreQuotes');
  const INITIAL = 10;
  function card(q, idx) {
    const c = el('div', 'quote-card'); c.appendChild(el('span', 'qnum', 'E·' + String(idx + 1).padStart(2, '0')));
    if (q.type === 'exchange') q.turns.forEach(t => { const m = t.match(/^([^:]{1,40}):\s*(.*)$/s); const turn = el('div', 'turn'); if (m) { turn.appendChild(el('span', 'speaker', m[1] + ': ')); turn.appendChild(document.createTextNode(m[2])); } else turn.textContent = t; c.appendChild(turn); });
    else c.appendChild(el('p', null, q.text));
    return c;
  }
  function render(n) { grid.replaceChildren(); D.quotes.slice(0, n).forEach((q, i) => grid.appendChild(card(q, i))); }
  render(INITIAL);
  if (moreBtn) {
    moreBtn.textContent = 'Show all ' + D.quotes.length + ' quotations'; let ex = false;
    moreBtn.addEventListener('click', () => { ex = !ex; render(ex ? D.quotes.length : INITIAL); moreBtn.textContent = ex ? 'Show fewer' : 'Show all ' + D.quotes.length + ' quotations'; if (!ex) byId('voices').scrollIntoView(); });
  }
};

PAGES.map = (D) => {
  const L = D.locations;
  const gang = new Set(D.gangSummary.map(g => g.location.toLowerCase()));
  const wall = byId('wallNames');
  if (wall) {
    L.local_authority_districts_full_list.forEach(d => {
      const b = el('button', 'wall-name' + (gang.has(d.toLowerCase()) ? ' gang' : ''), d);
      b.addEventListener('click', () => { location.href = 'victims.html?q=' + encodeURIComponent(d); });
      wall.appendChild(b);
    });
    const io = new IntersectionObserver(es => { if (!es.some(e => e.isIntersecting)) return; io.disconnect(); const ns = [...wall.children]; if (REDUCED) ns.forEach(n => n.classList.add('lit')); else ns.forEach((n, i) => setTimeout(() => n.classList.add('lit'), i * 12)); }, { threshold: 0.1 });
    io.observe(wall);
  }
  const ch = byId('countyHost');
  if (ch) { const c = el('div', 'chips'); L.counties_additional_evidence.forEach(x => c.appendChild(el('span', 'chip accent', x))); ch.appendChild(c); }
  const dh = byId('districtHost');
  if (dh) {
    const search = el('input'); search.type = 'search'; search.placeholder = 'Search districts…'; search.setAttribute('aria-label', 'Search districts');
    const fr = el('div', 'filter-row'); fr.appendChild(search); dh.appendChild(fr);
    const count = el('div', 'result-count'); dh.appendChild(count);
    const grid = el('div', 'district-grid'); dh.appendChild(grid);
    function apply() { const q = search.value.trim().toLowerCase(); grid.replaceChildren(); let n = 0; L.local_authority_districts_full_list.forEach(d => { if (q && !d.toLowerCase().includes(q)) return; const el2 = el('div', 'district', d); grid.appendChild(el2); n++; }); count.textContent = n + ' of ' + L.local_authority_districts_full_list.length + ' districts'; }
    search.addEventListener('input', apply); apply();
  }
  const vh = byId('venueHost');
  if (vh) {
    vh.appendChild(el('h3', 'group-h', 'Specific venues mentioned in testimony'));
    L.specific_venues_mentioned.forEach(v => { const c = el('div', 'law-item'); c.appendChild(el('h4', null, v.name)); if (v.location) c.appendChild(el('p', null, v.location)); if (v.notes) c.appendChild(el('p', null, v.notes)); vh.appendChild(c); });
    vh.appendChild(el('h3', 'group-h', 'Religious sites mentioned in testimony'));
    L.mosques_sites_mentioned.forEach(v => { const c = el('div', 'law-item'); c.appendChild(el('h4', null, v.name)); if (v.notes) c.appendChild(el('p', null, v.notes)); vh.appendChild(c); });
  }
};

PAGES.law = (D) => {
  const host = byId('lawHost'); if (!host) return;
  const groups = [['inquiries_reports', 'Prior inquiries & reports', 'What was already known. They were told, in writing, repeatedly.'],
    ['key_legislation', 'Key legislation', 'The statutory framework the report says failed — and demands be changed.'],
    ['government_programs', 'Government programmes', 'Safeguarding frameworks that appear in the testimony — usually for having failed.'],
    ['police_operations', 'Police operations', 'Named operations referenced in the evidence.']];
  function year(n) { const m = n.match(/(19|20)\d{2}/); return m ? m[0] : null; }
  groups.forEach(([key, label, lede]) => {
    host.appendChild(el('h3', 'group-h', label)); host.appendChild(el('div', 'panel-note', lede));
    [...D.programs[key]].sort((a, b) => (year(a.name) || '9999').localeCompare(year(b.name) || '9999')).forEach(x => {
      const c = el('div', 'law-item'); const lh = el('div', 'lh'); const y = year(x.name);
      if (y) lh.appendChild(el('span', 'yr', y)); lh.appendChild(el('h4', null, x.name)); if (x.type) lh.appendChild(el('span', 'meta', x.type)); c.appendChild(lh);
      if (x.notes) c.appendChild(el('p', null, x.notes)); host.appendChild(c);
    });
  });
};

PAGES.document = (D) => {
  const toc = byId('docToc'), reader = byId('docReader'), searchInput = byId('docSearch'), results = byId('docSearchResults');
  const secs = D.docSections;
  function highlight(par, q) {
    const p = el('p'); if (!q) { p.textContent = par; return p; }
    const lower = par.toLowerCase(), ql = q.toLowerCase(); let i = 0, idx;
    while ((idx = lower.indexOf(ql, i)) !== -1) { p.appendChild(document.createTextNode(par.slice(i, idx))); p.appendChild(el('mark', null, par.slice(idx, idx + q.length))); i = idx + q.length; }
    p.appendChild(document.createTextNode(par.slice(i))); return p;
  }
  function load(i, q) {
    const s = secs[i]; reader.replaceChildren(); reader.appendChild(el('h3', null, s.title));
    s.paragraphs.forEach(par => reader.appendChild(highlight(par, q)));
    const nav = el('div', 'doc-nav');
    if (i > 0) { const b = el('button', 'btn', '← Prev'); b.addEventListener('click', () => { load(i - 1); reader.scrollIntoView(); }); nav.appendChild(b); } else nav.appendChild(el('span'));
    if (i < secs.length - 1) { const b = el('button', 'btn', 'Next →'); b.addEventListener('click', () => { load(i + 1); reader.scrollIntoView(); }); nav.appendChild(b); }
    reader.appendChild(nav);
    toc.querySelectorAll('.toc-item').forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
    const fm = reader.querySelector('mark'); if (q && fm) fm.scrollIntoView({ block: 'center' });
  }
  secs.forEach((s, i) => { const b = el('button', 'toc-item', s.title); b.addEventListener('click', () => load(i)); toc.appendChild(b); });
  let db;
  searchInput.addEventListener('input', () => {
    clearTimeout(db); db = setTimeout(() => {
      const q = searchInput.value.trim(); results.replaceChildren(); if (q.length < 3) return;
      const ql = q.toLowerCase(); let total = 0; const hits = [];
      secs.forEach((s, si) => s.paragraphs.forEach(par => { const idx = par.toLowerCase().indexOf(ql); if (idx === -1) return; total++; if (hits.length < 25) hits.push({ si, par, idx }); }));
      results.appendChild(el('div', 'result-count', total + ' matching paragraph' + (total === 1 ? '' : 's')));
      hits.forEach(h => { const b = el('button', 'search-hit'); b.appendChild(el('span', 'sh-sec', secs[h.si].title)); const st = Math.max(0, h.idx - 40); b.appendChild(el('span', 'sh-snip', '…' + h.par.slice(st, h.idx + q.length + 60) + '…')); b.addEventListener('click', () => load(h.si, q)); results.appendChild(b); });
    }, 200);
  });
  const startDoc = getQ();
  const si = startDoc ? secs.findIndex(s => s.title.toLowerCase().includes(startDoc.toLowerCase())) : 0;
  load(si >= 0 ? si : 0);
};

PAGES.data = (D) => {
  const grid = byId('exportGrid'); if (!grid) return;
  function download(name, content, type) { const b = new Blob([content], { type }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); }
  function csvEsc(v) { const s = textOf(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function toCsv(rows, cols) { const out = [cols.map(c => c[0]).join(',')]; rows.forEach(r => out.push(cols.map(c => csvEsc(c[1](r))).join(','))); return out.join('\n'); }
  const { FV } = flats(D);
  const exp = [
    ['Structured dataset (JSON)', 'Everything — records, the evidence web, the aggregates — as repaired, valid JSON.', () => download('rape_gang_inquiry_data.json', JSON.stringify(D, null, 2), 'application/json')],
    ['Victim records (CSV)', 'All ' + D.aggregates.victimTotal + ' victim and survivor records as a flat table.', () => download('victims.csv', toCsv(FV, [['id', r => r.id], ['pseudonym', r => r.pseudonym], ['group', r => r._group], ['gender', r => r.gender], ['age_at_first_abuse', r => r.age_at_first_abuse], ['abuse_period', r => r.abuse_period], ['locations', r => r.location_associated], ['abuse_types', r => r.abuse_types], ['institutions_failed_by', r => r.institutions_failed_by], ['injuries_conditions', r => r.injuries_conditions], ['perpetrator_demographics', r => r.perpetrator_demographics]]), 'text/csv')],
    ['Perpetrators (CSV)', 'Section 2 — status, conviction, sentence and location for each of the ' + D.perpetrators.length + ' names.', () => download('perpetrators.csv', toCsv(D.perpetrators, [['id', r => r.id], ['name', r => r.name], ['status', r => r.status], ['conviction', r => r.conviction], ['sentence', r => r.sentence], ['case', r => r.case], ['locations', r => r.location_associated], ['allegations', r => r.allegations], ['notes', r => r.notes]]), 'text/csv')],
    ['Affected districts (CSV)', 'All ' + D.locations.local_authority_districts_full_list.length + ' districts from Appendix IV.', () => download('districts.csv', 'district\n' + D.locations.local_authority_districts_full_list.map(csvEsc).join('\n'), 'text/csv')],
    ['Evidence web (JSON)', 'The full node-and-edge graph — ' + D.graph.nodes.length + ' nodes, ' + D.graph.edges.length + ' edges.', () => download('evidence_web.json', JSON.stringify(D.graph, null, 2), 'application/json')],
    ['Full report text (TXT)', 'The complete report as plain text, encoding repaired.', () => download('rape_gang_inquiry_report.txt', D.docSections.map(s => s.title + '\n\n' + s.paragraphs.join('\n\n')).join('\n\n\n'), 'text/plain')],
    ['Print / PDF', 'Print any page — controls stripped, records expanded, ink-on-white.', () => window.print()],
  ];
  exp.forEach(([t, d, fn]) => { const c = el('div', 'export-card'); c.append(el('h4', null, t), el('p', null, d)); const b = el('button', 'btn', t.startsWith('Print') ? 'Print' : 'Download'); b.addEventListener('click', fn); c.appendChild(b); grid.appendChild(c); });
};

/* home content tables (kept here to keep pages thin) */
const FINDINGS = [
  ['The scale', '<strong>At least 250,000 girls.</strong> Raped, gang-raped, trafficked, tortured, impregnated, forcibly converted — the report’s words — and it calls the true number “probably higher.” Nobody counted. That was a choice. <a href="victims.html">See the records →</a>'],
  ['The reach', '<strong>149 districts. Every region.</strong> Close to 40% of the UK’s local authority districts, evidence stretching back to the 1950s. <a href="map.html">Look for your town →</a>'],
  ['The pattern', '<strong>The same method, town after town.</strong> A girl befriended at 11 or 12. Alcohol, drugs, a taxi at the school gate. Then groups of adult men, for years. <a href="victims.html">Read the records →</a>'],
  ['The failure', '<strong>Every institution failed the same children.</strong> Police ignored and criminalised them. The NHS treated a child’s third STI and sent her back. Licensing renewed the taxi permits. <a href="institutions.html">Read the charge sheet →</a>'],
  ['The silence', '<strong>They were not ignorant. They were afraid</strong> — of the word “racist,” of lost votes. And the people who did speak were suspended, sued, raided and gagged. <a href="enablers.html">See who spoke, and who didn’t →</a>'],
  ['The demand', '<strong>The report does not ask. It demands:</strong> life sentences as the starting point, mandatory data recording, deportations, accountability. <a href="demands.html">Read the demands →</a>'],
];
const SECTION_INDEX = [
  ['victims.html', 'Exhibit · 01', 'The Victims', 'Every survivor record, densified: age, gender, what was done, the injuries, who did it, who failed them.'],
  ['perpetrators.html', 'Exhibit · 02', 'The Perpetrators', 'Section 2 in full — convicted and unconvicted alike, with status, case, sentence and location.'],
  ['enablers.html', 'Exhibit · 03', 'The Enablers', 'The politicians accused, the whistleblowers punished, the experts who testified.'],
  ['institutions.html', 'Exhibit · 04', 'The Charge Sheet', 'Every arm of the state, named, with what it did while children disclosed to it.'],
  ['voices.html', 'Exhibit · 05', 'The Voices', '62 pieces of survivor testimony, verbatim from Appendix II.'],
  ['timeline.html', 'Exhibit · 06', 'The Timeline', 'Seventy years. They were told, and told, and told.'],
  ['map.html', 'Exhibit · 07', 'The Map', 'All 149 districts. This was never somewhere else’s problem.'],
  ['demands.html', 'Exhibit · 08', 'The Demands', 'The report’s recommendations, condensed but not softened.'],
  ['document.html', 'Exhibit · 09', 'The Source', 'All 21 chapters of the report, unabridged, with full-text search.'],
  ['data.html', 'Exhibit · 10', 'The Data', 'Take it with you — JSON, CSV, plain text. Evidence that can be copied cannot be shredded.'],
];

/* ---------------------------------------------------------------- boot */
async function boot() {
  buildChrome();
  const page = document.body.dataset.page;
  const needsData = page && page !== 'static';
  if (needsData) {
    try {
      const res = await fetch('assets/data.json', { cache: 'no-store' });
      RGI.data = await res.json();
    } catch (err) {
      const host = byId('vizHost') || byId('recordHost') || document.querySelector('main');
      if (host) { const n = el('div', 'panel-note'); n.textContent = 'This page loads its data from assets/data.json and must be served over HTTP — run the included serve.py and open http://localhost:5762/. (Opening the file directly with file:// blocks the fetch.)'; host.prepend(n); }
      return;
    }
    if (PAGES[page]) PAGES[page](RGI.data);
  }
  countUps();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
