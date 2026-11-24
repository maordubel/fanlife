/**
 * THE WORKER art in LIFE (rule life-worker-art, 24.11.2026).
 *
 * The catalog classifies every graphic in THE WORKER; the import writes the picks at game
 * size. These tests hold the lines the rule draws: the catalog parses and covers its four
 * classes, every imported file exists, is WebP and carries no yellow pixel after decode,
 * a LIFE copy keeps THE WORKER's name, and nothing Hapoel-only (or refused) lands under a
 * universal or Tel Aviv path.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
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
  pick?: { group: string; role: string; width: number; out: string };
};
type Imported = {
  source: string;
  out: string;
  cls: string;
  bytes: number;
  width: number;
  height: number;
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
};
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
      expect(basename(file.out, ".webp")).toBe(
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
    for (const folder of ["tlv", "universal"]) {
      const dir = join(ROOT, "public/life/worker", folder);
      if (!existsSync(dir)) continue;
      for (const name of readdirSync(dir))
        expect(listed.has(`public/life/worker/${folder}/${name}`), name).toBe(
          true,
        );
    }
    expect(readdirSync(join(ROOT, "public/life/worker")).sort()).toEqual([
      "tlv",
      "universal",
    ]);
  });

  for (const file of imported.files) {
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
