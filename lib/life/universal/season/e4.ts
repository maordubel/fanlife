/**
 * Season One · Episode 4 — THE MISSING SQUARE. Age ten. The morning paper, the schoolyard, an album with one square
 * empty, and the bell.
 *
 * The morning: the paper of the week (rule 134 §4) has the club's night on its back page — the archive's own row —
 * and the album's back page is where a night like that goes. The zoom mission (RUSH `clipping-hunt`, rule 135) is the
 * flat gone through for the paper, the scissors and the glue before Dad takes the paper to work; the film after it
 * reads the clipping as recorded, and names a scorer only when the club's own match record lists him for that day.
 *
 * Then the job: find the sticker before the bell. Everybody has doubles, nobody has THE one — except the girl two desks
 * over, who has it three times and supports the other lot. Trade with her and you pay her price. Miss the bell and the
 * page stays empty, which is also an ending: an empty square is still yours.
 */
import type {ArchiveRef, CineDef} from '../types'
import {bond, cine, failed, flag, has, heart, is, me, not, opt, passed, remember, room, say, standing, think, type EpisodeScript, type Say} from './write'

const E = 'S1E4'
const done = (s: string) => `s1:${E}:${s}:done`
const BELL = `s1:${E}:bell`

/** the scorers the paper prints: only when the club's own record lists every goal of that day, by name (never a minute) */
export function clippingNames(paper: ArchiveRef | null): string[] {
  const m = paper?.match, d = m?.detail
  if (!m || !d || !d.scorers.length) return []
  const ours = m.us === 'home' ? m.homeGoals : m.awayGoals
  if (d.scorers.length !== ours) return []
  return [...new Set(d.scorers.map(x => x.name.trim()).filter(Boolean))]
}

/** the film after the clipping: the cut, the glue, the page — and the paper's own words, only what it printed */
function clipFilm(paper: ArchiveRef | null): CineDef {
  const names = clippingNames(paper)
  const read: Say = !paper ? think('Last night, cut out round the edge. The back page of the album is not empty any more.')
    : paper.match?.result === 'won' ? think('Cut out round the edge: the night they won. You read it twice. You read it a third time, for the shape of the words.')
    : paper.match?.result === 'lost' ? think('Cut out round the edge: the night they lost. It goes in anyway. The album keeps all of them.')
    : paper.match?.result === 'drew' ? think('Cut out round the edge: the night nobody won. It goes in anyway. It is still theirs.')
    : think('Cut out round the edge, exactly as the paper printed it. The album keeps it now.')
  return {id: 'e4-clip', shots: [
    {cam: 'close', on: ['me'], ms: 2300, act: [{who: 'me', do: 'emote', mood: 'wonder'}], say: read},
    ...(names.length ? [{cam: 'close' as const, on: ['me'], ms: 2400, say: think(`The paper names who scored: ${names.join(', ')}. You say ${names.length > 1 ? 'the names' : 'the name'} out loud, once, to the empty room.`)}] : []),
    {cam: 'wide', ms: 2200, act: [{who: 'me', do: 'emote', mood: 'joy'}], say: room('Glue on the back, palm flat for a count of ten. The album shuts on it like a door.')},
  ]}
}

