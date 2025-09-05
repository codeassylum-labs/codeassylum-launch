/**
 * CodeAssylum – "Launching Soon" Cloudflare Worker (single-file) — Fixed & Clean
 * Author: Prince Jagaban (aka "The Tech Monarch")
 *
 * Features:
 * - Responsive coming-soon page with animated gradients, typing effect, and countdown
 * - Inline SVG endpoints: /favicon.svg and /logo.svg
 * - POST /api/signup -> stores into KV namespace SIGNUPS (bind this in Wrangler)
 * - Optional webhook forward to BREVO_WEBHOOK if set in env
 * - Theming and links configurable via env vars
 *
 * Deployment notes:
 * - Bind a KV namespace to this Worker named SIGNUPS (or change the name below)
 * - Set env vars (Wrangler or Dashboard): LAUNCH_AT, BRAND, TAGLINE, OWNER, CONTACT_EMAIL, GITHUB_URL, X_URL, LINKEDIN_URL, BREVO_WEBHOOK (optional)
 */

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // Signup API
      if (url.pathname === "/api/signup" && request.method.toUpperCase() === "POST") {
        return await handleSignup(request, env);
      }

      // Inline SVG endpoints
      if (url.pathname === "/favicon.svg") {
        return new Response(svgFavicon(env.PRIMARY || "#7c3aed", env.ACCENT || "#06b6d4"), {
          headers: htmlHeaders("image/svg+xml"),
        });
      }
      if (url.pathname === "/logo.svg") {
        return new Response(svgWordmark(env.PRIMARY || "#7c3aed", env.ACCENT || "#06b6d4"), {
          headers: htmlHeaders("image/svg+xml"),
        });
      }

      // Default: HTML landing page
      const html = pageHTML(env);
      return new Response(html, { headers: htmlHeaders("text/html; charset=UTF-8") });
    } catch (err) {
      return new Response("Server error: " + String(err && err.message ? err.message : err), { status: 500 });
    }
  },
};

