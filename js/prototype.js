/* The Grove Lab — Prototype preview.
   Draws a faculty member's build idea the way Apple's accessory dimensional drawings work: one monochrome
   sheet of slots, spacing, radii and layers, measured with variable codes, never real content. The same
   geometry then renders as a wireframe, a styled mock, and a clickable prototype, so faculty can see how a
   build might look at each phase and choose its look and experience before anything is coded.
   Drawing method after Enes Ozturk's dimensional-drawing skill (MIT). Choices save into the build form
   (localStorage "grovelab.v1") and appear in every download. */
(() => {
const G = window.GROVE;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY = "grovelab.v1";
const blank = () => ({ v: 1, idea: "", answers: {}, primary: null, also: [], flagged: [], jev: null, aiChoice: null });
let S = (() => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return blank(); } })();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let toastT; const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2800); };

/* ---------- choices ---------- */
const OPTS = {
  proto_layout: { label: "Layout pattern", options: [
    { v: "Guided steps", d: "One screen at a time with Back and Next. Activities, reflections, worksheets." },
    { v: "One long page", d: "Sections in reading order. Readings, explainers, guides." },
    { v: "Workspace", d: "A side list, a main canvas, a notes drawer. Annotation and course tools." },
    { v: "Map or board", d: "A full-screen canvas with a drawer. Maps, timelines, simulations, games." },
    { v: "Gallery grid", d: "Cards in a grid with a detail panel. Collections and showcases." } ] },
  proto_density: { label: "Spacing", options: [
    { v: "Roomy", d: "Generous padding, fewer things per screen." },
    { v: "Standard", d: "The lab's default." },
    { v: "Compact", d: "Tighter padding, more on screen at once." } ] },
  proto_corners: { label: "Corners", options: [
    { v: "Square", d: "Like the university site." },
    { v: "Soft", d: "Slightly rounded cards and buttons." },
    { v: "Round", d: "Pill buttons and rounded cards." } ] },
  proto_type: { label: "Type", options: [
    { v: "Serif, editorial", d: "Reads like a book or a journal." },
    { v: "Sans, institutional", d: "Plain and clear, like campus pages." },
    { v: "Display, bold", d: "Big uppercase headings, poster energy." } ] },
  look_colors: { label: "Colors", options: [
    { v: "University colors", d: "Navy and red." },
    { v: "Colors that fit the subject", d: "A palette drawn from the pathway and topic." },
    { v: "Surprise me", d: "AIG picks something unexpected." } ] },
  proto_motion: { label: "Motion", options: [
    { v: "None", d: "Nothing moves. Simplest and most accessible." },
    { v: "Calm", d: "Short fades and slides. Honors reduced-motion settings." },
    { v: "Lively", d: "Transitions you notice. Still honors reduced-motion settings." } ] },
};
const PATH_LAYOUT = { "learning-app": "Guided steps", "game-sim": "Map or board", "research-data": "Workspace", "friction": "Guided steps", "faculty-tool": "Workspace", "showcase": "Gallery grid" };
const DEF = { proto_density: "Standard", proto_corners: "Square", proto_type: "Sans, institutional", look_colors: "University colors", proto_motion: "Calm" };
const path = () => S.primary || "learning-app";
const opt = k => S.answers[k] || (k === "proto_layout" ? PATH_LAYOUT[path()] : DEF[k]);
const LAYOUT_ID = { "Guided steps": "steps", "One long page": "scroll", "Workspace": "workspace", "Map or board": "board", "Gallery grid": "grid" };
const layoutId = () => LAYOUT_ID[opt("proto_layout")];
const title = () => (S.answers.title || "").trim() || "Your build";
const exportsChosen = () => { const l = S.answers.leave; return Array.isArray(l) ? l.filter(x => !/^Nothing|^Not sure/.test(x)) : []; };

/* ---------- variables (the numbers on the sheet) ---------- */
function vars() {
  const den = { Roomy: 0, Standard: 1, Compact: 2 }[opt("proto_density")];
  const cor = { Square: 0, Soft: 1, Round: 2 }[opt("proto_corners")];
  const ty = { "Serif, editorial": 0, "Sans, institutional": 1, "Display, bold": 2 }[opt("proto_type")];
  const mo = { None: 0, Calm: 1, Lively: 2 }[opt("proto_motion")];
  const V = {
    S1: [40, 28, 18][den], S2: [24, 18, 12][den], S3: [24, 16, 10][den], S4: [12, 8, 6][den], S5: [16, 12, 8][den], S6: 4,
    H0: [72, 64, 56][den], H2: [72, 64, 56][den], H3: [48, 40, 34][den], H4: 6, H5: [48, 40, 36][den], Z1: 40, Z2: 40, T1: 44, B: 1,
    R1: [0, 8, 18][cor], R3: [0, 6, 12][cor], cor,
    W1: [280, 260, 230][den], W2: [680, 720, 760][den], W3: 300, W4: 420,
    T1s: [18, 17, 17][ty], T2: [22, 21, 20][ty], T3: [30, 28, 30][ty], T4: [44, 40, 56][ty], LH: [1.6, 1.55, 1.5][ty], ty,
    M1: [0, 240, 420][mo], mo,
  };
  V.R2 = Math.max(0, V.R1 - V.B - V.S6);
  V.R4 = cor === 2 ? "h ÷ 2" : V.R3;
  return V;
}

/* ---------- geometry model (page units: a 1280 × 800 reference viewport) ----------
   Every primitive is {k, x, y, w, h, z, l, txt, act, r, on, pri}. k = kind, z = exploded layer (0–5),
   l = slot label for the drawing and wireframe, txt = structural text for the styled mock, act = what a click does. */
