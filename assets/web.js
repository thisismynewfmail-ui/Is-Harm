/* =============================================================================
   THE RAPE GANG INQUIRY — THE EVIDENCE WEB
   A hand-rolled 3D force-directed constellation of the whole case file,
   drawn on a 2D canvas. No libraries, nothing external.
   Exposes RGI.initWeb(DATA). Deep-links selections to the record pages.
   ========================================================================== */
'use strict';
(function () {
  const RGI = window.RGI = window.RGI || {};
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const listify = v => v == null ? [] : Array.isArray(v) ? v : [v];
  const textOf = v => listify(v).join('; ');
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  RGI.initWeb = function (DATA) {
    const G = DATA.graph;
    const N = G.nodes.length;
    if (document.getElementById('webNodeCount')) document.getElementById('webNodeCount').textContent = N;
    if (document.getElementById('webEdgeCount')) document.getElementById('webEdgeCount').textContent = G.edges.length;

    // flat arrays (mirror build order) for the detail panel
    const FV = [];
    [['hearing', 'Hearing witness'], ['appendix', 'Appendix I record'], ['other', 'Also named']]
      .forEach(([k, g]) => DATA.victims[k].forEach(v => FV.push(Object.assign({}, v, { _group: g }))));
    const AUTH = [];
    [['politicians_and_public_officials', 'Politician / official'], ['whistleblowers_campaigners', 'Whistleblower / campaigner'],
     ['experts_and_researchers', 'Expert / researcher'], ['inquiry_personnel', 'Inquiry personnel']]
      .forEach(([k, g]) => DATA.authorities[k].forEach(a => AUTH.push(Object.assign({}, a, { _group: g }))));
    const INST = [];
    Object.entries(DATA.institutions).forEach(([k, items]) => items.forEach(x => INST.push(x)));
    const LAW = [];
    ['inquiries_reports', 'key_legislation', 'government_programs', 'police_operations'].forEach(k => DATA.programs[k].forEach(x => LAW.push(x)));

    const canvas = document.getElementById('webCanvas');
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(devicePixelRatio || 1, 2);

    const TYPE = {
      victim: { color: '#ff4b41', label: 'The children', base: 3.4 },
      perp: { color: '#b2251c', label: 'Perpetrators', base: 3.2 },
      system: { color: '#f2ede3', label: 'The system', base: 7.5 },
      institution: { color: '#b9b3a6', label: 'Institutions', base: 2.8 },
      place: { color: '#8f887c', label: 'The towns', base: 2.8 },
      authority: { color: '#d9938b', label: 'Enablers', base: 2.8 },
      law: { color: '#7d8a94', label: 'The law', base: 2.8 },
      case: { color: '#c9a25e', label: 'Court cases', base: 3.4 },
      hub: { color: '#7d7669', label: 'Hubs', base: 6.0 },
      core: { color: '#ff4b41', label: 'Cores', base: 10 },
    };
    const GLYPH = { victim: '●', perp: '◆', system: '■', institution: '▪', place: '○', authority: '▲', law: '✚', case: '✳', hub: '□', core: '◉' };
    const visible = {}; Object.keys(TYPE).forEach(k => visible[k] = true);

    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
    const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
    let rand = 1234567; const rnd = () => { rand = (rand * 16807) % 2147483647; return rand / 2147483647 - 0.5; };
    G.nodes.forEach((n, i) => {
      if (n.label === 'THE CHILDREN') { px[i] = -160; py[i] = 0; pz[i] = 0; return; }
      if (n.label === 'THE NAMED') { px[i] = 160; py[i] = 0; pz[i] = 0; return; }
      let cx = 0;
      if (n.t === 'victim') cx = -120;
      if (n.t === 'perp' || n.t === 'case') cx = 130;
      if (n.t === 'authority') cx = 60;
      px[i] = cx + rnd() * 320; py[i] = rnd() * 320; pz[i] = rnd() * 320;
    });
    const adj = Array.from({ length: N }, () => []);
    G.edges.forEach(([a, b, k]) => { adj[a].push([b, k]); adj[b].push([a, k]); });
    const REST = { is: 85, failed: 120, place: 110, operated: 110, member: 95, case: 70 };
    let simTicks = 320;
    function simStep() {
      for (let i = 0; i < N; i++) {
        let fx = -px[i] * 0.0012, fy = -py[i] * 0.0018, fz = -pz[i] * 0.0012;
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const dx = px[i] - px[j], dy = py[i] - py[j], dz = pz[i] - pz[j];
          const d2 = dx * dx + dy * dy + dz * dz + 40; if (d2 > 90000) continue;
          const d = Math.sqrt(d2), f = 900 / d2; fx += dx / d * f; fy += dy / d * f; fz += dz / d * f;
        }
        for (const [j, k] of adj[i]) {
          const dx = px[j] - px[i], dy = py[j] - py[i], dz = pz[j] - pz[i];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4, f = (d - (REST[k] || 100)) * 0.012;
          fx += dx / d * f; fy += dy / d * f; fz += dz / d * f;
        }
        vx[i] = (vx[i] + fx) * 0.82; vy[i] = (vy[i] + fy) * 0.82; vz[i] = (vz[i] + fz) * 0.82;
      }
      for (let i = 0; i < N; i++) { px[i] += vx[i]; py[i] += vy[i]; pz[i] += vz[i]; }
    }
    if (REDUCED) { for (let t = 0; t < 320; t++) simStep(); simTicks = 0; }

    let yaw = 0.4, pitch = 0.12, zoom = 1, autoSpin = !REDUCED;
    let targetYaw = null, targetPitch = null;
    let selected = -1, hovered = -1, running = false, lastInteract = 0;
    function resize() { const r = canvas.getBoundingClientRect(); canvas.width = r.width * DPR; canvas.height = r.height * DPR; }
    resize(); addEventListener('resize', resize);

    const sx = new Float32Array(N), sy = new Float32Array(N), sd = new Float32Array(N);
    function project() {
      const w = canvas.width, h = canvas.height;
      const cy = Math.cos(yaw), sy_ = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), F = 760;
      for (let i = 0; i < N; i++) {
        const x1 = px[i] * cy + pz[i] * sy_, z1 = -px[i] * sy_ + pz[i] * cy;
        const y2 = py[i] * cp - z1 * sp, z2 = py[i] * sp + z1 * cp;
        const s = (F / (F + z2)) * zoom * DPR;
        sx[i] = w / 2 + x1 * s; sy[i] = h / 2 + y2 * s; sd[i] = s;
      }
    }
    const nodeVisible = i => visible[G.nodes[i].t];
    function neighborSet(i) { const s = new Set([i]); if (i >= 0) adj[i].forEach(([j]) => s.add(j)); return s; }

    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const focus = selected >= 0 ? selected : hovered;
      const near = focus >= 0 ? neighborSet(focus) : null;
      ctx.lineWidth = 1 * DPR;
      for (const [a, b, k] of G.edges) {
        if (!nodeVisible(a) || !nodeVisible(b)) continue;
        const hot = near && near.has(a) && near.has(b) && (a === focus || b === focus);
        const depth = Math.min(sd[a], sd[b]) / DPR;
        let alpha = Math.max(0.03, Math.min(0.16, depth * 0.14));
        if (near && !hot) alpha *= 0.25; if (hot) alpha = 0.9;
        ctx.strokeStyle = (k === 'failed') ? 'rgba(255,75,65,' + alpha + ')' : 'rgba(190,180,168,' + alpha * 0.8 + ')';
        if (hot) ctx.strokeStyle = k === 'failed' ? 'rgba(255,75,65,.95)' : 'rgba(242,237,227,.8)';
        ctx.beginPath(); ctx.moveTo(sx[a], sy[a]); ctx.lineTo(sx[b], sy[b]); ctx.stroke();
      }
      const order = []; for (let i = 0; i < N; i++) if (nodeVisible(i)) order.push(i);
      order.sort((a, b) => sd[a] - sd[b]);
      ctx.textAlign = 'center';
      for (const i of order) {
        const n = G.nodes[i], t = TYPE[n.t], dim = near && !near.has(i);
        const r = (t.base + Math.sqrt(n.d || 1) * 0.85) * sd[i] * 0.55;
        let alpha = Math.max(0.25, Math.min(1, sd[i] / DPR)); if (dim) alpha *= 0.16;
        ctx.globalAlpha = alpha; const x = sx[i], y = sy[i];
        ctx.fillStyle = t.color; ctx.strokeStyle = t.color; ctx.lineWidth = 1.4 * DPR; ctx.beginPath();
        if (n.t === 'victim' || n.t === 'core') {
          ctx.arc(x, y, r, 0, 7); ctx.fill();
          if (n.t === 'core') { ctx.globalAlpha = alpha * 0.3; ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, 7); ctx.stroke(); ctx.globalAlpha = alpha; }
        } else if (n.t === 'perp') {
          ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
          ctx.globalAlpha = alpha * 0.45; ctx.fill(); ctx.globalAlpha = alpha; ctx.stroke();
        } else if (n.t === 'system' || n.t === 'hub') {
          ctx.rect(x - r, y - r, r * 2, r * 2);
          if (n.t === 'system') { ctx.globalAlpha = alpha * 0.22; ctx.fill(); ctx.globalAlpha = alpha; } ctx.stroke();
        } else if (n.t === 'institution') { ctx.rect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6); ctx.fill(); }
        else if (n.t === 'place') { ctx.arc(x, y, r, 0, 7); ctx.stroke(); if (n.gang) { ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.strokeStyle = 'rgba(216,64,64,.8)'; ctx.stroke(); } }
        else if (n.t === 'authority') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); ctx.stroke(); }
        else if (n.t === 'law') { ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); }
        else if (n.t === 'case') { for (let a = 0; a < 3; a++) { const th = a * Math.PI / 3; ctx.moveTo(x - Math.cos(th) * r, y - Math.sin(th) * r); ctx.lineTo(x + Math.cos(th) * r, y + Math.sin(th) * r); } ctx.stroke(); }
        if (i === selected || i === hovered) { ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r + 6 * DPR, 0, 7); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 * DPR; ctx.stroke(); }
        const showLabel = n.t === 'system' || n.t === 'hub' || n.t === 'core' || i === selected || i === hovered || (near && near.has(i)) || (n.d || 0) >= 9;
        if (showLabel) {
          ctx.globalAlpha = dim ? 0.25 : 0.95;
          ctx.font = (n.t === 'core' ? 700 : 400) + ' ' + (n.t === 'core' ? 13 : 10) * DPR + 'px "Courier New",monospace';
          ctx.fillStyle = n.t === 'victim' ? '#ff8a82' : '#cfc8ba';
          ctx.fillText(n.label.toUpperCase().slice(0, 30), x, y - r - 6 * DPR);
        }
      }
      ctx.globalAlpha = 1;
    }
    function loop() {
      if (!running) return;
      if (simTicks > 0) { simStep(); simStep(); simTicks -= 2; }
      if (autoSpin && performance.now() - lastInteract > 3500 && targetYaw === null) yaw += 0.0014;
      if (targetYaw !== null) { yaw += (targetYaw - yaw) * 0.08; pitch += (targetPitch - pitch) * 0.08; if (Math.abs(targetYaw - yaw) < 0.005) { targetYaw = null; targetPitch = null; } }
      project(); draw(); requestAnimationFrame(loop);
    }
    const vis = new IntersectionObserver(es => { const on = es.some(e => e.isIntersecting); if (on && !running) { running = true; requestAnimationFrame(loop); } if (!on) running = false; }, { threshold: 0.05 });
    vis.observe(canvas);

    let dragging = false, lastX = 0, lastY = 0, moved = 0;
    canvas.addEventListener('pointerdown', e => { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId); lastInteract = performance.now(); });
    canvas.addEventListener('pointermove', e => {
      lastInteract = performance.now();
      if (dragging) { const dx = e.clientX - lastX, dy = e.clientY - lastY; moved += Math.abs(dx) + Math.abs(dy); yaw += dx * 0.005; pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.004)); targetYaw = null; lastX = e.clientX; lastY = e.clientY; return; }
      hovered = pick(e); canvas.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
      if (hovered >= 0) { const n = G.nodes[hovered]; RGI.showTip(rectAt(e), TYPE[n.t].label + ' · ' + (n.d || 0) + ' connection' + (n.d === 1 ? '' : 's'), n.label); } else RGI.hideTip();
    });
    function rectAt(e) { return { getBoundingClientRect: () => ({ left: e.clientX - 8, width: 16, top: e.clientY - 10, bottom: e.clientY + 10 }) }; }
    canvas.addEventListener('pointerup', e => { dragging = false; canvas.classList.remove('dragging'); if (moved < 6) { const i = pick(e); if (i >= 0) select(i); else closePanel(); } });
    canvas.addEventListener('pointerleave', () => { hovered = -1; RGI.hideTip(); });
    function pick(e) {
      const r = canvas.getBoundingClientRect(), mx = (e.clientX - r.left) * DPR, my = (e.clientY - r.top) * DPR;
      let best = -1, bestD = 20 * DPR;
      for (let i = 0; i < N; i++) { if (!nodeVisible(i)) continue; const dx = sx[i] - mx, dy = sy[i] - my, d = Math.sqrt(dx * dx + dy * dy); if (d < bestD) { bestD = d; best = i; } }
      return best;
    }
    const $ = id => document.getElementById(id);
    $('webZoomIn').addEventListener('click', () => { zoom = Math.min(3, zoom * 1.25); lastInteract = performance.now(); });
    $('webZoomOut').addEventListener('click', () => { zoom = Math.max(0.45, zoom / 1.25); lastInteract = performance.now(); });
    const spinBtn = $('webSpin');
    spinBtn.addEventListener('click', () => { autoSpin = !autoSpin; spinBtn.textContent = autoSpin ? '⏸' : '▶'; spinBtn.setAttribute('aria-pressed', String(autoSpin)); });
    $('webReset').addEventListener('click', () => { zoom = 1; targetYaw = 0.4; targetPitch = 0.12; selected = -1; closePanel(); });

    const fwrap = $('webFilters');
    Object.entries(TYPE).forEach(([k, t]) => {
      if (k === 'hub' || k === 'core') return;
      const count = G.nodes.filter(n => n.t === k).length;
      const b = el('button', 'wf'); b.setAttribute('aria-pressed', 'true');
      const g = el('span', 'g', GLYPH[k]); g.style.color = t.color;
      b.append(g, document.createTextNode(t.label + ' ' + count));
      b.addEventListener('click', () => { visible[k] = !visible[k]; b.setAttribute('aria-pressed', String(visible[k])); });
      fwrap.appendChild(b);
    });

    const panel = $('webPanel'), wpBody = $('wpBody');
    $('wpClose').addEventListener('click', closePanel);
    function closePanel() { panel.classList.remove('open'); selected = -1; }
    function wpField(l, v) { if (!v || (Array.isArray(v) && !v.length)) return null; const f = el('div', 'wp-field'); f.append(el('div', 'fl', l), el('div', 'fv', textOf(v))); return f; }
    function select(i) {
      selected = i; const n = G.nodes[i];
      targetYaw = -Math.atan2(pz[i], px[i]) + Math.PI / 2;
      targetPitch = Math.max(-0.9, Math.min(0.9, Math.atan2(py[i], Math.hypot(px[i], pz[i])) * 0.7));
      wpBody.replaceChildren();
      wpBody.appendChild(el('div', 'wp-type', GLYPH[n.t] + ' ' + TYPE[n.t].label));
      wpBody.appendChild(el('h4', null, n.label));
      wpBody.appendChild(el('div', 'wp-deg', (n.d || 0) + ' documented connections'));
      let href = null;
      const ref = n.ref;
      if (ref) {
        const [kind, idx] = ref;
        if (kind === 'victim') { const v = FV[idx];[wpField('Record', (v.id || '—') + ' · ' + v._group), wpField('Age at first abuse', v.age_at_first_abuse), wpField('Abuse documented', v.abuse_types), wpField('Institutions that failed them', v.institutions_failed_by), wpField('Perpetrators, as described', v.perpetrator_demographics), wpField('Injuries & conditions', v.injuries_conditions), wpField('Death recorded', v.cause_of_death ? textOf(v.cause_of_death) + (v.age_at_death ? ' (aged ' + v.age_at_death + ')' : '') : null)].forEach(f => f && wpBody.appendChild(f)); href = 'victims.html?q=' + encodeURIComponent(v.pseudonym || v.id || ''); }
        else if (kind === 'perp') { const x = DATA.perpetrators[idx];[wpField('Record', x.id), wpField('Status, as recorded', x.status), wpField('Case', x.case), wpField('Conviction', x.conviction), wpField('Sentence', x.sentence), wpField('Allegations recorded', x.allegations), wpField('Notes', x.notes)].forEach(f => f && wpBody.appendChild(f)); if (/not convicted/i.test(x.status || '')) wpBody.appendChild(el('div', 'wp-deg', 'Named in evidence — no conviction recorded. Not a legal finding.')); href = 'perpetrators.html?q=' + encodeURIComponent(x.name || ''); }
        else if (kind === 'auth') { const a = AUTH[idx];[wpField('Group', a._group), wpField('Role', a.role), wpField('Party', a.party), wpField('Allegations recorded', a.allegations), wpField('Testimony', a.testimony), wpField('Notes', a.notes)].forEach(f => f && wpBody.appendChild(f)); href = 'enablers.html'; }
        else if (kind === 'inst') { const x = INST[idx];[wpField('Record', x.id), wpField('Failures recorded', x.failures), wpField('Notes', x.notes)].forEach(f => f && wpBody.appendChild(f)); href = 'institutions.html'; }
        else if (kind === 'law') { const x = LAW[idx];[wpField('Record', x.id), wpField('Type', x.type), wpField('Notes', x.notes)].forEach(f => f && wpBody.appendChild(f)); href = 'document.html'; }
      } else if (n.t === 'place') {
        wpBody.appendChild(wpField('Node', 'A place in the evidence.' + (n.gang ? ' Gang convictions recorded here, per the report.' : '') + (n.county ? ' County holding additional evidence.' : '')));
        href = 'victims.html?q=' + encodeURIComponent(n.label);
      } else {
        const blurb = { 'THE CHILDREN': 'Every victim and survivor record is anchored here. This is the centre of the web because it was never treated as the centre of anything.', 'THE NAMED': 'Every individual named in the report’s perpetrator section — convicted and unconvicted alike.' }[n.label];
        if (blurb) wpBody.appendChild(wpField('About this node', blurb));
      }
      const links = el('div', 'wp-links'); links.appendChild(el('div', 'fl', 'Connections'));
      adj[i].slice(0, 40).forEach(([j, k]) => { const m = G.nodes[j]; const b = el('button', 'wp-link'); const g = el('span', 'g', GLYPH[m.t]); g.style.color = TYPE[m.t].color; b.append(g, document.createTextNode(m.label + (k === 'failed' ? '  — failed her' : ''))); b.addEventListener('click', () => select(j)); links.appendChild(b); });
      wpBody.appendChild(links);
      if (href) { const ob = el('a', 'btn wp-open'); ob.href = href; ob.textContent = 'Open in the full record →'; wpBody.appendChild(ob); }
      panel.classList.add('open');
    }

    const ws = $('webSearch'), wsr = $('wsResults');
    ws.addEventListener('input', () => {
      const q = ws.value.trim().toLowerCase(); wsr.replaceChildren();
      if (q.length < 2) { wsr.hidden = true; return; }
      const hits = []; G.nodes.forEach((n, i) => { if (n.label.toLowerCase().includes(q)) hits.push(i); });
      hits.slice(0, 9).forEach(i => { const n = G.nodes[i]; const b = el('button', 'ws-hit'); b.appendChild(el('span', 't', TYPE[n.t].label)); b.appendChild(document.createTextNode(n.label)); b.addEventListener('click', () => { select(i); wsr.hidden = true; ws.value = n.label; }); wsr.appendChild(b); });
      if (!hits.length) wsr.appendChild(el('div', 'ws-hit', 'No node found.'));
      wsr.hidden = false;
    });
    document.addEventListener('click', e => { if (!wsr.contains(e.target) && e.target !== ws) wsr.hidden = true; });
  };
})();
