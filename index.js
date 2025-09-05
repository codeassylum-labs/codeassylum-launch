/**
 * CodeAssylum - "Launching Soon" Cloudflare Worker (Enterprise Edition)
 * Author: Prince Jagaban (aka "The Tech Monarch")
 *
 * Drop into Cloudflare Workers quick edit or place as index.js and deploy with Wrangler.
 *
 * Environment bindings:
 * - KV namespace binding: SIGNUPS (use wrangler kv:namespace create SIGNUPS)
 * - Optional env: BREVO_WEBHOOK, PRIMARY, ACCENT, DARK, LIGHT, BRAND, TAGLINE, OWNER, CONTACT_EMAIL, GITHUB_URL, X_URL, LINKEDIN_URL, LAUNCH_AT
 */

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // API: Signup
      if (url.pathname === "/api/signup" && request.method.toUpperCase() === "POST") {
        return await handleSignup(request, env);
      }

      // assets
      if (url.pathname === "/favicon.svg") {
        return new Response(svgFavicon(env.PRIMARY || "#6b21a8", env.ACCENT || "#06b6d4"), {
          headers: htmlHeaders("image/svg+xml"),
        });
      }
      if (url.pathname === "/logo.svg") {
        return new Response(svgWordmark(env.PRIMARY || "#6b21a8", env.ACCENT || "#06b6d4"), {
          headers: htmlHeaders("image/svg+xml"),
        });
      }

      // default: page
      return new Response(pageHTML(env), { headers: htmlHeaders("text/html; charset=UTF-8") });
    } catch (err) {
      return new Response("Server error: " + String(err && err.message ? err.message : err), { status: 500 });
    }
  }
};

// ---------------- Helpers ----------------
function htmlHeaders(contentType){ return { "content-type": contentType, "cache-control":"public, max-age=3600", "x-powered-by":"Cloudflare Workers · CodeAssylum", "permissions-policy":"interest-cohort=()" }; }
function jsonHeaders(){ return { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" }; }
function isValidEmail(email){ return typeof email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()); }

// ---------------- Signup Handler ----------------
async function handleSignup(request, env){
  try{
    const ct = (request.headers.get("content-type")||"").toLowerCase();
    let data = {};
    if (ct.includes("application/json")) data = await request.json().catch(()=>({}));
    else {
      const form = await request.formData().catch(()=>null);
      if (form) data = Object.fromEntries(form.entries());
      else { const text = await request.text().catch(()=>""); data = Object.fromEntries(new URLSearchParams(text)); }
    }

    const email = (data.email||"").trim().toLowerCase();
    if (!isValidEmail(email)) return new Response(JSON.stringify({ ok:false, error:"invalid_email"}), { status:400, headers: jsonHeaders() });

    // simple KV rate-limit by IP: 10 / hour
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
    const rateKey = `rate:${ip}`;
    const now = Date.now();
    const windowMs = 60*60*1000;
    const maxPerWindow = 10;

    let bucket = await env.SIGNUPS.get(rateKey, { type: "json" }).catch(()=>null);
    if (!bucket) bucket = { ts: now, count: 0 };
    if (now - (bucket.ts||0) > windowMs) bucket = { ts: now, count: 0 };
    if ((bucket.count||0) >= maxPerWindow) return new Response(JSON.stringify({ ok:false, error:"rate_limited" }), { status:429, headers: jsonHeaders() });

    bucket.count = (bucket.count||0) + 1;
    await env.SIGNUPS.put(rateKey, JSON.stringify(bucket), { expirationTtl: 60*60*2 }).catch(()=>{});

    // dedupe: store by normalized email
    const key = `email:${email}`;
    const existing = await env.SIGNUPS.get(key, { type: "json" }).catch(()=>null);
    if (existing) return new Response(JSON.stringify({ ok:true, message:"already_signed_up" }), { status:200, headers: jsonHeaders() });

    await env.SIGNUPS.put(key, JSON.stringify({ email, ts: now })).catch((e)=>console.warn("KV put failed", e));

    // optional webhook forward (non-blocking)
    if (env.BREVO_WEBHOOK) {
      try {
        await fetch(env.BREVO_WEBHOOK, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, ts:new Date(now).toISOString() }) });
      } catch(e){ console.warn("Webhook forward failed", e); }
    }

    return new Response(JSON.stringify({ ok:true }), { status:200, headers: jsonHeaders() });
  } catch(err){
    return new Response(JSON.stringify({ ok:false, error:"server_error", detail:String(err && err.message?err.message:err) }), { status:500, headers: jsonHeaders() });
  }
}

