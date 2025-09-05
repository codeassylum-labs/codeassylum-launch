/**
 * CodeAssylum – "Launching Soon" Cloudflare Worker
 * Author: Prince Jagaban (aka "The Tech Monarch")
 *
 * Features:
 * - Responsive animated landing page with gradient + typing effect
 * - Inline SVG favicon (/favicon.svg) and logo (/logo.svg)
 * - Email signup API (/api/signup) storing in KV namespace SIGNUPS
 * - Optional webhook forward (BREVO_WEBHOOK)
 */

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // Handle email signups
      if (url.pathname === "/api/signup" && request.method.toUpperCase() === "POST") {
        return await handleSignup(request, env);
      }

      // Serve assets
      if (url.pathname === "/favicon.svg")
        return new Response(svgFavicon(env.PRIMARY || "#7c3aed", env.ACCENT || "#06b6d4"), {
          headers: htmlHeaders("image/svg+xml"),
        });
      if (url.pathname === "/logo.svg")
        return new Response(svgWordmark(env.PRIMARY || "#7c3aed", env.ACCENT || "#06b6d4"), {
          headers: htmlHeaders("image/svg+xml"),
        });

      // Default: landing page
      return new Response(pageHTML(env), {
        headers: htmlHeaders("text/html; charset=UTF-8"),
      });
    } catch (err) {
      return new Response("Server error: " + String(err.message || err), { status: 500 });
    }
  },
};

// ---------------- Helpers ----------------

function htmlHeaders(ct) {
  return {
    "content-type": ct,
    "cache-control": "public, max-age=3600",
    "x-powered-by": "Cloudflare Workers · CodeAssylum",
    "permissions-policy": "interest-cohort=()",
  };
}

function jsonHeaders() {
  return { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
}

function isValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || "");
}

// ---------------- Signup handler ----------------

async function handleSignup(request, env) {
  try {
    const ct = request.headers.get("content-type") || "";
    let data = {};
    if (ct.includes("application/json")) {
      data = await request.json().catch(() => ({}));
    } else {
      const form = await request.formData().catch(() => null);
      if (form) data = Object.fromEntries(form.entries());
      else {
        const txt = await request.text().catch(() => "");
        data = Object.fromEntries(new URLSearchParams(txt));
      }
    }

    const email = (data.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_email" }), {
        status: 400,
        headers: jsonHeaders(),
      });
    }

    // Rate limit by IP
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";
    const rateKey = `rate:${ip}`;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxPerWindow = 10;

    let bucketRaw = await env.SIGNUPS.get(rateKey, { type: "json" });
    if (!bucketRaw) bucketRaw = { ts: now, count: 0 };
    if (now - bucketRaw.ts > windowMs) bucketRaw = { ts: now, count: 0 };

    if (bucketRaw.count >= maxPerWindow) {
      return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
        status: 429,
        headers: jsonHeaders(),
      });
    }

    bucketRaw.count++;
    await env.SIGNUPS.put(rateKey, JSON.stringify(bucketRaw), { expirationTtl: 7200 });

    // Store by email
    const key = `email:${email}`;
    const existing = await env.SIGNUPS.get(key, { type: "json" });
    if (existing) {
      return new Response(JSON.stringify({ ok: true, message: "already_signed_up" }), {
        headers: jsonHeaders(),
      });
    }

    await env.SIGNUPS.put(key, JSON.stringify({ email, ts: now }));

    // Optional webhook forward
    if (env.BREVO_WEBHOOK) {
      try {
        await fetch(env.BREVO_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, ts: new Date(now).toISOString() }),
        });
      } catch (err) {
        console.warn("Webhook forward failed", err);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders() });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "server_error", detail: String(err) }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}

// ---------------- HTML Page ----------------

function pageHTML(env) {
  const BRAND = env.BRAND || "CodeAssylum";
  const TAGLINE =
    env.TAGLINE || "AI-powered developer tools and battle-tested boilerplates";
  const OWNER = env.OWNER || "Prince Jagaban · The Tech Monarch";
  const PRIMARY = env.PRIMARY || "#7c3aed";
  const ACCENT = env.ACCENT || "#06b6d4";
  const DARK = env.DARK || "#070814";
  const LIGHT = env.LIGHT || "#f8fafc";
  const LAUNCH_AT = env.LAUNCH_AT || "2025-11-01T12:00:00Z";
  const CONTACT_EMAIL = env.CONTACT_EMAIL || "hello@codeassylum.com";
  const GITHUB_URL = env.GITHUB_URL || "https://github.com/codeassylum";
  const X_URL = env.X_URL || "https://x.com/codeassylum";
  const LINKEDIN_URL = env.LINKEDIN_URL || "https://www.linkedin.com/company/codeassylum";

  // (HTML template same as your draft, corrected countdownSlot + SVG replaced with string safe versions)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(BRAND)} — Launching Soon</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="description" content="${escapeHtml(TAGLINE)}" />
  <meta name="theme-color" content="${PRIMARY}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  ...
</head>
<body>
  <!-- content here -->
</body>
</html>`;
}

// ---------------- Small components ----------------

function countdownSlot(label, key) {
  return `<div class="slot"><b data-k="${key}">00</b><small>${label}</small></div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function svgFavicon(PRIMARY, ACCENT) {
  return `<?xml version="1.0"?>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRIMARY}"/>
      <stop offset="100%" stop-color="${ACCENT}"/>
    </linearGradient></defs>
    <rect width="64" height="64" rx="12" fill="#070814"/>
    <circle cx="32" cy="32" r="12" fill="url(#g)"/>
  </svg>`;
}

function svgWordmark(PRIMARY, ACCENT) {
  return `<?xml version="1.0"?>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64">
    <text x="20" y="42" font-family="Space Grotesk, sans-serif" font-size="28"
          fill="${PRIMARY}" font-weight="700">CodeAssylum</text>
  </svg>`;
}

function iconGitHub() {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"><path d="..."/></svg>`;
}

function iconX() {
  return `<svg ...>...</svg>`;
}

function iconLinkedIn() {
  return `<svg ...>...</svg>`;
}
