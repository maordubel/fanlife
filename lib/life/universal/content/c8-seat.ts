/**
 * Age forty — THE SEAT NEXT TO YOU.
 *
 * The universal beat: the first time he takes somebody small through the turnstile. It is the
 * Saturday of chapter one seen from the other end of the sofa: he is the one who has looked at
 * the clock four times, and the man who handed him the colours is the one being asked whether he
 * is coming. No opponent and no score — what is kept from the day is a scarf that was too long.
 *
 * A person is in ONE place (the first placement that holds), so the two who walk with him are
 * placed by how far the day has got: each room's arrival beat moves them on. For the same reason
 * the way back is held shut until the day is over — nobody small is left standing alone at a
 * turnstile because the player turned round.
 */
import type {Chapter, Cond, Look} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

const OLD: Look = {hair: '#8a8a90', cane: true}
const DECIDED: Cond = {any: [{flag: 'c8:arm'}, {flag: 'c8:tuned'}, {flag: 'c8:promised'}]}
const OVER: Cond = {flag: 'c8:over'}
const walking = (beat: string): Cond => ({all: [{flag: 'c8:arm'}, {flag: `beat:${beat}`}]})

export const C8_SEAT: Chapter = {
  id: 'c8-seat',
  act: 3,
  age: 40,
  title: 'The Seat Next to You',
  kicker: 'Age forty · a Saturday',
  intro: 'Saturday. Dad\'s flat still smells of coffee and floor soap. You have looked at the clock four times since breakfast, and {child} can count to four.',
  start: {room: 'room', spawn: 'start', time: 'day'},

  cast: [
    // the little one: home again in the evening, otherwise as far as the day has got
    {who: 'child', room: 'room', slot: 'rug', when: {flag: 'c8:home'}, talk: 'child'},
    {who: 'child', room: 'terrace', slot: 'right', when: {flag: 'beat:light'}, talk: 'child', follow: true, look: {scarf: true}},
    {who: 'child', room: 'tunnel', slot: 'wall', when: {flag: 'beat:tunnel'}, talk: 'child', follow: true, look: {scarf: true}},
    {who: 'child', room: 'gate', slot: 'wait', when: {flag: 'beat:gate'}, talk: 'child', follow: true, look: {scarf: true}},
    {who: 'child', room: 'route', slot: 'lamp', when: {all: [{flag: 'beat:road'}, {flag: 'c8:scarf'}]}, talk: 'child', follow: true, look: {scarf: true}},
    {who: 'child', room: 'route', slot: 'lamp', when: {flag: 'beat:road'}, talk: 'child', follow: true},
    {who: 'child', room: 'street', slot: 'doorstep', when: {flag: 'beat:out'}, talk: 'child', follow: true},
    {who: 'child', room: 'room', slot: 'rug', talk: 'child'},

    // Dad: on the sofa, unless somebody took his arm
    {who: 'dad', room: 'room', slot: 'sofa', when: {flag: 'c8:home'}, talk: 'dad', look: OLD},
    {who: 'dad', room: 'terrace', slot: 'left', when: walking('light'), talk: 'dad', look: OLD},
    {who: 'dad', room: 'tunnel', slot: 'ahead', when: walking('tunnel'), talk: 'dad', follow: true, look: OLD},
    {who: 'dad', room: 'gate', slot: 'fence', when: walking('gate'), talk: 'dad', follow: true, look: OLD},
    {who: 'dad', room: 'route', slot: 'corner', when: walking('road'), talk: 'dad', follow: true, look: OLD},
    {who: 'dad', room: 'street', slot: 'corner', when: walking('out'), talk: 'dad', follow: true, look: OLD},
    {who: 'dad', room: 'room', slot: 'window', when: {flag: 'c8:arm'}, talk: 'dad', look: OLD},
    {who: 'dad', room: 'room', slot: 'sofa', talk: 'dad', look: OLD},

    {who: 'mum', room: 'room', slot: 'byDoor', talk: 'mum', look: {hair: '#8a8a90'}},
    {who: 'kiosk', room: 'street', slot: 'kiosk', talk: 'kiosk'},
    {who: 'seller', room: 'route', slot: 'seller', talk: 'seller'},
    {who: 'steward', room: 'gate', slot: 'steward', talk: 'steward'},
    {who: 'elder', room: 'terrace', slot: 'fence', talk: 'elder'},
  ],

  doors: [
    {id: 'front', room: 'room', door: 'front', to: 'street', spawn: 'fromHome', label: 'The front door', when: {not: 'c8:home'}, needs: {all: [{flag: 'c8:tickets'}, DECIDED]}, blocked: 'Not yet. The tickets, and one question for the man on the sofa.'},
    {id: 'street-east', room: 'street', door: 'east', to: 'route', spawn: 'fromStreet', label: 'The road to {ground}'},
    {id: 'route-east', room: 'route', door: 'east', to: 'gate', spawn: 'fromRoute', label: '{ground}', needs: {flag: 'c8:scarf'}, blocked: 'The seller has seen the bare neck beside you. He is already holding one up.'},
    {id: 'turnstile', room: 'gate', door: 'turnstile', to: 'tunnel', spawn: 'fromGate', label: 'The turnstile', needs: {all: [{flag: 'c8:scarf'}, {flag: 'c8:shown'}]}, blocked: 'The steward holds out a hand, palm up. Tickets first.'},
    {id: 'light', room: 'tunnel', door: 'light', to: 'terrace', spawn: 'fromTunnel', label: 'The light'},

    // the way back: there, and shut until it is over — he is not walking alone today
    {id: 'street-home', room: 'street', door: 'home', to: 'room', spawn: 'fromStreet', label: 'Home', needs: OVER, blocked: 'Not now. {child} has your hand and is pulling the other way.'},
    {id: 'route-west', room: 'route', door: 'west', to: 'street', spawn: 'fromEast', label: 'Back to the street', needs: OVER, blocked: 'Nobody on this road is walking that way.'},
    {id: 'gate-west', room: 'gate', door: 'west', to: 'route', spawn: 'fromGate', label: 'Back down the road', needs: OVER, blocked: 'You did not come this far to stand outside.'},
    {id: 'tunnel-back', room: 'tunnel', door: 'back', to: 'gate', spawn: 'fromInside', label: 'Back to the turnstile', needs: OVER, blocked: 'A turnstile turns one way.'},
    {id: 'terrace-tunnel', room: 'terrace', door: 'tunnel', to: 'tunnel', spawn: 'fromTerrace', label: 'The tunnel', needs: OVER, blocked: 'Nobody leaves before the end. He never let you, either.'},
  ],

  spots: [
    {id: 'tickets', room: 'room', spot: 'table', when: {not: 'c8:tickets'}, talk: 'tickets', verb: 'take', label: 'The tickets'},
    {id: 'frame', room: 'room', spot: 'frame', talk: 'frame', verb: 'look', label: 'The shirt behind glass'},
    {id: 'crowd', room: 'terrace', spot: 'pitch', talk: 'crowd', verb: 'listen', label: 'The crowd'},
  ],

  beats: [
    {id: 'out', room: 'street', talk: 'out'},
    {id: 'road', room: 'route', talk: 'road'},
    {id: 'gate', room: 'gate', talk: 'gate'},
    {id: 'tunnel', room: 'tunnel', talk: 'tunnel'},
    {id: 'light', room: 'terrace', talk: 'light'},
    {id: 'roar', room: 'terrace', when: {flag: 'c8:clapped'}, talk: 'roar'},
  ],

  objectives: [
    {id: 'ready', t: 'The tickets are on the table. Then ask Dad if he is coming', done: {all: [{flag: 'c8:tickets'}, DECIDED]}, room: 'room'},
    {id: 'scarf', t: 'Nobody goes in for the first time with a bare neck', done: {flag: 'c8:scarf'}, room: 'route'},
    {id: 'in', t: 'Have the tickets out for the steward', done: {flag: 'c8:shown'}, room: 'gate'},
    {id: 'clap', t: 'Up the tunnel, into the light. Teach {child} the clap', done: {flag: 'c8:clapped'}, room: 'terrace'},
    {id: 'stay', t: 'Stay until it is over', done: OVER},
  ],

  talks: [
    {id: 'child', branches: [
      {when: {flag: 'c8:home'}, lines: [tell('{child} is on the rug, telling it again from the beginning, to nobody in particular.')]},
      {when: {flag: 'c8:clapped'}, lines: [tell('{child} is still clapping. Nobody has said stop.')], next: 'roar'},
      {when: {flag: 'beat:light'}, lines: [say('child', 'How do they all know when?')], next: 'clap'},
      {when: {flag: 'c8:scarf'}, lines: [say('child', 'Is it on right?'), tell('It is on like a bandage. You leave it.')]},
      {when: {flag: 'beat:out'}, lines: [say('child', 'Is it far?'), say('me', 'Exactly as far as it was when I was your size.')]},
      {lines: [
        say('child', 'What happens at three o\'clock?'),
        say('me', '{club} happen at three o\'clock.'),
        tell('You hear who said it. So does the man on the sofa.'),
      ]},
    ]},

    {id: 'dad', branches: [
      {when: {all: [{flag: 'c8:home'}, {flag: 'c8:tuned'}]}, lines: [
        tell('Evening. The radio is where you left it, and so is he.'),
        say('dad', 'I knew before the shout.'),
        say('child', 'How?'),
        say('dad', 'He talks quicker when it is us.'),
      ], then: [flag('c8:over'), {e: 'end', ending: 'radio'}]},
      {when: {flag: 'c8:home'}, lines: [
        tell('{child} tells him everything — the steward, the green, the clap — in the wrong order, for longer than the match lasted.'),
        tell('He listens as if he had not had the radio on.'),
        say('dad', 'And did you look?'),
        say('me', 'I looked.'),
      ], then: [flag('c8:over'), {e: 'end', ending: 'told'}]},
      {when: {flag: 'beat:light'}, lines: [tell('He has a small radio against one ear. The match is in front of him, and he is checking it against the truth.')]},
      {when: {flag: 'c8:arm'}, lines: [say('dad', 'Do not wait for me. I am directly behind you.'), tell('He is not directly behind you.')]},
      {when: {flag: 'c8:tuned'}, lines: [say('dad', 'Go. I have them here. Kick-off does not wait for small people.')]},
      {when: {flag: 'c8:promised'}, lines: [say('dad', 'Go on. And remember where to look.')]},
      {lines: [
        say('me', 'Are you coming?'),
        say('dad', 'The steps at {ground} have got steeper. Somebody should write to them.'),
        say('dad', 'I shall stay with the radio. The television shows you a match. The radio tells you the truth.'),
        tell('He says it to the window, in the voice he keeps for things that are already decided.'),
      ], choices: [
        {id: 'arm', t: 'Hold out your arm. "Then we leave now, and we walk slowly."', then: [flag('c8:arm'), bond('dad', 6)], next: 'dad-answer'},
        {id: 'radio', t: 'Find the station for him before you go', then: [{e: 'play', game: 'tune', id: 'c8-radio', then: [flag('c8:tuned'), heart(4), bond('dad', 3)]}], next: 'dad-answer'},
        {id: 'promise', t: '"We will tell you everything. All of it."', then: [flag('c8:promised'), bond('child', 5), bond('dad', 2)], next: 'dad-answer'},
      ]},
    ]},
    {id: 'dad-answer', branches: [
      {when: {flag: 'c8:arm'}, lines: [
        tell('He looks at your arm as if it were a form to sign. Then he takes it, and stands up in two movements. His ticket is already in his coat.'),
        say('dad', 'I walk at the speed I walk. And nobody tells your mother about the steps.'),
        say('mum', 'I am standing right here.'),
      ]},
      {when: {flag: 'c8:tuned'}, lines: [
        tell('Static. Then a voice, fast, as if it were running. Not the same voice. The same hurry.'),
        say('dad', 'There. Do not touch it again. You always had the better ears.'),
      ]},
      {lines: [
        say('dad', 'Everything. Not the short version.'),
        say('dad', 'And when it happens, look at the little one. Not at the pitch. The pitch you can see any week.'),
      ]},
    ]},

    {id: 'mum', branches: [
      {when: {flag: 'c8:home'}, lines: [say('mum', 'Come here. You are bright red.'), say('mum', 'All of you.')]},
      {when: DECIDED, lines: [say('mum', 'Hold hands at the road. I am talking to you, not to the little one.')]},
      {lines: [say('mum', 'Good morning, you. You are standing in my living room pretending not to be nervous.'), say('mum', 'I know exactly where you got it.')]},
    ]},

    {id: 'tickets', branches: [
      {when: {has: 'ticket'}, lines: [
        tell('Two tickets, held down with the sugar bowl. You pick them up by the edges, the way he once carried yours.'),
        tell('Inside pocket. Then you check the inside pocket.'),
      ], then: [flag('c8:tickets')]},
      {lines: [
        tell('Two tickets, held down with the sugar bowl. One is a child\'s. You read that twice.'),
        tell('Inside pocket. Then you check the inside pocket.'),
      ], then: [flag('c8:tickets')]},
    ]},
    {id: 'frame', branches: [{lines: [tell('The shirt behind glass. The small fingerprint is still there, at exactly {child}\'s height.'), tell('It is possible that it is a new one.')]}]},

    {id: 'out', branches: [
      {when: {flag: 'c8:arm'}, lines: [tell('Dad takes the stairs one at a time, sideways, and does not want it mentioned.'), tell('{child} waits for him at the bottom without being told.')]},
      {lines: [tell('{child} takes the last two stairs with both feet at once, and then takes your hand without being asked.'), tell('You were not ready for the hand.')]},
    ]},
    {id: 'kiosk', branches: [{lines: [
      say('kiosk', 'Going where I think? Your father walked you past here at that size. You did not say hello either.'),
      tell('{child} says hello, to prove a point.'),
    ]}]},

    {id: 'road', branches: [{lines: [
      tell('The road to {ground}. More scarves than coats, and all of them walking the same way.'),
      say('child', 'Do they all know each other?'),
      say('me', 'Yes.'),
    ]}]},
    {id: 'seller', branches: [
      {when: {flag: 'c8:scarf'}, lines: [say('seller', 'Too long? They are all too long. That is how you know it is the first one.')]},
      {when: {has: 'scarf'}, lines: [
        say('seller', 'For the small one? Smallest I have.'),
        tell('He looks at the one round your neck, the old one, and gives you the price he gives people he knows.'),
        tell('You hang one end over the small shoulder, the way you would hang something up to dry.'),
      ], then: [flag('c8:scarf'), heart(6), bond('child', 4)]},
      {lines: [
        say('seller', 'For the small one? Smallest I have. Nothing for you?'),
        say('me', 'I had one. Longer than I was.'),
        tell('You hang one end over the small shoulder, the way you would hang something up to dry.'),
      ], then: [flag('c8:scarf'), heart(6), bond('child', 4)]},
    ]},

    {id: 'gate', branches: [{lines: [tell('{ground}. {child} looks up at it, keeps looking, and walks into the back of your legs.')]}]},
    {id: 'steward', branches: [
      {when: {flag: 'c8:shown'}, lines: [say('steward', 'In you go. Mind the small one on the steps.')]},
      {lines: [
        tell('You have the tickets out before he asks. He tears them slowly, and bends down.'),
        say('steward', 'First time?'),
        tell('{child} looks at you to find out.'),
        say('me', 'First time.'),
        say('steward', 'Then keep that half. Nobody does, and later they want it.'),
      ], then: [flag('c8:shown'), flag('life:brought-child')]},
    ]},

    {id: 'tunnel', branches: [{lines: [
      tell('The tunnel is cold, and the noise comes down it like water.'),
      tell('At the far end is a square of light, green along the bottom.'),
      tell('A small hand tightens in yours. Yours tightens back before you tell it to.'),
    ]}]},
    {id: 'light', branches: [
      {when: {flag: 'c8:arm'}, lines: [
        say('child', 'It is so green.'),
        say('me', 'The television never tells you that.'),
        say('dad', 'Neither does the radio. I never said it was perfect.'),
      ]},
      {lines: [say('child', 'It is so green.'), say('me', 'The television never tells you that.')]},
    ]},

    {id: 'elder', branches: [
      {when: {flag: 'c8:arm'}, lines: [
        tell('{elder} nods at your father. Your father nods back. It is the longest conversation they have had in years.'),
        say('elder', 'And this one?'),
        say('dad', 'Ours.'),
      ]},
      {lines: [
        say('elder', 'Where is he?'),
        say('me', 'At home. With the radio.'),
        say('elder', 'Hm. Tell him his place is here. Nobody has stood in it.'),
        tell('He looks down at {child}, who is standing in it.'),
      ]},
    ]},
    {id: 'crowd', branches: [
      {when: {flag: 'c8:clapped'}, lines: [tell('Three slow, then fast. One pair of hands in it is new.')]},
      {lines: [tell('It starts somewhere behind you and comes forward. {child} turns round to see who is in charge of it.')], next: 'clap'},
    ]},
    {id: 'clap', branches: [
      {when: {flag: 'life:sang'}, lines: [
        say('me', 'Hands out. Three slow. Then fast, until you cannot.'),
        tell('The songs you caught by yourself, like a cold. This you were shown, once, slowly, by a man pretending it was nothing.'),
      ], then: [{e: 'play', game: 'clap', id: 'c8-clap', then: [flag('c8:clapped'), heart(8), bond('child', 6)]}]},
      {lines: [
        say('me', 'Hands out. Three slow. Then fast, until you cannot.'),
        tell('You show it slowly, the way it was shown to you, once, by a man pretending it was nothing.'),
      ], then: [{e: 'play', game: 'clap', id: 'c8-clap', then: [flag('c8:clapped'), heart(8), bond('child', 6)]}]},
    ]},

    {id: 'roar', branches: [
      {when: {flag: 'c8:arm'}, lines: [
        tell('Small hands, half a beat late, and then not late.'),
        tell('Then the whole ground breathes in.'),
        say('dad', 'That is us with the ball.'),
        say('child', 'How do you know?'),
        say('dad', 'They go quiet first.'),
        tell('What comes next is not quiet. Along the fence: an old man with his eyes shut and his fists up, and beside him somebody small doing the same, one second behind.'),
      ], then: [flag('c8:over'), keep('second-scarf'), {e: 'sound', cue: 'roar'}, {e: 'end', ending: 'three'}]},
      {lines: [
        tell('Small hands, half a beat late, and then not late.'),
        tell('Then the whole ground breathes in, and lets go.'),
        tell('{child} is in the air before deciding to be. This time the arms are yours.'),
        tell('You do not see the pitch. You are looking the other way.'),
      ], then: [flag('c8:home'), keep('second-scarf'), {e: 'sound', cue: 'roar'}, {e: 'goto', room: 'room', spawn: 'fromStreet', time: 'night'}], next: 'dad'},
    ]},
  ],

  endings: {
    three: {title: 'The Seat Next to You', body: 'For years the seat next to you had a man in it, and he was taller than you. Today there was somebody on each side, and you were the one in the middle trying to look calm. The small scarf came home in your pocket, because small people get hot.', keep: 'second-scarf'},
    radio: {title: 'The Seat Next to You', body: 'You found the station for him, as you did at six, and went without him. Somebody small stood in his place and was allowed to. He knew before the shout. The small scarf came home in your pocket, because small people get hot.', keep: 'second-scarf'},
    told: {title: 'The Seat Next to You', body: 'He stayed, and you kept your word: all of it, in the wrong order, from somebody who had never seen grass that green. You will not remember who they were playing. The small scarf came home in your pocket, because small people get hot.', keep: 'second-scarf'},
  },

  keepsakes: [
    {id: 'second-scarf', name: 'The second scarf', note: 'Bought on the way in, too long, worn for most of one match. It came home in your pocket, because small people get hot.'},
  ],
}
