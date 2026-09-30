import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import songsFile from '@/content/manual/songs.json'
import { MESSAGES } from '@/lib/i18n'
import {
  GATE_NUMBERS,
  HARSH_GATES,
  RESULT_TIERS,
  SONGS,
  SONG_CATEGORY_URL,
  VOICES,
  allVoiceKeys,
  microFeedback,
  resultPool,
  songFor,
  tierFromClues,
  tierFromShare,
  validateSongs,
  voice,
  voiceAction,
  whatsappLine,
  type GateNo,
} from '@/lib/voice'

/**
 * RED VOICE (ONE RED WORLD §2–§4, §40, §51) — the voice is a system, so it is tested like
 * one: every key it can hand out exists, every gate can speak, the same run always gets
 * the same line, the share is always "שלח ליציע", and the forbidden language guard reads
 * EVERY message file, not only the voice's own.
 */
const ROOT = join(__dirname, '..')

describe('the registry resolves', () => {
  it('every key the voice can hand out exists in the catalogue, non-empty', () => {
    const missing = allVoiceKeys().filter((key) => !(key in MESSAGES) || !MESSAGES[key]?.trim())
    expect(missing, missing.join('\n')).toEqual([])
  })

  it('every voice.* key in the catalogue is reachable from the registry or the exit (no dead strings, rule 32)', () => {
    const reachable = new Set<string>(allVoiceKeys())
    for (const n of GATE_NUMBERS) reachable.add(`voice.next.gate.${n}`)
    for (const key of [
      'voice.share.hint', 'voice.share.close', 'voice.exit.more', 'voice.next.archiveMatch', 'voice.next.archivePlayer',
      'voice.next.archive', 'voice.next.away', 'voice.next.goal', 'voice.next.awayDays', 'voice.next.life',
    ]) reachable.add(key)
    const dead = Object.keys(MESSAGES).filter((key) => key.startsWith('voice.') && !reachable.has(key))
    expect(dead, dead.join('\n')).toEqual([])
  })

  it('every one of the thirteen gates has an intro, a result and a WhatsApp line', () => {
    for (const gate of GATE_NUMBERS) {
      expect(VOICES[gate].intro.length, `gate ${gate} intro`).toBeGreaterThan(0)
      expect(RESULT_TIERS.some((tier) => resultPool(gate, tier).length > 0), `gate ${gate} result`).toBe(true)
      expect(whatsappLine(gate, { n: '3', x: 'X' }).length).toBeGreaterThan(0)
    }
  })

  it('every memory gate has both micro-feedback pools (§11: never a dry ✓/✗)', () => {
    for (const gate of [2, 3, 4, 6, 8, 10, 13] as GateNo[]) {
      expect(VOICES[gate].correct.length, `gate ${gate} correct`).toBeGreaterThan(0)
      expect(VOICES[gate].wrong.length, `gate ${gate} wrong`).toBeGreaterThan(0)
    }
  })

  it('carries the owner’s lines verbatim where the plan wrote one', () => {
    const say = (gate: GateNo, tier: Parameters<typeof resultPool>[1]) => resultPool(gate, tier).map((l) => MESSAGES[l.title])
    expect(say(1, 'done')).toContain('זאת הפועל שלך.')
    expect(say(2, 'high')).toContain('הרבה נשאר שם.')
    expect(say(2, 'mid')).toContain('חלק בראש. חלק בלב.')
    expect(say(2, 'low')).toContain('בשביל זה יש ארכיון.')
    expect(say(4, 'perfect')).toContain('לא שכחת פרט.')
    expect(say(8, 'perfect')).toContain('ככה זה קרה.')
    expect(say(10, 'high')).toContain('השם כבר היה שם.')
    expect(say(11, 'done')).toContain('זה מי שנשאר אצלך.')
    expect(voice({ gate: 7, moment: 'intro' }).title).toBe('אין פה תשובה נכונה. בגלל זה באנו.')
    expect(voice({ gate: 13, moment: 'intro' }).title).toBe('בהפועל הכול מתחבר בסוף.')
    expect(voiceAction(4, 'nearSponsor')).toBe('הספונסר ברח. החולצה לא.')
  })
})

