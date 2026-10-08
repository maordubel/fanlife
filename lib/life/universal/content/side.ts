/**
 * The side of a day: small jobs, a few things done for the love of it, somewhere to sit down, and
 * a hatch or a stall that sells things worth having.
 *
 * Every universal chapter has an errand it is about. Around it a life has other things to do with
 * an afternoon — carry something for somebody, count something, take a penalty against a wall,
 * start a chant — and a few coins to spend, and a body that tires. None of this is the story and
 * none of it can block it: an action is optional, it is done once a day, it costs energy, it pays
 * coins or it feeds the heart, and a person who does none of them reaches exactly the same ending.
 *
 * The economy is one table (`SIDE_ECONOMY`, below) so that it can be read, tested and tuned in
 * one place:
 *
 *   · a job costs 15–25 energy and pays 2–9 coins, by age (a child, a teenager and an adult are not
 *     offered the same work, nor paid the same);
 *   · a small game is skill: `good` (and `ok`) pays in full and gives the standing, the bond and the
 *     heart; a `slip` still pays a third — the day's work was done, just not well — and costs the
 *     same energy, because tiredness is not a score;
 *   · a bench, a table or a fridge gives energy back; the hatch's snack gives the most;
 *   · the hatch and the stall sell keepsakes that raise `life:*` flags (a programme, a pin, a patch,
 *     a sticker pack, a ticket). Two things in them are earned, not bought: the scarf patch is sold
 *     to somebody whose heart has been seen (heart ≥ 15), the ticket to somebody the street knows
 *     (standing ≥ 15). Both always say what is missing.
 *
 * What it adds to a chapter is DATA the engine already understands — a spot, a talk, a keepsake —
 * so the validator, the simulator and the shell see nothing new and cannot get stuck on it. A job
 * is offered only in a room the chapter already uses, only on a spot the chapter does not, and only
 * at the ages it makes sense for. Nothing here is a fact about history.
 */
import type {Chapter, Cond, Effect, Keepsake, MiniGame, Placement, SpotUse, Talk, Verb} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

/** child (under 13) · teen (13–19) · adult */
type ByAge = readonly [child: number, teen: number, adult: number]
type JobDef = {
  id: string
  room: string
  spot: string
  label: string
  verb: Verb
  game: MiniGame
  from: number
  to: number
  /** coins for a good go; 0 = done for the love of it (then `heart` must be > 0) */
  pay: ByAge
  cost: number
  /** who asks: a role of the cast */
  giver: string
  ask: string
  done: string
  slip: string
  standing: number
  heart?: number
}

const stage = (age: number): 0 | 1 | 2 => (age < 13 ? 0 : age < 20 ? 1 : 2)
/** A day has this much doing in it before somebody has to sit down. The cheapest job costs 15. */
export const ENERGY_COST = 25
const BONDS = new Set(['kiosk', 'friend', 'boss', 'elder', 'mum', 'dad', 'steward'])
const MAX_JOBS = 4, MAX_JOBS_PER_ROOM = 2
const REST_FIRST = 'You are running on empty. Sit down somewhere — a bench, a table, something to eat — then come back to this.'

