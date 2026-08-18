// Phase 2 validation: verifies that the songbook Web Worker initializes,
// parses the corpus, and exposes the parsed songs via Comlink.
//
// Prereqs: pnpm build (must have run), Google Chrome at /usr/bin/google-chrome
// Run: pnpm pwa:check:phase2

import { spawn } from "node:child_process"
import { setTimeout as sleep } from "node:timers/promises"
import process from "node:process"

const PORT = 3200
const URL = `http://localhost:${PORT}/`

function log(label, value) {
  console.log(`${label.padEnd(32)} ${typeof value === "object" ? JSON.stringify(value) : value}`)
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
  "--user-data-dir=/tmp/pwa-chrome-validation-p2",
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
    ws.send(JSON.stringify({ id: msgId, method: "Runtime.enable" }))
  })
  return new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve: r => { ws.close(); resolve(r) }, reject: e => { ws.close(); reject(e) } })
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
  await sleep(5000)

  // 1. Check that the worker script is requested as a separate JS file
  const workerBundleUrl = (await cdpEval(page.webSocketDebuggerUrl, `(() => {
    const scripts = Array.from(document.querySelectorAll("script[src]")).map(s => s.src);
    return JSON.stringify({scripts, workers: typeof Worker !== "undefined"});
  })()`)).result.value
  const workerBundleInfo = JSON.parse(workerBundleUrl)
  log("Worker global:", workerBundleInfo.workers)
  log("Script count:", workerBundleInfo.scripts.length)
  if (workerBundleInfo.workers) pass("Worker API available")
  else fail("Worker API missing")

  // 2. Check that the boot loader is gone (worker ready)
  const bootLoaderGone = (await cdpEval(page.webSocketDebuggerUrl,
    "!document.querySelector('.boot-loader')")).result.value
  log("Boot loader hidden:", bootLoaderGone)
  if (bootLoaderGone) pass("Boot loader dismissed (worker ready)")
  else fail("Boot loader still visible — worker did not finish")

  // 3. Verify the page rendered (not just splash)
  const pageRendered = (await cdpEval(page.webSocketDebuggerUrl, `(() => {
    return JSON.stringify({
      title: document.title,
      bodyChars: document.body.innerText.length,
      hasNuxtRoot: !!document.querySelector("#__nuxt .contents"),
    });
  })()`)).result.value
  const pageInfo = JSON.parse(pageRendered)
  log("Document title:", pageInfo.title)
  log("Body chars:", pageInfo.bodyChars)
  log("Nuxt root mounted:", pageInfo.hasNuxtRoot)
  if (pageInfo.bodyChars > 50) pass("App UI rendered")
  else fail("App UI not rendered")

  // 4. Verify useState-backed songbook count via Nuxt payload
  const songbookState = (await cdpEval(page.webSocketDebuggerUrl, `(() => {
    const root = document.querySelector("#__nuxt");
    if (!root) return JSON.stringify({error: "no nuxt root"});
    const dataEl = document.getElementById("__NUXT_DATA__");
    return JSON.stringify({hasNuxtData: !!dataEl, dataLen: dataEl?.textContent?.length ?? 0});
  })()`)).result.value
  const state = JSON.parse(songbookState)
  log("Nuxt data state:", state)
  if (state.hasNuxtData) pass("Nuxt state accessible")
  else fail("Nuxt state not accessible")

  // 5. Inject a probe that exercises the worker via the Nuxt app instance
  const workerProbe = (await cdpEval(page.webSocketDebuggerUrl, `(async () => {
    const root = document.querySelector("#__nuxt");
    if (!root) return JSON.stringify({error: "no root"});
    const app = root.__vue_app__;
    if (!app) return JSON.stringify({error: "no vue app"});
    const nuxtApp = app.config.globalProperties.$nuxt;
    if (!nuxtApp) return JSON.stringify({error: "no nuxt app"});
    const payload = nuxtApp.payload;
    const state = payload.state;
    if (!state) return JSON.stringify({error: "no state"});
    const songbookKeys = Object.keys(state).filter(k => k.startsWith("$ssongbook"));
    const statusKey = songbookKeys.find(k => k.endsWith("-status"));
    const songsKey = songbookKeys.find(k => k.endsWith("-songs"));
    const songsArr = songsKey ? state[songsKey] : null;
    const first = Array.isArray(songsArr) && songsArr.length > 0 ? songsArr[0] : null;
    return JSON.stringify({
      songbookKeys,
      status: statusKey ? state[statusKey] : null,
      songsCount: Array.isArray(songsArr) ? songsArr.length : "non-array",
      firstSong: first ? {
        songId: first.songId,
        title: first.title,
        hasLyricParsed: !!first.lyricParsed,
        lyricParsedHasBody: !!first.lyricParsed?.body,
        lyricLinesIsArray: Array.isArray(first.lyricLines),
        lyricLinesCount: first.lyricLines?.length ?? 0,
      } : null,
    });
  })()`, true)).result.value
  const probe = JSON.parse(workerProbe)
  log("Songbook state keys:", probe.songbookKeys.join(", "))
  log("Worker status:", probe.status)
  log("Song count:", probe.songsCount)
  if (probe.songsCount === 380) pass(`Worker parsed 380 songs`)
  else fail(`Worker parse failed (count=${probe.songsCount})`)

  if (probe.firstSong) {
    log("First song title:", probe.firstSong.title)
    log("First song id:", probe.firstSong.songId)
    log("lyricParsed.body present:", probe.firstSong.lyricParsedHasBody)
    log("lyricLines count:", probe.firstSong.lyricLinesCount)
    if (probe.firstSong.lyricParsedHasBody && probe.firstSong.lyricLinesCount > 0) {
      pass("Songs have lyricParsed (HTML) + lyricLines (token array)")
    }
    else {
      fail("Songs missing lyricParsed or lyricLines")
    }
  }
  else {
    fail("No first song in parsed corpus")
  }

  // 6. Confirm worker bundle is requested
  const fetchedWorker = (await cdpEval(page.webSocketDebuggerUrl, `(() => {
    const perf = performance.getEntriesByType("resource").map(r => r.name);
    return JSON.stringify(perf.filter(u => u.includes("songbook.worker")));
  })()`)).result.value
  const workerEntries = JSON.parse(fetchedWorker)
  log("Worker bundles loaded:", workerEntries.length)
  if (workerEntries.length > 0) pass("Worker bundle code-split and loaded")
  else fail("Worker bundle not loaded")

  console.log("\n=== Phase 2 Worker Validation ===")
  if (process.exitCode) fail("Validation FAILED")
  else pass("All Phase 2 criteria met")
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
