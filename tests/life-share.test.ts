import { describe, expect, it } from 'vitest'

import {
  FORMAT_SIZE,
  SHARE_URL,
  cardForAlbumPage,
  cardForEnding,
  cardForMemory,
  cardForMoment,
  askFor,
  cardIsClean,
  firstPerson,
  ownWordsFlag,
  shareHref,
  shareText,
  type ShareCard,
} from '@/lib/life/share'
import { LAYOUT, TEMPLATE_FILE } from '@/lib/life/runtime/shareCard'
import { emptyState } from '@/lib/life/events'
import { ENDINGS } from '@/lib/life/content/chapter1986'
import { ENDINGS_LACES } from '@/lib/life/content/chapter1998laces'
import type { LifeState, RedBoxItem } from '@/lib/life/types'

/**
 * מה שיוצא החוצה — והכלל של מאור שמעצב את כל זה.
 *
 * *"הישגים / תגים / רצפים. הקופסה האדומה היא ההישג."* קמפיין שבנוי על השחקן חייב לעמוד
 * בכלל הזה, אחרת הוא הופך בדיוק למה שהמשחק סירב להיות. כל כרטיס שהמערכת יכולה לייצר עובר
 * כאן דרך המסננת.
 */

const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const
const life = (over: Partial<LifeState> = {}): LifeState => ({ ...emptyState(IDENTITY, 1986), ...over })

const memory: RedBoxItem = {
  id: 'm1',
  year: 1986,
  atMinute: 20 * 60,
  sourceEventId: 'final-86',
  titleHe: 'כרטיס מקומט',
  noteHe: 'לא זרקת אותו.',
  item: 'ticket-stub',
  rarity: 'rare',
}

const everyCard = (state: LifeState): ShareCard[] => [
  cardForMemory(state, memory),
  cardForEnding(state, { ...(ENDINGS['inside'] ?? { titleHe: 'x', bodyHe: 'y', memoryHe: 'z' }), id: 'inside' }),
  cardForEnding(state, { ...(ENDINGS_LACES['witness'] as { titleHe: string; bodyHe: string; memoryHe: string }), id: 'witness' }),
  cardForAlbumPage(state, 'שנות השמונים', 'שלוש מעטפות'),
  cardForMoment(state, 'six', 'שש. הוא מסתובב אליך לאט.'),
]

describe('הקופסה האדומה היא ההישג — ולא שום דבר אחר', () => {
  it('puts no score, percentage, badge or streak on any card the game can make', () => {
    for (const card of everyCard(life())) {
      const verdict = cardIsClean(card)
      expect(verdict.ok, `${card.id}: ${verdict.whyHe}`).toBe(true)
    }
  })

  it('catches the wording the moment somebody writes it', () => {
    const bad: ShareCard = { ...cardForMoment(life(), 'x', 'השלמתי 80% מהאלבום'), captionHe: 'הישג' }
    expect(cardIsClean(bad).ok).toBe(false)
  })

  it('never carries an identifier for the player or the run', () => {
    for (const card of everyCard(life())) {
      const text = shareText(card)
      expect(text).toContain(SHARE_URL)
      // the branding is printed on the template itself; the escort text carries the question
      expect(text).toContain(card.askHe)
      // the link is a constant: no seed, no id, no query string of any kind
      expect(text.includes(`${SHARE_URL}?`)).toBe(false)
    }
    expect(SHARE_URL.includes('?')).toBe(false)
  })

  it('prefers his own words over ours, when the game has asked', () => {
    const state = life({ flags: { ...life().flags, [ownWordsFlag('final-86')]: 'שאבא בכה ולא אמר כלום' } as LifeState['flags'] })
    const card = cardForMemory(state, memory)
    expect(card.ownWordsHe).toBe('שאבא בכה ולא אמר כלום')
    expect(shareText(card)).toContain('שאבא בכה')
  })

  it('says nothing in his voice when he was never asked', () => {
    expect(cardForMemory(life(), memory).ownWordsHe).toBeNull()
  })
})

describe('לאן זה הולך', () => {
  it('sends WhatsApp and X the text, and Facebook only the address', () => {
    const card = cardForMemory(life(), memory)
    expect(shareHref(card, 'whatsapp')).toContain('wa.me')
    expect(shareHref(card, 'x')).toContain('twitter.com/intent')
    expect(shareHref(card, 'facebook')).toContain(encodeURIComponent(SHARE_URL))
    // the two that need the file itself have no web address at all
    expect(shareHref(card, 'native')).toBeNull()
    expect(shareHref(card, 'download')).toBeNull()
  })
})