function model(V, st) {
  const P = [], add = (k, x, y, w, h, o) => { const p = Object.assign({ k, x, y, w, h, z: 4 }, o || {}); P.push(p); return p; };
  const L = layoutId(), W = 1280, H = 800, { S1, S2, S3, S4, H0, H2, H3, H5, Z1, R1, R3, W1, W2, W3, W4 } = V;
  const navWords = { steps: ["Start", "Guide", "About"], scroll: ["Read", "Guide", "About"], workspace: ["Files", "Help", "About"], board: ["Map", "Guide", "About"], grid: ["Browse", "Themes", "About"] }[L];
  const stepsFor = { "learning-app": ["Read the prompt", "Write your response", "Compare and revise", "Download your report"], friction: ["Read a short section", "Write before you look", "Compare with the source", "Download your notes"], "game-sim": ["Take a role", "Make a choice", "See what changed", "Debrief"], "research-data": ["Pick a question", "Look at the data", "Weigh the evidence", "Download your findings"], "faculty-tool": ["Describe your course", "Choose options", "Review", "Export"], showcase: ["Enter", "Browse", "Compare", "Reflect"] }[path()];
  const dims = { top: [], left: [], right: [], bottom: [] }, rads = [], refs = [], notes = [], layers = [];
  const initials = title().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  /* header chrome, all layouts */
  add("header", 0, 0, W, H0, { z: 2 });
  add("brand", S1, (H0 - Z1) / 2, Z1, Z1, { z: 5, l: "BRAND · HUG", txt: initials });
  add("slot", S1 + Z1 + S4, (H0 - 22) / 2, 260, 22, { z: 5, l: "TITLE SLOT · HUG", txt: title(), kind: "title" });
  const ctaW = 120, navW = 84, navX = W - S1 - ctaW - S4 - 3 * navW - 2 * S4;
  navWords.forEach((t, i) => add("nav", navX + i * (navW + S4), (H0 - H3) / 2, navW, H3, { z: 5, l: i === 1 ? "NAV" : "", txt: t, act: "topnav:" + i, on: st.topnav === i }));
  add("ctl", W - S1 - ctaW, (H0 - H3) / 2, ctaW, H3, { z: 5, pri: true, l: "ACTION", txt: L === "grid" ? "Reflect" : "Start", r: R3, act: "cta" });
  dims.top.push([0, S1, "S1"], [S1, S1 + Z1, "Z1"], [S1 + Z1, S1 + Z1 + S4, "S4"], [S1 + Z1 + S4, navX, "FLEX", "dts"], [navX, navX + 3 * navW + 2 * S4, "HUG", "dts"], [navX + 3 * navW + 2 * S4, W - S1 - ctaW, "S4"], [W - S1 - ctaW, W - S1, "HUG", "dts"], [W - S1, W, "S1"]);
  notes.push([1, "HEADER FIXED AT H0. BRAND, NAV, ACTION HUG; TITLE FLEXES."]);
  layers.push(["L0 · Viewport", "Reference 1280 × 800"], ["L1 · Page canvas", "Background, V2 margins [TBD]"], ["L2 · Header & bars", "H0 · H2 · rails"], ["L3 · Regions", "Cards, panels, canvas · R1"], ["L4 · Slots", "Title, content, fields, images"], ["L5 · Controls & status", "Actions H3 · chips · markers"]);
  const saved = (x, y) => add("chip", x, y, 210, 22, { z: 5, l: "STATUS · SAVED IN THIS BROWSER", txt: "Saved in this browser" });
  const note2 = (n, t) => notes.push([n, t]);

  if (L === "steps") {
    add("rail", 0, H0, W, V.H4, { z: 2 });
    add("railfill", 0, H0, W * (st.step + 1) / 4, V.H4, { z: 2 });
    const cx = (W - W2) / 2, cy = H0 + V.H4 + S1, ch = H - cy - S1 - 22 - S3;
    add("card", cx, cy, W2, ch, { z: 3, r: R1 });
    add("chip", cx + S2, cy + S2, 110, 22, { z: 4, l: "STEP N", txt: `Step ${st.step + 1} of 4` });
    const ty0 = cy + S2 + 22 + S4;
    add("slot", cx + S2, ty0, W2 - 2 * S2, 30, { z: 4, l: "TITLE SLOT · FLEX", txt: stepsFor[st.step], kind: "h" });
    const fy = cy + ch - S2 - H3, iy = fy - S3 - H5, ly = iy - S4 - 18, c0 = ty0 + 30 + S3;
    add("slot", cx + S2, c0, W2 - 2 * S2, ly - S3 - c0, { z: 4, l: "CONTENT SLOT · FILL", kind: "content" });
    add("slot", cx + S2, ly, 240, 18, { z: 4, l: "LABEL SLOT", txt: "Your response", kind: "label" });
    add("input", cx + S2, iy, W2 - 2 * S2, H5, { z: 4, l: "VALUE SLOT · FILL", r: R3, txt: "Type here" });
    add("ctl", cx + S2, fy, 96, H3, { z: 5, l: "SECONDARY · HUG", txt: "Back", act: "back", r: R3 });
    add("ctl", cx + W2 - S2 - 128, fy, 128, H3, { z: 5, pri: true, l: "PRIMARY · HUG", txt: st.step === 3 ? "Download" : "Next", act: st.step === 3 ? "download" : "next", r: R3 });
    saved(S1, H - S1 - 22);
    dims.left.push([0, H0, "H0"], [H0, H0 + V.H4, "H4"], [H0 + V.H4, cy, "S1"], [cy, cy + ch, "HUG", "dts"], [cy + ch, H, "S1+22+S3"]);
    dims.right.push([cy, cy + S2, "S2"], [cy + S2, cy + S2 + 22, "22"], [ty0, ty0 + 30, "HUG", "dts"], [c0, ly - S3, "FILL", "dts"], [ly, ly + 18, "18"], [iy, iy + H5, "H5"], [iy + H5, fy, "S3"], [fy, fy + H3, "H3"], [fy + H3, cy + ch, "S2"]);
    dims.bottom.push([0, cx, "FLEX", "dts"], [cx, cx + W2, "W2"], [cx + W2, W, "FLEX", "dts"]);
    rads.push([cx, cy + ch, R1, "bl", "R1"], [cx + W2, fy + H3, R3, "br", "R3"]);
    refs.push([cx + W2 - S2 - 64, fy + H3 / 2, 40, "DETAIL A", cx + W2 - S2 - 140, fy + H3 + 44], [cx + 4, cy + ch - 4, 22, "DETAIL B", cx - 120, cy + ch - 40]);
    note2(2, "ONE STEP PER SCREEN. CARD W2 CENTERS; CONTENT FILLS IT.");
    note2(3, "RAIL H4 SHOWS PROGRESS. NEXT BECOMES DOWNLOAD AT THE END.");
  }
  if (L === "scroll") {
    add("region", 0, H0, W, 180, { z: 3, kind: "hero" });
    add("slot", S1, H0 + S1, 560, 40, { z: 4, l: "TITLE SLOT · HUG", txt: title(), kind: "h" });
    add("slot", S1, H0 + S1 + 40 + S4, 560, 44, { z: 4, l: "LEDE SLOT · FLEX · WRAPS", kind: "lede" });
    add("ctl", S1, H0 + 180 - S1 - H3, 128, H3, { z: 5, pri: true, l: "PRIMARY · HUG", txt: "Begin", r: R3, act: "sec:0" });
    add("ctl", S1 + 128 + S4, H0 + 180 - S1 - H3, 110, H3, { z: 5, l: "SECONDARY · HUG", txt: "Guide", r: R3, act: "topnav:1" });
    const y0 = H0 + 180 + S1, secH = (H - y0 - H2 - S1 - 2 * S3) / 3;
    for (let i = 0; i < 3; i++) {
      const y = y0 + i * (secH + S3);
      add("card", S1, y, W - 2 * S1, secH, { z: 3, r: R1, act: "sec:" + i, on: st.sec === i });
      add("slot", S1 + S2, y + S2, 320, 24, { z: 4, l: "HEADING SLOT · HUG", txt: `Section ${i + 1}`, kind: "h2" });
      add("slot", S1 + S2, y + S2 + 24 + S4, W - 2 * S1 - 2 * S2, secH - 2 * S2 - 24 - S4, { z: 4, l: "CONTENT SLOT · FILL", kind: "content" });
    }
    add("bar", 0, H - H2, W, H2, { z: 2 });
    saved(S1, H - H2 / 2 - 11);
    add("ctl", W - S1 - 150, H - H2 / 2 - H3 / 2, 150, H3, { z: 5, pri: true, l: "PRIMARY · HUG", txt: "Download", r: R3, act: "download" });
    add("ctl", W - S1 - 150 - S4 - 90, H - H2 / 2 - H3 / 2, 90, H3, { z: 5, l: "SECONDARY · HUG", txt: "Print", r: R3, act: "print" });
    dims.left.push([0, H0, "H0"], [H0, H0 + 180, "HUG", "dts"], [H0 + 180, y0, "S1"], [y0, y0 + secH, "FILL", "dts"], [y0 + secH, y0 + secH + S3, "S3"], [H - H2 - S1, H - H2, "S1"], [H - H2, H, "H2"]);
    dims.right.push([y0, y0 + S2, "S2"], [y0 + S2, y0 + S2 + 24, "24"], [y0 + S2 + 24, y0 + S2 + 24 + S4, "S4"], [y0 + secH - S2, y0 + secH, "S2"]);
    dims.bottom.push([0, S1, "S1"], [S1, W - S1, "FILL", "dts"], [W - S1, W, "S1"]);
    rads.push([S1, y0 + 2 * (secH + S3) + secH, R1, "bl", "R1"], [W - S1, H - H2 / 2 + H3 / 2, R3, "br", "R3"]);
    refs.push([W - S1 - 75, H - H2 / 2, 40, "DETAIL A", W - S1 - 230, H - H2 - 30], [S1 + 4, y0 + 2 * (secH + S3) + secH - 4, 22, "DETAIL B", S1 + 270, H - H2 / 2 + 4]);
    note2(2, "HERO, THEN THREE SECTIONS. THE EXPORT BAR H2 STAYS PUT.");
    note2(3, "HEADINGS HUG. CONTENT FILLS; MEASURE ≤ 70 CHARACTERS.");
  }
  if (L === "workspace") {
    const drawerW = st.drawer ? W3 : 0;
    add("region", 0, H0, W1, H - H0, { z: 3, kind: "side" });
    for (let i = 0; i < 5; i++) add("navitem", S2, H0 + S2 + i * (H3 + S4), W1 - 2 * S2, H3, { z: 5, l: "ITEM · FILL", txt: `Item ${i + 1}`, act: "nav:" + i, on: st.nav === i, r: R3 });
    saved(S2, H - S2 - 22);
    const mx = W1 + S1, mw = W - W1 - drawerW - 2 * S1;
    add("ctl", mx, H0 + S1, 90, H3, { z: 5, l: "TOOL · HUG", txt: "Tag", r: R3, act: "tool" });
    add("ctl", mx + 90 + S4, H0 + S1, 90, H3, { z: 5, l: "TOOL · HUG", txt: "Note", r: R3, act: "tool" });
    add("ctl", mx + mw - 96, H0 + S1, 96, H3, { z: 5, l: "TOGGLE · HUG", txt: st.drawer ? "Hide notes" : "Notes", r: R3, act: "drawer" });
    add("slot", mx + 180 + 2 * S4, H0 + S1 + (H3 - 22) / 2, mw - 180 - 96 - 3 * S4, 22, { z: 4, l: "TOOL SLOT · FLEX", txt: `Item ${st.nav + 1}`, kind: "label" });
    const cy = H0 + S1 + H3 + S3, ch = H - cy - S1 - H3 - S3;
    add("card", mx, cy, mw, ch, { z: 3, r: R1 });
    add("slot", mx + S2, cy + S2, mw - 2 * S2, ch - 2 * S2, { z: 4, l: "CONTENT SLOT · FILL", kind: "content" });
    add("ctl", mx + mw - 150, H - S1 - H3, 150, H3, { z: 5, pri: true, l: "PRIMARY · HUG", txt: "Download", r: R3, act: "download" });
    if (st.drawer) {
      add("region", W - W3, H0, W3, H - H0, { z: 3, kind: "drawer" });
      for (let i = 0; i < 3; i++) { const y = H0 + S2 + i * (96 + S3); add("card", W - W3 + S2, y, W3 - 2 * S2, 96, { z: 4, r: R1 }); add("slot", W - W3 + 2 * S2, y + S2 / 1.5, W3 - 4 * S2, 96 - S2 / .75, { z: 4, l: "NOTE SLOT", txt: `Note ${i + 1}`, kind: "note" }); }
    }
    dims.left.push([0, H0, "H0"], [H0, H0 + S2, "S2"], [H0 + S2, H0 + S2 + H3, "H3"], [H0 + S2 + H3, H0 + S2 + H3 + S4, "S4"], [H - S2 - 22, H, "S2+22"]);
    dims.right.push([H0, H0 + S1, "S1"], [H0 + S1, H0 + S1 + H3, "H3"], [H0 + S1 + H3, cy, "S3"], [cy, cy + ch, "FILL", "dts"], [cy + ch, H - S1 - H3, "S3"], [H - S1 - H3, H - S1, "H3"], [H - S1, H, "S1"]);
    dims.bottom.push([0, W1, "W1"], [W1, mx, "S1"], [mx, mx + mw, "FLEX", "dts"], [mx + mw, W - drawerW, "S1"], [W - drawerW, W, "W3"]);
    rads.push([mx, cy + ch, R1, "bl", "R1"], [mx + mw, H - S1, R3, "br", "R3"]);
    refs.push([mx + mw - 75, H - S1 - H3 / 2, 40, "DETAIL A", mx + mw - 240, H - S1 - H3 - 30], [mx + 4, cy + ch - 4, 22, "DETAIL B", mx + 70, cy + ch + 30]);
    note2(2, "SIDE LIST W1 FIXED; CANVAS FLEXES; DRAWER W3 CAN HIDE.");
    note2(3, "LIST ITEMS ARE H3 TALL, GAP S4. THE OPEN ITEM IS MARKED.");
  }
  if (L === "board") {
    add("canvas", 0, H0, W, H - H0, { z: 3, l: "CANVAS SLOT · FILL · MAP, BOARD OR SIMULATION", kind: "canvas" });
    [[0.32, 0.36], [0.55, 0.62], [0.68, 0.3]].forEach(([fx, fy], i) => add("marker", fx * W - 12, H0 + fy * (H - H0) - 12, 24, 24, { z: 5, act: "pick:" + i, on: st.sel === i, txt: String(i + 1), l: "" }));
    const kx = W - S1 - 220, ky = H0 + S1;
    add("card", kx, ky, 220, 130, { z: 4, r: R1 });
    add("slot", kx + S2, ky + S2 / 1.5, 220 - 2 * S2, 130 - S2 / .75, { z: 4, l: "KEY SLOT · HUG", txt: "Key", kind: "key" });
    add("ctl", W - S1 - V.Z2, ky + 130 + S3, V.Z2, V.Z2, { z: 5, l: "Z2", txt: "+", r: R3, act: "zoom" });
    add("ctl", W - S1 - V.Z2, ky + 130 + S3 + V.Z2 + S4, V.Z2, V.Z2, { z: 5, l: "Z2", txt: "−", r: R3, act: "zoom" });
    const dw = 380, dh = 260, dx = S1, dy = H - S1 - dh;
    if (st.drawer) {
      add("card", dx, dy, dw, dh, { z: 4, r: R1, kind: "drawer" });
      add("slot", dx + S2, dy + S2, dw - 2 * S2, 26, { z: 4, l: "TITLE SLOT · FLEX", txt: st.sel == null ? "Pick a marker" : `Marker ${st.sel + 1}`, kind: "h2" });
      add("slot", dx + S2, dy + S2 + 26 + S4, dw - 2 * S2, dh - 2 * S2 - 26 - S4 - H3 - S3, { z: 4, l: "CONTENT SLOT · FILL", kind: "content" });
      add("ctl", dx + S2, dy + dh - S2 - H3, 90, H3, { z: 5, l: "SECONDARY · HUG", txt: "Close", r: R3, act: "drawer" });
      add("ctl", dx + dw - S2 - 110, dy + dh - S2 - H3, 110, H3, { z: 5, pri: true, l: "PRIMARY · HUG", txt: "Choose", r: R3, act: "choose" });
    } else add("ctl", dx, H - S1 - H3, 128, H3, { z: 5, l: "TOGGLE · HUG", txt: "Open drawer", r: R3, act: "drawer" });
    add("ctl", W - S1 - 150, H - S1 - H3, 150, H3, { z: 5, pri: true, l: "PRIMARY · HUG", txt: "Download", r: R3, act: "download" });
    saved(W - S1 - 150 - S4 - 210, H - S1 - 22 - (H3 - 22) / 2);
    dims.left.push([0, H0, "H0"], [H0, dy, "FILL", "dts"], [dy, dy + dh, "260"], [dy + dh, H, "S1"]);
    dims.right.push([H0, ky, "S1"], [ky, ky + 130, "130"], [ky + 130, ky + 130 + S3, "S3"], [ky + 130 + S3, ky + 130 + S3 + V.Z2, "Z2"], [H - S1 - H3, H - S1, "H3"], [H - S1, H, "S1"]);
    dims.bottom.push([0, dx, "S1"], [dx, dx + dw, "380"], [dx + dw, W - S1 - 150, "FLEX", "dts"], [W - S1 - 150, W - S1, "HUG", "dts"], [W - S1, W, "S1"]);
    rads.push([dx, dy, R1, "tl", "R1"], [dx + dw - S2, dy + dh - S2 - H3, R3, "tr", "R3"]);
    refs.push([dx + dw - S2 - 55, dy + dh - S2 - H3 / 2, 40, "DETAIL A", dx + dw + 70, dy + dh / 2 + 40], [dx + 4, dy + dh - 4, 22, "DETAIL B", dx + 110, dy - 30]);
    note2(2, "CANVAS FILLS UNDER THE HEADER. MARKERS Z2, HIT AREA T1.");
    note2(3, "DRAWER FLOATS S1 FROM THE CORNER AND CAN CLOSE.");
  }
  if (L === "grid") {
    const open = st.sel != null, panelW = open ? W4 : 0, cols = open ? 2 : 3;
    add("input", S1, H0 + S1, 420, H3, { z: 4, l: "SEARCH SLOT · FLEX", txt: "Search", r: R3 });
    ["All", "Theme", "Time"].forEach((t, i) => add("ctl", S1 + 420 + S4 + i * (90 + S4), H0 + S1, 90, H3, { z: 5, l: "FILTER · HUG", txt: t, r: V.R4 === "h ÷ 2" ? H3 / 2 : R3, act: "chip:" + i, on: st.chip === i }));
    const gx = S1, gy = H0 + S1 + H3 + S3, gw = (W - panelW - 2 * S1 - (cols - 1) * S3) / cols, gh = (H - gy - S1 - S3) / 2;
    for (let i = 0; i < cols * 2; i++) {
      const x = gx + (i % cols) * (gw + S3), y = gy + Math.floor(i / cols) * (gh + S3), ih = Math.min(gw * 9 / 16, gh - S2 * 2 - 20 - 14 - S4 * 2);
      add("card", x, y, gw, gh, { z: 3, r: R1, act: "sel:" + i, on: st.sel === i });
      add("image", x + S2, y + S2, gw - 2 * S2, ih, { z: 4, l: "IMAGE SLOT · 16:9", r: V.R2 });
      add("slot", x + S2, y + S2 + ih + S4, gw - 2 * S2, 20, { z: 4, l: "TITLE SLOT · FLEX", txt: `Item ${i + 1}`, kind: "h3" });
      add("slot", x + S2, y + S2 + ih + S4 + 20 + S4, gw - 2 * S2, 14, { z: 4, l: "META SLOT · FLEX · WRAPS", kind: "meta" });
    }
    const px = W - W4;
    if (open) {
      add("region", px, H0, W4, H - H0, { z: 3, kind: "panel" });
      add("image", px + S2, H0 + S2, W4 - 2 * S2, (W4 - 2 * S2) * 9 / 16, { z: 4, l: "IMAGE SLOT · 16:9", r: V.R2 });
      add("slot", px + S2, H0 + S2 + (W4 - 2 * S2) * 9 / 16 + S3, W4 - 2 * S2, 26, { z: 4, l: "TITLE SLOT · FLEX", txt: `Item ${st.sel + 1}`, kind: "h2" });
      add("slot", px + S2, H0 + S2 + (W4 - 2 * S2) * 9 / 16 + S3 + 26 + S4, W4 - 2 * S2, H - H0 - 2 * S2 - (W4 - 2 * S2) * 9 / 16 - S3 - 26 - S4 - H3 - S3, { z: 4, l: "CONTENT SLOT · FILL", kind: "content" });
      add("ctl", px + S2, H - S2 - H3, 90, H3, { z: 5, l: "SECONDARY · HUG", txt: "Close", r: R3, act: "close" });
      add("ctl", px + W4 - S2 - 110, H - S2 - H3, 110, H3, { z: 5, pri: true, l: "PRIMARY · HUG", txt: "Open", r: R3, act: "download" });
    } else add("phantom", px, H0, W4, H - H0, { z: 3, l: "DETAIL PANEL · W4 · ON SELECT" });
    dims.left.push([0, H0, "H0"], [H0, gy - S3, "S1+H3", ""], [gy, gy + gh, "FILL", "dts"], [gy + gh, gy + gh + S3, "S3"], [H - S1, H, "S1"]);
    dims.right.push([gy, gy + S2, "S2"], [gy + S2, gy + S2 + Math.min(gw * 9 / 16, gh - 2 * S2 - 34 - 2 * S4), "16:9", "dts"], [gy + gh - S2 - 34 - 2 * S4, gy + gh - S2, "HUG", "dts"], [gy + gh - S2, gy + gh, "S2"]);
    dims.bottom.push([0, gx, "S1"], [gx, gx + gw, "FLEX", "dts"], [gx + gw, gx + gw + S3, "S3"], [gx + gw + S3, gx + 2 * gw + S3, "FLEX", "dts"], [W - panelW - S1, W - panelW, "S1"]);
    if (!open) dims.bottom.push([px, W, "W4"]);
    rads.push([gx, gy + gh, R1, "bl", "R1"], [gx + S2, gy + gh + S3 + S2, V.R2, "tl", "R2"]);
    refs.push([S1 + 420 + S4 + 45, H0 + S1 + H3 / 2, 36, "DETAIL A", S1 + 420 + 3 * (90 + S4) + 40, H0 + S1 + H3 / 2], [gx + 4, gy + 2 * gh + S3 - 4, 22, "DETAIL B", gx + 70, H - 8]);
    note2(2, "3-COLUMN GRID, GAP S3. SELECT → W4 PANEL, 2 COLUMNS.");
    note2(3, "IMAGES 16:9, RADIUS R2 = R1 − B − S6. TITLES FLEX.");
  }
  notes.push([4, "CONTROLS ARE H3 TALL WITH A 44 PX TOUCH MINIMUM (T1)."]);
  notes.push([5, "WORK SAVES IN THE BROWSER. NOTHING IS SENT UNTIL DOWNLOAD."]);
  const ex = exportsChosen();
  { let e6 = "EXPORTS: " + (ex.length ? ex.join(" · ").toUpperCase() : "[TBD] · CHOOSE IN THE FORM"); if (e6.length > 58) e6 = e6.slice(0, 56) + "…"; notes.push([6, e6]); }
  notes.push([7, "COLOR: " + opt("look_colors").toUpperCase() + ". GRAYSCALE HERE BY RULE."]);
  notes.push([8, "MOTION M1 = " + V.M1 + " MS. ZERO UNDER REDUCED-MOTION SETTINGS."]);
  notes.push([0, "PHONE LAYOUT STACKS REGIONS IN READING ORDER (PHONE VIEW)."]);
  return { P, dims, rads, refs, notes, layers, L };
}

