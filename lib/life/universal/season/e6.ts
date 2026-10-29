/**
 * Season One · Episode 6 — AWAY. Age about fifteen. The first away day without a parent: the bag, the bus, the crew,
 * home by midnight. The season finale.
 *
 * The job: be on the bus. Except {friend} is not at the station, and the bus does not wait for anybody. Go back for him
 * and you may both miss it — then it is the late bus and the second half, together. Go without him and you are on time,
 * and he remembers. Either way the night is the club's own away night where the archive holds one in these years, played
 * from the away end; otherwise the night as he lived it, with no score. Then home, to Mum, at the kitchen table.
 */
import type {ArchiveRef, Cond, LiveDef} from '../types'
import {bond, cine, failed, flag, has, heart, is, live, me, not, opt, passed, remember, room, say, standing, think, unlocked, type EpisodeScript} from './write'

const E = 'S1E6'
const done = (s: string) => `s1:${E}:${s}:done`
const MISSED = `s1:${E}:missed`
const CREW = `life:s1:${E}:crew`
const both: Cond = {flag: done('ofir')}

export function e6(anchor: ArchiveRef | null, age: number): EpisodeScript {
  const result = anchor?.match?.result ?? 'unread'
  const won = result === 'won', lost = result === 'lost'
  const away: LiveDef = {
    id: 'e6-live', with: ['wild'], at: 'terrace',
    before: [say('wild', 'Three hundred of us. Three hundred. They have twelve thousand. We are louder. Listen. We are LOUDER.'), think('A different ground. The same song. It sounds like home from the wrong side.')],
    goal: [say('wild', 'AWAY END! AWAY END! AWAY END!', 'joy'), think('Twelve thousand people go silent. Three hundred lose their minds. You are one of the three hundred.')],
    against: [say('wild', 'Sing. SING. That is when you sing.', 'tense')],
    end: {
      won: [say('wild', 'Remember the bus home. Nobody is going to sleep on the bus home.', 'joy')],
      lost: [say('wild', 'Long bus. Long, long bus. We sing anyway.', 'grief')],
      drew: [say('wild', 'A point away. Away! Tell your grandchildren.')],
      unread: [say('wild', 'Whatever the paper says, we were the loudest thing in that ground.')],
    },
  }
  const echo = anchor ? [flag('life:night:win', won), flag('life:night:loss', lost), flag('life:night:draw', result === 'drew')] : []

  return {
    id: E, no: 6, age, act: 2,
    title: 'Away',
    logline: 'First away day. No parents. Home by midnight.',
    intro: 'Mum said yes. Mum said yes with conditions. Mum said yes with a LOT of conditions.',
    keep: {id: 'away-ticket', name: 'The bus ticket, there and back', note: 'Both halves. You never threw away the way home.'},
    start: {room: 'bedroom'},
    ...(anchor ? {anchor, lives: [away]} : {}),
    open: {doc: 'e6-cold', cine: 'e6-open', mission: 'Be on the bus. Be home by midnight.'},
    close: ['e6-ofir', 'e6-mum'],
    box: {item: 'A bus ticket, both halves', line: 'There and back. And under it, at the very bottom of the box: the envelope.'},
    flash: {cine: 'e6-flash', card: 'That morning'},
    letter: {
      head: 'The envelope. Dad’s handwriting, from a long time ago.',
      lines: [
        '{hero}.',
        'If you are reading this, you went. Away, on your own, with your lot. I knew you would.',
        'I took you to the radio, then to the step, then to the gate. That was my part. The rest was always going to be yours.',
        'You will notice I kept the things you tried to throw away.',
        'Do not tell your mother I cried writing this. She knows.',
      ],
      sign: 'Dad',
      after: 'Under the letter, a second envelope. The same marker: “For when it is your turn to take someone.”',
    },

    clock: {
      id: 'bus', s: 160, label: 'The bus', fail: MISSED,
      from: has(done('mum')), until: has(done('board')),
      lines: [room('At the station, the away bus pulls out with its windows full of scarves. Without you.'), think('There is a later bus. There is always a later bus. It is just later.')],
      fx: [failed('The away bus')],
    },

    people: [
      {who: 'mum', room: 'kitchen', slot: 'table'},
      {who: 'wild', room: 'bus-station', slot: 'pillar'},
      {who: 'driver', room: 'bus-station', slot: 'driver'},
      {who: 'friend', room: 'street', slot: 'doorstep', when: {all: [{is: [CREW, 'back']}, {not: done('ofir')}]}},
      {who: 'wild', room: 'away-end', slot: 'left'},
      {who: 'friend', room: 'away-end', slot: 'fence', when: both},
      {who: 'steward', room: 'away-end', slot: 'steward'},
    ],
    barks: [
      {who: 'driver', room: 'bus-station', lines: ['Two minutes. I am not your father. Two minutes.', 'Scarves inside the windows, not outside.']},
      {who: 'steward', room: 'away-end', lines: ['Stay in the pen. Stay in the pen.', 'You lot again.']},
      {who: 'wild', room: 'away-end', lines: ['I can see our house from here. I cannot. It is two hours away.', 'Their pies are worse. Write it down.']},
    ],

    steps: [
      {
        id: 'bag', goal: 'Pack for the away day', main: true,
        at: {room: 'bedroom', spot: 'wardrobe'}, verb: 'open',
        lines: [think('Scarf. Sandwiches. Coins for the phone. The scarf. Did you pack the scarf. You packed the scarf.')],
        game: 'carry',
        react: [room('One bag. Everything a person needs to be away from home for fourteen hours.')],
        slip: [room('The sandwiches are in the bag. The bag is on the sandwiches. It will be fine. It will be flat.')],
        cut: {room: 'kitchen', spawn: 'fromLiving'},
      },
      {
        id: 'mum', goal: 'Mum’s conditions', main: true,
        at: {room: 'kitchen', who: 'mum', slot: 'table'}, verb: 'talk',
        lines: [
          say('mum', 'Midnight. The door. You. Not one minute past.'),
          say('mum', 'You phone me when you get there. From a phone. Not from a feeling.'),
        ],
        ask: {
          timer: 8, silent: 'promise',
          options: [
            opt('promise', '“Midnight. I promise.”', [say('mum', 'I am writing it on the calendar. In pen.')], [bond('mum', 3), flag('life:s1:midnight'), remember('midnight', 'Promised Mum midnight. In pen.')]),
            opt('one', '“Half past?”', [say('mum', 'Midnight. And now I am thinking about eleven.'), think('Never negotiate with the person holding the door.')], [bond('mum', -1), standing(1)]),
            opt('hug', 'Hug her. Say nothing.', [room('She holds on a second longer than she means to.'), say('mum', 'Go. Go before I change my mind.')], [bond('mum', 5), heart(2), flag('life:s1:midnight')]),
          ],
        },
        cut: {room: 'bus-station', spawn: 'fromStreet'},
      },
      {
        id: 'crew', goal: 'Find the crew at the station', main: true,
        at: {room: 'bus-station', who: 'wild', slot: 'pillar'}, verb: 'talk',
        lines: [
          say('wild', 'Bus is here. I am here. You are here. {friend} is not here.'),
          say('wild', 'He said he would be here. He also said he would not sleep in. Two lies.'),
        ],
        ask: {
          timer: 7, silent: 'leave',
          lines: [think('His street is two minutes away. The bus is two minutes away from leaving.')],
          options: [
            opt('back', 'Run back for him', [say('wild', 'GO! I will lie down in front of the bus! I will not! GO!')], [bond('friend', 6), flag('life:s1:back'), flag('life:away:help', 'helped'), remember('back', 'Ran back for {friend}. The bus was not going to wait.')]),
            opt('leave', 'Get on. He knows the time.', [say('wild', 'Cold. Correct, but cold.'), think('He knows the time. He always knows the time. He just does not always use it.')], [bond('friend', -4), flag('life:s1:left'), flag('life:away:help', 'seats'), remember('left', 'Got on the bus without {friend}.')]),
          ],
        },
      },
      {
        id: 'ofir', goal: 'Get {friend} to the bus', main: true, when: {all: [{is: [CREW, 'back']}, {not: MISSED}]}, east: 'bus-station',
        at: {room: 'street', who: 'friend', slot: 'doorstep'}, verb: 'talk',
        lines: [say('friend', 'I KNOW. I know. My alarm is a liar.'), me('Run.')],
        mission: {template: 'lead-the-way'}, game: 'carry',
        react: [room('Two of you, flat out, the bag hitting your back on every step.')],
        slip: [say('friend', 'Is it — no. No. That is it leaving.'), room('The away bus turns the corner with three hundred scarves in the windows.')],
        reward: {good: [heart(2)], slip: [flag(MISSED), failed('The away bus')]},
        cut: {room: 'bus-station', spawn: 'fromStreet'},
      },
      {
        id: 'board', goal: 'On the bus', main: true, when: {all: [{not: MISSED}, {any: [{is: [CREW, 'leave']}, both]}]}, east: 'bus-station',
        at: {room: 'bus-station', who: 'driver', slot: 'driver'}, verb: 'go',
        callbacks: [{when: both, lines: [say('driver', 'Two more. Two more who think time is a suggestion. In.')], group: 'in'}],
        lines: [say('driver', 'Ticket. Seat. Sit. Sing if you must. Do not stand on the seats.')],
        show: [cine('e6-bus')],
        react: [think('Two hours of motorway and three hundred people who know every word.')],
        fx: [passed('On the away bus')],
        cut: {room: 'away-end', spawn: 'start', night: true},
      },
      {
        id: 'later', goal: 'Catch the later bus', main: true, when: has(MISSED), after: ['crew'], east: 'bus-station',
        at: {room: 'bus-station', spot: 'board'}, verb: 'look',
        callbacks: [{when: both, lines: [say('friend', 'This is my fault.'), me('Yes.'), say('friend', 'Thank you for coming back.'), me('Yes.')], group: 'late'}],
        lines: [room('The board says the next bus. The next bus says half time.')],
        react: [think('Half a match. Half a match is still a match. Half a match away is still AWAY.')],
        fx: [remember('late', 'Missed the away bus. Got there for the second half.')],
        cut: {room: 'away-end', spawn: 'start', night: true},
      },
      {
        id: 'night', goal: anchor ? 'The match, from the away end' : 'The away end', main: true, afterAny: ['board', 'later'],
        at: {room: 'away-end', spot: 'pitch'}, verb: 'look',
        callbacks: [
          {when: has(MISSED), lines: [say('wild', 'You are late! You missed a whole half! I saved you a step!')], group: 'arrive'},
          {when: has('life:s1:left'), lines: [think('A spare step next to you. Where {friend} would stand. Nobody stands there.')], group: 'arrive'},
        ],
        lines: [say('wild', 'Our end. Our three hundred. Our song. Their ground.')],
        show: anchor ? [live('e6-live')] : [cine('e6-night')],
        fx: echo,
        react: anchor
          ? won ? [room('The away end jumps. The concrete is not built for jumping. It jumps anyway.')] : lost ? [room('Three hundred people sing louder than when they were winning. Nobody decides to. It just happens.')] : [room('The away end exhales.')]
          : [room('You will forget the score. You will not forget the bus, the pen, the song from the wrong side.')],
        cut: {room: 'kitchen', spawn: 'fromLiving', night: true},
      },
      {
        id: 'phone', goal: 'Phone Mum', side: true, afterAny: ['board', 'later'], when: not(done('night')),
        at: {room: 'away-end', spot: 'rail'}, verb: 'use',
        lines: [room('A payphone by the away end. A queue of boys phoning mothers, all saying the same thing.')],
        game: 'count',
        react: [say('mum', '…Hello? Is it you? Are you — good. Good. Midnight.'), think('She was sitting by the phone. Of course she was.')],
        fx: [bond('mum', 4), flag('life:s1:phoned'), remember('phoned', 'Phoned Mum from the away end.')],
      },
      {
        id: 'home', goal: 'Home by midnight', main: true, final: true, after: ['night'],
        at: {room: 'kitchen', who: 'mum', slot: 'table'}, verb: 'talk',
        callbacks: [
          {when: has('life:s1:phoned'), lines: [say('mum', 'You phoned. You actually phoned.')], group: 'phone'},
          {when: not('life:s1:phoned'), lines: [say('mum', 'You did not phone.'), think('You did not phone.')], group: 'phone'},
          {when: has(MISSED), lines: [say('mum', 'Twenty past twelve. The clock in this kitchen is never wrong.')], group: 'time'},
        ],
        lines: [room('The kitchen light is on. It is always on, on away days, for the rest of your life.')],
        ask: {
          timer: 8, silent: 'tell',
          options: [
            opt('tell', 'Tell her all of it', [room('The bus, the pen, the song. She listens to every word with her chin on her hand.'), say('mum', 'Your father did all of this. Before you. I used to sit right here.')], [bond('mum', 5), heart(3)]),
            opt('bed', '“Fine. Tired. Bed.”', [say('mum', 'Fine, tired, bed. Fifteen.'), room('She turns the light off behind you. You hear her smile in the dark.')], [bond('mum', 1)]),
          ],
        },
        fx: [unlocked('Season One')],
      },
    ],

    cines: [
      {id: 'e6-flash', shots: [
        {cam: 'close', on: ['me'], ms: 2800, act: [{who: 'me', do: 'emote', mood: 'joy'}], say: think('Two hours from home. Three hundred of you. It sounds like twelve thousand.')},
      ]},
      {id: 'e6-open', shots: [
        {cam: 'close', on: ['me'], ms: 2300, say: think('Fifteen. Away. Without a single parent. This is what being a person feels like.')},
        {cam: 'wide', ms: 2500, say: room('In the kitchen, Mum is already making a list of conditions.')},
      ]},
      {id: 'e6-bus', shots: [
        {cam: 'wide', ms: 2600, act: [{who: 'all', do: 'cheer'}], say: room('The away bus leaves the city with its windows open and every scarf out of them.')},
        {cam: 'two', on: ['wild', 'me'], ms: 2400, act: [{who: 'wild', do: 'emote', mood: 'joy'}], say: say('wild', 'From the top! Everybody! From the TOP!')},
      ]},
      {id: 'e6-night', shots: [
        {cam: 'wide', ms: 2600, act: [{who: 'all', do: 'cheer'}], say: room('Twelve thousand of them. Three hundred of you. It sounds like the other way round.')},
        {cam: 'close', on: ['me'], ms: 2400, act: [{who: 'me', do: 'emote', mood: 'wonder'}], say: think('This is the furthest from home you have ever been. It feels like home.')},
      ]},
    ],

    docs: [
      {id: 'e6-cold', who: 'mum', role: 'Your mother', lines: [{t: 'The first away day, I did not sleep. I sat in the kitchen with the light on. I still do, a bit.'}]},
      {id: 'e6-ofir', who: 'friend', role: 'Your oldest friend', lines: [
        {t: 'He came back for me. The bus left. We sat on the late bus in silence for an hour, and then we sang for the second hour.', when: has('life:s1:back')},
        {t: 'He got on without me. He was right. I still mention it at every wedding.', when: has('life:s1:left')},
        {t: 'Away days. That is where you find out who your people are.'},
      ]},
      {id: 'e6-mum', who: 'mum', role: 'Your mother', lines: [
        {t: 'He phoned. From a payphone, with three hundred boys shouting behind him. I could not hear a word. Best phone call of my life.', when: has('life:s1:phoned'), secret: 'She could not hear a word'},
        {t: 'Twenty past twelve. I said nothing. I had already decided to say nothing at five past.', when: has(MISSED), secret: 'Five past twelve'},
        {t: 'I kept the light on. Every away day. I am not going to stop now.'},
      ]},
    ],
  }
}

export const e6Ages: [number, number] = [14, 16]
