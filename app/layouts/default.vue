<script lang="ts" setup>
const { $pwa } = useNuxtApp();

const showFontSidebar = ref(false);

onMounted(() => {
  if (!$pwa?.isPWAInstalled) {
    $pwa?.install();
  }
  if ($pwa?.offlineReady) {
    push.success("¡Nuevo contenido disponible!");
  }
});
</script>

<template>
  <div class="flex flex-col h-screen max-h-screen relative overflow-hidden">
    <AppNavBar @update:open="showFontSidebar = !showFontSidebar" />
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
    <AppOptionsBar />
    <AppFontSidebar :open="showFontSidebar" @update:open="showFontSidebar = $event" />
  </div>
</template>
