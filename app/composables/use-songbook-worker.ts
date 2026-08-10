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
  worker: ShallowRef<Comlink.Remote<SongbookWorkerApi> | null>;
  init: () => Promise<void>;
  getById: (id: number) => Promise<Song | undefined>;
  refresh: () => Promise<void>;
  search: (
    query: string,
    options: SearchOptions,
  ) => Promise<FilteredSong[] | FullSearchResult[]>;
  setFavoriteIds: (ids: number[]) => void;
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
  const worker = shallowRef<Comlink.Remote<SongbookWorkerApi> | null>(_worker);

  const init = async () => {
    if (status.value === "ready")
      return;
    if (_initPromise)
      return _initPromise;

    _initPromise = (async () => {
      status.value = "loading";
      try {
        const w = buildWorker();
        worker.value = w;
        const parsed = await w.loadAndParse();
        songs.value = parsed;
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

  const refresh = async () => {
    _initPromise = null;
    status.value = "idle";
    songs.value = [];
    await init();
  };

  const search = async (query: string, options: SearchOptions) => {
    const w = worker.value ?? buildWorker();
    if (status.value !== "ready") {
      await w.loadAndParse();
    }
    // Always sync favorites before searching so the worker's internal cache
    // matches the main-thread store (avoids race conditions on page reload).
    w.setFavoriteIds(options.favoriteIds ?? []);
    const opts: SearchOptions = { mode: "byTitle" as SearchMode, ...options };
    return w.search(query, opts);
  };

  const setFavoriteIds = (ids: number[]) => {
    const w = worker.value ?? _worker;
    // Cloning is critical: Vue's reactive arrays are Proxies and Proxies are
    // NOT structured-cloneable, so `postMessage` would throw DataCloneError.
    const safe = Array.isArray(ids) ? ids.slice() : [];
    if (w)
      w.setFavoriteIds(safe);
  };

  return { status, songs, error, worker, init, getById, refresh, search, setFavoriteIds };
}
