/* The Grove Lab — build form engine. Vanilla JS, no build step.
   Renders js/schema.js, autosaves to localStorage, routes the "Here's my idea" box through Jev,
   and exports the response as a Word file, an HTML file, a printout, or plain text. */
(() => {
const G = window.GROVE, F = window.GROVE_FORM;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pct = p => Math.round((p ?? 0) * 100) + "%";
const KEY = "grovelab.v1";
const DEFAULT_ENDPOINT = "https://jev-sandbox-proxy.watkins-um.workers.dev";
const MAX_IDEA = 5000;

/* ---------- state ---------- */
const blankState = () => ({ v: 1, idea: "", answers: {}, primary: null, also: [], flagged: [], jev: null, aiChoice: null });
let S = (() => { try { return Object.assign(blankState(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return blankState(); } })();
S.answers ||= {}; S.also ||= []; S.flagged ||= [];
if (S.jev && !S.aiChoice) S.aiChoice = "ai"; // responses saved before the AI choice existed
let saveT;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); const el = $("#saved"), msg = "Saved in this browser at " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + ". Nothing is sent until you email it."; if (el.textContent !== msg) el.textContent = msg; }
    catch { $("#saved").textContent = "This browser isn't saving. Download a copy before you leave the page."; }
  }, 250);
}
const endpoint = () => S.endpoint || DEFAULT_ENDPOINT;
let toastT;
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); };

/* ---------- visibility ---------- */
const pathOn = id => S.primary === id || S.also.includes(id);
const secVisible = sec => sec.path ? pathOn(sec.path) : (sec.when ? sec.when(S) : true);
const fieldVisible = f => !f.when || f.when(S);
const realFields = sec => (sec.fields || []).filter(f => f.id && f.type !== "note");
function ordered() {
  const all = F.SECTIONS.slice(), i = all.findIndex(s => s.path);
  const paths = all.filter(s => s.path).sort((a, b) => (b.path === S.primary) - (a.path === S.primary));
  return [...all.slice(0, i), ...paths, ...all.filter((s, k) => k >= i && !s.path)];
}
/* Put the main pathway's section first. Compare only the section elements (the toolbar above them has no id),
   and move only the sections that are out of place: moving a section that holds the focused field blurs it
   and makes the page jump, so this must be a no-op while someone is typing. */
function reorderDom() {
  const main = $("#main"), want = ordered().map(s => s.id);
  const have = () => $$(":scope > section.f-sec", main).map(c => c.id);
  if (have().join() === want.join()) return;
  const y = scrollY, active = document.activeElement;
  let ref = $(":scope > section.f-sec", main);
  want.forEach(id => { const el = document.getElementById(id); if (el !== ref) main.insertBefore(el, ref); else ref = el.nextElementSibling; });
  if (active && active !== document.activeElement && document.contains(active)) active.focus({ preventScroll: true });
  window.scrollTo({ top: y, behavior: "instant" });
}

/* ---------- field rendering ---------- */
function helpAttr(f) { return f.help ? ` aria-describedby="h-${f.id}"` : ""; }
function labelHtml(f) { return esc(f.label) + (f.req ? ` <span class="req" aria-hidden="true">*</span><span class="sr"> (required)</span>` : ""); }
function optRow(f, o, type) {
  const v = typeof o === "string" ? o : o.v, d = typeof o === "string" ? "" : (o.d || "");
  return `<label class="opt"><input type="${type}" name="${f.id}" value="${esc(v)}" data-fid="${f.id}"${f.req && type === "radio" ? " required" : ""}><span>${esc(v)}${d ? `<small>${esc(d)}</small>` : ""}</span></label>`;
}
function shotFor(title) { const b = G.buildByTitle(title); return b ? b.shot : ""; }

function renderField(f, sec) {
  const help = f.help ? `<p class="help" id="h-${f.id}">${esc(f.help)}</p>` : "";
  const wrapAttrs = `data-field="${f.id || ""}"`;
  switch (f.type) {
    case "text": case "email": case "date":
      return `<div class="field" ${wrapAttrs}><label for="f-${f.id}">${labelHtml(f)}</label>${help}
        <input type="${f.type}" id="f-${f.id}" data-fid="${f.id}"${f.req ? " required aria-required=\"true\"" : ""}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ""}${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ""}${helpAttr(f)}></div>`;
    case "textarea":
      return `<div class="field" ${wrapAttrs}><label for="f-${f.id}">${labelHtml(f)}</label>${help}
        <textarea id="f-${f.id}" data-fid="${f.id}"${f.req ? " required aria-required=\"true\"" : ""}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ""}${f.tall ? ` style="min-height:260px"` : ""}${helpAttr(f)}></textarea></div>`;
    case "radio": case "checks":
      return `<fieldset class="field" ${wrapAttrs}${helpAttr(f)}><legend>${labelHtml(f)}</legend>${help}
        <div class="opts${f.cols ? " cols" : ""}">${f.options.map(o => optRow(f, o, f.type === "radio" ? "radio" : "checkbox")).join("")}</div></fieldset>`;
    case "compare": {
      const [a, b] = f.pair.map(t => G.buildByTitle(t));
      const card = (bd, says) => `<div class="vs-card"><div class="shot"><img src="${bd.shot}" alt="Screenshot of ${esc(bd.title)}" loading="lazy"></div>
        <div class="in"><h4>${esc(bd.title)}</h4><p>${esc(bd.description)}</p>
        <div class="says"><b>How it might have been asked</b>${esc(says)}</div>
        <a href="${bd.link}" target="_blank" rel="noopener">Open ${esc(bd.title)} live<span class="sr"> (opens in a new tab)</span> ↗</a></div></div>`;
      const opts = [`Closer to ${a.title}: ${f.choices[0]}`, `Closer to ${b.title}: ${f.choices[1]}`, "Somewhere in between", "Neither"];
      return `<div class="exemplar" ${wrapAttrs}><h3>From the gallery, side by side</h3>
        <div class="vs">${card(a, f.says[0])}${card(b, f.says[1])}</div>
        <fieldset class="field"><legend>${esc(f.question)}</legend>
        <div class="opts cols">${opts.map(o => optRow(f, o, "radio")).join("")}</div></fieldset></div>`;
    }
    case "note":
      return `<div class="exemplar" ${wrapAttrs}><h3>Preview it</h3><p style="margin:0 0 12px">${esc(f.text)}</p><a class="btn small ghost" href="${esc(f.link)}">${esc(f.linkText)}</a></div>`;
    case "lang": {
      const target = realFields(sec).find(x => x.type === "textarea");
      return `<div class="exemplar"><h3>Sample language</h3>
        <div class="lang"><div class="thin"><h4>Hard to build from</h4><p>${esc(f.thin)}</p></div>
        <div class="full"><h4>Ready to build from</h4><p>${esc(f.full)}</p></div>
        <p class="why">${esc(f.why)}</p></div>
        ${target ? `<button type="button" class="btn small ghost use-lang" data-lang-target="${target.id}" data-lang="${esc(f.full)}">Start from this sample in "${esc(target.label)}"</button>` : ""}</div>`;
    }
  }
  return "";
}

