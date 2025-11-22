export function usePwaInstall() {
  const installPrompt = ref<any>(null);
  const canInstall = ref(false);

  const beforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    installPrompt.value = e;
    canInstall.value = true;
  };

  const installApp = async () => {
    if (!installPrompt.value)
      return;

    installPrompt.value.prompt();
    // const { outcome } = await installPrompt.value.userChoice;

    // if (outcome === "accepted") {
    //   console.log("App instalada");
    // }

    installPrompt.value = null;
    canInstall.value = false;
  };

  onMounted(() => {
    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);
  });

  onUnmounted(() => {
    window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
  });

  return {
    canInstall,
    installApp,
  };
}