/** In the order they are offered: a chapter gets the first few that fit it. */
const JOBS: readonly JobDef[] = [
  {id: 'crates', room: 'street', spot: 'crates', label: 'Stack the crates', verb: 'take', game: 'carry', from: 8, to: 50, pay: [5, 8, 6], cost: 25, giver: 'kiosk', standing: 1,
    ask: 'Crates off the pavement before the delivery man comes back. Carefully — they are not mine, they are his.',
    done: 'The pavement is clear. {kiosk} counts the coins out slowly, as if they might change their mind.',
    slip: 'One crate went over. Nobody is cross; somebody sweeps. {kiosk} pays you for the ones that stayed up.'},
  {id: 'bottles', room: 'street', spot: 'bin', label: 'Take back the empties', verb: 'take', game: 'count', from: 8, to: 17, pay: [3, 4, 0], cost: 15, giver: 'friend', standing: 0,
    ask: 'Every one of those has a deposit on it. Nobody in this street has ever once checked. Bottles, yes — bottle tops, no.',
    done: 'You are slightly sticky and slightly richer. Both of those will pass.',
    slip: 'You came back with a pocket of bottle tops and not enough bottles. The shop pays for what it can see.'},
  {id: 'carwash', room: 'street', spot: 'car', label: 'Wash the neighbour’s car', verb: 'use', game: 'carry', from: 12, to: 70, pay: [0, 6, 9], cost: 20, giver: 'stranger', standing: 1,
    ask: 'Bucket, sponge, and not a drop on the windows from the wrong side. I will know.',
    done: 'It shines. The neighbour walks round it once, says nothing, and pays.',
    slip: 'A streak on the windscreen, and a bucket of water on your shoes. He pays for the half that shines.'},
  {id: 'kickwall', room: 'street', spot: 'graffiti', label: 'Penalties against the wall', verb: 'use', game: 'kick', from: 8, to: 70, pay: [2, 3, 0], cost: 15, giver: 'friend', standing: 2, heart: 2,
    ask: 'The goalie is painted on. He has never once saved one. That is not the point; the point is the corner.',
    done: 'The wall takes it. Somebody leaning in a doorway claps twice, slowly, and goes back inside.',
    slip: 'You hit the painted goalie square on the head. He is, to be fair, very good at it.'},
  {id: 'kickjackets', room: 'pitch', spot: 'jackets', label: 'Penalties between the jackets', verb: 'use', game: 'kick', from: 8, to: 70, pay: [3, 4, 0], cost: 15, giver: 'friend', standing: 2, heart: 2,
    ask: 'Two jackets for posts. Whoever saves it picks the next corner. You are the keeper’s problem today.',
    done: 'Three kicks and a lot of arguing about whether the second one was in. It was in.',
    slip: 'The jacket posts moved every time you looked at them. You will say that for years.'},
  {id: 'flags', room: 'route', spot: 'flags', label: 'Straighten the flags', verb: 'use', game: 'carry', from: 13, to: 70, pay: [0, 4, 6], cost: 20, giver: 'elder', standing: 2, heart: 1,
    ask: 'Somebody has to. It is always somebody who minds more than the rest.',
    done: 'They hang right now, all of them. Somebody walking past nods without knowing why.',
    slip: 'Most of them hang right. One does not, and you will see it every time you pass.'},
  {id: 'radio', room: 'kitchen', spot: 'radio', label: 'Get the radio to work', verb: 'listen', game: 'tune', from: 12, to: 70, pay: [0, 5, 8], cost: 15, giver: 'stranger', standing: 0,
    ask: 'A neighbour left it on your table: "if you can get a voice out of it, it is yours to charge for."',
    done: 'A voice, then music, then a man reading the weather. The neighbour pays and does not look at you.',
    slip: 'Static, static, and then, for a second, somebody laughing in another country. The neighbour pays you for the laugh.'},
  {id: 'chant', room: 'schoolyard', spot: 'bench', label: 'Start the chant', verb: 'use', game: 'clap', from: 10, to: 17, pay: [2, 3, 0], cost: 15, giver: 'friend', standing: 2, heart: 1,
    ask: 'Nobody will start it. Somebody has to start it. The wall is right there.',
    done: 'It catches on the third bar. By the sixth, the whole yard owns it, and nobody remembers whose it was.',
    slip: 'You started it. Nobody joined. A boy at the back clapped, once, out of pity, and that is also how it starts.'},
  {id: 'tins', room: 'workshop', spot: 'cans', label: 'Sort the tins', verb: 'take', game: 'count', from: 18, to: 70, pay: [0, 0, 9], cost: 25, giver: 'boss', standing: 1,
    ask: 'Tins by colour, then by size, then by what I say they are. Nine coins and I will not check.',
    done: 'He checks. He says nothing. That is the review.',
    slip: 'He checks. He says one word, and it is the name of a tin you did not sort. He pays for the rest.'},
  {id: 'table', room: 'room', spot: 'table', label: 'Lay the table', verb: 'use', game: 'carry', from: 6, to: 15, pay: [2, 3, 0], cost: 15, giver: 'mum', standing: 0,
    ask: 'Plates, then glasses, then forks, and nothing on the way back. You have two hands and one go.',
    done: 'Everything is where it should be. Nobody mentions it, which is how you know.',
    slip: 'Two forks short and a glass that will never be quite the same. She puts a coin in your hand anyway and the forks on the table.'},
  {id: 'drawer', room: 'kitchen', spot: 'drawer', label: 'Count the housekeeping tin', verb: 'open', game: 'count', from: 9, to: 70, pay: [3, 4, 5], cost: 15, giver: 'mum', standing: 0,
    ask: 'It is never right and it is never wrong by much. Count it, and do not tell me what it should have been. Coins only — the buttons stay.',
    done: 'Two coins short, exactly as predicted. She nods as if you had confirmed the weather.',
    slip: 'You counted it twice and got two answers. She takes the tin back and says the average is probably right.'},
  {id: 'swap', room: 'bedroom', spot: 'desk', label: 'Swap the doubles', verb: 'use', game: 'count', from: 6, to: 13, pay: [2, 3, 0], cost: 15, giver: 'friend', standing: 1,
    ask: 'You have six of the same one. Somebody out there has none. That is a market, whatever anyone says.',
    done: 'Swapped for two you wanted and one you will pretend you wanted. A fair day.',
    slip: 'You gave away the one you meant to keep. He is delighted. You are learning something about markets.'},
  {id: 'queue', room: 'gate', spot: 'board', label: 'Hold the queue board', verb: 'use', game: 'carry', from: 15, to: 70, pay: [0, 4, 7], cost: 25, giver: 'steward', standing: 2,
    ask: 'Stand there, hold that, and point. If anybody asks you anything, point harder.',
    done: 'Four hundred people have been told where to go by you. You have never felt so briefly in charge.',
    slip: 'A father with two children went through the wrong gate, and the steward quietly walked them back. He pays you for the ones who did not.'},
  {id: 'leaflets', room: 'bus-stop', spot: 'sign', label: 'Hand out the leaflets', verb: 'take', game: 'carry', from: 14, to: 70, pay: [0, 4, 6], cost: 20, giver: 'stranger', standing: 1,
    ask: 'Match-day coach times, printed this morning. Hand them to people who look like they are going.',
    done: 'Most are in the bin by the corner. Three are in coat pockets, and those three are the point.',
    slip: 'You handed a whole stack to a man who was only waiting for a bus to somewhere else. He was very polite about it.'},
  {id: 'echo', room: 'tunnel', spot: 'sign', label: 'Start a chant in the tunnel', verb: 'use', game: 'chant', from: 15, to: 70, pay: [0, 0, 0], cost: 15, giver: 'steward', standing: 3, heart: 3,
    ask: 'It carries in here. Everything carries in here. Give them four and let it come back.',
    done: 'It comes back twice as loud, from the dark, from people you cannot see. The steward pretends not to have heard.',
    slip: 'The tunnel gave you back your own voice, slightly late. It is, you decide, a good tunnel.'},
  {id: 'banner', room: 'terrace', spot: 'banner', label: 'Lead the chant', verb: 'use', game: 'chant', from: 10, to: 70, pay: [0, 0, 0], cost: 20, giver: 'elder', standing: 3, heart: 3,
    ask: 'They will follow somebody. Give them four beats and wait for the stand to answer.',
    done: 'The stand answers. For eight bars there is no stand and no you, only the sound — and then somebody asks who started it, and nobody can say.',
    slip: 'You started it a beat early, and the stand waited politely and then did it properly. That is also how a chant gets taught.'},
  {id: 'invoice', room: 'flat-abroad', spot: 'laptop', label: 'Do the invoices tonight', verb: 'use', game: 'count', from: 20, to: 70, pay: [0, 0, 9], cost: 25, giver: 'stranger', standing: 0,
    ask: 'Seven invoices, one spreadsheet, and the match on the second screen with the sound off.',
    done: 'You are paid in a currency you have to look up. The match was a draw, you gather, from the faces.',
    slip: 'Two invoices went to the wrong person, who paid them anyway. You gather this is a kind of success.'},
  {id: 'boxes', room: 'flat-abroad', spot: 'boxes', label: 'Open the last box', verb: 'open', game: 'carry', from: 20, to: 70, pay: [0, 0, 8], cost: 20, giver: 'stranger', standing: 0,
    ask: 'A landlord would call this a deposit problem. You call it a box you have not opened since you arrived.',
    done: 'Inside: more of you than you remembered packing. A little money in an envelope, which you had forgotten you put there.',
    slip: 'You dropped it. Nothing broke that could be broken. The envelope was in the corner, all the same.'},
]

