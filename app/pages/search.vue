<script lang="ts" setup>
const currentTab = ref("byNumber");
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-64px-52px)]">
    <!-- <div class="flex justify-end items-center gap-2 p-2">
      <button
        class="btn btn-circle btn-ghost text-secondary"
        aria-label="Filtrar himnos"
      >
        <Icon name="tabler:filter" size="28" />
      </button>
      <button
        class="btn btn-circle btn-ghost text-secondary"
        aria-label="Mostrar favoritos"
      >
        <Icon name="tabler:heart" size="28" />
      </button>
    </div> -->

    <!-- Tabs -->
    <div class="tabs tabs-border flex justify-center mt-2 text-secondary">
      <div class="flex-1 flex flex-col">
        <label for="by_number" class="mb-2 flex justify-center items-center gap-2">
          <Icon name="tabler:sort-ascending-numbers" size="28" />
          <span class="uppercase">Por número</span>
        </label>
        <input
          id="by_number"
          v-model="currentTab"
          type="radio"
          name="by_number"
          class="tab h-fit p-0"
          value="byNumber"
          :checked="currentTab === 'byNumber'"
        >
      </div>

      <div class="flex-1 flex flex-col">
        <label for="by_title" class="mb-2 flex justify-center items-center gap-2">
          <Icon name="tabler:sort-ascending-letters" size="28" />
          <span class="uppercase">Por título</span>
        </label>
        <input
          id="by_title"
          v-model="currentTab"
          type="radio"
          name="by_title"
          class="tab h-fit p-0"
          value="byTitle"
          :checked="currentTab === 'byTitle'"
        >
      </div>
    </div>

    <!-- Content -->
    <div v-if="currentTab === 'byNumber'" class="flex-1 flex overflow-y-auto">
      <SongsByNumber />
    </div>
    <div v-else-if="currentTab === 'byTitle'" class="flex-1 flex overflow-y-auto">
      <SongsByTitle />
    </div>
  </div>
</template>

<style>
/* evita que el navegador intercepte gestos (zoom, scroll nativo) sobre la barra */
#sidebar {
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>
