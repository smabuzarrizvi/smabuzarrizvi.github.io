/* ==========================================================================
   background.js — a quiet, interactive quantum-themed canvas behind the pages.

   Items: Dirac-notation and equation glyphs, circuit gates (H, X, Z, S, T,
   CNOT), a rotating Bloch sphere, Rydberg-atom orbits, qubit lattices with
   blockade-style links, Josephson junctions and Gaussian control pulses.

   Interaction: items drift away from the pointer, items near the pointer are
   linked by faint "entanglement" curves, and a click/tap sends out a ripple.

   Accessibility and cost: decorative only (aria-hidden); a header button
   pauses it (choice remembered); prefers-reduced-motion starts it paused
   (one static frame); fewer items on small screens; the loop stops when the
   tab is hidden. No dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var KEY = 'bg-anim';
  var reduceMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* storage unavailable */ }
  var animate = stored ? stored === 'on' : !reduceMq.matches;
  var KEY2 = 'bg-interact';
  var storedI = null;
  try { storedI = localStorage.getItem(KEY2); } catch (e) { /* storage unavailable */ }
  var interactive = storedI ? storedI === 'on' : true;

  var canvas, ctx, W = 0, H = 0, dpr = 1;
  var items = [], ripples = [];
  var mouse = { x: -9999, y: -9999, active: false };
  var scrollY = window.scrollY || 0;
  var colors = { ink: '#1f3b6b', accent: '#9c4317', dark: false };
  var raf = 0, last = 0, running = false;

  /* ---------- content ---------- */
  var GLYPHS = [
    '|ψ⟩', '|0⟩', '|1⟩', '|+⟩', '⟨φ|ψ⟩', 'Ĥ', 'ħ', 'ρ', 'σₓ', 'σ_z', 'U†U = I', 'Tr ρ² ≤ 1', '⊗',
    'iħ ∂ₜ|ψ⟩ = Ĥ|ψ⟩', '(|00⟩ + |11⟩)/√2', 'e^{−iĤt/ħ}', 'min xᵀQx', '⟨ψ(θ)|Ĥ|ψ(θ)⟩',
    'Σ Jᵢⱼ ZᵢZⱼ', '[x̂, p̂] = iħ', 'Ω(t)', 'Δ', 'η', '∇θ L'
  ];
  var GATES = ['H', 'X', 'Z', 'S', 'T', 'Y'];
  var TYPES = ['glyph', 'glyph', 'glyph', 'glyph', 'gate', 'gate', 'cnot', 'bloch', 'atom', 'lattice', 'pulse', 'junction'];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function makeItem(type) {
    var small = W < 700;
    var depth = rand(0.15, 0.6);                 // parallax factor
    var it = {
      type: type, x: rand(0, W), y: rand(0, H), depth: depth,
      vx: rand(-9, 9), vy: rand(-8, 8), rot: rand(-0.4, 0.4), vrot: rand(-0.05, 0.05),
      phase: rand(0, 6.28), alpha: rand(0.1, 0.2) + depth * 0.1, accent: Math.random() < 0.2,
      s: (small ? 0.8 : 1) * rand(0.85, 1.25)
    };
    if (type === 'glyph') { it.text = pick(GLYPHS); it.size = it.text.length > 8 ? rand(15, 20) : rand(22, 38); it.rot = rand(-0.25, 0.25); it.vrot = rand(-0.02, 0.02); }
    if (type === 'gate') { it.text = pick(GATES); it.size = rand(30, 40); it.vrot = rand(-0.02, 0.02); }
    if (type === 'cnot') it.size = rand(34, 44);
    if (type === 'bloch') { it.size = rand(46, 64); it.theta = rand(0.5, 2.6); it.vphi = rand(0.3, 0.7) * (Math.random() < 0.5 ? -1 : 1); it.rot = 0; it.vrot = 0; }
    if (type === 'atom') { it.size = rand(46, 66); it.vrot = rand(-0.05, 0.05); }
    if (type === 'lattice') { it.cols = pick([3, 4]); it.rows = pick([2, 3]); it.gap = rand(20, 26); it.vrot = rand(-0.03, 0.03); }
    if (type === 'pulse') { it.size = rand(90, 130); it.rot = rand(-0.3, 0.3); it.vrot = 0; }
    if (type === 'junction') { it.size = rand(26, 34); it.vrot = rand(-0.03, 0.03); }
    return it;
  }

  function targetCount() {
    var area = W * H;
    if (W < 700) return Math.max(10, Math.min(16, Math.round(area / 34000)));
    return Math.max(22, Math.min(44, Math.round(area / 44000)));
  }

  function populate() {
    var n = targetCount();
    while (items.length > n) items.pop();
    while (items.length < n) {
      // keep a balanced mix: cycle through the type list
      items.push(makeItem(TYPES[items.length % TYPES.length]));
    }
  }

  /* ---------- drawing ---------- */
  function setColor(it, extra) {
    ctx.globalAlpha = Math.min(0.5, it.alpha * (extra || 1) * (colors.dark ? 1.02 : 1));
    var c = it.accent ? colors.accent : colors.ink;
    ctx.strokeStyle = c; ctx.fillStyle = c;
  }

  function drawGlyph(it) {
    ctx.font = 'italic ' + it.size + 'px "Source Serif 4", "Iowan Old Style", Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(it.text, 0, 0);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function drawGate(it) {
    var s = it.size;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-s * 1.1, 0); ctx.lineTo(-s / 2, 0); ctx.moveTo(s / 2, 0); ctx.lineTo(s * 1.1, 0); ctx.stroke(); // wire
    roundRect(-s / 2, -s / 2, s, s, 5); ctx.stroke();
    ctx.font = '600 ' + (s * 0.55) + 'px "Source Serif 4", Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.text, 0, 1);
  }

  function drawCnot(it) {
    var s = it.size, r = s * 0.32;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-s * 0.7, -s * 0.6); ctx.lineTo(s * 0.7, -s * 0.6); ctx.moveTo(-s * 0.7, s * 0.6); ctx.lineTo(s * 0.7, s * 0.6);
    ctx.moveTo(0, -s * 0.6); ctx.lineTo(0, s * 0.6 + r); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -s * 0.6, 3.4, 0, 6.283); ctx.fill();                 // control
    ctx.beginPath(); ctx.arc(0, s * 0.6, r, 0, 6.283); ctx.stroke();                  // target ⊕
    ctx.beginPath(); ctx.moveTo(-r, s * 0.6); ctx.lineTo(r, s * 0.6); ctx.stroke();
  }

  function drawBloch(it, t) {
    var r = it.size, tilt = 0.4;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
    ctx.save(); ctx.globalAlpha *= 0.7;
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * Math.sin(tilt), 0, 0, 6.283); ctx.stroke();   // equator
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.38, r, 0, 0, 6.283); ctx.stroke();            // meridian
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(0, -r * 1.15); ctx.lineTo(0, r * 1.15); ctx.stroke(); ctx.restore();
    var phi = it.phase + t * it.vphi, th = it.theta;
    var X = Math.sin(th) * Math.cos(phi), Y = Math.sin(th) * Math.sin(phi), Z = Math.cos(th);
    var px = r * X, py = -r * (Z * Math.cos(tilt) + Y * Math.sin(tilt));
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 3.6, 0, 6.283); ctx.fill();
    ctx.font = 'italic ' + (r * 0.3) + 'px "Source Serif 4", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('|0⟩', 0, -r * 1.35); ctx.fillText('|1⟩', 0, r * 1.5);
  }

  function drawAtom(it, t) {
    var r = it.size;
    ctx.lineWidth = 1.1;
    for (var k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.36, k * 1.047, 0, 6.283); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.283); ctx.fill();                      // nucleus
    var a = it.phase + t * 0.9, ex = r * Math.cos(a), ey = r * 0.36 * Math.sin(a);
    ctx.beginPath(); ctx.arc(ex, ey, 3, 0, 6.283); ctx.fill();                    // electron
    ctx.save(); ctx.globalAlpha *= 0.55; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.45, 0, 6.283); ctx.stroke(); ctx.restore(); // Rydberg shell
  }

  function drawLattice(it, t) {
    var g = it.gap, w = (it.cols - 1) * g, h = (it.rows - 1) * g;
    ctx.lineWidth = 1;
    for (var i = 0; i < it.cols; i++) for (var j = 0; j < it.rows; j++) {
      var x = i * g - w / 2, y = j * g - h / 2;
      if (i + 1 < it.cols) { ctx.save(); ctx.globalAlpha *= 0.6 + 0.4 * Math.sin(t * 1.2 + i + j); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + g, y); ctx.stroke(); ctx.restore(); }
      if (j + 1 < it.rows) { ctx.save(); ctx.globalAlpha *= 0.6 + 0.4 * Math.cos(t * 1.2 + i - j); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + g); ctx.stroke(); ctx.restore(); }
    }
    for (i = 0; i < it.cols; i++) for (j = 0; j < it.rows; j++) {
      var on = Math.sin(t * 1.4 + i * 1.7 + j * 2.3) > 0.2;
      ctx.beginPath(); ctx.arc(i * g - w / 2, j * g - h / 2, on ? 4 : 2.6, 0, 6.283); on ? ctx.fill() : ctx.stroke();
    }
  }

  function drawPulse(it, t) {
    var w = it.size, a = w * 0.22, sg = w * 0.16, k = 0.42;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.save(); ctx.globalAlpha *= 0.5; ctx.stroke(); ctx.restore();
    ctx.beginPath();
    for (var x = -w / 2; x <= w / 2; x += 2) {
      var env = Math.exp(-Math.pow((x - Math.sin(t * 0.4 + it.phase) * w * 0.12) / sg, 2));
      var y = -a * env * Math.cos(k * x);
      if (x === -w / 2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawJunction(it) {
    var s = it.size;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-s * 1.5, 0); ctx.lineTo(-s / 2, 0); ctx.moveTo(s / 2, 0); ctx.lineTo(s * 1.5, 0); ctx.stroke();
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.beginPath(); ctx.moveTo(-s / 2, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.moveTo(s / 2, -s / 2); ctx.lineTo(-s / 2, s / 2); ctx.stroke(); // Josephson ✕
  }

  var DRAW = { glyph: drawGlyph, gate: drawGate, cnot: drawCnot, bloch: drawBloch, atom: drawAtom, lattice: drawLattice, pulse: drawPulse, junction: drawJunction };

  function screenY(it, margin) {
    var span = H + margin * 2;
    return ((it.y - scrollY * it.depth) % span + span) % span - margin;
  }

  function render(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var pos = [];
    for (var i = 0; i < items.length; i++) { var it = items[i]; pos.push({ it: it, x: it.x, y: screenY(it, 90) }); }

    // entanglement curves between items that are near the pointer
    if (mouse.active) {
      var near = pos.filter(function (p) { var dx = p.x - mouse.x, dy = p.y - mouse.y; return dx * dx + dy * dy < 190 * 190; });
      ctx.lineWidth = 1.2; ctx.strokeStyle = colors.accent;
      for (var a = 0; a < near.length; a++) {
        var d0 = Math.hypot(near[a].x - mouse.x, near[a].y - mouse.y);
        ctx.globalAlpha = (colors.dark ? 0.28 : 0.26) * (1 - d0 / 190);
        ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(near[a].x, near[a].y); ctx.stroke();
        for (var b = a + 1; b < near.length; b++) {
          var d = Math.hypot(near[a].x - near[b].x, near[a].y - near[b].y);
          if (d > 240) continue;
          ctx.globalAlpha = (colors.dark ? 0.24 : 0.22) * (1 - d / 240);
          var mx = (near[a].x + near[b].x) / 2 + Math.sin(t * 2 + a + b) * 12, my = (near[a].y + near[b].y) / 2 + Math.cos(t * 2 + a * b) * 12;
          ctx.beginPath(); ctx.moveTo(near[a].x, near[a].y); ctx.quadraticCurveTo(mx, my, near[b].x, near[b].y); ctx.stroke();
        }
      }
    }

    // items
    for (i = 0; i < pos.length; i++) {
      var p = pos[i]; it = p.it;
      if (p.y < -90 || p.y > H + 90) continue;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(it.rot); ctx.scale(it.s, it.s);
      var boost = 1;
      if (mouse.active) { var dm = Math.hypot(p.x - mouse.x, p.y - mouse.y); if (dm < 190) boost = 1 + (1 - dm / 190) * 1.6; }
      setColor(it, boost);
      DRAW[it.type](it, t);
      ctx.restore();
    }

    // measurement ripples
    for (i = 0; i < ripples.length; i++) {
      var rp = ripples[i], k = rp.age / 1.1;
      ctx.globalAlpha = (colors.dark ? 0.32 : 0.3) * (1 - k); ctx.strokeStyle = colors.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, 14 + k * 170, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- simulation ---------- */
  function step(dt) {
    var R = 150;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vrot * dt;
      if (mouse.active) {
        var sy = screenY(it, 90), dx = it.x - mouse.x, dy = sy - mouse.y, d = Math.hypot(dx, dy);
        if (d < R && d > 1) { var f = (1 - d / R) * 70 * dt; it.x += dx / d * f; it.y += dy / d * f; }
      }
      for (var r = 0; r < ripples.length; r++) {
        var rp = ripples[r], sy2 = screenY(it, 90), rx = it.x - rp.x, ry = sy2 - rp.y, rd = Math.hypot(rx, ry), front = 14 + (rp.age / 1.1) * 170;
        if (Math.abs(rd - front) < 22 && rd > 1) { it.x += rx / rd * 90 * dt; it.y += ry / rd * 90 * dt; }
      }
      if (it.x < -100) it.x = W + 100; else if (it.x > W + 100) it.x = -100;
    }
    for (i = ripples.length - 1; i >= 0; i--) { ripples[i].age += dt; if (ripples[i].age > 1.1) ripples.splice(i, 1); }
  }

  function loop(ts) {
    if (!running) return;
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    step(dt);
    render(ts / 1000);
    raf = requestAnimationFrame(loop);
  }

  function start() { if (running || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function drawStatic() { ripples.length = 0; render(2.4); }

  /* ---------- setup ---------- */
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    colors.ink = cs.getPropertyValue('--navy-2').trim() || colors.ink;
    colors.accent = cs.getPropertyValue('--accent').trim() || colors.accent;
    var bg = (cs.getPropertyValue('--bg') || '').trim().toLowerCase();
    colors.dark = /^#(0|1)[0-9a-f]/.test(bg);
    if (!animate) drawStatic();
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    W = w; H = h;
    populate();
    if (!animate) drawStatic();
  }

  function addButton(cls, icon, onLabel, offLabel, getState, onClick) {
    var theme = document.querySelector('.theme-toggle');
    if (!theme) return null;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'icon-btn bg-toggle ' + cls;
    b.innerHTML = '<svg class="icon" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#i-' + icon + '"></use></svg>';
    b.sync = function () {
      var on = getState(), label = on ? onLabel : offLabel;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', label);
      b.title = label;
      b.classList.toggle('off', !on);
    };
    b.addEventListener('click', function () { onClick(); b.sync(); });
    b.sync();
    theme.parentNode.insertBefore(b, theme);
    return b;
  }

  function makeToggle() {
    var interactBtn;
    function syncInteract() {
      if (!interactBtn) return;
      interactBtn.sync();
      interactBtn.disabled = !animate;
      if (!animate) interactBtn.title = 'Play the background animation to use interactions';
    }
    addButton('bg-anim-btn', 'atom', 'Pause background animation', 'Play background animation',
      function () { return animate; },
      function () {
        animate = !animate;
        try { localStorage.setItem(KEY, animate ? 'on' : 'off'); } catch (e) { /* ignore */ }
        if (animate) start(); else { stop(); mouse.active = false; drawStatic(); }
        syncInteract();
      });
    interactBtn = addButton('bg-interact-btn', 'network', 'Turn background interactions off', 'Turn background interactions on',
      function () { return interactive; },
      function () {
        interactive = !interactive;
        try { localStorage.setItem(KEY2, interactive ? 'on' : 'off'); } catch (e) { /* ignore */ }
        if (!interactive) { mouse.active = false; ripples.length = 0; }
      });
    syncInteract();
  }

  function init() {
    canvas = document.createElement('canvas');
    canvas.className = 'bg-canvas'; canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    resize(); readColors(); makeToggle();

    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    window.addEventListener('scroll', function () { scrollY = window.scrollY || 0; if (!animate) drawStatic(); }, { passive: true });
    window.addEventListener('pointermove', function (e) { if (!interactive) return; mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
    window.addEventListener('pointerleave', function () { mouse.active = false; });
    document.addEventListener('mouseleave', function () { mouse.active = false; });
    window.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') mouse.active = false; }, { passive: true });
    window.addEventListener('pointerdown', function (e) { if (animate && interactive) ripples.push({ x: e.clientX, y: e.clientY, age: 0 }); }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (animate) start(); });
    new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      var dm = window.matchMedia('(prefers-color-scheme: dark)');
      if (dm.addEventListener) dm.addEventListener('change', readColors);
    }
    if (animate) start(); else drawStatic();
  }

  function boot() { (window.requestIdleCallback || function (f) { setTimeout(f, 60); })(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
