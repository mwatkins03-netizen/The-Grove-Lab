/* The Grove Lab — gallery. Builds grouped by pathway, with search, filters, and "Close to my idea" flags
   saved to the same localStorage record the build form reads. */
(() => {
const G = window.GROVE;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY = "grovelab.v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };
let data = load(); data.flagged ||= [];

let filter = "all", query = "";
const filtersEl = $("#filters");
filtersEl.innerHTML = `<button type="button" aria-pressed="true" data-f="all">All pathways</button>` +
  G.PATHWAYS.map(p => `<button type="button" aria-pressed="false" data-f="${p.id}" data-c="${p.color}">${p.n}. ${esc(p.title)}</button>`).join("");
filtersEl.addEventListener("click", e => {
  const b = e.target.closest("button[data-f]"); if (!b) return;
  filter = b.dataset.f;
  filtersEl.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  history.replaceState(null, "", filter === "all" ? location.pathname : "#" + filter);
  render();
});
$("#q").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); render(); });

function card(b, inGroup) {
  const on = data.flagged.includes(b.title);
  const pills = [b.path, ...b.also].map(id => { const p = G.pathById(id); return `<span class="pill" data-c="${p.color}">${esc(p.title)}</span>`; }).join("");
  return `<article class="card">
    <div class="shot"><img src="${b.shot}" alt="Screenshot of ${esc(b.title)}" loading="lazy" width="960" height="540"></div>
    <div class="in">
      <h3>${esc(b.title)}</h3>
      <p>${esc(b.description)}</p>
      <div class="pills" aria-label="Pathways">${pills}</div>
      <div class="tags">${b.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      <div class="acts">
        <a href="${b.link}" target="_blank" rel="noopener">Open live<span class="sr"> (${esc(b.title)}, opens in a new tab)</span> ↗</a>
        <button type="button" class="flag" aria-pressed="${on}" data-flag="${esc(b.title)}">${on ? "✓ Close to my idea" : "Close to my idea"}</button>
      </div>
    </div></article>`;
}

function matches(b) {
  if (!query) return true;
  return [b.title, b.description, ...b.tags, ...[b.path, ...b.also].map(id => G.pathById(id).title)].join(" ").toLowerCase().includes(query);
}

function render() {
  let total = 0;
  const groups = G.PATHWAYS.filter(p => filter === "all" || p.id === filter).map(p => {
    // A build appears under its main pathway; when filtering to one pathway, builds that also touch it are added.
    const list = G.BUILDS.filter(b => (b.path === p.id || (filter === p.id && b.also.includes(p.id))) && matches(b));
    total += list.length;
    if (!list.length) return "";
    return `<section class="g-group" id="${p.id}" data-c="${p.color}" aria-labelledby="h-${p.id}">
      <div class="g-group-head"><span class="num" aria-hidden="true">${p.n}</span>
        <div><h2 id="h-${p.id}">${esc(p.title)}</h2><p>${esc(p.short)}</p></div>
        <a href="form.html?path=${p.id}#s-pathway">Start a form on this pathway →</a></div>
      <div class="cards">${list.map(b => card(b)).join("")}</div></section>`;
  }).join("");
  $("#groups").innerHTML = groups || `<p class="sheet" style="padding:20px">No builds match “${esc(query)}”. Try a broader word, or clear the search.</p>`;
  $("#count").textContent = `${total} build${total === 1 ? "" : "s"} shown`;
  renderTray();
}

function renderTray() {
  const n = data.flagged.length;
  $("#tray").hidden = !n;
  $("#trayText").textContent = n ? `${n} build${n === 1 ? "" : "s"} marked close to your idea: ${data.flagged.join(", ")}.` : "";
}

let toastT;
const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200); };

document.addEventListener("click", e => {
  const b = e.target.closest("[data-flag]"); if (!b) return;
  data = load(); data.flagged ||= [];
  const t = b.dataset.flag, i = data.flagged.indexOf(t);
  if (i >= 0) data.flagged.splice(i, 1); else data.flagged.push(t);
  save(data);
  const on = i < 0;
  document.querySelectorAll(`[data-flag="${CSS.escape(t)}"]`).forEach(x => { x.setAttribute("aria-pressed", on); x.textContent = on ? "✓ Close to my idea" : "Close to my idea"; });
  toast(on ? `Added ${t} to your form` : `Removed ${t}`);
  renderTray();
});
$("#clearFlags").addEventListener("click", () => { data = load(); data.flagged = []; save(data); render(); toast("Cleared"); });

const h = location.hash.slice(1);
if (G.pathById(h)) { filter = h; filtersEl.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.dataset.f === h ? "true" : "false")); }
render();
})();