// ---------------- Helpers ----------------
function htmlHeaders(contentType) {
  return {
    "content-type": contentType,
    "cache-control": "public, max-age=3600",
    "x-powered-by": "Cloudflare Workers · CodeAssylum",
    "permissions-policy": "interest-cohort=()",
  };
}
function jsonHeaders() {
  return { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
}
function isValidEmail(email) {
  return typeof email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

// ---------------- Signup handler ----------------
async function handleSignup(request, env) {
  try {
    const ct = (request.headers.get("content-type") || "").toLowerCase();
    let data = {};

    if (ct.includes("application/json")) {
      data = await request.json().catch(() => ({}));
    } else {
      const form = await request.formData().catch(() => null);
      if (form) data = Object.fromEntries(form.entries());
      else {
        const text = await request.text().catch(() => "");
        data = Object.fromEntries(new URLSearchParams(text));
      }
    }

    const email = (data.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_email" }), {
        status: 400,
        headers: jsonHeaders(),
      });
    }

    // Rate limiting per IP (simple window counter in KV)
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
    const rateKey = `rate:${ip}`;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxPerWindow = 10;

    // Read bucket
    let bucket = await env.SIGNUPS.get(rateKey, { type: "json" }).catch(() => null);
    if (!bucket) bucket = { ts: now, count: 0 };

    if (now - (bucket.ts || 0) > windowMs) bucket = { ts: now, count: 0 };
    if ((bucket.count || 0) >= maxPerWindow) {
      return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
        status: 429,
        headers: jsonHeaders(),
      });
    }

    bucket.count = (bucket.count || 0) + 1;
    await env.SIGNUPS.put(rateKey, JSON.stringify(bucket), { expirationTtl: 60 * 60 * 2 }).catch(() => {});

    // Store email keyed by email (simple dedupe)
    const key = `email:${email}`;
    const existing = await env.SIGNUPS.get(key, { type: "json" }).catch(() => null);
    if (existing) {
      return new Response(JSON.stringify({ ok: true, message: "already_signed_up" }), {
        status: 200,
        headers: jsonHeaders(),
      });
    }

    const record = { email, ts: now };
    await env.SIGNUPS.put(key, JSON.stringify(record)).catch((e) => {
      console.warn("KV put failed", e);
    });

    // Optional webhook forward
    if (env.BREVO_WEBHOOK) {
      try {
        await fetch(env.BREVO_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, ts: new Date(now).toISOString() }),
        });
      } catch (e) {
        // don't fail the signup if webhook fails; only warn
        console.warn("BREVO webhook forward failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders() });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "server_error", detail: String(err && err.message ? err.message : err) }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}

// ---------------- Page HTML (full, cleaned) ----------------
function pageHTML(env) {
  const BRAND = env.BRAND || "CodeAssylum";
  const TAGLINE = env.TAGLINE || "AI-powered developer tools and battle-tested boilerplates";
  const OWNER = env.OWNER || "Prince Jagaban · The Tech Monarch";
  const PRIMARY = env.PRIMARY || "#7c3aed"; // violet
  const ACCENT = env.ACCENT || "#06b6d4"; // cyan
  const DARK = env.DARK || "#070814";
  const LIGHT = env.LIGHT || "#f8fafc";
  const LAUNCH_AT = env.LAUNCH_AT || "2025-11-01T12:00:00Z";
  const CONTACT_EMAIL = env.CONTACT_EMAIL || "hello@codeassylum.com";
  const GITHUB_URL = env.GITHUB_URL || "https://github.com/codeassylum";
  const X_URL = env.X_URL || "https://x.com/codeassylum";
  const LINKEDIN_URL = env.LINKEDIN_URL || "https://www.linkedin.com/company/codeassylum";

  const LOGO_GITHUB = "https://cdn.jsdelivr.net/npm/simple-icons@11/icons/github.svg";
  const LOGO_CLOUDFLARE = "https://cdn.jsdelivr.net/npm/simple-icons@11/icons/cloudflare.svg";
  const BADGE_OPEN_SOURCE = "https://img.shields.io/badge/Open%20Source-Yes-brightgreen";
  const BADGE_POWERED_BY = "https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-orange";

  // return full HTML as template literal
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(BRAND)} — Launching Soon</title>
  <meta name="description" content="${escapeHtml(TAGLINE)}" />
  <meta name="theme-color" content="${PRIMARY}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">

  <style>
    :root{ --primary: ${PRIMARY}; --accent: ${ACCENT}; --bg: ${DARK}; --fg: ${LIGHT}; }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased}
    .bg-wrap{position:fixed;inset:0;overflow:hidden;z-index:-2}
    .gradient{position:absolute;left:-20%;top:-30%;width:140%;height:160%;background:radial-gradient(circle at 10% 10%, rgba(124,58,237,0.35), transparent 15%), radial-gradient(circle at 90% 80%, rgba(6,182,212,0.28), transparent 18%);filter:blur(60px);animation:float 12s ease-in-out infinite}
    @keyframes float{0%{transform:translateY(-6%)}50%{transform:translateY(6%)}100%{transform:translateY(-6%)}}
    .wrap{max-width:1100px;margin:0 auto;padding:48px 20px}
    header{display:flex;justify-content:space-between;align-items:center}
    .brand{display:flex;gap:14px;align-items:center}
    .brand img{width:46px;height:46px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.5)}
    .title{font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:20px}
    .owner{font-size:12px;opacity:0.9}
    .hero{display:grid;grid-template-columns:1fr 420px;gap:32px;align-items:start;margin-top:44px}
    @media (max-width:980px){.hero{grid-template-columns:1fr}}
    .card{background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,0.05);box-shadow:0 20px 60px rgba(2,6,23,0.6)}
    h1{margin:0;font-family:'Space Grotesk';font-size: clamp(28px, 5.5vw, 54px);line-height:1}
    .tagline{margin-top:10px;font-size:16px;opacity:0.95}
    .typing{display:inline-block;border-right:2px solid rgba(255,255,255,0.12);padding-right:6px;margin-left:6px}
    .countdown{display:flex;gap:12px;margin-top:22px}
    .slot{min-width:84px;padding:12px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.04);text-align:center}
    .slot b{display:block;font-size:20px}
    .slot small{display:block;font-size:12px;opacity:0.8}
    form{display:flex;gap:10px;margin-top:18px}
    input[type=email]{flex:1;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);background:rgba(8,10,20,0.6);color:var(--fg);outline:none}
    button{padding:12px 16px;border-radius:12px;border:none;background:linear-gradient(90deg,var(--primary),var(--accent));color:#fff;font-weight:700;cursor:pointer}
    button:hover{transform:translateY(-2px)}
    .logos{display:flex;gap:12px;align-items:center;margin-top:18px}
    .logos img{height:28px;opacity:0.95}
    .side h3{margin:0 0 8px;font-family:'Space Grotesk'}
    .side ul{margin:0;padding-left:18px;line-height:1.6}
    footer{display:flex;justify-content:space-between;align-items:center;opacity:0.9;margin-top:36px}
    a{color:inherit}
    .pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04)}
    @media (max-width:640px){.logos{flex-wrap:wrap}.hero{gap:18px}}
  </style>