/* ---------- custom sections ---------- */
function renderIntake() {
  const q = G.QUOTES.build;
  return `<p class="eyebrow">Start here</p>
    <blockquote style="margin:6px 0 4px"><p class="quote">${esc(q.text)}</p></blockquote>
    <p class="cite">Marc Watkins, <a href="${q.url}" target="_blank" rel="noopener">${esc(q.title)}</a></p>
    <p class="help" style="margin-top:14px">Before you start, see <a href="guidelines.html#wont">what we won’t build</a>.</p>
    <div class="field"><label for="idea">Here's my idea</label>
      <p class="help" id="h-idea">Write it the way you'd say it to a colleague: what it is, who it's for, what people do with it. A few sentences is plenty. This becomes the start of your form whether or not you use AI.</p>
      <textarea id="idea" maxlength="${MAX_IDEA}" aria-describedby="h-idea" placeholder="Example: My intro biology students never connect lab readings to the pond on campus. I'd like a short simulation where they change one thing in a pond ecosystem and watch what ripples out, using real water data if it exists."></textarea></div>

    <fieldset class="ai-choice">
      <legend><span class="ai-badge">AI</span> Optional AI assistance</legend>
      <p class="ai-lead">You can ask an AI model to read your idea and suggest a build pathway, or skip it and choose for yourself. Your request is handled the same either way, and AIG reads every form in full.</p>
      <div class="ai-opts">
        <label class="ai-opt"><input type="radio" name="aiChoice" value="ai" data-ai>
          <span><b>Yes, use AI assistance</b>
          Jev, a small AI model from TypeSafe AI, reads only the text in the box above. It suggests a pathway, scores your idea on a readiness rubric, and flags things to plan for, with how sure it is about each. Your text is sent to TypeSafe AI through a proxy that keeps the API key private.</span></label>
        <label class="ai-opt"><input type="radio" name="aiChoice" value="noai" data-ai>
          <span><b>No, I'll work without AI</b>
          Nothing is sent anywhere. You choose your pathway yourself in the next section, using the descriptions and gallery examples. You can change your mind later.</span></label>
      </div>
      <div class="ai-guide">
        <div><h4>AI assistance may help if</h4><ul>
          <li>you aren't sure which pathway fits your idea</li>
          <li>your idea mixes several kinds of builds</li>
          <li>you'd like a quick check of what's still unclear before you fill out the form</li>
          <li>you're curious to see how a small AI model reads a request</li></ul></div>
        <div><h4>You may want to skip it if</h4><ul>
          <li>you already know which pathway fits</li>
          <li>your idea includes anything you'd rather not send to an outside AI service</li>
          <li>you'd rather think through the pathways yourself first</li>
          <li>you or your department avoid AI tools for this kind of work</li></ul></div>
        <p class="ai-either"><b>Either way:</b> Jev does not decide whether or how your idea gets built. It reads only your words and can be wrong. Its suggestions are labeled as AI-generated on this page and in your download, and you can remove them at any time.</p>
      </div>
    </fieldset>
    <div id="aiAction"></div>
    <div class="jev-out" id="jevOut" aria-live="polite" hidden></div>`;
}

function renderAiAction() {
  const box = $("#aiAction"); if (!box) return;
  if (S.aiChoice === "ai") {
    box.innerHTML = `<div class="intake-row">
        <button type="button" class="btn red" id="runJev">${S.jev ? "Ask Jev again" : "Get AI suggestions from Jev"}</button>
        <span class="status" id="jevStatus"><i></i><span>Checking Jev…</span></span>
        <button type="button" class="btn small ghost" id="openConn">Connection</button>
      </div>
      <p class="privacy-line" id="ideaPriv"><span class="ai-badge sm">AI</span> Pressing the button sends only the text in the idea box to Jev (TypeSafe AI) through a proxy that keeps the API key private. Please leave out student names or records. The rest of the form stays in your browser.</p>`;
    checkConn();
  } else if (S.aiChoice === "noai") {
    box.innerHTML = `<div class="intake-row"><button type="button" class="btn" id="noAiGo">Continue without AI</button>
      <span class="status on"><i></i><span>No AI is used. Nothing is sent.</span></span></div>`;
  } else box.innerHTML = `<p class="privacy-line">Choose an option above to continue. Nothing has been sent.</p>`;
}

function renderPicker() {
  const top = S.jev ? topPath(S.jev) : null;
  return `<div class="picker" role="group" aria-label="Build pathways">${G.PATHWAYS.map(p => `
    <div class="pick${S.primary === p.id ? " primary" : ""}" data-c="${p.color}" data-pick="${p.id}">
      ${top && top.id === p.id ? `<span class="jevtag">${S.jev.source === "jev" ? "AI suggestion" : "Keyword estimate"}: ${pct(top.p)}</span>` : ""}
      <h3>${p.n}. ${esc(p.title)}</h3><p>${esc(p.short)}</p>
      <div class="row">
        <label><input type="radio" name="primary" value="${p.id}" data-primary> Main pathway</label>
        <label><input type="checkbox" value="${p.id}" data-also> Also</label>
      </div>
      <p class="see"><a href="gallery.html#${p.id}">See ${G.BUILDS.filter(b => b.path === p.id).length} builds on this pathway</a></p>
    </div>`).join("")}</div>
    <p class="help" style="margin-top:14px" id="pathNote"></p>`;
}

function renderFlaggedList() {
  const list = S.flagged.map(t => G.buildByTitle(t)).filter(Boolean);
  if (!list.length) return `<p class="help" style="margin-top:18px">No gallery builds marked yet. <a href="gallery.html">Visit the gallery</a> and press "Close to my idea" on any build; it will show up here and in your download.</p>`;
  return `<div class="field"><p class="lab" style="font-weight:700;color:var(--navy)">Builds you marked close to your idea</p>
    <div class="flagged-builds">${list.map(b => `<span class="mini"><img src="${b.shot}" alt="">${esc(b.title)} <button type="button" class="flag" data-unflag="${esc(b.title)}" aria-label="Remove ${esc(b.title)}">×</button></span>`).join("")}</div>
    <div class="field"><label for="f-look_why">What do you like about the builds you marked?</label><textarea id="f-look_why" data-fid="look_why"></textarea></div></div>`;
}

function renderJevScope() {
  if (!S.jev) return S.aiChoice === "noai" ? "" : `<p class="help" style="margin-top:14px">Optional: if you choose AI assistance in step 1, Jev gives a second read on complexity here.</p>`;
  const r = S.jev.rubric.complexity, i = argmax(r), ai = S.jev.source === "jev";
  return `<div class="jev-card${ai ? " ai-made" : ""}" style="margin-top:16px">${ai ? `<p class="ai-label"><span class="ai-badge sm">AI</span> AI-generated suggestion · Jev (TypeSafe AI)</p>` : ""}<h3>${ai ? "Jev's" : "Keyword estimate's"} read on complexity</h3>
    <p style="margin:0 0 8px">${ai ? "Jev" : "The keyword estimate (not AI)"} leans toward <b>${esc(F.RUBRIC.complexity.levels[i])}</b> (${pct(r[i])}). ${esc(timeline(r))}</p>
    <p class="doubt">A read of your words, not a quote. Use your own judgment for the question below.</p></div>`;
}

