/* The Grove Lab — open/closed sign. Load in <head> after status-config.js so the form page can redirect
   before it draws. Reads the live status from the Worker when one is configured, remembers the last
   answer in this browser, and falls back to the config file. */
(() => {
const C = window.GROVE_STATUS_CONFIG || { endpoint: "", open: true };
const KEY = "grovelab.status";
const page = document.documentElement.dataset.page || "";
const base = (C.endpoint || "").replace(/\/+$/, "");
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

let status = base && read() ? { ...read(), source: "cached" } : { open: !!C.open, source: "config" };

function sign(kind) {
  const open = status.open;
  if (kind === "compact") return `<span class="subs-pill ${open ? "open" : "closed"}"><i aria-hidden="true"></i>${open ? "Open for submissions" : "Closed for submissions"}</span>`;
  return `<div class="subs-sign ${open ? "open" : "closed"}"><span class="cord" aria-hidden="true"></span>
    <div class="board"><span class="state">${open ? "Open" : "Closed"}</span><span class="for">for submissions</span></div></div>`;
}

function apply() {
  document.documentElement.dataset.subs = status.open ? "open" : "closed";
  if (page === "form" && !status.open) { location.replace("closed.html"); return; }
  if (document.readyState === "loading") return; // DOM pieces get drawn on DOMContentLoaded
  document.querySelectorAll("[data-subs-sign]").forEach(el => {
    el.innerHTML = sign(el.dataset.subsSign);
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", status.open ? "Open for submissions" : "Closed for submissions");
  });
  document.querySelectorAll("[data-submit]").forEach(a => {
    a.dataset.openHref ||= a.getAttribute("href"); a.dataset.openText ||= a.textContent;
    if (status.open) { a.setAttribute("href", a.dataset.openHref); a.textContent = a.dataset.openText; }
    else { a.setAttribute("href", "closed.html"); a.textContent = "Submissions temporarily closed"; }
  });
  document.querySelectorAll("[data-when-open]").forEach(el => el.hidden = !status.open);
  document.querySelectorAll("[data-when-closed]").forEach(el => el.hidden = status.open);
}

async function refresh() {
  if (!base) return refreshFromConfig();
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(base + "/status", { cache: "no-store", signal: ctl.signal });
    const j = await r.json();
    if (r.ok && typeof j.open === "boolean") { status = { open: j.open, updated: j.updated, source: "live" }; write(status); apply(); }
  } catch { /* keep the cached or config value */ }
  finally { clearTimeout(t); }
  return status;
}

/* Without a Worker, the config file is the switch. Browsers (and GitHub Pages) cache that file for a while,
   so re-read it fresh and use whatever it says now. */
async function refreshFromConfig() {
  const el = document.querySelector('script[src*="status-config"]');
  if (!el) return status;
  try {
    const txt = await (await fetch(el.src, { cache: "no-store" })).text();
    const m = txt.match(/\bopen:\s*(true|false)\b/);
    if (m && (m[1] === "true") !== status.open) { status = { open: m[1] === "true", source: "config" }; apply(); }
  } catch { /* keep what the cached file said */ }
  return status;
}

function set(s) { status = { ...s, source: "live" }; write(status); apply(); }

apply();
document.addEventListener("DOMContentLoaded", apply);
refresh();
window.GROVE_STATUS = { get: () => status, refresh, set, endpoint: base };
})();
