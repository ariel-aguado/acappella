<script lang="ts" setup>
const showFontSidebar = ref(false);
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