function renderSend() {
  const C = G.CONTACT;
  return `<p class="lead">Your form is saved in this browser, but it reaches the Academic Innovations Group only when you email it. Here is how.</p>
    <ol class="howto">
      <li><b>Check the form.</b> Required items are marked with a red star. Anything still missing will be listed below.</li>
      <li><b>Download your response.</b> "Download for Word" gives you a .doc file that opens in Word, where you can still edit it. "Download as a web page" gives you an .html file. Either one works.</li>
      <li><b>Write an email to <a href="mailto:${C.email}">${C.email}</a></b> with the subject line "${esc(C.subject)}: [your working title]". The "Open an email" button below starts one for you.</li>
      <li><b>Attach the downloaded file</b>, plus any readings, images, data, or rubrics you mentioned. Please don't attach anything with student names, grades, or work.</li>
      <li><b>Send it.</b> AIG will reply to talk through the build. Most builds will take a week or more based on resources, capacity, and complexity.</li>
    </ol>
    <div class="missing" id="missing" role="alert" hidden></div>
    <div class="dl-row">
      <button type="button" class="btn" data-dl="doc">Download for Word (.doc)</button>
      <button type="button" class="btn ghost" data-dl="html">Download as a web page (.html)</button>
      <button type="button" class="btn ghost" data-dl="print">Print or save as PDF</button>
      <button type="button" class="btn ghost" data-dl="copy">Copy as text</button>
    </div>
    <div class="dl-row"><a class="btn coral" id="mailBtn" href="#">Open the email</a></div>
    <p class="help" style="margin-top:10px">The email button opens your mail app with the address and subject filled in. It can't attach the file for you, so add the download before sending.</p>
    <div class="exemplar" style="margin-top:26px"><h3>Prefer paper, or coming back later?</h3>
      <div class="dl-row" style="margin-top:4px">
        <button type="button" class="btn small ghost" data-dl="blank">Download a blank form for Word</button>
        <button type="button" class="btn small ghost" data-dl="blankprint">Print a blank form</button>
        <label class="btn small ghost" for="importFile" style="cursor:pointer">Open a saved response</label>
        <input type="file" id="importFile" accept=".html,.htm,.doc,.json" class="sr">
        <button type="button" class="btn small ghost clear-btn" data-clear>Clear form</button>
      </div>
      <p class="help" style="margin:10px 0 0">A blank form lists every question for every pathway. Fill it in Word, save, and attach it to your email the same way. To pick up where you left off on another computer, open a .doc or .html file you downloaded from this page.</p>
    </div>`;
}

function noticeHtml(sec) {
  const kinds = { ferpa: ["warn", "!"], time: ["time", "7"], share: ["share", "↗"] };
  const [cls, ico] = kinds[sec.notice];
  const h = { ferpa: "Keep student data out", time: "Prototypes only, and a week or more", share: "An open invitation" }[sec.notice];
  return `<div class="notice ${cls}"><span class="ico" aria-hidden="true">${ico}</span><div><h3>${h}</h3><p>${esc(sec.lead)}</p></div></div>`;
}

function renderAll() {
  const main = $("#main");
  main.innerHTML = F.SECTIONS.map(sec => {
    const p = sec.path ? G.pathById(sec.path) : null;
    const cls = ["sheet", "f-sec", sec.id === "s-idea" ? "intake" : "", p ? "pathsec" : ""].join(" ");
    const head = `<h2 class="acc-h" id="h-${sec.id}"><button type="button" class="acc-btn" aria-expanded="false" aria-controls="panel-${sec.id}" data-acc="${sec.id}">
      <span class="snum" aria-hidden="true"></span>
      <span class="acc-t">${p ? `<span class="eyebrow pc">Pathway ${p.n}</span>` : ""}<span class="acc-title">${esc(sec.title)}</span></span>
      <span class="acc-st"></span><span class="chev" aria-hidden="true"></span></button></h2>`;
    const lead = sec.lead && !sec.notice && sec.custom !== "send" ? `<p class="lead">${esc(sec.lead)}</p>` : "";
    let body = lead + (sec.notice ? noticeHtml(sec) : "");
    if (sec.custom === "intake") body += renderIntake();
    if (sec.custom === "picker") body += renderPicker();
    if (sec.custom === "send") body += renderSend();
    if (sec.fields) body += sec.fields.map(f => renderField(f, sec)).join("");
    if (sec.custom === "flagged") body += `<div id="flaggedBox">${renderFlaggedList()}</div>`;
    if (sec.custom === "jevscope") body += `<div id="jevScope">${renderJevScope()}</div>`;
    const foot = sec.custom === "send" ? "" : `<div class="acc-foot"><button type="button" class="btn" data-next="${sec.id}">Save and go to the next section</button></div>`;
    return `<section class="${cls}" id="${sec.id}" aria-labelledby="h-${sec.id}" ${p ? `data-c="${p.color}"` : ""}>${head}<div class="acc-panel" id="panel-${sec.id}" role="region" aria-labelledby="h-${sec.id}" hidden>${body}${foot}</div></section>`;
  }).join("");
  main.insertAdjacentHTML("afterbegin", `<div class="acc-tools"><p>Open one section at a time, or <button type="button" class="linkbtn" data-accall="open">expand all</button> / <button type="button" class="linkbtn" data-accall="close">collapse all</button>.</p><button type="button" class="btn small ghost clear-btn" data-clear>Clear form</button></div>`);
  openSec(location.hash.slice(1) && document.getElementById(location.hash.slice(1)) ? location.hash.slice(1) : "s-idea", false);
  applyValues();
  renderAiAction();
  if (S.jev) showJev(S.jev, false);
  reorderDom();
  update();
}

function applyValues() {
  $("#idea").value = S.idea || "";
  $$("[data-ai]").forEach(el => el.checked = S.aiChoice === el.value);
  $$("[data-fid]").forEach(el => {
    const v = S.answers[el.dataset.fid];
    if (el.type === "radio") el.checked = v === el.value;
    else if (el.type === "checkbox") el.checked = Array.isArray(v) && v.includes(el.value);
    else el.value = v ?? "";
  });
  $$("[data-primary]").forEach(el => el.checked = S.primary === el.value);
  $$("[data-also]").forEach(el => { el.checked = S.also.includes(el.value); el.disabled = S.primary === el.value; });
}

