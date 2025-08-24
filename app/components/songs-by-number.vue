<script lang="ts" setup>
import type { FilteredSong } from "~~/lib/db/schema";

const emit = defineEmits<{
  (e: "favoriteOff", favoriteOff: boolean): void;
}>();

const songStore = useSongStore();
const { filteredSongIdsByNumber, filteredSongsByNumber } = storeToRefs(songStore);

function onToggleFavorite(song: FilteredSong) {
  songStore.toggleFavorite(song);
  emit("favoriteOff", song.favorite);
}
</script>

<template>
  <div class="flex-1">
    <div
      v-for="song in filteredSongsByNumber"
      :key="`song-by-number-${song.songId}`"
      class="song-item [&:not(:first-child)]:border-t [&:not(:first-child)]:border-base-300"
      :data-song-index="song.songId"
    >
      <div
        class="w-full h-auto flex justify-start items-center gap-2 py-2 pl-4 pr-0"
      >
        <!-- Song number -->
        <div
          class="flex justify-center items-center bg-secondary font-bold text-xl text-white aspect-square w-12 h-12 p-2 rounded-full"
          @click="songStore.navigateToSong(song.songId)"
        >
          {{ song.songId }}
        </div>
        <div class="flex-1 flex justify-between items-center gap-2">
          <div class="flex flex-col items-start" @click="songStore.navigateToSong(song.songId)">
            <!-- Title -->
            <p class="text-start font-bold">
              {{ song.title }}
            </p>
            <!-- First line -->
            <p class="text-start text-sm clamped-line">
              {{ song.firstLine }}
            </p>
          </div>
          <!-- Favorite -->
          <label class="swap p-4">
            <!-- this hidden checkbox controls the state -->
            <input type="checkbox" :checked="song.favorite" @change="onToggleFavorite(song)">

            <!-- favorite on icon -->
            <Icon name="tabler:heart-filled" size="28" class="swap-on fill-current text-secondary" />

            <!-- favorite off icon -->
            <Icon name="tabler:heart" size="28" class="swap-off fill-current text-secondary" />
          </label>
        </div>
      </div>
    </div>
  </div>
  <!-- Sidebar of anchors -->
  <SidebarAnchors
    v-if="filteredSongsByNumber.length > 15"
    :ids="filteredSongIdsByNumber"
    :sections="15"
    @jump="songStore.jumpToSong"
  />
</template>