// ---------------- Page HTML ----------------
function pageHTML(env){
  const BRAND = env.BRAND || "CodeAssylum";
  const TAGLINE = env.TAGLINE || "AI-powered developer tools & enterprise automation";
  const OWNER = env.OWNER || "Prince Jagaban · The Tech Monarch";
  const PRIMARY = env.PRIMARY || "#6b21a8";
  const ACCENT = env.ACCENT || "#06b6d4";
  const DARK = env.DARK || "#030312";
  const LIGHT = env.LIGHT || "#f8fafc";
  const LAUNCH_AT = env.LAUNCH_AT || "2025-11-01T12:00:00Z";
  const CONTACT_EMAIL = env.CONTACT_EMAIL || "hello@codeassylum.com";
  const GITHUB_URL = env.GITHUB_URL || "https://github.com/codeassylum";
  const X_URL = env.X_URL || "https://x.com/codeassylum";
  const LINKEDIN_URL = env.LINKEDIN_URL || "https://www.linkedin.com/company/codeassylum";

  const LOGO_GITHUB = "https://cdn.jsdelivr.net/npm/simple-icons@11/icons/github.svg";
  const LOGO_CLOUDFLARE = "https://cdn.jsdelivr.net/npm/simple-icons@11/icons/cloudflare.svg";
  const LOGO_OPENAI = "https://cdn.jsdelivr.net/npm/simple-icons@11/icons/openai.svg";
  const BADGE_OS = "https://img.shields.io/badge/Open%20Source-Yes-brightgreen";
  const BADGE_POW = "https://img.shields.io/badge/Powered%20by-Cloudflare%20Workers-orange";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(BRAND)} — Launching Soon</title>
<meta name="description" content="${escapeHtml(TAGLINE)}" />
<meta name="theme-color" content="${PRIMARY}" />
<meta property="og:title" content="${escapeHtml(BRAND)} — Launching Soon" />
<meta property="og:description" content="${escapeHtml(TAGLINE)}" />
<meta property="og:image" content="https://opengraph.githubassets.com/1/CodeAssylum/brand" />
<meta name="twitter:card" content="summary_large_image" />

<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">

<style>
:root{ --primary:${PRIMARY}; --accent:${ACCENT}; --bg:${DARK}; --fg:${LIGHT}; --glass:rgba(255,255,255,0.04); --radius:16px }
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:linear-gradient(180deg,#05010a 0%, #040212 100%);color:var(--fg);font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu; -webkit-font-smoothing:antialiased;}
.container{max-width:1200px;margin:0 auto;padding:56px 24px}
.header{display:flex;justify-content:space-between;align-items:center;gap:20px}
.brand{display:flex;gap:14px;align-items:center}
.logo{width:64px;height:64px;border-radius:14px;overflow:hidden;box-shadow:0 12px 40px rgba(2,6,23,0.7)}
.brand h1{font-family:'Space Grotesk',sans-serif;margin:0;font-size:18px}
.badges{display:flex;gap:10px;align-items:center}

.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:36px;margin-top:40px;align-items:start}
@media(max-width:980px){.hero{grid-template-columns:1fr}}

.card{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border-radius:20px;padding:28px;border:1px solid rgba(255,255,255,0.04);box-shadow:0 28px 80px rgba(2,6,23,0.7);backdrop-filter:blur(6px)}

