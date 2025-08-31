<script lang="ts" setup>
import type { FilteredSong } from "~~/lib/db/schema/song";

const { song } = defineProps<{
  song: FilteredSong;
}>();
const emit = defineEmits(["favoriteOff"]);

const songStore = useSongStore();
</script>

<template>
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
      <div class="flex-1 flex flex-col items-start" @click="songStore.navigateToSong(song.songId)">
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
        <input type="checkbox" :checked="song.favorite" @change="emit('favoriteOff', song)">

        <!-- favorite on icon -->
        <Icon name="tabler:heart-filled" size="28" class="swap-on fill-current text-secondary" />

        <!-- favorite off icon -->
        <Icon name="tabler:heart" size="28" class="swap-off fill-current text-secondary" />
      </label>
    </div>
  </div>
</template>
