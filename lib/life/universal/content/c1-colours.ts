/**
 * Age six — THE COLOURS.
 *
 * The universal beat: nobody chooses a club. It is handed over, on an ordinary Saturday, by
 * somebody who is pretending not to be nervous. The whole chapter happens inside the flat; the
 * match comes in through a radio, and it has no opponent and no score, because what the child
 * keeps from this day is not a result.
 */
import type {Chapter} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

export const C1_COLOURS: Chapter = {
  id: 'c1-colours',
  act: 1,
  age: 6,
  title: 'The Colours',
  kicker: 'Age six · a Saturday',
  intro: 'Saturday. The flat smells of coffee and floor soap. Dad has looked at the clock four times since breakfast, and you can count to four.',
  start: {room: 'bedroom', spawn: 'start', time: 'day'},

  cast: [
    {who: 'dad', room: 'room', slot: 'sofa', talk: 'dad'},
    {who: 'mum', room: 'room', slot: 'byDoor', when: {flag: 'c1:tuned'}, talk: 'mum'},
    {who: 'mum', room: 'kitchen', slot: 'counter', talk: 'mum'},
  ],

  doors: [
    {id: 'bed-out', room: 'bedroom', door: 'door', to: 'room', spawn: 'fromBedroom', label: 'The living room'},
    {id: 'room-bed', room: 'room', door: 'south', to: 'bedroom', spawn: 'fromLiving', label: 'Your room'},
    {id: 'room-kitchen', room: 'room', door: 'east', to: 'kitchen', spawn: 'fromLiving', label: 'The kitchen'},
    {id: 'kitchen-room', room: 'kitchen', door: 'door', to: 'room', spawn: 'fromKitchen', label: 'The living room'},
  ],

  spots: [
    {id: 'ball', room: 'bedroom', spot: 'ball', talk: 'ball', verb: 'look', label: 'Your ball'},
    {id: 'under-bed', room: 'bedroom', spot: 'box', talk: 'under-bed', verb: 'look', label: 'Under the bed'},
    {id: 'wardrobe', room: 'bedroom', spot: 'wardrobe', when: {not: 'c1:scarf'}, talk: 'wardrobe', verb: 'open', label: 'The wardrobe'},
    {id: 'tv', room: 'room', spot: 'tv', talk: 'tv', verb: 'look', label: 'The television'},
    {id: 'frame', room: 'room', spot: 'frame', talk: 'frame', verb: 'look', label: 'The shirt behind glass'},
    {id: 'photos', room: 'room', spot: 'photos', talk: 'photos', verb: 'look', label: 'The photographs'},
    {id: 'radio', room: 'kitchen', spot: 'radio', when: {not: 'c1:radio'}, talk: 'radio', verb: 'take', label: 'The radio'},
    {id: 'drawer', room: 'kitchen', spot: 'drawer', when: {not: 'c1:batteries'}, talk: 'drawer', verb: 'open', label: 'The drawer'},
    {id: 'fridge', room: 'kitchen', spot: 'fridge', talk: 'fridge', verb: 'look', label: 'The fridge door'},
  ],

  beats: [
    {id: 'listen', room: 'room', when: {flag: 'c1:tuned'}, talk: 'listen'},
  ],

  objectives: [
    {id: 'ask', t: 'Find out what Dad is waiting for', done: {flag: 'c1:asked'}, room: 'room'},
    {id: 'fetch', t: 'The radio and the batteries are in the kitchen', done: {all: [{flag: 'c1:radio'}, {flag: 'c1:batteries'}]}, room: 'kitchen'},
    {id: 'give', t: 'Bring them to Dad', done: {flag: 'c1:given'}, room: 'room'},
    {id: 'scarf', t: 'The box on top of your wardrobe', done: {flag: 'c1:scarf'}, room: 'bedroom'},
    {id: 'sit', t: 'Go and sit with Dad. It is starting', done: {flag: 'c1:heard'}, room: 'room'},
  ],

  talks: [
    {id: 'dad', branches: [
      {when: {flag: 'c1:heard'}, lines: [say('dad', 'Again next week?')]},
      {when: {flag: 'c1:scarf'}, lines: [
        say('dad', 'There it is.'),
        tell('He does not take it from you. He lifts one end and puts it over your shoulder, the way you would hang something up to dry.'),
        say('dad', 'Now sit. Find them for me — you have better ears.'),
      ], then: [{e: 'play', game: 'tune', id: 'c1-radio', then: [flag('c1:tuned')]}]},
      {when: {flag: 'c1:given'}, lines: [say('dad', 'Your wardrobe. Top shelf. The box.'), say('dad', 'Use the chair. Do not tell your mother about the chair.')]},
      {when: {all: [{flag: 'c1:radio'}, {flag: 'c1:batteries'}]}, lines: [
        tell('He takes the radio in both hands and turns it over twice, as if it might have changed since last week.'),
        say('dad', 'Good. Batteries. Good.'),
        say('dad', 'One more thing, and this one matters. Top of your wardrobe there is a box. Bring me what is in it.'),
        say('me', 'What is in it?'),
        say('dad', 'Yours. As of today.'),
      ], then: [flag('c1:given'), bond('dad', 4)]},
      {when: {flag: 'c1:asked'}, lines: [say('dad', 'Radio. Batteries. Kitchen.'), say('dad', 'Go on. Kick-off does not wait for small people.')]},
      {lines: [
        say('me', 'What are you waiting for?'),
        say('dad', 'Three o\'clock.'),
        say('me', 'What happens at three o\'clock?'),
        say('dad', '{club} happen at three o\'clock.'),
        tell('He says it the way other fathers say "dinner".'),
        say('dad', 'The television shows you a match. The radio tells you the truth. Go and get the radio from the kitchen — and ask your mother nicely where the batteries went.'),
      ], then: [flag('c1:asked')]},
    ]},

    {id: 'mum', branches: [
      {when: {flag: 'c1:heard'}, lines: [say('mum', 'Come here. You are bright red.'), say('mum', 'Both of you.')]},
      {when: {flag: 'c1:tuned'}, lines: [say('mum', 'I am not listening. I am standing here for a different reason.')]},
      {when: {flag: 'c1:scarf'}, lines: [say('mum', 'Look at you. It is longer than you are.'), say('mum', 'He wore that the day you were born, you know. In the corridor. They asked him to take it off.'), say('mum', 'He did not take it off.')]},
      {when: {all: [{flag: 'c1:asked'}, {not: 'c1:mum'}]}, lines: [
        say('mum', 'He sent you for the radio.'),
        say('me', 'And the batteries. Nicely.'),
        say('mum', 'Drawer. The one that has everything in it.'),
        say('mum', 'Tell me something. Are you going to be like him about this?'),
      ], choices: [
        {id: 'what', t: 'What is he like?', then: [flag('c1:mum'), bond('mum', 4)], next: 'mum-like'},
        {id: 'yes', t: 'Yes.', then: [flag('c1:mum'), heart(4), bond('dad', 2)], next: 'mum-yes'},
        {id: 'dunno', t: 'I do not know what it is yet.', then: [flag('c1:mum'), bond('mum', 6)], next: 'mum-dunno'},
      ]},
      {when: {flag: 'c1:asked'}, lines: [say('mum', 'And tell your father that the table is not a grandstand.')]},
      {lines: [say('mum', 'Good morning, you. Your father is in the other room pretending not to be nervous.')]},
    ]},
    {id: 'mum-like', branches: [{lines: [say('mum', 'For ninety minutes a week he is seven years old.'), say('mum', 'It is the best thing about him. Do not tell him I said so.')]}]},
    {id: 'mum-yes', branches: [{lines: [say('mum', 'Of course you are.'), tell('She says it to the pot, but she is smiling at it.')]}]},
    {id: 'mum-dunno', branches: [{lines: [say('mum', 'That is the right answer.'), say('mum', 'Go and find out. Then come back and tell me — I have been married to it for nine years and I still only half know.')]}]},

    {id: 'radio', branches: [
      {when: {flag: 'c1:asked'}, lines: [tell('The radio. Heavier than it looks, and one corner is held on with tape.'), tell('You carry it with both arms, like a cat that might change its mind.')], then: [flag('c1:radio')]},
      {lines: [tell('Dad\'s radio. You are not supposed to touch it.'), tell('You have touched it. Nothing happened.')]},
    ]},
    {id: 'drawer', branches: [
      {when: {flag: 'c1:asked'}, lines: [tell('The drawer that has everything in it: string, a candle, a key to nothing, a tin of buttons.'), tell('And four batteries, rolling around at the back like they were hiding.')], then: [flag('c1:batteries')]},
      {lines: [tell('The everything drawer. You do not know what you are looking for yet.')]},
    ]},
    {id: 'fridge', branches: [{lines: [tell('One of your drawings, held up by a magnet. It is supposed to be a horse.'), tell('Next to it, in Dad\'s handwriting, a list of Saturdays. Some of them are underlined twice.')]}]},

    {id: 'ball', branches: [{lines: [tell('Your ball. A little flat on one side, since the balcony.'), tell('It still goes where you kick it, more or less.')]}]},
    {id: 'under-bed', branches: [{lines: [tell('Under the bed: one sock, a marble, and a lot of room.'), tell('Enough room for a box, if you ever have things worth keeping.')]}]},
    {id: 'wardrobe', branches: [
      {when: {flag: 'c1:given'}, lines: [
        tell('You drag the chair over. It makes the noise chairs are not supposed to make.'),
        tell('On top of the wardrobe, pushed to the back: a shoebox, soft at the corners.'),
        tell('Inside, folded the way you fold a flag, is a scarf. {club}. It smells of the cupboard and of somewhere louder.'),
      ], then: [flag('c1:scarf'), keep('scarf'), {e: 'wear', what: 'scarf'}, heart(10)]},
      {lines: [tell('Too high. Whatever lives on top of the wardrobe is not for you.'), tell('Yet.')]},
    ]},

    {id: 'tv', branches: [{lines: [tell('The television is off, and it is going to stay off.'), tell('Dad says the television shows you a match and the radio tells you the truth.')]}]},
    {id: 'frame', branches: [{lines: [tell('A shirt behind glass. You are not allowed to touch the glass.'), tell('There is one small fingerprint on the glass, at exactly your height.')]}]},
    {id: 'photos', branches: [{lines: [tell('Dad, much younger, in a crowd, with his mouth wide open.'), tell('He says he was singing. Mum says that is one word for it.')]}]},

    {id: 'listen', branches: [{lines: [
      tell('Static. Then, out of the static, a voice — fast, as if it were running.'),
      say('dad', 'That is us with the ball.'),
      say('me', 'How do you know?'),
      say('dad', 'He talks quicker when it is us.'),
      tell('For a long time nothing happens, very loudly.'),
      tell('Then the voice breaks into a shout, and the little radio cannot hold all of it.'),
    ], choices: [
      {id: 'jump', t: 'Jump on the sofa', then: [flag('c1:jumped'), heart(8), {e: 'sound', cue: 'roar'}], next: 'after'},
      {id: 'look', t: 'Look at Dad', then: [flag('c1:looked'), bond('dad', 10), {e: 'sound', cue: 'roar'}], next: 'after'},
      {id: 'scarf', t: 'Hold the scarf up over your head, like he does', then: [flag('c1:held'), heart(6), bond('dad', 5), {e: 'sound', cue: 'roar'}], next: 'after'},
    ]}]},
    {id: 'after', branches: [
      {when: {flag: 'c1:looked'}, lines: [
        tell('He is not looking at the radio. His eyes are shut and his fists are up, and for one second he is nobody\'s father.'),
        tell('Then he opens them, and finds you, and picks you up so fast that your feet forget the floor.'),
        say('mum', 'The neighbours!'),
        say('dad', 'The neighbours are listening to the same match.'),
      ], then: [flag('c1:heard'), {e: 'end', ending: 'handed'}]},
      {lines: [
        tell('You are in the air before you decide to be. Dad has you under the arms and the ceiling is very close.'),
        say('mum', 'The neighbours!'),
        say('dad', 'The neighbours are listening to the same match.'),
        tell('Through the wall, somebody is shouting the same thing you are.'),
      ], then: [flag('c1:heard'), {e: 'end', ending: 'loud'}]},
    ]},
  ],

  endings: {
    loud: {title: 'The Colours', body: 'You did not pick them. They were handed to you on a Saturday, with both hands, by a man who was trying to look calm. You will not remember who they were playing. You will remember the ceiling.', keep: 'scarf'},
    handed: {title: 'The Colours', body: 'You did not pick them. They were handed to you on a Saturday, with both hands. You will not remember who they were playing. You will remember his face in the second before he remembered you were there.', keep: 'scarf'},
  },

  keepsakes: [
    {id: 'scarf', name: 'The scarf from the shoebox', note: 'Longer than you were. He wore it in the corridor the day you were born, and did not take it off.'},
  ],
}