type RestDef = {id: string; at: readonly (readonly [room: string, spot: string])[]; label: string; verb: Verb; gain: number; line: string}
/** Places to sit down, or eat: they cost nothing and give back some of the day. One to a room, once a day. */
const REST: readonly RestDef[] = [
  {id: 'fridge', at: [['kitchen', 'fridge']], label: 'Something from the fridge', verb: 'open', gain: 25, line: 'Bread, then something on the bread. You eat it standing up, like everybody in this house.'},
  {id: 'kitchen-table', at: [['kitchen', 'table']], label: 'Sit at the table', verb: 'sit', gain: 15, line: 'A glass of water and the table’s one good chair. Nobody asks you for anything.'},
  {id: 'bedroom-window', at: [['bedroom', 'window']], label: 'Sit by the window', verb: 'sit', gain: 15, line: 'The street goes on without you for a while. It does that very well.'},
  {id: 'room-lamp', at: [['room', 'lamp']], label: 'Sit under the lamp', verb: 'sit', gain: 15, line: 'The good chair, the warm lamp, and the particular quiet of a room that is not yours to tidy.'},
  {id: 'bench', at: [['schoolyard', 'bench']], label: 'Sit on the bench', verb: 'sit', gain: 15, line: 'Five minutes with nobody wanting anything. The wall in front of you has not changed.'},
  {id: 'bus-bench', at: [['bus-station', 'bench']], label: 'Sit down for a minute', verb: 'sit', gain: 15, line: 'A bench, a timetable, and a stranger doing exactly what you are doing.'},
  {id: 'kerb', at: [['street', 'bin'], ['street', 'car'], ['street', 'window']], label: 'Sit on the kerb', verb: 'sit', gain: 15, line: 'The kerb is warm from the day. A dog crosses the road with great purpose, and so, in a way, do you.'},
  {id: 'jackets', at: [['pitch', 'jackets']], label: 'Sit on the pile of jackets', verb: 'sit', gain: 15, line: 'Somebody’s coat, somebody’s bag, and the particular smell of a game that is still going on without you.'},
  {id: 'step', at: [['terrace', 'banner'], ['route', 'sign'], ['gate', 'flag']], label: 'Sit on the step', verb: 'sit', gain: 15, line: 'The step is cold and the view is the right one. You could do this for a while.'},
  {id: 'bed', at: [['flat-abroad', 'bed']], label: 'Lie down for a minute', verb: 'sit', gain: 25, line: 'The ceiling is somebody else’s ceiling. You close your eyes and it is, for ten minutes, a different one.'},
  {id: 'telly', at: [['room', 'tv']], label: 'Sit in front of the telly', verb: 'sit', gain: 20, line: 'The news, then the weather, then a man shouting about a different sport. You are very rested.'},
]

