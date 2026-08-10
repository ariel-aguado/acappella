export default defineNuxtPlugin({
  name: "songbook-worker",
  parallel: false,
  async setup() {
    if (import.meta.server)
      return;
    const { init } = useSongbookWorker();
    await init();
  },
});
