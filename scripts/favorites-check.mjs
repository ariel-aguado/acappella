// Phase 4 favorites validation: verifies the favorites bug fix end-to-end.
// Tests:
//   1. Toggle favorite persists to localStorage and store
//   2. Search results show the correct `favorite` flag (the bug we fixed)
//   3. Untoggle updates the in-memory song.favorite immediately
//   4. Favorites persist across page reload
//   5. Untoggled songs stay unfavorited after reload

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
  "--user-data-dir=/tmp/pwa-chrome-validation-p4-fav",
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

async function evalState(page, script) {
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
  await sleep(8000)

  console.log("=== Test 1: Toggle favorite ===")
  await cdpEval(page.webSocketDebuggerUrl, `(() => { localStorage.clear(); })()`)
  await cdpEval(page.webSocketDebuggerUrl, `(() => { window.location.assign("/"); })()`)
  await sleep(8000)

  const t1 = await evalState(page, `(async () => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    store.toggleFavorite(store.songs[6]);
    store.toggleFavorite(store.songs[41]);
    store.toggleFavorite(store.songs[99]);
    await new Promise(r => setTimeout(r, 500));
    return JSON.stringify({
      storeFavorites: [...store.favoriteSongs],
      song7Favorite: store.songs.find(s => s.songId === 7)?.favorite,
      lsFavoriteSongs: localStorage.getItem("favoriteSongs"),
    });
  })()`)
  log("storeFavorites:", t1.storeFavorites)
  log("song 7 fav (in store):", t1.song7Favorite)
  log("localStorage:", t1.lsFavoriteSongs)
  if (t1.storeFavorites?.length === 3) pass("3 favorites persisted to store")
  else fail("Expected 3 favorites")
  if (t1.song7Favorite === true) pass("song 7 has favorite: true in store.songs")
  else fail("song 7 should be favorited in store")
  if (t1.lsFavoriteSongs === "[7,42,100]") pass("localStorage('favoriteSongs') = [7,42,100]")
  else fail(`localStorage wrong: ${t1.lsFavoriteSongs}`)

  console.log("\n=== Test 2: Search results show correct favorite flag (the bug) ===")
  await cdpEval(page.webSocketDebuggerUrl, `(() => { window.location.assign("/search"); })()`)
  await sleep(8000)

  const t2 = await evalState(page, `(() => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    return JSON.stringify({
      song7Favorite: store.filteredSongsByNumber.find(s => s.songId === 7)?.favorite,
      song42Favorite: store.filteredSongsByNumber.find(s => s.songId === 42)?.favorite,
      song100Favorite: store.filteredSongsByNumber.find(s => s.songId === 100)?.favorite,
      song1Favorite: store.filteredSongsByNumber.find(s => s.songId === 1)?.favorite,
    });
  })()`)
  log("song 7 fav (in search):", t2.song7Favorite)
  log("song 42 fav (in search):", t2.song42Favorite)
  log("song 100 fav (in search):", t2.song100Favorite)
  log("song 1 fav (in search, NOT favorited):", t2.song1Favorite)
  if (t2.song7Favorite === true) pass("song 7 shows favorite: true in search results")
  else fail("song 7 should be favorited in search results")
  if (t2.song42Favorite === true) pass("song 42 shows favorite: true in search results")
  else fail("song 42 should be favorited in search results")
  if (t2.song100Favorite === true) pass("song 100 shows favorite: true in search results")
  else fail("song 100 should be favorited in search results")
  if (t2.song1Favorite === false) pass("song 1 (NOT fav) shows favorite: false in search results")
  else fail("song 1 should NOT be favorited")

  console.log("\n=== Test 3: Untoggle updates search results ===")
  const t3 = await evalState(page, `(async () => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    store.toggleFavorite(store.songs.find(s => s.songId === 42));
    await new Promise(r => setTimeout(r, 500));
    return JSON.stringify({
      storeFavorites: [...store.favoriteSongs].sort((a, b) => a - b),
      song42Favorite: store.filteredSongsByNumber.find(s => s.songId === 42)?.favorite,
      song7Favorite: store.filteredSongsByNumber.find(s => s.songId === 7)?.favorite,
    });
  })()`)
  log("storeFavorites after untoggle:", t3.storeFavorites)
  log("song 42 fav (should be false):", t3.song42Favorite)
  log("song 7 fav (still true):", t3.song7Favorite)
  if (JSON.stringify(t3.storeFavorites) === "[7,100]") pass("Untoggle removed song 42")
  else fail(`Expected [7,100], got ${JSON.stringify(t3.storeFavorites)}`)
  if (t3.song42Favorite === false) pass("Song 42 visual state updated to false")
  else fail("Song 42 should be false after untoggle")
  if (t3.song7Favorite === true) pass("Song 7 still shows favorited")
  else fail("Song 7 should still be favorited")

  console.log("\n=== Test 4: Favorites persist across reload ===")
  await cdpEval(page.webSocketDebuggerUrl, `(() => { window.location.assign("/search"); })()`)
  await sleep(8000)

  const t4 = await evalState(page, `(() => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    return JSON.stringify({
      storeFavorites: [...store.favoriteSongs].sort((a, b) => a - b),
      song7Favorite: store.filteredSongsByNumber.find(s => s.songId === 7)?.favorite,
      song42Favorite: store.filteredSongsByNumber.find(s => s.songId === 42)?.favorite,
      song100Favorite: store.filteredSongsByNumber.find(s => s.songId === 100)?.favorite,
      lsFavoriteSongs: localStorage.getItem("favoriteSongs"),
    });
  })()`)
  log("storeFavorites after reload:", t4.storeFavorites)
  log("song 7 fav:", t4.song7Favorite)
  log("song 42 fav:", t4.song42Favorite)
  log("song 100 fav:", t4.song100Favorite)
  log("localStorage:", t4.lsFavoriteSongs)
  if (JSON.stringify(t4.storeFavorites) === "[7,100]") pass("Favorites persisted [7, 100]")
  else fail(`Expected [7,100], got ${JSON.stringify(t4.storeFavorites)}`)
  if (t4.song7Favorite === true && t4.song100Favorite === true) pass("Search results show favorited songs after reload")
  else fail("Search results should show favorited songs after reload")
  if (t4.song42Favorite === false) pass("Untoggled song 42 stays unfavorited")
  else fail("Untoggled song 42 should NOT be favorited")

  console.log("\n=== Phase 4 (favorites fix) Validation ===")
  if (process.exitCode) fail("FAILED")
  else pass("All favorites tests passed")
}
catch (err) {
  console.error("ERROR:", err)
  process.exitCode = 1
}
finally {
  chrome.kill()
  server.kill()
  await sleep(500)
}