</head>
<body>
  <div class="bg-wrap"><div class="gradient" aria-hidden="true"></div></div>
  <div class="wrap">
    <header>
      <div class="brand">
        <img src="/logo.svg" alt="${escapeHtml(BRAND)}">
        <div>
          <div class="title">${escapeHtml(BRAND)}</div>
          <div class="owner">${escapeHtml(OWNER)}</div>
        </div>
      </div>
      <div class="pill"><img src="${BADGE_OPEN_SOURCE}" alt="open source" style="height:18px"> <span style="font-size:13px">Open Source · Coming Soon</span></div>
    </header>

    <main class="hero">
      <section class="card">
        <h1>Launching Soon
          <span class="typing" id="typed">${escapeHtml(TAGLINE)}</span>
        </h1>
        <p class="tagline">We build reliable developer tools, AI assistants for code, and secure deployment workflows. Join the early access list.</p>

        <div class="countdown" id="countdown" aria-live="polite">
          ${countdownSlot("Days","d")}
          ${countdownSlot("Hours","h")}
          ${countdownSlot("Minutes","m")}
          ${countdownSlot("Seconds","s")}
        </div>
        <div style="margin-top:10px;font-size:13px;opacity:0.9">Target launch: <strong id="launch-at"></strong></div>

        <form id="signup" action="/api/signup" method="POST" onsubmit="return submitForm(event)">
          <input type="email" name="email" placeholder="Your email address" required />
          <button type="submit">Get Notified</button>
        </form>

        <div class="logos" aria-hidden="true">
          <img src="${LOGO_CLOUDFLARE}" alt="Cloudflare">
          <img src="${LOGO_GITHUB}" alt="GitHub">
          <img src="https://cdn.jsdelivr.net/npm/simple-icons@11/icons/openai.svg" alt="OpenAI">
        </div>
      </section>

      <aside class="side">
        <div class="card">
          <h3>What to Expect</h3>
          <ul>
            <li>Open-source boilerplates and CLI tools</li>
            <li>AI helpers for code generation & refactor</li>
            <li>Security-first defaults: auth, rate-limits, observability</li>
            <li>Free tier for students and indie devs</li>
          </ul>
        </div>

        <div class="card">
          <h3>Contact</h3>
          <p style="margin:0 0 8px">Questions or partnerships? <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
          <div style="display:flex;gap:10px;margin-top:8px">
            <a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer">${iconGitHub()}</a>
            <a href="${X_URL}" target="_blank" rel="noopener noreferrer">${iconX()}</a>
            <a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer">${iconLinkedIn()}</a>
          </div>
        </div>
      </aside>
    </main>

    <footer>
      <small>© <span id="year"></span> ${escapeHtml(BRAND)} — Built by ${escapeHtml(OWNER)}</small>
      <small>Powered by <a href="https://developers.cloudflare.com/workers/" target="_blank">Cloudflare Workers</a></small>
    </footer>
  </div>

  <div class="glow" aria-hidden="true"></div>
  <div class="glow2" aria-hidden="true"></div>

  <script>
    // Setup launch date and UI refs
    const LAUNCH_AT = new Date(${JSON.stringify(LAUNCH_AT)});
    const dEl = document.querySelector('[data-k="d"]');
    const hEl = document.querySelector('[data-k="h"]');
    const mEl = document.querySelector('[data-k="m"]');
    const sEl = document.querySelector('[data-k="s"]');
    const laEl = document.getElementById('launch-at');
    const yearEl = document.getElementById('year');
    laEl.textContent = LAUNCH_AT.toUTCString();
    yearEl.textContent = new Date().getFullYear();

    // Countdown update
    function updateCountdown(){
      const now = new Date();
      let diff = Math.max(0, LAUNCH_AT - now);
      const SEC = 1000, MIN = 60*SEC, H = 60*MIN, D = 24*H;
      const d = Math.floor(diff / D); diff -= d*D;
      const h = Math.floor(diff / H); diff -= h*H;
      const m = Math.floor(diff / MIN); diff -= m*MIN;
      const s = Math.floor(diff / SEC);
      if (dEl) dEl.textContent = String(d);
      if (hEl) hEl.textContent = String(h).padStart(2,'0');
      if (mEl) mEl.textContent = String(m).padStart(2,'0');
      if (sEl) sEl.textContent = String(s).padStart(2,'0');
    }
    setInterval(updateCountdown,1000); updateCountdown();

    // Typing effect
    (function typeEffect(){
      const el = document.getElementById('typed');
      if (!el) return;
      const full = el.textContent.trim();
      el.textContent = '';
      let i=0;
      const speed = 45;
      function step(){ if(i<=full.length){ el.textContent = full.slice(0,i++); setTimeout(step, speed)} }
      step();
    })();

    // AJAX signup to /api/signup
    async function submitForm(e){
      e.preventDefault();
      const form = e.target;
      const data = new FormData(form);
      const btn = form.querySelector('button');
      btn.disabled = true; const old = btn.textContent; btn.textContent = 'Sending...';
      try{
        const res = await fetch(form.action, { method:'POST', body: data });
        const j = await res.json().catch(()=>({ok:false}));
        if (j.ok) { btn.textContent = 'Thanks — Check your inbox'; form.reset(); }
        else if (j.error === 'rate_limited') { btn.textContent = 'Too many requests'; }
        else if (j.message === 'already_signed_up') { btn.textContent = 'You’re on the list'; }
        else { btn.textContent = 'Try again'; }
      }catch(err){ btn.textContent = 'Error'; }
      setTimeout(()=>{ btn.disabled=false; btn.textContent = old; },3000);
      return false;
    }
  </script>

  <script type="application/ld+json">${JSON.stringify({
    '@context':'https://schema.org',
    '@type':'Organization',
    name: BRAND,
    url: 'https://codeassylum.com',
    sameAs: [GITHUB_URL, X_URL, LINKEDIN_URL],
    slogan: TAGLINE,
    founder: OWNER
  })}</script>
