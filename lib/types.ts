import type { MDCParserResult } from "@nuxtjs/mdc";

/**
 * Represents a single line in a song's lyrics
 */
export type LyricLine = {
  line: string;
};

/**
 * Base song data structure from database/storage
 */
export type SongFromDB = {
  id: number;
  songId: number;
  title: string;
  lyric: string;
  createdAt: number;
};

/**
 * Extended song with parsed markdown and UI state
 */
export type Song = SongFromDB & {
  lyricParsed: MDCParserResult;
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
