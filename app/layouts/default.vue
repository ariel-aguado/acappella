<template>
  <div class="flex flex-col h-screen max-h-screen relative overflow-hidden">
    <AppNavBar />
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
    <AppButtonBar />
  </div>
</template>