/* ---------- SVG drawing kit (after the dimensional-drawing skill) ---------- */
const NS = "http://www.w3.org/2000/svg";
const SHEET_CSS = `
.u{text-transform:uppercase;letter-spacing:.07em}
text{font-family:Arimo,'Helvetica Neue',Helvetica,Arial,sans-serif}
.border{fill:none;stroke:#111;stroke-width:1.2}
.obj{fill:#fff;stroke:#111;stroke-width:1.6;stroke-linejoin:round}
.well{fill:#f3f3f3;stroke:#111;stroke-width:1}
.slot{fill:none;stroke:#444;stroke-width:.8;stroke-dasharray:4 3}
.hug{fill:#e6e6e6;stroke:#111;stroke-width:1}
.thin{fill:none;stroke:#111;stroke-width:.8}
.ph{fill:none;stroke:#7a7a7a;stroke-width:.8;stroke-dasharray:14 3 3 3}
.cl{fill:none;stroke:#7a7a7a;stroke-width:.7;stroke-dasharray:16 3 2 3}
.dl{stroke:#111;stroke-width:.7;fill:none}
.ext{stroke:#111;stroke-width:.55;fill:none}
.arrow{fill:#111}
.hl{stroke:#444;stroke-width:.7}
.env{fill:none;stroke:#111;stroke-width:.8;stroke-dasharray:10 3 2 3}
.dt{font-size:11px;fill:#111;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}
.dts{font-size:9.5px;fill:#444;letter-spacing:.06em;text-transform:uppercase;paint-order:stroke;stroke:#fff;stroke-width:3px}
.sl{font-size:9px;fill:#444;letter-spacing:.08em;text-transform:uppercase}
.nt{font-size:11.5px;fill:#111;letter-spacing:.06em;text-transform:uppercase}
.nth{font-size:13px;font-weight:700;fill:#111;letter-spacing:.06em}
.vt{font-size:12px;fill:#111;letter-spacing:.1em;text-transform:uppercase}
.nb{fill:#fff;stroke:#111;stroke-width:.9}
.nbt{font-size:9.5px;fill:#111}
.lead{stroke:#111;stroke-width:.7;fill:none}
.dot{fill:#111}
.th{font-size:10.5px;fill:#111;letter-spacing:.05em;text-transform:uppercase}
.tc{font-size:10.5px;fill:#111}
.ft{font-size:10px;fill:#444;letter-spacing:.06em;text-transform:uppercase}`;
let sv, cam, A, HAT, uid = 0;
function mk(t, a, p) { const e = document.createElementNS(NS, t); for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); (p || cam).appendChild(e); return e; }
function tx(x, y, s, c, a, p) { const t = mk("text", Object.assign({ x, y, class: c || "dt" }, a || {}), p); t.textContent = s; return t; }
function begin(id) {
  sv = document.getElementById(id); sv.innerHTML = ""; const n = uid++;
  const st = document.createElementNS(NS, "style"); st.textContent = SHEET_CSS; sv.appendChild(st);
  const d = mk("defs", {}, sv);
  const m = mk("marker", { id: "ar" + n, viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, d);
  mk("path", { d: "M0,1.7 L10,5 L0,8.3 z", class: "arrow" }, m);
  const pt = mk("pattern", { id: "hat" + n, width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, d);
  mk("line", { x1: 0, y1: 0, x2: 0, y2: 5, class: "hl" }, pt);
  A = "url(#ar" + n + ")"; HAT = "url(#hat" + n + ")";
  cam = mk("g", { id: "cam" }, sv);
  rr(20, 20, 1660, 1020, 16, "border");
}
function dimH(x1, x2, y, e1, e2, l, o) { o = o || {}; [[x1, e1], [x2, e2]].forEach(([x, e]) => { if (e == null) return; const s = Math.sign(y - e) || 1; mk("line", { x1: x, y1: e + s * 3, x2: x, y2: y + s * 5, class: "ext" }); });
  if (x2 - x1 >= 28) mk("line", { x1, y1: y, x2, y2: y, class: "dl", "marker-start": A, "marker-end": A }); else { mk("line", { x1: x1 - 13, y1: y, x2: x1, y2: y, class: "dl", "marker-end": A }); mk("line", { x1: x2 + 13, y1: y, x2, y2: y, class: "dl", "marker-end": A }); mk("line", { x1, y1: y, x2, y2: y, class: "dl" }); }
  tx((x1 + x2) / 2 + (o.dx || 0), (o.below ? y + 13 : y - 4) + (o.dy || 0), l, o.c || "dt", { "text-anchor": "middle" }); }
function dimV(y1, y2, x, e1, e2, l, o) { o = o || {}; [[y1, e1], [y2, e2]].forEach(([y, e]) => { if (e == null) return; const s = Math.sign(x - e) || 1; mk("line", { x1: e + s * 3, y1: y, x2: x + s * 5, y2: y, class: "ext" }); });
  if (y2 - y1 >= 28) mk("line", { x1: x, y1, x2: x, y2, class: "dl", "marker-start": A, "marker-end": A }); else { mk("line", { x1: x, y1: y1 - 13, x2: x, y2: y1, class: "dl", "marker-end": A }); mk("line", { x1: x, y1: y2 + 13, x2: x, y2, class: "dl", "marker-end": A }); mk("line", { x1: x, y1, x2: x, y2, class: "dl" }); }
  const c = (y1 + y2) / 2; if (o.side) { const r = o.side === "r"; tx(r ? x + 6 : x - 6, c + 4, l, o.c || "dt", { "text-anchor": r ? "start" : "end" }); } else tx(x - 5, c, l, o.c || "dt", { "text-anchor": "middle", transform: "rotate(-90 " + (x - 5) + " " + c + ")" }); }
function callout(px, py, ex, ey, l, dir, c) { const s = dir || (ex >= px ? 1 : -1); mk("circle", { cx: px, cy: py, r: 1.8, class: "dot" }); mk("polyline", { points: px + "," + py + " " + ex + "," + ey + " " + (ex + s * 10) + "," + ey, class: "lead" }); tx(ex + s * 14, ey + 4, l, c || "dt", { "text-anchor": s > 0 ? "start" : "end" }); }
function rad(cx, cy, r, c, l, L) { const sx = c.includes("l") ? -1 : 1, sy = c.includes("t") ? -1 : 1; const ox = cx - sx * r, oy = cy - sy * r; const px = ox + sx * r * Math.SQRT1_2, py = oy + sy * r * Math.SQRT1_2; callout(px, py, px + sx * L, py + sy * L, l, sx); }
function nb(x, y, n) { mk("rect", { x: x - 6, y: y - 6, width: 12, height: 12, class: "nb" }); tx(x, y + 3.5, String(n), "nbt", { "text-anchor": "middle" }); }
function rr(x, y, w, h, r, c, extra) { return mk("rect", Object.assign({ x, y, width: w, height: h, rx: r, class: c }, extra || {})); }
function slotLabel(x, y, w, h, l, al) { if (!l) return; tx(al === "l" ? x + 6 : x + w / 2, y + h / 2 + 3.2, l, "sl", { "text-anchor": al === "l" ? "start" : "middle" }); }
function vtitle(x, y, t, s) { tx(x, y, t, "vt", { "text-anchor": "middle" }); if (s) tx(x, y + 14, s, "dts", { "text-anchor": "middle" }); }
function notesBlock(list) { const NX = 50, NY = 58; tx(NX, NY, "NOTES:", "nth"); tx(NX + 62, NY, "(UNLESS OTHERWISE SPECIFIED)", "nt");
  list.forEach(([n, t], i) => { const y = NY + 30 + i * 24; if (n) { nb(NX + 6, y - 4, n); tx(NX + 22, y, t, "nt"); } else tx(NX, y, t, "nt"); }); }
function table(x, y, ttl, rows) { const ws = [40, 88, 96], rh = 17; tx(x, y - 8, ttl, "vt");
  const all = [["Code", "Variable", "Value"]].concat(rows); all.forEach((r, i) => { let cx2 = x; r.forEach((c, j) => { mk("rect", { x: cx2, y: y + i * rh, width: ws[j], height: rh, class: "thin" }); tx(cx2 + (j ? ws[j] / 2 : 6), y + i * rh + 12, String(c), i ? "tc" : "th", { "text-anchor": j ? "middle" : "start" }); cx2 += ws[j]; }); }); return y + all.length * rh + 36; }
function detailRef(cx, cy, r, lbl, lx, ly) { mk("circle", { cx, cy, r, class: "ph" }); const a = Math.atan2(ly - cy, lx - cx); mk("line", { x1: cx + r * Math.cos(a), y1: cy + r * Math.sin(a), x2: lx, y2: ly, class: "lead" }); tx(lx + (lx < cx ? -4 : 4), ly + 4, lbl, "dts", { "text-anchor": lx < cx ? "end" : "start" }); }
const CLS = { header: "well", bar: "well", rail: "thin", railfill: "hug", region: "well", card: "obj", slot: "slot", input: "hug", ctl: "hug", chip: "hug", nav: "slot", brand: "hug", navitem: "slot", canvas: "slot", marker: "hug", image: "slot", phantom: "ph" };

/* ---------- the sheet ---------- */
function drawSheet(V, M) {
  begin("sheet");
  const k = .5, PX = 600, PY = 150, X = v => PX + v * k, Y = v => PY + v * k;
  /* plan view */
  rr(X(0), Y(0), 1280 * k, 800 * k, 0, "obj");
  M.P.forEach(p => {
    const cls = CLS[p.k] || "thin", attrs = { x: X(p.x), y: Y(p.y), width: p.w * k, height: p.h * k, rx: (p.r || 0) * k, class: cls };
    if (p.k === "marker") mk("circle", { cx: X(p.x + 12), cy: Y(p.y + 12), r: 12 * k, class: "hug" });
    else if (p.k === "header" || p.k === "bar") { mk("rect", Object.assign(attrs, { class: "well" })); mk("line", { x1: X(0), y1: Y(p.k === "header" ? p.h : p.y), x2: X(1280), y2: Y(p.k === "header" ? p.h : p.y), class: "ph" }); }
    else if (p.k === "image") { mk("rect", attrs); mk("path", { d: `M${X(p.x)},${Y(p.y)} l${p.w * k},${p.h * k} M${X(p.x + p.w)},${Y(p.y)} l${-p.w * k},${p.h * k}`, class: "thin" }); }
    else if (p.k === "phantom") { mk("rect", attrs); tx(X(p.x + p.w / 2), Y(p.y + p.h) - 6, p.l, "dts", { "text-anchor": "middle" }); }
    else mk("rect", attrs);
    if (p.l && p.k !== "phantom" && p.h * k >= 9 && p.w * k >= p.l.length * 5.6 + 8) slotLabel(X(p.x), Y(p.y), p.w * k, p.h * k, p.l, p.w * k > 200 && /CONTENT|CANVAS|LEDE|SEARCH|TOOL SLOT|VALUE/.test(p.l) ? "l" : undefined);
  });
  mk("line", { x1: X(-16), y1: Y(V.H0 / 2), x2: X(1296), y2: Y(V.H0 / 2), class: "cl" });
  mk("line", { x1: X(640), y1: Y(-16), x2: X(640), y2: Y(816), class: "cl" });
  const ty = Y(-30); let sh = 0; M.dims.top.forEach(([a, b, l, c]) => { const short = (b - a) * k < 18; dimH(X(a), X(b), ty, Y(0), Y(0), l, { c, dy: short ? (sh++ % 2 ? -10 : 0) : 0 }); });
  dimH(X(0), X(1280), Y(-60), Y(-34), Y(-34), "VW = 1280 · REFERENCE"); tx(X(640), Y(-94), "DESKTOP VIEWPORT · NARROWER SCREENS STACK (PHONE VIEW)", "dts", { "text-anchor": "middle" });
  const lx = X(-50); M.dims.left.forEach(([a, b, l, c]) => dimV(Y(a), Y(b), lx, X(0), X(0), l, c ? { c } : undefined));
  dimV(Y(0), Y(800), X(-90), X(-54), X(-54), "VH = 800 (REF)");
  M.dims.right.forEach(([a, b, l, c]) => dimV(Y(a), Y(b), X(1312), X(1280), X(1280), l, { side: "r", c }));
  const by = Y(830); M.dims.bottom.forEach(([a, b, l, c]) => dimH(X(a), X(b), by, Y(800), Y(800), l, { below: true, c }));
  M.rads.forEach(([cx, cy, r, c, l]) => { if (r > 0) rad(X(cx), Y(cy), r * k, c, l, 22); else callout(X(cx), Y(cy), X(cx) + (c.includes("l") ? -26 : 26), Y(cy) + (c.includes("b") ? -12 : 12), l + " = 0", c.includes("l") ? -1 : 1); });
  M.refs.forEach(([cx, cy, r, l, lx2, ly2]) => detailRef(X(cx), Y(cy), r * k, l, X(lx2), Y(ly2)));
  nb(X(640), Y(V.H0 + 14), 1);
  const nx = { steps: [X(1140), Y(140)], scroll: [X(1100), Y(300)], workspace: [X(40), Y(330)], board: [X(640), Y(300)], grid: [X(1180), Y(130)] }[M.L]; nb(nx[0], nx[1], 2); nb(nx[0] + 18, nx[1], 3);
  nb(X(820), Y(V.H0 / 2), 4);
  vtitle(X(640), Y(890), "Plan view · " + opt("proto_layout"), "Scale 0.5:1 · reference viewport 1280 × 800 · slots, not content");

  /* exploded view */
  { const sc = .25, TX = 330, TY = 760, gap = 34, a = .94 * sc, b = .17 * sc, c = -.34 * sc, dd = .47 * sc;
    const Pt = (x, y, z) => [TX + a * x + c * y, TY + b * x + dd * y - z];
    const Gz = z => mk("g", { transform: "matrix(" + a + "," + b + "," + c + "," + dd + "," + TX + "," + (TY - z) + ")" });
    const R2 = (g, x, y, w, h, r, cls, extra) => mk("rect", Object.assign({ x, y, width: w, height: h, rx: r, class: cls, "vector-effect": "non-scaling-stroke" }, extra || {}), g);
    [[0, 0], [1280, 0], [1280, 800], [0, 800]].forEach(([x, y]) => { const p1 = Pt(x, y, gap), p2 = Pt(x, y, gap * 5); mk("line", { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: "ph" }); });
    let g = Gz(0); R2(g, -60, -60, 1400, 920, 0, "thin", { fill: HAT, "fill-opacity": .35 });
    g = Gz(gap); R2(g, 0, 0, 1280, 800, 0, "obj");
    for (let z = 2; z <= 5; z++) { g = Gz(gap * z); M.P.filter(p => p.z === z).forEach(p => R2(g, p.x, p.y, p.w, p.h, p.r || 0, CLS[p.k] === "ph" ? "ph" : (CLS[p.k] || "thin"))); }
    const LX = 236;
    M.layers.forEach(([t, s], i) => { const p1 = Pt(i === 0 ? -60 : 0, i === 0 ? 860 : 800, i === 0 ? 0 : gap * i); mk("circle", { cx: p1[0], cy: p1[1], r: 1.8, class: "dot" }); mk("polyline", { points: p1[0] + "," + p1[1] + " " + (LX + 10) + "," + p1[1] + " " + LX + "," + p1[1], class: "lead" }); tx(LX - 4, p1[1] - 2, t, "vt", { "text-anchor": "end" }); tx(LX - 4, p1[1] + 11, s, "dts", { "text-anchor": "end" }); });
    vtitle(420, 1000, "Exploded view", "Axonometric · layer gaps not to scale"); }

  /* phone view */
  { const s = .3, VX = 62, VY = 340, vw = 390 * s, vh = 844 * s, h0 = V.H0 * .85 * s;
    rr(VX, VY, vw, vh, 8, "obj"); rr(VX, VY, vw, h0, 0, "well"); mk("circle", { cx: VX + 8, cy: VY + h0 / 2, r: 4, class: "hug" }); mk("rect", { x: VX + vw - 16, y: VY + h0 / 2 - 4, width: 10, height: 8, class: "slot" });
    const blocks = { steps: [["RAIL", 2], ["CARD · FILL", 150], ["ACTIONS", 14], ["STATUS", 8]], scroll: [["HERO", 50], ["SECTION 1", 50], ["SECTION 2", 50], ["SECTION 3", 50], ["EXPORT BAR", 18]], workspace: [["LIST · TABS", 14], ["CANVAS · FILL", 140], ["NOTES · SHEET", 40], ["ACTIONS", 14]], board: [["CANVAS · FILL", 150], ["DRAWER · SHEET", 60], ["ACTIONS", 14]], grid: [["SEARCH · FILTERS", 14], ["CARD", 56], ["CARD", 56], ["CARD", 56], ["PANEL · SHEET", 30]] }[M.L];
    let y = VY + h0 + 3, pad = 4; blocks.forEach(([l, h]) => { const hh = Math.min(h, VY + vh - 3 - y); if (hh <= 2) return; rr(VX + pad, y, vw - 2 * pad, hh, 0, l === "RAIL" ? "hug" : /STATUS|ACTIONS|BAR|TABS|FILTERS/.test(l) ? "hug" : "slot"); if (hh > 9) tx(VX + vw / 2, y + hh / 2 + 3, l, "sl", { "text-anchor": "middle", style: "font-size:6.5px" }); y += hh + 3; });
    dimH(VX, VX + vw, VY - 14, VY, VY, "390"); dimV(VY, VY + vh, VX - 14, VX, VX, "844");
    callout(VX + vw - 6, VY + h0 / 2, VX + vw + 24, VY + 30, "MENU · HUG", 1, "dts");
    vtitle(VX + vw / 2, VY + vh + 32, "Phone view", "Scale 0.3:1 · one column"); }

  /* detail A · control 2:1 */
  { const DX = 580, DY = 700, q = 2, w = 100 * q, h = V.H3 * q, r = V.R3 * q, t1 = V.T1 * q, y0 = DY + (t1 - h) / 2;
    mk("rect", { x: DX, y: y0, width: w, height: h, rx: r, class: "hug" }); slotLabel(DX, y0, w, h, "PRIMARY · HUG");
    mk("rect", { x: DX - 8, y: DY, width: w + 16, height: t1, class: "env" });
    mk("rect", { x: DX - 6, y: y0 - 6, width: w + 12, height: h + 12, rx: r + 6, class: "ph" });
    dimV(y0, y0 + h, DX - 22, DX, DX, "H3", { side: "l" }); dimV(DY, DY + t1, DX + w + 22, DX + w + 8, DX + w + 8, "T1 ≥ 44", { side: "r" });
    dimH(DX, DX + 12 * q, DY + t1 + 16, y0 + h, y0 + h, "S5", { below: true, dx: -4 }); dimH(DX + 12 * q, DX + w - 12 * q, DY + t1 + 16, null, y0 + h, "HUG · LABEL", { below: true, c: "dts" }); dimH(DX + w - 12 * q, DX + w, DY + t1 + 16, null, y0 + h, "S5", { below: true, dx: 6 });
    if (V.R3 > 0) rad(DX + w, y0 + h, r, "br", "R3", 18); else callout(DX + w, y0 + h, DX + w + 30, y0 + h + 16, "R3 = 0", 1);
    tx(DX + w + 64, DY + 8, "FOCUS RING 3 PX, OFFSET 3", "dts"); tx(DX + w + 64, DY + 22, "SECONDARY: 2 PX OUTLINE", "dts"); tx(DX + w + 64, DY + 36, "HIT AREA ≥ T1 (DASH-DOT)", "dts");
    vtitle(DX + 150, DY + t1 + 56, "Detail A · control", "Scale 2:1 · hit area vs drawn height"); }

  /* detail B · nested corner 4:1 */
  { const K = 4, CX = 1010, CY = 806, Pc = (u, v) => [CX + u * K, CY - v * K], R1 = V.R1, R2 = V.R2;
    const arc = (o, r) => { const a1 = Pc(o, 36), a2 = Pc(o, r + o), a3 = Pc(r + o, o), a4 = Pc(36, o); return r > 0 ? "M" + a1 + " L" + a2 + " A" + r * K + " " + r * K + " 0 0 0 " + a3 + " L" + a4 : "M" + a1 + " L" + Pc(o, o) + " L" + a4; };
    mk("path", { d: arc(0, R1), class: "obj", fill: "none" }); mk("path", { d: arc(V.B, Math.max(0, R1 - V.B)), class: "thin" }); mk("path", { d: arc(V.B + V.S6, R2), class: "slot" });
    const cc = Pc(Math.max(R1, 8), Math.max(R1, 8)); mk("path", { d: "M" + (cc[0] - 6) + "," + cc[1] + " h12 M" + cc[0] + "," + (cc[1] - 6) + " v12", class: "thin" });
    dimH(Pc(0, 0)[0], Pc(V.B, 0)[0], Pc(0, 40)[1], Pc(0, 36)[1], Pc(V.B, 36)[1], "B", { dx: -10 }); dimH(Pc(V.B, 0)[0], Pc(V.B + V.S6, 0)[0], Pc(0, 40)[1], null, Pc(V.B + V.S6, 36)[1], "S6", { dx: 12 });
    tx(Pc(12, 26)[0], Pc(12, 26)[1], "R2 = R1 − B − S6 = " + R2, "dt"); tx(Pc(12, 20)[0], Pc(12, 20)[1], "R1 = " + R1 + (R1 === 0 ? " · SQUARE" : ""), "dt");
    vtitle(CX + 72, CY + 40, "Detail B · nested corner", "Scale 4:1 · card and inner slot"); }

  /* radius details 2:1 */
  { const q = 2, y0 = 790, Lq = 30, items = [["R1", "Card", V.R1], ["R2", "Inner slot", V.R2], ["R3", "Control", V.R3]];
    items.forEach(([c, n, r], i) => { const x0 = 1210 + i * 72, Pc = (u, v) => [x0 + u * q, y0 - v * q]; const rr2 = Math.min(r, Lq);
      mk("path", { d: rr2 > 0 ? "M" + Pc(0, Lq) + " L" + Pc(0, rr2) + " A" + rr2 * q + " " + rr2 * q + " 0 0 0 " + Pc(rr2, 0) + " L" + Pc(Lq, 0) : "M" + Pc(0, Lq) + " L" + Pc(0, 0) + " L" + Pc(Lq, 0), class: "obj", fill: "none" });
      if (rr2 > 0) { const cc = Pc(rr2, rr2); mk("path", { d: "M" + (cc[0] - 4) + "," + cc[1] + " h8 M" + cc[0] + "," + (cc[1] - 4) + " v8", class: "thin" }); const a = 225 * Math.PI / 180; mk("line", { x1: cc[0], y1: cc[1], x2: cc[0] + rr2 * q * Math.cos(a), y2: cc[1] - rr2 * q * Math.sin(a), class: "dl", "marker-end": A }); }
      tx(x0 + Lq * q / 2 + 4, y0 - Lq * q + 12, c + " = " + r, "dt"); tx(x0, y0 + 16, n, "dts"); });
    vtitle(1310, y0 + 44, "Radius details", "Scale 2:1 · R4 pill = " + V.R4); }

  /* detail C · type scale */
  { const DX = 580, DY = 876, names = [["T4", "Display", V.T4], ["T3", "Heading", V.T3], ["T2", "Subhead", V.T2], ["T1", "Body", V.T1s]]; let y = DY;
    names.forEach(([c, n, s]) => { const h = Math.max(12, s * .55), w = Math.min(280, s * 6); mk("rect", { x: DX + 60, y: y, width: w, height: h, class: "hug" }); tx(DX + 66, y + h / 2 + 3.2, n.toUpperCase() + " SLOT · " + (V.ty === 2 && c !== "T1" ? "CAPS" : "MIXED"), "sl"); dimV(y, y + h, DX + 48, DX + 60, DX + 60, c + " " + s, { side: "l" }); y += h + 9; });
    tx(DX + 60, y + 10, "LH = " + V.LH + " · MEASURE ≤ 70 CH · " + { 0: "SERIF · EDITORIAL", 1: "SANS · INSTITUTIONAL", 2: "DISPLAY · BOLD CAPS" }[V.ty], "dts");
    vtitle(DX + 190, y + 40, "Detail C · type scale", "Scale 0.55:1 · sizes in CSS px"); }

  /* detail D · motion */
  { const DX = 1060, DY = 890, w = 330; mk("line", { x1: DX, y1: DY + 40, x2: DX + w, y2: DY + 40, class: "thin" });
    const ms = V.M1, px = ms === 0 ? 0 : Math.max(40, ms / 600 * w);
    if (ms > 0) { mk("path", { d: `M${DX},${DY + 40} C${DX + px * .4},${DY + 40} ${DX + px * .6},${DY} ${DX + px},${DY}`, class: "dl" }); mk("rect", { x: DX, y: DY - 2, width: px, height: 44, class: "env" }); dimH(DX, DX + px, DY + 60, DY + 40, DY + 40, "M1 = " + ms + " MS", { below: true }); tx(DX + px + 10, DY + 6, "EASE-OUT · NO BOUNCE", "dts"); }
    else { tx(DX, DY + 20, "M1 = 0 · NO TRANSITIONS BY CHOICE", "dts"); }
    tx(DX, DY + 92, "PREFERS-REDUCED-MOTION → M1 = 0", "dts");
    vtitle(DX + w / 2, DY + 130, "Detail D · motion", "Duration of fades and slides"); }

  notesBlock(M.notes);
  const ex = exportsChosen();
  const T = { spacing: [["S1", "page-pad", V.S1], ["S2", "card-pad", V.S2], ["S3", "stack-gap", V.S3], ["S4", "small-gap", V.S4], ["S5", "control-pad-x", V.S5], ["S6", "inner-inset", V.S6]],
    size: [["H0", "header-h", V.H0], ["H2", "bar-h", V.H2], ["H3", "control-h", V.H3], ["H4", "rail-h", V.H4], ["H5", "input-h", V.H5], ["Z1", "brand-size", V.Z1], ["Z2", "marker-size", V.Z2], ["T1", "touch-min", V.T1], ["B", "border", V.B], ["W1", "side-col", V.W1], ["W2", "card-w", V.W2], ["W3", "drawer-w", V.W3], ["W4", "panel-w", V.W4]],
    radius: [["R1", "r-card", V.R1], ["R2", "r-inner", "R1−B−S6 = " + V.R2], ["R3", "r-control", V.R3], ["R4", "r-pill", V.R4]],
    type: [["T4", "display", V.T4], ["T3", "heading", V.T3], ["T2", "subhead", V.T2], ["T1", "body", V.T1s], ["LH", "line-height", V.LH]],
    motion: [["M1", "duration", V.M1 + " ms"], ["E", "easing", V.M1 ? "ease-out" : "none"]],
    viewport: [["VW", "desktop-w", "1280 ref"], ["VP", "phone-w", "390 ref"], ["V2", "page-margin", "[TBD]"], ["EX", "exports", ex.length ? ex.length + " chosen" : "[TBD]"]] };
  let y = table(1426, 86, "Spacing", T.spacing); y = table(1426, y, "Size", T.size); y = table(1426, y, "Radius", T.radius); y = table(1426, y, "Type", T.type); y = table(1426, y, "Motion", T.motion); table(1426, y, "Viewport & exports", T.viewport);
  sv.setAttribute("aria-label", `Dimensional drawing of ${title()}: plan view of a ${opt("proto_layout").toLowerCase()} layout with slots and variable dimensions, exploded layers, phone view, control, corner, radius, type and motion details, and variable tables.`);
}

/* ---------- film: the sheet draws itself ---------- */
let film = null;
function playFilm() {
  if (film) cancelAnimationFrame(film.raf);
  const els = $$("#cam *").filter(e => /^(rect|line|path|circle|polyline|text|g)$/.test(e.tagName) && e.tagName !== "g");
  const PLAN = { cx: 880, cy: 350 }, EXP = { cx: 330, cy: 760 };
  const CAM = [{ t: 0, cx: 640, cy: 200, z: 2.4 }, { t: 2.2, cx: PLAN.cx, cy: PLAN.cy, z: 1.55 }, { t: 4.6, cx: EXP.cx + 60, cy: EXP.cy - 60, z: 1.6 }, { t: 7.4, cx: 850, cy: 530, z: 1 }, { t: 9.5, cx: 850, cy: 530, z: .99 }];
  const total = 9.5, n = els.length, stag = 8.2 / n;
  const kind = e => { const c = e.getAttribute("class") || ""; if (e.tagName === "text" || /slot|ph|cl|env|hl/.test(c)) return "f"; return "d"; };
  const items = els.map((e, i) => { const kd = kind(e); const t0 = i * stag, du = kd === "d" ? .55 : .35;
    if (kd === "d") { e.setAttribute("pathLength", "1"); e.style.strokeDasharray = "1 2"; e.style.strokeDashoffset = "1"; if (e.getAttribute("class") && /obj|well|hug|nb/.test(e.getAttribute("class"))) e.style.fillOpacity = "0"; }
    else e.style.opacity = "0";
    return { e, kd, t0, du, fill: kd === "d" && /obj|well|hug|nb/.test(e.getAttribute("class") || "") }; });
  const eio = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, eo = p => 1 - Math.pow(1 - p, 3), cl = v => Math.max(0, Math.min(1, v));
  const start = performance.now();
  const frame = now => { const t = (now - start) / 1000;
    let a = CAM[0], b = CAM[CAM.length - 1]; for (let i = 0; i < CAM.length - 1; i++) if (t >= CAM[i].t && t <= CAM[i + 1].t) { a = CAM[i]; b = CAM[i + 1]; }
    const p = a === b ? 1 : eio(cl((t - a.t) / (b.t - a.t))), z = Math.exp(a.z === b.z ? Math.log(a.z) : Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * p), cx = a.cx + (b.cx - a.cx) * p, cy = a.cy + (b.cy - a.cy) * p;
    cam.setAttribute("transform", `translate(${850 - cx * z} ${530 - cy * z}) scale(${z})`);
    items.forEach(it => { const q = cl((t - it.t0) / it.du); if (it.kd === "d") { it.e.style.strokeDashoffset = String(1 - eio(q)); if (it.fill) it.e.style.fillOpacity = String(cl((q - .55) / .45)); } else it.e.style.opacity = String(eo(q)); });
    if (t < total) film.raf = requestAnimationFrame(frame); else { film = null; $("#playFilm").disabled = false; } };
  film = { raf: requestAnimationFrame(frame) }; $("#playFilm").disabled = true;
}
function resetFilm() { if (film) cancelAnimationFrame(film.raf); film = null; $("#playFilm").disabled = false; }

/* ---------- mock (phases 2–4) ---------- */
const PALETTES = {
  university: { p: "#14213D", a: "#CE1126", bg: "#FFFFFF", card: "#F4F5F7", ink: "#222", line: "#D5D9E0" },
  subject: { "learning-app": { p: "#0F4C5C", a: "#E09F3E", bg: "#F7F4EE", card: "#FFFFFF", ink: "#1E2A2E", line: "#D9D2C5" }, "game-sim": { p: "#2B2D42", a: "#EF8354", bg: "#FDF6EC", card: "#FFFFFF", ink: "#23242F", line: "#E3D7C6" }, "research-data": { p: "#1B4332", a: "#40916C", bg: "#F3F7F2", card: "#FFFFFF", ink: "#1C2B22", line: "#CFDCD3" }, friction: { p: "#4A3F35", a: "#B5651D", bg: "#FBF7F0", card: "#FFFFFF", ink: "#2A2520", line: "#E0D6C8" }, "faculty-tool": { p: "#1F3A5F", a: "#6C8EAD", bg: "#F4F6F9", card: "#FFFFFF", ink: "#1E2633", line: "#D3DAE4" }, showcase: { p: "#3B1F2B", a: "#C9A227", bg: "#F8F3EA", card: "#FFFFFF", ink: "#2B1E24", line: "#E2D8C8" } },
  surprise: [{ p: "#5B2A86", a: "#F4B400", bg: "#FFF8E7", card: "#FFFFFF", ink: "#2A1E36", line: "#E6D9C2" }, { p: "#0B3D2E", a: "#FF6B35", bg: "#EEF6F2", card: "#FFFFFF", ink: "#12241D", line: "#C9DACF" }, { p: "#23395B", a: "#FFD166", bg: "#F6F7FB", card: "#FFFFFF", ink: "#1C2537", line: "#D3D8E6" }],
};
function palette() { const c = opt("look_colors"); if (c === "University colors") return PALETTES.university; if (c === "Colors that fit the subject") return PALETTES.subject[path()]; let h = 0; for (const ch of title()) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTES.surprise[h % 3]; }
const ST = { step: 0, topnav: 0, nav: 0, drawer: true, sel: null, sec: 0, chip: 0 };
let phase = "draw";
function renderMock() {
  const V = vars(), M = model(V, ST), pal = palette(), page = $("#mockPage"), host = $("#mock");
  host.className = "mock ph-" + phase; host.dataset.layout = M.L;
  const fonts = { 0: ["'IBM Plex Serif',Georgia,serif", "'IBM Plex Serif',Georgia,serif", "none", 500], 1: ["'IBM Plex Sans',Arial,sans-serif", "'IBM Plex Sans',Arial,sans-serif", "none", 700], 2: ["'IBM Plex Sans',Arial,sans-serif", "'Archivo','Arial Black',sans-serif", "uppercase", 800] }[V.ty];
  page.style.cssText = `--p:${pal.p};--a:${pal.a};--bg:${pal.bg};--card:${pal.card};--ink:${pal.ink};--line:${pal.line};--fb:${fonts[0]};--fh:${fonts[1]};--tt:${fonts[2]};--fw:${fonts[3]};--r1:${V.R1}px;--r3:${V.R3}px;--pill:${V.R4 === "h ÷ 2" ? "999px" : V.R3 + "px"};--ms:${reduced ? 0 : V.M1}ms;--t1:${V.T1s}px;--t2:${V.T2}px;--t3:${V.T3}px;--t4:${V.T4}px;--lh:${V.LH};--s2:${V.S2}px;--stretch:${V.ty === 2 ? "125%" : "100%"}`;
  const bars = (w, h, kind) => { const n = Math.max(1, Math.min(kind === "lede" ? 2 : 8, Math.floor(h / 22))); return `<span class="bars" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i style="width:${i === n - 1 ? 55 : 86 + (i * 7) % 12}%"></i>`).join("")}</span>`; };
  page.innerHTML = M.P.map((p, i) => {
    const st = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;border-radius:${p.k === "marker" ? "50%" : (p.r || 0) + "px"}`;
    const wire = phase === "wire";
    let inner = "";
    if (wire) inner = p.l && p.w >= 60 && p.h >= 14 ? `<span class="lbl">${esc(p.l)}</span>` : "";
    else if (p.txt != null && p.k !== "input") inner = `<span class="t">${esc(p.txt)}</span>`;
    else if (p.k === "input") inner = `<span class="t ph">${esc(p.txt || "")}</span>`;
    else if (p.k === "image") inner = `<span class="img" aria-hidden="true"></span>`;
    else if (/content|lede|note|key|meta/.test(p.kind || "")) inner = bars(p.w, p.h, p.kind);
    else if (p.k === "phantom") inner = "";
    const interactive = phase === "proto" && p.act;
    const tag = interactive ? "button" : "div";
    return `<${tag} class="mp mp-${p.k}${p.on ? " on" : ""}${p.pri ? " pri" : ""}${p.kind ? " k-" + p.kind : ""}" style="${st}"${interactive ? ` type="button" data-act="${esc(p.act)}"` : ""}${p.k === "phantom" ? (phase === "wire" ? "" : " hidden") : ""}>${inner}</${tag}>`;
  }).join("");
  fitMock();
}
function fitMock() { const host = $("#mockFrame"); const w = host.clientWidth; $("#mockPage").style.transform = `scale(${w / 1280})`; host.style.height = (w / 1280 * 800) + "px"; }
function act(a) {
  const [k, v] = a.split(":"), i = v == null ? null : +v;
  if (k === "next") ST.step = Math.min(3, ST.step + 1);
  else if (k === "back") ST.step = Math.max(0, ST.step - 1);
  else if (k === "download") { toast("In the finished build, this downloads an HTML report you can print, keep, or upload to Blackboard."); return; }
  else if (k === "print") { toast("In the finished build, this opens the print dialog so you can save a PDF."); return; }
  else if (k === "topnav") ST.topnav = i;
  else if (k === "nav") ST.nav = i;
  else if (k === "drawer") ST.drawer = !ST.drawer;
  else if (k === "pick") { ST.sel = i; ST.drawer = true; }
  else if (k === "choose") { toast(ST.sel == null ? "Pick a marker on the canvas first." : `Marker ${ST.sel + 1} chosen. In the real build, the canvas would change to show the consequence.`); return; }
  else if (k === "sel") ST.sel = i;
  else if (k === "close") ST.sel = null;
  else if (k === "chip") ST.chip = i;
  else if (k === "sec") ST.sec = i;
  else if (k === "zoom") { toast("Zoom controls. In the real build the canvas would zoom."); return; }
  else if (k === "tool") { toast("A tool button. In the real build it would act on the content."); return; }
  else if (k === "cta") { toast("The header action. In a guided build it starts the first step."); return; }
  renderMock();
}

