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
  encode: "lossy-webp-measured" | "near-lossless-webp" | "lossless-webp";
  deYellowed: boolean;
};

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

async function main(): Promise<void> {
  const worker = arg("worker", join(ROOT, "../maordubel/the-worker"));
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8")) as Catalog;
  const picks = catalog.entries.filter((entry) => entry.pick);
  const scratch = mkdtempSync(join(tmpdir(), "worker-art-"));
  const done: Imported[] = [];
  try {
    for (const entry of picks) {
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
    `${JSON.stringify({ source: catalog.source, totalBytes: total, files: done }, null, 1)}\n`,
  );
  console.log(`${done.length} files · ${(total / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
