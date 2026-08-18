<script setup lang="ts">
import type { Songbook } from "~~/lib/types";

type Mode = "badge" | "overlay";

const props = withDefaults(defineProps<{
  /** "badge" renders the compact button + dropdown used in the header.
   *  "overlay" renders a full-screen modal used on first run before the user
   *  has picked a songbook. */
  mode?: Mode;
}>(), {
  mode: "badge",
});

const songbookStore = useSongbookStore();
const { status } = useSongbookWorker();
const { manifest, currentSongbook, currentId } = storeToRefs(songbookStore);
const { selectSongbook } = songbookStore;
const songStore = useSongStore();

const isOpen = ref(false);
const detailsRef = ref<HTMLDetailsElement | null>(null);

// Close the dropdown when the user clicks (or taps) outside the menu.
// The <details> element only toggles on its own summary click, so this
// listener fills the gap for clicks anywhere else on the page.
onClickOutside(detailsRef, () => {
  if (detailsRef.value?.open) {
    detailsRef.value.open = false;
    isOpen.value = false;
  }
});

async function onSelect(sb: Songbook) {
  // Close the dropdown immediately for snappy feedback; the worker keeps
  // loading in the background and the watch in songs.ts will update the UI.
  isOpen.value = false;
  if (detailsRef.value)
    detailsRef.value.open = false;
  if (sb.id === currentId.value)
    return;

  // Always reset to the first song. The new songbook may have a different
  // total count, so the previous songId could be out of range — including
  // when the user navigates back to the main page from a search page where
  // we wouldn't touch songId otherwise.
  songStore.songId = 1;

  await selectSongbook(sb.id);
}

function truncate(name: string, max = 12) {
  if (!name)
    return "";
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function onDetailsToggle() {
  isOpen.value = detailsRef.value?.open ?? false;
}

// Close dropdown when the worker finishes loading (after a switch).
watch(status, (s) => {
  if (s === "ready") {
    isOpen.value = false;
    if (detailsRef.value)
      detailsRef.value.open = false;
  }
});
</script>

<template>
  <!-- Badge mode: compact button + dropdown for the navbar. -->
  <details
    v-if="props.mode === 'badge'"
    ref="detailsRef"
    class="dropdown dropdown-end"
    @toggle="onDetailsToggle"
  >
    <summary
      class="btn btn-sm rounded-full px-3 gap-1 bg-primary-content text-primary border-0 hover:bg-primary/25"
      :class="{ 'menu-active': isOpen, 'opacity-70': status === 'loading' }"
      :aria-label="`Cambiar himnario. Actual: ${currentSongbook?.name ?? 'ninguno'}`"
    >
      <span class="font-semibold text-sm truncate max-w-20">
        {{ currentSongbook ? truncate(currentSongbook.name) : "…" }}
      </span>
      <Icon
        :name="isOpen ? 'tabler:chevron-up' : 'tabler:chevron-down'"
        size="16"
      />
    </summary>
    <ul class="dropdown-content menu menu-sm bg-base-100 text-base-content rounded-box shadow-xl z-9999 mt-2 w-56 p-2">
      <li class="menu-title">
        <span>Himnarios</span>
      </li>
      <li v-for="sb in manifest" :key="sb.id">
        <button
          type="button"
          class="flex items-center gap-2 py-3 px-4"
          :class="{ 'menu-active': sb.id === currentId }"
          :disabled="status === 'loading'"
          @click="onSelect(sb)"
        >
          <Icon
            v-if="sb.id === currentId"
            name="tabler:check"
            size="18"
            class="text-primary"
          />
          <span v-else class="w-4" />
          <span class="flex-1 text-left">{{ sb.name }}</span>
          <Icon
            v-if="status === 'loading' && sb.id === currentId"
            name="tabler:loader-2"
            size="18"
            class="animate-spin"
          />
        </button>
      </li>
    </ul>
  </details>

  <!-- Overlay mode: full-screen first-run picker. -->
  <div
    v-else
    class="songbook-overlay fixed inset-0 z-[60] flex items-center justify-center bg-base-100/95 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="songbook-overlay-title"
  >
    <div class="songbook-overlay__box w-full max-w-md rounded-2xl bg-base-100 shadow-2xl border border-base-300 p-6 flex flex-col items-stretch gap-4">
      <div class="flex items-center gap-3">
        <Icon name="tabler:brand-netease-music" size="40" class="text-primary" />
        <div class="flex flex-col">
          <h2 id="songbook-overlay-title" class="text-xl font-bold leading-tight">
            Elige tu himnario
          </h2>
          <p class="text-sm opacity-70">
            Selecciona la colección que usarás en este dispositivo.
          </p>
        </div>
      </div>

      <ul class="menu menu-md bg-base-200 rounded-box w-full p-2">
        <li v-for="sb in manifest" :key="sb.id">
          <button
            type="button"
            class="flex items-center gap-3 py-3"
            :class="{ 'menu-active': sb.id === currentId }"
            :disabled="status === 'loading'"
            @click="onSelect(sb)"
          >
            <Icon
              v-if="sb.id === currentId"
              name="tabler:check"
              size="20"
              class="text-primary shrink-0"
            />
            <Icon
              v-else
              name="tabler:book"
              size="20"
              class="opacity-60 shrink-0"
            />
            <span class="flex-1 text-left font-medium">{{ sb.name }}</span>
            <Icon
              v-if="status === 'loading' && sb.id === currentId"
              name="tabler:loader-2"
              size="20"
              class="animate-spin"
            />
          </button>
        </li>
      </ul>

      <p class="text-xs opacity-60 text-center">
        Puedes cambiar de himnario más tarde desde el menú superior.
      </p>
    </div>
  </div>
</template>

<style scoped>
.songbook-overlay__box {
  animation: songbook-overlay-pop 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes songbook-overlay-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Remove the default disclosure triangle on the badge summary */
.dropdown > summary::-webkit-details-marker {
  display: none;
}
.dropdown > summary {
  list-style: none;
}
</style>
