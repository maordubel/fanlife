import 'server-only'

import { namesOf, resolvePlayer } from '@/lib/archive/player-master'
import type { RosterIndex } from '@/lib/game/allTimeXI'
import { fold } from '@/lib/game/roster-search'
import {
  shirtIndex,
  spellIndex,
  squadSlugKeys,
  type PlayerShirt,
  type PlayerSpell,
  type ShirtReason,
} from '@/lib/kit/playerKit'
import { kitForSeason } from '@/lib/kit/seasons'
import type { KitSpec } from '@/lib/kit/spec'

/**
 * לוח החולצות — the shirt join, in the shape a client screen can hold.
 *
 * `lib/kit/playerKit.ts` is the read-model and knows nothing about screens; this turns
 * it into a payload, and the shape is the whole point of the file:
 *
 *   · **the seasons are sent ONCE.** Twenty-one home shirts serve three hundred and
 *     eighty-nine men, so a spec per player would ship the same eight layers a hundred
 *     times over to a phone.
 *   · **a player is two fields** — which season, and why that season — because the
 *     screen has to be able to say the reason out loud. A shirt that appears with no
 *     explanation is a claim the reader cannot check.
 *   · **a man with no shirt is ABSENT**, not a null row. 272 of them; the screen shows
 *     his name, as it always did, and says nothing else.
 *
 * ## The versions (19.9.2026)
 *
 * A player can be picked as the man of his first spell or the man of his second, and the
 * shirt follows the choice. `lib/kit/playerKit.ts` derives that from the squad table —
 * a version is an unbroken run of seasons, never an era somebody typed — and this turns
 * it into the same shape as the rest of the payload: **only the men who actually have
 * more than one are sent.** 109 of them. A single-spell man carries no `versions` key
 * at all, which is how the screen knows not to draw a chooser he has nothing to choose
 * in (rule 59 — a one-element list beside a scalar is a second copy of a fact).
 */

export type ShirtSeason = {
  seasonLabel: string
  spec: KitSpec
  /** what the archive says the shirt looked like, from the photograph it was read off */
  noteHe: string
  /** the photograph, named on screen (rule 16) */
  sourceTitle: string
  /** what the club won that season, named — empty where it won nothing */
  wonHe: string[]
}

/**
 * גרסה — one spell of a man's career, in the shape a button needs.
 *
 * `id` is the span, which is also what the button says: two spells of the same man can
 * never share one, and a saved sheet that names `1979-1988` still resolves after the
 * archive gains a season in the middle of some other player's career.
 */
export type PlayerVersion = {
  id: string
  fromYear: number
  toYear: number
  /** how many seasons the spell holds */
  seasons: number
  /** the shirt this version wears; `null` where the archive holds no kit from the spell */
  seasonLabel: string | null
}

export type ShirtBoard = {
  /** roster slug → the season he is given, why, and which version that season belongs to */
  bySlug: Record<string, { seasonLabel: string; why: ShirtReason }>
  /** season label → the shirt itself */
  seasons: Record<string, ShirtSeason>
  /** roster slug → his spells, oldest first. Present ONLY where there is more than one. */
  versions: Record<string, PlayerVersion[]>
  /** which version a pick starts on — the one holding the shirt he is identified with */
  defaultVersion: Record<string, string>
  /** how many of the roster the archive can dress, and how many it cannot */
  withShirt: number
  withoutShirt: number
  /** how many of the roster the squad table gives more than one spell */
  withVersions: number
}

function versionId(spell: PlayerSpell): string {
  return `${spell.fromYear}-${spell.toYear}`
}

