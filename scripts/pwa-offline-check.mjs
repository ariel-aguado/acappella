// Offline PWA validation script
// Starts the prod server, opens headless Chrome, validates SW + offline songbook fetch.
//
// Prereqs: pnpm build (must have run), Google Chrome at /usr/bin/google-chrome
// Run: pnpm pwa:check

import { spawn } from "node:child_process"
import { setTimeout as sleep } from "node:timers/promises"
import process from "node:process"

const PORT = 3100
const URL = `http://localhost:${PORT}/`

function log(label, value) {
  console.log(`${label.padEnd(28)} ${typeof value === "object" ? JSON.stringify(value) : value}`)
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
  const s = d.toString()
  if (s.includes("Listening")) serverReady = true
})
server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`))

const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--user-data-dir=/tmp/pwa-chrome-validation",
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
    catch { /* not ready yet */ }
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
    ws.send(JSON.stringify({
      id: msgId,
      method: "Runtime.enable",
    }))
  })
  return new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve: (r) => { ws.close(); resolve(r) }, reject: (e) => { ws.close(); reject(e) } })
    ws.send(JSON.stringify({
      id: msgId,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise, returnByValue: true },
    }))
  })
}

try {
  await waitForServer()
  await waitForChrome()
  const targetsRes = await fetch(`http://localhost:${PORT + 1}/json`)
  const targets = await targetsRes.json()
  const page = targets.find(t => t.type === "page" && t.url.startsWith(URL))
  if (!page) throw new Error("page target not found")

  // Wait for the manifest to load on first run, then seed the songbook
  // selection so the worker boots with a songbook (the app now requires the
  // user to pick one on first run).
  await sleep(2000)
  await cdpEval(page.webSocketDebuggerUrl,
    `localStorage.setItem('songbookId', 'songbook-montevideo'); location.reload();`)
  await sleep(3000)

  const swInfo = (await cdpEval(page.webSocketDebuggerUrl,
    "navigator.serviceWorker.ready.then(r => JSON.stringify({scope: r.scope, active: r.active && r.active.scriptURL, state: r.active && r.active.state}))",
    true)).result.value
  const sw = JSON.parse(swInfo)
  log("SW scope:", sw.scope)
  log("SW script:", sw.active)
  log("SW state:", sw.state)
  if (sw.active && sw.state === "activated") pass("Service Worker activated")
  else fail("Service Worker not activated")

  const precacheRes = (await cdpEval(page.webSocketDebuggerUrl, `(async () => {
    const names = await caches.keys();
    let total = 0;
    for (const n of names) {
      const c = await caches.open(n);
      total += (await c.keys()).length;
    }
    return JSON.stringify({names, total});
  })()`, true)).result.value
  const precache = JSON.parse(precacheRes)
  log("Cache names:", precache.names.join(", "))
  log("Precache entries:", precache.total)
  if (precache.total >= 50) pass(`Precache populated (${precache.total} entries)`)
  else fail(`Precache has only ${precache.total} entries (expected >= 50)`)

  // Trigger songbook fetch
  const fetchRes = (await cdpEval(page.webSocketDebuggerUrl, `(async () => {
    const r = await fetch('/songs/songbook-montevideo.txt');
    const ab = await r.arrayBuffer();
    return JSON.stringify({status: r.status, bytes: ab.byteLength});
  })()`, true)).result.value
  const f1 = JSON.parse(fetchRes)
  log("Songbook fetch (online):", `${f1.status} ${f1.bytes} bytes`)
  if (f1.status === 200 && f1.bytes > 100000) pass("Songbook fetched online")
  else fail(`Songbook fetch: ${JSON.stringify(f1)}`)

  // Wait for SWR revalidate
  await sleep(5000)

  const songbookCache = (await cdpEval(page.webSocketDebuggerUrl, `(async () => {
    const c = await caches.open('songbook-cache-v1');
    const r = await c.match('/songs/songbook-montevideo.txt');
    if (!r) return JSON.stringify({cached: false});
    const ab = await r.arrayBuffer();
    return JSON.stringify({cached: true, status: r.status, bytes: ab.byteLength});
  })()`, true)).result.value
  const sb = JSON.parse(songbookCache)
  log("Songbook cache:", sb.cached ? `${sb.bytes} bytes (status ${sb.status})` : "NOT CACHED")
  if (sb.cached && sb.bytes === f1.bytes) pass("Songbook runtime cache populated")
  else fail(`Songbook runtime cache not populated correctly`)

  // Check manifest link in DOM
  const manifestLink = (await cdpEval(page.webSocketDebuggerUrl,
    "document.querySelector('link[rel=\"manifest\"]')?.href || null")).result.value
  log("Manifest link in DOM:", manifestLink)
  if (manifestLink && manifestLink.includes(".webmanifest")) pass("Manifest link injected")
  else fail("Manifest link not injected")

  console.log("\n=== Phase 1 Offline PWA Validation ===")
  if (process.exitCode) fail("Validation FAILED")
  else pass("All Phase 1 criteria met")
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