</body>
</html>`;
}

// ---------------- Small components ----------------
function countdownSlot(label, key) {
  return `<div class="slot"><b data-k="${key}">00</b><small>${escapeHtml(label)}</small></div>`;
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------------- Inline SVGs & icons ----------------
function svgFavicon(PRIMARY, ACCENT) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRIMARY}"/>
      <stop offset="100%" stop-color="${ACCENT}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="12" fill="#070814"/>
  <path fill="url(#g)" d="M12 40c0-14 8-24 20-24s20 10 20 24c-6-6-13-9-20-9s-14 3-20 9z"/>
  <circle cx="32" cy="28" r="6" fill="white"/>
</svg>`;
}

function svgWordmark(PRIMARY, ACCENT) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRIMARY}"/>
      <stop offset="100%" stop-color="${ACCENT}"/>
    </linearGradient>
  </defs>
  <rect width="320" height="64" rx="12" fill="#070814"/>
  <g transform="translate(12,12)">
    <path fill="url(#g2)" d="M0 28C2 10 14 0 32 0s30 10 32 28c-10-10-21-14-32-14S10 18 0 28z"/>
    <text x="72" y="34" font-family="Space Grotesk, sans-serif" font-size="24" fill="#ffffff" font-weight="700">CodeAssylum</text>
  </g>
</svg>`;
}

function iconGitHub() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.41-1.35-1.78-1.35-1.78-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.24 1.85 1.24 1.08 1.85 2.84 1.32 3.53 1.01.11-.79.42-1.32.76-1.63-2.67-.31-5.47-1.33-5.47-5.9 0-1.3.47-2.37 1.24-3.2-.12-.3-.54-1.54.12-3.2 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.67 1.66.25 2.9.12 3.2.77.83 1.23 1.9 1.23 3.2 0 4.59-2.8 5.58-5.48 5.88.43.37.81 1.1.81 2.23v3.3c0 .32.22.69.82.58A12 12 0 0 0 12 .5Z"/></svg>`;
}
function iconX() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2H21l-6.56 7.49L22 22h-6.843l-5.35-6.912L3.6 22H1l7.02-8.01L2 2h6.977l4.83 6.28L18.244 2Zm-2.394 18h1.77L7.297 4H5.41l10.44 16Z"/></svg>`;
}
function iconLinkedIn() {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM0 8.98h5V24H0V8.98ZM7.98 8.98H13v2.05h.07c.7-1.33 2.4-2.74 4.93-2.74C23.5 8.29 24 12 24 16.6V24h-5v-6.64c0-1.58-.03-3.62-2.21-3.62-2.21 0-2.55 1.72-2.55 3.5V24h-5V8.98Z"/></svg>`;
}
