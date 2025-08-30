<script lang="ts" setup>
import type { FilteredSong } from "~~/lib/db/schema/song";

import Fuse from "fuse.js";
import Mark from "mark.js";

const songStore = useSongStore();
const {
  songs,
  filteredSongsByNumber,
  filteredSongsByTitle,
  filteredSongIdsByNumber,
  filteredSongIdsByTitle,
  currentTab,
} = storeToRefs(songStore);

const query = ref("");
const queryRef = shallowRef();
const songsFiltered = ref<FilteredSong[]>([]);
const isFiltering = ref(false);
const isFavorites = ref(false);

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
};

const searchOptions = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.0,
  // distance: 0,
  ignoreLocation: true,
  ignoreDiacritics: true,
  minMatchCharLength: 1,
};

// Helper to get the current base list for Fuse (all or only favorites)
function getBaseSongs() {
  if (isFavorites.value) {
    return songs.value.filter(s => s.favorite);
  }
  return songs.value;
}

function getFuseInstance() {
  return new Fuse(getBaseSongs(), {
    keys: [
      { name: "title", weight: 2 },
    ],
    ...searchOptions,
  });
}

function performMark() {
  const context = document.querySelector(".context");
  const markOptions = {
    diacritics: true,
    separateWordSearch: false,
  };
  const markInstance = new Mark(context);

  // Remove previous marked elements and mark
  // the new keyword inside the context
  markInstance.unmark({
    done() {
      markInstance.mark(query.value, markOptions);
    },
  });
};

// Function to clean titles for sorting
function cleanTitle(title: string) {
  // Remove leading non-alphanumeric characters (including whitespace)
  return title.replace(/^[^a-z0-9]+/i, "").toLowerCase();
}

function fillSongsFilteredByNumber() {
  filteredSongsByNumber.value = songsFiltered.value
    .slice()
    .sort((a, b) => {
      // If songId is numeric, sort numerically, else lexically
      const aNum = Number(a.songId);
      const bNum = Number(b.songId);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a.songId).localeCompare(String(b.songId));
    });
  filteredSongIdsByNumber.value = songStore.generateAnchorsFromSongIds(filteredSongsByNumber.value.map(s => s.songId));
}

function fillSongsFilteredByTitle() {
  filteredSongsByTitle.value = songsFiltered.value
    .slice()
    .sort((a, b) => {
      const cleanA = cleanTitle(a.title);
      const cleanB = cleanTitle(b.title);
      return cleanA.localeCompare(cleanB);
    });
  filteredSongIdsByTitle.value = songStore.generateAnchorFromInitials(filteredSongsByTitle.value.map(s => s.title));
}

async function onFavoriteOff(favoriteOff: boolean) {
  if (isFavorites.value && favoriteOff) {
    updateFilteredSongs(query.value);
  }
}

onMounted(() => {
  songsFiltered.value = songs.value.map(s => ({
    songId: s.songId,
    title: s.title,
    firstLine:
      Array.isArray(s.lyricLines) && s.lyricLines.length > 1 && s.lyricLines[0]?.line?.startsWith("(")
        ? s.lyricLines[1]?.line ?? ""
        : s.lyricLines?.[0]?.line ?? "",
    favorite: s.favorite,
  }));

  if (currentTab.value === "byNumber") {
    fillSongsFilteredByNumber();
  }
  else if (currentTab.value === "byTitle") {
    fillSongsFilteredByTitle();
  }
});

function updateFilteredSongs(newQuery: string) {
  const baseSongs = getBaseSongs();
  if (newQuery !== "") {
    const fuse = getFuseInstance();
    songsFiltered.value = fuse
      .search(toValue(query))
      .map(s => s.item)
      .map(s => ({
        songId: s.songId,
        title: s.title,
        firstLine:
          Array.isArray(s.lyricLines) && s.lyricLines.length > 1 && s.lyricLines[0]?.line?.startsWith("(")
            ? s.lyricLines[1]?.line ?? ""
            : s.lyricLines?.[0]?.line ?? "",
        favorite: s.favorite,
      }));
  }
  else {
    songsFiltered.value = baseSongs.map(s => ({
      songId: s.songId,
      title: s.title,
      firstLine:
        Array.isArray(s.lyricLines) && s.lyricLines.length > 1 && s.lyricLines[0]?.line?.startsWith("(")
          ? s.lyricLines[1]?.line ?? ""
          : s.lyricLines?.[0]?.line ?? "",
      favorite: s.favorite,
    }));
  }

  if (currentTab.value === "byNumber") {
    filteredSongsByTitle.value = [];
    fillSongsFilteredByNumber();
  }
  else if (currentTab.value === "byTitle") {
    filteredSongsByNumber.value = [];
    fillSongsFilteredByTitle();
  }
}

watch(
  () => isFavorites.value,
  async () => {
    // Always re-apply mark highlighting when the favorites filter changes
    await nextTick();
    performMark();
  },
);

watch(
  [() => query.value, isFavorites, songs],
  ([newQuery]) => {
    updateFilteredSongs(newQuery);
  },
  { immediate: true },
);

