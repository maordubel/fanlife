import type { PlayerMasterV2Record } from '@/lib/archive/player-identity'
import { fold } from '@/lib/game/roster-search'

import { COMPETITIVE_CLUES, COMPETITIVE_FAMILIES, MIN_CONFIDENCE } from './build'
import type { BlindCowBank } from './types'

/**
 * בודק הבנק — what `npm run blind-cow:validate` and `tests/blind-cow.test.ts` both assert.
 * Returns a list of problems; an empty list is a clean bank.
 */
export function validateBank(bank: BlindCowBank, players: readonly PlayerMasterV2Record[]): string[] {
  const problems: string[] = []
  const byId = new Map(players.map((p) => [p.id, p]))
  const seen = new Set<string>()
  for (const q of bank.questions) {
    const where = `${q.id} (${q.targetDisplayNameHe})`
    if (seen.has(q.id)) problems.push(`${where}: duplicate id`)
    seen.add(q.id)
    const player = byId.get(q.targetPlayerId)
    if (!player) {
      problems.push(`${where}: target is not in the Player Master`)
      continue
    }
    if (q.clueIds.length !== q.remaining.length) problems.push(`${where}: remaining[] does not match clueIds[]`)
    // never his own name — any spelling, any part of it long enough to give him away
    const names = [player.displayName, ...player.aliases.he, ...player.aliases.latin]
    const tokens = new Set<string>()
    for (const name of names) {
      tokens.add(fold(name).toLowerCase())
      for (const part of fold(name).toLowerCase().split(' ')) if (part.length >= 3) tokens.add(part)
    }
    let lastFacet = ''
    let prev = Infinity
    for (const [i, id] of q.clueIds.entries()) {
      const clue = bank.clues[id]
      if (!clue) {
        problems.push(`${where}: clue ${id} missing`)
        continue
      }
      const text = fold(`${clue.labelHe} ${clue.valueHe}`).toLowerCase()
      const words = new Set(text.split(' '))
      for (const token of tokens) {
        if (token.includes(' ') ? text.includes(token) : words.has(token)) {
          problems.push(`${where}: clue ${i + 1} names him ("${clue.valueHe}")`)
        }
      }
      if (clue.facet === lastFacet) problems.push(`${where}: clues ${i} and ${i + 1} share the facet ${clue.facet}`)
      lastFacet = clue.facet
      if (clue.confidence < MIN_CONFIDENCE) problems.push(`${where}: clue ${i + 1} below confidence ${MIN_CONFIDENCE}`)
      if (clue.type === 'shirt_number' && !/בעונת \d{4}\/\d{2}/.test(clue.valueHe)) {
        problems.push(`${where}: a shirt number without its season`)
      }
      if (/סה"כ|בסך הכול|שערים בהפועל/.test(clue.valueHe)) problems.push(`${where}: a career total ("${clue.valueHe}")`)
      if (!clue.sourceRefs.length) problems.push(`${where}: clue ${i + 1} has no provenance`)
      const left = q.remaining[i] as number
      if (left > prev) problems.push(`${where}: clue ${i + 1} widens the field`)
      if (left === prev && prev > 1) problems.push(`${where}: clue ${i + 1} narrows nothing`)
      prev = left
    }
    const competitive = q.eligibleModes.includes('duel') || q.eligibleModes.includes('daily')
    if (competitive) {
      if (q.clueIds.length !== COMPETITIVE_CLUES) problems.push(`${where}: competitive with ${q.clueIds.length} clues`)
      if (new Set(q.clueIds).size !== q.clueIds.length) problems.push(`${where}: a clue twice`)
      if (q.families.length < COMPETITIVE_FAMILIES) problems.push(`${where}: competitive with ${q.families.length} families`)
      if (q.remaining[q.remaining.length - 1] !== 1) problems.push(`${where}: clue 10 does not settle it`)
    }
  }
  return problems
}