export function shirtBoard(roster: RosterIndex): ShirtBoard {
  const index = shirtIndex()
  const spells = spellIndex()
  // One pass to key the join by slug as well as by folded name: the squad rows carry a
  // slug for every man the wiki wrote one for, and the fold is how the archive's
  // spellings of the rest are reconciled (rule 7). Both are built once, here, rather
  // than searched per roster row.
  const bySlugKey = new Map<string, PlayerShirt>()
  for (const shirt of index.values()) {
    if (shirt.personSlug) bySlugKey.set(shirt.personSlug, shirt)
  }

  const spellKeyOf = squadSlugKeys()

  const bySlug: ShirtBoard['bySlug'] = {}
  const seasons: Record<string, ShirtSeason> = {}
  const versions: Record<string, PlayerVersion[]> = {}
  const defaultVersion: Record<string, string> = {}

  /** A season becomes a payload row once, whoever asked for it first. */
  function keepSeason(seasonLabel: string, wonHe: string[]): void {
    if (seasons[seasonLabel]) return
    const kit = kitForSeason(seasonLabel)
    if (!kit) return
    seasons[seasonLabel] = {
      seasonLabel,
      spec: kit.spec,
      noteHe: kit.noteHe,
      sourceTitle: kit.sourceTitle,
      wonHe,
    }
  }

  for (const entry of roster.all) {
    // Identity through the Player Master (21.9.2026): the squad table files a man under
    // the slug and spelling ויקיפועל gave him, and a row can carry a different one (a
    // curated spelling, a slug merged away). Every slug and every spelling the master
    // holds for him is tried, canonical first — never a guess (rule 7).
    const person = resolvePlayer(entry.id ?? entry.slug)
    const slugs = [entry.slug, ...(person?.slugAliases ?? [])]
    const keys = [...new Set([entry.nameHe, ...(person ? namesOf(person) : [])].map((name) => fold(name)))]
    const found =
      slugs.map((slug) => bySlugKey.get(slug)).find(Boolean) ??
      keys.map((key) => index.get(key)).find(Boolean)
    if (found) {
      bySlug[entry.slug] = { seasonLabel: found.seasonLabel, why: found.why }
      keepSeason(found.seasonLabel, found.wonHe)
    }

    // The spells. Only a man with more than one has anything to choose between, and a
    // chooser with one button in it is a control that teaches the reader a fact the
    // archive did not state.
    const spellKey =
      slugs.map((slug) => spellKeyOf.get(slug)).find(Boolean) ?? keys.find((key) => spells.has(key)) ?? fold(entry.nameHe)
    const spellsOf = spells.get(spellKey) ?? []
    if (spellsOf.length < 2) continue
    versions[entry.slug] = spellsOf.map((spell) => ({
      id: versionId(spell),
      fromYear: spell.fromYear,
      toYear: spell.toYear,
      seasons: spell.seasons.length,
      seasonLabel: spell.seasonLabel,
    }))
    for (const spell of spellsOf) {
      if (spell.seasonLabel) keepSeason(spell.seasonLabel, spell.wonHe)
    }
    // The pick opens on the version that holds the shirt he is identified with, so
    // choosing a man looks exactly as it did before anybody touched the chooser. Where
    // the archive dresses none of his spells, it opens on the longest one — the years
    // `shirtFor` already calls his spell.
    const carrying = spellsOf.find((spell) => spell.seasonLabel === found?.seasonLabel)
    const primary = spellsOf.find((spell) => spell.primary)
    defaultVersion[entry.slug] = versionId(carrying ?? primary ?? (spellsOf[0] as PlayerSpell))
  }

  const withShirt = Object.keys(bySlug).length
  return {
    bySlug,
    seasons,
    versions,
    defaultVersion,
    withShirt,
    withoutShirt: roster.all.length - withShirt,
    withVersions: Object.keys(versions).length,
  }
}

/**
 * "גביעים בלבד" — the Manager Prompt's cup rule (`lib/xi/prompt.ts`), computed from the Player
 * Master and nothing else: for each roster slug, the opening year of every season the club
 * lifted a CUP (a `גביע-…` competition — State Cup, Toto Cup) with him in the squad, read off
 * `spells[].titles`, which the master joined from `squads.json` × `trophies.json`. A man the
 * master records no cup season for is absent, and the rule refuses him and says so on screen.
 */
export function cupYearsBySlug(roster: RosterIndex): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const entry of roster.all) {
    const person = resolvePlayer(entry.id ?? entry.slug)
    if (!person) continue
    const years = new Set<number>()
    for (const spell of person.spells) {
      for (const title of spell.titles) {
        if (!title.competitionSlug.startsWith('גביע-')) continue
        const year = Number(title.seasonLabel.slice(0, 4))
        if (Number.isFinite(year) && year > 0) years.add(year)
      }
    }
    // order carries nothing: the rule only asks whether a chosen spell CONTAINS one of them
    if (years.size > 0) out[entry.slug] = [...years]
  }
  return out
}
