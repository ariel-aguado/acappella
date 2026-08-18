import type { FilteredSong, Song } from "~~/lib/types";

export const useSongStore = defineStore("useSongStore", () => {
  const songs = ref<Song[]>([]);
  const filteredSongsByNumber = ref<FilteredSong[]>([]);
  const filteredSongsByTitle = ref<FilteredSong[]>([]);
  const filteredSongIdsByNumber = ref<number[]>([]);
  const filteredSongIdsByTitle = ref<string[]>([]);

  const favoriteSongs = useLocalStorage<number[]>("favoriteSongs", []);
  const songId = useLocalStorage<number>("songId", 1);
  const searchHistory = useLocalStorage<string[]>("searchHistory", []);

  const { status: workerStatus, songs: workerSongs, setFavoriteIds } = useSongbookWorker();

  const songsCount = computed(() => songs.value.length);
  const currentSong = computed<Song | null>(() => songs.value[songId.value - 1] ?? null);
  const currentTab = ref("byNumber");

  function applyFavorites(parsedSongs: Song[]): Song[] {
    const favSet = new Set(favoriteSongs.value);
    return parsedSongs.map(s => ({ ...s, favorite: favSet.has(s.songId) }));
  }

  watch(
    workerSongs,
    (next) => {
      // Always adopt the worker's result, even when songs.value is already
      // populated — this is how a songbook switch (which replaces the worker's
      // cache) propagates to the UI.
      if (next && next.length > 0) {
        songs.value = applyFavorites(next);
      }
    },
    { immediate: true },
  );

  // When the song list changes (initial load OR songbook switch), clamp the
  // current songId so it stays within the new range. Different songbooks can
  // have different total counts, so an id that was valid before may be out of
  // range after a switch.
  watch(
    () => songs.value.length,
    (len) => {
      if (len > 0) {
        songs.value = applyFavorites(songs.value);
        if (songId.value > len)
          songId.value = len;
      }
    },
  );

  watch(
    () => favoriteSongs.value.length,
    () => {
      if (songs.value.length > 0) {
        songs.value = applyFavorites(songs.value);
      }
      // Keep the worker in sync so search results carry the correct
      // favorite flag and the favorites-only filter works.
      setFavoriteIds(favoriteSongs.value.slice());
    },
  );

  // Initial sync to worker (covers the case where favoriteSongs has values
  // persisted from a previous session, before this watcher fires).
  // Uses `immediate: true` because the worker plugin finishes initializing
  // BEFORE the store is constructed — so songs.length is already > 0 when
  // the watcher is created, and we need the watcher to fire right away.
  watch(
    () => songs.value.length,
    (len) => {
      if (len > 0) {
        setFavoriteIds(favoriteSongs.value.slice());
      }
    },
    { immediate: true },
  );

  // Re-sync favorites whenever workerStatus flips to "ready". This handles the
  // case where the worker is recreated (e.g., page reload) and needs the
  // current favorites re-applied before the first search runs.
  watch(
    () => workerStatus.value,
    (status) => {
      if (status === "ready") {
        setFavoriteIds(favoriteSongs.value.slice());
      }
    },
    { immediate: true },
  );

  function sanitizeSongId(val: any) {
    const n = Number(val);
    if (!Number.isFinite(n) || Number.isNaN(n))
      return 1;
    const i = Math.floor(n);
    return i >= 1 ? i : 1;
  }

  try {
    songId.value = sanitizeSongId(songId.value as unknown as any);
  }
  catch {
    songId.value = 1;
  }

  watch(
    () => songId.value,
    (v) => {
      const sane = sanitizeSongId(v as unknown as any);
      if (sane !== v)
        songId.value = sane;
    },
  );

  async function getSongs() {
    if (workerStatus.value === "ready")
      return;
    const { init, currentFile } = useSongbookWorker();
    await init(currentFile.value || undefined);
  }

  function getSongById(id: number) {
    return songs.value ? songs.value[id - 1] : songs.value[0];
  }

  async function navigateToSong(id: number) {
    songId.value = id;
    await navigateTo("/");
  }

  function jumpToSong(id: number | string) {
    const el = document.querySelector(`[data-song-index="${id}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  function generateAnchorsFromSongIds(
    ids: number[],
    sections = 15,
  ): number[] {
    if (!Array.isArray(ids) || ids.length === 0)
      return [];

    const uniqueSorted = Array.from(new Set(ids)).sort((a, b) => a - b);
    const n = uniqueSorted.length;
    const k = Math.min(sections, n);
    const step = (n - 1) / (k - 1);
    const anchors: number[] = [];

    for (let i = 0; i < k; i++) {
      const idx = Math.round(i * step);
      const id = uniqueSorted[idx] as number;
      if (anchors[anchors.length - 1] !== id) {
        anchors.push(id);
      }
    }

    return anchors;
  }

  function generateAnchorFromInitials(songs: string[]) {
    const initials = new Set();

    songs.forEach((title) => {
      if (!title)
        return;
      const firstChar = title.trim().charAt(0).toUpperCase();
      if (firstChar >= "A" && firstChar <= "Z") {
        initials.add(firstChar);
      }
    });

    return Array.from(initials).sort() as string[];
  }

  function applyFavoriteToFiltered(arr: FilteredSong[], songId: number, isFav: boolean): void {
    const idx = arr.findIndex(s => s.songId === songId);
    if (idx >= 0)
      arr[idx] = { ...arr[idx], favorite: isFav };
  }

  function toggleFavorite(song: Song | FilteredSong) {
    const songIndex = song.songId - 1;

    if (songIndex >= 0 && songIndex < songs.value.length && songs.value[songIndex]) {
      const newFavoriteState = !songs.value[songIndex].favorite;
      songs.value[songIndex] = { ...songs.value[songIndex], favorite: newFavoriteState };

      // Keep the search results in sync so the heart icon updates immediately
      // without waiting for a re-search.
      applyFavoriteToFiltered(filteredSongsByNumber.value, song.songId, newFavoriteState);
      applyFavoriteToFiltered(filteredSongsByTitle.value, song.songId, newFavoriteState);

      if (newFavoriteState) {
        if (!favoriteSongs.value.includes(song.songId)) {
          favoriteSongs.value.push(song.songId);
        }
      }
      else {
        const favoriteIndex = favoriteSongs.value.indexOf(song.songId);
        if (favoriteIndex !== -1) {
          favoriteSongs.value.splice(favoriteIndex, 1);
        }
      }
    }
  }

  async function updateSongsData() {
    const { refresh } = useSongbookWorker();
    songs.value = [];
    await refresh();
  }

  return {
    songId,
    songs,
    filteredSongsByNumber,
    filteredSongsByTitle,
    filteredSongIdsByNumber,
    filteredSongIdsByTitle,
    favoriteSongs,
    searchHistory,
    songsCount,
    currentTab,
    currentSong,
    getSongs,
    getSongById,
    navigateToSong,
    jumpToSong,
    generateAnchorsFromSongIds,
    generateAnchorFromInitials,
    toggleFavorite,
    updateSongsData,
    setFavoriteIds,
  };
});
