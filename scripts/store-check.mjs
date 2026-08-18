// Phase 3 validation: store consumes the Web Worker as source of truth.
// Verifies that the parsed corpus lives in worker memory (NOT in localStorage),
// favorites round-trip correctly, and reload re-applies favorites from localStorage.

import { spawn } from "node:child_process"
import { setTimeout as sleep } from "node:timers/promises"
import process from "node:process"

const PORT = 3300
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
  "--user-data-dir=/tmp/pwa-chrome-validation-p3",
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

  // Wait for the manifest to load on first run, then seed the songbook
  // selection so the worker boots with a songbook (the app now requires the
  // user to pick one on first run).
  await sleep(2000)
  await cdpEval(page.webSocketDebuggerUrl,
    `localStorage.setItem('songbookId', 'songbook-montevideo'); location.reload();`)
  await sleep(6000)

  // Helper to evaluate Nuxt state + localStorage
  const evalState = async (script) => {
    const result = (await cdpEval(page.webSocketDebuggerUrl, script, true)).result.value
    return JSON.parse(result)
  }

  // 1. Store has 380 songs
  const initial = await evalState(`(() => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const nuxtApp = app.config.globalProperties.$nuxt;
    const payload = nuxtApp.payload;
    const state = payload.state || {};
    const songsKey = Object.keys(state).find(k => k.startsWith("$ssongbook") && k.endsWith("-songs"));
    const songsArr = songsKey ? state[songsKey] : null;
    return JSON.stringify({
      songsCount: Array.isArray(songsArr) ? songsArr.length : 0,
      firstSong: songsArr?.[0] ? { id: songsArr[0].songId, title: songsArr[0].title, favorite: songsArr[0].favorite } : null,
      sample: songsArr?.[10] ? { id: songsArr[10].songId, title: songsArr[10].title, favorite: songsArr[10].favorite } : null,
      last: songsArr?.[379] ? { id: songsArr[379].songId, title: songsArr[379].title, favorite: songsArr[379].favorite } : null,
    });
  })()`)
  log("Initial song count:", initial.songsCount)
  log("First song:", `${initial.firstSong.id} - ${initial.firstSong.title}`)
  log("Sample song #11 favorite:", initial.sample.favorite)
  log("Last song #380:", initial.last.title)

  if (initial.songsCount === 380) pass("Store hydrated with 380 songs from worker")
  else fail(`Store song count = ${initial.songsCount}`)

  // 2. localStorage should NOT have a giant 'songs' key
  const lsBefore = await evalState(`(() => {
    const keys = Object.keys(localStorage);
    const sizes = {};
    for (const k of keys) {
      sizes[k] = localStorage.getItem(k).length;
    }
    return JSON.stringify({ keys, sizes });
  })()`)
  log("localStorage keys:", lsBefore.keys.join(", "))
  log("localStorage sizes:", JSON.stringify(lsBefore.sizes))
  if (lsBefore.keys.includes("songs")) fail("localStorage still has 'songs' key (should be removed)")
  else pass("localStorage no longer stores the corpus")

  const totalLs = Object.values(lsBefore.sizes).reduce((a, b) => a + b, 0)
  log("Total localStorage size:", `${totalLs} bytes`)
  if (totalLs < 20000) pass(`localStorage footprint small (${totalLs} bytes)`)
  else fail(`localStorage too large: ${totalLs} bytes`)

  // 3. Set a favorite via store.toggleFavorite and verify it persists
  const toggleResult = await evalState(`(async () => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    const before = {
      song7Favorite: store.songs.find(s => s.songId === 7)?.favorite,
      favoriteSongsLen: store.favoriteSongs.length,
      favoriteSongsArr: [...store.favoriteSongs],
    };
    // Toggle song 7
    store.toggleFavorite(store.songs[6]);
    await new Promise(r => setTimeout(r, 200));
    const after = {
      song7Favorite: store.songs.find(s => s.songId === 7)?.favorite,
      favoriteSongsLen: store.favoriteSongs.length,
      favoriteSongsArr: [...store.favoriteSongs],
      lsFavoriteSongs: localStorage.getItem("favoriteSongs"),
    };
    // Toggle another: song 42
    store.toggleFavorite(store.songs[41]);
    await new Promise(r => setTimeout(r, 200));
    const after2 = {
      song42Favorite: store.songs.find(s => s.songId === 42)?.favorite,
      favoriteSongsLen: store.favoriteSongs.length,
      favoriteSongsArr: [...store.favoriteSongs],
      lsFavoriteSongs: localStorage.getItem("favoriteSongs"),
    };
    return JSON.stringify({ before, after, after2 });
  })()`)
  log("Before toggle:", JSON.stringify(toggleResult.before))
  log("After toggle song 7:", JSON.stringify(toggleResult.after))
  log("After toggle song 42:", JSON.stringify(toggleResult.after2))

  if (toggleResult.before.song7Favorite === false && toggleResult.after.song7Favorite === true) {
    pass("toggleFavorite updates in-memory song.favorite")
  }
  else {
    fail(`toggleFavorite did not update song.favorite correctly: ${JSON.stringify(toggleResult)}`)
  }

  if (toggleResult.after.favoriteSongsArr.includes(7) && toggleResult.after2.favoriteSongsArr.includes(42)) {
    pass("favoriteSongs array updated")
  }
  else {
    fail(`favoriteSongs array not updated: ${JSON.stringify(toggleResult.after2)}`)
  }

  if (toggleResult.after2.lsFavoriteSongs && toggleResult.after2.lsFavoriteSongs.includes("7") && toggleResult.after2.lsFavoriteSongs.includes("42")) {
    pass("localStorage('favoriteSongs') persists")
  }
  else {
    fail(`localStorage('favoriteSongs') missing entries: ${toggleResult.after2.lsFavoriteSongs}`)
  }

  // 4. Verify localStorage('songs') is still NOT being written
  const lsAfter = await evalState(`(() => {
    return JSON.stringify({
      keys: Object.keys(localStorage),
      songsKey: localStorage.getItem("songs"),
      songsKeyLength: localStorage.getItem("songs")?.length ?? 0,
    });
  })()`)
  log("localStorage after toggles:", JSON.stringify(lsAfter))
  if (lsAfter.songsKey === null) pass("localStorage('songs') still NOT written")
  else fail(`localStorage('songs') exists with ${lsAfter.songsKeyLength} bytes`)

  // 5. Verify songs are NOT redundantly stored in localStorage even though the store has them
  const storeTotalSize = await evalState(`(() => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    return JSON.stringify({
      storeSongsLen: store.songs.length,
      storeSongsSample: JSON.stringify(store.songs[0]).length,
      localStorageSongs: localStorage.getItem("songs"),
    });
  })()`)
  log("Store songs length:", storeTotalSize.storeSongsLen)
  log("Sample song JSON size:", `${storeTotalSize.storeSongsSample} bytes`)
  log("localStorage('songs'):", storeTotalSize.localStorageSongs === null ? "null ✓" : "EXISTS ✗")
  if (storeTotalSize.storeSongsLen === 380 && storeTotalSize.localStorageSongs === null) {
    pass("Songs live in store memory only (NOT localStorage)")
  }
  else {
    fail(`Songs storage mismatch`)
  }

  // 6. Reload page, verify favorites are re-applied from localStorage
  console.log("\n=== Reloading page to verify favorite persistence ===")
  // Use CDP to reload (we don't have Puppeteer here)
  const cdp = await fetch(`http://localhost:${PORT + 1}/json`)
    .then(r => r.json())
    .then(targets => {
      const t = targets.find(x => x.type === "page" && x.url.startsWith(URL))
      return t.webSocketDebuggerUrl
    })
  // Already have cdpEval which uses the same page target; reuse its WS
  const reloadEval = await cdpEval(cdp, "location.reload()")
  await sleep(8000)

  const afterReload = await evalState(`(() => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    return JSON.stringify({
      storeSongsLen: store.songs.length,
      song7Favorite: store.songs.find(s => s.songId === 7)?.favorite,
      song42Favorite: store.songs.find(s => s.songId === 42)?.favorite,
      favoriteSongsArr: [...store.favoriteSongs],
      lsFavoriteSongs: localStorage.getItem("favoriteSongs"),
    });
  })()`)
  log("After reload song count:", afterReload.storeSongsLen)
  log("Song 7 favorite:", afterReload.song7Favorite)
  log("Song 42 favorite:", afterReload.song42Favorite)
  log("favoriteSongs in memory:", afterReload.favoriteSongsArr)
  log("favoriteSongs in localStorage:", afterReload.lsFavoriteSongs)

  if (afterReload.storeSongsLen === 380) pass("Songs re-hydrated from worker after reload")
  else fail(`After reload: ${afterReload.storeSongsLen} songs`)

  if (afterReload.song7Favorite === true && afterReload.song42Favorite === true) {
    pass("Favorites re-applied from localStorage after reload")
  }
  else {
    fail(`Favorites not re-applied after reload: ${JSON.stringify(afterReload)}`)
  }

  // 7. currentSong computed works
  const currentSongCheck = await evalState(`(() => {
    const root = document.querySelector("#__nuxt");
    const app = root.__vue_app__;
    const pinia = app.config.globalProperties.$pinia;
    const store = pinia._s.get("useSongStore");
    // Try songId 5
    store.songId = 5;
    return JSON.stringify({
      songId: store.songId,
      currentSongTitle: store.currentSong?.title ?? null,
      currentSongId: store.currentSong?.songId ?? null,
    });
  })()`)
  log("currentSong computed (songId=5):", JSON.stringify(currentSongCheck))
  if (currentSongCheck.currentSongId === 5 && currentSongCheck.currentSongTitle) {
    pass("currentSong computed resolves from songs array")
  }
  else {
    fail(`currentSong not resolving correctly`)
  }

  console.log("\n=== Phase 3 Store Migration Validation ===")
  if (process.exitCode) fail("Validation FAILED")
  else pass("All Phase 3 criteria met")
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
