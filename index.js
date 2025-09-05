export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/favicon.svg") {
        return new Response(svgFavicon("#7c3aed", "#06b6d4"), {
          headers: { "content-type": "image/svg+xml" },
        });
      }

      return new Response(pageHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  },
};

// ---------------- HTML Page ----------------

function pageHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CodeAssylum — Launching Soon</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      background: linear-gradient(135deg, #7c3aed, #06b6d4);
      color: white;
      font-family: 'Segoe UI', sans-serif;
      text-align: center;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 400;
      opacity: 0.9;
      margin-bottom: 2rem;
      min-height: 2rem;
    }
    #countdown {
      display: flex;
      gap: 1rem;
      font-size: 1.2rem;
      margin-bottom: 2rem;
    }
    .slot {
      background: rgba(0,0,0,0.2);
      padding: 1rem;
      border-radius: 0.75rem;
      min-width: 60px;
    }
    form {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    input[type=email] {
      padding: 0.75rem;
      border: none;
      border-radius: 0.5rem;
      outline: none;
      width: 220px;
    }
    button {
      padding: 0.75rem 1.25rem;
      background: white;
      color: #7c3aed;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: bold;
    }
    .socials {
      margin-top: 2rem;
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .socials a {
      color: white;
      font-size: 1.5rem;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <h1>🚀 CodeAssylum</h1>
  <h2 id="tagline"></h2>

  <div id="countdown">
    ${countdownSlot("Days","d")}
    ${countdownSlot("Hours","h")}
    ${countdownSlot("Min","m")}
    ${countdownSlot("Sec","s")}
  </div>

  <form id="signup">
    <input type="email" name="email" placeholder="Enter your email" required />
    <button type="submit">Notify Me</button>
  </form>

  <div class="socials">
    <a href="https://github.com/codeassylum" target="_blank">🐙</a>
    <a href="https://x.com/codeassylum" target="_blank">𝕏</a>
    <a href="https://linkedin.com/company/codeassylum" target="_blank">in</a>
  </div>

  <script>
    // Typing effect
    const words = ["AI-powered tools", "Developer-first boilerplates", "Launching Soon"];
    let i=0, j=0, current="", deleting=false;
    function type() {
      if (!deleting && j <= words[i].length) {
        current = words[i].slice(0, j++);
      } else if (deleting && j >= 0) {
        current = words[i].slice(0, j--);
      }
      document.getElementById("tagline").textContent = current;
      if (!deleting && j === words[i].length+1) { deleting=true; setTimeout(type,1200); return;}
      if (deleting && j===0) { deleting=false; i=(i+1)%words.length;}
      setTimeout(type, deleting?50:100);
    }
    type();

    // Countdown
    const launchAt = new Date("2025-11-01T12:00:00Z").getTime();
    setInterval(()=>{
      let diff = launchAt - Date.now();
      if (diff<0) diff=0;
      const d=Math.floor(diff/86400000);
      const h=Math.floor((diff%86400000)/3600000);
      const m=Math.floor((diff%3600000)/60000);
      const s=Math.floor((diff%60000)/1000);
      document.querySelector("[data-k='d']").textContent = String(d).padStart(2,"0");
      document.querySelector("[data-k='h']").textContent = String(h).padStart(2,"0");
      document.querySelector("[data-k='m']").textContent = String(m).padStart(2,"0");
      document.querySelector("[data-k='s']").textContent = String(s).padStart(2,"0");
    },1000);

    // Simple email signup
    document.getElementById("signup").addEventListener("submit", async e=>{
      e.preventDefault();
      alert("Thanks! We'll notify you.");
    });
  </script>
</body>
</html>`;
}

// ---------------- Components ----------------

function countdownSlot(label,key) {
  return `<div class="slot"><div data-k="${key}">00</div><small>${label}</small></div>`;
}

function svgFavicon(PRIMARY,ACCENT) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="30" fill="${PRIMARY}" />
    <circle cx="32" cy="32" r="15" fill="${ACCENT}" />
  </svg>`;
}
