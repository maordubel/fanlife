import 'server-only'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import type {ClubData,Diagnostic} from './contract'

/**
 * Pre-compiled club packs (performance audit, 11.10.2026).
 *
 * Compiling the eight repository packs on a cold server instance took ~1.6 s (Hapoel Tel Aviv alone ~0.5 s), and every
 * cold instance paid it before the hub could answer. `npm run build` now runs `scripts/clubs/precompile.ts` first, which
 * writes the SAME result `loadClubBase` would compute — provider + roster wave, before the owner's overrides and the
 * readiness pass — to `content/compiled/<club>.json`. Parsing it costs ~0.1 s for all eight.
 *
 * Rules:
 *  - Production only. Development and tests always compile, so a stale file can never hide a data change while working.
 *  - Written by the build that serves it, from the same sources (the folder is gitignored): there is no second copy to drift.
 *  - The manifest carries the build's own stamp; a file from another build, a missing file or a parse error = compile as before.
 *  - Owner overrides and readiness still apply on top at runtime (`loadClub`), per revision, exactly as before.
 */
export const COMPILED_DIR = path.join(process.cwd(), 'content', 'compiled')
export type CompiledManifest = {schema: 1; stamp: string; clubs: string[]; life?: Record<string, boolean>}
type Compiled = {data: ClubData; diagnostics: Diagnostic[]}

export function precompiledEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === 'production' && !env.VITEST && env.FANLIFE_PRECOMPILED !== 'off'
}

let manifest: Promise<CompiledManifest | null> | null = null
const readManifest = () =>
  (manifest ??= readFile(path.join(COMPILED_DIR, 'manifest.json'), 'utf8')
    .then(s => {
      const m = JSON.parse(s) as CompiledManifest
      return m && m.schema === 1 && Array.isArray(m.clubs) ? m : null
    })
    .catch(() => null))

/** The compiled base of one repository club, or null (then the caller compiles). Never throws. */
export async function readPrecompiled(id: string): Promise<Compiled | null> {
  if (!precompiledEnabled()) return null
  const m = await readManifest()
  if (!m || !m.clubs.includes(id)) return null
  try {
    const r = JSON.parse(await readFile(path.join(COMPILED_DIR, `${id}.json`), 'utf8')) as Compiled & {stamp?: string}
    if (r.stamp !== m.stamp || !r.data || !Array.isArray(r.diagnostics)) return null
    return {data: r.data, diagnostics: r.diagnostics}
  } catch {
    return null
  }
}

/**
 * Whether a club's LIFE is playable, as the build measured it — answered from the manifest, without parsing the club
 * (the hub asks this for every club, and building eight screenplays took ~0.5 s on a cold instance). Null = not known: compile.
 * LIFE's anchors are matches, kits and the skin; the owner's player overrides cannot change the answer.
 */
export async function readLifePlayable(id: string): Promise<boolean | null> {
  if (!precompiledEnabled()) return null
  const m = await readManifest()
  return m && typeof m.life?.[id] === 'boolean' ? m.life[id]! : null
}
