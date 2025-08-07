<script lang="ts" setup>
import {
  outlinedIcons,
  pastelTheme,
} from "notivue";

useHead({
  titleTemplate: c => c ? `${c} - Acappella` : "Acappella",
  link: [{ rel: "icon", href: "/icon.svg", type: "image/svg+xml" }],
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" },
  ],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPwaManifest />
    <NuxtPage />
    <Notivue v-slot="item">
      <Notification
        :item="item"
        :icons="outlinedIcons"
        :theme="pastelTheme"
      />
    </Notivue>
  </NuxtLayout>
</template>
