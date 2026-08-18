import * as Comlink from "comlink";
import Fuse from "fuse.js";
import { marked } from "marked";

/// <reference lib="webworker" />
import type {
  FilteredSong,
  FullSearchResult,
  LyricLine,
  ParsedLyric,
  SearchOptions,
  Song,
} from "~~/lib/types";

import { formatSongContent, lyricToLines, parseSongbook } from "~/utils/songbook-parser";

function deriveFirstLine(song: Song): string {
  const lines = song.lyricLines;
  if (!Array.isArray(lines) || lines.length === 0)
    return "";
  if (lines.length > 1 && lines[0]?.line?.startsWith("(")) {
    return lines[1]?.line ?? "";
  }
  return lines[0]?.line ?? "";
}

function toFilteredSong(song: Song, isFavorite: boolean): FilteredSong {
  return {
    songId: song.songId,
    title: song.title,
    firstLine: deriveFirstLine(song),
    favorite: isFavorite,
  };
}

const FUSE_OPTIONS = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.0,
  ignoreLocation: true,
  ignoreDiacritics: true,
  minMatchCharLength: 1,
};

function buildTitleIndex(songs: Song[]): Fuse<Song> {
  return new Fuse(songs, {
    keys: [{ name: "title", weight: 2 }],
    ...FUSE_OPTIONS,
  });
}

function buildFullIndex(songs: Song[]): Fuse<Song> {
  return new Fuse(songs, {
    keys: [
      { name: "title", weight: 2 },
      { name: "lyric", weight: 1 },
    ],
    ...FUSE_OPTIONS,
  });
}

function searchLyricLines(lines: LyricLine[], query: string): Array<{ line: string }> {
  if (!Array.isArray(lines) || lines.length === 0 || !query.trim())
    return [];
  const fuse = new Fuse(lines, {
    keys: [{ name: "line", weight: 1 }],
    ...FUSE_OPTIONS,
  });
  return fuse.search(query).map(r => ({ line: r.item.line }));
}

// Module-scoped favoriteIds — synced from the store via setFavoriteIds()
let favoriteIds: Set<number> = new Set();

const api = {
  ready: false,
  cache: null as Song[] | null,
  titleIndex: null as Fuse<Song> | null,
  fullIndex: null as Fuse<Song> | null,
  /** Absolute path of the currently-loaded songbook file (e.g. `/songs/songbook-montevideo.txt`). */
  currentFile: null as string | null,

  /**
   * Sync the user's favorite IDs from the store so search results can carry
   * the correct `favorite` flag and the favorites-only filter works.
   */
  setFavoriteIds(ids: number[]): void {
    favoriteIds = new Set(ids ?? []);
  },

  /**
   * Diagnostic: returns the current favoriteIds count. Used by validation
   * scripts to verify sync between the store and the worker.
   */
  getFavoriteIdsCount(): number {
    return favoriteIds.size;
  },

  async loadAndParse(file: string): Promise<Song[]> {
    // Already loaded this exact songbook — return the cached result.
    if (this.cache && this.currentFile === file) {
      this.ready = true;
      return this.cache;
    }
    const res = await fetch(file);
    if (!res.ok)
      throw new Error(`Failed to fetch songbook: ${file}`);
    const txt = await res.text();

    const parsed = parseSongbook(txt);

    const songs: Song[] = parsed.map((s) => {
      const formatted = formatSongContent(s.lyric || "");
      const html = marked.parse(formatted || s.lyric || "");
      const lyricParsed: ParsedLyric = { body: html, data: { title: s.title } };
      const lyricLines: LyricLine[] = lyricToLines(formatted || s.lyric || "");

      return {
        id: s.songId,
        songId: s.songId,
        title: s.title,
        lyric: formatted,
        createdAt: Date.now(),
        lyricParsed,
        lyricLines,
        favorite: false,
        scrollTitle: false,
      } as Song;
    });

    this.cache = songs;
    this.titleIndex = buildTitleIndex(songs);
    this.fullIndex = buildFullIndex(songs);
    this.currentFile = file;
    this.ready = true;
    return songs;
  },

  search(query: string, options: SearchOptions): FilteredSong[] | FullSearchResult[] {
    if (!this.cache || !this.currentFile) {
      return [];
    }
    const trimmed = query.trim();
    const limit = options.limit ?? 50;
    const favoritesOnly = options.favoritesOnly === true;
    // Per-call favorite IDs override the module-scoped cache. This avoids any
    // sync timing issues between the main-thread store and the worker.
    const favSet = new Set(options.favoriteIds ?? favoriteIds);

    if (trimmed === "") {
      const base = favoritesOnly
        ? this.cache.filter(s => favSet.has(s.songId))
        : this.cache;
      return base.slice(0, limit).map(s => toFilteredSong(s, favSet.has(s.songId)));
    }

    if (options.mode === "full") {
      if (!this.fullIndex)
        return [];
      const matches = this.fullIndex.search(trimmed);
      const out: FullSearchResult[] = [];
      const seen = new Set<number>();
      for (const m of matches) {
        if (out.length >= limit)
          break;
        if (favoritesOnly && !favSet.has(m.item.songId))
          continue;
        if (seen.has(m.item.songId))
          continue;
        seen.add(m.item.songId);
        out.push({
          songId: m.item.songId,
          title: m.item.title,
          firstLine: deriveFirstLine(m.item),
          favorite: favSet.has(m.item.songId),
          matchedLines: searchLyricLines(m.item.lyricLines, trimmed),
        });
      }
      return out;
    }

    // byNumber | byTitle — fuzzy match against title; the page decides the sort order.
    if (!this.titleIndex)
      return [];
    const matches = this.titleIndex.search(trimmed);
    const out: FilteredSong[] = [];
    const seen = new Set<number>();
    for (const m of matches) {
      if (out.length >= limit)
        break;
      if (favoritesOnly && !favSet.has(m.item.songId))
        continue;
      if (seen.has(m.item.songId))
        continue;
      seen.add(m.item.songId);
      out.push(toFilteredSong(m.item, favSet.has(m.item.songId)));
    }
    return out;
  },

  getById(id: number): Song | undefined {
    return this.cache?.[id - 1];
  },

  count(): number {
    return this.cache?.length ?? 0;
  },

  isReady(): boolean {
    return this.ready;
  },
};

export type SongbookWorkerApi = typeof api;

Comlink.expose(api);
