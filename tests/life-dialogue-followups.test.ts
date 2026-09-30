import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ALL_CHARACTERS } from '@/lib/life/characters'
import { CHECKLISTS, checklistFor } from '@/lib/life/checklist'
import { CHAPTER } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { CLOSERS, FOLLOW_UPS, PRIVATE_FACTS, type FollowUp } from '@/lib/life/content/followUps'
import type { Say } from '@/lib/life/content/script'
import { spokenNow } from '@/lib/life/runtime/dialogue'
import { PLAYER_WHO, assertedFlags, knowsEnough, resolveFollowUp, speakerIdOf, speakerOf } from '@/lib/life/world/followUp'
import { liveGraph } from '@/lib/life/world/graph'
import type { Condition } from '@/lib/life/world/types'

import { buildMatrix, type MatrixRow } from './fixtures/followupMatrix'
import { WorldSim } from './fixtures/lifeWorldSim'

/**
 * השיחה השנייה — design pass v2 §20.8, the Definition of Done of Workstream A, as tests.
 *
 *   - no critical next step is answered by a generic repeat when the NPC can logically help;
 *   - an NPC never says what he could not know (who knows what is DATA: `PRIVATE_FACTS`);
 *   - a follow-up reflects the live graph's main step and never invents one;
 *   - a repeat cannot pay twice;
 *   - a reload gives the same answer;
 *   - and the reported case — 1991, Ofir → homework → Rachel — in all eight states of §20.7.
 */

const chaptersOf = (followUp: FollowUp): string[] =>
  followUp.chapter === '*' ? [] : typeof followUp.chapter === 'string' ? [followUp.chapter] : [...followUp.chapter]
const stepsOf = (followUp: FollowUp): string[] =>
  followUp.step === undefined ? [] : typeof followUp.step === 'string' ? [followUp.step] : [...followUp.step]
const npcsOf = (followUp: FollowUp): string[] =>
  followUp.npc === undefined ? [] : typeof followUp.npc === 'string' ? [followUp.npc] : [...followUp.npc]

/** every speaker a conversation has, as registry ids where there is one and as spelled otherwise */
function speakersOf(conversationId: string): Set<string> {
  const out = new Set<string>()
  for (const branch of DIALOGUE[conversationId]?.branches ?? []) {
    for (const line of branch.lines) {
      if (!line.who || line.who === PLAYER_WHO) continue
      out.add(speakerIdOf(line.who) ?? line.who)
    }
  }
  const nameHe = DIALOGUE[conversationId]?.nameHe
  if (nameHe) out.add(speakerIdOf(nameHe) ?? nameHe)
  return out
}

const who = (lines: readonly Say[]) => speakerOf(lines)

