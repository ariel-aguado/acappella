import type { Song, SongFromDB } from "~/lib/db/schema";

export async function transformSongs(songs: SongFromDB[]): Promise<Song[]> {
  const songsTransformed: Song[] = [];

  for (let index = 0; index < songs.length; index++) {
    const song = songs[index];
    const parsedSong = await parseMarkdown(song.lyric as string);
    songsTransformed.push({
      ...song,
      lyric: parsedSong,
    });
  }

  return songsTransformed;
}
