/**
 * THE WORKER art in LIFE (rule life-worker-art, 24.11.2026).
 *
 * The catalog classifies every graphic in THE WORKER; the import writes the picks at game
 * size. These tests hold the lines the rule draws: the catalog parses and covers its four
 * classes, every imported file exists, is WebP and carries no yellow pixel after decode,
 * a LIFE copy keeps THE WORKER's name, and nothing Hapoel-only (or refused) lands under a
 * universal or Tel Aviv path.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { isYellow } from "@/lib/isYellow";

const ROOT = process.cwd();
type Entry = {
  path: string;
  cls: "tlv" | "universal" | "hapoel-only" | "no";
  town: "tlv" | "*";
  roles: string[];
  blockers: string[];
  processing: string[];
  approvedByPack: boolean;
  kind?: string;
  provenance?: string | null;
  clearedForUse?: string;
  note?: string;
  pick?: {
    group: string;
    role: string;
    width: number;
    out: string;
    maxSeconds?: number;
  };
};
type Imported = {
  source: string;
  out: string;
  cls: string;
  bytes: number;
  width: number;
  height: number;
  seconds?: number;
  frames?: number;
  yellowMaxFrame?: number;
};

const catalog = JSON.parse(
  readFileSync(join(ROOT, "lib/life/worker-art/catalog.json"), "utf8"),
) as {
  source: { repo: string; commit: string };
  entries: Entry[];
};
const imported = JSON.parse(
  readFileSync(join(ROOT, "lib/life/worker-art/imported.json"), "utf8"),
) as {
  totalBytes: number;
  files: Imported[];
  dropped: { source: string; out: string; reason: string }[];
};
/** THE WORKER's video ceiling (scripts/life/cut-film.py), the same one import.ts drops a clip above */
const FRAME_YELLOW_CEILING = 0.0005;
const films = imported.files.filter((file) => file.out.endsWith(".mp4"));
const stills = imported.files.filter((file) => !file.out.endsWith(".mp4"));
const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const byPath = new Map(catalog.entries.map((entry) => [entry.path, entry]));

describe("the WORKER art catalog", () => {
  it("parses, names its source and classifies every entry into the four classes", () => {
    expect(catalog.source.repo).toBe("maordubel/The-Worker");
    expect(catalog.entries.length).toBeGreaterThan(1900);
    for (const entry of catalog.entries) {
      expect(["tlv", "universal", "hapoel-only", "no"], entry.path).toContain(
        entry.cls,
      );
      expect(["tlv", "*"], entry.path).toContain(entry.town);
      expect(
        Array.isArray(entry.blockers) && Array.isArray(entry.processing),
        entry.path,
      ).toBe(true);
    }
    expect(new Set(catalog.entries.map((entry) => entry.path)).size).toBe(
      catalog.entries.length,
    );
  });

  it("keeps real people and named canon inside Hapoel", () => {
    for (const entry of catalog.entries) {
      if (entry.blockers.includes("real-person"))
        expect(["hapoel-only", "no"], entry.path).toContain(entry.cls);
      if (
        /\/(pogi|kobi|rachel|ofir|amit|keren|efi|hero)[^/]*$/i.test(entry.path)
      )
        expect(entry.cls, entry.path).toBe("hapoel-only");
    }
  });

  it("picks only tlv or universal art whose provenance is known", () => {
    const picks = catalog.entries.filter((entry) => entry.pick);
    expect(picks.length).toBeGreaterThan(30);
    for (const entry of picks) {
      expect(["tlv", "universal"], entry.path).toContain(entry.cls);
      expect(entry.blockers, entry.path).not.toContain("provenance-unknown");
      expect(entry.blockers, entry.path).not.toContain("real-person");
      expect(
        entry.pick!.out.startsWith(`public/life/worker/${entry.cls}/`),
        entry.path,
      ).toBe(true);
    }
  });
});

