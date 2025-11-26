/**
 * Represents a single line in a song's lyrics
 */
export type LyricLine = {
  line: string;
};

/**
 * Parsed lyric content with metadata
 */
export type ParsedLyric = {
  body: string;
  data: {
    title: string;
    description?: string;
    [key: string]: any;
  };
};

/**
 * Base song data structure
 */
export type SongData = {
  id: number;
  songId: number;
  title: string;
  lyric: string;
  createdAt: number;
};

/**
 * Extended song with parsed markdown and UI state
 */
export type Song = SongData & {
  lyricParsed: ParsedLyric;
  lyricLines: LyricLine[];
  favorite: boolean;
  scrollTitle: boolean;
};

/**
 * Filtered/simplified song for search results and lists
 */
export type FilteredSong = {
  songId: number;
  title: string;
  firstLine: string;
  favorite: boolean;
};

/**
 * Data for inserting a new song (omits auto-generated fields)
 */
export type InsertSong = {
  songId: number;
  title: string;
  lyric: string;
};
