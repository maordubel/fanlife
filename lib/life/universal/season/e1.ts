/**
 * Season One · Episode 1 — THE FIRST NOISE. Age six. The flat, a Saturday, a radio that will not start itself.
 *
 * The job: batteries and the scarf before kick-off, in either order, against a clock that is real. Miss it and the
 * life does not stop — it goes next door, to the neighbour's balcony, and she will tell that story for thirty years.
 * No match fact: nobody names who is playing. It is the noise a six-year-old remembers, not the fixture.
 */
import {all, any, bond, cine, failed, flag, has, heart, is, me, not, opt, passed, remember, room, say, standing, think, type EpisodeScript} from './write'

const E = 'S1E1'
const done = (s: string) => `s1:${E}:${s}:done`
const LATE = `s1:${E}:late`

export const E1: EpisodeScript = {
  id: E, no: 1, age: 6, act: 1,
  title: 'The First Noise',
  logline: 'Two jobs before kick-off. One dad who cannot sit still.',
  next: 'Six Short',
  intro: 'Saturday. Dad has checked the clock four times. You can count to four.',
  keep: {id: 'scarf', name: 'The first scarf', note: 'Longer than you were. Still is, some days.'},
  start: {room: 'room'},
  open: {doc: 'e1-cold', cine: 'e1-open', mission: 'Batteries and the scarf. Before kick-off.'},
  close: ['e1-mum', 'e1-dad'],
  texts: [
    {from: 'Mum', t: 'Your father is moving out of the old flat on Sunday.'},
    {from: 'Mum', t: 'He packed a box. Your name on it. In marker.'},
    {from: 'Mum', t: 'He says the envelope is not to be opened until the end. You know your father.'},
    {from: 'Mum', t: 'Come before he changes his mind and keeps all of it.'},
  ],
  box: {item: 'A scarf, older than you', line: 'Under it, a sealed envelope: “Not until the last one.” Under that, five more things.'},
  flash: {cine: 'e1-flash', card: 'Earlier that night'},
  tease: 'A shirt in the kiosk window. Twenty coins. You have fourteen.',

  clock: {
    id: 'kickoff', s: 100, label: 'Kick-off', fail: LATE,
    until: has(done('radio')),
    lines: [
      room('Through the wall, faintly: a roar. Somebody else’s radio got there first.'),
      say('dad', 'No. No no no no.', 'tense'),
      say('dad', 'Shoes. Now. We are going to {neighbour}’s.', 'tense'),
    ],
    fx: [failed('Kick-off missed')],
  },

  people: [
    {who: 'dad', room: 'room', slot: 'sofa'},
    {who: 'mum', room: 'room', slot: 'byDoor', when: any(has(done('radio')), has(LATE))},
  ],
  barks: [
    {who: 'dad', room: 'room', when: not(done('radio')), lines: ['Two minutes. TWO.', 'Who moves batteries? Who does that?', 'Do not touch the aerial. Nobody touches the aerial.']},
    {who: 'mum', room: 'room', when: has(done('radio')), lines: ['Don’t run.', 'You’re running.', 'Fine. Run.']},
  ],

  steps: [
    // ───── the two jobs, either order: one run through the flat (RUSH `flat-run`), or the small game where RUSH cannot play
    {
      id: 'prep', goal: 'Batteries and the scarf — before kick-off', main: true, when: not(LATE),
      at: {room: 'room', who: 'dad', slot: 'sofa'}, verb: 'talk',
      lines: [
        say('dad', 'Scarf: top of the wardrobe, in the box. Batteries: kitchen drawer — ask your mother. GO!', 'tense'),
        me('Going!'),
      ],
      mission: {template: 'flat-run'},
      game: 'carry',
      show: [cine('e1-delivered')],
      react: [
        room('String. A key nobody can explain. A birthday candle shaped like a seven. Two batteries.'),
        think('Nobody in this house is seven. Mysteries.'),
      ],
      slip: [
        room('Through the wall, faintly: a roar. Somebody else’s radio got there first.'),
        say('dad', 'No. No no no no.', 'tense'),
        say('dad', 'Shoes. Now. We are going to {neighbour}’s.', 'tense'),
      ],
      fx: [flag(`s1:${E}:batteries`), standing(1)],
      reward: {good: [heart(1)], slip: [flag(LATE), failed('Kick-off missed')]},
      ask: {
        lines: [room('The scarf is longer than you are. It smells of every Saturday before you were born.')],
        timer: 7, silent: 'wrap',
        options: [
          opt('wrap', 'Wrap it round twice', think('Twice round. Still touches the floor. Perfect.'), [flag('life:scarf:way', 'worn'), heart(2)], {wear: 'scarf'}),
          opt('cape', 'Wear it like a cape', think('Not a scarf. A cape. You are faster now. Probably.'), [flag('life:scarf:way', 'cape'), flag('life:s1:cape'), heart(3), remember('cape', 'Wore the scarf as a cape. It made you faster. Probably.')], {wear: 'scarf'}),
          opt('dad', 'Save it for Dad', think('Dad first. He has been waiting longer.'), [flag('life:scarf:way', 'shared'), bond('dad', 5), remember('shared', 'Kept the scarf for Dad first.')]),
        ],
      },
    },

    // ───── the radio: both jobs done, before the clock runs out
    {
      id: 'radio', goal: 'Get the radio on', main: true, when: not(LATE),
      at: {room: 'room', spot: 'tv'}, verb: 'use',
      callbacks: [{when: is('life:scarf:way', 'cape'), lines: [say('dad', 'Is that — are you wearing it as a cape?'), me('It is faster.'), say('dad', 'Fair.')]}],
      lines: [say('dad', 'Batteries! In! Quick quick quick—'), me('Which way is plus?'), say('dad', 'The way that works!')],
      game: 'tune',
      react: [room('It coughs, crackles, and finds a crowd. A whole crowd, in a box, in your living room.'), say('dad', 'THERE. Leave it. Do not breathe on it.', 'joy')],
      slip: [room('Three stations of a choir and one of a man selling carpets.'), say('dad', 'Close. Closer. Too far — STOP. There.'), room('He does the last bit himself. His hands are shaking.')],
      fx: [passed('Before kick-off'), heart(2), bond('dad', 3), flag('life:first:question', 'quiet')],
    },
    {
      id: 'listen', goal: 'Sit next to Dad', main: true, when: not(LATE),
      at: {room: 'room', who: 'dad', slot: 'sofa'}, verb: 'sit',
      lines: [say('dad', 'Sit. Here. That is your seat now. It is in the contract.'), me('What contract?'), say('dad', 'Shh. SHH.')],
      // the match, lived on a sofa: a scene of the two of them (directed, not played), the goal, and then his moment
      show: [cine('e1-together'), cine('e1-goal')],
      react: [room('The flat is suddenly very small for this much noise.')],
      ask: {
        lines: [room('He lifts you up. The ceiling comes very close.')],
        timer: 5, silent: 'hold',
        options: [
          opt('roar', 'ROAR', [say('dad', 'YES! Louder! The neighbours have radios!', 'joy')], [flag('life:first:memory', 'noise'), flag('life:s1:roar'), heart(5), remember('roar', 'Roared. The cat left the flat.')]),
          opt('hold', 'Hold on to him', [room('You hold on. For a second you see the boy he used to be.', 'tender')], [flag('life:first:memory', 'face'), heart(4), bond('dad', 4), remember('hold', 'Held on to Dad, up by the ceiling.')]),
          opt('scarf', 'Swing the scarf over your head', [say('dad', 'That is it. That is the whole thing. You have got it.', 'joy')], [flag('life:first:memory', 'scarf'), heart(4), bond('dad', 3)], {when: any({wears: 'scarf'}, {wears: 'both'})}),
        ],
      },
    },

    // ───── the other life: too late, so next door
    {
      id: 'levi', goal: 'Get to {neighbour}’s door', main: true, when: has(LATE), after: [],
      at: {room: 'street', who: 'neighbour', slot: 'doorstep'}, verb: 'talk',
      escort: [{who: 'dad', rooms: ['room', 'street']}],
      lines: [
        say('neighbour', 'Late again?'),
        say('dad', 'He is six!'),
        say('neighbour', 'I meant you. Come in. Shoes off. Do not touch the cat.'),
      ],
      game: 'clap',
      show: [cine('e1-levi')],
      react: [room('Her radio is louder than yours and smells of oranges.')],
      fx: [heart(4), bond('dad', 2), flag('life:s1:levi'), remember('levi', 'Heard it on the neighbour’s balcony, over her geraniums.')],
      ask: {
        lines: [room('Dad lifts you up, on a stranger’s balcony, over a stranger’s geraniums.')],
        timer: 5, silent: 'hold',
        options: [
          opt('roar', 'ROAR', [say('neighbour', 'Not over the geraniums!')], [flag('life:first:memory', 'noise'), flag('life:s1:roar'), heart(5)]),
          opt('hold', 'Hold on to him', [room('You hold on. {neighbour} pretends not to watch. She watches.', 'tender')], [flag('life:first:memory', 'face'), heart(4), bond('dad', 4)]),
        ],
      },
    },

    // ───── after: the promise
    {
      id: 'promise', goal: 'Hear what Dad has to say', main: true, final: true, afterAny: ['listen', 'levi'],
      at: {room: 'room', who: 'dad', slot: 'sofa'}, verb: 'talk',
      callbacks: [
        {when: has(LATE), lines: [say('dad', '{neighbour}. Of all people. We will never hear the end of it.')]},
        {when: has('life:s1:roar'), lines: [say('mum', 'The whole building heard you.'), say('dad', 'Good.')]},
      ],
      lines: [say('dad', 'Next time I am taking you. To the ground. Properly.'), me('Really? When?'), say('dad', 'Ask your mother.')],
      fx: [flag('life:master:F01:place', 'invited')],
      ask: {
        options: [
          opt('ask', 'Run and ask Mum', [say('mum', 'Ask me what?'), me('THE GROUND!'), say('mum', 'We will see.'), think('We will see means yes. Everybody knows that.')], [bond('mum', 2), flag('life:s1:E1:asked', 'mum')]),
          opt('sure', '“Promise?”', [say('dad', 'Promise. Pinky. Do not tell your mother it was a pinky.')], [bond('dad', 3), flag('life:s1:E1:asked', 'dad')]),
        ],
      },
    },

    // ───── a side look: the photo on the wall
    {
      id: 'photo', goal: 'Look at the old photo', side: true,
      at: {room: 'room', spot: 'frame'}, verb: 'look',
      lines: [think('Dad, younger, with hair. On a fence, in a crowd, mouth wide open.'), think('Same face he is making right now.')],
      fx: [heart(1), flag(`s1:${E}:photo`)],
    },
  ],

  cines: [
    {id: 'e1-flash', shots: [
      {cam: 'close', on: ['me'], ms: 2600, act: [{who: 'me', do: 'emote', mood: 'joy'}], say: think('That noise. You will spend forty years chasing that noise.')},
    ]},
    {id: 'e1-open', shots: [
      {cam: 'wide', ms: 2400, say: room('Saturday. Quarter to.')},
      {cam: 'close', on: ['dad'], ms: 2600, act: [{who: 'dad', do: 'emote', mood: 'tense'}], say: say('dad', 'Who moved the batteries? WHO MOVES BATTERIES?')},
      {cam: 'two', on: ['me', 'dad'], ms: 2600, act: [{who: 'dad', do: 'face', to: 'me'}], say: say('dad', 'Batteries. Scarf. Go. We are nearly on.')},
      {cam: 'close', on: ['me'], ms: 2000, say: think('Two jobs. How hard can it be.')},
    ]},
    // after the run: he comes round the door with both, and his father sees him do it
    {id: 'e1-delivered', shots: [
      {cam: 'two', on: ['me', 'dad'], ms: 2300, when: not(LATE), act: [{who: 'me', do: 'hold', item: 'scarf'}, {who: 'dad', do: 'face', to: 'me'}], say: room('You come round the door like a goal kick.')},
      {cam: 'close', on: ['dad'], ms: 2300, when: not(LATE), act: [{who: 'dad', do: 'emote', mood: 'joy'}], say: say('dad', 'Batteries. Scarf. Under two minutes. Who taught you that?', 'joy')},
      {cam: 'close', on: ['me'], ms: 1700, when: not(LATE), act: [{who: 'me', do: 'emote', mood: 'joy'}], say: me('You did.')},
      {cam: 'over', on: ['me', 'dad'], ms: 2300, when: not(LATE), act: [{who: 'me', do: 'hold', item: null}, {who: 'dad', do: 'emote', mood: 'tender'}], say: room('He takes the batteries from you like they are made of glass.')},
      {cam: 'close', on: ['dad'], ms: 2200, when: has(LATE), act: [{who: 'dad', do: 'emote', mood: 'grief'}], say: room('He has the batteries. He has the scarf. He is listening to the wall.')},
    ]},
    // the match on a sofa: the two of them, before anything happens
    {id: 'e1-together', shots: [
      {cam: 'wide', ms: 2800, act: [{who: 'me', do: 'sit', by: 'dad'}], say: room('The sofa is too big for you. Dad makes it the right size by sitting very close.')},
      {cam: 'two', on: ['dad', 'me'], ms: 2800, act: [{who: 'dad', do: 'face', to: 'me'}, {who: 'dad', do: 'emote', mood: 'warm'}], say: say('dad', 'Hear that, under the man talking? That is our end. Singing.', 'warm')},
      {cam: 'close', on: ['me'], ms: 2400, act: [{who: 'me', do: 'emote', mood: 'wonder'}], say: think('You do not know the words yet. You hum anyway.')},
      {cam: 'close', on: ['dad'], ms: 2200, act: [{who: 'dad', do: 'emote', mood: 'tense'}], say: room('His knee goes up and down. Then yours does too.')},
      {cam: 'two', on: ['me', 'dad'], ms: 2300, act: [{who: 'me', do: 'emote', mood: 'tense'}], say: say('dad', 'Come on… come on… come ON…', 'tense')},
      {cam: 'over', on: ['dad', 'mum'], ms: 2000, act: [{who: 'mum', do: 'face', to: 'dad'}], say: say('mum', 'Are you two breathing?')},
      {cam: 'close', on: ['dad'], ms: 1600, say: say('dad', 'Not until they score.', 'tense')},
    ]},
    {id: 'e1-goal', shots: [
      {cam: 'two', on: ['dad', 'me'], ms: 1500, act: [{who: 'me', do: 'sit', by: 'dad'}, {who: 'dad', do: 'emote', mood: 'tense'}], say: room('The man on the radio stops breathing.')},
      {cam: 'wide', ms: 2600, act: [{who: 'all', do: 'cheer'}, {who: 'dad', do: 'lift'}], say: room('Then the whole radio explodes.')},
      {cam: 'two', on: ['dad', 'me'], ms: 2300, act: [{who: 'dad', do: 'emote', mood: 'joy'}], say: say('dad', 'YES! YES! YES!')},
      {cam: 'close', on: ['mum'], ms: 1900, act: [{who: 'mum', do: 'emote', mood: 'tense'}], say: say('mum', 'The neighbours!')},
      {cam: 'two', on: ['dad', 'mum'], ms: 2200, say: say('dad', 'They have got radios!')},
      {cam: 'close', on: ['mum'], ms: 2000, act: [{who: 'mum', do: 'emote', mood: 'warm'}], say: room('She hides a smile behind a tea towel. Badly.')},
    ]},
    {id: 'e1-levi', shots: [
      {cam: 'close', on: ['neighbour'], ms: 1800, act: [{who: 'neighbour', do: 'emote', mood: 'joy'}], say: say('neighbour', 'GOAL! Oh — oh, sorry. Is it ours?')},
      {cam: 'two', on: ['dad', 'neighbour'], ms: 2200, act: [{who: 'all', do: 'cheer'}], say: say('dad', 'It is everybody’s, {neighbour}!')},
    ]},
  ],

  docs: [
    {id: 'e1-cold', who: 'mum', role: 'Your mother', lines: [
      {t: 'He was six. He thought the radio WAS the team. He used to say goodnight to it.'},
    ]},
    {id: 'e1-mum', who: 'mum', role: 'Your mother', lines: [
      {t: 'Of course he was late. He was late to his own birth. {neighbour} still tells people.', when: has(LATE)},
      {t: 'He put the batteries in himself. Upside down. Twice. I did not say a word.', when: not(LATE), secret: 'Mum saw the batteries'},
      {t: 'He wore that scarf as a cape for a month. In August.', when: has('life:s1:cape')},
      {t: 'He gave his father the scarf first. {dadName} said he had something in his eye. For an hour.', when: is('life:scarf:way', 'shared'), secret: 'Something in his eye'},
      {t: 'Every Saturday after that, he had the radio on before his father did.'},
    ]},
    {id: 'e1-dad', who: 'dad', role: 'Your father', lines: [
      {t: 'He screamed so loud the cat moved out. Came back on Tuesday.', when: has('life:s1:roar')},
      {t: 'He held on. Six years old and he held on like he knew something.', when: is('life:first:memory', 'face')},
      {t: 'Best seat in the house was next to that radio. I had been saving it for him for six years.', secret: 'The saved seat'},
    ]},
  ],
}

export const E1_DONE = all(has(`s1:${E}:complete`))
