'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { KitShirt } from '@/components/kit/KitShirt'
import { Num } from '@/components/ui/Num'
import { NEUTRAL_SHIRT_SPEC, RosterSheet, rosterKey, type RowInfo } from '@/components/roster/RosterSheet'
import { CompareCard } from '@/components/share/CompareCard'
import type { ChallengeResult } from '@/lib/challenges/contract'
import { ShareRow } from '@/components/share/ShareRow'
import type { Embedded } from '@/lib/mechanics/types'
import { useDialog } from '@/components/ui/useDialog'
import { FitBox } from '@/components/stage/FitBox'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { firePickFx, firePickFxAt } from '@/components/stage/PickFx'
import { dropZone, useDragSource } from '@/components/stage/useDrag'
import { ShirtToken } from '@/components/stage/ShirtToken'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import { PickRail, flyShirt, shirtTitle, type RailItem } from '@/components/roster/PickRail'
import type { ShirtLook, Wardrobe } from '@/lib/kit/playerShirt'
import type { Formation, PitchSlot } from '@/lib/game/lineup'
import type { RosterEntry, RosterIndex } from '@/lib/game/allTimeXI'
import { NO_FILTER, slotStatusOf, type RosterFilter, compactName } from '@/lib/game/roster-search'
import type { ShirtBoard } from '@/lib/xi/board'
import {
  CHALLENGES,
  SPAN_DECADES,
  SPAN_DEFAULT,
  SPAN_MAX,
  decadeWord,
  toggleDecade,
  challengeStatus,
  type ManFacts,
  chooseSpell,
  spellsFor,
  takenDecades,
  type ChallengeId,
  type ChallengeStatus,
  type Refusal,
  type SheetRow,
  type Spell,
} from '@/lib/xi/challenge'
import { xiDna } from '@/lib/xi/dna'
import { scoutGroups, type ScoutOrder } from '@/lib/xi/scout'
import { activeXI, migrateSheet, refResolver, restore, XI_TABS, type XITab } from '@/lib/xi/store'
import { emit, markOf } from '@/lib/profile/events'
import { readProfile } from '@/lib/profile/store'
import { haptic } from '@/lib/play/haptics'
import { t, type MessageKey } from '@/lib/i18n'
import { UniversalExit } from '@/components/result/UniversalExit'
import { track } from '@/lib/analytics/meter'
import type { NextAction } from '@/lib/results/types'
import { microFeedback, voice, voiceAction } from '@/lib/voice'
import { advanceRotation, rotationFor } from '@/lib/profile/store'
import { mintSeed } from '@/lib/rotation/deck'
import { FRESH_COUNT, PROMPT_RULE, XI_OPENING, dealPrompt, forbiddenFive, promptAt, promptQuery, type PromptId } from '@/lib/xi/prompt'
import { nextAfterXI } from './actions'
import { useWide } from './useWide'

/**
 * הרכב כל הזמנים — pick eleven from everyone who ever wore the shirt.
 *
 * Free play. No clock, no lives, no score — the reward is the picture and the argument
 * it starts. The pitch is drawn in the PRESS layer's tokens (`--p-grass`, `--p-grass-dark`,
 * `--p-halo`), which is what that layer is for.
 *
 * ## שולחן המאמן — the position first, the man second (19.9.2026)
 *
 * A slot carries a detailed role (`lib/game/lineup.ts`), tapping it SELECTS that
 * position, and the drawer opens already knowing it. The role is mapped DOWN to the four
 * positions the sources state (`lib/xi/roles.ts`): "this slot wants a defender" is a fact
 * about a formation we invented; "this man was a right back" would be a fact about a
 * person no source here states.
 *
 * ## Manager's Table V2 (21.9.2026, players.md §2)
 *
 *  · **One identity.** A saved sheet holds `p_…` ids. Sheets written before hold roster
 *    slugs, migrated on read — the six slugs a reviewed merge retired included — and
 *    anything that cannot be mapped is SAID, never silently dropped.
 *  · **Challenges are enforced** (`lib/xi/challenge.ts`): the drawer hides the men a
 *    rule refuses and counts them by reason; the pitch marks a slot that breaks the rule;
 *    the poster says met / not met. Never a score.
 *  · **The version follows the filters.** A "2010" season filter picks a man as his 2010
 *    self; "לפני 2000" picks his first spell. The shirt follows the version.
 *  · **The drawer keeps the slot in view:** docked beside the pitch at `lg`, a sheet
 *    with the role and a mini formation on a phone; active filters as removable chips;
 *    the shortlist inside it; rows with the spell's years, the foreign-slot badge, the
 *    fit mark and a mini kit drawn only for rows on screen.
 *  · **The poster is the real pitch** with the mini kits, the armband, the DNA, the
 *    twelfth man and the last man cut.
 *  · **The deed goes through `emit`** only when the sheet's fingerprint (`markOf`)
 *    changed — the same eleven reopened tomorrow is not a new deed.
 *
 * ## The shirt (17.9.2026)
 *
 * A picked man wears a shirt from **a season the squad table actually puts him in**
 * (`lib/kit/playerKit.ts`), drawn by the kit engine at mini density with the era's
 * printed crest (rules 20, 25). A man the archive cannot dress shows his name only —
 * inventing a shirt would be inventing a fact about a man (rule 11).
 *
 * ## The second tab (17.9.2026)
 *
 * **The app ranks nobody.** The worst eleven is a supporter's opinion from end to end —
 * he picks all eleven out of the same roster, nothing is offered, nothing is scored, and
 * the screen and the share card both say whose opinion it is (rule 18 vs rule 11).
 */

/** One tab's whole state. Everything the store keeps, plus the rows themselves. */
type Sheet = {
  formation: Formation
  /** slot id → the man standing there */
  picks: Record<string, RosterEntry>
  /** slot id → which of his spells was chosen. Absent where he has only one. */
  versions: Record<string, string>
  /** the slot wearing the armband */
  captain: string | null
  twelfth: RosterEntry | null
  cut: RosterEntry | null
  /** the men still being argued over */
  shortlist: RosterEntry[]
  /** the rule this sheet is built under */
  challenge: ChallengeId
  /** the decades of the decade mission — empty for every other rule */
  decades: number[]
  /** the Manager Prompt accepted for this sheet — its seed and cursor, never the picks */
  prompt: { seed: number; cursor: number } | null
  /** ids: "the five you picked before", frozen when `fresh5` was accepted */
  forbidden: string[]
}

/** What a removal has to remember in order to be undoable. */
type Undo = { slotId: string; entry: RosterEntry; versionId: string | undefined }

function emptySheet(formation: Formation): Sheet {
  return {
    formation,
    picks: {},
    versions: {},
    captain: null,
    twelfth: null,
    cut: null,
    shortlist: [],
    challenge: 'free',
    decades: [],
    prompt: null,
    forbidden: [],
  }
}

/** The device's own deck of Manager Prompts (rule 31) — kept apart from any round deck. */
const PROMPT_DECK = '/xi#prompt'

/**
 * The name a rule is shown under. A decade mission is named by what it asks for —
 * "שנות ה־90 + שנות ה־2000" — so the mission stays legible the whole time it is active.
 */
function ruleLabel(challenge: ChallengeId, decades: readonly number[]): string {
  if (challenge === 'span' && decades.length > 0) {
    return t('xi.challenge.span.named', {
      decades: decades.map((decade) => t('xi.challenge.span.decade', { d: decadeWord(decade) })).join(' + '),
    })
  }
  return t(`xi.challenge.${challenge}` as MessageKey)
}

/** What choosing a rule does to the sheet's decades: a decade mission opens on one. */
function withChallenge(current: Sheet, next: ChallengeId): Sheet {
  return { ...current, challenge: next, decades: next === 'span' ? [...SPAN_DEFAULT] : [], prompt: null, forbidden: [] }
}

const REFUSAL_KEY: Record<Refusal, MessageKey> = {
  'no-record': 'xi.challenge.hidden.noRecord',
  'other-side': 'xi.challenge.hidden.otherSide',
  era: 'xi.challenge.hidden.era',
  undated: 'xi.challenge.hidden.undated',
  'decade-taken': 'xi.challenge.hidden.decadeTaken',
  'no-cup': 'xi.challenge.hidden.noCup',
  forbidden: 'xi.challenge.hidden.forbidden',
}

