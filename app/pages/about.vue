<script lang="ts" setup>
const songStore = useSongStore();
const { isLoading } = storeToRefs(songStore);

async function updateSongsData() {
  await songStore.updateSongsData();
}
</script>

<template>
  <div class="w-full flex flex-col h-[calc(100dvh-64px-52px)] p-4">
    <div style="width: 100%; height: 300px; position: relative" class="rounded-xl overflow-hidden border border-primary/50">
      <DarkVeil
        :hue-shift="0"
        :noise-intensity="0"
        :scanline-intensity="0"
        :speed="1"
        :scanline-frequency="0"
        :warp-amount="0"
        :resolution-scale="1"
      />
      <div class="absolute inset-0 flex-1 flex flex-col justify-center items-center text-white border border-white/40 rounded-xl">
        <Icon name="tabler:brand-netease-music" size="128" />
        <div class="flex flex-col items-center gap-4 p-4">
          <span class="leading-6 font-bold text-5xl">
            Acappella
          </span>
          <ShinyText
            text="Himnos Montevideo"
            :disabled="false"
            :speed="3"
            class-name="font-normal text-xl"
          />
        </div>
      </div>
    </div>
    <div>
      <h2 class="text-3xl font-bold mt-8">
        Acerca de Acappella
      </h2>
      <p class="mt-4 leading-8">
        La aplicación "Acappella" fue creada con el firme propósito de proveer a la Iglesia de Cristo en Montevideo una tecnología dedicada para exaltar el nombre del Señor nuestro Dios, a quien pertenece toda alabanza y honra por la eternidad. Amén.
      </p>
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
