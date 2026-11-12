#!/usr/bin/env node
/**
 * Turns the raw artwork in /assets (not committed — it's ~150 MB) into small,
 * web-ready WebP files under /public, and regenerates src/lib/avatars.generated.ts.
 *
 * Needs ffmpeg on PATH. Run:  node scripts/build-assets.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const SRC = path.join(root, "assets");
const PUBLIC = path.join(root, "public");

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

/** Resize to fit within maxW x maxH (never upscale) and write WebP, keeping transparency. */
function toWebp(input, output, { maxW, maxH = maxW, quality = 80, scale: enlarge }) {
  mkdirSync(path.dirname(output), { recursive: true });
  // `enlarge` (for tiny source icons) scales up by that factor; otherwise images are only ever shrunk.
  const scale = enlarge
    ? `scale=iw*${enlarge}:ih*${enlarge}:flags=lanczos`
    : `scale='min(${maxW},iw)':'min(${maxH},ih)':force_original_aspect_ratio=decrease`;
  ffmpeg(["-i", input, "-vf", scale, "-c:v", "libwebp", "-quality", String(quality), "-compression_level", "6", output]);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

const files = walk(SRC);
const find = (name) => {
  const hit = files.find((f) => path.basename(f).toLowerCase() === name.toLowerCase());
  if (!hit) throw new Error(`Missing asset: ${name}`);
  return hit;
};

// ---- Faction icons ----------------------------------------------------------
const FACTION_ICONS = {
  marquise: "faction-marquise.png",
  eyrie: "faction-eyrie.png",
  alliance: "faction-woodland.png",
  vagabond: "faction-vagabond.png",
  riverfolk: "faction-riverfolk.png",
  lizards: "faction-cult.png",
  corvids: "faction-corvid.png",
  duchy: "faction-duchy.png",
  keepers: "faction-keepers.png",
  hundreds: "faction-lord of the hundreds.png",
  // Homeland Expansion
  frogs: "Lilypad_Diaspora_-_Symbol.webp",
  bats: "Twilight_Council_-_Symbol.webp",
  knaves: "Knaves_of_the_Deepwood_-_Symbol.webp",
};
for (const [id, file] of Object.entries(FACTION_ICONS)) {
  toWebp(find(file), path.join(PUBLIC, "factions", `${id}.webp`), { maxW: 112, quality: 85 });
}

// ---- Faction patterns (card banners) ---------------------------------------
const FACTION_PATTERNS = {
  marquise: "RootBG_Cats.png",
  eyrie: "RootBG_Birds.png",
  alliance: "RootBG_WA.png",
  vagabond: "RootBG_VB.png",
  riverfolk: "RootBG_Otters.png",
  lizards: "RootBG_Lizards.png",
  corvids: "RootBG_Crows.png",
  duchy: "RootBG_Moles.png",
  keepers: "RootBG_Badgers.png",
  hundreds: "RootBG_Rats.png",
  frogs: "RootBG_Frogs.png",
  bats: "RootBG_Bats.png",
  knaves: "RootBG_Knaves.png",
};
for (const [id, file] of Object.entries(FACTION_PATTERNS)) {
  toWebp(find(file), path.join(PUBLIC, "patterns", `${id}.webp`), { maxW: 700, quality: 42 });
  // A small copy for cards and tiles, which show the pattern at about 300-360px.
  toWebp(find(file), path.join(PUBLIC, "patterns", "sm", `${id}.webp`), { maxW: 400, quality: 58 });
}

// ---- Hero art -----------------------------------------------------
toWebp(find("141.png"), path.join(PUBLIC, "art", "hero.webp"), { maxW: 520, quality: 85 });
// Wide banner art for the home page (the logo in its corner is covered by the page, never shown).
toWebp(find("root-banner (1).webp"), path.join(PUBLIC, "art", "banner.webp"), { maxW: 1500, quality: 66 });
// A smaller copy for phones.
toWebp(find("root-banner (1).webp"), path.join(PUBLIC, "art", "banner-sm.webp"), { maxW: 800, quality: 66 });
// Tiny woodland-folk icons, used as decorative bullets.
for (const [id, file] of Object.entries({ bunny: "Bunny_Icon.png", fox: "Fox_Icon.png", mouse: "Mouse_Icon.png" })) {
  // The source icons are only about 50px, so they are enlarged 2.5x: the browser would stretch them on sharp screens anyway.
  toWebp(find(file), path.join(PUBLIC, "art", `${id}.webp`), { maxW: 160, quality: 90, scale: 2.5 });
}

// ---- Player avatars ---------------------------------------------------------
const SPECIES = new Set([
  "Badgers", "Bats", "Birds", "Cats", "Foxes", "Frogs", "Lizards",
  "Mice", "Moles", "Otters", "Rabbits", "Raccoons", "Skunks", "Squirrels",
]);
// Card scans, duplicates and unnamed files that aren't character portraits.
const NOT_PORTRAITS =
  /\(1\)|copy|ambush|partisans|marquisate|woodland alliance|dawn_and_dusk|t1mothy|brutal|royal|saboteurs|pic\d+|^\d+$|2squirrel|eyyven|foxfolk|informants|anvil/i;

const vagabondDir = path.dirname(find("Tinker.png"));
const portraits = files
  .filter((f) => f.toLowerCase().endsWith(".png"))
  .map((f) => {
    const dir = path.dirname(f);
    const group = dir === vagabondDir ? "Vagabonds" : SPECIES.has(path.basename(dir)) ? path.basename(dir) : null;
    return { file: f, group, name: path.basename(f, ".png") };
  })
  .filter((p) => p.group && !NOT_PORTRAITS.test(p.name))
  .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
rmSync(path.join(PUBLIC, "avatars"), { recursive: true, force: true });
const used = new Set();
const avatars = portraits.map((p) => {
  let id = slug(p.name);
  if (used.has(id)) id = `${id}-${slug(p.group)}`;
  used.add(id);
  toWebp(p.file, path.join(PUBLIC, "avatars", `${id}.webp`), { maxW: 320, quality: 80 });
  // A small copy for list rows and chips (Avatar uses it at 96px and under).
  toWebp(p.file, path.join(PUBLIC, "avatars", "sm", `${id}.webp`), { maxW: 160, quality: 78 });
  return { id, name: p.name, group: p.group, src: `/avatars/${id}.webp` };
});

writeFileSync(
  path.join(root, "src", "lib", "avatars.generated.ts"),
  `// Generated by scripts/build-assets.mjs — don't edit by hand.\n` +
    `export interface Avatar {\n  id: string;\n  name: string;\n  group: string;\n  src: string;\n}\n\n` +
    `export const AVATARS: Avatar[] = ${JSON.stringify(avatars, null, 2)};\n`,
);

const kb = (dir) =>
  Math.round(
    walk(dir).reduce((sum, f) => sum + statSync(f).size, 0) / 1024,
  );
console.log(`Avatars: ${avatars.length}`);
for (const d of ["factions", "patterns", "art", "avatars"]) {
  console.log(`public/${d}: ${kb(path.join(PUBLIC, d))} KB`);
}
