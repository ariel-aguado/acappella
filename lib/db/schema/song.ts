import type { MDCParserResult } from "@nuxtjs/mdc";
import type { InferSelectModel } from "drizzle-orm";
import type z from "zod";

import { int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

export const song = sqliteTable("song", {
  id: int("id").primaryKey({ autoIncrement: true }),
  songId: int("song_id").notNull().unique(),
  title: text("title").notNull(),
  lyric: text("lyric").notNull(),
  createdAt: int().notNull().$default(() => Date.now()),
}, t => [
  unique().on(t.songId, t.title),
]);

export const InsertSong = createInsertSchema(song, {
  songId: field => field.min(1).max(100),
  title: field => field.max(100),
  lyric: field => field.max(1000),
}).omit({
  id: true,
  createdAt: true,
});

export type SongFromDB = InferSelectModel<typeof song>;
export type Song = Omit<SongFromDB, "lyric"> & {
  lyric: MDCParserResult;
};
export type InsertSong = z.infer<typeof InsertSong>;
