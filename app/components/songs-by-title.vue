<script lang="ts" setup>
import type { Song } from "~~/lib/db/schema/song";

const songStore = useSongStore();
const { songs, songId } = storeToRefs(songStore);

const songlist = shallowRef();
const sidebar = shallowRef();
const initials = shallowRef();

// --- manejo con Pointer Events (tap + slide) ---
let isActive = false;
let rafPending = false;
let lastXY = null;

onMounted(() => {
  songlist.value = document.getElementById("songlist");
  sidebar.value = document.getElementById("sidebar");
  initials.value = generateSidebarInitials(songs.value);

  if ("PointerEvent" in window) {
    sidebar.value.addEventListener("pointerdown", onPointerDown, { passive: false });
    sidebar.value.addEventListener("pointermove", onPointerMove, { passive: false });
    sidebar.value.addEventListener("pointerup", onPointerUp, { passive: false });
    sidebar.value.addEventListener("pointercancel", onPointerUp, { passive: false });
  }
  else {
    // --- fallback touch (por si hiciera falta) ---
    const handleTouch = (e) => {
      const t = e.touches[0] || e.changedTouches[0];
      if (!t)
        return;
      e.preventDefault();
      processPoint(t.clientX, t.clientY);
    };
    sidebar.value.addEventListener("touchmove", handleTouch, { passive: false });
  }
});

const songsByTitle = computed(() =>
  songs.value.map(s =>
    ({
      songId: s.songId,
      title: s.title,
      firstLine: s.lyricLines[0].line.startsWith("(") ? s.lyricLines[1].line : s.lyricLines[0].line,
    })).sort((a, b) => {
    const cleanA = cleanTitle(a.title);
    const cleanB = cleanTitle(b.title);
    return cleanA.localeCompare(cleanB);
  }),
);

// Function to clean titles for sorting
function cleanTitle(title: string) {
  // Remove leading non-alphanumeric characters (including whitespace)
  return title.replace(/^[^a-z0-9]+/i, "").toLowerCase();
}

function navigateToSong(id: number) {
  songId.value = id;
  navigateTo("/");
}

/**
 * Genera un listado de iniciales únicas desde un array de títulos
 * @param {string[]} songs - lista de títulos de canciones
 * @returns {string[]} - iniciales únicas en orden alfabético
 */
function generateSidebarInitials(songs: Song[]) {
  const initials = new Set();

  songs.map(s => s.title).forEach((title) => {
    if (!title)
      return;
    const firstChar = title.trim().charAt(0).toUpperCase();
    if (firstChar >= "A" && firstChar <= "Z") {
      initials.add(firstChar);
    }
  });

  return Array.from(initials).sort() as string[];
}

// --- scroll inmediato al ítem ---
function scrollToSong(initial: string) {
  const item = songlist.value.querySelector(`[data-initial="${initial}"]`);
  if (!item)
    return;
  // sin animación / sin delay
  item.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
}

// --- util: obtener iniciales desde coordenadas ---
function initialFromPoint(x, y) {
  // 1) si el dedo está sobre un .sidebar-item, devolver la letra
  const el = document.elementFromPoint(x, y);
  if (el && el.classList && el.classList.contains("sidebar-item")) {
    const initial = el.dataset.initial;
    return initial || null;
  }

  // 2) si el dedo está dentro del rectángulo de la barra, calcular la sección
  const rect = sidebar.value.getBoundingClientRect();
  const within
    = x >= rect.left && x <= rect.right
      && y >= rect.top && y <= rect.bottom;

  if (!within)
    return null;

  const relY = y - rect.top;
  const section = Math.max(
    0,
    Math.min(songs.value.length - 1, Math.floor((relY / rect.height) * songs.value.length)),
  );

  return initials.value[section] || null;
}

function processPoint(x: number, y: number) {
  const initial = initialFromPoint(x, y);
  if (initial != null) {
    scrollToSong(initial);
  }
}

function onPointerDown(e) {
  isActive = true;
  sidebar.value.setPointerCapture?.(e.pointerId);
  e.preventDefault(); // evita que el navegador se "robe" el gesto
  processPoint(e.clientX, e.clientY); // TAP inmediato
}

function onPointerMove(e) {
  if (!isActive)
    return;
  lastXY = { x: e.clientX, y: e.clientY };
  if (rafPending)
    return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    if (lastXY) {
      processPoint(lastXY.x, lastXY.y);
    }
  });
}

function onPointerUp(e) {
  isActive = false;
  sidebar.value.releasePointerCapture?.(e.pointerId);
}
</script>

<template>
  <div id="songlist" class="flex-1">
    <div
      v-for="song in songsByTitle"
      :key="`song-by-title-${song.songId}`"
      class="song-item [&:not(:first-child)]:border-t [&:not(:first-child)]:border-base-300"
      :data-initial="song.title.charAt(0)"
    >
      <button
        type="button"
        class="w-full h-auto btn btn-ghost flex justify-start items-center gap-2 py-2 px-4"
        @click="navigateToSong(song.songId)"
      >
        <div class="flex justify-center items-center bg-secondary text-lg text-white aspect-square w-12 h-12 p-2 rounded-full">
          {{ song.songId }}
        </div>
        <div class="flex flex-col items-start">
          <span class="text-start">{{ song.title }}</span>
          <p class="text-start line-clamp-1">
            {{ song.firstLine }}
          </p>
        </div>
      </button>
    </div>
  </div>
  <!-- Sidebar of song ids -->
  <div id="sidebar" class="sticky top-0 z-50 flex flex-col items-center bg-secondary w-7 h-full rounded-t-full rounded-b-full py-4">
    <div
      v-for="initial in generateSidebarInitials(songs)"
      :key="`sidebar-initial-${initial}`"
      :data-initial="initial"
      class="sidebar-item flex-1 flex justify-center items-center w-full"
      @click="scrollToSong(initial)"
    >
      <span class="flex text-sm text-white">{{ initial }}</span>
    </div>
  </div>
</template>
