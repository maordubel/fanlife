/**
 * Season One · Episode 5 — NO TICKET. Age about twelve. Grounded, with no ticket, on the one night that matters.
 *
 * The job: out of the window, the crew, the gap in the fence, inside before kick-off — and not get seen by Dad, who
 * is on a night shift. Except Dad is not on a night shift. Caught at the fence, or too late, and the night is heard on
 * the kiosk radio with the kiosk man, which is its own kind of night. The club's own night, live, where the archive
 * holds one in these years; otherwise the night as he lived it, with no score.
 */
import type {ArchiveRef, Cond, LiveDef} from '../types'
import {bond, cine, failed, flag, has, heart, is, live, me, not, opt, passed, remember, room, say, standing, think, type EpisodeScript} from './write'

const E = 'S1E5'
const done = (s: string) => `s1:${E}:${s}:done`
const CAUGHT = `s1:${E}:caught`
const LATE = `s1:${E}:late`
const outside: Cond = {any: [{flag: CAUGHT}, {flag: LATE}]}
const inside: Cond = {none: [{flag: CAUGHT}, {flag: LATE}]}

export function e5(anchor: ArchiveRef | null, age: number): EpisodeScript {
  const result = anchor?.match?.result ?? 'unread'
  const won = result === 'won', lost = result === 'lost'
  const terrace: LiveDef = {
    id: 'e5-live', with: ['dad', 'wild'], at: 'terrace',
    before: [say('wild', 'We are IN. We are actually in. I am going to cry. I am not going to cry.'), say('dad', 'Do not think this means you are not grounded.'), think('Grounded. On a terrace. Best grounding of your life.')],
    goal: [say('dad', 'YES! — you are still grounded — YES!', 'joy'), say('wild', 'AGAIN! DO IT AGAIN!', 'joy'), say('dad', 'Come here. COME HERE.', 'joy')],
    against: [say('dad', 'Fine. Fine. It is fine.', 'tense')],
    end: {
      won: [say('dad', 'You climbed a fence for this. Good. Good choice. Do not do it again. Good choice.', 'joy')],
      lost: [say('dad', 'You climbed a fence for this. I would have too.', 'grief')],
      drew: [say('dad', 'A fence. For this. Next time we buy a ticket like people.')],
      unread: [say('dad', 'Whatever happened tonight, you were inside it.')],
    },
  }
  const radio: LiveDef = {
    id: 'e5-radio', with: ['kiosk', 'friend'], at: 'radio',
    before: [say('kiosk', 'Sit. Do not touch the chocolate. Listen.'), say('friend', 'We could have been in there.'), say('kiosk', 'You could have been in a police car. Listen.')],
    goal: [say('kiosk', 'There! THERE! Free chocolate! One each!', 'joy'), say('friend', 'Again!', 'joy')],
    against: [say('kiosk', 'Close the chocolate. Close it.', 'tense')],
    end: {
      won: [say('kiosk', 'Go home. Tell your father you heard it at my kiosk. He will understand. He will also kill you.')],
      lost: [say('kiosk', 'Go home. It happens. Take a chocolate. Take two.')],
      drew: [say('kiosk', 'Go home. Nothing happened. Something happened. Go home.')],
      unread: [say('kiosk', 'Go home. Tell your father where you heard it.')],
    },
  }
  const echo = anchor ? [flag('life:night:win', won), flag('life:night:loss', lost), flag('life:night:draw', result === 'drew')] : []

  return {
    id: E, no: 5, age, act: 2,
    title: 'No Ticket',
    logline: 'Grounded. No ticket. The one night that matters.',
    next: 'Away',
    intro: 'You are grounded. There is a match tonight. Those two facts cannot both stay true.',
    keep: {id: 'fence', name: 'A thread of the fence', note: 'Caught on your sleeve. You kept it like a medal.'},
    start: {room: 'bedroom'},
    ...(anchor ? {anchor, lives: [terrace, radio]} : {}),
    open: {doc: 'e5-cold', cine: 'e5-open', mission: 'Inside before kick-off. Without a ticket. Without Dad knowing.'},
    close: ['e5-dad', 'e5-dudu'],
    box: {item: 'A thread of fence wire, tied in a bow', line: 'Mum always said it was rubbish. Dad never let her throw it out.'},
    flash: {cine: 'e5-flash', card: 'Two hours earlier'},
    tease: 'Fifteen. Away. Mum has conditions.',

    clock: {
      id: 'kickoff', s: 140, label: 'Kick-off', fail: LATE,
      from: has(done('crew')), until: {any: [{flag: done('fence')}, {flag: CAUGHT}]},
      lines: [room('From behind the stand: the roar. It started without you. Of course it did.'), say('wild', 'The fence is not going anywhere. Neither are we, apparently.')],
      fx: [failed('Inside before kick-off')],
    },

    people: [
      {who: 'mum', room: 'room', slot: 'sofa'},
      {who: 'wild', room: 'gate', slot: 'fence', when: has(done('crew'))},
      {who: 'friend', room: 'gate', slot: 'wait', when: has(done('crew'))},
      {who: 'rival', room: 'gate', slot: 'far', when: has(done('crew'))},
      {who: 'steward', room: 'gate', slot: 'steward'},
      {who: 'dad', room: 'terrace', slot: 'right', when: inside},
      {who: 'wild', room: 'terrace', slot: 'left', when: inside},
      {who: 'kiosk', room: 'street', slot: 'kiosk'},
    ],
    barks: [
      {who: 'mum', room: 'room', lines: ['Is that you? Go to sleep.', 'I can hear you thinking. Go to sleep.']},
      {who: 'steward', room: 'gate', lines: ['Tickets. Tickets only. Tickets, I said.', 'I see you, small one. I see everybody.']},
      {who: 'rival', room: 'gate', lines: ['If you get caught I am telling everybody.', 'I am only here to watch you fail.']},
    ],

    steps: [
      {
        id: 'window', goal: 'Out through the window', main: true,
        at: {room: 'bedroom', spot: 'window'}, verb: 'open',
        lines: [think('Shoes: by the front door, at the far end of the hall. Mum: on the sofa, the door open, the television loud.'), think('Get the shoes. Come back. Window. Ledge. Drainpipe. Louder, Mum.')],
        // close up: the flat at night, in the gaps between her looks (RUSH `night-window`)
        mission: {template: 'night-window'},
        game: 'carry',
        show: [cine('e5-ledge')],
        react: [room('You are out. Shoes in your hand until the bottom of the drainpipe. You go anyway.')],
        slip: [room('The drainpipe makes a noise like a cow. Mum turns the television up. Thank you, Mum.')],
        cut: {room: 'street', spawn: 'fromHome', night: true},
      },
      {
        id: 'crew', goal: 'Meet the crew', main: true,
        at: {room: 'street', who: 'wild', slot: 'wall'}, verb: 'talk',
        lines: [
          say('wild', 'Gap in the fence. Behind the stand. Big enough for a medium person.'),
          say('friend', 'Relax. I have a system.'),
          say('rival', 'I am coming. To watch you get caught.'),
        ],
        ask: {
          timer: 8, silent: 'wild',
          lines: [say('wild', 'Who goes first?')],
          options: [
            opt('wild', '“You found it, you go first.”', [say('wild', 'Obviously. I was always going first. I was asking to be polite.')], [bond('wild', 4), flag('life:master:F09:place', 'crew')]),
            opt('me', '“Me.”', [say('friend', 'Him? He is not even medium.'), say('rival', 'Let him. This I want to see.')], [standing(3), flag('life:s1:first'), flag('life:master:F09:place', 'leader'), remember('first', 'Went through the fence first.')]),
            opt('system', '“What is the system, {friend}?”', [say('friend', 'Step one: look like a steward’s son. Step two: walk. There is no step three.'), think('There is never a step three.')], [bond('friend', 4), flag('life:s1:system'), flag('life:master:F09:place', 'split')]),
          ],
        },
      },
      {
        id: 'fence', goal: 'Through the gap in the fence', main: true, when: not(LATE),
        at: {room: 'gate', spot: 'flag'}, verb: 'go',
        lines: [say('wild', 'Now. While he is looking at the queue. NOW.')],
        mission: {template: 'sneak-in'}, game: 'carry',
        react: [room('Under, through, up. The fence takes a thread of your sleeve. You let it.'), passedLine()],
        slip: [say('steward', 'And where do WE think WE are going?'), room('A hand on your collar. Not rough. Final.')],
        reward: {good: [passed('Through the fence'), heart(3), standing(3), remember('fence', 'Through the fence, under the steward’s nose.')], slip: [flag(CAUGHT), failed('The fence'), remember('caught', 'Caught at the fence by a steward with a very long memory.')]},
      },
      // inside: and there is Dad
      {
        id: 'dad', goal: 'Find a spot on the terrace', main: true, when: inside,
        at: {room: 'terrace', who: 'dad', slot: 'right'}, verb: 'talk',
        lines: [room('Inside. Your scarf is not: the fence took it, and the terrace swallowed it.'), think('Scarf first. Then a spot by a barrier, where nobody who knows you is looking.')],
        // close up: the terrace on this night — the scarf back off the concrete, then a spot nobody who knows you would look at (RUSH `lost-scarf`, rule 135)
        mission: {template: 'lost-scarf'},
        game: 'count',
        show: [cine('e5-scarf'), cine('e5-dad')],
        react: [think('Night shift. NIGHT SHIFT.')],
        slip: [room('Kick-off finds you still on the steps, the scarf in your fist. You stand where you are.'), think('Night shift. NIGHT SHIFT.')],
        ask: {
          timer: 6, silent: 'hide',
          options: [
            opt('hide', 'Hide behind {wild}', [say('wild', 'I am not wide enough for this.'), room('He sees you anyway. Of course he does. He found you in a crowd of twenty thousand once.')], [remember('hide', 'Hid behind {wild}. Dad saw you anyway.')]),
            opt('wave', 'Wave', [room('You wave. He looks at you for a very long second.'), say('dad', 'Come here. Stand here. Do not speak.')], [bond('dad', 4), remember('wave', 'Waved at Dad. He let you stand with him.')]),
            opt('go', 'Walk straight up to him', [me('Night shift?'), say('dad', 'I swapped. Do not tell your mother. Do NOT tell your mother.'), think('You both have a secret now. That is better than a ticket.')], [bond('dad', 6), heart(2), remember('go', 'Walked up to Dad. You both have a secret now.')]),
          ],
        },
      },
      {
        id: 'night', goal: anchor ? 'The match' : 'Watch it with Dad', main: true, when: inside,
        at: {room: 'terrace', spot: 'pitch'}, verb: 'look',
        lines: [say('dad', 'Here. My step. Your step. Hold the rail.')],
        show: anchor ? [live('e5-live')] : [cine('e5-night')],
        fx: echo,
        react: anchor
          ? won ? [room('The stand comes down onto the fence like a wave onto a wall.')] : lost ? [room('Nobody moves for a long time. Dad’s hand is on the back of your neck.')] : [room('The stand breathes out.')]
          : [room('You will not remember the score. You will remember the fence, the light, and him.')],
        cut: {room: 'street', spawn: 'fromEast', night: true},
      },
      // outside: the kiosk radio
      {
        id: 'radio', goal: 'Hear it on the kiosk radio', main: true, when: outside, after: ['crew'],
        at: {room: 'street', who: 'kiosk', slot: 'kiosk'}, verb: 'listen',
        callbacks: [{when: has(CAUGHT), lines: [say('kiosk', 'The steward brought you back to my kiosk. Personally. Like a parcel.')]}],
        lines: [say('kiosk', 'Sit. You and the medium one. Listen.')],
        show: anchor ? [live('e5-radio')] : [cine('e5-radio')],
        fx: [...echo, flag('life:away:stayed')],
        react: [room('A radio, a kiosk, a bag of chocolate nobody paid for. It is not the terrace. It is not nothing.')],
      },
      {
        id: 'home', goal: 'Face Dad', main: true, final: true, afterAny: ['night', 'radio'],
        at: {room: 'street', who: 'dad', slot: 'kerb'}, verb: 'talk',
        escort: [{who: 'wild', rooms: ['terrace', 'tunnel', 'gate', 'route']}],
        callbacks: [
          {when: outside, lines: [say('dad', 'The kiosk. Rafi phoned. Rafi has never phoned anybody in his life.')]},
          {when: is(`life:s1:${E}:dad`, 'go'), lines: [say('dad', 'Our secret. Remember.')]},
        ],
        lines: [say('dad', 'You are grounded.'), me('For how long?')],
        ask: {
          timer: 7, silent: 'quiet',
          options: [
            opt('quiet', 'Say nothing', [say('dad', 'Until the next one.'), think('Until the next one. That is not a punishment. That is a date.')], [bond('dad', 3), flag('life:master:F09:after', 'open')]),
            opt('worth', '“It was worth it.”', [say('dad', 'I know. That is the problem. I know.'), room('He puts his arm round you. He does not take it back.')], [bond('dad', 5), heart(3), flag('life:master:F09:after', 'told')]),
          ],
        },
      },
    ],

    cines: [
      // the ledge: one look back at the room before the drainpipe
      {id: 'e5-ledge', shots: [
        {cam: 'close', on: ['me'], ms: 2300, act: [{who: 'me', do: 'emote', mood: 'tense'}], say: room('Through the wall, the television laughs at something.')},
        {cam: 'wide', ms: 2400, say: think('If they score and you are not there, you will never forgive yourself. Down you go.')},
      ]},
      {id: 'e5-flash', shots: [
        {cam: 'close', on: ['me'], ms: 2800, act: [{who: 'me', do: 'emote', mood: 'tense'}], say: think('This is going well. This is going very well. Somebody is holding your ankle.')},
      ]},
      {id: 'e5-open', shots: [
        {cam: 'close', on: ['me'], ms: 2300, say: think('Grounded. Tonight of all nights.')},
        {cam: 'wide', ms: 2600, say: room('Downstairs, Mum’s television. Somewhere across the city, a crowd you can almost hear.')},
        {cam: 'close', on: ['me'], ms: 2400, act: [{who: 'me', do: 'emote', mood: 'tense'}], say: think('Dad is on a night shift. Dad will never know.')},
      ]},
      // the scarf back round his neck, a thread shorter — the fence kept the thread, he keeps the rest
      {id: 'e5-scarf', shots: [
        {cam: 'close', on: ['me'], ms: 2300, act: [{who: 'me', do: 'hold', item: 'scarf'}, {who: 'me', do: 'emote', mood: 'joy'}], say: room('Trodden on, a hole in one end, a thread of it still on the fence outside. Yours.')},
        {cam: 'close', on: ['me'], ms: 2200, act: [{who: 'me', do: 'hold', item: null}], say: think('A barrier to lean on. A floodlight. Nobody here knows you. Perfect.')},
      ]},
      {id: 'e5-dad', shots: [
        {cam: 'close', on: ['dad'], ms: 2400, act: [{who: 'dad', do: 'emote', mood: 'wonder'}], say: room('Three steps down. A familiar jacket. A familiar back of a head.')},
        {cam: 'two', on: ['dad', 'me'], ms: 2600, act: [{who: 'dad', do: 'face', to: 'me'}, {who: 'dad', do: 'emote', mood: 'tense'}], say: say('dad', '…')},
      ]},
      {id: 'e5-night', shots: [
        {cam: 'wide', ms: 2600, act: [{who: 'all', do: 'cheer'}], say: room('The stand moves like one animal.')},
        {cam: 'two', on: ['dad', 'me'], ms: 2400, act: [{who: 'dad', do: 'emote', mood: 'joy'}], say: say('dad', 'Grounded! You are SO grounded!', 'joy')},
      ]},
      {id: 'e5-radio', shots: [
        {cam: 'close', on: ['kiosk'], ms: 2400, act: [{who: 'kiosk', do: 'emote', mood: 'joy'}], say: say('kiosk', 'THERE! Did you hear that? Did you HEAR that?')},
      ]},
    ],

    docs: [
      {id: 'e5-cold', who: 'wild', role: 'The one who climbs first', lines: [{t: 'There was a gap in the fence behind the stand. I found it. Everybody says they found it. I found it.'}]},
      {id: 'e5-dad', who: 'dad', role: 'Your father', lines: [
        {t: 'I saw him on the fence. I was going to kill him. Then we scored. Then we scored again. By the end I had forgotten how to be angry.', when: has(done('night'))},
        {t: 'He walked straight up to me. “Night shift?” Twelve years old. I have never been so proud of being caught.', when: is(`life:s1:${E}:dad`, 'go')},
        {t: 'Rafi phoned me. Rafi. In thirty years, the only phone call. “Your boy is at my kiosk. Bring money for chocolate.”', when: has(CAUGHT), secret: 'Rafi’s only phone call'},
        {t: 'I told his mother I was on a night shift. She knew. She always knew. She let both of us have it.', secret: 'Mum knew'},
      ]},
      {id: 'e5-dudu', who: 'wild', role: 'The one who climbs first', lines: [
        {t: 'He went first. Through my gap. My gap. I let him. Do not tell anybody I let him.', when: has('life:s1:first'), secret: 'Dudu let you'},
        {t: 'The steward with the long memory. He still says hello to me. Thirty-five years.', when: has(CAUGHT)},
        {t: 'I hid behind nobody. I was the one being hidden behind.', when: is(`life:s1:${E}:dad`, 'hide')},
        {t: 'Best night of my life, and I was not even supposed to be there. That is football.'},
      ]},
    ],
  }
}

function passedLine() { return room('Inside. INSIDE. The noise is everywhere at once.') }

export const e5Ages: [number, number] = [11, 13]
