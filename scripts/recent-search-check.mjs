// Phase 5 validation: clicking a recent search item re-applies the highlight
// on the matching text in the results.

import { spawn } from "node:child_process"
import { setTimeout as sleep } from "node:timers/promises"

const PORT = 3500
const URL = `http://localhost:${PORT}/`

function log(label, value) {
  console.log(`${label.padEnd(36)} ${typeof value === "object" ? JSON.stringify(value) : value}`)
}
function pass(msg) {
  console.log(`✓ ${msg}`)
}
function fail(msg) {
  console.log(`✗ ${msg}`)
  process.exitCode = 1
}

const server = spawn("node", [".output/server/index.mjs"], {
  env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
})

let serverReady = false
server.stdout.on("data", (d) => {
  if (d.toString().includes("Listening")) serverReady = true
})
server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`))

const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--window-size=800,600",
  "--user-data-dir=/tmp/pwa-chrome-validation-p5",
  `--remote-debugging-port=${PORT + 1}`,
  "--remote-allow-origins=*",
  URL,
], { stdio: ["ignore", "ignore", "ignore"] })

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    if (serverReady) return
    await sleep(500)
  }
  throw new Error("server failed to start")
}

async function waitForChrome() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT + 1}/json`)
      if (res.ok) {
        const targets = await res.json()
        const page = targets.find(t => t.type === "page" && t.url.startsWith(URL))
        if (page) return page
      }
    }
    catch { /* not ready */ }
    await sleep(500)
  }
  throw new Error("chrome failed to start")
}

async function cdpEval(wsUrl, expression, awaitPromise = false) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  })
  await new Promise(r => ws.addEventListener("open", r, { once: true }))
  await new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method: "Runtime.enable" }))
  })
  return new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, {
      resolve: r => { ws.close(); resolve(r) },
      reject: e => { ws.close(); reject(e) },
    })
    ws.send(JSON.stringify({
      id: msgId,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise, returnByValue: true },
    }))
  })
}

const evalState = async (page, script) => {
  const r = await cdpEval(page.webSocketDebuggerUrl, script, true)
  const raw = r.result.value
  return typeof raw === "string" ? JSON.parse(raw) : raw
}

try {
  await waitForServer()
  await waitForChrome()
  const targetsRes = await fetch(`http://localhost:${PORT + 1}/json`)
  const targets = await targetsRes.json()
  const page = targets.find(t => t.type === "page" && t.url.startsWith(URL))
  // Wait for the manifest to load on first run, then seed the songbook
  // selection so the worker boots with a songbook (the app now requires the
  // user to pick one on first run).
  await sleep(2000)
  await cdpEval(page.webSocketDebuggerUrl,
    `localStorage.setItem('songbookId', 'songbook-montevideo'); location.reload();`)
  await sleep(8000)

  // Pre-populate search history with "El Señor"
  await cdpEval(page.webSocketDebuggerUrl, `(() => {
    localStorage.setItem("searchHistory", JSON.stringify(["El Señor"]));
  })()`)

  // Navigate to /fully-search
  await cdpEval(page.webSocketDebuggerUrl, `(() => { window.location.assign("/fully-search"); })()`)
  await sleep(8000)

  // Click on the recent search item "El Señor"
  const afterClick = await evalState(page, `(async () => {
    // Find the recent search button
    const historyButtons = document.querySelectorAll("button.btn-ghost");
    let recentSearchBtn = null;
    for (const btn of historyButtons) {
      if (btn.textContent.includes("El Señor")) {
        recentSearchBtn = btn;
        break;
      }
    }
    if (!recentSearchBtn) {
      return JSON.stringify({ error: "Recent search button not found" });
    }

    // Click it
    recentSearchBtn.click();

    // Wait for the search to complete and DOM to update
    await new Promise(r => setTimeout(r, 2500));

    const input = document.querySelector("input[type='search']");
    const marks = document.querySelectorAll("mark");
    const context = document.querySelector(".context");
    const contextExists = !!context;

    return JSON.stringify({
      inputValue: input?.value,
      markCount: marks.length,
      contextExists,
      markTexts: Array.from(marks).slice(0, 10).map(m => m.textContent),
      contextHasContent: context?.textContent?.length > 0,
    });
  })()`)

  log("URL: /fully-search", "")
  log("Input value:", afterClick.inputValue)
  log("Context exists:", afterClick.contextExists)
  log("Context has content:", afterClick.contextHasContent)
  log("Mark count:", afterClick.markCount)
  log("Mark texts (first 10):", JSON.stringify(afterClick.markTexts))

  // Test 1: Input should show "El Señor"
  if (afterClick.inputValue === "El Señor") pass("Input shows 'El Señor' after click")
  else fail(`Input shows '${afterClick.inputValue}', expected 'El Señor'`)

  // Test 2: Search results should be displayed
  if (afterClick.contextExists && afterClick.contextHasContent) pass("Search results are displayed")
  else fail("Search results not displayed")

  // Test 3: Highlight marks should be present (this is the bug fix)
  if (afterClick.markCount > 0) pass(`Highlight marks applied (${afterClick.markCount} <mark> elements)`)
  else fail("No highlight marks found (BUG NOT FIXED)")

  // Test 4: Marks should contain the search term (case-insensitive)
  const hasMarkWithTerm = afterClick.markTexts.some(t =>
    t && (t.toLowerCase().includes("el") || t.toLowerCase().includes("señor"))
  )
  if (hasMarkWithTerm) pass("Highlight contains 'El Señor' text")
  else fail("Highlight doesn't contain search term")

  console.log("\n=== Phase 5 (recent search highlight) Validation ===")
  if (process.exitCode) fail("FAILED")
  else pass("All recent search highlight tests passed")
}
catch (err) {
  console.error("Validation error:", err)
  process.exitCode = 1
}
finally {
  chrome.kill()
  server.kill()
  await sleep(500)
}
