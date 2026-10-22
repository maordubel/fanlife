/**
 * LIFE, universal — the chapter reel.
 * A chapter does not open with a card to read: it opens with a short documentary reel made of what
 * the game already owns (the age, the places, the keepsake, one narrator line). This file is the
 * pure part — which beats, in which order, for how long — so a test can hold it and the shell
 * only plays it. Nothing here is a match fact: the reel states ages, places and the chapter's own words.
 */
export type ReelBeat =
  | {k: 'slate'; ms: number; no: number; of: number; from: number; to: number}
  | {k: 'place'; ms: number; name: string; i: number}
  | {k: 'voice'; ms: number; text: string}
  | {k: 'title'; ms: number; title: string; kicker: string; keep: string | null}

export type ReelInput = {no: number; of: number; age: number; prevAge: number; title: string; kicker: string; intro: string; places: readonly string[]; keep?: string | null
  /** the club whose world the reel is shot in (public/life/town/shots/<club>/…); none = the code-drawn card */
  club?: string | null}

/**
 * The world-shot each beat stands on: the scarf left at home while the age counts, then the day as a supporter
 * walks it — the ticket in the hand, the tunnel, the stand — and the stand under the title. Shots are stills the
 * TOWN engine photographed (`public/life/town/shots.js`, `scripts/life/capture-shots.mjs`), one set per club.
 */
export const SHOTS = ['scarf', 'ticket', 'tunnel', 'stand'] as const
export type Shot = (typeof SHOTS)[number]
const DAY: readonly Shot[] = ['ticket', 'tunnel', 'stand']
export function shotFor(b: ReelBeat, voiceIndex = 0): Shot {
  if (b.k === 'slate') return 'scarf'
  if (b.k === 'place') return DAY[b.i % DAY.length]!
  if (b.k === 'voice') return voiceIndex % 2 ? 'stand' : 'tunnel'
  return 'stand'
}
export const shotSrc = (club: string, shot: Shot) => `/life/town/shots/${encodeURIComponent(club)}/${shot}.webp`

export const REEL_MS = {slate: 2000, place: 1400, voice: 2600, title: 2200} as const
export const MAX_PLACES = 3
export const MAX_VOICE = 2

/** sentences of the intro, at most two, each short enough to read as a subtitle */
export function voiceLines(intro: string): string[] {
  const parts = intro.split(/(?<=[.!?…])\s+/).map(x => x.trim()).filter(Boolean)
  return parts.slice(0, MAX_VOICE)
}

export function reelBeats(x: ReelInput): ReelBeat[] {
  const places = [...new Set(x.places.filter(Boolean))].slice(0, MAX_PLACES)
  return [
    {k: 'slate', ms: REEL_MS.slate, no: x.no, of: x.of, from: Math.max(0, Math.min(x.prevAge, x.age)), to: x.age},
    ...places.map((name, i): ReelBeat => ({k: 'place', ms: REEL_MS.place, name, i})),
    ...voiceLines(x.intro).map((text): ReelBeat => ({k: 'voice', ms: REEL_MS.voice, text})),
    {k: 'title', ms: REEL_MS.title, title: x.title, kicker: x.kicker, keep: x.keep ?? null},
  ]
}

export const reelLength = (beats: readonly ReelBeat[]) => beats.reduce((n, b) => n + b.ms, 0)
