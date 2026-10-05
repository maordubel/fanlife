/**
 * Age thirty-five — THE BACK ROOM.
 *
 * The universal beat: the night the club needs its supporters for something that is not
 * shouting. A workshop that smells of paint, a folding table, a sheet that goes round the room,
 * and a tin. Nobody is asked for a speech and nobody is asked for a fortune: the organiser
 * wants chairs set out, a name written in a column, and one person each to bring somebody
 * else. No reason is given for the meeting, because every club has had its own, and no sum of
 * money is named. Three ways to be useful, and the room still fills.
 */
import type {Chapter} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

export const C7A_MEETING: Chapter = {
  id: 'c7a-meeting',
  act: 3,
  age: 35,
  title: 'The Back Room',
  kicker: 'Age thirty-five · folding chairs',
  intro: 'The text said seven, the back room, bring nothing. It did not say why. It did not have to: you read it standing in the street, and your feet had already started walking.',
  start: {room: 'workshop', spawn: 'start', time: 'night'},

  names: {boss: 'Organiser', mate: 'Old hand'},

  cast: [
    {who: 'boss', room: 'workshop', slot: 'boss', talk: 'boss'},
    {who: 'mate', room: 'workshop', slot: 'mate', talk: 'mate'},
  ],

  doors: [],

  spots: [
    {id: 'chairs', room: 'workshop', spot: 'ladder', when: {not: 'c7a:chairs'}, talk: 'chairs', verb: 'take', label: 'The stack of chairs'},
    {id: 'rows', room: 'workshop', spot: 'ladder', when: {flag: 'c7a:chairs'}, talk: 'rows', verb: 'look', label: 'The rows'},
    {id: 'sheet', room: 'workshop', spot: 'tools', talk: 'sheet', verb: 'use', label: 'The sheet'},
    {id: 'tin', room: 'workshop', spot: 'cans', talk: 'tin', verb: 'look', label: 'The tin'},
    {id: 'banner', room: 'workshop', spot: 'banner', talk: 'banner', verb: 'look', label: 'The banner'},
    {id: 'radio', room: 'workshop', spot: 'radio', talk: 'radio', verb: 'listen', label: 'The radio'},
  ],

  beats: [
    {id: 'doors', room: 'workshop', when: {all: [{flag: 'c7a:chairs'}, {flag: 'c7a:signed'}]}, talk: 'filling'},
  ],

  objectives: [
    {id: 'chairs', t: 'Chairs. Somebody has to set them out', done: {flag: 'c7a:chairs'}, room: 'workshop'},
    {id: 'sheet', t: 'A sheet is going round. It wants a name and nothing else', done: {flag: 'c7a:signed'}, room: 'workshop'},
    {id: 'ask', t: 'The organiser wants one more thing from everyone', done: {flag: 'c7a:asked'}, room: 'workshop'},
    {id: 'night', t: 'The room is filling. Stay for it', done: {flag: 'c7a:done'}, room: 'workshop'},
  ],

  talks: [
    {id: 'chairs', branches: [{lines: [
      tell('Folding chairs, in stacks of ten, still warm from the van that brought them. Somebody has numbered the stacks in marker, and then crossed the numbers out.'),
      tell('You carry them in fours. By the third trip your arms have forgotten what else they were doing today.'),
    ], then: [{e: 'play', game: 'carry', id: 'c7a-chairs', then: [flag('c7a:chairs'), heart(3)]}]}]},
    {id: 'rows', branches: [{lines: [tell('Five rows, slightly bent in the middle where the floor dips. Nobody has set out a front row. Nobody wants to be the first to sit in it.')]}]},
    {id: 'sheet', branches: [
      {when: {flag: 'c7a:signed'}, lines: [tell('Your name, in a column of names, in your own hand, between two you do not know. Neither has put a surname. Neither is going to.')]},
      {lines: [
        tell('A clipboard, a pen on a string, and a column that goes right to the bottom of the page and carries on onto the back.'),
        tell('Nobody has written what it is for. You write your name, and then, because it seems right, the street you grew up on.'),
      ], then: [flag('c7a:signed'), heart(4), bond('boss', 2)]},
    ]},
    {id: 'tin', branches: [{lines: [tell('A biscuit tin, with a slot cut in the lid by somebody in a hurry. It has been shaken, and it has not been opened.')]}]},
    {id: 'banner', branches: [{lines: [tell('The banner from the old days is folded over the back of a chair. Somebody has put it there so it is the first thing you see when you come in, and so it is nobody\'s job to unfold it.')]}]},
    {id: 'radio', branches: [{lines: [tell('Somebody has the radio on very low. It is the sound of an ordinary evening somewhere else, going on without any of you.')]}]},

    {id: 'boss', branches: [
      {when: {flag: 'c7a:done'}, lines: [say('boss', 'Thank you. For being one of them.')]},
      {when: {all: [{flag: 'c7a:asked'}, {flag: 'c7a:ready'}]}, lines: [say('boss', 'There. Look at it. That is what a room is.'), tell('{boss} says it very quietly, as though the chairs might hear.')], next: 'night'},
      {when: {flag: 'c7a:asked'}, lines: [say('boss', 'Go and find your person. The room is nearly full.')]},
      {when: {all: [{flag: 'c7a:chairs'}, {flag: 'c7a:signed'}]}, lines: [
        say('boss', 'Chairs, and a name. That is already more than I expected.'),
        say('boss', 'One last thing, and it is not money. Everybody who comes tonight brings somebody next time. A friend. A cousin. A neighbour who has never been.'),
        say('boss', 'Who are you bringing?'),
      ], choices: [
        {id: 'mate', t: 'Name the old hand. He owes you', then: [flag('c7a:asked'), flag('c7a:bring-mate'), bond('mate', 5)], next: 'ask-done'},
        {id: 'child', t: 'Say you will bring your own, when she is old enough to be bored', then: [flag('c7a:asked'), flag('c7a:bring-child'), heart(6)], next: 'ask-done'},
        {id: 'self', t: 'Say you will bring yourself, again, until somebody else shows up', then: [flag('c7a:asked'), flag('c7a:bring-self'), heart(3)], next: 'ask-done'},
      ]},
      {lines: [
        tell('{boss} is walking up and down the line of chairs, with a clipboard and the face of somebody who has been asked to be calm.'),
        say('boss', 'You came. Good. Chairs first. Then a name on the sheet. I will find you after.'),
      ]},
    ]},
    {id: 'ask-done', branches: [{lines: [say('boss', 'Write it on the back of your hand. People forget.'), tell('{boss} writes it on the back of his own, as an example, and then smiles at it as though it were somebody else\'s.')]}]},
    {id: 'mate', branches: [
      {when: {flag: 'c7a:bring-mate'}, lines: [say('mate', 'You have told her it is me, haven\'t you. It is always me.')]},
      {lines: [
        tell('{mate} is sitting in the back row of a room with no front row, with his coat on and his arms folded.'),
        say('mate', 'I have been to six of these. They did not fix it. They did not break it either.'),
        say('mate', 'But I always come. You know why?'),
        say('me', 'Because of the chairs.'),
        say('mate', 'Because of the chairs.'),
      ]},
    ]},
    {id: 'filling', branches: [{lines: [
      tell('The door goes. Then it goes again, and keeps going. A man you have not seen since the last time. A woman with a child on her hip. Two teenagers in the club\'s colours, who have the wrong idea about what this is and the right idea about why they came.'),
      tell('The chairs fill from the back. It is always the back first.'),
    ], then: [flag('c7a:ready')]}]},
    {id: 'night', branches: [
      {when: {flag: 'c7a:bring-mate'}, lines: [tell('You look round. {mate} has moved up a row. Nobody else has noticed.')], then: [flag('c7a:done'), keep('sheet'), {e: 'end', ending: 'mate'}]},
      {when: {flag: 'c7a:bring-child'}, lines: [tell('You think of a small person in the club\'s colours, bored on a folding chair, being told that this is how it is done.')], then: [flag('c7a:done'), keep('sheet'), {e: 'end', ending: 'child'}]},
      {lines: [tell('There is a chair next to you with nobody on it. Somebody will come. They always do, in the end.')], then: [flag('c7a:done'), keep('sheet'), {e: 'end', ending: 'self'}]},
    ]},
  ],

  endings: {
    mate: {title: 'The Back Room', body: 'Chairs, a name, and an old friend moved up one row. The meeting was ordinary and long, and nothing was announced that anybody would remember. But the room was full, and a full room is not nothing.', keep: 'sheet'},
    child: {title: 'The Back Room', body: 'Chairs, a name, and a promise to a person who does not exist yet. You will not be able to explain what it was for. You will bring her anyway, and she will be bored, and one day she will do the same for somebody else.', keep: 'sheet'},
    self: {title: 'The Back Room', body: 'Chairs, a name, and an empty seat next to you. Somebody sat in it before the end. You are not sure who. They never asked what the meeting was for either.', keep: 'sheet'},
  },

  keepsakes: [
    {id: 'sheet', name: 'The sheet', note: 'A clipboard page with a column of names, one of them yours, and no surnames. It was never filed anywhere. It was just kept.'},
  ],
}
