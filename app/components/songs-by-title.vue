<script lang="ts" setup>
import type { FilteredSong } from "~~/lib/db/schema";

const emit = defineEmits<{
  (e: "favoriteOff", favoriteOff: boolean): void;
}>();

const songStore = useSongStore();
const { filteredSongIdsByTitle, filteredSongsByTitle } = storeToRefs(songStore);

function onToggleFavorite(song: FilteredSong) {
  songStore.toggleFavorite(song);
  emit("favoriteOff", song.favorite);
}
</script>

<template>
  <div class="flex-1">
    <div
      v-for="song in filteredSongsByTitle"
      :key="`song-by-title-${song.songId}`"
      class="song-item [&:not(:first-child)]:border-t [&:not(:first-child)]:border-base-300"
      :data-song-index="song.title.charAt(0)"
    >
      <SongItem :song @favorite-off="onToggleFavorite($event)" />
    </div>
  </div>
  <!-- Sidebar of anchors -->
  <SidebarAnchors
    v-if="filteredSongsByTitle.length > 15"
    :ids="filteredSongIdsByTitle"
    :sections="15"
    @jump="songStore.jumpToSong"
  />
</template>
