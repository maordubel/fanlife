/**
 * Age twenty-six — THE EMPTY SEASON.
 *
 * The universal beat: the long stretch where it is not good, the stand is half full, and the
 * people who came with you are finding better Saturdays. One workmate at the gate is about to
 * stop coming, and says so. Whatever he is told, he is told kindly, and the steward still lets
 * you through. No score, no opponent, no table: the season is described the way a season is
 * remembered, by who is no longer next to you. Three ways to answer him, and a small crowd
 * who start a song that nobody planned.
 */
import type {Chapter} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

export const C6A_EMPTY: Chapter = {
  id: 'c6a-empty',
  act: 2,
  age: 26,
  title: 'The Empty Season',
  kicker: 'Age twenty-six · half a stand',
  intro: 'The queue at the turnstile used to start at the corner. Today you walked straight up. Somebody has painted over the half of the board where the numbers used to be, and nobody has complained.',
  start: {room: 'gate', spawn: 'start', time: 'day'},

  names: {mate: 'Old mate'},

  cast: [
    {who: 'steward', room: 'gate', slot: 'steward', talk: 'steward'},
    {who: 'mate', room: 'gate', slot: 'wait', talk: 'mate'},
    {who: 'elder', room: 'terrace', slot: 'fence', talk: 'elder'},
  ],

  doors: [
    {id: 'turnstile', room: 'gate', door: 'turnstile', to: 'tunnel', spawn: 'fromGate', label: 'The turnstile', needs: {flag: 'c6a:through'}, blocked: 'The steward has not looked at your ticket yet. He is making a point of not looking.'},
    {id: 'tunnel-back', room: 'tunnel', door: 'back', to: 'gate', spawn: 'fromInside', label: 'Back to the gate'},
    {id: 'tunnel-light', room: 'tunnel', door: 'light', to: 'terrace', spawn: 'fromTunnel', label: 'The light'},
    {id: 'terrace-tunnel', room: 'terrace', door: 'tunnel', to: 'tunnel', spawn: 'fromTerrace', label: 'The tunnel'},
  ],

  spots: [
    {id: 'board', room: 'gate', spot: 'board', talk: 'board', verb: 'look', label: 'The board'},
    {id: 'flag', room: 'gate', spot: 'flag', talk: 'flag', verb: 'look', label: 'The flag over the gate'},
    {id: 'sign', room: 'tunnel', spot: 'sign', talk: 'sign', verb: 'look', label: 'The wall under the arch'},
    {id: 'pitch', room: 'terrace', spot: 'pitch', talk: 'pitch', verb: 'look', label: 'The pitch'},
    {id: 'banner', room: 'terrace', spot: 'banner', talk: 'banner', verb: 'look', label: 'The banner'},
  ],

  beats: [
    {id: 'in', room: 'terrace', talk: 'terrace-in'},
  ],

  objectives: [
    {id: 'steward', t: 'The gate. Show your ticket', done: {flag: 'c6a:through'}, room: 'gate'},
    {id: 'mate', t: 'Your old mate is leaning on the fence. He has the look of somebody about to say something', done: {flag: 'c6a:mate'}, room: 'gate'},
    {id: 'sing', t: 'Somebody on the terrace is humming', done: {flag: 'c6a:sang'}, room: 'terrace'},
    {id: 'out', t: 'The ninetieth minute is the same length as it always was. Stay for it', done: {flag: 'c6a:stayed'}, room: 'terrace'},
  ],

  talks: [
    {id: 'steward', branches: [
      {when: {flag: 'c6a:through'}, lines: [say('steward', 'Plenty of room, today. Sit where you like.')]},
      {lines: [
        tell('The steward takes your ticket without looking at it, and then looks at you instead.'),
        say('steward', 'Seven years I have watched you come in. You are one of eleven I would know without the ticket.'),
        say('steward', 'It is a quiet one. Go and make it less quiet.'),
      ], then: [flag('c6a:through'), bond('steward', 3)]},
    ]},
    {id: 'mate', branches: [
      {when: {flag: 'c6a:mate'}, lines: [say('mate', 'I will see you. In my own time.')]},
      {lines: [
        tell('{mate} has two programmes in his hand, one for each of you, and has not given you yours.'),
        say('mate', 'I need to tell you something and I do not want it to be a thing.'),
        say('mate', 'The baby is coming in the spring. And Saturdays were already hard.'),
        say('mate', 'I am not stopping. I am just not coming for a while. You understand?'),
      ], choices: [
        {id: 'promise', t: 'Tell him you will keep his seat', then: [flag('c6a:mate'), flag('c6a:promised'), bond('mate', 6), heart(3)], next: 'promise'},
        {id: 'understand', t: 'Tell him it is the right thing, and mean it', then: [flag('c6a:mate'), flag('c6a:understood'), bond('mate', 8)], next: 'understand'},
        {id: 'quiet', t: 'Say nothing. Take the programme', then: [flag('c6a:mate'), flag('c6a:silent'), bond('mate', -2), heart(1)], next: 'quiet'},
      ]},
    ]},
    {id: 'promise', branches: [{lines: [say('me', 'Your seat stays yours. I will tell anybody who sits in it.'), say('mate', 'You will not tell them anything. You will glare.'), tell('He gives you the programme. It is the first time he has smiled today.')]}]},
    {id: 'understand', branches: [{lines: [say('me', 'Go. It is the right thing. Send me a photograph.'), say('mate', 'Of the baby or of the seat?'), say('me', 'Both.')]}]},
    {id: 'quiet', branches: [{lines: [tell('You take the programme. Nobody says anything. Some of the best arguments of your friendship have been like this.'), say('mate', 'That is fair.')]}]},

    {id: 'board', branches: [{lines: [tell('Half of the board has been painted over. The other half still carries the fixtures list, in the font of a more optimistic year.')]}]},
    {id: 'flag', branches: [{lines: [tell('The flag over the gate has been mended with a different thread. You can tell where, from here.')]}]},

    {id: 'terrace-in', branches: [{lines: [
      tell('The stand holds the weather, and a few hundred people in it, and plenty of echo.'),
      tell('From here you can hear what is said at the far end. It is mostly encouragement, and a little of the other thing.'),
    ]}]},
    {id: 'elder', branches: [
      {when: {flag: 'c6a:stayed'}, lines: [say('elder', 'Thank you for staying. Not for them. For me. I hate to be the last.')]},
      {when: {flag: 'c6a:sang'}, lines: [
        tell('The humming has become a song. Fewer voices than there should be, but each one of them carrying a fuller share.'),
        say('elder', 'Stay for the end. The ninetieth minute is exactly as long as it always was.'),
      ], next: 'stay'},
      {lines: [
        tell('{elder} is humming, and has been for some time, in a key of his own.'),
        say('elder', 'I do it every week. Nobody joins in, and every week somebody does.'),
      ], then: [{e: 'play', game: 'clap', id: 'c6a-clap', then: [flag('c6a:sang'), heart(5), bond('elder', 4)]}]},
    ]},
    {id: 'stay', branches: [
      {when: {flag: 'c6a:promised'}, lines: [tell('You look at the empty seat to your left. You do not move your coat off it.')], then: [flag('c6a:stayed'), keep('programme'), {e: 'end', ending: 'promised'}]},
      {when: {flag: 'c6a:understood'}, lines: [tell('You think of him with the baby, in a room that is quieter than this one, and you do not mind. Almost.')], then: [flag('c6a:stayed'), keep('programme'), {e: 'end', ending: 'understood'}]},
      {lines: [tell('The seat next to you is just a seat. You were hoping it would not feel like that.')], then: [flag('c6a:stayed'), keep('programme'), {e: 'end', ending: 'silent'}]},
    ]},
    {id: 'sign', branches: [{lines: [tell('The writing on the wall under the arch is the same. The smell is the same. It is only the sound that has gone a long way off.')]}]},
    {id: 'pitch', branches: [{lines: [tell('The grass is the same green it always was. It does not know about the season.')]}]},
    {id: 'banner', branches: [{lines: [tell('The banner has been taken down and put back up so many times that it has creases in places where there are no folds.')]}]},
  ],

  endings: {
    promised: {title: 'The Empty Season', body: 'Half a stand, and a coat on a seat. He did not come, and you did not move it. Somebody asked if it was free. You said it was taken, and for ninety minutes it was.', keep: 'programme'},
    understood: {title: 'The Empty Season', body: 'You let him go and meant it. The stand was half empty and the song was thinner than it should be, and you sang it anyway. Some of the best seasons are remembered for who was not in them.', keep: 'programme'},
    silent: {title: 'The Empty Season', body: 'You took the programme and said nothing, and neither of you ever raised it again. The friendship was fine. The seat next to you was just a seat, and that was the thing you had not expected to mind.', keep: 'programme'},
  },

  keepsakes: [
    {id: 'programme', name: 'The programme', note: 'Two were bought. One was handed over at the gate, and the other is in a drawer. The fixtures list in it is from a more optimistic year.'},
  ],
}
