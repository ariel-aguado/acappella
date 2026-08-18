<script lang="ts" setup>
setupPageHeader();

const { status, error } = useSongbookWorker();
const songbookStore = useSongbookStore();

// Show the first-run picker only after the manifest is loaded (so we know
// what songbooks to offer) AND while no songbook is currently selected.
const showFirstRunOverlay = computed(
  () => songbookStore.manifest.length > 0 && !songbookStore.currentId,
);
</script>

<template>
  <NuxtPwaManifest />
  <AppBootLoader :status="status" :error="error" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppSongbookSelector v-if="showFirstRunOverlay" mode="overlay" />
  <AppInstallBanner />
  <AppUpdateToast />
</template>
