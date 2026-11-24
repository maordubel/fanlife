/**
 * THE WORKER art → LIFE, at game size (rule life-worker-art, 24.11.2026).
 *
 * THE WORKER stays the source of truth: every LIFE copy is written by this script from a
 * WORKER checkout, never by hand, under the SAME file name as in THE WORKER, and a re-run
 * overwrites it. Only catalog entries that carry a `pick` are written, to the `out` path
 * the catalog names (`public/life/worker/<class>/<name>.webp`); a `hapoel-only` or `no`
 * entry is refused outright.
 *
 * Yellow (rules 8, 27, 61): the picture is resized first, de-yellowed with the house pass
 * (`scripts/brand/deyellow.py`) where the catalog flags it or the resize put yellow back,
 * encoded to lossy WebP, and the ENCODED bytes are decoded and scanned with
 * `lib/isYellow.ts`. If the encoder invented a yellow pixel the file is re-encoded
 * lossless; if that still carries one, the script fails. Nothing is written unclean.
 *
 * Not run by CI. Run by hand when THE WORKER's art or the picks change:
 *
 *   npx tsx scripts/life/worker-art/import.ts --worker ../maordubel/the-worker
 *
 * It rewrites `lib/life/worker-art/imported.json`, the list the renderer and the tests read.
 *
 * Film (the 1989 and 1995 Tel Aviv clips, cleared for use 24.11.2026): a pick whose `out`
 * ends in `.mp4` is cut to at most `maxSeconds` (8), scaled to at most 1280x720 (never
 * enlarged: the sources are 640x360, cut from 240p and 480p reels), every frame is passed
 * through `deyellow.py --video`, encoded H.264 (`-preset veryfast`, yuv420p, faststart, no
 * audio), and the ENCODED file is decoded again and every frame scanned with `isYellow`.
 * A 4:2:0 video cannot reach exactly zero on edges (THE WORKER's `cut-film.py` records
 * why), so a frame counts as yellow above THE WORKER's ceiling of 0.05 % of its pixels;
 * one yellow frame and the clip is DROPPED, never shipped, and listed under `dropped`.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import sharp from "sharp";

import { isYellow } from "../../../lib/isYellow";

type Pick = {
  group: "tlv" | "universal";
  role: string;
  why: string;
  width: number;
  out: string;
  maxSeconds?: number;
};
type Entry = {
  path: string;
  cls: "tlv" | "universal" | "hapoel-only" | "no";
  town: "tlv" | "*";
  roles: string[];
  blockers: string[];
  processing: string[];
  approvedByPack: boolean;
  pick?: Pick;
};
type Catalog = { source: { repo: string; commit: string }; entries: Entry[] };
export type Imported = {
  source: string;
  out: string;
  cls: "tlv" | "universal";
  town: "tlv" | "*";
  role: string;
  width: number;
  height: number;
  bytes: number;
  encode:
    | "lossy-webp-measured"
    | "near-lossless-webp"
    | "lossless-webp"
    | "h264-veryfast";
  deYellowed: boolean;
  /** film only: length, frame rate, and the largest yellow share found in any decoded frame */
  seconds?: number;
  fps?: number;
  frames?: number;
  yellowMaxFrame?: number;
};
export type Dropped = { source: string; out: string; reason: string };

/** THE WORKER's video ceiling (scripts/life/cut-film.py): above this share a frame is yellow */
export const FRAME_YELLOW_CEILING = 0.0005;

const ROOT = process.cwd();
const CATALOG = join(ROOT, "lib/life/worker-art/catalog.json");
const LIST = join(ROOT, "lib/life/worker-art/imported.json");
const DEYELLOW = join(ROOT, "scripts/brand/deyellow.py");

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 && process.argv[at + 1]
    ? (process.argv[at + 1] as string)
    : fallback;
}

async function yellowPixels(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let hits = 0;
  for (let i = 0; i < info.width * info.height * 4; i += 4) {
    if ((data[i + 3] as number) < 8) continue;
    if (
      isYellow(data[i] as number, data[i + 1] as number, data[i + 2] as number)
    )
      hits += 1;
  }
  return hits;
}

