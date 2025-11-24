import type { FilteredSong, LyricLine, Song, SongFromDB } from "~~/lib/db/schema";

export const useSongStore = defineStore("useSongStore", () => {
  const isLoading = ref(false);
  const songs = useLocalStorage<Song[]>("songs", []);
  const filteredSongsByNumber = ref<FilteredSong[]>([]);
  const filteredSongsByTitle = ref<FilteredSong[]>([]);
  const filteredSongIdsByNumber = ref<number[]>([]);
  const filteredSongIdsByTitle = ref<string[]>([]);
  const favoriteSongs = useLocalStorage<number[]>("favoriteSongs", []);
  const songId = useLocalStorage<number>("songId", 1);
  const currentSong = useLocalStorage<Song>("currentSong", {} as Song);
  const searchHistory = useLocalStorage<string[]>("searchHistory", []);

  // Ensure songId is always a sane number (>=1). localStorage may contain null/"" or non-numeric values.
  function sanitizeSongId(val: any) {
    const n = Number(val);
    if (!Number.isFinite(n) || Number.isNaN(n))
      return 1;
    const i = Math.floor(n);
    return i >= 1 ? i : 1;
  }

  // Sanitize initial value read from localStorage
  try {
    songId.value = sanitizeSongId(songId.value as unknown as any);
  }
  catch {
    songId.value = 1;
  }

  // Watch and coerce any future assignments that are not numeric
  watch(
    () => songId.value,
    (v) => {
      const sane = sanitizeSongId(v as unknown as any);
      if (sane !== v)
        songId.value = sane;
    },
  );
  const songsData = ref<(SongFromDB & { lyricParsed: any; lyricLines: LyricLine[] })[]>([]);
  const songsCount = computed(() => songs.value.length);
  const currentTab = ref("byNumber");

  async function getSongs() {
    isLoading.value = true;
    const data: any = await loadSongsFromPublic();
    songsData.value = data;
    isLoading.value = false;
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

    // Ordenar y quitar duplicados
    const uniqueSorted = Array.from(new Set(ids)).sort((a, b) => a - b);
    const n = uniqueSorted.length;

    // Ajustar secciones al total de elementos disponibles
    const k = Math.min(sections, n);

    // Selección uniforme por posición, incluyendo primero y último
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

  function toggleFavorite(song: Song | FilteredSong) {
    // Use songId - 1 to get the correct index (songs are 1-indexed)
    const songIndex = song.songId - 1;

    if (songIndex >= 0 && songIndex < songs.value.length && songs.value[songIndex]) {
      // Toggle the favorite flag
      const newFavoriteState = !songs.value[songIndex].favorite;
      songs.value[songIndex].favorite = newFavoriteState;

      // Update favoriteSongs array in localStorage
      if (newFavoriteState) {
        // Add to favorites if not already there
        if (!favoriteSongs.value.includes(song.songId)) {
          favoriteSongs.value.push(song.songId);
        }
      }
      else {
        // Remove from favorites
        const favoriteIndex = favoriteSongs.value.indexOf(song.songId);
        if (favoriteIndex !== -1) {
          favoriteSongs.value.splice(favoriteIndex, 1);
        }
      }
    }
  }

  async function updateSongsData() {
    songs.value = [];
    await getSongs();
  }

  watch(() => songsData.value, (newData) => {
    if (newData) {
      // if (songs.value.length === 0) {
      songs.value = (songsData.value as any[]).map((s: any) => {
        const isFavorite = favoriteSongs.value.includes(s.songId);
        return {
          ...s,
          lyricParsed: {
            ...s.lyricParsed,
            data: {
              title: s.lyricParsed?.data?.title ?? "",
              description: s.lyricParsed?.data?.description ?? "",
              ...(s.lyricParsed?.data ?? {}),
            },
          },
          favorite: isFavorite,
          scrollTitle: s.scrollTitle,
        };
      });
      // }
      isLoading.value = false;
    }
  });

  return {
    songId,
    songs,
    filteredSongsByNumber,
    filteredSongsByTitle,
    filteredSongIdsByNumber,
    filteredSongIdsByTitle,
    favoriteSongs,
    currentSong,
    searchHistory,
    songsCount,
    isLoading,
    currentTab,
    getSongs,
    getSongById,
    navigateToSong,
    jumpToSong,
    generateAnchorsFromSongIds,
    generateAnchorFromInitials,
    toggleFavorite,
    updateSongsData,
  };
});