type Good = {
  id: string
  label: string
  /** coins by age */
  price: ByAge
  say: string
  /** what it does when bought, beside paying */
  gives: Effect[]
  /** something that has to be true of the supporter for it to be on the counter at all */
  needs?: Cond
  /** said instead of the item, while it is not (what is missing, in the seller’s own words) */
  withheld?: string
  once: string
  keepsake?: Keepsake
}
type ShopDef = {id: string; at: readonly (readonly [room: string, spot: string])[]; label: string; giver: string; hello: string; goods: readonly Good[]}

const SNACK_ENERGY = 30
const SHOPS: readonly ShopDef[] = [
  {id: 'hatch', at: [['street', 'window']], label: 'The kiosk hatch', giver: 'kiosk', hello: 'Whatever you can afford, and not a coin less.', goods: [
    {id: 'snack', label: 'Something to eat', price: [2, 3, 4], once: 'shop:snack', gives: [{e: 'energy', by: SNACK_ENERGY}], say: 'It is warm. It is gone before you reach the corner.'},
    {id: 'programme', label: 'A match programme', price: [3, 4, 5], once: 'life:programme', gives: [heart(2), keep('shop-programme'), flag('life:programme')],
      say: 'Fixtures on the back, a squad photo on the front where everybody is looking at something else. It is yours now.',
      keepsake: {id: 'shop-programme', name: 'A match programme', note: 'Bought from the hatch with your own coins. The squad photo is looking at something else.'}},
    {id: 'pin', label: 'A pin for the scarf', price: [8, 10, 12], once: 'life:pin', gives: [heart(3), {e: 'standing', by: 2}, keep('pin'), flag('life:pin')],
      say: 'It is not much. It goes on the scarf, over the heart, and nobody is allowed to ask.',
      keepsake: {id: 'pin', name: 'A pin for the scarf', note: 'Bought with your own coins, from the hatch.'}},
    {id: 'patch', label: 'A woven patch for the scarf', price: [10, 12, 15], once: 'life:patch', gives: [heart(4), {e: 'standing', by: 3}, keep('shop-patch'), flag('life:patch')],
      needs: {min: ['heart', 15]}, withheld: 'There is a patch under the counter. They are not for everybody. They are for people I have seen at the ground more than once.',
      say: 'Woven, not printed. Sew it on yourself — it is no good if somebody else does it.',
      keepsake: {id: 'shop-patch', name: 'A woven patch', note: 'Sold to you because the hatch had seen you at the ground more than once.'}},
  ]},
  {id: 'stall', at: [['gate', 'flag'], ['gate', 'board'], ['route', 'sign'], ['route', 'flags'], ['street', 'car'], ['bus-station', 'board'], ['tunnel', 'sign']], label: 'The match-day stall', giver: 'stranger', hello: 'Scarves, stickers, a few good seats for people I know. Take your time; I am not going anywhere until the whistle.', goods: [
    {id: 'stickers', label: 'A pack of stickers', price: [4, 5, 6], once: 'life:stickers', gives: [heart(1), {e: 'standing', by: 1}, keep('shop-stickers'), flag('life:stickers')],
      say: 'Five in a packet and you always want the one you do not get. That is the business.',
      keepsake: {id: 'shop-stickers', name: 'A pack of stickers', note: 'Five in a packet. The one you wanted is not in it.'}},
    {id: 'ticket', label: 'A ticket for the good side', price: [5, 8, 12], once: 'life:ticket', gives: [heart(4), {e: 'standing', by: 2}, keep('shop-ticket'), flag('life:ticket')],
      needs: {min: ['standing', 15]}, withheld: 'There are good seats behind the counter. I keep them for people the street knows. Come back when it knows you a bit better.',
      say: 'Same price as the bad side, a better view, and a neighbour who sings in tune. You did not hear it from me.',
      keepsake: {id: 'shop-ticket', name: 'A ticket for the good side', note: 'Kept back for you, because the street knew your name.'}},
  ]},
]

