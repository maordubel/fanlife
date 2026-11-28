import {describe, expect, it} from 'vitest'
import {STREET_KEYS, streetLine, type StreetWho} from '@/lib/life/hood/streetTalk'
import {hoodWord} from '@/lib/life/hood/words'
import type {HoodThings} from '@/lib/life/hood/things'

const T: HoodThings = {
  crest: null,
  kits: [{year: 1986, season: '1986-87', src: '/k/86.svg'}],
  cards: [
    {id: 'xx:1', code: 'X–01', name: 'Old Hand', from: 1960, to: 1971, src: null, kit: null},
    {id: 'xx:2', code: 'X–02', name: 'The Nine', from: 1982, to: 1989, src: null, kit: null},
    {id: 'xx:3', code: 'X–03', name: 'The Keeper', from: 1984, to: 1996, src: null, kit: null},
    {id: 'xx:4', code: 'X–04', name: 'The New Boy', from: 2004, to: 2010, src: null, kit: null},
  ],
}
const WHO: StreetWho[] = ['dad', 'mate', 'kiosk', 'neighbour']
const say = (who: StreetWho, turn: number, o: Partial<Parameters<typeof streetLine>[0]> = {}) => streetLine({who, things: T, year: 1986, have: [], lived: [], turn, ...o})

describe('LIFE · the street knows (lib/life/hood/streetTalk.ts)', () => {
  it('names a player only in a year he was at the club', () => {
    for (const who of WHO) for (let turn = 0; turn < 12; turn++) {
      const l = say(who, turn)
      const p = l?.vars.player, o = l?.vars.other
      for (const name of [p, o].filter(Boolean) as string[]) {
        const c = T.cards.find(x => x.name === name)!
        if (l!.key === 'hood.street.neighbour.old') expect(c.to, `${who} ${turn}`).toBeLessThan(1986 - 4)   // a man from before his time
        else { expect(c.from, `${who} ${turn} ${name}`).toBeLessThanOrEqual(1986); expect(c.to, `${who} ${turn} ${name}`).toBeGreaterThanOrEqual(1986) }
      }
      expect(Object.values(l?.vars ?? {})).not.toContain('The New Boy')   // nobody from the future, ever
    }
  })
  it('says nothing when the record has nothing, and nothing without a year', () => {
    for (const who of WHO) {
      expect(say(who, 0, {things: {crest: null, kits: [], cards: []}})).toBeNull()
      expect(say(who, 0, {year: null})).toBeNull()
      expect(say(who, 0, {things: null})).toBeNull()
    }
    expect(say('kiosk', 1, {year: 1978})).toBeNull()   // nobody on file that year, no shirt of that season: plain talk
  })
  it('turns the topic: the same person does not open the same way twice running when he has two things to say', () => {
    expect(say('kiosk', 0)!.key).not.toBe(say('kiosk', 1)!.key)
    expect(say('dad', 0, {lived: [{date: '24 May 1986', result: '1–0'}]})!.key).not.toBe(say('dad', 1, {lived: [{date: '24 May 1986', result: '1–0'}]})!.key)
  })
  it('knows what he has found, and speaks of a night only when he lived it', () => {
    expect(say('kiosk', 0)!.key).toBe('hood.street.kiosk.sticker')
    expect(say('kiosk', 0, {have: ['xx:2']})!.key).toBe('hood.street.kiosk.have')
    for (let turn = 0; turn < 6; turn++) expect(say('dad', turn)?.key).not.toBe('hood.street.dad.night')
    const n = say('dad', 0, {lived: [{date: '24 May 1986', result: '1–0'}]})!
    expect(n).toEqual({key: 'hood.street.dad.night', vars: {date: '24 May 1986', result: '1–0'}})
    expect(say('dad', 0, {lived: [{date: null, result: null}]})!.key).toBe('hood.street.dad.watch')   // an undated chapter is a personal one: nothing to quote
  })
  it('offers the shirt of the season only while it is the season\'s shirt', () => {
    expect(say('kiosk', 1)).toEqual({key: 'hood.street.kiosk.shirt', vars: {season: '1986-87'}})
    for (let turn = 0; turn < 4; turn++) expect(say('kiosk', turn, {year: 1991})?.key).not.toBe('hood.street.kiosk.shirt')
  })
  it('has the words for every line, with every name filled', () => {
    for (const k of STREET_KEYS) {
      const text = hoodWord(k, {player: 'P', other: 'O', season: 'S', date: 'D', result: 'R', from: 'F'})
      expect(text, k).not.toBe(k)
      expect(/\{[a-z]+\}/.test(text), k).toBe(false)
    }
  })
})
