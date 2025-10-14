<script lang="ts" setup>
const { $pwa } = useNuxtApp();
const isLargeScreen = useMediaQuery("(min-width: 1024px)");
const route = useRoute();
const router = useRouter();

const showFontSidebar = ref(false);

onMounted(() => {
  if ($pwa?.offlineReady) {
    push.success("¡Nuevo contenido disponible!");
  }
});

watchEffect(() => {
  if (isLargeScreen.value) {
    if (route.name === "index") {
      // navigateTo("/fullscreen");
      router.replace("/fullscreen");
    }
  }
  else {
    if (route.name === "fullscreen") {
      // navigateTo("/");
      router.replace("/");
    }
  }
});
</script>

<template>
  <div class="flex flex-col h-screen max-h-screen relative">
    <AppOptionsBar v-if="route.name !== 'fullscreen'" @update:open="showFontSidebar = !showFontSidebar" />
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
    <AppNavBar v-if="route.name !== 'fullscreen'" />
    <AppFontSidebar v-if="route.name !== 'fullscreen'" :open="showFontSidebar" @update:open="showFontSidebar = $event" />
  </div>
</template>
