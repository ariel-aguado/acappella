<script lang="ts" setup>
import type { LyricLine } from "~~/lib/types";

import Fuse from "fuse.js";
import Mark from "mark.js";

const songStore = useSongStore();
const { songs, searchHistory } = storeToRefs(songStore);

const query = ref("");
const queryRef = shallowRef();

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

const allSongs = new Fuse(toValue(songs), {
  keys: [
    { name: "title", weight: 2 },
    { name: "lyric", weight: 1 },
  ],
  ...searchOptions,
});

const searchResult = computed(() => allSongs.search(toValue(query)).slice(0, 15));

function handleSongLines(lines: LyricLine[]) {
  const allLines = new Fuse(lines, {
    keys: [
      { name: "line", weight: 1 },
    ],
    ...searchOptions,
  });

  return allLines.search(toValue(query));
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

function saveSearchHistory() {
  if (query.value.length > 0) {
    if (searchHistory.value.length >= 6) {
      searchHistory.value.pop();
    }
    searchHistory.value.unshift(toValue(query.value));
  }
}

function removeSearchHistory(history: string) {
  searchHistory.value = [...searchHistory.value.filter(h => h !== history)];
}

function clearSearchHistory() {
  searchHistory.value = [];
  queryRef.value.focus();
}

async function setQuery(history: string) {
  query.value = history;
  queryRef.value.focus();
  await nextTick();
  performMark();
}
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-64px-52px)] max-w-screen min-w-0 md:min-w-2xl md:max-w-2xl md:mx-auto md:pt-8">
    <!-- Search results -->
    <div class="sticky top-0 z-10 shadow-md md:shadow-none p-4 bg-base-100 dark:bg-content backdrop-blur-sm">
      <span>Introduzca cualquier palabra:</span>
      <label class="input w-full mt-2">
        <Icon name="carbon:search" size="16" class="text-secondary" />
        <input
          id="query"
          ref="queryRef"
          v-model="query"
          v-focus
          type="search"
          autocomplete="off"
          @input="performMark"
          @blur="saveSearchHistory"
        >
      </label>
    </div>
    <div v-if="query.length && searchResult.length" class="context flex flex-col overflow-y-auto">
      <div
        v-for="song in searchResult"
        :key="song.item.id"
        class="[&:not(:first-child)]:border-t [&:not(:first-child)]:border-base-300"
      >
        <SongItem :song="song.item" @favorite-off="songStore.toggleFavorite($event)" />
        <!-- Lyrics -->
        <div
          v-for="(songLine, index) in handleSongLines(song.item.lyricLines)"
          :key="`line-${index}`"
          class="[&:not(:first-child)]:border-t [&:not(:first-child)]:border-base-300 py-1 px-4"
        >
          {{ songLine.item.line }}
        </div>
      </div>
    </div>
    <!-- Empty state -->
    <div
      v-else-if="query.length && !searchResult.length"
      class="flex flex-col justify-center items-center mt-8"
    >
      <img src="/img/empty-state.webp" alt="Empty state" class="w-[100px] h-auto">
      <span class="text-xl font-bold mt-4">No se encontraron resultados</span>
      <span>Intenta otra búsqueda</span>
    </div>
    <!-- Search history -->
    <div v-else-if="searchHistory.length" class="flex flex-col gap-2 px-4">
      <div class="flex justify-between items-center border-b-2 border-base-300 py-4">
        <span class="text-base font-normal">Búsquedas recientes</span>
        <button
          type="button"
          class="btn btn-secondary rounded-full"
          @click="clearSearchHistory"
        >
          Limpiar
        </button>
      </div>
      <div
        v-for="(history, index) in [...new Set(searchHistory)]"
        :key="`search-${index}`"
        class="flex justify-between items-center"
      >
        <button
          type="button"
          class="flex-1 btn btn-ghost btn-sm flex justify-start items-center gap-2 px-0"
          @click="setQuery(history)"
        >
          <Icon name="carbon:recently-viewed" size="20" class="text-secondary" />
          <span class="text-base font-normal">{{ history }}</span>
        </button>
        <button
          type="button"
          class="btn btn-ghost btn-sm px-0"
          @click="removeSearchHistory(history)"
        >
          <Icon name="carbon:close-large" size="20" class="text-secondary" />
        </button>
      </div>
    </div>
  </div>
</template>

<style>
mark {
  background: orange;
  color: black;
}
</style>
