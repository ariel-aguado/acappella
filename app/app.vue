<script lang="ts" setup>
import {
  outlinedIcons,
  pastelTheme,
} from "notivue";

setupPageHeader();
</script>

<template>
  <NuxtLayout>
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
