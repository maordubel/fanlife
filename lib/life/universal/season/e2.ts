/**
 * Season One · Episode 2 — SIX SHORT. Age eight. The street, a shirt in a kiosk window, and Saturday coming.
 *
 * The job: twenty coins before the kiosk sells the last shirt. He has fourteen. The street is full of ways to make six
 * and most of them are bad ideas: crates, a dirty car, empty bottles, a penalty bet with a friend who has a system,
 * a dare involving an onion, and a classmate who will pay to hear him say something he will regret.
 * Miss Saturday and the shirt is gone — and Dad goes to the wardrobe, which is its own kind of ending.
 */
import {all, any, bond, coins, cine, failed, flag, has, heart, is, me, not, opt, passed, pay, remember, room, say, standing, think, type EpisodeScript} from './write'
import type {Cond} from '../types'

const E = 'S1E2'
const done = (s: string) => `s1:${E}:${s}:done`
const GONE = `s1:${E}:gone`
const PRICE = 20
const rich: Cond = {min: ['coins', PRICE]}

export const E2: EpisodeScript = {
  id: E, no: 2, age: 7, act: 1,
  title: 'Six Short',
  logline: 'Twenty coins for the shirt. He has fourteen. It is Thursday.',
  next: 'The Way In',
  intro: 'There is a shirt in the kiosk window. It has been looking at you all week.',
  keep: {id: 'shirt', name: 'The first shirt', note: 'Too big. Then exactly right. Then too small. Never thrown away.'},
  start: {room: 'street', spawn: 'kiosk'},
  open: {doc: 'e2-cold', cine: 'e2-open', mission: 'Six coins short. The shirt goes on Saturday.'},
  close: ['e2-ofir', 'e2-tal'],
  box: {item: 'A shirt, a child’s size, the sleeves still rolled', line: 'It smells of a cupboard. Somebody mended it once, by the sleeve.'},
  flash: {cine: 'e2-flash', card: 'That morning'},
  tease: 'Dad has checked the tickets eleven times.',

  clock: {
    id: 'saturday', s: 210, label: 'Saturday', fail: GONE,
    until: has(done('buy')),
    lines: [
      room('A man nobody knows walks into the kiosk and comes out with a bag. A bag shaped like a shirt.'),
      say('kiosk', 'Sorry, kid. Somebody’s uncle. They always have an uncle.'),
      think('Somebody’s uncle. You hate somebody’s uncle.'),
    ],
    fx: [failed('The last shirt')],
  },

  people: [
    {who: 'kiosk', room: 'street', slot: 'kiosk'},
    {who: 'wild', room: 'street', slot: 'wall'},
    {who: 'mum', room: 'kitchen', slot: 'counter'},
    {who: 'dad', room: 'room', slot: 'sofa', when: has(GONE)},
  ],
  barks: [
    {who: 'kiosk', room: 'street', when: not(done('buy')), lines: ['Look with your eyes, not your nose. That glass is clean.', 'Twenty. Not nineteen. Twenty.', 'Crates do not stack themselves, you know.']},
    {who: 'wild', room: 'street', lines: ['Psst. I have a business opportunity.', 'Have you ever eaten a whole onion? I have not either.', 'Dare me anything.']},
    {who: 'mum', room: 'kitchen', lines: ['Wash your hands before you touch money.', 'Money is dirty. Wash your hands AFTER money.']},
  ],

  steps: [
    // ───── his fortune
    {
      id: 'tin', goal: 'Get your savings tin from your room', main: true, when: not(GONE),
      at: {room: 'bedroom', spot: 'desk'}, verb: 'take',
      lines: [think('The tin. Every coin you have ever found under a sofa is in here.')],
      game: 'count',
      react: [room('Fourteen coins. Counted three ways. Fourteen three times.'), think('Fourteen. Six short. You could cry, but crying pays nothing.')],
      slip: [room('You count fourteen. Then fifteen. Then thirteen. You go with fourteen.'), think('Six short. Maths is a scam.')],
      fx: [coins(14), flag(`s1:${E}:tin`)],
    },

    // ───── the main job: buy it before Saturday
    {
      id: 'buy', goal: 'Twenty coins, then buy the shirt from {kiosk}', main: true, when: not(GONE),
      at: {room: 'street', who: 'kiosk', slot: 'kiosk'}, verb: 'buy',
      callbacks: [
        {when: has('life:s1:onion'), lines: [say('kiosk', 'You smell of onion.'), me('It was a business deal.')]},
        {when: has('life:s1:tal:said'), lines: [say('kiosk', 'I heard what you said about your own team. For two coins.'), think('News travels fast on this street. Faster than you.')]},
      ],
      lines: [say('kiosk', 'Well? Twenty. Sleeves included.')],
      ask: {
        options: [
          opt('buy', 'Put twenty coins on the counter', [
            say('kiosk', 'Exact. You counted. Good boy.'),
            room('He takes it out of the window like it is something alive. It smells of plastic and of Saturdays.'),
            say('kiosk', 'Roll the sleeves. You will grow into it. Everybody does.'),
          ], [coins(-PRICE), flag('life:shirt:origin', 'earned'), flag('life:master:F03:source', 'work'), flag('life:master:F03:route', 'saving'), flag('life:shirt:paid:F03', 'kiosk'), heart(4), standing(2), passed('The first shirt'), remember('buy', 'Bought the shirt with your own coins.')], {when: rich, wear: 'shirt'}),
          opt('short', 'Not yet', [say('kiosk', 'Then go and get “yet”. The window is patient. Saturday is not.')], [], {stay: true}),
        ],
      },
    },

    // ───── the other life: the uncle got it, and Dad goes to the wardrobe
    {
      id: 'wardrobe', goal: 'Go home', main: true, when: has(GONE), after: [],
      at: {room: 'room', who: 'dad', slot: 'sofa'}, verb: 'talk',
      lines: [
        say('dad', 'I heard. Somebody’s uncle.'),
        me('I was six short. Then I was four short. Then the uncle came.'),
        say('dad', 'Wait there.'),
      ],
      show: [cine('e2-old')],
      react: [
        room('He came back from the bedroom holding something folded like a flag.'),
        say('dad', 'Mine. From when I was not much older than you. There is a repair by the sleeve. Do not ask about the repair.'),
      ],
      ask: {
        timer: 8, silent: 'wear',
        options: [
          opt('wear', 'Put it on', [say('dad', 'The sleeves know the way back. Roll them.', 'tender')], [flag('life:shirt:origin', 'handed'), flag('life:master:F03:source', 'gift'), flag('life:master:F03:route', 'heirloom'), bond('dad', 6), heart(4), remember('handed', 'Got Dad’s old shirt, the one with the repair.')], {wear: 'shirt'}),
          opt('ask', 'Ask about the repair', [say('dad', 'A fence. A policeman. A very fast run. Your mother does not know. Now put it on.'), room('You put it on. It smells of a cupboard and of a younger man.')], [flag('life:shirt:origin', 'handed'), flag('life:master:F03:source', 'gift'), flag('life:master:F03:route', 'heirloom'), flag('life:s1:repair'), bond('dad', 8), heart(3), remember('repair', 'Learned the story of the repair. Do not tell Mum.')], {wear: 'shirt'}),
        ],
      },
    },

    // ───── the kerb: the crew sees it
    {
      id: 'kerb', goal: 'Show the street', main: true, final: true, afterAny: ['buy', 'wardrobe'],
      at: {room: 'street', who: 'friend', slot: 'kerb'}, verb: 'talk',
      callbacks: [
        {when: is('life:shirt:origin', 'handed'), lines: [say('friend', 'That shirt is older than us.'), me('It has a repair. There is a story. I cannot tell it.')]},
        {when: is('life:shirt:origin', 'earned'), lines: [say('friend', 'You BOUGHT it? With money?'), me('With crates. And other things.')]},
      ],
      lines: [say('friend', 'Quick. We need a goalkeeper.')],
      show: [cine('e2-kerb')],
      react: [think('Everybody saw. That was the whole point.')],
      ask: {
        timer: 7, silent: 'goal',
        options: [
          opt('goal', 'Go in goal in it', [say('wild', 'If it is big enough it is a wall.'), room('Three goals go in. You do not care about any of them.')], [bond('friend', 4), heart(3), flag('life:shirt:show', 'together')]),
          opt('walk', 'Walk the whole street in it first', [room('You walk to the end of the street and back. Slowly. Twice.'), say('rival', 'He is going to do a third lap.'), say('friend', 'He is going to do a third lap.')], [standing(3), heart(4), flag('life:shirt:show', 'proud')]),
        ],
      },
    },

    // ───── the street's ways to make six (side jobs: his to take or leave)
    {
      id: 'crates', goal: 'Stack {kiosk}’s crates', side: true, when: not(GONE),
      at: {room: 'street', spot: 'crates'}, verb: 'use',
      lines: [say('kiosk', 'Crates. Big ones at the bottom. If one falls, I keep your teeth.')],
      game: 'carry',
      react: [say('kiosk', 'Two coins. Do not tell anybody I pay this well.')],
      slip: [room('One crate falls. Nothing breaks. A cabbage rolls into the road and keeps going.'), say('kiosk', 'One coin. The cabbage is coming out of your wages.')],
      reward: {good: [pay('crates', 2)], slip: [pay('crates', 1)]},
      fx: [standing(1)],
    },
    {
      id: 'carwash', goal: 'Wash {neighbour}’s car', side: true, when: not(GONE),
      at: {room: 'street', spot: 'car'}, verb: 'use',
      lines: [say('neighbour', 'The car. Not the windows, I do not trust you with windows. Three coins if I can see myself in it.')],
      game: 'carry',
      react: [say('neighbour', 'I can see myself. I look tired. Three coins.')],
      slip: [say('neighbour', 'There is still a bird in that corner. A whole bird. Two coins.')],
      reward: {good: [pay('carwash', 3)], slip: [pay('carwash', 2)]},
      fx: [bond('neighbour', 2)],
    },
    {
      id: 'bottles', goal: 'Collect empty bottles for the deposit', side: true, when: not(GONE),
      at: {room: 'street', spot: 'bin'}, verb: 'take',
      lines: [think('Every empty bottle in this street is worth something. Most of them are behind the bins. Most of the bins smell.')],
      mission: {template: 'bottle-run'}, game: 'count',
      react: [room('You carry a clinking armful back to the kiosk.'), say('kiosk', 'Three. And wash your hands. Twice.')],
      slip: [room('Half of them break on the kerb.'), say('kiosk', 'One coin, and a broom. Go.')],
      reward: {good: [pay('bottles', 3)], slip: [pay('bottles', 1)]},
    },
    {
      id: 'dudu', goal: 'Hear {wild}’s business opportunity', side: true, when: not(GONE),
      at: {room: 'street', who: 'wild', slot: 'wall'}, verb: 'talk',
      lines: [say('wild', 'One coin if you eat a whole raw onion. I have the onion. I do not have the coin yet, but I will.')],
      ask: {
        timer: 6, silent: 'no',
        options: [
          opt('eat', 'Eat the onion', [room('You eat the onion. All of it. Your eyes leave your face for a while.'), say('wild', 'Legend. Here. One coin. It is slightly sticky.')], [coins(1), heart(2), bond('wild', 6), flag('life:s1:onion'), remember('onion', 'Ate a whole raw onion for one coin. {wild} still talks about it.')]),
          opt('no', 'No', [say('wild', 'Coward. Respect. Coward.')], [bond('wild', 1)]),
        ],
      },
    },
    {
      id: 'tal', goal: 'Talk to {rival} in the schoolyard', side: true, when: not(GONE),
      at: {room: 'schoolyard', who: 'rival', slot: 'rival'}, verb: 'talk',
      lines: [
        say('rival', 'I hear you are six short.'),
        me('Who told you?'),
        say('rival', 'The whole street. Here is a deal. Two coins if you say my team is better than yours. Out loud.'),
      ],
      ask: {
        timer: 7, silent: 'never',
        options: [
          opt('say', 'Say it. Quickly. Quietly.', [me('Your team is better than mine.'), say('rival', 'LOUDER.'), me('YOUR TEAM IS BETTER THAN MINE.'), say('rival', 'Pleasure doing business.'), think('That will follow you for years. You can feel it already.')], [coins(2), standing(-3), bond('rival', 3), flag('life:s1:tal:said'), remember('said', 'Said her team was better. For two coins. Out loud.')]),
          opt('never', 'Never. Not for a hundred.', [say('rival', 'Good answer. Wrong team, but a good answer.')], [standing(3), bond('rival', 5), flag('life:s1:tal:never'), remember('never', 'Refused to say her team was better. Not for a hundred.')]),
        ],
      },
    },
    {
      id: 'mum', goal: 'Ask Mum', side: true, when: not(GONE),
      at: {room: 'kitchen', who: 'mum', slot: 'counter'}, verb: 'talk',
      lines: [me('Mum. Hypothetically. If somebody was six short.'), say('mum', 'Hypothetically, somebody can count again. Slowly.')],
      ask: {
        timer: 8, silent: 'thanks',
        options: [
          opt('thanks', '“Please?”', [room('She puts three coins in your hand and closes your fingers over them.'), say('mum', 'Half. The other half is called character.')], [coins(3), bond('mum', 4), remember('mum', 'Mum gave you three coins. The rest was called character.')]),
          opt('proud', '“Never mind. I will earn it.”', [say('mum', 'Then go and earn it. And wash your hands after.')], [standing(2), bond('mum', 2)]),
        ],
      },
    },
    {
      id: 'system', goal: 'Hear {friend}’s system', side: true, when: not(GONE),
      at: {room: 'schoolyard', who: 'friend', slot: 'friend'}, verb: 'talk',
      lines: [
        say('friend', 'Relax. I have a system.'),
        me('What system?'),
        say('friend', 'Penalties. Against the big kids. Two coins in, four coins out. It cannot lose.'),
      ],
      ask: {
        timer: 8, silent: 'out',
        options: [
          opt('in', 'Put two coins in', [say('friend', 'You will not regret this. Probably.')], [coins(-2), flag(`s1:${E}:bet`), bond('friend', 2)], {when: {min: ['coins', 2]}}),
          opt('out', 'Your systems never work', [say('friend', 'ONE system did not work. One. Out of several.')], [bond('friend', 1)]),
        ],
      },
    },
    {
      id: 'penalty', goal: 'Take the penalty for {friend}’s system', side: true, after: ['system'], when: all(has(`s1:${E}:bet`), not(GONE)),
      at: {room: 'schoolyard', spot: 'ball'}, verb: 'use',
      lines: [say('friend', 'Top corner. Their keeper is scared of the top corner. And of most things.')],
      game: 'kick',
      react: [say('friend', 'THE SYSTEM WORKS! Four coins. I told you. I always tell you.')],
      slip: [say('friend', 'The system has a small problem. The problem is you.'), think('Two coins gone. Into a big kid’s pocket. Forever.')],
      reward: {good: [pay('penalty', 4), heart(2), remember('system', '{friend}’s system worked. Once.')], slip: [remember('system-lost', 'Lost two coins on {friend}’s system.')]},
    },
  ],

  cines: [
    {id: 'e2-flash', shots: [
      {cam: 'close', on: ['me'], ms: 2600, act: [{who: 'me', do: 'emote', mood: 'tense'}], say: think('Six short. Six coins between you and the rest of your life.')},
    ]},
    {id: 'e2-open', shots: [
      {cam: 'wide', ms: 2200, say: room('Thursday. The kiosk. The window.')},
      {cam: 'close', on: ['me'], ms: 2200, say: think('There it is. Your colours. Your size, nearly.')},
      {cam: 'close', on: ['kiosk'], ms: 2400, say: say('kiosk', 'Twenty. Sleeves included.')},
      {cam: 'two', on: ['me', 'kiosk'], ms: 2400, say: me('I have fourteen.')},
      {cam: 'close', on: ['kiosk'], ms: 2600, say: say('kiosk', 'Then you have most of a shirt. Last one. Saturday, it goes.')},
    ]},
    {id: 'e2-old', shots: [
      {cam: 'two', on: ['dad', 'me'], ms: 2600, act: [{who: 'dad', do: 'emote', mood: 'tender'}], say: room('He holds it up against you. It reaches your knees.')},
      {cam: 'close', on: ['dad'], ms: 2200, say: say('dad', 'You will grow. That is the deal.')},
    ]},
    {id: 'e2-kerb', shots: [
      {cam: 'wide', ms: 2000, say: room('The street stops.')},
      {cam: 'close', on: ['friend'], ms: 1900, say: say('friend', 'It is enormous.')},
      {cam: 'close', on: ['me'], ms: 1700, say: me('I am growing.')},
      {cam: 'close', on: ['wild'], ms: 2000, act: [{who: 'wild', do: 'emote', mood: 'joy'}], say: say('wild', 'You could fit me in there too.')},
    ]},
  ],

  docs: [
    {id: 'e2-cold', who: 'friend', role: 'Your best friend', lines: [
      {t: 'Six. He was six short. He talked about those six like he owed them to the mafia.'},
    ]},
    {id: 'e2-ofir', who: 'friend', role: 'Your best friend', lines: [
      {t: 'He ate the onion. I was there. I have never seen a face do that, before or since.', when: has('life:s1:onion')},
      {t: 'My system worked that day. I want that written down. It worked once.', when: has(`s1:${E}:penalty:done`)},
      {t: 'The uncle. Nobody ever found out whose uncle. He still looks for him at weddings.', when: has(GONE), secret: 'The uncle'},
      {t: 'He walked that street three times in that shirt. Three. We counted.', when: is('life:shirt:show', 'proud')},
      {t: 'From that day you could find him from a kilometre away. Just look for the shirt.'},
    ]},
    {id: 'e2-tal', who: 'rival', role: 'From two desks over', lines: [
      {t: 'He said it. My team is better. Out loud, for two coins. I have it in writing. Well, I have it in my head, which is better.', when: has('life:s1:tal:said')},
      {t: 'I offered him two coins to say my team was better. He said not for a hundred. I liked him after that. Annoyingly.', when: has('life:s1:tal:never'), secret: 'She liked you'},
      {t: 'Nice shirt. Wrong colour. I told him then, I tell him now.'},
    ]},
  ],
}