describe('selection is deterministic', () => {
  it('the same seed gives the same line, and seeds spread across a pool', () => {
    for (const gate of GATE_NUMBERS) {
      for (const tier of RESULT_TIERS) {
        const a = voice({ gate, moment: 'result', result: tier, seed: 42, vars: { n: '7' } })
        const b = voice({ gate, moment: 'result', result: tier, seed: 42, vars: { n: '7' } })
        expect(a).toEqual(b)
      }
    }
    const titles = new Set(Array.from({ length: 40 }, (_, seed) => voice({ gate: 2, moment: 'result', result: 'high', seed }).title))
    expect(titles.size).toBe(resultPool(2, 'high').length)
  })

  it('micro-feedback walks the pool with the question index, the same way every time', () => {
    const run = Array.from({ length: 4 }, (_, i) => microFeedback(2, 'correct', 'seed-9', i)?.line)
    expect(new Set(run).size).toBe(VOICES[2].correct.length)
    expect(Array.from({ length: 4 }, (_, i) => microFeedback(2, 'correct', 'seed-9', i)?.line)).toEqual(run)
    expect(microFeedback(1, 'correct', 1, 0)).toBeNull()
  })

  it('never falls UP a tier: a low run never borrows a high line', () => {
    for (const gate of GATE_NUMBERS) {
      const low = resultPool(gate, 'low')
      const high = VOICES[gate].result.high ?? []
      if (VOICES[gate].result.low || VOICES[gate].result.mid) for (const line of low) expect(high).not.toContain(line)
    }
  })

  it('fills the placeholders it is given and leaves none behind', () => {
    const out = voice({ gate: 10, moment: 'result', result: 'high', seed: 1, vars: { n: '3' } })
    expect(`${out.eyebrow} ${out.title} ${out.body}`).not.toMatch(/\{\w+\}/)
    expect(out.body).toContain('3')
  })

  it('maps a share and a clue count to the tiers the plan names', () => {
    expect(tierFromShare(1)).toBe('perfect')
    expect(tierFromShare(0.75)).toBe('high')
    expect(tierFromShare(0.5)).toBe('mid')
    expect(tierFromShare(0.1)).toBe('low')
    expect(tierFromClues(true, 1)).toBe('perfect')
    expect(tierFromClues(true, 3)).toBe('high')
    expect(tierFromClues(true, 6)).toBe('mid')
    expect(tierFromClues(false, 2)).toBe('low')
  })
})

describe('"שלח ליציע" — the one share label (§2.1)', () => {
  it('is what every gate and every moment hands back', () => {
    for (const gate of GATE_NUMBERS) {
      for (const moment of ['intro', 'result', 'correct', 'wrong'] as const) {
        expect(voice({ gate, moment, seed: gate }).ctaShare).toBe('שלח ליציע')
      }
    }
  })
})

/* ------------------------------------------------------------------ forbidden language */

/**
 * §2.2 / §51 — "Awesome!", "You crushed it!", "Beat your friends!", "Loser", "Destroy",
 * "Prove you're a real fan", "אוהד אמיתי יודע". The product never tests how authentic a
 * supporter is, never shames a miss, and never bills a streak as a debt.
 */
const FORBIDDEN_LATIN = /\b(beat|beats|beating|crush|crushed|crushing|loser|losers|real fans?|awesome|destroy\w*|prove|proves|proven|proving)\b/i
const FORBIDDEN_HEBREW = ['תביס', 'תנצח את', 'אוהד אמיתי', 'אוהדים אמיתיים', 'לוזר', 'תוכיח']
/** guilt-streak phrasing: a streak as something you owe, lose, or fall behind on */
const GUILT_STREAK = [
  /אל תשבור את הרצף/,
  /(ה)?רצף (שלך )?(ייעלם|יישבר|בסכנה|ימות)/,
  /תאבד את הרצף/,
  /נשארת מאחור/,
  /don'?t break (the|your) streak/i,
  /streak (is )?(at risk|in danger)/i,
  /falling behind/i,
]

/**
 * Gate 11 is the one harsher voice (§20) — and even there, only these keys, named one by
 * one with the reason. Both are the black file's own dare: "prove you know the FILE", a
 * dare about sourced records, never about being a real supporter. Adding a key here is a
 * decision, not a fix.
 */
const GATE_11_EXEMPT: Readonly<Record<string, string>> = {
  'derby.fileCta': 'gate 11 · the black-file dare — about knowing the sourced file',
  'share.msg.file': 'gate 11 · the black-file share message — the same dare',
}

