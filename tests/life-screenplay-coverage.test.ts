import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import {
  REWORDED_CHOICES,
  WAITING_SCENES,
  screenplayGaps,
  type ScreenplayScene,
} from '@/lib/life/content/screenplay/coverage'

/**
 * המילים של התסריט במשחק — החלק של `npm run life:screenplay-coverage` שאסור לו לסגת.
 *
 * ב-21.9.2026 כל המכשירים היו ירוקים ושלוש בחירות שלמות לא היו בשום מקום, ענף שלם דובר
 * במילים של סצנה אחרת, ושתי בחירות שהתסריט נועל בתנאי הוצעו לכולם. זו הבדיקה שהייתה
 * חסרה: לא *"האם הפרק עולה"* אלא *"האם הוא הפרק שנכתב"*.
 */

const DIR = join(process.cwd(), 'lib/life/content')
const scenes = JSON.parse(readFileSync(join(DIR, 'screenplay/scenes.json'), 'utf8')) as ScreenplayScene[]
const corpus = readdirSync(DIR)
  .filter((file) => file.endsWith('.ts'))
  .map((file) => readFileSync(join(DIR, file), 'utf8'))
  .join('\n')
const gaps = screenplayGaps(scenes, corpus)

describe('THE WORKER LIFE — the screenplay is in the game', () => {
  it('every opening line and every choice is in the content, or waits by name', () => {
    const open = gaps.filter(
      (gap) => !(gap.sceneId in WAITING_SCENES) && !(gap.kind === 'choice' && gap.choiceId in REWORDED_CHOICES),
    )
    expect(open).toEqual([])
  })

  it('a waiting scene is still waiting — the day it is built, it leaves the list', () => {
    for (const id of Object.keys(WAITING_SCENES)) {
      expect(gaps.some((gap) => gap.sceneId === id), `${id} נבנתה — להוריד מ-WAITING_SCENES`).toBe(true)
    }
  })

  it('a reworded choice is still reworded — a list entry that no longer hides a gap goes', () => {
    for (const id of Object.keys(REWORDED_CHOICES)) {
      expect(gaps.some((gap) => gap.kind === 'choice' && gap.choiceId === id), `${id} כבר במילים של התסריט`).toBe(true)
    }
  })

  /**
   * **תנאי שהתסריט כתב הוא תנאי במשחק.** כל שורה כאן היא בחירה שהתסריט נועל
   * (`residence.abroad`, `flag.founding_role in …`, `flag.finale_party == three`), והבחירה
   * שנבנתה חייבת לשאת `when` — בעצמה או בענף שלה. U02.1 ו-Z07.2 נמצאו פתוחות לכולם.
   */
  const GATED: Record<string, [conversation: string, choice: string]> = {
    'U02.1': ['u-deliver', 'deliver'],
    'D08.1': ['d10-back', 'keep'],
    'D09.2': ['d10-morning', 'amit'],
    'P05.1': ['p-amit', 'repay'],
    'P05.2': ['p-amit', 'plan'],
    'Z07.2': ['z-up', 'meet'],
    'F00.3': ['f-money', 'three'],
    'F01.2': ['f-plan', 'three'],
    'F01.3': ['f-plan', 'reunion'],
    'F02.2': ['f-road', 'child'],
    'F02.3': ['f-road', 'wait'],
    'F04.2': ['f-back', 'three'],
    'F04.3': ['f-back', 'mine'],
    'J02.1': ['j-fix', 'correct'],
    'O02.1': ['o-team', 'agree'],
    // (pass D, 28.9.2026) O03 is the money corner of the seller's hour now — the same choice, the same gate
    'O03.1': ['o-tri-money', 'covered'],
    'Y05.2': ['y-after', 'repair'],
  }

  it.each(Object.entries(GATED))('%s carries the condition the screenplay wrote', (_scene, [conversation, choiceId]) => {
    const conv = DIALOGUE[conversation]!
    expect(conv, conversation).toBeDefined()
    const holders = conv.branches.flatMap((branch) =>
      (branch.choices ?? []).filter((choice) => choice.id === choiceId).map((choice) => ({ branch, choice })),
    )
    expect(holders.length, `${conversation}/${choiceId}`).toBeGreaterThan(0)
    for (const { branch, choice } of holders) expect(Boolean(choice.when ?? branch.when), `${conversation}/${choiceId}`).toBe(true)
  })

  it('A04 is the armchair branch of Z07, in its own words', () => {
    const branch = DIALOGUE['z-up']!.branches[0]!
    expect(branch.when).toEqual({ flag: 'life:armchair' })
    expect(branch.lines[0]!.text).toBe('אתה בכלל יודע נגד מי?')
  })
})
