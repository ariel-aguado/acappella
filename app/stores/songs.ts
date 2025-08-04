import type { Song } from "~/lib/db/schema";

export const useSongStore = defineStore("useSongStore", () => {
  const { data, status, refresh } = useFetch("/api/songs", {
    lazy: true,
  });

  const isLoading = ref(true);
  const songs = ref<Song[]>([]);
  const songId = ref<number>(1);
  const currentSong = ref<Song>();
  const songsCount = computed(() => songs.value.length);

  function getSong(songId: number) {
    let song = null;
    const songIndex = songs.value.findIndex((s: any) => s.songId === songId);
    if (songIndex !== -1) {
      song = songs.value[songIndex];
    }
    return song;
  }

  watchEffect(async () => {
    if (data.value) {
      isLoading.value = false;
      songs.value = (data.value as any[]).map((s: any) => ({
        ...s,
        lyric: {
          ...s.lyric,
          data: {
            title: s.lyric?.data?.title ?? "",
            description: s.lyric?.data?.description ?? "",
            ...(s.lyric?.data ?? {}),
          },
        },
      }));
      currentSong.value = songs.value[0];
    }

    isLoading.value = status.value === "pending";
  });

  watch(() => songId.value, async (newSongId) => {
    if (newSongId) {
      const newSong = getSong(newSongId);

      if (newSong) {
        currentSong.value = newSong;
        await navigateTo(`/${newSongId}`);
      }
      else {
        currentSong.value = songs.value[0];
        await navigateTo("/");
      }
    }
    else {
      currentSong.value = undefined;
    }
  });

  return {
    songId,
    songs,
    currentSong,
    songsCount,
    isLoading,
    refresh,
    getSong,
  };
});
