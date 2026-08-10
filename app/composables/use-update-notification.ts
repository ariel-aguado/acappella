/**
 * Wraps the SW update notification from `@vite-pwa/nuxt`'s `pwa` object.
 *
 * When the SW detects a new version, `needRefresh` becomes true.
 * Calling `applyUpdate()` invokes `updateServiceWorker(true)` which applies
 * the new SW and reloads the page.
 */
export function useUpdateNotification() {
  const nuxt = useNuxtApp();
  const pwa = (nuxt.$pwa as {
    needRefresh?: import("vue").Ref<boolean>;
    offlineReady?: import("vue").Ref<boolean>;
    updateServiceWorker?: (reload?: boolean) => Promise<void>;
  } | undefined) ?? null;

  const show = computed(() => Boolean(pwa?.needRefresh?.value));

  async function applyUpdate() {
    if (!pwa?.updateServiceWorker)
      return;
    await pwa.updateServiceWorker(true);
  }

  return { show, applyUpdate };
}
