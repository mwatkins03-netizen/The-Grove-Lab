/**
 * Grove Lab submission status — Cloudflare Worker
 * Holds one value: whether the build form is open for submissions.
 *   GET  /status                       -> { open, updated }
 *   POST /status { password, open }    -> sets it (password checked here, never in the page)
 * The admin password is a Worker secret. The status lives in a KV namespace bound as GROVE.
 * Separate from the Jev proxy on purpose, so nothing here can affect the builds that use Jev.
 *
 * Deploy (see README "Open/closed sign"):
 *   npx wrangler login
 *   npx wrangler kv namespace create GROVE        (paste the id into wrangler.toml)
 *   npx wrangler secret put ADMIN_PASSWORD        (type the password when prompted)
 *   npx wrangler deploy
 */

const MAX_FAILS = 5;            // wrong passwords allowed per IP...
const LOCK_MS = 15 * 60_000;    // ...per 15 minutes
const fails = new Map();        // per-isolate; a speed bump, not a vault

function cors(origin, env) {
  const allow = (env.ALLOWED_ORIGINS || "*").split(",").map(s => s.trim());
  const ok = allow.includes("*") || allow.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (origin || "*") : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

async function sha256(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function readStatus(env) {
  const v = await env.GROVE.get("status", "json");
  return v && typeof v.open === "boolean" ? v : { open: true, updated: null };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const headers = { ...cors(origin, env), "Content-Type": "application/json", "Cache-Control": "no-store" };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (!url.pathname.replace(/\/+$/, "").endsWith("/status")) return json({ error: "Not found. Use /status." }, 404);
    if (!env.GROVE) return json({ error: "The GROVE KV namespace is not bound. See wrangler.toml." }, 500);

    if (request.method === "GET") return json(await readStatus(env));

    if (request.method === "POST") {
      if (!env.ADMIN_PASSWORD) return json({ error: "No ADMIN_PASSWORD secret is set on the Worker." }, 500);
      const ip = request.headers.get("CF-Connecting-IP") || "anon";
      const now = Date.now();
      const f = fails.get(ip);
      if (f && f.n >= MAX_FAILS && now - f.t < LOCK_MS) {
        return json({ error: "Too many wrong passwords. Try again in 15 minutes." }, 429);
      }
      let body;
      try { body = await request.json(); } catch { return json({ error: "Bad JSON" }, 400); }
      const ok = (await sha256(body.password ?? "")) === (await sha256(env.ADMIN_PASSWORD));
      if (!ok) {
        const n = f && now - f.t < LOCK_MS ? f.n + 1 : 1;
        fails.set(ip, { n, t: f && now - f.t < LOCK_MS ? f.t : now });
        return json({ error: "That password didn't work.", remaining: Math.max(0, MAX_FAILS - n) }, 401);
      }
      fails.delete(ip);
      if (typeof body.open !== "boolean") return json({ ...(await readStatus(env)), verified: true });
      const status = { open: body.open, updated: new Date().toISOString() };
      await env.GROVE.put("status", JSON.stringify(status));
      return json(status);
    }
    return json({ error: "Use GET or POST." }, 405);
  },
};
