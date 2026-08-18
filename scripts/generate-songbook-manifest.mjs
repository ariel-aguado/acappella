#!/usr/bin/env node
// Auto-generate `public/songs/manifest.json` from `public/songs/songbook*.txt`.
//
// Naming convention:
//   songbook[-<suffix>].txt   →  id: "songbook[-<suffix>]", name: "<Suffix capitalized>"
//
// Examples:
//   songbook-montevideo.txt   →  { id: "songbook-montevideo", name: "Montevideo" }
//   songbook-chile.txt        →  { id: "songbook-chile",      name: "Chile" }
//   songbook.txt              →  { id: "songbook",            name: "Songbook" }
//
// Run automatically via `prebuild` and `predev` npm scripts. Manual run:
//   node scripts/generate-songbook-manifest.mjs

import { readdir, writeFile, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const SONGS_DIR = path.resolve(process.cwd(), "public/songs")
const MANIFEST_PATH = path.join(SONGS_DIR, "manifest.json")
const PATTERN = /^songbook(-.+)?\.txt$/i

function deriveNameFromFilename(filename) {
  const base = filename.replace(/\.txt$/i, "")
  const suffix = base.replace(/^songbook-/i, "")
  if (!suffix)
    return "Songbook"
  // Capitalize first letter, keep rest as-is (suffixes are usually single words
  // like "montevideo" or "chile"; if a multi-word suffix is ever needed, the
  // user can edit the manifest directly).
  return suffix.charAt(0).toUpperCase() + suffix.slice(1)
}

function deriveIdFromFilename(filename) {
  return filename.replace(/\.txt$/i, "")
}

async function main() {
  if (!existsSync(SONGS_DIR)) {
    console.error(`[songbook-manifest] songs directory not found: ${SONGS_DIR}`)
    process.exit(1)
  }

  const entries = await readdir(SONGS_DIR)
  const songbooks = entries
    .filter(name => PATTERN.test(name))
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => {
      const id = deriveIdFromFilename(filename)
      const name = deriveNameFromFilename(filename)
      return { id, name, file: filename }
    })

  if (songbooks.length === 0) {
    console.error("[songbook-manifest] no songbook*.txt files found in public/songs/")
    process.exit(1)
  }

  // Idempotent: skip write if manifest is unchanged to avoid noisy diffs.
  let next = JSON.stringify(songbooks, null, 2) + "\n"
  if (existsSync(MANIFEST_PATH)) {
    const current = await readFile(MANIFEST_PATH, "utf8")
    if (current === next) {
      console.log(`[songbook-manifest] up-to-date (${songbooks.length} songbook${songbooks.length === 1 ? "" : "s"})`)
      return
    }
  }

  await writeFile(MANIFEST_PATH, next, "utf8")
  console.log(`[songbook-manifest] wrote ${songbooks.length} songbook${songbooks.length === 1 ? "" : "s"} to ${path.relative(process.cwd(), MANIFEST_PATH)}`)
}

main().catch((err) => {
  console.error("[songbook-manifest] failed:", err)
  process.exit(1)
})