export function e4(paper: ArchiveRef | null): EpisodeScript { return {
  id: E, no: 4, age: 10, act: 1,
  title: 'The Missing Square',
  logline: 'One empty square in the album. Twelve minutes of break.',
  next: 'No Ticket',
  intro: 'Two hundred and thirty-nine stickers. One empty square. It is the only square you can see.',
  keep: {id: 'album', name: 'The album', note: 'Every page full but one. Or every page full. Depends which life.'},
  start: {room: 'bedroom'},
  ...(paper ? {paper} : {}),
  open: {doc: 'e4-cold', cine: 'e4-open', mission: 'The clipping into the album. Then the last sticker, before the bell.'},
  close: ['e4-tal', 'e4-dudu'],
  box: {item: 'A sticker album', line: 'Page twelve has a square you still cannot look at without smiling.'},
  flash: {cine: 'e4-flash', card: 'Earlier that break'},
  tease: 'Grounded. No ticket. The one night that matters.',

  clock: {
    id: 'bell', s: 150, label: 'The bell', fail: BELL, from: has(done('clip')),
    until: any2(`s1:${E}:sticker`, 'life:s1:biro'),
    lines: [room('The bell. Everybody runs in. The schoolyard is suddenly just a yard.'), think('The square is still empty. The square will always have been empty, at least today.')],
    fx: [failed('The last sticker'), flag('life:master:F07:deal', 'empty'), flag('life:master:F07:gap', 'kept')],
  },

  people: [
    {who: 'friend', room: 'schoolyard', slot: 'friend'},
    {who: 'rival', room: 'schoolyard', slot: 'rival'},
    {who: 'wild', room: 'schoolyard', slot: 'hoop'},
    {who: 'teacher', room: 'classroom', slot: 'teacher'},
  ],
  barks: [
    {who: 'friend', room: 'schoolyard', lines: ['Got it, got it, need it, got it.', 'I will swap you anything for a shiny.', 'Do not trust anybody with a shiny.']},
    {who: 'wild', room: 'schoolyard', lines: ['I eat the ones I do not need.', 'Gum flavour. Every sticker tastes of gum.']},
    {who: 'rival', room: 'schoolyard', when: not(done('trade')), lines: ['Looking for something?', 'I might have it. I might have it three times.']},
  ],

  steps: [
    {
      id: 'clip', goal: 'The clipping into the album', main: true,
      at: {room: 'bedroom', spot: 'desk'}, verb: 'use',
      lines: paper
        ? [think('The back page of this morning’s paper has last night on it. The back page of the album is where last night goes.'), think('Dad takes the paper to work at eight. Paper. Scissors. Glue. Go.')]
        : [think('The back page of the album is for the nights. It is still empty.'), think('Dad takes the paper to work at eight. Paper. Scissors. Glue. Go.')],
      // close up: the flat gone through for this morning's paper, the scissors and the glue (RUSH `clipping-hunt`, rule 135)
      mission: {template: 'clipping-hunt'},
      game: 'count',
      show: [cine('e4-clip')],
      react: [room('The album goes in the bag, the bag goes on your back, and the bus waits for nobody.')],
      slip: [room('Not before the bus, though: Dad took the paper to work. It came home in his coat, the back page folded small and saved for you. You glued it in that night.')],
      fx: [flag('life:s1:clipping'), remember('clip', 'Cut last night out of the paper for the back of the album.')],
      cut: {room: 'schoolyard', spawn: 'fromClass'},
    },
    {
      id: 'doubles', goal: 'Sort your doubles on the bench', main: true,
      at: {room: 'schoolyard', spot: 'bench'}, verb: 'use',
      lines: [room('Break. Twelve minutes. The yard is a market.'), think('Your doubles. The currency of this schoolyard. Spend them wisely.')],
      game: 'count',
      react: [room('Three doubles worth anything. One goalkeeper nobody wants. A badge, slightly bent.')],
      fx: [{e: 'collect', item: 'double', n: 3}, flag('life:master:F06:fav', 'loose')],
    },
    {
      id: 'ask', goal: 'Find out who has it', main: true,
      at: {room: 'schoolyard', who: 'friend', slot: 'friend'}, verb: 'talk',
      lines: [me('Who has number one-four-four?'), say('friend', 'Nobody has one-four-four. One-four-four is a myth.'), say('friend', 'Except her. She has it three times. She is a dragon sitting on gold.')],
      mission: {template: 'sticker-swap'},
      react: [think('Everybody in this yard is a dealer. Only one of them has what you need.')],
      fx: [flag(`s1:${E}:knows`)],
    },
    {
      id: 'trade', goal: 'Get the sticker from {rival}', main: true, when: not(BELL),
      at: {room: 'schoolyard', who: 'rival', slot: 'rival'}, verb: 'talk',
      callbacks: [
        {when: has('life:s1:tal:said'), lines: [say('rival', 'You already said my team is better. That is worth nothing now. You spent it.')], group: 'said'},
        {when: has('life:s1:tal:never'), lines: [say('rival', 'Not for a hundred, you said. I remember. I like you a bit. A bit.')], group: 'said'},
      ],
      lines: [say('rival', 'One-four-four. I have three. Here is my price.')],
      ask: {
        timer: 9, silent: 'bag',
        options: [
          opt('doubles', 'All three of your doubles', [say('rival', 'Deal. Pleasure.'), room('She takes your three best doubles and gives you the square. It is warm from her pocket.')], [{e: 'give', item: 'double', to: 'rival'}, {e: 'give', item: 'double', to: 'rival'}, {e: 'give', item: 'double', to: 'rival'}, flag(`s1:${E}:sticker`), flag('life:master:F06:fav', 'trade'), flag('life:master:F07:gap', 'chase'), flag('life:master:F07:offer', 'copy'), flag('life:master:F07:deal', 'filled'), flag('life:rival:link', 'open'), passed('One-four-four'), remember('doubles', 'Gave {rival} all three doubles for one-four-four.')], {when: {owns: ['double', 3]}}),
          opt('bag', 'Carry her bag for a week', [say('rival', 'Every day. Up the stairs. With feeling.'), think('A week. Seven days. Five, technically. Still.')], [bond('rival', 4), standing(-1), flag(`s1:${E}:sticker`), flag('life:s1:bag'), flag('life:master:F07:gap', 'ask'), flag('life:master:F07:offer', 'promise'), flag('life:master:F07:deal', 'filled'), flag('life:rival:link', 'open'), passed('One-four-four'), remember('bag', 'Carried {rival}’s bag for a week. For a sticker.')]),
          opt('lie', 'Tell her it is a fake', [say('rival', 'Is it? Then you will not mind if I eat it.'), room('She holds it over her mouth. You fold immediately.'), say('rival', 'The bag. For a month. That is the fine for lying.')], [bond('rival', -2), flag(`s1:${E}:sticker`), flag('life:s1:bag'), flag('life:master:F07:gap', 'chase'), flag('life:master:F07:offer', 'dear'), flag('life:master:F07:deal', 'filled'), flag('life:rival:link', 'neutral'), passed('One-four-four, eventually'), remember('lie', 'Tried to lie to {rival}. Paid double.')]),
        ],
      },
    },
    {
      id: 'fake', goal: 'Or take {wild}’s “sticker”', side: true, when: not(BELL), after: ['ask'],
      at: {room: 'schoolyard', who: 'wild', slot: 'hoop'}, verb: 'talk',
      lines: [say('wild', 'One-four-four? I drew one. Look. It is nearly the same.'), room('It is a man with three arms and a moustache. In biro.')],
      ask: {
        timer: 6, silent: 'no',
        options: [
          opt('take', 'Stick it in. Close enough.', [say('wild', 'Legend.'), think('From a distance, if you squint, at night.')], [bond('wild', 6), heart(2), flag('life:s1:biro'), flag('life:master:F07:deal', 'friend-made'), flag('life:master:F07:gap', 'left'), remember('biro', 'Filled the last square with {wild}’s biro man.')]),
          opt('no', 'No. Thank you. No.', [say('wild', 'Your loss. He has three arms.')], [bond('wild', 1)]),
        ],
      },
    },
    {
      id: 'page', goal: 'Back to class with the album', main: true, final: true, after: [], when: any2(`s1:${E}:sticker`, 'life:s1:biro', BELL),
      at: {room: 'classroom', spot: 'desk'}, verb: 'open',
      callbacks: [
        {when: has(`s1:${E}:sticker`), lines: [room('You press it in with your thumb. Then with both thumbs. The page is full.')], group: 'page'},
        {when: has('life:s1:biro'), lines: [room('A biro man with three arms looks up at you from square one-four-four.')], group: 'page'},
        {when: has(BELL), lines: [room('Square one-four-four is still empty. It looks less empty than this morning, somehow.')], group: 'page'},
      ],
      lines: [say('teacher', 'Albums away. Unless the album is doing your maths.')],
      show: [cine('e4-page')],
      react: [think('Some people collect stickers. You were collecting something else. You do not know the word yet.')],
      ask: {
        timer: 7, silent: 'keep',
        options: [
          opt('keep', 'Close it, carefully', [room('You close it like a door on something sleeping.')], [heart(3)]),
          opt('show', 'Show {friend} under the desk', [say('friend', 'Full. A full album. I have never touched a full album.'), say('teacher', 'Both of you. After class.')], [bond('friend', 4), standing(1)]),
        ],
      },
    },
  ],

  cines: [
    {id: 'e4-flash', shots: [
      {cam: 'close', on: ['me'], ms: 2600, act: [{who: 'me', do: 'emote', mood: 'tense'}], say: think('Two minutes of break left. One square. Everybody in this yard is a dealer.')},
    ]},
    {id: 'e4-open', shots: [
      {cam: 'wide', ms: 2200, say: room('Morning. The album on the desk, open at the page that is not finished.')},
      {cam: 'close', on: ['me'], ms: 2200, say: think('One-four-four. The last square. You can see it with your eyes closed.')},
      {cam: 'close', on: ['me'], ms: 2300, act: [{who: 'me', do: 'emote', mood: 'tense'}], say: think('And somewhere in this flat, the paper. Before Dad takes it to work.')},
    ]},
    clipFilm(paper),
    {id: 'e4-page', shots: [
      {cam: 'close', on: ['me'], ms: 2600, act: [{who: 'me', do: 'emote', mood: 'wonder'}], say: think('There.')},
    ]},
  ],

  docs: [
    {id: 'e4-cold', who: 'rival', role: 'From two desks over', lines: [{t: 'I had one-four-four three times. I was the richest person in that school. I was ten.'}]},
    {id: 'e4-tal', who: 'rival', role: 'From two desks over', lines: [
      {t: 'He carried my bag for a week. Up the stairs. I made the bag heavier on purpose. Tuesday it was bricks.', when: has('life:s1:bag'), secret: 'Tuesday was bricks'},
      {t: 'He gave me all three of his doubles. All three. For one square. Romantic, if you are ten.', when: is(`life:s1:${E}:trade`, 'doubles')},
      {t: 'He never got it that day. I put it in his desk on Friday. He still thinks it was magic.', when: has(BELL), secret: 'It was not magic'},
      {t: 'I still have the other two. I am not giving them back. They are evidence.'},
    ]},
    {id: 'e4-dudu', who: 'wild', role: 'The one who climbs first', lines: [
      {t: 'My biro man is still in that album. Three arms. A legend of the game.', when: has('life:s1:biro')},
      {t: 'I ate four stickers that day. Gum flavour. Every one of them.'},
    ]},
  ],
}}

function any2(...flags: string[]) { return {any: flags.map(f => ({flag: f}))} }