/* ---------- accordion ---------- */
function setOpen(id, open) {
  const sec = document.getElementById(id); if (!sec) return;
  const btn = $(".acc-btn", sec), panel = $(".acc-panel", sec);
  btn.setAttribute("aria-expanded", open); panel.hidden = !open; sec.classList.toggle("open", open);
}
function openSec(id, scroll = true) {
  let sec = document.getElementById(id);
  if (!sec) return;
  if (!sec.classList.contains("f-sec")) sec = sec.closest(".f-sec"); if (!sec) return;
  setOpen(sec.id, true);
  if (scroll) sec.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-acc]");
  if (b) { setOpen(b.dataset.acc, b.getAttribute("aria-expanded") !== "true"); return; }
  const all = e.target.closest("[data-accall]");
  if (all) { $$("section.f-sec").forEach(s => setOpen(s.id, all.dataset.accall === "open")); return; }
  const nx = e.target.closest("[data-next]");
  if (nx) {
    const vis = ordered().filter(secVisible).map(s => s.id), i = vis.indexOf(nx.dataset.next);
    setOpen(nx.dataset.next, false);
    if (vis[i + 1]) { openSec(vis[i + 1]); const f = $(`#panel-${vis[i + 1]} input, #panel-${vis[i + 1]} textarea`); if (f) setTimeout(() => f.focus({ preventScroll: true }), 350); }
    return;
  }
  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute("href").length > 1) { const t = document.getElementById(a.getAttribute("href").slice(1)); if (t && (t.classList.contains("f-sec") || t.closest(".f-sec"))) { e.preventDefault(); openSec(t.id); history.replaceState(null, "", a.getAttribute("href")); } }
});

/* ---------- update visibility, numbering, nav, progress ---------- */
function touched(sec) {
  if (sec.custom === "intake") return !!(S.idea || S.jev || S.aiChoice);
  if (sec.custom === "picker") return !!S.primary;
  if (sec.custom === "send") return false;
  return realFields(sec).some(f => { const v = S.answers[f.id]; return Array.isArray(v) ? v.length : !!v; });
}
function hotSections() {
  const hot = new Set();
  if (!S.jev) return hot;
  for (const [k, fl] of Object.entries(F.FLAGS)) if ((S.jev.flags[k] ?? 0) >= fl.hot && k !== "friction") hot.add(fl.section);
  if (expected(S.jev.rubric.complexity) >= 1.6) hot.add("s-scope");
  return hot;
}
function update() {
  let n = 0;
  const hot = hotSections();
  const nav = [];
  ordered().forEach(sec => {
    const el = document.getElementById(sec.id), vis = secVisible(sec);
    el.hidden = !vis;
    if (!vis) return;
    n++;
    $(".snum", el).textContent = n;
    (sec.fields || []).forEach(f => { if (!f.id || !f.when) return; const w = $(`[data-field="${f.id}"]`, el); if (w) w.hidden = !fieldVisible(f); });
    const t = touched(sec);
    const st = $(".acc-st", el);
    if (st) { const req = realFields(sec).some(f => f.req) || sec.custom === "picker"; st.textContent = sec.custom === "send" ? "" : sec.custom === "intake" && !t ? "Start here" : t ? "Started" : hot.has(sec.id) ? "AI suggests" : req ? "Required" : "Optional"; st.className = "acc-st " + (sec.custom === "intake" && !t ? "hot" : t ? "ok" : hot.has(sec.id) ? "hot" : req ? "req" : ""); }
    nav.push(`<li><a href="#${sec.id}" class="${t ? "done" : ""}${hot.has(sec.id) && !t ? " flagged" : ""}"><span class="dot" aria-hidden="true"></span>${esc(sec.nav)}${t ? '<span class="sr"> (started)</span>' : ""}${hot.has(sec.id) && !t ? '<span class="sr"> (AI suggestion: look here)</span>' : ""}</a></li>`);
  });
  $("#navList").innerHTML = nav.join("");
  const vis = F.SECTIONS.filter(s => secVisible(s) && s.custom !== "send");
  const done = vis.filter(touched).length, p = Math.round(done / vis.length * 100);
  $("#prog i").style.width = p + "%"; $("#prog").setAttribute("aria-valuenow", p); $("#prog").setAttribute("aria-valuetext", `${done} of ${vis.length} sections started`);
  $$(".pick").forEach(el => el.classList.toggle("primary", el.dataset.pick === S.primary));
  const note = $("#pathNote");
  if (note) note.textContent = S.primary ? `Main pathway: ${G.pathById(S.primary).title}.${S.also.length ? " Also: " + S.also.map(id => G.pathById(id).title).join(", ") + "." : ""} The matching sections are open below.` : "Pick a main pathway to open its section of the form.";
  $$("section.pathsec").forEach(el => { const id = el.id.slice(2), eb = $(".eyebrow", el); if (eb) eb.textContent = `Pathway ${G.pathById(id).n}${S.primary === id ? ", your main pathway" : ", also part of your idea"}`; });
  highlightNav();
}

/* ---------- input binding ---------- */
document.addEventListener("input", e => {
  const el = e.target;
  if (el.id === "idea") { S.idea = el.value; save(); update(); return; }
  if (!el.dataset.fid) return;
  const id = el.dataset.fid;
  if (el.type === "checkbox") S.answers[id] = $$(`input[data-fid="${id}"]:checked`).map(x => x.value);
  else S.answers[id] = el.value;
  save(); update();
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.matches("[data-primary]")) {
    S.primary = el.value; S.also = S.also.filter(x => x !== el.value);
    applyValues(); save(); reorderDom(); update();
    setOpen("p-" + el.value, true);
    toast(`${G.pathById(el.value).title} section opened below`);
  } else if (el.matches("[data-also]")) {
    S.also = $$("[data-also]:checked").map(x => x.value).filter(x => x !== S.primary);
    save(); update();
  } else if (el.matches("[data-ai]")) {
    S.aiChoice = el.value;
    if (el.value === "noai" && S.jev) { clearAi(); toast("AI suggestions removed. Nothing more will be sent."); }
    save(); renderAiAction(); update();
  } else if (el.id === "importFile") importFile(el);
});
document.addEventListener("click", e => {
  const lang = e.target.closest("[data-lang-target]");
  if (lang) {
    const id = lang.dataset.langTarget, ta = $(`#f-${id}`);
    if (ta.value.trim()) { navigator.clipboard?.writeText(lang.dataset.lang); toast("That box already has your words, so the sample was copied instead"); }
    else { ta.value = lang.dataset.lang; S.answers[id] = ta.value; save(); update(); toast("Sample added. Rewrite it with your own details."); }
    ta.focus(); return;
  }
  const un = e.target.closest("[data-unflag]");
  if (un) { S.flagged = S.flagged.filter(t => t !== un.dataset.unflag); save(); $("#flaggedBox").innerHTML = renderFlaggedList(); applyValues(); toast("Removed"); return; }
  const dl = e.target.closest("[data-dl]");
  if (dl) { doDownload(dl.dataset.dl); return; }
  if (e.target.closest("#runJev")) { runJev(); return; }
  if (e.target.closest("#noAiGo")) { setOpen("s-idea", false); openSec("s-pathway"); return; }
  if (e.target.closest("#clearAi")) { clearAi(); toast("AI suggestions removed"); return; }
  if (e.target.closest("#usePath")) { usePathway(); return; }
  if (e.target.closest("#openConn")) { $("#connUrl").value = endpoint(); $("#connDlg").showModal(); return; }
  if (e.target.closest("[data-clear]")) { $("#clearFlags").checked = true; $("#clearDlg").showModal(); return; }
  if (e.target.closest("#clearDownload")) { doDownload("doc"); return; }
  if (e.target.closest("#mailBtn")) { e.preventDefault(); openMail(); }
});
/* Clear form: erase this browser's saved response and start fresh. The Jev connection setting is kept. */
$("#clearDlg").addEventListener("close", () => {
  if ($("#clearDlg").returnValue !== "clear") return;
  const keep = { endpoint: S.endpoint, flagged: $("#clearFlags").checked ? [] : S.flagged };
  S = Object.assign(blankState(), keep); if (!S.endpoint) delete S.endpoint;
  clearTimeout(saveT);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  renderAll();
  history.replaceState(null, "", location.pathname);
  $("#saved").textContent = "Form cleared. Saves in this browser as you type.";
  window.scrollTo({ top: 0, behavior: "instant" });
  $("#idea").focus({ preventScroll: true });
  toast("Form cleared");
});
$("#connDlg").addEventListener("close", () => {
  const v = $("#connDlg").returnValue;
  if (v === "save") { const u = $("#connUrl").value.trim(); S.endpoint = u && u !== DEFAULT_ENDPOINT ? u : undefined; save(); checkConn(); toast("Connection saved"); }
  if (v === "reset") { delete S.endpoint; save(); checkConn(); toast("Using the default connection"); }
});

