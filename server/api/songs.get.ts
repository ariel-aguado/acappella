import { findSongs } from "../../lib/db/queries/songs";
import { transformSongs } from "../utils/transformer";

export default defineEventHandler(async () => {
  const songsFromDb = await findSongs();
  const songsTransformed = await transformSongs(songsFromDb);

  return songsTransformed;
});
