/**
 * The side of a day: small jobs, a hatch that sells things, somewhere to sit down.
 *
 * Every universal chapter has an errand it is about. Around it, a life has other things to do with
 * an afternoon — carry something for somebody, count something, mend a radio — and a few coins to
 * spend, and a body that tires. None of this is the story and none of it can block it: a job is
 * optional, it is done once a day, it costs energy, it pays coins, and a person who does none of
 * them reaches exactly the same ending.
 *
 * What it adds to a chapter is DATA the engine already understands — a spot, a talk, a keepsake —
 * so the validator, the simulator and the shell see nothing new and cannot get stuck on it. A job
 * is offered only in a room the chapter already uses, only on a spot the chapter does not, and
 * only at the ages it makes sense for. Nothing here is a fact about history.
 */
import type {Chapter, Effect, Keepsake, MiniGame, Placement, SpotUse, Talk, Verb} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

type Pay = readonly [child: number, teen: number, adult: number]
type JobDef = {
  id: string
  room: string
  spot: string
  label: string
  verb: Verb
  game: MiniGame
  from: number
  to: number
  pay: Pay
  /** who asks: a role of the cast */
  giver: string
  ask: string
  done: string
  standing: number
}

const stage = (age: number): 0 | 1 | 2 => (age < 13 ? 0 : age < 20 ? 1 : 2)
export const ENERGY_COST = 30
const BONDS = new Set(['kiosk', 'friend', 'boss', 'elder', 'mum', 'dad', 'steward'])

/** In the order they are offered: a chapter gets the first few that fit it. */
const JOBS: readonly JobDef[] = [
  {id: 'crates', room: 'street', spot: 'crates', label: 'Stack the crates', verb: 'take', game: 'carry', from: 8, to: 19, pay: [5, 8, 0], giver: 'kiosk', standing: 1,
    ask: 'Crates off the pavement before the delivery man comes back. Carefully — they are not mine, they are his.',
    done: 'The pavement is clear. {kiosk} counts the coins out slowly, as if they might change their mind.'},
  {id: 'bottles', room: 'street', spot: 'bin', label: 'Take back the empties', verb: 'take', game: 'count', from: 8, to: 17, pay: [3, 4, 0], giver: 'friend', standing: 0,
    ask: 'Every one of those has a deposit on it. Nobody in this street has ever once checked.',
    done: 'You are slightly sticky and slightly richer. Both of those will pass.'},
  {id: 'flags', room: 'route', spot: 'flags', label: 'Straighten the flags', verb: 'use', game: 'carry', from: 13, to: 70, pay: [0, 4, 6], giver: 'elder', standing: 2,
    ask: 'Somebody has to. It is always somebody who minds more than the rest.',
    done: 'They hang right now, all of them. Somebody walking past nods without knowing why.'},
  {id: 'radio', room: 'kitchen', spot: 'radio', label: 'Get the radio to work', verb: 'listen', game: 'tune', from: 12, to: 70, pay: [0, 5, 8], giver: 'stranger', standing: 0,
    ask: 'A neighbour left it on your table: "if you can get a voice out of it, it is yours to charge for."',
    done: 'A voice, then music, then a man reading the weather. The neighbour pays and does not look at you.'},
  {id: 'chant', room: 'schoolyard', spot: 'bench', label: 'Start the chant', verb: 'use', game: 'clap', from: 10, to: 17, pay: [2, 3, 0], giver: 'friend', standing: 2,
    ask: 'Nobody will start it. Somebody has to start it. The wall is right there.',
    done: 'It catches on the third bar. By the sixth, the whole yard owns it, and nobody remembers whose it was.'},
  {id: 'tins', room: 'workshop', spot: 'cans', label: 'Sort the tins', verb: 'take', game: 'count', from: 18, to: 70, pay: [0, 0, 12], giver: 'boss', standing: 1,
    ask: 'Tins by colour, then by size, then by what I say they are. Twelve coins and I will not check.',
    done: 'He checks. He says nothing. That is the review.'},
  {id: 'table', room: 'room', spot: 'table', label: 'Lay the table', verb: 'use', game: 'carry', from: 6, to: 15, pay: [2, 3, 0], giver: 'mum', standing: 0,
    ask: 'Plates, then glasses, then forks, and nothing on the way back. You have two hands and one go.',
    done: 'Everything is where it should be. Nobody mentions it, which is how you know.'},
  {id: 'drawer', room: 'kitchen', spot: 'drawer', label: 'Count the housekeeping tin', verb: 'open', game: 'count', from: 9, to: 70, pay: [3, 4, 5], giver: 'mum', standing: 0,
    ask: 'It is never right and it is never wrong by much. Count it, and do not tell me what it should have been.',
    done: 'Two coins short, exactly as predicted. She nods as if you had confirmed the weather.'},
  {id: 'spares', room: 'bedroom', spot: 'desk', label: 'Sell the spare programmes', verb: 'use', game: 'count', from: 14, to: 60, pay: [0, 5, 7], giver: 'friend', standing: 1,
    ask: 'You have six of the same one. Somebody out there has none. That is a market, whatever your mother says.',
    done: 'Sold to a boy who looked at them the way you used to. You did not haggle. He did not need to be told.'},
  {id: 'queue', room: 'gate', spot: 'board', label: 'Hold the queue board', verb: 'use', game: 'carry', from: 15, to: 70, pay: [0, 4, 5], giver: 'steward', standing: 2,
    ask: 'Stand there, hold that, and point. If anybody asks you anything, point harder.',
    done: 'Four hundred people have been told where to go by you. You have never felt so briefly in charge.'},
  {id: 'leaflets', room: 'bus-stop', spot: 'sign', label: 'Hand out the leaflets', verb: 'take', game: 'carry', from: 14, to: 70, pay: [0, 4, 6], giver: 'stranger', standing: 1,
    ask: 'Match-day coach times, printed this morning. Hand them to people who look like they are going.',
    done: 'Most are in the bin by the corner. Three are in coat pockets, and those three are the point.'},
  {id: 'invoice', room: 'flat-abroad', spot: 'laptop', label: 'Do the invoices tonight', verb: 'use', game: 'count', from: 20, to: 70, pay: [0, 0, 12], giver: 'stranger', standing: 0,
    ask: 'Seven invoices, one spreadsheet, and the match on the second screen with the sound off.',
    done: 'You are paid in a currency you have to look up. The match was a draw, you gather, from the faces.'},
  {id: 'boxes', room: 'flat-abroad', spot: 'boxes', label: 'Open the last box', verb: 'open', game: 'carry', from: 20, to: 70, pay: [0, 0, 10], giver: 'stranger', standing: 0,
    ask: 'A landlord would call this a deposit problem. You call it a box you have not opened since you arrived.',
    done: 'Inside: more of you than you remembered packing. A little money in an envelope, which you had forgotten you put there.'},
]

