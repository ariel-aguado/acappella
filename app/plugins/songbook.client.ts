export default defineNuxtPlugin({
  name: "songbook-worker",
  parallel: false,
  async setup() {
    if (import.meta.server)
      return;

    const songbookStore = useSongbookStore();
    const { init } = useSongbookWorker();

    // 1. Load the manifest so the UI knows which songbooks exist.
    try {
      await songbookStore.loadManifest();
    }
    catch (err) {
      console.error("[songbook-plugin] failed to load manifest:", err);
      // Surface the error through the worker status so the boot loader
      // can render an appropriate message.
      const { error } = useSongbookWorker();
      error.value = err;
      return;
    }

    // 2. If the user already picked a songbook on a previous visit, init the
    //    worker with it. Otherwise, leave the worker idle so the first-run
    //    picker can take over.
    if (songbookStore.currentFile) {
      await init(songbookStore.currentFile);
    }
  },
});
