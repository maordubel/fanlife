/**
 * Age forty-one — THE BOX.
 *
 * The last chapter of every life. His own flat, a night after a match, and somebody small who
 * cannot sleep and wants to know what is in the box under the bed. The things come out one at a
 * time; each is told if this life kept it, and where it did not there is a line about the place
 * such a thing would be — a life that kept nothing still has a box. Then the question his mother
 * once asked him in a kitchen is asked of him, the other way round, and there is no best answer.
 *
 * The box is opened in three sittings (`fin:one`, `fin:two`, `fin:seen`), so a conversation closed
 * by mistake is picked up where it stopped. The last image is chapter one's first: a shoebox, the
 * top of a wardrobe, a chair.
 */
import type {Chapter, Cond} from '../types'
import {bond, flag, say, tell} from './kit'

const ASLEEP: Cond = {flag: 'fin:answered'}
const answered = (k: string) => [flag(`fin:${k}`), flag('fin:answered'), bond('child', 5)]

export const FINALE: Chapter = {
  id: 'finale',
  act: 3,
  age: 41,
  title: 'The Box',
  kicker: 'Age forty-one · after a match',
  intro: 'Night. Your own flat now. {child} is in the bed with the light on, wide awake, still clapping with one hand against the blanket.',
  start: {room: 'bedroom', spawn: 'start', time: 'night'},

  cast: [
    {who: 'child', room: 'bedroom', slot: 'rug', when: {all: [{flag: 'fin:asked'}, {not: 'fin:answered'}]}, talk: 'child'},
    {who: 'child', room: 'bedroom', slot: 'bed', talk: 'child'},
  ],

  doors: [
    {id: 'bed-out', room: 'bedroom', door: 'door', to: 'room', spawn: 'fromBedroom', label: 'The living room'},
    {id: 'room-bed', room: 'room', door: 'south', to: 'bedroom', spawn: 'fromLiving', label: 'The bedroom'},
    {id: 'room-kitchen', room: 'room', door: 'east', to: 'kitchen', spawn: 'fromLiving', label: 'The kitchen'},
    {id: 'kitchen-room', room: 'kitchen', door: 'door', to: 'room', spawn: 'fromKitchen', label: 'The living room'},
  ],

  spots: [
    {id: 'box', room: 'bedroom', spot: 'box', talk: 'box', verb: 'open', label: 'The box under the bed'},
    {id: 'wardrobe', room: 'bedroom', spot: 'wardrobe', talk: 'wardrobe', verb: 'use', label: 'The top of the wardrobe'},
    {id: 'photos', room: 'room', spot: 'photos', talk: 'photos', verb: 'look', label: 'The photographs'},
    {id: 'radio', room: 'kitchen', spot: 'radio', talk: 'radio', verb: 'look', label: 'The radio'},
    {id: 'fridge', room: 'kitchen', spot: 'fridge', talk: 'fridge', verb: 'look', label: 'The fridge door'},
  ],

  beats: [],

  objectives: [
    {id: 'ask', t: '{child} cannot sleep', done: {flag: 'fin:asked'}, room: 'bedroom'},
    {id: 'box', t: 'Open the box under the bed', done: {flag: 'fin:seen'}, room: 'bedroom'},
    {id: 'answer', t: 'Answer the question', done: ASLEEP, room: 'bedroom'},
    {id: 'shelf', t: 'One more thing, on top of the wardrobe', done: {flag: 'fin:up'}, room: 'bedroom'},
  ],

  talks: [
    {id: 'child', branches: [
      {when: ASLEEP, lines: [tell('Asleep, all at once, the way a radio goes when the batteries give up.'), tell('One hand is still open, in case of clapping.')]},
      {when: {flag: 'fin:seen'}, lines: [tell('{child} has been holding a question for some time, with both hands.')], next: 'question'},
      {when: {flag: 'fin:asked'}, lines: [say('child', 'Open it. I will not touch anything.'), tell('Both hands are already behind the back.')]},
      {lines: [
        say('me', 'Lie down.'),
        say('child', 'I am lying down. It is still loud in here.'),
        tell('A finger taps a forehead.'),
        say('child', 'What is in the box under the bed?'),
        say('me', 'How do you know there is a box?'),
        say('child', 'Everybody has a box.'),
      ], then: [flag('fin:asked')]},
    ]},

    {id: 'box', branches: [
      {when: {flag: 'fin:seen'}, lines: [tell('The box is on the rug with its lid off. It looks like less than it is.')]},
      {when: {flag: 'fin:two'}, lines: [tell('Still open. You go on.')], next: 'b-brush'},
      {when: {flag: 'fin:one'}, lines: [tell('Still open. You go on.')], next: 'b-armband'},
      {when: {flag: 'fin:asked'}, lines: [
        tell('It comes out from under the bed on a tide of dust.'),
        tell('Things come out one at a time. That is the rule of the box.'),
      ], next: 'b-scarf'},
      {lines: [tell('The box under the bed. You know what is in it without looking, which is the point of it.')]},
    ]},

    {id: 'b-scarf', branches: [
      {when: {has: 'scarf'}, lines: [
        say('child', 'This one is old.'),
        say('me', 'Older than me. He wore it in a corridor the day I was born. They asked him to take it off.'),
        say('child', 'Did he?'),
        say('me', 'No.'),
      ], next: 'b-shirt'},
      {lines: [tell('First, a place the length of a scarf, with nothing in it. Some things get worn until there is nothing left to keep.')], next: 'b-shirt'},
    ]},
    {id: 'b-shirt', branches: [
      {when: {has: 'shirt'}, lines: [
        tell('{child} holds the shirt up. It would fit. That is the alarming part.'),
        say('me', 'I was eight. I slept in it until it was taken away to be washed, under protest.'),
      ], next: 'b-ticket'},
      {lines: [tell('No first shirt. You grew out of it and somebody smaller grew into it, which is where shirts go.')], next: 'b-ticket'},
    ]},
    {id: 'b-ticket', branches: [
      {when: {has: 'ticket'}, lines: [
        say('child', 'It is just paper.'),
        say('me', 'It is the first one. He carried it by the edges the whole way, and checked his pocket at every corner.'),
      ], then: [flag('fin:one')], next: 'b-armband'},
      {lines: [tell('No ticket from the first time. It went through the wash in a pocket, most likely. The afternoon did not.')], then: [flag('fin:one')], next: 'b-armband'},
    ]},

    {id: 'b-armband', branches: [
      {when: {has: 'armband'}, lines: [
        tell('A strip of tape that still remembers the shape of an arm.'),
        say('me', 'It meant I was captain. Of a schoolyard, which counts.'),
      ], next: 'b-stub'},
      {lines: [tell('No strip of tape. If you were ever captain of anything, nobody wrote it on your arm.')], next: 'b-stub'},
    ]},
    {id: 'b-stub', branches: [
      {when: {has: 'stub'}, lines: [
        say('child', 'This one is torn.'),
        say('me', 'They tear them at other people\'s grounds as well. I was sixteen. It was a long way, and longer back.'),
      ], then: [flag('fin:two')], next: 'b-brush'},
      {lines: [tell('No stub from a first away day. If you went, you kept the day and not the paper.')], then: [flag('fin:two')], next: 'b-brush'},
    ]},

    {id: 'b-brush', branches: [
      {when: {has: 'brush'}, lines: [
        tell('A brush, stiff as a stick, the bristles still the colour.'),
        say('me', 'A banner. Two of us, on a workshop floor. The letters lean to one side and nobody has ever said so.'),
      ], next: 'b-parcel'},
      {lines: [tell('No brush. Other people painted the banners you stood under. You held your end.')], next: 'b-parcel'},
    ]},
    {id: 'b-parcel', branches: [
      {when: {has: 'parcel'}, lines: [
        tell('Brown paper that has come a long way, folded flat, and a note in {mumName}\'s handwriting.'),
        say('child', 'What does it say?'),
        say('me', 'Nothing much. That is how she says things.'),
        tell('You fold it along the same folds.'),
      ], next: 'b-second'},
      {lines: [tell('No brown paper, no note. Whatever she had to tell you, you were near enough to be told.')], next: 'b-second'},
    ]},
    {id: 'b-second', branches: [
      {when: {has: 'second-scarf'}, lines: [
        tell('On top, the newest thing in the box: a small scarf, still too long.'),
        say('child', 'That is mine.'),
        say('me', 'It was in my pocket. You got hot.'),
      ], then: [flag('fin:seen')], next: 'question'},
      {lines: [tell('And at the top, room. You have always left some.')], then: [flag('fin:seen')], next: 'question'},
    ]},

    {id: 'question', branches: [{lines: [
      tell('{child} looks at the box, and then at you.'),
      say('child', 'Am I going to be like you about this?'),
      tell('You were asked that once, about somebody else, in a kitchen. You were six and had been sent for batteries.'),
    ], choices: [
      {id: 'like', t: 'What am I like?', then: answered('like'), next: 'a-like'},
      {id: 'yes', t: 'Yes.', then: answered('yes'), next: 'a-yes'},
      {id: 'yours', t: 'I do not know. That part is yours.', then: answered('yours'), next: 'a-yours'},
    ]}]},
    {id: 'a-like', branches: [{lines: [say('child', 'For ninety minutes you are my age.'), tell('It is said as a complaint. Nobody has said anything better about you.')]}]},
    {id: 'a-yes', branches: [{lines: [say('child', 'I thought so.'), tell('{child} says it to the box, and is smiling at it.')]}]},
    {id: 'a-yours', branches: [{lines: [say('child', 'When will I know?'), say('me', 'I will tell you when I do. I have only been at it since I was six.')]}]},

    {id: 'wardrobe', branches: [
      {when: {not: 'fin:answered'}, lines: [tell('The top of the wardrobe: the one shelf in the flat {child} cannot reach.'), tell('That is what it is for.')]},
      {when: {has: 'scarf'}, lines: [
        tell('You wait until the breathing from the bed is slow.'),
        tell('The old scarf goes into a shoebox, folded the way you fold a flag. The box is new. It will be soft at the corners by the time anybody is sent for it.'),
      ], next: 'last'},
      {lines: [
        tell('You wait until the breathing from the bed is slow.'),
        tell('A shoebox, new, hard at the corners. You put in your half of today\'s ticket, because a box has to start with something.'),
      ], next: 'last'},
    ]},
    {id: 'last', branches: [
      {when: {flag: 'fin:yes'}, lines: [
        tell('You drag the chair over. It makes the noise chairs are not supposed to make.'),
        say('child', 'What is up there?'),
        say('me', 'Yours. Not as of today.'),
      ], then: [flag('fin:up'), {e: 'end', ending: 'yes'}]},
      {when: {flag: 'fin:yours'}, lines: [
        tell('You drag the chair over. It makes the noise chairs are not supposed to make. Nobody wakes.'),
        tell('You push the box to the back, where it cannot be seen from the floor and can be found by anybody tall enough to have decided.'),
      ], then: [flag('fin:up'), {e: 'end', ending: 'yours'}]},
      {lines: [
        tell('You drag the chair over. It makes the noise chairs are not supposed to make.'),
        say('child', 'I heard that.'),
        say('me', 'You heard nothing. Nobody is told about the chair.'),
      ], then: [flag('fin:up'), {e: 'end', ending: 'like'}]},
    ]},

    {id: 'photos', branches: [
      {when: {flag: 'life:sang'}, lines: [tell('Two photographs now: Dad in a crowd with his mouth wide open, and you in a crowd with yours.'), tell('He says he was singing. You say the same.')]},
      {lines: [tell('Dad, much younger, in a crowd, with his mouth wide open.'), tell('He still says he was singing.')]},
    ]},
    {id: 'radio', branches: [{lines: [
      tell('A radio. Not his: he would never part with it. You bought the nearest thing you could find.'),
      tell('It did not sound right until you put tape on one corner.'),
    ]}]},
    {id: 'fridge', branches: [
      {when: {flag: 'life:chose-work'}, lines: [tell('A list of Saturdays, in your handwriting now. One, a long way back, is crossed out: you went to work.'), tell('You can still find it without looking.')]},
      {when: {flag: 'life:chose-match'}, lines: [tell('A list of Saturdays, in your handwriting now. One, a long way back, is underlined three times.'), tell('You never did work out what it cost.')]},
      {lines: [tell('A list of Saturdays, in your handwriting now. Some of them are underlined twice.')]},
    ]},
  ],

  endings: {
    like: {title: 'The Box', body: 'You asked what you are like, and were told: for ninety minutes a week you are somebody\'s age. Under the bed there is a box that looks like less than it is. On top of the wardrobe there is a shoebox. It can wait. They are good at it.'},
    yes: {title: 'The Box', body: 'You said yes, because it was true of you by six and you saw no reason to pretend. You did not pick them. They were handed to you with both hands. On top of the wardrobe there is a shoebox, and a chair that knows the way.'},
    yours: {title: 'The Box', body: 'You did not pick them, and you would not pick for anybody else. But there is a shoebox on top of the wardrobe, where a chair can reach it. Leaving a thing where it will be found is not the same as handing it over. It is close.'},
  },
}
