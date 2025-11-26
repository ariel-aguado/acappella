<script lang="ts" setup>
import type { FilteredSong } from "~~/lib/types";

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
      <SongItem :song @favorite-off="onToggleFavorite($event)" />
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
