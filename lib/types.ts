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
 * Full-text search result item — includes the lines that matched.
 */
export type FullSearchResult = {
  songId: number;
  title: string;
  firstLine: string;
  favorite: boolean;
  matchedLines: Array<{ line: string }>;
};

/**
 * Search mode for the worker search API.
 *  - "byNumber" / "byTitle": match songs against title (title-only fuzzy search)
 *  - "full":                 match across title + lyric, return top results with matched lines
 */
export type SearchMode = "byNumber" | "byTitle" | "full";

/**
 * Options for worker.search()
 */
export type SearchOptions = {
  mode: SearchMode;
  favoritesOnly?: boolean;
  /** IDs of songs the user has favorited — used to set the `favorite` flag on results. */
  favoriteIds?: number[];
  limit?: number;
};

/**
 * Data for inserting a new song (omits auto-generated fields)
 */
export type InsertSong = {
  songId: number;
  title: string;
  lyric: string;
};
