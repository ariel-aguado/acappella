<script lang="ts" setup>
setupPageHeader();

const { status } = useSongbookWorker();
</script>

<template>
  <NuxtPwaManifest />
  <AppBootLoader :status="status" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppInstallBanner />
</template>
