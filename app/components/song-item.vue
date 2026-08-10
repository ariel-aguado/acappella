<script lang="ts" setup>
import type { FilteredSong } from "~~/lib/types";

const { song } = defineProps<{
  song: FilteredSong;
}>();

const emit = defineEmits(["favoriteOff"]);

const route = useRoute();

const songStore = useSongStore();
</script>

<template>
  <div
    class="w-full h-auto flex justify-start items-center hover:cursor-pointer gap-2 py-2 pl-4 pr-0"
  >
    <!-- Song number -->
    <button
      type="button"
      class="flex justify-center items-center bg-secondary hover:cursor-pointer font-bold text-xl text-white aspect-square w-12 h-12 p-2 rounded-full"
      @click="songStore.navigateToSong(song.songId)"
    >
      {{ song.songId }}
    </button>
    <div class="flex-1 flex justify-between gap-2">
      <button
        type="button"
        class="flex-1 flex flex-col hover:cursor-pointer"
        :class="{
          'justify-center items-center': route.name === 'fully-search',
          'justify-center items-start': route.name === 'search',
        }"
        @click="songStore.navigateToSong(song.songId)"
      >
        <!-- Title -->
        <p class="w-full text-start font-bold">
          {{ song.title }}
        </p>
        <!-- First line -->
        <p class="text-start text-sm clamped-line">
          {{ song.firstLine }}
        </p>
      </button>
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

<style scoped>
.clamped-line {
  display: -webkit-box; /* Necesario para Safari/WebKit */
  -webkit-box-orient: vertical; /* Orientación vertical */
  -webkit-line-clamp: 1; /* Número de líneas que quieres mostrar */
  overflow: hidden; /* Oculta el texto sobrante */
  text-overflow: ellipsis; /* Añade los puntos suspensivos (…) */
}
</style>
