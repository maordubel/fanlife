/**
 * A NIGHT FROM THE ARCHIVE.
 *
 * The one kind of chapter that stands on history. It is built from a single approved row of the
 * club's archive and it states NOTHING that row does not: the title is printed as it was
 * recorded, the date as it was recorded, and no line of dialogue adds an opponent, a scorer, a
 * minute or a place. What the chapter invents is where the supporter was sitting — which is his
 * to remember and nobody's to verify.
 *
 * If the row's title is a scoreline the engine can read ("A 2–1 B"), the room reacts to the
 * result. If it is not, the room reacts to nothing and says so.
 */
import {readMatch} from '../match'
import type {ArchiveRef, CardDef, Chapter, Effect, Line} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

export type NightResult = 'won' | 'lost' | 'drew' | 'unread'
export type NightEra = 'child' | 'teen' | 'adult'

/** Reads a recorded scoreline. Anything it cannot read with certainty is `unread` — never a guess. */
export const readResult = (title: string, clubNames: readonly string[]): NightResult => readMatch(title, clubNames)?.result ?? 'unread'

const whistle: Record<NightResult, {child: Line[]; teen: Line[]; adult: Line[]; ending: string}> = {
  won: {
    child: [tell('Dad makes a sound you have never heard a grown-up make.'), tell('He picks you up and the room goes round once, slowly, with everything still on its shelves.'), say('dad', 'Remember this. I am telling you now so that you know to.')],
    teen: [tell('The whole pavement goes up at once, like something thrown.'), tell('Somebody you have never met is holding your face in both hands and shouting the name of the club into it.'), say('friend', 'We were here! Say it — we were here!')],
    adult: [tell('You are on your feet and you do not remember standing.'), tell('The flat is too small for it. You open the window, and the street is already shouting back.')],
    ending: 'A night the club wrote down, and you were awake for all of it. The archive has the result. You have where you were standing.',
  },
  lost: {
    child: [tell('Dad switches the set off before the voices can start explaining.'), tell('He sits for a while with his hands on his knees.'), say('dad', 'You stay anyway. That is the whole trick. You stay anyway.')],
    teen: [tell('Nobody says anything. The little screen keeps talking to itself.'), tell('{kiosk} turns it down, then off, and starts stacking crates that did not need stacking.'), say('friend', 'Walk you home?')],
    adult: [tell('You turn it off and the flat is suddenly a place where a fridge hums.'), tell('It should matter less by now. That was the promise of getting older, and it was not kept.')],
    ending: 'A night the club wrote down, and it did not go your way. The archive has the result. You have the walk home.',
  },
  drew: {
    child: [tell('It ends, and nobody in the room knows what face to make.'), say('dad', 'Not nothing. Not everything.'), say('dad', 'You will have a lot of these. Learn to carry them.')],
    teen: [tell('It ends level, and the pavement breathes out all at once.'), say('friend', 'I do not know if I am happy.'), say('kiosk', 'Then you are a supporter. Go home.')],
    adult: [tell('It ends level. You sit with it the way you sit with weather.'), tell('Your tea has gone cold twice. You drink it anyway.')],
    ending: 'A night the club wrote down. The archive has the result. You have the feeling of not knowing what to do with your hands.',
  },
  unread: {
    child: [tell('Afterwards you could not have said what happened. You could have said exactly where everybody was sitting.'), say('dad', 'You will be telling people about tonight. Start practising.')],
    teen: [tell('Afterwards you could not have told it in order. You could have drawn the pavement from memory.'), say('friend', 'We were here for it. That is ours now.')],
    adult: [tell('Afterwards you sit with the lamp off and let the night be what it was.'), tell('The archive will keep what happened. You will keep the room.')],
    ending: 'A night the club wrote down. What happened is in the archive, in its own words. Where you were is yours.',
  },
}

