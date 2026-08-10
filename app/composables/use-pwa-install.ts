import type { Ref } from "vue";

type PwaOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: PwaOutcome }>;
  platforms: string[];
} & Event;

/**
 * PWA install prompt controller.
 *
 * Listens to `beforeinstallprompt` directly instead of relying on the
 * `@vite-pwa/nuxt` plugin's `provide("pwa", ...)`. The plugin uses
 * `provide` with `parallel: true`, so by the time our `setup()` runs the
 * provide may not be registered yet — `inject("pwa")` returns null.
 *
 * The browser's `beforeinstallprompt` event is dispatched only ONCE per
 * installability check, so we capture it and store it for later use.
 *
 * Dismiss is in-memory only — we do NOT call `event.preventDefault()` on
 * subsequent firings because we want the browser to re-check installability
 * on every page load.
 */
export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const isInstalled = ref(false);
  const dismissed = ref(false);

  function onBeforeInstallPrompt(e: Event) {
    e.preventDefault();
    deferredPrompt.value = e as BeforeInstallPromptEvent;
  }

  function onAppInstalled() {
    isInstalled.value = true;
  }

  if (import.meta.client) {
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // Detect already-installed PWA via display-mode media query
    if (window.matchMedia("(display-mode: standalone)").matches) {
      isInstalled.value = true;
    }
  }

  onScopeDispose(() => {
    if (import.meta.client) {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    }
  });

  const showBanner = computed(() =>
    deferredPrompt.value !== null
    && !dismissed.value
    && !isInstalled.value,
  );

  async function install() {
    const promptEvent = deferredPrompt.value;
    if (!promptEvent)
      return;
    deferredPrompt.value = null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === "dismissed") {
      // User dismissed the native prompt — leave banner hidden for this page
      dismissed.value = true;
    }
  }

  function dismiss() {
    dismissed.value = true;
  }

  return {
    showBanner,
    install,
    dismiss,
    isInstalled: isInstalled as Readonly<Ref<boolean>>,
  };
}
