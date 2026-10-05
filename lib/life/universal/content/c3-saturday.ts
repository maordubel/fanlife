/**
 * Age nine — SATURDAY.
 *
 * The universal beat: the first time through the turnstile. Until today the club has lived in a
 * radio. Dad takes him: down the street, along the road everybody else is walking, through a gap
 * in a wall that lets in one person at a time, along a tunnel, and out into a colour. The match
 * has no opponent, no score and no result, because that is not what a nine-year-old brings home
 * from his first one. He brings home how green it was and how big the noise was.
 */
import type {Chapter, Line} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

const hold: Line = say('mum', 'Hold his hand in the crowd. He will say it is for you.')

const green: Line[] = [
  tell('The tunnel stops, and the world is very wide and all one colour.'),
  tell('Green. Not park green. A green that somebody looks after, every day, as a job. The radio never said.'),
]

export const C3_SATURDAY: Chapter = {
  id: 'c3-saturday',
  act: 1,
  age: 9,
  title: 'Saturday',
  kicker: 'Age nine · the first time inside',
  intro: 'Saturday. Until today {club} have lived inside a radio. Dad has had his coat on since breakfast, and he keeps touching his inside pocket, to make sure.',
  start: {room: 'street', spawn: 'fromHome', time: 'day'},

  cast: [
    // he walks with you: wherever the day has got to is where he is
    {who: 'dad', room: 'terrace', slot: 'left', when: {flag: 'c3:terrace'}, talk: 'dad', follow: true},
    {who: 'dad', room: 'tunnel', slot: 'ahead', when: {flag: 'c3:tunnel'}, talk: 'dad', follow: true},
    {who: 'dad', room: 'gate', slot: 'wait', when: {flag: 'c3:gate'}, talk: 'dad', follow: true},
    {who: 'dad', room: 'route', slot: 'lamp', when: {flag: 'c3:route'}, talk: 'dad', follow: true},
    {who: 'dad', room: 'street', slot: 'corner', when: {flag: 'c3:ready'}, talk: 'dad', follow: true},
    {who: 'dad', room: 'street', slot: 'corner', talk: 'dad'},
    {who: 'mum', room: 'street', slot: 'doorstep', talk: 'mum'},
    {who: 'friend', room: 'street', slot: 'customer', talk: 'friend'},
    {who: 'seller', room: 'route', slot: 'seller', talk: 'seller'},
    {who: 'steward', room: 'gate', slot: 'steward', talk: 'steward'},
    {who: 'elder', room: 'terrace', slot: 'fence', talk: 'elder'},
  ],

  doors: [
    {id: 'street-route', room: 'street', door: 'east', to: 'route', spawn: 'fromStreet', label: 'The road to {ground}', needs: {flag: 'c3:ready'}, blocked: 'That is the way everybody is going. Not without Dad: he has the tickets.'},
    {id: 'route-street', room: 'route', door: 'west', to: 'street', spawn: 'fromEast', label: 'Back to your street'},
    {id: 'route-gate', room: 'route', door: 'east', to: 'gate', spawn: 'fromRoute', label: 'The turnstiles'},
    {id: 'gate-route', room: 'gate', door: 'west', to: 'route', spawn: 'fromGate', label: 'Back along the road'},
    {id: 'turnstile', room: 'gate', door: 'turnstile', to: 'tunnel', spawn: 'fromGate', label: 'The turnstile', needs: {flag: 'c3:torn'}, blocked: 'An arm in a dark sleeve stays across the gap. Tickets first.'},
    {id: 'tunnel-back', room: 'tunnel', door: 'back', to: 'gate', spawn: 'fromInside', label: 'Back to the turnstiles'},
    {id: 'tunnel-light', room: 'tunnel', door: 'light', to: 'terrace', spawn: 'fromTunnel', label: 'The light'},
    {id: 'terrace-tunnel', room: 'terrace', door: 'tunnel', to: 'tunnel', spawn: 'fromTerrace', label: 'The tunnel'},
  ],

  spots: [
    {id: 'kiosk-window', room: 'street', spot: 'window', talk: 'kiosk-window', verb: 'look', label: 'The kiosk window'},
    {id: 'sign', room: 'route', spot: 'sign', talk: 'sign', verb: 'look', label: 'The arrow'},
    {id: 'flags', room: 'route', spot: 'flags', talk: 'flags', verb: 'look', label: 'The flags'},
    {id: 'board', room: 'gate', spot: 'board', talk: 'board', verb: 'look', label: 'The board'},
    {id: 'gate-flag', room: 'gate', spot: 'flag', talk: 'gate-flag', verb: 'look', label: 'The flag over the gate'},
    {id: 'arch', room: 'tunnel', spot: 'sign', talk: 'arch', verb: 'look', label: 'The wall under the arch'},
    {id: 'pitch', room: 'terrace', spot: 'pitch', talk: 'pitch', verb: 'look', label: 'The pitch'},
    {id: 'banner', room: 'terrace', spot: 'banner', talk: 'banner', verb: 'look', label: 'The banner'},
  ],

  beats: [
    {id: 'walk', room: 'route', talk: 'walk'},
    {id: 'arrive', room: 'gate', talk: 'arrive'},
    {id: 'tunnel', room: 'tunnel', talk: 'tunnel'},
    {id: 'green', room: 'terrace', talk: 'green'},
    {id: 'song', room: 'terrace', when: {flag: 'c3:clapped'}, talk: 'song'},
  ],

  objectives: [
    {id: 'ready', t: 'There is always one more thing. Find out what', done: {flag: 'c3:ready'}, room: 'street'},
    {id: 'walk', t: 'Walk to {ground} with Dad', done: {flag: 'c3:gate'}, room: 'gate'},
    {id: 'ticket', t: 'Hand over your own ticket', done: {flag: 'c3:torn'}, room: 'gate'},
    {id: 'in', t: 'Through the tunnel, towards the light', done: {flag: 'c3:terrace'}, room: 'terrace'},
    {id: 'join', t: 'Find your step, and join in', done: {flag: 'c3:over'}, room: 'terrace'},
  ],

  talks: [
    {id: 'dad', branches: [
      {when: {flag: 'c3:clapped'}, lines: [say('dad', 'Here it comes. Listen.')], next: 'song'},
      {when: {flag: 'c3:terrace'}, lines: [
        say('dad', 'Do not look at me. Look at that.'),
        say('dad', 'Then go and stand by {elder}. That step was taken before I was born.'),
      ]},
      {when: {flag: 'c3:tunnel'}, lines: [say('dad', 'Towards the light. I am right behind you.')]},
      {when: {flag: 'c3:torn'}, lines: [say('dad', 'Go on. Through. It only turns one way.')]},
      {when: {flag: 'c3:ticket'}, lines: [say('dad', 'Not to me. To the steward. You hand it over yourself.')]},
      {when: {flag: 'c3:gate'}, lines: [
        tell('He takes two tickets from his inside pocket. He has been checking on them since the stairs.'),
        say('dad', 'This one is mine. This one is yours.'),
        tell('The paper is soft from his pocket. He puts it in your hand and closes your fingers over it himself.'),
        say('dad', 'You give it to the steward. Not me. You.'),
      ], then: [flag('c3:ticket'), bond('dad', 4)]},
      {when: {flag: 'c3:route'}, lines: [say('dad', 'Keep up. Not because we are late. Because this is how it is walked.')]},
      {when: {flag: 'c3:ready'}, lines: [say('dad', 'That way. Everybody you can see is going where we are going.')]},
      {when: {flag: 'c3:dressed'}, lines: [
        tell('He looks at the coat and the zip. Not at your face, which is doing something he would have to mention.'),
        tell('He pats his inside pocket. Then his other pockets. Then the inside one again.'),
        say('dad', 'One rule. If you cannot see me, stand still. I will be the one looking.'),
        say('me', 'What if you cannot find me?'),
        say('dad', 'I found the tickets.'),
      ], then: [flag('c3:ready'), bond('dad', 3)]},
      {when: {flag: 'c3:asked'}, lines: [say('dad', 'Your mother first. Then me. That is the order.')]},
      {lines: [
        say('me', 'Is it time?'),
        say('dad', 'It has been time since breakfast.'),
        say('dad', 'Your mother wants you first. There is always one more thing.'),
      ], then: [flag('c3:asked')]},
    ]},

    {id: 'mum', branches: [
      {when: {flag: 'c3:ready'}, lines: [say('mum', 'Go on. He will pretend he is not excited. Do not believe a word.')]},
      {when: {flag: 'c3:dressed'}, lines: [say('mum', 'Now him. He has checked those tickets nine times. Let him make it ten.')]},
      // the scarf from chapter one, if this life has it; the day plays the same without it
      {when: {all: [{flag: 'c3:asked'}, {any: [{wears: 'scarf'}, {has: 'scarf'}]}]}, lines: [
        tell('The one more thing is the scarf. It goes twice round, and the coat is zipped to the chin by somebody who is not you.'),
        hold,
      ], then: [flag('c3:dressed'), bond('mum', 3)]},
      {when: {flag: 'c3:asked'}, lines: [
        tell('The one more thing is your coat. It is zipped to the chin by somebody who is not you.'),
        hold,
      ], then: [flag('c3:dressed'), bond('mum', 3)]},
      {lines: [say('mum', 'Ask your father if it is time. Then stand well back.')]},
    ]},

    {id: 'friend', branches: [
      {when: {flag: 'c3:promised'}, lines: [say('friend', 'How big. Do not forget. I will ask on Monday.')]},
      {lines: [
        say('friend', 'You are going in? Actually in?'),
        say('friend', 'I have only ever heard it from outside the wall.'),
        say('friend', 'Bring me back one thing. Tell me how big it is. Nobody ever says how big it is.'),
      ], then: [flag('c3:promised'), bond('friend', 5)]},
    ]},

    {id: 'walk', branches: [{lines: [
      tell('The road is the same road it is on a weekday. The people are not.'),
      tell('They come out of the side streets in ones and twos and fall in, all facing the same way, like something being poured.'),
    ], then: [flag('c3:route')]}]},
    {id: 'seller', branches: [
      {when: {any: [{wears: 'scarf'}, {has: 'scarf'}]}, lines: [say('seller', 'That one is older than my stall. I cannot sell you anything. You are finished already.')]},
      {lines: [say('seller', 'First time. I can always tell. They look up.'), say('dad', 'Next time. Today he needs both hands.')]},
    ]},

    {id: 'arrive', branches: [{lines: [
      tell('From outside, {ground} is a wall, a row of gaps, and a hum behind it, like a fridge the size of a street.'),
      tell('The gaps are turnstiles. Each one lets in exactly one person and then thinks about it.'),
    ], then: [flag('c3:gate')]}]},
    {id: 'steward', branches: [
      {when: {flag: 'c3:torn'}, lines: [say('steward', 'Through you go. Push with your middle, not your hands.')]},
      {when: {flag: 'c3:ticket'}, lines: [
        tell('You hold the ticket up as high as it will go.'),
        say('steward', 'And who is this one with?'),
        say('dad', 'He is with himself. I am with him.'),
        tell('The steward tears it along the dotted line, slowly, as if both halves mattered.'),
        say('steward', 'First one? Then keep that half. Do not let anybody tell you it is rubbish.'),
      ], then: [flag('c3:torn'), keep('ticket'), heart(6)]},
      {lines: [
        say('steward', 'Tickets.'),
        tell('It is not a question and it is not unkind. An arm in a dark sleeve is across the gap.'),
      ]},
    ]},

    {id: 'tunnel', branches: [{lines: [
      tell('The turnstile clanks once behind you, and that is the outside finished with.'),
      tell('A tunnel. Bare walls, a wet floor, and at the far end a square of light with a noise coming through it.'),
      tell('The noise is not loud yet. It is large. You can feel it in the wall.'),
    ], choices: [
      {id: 'hand', t: 'Take Dad\'s hand', then: [flag('c3:tunnel'), flag('c3:hand'), bond('dad', 6)]},
      {id: 'ahead', t: 'Walk in front of him', then: [flag('c3:tunnel'), heart(4)]},
      {id: 'wall', t: 'Keep one hand on the wall', then: [flag('c3:tunnel'), heart(2)]},
    ]}]},

    {id: 'green', branches: [
      {when: {flag: 'c3:hand'}, lines: [...green, tell('Dad has stopped holding your hand. You are holding his.')], then: [flag('c3:terrace'), heart(8)]},
      {lines: [...green, tell('Behind you Dad has stopped, so that you can have it to yourself for a second.')], then: [flag('c3:terrace'), heart(8)]},
    ]},
    {id: 'elder', branches: [
      {when: {flag: 'c3:clapped'}, lines: [say('elder', 'There. Now you are making it, not hearing it.')], next: 'song'},
      {lines: [
        say('elder', 'New?'),
        say('dad', 'His first.'),
        say('elder', 'Then he stands here. I have had this step since before your father had a voice to lose.'),
        tell('All along the terrace, hands begin. Slow. Then not slow.'),
        say('elder', 'Do not clap along. Listen for where it lands, and land there.'),
      ], then: [{e: 'play', game: 'clap', id: 'c3-clap', then: [flag('c3:clapped'), heart(6), bond('elder', 5)]}]},
    ]},
    {id: 'song', branches: [{lines: [
      tell('Your hands sting. Nobody said they would.'),
      tell('Then the teams come out, and the clap turns into a song. It starts somewhere to the left and comes along the terrace like a thing passed from hand to hand.'),
      tell('Dad is singing. You have never heard him sing. He does not do it well. He does it completely.'),
    ], choices: [
      {id: 'sing', t: 'Sing the one line you know', then: [flag('c3:voice', 'sang'), {e: 'sound', cue: 'roar'}], next: 'match'},
      {id: 'watch', t: 'Watch Dad', then: [flag('c3:voice', 'watched'), {e: 'sound', cue: 'roar'}], next: 'match'},
      {id: 'mouth', t: 'Move your mouth and keep clapping', then: [flag('c3:voice', 'mouthed'), {e: 'sound', cue: 'roar'}], next: 'match'},
    ]}]},
    {id: 'match', branches: [
      {when: {is: ['c3:voice', 'sang']}, lines: [
        tell('It comes out before you have decided. One line, the only one you know, a little late.'),
        tell('Nobody turns round. That is how you can tell it counted.'),
      ], then: [flag('life:sang'), flag('c3:over'), heart(10), {e: 'end', ending: 'sang'}]},
      {when: {is: ['c3:voice', 'watched']}, lines: [
        tell('His eyes are shut and his chin is up. He was somebody here long before he was your father.'),
        tell('He opens his eyes, finds you looking, and does not stop.'),
      ], then: [flag('c3:over'), bond('dad', 10), {e: 'end', ending: 'watched'}]},
      {lines: [
        tell('You move your mouth where the words would go, and the terrace does the rest.'),
        say('elder', 'Next time you will have one line. The time after, two. That is how everybody got them.'),
      ], then: [flag('c3:over'), heart(5), bond('elder', 4), {e: 'end', ending: 'mouthed'}]},
    ]},

    {id: 'kiosk-window', branches: [{lines: [
      tell('The kiosk is shut. A card in the window, in {kiosk}\'s capitals: BACK AFTER THE MATCH.'),
      tell('It is the same card every other Saturday. The corners have gone soft.'),
    ]}]},
    {id: 'sign', branches: [{lines: [tell('An arrow on a post, pointing the way to {ground}. Somebody has drawn a second arrow under it in pen, in case.')]}]},
    {id: 'flags', branches: [{lines: [tell('Flags on the lamp posts, in your colours, all the way down. Nobody put them up for you. It feels exactly as if they did.')]}]},
    {id: 'board', branches: [{lines: [
      tell('Today, in white letters that slot in by hand. {club} is the top line.'),
      tell('You do not read the other line. It is only who they are playing.'),
    ]}]},
    {id: 'gate-flag', branches: [{lines: [tell('A flag above the gate. It has been outside in everything, for years. The colours have only gone a little quieter.')]}]},
    {id: 'arch', branches: [{lines: [tell('Under the arch the paint is shiny in one long stripe, where people touch the wall going in. Shoulder height. Their shoulders. You reach up.')]}]},
    {id: 'pitch', branches: [{lines: [tell('The lines are whiter than paper. Somebody painted them this morning. By tonight they will be scuffed. You are seeing them new.')]}]},
    {id: 'banner', branches: [{lines: [tell('A banner tied to the fence with string. One letter is the wrong size. It has been the wrong size for years, and nobody would dare fix it.')]}]},
  ],

  endings: {
    sang: {title: 'Saturday', body: 'You went through the turnstile for the first time, and you sang one line, late, and it counted. You will not remember who they were playing. You will remember the colour of the grass, and that the noise had a size, and that for one line you were part of it.', keep: 'ticket'},
    watched: {title: 'Saturday', body: 'You went through the turnstile for the first time, and spent the best of it looking the wrong way: at him. You will not remember who they were playing. You will remember the colour of the grass, the size of the noise, and your father singing with his eyes shut.', keep: 'ticket'},
    mouthed: {title: 'Saturday', body: 'You went through the turnstile for the first time, and you did not know the words, and nobody minded. You will not remember who they were playing. You will remember the colour of the grass and the size of the noise, and that you were promised one line for next time.', keep: 'ticket'},
  },

  keepsakes: [
    {id: 'ticket', name: 'Half a ticket', note: 'Torn along the dotted line by somebody who asked if it was your first. The half you were told to keep.'},
  ],
}
