<script lang="ts" setup>
import { useDebounceFn } from "@vueuse/core";
import Mark from "mark.js";

import type { FilteredSong } from "~~/lib/types";

const songStore = useSongStore();
const {
  songs,
  filteredSongsByNumber,
  filteredSongsByTitle,
  filteredSongIdsByNumber,
  filteredSongIdsByTitle,
  favoriteSongs,
  currentTab,
} = storeToRefs(songStore);

const { search: workerSearch } = useSongbookWorker();

const query = ref("");
const queryRef = shallowRef();
const songsFiltered = ref<FilteredSong[]>([]);
const isFiltering = ref(false);
const isFavorites = ref(false);
// True while a worker search is in flight. Used to distinguish "loading"
// from "no results" so we don't flash the empty state during tab switches.
const isSearching = ref(false);

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
};

function performMark() {
  const context = document.querySelector(".context");
  const markOptions = {
    diacritics: true,
    separateWordSearch: false,
  };
  const markInstance = new Mark(context);

  markInstance.unmark({
    done() {
      markInstance.mark(query.value, markOptions);
    },
  });
}

function cleanTitle(title: string) {
  return title.replace(/^[^a-z0-9]+/i, "").toLowerCase();
}

function fillSongsFilteredByNumber() {
  filteredSongsByNumber.value = songsFiltered.value
    .slice()
    .sort((a, b) => {
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
    await updateFilteredSongs(query.value);
  }
}

onMounted(() => {
  currentTab.value = "byNumber";
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

async function updateFilteredSongs(newQuery: string) {
  isSearching.value = true;
  try {
    const mode = currentTab.value === "byTitle" ? "byTitle" : "byNumber";
    const results = (await workerSearch(newQuery, {
      mode,
      favoritesOnly: isFavorites.value,
      favoriteIds: favoriteSongs.value.slice(),
      limit: 380,
    })) as FilteredSong[];
    songsFiltered.value = results;

    if (currentTab.value === "byNumber") {
      filteredSongsByTitle.value = [];
      fillSongsFilteredByNumber();
    }
    else if (currentTab.value === "byTitle") {
      filteredSongsByNumber.value = [];
      fillSongsFilteredByTitle();
    }
  }
  finally {
    isSearching.value = false;
  }
}

const debouncedUpdate = useDebounceFn(async (q: string) => {
  await updateFilteredSongs(q);
  await nextTick();
  performMark();
}, 120);

watch(
  () => isFavorites.value,
  async () => {
    await debouncedUpdate(query.value);
    await nextTick();
    performMark();
  },
);

watch(
  [() => query.value, songs],
  ([newQuery]) => {
    debouncedUpdate(newQuery);
  },
  { immediate: true },
);

watch(
  () => currentTab.value,
  async (newValue) => {
    await updateFilteredSongs(query.value);
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
  <div class="flex flex-col h-[calc(100dvh-64px-52px)] max-w-screen min-w-0 md:min-w-2xl md:max-w-2xl md:mx-auto">
    <div class="flex justify-end items-center gap-2 p-4">
      <Transition name="slide-down">
        <span v-if="isFiltering" class="px-2 mr-auto">Buscar por título:</span>
      </Transition>

      <label class="swap relative">
        <input v-model="isFiltering" type="checkbox">
        <Icon name="tabler:filter-off" size="28" class="swap-on fill-current text-secondary" />
        <Icon name="tabler:filter" size="28" class="swap-off fill-current text-secondary" />
        <div v-if="query.length > 0" class="badge badge-xs bg-primary absolute -top-1 -right-1" />
      </label>

      <label class="swap">
        <input v-model="isFavorites" type="checkbox">
        <Icon name="tabler:heart-filled" size="28" class="swap-on fill-current text-primary" />
        <Icon name="tabler:heart" size="28" class="swap-off fill-current text-secondary" />
      </label>
    </div>

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

    <div
      class="tabs tabs-border flex justify-center text-secondary border-b border-base-300"
      :class="{
        'mt-2': isFiltering,
      }"
    >
      <label class="tab flex-1 flex flex-col">
        <input
          id="by_number"
          v-model="currentTab"
          type="radio"
          name="by_number"
          class="h-fit p-0"
          value="byNumber"
          :checked="currentTab === 'byNumber'"
        >
        <Icon name="tabler:sort-ascending-numbers" size="28" />
        <span class="uppercase">Por número</span>
      </label>
      <label class="tab flex-1 flex flex-col">
        <input
          id="by_title"
          v-model="currentTab"
          type="radio"
          name="by_title"
          class="h-fit p-0"
          value="byTitle"
          :checked="currentTab === 'byTitle'"
        >
        <Icon name="tabler:sort-ascending-letters" size="28" />
        <span class="uppercase">Por título</span>
      </label>
    </div>

    <div v-if="currentTab === 'byNumber'" key="byNumber" class="context flex-1 flex overflow-y-auto">
      <SongsByNumber v-if="filteredSongsByNumber.length" @favorite-off="onFavoriteOff" />
      <div v-else-if="isSearching" class="flex-1 flex justify-center items-center">
        <span class="loading loading-spinner loading-xl" />
      </div>
      <EmptyState v-else />
    </div>
    <div v-if="currentTab === 'byTitle'" key="byTitle" class="context flex-1 flex overflow-y-auto">
      <SongsByTitle v-if="filteredSongsByTitle.length" @favorite-off="onFavoriteOff" />
      <div v-else-if="isSearching" class="flex-1 flex justify-center items-center">
        <span class="loading loading-spinner loading-xl" />
      </div>
      <EmptyState v-else />
    </div>
  </div>
</template>

<style scoped>
.tabs-border {
  & .tab {
    &:before {
      width: 100%;
      left: 0;
    }
  }
}

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