function deYellow(input: string, output: string, wide = false): void {
  // `--video` is deyellow.py's wider band (33–82°, S/V floors 0.18/0.16): the margin a
  // chroma-subsampling encoder needs so that its averages cannot land inside 38–70°.
  execFileSync(
    "python3",
    ["-I", DEYELLOW, ...(wide ? ["--video"] : []), input, output],
    { stdio: "pipe" },
  );
}

async function importOne(
  worker: string,
  entry: Entry,
  scratch: string,
): Promise<Imported> {
  const pick = entry.pick as Pick;
  if (entry.cls !== "tlv" && entry.cls !== "universal")
    throw new Error(`${entry.path}: ${entry.cls} is never imported`);
  if (!pick.out.startsWith(`public/life/worker/${entry.cls}/`))
    throw new Error(`${entry.path}: out path outside its class`);
  const sourceName = basename(entry.path).replace(/\.[a-z0-9]+$/i, "");
  if (basename(pick.out, ".webp") !== sourceName)
    throw new Error(`${entry.path}: a LIFE copy keeps THE WORKER's name`);
  const source = join(worker, entry.path);
  if (!existsSync(source))
    throw new Error(`missing in THE WORKER checkout: ${entry.path}`);

  const resized = join(scratch, `${sourceName}.png`);
  await sharp(source)
    .resize({ width: pick.width, withoutEnlargement: true })
    .png()
    .toFile(resized);
  let working = resized;
  let deYellowed = false;
  const flagged = entry.processing.includes("de-yellow");
  if (flagged || (await yellowPixels(readFileSync(resized))) > 0) {
    const cleaned = join(scratch, `${sourceName}.clean.png`);
    deYellow(resized, cleaned);
    working = cleaned;
    deYellowed = true;
  }

  // Cheapest first, each one measured on its own decode: lossy q80, the same after the
  // wider de-yellow margin, q90 with full-resolution chroma, near-lossless, lossless.
  const tiers: [Imported["encode"], sharp.WebpOptions][] = [
    ["lossy-webp-measured", { quality: 80, alphaQuality: 90, effort: 5 }],
    [
      "lossy-webp-measured",
      { quality: 90, alphaQuality: 90, smartSubsample: true, effort: 5 },
    ],
    ["near-lossless-webp", { nearLossless: true, quality: 60, effort: 5 }],
    ["lossless-webp", { lossless: true, effort: 5 }],
  ];
  let encode: Imported["encode"] = "lossy-webp-measured";
  let bytes = await sharp(working).webp(tiers[0]![1]).toBuffer();
  if ((await yellowPixels(bytes)) > 0) {
    // the encoder invented yellow: widen the margin, then climb the tiers
    const margin = join(scratch, `${sourceName}.margin.png`);
    deYellow(working, margin, true);
    working = margin;
    deYellowed = true;
    let left = -1;
    for (const [name, options] of tiers) {
      bytes = await sharp(working).webp(options).toBuffer();
      encode = name;
      left = await yellowPixels(bytes);
      if (left === 0) break;
    }
    if (left > 0)
      throw new Error(
        `${entry.path}: ${left} yellow pixels survive a lossless encode`,
      );
  }

  const target = join(ROOT, pick.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes); // same name, overwrite: never a second copy
  const meta = await sharp(bytes).metadata();
  return {
    source: entry.path,
    out: pick.out,
    cls: entry.cls,
    town: entry.town,
    role: pick.role,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: bytes.length,
    encode,
    deYellowed,
  };
}

function probe(file: string): { fps: number; seconds: number } {
  const out = execFileSync(
    "ffprobe",
    [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=r_frame_rate:format=duration",
      "-of", "json", file,
    ],
    { encoding: "utf8" },
  );
  const j = JSON.parse(out) as {
    streams: { r_frame_rate: string }[];
    format: { duration: string };
  };
  const [n, d] = (j.streams[0]?.r_frame_rate ?? "24/1").split("/").map(Number);
  return { fps: (n as number) / ((d as number) || 1), seconds: Number(j.format.duration) };
}

/** decode every frame of an encoded clip and return each frame's yellow share */
export function frameYellowShares(file: string): { width: number; height: number; shares: number[] } {
  const info = execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  ).trim().split(",").map(Number);
  const [width, height] = info as [number, number];
  const raw = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
    { maxBuffer: 1024 * 1024 * 1024 },
  );
  const size = width * height * 3;
  const shares: number[] = [];
  for (let at = 0; at + size <= raw.length; at += size) {
    let hits = 0;
    for (let i = at; i < at + size; i += 3)
      if (isYellow(raw[i] as number, raw[i + 1] as number, raw[i + 2] as number)) hits += 1;
    shares.push(hits / (width * height));
  }
  return { width, height, shares };
}

