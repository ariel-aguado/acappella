<script lang="ts" setup>
const route = useRoute();
</script>

<template>
  <div class="navbar-center h-[52px] flex justify-center shadow-[0_-4px_22px_0_rgba(0,0,0,0.35)] z-10">
    <ul class="menu menu-horizontal gap-4 px-1">
      <li>
        <button
          type="button"
          class="btn btn-soft btn-primary btn-sm rounded-full px-4"
          :class="{
            'bg-primary text-white': route.path === '/',
            'bg-soft text-primary': route.path !== '/',
          }"
          @click="navigateTo('/')"
        >
          <Icon name="tabler:music" size="24" />
        </button>
      </li>
      <li>
        <button
          type="button"
          class="btn btn-soft btn-primary btn-sm rounded-full px-4"
          :class="{
            'bg-primary text-white': route.path === '/search',
            'bg-soft text-primary': route.path !== '/search',
          }"
          @click="navigateTo('/search')"
        >
          <Icon name="tabler:music-search" size="24" />
        </button>
      </li>
      <li>
        <button
          type="button"
          class="btn btn-soft btn-primary btn-sm rounded-full px-4"
          :class="{
            'bg-primary text-white': route.path === '/fully-search',
            'bg-soft text-primary': route.path !== '/fully-search',
          }"
          @click="navigateTo('/fully-search')"
        >
          <Icon name="tabler:search" size="24" />
        </button>
      </li>
      <li>
        <button
          type="button"
          class="btn btn-soft btn-primary btn-sm rounded-full px-4"
          :class="{
            'bg-primary text-white': route.path === '/about',
            'bg-soft text-primary': route.path !== '/about',
          }"
          @click="navigateTo('/about')"
        >
          <Icon name="tabler:music-cog" size="24" />
        </button>
      </li>
    </ul>
  </div>
</template>