watch(
  () => currentTab.value,
  async (newValue) => {
    if (newValue === "byNumber") {
      if (filteredSongsByNumber.value.length === 0) {
        fillSongsFilteredByNumber();
      }
    }
    else if (newValue === "byTitle") {
      if (filteredSongsByTitle.value.length === 0) {
        fillSongsFilteredByTitle();
      }
    }

    await nextTick();
    performMark();
  },
);
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-64px-52px)] max-w-screen md:max-w-5xl md:mx-auto">
    <div class="flex justify-end items-center gap-2 p-4">
      <Transition name="slide-down">
        <span v-if="isFiltering" class="px-2 mr-auto">Buscar por título:</span>
      </Transition>

      <!-- Filter -->
      <label class="swap relative">
        <!-- this hidden checkbox controls the state -->
        <input v-model="isFiltering" type="checkbox">

        <!-- filter on icon -->
        <Icon name="tabler:filter-off" size="28" class="swap-on fill-current text-secondary" />

        <!-- filter off icon -->
        <Icon name="tabler:filter" size="28" class="swap-off fill-current text-secondary" />

        <!-- filter badge -->
        <div v-if="query.length > 0" class="badge badge-xs bg-primary absolute -top-1 -right-1" />
      </label>

      <!-- Favorite -->
      <label class="swap">
        <!-- this hidden checkbox controls the state -->
        <input v-model="isFavorites" type="checkbox">

        <!-- favorite on icon -->
        <Icon name="tabler:heart-filled" size="28" class="swap-on fill-current text-primary" />

        <!-- favorite off icon -->
        <Icon name="tabler:heart" size="28" class="swap-off fill-current text-secondary" />
      </label>
    </div>

    <!-- Search input with transition -->
    <Transition name="fade-height-sync">
      <div v-if="isFiltering" class="sticky top-0 z-10 shadow-md px-4 pb-4 bg-base-100 dark:bg-content backdrop-blur-sm">
        <label class="input w-full">
          <Icon name="carbon:search" size="16" class="text-secondary" />
          <input
            id="query"
            ref="queryRef"
            v-model="query"
            v-focus
            type="search"
            autocomplete="off"
            @input="performMark"
          >
        </label>
      </div>
    </Transition>

    <!-- Tabs -->
    <div class="tabs tabs-border flex justify-center text-secondary mt-2 border-b border-base-300">
      <!-- Tab by number -->
      <div class="flex-1 flex flex-col">
        <label for="by_number" class="mb-2 flex justify-center items-center gap-2">
          <Icon name="tabler:sort-ascending-numbers" size="28" />
          <span class="uppercase">Por número</span>
        </label>
        <input
          id="by_number"
          v-model="currentTab"
          type="radio"
          name="by_number"
          class="tab h-fit p-0"
          value="byNumber"
          :checked="currentTab === 'byNumber'"
        >
      </div>
      <!-- Tab by title -->
      <div class="flex-1 flex flex-col">
        <label for="by_title" class="mb-2 flex justify-center items-center gap-2">
          <Icon name="tabler:sort-ascending-letters" size="28" />
          <span class="uppercase">Por título</span>
        </label>
        <input
          id="by_title"
          v-model="currentTab"
          type="radio"
          name="by_title"
          class="tab h-fit p-0"
          value="byTitle"
          :checked="currentTab === 'byTitle'"
        >
      </div>
    </div>

    <!-- Content with smooth height transition -->
    <div v-if="currentTab === 'byNumber'" key="byNumber" class="context flex-1 flex overflow-y-auto">
      <SongsByNumber v-if="filteredSongsByNumber.length" @favorite-off="onFavoriteOff" />
      <EmptyState v-else />
    </div>
    <div v-if="currentTab === 'byTitle'" key="byTitle" class="context flex-1 flex overflow-y-auto">
      <SongsByTitle v-if="filteredSongsByTitle.length" @favorite-off="onFavoriteOff" />
      <EmptyState v-else />
    </div>
  </div>
</template>

<style>
.clamped-line {
  display: -webkit-box; /* Necesario para Safari/WebKit */
  -webkit-box-orient: vertical; /* Orientación vertical */
  -webkit-line-clamp: 1; /* Número de líneas que quieres mostrar */
  overflow: hidden; /* Oculta el texto sobrante */
  text-overflow: ellipsis; /* Añade los puntos suspensivos (…) */
}
.tabs-border {
  & .tab {
    &:before {
      width: 100%;
      left: 0;
    }
  }
}
/* evita que el navegador intercepte gestos (zoom, scroll nativo) sobre la barra */
#sidebar {
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
/* Slide down transition for search input */
.slide-down-enter-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-down-leave-active {
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-32px);
}
.slide-down-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-32px);
}

/* Synced height and fade transition for filter and tabs content */
.fade-height-sync-enter-active,
.fade-height-sync-leave-active {
  transition:
    max-height 0.1s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.fade-height-sync-enter-from,
.fade-height-sync-leave-to {
  max-height: 0;
  opacity: 0;
}
.fade-height-sync-enter-to,
.fade-height-sync-leave-from {
  max-height: 1000px;
  opacity: 1;
}
</style>