function importFilm(
  worker: string,
  entry: Entry,
  scratch: string,
): Imported | Dropped {
  const pick = entry.pick as Pick;
  if (entry.cls !== "tlv" || !pick.out.startsWith("public/life/worker/tlv/film/"))
    throw new Error(`${entry.path}: film goes only to public/life/worker/tlv/film/`);
  const name = basename(entry.path, ".mp4");
  if (basename(pick.out, ".mp4") !== name)
    throw new Error(`${entry.path}: a LIFE copy keeps THE WORKER's name`);
  const source = join(worker, entry.path);
  if (!existsSync(source))
    throw new Error(`missing in THE WORKER checkout: ${entry.path}`);
  const { fps } = probe(source);
  const frames = join(scratch, `${name}-frames`);
  const clean = join(scratch, `${name}-clean`);
  mkdirSync(frames, { recursive: true });
  execFileSync("ffmpeg", [
    "-v", "error", "-i", source, "-t", String(pick.maxSeconds ?? 8), "-an",
    "-vf", "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease:flags=lanczos,scale=trunc(iw/2)*2:trunc(ih/2)*2",
    join(frames, "%05d.png"),
  ]);
  execFileSync("python3", ["-I", DEYELLOW, "--dir", "--video", frames, clean], { stdio: "pipe" });
  const encoded = join(scratch, `${name}.mp4`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-framerate", String(fps), "-i", join(clean, "%05d.png"),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
    "-profile:v", "high", "-movflags", "+faststart", "-an", encoded,
  ]);
  const scan = frameYellowShares(encoded);
  const worst = Math.max(0, ...scan.shares);
  if (worst > FRAME_YELLOW_CEILING)
    return {
      source: entry.path,
      out: pick.out,
      reason: `a decoded frame is ${(worst * 100).toFixed(3)} % yellow (ceiling ${FRAME_YELLOW_CEILING * 100} %)`,
    };
  const bytes = readFileSync(encoded);
  const target = join(ROOT, pick.out);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes); // same name, overwrite: never a second copy
  const { seconds } = probe(target);
  return {
    source: entry.path,
    out: pick.out,
    cls: "tlv",
    town: entry.town,
    role: pick.role,
    width: scan.width,
    height: scan.height,
    bytes: bytes.length,
    encode: "h264-veryfast",
    deYellowed: true,
    seconds: Math.round(seconds * 1000) / 1000,
    fps,
    frames: scan.shares.length,
    yellowMaxFrame: Number(worst.toExponential(2)),
  };
}

async function main(): Promise<void> {
  const worker = arg("worker", join(ROOT, "../maordubel/the-worker"));
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8")) as Catalog;
  const picks = catalog.entries.filter((entry) => entry.pick);
  const scratch = mkdtempSync(join(tmpdir(), "worker-art-"));
  const done: Imported[] = [];
  const dropped: Dropped[] = [];
  try {
    for (const entry of picks) {
      if (entry.pick!.out.endsWith(".mp4")) {
        const film = importFilm(worker, entry, scratch);
        if ("reason" in film) {
          dropped.push(film);
          console.log(`DROPPED ${film.out} · ${film.reason}`);
          continue;
        }
        done.push(film);
        console.log(
          `${film.out} · ${film.width}x${film.height} · ${film.seconds}s · ${(film.bytes / 1024).toFixed(0)} KB · worst frame ${film.yellowMaxFrame}`,
        );
        continue;
      }
      const row = await importOne(worker, entry, scratch);
      done.push(row);
      console.log(
        `${row.out} · ${row.width}x${row.height} · ${(row.bytes / 1024).toFixed(0)} KB · ${row.encode}${row.deYellowed ? " · de-yellow" : ""}`,
      );
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  const total = done.reduce((sum, row) => sum + row.bytes, 0);
  writeFileSync(
    LIST,
    `${JSON.stringify({ source: catalog.source, totalBytes: total, files: done, dropped }, null, 1)}\n`,
  );
  console.log(`${done.length} files · ${(total / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