/* ---------- page ---------- */
const PHASES = [
  { id: "draw", n: 1, t: "Drawing", d: "Before any code, AIG draws the architecture: slots, spacing, radii and layers, measured with variable codes. You check the shape of the thing, not the words in it." },
  { id: "wire", n: 2, t: "Wireframe", d: "The same geometry in a browser. Gray boxes with labels, no type and no color yet. You check what goes where and in what order." },
  { id: "style", n: 3, t: "Styled", d: "Type, color, corners and spacing applied. Text is structural (titles, buttons, step names), and content is still placeholder bars. You check the feel." },
  { id: "proto", n: 4, t: "Prototype", d: "Clickable. Buttons move between steps, open drawers and panels, and show what happens on download. You check the experience, then AIG builds the real one." },
];
function renderControls() {
  const p = G.pathById(path());
  $("#pathNote").innerHTML = S.primary ? `Pathway from your form: <b>${esc(p.title)}</b>. <a href="form.html#s-pathway">Change it in the form</a>.` : `No pathway chosen yet, so this uses <b>${esc(p.title)}</b>. <a href="form.html#s-pathway">Choose one in the form</a>.`;
  $("#titleNote").textContent = S.answers.title ? `Working title: ${S.answers.title}` : "No working title yet. The sheet says \"Your build\" until you add one in the form.";
  const ex = exportsChosen(); $("#exportNote").textContent = ex.length ? `Exports from your form: ${ex.join(", ")}.` : "No exports chosen yet in \"The idea\". The sheet marks them [TBD].";
  $("#choices").innerHTML = Object.entries(OPTS).map(([id, o]) => `<fieldset class="field"><legend>${esc(o.label)}</legend><div class="opts">${o.options.map(x => `<label class="opt"><input type="radio" name="${id}" value="${esc(x.v)}" data-fid="${id}"${opt(id) === x.v ? " checked" : ""}><span>${esc(x.v)}<small>${esc(x.d)}</small></span></label>`).join("")}</div></fieldset>`).join("");
}
function renderPhases() {
  $("#phaseTabs").innerHTML = PHASES.map(p => `<button type="button" role="tab" id="tab-${p.id}" aria-selected="${phase === p.id}" aria-controls="phasePanel" data-phase="${p.id}"><b>0${p.n}</b><span>${esc(p.t)}</span></button>`).join("");
  const p = PHASES.find(x => x.id === phase); $("#phaseDesc").textContent = p.d;
  $("#sheetWrap").hidden = phase !== "draw"; $("#mockWrap").hidden = phase === "draw";
  $("#mockHint").textContent = { wire: "Gray boxes only. Labels name each slot.", style: "Your type, colors, corners and spacing. Content stays as placeholder bars.", proto: "Click the buttons. Nothing is sent anywhere." }[phase] || "";
}
function renderAll() { const V = vars(), M = model(V, { step: 0, topnav: 0, nav: 0, drawer: true, sel: null, sec: 0, chip: 0 }); resetFilm(); drawSheet(V, M); renderTitleBlock(V); renderMock(); }
function renderTitleBlock(V) {
  const d = new Date().toISOString().slice(0, 10);
  $("#tbTitle").textContent = title(); $("#tbRev").textContent = "A · " + d; $("#tbSource").textContent = "Build form · " + G.pathById(path()).title;
  $("#tbFigs").innerHTML = [["S1 · page-pad", V.S1], ["H0 · header-h", V.H0], ["H3 · control-h", V.H3], ["R1 · r-card", V.R1], ["R2 · r-inner", "R1 − B − S6"], ["T1 · body", V.T1s + " / " + V.LH], ["M1 · motion", V.M1 + " ms"]].map(([l, v]) => `<div><div class="lbl">${esc(l)}</div><div class="v">${esc(v)}</div></div>`).join("");
  $("#sheetFoot").innerHTML = `<span>${d} &nbsp;|&nbsp; UI page reference · UI-PROTO-001</span><span><b>${esc(title())}, architecture</b> &nbsp;|&nbsp; 1</span>`;
}
function downloadSVG() {
  const c = sv.cloneNode(true); c.setAttribute("xmlns", NS); $("#cam", c).removeAttribute("transform"); $$("#cam *", c).forEach(e => { e.removeAttribute("style"); e.removeAttribute("pathLength"); });
  const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + c.outerHTML], { type: "image/svg+xml" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (title().replace(/[^\w]+/g, "-").toLowerCase() || "your-build") + "-dimensional-drawing.svg"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("Drawing downloaded as SVG");
}
document.addEventListener("change", e => { const el = e.target; if (!el.dataset.fid) return; S.answers[el.dataset.fid] = el.value; save(); $("#savedNote").textContent = "Saved to your build form just now."; renderAll(); });
document.addEventListener("click", e => {
  const t = e.target.closest("[data-phase]"); if (t) { phase = t.dataset.phase; renderPhases(); renderMock(); resetFilm(); return; }
  const a = e.target.closest("[data-act]"); if (a) { act(a.dataset.act); return; }
  if (e.target.closest("#playFilm")) { if (reduced) toast("Your system asks for reduced motion, so the sheet shows finished."); else playFilm(); }
  if (e.target.closest("#resetFilm")) renderAll();
  if (e.target.closest("#dlSvg")) downloadSVG();
  if (e.target.closest("#printSheet")) { document.body.classList.add("print-sheet"); window.print(); setTimeout(() => document.body.classList.remove("print-sheet"), 500); }
  if (e.target.closest("#resetProto")) { Object.assign(ST, { step: 0, topnav: 0, nav: 0, drawer: true, sel: null, sec: 0, chip: 0 }); renderMock(); }
});
addEventListener("resize", fitMock);
addEventListener("storage", e => { if (e.key === KEY) { try { S = Object.assign(blank(), JSON.parse(e.newValue) || {}); } catch {} renderControls(); renderAll(); } });
renderControls(); renderPhases(); renderAll();
})();
