/**
 * Season One · Episode 3 — THE WAY IN. Age about eight. The first time at the ground, with Dad.
 *
 * The job: the tickets, the walk, the gate before the whistle, the step he will stand on for thirty years, and the one
 * line of the song an old regular teaches him. Then the night itself.
 *
 * Where the club's approved archive holds a match in these years, the night is that match, played live around him —
 * the board says only what the record says. Where it holds none, the night is told from where he stood: no date, no
 * score, only Dad's hand and the noise. Late at the gate is not a lost day: he hears the first roar from the queue.
 */
import type {ArchiveRef, LiveDef} from '../types'
import {bond, cine, failed, flag, has, heart, is, live, me, not, opt, passed, remember, room, say, standing, think, type EpisodeScript} from './write'

const E = 'S1E3'
const done = (s: string) => `s1:${E}:${s}:done`
const LATE = `s1:${E}:late`

export function e3(anchor: ArchiveRef | null, age: number): EpisodeScript {
  const result = anchor?.match?.result ?? 'unread'
  const won = result === 'won', lost = result === 'lost'
  const liveDef: LiveDef = {
    id: 'e3-live', with: ['dad', 'elder'], at: 'terrace',
    before: [
      say('dad', 'Breathe. Everybody breathe. I am breathing for both of us.'),
      say('elder', 'Do not look at the clock, son. The clock does not like being looked at.'),
      think('Twenty thousand people and every one of them is holding the same breath.'),
      say('dad', 'Come on. Come ON. Somebody. Anybody.'),
    ],
    goal: [say('dad', 'YES! YES! {hero}! DID YOU SEE IT?', 'joy'), say('elder', 'There it is. There it is.', 'joy')],
    against: [say('dad', 'It is fine. It is fine. It is not fine.', 'tense'), say('elder', 'Seen worse. Seen much worse.')],
    end: {
      won: [say('dad', 'Remember this. I am telling you now so you know to remember it.', 'joy')],
      lost: [say('dad', 'You stay anyway. That is the whole trick. You stay anyway.', 'grief')],
      drew: [say('dad', 'Not nothing. Not everything. You will have a lot of these.')],
      unread: [say('dad', 'Whatever the paper says tomorrow, you were here.')],
    },
  }
  const night = anchor ? [live('e3-live'), flag('life:night:win', won), flag('life:night:loss', lost), flag('life:night:draw', result === 'drew')] : [cine('e3-night')]

  return {
    id: E, no: 3, age, act: 1,
    title: 'The Way In',
    logline: 'The first time. Dad has checked the tickets eleven times.',
    next: 'The Missing Square',
    intro: 'Dad did not sleep. You slept fine. Today you are going in.',
    keep: {id: 'ticket', name: 'The first torn ticket', note: 'Half of it. The other half went through the turnstile without you.'},
    start: {room: 'room'},
    ...(anchor ? {anchor, lives: [liveDef]} : {}),
    open: {doc: 'e3-cold', cine: 'e3-open', mission: 'Through the gate before the whistle.'},
    close: ['e3-dad', 'e3-mum'],
    box: {item: 'Half a ticket', line: 'Just half. The other half went through a turnstile a long time ago.'},
    flash: {cine: 'e3-flash', card: 'An hour earlier'},
    tease: 'One empty square. Twelve minutes. A dragon two desks over.',

    clock: {
      id: 'whistle', s: 150, label: 'Kick-off', fail: LATE,
      from: has(done('tickets')), until: has(done('gate')),
      lines: [room('From the other side of the wall: a roar. The whole ground goes up without you.'), say('dad', 'That is the kick-off. We are in a queue. Our first time and we are in a QUEUE.', 'tense')],
      fx: [failed('The kick-off')],
    },

    people: [
      {who: 'mum', room: 'room', slot: 'byDoor', when: not(done('tickets'))},
      {who: 'dad', room: 'terrace', slot: 'left'},
      {who: 'elder', room: 'terrace', slot: 'fence', when: has(done('step'))},
      {who: 'seller', room: 'route', slot: 'seller'},
    ],
    barks: [
      {who: 'seller', room: 'route', lines: ['Scarves! Scarves! Your colours, cheaper than your father’s!', 'You, small one. You need a scarf. Everybody needs a scarf.']},
      {who: 'steward', room: 'gate', lines: ['Tickets out. Out, not in your mouth.', 'One at a time. One. At. A. Time.']},
    ],

    steps: [
      {
        id: 'tickets', goal: 'Check the tickets with Dad', main: true,
        at: {room: 'room', who: 'dad', slot: 'sofa'}, verb: 'talk',
        callbacks: [{when: has('life:s1:repair'), lines: [say('dad', 'And the shirt. The one with the repair. It knows the way.')]}],
        lines: [say('dad', 'Tickets. Two. One. Two— where are they?', 'tense'), say('mum', 'You have counted them eleven times.'), say('dad', 'And now I have lost them a twelfth. Find them! Bus in ten!', 'tense')],
        // close up: the flat gone through for one envelope while he pats every pocket he owns (RUSH `ticket-hunt`)
        mission: {template: 'ticket-hunt'},
        game: 'count',
        show: [cine('e3-envelope')],
        react: [room('Two tickets. Counted together, on the stairs. Twelve times, in the end.')],
        ask: {
          timer: 7, silent: 'dad',
          options: [
            opt('me', 'Hold your own ticket', [say('dad', 'One pocket. Remember which one. I will be asking every four minutes.')], [flag('life:ticket:holder', 'me'), standing(2)]),
            opt('dad', 'Let Dad keep both', [say('dad', 'Good. I will lose them myself, then. Like a professional.')], [flag('life:ticket:holder', 'dad'), bond('dad', 2)]),
          ],
        },
      },
      {
        id: 'way', goal: 'Get to the ground with Dad', main: true,
        at: {room: 'route', spot: 'sign'}, verb: 'look', enter: true,
        escort: [{who: 'dad', rooms: ['room', 'street', 'route', 'gate']}],
        lines: [say('dad', 'This is where it starts. You can hear it from here.'), room('A sound like the sea, from somewhere behind the houses.')],
        ask: {
          timer: 8, silent: 'walk',
          lines: [say('dad', 'We can walk the way my father walked me. Or we can run.')],
          options: [
            opt('run', 'Run!', [say('dad', 'RUN, then! Mind the — mind everything!')], [flag('life:tunnel:way', 'lead'), heart(2)], {mission: {template: 'kickoff-run'}, game: 'carry'}),
            opt('walk', 'Your father’s way', [say('dad', 'Left at the bakery. Right at the man who shouts. Then follow the scarves.')], [flag('life:tunnel:way', 'hand'), bond('dad', 3)]),
          ],
        },
      },
      {
        id: 'gate', goal: 'Through the gate', main: true,
        at: {room: 'gate', who: 'steward', slot: 'steward'}, verb: 'talk',
        escort: [{who: 'dad', rooms: ['gate']}],
        callbacks: [
          {when: is('life:ticket:holder', 'me'), lines: [say('steward', 'This was a ticket once. Now it is a ball. A warm ball.'), me('I held it very hard.')], group: 'holder'},
          {when: is('life:ticket:holder', 'dad'), lines: [say('dad', 'Tickets, tickets — where are the — ah. Front pocket. Always front pocket.')], group: 'holder'},
          {when: has(LATE), lines: [say('steward', 'You missed the start. Everybody misses something. In you go.')]},
        ],
        lines: [say('steward', 'First time?'), me('How did you know?'), say('steward', 'Your face. Everybody has the same face the first time. In you go.')],
        fx: [passed('Through the gate'), remember('gate', 'Went through the turnstile the first time. Half a ticket in your fist.')],
      },
      {
        id: 'tunnel', goal: 'Walk towards the light', main: true,
        at: {room: 'tunnel', spot: 'sign'}, verb: 'go', enter: true,
        escort: [{who: 'dad', rooms: ['tunnel']}],
        lines: [room('The sound becomes a place. You stop without deciding to.')],
        show: [cine('e3-light')],
        react: [say('dad', 'No hurry. It is still there. It will always still be there.', 'tender')],
      },
      {
        id: 'step', goal: 'Find your step on the terrace', main: true,
        at: {room: 'terrace', who: 'dad', slot: 'left'}, verb: 'talk',
        lines: [say('dad', 'Here. This step. Third from the fence. It is ours now. Nobody else stands here.'), think('Third from the fence. You will be able to find it blind.')],
        fx: [flag(`s1:${E}:step`), remember('step', 'Third step from the fence. Ours.')],
      },
      {
        id: 'song', goal: 'Learn the song from the old regular', main: true,
        at: {room: 'terrace', who: 'elder', slot: 'fence'}, verb: 'talk',
        lines: [say('elder', 'You know the words?'), me('One line.'), say('elder', 'One line is plenty. The rest of us are useful for the other lines. Go on.')],
        game: 'clap',
        react: [room('You sing the one line. A thousand people sing the rest. It counts.'), say('elder', 'That is it. Now you are one of us. No refunds.')],
        slip: [room('You sing it a beat late. Nobody notices. A thousand people are a beat late with you.'), say('elder', 'Close enough. It was close enough in nineteen-something too.')],
        fx: [flag('life:sang'), standing(3), heart(2)],
      },
      {
        id: 'night', goal: anchor ? 'The match' : 'Watch with Dad', main: true,
        at: {room: 'terrace', spot: 'pitch'}, verb: 'look',
        lines: [say('dad', 'Here we go. Hold the rail. Not that rail, that rail is everybody’s. This rail.')],
        show: night.filter(f => f.e !== 'flag'),
        fx: night.filter(f => f.e === 'flag'),
        react: anchor
          ? won ? [room('You do not remember the walk out. You remember his hand, and the noise.')]
            : lost ? [room('The ground empties slowly. Dad does not move. So you do not move.')]
            : [room('The ground lets its breath out, all at once.')]
          : [room('You do not remember the score. Nobody asks you the score. You remember his hand, and the noise.')],
        ask: {
          timer: 6, silent: 'hold',
          options: [
            opt('shout', 'Shout until you have no voice', [say('dad', 'That is my boy. That is my LOUD boy.', 'joy')], [heart(5), flag('life:first:memory', 'noise'), remember('shout', 'Lost your voice on the terrace. Got it back on Tuesday.')]),
            opt('hold', 'Hold his hand', [room('His hand is bigger than you remember, and it is shaking.', 'tender')], [heart(4), bond('dad', 5), remember('hand', 'Held Dad’s hand at the end. His was shaking.')]),
          ],
        },
      },
      {
        id: 'home', goal: 'Hear what Dad says on the way out', main: true, final: true,
        at: {room: 'terrace', who: 'dad', slot: 'left'}, verb: 'talk',
        callbacks: [{when: has(LATE), lines: [say('dad', 'We missed the start. Do not tell your mother. She will say she told me.')]}],
        lines: [say('dad', 'Same step next time?')],
        ask: {
          options: [
            opt('always', '“Every time.”', [say('dad', 'Every time. That is the contract.'), think('The contract. There is always a contract.')], [bond('dad', 4)]),
            opt('next', '“When is next time?”', [say('dad', 'Ask your mother.'), think('We will see. We will see means yes.')], [bond('mum', 1), bond('dad', 2)]),
          ],
        },
      },

      // side: a scarf from the seller, if he has the coins
      {
        id: 'scarf', goal: 'Buy a scarf from the seller', side: true,
        at: {room: 'route', who: 'seller', slot: 'seller'}, verb: 'buy',
        lines: [say('seller', 'For you, small one, a special price. Same price. But special.')],
        ask: {
          options: [
            opt('buy', 'Buy it (5 coins)', [say('seller', 'Wear it like you mean it.'), room('It itches. It is perfect.')], [{e: 'coins', by: -5}, heart(2)], {when: {min: ['coins', 5]}, wear: 'scarf'}),
            opt('no', 'Just looking', [say('seller', 'Everybody is just looking. Then they come back.')]),
          ],
        },
      },
    ],

    cines: [
      // the envelope in his hand: the father and son, and the mother who saw it coming
      {id: 'e3-envelope', shots: [
        {cam: 'two', on: ['me', 'dad'], ms: 2400, act: [{who: 'me', do: 'hold', item: 'ticket'}, {who: 'dad', do: 'face', to: 'me'}], say: room('You hold it up. He takes it like it might go off.')},
        {cam: 'close', on: ['dad'], ms: 2300, act: [{who: 'dad', do: 'emote', mood: 'joy'}, {who: 'me', do: 'hold', item: null}], say: say('dad', 'Two. Both. Good. Never tell anybody about this.', 'joy')},
        {cam: 'close', on: ['mum'], ms: 2000, act: [{who: 'mum', do: 'emote', mood: 'warm'}], say: say('mum', 'I will tell everybody about this.')},
      ]},
      {id: 'e3-flash', shots: [
        {cam: 'close', on: ['me'], ms: 2600, act: [{who: 'me', do: 'emote', mood: 'wonder'}], say: think('In an hour you will see it for the first time. The green. Nobody warns you about the green.')},
      ]},
      {id: 'e3-open', shots: [
        {cam: 'close', on: ['dad'], ms: 2300, act: [{who: 'dad', do: 'emote', mood: 'tense'}], say: say('dad', 'Today.')},
        {cam: 'close', on: ['mum'], ms: 2400, say: say('mum', 'He has been dressed since five. Five in the morning.')},
        {cam: 'two', on: ['me', 'dad'], ms: 2600, act: [{who: 'dad', do: 'face', to: 'me'}], say: say('dad', 'Tickets first. Then the way. Then — then we see.')},
      ]},
      {id: 'e3-light', shots: [
        {cam: 'close', on: ['me'], ms: 2200, act: [{who: 'me', do: 'emote', mood: 'wonder'}], say: think('There is a light at the end of the tunnel. People say that. It is true.')},
        {cam: 'two', on: ['me', 'dad'], ms: 2600, act: [{who: 'dad', do: 'emote', mood: 'tender'}], say: room('Then the grass. More green than a thing should be.')},
      ]},
      {id: 'e3-night', shots: [
        {cam: 'wide', ms: 2600, act: [{who: 'all', do: 'cheer'}], say: room('The whole stand moves at once, like a sheet in the wind.')},
        {cam: 'two', on: ['dad', 'me'], ms: 2400, act: [{who: 'dad', do: 'emote', mood: 'joy'}], say: say('dad', 'THERE! Did you SEE that?')},
        {cam: 'close', on: ['me'], ms: 2200, say: think('You did not see it. You saw his face. That was better.')},
      ]},
    ],

    docs: [
      {id: 'e3-cold', who: 'dad', role: 'Your father', lines: [{t: 'First time I took him, I did not sleep. He slept fine. I was the one who was eight that night.'}]},
      {id: 'e3-dad', who: 'dad', role: 'Your father', lines: [
        {t: 'We missed the kick-off. Our first time. In a queue. I have never told his mother.', when: has(LATE), secret: 'Never told Mum'},
        {t: 'He ran the whole way. I am not built for running. I ran anyway.', when: is('life:tunnel:way', 'lead')},
        {t: 'He held my hand at the end. I said it was so he would not get lost. It was so I would not.', when: is(`life:s1:${E}:night`, 'hold'), secret: 'Whose hand it was'},
        {t: 'Third step from the fence. Still ours. I still check nobody is standing on it.'},
      ]},
      {id: 'e3-mum', who: 'mum', role: 'Your mother', lines: [
        {t: 'He came home without a voice. Just pointing. Three days of pointing.', when: is('life:first:memory', 'noise')},
        {t: 'They came home holding the same half of a ticket. Both of them. I do not know how.'},
      ]},
    ],
    when: undefined,
  }
}

export const e3Ages: [number, number] = [7, 9]