$("#navToggle").addEventListener("click", () => {
  const nav = $(".f-nav"), open = nav.classList.toggle("open");
  $("#navToggle").setAttribute("aria-expanded", open); $("#navToggle").textContent = open ? "Hide sections" : "Show all sections";
});
$("#navList").addEventListener("click", e => { if (e.target.closest("a") && matchMedia("(max-width:980px)").matches) $("#navToggle").click(); });
/* nav highlight follows scroll */
let navT;
function highlightNav() {
  const secs = $$("section.f-sec:not([hidden])");
  let cur = secs[0]?.id;
  for (const s of secs) if (s.getBoundingClientRect().top < 140) cur = s.id;
  $$("#navList a").forEach(a => { const on = a.getAttribute("href") === "#" + cur; a.classList.toggle("on", on); if (on) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current"); });
}
window.addEventListener("scroll", () => { clearTimeout(navT); navT = setTimeout(highlightNav, 60); }, { passive: true });

/* ---------- Jev ---------- */
const argmax = a => a.reduce((bi, v, i) => v > a[bi] ? i : bi, 0);
const expected = probs => probs.reduce((s, p, i) => s + p * i, 0);
function topPath(j) { const [id, p] = Object.entries(j.pathway).sort((a, b) => b[1] - a[1])[0]; return { id, p }; }
function timeline(r) {
  const ev = expected(r);
  if (ev < 1.2) return "A build like this usually takes about a week.";
  if (ev < 2.2) return "A build like this likely takes more than a week.";
  return "A build like this takes several weeks, and we should talk before building.";
}

async function checkConn() {
  const st = $("#jevStatus"); if (!st) return;
  st.className = "status"; $("span", st).textContent = "Checking Jev…";
  try { const r = await fetch(endpoint(), { method: "GET" }); if (!r.ok) throw 0; st.className = "status on"; $("span", st).textContent = "Jev is ready"; }
  catch { st.className = "status off"; $("span", st).textContent = "Jev is unreachable; a keyword estimate will be used"; }
}

function questions() {
  const q = { pathway: { type: "choice", instructions: "Which build pathway best fits this faculty member's idea for a prototype app?", criteria: Object.fromEntries(G.PATHWAYS.map(p => [p.id, p.jev])) } };
  for (const [k, r] of Object.entries(F.RUBRIC)) q[k] = { type: "score", instructions: r.instructions, criteria: r.levels };
  for (const [k, fl] of Object.entries(F.FLAGS)) q[k] = { type: "noul", instructions: fl.instructions };
  return q; // 8 questions: the proxy's maximum
}
function levelProbs(a, n) {
  const P = a?.probabilities; const out = Array(n).fill(0);
  if (Array.isArray(P)) return P.slice(0, n).map(Number);
  if (P && typeof P === "object") for (let i = 0; i < n; i++) out[i] = +(P[String(i)] ?? P[String(i + 1)] ?? 0);
  return out;
}

async function runJev() {
  if (S.aiChoice !== "ai") return;
  const idea = ($("#idea").value || "").trim();
  if (idea.length < 25) { toast("Write a sentence or two first"); $("#idea").focus(); return; }
  const btn = $("#runJev"), st = $("#jevStatus");
  btn.disabled = true; btn.textContent = "Jev is reading…";
  st.className = "status busy"; $("span", st).textContent = "Reading your idea";
  let result;
  try {
    const r = await fetch(endpoint(), { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "A faculty member's idea for a prototype web app:\n\n" + idea, model: "jev-latest", questions: questions() }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "HTTP " + r.status);
    const A = d.answers;
    result = { source: "jev", model: d.model, at: new Date().toISOString(), idea,
      pathway: Object.fromEntries(G.PATHWAYS.map(p => [p.id, +(A.pathway?.probabilities?.[p.id] ?? 0)])),
      rubric: Object.fromEntries(Object.entries(F.RUBRIC).map(([k, rb]) => [k, levelProbs(A[k], rb.levels.length)])),
      flags: Object.fromEntries(Object.keys(F.FLAGS).map(k => [k, +(A[k]?.noul ?? 0)])) };
    st.className = "status on"; $("span", st).textContent = "Jev is ready";
  } catch (err) {
    result = keywordEstimate(idea);
    result.error = String(err.message || err);
    st.className = "status off"; $("span", st).textContent = "Jev is unreachable; showing a keyword estimate";
  }
  S.jev = result; save();
  btn.disabled = false; btn.textContent = "Ask Jev again";
  showJev(result, true);
  $("#jevScope").innerHTML = renderJevScope();
  refreshPicker(); // updates the "Jev's read" tag on the pathway cards
  update();
}
function refreshPicker() {
  const sec = $("#s-pathway"), tmp = document.createElement("div");
  tmp.innerHTML = renderPicker();
  $(".picker", sec).replaceWith($(".picker", tmp));
  applyValues();
}

/* A plain keyword fallback so the box still helps when Jev can't be reached. Clearly labeled in the UI. */
function keywordEstimate(idea) {
  const t = idea.toLowerCase(), has = (...w) => w.reduce((n, x) => n + (t.includes(x) ? 1 : 0), 0);
  const raw = {
    "learning-app": 1 + has("activity", "worksheet", "reflect", "practice", "tool", "quiz", "students", "export", "module"),
    "game-sim": has("game", "simulat", "play", "role", "choice", "scenario", "level", "score", "model", "decision"),
    "research-data": has("data", "api", "dataset", "archive", "census", "live", "map", "research", "evidence", "records"),
    "friction": has("slow", "friction", "struggle", "difficult", "offload", "close read", "annotat", "attention", "without ai", "think"),
    "faculty-tool": has("faculty", "syllabus", "policy", "workshop", "colleague", "department", "instructor", "course design", "rubric"),
    "showcase": has("gallery", "collection", "archive", "exhibit", "browse", "showcase", "museum", "photos", "edition"),
  };
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  const pathway = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / sum]));
  const cx = Math.min(3, (has("data", "api", "live", "simulat") ? 2 : has("screen", "save", "export", "steps") ? 1 : 0) + (has("login", "account", "grade", "database", "chatbot", "generate") ? 1 : 0));
  const lv = (i, n = 4) => Array.from({ length: n }, (_, k) => k === i ? .7 : (Math.abs(k - i) === 1 ? .15 : 0)).map((v, _, a) => v / a.reduce((x, y) => x + y, 0));
  return { source: "keywords", at: new Date().toISOString(), idea, pathway,
    rubric: { purpose: lv(has("learn", "understand", "goal", "so that", "able to") ? 2 : 1), audience: lv(/\b[a-z]{2,4}\s?\d{3}\b/.test(t) ? 3 : has("students", "faculty", "class") ? 1 : 0), complexity: lv(cx) },
    flags: { student_data: has("grade", "names", "login", "submit", "record") ? .6 : .1, outside_data: raw["research-data"] ? .7 : .15, live_ai: has("chatbot", "ai tutor", "generate", "gpt", "feedback from ai") ? .65 : .1, friction: raw.friction ? .7 : .2 } };
}