.h1{display:flex;align-items:center;gap:14px;margin:0;font-family:'Space Grotesk';font-size:clamp(28px,6vw,56px)}
.badge-dot{width:12px;height:12px;border-radius:999px;background:linear-gradient(90deg,var(--primary),var(--accent));box-shadow:0 10px 30px rgba(99,102,241,0.12)}

.tagline{margin-top:12px;font-size:16px;opacity:0.95}

.countdown{display:flex;gap:12px;margin-top:22px;flex-wrap:wrap}
.slot{min-width:88px;padding:14px;border-radius:12px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.04);text-align:center}
.slot b{display:block;font-size:20px;font-variant-numeric:tabular-nums}
.slot small{display:block;font-size:12px;opacity:.85}

.form-row{display:flex;gap:10px;margin-top:18px;align-items:center}
input[type=email]{flex:1;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);background:rgba(8,10,20,0.6);color:var(--fg);outline:none}
button.cta{padding:12px 18px;border-radius:12px;border:none;background:linear-gradient(90deg,var(--primary),var(--accent));color:#fff;font-weight:700;cursor:pointer;transition:transform .16s}
button.cta:hover{transform:translateY(-3px)}

.features{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
@media(max-width:980px){.features{grid-template-columns:1fr}}
.feature{padding:12px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.03)}

.side .card{margin-bottom:18px}.socials{display:flex;gap:10px;margin-top:8px}.socials a{display:inline-flex;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,0.04)}

.footer{display:flex;justify-content:space-between;align-items:center;margin-top:36px;opacity:.9;flex-wrap:wrap;gap:8px}

.glow1{position:fixed;left:-160px;top:-120px;width:420px;height:420px;background:radial-gradient(circle closest-side,var(--primary),transparent);filter:blur(100px);opacity:.22;pointer-events:none}
.glow2{position:fixed;right:-160px;bottom:-120px;width:420px;height:420px;background:radial-gradient(circle closest-side,var(--accent),transparent);filter:blur(120px);opacity:.18;pointer-events:none}

/* toast */
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:28px;background:rgba(10,12,20,0.95);color:#fff;padding:12px 18px;border-radius:10px;box-shadow:0 10px 40px rgba(2,6,23,0.6);display:none;z-index:9999}

</style>
</head>
<body>
  <div class="glow1" aria-hidden="true"></div>
  <div class="glow2" aria-hidden="true"></div>

  <div class="container">
    <header class="header" role="banner">
      <div class="brand">
        <div class="logo" aria-hidden="true"><img src="/logo.svg" alt="${escapeHtml(BRAND)}" style="width:100%;height:100%;display:block"></div>
        <div>
          <h1 style="margin:0">${escapeHtml(BRAND)}</h1>
          <div style="font-size:12px;opacity:.9">${escapeHtml(OWNER)}</div>
        </div>
      </div>
      <div class="badges">
        <img src="${BADGE_OS}" alt="Open Source" style="height:20px" />
        <img src="${BADGE_POW}" alt="Powered by Cloudflare" style="height:20px" />
      </div>
    </header>

    <main class="hero" role="main">
      <section class="card" aria-labelledby="headline">
        <h2 id="headline" class="h1"><span class="badge-dot" aria-hidden="true"></span> ${escapeHtml(BRAND)} — Launching Soon</h2>
        <p class="tagline"><span id="typed">${escapeHtml(TAGLINE)}</span></p>

        <div class="countdown" id="countdown" aria-live="polite">
          ${countdownSlot("Days","d")}
          ${countdownSlot("Hours","h")}
          ${countdownSlot("Minutes","m")}
          ${countdownSlot("Seconds","s")}
        </div>

        <div style="margin-top:10px;font-size:13px;opacity:0.9">Target launch: <strong id="launch-at"></strong></div>

        <div class="form-row">
          <form id="signup" action="/api/signup" method="POST" onsubmit="return submitForm(event)" style="display:flex;flex:1">
            <input type="email" name="email" placeholder="Your work email" required aria-label="email" />
            <button class="cta" type="submit">Get Early Access</button>
          </form>
        </div>

        <div class="features" aria-hidden="true">
          <div class="feature"><strong>AI Assistants</strong><div style="opacity:.85">Context-aware code generation & refactor</div></div>
          <div class="feature"><strong>DevSecOps</strong><div style="opacity:.85">Secure-by-default pipelines & observability</div></div>
          <div class="feature"><strong>Open Source</strong><div style="opacity:.85">Community-first tools and transparency</div></div>
        </div>

        <div class="logos" aria-hidden="true"><img src="${LOGO_CLOUDFLARE}" alt="Cloudflare"><img src="${LOGO_GITHUB}" alt="GitHub"><img src="${LOGO_OPENAI}" alt="OpenAI"></div>
      </section>

      <aside class="side">
        <div class="card">
          <h3>About</h3>
          <p style="margin:0">CodeAssylum crafts enterprise-grade dev tooling with AI-first workflows — designed by Prince Jagaban (The Tech Monarch).</p>
        </div>

        <div class="card">
          <h3>Contact</h3>
          <p style="margin:0 0 8px">Partnerships & press: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
          <div class="socials">
            <a href="${GITHUB_URL}" target="_blank" rel="noopener noreferrer" aria-label="GitHub">${iconGitHub()}</a>
            <a href="${X_URL}" target="_blank" rel="noopener noreferrer" aria-label="X">${iconX()}</a>
            <a href="${LINKEDIN_URL}" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">${iconLinkedIn()}</a>
          </div>
        </div>
      </aside>
    </main>

    <footer class="footer">
      <small>© <span id="year"></span> ${escapeHtml(BRAND)} — Built by ${escapeHtml(OWNER)}</small>
      <small>Powered by <a href="https://developers.cloudflare.com/workers/" target="_blank">Cloudflare Workers</a></small>
    </footer>
  </div>

  <div id="toast" class="toast" role="status" aria-live="polite"></div>

