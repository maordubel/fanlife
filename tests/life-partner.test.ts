import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { PARTNER_FLAG, PARTNER_TAG, partnerNameHe, resolveSpeaker } from '@/lib/life/partner'

/**
 * `PARTNER` — התג שהתסריט משתמש בו, ומי שעומד מאחוריו (21.9.2026).
 *
 * ענף חיי הבית כותב את הדובר `PARTNER` ושלוש דמויות יכולות למלא אותו. התוכן כותב
 * את התג פעם אחת והרדיוסר מחליף; הקובץ הזה מחזיק את שלוש הטענות שהבנייה נשענת עליהן.
 */
describe('PARTNER', () => {
  it('names the partner the player chose, through the registry', () => {
    expect(resolveSpeaker(PARTNER_TAG, { [PARTNER_FLAG]: 'melanie' })).toBe('מלאני')
    expect(resolveSpeaker(PARTNER_TAG, { [PARTNER_FLAG]: 'dor' })).toBe('דור')
    expect(resolveSpeaker(PARTNER_TAG, { [PARTNER_FLAG]: 'tamar' })).toBe('תמר')
  })

  it('invents nobody when there is no partner — the line has no speaker, not a stand-in', () => {
    expect(partnerNameHe({})).toBeNull()
    expect(resolveSpeaker(PARTNER_TAG, {})).toBeNull()
    expect(resolveSpeaker(PARTNER_TAG, { [PARTNER_FLAG]: 'nobody-by-that-id' })).toBeNull()
  })

  it('leaves every other speaker exactly as written', () => {
    expect(resolveSpeaker('קובי', { [PARTNER_FLAG]: 'melanie' })).toBe('קובי')
    expect(resolveSpeaker(null, { [PARTNER_FLAG]: 'melanie' })).toBeNull()
  })

  it('is only ever spoken behind a branch that requires a partner', () => {
    // A line tagged `PARTNER` in a branch that does not ask for `life:partner` would
    // play to a player who never chose anybody — and resolve to a line with no speaker.
    const leaks: string[] = []
    for (const [id, conversation] of Object.entries(DIALOGUE)) {
      for (const branch of conversation.branches) {
        const speaks = branch.lines.some((line) => line.who === PARTNER_TAG)
        if (!speaks) continue
        const gated = JSON.stringify(branch.when ?? {}).includes(`"${PARTNER_FLAG}"`)
        if (!gated) leaks.push(id)
      }
    }
    expect(leaks).toEqual([])
  })
})