function ring(p, color) {
  const C = 2 * Math.PI * 20, off = C * (1 - p);
  return `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="20" fill="none" stroke="#E6DDCB" stroke-width="7"/>
    <circle cx="26" cy="26" r="20" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 26 26)"/>
    <text x="26" y="30" text-anchor="middle" font-size="12" font-weight="700" fill="#1B2440" font-family="Arial">${Math.round(p * 100)}</text></svg>`;
}

function showJev(j, animate) {
  const out = $("#jevOut"); if (!out) return;
  const ranked = Object.entries(j.pathway).sort((a, b) => b[1] - a[1]);
  const [t1, p1] = ranked[0], [t2, p2] = ranked[1];
  const who = j.source === "jev" ? "Jev" : "The keyword estimate";
  const when = new Date(j.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  let summary = `${who} reads this as <b>${esc(G.pathById(t1).title)}</b> (${pct(p1)})`;
  if (p2 >= .12) summary += `, with some pull toward <b>${esc(G.pathById(t2).title)}</b> (${pct(p2)})`;
  summary += ".";
  if (p1 < .5) summary += " That's not a confident read, so look at the bars and choose for yourself.";
  const bars = ranked.map(([id, p], i) => { const P = G.pathById(id);
    return `<div class="bar${i === 0 ? " top" : ""}" data-c="${P.color}"><span>${esc(P.title)}</span><span class="track"><i style="width:${animate ? 0 : p * 100}%" data-w="${p * 100}"></i></span><span class="v">${pct(p)}</span></div>`; }).join("");
  const rub = Object.entries(F.RUBRIC).map(([k, rb]) => {
    const pr = j.rubric[k], mi = argmax(pr);
    return `<tr><th scope="row">${esc(rb.label)}</th>${rb.levels.map((lvl, i) => `<td class="${i === mi ? "likely" : ""}"><span class="fill" style="height:${animate ? 0 : pr[i] * 100}%" data-h="${pr[i] * 100}"></span><span>${esc(lvl)}</span><span class="p">${pct(pr[i])}${i === mi ? " · most likely" : ""}</span></td>`).join("")}</tr>`;
  }).join("");
  const flags = Object.entries(F.FLAGS).map(([k, fl]) => { const p = j.flags[k] ?? 0, on = p >= fl.hot;
    return `<div class="flagbox">${ring(p, k === "friction" ? "#E3A93A" : on ? "#B8432A" : "#5E9A5A")}<div><b>${esc(fl.label)}</b><span>${pct(p)} likely: ${esc(on ? fl.yes : fl.no)}</span></div></div>`; }).join("");
  // suggested route through the form
  const route = [];
  route.push({ sec: "p-" + t1, txt: `Fill out the ${G.pathById(t1).title} section`, hot: true });
  if (p2 >= .12) route.push({ sec: "p-" + t2, txt: `Consider also opening ${G.pathById(t2).title}` });
  if (j.flags.friction >= F.FLAGS.friction.hot && t1 !== "friction" && t2 !== "friction") route.push({ sec: "s-pathway", txt: "Your idea aims to keep effortful thinking with students, so Desirable difficulties opens too" });
  if (expected(j.rubric.purpose) < 2) route.push({ sec: "s-concept", txt: "Say what people do and what they leave with in The idea", hot: true });
  if (expected(j.rubric.audience) < 2) route.push({ sec: "s-about", txt: "Name your course or audience and when you'd use it" });
  if (j.flags.student_data >= F.FLAGS.student_data.hot) route.push({ sec: "s-ferpa", txt: "Read Student data and FERPA closely", hot: true });
  if (j.flags.outside_data >= .5 || j.flags.live_ai >= .5) route.push({ sec: "s-apis", txt: "Describe the outside data or AI in Outside data and APIs", hot: true });
  route.push({ sec: "s-scope", txt: timeline(j.rubric.complexity), hot: expected(j.rubric.complexity) >= 1.6 });
  route.push({ sec: "s-access", txt: "Note any accessibility needs" });
  out.classList.toggle("ai-made", j.source === "jev");
  out.innerHTML = `
    ${j.source === "jev"
      ? `<div class="ai-label big"><span class="ai-badge">AI</span><div><b>AI-generated suggestions</b><span>Jev (TypeSafe AI, ${esc(j.model || "jev-latest")}) read your idea on ${esc(when)}. These are suggestions with probabilities, not decisions. You choose your pathway.</span></div><button type="button" class="btn small ghost" id="clearAi">Remove AI suggestions</button></div>`
      : `<div class="ai-label big notai"><span class="ai-badge off">—</span><div><b>Keyword estimate, not AI</b><span>Jev couldn't be reached${j.error ? ` (${esc(j.error)})` : ""}, so this is a simple count of keywords in your idea. Treat it as a rough starting point, or try again later.</span></div><button type="button" class="btn small ghost" id="clearAi">Remove</button></div>`}
    <div class="jev-summary">${summary}</div>
    <div class="jev-grid">
      <div class="jev-card"><h3>Pathway</h3><div class="bars">${bars}</div></div>
      <div class="jev-card"><h3>Things to watch</h3><div class="flags">${flags}</div></div>
    </div>
    <div class="jev-card"><h3>Readiness rubric</h3>
      <p class="doubt" style="margin-bottom:8px">Each row is scored weakest to strongest. Shading shows how much weight ${who === "Jev" ? "Jev" : "the estimate"} puts on each level, so you can see its doubt.</p>
      <div class="rub-wrap"><table class="rub"><caption class="sr">Readiness rubric with ${who}'s probabilities</caption>
      <thead><tr><td class="corner"></td>${["1", "2", "3", "4"].map(n => `<th scope="col" style="width:auto">Level ${n}</th>`).join("")}</tr></thead><tbody>${rub}</tbody></table></div></div>
    <div class="jev-card"><h3>Your suggested route through the form</h3>
      <ul class="route">${route.map((r, i) => `<li class="${r.hot ? "hot" : ""}"><b>${i + 1}${r.hot ? " · look here" : ""}</b><a href="#${r.sec}">${esc(r.txt)}</a></li>`).join("")}</ul></div>
    <div class="intake-row">
      <button type="button" class="btn" id="usePath">Use ${esc(G.pathById(t1).title)} and continue</button>
      <a href="#s-pathway" class="textlink">Choose a different pathway</a>
    </div>
    <p class="doubt">${who === "Jev" ? `Jev (${esc(j.model || "jev-latest")}) returns probabilities, not verdicts.` : "This estimate counts keywords."} It read only the words in the box. You choose the pathway, and AIG reads the whole form.</p>`;
  out.hidden = false;
  if (animate) requestAnimationFrame(() => requestAnimationFrame(() => {
    $$(".bar i", out).forEach(i => i.style.width = i.dataset.w + "%");
    $$(".rub .fill", out).forEach(i => i.style.height = i.dataset.h + "%");
  }));
}

function clearAi() {
  S.jev = null; save();
  const out = $("#jevOut"); out.hidden = true; out.innerHTML = "";
  $("#jevScope").innerHTML = renderJevScope();
  refreshPicker(); renderAiAction(); update();
}

function usePathway() {
  const ranked = Object.entries(S.jev.pathway).sort((a, b) => b[1] - a[1]);
  S.primary = ranked[0][0];
  S.also = ranked.slice(1).filter(([, p]) => p >= .12).slice(0, 2).map(([id]) => id);
  if (S.jev.flags.friction >= F.FLAGS.friction.hot && S.primary !== "friction" && !S.also.includes("friction")) S.also.push("friction");
  if (!S.answers.pitch) S.answers.pitch = S.idea;
  save(); applyValues(); refreshPicker(); reorderDom(); update();
  toast(`${G.pathById(S.primary).title} is your main pathway`);
  openSec("s-pathway");
}

/* ---------- export ---------- */
function answerText(f) {
  const v = S.answers[f.id];
  if (Array.isArray(v)) return v.length ? v.join("; ") : "";
  return (v ?? "").toString().trim();
}
function sectionsFor(blank) { return (blank ? F.SECTIONS : ordered()).filter(s => s.custom !== "send" && (blank || secVisible(s))); }

function exportModel(blank) {
  const rows = [];
  sectionsFor(blank).forEach(sec => {
    const items = [];
    if (sec.custom === "intake") {
      items.push({ q: "Here's my idea", a: blank ? "" : (S.idea || ""), long: true });
      const aiUse = S.jev && S.jev.source === "jev"
        ? `Used. Jev (TypeSafe AI, ${S.jev.model || "jev-latest"}) read the idea above on ${new Date(S.jev.at).toLocaleString()}. Items marked [AI-generated] below are its suggestions, not the faculty member's answers.`
        : S.jev ? "Chosen, but Jev could not be reached. Items marked [keyword estimate, not AI] come from a simple keyword count."
        : S.aiChoice === "noai" ? "Not used. The faculty member chose to work without AI. Nothing was sent to an AI service."
        : S.aiChoice === "ai" ? "Chosen, but no AI suggestions were requested." : "No choice made.";
      items.push({ q: "Optional AI assistance", a: blank ? "" : aiUse, opts: blank ? ["Yes, use AI assistance (Jev)", "No, I'll work without AI"] : null });
      if (!blank && S.jev) {
        const tag = S.jev.source === "jev" ? "[AI-generated]" : "[keyword estimate, not AI]";
        const ranked = Object.entries(S.jev.pathway).sort((a, b) => b[1] - a[1]);
        items.push({ q: `${tag} Suggested pathway`, a: ranked.map(([id, p]) => `${G.pathById(id).title} ${pct(p)}`).join("; ") });
        Object.entries(F.RUBRIC).forEach(([k, rb]) => { const pr = S.jev.rubric[k], i = argmax(pr); items.push({ q: `${tag} Rubric: ${rb.label}`, a: `${rb.levels[i]} (${pct(pr[i])})` }); });
        items.push({ q: `${tag} Things to watch`, a: Object.entries(F.FLAGS).map(([k, fl]) => `${fl.label} ${pct(S.jev.flags[k])}`).join("; ") });
      }
    } else if (sec.custom === "picker") {
      items.push({ q: "Main pathway", a: blank || !S.primary ? "" : G.pathById(S.primary).title, opts: blank ? G.PATHWAYS.map(p => p.title) : null });
      items.push({ q: "Also borrows from", a: blank ? "" : S.also.map(id => G.pathById(id).title).join("; "), opts: blank ? G.PATHWAYS.map(p => p.title) : null });
      items.push({ q: "Gallery builds marked close to my idea", a: blank ? "" : S.flagged.join("; ") });
    }
    (sec.fields || []).forEach(f => {
      if (!f.id || (!blank && !fieldVisible(f))) return;
      if (f.id === "look_why" || f.type === "note") return;
      const q = f.type === "compare" ? `${f.question} (${f.pair.join(" or ")})` : f.label;
      const opts = blank && (f.type === "radio" || f.type === "checks") ? f.options.map(o => typeof o === "string" ? o : o.v)
        : blank && f.type === "compare" ? [`Closer to ${f.pair[0]}`, `Closer to ${f.pair[1]}`, "Somewhere in between", "Neither"] : null;
      items.push({ q, a: blank ? "" : answerText(f), opts, long: f.type === "textarea" });
    });
    if (sec.custom === "flagged" && (blank || S.answers.look_why)) items.push({ q: "What I like about the builds I marked", a: blank ? "" : S.answers.look_why || "", long: true });
    rows.push({ title: sec.path && blank ? `${sec.title} (only if this is your pathway)` : sec.title, items });
  });
  return rows;
}

