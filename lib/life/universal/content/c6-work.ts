/**
 * Age twenty-one — WORK SATURDAY.
 *
 * The universal beat: the first time the shift and the match are the same afternoon. Nobody is
 * in the wrong. The boss has an order going out on Monday, the workmate asked a month ago, and
 * the supporter was waiting for a good moment that never came. Three ways through — ask straight
 * and pay with a Sunday, stay and hear it through the workshop radio, or take the workmate's
 * afternoon and owe him one — and none of them is the right one. The match has no opponent and
 * no score: only a voice that walks, or runs.
 */
import type {Chapter} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

export const C6_WORK: Chapter = {
  id: 'c6-work',
  act: 2,
  age: 21,
  title: 'Work Saturday',
  kicker: 'Age twenty-one · a Saturday',
  intro: 'Saturday. Sixty brackets on the bench, due Monday. Kick-off at three. You have known both of these things for a month, and this morning you introduced them to each other.',
  start: {room: 'workshop', spawn: 'start', time: 'day'},

  cast: [
    {who: 'boss', room: 'workshop', slot: 'boss', talk: 'boss'},
    {who: 'mate', room: 'terrace', slot: 'left', when: {all: [{flag: 'c6:gone'}, {flag: 'c6:asked'}]}, talk: 'stand'},
    // on the afternoon he stays, the workmate is at the match from the door closing until the light goes
    {who: 'mate', room: 'workshop', slot: 'mate', when: {none: [{all: [{flag: 'c6:stayed'}, {flag: 'c6:carried'}, {not: 'c6:heard'}]}]}, talk: 'mate'},
    {who: 'elder', room: 'terrace', slot: 'fence', talk: 'stand'},
  ],

  doors: [
    {id: 'out', room: 'workshop', door: 'door', to: 'street', spawn: 'fromHome', label: 'The street', needs: {flag: 'c6:gone'}, blocked: 'The street is on the other side of it. So is three o\'clock. You still have the apron on.'},
  ],

  spots: [
    {id: 'tools', room: 'workshop', spot: 'tools', talk: 'tools', verb: 'use', label: 'Your bench'},
    {id: 'banner', room: 'workshop', spot: 'banner', when: {not: 'c6:carried'}, talk: 'banner', verb: 'look', label: 'The sheet on the floor'},
    {id: 'floor', room: 'workshop', spot: 'banner', when: {flag: 'c6:carried'}, talk: 'banner', verb: 'look', label: 'Where the sheet was'},
    {id: 'cans', room: 'workshop', spot: 'cans', talk: 'cans', verb: 'take', label: 'The tins'},
    {id: 'ladder', room: 'workshop', spot: 'ladder', talk: 'ladder', verb: 'look', label: 'The ladder'},
    {id: 'radio', room: 'workshop', spot: 'radio', talk: 'radio', verb: 'listen', label: 'The radio on the shelf'},
    {id: 'fence', room: 'terrace', spot: 'banner', talk: 'stand', verb: 'use', label: 'The banner'},
  ],

  beats: [
    {id: 'listen', room: 'workshop', when: {all: [{flag: 'c6:tuned'}, {not: 'c6:heard'}]}, talk: 'listen'},
  ],

  objectives: [
    {id: 'mate', t: '{mate} is pointing a brush at you', done: {flag: 'c6:mate'}, room: 'workshop'},
    {id: 'work', t: 'Sixty brackets, boxed, before you say anything', done: {flag: 'c6:worked'}, room: 'workshop'},
    {id: 'boss', t: '{boss} is at the order book. Say it, or do not', done: {any: [{flag: 'c6:asked'}, {flag: 'c6:stayed'}, {flag: 'c6:swapped'}]}, room: 'workshop'},
    {id: 'carry', t: 'The paint is still wet. {mate} needs a second pair of hands', done: {flag: 'c6:carried'}, room: 'workshop'},
    {id: 'three', t: 'Three o\'clock, wherever you are standing', done: {flag: 'c6:done'}},
  ],

  talks: [
    {id: 'mate', branches: [
      {when: {flag: 'c6:heard'}, lines: [tell('{mate} is in the doorway, with the banner rolled under one arm.')], next: 'back'},
      {when: {flag: 'c6:carried'}, lines: [say('mate', 'Go on, then. Kick-off is not getting any later.')], next: 'leave'},
      {when: {flag: 'c6:asked'}, lines: [
        say('mate', 'He said yes. I saw the pencil move. Sunday will be terrible.'),
        say('mate', 'Now. This has to be on the fence before the gates open, and I have two hands.'),
      ], next: 'carry'},
      {when: {flag: 'c6:swapped'}, lines: [
        tell('He has put his apron back on. He is tying it very thoroughly.'),
        say('mate', 'Do not thank me. I mean it.'),
        say('mate', 'Behind the goal, left of the steps. {elder} knows where. I will get it as far as the door.'),
      ], next: 'carry'},
      {when: {flag: 'c6:stayed'}, lines: [
        say('mate', 'Right.'),
        tell('He waits, to see if there is more. There is not.'),
        say('mate', 'Then help me get it to the door, at least.'),
      ], next: 'carry'},
      {when: {all: [{flag: 'c6:mate'}, {flag: 'c6:worked'}]}, lines: [say('mate', 'Sixty? Then go on.')]},
      {when: {flag: 'c6:mate'}, lines: [say('mate', 'Batch first. He is easier to talk to when the count is right.')]},
      {lines: [
        tell('He is on his knees over a bedsheet, painting a letter as tall as his forearm. He points the brush at you without looking up.'),
        say('mate', 'Three o\'clock.'),
        say('me', 'I know.'),
        say('mate', 'I asked him a month ago. He wrote it on the calendar. In pen.'),
        say('me', 'I was waiting for a good moment.'),
        tell('There has not been a good moment. There has been a month.'),
        say('mate', 'So ask him. Straight. It is good moments he cannot stand.'),
        say('mate', 'Or take mine. I am saying that once, and I am saying it to the sheet.'),
      ], then: [flag('c6:mate')]},
    ]},
    {id: 'carry', branches: [{lines: [
      say('mate', 'Hold this.'),
      tell('He gives you the brush. It is the colour all the way down to the handle, and so, now, is your thumb.'),
      say('mate', 'Your end. Flat. If it folds, the letters kiss each other and we are carrying a mirror.'),
    ], then: [{e: 'play', game: 'carry', id: 'c6-banner', then: [flag('c6:carried'), keep('brush'), heart(5), bond('mate', 3)]}], next: 'leave'}]},

    {id: 'leave', branches: [
      {when: {flag: 'c6:asked'}, lines: [
        tell('You go out sideways, one at each end, like men moving a pane of glass. {boss} holds the door with his foot and reads the lettering, not you.'),
        say('boss', 'Crooked. The second word.'),
        say('mate', 'It is hand-made.'),
        say('boss', 'I can see that.'),
      ], then: [flag('c6:gone'), {e: 'goto', room: 'terrace', spawn: 'fromTunnel', time: 'day'}], next: 'stand'},
      {when: {flag: 'c6:swapped'}, lines: [
        tell('At the door {mate} lets go, a finger at a time. You roll it, paint outwards, onto your shoulder.'),
        tell('When you look back he is at your bench, counting your brackets as if they had always been his.'),
      ], then: [flag('c6:gone'), {e: 'goto', room: 'terrace', spawn: 'fromTunnel', time: 'day'}], next: 'stand'},
      {lines: [
        tell('At the door he takes the whole of it onto his shoulder and goes off like a man carrying a ladder through a crowd that has not arrived yet.'),
        tell('You still have his brush. The door swings shut. The workshop gets larger.'),
      ]},
    ]},

    {id: 'stand', branches: [
      {when: {flag: 'c6:asked'}, lines: [
        tell('The fence behind the goal. {mate} ties his end with a knot of his own invention.'),
        tell('{elder} reads the banner from left to right, moving his lips, and then from right to left, in case.'),
        say('elder', 'The paint is wet.'),
        say('mate', 'It is fresh.'),
        say('elder', 'It is on my sleeve.'),
        tell('Somewhere behind you is a bench with your name on its Sunday. In front of you the teams are walking out, and the banner lifts once and settles.'),
      ], then: [flag('c6:done'), heart(6), {e: 'sound', cue: 'roar'}, {e: 'end', ending: 'stand'}]},
      {lines: [
        tell('The fence behind the goal. You are holding one end of a banner and have no plan for the other.'),
        say('elder', 'That is {mate}\'s hand. He always makes the second word too big.'),
        say('me', 'He is working.'),
        say('elder', 'Is he.'),
        tell('He hooks his stick over the rail and takes the other end. His knot is older than {mate}\'s, and better.'),
        say('elder', 'Then you shout for two. He will ask me on Monday whether you did.'),
      ], then: [flag('c6:done'), heart(4), bond('elder', 4), {e: 'sound', cue: 'roar'}, {e: 'end', ending: 'owed'}]},
    ]},

    {id: 'boss', branches: [
      {when: {flag: 'c6:heard'}, lines: [say('boss', 'Lock up after him.')]},
      {when: {all: [{flag: 'c6:stayed'}, {flag: 'c6:carried'}]}, lines: [say('boss', 'The radio is on the shelf. Not loud.')]},
      {when: {any: [{flag: 'c6:asked'}, {flag: 'c6:swapped'}, {flag: 'c6:stayed'}]}, lines: [say('boss', 'That is settled. I only settle a thing once.')]},
      {when: {all: [{flag: 'c6:worked'}, {flag: 'c6:mate'}]}, lines: [
        tell('{boss} is at the order book, with one pencil behind his ear and another in his hand. He has forgotten the first.'),
        say('boss', 'Count?'),
        say('me', 'Sixty. Boxed.'),
        say('boss', 'Good. The long ones after lunch. They collect on Monday. All of it or none of it.'),
        tell('He waits. He can tell when a sentence is standing behind somebody\'s teeth.'),
        say('boss', 'Something?'),
      ], choices: [
        {id: 'ask', t: 'I need this afternoon. You can have my Sunday.', then: [flag('c6:asked'), flag('life:chose-match'), bond('boss', 4), heart(4)], next: 'boss-ask'},
        {id: 'stay', t: 'No. Where are the long ones?', then: [flag('c6:stayed'), flag('life:chose-work'), bond('boss', 3)], next: 'boss-stay'},
        {id: 'swap', t: '{mate} says he will take my afternoon.', then: [flag('c6:swapped'), flag('life:chose-match'), bond('mate', -8), heart(2)], next: 'boss-swap'},
      ]},
      {when: {flag: 'c6:worked'}, lines: [say('boss', 'Good. Now see what he wants. That brush drips.')]},
      {lines: [say('boss', 'Sixty on the bench. Talk to me when they are in boxes.')]},
    ]},
    {id: 'boss-ask', branches: [{lines: [
      tell('He looks at the calendar by the door, where {mate}\'s afternoon is already written, in pen.'),
      say('boss', 'One of you I planned for.'),
      say('boss', 'Sunday. Eight, not nine. The long ones, and you sweep.'),
      tell('He writes it in the Sunday square, and presses hard enough to mark Monday.'),
    ]}]},
    {id: 'boss-stay', branches: [{lines: [
      say('boss', 'Under the bench. Chalk mark on the ends.'),
      tell('He goes back to the book. It was the easiest thing you have said all month.'),
      tell('Across the floor {mate} has stopped painting. Then he starts again.'),
    ]}]},
    {id: 'boss-swap', branches: [{lines: [
      say('boss', 'Does he.'),
      tell('{boss} looks across the floor. {mate} nods, at the banner, not at you.'),
      tell('He crosses one name out of the Saturday square and writes the other. It takes him a moment. It took {mate} a month.'),
    ]}]},

    {id: 'tools', branches: [
      {when: {flag: 'c6:worked'}, lines: [tell('Sixty brackets in six boxes. Your thumbprint is on every one, in filings.')]},
      {lines: [
        tell('Drill, turn, file, blow, box. Sixty times. The file has a groove where the last person\'s thumb went, and yours goes there too.'),
        tell('Somewhere around forty you notice that you are counting them in minutes.'),
      ], then: [flag('c6:worked')]},
    ]},
    {id: 'cans', branches: [
      {when: {all: [{flag: 'c6:mate'}, {not: 'c6:can'}, {not: 'c6:carried'}]}, lines: [
        tell('A shelf of undercoat, and one tin that is not. {club}\'s colour has run down its side and set there like wax.'),
        tell('You carry it across to {mate}. He takes it without looking, the way you take a cup from somebody you live with.'),
      ], then: [flag('c6:can'), bond('mate', 3)]},
      {lines: [tell('Tins of the undercoat that everything in here gets painted, sooner or later.')]},
    ]},
    {id: 'banner', branches: [
      {when: {flag: 'c6:carried'}, lines: [tell('A clean rectangle on the floor, edged in the colour. {boss} will find it on Monday. He will mention it on Tuesday.')]},
      {lines: [
        tell('A bedsheet, two brooms long. The letters are {club}\'s colour and still shining.'),
        tell('The second word is bigger than the first. {mate} calls that emphasis.'),
      ]},
    ]},
    {id: 'ladder', branches: [
      {when: {has: 'scarf'}, lines: [tell('The ladder nobody trusts above the fourth rung. Your scarf hangs from the top, out of the dust, in case.')]},
      {lines: [tell('The ladder nobody trusts above the fourth rung. Your jacket hangs from the top. You brought the good one, on a working Saturday.')]},
    ]},
    {id: 'radio', branches: [
      {when: {flag: 'c6:heard'}, lines: [tell('The radio is off. It is still warm on top.')]},
      {when: {flag: 'c6:tuned'}, lines: [tell('The voice is still going.')], next: 'listen'},
      {when: {all: [{flag: 'c6:stayed'}, {flag: 'c6:carried'}]}, lines: [
        tell('You wipe your hands. The dial is stiff, and the good station is a hair to the left of where it says it is.'),
      ], then: [{e: 'play', game: 'tune', id: 'c6-radio', then: [flag('c6:tuned')]}]},
      {lines: [tell('{boss}\'s radio, on a station where people talk about roads.')]},
    ]},

    {id: 'listen', branches: [
      {when: {flag: 'c6:loud'}, lines: [
        say('boss', 'Not loud, I said.'),
        tell('He says it to the bracket, once.'),
        tell('The voice runs, and breaks. From in here you cannot tell into what. A moment later the same sound comes down the street from {ground}, like its own echo.'),
      ], then: [flag('c6:heard'), {e: 'sound', cue: 'roar'}, {e: 'time', to: 'night'}], next: 'back'},
      {when: {flag: 'c6:kept'}, lines: [
        tell('You file to the voice. Long strokes while it walks, short ones when it runs.'),
        tell('It breaks. From in here you cannot tell into what. {boss} picks up your bracket, thinner now than the drawing, and puts it in the box with the others.'),
      ], then: [flag('c6:heard'), {e: 'sound', cue: 'murmur'}, {e: 'time', to: 'night'}], next: 'back'},
      {lines: [
        tell('Static. Then a voice, low, walking. Somebody else has the ball.'),
        tell('You drill. The voice walks. You file. Then it starts to run.'),
        tell('Behind you the grinder winds down. {boss} has switched it off, and is examining a bracket very closely.'),
      ], choices: [
        {id: 'loud', t: 'Turn it up', then: [flag('c6:loud'), heart(6)], next: 'listen'},
        {id: 'kept', t: 'Keep filing', then: [flag('c6:kept'), bond('boss', 4)], next: 'listen'},
      ]},
    ]},
    {id: 'back', branches: [{lines: [
      tell('The light in the window goes thin, and then goes. {boss} counts the long ones twice and gets the same number.'),
      tell('Then the door, and {mate}, with the banner under one arm and no voice left.'),
      say('mate', 'You heard?'),
      say('me', 'I heard him. I could not tell you what happened.'),
      say('mate', 'Neither could I, and I was there.'),
      say('mate', 'Keep the brush. Next one, you are doing the second word.'),
    ], then: [flag('c6:done'), heart(4), {e: 'end', ending: 'shift'}]}]},
  ],

  endings: {
    stand: {title: 'Work Saturday', body: 'You asked. It cost a Sunday and one sentence, a month in the saying. You will not remember what they did that afternoon. You will remember carrying wet paint sideways through a door your boss held open with his foot.', keep: 'brush'},
    owed: {title: 'Work Saturday', body: 'You went, and {mate} did not. On Monday he will ask {elder} whether you shouted, and he will ask you nothing at all. You owe a man an afternoon, and there is no bench where that can be filed down.', keep: 'brush'},
    shift: {title: 'Work Saturday', body: 'You stayed. The order went out whole on Monday and nobody thanked you, because that is what an order is. You could not say what happened in that match. You could say exactly when the voice began to run, and that the grinder stopped.', keep: 'brush'},
  },

  keepsakes: [
    {id: 'brush', name: '{mate}\'s brush', note: 'The colour all the way down to the handle. He said hold this, and never asked for it back.'},
  ],
}