export function XIBuilder({
  formations,
  roster,
  shirts,
  wardrobe,
  slugAliases,
  tab: initialTab = 'best',
  embedded,
  cupYears = {},
  promptLink = null,
}: {
  formations: Formation[]
  roster: RosterIndex
  shirts: ShirtBoard
  /**
   * Every man's REAL shirt (delta 88, `lib/kit/playerShirt.ts`) — keyed by slug and by
   * `slug@version`. Optional: a caller without it (THE WORKER LIFE) gets the engine drawings.
   */
  wardrobe?: Wardrobe
  /** slugs a reviewed merge retired → the id they now belong to (`pickerRoster().slugAliases`) */
  slugAliases: Readonly<Record<string, string>>
  /** which tab the link asked for — `/xi?tab=worst` (see `lib/share/copy.ts`) */
  tab?: XITab
  /**
   * roster slug → the opening years of the seasons the club lifted a cup with him in the squad
   * (Player Master `spells[].titles`, cup competitions only) — what "גביעים בלבד" enforces
   */
  cupYears?: Readonly<Record<string, readonly number[]>>
  /** `/xi?prompt=<seed>&r=<cursor>` — a Manager Prompt somebody handed over (never picks) */
  promptLink?: { seed: number; cursor: number } | null
  /**
   * Opened from inside THE WORKER LIFE — the living room, Kobi with the paper. One sheet (the
   * best), over the men who had worn the shirt before the life's year; nothing read from or
   * written to the device's saved elevens, no deed, no poster and no share. When eleven are
   * on the pitch the eleven go back to the sofa.
   */
  embedded?: Omit<Embedded<{ picks: RosterEntry[] }>, 'window'>
}) {
  const [tab, setTab] = useState<XITab>(initialTab)
  const [sheets, setSheets] = useState<Record<XITab, Sheet>>({
    best: emptySheet(formations[0] as Formation),
    worst: emptySheet(formations[0] as Formation),
  })
  /** the slot the drawer is aimed at — the whole "position first" mechanic */
  const [selected, setSelected] = useState<string | null>(null)
  const [drawer, setDrawer] = useState<'slot' | 'twelfth' | 'cut' | null>(null)
  const [swapFrom, setSwapFrom] = useState<string | null>(null)
  const [order, setOrder] = useState<ScoutOrder>('fit')
  const [fitOnly, setFitOnly] = useState(true)
  const [undo, setUndo] = useState<Undo | null>(null)
  const [poster, setPoster] = useState(false)
  const [ready, setReady] = useState(false)
  /** saved references no id answers to — said on screen, never dropped silently */
  const [lost, setLost] = useState<string[]>([])
  const wide = useWide()
  /** the phone stage (delta 87) — under 768px the drawer is the card picker, never the docked one */
  const phone = useWide('(max-width: 767px)')
  const [mobileSheet, setMobileSheet] = useState<'setup' | 'bench' | 'shortlist' | 'share' | null>(null)
  /** the phone rail's era chip — it also picks the version (and so the shirt) a man comes as */
  const [railEra, setRailEra] = useState<number | null>(null)
  /** the rail's "full list" — the searchable, filterable sheet, for the power user */
  const [fullList, setFullList] = useState(false)
  /** the voice's micro line after a placement ("נכנס להרכב.") — shown for a beat, then gone */
  const [said, setSaid] = useState<string | null>(null)
  const saidTimer = useRef<number | null>(null)
  const sayPicked = useCallback(() => {
    setSaid(voiceAction(1, 'picked'))
    if (saidTimer.current !== null) window.clearTimeout(saidTimer.current)
    saidTimer.current = window.setTimeout(() => setSaid(null), 1600)
  }, [])
  useEffect(() => () => {
    if (saidTimer.current !== null) window.clearTimeout(saidTimer.current)
  }, [])

  const store = useMemo(() => activeXI(), [])
  const byId = useMemo(
    () => new Map(roster.all.map((entry) => [rosterKey(entry), entry])),
    [roster.all],
  )

  /**
   * Read the device's sheets once, then write on every change. The read has to land
   * before the first write or an empty pitch overwrites a saved eleven on mount.
   */
  useEffect(() => {
    let alive = true
    if (embedded) {
      setReady(true)
      return
    }
    const resolve = refResolver({ roster: roster.all, slugAliases })
    void store.read().then((book) => {
      if (!alive) return
      const missing: string[] = []
      const found: Partial<Record<XITab, Sheet>> = {}
      for (const key of XI_TABS) {
        const saved = book[key]
        if (!saved) continue
        const migrated = migrateSheet(saved, resolve)
        missing.push(...migrated.unresolved)
        const restored = restore(migrated.sheet, formations)
        if (!restored) continue
        const picks: Record<string, RosterEntry> = {}
        for (const [slot, id] of Object.entries(restored.picks)) {
          const entry = byId.get(id)
          if (entry) picks[slot] = entry
        }
        const versions: Record<string, string> = {}
        for (const [slot, id] of Object.entries(restored.versions)) {
          if (picks[slot]) versions[slot] = id
        }
        found[key] = {
          formation: restored.formation,
          picks,
          versions,
          captain: restored.captain !== null && picks[restored.captain] ? restored.captain : null,
          twelfth: restored.twelfth ? (byId.get(restored.twelfth) ?? null) : null,
          cut: restored.cut ? (byId.get(restored.cut) ?? null) : null,
          shortlist: restored.shortlist
            .map((id) => byId.get(id))
            .filter((entry): entry is RosterEntry => entry !== undefined),
          challenge: restored.challenge,
          decades: restored.decades,
          prompt: restored.prompt,
          forbidden: restored.forbidden,
        }
      }
      setSheets((current) => ({ ...current, ...found }))
      setLost(missing)
      setReady(true)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once, on mount
  }, [])

  const sheet = sheets[tab]

  /** What the store keeps — ids only — and what the deed's fingerprint is taken of. */
  const payload = useMemo(
    () => ({
      formation: sheet.formation.name,
      picks: Object.fromEntries(Object.entries(sheet.picks).map(([slot, entry]) => [slot, rosterKey(entry)])),
      versions: sheet.versions,
      ...(sheet.captain !== null ? { captain: sheet.captain } : {}),
      ...(sheet.twelfth ? { twelfth: rosterKey(sheet.twelfth) } : {}),
      ...(sheet.cut ? { cut: rosterKey(sheet.cut) } : {}),
      shortlist: sheet.shortlist.map((entry) => rosterKey(entry)),
      ...(sheet.challenge !== 'free' ? { challenge: sheet.challenge } : {}),
      ...(sheet.challenge === 'span' && sheet.decades.length > 0 ? { decades: sheet.decades } : {}),
      ...(sheet.prompt ? { prompt: sheet.prompt } : {}),
      ...(sheet.forbidden.length > 0 ? { forbidden: sheet.forbidden } : {}),
    }),
    [sheet],
  )

  useEffect(() => {
    if (!ready || embedded) return
    void store.save(tab, payload)
  }, [embedded, ready, tab, payload, store])

  const chosen = Object.keys(sheet.picks).length
  /** id → name for the comparison — the challenger's picks come back as hashes (§44) */
  const rosterNames = useMemo(() => Object.fromEntries(roster.all.map((entry) => [rosterKey(entry), entry.nameHe])), [roster.all])

  /*
   * מעשה — a wing has no round, so a full eleven is its deed. Reported through the
   * progress layer's `emit` with the sheet's fingerprint, and only when that fingerprint
   * CHANGED — against the last one reported here and against the one the profile already
   * holds — so reopening yesterday's eleven is not a deed, and one changed man is.
   */
  const lastMark = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || chosen < 11 || embedded) return
    // The shortlist is the argument, not the thing made — it is left out of the mark.
    const made = { ...payload, shortlist: undefined }
    const mark = markOf({ tab, ...made })
    if (mark === lastMark.current) return
    lastMark.current = mark
    if (readProfile().deeds['/xi']?.mark === mark) return
    emit({ type: 'deed', gate: '/xi', mark })
    haptic('lock')
    firePickFx(window.innerWidth / 2, window.innerHeight / 2, { label: voiceAction(1, 'picked') ?? '', big: true, haptic: 'lock' })
  }, [embedded, ready, chosen, payload, tab])

  const takenKeys = useMemo(
    () => new Set(Object.values(sheet.picks).map((entry) => rosterKey(entry))),
    [sheet.picks],
  )
  const shortlisted = useMemo(
    () => new Set(sheet.shortlist.map((entry) => rosterKey(entry))),
    [sheet.shortlist],
  )

  const patch = useCallback(
    (change: (current: Sheet) => Sheet) => {
      setSheets((all) => ({ ...all, [tab]: change(all[tab]) }))
    },
    [tab],
  )

  /* --------------------------------------------------------------- the spells */

  const spellsOf = useCallback(
    (entry: RosterEntry): Spell[] => spellsFor(entry, shirts.versions[entry.slug]),
    [shirts.versions],
  )

  /** What a rule knows about the man himself — his cup seasons, and whether he is one of the forbidden five. */
  const manOf = useCallback(
    (entry: RosterEntry): ManFacts => ({
      cupYears: cupYears[entry.slug],
      forbidden: sheet.forbidden.includes(rosterKey(entry)),
    }),
    [cupYears, sheet.forbidden],
  )

  /** The spell this slot's man stands for — his chosen version, or his only spell. */
  const spellAt = useCallback(
    (slotId: string): Spell | null => {
      const entry = sheet.picks[slotId]
      if (!entry) return null
      const spells = spellsOf(entry)
      const id = sheet.versions[slotId]
      return spells.find((spell) => spell.id === id) ?? (spells[0] as Spell)
    },
    [sheet.picks, sheet.versions, spellsOf],
  )

  /** The season of a spell's shirt: the version's own, or his whole-career shirt. */
  const seasonForSpell = useCallback(
    (entry: RosterEntry, spell: Spell | null): string | null => {
      const list = shirts.versions[entry.slug]
      if (list && spell && spell.id !== '') {
        const found = list.find((version) => version.id === spell.id)
        if (found) return found.seasonLabel
      }
      return shirts.bySlug[entry.slug]?.seasonLabel ?? null
    },
    [shirts],
  )

  const seasonOf = useCallback(
    (slotId: string): string | null => {
      const entry = sheet.picks[slotId]
      return entry ? seasonForSpell(entry, spellAt(slotId)) : null
    },
    [sheet.picks, seasonForSpell, spellAt],
  )

  /** The sheet as a rule reads it, in pitch order. */
  const rows = useMemo<SheetRow[]>(
    () =>
      sheet.formation.slots
        .filter((slot) => sheet.picks[slot.slotId])
        .map((slot) => ({
          slotId: slot.slotId,
          spell: spellAt(slot.slotId) as Spell,
          status: slotStatusOf(sheet.picks[slot.slotId] as RosterEntry),
          man: manOf(sheet.picks[slot.slotId] as RosterEntry),
        })),
    [sheet.formation, sheet.picks, spellAt, manOf],
  )
  const verdict = useMemo(
    () => challengeStatus(sheet.challenge, rows, 11, { allowedDecades: sheet.decades }),
    [sheet.challenge, sheet.decades, rows],
  )
  const broken = useMemo(() => new Set(verdict.broken), [verdict.broken])

  /* ------------------------------------------------------------- the mechanics */

  const slotById = useMemo(
    () => new Map(sheet.formation.slots.map((slot) => [slot.slotId, slot])),
    [sheet.formation],
  )
  const openSlot = selected === null ? null : (slotById.get(selected) ?? null)

  /** Why the challenge refuses this man for the open slot, or null. Twelfth and cut are free. */
  const refuse = useCallback(
    (entry: RosterEntry): Refusal | null => {
      if (drawer !== 'slot' || sheet.challenge === 'free') return null
      const answer = chooseSpell(
        sheet.challenge,
        spellsOf(entry),
        slotStatusOf(entry),
        {},
        takenDecades(rows, selected),
        manOf(entry),
        { allowedDecades: sheet.decades },
      )
      return answer.ok ? null : answer.why
    },
    [drawer, sheet.challenge, sheet.decades, spellsOf, rows, selected, manOf],
  )

  /** The spell a pick would stand for under the drawer's filters and the challenge. */
  const spellFor = useCallback(
    (entry: RosterEntry, filter: RosterFilter): Spell | null => {
      const answer = chooseSpell(
        drawer === 'slot' ? sheet.challenge : 'free',
        spellsOf(entry),
        slotStatusOf(entry),
        { year: filter.year, decade: filter.decade, fallbackId: shirts.defaultVersion[entry.slug] ?? null },
        drawer === 'slot' ? takenDecades(rows, selected) : new Set(),
        manOf(entry),
        { allowedDecades: sheet.decades },
      )
      return answer.ok ? answer.spell : null
    },
    [drawer, sheet.challenge, sheet.decades, spellsOf, shirts.defaultVersion, rows, selected, manOf],
  )

  const rowInfo = useCallback(
    (entry: RosterEntry, filter: RosterFilter): RowInfo => {
      const spell = spellFor(entry, filter) ?? spellsOf(entry)[0] ?? null
      const season = seasonForSpell(entry, spell)
      const kit = season ? (shirts.seasons[season] ?? null) : null
      return {
        years: spell ? spanOf(spell) : null,
        kit: kit?.spec ?? null,
        kitSeason: kit?.seasonLabel ?? null,
        look: wardrobeLook(wardrobe, entry, spell),
      }
    },
    [spellFor, spellsOf, seasonForSpell, shirts.seasons, wardrobe],
  )

  /** The shirt a man wears as a given spell — his REAL one where the wardrobe has it (delta 88). */
  const lookFor = useCallback(
    (entry: RosterEntry, spell: Spell | null): ShirtLook => {
      const found = wardrobeLook(wardrobe, entry, spell)
      if (found) return found
      const season = seasonForSpell(entry, spell)
      const kit = season ? shirts.seasons[season] : undefined
      return { kind: 'engine', spec: kit?.spec ?? NEUTRAL_SHIRT_SPEC, seasonLabel: kit?.seasonLabel ?? '', approx: false }
    },
    [wardrobe, seasonForSpell, shirts.seasons],
  )

  const lookAt = useCallback(
    (slotId: string): ShirtLook | null => {
      const entry = sheet.picks[slotId]
      return entry ? lookFor(entry, spellAt(slotId)) : null
    },
    [sheet.picks, lookFor, spellAt],
  )

  /** Exchange whoever stands in `from` and `to` — a tapped swap and a dragged one both land here. */
  function swapSlots(from: string, to: string) {
    if (from === to) return
    patch((current) => {
      const picks = { ...current.picks }
      const versions = { ...current.versions }
      const there = picks[to]
      const here = picks[from]
      if (here) picks[to] = here
      else delete picks[to]
      if (there) picks[from] = there
      else delete picks[from]
      const versionHere = versions[from]
      const versionThere = versions[to]
      if (versionHere) versions[to] = versionHere
      else delete versions[to]
      if (versionThere) versions[from] = versionThere
      else delete versions[from]
      const captain = current.captain === from ? to : current.captain === to ? from : current.captain
      return { ...current, picks, versions, captain }
    })
    haptic('tap')
    firePickFxAt(document.querySelector(`[data-drop="${to}"]`), { tone: 'ink' })
  }

  function tapSlot(slot: PitchSlot) {
    // A swap in progress owns the next tap: the second slot is the destination, and
    // tapping the same one again is how you change your mind.
    if (swapFrom !== null) {
      const from = swapFrom
      setSwapFrom(null)
      setSelected(slot.slotId)
      swapSlots(from, slot.slotId)
      return
    }
    setSelected(slot.slotId)
    // One tap reaches the drawer when the shirt is empty; a filled shirt opens the slot's
    // own strip instead — tapping a man you placed never deletes him.
    if (!sheet.picks[slot.slotId]) setDrawer('slot')
    else if (drawer === 'slot') setDrawer(null)
  }

  /** A card dropped straight on a slot — the mobile draft rail's drag-up (delta 87). */
  function placeAt(slotId: string, entry: RosterEntry, filter: RosterFilter) {
    if (!slotById.has(slotId)) return
    const answer = chooseSpell(
      sheet.challenge,
      spellsOf(entry),
      slotStatusOf(entry),
      { year: filter.year, decade: filter.decade, fallbackId: shirts.defaultVersion[entry.slug] ?? null },
      takenDecades(rows, slotId),
      manOf(entry),
      { allowedDecades: sheet.decades },
    )
    if (!answer.ok) {
      haptic('miss')
      return
    }
    patch((current) => {
      const versions = { ...current.versions }
      if (answer.spell.id !== '') versions[slotId] = answer.spell.id
      else delete versions[slotId]
      return { ...current, picks: { ...current.picks, [slotId]: entry }, versions }
    })
    advanceFrom(slotId)
    haptic('tap')
    sayPicked()
    window.setTimeout(() => firePickFxAt(document.querySelector(`[data-drop="${slotId}"]`), { label: compactName(entry.nameHe) }), 0)
  }

  /**
   * After a placement: on the phone the rail stays open and moves to the NEXT empty slot
   * (formation order), so eleven picks are eleven taps; the last one closes it. Elsewhere
   * a placement closes back to the pitch, as it always did.
   */
  function advanceFrom(slotId: string) {
    const next = phone ? sheet.formation.slots.find((slot) => slot.slotId !== slotId && !sheet.picks[slot.slotId]) : undefined
    if (next) {
      setSelected(next.slotId)
      setDrawer('slot')
      return
    }
    setDrawer(null)
    setSelected(null)
  }

  function place(entry: RosterEntry, filter: RosterFilter = NO_FILTER, from: Element | null = null) {
    if (drawer === 'twelfth') {
      patch((current) => ({ ...current, twelfth: entry }))
      setDrawer(null)
      haptic('tap')
      firePickFx(window.innerWidth / 2, window.innerHeight / 2, { label: compactName(entry.nameHe) })
      return
    }
    if (drawer === 'cut') {
      patch((current) => ({ ...current, cut: entry }))
      setDrawer(null)
      haptic('tap')
      firePickFx(window.innerWidth / 2, window.innerHeight / 2, { label: compactName(entry.nameHe), tone: 'sign' })
      return
    }
    if (selected === null) return
    const spell = spellFor(entry, filter)
    if (spell === null) {
      haptic('miss')
      return
    }
    const slotId = selected
    patch((current) => {
      const versions = { ...current.versions }
      if (spell.id !== '') versions[slotId] = spell.id
      else delete versions[slotId]
      return { ...current, picks: { ...current.picks, [slotId]: entry }, versions }
    })
    // A placement never re-opens as the filled-slot sheet (captain/replace/swap/remove).
    // That sheet is only for a tap on an ALREADY-filled shirt (round 2, Maor 23.9.2026).
    advanceFrom(slotId)
    haptic('tap')
    sayPicked()
    // every placement carries the stamp — one hit, wherever the pick came from (delta 87);
    // from the rail, the shirt first FLIES into the slot (delta 88)
    if (from) flyShirt(from, `[data-drop="${slotId}"]`, compactName(entry.nameHe))
    else window.setTimeout(() => firePickFxAt(document.querySelector(`[data-drop="${slotId}"]`), { label: compactName(entry.nameHe) }), 0)
  }

  function remove(slotId: string) {
    const entry = sheet.picks[slotId]
    if (!entry) return
    setUndo({ slotId, entry, versionId: sheet.versions[slotId] })
    haptic('miss')
    patch((current) => {
      const picks = { ...current.picks }
      const versions = { ...current.versions }
      delete picks[slotId]
      delete versions[slotId]
      return { ...current, picks, versions, captain: current.captain === slotId ? null : current.captain }
    })
  }

  function undoRemoval() {
    if (!undo) return
    const { slotId, entry, versionId } = undo
    patch((current) => {
      const versions = { ...current.versions }
      if (versionId) versions[slotId] = versionId
      return { ...current, picks: { ...current.picks, [slotId]: entry }, versions }
    })
    setUndo(null)
  }

  function toggleShortlist(entry: RosterEntry) {
    const key = rosterKey(entry)
    patch((current) => ({
      ...current,
      shortlist: current.shortlist.some((row) => rosterKey(row) === key)
        ? current.shortlist.filter((row) => rosterKey(row) !== key)
        : [...current.shortlist, entry],
    }))
  }

  function changeFormation(option: Formation) {
    setSelected(null)
    setSwapFrom(null)
    // The picks move with the shape where the slot ids agree and are dropped where they
    // do not — a defender who wakes up on the wing is worse than an empty slot.
    patch((current) => {
      const slots = new Set(option.slots.map((slot) => slot.slotId))
      const picks: Record<string, RosterEntry> = {}
      const versions: Record<string, string> = {}
      for (const [slotId, entry] of Object.entries(current.picks)) {
        if (!slots.has(slotId)) continue
        picks[slotId] = entry
        const version = current.versions[slotId]
        if (version) versions[slotId] = version
      }
      return {
        ...current,
        formation: option,
        picks,
        versions,
        captain: current.captain !== null && picks[current.captain] ? current.captain : null,
      }
    })
  }

  const dna = useMemo(
    () =>
      xiDna(
        rows.map((row) => ({
          fromYear: row.spell.fromYear,
          origin: row.status === 'unknown' ? null : row.status,
        })),
        sheet.formation.name,
      ),
    [rows, sheet.formation.name],
  )

  const worst = tab === 'worst'
  const occupant = selected === null ? undefined : sheet.picks[selected]
  const slotVersions = occupant ? (shirts.versions[occupant.slug] ?? []) : []

  const describeHidden = useCallback(
    (counts: Readonly<Record<string, number>>): string | null => {
      const parts = (Object.keys(REFUSAL_KEY) as Refusal[])
        .filter((why) => (counts[why] ?? 0) > 0)
        .map((why) => t(REFUSAL_KEY[why], { n: String(counts[why]) }))
      if (parts.length === 0) return null
      return `${t('xi.challenge.hidden', { rule: ruleLabel(sheet.challenge, sheet.decades) })} ${parts.join(' · ')}`
    },
    [sheet.challenge, sheet.decades],
  )

  const drawerNode = drawer && !phone ? (
    <RosterSheet
      key={`${drawer}-${selected ?? ''}`}
      docked={wide}
      title={
        drawer === 'twelfth'
          ? t('xi.bench.twelfth')
          : drawer === 'cut'
            ? t('xi.bench.cut')
            : (openSlot?.roleHe ?? t('xi.tip.pick'))
      }
      roster={roster}
      taken={takenKeys}
      onPick={place}
      onClose={() => setDrawer(null)}
      scout={
        drawer === 'slot' && openSlot
          ? {
              role: openSlot.role,
              roleHe: openSlot.roleHe,
              order,
              onOrder: setOrder,
              fitOnly,
              onFitOnly: setFitOnly,
              shortlist: shortlisted,
              onShortlist: toggleShortlist,
              shortlistEntries: sheet.shortlist,
              mini: { slots: sheet.formation.slots, active: openSlot.slotId },
              refuse: sheet.challenge === 'free' ? undefined : refuse,
              describeHidden,
              rowInfo,
            }
          : undefined
      }
      footer={
        drawer === 'slot' && worst ? (
          <p className="mt-2 border-hair border-ink/40 bg-paper px-3 py-2 font-body text-[11px] leading-snug text-ink">
            {t('xi.worst.drawer')}
          </p>
        ) : undefined
      }
    />
  ) : null

  /**
   * רכבת החולצות בנייד (delta 88, Maor 24.9.2026 — "הבחירת שחקנים לא נוחה"): the phone
   * picks from `PickRail`, docked UNDER the pitch instead of a sheet over it — the slot
   * stays in view, the rail is already narrowed to its position, every man is his real
   * shirt, a tap flies him in and a drag up drops him anywhere. The same rail is gate 3's.
   * "רשימה מלאה" opens the full searchable sheet (filters, sort, shortlist) for the power
   * user — only one of the two ever mounts, so there is never a second `role="dialog"`.
   */
  const railFilter: RosterFilter = useMemo(() => ({ ...NO_FILTER, decade: railEra ?? 'any' }), [railEra])
  const railOpen = phone && drawer !== null && !fullList
  const railItems = useMemo<RailItem[]>(() => {
    if (!railOpen) return []
    let pool: RosterEntry[] = roster.all
    if (drawer === 'slot' && openSlot) {
      if (refuse && sheet.challenge !== 'free') pool = pool.filter((entry) => refuse(entry) === null)
      const groups = scoutGroups(pool, openSlot.role, order, fitOnly)
      pool = [...groups.fit, ...groups.other, ...groups.unknown] as RosterEntry[]
    }
    return pool.map((entry) => {
      const spell = (drawer === 'slot' ? spellFor(entry, railFilter) : null) ?? spellsOf(entry)[0] ?? null
      const foreign = slotStatusOf(entry) === 'foreign'
      return {
        key: rosterKey(entry),
        family: compactName(entry.nameHe),
        given: entry.givenHe,
        years: spell ? spanOf(spell) : null,
        look: lookFor(entry, spell),
        taken: takenKeys.has(rosterKey(entry)),
        decades: decadesOf(entry),
        search: [entry.nameHe, ...(entry.aliasesHe ?? [])].join(' '),
        badge: foreign ? (
          <span className="block bg-sign px-1 py-[1px] font-body text-[9px] font-extrabold leading-none text-paper">
            {t('scout.badge.foreign')}
          </span>
        ) : undefined,
      }
    })
  }, [railOpen, roster.all, drawer, openSlot, refuse, sheet.challenge, order, fitOnly, spellFor, railFilter, spellsOf, lookFor, takenKeys])

  const railNode = railOpen ? (
    <PickRail
      key={drawer}
      target={
        drawer === 'twelfth' ? t('xi.bench.twelfth') : drawer === 'cut' ? t('xi.bench.cut') : (openSlot?.roleHe ?? t('xi.tip.pick'))
      }
      targetSub={drawer === 'slot' ? `${chosen}/11` : undefined}
      items={railItems}
      era={railEra}
      onEra={setRailEra}
      chips={
        drawer === 'slot' && openSlot
          ? [
              {
                key: 'fit',
                label: t('pick.rail.fitOnly', { role: openSlot.roleHe }),
                pressed: fitOnly,
                onClick: () => setFitOnly(!fitOnly),
              },
            ]
          : []
      }
      extra={
        <button
          type="button"
          onClick={() => setFullList(true)}
          aria-label={t('pick.rail.list')}
          className="grid min-h-tap w-tap shrink-0 place-items-center border-hair border-ink/40 font-mono text-[16px] leading-none text-ink"
        >
          <span aria-hidden="true">≡</span>
        </button>
      }
      onPick={(key, shirt) => {
        const entry = byId.get(key)
        if (entry) place(entry, railFilter, shirt)
      }}
      onDrop={drawer === 'slot' ? (zone, key) => {
        const entry = byId.get(key)
        if (entry) placeAt(zone, entry, railFilter)
      } : undefined}
      onClose={() => {
        setDrawer(null)
        setSelected(null)
      }}
    />
  ) : null

  const mobileDrawerNode = drawer && phone && fullList ? (
    <RosterSheet
      key={`m-${drawer}-${selected ?? ''}`}
      title={
        drawer === 'twelfth'
          ? t('xi.bench.twelfth')
          : drawer === 'cut'
            ? t('xi.bench.cut')
            : (openSlot?.roleHe ?? t('xi.tip.pick'))
      }
      roster={roster}
      taken={takenKeys}
      onPick={(entry, filter) => {
        setFullList(false)
        place(entry, filter)
      }}
      onClose={() => setFullList(false)}
      scout={
        drawer === 'slot' && openSlot
          ? {
              role: openSlot.role,
              roleHe: openSlot.roleHe,
              order,
              onOrder: setOrder,
              fitOnly,
              onFitOnly: setFitOnly,
              shortlist: shortlisted,
              onShortlist: toggleShortlist,
              shortlistEntries: sheet.shortlist,
              mini: { slots: sheet.formation.slots, active: openSlot.slotId },
              refuse: sheet.challenge === 'free' ? undefined : refuse,
              describeHidden,
              rowInfo,
            }
          : undefined
      }
      footer={
        drawer === 'slot' && worst ? (
          <p className="mt-2 border-hair border-ink/40 bg-paper px-3 py-2 font-body text-[11px] leading-snug text-ink">
            {t('xi.worst.drawer')}
          </p>
        ) : undefined
      }
    />
  ) : null

  /* the phone opens ON the rail, aimed at the first empty slot: the first thing a
     supporter sees is shirts to pick, not an instruction (delta 88) */
  const autoOpened = useRef(false)
  useEffect(() => {
    if (!ready || !phone || autoOpened.current) return
    autoOpened.current = true
    if (drawer !== null || selected !== null) return
    const empty = sheet.formation.slots.find((slot) => !sheet.picks[slot.slotId])
    if (empty) {
      setSelected(empty.slotId)
      setDrawer('slot')
    }
  }, [ready, phone, drawer, selected, sheet.formation.slots, sheet.picks])

  /** Rule 19: the ONE share system — the same row in the dock, on the desktop and under "שלח ליציע". */
  const shareRoute = !worst && sheet.prompt ? `/xi?${promptQuery(sheet.prompt.seed, sheet.prompt.cursor)}` : undefined
  // Gate 1's challenge (§10): the PROMPT travels (`/xi?prompt=<seed>&r=`), never the picks;
  // the eleven ride along hashed so the comparison can be drawn once the friend has picked.
  const xiPicks = sheet.formation.slots.flatMap((slot) => {
    const entry = sheet.picks[slot.slotId]
    return entry ? [rosterKey(entry)] : []
  })
  const captainEntry = sheet.captain !== null ? sheet.picks[sheet.captain] : undefined
  const xiResult: ChallengeResult | null =
    !worst && xiPicks.length > 0
      ? { gate: 1, picks: xiPicks, captain: captainEntry ? rosterKey(captainEntry) : null, twelfth: sheet.twelfth ? rosterKey(sheet.twelfth) : null }
      : null
  const xiChallenge =
    xiResult === null
      ? undefined
      : {
          gate: 1 as const,
          ...(sheet.prompt ? { cursor: sheet.prompt.cursor, params: { prompt: String(sheet.prompt.seed) } } : {}),
          result: xiResult,
        }
  const shareNode = (
    <ShareRow
      // Gate 1 has its own `kind` and is in `SEEDLESS`; the worst eleven shares as its own
      // kind so the link opens the tab it is about and says whose opinion it is. A sheet
      // built under a Manager Prompt hands over the PROMPT (`?prompt=`), never the picks.
      kind={worst ? 'worst' : 'xi'}
      route={shareRoute}
      params={{ total: '11' }}
      headline={`${chosen}/11`}
      challenge={xiChallenge}
      card={{
        template: 'xi' as const,
        kicker: worst ? 'GATE 1 · WORST XI · ONE FAN’S OPINION' : 'GATE 1 · ALL-TIME XI',
        label: worst ? t('xi.tab.worst') : t('screen.xi.title'),
        eyebrow: sheet.formation.name,
        hero: worst ? t('xi.tab.worst') : t('screen.xi.title'),
        // The armband rides on the role line and the bench on the foot line — both are
        // lines the template already measures (rule 19), so nothing new is placed.
        xi: sheet.formation.slots
          .map((slot) => {
            const entry = sheet.picks[slot.slotId]
            if (!entry) return null
            const roleHe = sheet.captain === slot.slotId ? t('xi.card.captain', { role: slot.roleHe }) : slot.roleHe
            return { roleHe, nameHe: compactName(entry.nameHe), x: slot.x, y: slot.y }
          })
          .filter((slot): slot is NonNullable<typeof slot> => slot !== null),
        stats: [],
        cta: worst ? t('xi.worst.cta') : t('xi.cta'),
        challenge: worst ? t('xi.worst.opinion') : benchLine(sheet.twelfth, sheet.cut) ?? t('share.sameRound'),
      }}
    />
  )

  /* ------------------------------------------------ the Manager Prompt (§10) */

  /** "the five you picked before" — this sheet's first five, in pitch order, as it stands now */
  const priorFive = useMemo(
    () =>
      forbiddenFive(
        Object.fromEntries(Object.entries(sheet.picks).map(([slot, entry]) => [slot, rosterKey(entry)])),
        sheet.formation.slots.map((slot) => slot.slotId),
      ),
    [sheet.picks, sheet.formation.slots],
  )
  /** A prompt this device cannot compute is skipped, never faked (lib/xi/prompt.ts). */
  const canPrompt = useCallback(
    (id: PromptId) => {
      if (id === 'fresh5') return priorFive.length >= FRESH_COUNT
      if (id === 'cups') return Object.keys(cupYears).length > 0
      return true
    },
    [priorFive, cupYears],
  )
  const [offer, setOffer] = useState<{ seed: number; cursor: number; id: PromptId; linked: boolean } | null>(null)
  useEffect(() => {
    if (!ready || embedded || offer) return
    if (promptLink) {
      const dealt = dealPrompt(promptLink.seed, promptLink.cursor, canPrompt)
      if (dealt) setOffer({ seed: promptLink.seed, ...dealt, linked: true })
      return
    }
    const rotation = rotationFor(PROMPT_DECK, mintSeed)
    const dealt = dealPrompt(rotation.seed, rotation.cursor, canPrompt)
    if (dealt) setOffer({ seed: rotation.seed, ...dealt, linked: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deal once, after the saved sheet is read
  }, [ready])
  const activePrompt: PromptId | null = sheet.prompt ? promptAt(sheet.prompt.seed, sheet.prompt.cursor) : null

  function acceptPrompt() {
    if (!offer) return
    const { id, seed, cursor } = offer
    patch((current) => ({
      ...current,
      challenge: PROMPT_RULE[id],
      prompt: { seed, cursor },
      forbidden: id === 'fresh5' ? priorFive : [],
    }))
    // the device's deck moves past what it was just handed, so the next visit asks something new
    if (!offer.linked) {
      const at = rotationFor(PROMPT_DECK, mintSeed).cursor
      for (let step = at; step <= cursor; step++) advanceRotation(PROMPT_DECK, mintSeed)
    }
    haptic('lock')
  }

  function otherPrompt() {
    if (!offer) return
    const dealt = dealPrompt(offer.seed, offer.cursor + 1, canPrompt)
    if (dealt) setOffer({ ...offer, ...dealt })
    haptic('tap')
  }

  function dropPrompt() {
    patch((current) => withChallenge(current, 'free'))
    haptic('tap')
  }

  const promptCard =
    embedded || worst || (!activePrompt && !offer) ? null : (
      <PromptCard
        id={activePrompt ?? (offer?.id as PromptId)}
        active={activePrompt !== null}
        linked={activePrompt === null && Boolean(offer?.linked)}
        onAccept={acceptPrompt}
        onOther={otherPrompt}
        onDrop={dropPrompt}
      />
    )

  /* ------------------------------------------------ the result (§6, Universal Exit) */

  const spoken = voice({ gate: 1, moment: 'result', result: 'done', seed: markOf(payload) })
  const [next, setNext] = useState<NextAction[]>([])
  const exitMark = useRef<string | null>(null)
  useEffect(() => {
    if (!poster || worst || embedded || chosen < 11) return
    const mark = markOf(payload)
    if (exitMark.current === mark) return
    exitMark.current = mark
    track('run_complete', { detail: 'xi', value: chosen })
    const ids = [
      sheet.captain ? sheet.picks[sheet.captain]?.id : undefined,
      sheet.twelfth?.id,
      sheet.cut?.id,
    ].filter((id): id is string => typeof id === 'string')
    let live = true
    nextAfterXI({
      context: {
        gateId: 1,
        runId: sheet.prompt ? `${sheet.prompt.seed}:${sheet.prompt.cursor}` : undefined,
        playerIds: ids,
        choices: { formation: sheet.formation.name, ...(activePrompt ? { prompt: activePrompt } : {}) },
      },
    })
      .then((answer) => {
        if (live) setNext(answer.next)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [poster, worst, embedded, chosen, payload, sheet, activePrompt])

  // §10 — the gate opens on a line, not on controls: "תן את ההפועל שלך." and its first move
  const intro = voice({ gate: 1, moment: 'intro', seed: XI_OPENING })
  const primaryLabel = chosen >= 11 ? t('xi.stage.finish') : chosen === 0 ? (intro.ctaPrimary ?? intro.title) : t('xi.stage.fillNext')

  function primaryAction() {
    if (chosen >= 11) {
      setPoster(true)
      return
    }
    const empty = sheet.formation.slots.find((slot) => !sheet.picks[slot.slotId])
    if (empty) tapSlot(empty)
  }

  return (
    <>
      {/* ================================================================ the phone stage
          Maor, 23.9.2026: "too long in an un-fun way… remove the squares around the
          shirts… improve the player selection into a much more fun form." One screen:
          a one-line HUD, the pitch filling the rest (ShirtToken, no tiles), a dock. */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex shrink-0 items-center gap-1.5 pb-1">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          <div role="tablist" aria-label={t('xi.tabs')} className={embedded ? 'hidden' : 'flex shrink-0 gap-1'}>
            {XI_TABS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={tab === option}
                onClick={() => {
                  setTab(option)
                  setSelected(null)
                  setSwapFrom(null)
                  setUndo(null)
                  setDrawer(null)
                  setMobileSheet(null)
                }}
                className={`min-h-[34px] shrink-0 border-hair px-2.5 font-sign text-[12px] leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
                  tab === option ? 'border-ink bg-ink text-paper' : 'border-ink/40 text-ink'
                }`}
              >
                {t(`xi.tab.${option}` as MessageKey)}
              </button>
            ))}
          </div>
          {!embedded && (
            <button
              type="button"
              onClick={() => setMobileSheet('setup')}
              className="flex min-h-[34px] shrink-0 items-center gap-1.5 border-hair border-ink/40 bg-paper px-2.5 font-body text-[11.5px] font-extrabold text-ink"
            >
              <bdi dir="ltr">{sheet.formation.name}</bdi>
              {sheet.challenge !== 'free' && <span aria-hidden="true" className="text-red">●</span>}
              <span aria-hidden="true">⚙</span>
            </button>
          )}
        </div>
          {/* the count sits OUTSIDE the scrolling chips, so it is never cut off */}
          {said !== null && railNode && (
            <p aria-hidden="true" className="shrink-0 font-sign text-[11.5px] leading-none text-red">
              {said}
            </p>
          )}
          <p className="shrink-0 font-mono text-[13px] tracking-widest text-ink">
            <Num>{`${chosen}/11`}</Num>
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {said ?? ''}
        </p>
        {promptCard && (activePrompt !== null || offer?.linked) && <div className="mt-1 shrink-0">{promptCard}</div>}

        {worst && (
          <p className="mt-1 shrink-0 truncate border-hair border-ink/40 bg-sheet px-2.5 py-1 font-body text-[10.5px] leading-snug text-ink">
            {t('xi.worst.note')}
          </p>
        )}
        {lost.length > 0 && (
          <p className="mt-1 shrink-0 truncate border-s-rule border-red ps-2 font-body text-[10px] leading-snug text-ink">
            {t('xi.migrate.lost', { n: String(lost.length), refs: lost.join(' · ') })}
          </p>
        )}

        <FitBox ratio={0.75} className="mt-1.5">
          <XIPitchStage
            formation={sheet.formation}
            picks={sheet.picks}
            seasonOf={seasonOf}
            lookAt={lookAt}
            captain={sheet.captain}
            selected={selected}
            broken={broken}
            onTap={tapSlot}
            onSwap={swapSlots}
          />
        </FitBox>

        {railNode && <div className="mt-1.5 shrink-0">{railNode}</div>}

        {!railNode && (
        <p className="mt-1.5 shrink-0 truncate border-hair border-ink/30 bg-sheet px-2.5 py-1.5 font-body text-[11px] leading-snug text-ink">
          {said !== null
            ? said
            : swapFrom !== null
            ? t('xi.tip.swap')
            : chosen === 0 && !openSlot
              ? intro.title
              : openSlot
              ? `${openSlot.roleHe} · ${voiceAction(1, 'slot')}`
              : t('xi.tip.pick')}
        </p>
        )}

        <div className={`mt-1.5 shrink-0 items-center gap-1.5 ${railNode ? 'hidden' : 'flex'}`}>
          <button
            type="button"
            onClick={primaryAction}
            className="flex min-h-tap flex-1 items-center justify-center bg-red px-3 font-body text-step--1 font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none"
          >
            {primaryLabel}
          </button>
          {!embedded && (
            <>
              <DockChip label={t('xi.stage.bench')} onClick={() => setMobileSheet('bench')} />
              <DockChip label={`★ ${sheet.shortlist.length}`} onClick={() => setMobileSheet('shortlist')} />
              <DockChip label={t('stage.share')} onClick={() => setMobileSheet('share')} disabled={chosen === 0} />
            </>
          )}
          {embedded && (
            <button
              type="button"
              onClick={() => embedded.onResult({ picks: Object.values(sheet.picks) })}
              disabled={chosen < 11}
              data-xi="back-stage"
              className="min-h-tap shrink-0 border-rule border-ink bg-ink px-3 font-body text-[12px] font-extrabold text-paper disabled:opacity-40"
            >
              {embedded.doneLabel}
            </button>
          )}
        </div>

        {mobileDrawerNode}

        {/* the slot sheet — a filled shirt, tapped: armband, replace, swap, remove */}
        <SlideSheet
          open={selected !== null && Boolean(occupant) && drawer !== 'slot'}
          onClose={() => setSelected(null)}
          title={openSlot?.roleHe ?? ''}
          size="auto"
        >
          {openSlot && occupant && (
            <SlotDetail
              slot={openSlot}
              occupant={occupant}
              sheet={sheet}
              rows={rows}
              slotVersions={slotVersions}
              swapFrom={swapFrom}
              onCaptain={() => {
                haptic('lock')
                patch((current) => ({
                  ...current,
                  captain: current.captain === openSlot.slotId ? null : openSlot.slotId,
                }))
              }}
              onReplace={() => setDrawer('slot')}
              onSwap={() => {
                setSwapFrom(swapFrom === openSlot.slotId ? null : openSlot.slotId)
                setSelected(null)
              }}
              onRemove={() => {
                remove(openSlot.slotId)
                setSelected(null)
              }}
              onVersion={(id) => {
                haptic('tap')
                patch((current) => ({ ...current, versions: { ...current.versions, [openSlot.slotId]: id } }))
              }}
              manOf={manOf}
            />
          )}
        </SlideSheet>

        <SlideSheet open={mobileSheet === 'setup'} onClose={() => setMobileSheet(null)} title={t('xi.stage.setup')} size="half">
          {promptCard && !(activePrompt !== null || offer?.linked) && <div className="mb-3">{promptCard}</div>}
          <div>
            <p className="font-body text-[10.5px] font-extrabold tracking-wide text-muted">{t('xi.dock.formation')}</p>
            <div className="-mx-0.5 mt-1 flex gap-1 overflow-x-auto px-0.5 pb-1">
              {formations.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => changeFormation(option)}
                  aria-pressed={sheet.formation.name === option.name}
                  className={`min-h-tap shrink-0 border-hair px-3 font-mono text-step--1 tabular-nums transition-transform duration-press ease-stamp active:scale-[.95] motion-reduce:transition-none ${
                    sheet.formation.name === option.name ? 'border-red bg-red text-paper' : 'border-ink/40 text-ink'
                  }`}
                >
                  <bdi dir="ltr">{option.name}</bdi>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <ChallengePicker
              value={sheet.challenge}
              decades={sheet.decades}
              onDecades={(next) => patch((current) => ({ ...current, decades: next }))}
              onChange={(next) => {
                haptic('tap')
                patch((current) => withChallenge(current, next))
              }}
            />
          </div>
          <ChallengeLine verdict={verdict} decades={sheet.decades} picks={sheet.picks} slots={sheet.formation.slots} />
          <p className="mt-3 font-body text-[11px] leading-snug text-muted">
            {t('xi.dna.line', {
              spread: String(dna.spread),
              israeli: String(dna.origin.israeli),
              foreign: String(dna.origin.foreign),
            })}
          </p>
        </SlideSheet>

        <SlideSheet open={mobileSheet === 'bench'} onClose={() => setMobileSheet(null)} title={t('xi.stage.bench')} size="auto">
          <div className="grid gap-2">
            <BenchCard
              title={t('xi.bench.twelfth')}
              note={voiceAction(1, 'twelfth') ?? ''}
              entry={sheet.twelfth}
              onOpen={() => {
                setSelected(null)
                setDrawer('twelfth')
              }}
              onClear={() => patch((current) => ({ ...current, twelfth: null }))}
            />
            <BenchCard
              title={t('xi.bench.cut')}
              note={voiceAction(1, 'lastCut') ?? ''}
              entry={sheet.cut}
              onOpen={() => {
                setSelected(null)
                setDrawer('cut')
              }}
              onClear={() => patch((current) => ({ ...current, cut: null }))}
            />
          </div>
        </SlideSheet>

        <SlideSheet open={mobileSheet === 'shortlist'} onClose={() => setMobileSheet(null)} title={t('xi.shortlist.title')} size="auto">
          {sheet.shortlist.length === 0 ? (
            <p className="font-body text-[12px] leading-snug text-muted">{t('xi.shortlist.empty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {sheet.shortlist.map((entry) => (
                <li key={rosterKey(entry)} className="flex items-stretch">
                  <button
                    type="button"
                    disabled={selected === null || takenKeys.has(rosterKey(entry))}
                    onClick={() => {
                      if (selected === null) return
                      place(entry)
                      setMobileSheet(null)
                    }}
                    className="flex min-h-tap items-center border-hair border-ink/40 bg-paper px-2.5 font-body text-[11.5px] font-extrabold text-ink disabled:opacity-40"
                  >
                    <span aria-hidden="true" className="me-1">★</span>
                    {compactName(entry.nameHe)}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleShortlist(entry)}
                    aria-label={t('xi.shortlist.drop', { name: entry.nameHe })}
                    className="min-h-tap border-hair border-s-0 border-ink/40 bg-paper px-2 font-body text-[13px] leading-none text-muted"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected === null && sheet.shortlist.length > 0 && (
            <p className="mt-2 font-body text-[11px] leading-snug text-muted">{t('xi.draft.selectFirst')}</p>
          )}
        </SlideSheet>

        <SlideSheet open={mobileSheet === 'share'} onClose={() => setMobileSheet(null)} title={t('stage.share')} size="auto">
          {shareNode}
        </SlideSheet>
      </div>

      {/* ================================================================ desktop / tablet
          untouched design — the whole grid below md is never shown; `phone` above keeps
          the drawer from mounting twice. */}
      <div className="mt-stack hidden md:block">
      {/* the two sheets. Same pitch, same roster, same eleven slots. */}
      <div role="tablist" aria-label={t('xi.tabs')} className={embedded ? 'hidden' : 'flex gap-1.5'}>
        {XI_TABS.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={tab === option}
            onClick={() => {
              setTab(option)
              setSelected(null)
              setSwapFrom(null)
              setUndo(null)
              setDrawer(null)
            }}
            className={`min-h-tap flex-1 border-hair px-3 font-sign text-step--1 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none ${
              tab === option ? 'border-ink bg-ink text-paper' : 'border-ink/40 text-ink'
            }`}
          >
            {t(`xi.tab.${option}` as MessageKey)}
          </button>
        ))}
      </div>

      {/*
        The opinion line, on the screen and not only on the card. A tab called "the worst
        eleven of all time" is a sentence about named people; who is saying it has to be
        on the same screen as the names.
      */}
      {worst && (
        <p className="mt-2 border-hair border-ink/40 bg-sheet px-3 py-2 font-body text-[12px] leading-relaxed text-ink">
          {t('xi.worst.note')}
        </p>
      )}

      {lost.length > 0 && (
        <p className="mt-2 border-s-rule border-red bg-sheet px-3 py-2 font-body text-[11.5px] leading-snug text-ink">
          {t('xi.migrate.lost', { n: String(lost.length), refs: lost.join(' · ') })}
        </p>
      )}

      <div className="mt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {formations.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => changeFormation(option)}
                  aria-pressed={sheet.formation.name === option.name}
                  className={`min-h-tap border-hair px-3 font-mono text-step--1 tabular-nums transition-transform duration-press ease-stamp active:scale-[.95] motion-reduce:transition-none ${
                    sheet.formation.name === option.name ? 'border-red bg-red text-paper' : 'border-ink/40 text-ink'
                  }`}
                >
                  <bdi dir="ltr">{option.name}</bdi>
                </button>
              ))}
            </div>
            {/* One isolate around the whole ratio: two adjacent <bdi> runs reorder in RTL. */}
            <p className="font-body text-[11px] tracking-widest text-muted">
              <Num>{`${chosen}/11`}</Num>
            </p>
          </div>

          {/* ------------------------------------------- the Manager Prompt (§10) */}
          {promptCard && <div className="mt-3">{promptCard}</div>}

          {/* ----------------------------------------------------- the challenge */}
          {!embedded && (
          <ChallengePicker
            value={sheet.challenge}
            decades={sheet.decades}
            onDecades={(next) => patch((current) => ({ ...current, decades: next }))}
            onChange={(next) => {
              haptic('tap')
              patch((current) => withChallenge(current, next))
            }}
          />
          )}

          {/* the pitch */}
          <XIPitch
            className="mt-3"
            formation={sheet.formation}
            picks={sheet.picks}
            seasonOf={seasonOf}
            lookAt={lookAt}
            seasons={shirts.seasons}
            captain={sheet.captain}
            selected={selected}
            broken={broken}
            onTap={tapSlot}
          />

          <ChallengeLine verdict={verdict} decades={sheet.decades} picks={sheet.picks} slots={sheet.formation.slots} />

          {/* the tip line — what the pitch is asking for right now, never a blank screen */}
          <p className="mt-2 border-hair border-ink/30 bg-sheet px-3 py-2 font-body text-[12px] leading-snug text-ink">
            {swapFrom !== null
              ? t('xi.tip.swap')
              : openSlot
                ? `${openSlot.roleHe} · ${voiceAction(1, 'slot')}`
                : t('xi.tip.pick')}
          </p>

          {/* ---------------------------------------------------- the selected slot */}
          {openSlot && (
            <div className="mt-2 border-hair border-ink bg-sheet p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-sign text-step-0 text-ink">{openSlot.roleHe}</p>
                <p className="font-mono text-[10.5px] text-muted">
                  <bdi dir="ltr">{openSlot.role}</bdi>
                </p>
              </div>

              {occupant ? (
                <>
                  <p className="mt-1 font-body text-step--1 text-ink">{occupant.nameHe}</p>

                  {/*
                    The versions. Only a man the squad table gives more than one spell has
                    anything here — a chooser with one button would be teaching the reader a
                    fact nobody stated (rule 11). Under a challenge, a version the rule
                    refuses is shown and disabled, so the reason is visible.
                  */}
                  {slotVersions.length > 1 && (
                    <div className="mt-2">
                      <p className="font-body text-[10.5px] font-extrabold text-muted">{voiceAction(1, 'version', { name: compactName(occupant.nameHe) })}</p>
                      <div className="-mx-0.5 mt-1 flex gap-1 overflow-x-auto px-0.5 pb-1">
                        {slotVersions.map((version) => {
                          const live = sheet.versions[openSlot.slotId] === version.id
                          const allowed = chooseSpell(
                            sheet.challenge,
                            [{ id: version.id, fromYear: version.fromYear, toYear: version.toYear }],
                            slotStatusOf(occupant),
                            {},
                            takenDecades(rows, openSlot.slotId),
                            manOf(occupant),
                            { allowedDecades: sheet.decades },
                          ).ok
                          return (
                            <button
                              key={version.id}
                              type="button"
                              aria-pressed={live}
                              disabled={!allowed && !live}
                              onClick={() => {
                                haptic('tap')
                                patch((current) => ({
                                  ...current,
                                  versions: { ...current.versions, [openSlot.slotId]: version.id },
                                }))
                              }}
                              className={`flex min-h-tap shrink-0 flex-col items-center justify-center border-hair px-2.5 py-1 leading-tight transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-35 motion-reduce:transition-none ${
                                live ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
                              }`}
                            >
                              <span className="font-mono text-[11px] tabular-nums">
                                <bdi dir="ltr">
                                  {version.fromYear === version.toYear
                                    ? String(version.fromYear)
                                    : `${version.fromYear}–${version.toYear}`}
                                </bdi>
                              </span>
                              <span className={`font-body text-[9px] ${live ? 'text-concrete' : 'text-muted'}`}>
                                {version.seasonLabel
                                  ? t('xi.version.shirt', { season: version.seasonLabel })
                                  : t('xi.version.noShirt')}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <SlotButton
                      label={sheet.captain === openSlot.slotId ? t('xi.slot.captainOff') : (voiceAction(1, 'captain') ?? '')}
                      live={sheet.captain === openSlot.slotId}
                      onClick={() => {
                        haptic('lock')
                        patch((current) => ({
                          ...current,
                          captain: current.captain === openSlot.slotId ? null : openSlot.slotId,
                        }))
                      }}
                    />
                    <SlotButton label={t('xi.slot.replace')} onClick={() => setDrawer('slot')} />
                    <SlotButton
                      label={swapFrom === openSlot.slotId ? t('xi.slot.swapping') : t('xi.slot.swap')}
                      live={swapFrom === openSlot.slotId}
                      onClick={() => setSwapFrom(swapFrom === openSlot.slotId ? null : openSlot.slotId)}
                    />
                    <SlotButton label={t('xi.slot.remove')} onClick={() => remove(openSlot.slotId)} />
                  </div>
                </>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <SlotButton label={t('xi.slot.open')} onClick={() => setDrawer('slot')} />
                </div>
              )}
            </div>
          )}

          {/*
            Undo, where the mechanic needs it. Removing a man is one tap and putting him back
            used to mean finding him again in 653 names.
          */}
          {undo && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-hair border-ink/40 bg-paper px-3 py-2">
              <p className="font-body text-[11.5px] text-ink">{t('xi.slot.removed', { name: undo.entry.nameHe })}</p>
              <div className="flex gap-1.5">
                <SlotButton label={t('xi.slot.undo')} onClick={undoRemoval} />
                <SlotButton label={t('xi.slot.undoDismiss')} onClick={() => setUndo(null)} />
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- the shortlist */}
          <section className="mt-3 border-hair border-ink/40 bg-sheet p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-sign text-step--1 text-ink">{t('xi.shortlist.title')}</h3>
              <span className="font-mono text-[10.5px] text-muted">
                <Num>{sheet.shortlist.length}</Num>
              </span>
            </div>
            {sheet.shortlist.length === 0 ? (
              <p className="mt-1 font-body text-[11px] leading-snug text-muted">{t('xi.shortlist.empty')}</p>
            ) : (
              <ul className="-mx-0.5 mt-2 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
                {sheet.shortlist.map((entry) => (
                  <li key={rosterKey(entry)} className="flex shrink-0 items-stretch">
                    <button
                      type="button"
                      disabled={
                        selected === null ||
                        takenKeys.has(rosterKey(entry)) ||
                        (sheet.challenge !== 'free' &&
                          !chooseSpell(
                            sheet.challenge,
                            spellsOf(entry),
                            slotStatusOf(entry),
                            {},
                            takenDecades(rows, selected),
                            manOf(entry),
                            { allowedDecades: sheet.decades },
                          ).ok)
                      }
                      onClick={() => {
                        if (selected === null) return
                        const spell = chooseSpell(
                          sheet.challenge,
                          spellsOf(entry),
                          slotStatusOf(entry),
                          { fallbackId: shirts.defaultVersion[entry.slug] ?? null },
                          takenDecades(rows, selected),
                          manOf(entry),
                          { allowedDecades: sheet.decades },
                        )
                        if (!spell.ok) return
                        const slotId = selected
                        patch((current) => {
                          const versions = { ...current.versions }
                          if (spell.spell.id !== '') versions[slotId] = spell.spell.id
                          else delete versions[slotId]
                          return { ...current, picks: { ...current.picks, [slotId]: entry }, versions }
                        })
                        haptic('tap')
                      }}
                      className="flex min-h-tap items-center border-hair border-ink/40 bg-paper px-2.5 font-body text-[11.5px] font-extrabold text-ink disabled:opacity-40"
                    >
                      <span aria-hidden="true" className="me-1">
                        ★
                      </span>
                      {compactName(entry.nameHe)}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleShortlist(entry)}
                      aria-label={t('xi.shortlist.drop', { name: entry.nameHe })}
                      className="min-h-tap border-hair border-s-0 border-ink/40 bg-paper px-2 font-body text-[13px] leading-none text-muted"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------------------- the twelfth and the cut */}
          <section className="mt-2 grid gap-2 sm:grid-cols-2">
            <BenchCard
              title={t('xi.bench.twelfth')}
              note={voiceAction(1, 'twelfth') ?? ''}
              entry={sheet.twelfth}
              onOpen={() => {
                setSelected(null)
                setDrawer('twelfth')
              }}
              onClear={() => patch((current) => ({ ...current, twelfth: null }))}
            />
            <BenchCard
              title={t('xi.bench.cut')}
              note={voiceAction(1, 'lastCut') ?? ''}
              entry={sheet.cut}
              onOpen={() => {
                setSelected(null)
                setDrawer('cut')
              }}
              onClear={() => patch((current) => ({ ...current, cut: null }))}
            />
          </section>

          {embedded && (
            <button
              type="button"
              onClick={() => embedded.onResult({ picks: Object.values(sheet.picks) })}
              disabled={chosen < 11}
              data-xi="back"
              className="mt-3 flex min-h-tap w-full items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper disabled:opacity-40"
            >
              {embedded.doneLabel}
            </button>
          )}

          {/* ------------------------------------------------------------ the poster */}
          <div className={embedded ? 'hidden' : 'mt-3 flex flex-wrap items-center gap-2'}>
            <button
              type="button"
              onClick={() => setPoster(true)}
              disabled={chosen === 0}
              className="min-h-tap border-rule border-ink bg-ink px-3 font-sign text-step--1 text-paper transition-transform duration-press ease-stamp active:scale-[.97] disabled:opacity-40 motion-reduce:transition-none"
            >
              {t('xi.poster.open')}
            </button>
            <p className="font-body text-[11px] text-muted">
              {t('xi.dna.line', {
                spread: String(dna.spread),
                israeli: String(dna.origin.israeli),
                foreign: String(dna.origin.foreign),
              })}
            </p>
          </div>

          <p className="mt-2 font-body text-[11px] text-muted">{t('xi.help', { total: String(roster.total) })}</p>
          {/*
            What the archive can and cannot dress, counted on the screen. A reader who picks
            a man and gets no shirt is owed the reason.
          */}
          <p className="mt-1 font-body text-[11px] text-muted">
            {t('xi.shirt.coverage', { dressed: String(shirts.withShirt), total: String(roster.total) })}
          </p>
          <p className="mt-1 font-body text-[11px] text-muted">
            {t('xi.version.coverage', { n: String(shirts.withVersions) })}
          </p>

          {!embedded && shareNode}
        </div>

        {/* the drawer: beside the pitch at lg, a sheet over it on a phone */}
        {wide ? (
          <aside className="hidden lg:sticky lg:top-4 lg:block">
            {drawerNode ?? (
              <div className="border-hair border-dashed border-ink/50 bg-sheet p-4">
                <p className="font-sign text-step-0 text-ink">{t('xi.dock.idle')}</p>
                <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">{t('xi.tip.pick')}</p>
              </div>
            )}
          </aside>
        ) : (
          drawerNode
        )}
      </div>
      </div>

      {poster && (
        <Poster
          formation={sheet.formation}
          picks={sheet.picks}
          seasonOf={seasonOf}
          lookAt={lookAt}
          seasons={shirts.seasons}
          captain={sheet.captain}
          broken={broken}
          verdict={verdict}
          decades={sheet.decades}
          dna={dna}
          twelfthHe={sheet.twelfth?.nameHe ?? null}
          cutHe={sheet.cut?.nameHe ?? null}
          worst={worst}
          title={worst ? t('xi.tab.worst') : (spoken.eyebrow ?? spoken.title)}
          onClose={() => setPoster(false)}
        >
          {!worst && chosen >= 11 && <CompareCard gate={1} mine={xiResult} names={rosterNames} />}
          {!worst && chosen >= 11 && (
            <UniversalExit voice={spoken} next={next} from="xi" share={shareNode} />
          )}
        </Poster>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ the parts */

/** The share card's foot line on the best sheet: the twelfth man and the last man cut. */
function benchLine(twelfth: RosterEntry | null, cut: RosterEntry | null): string | null {
  if (twelfth && cut) return t('xi.card.bench', { twelfth: compactName(twelfth.nameHe), cut: compactName(cut.nameHe) })
  if (twelfth) return t('xi.card.twelfth', { twelfth: compactName(twelfth.nameHe) })
  if (cut) return t('xi.card.cut', { cut: compactName(cut.nameHe) })
  return null
}

/** His shirt as that spell, from the wardrobe — `slug@version`, then his own slug. */
function wardrobeLook(wardrobe: Wardrobe | undefined, entry: RosterEntry, spell: Spell | null): ShirtLook | null {
  if (!wardrobe) return null
  const at = (spell && spell.id !== '' ? wardrobe.by[`${entry.slug}@${spell.id}`] : undefined) ?? wardrobe.by[entry.slug]
  return at === undefined ? null : (wardrobe.shirts[at] ?? null)
}

/** Every decade (opening year) a man was at the club — the rail's era chips. */
function decadesOf(entry: RosterEntry): number[] {
  const from = entry.fromYear
  if (from === null || from === undefined) return []
  const to = entry.toYear ?? from
  const out: number[] = []
  for (let decade = Math.floor(from / 10) * 10; decade <= to; decade += 10) out.push(decade)
  return out
}

function spanOf(spell: Spell): string | null {
  if (spell.fromYear === null) return null
  const to = spell.toYear ?? spell.fromYear
  return to === spell.fromYear ? String(spell.fromYear) : `${spell.fromYear}–${to}`
}

/** Six rules and "free". A chip row, and the chosen rule's sentence under it. */
function ChallengePicker({
  value,
  decades,
  onChange,
  onDecades,
}: {
  value: ChallengeId
  decades: readonly number[]
  onChange: (next: ChallengeId) => void
  onDecades: (next: number[]) => void
}) {
  return (
    <div className="mt-2">
      <p className="font-body text-[10.5px] font-extrabold tracking-wide text-muted">{t('xi.challenge.title')}</p>
      <div role="radiogroup" aria-label={t('xi.challenge.title')} className="-mx-0.5 mt-1 flex gap-1 overflow-x-auto px-0.5 pb-1">
        {CHALLENGES.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => onChange(id)}
            className={`flex min-h-[40px] shrink-0 items-center border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
              value === id ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
            }`}
          >
            {t(`xi.challenge.${id}` as MessageKey)}
          </button>
        ))}
      </div>
      {value === 'span' && (
        <div role="group" aria-label={t('xi.challenge.span.pick')} className="-mx-0.5 mt-1 flex gap-1 overflow-x-auto px-0.5 pb-1">
          {SPAN_DECADES.map((decade) => {
            const on = decades.includes(decade)
            // the last decade cannot be switched off (a mission asks for one), and a fourth is refused
            const locked = (on && decades.length === 1) || (!on && decades.length >= SPAN_MAX)
            return (
              <button
                key={decade}
                type="button"
                aria-pressed={on}
                disabled={locked}
                onClick={() => onDecades(toggleDecade(decades, decade))}
                className={`flex min-h-[40px] shrink-0 items-center border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none ${
                  on ? 'border-red bg-red text-paper' : 'border-ink/40 bg-paper text-ink'
                }`}
              >
                {t('xi.challenge.span.chip', { d: decadeWord(decade) })}
              </button>
            )
          })}
        </div>
      )}
      <p className="mt-0.5 font-body text-[11px] leading-snug text-muted">{t(`xi.challenge.${value}.desc` as MessageKey)}</p>
    </div>
  )
}

/** Met / not met, and which slots break the rule — named, never scored. */
function ChallengeLine({
  verdict,
  decades,
  picks,
  slots,
}: {
  verdict: ChallengeStatus
  decades: readonly number[]
  picks: Record<string, RosterEntry>
  slots: readonly PitchSlot[]
}) {
  if (verdict.challenge === 'free') return null
  const rule = ruleLabel(verdict.challenge, decades)
  const names = slots
    .filter((slot) => verdict.broken.includes(slot.slotId))
    .map((slot) => (picks[slot.slotId] ? compactName(picks[slot.slotId]!.nameHe) : undefined))
    .filter((name): name is string => Boolean(name))
  return (
    <p
      className={`mt-2 border-hair px-3 py-2 font-body text-[12px] leading-snug ${
        names.length > 0 ? 'border-red bg-sheet text-red' : 'border-ink bg-sheet text-ink'
      }`}
    >
      {names.length > 0
        ? t('xi.challenge.broken', { rule, names: names.join(' · ') })
        : verdict.met
          ? t('xi.challenge.met', { rule })
          : t('xi.challenge.onTrack', { rule })}
    </p>
  )
}

/**
 * The pitch — the builder's and the poster's, one component. A picked man is his mini kit
 * on a paper tile with an ink keyline (red never meets grass edge-on), his name plate, the
 * armband, and the season his shirt is from; an empty slot is a dashed ghost with its role.
 */
function XIPitch({
  formation,
  picks,
  seasonOf,
  seasons,
  captain,
  selected = null,
  broken,
  onTap,
  className = '',
  compact = false,
  lookAt,
}: {
  formation: Formation
  picks: Record<string, RosterEntry>
  seasonOf: (slotId: string) => string | null
  /** the man's real shirt (delta 88) — a photograph where the archive has one */
  lookAt?: (slotId: string) => ShirtLook | null
  seasons: ShirtBoard['seasons']
  captain: string | null
  selected?: string | null
  broken: ReadonlySet<string>
  onTap?: (slot: PitchSlot) => void
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={`relative aspect-[3/4] w-full touch-manipulation overflow-hidden border-rule border-ink ${className}`}
      style={{ background: 'rgb(var(--p-grass))' }}
    >
      <div aria-hidden="true" className="absolute inset-0">
        {[0, 1, 2, 3, 4, 5].map((band) => (
          <div
            key={band}
            className="absolute inset-x-0"
            style={{ top: `${band * 16.6}%`, height: '8.3%', background: 'rgb(var(--p-grass-dark))' }}
          />
        ))}
      </div>
      <svg viewBox="0 0 100 133" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g fill="none" stroke="rgb(var(--p-halo) / .8)" strokeWidth="0.6">
          <rect x="3" y="3" width="94" height="127" />
          <path d="M3 66.5 H97" />
          <circle cx="50" cy="66.5" r="12" />
          <rect x="27" y="3" width="46" height="18" />
          <rect x="27" y="112" width="46" height="18" />
        </g>
      </svg>

      {formation.slots.map((slot) => {
        const entry = picks[slot.slotId]
        const seasonLabel = entry ? seasonOf(slot.slotId) : null
        const season = seasonLabel ? seasons[seasonLabel] : undefined
        const look = entry && lookAt ? lookAt(slot.slotId) : null
        const live = selected === slot.slotId
        const off = broken.has(slot.slotId)
        const body = entry ? (
          <span className="flex animate-slam-solid flex-col items-center gap-0.5">
            <span
              className={`relative grid place-items-center border-hair bg-press-paper ${
                compact ? 'h-9 w-8' : 'h-11 w-10'
              } ${live ? 'border-rule border-press-ink' : 'border-press-ink'}`}
            >
              {look ? (
                <PlayerShirt look={look} eager title={shirtTitle(look)} className={compact ? 'h-8 w-7' : 'h-10 w-9'} />
              ) : season ? (
                <KitShirt
                  spec={season.spec}
                  density="mini"
                  className={compact ? 'h-8 w-7' : 'h-10 w-9'}
                  title={t('xi.shirt.alt', { season: season.seasonLabel })}
                />
              ) : (
                <span aria-hidden="true" className="font-poster text-[15px] leading-none text-press-ink">
                  {entry.familyHe.slice(0, 1)}
                </span>
              )}
              {captain === slot.slotId && (
                <span className="absolute -end-1.5 -top-1.5 grid h-4 w-4 place-items-center border-hair border-press-ink bg-press-ink font-mono text-[9px] font-bold leading-none text-press-paper">
                  <bdi dir="ltr">C</bdi>
                </span>
              )}
              {off && (
                <span className="absolute -start-1.5 -top-1.5 grid h-4 w-4 place-items-center border-hair border-press-ink bg-press-paper font-mono text-[10px] font-bold leading-none text-press-ink">
                  !
                </span>
              )}
            </span>
            <span
              className={`block max-w-[96px] truncate border-hair bg-sheet px-1.5 py-0.5 font-body font-extrabold leading-tight text-ink ${
                compact ? 'text-[9.5px]' : 'text-[10.5px]'
              } ${live ? 'border-rule border-ink text-red' : 'border-ink'} ${off ? 'line-through' : ''}`}
            >
              {compactName(entry.nameHe)}
            </span>
            {season && !compact && (
              <span className="block border-hair border-ink/30 bg-sheet/90 px-1 font-mono text-[9px] leading-tight text-muted">
                <Num>{season.seasonLabel}</Num>
              </span>
            )}
          </span>
        ) : (
          <span
            className={`block border-hair border-dashed bg-ink/25 px-2 py-1 font-body text-[10px] leading-tight text-sheet ${
              live ? 'border-rule border-sheet' : 'border-sheet/80'
            }`}
          >
            {slot.roleHe}
          </span>
        )
        // Display only: the keeper's stack (tile, plate, season) is taller than the gap
        // under him, so the drawing lifts the lowest row a little rather than clip it.
        const style = { insetInlineStart: `${slot.x}%`, top: `${Math.min(slot.y, compact ? 90 : 87)}%` }
        const place = 'absolute -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2'
        if (!onTap) {
          return (
            <div key={slot.slotId} style={style} className={place}>
              {body}
            </div>
          )
        }
        return (
          <button
            key={slot.slotId}
            type="button"
            onClick={() => onTap(slot)}
            aria-pressed={live}
            aria-label={entry ? `${slot.roleHe} — ${entry.nameHe}` : slot.roleHe}
            style={style}
            className={`${place} min-h-tap min-w-tap transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none`}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}

/** A small dock chip — one of the 1-3 secondary actions beside the primary button. */
function DockChip({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-tap shrink-0 border-hair border-ink/40 bg-paper px-2.5 font-body text-[11px] font-extrabold leading-none text-ink transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-40 motion-reduce:transition-none"
    >
      {label}
    </button>
  )
}

/**
 * הדשא — the drawing every pitch gate shares (delta 87): mown bands and the chalk
 * lines, behind whatever tokens a caller puts on it.
 */
function PitchGround({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative h-full w-full touch-manipulation overflow-hidden border-rule border-ink [container-type:inline-size] ${className}`}
      style={{ background: 'rgb(var(--p-grass))' }}
    >
      <div aria-hidden="true" className="absolute inset-0">
        {[0, 1, 2, 3, 4, 5].map((band) => (
          <div
            key={band}
            className="absolute inset-x-0"
            style={{ top: `${band * 16.6}%`, height: '8.3%', background: 'rgb(var(--p-grass-dark))' }}
          />
        ))}
      </div>
      <svg viewBox="0 0 100 133" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <g fill="none" stroke="rgb(var(--p-halo) / .8)" strokeWidth="0.6">
          <rect x="3" y="3" width="94" height="127" />
          <path d="M3 66.5 H97" />
          <circle cx="50" cy="66.5" r="12" />
          <rect x="27" y="3" width="46" height="18" />
          <rect x="27" y="112" width="46" height="18" />
        </g>
      </svg>
      {children}
    </div>
  )
}

/**
 * המגרש בנייד — the phone pitch (delta 87). No tile, no boxed name: a `ShirtToken`
 * standing straight on the grass, and every slot is a drop zone (`data-drop`) so a
 * dragged draft card — or a dragged neighbour, for a swap — can land on it directly.
 */
function XIPitchStage({
  formation,
  picks,
  seasonOf,
  lookAt,
  captain,
  selected,
  broken,
  onTap,
  onSwap,
}: {
  formation: Formation
  picks: Record<string, RosterEntry>
  seasonOf: (slotId: string) => string | null
  /** the man's real shirt, from the wardrobe (delta 88) */
  lookAt: (slotId: string) => ShirtLook | null
  captain: string | null
  selected: string | null
  broken: ReadonlySet<string>
  onTap: (slot: PitchSlot) => void
  onSwap: (from: string, to: string) => void
}) {
  return (
    <PitchGround>
      {formation.slots.map((slot) => {
        const entry = picks[slot.slotId]
        const look = entry ? lookAt(slot.slotId) : null
        const live = selected === slot.slotId
        const off = broken.has(slot.slotId)
        return (
          <SlotToken
            key={slot.slotId}
            slot={slot}
            entry={entry ?? null}
            look={look}
            seasonLabel={entry ? (look?.seasonLabel || seasonOf(slot.slotId)) : null}
            live={live}
            captain={captain === slot.slotId}
            off={off}
            onTap={onTap}
            onSwap={onSwap}
          />
        )
      })}
    </PitchGround>
  )
}

/** One slot of the phone pitch — a tap target, a drop zone, and (once filled) a drag source. */
function SlotToken({
  slot,
  entry,
  look,
  seasonLabel,
  live,
  captain,
  off,
  onTap,
  onSwap,
}: {
  slot: PitchSlot
  entry: RosterEntry | null
  look: ShirtLook | null
  seasonLabel: string | null
  live: boolean
  captain: boolean
  off: boolean
  onTap: (slot: PitchSlot) => void
  onSwap: (from: string, to: string) => void
}) {
  const drag = useDragSource({
    payload: `xislot:${slot.slotId}`,
    disabled: !entry,
    onDrop: (zone) => onSwap(slot.slotId, zone),
  })
  const style = { insetInlineStart: `${slot.x}%`, top: `${Math.min(slot.y, 90)}%` }
  return (
    <button
      type="button"
      {...(entry ? drag : {})}
      {...dropZone(slot.slotId)}
      onClick={() => onTap(slot)}
      aria-pressed={live}
      aria-label={entry ? `${slot.roleHe} — ${entry.nameHe}` : slot.roleHe}
      style={style}
      className="absolute -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2 min-h-tap min-w-tap transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none"
    >
      {entry ? (
        <ShirtToken
          key={look && look.kind === 'photo' ? look.src : 'engine'}
          look={look}
          spec={NEUTRAL_SHIRT_SPEC}
          title={look ? shirtTitle(look) : undefined}
          name={compactName(entry.nameHe)}
          sub={seasonLabel || undefined}
          live={live}
          captain={captain}
          flag={off}
        />
      ) : (
        <EmptySlotMark roleHe={slot.roleHe} live={live} />
      )}
    </button>
  )
}

/**
 * An empty slot — a dashed SHIRT SILHOUETTE, not a box (round 2, Maor: remove the
 * squares). The live slot pulses by TRANSFORM only (rule 8: no colour-opacity animation
 * on grass).
 */
const SLOT_SHIRT = 'M20 6 L6 16 L12 26 L18 22 L18 66 L42 66 L42 22 L48 26 L54 16 L40 6 Q30 13 20 6 Z'

function EmptySlotMark({ roleHe, live }: { roleHe: string; live: boolean }) {
  return (
    <span className="flex flex-col items-center">
      <svg
        viewBox="0 0 60 72"
        aria-hidden="true"
        className={`block w-[11cqw] max-w-[62px] ${live ? 'animate-fx-wobble motion-reduce:animate-none' : ''}`}
        fill="none"
        strokeLinejoin="round"
      >
        {/* red never meets the grass directly — an anti-aliased red edge on green is olive,
            which is yellow by hue (rule 8; the goal pitch rule "every red line on an ink line") */}
        {live && <path d={SLOT_SHIRT} stroke="rgb(var(--ink))" strokeWidth="4.6" />}
        <path
          d={SLOT_SHIRT}
          stroke={live ? 'rgb(var(--red))' : 'rgb(var(--sheet) / .7)'}
          strokeWidth="2.4"
          strokeDasharray="4 3"
        />
      </svg>
      <span
        className={`mt-0.5 block max-w-[24cqw] truncate px-1.5 py-[2px] font-body text-[10px] font-extrabold leading-tight ${
          live ? 'bg-sheet text-red' : 'text-sheet/80'
        }`}
      >
        {roleHe}
      </span>
    </span>
  )
}

/** The filled-slot sheet: armband, versions, replace, swap, remove — one man, one screen. */
function SlotDetail({
  slot,
  occupant,
  sheet,
  rows,
  slotVersions,
  swapFrom,
  onCaptain,
  onReplace,
  onSwap,
  onRemove,
  onVersion,
  manOf,
}: {
  slot: PitchSlot
  occupant: RosterEntry
  sheet: Sheet
  rows: SheetRow[]
  manOf: (entry: RosterEntry) => ManFacts
  slotVersions: ShirtBoard['versions'][string]
  swapFrom: string | null
  onCaptain: () => void
  onReplace: () => void
  onSwap: () => void
  onRemove: () => void
  onVersion: (id: string) => void
}) {
  return (
    <div>
      <p className="font-body text-step--1 text-ink">{occupant.nameHe}</p>
      {slotVersions && slotVersions.length > 1 && (
        <div className="mt-2">
          <p className="font-body text-[10.5px] font-extrabold text-muted">{voiceAction(1, 'version', { name: compactName(occupant.nameHe) })}</p>
          <div className="-mx-0.5 mt-1 flex gap-1 overflow-x-auto px-0.5 pb-1">
            {slotVersions.map((version) => {
              const live = sheet.versions[slot.slotId] === version.id
              const allowed = chooseSpell(
                sheet.challenge,
                [{ id: version.id, fromYear: version.fromYear, toYear: version.toYear }],
                slotStatusOf(occupant),
                {},
                takenDecades(rows, slot.slotId),
                manOf(occupant),
                { allowedDecades: sheet.decades },
              ).ok
              return (
                <button
                  key={version.id}
                  type="button"
                  aria-pressed={live}
                  disabled={!allowed && !live}
                  onClick={() => onVersion(version.id)}
                  className={`flex min-h-tap shrink-0 flex-col items-center justify-center border-hair px-2.5 py-1 leading-tight transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-35 motion-reduce:transition-none ${
                    live ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
                  }`}
                >
                  <span className="font-mono text-[11px] tabular-nums">
                    <bdi dir="ltr">
                      {version.fromYear === version.toYear ? String(version.fromYear) : `${version.fromYear}–${version.toYear}`}
                    </bdi>
                  </span>
                  <span className={`font-body text-[9px] ${live ? 'text-concrete' : 'text-muted'}`}>
                    {version.seasonLabel ? t('xi.version.shirt', { season: version.seasonLabel }) : t('xi.version.noShirt')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <SlotButton
          label={sheet.captain === slot.slotId ? t('xi.slot.captainOff') : (voiceAction(1, 'captain') ?? '')}
          live={sheet.captain === slot.slotId}
          onClick={onCaptain}
        />
        <SlotButton label={t('xi.slot.replace')} onClick={onReplace} />
        <SlotButton label={swapFrom === slot.slotId ? t('xi.slot.swapping') : t('xi.slot.swap')} live={swapFrom === slot.slotId} onClick={onSwap} />
        <SlotButton label={t('xi.slot.remove')} onClick={onRemove} />
      </div>
    </div>
  )
}

function SlotButton({ label, onClick, live = false }: { label: string; onClick: () => void; live?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={live}
      className={`min-h-tap border-hair px-2.5 font-body text-[11.5px] font-extrabold leading-none transition-transform duration-press ease-stamp active:scale-[.96] motion-reduce:transition-none ${
        live ? 'border-ink bg-ink text-paper' : 'border-ink/40 bg-paper text-ink'
      }`}
    >
      {label}
    </button>
  )
}

/**
 * שחקן 12 והאחרון שנחתך — the two decisions that are not on the pitch. They come out of
 * the same roster sheet as everybody else and carry no grade.
 */
function BenchCard({
  title,
  note,
  entry,
  onOpen,
  onClear,
}: {
  title: string
  note: string
  entry: RosterEntry | null
  onOpen: () => void
  onClear: () => void
}) {
  return (
    <div className="border-hair border-ink/40 bg-sheet p-3">
      <h3 className="font-sign text-step--1 text-ink">{title}</h3>
      <p className="mt-0.5 font-body text-[10.5px] leading-snug text-muted">{note}</p>
      <p className="mt-1.5 font-body text-step--1 text-ink">{entry ? entry.nameHe : t('xi.bench.none')}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <SlotButton label={entry ? t('xi.bench.change') : t('xi.bench.choose')} onClick={onOpen} />
        {entry && <SlotButton label={t('xi.bench.clear')} onClick={onClear} />}
      </div>
    </div>
  )
}

/**
 * הפוסטר — the real pitch, and what the eleven is made of; nothing about how good it is.
 *
 * A dialog rather than a screen of its own: a gate that navigates away from the thing
 * you just made has taken it off the table. It closes on Escape, on the scrim and on its
 * own button. `z-[60]`, over the tab bar's `z-50` (rule 33).
 */
function Poster({
  formation,
  picks,
  seasonOf,
  lookAt,
  seasons,
  captain,
  broken,
  verdict,
  decades,
  dna,
  twelfthHe,
  cutHe,
  worst,
  title,
  onClose,
  children,
}: {
  formation: Formation
  picks: Record<string, RosterEntry>
  seasonOf: (slotId: string) => string | null
  lookAt: (slotId: string) => ShirtLook | null
  seasons: ShirtBoard['seasons']
  captain: string | null
  broken: ReadonlySet<string>
  verdict: ChallengeStatus
  decades: readonly number[]
  dna: ReturnType<typeof xiDna>
  twelfthHe: string | null
  cutHe: string | null
  worst: boolean
  /** the poster's own line — the worst tab's name, or the voice's eyebrow */
  title: string
  onClose: () => void
  /** the Universal Exit (§6) — the emotion, one or two doors, "שלח ליציע" */
  children?: React.ReactNode
}) {
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  const captainHe = captain ? (picks[captain]?.nameHe ?? null) : null
  const rule = ruleLabel(verdict.challenge, decades)
  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-ink/70 outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" aria-label={t('xi.close')} className="min-h-[6vh] flex-1" onClick={onClose} />
      <div className="max-h-[92vh] animate-slam-solid overflow-y-auto overscroll-contain border-t-rule border-ink bg-sheet px-4 pb-[calc(var(--tap)+2rem+env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-[34rem]">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p dir="ltr" className="text-end font-latin text-[9px] font-bold tracking-[0.18em] text-red">
                {worst ? 'GATE 1 · WORST XI' : 'GATE 1 · YOUR XI'}
              </p>
              <p className="font-display text-step-1 leading-tight text-ink">
                {title}
              </p>
            </div>
            <button type="button" onClick={onClose} className="min-h-tap shrink-0 px-2 font-body text-[12px] font-extrabold text-red">
              {t('xi.close')}
            </button>
          </div>

          <XIPitch
            className="mt-2"
            compact
            formation={formation}
            picks={picks}
            seasonOf={seasonOf}
            lookAt={lookAt}
            seasons={seasons}
            captain={captain}
            broken={broken}
          />

          {children}

          <p className="mt-2 font-body text-[11.5px] leading-snug text-muted">
            {worst ? t('xi.poster.note.worst') : t('xi.poster.note')}
          </p>

          {verdict.challenge !== 'free' && (
            <p
              className={`mt-2 border-hair px-3 py-2 font-body text-[12px] font-extrabold leading-snug ${
                verdict.met ? 'border-ink text-ink' : 'border-red text-red'
              }`}
            >
              {verdict.met
                ? t('xi.poster.challenge.met', { rule })
                : verdict.broken.length > 0
                  ? t('xi.poster.challenge.notMet', { rule, n: String(verdict.broken.length) })
                  : t('xi.poster.challenge.incomplete', { rule })}
            </p>
          )}

          <dl className="mt-3 border-hair border-ink/40">
            <DnaRow label={t('xi.dna.captain')} value={captainHe ?? t('xi.bench.none')} />
            <DnaRow label={t('xi.bench.twelfth')} value={twelfthHe ?? t('xi.bench.none')} />
            <DnaRow label={t('xi.bench.cut')} value={cutHe ?? t('xi.bench.none')} />
          </dl>

          <p className="mt-3 font-body text-[10px] font-extrabold tracking-[0.18em] text-red">{t('xi.poster.dna')}</p>
          <dl className="mt-1 border-hair border-ink/40">
            <DnaRow label={t('xi.dna.formation')} value={dna.formation} latin />
            <DnaRow label={t('xi.dna.picked')} value={`${dna.picked}/11`} latin />
            {dna.decades.map((row) => (
              <DnaRow key={row.decade} label={t('xi.dna.decade', { n: String(row.decade) })} value={String(row.count)} latin />
            ))}
            {dna.undated > 0 && <DnaRow label={t('xi.dna.undated')} value={String(dna.undated)} latin />}
            <DnaRow label={t('xi.dna.spread')} value={String(dna.spread)} latin />
            <DnaRow label={t('xi.dna.slot.israeli')} value={String(dna.origin.israeli)} latin />
            <DnaRow label={t('xi.dna.slot.foreign')} value={String(dna.origin.foreign)} latin />
            {dna.origin.unknown > 0 && (
              <DnaRow label={t('xi.dna.slot.unknown')} value={String(dna.origin.unknown)} latin />
            )}
          </dl>

          <p className="mt-2 font-body text-[10.5px] leading-snug text-muted">{t('xi.dna.note')}</p>
          <p className="mt-1 font-body text-[10.5px] leading-snug text-muted">{t('roster.foreignSlot.note')}</p>
        </div>
      </div>
    </div>
  )
}

function DnaRow({ label, value, latin = false }: { label: string; value: string; latin?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b-hair border-ink/20 px-3 py-2 last:border-b-0">
      <dt className="font-body text-[12px] text-muted">{label}</dt>
      <dd className="font-sign text-step--1 text-ink">{latin ? <Num>{value}</Num> : value}</dd>
    </div>
  )
}

/**
 * המאמן אומר — one Manager Prompt, offered or in force (ONE RED WORLD §10). Optional: the
 * sheet is whole without it. Offered → take it or ask for another; in force → drop it. The rule
 * itself is enforced by `lib/xi/challenge.ts` and reported by the challenge line and the poster.
 */
function PromptCard({
  id,
  active,
  linked,
  onAccept,
  onOther,
  onDrop,
}: {
  id: PromptId
  active: boolean
  /** handed over by a link — "somebody sent you this question" */
  linked: boolean
  onAccept: () => void
  onOther: () => void
  onDrop: () => void
}) {
  return (
    <section
      data-xi="prompt"
      data-prompt={id}
      className={`flex items-center gap-2 border-hair px-2.5 py-1.5 ${active ? 'border-red bg-paper' : 'border-ink/50 bg-sheet'}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-body text-[9.5px] font-extrabold tracking-widest text-red">
          {voiceAction(1, linked ? 'prompt.link' : 'prompt.title')}
        </p>
        <p className="truncate font-sign text-[13px] leading-tight text-ink">{voiceAction(1, `prompt.${id}`)}</p>
      </div>
      {active ? (
        <button
          type="button"
          onClick={onDrop}
          className="min-h-tap shrink-0 border-hair border-ink/40 px-2.5 font-body text-[11.5px] font-extrabold text-ink"
        >
          {voiceAction(1, 'prompt.drop')}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onOther}
            className="min-h-tap shrink-0 border-hair border-ink/40 px-2.5 font-body text-[11.5px] font-extrabold text-ink"
          >
            {voiceAction(1, 'prompt.other')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="min-h-tap shrink-0 bg-red px-3 font-body text-[11.5px] font-extrabold text-paper transition-transform duration-press active:scale-[.97] motion-reduce:transition-none"
          >
            {voiceAction(1, 'prompt.accept')}
          </button>
        </>
      )}
    </section>
  )
}
