import * as Comlink from "comlink";

import type { SongbookWorkerApi } from "~/workers/songbook.worker";
import type {
  FilteredSong,
  FullSearchResult,
  SearchMode,
  SearchOptions,
  Song,
} from "~~/lib/types";

export type WorkerStatus = "idle" | "loading" | "ready" | "error";

type UseSongbookWorkerReturn = {
  status: Ref<WorkerStatus>;
  songs: Ref<Song[]>;
  error: Ref<unknown>;
  currentFile: Ref<string>;
  worker: ShallowRef<Comlink.Remote<SongbookWorkerApi> | null>;
  init: (file?: string) => Promise<void>;
  getById: (id: number) => Promise<Song | undefined>;
  refresh: (file?: string) => Promise<void>;
  search: (
    query: string,
    options: SearchOptions,
  ) => Promise<FilteredSong[] | FullSearchResult[]>;
  setFavoriteIds: (ids: number[]) => void;
  // True while a worker search is in flight. Distinguishes "loading" from
  // "no results" in the search page so we don't flash the empty state.
  isSearching: Ref<boolean>;
};

let _worker: Comlink.Remote<SongbookWorkerApi> | null = null;
let _initPromise: Promise<void> | null = null;

function buildWorker(): Comlink.Remote<SongbookWorkerApi> {
  if (_worker)
    return _worker;
  const w = new Worker(new URL("~/workers/songbook.worker.ts", import.meta.url), { type: "module" });
  _worker = Comlink.wrap<SongbookWorkerApi>(w);
  return _worker;
}

export function useSongbookWorker(): UseSongbookWorkerReturn {
  const status = useState<WorkerStatus>("songbook-worker-status", () => "idle");
  const songs = useState<Song[]>("songbook-songs", () => []);
  const error = useState<unknown>("songbook-worker-error", () => null);
  const currentFile = useState<string>("songbook-current-file", () => "");
  const worker = shallowRef<Comlink.Remote<SongbookWorkerApi> | null>(_worker);
  const isSearching = ref(false);

  const init = async (file?: string) => {
    const target = file ?? currentFile.value;
    // No file to load — first run before the user picked a songbook.
    if (!target)
      return;

    if (status.value === "ready" && currentFile.value === target)
      return;

    if (_initPromise && currentFile.value === target && status.value === "loading")
      return _initPromise;

    _initPromise = (async () => {
      status.value = "loading";
      songs.value = [];
      try {
        const w = buildWorker();
        worker.value = w;
        const parsed = await w.loadAndParse(target);
        songs.value = parsed;
        currentFile.value = target;
        status.value = "ready";
      }
      catch (err) {
        console.error("[songbook-worker] init failed:", err);
        error.value = err;
        status.value = "error";
      }
    })();

    return _initPromise;
  };

  const getById = async (id: number) => {
    const w = worker.value ?? buildWorker();
    return w.getById(id);
  };

  const refresh = async (file?: string) => {
    const target = file ?? currentFile.value;
    _initPromise = null;
    // Skip the transient "idle" state so the boot loader (which renders for
    // "loading" | "error") doesn't flash off between songbook switches.
    status.value = "loading";
    songs.value = [];
    currentFile.value = target;
    await init(target);
  };

  const search = async (query: string, options: SearchOptions) => {
    const w = worker.value ?? buildWorker();
    // If the worker isn't loaded yet but we know the current file, load it
    // first. This is a safety net for the rare case a search runs before the
    // init plugin finishes (e.g., the search page mounts first).
    if (status.value !== "ready" && currentFile.value) {
      await init(currentFile.value);
    }
    // Always sync favorites before searching so the worker's internal cache
    // matches the main-thread store (avoids race conditions on page reload).
    w.setFavoriteIds(options.favoriteIds ?? []);
    const opts: SearchOptions = { mode: "byTitle" as SearchMode, ...options };
    isSearching.value = true;
    try {
      return await w.search(query, opts);
    }
    finally {
      isSearching.value = false;
    }
  };

  const setFavoriteIds = (ids: number[]) => {
    const w = worker.value ?? _worker;
    // Cloning is critical: Vue's reactive arrays are Proxies and Proxies are
    // NOT structured-cloneable, so `postMessage` would throw DataCloneError.
    const safe = Array.isArray(ids) ? ids.slice() : [];
    if (w)
      w.setFavoriteIds(safe);
  };

  return {
    status,
    songs,
    error,
    currentFile,
    worker,
    init,
    getById,
    refresh,
    search,
    setFavoriteIds,
    isSearching,
  };
}
