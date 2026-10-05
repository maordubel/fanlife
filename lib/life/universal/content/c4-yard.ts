/**
 * Age twelve — THE YARD.
 *
 * The universal beat: the Monday after a bad weekend, when supporting them costs something for
 * the first time. No result is stated, because the yard does not need one: everybody knows, and
 * nobody has to say it. He is asked, by a wall, with people looking, and whatever he answers he
 * is still picked for the break-time game — on the same side as the one who asked. The day ends
 * with a strip of tape round his sleeve and a walk home past the kiosk.
 */
import type {Chapter, Choice} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

/** What can be said by the wall. Only the third answer depends on what is in the bag. */
const answers = (hide: string): Choice[] => [
  {id: 'stand', t: 'Say it out loud: they are yours', then: [flag('c4:answered'), flag('c4:stood'), flag('life:stood-up'), heart(8), bond('rival', -3)], next: 'answer'},
  {id: 'laugh', t: 'Laugh first, before they can', then: [flag('c4:answered'), flag('c4:laughed'), heart(2), bond('rival', 4)], next: 'answer'},
  {id: 'hide', t: hide, then: [flag('c4:answered'), flag('c4:hid'), bond('friend', 3)], next: 'answer'},
]

export const C4_YARD: Chapter = {
  id: 'c4-yard',
  act: 1,
  age: 12,
  title: 'The Yard',
  kicker: 'Age twelve · a Monday',
  intro: 'Monday. Nobody has said anything yet. They do not have to: the weekend got to school before you did, and it is sitting in your chair.',
  start: {room: 'classroom', spawn: 'start', time: 'day'},

  cast: [
    {who: 'teacher', room: 'classroom', slot: 'teacher', talk: 'teacher'},
    {who: 'rival', room: 'schoolyard', slot: 'rival', when: {flag: 'c4:lesson'}, talk: 'rival'},
    {who: 'rival', room: 'classroom', slot: 'front', talk: 'rival-desk'},
    {who: 'friend', room: 'schoolyard', slot: 'friend', when: {flag: 'c4:lesson'}, talk: 'friend'},
    {who: 'friend', room: 'classroom', slot: 'back', talk: 'friend-desk'},
    {who: 'kiosk', room: 'street', slot: 'kiosk', talk: 'kiosk'},
  ],

  doors: [
    {id: 'class-yard', room: 'classroom', door: 'door', to: 'schoolyard', spawn: 'fromClass', label: 'The yard', needs: {flag: 'c4:lesson'}, blocked: 'The bell has not gone. {teacher} can hear a chair move from the far end of the building.'},
    {id: 'yard-class', room: 'schoolyard', door: 'school', to: 'classroom', spawn: 'fromYard', label: 'The classroom'},
    {id: 'yard-street', room: 'schoolyard', door: 'east', to: 'street', spawn: 'fromWest', label: 'The street home', needs: {flag: 'c4:captain'}, blocked: 'The gate is open. It makes no difference. Nobody walks out of a Monday before it is finished.'},
    {id: 'street-yard', room: 'street', door: 'west', to: 'schoolyard', spawn: 'fromStreet', label: 'The school yard'},
  ],

  spots: [
    {id: 'board', room: 'classroom', spot: 'board', talk: 'board', verb: 'look', label: 'The board'},
    {id: 'desk', room: 'classroom', spot: 'desk', talk: 'desk', verb: 'look', label: 'Your desk'},
    {id: 'window', room: 'classroom', spot: 'window', talk: 'window', verb: 'look', label: 'The window'},
    {id: 'teacher-desk', room: 'classroom', spot: 'teacherDesk', talk: 'teacher-desk', verb: 'look', label: 'The teacher\'s desk'},
    {id: 'ball', room: 'schoolyard', spot: 'ball', when: {not: 'c4:ball'}, talk: 'ball', verb: 'take', label: 'The ball'},
    {id: 'wall', room: 'schoolyard', spot: 'wall', talk: 'wall', verb: 'look', label: 'The goal on the wall'},
    {id: 'graffiti', room: 'street', spot: 'graffiti', talk: 'graffiti', verb: 'look', label: 'The writing on the wall'},
  ],

  beats: [
    {id: 'yard', room: 'schoolyard', talk: 'yard-in'},
    {id: 'out', room: 'street', talk: 'street-in'},
  ],

  objectives: [
    {id: 'lesson', t: '{teacher} has asked you something. Find out what', done: {flag: 'c4:lesson'}, room: 'classroom'},
    {id: 'wall', t: 'Break. {rival} is waiting by the wall', done: {flag: 'c4:answered'}, room: 'schoolyard'},
    {id: 'game', t: '{friend} is one short, and the ball is by the hoop', done: {flag: 'c4:played'}, room: 'schoolyard'},
    {id: 'tape', t: 'Somebody is tearing a strip of tape', done: {flag: 'c4:captain'}, room: 'schoolyard'},
    {id: 'home', t: 'Walk home. The way home goes past the kiosk', done: {flag: 'c4:home'}, room: 'street'},
  ],

  talks: [
    {id: 'teacher', branches: [
      {when: {flag: 'c4:captain'}, lines: [
        say('teacher', 'A roll of tape has left my desk. I am not asking who.'),
        tell('{teacher} looks at your sleeve for exactly as long as it takes to decide not to.'),
      ]},
      {when: {flag: 'c4:lesson'}, lines: [say('teacher', 'It is break. Go and stand in some air.'), say('teacher', 'And whatever they say out there: it is a yard. It is not a verdict.')]},
      {lines: [
        tell('{teacher} has asked you something. You know because the room has gone quiet in your direction.'),
        say('me', 'Could you say it again?'),
        say('teacher', 'I have said it twice.'),
        tell('Somebody at the front laughs down their nose. You do not need to look.'),
        say('teacher', 'Bad weekend?'),
        say('me', 'It was all right.'),
        say('teacher', 'It was not. I own a radio.'),
        say('teacher', 'The answer is on the board. Read it out, and the bell will do the rest.'),
      ], then: [flag('c4:lesson'), bond('teacher', 3)]},
    ]},
    {id: 'rival-desk', branches: [{lines: [
      tell('{rival} turns round in the chair, slowly, the way people turn to look at an accident.'),
      say('rival', 'Good weekend?'),
      say('rival', 'Break. By the wall. Bring your face.'),
    ]}]},
    {id: 'friend-desk', branches: [{lines: [say('friend', 'Do not look at {rival}.'), say('friend', 'You looked.')]}]},

    {id: 'board', branches: [{lines: [tell('Somebody has drawn a small figure in the corner of the board, lying flat. It has a scarf on.'), tell('{teacher} has been teaching around it all morning.')]}]},
    {id: 'desk', branches: [{lines: [tell('Your desk. Your bag is under it, packed on Sunday night out of habit, colours and all.'), tell('You look at it. You leave it shut.')]}]},
    {id: 'window', branches: [{lines: [tell('From here you can see the yard, and the goal somebody painted on the wall before you were born.'), tell('It has never had a net. It has never needed one.')]}]},
    {id: 'teacher-desk', branches: [
      {when: {flag: 'c4:lesson'}, lines: [tell('A register and a cup. There is a clean ring in the dust where a roll of tape used to live.')]},
      {lines: [tell('A register, a cup, and a roll of tape with its end folded back.')]},
    ]},

    {id: 'yard-in', branches: [{lines: [
      tell('The yard. Forty games going on at once, and none of them yours yet.'),
      tell('{rival} is by the wall with three others. All four have seen you. None of them has waved.'),
    ]}]},
    {id: 'rival', branches: [
      {when: {flag: 'c4:captain'}, lines: [say('rival', 'I still hope you lose on Saturday.'), tell('You know where you are with {rival}. It is not a bad place.')]},
      {when: {flag: 'c4:played'}, lines: [say('rival', 'You are not as bad as your team.'), tell('From {rival}, on a Monday, that is a bunch of flowers.')]},
      {when: {flag: 'c4:stood'}, lines: [say('rival', 'All right. I was only asking.'), tell('{rival} was not only asking.')]},
      {when: {flag: 'c4:laughed'}, lines: [say('rival', 'See, you can take it. Most of your lot cannot.')]},
      {when: {flag: 'c4:answered'}, lines: [tell('{rival} has already turned back to the others. You were a shorter game than expected.')]},
      {lines: [
        say('rival', 'There you are. I thought you might be off sick. I would be.'),
        tell('The three others laugh on the beat. It was probably rehearsed.'),
        say('rival', 'Did you listen to all of it? Or did your dad turn it off?'),
      ], next: 'bag'},
    ]},
    {id: 'bag', branches: [
      {when: {has: 'scarf'}, lines: [
        tell('{rival} nods at your bag. One end of the scarf is hanging out of it, like a tongue.'),
        say('rival', 'You brought it. Today. That is either brave or stupid.'),
      ], choices: answers('Say nothing. Push the scarf down into the bag')},
      {lines: [
        tell('{rival} nods at your bag. The badge of {club} is on the flap, in pen.'),
        say('rival', 'Still got that on there. Today. That is either brave or stupid.'),
      ], choices: answers('Say nothing. Turn the bag to face the wall')},
    ]},
    {id: 'answer', branches: [
      {when: {flag: 'c4:stood'}, lines: [
        say('me', 'It is neither. They were mine on Friday and they are mine today.'),
        tell('It comes out louder than you meant. Half the yard has turned round. You notice every one of them.'),
        say('rival', 'Nobody said they were not.'),
      ]},
      {when: {flag: 'c4:laughed'}, lines: [
        say('me', 'You should have seen my dad. He apologised to the radio.'),
        tell('They laugh. Properly this time, with you inside it and not at the edge.'),
        tell('It costs something small. You will not find out what until later.'),
      ]},
      {lines: [
        say('rival', 'Thought so.'),
        tell('Nobody says anything else. That is the worst of it: it worked.'),
        tell('{friend} has seen, from across the yard. {friend} looks at the ground instead.'),
      ]},
    ]},

    {id: 'friend', branches: [
      {when: {flag: 'c4:captain'}, lines: [say('friend', 'Captain.'), tell('{friend} says it the way you say it to somebody who has just been handed a hat.')]},
      {when: {flag: 'c4:played'}, lines: [tell('{friend} has a roll of tape in one hand.'), say('friend', 'Arm. Hold still.')], next: 'tape'},
      {when: {all: [{flag: 'c4:answered'}, {flag: 'c4:ball'}]}, lines: [
        tell('{friend} bounces the ball once, to see whether it is still a ball.'),
        say('friend', 'Sides. You and me, and whoever is left.'),
        tell('Whoever is left turns out to be {rival}. There are nine of you, and that is how nine divides.'),
        say('rival', 'Do not pass to me, then.'),
        say('friend', 'Keep-ups for first kick. The whole side. It does not touch the ground.'),
      ], then: [{e: 'play', game: 'carry', id: 'c4-keepup', then: [flag('c4:played')]}], next: 'kept'},
      {when: {flag: 'c4:answered'}, lines: [say('friend', 'We are one short. And the ball is over by the hoop, where the little ones left it.'), say('friend', 'Fetch it and you are on my side.')]},
      {lines: [say('friend', '{rival} is waiting by the wall. I could come with you.'), say('friend', 'No. You are right. That is worse.')]},
    ]},
    {id: 'ball', branches: [
      {when: {flag: 'c4:answered'}, lines: [tell('The ball. It has been kicked against so many walls that it is nearly a different shape.'), tell('You put it under your arm. It is the first thing today that is simply on your side.')], then: [flag('c4:ball')]},
      {lines: [tell('A ball, by the hoop, belonging to nobody for the moment.'), tell('Not yet. Somebody is waiting for you by the wall.')]},
    ]},
    {id: 'kept', branches: [{lines: [
      tell('The ball stays up. Nine, ten, eleven — you knock it to {rival} without thinking, and {rival} knocks it back without thinking.'),
      tell('It is the first thing either of you has done all day without thinking.'),
      tell('{friend} takes a roll of tape out of a pocket. You have seen that roll before, on a desk.'),
    ], next: 'tape'}]},
    {id: 'tape', branches: [
      {when: {flag: 'c4:stood'}, lines: [
        say('friend', 'We need a captain. Somebody loud.'),
        say('rival', 'That one. Loud since the bell.'),
        tell('The strip goes twice round your sleeve. It is too tight. You do not say so.'),
      ], then: [flag('c4:captain'), keep('armband'), heart(6), bond('friend', 4), bond('rival', 6)]},
      {when: {flag: 'c4:laughed'}, lines: [
        say('friend', 'We need a captain. Somebody both sides will listen to.'),
        tell('Everybody looks at you. {rival} looks as well, and does not object.'),
        tell('The strip goes twice round your sleeve. It is too tight. You do not say so.'),
      ], then: [flag('c4:captain'), keep('armband'), heart(6), bond('friend', 4), bond('rival', 2)]},
      {lines: [
        say('friend', 'We need a captain.'),
        tell('{friend} does not look round the group. {friend} looks at you.'),
        tell('The strip goes twice round your sleeve. Whatever {friend} saw by the wall, this is all that will ever be said about it.'),
      ], then: [flag('c4:captain'), keep('armband'), heart(6), bond('friend', 8)]},
    ]},
    {id: 'wall', branches: [{lines: [tell('The goal on the wall. Painted once, long ago, and gone over in chalk every term since.'), tell('The crossbar is lower than it used to be. Or you are taller.')]}]},

    {id: 'street-in', branches: [{lines: [
      tell('School lets go of you at the usual time. The tape is still on your sleeve. You have checked.'),
      tell('This morning you came down this street looking at your shoes.'),
    ]}]},
    {id: 'graffiti', branches: [{lines: [tell('{club}, in paint, taller than you are. Somebody did it at night, years ago.'), tell('Since Saturday somebody has added one word underneath, in pen. It is not a kind one.')]}]},
    {id: 'kiosk', branches: [{lines: [
      tell('{kiosk} is leaning on the counter with the radio off. On a Monday like this one the radio stays off.'),
      say('kiosk', 'Bad one.'),
      say('me', 'Yes.'),
      say('kiosk', 'I have had worse. I have had worse inside one month.'),
      tell('He sees the tape. He looks at it the way he looks at a coin he does not recognise.'),
      say('kiosk', 'Captain of what?'),
      say('me', 'Break.'),
      say('kiosk', 'It is a start. Same time Saturday?'),
    ], next: 'home'}]},
    {id: 'home', branches: [
      {when: {flag: 'c4:stood'}, lines: [
        say('me', 'Same time Saturday.'),
        tell('You say it loud enough for the whole street. The street does not mind.'),
      ], then: [flag('c4:home'), {e: 'end', ending: 'loud'}]},
      {when: {flag: 'c4:laughed'}, lines: [
        say('me', 'If Dad lets the radio back into the house.'),
        say('kiosk', 'He will. They always do.'),
      ], then: [flag('c4:home'), {e: 'end', ending: 'light'}]},
      {lines: [
        tell('You stop at the counter and put the colours back where the street can see them.'),
        say('me', 'Same time Saturday.'),
        say('kiosk', 'I never doubted it.'),
        tell('You did. For one break. That is yours to know.'),
      ], then: [flag('c4:home'), {e: 'end', ending: 'quiet'}]},
    ]},
  ],

  endings: {
    loud: {title: 'The Yard', body: 'It cost something, for the first time: one break, by a wall, with half the school looking. You paid out loud. They may well lose again on Saturday, and on Monday you will be asked again, and now you know what you will say.', keep: 'armband'},
    light: {title: 'The Yard', body: 'It cost something, for the first time, and you paid in a joke. It was a good joke. Tomorrow {rival} will sit next to you and lend you a pen. You are not sure yet what you sold.', keep: 'armband'},
    quiet: {title: 'The Yard', body: 'It cost something, for the first time, and for one break you did not pay. {rival} had forgotten by the bell. {friend} had not, and gave you a captaincy instead of a look. You know which wall the colours went away at.', keep: 'armband'},
  },

  keepsakes: [
    {id: 'armband', name: 'The strip of tape', note: 'Wound twice round a sleeve, above the elbow, too tight. Captain of one break, on the Monday after a bad weekend.'},
  ],
}