// ============================================================ the data contract ==
describe('follow-up data — every key still points at something that exists', () => {
  it('ids are unique', () => {
    const ids = FOLLOW_UPS.map((followUp) => followUp.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('every chapter, conversation, step and person named exists (the other agents rewrite these files)', () => {
    const missing: string[] = []
    const people = new Set(ALL_CHARACTERS.map((character) => character.id))
    for (const followUp of FOLLOW_UPS) {
      if (!followUp.on?.length && !followUp.npc) missing.push(`${followUp.id}: neither on nor npc`)
      for (const chapter of chaptersOf(followUp)) {
        if (!CHAPTER[chapter]) missing.push(`${followUp.id}: chapter ${chapter}`)
        for (const step of stepsOf(followUp)) {
          if (!(CHECKLISTS[chapter] ?? []).some((row) => row.id === step)) missing.push(`${followUp.id}: step ${chapter}/${step}`)
        }
      }
      for (const id of followUp.on ?? []) if (!DIALOGUE[id]) missing.push(`${followUp.id}: conversation ${id}`)
      for (const npc of npcsOf(followUp)) if (!people.has(npc)) missing.push(`${followUp.id}: person ${npc}`)
    }
    for (const id of Object.keys(CLOSERS)) if (!people.has(id)) missing.push(`closer for unknown person ${id}`)
    expect(missing).toEqual([])
  })

  it('the person answering is the person you walked up to — never somebody else in his box', () => {
    const wrong: string[] = []
    for (const followUp of FOLLOW_UPS) {
      const speaker = who(followUp.lines)
      if (speaker === null) {
        // narration only closes: a thing's description, or a silence the scene asks for (1998)
        if (followUp.cls !== 'CLOSED') wrong.push(`${followUp.id}: a ${followUp.cls} with nobody speaking`)
        continue
      }
      const id = speakerIdOf(speaker) ?? speaker
      for (const conversation of followUp.on ?? []) {
        if (!speakersOf(conversation).has(id)) wrong.push(`${followUp.id}: ${speaker} is not in ${conversation}`)
      }
      for (const npc of npcsOf(followUp)) if (id !== npc) wrong.push(`${followUp.id}: ${speaker} is not ${npc}`)
    }
    expect(wrong).toEqual([])
  })

  it('the lines are short — a follow-up is a reminder, not a second scene', () => {
    for (const followUp of FOLLOW_UPS) expect(followUp.lines.length, followUp.id).toBeLessThanOrEqual(4)
  })
})

// ================================================================ who knows what ==
describe('no omniscient NPCs (§20.3)', () => {
  const unknownTo = (followUp: FollowUp): string[] => {
    const speaker = speakerIdOf(who(followUp.lines))
    return assertedFlags(followUp.when).filter((flag) => {
      const witnesses = PRIVATE_FACTS[flag]
      return witnesses !== undefined && !(speaker && witnesses.includes(speaker))
    })
  }

  it('a private fact is asserted only by a witness, by somebody who was told on screen, or with `knows`', () => {
    const leaks: string[] = []
    for (const followUp of FOLLOW_UPS) {
      const facts = unknownTo(followUp)
      if (!facts.length) continue
      if (followUp.knows) continue
      if (followUp.toldBy === 'player') continue
      leaks.push(`${followUp.id} (${who(followUp.lines)}) asserts ${facts.join(', ')}`)
    }
    expect(leaks).toEqual([])
  })

  it('"the boy told him" means the boy says it, first', () => {
    for (const followUp of FOLLOW_UPS.filter((one) => one.toldBy === 'player')) {
      expect(followUp.lines[0]?.who, followUp.id).toBe(PLAYER_WHO)
      expect(followUp.cls, followUp.id).toBe('REACTION')
    }
  })

  /**
   * A HANDOFF points somewhere as if it knew the way there. When the step it points at was
   * revealed by something private (Rachel's answer, the note under the cup), a person who was
   * not in that room can only ASK — a CHECK-IN — until he is told.
   */
  it('a handoff onto a privately-revealed step needs the speaker to know how it was revealed', () => {
    const leaks: string[] = []
    const revealFacts = (chapter: string, step: string) =>
      assertedFlags((CHECKLISTS[chapter] ?? []).find((row) => row.id === step)?.revealWhen as Condition | undefined)
    for (const followUp of FOLLOW_UPS) {
      if (followUp.knows || followUp.toldBy) continue
      const pointing = followUp.cls === 'HANDOFF' || followUp.cls === 'REACTION' || followUp.cls === 'RECOVERY'
      if (!pointing) continue
      // a RECOVERY of a question is still a question
      if (followUp.cls === 'RECOVERY' && FOLLOW_UPS.some((other) => other.cls === 'CHECK-IN' && other.on?.some((id) => followUp.on?.includes(id)) && stepsOf(other).some((step) => stepsOf(followUp).includes(step)))) continue
      const speaker = speakerIdOf(who(followUp.lines))
      for (const chapter of chaptersOf(followUp)) {
        for (const step of stepsOf(followUp)) {
          const hidden = revealFacts(chapter, step).filter((flag) => PRIVATE_FACTS[flag] && !(speaker && PRIVATE_FACTS[flag]!.includes(speaker)))
          // an `any` reveal is private only if EVERY way of revealing it is
          const reveal = (CHECKLISTS[chapter] ?? []).find((row) => row.id === step)?.revealWhen
          const all = assertedFlags(reveal)
          if (hidden.length && hidden.length === all.length) leaks.push(`${followUp.id}: ${chapter}/${step} is revealed by ${hidden.join('/')}`)
        }
      }
    }
    expect(leaks).toEqual([])
  })

  it('the runtime drops a line whose speaker cannot know it', () => {
    const sim = new WorldSim('1991')
    sim.engine.dispatch({ t: 'flag.raised', flag: 'permission:no' })
    const leak: FollowUp = { id: 't', chapter: '1991', on: ['ofir-afternoon-1991'], cls: 'REACTION', when: { flag: 'permission:no' }, lines: [{ who: 'אופיר', text: 'אמא שלך אמרה לא.' }] }
    expect(knowsEnough(sim.state, leak, 'ofir')).toBe(false)
    expect(knowsEnough(sim.state, leak, 'rachel')).toBe(true)
    expect(knowsEnough(sim.state, { ...leak, toldBy: 'player', lines: [{ who: PLAYER_WHO, text: 'היא אמרה לא.' }, ...leak.lines] }, 'ofir')).toBe(true)
  })
})

// ======================================================== 1991 · the proving case ==
/**
 * §20.7 — the eight states. Each one is reached the way a player reaches it (the sim's rooms,
 * the real runner), heard, then reloaded from the log and asked again.
 */
describe('1991 · Ofir → homework → Rachel (§20.7)', () => {
  const OFIR = 'ofir-afternoon-1991'

  /** the boy who went to the hall in 1984 knows the way; Ofir waits in the street for him */
  function afternoon(): WorldSim {
    const sim = new WorldSim('1991')
    sim.engine.dispatch(
      { t: 'flag.raised', flag: 'life:knows:hall' },
      { t: 'flag.raised', flag: 'plan:tonight' },
      { t: 'flag.raised', flag: 'hw:given' },
      { t: 'flag.raised', flag: 'school:done' },
      { t: 'clock.advanced', minutes: 15 * 60 + 30 - sim.state.minute },
    )
    sim.go('street')
    return sim
  }

  /** press Ofir, read it to the end; returns what was on screen */
  function talk(sim: WorldSim, id = OFIR) {
    const spoken = spokenNow(sim.state, id)!
    expect(sim.press(id, (choices) => choices.find((choice) => choice.enabled)?.id ?? '')).toBe(true)
    return spoken
  }

  function sameAfterReload(sim: WorldSim, id = OFIR) {
    const before = spokenNow(sim.state, id)!
    const after = spokenNow(sim.reload().state, id)!
    expect(after.pick?.id).toBe(before.pick?.id)
    expect(after.lines.map((line) => line.text)).toEqual(before.lines.map((line) => line.text))
    return before
  }

  it('1 · the first talk is the authored scene', () => {
    const sim = afternoon()
    const first = talk(sim)
    expect(first.repeat).toBe(false)
    expect(first.lines.some((line) => line.text.includes('גמרת שיעורים'))).toBe(true)
  })

  it('2 · straight back, before homework: he sends him home, and says it plainer the third time', () => {
    const sim = afternoon()
    talk(sim)
    expect(liveGraph(sim.state, eraFor('1991')).mainStep).toBe('hw')
    const second = sameAfterReload(sim)
    expect(second.pick?.id).toBe('91-ofir-hw')
    expect(second.pick?.cls).toBe('HANDOFF')
    talk(sim)
    const third = sameAfterReload(sim)
    expect(third.pick?.cls).toBe('RECOVERY')
    for (const pick of [second, third]) expect(pick.pick?.generic).toBe(false)
  })

  it('3 · homework done, Rachel not asked yet: he ASKS — he does not know how the homework went', () => {
    const sim = afternoon()
    talk(sim)
    sim.engine.dispatch({ t: 'flag.raised', flag: 'hw:done' })
    expect(liveGraph(sim.state, eraFor('1991')).mainStep).toBe('permission')
    const now = sameAfterReload(sim)
    expect(now.pick?.id).toBe('91-ofir-asked')
    expect(now.pick?.cls).toBe('CHECK-IN')
    expect(now.lines[0]?.text).toContain('?')
  })

  it('4 · after asking, with a yes: he hears it from the boy, and only then says "go"', () => {
    const sim = afternoon()
    talk(sim)
    sim.engine.dispatch({ t: 'flag.raised', flag: 'hw:done' }, { t: 'flag.raised', flag: 'asked:mum' }, { t: 'flag.raised', flag: 'permission:yes' })
    expect(liveGraph(sim.state, eraFor('1991')).mainStep).toBe('hall')
    const told = sameAfterReload(sim)
    expect(told.pick?.id).toBe('91-ofir-told-yes')
    expect(told.lines[0]?.who).toBe(PLAYER_WHO)
    talk(sim)
    const after = sameAfterReload(sim)
    expect(after.pick?.id).toBe('91-ofir-hall')
  })

  it('5 · after a no: the boy tells him; Ofir names the two ways, never the kitchen pad; a note later is news again', () => {
    const sim = afternoon()
    talk(sim)
    sim.engine.dispatch({ t: 'flag.raised', flag: 'hw:faked' }, { t: 'flag.raised', flag: 'asked:mum' }, { t: 'flag.raised', flag: 'permission:no' })
    // the authored "no" branch plays first — it is a new branch; the repeat after it is the resolver
    const authored = talk(sim)
    expect(authored.repeat).toBe(false)
    const told = sameAfterReload(sim)
    expect(told.pick?.id).toBe('91-ofir-told-no')
    expect(told.lines.map((line) => line.text).join(' ')).not.toContain('פנקס')
    talk(sim)
    expect(sameAfterReload(sim).pick?.id).toBe('91-ofir-after-no')
    // renegotiation the other way: a note under the cup, and the boy says so
    sim.engine.dispatch({ t: 'flag.raised', flag: 'sneak:ready' })
    expect(sameAfterReload(sim).pick?.id).toBe('91-ofir-told-note')
  })

  it('6 · the evening moves: half past six he names his own clock; past half seven he is leaving', () => {
    const sim = afternoon()
    talk(sim)
    sim.wait(18 * 60 + 40 - sim.state.minute)
    // a new authored branch (after five) plays once in full first
    if (!spokenNow(sim.state, OFIR)!.repeat) talk(sim)
    expect(sameAfterReload(sim).pick?.cls).toBe('DEADLINE')
    expect(spokenNow(sim.state, OFIR)!.pick?.id).toBe('91-ofir-seven')
    sim.wait(19 * 60 + 35 - sim.state.minute)
    expect(sameAfterReload(sim).pick?.id).toBe('91-ofir-late')
  })

  it('7 · a reload anywhere gives the same answer (every state above reloads; and a fresh log replays the same heard flags)', () => {
    const sim = afternoon()
    talk(sim)
    talk(sim)
    const reloaded = sim.reload()
    expect(reloaded.state.flags['fu:91-ofir-hw']).toBe(true)
    expect(spokenNow(reloaded.state, OFIR)!.pick?.id).toBe('91-ofir-hw-again')
  })

  it('8 · the wrong friend first: Amit, asked twice, sends him to Ofir', () => {
    const sim = new WorldSim('1991')
    sim.engine.dispatch({ t: 'clock.advanced', minutes: 8 * 60 + 56 - sim.state.minute })
    sim.go('schoolyard')
    talk(sim, 'amit-yard')
    const again = sameAfterReload(sim, 'amit-yard')
    expect(again.pick?.id).toBe('91-amit-way')
    expect(again.lines.map((line) => line.text).join(' ')).toContain('אופיר')
  })

  it('the step Ofir answers is the step the "?" sheet shows — one graph', () => {
    const sim = afternoon()
    talk(sim)
    for (const flag of ['hw:done', 'asked:mum', 'permission:yes']) {
      const graph = liveGraph(sim.state, eraFor('1991'))
      const sheet = checklistFor(sim.state).find((item) => !item.done)?.id ?? null
      expect(graph.mainStep).toBe(sheet)
      const pick = resolveFollowUp(sim.state, eraFor('1991'), OFIR, 'אופיר')
      const followUp = FOLLOW_UPS.find((one) => one.id === pick.id)
      if (followUp?.step) expect(stepsOf(followUp)).toContain(graph.mainStep)
      sim.engine.dispatch({ t: 'flag.raised', flag })
    }
  })

  it('a repeat pays nothing twice: the bond from "גמרת שיעורים?" is not farmed', () => {
    const sim = afternoon()
    talk(sim)
    const bond = sim.state.bonds.ofir
    const rel = JSON.stringify(sim.state.relationships)
    for (let i = 0; i < 4; i += 1) talk(sim)
    expect(sim.state.bonds.ofir).toBe(bond)
    expect(JSON.stringify(sim.state.relationships)).toBe(rel)
  })
})

// ===================================================== the Batch 0 matrix, live ==
/**
 * Who can logically help with the step, chapter by chapter: a person on the list, pressed
 * again while that step is open, must answer the step (HANDOFF / CHECK-IN / RECOVERY /
 * DEADLINE / REACTION) — never a closing line. The list is authored from the fiction, not
 * from the follow-up files: it is the question, they are the answer.
 */
const HELPERS: Record<string, Record<string, readonly string[]>> = {
  // (delta 92) Efi is not in A2 any more; Rafi answers for the bread himself
  'a2-alley': { bread: ['rafi-a2'], alley: ['rachel-a2', 'rafi-a2'] },
  'a3-hall': { efi: ['efi-a3', 'usher-a3'] },
  'a4-shirt': { tin: ['kobi-a4', 'rachel-a4'], shirt: ['kobi-a4'] },
  'a5-first': { dress: ['kobi-a5'] },
  'a6-radio': { radio: ['rachel-a6', 'liron-a6'], liron: ['rachel-a6', 'liron-a6'] },
  'a7-week': { dad: ['amit-a7', 'rachel-a7'], hear: ['kobi-a7'] },
  '1986': { east: ['ofir-matchday', 'neighbour', 'keren-street', 'efi-hall', 'amit-street', 'amit-kiosk'], gate: ['steward', 'ofir-matchday'] },
  '1990': { math: ['ofir-1990'], kobi: ['kobi-gate-1990', 'veteran-1990', 'ofir-ground-1990', 'steward-1990'] },
  '1991': {
    school: ['ofir-yard', 'ofir-afternoon-1991', 'keren-yard', 'keren-class'],
    hw: ['ofir-yard', 'ofir-afternoon-1991', 'rachel-1991', 'keren-yard', 'keren-class'],
    permission: ['ofir-yard', 'ofir-afternoon-1991', 'keren-yard', 'keren-class'],
    hall: ['ofir-yard', 'ofir-afternoon-1991'],
  },
  '1993-cup': { money: ['amit-1993', 'efi-1993', 'rachel-1993', 'rafi-1993', 'michel-1993'], route: ['amit-1993', 'rachel-1993'], corner: ['efi-1993', 'ofir-1993', 'michel-1993', 'rachel-1993'] },
  '1993-galil': { g1: ['efi-galil'], g3: ['efi-galil'], g4: ['efi-galil'] },
  '1995-sinai': { radio: ['rafi-sinai', 'ofir-sinai'], argue: ['rafi-sinai', 'ofir-sinai'], poster: ['rafi-sinai', 'ofir-sinai'], facts: ['rafi-sinai', 'amit-sinai'] },
  '1996-army': { pack: ['kobi-army', 'rachel-army'], gate: ['barry-gate7'] },
  '1998-laces': { dad: ['ofir-laces', 'rachel-laces', 'soko-laces'], ground: ['ofir-laces', 'soko-laces'] },
  '1999-basket': { hall: ['seed-voice-asaf', 'seed-voice-michel'], kiosk: ['seed-voice-asaf', 'seed-voice-melamed', 'seed-voice-michel', 'seed-voice-dudu', 'seed-voice-omer'] },
  '1999-cup': { route: ['liron-cup99', 'michel-cup99'] },
  '2000-title': { route: ['michel-title', 'efi-title'] },
  '2000-double': { final: ['kobi-double'] },
}

/** the chapters of the task's critical-handoff list whose people are keyed by NPC (no room actor to revisit yet) */
const BY_NPC_ONLY = ['2007-table', '2007-registered', '2007-key', '2010-cup', '2010-teddy', '2016-crisis', '2023-tournament', '2026-plan', '2026-finale']

describe('Batch 0 matrix — every repeat while a mandatory step is open', () => {
  const rows = buildMatrix()
  const fixture: MatrixRow[] = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/life-followup-matrix.json'), 'utf8')).rows

  it('the matrix is not empty, and the fixture keeps what was heard before the resolver', () => {
    expect(rows.length).toBeGreaterThan(200)
    expect(fixture.length).toBeGreaterThan(200)
    // "today" is the generic pool: the answer every one of these rows gave on 25.9.2026
    expect(fixture.filter((row) => row.who).every((row) => /כבר|אין חדש|מהנהן|מחייך|אותו דבר/.test(row.today))).toBe(true)
  })

  it('no person is answered by the generic pool — ever', () => {
    const generic = rows.filter((row) => row.who && row.now.some((tag) => tag.endsWith(':generic')))
    expect(generic.map((row) => `${row.chapter} ${row.conversation}#${row.branch} ${row.who} @${row.step}`)).toEqual([])
  })

  it('no critical step is answered by a closing line when the person can logically help', () => {
    const closed: string[] = []
    for (const row of rows) {
      const helpers = HELPERS[row.chapter]?.[row.step]
      if (!helpers?.includes(row.conversation)) continue
      if (row.now.some((tag) => tag.startsWith('CLOSED'))) closed.push(`${row.chapter} ${row.conversation}#${row.branch} @${row.step} → ${row.now.join(',')}`)
    }
    expect(closed).toEqual([])
  })

  it('no regression against the fixture: a row that got a real answer still gets one', () => {
    const live = new Map(rows.map((row) => [`${row.chapter}|${row.conversation}|${row.branch}|${row.step}`, row]))
    const lost: string[] = []
    for (const old of fixture) {
      if (!old.who || old.now.every((tag) => tag.endsWith(':generic'))) continue
      const now = live.get(`${old.chapter}|${old.conversation}|${old.branch}|${old.step}`)
      if (now && now.now.some((tag) => tag.endsWith(':generic'))) lost.push(`${old.chapter} ${old.conversation}#${old.branch} @${old.step}`)
    }
    expect(lost).toEqual([])
  })

  it('every critical handoff 1983–2026 has at least one diegetic reminder authored', () => {
    const chapters = [...Object.keys(HELPERS), ...BY_NPC_ONLY]
    for (const chapter of chapters) {
      expect(FOLLOW_UPS.some((followUp) => chaptersOf(followUp).includes(chapter) && followUp.step !== undefined), chapter).toBe(true)
    }
  })
})