/** One anchored night. `n` keeps ids unique when a life has several. */
export function nightChapter(anchor: ArchiveRef, age: number, result: NightResult, n: number, centre = false): Chapter {
  const era: NightEra = age < 13 ? 'child' : age < 20 ? 'teen' : 'adult'
  const id = `night-${n}`, f = (k: string) => `${id}:${k}`
  const item = `night:${anchor.factId}`
  const m = anchor.match
  // a match the archive states in full is told as a match: the two sides first, the result when the whistle goes
  const card: CardDef = {id: 'archive', kicker: 'From the archive', title: anchor.title, body: anchor.hint, archive: anchor, stage: m ? 'result' : undefined}
  const kickoff: CardDef | null = m ? {id: 'kickoff', kicker: 'Tonight', title: `${m.home} v ${m.away}`, body: anchor.hint, archive: anchor, stage: 'kickoff'} : null
  /** at the whistle the recorded result is laid on the table, then the night is over */
  const done: Effect[] = [...(m ? [{e: 'card' as const, card: 'archive'}] : []), flag(f('over')), keep(item), heart((result === 'won' ? 8 : 5) + (centre ? 4 : 0)), {e: 'standing', by: centre ? 6 : 3}, {e: 'end' as const, ending: 'night'}]
  /** the card that shows the night before it starts: with a readable match it is the kick-off, otherwise the record itself */
  const watching: Effect[] = [{e: 'card', card: kickoff ? 'kickoff' : 'archive'}]
  const base = {
    id, act: (era === 'child' ? 1 : era === 'teen' ? 2 : 3) as 1 | 2 | 3, age,
    title: centre ? 'The Night' : 'A Night from the Archive', kicker: centre ? `Age ${age} · the match` : `Age ${age} · a night the club wrote down`,
    anchor, ...(centre ? {centrepiece: true} : {}),
    cards: kickoff ? [kickoff, card] : [card],
    keepsakes: [{id: item, name: anchor.title, note: 'A night from the archive. You know where you were.'}],
    endings: {night: {title: 'You Were There', body: whistle[result].ending, keep: item}},
  }

  if (era === 'child') return {
    ...base,
    intro: 'Tonight you are allowed to stay up. Nobody has said why, and nobody needs to: the flat has been holding its breath since the afternoon.',
    start: {room: 'bedroom', spawn: 'start', time: 'night'},
    cast: [{who: 'dad', room: 'room', slot: 'sofa', talk: 'dad'}, {who: 'mum', room: 'room', slot: 'byDoor', talk: 'mum'}],
    doors: [
      {id: 'bed-out', room: 'bedroom', door: 'door', to: 'room', spawn: 'fromBedroom', label: 'The living room'},
      {id: 'room-bed', room: 'room', door: 'south', to: 'bedroom', spawn: 'fromLiving', label: 'Your room'},
    ],
    spots: [
      {id: 'wardrobe', room: 'bedroom', spot: 'wardrobe', when: {not: f('dressed')}, talk: 'dress', verb: 'open', label: 'The wardrobe'},
      {id: 'set', room: 'room', spot: 'tv', talk: 'set', verb: 'look', label: 'The set in the corner'},
    ],
    beats: [],
    objectives: [
      {id: 'dress', t: 'You cannot watch it in pyjamas. The wardrobe', done: {flag: f('dressed')}, room: 'bedroom'},
      {id: 'sit', t: 'Find your place before it starts', done: {flag: f('over')}, room: 'room'},
    ],
    talks: [
      {id: 'dress', branches: [{lines: [tell('The scarf goes on first. Then you look at yourself in the wardrobe door for longer than you would admit.')], then: [flag(f('dressed')), {e: 'wear', what: 'both'}]}]},
      {id: 'set', branches: [{lines: [tell('The set is warming up. Everybody in the room is pretending to do something else.')]}]},
      {id: 'mum', branches: [
        {when: {flag: f('dressed')}, lines: [say('mum', 'I am not nervous. I am folding.'), tell('She has folded the same towel three times.')]},
        {lines: [say('mum', 'You are not watching it dressed like that. Go on — properly.')]},
      ]},
      {id: 'dad', branches: [
        {when: {flag: f('dressed')}, lines: [say('dad', 'Good. Now — where do you sit? It matters. Do not ask me why it matters.')], choices: [
          {id: 'next', t: 'Next to Dad', then: [bond('dad', 6)], next: 'watch'},
          {id: 'rug', t: 'On the rug, exactly where you sat last time', then: [heart(4)], next: 'watch'},
          {id: 'behind', t: 'Behind the sofa, where you do not have to look', then: [flag(f('hid'))], next: 'watch'},
        ]},
        {lines: [say('dad', 'Not like that. Tonight you dress for it.')]},
      ]},
      {id: 'watch', branches: [{lines: [{who: null, t: 'It starts. After that the evening has no minutes in it, only breaths.'}], then: watching, next: 'whistle'}]},
      {id: 'whistle', branches: [{lines: whistle[result].child, then: done}]},
    ],
  }

  if (era === 'teen') return {
    ...base,
    intro: 'Nobody arranged it. By the time it gets dark, everybody you know is standing outside the kiosk, because that is where the little screen is.',
    start: {room: 'street', spawn: 'fromHome', time: 'night'},
    cast: [{who: 'kiosk', room: 'street', slot: 'kiosk', talk: 'kiosk'}, {who: 'friend', room: 'street', slot: 'customer', talk: 'friend'}, {who: 'elder', room: 'street', slot: 'wall', talk: 'elder'}],
    doors: [],
    spots: [{id: 'crates', room: 'street', spot: 'crates', talk: 'crates', verb: 'look', label: 'The crates'}],
    beats: [],
    objectives: [
      {id: 'friend', t: 'Find {friend} in the crowd outside the kiosk', done: {flag: f('met')}, room: 'street'},
      {id: 'place', t: 'Get a place where you can see the screen', done: {flag: f('over')}, room: 'street'},
    ],
    talks: [
      {id: 'crates', branches: [{lines: [tell('Three crates. On a normal night they are crates. Tonight they are the best seats on the street.')]}]},
      {id: 'elder', branches: [{lines: [say('elder', 'I have seen worse nights than this start better.'), say('elder', 'Stand still when it begins. Whoever moves is to blame.')]}]},
      {id: 'friend', branches: [
        {when: {flag: f('met')}, lines: [say('friend', 'Go and ask him. He likes you more than he likes me.')]},
        {lines: [say('friend', 'You came. I was going to say I did not care if you came.'), say('friend', 'We need a place. Ask {kiosk} — he decides who stands where.')], then: [flag(f('met')), bond('friend', 5)]},
      ]},
      {id: 'kiosk', branches: [
        {when: {flag: f('met')}, lines: [say('kiosk', 'Tonight nobody buys anything and everybody stands in my light.'), say('kiosk', 'Fine. Where do you want to be?')], choices: [
          {id: 'front', t: 'At the front, by the counter', then: [heart(4)], next: 'watch'},
          {id: 'crate', t: 'Up on the crate, over everybody\'s heads', then: [bond('friend', 4)], next: 'watch'},
          {id: 'back', t: 'At the back, where you can leave if you have to', then: [flag(f('hid'))], next: 'watch'},
        ]},
        {lines: [say('kiosk', 'You are looking for your friend, not for me. Over there.')]},
      ]},
      {id: 'watch', branches: [{lines: [tell('The street goes quiet the way a classroom does. Then it starts, and the evening has no minutes in it, only breaths.')], then: watching, next: 'whistle'}]},
      {id: 'whistle', branches: [{lines: whistle[result].teen, then: done}]},
    ],
  }

  return {
    ...base,
    intro: 'You are the one with the keys now, and the one who pays for the electricity. Tonight the flat is arranged around one corner of one room, the way it always was.',
    start: {room: 'kitchen', spawn: 'start', time: 'night'},
    cast: [{who: 'dad', room: 'room', slot: 'sofa', talk: 'dad'}],
    doors: [
      {id: 'kitchen-room', room: 'kitchen', door: 'door', to: 'room', spawn: 'fromKitchen', label: 'The living room'},
      {id: 'room-kitchen', room: 'room', door: 'east', to: 'kitchen', spawn: 'fromLiving', label: 'The kitchen'},
    ],
    spots: [
      {id: 'shelf', room: 'kitchen', spot: 'shelf', when: {not: f('glasses')}, talk: 'glasses', verb: 'take', label: 'Two glasses'},
      {id: 'set', room: 'room', spot: 'tv', talk: 'set', verb: 'look', label: 'The set in the corner'},
    ],
    beats: [],
    objectives: [
      {id: 'glasses', t: 'Two glasses, from the shelf. He will not ask', done: {flag: f('glasses')}, room: 'kitchen'},
      {id: 'sit', t: 'Sit down with him before it starts', done: {flag: f('over')}, room: 'room'},
    ],
    talks: [
      {id: 'glasses', branches: [{lines: [tell('Two glasses. The good ones are too good; these are the ones that have seen matches.')], then: [flag(f('glasses'))]}]},
      {id: 'set', branches: [{lines: [tell('The same corner. A different set, three sets later. The room still points at it.')]}]},
      {id: 'dad', branches: [
        {when: {flag: f('glasses')}, lines: [say('dad', 'You took your time.'), tell('He is in his place. He has been in his place for an hour.'), say('dad', 'Sit where you like. It is your sofa.')], choices: [
          {id: 'next', t: 'Next to him, like always', then: [bond('dad', 6)], next: 'watch'},
          {id: 'floor', t: 'On the floor, like when you were small', then: [heart(4), bond('dad', 3)], next: 'watch'},
          {id: 'stand', t: 'Standing, by the door. You cannot sit tonight', then: [flag(f('hid'))], next: 'watch'},
        ]},
        {lines: [say('dad', 'I am fine. I am early, that is all.'), say('dad', 'Bring glasses. Not the good ones.')]},
      ]},
      {id: 'watch', branches: [{lines: [tell('It starts. After that the evening has no minutes in it, only breaths — his and yours, not quite together.')], then: watching, next: 'whistle'}]},
      {id: 'whistle', branches: [{lines: whistle[result].adult, then: done}]},
    ],
  }
}
