<template>
  <div
    class="navbar h-[64px] w-full py-0 px-0 bg-primary shadow-[0_4px_20px_0_rgba(0,0,0,0.5)] text-primary-content"
    style="backdrop-filter: blur(6px);"
  >
    <div class="navbar-start">
      <NuxtLink to="/" class="btn btn-ghost text-xl flex items-center gap-1 px-3">
        <Icon name="tabler:brand-netease-music" size="44" />
        <div class="flex flex-col items-start">
          <span class="leading-6">
            Acappella
          </span>
          <span class="text-xs font-normal">Himnos Montevideo</span>
        </div>
      </NuxtLink>
    </div>
    <div class="navbar-end">
      <AppThemeToggle />
    </div>
  </div>
</template>
