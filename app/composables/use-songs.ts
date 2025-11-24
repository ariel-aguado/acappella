import type { LyricLine, SongFromDB } from "~~/lib/db/schema";

import { marked } from "marked";

/**
 * Split the big songbook text into individual song blocks and extract id/title/raw lyric
 */
function parseSongbook(text: string): SongFromDB[] {
  return text
    .split(/(?=^\d+\.\s*[^\n]*)/m)
    .map((block) => {
      const lines = block.split(/\r?\n/);
      const first = (lines[0] || "").trim();
      const num = first.match(/^\d+/);
      if (!num)
        return null;
      const songId = Number.parseInt(num[0], 10);
      const title = first.replace(/^\d+\.?\s*/, "").trim();
      const lyric = lines.slice(1).join("\n").trim();
      return { id: songId, songId, title, lyric, createdAt: Date.now() } as unknown as SongFromDB;
    })
    .filter(Boolean) as SongFromDB[];
}

function isChorusLine(line: string) {
  return /^\s*cor?o:?\s*$/i.test(line.trim());
}

/**
 * Format marks stanzas, numbers, and handles CORO
 */
function formatSongContent(content: string): string {
  const lines = content.split(/\r?\n/) as string[];
  const out: string[] = [];
  let stanzaIdx = 1;
  let inChorus = false;
  let chorusBuffer: string[] = [];
  let stanzaBuffer: string[] = [];
  let firstBlock = true;

  const flushStanza = () => {
    if (stanzaBuffer.length === 0)
      return;
    const isCitation = stanzaBuffer.length === 1 && /^\([^)]+\)\s*$/.test(stanzaBuffer[0] ?? "");
    if (!firstBlock)
      out.push("");
    if (!isCitation) {
      out.push(`*${stanzaIdx}*  `);
      stanzaIdx++;
      out.push("");
    }
    stanzaBuffer.forEach(l => out.push(`${l}  `));
    stanzaBuffer = [];
    firstBlock = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (isChorusLine(trimmed)) {
      flushStanza();
      if (chorusBuffer.length > 0) {
        out.push(...chorusBuffer);
        chorusBuffer = [];
      }
      inChorus = true;
      if (!firstBlock)
        out.push("");
      out.push("**CORO:  ");
      continue;
    }

    if (inChorus) {
      if (trimmed === "" || i === lines.length - 1) {
        if (trimmed !== "")
          chorusBuffer.push(`${line}  `);
        if (chorusBuffer.length > 0) {
          if (chorusBuffer.length > 1)
            out.push(...chorusBuffer.slice(0, -1));
          let last = chorusBuffer[chorusBuffer.length - 1] ?? "";
          if (last.endsWith("  "))
            last = `${last.slice(0, -2)}**  `;
          else last = `${last}**`;
          out.push(last);
          chorusBuffer = [];
        }
        inChorus = false;
        if (trimmed === "" && i < lines.length - 1)
          out.push("");
      }
      else {
        chorusBuffer.push(`${line}  `);
      }
      continue;
    }

    if (trimmed === "") {
      flushStanza();
      if (!firstBlock && i < lines.length - 1)
        out.push("");
      continue;
    }

    stanzaBuffer.push(line);
  }

  flushStanza();

  if (chorusBuffer.length > 0) {
    if (chorusBuffer.length > 1)
      out.push(...chorusBuffer.slice(0, -1));
    let last = chorusBuffer[chorusBuffer.length - 1] ?? "";
    if (last.endsWith("  "))
      last = `${last.slice(0, -2)}**  `;
    else last = `${last}**`;
    out.push(last);
  }

  return out.join("\n");
}

/**
 * Convert formatted lyric string into array of LyricLine objects used by the UI
 */
function lyricToLines(content: string): LyricLine[] {
  const lines = content.split("\n");
  let inChorus = false;
  const parsed: LyricLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine ?? "";
    const trimmed = line.trim();

    if (trimmed.startsWith("**CORO:")) {
      inChorus = true;
      const coroLabel = trimmed.replace(/^\*\*CORO:\s*\*?$/, "CORO:");
      parsed.push({ line: coroLabel });
      continue;
    }

    if ((line.startsWith("(") && line.endsWith(")")) || /^\*\d+\*$/.test(trimmed) || trimmed === "") {
      continue;
    }

    let processed = trimmed;
    if (inChorus) {
      processed = processed.replace(/\*+$/, "");
      if (line.trim().endsWith("**"))
        inChorus = false;
    }

    if (processed)
      parsed.push({ line: processed });
  }

  return parsed;
}

/**
 * Load songs from `public/songs/songbook.txt`, parse + format, save into localStorage
 */
export async function loadSongsFromPublic(): Promise<(SongFromDB & { lyricParsed: any; lyricLines: LyricLine[] })[]> {
  try {
    const res = await fetch("/songs/songbook.txt");
    if (!res.ok)
      throw new Error("Failed to fetch songbook");
    const txt = await res.text();

    const parsed = parseSongbook(txt);

    const songs = parsed.map((s) => {
      const formatted = formatSongContent(s.lyric || "");
      const html = marked.parse(formatted || s.lyric || "");
      const lyricParsed = { body: html, data: { title: s.title } };
      const lyricLines = lyricToLines(formatted || s.lyric || "");

      return {
        id: s.songId,
        songId: s.songId,
        title: s.title,
        lyric: formatted,
        createdAt: Date.now(),
        lyricParsed,
        lyricLines,
        scrollTitle: false,
      } as unknown as SongFromDB & { lyricParsed: any; lyricLines: LyricLine[]; scrollTitle: boolean };
    });

    return songs;
  }
  catch (err) {
    console.error("Error loading songs from public:", err);
    return [] as any;
  }
}