/** Places to sit down, or eat: they cost nothing and give back some of the day. */
const REST = [
  {id: 'fridge', room: 'kitchen', spot: 'fridge', label: 'Something from the fridge', verb: 'open' as Verb, gain: 25, line: 'Bread, then something on the bread. You eat it standing up, like everybody in this house.'},
  {id: 'bench', room: 'schoolyard', spot: 'bench', label: 'Sit on the bench', verb: 'sit' as Verb, gain: 15, line: 'Five minutes with nobody wanting anything. The wall in front of you has not changed.'},
  {id: 'bus-bench', room: 'bus-station', spot: 'bench', label: 'Sit down for a minute', verb: 'sit' as Verb, gain: 15, line: 'A bench, a timetable, and a stranger doing exactly what you are doing.'},
] as const

const SHOP_PRICES = {snack: [2, 3, 4], pin: [8, 10, 12]} as const
/** The chapters whose story IS what a coin buys. */
const NO_SHOP = new Set(['c2-shirt', 'c3a-album'])

const roomsOf = (c: Chapter): Set<string> => {
  const out = new Set<string>([c.start.room])
  c.cast.forEach((p: Placement) => out.add(p.room))
  c.doors.forEach(d => { out.add(d.room); out.add(d.to) })
  c.spots.forEach(s => out.add(s.room))
  c.beats.forEach(b => out.add(b.room))
  return out
}

