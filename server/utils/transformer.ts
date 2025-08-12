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
    const lines = content.split("\n");
    let inChorus = false;

    const parsedLines = lines.reduce((result: LyricLine[], line) => {
      const trimmedLine = line.trim();

      // Handle CORO label (keep but remove asterisks)
      if (trimmedLine.startsWith("**CORO:")) {
        inChorus = true;
        // Remove both leading and trailing asterisks from CORO label
        const coroLabel = trimmedLine.replace(/^\*\*CORO:\s*\*?$/, "CORO:");
        result.push({ line: coroLabel });
        return result;
      }

      // Skip other excluded lines
      if (
        (line.startsWith("(") && line.endsWith(")"))
        || /^\*\d+\*$/.test(trimmedLine)
        || trimmedLine === ""
      ) {
        return result;
      }

      // Process chorus lines (remove trailing asterisks)
      let processedLine = trimmedLine;
      if (inChorus) {
        processedLine = processedLine.replace(/\*+$/, "");

        // Check for end of chorus (line that had trailing asterisks)
        if (line.trim().endsWith("**")) {
          inChorus = false;
        }
      }

      if (processedLine) {
        result.push({ line: processedLine });
      }

      return result;
    }, []);

    resolve(parsedLines);
  });
}
