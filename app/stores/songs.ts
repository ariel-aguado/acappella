import type { Song } from "~~/lib/db/schema";

export const useSongStore = defineStore("useSongStore", () => {
  const isLoading = ref(false);
  const songs = useLocalStorage<Song[]>("songs", []);
  const songId = useLocalStorage<number>("songId", 1);
  const currentSong = useLocalStorage<Song>("currentSong", {} as Song);
  const searchHistory = useLocalStorage<string[]>("searchHistory", []);
  const songData = ref<Song[]>([]);
  const songsCount = computed(() => songs.value.length);

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
        }));
      }
    }
  });

  return {
    songId,
    songs,
    currentSong,
    searchHistory,
    songsCount,
    isLoading,
    getSong,
  };
});