/** Where a chapter can have a job, a hatch or a bench: rooms it uses, on spots it does not. */
export function sideLife(chapter: Chapter): Chapter {
  if (chapter.id === 'finale' || chapter.id.startsWith('night-')) return chapter
  const rooms = roomsOf(chapter), taken = new Set(chapter.spots.map(s => `${s.room}:${s.spot}`)), s = stage(chapter.age)
  const spots: SpotUse[] = [], talks: Talk[] = [], keepsakes: Keepsake[] = []
  const usedRooms = new Set<string>()
  const free = (room: string, spot: string) => rooms.has(room) && !taken.has(`${room}:${spot}`)

  for (const j of JOBS) {
    if (spots.filter(x => x.id.startsWith('job-')).length >= 3) break
    const pay = j.pay[s]
    if (chapter.age < j.from || chapter.age > j.to || pay <= 0 || !free(j.room, j.spot) || usedRooms.has(j.room)) continue
    usedRooms.add(j.room); taken.add(`${j.room}:${j.spot}`)
    const key = `job:${j.id}`, id = `job-${j.id}`
    const reward: Effect[] = [{e: 'coins', by: pay}, {e: 'energy', by: -ENERGY_COST}, {e: 'standing', by: j.standing}, ...(BONDS.has(j.giver) ? [bond(j.giver, 2)] : []), flag(key), {e: 'sound', cue: 'coin'}]
    spots.push({id, room: j.room, spot: j.spot, when: {not: key}, talk: id, verb: j.verb, label: `${j.label} · ${pay} coins`})
    talks.push(
      {id, branches: [
        {when: {none: [{min: ['energy', ENERGY_COST]}]}, lines: [tell('You are running on nothing. Sit down for a minute, eat something, then come back to this.')]},
        {lines: [say(j.giver, j.ask), tell(`${pay} coins. It will take something out of you.`)], choices: [
          {id: 'do', t: 'Do it', then: [{e: 'play', game: j.game, id, then: reward}], next: `${id}-done`},
          {id: 'later', t: 'Not now'},
        ]},
      ]},
      {id: `${id}-done`, branches: [{lines: [tell(j.done)]}]},
    )
  }

  for (const r of REST) {
    if (!free(r.room, r.spot) || usedRooms.has(`rest:${r.room}`)) continue
    usedRooms.add(`rest:${r.room}`); taken.add(`${r.room}:${r.spot}`)
    const key = `rest:${r.id}`, id = `rest-${r.id}`
    spots.push({id, room: r.room, spot: r.spot, when: {not: key}, talk: id, verb: r.verb, label: r.label})
    talks.push({id, branches: [{lines: [tell(r.line)], then: [{e: 'energy', by: r.gain}, flag(key)]}]})
  }

  if (!NO_SHOP.has(chapter.id) && free('street', 'window')) {
    const [snack, pin] = [SHOP_PRICES.snack[s], SHOP_PRICES.pin[s]]
    taken.add('street:window')
    spots.push({id: 'hatch', room: 'street', spot: 'window', talk: 'hatch', verb: 'buy', label: 'The kiosk hatch'})
    talks.push({id: 'hatch', branches: [
      {lines: [say('kiosk', 'Whatever you can afford, and not a coin less.')], choices: [
        {id: 'snack', t: `Something to eat — ${snack} coins`, when: {all: [{min: ['coins', snack]}, {not: 'shop:snack'}]}, then: [{e: 'coins', by: -snack}, {e: 'energy', by: 30}, flag('shop:snack'), {e: 'sound', cue: 'coin'}], next: 'hatch-bought'},
        {id: 'pin', t: `A pin for the scarf — ${pin} coins`, when: {all: [{min: ['coins', pin]}, {not: 'life:pin'}]}, then: [{e: 'coins', by: -pin}, heart(3), {e: 'standing', by: 2}, keep('pin'), flag('life:pin'), {e: 'sound', cue: 'coin'}], next: 'hatch-pin'},
        {id: 'nothing', t: 'Nothing, thanks'},
      ]},
    ]})
    talks.push(
      {id: 'hatch-bought', branches: [{lines: [tell('It is warm. It is gone before you reach the corner.')]}]},
      {id: 'hatch-pin', branches: [{lines: [say('kiosk', 'It is not much. It goes on the scarf, over the heart, and nobody is allowed to ask.')]}]},
    )
    keepsakes.push({id: 'pin', name: 'A pin for the scarf', note: 'Bought with your own coins, from the hatch.'})
  }

  if (!spots.length) return chapter
  return {...chapter, spots: [...chapter.spots, ...spots], talks: [...chapter.talks, ...talks], keepsakes: [...(chapter.keepsakes ?? []), ...keepsakes]}
}
