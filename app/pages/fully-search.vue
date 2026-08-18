<script lang="ts" setup>
import Mark from "mark.js";

const songStore = useSongStore();
const songbookStore = useSongbookStore();
const { favoriteSongs, searchHistory } = storeToRefs(songStore);
const { currentFile } = storeToRefs(songbookStore);

const { search: workerSearch } = useSongbookWorker();

const query = ref("");
const queryRef = shallowRef();

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
};

const searchResult = ref<FullSearchResult[]>([]);
let searchSeq = 0;

// When the songbook changes while on this page, drop the stale results
// from the previous songbook and re-run the current search against the
// new one. The query and history are kept; only the results are tied
// to the corpus that was loaded at search time.
watch(currentFile, async (newFile, oldFile) => {
  if (!oldFile || newFile === oldFile)
    return;
  searchResult.value = [];
  if (query.value.trim()) {
    await runSearch(query.value);
  }
});

async function runSearch(text: string) {
  if (!text || !text.trim()) {
    searchResult.value = [];
    return;
  }
  const mySeq = ++searchSeq;
  const results = (await workerSearch(text, {
    mode: "full",
    favoriteIds: favoriteSongs.value.slice(),
    limit: 15,
  })) as FullSearchResult[];
  if (mySeq !== searchSeq)
    return;
  searchResult.value = results;
}

function performMark() {
  const context = document.querySelector(".context");
  if (!context)
    return;
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
  // Wait for the search triggered by `query` change to complete AND the DOM
  // to reflect the new results — then apply the highlight.
  await nextTick();
  await new Promise(r => setTimeout(r, 0));
  performMark();
}

watch(query, (newQuery) => {
  runSearch(newQuery);
});

// Re-apply highlight whenever the results change. This covers:
//   - typing in the input (via @input="performMark" too, but that's a hot path)
//   - clicking a recent search item (no @input event, so we need this watcher)
//   - any other code path that mutates searchResult
watch(searchResult, () => {
  nextTick().then(() => performMark());
});
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-64px-52px)] max-w-screen min-w-0 md:min-w-2xl md:max-w-2xl md:mx-auto md:pt-8">
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
        :key="song.songId"
        class="[&:not(:first-child)]:border-t [&:not(:first-child)]:border-base-300"
      >
        <SongItem :song="song" @favorite-off="songStore.toggleFavorite($event)" />
        <div
          v-for="(songLine, index) in song.matchedLines"
          :key="`line-${song.songId}-${index}`"
          class="[&:not(:first-child)]:border-t [&:not(:first-child)]:border-base-300 py-1 px-4"
        >
          {{ songLine.line }}
        </div>
      </div>
    </div>
    <div
      v-else-if="query.length && !searchResult.length"
      class="flex flex-col justify-center items-center mt-8"
    >
      <img src="/img/empty-state.webp" alt="Empty state" class="w-[100px] h-auto">
      <span class="text-xl font-bold mt-4">No se encontraron resultados</span>
      <span>Intenta otra búsqueda</span>
    </div>
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
