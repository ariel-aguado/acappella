<script lang="ts" setup>
const isLargeScreen = useMediaQuery("(min-width: 1024px)");
const route = useRoute();
// const router = useRouter();

const showFontSidebar = ref(false);

watchEffect(async () => {
  if (isLargeScreen.value) {
    if (route.name === "index") {
      // router.replace("/fullscreen");
      navigateTo("/fullscreen");
    }
  }
  else {
    if (route.name === "fullscreen") {
      // router.replace("/");
      navigateTo("/");
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