<script>
// Client-side scripts: countdown, typing, AJAX signup, toast, exit-intent
const LAUNCH_AT = new Date(${JSON.stringify("2025-11-01T12:00:00Z")});
const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();
const laEl = document.getElementById('launch-at'); if(laEl) laEl.textContent = LAUNCH_AT.toUTCString();

// Countdown
const dEl = document.querySelector('[data-k="d"]');
const hEl = document.querySelector('[data-k="h"]');
const mEl = document.querySelector('[data-k="m"]');
const sEl = document.querySelector('[data-k="s"]');
function updateCountdown(){ const now=new Date(); let diff=Math.max(0, LAUNCH_AT-now); const SEC=1000,MIN=60*SEC,H=60*MIN,D=24*H; const d=Math.floor(diff/D); diff-=d*D; const h=Math.floor(diff/H); diff-=h*H; const m=Math.floor(diff/MIN); diff-=m*MIN; const s=Math.floor(diff/SEC); if(dEl) dEl.textContent=String(d).padStart(2,'0'); if(hEl) hEl.textContent=String(h).padStart(2,'0'); if(mEl) mEl.textContent=String(m).padStart(2,'0'); if(sEl) sEl.textContent=String(s).padStart(2,'0'); }
setInterval(updateCountdown,1000); updateCountdown();

// Typing loop
(function typeLoop(){ const el=document.getElementById('typed'); if(!el) return; const phrases=[el.textContent||"AI-powered developer tools & enterprise automation","Enterprise-grade security","AI-first developer workflows","Open-source by design"]; let i=0,j=0,dir=1; function step(){ const cur=phrases[i]; el.textContent=cur.slice(0,j); j+=dir; if(j>cur.length){ dir=-1; setTimeout(step,1200); return; } if(j<0){ dir=1; i=(i+1)%phrases.length; j=0; } setTimeout(step, dir>0?46:28); } step(); })();

// Toast helper
function showToast(msg, timeout=3000){ const t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.style.display='block'; setTimeout(()=>{ t.style.display='none'; }, timeout); }

