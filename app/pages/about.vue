<script lang="ts" setup>
const songStore = useSongStore();
const { isLoading } = storeToRefs(songStore);

async function updateSongsData() {
  await songStore.updateSongsData();
}
</script>

<template>
  <div class="w-full flex flex-col h-[calc(100dvh-64px-52px)] p-4">
    <div class="flex flex-col items-center border border-accent-content rounded-xl">
      <Icon name="tabler:brand-netease-music" size="128" />
      <div class="flex flex-col items-center gap-4 p-4">
        <span class="leading-6 font-bold text-5xl">
          Acappella
        </span>
        <span class="font-normal text-xl">Himnos Montevideo</span>
      </div>
    </div>
    <div class="flex-1 flex items-end">
      <button
        type="submit"
        class="btn btn-primary flex justify-center items-center gap-2 mx-auto"
        :disabled="isLoading"
        @click="updateSongsData"
      >
        <span v-if="isLoading" class="loading loading-spinner loading-md text-primary" />
        <span>{{ isLoading ? 'Actualizando datos del himnario' : 'Actualizar datos del himnario' }}</span>
      </button>
    </div>
  </div>
</template>
