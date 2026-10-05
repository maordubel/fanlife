/**
 * Age sixteen — THE AWAY DAY.
 *
 * The universal beat: the first trip without Dad. A kitchen before it is properly morning, a
 * question from Mum that can be answered truthfully or not, a bus full of people who are nobody's
 * father, and a small corner of somebody else's ground that is theirs for an afternoon. The
 * chapter names no opponent and no result: what he brings back is the smaller half of a ticket,
 * and the walk home from the last stop — where somebody is waiting, or nobody is, depending on
 * what was said in the kitchen.
 */
import type {Chapter} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

export const C5_AWAY: Chapter = {
  id: 'c5-away',
  act: 2,
  age: 16,
  title: 'The Away Day',
  kicker: 'Age sixteen · an away day',
  intro: 'Early. The kitchen light is on because nobody has decided yet that it is morning. Your bag has been packed since Thursday. Nobody has asked about the bag.',
  start: {room: 'kitchen', spawn: 'start', time: 'day'},

  names: {stranger: 'Home supporter'},

  cast: [
    {who: 'mum', room: 'kitchen', slot: 'counter', talk: 'mum'},
    {who: 'dad', room: 'bus-stop', slot: 'wait', when: {all: [{flag: 'c5:clapped'}, {flag: 'c5:told'}]}, talk: 'dad'},
    {who: 'dad', room: 'kitchen', slot: 'table', talk: 'dad'},
    {who: 'friend', room: 'away-end', slot: 'left', when: {flag: 'c5:fare'}, talk: 'friend-away'},
    {who: 'friend', room: 'bus-station', slot: 'friend', talk: 'friend'},
    {who: 'driver', room: 'bus-station', slot: 'driver', talk: 'driver'},
    {who: 'elder', room: 'bus-station', slot: 'pillar', talk: 'elder'},
    {who: 'steward', room: 'away-end', slot: 'steward', talk: 'steward'},
    {who: 'stranger', room: 'away-end', slot: 'fence', talk: 'stranger'},
  ],

  doors: [
    {id: 'kitchen-room', room: 'kitchen', door: 'door', to: 'room', spawn: 'fromKitchen', label: 'The living room'},
    {id: 'room-kitchen', room: 'room', door: 'east', to: 'kitchen', spawn: 'fromLiving', label: 'The kitchen'},
    {id: 'room-street', room: 'room', door: 'front', to: 'street', spawn: 'fromHome', label: 'The street', needs: {any: [{flag: 'c5:told'}, {flag: 'c5:lied'}]}, blocked: 'She has heard the bag being picked up. Say something to her first.'},
    {id: 'street-home', room: 'street', door: 'home', to: 'room', spawn: 'fromStreet', label: 'Home'},
    {id: 'street-station', room: 'street', door: 'east', to: 'bus-station', spawn: 'fromStreet', when: {not: 'c5:clapped'}, label: 'The bus station'},
    {id: 'street-stop', room: 'street', door: 'east', to: 'bus-stop', spawn: 'fromStreet', when: {flag: 'c5:clapped'}, label: 'The bus stop'},
    {id: 'station-street', room: 'bus-station', door: 'west', to: 'street', spawn: 'fromEast', label: 'The street home'},
    {id: 'station-bus', room: 'bus-station', door: 'bus', to: 'away-end', spawn: 'start', label: 'The supporters\' bus', needs: {flag: 'c5:fare'}, blocked: 'The driver has a hand across the door. Fare first. In coins, exact.'},
    {id: 'away-out', room: 'away-end', door: 'out', to: 'bus-stop', spawn: 'start', time: 'night', label: 'The way out', needs: {flag: 'c5:clapped'}, blocked: 'Nobody comes two hours on a bus to leave before it starts.'},
    {id: 'stop-street', room: 'bus-stop', door: 'west', to: 'street', spawn: 'fromEast', label: 'The street home'},
  ],

  spots: [
    {id: 'fridge', room: 'kitchen', spot: 'fridge', talk: 'fridge', verb: 'look', label: 'The fridge door'},
    {id: 'bag', room: 'room', spot: 'table', when: {not: 'c5:clapped'}, talk: 'bag', verb: 'look', label: 'Your bag'},
    {id: 'graffiti', room: 'street', spot: 'graffiti', talk: 'graffiti', verb: 'look', label: 'The writing on the wall'},
    {id: 'board', room: 'bus-station', spot: 'board', talk: 'board', verb: 'look', label: 'The departures board'},
    {id: 'pitch', room: 'away-end', spot: 'pitch', talk: 'pitch', verb: 'look', label: 'Their pitch'},
    {id: 'sign', room: 'bus-stop', spot: 'sign', talk: 'sign', verb: 'look', label: 'The timetable'},
  ],

  beats: [
    {id: 'station', room: 'bus-station', talk: 'station-in'},
    {id: 'arrive', room: 'away-end', talk: 'arrive'},
    {id: 'stop', room: 'bus-stop', talk: 'stop-in'},
  ],

  objectives: [
    {id: 'say', t: 'Mum wants to know where you are going. Answer her', done: {any: [{flag: 'c5:told'}, {flag: 'c5:lied'}]}, room: 'kitchen'},
    {id: 'bus', t: '{friend} has the tickets. The driver wants the fare, in coins, exact', done: {flag: 'c5:fare'}, room: 'bus-station'},
    {id: 'noise', t: 'Their place. Find your step and make the noise', done: {flag: 'c5:clapped'}, room: 'away-end'},
    {id: 'stop', t: 'The last stop. See who is under the lamp', done: {any: [{flag: 'c5:home'}, {flag: 'c5:lied'}]}, room: 'bus-stop'},
    {id: 'home', t: 'Home. The kitchen light is on', done: {flag: 'c5:home'}, room: 'kitchen'},
  ],

  talks: [
    {id: 'mum', branches: [
      {when: {all: [{flag: 'c5:clapped'}, {flag: 'c5:lied'}]}, lines: [
        tell('They are both in the kitchen, at this hour, with nothing on the table but the radio.'),
        say('mum', 'There you are. How was {friend}\'s?'),
      ], choices: [
        {id: 'fine', t: 'Fine. Quiet.', then: [flag('c5:last', 'fine')], next: 'last'},
        {id: 'owned', t: 'I was not at {friend}\'s.', then: [flag('c5:last', 'owned')], next: 'last'},
        {id: 'stub', t: 'Put the stub on the table. Say nothing', then: [flag('c5:last', 'stub')], next: 'last'},
      ]},
      {when: {flag: 'c5:clapped'}, lines: [say('mum', 'Your father went out an hour ago. Just passing the stop, he said.'), say('mum', 'Nobody passes that stop. Go and fetch him.')]},
      {when: {flag: 'c5:told'}, lines: [say('mum', 'Coat. Ticket. And sit near the front.')]},
      {when: {flag: 'c5:lied'}, lines: [say('mum', 'Give my love to {friend}\'s mother.'), tell('You check it twice for traps.')]},
      {lines: [
        tell('Mum is at the counter with her back to you, wrapping something in paper.'),
        say('mum', 'You are up. On a day with no school in it.'),
        say('mum', 'Where to?'),
      ], choices: [
        {id: 'tell', t: 'The match. Away. On the supporters\' bus, with {friend}.', then: [flag('c5:told'), bond('mum', 5)], next: 'mum-says'},
        {id: 'lie', t: '{friend}\'s. All day. Probably late.', then: [flag('c5:lied'), flag('life:went-alone')], next: 'mum-says'},
        {id: 'out', t: 'Out.', next: 'mum-says'},
      ]},
    ]},
    {id: 'mum-says', branches: [
      {when: {flag: 'c5:told'}, lines: [
        tell('She stops wrapping. Then she goes on, faster.'),
        say('mum', 'Without your father.'),
        say('me', 'With {friend}. And two hundred other people.'),
        say('mum', 'Two hundred people I have not met.'),
        tell('She holds out the thing in the paper. It was for you all along.'),
        say('mum', 'Tell him yourself. He is right there, pretending the table is interesting.'),
      ]},
      {when: {flag: 'c5:lied'}, lines: [
        say('mum', '{friend}\'s.'),
        tell('She holds out the thing in the paper anyway. It is still warm. You do not look at her while you take it.'),
      ]},
      {lines: [say('mum', 'Out is not a place. It is a direction. Try again.')]},
    ]},
    {id: 'dad', branches: [
      {when: {all: [{flag: 'c5:clapped'}, {flag: 'c5:told'}]}, lines: [
        tell('Dad is under the lamp, studying the timetable like a man who has never seen a bus.'),
        say('dad', 'Oh. It is you. I was just passing.'),
        tell('The stop is the end of the line. There is nothing after it to pass.'),
      ], choices: [
        {id: 'knew', t: 'You were waiting.', then: [flag('c5:last', 'knew')], next: 'last'},
        {id: 'quiet', t: 'It was all right.', then: [flag('c5:last', 'quiet')], next: 'last'},
      ]},
      {when: {flag: 'c5:clapped'}, lines: [tell('Dad is at the table with this morning\'s paper, open at this morning\'s page.'), say('dad', 'Your mother has a question for you.')]},
      {when: {flag: 'c5:dad'}, lines: [tell('He has gone back to the paper. He turns a page he has not read.')]},
      {when: {flag: 'c5:told'}, lines: [
        say('dad', 'I went to my first one without my father. He found out from a neighbour.'),
        tell('He stands up. For a second you think he is going to say he is coming. He picks up his cup instead.'),
        say('dad', 'Stand where the old ones stand. Sing when they sing.'),
        say('dad', 'And I will not be waiting up.'),
      ], then: [flag('c5:dad'), bond('dad', 6)]},
      {when: {flag: 'c5:lied'}, lines: [
        tell('Dad does not put the paper down.'),
        say('dad', 'Take a coat. It gets cold over there. At {friend}\'s.'),
        tell('You look at him. He is reading very hard.'),
      ], then: [flag('c5:dad')]},
      {lines: [say('dad', 'Your mother asked you something. I am furniture until she gets an answer.')]},
    ]},
    {id: 'fridge', branches: [{lines: [tell('The list of Saturdays is still on the fridge door, in his handwriting.'), tell('Lower down there is a second handwriting now. Yours.')]}]},
    {id: 'bag', branches: [
      {when: {all: [{flag: 'c5:lied'}, {has: 'scarf'}]}, lines: [tell('Your bag. The scarf is at the bottom, under a book you are not going to read at {friend}\'s.')]},
      {lines: [tell('Your bag, packed since Thursday. A coat, the fare in coins, and room for whatever comes back.')]},
    ]},
    {id: 'graffiti', branches: [{lines: [tell('{club}, in paint. It was taller than you once.'), tell('Now you are taller than it. Neither of you has moved.')]}]},

    {id: 'station-in', branches: [{lines: [
      tell('The bus station, before it is properly open. One bus has its lights on, and around it are more scarves than you have seen anywhere but {ground}.'),
      tell('Nobody here is anybody\'s father. That is the first thing you notice. The second is that nobody is looking at you at all.'),
    ]}]},
    {id: 'friend', branches: [
      {when: {flag: 'c5:met'}, lines: [say('friend', 'Driver. Fare. Exact money.')]},
      {when: {flag: 'c5:told'}, lines: [
        say('friend', 'You came. What did you tell them?'),
        say('me', 'The truth.'),
        say('friend', 'Brave. I said I was at yours.'),
      ], next: 'tickets'},
      {lines: [
        say('friend', 'You came. What did you tell them?'),
        say('me', 'That I am at yours.'),
        say('friend', 'I said I was at yours. So we are both at each other\'s.'),
      ], next: 'tickets'},
    ]},
    {id: 'tickets', branches: [{lines: [
      tell('{friend} holds up two tickets like a winning hand.'),
      say('friend', 'Yours. The driver takes the fare at the door, in coins, exact.'),
    ], then: [flag('c5:met'), bond('friend', 5)]}]},
    {id: 'elder', branches: [{lines: [
      tell('{elder} is leaning on a pillar with a bag that has been on more of these buses than the driver has.'),
      say('elder', 'First one? You keep checking your ticket.'),
    ]}]},
    {id: 'driver', branches: [
      {when: {flag: 'c5:fare'}, lines: [tell('The driver closes a hand on the coins without looking.'), say('driver', 'On you get. Your friend is holding two seats with one bag, and the bag is losing.')]},
      {when: {flag: 'c5:met'}, lines: [
        tell('The driver has one hand on the door and the other open, palm up.'),
        say('driver', 'Fare. Exact. I do not carry change and I do not carry stories.'),
      ], then: [{e: 'play', game: 'count', id: 'c5-fare', then: [flag('c5:fare')]}], next: 'driver'},
      {lines: [say('driver', 'You with this lot? Then somebody has your ticket. Find them first.')]},
    ]},
    {id: 'board', branches: [{lines: [tell('The departures board. Every town on it is somewhere you have been driven to. Except today\'s.')]}]},

    {id: 'arrive', branches: [{lines: [
      tell('Two hours of road, and then a town that has never heard of you.'),
      tell('Their place. From outside it is only a wall, and a gate at the back with no name on.'),
      tell('One corner of it is yours for an afternoon: a few steps, a rail, a fence, and two hundred people who know the same words.'),
    ]}]},
    {id: 'steward', branches: [
      {when: {flag: 'c5:in'}, lines: [say('steward', 'Enjoy it. Quietly, if you can.')]},
      {lines: [
        tell('The steward tears your ticket along the line without looking, and gives you back the smaller half.'),
        say('steward', 'Away end. From that rail to that fence.'),
        tell('The stub is the size of a stamp. It goes in the pocket with the button.'),
      ], then: [flag('c5:in'), keep('stub')]},
    ]},
    {id: 'stranger', branches: [{lines: [
      tell('Across the fence, an arm\'s length away, somebody in the other colours is looking at your lot the way you look at new neighbours.'),
      say('stranger', 'How far have you lot come for this? I live four minutes away and I nearly stayed in.'),
      say('stranger', 'Sing up, then. It is too quiet in here when it is only us.'),
    ]}]},
    {id: 'pitch', branches: [{lines: [tell('Their pitch. The same size as yours, people say. The lines are the wrong white.')]}]},
    {id: 'friend-away', branches: [
      {when: {flag: 'c5:clapped'}, lines: [
        tell('It ends the way it ends. You will tell it three different ways before the bus has left the car park.'),
        tell('What you keep is the noise: two hundred of you in a corner, making the sound of two thousand.'),
        say('friend', 'Bus. Come on. The driver counts minutes, not heads.'),
      ], then: [{e: 'goto', room: 'bus-stop', spawn: 'start', time: 'night'}]},
      {when: {flag: 'c5:in'}, lines: [
        say('friend', 'Here. Next to me. This step is ours now.'),
        tell('Somewhere behind you somebody starts it: two slow, three quick. Hands come in from every side.'),
        say('friend', 'With them. Not near them.'),
      ], then: [{e: 'play', game: 'clap', id: 'c5-clap', then: [flag('c5:clapped'), flag('life:travelled'), heart(8)]}], next: 'friend-away'},
      {lines: [say('friend', 'Ticket first. The steward wants something to tear.')]},
    ]},

    {id: 'stop-in', branches: [
      {when: {flag: 'c5:told'}, lines: [
        tell('The bus puts you down at the last stop and takes the noise with it.'),
        tell('Night. The lamp, the timetable nobody reads, and under the lamp somebody reading it.'),
      ]},
      {lines: [
        tell('The bus puts you down at the last stop and takes the noise with it.'),
        tell('Night. The lamp, the timetable nobody reads. Nobody under the lamp.'),
        tell('You told them you were somewhere else. You look anyway.'),
      ]},
    ]},
    {id: 'sign', branches: [{lines: [tell('The timetable. The last bus of the day was the one you got off.')]}]},
    {id: 'last', branches: [
      {when: {is: ['c5:last', 'knew']}, lines: [
        say('dad', 'I was passing slowly.'),
        tell('He takes the bag off your shoulder without asking, the way he did when it was a school bag. You let him.'),
      ], then: [bond('dad', 8), flag('c5:home'), {e: 'end', ending: 'met'}]},
      {when: {is: ['c5:last', 'quiet']}, lines: [
        say('dad', 'All right.'),
        tell('You walk home not quite side by side. At the corner he asks whether they sang the one about the bus.'),
        say('me', 'Twice.'),
      ], then: [bond('dad', 4), flag('c5:home'), {e: 'end', ending: 'met'}]},
      {when: {is: ['c5:last', 'owned']}, lines: [
        say('mum', 'No.'),
        tell('Dad folds the paper. It takes him a long time, for one fold.'),
        say('dad', 'We had it on. Every time they went quiet I thought: that is his corner.'),
        say('mum', 'Next time you say it before. Not because we would stop you.'),
      ], then: [bond('mum', 6), bond('dad', 4), flag('c5:home'), {e: 'end', ending: 'owned'}]},
      {when: {is: ['c5:last', 'stub']}, lines: [
        tell('You put the stub on the table between them, the right way up.'),
        tell('Mum looks at it. Dad looks at it for longer.'),
        say('dad', 'Keep that. Somewhere it will not get washed.'),
        say('mum', 'Next time, use words. Before, not after.'),
      ], then: [bond('dad', 6), bond('mum', 3), flag('c5:home'), {e: 'end', ending: 'owned'}]},
      {lines: [
        say('mum', 'Good.'),
        tell('The radio is on the table between them, switched off. Nobody mentions it.'),
        tell('You go to bed with the stub in your fist. They let you.'),
      ], then: [flag('c5:home'), {e: 'end', ending: 'alone'}]},
    ]},
  ],

  endings: {
    met: {title: 'The Away Day', body: 'Two hours there and two hours back, none of it with him. He was at the last stop anyway, just passing, at a stop nobody passes. You will go without him again. He will be just passing again.', keep: 'stub'},
    owned: {title: 'The Away Day', body: 'You went without telling them, and told them after, at the kitchen table. It was harder than the bus. Next time you will say it before. Everybody in that kitchen knew that already.', keep: 'stub'},
    alone: {title: 'The Away Day', body: 'You went, and as far as anybody has said, you were at {friend}\'s. The stub goes in the box, at the bottom. Nobody has asked, and nobody is going to. That is not the same as nobody knowing.', keep: 'stub'},
  },

  keepsakes: [
    {id: 'stub', name: 'The away ticket stub', note: 'The smaller half, torn along the line by a steward who did not look. The first one you went to without him.'},
  ],
}