// AJAX signup
async function submitForm(e){ e.preventDefault(); const form=e.target; const data=new FormData(form); const btn=form.querySelector('button'); btn.disabled=true; const old=btn.textContent; btn.textContent='Sending...'; try{ const res=await fetch(form.action,{method:'POST',body:data}); const j=await res.json().catch(()=>({ok:false})); if(j.ok){ btn.textContent='Thanks — Check your inbox'; form.reset(); showToast('Thanks — we\\'ll notify you shortly'); } else if(j.error==='rate_limited'){ btn.textContent='Too many requests'; showToast('Rate limited — try later'); } else if(j.message==='already_signed_up'){ btn.textContent='You’re on the list'; showToast('You are already signed up'); } else{ btn.textContent='Try again'; showToast('Signup failed'); } }catch(err){ btn.textContent='Error'; showToast('Network error'); } setTimeout(()=>{ btn.disabled=false; btn.textContent=old; },3000); return false; }

// Exit-intent toast (desktop)
let exitShown=false;
document.addEventListener('mouseout', (e)=>{ if(exitShown) return; if(e.clientY<10){ exitShown=true; showToast('Wait - join early access before you go ✨',5000); } });

</script>

<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"CodeAssylum","url":"https://codeassylum.com","sameAs":["https://github.com/codeassylum","https://x.com/codeassylum","https://www.linkedin.com/company/codeassylum"],"slogan":"AI-powered developer tools & enterprise automation","founder":"Prince Jagaban"}</script>

</body>
</html>`;
}

// ---------------- small components ----------------
function countdownSlot(label, key){ return `<div class="slot"><b data-k="${key}">00</b><small>${escapeHtml(label)}</small></div>`; }
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ---------------- inline svgs ----------------
function svgFavicon(PRIMARY, ACCENT){ return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${PRIMARY}"/><stop offset="100%" stop-color="${ACCENT}"/></linearGradient></defs><rect width="64" height="64" rx="12" fill="#030312"/><g transform="translate(8,6)"><path fill="url(#g)" d="M12 30c0-10 6-18 18-18s18 8 18 18c-6-6-13-8-18-8s-12 2-18 8z"/><path fill="#fff" d="M20 18l-6 10h6l-2 12 12-16h-6l2-8z"/></g></svg>`; }
function svgWordmark(PRIMARY, ACCENT){ return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 64"><defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${PRIMARY}"/><stop offset="100%" stop-color="${ACCENT}"/></linearGradient></defs><rect width="360" height="64" rx="12" fill="#030312"/><g transform="translate(12,12)"><path fill="url(#wg)" d="M0 28C2 10 14 0 32 0s30 10 32 28c-10-10-21-14-32-14S10 18 0 28z"/><text x="80" y="36" font-family="Space Grotesk, sans-serif" font-size="28" fill="#fff" font-weight="700">CodeAssylum</text></g></svg>`; }
function iconGitHub(){ return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.41-1.35-1.78-1.35-1.78-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.24 1.85 1.24 1.08 1.85 2.84 1.32 3.53 1.01.11-.79.42-1.32.76-1.63-2.67-.31-5.47-1.33-5.47-5.9 0-1.3.47-2.37 1.24-3.2-.12-.3-.54-1.54.12-3.2 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.67 1.66.25 2.9.12 3.2.77.83 1.23 1.9 1.23 3.2 0 4.59-2.8 5.58-5.48 5.88.43.37.81 1.1.81 2.23v3.3c0 .32.22.69.82.58A12 12 0 0 0 12 .5Z"/></svg>`; }
function iconX(){ return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2H21l-6.56 7.49L22 22h-6.843l-5.35-6.912L3.6 22H1l7.02-8.01L2 2h6.977l4.83 6.28L18.244 2Zm-2.394 18h1.77L7.297 4H5.41l10.44 16Z"/></svg>`; }
function iconLinkedIn(){ return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM0 8.98h5V24H0V8.98ZM7.98 8.98H13v2.05h.07c.7-1.33 2.4-2.74 4.93-2.74C23.5 8.29 24 12 24 16.6V24h-5v-6.64c0-1.58-.03-3.62-2.21-3.62-2.21 0-2.55 1.72-2.55 3.5V24h-5V8.98Z"/></svg>`; }
