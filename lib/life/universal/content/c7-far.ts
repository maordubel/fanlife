/**
 * Age thirty — FAR.
 *
 * The universal beat: living a long way from the city, and the first big night watched alone in
 * another time zone. One room. A parcel in Mum's handwriting, a stream that will not hold, the
 * old voice found again without a picture, and a neighbour who knocks because of the shouting
 * and has never heard of the club. Three ways to watch the rest — down the phone line with Dad,
 * alone with the banner on the wall, or with a stranger on the only chair — and none of them is
 * the right one. No opponent and no score: whatever happens, it happens at an hour when the
 * street outside is asleep.
 */
import type {Chapter} from '../types'
import {bond, flag, heart, keep, say, tell} from './kit'

export const C7_FAR: Chapter = {
  id: 'c7-far',
  act: 3,
  age: 30,
  title: 'Far',
  kicker: 'Age thirty · the middle of the night',
  intro: 'Ten to three in the morning. At home it is evening, and the lamps on your street are coming on. Here every window is dark, the laptop is open, and on top of the two boxes you never unpacked there is a third, which came today.',
  start: {room: 'flat-abroad', spawn: 'start', time: 'night'},

  names: {stranger: 'Neighbour'},

  cast: [
    {who: 'stranger', room: 'flat-abroad', slot: 'visitor', when: {all: [{flag: 'c7:shouted'}, {not: 'c7:phone'}, {not: 'c7:alone'}]}, talk: 'neighbour'},
  ],

  doors: [],

  spots: [
    {id: 'boxes', room: 'flat-abroad', spot: 'boxes', talk: 'boxes', verb: 'open', label: 'The parcel'},
    {id: 'wall', room: 'flat-abroad', spot: 'banner', when: {not: 'c7:hung'}, talk: 'banner', verb: 'use', label: 'The bare wall'},
    {id: 'banner', room: 'flat-abroad', spot: 'banner', when: {flag: 'c7:hung'}, talk: 'banner', verb: 'look', label: 'The banner'},
    {id: 'laptop', room: 'flat-abroad', spot: 'laptop', talk: 'laptop', verb: 'use', label: 'The laptop'},
    {id: 'phone', room: 'flat-abroad', spot: 'phone', talk: 'phone', verb: 'use', label: 'The phone'},
    {id: 'window', room: 'flat-abroad', spot: 'window', talk: 'window', verb: 'look', label: 'The window'},
    {id: 'bed', room: 'flat-abroad', spot: 'bed', talk: 'bed', verb: 'look', label: 'The bed'},
    {id: 'stove', room: 'flat-abroad', spot: 'stove', talk: 'stove', verb: 'look', label: 'The stove'},
  ],

  beats: [
    {id: 'half', room: 'flat-abroad', when: {all: [{flag: 'c7:tuned'}, {not: 'c7:shouted'}]}, talk: 'half'},
  ],

  objectives: [
    {id: 'parcel', t: 'A parcel came today. It has Mum\'s tape on it', done: {flag: 'c7:parcel'}},
    {id: 'wall', t: 'The flat thing from the parcel belongs on a wall', done: {flag: 'c7:hung'}},
    {id: 'stream', t: 'Kick-off. The laptop', done: {flag: 'c7:tuned'}},
    {id: 'knock', t: 'Somebody is at your door', done: {any: [{flag: 'c7:chair'}, {flag: 'c7:phone'}, {flag: 'c7:alone'}]}},
    {id: 'night', t: 'The rest of it. You know where you want to be', done: {flag: 'c7:done'}},
  ],

  talks: [
    {id: 'boxes', branches: [
      {when: {flag: 'c7:hung'}, lines: [tell('The parcel, empty now except for the newspaper she packed it with: the paper from home, three weeks old. You have read the back page twice.')]},
      {when: {flag: 'c7:parcel'}, lines: [tell('Still in the box: the flat thing your father taped. He does not trust folds.')]},
      {lines: [
        tell('Brown paper, and more tape than paper. Your address in her capitals, every letter of the foreign street copied out like a drawing.'),
        tell('Inside: a jar with a cloth lid, wrapped in the sports page. A pair of socks. Something flat and soft, taped shut by your father.'),
        tell('And a note. "The jar is for when you are ill, so do not be ill. The flat thing is from your room. Your father says a wall is not a wall with nothing on it. He has not seen your wall. Eat. Mum"'),
        tell('You fold the note along her fold and put it in your shirt pocket.'),
      ], then: [flag('c7:parcel'), keep('parcel'), heart(8)]},
    ]},
    {id: 'banner', branches: [
      {when: {flag: 'c7:hung'}, lines: [tell('The banner from your old room, on a wall that has never heard of it.'), tell('It hangs a little crooked. It did there, too.')]},
      {when: {flag: 'c7:parcel'}, lines: [
        tell('Four pin holes, left by whoever lived here before you. They are almost the right distance apart.'),
        tell('You get through the tape with a key. The banner from your old room, creased where your father gave up and folded it after all.'),
        tell('You press it up with your thumbs. {club}, in a building where nobody has ever said the word aloud.'),
      ], then: [flag('c7:hung'), heart(6)]},
      {lines: [tell('A bare wall, with four pin holes left by whoever lived here before you.')]},
    ]},
    {id: 'laptop', branches: [
      {when: {flag: 'c7:alone'}, lines: [tell('The voice is still going, to nobody.')], next: 'wall'},
      {when: {flag: 'c7:chair'}, lines: [tell('You turn the laptop so that it faces the chair. There is nothing to see. It seems polite.')], next: 'chair'},
      {when: {flag: 'c7:phone'}, lines: [tell('The voice is still going, quietly. The phone is on the shelf.')]},
      {when: {flag: 'c7:shouted'}, lines: [tell('The voice goes on without you. Somebody is at your door.')]},
      {when: {flag: 'c7:tuned'}, lines: [tell('No picture. Only the voice.')], next: 'half'},
      {when: {flag: 'c7:hung'}, lines: [
        tell('The picture loads as far as one blade of grass and stays there, thinking.'),
        tell('You close it. The old station still sends its sound out, for anybody who remembers where it lives on the dial. You go looking.'),
      ], then: [{e: 'play', game: 'tune', id: 'c7-stream', then: [flag('c7:tuned')]}]},
      {lines: [tell('The page says the match begins in eleven minutes. It has been saying eleven for some time.'), tell('Eleven minutes is long enough for a parcel and a wall.')]},
    ]},
    {id: 'phone', branches: [
      {when: {flag: 'c7:phone'}, lines: [tell('Home is the first name in the list. It has always been the first name in the list.')], next: 'call'},
      {when: {any: [{flag: 'c7:chair'}, {flag: 'c7:alone'}]}, lines: [tell('The phone, face down. It can stay there until morning.')]},
      {when: {flag: 'c7:texted'}, lines: [tell('Under your message it says she has seen it. She is writing. She stops writing.')]},
      {when: {flag: 'c7:parcel'}, lines: [
        tell('One message, from Mum, sent at what was lunchtime for her: "Did it come? Do not tell me if the jar broke."'),
        tell('You write: "It came. The jar is fine. The tape is excessive." You send it.'),
      ], then: [flag('c7:texted'), bond('mum', 4)]},
      {lines: [tell('One message, from Mum, sent at what was lunchtime for her: "Did it come?"'), tell('The parcel is still shut. You cannot answer yet without lying.')]},
    ]},
    {id: 'window', branches: [
      {when: {flag: 'c7:shouted'}, lines: [tell('Across the street a light has come on. One. You did that.')]},
      {lines: [tell('A street you can spell and cannot pronounce. Every window is dark.'), tell('At home, at this moment, people are walking in one direction.')]},
    ]},
    {id: 'bed', branches: [
      {when: {has: 'scarf'}, lines: [tell('The bed, made. The scarf is across the pillow, where it has slept since you moved.'), tell('It is longer than this bed is wide.')]},
      {lines: [tell('The bed, made. You set an alarm for half past two and then did not sleep, in case you slept through the alarm.')]},
    ]},
    {id: 'stove', branches: [
      {when: {flag: 'c7:parcel'}, lines: [tell('The jar from the parcel stands by the stove, lid on.'), tell('Opening it starts it running out.')]},
      {lines: [tell('One pan, one cup, one of everything. You put water on, for something to do with your hands.')]},
    ]},

    {id: 'half', branches: [{lines: [
      tell('Static, and then the same voice. Older, and coming out of a speaker the size of a coin, but the same.'),
      tell('He is walking. For a long time he is walking.'),
      tell('Then he is talking quicker. You have known what that means since you were six.'),
      tell('And then he is shouting, and so are you: on your feet, in your socks, in a building where people are asleep on every side.'),
      tell('Silence. Then, at your door, three knocks, evenly spaced, from somebody who has had time to find a dressing gown and decide what to say.'),
    ], then: [flag('c7:shouted'), {e: 'sound', cue: 'door'}]}]},

    {id: 'neighbour', branches: [
      {when: {flag: 'c7:chair'}, lines: [tell('The neighbour is on your one chair, holding your one cup, watching a laptop with no picture on it.')], next: 'chair'},
      {lines: [
        tell('The neighbour from across the landing, in a dressing gown, arms folded over it.'),
        say('stranger', 'It is three in the morning.'),
        say('me', 'I know. I am sorry.'),
        tell('The neighbour looks past you: the banner, the laptop with nothing on it, the voice coming out of it at a run.'),
        say('stranger', 'What is it?'),
        say('me', 'A football match.'),
        say('stranger', 'There is no picture.'),
        say('me', 'No.'),
        say('stranger', 'Then who is winning?'),
        say('me', 'He has not said. He talks quicker when it is us. That is all I have.'),
      ], choices: [
        {id: 'chair', t: 'Pull up the chair. I will start from the beginning.', then: [flag('c7:chair'), bond('stranger', 6)], next: 'n-chair'},
        {id: 'phone', t: 'It will be quiet now. I have to ring my father.', then: [flag('c7:phone'), flag('life:called-home')], next: 'n-phone'},
        {id: 'alone', t: 'It will be quiet now. I promise.', then: [flag('c7:alone')], next: 'n-alone'},
      ]},
    ]},
    {id: 'n-chair', branches: [{lines: [
      say('stranger', 'The beginning of the match?'),
      say('me', 'Earlier than that.'),
      tell('The neighbour considers the hour, and the dressing gown, and comes in.'),
    ]}]},
    {id: 'n-phone', branches: [{lines: [
      say('stranger', 'At this hour?'),
      say('me', 'It is evening where he is. He is sitting exactly where I think he is.'),
      say('stranger', 'Then ring him quietly.'),
      tell('The door closes. Slippers, going away.'),
    ]}]},
    {id: 'n-alone', branches: [{lines: [
      say('stranger', 'Is it important?'),
      say('me', 'No.'),
      tell('The neighbour looks at the banner for a moment longer than that answer deserves.'),
      say('stranger', 'Goodnight, then.'),
      tell('The door closes. Slippers, going away. The voice is still running.'),
    ]}]},

    {id: 'call', branches: [{lines: [
      tell('It rings twice. He always lets it ring twice, so that nobody thinks he was waiting.'),
      say('dad', 'You are up.'),
      say('me', 'You are listening.'),
      say('dad', 'The radio. Your mother has the television on in the other room. It is a second behind. She hears it from me first.'),
      say('me', 'I have the same voice here. No picture.'),
      say('dad', 'Then put the phone down next to it. No, do not talk. Listen.'),
      tell('So you do. Two rooms, one voice, and a phone line between them. He says everything twice: once in your father\'s kitchen, and a moment later in your room.'),
      tell('When it starts to run, you hear your father breathe in before your own room has caught up.'),
      say('mum', 'Ask him if the jar broke!'),
      say('dad', 'She says, did the jar break.'),
    ], then: [flag('c7:done'), bond('dad', 8), heart(6), {e: 'end', ending: 'line'}]}]},
    {id: 'chair', branches: [{lines: [
      tell('You start at the beginning. Not the rules. A Saturday, a kitchen, a radio with one corner held on by tape.'),
      say('stranger', 'And when he talks slowly?'),
      say('me', 'Those we do not discuss.'),
      tell('In forty minutes the neighbour learns one thing: when the voice runs, lean forward. It is enough. It is most of it.'),
      tell('When it runs for the last time you both lean, and the neighbour holds your one cup in both hands, on behalf of a city never visited and a name that came out wrong three times.'),
      say('stranger', 'Is that good? That sounded good.'),
      say('me', 'Ask me in a minute.'),
    ], then: [flag('c7:done'), heart(6), {e: 'end', ending: 'chair'}]}]},
    {id: 'wall', branches: [{lines: [
      tell('You turn the screen down until it is only a glow, and sit on the floor with your back against the bed, facing the banner.'),
      tell('The voice walks. The voice runs. You have both fists up your sleeves, so that nothing gets out.'),
      tell('When it breaks, you shout into the crook of your elbow.'),
      tell('Across the street, nothing. Whatever has just happened, it has happened to nobody, for a long way in every direction, except you.'),
      tell('The banner stirs when the pipes come on. That is all the crowd there is.'),
    ], then: [flag('c7:done'), heart(8), {e: 'end', ending: 'wall'}]}]},
  ],

  endings: {
    line: {title: 'Far', body: 'It was three in the morning for you and evening for him, and for ninety minutes that was the same hour. You will not remember what happened in the match. You will remember hearing your father breathe in, a moment before you knew why.', keep: 'parcel'},
    chair: {title: 'Far', body: 'You explained it from the beginning to somebody in a dressing gown, and found that you could. On the landing, from now on, there is a person who knows exactly one thing about where you are from. It is the right thing.', keep: 'parcel'},
    wall: {title: 'Far', body: 'For a long way in every direction, nobody knew that anything had happened. You knew. In the morning the street got up and went to work and you went with it, hoarse, and nobody asked. The banner stayed where it was.', keep: 'parcel'},
  },

  keepsakes: [
    {id: 'parcel', name: 'Mum\'s note from the parcel', note: 'A few lines in her handwriting, about a jar, a wall and eating. None of them is the one she meant.'},
  ],
}