function violations(text: string): string[] {
  const out: string[] = []
  const latin = FORBIDDEN_LATIN.exec(text)
  if (latin) out.push(latin[0])
  for (const word of FORBIDDEN_HEBREW) if (text.includes(word)) out.push(word)
  for (const re of GUILT_STREAK) if (re.test(text)) out.push(re.source)
  return out
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
}

describe('the forbidden-language guard', () => {
  const files = readdirSync(join(ROOT, 'messages')).filter((f) => f.endsWith('.json'))

  it('reads every messages file (not only the voice’s own)', () => {
    expect(files).toContain('he.voice.json')
    expect(files.length).toBeGreaterThan(10)
  })

  it('finds no beat / crush / loser / real fan / awesome / destroy / prove, no Hebrew equivalent, no guilt streak', () => {
    const found: string[] = []
    for (const file of files) {
      const catalogue = JSON.parse(readFileSync(join(ROOT, 'messages', file), 'utf8')) as Record<string, unknown>
      for (const [key, value] of Object.entries(catalogue)) {
        if (typeof value !== 'string' || key in GATE_11_EXEMPT) continue
        for (const hit of violations(value)) found.push(`${file} · ${key} · ${hit}`)
      }
    }
    expect(found, found.join('\n')).toEqual([])
  })

  it('finds none in lib/voice itself (code, not the comments that name the list)', () => {
    const dir = join(ROOT, 'lib/voice')
    const found: string[] = []
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
      for (const hit of violations(stripComments(readFileSync(join(dir, file), 'utf8')))) found.push(`${file} · ${hit}`)
    }
    expect(found, found.join('\n')).toEqual([])
  })

  it('keeps the gate-11 exemptions honest: each still exists, is gate 11’s, and still needs its exemption', () => {
    expect(HARSH_GATES).toEqual([11])
    for (const key of Object.keys(GATE_11_EXEMPT)) {
      const value = MESSAGES[key]
      expect(value, key).toBeTruthy()
      expect(key.startsWith('derby.') || key === 'share.msg.file', key).toBe(true)
      expect(violations(value as string).length, `${key} no longer needs an exemption — remove it`).toBeGreaterThan(0)
      // harsher is still never "real fan" (§20)
      expect(value).not.toMatch(/אוהד אמיתי|real fan/i)
    }
  })

  it('holds the new voice to it with no exemption at all', () => {
    const voiceFile = JSON.parse(readFileSync(join(ROOT, 'messages/he.voice.json'), 'utf8')) as Record<string, string>
    for (const [key, value] of Object.entries(voiceFile)) expect(violations(value), key).toEqual([])
  })
})

/* ------------------------------------------------------------------ songs */

describe('Song Context Registry (§3) — metadata only, from what the repo holds', () => {
  const records = (songsFile as { records: Array<{ sport: string; slug: string }> }).records

  it('is valid by its own contract', () => {
    expect(validateSongs()).toEqual([])
  })

  it('holds exactly the football songs of content/manual/songs.json — nothing invented', () => {
    const football = records.filter((r) => r.sport === 'football').map((r) => r.slug).sort()
    expect(SONGS.map((s) => s.id).sort()).toEqual(football)
    expect(SONGS.length).toBeGreaterThan(0)
  })

  it('never carries a verse, and says its page was not read', () => {
    for (const song of SONGS) {
      expect(song.shortExcerpt).toBeUndefined()
      expect(song.attribution).toBe(true)
      expect(song.pageKnown).toBe(false)
      expect(song.sourceUrl).toBe(SONG_CATEGORY_URL)
    }
  })

  it('surfaces a song below confidence 2 only in the archive', () => {
    for (const song of SONGS.filter((s) => s.confidence < 2)) expect(song.surfaces).toEqual(['archive'])
    expect(songFor({ mood: 'belonging', surface: 'result', seed: 1 })?.confidence ?? 2).toBeGreaterThanOrEqual(2)
  })

  it('rejects a row that carries an excerpt', () => {
    const bad = { ...(SONGS[0] as (typeof SONGS)[number]), shortExcerpt: 'x' as unknown as undefined }
    expect(validateSongs([bad]).join()).toMatch(/no lyrics/)
  })
})
