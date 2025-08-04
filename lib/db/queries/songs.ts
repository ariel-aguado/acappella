import type { InsertSong } from "../schema";

import db from "..";
import { song } from "../schema";

export async function findSongs() {
  return db.query.song.findMany();
}

export async function insertSong(insertable: InsertSong) {
  const [created] = await db.insert(song).values({
    ...insertable,
  }).returning();
  return created;
}
