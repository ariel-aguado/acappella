import type { FilteredSong, Song } from "~~/lib/db/schema";

export const useSongStore = defineStore("useSongStore", () => {
  const isLoading = ref(false);
  const songs = useLocalStorage<Song[]>("songs", []);
  const filteredSongsByNumber = ref<FilteredSong[]>([]);
  const filteredSongsByTitle = ref<FilteredSong[]>([]);
  const filteredSongIdsByNumber = ref<number[]>([]);
  const filteredSongIdsByTitle = ref<string[]>([]);
  const filteredSongIdsByFavorite = ref<string[]>([]);
  const songId = useLocalStorage<number>("songId", 1);
  const currentSong = useLocalStorage<Song>("currentSong", {} as Song);
  const searchHistory = useLocalStorage<string[]>("searchHistory", []);
  const songData = ref<Song[]>([]);
  const songsCount = computed(() => songs.value.length);
  const currentTab = ref("byNumber");

  if (songs.value.length === 0) {
    getSongs();
  }

  async function getSongs() {
    isLoading.value = true;
    const data = await $fetch("/api/songs");
    songData.value = data;
    isLoading.value = false;
  }

  function getSong(songId: number) {
    let song = null;
    const songIndex = songs.value.findIndex((s: any) => s.songId === songId);
    if (songIndex !== -1) {
      song = songs.value[songIndex];
    }
    return song;
  }

  function navigateToSong(id: number) {
    songId.value = id;
    navigateTo("/");
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
    // song.favorite = !song.favorite;

    const songIndex = songs.value.findIndex((s: any) => s.songId === song.songId);
    if (songIndex !== -1 && songs.value[songIndex]) {
      songs.value[songIndex].favorite = !songs.value[songIndex].favorite;
    }
  }

  async function updateSongsData() {
    songs.value = [];
    await getSongs();
  }

  watch(() => songData.value, (newData) => {
    if (newData) {
      isLoading.value = false;
      if (songs.value.length === 0) {
        songs.value = (songData.value as any[]).map((s: any) => ({
          ...s,
          lyricParsed: {
            ...s.lyricParsed,
            data: {
              title: s.lyricParsed?.data?.title ?? "",
              description: s.lyricParsed?.data?.description ?? "",
              ...(s.lyricParsed?.data ?? {}),
            },
          },
          favorite: false,
        }));
      }
    }
  });

  return {
    songId,
    songs,
    filteredSongsByNumber,
    filteredSongsByTitle,
    filteredSongIdsByNumber,
    filteredSongIdsByTitle,
    filteredSongIdsByFavorite,
    currentSong,
    searchHistory,
    songsCount,
    isLoading,
    currentTab,
    getSong,
    navigateToSong,
    jumpToSong,
    generateAnchorsFromSongIds,
    generateAnchorFromInitials,
    toggleFavorite,
    updateSongsData,
  };
});
