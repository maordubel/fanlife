/**
 * Age ten — THE ALBUM.
 *
 * The universal beat: the sticker album, and the one empty square every child has. Pocket money
 * from Mum, a packet from the kiosk that holds everything except the one you need, and an older
 * boy on the pitch who has it twice. Three ways to close the gap — trade your best spare, play
 * for it, or leave the square empty — and the album is a keepsake whichever you pick. No player
 * is named and nothing is said about a result: the square is the captain's, and that is all.
 */
import type {Chapter} from '../types'
import {bond, coins, flag, heart, keep, say, tell} from './kit'

export const C3A_ALBUM: Chapter = {
  id: 'c3a-album',
  act: 1,
  age: 10,
  title: 'The Album',
  kicker: 'Age ten · one square',
  intro: 'The album has a hundred squares and ninety-nine faces. The empty one is in the middle of the first page, where the captain goes, and you have opened it so many times that it falls open there by itself.',
  start: {room: 'street', spawn: 'fromHome', time: 'day'},

  names: {friend: 'Older boy'},

  cast: [
    {who: 'mum', room: 'street', slot: 'doorstep', talk: 'mum'},
    {who: 'kiosk', room: 'street', slot: 'kiosk', talk: 'kiosk'},
    {who: 'friend', room: 'pitch', slot: 'friend', talk: 'boy'},
    {who: 'elder', room: 'pitch', slot: 'elder', talk: 'elder'},
  ],

  doors: [
    {id: 'street-pitch', room: 'street', door: 'east', to: 'pitch', spawn: 'fromStreet', label: 'The pitch', needs: {flag: 'c3a:packet'}, blocked: 'That is where the swapping happens. You have nothing to swap yet.'},
    {id: 'pitch-street', room: 'pitch', door: 'street', to: 'street', spawn: 'fromEast', label: 'Back to the street'},
  ],

  spots: [
    {id: 'window', room: 'street', spot: 'window', talk: 'window', verb: 'look', label: 'The kiosk window'},
    {id: 'wall', room: 'pitch', spot: 'wall', talk: 'wall', verb: 'look', label: 'The wall'},
    {id: 'ball', room: 'pitch', spot: 'ball', talk: 'ball', verb: 'look', label: 'The ball'},
  ],

  beats: [
    {id: 'pitch', room: 'pitch', talk: 'pitch-in'},
  ],

  objectives: [
    {id: 'money', t: 'Mum is on the doorstep. She has something in her hand', done: {flag: 'c3a:money'}, room: 'street'},
    {id: 'packet', t: 'The kiosk. A packet is a gamble, but it is the only one you can afford', done: {flag: 'c3a:packet'}, room: 'street'},
    {id: 'square', t: 'The pitch. Somebody there has the one you need, twice', done: {flag: 'c3a:sorted'}, room: 'pitch'},
    {id: 'home', t: 'Take the album back past the kiosk', done: {flag: 'c3a:home'}, room: 'street'},
  ],

  talks: [
    {id: 'mum', branches: [
      {when: {flag: 'c3a:money'}, lines: [say('mum', 'That is for the packet. It is not for sweets. I will know.')]},
      {lines: [
        tell('Mum has the album in one hand. She has been looking at the first page, and puts it away the moment you come out.'),
        say('mum', 'Four coins. Do not tell your father: he will give you more, and then it stops being special.'),
        say('mum', 'One packet. You know what is in it?'),
        say('me', 'Faces.'),
        say('mum', 'Faces. And at least two you already have.'),
      ], then: [flag('c3a:money'), coins(4)]},
    ]},

    {id: 'window', branches: [{lines: [tell('Behind the glass, a wall of the same packet, forty times. The captain is on the front of every one of them, and not in any of them.')]}]},
    {id: 'kiosk', branches: [
      {when: {flag: 'c3a:home'}, lines: [say('kiosk', 'Same time next Saturday. I will keep my best ones for you.'), tell('He says this to every child. It is still the best thing anybody says all week.')]},
      {when: {flag: 'c3a:sorted'}, lines: [
        tell('{kiosk} looks at the album, and then at you, and for once says nothing at all.'),
        say('kiosk', 'Show me the first page.'),
      ], next: 'first-page'},
      {when: {flag: 'c3a:packet'}, lines: [say('kiosk', 'Go on. The boys on the pitch will swap anything for the right face.')]},
      {lines: [
        say('kiosk', 'Four coins. That is one packet, and a packet is a hope.'),
        tell('He tears the corner off for you, which is against the rules, and counts out the faces on the counter before closing them up again.'),
        say('kiosk', 'Two of the same. That is the difference between luck and a hobby.'),
        tell('Two goalkeepers. Not the captain. Of course not the captain.'),
      ], then: [flag('c3a:packet'), coins(-4), keep('spare')]},
    ]},
    {id: 'first-page', branches: [
      {when: {flag: 'c3a:swapped'}, lines: [tell('The square is full. The captain looks out with the expression of someone who was never in any doubt.'), say('kiosk', 'Traded for it. That is a hobby, then.')], then: [flag('c3a:home'), {e: 'end', ending: 'traded'}]},
      {when: {flag: 'c3a:earned'}, lines: [tell('The square is full, and one corner is bent where it was pressed on too fast.'), say('kiosk', 'Earned it. Keep that corner. Nobody else will ever know why it is bent.')], then: [flag('c3a:home'), {e: 'end', ending: 'earned'}]},
      {lines: [tell('The square is empty. You show it to him anyway, the way you show somebody a tooth.'), say('kiosk', 'Still a hundred. Ninety-nine and a hope. Many people never get the hundredth, and they are the ones who open it most.')], then: [flag('c3a:home'), {e: 'end', ending: 'gap'}]},
    ]},

    {id: 'pitch-in', branches: [{lines: [
      tell('The pitch is a quarter of a pitch, and everything on it is for swapping: ones with a ball, ones without, and a bench of albums held open like menus.'),
      tell('{friend} is sitting on the wall above them all, with an elastic band round a stack as thick as a hand.'),
    ]}]},
    {id: 'boy', branches: [
      {when: {flag: 'c3a:sorted'}, lines: [say('friend', 'We are good. Go and show your mum.')]},
      {lines: [
        say('friend', 'I know that face. It is the face of somebody with an empty square.'),
        tell('He has not looked at the album. He has looked at your hands, and your hands are holding it open at the first page.'),
        say('friend', 'I have two of him. Two. I only ever needed one.'),
        say('friend', 'What have you got?'),
      ], choices: [
        {id: 'swap', t: 'Offer the spare goalkeeper', then: [flag('c3a:sorted'), flag('c3a:swapped'), bond('friend', 6), heart(4)], next: 'swap'},
        {id: 'play', t: 'Ask him what you would have to do for it', then: [], next: 'play'},
        {id: 'leave', t: 'Say it is all right. You will find it yourself', then: [flag('c3a:sorted'), flag('c3a:gap'), heart(2)], next: 'leave'},
      ]},
    ]},
    {id: 'swap', branches: [{lines: [
      tell('He turns your goalkeeper over, checks the back, and holds it up to the light. This is the whole ceremony.'),
      say('friend', 'Two of him in your bag is not luck. It is bad planning. Done.'),
      tell('The captain goes into your hand like a coin. You do not look at him. You look at the boy, and say thank you in the quiet way.'),
    ]}]},
    {id: 'play', branches: [{lines: [
      say('friend', 'Keep-ups. Ten. If it touches the ground I keep my face and you keep yours.'),
      tell('The ball is not yours and it is not round enough. You take it anyway.'),
    ], then: [{e: 'play', game: 'carry', id: 'c3a-keepup', then: [flag('c3a:sorted'), flag('c3a:earned'), bond('friend', 4), heart(6)]}]}]},
    {id: 'leave', branches: [{lines: [
      say('friend', 'You are the first this year to say that.'),
      tell('He puts the elastic band back round the stack and does not argue. It is the only polite thing anybody has said to him all week.'),
    ]}]},

    {id: 'elder', branches: [{lines: [
      say('elder', 'I had the whole album when I was your age. Then somebody lent me a pen, and I wrote the captain in.'),
      say('elder', 'It does not count. I would not trade it for any real one.'),
    ]}]},
    {id: 'wall', branches: [{lines: [tell('Somebody has chalked a ring on the wall for a goal, and written the date underneath in a hand that is almost handwriting.')]}]},
    {id: 'ball', branches: [{lines: [tell('The ball has been taped twice. Nobody owns it, and everybody can tell you which of them has had it longest.')]}]},
  ],

  endings: {
    traded: {title: 'The Album', body: 'One square, filled, with a goalkeeper you did not need. The hundredth is the only one you will remember. The ninety-nine others were luck, and this one was a conversation.', keep: 'album'},
    earned: {title: 'The Album', body: 'The captain is in, a corner bent where you pressed him down too hard. You could have asked for more, or less, and the boy would have given it. You asked what you would have to do, and that was the answer.', keep: 'album'},
    gap: {title: 'The Album', body: 'Ninety-nine faces and a square with nobody in it. Everybody understood. Years from now you will meet somebody with the same empty page, and you will know what is on the other side of it.', keep: 'album'},
  },

  keepsakes: [
    {id: 'spare', name: 'The spare goalkeeper', note: 'A duplicate, with one corner softer than the rest from being carried to the pitch in a back pocket.'},
    {id: 'album', name: 'The album', note: 'A hundred squares, ninety-nine of them full. The first page falls open at the middle, where the captain goes.'},
  ],
}
