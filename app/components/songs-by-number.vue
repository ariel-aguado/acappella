<script lang="ts" setup>
const songStore = useSongStore();
const { songs, songId } = storeToRefs(songStore);

const songlist = shallowRef();
const sidebar = shallowRef();
const indexes = shallowRef();

// --- manejo con Pointer Events (tap + slide) ---
let isActive = false;
let rafPending = false;
let lastXY = null;

onMounted(() => {
  songlist.value = document.getElementById("songlist");
  sidebar.value = document.getElementById("sidebar");
  indexes.value = generateSidebarIndexes(songs.value.length);

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

const songsByNumber = useSorted(songs.value.map(s =>
  ({
    songId: s.songId,
    title: s.title,
    firstLine: s.lyricLines[0].line.startsWith("(") ? s.lyricLines[1].line : s.lyricLines[0].line,
  }),
), (a, b) => a.songId - b.songId);

function navigateToSong(id: number) {
  songId.value = id;
  navigateTo("/");
}

/**
 * Genera índices de referencia para una barra lateral de navegación
 * similar al ejemplo dado (no necesariamente cubre el último elemento).
 * @param {number} total - total de elementos en el listado (ej: 543)
 * @param {number} sections - cantidad de divisiones en la barra (ej: 20)
 * @returns {number[]} - array con los índices de referencia
 */
function generateSidebarIndexes(total: number, sections = 15) {
  const step = Math.floor(total / sections);
  const indexes = [];

  for (let i = 0; i < sections; i++) {
    indexes.push(1 + i * step);
  }

  return indexes;
}

// --- scroll inmediato al ítem ---
function scrollToSong(index: number) {
  const item = songlist.value.querySelector(`[data-index="${index}"]`);
  if (!item)
    return;
  // sin animación / sin delay
  item.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
}

// --- util: obtener índice desde coordenadas ---
function indexFromPoint(x: number, y: number) {
  // 1) si el dedo está sobre un .sidebar-item, úsalo
  const el = document.elementFromPoint(x, y);
  if (el && el.classList && el.classList.contains("sidebar-item")) {
    const v = Number(el.dataset.index);
    return Number.isFinite(v) ? v : null;
  }
  // 2) si está dentro del rectángulo de la barra, calcula la sección por Y
  const rect = sidebar.value.getBoundingClientRect();
  const within
    = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  if (!within)
    return null;

  const relY = y - rect.top;
  const section = Math.max(
    0,
    Math.min(songs.value.length - 1, Math.floor((relY / rect.height) * songs.value.length)),
  );
  return indexes.value[section];
}

function processPoint(x: number, y: number) {
  const idx = indexFromPoint(x, y);
  if (idx != null) {
    scrollToSong(idx);
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
      v-for="song in songsByNumber"
      :key="`song-by-number-${song.songId}`"
      class="song-item [&:not(:first-child)]:border-t [&:not(:first-child)]:border-base-300"
      :data-index="song.songId"
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
      v-for="index in generateSidebarIndexes(songs.length)"
      :key="`sidebar-index-${index}`"
      :data-index="index"
      class="sidebar-item flex-1 flex justify-center items-center w-full"
      @click="scrollToSong(index)"
    >
      <span class="flex text-sm text-white">{{ index }}</span>
    </div>
  </div>
</template>