/** The whole side economy as one table: what a day can earn, what it costs, what a coin can buy. */
export const SIDE_ECONOMY = {
  energyPerDay: 100,
  jobs: JOBS.map(j => ({id: j.id, ages: [j.from, j.to] as const, game: j.game, cost: j.cost, pay: j.pay, slipPay: j.pay.map(p => (p > 0 ? Math.max(1, Math.floor(p / 3)) : 0)) as unknown as ByAge, standing: j.standing, heart: j.heart ?? 0})),
  rests: REST.map(r => ({id: r.id, gain: r.gain})),
  shops: SHOPS.map(s => ({id: s.id, goods: s.goods.map(g => ({id: g.id, price: g.price, needs: g.needs ?? null}))})),
} as const

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
  const hasKeepsake = (id: string) => chapter.keepsakes?.some(k => k.id === id) || keepsakes.some(k => k.id === id)
  const free = (room: string, spot: string) => rooms.has(room) && !taken.has(`${room}:${spot}`)
  const jobsIn = new Map<string, number>()

  for (const j of JOBS) {
    if (spots.filter(x => x.id.startsWith('job-')).length >= MAX_JOBS) break
    const pay = j.pay[s], reward = j.heart ?? 0
    if (chapter.age < j.from || chapter.age > j.to || (pay <= 0 && reward <= 0) || !free(j.room, j.spot) || (jobsIn.get(j.room) ?? 0) >= MAX_JOBS_PER_ROOM) continue
    jobsIn.set(j.room, (jobsIn.get(j.room) ?? 0) + 1); taken.add(`${j.room}:${j.spot}`)
    const key = `job:${j.id}`, id = `job-${j.id}`
    const slipPay = pay > 0 ? Math.max(1, Math.floor(pay / 3)) : 0
    const tired: Effect[] = [{e: 'energy', by: -j.cost}, flag(key)]
    const well: Effect[] = [...(pay > 0 ? [{e: 'coins', by: pay} as Effect, {e: 'sound', cue: 'coin'} as Effect] : []), ...(j.standing ? [{e: 'standing', by: j.standing} as Effect] : []), ...(reward ? [heart(reward)] : []), ...(BONDS.has(j.giver) ? [bond(j.giver, 2)] : []), flag(`${key}:good`)]
    const slipped: Effect[] = [...(slipPay ? [{e: 'coins', by: slipPay} as Effect] : []), flag(`${key}:slip`)]
    const tag = pay > 0 ? ` · ${pay} coins` : ''
    spots.push({id, room: j.room, spot: j.spot, when: {not: key}, talk: id, verb: j.verb, label: `${j.label}${tag}`})
    talks.push(
      {id, branches: [
        {when: {none: [{min: ['energy', j.cost]}]}, lines: [tell(REST_FIRST)]},
        {lines: [say(j.giver, j.ask), tell(`${pay > 0 ? `${pay} coins if you do it well. ` : ''}It will take ${j.cost} out of you${reward ? ', and it will be worth remembering' : ''}.`)], choices: [
          {id: 'do', t: 'Do it', then: [{e: 'play', game: j.game, id, then: tired, good: well, slip: slipped}], next: `${id}-done`},
          {id: 'later', t: 'Not now'},
        ]},
      ]},
      {id: `${id}-done`, branches: [{when: {flag: `${key}:slip`}, lines: [tell(j.slip)]}, {lines: [tell(j.done)]}]},
    )
  }

  const restRooms = new Set<string>()
  for (const r of REST) {
    const at = r.at.find(([room, spot]) => free(room, spot) && !restRooms.has(room))
    if (!at) continue
    const [room, spot] = at, key = `rest:${r.id}`, id = `rest-${r.id}`
    restRooms.add(room); taken.add(`${room}:${spot}`)
    spots.push({id, room, spot, when: {not: key}, talk: id, verb: r.verb, label: r.label})
    talks.push({id, branches: [{lines: [tell(r.line)], then: [{e: 'energy', by: r.gain}, flag(key)]}]})
  }

  const shopRooms = new Set<string>()
  for (const shop of SHOPS) {
    if (chapter.id === 'c2-shirt' || chapter.id === 'c3a-album') continue // the chapters whose story IS what a coin buys
    const at = shop.at.find(([room, spot]) => free(room, spot) && !shopRooms.has(room))
    if (!at) continue
    const [room, spot] = at
    shopRooms.add(room); taken.add(`${room}:${spot}`)
    const sid = shop.id === 'hatch' ? 'hatch' : `shop-${shop.id}`
    const menu = (): Talk['branches'][number]['choices'] => [
      ...shop.goods.map(g => {
        const price = g.price[s]
        return {id: g.id, t: `${g.label} — ${price} coins`, when: {all: [{min: ['coins', price]}, {not: g.once}, ...(g.needs ? [g.needs] : [])]} as Cond,
          then: [{e: 'coins', by: -price} as Effect, ...g.gives, flag(g.once), {e: 'sound', cue: 'coin'} as Effect], next: `${sid}-${g.id}`}
      }),
      {id: 'nothing', t: 'Nothing, thanks'},
    ]
    // when something is held back, the seller says what is missing (once, before the counter); otherwise just the counter
    const held = shop.goods.filter(g => g.needs)
    spots.push({id: sid, room, spot, talk: sid, verb: 'buy', label: shop.label})
    talks.push({id: sid, branches: [
      ...(held.length ? [{when: {any: held.map(g => ({all: [{not: g.once}, {none: [g.needs!]}]}) as Cond)} as Cond, lines: [say(shop.giver, shop.hello), tell(held.map(g => g.withheld!).join(' '))], choices: menu()}] : []),
      {lines: [say(shop.giver, shop.hello)], choices: menu()},
    ]})
    for (const g of shop.goods) {
      talks.push({id: `${sid}-${g.id}`, branches: [{lines: [g.id === 'snack' ? tell(g.say) : say(shop.giver, g.say)]}]})
      if (g.keepsake && !hasKeepsake(g.keepsake.id)) keepsakes.push(g.keepsake)
    }
  }

  if (!spots.length) return chapter
  return {...chapter, spots: [...chapter.spots, ...spots], talks: [...chapter.talks, ...talks], keepsakes: [...(chapter.keepsakes ?? []), ...keepsakes]}
}
