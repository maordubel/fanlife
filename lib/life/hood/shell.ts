/**
 * LIFE · the hood — the game shell as a state machine (pure: no DOM, no engine).
 *
 *   boot → title → (new: name → intro → playing) | (continue → playing)
 *   playing ⇄ pause / map / bag / dialogue / cutscene → job done card → playing
 *   settings and help open from the title or the pause menu and go back to where they came from.
 *
 * `reduce` never throws and never leaves the machine: an event that does not fit the screen changes nothing.
 * Also here: the colours the shell may print for a club (accent policy) and the read-only clock.
 */
import {isYellowHex} from '@/lib/isYellow'
import {bannedColour} from '@/lib/life/rush-render/colour'
import type {VoxelSkin} from '@/lib/life/universal/skin'

export type Screen = 'boot' | 'title' | 'name' | 'intro' | 'playing' | 'pause' | 'map' | 'bag' | 'dialogue' | 'cutscene' | 'jobdone' | 'settings' | 'help'
export type Shell = {screen: Screen; /** where settings / help / map / bag go back to */ back: Screen | null; hasSave: boolean; name: string}
export type ShellEvent =
  | {t: 'booted'; hasSave: boolean; play?: boolean; name?: string}
  | {t: 'new'} | {t: 'name'; name: string} | {t: 'introDone'} | {t: 'continue'; name?: string}
  | {t: 'open'; to: 'pause' | 'map' | 'bag' | 'settings' | 'help'}
  | {t: 'back'} | {t: 'resume'} | {t: 'talk'} | {t: 'talkEnd'} | {t: 'jobDone'} | {t: 'cutDone'} | {t: 'cardDone'} | {t: 'quit'} | {t: 'esc'}

export const initialShell: Shell = {screen: 'boot', back: null, hasSave: false, name: ''}
/** only here does the street simulate with the player's input */
export const simRuns = (s: Screen): boolean => s === 'playing'
/** screens over the live street where the picture turns slowly by itself (the crane), no player in it */
export const isCrane = (s: Screen): boolean => s === 'title' || s === 'name' || s === 'intro' || s === 'cutscene' || s === 'boot'
/** screens that dim the picture behind a full panel */
export const isFull = (s: Screen): boolean => s === 'pause' || s === 'map' || s === 'bag' || s === 'settings' || s === 'help' || s === 'jobdone'

export const NAME_MAX = 14
/** letters, digits, space, apostrophe and hyphen only; collapsed spaces; at most NAME_MAX */
export function cleanName(raw: string): string {
  return raw.replace(/[^\p{L}\p{N} '’-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}

const go = (s: Shell, screen: Screen, back: Screen | null = null, extra: Partial<Shell> = {}): Shell => ({...s, ...extra, screen, back})

export function reduce(s: Shell, e: ShellEvent): Shell {
  const at = s.screen
  switch (e.t) {
    case 'booted': return at === 'boot' ? go(s, e.play ? 'playing' : 'title', null, {hasSave: e.hasSave, name: e.name ?? s.name}) : s
    case 'new': return at === 'title' ? go(s, 'name') : s
    case 'name': { if (at !== 'name') return s; const n = cleanName(e.name); return go(s, 'intro', null, {name: n}) }
    case 'introDone': return at === 'intro' ? go(s, 'playing', null, {hasSave: true}) : s
    case 'continue': return at === 'title' && s.hasSave ? go(s, 'playing', null, {name: e.name ?? s.name}) : s
    case 'open': {
      if (e.to === 'pause') return at === 'playing' ? go(s, 'pause') : s
      if (e.to === 'map' || e.to === 'bag') return at === 'playing' || at === 'pause' || at === 'map' || at === 'bag' ? go(s, e.to, at === 'map' || at === 'bag' ? s.back : at) : s
      if (e.to === 'settings') return at === 'title' || at === 'pause' ? go(s, 'settings', at) : s
      return at === 'title' || at === 'pause' ? go(s, 'help', at) : s
    }
    case 'back': return (at === 'map' || at === 'bag' || at === 'settings' || at === 'help') && s.back ? go(s, s.back) : s
    case 'resume': return at === 'pause' ? go(s, 'playing') : s
    case 'talk': return at === 'playing' ? go(s, 'dialogue') : s
    case 'talkEnd': return at === 'dialogue' ? go(s, 'playing') : s
    case 'jobDone': return at === 'playing' ? go(s, 'cutscene') : s
    case 'cutDone': return at === 'cutscene' ? go(s, 'jobdone') : s
    case 'cardDone': return at === 'jobdone' ? go(s, 'playing') : s
    case 'quit': return at === 'pause' ? go(s, 'title') : s
    case 'esc': switch (at) {
      case 'playing': return go(s, 'pause')
      case 'pause': return go(s, 'playing')
      case 'map': case 'bag': case 'settings': case 'help': return s.back ? go(s, s.back) : go(s, 'playing')
      case 'dialogue': return go(s, 'playing')
      case 'intro': return go(s, 'playing', null, {hasSave: true})
      case 'cutscene': return go(s, 'jobdone')
      case 'name': return go(s, 'title')
      case 'jobdone': return go(s, 'playing')
      default: return s
    }
  }
}

/* ───────────── the colours the shell prints ───────────── */

export const NAVY = '#0F1A28', CREAM = '#FFF1DC', LIME = '#B9E36A'
const lin = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255) }
export const contrast = (a: string, b: string): number => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const HEX = /^#[0-9a-fA-F]{6}$/
const usable = (hex: string | undefined, skin: Pick<VoxelSkin, 'rivals' | 'policy'>): hex is string => !!hex && HEX.test(hex) && !isYellowHex(hex) && !bannedColour(hex, skin)

/** the brand screens' accent: the green-lime, unless this club's colour policy forbids it (then cream) */
export function brandAccent(skin: Pick<VoxelSkin, 'rivals' | 'policy'>): string { return usable(LIME, skin) ? LIME : CREAM }
/** the in-game accent: the club's primary (or secondary) if it is allowed and reads on the navy glass, else the brand accent */
export function accentFor(skin: Pick<VoxelSkin, 'rivals' | 'policy' | 'p' | 's'>): {accent: string; on: string} {
  const pick = [skin.p, skin.s].find(h => usable(h, skin) && contrast(h, NAVY) >= 3.2) ?? brandAccent(skin)
  return {accent: pick, on: contrast(pick, NAVY) >= contrast(pick, CREAM) ? NAVY : CREAM}
}

/** the read-only street clock: 17:40 plus one game minute every 4 seconds, 24-hour */
export function clockText(t: number): string {
  const m = (17 * 60 + 40 + Math.floor(Math.max(0, t) / 4)) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
