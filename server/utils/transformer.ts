// import type { Song, SongFromDB } from "~/lib/db/schema";

import type { LyricLine, Song, SongFromDB } from "~~/lib/db/schema";

export async function transformSongs(songs: SongFromDB[]): Promise<Song[]> {
  const songsTransformed: Song[] = [];

  for (let index = 0; index < songs.length; index++) {
    const song = songs[index];
    const parsedSong = await parseMarkdown(song.lyric as string);
    const lyricLines = await lyricToLines(song.lyric as string);
    songsTransformed.push({
      ...song,
      lyricParsed: parsedSong,
      lyricLines,
    });
  }

  return songsTransformed;
}

function lyricToLines(content: string): Promise<LyricLine[]> {
  return new Promise((resolve) => {
    // Split the content into lines
    const lines = content.split("\n");

    // Process lines according to the conditions
    const parsedLines = lines.reduce((result: LyricLine[], line) => {
      // Skip lines that match any of the exclusion criteria
      if (
        (line.startsWith("(") && line.endsWith(")")) // First line with references
        || /^\*\d+\*$/.test(line.trim()) // Number dividing lines
        || line.trim().startsWith("**CORO:") // CORO label
        || line.trim() === "" // Empty lines
      ) {
        return result;
      }

      // Add the line as an object to the result array
      result.push({ line: line.trim() });
      return result;
    }, []);

    resolve(parsedLines);
  });
}