function exportHTML(blank, forWord) {
  const C = G.CONTACT, title = blank ? "" : (S.answers.title || "Untitled idea");
  const model = exportModel(blank);
  const date = new Date().toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
  const body = model.map(sec => `<h2>${esc(sec.title)}</h2>` + sec.items.map(it => {
    let a;
    if (blank && it.opts) a = `<p class="opts">${it.opts.map(o => `☐ ${esc(o)}`).join("<br>")}</p>`;
    else if (blank) a = `<p class="blank">${it.long ? "&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;" : "&nbsp;"}</p>`;
    else a = it.a ? `<p class="a">${esc(it.a).replace(/\n/g, "<br>")}</p>` : `<p class="a none">No answer</p>`;
    return `<div class="item"><p class="q">${esc(it.q)}</p>${a}</div>`;
  }).join("")).join("");
  const data = blank ? "" : `<script type="application/json" id="grove-response">${JSON.stringify(S).replace(/</g, "\\u003c")}</script>`;
  return `<!doctype html>
<html lang="en"${forWord ? ` xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"` : ""}><head><meta charset="utf-8">
<title>Grove Lab build form${title ? ": " + esc(title) : ""}</title>
<style>
body{font-family:"IBM Plex Sans",Arial,Helvetica,sans-serif;font-size:11.5pt;line-height:1.45;color:#222222;max-width:760px;margin:30px auto;padding:0 20px}
h1{font-family:"Arial Black",Arial,sans-serif;font-size:22pt;text-transform:uppercase;color:#14213D;margin:0 0 4px;border-bottom:4px solid #CE1126;padding-bottom:6px}
h2{font-family:"Arial Black",Arial,sans-serif;font-size:13pt;text-transform:uppercase;color:#14213D;border-bottom:2px solid #14213D;padding-bottom:3px;margin:26px 0 8px}
.meta{color:#5A5F70;margin:0 0 14px}
.box{border-left:6px solid #CE1126;background:#F4F5F7;padding:10px 14px;margin:14px 0}
.box p{margin:4px 0}
.item{margin:0 0 10px}
.q{font-weight:bold;margin:0 0 2px;color:#14213D}
.a{margin:0;padding:4px 0 4px 10px;border-left:3px solid #D9CDB4}
.none{color:#8a8a8a}
.blank{border-bottom:1px solid #999;margin:0 0 6px;line-height:2}
.opts{margin:0 0 4px 6px;line-height:1.7}
.foot{margin-top:30px;font-size:9.5pt;color:#5A5F70;border-top:1px solid #D9CDB4;padding-top:8px}
</style></head><body>
<h1>The Grove Lab: build form</h1>
<p class="meta">${blank ? "Blank form. Fill it in, save it, and attach it to an email." : `${esc(title)}<br>Submitted by ${esc(S.answers.name || "(name)")}, ${esc(S.answers.dept || "(department)")}, ${esc(S.answers.email || "(email)")}<br>Downloaded ${date}`}</p>
<div class="box"><p><b>Send to:</b> ${C.email}, subject "${esc(C.subject)}: ${blank ? "[your working title]" : esc(title)}". Attach this file and any materials.</p>
<p>These are prototypes only and likely should not be deployed in the classroom. Most builds will take a week or more based on resources, capacity, and complexity. Please don't include student names, grades, or work.</p></div>
${body}
<p class="foot">The Grove Lab, a tinkering lab by Marc Watkins. Form coded with Anthropic's Claude. AI assistance in the idea step is optional; when chosen, Jev (TypeSafe AI) suggests a pathway, and its suggestions are marked [AI-generated] above.</p>
${data}
</body></html>`;
}

function exportText() {
  return exportModel(false).map(sec => `== ${sec.title} ==\n` + sec.items.map(it => `${it.q}\n${it.a || "(no answer)"}\n`).join("\n")).join("\n");
}

function slug(s) { return (s || "idea").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "idea"; }
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function printHTML(html) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  f.setAttribute("aria-hidden", "true");
  document.body.appendChild(f);
  f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
  setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1500); }, 250);
}
function missing() {
  const m = [];
  if (!S.answers.name) m.push(["s-about", "Your name"]);
  if (!S.answers.email) m.push(["s-about", "Your email"]);
  if (!S.answers.dept) m.push(["s-about", "Department or unit"]);
  if (!S.primary) m.push(["s-pathway", "A main pathway"]);
  if (!S.answers.title) m.push(["s-concept", "Working title"]);
  if (!S.answers.pitch) m.push(["s-concept", "Your idea in a few sentences"]);
  if (!(S.answers.fe_ack || []).length) m.push(["s-ferpa", "Student data acknowledgment"]);
  if ((S.answers.cx_ack || []).length < 2) m.push(["s-scope", "Both prototype acknowledgments"]);
  return m;
}
function doDownload(kind) {
  const base = `grove-lab-${slug(S.answers.title)}${S.answers.name ? "-" + slug(S.answers.name.split(" ").pop()) : ""}`;
  if (kind === "blank") { download("grove-lab-build-form-blank.doc", exportHTML(true, true), "application/msword"); toast("Blank form downloaded"); return; }
  if (kind === "blankprint") { printHTML(exportHTML(true, false)); return; }
  const m = missing(), box = $("#missing");
  if (m.length) {
    box.hidden = false;
    box.innerHTML = `<b>Still missing (${m.length}).</b> You can download anyway, but please fill these in before you send:<ul>${m.map(([s, l]) => `<li><a href="#${s}">${esc(l)}</a></li>`).join("")}</ul>`;
  } else box.hidden = true;
  if (kind === "doc") { download(base + ".doc", exportHTML(false, true), "application/msword"); toast("Downloaded for Word. Attach it to your email."); }
  if (kind === "html") { download(base + ".html", exportHTML(false, false), "text/html"); toast("Downloaded. Attach it to your email."); }
  if (kind === "print") printHTML(exportHTML(false, false));
  if (kind === "copy") navigator.clipboard?.writeText(exportText()).then(() => toast("Copied. You can paste it into an email."), () => toast("Copy didn't work here; try a download instead"));
}
function openMail() {
  const C = G.CONTACT, t = S.answers.title || "";
  const subject = `${C.subject}: ${t}`.trim();
  const body = `Hi Marc,\n\nAttached is my Grove Lab build form${t ? ` for "${t}"` : ""}.\n\n[Attach the .doc or .html file you downloaded before sending.]\n`;
  location.href = `mailto:${C.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function importFile(input) {
  const file = input.files[0]; if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const txt = String(rd.result);
      const m = txt.match(/<script type="application\/json" id="grove-response">([\s\S]*?)<\/script>/);
      const obj = JSON.parse(m ? m[1] : txt);
      if (!obj || typeof obj.answers !== "object") throw 0;
      if (!confirm("Replace the answers in this browser with the saved response?")) return;
      const ep = S.endpoint; S = Object.assign(blankState(), obj); if (ep) S.endpoint = ep; if (S.jev && !S.aiChoice) S.aiChoice = "ai";
      save(); renderAll(); toast("Saved response opened");
    } catch { toast("That file doesn't contain a Grove Lab response. Use a .doc or .html downloaded from this page."); }
    input.value = "";
  };
  rd.readAsText(file);
}

/* ---------- start ---------- */
// Builds flagged in the gallery live in the same record; reread them in case the gallery changed them.
try { const fresh = JSON.parse(localStorage.getItem(KEY)) || {}; S.flagged = fresh.flagged || S.flagged; } catch {}
const qp = new URLSearchParams(location.search).get("path");
if (qp && G.pathById(qp) && !S.primary) { S.primary = qp; save(); }
renderAll();
if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t && !t.hidden) setTimeout(() => openSec(t.id), 120); }
})();
