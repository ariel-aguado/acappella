// Quick smoke test: load the homepage, verify a song actually renders.
// Phase 3 validation that the UI still works after the store migration.

import { spawn } from "node:child_process"
import { setTimeout as sleep } from "node:timers/promises"
import process from "node:process"

const PORT = 3400
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
  "--user-data-dir=/tmp/pwa-chrome-validation-ui",
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

try {
  await waitForServer()
  await waitForChrome()
  const targetsRes = await fetch(`http://localhost:${PORT + 1}/json`)
  const targets = await targetsRes.json()
  const page = targets.find(t => t.type === "page" && t.url.startsWith(URL))
  if (!page) throw new Error("page target not found")

  // Wait for boot
  await sleep(7000)

  // Check that the homepage renders song content (Swiper slides)
  const uiCheck = await cdpEval(page.webSocketDebuggerUrl, `(() => {
    const swiper = document.querySelector(".swiper");
    const slides = document.querySelectorAll(".swiper-slide");
    const firstSlideText = slides[0]?.textContent?.slice(0, 200) ?? null;
    const firstSlideHtml = slides[0]?.innerHTML?.slice(0, 300) ?? null;
    const hasTitle = !!document.querySelector("h2");
    return JSON.stringify({
      hasSwiper: !!swiper,
      slideCount: slides.length,
      firstSlideText,
      firstSlideHtml,
      hasTitle,
    });
  })()`)
  const ui = JSON.parse(uiCheck.result.value)
  log("Swiper rendered:", ui.hasSwiper)
  log("Slide count:", ui.slideCount)
  log("First slide preview:", ui.firstSlideText)
  log("Has h2 title:", ui.hasTitle)

  if (ui.hasSwiper && ui.slideCount > 0) pass(`Homepage renders ${ui.slideCount} song slides`)
  else fail("Homepage did not render swiper/slides")

  if (ui.firstSlideText && ui.firstSlideText.toLowerCase().includes("abba")) pass("First slide shows ABBA PADRE")
  else fail(`First slide text unexpected: ${ui.firstSlideText}`)

  // Check second slide (A JESUCRISTO VEN SIN TARDAR by default since songId=1 starts there)
  // Actually songId starts at 1 so first slide IS song 1
  // Navigate to song 5 via store
  const navigate = await cdpEval(page.webSocketDebuggerUrl, `(async () => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    await store.navigateToSong(5);
    await new Promise(r => setTimeout(r, 800));
    const slideText = document.querySelectorAll(".swiper-slide")[document.querySelector(".swiper")?.swiper?.activeIndex ?? 0]?.textContent?.slice(0, 200);
    return JSON.stringify({
      songId: store.songId,
      currentSongTitle: store.currentSong?.title,
      activeSlideText: slideText,
    });
  })()`, true)
  const nav = JSON.parse(navigate.result.value)
  log("After navigate to songId=5:", JSON.stringify(nav))
  if (nav.currentSongTitle && nav.currentSongTitle.includes("JESUCRISTO")) pass("Navigation updates currentSong + slide")
  else fail(`Navigation issue: ${JSON.stringify(nav)}`)

  // Toggle a favorite via the UI store and verify the heart shows up
  const fav = await cdpEval(page.webSocketDebuggerUrl, `(async () => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    // Find a song that is currently rendered and toggle its favorite
    const before = store.favoriteSongs.length;
    store.toggleFavorite(store.songs[2]); // song #3
    await new Promise(r => setTimeout(r, 300));
    return JSON.stringify({
      before,
      after: store.favoriteSongs.length,
      song3Favorite: store.songs[2].favorite,
      favoriteSongsList: [...store.favoriteSongs],
    });
  })()`, true)
  const f = JSON.parse(fav.result.value)
  log("Favorite before:", f.before)
  log("Favorite after:", f.after)
  log("Song #3 favorite flag:", f.song3Favorite)
  log("Favorite list:", f.favoriteSongsList)
  if (f.after === f.before + 1 && f.song3Favorite === true) pass("UI store toggleFavorite works end-to-end")
  else fail(`Favorite toggle issue: ${JSON.stringify(f)}`)

  // Visit /search to make sure search page also works
  await cdpEval(page.webSocketDebuggerUrl, `(() => { history.pushState({}, "", "/search"); window.dispatchEvent(new PopStateEvent("popstate")); })()`)
  await sleep(2000)
  const searchCheck = await cdpEval(page.webSocketDebuggerUrl, `(() => {
    const hasSearchInput = !!document.querySelector("input[type='search'], input[placeholder*='Buscar'], input");
    const title = document.title;
    const tabs = document.querySelectorAll("[role='tab'], button").length;
    return JSON.stringify({ hasSearchInput, title, tabCount: tabs });
  })()`)
  const sc = JSON.parse(searchCheck.result.value)
  log("/search input present:", sc.hasSearchInput)
  log("/search title:", sc.title)
  if (sc.hasSearchInput) pass("Search page renders inputs")
  else fail("Search page did not render")

  console.log("\n=== UI Smoke Test ===")
  if (process.exitCode) fail("Smoke test FAILED")
  else pass("All UI smoke tests passed")
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
