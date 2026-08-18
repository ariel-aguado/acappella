import type { Songbook } from "~~/lib/types";

const MANIFEST_URL = "/songs/manifest.json";

/**
 * Manages the list of available songbooks and the currently selected one.
 *
 * - `manifest` is loaded from `/songs/manifest.json` (auto-generated at build
 *   time from `public/songs/songbook*.txt`).
 * - `currentId` is persisted in localStorage per device — each congregation
 *   picks their preferred songbook on first run and the choice sticks.
 * - `select(id)` persists the choice and asks the worker to load it.
 */
export const useSongbookStore = defineStore("songbook", () => {
  const manifest = ref<Songbook[]>([]);
  const manifestLoaded = ref(false);
  const currentId = useLocalStorage<string>("songbookId", "");

  const currentSongbook = computed<Songbook | null>(
    () => manifest.value.find(s => s.id === currentId.value) ?? null,
  );

  /** Returns the absolute path used to fetch the songbook file. */
  function fileUrl(file: string) {
    return `/songs/${file}`;
  }

  /** Path of the currently selected songbook file (empty if none). */
  const currentFile = computed<string>(
    () => (currentSongbook.value ? fileUrl(currentSongbook.value.file) : ""),
  );

  async function loadManifest() {
    if (manifestLoaded.value)
      return;
    const res = await fetch(MANIFEST_URL);
    if (!res.ok)
      throw new Error(`Failed to load songbook manifest: ${res.status}`);
    const data = (await res.json()) as Songbook[];
    if (!Array.isArray(data))
      throw new Error("Songbook manifest must be an array");
    manifest.value = data;
    manifestLoaded.value = true;
  }

  /**
   * Select a songbook. Persists the choice and asks the worker to (re)load.
   * If the new id matches the current one, the worker call is skipped.
   */
  async function selectSongbook(id: string) {
    if (!manifest.value.length)
      await loadManifest();
    const meta = manifest.value.find(s => s.id === id);
    if (!meta)
      throw new Error(`Unknown songbook id: ${id}`);
    const target = fileUrl(meta.file);
    currentId.value = id;
    const { refresh } = useSongbookWorker();
    await refresh(target);
  }

  /** Clear selection (used in tests / settings flows). */
  function clearSelection() {
    currentId.value = "";
  }

  return {
    manifest,
    manifestLoaded,
    currentId,
    currentSongbook,
    currentFile,
    loadManifest,
    selectSongbook,
    clearSelection,
  };
});