describe("the imported WORKER art", () => {
  it("lists every pick once, under its WORKER name, and nothing else", () => {
    const picks = catalog.entries
      .filter((entry) => entry.pick)
      .map((entry) => entry.pick!.out)
      .sort();
    expect(imported.files.map((file) => file.out).sort()).toEqual(picks);
    for (const file of imported.files) {
      const source = byPath.get(file.source);
      expect(source, file.source).toBeDefined();
      expect(basename(file.out, extname(file.out))).toBe(
        basename(file.source).replace(/\.[a-z0-9]+$/i, ""),
      );
    }
    expect(imported.totalBytes).toBeLessThan(25 * 1024 * 1024);
  });

  it("puts nothing hapoel-only or refused under a shared path, and no stray file in the folder", () => {
    for (const file of imported.files) {
      const source = byPath.get(file.source)!;
      expect(["tlv", "universal"], file.source).toContain(source.cls);
      expect(
        file.out.startsWith(`public/life/worker/${source.cls}/`),
        file.out,
      ).toBe(true);
    }
    const listed = new Set(imported.files.map((file) => file.out));
    for (const folder of ["tlv", "universal", "tlv/film"]) {
      const dir = join(ROOT, "public/life/worker", folder);
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir)) {
        const path = `public/life/worker/${folder}/${name}`;
        if (folder === "tlv" && name === "film" && statSync(join(ROOT, path)).isDirectory()) continue;
        expect(listed.has(path), name).toBe(true);
      }
    }
    expect(readdirSync(join(ROOT, "public/life/worker")).sort()).toEqual([
      "tlv",
      "universal",
    ]);
  });

  for (const file of stills) {
    it(`${file.out} exists, is WebP and has no yellow pixel`, async () => {
      const path = join(ROOT, file.out);
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(bytes.length).toBe(file.bytes);
      const { data, info } = await sharp(bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect([info.width, info.height]).toEqual([file.width, file.height]);
      let hits = 0;
      for (let i = 0; i < info.width * info.height * 4; i += 4) {
        if ((data[i + 3] as number) < 8) continue;
        if (
          isYellow(
            data[i] as number,
            data[i + 1] as number,
            data[i + 2] as number,
          )
        )
          hits += 1;
      }
      expect(hits).toBe(0);
    });
  }
});

describe("THE WORKER's 1989 and 1995 Tel Aviv films in LIFE (cleared for use 24.11.2026)", () => {
  const filmEntries = catalog.entries.filter(
    (entry) => entry.provenance === "film-1989" || entry.provenance === "film-1995",
  );

  it("carries no licence blocker any more, and records the day the films were cleared", () => {
    expect(filmEntries.length).toBe(36);
    for (const entry of filmEntries) {
      expect(entry.cls, entry.path).toBe("tlv");
      expect(entry.blockers, entry.path).not.toContain("licence-unverified");
      expect(entry.clearedForUse, entry.path).toBe("2026-11-24");
    }
    expect(JSON.stringify(catalog)).not.toMatch(/licence-unverified/);
  });

  it("imports Tel Aviv street, promenade and dusk clips only, under tlv/film, short and small", () => {
    expect(films.length).toBeGreaterThanOrEqual(8);
    const picked = catalog.entries.filter((entry) => entry.pick?.out.endsWith(".mp4"));
    expect(films.length + imported.dropped.length).toBe(picked.length);
    for (const entry of picked) {
      expect(entry.kind, entry.path).toBe("video");
      expect(["promenade", "street", "dusk"], entry.path).toContain(entry.pick!.role);
      expect(entry.pick!.out.startsWith("public/life/worker/tlv/film/"), entry.path).toBe(true);
    }
    for (const role of ["promenade", "street", "dusk"])
      expect(films.some((file) => (file as Imported & { role?: string }).role === role), role).toBe(true);
    for (const file of films) {
      expect(file.seconds!, file.out).toBeLessThanOrEqual(8);
      expect(file.width, file.out).toBeLessThanOrEqual(1280);
      expect(file.height, file.out).toBeLessThanOrEqual(720);
      expect(file.yellowMaxFrame!, file.out).toBeLessThanOrEqual(FRAME_YELLOW_CEILING);
    }
    const filmBytes = films.reduce((sum, file) => sum + file.bytes, 0);
    expect(filmBytes).toBeLessThan(25 * 1024 * 1024);
  });

  for (const file of films) {
    it(`${file.out} is H.264 MP4 on disk and its sampled frames carry no yellow`, () => {
      const path = join(ROOT, file.out);
      const bytes = readFileSync(path);
      expect(bytes.length).toBe(file.bytes);
      expect(bytes.subarray(4, 8).toString("ascii")).toBe("ftyp");
      if (!hasFfmpeg) return; // the import measured every frame; the sample needs ffmpeg
      const codec = execFileSync(
        "ffprobe",
        ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", path],
        { encoding: "utf8" },
      ).trim();
      expect(codec).toBe("h264");
      // five frames across the clip, decoded and scanned with the same isYellow
      const raw = execFileSync(
        "ffmpeg",
        ["-v", "error", "-i", path, "-vf", `fps=${(5 / (file.seconds ?? 5)).toFixed(4)}`, "-frames:v", "5", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        { maxBuffer: 256 * 1024 * 1024 },
      );
      const size = file.width * file.height * 3;
      expect(raw.length).toBeGreaterThanOrEqual(size);
      for (let at = 0; at + size <= raw.length; at += size) {
        let hits = 0;
        for (let i = at; i < at + size; i += 3)
          if (isYellow(raw[i] as number, raw[i + 1] as number, raw[i + 2] as number)) hits += 1;
        expect(hits / (file.width * file.height), `${file.out} frame ${at / size}`).toBeLessThanOrEqual(FRAME_YELLOW_CEILING);
      }
    });
  }
});