describe('התבנית והקוד קוראים את אותם מספרים', () => {
  it('keeps every zone inside its own canvas', () => {
    for (const [format, layout] of Object.entries(LAYOUT)) {
      const size = FORMAT_SIZE[format as keyof typeof FORMAT_SIZE]
      expect(layout.size).toEqual(size)
      for (const [name, zone] of Object.entries(layout)) {
        if (name === 'size' || name === 'art' || name === 'footer') continue
        const z = zone as { right: number; top: number; width: number; lineHeight: number; maxLines: number }
        expect(z.right + z.width, `${format}/${name} runs off the left edge`).toBeLessThanOrEqual(size.w)
        expect(z.top + z.lineHeight * z.maxLines, `${format}/${name} runs off the bottom`).toBeLessThanOrEqual(size.h)
      }
    }
  })

  /**
   * אינסטגרם אוכל 250 פיקסלים למעלה ו-250 למטה. כל מה שחייב להיקרא חי באמצע — וזה בדיוק
   * מה שהבריף אומר למאור, אז זה גם מה שהבדיקה אוכפת.
   */
  it('keeps the story card clear of the two strips Instagram covers', () => {
    const story = LAYOUT.story
    for (const [name, zone] of Object.entries(story)) {
      if (name === 'size' || name === 'art' || name === 'footer') continue
      const z = zone as { top: number; lineHeight: number; maxLines: number }
      expect(z.top, `${name} sits under the avatar row`).toBeGreaterThan(250)
      expect(z.top + z.lineHeight * z.maxLines, `${name} sits under the reply box`).toBeLessThan(1920 - 250)
    }
  })

  it('names the two template files the brief asks Maor for', () => {
    expect(TEMPLATE_FILE.story).toBe('/life/share/share-story.png')
    expect(TEMPLATE_FILE.square).toBe('/life/share/share-square.png')
  })
})

/**
 * הקרס — 7.9.2026, אחרי שמאור פסל את הכרטיס הראשון במשפט אחד: *"לא מרגיש שמועבר שום רגש,
 * שום סקרנות, שום עניין שיווקי."*
 *
 * הכרטיס החדש בנוי על שלושה דברים ולא על כותרת, ושלושתם נבדקים כאן. אם מישהו יחזיר בטעות
 * את התווית של המוזיאון — הבדיקה תיפול.
 */
describe('סטורי שעוצרים בשבילו', () => {
  it('leads with a date the tribe recognises, not a year', () => {
    const state = { ...life(), chapter: '1998-laces' }
    expect(cardForMoment(state, 'x', 'שם השוו.').dateHe).toBe('2.5.1998')
    expect(cardForMoment({ ...life(), chapter: '1990' }, 'x', 'y').dateHe).toBe('12.5.1990')
    expect(cardForMoment({ ...life(), chapter: '1986' }, 'x', 'y').dateHe).toBe('24.5.1986')
  })

  it('asks the viewer a question, and a different one per day', () => {
    expect(askFor('1998-laces')).toContain('איפה היית')
    expect(askFor('1990')).toContain('החשבון')
    expect(askFor('2000-double')).toContain('נותן')
    // a day with no written question still gets one, rather than an empty line
    expect(askFor('1995-sinai').length).toBeGreaterThan(4)
  })

  it('speaks in the first person, because a claim invites an answer and a label does not', () => {
    expect(firstPerson('ראית. זה מה שנשאר.')).toBe('ראיתי. זה מה שנשאר.')
    expect(firstPerson('נשארת עם מישהו')).toBe('נשארתי עם מישהו')
    // anything the list does not know stays exactly as written — broken Hebrew is worse
    expect(firstPerson('ככה זה עובר')).toBe('ככה זה עובר')
  })

  it('carries the question into the message that travels with the picture', () => {
    const card = cardForEnding({ ...life(), chapter: '1998-laces' }, {
      id: 'witness', titleHe: 'ראית. זה מה שנשאר.', bodyHe: '', memoryHe: '',
    })
    expect(card.claimHe).toContain('ראיתי')
    expect(shareText(card)).toContain('2.5.1998')
    expect(shareText(card)).toContain('איפה היית')
  })

  it('gives the date the biggest type on the card, and the question the loudest colour', () => {
    for (const layout of Object.values(LAYOUT)) {
      expect(layout.when.size, 'the date is not the biggest thing on the card').toBeGreaterThan(layout.title.size)
      expect(layout.body.ink, 'the question is not in the accent colour').toBe('accent')
      expect(layout.body.weight).toBe(700)
    }
  })
})
