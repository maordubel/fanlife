import 'server-only'

import manufacturersFile from '@/content/manual/manufacturers.json'
import sponsorsFile from '@/content/manual/sponsors.json'
import { t, type MessageKey } from '@/lib/i18n'
import { accepted, kitRecords, playableKits, specOf, type KitMasterRecord } from '@/lib/kit/kit-master'
import { photoMissing } from '@/lib/kit/photo'
import { COLLARS, COLOUR_NAME, DEFAULT_SPEC, PATTERNS, SLEEVES, type KitSpec } from '@/lib/kit/spec'
import { canonMaker, canonSponsor, colourFamily, judge, sameColour, sameMaker, sameSponsor } from '@/lib/kit/truth'
import { hintReceipt, signKitUnlock, verifyHintReceipt } from '@/lib/kit/unlock'
import { cycleSeed, positionOf, takeFrom } from '@/lib/rotation/deck'

import { rng, shuffle } from './archive'
import {
  DNA_THRESHOLD,
  FIELD_WEIGHT,
  HINT_KINDS,
  KIT_HINT_LIMIT,
  KIT_HINT_PENALTY,
  KIT_ROUND,
  OPTION_RAMP,
  PERFECT_BONUS,
  STEP_FIELDS,
  STEP_ORDER,
  STEP_WEIGHT,
  type FieldVerdict,
  type KitGradeField,
  type KitHintAnswer,
  type KitHintKind,
  type KitOption,
  type KitPuzzle,
  type KitStep,
  type KitVerdict,
  type StepVerdict,
} from './kit-build-run'
import { publicId } from './publicId'

export * from './kit-build-run'

/**
 * שער 4 — משחק המדים, on the server. The deal and the grade (rule 4).
 *
 * WHAT A ROUND IS. Five shirts from the Kit Master's playable kits, seeded (`?seed=` hands a friend
 * the identical round) and walked by the rotation cursor so nothing repeats until the deck is
 * used. Each shirt is five steps; each step offers a ramp of 3·4·4·4·5 options, and every option is
 * a bundle of REAL values read off a real shirt — neighbouring seasons first, the same variant
 * first — so a wrong answer is always plausible and never invented.
 *
 * WHAT THE CLIENT GETS. The season (that is the question), a neutral garment in the season's cut,
 * and the options — opaque ids, labels, a descriptive info line with no year in it, and the patch
 * each one lays on the shirt. Not which option is right, not the sponsor, not the archive photo.
 *
 * THE PHOTO INVARIANT. A puzzle is dealt in the photo look only if every option it offers can be
 * drawn on the template's photographed garment. Otherwise distractors are filtered to the ones
 * that can, and only if that leaves too few does the puzzle fall back to the drawn look. A round
 * may mix looks; one shirt never does, so the look can never tell you which option is the real one.
 *
 * TOLERANCE. A field the master records with alternates (the 2009/10 crest, the 2019/20 sponsor)
 * accepts any of them, and an accepted alternate is never offered as a distractor.
 */

/** `signature` names the option (it feeds the public id, so shared links never change); `key` is the canonical identity dedupe and grading compare */
type Bundle = { signature: string; key?: string; labelHe: string; infoHe: string; patch: Partial<KitSpec> }

const MAKERS = (manufacturersFile as unknown as { records: { slug: string; nameHe: string; nameEn: string }[] }).records
const SPONSORS = (sponsorsFile as unknown as { records: { slug: string; nameHe: string; nameEn: string; industry?: string }[] }).records

