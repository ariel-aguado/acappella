<script lang="ts" setup>
const route = useRoute();
</script>

<template>
  <div class="navbar-center h-[52px] flex justify-center shadow-[0_-4px_22px_0_rgba(0,0,0,0.35)]">
    <ul class="menu menu-horizontal gap-2 px-1">
      <li>
        <NuxtLink
          to="/"
          class="aspect-square rounded-xl p-2"
          :class="{
            'bg-primary text-white': route.path === '/',
          }"
        >
          <Icon name="tabler:music" size="24" />
        </NuxtLink>
      </li>
      <li>
        <NuxtLink
          to="/search"
          class="aspect-square rounded-xl p-2"
          :class="{
            'bg-primary text-white': route.path === '/search',
          }"
        >
          <Icon name="tabler:search" size="24" />
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
