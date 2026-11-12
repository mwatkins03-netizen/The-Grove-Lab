/* Understory Paint — a crayon engine, the Grove through the seasons, and stylised campus landmarks.
   No dependencies; runs in the browser and in Node.

   Everything is painted as strokes into indexed-colour sheets (one palette number per pixel). The same stroke list
   can be replayed slowly on screen, split across depth layers (far / middle / near), or written out as an animated GIF.

   Browser
     const s = UnderstoryPaint.stage(div, { subject: 'lyceum', season: 'fall' });   // layered: depth of field, drifting leaves
     s.set({ season: 'winter' })  s.focus('far')  s.tempo('slow')  s.pause(true)  s.finish()  s.plant(0.4)  s.png()  s.gif()
     const m = UnderstoryPaint.mount(canvas, { subject: 'catalpa', season: 'spring' });  // one flat canvas
     UnderstoryPaint.swash(canvas, { color: 'persimmon' })                               // one paint stroke
   Node
     UnderstoryPaint.renderGif({ w: 480, h: 300, subject: 'grove', season: 'fall', drift: 60 })  -> Uint8Array

   subjects: grove, catalpa, lyceum, ventress, barnard, walk      seasons: spring, summer, fall, winter */
(function (root) {
  const NAMES = ['paper', 'deep', 'ink', 'pine', 'moss', 'creek', 'mist', 'dusk', 'wisteria', 'persimmon', 'goldenrod',
    'sprout', 'redbud', 'oxblood', 'straw', 'brick', 'white', 'red'];
  const HEX = ['#F4EFE3', '#E6DCC8', '#1E1B18', '#1F4A3C', '#4E8B57', '#2F8F8A', '#A9D3DD', '#26355C', '#8C7BD1', '#E2582B', '#E9A72B',
    '#9BC46A', '#D96C8E', '#4A1410', '#EFD27A', '#B5301C', '#FFFDF7', '#CE1126'];
  const K = {}; NAMES.forEach((n, i) => K[n] = i);
  const CLEAR = 31; // transparent slot: empty layers, GIF frame differences, erasing

  // b = building colours (wall, trim, roof, glass); near = foreground silhouette; prop = the catalpa's supports
  const SEASONS = {
    spring: { bg: 'mist', ground: ['sprout', 'moss'], trunk: 'dusk', leaf: ['sprout', 'moss', 'sprout'], bloom: ['white', 'redbud', 'wisteria'], near: 'dusk', prop: 'ink', b: ['brick', 'white', 'dusk', 'dusk'] },
    summer: { bg: 'pine', ground: ['moss', 'creek'], trunk: 'paper', leaf: ['moss', 'creek', 'moss'], fleck: 'sprout', near: 'ink', prop: 'mist', b: ['brick', 'paper', 'ink', 'straw'] },
    fall:   { bg: 'oxblood', ground: ['brick', 'persimmon'], trunk: 'straw', leaf: ['persimmon', 'goldenrod', 'brick', 'persimmon', 'straw'], near: 'ink', prop: 'mist', b: ['persimmon', 'straw', 'ink', 'ink'] },
    winter: { bg: 'dusk', ground: ['white', 'mist'], trunk: 'paper', leaf: ['straw', 'brick'], near: 'ink', prop: 'mist', b: ['brick', 'white', 'white', 'straw'] }
  };
  const ORDER = ['spring', 'summer', 'fall', 'winter'];
  const SUBJECTS = {
    grove: { name: 'The Grove' }, catalpa: { name: 'The catalpa' },
    lyceum: { name: 'The Lyceum', w: .46 }, ventress: { name: 'Ventress Hall', w: .36 }, barnard: { name: 'Barnard Observatory', w: .5 }, walk: { name: 'Walk of Champions', w: .26 }
  };
  // crown half-width, half-height and centre height (as shares of tree height), trunk radius, taper, lean
  const SPECIES = {
    oak:      { rx: .5,  ry: .34, cy: .64, trunk: .03,  exp: .62, lean: .25, n: 230, top: .55 },
    elm:      { rx: .4,  ry: .4,  cy: .62, trunk: .026, exp: .6,  lean: .12, n: 220, top: .75, vase: true },
    magnolia: { rx: .3,  ry: .42, cy: .5,  trunk: .028, exp: .6,  lean: .08, n: 200, top: .8,  evergreen: true },
    catalpa:  { rx: .78, ry: .36, cy: .5,  trunk: .05,  exp: .64, lean: .5,  n: 460, top: .7,  gnarl: .6, big: true }
  };
  function seasonNow(d) { const m = (d || new Date()).getMonth(); return m < 2 || m === 11 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'fall'; }

  function hash(str) { let h = 2166136261; str = String(str); for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function grit(x, y) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  /* ---------- the sheet: paper with a tooth; crayon only lands where the tooth lets it ---------- */
  function Sheet(w, h, fill, tooth) {
    this.w = w; this.h = h; this.px = new Uint8Array(w * h).fill(fill == null ? 0 : fill);
    if (tooth) { this.tooth = tooth; return; }
    const T = this.tooth = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) T[y * w + x] = .62 * grit(x, y) + .38 * grit(x >> 1, (y >> 1) + 7919);
  }
  Sheet.prototype.dab = function (x, y, r, c, p) {
    const w = this.w, h = this.h, px = this.px, T = this.tooth, r2 = r * r;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(w - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(h - 1, Math.ceil(y + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const d2 = (xx - x) * (xx - x) + (yy - y) * (yy - y); if (d2 > r2) continue;
      const i = yy * w + xx; if (T[i] < p * Math.min(1, (1 - d2 / r2) * 2.2 + .08)) px[i] = c;
    }
  };
  // op = [x0, y0, x1, y1, r0, r1, colour, pressure, layer]
  Sheet.prototype.op = function (o) {
    const dx = o[2] - o[0], dy = o[3] - o[1], d = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(d / Math.max(.8, (o[4] + o[5]) * .22)));
    for (let i = 0; i <= n; i++) { const t = d ? i / n : 0; this.dab(o[0] + dx * t, o[1] + dy * t, Math.max(.7, o[4] + (o[5] - o[4]) * t), o[6], o[7]); if (!d) break; }
  };

  /* ---------- strokes ---------- */
  function wipe(w, h, c, y0, y1, R, r) { // broad strokes that cover a band, alternating direction like a hand colouring in
    const ops = []; let row = 0;
    for (let y = y0 + R * .5; y < y1 + R; y += R * 1.2, row++) {
      const seg = [], ph = r() * 6;
      for (let x = -R; x < w + R; x += 36) seg.push([x, y + Math.sin(x / 140 + ph) * R * .25, x + 36, y + Math.sin((x + 36) / 140 + ph) * R * .25, R, R, c, 1.25]);
      if (row % 2) seg.reverse(); for (const s of seg) ops.push(s);
    }
    return ops;
  }
  function hatch(pts, c, sp, p) { // fill a polygon with rows of crayon, bottom row first
    let y0 = Infinity, y1 = -Infinity; for (const q of pts) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    const ops = [];
    for (let y = y1 - sp * .5; y > y0 - sp * .5; y -= sp) {
      const yy = Math.min(y1 - .01, Math.max(y0 + .01, y)), xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) { let a = xs[i] + sp * .4, b = xs[i + 1] - sp * .4; if (b < a) a = b = (xs[i] + xs[i + 1]) / 2; ops.push([a, yy, b, yy, sp * .62, sp * .62, c, p]); }
    }
    return ops;
  }

  /* ---------- trees: branches grow toward points scattered through the crown ---------- */
  function buildTree(r, x, gy, H, sp, lite) {
    const cy = gy - H * sp.cy, rx = H * sp.rx, ry = H * sp.ry, step = H * .036, A = [], want = lite ? 80 : sp.n;
    let guard = 0;
    while (A.length < want && guard++ < 4000) {
      const a = r() * 6.283, q = Math.sqrt(r()), px = x + Math.cos(a) * rx * q, py = cy + Math.sin(a) * ry * q * (Math.sin(a) > 0 && !sp.big ? .7 : 1);
      if (sp.vase && Math.abs(px - x) > rx * (.25 + .75 * (cy + ry - py) / (2 * ry))) continue;
      A.push([px, py]);
    }
    const N = [{ x: x, y: gy + 4, p: -1 }]; let lean = (r() - .5) * sp.lean, tx = x, ty = gy + 4;
    while (ty > cy + ry * sp.top) { ty -= step; tx += lean * step + (r() - .5) * step * (sp.gnarl ? .9 : .3); N.push({ x: tx, y: ty, p: N.length - 1 }); }
    const di = H * .3, dk = step * 1.5, seen = new Set(), jig = sp.gnarl || .35, cap = sp.big ? 1500 : 900;
    for (let it = 0; it < (sp.big ? 95 : 70) && A.length && N.length < cap; it++) {
      const acc = new Map();
      for (let ai = A.length - 1; ai >= 0; ai--) {
        const a = A[ai]; let best = -1, bd = di * di;
        for (let ni = 0; ni < N.length; ni++) { const n = N[ni], dx = a[0] - n.x, dy = a[1] - n.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = ni; } }
        if (best < 0) continue;
        if (bd < dk * dk) { A.splice(ai, 1); continue; }
        const n = N[best], d = Math.sqrt(bd); let v = acc.get(best); if (!v) { v = [0, 0, 1e9, 0, 0]; acc.set(best, v); }
        v[0] += (a[0] - n.x) / d; v[1] += (a[1] - n.y) / d;
        if (d < v[2]) { v[2] = d; v[3] = (a[0] - n.x) / d; v[4] = (a[1] - n.y) / d; }
      }
      acc.forEach((v, ni) => {
        const n = N[ni]; let l = Math.hypot(v[0], v[1]) || 1, dx = v[0] / l + (r() - .5) * jig, dy = v[1] / l + (r() - .5) * jig - .08; l = Math.hypot(dx, dy);
        let nx = n.x + dx / l * step, ny = n.y + dy / l * step, k = ((nx / (step * .6)) | 0) + ',' + ((ny / (step * .6)) | 0);
        if (seen.has(k)) { // the pull from both sides cancels out: branch toward the single nearest point instead
          nx = n.x + v[3] * step; ny = n.y + v[4] * step; k = ((nx / (step * .6)) | 0) + ',' + ((ny / (step * .6)) | 0); if (seen.has(k)) return;
        }
        seen.add(k); N.push({ x: nx, y: ny, p: ni });
      });
    }
    const wt = new Float32Array(N.length);
    for (let i = N.length - 1; i > 0; i--) { if (!wt[i]) wt[i] = 1; wt[N[i].p] += wt[i]; }
    const base = H * sp.trunk, tip = Math.max(.9, H * .0035), rad = i => tip + (base - tip) * Math.pow(wt[i] / wt[0], sp.exp);
    return { N, wt, rad, x, gy, H, cy, rx, ry };
  }

  function treeOps(seed, x, gy, H, season, opt) {
    opt = opt || {}; const sp = SPECIES[opt.species || 'oak'], r = rng(hash(seed)), T = buildTree(r, x, gy, H, sp, opt.lite), S = SEASONS[season];
    const s = .4 + .6 * H / 400, ops = [], N = T.N, lite = opt.lite;
    const pick = a => K[a[Math.floor(r() * a.length)]], jit = v => (r() - .5) * 2 * v;
    const dot = (x, y, R, c, p) => ops.push([x, y, x, y, R, R, c, p || 1.1]);
    const leaf = (x, y, c, R, L) => { const a = r() * 6.283; ops.push([x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, R, .7, c, 1.05]); };
    const tick = (x, y, L) => { const a = -1.2 + jit(.5); ops.push([x - Math.cos(a) * L, y - Math.sin(a) * L, x + Math.cos(a) * L, y + Math.sin(a) * L, 1.1 * Math.max(1, s), .8, K.ink, .95]); };
    const heart = (x, y, c, R) => { dot(x - R * .55, y, R, c, 1.05); dot(x + R * .55, y, R, c, 1.05); ops.push([x, y + R * .3, x, y + R * 2, R * .9, .7, c, 1.05]); };
    const snowOnLimbs = () => { for (let i = 1; i < N.length; i++) if (T.wt[i] > 2 && T.wt[i] < 60 && r() < .32) { const n = N[i]; dot(n.x, n.y - T.rad(i) - 1, 2.3 * s, K.white, 1); } };
    const falling = (cols, R) => { if (lite) return; for (let i = 0; i < 12; i++) leaf(x + jit(T.rx * 1.1), gy + 4 + r() * 14 * s, pick(cols), R, 6 * s); };

    ops.push([x - H * sp.trunk * 1.7, gy + 5, x + H * sp.trunk * 1.7, gy + 5, H * .012, H * .012, K[S.trunk], .9]); // root flare
    for (let i = 1; i < N.length; i++) { const n = N[i], p = N[n.p]; ops.push([p.x, p.y, n.x, n.y, T.rad(n.p), T.rad(i), K[S.trunk], 1.1]); }
    if (sp.big && !lite) { // the catalpa's long low limbs rest on supports
      for (const side of [-1, 1]) { let best = -1; for (let i = 1; i < N.length; i++) if (T.wt[i] > 2 && (N[i].x - x) * side > H * .3 && (best < 0 || N[i].y > N[best].y)) best = i;
        if (best > 0) { const n = N[best], q = T.rad(best); ops.push([n.x, n.y + q, n.x, gy + 5, 1.2 * s, 1.2 * s, K[S.prop], 1.1], [n.x - 5 * s, n.y + q + 1, n.x + 5 * s, n.y + q + 1, 1.2 * s, 1.2 * s, K[S.prop], 1.1]); } }
    }
    const sites = [], twig = sp.big ? 5 : 2; for (let i = 1; i < N.length; i++) if (T.wt[i] <= twig) sites.push(N[i]);

    if (sp.evergreen) { // magnolia: green all year, white flowers in summer, snow in winter
      const greens = S.bg === 'pine' ? ['moss', 'creek'] : ['pine', 'moss'];
      for (const n of sites) { const bx = n.x + jit(8 * s), by = n.y + jit(8 * s), R = (12 + r() * 9) * s; dot(bx, by, R, pick(greens), .86); if (season === 'winter' && r() < .5) dot(bx, by - R * .55, R * .45, K.white, .9); }
      for (const n of sites) { if (r() < .4) leaf(n.x + jit(12 * s), n.y + jit(12 * s), K[r() < .5 ? 'sprout' : 'moss'], 2.6 * s, 8 * s);
        if (r() < (season === 'summer' ? .16 : season === 'spring' ? .06 : 0)) { const bx = n.x + jit(10 * s), by = n.y + jit(10 * s); dot(bx, by, 5 * s, K.white, 1.2); dot(bx, by, 1.8 * s, K.straw, 1.3); } }
    } else if (sp.big) { // catalpa: heart-shaped leaves, white flower clusters in spring, long pods in fall and winter
      const pod = n => ops.push([n.x, n.y, n.x + jit(2 * s), n.y + (12 + r() * 12) * s, 1.4 * s, .8, K[S.trunk], 1.05]);
      if (season === 'spring') for (const n of sites) {
        if (r() < .7) heart(n.x + jit(7 * s), n.y + jit(7 * s), pick(S.leaf), 3.3 * s);
        if (r() < .42) { const bx = n.x + jit(8 * s), by = n.y - 4 * s; for (let k = 0; k < 5; k++) dot(bx + jit(3.5 * s) * (1 - k / 6), by - k * 2.6 * s, (2.6 - k * .25) * s, K.white, 1.2); dot(bx, by - 3 * s, 1.1 * s, K.wisteria, 1.3); }
      }
      if (season === 'summer') { for (const n of sites) dot(n.x + jit(10 * s), n.y + jit(10 * s), (15 + r() * 10) * s, pick(S.leaf), .8);
        for (const n of sites) { heart(n.x + jit(13 * s), n.y + jit(13 * s), K.sprout, 3.4 * s); if (r() < .35) tick(n.x + jit(12 * s), n.y + jit(12 * s), 6 * s); } }
      if (season === 'fall') { for (const n of sites) { heart(n.x + jit(9 * s), n.y + jit(9 * s), K[['straw', 'goldenrod', 'goldenrod', 'sprout'][Math.floor(r() * 4)]], 3.5 * s); if (r() < .5) heart(n.x + jit(13 * s), n.y + jit(13 * s), K.goldenrod, 3 * s); if (r() < .3) pod(n); }
        falling(['goldenrod', 'straw'], 3 * s); }
      if (season === 'winter') { for (const n of sites) if (r() < .4) pod(n); snowOnLimbs(); }
    } else {
      if (season === 'spring') for (const n of sites) {
        if (r() < .8) leaf(n.x + jit(6 * s), n.y + jit(6 * s), pick(S.leaf), 2.8 * s, 8 * s);
        if (r() < .34) { const bx = n.x + jit(8 * s), by = n.y + jit(8 * s); dot(bx, by, 4.6 * s, pick(S.bloom), 1.2); dot(bx, by, 1.7 * s, K.goldenrod, 1.3); }
      }
      if (season === 'summer') {
        for (const n of sites) dot(n.x + jit(10 * s), n.y + jit(10 * s), (15 + r() * 11) * s, pick(S.leaf), .78);
        for (const n of sites) { leaf(n.x + jit(14 * s), n.y + jit(14 * s), K[S.fleck], 3 * s, 9 * s); if (r() < .4) tick(n.x + jit(12 * s), n.y + jit(12 * s), 6 * s); }
      }
      if (season === 'fall') {
        for (const n of sites) { leaf(n.x + jit(9 * s), n.y + jit(9 * s), pick(S.leaf), 3.6 * s, 9 * s); leaf(n.x + jit(12 * s), n.y + jit(12 * s), pick(S.leaf), 3 * s, 7 * s); leaf(n.x + jit(15 * s), n.y + jit(15 * s), pick(S.leaf), 3.2 * s, 8 * s); if (r() < .28) tick(n.x + jit(8 * s), n.y + jit(8 * s), 5 * s); }
        falling(S.leaf, 2.6 * s);
      }
      if (season === 'winter') { snowOnLimbs(); for (const n of sites) if (r() < .08) leaf(n.x, n.y, pick(S.leaf), 2.6 * s, 6 * s); }
    }
    if (opt.mono != null) for (const o of ops) o[6] = opt.mono;
    return { ops, crown: { x: x, y: T.cy, rx: T.rx, ry: T.ry } };
  }

  /* ---------- campus landmarks, drawn in unit space: x 0..1 across the width, y up from the ground in widths ---------- */
  function building(kind, cx, base, W, S) {
    const B = { wall: S.b[0], trim: S.b[1], roof: S.b[2], glass: S.b[3] }, ops = [], X = u => cx + (u - .5) * W, Y = v => base - v * W, sp = Math.max(1.8, W * .008), fine = Math.max(1.3, sp * .6);
    const poly = (pts, c, s) => { for (const o of hatch(pts.map(q => [X(q[0]), Y(q[1])]), K[c], s || sp, 1.08)) ops.push(o); };
    const rect = (x0, y0, x1, y1, c, s) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c, s);
    const dome = (x, y, rx, ry, c, s) => { const pts = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * i / 14; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } poly(pts, c, s); };
    const win = (x, y, ww, hh, arch, c) => { rect(x - ww / 2, y, x + ww / 2, y + hh, c || B.glass, fine); if (arch) dome(x, y + hh, ww / 2, ww / 2, c || B.glass, fine); };
    const line = (x0, y0, x1, y1, c, R) => ops.push([X(x0), Y(y0), X(x1), Y(y1), R || 1.3, R || 1.3, K[c], 1.1]);
    const circ = (x, y, R, c) => ops.push([X(x), Y(y), X(x), Y(y), R * W, R * W, K[c], 1.2]);

    if (kind === 'lyceum') { // brick block, low wings, six tall white columns, a clock in the pediment
      rect(0, 0, .2, .2, B.wall); rect(.8, 0, 1, .2, B.wall); rect(.2, 0, .8, .3, B.wall);
      poly([[-.01, .2], [.2, .2], [.2, .225], [.02, .225]], B.roof); poly([[.8, .2], [1.01, .2], [.98, .225], [.8, .225]], B.roof);
      poly([[.19, .3], [.81, .3], [.75, .345], [.25, .345]], B.roof);
      for (const x of [.05, .1, .15, .85, .9, .95]) for (const y of [.03, .115]) win(x, y, .022, .05);
      for (const x of [.235, .285, .715, .765]) for (const y of [.04, .17]) win(x, y, .024, .07);
      for (const x of [.36, .43, .57, .64]) for (const y of [.05, .17]) win(x, y, .022, .065);
      win(.5, .02, .034, .1, true, B.roof);
      rect(.3, 0, .7, .02, B.trim);
      for (let i = 0; i < 6; i++) { const x = .325 + i * .07; rect(x - .011, .02, x + .011, .295, B.trim, fine); rect(x - .018, .282, x + .018, .297, B.trim, fine); }
      rect(.3, .297, .7, .33, B.trim); poly([[.29, .33], [.71, .33], [.5, .425]], B.trim);
      line(.29, .33, .5, .425, B.roof); line(.5, .425, .71, .33, B.roof); line(.29, .33, .71, .33, B.roof);
      circ(.5, .363, .019, B.glass); circ(.5, .363, .005, B.trim);
    }
    if (kind === 'ventress') { // steep roofs, a front gable with stained glass, a round tower with a cone on it
      rect(.08, 0, .7, .3, B.wall); poly([[.06, .3], [.72, .3], [.6, .47], [.2, .47]], B.roof);
      rect(.1, .3, .145, .52, B.wall); rect(.09, .52, .155, .535, B.trim);
      rect(.28, 0, .52, .36, B.wall); poly([[.26, .36], [.54, .36], [.4, .56]], B.wall);
      line(.26, .36, .4, .56, B.trim, 1.6); line(.4, .56, .54, .36, B.trim, 1.6);
      win(.4, .19, .085, .11, true, 'goldenrod'); win(.4, .205, .04, .085, true, 'wisteria'); circ(.4, .44, .014, 'goldenrod');
      win(.4, 0, .05, .09, true, B.roof);
      rect(.66, 0, .8, .52, B.wall); poly([[.635, .52], [.825, .52], [.73, .82]], B.roof); line(.73, .82, .73, .88, B.roof, 1.2);
      rect(.655, .3, .805, .315, B.trim); rect(.655, .5, .805, .52, B.trim); rect(.08, .295, .66, .306, B.trim, fine);
      for (const y of [.06, .19, .37]) win(.73, y, .03, .07, true);
      for (const x of [.14, .21, .59]) for (const y of [.05, .18]) win(x, y, .03, .07, true);
    }
    if (kind === 'barnard') { // long and low, with one large dome in the middle and a small one at each end
      rect(.16, 0, .84, .16, B.wall); rect(.16, .16, .84, .175, B.roof);
      rect(.03, 0, .19, .24, B.wall); rect(.81, 0, .97, .24, B.wall); rect(.36, 0, .64, .26, B.wall);
      rect(.43, .26, .57, .32, B.trim); dome(.5, .32, .08, .095, B.trim); line(.5, .32, .5, .412, B.roof, 1.4);
      rect(.07, .24, .15, .27, B.trim); dome(.11, .27, .045, .055, B.trim); rect(.85, .24, .93, .27, B.trim); dome(.89, .27, .045, .055, B.trim);
      line(.11, .27, .11, .322, B.roof, 1.1); line(.89, .27, .89, .322, B.roof, 1.1);
      for (const x of [.22, .27, .32, .68, .73, .78]) win(x, .04, .022, .08);
      for (const x of [.08, .14, .86, .92]) for (const y of [.04, .14]) win(x, y, .022, .06);
      for (const x of [.39, .61]) for (const y of [.05, .16]) win(x, y, .024, .065);
      for (const x of [.44, .48, .52, .56]) rect(x - .007, 0, x + .007, .19, B.trim, fine);
      rect(.425, .19, .575, .202, B.trim, fine); poly([[.42, .202], [.58, .202], [.5, .25]], B.trim);
      win(.5, 0, .028, .08, true, B.roof);
    }
    if (kind === 'walk') { // two brick piers and the arch between them, with a path running through
      poly([[.32, 0], [.68, 0], [.95, -.2], [.05, -.2]], B.trim);
      rect(.1, 0, .26, .5, B.wall); rect(.74, 0, .9, .5, B.wall);
      rect(.08, 0, .28, .035, B.trim); rect(.72, 0, .92, .035, B.trim); rect(.08, .5, .28, .54, B.trim); rect(.72, .5, .92, .54, B.trim);
      const band = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * i / 16; band.push([.5 + Math.cos(a) * .37, .54 + Math.sin(a) * .31]); }
      for (let i = 16; i >= 0; i--) { const a = Math.PI * i / 16; band.push([.5 + Math.cos(a) * .3, .54 + Math.sin(a) * .22]); }
      poly(band, B.trim);
      for (let i = 2; i <= 14; i++) { const a = Math.PI * i / 16; circ(.5 + Math.cos(a) * .335, .54 + Math.sin(a) * .265, .012, B.roof); }
      circ(.18, .59, .028, 'straw'); circ(.82, .59, .028, 'straw');
    }
    return ops;
  }

  function tentOps(x, gy, sz, c) {
    const ops = [];
    for (let i = 0; i <= 6; i++) { const t = i / 6, half = sz * (.12 + .88 * t), y = gy - sz * 1.15 + sz * .5 * t; ops.push([x - half, y, x + half, y, sz * .08, sz * .08, c, 1.2]); }
    ops.push([x - sz * .85, gy - sz * .6, x - sz * .85, gy + 2, 1.4, 1.4, K.white, 1.2], [x + sz * .85, gy - sz * .6, x + sz * .85, gy + 2, 1.4, 1.4, K.white, 1.2]);
    return ops;
  }

  /* ---------- a scene in three depths: 0 far (sky, distant trees, landmark), 1 middle (lawn, trees), 2 near (framing) ---------- */
  function scene(o) {
    const w = o.w, h = o.h, season = o.season, S = SEASONS[season], subject = SUBJECTS[o.subject] ? o.subject : 'grove', seed = o.seed || 'grove';
    const r = rng(hash(seed + '/' + season + '/' + subject)), hz = h * .8, gy = h * .86, ops = [], marks = [], crowns = [];
    const put = (list, layer, p) => { for (const q of list) { q[8] = layer; if (p) q[7] *= p; ops.push(q); } };
    const mark = label => marks.push({ i: ops.length, label });
    const landmark = SUBJECTS[subject].w;

    mark('The far lawn'); put(wipe(w, h, K[S.ground[0]], hz, h, h * .035, r), 0, .6);
    mark('Trees in the distance');
    const nf = o.far == null ? 7 : o.far;
    for (let i = 0; i < nf; i++) put(treeOps(seed + '/f' + i, w * (i + .5 + (r() - .5) * .6) / nf, hz + 2, h * (.26 + r() * .12), season, { species: i % 3 === 1 ? 'elm' : 'oak', lite: true }).ops, 0, .58);
    if (landmark) { mark(SUBJECTS[subject].name); put(building(subject, w * .5, hz + 2, w * landmark, S), 0); }

    mark('The lawn'); put(wipe(w, h, K[S.ground[0]], gy + h * .02, h, h * .035, r), 1);
    const fl = []; for (let i = 0; i < w / 14; i++) { const x = r() * w, y = gy + 6 + r() * (h - gy - 6); fl.push([x, y, x + 10 + r() * 22, y + (r() - .5) * 3, 2.2, 1, K[S.ground[1]], .9]); }
    if (season === 'summer') for (let i = 0; i < w / 40; i++) { const x = r() * w, y = gy + 8 + r() * (h - gy - 10); fl.push([x, y, x + 8, y, 5, 3, K.straw, .7]); }
    put(fl, 1);
    if (o.gameDay) { mark('Game-day tents'); const cs = [K.white, K.red, K.mist]; for (let i = 0; i < Math.max(4, w / 110); i++) put(tentOps(r() * w, gy + 6 + r() * 6, h * .045, cs[i % 3]), 1); }

    let list = [];
    if (subject === 'catalpa') list = [{ x: w * .5, H: h * .8, sp: 'catalpa' }];
    else if (landmark) list = [{ x: w * .06, H: h * .74, sp: 'oak' }, { x: w * .95, H: h * .7, sp: 'elm' }];
    else { const n = o.trees || 4, tr = rng(hash(seed + '/trees')), kinds = ['oak', 'elm', 'oak', 'magnolia', 'oak', 'elm', 'oak', 'magnolia'];
      for (let i = 0; i < n; i++) list.push({ x: w * (i + .5 + (tr() - .5) * .28) / n, H: h * (.56 + tr() * .2), sp: kinds[(i + Math.floor(tr() * 2)) % kinds.length] }); list.sort((a, b) => a.H - b.H); }
    const label = { oak: 'An oak', elm: 'An elm', magnolia: 'A magnolia', catalpa: 'The catalpa, limb by limb' };
    list.forEach((t, i) => { mark(label[t.sp]); const q = treeOps(seed + '/t' + i + t.sp, t.x, gy + (t.H / h - .56) * h * .16, t.H, season, { species: t.sp }); put(q.ops, 1); crowns.push(q.crown); });
    for (const e of o.extra || []) {
      if (e.kind === 'tree') { mark('A tree you planted'); const q = treeOps(e.seed, e.x * w, gy + 4, h * e.H, season, { species: e.sp }); put(q.ops, 1); crowns.push(q.crown); }
      else put([[e.a * w, e.b * h, e.c * w, e.d * h, e.r * w, e.r * w, K[e.col], 1.05]], 1);
    }
    const sky = [];
    if (season === 'winter') for (let i = 0; i < w * h / 2600; i++) { const x = r() * w, y = r() * gy, q = 1 + r() * 1.6; sky.push([x, y, x, y, q, q, K.white, 1.2]); }
    if (season === 'spring') for (let i = 0; i < w * h / 9000; i++) { const x = r() * w, y = r() * h; sky.push([x, y, x + 4, y + 2, 2, 1, K[r() < .5 ? 'white' : 'redbud'], 1]); }
    put(sky, 1);

    if (o.near !== false) { // a big tree just off the edge of the picture, and grass at the bottom edge
      mark('Up close'); const side = o.nearSide || (r() < .5 ? -1 : 1);
      put(treeOps(seed + '/near', side < 0 ? -w * .07 : w * 1.07, h * 1.04, h * 1.5, season, { species: 'oak', mono: K[S.near], lite: false }).ops, 2);
      const g = []; for (let i = 0; i < w / 16; i++) { const x = r() * w, len = h * (.015 + r() * .04); g.push([x, h + 3, x + (r() - .5) * 12, h - len, 2.6, .8, K[S.near], 1.1]); }
      put(g, 2);
    }
    marks.push({ i: ops.length, label: '' });
    return { bg: K[S.bg], ops, marks, crowns, gy };
  }
  // a painted-over transition: the new sky is brushed across, and on layered stages the layers above are rubbed out in step
  function wipeIn(o, layered) {
    const bg = K[SEASONS[o.season].bg], out = [];
    for (const q of wipe(o.w, o.h, bg, 0, o.h, o.h / 8, rng(hash((o.seed || '') + 'w' + o.season)))) { q[8] = 0; out.push(q); if (layered) for (const L of [1, 2]) { const e = q.slice(); e[6] = CLEAR; e[8] = L; out.push(e); } }
    return out;
  }

  /* ---------- drift: what keeps moving after the drawing is done (leaves, petals, snow, fireflies) ---------- */
  function Drift(season, w, h, crowns, gy, seed) { this.season = season; this.w = w; this.h = h; this.crowns = crowns; this.gy = gy; this.r = rng(hash(seed + '/drift')); this.P = []; this.k = Math.max(.5, h / 620); }
  Drift.prototype.step = function (wind) {
    const r = this.r, P = this.P, k = this.k, S = SEASONS[this.season], landed = [], cr = this.crowns; wind = wind || 0;
    const from = () => { const c = cr[(r() * cr.length) | 0]; return [c.x + (r() - .5) * 1.8 * c.rx, c.y + (r() - .5) * c.ry]; };
    if (this.season === 'fall' && cr.length && P.length < 46 && r() < .42) { const q = from(); P.push({ x: q[0], y: q[1], vy: (2 + r() * 2.4) * k, ph: r() * 6.28, a: r() * 6.28, sz: (2.4 + r() * 1.8) * k, c: K[S.leaf[(r() * S.leaf.length) | 0]], land: this.gy + 4 + r() * (this.h - this.gy - 8) }); }
    if (this.season === 'spring' && cr.length && P.length < 22 && r() < .2) { const q = from(); P.push({ x: q[0], y: q[1], vy: (1.2 + r() * 1.4) * k, ph: r() * 6.28, a: r() * 6.28, sz: (1.6 + r()) * k, c: K[r() < .55 ? 'white' : 'redbud'], land: this.gy + 4 + r() * (this.h - this.gy - 8) }); }
    if (this.season === 'winter' && P.length < 120 && r() < .95) P.push({ x: r() * this.w, y: -4, vy: (2.2 + r() * 2.6) * k, ph: r() * 6.28, a: 0, sz: (1 + r() * 1.5) * k, c: K.white, snow: true, land: this.gy + r() * (this.h - this.gy) });
    if (this.season === 'summer' && !P.length) for (let i = 0; i < 18; i++) P.push({ x: r() * this.w, y: this.h * (.42 + r() * .45), ph: r() * 6.28, fly: true, sz: 2.2 * k });
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i];
      if (p.fly) { p.ph += .1 + r() * .12; p.x += Math.cos(p.ph) * 1.4 * k + wind; p.y += Math.sin(p.ph * 1.7) * .9 * k; if (p.x < -5) p.x = this.w + 5; if (p.x > this.w + 5) p.x = -5; continue; }
      p.ph += .2; p.a += .4; p.x += Math.sin(p.ph) * (p.snow ? .7 : 1.8) * k + wind * (p.snow ? 1.4 : 1); p.y += p.vy;
      if (p.y >= p.land) { landed.push([p.x, p.y, p.x + p.sz, p.y + p.sz * .3, p.sz, p.sz * .5, p.c, 1.1]); P.splice(i, 1); }
    }
    return landed;
  };
  Drift.prototype.ops = function () {
    const out = [];
    for (const p of this.P) {
      if (p.fly) { if (Math.sin(p.ph * 2.3) > -.25) out.push([p.x, p.y, p.x, p.y, p.sz, p.sz, K.straw, 1.3]); }
      else if (p.snow) out.push([p.x, p.y, p.x, p.y, p.sz, p.sz, p.c, 1.2]);
      else out.push([p.x - Math.cos(p.a) * p.sz, p.y - Math.sin(p.a) * p.sz * .6, p.x + Math.cos(p.a) * p.sz, p.y + Math.sin(p.a) * p.sz * .6, p.sz, p.sz * .5, p.c, 1.2]);
    }
    return out;
  };

  /* ---------- animated GIF (indexed colour in, so no quantising; frames store only what changed) ---------- */
  function GifWriter(w, h) {
    const b = this.bytes = []; this.w = w; this.h = h; this.prev = null;
    const s = 'GIF89a'; for (let i = 0; i < 6; i++) b.push(s.charCodeAt(i));
    b.push(w & 255, w >> 8, h & 255, h >> 8, 0xF4, 0, 0);
    for (let i = 0; i < 32; i++) { const hx = HEX[i] || '#000000'; b.push(parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)); }
    b.push(0x21, 0xFF, 11); const ns = 'NETSCAPE2.0'; for (let i = 0; i < 11; i++) b.push(ns.charCodeAt(i)); b.push(3, 1, 0, 0, 0);
  }
  GifWriter.prototype.frame = function (px, delayCs) {
    const w = this.w, h = this.h, b = this.bytes, prev = this.prev; let x0 = 0, y0 = 0, x1 = w - 1, y1 = h - 1;
    if (prev) { x0 = w; y0 = h; x1 = -1; y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[y * w + x] !== prev[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 < 0) { x0 = y0 = x1 = y1 = 0; } }
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1, data = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const i = (y + y0) * w + x + x0; data[y * fw + x] = prev && px[i] === prev[i] ? CLEAR : px[i]; }
    b.push(0x21, 0xF9, 4, 0x05, delayCs & 255, delayCs >> 8, CLEAR, 0, 0x2C, x0 & 255, x0 >> 8, y0 & 255, y0 >> 8, fw & 255, fw >> 8, fh & 255, fh >> 8, 0, 5);
    const clear = 32, eoi = 33, out = []; let size = 6, next = 34, table = new Map(), cur = 0, bits = 0;
    const emit = c => { cur |= c << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; } };
    emit(clear); let pre = data[0];
    for (let i = 1; i < data.length; i++) {
      const k = data[i], key = (pre << 8) | k, v = table.get(key);
      if (v !== undefined) { pre = v; continue; }
      emit(pre);
      if (next === 4096) { emit(clear); next = 34; size = 6; table = new Map(); } else { if (next >= (1 << size)) size++; table.set(key, next++); }
      pre = k;
    }
    emit(pre); emit(eoi); if (bits > 0) out.push(cur & 255);
    for (let i = 0; i < out.length; i += 255) { const n = Math.min(255, out.length - i); b.push(n); for (let j = 0; j < n; j++) b.push(out[i + j]); }
    b.push(0); this.prev = px.slice();
  };
  GifWriter.prototype.end = function () { this.bytes.push(0x3B); return Uint8Array.from(this.bytes); };

  const flat = ops => ops.filter(q => q[6] !== CLEAR);
  function renderGif(o) {
    const w = o.w || 480, h = o.h || 300, frames = o.frames || 56, gif = new GifWriter(w, h);
    const base = { w, h, seed: o.seed || 'grove', subject: o.subject, trees: o.trees || 3, gameDay: o.gameDay, extra: o.extra, near: o.near, nearSide: o.nearSide, far: o.far };
    const list = o.year ? ORDER : [o.season || 'fall']; let sheet, sc;
    if (o.year) { const last = scene(Object.assign({}, base, { season: 'winter' })); sheet = new Sheet(w, h, last.bg); for (const q of last.ops) sheet.op(q); }
    else sheet = new Sheet(w, h, K[SEASONS[list[0]].bg]);
    for (const season of list) {
      const so = Object.assign({}, base, { season }); sc = scene(so);
      const ops = o.year ? flat(wipeIn(so)).concat(sc.ops) : sc.ops, n = Math.ceil(ops.length / frames);
      if (!o.year) gif.frame(sheet.px, 40);
      for (let i = 0; i < ops.length; i += n) { for (let j = i; j < i + n && j < ops.length; j++) sheet.op(ops[j]); gif.frame(sheet.px, i + n >= ops.length ? (o.drift ? 10 : o.hold || 220) : (o.delay || 9)); }
      if (o.drift) { // let the leaves, petals or snow fall for a while over the finished drawing
        const d = new Drift(season, w, h, sc.crowns, sc.gy, base.seed), over = Object.create(sheet);
        for (let f = 0; f < o.drift; f++) { for (const q of d.step(Math.sin(f / 9) * .5)) sheet.op(q); over.px = sheet.px.slice(); for (const q of d.ops()) over.op(q); gif.frame(over.px, f === o.drift - 1 ? (o.hold || 160) : 9); }
      }
    }
    return gif.end();
  }

  /* ---------- browser ---------- */
  const LUT = new Uint32Array(32);
  HEX.forEach((hx, i) => { LUT[i] = (0xFF000000 | (parseInt(hx.slice(5, 7), 16) << 16) | (parseInt(hx.slice(3, 5), 16) << 8) | parseInt(hx.slice(1, 3), 16)) >>> 0; });
  const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEMPO = { slow: 30000, brisk: 6000 };
  function painter(canvas, sheet) {
    const ctx = canvas.getContext('2d'), img = ctx.createImageData(sheet.w, sheet.h), u = new Uint32Array(img.data.buffer);
    return () => { const p = sheet.px; for (let i = 0; i < p.length; i++) u[i] = LUT[p[i]]; ctx.putImageData(img, 0, 0); };
  }
  function whenSeen(el, fn) { if (typeof IntersectionObserver === 'undefined') { fn(true); return; } new IntersectionObserver(es => es.forEach(e => fn(e.isIntersecting)), { rootMargin: '80px' }).observe(el); }

  // one flat canvas: a plate, a frieze, a still
  function mount(canvas, o) {
    o = o || {}; const w = canvas.width, h = canvas.height;
    const st = { w, h, season: o.season || seasonNow(), subject: o.subject || 'grove', seed: o.seed || 'grove', trees: o.trees == null ? 4 : o.trees, gameDay: !!o.gameDay, near: o.near, nearSide: o.nearSide, far: o.far, extra: [] };
    const sheet = new Sheet(w, h, K[SEASONS[st.season].bg]), draw = painter(canvas, sheet);
    let ops = [], at = 0, t0 = 0, raf = 0; const dur = o.duration || TEMPO[o.tempo || 'brisk'];
    const tick = ts => { raf = 0; if (!t0) t0 = ts - at / ops.length * dur; const to = Math.min(ops.length, Math.ceil((ts - t0) / dur * ops.length)); for (; at < to; at++) sheet.op(ops[at]); draw(); if (at < ops.length) raf = requestAnimationFrame(tick); };
    const play = list => { if (raf) cancelAnimationFrame(raf); raf = 0; ops = list; at = 0; t0 = 0; if (still() || o.animate === false) { for (const q of ops) sheet.op(q); draw(); return; } raf = requestAnimationFrame(tick); };
    const api = {
      sheet, state: st,
      grow() { const sc = scene(st); sheet.px.fill(sc.bg); draw(); play(sc.ops); return api; },
      set(opts) { Object.assign(st, opts); play(flat(wipeIn(st)).concat(scene(st).ops)); return api; },
      setSeason(s) { return api.set({ season: s }); },
      gif(opts) { return renderGif(Object.assign({}, st, { w: 480, h: Math.round(480 * h / w) }, opts)); }
    };
    return api.grow();
  }

  // layered: far / middle / drift / near canvases stacked in a container, with focus blur, parallax and a slow hand
  function stage(el, o) {
    o = o || {}; const w = o.w || 1200, h = o.h || 620;
    const st = { w, h, season: o.season || seasonNow(), subject: o.subject || 'grove', seed: o.seed || 'grove', trees: o.trees == null ? 4 : o.trees, gameDay: !!o.gameDay, near: o.near, nearSide: o.nearSide, far: o.far, extra: [] };
    el.classList.add('us-stage'); if (!o.fill) el.style.aspectRatio = w + ' / ' + h; el.dataset.focus = o.focus || 'mid';
    const mk = cls => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.className = 'us-layer ' + cls; c.setAttribute('aria-hidden', 'true'); el.appendChild(c); return c; };
    const cv = [mk('us-far'), mk('us-mid'), mk('us-near'), mk('us-drift')];
    const sh = [new Sheet(w, h, K[SEASONS[st.season].bg])]; for (let i = 1; i < 4; i++) sh.push(new Sheet(w, h, CLEAR, sh[0].tooth));
    const draw = cv.map((c, i) => painter(c, sh[i])); LUT[CLEAR] = 0;
    let ops = [], marks = [], at = 0, t0 = 0, dur = TEMPO[o.tempo || 'slow'], paused = false, visible = true, raf = 0, drift = null, driftAt = 0, lastDrift = 0, wind = 0, crowns = [], gy = h * .86, litter = 0, lastLabel = null;
    const say = t => { if (t !== lastLabel) { lastLabel = t; if (o.onStep) o.onStep(t); } };
    const labelAt = i => { let l = ''; for (const m of marks) { if (m.i <= i) l = m.label; else break; } return l; };
    const runTo = to => { const dirty = [0, 0, 0]; for (; at < to; at++) { const q = ops[at]; sh[q[8]].op(q); dirty[q[8]] = 1; } for (let i = 0; i < 3; i++) if (dirty[i]) draw[i](); };
    const startDrift = () => { if (!drift) drift = new Drift(st.season, w, h, crowns, gy, st.seed); };
    const tick = ts => {
      raf = 0; if (paused || !visible) return;
      if (at < ops.length) { if (!t0) t0 = ts - at / ops.length * dur; runTo(Math.min(ops.length, Math.ceil((ts - t0) / dur * ops.length))); say(labelAt(at)); if (at >= driftAt) startDrift(); if (at >= ops.length && o.onDone) o.onDone(); }
      if (drift && ts - lastDrift > 82) { // twelve frames a second, like hand animation shot on twos
        lastDrift = ts; const landed = drift.step(wind); wind *= .9;
        if (landed.length && litter < 600) { for (const q of landed) sh[1].op(q); litter += landed.length; draw[1](); }
        sh[3].px.fill(CLEAR); for (const q of drift.ops()) sh[3].op(q); draw[3]();
      }
      raf = requestAnimationFrame(tick);
    };
    const go = () => { if (!raf && !paused && visible) raf = requestAnimationFrame(tick); };
    const begin = withWipe => {
      const sc = scene(st); crowns = sc.crowns; gy = sc.gy; drift = null; litter = 0; sh[3].px.fill(CLEAR); draw[3]();
      el.style.background = HEX[sc.bg];
      if (withWipe) { const pre = wipeIn(st, true); ops = pre.concat(sc.ops); marks = [{ i: 0, label: 'Painting over' }].concat(sc.marks.map(m => ({ i: m.i + pre.length, label: m.label }))); }
      else { ops = sc.ops; marks = sc.marks; sh[0].px.fill(sc.bg); sh[1].px.fill(CLEAR); sh[2].px.fill(CLEAR); draw[0](); draw[1](); draw[2](); }
      at = 0; t0 = 0; lastLabel = null; const up = marks.find(m => m.label === 'Up close'); driftAt = up ? up.i : ops.length;
      if (still() || o.animate === false) { runTo(ops.length); say(''); if (o.onDone) o.onDone(); return; }
      go();
    };
    const pt = e => { const b = el.getBoundingClientRect(), s = Math.max(b.width / w, b.height / h); return [(e.clientX - b.left - (b.width - w * s) / 2) / s, (e.clientY - b.top - (b.height - h * s) / 2) / s]; };
    let lastX = null;
    el.addEventListener('pointermove', e => { const b = el.getBoundingClientRect(), nx = (e.clientX - b.left) / b.width * 2 - 1, ny = (e.clientY - b.top) / b.height * 2 - 1;
      if (!still()) { el.style.setProperty('--px', nx.toFixed(3)); el.style.setProperty('--py', ny.toFixed(3)); }
      if (lastX != null) wind = Math.max(-6, Math.min(6, wind + (e.clientX - lastX) * .04)); lastX = e.clientX; });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--px', 0); el.style.setProperty('--py', 0); lastX = null; });
    whenSeen(el, v => { visible = v; t0 = 0; go(); });

    const api = {
      state: st, point: pt,
      set(opts) { Object.assign(st, opts); begin(true); return api; },
      redraw() { begin(false); return api; },
      tempo(name) { dur = TEMPO[name] || name; t0 = 0; return api; },
      pause(v) { paused = v == null ? !paused : !!v; t0 = 0; go(); return paused; },
      finish() { runTo(ops.length); say(''); startDrift(); if (o.onDone) o.onDone(); go(); return api; },
      focus(name) { el.dataset.focus = name; return api; },
      plant(fx, species) { const e = { kind: 'tree', x: fx, H: .42 + Math.random() * .3, sp: species || ['oak', 'elm', 'magnolia'][Math.floor(Math.random() * 3)], seed: 'p' + st.extra.length + '/' + Math.round(fx * 1000) }; st.extra.push(e);
        const q = treeOps(e.seed, e.x * w, gy + 4, h * e.H, st.season, { species: e.sp }); crowns.push(q.crown); for (const k of q.ops) k[8] = 1;
        const rest = ops.slice(at), was = labelAt(at); ops = q.ops.concat(rest); marks = [{ i: 0, label: 'A tree you planted' }, { i: q.ops.length, label: rest.length ? was : '' }]; at = 0; t0 = 0; driftAt = 0;
        if (still()) runTo(ops.length); else go(); return api; },
      stroke(x0, y0, x1, y1, col, r) { st.extra.push({ a: x0 / w, b: y0 / h, c: x1 / w, d: y1 / h, r: r / w, col }); sh[1].op([x0, y0, x1, y1, r, r, K[col], 1.05]); draw[1](); return api; },
      clear() { st.extra = []; begin(false); return api; },
      png() { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); for (const i of [0, 1, 3, 2]) x.drawImage(cv[i], 0, 0); return c; },
      gif(opts) { return renderGif(Object.assign({}, st, { w: 480, h: Math.round(480 * h / w) }, opts)); }
    };
    begin(false); return api;
  }

  function swash(canvas, o) {
    o = o || {}; const w = canvas.width, h = canvas.height, sheet = new Sheet(w, h, CLEAR), draw = painter(canvas, sheet), r = rng(hash(o.seed || 'swash')), ops = [];
    LUT[CLEAR] = 0;
    for (let k = 0; k < (o.passes || 2); k++) { const y = h * (.42 + k * .14), ph = r() * 6, R = h * (.3 - k * .06); for (let x = R; x < w - R * (1 + k * 3); x += 10) ops.push([x, y + Math.sin(x / 60 + ph) * h * .08, x + 10, y + Math.sin((x + 10) / 60 + ph) * h * .08, R, R, K[o.color || 'persimmon'], .96 - k * .1]); }
    if (still()) { for (const q of ops) sheet.op(q); draw(); return; }
    let i = 0; const n = Math.ceil(ops.length / 50), tick = () => { for (let j = i; j < i + n && j < ops.length; j++) sheet.op(ops[j]); i += n; draw(); if (i < ops.length) requestAnimationFrame(tick); }; tick();
  }

  const api = { colors: NAMES.reduce((m, n, i) => (m[n] = HEX[i], m), {}), seasons: SEASONS, subjects: SUBJECTS, species: SPECIES, order: ORDER, seasonNow, Sheet, scene, treeOps, building, renderGif, mount, stage, swash };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.UnderstoryPaint = api;
})(typeof window !== 'undefined' ? window : globalThis);