function norm(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[׳״'"’`\-_.()\s]/g, '')
}

const labelOf = <T extends string>(rows: readonly { id: T; he: string }[], id: T): string => rows.find((row) => row.id === id)?.he ?? id
const colour = (c: KitSpec['base']) => COLOUR_NAME[c]

export function crestLabel(key: string): string {
  return t(`kitgame.crest.${key}` as MessageKey)
}

/* ------------------------------------------------------------------ one kit → one bundle per step */
function bundle(kit: KitMasterRecord, step: KitStep): Bundle | null {
  const f = kit.fields
  if (step === 'body') {
    const base = f.base.value
    const pattern = f.pattern.value
    const ink = f.secondary.value
    if (!base || !pattern || !ink) return null
    // a solid shirt has no visible second ink — two solid reds are the same button
    if (pattern === 'solid') {
      return {
        signature: `${base}|solid`,
        key: `${colourFamily(base)}|solid`,
        labelHe: t('kitgame.opt.bodySolid', { base: colour(base) }),
        infoHe: t('kitgame.info.bodySolid', { base: colour(base) }),
        patch: { base, pattern, patternInk: base },
      }
    }
    return {
      signature: `${base}|${pattern}|${ink}`,
      key: `${colourFamily(base)}|${pattern}|${colourFamily(ink)}`,
      labelHe: t('kitgame.opt.body', { base: colour(base), pattern: labelOf(PATTERNS, pattern) }),
      infoHe: t('kitgame.info.body', { base: colour(base), pattern: labelOf(PATTERNS, pattern), ink: colour(ink) }),
      patch: { base, pattern, patternInk: ink },
    }
  }
  if (step === 'construction') {
    const collar = f.collar.value
    const sleeves = f.sleeves.value
    if (!collar || !sleeves) return null
    return {
      signature: `${collar.id}|${collar.ink}|${sleeves.id}|${sleeves.ink}`,
      key: `${collar.id}|${colourFamily(collar.ink)}|${sleeves.id}|${colourFamily(sleeves.ink)}`,
      // the inks are in the label: four crew-and-plain options differ only by colour, and four
      // identical captions under four different shirts read as a bug
      labelHe: t('kitgame.opt.construction', {
        collar: labelOf(COLLARS, collar.id),
        collarInk: colour(collar.ink),
        sleeves: labelOf(SLEEVES, sleeves.id),
        sleeveInk: colour(sleeves.ink),
      }),
      infoHe: t('kitgame.info.construction', {
        collar: labelOf(COLLARS, collar.id),
        collarInk: colour(collar.ink),
        sleeves: labelOf(SLEEVES, sleeves.id),
        sleeveInk: colour(sleeves.ink),
      }),
      patch: { collar: collar.id, collarInk: collar.ink, sleeves: sleeves.id, sleeveInk: sleeves.ink },
    }
  }
  if (step === 'crest') {
    const crest = f.crest.value
    if (!crest) return null
    return crestBundle(crest.key)
  }
  if (step === 'maker') {
    const maker = f.maker.value
    if (!maker) return null
    return makerBundle(maker.name)
  }
  const sponsor = f.sponsor.value
  if (!sponsor) return null
  return sponsorBundle(sponsor.name)
}

function crestBundle(key: string): Bundle {
  return {
    signature: key,
    labelHe: crestLabel(key),
    infoHe: t('kitgame.info.crest', { crest: crestLabel(key) }),
    patch: { crestKey: key },
  }
}

function makerBundle(name: string): Bundle {
  const row = MAKERS.find((maker) => norm(maker.slug) === norm(name) || norm(maker.nameEn) === norm(name))
  return {
    signature: norm(name),
    key: canonMaker(name) ?? norm(name),
    labelHe: name,
    infoHe: row ? t('kitgame.info.maker', { en: row.nameEn, he: row.nameHe }) : t('kitgame.info.makerPlain', { name }),
    patch: { makerHe: name },
  }
}

function sponsorBundle(name: string): Bundle {
  const key = norm(name)
  const row = SPONSORS.find((sponsor) => norm(sponsor.slug) === key || norm(sponsor.nameEn.split(' ')[0] ?? '') === key || norm(sponsor.nameHe).startsWith(key))
  return {
    signature: key,
    key: canonSponsor(name) ?? key,
    labelHe: name,
    infoHe: row?.industry
      ? t('kitgame.info.sponsor', { name: row.nameHe, industry: row.industry })
      : t('kitgame.info.sponsorPlain', { name }),
    patch: { sponsorHe: name },
  }
}

/** the signatures a kit's step ACCEPTS — its value and every alternate */
function acceptedSignatures(kit: KitMasterRecord, step: KitStep, legacy: boolean): Set<string> {
  const own = bundle(kit, step)
  const out = new Set<string>(own ? [legacy ? own.signature : (own.key ?? own.signature)] : [])
  if (step === 'crest') for (const alt of kit.fields.crest.alternates) out.add(alt.key)
  // a shared link from before the canonical maps replays its own dedupe; alternates fold either way
  if (step === 'maker') for (const alt of kit.fields.maker.alternates) out.add(legacy ? norm(alt.name) : (canonMaker(alt.name) ?? norm(alt.name)))
  if (step === 'sponsor') for (const alt of kit.fields.sponsor.alternates) out.add(legacy ? norm(alt.name) : (canonSponsor(alt.name) ?? norm(alt.name)))
  return out
}

function drawable(kit: KitMasterRecord, step: KitStep, candidate: Bundle): boolean {
  if (step !== 'body' && step !== 'construction') return true
  return photoMissing(kit.bodyTemplateId, candidate.patch).length === 0
}

function year(kit: KitMasterRecord): number {
  return Number(kit.seasonLabel.slice(0, 4))
}

/** plausible first: the same variant, the nearest season; the id breaks a tie so the order is stable */
function neighbours(target: KitMasterRecord, all: readonly KitMasterRecord[]): KitMasterRecord[] {
  return all
    .filter((kit) => kit.id !== target.id)
    .map((kit) => ({ kit, d: Math.abs(year(kit) - year(target)) + (kit.variant === target.variant ? 0 : 10) }))
    .sort((a, b) => a.d - b.d || a.kit.id.localeCompare(b.kit.id))
    .map((row) => row.kit)
}

function candidates(target: KitMasterRecord, step: KitStep, all: readonly KitMasterRecord[], photo: boolean, legacy: boolean): Bundle[] {
  const taken = acceptedSignatures(target, step, legacy)
  const out: Bundle[] = []
  for (const kit of neighbours(target, all)) {
    const b = bundle(kit, step)
    const id = b ? (legacy ? b.signature : (b.key ?? b.signature)) : ''
    if (!b || taken.has(id)) continue
    if (photo && !drawable(target, step, b)) continue
    taken.add(id)
    out.push(b)
  }
  return out
}

function optionOf(step: KitStep, b: Bundle): KitOption {
  return { id: publicId(`${step}:${b.signature}`, 'kit4-option'), labelHe: b.labelHe, infoHe: b.infoHe, patch: b.patch }
}

function blankOf(kit: KitMasterRecord): KitSpec {
  return {
    ...DEFAULT_SPEC,
    seasonLabel: kit.seasonLabel,
    variant: kit.variant,
    base: 'paper',
    pattern: 'solid',
    patternInk: 'paper',
    collar: 'crew',
    collarInk: 'paper',
    sleeves: 'plain',
    sleeveInk: 'paper',
    sponsorHe: null,
    makerHe: null,
    crestKey: null,
    number: null,
    shorts: 'paper',
    socks: 'paper',
  }
}

type Dealt = { puzzle: KitPuzzle; kit: KitMasterRecord; truth: Record<KitStep, string> }

/**
 * A deal is a pure function of (seed, cursor), and grading or a hint re-deals it — so the last few
 * are kept. Bounded, so a crawler walking seeds cannot grow it.
 */
const DEALT = new Map<string, Dealt[]>()

/**
 * חלון של חיים (21.9.2026, `lib/mechanics/types.ts`) — THE WORKER LIFE's shop order: ONE
 * shirt, of a season that started before `before`, the one the life pinned, with `options`
 * choices a step (three for a boy, five for a man). The same bundles, the same grade; only
 * the round is one shirt instead of five. Absent, the gate's round is untouched.
 */
export type KitWindow = { before: number; pin?: string | null; options?: number }

const seasonStart = (kit: KitMasterRecord) => Number(kit.seasonLabel.slice(0, 4))

/** every playable shirt as an id and the year its season began — what the life may order, and nothing of the shirt */
export function kitYears(): Array<{ id: string; year: number }> {
  return playableKits()
    .map((kit) => ({ id: kit.id, year: seasonStart(kit) }))
    .filter((row) => Number.isFinite(row.year) && row.year > 0)
}

function deal(seed: number, cursor: number, window?: KitWindow, legacy = false): Dealt[] {
  const key = `${seed}|${cursor}|${window ? `${window.before}:${window.pin ?? ''}:${window.options ?? ''}` : ''}|${legacy && !window ? 'L' : ''}`
  const hit = DEALT.get(key)
  if (hit) return hit
  const out = dealFresh(seed, cursor, window, legacy)
  DEALT.set(key, out)
  if (DEALT.size > 64) DEALT.delete(DEALT.keys().next().value as string)
  return out
}

/**
 * The gate's round from a cursor that counts SHIRTS (`kitNextCursor`, §13): the seed shuffles the
 * pool once per cycle, and the round is the next KIT_ROUND shirts of that walk from `offset`. A
 * round that runs off the end of a cycle continues into the next cycle's shuffle, skipping a shirt
 * it already holds — so no shirt repeats before the deck is spent, whatever mix of Quick (3) and
 * Full (5) rounds walked the cursor there.
 */
export function kitRoundAt<T extends { id: string }>(pool: readonly T[], seed: number, offset: number, size = KIT_ROUND): T[] {
  if (pool.length === 0) return []
  const start = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0
  const decks = new Map<number, T[]>()
  const deck = (cycle: number) => {
    let found = decks.get(cycle)
    if (!found) {
      found = shuffle([...pool], rng(cycleSeed(seed, cycle)))
      decks.set(cycle, found)
    }
    return found
  }
  const out: T[] = []
  const seen = new Set<string>()
  for (let k = start; out.length < Math.min(size, pool.length) && k < start + size + pool.length; k++) {
    const item = deck(Math.floor(k / pool.length))[k % pool.length] as T
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

/**
 * A link shared before the cursor counted SHIRTS (`?seed=&r=k`, no `n`) addressed ROUND k: one
 * shuffle of the pool per cycle of `ceil(pool/5)` rounds, the k-th slice of five, and the options
 * drawn on the SAME stream after the shuffle. `legacy` replays exactly that deal, so a link in
 * somebody's chat from before the change still hands over the round it was bragging about.
 */
function legacyRound(seed: number, k: number, pool: readonly KitMasterRecord[]): { round: KitMasterRecord[]; random: () => number } {
  const at = positionOf(seed, k, pool.length, KIT_ROUND)
  const random = rng(at.seed)
  return { round: takeFrom(shuffle([...pool], random), at.slot * KIT_ROUND, KIT_ROUND), random }
}

function dealFresh(seed: number, cursor: number, window?: KitWindow, legacy = false): Dealt[] {
  const all = kitRecords()
  const pool = playableKits()
  let round: KitMasterRecord[]
  let random: () => number
  if (!window && legacy) {
    ;({ round, random } = legacyRound(seed, cursor, pool))
  } else if (window) {
    const at = positionOf(seed, cursor, pool.length, KIT_ROUND)
    random = rng(at.seed)
    const eligible = pool.filter((kit) => seasonStart(kit) < window.before)
    const pinned = window.pin ? eligible.find((kit) => kit.id === window.pin) : undefined
    round = pinned ? [pinned] : shuffle([...eligible], random).slice(0, 1)
  } else {
    // the gate's own round: KIT_ROUND shirts from the cursor's shirt; the options shuffle on
    // their own stream, keyed by seed AND cursor, so the same link deals the same options
    round = kitRoundAt(pool, seed, cursor, KIT_ROUND)
    random = rng(cycleSeed(seed, cursor + 1) ^ 0x5bd1e995)
  }

  return round.map((kit, index) => {
    const count = window?.options ?? OPTION_RAMP[index] ?? 4
    const wantPhoto = kit.render.photo.available && kit.render.photo.complete
    const pick = (photo: boolean) =>
      STEP_ORDER.map((step) => ({ step, rest: candidates(kit, step, all, photo, legacy && !window).slice(0, count - 1) }))
    let look: 'photo' | 'vector' = wantPhoto ? 'photo' : 'vector'
    let picked = pick(look === 'photo')
    // photo only if every step still offers at least three honest options
    if (look === 'photo' && picked.some((row) => row.rest.length < 2)) {
      look = 'vector'
      picked = pick(false)
    }
    const truth = {} as Record<KitStep, string>
    const steps = picked.map(({ step, rest }) => {
      const own = bundle(kit, step) as Bundle
      const right = optionOf(step, own)
      truth[step] = right.id
      return { step, options: shuffle([right, ...rest.map((b) => optionOf(step, b))], random) }
    })
    return {
      kit,
      truth,
      puzzle: {
        id: publicId(`${kit.id}|${seed}|${cursor}|${index}`, 'kit4'),
        index,
        seasonLabel: kit.seasonLabel,
        variant: kit.variant,
        look,
        blank: blankOf(kit),
        steps,
      },
    }
  })
}

export function kitPuzzleCount(): number {
  return playableKits().length
}

export function dealKitRound(seed: number, cursor = 0, window?: KitWindow, legacy = false): KitPuzzle[] {
  return deal(seed, cursor, window, legacy).map((row) => row.puzzle)
}

/* ------------------------------------------------------------------ grading */
export function gradeKitField(kit: KitMasterRecord, patch: Partial<KitSpec>, field: KitGradeField): { ok: boolean; tolerant: boolean; unknown?: boolean } {
  const f = kit.fields
  const truthPattern = f.pattern.value
  // one rule for every field: a truth the archive does not hold penalizes nobody
  const verdictOf = (j: 'match' | 'mismatch' | 'unknown', tolerant = false) =>
    j === 'unknown' ? { ok: true, tolerant: true, unknown: true } : { ok: j === 'match', tolerant }
  switch (field) {
    case 'base':
      return verdictOf(judge(f.base.value, patch.base, sameColour))
    case 'pattern':
      return verdictOf(judge(truthPattern, patch.pattern))
    case 'secondary':
      // a solid shirt's second ink is not on the cloth: a solid answer to a solid shirt is right
      if (truthPattern === 'solid') return { ok: patch.pattern === 'solid', tolerant: false }
      return verdictOf(judge(f.secondary.value, patch.patternInk, sameColour))
    case 'collar':
      return verdictOf(judge(f.collar.value?.id, patch.collar))
    case 'collarInk':
      return verdictOf(judge(f.collar.value?.ink, patch.collarInk, sameColour))
    case 'sleeves':
      return verdictOf(judge(f.sleeves.value?.id, patch.sleeves))
    case 'sleeveInk':
      return verdictOf(judge(f.sleeves.value?.ink, patch.sleeveInk, sameColour))
    case 'crest': {
      const own = f.crest.value?.key
      if (own === undefined) return verdictOf('unknown')
      if (patch.crestKey === own) return { ok: true, tolerant: false }
      return { ok: accepted(f.crest).some((c) => c.key === patch.crestKey), tolerant: true }
    }
    case 'maker': {
      const own = f.maker.value?.name
      if (own === undefined) return verdictOf('unknown')
      if (patch.makerHe && sameMaker(patch.makerHe, own)) return { ok: true, tolerant: false }
      return { ok: !!patch.makerHe && accepted(f.maker).some((m) => sameMaker(m.name, patch.makerHe as string)), tolerant: true }
    }
    case 'sponsor': {
      const own = f.sponsor.value?.name
      if (own === undefined) return verdictOf('unknown')
      if (patch.sponsorHe && sameSponsor(patch.sponsorHe, own)) return { ok: true, tolerant: false }
      return { ok: !!patch.sponsorHe && accepted(f.sponsor).some((s) => sameSponsor(s.name, patch.sponsorHe as string)), tolerant: true }
    }
  }
}

function fieldLabel(field: KitGradeField, patch: Partial<KitSpec>): string | null {
  switch (field) {
    case 'base':
      return patch.base ? colour(patch.base) : null
    case 'pattern':
      return patch.pattern ? labelOf(PATTERNS, patch.pattern) : null
    case 'secondary':
      return patch.pattern === 'solid' ? labelOf(PATTERNS, 'solid') : patch.patternInk ? colour(patch.patternInk) : null
    case 'collar':
      return patch.collar ? labelOf(COLLARS, patch.collar) : null
    case 'collarInk':
      return patch.collarInk ? colour(patch.collarInk) : null
    case 'sleeves':
      return patch.sleeves ? labelOf(SLEEVES, patch.sleeves) : null
    case 'sleeveInk':
      return patch.sleeveInk ? colour(patch.sleeveInk) : null
    case 'crest':
      return patch.crestKey ? crestLabel(patch.crestKey) : null
    case 'maker':
      return patch.makerHe ?? null
    case 'sponsor':
      return patch.sponsorHe ?? null
  }
}

function evidenceOf(kit: KitMasterRecord): KitVerdict['evidence'] {
  const e = kit.evidence
  const map = (p: NonNullable<typeof e.exactPhoto>) => ({ src: p.src, sourceTitle: p.sourceTitle, sourceUrl: p.sourceUrl, creditHe: p.creditHe, yearRaw: p.yearRaw })
  if (e.exactPhoto) return { kind: 'exact', photos: [map(e.exactPhoto)] }
  if (e.candidatePhotos.length > 0) return { kind: 'candidate', photos: e.candidatePhotos.slice(0, 3).map(map) }
  return { kind: 'reconstruction', photos: [] }
}

function countHints(seed: number, cursor: number, index: number, receipts: readonly string[], claimed: number): number {
  const proven = HINT_KINDS.filter((kind) => receipts.some((receipt) => verifyHintReceipt(seed, cursor, index, kind, receipt))).length
  const claim = Number.isFinite(claimed) ? Math.max(0, Math.min(KIT_HINT_LIMIT, Math.floor(claimed))) : 0
  return Math.max(proven, claim)
}

export function gradeKitPuzzle(
  seed: number,
  index: number,
  placed: Partial<Record<KitStep, string>>,
  cursor = 0,
  receipts: readonly string[] = [],
  claimedHints = 0,
  window?: KitWindow,
  legacy = false,
): KitVerdict | null {
  const row = deal(seed, cursor, window, legacy)[index]
  if (!row) return null
  const { kit, puzzle } = row
  const truthSpec = specOf(kit)

  const steps: StepVerdict[] = puzzle.steps.map(({ step, options }) => {
    const chosen = options.find((option) => option.id === placed[step]) ?? null
    const patch = chosen?.patch ?? {}
    const truthPatch = bundle(kit, step)?.patch ?? {}
    let tolerant = false
    const fields: FieldVerdict[] = STEP_FIELDS[step].map((field) => {
      const verdict: { ok: boolean; tolerant: boolean; unknown?: boolean } = chosen ? gradeKitField(kit, patch, field) : { ok: false, tolerant: false }
      // an unknown truth is awarded but says nothing about the player's memory
      if (verdict.ok && verdict.tolerant && !verdict.unknown) tolerant = true
      return {
        field,
        ok: verdict.ok,
        points: verdict.ok ? FIELD_WEIGHT[field] : 0,
        truthHe: fieldLabel(field, truthPatch) ?? '',
        chosenHe: chosen ? fieldLabel(field, patch) : null,
      }
    })
    const points = fields.reduce((sum, f) => sum + f.points, 0)
    return { step, points, max: STEP_WEIGHT[step], correct: fields.every((f) => f.ok), tolerant, fields }
  })

  const right = steps.filter((s) => s.correct).length
  const perfect = right === STEP_ORDER.length
  const fieldPoints = steps.reduce((sum, s) => sum + s.points, 0)
  const baseScore = fieldPoints + (perfect ? PERFECT_BONUS : 0)
  const hintsUsed = countHints(seed, cursor, index, receipts, claimedHints)
  const dna = fieldPoints >= DNA_THRESHOLD

  return {
    puzzleId: puzzle.id,
    index,
    seasonLabel: kit.seasonLabel,
    variant: kit.variant,
    look: puzzle.look,
    steps,
    right,
    perfect,
    baseScore,
    hintsUsed,
    score: Math.max(0, baseScore - hintsUsed * KIT_HINT_PENALTY),
    answer: truthSpec,
    evidence: evidenceOf(kit),
    sourceTitle: kit.sourceTitle,
    sourceUrl: kit.sourceUrl,
    noteHe: kit.noteHe,
    unlock: { key: kit.legacyKey, token: signKitUnlock(kit.id, dna), dna },
  }
}

/* ------------------------------------------------------------------ hints */
export function kitHint(seed: number, index: number, kind: KitHintKind, cursor = 0, window?: KitWindow, legacy = false): KitHintAnswer | null {
  if (!HINT_KINDS.includes(kind)) return null
  const row = deal(seed, cursor, window, legacy)[index]
  if (!row) return null
  const f = row.kit.fields
  const flip = (seed + cursor + index) % 2 === 0
  let textHe: string
  if (kind === 'whisper') {
    // broad: the colour and whether it carried a pattern — never which pattern
    const base = colour(f.base.value ?? 'red')
    textHe = f.pattern.value === 'solid' ? t('kitgame.hint.whisperSolid', { base }) : t('kitgame.hint.whisperPattern', { base })
  } else if (kind === 'detail') {
    // one factual category: the collar, or the crest
    textHe = flip && f.collar.value
      ? t('kitgame.hint.collarText', { collar: labelOf(COLLARS, f.collar.value.id), ink: colour(f.collar.value.ink) })
      : t('kitgame.hint.crestText', { crest: crestLabel(f.crest.value?.key ?? '') })
  } else {
    // the front: the maker OR the sponsor, never both
    textHe = flip
      ? t('kitgame.hint.makerText', { maker: f.maker.value?.name ?? '' })
      : t('kitgame.hint.sponsorText', { sponsor: f.sponsor.value?.name ?? '' })
  }
  return { kind, textHe, penalty: KIT_HINT_PENALTY, receipt: hintReceipt(seed, cursor, index, kind) }
}
