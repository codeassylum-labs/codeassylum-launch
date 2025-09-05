<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeAssylum – Launching Soon</title>
  <meta name="description" content="CodeAssylum – The next generation enterprise cloud, AI and security hub. Coming soon.">
  <meta name="keywords" content="CodeAssylum, Cloudflare, Cybersecurity, AI, SaaS, Launch, Startup">
  <meta name="author" content="CodeAssylum Labs">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;600;800&display=swap" rel="stylesheet">

  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Inter', sans-serif;
      min-height:100vh;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      text-align:center;
      background: linear-gradient(-45deg, #0f0c29, #302b63, #24243e, #1e1e2f);
      background-size:400% 400%;
      animation: gradientShift 15s ease infinite;
      color:#fff;
      overflow:hidden;
      padding: 20px;
    }
    @keyframes gradientShift {
      0% { background-position:0% 50% }
      50% { background-position:100% 50% }
      100% { background-position:0% 50% }
    }

    header {
      display:flex;
      flex-direction:column;
      align-items:center;
      margin-bottom:40px;
    }
    .logo {
      font-size:3rem;
      font-weight:800;
      letter-spacing:-2px;
      background: linear-gradient(90deg, #00f260, #0575e6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: pulse 3s infinite;
    }
    @keyframes pulse {
      0%,100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    h1 {
      font-size:2.5rem;
      margin:10px 0;
    }
    p {
      max-width:700px;
      font-size:1.2rem;
      opacity:0.9;
      margin-bottom:30px;
    }

    .countdown {
      display:flex;
      gap:15px;
      margin-bottom:30px;
    }
    .time-box {
      backdrop-filter: blur(10px);
      background: rgba(255,255,255,0.1);
      padding:20px 25px;
      border-radius:20px;
      min-width:90px;
      transition:0.3s;
    }
    .time-box:hover { transform:scale(1.05); background:rgba(255,255,255,0.2); }
    .time-value { font-size:2rem; font-weight:700; }
    .time-label { font-size:0.8rem; opacity:0.8; }

    .subscribe {
      margin:20px 0;
    }
    input[type="email"] {
      padding:12px 20px;
      border-radius:30px;
      border:none;
      outline:none;
      width:250px;
      margin-right:10px;
      font-size:1rem;
    }
    button {
      padding:12px 25px;
      border-radius:30px;
      border:none;
      cursor:pointer;
      font-size:1rem;
      font-weight:600;
      background: linear-gradient(90deg,#ff512f,#dd2476);
      color:#fff;
      transition:all .3s;
    }
    button:hover { transform:scale(1.05); opacity:0.9; }

    footer {
      position:absolute;
      bottom:15px;
      font-size:0.9rem;
      opacity:0.7;
      text-align:center;
      width:100%;
    }
    footer a {
      color:#00f2fe;
      text-decoration:none;
      margin:0 10px;
    }
    footer a:hover { text-decoration:underline; }
  </style>
</head>
<body>

  <header>
    <div class="logo">CodeAssylum</div>
    <h1>We’re Launching Soon 🚀</h1>
    <p>Welcome to CodeAssylum Labs – your enterprise hub for AI, cloud security, and next-gen SaaS. Stay tuned for our global launch.</p>
  </header>

  <div class="countdown">
    <div class="time-box"><div class="time-value" id="days">00</div><div class="time-label">Days</div></div>
    <div class="time-box"><div class="time-value" id="hours">00</div><div class="time-label">Hours</div></div>
    <div class="time-box"><div class="time-value" id="minutes">00</div><div class="time-label">Minutes</div></div>
    <div class="time-box"><div class="time-value" id="seconds">00</div><div class="time-label">Seconds</div></div>
  </div>

  <div class="subscribe">
    <form id="subscribeForm">
      <input type="email" id="email" placeholder="Enter your email" required>
      <button type="submit">Subscribe</button>
    </form>
    <p id="statusMsg"></p>
  </div>

  <footer>
    © 2025 CodeAssylum Labs. All rights reserved. 
    <br>
    <a href="https://github.com/codeassylum-labs" target="_blank">GitHub</a> • 
    <a href="mailto:contact@codeassylum.com">Contact</a> • 
    <a href="https://twitter.com/codeassylum" target="_blank">Twitter</a>
  </footer>

  <script>
    // Countdown Timer
    const launchDate = new Date("2025-12-31T00:00:00").getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const dist = launchDate - now;

      const days = Math.floor(dist/(1000*60*60*24));
      const hours = Math.floor((dist%(1000*60*60*24))/(1000*60*60));
      const mins = Math.floor((dist%(1000*60*60))/(1000*60));
      const secs = Math.floor((dist%(1000*60))/1000);

      document.getElementById("days").innerText = days;
      document.getElementById("hours").innerText = hours;
      document.getElementById("minutes").innerText = mins;
      document.getElementById("seconds").innerText = secs;

      if (dist < 0) {
        clearInterval(timer);
        document.querySelector("header").innerHTML = "<h1>We’re Live! 🎉</h1><p>Explore the future with CodeAssylum Labs.</p>";
        document.querySelector(".countdown").style.display = "none";
      }
    },1000);

    // Subscription Form -> Cloudflare Worker API
    document.getElementById("subscribeForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const res = await fetch("/api/subscribe", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email})
      });
      const data = await res.json();
      document.getElementById("statusMsg").innerText = data.ok ? "✅ Thank you for subscribing!" : "❌ Error: " + data.error;
    });
  </script>

</body>
</html>
